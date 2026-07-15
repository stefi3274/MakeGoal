'use client';
import { useAuth } from '../lib/auth';

const VIOLET = '#bf00ff';

export default function Header() {
  const { user, loading } = useAuth();

  return (
    <header style={{background:'#ffffff',borderBottom:'3px solid ' + VIOLET,padding:'12px 24px',display:'flex',alignItems:'center',justifyContent:'space-between',position:'sticky',top:0,zIndex:10}}>
      <a href="/" style={{textDecoration:'none'}}>
        <h1 style={{color:VIOLET,fontWeight:900,fontSize:'20px',margin:0}}>MakeGoal</h1>
        <p style={{color:'#9ca3af',fontSize:'11px',margin:0}}>Jouez intelligemment !</p>
      </a>
      <div style={{display:'flex',gap:'12px',alignItems:'center',fontSize:'13px',fontWeight:600}}>
        <span style={{color:VIOLET,fontWeight:900,fontSize:'11px',border:'1px solid ' + VIOLET,padding:'2px 8px',borderRadius:'999px'}}>18+</span>
        <a href="/" style={{color:'#6b7280',textDecoration:'none'}}>Accueil</a>
        <a href="/about" style={{color:'#6b7280',textDecoration:'none'}}>À propos</a>
        {!loading && (
          user ? (
            <a href="/profil" style={{
              background:VIOLET, color:'#fff', textDecoration:'none',
              padding:'6px 16px', borderRadius:'999px', fontWeight:700
            }}>
              👤 Mon profil
            </a>
          ) : (
            <a href="/compte" style={{
              background:VIOLET, color:'#fff', textDecoration:'none',
              padding:'6px 16px', borderRadius:'999px', fontWeight:700
            }}>
              Connexion
            </a>
          )
        )}
      </div>
    </header>
  );
}