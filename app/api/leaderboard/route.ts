import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { getAllUsers, getUserBets, getTournamentBet, getTournamentResult, getAllMatchOdds, getAllMatchScores } from '@/lib/kv';
import { fetchMatches } from '@/lib/football-api';
import { calculateMatchPoints, calculateTournamentPoints } from '@/lib/scoring';
import type { LeaderboardEntry } from '@/types';

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const [matches, allUsers, tournamentResult, allOdds, matchScores] = await Promise.all([
    fetchMatches(),
    getAllUsers(),
    getTournamentResult(),
    getAllMatchOdds(),
    getAllMatchScores(),
  ]);

  const scoreMap = new Map(matchScores.map((s) => [s.matchId, s]));
  const enrichedMatches = matches.map((m) => {
    const dbScore = scoreMap.get(m.id);
    if (!dbScore) return m;
    return {
      ...m,
      status: 'FINISHED' as const,
      score: { ...m.score, fullTime: { home: dbScore.homeScore, away: dbScore.awayScore } },
    };
  });

  const entries: LeaderboardEntry[] = await Promise.all(
    allUsers.filter((u) => !u.isAdmin).map(async (u) => {
      const [bets, tBet] = await Promise.all([getUserBets(u.code), getTournamentBet(u.code)]);
      const matchPoints = bets.reduce((sum, bet) => {
        const match = enrichedMatches.find((m) => m.id === bet.matchId);
        if (!match) return sum;
        const odds = allOdds.find(
          (o) => o.homeTeam === match.homeTeam.name && o.awayTeam === match.awayTeam.name,
        );
        return sum + calculateMatchPoints(bet, match, odds);
      }, 0);
      const tournamentPoints = tBet
        ? calculateTournamentPoints(tBet, tournamentResult.topScorer, tournamentResult.winner)
        : 0;
      return {
        userCode: u.code,
        name: u.name,
        matchPoints,
        tournamentPoints,
        total: matchPoints + tournamentPoints,
        betsPlaced: bets.length,
      };
    }),
  );

  entries.sort((a, b) => b.total - a.total || b.matchPoints - a.matchPoints);
  return NextResponse.json(entries);
}
