import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { generateCode, setUser } from '@/lib/kv';

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user?.isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { name } = await request.json();
  if (!name || typeof name !== 'string' || !name.trim()) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 });
  }

  const code = generateCode();
  const newUser = {
    code,
    name: name.trim(),
    isAdmin: false,
    createdAt: new Date().toISOString(),
  };
  await setUser(newUser);

  return NextResponse.json(newUser);
}
