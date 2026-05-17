export default function Home() {
  return (
    <div className="min-h-screen bg-white text-black font-sans">

      {/* HEADER */}
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

      {/* HERO */}
      <section className="bg-green-600 text-white text-center py-16 px-4">
        <p className="text-sm uppercase tracking-widest text-green-200 mb-2">Plateforme de pronostics</p>
        <h2 className="text-5xl font-black mb-4">Jouez<br/>intelligemment.</h2>
        <p className="text-green-100 max-w-sm mx-auto mb-8">
          Stats en temps réel, analyses avant match, pronostics des experts.
        </p>
        <button className="bg-white text-green-600 font-black px-10 py-3 rounded-full shadow-lg hover:scale-105 transition-transform">
          Voir les matchs →
        </button>
      </section>

      {/* STATS RAPIDES */}
      <section className="grid grid-cols-3 bg-gray-900 text-white text-center py-4">
        <div>
          <p className="text-2xl font-black text-green-400">12</p>
          <p className="text-xs text-gray-400">Matchs live</p>
        </div>
        <div className="border-x border-gray-700">
          <p className="text-2xl font-black text-green-400">87%</p>
          <p className="text-xs text-gray-400">Précision</p>
        </div>
        <div>
          <p className="text-2xl font-black text-green-400">5K+</p>
          <p className="text-xs text-gray-400">Utilisateurs</p>
        </div>
      </section>

      {/* MATCHS EN DIRECT */}
      <section className="px-4 py-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-black">⚽ En direct</h3>
          <span className="text-xs text-red-500 font-bold animate-pulse">● LIVE</span>
        </div>
        <div className="flex flex-col gap-3">

          {/* Carte match */}
          <div className="border border-gray-200 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow">
            <p className="text-xs text-gray-400 mb-2">Champions League · 67'</p>
            <div className="flex items-center justify-between">
              <div className="text-center w-1/3">
                <p className="text-2xl">🇫🇷</p>
                <p className="font-bold text-sm">PSG</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-black text-green-600">2 - 1</p>
                <span className="text-xs bg-red-500 text-white px-2 py-0.5 rounded-full">LIVE</span>
              </div>
              <div className="text-center w-1/3">
                <p className="text-2xl">🇪🇸</p>
                <p className="font-bold text-sm">Real Madrid</p>
              </div>
            </div>
          </div>

        </div>
      </section>

    </div>
  );
}