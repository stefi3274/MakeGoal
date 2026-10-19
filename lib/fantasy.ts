// Source UNIQUE de « MakeGoal Fantasy » (jeu gratuit, équipe virtuelle) : règles, validation de l'équipe,
// calcul des points et lecture des textes collés par l'admin. Utilisé par la page joueur, l'admin et les routes API.

export type Poste = 'G' | 'D' | 'M' | 'A';
export const POSTES: Poste[] = ['G', 'D', 'M', 'A'];
export const LIBELLE_POSTE: Record<Poste, string> = { G: 'Gardien', D: 'Défenseur', M: 'Milieu', A: 'Attaquant' };
export const LIBELLE_POSTE_PLURIEL: Record<Poste, string> = { G: 'Gardiens', D: 'Défenseurs', M: 'Milieux', A: 'Attaquants' };

// ---------- Règles du jeu ----------
export const MONNAIE = 'FanCoins';           // nom de la monnaie virtuelle (sans valeur réelle)
export const montant = (n: number) => n.toLocaleString('fr-FR').replace(/ /g, ' ') + ' ' + MONNAIE;
export const BUDGET_DEPART = 10000;          // FanCoins virtuels offerts à l'inscription
export const NB_TITULAIRES = 11;
export const MAX_RESERVISTES = 4;
export const MAX_PAR_CLUB = 3;               // joueurs du même club dans l'effectif
export const TRANSFERTS_PAR_JOURNEE = 3;     // changements de joueurs autorisés entre deux journées
export const FACTEUR_CLASSEMENT = 1;         // points Fantasy -> points du classement général MakeGoal
export const FORMATION_MIN: Record<Poste, number> = { G: 1, D: 3, M: 2, A: 1 };
export const FORMATION_MAX: Record<Poste, number> = { G: 1, D: 5, M: 5, A: 3 };

export type JoueurFantasy = { id: string; nom: string; poste: Poste; club: string; pays?: string | null; prix: number; photo?: string | null; actif: boolean; competition?: string | null };
export type EquipeFantasy = { titulaires: string[]; reservistes: string[]; capitaine: string | null };

const norm = (s: string) => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '');

export function compterPostes(ids: string[], joueurs: Map<string, JoueurFantasy>): Record<Poste, number> {
  const c: Record<Poste, number> = { G: 0, D: 0, M: 0, A: 0 };
  ids.forEach(id => { const j = joueurs.get(id); if (j) c[j.poste]++; });
  return c;
}

export const formationValide = (c: Record<Poste, number>) => POSTES.every(p => c[p] >= FORMATION_MIN[p] && c[p] <= FORMATION_MAX[p]) && POSTES.reduce((n, p) => n + c[p], 0) === NB_TITULAIRES;
export const formationTexte = (c: Record<Poste, number>) => c.D + '-' + c.M + '-' + c.A;
export const coutEquipe = (eq: EquipeFantasy, joueurs: Map<string, JoueurFantasy>) => [...eq.titulaires, ...eq.reservistes].reduce((n, id) => n + (joueurs.get(id)?.prix || 0), 0);

