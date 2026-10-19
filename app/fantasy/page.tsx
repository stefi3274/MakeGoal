'use client';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import BonusQuotidien from '../../components/BonusQuotidien';
import {
  JoueurFantasy, Poste, POSTES, LIBELLE_POSTE, LIBELLE_POSTE_PLURIEL, BUDGET_DEPART, montant, NB_TITULAIRES, MAX_RESERVISTES, MAX_PAR_CLUB,
  TRANSFERTS_PAR_JOURNEE, FORMATION_MAX, REGLES_POINTS, compterPostes, formationTexte, formationValide, validerEquipe,
} from '../../lib/fantasy';
import { categorieJoueur } from '../../lib/fantasyBanque';

const VIOLET = '#bf00ff';
const SOMBRE = '#3b0764';
const COULEUR_POSTE: Record<Poste, string> = { G: '#f59e0b', D: '#3b82f6', M: '#10b981', A: '#ef4444' };

type Journee = { id: string; titre: string; statut: string; date_limite: string | null } | null;
type Brouillon = { titulaires: string[]; reservistes: string[]; capitaine: string | null };
type Etat = {
  equipe: (Brouillon & { nom_equipe: string }) | null; budget: number; journee: Journee; ouverte: boolean;
  transfertsMax: number | null; transfertsUtilises: number | null; points: { journee: string; points: number }[]; total: number;
};
type LigneClassement = { rang: number; nom: string; points: number };


