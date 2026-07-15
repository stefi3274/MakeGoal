'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../lib/auth';
import { supabase } from '../lib/supabase';
import Header from '../components/Header';
import Footer from '../components/Footer';

const VIOLET = '#bf00ff';
const PETITE_FINALE_ID = 999;

type VoteStat = { '1': number; 'X': number; '2': number; total: number };

const pct = (n: number, total: number) => total > 0 ? Math.round((n / total) * 100) : 0;

export default function Home() {
  const router = useRouter();
  const { user } = useAuth();
  const [stats, setStats] = useState<VoteStat>({ '1': 0, 'X': 0, '2': 0, total: 0 });
  const [monVote, setMonVote] = useState('');
  const [email, setEmail] = useState('');
  const [newsletterMsg, setNewsletterMsg] = useState('');

  useEffect(() => {
    chargerStats();
  }, []);

  useEffect(() => {
    if (user) chargerMonVote();
  }, [user]);

  const chargerStats = async () => {
    const { data } = await supabase.from('votes_matchs').select('choix').eq('match_id', PETITE_FINALE_ID);
    if (data) {
      const s: VoteStat = { '1': 0, 'X': 0, '2': 0, total: 0 };
      data.forEach((v: { choix: string }) => {
        s[v.choix as '1' | 'X' | '2']++;
        s.total++;
      });
      setStats(s);
    }
  };

  const chargerMonVote = async () => {
    if (!user) return;
    const { data } = await supabase.from('votes_matchs').select('choix').eq('user_id', user.id).eq('match_id', PETITE_FINALE_ID).single();
    if (data) setMonVote(data.choix);
  };

  const voter = async (choix: '1' | 'X' | '2') => {
    if (!user) { router.push('/compte'); return; }
    await supabase.from('votes_matchs').upsert(
      { user_id: user.id, match_id: PETITE_FINALE_ID, choix },
      { onConflict: 'user_id,match_id' }
    );
    setMonVote(choix);
    chargerStats();
  };

  const inscrireNewsletter = async () => {
    if (!email) return;
    await fetch('/api/newsletter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    setNewsletterMsg('Merci ! Vous êtes inscrit avec succès.');
    setEmail('');
  };return (
    <div style={{minHeight:'100vh',background:'#0a0018',color:'#fff',fontFamily:'sans-serif'}}>
      <Header />

      <div style={{background:'linear-gradient(135deg,#bf00ff,#ff0080,#7c3aed)',padding:'56px 24px',textAlign:'center'}}>
        <p style={{color:'rgba(255,255,255,0.9)',fontSize:'14px',fontWeight:700,textTransform:'uppercase',letterSpacing:'2px',margin:'0 0 12px'}}>
          ⚡ La Coupe du Monde touche à sa fin
        </p>
        <h1 style={{color:'#fff',fontWeight:900,fontSize:'clamp(32px,6vw,60px)',margin:'0 0 16px',textShadow:'0 2px 20px rgba(0,0,0,0.3)'}}>
          Le grand final 🏆
        </h1>
        <p style={{color:'rgba(255,255,255,0.95)',fontSize:'18px',margin:'0 0 8px',fontWeight:600}}>
          Vote. Pronostique. Gagne.
        </p>
        <p style={{color:'rgba(255,255,255,0.8)',fontSize:'15px',margin:0}}>
          La communauté MakeGoal vibre pour les derniers matchs du Mondial 2026.
        </p>
      </div>

      <main style={{maxWidth:'900px',margin:'0 auto',padding:'40px 16px'}}>

        <div style={{
          background:'linear-gradient(135deg,#1a0033,#bf00ff)',
          borderRadius:'24px', padding:'40px 32px', marginBottom:'32px',
          textAlign:'center', boxShadow:'0 8px 40px rgba(191,0,255,0.4)',
          border:'1px solid rgba(255,255,255,0.1)'
        }}>
          <div style={{display:'inline-block',background:'#ff0080',color:'#fff',fontSize:'12px',fontWeight:900,padding:'6px 16px',borderRadius:'999px',marginBottom:'16px',textTransform:'uppercase',letterSpacing:'1px'}}>
            🏆 Grande Finale · Concours
          </div>
          <h2 style={{color:'#fff',fontWeight:900,fontSize:'clamp(24px,5vw,36px)',margin:'0 0 8px'}}>
            🇪🇸 Espagne <span style={{color:'#ffd700'}}>vs</span> Argentine 🇦🇷
          </h2>
          <p style={{color:'rgba(255,255,255,0.85)',fontSize:'15px',margin:'0 0 4px'}}>
            📅 Dimanche 19 juillet · 15h00 (ET)
          </p>
          <p style={{color:'rgba(255,255,255,0.7)',fontSize:'13px',margin:'0 0 20px'}}>
            🏟️ MetLife Stadium, New Jersey
          </p>

          <div style={{background:'rgba(255,255,255,0.12)',borderRadius:'16px',padding:'20px',marginBottom:'24px'}}>
            <p style={{color:'#ffd700',fontSize:'13px',fontWeight:900,textTransform:'uppercase',letterSpacing:'1px',margin:'0 0 8px'}}>🎁 À gagner</p>
            <p style={{color:'#fff',fontSize:'17px',fontWeight:700,margin:0,lineHeight:'1.5'}}>
              10 000 Gourdes · Tablettes · Netflix 3 mois
            </p>
          </div>

          <a href="/concours" style={{
            display:'inline-block', background:'#fff', color:VIOLET,
            padding:'16px 40px', borderRadius:'999px', fontWeight:900, fontSize:'18px',
            textDecoration:'none', boxShadow:'0 4px 20px rgba(0,0,0,0.2)'
          }}>
            🎯 Participer et gagner
          </a>
          <p style={{color:'rgba(255,255,255,0.7)',fontSize:'12px',margin:'16px 0 0'}}>
            Pronostique le score, les buteurs, et invite tes amis pour plus de points.
          </p>
        </div><div style={{
          background:'#12002a', borderRadius:'24px', padding:'32px',
          marginBottom:'32px', border:'1px solid rgba(255,255,255,0.1)'
        }}>
          <div style={{textAlign:'center',marginBottom:'24px'}}>
            <div style={{display:'inline-block',background:'#7c3aed',color:'#fff',fontSize:'12px',fontWeight:900,padding:'6px 16px',borderRadius:'999px',marginBottom:'12px',textTransform:'uppercase',letterSpacing:'1px'}}>
              🥉 Petite Finale
            </div>
            <h2 style={{color:'#fff',fontWeight:900,fontSize:'clamp(22px,4vw,30px)',margin:'0 0 8px'}}>
              🇫🇷 France <span style={{color:'#ffd700'}}>vs</span> Angleterre 🏴󠁧󠁢󠁥󠁮󠁧󠁿
            </h2>
            <p style={{color:'rgba(255,255,255,0.7)',fontSize:'14px',margin:'0 0 2px'}}>
              📅 Samedi 18 juillet · 17h00 (ET)
            </p>
            <p style={{color:'rgba(255,255,255,0.5)',fontSize:'13px',margin:0}}>
              🏟️ Hard Rock Stadium, Miami
            </p>
          </div>

          <p style={{textAlign:'center',color:'rgba(255,255,255,0.8)',fontSize:'15px',fontWeight:700,margin:'0 0 16px'}}>
            Qui va gagner ? Vote maintenant 👇
          </p>

          <div style={{display:'flex',gap:'10px',marginBottom:'12px'}}>
            {([['1','France'],['X','Nul'],['2','Angleterre']] as const).map(([val,label]) => {
              const nb = stats[val];
              const pourcent = pct(nb, stats.total);
              const actif = monVote === val;
              return (
                <button key={val} onClick={() => voter(val)} style={{
                  flex:1, position:'relative', overflow:'hidden',
                  padding:'18px 8px', borderRadius:'14px', cursor:'pointer',
                  border: actif ? '2px solid #ffd700' : '2px solid rgba(255,255,255,0.2)',
                  background: actif ? 'rgba(255,215,0,0.15)' : 'rgba(255,255,255,0.05)',
                  textAlign:'center'
                }}>
                  <div style={{position:'absolute',bottom:0,left:0,height:'5px',width:pourcent+'%',background:actif?'#ffd700':'#7c3aed',transition:'width 0.3s'}}/>
                  <div style={{fontWeight:900,fontSize:'22px',color:actif?'#ffd700':'#fff',marginBottom:'4px'}}>{val}</div>
                  <div style={{fontSize:'12px',color:'rgba(255,255,255,0.7)',fontWeight:600}}>{label}</div>
                  <div style={{fontSize:'15px',color:actif?'#ffd700':'#fff',fontWeight:900,marginTop:'6px'}}>{stats.total > 0 ? pourcent + '%' : '—'}</div>
                </button>
              );
            })}
          </div>
          <p style={{textAlign:'center',fontSize:'12px',color:'rgba(255,255,255,0.5)',margin:0}}>
            {stats.total > 0 ? stats.total + ' vote' + (stats.total > 1 ? 's' : '') : 'Soyez le premier à voter'}
            {!user && ' · connectez-vous pour voter'}
          </p>
        </div>

        <div style={{background:'linear-gradient(135deg,#1a0033,#bf00ff)',borderRadius:'20px',padding:'32px',textAlign:'center'}}>
          <h2 style={{color:'#fff',fontWeight:900,fontSize:'24px',marginBottom:'8px'}}>
            📬 Reste connecté
          </h2>
          <p style={{color:'rgba(255,255,255,0.8)',fontSize:'15px',marginBottom:'20px'}}>
            Reçois les actus et les prochains concours MakeGoal.
          </p>
          {newsletterMsg ? (
            <p style={{color:'#6ee7b7',fontWeight:700,fontSize:'16px'}}>{newsletterMsg}</p>
          ) : (
            <div style={{display:'flex',gap:'8px',maxWidth:'400px',margin:'0 auto',flexWrap:'wrap'}}>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="votre@email.com"
                style={{flex:1,padding:'12px 16px',borderRadius:'999px',border:'none',fontSize:'14px',minWidth:'200px'}}/>
              <button onClick={inscrireNewsletter} style={{background:'#fff',color:VIOLET,padding:'12px 24px',borderRadius:'999px',border:'none',fontWeight:700,fontSize:'14px',cursor:'pointer'}}>
                S'inscrire
              </button>
            </div>
          )}
        </div>

      </main>
      <Footer />
    </div>
  );
}