import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { getAllMatchOdds, setMatchOdds } from '@/lib/kv';
import type { MatchOdds } from '@/types';

export async function GET() {
  const user = await getSessionUser();
  if (!user?.isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const odds = await getAllMatchOdds();
  return NextResponse.json(odds);
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user?.isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await request.json();
  if (!Array.isArray(body.odds)) {
    return NextResponse.json({ error: 'Expected { odds: MatchOdds[] }' }, { status: 400 });
  }

  await Promise.all((body.odds as MatchOdds[]).map((o) => setMatchOdds(o)));
  return NextResponse.json({ ok: true, count: body.odds.length });
}
