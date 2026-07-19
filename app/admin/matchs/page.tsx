'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';

const VIOLET = '#bf00ff';

type Match = {
  id: string;
  equipe1: string;
  equipe2: string;
  competition: string | null;
  date_match: string;
  statut: string;
  score_home: number | null;
  score_away: number | null;
  actif: boolean;
};

export default function AdminMatchs() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [connecte, setConnecte] = useState(false);
  const [erreurAuth, setErreurAuth] = useState('');
  const [matchs, setMatchs] = useState<Match[]>([]);
  const [message, setMessage] = useState('');
  const [vue, setVue] = useState<'liste' | 'nouveau'>('liste');
  const [editId, setEditId] = useState<string | null>(null);

  const [equipe1, setEquipe1] = useState('');
  const [equipe2, setEquipe2] = useState('');
  const [competition, setCompetition] = useState('');
  const [dateMatch, setDateMatch] = useState('');

  const [scores, setScores] = useState<Record<string, { sh: string; sa: string }>>({});

  useEffect(() => { supabase.auth.getSession().then(({ data }) => { if (data.session) setConnecte(true); }); }, []);
  useEffect(() => { if (connecte) chargerMatchs(); }, [connecte]);

  const chargerMatchs = async () => {
    const { data } = await supabase.from('matchs').select('*').order('date_match', { ascending: false });
    if (data) setMatchs(data);
  };

  const seConnecter = async () => {
    setErreurAuth('');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setErreurAuth('Email ou mot de passe incorrect.'); else setConnecte(true);
  };

  const nouveauMatch = () => {
    setEditId(null); setEquipe1(''); setEquipe2(''); setCompetition(''); setDateMatch('');
    setVue('nouveau');
  };

  const editerMatch = (m: Match) => {
    setEditId(m.id); setEquipe1(m.equipe1); setEquipe2(m.equipe2);
    setCompetition(m.competition || ''); setDateMatch(m.date_match ? versLocal(m.date_match) : '');
    setVue('nouveau');
  };

  // Convertit une date UTC stockée vers l'heure d'Haïti pour pré-remplir le champ (format datetime-local)
  const versLocal = (utc: string) => {
    const d = new Date(utc);
    // décale de -4h pour obtenir l'heure d'Haïti puis formate en YYYY-MM-DDTHH:mm
    const haiti = new Date(d.getTime() - 4 * 3600 * 1000);
    return haiti.toISOString().slice(0, 16);
  };

  // Haïti est à UTC-4. La saisie datetime-local n'a pas de fuseau : on l'ancre à -04:00.
  const versUTC = (local: string) => {
    if (!local) return local;
    // local = "2026-07-19T15:00" -> on force le fuseau Haïti puis on convertit en ISO UTC
    const d = new Date(local + ':00-04:00');
    return d.toISOString();
  };

  const sauvegarder = async () => {
    if (!equipe1 || !equipe2 || !dateMatch) { setMessage('❌ Équipes et date obligatoires.'); return; }
    const payload = { equipe1, equipe2, competition: competition || null, date_match: versUTC(dateMatch) };
    if (editId) {
      const { error } = await supabase.from('matchs').update(payload).eq('id', editId);
      if (error) { setMessage('❌ ' + error.message); return; }
      setMessage('✅ Match modifié !');
    } else {
      const { error } = await supabase.from('matchs').insert(payload);
      if (error) { setMessage('❌ ' + error.message); return; }
      setMessage('✅ Match créé ! Les visiteurs peuvent voter.');
    }
    setEquipe1(''); setEquipe2(''); setCompetition(''); setDateMatch(''); setEditId(null);
    chargerMatchs();
    setTimeout(() => setVue('liste'), 1200);
  };

  const toggleActif = async (m: Match) => {
    await supabase.from('matchs').update({ actif: !m.actif }).eq('id', m.id);
    chargerMatchs();
  };

  const enregistrerScore = async (m: Match) => {
    const s = scores[m.id];
    if (!s || s.sh === '' || s.sa === '') { setMessage('❌ Entrez le score.'); return; }
    await supabase.from('matchs').update({ score_home: parseInt(s.sh), score_away: parseInt(s.sa), statut: 'termine' }).eq('id', m.id);
    setMessage('✅ Score enregistré !');
    chargerMatchs();
  };

  const supprimer = async (id: string) => {
    if (!confirm('Supprimer ce match et tous ses votes ?')) return;
    await supabase.from('votes_communaute').delete().eq('match_id', id);
    await supabase.from('matchs').delete().eq('id', id);
    chargerMatchs();
  };

  const inputStyle = {width:'100%',padding:'12px',borderRadius:'8px',border:'1px solid #333',background:'#222',color:'#fff',fontSize:'14px',boxSizing:'border-box' as const};
  const labelStyle = {fontSize:'12px',color:'#9ca3af',display:'block' as const,marginBottom:'6px'};

  if (!connecte) {
    return (
      <div style={{minHeight:'100vh',background:'#111',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'sans-serif'}}>
        <div style={{background:'#1a1a1a',padding:'40px',borderRadius:'16px',width:'100%',maxWidth:'380px',border:'1px solid #333'}}>
          <h1 style={{color:VIOLET,fontWeight:900,fontSize:'24px',marginBottom:'8px',textAlign:'center'}}>Admin Matchs</h1>
          <p style={{color:'#6b7280',fontSize:'13px',textAlign:'center',marginBottom:'24px'}}>Accès réservé</p>
          {erreurAuth && <p style={{color:'#ef4444',fontSize:'13px',marginBottom:'12px',textAlign:'center'}}>{erreurAuth}</p>}
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" style={{width:'100%',padding:'12px',borderRadius:'8px',border:'1px solid #333',background:'#222',color:'#fff',fontSize:'14px',marginBottom:'12px',boxSizing:'border-box'}}/>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Mot de passe" style={{width:'100%',padding:'12px',borderRadius:'8px',border:'1px solid #333',background:'#222',color:'#fff',fontSize:'14px',marginBottom:'16px',boxSizing:'border-box'}} onKeyDown={e => e.key === 'Enter' && seConnecter()}/>
          <button onClick={seConnecter} style={{width:'100%',padding:'12px',background:VIOLET,color:'#fff',fontWeight:700,borderRadius:'8px',border:'none',cursor:'pointer',fontSize:'15px'}}>Se connecter</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{minHeight:'100vh',background:'#0f0f0f',fontFamily:'sans-serif'}}>
      <header style={{background:'#111',padding:'12px 24px',display:'flex',justifyContent:'space-between',alignItems:'center',borderBottom:'1px solid #222'}}>
        <h1 style={{color:VIOLET,fontWeight:900,fontSize:'18px',margin:0}}>⚽ Admin Matchs</h1>
        <div style={{display:'flex',gap:'8px'}}>
          <a href="/admin" style={{background:'#333',color:'#fff',textDecoration:'none',padding:'10px 16px',borderRadius:'999px',fontWeight:700,fontSize:'14px'}}>← Admin</a>
          <button onClick={() => setVue('liste')} style={{background:vue==='liste'?VIOLET:'#333',color:'#fff',border:'none',padding:'10px 16px',borderRadius:'999px',fontWeight:700,fontSize:'14px',cursor:'pointer'}}>Liste</button>
          <button onClick={nouveauMatch} style={{background:vue==='nouveau'?VIOLET:'#333',color:'#fff',border:'none',padding:'10px 16px',borderRadius:'999px',fontWeight:700,fontSize:'14px',cursor:'pointer'}}>+ Nouveau match</button>
        </div>
      </header>

      {message && <div style={{padding:'12px 24px',background:message.includes('❌')?'#7f1d1d':'#064e3b',color:message.includes('❌')?'#fca5a5':'#6ee7b7',fontWeight:700,fontSize:'14px'}}>{message}</div>}

      <main style={{maxWidth:'800px',margin:'0 auto',padding:'32px 16px'}}>

        {vue === 'nouveau' && (
          <div style={{background:'#1a1a1a',border:'1px solid #333',borderRadius:'12px',padding:'24px'}}>
            <h2 style={{color:'#fff',fontWeight:900,fontSize:'20px',marginBottom:'20px'}}>{editId ? 'Modifier le match' : 'Nouveau match'}</h2>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px',marginBottom:'16px'}}>
              <div><label style={labelStyle}>Équipe 1 (domicile)</label><input value={equipe1} onChange={e => setEquipe1(e.target.value)} placeholder="Espagne" style={inputStyle}/></div>
              <div><label style={labelStyle}>Équipe 2 (extérieur)</label><input value={equipe2} onChange={e => setEquipe2(e.target.value)} placeholder="Argentine" style={inputStyle}/></div>
            </div>
            <div style={{marginBottom:'16px'}}><label style={labelStyle}>Compétition</label><input value={competition} onChange={e => setCompetition(e.target.value)} placeholder="Coupe du Monde 2026" style={inputStyle}/></div>
            <div style={{marginBottom:'20px'}}><label style={labelStyle}>Date et heure</label><input type="datetime-local" value={dateMatch} onChange={e => setDateMatch(e.target.value)} style={inputStyle}/></div>
            <button onClick={sauvegarder} style={{width:'100%',padding:'14px',background:VIOLET,color:'#fff',border:'none',borderRadius:'999px',fontWeight:700,fontSize:'15px',cursor:'pointer'}}>{editId ? 'Enregistrer' : 'Créer le match'}</button>
          </div>
        )}

        {vue === 'liste' && (
          <>
            {matchs.length === 0 && <p style={{color:'#6b7280'}}>Aucun match. Créez-en un pour lancer le vote.</p>}
            {matchs.map(m => (
              <div key={m.id} style={{background:'#1a1a1a',border:'1px solid #333',borderRadius:'12px',padding:'20px',marginBottom:'16px'}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'12px',flexWrap:'wrap',gap:'8px'}}>
                  <div>
                    {m.competition && <p style={{color:'#6b7280',fontSize:'11px',margin:'0 0 4px',textTransform:'uppercase',letterSpacing:'1px'}}>{m.competition}</p>}
                    <h3 style={{color:'#fff',fontWeight:900,fontSize:'17px',margin:'0 0 4px'}}>{m.equipe1} vs {m.equipe2}</h3>
                    <p style={{color:'#6b7280',fontSize:'12px',margin:0}}>{new Date(m.date_match).toLocaleString('fr-FR',{day:'numeric',month:'long',hour:'2-digit',minute:'2-digit',timeZone:'America/Port-au-Prince'})}</p>
                  </div>
                  <div style={{display:'flex',gap:'6px',flexWrap:'wrap'}}>
                    <button onClick={() => toggleActif(m)} style={{padding:'6px 12px',borderRadius:'999px',border:'none',cursor:'pointer',fontWeight:700,fontSize:'11px',background:m.actif?'#10b981':'#374151',color:'#fff'}}>{m.actif ? '✓ Actif' : 'Masqué'}</button>
                    <button onClick={() => editerMatch(m)} style={{padding:'6px 12px',borderRadius:'999px',border:'2px solid '+VIOLET,background:'transparent',color:VIOLET,cursor:'pointer',fontWeight:700,fontSize:'11px'}}>✏️</button>
                    <button onClick={() => supprimer(m.id)} style={{padding:'6px 12px',borderRadius:'999px',border:'2px solid #ef4444',background:'transparent',color:'#ef4444',cursor:'pointer',fontWeight:700,fontSize:'11px'}}>🗑️</button>
                  </div>
                </div>

                <div style={{background:'#222',borderRadius:'10px',padding:'12px',display:'flex',gap:'8px',alignItems:'center',flexWrap:'wrap'}}>
                  <span style={{color:'#9ca3af',fontSize:'12px'}}>Score final :</span>
                  <input type="number" min={0} value={scores[m.id]?.sh ?? (m.score_home?.toString() || '')} onChange={e => setScores({...scores, [m.id]: {...scores[m.id], sh:e.target.value, sa:scores[m.id]?.sa ?? (m.score_away?.toString() || '')}})} placeholder="0" style={{width:'50px',padding:'6px',borderRadius:'6px',border:'1px solid #333',background:'#1a1a1a',color:'#fff',textAlign:'center'}}/>
                  <span style={{color:'#fff'}}>—</span>
                  <input type="number" min={0} value={scores[m.id]?.sa ?? (m.score_away?.toString() || '')} onChange={e => setScores({...scores, [m.id]: {...scores[m.id], sa:e.target.value, sh:scores[m.id]?.sh ?? (m.score_home?.toString() || '')}})} placeholder="0" style={{width:'50px',padding:'6px',borderRadius:'6px',border:'1px solid #333',background:'#1a1a1a',color:'#fff',textAlign:'center'}}/>
                  <button onClick={() => enregistrerScore(m)} style={{padding:'6px 14px',borderRadius:'999px',border:'none',cursor:'pointer',fontWeight:700,fontSize:'12px',background:'#3b82f6',color:'#fff'}}>💾 Score</button>
                  {m.statut === 'termine' && <span style={{color:'#6ee7b7',fontSize:'11px'}}>✓ Terminé : {m.score_home}-{m.score_away}</span>}
                </div>
              </div>
            ))}
          </>
        )}

      </main>
    </div>
  );
}
