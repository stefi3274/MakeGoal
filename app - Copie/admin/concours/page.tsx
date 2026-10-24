'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { getSport, SPORT_COULEURS, SPORT_LABEL, Sport } from '../../../lib/sport';

import AdminAuth from '../../../components/AdminAuth';

const VIOLET = '#bf00ff';

type Concours = {
  id: string;
  titre: string;
  description: string | null;
  statut: string;
  lots: string | null;
  created_at: string;
  sport: string | null;
};

type ConcoursMatch = {
  id: string;
  concours_id: string;
  equipe1: string;
  equipe2: string;
  date_match: string;
  ordre: number;
  label: string | null;
  resultat_1x2: string | null;
  score_home: number | null;
  score_away: number | null;
  buteurs_reels: string[] | null;
  passeurs_reels: string[] | null;
};

export default function AdminConcours() {
  const [connecte, setConnecte] = useState(false);
  const [concoursList, setConcoursList] = useState<Concours[]>([]);
  const [matchsByConcours, setMatchsByConcours] = useState<Record<string, ConcoursMatch[]>>({});
  const [message, setMessage] = useState('');
  const [vue, setVue] = useState<'liste' | 'nouveau'>('liste');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [titre, setTitre] = useState('');
  const [description, setDescription] = useState('');
  const [lots, setLots] = useState('10 000 Gourdes, tablettes, abonnement Netflix 3 mois');
  const [sportFiltre, setSportFiltre] = useState<Sport>('football');
  const [sportForm, setSportForm] = useState<Sport>('football');

  useEffect(() => { setSportFiltre(getSport()); setSportForm(getSport()); }, []);

  const [nEquipe1, setNEquipe1] = useState('');
  const [nEquipe2, setNEquipe2] = useState('');
  const [nDateMatch, setNDateMatch] = useState('');
  const [nLabel, setNLabel] = useState('');
  const [ajoutMatchEnCours, setAjoutMatchEnCours] = useState(false);
  const [texteLotMatchs, setTexteLotMatchs] = useState('');
  const [lotMatchsEnCours, setLotMatchsEnCours] = useState(false);

  const [resultats, setResultats] = useState<Record<string, { r1x2: string; sh: string; sa: string; buteurs: string; passeurs: string }>>({});
  const [calculEnCours, setCalculEnCours] = useState<string>('');

  // (la vérification de session + 2FA est maintenant gérée par <AdminAuth />)
  useEffect(() => { if (connecte) chargerConcours(); }, [connecte]);

  const versUTC = (local: string) => {
    if (!local) return local;
    const d = new Date(local + ':00-04:00');
    return d.toISOString();
  };

  const chargerConcours = async () => {
    const { data } = await supabase.from('concours').select('*').order('created_at', { ascending: false });
    if (data) setConcoursList(data);
  };

  const chargerMatchs = async (concoursId: string) => {
    const { data } = await supabase.from('concours_matchs').select('*').eq('concours_id', concoursId).order('ordre', { ascending: true });
    setMatchsByConcours(prev => ({ ...prev, [concoursId]: data || [] }));
  };


  const creerConcours = async () => {
    if (!titre || !lots) { setMessage('❌ Le titre et les lots sont obligatoires.'); return; }
    const { data, error } = await supabase.from('concours').insert({
      titre, description: description || null, lots, statut: 'ouvert', sport: sportForm
    }).select().single();
    if (error) { setMessage('❌ ' + error.message); return; }
    setMessage('✅ Concours créé ! Ajoutez maintenant ses matchs ci-dessous.');
    setTitre(''); setDescription(''); setLots('10 000 Gourdes, tablettes, abonnement Netflix 3 mois');
    await chargerConcours();
    setVue('liste');
    if (data) { setExpandedId(data.id); await chargerMatchs(data.id); }
  };

  const toggleExpand = async (id: string) => {
    if (expandedId === id) { setExpandedId(null); return; }
    setExpandedId(id);
    if (!matchsByConcours[id]) await chargerMatchs(id);
  };

  const ajouterMatch = async (concoursId: string) => {
    if (!nEquipe1 || !nEquipe2 || !nDateMatch) { setMessage('❌ Équipe 1, Équipe 2 et la date sont obligatoires.'); return; }
    setAjoutMatchEnCours(true);
    const ordreActuel = (matchsByConcours[concoursId] || []).length + 1;
    const { error } = await supabase.from('concours_matchs').insert({
      concours_id: concoursId,
      equipe1: nEquipe1,
      equipe2: nEquipe2,
      date_match: versUTC(nDateMatch),
      ordre: ordreActuel,
      label: nLabel || null
    });
    setAjoutMatchEnCours(false);
    if (error) { setMessage('❌ ' + error.message); return; }
    setMessage('✅ Match ajouté au concours.');
    setNEquipe1(''); setNEquipe2(''); setNDateMatch(''); setNLabel('');
    chargerMatchs(concoursId);
  };

  const ajouterMatchsEnLot = async (concoursId: string) => {
    const lignes = texteLotMatchs.split('\n').map(l => l.trim());
    let ordreActuel = (matchsByConcours[concoursId] || []).length;
    let labelCourant: string | null = null;
    const aCreer: { concours_id: string; equipe1: string; equipe2: string; date_match: string; ordre: number; label: string | null }[] = [];
    const erreurs: string[] = [];
    for (const ligne of lignes) {
      if (!ligne) continue;
      const parts = ligne.split(/\s+-\s+/).map(p => p.trim()).filter(p => p !== '');
      const ressembleDate = parts.length > 0 && /\d{4}-\d{2}-\d{2}/.test(parts[parts.length - 1]);
      if (!ressembleDate) {
        // Ligne d'en-tête (nom du championnat) : devient l'étiquette des matchs suivants
        labelCourant = ligne;
        continue;
      }
      if (parts.length < 3) { erreurs.push(ligne); continue; }
      const dateStr = parts[parts.length - 1];
      const equipe2 = parts[parts.length - 2];
      const equipe1 = parts.slice(0, parts.length - 2).join(' - ');
      try {
        ordreActuel++;
        aCreer.push({ concours_id: concoursId, equipe1, equipe2, date_match: versUTC(dateStr.replace(' ', 'T')), ordre: ordreActuel, label: labelCourant });
      } catch { erreurs.push(ligne); }
    }
    if (aCreer.length === 0) { setMessage('❌ Aucune ligne reconnue. Format : Équipe1 - Équipe2 - AAAA-MM-JJ HH:MM'); return; }
    setLotMatchsEnCours(true);
    const { error } = await supabase.from('concours_matchs').insert(aCreer);
    setLotMatchsEnCours(false);
    if (error) { setMessage('❌ ' + error.message); return; }
    let msg = '✅ ' + aCreer.length + ' match(s) ajouté(s) au concours.';
    if (erreurs.length > 0) msg += ' (' + erreurs.length + ' ligne(s) ignorée(s), format non reconnu)';
    setMessage(msg);
    setTexteLotMatchs('');
    chargerMatchs(concoursId);
  };

  const supprimerMatch = async (matchId: string, concoursId: string) => {
    if (!confirm('Supprimer ce match du concours et tous les pronostics associés ?')) return;
    await supabase.from('participations_matchs').delete().eq('concours_match_id', matchId);
    const { error } = await supabase.from('concours_matchs').delete().eq('id', matchId);
    if (error) { setMessage('❌ ' + error.message); return; }
    chargerMatchs(concoursId);
  };

  const changerStatut = async (id: string, statut: string) => {
    await supabase.from('concours').update({ statut }).eq('id', id);
    chargerConcours();
  };

  const enregistrerResultatMatch = async (m: ConcoursMatch) => {
    const r = resultats[m.id];
    if (!r || !r.r1x2 || r.sh === '' || r.sa === '') { setMessage('❌ Remplissez résultat et score pour ce match.'); return; }
    const buteursArray = r.buteurs ? r.buteurs.split(',').map(b => b.trim()).filter(b => b) : [];
    const passeursArray = r.passeurs ? r.passeurs.split(',').map(p => p.trim()).filter(p => p) : [];
    const { error } = await supabase.from('concours_matchs').update({
      resultat_1x2: r.r1x2,
      score_home: parseInt(r.sh),
      score_away: parseInt(r.sa),
      buteurs_reels: buteursArray,
      passeurs_reels: passeursArray
    }).eq('id', m.id);
    if (error) { setMessage('❌ ' + error.message); return; }
    setMessage('✅ Résultat enregistré. Cliquez sur "Calculer les points" pour ce match.');
    chargerMatchs(m.concours_id);
  };

  const calculerPointsMatch = async (matchId: string, concoursId: string) => {
    setCalculEnCours(matchId);
    setMessage('⏳ Calcul en cours...');
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) { setMessage('❌ Session expirée, reconnectez-vous.'); setCalculEnCours(''); return; }
    const res = await fetch('/api/concours-calcul', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify({ concours_match_id: matchId })
    });
    const data = await res.json();
    setCalculEnCours('');
    if (data.success) {
      setMessage('✅ Points calculés pour ' + data.participants + ' participants sur ce match.');
      chargerMatchs(concoursId);
    } else {
      setMessage('❌ ' + (data.error || 'Erreur de calcul'));
    }
  };

  const supprimerConcours = async (id: string) => {
    if (!confirm('Supprimer ce concours, tous ses matchs et toutes ses participations ?')) return;
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
    return <AdminAuth titre="Admin Concours" onAuthentifie={() => setConnecte(true)} />;
  }

  const inputStyle = {width:'100%',padding:'10px',borderRadius:'8px',border:'1px solid #333',background:'#222',color:'#fff',fontSize:'14px',boxSizing:'border-box' as const};
  const labelStyle = {fontSize:'12px',color:'#9ca3af',display:'block' as const,marginBottom:'4px'};

  return (
    <div style={{minHeight:'100vh',background:'#0f0f0f',fontFamily:'sans-serif'}}>
      <header style={{background:'#111',padding:'12px 24px',display:'flex',justifyContent:'space-between',alignItems:'center',borderBottom:'1px solid #222',flexWrap:'wrap',gap:'10px'}}>
        <h1 style={{color:SPORT_COULEURS[sportFiltre].primaire,fontWeight:900,fontSize:'18px',margin:0}}>🏆 Admin Concours</h1>
        <div style={{display:'flex',gap:'6px',background:'#1a1a1a',borderRadius:'999px',padding:'4px'}}>
          {(['football','basketball'] as Sport[]).map(s => (
            <button key={s} onClick={() => setSportFiltre(s)} style={{border:'none',cursor:'pointer',padding:'7px 14px',borderRadius:'999px',fontWeight:800,fontSize:'12.5px',background:sportFiltre===s?SPORT_COULEURS[s].primaire:'transparent',color:sportFiltre===s?'#fff':'#9ca3af'}}>{SPORT_LABEL[s].emoji} {SPORT_LABEL[s].nom}</button>
          ))}
        </div>
        <div style={{display:'flex',gap:'8px'}}>
          <a href="/admin" style={{background:'#333',color:'#fff',textDecoration:'none',padding:'10px 16px',borderRadius:'999px',fontWeight:700,fontSize:'14px'}}>← Admin principal</a>
          <button onClick={() => setVue('liste')} style={{background:vue==='liste'?VIOLET:'#333',color:'#fff',border:'none',padding:'10px 16px',borderRadius:'999px',fontWeight:700,fontSize:'14px',cursor:'pointer'}}>Liste</button>
          <button onClick={() => { setSportForm(sportFiltre); setVue('nouveau'); }} style={{background:vue==='nouveau'?VIOLET:'#333',color:'#fff',border:'none',padding:'10px 16px',borderRadius:'999px',fontWeight:700,fontSize:'14px',cursor:'pointer'}}>+ Nouveau</button>
        </div>
      </header>

      {message && <div style={{padding:'12px 24px',background:message.includes('❌')?'#7f1d1d':'#064e3b',color:message.includes('❌')?'#fca5a5':'#6ee7b7',fontWeight:700,fontSize:'14px'}}>{message}</div>}

      <main style={{maxWidth:'800px',margin:'0 auto',padding:'32px 16px'}}>

        {vue === 'nouveau' && (
          <div style={{background:'#1a1a1a',border:'1px solid #333',borderRadius:'12px',padding:'24px'}}>
            <h2 style={{color:'#fff',fontWeight:900,fontSize:'20px',marginBottom:'20px'}}>Créer un concours</h2>
            <div style={{display:'flex',gap:'8px',marginBottom:'16px'}}>
              {(['football','basketball'] as Sport[]).map(s => (
                <button key={s} type="button" onClick={() => setSportForm(s)} style={{padding:'8px 16px',borderRadius:'999px',border:'none',cursor:'pointer',fontWeight:700,fontSize:'13px',background:sportForm===s?SPORT_COULEURS[s].primaire:'#333',color:'#fff'}}>{SPORT_LABEL[s].emoji} {SPORT_LABEL[s].nom}</button>
              ))}
            </div>
            <div style={{marginBottom:'14px'}}><label style={labelStyle}>Titre du concours</label><input value={titre} onChange={e => setTitre(e.target.value)} placeholder="Coupe du Monde 2026" style={inputStyle}/></div>
            <div style={{marginBottom:'14px'}}><label style={labelStyle}>Description (optionnel)</label><input value={description} onChange={e => setDescription(e.target.value)} placeholder="Pronostiquez les matchs de la phase de groupes" style={inputStyle}/></div>
            <div style={{marginBottom:'20px'}}><label style={labelStyle}>Lots</label><input value={lots} onChange={e => setLots(e.target.value)} style={inputStyle}/></div>
            <button onClick={creerConcours} style={{width:'100%',padding:'14px',background:VIOLET,color:'#fff',border:'none',borderRadius:'999px',fontWeight:700,fontSize:'15px',cursor:'pointer'}}>Créer le concours</button>
            <p style={{color:'#6b7280',fontSize:'12px',marginTop:'12px'}}>Une fois créé, ajoutez ses matchs dans la vue "Liste".</p>
          </div>
        )}

        {vue === 'liste' && (
          <>
            {concoursList.filter(c => (c.sport || 'football') === sportFiltre).length === 0 && <p style={{color:'#6b7280'}}>Aucun concours {SPORT_LABEL[sportFiltre].nom.toLowerCase()}. Créez-en un.</p>}
            {concoursList.filter(c => (c.sport || 'football') === sportFiltre).map(c => {
              const matchs = matchsByConcours[c.id] || [];
              const ouvert = expandedId === c.id;
              return (
                <div key={c.id} style={{background:'#1a1a1a',border:'1px solid #333',borderRadius:'12px',padding:'20px',marginBottom:'16px'}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'12px',flexWrap:'wrap',gap:'8px'}}>
                    <div>
                      <h3 style={{color:'#fff',fontWeight:900,fontSize:'17px',margin:'0 0 4px'}}>{c.titre}</h3>
                      {c.description && <p style={{color:'#9ca3af',fontSize:'13px',margin:'0 0 4px'}}>{c.description}</p>}
                      <p style={{color:'#6b7280',fontSize:'12px',margin:0}}>🎁 {c.lots}</p>
                    </div>
                    <span style={{fontSize:'11px',padding:'4px 12px',borderRadius:'999px',fontWeight:700,background:c.statut==='ouvert'?'#10b981':c.statut==='ferme'?'#f59e0b':'#6b7280',color:'#fff'}}>
                      {c.statut === 'ouvert' ? 'Ouvert' : c.statut === 'ferme' ? 'Fermé' : 'Terminé'}
                    </span>
                  </div>

                  <div style={{display:'flex',gap:'8px',flexWrap:'wrap',marginBottom:'16px'}}>
                    {c.statut === 'ouvert' && <button onClick={() => changerStatut(c.id, 'ferme')} style={{padding:'6px 14px',borderRadius:'999px',border:'none',cursor:'pointer',fontWeight:700,fontSize:'12px',background:'#f59e0b',color:'#fff'}}>Fermer les votes</button>}
                    {c.statut === 'ferme' && <button onClick={() => changerStatut(c.id, 'ouvert')} style={{padding:'6px 14px',borderRadius:'999px',border:'none',cursor:'pointer',fontWeight:700,fontSize:'12px',background:'#10b981',color:'#fff'}}>Rouvrir</button>}
                    {c.statut !== 'termine' && <button onClick={() => changerStatut(c.id, 'termine')} style={{padding:'6px 14px',borderRadius:'999px',border:'2px solid #6b7280',background:'transparent',color:'#9ca3af',cursor:'pointer',fontWeight:700,fontSize:'12px'}}>Marquer terminé</button>}
                    <button onClick={() => toggleExpand(c.id)} style={{padding:'6px 14px',borderRadius:'999px',border:'none',cursor:'pointer',fontWeight:700,fontSize:'12px',background:VIOLET,color:'#fff'}}>{ouvert ? '▲ Fermer les matchs' : '▼ Gérer les matchs (' + matchs.length + ')'}</button>
                    <button onClick={() => supprimerConcours(c.id)} style={{padding:'6px 14px',borderRadius:'999px',border:'2px solid #ef4444',background:'transparent',color:'#ef4444',cursor:'pointer',fontWeight:700,fontSize:'12px'}}>🗑️ Supprimer</button>
                  </div>

                  {ouvert && (
                    <div style={{background:'#222',borderRadius:'10px',padding:'16px'}}>
                      <h4 style={{color:'#fff',fontSize:'14px',fontWeight:700,margin:'0 0 12px'}}>Ajouter un match</h4>
                      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px',marginBottom:'8px'}}>
                        <div><label style={labelStyle}>Équipe 1</label><input value={nEquipe1} onChange={e => setNEquipe1(e.target.value)} placeholder="France" style={inputStyle}/></div>
                        <div><label style={labelStyle}>Équipe 2</label><input value={nEquipe2} onChange={e => setNEquipe2(e.target.value)} placeholder="Argentine" style={inputStyle}/></div>
                      </div>
                      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px',marginBottom:'12px'}}>
                        <div><label style={labelStyle}>Date et heure (Haïti)</label><input type="datetime-local" value={nDateMatch} onChange={e => setNDateMatch(e.target.value)} style={inputStyle}/></div>
                        <div><label style={labelStyle}>Étiquette (optionnel)</label><input value={nLabel} onChange={e => setNLabel(e.target.value)} placeholder="Quart de finale" style={inputStyle}/></div>
                      </div>
                      <button onClick={() => ajouterMatch(c.id)} disabled={ajoutMatchEnCours} style={{width:'100%',padding:'10px',background:VIOLET,color:'#fff',border:'none',borderRadius:'999px',fontWeight:700,fontSize:'13px',cursor:'pointer',marginBottom:'20px'}}>{ajoutMatchEnCours ? '⏳...' : '+ Ajouter ce match'}</button>

                      <h4 style={{color:'#fff',fontSize:'14px',fontWeight:700,margin:'0 0 8px'}}>Ou coller plusieurs matchs à la fois</h4>
                      <p style={{color:'#6b7280',fontSize:'11px',margin:'0 0 8px'}}>Une ligne avec le nom du championnat, puis un match par ligne en dessous (Équipe1 - Équipe2 - AAAA-MM-JJ HH:MM, fuseau Haïti). Ligne vide entre deux championnats.</p>
                      <textarea value={texteLotMatchs} onChange={e => setTexteLotMatchs(e.target.value)} rows={10} placeholder={"Italie\nJuventus - AC Milan - 2026-09-06 14:45\n\nEspagne\nValencia - FC Barcelone - 2026-09-06 10:15\n\nAngleterre\nArsenal - Chelsea - 2026-09-06 11:30"} style={{...inputStyle,marginBottom:'10px',fontFamily:'monospace',fontSize:'12px'}}/>
                      <button onClick={() => ajouterMatchsEnLot(c.id)} disabled={lotMatchsEnCours} style={{width:'100%',padding:'10px',background:'#3b82f6',color:'#fff',border:'none',borderRadius:'999px',fontWeight:700,fontSize:'13px',cursor:'pointer',marginBottom:'20px'}}>{lotMatchsEnCours ? '⏳...' : '📚 Ajouter tous ces matchs'}</button>

                      {matchs.length === 0 && <p style={{color:'#6b7280',fontSize:'13px'}}>Aucun match. Ajoutez-en un ci-dessus.</p>}

                      {matchs.map(m => (
                        <div key={m.id} style={{background:'#1a1a1a',border:'1px solid #333',borderRadius:'10px',padding:'14px',marginBottom:'12px'}}>
                          <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'8px'}}>
                            <div>
                              {m.label && <div style={{display:'inline-block',background:'#333',color:'#fff',fontSize:'10px',fontWeight:700,padding:'2px 10px',borderRadius:'999px',marginBottom:'6px'}}>{m.label}</div>}
                              <p style={{color:'#fff',fontWeight:700,fontSize:'14px',margin:0}}>{m.equipe1} vs {m.equipe2}</p>
                              <p style={{color:'#6b7280',fontSize:'12px',margin:'2px 0 0'}}>{new Date(m.date_match).toLocaleString('fr-FR', {timeZone:'America/Port-au-Prince'})}</p>
                            </div>
                            <button onClick={() => supprimerMatch(m.id, c.id)} style={{background:'none',border:'none',color:'#ef4444',cursor:'pointer',fontSize:'16px'}}>🗑️</button>
                          </div>

                          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'8px',marginBottom:'8px'}}>
                            <div>
                              <label style={labelStyle}>Résultat</label>
                              <select value={resultats[m.id]?.r1x2 || ''} onChange={e => setResultats({...resultats, [m.id]: {...resultats[m.id], r1x2: e.target.value, sh: resultats[m.id]?.sh||'', sa: resultats[m.id]?.sa||'', buteurs: resultats[m.id]?.buteurs||'', passeurs: resultats[m.id]?.passeurs||''}})} style={inputStyle}>
                                <option value="">—</option>
                                <option value="1">1 ({m.equipe1})</option>
                                <option value="X">X (Nul)</option>
                                <option value="2">2 ({m.equipe2})</option>
                              </select>
                            </div>
                            <div><label style={labelStyle}>Score {m.equipe1}</label><input type="number" min={0} value={resultats[m.id]?.sh || ''} onChange={e => setResultats({...resultats, [m.id]: {...resultats[m.id], r1x2: resultats[m.id]?.r1x2||'', sh: e.target.value, sa: resultats[m.id]?.sa||'', buteurs: resultats[m.id]?.buteurs||'', passeurs: resultats[m.id]?.passeurs||''}})} style={inputStyle}/></div>
                            <div><label style={labelStyle}>Score {m.equipe2}</label><input type="number" min={0} value={resultats[m.id]?.sa || ''} onChange={e => setResultats({...resultats, [m.id]: {...resultats[m.id], r1x2: resultats[m.id]?.r1x2||'', sh: resultats[m.id]?.sh||'', sa: e.target.value, buteurs: resultats[m.id]?.buteurs||'', passeurs: resultats[m.id]?.passeurs||''}})} style={inputStyle}/></div>
                          </div>
                          <div style={{marginBottom:'10px'}}>
                            <label style={labelStyle}>Buteurs réels (séparés par des virgules)</label>
                            <input value={resultats[m.id]?.buteurs || ''} onChange={e => setResultats({...resultats, [m.id]: {...resultats[m.id], r1x2: resultats[m.id]?.r1x2||'', sh: resultats[m.id]?.sh||'', sa: resultats[m.id]?.sa||'', buteurs: e.target.value, passeurs: resultats[m.id]?.passeurs||''}})} placeholder="Mbappé, Messi, Griezmann" style={inputStyle}/>
                          </div>
                          <div style={{marginBottom:'10px'}}>
                            <label style={labelStyle}>Passeurs réels (séparés par des virgules)</label>
                            <input value={resultats[m.id]?.passeurs || ''} onChange={e => setResultats({...resultats, [m.id]: {...resultats[m.id], r1x2: resultats[m.id]?.r1x2||'', sh: resultats[m.id]?.sh||'', sa: resultats[m.id]?.sa||'', buteurs: resultats[m.id]?.buteurs||'', passeurs: e.target.value}})} placeholder="Valverde, Hakimi, Griezmann" style={inputStyle}/>
                          </div>
                          <div style={{display:'flex',gap:'8px',flexWrap:'wrap'}}>
                            <button onClick={() => enregistrerResultatMatch(m)} style={{padding:'8px 16px',borderRadius:'999px',border:'none',cursor:'pointer',fontWeight:700,fontSize:'12px',background:'#3b82f6',color:'#fff'}}>💾 Enregistrer résultat</button>
                            {m.resultat_1x2 && <button onClick={() => calculerPointsMatch(m.id, c.id)} disabled={calculEnCours===m.id} style={{padding:'8px 16px',borderRadius:'999px',border:'none',cursor:'pointer',fontWeight:700,fontSize:'12px',background:VIOLET,color:'#fff'}}>{calculEnCours===m.id ? '⏳...' : '🧮 Calculer les points'}</button>}
                          </div>
                          {m.resultat_1x2 && <p style={{color:'#6ee7b7',fontSize:'12px',margin:'8px 0 0'}}>Résultat : {m.resultat_1x2} · {m.score_home}-{m.score_away} · Buteurs : {(m.buteurs_reels||[]).join(', ') || '—'} · Passeurs : {(m.passeurs_reels||[]).join(', ') || '—'}</p>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </>
        )}

      </main>
    </div>
  );
}
