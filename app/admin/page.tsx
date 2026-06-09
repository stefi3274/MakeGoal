'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { MATCHES } from '../../data/matches';

const VIOLET = '#bf00ff';

const NIVEAUX = [
  { key: 'Kiyès k ap bat ?', emoji: '⚽', color: '#10b981' },
  { key: 'Bèl ti stat', emoji: '📊', color: '#3b82f6' },
  { key: 'Kiyès k ap fè Gòl ?', emoji: '🎯', color: '#f59e0b' },
  { key: 'Divinò', emoji: '🔮', color: '#eab308' },
  { key: 'Bèl Mirak', emoji: '🌈', color: '#8b00ff' },
];

const coteToPct = (cote: string) => {
  const n = parseFloat(cote);
  if (!n || n <= 0) return '';
  return Math.round((1 / n) * 100) + '%';
};

const outsider = (cote1: string, cote2: string, eq1: string, eq2: string) => {
  const n1 = parseFloat(cote1);
  const n2 = parseFloat(cote2);
  if (!n1 || !n2) return eq2;
  return n1 > n2 ? eq1 : eq2;
};

type PronosticExistant = {
  id: string;
  match: string;
  date_match: string;
  publie: boolean;
  confiance_globale: number;
};

type Stats = {
  totalPronostics: number;
  totalPublies: number;
  totalVotesUp: number;
  totalVotesDown: number;
  totalPartages: number;
  totalNewsletter: number;
};

type PronosticStats = {
  id: string;
  match: string;
  publie: boolean;
  vues: number;
  votes_up: number;
  votes_down: number;
  partages: number;
};

type Score = { match_id: number; home_score: number; away_score: number; statut: string; };
type Pari = { niveau: string; categorie: string; type_pari: string; valeur: string; cote: number | null; confiance: number | null; ordre: number; pronostic_id?: string; };

