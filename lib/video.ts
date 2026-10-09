// Génération de vidéos MakeGoal (1080x1920) pour TOUS les types de posts.
// Tout se fait dans le navigateur : canvas + MediaRecorder, aucun serveur.
// Principe : un post est converti en "scènes" génériques (intro, lignes, score,
// texte), puis un seul moteur les dessine avec le même style (violet, projecteurs,
// bande orange, pelouse). Ajouter un type de post = ajouter un cas dans construireScenes.

import { groupesPourPeriode, periodeAvecAdversaire, libellePeriode, Periode } from './statsJoueur';
import { ligneContexte, DistinctionDetails } from './distinctions';
import { drapeau, OnzeJoueur, OnzeDetails } from './formations';
import { EliminationDetails, Rencontre, qualifie, aScore, detailScore } from './elimination';

// ---------- Données d'entrée (compatible avec le type Article de l'admin) ----------
export type VideoPost = {
  titre: string;
  sport?: string | null;
  ligue?: string | null;
  pays1?: string | null; pays2?: string | null;
  equipe1?: string | null; equipe2?: string | null;
  score1?: number | null; score2?: number | null;
  statut_match?: string | null; heure_match?: string | null; stade?: string | null;
  distinction_type?: string | null; laureat?: string | null; distinction_note?: string | null;
  distinction_stats?: string | null; distinction_details?: DistinctionDetails | null;
  formation?: string | null; onze?: OnzeJoueur[] | null; onze_details?: OnzeDetails | null;
  classement_type?: string | null; classement_titre?: string | null;
  classement?: { pos: string; nom: string; extra: string; diff: string; pays: string; val: string }[] | null;
  matchs_jour?: { equipe1: string; equipe2: string; date_match: string; score1: number | null; score2: number | null }[] | null;
  resultat_details?: { buts: { equipe: string; joueur: string; minute: string; passeur: string }[]; rouges: { joueur: string; minute: string }[]; jaunes: { joueur: string; minute: string }[] } | null;
  quarts_temps?: { quart: string; score1: string; score2: string }[] | null;
  parcours?: { equipe: string; competition: string; poule: string; adversaires: { nom: string; date: string; label: string; scoreEquipe: string; scoreAdversaire: string }[] } | null;
  declaration?: { nom: string; fonction: string; citation: string; contexte: string; pays?: string } | null;
  invitation_concours?: { titreConcours: string; lots: string; slogan: string; matchs: { equipe1: string; equipe2: string }[] } | null;
  gagnants?: { titreTirage: string; gagnants: { nom: string; prix: string }[] } | null;
  stats_joueur?: { mode: string; poste: string; nbMatchs: string | null; periode?: Periode | null; joueurs: { nom: string; equipe: string; adversaire: string; photo?: string; pays?: string; valeurs: Record<string, string> }[] } | null;
  elimination?: EliminationDetails | null;
  extrait?: string | null;
};

// ---------- Scènes ----------
type Ligne = { label: string; valeur: string; valeur2?: string };
type Duo = { nom: string; sous?: string; photo?: string; initiale: string };
type Enseigne = { nom: string; sous?: string; photo?: string; initiale?: string; icone?: string; duo?: [Duo, Duo] };

type Scene =
  | { k: 'intro'; badge: string; fond: string; titre: string; sous?: string; pill?: string; photo?: string; initiale?: string; icone?: string; duo?: [Duo, Duo]; duree: number }
  | { k: 'lignes'; badge: string; fond: string; titre?: string; entete?: Enseigne; lignes: Ligne[]; duree: number }
  | { k: 'score'; badge: string; fond: string; e1: string; e2: string; s1: number | null; s2: number | null; d1?: string; d2?: string; infos: string[]; duree: number }
  | { k: 'duels'; badge: string; fond: string; titre?: string; rencontres: Rencontre[]; duree: number }
  | { k: 'texte'; badge: string; fond: string; texte: string; auteur?: string; sous?: string; duree: number };

const LARGEUR = 1080, HAUTEUR = 1920;
const POLICE = '"Arial Black", Impact, "Helvetica Neue", Arial, sans-serif';

const majuscule = (s: string) => (s || '').toUpperCase();
const avecDrapeau = (pays: string | undefined | null, texte: string) => {
  const d = pays ? drapeau(pays) : '';
  return d && d !== '🏳️' ? (texte ? d + '  ' + texte : d) : texte;
};

function pagesDeLignes(lignes: Ligne[], parPage: number): Ligne[][] {
  // Pages équilibrées (ex: 6 lignes -> 3 + 3, jamais 5 + 1).
  const nbPages = Math.max(1, Math.ceil(lignes.length / parPage));
  const taille = Math.ceil(lignes.length / nbPages);
  const pages: Ligne[][] = [];
  for (let i = 0; i < lignes.length; i += taille) pages.push(lignes.slice(i, i + taille));
  return pages;
}
const dureeLignes = (n: number) => 0.9 + n * 0.5 + 2.2;
const PAR_PAGE_ENTETE = 5;
const PAR_PAGE_LISTE = 7;

export function typeVideo(p: VideoPost): string {
  if (p.stats_joueur?.joueurs?.length) return 'Stats joueur';
  if (p.distinction_type) return 'Distinction';
  if (p.formation && p.onze?.length) return 'Équipe type';
  if (p.classement_type && p.classement?.length) return 'Classement';
  if (p.gagnants?.gagnants?.length) return 'Gagnants';
  if (p.declaration?.citation) return 'Déclaration';
  if (p.parcours?.adversaires?.length) return 'Parcours';
  if (p.elimination?.rencontres?.length) return 'Élimination directe';
  if (p.matchs_jour?.length) return 'Matchs du jour';
  if (p.invitation_concours?.matchs?.length) return 'Invitation concours';
  if (p.quarts_temps?.length || p.resultat_details?.buts?.length || p.resultat_details?.rouges?.length || p.resultat_details?.jaunes?.length || (p.equipe1 && p.equipe2 && p.score1 != null && p.score2 != null)) return 'Résultat';
  if (p.equipe1 && p.equipe2) return 'Match';
  return 'Post';
}

