'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../lib/auth';
import { supabase } from '../../lib/supabase';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import { matchVisible } from '../../lib/postVisible';
import { getSport, SPORT_COULEURS, SPORT_LABEL, Sport } from '../../lib/sport';

type Match = {
  id: string;
  equipe1: string;
  equipe2: string;
  competition: string | null;
  date_match: string;
  statut: string;
  score_home: number | null;
  score_away: number | null;
  sport: string | null;
};
type VoteStat = { '1': number; 'X': number; '2': number; total: number };

const pct = (n: number, total: number) => total > 0 ? Math.round((n / total) * 100) : 0;

export default function MatchsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [sport, setSportLocal] = useState<Sport>('football');
  const [matchs, setMatchs] = useState<Match[]>([]);
  const [stats, setStats] = useState<Record<string, VoteStat>>({});
  const [mesVotes, setMesVotes] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => { setSportLocal(getSport()); }, []);
  useEffect(() => { chargerMatchs(); }, [sport]);
  useEffect(() => { if (user && matchs.length > 0) chargerMesVotes(); }, [user, matchs]);

  const couleur = SPORT_COULEURS[sport].primaire;
  const couleurClair = SPORT_COULEURS[sport].clair;

  const chargerMatchs = async () => {
    setLoading(true);
    const { data } = await supabase.from('matchs').select('*').eq('actif', true).eq('sport', sport).order('date_match', { ascending: true });
    if (data) { const visibles = data.filter(m => matchVisible(m.date_match)); setMatchs(visibles); visibles.forEach(m => chargerStats(m.id)); }
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

  const formatDate = (d: string) => new Date(d).toLocaleString('fr-FR', { weekday:'short', day:'numeric', month:'short', hour:'2-digit', minute:'2-digit', timeZone:'America/Port-au-Prince' });

  const optionsVote = sport === 'basketball'
    ? ([['1','equipe1'],['2','equipe2']] as const)
    : ([['1','equipe1'],['X','Nul'],['2','equipe2']] as const);

  return (
    <div style={{minHeight:'100vh',background:'#ffffff',color:'#111',fontFamily:'sans-serif'}}>
      <Header />

      <div style={{background:'linear-gradient(135deg,#1a0033,'+couleur+')',padding:'40px 24px',textAlign:'center'}}>
        <h1 style={{color:'#fff',fontWeight:900,fontSize:'clamp(26px,5vw,40px)',margin:'0 0 8px'}}>{SPORT_LABEL[sport].emoji} Les matchs</h1>
        <p style={{color:'rgba(255,255,255,0.85)',fontSize:'16px',margin:0}}>Votez et voyez ce que pense la communauté.</p>
      </div>

      <main style={{maxWidth:'760px',margin:'0 auto',padding:'32px 16px'}}>
        {loading && <p style={{color:'#9ca3af',textAlign:'center'}}>Chargement…</p>}

        {!loading && matchs.length === 0 && (
          <div style={{background:'#f9fafb',padding:'40px',borderRadius:'16px',textAlign:'center'}}>
            <p style={{color:'#6b7280',margin:0}}>Aucun match pour le moment. Revenez bientôt !</p>
          </div>
        )}

        {matchs.map(m => {
          const s = stats[m.id] || { '1':0,'X':0,'2':0,total:0 };
          const monVote = mesVotes[m.id];
          const termine = m.statut === 'termine';
          return (
            <div key={m.id} style={{border:'1px solid #e5e7eb',borderRadius:'16px',padding:'20px',marginBottom:'16px',boxShadow:'0 2px 8px rgba(0,0,0,0.05)'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'12px',flexWrap:'wrap',gap:'6px'}}>
                {m.competition && <span style={{fontSize:'11px',color:'#9ca3af',textTransform:'uppercase',letterSpacing:'1px',fontWeight:700}}>{m.competition}</span>}
                <span style={{fontSize:'12px',color:'#6b7280'}}>{formatDate(m.date_match)}</span>
              </div>

              <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:'16px',marginBottom:'16px'}}>
                <span style={{fontWeight:900,fontSize:'17px',flex:1,textAlign:'right'}}>{m.equipe1}</span>
                {termine ? (
                  <span style={{fontWeight:900,fontSize:'22px',color:couleur,minWidth:'60px',textAlign:'center'}}>{m.score_home}-{m.score_away}</span>
                ) : (
                  <span style={{fontWeight:900,fontSize:'15px',color:'#9ca3af',minWidth:'40px',textAlign:'center'}}>VS</span>
                )}
                <span style={{fontWeight:900,fontSize:'17px',flex:1,textAlign:'left'}}>{m.equipe2}</span>
              </div>

              {termine && <p style={{textAlign:'center',fontSize:'12px',color:'#10b981',fontWeight:700,margin:'0 0 12px'}}>✓ Match terminé</p>}

              <div style={{display:'flex',gap:'8px'}}>
                {optionsVote.map(([val,label]) => {
                  const libelle = label === 'equipe1' ? m.equipe1 : label === 'equipe2' ? m.equipe2 : label;
                  const pourcent = pct(s[val as '1'|'X'|'2'], s.total);
                  const actif = monVote === val;
                  return (
                    <button key={val} disabled={termine} onClick={() => voter(m.id, val as '1'|'X'|'2')} style={{
                      flex:1, position:'relative', overflow:'hidden',
                      padding:'12px 8px', borderRadius:'10px', cursor:termine?'default':'pointer',
                      border: actif ? '2px solid '+couleur : '2px solid #e5e7eb',
                      background: actif ? couleurClair : '#fff', textAlign:'center'
                    }}>
                      <div style={{position:'absolute',bottom:0,left:0,height:'4px',width:pourcent+'%',background:actif?couleur:'#e5d9ff',transition:'width 0.4s'}}/>
                      <div style={{fontWeight:900,fontSize:'16px',color:actif?couleur:'#374151'}}>{val}</div>
                      <div style={{fontSize:'10px',color:'#9ca3af',fontWeight:600,marginTop:'2px'}}>{libelle}</div>
                      <div style={{fontSize:'13px',color:actif?couleur:'#6b7280',fontWeight:900,marginTop:'4px'}}>{s.total>0?pourcent+'%':'—'}</div>
                    </button>
                  );
                })}
              </div>
              <p style={{textAlign:'center',fontSize:'11px',color:'#9ca3af',margin:'8px 0 0'}}>
                {s.total>0 ? s.total+' vote'+(s.total>1?'s':'') : 'Soyez le premier à voter'}
                {!user && ' · connectez-vous pour voter'}
              </p>
            </div>
          );
        })}
      </main>
      <Footer />
    </div>
  );
}