export default function Admin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [connecte, setConnecte] = useState(false);
  const [erreurAuth, setErreurAuth] = useState('');
  const [vue, setVue] = useState<'dashboard' | 'nouveau' | 'scores' | 'stats'>('dashboard');
  const [pronostics, setPronostics] = useState<PronosticExistant[]>([]);
  const [pronosticsStats, setPronosticsStats] = useState<PronosticStats[]>([]);
  const [scores, setScores] = useState<Score[]>([]);
  const [globalStats, setGlobalStats] = useState<Stats>({ totalPronostics:0, totalPublies:0, totalVotesUp:0, totalVotesDown:0, totalPartages:0, totalNewsletter:0 });
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [analysing, setAnalysing] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  const [equipe1, setEquipe1] = useState('');
  const [equipe2, setEquipe2] = useState('');
  const [competition, setCompetition] = useState('');
  const [dateMatch, setDateMatch] = useState('');
  const [lieu, setLieu] = useState('');
  const [contexte, setContexte] = useState('');
  const [confiance, setConfiance] = useState(3);

  const [bat, setBat] = useState({ v1:'', nul:'', v2:'', dc1x:'', dcx2:'' });
  const [stats, setStats] = useState<{id:number;plusMoins:string;seuil:string;categorie:string;cote:string}[]>([]);
  const [gols, setGols] = useState({ totalPM:'plus',totalSeuil:'',totalCote:'',eq1PM:'plus',eq1Seuil:'',eq1Cote:'',eq2PM:'plus',eq2Seuil:'',eq2Cote:'' });
  const [divino, setDivino] = useState<{id:number;categorie:string;valeur:string;cote:string}[]>([]);
  const [mirak, setMirak] = useState({ coteVictoire:'', coteButs:'' });

  const [scoreMatchId, setScoreMatchId] = useState('');
  const [scoreHome, setScoreHome] = useState('');
  const [scoreAway, setScoreAway] = useState('');
  const [scoreStatut, setScoreStatut] = useState('final');

  const matchNom = equipe1 && equipe2 ? equipe1 + ' vs ' + equipe2 : '';
  const equipeOutsider = outsider(bat.v1, bat.v2, equipe1, equipe2);

  const prochainMatchs = MATCHES.filter(m => {
    const hasScore = scores.find(s => s.match_id === m.id);
    return !hasScore;
  }).slice(0, 5);

  useEffect(() => { supabase.auth.getSession().then(({ data }) => { if (data.session) setConnecte(true); }); }, []);
  useEffect(() => { if (connecte) { chargerTout(); } }, [connecte]);

  const chargerTout = async () => {
    chargerPronostics();
    chargerScores();
    chargerStats();
  };

  const chargerPronostics = async () => {
    const { data } = await supabase.from('pronostics').select('id, match, date_match, publie, confiance_globale').order('date_match', { ascending: false });
    if (data) setPronostics(data);
  };

  const chargerScores = async () => {
    const { data } = await supabase.from('scores').select('*');
    if (data) setScores(data);
  };

  const chargerStats = async () => {
    const { data: pronos } = await supabase.from('pronostics').select('id, match, publie, vues');
    const { data: votesData } = await supabase.from('votes').select('pronostic_id, type');
    const { data: partagsData } = await supabase.from('partages').select('pronostic_id');
    const { data: newsletterData } = await supabase.from('newsletter').select('id');

    if (pronos) {
      const statsParProno: PronosticStats[] = pronos.map(p => ({
        id: p.id,
        match: p.match,
        publie: p.publie,
        vues: p.vues || 0,
        votes_up: votesData?.filter(v => v.pronostic_id === p.id && v.type === 'up').length || 0,
        votes_down: votesData?.filter(v => v.pronostic_id === p.id && v.type === 'down').length || 0,
        partages: partagsData?.filter(v => v.pronostic_id === p.id).length || 0,
      }));
      setPronosticsStats(statsParProno);

      setGlobalStats({
        totalPronostics: pronos.length,
        totalPublies: pronos.filter(p => p.publie).length,
        totalVotesUp: votesData?.filter(v => v.type === 'up').length || 0,
        totalVotesDown: votesData?.filter(v => v.type === 'down').length || 0,
        totalPartages: partagsData?.length || 0,
        totalNewsletter: newsletterData?.length || 0,
      });
    }
  };

  const seConnecter = async () => {
    setErreurAuth('');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setErreurAuth('Email ou mot de passe incorrect.');
    else setConnecte(true);
  };

  const seDeconnecter = async () => { await supabase.auth.signOut(); setConnecte(false); };

  const togglePublie = async (id: string, publie: boolean) => {
    await fetch('/api/admin/pronostic', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, publie: !publie }) });
    chargerTout();
  };

  const supprimerPronostic = async (id: string) => {
    if (!confirm('Supprimer ce pronostic et tous ses paris ?')) return;
    await supabase.from('pronostics_paris').delete().eq('pronostic_id', id);
    await supabase.from('pronostics').delete().eq('id', id);
    chargerTout();
  };

  const modifierPronostic = async (id: string) => {
    const { data: p } = await supabase.from('pronostics').select('*, pronostics_paris(*)').eq('id', id).single();
    if (!p) return;
    const equipes = p.match.split(' vs ');
    setEquipe1(equipes[0] || ''); setEquipe2(equipes[1] || '');
    setCompetition(p.competition || ''); setDateMatch(p.date_match ? p.date_match.slice(0, 16) : '');
    setLieu(p.lieu || ''); setContexte(p.contexte || ''); setConfiance(p.confiance_globale || 3);
    setEditId(id); setVue('nouveau');
  };

  const analyserAvecIA = async () => {
    if (!matchNom) { setMessage('Entre les deux équipes avant.'); return; }
    setAnalysing(true); setMessage('');
    try {
      const res = await fetch('/api/admin/analyse', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ match: matchNom, competition, date_match: dateMatch }) });
      const data = await res.json();
      if (data.success && data.analyse) {
        setContexte(data.analyse.contexte || '');
        setConfiance(data.analyse.confiance_globale || 3);
        setMessage('✅ Analyse IA terminée !');
      } else { setMessage('❌ Erreur IA : ' + (data.error || 'inconnue')); }
    } catch { setMessage('❌ Erreur connexion IA.'); }
    setAnalysing(false);
  };

  const construireParis = (): Pari[] => {
    const paris: Pari[] = [];
    let ordre = 1;
    if (bat.v1) paris.push({ niveau:'Kiyès k ap bat ?', categorie:'Résultat', type_pari:'Match Result', valeur:'Victoire '+equipe1, cote:parseFloat(bat.v1), confiance:4, ordre:ordre++ });
    if (bat.nul) paris.push({ niveau:'Kiyès k ap bat ?', categorie:'Résultat', type_pari:'Match Result', valeur:'Match nul', cote:parseFloat(bat.nul), confiance:3, ordre:ordre++ });
    if (bat.v2) paris.push({ niveau:'Kiyès k ap bat ?', categorie:'Résultat', type_pari:'Match Result', valeur:'Victoire '+equipe2, cote:parseFloat(bat.v2), confiance:3, ordre:ordre++ });
    if (bat.dc1x) paris.push({ niveau:'Kiyès k ap bat ?', categorie:'Double Chance', type_pari:'Double Chance', valeur:'1X — '+equipe1+' ou Nul', cote:parseFloat(bat.dc1x), confiance:4, ordre:ordre++ });
    if (bat.dcx2) paris.push({ niveau:'Kiyès k ap bat ?', categorie:'Double Chance', type_pari:'Double Chance', valeur:'X2 — Nul ou '+equipe2, cote:parseFloat(bat.dcx2), confiance:3, ordre:ordre++ });
    stats.forEach(s => { if (s.seuil && s.cote) paris.push({ niveau:'Bèl ti stat', categorie:s.categorie, type_pari:s.categorie, valeur:(s.plusMoins==='plus'?'Plus de ':'Moins de ')+s.seuil+' '+s.categorie.toLowerCase(), cote:parseFloat(s.cote), confiance:3, ordre:ordre++ }); });
    if (gols.totalSeuil && gols.totalCote) paris.push({ niveau:'Kiyès k ap fè Gòl ?', categorie:'Buts total', type_pari:'Total Goals', valeur:(gols.totalPM==='plus'?'Plus de ':'Moins de ')+gols.totalSeuil+' buts', cote:parseFloat(gols.totalCote), confiance:3, ordre:ordre++ });
    if (gols.eq1Seuil && gols.eq1Cote) paris.push({ niveau:'Kiyès k ap fè Gòl ?', categorie:'Buts '+equipe1, type_pari:'Team Goals', valeur:(gols.eq1PM==='plus'?'Plus de ':'Moins de ')+gols.eq1Seuil+' buts '+equipe1, cote:parseFloat(gols.eq1Cote), confiance:3, ordre:ordre++ });
    if (gols.eq2Seuil && gols.eq2Cote) paris.push({ niveau:'Kiyès k ap fè Gòl ?', categorie:'Buts '+equipe2, type_pari:'Team Goals', valeur:(gols.eq2PM==='plus'?'Plus de ':'Moins de ')+gols.eq2Seuil+' buts '+equipe2, cote:parseFloat(gols.eq2Cote), confiance:3, ordre:ordre++ });
    divino.forEach(d => { if (d.valeur && d.cote) paris.push({ niveau:'Divinò', categorie:d.categorie, type_pari:d.categorie, valeur:d.valeur, cote:parseFloat(d.cote), confiance:3, ordre:ordre++ }); });
    if (mirak.coteVictoire) paris.push({ niveau:'Bèl Mirak', categorie:'Victoire Surprise', type_pari:'Upset', valeur:'Victoire '+equipeOutsider, cote:parseFloat(mirak.coteVictoire), confiance:2, ordre:ordre++ });
    if (mirak.coteButs) paris.push({ niveau:'Bèl Mirak', categorie:'Buts Outsider', type_pari:'Goals', valeur:'Plus de 1.5 buts '+equipeOutsider, cote:parseFloat(mirak.coteButs), confiance:2, ordre:ordre++ });
    return paris;
  };

  const sauvegarder = async (publier: boolean) => {
    if (!matchNom || !dateMatch) { setMessage('Deux équipes et date obligatoires.'); return; }
    setSaving(true); setMessage('');
    const paris = construireParis();
    if (editId) {
      await supabase.from('pronostics').update({ match:matchNom, competition, date_match:dateMatch, lieu, contexte, confiance_globale:confiance }).eq('id', editId);
      await supabase.from('pronostics_paris').delete().eq('pronostic_id', editId);
      await supabase.from('pronostics_paris').insert(paris.map(p => ({ ...p, pronostic_id:editId })));
      await supabase.from('pronostics').update({ publie:publier }).eq('id', editId);
      setSaving(false); setMessage('✅ Modification sauvegardée !'); setEditId(null);
      chargerTout(); setTimeout(() => setVue('dashboard'), 1500); return;
    }
    const res = await fetch('/api/admin/pronostic', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ match:matchNom, competition, date_match:dateMatch, lieu, contexte, confiance_globale:confiance, paris }) });
    const data = await res.json();
    if (data.success && publier) { await fetch('/api/admin/pronostic', { method:'PATCH', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ id:data.id, publie:true }) }); }
    setSaving(false);
    if (data.success) {
      setMessage(publier ? '✅ Publié !' : '✅ Brouillon sauvegardé !');
      setEquipe1(''); setEquipe2(''); setCompetition(''); setDateMatch(''); setLieu(''); setContexte(''); setConfiance(3);
      setBat({ v1:'', nul:'', v2:'', dc1x:'', dcx2:'' });
      setStats([]); setGols({ totalPM:'plus',totalSeuil:'',totalCote:'',eq1PM:'plus',eq1Seuil:'',eq1Cote:'',eq2PM:'plus',eq2Seuil:'',eq2Cote:'' });
      setDivino([]); setMirak({ coteVictoire:'', coteButs:'' });
      chargerTout(); setTimeout(() => setVue('dashboard'), 1500);
    } else { setMessage('❌ Erreur : ' + (data.error || 'inconnue')); }
  };

  const enregistrerScore = async () => {
    if (!scoreMatchId || scoreHome === '' || scoreAway === '') { setMessage('Match et scores obligatoires.'); return; }
    const res = await fetch('/api/scores', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ match_id:parseInt(scoreMatchId), home_score:parseInt(scoreHome), away_score:parseInt(scoreAway), statut:scoreStatut }) });
    const data = await res.json();
    if (data.success) {
      setMessage('✅ Score enregistré !');
      setScoreMatchId(''); setScoreHome(''); setScoreAway(''); setScoreStatut('final');
      chargerScores();
    } else { setMessage('❌ Erreur : ' + (data.error || 'inconnue')); }
  };

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

  const inputStyle = {width:'100%',padding:'10px',borderRadius:'8px',border:'1px solid #e5e7eb',fontSize:'14px',boxSizing:'border-box' as const};
  const labelStyle = {fontSize:'12px',color:'#6b7280',display:'block' as const,marginBottom:'4px'};
  const sectionStyle = {background:'#fff',border:'1px solid #e5e7eb',borderRadius:'12px',padding:'20px',marginBottom:'16px'};
  const pmBtn = (actif: boolean, color: string) => ({ flex:1,padding:'9px',borderRadius:'8px',border:'2px solid '+(actif?color:'#e5e7eb'),background:actif?color+'15':'#fff',color:actif?color:'#6b7280',fontWeight:700 as const,cursor:'pointer' as const,fontSize:'13px' });

  const navBtn = (v: typeof vue, label: string, color: string) => (
    <button onClick={() => setVue(v)} style={{padding:'10px 20px',borderRadius:'999px',border:'none',cursor:'pointer',fontWeight:700,fontSize:'14px',background:vue===v?color:'#333',color:'#fff'}}>
      {label}
    </button>
  );

  return (
    <div style={{minHeight:'100vh',background:'#0f0f0f',fontFamily:'sans-serif'}}>
      <header style={{background:'#111',padding:'12px 24px',display:'flex',justifyContent:'space-between',alignItems:'center',borderBottom:'1px solid #222'}}>
        <h1 style={{color:VIOLET,fontWeight:900,fontSize:'18px',margin:0}}>🏆 MakeGoal Admin</h1>
        <div style={{display:'flex',gap:'8px'}}>
          {navBtn('dashboard','📊 Dashboard','#7c3aed')}
          {navBtn('stats','📈 Stats','#0891b2')}
          {navBtn('scores','⚽ Scores','#10b981')}
          {navBtn('nouveau',editId?'✏️ Modifier':'➕ Nouveau',VIOLET)}
          <button onClick={seDeconnecter} style={{background:'#ef4444',color:'#fff',border:'none',padding:'10px 16px',borderRadius:'999px',cursor:'pointer',fontWeight:700,fontSize:'14px'}}>Déconnexion</button>
        </div>
      </header>

      {message && (
        <div style={{padding:'12px 24px',background:message.includes('❌')?'#7f1d1d':'#064e3b',color:message.includes('❌')?'#fca5a5':'#6ee7b7',fontWeight:700,fontSize:'14px'}}>
          {message}
        </div>
      )}

      {vue === 'dashboard' && (
        <main style={{maxWidth:'1000px',margin:'0 auto',padding:'32px 16px'}}>

          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))',gap:'16px',marginBottom:'32px'}}>
            {[
              { label:'Pronostics', value:globalStats.totalPronostics, color:'#7c3aed', icon:'📋' },
              { label:'Publiés', value:globalStats.totalPublies, color:'#10b981', icon:'✅' },
              { label:'Votes 👍', value:globalStats.totalVotesUp, color:'#3b82f6', icon:'👍' },
              { label:'Votes 👎', value:globalStats.totalVotesDown, color:'#ef4444', icon:'👎' },
              { label:'Partages WA', value:globalStats.totalPartages, color:'#25D366', icon:'📱' },
              { label:'Newsletter', value:globalStats.totalNewsletter, color:'#f59e0b', icon:'📬' },
            ].map(s => (
              <div key={s.label} style={{background:'#1a1a1a',border:'1px solid #333',borderRadius:'12px',padding:'20px',textAlign:'center'}}>
                <div style={{fontSize:'28px',marginBottom:'8px'}}>{s.icon}</div>
                <div style={{fontSize:'32px',fontWeight:900,color:s.color}}>{s.value}</div>
                <div style={{fontSize:'12px',color:'#6b7280',marginTop:'4px'}}>{s.label}</div>
              </div>
            ))}
          </div>

          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'16px',marginBottom:'32px'}}>
            <div style={{background:'#1a1a1a',border:'1px solid #333',borderRadius:'12px',padding:'20px'}}>
              <h3 style={{color:'#fff',fontWeight:700,marginBottom:'16px',fontSize:'16px'}}>📅 Prochains matchs</h3>
              {prochainMatchs.length === 0 && <p style={{color:'#6b7280',fontSize:'14px'}}>Tous les matchs ont un score.</p>}
              {prochainMatchs.map(m => {
                const aProno = pronostics.find(p => p.match === m.home + ' vs ' + m.away);
                return (
                  <div key={m.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 0',borderBottom:'1px solid #222'}}>
                    <div>
                      <p style={{color:'#fff',fontWeight:600,fontSize:'13px',margin:0}}>{m.home} vs {m.away}</p>
                      <p style={{color:'#6b7280',fontSize:'11px',margin:0}}>{m.date} · {m.time}</p>
                    </div>
                    <span style={{fontSize:'11px',padding:'2px 8px',borderRadius:'999px',background:aProno?'#10b981':'#374151',color:'#fff'}}>
                      {aProno ? '✓ Prono' : 'Sans prono'}
                    </span>
                  </div>
                );
              })}
            </div>

            <div style={{background:'#1a1a1a',border:'1px solid #333',borderRadius:'12px',padding:'20px'}}>
              <h3 style={{color:'#fff',fontWeight:700,marginBottom:'16px',fontSize:'16px'}}>🏆 Pronostics récents</h3>
              {pronostics.slice(0, 5).map(p => (
                <div key={p.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 0',borderBottom:'1px solid #222',gap:'8px'}}>
                  <p style={{color:'#fff',fontWeight:600,fontSize:'13px',margin:0,flex:1}}>{p.match}</p>
                  <div style={{display:'flex',gap:'6px'}}>
                    <button onClick={() => togglePublie(p.id, p.publie)} style={{padding:'4px 10px',borderRadius:'999px',border:'none',cursor:'pointer',fontWeight:700,fontSize:'11px',background:p.publie?'#10b981':'#374151',color:'#fff'}}>
                      {p.publie ? '✓' : '○'}
                    </button>
                    <button onClick={() => modifierPronostic(p.id)} style={{padding:'4px 10px',borderRadius:'999px',border:'none',cursor:'pointer',fontWeight:700,fontSize:'11px',background:'#7c3aed',color:'#fff'}}>✏️</button>
                    <button onClick={() => supprimerPronostic(p.id)} style={{padding:'4px 10px',borderRadius:'999px',border:'none',cursor:'pointer',fontWeight:700,fontSize:'11px',background:'#7f1d1d',color:'#fff'}}>🗑️</button>
                  </div>
                </div>
              ))}
              {pronostics.length > 5 && (
                <p style={{color:'#6b7280',fontSize:'12px',textAlign:'center',marginTop:'8px'}}>
                  + {pronostics.length - 5} autres pronostics
                </p>
              )}
            </div>
          </div>

          <div style={{background:'#1a1a1a',border:'1px solid #333',borderRadius:'12px',padding:'20px'}}>
            <h3 style={{color:'#fff',fontWeight:700,marginBottom:'16px',fontSize:'16px'}}>📋 Tous les pronostics</h3>
            {pronostics.map(p => (
              <div key={p.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'12px 0',borderBottom:'1px solid #222',gap:'12px',flexWrap:'wrap'}}>
                <div>
                  <p style={{color:'#fff',fontWeight:700,margin:0,marginBottom:'2px'}}>{p.match}</p>
                  <p style={{color:'#6b7280',fontSize:'12px',margin:0}}>{new Date(p.date_match).toLocaleDateString('fr-FR')} — {'★'.repeat(p.confiance_globale)}</p>
                </div>
                <div style={{display:'flex',gap:'8px',flexWrap:'wrap'}}>
                  <button onClick={() => togglePublie(p.id, p.publie)} style={{padding:'6px 14px',borderRadius:'999px',border:'none',cursor:'pointer',fontWeight:700,fontSize:'12px',background:p.publie?'#10b981':'#374151',color:'#fff'}}>
                    {p.publie ? '✓ Publié' : 'Brouillon'}
                  </button>
                  <button onClick={() => modifierPronostic(p.id)} style={{padding:'6px 14px',borderRadius:'999px',border:'2px solid '+VIOLET,background:'transparent',color:VIOLET,cursor:'pointer',fontWeight:700,fontSize:'12px'}}>✏️ Modifier</button>
                  <button onClick={() => supprimerPronostic(p.id)} style={{padding:'6px 14px',borderRadius:'999px',border:'2px solid #ef4444',background:'transparent',color:'#ef4444',cursor:'pointer',fontWeight:700,fontSize:'12px'}}>🗑️ Supprimer</button>
                </div>
              </div>
            ))}
          </div>
        </main>
      )}

      {vue === 'stats' && (
        <main style={{maxWidth:'1000px',margin:'0 auto',padding:'32px 16px'}}>
          <h2 style={{color:'#fff',fontWeight:900,fontSize:'24px',marginBottom:'24px'}}>📈 Statistiques détaillées</h2>
          <div style={{background:'#1a1a1a',border:'1px solid #333',borderRadius:'12px',padding:'20px'}}>
            <table style={{width:'100%',borderCollapse:'collapse',fontSize:'14px',color:'#fff'}}>
              <thead>
                <tr style={{borderBottom:'1px solid #333'}}>
                  <th style={{padding:'10px 8px',textAlign:'left',color:'#6b7280',fontWeight:600}}>Match</th>
                  <th style={{padding:'10px 8px',textAlign:'center',color:'#6b7280',fontWeight:600}}>Statut</th>
                  <th style={{padding:'10px 8px',textAlign:'center',color:'#6b7280',fontWeight:600}}>Vues</th>
                  <th style={{padding:'10px 8px',textAlign:'center',color:'#6b7280',fontWeight:600}}>👍</th>
                  <th style={{padding:'10px 8px',textAlign:'center',color:'#6b7280',fontWeight:600}}>👎</th>
                  <th style={{padding:'10px 8px',textAlign:'center',color:'#6b7280',fontWeight:600}}>📱 WA</th>
                  <th style={{padding:'10px 8px',textAlign:'center',color:'#6b7280',fontWeight:600}}>Score</th>
                </tr>
              </thead>
              <tbody>
                {pronosticsStats.map(p => {
                  const total = p.votes_up + p.votes_down;
                  const pct = total > 0 ? Math.round((p.votes_up / total) * 100) : 0;
                  return (
                    <tr key={p.id} style={{borderBottom:'1px solid #222'}}>
                      <td style={{padding:'12px 8px',fontWeight:600}}>{p.match}</td>
                      <td style={{padding:'12px 8px',textAlign:'center'}}>
                        <span style={{background:p.publie?'#10b981':'#374151',color:'#fff',padding:'2px 8px',borderRadius:'999px',fontSize:'11px'}}>
                          {p.publie ? 'Publié' : 'Brouillon'}
                        </span>
                      </td>
                      <td style={{padding:'12px 8px',textAlign:'center',color:'#9ca3af'}}>{p.vues}</td>
                      <td style={{padding:'12px 8px',textAlign:'center',color:'#10b981',fontWeight:700}}>{p.votes_up}</td>
                      <td style={{padding:'12px 8px',textAlign:'center',color:'#ef4444',fontWeight:700}}>{p.votes_down}</td>
                      <td style={{padding:'12px 8px',textAlign:'center',color:'#25D366',fontWeight:700}}>{p.partages}</td>
                      <td style={{padding:'12px 8px',textAlign:'center'}}>
                        {total > 0 ? (
                          <div style={{display:'flex',alignItems:'center',gap:'6px',justifyContent:'center'}}>
                            <div style={{width:'60px',height:'6px',background:'#374151',borderRadius:'999px',overflow:'hidden'}}>
                              <div style={{width:pct+'%',height:'100%',background:'#10b981',borderRadius:'999px'}}/>
                            </div>
                            <span style={{fontSize:'11px',color:'#10b981'}}>{pct}%</span>
                          </div>
                        ) : <span style={{color:'#374151',fontSize:'12px'}}>—</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </main>
      )}

      {vue === 'scores' && (
        <main style={{maxWidth:'800px',margin:'0 auto',padding:'32px 16px'}}>
          <h2 style={{color:'#fff',fontWeight:900,fontSize:'24px',marginBottom:'24px'}}>⚽ Entrer un score</h2>
          <div style={{...sectionStyle,background:'#1a1a1a',border:'1px solid #333'}}>
            <div style={{marginBottom:'16px'}}>
              <label style={{...labelStyle,color:'#9ca3af'}}>Match</label>
              <select value={scoreMatchId} onChange={e => setScoreMatchId(e.target.value)} style={{...inputStyle,background:'#222',color:'#fff',border:'1px solid #333'}}>
                <option value="">-- Choisir un match --</option>
                {MATCHES.map(m => <option key={m.id} value={m.id}>{m.date} — {m.home} vs {m.away}</option>)}
              </select>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr auto 1fr',gap:'16px',alignItems:'center',marginBottom:'16px'}}>
              <div>
                <label style={{...labelStyle,color:'#9ca3af'}}>{scoreMatchId ? MATCHES.find(m => m.id === parseInt(scoreMatchId))?.home || 'Équipe 1' : 'Équipe 1'}</label>
                <input type="number" min={0} value={scoreHome} onChange={e => setScoreHome(e.target.value)} placeholder="0" style={{...inputStyle,textAlign:'center',fontSize:'24px',fontWeight:900,background:'#222',color:'#fff',border:'1px solid #333'}}/>
              </div>
              <div style={{textAlign:'center',fontWeight:900,fontSize:'20px',color:'#6b7280',paddingTop:'18px'}}>—</div>
              <div>
                <label style={{...labelStyle,color:'#9ca3af'}}>{scoreMatchId ? MATCHES.find(m => m.id === parseInt(scoreMatchId))?.away || 'Équipe 2' : 'Équipe 2'}</label>
                <input type="number" min={0} value={scoreAway} onChange={e => setScoreAway(e.target.value)} placeholder="0" style={{...inputStyle,textAlign:'center',fontSize:'24px',fontWeight:900,background:'#222',color:'#fff',border:'1px solid #333'}}/>
              </div>
            </div>
            <div style={{marginBottom:'16px'}}>
              <label style={{...labelStyle,color:'#9ca3af'}}>Statut</label>
              <select value={scoreStatut} onChange={e => setScoreStatut(e.target.value)} style={{...inputStyle,background:'#222',color:'#fff',border:'1px solid #333'}}>
                <option value="final">Final</option>
                <option value="en cours">En cours</option>
                <option value="annulé">Annulé</option>
              </select>
            </div>
            <button onClick={enregistrerScore} style={{width:'100%',padding:'14px',background:'#10b981',color:'#fff',border:'none',borderRadius:'999px',cursor:'pointer',fontWeight:700,fontSize:'15px'}}>
              ✅ Enregistrer le score
            </button>
          </div>

          <div style={{...sectionStyle,background:'#1a1a1a',border:'1px solid #333'}}>
            <h3 style={{color:'#fff',fontWeight:700,marginBottom:'12px',fontSize:'16px'}}>Scores enregistrés</h3>
            {scores.length === 0 && <p style={{color:'#6b7280',fontSize:'14px'}}>Aucun score enregistré.</p>}
            {scores.map(s => {
              const m = MATCHES.find(x => x.id === s.match_id);
              if (!m) return null;
              return (
                <div key={s.match_id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'10px 0',borderBottom:'1px solid #222'}}>
                  <span style={{fontSize:'14px',fontWeight:600,color:'#fff'}}>{m.home} vs {m.away}</span>
                  <div style={{display:'flex',gap:'12px',alignItems:'center'}}>
                    <span style={{fontWeight:900,fontSize:'18px',color:VIOLET}}>{s.home_score} — {s.away_score}</span>
                    <span style={{fontSize:'11px',background:s.statut==='final'?'#10b981':s.statut==='en cours'?'#f59e0b':'#ef4444',color:'#fff',padding:'2px 8px',borderRadius:'999px'}}>{s.statut}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </main>
      )}

      {vue === 'nouveau' && (
        <main style={{maxWidth:'800px',margin:'0 auto',padding:'32px 16px'}}>
          <h2 style={{color:'#fff',fontWeight:900,fontSize:'24px',marginBottom:'24px'}}>{editId ? '✏️ Modifier' : '➕ Nouveau Pronostic'}</h2>

          <div style={sectionStyle}>
            <h3 style={{fontWeight:700,marginBottom:'16px',fontSize:'16px'}}>⚽ Les deux équipes</h3>
            <div style={{display:'grid',gridTemplateColumns:'1fr auto 1fr',gap:'12px',alignItems:'center',marginBottom:'12px'}}>
              <div><label style={labelStyle}>Équipe 1 (Domicile) *</label><input value={equipe1} onChange={e => setEquipe1(e.target.value)} placeholder="Mexique" style={{...inputStyle,fontWeight:600}}/></div>
              <div style={{textAlign:'center',fontWeight:900,fontSize:'18px',color:'#9ca3af',paddingTop:'18px'}}>VS</div>
              <div><label style={labelStyle}>Équipe 2 (Extérieur) *</label><input value={equipe2} onChange={e => setEquipe2(e.target.value)} placeholder="Afrique du Sud" style={{...inputStyle,fontWeight:600}}/></div>
            </div>
            {matchNom && <div style={{background:'#faf5ff',border:'1px solid '+VIOLET,borderRadius:'8px',padding:'10px',textAlign:'center',marginBottom:'12px'}}><span style={{color:VIOLET,fontWeight:900,fontSize:'16px'}}>{matchNom}</span></div>}
            <div style={{marginBottom:'12px'}}><label style={labelStyle}>Compétition</label><input value={competition} onChange={e => setCompetition(e.target.value)} placeholder="FIFA World Cup 2026" style={inputStyle}/></div>
            <div style={{marginBottom:'12px'}}><label style={labelStyle}>Lieu (Stade)</label><input value={lieu} onChange={e => setLieu(e.target.value)} placeholder="Estadio Azteca, Mexico City" style={inputStyle}/></div>
            <div style={{marginBottom:'12px'}}><label style={labelStyle}>Date et heure *</label><input type="datetime-local" value={dateMatch} onChange={e => setDateMatch(e.target.value)} style={inputStyle}/></div>
            <div style={{marginBottom:'12px'}}><label style={labelStyle}>Contexte / Analyse</label><textarea value={contexte} onChange={e => setContexte(e.target.value)} rows={3} placeholder="Analyse du match..." style={{...inputStyle,resize:'vertical'}}/></div>
            <div style={{marginBottom:'12px'}}>
              <label style={labelStyle}>Confiance globale : {'★'.repeat(confiance)+'☆'.repeat(5-confiance)}</label>
              <input type="range" min={1} max={5} value={confiance} onChange={e => setConfiance(Number(e.target.value))} style={{width:'100%'}}/>
            </div>
            <button onClick={analyserAvecIA} disabled={analysing||!matchNom} style={{width:'100%',padding:'11px',background:analysing?'#9ca3af':'#111',color:'#fff',border:'none',borderRadius:'8px',cursor:'pointer',fontWeight:700,fontSize:'13px'}}>
              {analysing ? '🤖 Analyse en cours...' : '🤖 Analyser avec l\'IA (optionnel)'}
            </button>
          </div>

          <div style={sectionStyle}>
            <h3 style={{fontWeight:700,marginBottom:'16px',fontSize:'16px'}}>⚽ Kiyès k ap bat ?</h3>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'12px',marginBottom:'12px'}}>
              <div><label style={labelStyle}>Victoire {equipe1||'Équipe 1'}</label><input type="number" step="0.01" value={bat.v1} onChange={e => setBat({...bat,v1:e.target.value})} placeholder="1.43" style={inputStyle}/>{bat.v1&&<p style={{fontSize:'11px',color:VIOLET,margin:'3px 0 0',fontWeight:700}}>{coteToPct(bat.v1)}</p>}</div>
              <div><label style={labelStyle}>Match nul</label><input type="number" step="0.01" value={bat.nul} onChange={e => setBat({...bat,nul:e.target.value})} placeholder="4.50" style={inputStyle}/>{bat.nul&&<p style={{fontSize:'11px',color:VIOLET,margin:'3px 0 0',fontWeight:700}}>{coteToPct(bat.nul)}</p>}</div>
              <div><label style={labelStyle}>Victoire {equipe2||'Équipe 2'}</label><input type="number" step="0.01" value={bat.v2} onChange={e => setBat({...bat,v2:e.target.value})} placeholder="9.50" style={inputStyle}/>{bat.v2&&<p style={{fontSize:'11px',color:VIOLET,margin:'3px 0 0',fontWeight:700}}>{coteToPct(bat.v2)}</p>}</div>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px'}}>
              <div><label style={labelStyle}>Double Chance 1X</label><input type="number" step="0.01" value={bat.dc1x} onChange={e => setBat({...bat,dc1x:e.target.value})} placeholder="1.15" style={inputStyle}/>{bat.dc1x&&<p style={{fontSize:'11px',color:VIOLET,margin:'3px 0 0',fontWeight:700}}>{coteToPct(bat.dc1x)}</p>}</div>
              <div><label style={labelStyle}>Double Chance X2</label><input type="number" step="0.01" value={bat.dcx2} onChange={e => setBat({...bat,dcx2:e.target.value})} placeholder="1.55" style={inputStyle}/>{bat.dcx2&&<p style={{fontSize:'11px',color:VIOLET,margin:'3px 0 0',fontWeight:700}}>{coteToPct(bat.dcx2)}</p>}</div>
            </div>
          </div>

          <div style={sectionStyle}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'16px'}}>
              <h3 style={{fontWeight:700,fontSize:'16px',margin:0}}>📊 Bèl ti stat</h3>
              <button onClick={() => setStats([...stats,{id:Date.now(),plusMoins:'plus',seuil:'',categorie:'Tir',cote:''}])} style={{background:'#111',color:'#fff',border:'none',padding:'6px 14px',borderRadius:'999px',cursor:'pointer',fontWeight:700,fontSize:'12px'}}>+ Ajouter</button>
            </div>
            {stats.map((s,i) => (
              <div key={s.id} style={{background:'#f9fafb',borderRadius:'8px',padding:'12px',marginBottom:'8px'}}>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px',marginBottom:'8px'}}>
                  <div>
                    <label style={labelStyle}>Catégorie</label>
                    <select value={s.categorie} onChange={e => setStats(stats.map((x,j) => j===i?{...x,categorie:e.target.value}:x))} style={{...inputStyle,padding:'8px'}}>
                      {['Tir','Tir cadré','Corners','Carton Jaune','Carton Rouge','Hors-jeu','Touche'].map(c => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Cote</label>
                    <input type="number" step="0.01" value={s.cote} onChange={e => setStats(stats.map((x,j) => j===i?{...x,cote:e.target.value}:x))} placeholder="1.85" style={inputStyle}/>
                    {s.cote&&<p style={{fontSize:'11px',color:VIOLET,margin:'3px 0 0',fontWeight:700}}>{coteToPct(s.cote)}</p>}
                  </div>
                </div>
                <div style={{display:'flex',gap:'8px',marginBottom:'8px'}}>
                  <button onClick={() => setStats(stats.map((x,j) => j===i?{...x,plusMoins:'plus'}:x))} style={pmBtn(s.plusMoins==='plus','#10b981')}>Plus de ↑</button>
                  <button onClick={() => setStats(stats.map((x,j) => j===i?{...x,plusMoins:'moins'}:x))} style={pmBtn(s.plusMoins==='moins','#ef4444')}>Moins de ↓</button>
                </div>
                <div style={{display:'flex',gap:'8px',alignItems:'center'}}>
                  <input type="number" step="0.5" value={s.seuil} onChange={e => setStats(stats.map((x,j) => j===i?{...x,seuil:e.target.value}:x))} placeholder="Seuil ex: 2.5" style={{...inputStyle,flex:1}}/>
                  <button onClick={() => setStats(stats.filter((_,j) => j!==i))} style={{background:'none',border:'none',color:'#ef4444',cursor:'pointer',fontSize:'20px'}}>×</button>
                </div>
              </div>
            ))}
          </div>

          <div style={sectionStyle}>
            <h3 style={{fontWeight:700,marginBottom:'16px',fontSize:'16px'}}>🎯 Kiyès k ap fè Gòl ?</h3>
            {[
              {label:'Buts total',pm:gols.totalPM,seuil:gols.totalSeuil,cote:gols.totalCote,setPM:(v:string)=>setGols({...gols,totalPM:v}),setSeuil:(v:string)=>setGols({...gols,totalSeuil:v}),setCote:(v:string)=>setGols({...gols,totalCote:v})},
              {label:'Buts '+(equipe1||'Équipe 1'),pm:gols.eq1PM,seuil:gols.eq1Seuil,cote:gols.eq1Cote,setPM:(v:string)=>setGols({...gols,eq1PM:v}),setSeuil:(v:string)=>setGols({...gols,eq1Seuil:v}),setCote:(v:string)=>setGols({...gols,eq1Cote:v})},
              {label:'Buts '+(equipe2||'Équipe 2'),pm:gols.eq2PM,seuil:gols.eq2Seuil,cote:gols.eq2Cote,setPM:(v:string)=>setGols({...gols,eq2PM:v}),setSeuil:(v:string)=>setGols({...gols,eq2Seuil:v}),setCote:(v:string)=>setGols({...gols,eq2Cote:v})},
            ].map(g => (
              <div key={g.label} style={{background:'#f9fafb',borderRadius:'8px',padding:'12px',marginBottom:'8px'}}>
                <p style={{fontWeight:700,fontSize:'13px',margin:'0 0 8px'}}>{g.label}</p>
                <div style={{display:'flex',gap:'8px',marginBottom:'8px'}}>
                  <button onClick={() => g.setPM('plus')} style={pmBtn(g.pm==='plus','#10b981')}>Plus de ↑</button>
                  <button onClick={() => g.setPM('moins')} style={pmBtn(g.pm==='moins','#ef4444')}>Moins de ↓</button>
                </div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px'}}>
                  <input type="number" step="0.5" value={g.seuil} onChange={e => g.setSeuil(e.target.value)} placeholder="Seuil ex: 2.5" style={inputStyle}/>
                  <div><input type="number" step="0.01" value={g.cote} onChange={e => g.setCote(e.target.value)} placeholder="Cote ex: 1.80" style={inputStyle}/>{g.cote&&<p style={{fontSize:'11px',color:VIOLET,margin:'3px 0 0',fontWeight:700}}>{coteToPct(g.cote)}</p>}</div>
                </div>
              </div>
            ))}
          </div>

          <div style={sectionStyle}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'16px'}}>
              <h3 style={{fontWeight:700,fontSize:'16px',margin:0}}>🔮 Divinò</h3>
              <div style={{display:'flex',gap:'8px'}}>
                <button onClick={() => setDivino([...divino,{id:Date.now(),categorie:'Buteur',valeur:'',cote:''}])} style={{background:'#eab308',color:'#fff',border:'none',padding:'6px 12px',borderRadius:'999px',cursor:'pointer',fontWeight:700,fontSize:'12px'}}>+ Buteur</button>
                <button onClick={() => setDivino([...divino,{id:Date.now(),categorie:'Premier Buteur',valeur:'',cote:''}])} style={{background:'#f59e0b',color:'#fff',border:'none',padding:'6px 12px',borderRadius:'999px',cursor:'pointer',fontWeight:700,fontSize:'12px'}}>+ 1er Buteur</button>
                <button onClick={() => setDivino([...divino,{id:Date.now(),categorie:'Score exact',valeur:'',cote:''}])} style={{background:'#111',color:'#fff',border:'none',padding:'6px 12px',borderRadius:'999px',cursor:'pointer',fontWeight:700,fontSize:'12px'}}>+ Score</button>
              </div>
            </div>
            {divino.map((d,i) => (
              <div key={d.id} style={{display:'flex',gap:'8px',alignItems:'center',marginBottom:'8px'}}>
                <span style={{fontSize:'11px',color:'#6b7280',width:'90px',flexShrink:0}}>{d.categorie}</span>
                <input value={d.valeur} onChange={e => setDivino(divino.map((x,j) => j===i?{...x,valeur:e.target.value}:x))} placeholder={d.categorie==='Score exact'?'Ex: 2-1':'Ex: Jiménez'} style={{...inputStyle,flex:2}}/>
                <div style={{flex:1}}>
                  <input type="number" step="0.01" value={d.cote} onChange={e => setDivino(divino.map((x,j) => j===i?{...x,cote:e.target.value}:x))} placeholder="Cote" style={inputStyle}/>
                  {d.cote&&<p style={{fontSize:'11px',color:VIOLET,margin:'2px 0 0',fontWeight:700}}>{coteToPct(d.cote)}</p>}
                </div>
                <button onClick={() => setDivino(divino.filter((_,j) => j!==i))} style={{background:'none',border:'none',color:'#ef4444',cursor:'pointer',fontSize:'20px',flexShrink:0}}>×</button>
              </div>
            ))}
          </div>

          <div style={sectionStyle}>
            <h3 style={{fontWeight:700,marginBottom:'8px',fontSize:'16px'}}>🌈 Bèl Mirak</h3>
            {equipeOutsider && <p style={{fontSize:'13px',color:'#6b7280',marginBottom:'12px'}}>Outsider détecté : <strong style={{color:VIOLET}}>{equipeOutsider}</strong></p>}
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px'}}>
              <div>
                <label style={labelStyle}>Victoire {equipeOutsider||'Outsider'}</label>
                <input type="number" step="0.01" value={mirak.coteVictoire} onChange={e => setMirak({...mirak,coteVictoire:e.target.value})} placeholder="8.60" style={inputStyle}/>
                {mirak.coteVictoire&&<p style={{fontSize:'11px',color:VIOLET,margin:'3px 0 0',fontWeight:700}}>{coteToPct(mirak.coteVictoire)}</p>}
              </div>
              <div>
                <label style={labelStyle}>Plus de 1.5 buts {equipeOutsider||'Outsider'}</label>
                <input type="number" step="0.01" value={mirak.coteButs} onChange={e => setMirak({...mirak,coteButs:e.target.value})} placeholder="7.20" style={inputStyle}/>
                {mirak.coteButs&&<p style={{fontSize:'11px',color:VIOLET,margin:'3px 0 0',fontWeight:700}}>{coteToPct(mirak.coteButs)}</p>}
              </div>
            </div>
          </div>

          <div style={{display:'flex',gap:'12px'}}>
            <button onClick={() => sauvegarder(false)} disabled={saving} style={{flex:1,padding:'14px',background:'#6b7280',color:'#fff',border:'none',borderRadius:'999px',cursor:'pointer',fontWeight:700,fontSize:'15px'}}>💾 Brouillon</button>
            <button onClick={() => sauvegarder(true)} disabled={saving} style={{flex:1,padding:'14px',background:VIOLET,color:'#fff',border:'none',borderRadius:'999px',cursor:'pointer',fontWeight:700,fontSize:'15px'}}>{saving ? '...' : '🚀 Publier'}</button>
          </div>
        </main>
      )}
    </div>
  );
}
