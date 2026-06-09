'use client';

import { useState, useEffect } from 'react';
import type { TournamentBet } from '@/types';
import { getTournamentWinnerPoints, WINNER_POINTS } from '@/lib/scoring';
import { getFlag } from '@/lib/flags';

const TOURNAMENT_DEADLINE = new Date('2026-06-11T13:00:00Z');

// Teams sorted by winner points ascending (favorites first)
const WINNER_TEAMS = (Object.entries(WINNER_POINTS) as [string, number][])
  .sort((a, b) => a[1] - b[1] || a[0].localeCompare(b[0]))
  .map(([team, pts]) => ({ team, pts }));

type PlayerGroup = { country: string; players: string[] };

const TOP_SCORER_PLAYERS: PlayerGroup[] = [
  { country: 'Spain', players: ['Lamine Yamal', 'Nico Williams', 'Ferran Torres', 'Pedri', 'Mikel Merino', 'Dani Olmo', 'Mikel Oyarzabal'] },
  { country: 'France', players: ['Kylian Mbappé', 'Ousmane Dembélé', 'Michael Olise', 'Désiré Doué', 'Bradley Barcola', 'Marcus Thuram', 'Jean-Philippe Mateta'] },
  { country: 'England', players: ['Harry Kane', 'Ollie Watkins', 'Bukayo Saka', 'Jude Bellingham', 'Morgan Rogers', 'Marcus Rashford', 'Anthony Gordon', 'Declan Rice', 'Eberechi Eze'] },
  { country: 'Argentina', players: ['Lionel Messi', 'Julián Álvarez', 'Enzo Fernández', 'Lautaro Martínez', 'Thiago Almada', 'Giuliano Simeone', 'Nico Paz'] },
  { country: 'Brazil', players: ['Luiz Henrique', 'Raphinha', 'Neymar', 'Vinícius Júnior', 'Igor Thiago', 'Endrick', 'Casemiro', 'Matheus Cunha'] },
  { country: 'Portugal', players: ['Gonçalo Ramos', 'João Félix', 'Cristiano Ronaldo', 'Pedro Neto', 'Francisco Conceição', 'Bruno Fernandes', 'Rafael Leão'] },
  { country: 'Germany', players: ['Kai Havertz', 'Nick Woltemade', 'Deniz Undav', 'Jamal Musiala', 'Florian Wirtz', 'Leroy Sané', 'Maximilian Beier'] },
  { country: 'Netherlands', players: ['Brian Brobbey', 'Memphis Depay', 'Wout Weghorst', 'Donyell Malen', 'Cody Gakpo', 'Tijjani Reijnders'] },
  { country: 'Belgium', players: ['Romelu Lukaku', 'Kevin De Bruyne', 'Jeremy Doku', 'Leandro Trossard', 'Charles De Ketelaere'] },
  { country: 'Norway', players: ['Erling Haaland', 'Alexander Sørloth', 'Martin Ødegaard', 'Antonio Nusa', 'Jørgen Strand Larsen'] },
  { country: 'Croatia', players: ['Luka Modrić', 'Andrej Kramarić', 'Ante Budimir', 'Mario Pašalić', 'Ivan Perišić'] },
  { country: 'Japan', players: ['Ayase Ueda', 'Daizen Maeda', 'Koki Ogawa', 'Ritsu Doan', 'Takefusa Kubo', 'Daichi Kamada'] },
  { country: 'Morocco', players: ['Brahim Díaz', 'Ayoub El Kaabi', 'Achraf Hakimi', 'Youssef En-Nesyri', 'Ismail Saibari'] },
  { country: 'Uruguay', players: ['Fede Valverde', 'Darwin Núñez', 'Giorgian de Arrascaeta', 'Rodrigo Aguirre', 'Nicolás de la Cruz'] },
  { country: 'Colombia', players: ['Luis Díaz', 'Luis Suárez', 'James Rodríguez', 'John Córdoba', 'Jhon Durán'] },
  { country: 'Mexico', players: ['Raúl Jiménez', 'Santiago Giménez', 'Alexis Vega', 'Julián Quiñones', 'Jayden Adams'] },
  { country: 'Switzerland', players: ['Breel Embolo', 'Noah Okafor', 'Ruben Vargas', 'Granit Xhaka', 'Dan Ndoye'] },
  { country: 'United States', players: ['Christian Pulisic', 'Folarin Balogun', 'Brenden Aaronson', 'Ricardo Pepi', 'Weston McKennie'] },
  { country: 'Austria', players: ['Michael Gregoritsch', 'Marko Arnautović', 'Christoph Baumgartner', 'Marcel Sabitzer', 'Sasa Kalajdzic'] },
  { country: 'Ecuador', players: ['Enner Valencia', 'Moisés Caicedo', 'Gonzalo Plata', 'Jordy Caicedo', 'Kevin Rodríguez'] },
  { country: 'Senegal', players: ['Sadio Mané', 'Nicolas Jackson', 'Iliman Ndiaye', 'Ismaïla Sarr', 'Pape Gueye'] },
  { country: 'Sweden', players: ['Viktor Gyökeres', 'Alexander Isak', 'Anthony Elanga', 'Benjamin Nygren'] },
  { country: 'Turkey', players: ['Hakan Çalhanoğlu', 'Arda Güler', 'Kenan Yıldız', 'Orkun Kökçü', 'Kerem Aktürkoğlu', 'Barış Alper Yılmaz'] },
  { country: 'Czechia', players: ['Patrik Schick', 'Václav Černý', 'Adam Hložek', 'Tomáš Souček', 'Pavel Šulc'] },
  { country: 'Scotland', players: ['Lawrence Shankland', 'Lyndon Dykes', 'Che Adams', 'Scott McTominay', 'John McGinn'] },
  { country: 'South Korea', players: ['Son Heung-min', 'Cho Gue-sung', 'Lee Kang-in', 'Hwang Hee-chan', 'Lee Jae-sung', 'Oh Hyeon-gyu'] },
  { country: 'Algeria', players: ['Riyad Mahrez', 'Baghdad Bounedjah', 'Amine Gouiri', 'Mohamed Amoura', 'Houssam Aouar'] },
  { country: 'Australia', players: ['Jackson Irvine', 'Mitch Duke', 'Craig Goodwin', 'Martin Boyle', 'Kusini Yengi'] },
  { country: 'Canada', players: ['Jonathan David', 'Cyle Larin', 'Tajon Buchanan', 'Tani Oluwaseyi'] },
  { country: 'Egypt', players: ['Mohamed Salah', 'Trezeguet', 'Omar Marmoush'] },
  { country: 'Ivory Coast', players: ['Franck Kessié', 'Nicolas Pépé', 'Yann Dioumandé', 'Amad Diallo', 'Anges-Yoan Bonny'] },
  { country: 'Paraguay', players: ['Julio Enciso', 'Antonio Sanabria', 'Miguel Almirón', 'Ángel Romero'] },
  { country: 'Bosnia-Herzegovina', players: ['Edin Džeko', 'Ermedin Demirović', 'Asmir Biriktarević', 'Benjamin Tahirović'] },
  { country: 'Iran', players: ['Mehdi Taremi', 'Mehdi Ghayedi', 'Alireza Jahanbakhsh', 'Mohammad Mohebi'] },
  { country: 'Congo DR', players: ['Cédric Bakambu', 'Yoane Wissa', 'Meschack Elia', 'Theo Bongonda'] },
  { country: 'Ghana', players: ['Thomas Partey', 'Antoine Semenyo', 'Iñaki Williams', 'Mohammed Kudus', 'Jordan Ayew'] },
  { country: 'Qatar', players: ['Hassan Al Haydos', 'Akram Afif', 'Almoez Ali', 'Ahmed Al-Rawi'] },
  { country: 'Saudi Arabia', players: ['Salem Al Dawsari', 'Firas Al-Buraikan', 'Saleh Al-Shehri', 'Abdullah Al-Hamdan'] },
  { country: 'South Africa', players: ['Lyle Foster', 'Oswin Appollis', 'Evidence Makgopa'] },
  { country: 'Tunisia', players: ['Elias Achouri', 'Hannibal Mejbri', 'Elias Skhiri', 'Mohamed Ali Ben Romdhane'] },
  { country: 'Cape Verde Islands', players: ['Ryan Mendes', 'Garry Rodrigues', 'Dillon Liberato', 'Hélio Varela'] },
  { country: 'Iraq', players: ['Mohammed Ali', 'Ayman Hussein', 'Ibrahim Bayesh', 'Ali Al-Hamadi'] },
  { country: 'New Zealand', players: ['Chris Wood', 'Costa Barbarouses', 'Elijah Just', 'Tyler Bindon'] },
  { country: 'Panama', players: ['Cristian Martínez', 'Ismael Díaz', 'José Fajardo', 'José Luis Rodríguez'] },
  { country: 'Uzbekistan', players: ['Eldor Shomurodov', 'Igor Sergeev', 'Abbosbek Fayzullayev', 'Otabek Shukurov'] },
  { country: 'Curaçao', players: ['Kenji Gorré', 'Leandro Bacuna', 'Jervain Castaner', 'Rangelo Janga'] },
  { country: 'Haiti', players: ['Frantzdy Pierrot', 'Wilson Isidor', 'Duckens Nazon'] },
  { country: 'Jordan', players: ['Ali Olwan', 'Musa Al-Tamari', 'Yazan Al-Naimat'] },
];

