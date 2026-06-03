import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth';
import { fetchMatches, canBet, formatMatchDate } from '@/lib/football-api';
import { getUserBets } from '@/lib/kv';
import { calculateMatchPoints } from '@/lib/scoring';
import type { Match } from '@/types';

function StatusBadge({ status }: { status: Match['status'] }) {
  if (status === 'IN_PLAY' || status === 'LIVE' || status === 'PAUSED') {
    return (
      <span className="badge-live flex items-center gap-1 text-xs">
        <span className="w-1.5 h-1.5 rounded-full bg-red-500 pulse-dot" />
        LIVE
      </span>
    );
  }
  if (status === 'FINISHED') return <span className="badge-finished">FT</span>;
  return <span className="badge-scheduled">Soon</span>;
}

const STAGE_LABELS: Record<string, string> = {
  GROUP_STAGE: 'Group Stage',
  LAST_48: 'Round of 48',
  LAST_32: 'Round of 32',
  LAST_16: 'Round of 16',
  QUARTER_FINALS: 'Quarter Finals',
  SEMI_FINALS: 'Semi Finals',
  THIRD_PLACE: 'Third Place Play-off',
  FINAL: 'Final',
};

export default async function MatchesPage() {
  const user = await getSessionUser();
  if (!user) redirect('/');

  const [matches, myBets] = await Promise.all([fetchMatches(), getUserBets(user.code)]);

  const betMap = new Map(myBets.map((b) => [b.matchId, b]));

  // Group by stage
  const grouped = matches.reduce<Record<string, Match[]>>((acc, m) => {
    const key = m.stage;
    if (!acc[key]) acc[key] = [];
    acc[key].push(m);
    return acc;
  }, {});

  const stageOrder = [
    'GROUP_STAGE', 'LAST_48', 'LAST_32', 'LAST_16',
    'QUARTER_FINALS', 'SEMI_FINALS', 'THIRD_PLACE', 'FINAL',
  ];

  const sortedStages = Object.keys(grouped).sort(
    (a, b) => (stageOrder.indexOf(a) + 99) - (stageOrder.indexOf(b) + 99)
      || stageOrder.indexOf(a) - stageOrder.indexOf(b),
  );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">All Matches</h1>

      {sortedStages.map((stage) => (
        <section key={stage}>
          <h2 className="text-base font-semibold text-gray-600 mb-3">
            {STAGE_LABELS[stage] ?? stage.replace(/_/g, ' ')}
          </h2>
          <div className="space-y-2">
            {grouped[stage]
              .sort((a, b) => new Date(a.utcDate).getTime() - new Date(b.utcDate).getTime())
              .map((match) => {
                const myBet = betMap.get(match.id);
                const bettable = canBet(match);
                const pts = myBet ? calculateMatchPoints(myBet, match) : null;

                return (
                  <Link
                    key={match.id}
                    href={`/match/${match.id}`}
                    className="card block hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <StatusBadge status={match.status} />
                        {match.group && (
                          <span className="text-xs text-gray-400">{match.group}</span>
                        )}
                      </div>
                      <span className="text-xs text-gray-400">{formatMatchDate(match.utcDate)}</span>
                    </div>

                    <div className="flex items-center gap-3">
                      {/* Home team */}
                      <div className="flex-1 flex items-center gap-2">
                        {match.homeTeam.crest && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={match.homeTeam.crest} alt="" className="w-6 h-6 object-contain" />
                        )}
                        <span className="font-medium text-sm">{match.homeTeam.shortName || match.homeTeam.name}</span>
                      </div>

                      {/* Score */}
                      <div className="text-center font-bold text-gray-700 min-w-[4rem]">
                        {match.status === 'FINISHED' ? (
                          <span className="text-lg">
                            {match.score.fullTime.home} – {match.score.fullTime.away}
                          </span>
                        ) : (
                          <span className="text-gray-400">vs</span>
                        )}
                      </div>

                      {/* Away team */}
                      <div className="flex-1 flex items-center justify-end gap-2">
                        <span className="font-medium text-sm text-right">{match.awayTeam.shortName || match.awayTeam.name}</span>
                        {match.awayTeam.crest && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={match.awayTeam.crest} alt="" className="w-6 h-6 object-contain" />
                        )}
                      </div>
                    </div>

                    {/* Bet info */}
                    <div className="mt-2 flex items-center justify-between text-xs">
                      {myBet ? (
                        <span className="text-green-600">
                          Your bet: {myBet.homeScore} – {myBet.awayScore}
                        </span>
                      ) : bettable ? (
                        <span className="text-amber-600">Tap to bet</span>
                      ) : match.status === 'SCHEDULED' ? (
                        <span className="text-gray-400">Betting closed</span>
                      ) : (
                        <span className="text-gray-400">No bet placed</span>
                      )}
                      {pts !== null && match.status === 'FINISHED' && (
                        <span className={`font-semibold ${pts > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                          +{pts} pts
                        </span>
                      )}
                    </div>
                  </Link>
                );
              })}
          </div>
        </section>
      ))}
    </div>
  );
}
