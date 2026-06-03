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
  const [tournamentResult, setTournamentResult] = useState<TournamentResult>({ topScorer: null, winner: null });
  const [topScorerInput, setTopScorerInput] = useState('');
  const [winnerInput, setWinnerInput] = useState('');
  const [savingResult, setSavingResult] = useState(false);
  const [resultMsg, setResultMsg] = useState('');
  const [bootstrapping, setBootstrapping] = useState(false);
  const [bootstrapMsg, setBootstrapMsg] = useState('');

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
        setWinnerInput(r.winner ?? '');
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
