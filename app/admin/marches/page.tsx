'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import AdminAuth from '../../../components/AdminAuth';
import { parserResultats } from '../../../lib/caisseResultats';
import { parserLotCaisse, type Fuseau } from '../../../lib/caisseLot';
import { MARCHES, libelleCombo, numeroAffiche, type Marche, type Leg } from '../../../lib/caisse';

type MatchLite = { id: string; equipe1: string; equipe2: string; competition: string | null; date_match: string; a_regler?: boolean };
type Offre = { id: string; marche: Marche; choix: string; libelle: string; cote: number; actif: boolean; resultat: string | null; legs: Leg[] | null };
type TicketRow = { id: string; numero: number; mise: number; cote_totale: number; gain_potentiel: number; statut: string; gain_final: number | null; created_at: string };
type Rapport = { nombre: number; encaisse: number; paye: number; aPayer: number; enAttente: number };

const VIOLET = '#bf00ff';
const MARCHES_ORDRE: Marche[] = ['1x2', 'dc', 'mt_1x2', 'mt_dc', 'une_mt', 'ou', 'combo', 'buteur', 'premier_buteur', 'qualif'];
const CHOIX_FIXES: Partial<Record<Marche, string[]>> = { '1x2': ['1', 'X', '2'], mt_1x2: ['1', 'X', '2'], dc: ['1X', 'X2', '12'], mt_dc: ['1X', 'X2', '12'], une_mt: ['1', '2'], qualif: ['1', '2'] };
const MARCHES_JAMBES: Marche[] = ['1x2', 'dc', 'mt_1x2', 'mt_dc', 'une_mt', 'ou'];
const LIGNES = ['0.5', '1.5', '2.5', '3.5', '4.5', '5.5'];

