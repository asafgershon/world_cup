import { kv } from '@vercel/kv';
import type { User, MatchBet, TournamentBet, TournamentResult, Match } from '@/types';

export { kv };

// ── Users ──────────────────────────────────────────────────────────────────

export async function getUser(code: string): Promise<User | null> {
  return kv.get<User>(`user:${code.toUpperCase()}`);
}

export async function setUser(user: User): Promise<void> {
  const code = user.code.toUpperCase();
  await kv.set(`user:${code}`, { ...user, code });
  await kv.sadd('users_index', code);
}

export async function getAllUsers(): Promise<User[]> {
  const codes = await kv.smembers('users_index');
  if (!codes || codes.length === 0) return [];
  const users = await Promise.all(codes.map((c) => kv.get<User>(`user:${c}`)));
  return users.filter(Boolean) as User[];
}

// ── Match Bets ─────────────────────────────────────────────────────────────

export async function getMatchBet(userCode: string, matchId: number): Promise<MatchBet | null> {
  return kv.get<MatchBet>(`bet:${userCode.toUpperCase()}:${matchId}`);
}

export async function setMatchBet(bet: MatchBet): Promise<void> {
  const code = bet.userCode.toUpperCase();
  await kv.set(`bet:${code}:${bet.matchId}`, { ...bet, userCode: code });
  await kv.sadd(`user_bets:${code}`, String(bet.matchId));
}

export async function getUserBets(userCode: string): Promise<MatchBet[]> {
  const code = userCode.toUpperCase();
  const matchIds = await kv.smembers(`user_bets:${code}`);
  if (!matchIds || matchIds.length === 0) return [];
  const bets = await Promise.all(matchIds.map((id) => kv.get<MatchBet>(`bet:${code}:${id}`)));
  return bets.filter(Boolean) as MatchBet[];
}

// ── Tournament Bets ────────────────────────────────────────────────────────

export async function getTournamentBet(userCode: string): Promise<TournamentBet | null> {
  return kv.get<TournamentBet>(`tournament_bet:${userCode.toUpperCase()}`);
}

export async function setTournamentBet(bet: TournamentBet): Promise<void> {
  await kv.set(`tournament_bet:${bet.userCode.toUpperCase()}`, bet);
}

// ── Tournament Results ─────────────────────────────────────────────────────

export async function getTournamentResult(): Promise<TournamentResult> {
  const result = await kv.get<TournamentResult>('tournament_result');
  return result ?? { topScorer: null, winner: null };
}

export async function setTournamentResult(result: TournamentResult): Promise<void> {
  await kv.set('tournament_result', result);
}

// ── Matches Cache ──────────────────────────────────────────────────────────

const MATCHES_CACHE_TTL = 60 * 60 * 6; // 6 hours

export async function getMatchesCache(): Promise<Match[] | null> {
  return kv.get<Match[]>('matches_cache');
}

export async function setMatchesCache(matches: Match[]): Promise<void> {
  await kv.set('matches_cache', matches, { ex: MATCHES_CACHE_TTL });
}

// ── Helpers ────────────────────────────────────────────────────────────────

export function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}
