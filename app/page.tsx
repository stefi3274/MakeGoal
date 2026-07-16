'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../lib/auth';
import { supabase } from '../lib/supabase';
import Header from '../components/Header';
import Footer from '../components/Footer';

const VIOLET = '#bf00ff';

const FLAG_CODES: Record<string, string> = {
  'Espagne':'es','Argentine':'ar','France':'fr','Angleterre':'gb-eng',
};
const flag = (pays: string) => 'https://flagcdn.com/80x60/' + (FLAG_CODES[pays] || 'un') + '.png';

type ConcoursMatch = {
  id: string; equipe1: string; equipe2: string;
  date_match: string; ordre: number; label: string | null;
};
type Concours = { id: string; titre: string; statut: string; lots: string | null; };
type Classement = { user_id: string; username: string; points_total: number };
type VoteStat = { '1': number; 'X': number; '2': number; total: number };

const pct = (n: number, total: number) => total > 0 ? Math.round((n / total) * 100) : 0;

const compteRebours = (dateStr: string) => {
  const diff = new Date(dateStr).getTime() - Date.now();
  if (diff <= 0) return 'Match en cours ou terminé';
  const j = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  if (j > 0) return 'Plus que ' + j + 'j ' + h + 'h';
  return 'Plus que ' + h + 'h ' + m + 'm';
};

