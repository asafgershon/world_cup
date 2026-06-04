import type { User, MatchBet, TournamentBet, TournamentResult, Match } from '@/types';

const CACHE_TTL_MS = 6 * 60 * 60 * 1000;

async function sbFetch(
  table: string,
  options: { method?: string; query?: string; body?: unknown; upsert?: boolean } = {},
): Promise<unknown> {
  const { method = 'GET', query = '', body, upsert = false } = options;
  const url = `${process.env.SUPABASE_URL}/rest/v1/${table}${query ? '?' + query : ''}`;
  const headers: Record<string, string> = {
    apikey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
    Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}`,
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
  if (upsert) headers['Prefer'] = 'resolution=merge-duplicates';

  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) return null;
  if (method !== 'GET' && method !== 'PATCH') return null;
  const text = await res.text();
  if (!text) return null;
  return JSON.parse(text);
}

// ── Users ──────────────────────────────────────────────────────────────────

export async function getUser(code: string): Promise<User | null> {
  const key = code.toUpperCase();
  const rows = await sbFetch('world_cup_users', { query: `code=eq.${key}&limit=1` }) as any[];
  if (!rows || rows.length === 0) return null;
  const r = rows[0];
  return { code: r.code, name: r.name, isAdmin: r.is_admin, createdAt: r.created_at };
}

export async function setUser(user: User): Promise<void> {
  const code = user.code.toUpperCase();
  await sbFetch('world_cup_users', {
    method: 'POST',
    upsert: true,
    body: { code, name: user.name, is_admin: user.isAdmin, created_at: user.createdAt },
  });
}

export async function getAllUsers(): Promise<User[]> {
  const rows = await sbFetch('world_cup_users') as any[];
  if (!rows) return [];
  return rows.map((r) => ({ code: r.code, name: r.name, isAdmin: r.is_admin, createdAt: r.created_at }));
}

// ── Match Bets ─────────────────────────────────────────────────────────────

export async function getMatchBet(userCode: string, matchId: number): Promise<MatchBet | null> {
  const code = userCode.toUpperCase();
  const rows = await sbFetch('world_cup_match_bets', {
    query: `user_code=eq.${code}&match_id=eq.${matchId}&limit=1`,
  }) as any[];
  if (!rows || rows.length === 0) return null;
  const r = rows[0];
  return { userCode: r.user_code, matchId: r.match_id, homeScore: r.home_score, awayScore: r.away_score, placedAt: r.placed_at };
}

export async function setMatchBet(bet: MatchBet): Promise<void> {
  const code = bet.userCode.toUpperCase();
  await sbFetch('world_cup_match_bets', {
    method: 'POST',
    upsert: true,
    body: { user_code: code, match_id: bet.matchId, home_score: bet.homeScore, away_score: bet.awayScore, placed_at: bet.placedAt },
  });
}

export async function getUserBets(userCode: string): Promise<MatchBet[]> {
  const code = userCode.toUpperCase();
  const rows = await sbFetch('world_cup_match_bets', { query: `user_code=eq.${code}` }) as any[];
  if (!rows) return [];
  return rows.map((r) => ({ userCode: r.user_code, matchId: r.match_id, homeScore: r.home_score, awayScore: r.away_score, placedAt: r.placed_at }));
}

export async function getMatchBets(matchId: number): Promise<MatchBet[]> {
  const rows = await sbFetch('world_cup_match_bets', { query: `match_id=eq.${matchId}` }) as any[];
  if (!rows) return [];
  return rows.map((r) => ({ userCode: r.user_code, matchId: r.match_id, homeScore: r.home_score, awayScore: r.away_score, placedAt: r.placed_at }));
}

// ── Tournament Bets ────────────────────────────────────────────────────────

export async function getTournamentBet(userCode: string): Promise<TournamentBet | null> {
  const code = userCode.toUpperCase();
  const rows = await sbFetch('world_cup_tournament_bets', { query: `user_code=eq.${code}&limit=1` }) as any[];
  if (!rows || rows.length === 0) return null;
  const r = rows[0];
  return { userCode: r.user_code, topScorer: r.top_scorer, winner: r.winner, placedAt: r.placed_at };
}

export async function setTournamentBet(bet: TournamentBet): Promise<void> {
  const code = bet.userCode.toUpperCase();
  await sbFetch('world_cup_tournament_bets', {
    method: 'POST',
    upsert: true,
    body: { user_code: code, top_scorer: bet.topScorer, winner: bet.winner, placed_at: bet.placedAt },
  });
}

// ── Tournament Results ─────────────────────────────────────────────────────

export async function getTournamentResult(): Promise<TournamentResult> {
  const rows = await sbFetch('world_cup_tournament_result', { query: 'id=eq.1&limit=1' }) as any[];
  if (!rows || rows.length === 0) return { topScorer: null, winner: null };
  return { topScorer: rows[0].top_scorer, winner: rows[0].winner };
}

export async function setTournamentResult(result: TournamentResult): Promise<void> {
  await sbFetch('world_cup_tournament_result', {
    method: 'PATCH',
    query: 'id=eq.1',
    body: { top_scorer: result.topScorer, winner: result.winner },
  });
}

// ── Matches Cache ──────────────────────────────────────────────────────────

export async function getMatchesCache(): Promise<Match[] | null> {
  const rows = await sbFetch('world_cup_matches_cache', { query: 'id=eq.1&limit=1' }) as any[];
  if (!rows || rows.length === 0) return null;
  const r = rows[0];
  if (new Date(r.expires_at).getTime() < Date.now()) return null;
  return r.data as Match[];
}

export async function setMatchesCache(matches: Match[]): Promise<void> {
  const expiresAt = new Date(Date.now() + CACHE_TTL_MS).toISOString();
  await sbFetch('world_cup_matches_cache', {
    method: 'POST',
    upsert: true,
    body: { id: 1, data: matches, expires_at: expiresAt },
  });
}

// ── Helpers ────────────────────────────────────────────────────────────────

export function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}
