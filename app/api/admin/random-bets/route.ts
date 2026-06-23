import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { getAllUsers, getAllBets, setMatchBet } from '@/lib/kv';
import { fetchMatches, canBet } from '@/lib/football-api';

export async function POST() {
  const user = await getSessionUser();
  if (!user?.isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const [users, matches, existingBets] = await Promise.all([
    getAllUsers(),
    fetchMatches(),
    getAllBets(),
  ]);

  const existingSet = new Set(existingBets.map((b) => `${b.userCode}:${b.matchId}`));
  const nonAdminUsers = users.filter((u) => !u.isAdmin);
  // Only randomize matches that have started or are past the betting deadline
  const eligibleMatches = matches.filter((m) => !canBet(m));
  const now = new Date().toISOString();

  const writes: Promise<void>[] = [];
  let count = 0;

  for (const u of nonAdminUsers) {
    for (const match of eligibleMatches) {
      if (!existingSet.has(`${u.code}:${match.id}`)) {
        writes.push(
          setMatchBet({
            userCode: u.code,
            matchId: match.id,
            homeScore: Math.floor(Math.random() * 5),
            awayScore: Math.floor(Math.random() * 5),
            placedAt: now,
            isRandom: true,
          }),
        );
        count++;
      }
    }
  }

  await Promise.all(writes);
  return NextResponse.json({ ok: true, count });
}
