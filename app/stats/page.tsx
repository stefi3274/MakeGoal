'use client';
import { useEffect, useState } from 'react';
import Header from '../../components/Header';
import Footer from '../../components/Footer';

type Match = {
  id: string;
  homeTeam: string;
  awayTeam: string;
  date: string;
};

const VIOLET = '#bf00ff';

const SPORTS = [
  { key: 'soccer_uefa_champs_league', label: 'Champions League' },
  { key: 'soccer_fifa_world_cup', label: 'Coupe du Monde' },
  { key: 'soccer_france_ligue_one', label: 'Ligue 1' },
];

export default function Agenda() {
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
    hour: '2-digit', minute: '2-digit', timeZone: 'America/Port-au-Prince'
  });

  return (
    <div style={{minHeight:'100vh',background:'#ffffff',color:'#111111',fontFamily:'sans-serif'}}>
      <Header />
      <main style={{maxWidth:'960px',margin:'0 auto',padding:'48px 24px'}}>
        <h1 style={{color:VIOLET,fontWeight:900,fontSize:'36px',marginBottom:'8px'}}>
          📅 Agenda des matchs
        </h1>
        <p style={{color:'#6b7280',fontSize:'16px',marginBottom:'32px'}}>
          Les prochaines affiches à ne pas manquer.
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

        {loading && <p style={{color:'#9ca3af'}}>Chargement de l'agenda…</p>}
        {error && <p style={{color:'#ef4444'}}>{error}</p>}
        {!loading && matches.length === 0 && !error && (
          <div style={{background:'#f9fafb',padding:'32px',borderRadius:'16px',textAlign:'center'}}>
            <p style={{color:'#6b7280',margin:0}}>Aucun match à venir pour cette compétition.</p>
          </div>
        )}

        {!loading && matches.map(match => (
          <div key={match.id} style={{border:'1px solid #e5e7eb',borderRadius:'16px',padding:'24px',marginBottom:'16px',boxShadow:'0 2px 8px rgba(0,0,0,0.04)'}}>
            <p style={{fontSize:'12px',color:'#9ca3af',margin:0,marginBottom:'12px',textTransform:'uppercase',letterSpacing:'1px'}}>
              {formatDate(match.date)}
            </p>
            <div style={{display:'flex',justifyContent:'center',alignItems:'center',gap:'16px',flexWrap:'wrap'}}>
              <h2 style={{fontWeight:900,fontSize:'20px',margin:0,flex:1,textAlign:'right'}}>{match.homeTeam}</h2>
              <span style={{color:VIOLET,fontWeight:900,fontSize:'16px',padding:'0 8px'}}>VS</span>
              <h2 style={{fontWeight:900,fontSize:'20px',margin:0,flex:1,textAlign:'left'}}>{match.awayTeam}</h2>
            </div>
          </div>
        ))}

        <div style={{marginTop:'32px',textAlign:'center'}}>
          <a href="/matchs" style={{display:'inline-block',background:VIOLET,color:'#fff',padding:'14px 32px',borderRadius:'999px',fontWeight:700,fontSize:'15px',textDecoration:'none'}}>
            ⚽ Voter sur les matchs →
          </a>
        </div>
      </main>
      <Footer />
    </div>
  );
}
