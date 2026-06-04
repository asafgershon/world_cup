import type { User, MatchBet, TournamentBet, TournamentResult, Match } from '@/types';
import fs from 'fs';
import path from 'path';

// ── Local file storage (dev fallback when Vercel KV is not configured) ──────

const DATA_DIR = path.join(process.cwd(), '.data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

type DB = {
  users: Record<string, User>;
  usersIndex: string[];
  bets: Record<string, MatchBet>;
  userBetsIndex: Record<string, string[]>;
  tournamentBets: Record<string, TournamentBet>;
  tournamentResult: TournamentResult;
  matchesCache: { data: Match[]; expiresAt: number } | null;
};

function readDB(): DB {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DB_FILE)) return emptyDB();
  try {
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf-8')) as DB;
  } catch {
    return emptyDB();
  }
}

function emptyDB(): DB {
  return {
    users: {},
    usersIndex: [],
    bets: {},
    userBetsIndex: {},
    tournamentBets: {},
    tournamentResult: { topScorer: null, winner: null },
    matchesCache: null,
  };
}

function writeDB(db: DB): void {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}

// ── Detect which backend to use ────────────────────────────────────────────

function useKV(): boolean {
  return !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
}

// ── KV imports (lazy to avoid crashes when KV env vars are missing) ────────

async function kv() {
  const mod = await import('@vercel/kv');
  return mod.kv;
}

// ── Users ──────────────────────────────────────────────────────────────────

export async function getUser(code: string): Promise<User | null> {
  const key = code.toUpperCase();
  if (useKV()) {
    const store = await kv();
    return store.get<User>(`user:${key}`);
  }
  const db = readDB();
  return db.users[key] ?? null;
}

export async function setUser(user: User): Promise<void> {
  const code = user.code.toUpperCase();
  if (useKV()) {
    const store = await kv();
    await store.set(`user:${code}`, { ...user, code });
    await store.sadd('users_index', code);
    return;
  }
  const db = readDB();
  db.users[code] = { ...user, code };
  if (!db.usersIndex.includes(code)) db.usersIndex.push(code);
  writeDB(db);
}

export async function getAllUsers(): Promise<User[]> {
  if (useKV()) {
    const store = await kv();
    const codes = await store.smembers('users_index');
    if (!codes || codes.length === 0) return [];
    const users = await Promise.all(codes.map((c: string) => store.get<User>(`user:${c}`)));
    return users.filter(Boolean) as User[];
  }
  const db = readDB();
  return db.usersIndex.map((c) => db.users[c]).filter(Boolean);
}

// ── Match Bets ─────────────────────────────────────────────────────────────

export async function getMatchBet(userCode: string, matchId: number): Promise<MatchBet | null> {
  const code = userCode.toUpperCase();
  if (useKV()) {
    const store = await kv();
    return store.get<MatchBet>(`bet:${code}:${matchId}`);
  }
  const db = readDB();
  return db.bets[`${code}:${matchId}`] ?? null;
}

export async function setMatchBet(bet: MatchBet): Promise<void> {
  const code = bet.userCode.toUpperCase();
  if (useKV()) {
    const store = await kv();
    await store.set(`bet:${code}:${bet.matchId}`, { ...bet, userCode: code });
    await store.sadd(`user_bets:${code}`, String(bet.matchId));
    return;
  }
  const db = readDB();
  db.bets[`${code}:${bet.matchId}`] = { ...bet, userCode: code };
  if (!db.userBetsIndex[code]) db.userBetsIndex[code] = [];
  if (!db.userBetsIndex[code].includes(String(bet.matchId))) {
    db.userBetsIndex[code].push(String(bet.matchId));
  }
  writeDB(db);
}

export async function getUserBets(userCode: string): Promise<MatchBet[]> {
  const code = userCode.toUpperCase();
  if (useKV()) {
    const store = await kv();
    const matchIds = await store.smembers(`user_bets:${code}`);
    if (!matchIds || matchIds.length === 0) return [];
    const bets = await Promise.all(
      matchIds.map((id: string) => store.get<MatchBet>(`bet:${code}:${id}`)),
    );
    return bets.filter(Boolean) as MatchBet[];
  }
  const db = readDB();
  const ids = db.userBetsIndex[code] ?? [];
  return ids.map((id) => db.bets[`${code}:${id}`]).filter(Boolean);
}

// ── Tournament Bets ────────────────────────────────────────────────────────

export async function getTournamentBet(userCode: string): Promise<TournamentBet | null> {
  const code = userCode.toUpperCase();
  if (useKV()) {
    const store = await kv();
    return store.get<TournamentBet>(`tournament_bet:${code}`);
  }
  const db = readDB();
  return db.tournamentBets[code] ?? null;
}

export async function setTournamentBet(bet: TournamentBet): Promise<void> {
  const code = bet.userCode.toUpperCase();
  if (useKV()) {
    const store = await kv();
    await store.set(`tournament_bet:${code}`, bet);
    return;
  }
  const db = readDB();
  db.tournamentBets[code] = { ...bet, userCode: code };
  writeDB(db);
}

// ── Tournament Results ─────────────────────────────────────────────────────

export async function getTournamentResult(): Promise<TournamentResult> {
  if (useKV()) {
    const store = await kv();
    const result = await store.get<TournamentResult>('tournament_result');
    return result ?? { topScorer: null, winner: null };
  }
  const db = readDB();
  return db.tournamentResult;
}

export async function setTournamentResult(result: TournamentResult): Promise<void> {
  if (useKV()) {
    const store = await kv();
    await store.set('tournament_result', result);
    return;
  }
  const db = readDB();
  db.tournamentResult = result;
  writeDB(db);
}

// ── Matches Cache ──────────────────────────────────────────────────────────

const MATCHES_CACHE_TTL_MS = 6 * 60 * 60 * 1000;

export async function getMatchesCache(): Promise<Match[] | null> {
  if (useKV()) {
    const store = await kv();
    return store.get<Match[]>('matches_cache');
  }
  const db = readDB();
  if (!db.matchesCache) return null;
  if (Date.now() > db.matchesCache.expiresAt) return null;
  return db.matchesCache.data;
}

export async function setMatchesCache(matches: Match[]): Promise<void> {
  if (useKV()) {
    const store = await kv();
    await store.set('matches_cache', matches, { ex: 6 * 60 * 60 });
    return;
  }
  const db = readDB();
  db.matchesCache = { data: matches, expiresAt: Date.now() + MATCHES_CACHE_TTL_MS };
  writeDB(db);
}

// ── Helpers ────────────────────────────────────────────────────────────────

export function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}
