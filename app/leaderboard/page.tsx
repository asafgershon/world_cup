import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth';
import { getAllUsers, getUserBets, getTournamentBet, getTournamentResult, getAllMatchOdds, getAllMatchScores } from '@/lib/kv';
import { fetchMatches } from '@/lib/football-api';
import { calculateMatchPoints, calculateTournamentPoints } from '@/lib/scoring';

export default async function LeaderboardPage() {
  const user = await getSessionUser();
  if (!user) redirect('/');

  const [rawMatches, allUsers, tournamentResult, allOdds, matchScores] = await Promise.all([
    fetchMatches(),
    getAllUsers(),
    getTournamentResult(),
    getAllMatchOdds(),
    getAllMatchScores(),
  ]);
  const scoreMap = new Map(matchScores.map((s) => [s.matchId, s]));
  const matches = rawMatches.map((m) => {
    const dbScore = scoreMap.get(m.id);
    if (!dbScore) return m;
    return { ...m, status: 'FINISHED' as const, score: { ...m.score, fullTime: { home: dbScore.homeScore, away: dbScore.awayScore } } };
  });
  const oddsMap = new Map(allOdds.map((o) => [`${o.homeTeam}_${o.awayTeam}`, o]));

  const entries = await Promise.all(
    allUsers.map(async (u) => {
      const [bets, tBet] = await Promise.all([getUserBets(u.code), getTournamentBet(u.code)]);

      let perfect = 0, good = 0, miss = 0, matchPoints = 0;
      for (const bet of bets) {
        const match = matches.find((m) => m.id === bet.matchId);
        if (!match || match.status !== 'FINISHED') continue;
        const betOdds = oddsMap.get(`${match.homeTeam.name}_${match.awayTeam.name}`);
        const pts = calculateMatchPoints(bet, match, betOdds);
        matchPoints += pts;
        const a = match.score.fullTime;
        if (a.home !== null && a.away !== null) {
          if (bet.homeScore === a.home && bet.awayScore === a.away) perfect++;
          else if (pts > 0) good++;
          else miss++;
        }
      }
      const tournamentPoints = tBet
        ? calculateTournamentPoints(tBet, tournamentResult.topScorer, tournamentResult.winner, tournamentResult.topScorerGoals)
        : 0;
      return {
        code: u.code,
        name: u.name,
        matchPoints,
        tournamentPoints,
        total: matchPoints + tournamentPoints,
        betsPlaced: bets.length,
        perfect,
        good,
        miss,
        hasTournamentBet: !!tBet,
        tournamentBet: tBet,
      };
    }),
  );

  entries.sort((a, b) => b.total - a.total || b.matchPoints - a.matchPoints);

  const medals = ['🥇', '🥈', '🥉'];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Leaderboard</h1>

      {/* Top 3 podium */}
      {entries.length >= 3 && (
        <div className="grid grid-cols-3 gap-2">
          {[entries[1], entries[0], entries[2]].map((entry, visualIdx) => {
            const rank = visualIdx === 1 ? 1 : visualIdx === 0 ? 2 : 3;
            return (
              <div
                key={entry.code}
                className={`card text-center ${
                  entry.code === user.code ? 'ring-2 ring-green-500' : ''
                } ${visualIdx === 1 ? 'bg-amber-50 border-amber-200' : ''}`}
              >
                <div className="text-3xl mb-1">{medals[rank - 1]}</div>
                <p className="font-bold text-sm truncate">{entry.name}</p>
                <p className={`text-2xl font-bold mt-1 ${visualIdx === 1 ? 'text-amber-600' : 'text-green-700'}`}>
                  {entry.total}
                </p>
                <p className="text-xs text-gray-400">pts</p>
              </div>
            );
          })}
        </div>
      )}

      {/* Full table */}
      <div className="card overflow-hidden p-0">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="text-left px-4 py-3 text-gray-500 font-medium w-8">#</th>
              <th className="text-left px-4 py-3 text-gray-500 font-medium">Player</th>
              <th className="text-center px-3 py-3 text-gray-500 font-medium hidden sm:table-cell" title="Exact score (5 pts)">🎯</th>
              <th className="text-center px-3 py-3 text-gray-500 font-medium hidden sm:table-cell" title="Correct result (1 pt)">👍</th>
              <th className="text-center px-3 py-3 text-gray-500 font-medium hidden sm:table-cell" title="Wrong (0 pts)">❌</th>
              <th className="text-right px-4 py-3 text-gray-500 font-medium hidden sm:table-cell">Trophy</th>
              <th className="text-right px-4 py-3 text-gray-500 font-medium">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {entries.map((entry, i) => (
              <tr
                key={entry.code}
                className={`${
                  entry.code === user.code
                    ? 'bg-green-50 font-semibold'
                    : 'hover:bg-gray-50'
                } transition-colors`}
              >
                <td className="px-4 py-3 text-gray-400">{i + 1}</td>
                <td className="px-4 py-3">
                  <div>
                    <span>{entry.name}</span>
                    {entry.code === user.code && (
                      <span className="ml-1.5 text-xs text-green-600">(you)</span>
                    )}
                    {/* Mobile: show breakdown inline */}
                    <div className="text-xs text-gray-400 mt-0.5 sm:hidden">
                      🎯 {entry.perfect} · 👍 {entry.good} · ❌ {entry.miss}
                      {entry.hasTournamentBet ? ' · trophy' : ''}
                    </div>
                    {/* Desktop: just show bet count */}
                    <div className="text-xs text-gray-400 mt-0.5 hidden sm:block">
                      {entry.betsPlaced} bets
                      {entry.hasTournamentBet ? ' · trophy' : ''}
                    </div>
                  </div>
                </td>
                <td className="px-3 py-3 text-center text-gray-700 hidden sm:table-cell">{entry.perfect}</td>
                <td className="px-3 py-3 text-center text-gray-700 hidden sm:table-cell">{entry.good}</td>
                <td className="px-3 py-3 text-center text-gray-700 hidden sm:table-cell">{entry.miss}</td>
                <td className="px-4 py-3 text-right text-gray-700 hidden sm:table-cell">
                  {entry.tournamentPoints}
                </td>
                <td className="px-4 py-3 text-right font-bold text-green-700">
                  {entry.total}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {tournamentResult.topScorer || tournamentResult.winner ? (
        <div className="card bg-amber-50 border-amber-100">
          <h3 className="font-semibold text-amber-800 mb-2">Tournament Results</h3>
          {tournamentResult.topScorer && (
            <p className="text-sm">
              Top scorer: <strong>{tournamentResult.topScorer}</strong>
              {tournamentResult.topScorerGoals != null && (
                <span className="text-gray-500"> ({tournamentResult.topScorerGoals} goals)</span>
              )}
            </p>
          )}
          {tournamentResult.winner && (
            <p className="text-sm">Tournament winner: <strong>{tournamentResult.winner}</strong></p>
          )}
        </div>
      ) : null}
    </div>
  );
}