export default function FantasyPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [joueurs, setJoueurs] = useState<JoueurFantasy[]>([]);
  const [journeePublique, setJourneePublique] = useState<Journee>(null);
  const [etat, setEtat] = useState<Etat | null>(null);
  const [brouillon, setBrouillon] = useState<Brouillon>({ titulaires: [], reservistes: [], capitaine: null });
  const [modifie, setModifie] = useState(false);
  const [onglet, setOnglet] = useState<'equipe' | 'marche' | 'classement' | 'regles'>('equipe');
  const [message, setMessage] = useState<{ texte: string; ok: boolean } | null>(null);
  const [chargement, setChargement] = useState(true);
  const [envoi, setEnvoi] = useState(false);
  const [nomEquipe, setNomEquipe] = useState('');
  const [classement, setClassement] = useState<{ classement: LigneClassement[]; moi: { rang: number; points: number } | null; participants: number } | null>(null);
  const [fPoste, setFPoste] = useState<Poste | ''>('');
  const [fClub, setFClub] = useState('');
  const [recherche, setRecherche] = useState('');

  const carte = useMemo(() => new Map(joueurs.map(j => [j.id, j])), [joueurs]);

  const jeton = async () => (await supabase.auth.getSession()).data.session?.access_token;

  const charger = async () => {
    setChargement(true);
    try {
      const rj = await fetch('/api/fantasy-joueurs');
      const dj = await rj.json();
      if (rj.ok) { setJoueurs(dj.joueurs || []); setJourneePublique(dj.journee || null); }
      const dispo = new Set<string>(((dj.joueurs || []) as JoueurFantasy[]).map(j => j.id));
      const t = await jeton();
      if (t) {
        const re = await fetch('/api/fantasy-equipe', { headers: { Authorization: 'Bearer ' + t } });
        const de = await re.json();
        if (re.ok) {
          setEtat(de);
          if (de.equipe) {
            // un joueur retiré du jeu par l'admin disparaît de l'équipe : à remplacer avant d'enregistrer
            const tit = de.equipe.titulaires.filter((id: string) => dispo.has(id));
            const res = de.equipe.reservistes.filter((id: string) => dispo.has(id));
            const perdu = tit.length !== de.equipe.titulaires.length || res.length !== de.equipe.reservistes.length;
            setBrouillon({ titulaires: tit, reservistes: res, capitaine: de.equipe.capitaine && tit.includes(de.equipe.capitaine) ? de.equipe.capitaine : null });
            setModifie(perdu);
            if (perdu) setMessage({ texte: 'Un de tes joueurs n\'est plus disponible : remplace-le puis enregistre ton équipe.', ok: false });
          } else setModifie(false);
        }
      }
    } finally { setChargement(false); }
  };
  useEffect(() => { if (!authLoading) charger(); }, [authLoading, user]);

  // Après le bonus : met à jour seulement le budget, sans toucher à l'équipe en cours de modification.
  const rafraichirBudget = async () => {
    const t = await jeton();
    if (!t) return;
    const r = await fetch('/api/fantasy-equipe', { headers: { Authorization: 'Bearer ' + t } });
    const d = await r.json();
    if (r.ok && typeof d.budget === 'number') setEtat(e => (e ? { ...e, budget: d.budget } : e));
  };

  const chargerClassement = async () => {
    const t = await jeton();
    const r = await fetch('/api/fantasy-classement', { headers: t ? { Authorization: 'Bearer ' + t } : {} });
    const d = await r.json();
    if (r.ok) setClassement(d);
  };
  useEffect(() => { if (onglet === 'classement') chargerClassement(); }, [onglet]);

  const rejoindre = async () => {
    const t = await jeton();
    if (!t) { router.push('/compte'); return; }
    setEnvoi(true); setMessage(null);
    const r = await fetch('/api/fantasy-equipe', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + t }, body: JSON.stringify({ action: 'rejoindre', nom_equipe: nomEquipe }) });
    const d = await r.json();
    setEnvoi(false);
    if (!r.ok) { setMessage({ texte: d.error || 'Erreur.', ok: false }); return; }
    setMessage({ texte: 'Bienvenue ! Tu as ' + montant(BUDGET_DEPART) + ' virtuels pour composer ton équipe.', ok: true });
    setOnglet('marche');
    await charger();
  };

  // ---------- gestion de l'effectif ----------
  const effectif = [...brouillon.titulaires, ...brouillon.reservistes];
  const cout = effectif.reduce((n, id) => n + (carte.get(id)?.prix || 0), 0);
  const budget = etat?.budget ?? BUDGET_DEPART;
  const restant = budget - cout;
  const compteTit = compterPostes(brouillon.titulaires, carte);
  const compteRes = compterPostes(brouillon.reservistes, carte);
  const validation = validerEquipe({ ...brouillon }, carte, budget);
  const ouverte = !!etat?.ouverte;
  const maj = (b: Brouillon) => { setBrouillon(b); setModifie(true); setMessage(null); };
  const info = (texte: string) => setMessage({ texte, ok: false });

  const ajouter = (id: string) => {
    const j = carte.get(id);
    if (!j || effectif.includes(id)) return;
    if (!ouverte) return info('Les changements sont fermés jusqu\'à la prochaine journée.');
    if (effectif.length >= NB_TITULAIRES + MAX_RESERVISTES) return info('Ton effectif est complet (' + (NB_TITULAIRES + MAX_RESERVISTES) + ' joueurs). Retire un joueur d\'abord.');
    if (cout + j.prix > budget) return info('Budget insuffisant : il te reste ' + montant(restant) + '.');
    const memeClub = j.club ? effectif.filter(x => (carte.get(x)?.club || '').toLowerCase() === j.club.toLowerCase()).length : 0;
    if (memeClub >= MAX_PAR_CLUB) return info('Maximum ' + MAX_PAR_CLUB + ' joueurs de ' + j.club + '.');
    if (brouillon.titulaires.length < NB_TITULAIRES && compteTit[j.poste] < FORMATION_MAX[j.poste]) {
      maj({ ...brouillon, titulaires: [...brouillon.titulaires, id], capitaine: brouillon.capitaine || (j.poste !== 'G' ? id : null) });
    } else if (brouillon.reservistes.length < MAX_RESERVISTES && !(j.poste === 'G' && compteRes.G >= 1)) {
      maj({ ...brouillon, reservistes: [...brouillon.reservistes, id] });
    } else {
      info('Plus de place pour un ' + LIBELLE_POSTE[j.poste].toLowerCase() + '. Libère une place en retirant un joueur.');
    }
  };
  const retirer = (id: string) => {
    if (!ouverte) return info('Les changements sont fermés jusqu\'à la prochaine journée.');
    maj({ titulaires: brouillon.titulaires.filter(x => x !== id), reservistes: brouillon.reservistes.filter(x => x !== id), capitaine: brouillon.capitaine === id ? null : brouillon.capitaine });
  };
  const versBanc = (id: string) => {
    if (!ouverte) return info('Les changements sont fermés jusqu\'à la prochaine journée.');
    const j = carte.get(id)!;
    if (brouillon.reservistes.length >= MAX_RESERVISTES) return info('Le banc est plein (' + MAX_RESERVISTES + ').');
    if (j.poste === 'G' && compteRes.G >= 1) return info('Un seul gardien réserviste.');
    maj({ titulaires: brouillon.titulaires.filter(x => x !== id), reservistes: [...brouillon.reservistes, id], capitaine: brouillon.capitaine === id ? null : brouillon.capitaine });
  };
  const versTitulaire = (id: string) => {
    if (!ouverte) return info('Les changements sont fermés jusqu\'à la prochaine journée.');
    const j = carte.get(id)!;
    if (brouillon.titulaires.length >= NB_TITULAIRES) return info('Tu as déjà ' + NB_TITULAIRES + ' titulaires : mets-en un sur le banc d\'abord.');
    if (compteTit[j.poste] >= FORMATION_MAX[j.poste]) return info('Maximum ' + FORMATION_MAX[j.poste] + ' ' + LIBELLE_POSTE_PLURIEL[j.poste].toLowerCase() + ' titulaires.');
    maj({ ...brouillon, titulaires: [...brouillon.titulaires, id], reservistes: brouillon.reservistes.filter(x => x !== id) });
  };
  const capitaine = (id: string) => { if (ouverte) maj({ ...brouillon, capitaine: id }); };

  const enregistrer = async () => {
    const t = await jeton();
    if (!t) { router.push('/compte'); return; }
    setEnvoi(true); setMessage(null);
    const r = await fetch('/api/fantasy-equipe', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + t }, body: JSON.stringify({ action: 'sauver', ...brouillon }) });
    const d = await r.json();
    setEnvoi(false);
    if (!r.ok) { setMessage({ texte: d.error || 'Erreur.', ok: false }); return; }
    setMessage({ texte: '✅ Équipe enregistrée !', ok: true });
    await charger();
  };

  // ---------- affichage ----------
  const clubs = useMemo(() => Array.from(new Set(joueurs.map(j => j.club).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'fr')), [joueurs]);
  const marche = useMemo(() => {
    const q = recherche.trim().toLowerCase();
    return joueurs.filter(j => (!fPoste || j.poste === fPoste) && (!fClub || j.club === fClub) && (!q || j.nom.toLowerCase().includes(q) || j.club.toLowerCase().includes(q)));
  }, [joueurs, fPoste, fClub, recherche]);

  const cartePoste = (id: string, titulaire: boolean) => {
    const j = carte.get(id);
    if (!j) return null;
    const estCap = brouillon.capitaine === id;
    return (
      <div key={id} style={{ display: 'flex', alignItems: 'center', gap: '10px', border: '2px solid ' + (estCap ? VIOLET : categorieJoueur(j.prix).bordure), borderLeft: '6px solid ' + COULEUR_POSTE[j.poste], borderRadius: '12px', padding: '8px 10px', marginBottom: '8px', background: categorieJoueur(j.prix).fond.startsWith('linear') ? '#fffbeb' : categorieJoueur(j.prix).fond }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 900, fontSize: '14px', color: '#111', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{j.nom}{(() => { const k = categorieJoueur(j.prix); return <span style={{ background: k.fond, color: k.texte, border: '1px solid ' + k.bordure, borderRadius: '999px', fontSize: '9px', fontWeight: 900, padding: '1px 7px', marginLeft: '6px', verticalAlign: 'middle' }}>{k.court}</span>; })()}{estCap && <span style={{ marginLeft: '6px', background: VIOLET, color: '#fff', borderRadius: '999px', fontSize: '10px', padding: '1px 7px' }}>CAP ×2</span>}</div>
          <div style={{ fontSize: '11px', color: '#6b7280' }}>{LIBELLE_POSTE[j.poste]}{j.club ? ' · ' + j.club : ''} · {montant(j.prix)}</div>
        </div>
        {ouverte && (
          <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
            {titulaire && !estCap && <button onClick={() => capitaine(id)} title="Capitaine" style={btnPetit('#f3e8ff', VIOLET)}>C</button>}
            <button onClick={() => (titulaire ? versBanc(id) : versTitulaire(id))} title={titulaire ? 'Mettre sur le banc' : 'Mettre titulaire'} style={btnPetit('#eff6ff', '#2563eb')}>⇄</button>
            <button onClick={() => retirer(id)} title="Retirer" style={btnPetit('#fef2f2', '#dc2626')}>✕</button>
          </div>
        )}
      </div>
    );
  };

  const encart = (texte: string, couleurFond = '#faf5ff', couleurTexte = SOMBRE) => (
    <div style={{ background: couleurFond, color: couleurTexte, borderRadius: '14px', padding: '14px 16px', fontSize: '13px', fontWeight: 700, marginBottom: '14px', lineHeight: 1.5 }}>{texte}</div>
  );

  const regles = () => {
    return (
      <div style={{ fontSize: '13px', color: '#374151', lineHeight: 1.6 }}>
        <h3 style={{ fontSize: '16px', fontWeight: 900, margin: '0 0 8px' }}>Comment jouer</h3>
        <ul style={{ paddingLeft: '18px', margin: '0 0 16px' }}>
          <li>Inscription gratuite : tu reçois <b>{montant(BUDGET_DEPART)}</b> virtuels (sans valeur réelle).</li>
          <li>Compose ton équipe : <b>11 titulaires</b> (1 gardien, 3 à 5 défenseurs, 2 à 5 milieux, 1 à 3 attaquants) et jusqu'à <b>{MAX_RESERVISTES} réservistes</b>, sans dépasser ton budget.</li>
          <li>Maximum <b>{MAX_PAR_CLUB} joueurs du même club</b>.</li>
          <li>Choisis un <b>capitaine</b> : ses points comptent double.</li>
          <li>Si un titulaire ne joue pas, un réserviste le remplace automatiquement.</li>
          <li>Après la première journée, tu peux changer jusqu'à <b>{TRANSFERTS_PAR_JOURNEE} joueurs</b> entre deux journées (capitaine et banc : changements libres).</li>
          <li>Les équipes se verrouillent au début de chaque journée.</li>
          <li>Les points de ton équipe s'ajoutent à ton total du <b>classement MakeGoal</b>, avec tes pronostics.</li>
        </ul>
        <h3 style={{ fontSize: '16px', fontWeight: 900, margin: '0 0 8px' }}>Points des joueurs</h3>
        {REGLES_POINTS.map(r => (
          <div key={r.libelle} style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', padding: '7px 10px', background: '#f9fafb', borderRadius: '8px', marginBottom: '4px', fontWeight: 600 }}>
            <span>{r.libelle}</span><span style={{ fontWeight: 900, color: r.valeur.startsWith('-') ? '#dc2626' : '#065f46', whiteSpace: 'nowrap' }}>{r.valeur}</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div style={{ minHeight: '100vh', background: '#fff', color: '#111', fontFamily: 'sans-serif' }}>
      <Header />
      <div style={{ background: 'linear-gradient(135deg,' + SOMBRE + ',' + VIOLET + ')', padding: '38px 20px', textAlign: 'center' }}>
        <div style={{ fontSize: '40px' }}>🏟️</div>
        <h1 style={{ color: '#fff', fontWeight: 900, fontSize: '28px', margin: '6px 0 6px' }}>MakeGoal Fantasy</h1>
        <p style={{ color: '#e9d5ff', fontSize: '14px', margin: 0, fontWeight: 600 }}>Gratuit · {montant(BUDGET_DEPART)} virtuels · 11 joueurs + réservistes · tes points s'ajoutent au classement MakeGoal</p>
      </div>

      <div style={{ maxWidth: '760px', margin: '0 auto', padding: '20px 16px 60px' }}>
        <div style={{ textAlign: 'center', marginBottom: '14px' }}>
          <button onClick={() => router.push('/fantasy/express')} style={{ background: '#fef3c7', color: '#78350f', border: 'none', borderRadius: '999px', padding: '9px 16px', fontWeight: 800, fontSize: '12px', cursor: 'pointer' }}>⚡ Nouveau : mode 7 joueurs</button>
          <button onClick={() => router.push('/fantasy/ligues')} style={{ background: '#dcfce7', color: '#14532d', border: 'none', borderRadius: '999px', padding: '9px 16px', fontWeight: 800, fontSize: '12px', cursor: 'pointer', marginLeft: '8px' }}>👥 Ligues entre amis</button>
        </div>
        {message && <div style={{ padding: '12px 16px', borderRadius: '12px', marginBottom: '14px', fontWeight: 700, fontSize: '13px', background: message.ok ? '#f0fdf4' : '#fef2f2', color: message.ok ? '#065f46' : '#b91c1c' }}>{message.texte}</div>}

        {!authLoading && !user && (
          <div style={{ textAlign: 'center', padding: '30px 10px' }}>
            <p style={{ fontWeight: 700, fontSize: '15px', color: '#374151' }}>Crée ton compte gratuit pour recevoir {montant(BUDGET_DEPART)} virtuels et composer ton équipe.</p>
            <button onClick={() => router.push('/compte')} style={{ background: VIOLET, color: '#fff', border: 'none', borderRadius: '999px', padding: '14px 28px', fontWeight: 900, fontSize: '15px', cursor: 'pointer' }}>S'inscrire / Se connecter</button>
            <div style={{ marginTop: '26px', textAlign: 'left' }}>{regles()}</div>
          </div>
        )}

        {user && chargement && <p style={{ textAlign: 'center', color: '#6b7280', fontWeight: 700 }}>Chargement…</p>}

        {user && !chargement && etat && !etat.equipe && (
          <div style={{ textAlign: 'center', padding: '10px 0 24px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 900, margin: '0 0 8px' }}>Rejoins le jeu gratuitement</h2>
            <p style={{ color: '#6b7280', fontSize: '14px', margin: '0 0 16px' }}>Choisis le nom de ton équipe : tu reçois {montant(BUDGET_DEPART)} virtuels pour la composer.</p>
            <input value={nomEquipe} onChange={e => setNomEquipe(e.target.value)} maxLength={30} placeholder="Nom de ton équipe" style={{ width: '100%', maxWidth: '360px', padding: '13px', borderRadius: '12px', border: '2px solid #e5e7eb', fontSize: '15px', boxSizing: 'border-box' }} />
            <div><button onClick={rejoindre} disabled={envoi} style={{ marginTop: '12px', background: VIOLET, color: '#fff', border: 'none', borderRadius: '999px', padding: '14px 30px', fontWeight: 900, fontSize: '15px', cursor: 'pointer', opacity: envoi ? 0.6 : 1 }}>🎮 Jouer gratuitement</button></div>
            <div style={{ marginTop: '26px', textAlign: 'left' }}>{regles()}</div>
          </div>
        )}

        {user && !chargement && etat && etat.equipe && (
          <>
            <BonusQuotidien onChange={rafraichirBudget} />
            <div style={{ display: 'flex', gap: '6px', marginBottom: '16px', overflowX: 'auto' }}>
              {([['equipe', '👕 Mon équipe'], ['marche', '🛒 Marché'], ['classement', '🏆 Classement'], ['regles', '📖 Règles']] as const).map(([k, l]) => (
                <button key={k} onClick={() => setOnglet(k)} style={{ padding: '10px 16px', borderRadius: '999px', border: 'none', fontWeight: 800, fontSize: '13px', cursor: 'pointer', whiteSpace: 'nowrap', background: onglet === k ? VIOLET : '#f3f4f6', color: onglet === k ? '#fff' : '#374151' }}>{l}</button>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(110px,1fr))', gap: '8px', marginBottom: '14px' }}>
              {[
                ['Budget restant', montant(restant), restant < 0 ? '#dc2626' : '#065f46'],
                ['Effectif', effectif.length + ' / ' + (NB_TITULAIRES + MAX_RESERVISTES), '#111'],
                ['Composition', brouillon.titulaires.length === NB_TITULAIRES && formationValide(compteTit) ? formationTexte(compteTit) : '—', '#111'],
                ['Transferts', etat.transfertsMax === null ? 'Libres' : (etat.transfertsUtilises || 0) + ' / ' + etat.transfertsMax, '#111'],
                ['Mes points', String(etat.total), VIOLET],
              ].map(([l, v, c]) => (
                <div key={l} style={{ background: '#f9fafb', border: '1px solid #f3f4f6', borderRadius: '12px', padding: '10px', textAlign: 'center' }}>
                  <div style={{ fontSize: '10px', color: '#6b7280', fontWeight: 800, textTransform: 'uppercase' }}>{l}</div>
                  <div style={{ fontSize: '17px', fontWeight: 900, color: c }}>{v}</div>
                </div>
              ))}
            </div>

            {etat.journee
              ? encart((ouverte ? '🟢 ' : '🔒 ') + etat.journee.titre + (ouverte ? ' : tu peux modifier ton équipe' + (etat.journee.date_limite ? ' jusqu\'au ' + new Date(etat.journee.date_limite).toLocaleString('fr-FR', { timeZone: 'America/Port-au-Prince', weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }) : '') + '.' : ' : équipes verrouillées. Les changements rouvrent à la prochaine journée.'), ouverte ? '#f0fdf4' : '#fff7ed', ouverte ? '#065f46' : '#9a3412')
              : encart('🟢 Le jeu démarre bientôt : compose ton équipe dès maintenant.', '#f0fdf4', '#065f46')}

            {onglet === 'equipe' && (
              <div>
                <h3 style={{ fontSize: '15px', fontWeight: 900, margin: '4px 0 10px' }}>⭐ {etat.equipe.nom_equipe} · titulaires ({brouillon.titulaires.length}/{NB_TITULAIRES})</h3>
                {POSTES.map(p => {
                  const ids = brouillon.titulaires.filter(id => carte.get(id)?.poste === p);
                  return (
                    <div key={p} style={{ marginBottom: '10px' }}>
                      <div style={{ fontSize: '11px', fontWeight: 900, color: COULEUR_POSTE[p], textTransform: 'uppercase', margin: '0 0 4px' }}>{LIBELLE_POSTE_PLURIEL[p]} ({ids.length})</div>
                      {ids.length === 0 ? <div style={{ fontSize: '12px', color: '#9ca3af', border: '1px dashed #d1d5db', borderRadius: '10px', padding: '10px', marginBottom: '8px' }}>Aucun {LIBELLE_POSTE[p].toLowerCase()} : ajoute-en depuis le Marché.</div> : ids.map(id => cartePoste(id, true))}
                    </div>
                  );
                })}
                <h3 style={{ fontSize: '15px', fontWeight: 900, margin: '18px 0 10px' }}>🪑 Réservistes ({brouillon.reservistes.length}/{MAX_RESERVISTES})</h3>
                <p style={{ fontSize: '12px', color: '#6b7280', margin: '0 0 8px' }}>Un réserviste remplace automatiquement un titulaire qui n'a pas joué (dans l'ordre de ta liste), si ta composition reste valide.</p>
                {brouillon.reservistes.length === 0 ? <div style={{ fontSize: '12px', color: '#9ca3af', border: '1px dashed #d1d5db', borderRadius: '10px', padding: '10px' }}>Aucun réserviste.</div> : brouillon.reservistes.map(id => cartePoste(id, false))}

                {modifie && !validation.ok && ouverte && brouillon.titulaires.length > 0 && (
                  <div style={{ background: '#fffbeb', color: '#92400e', borderRadius: '12px', padding: '12px 14px', fontSize: '12px', fontWeight: 700, margin: '14px 0 0' }}>À corriger avant d'enregistrer : {validation.erreurs.join(' ')}</div>
                )}
                <button onClick={enregistrer} disabled={!ouverte || !modifie || envoi || !validation.ok} style={{ width: '100%', marginTop: '16px', padding: '15px', background: VIOLET, color: '#fff', border: 'none', borderRadius: '999px', fontWeight: 900, fontSize: '15px', cursor: 'pointer', opacity: !ouverte || !modifie || envoi || !validation.ok ? 0.45 : 1 }}>
                  {envoi ? 'Enregistrement…' : modifie ? '💾 Enregistrer mon équipe' : 'Équipe enregistrée'}
                </button>

                {etat.points.length > 0 && (
                  <div style={{ marginTop: '24px' }}>
                    <h3 style={{ fontSize: '15px', fontWeight: 900, margin: '0 0 8px' }}>Mes points par journée</h3>
                    {etat.points.map((p, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 12px', background: i % 2 ? '#fff' : '#f9fafb', borderRadius: '8px', fontSize: '13px', fontWeight: 700 }}><span>{p.journee}</span><span style={{ color: VIOLET }}>+{p.points} pts</span></div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {onglet === 'marche' && (
              <div>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '10px' }}>
                  <button onClick={() => setFPoste('')} style={filtre(fPoste === '', '#374151')}>Tous</button>
                  {POSTES.map(p => <button key={p} onClick={() => setFPoste(p)} style={filtre(fPoste === p, COULEUR_POSTE[p])}>{LIBELLE_POSTE_PLURIEL[p]}</button>)}
                </div>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
                  <input value={recherche} onChange={e => setRecherche(e.target.value)} placeholder="Rechercher un joueur ou un club" style={{ flex: 2, minWidth: '160px', padding: '11px', borderRadius: '10px', border: '1px solid #d1d5db', fontSize: '14px' }} />
                  <select value={fClub} onChange={e => setFClub(e.target.value)} style={{ flex: 1, minWidth: '130px', padding: '11px', borderRadius: '10px', border: '1px solid #d1d5db', fontSize: '14px' }}>
                    <option value="">Tous les clubs</option>
                    {clubs.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                {joueurs.length === 0 && <p style={{ color: '#6b7280', textAlign: 'center', fontWeight: 700 }}>Les joueurs seront bientôt disponibles.</p>}
                {marche.map(j => {
                  const dedans = effectif.includes(j.id);
                  return (
                    <div key={j.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', border: '2px solid ' + categorieJoueur(j.prix).bordure, borderLeft: '6px solid ' + COULEUR_POSTE[j.poste], borderRadius: '12px', padding: '9px 12px', marginBottom: '8px', background: dedans ? '#faf5ff' : (categorieJoueur(j.prix).fond.startsWith('linear') ? '#fffbeb' : categorieJoueur(j.prix).fond) }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 900, fontSize: '14px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{j.nom}{(() => { const k = categorieJoueur(j.prix); return <span style={{ background: k.fond, color: k.texte, border: '1px solid ' + k.bordure, borderRadius: '999px', fontSize: '9px', fontWeight: 900, padding: '1px 7px', marginLeft: '6px', verticalAlign: 'middle' }}>{k.court}</span>; })()}</div>
                        <div style={{ fontSize: '11px', color: '#6b7280' }}>{LIBELLE_POSTE[j.poste]}{j.club ? ' · ' + j.club : ''}</div>
                      </div>
                      <div style={{ fontWeight: 900, fontSize: '14px', color: '#065f46' }}>{montant(j.prix)}</div>
                      {dedans
                        ? <button onClick={() => retirer(j.id)} disabled={!ouverte} style={{ ...btnAction('#fef2f2', '#dc2626'), opacity: ouverte ? 1 : 0.5 }}>Retirer</button>
                        : <button onClick={() => ajouter(j.id)} disabled={!ouverte} style={{ ...btnAction(VIOLET, '#fff'), opacity: ouverte ? 1 : 0.5 }}>+ Ajouter</button>}
                    </div>
                  );
                })}
                {modifie && <div style={{ position: 'sticky', bottom: '12px', marginTop: '12px' }}><button onClick={() => setOnglet('equipe')} style={{ width: '100%', padding: '14px', background: SOMBRE, color: '#fff', border: 'none', borderRadius: '999px', fontWeight: 900, fontSize: '14px', cursor: 'pointer', boxShadow: '0 6px 20px rgba(0,0,0,0.25)' }}>Voir mon équipe et l'enregistrer →</button></div>}
              </div>
            )}

            {onglet === 'classement' && (
              <div>
                {classement?.moi && encart('Ta place : ' + classement.moi.rang + 'e sur ' + classement.participants + ' joueurs · ' + classement.moi.points + ' points')}
                {!classement && <p style={{ color: '#6b7280', textAlign: 'center', fontWeight: 700 }}>Chargement…</p>}
                {classement && classement.classement.length === 0 && <p style={{ color: '#6b7280', textAlign: 'center', fontWeight: 700 }}>Le classement apparaîtra après la première journée.</p>}
                {classement?.classement.map(l => (
                  <div key={l.rang} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px', background: l.rang % 2 ? '#f9fafb' : '#fff', borderRadius: '10px', fontWeight: 800, fontSize: '14px' }}>
                    <span style={{ width: '30px', color: l.rang <= 3 ? VIOLET : '#6b7280' }}>{l.rang <= 3 ? ['🥇', '🥈', '🥉'][l.rang - 1] : l.rang}</span>
                    <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.nom}</span>
                    <span style={{ color: VIOLET }}>{l.points} pts</span>
                  </div>
                ))}
              </div>
            )}

            {onglet === 'regles' && regles()}
          </>
        )}
      </div>
      <Footer />
    </div>
  );
}

const btnPetit = (fond: string, couleur: string) => ({ width: '30px', height: '30px', borderRadius: '8px', border: 'none', background: fond, color: couleur, fontWeight: 900, cursor: 'pointer', fontSize: '13px' } as const);
const btnAction = (fond: string, couleur: string) => ({ padding: '8px 12px', borderRadius: '999px', border: 'none', background: fond, color: couleur, fontWeight: 900, fontSize: '12px', cursor: 'pointer', whiteSpace: 'nowrap' } as const);
const filtre = (actif: boolean, c: string) => ({ padding: '8px 14px', borderRadius: '999px', border: '2px solid ' + c, background: actif ? c : '#fff', color: actif ? '#fff' : c, fontWeight: 800, fontSize: '12px', cursor: 'pointer' } as const);
