import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth';
import { fetchMatches } from '@/lib/football-api';
import { getFlag } from '@/lib/flags';

type TeamStats = {
  name: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
};

function pts(t: TeamStats) { return t.won * 3 + t.drawn; }
function gd(t: TeamStats) { return t.goalsFor - t.goalsAgainst; }

function buildStandings(matches: Awaited<ReturnType<typeof fetchMatches>>) {
  const groups: Record<string, Record<string, TeamStats>> = {};

  for (const match of matches) {
    if (!match.group) continue;
    const g = match.group;
    if (!groups[g]) groups[g] = {};

    for (const team of [match.homeTeam, match.awayTeam]) {
      if (!groups[g][team.name]) {
        groups[g][team.name] = {
          name: team.name,
          played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0,
        };
      }
    }

    if (match.status === 'FINISHED') {
      const hg = match.score.fullTime.home;
      const ag = match.score.fullTime.away;
      if (hg === null || ag === null) continue;

      const home = groups[g][match.homeTeam.name];
      const away = groups[g][match.awayTeam.name];

      home.played++; home.goalsFor += hg; home.goalsAgainst += ag;
      away.played++; away.goalsFor += ag; away.goalsAgainst += hg;

      if (hg > ag) { home.won++; away.lost++; }
      else if (hg < ag) { away.won++; home.lost++; }
      else { home.drawn++; away.drawn++; }
    }
  }

  return groups;
}

export default async function GroupsPage() {
  const user = await getSessionUser();
  if (!user) redirect('/');

  const matches = await fetchMatches();
  const groups = buildStandings(matches);

  const sortedGroups = Object.keys(groups).sort();

  if (sortedGroups.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p className="text-4xl mb-3">⚽</p>
        <p className="font-medium">No group data yet</p>
        <p className="text-sm mt-1">Matches will appear here once fixtures are loaded</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Group Stage</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sortedGroups.map((groupName) => {
          const teams = Object.values(groups[groupName]).sort(
            (a, b) => pts(b) - pts(a) || gd(b) - gd(a) || b.goalsFor - a.goalsFor || a.name.localeCompare(b.name),
          );

          return (
            <div key={groupName} className="card overflow-hidden p-0">
              <div className="bg-green-800 text-white px-4 py-2">
                <h2 className="font-bold text-sm">{groupName.replace('GROUP_', 'Group ')}</h2>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50 text-xs text-gray-500">
                    <th className="text-left px-3 py-1.5 font-medium w-8">#</th>
                    <th className="text-left px-3 py-1.5 font-medium">Team</th>
                    <th className="text-center px-1.5 py-1.5 font-medium">P</th>
                    <th className="text-center px-1.5 py-1.5 font-medium">W</th>
                    <th className="text-center px-1.5 py-1.5 font-medium">D</th>
                    <th className="text-center px-1.5 py-1.5 font-medium">L</th>
                    <th className="text-center px-1.5 py-1.5 font-medium hidden sm:table-cell">GD</th>
                    <th className="text-center px-3 py-1.5 font-medium text-green-700">Pts</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {teams.map((team, i) => {
                    const qualified = i < 2;
                    const p = pts(team);
                    return (
                      <tr
                        key={team.name}
                        className={qualified && team.played > 0 ? 'bg-green-50' : ''}
                      >
                        <td className="px-3 py-2 text-gray-400 text-xs">{i + 1}</td>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-1.5">
                            {qualified && team.played > 0 && (
                              <span className="w-1 h-4 rounded-full bg-green-500 shrink-0" />
                            )}
                            <span className="text-base leading-none">{getFlag(team.name)}</span>
                            <span className="font-medium truncate">{team.name}</span>
                          </div>
                        </td>
                        <td className="text-center px-1.5 py-2 text-gray-600">{team.played}</td>
                        <td className="text-center px-1.5 py-2 text-gray-600">{team.won}</td>
                        <td className="text-center px-1.5 py-2 text-gray-600">{team.drawn}</td>
                        <td className="text-center px-1.5 py-2 text-gray-600">{team.lost}</td>
                        <td className="text-center px-1.5 py-2 text-gray-500 hidden sm:table-cell">
                          {gd(team) > 0 ? `+${gd(team)}` : gd(team)}
                        </td>
                        <td className="text-center px-3 py-2 font-bold text-green-700">{p}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          );
        })}
      </div>

      <p className="text-xs text-gray-400 text-center">
        Green bar = currently qualifying for knockout stage (top 2 per group)
      </p>
    </div>
  );
}