export function construireScenes(p: VideoPost): Scene[] {
  const scenes: Scene[] = [];
  const type = typeVideo(p);

  if (type === 'Stats joueur') {
    const st = p.stats_joueur!;
    const periode = libellePeriode(st.periode, st.nbMatchs);
    const avecAdv = periodeAvecAdversaire(st.periode?.type);
    const groupes = groupesPourPeriode(p.sport, st.poste, st.periode?.type);
    const lignesDe = (j: typeof st.joueurs[number]): Ligne[] =>
      groupes.flatMap(g => g.champs)
        .filter(c => j.valeurs?.[c.cle] && String(j.valeurs[c.cle]).trim())
        .map(c => ({ label: c.label, valeur: String(j.valeurs[c.cle]).trim() }));
    const initiale = (n: string) => (n.trim()[0] || '?').toUpperCase();
    if (st.mode === 'comparaison' && st.joueurs.length >= 2) {
      const [a, b] = st.joueurs;
      const duo: [Duo, Duo] = [
        { nom: a.nom, sous: avecDrapeau(a.pays, a.equipe), photo: a.photo, initiale: initiale(a.nom) },
        { nom: b.nom, sous: avecDrapeau(b.pays, b.equipe), photo: b.photo, initiale: initiale(b.nom) },
      ];
      scenes.push({ k: 'intro', badge: 'COMPARAISON', fond: 'VS', titre: '', pill: periode || undefined, duo, duree: 3.4 });
      const cles = groupes.flatMap(g => g.champs).filter(c => (a.valeurs?.[c.cle] || '').trim() || (b.valeurs?.[c.cle] || '').trim());
      const lignes: Ligne[] = cles.map(c => ({ label: c.label, valeur: (a.valeurs?.[c.cle] || '-').trim() || '-', valeur2: (b.valeurs?.[c.cle] || '-').trim() || '-' }));
      pagesDeLignes(lignes, PAR_PAGE_ENTETE).forEach(pg => scenes.push({
        k: 'lignes', badge: 'COMPARAISON', fond: 'STATS',
        entete: { nom: '', sous: periode || undefined, duo },
        lignes: pg, duree: dureeLignes(pg.length),
      }));
    } else {
      st.joueurs.forEach(j => {
        const sous = [j.equipe, avecAdv && j.adversaire ? 'face à ' + j.adversaire : ''].filter(Boolean).join('  •  ');
        scenes.push({ k: 'intro', badge: 'STATS JOUEUR', fond: 'GOAL', titre: j.nom, sous: avecDrapeau(j.pays, j.equipe), pill: avecAdv && j.adversaire ? 'FACE À ' + majuscule(j.adversaire) : (periode || undefined), photo: j.photo, initiale: initiale(j.nom), duree: 3.2 });
        pagesDeLignes(lignesDe(j), PAR_PAGE_ENTETE).forEach(pg => scenes.push({
          k: 'lignes', badge: 'STATS JOUEUR', fond: 'STATS',
          entete: { nom: j.nom, sous: avecDrapeau(j.pays, periode || sous), photo: j.photo, initiale: initiale(j.nom) },
          lignes: pg, duree: dureeLignes(pg.length),
        }));
      });
    }
  } else if (type === 'Distinction') {
    const cat = p.distinction_type || 'Distinction';
    const ctx = ligneContexte(p.distinction_details, p.laureat);
    scenes.push({ k: 'intro', badge: majuscule(cat), fond: 'MVP', titre: p.laureat || '', sous: avecDrapeau(p.distinction_details?.pays, ctx) || undefined, pill: p.distinction_details?.periode || undefined, photo: p.distinction_details?.photo || undefined, initiale: ((p.laureat || '?').trim()[0] || '?').toUpperCase(), icone: '🏆', duree: 4 });
    const texte = [p.distinction_stats, p.distinction_note].filter(Boolean).join('\n');
    if (texte) scenes.push({ k: 'texte', badge: majuscule(cat), fond: 'MVP', texte, sous: p.laureat || undefined, duree: 5 });
  } else if (type === 'Équipe type') {
    const d = p.onze_details;
    const joueurs = (p.onze || []).filter(j => j.nom);
    const lignes: Ligne[] = joueurs.map((j, i) => ({ label: (i + 1) + '. ' + j.nom, valeur: drapeau(j.pays || j.equipe || '') !== '🏳️' ? drapeau(j.pays || j.equipe) : (j.equipe || '') }));
    const badge = majuscule(d?.categorie || 'ÉQUIPE TYPE');
    scenes.push({ k: 'intro', badge, fond: 'XI', titre: d?.competition || 'Équipe type', sous: p.formation || undefined, pill: d?.periode || undefined, icone: '⭐', duree: 3.2 });
    pagesDeLignes(lignes, PAR_PAGE_LISTE).forEach(pg => scenes.push({ k: 'lignes', badge, fond: 'XI', titre: d?.competition || undefined, lignes: pg, duree: dureeLignes(pg.length) }));
  } else if (type === 'Classement') {
    const lignes: Ligne[] = (p.classement || []).slice(0, 10).map(l => ({ label: l.pos + '. ' + l.nom, valeur: (l.val || l.extra || '').toString() }));
    const titre = p.classement_titre || p.titre;
    scenes.push({ k: 'intro', badge: 'CLASSEMENT', fond: 'TOP', titre, icone: '📊', duree: 3 });
    pagesDeLignes(lignes, PAR_PAGE_LISTE).forEach(pg => scenes.push({ k: 'lignes', badge: 'CLASSEMENT', fond: 'TOP', titre, lignes: pg, duree: dureeLignes(pg.length) }));
  } else if (type === 'Gagnants') {
    const g = p.gagnants!;
    scenes.push({ k: 'intro', badge: 'GAGNANTS', fond: 'WIN', titre: g.titreTirage || 'Tirage', icone: '🎁', duree: 3 });
    pagesDeLignes(g.gagnants.map(x => ({ label: x.nom, valeur: x.prix })), PAR_PAGE_LISTE).forEach(pg => scenes.push({ k: 'lignes', badge: 'GAGNANTS', fond: 'WIN', titre: g.titreTirage, lignes: pg, duree: dureeLignes(pg.length) }));
  } else if (type === 'Déclaration') {
    const d = p.declaration!;
    scenes.push({ k: 'texte', badge: 'DÉCLARATION', fond: 'WORD', texte: '« ' + d.citation + ' »', auteur: d.nom, sous: avecDrapeau(d.pays, [d.fonction, d.contexte].filter(Boolean).join('  •  ')) || undefined, duree: Math.min(10, 4 + d.citation.length / 40) });
  } else if (type === 'Parcours') {
    const pc = p.parcours!;
    const sous = [pc.competition, pc.poule].filter(Boolean).join('  •  ');
    scenes.push({ k: 'intro', badge: 'PARCOURS', fond: 'ROAD', titre: pc.equipe, sous: sous || undefined, icone: '🛣️', duree: 3 });
    const lignes: Ligne[] = pc.adversaires.map(a => ({ label: (a.label ? a.label + ' · ' : '') + a.nom, valeur: a.scoreEquipe !== '' && a.scoreAdversaire !== '' ? a.scoreEquipe + '-' + a.scoreAdversaire : (a.date || 'À venir') }));
    pagesDeLignes(lignes, PAR_PAGE_LISTE).forEach(pg => scenes.push({ k: 'lignes', badge: 'PARCOURS', fond: 'ROAD', titre: pc.equipe, lignes: pg, duree: dureeLignes(pg.length) }));
  } else if (type === 'Élimination directe') {
    const e = p.elimination!;
    const titre = [e.tour, e.competition].filter(Boolean).join('  •  ');
    scenes.push({ k: 'intro', badge: 'ÉLIMINATION DIRECTE', fond: 'KO', titre: e.tour || 'Élimination directe', sous: e.competition || undefined, icone: '⚔️', duree: 3 });
    for (let i = 0; i < e.rencontres.length; i += 4) {
      const pg = e.rencontres.slice(i, i + 4);
      scenes.push({ k: 'duels', badge: 'ÉLIMINATION DIRECTE', fond: 'KO', titre: titre || undefined, rencontres: pg, duree: 0.9 + pg.length * 0.9 + 2 });
    }
  } else if (type === 'Matchs du jour') {
    const lignes: Ligne[] = (p.matchs_jour || []).map(m => ({ label: m.equipe1 + ' vs ' + m.equipe2, valeur: m.score1 != null && m.score2 != null ? m.score1 + '-' + m.score2 : (m.date_match ? new Date(m.date_match).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : 'VS') }));
    scenes.push({ k: 'intro', badge: 'MATCHS DU JOUR', fond: 'LIVE', titre: p.titre, icone: '📅', duree: 3 });
    pagesDeLignes(lignes, PAR_PAGE_LISTE).forEach(pg => scenes.push({ k: 'lignes', badge: 'MATCHS DU JOUR', fond: 'LIVE', titre: 'Au programme', lignes: pg, duree: dureeLignes(pg.length) }));
  } else if (type === 'Invitation concours') {
    const ic = p.invitation_concours!;
    scenes.push({ k: 'intro', badge: 'CONCOURS', fond: 'WIN', titre: ic.titreConcours || p.titre, sous: ic.lots || undefined, pill: ic.slogan || undefined, icone: '🎁', duree: 3.5 });
    pagesDeLignes(ic.matchs.map(m => ({ label: m.equipe1 + ' vs ' + m.equipe2, valeur: 'VS' })), PAR_PAGE_LISTE).forEach(pg => scenes.push({ k: 'lignes', badge: 'CONCOURS', fond: 'WIN', titre: ic.titreConcours, lignes: pg, duree: dureeLignes(pg.length) }));
  } else if (type === 'Résultat' || type === 'Match') {
    const fini = type === 'Résultat';
    const infos = [p.ligue, p.statut_match, p.heure_match ? '🕐 ' + p.heure_match : '', p.stade ? '📍 ' + p.stade : ''].filter((x): x is string => !!x);
    const badge = fini ? 'RÉSULTAT' : 'MATCH À VENIR';
    scenes.push({ k: 'score', badge, fond: fini ? 'FINAL' : 'VS', e1: p.equipe1 || '', e2: p.equipe2 || '', s1: fini ? (p.score1 ?? null) : null, s2: fini ? (p.score2 ?? null) : null, d1: p.pays1 ? drapeau(p.pays1) : undefined, d2: p.pays2 ? drapeau(p.pays2) : undefined, infos, duree: 5 });
    const rd = p.resultat_details;
    if (fini && rd) {
      const lignes: Ligne[] = [
        ...rd.buts.map(b => ({ label: (b.minute ? b.minute + "' " : '') + b.joueur + (b.passeur ? ' (' + b.passeur + ')' : ''), valeur: '⚽' })),
        ...rd.jaunes.map(c => ({ label: (c.minute ? c.minute + "' " : '') + c.joueur, valeur: '🟨' })),
        ...rd.rouges.map(c => ({ label: (c.minute ? c.minute + "' " : '') + c.joueur, valeur: '🟥' })),
      ];
      pagesDeLignes(lignes, PAR_PAGE_LISTE).forEach(pg => scenes.push({ k: 'lignes', badge: badge, fond: 'FINAL', titre: (p.equipe1 || '') + ' ' + (p.score1 ?? '') + '-' + (p.score2 ?? '') + ' ' + (p.equipe2 || ''), lignes: pg, duree: dureeLignes(pg.length) }));
    }
    if (fini && p.quarts_temps?.length) {
      const lignes: Ligne[] = p.quarts_temps.map(q => ({ label: q.quart, valeur: q.score1 + '-' + q.score2 }));
      scenes.push({ k: 'lignes', badge, fond: 'FINAL', titre: (p.equipe1 || '') + ' vs ' + (p.equipe2 || ''), lignes, duree: dureeLignes(lignes.length) });
    }
  } else {
    scenes.push({ k: 'intro', badge: 'MAKEGOAL', fond: 'GOAL', titre: p.titre, sous: p.extrait || undefined, icone: '⚽', duree: 4 });
  }
  return scenes.map(ajusterLecture);
}

