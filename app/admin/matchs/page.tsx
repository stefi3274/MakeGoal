'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { getSport, SPORT_COULEURS, SPORT_LABEL, Sport } from '../../../lib/sport';

import AdminAuth from '../../../components/AdminAuth';

const VIOLET = '#bf00ff';

type Match = {
  id: string;
  equipe1: string;
  equipe2: string;
  competition: string | null;
  pays: string | null;
  date_match: string;
  statut: string;
  score_home: number | null;
  score_away: number | null;
  actif: boolean;
  sport: string | null;
  cote_1: number | null;
  cote_x: number | null;
  cote_2: number | null;
};

export default function AdminMatchs() {
  const [connecte, setConnecte] = useState(false);
  const [matchs, setMatchs] = useState<Match[]>([]);
  const [message, setMessage] = useState('');
  const [vue, setVue] = useState<'liste' | 'nouveau' | 'lot'>('liste');
  const [texteLot, setTexteLot] = useState('');
  const [texteLotCotes, setTexteLotCotes] = useState('');
  const [lotCotesEnCours, setLotCotesEnCours] = useState(false);
  const [lotCotesOuvert, setLotCotesOuvert] = useState(false);
  const [championnatCotes, setChampionnatCotes] = useState('Espagne');
  const [actualisationEnCours, setActualisationEnCours] = useState(false);
  const [importLot, setImportLot] = useState(false);
  const [fuseauLot, setFuseauLot] = useState<'Haiti' | 'Europe'>('Haiti');
  const [editId, setEditId] = useState<string | null>(null);

  const [equipe1, setEquipe1] = useState('');
  const [equipe2, setEquipe2] = useState('');
  const [competition, setCompetition] = useState('');
  const [pays, setPays] = useState('');
  const [cote1, setCote1] = useState('');
  const [coteX, setCoteX] = useState('');
  const [cote2, setCote2] = useState('');
  const [dateMatch, setDateMatch] = useState('');

  const [scores, setScores] = useState<Record<string, { sh: string; sa: string }>>({});
  const [sportFiltre, setSportFiltre] = useState<Sport>('football');
  const [sportForm, setSportForm] = useState<Sport>('football');

  useEffect(() => { setSportFiltre(getSport()); setSportForm(getSport()); }, []);
  // (la vérification de session + 2FA est maintenant gérée par <AdminAuth />)
  useEffect(() => { if (connecte) chargerMatchs(); }, [connecte]);

  const chargerMatchs = async () => {
    const { data } = await supabase.from('matchs').select('*').order('date_match', { ascending: false });
    if (data) setMatchs(data);
  };


  const nouveauMatch = () => {
    setEditId(null); setEquipe1(''); setEquipe2(''); setCompetition(''); setPays(''); setDateMatch('');
    setCote1(''); setCoteX(''); setCote2('');
    setSportForm(sportFiltre);
    setVue('nouveau');
  };

  const editerMatch = (m: Match) => {
    setEditId(m.id); setEquipe1(m.equipe1); setEquipe2(m.equipe2);
    setCompetition(m.competition || ''); setPays(m.pays || ''); setDateMatch(m.date_match ? versLocal(m.date_match) : '');
    setCote1(m.cote_1?.toString() || ''); setCoteX(m.cote_x?.toString() || ''); setCote2(m.cote_2?.toString() || '');
    setSportForm((m.sport as Sport) || 'football');
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

  // Convertit "AAAA-MM-JJ HH:MM" saisi dans le fuseau indiqué vers un ISO UTC. Gère automatiquement l'heure d'été/hiver.
  const FUSEAUX = { Haiti: 'America/Port-au-Prince', Europe: 'Europe/Madrid' };
  const texteVersUTC = (s: string, fuseau: 'Haiti' | 'Europe' = 'Haiti') => {
    const iso = s.trim().replace(' ', 'T');
    const naive = new Date(iso + ':00Z');
    const local = new Date(naive.toLocaleString('en-US', { timeZone: FUSEAUX[fuseau] }));
    const diff = naive.getTime() - local.getTime();
    return new Date(naive.getTime() + diff).toISOString();
  };

  const importerLot = async () => {
    setImportLot(true); setMessage('');
    const lignes = texteLot.split('\n').map(l => l.trim());
    let competitionCourante = '';
    let paysCourant = '';
    const aCreer: { equipe1: string; equipe2: string; competition: string; pays: string; date_match: string; sport: Sport }[] = [];
    const erreurs: string[] = [];

    for (const ligne of lignes) {
      if (!ligne) continue;
      const parts = ligne.split(' - ').map(p => p.trim());
      // Ligne d'en-tête : "Journée 5 - Ligue 1" (2 parties, pas de date à la fin)
      // OU "Espagne - La Liga - Journée 3" (3 parties, la 1ère est le pays)
      const derniere = parts[parts.length - 1];
      const ressembleDate = /\d{4}-\d{2}-\d{2}/.test(derniere);
      if (!ressembleDate) {
        if (parts.length >= 3) {
          paysCourant = parts[0];
          competitionCourante = parts.slice(1).join(' - ');
        } else {
          paysCourant = '';
          competitionCourante = ligne;
        }
        continue;
      }
      // Ligne de match : "Equipe1 - Equipe2 - 2026-08-15 15:00"
      if (parts.length < 3) { erreurs.push(ligne); continue; }
      const dateStr = parts[parts.length - 1];
      const equipe2 = parts[parts.length - 2];
      const equipe1 = parts.slice(0, parts.length - 2).join(' - ');
      if (!equipe1 || !equipe2) { erreurs.push(ligne); continue; }
      try {
        aCreer.push({ equipe1, equipe2, competition: competitionCourante, pays: paysCourant, date_match: texteVersUTC(dateStr, fuseauLot), sport: sportForm });
      } catch { erreurs.push(ligne); }
    }

    if (aCreer.length === 0) {
      setMessage('❌ Aucun match reconnu. Vérifiez le format.');
      setImportLot(false);
      return;
    }

    const { error } = await supabase.from('matchs').insert(aCreer);
    setImportLot(false);
    if (error) { setMessage('❌ ' + error.message); return; }
    let msg = '✅ ' + aCreer.length + ' match(s) créé(s) !';
    if (erreurs.length > 0) msg += ' ' + erreurs.length + ' ligne(s) ignorée(s).';
    setMessage(msg);
    setTexteLot('');
    chargerMatchs();
    setTimeout(() => setVue('liste'), 1800);
  };

  const appliquerCotesEnLot = async () => {
    const lignes = texteLotCotes.split('\n').map(l => l.trim()).filter(Boolean);
    if (lignes.length === 0) { setMessage('❌ Collez au moins une ligne.'); return; }
    setLotCotesEnCours(true);
    let appliquees = 0;
    const nonTrouves: string[] = [];

    for (const ligne of lignes) {
      const parts = ligne.split(/\s+-\s+/).map(p => p.trim()).filter(Boolean);
      if (parts.length < 4) { nonTrouves.push(ligne); continue; }

      const equipe1 = parts[0], equipe2 = parts[1];
      // Foot (3 cotes : 1/X/2) ou basket (2 cotes : 1/2)
      const troisCotes = parts.length >= 5;
      const cote1 = parseFloat(parts[2]);
      const coteX = troisCotes ? parseFloat(parts[3]) : null;
      const cote2 = parseFloat(troisCotes ? parts[4] : parts[3]);

      const matchTrouve = matchs.find(m =>
        m.equipe1.toLowerCase().trim() === equipe1.toLowerCase() &&
        m.equipe2.toLowerCase().trim() === equipe2.toLowerCase()
      );
      if (!matchTrouve) { nonTrouves.push(ligne); continue; }

      const { error } = await supabase.from('matchs').update({ cote_1: cote1, cote_x: coteX, cote_2: cote2 }).eq('id', matchTrouve.id);
      if (!error) appliquees++;
      else nonTrouves.push(ligne);
    }

    setLotCotesEnCours(false);
    let msg = '✅ Cotes appliquées sur ' + appliquees + ' match(s).';
    if (nonTrouves.length > 0) msg += ' ⚠️ ' + nonTrouves.length + ' ligne(s) non reconnue(s) ou match introuvable (vérifiez l\'orthographe exacte des équipes).';
    setMessage(msg);
    setTexteLotCotes('');
    chargerMatchs();
  };

  const actualiserCotesReelles = async () => {
    setActualisationEnCours(true); setMessage('');
    const { data: sess } = await supabase.auth.getSession();
    const token = sess.session?.access_token;
    if (!token) { setActualisationEnCours(false); setMessage('❌ Session expirée, reconnectez-vous.'); return; }
    const res = await fetch('/api/cotes-actualiser', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify({ championnat: championnatCotes })
    });
    const data = await res.json();
    setActualisationEnCours(false);
    if (!res.ok) { setMessage('❌ ' + (data.error || 'Erreur.')); return; }
    let msg = '✅ ' + data.miseAJour + ' match(s) mis à jour avec les vraies cotes (' + data.totalEvenementsApi + ' rencontres trouvées côté API).';
    if (data.nonTrouves.length > 0) msg += ' ⚠️ Non reconnus : ' + data.nonTrouves.join(', ') + ' — utilisez le collage manuel ci-dessous pour ceux-là.';
    setMessage(msg);
    chargerMatchs();
  };

  const sauvegarder = async () => {
    if (!equipe1 || !equipe2 || !dateMatch) { setMessage('❌ Équipes et date obligatoires.'); return; }
    const payload = {
      equipe1, equipe2, competition: competition || null, pays: pays || null, date_match: versUTC(dateMatch), sport: sportForm,
      cote_1: cote1 ? parseFloat(cote1) : null, cote_x: coteX ? parseFloat(coteX) : null, cote_2: cote2 ? parseFloat(cote2) : null
    };
    if (editId) {
      const { error } = await supabase.from('matchs').update(payload).eq('id', editId);
      if (error) { setMessage('❌ ' + error.message); return; }
      setMessage('✅ Match modifié !');
    } else {
      const { error } = await supabase.from('matchs').insert(payload);
      if (error) { setMessage('❌ ' + error.message); return; }
      setMessage('✅ Match créé ! Les visiteurs peuvent voter.');
    }
    setEquipe1(''); setEquipe2(''); setCompetition(''); setPays(''); setDateMatch('');
    setCote1(''); setCoteX(''); setCote2(''); setEditId(null);
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
    const sh = parseInt(s.sh), sa = parseInt(s.sa);
    const resultat: '1' | 'X' | '2' = sh > sa ? '1' : sh < sa ? '2' : 'X';
    await supabase.from('matchs').update({ score_home: sh, score_away: sa, statut: 'termine', resultat_reel: resultat }).eq('id', m.id);
    setMessage('✅ Score enregistré !');

    // Déclenche la résolution des paris combinés qui contiennent ce match
    if (m.cote_1 || m.cote_x || m.cote_2) {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token;
      if (token) {
        const res = await fetch('/api/paris-resoudre', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
          body: JSON.stringify({ matchId: m.id, resultat })
        });
        const data = await res.json();
        if (res.ok && data.combinesTraites > 0) {
          setMessage('✅ Score enregistré ! ' + data.combinesTraites + ' pari(s) combiné(s) résolu(s).');
        }
      }
    }
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
    return <AdminAuth titre="Admin Matchs" onAuthentifie={() => setConnecte(true)} />;
  }

  return (
    <div style={{minHeight:'100vh',background:'#0f0f0f',fontFamily:'sans-serif'}}>
      <header style={{background:'#111',padding:'12px 24px',display:'flex',justifyContent:'space-between',alignItems:'center',borderBottom:'1px solid #222',flexWrap:'wrap',gap:'10px'}}>
        <h1 style={{color:SPORT_COULEURS[sportFiltre].primaire,fontWeight:900,fontSize:'18px',margin:0}}>{SPORT_LABEL[sportFiltre].emoji} Admin Matchs</h1>
        <div style={{display:'flex',gap:'6px',background:'#1a1a1a',borderRadius:'999px',padding:'4px'}}>
          {(['football','basketball'] as Sport[]).map(s => (
            <button key={s} onClick={() => setSportFiltre(s)} style={{border:'none',cursor:'pointer',padding:'7px 14px',borderRadius:'999px',fontWeight:800,fontSize:'12.5px',background:sportFiltre===s?SPORT_COULEURS[s].primaire:'transparent',color:sportFiltre===s?'#fff':'#9ca3af'}}>{SPORT_LABEL[s].emoji} {SPORT_LABEL[s].nom}</button>
          ))}
        </div>
        <div style={{display:'flex',gap:'8px'}}>
          <a href="/admin" style={{background:'#333',color:'#fff',textDecoration:'none',padding:'10px 16px',borderRadius:'999px',fontWeight:700,fontSize:'14px'}}>← Admin</a>
          <button onClick={() => setVue('liste')} style={{background:vue==='liste'?VIOLET:'#333',color:'#fff',border:'none',padding:'10px 16px',borderRadius:'999px',fontWeight:700,fontSize:'14px',cursor:'pointer'}}>Liste</button>
          <button onClick={nouveauMatch} style={{background:vue==='nouveau'?VIOLET:'#333',color:'#fff',border:'none',padding:'10px 16px',borderRadius:'999px',fontWeight:700,fontSize:'14px',cursor:'pointer'}}>+ Nouveau</button>
          <button onClick={() => { setSportForm(sportFiltre); setVue('lot'); }} style={{background:vue==='lot'?VIOLET:'#333',color:'#fff',border:'none',padding:'10px 16px',borderRadius:'999px',fontWeight:700,fontSize:'14px',cursor:'pointer'}}>📋 Coller en lot</button>
        </div>
      </header>

      {message && <div style={{padding:'12px 24px',background:message.includes('❌')?'#7f1d1d':'#064e3b',color:message.includes('❌')?'#fca5a5':'#6ee7b7',fontWeight:700,fontSize:'14px'}}>{message}</div>}

      <main style={{maxWidth:'800px',margin:'0 auto',padding:'32px 16px'}}>

        {vue === 'nouveau' && (
          <div style={{background:'#1a1a1a',border:'1px solid #333',borderRadius:'12px',padding:'24px'}}>
            <h2 style={{color:'#fff',fontWeight:900,fontSize:'20px',marginBottom:'20px'}}>{editId ? 'Modifier le match' : 'Nouveau match'}</h2>
            <div style={{display:'flex',gap:'8px',marginBottom:'16px'}}>
              {(['football','basketball'] as Sport[]).map(s => (
                <button key={s} type="button" onClick={() => setSportForm(s)} style={{padding:'8px 16px',borderRadius:'999px',border:'none',cursor:'pointer',fontWeight:700,fontSize:'13px',background:sportForm===s?SPORT_COULEURS[s].primaire:'#333',color:'#fff'}}>{SPORT_LABEL[s].emoji} {SPORT_LABEL[s].nom}</button>
              ))}
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px',marginBottom:'16px'}}>
              <div><label style={labelStyle}>Équipe 1 (domicile)</label><input value={equipe1} onChange={e => setEquipe1(e.target.value)} placeholder="Espagne" style={inputStyle}/></div>
              <div><label style={labelStyle}>Équipe 2 (extérieur)</label><input value={equipe2} onChange={e => setEquipe2(e.target.value)} placeholder="Argentine" style={inputStyle}/></div>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px',marginBottom:'16px'}}>
              <div><label style={labelStyle}>Compétition</label><input value={competition} onChange={e => setCompetition(e.target.value)} placeholder="Coupe du Monde 2026" style={inputStyle}/></div>
              <div><label style={labelStyle}>Pays (pour le drapeau)</label><input value={pays} onChange={e => setPays(e.target.value)} placeholder="Espagne" style={inputStyle}/></div>
            </div>
            <div style={{marginBottom:'20px'}}><label style={labelStyle}>Date et heure</label><input type="datetime-local" value={dateMatch} onChange={e => setDateMatch(e.target.value)} style={inputStyle}/></div>
            <p style={{fontSize:'11px',color:'#9ca3af',margin:'0 0 8px',fontWeight:700}}>Cotes pour les paris combinés (optionnel)</p>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'8px',marginBottom:'20px'}}>
              <div><label style={labelStyle}>Cote 1 ({equipe1 || 'Équipe 1'})</label><input type="number" step="0.01" min="1" value={cote1} onChange={e => setCote1(e.target.value)} placeholder="1.85" style={inputStyle}/></div>
              <div><label style={labelStyle}>Cote X (Nul)</label><input type="number" step="0.01" min="1" value={coteX} onChange={e => setCoteX(e.target.value)} placeholder="3.40" style={inputStyle}/></div>
              <div><label style={labelStyle}>Cote 2 ({equipe2 || 'Équipe 2'})</label><input type="number" step="0.01" min="1" value={cote2} onChange={e => setCote2(e.target.value)} placeholder="4.20" style={inputStyle}/></div>
            </div>
            <button onClick={sauvegarder} style={{width:'100%',padding:'14px',background:VIOLET,color:'#fff',border:'none',borderRadius:'999px',fontWeight:700,fontSize:'15px',cursor:'pointer'}}>{editId ? 'Enregistrer' : 'Créer le match'}</button>
          </div>
        )}

        {vue === 'lot' && (
          <div style={{background:'#1a1a1a',border:'1px solid #333',borderRadius:'12px',padding:'24px'}}>
            <h2 style={{color:'#fff',fontWeight:900,fontSize:'20px',marginBottom:'8px'}}>📋 Coller plusieurs matchs</h2>
            <div style={{display:'flex',gap:'8px',marginBottom:'12px'}}>
              {(['football','basketball'] as Sport[]).map(s => (
                <button key={s} type="button" onClick={() => setSportForm(s)} style={{padding:'8px 16px',borderRadius:'999px',border:'none',cursor:'pointer',fontWeight:700,fontSize:'13px',background:sportForm===s?SPORT_COULEURS[s].primaire:'#333',color:'#fff'}}>{SPORT_LABEL[s].emoji} {SPORT_LABEL[s].nom}</button>
              ))}
            </div>
            <p style={{color:'#9ca3af',fontSize:'13px',marginBottom:'8px'}}>Une ligne de titre par compétition, puis un match par ligne. Ligne vide entre deux compétitions.</p>
            <p style={{color:'#c7d2fe',fontSize:'12px',marginBottom:'8px'}}>💡 Pour afficher le drapeau du pays sur les posts, mettez le pays en premier dans la ligne de titre : "Espagne - La Liga - Journée 3" (3 parties). Sans pays, gardez l'ancien format à 2 parties.</p>
            <pre style={{background:'#0f0f0f',color:'#6ee7b7',fontSize:'12px',padding:'12px',borderRadius:'8px',overflow:'auto',lineHeight:'1.5'}}>{`Espagne - La Liga - Journée 3
Real Betis - Real Madrid - 2026-09-04 15:00
Valencia - FC Barcelone - 2026-09-06 10:15

France - Ligue 1 - Journée 4
PSG - Monaco - 2026-09-04 15:00`}</pre>
            <p style={{color:'#6b7280',fontSize:'11px',margin:'8px 0 6px'}}>Format d'un match : Équipe1 - Équipe2 - AAAA-MM-JJ HH:MM</p>
            <p style={{color:'#9ca3af',fontSize:'12px',fontWeight:700,margin:'0 0 8px'}}>Cette heure collée est dans le fuseau :</p>
            <div style={{display:'flex',gap:'8px',marginBottom:'16px'}}>
              <button type="button" onClick={() => setFuseauLot('Haiti')} style={{padding:'8px 16px',borderRadius:'999px',border:'none',cursor:'pointer',fontWeight:700,fontSize:'13px',background:fuseauLot==='Haiti'?VIOLET:'#333',color:'#fff'}}>🇭🇹 Haïti</button>
              <button type="button" onClick={() => setFuseauLot('Europe')} style={{padding:'8px 16px',borderRadius:'999px',border:'none',cursor:'pointer',fontWeight:700,fontSize:'13px',background:fuseauLot==='Europe'?VIOLET:'#333',color:'#fff'}}>🇪🇸 Europe (Espagne/France)</button>
            </div>
            <textarea value={texteLot} onChange={e => setTexteLot(e.target.value)} rows={12} placeholder="Collez vos matchs ici..." style={{...inputStyle,resize:'vertical',fontFamily:'monospace',lineHeight:'1.6'}}/>
            <button onClick={importerLot} disabled={importLot} style={{width:'100%',marginTop:'16px',padding:'14px',background:VIOLET,color:'#fff',border:'none',borderRadius:'999px',fontWeight:700,fontSize:'15px',cursor:'pointer'}}>{importLot ? '⏳ Import...' : '🚀 Créer tous les matchs'}</button>
          </div>
        )}

        {vue === 'lot' && (
          <div style={{background:'#1a1a1a',border:'1px solid #333',borderRadius:'12px',padding:'24px',marginTop:'16px'}}>
            <h2 style={{color:'#fff',fontWeight:900,fontSize:'18px',marginBottom:'8px'}}>🌐 Vraies cotes (The Odds API)</h2>
            <p style={{color:'#9ca3af',fontSize:'13px',marginBottom:'12px'}}>Va chercher les cotes réelles de vrais bookmakers et les applique automatiquement aux matchs déjà créés, en retrouvant chaque match par le nom de ses équipes.</p>
            <div style={{display:'flex',gap:'8px',marginBottom:'12px'}}>
              <select value={championnatCotes} onChange={e => setChampionnatCotes(e.target.value)} style={{...inputStyle,flex:1}}>
                <option value="Angleterre">🇬🇧 Angleterre — Premier League</option>
                <option value="Espagne">🇪🇸 Espagne — La Liga</option>
                <option value="Italie">🇮🇹 Italie — Serie A</option>
                <option value="France">🇫🇷 France — Ligue 1</option>
                <option value="Portugal">🇵🇹 Portugal — Primeira Liga</option>
                <option value="Ligue des Champions">🇪🇺 Ligue des Champions</option>
              </select>
              <button onClick={actualiserCotesReelles} disabled={actualisationEnCours} style={{padding:'12px 20px',background:'#16a34a',color:'#fff',border:'none',borderRadius:'8px',fontWeight:700,fontSize:'13px',cursor:'pointer',whiteSpace:'nowrap'}}>{actualisationEnCours ? '⏳...' : '🔄 Actualiser'}</button>
            </div>

            <button type="button" onClick={() => setLotCotesOuvert(v => !v)} style={{padding:'10px 18px',borderRadius:'999px',border:'none',cursor:'pointer',fontWeight:700,fontSize:'13px',background:lotCotesOuvert?'#333':'#a855f7',color:'#fff',marginBottom:'16px'}}>{lotCotesOuvert ? '✕ Fermer' : '✏️ Coller des cotes manuellement (secours)'}</button>

            {lotCotesOuvert && (
              <>
                <h2 style={{color:'#fff',fontWeight:900,fontSize:'18px',marginBottom:'8px'}}>Coller les cotes en lot</h2>
                <p style={{color:'#9ca3af',fontSize:'13px',marginBottom:'8px'}}>Retrouve chaque match par le nom exact des équipes (déjà créés) et applique les cotes. Une ligne par match.</p>
                <p style={{color:'#c7d2fe',fontSize:'12px',marginBottom:'8px'}}>Football (3 cotes) : Équipe1 - Équipe2 - Cote1 - CoteX - Cote2</p>
                <p style={{color:'#c7d2fe',fontSize:'12px',marginBottom:'8px'}}>Basketball (2 cotes) : Équipe1 - Équipe2 - Cote1 - Cote2</p>
                <textarea value={texteLotCotes} onChange={e => setTexteLotCotes(e.target.value)} rows={10} placeholder={"Juventus - AC Milan - 1.85 - 3.40 - 4.20\nFC Barcelone - Valencia - 1.30 - 5.50 - 8.00\nArsenal - Chelsea - 1.90 - 3.60 - 3.80"} style={{...inputStyle,resize:'vertical',fontFamily:'monospace',lineHeight:'1.6'}}/>
                <button onClick={appliquerCotesEnLot} disabled={lotCotesEnCours} style={{width:'100%',marginTop:'16px',padding:'14px',background:'#a855f7',color:'#fff',border:'none',borderRadius:'999px',fontWeight:700,fontSize:'15px',cursor:'pointer'}}>{lotCotesEnCours ? '⏳ Application...' : '🎲 Appliquer les cotes'}</button>
              </>
            )}
          </div>
        )}

        {vue === 'liste' && (
          <>
            {matchs.filter(m => (m.sport || 'football') === sportFiltre).length === 0 && <p style={{color:'#6b7280'}}>Aucun match {SPORT_LABEL[sportFiltre].nom.toLowerCase()}. Créez-en un pour lancer le vote.</p>}
            {matchs.filter(m => (m.sport || 'football') === sportFiltre).map(m => (
              <div key={m.id} style={{background:'#1a1a1a',border:'1px solid #333',borderRadius:'12px',padding:'20px',marginBottom:'16px'}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'12px',flexWrap:'wrap',gap:'8px'}}>
                  <div>
                    {(m.pays || m.competition) && <p style={{color:'#6b7280',fontSize:'11px',margin:'0 0 4px',textTransform:'uppercase',letterSpacing:'1px'}}>{m.pays ? m.pays + ' · ' : ''}{m.competition}</p>}
                    <h3 style={{color:'#fff',fontWeight:900,fontSize:'17px',margin:'0 0 4px'}}>{m.equipe1} vs {m.equipe2}</h3>
                    <p style={{color:'#6b7280',fontSize:'12px',margin:0}}>{new Date(m.date_match).toLocaleString('fr-FR',{day:'numeric',month:'long',hour:'2-digit',minute:'2-digit',timeZone:'America/Port-au-Prince'})}</p>
                    {(m.cote_1 || m.cote_x || m.cote_2) && (
                      <p style={{color:'#a78bfa',fontSize:'11px',fontWeight:700,margin:'4px 0 0'}}>Cotes : 1 → {m.cote_1 || '—'} · X → {m.cote_x || '—'} · 2 → {m.cote_2 || '—'}</p>
                    )}
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
