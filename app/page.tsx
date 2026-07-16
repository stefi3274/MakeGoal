'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../lib/auth';
import { supabase } from '../lib/supabase';
import Header from '../components/Header';
import Footer from '../components/Footer';

const VIOLET = '#bf00ff';
const FINALE_ID = 1000;
const PETITE_FINALE_ID = 999;

type VoteStat = { '1': number; 'X': number; '2': number; total: number };

const pct = (n: number, total: number) => total > 0 ? Math.round((n / total) * 100) : 0;

export default function Home() {
  const router = useRouter();
  const { user } = useAuth();
  const [statsFinale, setStatsFinale] = useState<VoteStat>({ '1': 0, 'X': 0, '2': 0, total: 0 });
  const [statsPetite, setStatsPetite] = useState<VoteStat>({ '1': 0, 'X': 0, '2': 0, total: 0 });
  const [voteFinale, setVoteFinale] = useState('');
  const [votePetite, setVotePetite] = useState('');
  const [email, setEmail] = useState('');
  const [newsletterMsg, setNewsletterMsg] = useState('');

  useEffect(() => {
    chargerStats(FINALE_ID, setStatsFinale);
    chargerStats(PETITE_FINALE_ID, setStatsPetite);
  }, []);

  useEffect(() => {
    if (user) {
      chargerMonVote(FINALE_ID, setVoteFinale);
      chargerMonVote(PETITE_FINALE_ID, setVotePetite);
    }
  }, [user]);

  const chargerStats = async (matchId: number, setter: (s: VoteStat) => void) => {
    const { data } = await supabase.from('votes_matchs').select('choix').eq('match_id', matchId);
    if (data) {
      const s: VoteStat = { '1': 0, 'X': 0, '2': 0, total: 0 };
      data.forEach((v: { choix: string }) => {
        s[v.choix as '1' | 'X' | '2']++;
        s.total++;
      });
      setter(s);
    }
  };

  const chargerMonVote = async (matchId: number, setter: (c: string) => void) => {
    if (!user) return;
    const { data } = await supabase.from('votes_matchs').select('choix').eq('user_id', user.id).eq('match_id', matchId).single();
    if (data) setter(data.choix);
  };

  const voter = async (matchId: number, choix: '1' | 'X' | '2', setter: (c: string) => void, reload: () => void) => {
    if (!user) { router.push('/compte'); return; }
    await supabase.from('votes_matchs').upsert(
      { user_id: user.id, match_id: matchId, choix },
      { onConflict: 'user_id,match_id' }
    );
    setter(choix);
    reload();
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
  };const BoutonsVote = ({ matchId, stats, monVote, setter, reload, e1, e2, couleur }: {
    matchId: number; stats: VoteStat; monVote: string;
    setter: (c: string) => void; reload: () => void;
    e1: string; e2: string; couleur: string;
  }) => (
    <>
      <div style={{display:'flex',gap:'10px',marginBottom:'12px'}}>
        {([['1',e1],['X','Nul'],['2',e2]] as const).map(([val,label]) => {
          const nb = stats[val];
          const pourcent = pct(nb, stats.total);
          const actif = monVote === val;
          return (
            <button key={val} onClick={() => voter(matchId, val, setter, reload)} style={{
              flex:1, position:'relative', overflow:'hidden',
              padding:'18px 8px', borderRadius:'14px', cursor:'pointer',
              border: actif ? '2px solid ' + couleur : '2px solid rgba(255,255,255,0.2)',
              background: actif ? couleur + '22' : 'rgba(255,255,255,0.05)',
              textAlign:'center'
            }}>
              <div style={{position:'absolute',bottom:0,left:0,height:'5px',width:pourcent+'%',background:couleur,transition:'width 0.3s'}}/>
              <div style={{fontWeight:900,fontSize:'22px',color:actif?couleur:'#fff',marginBottom:'4px'}}>{val}</div>
              <div style={{fontSize:'12px',color:'rgba(255,255,255,0.7)',fontWeight:600}}>{label}</div>
              <div style={{fontSize:'15px',color:actif?couleur:'#fff',fontWeight:900,marginTop:'6px'}}>{stats.total > 0 ? pourcent + '%' : '—'}</div>
            </button>
          );
        })}
      </div>
      <p style={{textAlign:'center',fontSize:'12px',color:'rgba(255,255,255,0.5)',margin:0}}>
        {stats.total > 0 ? stats.total + ' vote' + (stats.total > 1 ? 's' : '') : 'Soyez le premier à voter'}
        {!user && ' · connectez-vous pour voter'}
      </p>
    </>
  );

  return (
    <div style={{minHeight:'100vh',background:'#0a0018',color:'#fff',fontFamily:'sans-serif'}}>
      <Header />

      <div style={{background:'linear-gradient(135deg,#004e92,#000428)',padding:'48px 24px',textAlign:'center',borderBottom:'3px solid #ffd700'}}>
        <p style={{color:'#ffd700',fontSize:'13px',fontWeight:900,textTransform:'uppercase',letterSpacing:'3px',margin:'0 0 12px'}}>
          ⚽ FIFA World Cup 2026 ⚽
        </p>
        <h1 style={{color:'#fff',fontWeight:900,fontSize:'clamp(30px,6vw,56px)',margin:'0 0 12px'}}>
          Les derniers matchs 🏆
        </h1>
        <p style={{color:'rgba(255,255,255,0.85)',fontSize:'17px',margin:0,fontWeight:600}}>
          Vote. Pronostique. Gagne avec la communauté MakeGoal.
        </p>
      </div>

      <main style={{maxWidth:'900px',margin:'0 auto',padding:'40px 16px'}}>

        <div style={{
          background:'linear-gradient(135deg,#3d1f00,#6b3410,#3d1f00)',
          borderRadius:'24px', padding:'32px 28px', marginBottom:'28px',
          textAlign:'center', boxShadow:'0 8px 30px rgba(205,127,50,0.25)',
          border:'2px solid #cd7f32'
        }}>
          <div style={{display:'inline-block',background:'#cd7f32',color:'#fff',fontSize:'12px',fontWeight:900,padding:'6px 18px',borderRadius:'999px',marginBottom:'16px',textTransform:'uppercase',letterSpacing:'1px'}}>
            🥉 Petite Finale · BRONZE
          </div>
          <h2 style={{color:'#e8a56b',fontWeight:900,fontSize:'clamp(22px,4vw,30px)',margin:'0 0 8px'}}>
            🇫🇷 France — Angleterre 🏴󠁧󠁢󠁥󠁮󠁧󠁿
          </h2>
          <p style={{color:'rgba(255,255,255,0.8)',fontSize:'14px',margin:'0 0 2px'}}>
            📅 Samedi 18 juillet · 17h00 (ET)
          </p>
          <p style={{color:'rgba(255,255,255,0.5)',fontSize:'13px',margin:'0 0 20px'}}>
            🏟️ Hard Rock Stadium, Miami
          </p>

          <BoutonsVote matchId={PETITE_FINALE_ID} stats={statsPetite} monVote={votePetite} setter={setVotePetite} reload={() => chargerStats(PETITE_FINALE_ID, setStatsPetite)} e1="France" e2="Angleterre" couleur="#cd7f32" />
        </div><div style={{
          background:'linear-gradient(135deg,#3d2c00,#7a5c00,#3d2c00)',
          borderRadius:'24px', padding:'36px 28px', marginBottom:'28px',
          textAlign:'center', boxShadow:'0 8px 40px rgba(255,215,0,0.25)',
          border:'2px solid #ffd700'
        }}>
          <div style={{display:'inline-block',background:'#ffd700',color:'#3d2c00',fontSize:'12px',fontWeight:900,padding:'6px 18px',borderRadius:'999px',marginBottom:'16px',textTransform:'uppercase',letterSpacing:'1px'}}>
            🥇 Grande Finale · OR
          </div>
          <h2 style={{color:'#ffd700',fontWeight:900,fontSize:'clamp(24px,5vw,34px)',margin:'0 0 8px'}}>
            🇪🇸 Espagne — Argentine 🇦🇷
          </h2>
          <p style={{color:'rgba(255,255,255,0.85)',fontSize:'14px',margin:'0 0 2px'}}>
            📅 Dimanche 19 juillet · 15h00 (ET)
          </p>
          <p style={{color:'rgba(255,255,255,0.6)',fontSize:'13px',margin:'0 0 20px'}}>
            🏟️ MetLife Stadium, New Jersey
          </p>

          <BoutonsVote matchId={FINALE_ID} stats={statsFinale} monVote={voteFinale} setter={setVoteFinale} reload={() => chargerStats(FINALE_ID, setStatsFinale)} e1="Espagne" e2="Argentine" couleur="#ffd700" />

          <div style={{background:'rgba(0,0,0,0.3)',borderRadius:'14px',padding:'16px',margin:'20px 0 0'}}>
            <p style={{color:'#ffd700',fontSize:'13px',fontWeight:900,margin:'0 0 8px'}}>🎁 10 000 Gourdes · Tablettes · Netflix 3 mois</p>
            <a href="/concours" style={{display:'inline-block',background:'#ffd700',color:'#3d2c00',padding:'14px 32px',borderRadius:'999px',fontWeight:900,fontSize:'16px',textDecoration:'none',marginTop:'4px'}}>
              🎯 Compléter mon pronostic
            </a>
            <p style={{color:'rgba(255,255,255,0.6)',fontSize:'12px',margin:'12px 0 0'}}>
              Ajoute le score exact et les buteurs pour gagner plus de points.
            </p>
          </div>
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
                style={{flex:1,padding:'12px 16px',borderRadius:'999px',border:'none',fontSize:'14px',minWidth:'200px'}}
              />
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