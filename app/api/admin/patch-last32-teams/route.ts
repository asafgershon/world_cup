import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { fetchMatches } from '@/lib/football-api';
import { setMatchesCache } from '@/lib/kv';

type TeamData = { id: number; name: string; shortName: string; tla: string; crest: string };

const T: Record<string, TeamData> = {
  'South Africa': { id: 774, name: 'South Africa', shortName: 'South Africa', tla: 'RSA', crest: 'https://crests.football-data.org/9396.svg' },
  Canada:         { id: 828, name: 'Canada',        shortName: 'Canada',       tla: 'CAN', crest: 'https://crests.football-data.org/canada.svg' },
  Brazil:         { id: 764, name: 'Brazil',         shortName: 'Brazil',       tla: 'BRA', crest: 'https://crests.football-data.org/764.svg' },
  Japan:          { id: 766, name: 'Japan',          shortName: 'Japan',        tla: 'JPN', crest: 'https://crests.football-data.org/766.svg' },
  Germany:        { id: 759, name: 'Germany',        shortName: 'Germany',      tla: 'GER', crest: 'https://crests.football-data.org/759.svg' },
  Paraguay:       { id: 761, name: 'Paraguay',       shortName: 'Paraguay',     tla: 'PAR', crest: 'https://crests.football-data.org/761.svg' },
  Morocco:        { id: 815, name: 'Morocco',        shortName: 'Morocco',      tla: 'MAR', crest: 'https://crests.football-data.org/morocco.svg' },
  Netherlands:    { id: 8601, name: 'Netherlands',   shortName: 'Netherlands',  tla: 'NED', crest: 'https://crests.football-data.org/8601.svg' },
  'Ivory Coast':  { id: 1935, name: 'Ivory Coast',   shortName: 'Ivory Coast',  tla: 'CIV', crest: 'https://crests.football-data.org/787.svg' },
  Norway:         { id: 8872, name: 'Norway',        shortName: 'Norway',       tla: 'NOR', crest: 'https://crests.football-data.org/813.svg' },
  France:         { id: 773, name: 'France',         shortName: 'France',       tla: 'FRA', crest: 'https://crests.football-data.org/773.svg' },
  Sweden:         { id: 792, name: 'Sweden',         shortName: 'Sweden',       tla: 'SWE', crest: 'https://crests.football-data.org/792.svg' },
  Mexico:         { id: 769, name: 'Mexico',         shortName: 'Mexico',       tla: 'MEX', crest: 'https://crests.football-data.org/769.svg' },
  Ecuador:        { id: 791, name: 'Ecuador',        shortName: 'Ecuador',      tla: 'ECU', crest: 'https://crests.football-data.org/791.svg' },
  England:        { id: 770, name: 'England',        shortName: 'England',      tla: 'ENG', crest: 'https://crests.football-data.org/770.svg' },
  'Congo DR':     { id: 1934, name: 'Congo DR',      shortName: 'Congo DR',     tla: 'COD', crest: 'https://crests.football-data.org/congo_dr.svg' },
  Belgium:        { id: 805, name: 'Belgium',        shortName: 'Belgium',      tla: 'BEL', crest: 'https://crests.football-data.org/805.svg' },
  Senegal:        { id: 804, name: 'Senegal',        shortName: 'Senegal',      tla: 'SEN', crest: 'https://crests.football-data.org/senegal.svg' },
  'United States': { id: 771, name: 'United States', shortName: 'USA',          tla: 'USA', crest: 'https://crests.football-data.org/usa.svg' },
  'Bosnia-Herzegovina': { id: 1060, name: 'Bosnia-Herzegovina', shortName: 'Bosnia-H.', tla: 'BIH', crest: 'https://crests.football-data.org/bosnia.svg' },
  Portugal:       { id: 765, name: 'Portugal',       shortName: 'Portugal',     tla: 'POR', crest: 'https://crests.football-data.org/765.svg' },
  Croatia:        { id: 799, name: 'Croatia',        shortName: 'Croatia',      tla: 'CRO', crest: 'https://crests.football-data.org/799.svg' },
  Australia:      { id: 779, name: 'Australia',      shortName: 'Australia',    tla: 'AUS', crest: 'https://crests.football-data.org/779.svg' },
  Egypt:          { id: 825, name: 'Egypt',          shortName: 'Egypt',        tla: 'EGY', crest: 'https://crests.football-data.org/825.svg' },
  Argentina:      { id: 762, name: 'Argentina',      shortName: 'Argentina',    tla: 'ARG', crest: 'https://crests.football-data.org/762.png' },
  'Cape Verde Islands': { id: 1930, name: 'Cape Verde Islands', shortName: 'Cape Verde', tla: 'CPV', crest: 'https://crests.football-data.org/cape_verde.svg' },
  Colombia:       { id: 818, name: 'Colombia',       shortName: 'Colombia',     tla: 'COL', crest: 'https://crests.football-data.org/818.svg' },
  Ghana:          { id: 763, name: 'Ghana',          shortName: 'Ghana',        tla: 'GHA', crest: 'https://crests.football-data.org/ghana.svg' },
};

// Match ID → [home team name, away team name]
const LAST32_FIXTURES: Record<number, [string, string]> = {
  537417: ['South Africa',  'Canada'],
  537423: ['Brazil',        'Japan'],
  537415: ['Germany',       'Paraguay'],
  537418: ['Morocco',       'Netherlands'],
  537424: ['Ivory Coast',   'Norway'],
  537416: ['France',        'Sweden'],
  537425: ['Mexico',        'Ecuador'],
  537426: ['England',       'Congo DR'],
  537422: ['Belgium',       'Senegal'],
  537421: ['United States', 'Bosnia-Herzegovina'],
  537419: ['Portugal',      'Croatia'],
  537428: ['Australia',     'Egypt'],
  537427: ['Argentina',     'Cape Verde Islands'],
  537430: ['Colombia',      'Ghana'],
};

export async function POST() {
  const user = await getSessionUser();
  if (!user?.isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const matches = await fetchMatches(true);
  const patched = matches.map((m) => {
    const fixture = LAST32_FIXTURES[m.id];
    if (!fixture) return m;
    return { ...m, homeTeam: T[fixture[0]], awayTeam: T[fixture[1]] };
  });

  await setMatchesCache(patched);
  return NextResponse.json({ ok: true, patched: Object.keys(LAST32_FIXTURES).length });
}