export default function Home() {
  const router = useRouter();
  const { user } = useAuth();
  const [concours, setConcours] = useState<Concours | null>(null);
  const [matchs, setMatchs] = useState<ConcoursMatch[]>([]);
  const [statsVotes, setStatsVotes] = useState<Record<string, VoteStat>>({});
  const [mesVotes, setMesVotes] = useState<Record<string, string>>({});
  const [classement, setClassement] = useState<Classement[]>([]);
  const [email, setEmail] = useState('');
  const [newsletterMsg, setNewsletterMsg] = useState('');
  const [, tick] = useState(0);

  useEffect(() => {
    chargerConcours();
    const timer = setInterval(() => tick(t => t + 1), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => { if (user && matchs.length > 0) chargerMesVotes(); }, [user, matchs]);

  const chargerConcours = async () => {
    const { data: c } = await supabase.from('concours').select('*').in('statut', ['ouvert','ferme']).order('created_at', { ascending: false }).limit(1).single();
    if (c) {
      setConcours(c);
      const { data: m } = await supabase.from('concours_matchs').select('*').eq('concours_id', c.id).order('ordre', { ascending: true });
      if (m) { setMatchs(m); m.forEach(match => chargerStatsVotes(match.id)); }
      const { data: cl } = await supabase.rpc('classement_concours', { cid: c.id });
      if (cl) setClassement(cl.slice(0, 10));
    }
  };

  const chargerStatsVotes = async (matchId: string) => {
    const { data } = await supabase.from('participations_matchs').select('choix_1x2').eq('concours_match_id', matchId);
    if (data) {
      const s: VoteStat = { '1':0,'X':0,'2':0,total:0 };
      data.forEach((v: { choix_1x2: string }) => { if (v.choix_1x2) { s[v.choix_1x2 as '1'|'X'|'2']++; s.total++; } });
      setStatsVotes(prev => ({ ...prev, [matchId]: s }));
    }
  };

  const chargerMesVotes = async () => {
    if (!user) return;
    const ids = matchs.map(m => m.id);
    const { data } = await supabase.from('participations_matchs').select('concours_match_id, choix_1x2').eq('user_id', user.id).in('concours_match_id', ids);
    if (data) {
      const map: Record<string, string> = {};
      data.forEach((v: { concours_match_id: string; choix_1x2: string }) => { map[v.concours_match_id] = v.choix_1x2; });
      setMesVotes(map);
    }
  };

  const voter = async (matchId: string, choix: '1'|'X'|'2') => {
    if (!user) { router.push('/compte'); return; }
    const existant = mesVotes[matchId];
    if (existant) {
      await supabase.from('participations_matchs').update({ choix_1x2: choix }).eq('user_id', user.id).eq('concours_match_id', matchId);
    } else {
      await supabase.from('participations_matchs').insert({ user_id: user.id, concours_match_id: matchId, choix_1x2: choix, points: 10 });
    }
    setMesVotes(prev => ({ ...prev, [matchId]: choix }));
    chargerStatsVotes(matchId);
    if (concours) { const { data: cl } = await supabase.rpc('classement_concours', { cid: concours.id }); if (cl) setClassement(cl.slice(0, 10)); }
  };

  const inscrireNewsletter = async () => {
    if (!email) return;
    await fetch('/api/newsletter', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) });
    setNewsletterMsg('Merci ! Vous êtes inscrit avec succès.');
    setEmail('');
  };

  const CarteMatch = ({ m, couleur, theme }: { m: ConcoursMatch; couleur: string; theme: string }) => {
    const s = statsVotes[m.id] || { '1':0,'X':0,'2':0,total:0 };
    const monVote = mesVotes[m.id];
    return (
      <div style={{
        background: theme,
        borderRadius:'24px', padding:'28px', marginBottom:'24px',
        border:'2px solid '+couleur, boxShadow:'0 8px 30px '+couleur+'33'
      }}>
        {m.label && (
          <div style={{textAlign:'center',marginBottom:'16px'}}>
            <span style={{display:'inline-block',background:couleur,color:'#12002a',fontSize:'12px',fontWeight:900,padding:'6px 18px',borderRadius:'999px',textTransform:'uppercase',letterSpacing:'1px'}}>{m.label}</span>
          </div>
        )}

        <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:'16px',marginBottom:'16px'}}>
          <div style={{textAlign:'center',flex:1}}>
            <img src={flag(m.equipe1)} alt={m.equipe1} style={{width:'64px',height:'48px',borderRadius:'6px',objectFit:'cover',boxShadow:'0 2px 8px rgba(0,0,0,0.4)'}}/>
            <p style={{color:'#fff',fontWeight:700,fontSize:'14px',margin:'8px 0 0'}}>{m.equipe1}</p>
          </div>
          <div style={{color:couleur,fontWeight:900,fontSize:'20px'}}>VS</div>
          <div style={{textAlign:'center',flex:1}}>
            <img src={flag(m.equipe2)} alt={m.equipe2} style={{width:'64px',height:'48px',borderRadius:'6px',objectFit:'cover',boxShadow:'0 2px 8px rgba(0,0,0,0.4)'}}/>
            <p style={{color:'#fff',fontWeight:700,fontSize:'14px',margin:'8px 0 0'}}>{m.equipe2}</p>
          </div>
        </div>

        <div style={{textAlign:'center',marginBottom:'16px'}}>
          <p style={{color:'rgba(255,255,255,0.6)',fontSize:'12px',margin:'0 0 2px'}}>📅 {new Date(m.date_match).toLocaleString('fr-FR',{weekday:'long',day:'numeric',month:'long',hour:'2-digit',minute:'2-digit'})}</p>
          <p style={{color:couleur,fontSize:'13px',fontWeight:900,margin:0}}>⏳ {compteRebours(m.date_match)}</p>
        </div>

        <div style={{display:'flex',gap:'10px'}}>
          {([['1',m.equipe1],['X','Nul'],['2',m.equipe2]] as const).map(([val,label]) => {
            const pourcent = pct(s[val], s.total);
            const actif = monVote === val;
            return (
              <button key={val} onClick={() => voter(m.id, val)} style={{
                flex:1, position:'relative', overflow:'hidden',
                padding:'16px 8px', borderRadius:'14px', cursor:'pointer',
                border: actif ? '2px solid '+couleur : '2px solid rgba(255,255,255,0.2)',
                background: actif ? couleur+'22' : 'rgba(255,255,255,0.05)', textAlign:'center'
              }}>
                <div className="mg-bar" style={{position:'absolute',bottom:0,left:0,height:'5px',width:pourcent+'%',background:couleur}}/>
                <div style={{fontWeight:900,fontSize:'20px',color:actif?couleur:'#fff',marginBottom:'2px'}}>{val}</div>
                <div style={{fontSize:'11px',color:'rgba(255,255,255,0.7)',fontWeight:600}}>{label}</div>
                <div style={{fontSize:'14px',color:actif?couleur:'#fff',fontWeight:900,marginTop:'4px'}}>{s.total>0?pourcent+'%':'—'}</div>
              </button>
            );
          })}
        </div>
        <p style={{textAlign:'center',fontSize:'11px',color:'rgba(255,255,255,0.5)',margin:'10px 0 0'}}>
          {s.total>0 ? s.total+' vote'+(s.total>1?'s':'') : 'Soyez le premier à voter'}
          {!user && ' · connectez-vous pour voter'}
        </p>
      </div>
    );
  };

  return (
    <div style={{minHeight:'100vh',background:'#0a0018',color:'#fff',fontFamily:'sans-serif'}}>
      <Header />

      <div style={{background:'linear-gradient(135deg,#004e92,#000428)',padding:'48px 24px',textAlign:'center',borderBottom:'3px solid #ffd700'}}>
        <p style={{color:'#ffd700',fontSize:'13px',fontWeight:900,textTransform:'uppercase',letterSpacing:'3px',margin:'0 0 12px'}}>
          ⚽ FIFA World Cup 2026 ⚽
        </p>
        <h1 style={{color:'#fff',fontWeight:900,fontSize:'clamp(30px,6vw,56px)',margin:'0 0 12px'}}>
          Le grand final 🏆
        </h1>
        <p style={{color:'rgba(255,255,255,0.85)',fontSize:'17px',margin:0,fontWeight:600}}>
          Vote. Pronostique. Gagne avec la communauté MakeGoal.
        </p>
      </div>

      <main style={{maxWidth:'860px',margin:'0 auto',padding:'40px 16px'}}>

        {matchs.length === 0 && (
          <div style={{textAlign:'center',padding:'40px',background:'#12002a',borderRadius:'20px',marginBottom:'24px'}}>
            <p style={{color:'rgba(255,255,255,0.7)',fontSize:'15px',margin:0}}>Le concours arrive bientôt. Reviens vite !</p>
          </div>
        )}

        {matchs.map((m, i) => (
          <CarteMatch
            key={m.id}
            m={m}
            couleur={i === 0 ? '#cd7f32' : '#ffd700'}
            theme={i === 0 ? 'linear-gradient(135deg,#3d1f00,#6b3410,#3d1f00)' : 'linear-gradient(135deg,#3d2c00,#7a5c00,#3d2c00)'}
          />
        ))}

        {concours && (
          <div style={{background:'linear-gradient(135deg,#1a0033,#bf00ff)',borderRadius:'24px',padding:'28px',marginBottom:'24px',textAlign:'center'}}>
            <div style={{background:'rgba(255,255,255,0.12)',borderRadius:'14px',padding:'16px',marginBottom:'20px'}}>
              <p style={{color:'#ffd700',fontSize:'13px',fontWeight:900,textTransform:'uppercase',letterSpacing:'1px',margin:'0 0 6px'}}>🎁 À gagner</p>
              <p style={{color:'#fff',fontSize:'16px',fontWeight:700,margin:0}}>{concours.lots || '10 000 Gourdes · Tablettes · Netflix 3 mois'}</p>
            </div>
            <a href="/concours" className="mg-pulse-gold" style={{
              display:'inline-block', background:'#ffd700', color:'#3d2c00',
              padding:'16px 40px', borderRadius:'999px', fontWeight:900, fontSize:'17px', textDecoration:'none'
            }}>
              🎯 Compléter mon pronostic
            </a>
            <p style={{color:'rgba(255,255,255,0.7)',fontSize:'12px',margin:'14px 0 0'}}>
              Ajoute le score exact et les buteurs pour gagner un max de points.
            </p>
          </div>
        )}

        {classement.length > 0 && (
          <div style={{background:'#12002a',borderRadius:'24px',padding:'28px',marginBottom:'24px',border:'1px solid rgba(255,255,255,0.1)'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'20px'}}>
              <h2 style={{color:'#fff',fontWeight:900,fontSize:'20px',margin:0}}>🏆 Top 10 en direct</h2>
              <a href="/concours" style={{color:'#ffd700',fontSize:'13px',fontWeight:700,textDecoration:'none'}}>Voir tout →</a>
            </div>
            {classement.map((c, i) => (
              <div key={c.user_id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'12px 0',borderBottom:'1px solid rgba(255,255,255,0.08)'}}>
                <div style={{display:'flex',alignItems:'center',gap:'12px'}}>
                  <span style={{
                    fontWeight:900,fontSize:'14px',width:'30px',height:'30px',borderRadius:'999px',
                    display:'flex',alignItems:'center',justifyContent:'center',
                    background: i===0?'#ffd700':i===1?'#c0c0c0':i===2?'#cd7f32':'rgba(255,255,255,0.1)',
                    color: i<3?'#12002a':'#fff'
                  }}>{i+1}</span>
                  <span style={{color:'#fff',fontWeight:600,fontSize:'15px'}}>{c.username}</span>
                </div>
                <span style={{color:'#ffd700',fontWeight:900,fontSize:'16px'}}>{c.points_total} pts</span>
              </div>
            ))}
          </div>
        )}

        <div style={{background:'linear-gradient(135deg,#1a0033,#bf00ff)',borderRadius:'20px',padding:'32px',textAlign:'center'}}>
          <h2 style={{color:'#fff',fontWeight:900,fontSize:'24px',marginBottom:'8px'}}>📬 Reste connecté</h2>
          <p style={{color:'rgba(255,255,255,0.8)',fontSize:'15px',marginBottom:'20px'}}>
            Reçois les actus et les prochains concours MakeGoal.
          </p>
          {newsletterMsg ? (
            <p style={{color:'#6ee7b7',fontWeight:700,fontSize:'16px'}}>{newsletterMsg}</p>
          ) : (
            <div style={{display:'flex',gap:'8px',maxWidth:'400px',margin:'0 auto',flexWrap:'wrap'}}>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="votre@email.com" style={{flex:1,padding:'12px 16px',borderRadius:'999px',border:'none',fontSize:'14px',minWidth:'200px'}}/>
              <button onClick={inscrireNewsletter} style={{background:'#fff',color:VIOLET,padding:'12px 24px',borderRadius:'999px',border:'none',fontWeight:700,fontSize:'14px',cursor:'pointer'}}>S'inscrire</button>
            </div>
          )}
        </div>

      </main>
      <Footer />
    </div>
  );
}
