'use client';

import { useState, useEffect } from 'react';
import type { TournamentBet } from '@/types';
import { getTournamentWinnerPoints } from '@/lib/scoring';

const TOURNAMENT_DEADLINE = new Date('2026-06-11T13:00:00Z');

const WC_2026_TEAMS = [
  // Group A
  'Mexico', 'South Africa', 'South Korea', 'Czechia',
  // Group B
  'Canada', 'Qatar', 'Switzerland', 'Bosnia-Herzegovina',
  // Group C
  'Brazil', 'Morocco', 'Scotland', 'Haiti',
  // Group D
  'United States', 'Australia', 'Turkey', 'Paraguay',
  // Group E
  'Germany', 'Ecuador', 'Ivory Coast', 'Curaçao',
  // Group F
  'Netherlands', 'Japan', 'Sweden', 'Tunisia',
  // Group G
  'Belgium', 'Iran', 'Egypt', 'New Zealand',
  // Group H
  'Spain', 'Uruguay', 'Saudi Arabia', 'Cape Verde Islands',
  // Group I
  'France', 'Senegal', 'Norway', 'Iraq',
  // Group J
  'Argentina', 'Austria', 'Algeria', 'Jordan',
  // Group K
  'Portugal', 'Colombia', 'Uzbekistan', 'Congo DR',
  // Group L
  'England', 'Croatia', 'Ghana', 'Panama',
].sort();

const FAVORITES = new Set(['England', 'Portugal', 'Spain', 'Argentina', 'France', 'Brazil']);

export default function TournamentPage() {
  const [existingBet, setExistingBet] = useState<TournamentBet | null>(null);
  const [topScorer, setTopScorer] = useState('');
  const [winner, setWinner] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const isOpen = Date.now() < TOURNAMENT_DEADLINE.getTime();

  useEffect(() => {
    fetch('/api/tournament-bets')
      .then((r) => r.json())
      .then((bet: TournamentBet | null) => {
        if (bet) {
          setExistingBet(bet);
          setTopScorer(bet.topScorer);
          setWinner(bet.winner);
        }
        setLoading(false);
      });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);

    try {
      const res = await fetch('/api/tournament-bets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topScorer: topScorer.trim(), winner }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Failed to save');
      } else {
        setExistingBet(data);
        setSuccess(existingBet ? 'Bets updated!' : 'Bets placed!');
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

  const winnerPts = winner ? getTournamentWinnerPoints(winner) : null;

  return (
    <div className="max-w-md mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Trophy Bets</h1>
        <p className="text-gray-500 text-sm mt-1">
          {isOpen
            ? `Betting closes ${TOURNAMENT_DEADLINE.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}`
            : 'Tournament betting is closed'}
        </p>
      </div>

      {/* Points guide */}
      <div className="card bg-amber-50 border-amber-100">
        <h3 className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-2">Points on offer</h3>
        <div className="space-y-1.5 text-sm text-gray-700">
          <div className="flex justify-between">
            <span>Top scorer of the tournament</span>
            <span className="font-bold text-amber-700">5 pts</span>
          </div>
          <div className="flex justify-between">
            <span>Tournament winner (England/Portugal/Spain/Argentina/France/Brazil)</span>
            <span className="font-bold text-amber-700">8 pts</span>
          </div>
          <div className="flex justify-between">
            <span>Tournament winner (any other team)</span>
            <span className="font-bold text-amber-700">16 pts</span>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Top scorer */}
        <div className="card space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-bold">Top Scorer</h2>
            <span className="badge bg-amber-100 text-amber-700 font-bold">5 pts</span>
          </div>
          <p className="text-sm text-gray-500">
            Who will score the most goals in the entire tournament?
          </p>
          <input
            type="text"
            value={topScorer}
            onChange={(e) => setTopScorer(e.target.value)}
            placeholder="Player name, e.g. Kylian Mbappé"
            className="input"
            disabled={!isOpen}
            required
          />
        </div>

        {/* Tournament winner */}
        <div className="card space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-bold">Tournament Winner</h2>
            <span className="badge bg-amber-100 text-amber-700 font-bold">
              {winnerPts ? `${winnerPts} pts` : '8–16 pts'}
            </span>
          </div>
          <p className="text-sm text-gray-500">
            Who will lift the trophy? Underdogs earn more points!
          </p>
          <select
            value={winner}
            onChange={(e) => setWinner(e.target.value)}
            className="input"
            disabled={!isOpen}
            required
          >
            <option value="">Select a team...</option>
            <optgroup label="Favorites (8 pts)">
              {Array.from(FAVORITES).sort().map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </optgroup>
            <optgroup label="Other teams (16 pts)">
              {WC_2026_TEAMS.filter((t) => !FAVORITES.has(t)).map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </optgroup>
          </select>
          {winner && winnerPts && (
            <p className="text-sm text-green-600">
              If {winner} wins, you get <strong>{winnerPts} points</strong>
            </p>
          )}
        </div>

        {error && <p className="text-red-600 text-sm">{error}</p>}
        {success && <p className="text-green-600 text-sm font-medium">{success}</p>}

        {isOpen ? (
          <button
            type="submit"
            disabled={saving || !topScorer.trim() || !winner}
            className="btn-primary w-full py-3 text-base"
          >
            {saving ? 'Saving...' : existingBet ? 'Update bets' : 'Place bets'}
          </button>
        ) : (
          <div className="card bg-gray-50 text-center text-gray-500 text-sm">
            Tournament betting is closed
            {existingBet && (
              <p className="mt-1 font-medium text-gray-700">
                Your bets: {existingBet.topScorer} · {existingBet.winner}
              </p>
            )}
          </div>
        )}
      </form>
    </div>
  );
}