// Keep groups sorted by country points ascending (same order as WINNER_TEAMS)
const COUNTRY_ORDER = WINNER_TEAMS.map((t) => t.team);
const TOP_SCORER_SORTED = TOP_SCORER_PLAYERS.slice().sort(
  (a, b) => COUNTRY_ORDER.indexOf(a.country) - COUNTRY_ORDER.indexOf(b.country),
);

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
            <span>King of goals (top scorer)</span>
            <span className="font-bold text-amber-700">20 pts</span>
          </div>
          <div className="flex justify-between">
            <span>Tournament winner — favorites (Spain/France)</span>
            <span className="font-bold text-amber-700">30 pts</span>
          </div>
          <div className="flex justify-between">
            <span>Tournament winner — underdogs (up to)</span>
            <span className="font-bold text-amber-700">500 pts</span>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Top scorer */}
        <div className="card space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-bold">King of Goals</h2>
            <span className="badge bg-amber-100 text-amber-700 font-bold">20 pts</span>
          </div>
          <p className="text-sm text-gray-500">
            Who will score the most goals in the entire tournament?
          </p>
          <select
            value={topScorer}
            onChange={(e) => setTopScorer(e.target.value)}
            className="input"
            disabled={!isOpen}
            required
          >
            <option value="">Select a player...</option>
            {TOP_SCORER_SORTED.map(({ country, players }) => (
              <optgroup key={country} label={`${getFlag(country)} ${country}`}>
                {players.map((player) => (
                  <option key={player} value={player}>{player}</option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>

        {/* Tournament winner */}
        <div className="card space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-bold">Tournament Winner</h2>
            <span className="badge bg-amber-100 text-amber-700 font-bold">
              {winnerPts ? `${winnerPts} pts` : '30–500 pts'}
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
            {WINNER_TEAMS.map(({ team, pts }) => (
              <option key={team} value={team}>
                {getFlag(team)} {team} — {pts} pts
              </option>
            ))}
          </select>
          {winner && winnerPts && (
            <p className="text-sm text-green-600">
              If {getFlag(winner)} {winner} wins, you get <strong>{winnerPts} points</strong>
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
                Your bets: {existingBet.topScorer} · {getFlag(existingBet.winner)} {existingBet.winner}
              </p>
            )}
          </div>
        )}
      </form>
    </div>
  );
}
