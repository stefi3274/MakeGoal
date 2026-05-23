'use client';
import { useEffect, useState } from 'react';

type Match = {
  idEvent: string;
  dateEvent: string;
  strHomeTeam: string;
  strAwayTeam: string;
};

export default function Home() {
  const [matches, setMatches] = useState<Match[]>([]);

  useEffect(() => {
    fetch('/api/ligue1')
      .then(res => res.json())
      .then(data => {
        if (data.events) setMatches(data.events.slice(0, 5));
      });
  }, []);

  return (
    <div style={{minHeight:'100vh',background:'#ffffff',color:'#111111',fontFamily:'sans-serif'}}>
      <header style={{background:'#ffffff',borderBottom:'3px solid #5B21B6',padding:'12px 24px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <div>
          <h1 style={{color:'#5B21B6',fontWeight:'900',fontSize:'20px',margin:0}}>MakeGoal</h1>
          <p style={{color:'#9ca3af',fontSize:'11px',margin:0}}>Jouez intelligemment !</p>
        </div>
        <nav style={{display:'flex',gap:'16px',fontSize:'14px',fontWeight:'600'}}>
          <a href="#" style={{color:'#5B21B6'}}>Matchs</a>
          <a href="#" style={{color:'#6b7280'}}>Pronostics</a>
          <a href="#" style={{color:'#6b7280'}}>Stats</a>
        </nav>
      </header>
      <section style={{background:'#5B21B6',color:'#ffffff',textAlign:'center',padding:'64px 16px'}}>
        <h2 style={{fontSize:'40px',fontWeight:'900',marginBottom:'16px'}}>Jouez intelligemment.</h2>
        <button style={{background:'#ffffff',color:'#5B21B6',fontWeight:'900',padding:'12px 40px',borderRadius:'999px',border:'none',cursor:'pointer'}}>Voir les matchs</button>
      </section>
      <section style={{padding:'32px 16px'}}>
        <h3 style={{fontWeight:'900',marginBottom:'16px'}}>Ligue 1 — Prochains matchs</h3>
        {matches.map((match) => (
          <div key={match.idEvent} style={{border:'1px solid #e5e7eb',borderRadius:'16px',padding:'16px',marginBottom:'12px'}}>
            <p style={{color:'#9ca3af',fontSize:'12px',marginBottom:'8px'}}>{match.dateEvent}</p>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <p style={{fontWeight:'700'}}>{match.strHomeTeam}</p>
              <p style={{color:'#5B21B6',fontWeight:'900'}}>VS</p>
              <p style={{fontWeight:'700'}}>{match.strAwayTeam}</p>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}