import type { Match, MatchBet, MatchOdds, TournamentBet } from '@/types';

export const WINNER_POINTS: Record<string, number> = {
  Spain: 30,
  France: 30,
  England: 40,
  Brazil: 50,
  Argentina: 50,
  Portugal: 60,
  Germany: 70,
  Netherlands: 80,
  Belgium: 100,
  Norway: 120,
  Croatia: 130,
  Japan: 130,
  Morocco: 130,
  Uruguay: 130,
  Colombia: 150,
  Mexico: 150,
  Switzerland: 150,
  'United States': 150,
  Austria: 160,
  Ecuador: 160,
  Senegal: 160,
  Sweden: 160,
  Turkey: 160,
  Czechia: 180,
  Scotland: 180,
  'South Korea': 180,
  Algeria: 200,
  Australia: 200,
  Canada: 200,
  Egypt: 200,
  'Ivory Coast': 200,
  Paraguay: 200,
  'Bosnia-Herzegovina': 250,
  Iran: 250,
  'Congo DR': 300,
  Ghana: 300,
  Qatar: 300,
  'Saudi Arabia': 300,
  'South Africa': 300,
  Tunisia: 300,
  'Cape Verde Islands': 400,
  Iraq: 400,
  'New Zealand': 400,
  Panama: 400,
  Uzbekistan: 400,
  'Curaçao': 500,
  Haiti: 500,
  Jordan: 500,
};

export function calculateMatchPoints(bet: MatchBet, match: Match, odds?: MatchOdds): number {
  if (match.status !== 'FINISHED') return 0;

  const actual = match.score.fullTime;
  if (actual.home === null || actual.away === null) return 0;

  const betResult = Math.sign(bet.homeScore - bet.awayScore);
  const actualResult = Math.sign(actual.home - actual.away);
  if (betResult !== actualResult) return 0;

  let resultPoints: number;
  if (odds) {
    if (actualResult === 1) resultPoints = odds.homeOdds;
    else if (actualResult === 0) resultPoints = odds.drawOdds;
    else resultPoints = odds.awayOdds;
  } else {
    resultPoints = 1;
  }

  if (!bet.isRandom && bet.homeScore === actual.home && bet.awayScore === actual.away) {
    return resultPoints + 4;
  }

  return resultPoints;
}

export function calculateTournamentPoints(
  bet: TournamentBet,
  actualTopScorer: string | null,
  actualWinner: string | null,
  topScorerGoals: number | null = null,
): number {
  let points = 0;

  if (actualTopScorer && bet.topScorer.trim().toLowerCase() === actualTopScorer.trim().toLowerCase()) {
    points += 20;
  }

  if (actualWinner && bet.winner.trim().toLowerCase() === actualWinner.trim().toLowerCase()) {
    points += WINNER_POINTS[bet.winner] ?? 200;
  }

  return points;
}

export function getTournamentWinnerPoints(team: string): number {
  return WINNER_POINTS[team] ?? 200;
}
