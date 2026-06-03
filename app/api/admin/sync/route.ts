import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { fetchMatches } from '@/lib/football-api';

export async function POST() {
  const user = await getSessionUser();
  if (!user?.isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const matches = await fetchMatches(true);
  return NextResponse.json({ count: matches.length });
}
