import { NextResponse } from 'next/server';
import { fetchMatches } from '@/lib/football-api';
import { getAllMatchScores } from '@/lib/kv';

export async function GET() {
  const [matches, matchScores] = await Promise.all([fetchMatches(), getAllMatchScores()]);
  const scoreMap = new Map(matchScores.map((s) => [s.matchId, s]));
  const enrichedMatches = matches.map((m) => {
    const dbScore = scoreMap.get(m.id);
    if (!dbScore) return m;
    return {
      ...m,
      status: 'FINISHED' as const,
      score: { ...m.score, fullTime: { home: dbScore.homeScore, away: dbScore.awayScore } },
    };
  });
  return NextResponse.json(enrichedMatches);
}
