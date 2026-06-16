import { redirect } from 'next/navigation';
import { getSessionUser, } from '@/lib/auth';
import { getAllUsers, getAllTournamentBets } from '@/lib/kv';
import { getFlag } from '@/lib/flags';

const REVEAL_DATE = new Date('2026-06-13T23:59:59Z');

export default async function TrophyPicksPage() {
  const user = await getSessionUser();
  if (!user) redirect('/');

  const now = new Date();
  const isRevealed = now >= REVEAL_DATE;

  if (!isRevealed) {
    const diff = REVEAL_DATE.getTime() - now.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    return (
      <div className="max-w-md mx-auto space-y-6">
        <h1 className="text-2xl font-bold">Trophy Picks</h1>
        <div className="card text-center space-y-4 py-10">
          <div className="text-5xl">🔒</div>
          <p className="font-semibold text-gray-800">Picks are hidden until bets close</p>
          <p className="text-gray-500 text-sm">
            Reveals on{' '}
            {REVEAL_DATE.toLocaleDateString('en-GB', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
            })}
          </p>
          <div className="flex justify-center gap-4 text-center mt-2">
            {[['days', days], ['hours', hours], ['mins', minutes]].map(([label, val]) => (
              <div key={label as string} className="bg-green-50 rounded-xl px-5 py-3">
                <p className="text-3xl font-bold text-green-800">{val}</p>
                <p className="text-xs text-gray-500 mt-1">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const [allUsers, allBets] = await Promise.all([getAllUsers(), getAllTournamentBets()]);
  const betsMap = new Map(allBets.map((b) => [b.userCode.toUpperCase(), b]));

  const rows = allUsers
    .map((u) => ({ ...u, bet: betsMap.get(u.code.toUpperCase()) ?? null }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Trophy Picks</h1>
      <p className="text-sm text-gray-500">Everyone&apos;s bets on the tournament winner and top scorer.</p>

      <div className="card overflow-hidden p-0">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="text-left px-4 py-3 text-gray-500 font-medium">Player</th>
              <th className="text-left px-4 py-3 text-gray-500 font-medium">Tournament Winner</th>
              <th className="text-left px-4 py-3 text-gray-500 font-medium">King of Goals</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {rows.map((row) => (
              <tr
                key={row.code}
                className={`${row.code === user.code ? 'bg-green-50 font-semibold' : 'hover:bg-gray-50'} transition-colors`}
              >
                <td className="px-4 py-3">
                  {row.name}
                  {row.code === user.code && (
                    <span className="ml-1.5 text-xs text-green-600">(you)</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {row.bet ? (
                    <span>{getFlag(row.bet.winner)} {row.bet.winner}</span>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {row.bet ? row.bet.topScorer : <span className="text-gray-400">—</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