// Temps de lecture : chaque écran dure au moins le temps de lire son texte
// (animation d'entrée ~1 s + ~3 mots par seconde + 1,5 s de pause à la fin).
const VITESSE_FRAPPE = 45; // caractères par seconde
const motsDe = (t: string | undefined) => (t || '').split(/\s+/).filter(Boolean).length;
function ajusterLecture(s: Scene): Scene {
  let mots = 0, plancher = 0;
  if (s.k === 'texte') {
    // frappe complète, puis le texte reste affiché assez longtemps pour être relu en entier
    const frappe = Math.max(1, s.texte.length / VITESSE_FRAPPE);
    const relecture = 2 + (motsDe(s.texte) + motsDe(s.auteur) + motsDe(s.sous)) / 2.8;
    const total = 0.3 + frappe + relecture + 1.5;
    return s.duree >= total ? s : { ...s, duree: Math.min(40, total) };
  }
  else if (s.k === 'intro') mots = motsDe(s.titre) + motsDe(s.sous) + motsDe(s.pill);
  else if (s.k === 'lignes') mots = s.lignes.reduce((n, l) => n + motsDe(l.label) * 0.5 + 1, 0);
  else return s;
  const lecture = Math.max(plancher, 1 + mots / 3 + 1.5);
  return s.duree >= lecture ? s : { ...s, duree: Math.min(30, lecture) };
}

// ---------- Utilitaires de dessin ----------
type Ctx = CanvasRenderingContext2D;
const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const easeOut = (x: number) => 1 - Math.pow(1 - clamp(x), 3);
const easeBack = (x: number) => { const t = clamp(x); const c = 1.70158; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };

