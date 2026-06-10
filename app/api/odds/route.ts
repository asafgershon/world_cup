import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { getAllMatchOdds } from '@/lib/kv';

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const odds = await getAllMatchOdds();
  return NextResponse.json(odds);
}
