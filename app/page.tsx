'use client';
import { useEffect, useState } from 'react';

export default function Home() {
  const [matches, setMatches] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/ligue1')
      .then(res => res.json())
      .then(data => {
        if (data.events) setMatches(data.events.slice(0, 5));
      });
  }, []);

  return (
    <div className="min-h-screen bg-white text-black font-sans">
      <header className="sticky top-0 z-50 bg-white border-b-2 border-green-500 shadow-sm px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-3xl">⚽</span>
          <div>
            <h1 className="text-xl font-black text-green-600 leading-none">MakeGoal</h1>
            <p className="text-xs text-gray-400 leading-none">Jouez intelligemment !</p>
          </div>
        </div>
        <nav className="flex gap-6 text-sm font-semibold">
          <a href="#" className="text-green-600 border-b-2 border-green-500">Matchs</a>
          <a href="#" className="text-gray-500 hover:text-green-600">Pronostics</a>
          <a href="#" className="text-gray-500 hover:text-green-600">Stats</a>
        </nav>
      </header>
      <section className="bg-green-600 text-white text-center py-16 px-4">
        <h2 className="text-5xl font-black mb-4">Jouez<br/>intelligemment.</h2>
        <button className="bg-white text-green-600 font-black px-10 py-3 rounded-full shadow-lg">
          Voir les matchs
        </button>
      </section>
      <section className="px-4 py-8">
        <h3 className="text-lg font-black mb-4">Ligue 1 — Prochains matchs</h3>
        <div className="flex flex-col gap-3">
          {matches.map((match) => (
            <div key={match.idEvent} className="border border-gray-200 rounded-2xl p-4">
              <p className="text-xs text-gray-400 mb-2">{match.dateEvent}</p>
              <div className="flex items-center justify-between">
                <p className="font-bold">{match.strHomeTeam}</p>
                <p className="text-green-600 font-black">VS</p>
                <p className="font-bold">{match.strAwayTeam}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