function texteIncline(ctx: Ctx, txt: string, x: number, y: number, taille: number, couleur: string, align: CanvasTextAlign = 'center', ombre?: string, maxLarg?: number) {
  let t = taille;
  ctx.font = `italic 900 ${t}px ${POLICE}`;
  if (maxLarg) while (ctx.measureText(txt).width > maxLarg && t > 18) { t -= 2; ctx.font = `italic 900 ${t}px ${POLICE}`; }
  ctx.save();
  ctx.translate(x, y);
  ctx.transform(1, 0, -0.16, 1, 0, 0);
  ctx.textAlign = align; ctx.textBaseline = 'middle';
  if (ombre) { ctx.fillStyle = ombre; ctx.fillText(txt, 0, t * 0.07); ctx.fillText(txt, 0, t * 0.05); }
  ctx.fillStyle = couleur;
  ctx.fillText(txt, 0, 0);
  ctx.restore();
}

function coupeLignes(ctx: Ctx, txt: string, maxLarg: number): string[] {
  const res: string[] = [];
  for (const para of txt.split('\n')) {
    let cur = '';
    for (const mot of para.split(/\s+/).filter(Boolean)) {
      const test = cur ? cur + ' ' + mot : mot;
      if (ctx.measureText(test).width > maxLarg && cur) { res.push(cur); cur = mot; } else cur = test;
    }
    res.push(cur);
  }
  return res;
}

function pill(ctx: Ctx, txt: string, cx: number, cy: number, taille: number, fond: string, couleur: string, maxLarg = 940) {
  let t = taille;
  ctx.font = `italic 900 ${t}px ${POLICE}`;
  while (ctx.measureText(txt).width > maxLarg - 90 && t > 18) { t -= 2; ctx.font = `italic 900 ${t}px ${POLICE}`; }
  const w = ctx.measureText(txt).width + 90, h = t * 1.9;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.transform(1, 0, -0.18, 1, 0, 0);
  ctx.fillStyle = fond;
  ctx.fillRect(-w / 2, -h / 2, w, h);
  ctx.fillStyle = couleur; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(txt, 0, 2);
  ctx.restore();
}

function fondStatique(): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = LARGEUR; c.height = HAUTEUR;
  const ctx = c.getContext('2d')!;
  const g = ctx.createLinearGradient(300, 0, 780, HAUTEUR);
  g.addColorStop(0, '#8a00ff'); g.addColorStop(0.35, '#5b0fd6'); g.addColorStop(0.7, '#1a0a6b'); g.addColorStop(1, '#07053a');
  ctx.fillStyle = g; ctx.fillRect(0, 0, LARGEUR, HAUTEUR);
  const r = ctx.createRadialGradient(540, 560, 0, 540, 560, 640);
  r.addColorStop(0, 'rgba(255,255,255,0.5)'); r.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = r; ctx.fillRect(0, 0, LARGEUR, HAUTEUR);
  // trame de points (haut de l'écran)
  ctx.fillStyle = 'rgba(255,255,255,0.15)';
  for (let y = 16; y < 1100; y += 32) for (let x = 16; x < LARGEUR; x += 32) { ctx.globalAlpha = 1 - y / 1100; ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI * 2); ctx.fill(); }
  ctx.globalAlpha = 1;
  // pelouse en perspective
  const top = 1690;
  const ombre = ctx.createLinearGradient(0, top - 120, 0, top);
  ombre.addColorStop(0, 'rgba(0,0,0,0)'); ombre.addColorStop(1, 'rgba(0,0,0,0.45)');
  ctx.fillStyle = ombre; ctx.fillRect(0, top - 120, LARGEUR, 120);
  const n = 10;
  for (let i = 0; i < n; i++) {
    const xb0 = -900 + (i * (LARGEUR + 1800)) / n, xb1 = -900 + ((i + 1) * (LARGEUR + 1800)) / n;
    const xt0 = 540 + (xb0 - 540) * 0.35, xt1 = 540 + (xb1 - 540) * 0.35;
    ctx.fillStyle = i % 2 ? '#12a147' : '#0f8a3c';
    ctx.beginPath(); ctx.moveTo(xt0, top); ctx.lineTo(xt1, top); ctx.lineTo(xb1, HAUTEUR); ctx.lineTo(xb0, HAUTEUR); ctx.closePath(); ctx.fill();
  }
  ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.fillRect(0, top, LARGEUR, 4);
  return c;
}

function dessinerFond(ctx: Ctx, statique: HTMLCanvasElement, t: number, fond: string, bandeY: number | null, local: number) {
  ctx.drawImage(statique, 0, 0);
  // projecteurs
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  const faisceaux = [{ x: 220, a: -0.3 + Math.sin(t * 0.9) * 0.08 }, { x: 860, a: 0.3 + Math.cos(t * 0.8) * 0.08 }];
  for (const f of faisceaux) {
    for (const [larg, alpha] of [[380, 0.12], [260, 0.18], [140, 0.28]] as const) {
      ctx.save();
      ctx.translate(f.x, -80); ctx.rotate(f.a);
      const gr = ctx.createLinearGradient(0, 0, 0, 1700);
      gr.addColorStop(0, `rgba(255,255,255,${alpha * 2})`); gr.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = gr;
      ctx.beginPath(); ctx.moveTo(-larg / 4, 0); ctx.lineTo(larg / 4, 0); ctx.lineTo(larg, 1700); ctx.lineTo(-larg, 1700); ctx.closePath(); ctx.fill();
      ctx.restore();
    }
  }
  ctx.restore();
  // gros texte en contour
  ctx.save();
  ctx.font = `italic 900 440px ${POLICE}`;
  ctx.strokeStyle = 'rgba(255,255,255,0.22)'; ctx.lineWidth = 5;
  ctx.textBaseline = 'alphabetic';
  ctx.translate(-60 - ((t * 25) % 200), 520);
  ctx.transform(1, 0, -0.16, 1, 0, 0);
  ctx.strokeText(fond, 0, 0);
  ctx.restore();
  // bande orange
  if (bandeY !== null) {
    ctx.save();
    ctx.translate(540, bandeY);
    ctx.rotate(-0.245);
    const dx = (1 - easeOut(local / 0.6)) * 1800;
    const go = ctx.createLinearGradient(-900, 0, 900, 0);
    go.addColorStop(0, '#ff7a00'); go.addColorStop(1, '#ffb300');
    ctx.shadowColor = 'rgba(0,0,0,0.4)'; ctx.shadowBlur = 40; ctx.shadowOffsetY = 12;
    ctx.fillStyle = go;
    ctx.fillRect(-900 + dx, -95, 1800, 190);
    ctx.restore();
  }
  // barre du bas
  const bar = ctx.createLinearGradient(0, 0, LARGEUR, 0);
  bar.addColorStop(0, '#bf00ff'); bar.addColorStop(1, '#ff7a00');
  ctx.fillStyle = bar; ctx.fillRect(0, HAUTEUR - 22, LARGEUR, 22);
}

