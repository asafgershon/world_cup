export type User = {
  code: string;
  name: string;
  isAdmin: boolean;
  createdAt: string;
};

export type MatchBet = {
  userCode: string;
  matchId: number;
  homeScore: number;
  awayScore: number;
  placedAt: string;
};

export type TournamentBet = {
  userCode: string;
  topScorer: string;
  winner: string;
  placedAt: string;
};

export type TournamentResult = {
  topScorer: string | null;
  topScorerGoals: number | null;
  winner: string | null;
};

export type Match = {
  id: number;
  utcDate: string;
  status: 'SCHEDULED' | 'TIMED' | 'LIVE' | 'IN_PLAY' | 'PAUSED' | 'FINISHED' | 'POSTPONED' | 'CANCELLED';
  stage: string;
  group: string | null;
  matchday: number | null;
  homeTeam: {
    id: number;
    name: string;
    shortName: string;
    crest: string;
  };
  awayTeam: {
    id: number;
    name: string;
    shortName: string;
    crest: string;
  };
  score: {
    winner: 'HOME_TEAM' | 'AWAY_TEAM' | 'DRAW' | null;
    fullTime: {
      home: number | null;
      away: number | null;
    };
  };
};

export type LeaderboardEntry = {
  userCode: string;
  name: string;
  matchPoints: number;
  tournamentPoints: number;
  total: number;
  betsPlaced: number;
};
