import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { fetchMatches } from '@/lib/football-api';
import { setMatchScore } from '@/lib/kv';

export async function POST() {
  const user = await getSessionUser();
  if (!user?.isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const matches = await fetchMatches(true);

  const finished = matches.filter(
    (m) => m.status === 'FINISHED' && m.score.fullTime.home !== null && m.score.fullTime.away !== null,
  );
  await Promise.all(finished.map((m) => setMatchScore(m.id, m.score.fullTime.home!, m.score.fullTime.away!)));

  return NextResponse.json({ count: matches.length, scoresUpdated: finished.length });
}
