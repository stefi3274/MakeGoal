// Génération de vidéos MakeGoal (1080x1920) pour TOUS les types de posts.
// Tout se fait dans le navigateur : canvas + MediaRecorder, aucun serveur.
// Principe : un post est converti en "scènes" génériques (intro, lignes, score,
// texte), puis un seul moteur les dessine avec le même style (violet, projecteurs,
// bande orange, pelouse). Ajouter un type de post = ajouter un cas dans construireScenes.

import { groupesPourPeriode, periodeAvecAdversaire, libellePeriode, Periode } from './statsJoueur';
import { ligneContexte, DistinctionDetails } from './distinctions';
import { drapeau, OnzeJoueur, OnzeDetails } from './formations';
import { EliminationDetails, Rencontre, qualifie, aScore, detailScore } from './elimination';
import { NominationsDetails, nominesPublies } from './nominations';
import { PromoDetails, Sponsor, lotsPublies, sponsorsPublies } from './promo';
import { formaterDate as formaterDatePromo } from './confrontations';
import { JourneeDetails, issueJournee, matchsJourneePublies } from './journee';
import { DerniersMatchsDetails, libelleDerniers, affichageDernier, issueDernier, bilanDerniers, derniersPublies } from './derniersMatchs';
import { Ecussons, VisuelEquipe, visuelEquipe } from './ecussons';
import { ConfrontationsDetails, prochainRempli, affichageProchain, MESSAGE_PRONOSTIC, MESSAGE_CADEAUX, libelleConfrontations, affichageConf, issueConf, formaterDate, bilanConf, matchsPublies } from './confrontations';

// ---------- Données d'entrée (compatible avec le type Article de l'admin) ----------
export type VideoPost = {
  titre: string;
  sport?: string | null;
  ligue?: string | null;
  pays1?: string | null; pays2?: string | null;
  equipe1?: string | null; equipe2?: string | null;
  score1?: number | null; score2?: number | null;
  statut_match?: string | null; heure_match?: string | null; stade?: string | null; created_at?: string | null;
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
  confrontations?: ConfrontationsDetails | null;
  derniers_matchs?: DerniersMatchsDetails | null;
  journee_resultats?: JourneeDetails | null;
  nominations?: NominationsDetails | null;
  promo?: PromoDetails | null;
  quizz?: { titre: string; sport?: string | null; duree_heures?: number | null; sponsors?: Sponsor[] | null; questions: { question: string; options: { cle: string; texte: string }[]; bonne_reponse?: string }[] } | null;
  extrait?: string | null;
};

// ---------- Scènes ----------
type Issue = 'G' | 'P' | 'N';
type MatchLigne = { a: string; b: string; sa?: string; sb?: string; va?: VisuelEquipe; vb?: VisuelEquipe };
type Ligne = { photo?: string; ecusson?: string; cols?: [string, string, string]; match?: MatchLigne; label: string; valeur: string; valeur2?: string; sous?: string; accent?: string; couleurSous?: string };
type Morceau = { t: string; c: string; o?: string };
type Duo = { nom: string; sous?: string; photo?: string; initiale: string };
type Enseigne = { nom: string; sous?: string; photo?: string; initiale?: string; icone?: string; duo?: [Duo, Duo] };

type Scene =
  | { k: 'intro'; badge: string; fond: string; titre: string; sous?: string; pill?: string; photo?: string; initiale?: string; icone?: string; duo?: [Duo, Duo]; fixe?: boolean; duree: number }
  | { k: 'lignes'; badge: string; fond: string; titre?: string; soustitre?: string; entetesCols?: [string, string, string]; titreMorceaux?: Morceau[]; entete?: Enseigne; lignes: Ligne[]; duree: number }
  | { k: 'score'; badge: string; fond: string; e1: string; e2: string; s1: number | null; s2: number | null; i1?: Issue; i2?: Issue; buts?: { cote: 1 | 2; texte: string }[]; d1?: string; d2?: string; infos: string[]; duree: number }
  | { k: 'duels'; badge: string; fond: string; titre?: string; rencontres: Rencontre[]; duree: number }
  | { k: 'quiz'; badge: string; fond: string; numero: number; total: number; question: string; options: { cle: string; texte: string }[]; bonne?: string; duree: number }
  | { k: 'quiztitre'; badge: string; fond: string; titre: string; sous?: string; pill?: string; icone?: string; duree: number }
  | { k: 'texte'; badge: string; fond: string; texte: string; auteur?: string; sous?: string; duree: number };

const LARGEUR = 1080, HAUTEUR = 1920;
const PHOTO_ABSENTE = 'sans-photo'; // pastille avec l'initiale, pour garder les noms alignés
const POLICE = '"Arial Black", Impact, "Helvetica Neue", Arial, sans-serif';

const majuscule = (s: string) => (s || '').toUpperCase();

