'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { Match, MatchBet } from '@/types';

function canBetClient(match: Match): boolean {
  if (match.status !== 'SCHEDULED') return false;
  const kickoff = new Date(match.utcDate).getTime();
  return kickoff - Date.now() > 15 * 60 * 1000;
}

function timeUntil(utcDate: string): string {
  const diff = new Date(utcDate).getTime() - Date.now();
  if (diff <= 0) return 'Started';
  const hours = Math.floor(diff / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  if (hours >= 24) return `${Math.floor(hours / 24)}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function getResultLabel(match: Match): string {
  if (!match.score.winner) return '';
  if (match.score.winner === 'HOME_TEAM') return `${match.homeTeam.shortName} win`;
  if (match.score.winner === 'AWAY_TEAM') return `${match.awayTeam.shortName} win`;
  return 'Draw';
}

export default function MatchPage({ params }: { params: { id: string } }) {
  const matchId = parseInt(params.id, 10);
  const router = useRouter();

  const [match, setMatch] = useState<Match | null>(null);
  const [existingBet, setExistingBet] = useState<MatchBet | null>(null);
  const [homeScore, setHomeScore] = useState('');
  const [awayScore, setAwayScore] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    async function load() {
      const [matchRes, betRes] = await Promise.all([
        fetch('/api/matches'),
        fetch('/api/bets'),
      ]);
      const matches: Match[] = await matchRes.json();
      const bets: MatchBet[] = await betRes.json();

      const found = matches.find((m) => m.id === matchId);
      if (found) setMatch(found);

      const bet = bets.find((b) => b.matchId === matchId);
      if (bet) {
        setExistingBet(bet);
        setHomeScore(String(bet.homeScore));
        setAwayScore(String(bet.awayScore));
      }
      setLoading(false);
    }
    load();
  }, [matchId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!match) return;
    setError('');
    setSuccess('');
    setSaving(true);

    try {
      const res = await fetch('/api/bets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          matchId,
          homeScore: parseInt(homeScore, 10),
          awayScore: parseInt(awayScore, 10),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Failed to save bet');
      } else {
        setExistingBet(data);
        setSuccess(existingBet ? 'Bet updated!' : 'Bet placed!');
        setTimeout(() => setSuccess(''), 3000);
      }
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="text-gray-400">Loading...</div>
      </div>
    );
  }

  if (!match) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Match not found</p>
        <button onClick={() => router.back()} className="btn-secondary mt-4">
          Go back
        </button>
      </div>
    );
  }

  const bettable = canBetClient(match);
  const pts = existingBet
    ? calculatePoints(existingBet, match)
    : null;

  return (
    <div className="max-w-md mx-auto space-y-4">
      <button onClick={() => router.back()} className="text-green-600 text-sm hover:underline">
        ← Back
      </button>

      {/* Match card */}
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs text-gray-400">{match.stage.replace(/_/g, ' ')}</span>
          <span className="text-xs text-gray-400">
            {new Date(match.utcDate).toLocaleString('en-GB', {
              weekday: 'short',
              day: 'numeric',
              month: 'short',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        </div>

        <div className="flex items-center justify-between gap-4 py-4">
          <div className="flex-1 text-center">
            {match.homeTeam.crest && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={match.homeTeam.crest} alt="" className="w-12 h-12 object-contain mx-auto mb-2" />
            )}
            <p className="font-bold">{match.homeTeam.shortName || match.homeTeam.name}</p>
          </div>

          <div className="text-center px-4">
            {match.status === 'FINISHED' ? (
              <div>
                <p className="text-3xl font-bold text-gray-800">
                  {match.score.fullTime.home} – {match.score.fullTime.away}
                </p>
                <p className="text-xs text-gray-400 mt-1">Full Time</p>
                <p className="text-sm font-medium text-gray-600 mt-0.5">{getResultLabel(match)}</p>
              </div>
            ) : (
              <div>
                <p className="text-xl font-bold text-gray-400">vs</p>
                {match.status === 'SCHEDULED' && (
                  <p className="text-xs text-gray-400 mt-1">
                    {bettable
                      ? `Bet closes in ${timeUntil(new Date(new Date(match.utcDate).getTime() - 900000).toISOString())}`
                      : match.status === 'SCHEDULED'
                      ? 'Betting closed'
                      : ''}
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="flex-1 text-center">
            {match.awayTeam.crest && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={match.awayTeam.crest} alt="" className="w-12 h-12 object-contain mx-auto mb-2" />
            )}
            <p className="font-bold">{match.awayTeam.shortName || match.awayTeam.name}</p>
          </div>
        </div>
      </div>

      {/* Bet form */}
      <div className="card">
        <h2 className="font-bold mb-4">
          {existingBet ? 'Update your bet' : 'Place your bet'}
        </h2>

        {match.status === 'FINISHED' && existingBet && (
          <div className={`mb-4 p-3 rounded-lg ${pts && pts > 0 ? 'bg-green-50 border border-green-200' : 'bg-gray-50 border border-gray-200'}`}>
            <p className="text-sm font-medium">
              Your bet: {existingBet.homeScore} – {existingBet.awayScore}
            </p>
            <p className={`text-lg font-bold mt-1 ${pts && pts > 0 ? 'text-green-700' : 'text-gray-500'}`}>
              {pts && pts > 0 ? `+${pts} points` : '0 points'}
            </p>
            {pts === 3 && <p className="text-xs text-green-600 mt-0.5">Exact score!</p>}
            {pts === 1 && <p className="text-xs text-green-600 mt-0.5">Correct result!</p>}
          </div>
        )}

        {match.status === 'FINISHED' && !existingBet && (
          <p className="text-gray-500 text-sm">You didn&apos;t place a bet for this match.</p>
        )}

        {(bettable || existingBet) && match.status !== 'FINISHED' && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {match.homeTeam.shortName}
                </label>
                <input
                  type="number"
                  min={0}
                  max={20}
                  value={homeScore}
                  onChange={(e) => setHomeScore(e.target.value)}
                  className="input text-center text-xl font-bold"
                  required
                  disabled={!bettable}
                />
              </div>
              <div className="pt-5 text-gray-400 font-bold text-xl">–</div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {match.awayTeam.shortName}
                </label>
                <input
                  type="number"
                  min={0}
                  max={20}
                  value={awayScore}
                  onChange={(e) => setAwayScore(e.target.value)}
                  className="input text-center text-xl font-bold"
                  required
                  disabled={!bettable}
                />
              </div>
            </div>

            {error && <p className="text-red-600 text-sm">{error}</p>}
            {success && <p className="text-green-600 text-sm">{success}</p>}

            {bettable ? (
              <button type="submit" disabled={saving} className="btn-primary w-full py-3">
                {saving ? 'Saving...' : existingBet ? 'Update bet' : 'Place bet'}
              </button>
            ) : (
              <p className="text-center text-sm text-gray-500">
                Betting is closed (within 15 minutes of kickoff)
              </p>
            )}
          </form>
        )}

        {!bettable && !existingBet && match.status === 'SCHEDULED' && (
          <p className="text-sm text-gray-500">Betting is closed for this match.</p>
        )}
      </div>

      {/* Points guide */}
      <div className="card bg-gray-50">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Points Guide</h3>
        <div className="space-y-1 text-sm text-gray-600">
          <div className="flex justify-between">
            <span>Exact score</span>
            <span className="font-bold text-green-700">3 pts</span>
          </div>
          <div className="flex justify-between">
            <span>Correct result</span>
            <span className="font-bold text-green-700">1 pt</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function calculatePoints(bet: MatchBet, match: Match): number {
  if (match.status !== 'FINISHED') return 0;
  const actual = match.score.fullTime;
  if (actual.home === null || actual.away === null) return 0;
  if (bet.homeScore === actual.home && bet.awayScore === actual.away) return 3;
  const betResult = Math.sign(bet.homeScore - bet.awayScore);
  const actualResult = Math.sign(actual.home - actual.away);
  if (betResult === actualResult) return 1;
  return 0;
}