const inputStyle = { padding: '10px', borderRadius: '8px', border: '1px solid #333', background: '#222', color: '#fff', fontSize: '14px', boxSizing: 'border-box' as const };
const bouton = (bg: string) => ({ padding: '8px 14px', borderRadius: '999px', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '12px', background: bg, color: '#fff', whiteSpace: 'nowrap' as const });
const heureHaiti = (iso: string) => new Date(iso).toLocaleString('fr-FR', { timeZone: 'America/Port-au-Prince', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

export default function AdminMarches() {
  const [connecte, setConnecte] = useState(false);
  const [vue, setVue] = useState<'offres' | 'lot' | 'resultats' | 'rapport' | 'caissiers' | 'journal'>('offres');
  const [matchs, setMatchs] = useState<MatchLite[]>([]);
  const [matchId, setMatchId] = useState('');
  const [match, setMatch] = useState<(MatchLite & { score_home: number | null; score_away: number | null; score_mt_home: number | null; score_mt_away: number | null }) | null>(null);
  const [offres, setOffres] = useState<Offre[]>([]);
  const [cotes, setCotes] = useState<Record<string, string>>({});
  const [message, setMessage] = useState('');
  const [occupe, setOccupe] = useState(false);

  // formulaire nouvelle offre
  const [marche, setMarche] = useState<Marche>('1x2');
  const [choix, setChoix] = useState('1');
  const [sens, setSens] = useState<'over' | 'under'>('over');
  const [ligne, setLigne] = useState('2.5');
  const [nom, setNom] = useState('');
  const [cote, setCote] = useState('');
  const [libelle, setLibelle] = useState('');
  const [jambes, setJambes] = useState<Leg[]>([{ marche: '1x2', choix: '2' }, { marche: 'ou', choix: 'over_1.5' }]);

  // règlement
  const [sc, setSc] = useState({ ftH: '', ftA: '', htH: '', htA: '' });

  // collage en lot
  const [texteLot, setTexteLot] = useState('');
  const [fuseau, setFuseau] = useState<Fuseau>('Haiti');
  const [erreursLot, setErreursLot] = useState<string[]>([]);
  const apercuLot = texteLot.trim() ? parserLotCaisse(texteLot, fuseau) : null;
  const importerLot = async () => {
    setOccupe(true); setMessage(''); setErreursLot([]);
    try {
      const j = await appeler({ action: 'importer_lot', texte: texteLot, fuseau });
      setMessage('✅ ' + j.crees + ' match(s) créé(s), ' + j.misAJour + ' mis à jour, ' + j.offres + ' offre(s) enregistrée(s).');
      setErreursLot(j.erreurs || []);
      if (!(j.erreurs || []).length) setTexteLot('');
      appeler({ action: 'matchs' }).then(r => setMatchs(r.matchs));
    } catch (e) { setMessage('❌ ' + (e as Error).message); }
    setOccupe(false);
  };

  // caissiers + journal
  const [caissiers, setCaissiers] = useState<{ user_id: string; nom: string | null; email: string; en_attente?: boolean }[]>([]);
  const [lienInvitation, setLienInvitation] = useState('');
  const [emailCaissier, setEmailCaissier] = useState('');
  const [nomCaissier, setNomCaissier] = useState('');
  const [journalLignes, setJournalLignes] = useState<{ id: number; created_at: string; email: string | null; action: string; details: Record<string, unknown> }[]>([]);
  const chargerCaissiers = async () => { try { const j = await appeler({ action: 'caissiers_lister' }); setCaissiers(j.caissiers); } catch (e) { setMessage('❌ ' + (e as Error).message); } };
  const chargerJournal = async () => { try { const j = await appeler({ action: 'journal' }); setJournalLignes(j.journal); } catch (e) { setMessage('❌ ' + (e as Error).message); } };
  useEffect(() => { if (connecte && vue === 'caissiers') chargerCaissiers(); if (connecte && vue === 'journal') chargerJournal(); }, [connecte, vue]);
  const ajouterCaissier = async (mode: 'mail' | 'lien') => {
    setOccupe(true); setMessage(''); setLienInvitation('');
    try {
      const j = await appeler({ action: 'caissier_ajouter', email: emailCaissier, nom: nomCaissier, mode });
      if (j.lien) setLienInvitation(j.lien);
      setMessage(!j.invite ? '✅ Compte existant : ajouté comme caissier.' : j.lien ? '✅ Caissier créé. Copiez le lien ci-dessous et envoyez-le lui (WhatsApp, SMS).' : '✅ Invitation envoyée par e-mail.');
      setEmailCaissier(''); setNomCaissier(''); chargerCaissiers();
    } catch (e) { setMessage('❌ ' + (e as Error).message); }
    setOccupe(false);
  };

  // résultats en lot + gagnants
  const [texteRes, setTexteRes] = useState('');
  const [rapportRes, setRapportRes] = useState<{ ligne: number; texte: string; ok: boolean }[]>([]);
  const [gagnants, setGagnants] = useState<{ id: string; numero: number; mise: number; cote_totale: number; gain_final: number | null; expire: boolean }[]>([]);
  const [totalGagnants, setTotalGagnants] = useState(0);
  const apercuRes = texteRes.trim() ? parserResultats(texteRes) : null;
  const chargerGagnants = async () => {
    try { const j = await appeler({ action: 'gagnants' }); setGagnants(j.gagnants); setTotalGagnants(j.total); } catch (e) { setMessage('❌ ' + (e as Error).message); }
  };
  const importerResultats = async () => {
    setOccupe(true); setMessage(''); setRapportRes([]);
    try {
      const j = await appeler({ action: 'resultats_lot', texte: texteRes });
      setRapportRes(j.rapport || []);
      setMessage('✅ ' + (j.rapport || []).filter((r: { ok: boolean }) => r.ok).length + ' match(s) réglé(s), ' + j.offresReglees + ' offre(s) et ' + j.ticketsMisAJour + ' ticket(s) mis à jour.');
      if (!(j.rapport || []).some((r: { ok: boolean }) => !r.ok)) setTexteRes('');
      chargerGagnants();
    } catch (e) { setMessage('❌ ' + (e as Error).message); }
    setOccupe(false);
  };
  useEffect(() => { if (connecte && vue === 'resultats') chargerGagnants(); }, [connecte, vue]);

  // rapport
  const [tickets, setTickets] = useState<TicketRow[]>([]);
  const [rapport, setRapport] = useState<Rapport | null>(null);

  const appeler = async (corps: Record<string, unknown>) => {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    const res = await fetch('/api/caisse-admin', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token }, body: JSON.stringify(corps) });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error || 'Erreur ' + res.status);
    return json;
  };

  useEffect(() => { if (connecte) appeler({ action: 'matchs' }).then(j => setMatchs(j.matchs)).catch(e => setMessage('❌ ' + e.message)); }, [connecte]);

  const charger = async (id: string) => {
    if (!id) { setMatch(null); setOffres([]); return; }
    try {
      const j = await appeler({ action: 'lister', matchId: id });
      setMatch(j.match); setOffres(j.offres);
      setCotes(Object.fromEntries((j.offres as Offre[]).map(o => [o.id, String(o.cote)])));
      setSc({ ftH: j.match.score_home ?? '', ftA: j.match.score_away ?? '', htH: j.match.score_mt_home ?? '', htA: j.match.score_mt_away ?? '' } as never);
    } catch (e) { setMessage('❌ ' + (e as Error).message); }
  };
  useEffect(() => { charger(matchId); }, [matchId]);

  const exec = async (corps: Record<string, unknown>, ok: (j: Record<string, number>) => string) => {
    setOccupe(true); setMessage('');
    try { const j = await appeler(corps); setMessage('✅ ' + ok(j)); await charger(matchId); }
    catch (e) { setMessage('❌ ' + (e as Error).message); }
    setOccupe(false);
  };

  const choixCourant = () => marche === 'ou' ? sens + '_' + ligne : marche === 'combo' ? jambes.map(l => l.marche + '-' + l.choix).join('+') : (CHOIX_FIXES[marche] ? choix : nom.trim());

  const ajouter = () => {
    if (!matchId) return;
    const o = { marche, choix: choixCourant(), cote: parseFloat(cote.replace(',', '.')), libelle: libelle.trim() || undefined, legs: marche === 'combo' ? jambes : null };
    exec({ action: 'sauver', matchId, offres: [o] }, () => 'Offre enregistrée.').then(() => { setCote(''); setLibelle(''); setNom(''); });
  };

  const chargerRapport = async () => {
    try { const j = await appeler({ action: 'tickets' }); setTickets(j.tickets); setRapport(j.rapport); } catch (e) { setMessage('❌ ' + (e as Error).message); }
  };
  useEffect(() => { if (connecte && vue === 'rapport') chargerRapport(); }, [connecte, vue]);

  if (!connecte) return <AdminAuth titre="Admin Paris (caisse)" onAuthentifie={() => setConnecte(true)} />;

  const groupes = MARCHES_ORDRE.map(m => ({ m, liste: offres.filter(o => o.marche === m) })).filter(g => g.liste.length);

  return (
    <div style={{ minHeight: '100vh', background: '#0f0f0f', fontFamily: 'sans-serif', color: '#fff', overflowX: 'hidden' }}>
      <header style={{ background: '#111', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #222', flexWrap: 'wrap', gap: '10px' }}>
        <h1 style={{ color: VIOLET, fontWeight: 900, fontSize: '18px', margin: 0 }}>🎲 Paris en caisse : marchés et règlement</h1>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <a href="/admin" style={{ ...bouton('#333'), textDecoration: 'none' }}>← Admin</a>
          <a href="/caisse" style={{ ...bouton('#0e7490'), textDecoration: 'none' }}>🧾 Ouvrir la caisse</a>
          <button onClick={() => setVue('offres')} style={bouton(vue === 'offres' ? VIOLET : '#333')}>Marchés</button>
          <button onClick={() => setVue('lot')} style={bouton(vue === 'lot' ? VIOLET : '#333')}>Coller en lot</button>
          <button onClick={() => setVue('resultats')} style={bouton(vue === 'resultats' ? VIOLET : '#333')}>Résultats en lot</button>
          <button onClick={() => setVue('caissiers')} style={bouton(vue === 'caissiers' ? VIOLET : '#333')}>Caissiers</button>
          <button onClick={() => setVue('journal')} style={bouton(vue === 'journal' ? VIOLET : '#333')}>Journal</button>
          <button onClick={() => setVue('rapport')} style={bouton(vue === 'rapport' ? VIOLET : '#333')}>Rapport de caisse</button>
        </div>
      </header>
      <main style={{ maxWidth: '980px', margin: '0 auto', padding: '24px' }}>
        {message && <div style={{ background: '#1e1e1e', border: '1px solid #333', borderRadius: '10px', padding: '12px 14px', marginBottom: '16px', fontSize: '13px' }}>{message}</div>}

        {vue === 'offres' && (
          <>
            <select value={matchId} onChange={e => setMatchId(e.target.value)} style={{ ...inputStyle, width: '100%', marginBottom: '16px' }}>
              <option value="">Choisir un match (football)…</option>
              {matchs.map(m => <option key={m.id} value={m.id}>{heureHaiti(m.date_match)} · {m.equipe1} - {m.equipe2}{m.competition ? ' (' + m.competition + ')' : ''}{m.a_regler ? ' ⚠ à régler' : ''}</option>)}
            </select>

            {match && (
              <>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
                  <button disabled={occupe} onClick={() => exec({ action: 'preremplir', matchId }, j => j.ajoutees + ' offre(s) créée(s), ' + j.misAJour + ' cote(s) mise(s) à jour depuis l\'API.')} style={bouton('#0e7490')}>⚡ Préremplir depuis l'API</button>
                </div>

                {/* Nouvelle offre */}
                <section style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '12px', padding: '16px', marginBottom: '20px' }}>
                  <p style={{ margin: '0 0 10px', fontWeight: 800, fontSize: '14px' }}>➕ Ajouter / modifier une offre</p>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                    <select value={marche} onChange={e => { const m = e.target.value as Marche; setMarche(m); setChoix(CHOIX_FIXES[m]?.[0] || ''); }} style={inputStyle}>
                      {MARCHES_ORDRE.map(m => <option key={m} value={m}>{MARCHES[m].label}</option>)}
                    </select>
                    {CHOIX_FIXES[marche] && <select value={choix} onChange={e => setChoix(e.target.value)} style={inputStyle}>{CHOIX_FIXES[marche]!.map(c => <option key={c} value={c}>{c === '1' ? '1 (' + match.equipe1 + ')' : c === '2' ? '2 (' + match.equipe2 + ')' : c}</option>)}</select>}
                    {marche === 'ou' && (<>
                      <select value={sens} onChange={e => setSens(e.target.value as 'over' | 'under')} style={inputStyle}><option value="over">Plus de</option><option value="under">Moins de</option></select>
                      <select value={ligne} onChange={e => setLigne(e.target.value)} style={inputStyle}>{LIGNES.map(l => <option key={l} value={l}>{l}</option>)}</select>
                    </>)}
                    {(marche === 'buteur' || marche === 'premier_buteur') && <input value={nom} onChange={e => setNom(e.target.value)} placeholder="Nom du joueur" style={inputStyle} />}
                    <input value={cote} onChange={e => setCote(e.target.value)} placeholder="Cote (ex 2.35)" inputMode="decimal" style={{ ...inputStyle, width: '110px' }} />
                    <button disabled={occupe || !cote} onClick={ajouter} style={bouton(VIOLET)}>Enregistrer</button>
                  </div>
                  {marche === 'combo' && (
                    <div style={{ marginTop: '12px' }}>
                      <p style={{ margin: '0 0 6px', fontSize: '12px', color: '#9ca3af' }}>Jambes du combo (2 à 4, toutes doivent gagner) :</p>
                      {jambes.map((l, i) => (
                        <div key={i} style={{ display: 'flex', gap: '6px', marginBottom: '6px', flexWrap: 'wrap' }}>
                          <select value={l.marche} onChange={e => { const m = e.target.value as Marche; setJambes(js => js.map((x, k) => k === i ? { marche: m, choix: m === 'ou' ? 'over_2.5' : (CHOIX_FIXES[m]?.[0] || '') } : x)); }} style={inputStyle}>{MARCHES_JAMBES.map(m => <option key={m} value={m}>{MARCHES[m].label}</option>)}</select>
                          {l.marche === 'ou'
                            ? <select value={l.choix} onChange={e => setJambes(js => js.map((x, k) => k === i ? { ...x, choix: e.target.value } : x))} style={inputStyle}>{LIGNES.flatMap(g => [['over_' + g, 'Plus de ' + g], ['under_' + g, 'Moins de ' + g]]).map(([v, t]) => <option key={v} value={v}>{t}</option>)}</select>
                            : <select value={l.choix} onChange={e => setJambes(js => js.map((x, k) => k === i ? { ...x, choix: e.target.value } : x))} style={inputStyle}>{(CHOIX_FIXES[l.marche] || []).map(c => <option key={c} value={c}>{c}</option>)}</select>}
                          {jambes.length > 2 && <button onClick={() => setJambes(js => js.filter((_, k) => k !== i))} style={bouton('#7f1d1d')}>✕</button>}
                        </div>
                      ))}
                      {jambes.length < 4 && <button onClick={() => setJambes(js => [...js, { marche: '1x2', choix: '1' }])} style={bouton('#333')}>+ jambe</button>}
                      <input value={libelle} onChange={e => setLibelle(e.target.value)} placeholder={'Texte du ticket (sinon : ' + libelleCombo(jambes, match.equipe1, match.equipe2) + ')'} style={{ ...inputStyle, width: '100%', marginTop: '8px' }} />
                    </div>
                  )}
                </section>

                {/* Offres existantes */}
                {groupes.map(g => (
                  <section key={g.m} style={{ marginBottom: '16px' }}>
                    <p style={{ margin: '0 0 6px', fontWeight: 800, fontSize: '13px', color: '#a78bfa' }}>{MARCHES[g.m].label}</p>
                    {g.liste.map(o => (
                      <div key={o.id} style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '10px', padding: '8px 12px', marginBottom: '6px', opacity: o.actif ? 1 : 0.55 }}>
                        <span style={{ flex: '1 1 220px', fontSize: '13px', fontWeight: 600 }}>{o.libelle}</span>
                        <input value={cotes[o.id] ?? ''} onChange={e => setCotes(c => ({ ...c, [o.id]: e.target.value }))} inputMode="decimal" style={{ ...inputStyle, width: '84px', padding: '6px' }} />
                        <button disabled={occupe} onClick={() => exec({ action: 'sauver', matchId, offres: [{ marche: o.marche, choix: o.choix, cote: parseFloat((cotes[o.id] || '').replace(',', '.')), actif: o.actif, libelle: o.libelle, legs: o.legs }] }, () => 'Cote mise à jour.')} style={bouton('#333')}>OK</button>
                        <button disabled={occupe} onClick={() => exec({ action: 'activer', offreId: o.id, actif: !o.actif }, () => o.actif ? 'Offre fermée.' : 'Offre ouverte.')} style={bouton(o.actif ? '#065f46' : '#555')}>{o.actif ? 'Ouverte' : 'Fermée'}</button>
                        <span style={{ display: 'flex', gap: '4px' }}>
                          {(['gagne', 'perdu', 'annule'] as const).map(r => (
                            <button key={r} disabled={occupe} title={MARCHES[o.marche].auto ? 'Règlement automatique via le score (correction manuelle possible)' : 'Règlement manuel'} onClick={() => exec({ action: 'resultat_offre', offreId: o.id, resultat: o.resultat === r ? null : r }, j => 'Résultat enregistré, ' + (j.ticketsMisAJour || 0) + ' ticket(s) mis à jour.')} style={bouton(o.resultat === r ? (r === 'gagne' ? '#16a34a' : r === 'perdu' ? '#dc2626' : '#ca8a04') : '#2a2a2a')}>{r === 'gagne' ? '✓ Gagné' : r === 'perdu' ? '✗ Perdu' : '↺ Annulé'}</button>
                          ))}
                        </span>
                        <button disabled={occupe} onClick={() => { if (confirm('Supprimer cette offre ?')) exec({ action: 'supprimer', offreId: o.id }, () => 'Offre supprimée.'); }} style={bouton('#7f1d1d')}>🗑</button>
                      </div>
                    ))}
                  </section>
                ))}
                {!offres.length && <p style={{ color: '#6b7280', fontSize: '13px' }}>Aucune offre pour ce match. Utilisez « Préremplir » ou ajoutez-en ci-dessus.</p>}

                {/* Règlement par score */}
                <section style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '12px', padding: '16px', marginTop: '20px' }}>
                  <p style={{ margin: '0 0 4px', fontWeight: 800, fontSize: '14px' }}>🏁 Règlement par le score</p>
                  <p style={{ margin: '0 0 10px', fontSize: '12px', color: '#9ca3af' }}>Règle d'un coup 1X2, double chance, mi-temps, plus/moins et combos, et met à jour les tickets. Buteurs et qualification se règlent à la main ci-dessus.</p>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '12px', width: '90px' }}>Score final</span>
                    <input value={sc.ftH} onChange={e => setSc(s => ({ ...s, ftH: e.target.value }))} inputMode="numeric" style={{ ...inputStyle, width: '60px' }} /><span>-</span>
                    <input value={sc.ftA} onChange={e => setSc(s => ({ ...s, ftA: e.target.value }))} inputMode="numeric" style={{ ...inputStyle, width: '60px' }} />
                    <span style={{ fontSize: '12px', width: '90px', marginLeft: '12px' }}>Mi-temps</span>
                    <input value={sc.htH} onChange={e => setSc(s => ({ ...s, htH: e.target.value }))} inputMode="numeric" style={{ ...inputStyle, width: '60px' }} /><span>-</span>
                    <input value={sc.htA} onChange={e => setSc(s => ({ ...s, htA: e.target.value }))} inputMode="numeric" style={{ ...inputStyle, width: '60px' }} />
                    <button disabled={occupe} onClick={() => { if (confirm('Régler ' + match.equipe1 + ' ' + sc.ftH + '-' + sc.ftA + ' ' + match.equipe2 + ' (mi-temps ' + (sc.htH || '?') + '-' + (sc.htA || '?') + ') ?')) exec({ action: 'regler_match', matchId, ...sc }, j => j.offresReglees + ' offre(s) réglée(s), ' + j.ticketsMisAJour + ' ticket(s) mis à jour.'); }} style={bouton(VIOLET)}>Régler le match</button>
                  </div>
                </section>
              </>
            )}
          </>
        )}

        {vue === 'lot' && (
          <section style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '12px', padding: '16px' }}>
            <p style={{ margin: '0 0 6px', fontWeight: 800, fontSize: '14px' }}>📋 Coller des matchs avec leurs cotes</p>
            <p style={{ margin: '0 0 10px', fontSize: '12px', color: '#9ca3af', lineHeight: 1.6 }}>
              Une ligne d'en-tête avec la compétition, puis un match par ligne : <b>Équipe1 - Équipe2 - date - cote1 coteN cote2</b>.<br />
              Facultatif après les 3 cotes : <b>1X</b>, <b>X2</b>, <b>12</b>, <b>+2.5</b>, <b>-2.5</b> suivis de leur cote (la double chance absente est calculée). Date : AAAA-MM-JJ HH:MM ou JJ/MM/AAAA HH:MM.<br />
              Les matchs déjà existants (mêmes équipes, même date) voient simplement leurs cotes mises à jour. Un match disparaît de cette liste 3 jours après son coup d'envoi.
            </p>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '10px', alignItems: 'center' }}>
              <span style={{ fontSize: '12px' }}>Heures saisies en :</span>
              <button onClick={() => setFuseau('Haiti')} style={bouton(fuseau === 'Haiti' ? VIOLET : '#333')}>Haïti</button>
              <button onClick={() => setFuseau('Europe')} style={bouton(fuseau === 'Europe' ? VIOLET : '#333')}>Europe</button>
            </div>
            <textarea value={texteLot} onChange={e => setTexteLot(e.target.value)} rows={12} placeholder={'Ligue 2\nAuxerre - Metz - 2026-11-20 20:00 - 2.10 3.20 3.50\nCaen - Rodez - 21/11/2026 15:00 - 1.80 3.40 4.50 1X 1.15 +2.5 1.95 -2.5 1.80'} style={{ ...inputStyle, width: '100%', fontFamily: 'monospace', fontSize: '13px', marginBottom: '10px' }} />
            {apercuLot && (
              <div style={{ fontSize: '12px', marginBottom: '10px' }}>
                <div style={{ color: '#4ade80', marginBottom: '4px' }}>{apercuLot.matchs.length} match(s) reconnu(s)</div>
                {apercuLot.matchs.map((m, i) => <div key={i} style={{ color: '#d1d5db' }}>{m.competition ? m.competition + ' · ' : ''}{m.equipe1} - {m.equipe2} · {heureHaiti(m.date_match)} · {m.cotes.c1} / {m.cotes.cx} / {m.cotes.c2}</div>)}
                {apercuLot.erreurs.map((e, i) => <div key={i} style={{ color: '#f87171' }}>⚠ {e}</div>)}
              </div>
            )}
            {erreursLot.map((e, i) => <div key={i} style={{ color: '#f87171', fontSize: '12px' }}>⚠ {e}</div>)}
            <button disabled={occupe || !apercuLot || !apercuLot.matchs.length} onClick={importerLot} style={bouton(VIOLET)}>{occupe ? '⏳ Import...' : '🚀 Créer les matchs et les cotes'}</button>
          </section>
        )}

        {vue === 'resultats' && (
          <>
            <section style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '12px', padding: '16px', marginBottom: '16px' }}>
              <p style={{ margin: '0 0 6px', fontWeight: 800, fontSize: '14px' }}>🏁 Coller les résultats</p>
              <p style={{ margin: '0 0 10px', fontSize: '12px', color: '#9ca3af', lineHeight: 1.6 }}>
                Un match par ligne : <b>Équipe1 - Équipe2 - score final (mi-temps)</b>, par exemple <b>Auxerre - Metz - 2-1 (1-0)</b>.<br />
                La mi-temps est facultative, mais nécessaire pour régler les paris mi-temps. Les noms doivent correspondre à ceux des matchs créés (accents et majuscules sans importance).
                Les paris Buteurs et Qualification se règlent à la main dans l'onglet Marchés.
              </p>
              <textarea value={texteRes} onChange={e => setTexteRes(e.target.value)} rows={9} placeholder={'Auxerre - Metz - 2-1 (1-0)\nCaen - Rodez - 0-0 (0-0)'} style={{ ...inputStyle, width: '100%', fontFamily: 'monospace', fontSize: '13px', marginBottom: '10px' }} />
              {apercuRes && (
                <div style={{ fontSize: '12px', marginBottom: '10px' }}>
                  <div style={{ color: '#4ade80', marginBottom: '4px' }}>{apercuRes.resultats.length} résultat(s) reconnu(s)</div>
                  {apercuRes.resultats.map((r, i) => <div key={i} style={{ color: '#d1d5db' }}>{r.equipe1} {r.ftH}-{r.ftA} {r.equipe2}{r.htH !== null ? ' (mi-temps ' + r.htH + '-' + r.htA + ')' : ''}</div>)}
                  {apercuRes.erreurs.map((e, i) => <div key={i} style={{ color: '#f87171' }}>⚠ {e}</div>)}
                </div>
              )}
              {rapportRes.map((r, i) => <div key={i} style={{ fontSize: '12px', color: r.ok ? '#4ade80' : '#f87171' }}>{r.ok ? '✓' : '⚠'} {r.texte}</div>)}
              <button disabled={occupe || !apercuRes || !apercuRes.resultats.length} onClick={() => { if (confirm('Régler ' + (apercuRes?.resultats.length || 0) + ' match(s) ?')) importerResultats(); }} style={{ ...bouton(VIOLET), marginTop: '10px' }}>{occupe ? '⏳ Règlement...' : '✅ Régler les matchs'}</button>
            </section>

            <section style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '12px', padding: '16px' }}>
              <p style={{ margin: '0 0 4px', fontWeight: 800, fontSize: '14px' }}>🏆 Tickets gagnants à payer</p>
              <div style={{ fontSize: '26px', fontWeight: 900, color: '#4ade80', marginBottom: '2px' }}>{totalGagnants.toLocaleString('fr-FR')} G</div>
              <p style={{ margin: '0 0 10px', fontSize: '12px', color: '#9ca3af' }}>{gagnants.length} ticket(s) gagnant(s) non payé(s) : total à reverser (hors tickets expirés).</p>
              {gagnants.map(t => (
                <div key={t.id} style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap', borderTop: '1px solid #2a2a2a', padding: '8px 0', fontSize: '13px', opacity: t.expire ? 0.5 : 1 }}>
                  <b style={{ width: '80px' }}>{numeroAffiche(t.numero)}</b>
                  <span>Mise {t.mise} G</span><span>Cote {t.cote_totale}</span>
                  <span style={{ flex: 1, textAlign: 'right', fontWeight: 800, color: '#4ade80' }}>{t.gain_final} G</span>
                  {t.expire && <span style={{ color: '#f87171', fontSize: '11px', fontWeight: 800 }}>EXPIRÉ</span>}
                </div>
              ))}
              {!gagnants.length && <p style={{ color: '#6b7280', fontSize: '13px', margin: 0 }}>Aucun ticket gagnant en attente de paiement.</p>}
            </section>
          </>
        )}

        {vue === 'caissiers' && (
          <section style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '12px', padding: '16px' }}>
            <p style={{ margin: '0 0 6px', fontWeight: 800, fontSize: '14px' }}>👥 Caissiers</p>
            <p style={{ margin: '0 0 10px', fontSize: '12px', color: '#9ca3af', lineHeight: 1.6 }}>Saisis l'e-mail du caissier : il reçoit une invitation, choisit son mot de passe, puis active l'application Authenticator. Si l'e-mail ne part pas, utilise « Générer un lien » et envoie-le lui toi-même. Un compte déjà inscrit est simplement ajouté.</p>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
              <input value={emailCaissier} onChange={e => setEmailCaissier(e.target.value)} placeholder="Email du caissier" style={{ ...inputStyle, flex: 2, minWidth: '180px' }} />
              <input value={nomCaissier} onChange={e => setNomCaissier(e.target.value)} placeholder="Nom (facultatif)" style={{ ...inputStyle, flex: 1, minWidth: '120px' }} />
              <button disabled={occupe || !emailCaissier} onClick={() => ajouterCaissier('mail')} style={bouton(VIOLET)}>✉️ Inviter par e-mail</button>
              <button disabled={occupe || !emailCaissier} onClick={() => ajouterCaissier('lien')} style={bouton('#0e7490')}>🔗 Générer un lien</button>
            </div>
            {lienInvitation && (
              <div style={{ background: '#111', border: '1px solid #0e7490', borderRadius: '10px', padding: '10px', marginBottom: '12px', fontSize: '12px' }}>
                <div style={{ color: '#9ca3af', marginBottom: '6px' }}>Lien d'invitation (à usage unique, à ne partager qu'avec ce caissier) :</div>
                <div style={{ wordBreak: 'break-all', color: '#67e8f9', marginBottom: '8px' }}>{lienInvitation}</div>
                <button onClick={() => navigator.clipboard.writeText(lienInvitation).then(() => setMessage('📋 Lien copié.'))} style={bouton('#333')}>Copier</button>
              </div>
            )}
            {caissiers.map(c => (
              <div key={c.user_id} style={{ display: 'flex', gap: '10px', alignItems: 'center', borderTop: '1px solid #2a2a2a', padding: '8px 0', fontSize: '13px' }}>
                <b style={{ flex: 1 }}>{c.nom || '(sans nom)'}</b><span style={{ color: '#9ca3af' }}>{c.email}</span>{c.en_attente && <span style={{ color: '#fbbf24', fontSize: '11px', fontWeight: 800 }}>⏳ invitation en attente</span>}
                <button onClick={() => { if (confirm('Retirer ' + (c.nom || c.email) + ' ?')) appeler({ action: 'caissier_retirer', userId: c.user_id }).then(() => chargerCaissiers()).catch(e => setMessage('❌ ' + e.message)); }} style={bouton('#7f1d1d')}>Retirer</button>
              </div>
            ))}
            {!caissiers.length && <p style={{ color: '#6b7280', fontSize: '13px', margin: 0 }}>Aucun caissier.</p>}
          </section>
        )}

        {vue === 'journal' && (
          <section>
            <p style={{ fontSize: '12px', color: '#9ca3af', margin: '0 0 8px' }}>200 dernières actions sensibles (tickets, paiements, cotes, règlements, caissiers).</p>
            {journalLignes.map(l => (
              <div key={l.id} style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '10px', padding: '8px 12px', marginBottom: '6px', fontSize: '12px' }}>
                <div><b>{l.action}</b> · {heureHaiti(l.created_at)} · <span style={{ color: '#9ca3af' }}>{l.email || '?'}</span></div>
                <div style={{ color: '#9ca3af', wordBreak: 'break-all' }}>{JSON.stringify(l.details)}</div>
              </div>
            ))}
            {!journalLignes.length && <p style={{ color: '#6b7280', fontSize: '13px' }}>Journal vide (ou sql-audit.sql pas encore exécuté).</p>}
          </section>
        )}

        {vue === 'rapport' && (
          <>
            {rapport && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: '10px', marginBottom: '16px' }}>
                {[['Tickets', rapport.nombre], ['Encaissé (G)', rapport.encaisse], ['Gains payés (G)', rapport.paye], ['Gains à payer (G)', rapport.aPayer], ['En attente', rapport.enAttente]].map(([t, v]) => (
                  <div key={String(t)} style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '12px', padding: '14px' }}><div style={{ fontSize: '11px', color: '#9ca3af' }}>{t}</div><div style={{ fontSize: '22px', fontWeight: 900 }}>{v}</div></div>
                ))}
              </div>
            )}
            <p style={{ fontSize: '12px', color: '#9ca3af', margin: '0 0 8px' }}>Aujourd'hui (heure d'Haïti), 300 derniers tickets.</p>
            {tickets.map(t => (
              <div key={t.id} style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap', background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '10px', padding: '8px 12px', marginBottom: '6px', fontSize: '13px' }}>
                <b style={{ width: '80px' }}>{numeroAffiche(t.numero)}</b>
                <span style={{ width: '90px' }}>{heureHaiti(t.created_at)}</span>
                <span>Mise {t.mise} G</span><span>Cote {t.cote_totale}</span>
                <span style={{ flex: 1 }}>Gain {t.gain_final ?? t.gain_potentiel} G</span>
                <span style={{ fontWeight: 800, color: t.statut === 'gagnant' ? '#4ade80' : t.statut === 'perdant' ? '#f87171' : t.statut === 'paye' ? '#60a5fa' : '#fbbf24' }}>{t.statut.toUpperCase()}</span>
                {t.statut === 'en_attente' && <button onClick={() => { if (confirm('Annuler le ticket ' + numeroAffiche(t.numero) + ' ?')) appeler({ action: 'annuler_ticket', ticketId: t.id }).then(() => chargerRapport()).catch(e => setMessage('❌ ' + e.message)); }} style={bouton('#7f1d1d')}>Annuler</button>}
              </div>
            ))}
            {!tickets.length && <p style={{ color: '#6b7280', fontSize: '13px' }}>Aucun ticket aujourd'hui.</p>}
          </>
        )}
      </main>
    </div>
  );
}
