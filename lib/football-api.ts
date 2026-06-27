import type { Match } from '@/types';
import { getMatchesCache, setMatchesCache } from '@/lib/kv';

const API_BASE = 'https://api.football-data.org/v4';

export async function fetchMatches(forceRefresh = false): Promise<Match[]> {
  if (!forceRefresh) {
    const cached = await getMatchesCache();
    if (cached) return cached;
  }

  const apiKey = process.env.FOOTBALL_API_KEY;
  if (!apiKey) {
    console.error('FOOTBALL_API_KEY is not set');
    return [];
  }

  const res = await fetch(`${API_BASE}/competitions/WC/matches`, {
    headers: { 'X-Auth-Token': apiKey },
    next: { revalidate: 0 },
  });

  if (!res.ok) {
    console.error(`Football API error: ${res.status} ${res.statusText}`);
    return [];
  }

  const data = await res.json();
  const matches: Match[] = data.matches ?? [];
  await setMatchesCache(matches);
  return matches;
}

export function getMatchById(matches: Match[], id: number): Match | undefined {
  return matches.find((m) => m.id === id);
}

export function canBet(match: Match): boolean {
  if (match.status !== 'SCHEDULED' && match.status !== 'TIMED') return false;
  const kickoff = new Date(match.utcDate).getTime();
  const now = Date.now();
  return kickoff - now > 15 * 60 * 1000; // more than 15 minutes away
}

export function canBetTournament(): boolean {
  // Tournament bets close on June 13, 2026 end of day UTC
  const deadline = new Date('2026-06-13T23:59:59Z').getTime();
  return Date.now() < deadline;
}

export function formatMatchDate(utcDate: string): string {
  return new Date(utcDate).toLocaleString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
  });
}
