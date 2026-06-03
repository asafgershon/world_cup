import { cookies } from 'next/headers';
import { getUser } from '@/lib/kv';
import type { User } from '@/types';

export const SESSION_COOKIE = 'wc_session';

export async function getSessionUser(): Promise<User | null> {
  const cookieStore = await cookies();
  const code = cookieStore.get(SESSION_COOKIE)?.value;
  if (!code) return null;
  return getUser(code);
}

export function setSessionCookie(code: string): string {
  const maxAge = 60 * 60 * 24 * 7; // 7 days
  return `${SESSION_COOKIE}=${code.toUpperCase()}; HttpOnly; Path=/; Max-Age=${maxAge}; SameSite=Lax`;
}

export function clearSessionCookie(): string {
  return `${SESSION_COOKIE}=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax`;
}
