'use client';
import { useEffect, useState } from 'react';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
type Odds = {
  home: number | null;
  draw: number | null;
  away: number | null;
  over25: number | null;
  under25: number | null;
};

type Match = {
  id: string;
  homeTeam: string;
  awayTeam: string;
  date: string;
  bookmaker: string;
  odds: Odds;
};

const VIOLET = '#bf00ff';

const SPORTS = [
  { key: 'soccer_uefa_champs_league', label: 'Champions League' },
  { key: 'soccer_fifa_world_cup', label: 'FIFA World Cup 2026' },
  { key: 'soccer_france_ligue_one', label: 'Ligue 1' },
];

export default function Stats() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [sport, setSport] = useState('soccer_uefa_champs_league');
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    setError('');
    fetch('/api/odds?sport=' + sport)
      .then(res => res.json())
      .then(data => {
        setMatches(data.matches || []);
        setLoading(false);
      })
      .catch(() => {
        setError('Erreur de chargement.');
        setLoading(false);
      });
  }, [sport]);

  const formatDate = (d: string) => new Date(d).toLocaleString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long',
    hour: '2-digit', minute: '2-digit'
  });

  const coteColor = (cote: number | null) => {
    if (!cote) return '#9ca3af';
    if (cote < 2) return '#10b981';
    if (cote < 3) return '#f59e0b';
    return '#ef4444';
  };

  return (
    <div style={{minHeight:'100vh',background:'#ffffff',color:'#111111',fontFamily:'sans-serif'}}>
      <Header />
      <main style={{maxWidth:'960px',margin:'0 auto',padding:'48px 24px'}}>
        <h1 style={{color:VIOLET,fontWeight:900,fontSize:'36px',marginBottom:'8px'}}>
          Stats & Cotes
        </h1>
        <p style={{color:'#6b7280',fontSize:'16px',marginBottom:'32px'}}>
          Cotes en temps réel pour construire vos pronostics. Source : bookmakers européens.
        </p>
        <div style={{display:'flex',gap:'8px',marginBottom:'32px',flexWrap:'wrap'}}>
          {SPORTS.map(s => (
            <button key={s.key} onClick={() => setSport(s.key)} style={{
              padding:'10px 20px', borderRadius:'999px',
              border:'2px solid ' + VIOLET,
              background: sport === s.key ? VIOLET : '#ffffff',
              color: sport === s.key ? '#ffffff' : VIOLET,
              fontWeight:700, fontSize:'14px', cursor:'pointer'
            }}>
              {s.label}
            </button>
          ))}
        </div>
        {loading && <p style={{color:'#9ca3af'}}>Chargement des cotes…</p>}
        {error && <p style={{color:'#ef4444'}}>{error}</p>}
        {!loading && matches.length === 0 && !error && (
          <div style={{background:'#f9fafb',padding:'32px',borderRadius:'16px',textAlign:'center'}}>
            <p style={{color:'#6b7280',margin:0}}>Aucun match disponible pour le moment.</p>
          </div>
        )}{!loading && matches.map(match => (
          <div key={match.id} style={{border:'1px solid #e5e7eb',borderRadius:'16px',padding:'24px',marginBottom:'16px'}}>
            <p style={{fontSize:'12px',color:'#9ca3af',margin:0,marginBottom:'4px',textTransform:'uppercase'}}>
              {formatDate(match.date)} — via {match.bookmaker}
            </p>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'16px',flexWrap:'wrap',gap:'8px'}}>
              <h2 style={{fontWeight:900,fontSize:'20px',margin:0}}>{match.homeTeam}</h2>
              <span style={{color:VIOLET,fontWeight:900,fontSize:'16px'}}>VS</span>
              <h2 style={{fontWeight:900,fontSize:'20px',margin:0}}>{match.awayTeam}</h2>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit, minmax(120px, 1fr))',gap:'8px'}}>
              {[
                { label: '1 ' + match.homeTeam.split(' ')[0], value: match.odds.home },
                { label: 'Nul', value: match.odds.draw },
                { label: '2 ' + match.awayTeam.split(' ')[0], value: match.odds.away },
                { label: 'Over 2.5', value: match.odds.over25 },
                { label: 'Under 2.5', value: match.odds.under25 },
              ].map(item => item.value && (
                <div key={item.label} style={{background:'#f9fafb',borderRadius:'12px',padding:'12px',textAlign:'center',border:'1px solid #e5e7eb'}}>
                  <p style={{fontSize:'12px',color:'#6b7280',margin:0,marginBottom:'4px'}}>{item.label}</p>
                  <p style={{fontSize:'20px',fontWeight:900,margin:0,color:coteColor(item.value)}}>
                    {item.value.toFixed(2)}
                  </p>
                </div>
              ))}
            </div>
            <div style={{marginTop:'12px',textAlign:'right'}}>
              <a href="/pronostics" style={{display:'inline-block',background:VIOLET,color:'#ffffff',padding:'8px 20px',borderRadius:'999px',fontSize:'13px',fontWeight:700,textDecoration:'none'}}>
                Voir nos pronostics →
              </a>
            </div>
          </div>
        ))}
        <div style={{marginTop:'32px',padding:'20px',background:'#fef2f2',borderRadius:'12px',borderLeft:'4px solid #dc2626'}}>
          <p style={{fontSize:'13px',color:'#374151',margin:0,lineHeight:'1.6'}}>
            <strong>Rappel :</strong> Les cotes sont indicatives et varient selon les bookmakers. Réservé aux personnes majeures (18+). <a href="/jeu-responsable" style={{color:VIOLET}}>Jeu responsable</a>.
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
}