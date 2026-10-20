'use client';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import BonusQuotidien from '../../components/BonusQuotidien';
import Maillot from '../../components/Maillot';
import { JoueurFantasy, Poste, POSTES, LIBELLE_POSTE, BUDGET_DEPART, montant, REGLES_POINTS, compterPostes } from '../../lib/fantasy';
import { categorieJoueur } from '../../lib/fantasyBanque';
import { texteSur } from '../../lib/fantasyProfil';
import { FORMATION_7, MAX_TOPS, NB_JOUEURS_7, estTop, nbTops, validerEquipe7 } from '../../lib/fantasy7';

const VIOLET = '#bf00ff';
const SOMBRE = '#3b0764';
const COULEUR_POSTE: Record<Poste, string> = { G: '#f59e0b', D: '#3b82f6', M: '#10b981', A: '#ef4444' };

type Etat = { budget: number; inscrit: boolean; nom_equipe: string | null; profil: { nom: string; couleur1: string; couleur2: string; embleme: string } | null; equipe: { titulaires: string[]; capitaine: string | null } | null; ouverte: boolean; journee: { titre: string; statut: string } | null; points: { journee: string; points: number }[]; total: number };
type Ligne = { rang: number; nom: string; points: number; embleme?: string; couleur?: string };

export default function FantasyPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [joueurs, setJoueurs] = useState<JoueurFantasy[]>([]);
  const [etat, setEtat] = useState<Etat | null>(null);
  const [titulaires, setTitulaires] = useState<string[]>([]);
  const [capitaine, setCapitaine] = useState<string | null>(null);
  const [onglet, setOnglet] = useState<'equipe' | 'marche' | 'classement' | 'regles'>('equipe');
  const [message, setMessage] = useState<{ texte: string; ok: boolean } | null>(null);
  const [chargement, setChargement] = useState(true);
  const [envoi, setEnvoi] = useState(false);
  const [fPoste, setFPoste] = useState<Poste | ''>('');
  const [recherche, setRecherche] = useState('');
  const [nomEquipe, setNomEquipe] = useState('');
  const [classement, setClassement] = useState<{ classement: Ligne[]; moi: { rang: number; points: number } | null } | null>(null);

  const carte = useMemo(() => new Map(joueurs.map(j => [j.id, j])), [joueurs]);
  const jeton = async () => (await supabase.auth.getSession()).data.session?.access_token;


  const rejoindre = async () => {
    const t = await jeton();
    if (!t) return;
    setEnvoi(true); setMessage(null);
    const r = await fetch('/api/fantasy-equipe', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + t }, body: JSON.stringify({ action: 'rejoindre', nom_equipe: nomEquipe }) });
    const d = await r.json();
    setEnvoi(false);
    if (!r.ok) { setMessage({ texte: '❌ ' + (d.error || 'Erreur.'), ok: false }); return; }
    await charger();
  };

  const charger = async () => {
    setChargement(true);
    try {
      const rj = await fetch('/api/fantasy-joueurs');
      const dj = await rj.json();
      const liste: JoueurFantasy[] = rj.ok ? dj.joueurs || [] : [];
      setJoueurs(liste);
      const dispo = new Set(liste.map(j => j.id));
      const t = await jeton();
      if (t) {
        const re = await fetch('/api/fantasy7-equipe', { headers: { Authorization: 'Bearer ' + t } });
        const de = await re.json();
        if (re.ok) {
          setEtat(de);
          const tit = (de.equipe?.titulaires || []).filter((id: string) => dispo.has(id));
          setTitulaires(tit);
          setCapitaine(de.equipe?.capitaine && tit.includes(de.equipe.capitaine) ? de.equipe.capitaine : null);
        }
      }
    } finally { setChargement(false); }
  };
  useEffect(() => { if (!authLoading) charger(); }, [authLoading, user]);

  // Après le bonus : met à jour seulement le budget, sans toucher à l'équipe en cours de modification.
  const rafraichirBudget = async () => {
    const t = await jeton();
    if (!t) return;
    const r = await fetch('/api/fantasy7-equipe', { headers: { Authorization: 'Bearer ' + t } });
    const d = await r.json();
    if (r.ok && typeof d.budget === 'number') setEtat(e => (e ? { ...e, budget: d.budget } : e));
  };

  useEffect(() => {
    if (onglet !== 'classement') return;
    (async () => {
      const t = await jeton();
      const r = await fetch('/api/fantasy7-classement', { headers: t ? { Authorization: 'Bearer ' + t } : {} });
      const d = await r.json();
      if (r.ok) setClassement(d);
    })();
  }, [onglet]);

  const ouverte = !!etat?.ouverte;
  const cout = titulaires.reduce((n, id) => n + (carte.get(id)?.prix || 0), 0);
  const budget = etat?.budget ?? BUDGET_DEPART;
  const restant = budget - cout;
  const compte = compterPostes(titulaires, carte);
  const tops = nbTops(titulaires, carte);
  const validation = validerEquipe7({ titulaires, capitaine }, carte, budget);
  const info = (texte: string) => setMessage({ texte, ok: false });
  const maj = (t: string[], c: string | null) => { setTitulaires(t); setCapitaine(c); setMessage(null); };

  const ajouter = (id: string) => {
    const j = carte.get(id);
    if (!j || titulaires.includes(id)) return;
    if (!ouverte) return info('Les changements sont fermés jusqu\'à la prochaine journée.');
    if (titulaires.length >= NB_JOUEURS_7) return info('Ton équipe est complète (7 joueurs). Retire un joueur d\'abord.');
    if (compte[j.poste] >= FORMATION_7[j.poste]) return info('Tu as déjà ' + FORMATION_7[j.poste] + ' ' + LIBELLE_POSTE[j.poste].toLowerCase() + (FORMATION_7[j.poste] > 1 ? 's' : '') + '. Retire-en un d\'abord.');
    if (estTop(j) && tops >= MAX_TOPS) return info('Maximum ' + MAX_TOPS + ' Légendes Or Top dans ton équipe.');
    if (j.prix > restant) return info('Budget insuffisant : il te reste ' + montant(restant) + '.');
    maj([...titulaires, id], capitaine || id);
  };
  const retirer = (id: string) => {
    if (!ouverte) return info('Les changements sont fermés jusqu\'à la prochaine journée.');
    maj(titulaires.filter(x => x !== id), capitaine === id ? null : capitaine);
  };

  const enregistrer = async () => {
    const t = await jeton();
    if (!t) { router.push('/compte'); return; }
    setEnvoi(true); setMessage(null);
    const r = await fetch('/api/fantasy7-equipe', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + t }, body: JSON.stringify({ action: 'sauver', titulaires, capitaine }) });
    const d = await r.json();
    setEnvoi(false);
    if (!r.ok) { setMessage({ texte: d.error || 'Erreur.', ok: false }); return; }
    setMessage({ texte: '✅ Équipe de 7 enregistrée !', ok: true });
    await charger();
  };

  const marche = useMemo(() => {
    const q = recherche.trim().toLowerCase();
    return joueurs.filter(j => (!fPoste || j.poste === fPoste) && (!q || j.nom.toLowerCase().includes(q) || j.club.toLowerCase().includes(q)));
  }, [joueurs, fPoste, recherche]);

  const badge = (prix: number) => { const k = categorieJoueur(prix); return <span title={k.libelle} style={{ background: k.fond, color: k.texte, border: '1px solid ' + k.bordure, borderRadius: '999px', fontSize: '11px', fontWeight: 900, padding: '3px 10px', whiteSpace: 'nowrap', flexShrink: 0 }}>{k.court}</span>; };
  const fondCarte = (prix: number) => { const f = categorieJoueur(prix).fond; return f.startsWith('linear') ? '#fffbeb' : f; };

  const emplacements: { poste: Poste; id: string | null }[] = [];
  POSTES.forEach(p => {
    const ids = titulaires.filter(id => carte.get(id)?.poste === p);
    for (let i = 0; i < FORMATION_7[p]; i++) emplacements.push({ poste: p, id: ids[i] || null });
  });

  const regles = () => (
    <div style={{ fontSize: '13px', color: '#374151', lineHeight: 1.6 }}>
      <h3 style={{ fontSize: '16px', fontWeight: 900, margin: '0 0 8px' }}>Comment jouer (mode 7 joueurs)</h3>
      <ul style={{ paddingLeft: '18px', margin: '0 0 16px' }}>
        <li>Compose une équipe de <b>7 joueurs</b> en <b>1-2-2-2</b> : 1 gardien, 2 défenseurs, 2 milieux, 2 attaquants.</li>
        <li>Budget : <b>{montant(BUDGET_DEPART)}</b> virtuels (sans valeur réelle).</li>
        <li>Maximum <b>{MAX_TOPS} Légendes Or Top</b> dans ton équipe. Complète avec des Espoirs à petit prix.</li>
        <li>Ton <b>capitaine</b> compte double s'il joue.</li>
        <li>Pas de réservistes : si un joueur ne joue pas, il marque 0.</li>
        <li>Tu peux refaire ton équipe librement à chaque journée. Elle se verrouille au coup d'envoi.</li>
        <li>Les points s'ajoutent au <b>classement MakeGoal</b>, avec tes pronostics.</li>
      </ul>
      <h3 style={{ fontSize: '16px', fontWeight: 900, margin: '0 0 8px' }}>Points des joueurs</h3>
      {REGLES_POINTS.map(r => (
        <div key={r.libelle} style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', padding: '7px 10px', background: '#f9fafb', borderRadius: '8px', marginBottom: '4px', fontWeight: 600 }}>
          <span>{r.libelle}</span><span style={{ fontWeight: 900, color: r.valeur.startsWith('-') ? '#dc2626' : '#065f46', whiteSpace: 'nowrap' }}>{r.valeur}</span>
        </div>
      ))}
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: '#fff', color: '#111', fontFamily: 'sans-serif' }}>
      <Header />
      <section aria-label="MakeGoal Fantasy" style={{ position: 'relative', overflow: 'hidden', background: SOMBRE }}>
        <img src="/fantasy-hero.jpg" alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 35%', opacity: 0.55 }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(26,0,51,0.35) 0%, rgba(26,0,51,0.9) 100%)' }} aria-hidden="true" />
        <div style={{ position: 'relative', maxWidth: '760px', margin: '0 auto', padding: '40px 20px 28px', textAlign: 'center' }}>
          <h1 style={{ color: '#fff', fontWeight: 900, fontSize: 'clamp(28px,7vw,38px)', lineHeight: 1.1, margin: '0 0 8px' }}>MakeGoal Fantasy</h1>
          <p style={{ color: '#f3e8ff', fontSize: '15px', lineHeight: 1.5, margin: '0 0 16px', fontWeight: 600 }}>Compose ton équipe de 7 joueurs et grimpe au classement. 100 % gratuit.</p>
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
            {['⚡ 7 joueurs · 1-2-2-2', '💰 ' + montant(BUDGET_DEPART), '★ Max ' + MAX_TOPS + ' Légendes Top'].map(t => (
              <span key={t} style={{ background: 'rgba(255,255,255,0.16)', border: '1px solid rgba(255,255,255,0.35)', color: '#fff', borderRadius: '999px', padding: '6px 14px', fontSize: '13px', fontWeight: 800 }}>{t}</span>
            ))}
          </div>
        </div>
      </section>

      <div style={{ maxWidth: '760px', margin: '0 auto', padding: '20px 16px 80px' }}>
        <div style={{ textAlign: 'center', marginBottom: '14px' }}>
          <button onClick={() => router.push('/fantasy/ligues')} style={{ background: '#dcfce7', color: '#14532d', border: 'none', borderRadius: '999px', padding: '12px 20px', fontWeight: 800, fontSize: '14px', cursor: 'pointer', minHeight: '44px' }}>👥 Ligues entre amis</button>
        </div>
        {message && <div style={{ padding: '12px 16px', borderRadius: '12px', marginBottom: '14px', fontWeight: 700, fontSize: '13px', background: message.ok ? '#f0fdf4' : '#fef2f2', color: message.ok ? '#065f46' : '#b91c1c' }}>{message.texte}</div>}

        {!authLoading && !user && (
          <div style={{ textAlign: 'center', padding: '30px 10px' }}>
            <p style={{ fontWeight: 700, fontSize: '15px', color: '#374151' }}>Crée ton compte gratuit pour composer ton équipe de 7.</p>
            <button onClick={() => router.push('/compte')} style={{ background: VIOLET, color: '#fff', border: 'none', borderRadius: '999px', padding: '14px 28px', fontWeight: 900, fontSize: '15px', cursor: 'pointer' }}>S'inscrire / Se connecter</button>
            <div style={{ marginTop: '26px', textAlign: 'left' }}>{regles()}</div>
          </div>
        )}

        {user && chargement && <p style={{ textAlign: 'center', color: '#6b7280', fontWeight: 700 }}>Chargement…</p>}

        {user && !chargement && etat && !etat.inscrit && (
          <div style={{ textAlign: 'center', padding: '10px 0 24px' }}>
            <p style={{ fontWeight: 800, fontSize: '16px', color: '#374151', margin: '0 0 6px' }}>Crée ton équipe</p>
            <p style={{ fontSize: '13px', color: '#6b7280', margin: '0 0 14px' }}>Choisis un nom d'équipe (tu pourras le changer et personnaliser tes couleurs dans ton profil).</p>
            <input value={nomEquipe} onChange={e => setNomEquipe(e.target.value)} maxLength={30} placeholder="Nom de ton équipe" aria-label="Nom de ton équipe" style={{ width: '100%', maxWidth: '340px', padding: '13px', borderRadius: '12px', border: '2px solid #e5e7eb', fontSize: '15px', fontWeight: 700, boxSizing: 'border-box', marginBottom: '12px' }} />
            <div>
              <button onClick={rejoindre} disabled={envoi || nomEquipe.trim().length < 2} style={{ background: VIOLET, color: '#fff', border: 'none', borderRadius: '999px', padding: '14px 28px', fontWeight: 900, fontSize: '15px', cursor: 'pointer', opacity: envoi || nomEquipe.trim().length < 2 ? 0.5 : 1 }}>Rejoindre MakeGoal Fantasy</button>
            </div>
          </div>
        )}

        {user && !chargement && etat && etat.inscrit && (
          <>
            <BonusQuotidien onChange={rafraichirBudget} />
            <div role="tablist" style={{ display: 'flex', gap: '8px', marginBottom: '16px', overflowX: 'auto', paddingBottom: '4px' }}>
              {([['equipe', '👕 Mon équipe'], ['marche', '🛒 Marché'], ['classement', '🏆 Classement'], ['regles', '📖 Règles']] as const).map(([k, l]) => (
                <button key={k} role="tab" aria-selected={onglet === k} onClick={() => setOnglet(k)} style={{ padding: '12px 18px', minHeight: '44px', borderRadius: '999px', border: 'none', fontWeight: 800, fontSize: '14px', cursor: 'pointer', whiteSpace: 'nowrap', background: onglet === k ? VIOLET : '#f3f4f6', color: onglet === k ? '#fff' : '#374151' }}>{l}</button>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: '10px', marginBottom: '14px' }}>
              {[
                ['Budget restant', montant(restant), restant < 0 ? '#dc2626' : '#065f46'],
                ['Joueurs', titulaires.length + ' / ' + NB_JOUEURS_7, '#111'],
                ['Légendes Top', tops + ' / ' + MAX_TOPS, '#111'],
                ['Mes points', String(etat.total), VIOLET],
              ].map(([l, v, c]) => (
                <div key={l} style={{ background: '#f9fafb', border: '1px solid #f3f4f6', borderRadius: '12px', padding: '10px', textAlign: 'center' }}>
                  <div style={{ fontSize: '10px', color: '#6b7280', fontWeight: 800 }}>{l}</div>
                  <div style={{ fontSize: '16px', fontWeight: 900, color: c }}>{v}</div>
                </div>
              ))}
            </div>

            {etat.journee && <div style={{ background: ouverte ? '#f0fdf4' : '#fffbeb', color: ouverte ? '#065f46' : '#92400e', borderRadius: '12px', padding: '10px 14px', fontSize: '13px', fontWeight: 700, marginBottom: '14px' }}>{etat.journee.titre} : {ouverte ? 'équipes ouvertes' : 'équipes verrouillées'}</div>}

            {onglet === 'equipe' && (
              <div>
                <div style={{ background: etat.profil?.couleur1 || VIOLET, color: texteSur(etat.profil?.couleur1 || VIOLET), borderBottom: '5px solid ' + (etat.profil?.couleur2 || '#fff'), borderRadius: '12px', padding: '10px 14px', margin: '4px 0 12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '26px' }}>{etat.profil?.embleme || '⚽'}</span>
                  <span style={{ flex: 1, fontWeight: 900, fontSize: '15px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{etat.nom_equipe}</span>
                  <a href="/profil" style={{ fontSize: '11px', fontWeight: 900, color: 'inherit', textDecoration: 'underline' }}>🎨 Personnaliser</a>
                </div>
                <div style={{ background: 'repeating-linear-gradient(180deg,#15803d 0px,#15803d 46px,#16a34a 46px,#16a34a 92px)', border: '3px solid rgba(255,255,255,0.85)', borderRadius: '18px', padding: '18px 8px 14px', marginBottom: '14px', position: 'relative' }}>
                  {(['A', 'M', 'D', 'G'] as Poste[]).map(p => (
                    <div key={p} style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginBottom: '16px' }}>
                      {emplacements.filter(e => e.poste === p).map((e, k) => {
                        const jj = e.id ? carte.get(e.id) : null;
                        if (!jj) return (
                          <button key={p + k} onClick={() => { setFPoste(e.poste); setOnglet('marche'); }} aria-label={'Ajouter un ' + LIBELLE_POSTE[e.poste].toLowerCase()} style={{ width: '92px', background: 'none', border: 'none', cursor: 'pointer', color: '#fff', padding: 0 }}>
                            <div style={{ width: '48px', height: '48px', margin: '0 auto', borderRadius: '50%', border: '2px dashed rgba(255,255,255,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', fontWeight: 900 }}>+</div>
                            <div style={{ fontSize: '12px', fontWeight: 800, marginTop: '4px' }}>{LIBELLE_POSTE[e.poste]}</div>
                          </button>
                        );
                        const nomCourt = jj.nom.split(' ').slice(-1)[0];
                        return (
                          <div key={jj.id} style={{ width: '92px', textAlign: 'center', color: '#fff', position: 'relative' }}>
                            <div style={{ display: 'flex', justifyContent: 'center' }}><Maillot c1={etat.profil?.couleur1} c2={etat.profil?.couleur2} lettre={jj.poste} taille={48} /></div>
                            {capitaine === jj.id && <span style={{ position: 'absolute', top: -4, right: 14, background: '#fff', color: VIOLET, borderRadius: '999px', fontSize: '11px', fontWeight: 900, padding: '1px 6px' }}>C</span>}
                            <div style={{ fontSize: '13px', fontWeight: 900, marginTop: '4px', textShadow: '0 1px 2px rgba(0,0,0,0.5)', wordBreak: 'break-word', lineHeight: 1.15 }}>{nomCourt}</div>
                            <div style={{ fontSize: '11px', fontWeight: 700, opacity: 0.95 }}>{montant(jj.prix)}</div>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
                <h3 style={{ fontSize: '16px', fontWeight: 900, margin: '0 0 10px' }}>Mes joueurs</h3>
                {emplacements.map((e, i) => {
                  const j = e.id ? carte.get(e.id) : null;
                  if (!j) return (
                    <div key={'v' + i} onClick={() => { setFPoste(e.poste); setOnglet('marche'); }} style={{ border: '2px dashed #d1d5db', borderLeft: '6px solid ' + COULEUR_POSTE[e.poste], borderRadius: '12px', padding: '14px 12px', marginBottom: '8px', color: '#9ca3af', fontWeight: 800, fontSize: '13px', cursor: 'pointer' }}>+ {LIBELLE_POSTE[e.poste]}</div>
                  );
                  const estCap = capitaine === j.id;
                  return (
                    <div key={j.id} style={{ border: '2px solid ' + (estCap ? VIOLET : categorieJoueur(j.prix).bordure), borderLeft: '6px solid ' + COULEUR_POSTE[j.poste], borderRadius: '14px', padding: '12px', marginBottom: '10px', background: fondCarte(j.prix) }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                        <Maillot c1={etat.profil?.couleur1} c2={etat.profil?.couleur2} lettre={j.poste} taille={40} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 900, fontSize: '16px', lineHeight: 1.2, wordBreak: 'break-word' }}>{j.nom}</div>
                          <div style={{ fontSize: '13px', color: '#4b5563', marginTop: '2px' }}>{LIBELLE_POSTE[j.poste]}{j.club ? ' · ' + j.club : ''}</div>
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', marginTop: '8px' }}>
                            {badge(j.prix)}
                            <span style={{ fontWeight: 900, fontSize: '15px', color: '#065f46' }}>{montant(j.prix)}</span>
                            {estCap && <span style={{ background: VIOLET, color: '#fff', borderRadius: '999px', fontSize: '11px', fontWeight: 900, padding: '3px 10px', whiteSpace: 'nowrap' }}>CAPITAINE ×2</span>}
                          </div>
                        </div>
                      </div>
                      {ouverte && (
                        <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                          {!estCap && <button onClick={() => setCapitaine(j.id)} style={{ ...btnAction('#f3e8ff', VIOLET), flex: 1, minHeight: '44px' }}>Capitaine</button>}
                          <button onClick={() => retirer(j.id)} style={{ ...btnAction('#fef2f2', '#dc2626'), flex: 1, minHeight: '44px' }}>Retirer</button>
                        </div>
                      )}
                    </div>
                  );
                })}
                {!validation.ok && titulaires.length > 0 && <p style={{ fontSize: '12px', color: '#b91c1c', fontWeight: 700 }}>{validation.erreurs.join(' ')}</p>}
                {ouverte && <button onClick={enregistrer} disabled={envoi || !validation.ok} style={{ width: '100%', marginTop: '10px', padding: '14px', background: VIOLET, color: '#fff', border: 'none', borderRadius: '999px', fontWeight: 900, fontSize: '14px', cursor: 'pointer', opacity: envoi || !validation.ok ? 0.5 : 1 }}>💾 Enregistrer mon équipe de 7</button>}
                {etat.points.length > 0 && (
                  <div style={{ marginTop: '20px' }}>
                    <h3 style={{ fontSize: '15px', fontWeight: 900 }}>Mes points par journée</h3>
                    {etat.points.map((p, i) => <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: '#f9fafb', borderRadius: '8px', marginBottom: '4px', fontWeight: 700, fontSize: '13px' }}><span>{p.journee}</span><span style={{ color: VIOLET, fontWeight: 900 }}>{p.points} pts</span></div>)}
                  </div>
                )}
              </div>
            )}

            {onglet === 'marche' && (
              <div>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '12px' }}>
                  <button onClick={() => setFPoste('')} style={filtre(fPoste === '', VIOLET)}>Tous</button>
                  {POSTES.map(p => <button key={p} onClick={() => setFPoste(p)} style={filtre(fPoste === p, COULEUR_POSTE[p])}>{LIBELLE_POSTE[p]}</button>)}
                  <input value={recherche} onChange={e => setRecherche(e.target.value)} placeholder="Rechercher un joueur ou un club" aria-label="Rechercher" style={{ flex: '1 1 100%', minHeight: '44px', padding: '10px 12px', borderRadius: '12px', border: '2px solid #e5e7eb', fontSize: '15px', boxSizing: 'border-box' }} />
                </div>
                {joueurs.length === 0 && <p style={{ color: '#6b7280', textAlign: 'center', fontWeight: 700 }}>Les joueurs seront bientôt disponibles.</p>}
                {marche.map(j => {
                  const dedans = titulaires.includes(j.id);
                  return (
                    <div key={j.id} style={{ border: '2px solid ' + categorieJoueur(j.prix).bordure, borderLeft: '6px solid ' + COULEUR_POSTE[j.poste], borderRadius: '14px', padding: '12px', marginBottom: '10px', background: dedans ? '#faf5ff' : fondCarte(j.prix) }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                        <Maillot c1={COULEUR_POSTE[j.poste]} c2="#ffffff" lettre={j.poste} taille={40} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 900, fontSize: '16px', lineHeight: 1.2, wordBreak: 'break-word' }}>{j.nom}</div>
                          <div style={{ fontSize: '13px', color: '#4b5563', marginTop: '2px' }}>{LIBELLE_POSTE[j.poste]}{j.club ? ' · ' + j.club : ''}</div>
                          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap', marginTop: '8px' }}>
                            {badge(j.prix)}
                            <span style={{ fontWeight: 900, fontSize: '15px', color: '#065f46', whiteSpace: 'nowrap' }}>{montant(j.prix)}</span>
                          </div>
                        </div>
                      </div>
                      {dedans
                        ? <button onClick={() => retirer(j.id)} disabled={!ouverte} style={{ ...btnAction('#fef2f2', '#dc2626'), width: '100%', minHeight: '44px', marginTop: '10px', opacity: ouverte ? 1 : 0.5 }}>Retirer de mon équipe</button>
                        : <button onClick={() => ajouter(j.id)} disabled={!ouverte} style={{ ...btnAction(VIOLET, '#fff'), width: '100%', minHeight: '44px', marginTop: '10px', opacity: ouverte ? 1 : 0.5 }}>+ Ajouter à mon équipe</button>}
                    </div>
                  );
                })}
                {titulaires.length > 0 && <div style={{ position: 'sticky', bottom: '12px', marginTop: '12px' }}><button onClick={() => setOnglet('equipe')} style={{ width: '100%', minHeight: '52px', padding: '14px', background: SOMBRE, color: '#fff', border: 'none', borderRadius: '999px', fontWeight: 900, fontSize: '15px', cursor: 'pointer', boxShadow: '0 6px 20px rgba(0,0,0,0.25)' }}>Voir mon équipe ({titulaires.length}/{NB_JOUEURS_7}) et l'enregistrer →</button></div>}
              </div>
            )}

            {onglet === 'classement' && (
              <div>
                {!classement && <p style={{ textAlign: 'center', color: '#6b7280', fontWeight: 700 }}>Chargement…</p>}
                {classement && classement.moi && <div style={{ background: '#faf5ff', color: SOMBRE, borderRadius: '14px', padding: '12px 16px', fontSize: '13px', fontWeight: 800, marginBottom: '12px' }}>Ton rang : {classement.moi.rang} · {classement.moi.points} pts</div>}
                {classement && classement.classement.length === 0 && <p style={{ textAlign: 'center', color: '#6b7280', fontWeight: 700 }}>Le classement apparaîtra après la première journée.</p>}
                {classement && classement.classement.map(l => (
                  <div key={l.rang} style={{ display: 'flex', gap: '10px', padding: '10px 12px', background: l.rang <= 3 ? '#fffbeb' : '#f9fafb', borderRadius: '10px', marginBottom: '4px', fontWeight: 800, fontSize: '13px' }}>
                    <span style={{ width: '28px' }}>{l.rang}</span><span style={{ flex: 1 }}><span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '50%', background: l.couleur || VIOLET, marginRight: '6px' }} />{l.embleme || '⚽'} {l.nom}</span><span style={{ color: VIOLET }}>{l.points} pts</span>
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

const btnAction = (fond: string, couleur: string) => ({ padding: '10px 14px', borderRadius: '999px', border: 'none', background: fond, color: couleur, fontWeight: 900, fontSize: '14px', cursor: 'pointer', whiteSpace: 'nowrap' } as const);
const filtre = (actif: boolean, c: string) => ({ padding: '10px 16px', minHeight: '44px', borderRadius: '999px', border: '2px solid ' + c, background: actif ? c : '#fff', color: actif ? '#fff' : c, fontWeight: 800, fontSize: '12px', cursor: 'pointer' } as const);
