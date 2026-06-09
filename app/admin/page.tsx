'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

const VIOLET = '#bf00ff';

type PronosticExistant = {
  id: string;
  match: string;
  date_match: string;
  publie: boolean;
  confiance_globale: number;
};

type PariFixe = {
  niveau: string;
  categorie: string;
  type_pari: string;
  valeur: string;
  cote: string;
};

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

export default function Admin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [connecte, setConnecte] = useState(false);
  const [erreurAuth, setErreurAuth] = useState('');
  const [vue, setVue] = useState<'dashboard' | 'nouveau'>('dashboard');
  const [pronostics, setPronostics] = useState<PronosticExistant[]>([]);
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

  const [bat, setBat] = useState({ v1: '', nul: '', v2: '', dc1x: '', dcx2: '' });
  const [stats, setStats] = useState<{id:number;plusMoins:string;seuil:string;categorie:string;cote:string}[]>([]);
  const [gols, setGols] = useState({ totalPM:'plus', totalSeuil:'', totalCote:'', eq1PM:'plus', eq1Seuil:'', eq1Cote:'', eq2PM:'plus', eq2Seuil:'', eq2Cote:'' });
  const [divino, setDivino] = useState<{id:number;categorie:string;valeur:string;cote:string}[]>([]);
  const [mirak, setMirak] = useState({ coteVictoire:'', coteButs:'' });

  const matchNom = equipe1 && equipe2 ? equipe1 + ' vs ' + equipe2 : '';
  const equipeOutsider = outsider(bat.v1, bat.v2, equipe1, equipe2);

  useEffect(() => { supabase.auth.getSession().then(({ data }) => { if (data.session) setConnecte(true); }); }, []);
  useEffect(() => { if (connecte) chargerPronostics(); }, [connecte]);

  const chargerPronostics = async () => {
    const { data } = await supabase.from('pronostics').select('id, match, date_match, publie, confiance_globale').order('date_match', { ascending: false });
    if (data) setPronostics(data);
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
    chargerPronostics();
  };

  const supprimerPronostic = async (id: string) => {
    if (!confirm('Supprimer ce pronostic et tous ses paris ?')) return;
    await supabase.from('pronostics_paris').delete().eq('pronostic_id', id);
    await supabase.from('pronostics').delete().eq('id', id);
    chargerPronostics();
  };

  const modifierPronostic = async (id: string) => {
    const { data: p } = await supabase.from('pronostics').select('*, pronostics_paris(*)').eq('id', id).single();if (!p) return;
    const equipes = p.match.split(' vs ');
    setEquipe1(equipes[0] || '');
    setEquipe2(equipes[1] || '');
    setCompetition(p.competition || '');
    setDateMatch(p.date_match ? p.date_match.slice(0, 16) : '');
    setLieu(p.lieu || '');
    setContexte(p.contexte || '');
    setConfiance(p.confiance_globale || 3);
    setEditId(id);
    setVue('nouveau');
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
        setMessage('✅ Analyse IA terminée ! Complétez les cotes manuellement.');
      } else { setMessage('❌ Erreur IA : ' + (data.error || 'inconnue')); }
    } catch { setMessage('❌ Erreur connexion IA.'); }
    setAnalysing(false);
  };

  const construireParis = (): PariFixe[] => {
    const paris: PariFixe[] = [];
    let ordre = 1;

    if (bat.v1) paris.push({ niveau: 'Kiyès k ap bat ?', categorie: 'Résultat', type_pari: 'Match Result', valeur: 'Victoire ' + equipe1, cote: bat.v1 });
    if (bat.nul) paris.push({ niveau: 'Kiyès k ap bat ?', categorie: 'Résultat', type_pari: 'Match Result', valeur: 'Match nul', cote: bat.nul });
    if (bat.v2) paris.push({ niveau: 'Kiyès k ap bat ?', categorie: 'Résultat', type_pari: 'Match Result', valeur: 'Victoire ' + equipe2, cote: bat.v2 });
    if (bat.dc1x) paris.push({ niveau: 'Kiyès k ap bat ?', categorie: 'Double Chance', type_pari: 'Double Chance', valeur: '1X — ' + equipe1 + ' ou Nul', cote: bat.dc1x });
    if (bat.dcx2) paris.push({ niveau: 'Kiyès k ap bat ?', categorie: 'Double Chance', type_pari: 'Double Chance', valeur: 'X2 — Nul ou ' + equipe2, cote: bat.dcx2 });

    stats.forEach(s => {
      if (s.seuil && s.cote) {
        paris.push({ niveau: 'Bèl ti stat', categorie: s.categorie, type_pari: s.categorie, valeur: (s.plusMoins === 'plus' ? 'Plus de ' : 'Moins de ') + s.seuil + ' ' + s.categorie.toLowerCase(), cote: s.cote });
      }
    });

    if (gols.totalSeuil && gols.totalCote) paris.push({ niveau: 'Kiyès k ap fè Gòl ?', categorie: 'Buts total', type_pari: 'Total Goals', valeur: (gols.totalPM === 'plus' ? 'Plus de ' : 'Moins de ') + gols.totalSeuil + ' buts', cote: gols.totalCote });
    if (gols.eq1Seuil && gols.eq1Cote) paris.push({ niveau: 'Kiyès k ap fè Gòl ?', categorie: 'Buts ' + equipe1, type_pari: 'Team Goals', valeur: (gols.eq1PM === 'plus' ? 'Plus de ' : 'Moins de ') + gols.eq1Seuil + ' buts ' + equipe1, cote: gols.eq1Cote });
    if (gols.eq2Seuil && gols.eq2Cote) paris.push({ niveau: 'Kiyès k ap fè Gòl ?', categorie: 'Buts ' + equipe2, type_pari: 'Team Goals', valeur: (gols.eq2PM === 'plus' ? 'Plus de ' : 'Moins de ') + gols.eq2Seuil + ' buts ' + equipe2, cote: gols.eq2Cote });

    divino.forEach(d => {
      if (d.valeur && d.cote) paris.push({ niveau: 'Divinò', categorie: d.categorie, type_pari: d.categorie, valeur: d.valeur, cote: d.cote });
    });

    if (mirak.coteVictoire) paris.push({ niveau: 'Bèl Mirak', categorie: 'Victoire Surprise', type_pari: 'Upset', valeur: 'Victoire ' + equipeOutsider, cote: mirak.coteVictoire });
    if (mirak.coteButs) paris.push({ niveau: 'Bèl Mirak', categorie: 'Buts Outsider', type_pari: 'Goals', valeur: 'Plus de 1.5 buts ' + equipeOutsider, cote: mirak.coteButs });

    return paris.map((p, i) => ({ ...p, ordre: ordre++ - 1 + i + 1 }));
  };

  const sauvegarder = async (publier: boolean) => {
    if (!matchNom || !dateMatch) { setMessage('Deux équipes et date obligatoires.'); return; }
    setSaving(true); setMessage('');
    const paris = construireParis();if (editId) {
      await supabase.from('pronostics').update({ match: matchNom, competition, date_match: dateMatch, lieu, contexte, confiance_globale: confiance }).eq('id', editId);
      await supabase.from('pronostics_paris').delete().eq('pronostic_id', editId);
      await supabase.from('pronostics_paris').insert(paris.map(p => ({ ...p, cote: parseFloat(p.cote), pronostic_id: editId })));
      await supabase.from('pronostics').update({ publie: publier }).eq('id', editId);
      setSaving(false); setMessage('✅ Modification sauvegardée !'); setEditId(null);
      chargerPronostics(); setTimeout(() => setVue('dashboard'), 1500); return;
    }

    const res = await fetch('/api/admin/pronostic', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ match: matchNom, competition, date_match: dateMatch, lieu, contexte, confiance_globale: confiance, paris: paris.map(p => ({ ...p, cote: parseFloat(p.cote) })) }) });
    const data = await res.json();
    if (data.success && publier) { await fetch('/api/admin/pronostic', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: data.id, publie: true }) }); }
    setSaving(false);
    if (data.success) {
      setMessage(publier ? '✅ Publié !' : '✅ Brouillon sauvegardé !');
      setEquipe1(''); setEquipe2(''); setCompetition(''); setDateMatch(''); setLieu(''); setContexte(''); setConfiance(3);
      setBat({ v1: '', nul: '', v2: '', dc1x: '', dcx2: '' });
      setStats([]); setGols({ totalPM:'plus', totalSeuil:'', totalCote:'', eq1PM:'plus', eq1Seuil:'', eq1Cote:'', eq2PM:'plus', eq2Seuil:'', eq2Cote:'' });
      setDivino([]); setMirak({ coteVictoire:'', coteButs:'' });
      chargerPronostics(); setTimeout(() => setVue('dashboard'), 1500);
    } else { setMessage('❌ Erreur : ' + (data.error || 'inconnue')); }
  };if (!connecte) {
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

  return (
    <div style={{minHeight:'100vh',background:'#f9fafb',fontFamily:'sans-serif'}}>
      <header style={{background:'#111',padding:'12px 24px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <h1 style={{color:VIOLET,fontWeight:900,fontSize:'18px',margin:0}}>MakeGoal Admin</h1>
        <div style={{display:'flex',gap:'12px'}}>
          {vue === 'nouveau' && <button onClick={() => { setVue('dashboard'); setEditId(null); }} style={{background:'#333',color:'#fff',border:'none',padding:'8px 16px',borderRadius:'8px',cursor:'pointer',fontSize:'13px'}}>← Dashboard</button>}
          <button onClick={seDeconnecter} style={{background:'#ef4444',color:'#fff',border:'none',padding:'8px 16px',borderRadius:'8px',cursor:'pointer',fontSize:'13px'}}>Déconnexion</button>
        </div>
      </header>

      {vue === 'dashboard' && (
        <main style={{maxWidth:'800px',margin:'0 auto',padding:'32px 16px'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'24px'}}>
            <h2 style={{fontWeight:900,fontSize:'24px',margin:0}}>Pronostics</h2>
            <button onClick={() => setVue('nouveau')} style={{background:VIOLET,color:'#fff',border:'none',padding:'10px 24px',borderRadius:'999px',cursor:'pointer',fontWeight:700,fontSize:'14px'}}>+ Nouveau</button>
          </div>
          {pronostics.length === 0 && <p style={{color:'#6b7280'}}>Aucun pronostic.</p>}
          {pronostics.map(p => (
            <div key={p.id} style={{background:'#fff',border:'1px solid #e5e7eb',borderRadius:'12px',padding:'16px',marginBottom:'12px'}}><div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:'12px',flexWrap:'wrap'}}>
                <div>
                  <p style={{fontWeight:700,margin:0,marginBottom:'4px'}}>{p.match}</p>
                  <p style={{color:'#6b7280',fontSize:'13px',margin:0}}>{new Date(p.date_match).toLocaleDateString('fr-FR')} — {'★'.repeat(p.confiance_globale)}</p>
                </div>
                <div style={{display:'flex',gap:'8px',flexWrap:'wrap'}}>
                  <button onClick={() => togglePublie(p.id, p.publie)} style={{padding:'8px 16px',borderRadius:'999px',border:'none',cursor:'pointer',fontWeight:700,fontSize:'13px',background:p.publie?'#10b981':'#6b7280',color:'#fff'}}>{p.publie ? '✓ Publié' : 'Brouillon'}</button>
                  <button onClick={() => modifierPronostic(p.id)} style={{padding:'8px 16px',borderRadius:'999px',border:'2px solid '+VIOLET,background:'#fff',color:VIOLET,cursor:'pointer',fontWeight:700,fontSize:'13px'}}>✏️ Modifier</button>
                  <button onClick={() => supprimerPronostic(p.id)} style={{padding:'8px 16px',borderRadius:'999px',border:'2px solid #ef4444',background:'#fff',color:'#ef4444',cursor:'pointer',fontWeight:700,fontSize:'13px'}}>🗑️ Supprimer</button>
                </div>
              </div>
            </div>
          ))}
        </main>
      )}

      {vue === 'nouveau' && (
        <main style={{maxWidth:'800px',margin:'0 auto',padding:'32px 16px'}}>
          <h2 style={{fontWeight:900,fontSize:'24px',marginBottom:'24px'}}>{editId ? '✏️ Modifier' : '➕ Nouveau Pronostic'}</h2>
          {message && <div style={{padding:'12px 16px',borderRadius:'8px',marginBottom:'16px',background:message.includes('❌')?'#fef2f2':'#f0fdf4',color:message.includes('❌')?'#ef4444':'#10b981',fontWeight:700}}>{message}</div>}

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
            <div style={{marginBottom:'12px'}}><label style={labelStyle}>Contexte / Analyse</label><textarea value={contexte} onChange={e => setContexte(e.target.value)} rows={3} placeholder="Analyse du match..." style={{...inputStyle,resize:'vertical'}}/></div><div style={{marginBottom:'12px'}}>
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
                    <select value={s.categorie} onChange={e => setStats(stats.map((x,j) => j===i?{...x,categorie:e.target.value}:x))} style={{...inputStyle,padding:'8px'}}>{['Tir','Tir cadré','Corners','Carton Jaune','Carton Rouge','Hors-jeu','Touche'].map(c => <option key={c}>{c}</option>)}
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
                {s.seuil&&<p style={{fontSize:'12px',color:'#374151',marginTop:'4px'}}>{s.plusMoins==='plus'?'Plus de':'Moins de'} {s.seuil} {s.categorie.toLowerCase()}</p>}
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
                  <div><input type="number" step="0.5" value={g.seuil} onChange={e => g.setSeuil(e.target.value)} placeholder="Seuil ex: 2.5" style={inputStyle}/></div>
                  <div><input type="number" step="0.01" value={g.cote} onChange={e => g.setCote(e.target.value)} placeholder="Cote ex: 1.80" style={inputStyle}/>{g.cote&&<p style={{fontSize:'11px',color:VIOLET,margin:'3px 0 0',fontWeight:700}}>{coteToPct(g.cote)}</p>}</div>
                </div>
              </div>
            ))}
          </div><div style={sectionStyle}>
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
                <div style={{flex:1,position:'relative'}}>
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
            <button onClick={() => sauvegarder(false)} disabled={saving} style={{flex:1,padding:'14px',background:'#6b7280',color:'#fff',border:'none',borderRadius:'999px',cursor:'pointer',fontWeight:700,fontSize:'15px'}}>💾 Brouillon</button><button onClick={() => sauvegarder(true)} disabled={saving} style={{flex:1,padding:'14px',background:VIOLET,color:'#fff',border:'none',borderRadius:'999px',cursor:'pointer',fontWeight:700,fontSize:'15px'}}>{saving ? '...' : '🚀 Publier'}</button>
          </div>
        </main>
      )}
    </div>
  );
}