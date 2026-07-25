'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';

const VIOLET = '#bf00ff';

type Concours = {
  id: string;
  titre: string;
  equipe1: string;
  equipe2: string;
  date_match: string;
  statut: string;
  resultat_1x2: string | null;
  score_home: number | null;
  score_away: number | null;
  buteurs_reels: string[] | null;
  lots: string | null;
};

export default function AdminConcours() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [voirMdp, setVoirMdp] = useState(false);
  const [connecte, setConnecte] = useState(false);
  const [erreurAuth, setErreurAuth] = useState('');
  const [concoursList, setConcoursList] = useState<Concours[]>([]);
  const [message, setMessage] = useState('');
  const [vue, setVue] = useState<'liste' | 'nouveau'>('liste');

  const [titre, setTitre] = useState('');
  const [equipe1, setEquipe1] = useState('');
  const [equipe2, setEquipe2] = useState('');
  const [dateMatch, setDateMatch] = useState('');
  const [lots, setLots] = useState('10 000 Gourdes, tablettes, abonnement Netflix 3 mois');

  const [resultats, setResultats] = useState<Record<string, { r1x2: string; sh: string; sa: string; buteurs: string }>>({});

  useEffect(() => { supabase.auth.getSession().then(({ data }) => { if (data.session) setConnecte(true); }); }, []);
  useEffect(() => { if (connecte) chargerConcours(); }, [connecte]);

  const chargerConcours = async () => {
    const { data } = await supabase.from('concours').select('*').order('date_match', { ascending: false });
    if (data) setConcoursList(data);
  };

  const seConnecter = async () => {
    setErreurAuth('');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setErreurAuth('Email ou mot de passe incorrect.');
    else setConnecte(true);
  };

  const creerConcours = async () => {
    if (!titre || !equipe1 || !equipe2 || !dateMatch) { setMessage('❌ Tous les champs sont obligatoires.'); return; }
    const { error } = await supabase.from('concours').insert({
      titre, equipe1, equipe2, date_match: dateMatch, lots, statut: 'ouvert'
    });
    if (error) { setMessage('❌ ' + error.message); return; }
    setMessage('✅ Concours créé !');
    setTitre(''); setEquipe1(''); setEquipe2(''); setDateMatch('');
    chargerConcours();
    setTimeout(() => setVue('liste'), 1200);
  };

  const changerStatut = async (id: string, statut: string) => {
    await supabase.from('concours').update({ statut }).eq('id', id);
    chargerConcours();
  };

  const enregistrerResultat = async (c: Concours) => {
    const r = resultats[c.id];
    if (!r || !r.r1x2 || r.sh === '' || r.sa === '') { setMessage('❌ Remplissez résultat et score.'); return; }
    const buteursArray = r.buteurs ? r.buteurs.split(',').map(b => b.trim()).filter(b => b) : [];
    await supabase.from('concours').update({
      resultat_1x2: r.r1x2,
      score_home: parseInt(r.sh),
      score_away: parseInt(r.sa),
      buteurs_reels: buteursArray
    }).eq('id', c.id);
    setMessage('✅ Résultat enregistré. Cliquez sur "Calculer les points".');
    chargerConcours();
  };

  const calculerPoints = async (concoursId: string) => {
    setMessage('⏳ Calcul en cours...');
    const res = await fetch('/api/concours-calcul', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ concours_id: concoursId })
    });
    const data = await res.json();
    if (data.success) {
      setMessage('✅ Points calculés pour ' + data.participants + ' participants ! Concours terminé.');
      chargerConcours();
    } else {
      setMessage('❌ ' + (data.error || 'Erreur de calcul'));
    }
  };

  const supprimerConcours = async (id: string) => {
    if (!confirm('Supprimer ce concours et toutes ses participations ?')) return;
    const { data: matchs } = await supabase.from('concours_matchs').select('id').eq('concours_id', id);
    const matchIds = (matchs || []).map(m => m.id);
    if (matchIds.length > 0) {
      await supabase.from('participations_matchs').delete().in('concours_match_id', matchIds);
    }
    await supabase.from('concours_matchs').delete().eq('concours_id', id);
    await supabase.from('parrainages').delete().eq('concours_id', id);
    const { error } = await supabase.from('concours').delete().eq('id', id);
    if (error) { alert('Erreur : ' + error.message); return; }
    chargerConcours();
  };

  if (!connecte) {
    return (
      <div style={{minHeight:'100vh',background:'#111',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'sans-serif'}}>
        <div style={{background:'#1a1a1a',padding:'40px',borderRadius:'16px',width:'100%',maxWidth:'380px',border:'1px solid #333'}}>
          <h1 style={{color:VIOLET,fontWeight:900,fontSize:'24px',marginBottom:'8px',textAlign:'center'}}>Admin Concours</h1>
          <p style={{color:'#6b7280',fontSize:'13px',textAlign:'center',marginBottom:'24px'}}>Accès réservé</p>
          {erreurAuth && <p style={{color:'#ef4444',fontSize:'13px',marginBottom:'12px',textAlign:'center'}}>{erreurAuth}</p>}
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" style={{width:'100%',padding:'12px',borderRadius:'8px',border:'1px solid #333',background:'#222',color:'#fff',fontSize:'14px',marginBottom:'12px',boxSizing:'border-box'}}/>
          <div style={{position:'relative'}}>
            <input type={voirMdp ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="Mot de passe" style={{width:'100%',padding:'12px',paddingRight:'44px',borderRadius:'8px',border:'1px solid #333',background:'#222',color:'#fff',fontSize:'14px',marginBottom:'16px',boxSizing:'border-box'}} onKeyDown={e => e.key === 'Enter' && seConnecter()}/>
            <button type="button" onClick={() => setVoirMdp(v => !v)} style={{position:'absolute',right:'8px',top:'18px',transform:'translateY(-50%)',background:'none',border:'none',cursor:'pointer',fontSize:'18px'}}>{voirMdp ? '🙈' : '👁️'}</button>
          </div>
          <button onClick={seConnecter} style={{width:'100%',padding:'12px',background:VIOLET,color:'#fff',fontWeight:700,borderRadius:'8px',border:'none',cursor:'pointer',fontSize:'15px'}}>Se connecter</button>
        </div>
      </div>
    );
  }

  const inputStyle = {width:'100%',padding:'10px',borderRadius:'8px',border:'1px solid #333',background:'#222',color:'#fff',fontSize:'14px',boxSizing:'border-box' as const};
  const labelStyle = {fontSize:'12px',color:'#9ca3af',display:'block' as const,marginBottom:'4px'};

  return (
    <div style={{minHeight:'100vh',background:'#0f0f0f',fontFamily:'sans-serif'}}>
      <header style={{background:'#111',padding:'12px 24px',display:'flex',justifyContent:'space-between',alignItems:'center',borderBottom:'1px solid #222'}}>
        <h1 style={{color:VIOLET,fontWeight:900,fontSize:'18px',margin:0}}>🏆 Admin Concours</h1>
        <div style={{display:'flex',gap:'8px'}}>
          <a href="/admin" style={{background:'#333',color:'#fff',textDecoration:'none',padding:'10px 16px',borderRadius:'999px',fontWeight:700,fontSize:'14px'}}>← Admin principal</a>
          <button onClick={() => setVue('liste')} style={{background:vue==='liste'?VIOLET:'#333',color:'#fff',border:'none',padding:'10px 16px',borderRadius:'999px',fontWeight:700,fontSize:'14px',cursor:'pointer'}}>Liste</button>
          <button onClick={() => setVue('nouveau')} style={{background:vue==='nouveau'?VIOLET:'#333',color:'#fff',border:'none',padding:'10px 16px',borderRadius:'999px',fontWeight:700,fontSize:'14px',cursor:'pointer'}}>+ Nouveau</button>
        </div>
      </header>

      {message && <div style={{padding:'12px 24px',background:message.includes('❌')?'#7f1d1d':'#064e3b',color:message.includes('❌')?'#fca5a5':'#6ee7b7',fontWeight:700,fontSize:'14px'}}>{message}</div>}

      <main style={{maxWidth:'800px',margin:'0 auto',padding:'32px 16px'}}>

        {vue === 'nouveau' && (
          <div style={{background:'#1a1a1a',border:'1px solid #333',borderRadius:'12px',padding:'24px'}}>
            <h2 style={{color:'#fff',fontWeight:900,fontSize:'20px',marginBottom:'20px'}}>Créer un concours</h2>
            <div style={{marginBottom:'14px'}}><label style={labelStyle}>Titre du concours</label><input value={titre} onChange={e => setTitre(e.target.value)} placeholder="Finale Coupe du Monde 2026" style={inputStyle}/></div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px',marginBottom:'14px'}}>
              <div><label style={labelStyle}>Équipe 1</label><input value={equipe1} onChange={e => setEquipe1(e.target.value)} placeholder="France" style={inputStyle}/></div>
              <div><label style={labelStyle}>Équipe 2</label><input value={equipe2} onChange={e => setEquipe2(e.target.value)} placeholder="Argentine" style={inputStyle}/></div>
            </div>
            <div style={{marginBottom:'14px'}}><label style={labelStyle}>Date et heure du match</label><input type="datetime-local" value={dateMatch} onChange={e => setDateMatch(e.target.value)} style={inputStyle}/></div>
            <div style={{marginBottom:'20px'}}><label style={labelStyle}>Lots</label><input value={lots} onChange={e => setLots(e.target.value)} style={inputStyle}/></div>
            <button onClick={creerConcours} style={{width:'100%',padding:'14px',background:VIOLET,color:'#fff',border:'none',borderRadius:'999px',fontWeight:700,fontSize:'15px',cursor:'pointer'}}>Créer le concours</button>
          </div>
        )}

        {vue === 'liste' && (
          <>
            {concoursList.length === 0 && <p style={{color:'#6b7280'}}>Aucun concours. Créez-en un.</p>}
            {concoursList.map(c => (
              <div key={c.id} style={{background:'#1a1a1a',border:'1px solid #333',borderRadius:'12px',padding:'20px',marginBottom:'16px'}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'12px',flexWrap:'wrap',gap:'8px'}}>
                  <div>
                    <h3 style={{color:'#fff',fontWeight:900,fontSize:'17px',margin:'0 0 4px'}}>{c.titre}</h3>
                    <p style={{color:'#9ca3af',fontSize:'14px',margin:0}}>{c.equipe1} vs {c.equipe2}</p>
                    <p style={{color:'#6b7280',fontSize:'12px',margin:'4px 0 0'}}>{new Date(c.date_match).toLocaleString('fr-FR')}</p>
                  </div>
                  <span style={{fontSize:'11px',padding:'4px 12px',borderRadius:'999px',fontWeight:700,background:c.statut==='ouvert'?'#10b981':c.statut==='ferme'?'#f59e0b':'#6b7280',color:'#fff'}}>
                    {c.statut === 'ouvert' ? 'Ouvert' : c.statut === 'ferme' ? 'Fermé' : 'Terminé'}
                  </span>
                </div>

                <div style={{display:'flex',gap:'8px',flexWrap:'wrap',marginBottom:'16px'}}>
                  {c.statut === 'ouvert' && <button onClick={() => changerStatut(c.id, 'ferme')} style={{padding:'6px 14px',borderRadius:'999px',border:'none',cursor:'pointer',fontWeight:700,fontSize:'12px',background:'#f59e0b',color:'#fff'}}>Fermer les votes</button>}
                  {c.statut === 'ferme' && <button onClick={() => changerStatut(c.id, 'ouvert')} style={{padding:'6px 14px',borderRadius:'999px',border:'none',cursor:'pointer',fontWeight:700,fontSize:'12px',background:'#10b981',color:'#fff'}}>Rouvrir</button>}
                  <button onClick={() => supprimerConcours(c.id)} style={{padding:'6px 14px',borderRadius:'999px',border:'2px solid #ef4444',background:'transparent',color:'#ef4444',cursor:'pointer',fontWeight:700,fontSize:'12px'}}>🗑️ Supprimer</button>
                </div>

                {c.statut !== 'termine' && (
                  <div style={{background:'#222',borderRadius:'10px',padding:'16px'}}>
                    <h4 style={{color:'#fff',fontSize:'14px',fontWeight:700,margin:'0 0 12px'}}>Entrer le résultat final</h4>
                    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'8px',marginBottom:'10px'}}>
                      <div>
                        <label style={labelStyle}>Résultat</label>
                        <select value={resultats[c.id]?.r1x2 || ''} onChange={e => setResultats({...resultats, [c.id]: {...resultats[c.id], r1x2: e.target.value, sh: resultats[c.id]?.sh||'', sa: resultats[c.id]?.sa||'', buteurs: resultats[c.id]?.buteurs||''}})} style={inputStyle}>
                          <option value="">—</option>
                          <option value="1">1 ({c.equipe1})</option>
                          <option value="X">X (Nul)</option>
                          <option value="2">2 ({c.equipe2})</option>
                        </select>
                      </div>
                      <div><label style={labelStyle}>Score {c.equipe1}</label><input type="number" min={0} value={resultats[c.id]?.sh || ''} onChange={e => setResultats({...resultats, [c.id]: {...resultats[c.id], r1x2: resultats[c.id]?.r1x2||'', sh: e.target.value, sa: resultats[c.id]?.sa||'', buteurs: resultats[c.id]?.buteurs||''}})} style={inputStyle}/></div>
                      <div><label style={labelStyle}>Score {c.equipe2}</label><input type="number" min={0} value={resultats[c.id]?.sa || ''} onChange={e => setResultats({...resultats, [c.id]: {...resultats[c.id], r1x2: resultats[c.id]?.r1x2||'', sh: resultats[c.id]?.sh||'', sa: e.target.value, buteurs: resultats[c.id]?.buteurs||''}})} style={inputStyle}/></div>
                    </div>
                    <div style={{marginBottom:'12px'}}>
                      <label style={labelStyle}>Buteurs réels (séparés par des virgules)</label>
                      <input value={resultats[c.id]?.buteurs || ''} onChange={e => setResultats({...resultats, [c.id]: {...resultats[c.id], r1x2: resultats[c.id]?.r1x2||'', sh: resultats[c.id]?.sh||'', sa: resultats[c.id]?.sa||'', buteurs: e.target.value}})} placeholder="Mbappé, Messi, Griezmann" style={inputStyle}/>
                    </div>
                    <div style={{display:'flex',gap:'8px',flexWrap:'wrap'}}>
                      <button onClick={() => enregistrerResultat(c)} style={{padding:'10px 18px',borderRadius:'999px',border:'none',cursor:'pointer',fontWeight:700,fontSize:'13px',background:'#3b82f6',color:'#fff'}}>💾 Enregistrer résultat</button>
                      {c.resultat_1x2 && <button onClick={() => calculerPoints(c.id)} style={{padding:'10px 18px',borderRadius:'999px',border:'none',cursor:'pointer',fontWeight:700,fontSize:'13px',background:VIOLET,color:'#fff'}}>🧮 Calculer les points</button>}
                    </div>
                    {c.resultat_1x2 && <p style={{color:'#6ee7b7',fontSize:'12px',margin:'10px 0 0'}}>Résultat actuel : {c.resultat_1x2} · {c.score_home}-{c.score_away} · Buteurs : {(c.buteurs_reels||[]).join(', ') || '—'}</p>}
                  </div>
                )}

                {c.statut === 'termine' && (
                  <div style={{background:'#064e3b',borderRadius:'10px',padding:'12px'}}>
                    <p style={{color:'#6ee7b7',fontSize:'13px',margin:0,fontWeight:700}}>✅ Concours terminé — Résultat : {c.resultat_1x2} · {c.score_home}-{c.score_away}</p>
                  </div>
                )}
              </div>
            ))}
          </>
        )}

      </main>
    </div>
  );
}
