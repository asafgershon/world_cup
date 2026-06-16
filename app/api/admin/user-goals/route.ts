import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { getAllPlayerGoals, setPlayerGoals } from '@/lib/kv';

export async function GET() {
  const user = await getSessionUser();
  if (!user?.isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const goals = await getAllPlayerGoals();
  return NextResponse.json(goals);
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user?.isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await request.json();
  if (!Array.isArray(body)) {
    return NextResponse.json({ error: 'Expected array of { userCode, goals }' }, { status: 400 });
  }

  await Promise.all(body.map((item: { userCode: string; goals: number }) =>
    setPlayerGoals(item.userCode, item.goals),
  ));
  return NextResponse.json({ ok: true, count: body.length });
}
