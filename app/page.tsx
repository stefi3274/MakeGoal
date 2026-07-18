'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../lib/auth';
import { supabase } from '../lib/supabase';
import Header from '../components/Header';
import Footer from '../components/Footer';

const VIOLET = '#bf00ff';

type Article = {
  id: string; titre: string; categorie: string;
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
    const { data: arts } = await supabase.from('articles').select('id, titre, categorie, image_couverture, extrait, auteur, created_at').eq('publie', true).order('created_at', { ascending: false });
    if (arts) setArticles(arts);
    const { data: mts } = await supabase.from('matchs').select('*').eq('actif', true).order('date_match', { ascending: true });
    if (mts) { setMatchs(mts); mts.forEach(m => chargerStats(m.id)); }
    const { data: c } = await supabase.from('concours').select('*').in('statut', ['ouvert','ferme']).order('created_at', { ascending: false }).limit(1).single();
    if (c) setConcours(c);
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
  const couleurCat = (cat: string) => cat === 'Actualités' ? '#3b82f6' : '#f59e0b';

  // Calcul du Pouls de la communauté
  const totalVotes = Object.values(stats).reduce((acc, s) => acc + s.total, 0);
  let matchChaud: { m: Match; s: VoteStat } | null = null;
  let opinionTranchee: { m: Match; choix: string; pourcent: number } | null = null;
  matchs.forEach(m => {
    const s = stats[m.id];
    if (!s || s.total === 0) return;
    if (!matchChaud || s.total > matchChaud.s.total) matchChaud = { m, s };
    (['1','X','2'] as const).forEach(ch => {
      const p = pct(s[ch], s.total);
      if (!opinionTranchee || p > opinionTranchee.pourcent) opinionTranchee = { m, choix: ch, pourcent: p };
    });
  });

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