function dessinerEntete(ctx: Ctx, badge: string, a: number) {
  ctx.save(); ctx.globalAlpha = a;
  ctx.font = `italic 900 40px ${POLICE}`;
  let t = 40;
  while (ctx.measureText(badge).width > 560 && t > 22) { t -= 2; ctx.font = `italic 900 ${t}px ${POLICE}`; }
  const w = ctx.measureText(badge).width + 80;
  ctx.save(); ctx.translate(68, 110); ctx.transform(1, 0, -0.2, 1, 0, 0);
  ctx.fillStyle = '#bf00ff'; ctx.fillRect(0, -42, w, 84);
  ctx.fillStyle = '#fff'; ctx.textBaseline = 'middle'; ctx.fillText(badge, 40, 2);
  ctx.restore();
  ctx.font = `italic 900 42px ${POLICE}`; ctx.fillStyle = '#fff'; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
  ctx.fillText('MAKEGOAL', 1012, 112);
  ctx.restore();
}

type Images = Map<string, HTMLImageElement | null>;

// Cadre photo moderne : plaque inclinée (parallélogramme) avec décalage orange,
// filet blanc et photo en plein cadre. Sans photo : initiale sur plaque violette.
// "r" = demi-hauteur de référence (même usage que l'ancien halo).
function halo(ctx: Ctx, cx: number, cy: number, r: number, t: number, photo: string | undefined, initiale: string | undefined, icone: string | undefined, images: Images, echelle: number) {
  const w = r * 1.7, h = r * 2.1;
  const SK = -0.16;
  ctx.save();
  ctx.translate(cx, cy); ctx.scale(Math.max(0.01, echelle), Math.max(0.01, echelle));
  const base = ctx.getTransform();
  const plaque = (dx: number, dy: number, gw: number, gh: number) => {
    ctx.setTransform(base); ctx.transform(1, 0, SK, 1, dx, dy);
    ctx.beginPath(); ctx.rect(-gw / 2, -gh / 2, gw, gh);
  };
  // décalage orange + ombre
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 40; ctx.shadowOffsetY = 14;
  plaque(r * 0.1, r * 0.1, w, h);
  ctx.fillStyle = '#ff7a00'; ctx.fill();
  ctx.restore();
  // fond violet
  plaque(0, 0, w, h);
  ctx.fillStyle = '#3b1a8a'; ctx.fill();
  const img = photo ? images.get(photo) : null;
  if (img) {
    ctx.save();
    plaque(0, 0, w, h);
    ctx.setTransform(base);
    ctx.clip();
    const s = Math.max(w / img.width, h / img.height);
    ctx.drawImage(img, -img.width * s / 2, -img.height * s / 2, img.width * s, img.height * s);
    ctx.restore();
  } else {
    ctx.save();
    ctx.setTransform(base);
    ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    if (icone && !initiale) { ctx.font = `${r * 0.9}px ${POLICE}`; ctx.fillText(icone, 0, r * 0.05); }
    else { ctx.font = `italic 900 ${r * 0.95}px ${POLICE}`; ctx.fillText(initiale || icone || '', 0, r * 0.05); }
    ctx.restore();
  }
  // filet blanc
  plaque(0, 0, w, h);
  ctx.lineWidth = 6; ctx.strokeStyle = '#fff'; ctx.stroke();
  ctx.restore();
}

function valeurAnimee(v: string, p: number): string {
  const m = v.match(/^(\d+(?:[.,]\d+)?)(.*)$/);
  if (!m) return v;
  const cible = parseFloat(m[1].replace(',', '.'));
  if (!isFinite(cible) || !/^\d+$/.test(m[1])) return v;
  return Math.round(cible * easeOut(p)) + m[2];
}

const num0 = (v: string) => (/^\d+$/.test((v || '').trim()) ? parseInt(v.trim(), 10) : 0);