// Code couleur des résultats : vert = gagnant, rouge = perdant, violet (couleur du site) = nul.
const VERT = '#4ade80', ROUGE = '#ff4d4d', VIOLET_NUL = '#bf00ff';
const issuesMatch = (a: number | null | undefined, b: number | null | undefined): [Issue, Issue] | null => {
  if (a == null || b == null) return null;
  return a > b ? ['G', 'P'] : a < b ? ['P', 'G'] : ['N', 'N'];
};
const texteIssue = (i: Issue | undefined) => (i === 'G' ? VERT : i === 'P' ? ROUGE : '#fff');
const ombreIssue = (i: Issue | undefined) => (i === 'G' ? '#052e16' : i === 'P' ? '#4c0519' : '#ff7a00');
const accentIssue = (i: Issue | undefined) => (i === 'G' ? '#22c55e' : i === 'P' ? '#ef4444' : VIOLET_NUL);
const normNom = (x: string | null | undefined) => (x || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
const minuteNum = (m: string) => { const r = (m || '').match(/(\d+)(?:\s*\+\s*(\d+))?/); return r ? Number(r[1]) + (r[2] ? Number(r[2]) / 100 : 0) : 999; };
// Ajoute l'écusson (ou le drapeau d'une sélection) de chaque équipe d'un match.
const avecVisuels = (m: MatchLigne, ec?: Ecussons | null): MatchLigne => ({ ...m, va: visuelEquipe(m.a, ec), vb: visuelEquipe(m.b, ec) });
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
// FootQuizz : 3 s pour lire la question, puis 5 s pour répondre.
const LECTURE_Q = 3, REPONSE_Q = 5, REVEAL_Q = 2.5;
const PAS_BUT = 0.9; // secondes entre deux buts révélés
const DEBUT_BUTS = 0.7;
const PAR_PAGE_ENTETE = 5;
const PAR_PAGE_LISTE = 7;

export function typeVideo(p: VideoPost): string {
  if (p.quizz?.questions?.length) return 'FootQuizz';
  if (p.stats_joueur?.joueurs?.length) return 'Stats joueur';
  if (p.distinction_type) return 'Distinction';
  if (p.formation && p.onze?.length) return 'Équipe type';
  if (p.classement_type && p.classement?.length) return 'Classement';
  if (p.gagnants?.gagnants?.length) return 'Gagnants';
  if (p.declaration?.citation) return 'Déclaration';
  if (p.parcours?.adversaires?.length) return 'Parcours';
  if (p.promo && lotsPublies(p.promo.lots || []).length) return 'Promo';
  if (p.nominations && nominesPublies(p.nominations.nomines || []).length) return 'Nominations';
  if (p.journee_resultats && matchsJourneePublies(p.journee_resultats.matchs || []).length) return 'Résultats de la journée';
  if (p.derniers_matchs && derniersPublies(p.derniers_matchs.matchs || []).length) return 'Derniers matchs';
  if (p.confrontations && matchsPublies(p.confrontations.matchs || []).length) return 'Confrontations';
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

  if (type === 'FootQuizz') {
    // Question par question : la question (3 s), les choix (5 s pour répondre), la réponse en violet.
    // Fond blanc, caractères noirs. Les questions fournies sont toutes montrées (la liste est choisie en amont).
    const qz = p.quizz!;
    const tot = qz.questions.length;
    const basket = qz.sport === 'basketball';
    const badge = basket ? 'BASKETQUIZZ' : 'FOOTQUIZZ';
    scenes.push({ k: 'quiztitre', badge, fond: 'QUIZ', titre: qz.titre, sous: tot + ' questions · 10 secondes chacune', pill: 'Une seule tentative' + (qz.duree_heures ? ' · actif ' + qz.duree_heures + ' h' : ''), icone: basket ? '🏀' : '🧠', duree: 3.4 });
    const spQ = sponsorsPublies(qz.sponsors);
    if (spQ.length) {
      const ls: Ligne[] = spQ.map(s => ({ label: s.nom || 'Sponsor', valeur: '', accent: '#fbbf24', ecusson: s.logo || undefined }));
      pagesDeLignes(ls, 4).forEach(pg => scenes.push({ k: 'lignes', badge, fond: 'QUIZ', titre: 'Quizz offert par', lignes: pg, duree: dureeLignes(pg.length) }));
    }
    qz.questions.forEach((q, i) => {
      const options = q.options.filter(o => (o.texte || '').trim());
      const bonne = q.bonne_reponse && options.some(o => o.cle === q.bonne_reponse) ? q.bonne_reponse : undefined;
      scenes.push({ k: 'quiz', badge, fond: 'QUIZ', numero: i + 1, total: tot, question: q.question, options, bonne, duree: LECTURE_Q + REPONSE_Q + (bonne ? REVEAL_Q : 0) + 0.3 });
    });
    scenes.push({ k: 'quiztitre', badge, fond: 'QUIZ', titre: 'À toi de jouer !', sous: 'makegoal.vercel.app', pill: 'Tirage au sort parmi les ≥ 80 %', icone: '⚡', duree: 3.2 });
  } else if (type === 'Stats joueur') {
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
    const titre = p.classement_titre || p.titre;
    if (p.classement_type === 'equipes') {
      // Tableau de compétition : Équipe | M (matchs joués) | +/- (différence de buts) | P (points).
      const dateTxt = p.created_at ? new Date(p.created_at).toLocaleDateString('fr-FR', { timeZone: 'America/Port-au-Prince', day: 'numeric', month: 'long', year: 'numeric' }) : '';
      const lignes: Ligne[] = (p.classement || []).slice(0, 20).map(l => ({
        label: l.pos + '. ' + l.nom, valeur: '', cols: [(l.extra || '-').toString(), (l.diff || '-').toString(), (l.val || '-').toString()] as [string, string, string],
        accent: '#ff7a00',
      }));
      scenes.push({ k: 'intro', badge: 'CLASSEMENT', fond: 'TOP', titre, sous: 'Classement de la compétition', pill: dateTxt ? '📅 ' + dateTxt : undefined, icone: '📊', duree: 3.4 });
      pagesDeLignes(lignes, 6).forEach(pg => scenes.push({ k: 'lignes', badge: 'CLASSEMENT', fond: 'TOP', titre, soustitre: dateTxt ? 'Classement au ' + dateTxt : 'Classement', entetesCols: ['M', '+/-', 'P'], lignes: pg, duree: dureeLignes(pg.length) + 0.6 }));
    } else {
      const lignes: Ligne[] = (p.classement || []).slice(0, 10).map(l => ({ label: l.pos + '. ' + l.nom, valeur: (l.val || l.extra || '').toString() }));
      scenes.push({ k: 'intro', badge: 'CLASSEMENT', fond: 'TOP', titre, icone: '📊', duree: 3 });
      pagesDeLignes(lignes, PAR_PAGE_LISTE).forEach(pg => scenes.push({ k: 'lignes', badge: 'CLASSEMENT', fond: 'TOP', titre, lignes: pg, duree: dureeLignes(pg.length) }));
    }
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
    const joue = (a: typeof pc.adversaires[number]) => a.scoreEquipe !== '' && a.scoreAdversaire !== '' && a.scoreEquipe != null && a.scoreAdversaire != null;
    const lignesDe = (a: typeof pc.adversaires[number]): Ligne => {
      const sousTxt = [a.label, a.date].filter(Boolean).join('  •  ') || undefined;
      const base = { match: avecVisuels({ a: pc.equipe, b: a.nom, sa: joue(a) ? a.scoreEquipe : undefined, sb: joue(a) ? a.scoreAdversaire : undefined }), label: pc.equipe + ' vs ' + a.nom, valeur: '', sous: sousTxt, couleurSous: '#e9d5ff' };
      if (!joue(a)) return { ...base, accent: '#9ca3af' };
      const x = parseInt(a.scoreEquipe, 10), y = parseInt(a.scoreAdversaire, 10);
      return { ...base, accent: accentIssue(x > y ? 'G' : x < y ? 'P' : 'N') };
    };
    const joues = pc.adversaires.filter(joue), avenir = pc.adversaires.filter(a => !joue(a));
    const avecSections = joues.length > 0 && avenir.length > 0;
    const compet = [pc.competition, pc.poule].filter(Boolean).join('  •  ');
    const st = (suffixe: string) => [compet, avecSections ? suffixe : ''].filter(Boolean).join('  •  ') || undefined;
    pagesDeLignes(joues.map(lignesDe), 5).forEach(pg => scenes.push({ k: 'lignes', badge: 'PARCOURS', fond: 'ROAD', titre: pc.equipe, soustitre: st('Matchs joués'), lignes: pg, duree: dureeLignes(pg.length) + 0.6 }));
    pagesDeLignes(avenir.map(lignesDe), 5).forEach(pg => scenes.push({ k: 'lignes', badge: 'PARCOURS', fond: 'ROAD', titre: pc.equipe, soustitre: st('Matchs à venir'), lignes: pg, duree: dureeLignes(pg.length) + 0.6 }));
  } else if (type === 'Promo') {
    const pr = p.promo!;
    const lots = lotsPublies(pr.lots);
    const badge = 'PROMO';
    const fin = formaterDatePromo(pr.fin);
    scenes.push({ k: 'intro', badge, fond: 'NOM', titre: pr.accroche || (lots.length > 1 ? 'À gagner !' : 'À gagner : ' + lots[0].nom), sous: pr.quizz || undefined, pill: fin ? "JUSQU'AU " + majuscule(fin) : 'À GAGNER', icone: '🎁', duree: 3.6 });
    const lignes: Ligne[] = lots.map(l => ({
      label: l.nom, sous: l.detail || undefined, valeur: '', accent: '#e11d48', couleurSous: '#e9d5ff',
      photo: l.photo || (lots.some(x => x.photo) ? PHOTO_ABSENTE : undefined),
    }));
    pagesDeLignes(lignes, 4).forEach(pg => scenes.push({ k: 'lignes', badge, fond: 'NOM', titre: lots.length > 1 ? 'Les lots à gagner' : 'Le lot à gagner', soustitre: pr.quizz || undefined, lignes: pg, duree: dureeLignes(pg.length) + 0.6 }));
    const cond = (pr.conditions || '').trim();
    if (cond || fin) scenes.push({ k: 'texte', badge, fond: 'NOM', texte: cond || 'Réponds au quizz sur MakeGoal et tente ta chance !', auteur: fin ? "Jusqu'au " + fin : undefined, sous: pr.quizz || undefined, duree: Math.min(9, 4 + cond.length / 40) });
    const sp = sponsorsPublies(pr.sponsors);
    if (sp.length) {
      const ls: Ligne[] = sp.map(s => ({ label: s.nom || 'Sponsor', valeur: '', accent: '#fbbf24', ecusson: s.logo || undefined }));
      pagesDeLignes(ls, 4).forEach(pg => scenes.push({ k: 'lignes', badge, fond: 'NOM', titre: 'Avec le soutien de', lignes: pg, duree: dureeLignes(pg.length) }));
    }
  } else if (type === 'Nominations') {
    const nm = p.nominations!;
    const nomines = nominesPublies(nm.nomines);
    const cat = nm.categorie || 'Nominations';
    const badge = 'NOMINATIONS';
    scenes.push({ k: 'intro', badge, fond: 'NOM', titre: cat, sous: nm.edition || undefined, pill: nomines.length + (nomines.length > 1 ? ' NOMINÉS' : ' NOMINÉ'), icone: '🏆', duree: 3.4 });
    const lignes: Ligne[] = nomines.map((n, i) => {
      const dr = drapeau(n.pays || n.equipe || '');
      return {
        label: n.nom,
        sous: [n.equipe, n.note].filter(Boolean).join('  •  ') || undefined,
        valeur: !n.ecusson && dr && dr !== '🏳️' ? dr : '', accent: '#fbbf24', couleurSous: '#e9d5ff',
        photo: n.photo || (nomines.some(x => x.photo) ? PHOTO_ABSENTE : undefined), ecusson: n.ecusson || undefined,
      };
    });
    pagesDeLignes(lignes, 6).forEach(pg => scenes.push({ k: 'lignes', badge, fond: 'NOM', titre: cat, soustitre: nm.edition ? 'Les nominés • ' + nm.edition : 'Les nominés', lignes: pg, duree: dureeLignes(pg.length) + 0.6 }));
    scenes.push({ k: 'texte', badge, fond: 'NOM', texte: 'Qui le remportera ? Donne ton avis en commentaire !', sous: cat, duree: 4 });
  } else if (type === 'Résultats de la journée') {
    const j = p.journee_resultats!;
    const matchs = matchsJourneePublies(j.matchs);
    const dateTxt = formaterDate(j.date);
    const badge = 'RÉSULTATS';
    scenes.push({ k: 'intro', badge, fond: 'FT', titre: j.competition || 'Résultats', sous: j.journee || undefined, pill: dateTxt ? '📅 ' + dateTxt : undefined, icone: '📋', duree: 3.4 });
    const lignes: Ligne[] = matchs.map(m => ({ match: avecVisuels({ a: m.equipe1, b: m.equipe2, sa: m.score1.trim(), sb: m.score2.trim() }, j.ecussons), label: m.equipe1 + ' vs ' + m.equipe2, valeur: '', accent: '#ff7a00' }));
    const sousT = [j.journee, dateTxt].filter(Boolean).join('  •  ') || undefined;
    pagesDeLignes(lignes, 6).forEach(pg => scenes.push({ k: 'lignes', badge, fond: 'FT', titre: j.competition || 'Résultats', soustitre: sousT, lignes: pg, duree: dureeLignes(pg.length) + 0.6 }));
  } else if (type === 'Derniers matchs') {
    const d = p.derniers_matchs!;
    const matchs = derniersPublies(d.matchs);
    const badge = 'DERNIERS MATCHS';
    scenes.push({ k: 'intro', badge, fond: 'FORM', titre: d.equipe, sous: avecDrapeau(d.equipe, '') || undefined, photo: visuelEquipe(d.equipe, d.ecussons).url, pill: majuscule(libelleDerniers(matchs.length)), initiale: ((d.equipe || '?').trim()[0] || '?').toUpperCase(), duree: 3.4 });
    const lignes: Ligne[] = matchs.map(m => ({
      match: avecVisuels(affichageDernier(d.equipe, m), d.ecussons),
      label: d.equipe + ' vs ' + m.adversaire,
      sous: [formaterDate(m.date), m.competition].filter(Boolean).join('  •  ') || undefined,
      valeur: '', accent: accentIssue(issueDernier(m) as Issue), couleurSous: '#e9d5ff',
    }));
    pagesDeLignes(lignes, 5).forEach(pg => scenes.push({ k: 'lignes', badge, fond: 'FORM', titre: d.equipe, soustitre: libelleDerniers(matchs.length), lignes: pg, duree: dureeLignes(pg.length) + 0.6 }));
    const b = bilanDerniers(matchs);
    const bil: Ligne[] = [
      { label: 'Victoires', valeur: String(b.v), accent: accentIssue('G') },
      { label: 'Matchs nuls', valeur: String(b.n), accent: accentIssue('N') },
      { label: 'Défaites', valeur: String(b.d), accent: accentIssue('P') },
      { label: 'Buts marqués / encaissés', valeur: b.bp + '-' + b.bc, accent: '#ff7a00' },
    ];
    scenes.push({ k: 'lignes', badge, fond: 'FORM', titre: 'Le bilan', lignes: bil, duree: dureeLignes(bil.length) });
  } else if (type === 'Confrontations') {
    const c = p.confrontations!;
    const matchs = matchsPublies(c.matchs);
    const initiale = (n: string) => ((n || '?').trim()[0] || '?').toUpperCase();
    const badge = 'CONFRONTATIONS';
    const duo: [Duo, Duo] = [
      { nom: c.equipe1, sous: avecDrapeau(c.equipe1, '') || undefined, photo: visuelEquipe(c.equipe1, c.ecussons).url, initiale: initiale(c.equipe1) },
      { nom: c.equipe2, sous: avecDrapeau(c.equipe2, '') || undefined, photo: visuelEquipe(c.equipe2, c.ecussons).url, initiale: initiale(c.equipe2) },
    ];
    scenes.push({ k: 'intro', badge, fond: 'VS', titre: '', pill: majuscule(libelleConfrontations(matchs.length)), duo, duree: 3.4 });
    const lignes: Ligne[] = matchs.map(m => ({
      match: avecVisuels(affichageConf(c, m), c.ecussons),
      label: c.equipe1 + ' vs ' + c.equipe2,
      sous: [formaterDate(m.date) || 'Date inconnue', m.competition].filter(Boolean).join('  •  '),
      valeur: '', accent: '#ff7a00', couleurSous: '#e9d5ff',
    }));
    const titreC = c.equipe1 + ' vs ' + c.equipe2;
    pagesDeLignes(lignes, 5).forEach(pg => scenes.push({ k: 'lignes', badge, fond: 'VS', titre: titreC, soustitre: libelleConfrontations(matchs.length), lignes: pg, duree: dureeLignes(pg.length) + 0.6 }));
    const b = bilanConf({ ...c, matchs });
    const bil: Ligne[] = [
      { label: 'Victoires ' + c.equipe1, valeur: String(b.v1), accent: accentIssue('G') },
      { label: 'Matchs nuls', valeur: String(b.n), accent: accentIssue('N') },
      { label: 'Victoires ' + c.equipe2, valeur: String(b.v2), accent: accentIssue('P') },
      { label: 'Buts marqués', valeur: b.b1 + '-' + b.b2, accent: '#ff7a00' },
    ];
    scenes.push({ k: 'lignes', badge, fond: 'VS', titre: 'Le bilan', lignes: bil, duree: dureeLignes(bil.length) });
    if (prochainRempli(c.prochain)) {
      const ap = affichageProchain(c);
      const sousP = [formaterDate(c.prochain.date), c.prochain.competition].filter(Boolean).join('  •  ') || undefined;
      const lp: Ligne = { match: avecVisuels({ a: ap.a, b: ap.b }, c.ecussons), label: ap.a + ' vs ' + ap.b, valeur: '', sous: sousP, accent: '#ff7a00', couleurSous: '#e9d5ff' };
      scenes.push({ k: 'lignes', badge, fond: 'VS', titre: 'Le prochain match', lignes: [lp], duree: dureeLignes(1) + 0.8 });
      scenes.push({ k: 'texte', badge, fond: 'VS', texte: MESSAGE_PRONOSTIC, sous: c.prochain.sansCadeaux ? undefined : MESSAGE_CADEAUX, duree: 5 });
    }
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
    // Date : celle saisie pour le match, sinon la date de publication du post.
    const dateTxt = p.heure_match || (p.created_at ? new Date(p.created_at).toLocaleDateString('fr-FR', { timeZone: 'America/Port-au-Prince', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : '');
    const infos = fini
      ? [p.ligue, dateTxt ? '📅 ' + dateTxt : '', p.statut_match, p.stade ? '📍 ' + p.stade : ''].filter((x): x is string => !!x)
      : [p.ligue, p.statut_match, p.heure_match ? '🕐 ' + p.heure_match : '', p.stade ? '📍 ' + p.stade : ''].filter((x): x is string => !!x);
    const badge = fini ? 'RÉSULTAT' : 'MATCH À VENIR';
    const iss = fini ? issuesMatch(p.score1, p.score2) : null;
    // Les buts, dans l'ordre chronologique, pour faire monter le score but après but.
    let butsOrdre: { cote: 1 | 2; texte: string }[] | undefined;
    if (fini && p.resultat_details?.buts?.length && p.score1 != null && p.score2 != null) {
      const liste = p.resultat_details.buts.map(b => {
        const n = normNom(b.equipe);
        const cote: 0 | 1 | 2 = n && n === normNom(p.equipe1) ? 1 : n && n === normNom(p.equipe2) ? 2 : 0;
        return { cote, m: minuteNum(b.minute), texte: [(b.minute ? b.minute + "' " : '') + majuscule(b.joueur), majuscule(cote === 1 ? (p.equipe1 || '') : cote === 2 ? (p.equipe2 || '') : b.equipe)].filter(Boolean).join('  ·  ') };
      }).sort((x, y) => x.m - y.m);
      const n1 = liste.filter(x => x.cote === 1).length, n2 = liste.filter(x => x.cote === 2).length;
      // Seulement si tous les buts sont attribués et que leur total correspond au score final.
      if (liste.every(x => x.cote !== 0) && n1 === p.score1 && n2 === p.score2) butsOrdre = liste.map(x => ({ cote: x.cote as 1 | 2, texte: x.texte }));
    }
    scenes.push({ k: 'score', badge, fond: fini ? 'FINAL' : 'VS', e1: p.equipe1 || '', e2: p.equipe2 || '', s1: fini ? (p.score1 ?? null) : null, s2: fini ? (p.score2 ?? null) : null, i1: iss?.[0], i2: iss?.[1], buts: butsOrdre, d1: p.pays1 ? drapeau(p.pays1) : undefined, d2: p.pays2 ? drapeau(p.pays2) : undefined, infos, duree: butsOrdre ? DEBUT_BUTS + (butsOrdre.length - 1) * PAS_BUT + 1.0 : (fini && p.score1 === 0 && p.score2 === 0 ? 5 : fini ? 3.0 : 5) });
    const rd = p.resultat_details;
    if (fini && rd) {
      const cote = (nom: string): { i: Issue | undefined; etiquette: string } | null => {
        const n = normNom(nom);
        if (!n) return null;
        if (n === normNom(p.equipe1)) return { i: iss?.[0], etiquette: avecDrapeau(p.pays1, majuscule(p.equipe1 || '')) };
        if (n === normNom(p.equipe2)) return { i: iss?.[1], etiquette: avecDrapeau(p.pays2, majuscule(p.equipe2 || '')) };
        return { i: undefined, etiquette: majuscule(nom) };
      };
      const evts: (Ligne & { m: number })[] = [
        ...rd.buts.map(b => {
          const c = cote(b.equipe);
          return { m: minuteNum(b.minute), label: (b.minute ? b.minute + "' " : '') + b.joueur, valeur: '⚽',
            sous: c ? [c.etiquette, b.passeur ? 'PASSE : ' + majuscule(b.passeur) : ''].filter(Boolean).join('  •  ') : (b.passeur ? 'PASSE : ' + majuscule(b.passeur) : undefined),
            accent: c && c.i ? accentIssue(c.i) : undefined, couleurSous: c ? texteIssue(c.i) : undefined };
        }),
        ...rd.jaunes.map(c => ({ m: minuteNum(c.minute), label: (c.minute ? c.minute + "' " : '') + c.joueur, valeur: '🟨' })),
        ...rd.rouges.map(c => ({ m: minuteNum(c.minute), label: (c.minute ? c.minute + "' " : '') + c.joueur, valeur: '🟥' })),
      ].sort((a, b) => a.m - b.m); // ordre chronologique (tri stable : sans minute, à la fin)
      const lignes: Ligne[] = evts.map(({ m: _m, ...l }) => l);
      const morceaux: Morceau[] | undefined = iss && p.score1 != null && p.score2 != null ? [
        { t: (p.equipe1 || '').toUpperCase(), c: texteIssue(iss[0]), o: ombreIssue(iss[0]) },
        { t: '  ' + p.score1 + '-' + p.score2 + '  ', c: '#fff', o: '#bf00ff' },
        { t: (p.equipe2 || '').toUpperCase(), c: texteIssue(iss[1]), o: ombreIssue(iss[1]) },
      ] : undefined;
      pagesDeLignes(lignes, PAR_PAGE_LISTE).forEach(pg => scenes.push({ k: 'lignes', badge: badge, fond: 'FINAL', titre: (p.equipe1 || '') + ' ' + (p.score1 ?? '') + '-' + (p.score2 ?? '') + ' ' + (p.equipe2 || ''), titreMorceaux: morceaux, lignes: pg, duree: dureeLignes(pg.length) }));
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
  else if (s.k === 'intro' && s.fixe) return s;
  else if (s.k === 'intro') mots = motsDe(s.titre) + motsDe(s.sous) + motsDe(s.pill);
  else if (s.k === 'lignes') mots = s.lignes.reduce((n, l) => n + motsDe(l.label) * 0.5 + 1, 0);
  else return s; // quiz, score, duels : durées fixes
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

// Texte OR avec contour sombre : lisible sur tous les fonds (projecteurs clairs, bande orange).
const OR = '#fcd34d', CONTOUR_OR = '#1e0a3c';
function texteOr(ctx: Ctx, txt: string, x: number, y: number, taille: number, align: CanvasTextAlign = 'center', maxLarg?: number) {
  let t = taille;
  ctx.font = `italic 900 ${t}px ${POLICE}`;
  if (maxLarg) while (ctx.measureText(txt).width > maxLarg && t > 18) { t -= 2; ctx.font = `italic 900 ${t}px ${POLICE}`; }
  ctx.save();
  ctx.translate(x, y);
  ctx.transform(1, 0, -0.16, 1, 0, 0);
  ctx.textAlign = align; ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round'; ctx.lineWidth = Math.max(6, t * 0.2); ctx.strokeStyle = CONTOUR_OR;
  ctx.strokeText(txt, 0, 0);
  ctx.fillStyle = OR;
  ctx.fillText(txt, 0, 0);
  ctx.restore();
}

// Une ligne faite de morceaux de couleurs différentes (ex : équipe verte, score blanc, équipe rouge).
function texteMorceaux(ctx: Ctx, morceaux: Morceau[], cx: number, cy: number, taille: number, maxLarg: number) {
  let t = taille;
  const larg = () => morceaux.reduce((a, m) => a + ctx.measureText(m.t).width, 0);
  ctx.font = `italic 900 ${t}px ${POLICE}`;
  while (larg() > maxLarg && t > 20) { t -= 2; ctx.font = `italic 900 ${t}px ${POLICE}`; }
  let x = cx - larg() / 2;
  for (const m of morceaux) {
    const w = ctx.measureText(m.t).width;
    texteIncline(ctx, m.t, x, cy, t, m.c, 'left', m.o);
    x += w;
  }
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

function dessinerFondClair(ctx: Ctx) {
  ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, LARGEUR, HAUTEUR);
  const gr = ctx.createLinearGradient(0, 0, 0, 520);
  gr.addColorStop(0, '#f3e8ff'); gr.addColorStop(1, 'rgba(243,232,255,0)');
  ctx.fillStyle = gr; ctx.fillRect(0, 0, LARGEUR, 520);
  // bandes de marque en bas
  ctx.fillStyle = '#bf00ff'; ctx.fillRect(0, HAUTEUR - 26, LARGEUR * 0.7, 26);
  ctx.fillStyle = '#ff7a00'; ctx.fillRect(LARGEUR * 0.7, HAUTEUR - 26, LARGEUR * 0.3, 26);
}

function dessinerFond(ctx: Ctx, statique: HTMLCanvasElement, t: number, fond: string, bandeY: number | null, local: number) {
  if (fond === 'QUIZ') { dessinerFondClair(ctx); return; }
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
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    ctx.fillRect(-900 + dx, -95 + 16, 1800, 190);
    ctx.fillStyle = go;
    ctx.fillRect(-900 + dx, -95, 1800, 190);
    ctx.restore();
  }
  // barre du bas
  const bar = ctx.createLinearGradient(0, 0, LARGEUR, 0);
  bar.addColorStop(0, '#bf00ff'); bar.addColorStop(1, '#ff7a00');
  ctx.fillStyle = bar; ctx.fillRect(0, HAUTEUR - 22, LARGEUR, 22);
}

function dessinerEntete(ctx: Ctx, badge: string, a: number, clair = false) {
  ctx.save(); ctx.globalAlpha = a;
  ctx.font = `italic 900 40px ${POLICE}`;
  let t = 40;
  while (ctx.measureText(badge).width > 560 && t > 22) { t -= 2; ctx.font = `italic 900 ${t}px ${POLICE}`; }
  const w = ctx.measureText(badge).width + 80;
  ctx.save(); ctx.translate(68, 110); ctx.transform(1, 0, -0.2, 1, 0, 0);
  ctx.fillStyle = '#bf00ff'; ctx.fillRect(0, -42, w, 84);
  ctx.fillStyle = '#fff'; ctx.textBaseline = 'middle'; ctx.fillText(badge, 40, 2);
  ctx.restore();
  ctx.font = `italic 900 42px ${POLICE}`; ctx.fillStyle = clair ? '#111' : '#fff'; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
  ctx.fillText('MAKEGOAL', 1012, 112);
  ctx.restore();
}

type Images = Map<string, HTMLImageElement | null>;

// Photo (recadrée en carré arrondi) ou écusson (entier, sans recadrage) dans une ligne.
function imageCarree(ctx: Ctx, img: HTMLImageElement | null, x: number, y: number, c: number, recadrer: boolean, initiale: string) {
  ctx.save();
  if (recadrer) {
    ctx.beginPath(); ctx.roundRect(x, y, c, c, 22); ctx.clip();
    if (img) {
      const s = Math.max(c / img.width, c / img.height);
      const w = img.width * s, h = img.height * s;
      ctx.drawImage(img, x + (c - w) / 2, y + (c - h) / 2, w, h);
    } else {
      ctx.fillStyle = '#3b1a8a'; ctx.fillRect(x, y, c, c);
      ctx.fillStyle = '#fff'; ctx.font = `italic 900 56px ${POLICE}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(((initiale || '?').trim()[0] || '?').toUpperCase(), x + c / 2, y + c / 2 + 4);
    }
    ctx.restore();
    ctx.save(); ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 4; ctx.beginPath(); ctx.roundRect(x, y, c, c, 22); ctx.stroke();
  } else if (img) {
    const s = Math.min(c / img.width, c / img.height);
    const w = img.width * s, h = img.height * s;
    ctx.drawImage(img, x + (c - w) / 2, y + (c - h) / 2, w, h);
  }
  ctx.restore();
}

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
  plaque(r * 0.1 + 4, r * 0.1 + 16, w, h);
  ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fill();
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
      if (d.sous) texteOr(ctx, majuscule(d.sous), x + dx, 760 + lg.length * 62 + 20, 34, 'center', 480);
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
    if (s.sous) { ctx.globalAlpha = alpha * easeOut((t - 0.7) / 0.4); texteOr(ctx, majuscule(s.sous), 540, y, 48, 'center', 960); y += 100; }
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
          if (d.sous) texteOr(ctx, majuscule(d.sous), x, 470 + lg.length * ts * 1.05 + 14, 30, 'center', 470);
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
      if (s.titreMorceaux) texteMorceaux(ctx, s.titreMorceaux, 540, 330, 72, 940);
      else if (s.titre) texteIncline(ctx, majuscule(s.titre), 540, s.soustitre ? 318 : 330, 72, '#fff', 'center', '#ff7a00', 940);
      if (s.soustitre) texteOr(ctx, majuscule(s.soustitre), 540, 396, 38, 'center', 940);
      y0 = 470; pas = 164; h = 136;
    }
    if (s.entetesCols) {
      y0 += 56;
      ctx.save(); ctx.globalAlpha = alpha * easeOut((t - 0.3) / 0.4);
      texteOr(ctx, 'ÉQUIPE', 100, y0 - 40, 32, 'left');
      texteOr(ctx, majuscule(s.entetesCols[0]), 660, y0 - 40, 38, 'center');
      texteOr(ctx, majuscule(s.entetesCols[1]), 805, y0 - 40, 38, 'center');
      texteOr(ctx, majuscule(s.entetesCols[2]), 945, y0 - 40, 44, 'center');
      ctx.restore();
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
      ctx.fillStyle = l.accent || '#ff7a00'; ctx.fillRect(-490, -h / 2, 16, h);
      ctx.restore();
      if (l.match) {
        // « Équipe A  2 - 1  Équipe B » (ou « Équipe A  -  Équipe B » + date pour un match à venir)
        const m = l.match;
        const aScore = m.sa !== undefined && m.sb !== undefined && m.sa !== '' && m.sb !== '';
        const na = aScore ? parseInt(m.sa as string, 10) : null, nb = aScore ? parseInt(m.sb as string, 10) : null;
        const is = issuesMatch(na, nb);
        const ya = l.sous ? cy - 20 : cy;
        const avecV = !!(m.va?.url || m.va?.drapeau || m.vb?.url || m.vb?.drapeau);
        const largNom = avecV ? 250 : 310, tailleNom = avecV ? 40 : 44;
        texteIncline(ctx, majuscule(m.a), 405, ya, tailleNom, is ? texteIssue(is[0]) : '#fff', 'right', '#0b0b2a', largNom);
        texteIncline(ctx, majuscule(m.b), 675, ya, tailleNom, is ? texteIssue(is[1]) : '#fff', 'left', '#0b0b2a', largNom);
        // Plage écusson / drapeau : à gauche pour l'équipe A, à droite pour l'équipe B.
        const dessinerVisuel = (v: VisuelEquipe | undefined, x: number) => {
          if (!v) return;
          if (v.url) imageCarree(ctx, images.get(v.url) || null, x, ya - 40, 80, false, '');
          else if (v.drapeau) { ctx.save(); ctx.font = `64px ${POLICE}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(v.drapeau, x + 40, ya + 4); ctx.restore(); }
        };
        dessinerVisuel(m.va, 60);
        dessinerVisuel(m.vb, 940);
        const pr = (tr - 0.1) / 0.6;
        if (aScore) {
          texteIncline(ctx, valeurAnimee(m.sa as string, pr), 508, ya, 84, '#fff', 'right', '#bf00ff', 80);
          texteIncline(ctx, '-', 540, ya, 70, '#e9d5ff', 'center');
          texteIncline(ctx, valeurAnimee(m.sb as string, pr), 572, ya, 84, '#fff', 'left', '#bf00ff', 80);
        } else {
          texteIncline(ctx, '-', 540, ya, 80, '#fff', 'center', '#bf00ff');
        }
        if (l.sous) texteIncline(ctx, l.sous, 540, cy + 42, 32, l.couleurSous || '#e9d5ff', 'center', '#0b0b2a', 900);
      } else if (l.cols) {
        texteIncline(ctx, majuscule(l.label), 100, cy, 42, '#fff', 'left', '#0b0b2a', 500);
        const d = l.cols[1].trim();
        const cd = /^\+/.test(d) ? VERT : /^[-−–]\s*\d/.test(d) ? ROUGE : '#fff';
        const pr = (tr - 0.1) / 0.6;
        texteIncline(ctx, valeurAnimee(l.cols[0], pr), 660, cy, 50, '#fff', 'center', undefined, 110);
        texteIncline(ctx, d, 805, cy, 50, cd, 'center', '#0b0b2a', 130);
        texteIncline(ctx, valeurAnimee(l.cols[2], pr), 945, cy, 76, '#fff', 'center', '#bf00ff', 120);
      } else if (l.valeur2 !== undefined) {
        ctx.font = `italic 900 30px ${POLICE}`;
        texteIncline(ctx, majuscule(l.label), 540, cy - 40, 30, '#e9d5ff', 'center', undefined, 560);
        texteIncline(ctx, valeurAnimee(l.valeur, (tr - 0.1) / 0.6), 200, cy + 8, 92, '#fff', 'center', '#bf00ff', 280);
        texteIncline(ctx, valeurAnimee(l.valeur2, (tr - 0.1) / 0.6), 880, cy + 8, 92, '#fff', 'center', '#bf00ff', 280);
      } else {
        const largValeur = l.ecusson ? 0 : Math.min(360, Math.max(160, (l.valeur.length) * 52));
        const xTxt = l.photo ? 235 : 100;
        const maxL = (l.ecusson ? 860 : 960 - largValeur) - xTxt;
        if (l.photo) imageCarree(ctx, images.get(l.photo) || null, 90, cy - 56, 112, true, l.label);
        if (l.ecusson) imageCarree(ctx, images.get(l.ecusson) || null, 880, cy - 56, 112, false, '');
        if (l.sous) {
          texteIncline(ctx, majuscule(l.label), xTxt, cy - 26, 46, '#fff', 'left', undefined, maxL);
          texteIncline(ctx, l.sous, xTxt, cy + 32, 36, l.couleurSous || '#e9d5ff', 'left', '#0b0b2a', maxL);
        } else {
          texteIncline(ctx, majuscule(l.label), xTxt, cy, 46, '#e9d5ff', 'left', undefined, maxL);
        }
        if (!l.ecusson) texteIncline(ctx, valeurAnimee(l.valeur, (tr - 0.1) / 0.6), 990, cy, 96, '#fff', 'right', '#bf00ff', largValeur);
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
      const iss = idx === 0 ? s.i1 : s.i2;
      lg.forEach((l, i) => texteIncline(ctx, l, x + dx, 620 + i * ts * 1.05, ts, texteIssue(iss), 'center', ombreIssue(iss), 470));
    });
    const T0 = DEBUT_BUTS;
    const n = s.buts?.length || 0;
    const nb = n ? (t < T0 ? 0 : Math.min(n, Math.floor((t - T0) / PAS_BUT) + 1)) : 0;
    const tDernier = T0 + Math.max(0, n - 1) * PAS_BUT;
    // petit "coup" sur le score à chaque but
    const coup = n && nb > 0 ? 1 + 0.14 * Math.max(0, 1 - (t - (T0 + (nb - 1) * PAS_BUT)) / 0.35) : 1;
    ctx.save();
    ctx.translate(540, 1080); ctx.scale(Math.max(0.01, pop * coup), Math.max(0.01, pop * coup));
    if (s.s1 !== null && s.s2 !== null) {
      let a: string, b: string, couleurs = true;
      if (n) {
        a = String(s.buts!.slice(0, nb).filter(x => x.cote === 1).length);
        b = String(s.buts!.slice(0, nb).filter(x => x.cote === 2).length);
        couleurs = t > tDernier + 0.25; // les couleurs vert / rouge n'apparaissent qu'une fois le dernier but marqué
      } else {
        const p = (t - 0.4) / 1.0;
        a = String(Math.round(s.s1 * easeOut(p))); b = String(Math.round(s.s2 * easeOut(p)));
      }
      if (couleurs && s.i1 && s.i1 !== 'N') {
        // gagnant en vert, perdant en rouge ; le tiret reste fixe au centre
        ctx.font = `italic 900 260px ${POLICE}`;
        const demi = ctx.measureText(' - ').width / 2;
        texteIncline(ctx, a, -demi, 0, 260, texteIssue(s.i1), 'right', ombreIssue(s.i1), 420);
        texteIncline(ctx, '-', 0, 0, 260, '#fff', 'center', '#bf00ff', 120);
        texteIncline(ctx, b, demi, 0, 260, texteIssue(s.i2), 'left', ombreIssue(s.i2), 420);
      } else if (n) {
        ctx.font = `italic 900 260px ${POLICE}`;
        const demi = ctx.measureText(' - ').width / 2;
        texteIncline(ctx, a, -demi, 0, 260, '#fff', 'right', '#bf00ff', 420);
        texteIncline(ctx, '-', 0, 0, 260, '#fff', 'center', '#bf00ff', 120);
        texteIncline(ctx, b, demi, 0, 260, '#fff', 'left', '#bf00ff', 420);
      } else {
        texteIncline(ctx, a + ' - ' + b, 0, 0, 260, '#fff', 'center', '#bf00ff', 900);
      }
    } else {
      texteIncline(ctx, 'VS', 0, 0, 260, '#fff', 'center', '#bf00ff', 900);
    }
    ctx.restore();
    if (n && nb > 0) {
      // buteur du dernier but : minute, joueur, équipe
      const g = s.buts![nb - 1];
      const tg = t - (T0 + (nb - 1) * PAS_BUT);
      ctx.save();
      ctx.globalAlpha = alpha * clamp(tg / 0.2);
      ctx.translate(0, (1 - easeOut(tg / 0.3)) * 40);
      texteIncline(ctx, '⚽  ' + g.texte, 540, 1250, 46, '#fff', 'center', '#0b0b2a', 960);
      ctx.restore();
    }
    s.infos.slice(0, 4).forEach((inf, i) => {
      ctx.globalAlpha = alpha * easeOut((t - (n ? 0.3 : 1.0) - i * 0.2) / 0.4);
      pill(ctx, inf, 540, 1360 + i * 110, 40, '#fff', '#111');
    });
  }

  else if (s.k === 'quiztitre') {
    const pop = easeBack((t - 0.1) / 0.6);
    if (s.icone) {
      ctx.save(); ctx.translate(540, 520); ctx.scale(Math.max(0.01, pop), Math.max(0.01, pop));
      ctx.fillStyle = '#bf00ff'; ctx.beginPath(); ctx.roundRect(-170, -170, 340, 340, 80); ctx.fill();
      ctx.font = `170px ${POLICE}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#fff';
      ctx.fillText(s.icone, 0, 10);
      ctx.restore();
    }
    ctx.font = `italic 900 84px ${POLICE}`;
    let tt = 84;
    let lg = coupeLignes(ctx, majuscule(s.titre), 900);
    while (lg.length > 3 && tt > 48) { tt -= 6; ctx.font = `italic 900 ${tt}px ${POLICE}`; lg = coupeLignes(ctx, majuscule(s.titre), 900); }
    const ta = easeOut((t - 0.3) / 0.5);
    ctx.save(); ctx.globalAlpha = alpha * clamp(ta); ctx.translate(0, (1 - ta) * 50);
    lg.slice(0, 3).forEach((l, i) => texteIncline(ctx, l, 540, 860 + i * tt * 1.1, tt, '#111', 'center', undefined, 940));
    if (s.sous) texteIncline(ctx, majuscule(s.sous), 540, 860 + Math.min(3, lg.length) * tt * 1.1 + 40, 38, '#bf00ff', 'center', undefined, 940);
    ctx.restore();
    if (s.pill) { ctx.globalAlpha = alpha * easeOut((t - 0.9) / 0.4); pill(ctx, s.pill, 540, 1330, 44, '#bf00ff', '#fff'); }
  }

  else if (s.k === 'quiz') {
    const reveal = s.bonne ? LECTURE_Q + REPONSE_Q : 1e9;
    pill(ctx, 'QUESTION ' + s.numero + ' / ' + s.total, 540, 330, 56, '#bf00ff', '#fff');
    // la question
    ctx.font = `italic 900 60px ${POLICE}`;
    let taille = 60;
    let lg = coupeLignes(ctx, s.question, 850);
    while ((lg.length > 5 || lg.length * taille * 1.22 > 380) && taille > 36) { taille -= 4; ctx.font = `italic 900 ${taille}px ${POLICE}`; lg = coupeLignes(ctx, s.question, 850); }
    lg = lg.slice(0, 5);
    const hCarte = lg.length * taille * 1.22 + 80;
    const qa = easeOut((t - 0.1) / 0.5);
    ctx.save();
    ctx.globalAlpha = alpha * clamp(qa);
    ctx.translate(0, (1 - qa) * 60);
    ctx.save();
    ctx.translate(540, 430 + hCarte / 2); ctx.transform(1, 0, -0.06, 1, 0, 0);
    ctx.fillStyle = '#f5f3ff'; ctx.fillRect(-490, -hCarte / 2, 980, hCarte);
    ctx.fillStyle = '#bf00ff'; ctx.fillRect(-490, -hCarte / 2, 16, hCarte);
    ctx.restore();
    lg.forEach((l, i) => texteIncline(ctx, l, 540, 430 + 40 + taille * 0.61 + i * taille * 1.22, taille, '#111', 'center', undefined, 880));
    ctx.restore();
    // les choix (après 3 s)
    const yOpt = 430 + hCarte + 60;
    const nOpt = Math.max(1, s.options.length);
    const pasOpt = Math.min(165, (1500 - yOpt) / nOpt);
    const hOpt = pasOpt - 22;
    s.options.forEach((o, i) => {
      const tr = t - LECTURE_Q - i * 0.12;
      if (tr < 0) return;
      const p = easeBack(tr / 0.3);
      const cy = yOpt + i * pasOpt + hOpt / 2;
      const rev = t >= reveal;
      const bonne = rev && o.cle === s.bonne;
      const estompee = rev && !bonne;
      ctx.save();
      ctx.globalAlpha = alpha * clamp(tr / 0.2) * (estompee ? 0.35 : 1);
      ctx.translate((1 - Math.min(1, p)) * 800, 0);
      const pulse = bonne ? 1 + 0.03 * Math.max(0, 1 - (t - reveal) / 0.4) : 1;
      ctx.save();
      ctx.translate(540, cy); ctx.scale(pulse, pulse); ctx.transform(1, 0, -0.08, 1, 0, 0);
      ctx.fillStyle = bonne ? '#bf00ff' : '#f5f3ff'; ctx.fillRect(-490, -hOpt / 2, 980, hOpt);
      ctx.strokeStyle = bonne ? '#bf00ff' : '#ddd6fe'; ctx.lineWidth = 4; ctx.strokeRect(-490, -hOpt / 2, 980, hOpt);
      ctx.fillStyle = bonne ? '#111' : '#ff7a00'; ctx.fillRect(-490, -hOpt / 2, hOpt, hOpt);
      ctx.restore();
      texteIncline(ctx, o.cle, 540 - 490 + hOpt / 2 - 6, cy, hOpt * 0.62, '#fff', 'center', undefined, hOpt - 20);
      ctx.font = `italic 900 54px ${POLICE}`;
      const lo = coupeLignes(ctx, o.texte, 700).slice(0, 2);
      const to = lo.length > 1 ? 42 : 54;
      lo.forEach((l, k) => texteIncline(ctx, l, 540 - 490 + hOpt + 28, cy + (k - (lo.length - 1) / 2) * to * 1.15, to, bonne ? '#fff' : '#111', 'left', undefined, 740 - hOpt + 80));
      if (bonne) texteIncline(ctx, '✓', 540 + 440, cy, 70, '#fff', 'center', undefined, 90);
      ctx.restore();
    });
    // 5 s pour répondre : barre qui se vide
    if (t >= LECTURE_Q && t < reveal) {
      const prog = clamp((t - LECTURE_Q) / REPONSE_Q);
      ctx.save();
      ctx.globalAlpha = alpha;
      const yb = 1600;
      ctx.fillStyle = '#e5e7eb'; ctx.fillRect(110, yb - 18, 860, 36);
      const gr = ctx.createLinearGradient(110, 0, 970, 0);
      gr.addColorStop(0, '#bf00ff'); gr.addColorStop(1, '#ff7a00');
      ctx.fillStyle = prog > 0.7 ? '#ef4444' : gr;
      ctx.fillRect(110, yb - 18, 860 * (1 - prog), 36);
      texteIncline(ctx, '⏱ ' + Math.max(0, Math.ceil(REPONSE_Q * (1 - prog))) + ' s', 540, yb + 70, 54, '#111', 'center', undefined, 400);
      ctx.restore();
    }
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
    if (s.sous && s.sous.startsWith('🎁')) texteOr(ctx, majuscule(s.sous), 540, yb + 150, 38, 'center', 940);
    else if (s.sous) texteIncline(ctx, majuscule(s.sous), 540, yb + 150, 34, '#e9d5ff', 'center', undefined, 940);
  }

  ctx.restore();
}

function dessinerOutro(ctx: Ctx, t: number, duree: number) {
  const sortie = clamp((duree - t) / 0.3);
  ctx.save(); ctx.globalAlpha = sortie;
  const SOL = 660, R = 100;
  // Trajectoire du ballon : chute, deux rebonds de plus en plus petits, puis repos.
  let y = SOL, impact = 0;
  if (t < 0.5) y = -260 + (SOL + 260) * Math.pow(t / 0.5, 2);
  else if (t < 1.1) { const u = (t - 0.5) / 0.6; y = SOL - 4 * 270 * u * (1 - u); }
  else if (t < 1.5) { const u = (t - 1.1) / 0.4; y = SOL - 4 * 90 * u * (1 - u); }
  for (const ti of [0.5, 1.1, 1.5]) impact = Math.max(impact, 1 - Math.abs(t - ti) / 0.09);
  impact = clamp(impact);
  const rot = 13 * easeOut(t / 1.8);
  const ancrage = clamp((t - 1.5) / 0.35); // le logo se forme autour du ballon posé

  // ombre au sol, qui s'élargit quand le ballon redescend
  const haut = clamp((SOL - y) / 600);
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath(); ctx.ellipse(540, SOL + 205, (150 - 70 * haut) * (1 + impact * 0.1), (26 - 12 * haut), 0, 0, Math.PI * 2); ctx.fill();
  ctx.restore();

  // onde de choc + plaque violette au moment où le ballon se pose
  if (t > 1.5) {
    const tp = t - 1.5;
    const pp = easeBack(tp / 0.5);
    ctx.save();
    ctx.translate(540, SOL); ctx.scale(Math.max(0.01, pp), Math.max(0.01, pp));
    const lueur = ctx.createRadialGradient(0, 0, 120, 0, 0, 330);
    lueur.addColorStop(0, 'rgba(191,0,255,0.55)'); lueur.addColorStop(1, 'rgba(191,0,255,0)');
    ctx.fillStyle = lueur; ctx.fillRect(-330, -330, 660, 660);
    ctx.fillStyle = '#bf00ff';
    ctx.beginPath(); ctx.roundRect(-190, -190, 380, 380, 90); ctx.fill();
    ctx.restore();
    const onde = clamp(tp / 0.9);
    ctx.save();
    ctx.globalAlpha = sortie * (1 - onde) * 0.8;
    ctx.strokeStyle = '#ff7a00'; ctx.lineWidth = 14;
    ctx.beginPath(); ctx.roundRect(540 - 190 - onde * 190, SOL - 190 - onde * 190, 380 + onde * 380, 380 + onde * 380, 90 + onde * 140); ctx.stroke();
    ctx.restore();
  }

  // le ballon (écrasé à l'impact, qui tourne en roulant)
  ctx.save();
  ctx.translate(540, y);
  ctx.scale(1 + impact * 0.16, 1 - impact * 0.16);
  ctx.rotate(rot);
  ctx.font = `${200 - ancrage * 40}px ${POLICE}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#fff';
  ctx.fillText('⚽', 0, 10);
  ctx.restore();

  // textes
  const ap = (t0: number) => easeOut((t - t0) / 0.45);
  const m = ap(1.65);
  if (m > 0) { ctx.save(); ctx.globalAlpha = sortie * clamp(m); ctx.translate(0, (1 - m) * 70); texteIncline(ctx, 'MAKEGOAL', 540, 1000, 140, '#fff', 'center', '#bf00ff', 960); ctx.restore(); }
  const u = ap(2.0);
  if (u > 0) { ctx.save(); ctx.globalAlpha = sortie * clamp(u); ctx.translate(0, (1 - u) * 60); pill(ctx, 'makegoal.vercel.app', 540, 1160, 52, '#fff', '#111'); ctx.restore(); }
  const g = ap(2.3);
  if (g > 0) { ctx.save(); ctx.globalAlpha = sortie * clamp(g); ctx.translate(0, (1 - g) * 50); texteIncline(ctx, "N AP ENFÒME W", 540, 1320, 48, '#e9d5ff', 'center'); ctx.restore(); }
  ctx.restore();
}

// ---------- Moteur ----------
const DUREE_OUTRO = 3.6;

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

// Profil d'enregistrement. Un téléphone enregistre en 720 x 1280 à débit réduit : l'image est nette
// pour les réseaux sociaux et la vidéo entière (une seule, quelle que soit sa durée) reste légère,
// ce qui évite de faire planter le navigateur. Un ordinateur garde le 1080 x 1920.
function profil(): { echelle: number; debit: number } {
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  const mobile = /Android|iPhone|iPad|iPod|Mobile/i.test(ua) || (typeof navigator !== 'undefined' && navigator.maxTouchPoints > 1 && typeof screen !== 'undefined' && screen.width < 900);
  return mobile ? { echelle: 2 / 3, debit: 5_000_000 } : { echelle: 1, debit: 8_000_000 };
}

export type PartieVideo = { blob: Blob; ext: string; duree: number };
type Progression = (pct: number, etape: string, duree?: number, nbScenes?: number) => void;

export async function genererVideos(post: VideoPost, onProgress: Progression, signal?: { annule: boolean }): Promise<PartieVideo[]> {
  const format = choisirFormat();
  if (!format) throw new Error("Ce navigateur ne sait pas enregistrer de vidéo. Utilisez Chrome.");
  const scenes = construireScenes(post);
  if (!scenes.length) throw new Error('Rien à mettre en vidéo pour ce post.');
  const parties = [scenes]; // une seule vidéo, jamais découpée
  const { echelle, debit } = profil();
  const totalGlobal = dureeTotale(scenes);

  onProgress(0, 'Chargement des images…', Math.round(totalGlobal), scenes.length);
  const urls = new Set<string>();
  scenes.forEach(s => {
    if (s.k === 'intro') { if (s.photo) urls.add(s.photo); s.duo?.forEach(d => { if (d.photo) urls.add(d.photo); }); }
    if (s.k === 'lignes') s.lignes.forEach(l => { if (l.photo && l.photo !== PHOTO_ABSENTE) urls.add(l.photo); if (l.ecusson) urls.add(l.ecusson); if (l.match?.va?.url) urls.add(l.match.va.url); if (l.match?.vb?.url) urls.add(l.match.vb.url); });
    if (s.k === 'lignes' && s.entete) { if (s.entete.photo) urls.add(s.entete.photo); s.entete.duo?.forEach(d => { if (d.photo) urls.add(d.photo); }); }
  });
  const images: Images = new Map();
  await Promise.all([...urls].map(async u => { images.set(u, await chargerImage(u)); }));

  const canvas = document.createElement('canvas');
  canvas.width = Math.round(LARGEUR * echelle); canvas.height = Math.round(HAUTEUR * echelle);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas indisponible.');
  const statique = fondStatique();

  const resultats: PartieVideo[] = [];
  let dejaFait = 0;
  for (let ip = 0; ip < parties.length; ip++) {
    const sc = parties[ip];
    const derniere = ip === parties.length - 1;
    const total = sc.reduce((a, x) => a + x.duree, 0) + (derniere ? DUREE_OUTRO : 0);
    const etape = 'Enregistrement…';

    const dessiner = (t: number) => {
      ctx.setTransform(echelle, 0, 0, echelle, 0, 0);
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
        dessinerEntete(ctx, badge, 1, fond === 'QUIZ');
        dessinerScene(ctx, courante.s, courante.local, images);
      } else {
        dessinerOutro(ctx, reste, DUREE_OUTRO);
      }
    };

    const flux = canvas.captureStream(30);
    const rec = new MediaRecorder(flux, { mimeType: format.mime, videoBitsPerSecond: debit });
    const morceaux: Blob[] = [];
    rec.ondataavailable = e => { if (e.data.size) morceaux.push(e.data); };
    const fini = new Promise<void>(res => { rec.onstop = () => res(); });

    dessiner(0);
    rec.start(500);
    const debut = performance.now();
    let derniereMaj = 0;
    await new Promise<void>(resolve => {
      const boucle = () => {
        const t = (performance.now() - debut) / 1000;
        if ((signal && signal.annule) || t >= total) { resolve(); return; }
        dessiner(t);
        // La barre de progression ne se met à jour que 3 fois par seconde : chaque mise à jour redessine
        // toute la page d'administration, ce qui, à chaque image, épuise la mémoire d'un téléphone.
        const maintenant = performance.now();
        if (maintenant - derniereMaj > 330) {
          derniereMaj = maintenant;
          const pct = Math.round(((dejaFait + t) / totalGlobal) * 100);
          onProgress(Math.min(99, pct), etape, Math.round(totalGlobal), scenes.length);
        }
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
