'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';

const VIOLET = '#bf00ff';

type Concours = { id: string; titre: string; statut: string; lots: string | null; };
type ConcoursMatch = {
  id: string; concours_id: string; equipe1: string; equipe2: string;
  date_match: string; ordre: number; label: string | null;
  resultat_1x2: string | null; score_home: number | null; score_away: number | null; buteurs_reels: string[] | null;
};

export default function AdminConcours() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [connecte, setConnecte] = useState(false);
  const [erreurAuth, setErreurAuth] = useState('');
  const [concoursList, setConcoursList] = useState<Concours[]>([]);
  const [matchsParConcours, setMatchsParConcours] = useState<Record<string, ConcoursMatch[]>>({});
  const [message, setMessage] = useState('');
  const [vue, setVue] = useState<'liste' | 'nouveau'>('liste');
  const [titre, setTitre] = useState('');
  const [lots, setLots] = useState('10 000 Gourdes, tablettes, abonnement Netflix 3 mois');
  const [nouveauMatch, setNouveauMatch] = useState<Record<string, { e1: string; e2: string; date: string; label: string }>>({});
  const [resultats, setResultats] = useState<Record<string, { r1x2: string; sh: string; sa: string; buteurs: string }>>({});

  useEffect(() => { supabase.auth.getSession().then(({ data }) => { if (data.session) setConnecte(true); }); }, []);
  useEffect(() => { if (connecte) chargerConcours(); }, [connecte]);

  const chargerConcours = async () => {
    const { data } = await supabase.from('concours').select('*').order('created_at', { ascending: false });
    if (data) { setConcoursList(data); for (const c of data) chargerMatchs(c.id); }
  };
  const chargerMatchs = async (concoursId: string) => {
    const { data } = await supabase.from('concours_matchs').select('*').eq('concours_id', concoursId).order('ordre', { ascending: true });
    if (data) setMatchsParConcours(prev => ({ ...prev, [concoursId]: data }));
  };
  const seConnecter = async () => {
    setErreurAuth('');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setErreurAuth('Email ou mot de passe incorrect.'); else setConnecte(true);
  };
  const creerConcours = async () => {
    if (!titre) { setMessage('❌ Titre obligatoire.'); return; }
    const { error } = await supabase.from('concours').insert({ titre, lots, statut: 'ouvert', equipe1: '—', equipe2: '—', date_match: new Date().toISOString() });
    if (error) { setMessage('❌ ' + error.message); return; }
    setMessage('✅ Concours créé ! Ajoutez-y des matchs.');
    setTitre(''); chargerConcours(); setTimeout(() => setVue('liste'), 1200);
  };
  const ajouterMatch = async (concoursId: string) => {
    const nm = nouveauMatch[concoursId];
    if (!nm || !nm.e1 || !nm.e2 || !nm.date) { setMessage('❌ Équipes et date obligatoires.'); return; }
    const ordre = (matchsParConcours[concoursId]?.length || 0) + 1;
    const { error } = await supabase.from('concours_matchs').insert({ concours_id: concoursId, equipe1: nm.e1, equipe2: nm.e2, date_match: nm.date, ordre, label: nm.label || null });
    if (error) { setMessage('❌ ' + error.message); return; }
    setMessage('✅ Match ajouté !');
    setNouveauMatch(prev => ({ ...prev, [concoursId]: { e1:'', e2:'', date:'', label:'' } }));
    chargerMatchs(concoursId);
  };
  const changerStatut = async (id: string, statut: string) => {
    await supabase.from('concours').update({ statut }).eq('id', id); chargerConcours();
  };
  const supprimerMatch = async (matchId: string, concoursId: string) => {
    if (!confirm('Supprimer ce match ?')) return;
    await supabase.from('participations_matchs').delete().eq('concours_match_id', matchId);await supabase.from('concours_matchs').delete().eq('id', matchId);
    chargerMatchs(concoursId);
  };
  const supprimerConcours = async (id: string) => {
    if (!confirm('Supprimer ce concours et tout ce qui va avec ?')) return;
    const matchs = matchsParConcours[id] || [];
    for (const m of matchs) { await supabase.from('participations_matchs').delete().eq('concours_match_id', m.id); }
    await supabase.from('concours_matchs').delete().eq('concours_id', id);
    await supabase.from('parrainages').delete().eq('concours_id', id);
    await supabase.from('concours').delete().eq('id', id);
    chargerConcours();
  };
  const enregistrerResultat = async (m: ConcoursMatch) => {
    const r = resultats[m.id];
    if (!r || !r.r1x2 || r.sh === '' || r.sa === '') { setMessage('❌ Remplissez résultat et score.'); return; }
    const buteursArray = r.buteurs ? r.buteurs.split(',').map(b => b.trim()).filter(b => b) : [];
    await supabase.from('concours_matchs').update({ resultat_1x2: r.r1x2, score_home: parseInt(r.sh), score_away: parseInt(r.sa), buteurs_reels: buteursArray }).eq('id', m.id);
    setMessage('✅ Résultat enregistré. Cliquez sur "Calculer les points".');
    chargerMatchs(m.concours_id);
  };
  const calculerPoints = async (matchId: string, concoursId: string) => {
    setMessage('⏳ Calcul en cours...');
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) { setMessage('❌ Session expirée, reconnectez-vous.'); return; }
    const res = await fetch('/api/concours-calcul-match', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify({ concours_match_id: matchId })
    });
    const data = await res.json();
    if (data.success) { setMessage('✅ Points calculés pour ' + data.participants + ' participants !'); chargerMatchs(concoursId); }
    else { setMessage('❌ ' + (data.error || 'Erreur de calcul')); }
  };

  const inputStyle = {width:'100%',padding:'10px',borderRadius:'8px',border:'1px solid #333',background:'#222',color:'#fff',fontSize:'14px',boxSizing:'border-box' as const};
  const labelStyle = {fontSize:'12px',color:'#9ca3af',display:'block' as const,marginBottom:'4px'};if (!connecte) {
    return (
      <div style={{minHeight:'100vh',background:'#111',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'sans-serif'}}>
        <div style={{background:'#1a1a1a',padding:'40px',borderRadius:'16px',width:'100%',maxWidth:'380px',border:'1px solid #333'}}>
          <h1 style={{color:VIOLET,fontWeight:900,fontSize:'24px',marginBottom:'8px',textAlign:'center'}}>Admin Concours</h1>
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
        <h1 style={{color:VIOLET,fontWeight:900,fontSize:'18px',margin:0}}>🏆 Admin Concours</h1>
        <div style={{display:'flex',gap:'8px'}}>
          <a href="/admin" style={{background:'#333',color:'#fff',textDecoration:'none',padding:'10px 16px',borderRadius:'999px',fontWeight:700,fontSize:'14px'}}>← Admin</a>
          <button onClick={() => setVue('liste')} style={{background:vue==='liste'?VIOLET:'#333',color:'#fff',border:'none',padding:'10px 16px',borderRadius:'999px',fontWeight:700,fontSize:'14px',cursor:'pointer'}}>Liste</button>
          <button onClick={() => setVue('nouveau')} style={{background:vue==='nouveau'?VIOLET:'#333',color:'#fff',border:'none',padding:'10px 16px',borderRadius:'999px',fontWeight:700,fontSize:'14px',cursor:'pointer'}}>+ Nouveau</button>
        </div>
      </header>

      {message && <div style={{padding:'12px 24px',background:message.includes('❌')?'#7f1d1d':'#064e3b',color:message.includes('❌')?'#fca5a5':'#6ee7b7',fontWeight:700,fontSize:'14px'}}>{message}</div>}

      <main style={{maxWidth:'800px',margin:'0 auto',padding:'32px 16px'}}>

        {vue === 'nouveau' && (
          <div style={{background:'#1a1a1a',border:'1px solid #333',borderRadius:'12px',padding:'24px'}}>
            <h2 style={{color:'#fff',fontWeight:900,fontSize:'20px',marginBottom:'20px'}}>Créer un concours</h2>
            <div style={{marginBottom:'14px'}}><label style={labelStyle}>Titre du concours</label><input value={titre} onChange={e => setTitre(e.target.value)} placeholder="Grande Finale Coupe du Monde 2026" style={inputStyle}/></div>
            <div style={{marginBottom:'20px'}}><label style={labelStyle}>Lots</label><input value={lots} onChange={e => setLots(e.target.value)} style={inputStyle}/></div>
            <button onClick={creerConcours} style={{width:'100%',padding:'14px',background:VIOLET,color:'#fff',border:'none',borderRadius:'999px',fontWeight:700,fontSize:'15px',cursor:'pointer'}}>Créer le concours</button>
            <p style={{color:'#6b7280',fontSize:'13px',marginTop:'12px',textAlign:'center'}}>Vous ajouterez les matchs ensuite depuis la liste.</p>
          </div>
        )}{vue === 'liste' && (
          <>
            {concoursList.length === 0 && <p style={{color:'#6b7280'}}>Aucun concours. Créez-en un.</p>}
            {concoursList.map(c => {
              const matchs = matchsParConcours[c.id] || [];
              const nm = nouveauMatch[c.id] || { e1:'', e2:'', date:'', label:'' };
              return (
                <div key={c.id} style={{background:'#1a1a1a',border:'1px solid #333',borderRadius:'12px',padding:'20px',marginBottom:'20px'}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'16px',flexWrap:'wrap',gap:'8px'}}>
                    <div>
                      <h3 style={{color:'#fff',fontWeight:900,fontSize:'18px',margin:'0 0 4px'}}>{c.titre}</h3>
                      {c.lots && <p style={{color:'#ffd700',fontSize:'13px',margin:0}}>🎁 {c.lots}</p>}
                    </div>
                    <span style={{fontSize:'11px',padding:'4px 12px',borderRadius:'999px',fontWeight:700,background:c.statut==='ouvert'?'#10b981':c.statut==='ferme'?'#f59e0b':'#6b7280',color:'#fff'}}>{c.statut === 'ouvert' ? 'Ouvert' : c.statut === 'ferme' ? 'Fermé' : 'Terminé'}</span>
                  </div>

                  <div style={{display:'flex',gap:'8px',flexWrap:'wrap',marginBottom:'16px'}}>
                    {c.statut === 'ouvert' && <button onClick={() => changerStatut(c.id, 'ferme')} style={{padding:'6px 14px',borderRadius:'999px',border:'none',cursor:'pointer',fontWeight:700,fontSize:'12px',background:'#f59e0b',color:'#fff'}}>Fermer</button>}
                    {c.statut === 'ferme' && <button onClick={() => changerStatut(c.id, 'ouvert')} style={{padding:'6px 14px',borderRadius:'999px',border:'none',cursor:'pointer',fontWeight:700,fontSize:'12px',background:'#10b981',color:'#fff'}}>Rouvrir</button>}
                    <button onClick={() => supprimerConcours(c.id)} style={{padding:'6px 14px',borderRadius:'999px',border:'2px solid #ef4444',background:'transparent',color:'#ef4444',cursor:'pointer',fontWeight:700,fontSize:'12px'}}>🗑️ Supprimer concours</button>
                  </div>

                  {matchs.map(m => (
                    <div key={m.id} style={{background:'#222',borderRadius:'10px',padding:'16px',marginBottom:'12px'}}>
                      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'12px'}}>
                        <div>
                          {m.label && <span style={{fontSize:'10px',background:'#111',color:'#fff',padding:'2px 8px',borderRadius:'999px',marginRight:'8px'}}>{m.label}</span>}
                          <span style={{color:'#fff',fontWeight:700,fontSize:'15px'}}>{m.equipe1} vs {m.equipe2}</span>
                        </div>
                        <button onClick={() => supprimerMatch(m.id, c.id)} style={{background:'none',border:'none',color:'#ef4444',cursor:'pointer',fontSize:'18px'}}>×</button>
                      </div>
                      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'8px',marginBottom:'10px'}}>
                        <div>
                          <label style={labelStyle}>Résultat</label>
                          <select value={resultats[m.id]?.r1x2 || ''} onChange={e => setResultats({...resultats, [m.id]: {...resultats[m.id], r1x2:e.target.value, sh:resultats[m.id]?.sh||'', sa:resultats[m.id]?.sa||'', buteurs:resultats[m.id]?.buteurs||''}})} style={inputStyle}>
                            <option value="">—</option>
                            <option value="1">1 ({m.equipe1})</option>
                            <option value="X">X (Nul)</option>
                            <option value="2">2 ({m.equipe2})</option>
                          </select>
                        </div><div><label style={labelStyle}>Score {m.equipe1}</label><input type="number" min={0} value={resultats[m.id]?.sh || ''} onChange={e => setResultats({...resultats, [m.id]: {...resultats[m.id], r1x2:resultats[m.id]?.r1x2||'', sh:e.target.value, sa:resultats[m.id]?.sa||'', buteurs:resultats[m.id]?.buteurs||''}})} style={inputStyle}/></div>
                        <div><label style={labelStyle}>Score {m.equipe2}</label><input type="number" min={0} value={resultats[m.id]?.sa || ''} onChange={e => setResultats({...resultats, [m.id]: {...resultats[m.id], r1x2:resultats[m.id]?.r1x2||'', sh:resultats[m.id]?.sh||'', sa:e.target.value, buteurs:resultats[m.id]?.buteurs||''}})} style={inputStyle}/></div>
                      </div>
                      <div style={{marginBottom:'10px'}}>
                        <label style={labelStyle}>Buteurs réels (séparés par des virgules)</label>
                        <input value={resultats[m.id]?.buteurs || ''} onChange={e => setResultats({...resultats, [m.id]: {...resultats[m.id], r1x2:resultats[m.id]?.r1x2||'', sh:resultats[m.id]?.sh||'', sa:resultats[m.id]?.sa||'', buteurs:e.target.value}})} placeholder="Mbappé, Yamal, Messi" style={inputStyle}/>
                      </div>
                      <div style={{display:'flex',gap:'8px',flexWrap:'wrap'}}>
                        <button onClick={() => enregistrerResultat(m)} style={{padding:'8px 16px',borderRadius:'999px',border:'none',cursor:'pointer',fontWeight:700,fontSize:'12px',background:'#3b82f6',color:'#fff'}}>💾 Enregistrer</button>
                        {m.resultat_1x2 && <button onClick={() => calculerPoints(m.id, c.id)} style={{padding:'8px 16px',borderRadius:'999px',border:'none',cursor:'pointer',fontWeight:700,fontSize:'12px',background:VIOLET,color:'#fff'}}>🧮 Calculer points</button>}
                      </div>
                      {m.resultat_1x2 && <p style={{color:'#6ee7b7',fontSize:'11px',margin:'8px 0 0'}}>✓ {m.resultat_1x2} · {m.score_home}-{m.score_away} · {(m.buteurs_reels||[]).join(', ') || 'aucun buteur'}</p>}
                    </div>
                  ))}

                  <div style={{background:'#2a1a3a',borderRadius:'10px',padding:'16px',marginTop:'8px',border:'1px dashed '+VIOLET}}>
                    <p style={{color:'#fff',fontWeight:700,fontSize:'13px',margin:'0 0 12px'}}>➕ Ajouter un match</p>
                    <div style={{marginBottom:'8px'}}><input value={nm.label} onChange={e => setNouveauMatch({...nouveauMatch, [c.id]: {...nm, label:e.target.value}})} placeholder="Label (ex: Petite Finale)" style={inputStyle}/></div>
                    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px',marginBottom:'8px'}}>
                      <input value={nm.e1} onChange={e => setNouveauMatch({...nouveauMatch, [c.id]: {...nm, e1:e.target.value}})} placeholder="Équipe 1" style={inputStyle}/>
                      <input value={nm.e2} onChange={e => setNouveauMatch({...nouveauMatch, [c.id]: {...nm, e2:e.target.value}})} placeholder="Équipe 2" style={inputStyle}/>
                    </div>
                    <div style={{marginBottom:'10px'}}><input type="datetime-local" value={nm.date} onChange={e => setNouveauMatch({...nouveauMatch, [c.id]: {...nm, date:e.target.value}})} style={inputStyle}/></div>
                    <button onClick={() => ajouterMatch(c.id)} style={{width:'100%',padding:'10px',background:VIOLET,color:'#fff',border:'none',borderRadius:'8px',fontWeight:700,fontSize:'13px',cursor:'pointer'}}>Ajouter ce match</button>
                  </div>

                </div>
              );
            })}
          </>
        )}

      </main>
    </div>
  );
}