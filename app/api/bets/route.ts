import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { getMatchBet, setMatchBet, getUserBets } from '@/lib/kv';
import { fetchMatches, canBet } from '@/lib/football-api';

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const bets = await getUserBets(user.code);
  return NextResponse.json(bets);
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const { matchId, homeScore, awayScore } = body;

  if (typeof matchId !== 'number' || typeof homeScore !== 'number' || typeof awayScore !== 'number') {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
  }

  if (homeScore < 0 || awayScore < 0 || homeScore > 20 || awayScore > 20) {
    return NextResponse.json({ error: 'Scores must be between 0 and 20' }, { status: 400 });
  }

  const matches = await fetchMatches();
  const match = matches.find((m) => m.id === matchId);

  if (!match) {
    return NextResponse.json({ error: 'Match not found' }, { status: 404 });
  }

  if (!canBet(match)) {
    return NextResponse.json({ error: 'Betting is closed for this match' }, { status: 400 });
  }

  const bet = {
    userCode: user.code,
    matchId,
    homeScore,
    awayScore,
    placedAt: new Date().toISOString(),
  };

  await setMatchBet(bet);
  return NextResponse.json(bet);
}
