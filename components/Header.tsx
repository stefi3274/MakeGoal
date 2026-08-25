'use client';
import { useEffect, useState } from 'react';
import { useAuth } from '../lib/auth';
import { getSport, setSport, SPORT_COULEURS, SPORT_LABEL, Sport } from '../lib/sport';

const VIOLET = '#bf00ff';
const LOGO_URL = 'https://giflxfycfqanyfaeoedz.supabase.co/storage/v1/object/public/images/logo%20makegoal.jpg';

export default function Header() {
  const { user, loading } = useAuth();
  const [sport, setSportLocal] = useState<Sport>('football');

  useEffect(() => { setSportLocal(getSport()); }, []);

  const couleur = SPORT_COULEURS[sport].primaire;

  return (
    <header style={{background:'#ffffff',borderBottom:'3px solid ' + VIOLET,padding:'12px 24px',position:'sticky',top:0,zIndex:10}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:'10px'}}>
        <a href="/" style={{textDecoration:'none',display:'flex',alignItems:'center',gap:'10px'}}>
          <img src={LOGO_URL} alt="MakeGoal" style={{height:'40px',borderRadius:'6px'}}/>
          <div>
            <h1 style={{color:VIOLET,fontWeight:900,fontSize:'20px',margin:0}}>MakeGoal</h1>
            <p style={{color:'#9ca3af',fontSize:'11px',margin:0}}>N ap enfòme w</p>
          </div>
        </a>

        <div style={{display:'flex',gap:'6px',background:'#f3f4f6',borderRadius:'999px',padding:'4px'}}>
          {(['football','basketball'] as Sport[]).map(s => (
            <button key={s} onClick={() => sport !== s && setSport(s)} style={{
              border:'none', cursor:'pointer', padding:'6px 14px', borderRadius:'999px',
              fontWeight:800, fontSize:'12.5px',
              background: sport===s ? SPORT_COULEURS[s].primaire : 'transparent',
              color: sport===s ? '#fff' : '#6b7280'
            }}>{SPORT_LABEL[s].emoji} {SPORT_LABEL[s].nom}</button>
          ))}
        </div>

        <div style={{display:'flex',gap:'12px',alignItems:'center',fontSize:'13px',fontWeight:600}}>
          <a href="/" style={{color:'#6b7280',textDecoration:'none'}}>Accueil</a>
          <a href="/matchs" style={{color:'#6b7280',textDecoration:'none'}}>Matchs</a>
          <a href="/about" style={{color:'#6b7280',textDecoration:'none'}}>À propos</a>
          {!loading && (
            user ? (
              <a href="/profil" style={{background:couleur,color:'#fff',textDecoration:'none',padding:'6px 16px',borderRadius:'999px',fontWeight:700}}>👤 Profil</a>
            ) : (
              <a href="/compte" style={{background:couleur,color:'#fff',textDecoration:'none',padding:'6px 16px',borderRadius:'999px',fontWeight:700}}>Connexion</a>
            )
          )}
        </div>
      </div>
    </header>
  );
}
