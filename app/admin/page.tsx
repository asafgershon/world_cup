'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import type { User, TournamentResult } from '@/types';

function AdminContent() {
  const searchParams = useSearchParams();
  const secret = searchParams.get('secret') ?? '';

  const [isAdmin, setIsAdmin] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  const [newName, setNewName] = useState('');
  const [generatedCode, setGeneratedCode] = useState('');
  const [generating, setGenerating] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState('');
  const [tournamentResult, setTournamentResult] = useState<TournamentResult>({ topScorer: null, topScorerGoals: null, winner: null });
  const [topScorerInput, setTopScorerInput] = useState('');
  const [topScorerGoalsInput, setTopScorerGoalsInput] = useState('');  const [winnerInput, setWinnerInput] = useState('');
  const [savingResult, setSavingResult] = useState(false);
  const [resultMsg, setResultMsg] = useState('');
  const [bootstrapping, setBootstrapping] = useState(false);
  const [bootstrapMsg, setBootstrapMsg] = useState('');
  const [oddsInput, setOddsInput] = useState('');
  const [savingOdds, setSavingOdds] = useState(false);
  const [oddsMsg, setOddsMsg] = useState('');
  const [randomizing, setRandomizing] = useState(false);
  const [randomMsg, setRandomMsg] = useState('');
  const [patchingLast32, setPatchingLast32] = useState(false);
  const [patchLast32Msg, setPatchLast32Msg] = useState('');
  const [playerGoals, setPlayerGoalsState] = useState<Record<string, number>>({});
  const [savingGoals, setSavingGoals] = useState(false);
  const [goalsMsg, setGoalsMsg] = useState('');

  useEffect(() => {
    async function checkAdmin() {
      const res = await fetch('/api/admin/users');
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
        setIsAdmin(true);
      }
      setCheckingAuth(false);
    }
    checkAdmin();
    fetch('/api/admin/tournament-result')
      .then((r) => r.json())
      .then((r: TournamentResult) => {
        setTournamentResult(r);
        setTopScorerInput(r.topScorer ?? '');
        setTopScorerGoalsInput(r.topScorerGoals != null ? String(r.topScorerGoals) : '');
        setWinnerInput(r.winner ?? '');
      });
    fetch('/api/admin/user-goals')
      .then((r) => r.ok ? r.json() : [])
      .then((rows: { userCode: string; goals: number }[]) => {
        const map: Record<string, number> = {};
        for (const row of rows) map[row.userCode] = row.goals;
        setPlayerGoalsState(map);
      });
  }, []);

  async function bootstrapAdmin() {
    if (!secret) {
      setBootstrapMsg('No secret provided in URL (?secret=...)');
      return;
    }
    setBootstrapping(true);
    const res = await fetch('/api/admin/bootstrap', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret }),
    });
    const data = await res.json();
    if (res.ok) {
      setBootstrapMsg(`Admin code created: ${data.code} — log in with this code`);
    } else {
      setBootstrapMsg(data.error ?? 'Failed');
    }
    setBootstrapping(false);
  }

  async function generateCode() {
    if (!newName.trim()) return;
    setGenerating(true);
    setGeneratedCode('');
    const res = await fetch('/api/admin/generate-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName.trim() }),
    });
    const data = await res.json();
    if (res.ok) {
      setGeneratedCode(data.code);
      setNewName('');
      setUsers((u) => [...u, { code: data.code, name: data.name, isAdmin: false, createdAt: data.createdAt }]);
    }
    setGenerating(false);
  }

  async function syncMatches() {
    setSyncing(true);
    setSyncMsg('');
    const res = await fetch('/api/admin/sync', { method: 'POST' });
    const data = await res.json();
    setSyncMsg(res.ok ? `Synced ${data.count} matches` : data.error ?? 'Error');
    setSyncing(false);
  }

  async function saveTournamentResult() {
    setSavingResult(true);
    setResultMsg('');
    const res = await fetch('/api/admin/tournament-result', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        topScorer: topScorerInput.trim() || null,
        topScorerGoals: topScorerGoalsInput !== '' ? parseInt(topScorerGoalsInput, 10) : null,
        winner: winnerInput.trim() || null,
      }),
    });
    const data = await res.json();
    if (res.ok) {
      setTournamentResult(data);
      setResultMsg('Saved!');
      setTimeout(() => setResultMsg(''), 3000);
    } else {
      setResultMsg(data.error ?? 'Error');
    }
    setSavingResult(false);
  }

  const ODDS_PRESET = JSON.stringify([
    {"homeTeam":"Switzerland","awayTeam":"Canada","homeOdds":2.5,"drawOdds":3.5,"awayOdds":3.5},
    {"homeTeam":"Bosnia-Herzegovina","awayTeam":"Qatar","homeOdds":2,"drawOdds":4,"awayOdds":5},
    {"homeTeam":"Scotland","awayTeam":"Brazil","homeOdds":6,"drawOdds":4.5,"awayOdds":1.5},
    {"homeTeam":"Morocco","awayTeam":"Haiti","homeOdds":1.5,"drawOdds":6,"awayOdds":10},
    {"homeTeam":"Czechia","awayTeam":"Mexico","homeOdds":3.5,"drawOdds":3,"awayOdds":2.5},
    {"homeTeam":"South Africa","awayTeam":"South Korea","homeOdds":4,"drawOdds":3.5,"awayOdds":2.5},
    {"homeTeam":"Curaçao","awayTeam":"Ivory Coast","homeOdds":9,"drawOdds":6,"awayOdds":1.5},
    {"homeTeam":"Ecuador","awayTeam":"Germany","homeOdds":4.5,"drawOdds":3.5,"awayOdds":1.5},
    {"homeTeam":"Tunisia","awayTeam":"Netherlands","homeOdds":6,"drawOdds":4,"awayOdds":1.5},
    {"homeTeam":"Japan","awayTeam":"Sweden","homeOdds":2,"drawOdds":3,"awayOdds":3.5},
    {"homeTeam":"Turkey","awayTeam":"United States","homeOdds":2.5,"drawOdds":3,"awayOdds":2.5},
    {"homeTeam":"Paraguay","awayTeam":"Australia","homeOdds":2.5,"drawOdds":3,"awayOdds":3},
    {"homeTeam":"Senegal","awayTeam":"Iraq","homeOdds":1.5,"drawOdds":4,"awayOdds":6},
    {"homeTeam":"Norway","awayTeam":"France","homeOdds":4.5,"drawOdds":3,"awayOdds":2},
    {"homeTeam":"Cape Verde Islands","awayTeam":"Saudi Arabia","homeOdds":3,"drawOdds":3.5,"awayOdds":3},
    {"homeTeam":"Uruguay","awayTeam":"Spain","homeOdds":5,"drawOdds":3.5,"awayOdds":1.5},
    {"homeTeam":"Egypt","awayTeam":"Iran","homeOdds":2.5,"drawOdds":3,"awayOdds":3.5},
    {"homeTeam":"New Zealand","awayTeam":"Belgium","homeOdds":7,"drawOdds":4,"awayOdds":1.5},
    {"homeTeam":"Panama","awayTeam":"England","homeOdds":12,"drawOdds":6.5,"awayOdds":1.5},
    {"homeTeam":"Croatia","awayTeam":"Ghana","homeOdds":2,"drawOdds":4,"awayOdds":5},
    {"homeTeam":"Colombia","awayTeam":"Portugal","homeOdds":3.5,"drawOdds":3.5,"awayOdds":2},
    {"homeTeam":"Congo DR","awayTeam":"Uzbekistan","homeOdds":2.5,"drawOdds":3.5,"awayOdds":3.5},
    {"homeTeam":"Jordan","awayTeam":"Argentina","homeOdds":11,"drawOdds":7.5,"awayOdds":1.5},
    {"homeTeam":"Algeria","awayTeam":"Austria","homeOdds":3.5,"drawOdds":3.5,"awayOdds":2.5},
  ], null, 2);

  const LAST32_ODDS_PRESET = JSON.stringify([
    {"homeTeam":"South Africa","awayTeam":"Canada","homeOdds":4.5,"drawOdds":3.5,"awayOdds":2},
    {"homeTeam":"Brazil","awayTeam":"Japan","homeOdds":4,"drawOdds":7,"awayOdds":10},
    {"homeTeam":"Germany","awayTeam":"Paraguay","homeOdds":3,"drawOdds":9,"awayOdds":15},
    {"homeTeam":"Netherlands","awayTeam":"Morocco","homeOdds":4,"drawOdds":6,"awayOdds":7},
    {"homeTeam":"Ivory Coast","awayTeam":"Norway","homeOdds":8,"drawOdds":7,"awayOdds":4},
    {"homeTeam":"France","awayTeam":"Sweden","homeOdds":3,"drawOdds":10,"awayOdds":20},
    {"homeTeam":"Mexico","awayTeam":"Ecuador","homeOdds":4,"drawOdds":8,"awayOdds":10},
    {"homeTeam":"England","awayTeam":"Congo DR","homeOdds":3,"drawOdds":12,"awayOdds":24},
    {"homeTeam":"Belgium","awayTeam":"Senegal","homeOdds":4,"drawOdds":8,"awayOdds":12},
    {"homeTeam":"United States","awayTeam":"Bosnia-Herzegovina","homeOdds":3,"drawOdds":8,"awayOdds":12},
    {"homeTeam":"Spain","awayTeam":"Austria","homeOdds":4,"drawOdds":7,"awayOdds":10},
    {"homeTeam":"Portugal","awayTeam":"Croatia","homeOdds":4,"drawOdds":6,"awayOdds":12},
    {"homeTeam":"Switzerland","awayTeam":"Algeria","homeOdds":4,"drawOdds":6,"awayOdds":8},
    {"homeTeam":"Australia","awayTeam":"Egypt","homeOdds":6,"drawOdds":6,"awayOdds":5},
    {"homeTeam":"Argentina","awayTeam":"Cape Verde Islands","homeOdds":3,"drawOdds":14,"awayOdds":26},
    {"homeTeam":"Colombia","awayTeam":"Ghana","homeOdds":3,"drawOdds":8,"awayOdds":14},
  ], null, 2);

  async function saveOdds() {
    setSavingOdds(true);
    setOddsMsg('');
    try {
      const parsed = JSON.parse(oddsInput);
      const res = await fetch('/api/admin/odds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ odds: parsed }),
      });
      const data = await res.json();
      setOddsMsg(res.ok ? `Saved ${data.count} odds` : data.error ?? 'Error');
    } catch {
      setOddsMsg('Invalid JSON');
    }
    setSavingOdds(false);
    setTimeout(() => setOddsMsg(''), 4000);
  }

  async function generateRandomBets() {
    if (!confirm('This will generate random bets (0–4 goals each team) for every user on every match they haven\'t bet on. Continue?')) return;
    setRandomizing(true);
    setRandomMsg('');
    const res = await fetch('/api/admin/random-bets', { method: 'POST' });
    const data = await res.json();
    setRandomMsg(res.ok ? `Generated ${data.count} random bets` : data.error ?? 'Error');
    setRandomizing(false);
    setTimeout(() => setRandomMsg(''), 5000);
  }

  async function patchLast32Teams() {
    if (!confirm('This will fetch matches from the API and patch the Last 32 team assignments. Continue?')) return;
    setPatchingLast32(true);
    setPatchLast32Msg('');
    const res = await fetch('/api/admin/patch-last32-teams', { method: 'POST' });
    const data = await res.json();
    setPatchLast32Msg(res.ok ? `Patched ${data.patched} Last 32 fixtures` : data.error ?? 'Error');
    setPatchingLast32(false);
    setTimeout(() => setPatchLast32Msg(''), 5000);
  }

  async function savePlayerGoals() {
    setSavingGoals(true);
    setGoalsMsg('');
    const payload = users.map((u) => ({ userCode: u.code, goals: playerGoals[u.code] ?? 0 }));
    const res = await fetch('/api/admin/user-goals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    setGoalsMsg(res.ok ? `Saved goals for ${data.count} players` : data.error ?? 'Error');
    setSavingGoals(false);
    setTimeout(() => setGoalsMsg(''), 4000);
  }

  if (checkingAuth) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="text-gray-400">Loading...</div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="max-w-md mx-auto space-y-4">
        <h1 className="text-2xl font-bold">Admin Setup</h1>
        <div className="card">
          <p className="text-sm text-gray-600 mb-3">
            Not authorized as admin. If this is the first time, bootstrap the admin account by visiting this page with{' '}
            <code className="bg-gray-100 px-1 rounded">?secret=YOUR_ADMIN_SECRET</code>.
          </p>
          {secret && (
            <button onClick={bootstrapAdmin} disabled={bootstrapping} className="btn-primary w-full">
              {bootstrapping ? 'Creating...' : 'Bootstrap Admin Account'}
            </button>
          )}
          {bootstrapMsg && (
            <p className="mt-3 text-sm font-medium text-green-700 bg-green-50 p-2 rounded">{bootstrapMsg}</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Admin Panel</h1>

      {/* Generate invite code */}
      <div className="card space-y-3">
        <h2 className="font-bold">Generate Invite Code</h2>
        <div className="flex gap-2">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Friend's name"
            className="input"
            onKeyDown={(e) => e.key === 'Enter' && generateCode()}
          />
          <button onClick={generateCode} disabled={generating || !newName.trim()} className="btn-primary whitespace-nowrap">
            {generating ? '...' : 'Generate'}
          </button>
        </div>
        {generatedCode && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <p className="text-sm text-gray-600">Share this code:</p>
            <p className="text-2xl font-mono font-bold text-green-800 tracking-widest mt-1">{generatedCode}</p>
          </div>
        )}
      </div>

      {/* User list */}
      <div className="card">
        <h2 className="font-bold mb-3">All Users ({users.length})</h2>
        <div className="space-y-2">
          {users.map((u) => (
            <div key={u.code} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
              <div>
                <span className="font-medium">{u.name}</span>
                {u.isAdmin && <span className="ml-2 text-xs text-green-600">admin</span>}
              </div>
              <code className="text-sm font-mono bg-gray-100 px-2 py-0.5 rounded tracking-wider">
                {u.code}
              </code>
            </div>
          ))}
        </div>
      </div>

      {/* Sync matches */}
      <div className="card space-y-3">
        <h2 className="font-bold">Sync Match Data</h2>
        <p className="text-sm text-gray-500">
          Matches auto-sync every 6 hours. Use this to force an immediate refresh from football-data.org.
        </p>
        <button onClick={syncMatches} disabled={syncing} className="btn-secondary">
          {syncing ? 'Syncing...' : 'Sync now'}
        </button>
        {syncMsg && <p className="text-sm text-green-700">{syncMsg}</p>}
      </div>

      {/* Tournament result */}
      <div className="card space-y-3">
        <h2 className="font-bold">Set Tournament Results</h2>
        <p className="text-sm text-gray-500">
          Set after the tournament ends to award trophy points.
        </p>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Top Scorer</label>
            <input
              type="text"
              value={topScorerInput}
              onChange={(e) => setTopScorerInput(e.target.value)}
              placeholder="e.g. Kylian Mbappé"
              className="input"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Top Scorer Goals</label>
            <input
              type="number"
              min={0}
              value={topScorerGoalsInput}
              onChange={(e) => setTopScorerGoalsInput(e.target.value)}
              placeholder="e.g. 8"
              className="input"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tournament Winner</label>
            <input
              type="text"
              value={winnerInput}
              onChange={(e) => setWinnerInput(e.target.value)}
              placeholder="e.g. France"
              className="input"
            />
          </div>
          <button onClick={saveTournamentResult} disabled={savingResult} className="btn-primary">
            {savingResult ? 'Saving...' : 'Save results'}
          </button>
          {resultMsg && <p className="text-sm text-green-700">{resultMsg}</p>}
        </div>
      </div>

      {/* Match Odds */}
      <div className="card space-y-3">
        <h2 className="font-bold">Match Odds</h2>
        <p className="text-sm text-gray-500">
          Set points for correct predictions. Each entry: homeTeam, awayTeam, homeOdds, drawOdds, awayOdds.
        </p>
        <textarea
          value={oddsInput}
          onChange={(e) => setOddsInput(e.target.value)}
          rows={8}
          className="input font-mono text-xs w-full"
          placeholder='[{"homeTeam":"Brazil","awayTeam":"Haiti","homeOdds":1.5,"drawOdds":12,"awayOdds":15}]'
        />
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setOddsInput(ODDS_PRESET)}
            className="btn-secondary text-sm"
          >
            Load Round 3 Preset
          </button>
          <button
            type="button"
            onClick={() => setOddsInput(LAST32_ODDS_PRESET)}
            className="btn-secondary text-sm"
          >
            Load Last 32 Preset
          </button>
          <button onClick={saveOdds} disabled={savingOdds || !oddsInput.trim()} className="btn-primary text-sm">
            {savingOdds ? 'Saving...' : 'Save Odds'}
          </button>
        </div>
        {oddsMsg && <p className="text-sm text-green-700">{oddsMsg}</p>}
      </div>

      {/* Random Bets */}
      <div className="card space-y-3">
        <h2 className="font-bold">Generate Random Bets 🎲</h2>
        <p className="text-sm text-gray-500">
          For every user who hasn&apos;t bet on a match that has already started or finished, generate a random score (0–4 goals each team). Random bets are marked with 🎲 and get overwritten if the user places a real bet.
        </p>
        <button onClick={generateRandomBets} disabled={randomizing} className="btn-secondary text-sm">
          {randomizing ? 'Generating...' : 'Generate Random Bets'}
        </button>
        {randomMsg && <p className="text-sm text-green-700">{randomMsg}</p>}
      </div>

      {/* Patch Last 32 Teams */}
      <div className="card space-y-3">
        <h2 className="font-bold">Patch Last 32 Teams</h2>
        <p className="text-sm text-gray-500">
          Forces a match sync from the API then patches the 14 known Last 32 fixtures with the correct team assignments.
        </p>
        <button onClick={patchLast32Teams} disabled={patchingLast32} className="btn-secondary text-sm">
          {patchingLast32 ? 'Patching...' : 'Patch Last 32 Teams'}
        </button>
        {patchLast32Msg && <p className="text-sm text-green-700">{patchLast32Msg}</p>}
      </div>

      {/* Player Goals */}
      <div className="card space-y-3">
        <h2 className="font-bold">Player Goals (2 pts each)</h2>
        <p className="text-sm text-gray-500">
          Each goal = 2 bonus points on the leaderboard. Requires <code className="bg-gray-100 px-1 rounded">world_cup_user_goals</code> table in Supabase.
        </p>
        <div className="space-y-2">
          {users.map((u) => (
            <div key={u.code} className="flex items-center gap-3">
              <span className="flex-1 font-medium text-sm">{u.name}</span>
              <input
                type="number"
                min={0}
                value={playerGoals[u.code] ?? 0}
                onChange={(e) => setPlayerGoalsState((prev) => ({ ...prev, [u.code]: parseInt(e.target.value) || 0 }))}
                className="input w-20 text-center py-1 text-sm"
              />
              <span className="text-xs text-gray-400">goals</span>
            </div>
          ))}
        </div>
        <button onClick={savePlayerGoals} disabled={savingGoals || users.length === 0} className="btn-primary text-sm">
          {savingGoals ? 'Saving...' : 'Save Goals'}
        </button>
        {goalsMsg && <p className="text-sm text-green-700">{goalsMsg}</p>}
      </div>
    </div>
  );
}

export default function AdminPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-48 text-gray-400">Loading...</div>}>
      <AdminContent />
    </Suspense>
  );
}
