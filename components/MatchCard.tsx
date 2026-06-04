'use client';

import { useState } from 'react';
import type { Match, MatchBet } from '@/types';
import { getFlag } from '@/lib/flags';

function canBetClient(match: Match): boolean {
  if (match.status !== 'SCHEDULED' && match.status !== 'TIMED') return false;
  return new Date(match.utcDate).getTime() - Date.now() > 60 * 60 * 1000;
}

function calcPoints(bet: MatchBet, match: Match): number {
  if (match.status !== 'FINISHED') return 0;
  const a = match.score.fullTime;
  if (a.home === null || a.away === null) return 0;
  if (bet.homeScore === a.home && bet.awayScore === a.away) return 3;
  if (Math.sign(bet.homeScore - bet.awayScore) === Math.sign(a.home - a.away)) return 1;
  return 0;
}

function formatDate(utcDate: string) {
  return new Date(utcDate).toLocaleString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

type Props = {
  match: Match;
  initialBet: MatchBet | null;
};

export function MatchCard({ match, initialBet }: Props) {
  const [bet, setBet] = useState<MatchBet | null>(initialBet);
  const [home, setHome] = useState(initialBet != null ? String(initialBet.homeScore) : '');
  const [away, setAway] = useState(initialBet != null ? String(initialBet.awayScore) : '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const bettable = canBetClient(match);
  const isLive = match.status === 'IN_PLAY' || match.status === 'LIVE' || match.status === 'PAUSED';
  const isFinished = match.status === 'FINISHED';
  const pts = bet && isFinished ? calcPoints(bet, match) : null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!bettable) return;
    setSaving(true);
    try {
      const res = await fetch('/api/bets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          matchId: match.id,
          homeScore: parseInt(home, 10),
          awayScore: parseInt(away, 10),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setBet(data);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    } finally {
      setSaving(false);
    }
  }

  const groupLabel = match.group ? match.group.replace('GROUP_', 'Group ') : null;

  return (
    <div className={`card py-3 ${isLive ? 'ring-1 ring-red-300' : ''}`}>
      {/* Header: group + date */}
      <div className="flex items-center justify-between mb-2 text-xs text-gray-400">
        <div className="flex items-center gap-2">
          {isLive && (
            <span className="flex items-center gap-1 text-red-600 font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              LIVE
            </span>
          )}
          {isFinished && <span className="font-medium text-gray-500">FT</span>}
          {groupLabel && <span>{groupLabel}</span>}
        </div>
        <span>{formatDate(match.utcDate)}</span>
      </div>

      {/* Single main row: flag+team | score/inputs | team+flag | button/result */}
      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        {/* Home team */}
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          <span className="text-xl shrink-0">{getFlag(match.homeTeam.name)}</span>
          <span className="font-semibold text-sm truncate">
            {match.homeTeam.shortName || match.homeTeam.name}
          </span>
        </div>

        {/* Center: score inputs or actual score */}
        {isFinished ? (
          <span className="text-xl font-bold text-gray-800 shrink-0 tabular-nums">
            {match.score.fullTime.home} – {match.score.fullTime.away}
          </span>
        ) : isLive ? (
          <span className="text-lg font-bold text-red-600 shrink-0 tabular-nums">
            {match.score.fullTime.home ?? 0} – {match.score.fullTime.away ?? 0}
          </span>
        ) : bettable ? (
          <div className="flex items-center gap-1 shrink-0">
            <input
              type="number"
              min={0}
              max={20}
              value={home}
              onChange={(e) => setHome(e.target.value)}
              placeholder="0"
              className="w-12 text-center input py-1.5 text-lg font-bold"
              required
            />
            <span className="text-gray-400 font-bold">–</span>
            <input
              type="number"
              min={0}
              max={20}
              value={away}
              onChange={(e) => setAway(e.target.value)}
              placeholder="0"
              className="w-12 text-center input py-1.5 text-lg font-bold"
              required
            />
          </div>
        ) : (
          <span className="text-gray-400 font-medium shrink-0">vs</span>
        )}

        {/* Away team */}
        <div className="flex items-center justify-end gap-1.5 flex-1 min-w-0">
          <span className="font-semibold text-sm truncate text-right">
            {match.awayTeam.shortName || match.awayTeam.name}
          </span>
          <span className="text-xl shrink-0">{getFlag(match.awayTeam.name)}</span>
        </div>

        {/* Right side: bet button OR points OR bet info */}
        {isFinished ? (
          <div className="shrink-0 text-right min-w-[4.5rem]">
            {pts !== null && pts > 0 ? (
              <span className="font-bold text-green-700">
                +{pts} pts{pts === 3 ? ' 🎯' : ''}
              </span>
            ) : bet ? (
              <span className="text-xs text-gray-400">
                {bet.homeScore}–{bet.awayScore} · 0pts
              </span>
            ) : (
              <span className="text-xs text-gray-400">no bet</span>
            )}
          </div>
        ) : bettable ? (
          <button
            type="submit"
            disabled={saving || home === '' || away === ''}
            className={`shrink-0 min-w-[4.5rem] btn py-1.5 text-sm font-semibold transition-all ${
              saved
                ? 'bg-green-100 text-green-700 border border-green-200'
                : 'btn-primary'
            }`}
          >
            {saving ? '…' : saved ? '✓ Saved' : bet ? 'Update' : 'Bet'}
          </button>
        ) : (
          <div className="shrink-0 text-right min-w-[4.5rem]">
            {bet ? (
              <span className="text-xs text-gray-500 font-medium">
                {bet.homeScore}–{bet.awayScore}
              </span>
            ) : (
              <span className="text-xs text-gray-400">no bet</span>
            )}
          </div>
        )}
      </form>
    </div>
  );
}