export function validerEquipe(eq: EquipeFantasy, joueurs: Map<string, JoueurFantasy>, budget = BUDGET_DEPART): { ok: boolean; erreurs: string[]; cout: number } {
  const erreurs: string[] = [];
  const tous = [...eq.titulaires, ...eq.reservistes];
  if (eq.titulaires.length !== NB_TITULAIRES) erreurs.push('Il faut ' + NB_TITULAIRES + ' titulaires (' + eq.titulaires.length + ' choisis).');
  if (eq.reservistes.length > MAX_RESERVISTES) erreurs.push('Maximum ' + MAX_RESERVISTES + ' réservistes.');
  if (new Set(tous).size !== tous.length) erreurs.push('Un joueur ne peut apparaître qu\'une fois dans ton équipe.');
  for (const id of tous) {
    const j = joueurs.get(id);
    if (!j) { erreurs.push('Joueur introuvable.'); break; }
    if (!j.actif) { erreurs.push(j.nom + ' n\'est plus disponible.'); break; }
  }
  if (!erreurs.length) {
    const c = compterPostes(eq.titulaires, joueurs);
    if (!formationValide(c)) erreurs.push('Composition invalide : 1 gardien, 3 à 5 défenseurs, 2 à 5 milieux, 1 à 3 attaquants.');
    if (compterPostes(eq.reservistes, joueurs).G > 1) erreurs.push('Un seul gardien réserviste.');
    const clubs: Record<string, number> = {};
    for (const id of tous) { const cl = (joueurs.get(id)?.club || '').trim().toLowerCase(); if (cl) clubs[cl] = (clubs[cl] || 0) + 1; }
    const trop = Object.entries(clubs).find(([, n]) => n > MAX_PAR_CLUB);
    if (trop) erreurs.push('Maximum ' + MAX_PAR_CLUB + ' joueurs du même club.');
  }
  if (!eq.capitaine || !eq.titulaires.includes(eq.capitaine)) erreurs.push('Choisis un capitaine parmi tes titulaires.');
  const cout = coutEquipe(eq, joueurs);
  if (cout > budget) erreurs.push('Budget dépassé : ' + cout + ' ' + MONNAIE + ' sur ' + budget + ' ' + MONNAIE + '.');
  return { ok: erreurs.length === 0, erreurs, cout };
}

// Nombre de joueurs nouveaux par rapport à l'effectif de la dernière journée jouée (changer de capitaine
// ou échanger titulaire/réserviste ne compte pas).
export function nbTransferts(actuelle: EquipeFantasy, precedente: EquipeFantasy | null): number {
  if (!precedente) return 0;
  const avant = new Set([...precedente.titulaires, ...precedente.reservistes]);
  return [...actuelle.titulaires, ...actuelle.reservistes].filter(id => !avant.has(id)).length;
}

// ---------- Points d'un joueur pour une journée ----------
export type StatsJoueur = {
  minutes: number; buts: number; passes: number; cleanSheet: boolean; encaisses: number; arrets: number;
  jaunes: number; rouges: number; csc: number; penaltyRate: number; penaltyArrete: number; bonus: number;
};
export const STATS_VIDES: StatsJoueur = { minutes: 0, buts: 0, passes: 0, cleanSheet: false, encaisses: 0, arrets: 0, jaunes: 0, rouges: 0, csc: 0, penaltyRate: 0, penaltyArrete: 0, bonus: 0 };

export const POINTS_BUT: Record<Poste, number> = { G: 6, D: 6, M: 5, A: 4 };
export const REGLES_POINTS: { libelle: string; valeur: string }[] = [
  { libelle: 'Jouer moins de 60 minutes', valeur: '+1' },
  { libelle: 'Jouer 60 minutes ou plus', valeur: '+2' },
  { libelle: 'But (gardien ou défenseur)', valeur: '+6' },
  { libelle: 'But (milieu)', valeur: '+5' },
  { libelle: 'But (attaquant)', valeur: '+4' },
  { libelle: 'Passe décisive', valeur: '+3' },
  { libelle: 'Aucun but encaissé (gardien ou défenseur, 60 min)', valeur: '+4' },
  { libelle: 'Aucun but encaissé (milieu, 60 min)', valeur: '+1' },
  { libelle: 'Gardien : 3 arrêts', valeur: '+1' },
  { libelle: 'Penalty arrêté', valeur: '+5' },
  { libelle: 'Gardien ou défenseur : 2 buts encaissés', valeur: '-1' },
  { libelle: 'Penalty raté', valeur: '-2' },
  { libelle: 'But contre son camp', valeur: '-2' },
  { libelle: 'Carton jaune', valeur: '-1' },
  { libelle: 'Carton rouge', valeur: '-3' },
  { libelle: 'Bonus homme du match (donné par MakeGoal)', valeur: '+1 à +3' },
];

export function pointsJoueur(poste: Poste, s: StatsJoueur): number {
  if (!s || s.minutes <= 0) return 0;
  let p = s.minutes >= 60 ? 2 : 1;
  p += s.buts * POINTS_BUT[poste];
  p += s.passes * 3;
  if (s.cleanSheet && s.minutes >= 60) p += poste === 'G' || poste === 'D' ? 4 : poste === 'M' ? 1 : 0;
  if (poste === 'G' || poste === 'D') p -= Math.floor(s.encaisses / 2);
  if (poste === 'G') p += Math.floor(s.arrets / 3);
  p -= s.jaunes;
  p -= s.rouges * 3;
  p -= s.csc * 2;
  p -= s.penaltyRate * 2;
  p += s.penaltyArrete * 5;
  p += Math.max(0, Math.min(5, s.bonus));
  return p;
}

