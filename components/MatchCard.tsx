'use client';

import { useState, useEffect } from 'react';
import type { Match, MatchBet } from '@/types';
import { getFlag } from '@/lib/flags';

type OtherBet = {
  userCode: string;
  userName: string;
  homeScore: number;
  awayScore: number;
};

function calcBetPoints(homeScore: number, awayScore: number, match: Match): number {
  if (match.status !== 'FINISHED') return 0;
  const a = match.score.fullTime;
  if (a.home === null || a.away === null) return 0;
  if (homeScore === a.home && awayScore === a.away) return 3;
  if (Math.sign(homeScore - awayScore) === Math.sign(a.home - a.away)) return 1;
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

function formatTimeLeft(ms: number): string {
  const totalSecs = Math.floor(ms / 1000);
  const days = Math.floor(totalSecs / 86400);
  const hours = Math.floor((totalSecs % 86400) / 3600);
  const mins = Math.floor((totalSecs % 3600) / 60);
  const secs = totalSecs % 60;
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m ${secs}s`;
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

  // Reactive now for countdown
  const [now, setNow] = useState(() => Date.now());

  const bettingDeadline = new Date(match.utcDate).getTime() - 60 * 60 * 1000;
  const timeUntilDeadline = bettingDeadline - now;

  useEffect(() => {
    const deadline = new Date(match.utcDate).getTime() - 60 * 60 * 1000;
    if (Date.now() >= deadline) return;
    const timer = setInterval(() => {
      const t = Date.now();
      setNow(t);
      if (t >= deadline) clearInterval(timer);
    }, 1000);
    return () => clearInterval(timer);
  }, [match.utcDate]);

  // Other bets
  const [showOtherBets, setShowOtherBets] = useState(false);
  const [otherBets, setOtherBets] = useState<OtherBet[] | null>(null);
  const [loadingBets, setLoadingBets] = useState(false);
  const [betsRevealed, setBetsRevealed] = useState<boolean | null>(null);

  async function handleToggleOtherBets() {
    const next = !showOtherBets;
    setShowOtherBets(next);
    if (next && otherBets === null) {
      setLoadingBets(true);
      try {
        const res = await fetch(`/api/bets?matchId=${match.id}`);
        if (res.ok) {
          const data = await res.json();
          setBetsRevealed(data.revealed);
          setOtherBets(data.bets ?? []);
        }
      } finally {
        setLoadingBets(false);
      }
    }
  }

  const bettable = (match.status === 'SCHEDULED' || match.status === 'TIMED') && timeUntilDeadline > 0;
  const isLive = match.status === 'IN_PLAY' || match.status === 'LIVE' || match.status === 'PAUSED';
  const isFinished = match.status === 'FINISHED';
  const pts = bet && isFinished ? calcBetPoints(bet.homeScore, bet.awayScore, match) : null;

  const groupLabel = match.group ? match.group.replace('GROUP_', 'Group ') : null;

  const isUrgent = bettable && timeUntilDeadline < 30 * 60 * 1000;
  const isWarning = bettable && timeUntilDeadline < 2 * 60 * 60 * 1000;
  const countdownColor = isUrgent ? 'text-red-500 font-semibold' : isWarning ? 'text-amber-500' : 'text-gray-400';

  const myCode = bet?.userCode;

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

  return (
    <div className={`card py-3 ${isLive ? 'ring-1 ring-red-300' : ''}`}>
      {/* Header: group + countdown + date */}
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
        <div className="flex items-center gap-2">
          {bettable && (
            <span className={`flex items-center gap-1 ${countdownColor}`}>
              ⏱ {formatTimeLeft(timeUntilDeadline)}
            </span>
          )}
          <span>{formatDate(match.utcDate)}</span>
        </div>
      </div>

      {/* Main row */}
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

      {/* Other bets toggle */}
      <div className="mt-2 pt-2 border-t border-gray-100">
        <button
          type="button"
          onClick={handleToggleOtherBets}
          className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1 transition-colors w-full"
        >
          <span
            className="inline-block transition-transform duration-150"
            style={{ transform: showOtherBets ? 'rotate(180deg)' : 'rotate(0deg)' }}
          >
            ▾
          </span>
          <span>Other bets</span>
          {otherBets !== null && betsRevealed && (
            <span className="text-gray-300 ml-0.5">({otherBets.length})</span>
          )}
        </button>

        {showOtherBets && (
          <div className="mt-2">
            {loadingBets ? (
              <p className="text-xs text-gray-400">Loading…</p>
            ) : betsRevealed === false ? (
              <p className="text-xs text-gray-400">
                🔒 Bets are hidden until 1h before kickoff
              </p>
            ) : otherBets && otherBets.length === 0 ? (
              <p className="text-xs text-gray-400">No bets placed yet</p>
            ) : otherBets ? (
              <div className="space-y-1">
                {otherBets.map((ob) => {
                  const isMe = ob.userCode === myCode;
                  const obPts = isFinished ? calcBetPoints(ob.homeScore, ob.awayScore, match) : null;
                  return (
                    <div
                      key={ob.userCode}
                      className={`flex items-center justify-between text-xs ${
                        isMe ? 'text-green-700 font-semibold' : 'text-gray-600'
                      }`}
                    >
                      <span>
                        {ob.userName}
                        {isMe && <span className="text-green-500 ml-1">(you)</span>}
                      </span>
                      <span className="flex items-center gap-2 tabular-nums">
                        <span>{ob.homeScore}–{ob.awayScore}</span>
                        {obPts !== null && (
                          <span className={obPts > 0 ? 'text-green-600' : 'text-gray-400'}>
                            {obPts > 0 ? `+${obPts}` : '0'} pts
                          </span>
                        )}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
