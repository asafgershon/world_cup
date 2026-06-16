import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { setMatchBet, getUserBets, getMatchBets, getAllUsers } from '@/lib/kv';
import { fetchMatches, canBet } from '@/lib/football-api';

export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const matchIdParam = searchParams.get('matchId');

  if (matchIdParam) {
    const matchId = parseInt(matchIdParam, 10);
    if (isNaN(matchId)) return NextResponse.json({ error: 'Invalid matchId' }, { status: 400 });

    const matches = await fetchMatches();
    const match = matches.find((m) => m.id === matchId);
    if (!match) return NextResponse.json({ error: 'Match not found' }, { status: 404 });

    const bettingDeadline = new Date(match.utcDate).getTime() - 60 * 60 * 1000;
    const revealed = Date.now() >= bettingDeadline || user.isAdmin;

    if (!revealed) {
      return NextResponse.json({ revealed: false, bets: [] });
    }

    const [bets, users] = await Promise.all([getMatchBets(matchId), getAllUsers()]);
    const userMap = new Map(users.map((u) => [u.code, u.name]));
    const result = bets.map((b) => ({
      userCode: b.userCode,
      userName: userMap.get(b.userCode) ?? b.userCode,
      homeScore: b.homeScore,
      awayScore: b.awayScore,
    }));
    return NextResponse.json({ revealed: true, bets: result });
  }

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
