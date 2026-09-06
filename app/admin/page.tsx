'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import AdminAuth from '../../components/AdminAuth';

const VIOLET = '#bf00ff';
const VIOLET_DEEP = '#7c1fd9';

export default function AdminHub() {
  const [connecte, setConnecte] = useState(false);
  const [survole, setSurvole] = useState<number | null>(null);
  const [heure, setHeure] = useState(new Date());

  useEffect(() => { const t = setInterval(() => setHeure(new Date()), 60000); return () => clearInterval(t); }, []);

  const seDeconnecter = async () => { await supabase.auth.signOut(); setConnecte(false); };

  const salutation = () => {
    const h = heure.getHours();
    if (h < 12) return 'Bonjour';
    if (h < 18) return 'Bon après-midi';
    return 'Bonsoir';
  };

  const dateFormatee = heure.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

  if (!connecte) {
    return <AdminAuth titre="MakeGoal Admin" onAuthentifie={() => setConnecte(true)} />;
  }

  const tuiles = [
    { titre: 'Tableau de bord', desc: 'Vos chiffres clés en un coup d\u2019œil', emoji: '📊', href: '/admin/dashboard', couleur: '#7c3aed', couleur2: '#a855f7' },
    { titre: 'Matchs', desc: 'Programme et vote communautaire 1X2', emoji: '⚽', href: '/admin/matchs', couleur: '#10b981', couleur2: '#34d399' },
    { titre: 'Concours', desc: 'Concours multi-matchs, lots et tirages', emoji: '🏆', href: '/admin/concours', couleur: '#f59e0b', couleur2: '#fbbf24' },
    { titre: 'Articles & Média', desc: 'Posts, résultats, stats joueurs', emoji: '📰', href: '/admin/media', couleur: '#3b82f6', couleur2: '#60a5fa' },
    { titre: 'À propos', desc: 'Votre photo et votre présentation', emoji: '👤', href: '/admin/apropos', couleur: '#ec4899', couleur2: '#f472b6' },
  ];

  return (
    <div style={{minHeight:'100vh',background:'#08080b',fontFamily:'sans-serif',position:'relative',overflow:'hidden'}}>
      <div style={{position:'absolute',top:'-200px',left:'50%',transform:'translateX(-50%)',width:'900px',height:'500px',background:'radial-gradient(ellipse, rgba(191,0,255,0.22), transparent 70%)',pointerEvents:'none'}}/>

      <header style={{position:'relative',background:'rgba(10,10,13,0.85)',backdropFilter:'blur(16px)',padding:'18px 28px',display:'flex',justifyContent:'space-between',alignItems:'center',borderBottom:'1px solid rgba(255,255,255,0.06)'}}>
        <div style={{display:'flex',alignItems:'center',gap:'12px'}}>
          <div style={{width:'38px',height:'38px',borderRadius:'11px',background:'linear-gradient(135deg,'+VIOLET+','+VIOLET_DEEP+')',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'19px',boxShadow:'0 6px 16px rgba(191,0,255,0.4)'}}>🏆</div>
          <h1 style={{color:'#fff',fontWeight:900,fontSize:'19px',margin:0,letterSpacing:'-0.01em'}}>MakeGoal <span style={{color:VIOLET}}>Admin</span></h1>
        </div>
        <button onClick={seDeconnecter} style={{background:'rgba(239,68,68,0.12)',color:'#ff6b6b',border:'1px solid rgba(239,68,68,0.25)',padding:'10px 20px',borderRadius:'999px',cursor:'pointer',fontWeight:700,fontSize:'13px'}}>Déconnexion</button>
      </header>

      <main style={{position:'relative',maxWidth:'1080px',margin:'0 auto',padding:'56px 28px 80px'}}>
        <p style={{color:VIOLET,fontSize:'13px',fontWeight:800,textTransform:'uppercase',letterSpacing:'1.5px',margin:'0 0 10px'}}>{dateFormatee}</p>
        <h2 style={{color:'#fff',fontWeight:900,fontSize:'40px',margin:'0 0 12px',letterSpacing:'-0.03em',lineHeight:1.1}}>{salutation()} 👋</h2>
        <p style={{color:'#9a9aa3',fontSize:'17px',marginBottom:'48px'}}>Que voulez-vous gérer aujourd'hui ?</p>

        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(320px,1fr))',gap:'24px'}}>
          {tuiles.map((t, i) => {
            const actif = survole === i;
            return (
              <a key={t.href} href={t.href} style={{textDecoration:'none'}} onMouseEnter={() => setSurvole(i)} onMouseLeave={() => setSurvole(null)}>
                <div style={{
                  position:'relative', overflow:'hidden',
                  background: actif ? 'rgba(26,26,31,0.95)' : 'rgba(20,20,24,0.75)',
                  border: '1px solid ' + (actif ? t.couleur + '55' : 'rgba(255,255,255,0.07)'),
                  borderRadius:'26px',
                  padding:'40px 32px',
                  cursor:'pointer',
                  transition:'all 0.25s cubic-bezier(0.16,1,0.3,1)',
                  transform: actif ? 'translateY(-6px)' : 'translateY(0)',
                  boxShadow: actif ? '0 20px 45px -12px ' + t.couleur + '4d' : '0 4px 16px rgba(0,0,0,0.2)',
                  minHeight:'200px', display:'flex', flexDirection:'column'
                }}>
                  <div style={{position:'absolute',top:'-40px',right:'-40px',width:'140px',height:'140px',borderRadius:'50%',background:'radial-gradient(circle, '+t.couleur+'33, transparent 70%)',opacity:actif?1:0.5,transition:'opacity 0.25s'}}/>
                  <div style={{
                    width:'64px',height:'64px',borderRadius:'18px',
                    background:'linear-gradient(135deg,'+t.couleur+','+t.couleur2+')',
                    display:'flex',alignItems:'center',justifyContent:'center',
                    fontSize:'30px',marginBottom:'22px',
                    boxShadow:'0 10px 24px -6px '+t.couleur+'80',
                    position:'relative'
                  }}>{t.emoji}</div>
                  <h3 style={{color:'#fff',fontWeight:900,fontSize:'22px',margin:'0 0 8px',letterSpacing:'-0.01em',position:'relative'}}>{t.titre}</h3>
                  <p style={{color:'#9a9aa3',fontSize:'14.5px',margin:0,lineHeight:1.5,position:'relative',flex:1}}>{t.desc}</p>
                  <div style={{display:'flex',alignItems:'center',gap:'8px',marginTop:'22px',position:'relative'}}>
                    <span style={{color:t.couleur,fontSize:'14px',fontWeight:800}}>Ouvrir</span>
                    <span style={{color:t.couleur,fontSize:'16px',transform: actif ? 'translateX(4px)' : 'translateX(0)',transition:'transform 0.25s',display:'inline-block'}}>→</span>
                  </div>
                </div>
              </a>
            );
          })}
        </div>
      </main>
    </div>
  );
}