// ---------- Points d'une équipe pour une journée ----------
export type PerfJoueur = { poste: Poste; minutes: number; points: number };
export type DetailLigne = { id: string; points: number; role: 'titulaire' | 'remplacant'; capitaine?: boolean };

// Un titulaire qui n'a pas joué est remplacé par le premier réserviste (dans l'ordre) qui a joué et qui garde
// une composition valide. Le capitaine compte double s'il a joué.
export function scoreEquipe(eq: EquipeFantasy, perfs: Map<string, PerfJoueur>, joueurs: Map<string, JoueurFantasy>): { total: number; detail: DetailLigne[]; remplacements: { sort: string; entre: string }[] } {
  const aJoue = (id: string) => (perfs.get(id)?.minutes || 0) > 0;
  let finale = [...eq.titulaires];
  const utilises = new Set<string>();
  const remplacements: { sort: string; entre: string }[] = [];
  for (const sort of eq.titulaires) {
    if (aJoue(sort)) continue;
    for (const res of eq.reservistes) {
      if (utilises.has(res) || !aJoue(res)) continue;
      const essai = finale.map(x => x === sort ? res : x);
      if (formationValide(compterPostes(essai, joueurs))) { finale = essai; utilises.add(res); remplacements.push({ sort, entre: res }); break; }
    }
  }
  const detail: DetailLigne[] = [];
  let total = 0;
  for (const id of finale) {
    let pts = perfs.get(id)?.points || 0;
    const cap = id === eq.capitaine && aJoue(id);
    if (cap) pts *= 2;
    total += pts;
    detail.push({ id, points: pts, role: utilises.has(id) ? 'remplacant' : 'titulaire', capitaine: cap || undefined });
  }
  return { total, detail, remplacements };
}

// ---------- Textes collés par l'admin ----------
const POSTE_ALIAS: Record<string, Poste> = {
  g: 'G', gk: 'G', gb: 'G', gardien: 'G', goal: 'G', goalkeeper: 'G',
  d: 'D', def: 'D', defenseur: 'D', defenseurs: 'D', defender: 'D', arriere: 'D',
  m: 'M', mil: 'M', milieu: 'M', midfielder: 'M',
  a: 'A', att: 'A', attaquant: 'A', avant: 'A', forward: 'A', buteur: 'A',
};
export const lirePoste = (txt: string): Poste | null => POSTE_ALIAS[norm(txt)] || null;

export type JoueurSaisi = { nom: string; poste: Poste; club: string; prix: number; pays: string; competition: string };

// Format (un joueur par ligne) :  Nom - Poste - Club - Prix [- Pays]
//   Wilson Isidor - A - Lyon - 900
//   Duckens Nazon - Attaquant - Standard de Liège - 700
export function parserJoueurs(texte: string): { joueurs: JoueurSaisi[]; ignorees: string[] } {
  const joueurs: JoueurSaisi[] = [];
  const ignorees: string[] = [];
  (texte || '').split('\n').map(l => l.trim()).filter(Boolean).forEach(brut => {
    const segs = brut.split(/\s+[-–]\s+|\s*\|\s*/).map(s => s.trim()).filter(Boolean);
    const poste = segs[1] ? lirePoste(segs[1]) : null;
    if (!segs[0] || !poste) { ignorees.push(brut); return; }
    const club = segs[2] && !/^\d+$/.test(segs[2]) ? segs[2] : '';
    const prixSeg = segs.slice(2).find(s => /^\d[\d\s]*\$?$/.test(s));
    const prix = prixSeg ? parseInt(prixSeg.replace(/\D/g, ''), 10) : 500;
    const pays = segs.slice(2).find(s => s !== club && s !== prixSeg) || '';
    joueurs.push({ nom: segs[0], poste, club, prix: Math.max(100, Math.min(3000, prix || 500)), pays, competition: '' });
  });
  return { joueurs, ignorees };
}