// ---------- Dessin d'une scène ----------
function dessinerScene(ctx: Ctx, s: Scene, t: number, images: Images) {
  const entree = clamp(t / 0.35);
  const sortie = clamp((s.duree - t) / 0.3);
  const alpha = Math.min(entree, sortie);
  ctx.save();
  ctx.globalAlpha = alpha;

  if (s.k === 'intro' && s.duo) {
    s.duo.forEach((d, i) => {
      const x = i === 0 ? 270 : 810;
      const dx = (1 - easeOut((t - 0.1) / 0.5)) * (i === 0 ? -600 : 600);
      halo(ctx, x + dx, 480, 190, t, d.photo, d.initiale, undefined, images, easeBack((t - 0.1) / 0.6));
      ctx.font = `italic 900 60px ${POLICE}`;
      const lg = coupeLignes(ctx, majuscule(d.nom), 500).slice(0, 2);
      lg.forEach((l, k) => texteIncline(ctx, l, x + dx, 760 + k * 62, 58, '#fff', 'center', '#ff7a00', 500));
      if (d.sous) texteIncline(ctx, majuscule(d.sous), x + dx, 760 + lg.length * 62 + 20, 34, '#e9d5ff', 'center', undefined, 480);
    });
    const pv = easeBack((t - 0.5) / 0.5);
    ctx.save(); ctx.translate(540, 480); ctx.scale(Math.max(0.01, pv), Math.max(0.01, pv));
    texteIncline(ctx, 'VS', 0, 0, 120, '#fff', 'center', '#bf00ff', 200);
    ctx.restore();
    if (s.pill) { ctx.globalAlpha = alpha * easeOut((t - 1.0) / 0.4); pill(ctx, s.pill, 540, 1330, 44, '#fff', '#111'); }
  }

  else if (s.k === 'intro') {
    const aHalo = !!(s.photo || s.initiale || s.icone);
    let y = aHalo ? 1010 : 640;
    if (aHalo) halo(ctx, 540, 590, 280, t, s.photo, s.initiale, s.icone, images, easeBack(t / 0.7));
    ctx.font = `italic 900 120px ${POLICE}`;
    const lignes = coupeLignes(ctx, majuscule(s.titre), 900).slice(0, 4);
    const taille = lignes.length > 2 ? 84 : lignes.length > 1 ? 104 : 124;
    lignes.forEach((l, i) => {
      const dx = (1 - easeOut((t - 0.25 - i * 0.12) / 0.5)) * 500;
      texteIncline(ctx, l, 540 + dx, y + i * taille * 1.02, taille, '#fff', 'center', '#ff7a00', 960);
    });
    y += lignes.length * taille * 1.02 + 40;
    if (s.sous) { ctx.globalAlpha = alpha * easeOut((t - 0.7) / 0.4); texteIncline(ctx, majuscule(s.sous), 540, y, 48, '#e9d5ff', 'center', undefined, 960); y += 100; }
    if (s.pill) { ctx.globalAlpha = alpha * easeOut((t - 0.95) / 0.4); pill(ctx, s.pill, 540, y + 20, 44, '#fff', '#111'); }
  }

  else if (s.k === 'lignes') {
    let y0: number, pas: number, h: number;
    if (s.entete) {
      const e = s.entete;
      if (e.duo) {
        e.duo.forEach((d, i) => {
          const x = i === 0 ? 270 : 810;
          halo(ctx, x, 290, 105, t, d.photo, d.initiale, undefined, images, easeBack(t / 0.6));
          ctx.font = `italic 900 50px ${POLICE}`;
          const lg = coupeLignes(ctx, majuscule(d.nom), 480).slice(0, 2);
          const ts = lg.length > 1 ? 44 : 54;
          lg.forEach((l, k) => texteIncline(ctx, l, x, 470 + k * ts * 1.05, ts, '#fff', 'center', '#ff7a00', 490));
          if (d.sous) texteIncline(ctx, majuscule(d.sous), x, 470 + lg.length * ts * 1.05 + 14, 30, '#e9d5ff', 'center', undefined, 470);
        });
        texteIncline(ctx, 'VS', 540, 290, 80, '#fff', 'center', '#bf00ff', 150);
        if (e.sous) texteIncline(ctx, majuscule(e.sous), 540, 385, 26, '#fde68a', 'center', undefined, 300);
        y0 = 700; pas = 164; h = 136;
      } else {
        halo(ctx, 540, 340, 130, t, e.photo, e.initiale, e.icone, images, easeBack(t / 0.6));
        texteIncline(ctx, majuscule(e.nom), 540, 560, 72, '#fff', 'center', '#ff7a00', 940);
        if (e.sous) texteIncline(ctx, majuscule(e.sous), 540, 636, 36, '#fff', 'center', '#2e1065', 940);
        y0 = 760; pas = 164; h = 136;
      }
    } else {
      if (s.titre) texteIncline(ctx, majuscule(s.titre), 540, 330, 72, '#fff', 'center', '#ff7a00', 940);
      y0 = 470; pas = 164; h = 136;
    }
    s.lignes.forEach((l, i) => {
      const tr = t - 0.5 - i * 0.5;
      if (tr < 0) return;
      const p = easeBack(tr / 0.45);
      const cy = y0 + i * pas + h / 2;
      ctx.save();
      ctx.globalAlpha = alpha * clamp(tr / 0.2);
      ctx.translate((1 - Math.min(1, p)) * -700, 0);
      ctx.save();
      ctx.translate(540, cy); ctx.transform(1, 0, -0.1, 1, 0, 0);
      ctx.fillStyle = 'rgba(5,5,40,0.7)'; ctx.fillRect(-490, -h / 2, 980, h);
      ctx.fillStyle = '#ff7a00'; ctx.fillRect(-490, -h / 2, 16, h);
      ctx.restore();
      if (l.valeur2 !== undefined) {
        ctx.font = `italic 900 30px ${POLICE}`;
        texteIncline(ctx, majuscule(l.label), 540, cy - 40, 30, '#e9d5ff', 'center', undefined, 560);
        texteIncline(ctx, valeurAnimee(l.valeur, (tr - 0.1) / 0.6), 200, cy + 8, 92, '#fff', 'center', '#bf00ff', 280);
        texteIncline(ctx, valeurAnimee(l.valeur2, (tr - 0.1) / 0.6), 880, cy + 8, 92, '#fff', 'center', '#bf00ff', 280);
      } else {
        const largValeur = Math.min(360, Math.max(160, (l.valeur.length) * 52));
        texteIncline(ctx, majuscule(l.label), 100, cy, 46, '#e9d5ff', 'left', undefined, 940 - largValeur - 30);
        texteIncline(ctx, valeurAnimee(l.valeur, (tr - 0.1) / 0.6), 990, cy, 96, '#fff', 'right', '#bf00ff', largValeur);
      }
      ctx.restore();
    });
  }

  else if (s.k === 'duels') {
    if (s.titre) texteIncline(ctx, majuscule(s.titre), 540, 290, 46, '#fff', 'center', '#ff7a00', 960);
    const H = 300, PAS = 345, Y0 = 390;
    s.rencontres.forEach((r, i) => {
      const tr = t - 0.5 - i * 0.9;
      if (tr < 0) return;
      const p = easeBack(tr / 0.5);
      const cy = Y0 + i * PAS + H / 2;
      const q = qualifie(r);
      const avec = aScore(r);
      ctx.save();
      ctx.globalAlpha = alpha * clamp(tr / 0.2);
      ctx.translate((1 - Math.min(1, p)) * 900, 0);
      ctx.save();
      ctx.translate(540, cy); ctx.transform(1, 0, -0.08, 1, 0, 0);
      ctx.fillStyle = 'rgba(5,5,40,0.72)'; ctx.fillRect(-500, -H / 2, 1000, H);
      ctx.fillStyle = '#ff7a00'; ctx.fillRect(-500, -H / 2, 14, H);
      ctx.restore();
      const cote = (n: 1 | 2, cx: number) => {
        const nom = n === 1 ? r.equipe1 : r.equipe2;
        const gagne = q === n, perd = q !== 0 && q !== n;
        const dr = drapeau(nom);
        ctx.save();
        ctx.globalAlpha = ctx.globalAlpha * (perd ? 0.55 : 1);
        if (dr !== '🏳️') { ctx.font = `64px ${POLICE}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(dr, cx, cy - 78); }
        ctx.font = `italic 900 50px ${POLICE}`;
        const lg = coupeLignes(ctx, majuscule(nom), 340).slice(0, 2);
        const ts = lg.length > 1 ? 40 : 50;
        lg.forEach((l, k) => texteIncline(ctx, l, cx, cy - 18 + k * ts * 1.05, ts, gagne ? '#6ee7b7' : '#fff', 'center', undefined, 350));
        ctx.restore();
        if (q !== 0) {
          const dt = easeBack((tr - 0.7) / 0.35);
          if (dt > 0) {
            ctx.save(); ctx.translate(cx, cy + 84); ctx.scale(Math.max(0.01, dt), Math.max(0.01, dt));
            pill(ctx, gagne ? 'QUALIFIÉ' : 'ÉLIMINÉ', 0, 0, 30, gagne ? '#10b981' : '#ef4444', '#fff', 320);
            ctx.restore();
          }
        }
      };
      cote(1, 215); cote(2, 865);
      if (avec) {
        const pr = (tr - 0.15) / 0.6;
        texteIncline(ctx, Math.round(num0(r.score1) * easeOut(pr)) + ' - ' + Math.round(num0(r.score2) * easeOut(pr)), 540, cy - 20, 110, '#fff', 'center', '#bf00ff', 340);
        const d = detailScore(r);
        if (d) texteIncline(ctx, d, 540, cy + 70, 40, '#fde68a', 'center', undefined, 340);
      } else {
        texteIncline(ctx, 'VS', 540, cy - 10, 110, '#fff', 'center', '#bf00ff', 200);
      }
      ctx.restore();
    });
  }

  else if (s.k === 'score') {
    const pop = easeBack((t - 0.2) / 0.6);
    ctx.save();
    if (s.d1) { ctx.font = `200px ${POLICE}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.globalAlpha = alpha * clamp(t / 0.5); ctx.fillText(s.d1, 270, 440); }
    if (s.d2) { ctx.font = `200px ${POLICE}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.globalAlpha = alpha * clamp(t / 0.5); ctx.fillText(s.d2, 810, 440); }
    ctx.restore();
    ctx.font = `italic 900 70px ${POLICE}`;
    const noms: [string, number][] = [[s.e1, 270], [s.e2, 810]];
    noms.forEach(([n, x], idx) => {
      const lg = coupeLignes(ctx, majuscule(n), 440).slice(0, 3);
      const ts = lg.length > 2 ? 52 : 66;
      const dx = (1 - easeOut((t - 0.1) / 0.5)) * (idx === 0 ? -500 : 500);
      lg.forEach((l, i) => texteIncline(ctx, l, x + dx, 620 + i * ts * 1.05, ts, '#fff', 'center', '#ff7a00', 470));
    });
    ctx.save();
    ctx.translate(540, 1080); ctx.scale(Math.max(0.01, pop), Math.max(0.01, pop));
    if (s.s1 !== null && s.s2 !== null) {
      const p = (t - 0.4) / 1.0;
      texteIncline(ctx, Math.round(s.s1 * easeOut(p)) + ' - ' + Math.round(s.s2 * easeOut(p)), 0, 0, 260, '#fff', 'center', '#bf00ff', 900);
    } else {
      texteIncline(ctx, 'VS', 0, 0, 260, '#fff', 'center', '#bf00ff', 900);
    }
    ctx.restore();
    s.infos.slice(0, 4).forEach((inf, i) => {
      ctx.globalAlpha = alpha * easeOut((t - 1.0 - i * 0.2) / 0.4);
      pill(ctx, inf, 540, 1330 + i * 115, 40, '#fff', '#111');
    });
  }

  else if (s.k === 'texte') {
    ctx.font = `italic 900 66px ${POLICE}`;
    let taille = 66;
    let lg = coupeLignes(ctx, s.texte, 900);
    while (lg.length * taille * 1.25 > 820 && taille > 34) { taille -= 4; ctx.font = `italic 900 ${taille}px ${POLICE}`; lg = coupeLignes(ctx, s.texte, 900); }
    const total = lg.length * taille * 1.25;
    const y0 = 760 - total / 2 + taille * 0.6;
    const nbMots = s.texte.length;
    const visibles = Math.floor(nbMots * clamp((t - 0.3) / Math.max(1, nbMots / VITESSE_FRAPPE)));
    let compte = 0;
    lg.forEach((l, i) => {
      const reste = Math.max(0, Math.min(l.length, visibles - compte));
      compte += l.length + 1;
      if (reste <= 0) return;
      texteIncline(ctx, l.slice(0, reste), 90, y0 + i * taille * 1.25, taille, '#fff', 'left', '#bf00ff');
    });
    const yb = y0 + total + 40;
    ctx.globalAlpha = alpha * easeOut((t - (s.duree - 1.5)) / 0.4);
    if (s.auteur) pill(ctx, majuscule(s.auteur), 540, yb + 40, 46, '#ff7a00', '#fff');
    if (s.sous) texteIncline(ctx, majuscule(s.sous), 540, yb + 150, 34, '#e9d5ff', 'center', undefined, 940);
  }

  ctx.restore();
}

function dessinerOutro(ctx: Ctx, t: number, duree: number) {
  const a = Math.min(clamp(t / 0.4), clamp((duree - t) / 0.25));
  ctx.save(); ctx.globalAlpha = a;
  const p = easeBack(t / 0.7);
  ctx.save();
  ctx.translate(540, 660); ctx.scale(Math.max(0.01, p), Math.max(0.01, p));
  ctx.shadowColor = 'rgba(191,0,255,0.8)'; ctx.shadowBlur = 90;
  ctx.fillStyle = '#bf00ff';
  ctx.beginPath(); ctx.roundRect(-190, -190, 380, 380, 90); ctx.fill();
  ctx.shadowBlur = 0;
  ctx.font = `160px ${POLICE}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#fff';
  ctx.fillText('⚽', 0, 10);
  ctx.restore();
  texteIncline(ctx, 'MAKEGOAL', 540, 1000, 140, '#fff', 'center', '#bf00ff', 960);
  pill(ctx, 'makegoal.vercel.app', 540, 1160, 52, '#fff', '#111');
  texteIncline(ctx, "N AP ENFÒME W", 540, 1320, 48, '#e9d5ff', 'center');
  ctx.restore();
}

// ---------- Moteur ----------
const DUREE_OUTRO = 3;

export function dureeTotale(scenes: Scene[]): number {
  return scenes.reduce((s, x) => s + x.duree, 0) + DUREE_OUTRO;
}

function chargerImgSrc(src: string, cors: boolean): Promise<HTMLImageElement | null> {
  return new Promise(resolve => {
    const img = new Image();
    if (cors) img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

// Charge une photo SANS "salir" le canvas (sinon l'enregistrement échoue). On passe par
// fetch (avec contournement du cache : une photo déjà vue dans la page sans CORS serait
// refusée), puis par une URL locale. Dernier recours : balise image avec paramètre anti-cache.
async function chargerImage(url: string): Promise<HTMLImageElement | null> {
  try {
    const rep = await fetch(url, { mode: 'cors', cache: 'reload' });
    if (rep.ok) {
      const blobUrl = URL.createObjectURL(await rep.blob());
      const img = await chargerImgSrc(blobUrl, false);
      if (img) return img;
    }
  } catch { /* on tente la suite */ }
  const sep = url.includes('?') ? '&' : '?';
  return chargerImgSrc(url + sep + 'mg=' + Date.now(), true);
}

function choisirFormat(): { mime: string; ext: string } | null {
  if (typeof MediaRecorder === 'undefined') return null;
  const candidats: { mime: string; ext: string }[] = [
    { mime: 'video/mp4;codecs=avc1.42E01E', ext: 'mp4' },
    { mime: 'video/mp4', ext: 'mp4' },
    { mime: 'video/webm;codecs=vp9', ext: 'webm' },
    { mime: 'video/webm;codecs=vp8', ext: 'webm' },
    { mime: 'video/webm', ext: 'webm' },
  ];
  return candidats.find(c => MediaRecorder.isTypeSupported(c.mime)) || null;
}

// Une vidéo trop longue (et donc trop lourde) fait planter le navigateur d'un téléphone au moment de
// la fabriquer ou de la télécharger. On la découpe donc en parties d'environ 22 s maximum, aux
// frontières des écrans, chacune enregistrée et téléchargeable séparément.
const DUREE_MAX_PARTIE = 22;
function decouper(scenes: Scene[]): Scene[][] {
  const parties: Scene[][] = [];
  let cur: Scene[] = [], d = 0;
  for (const sc of scenes) {
    if (cur.length && d + sc.duree > DUREE_MAX_PARTIE) { parties.push(cur); cur = []; d = 0; }
    cur.push(sc); d += sc.duree;
  }
  if (cur.length) parties.push(cur);
  // Pas de dernière partie minuscule : on la rattache à la précédente.
  if (parties.length > 1) {
    const dern = parties[parties.length - 1];
    if (dern.reduce((a, x) => a + x.duree, 0) < 5) { parties.pop(); parties[parties.length - 1].push(...dern); }
  }
  return parties;
}

export type PartieVideo = { blob: Blob; ext: string; duree: number };
type Progression = (pct: number, etape: string, duree?: number, nbScenes?: number) => void;

export async function genererVideos(post: VideoPost, onProgress: Progression, signal?: { annule: boolean }): Promise<PartieVideo[]> {
  const format = choisirFormat();
  if (!format) throw new Error("Ce navigateur ne sait pas enregistrer de vidéo. Utilisez Chrome.");
  const scenes = construireScenes(post);
  if (!scenes.length) throw new Error('Rien à mettre en vidéo pour ce post.');
  const parties = decouper(scenes);
  const totalGlobal = dureeTotale(scenes);

  onProgress(0, 'Chargement des images…', Math.round(totalGlobal), scenes.length);
  const urls = new Set<string>();
  scenes.forEach(s => {
    if (s.k === 'intro') { if (s.photo) urls.add(s.photo); s.duo?.forEach(d => { if (d.photo) urls.add(d.photo); }); }
    if (s.k === 'lignes' && s.entete) { if (s.entete.photo) urls.add(s.entete.photo); s.entete.duo?.forEach(d => { if (d.photo) urls.add(d.photo); }); }
  });
  const images: Images = new Map();
  await Promise.all([...urls].map(async u => { images.set(u, await chargerImage(u)); }));

  const canvas = document.createElement('canvas');
  canvas.width = LARGEUR; canvas.height = HAUTEUR;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas indisponible.');
  const statique = fondStatique();

  const resultats: PartieVideo[] = [];
  let dejaFait = 0;
  for (let ip = 0; ip < parties.length; ip++) {
    const sc = parties[ip];
    const derniere = ip === parties.length - 1;
    const total = sc.reduce((a, x) => a + x.duree, 0) + (derniere ? DUREE_OUTRO : 0);
    const etape = parties.length > 1 ? 'Enregistrement partie ' + (ip + 1) + '/' + parties.length + '…' : 'Enregistrement…';

    const dessiner = (t: number) => {
      let reste = t, fond = sc[0].fond, badge = sc[0].badge;
      let courante: { s: Scene; local: number } | null = null;
      for (const s of sc) {
        if (reste < s.duree) { courante = { s, local: reste }; fond = s.fond; badge = s.badge; break; }
        reste -= s.duree;
      }
      if (!courante && !derniere) { // fin de partie : on reste sur la dernière image de l'écran final
        const s = sc[sc.length - 1];
        courante = { s, local: s.duree - 0.01 }; fond = s.fond; badge = s.badge;
      }
      if (!courante) fond = 'GOAL';
      let bandeY: number | null = null;
      if (courante) {
        const k = courante.s.k;
        if (k === 'intro') bandeY = (courante.s.photo || courante.s.initiale || courante.s.icone) ? 1130 : (courante.s.duo ? 1180 : 640);
        else if (k === 'score') bandeY = 1080;
      } else bandeY = 1000;
      dessinerFond(ctx, statique, t + dejaFait, fond, bandeY, courante ? courante.local : reste);
      if (courante) {
        dessinerEntete(ctx, badge, 1);
        dessinerScene(ctx, courante.s, courante.local, images);
      } else {
        dessinerOutro(ctx, reste, DUREE_OUTRO);
      }
    };

    // Débit : plafonné pour que chaque partie reste légère (~20 Mo), sans descendre sous 7 Mb/s.
    const debit = Math.round(Math.max(7_000_000, Math.min(14_000_000, 160_000_000 / total)));
    const flux = canvas.captureStream(30);
    const rec = new MediaRecorder(flux, { mimeType: format.mime, videoBitsPerSecond: debit });
    const morceaux: Blob[] = [];
    rec.ondataavailable = e => { if (e.data.size) morceaux.push(e.data); };
    const fini = new Promise<void>(res => { rec.onstop = () => res(); });

    dessiner(0);
    rec.start(1000);
    const debut = performance.now();
    await new Promise<void>(resolve => {
      const boucle = () => {
        const t = (performance.now() - debut) / 1000;
        if ((signal && signal.annule) || t >= total) { resolve(); return; }
        dessiner(t);
        const pct = Math.round(((dejaFait + t) / totalGlobal) * 100);
        onProgress(Math.min(99, pct), etape, Math.round(totalGlobal), scenes.length);
        requestAnimationFrame(boucle);
      };
      requestAnimationFrame(boucle);
    });
    dessiner(Math.max(0, total - 0.01));
    await new Promise(r => setTimeout(r, 200));
    rec.stop();
    flux.getTracks().forEach(tr => tr.stop());
    await fini;
    if (signal && signal.annule) throw new Error('annulé');
    resultats.push({ blob: new Blob(morceaux, { type: format.mime.split(';')[0] }), ext: format.ext, duree: total });
    dejaFait += total;
    await new Promise(r => setTimeout(r, 300)); // laisse le navigateur libérer l'encodeur
  }
  onProgress(100, 'Terminé');
  return resultats;
}
