import { NextResponse } from 'next/server';
import { fetchMatches } from '@/lib/football-api';

export async function GET() {
  const matches = await fetchMatches();
  return NextResponse.json(matches);
}
