import type { Match, MatchBet, TournamentBet } from '@/types';

const FAVORITES = new Set(['England', 'Portugal', 'Spain', 'Argentina', 'France', 'Brazil']);

export function calculateMatchPoints(bet: MatchBet, match: Match): number {
  if (match.status !== 'FINISHED') return 0;

  const actual = match.score.fullTime;
  if (actual.home === null || actual.away === null) return 0;

  // Exact score
  if (bet.homeScore === actual.home && bet.awayScore === actual.away) return 3;

  // Correct result (home win / draw / away win)
  const betResult = Math.sign(bet.homeScore - bet.awayScore);
  const actualResult = Math.sign(actual.home - actual.away);
  if (betResult === actualResult) return 1;

  return 0;
}

export function calculateTournamentPoints(
  bet: TournamentBet,
  actualTopScorer: string | null,
  actualWinner: string | null,
  topScorerGoals: number | null = null,
): number {
  let points = 0;

  if (actualTopScorer && bet.topScorer.trim().toLowerCase() === actualTopScorer.trim().toLowerCase()) {
    points += (topScorerGoals ?? 0) + 5;
  }

  if (actualWinner && bet.winner.trim().toLowerCase() === actualWinner.trim().toLowerCase()) {
    points += FAVORITES.has(bet.winner) ? 8 : 16;
  }

  return points;
}

export function getTournamentWinnerPoints(team: string): number {
  return FAVORITES.has(team) ? 8 : 16;
}
