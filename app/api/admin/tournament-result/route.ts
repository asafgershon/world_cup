import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { getTournamentResult, setTournamentResult } from '@/lib/kv';

export async function GET() {
  const result = await getTournamentResult();
  return NextResponse.json(result);
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user?.isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { topScorer, topScorerGoals, winner } = await request.json();

  const result = {
    topScorer: typeof topScorer === 'string' ? topScorer.trim() || null : null,
    topScorerGoals: typeof topScorerGoals === 'number' && topScorerGoals >= 0 ? topScorerGoals : null,
    winner: typeof winner === 'string' ? winner.trim() || null : null,
  };

  await setTournamentResult(result);
  return NextResponse.json(result);
}
