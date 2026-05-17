export default function Home() {
  return (
    <div className="min-h-screen bg-black text-white">
      
      {/* HEADER */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-green-500">
        <div>
          <h1 className="text-2xl font-bold text-green-400">MakeGoal</h1>
          <p className="text-xs text-gray-400">Jouez intelligemment !</p>
        </div>
        <nav className="flex gap-4 text-sm">
          <a href="#" className="hover:text-green-400">Matchs</a>
          <a href="#" className="hover:text-green-400">Pronostics</a>
          <a href="#" className="hover:text-green-400">Stats</a>
        </nav>
      </header>

      {/* HERO */}
      <section className="flex flex-col items-center justify-center text-center py-20 px-4">
        <h2 className="text-4xl font-bold text-green-400 mb-4">
          Les meilleurs pronostics football
        </h2>
        <p className="text-gray-300 max-w-md">
          Stats en temps réel, analyses avant match, pronostics des experts.
        </p>
        <button className="mt-8 bg-green-500 text-black font-bold px-8 py-3 rounded-full hover:bg-green-400">
          Voir les matchs
        </button>
      </section>

    </div>
  );
}