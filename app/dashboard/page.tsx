import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth';
import { fetchMatches } from '@/lib/football-api';
import { getUserBets, getTournamentBet, getAllUsers, getTournamentResult, getAllMatchOdds } from '@/lib/kv';
import { calculateMatchPoints, calculateTournamentPoints } from '@/lib/scoring';
import { MatchCard } from '@/components/MatchCard';
import type { Match, MatchBet, MatchOdds } from '@/types';

export default async function DashboardPage() {
  const user = await getSessionUser();
  if (!user) redirect('/');

  const [matches, myBets, tournamentBet, allUsers, tournamentResult, allOdds] = await Promise.all([
    fetchMatches(),
    getUserBets(user.code),
    getTournamentBet(user.code),
    getAllUsers(),
    getTournamentResult(),
    getAllMatchOdds(),
  ]);

  const betMap = new Map<number, MatchBet>(myBets.map((b) => [b.matchId, b]));
  const oddsMap = new Map<string, MatchOdds>(allOdds.map((o) => [`${o.homeTeam}_${o.awayTeam}`, o]));

  const now = Date.now();
  const upcoming = matches
    .filter((m) => (m.status === 'SCHEDULED' || m.status === 'TIMED') && new Date(m.utcDate).getTime() > now)
    .sort((a, b) => new Date(a.utcDate).getTime() - new Date(b.utcDate).getTime())
    .slice(0, 3);
  const finished = matches.filter((m) => m.status === 'FINISHED');

  // Calculate mini leaderboard
  const leaderboard = await Promise.all(
    allUsers.filter((u) => !u.isAdmin).map(async (u) => {
      const bets = await getUserBets(u.code);
      const tBet = await getTournamentBet(u.code);
      const matchPts = bets.reduce((sum, bet) => {
        const match = matches.find((m) => m.id === bet.matchId);
        if (!match) return sum;
        const betOdds = oddsMap.get(`${match.homeTeam.name}_${match.awayTeam.name}`);
        return sum + calculateMatchPoints(bet, match, betOdds);
      }, 0);
      const tournamentPts = tBet
        ? calculateTournamentPoints(tBet, tournamentResult.topScorer, tournamentResult.winner, tournamentResult.topScorerGoals)
        : 0;
      return { name: u.name, code: u.code, total: matchPts + tournamentPts };
    }),
  );
  leaderboard.sort((a, b) => b.total - a.total);
  const top5 = leaderboard.slice(0, 5);

  const myMatchPoints = myBets.reduce((sum, bet) => {
    const match = matches.find((m) => m.id === bet.matchId);
    if (!match) return sum;
    const betOdds = oddsMap.get(`${match.homeTeam.name}_${match.awayTeam.name}`);
    return sum + calculateMatchPoints(bet, match, betOdds);
  }, 0);
  const myTournamentPoints = tournamentBet
    ? calculateTournamentPoints(tournamentBet, tournamentResult.topScorer, tournamentResult.winner, tournamentResult.topScorerGoals)
    : 0;
  const myTotal = myMatchPoints + myTournamentPoints;
  const myRank = leaderboard.findIndex((e) => e.code === user.code) + 1;

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div className="card bg-green-800 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-green-200 text-sm">Welcome back</p>
            <h1 className="text-2xl font-bold">{user.name}</h1>
          </div>
          <div className="text-right">
            <p className="text-green-200 text-sm">Your score</p>
            <p className="text-3xl font-bold">{myTotal} pts</p>
            {myRank > 0 && (
              <p className="text-green-300 text-sm">Rank #{myRank}</p>
            )}
          </div>
        </div>
        {user.isAdmin && (
          <Link href="/admin" className="mt-3 inline-block text-green-200 text-sm underline">
            Admin panel →
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Upcoming matches */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-gray-800">Upcoming Matches</h2>
            <Link href="/matches" className="text-green-600 text-sm hover:underline">
              View all →
            </Link>
          </div>
          <div className="space-y-2">
            {upcoming.length === 0 && (
              <p className="text-gray-500 text-sm">No upcoming matches</p>
            )}
            {upcoming.map((match) => (
              <MatchCard
                key={match.id}
                match={match}
                initialBet={betMap.get(match.id) ?? null}
                odds={oddsMap.get(`${match.homeTeam.name}_${match.awayTeam.name}`)}
              />
            ))}
          </div>
        </div>

        {/* Mini leaderboard */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-gray-800">Leaderboard</h2>
            <Link href="/leaderboard" className="text-green-600 text-sm hover:underline">
              Full table →
            </Link>
          </div>
          <div className="card divide-y divide-gray-100">
            {top5.map((entry, i) => (
              <div
                key={entry.code}
                className={`flex items-center justify-between py-2 first:pt-0 last:pb-0 ${
                  entry.code === user.code ? 'font-semibold text-green-700' : ''
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-gray-400 text-sm w-4">{i + 1}</span>
                  <span className="text-sm">{entry.name}</span>
                  {entry.code === user.code && (
                    <span className="text-xs text-green-600">(you)</span>
                  )}
                </div>
                <span className="font-bold">{entry.total} pts</span>
              </div>
            ))}
          </div>

          {/* Tournament bet status */}
          <div className="mt-3">
            <Link href="/tournament" className="card block hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">Trophy Bets</p>
                  {tournamentBet ? (
                    <p className="text-xs text-gray-500 mt-0.5">
                      Winner: {tournamentBet.winner} · Top scorer: {tournamentBet.topScorer}
                    </p>
                  ) : (
                    <p className="text-xs text-amber-600 mt-0.5">Place your tournament bets!</p>
                  )}
                </div>
                <span className="text-gray-400">→</span>
              </div>
            </Link>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="card text-center">
          <p className="text-2xl font-bold text-green-700">{myBets.length}</p>
          <p className="text-xs text-gray-500 mt-1">Bets placed</p>
        </div>
        <div className="card text-center">
          <p className="text-2xl font-bold text-green-700">{finished.length}</p>
          <p className="text-xs text-gray-500 mt-1">Matches played</p>
        </div>
        <div className="card text-center">
          <p className="text-2xl font-bold text-green-700">{matches.length - finished.length}</p>
          <p className="text-xs text-gray-500 mt-1">Matches left</p>
        </div>
      </div>
    </div>
  );
}
