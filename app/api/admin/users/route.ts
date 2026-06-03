import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { getAllUsers } from '@/lib/kv';

export async function GET() {
  const user = await getSessionUser();
  if (!user?.isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const users = await getAllUsers();
  return NextResponse.json(users);
}
