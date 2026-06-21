'use client';

import { useEffect, useRef, useState } from 'react';
import type { Match, MatchBet, MatchOdds } from '@/types';
import { MatchCard } from '@/components/MatchCard';

const STAGE_LABELS: Record<string, string> = {
  GROUP_STAGE: 'Group Stage',
  LAST_48: 'Round of 48',
  LAST_32: 'Round of 32',
  LAST_16: 'Round of 16',
  QUARTER_FINALS: 'Quarter Finals',
  SEMI_FINALS: 'Semi Finals',
  THIRD_PLACE: 'Third Place Play-off',
  FINAL: 'Final',
};

const STAGE_ORDER = [
  'GROUP_STAGE', 'LAST_48', 'LAST_32', 'LAST_16',
  'QUARTER_FINALS', 'SEMI_FINALS', 'THIRD_PLACE', 'FINAL',
];

export default function MatchesPage() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [betsMap, setBetsMap] = useState<Map<number, MatchBet>>(new Map());
  const [oddsMap, setOddsMap] = useState<Map<string, MatchOdds>>(new Map());
  const [loading, setLoading] = useState(true);
  const scrolledRef = useRef(false);

  useEffect(() => {
    Promise.all([
      fetch('/api/matches').then((r) => r.json()),
      fetch('/api/bets').then((r) => r.json()),
      fetch('/api/odds').then((r) => r.json()),
    ]).then(([fetchedMatches, fetchedBets, fetchedOdds]: [Match[], MatchBet[], MatchOdds[]]) => {
        setMatches(fetchedMatches);
        setBetsMap(new Map(fetchedBets.map((b) => [b.matchId, b])));
        setOddsMap(new Map(fetchedOdds.map((o) => [`${o.homeTeam}_${o.awayTeam}`, o])));
        setLoading(false);
      },
    );
  }, []);

  useEffect(() => {
    if (loading || scrolledRef.current) return;
    scrolledRef.current = true;
    const todayStr = new Date().toDateString();
    const firstToday = matches.find((m) => new Date(m.utcDate).toDateString() === todayStr);
    if (firstToday) {
      requestAnimationFrame(() => {
        document.getElementById(`match-${firstToday.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
    }
  }, [loading, matches]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48 text-gray-400">Loading matches...</div>
    );
  }

  if (matches.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p className="text-4xl mb-3">⚽</p>
        <p className="font-medium">No matches loaded yet</p>
        <p className="text-sm mt-1">Add a FOOTBALL_API_KEY to .env.local to load real fixtures</p>
      </div>
    );
  }

  // Group by stage
  const grouped = matches.reduce<Record<string, Match[]>>((acc, m) => {
    if (!acc[m.stage]) acc[m.stage] = [];
    acc[m.stage].push(m);
    return acc;
  }, {});

  const sortedStages = Object.keys(grouped).sort((a, b) => {
    const ai = STAGE_ORDER.indexOf(a);
    const bi = STAGE_ORDER.indexOf(b);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Matches</h1>

      {sortedStages.map((stage) => (
        <section key={stage}>
          <h2 className="text-base font-semibold text-gray-500 uppercase tracking-wide mb-3">
            {STAGE_LABELS[stage] ?? stage.replace(/_/g, ' ')}
          </h2>
          <div className="space-y-3">
            {grouped[stage]
              .sort((a, b) => new Date(a.utcDate).getTime() - new Date(b.utcDate).getTime())
              .map((match) => (
                <div key={match.id} id={`match-${match.id}`}>
                  <MatchCard
                    match={match}
                    initialBet={betsMap.get(match.id) ?? null}
                    odds={oddsMap.get(`${match.homeTeam.name}_${match.awayTeam.name}`)}
                    allMatches={matches}
                  />
                </div>
              ))}
          </div>
        </section>
      ))}
    </div>
  );
}
