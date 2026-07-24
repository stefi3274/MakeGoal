'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../lib/auth';
import { supabase } from '../lib/supabase';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { postVisible, matchVisible } from '../lib/postVisible';

const VIOLET = '#bf00ff';

type Article = {
  id: string; titre: string; categorie: string;
  type: string; langue: string;
  statut_match: string | null; statut_change_at: string | null; relance_at: string | null;
  image_couverture: string | null; extrait: string | null;
  auteur: string; created_at: string;
};
type Match = {
  id: string; equipe1: string; equipe2: string;
  competition: string | null; date_match: string; statut: string;
  score_home: number | null; score_away: number | null;
};
type Concours = { id: string; titre: string; statut: string; lots: string | null; };
type VoteStat = { '1': number; 'X': number; '2': number; total: number };

const pct = (n: number, total: number) => total > 0 ? Math.round((n / total) * 100) : 0;

export default function Home() {
  const router = useRouter();
  const { user } = useAuth();
  const [articles, setArticles] = useState<Article[]>([]);
  const [matchs, setMatchs] = useState<Match[]>([]);
  const [concours, setConcours] = useState<Concours | null>(null);
  const [stats, setStats] = useState<Record<string, VoteStat>>({});
  const [mesVotes, setMesVotes] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [filtre, setFiltre] = useState('Tous');
  const [email, setEmail] = useState('');
  const [newsletterMsg, setNewsletterMsg] = useState('');

  useEffect(() => { chargerTout(); }, []);
  useEffect(() => { if (user && matchs.length > 0) chargerMesVotes(); }, [user, matchs]);

  const chargerTout = async () => {
    const { data: arts } = await supabase.from('articles').select('id, titre, categorie, type, langue, statut_match, statut_change_at, relance_at, image_couverture, extrait, auteur, created_at').eq('publie', true).order('created_at', { ascending: false });
    if (arts) setArticles(arts.filter(postVisible));
    const { data: mts } = await supabase.from('matchs').select('*').eq('actif', true).order('date_match', { ascending: true });
    if (mts) { const visibles = mts.filter(m => matchVisible(m.date_match)); setMatchs(visibles); visibles.forEach(m => chargerStats(m.id)); }
    const { data: c } = await supabase.from('concours').select('*').in('statut', ['ouvert','ferme']).order('created_at', { ascending: false }).limit(1).single();
    if (c) {
      // Le concours disparaît quand son dernier match + 2h est passé
      const { data: cm } = await supabase.from('concours_matchs').select('date_match').eq('concours_id', c.id).order('date_match', { ascending: false }).limit(1).single();
      if (!cm || matchVisible(cm.date_match)) setConcours(c);
    }
    setLoading(false);
  };

  const chargerStats = async (matchId: string) => {
    const { data } = await supabase.from('votes_communaute').select('choix').eq('match_id', matchId);
    if (data) {
      const s: VoteStat = { '1':0,'X':0,'2':0,total:0 };
      data.forEach((v: { choix: string }) => { s[v.choix as '1'|'X'|'2']++; s.total++; });
      setStats(prev => ({ ...prev, [matchId]: s }));
    }
  };

  const chargerMesVotes = async () => {
    if (!user) return;
    const ids = matchs.map(m => m.id);
    const { data } = await supabase.from('votes_communaute').select('match_id, choix').eq('user_id', user.id).in('match_id', ids);
    if (data) {
      const map: Record<string, string> = {};
      data.forEach((v: { match_id: string; choix: string }) => { map[v.match_id] = v.choix; });
      setMesVotes(map);
    }
  };

  const voter = async (matchId: string, choix: '1'|'X'|'2') => {
    if (!user) { router.push('/compte'); return; }
    const existant = mesVotes[matchId];
    if (existant) {
      await supabase.from('votes_communaute').update({ choix }).eq('user_id', user.id).eq('match_id', matchId);
    } else {
      await supabase.from('votes_communaute').insert({ user_id: user.id, match_id: matchId, choix });
    }
    setMesVotes(prev => ({ ...prev, [matchId]: choix }));
    chargerStats(matchId);
  };

  const inscrireNewsletter = async () => {
    if (!email) return;
    await fetch('/api/newsletter', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) });
    setNewsletterMsg('Merci ! Vous êtes inscrit avec succès.');
    setEmail('');
  };

  const formatDate = (d: string) => new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  const formatMatch = (d: string) => new Date(d).toLocaleString('fr-FR', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit', timeZone:'America/Port-au-Prince' });
  const articlesFiltres = filtre === 'Tous' ? articles : articles.filter(a => a.categorie === filtre);
  const vedette = articlesFiltres.length > 0 ? articlesFiltres[0] : null;
  const autresArticles = vedette ? articlesFiltres.slice(1) : articlesFiltres;
  const couleurCat = (cat: string) => cat === 'Actualités' ? '#3b82f6' : '#f59e0b';

  // Calcul du Pouls de la communauté
  const totalVotes = Object.values(stats).reduce((acc, s) => acc + s.total, 0);
  const matchsAvecVotes = matchs
    .map(m => ({ m, s: stats[m.id] }))
    .filter((x): x is { m: Match; s: VoteStat } => !!x.s && x.s.total > 0);
  const matchChaud = matchsAvecVotes.length > 0
    ? matchsAvecVotes.reduce((max, cur) => cur.s.total > max.s.total ? cur : max)
    : null;
  let opinionTranchee: { m: Match; choix: string; pourcent: number } | null = null;
  for (const { m, s } of matchsAvecVotes) {
    for (const ch of ['1', 'X', '2'] as const) {
      const p = pct(s[ch], s.total);
      if (opinionTranchee === null || p > opinionTranchee.pourcent) {
        opinionTranchee = { m, choix: ch, pourcent: p };
      }
    }
  }

  const labelChoix = (m: Match, ch: string) => ch === '1' ? m.equipe1 : ch === '2' ? m.equipe2 : 'le nul';

  const WidgetMatchs = () => (
    <div style={{background:'#fff',border:'1px solid #e5e7eb',borderRadius:'16px',padding:'20px',boxShadow:'0 2px 8px rgba(0,0,0,0.05)'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'16px'}}>
        <h3 style={{fontWeight:900,fontSize:'16px',margin:0}}>⚽ Matchs à voter</h3>
        <a href="/matchs" style={{color:VIOLET,fontSize:'12px',fontWeight:700,textDecoration:'none'}}>Voir tout →</a>
      </div>
      {matchs.length === 0 && <p style={{color:'#9ca3af',fontSize:'13px',margin:0}}>Aucun match pour le moment.</p>}
      {matchs.slice(0,4).map(m => {
        const s = stats[m.id] || { '1':0,'X':0,'2':0,total:0 };
        const monVote = mesVotes[m.id];
        const termine = m.statut === 'termine';
        return (
          <div key={m.id} style={{padding:'12px 0',borderBottom:'1px solid #f3f4f6'}}>
            <p style={{fontSize:'11px',color:'#9ca3af',margin:'0 0 6px'}}>{formatMatch(m.date_match)}</p>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'8px'}}>
              <span style={{fontWeight:700,fontSize:'13px'}}>{m.equipe1}</span>
              {termine ? <span style={{fontWeight:900,fontSize:'14px',color:VIOLET}}>{m.score_home}-{m.score_away}</span> : <span style={{fontSize:'11px',color:'#9ca3af'}}>vs</span>}
              <span style={{fontWeight:700,fontSize:'13px'}}>{m.equipe2}</span>
            </div>
            <div style={{display:'flex',gap:'4px'}}>
              {([['1'],['X'],['2']] as const).map(([val]) => {
                const pourcent = pct(s[val], s.total);
                const actif = monVote === val;
                return (
                  <button key={val} disabled={termine} onClick={() => voter(m.id, val)} style={{
                    flex:1, position:'relative', overflow:'hidden',
                    padding:'6px 4px', borderRadius:'8px', cursor:termine?'default':'pointer',
                    border: actif ? '2px solid '+VIOLET : '1px solid #e5e7eb',
                    background: actif ? '#faf5ff' : '#fff', textAlign:'center'
                  }}>
                    <div style={{position:'absolute',bottom:0,left:0,height:'3px',width:pourcent+'%',background:actif?VIOLET:'#c4b5fd'}}/>
                    <div style={{fontWeight:900,fontSize:'13px',color:actif?VIOLET:'#374151'}}>{val}</div>
                    <div style={{fontSize:'10px',color:'#9ca3af',fontWeight:700}}>{s.total>0?pourcent+'%':'—'}</div>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );

  return (
    <div style={{minHeight:'100vh',background:'#f9fafb',color:'#111',fontFamily:'sans-serif'}}>
      <Header />

      <div style={{background:'linear-gradient(135deg,#1a0033,#bf00ff)',padding:'40px 24px',textAlign:'center'}}>
        <h1 style={{color:'#fff',fontWeight:900,fontSize:'clamp(28px,5vw,44px)',margin:'0 0 8px'}}>📰 MakeGoal</h1>
        <p style={{color:'rgba(255,255,255,0.9)',fontSize:'17px',margin:0,fontWeight:600}}>Votre média football : actus, analyses et pronostics.</p>
      </div>

      <main style={{maxWidth:'1100px',margin:'0 auto',padding:'32px 16px'}}>

        {totalVotes > 0 && (
          <div style={{background:'linear-gradient(135deg,#0f0f0f,#2a1a3a)',borderRadius:'16px',padding:'20px 24px',marginBottom:'24px',border:'1px solid '+VIOLET}}>
            <div style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'14px'}}>
              <span style={{fontSize:'20px'}}>🔥</span>
              <h2 style={{color:'#fff',fontWeight:900,fontSize:'17px',margin:0}}>Le Pouls de la communauté</h2>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))',gap:'12px'}}>
              <div style={{background:'rgba(191,0,255,0.12)',borderRadius:'12px',padding:'14px'}}>
                <p style={{color:'#c4b5fd',fontSize:'11px',fontWeight:700,margin:'0 0 4px',textTransform:'uppercase'}}>Votes communauté</p>
                <p style={{color:'#fff',fontSize:'24px',fontWeight:900,margin:0}}>{totalVotes}</p>
              </div>
              {opinionTranchee && (
                <div style={{background:'rgba(255,215,0,0.12)',borderRadius:'12px',padding:'14px'}}>
                  <p style={{color:'#ffd700',fontSize:'11px',fontWeight:700,margin:'0 0 4px',textTransform:'uppercase'}}>Opinion tranchée</p>
                  <p style={{color:'#fff',fontSize:'14px',fontWeight:700,margin:0}}>{opinionTranchee.pourcent}% pour {labelChoix(opinionTranchee.m, opinionTranchee.choix)}</p>
                </div>
              )}
              {matchChaud && (
                <div style={{background:'rgba(16,185,129,0.12)',borderRadius:'12px',padding:'14px'}}>
                  <p style={{color:'#6ee7b7',fontSize:'11px',fontWeight:700,margin:'0 0 4px',textTransform:'uppercase'}}>Match le plus chaud</p>
                  <p style={{color:'#fff',fontSize:'14px',fontWeight:700,margin:0}}>{matchChaud.m.equipe1} vs {matchChaud.m.equipe2}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {concours && (
          <a href="/concours" style={{textDecoration:'none',display:'block',marginBottom:'28px'}}>
            <div style={{background:'linear-gradient(135deg,#3d2c00,#7a5c00,#3d2c00)',borderRadius:'16px',padding:'20px 24px',border:'2px solid #ffd700',display:'flex',justifyContent:'space-between',alignItems:'center',gap:'16px',flexWrap:'wrap'}}>
              <div>
                <div style={{display:'inline-block',background:'#ffd700',color:'#3d2c00',fontSize:'11px',fontWeight:900,padding:'4px 14px',borderRadius:'999px',marginBottom:'8px',textTransform:'uppercase'}}>🏆 Concours en cours</div>
                <h2 style={{color:'#ffd700',fontWeight:900,fontSize:'20px',margin:'0 0 4px'}}>{concours.titre}</h2>
                {concours.lots && <p style={{color:'rgba(255,255,255,0.85)',fontSize:'13px',margin:0}}>🎁 {concours.lots}</p>}
              </div>
              <span style={{background:'#ffd700',color:'#3d2c00',padding:'12px 24px',borderRadius:'999px',fontWeight:900,fontSize:'14px',whiteSpace:'nowrap'}}>Participer →</span>
            </div>
          </a>
        )}

        <div style={{display:'grid',gridTemplateColumns:'1fr',gap:'24px'}} className="mg-layout">
          <div>
            <div style={{display:'flex',gap:'8px',marginBottom:'20px',flexWrap:'wrap'}}>
              {['Tous', 'Actualités', 'Revue de presse'].map(cat => (
                <button key={cat} onClick={() => setFiltre(cat)} style={{
                  padding:'8px 18px', borderRadius:'999px', fontWeight:700, fontSize:'13px', cursor:'pointer', border:'none',
                  background: filtre === cat ? VIOLET : '#fff',
                  color: filtre === cat ? '#fff' : '#374151',
                  boxShadow: filtre === cat ? 'none' : '0 1px 4px rgba(0,0,0,0.08)'
                }}>{cat}</button>
              ))}
            </div>

            <div className="mg-widget-mobile" style={{marginBottom:'24px'}}>
              <WidgetMatchs />
            </div>

            {loading && <p style={{color:'#9ca3af',textAlign:'center'}}>Chargement…</p>}
            {!loading && articlesFiltres.length === 0 && (
              <div style={{background:'#fff',padding:'40px',borderRadius:'16px',textAlign:'center'}}>
                <p style={{color:'#6b7280',margin:0}}>Aucun article pour le moment.</p>
              </div>
            )}

            {!loading && vedette && (
              <a href={(vedette.type === 'post' ? '/post/' : '/media/') + vedette.id} style={{textDecoration:'none',color:'inherit',display:'block',marginBottom:'24px'}}>
                <div style={{background:'#fff',border:'1px solid #e5e7eb',borderRadius:'20px',overflow:'hidden',boxShadow:'0 4px 20px rgba(0,0,0,0.08)',cursor:'pointer'}}>
                  {vedette.image_couverture ? (
                    <img src={vedette.image_couverture} alt={vedette.titre} style={{width:'100%',height:'280px',objectFit:'cover'}}/>
                  ) : (
                    <div style={{width:'100%',height:'280px',background:'linear-gradient(135deg,#1a0033,#bf00ff)',display:'flex',alignItems:'center',justifyContent:'center'}}><span style={{fontSize:'56px'}}>{vedette.type === 'post' ? '⚡' : '⚽'}</span></div>
                  )}
                  <div style={{padding:'24px'}}>
                    <div style={{display:'flex',gap:'6px',marginBottom:'10px',flexWrap:'wrap'}}>
                      <span style={{fontSize:'11px',fontWeight:900,color:'#fff',background:'#111',padding:'4px 12px',borderRadius:'999px',textTransform:'uppercase',letterSpacing:'0.5px'}}>★ À la une</span>
                      <span style={{fontSize:'11px',fontWeight:700,color:'#fff',background:couleurCat(vedette.categorie),padding:'4px 12px',borderRadius:'999px'}}>{vedette.categorie}</span>
                      <span style={{fontSize:'11px',fontWeight:700,color:'#374151',background:'#f3f4f6',padding:'4px 12px',borderRadius:'999px'}}>{vedette.langue === 'kreyol' ? '🇭🇹 Kreyòl' : '🇫🇷 FR'}</span>
                    </div>
                    <h2 style={{fontWeight:900,fontSize:'clamp(20px,3vw,28px)',margin:'0 0 10px',lineHeight:'1.25'}}>{vedette.titre}</h2>
                    {vedette.extrait && <p style={{color:'#6b7280',fontSize:'15px',margin:'0 0 12px',lineHeight:'1.6'}}>{vedette.extrait}</p>}
                    <p style={{color:'#9ca3af',fontSize:'12px',margin:0}}>{vedette.auteur} · {formatDate(vedette.created_at)}</p>
                  </div>
                </div>
              </a>
            )}

            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))',gap:'20px'}}>
              {!loading && autresArticles.map(a => (
                <a key={a.id} href={(a.type === 'post' ? '/post/' : '/media/') + a.id} style={{textDecoration:'none',color:'inherit'}}>
                  <div style={{background:'#fff',border:'1px solid #e5e7eb',borderRadius:'16px',overflow:'hidden',boxShadow:'0 2px 8px rgba(0,0,0,0.05)',height:'100%',display:'flex',flexDirection:'column',cursor:'pointer'}}>
                    {a.image_couverture ? (
                      <img src={a.image_couverture} alt={a.titre} style={{width:'100%',height:'160px',objectFit:'cover'}}/>
                    ) : (
                      <div style={{width:'100%',height:'160px',background:'linear-gradient(135deg,#1a0033,#bf00ff)',display:'flex',alignItems:'center',justifyContent:'center'}}><span style={{fontSize:'36px'}}>{a.type === 'post' ? '⚡' : '⚽'}</span></div>
                    )}
                    <div style={{padding:'16px',flex:1,display:'flex',flexDirection:'column'}}>
                      <div style={{display:'flex',gap:'6px',marginBottom:'8px',flexWrap:'wrap'}}>
                        <span style={{fontSize:'10px',fontWeight:700,color:'#fff',background:couleurCat(a.categorie),padding:'3px 10px',borderRadius:'999px'}}>{a.categorie}</span>
                        {a.type === 'post' && <span style={{fontSize:'10px',fontWeight:700,color:'#fff',background:VIOLET,padding:'3px 10px',borderRadius:'999px'}}>⚡ Post</span>}
                        <span style={{fontSize:'10px',fontWeight:700,color:'#374151',background:'#f3f4f6',padding:'3px 10px',borderRadius:'999px'}}>{a.langue === 'kreyol' ? '🇭🇹 Kreyòl' : '🇫🇷 FR'}</span>
                      </div>
                      <h2 style={{fontWeight:900,fontSize:'16px',margin:'0 0 6px',lineHeight:'1.3'}}>{a.titre}</h2>
                      {a.extrait && <p style={{color:'#6b7280',fontSize:'13px',margin:'0 0 10px',lineHeight:'1.5',flex:1}}>{a.extrait}</p>}
                      <p style={{color:'#9ca3af',fontSize:'11px',margin:0}}>{a.auteur} · {formatDate(a.created_at)}</p>
                    </div>
                  </div>
                </a>
              ))}
            </div>
          </div>

          <aside className="mg-widget-desktop">
            <WidgetMatchs />
          </aside>
        </div>

        <div style={{marginTop:'40px',background:'linear-gradient(135deg,#1a0033,#bf00ff)',borderRadius:'20px',padding:'32px',textAlign:'center'}}>
          <h2 style={{color:'#fff',fontWeight:900,fontSize:'22px',marginBottom:'8px'}}>📬 Reste connecté</h2>
          <p style={{color:'rgba(255,255,255,0.8)',fontSize:'14px',marginBottom:'20px'}}>Reçois les dernières actus et les concours MakeGoal.</p>
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
