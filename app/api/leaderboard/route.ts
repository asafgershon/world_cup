import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { getAllUsers, getUserBets, getTournamentBet, getTournamentResult } from '@/lib/kv';
import { fetchMatches } from '@/lib/football-api';
import { calculateMatchPoints, calculateTournamentPoints } from '@/lib/scoring';
import type { LeaderboardEntry } from '@/types';

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const [matches, allUsers, tournamentResult] = await Promise.all([
    fetchMatches(),
    getAllUsers(),
    getTournamentResult(),
  ]);

  const entries: LeaderboardEntry[] = await Promise.all(
    allUsers.map(async (u) => {
      const [bets, tBet] = await Promise.all([getUserBets(u.code), getTournamentBet(u.code)]);
      const matchPoints = bets.reduce((sum, bet) => {
        const match = matches.find((m) => m.id === bet.matchId);
        return sum + (match ? calculateMatchPoints(bet, match) : 0);
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
