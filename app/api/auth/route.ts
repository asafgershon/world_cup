import { NextResponse } from 'next/server';
import { getUser, setUser, generateCode } from '@/lib/kv';
import { setSessionCookie, clearSessionCookie } from '@/lib/auth';

export async function POST(request: Request) {
  const { code } = await request.json();

  if (!code || typeof code !== 'string') {
    return NextResponse.json({ error: 'Code is required' }, { status: 400 });
  }

  const user = await getUser(code.trim().toUpperCase());
  if (!user) {
    return NextResponse.json({ error: 'Invalid code' }, { status: 401 });
  }

  return NextResponse.json(
    { ok: true, name: user.name, isAdmin: user.isAdmin },
    { headers: { 'Set-Cookie': setSessionCookie(user.code) } },
  );
}

export async function DELETE() {
  return NextResponse.json(
    { ok: true },
    { headers: { 'Set-Cookie': clearSessionCookie() } },
  );
}
