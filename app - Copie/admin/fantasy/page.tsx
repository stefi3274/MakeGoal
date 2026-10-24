'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import AdminAuth from '../../../components/AdminAuth';
import { JoueurFantasy, Poste, POSTES, LIBELLE_POSTE, REGLES_POINTS } from '../../../lib/fantasy';
import { BANQUE_TEXTE, categorieJoueur } from '../../../lib/fantasyBanque';

const VIOLET = '#bf00ff';

type Rep = { ajoutes?: number; maj?: number; ignorees?: string[]; equipes?: number; joueurs?: number; inconnus?: string[]; meilleur?: number; equipes7?: number; meilleur7?: number; erreurs?: string[] };
type Journee = { id: string; titre: string; statut: string; date_limite: string | null; created_at: string };

const inputStyle = { width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #333', background: '#1e1e1e', color: '#fff', fontSize: '14px', boxSizing: 'border-box' as const };
const sectionStyle = { background: '#161616', border: '1px solid #2a2a2a', borderRadius: '14px', padding: '20px', marginBottom: '16px' };
const labelStyle = { fontSize: '12px', color: '#9ca3af', display: 'block' as const, marginBottom: '6px', fontWeight: 700 as const, textTransform: 'uppercase' as const, letterSpacing: '0.5px' };
const bouton = (fond = VIOLET) => ({ padding: '10px 18px', borderRadius: '999px', border: 'none', background: fond, color: '#fff', fontWeight: 800, fontSize: '13px', cursor: 'pointer' } as const);

export default function AdminFantasy() {
  const [connecte, setConnecte] = useState(false);
  const [joueurs, setJoueurs] = useState<JoueurFantasy[]>([]);
  const [journees, setJournees] = useState<Journee[]>([]);
  const [equipes, setEquipes] = useState(0);
  const [message, setMessage] = useState('');
  const [enCours, setEnCours] = useState(false);
  const [texteJoueurs, setTexteJoueurs] = useState('');
  const [titreJournee, setTitreJournee] = useState('');
  const [limite, setLimite] = useState('');
  const [texteStats, setTexteStats] = useState('');
  const [journeeStats, setJourneeStats] = useState('');
  const [fPoste, setFPoste] = useState<Poste | ''>('');
  const [recherche, setRecherche] = useState('');

  const appel = async (methode: 'GET' | 'POST', corps?: Record<string, unknown>) => {
    const { data: sess } = await supabase.auth.getSession();
    const t = sess.session?.access_token;
    if (!t) { setMessage('❌ Session expirée, reconnecte-toi.'); return null; }
    const r = await fetch('/api/fantasy-admin', { method: methode, headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + t }, body: corps ? JSON.stringify(corps) : undefined });
    const d = await r.json();
    if (!r.ok) {
      const detail = [d.inconnus?.length ? 'Inconnus : ' + d.inconnus.join(', ') : '', d.ignorees?.length ? 'Ignorées : ' + d.ignorees.join(' | ') : ''].filter(Boolean).join(' · ');
      setMessage('❌ ' + (d.error || 'Erreur.') + (detail ? ' ' + detail : ''));
      return null;
    }
    return d;
  };

  const charger = async () => {
    const d = await appel('GET');
    if (!d) return;
    setJoueurs(d.joueurs); setJournees(d.journees); setEquipes(d.equipes);
    if (!journeeStats && d.journees.length) setJourneeStats(d.journees[0].id);
  };
  useEffect(() => { if (connecte) charger(); }, [connecte]);

  const agir = async (corps: Record<string, unknown>, ok: (d: Rep) => string) => {
    setEnCours(true); setMessage('');
    const d = await appel('POST', corps);
    setEnCours(false);
    if (d) { setMessage('✅ ' + ok(d)); await charger(); }
    return d;
  };

  const importerJoueurs = async () => {
    const d = await agir({ action: 'importJoueurs', texte: texteJoueurs }, d => d.ajoutes + ' joueur(s) ajouté(s), ' + d.maj + ' mis à jour.' + (d.ignorees?.length ? ' ⚠️ Lignes ignorées : ' + d.ignorees.join(' | ') : ''));
    if (d) setTexteJoueurs('');
  };
  const creerJournee = async () => {
    const d = await agir({ action: 'creerJournee', titre: titreJournee, date_limite: limite ? new Date(limite).toISOString() : null }, () => 'Journée ouverte : les joueurs peuvent modifier leur équipe.');
    if (d) { setTitreJournee(''); setLimite(''); }
  };
  const verrouiller = (j: Journee) => {
    if (!confirm('Verrouiller « ' + j.titre + ' » ? Les équipes seront figées pour cette journée.')) return;
    agir({ action: 'verrouiller', journeeId: j.id }, d => d.equipes + ' équipe(s) figée(s), mode 7 : ' + (d.equipes7 || 0) + '.');
  };
  const saisirStats = async () => {
    const d = await agir({ action: 'saisirStats', journeeId: journeeStats, texte: texteStats }, d => d.joueurs + ' joueur(s) enregistré(s).' + (d.inconnus?.length ? ' ⚠️ Inconnus : ' + d.inconnus.join(', ') : '') + (d.ignorees?.length ? ' ⚠️ Ignorées : ' + d.ignorees.join(' | ') : ''));
    if (d && !d.inconnus?.length && !d.ignorees?.length) setTexteStats('');
  };
  const calculer = () => {
    const j = journees.find(x => x.id === journeeStats);
    if (!j || !confirm('Calculer et ajouter au classement les points de « ' + j.titre + ' » ? (Refaire le calcul corrige sans doublon.)')) return;
    agir({ action: 'calculer', journeeId: journeeStats }, d => d.equipes + ' équipe(s) calculée(s), meilleur score : ' + d.meilleur + ' pts. Mode 7 : ' + (d.equipes7 || 0) + ' équipe(s), meilleur ' + (d.meilleur7 || 0) + ' pts.' + (d.erreurs?.length ? ' ⚠️ ' + d.erreurs.join(' | ') : ''));
  };
  const majJoueur = (id: string, champs: Record<string, unknown>) => agir({ action: 'majJoueur', id, ...champs }, () => 'Joueur mis à jour.');

  if (!connecte) return <AdminAuth titre="MakeGoal Fantasy" onAuthentifie={() => setConnecte(true)} />;

  const q = recherche.trim().toLowerCase();
  const liste = joueurs.filter(j => (!fPoste || j.poste === fPoste) && (!q || j.nom.toLowerCase().includes(q) || j.club.toLowerCase().includes(q)));
  const courante = journees[0] || null;
  const statutTxt: Record<string, string> = { ouverte: '🟢 Ouverte', verrouillee: '🔒 Verrouillée', calculee: '✅ Calculée' };

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#fff', fontFamily: 'sans-serif' }}>
      <header style={{ background: '#111', padding: '14px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #222' }}>
        <h1 style={{ fontWeight: 900, fontSize: '18px', margin: 0 }}>🏟️ Fantasy <span style={{ color: VIOLET }}>Admin</span></h1>
        <a href="/admin" style={{ color: '#9ca3af', fontSize: '13px', textDecoration: 'none' }}>← Admin</a>
      </header>
      <div style={{ maxWidth: '860px', margin: '0 auto', padding: '24px 16px 60px' }}>
        {message && <div style={{ padding: '12px 16px', borderRadius: '10px', marginBottom: '16px', fontWeight: 700, fontSize: '13px', background: message.startsWith('✅') ? '#052e16' : '#2a0a0a', color: message.startsWith('✅') ? '#86efac' : '#fca5a5' }}>{message}</div>}

        <div style={sectionStyle}>
          <label style={labelStyle}>Vue d'ensemble</label>
          <p style={{ margin: 0, fontSize: '14px', color: '#d1d5db' }}>{equipes} équipe(s) inscrite(s) · {joueurs.filter(j => j.actif).length} joueur(s) actif(s) · journée en cours : <b>{courante ? courante.titre + ' (' + statutTxt[courante.statut] + ')' : 'aucune'}</b></p>
          <p style={{ margin: '10px 0 0', fontSize: '11px', color: '#6b7280' }}>Déroulé : 1) importer les joueurs · 2) ouvrir une journée · 3) verrouiller au coup d'envoi · 4) coller les stats · 5) calculer (les points s'ajoutent au classement général) · 6) ouvrir la journée suivante.</p>
        </div>

        <div style={sectionStyle}>
          <label style={labelStyle}>1 · Joueurs (importer ou mettre à jour)</label>
          <p style={{ fontSize: '11px', color: '#6b7280', margin: '0 0 10px' }}>Une ligne par joueur : <b>Nom - Poste - Club - Prix</b> (poste : G, D, M, A ou gardien, défenseur, milieu, attaquant ; prix en FanCoins entre 100 et 3000, 500 par défaut ; pays facultatif en dernier). Un joueur déjà présent (même nom et même club) est mis à jour.</p>
          <textarea value={texteJoueurs} onChange={e => setTexteJoueurs(e.target.value)} rows={8} placeholder={'Wilson Isidor - A - Lyon - 900\nJohny Placide - G - Bastia - 600\nDuckens Nazon - Attaquant - Standard de Liège - 700 - Haïti'} style={{ ...inputStyle, fontSize: '12px', resize: 'vertical', marginBottom: '10px' }} />
          <button onClick={() => setTexteJoueurs(BANQUE_TEXTE)} disabled={enCours} style={{ ...bouton('#333'), marginRight: '8px' }}>Charger la banque MakeGoal (250 joueurs)</button>
          <button onClick={importerJoueurs} disabled={enCours || !texteJoueurs.trim()} style={{ ...bouton(), opacity: enCours || !texteJoueurs.trim() ? 0.5 : 1 }}>Importer les joueurs</button>

          <div style={{ marginTop: '18px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            <button onClick={() => setFPoste('')} style={bouton(fPoste === '' ? VIOLET : '#333')}>Tous</button>
            {POSTES.map(p => <button key={p} onClick={() => setFPoste(p)} style={bouton(fPoste === p ? VIOLET : '#333')}>{LIBELLE_POSTE[p]}</button>)}
            <input value={recherche} onChange={e => setRecherche(e.target.value)} placeholder="Rechercher" style={{ ...inputStyle, flex: 1, minWidth: '140px', width: 'auto', padding: '9px' }} />
          </div>
          <div style={{ marginTop: '12px', maxHeight: '420px', overflowY: 'auto' }}>
            {liste.map(j => (
              <div key={j.id} style={{ display: 'flex', gap: '8px', alignItems: 'center', padding: '8px 4px', borderBottom: '1px solid #222', opacity: j.actif ? 1 : 0.45 }}>
                <span style={{ flex: 2, fontWeight: 800, fontSize: '13px' }}>{j.nom} <span style={{ background: categorieJoueur(j.prix).fond, color: categorieJoueur(j.prix).texte, borderRadius: '999px', fontSize: '9px', fontWeight: 900, padding: '1px 7px' }}>{categorieJoueur(j.prix).court}</span></span>
                <span style={{ flex: 1.4, fontSize: '12px', color: '#9ca3af' }}>{j.club || '-'}</span>
                <span style={{ width: '24px', fontSize: '12px', fontWeight: 900, color: VIOLET }}>{j.poste}</span>
                <input type="number" defaultValue={j.prix} onBlur={e => { const v = parseInt(e.target.value, 10); if (v && v !== j.prix) majJoueur(j.id, { prix: v }); }} style={{ ...inputStyle, width: '84px', padding: '6px', fontSize: '12px' }} />
                <button onClick={() => majJoueur(j.id, { actif: !j.actif })} style={bouton(j.actif ? '#7f1d1d' : '#14532d')}>{j.actif ? 'Retirer' : 'Réactiver'}</button>
              </div>
            ))}
            {liste.length === 0 && <p style={{ color: '#6b7280', fontSize: '13px' }}>Aucun joueur.</p>}
          </div>
        </div>

        <div style={sectionStyle}>
          <label style={labelStyle}>2 · Journées</label>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
            <input value={titreJournee} onChange={e => setTitreJournee(e.target.value)} placeholder="Titre (ex: Journée 5)" style={{ ...inputStyle, flex: 2, minWidth: '160px', width: 'auto' }} />
            <input type="datetime-local" value={limite} onChange={e => setLimite(e.target.value)} style={{ ...inputStyle, flex: 1.5, minWidth: '190px', width: 'auto' }} />
            <button onClick={creerJournee} disabled={enCours || !titreJournee.trim()} style={{ ...bouton(), opacity: enCours || !titreJournee.trim() ? 0.5 : 1 }}>Ouvrir la journée</button>
          </div>
          <p style={{ fontSize: '11px', color: '#6b7280', margin: '0 0 10px' }}>La date limite est facultative : à cette heure, les équipes se ferment toutes seules aux joueurs. Pense quand même à verrouiller la journée ensuite pour figer les équipes.</p>
          {journees.map(j => (
            <div key={j.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 4px', borderBottom: '1px solid #222' }}>
              <span style={{ flex: 1, fontWeight: 800, fontSize: '13px' }}>{j.titre}</span>
              <span style={{ fontSize: '12px', color: '#9ca3af' }}>{statutTxt[j.statut]}</span>
              {j.statut === 'ouverte' && <button onClick={() => verrouiller(j)} disabled={enCours} style={bouton('#b45309')}>🔒 Verrouiller</button>}
            </div>
          ))}
        </div>

        <div style={sectionStyle}>
          <label style={labelStyle}>3 · Stats de la journée et calcul des points</label>
          <select value={journeeStats} onChange={e => setJourneeStats(e.target.value)} style={{ ...inputStyle, marginBottom: '10px' }}>
            {journees.length === 0 && <option value="">Aucune journée</option>}
            {journees.map(j => <option key={j.id} value={j.id}>{j.titre} ({statutTxt[j.statut]})</option>)}
          </select>
          <p style={{ fontSize: '11px', color: '#6b7280', margin: '0 0 10px' }}>Une ligne par joueur qui a joué : <b>Nom - minutes, buts, passes, ...</b> Éléments reconnus : <i>90</i> (minutes), <i>2 buts</i>, <i>1 passe</i>, <i>clean sheet</i>, <i>3 encaissés</i>, <i>4 arrêts</i>, <i>jaune</i>, <i>rouge</i>, <i>csc</i>, <i>penalty raté</i>, <i>penalty arrêté</i>, <i>bonus 3</i>. Un joueur cité sans détail a joué 90 minutes. Un joueur non cité n'a pas joué (0 point). Tu peux coller en plusieurs fois : une ligne remplace la précédente pour le même joueur.</p>
          <textarea value={texteStats} onChange={e => setTexteStats(e.target.value)} rows={8} placeholder={'Wilson Isidor - 90, 2 buts, 1 passe, bonus 3\nJohny Placide - 90, clean sheet, 4 arrêts\nDuckens Nazon - 25, jaune\nSteeven Saba'} style={{ ...inputStyle, fontSize: '12px', resize: 'vertical', marginBottom: '10px' }} />
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button onClick={saisirStats} disabled={enCours || !journeeStats || !texteStats.trim()} style={{ ...bouton(), opacity: enCours || !journeeStats || !texteStats.trim() ? 0.5 : 1 }}>Enregistrer les stats</button>
            <button onClick={calculer} disabled={enCours || !journeeStats} style={{ ...bouton('#15803d'), opacity: enCours || !journeeStats ? 0.5 : 1 }}>🧮 Calculer et ajouter au classement</button>
          </div>
          <details style={{ marginTop: '14px' }}>
            <summary style={{ cursor: 'pointer', fontSize: '12px', fontWeight: 800, color: VIOLET }}>Barème des points</summary>
            {REGLES_POINTS.map(r => <div key={r.libelle} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#d1d5db', padding: '4px 0' }}><span>{r.libelle}</span><b>{r.valeur}</b></div>)}
          </details>
        </div>
      </div>
    </div>
  );
}
