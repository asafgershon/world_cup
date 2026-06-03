import { NextResponse } from 'next/server';
import { getUser, setUser, getAllUsers } from '@/lib/kv';

export async function POST(request: Request) {
  const { secret } = await request.json();

  const adminSecret = process.env.ADMIN_SECRET;
  if (!adminSecret || secret !== adminSecret) {
    return NextResponse.json({ error: 'Invalid secret' }, { status: 403 });
  }

  // Check if admin already exists
  const allUsers = await getAllUsers();
  const existingAdmin = allUsers.find((u) => u.isAdmin);
  if (existingAdmin) {
    return NextResponse.json({ error: 'Admin already exists' }, { status: 400 });
  }

  const adminUser = {
    code: 'ADMIN01',
    name: 'Admin',
    isAdmin: true,
    createdAt: new Date().toISOString(),
  };
  await setUser(adminUser);

  return NextResponse.json({ code: adminUser.code, name: adminUser.name });
}
