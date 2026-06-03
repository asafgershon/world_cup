import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { getTournamentBet, setTournamentBet } from '@/lib/kv';
import { canBetTournament } from '@/lib/football-api';

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const bet = await getTournamentBet(user.code);
  return NextResponse.json(bet ?? null);
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!canBetTournament()) {
    return NextResponse.json({ error: 'Tournament betting is closed' }, { status: 400 });
  }

  const { topScorer, winner } = await request.json();

  if (!topScorer || !winner || typeof topScorer !== 'string' || typeof winner !== 'string') {
    return NextResponse.json({ error: 'Both top scorer and winner are required' }, { status: 400 });
  }

  const bet = {
    userCode: user.code,
    topScorer: topScorer.trim(),
    winner: winner.trim(),
    placedAt: new Date().toISOString(),
  };

  await setTournamentBet(bet);
  return NextResponse.json(bet);
}