function lireJetons(reste: string): { stats: StatsJoueur; inconnus: string[]; minutesDonnees: boolean } {
  const s: StatsJoueur = { ...STATS_VIDES };
  let minutesDonnees = false;
  const inconnus: string[] = [];
  reste.split(/[,;]/).map(t => t.trim()).filter(Boolean).forEach(tok => {
    const n = tok.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    let m: RegExpMatchArray | null;
    if ((m = n.match(/^(\d{1,3})\s*(?:min(?:utes?)?|')?$/))) { s.minutes = parseInt(m[1], 10); minutesDonnees = true; return; }
    if ((m = n.match(/^(\d+)\s*but/))) { s.buts += parseInt(m[1], 10); return; }
    if (/^but$/.test(n)) { s.buts += 1; return; }
    if ((m = n.match(/^(\d+)\s*pass/))) { s.passes += parseInt(m[1], 10); return; }
    if (/^pass/.test(n)) { s.passes += 1; return; }
    if (/clean\s*sheet|^cs$|bunker|cage inviolee|inviole/.test(n)) { s.cleanSheet = true; return; }
    if ((m = n.match(/^(\d+)\s*encaiss/))) { s.encaisses = parseInt(m[1], 10); return; }
    if ((m = n.match(/^(\d+)\s*arret/))) { s.arrets = parseInt(m[1], 10); return; }
    if ((m = n.match(/^(\d+)?\s*jaunes?$/))) { s.jaunes += m[1] ? parseInt(m[1], 10) : 1; return; }
    if ((m = n.match(/^(\d+)?\s*rouges?$/))) { s.rouges += m[1] ? parseInt(m[1], 10) : 1; return; }
    if (/^csc$|contre son camp/.test(n)) { s.csc += 1; return; }
    if (/penalty\s*(rate|manque)|pen\.?\s*rate/.test(n)) { s.penaltyRate += 1; return; }
    if (/penalty\s*arrete|pen\.?\s*arrete/.test(n)) { s.penaltyArrete += 1; return; }
    if ((m = n.match(/^bonus\s*\+?(\d)$/))) { s.bonus = parseInt(m[1], 10); return; }
    inconnus.push(tok);
  });
  return { stats: s, inconnus, minutesDonnees };
}

// Format (un joueur par ligne) :  Nom - minutes, buts, passes, clean sheet, jaune, rouge, ...
//   Wilson Isidor - 90, 2 buts, 1 passe, bonus 3
//   Johny Placide - 90, clean sheet, 4 arrêts
//   Steeven Saba - 25            (a joué 25 minutes)
//   Marc Lee                     (cité sans détail : 90 minutes, sans événement)
// Un joueur de la liste qui n'est pas cité n'a pas joué (0 point).
export function parserStatsJournee(texte: string, joueurs: JoueurFantasy[]): { entrees: Map<string, StatsJoueur>; inconnus: string[]; ignorees: string[] } {
  const entrees = new Map<string, StatsJoueur>();
  const inconnus: string[] = [];
  const ignorees: string[] = [];
  const index = joueurs.map(j => ({ j, n: norm(j.nom) }));
  (texte || '').split('\n').map(l => l.trim()).filter(Boolean).forEach(brut => {
    const pos = brut.search(/\s+[-–:]\s+|\s*\|\s*/);
    const nom = (pos < 0 ? brut : brut.slice(0, pos)).trim();
    const reste = pos < 0 ? '' : brut.slice(pos).replace(/^\s*[-–:|]\s*/, '');
    const n = norm(nom);
    if (!n) { ignorees.push(brut); return; }
    let cible = index.find(x => x.n === n)?.j;
    if (!cible) {
      const cands = index.filter(x => x.n.endsWith(n) || n.endsWith(x.n) || x.n.includes(n));
      if (cands.length === 1) cible = cands[0].j;
    }
    if (!cible) { inconnus.push(nom); return; }
    const { stats, inconnus: bad, minutesDonnees } = lireJetons(reste);
    if (!minutesDonnees) stats.minutes = 90; // cité sans minutes : il a joué le match en entier
    bad.forEach(b => ignorees.push(nom + ' : ' + b));
    entrees.set(cible.id, stats);
  });
  return { entrees, inconnus, ignorees };
}
