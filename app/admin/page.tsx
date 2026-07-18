'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

const VIOLET = '#bf00ff';

export default function AdminHub() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [connecte, setConnecte] = useState(false);
  const [erreurAuth, setErreurAuth] = useState('');

  useEffect(() => { supabase.auth.getSession().then(({ data }) => { if (data.session) setConnecte(true); }); }, []);

  const seConnecter = async () => {
    setErreurAuth('');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setErreurAuth('Email ou mot de passe incorrect.'); else setConnecte(true);
  };

  const seDeconnecter = async () => { await supabase.auth.signOut(); setConnecte(false); };

  if (!connecte) {
    return (
      <div style={{minHeight:'100vh',background:'#111',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'sans-serif'}}>
        <div style={{background:'#1a1a1a',padding:'40px',borderRadius:'16px',width:'100%',maxWidth:'380px',border:'1px solid #333'}}>
          <h1 style={{color:VIOLET,fontWeight:900,fontSize:'24px',marginBottom:'8px',textAlign:'center'}}>MakeGoal Admin</h1>
          <p style={{color:'#6b7280',fontSize:'13px',textAlign:'center',marginBottom:'24px'}}>Accès réservé</p>
          {erreurAuth && <p style={{color:'#ef4444',fontSize:'13px',marginBottom:'12px',textAlign:'center'}}>{erreurAuth}</p>}
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" style={{width:'100%',padding:'12px',borderRadius:'8px',border:'1px solid #333',background:'#222',color:'#fff',fontSize:'14px',marginBottom:'12px',boxSizing:'border-box'}}/>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Mot de passe" style={{width:'100%',padding:'12px',borderRadius:'8px',border:'1px solid #333',background:'#222',color:'#fff',fontSize:'14px',marginBottom:'16px',boxSizing:'border-box'}} onKeyDown={e => e.key === 'Enter' && seConnecter()}/>
          <button onClick={seConnecter} style={{width:'100%',padding:'12px',background:VIOLET,color:'#fff',fontWeight:700,borderRadius:'8px',border:'none',cursor:'pointer',fontSize:'15px'}}>Se connecter</button>
        </div>
      </div>
    );
  }

  const tuiles = [
    { titre: 'Tableau de bord', desc: 'Vos chiffres clés', emoji: '📊', href: '/admin/dashboard', couleur: '#7c3aed' },
    { titre: 'Matchs', desc: 'Vote communautaire 1X2', emoji: '⚽', href: '/admin/matchs', couleur: '#10b981' },
    { titre: 'Concours', desc: 'Concours et tirages', emoji: '🏆', href: '/admin/concours', couleur: '#f59e0b' },
    { titre: 'Articles', desc: 'Média et revue de presse', emoji: '📰', href: '/admin/media', couleur: '#3b82f6' },
  ];

  return (
    <div style={{minHeight:'100vh',background:'#0f0f0f',fontFamily:'sans-serif'}}>
      <header style={{background:'#111',padding:'16px 24px',display:'flex',justifyContent:'space-between',alignItems:'center',borderBottom:'1px solid #222'}}>
        <h1 style={{color:VIOLET,fontWeight:900,fontSize:'20px',margin:0}}>🏆 MakeGoal Admin</h1>
        <button onClick={seDeconnecter} style={{background:'#ef4444',color:'#fff',border:'none',padding:'10px 18px',borderRadius:'999px',cursor:'pointer',fontWeight:700,fontSize:'14px'}}>Déconnexion</button>
      </header>

      <main style={{maxWidth:'800px',margin:'0 auto',padding:'48px 24px'}}>
        <h2 style={{color:'#fff',fontWeight:900,fontSize:'28px',marginBottom:'8px'}}>Bienvenue 👋</h2>
        <p style={{color:'#6b7280',fontSize:'15px',marginBottom:'40px'}}>Que voulez-vous gérer aujourd'hui ?</p>

        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(260px,1fr))',gap:'20px'}}>
          {tuiles.map(t => (
            <a key={t.href} href={t.href} style={{textDecoration:'none'}}>
              <div style={{
                background:'#1a1a1a', border:'1px solid #333', borderRadius:'20px',
                padding:'32px 24px', cursor:'pointer', transition:'transform 0.15s',
                borderTop:'4px solid '+t.couleur
              }}>
                <div style={{fontSize:'44px',marginBottom:'16px'}}>{t.emoji}</div>
                <h3 style={{color:'#fff',fontWeight:900,fontSize:'20px',margin:'0 0 6px'}}>{t.titre}</h3>
                <p style={{color:'#9ca3af',fontSize:'14px',margin:0}}>{t.desc}</p>
                <p style={{color:t.couleur,fontSize:'14px',fontWeight:700,margin:'16px 0 0'}}>Ouvrir →</p>
              </div>
            </a>
          ))}
        </div>
      </main>
    </div>
  );
}
