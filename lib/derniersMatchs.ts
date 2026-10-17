// Source UNIQUE de « Derniers matchs » d'une équipe (admin, post public, vidéo).
// Jusqu'à 10 matchs. score1 = buts de l'équipe, score2 = buts de l'adversaire.
import { normaliserDate, memeEquipe, nettoyerFinLigne } from './confrontations';
import { extraireLieu, Lieu, gaucheEstDomicile, adversaireAGauche } from './lieu';

// exterieur = true : l'équipe joue à l'extérieur (l'adversaire s'affiche à gauche). score1 = score de l'équipe.
export type DernierMatch = { date: string; competition: string; adversaire: string; score1: string; score2: string; exterieur?: boolean };
export type DerniersMatchsDetails = { equipe: string; matchs: DernierMatch[]; ecussons?: Record<string, string> };

export const MAX_DERNIERS = 10;
export const DERNIER_VIDE: DernierMatch = { date: '', competition: '', adversaire: '', score1: '', score2: '', exterieur: false };
export const DERNIERS_VIDE: DerniersMatchsDetails = { equipe: '', matchs: [{ ...DERNIER_VIDE }] };

export type IssueD = 'G' | 'P' | 'N';
const num = (v: string | null | undefined): number | null => {
  const t = (v ?? '').toString().trim();
  return /^\d+$/.test(t) ? parseInt(t, 10) : null;
};

// « 10 derniers matchs », « 5 derniers matchs », « 1 dernier match » : le nombre suit toujours ce qui est publié.
export const libelleDerniers = (n: number) => (n <= 1 ? 'Dernier match' : n + ' derniers matchs');
export const dernierValide = (m: DernierMatch) => num(m.score1) !== null && num(m.score2) !== null && m.adversaire.trim() !== '';
export const derniersPublies = (matchs: DernierMatch[]) => matchs.filter(dernierValide).slice(0, MAX_DERNIERS);

// G = victoire de l'équipe, P = défaite, N = nul.
export function issueDernier(m: DernierMatch): IssueD | null {
  const a = num(m.score1), b = num(m.score2);
  if (a === null || b === null) return null;
  return a > b ? 'G' : a < b ? 'P' : 'N';
}

// Ordre d'affichage : football = l'équipe qui reçoit est à gauche ; basketball = l'équipe qui se déplace est à gauche.
export function affichageDernier(equipe: string, m: DernierMatch, sport?: string | null) {
  return adversaireAGauche(sport, m.exterieur)
    ? { a: m.adversaire, b: equipe, sa: m.score2.trim(), sb: m.score1.trim() }
    : { a: equipe, b: m.adversaire, sa: m.score1.trim(), sb: m.score2.trim() };
}

export function bilanDerniers(matchs: DernierMatch[]) {
  let v = 0, n = 0, d = 0, bp = 0, bc = 0;
  matchs.forEach(m => {
    const i = issueDernier(m);
    if (!i) return;
    if (i === 'G') v++; else if (i === 'P') d++; else n++;
    bp += num(m.score1) || 0; bc += num(m.score2) || 0;
  });
  return { v, n, d, bp, bc, total: v + n + d };
}

// Format (une ligne par match) :
//   Haïti                                        (1re ligne facultative : l'équipe)
//   12/03/2022 | Gold Cup | Haïti 2-1 Cuba
//   05/09/2019 - Éliminatoires - Cuba 0-3 Haïti  (le score est orienté vers l'équipe)
//   2026-09-19 | La Liga | Real Betis 1-3 FC Barcelone (E)   (marqueur facultatif : (D) domicile, (E) extérieur)
// Règles : le score suit toujours les NOMS (l'équipe est reconnue même écrite « Betis » ou « FC Betis »).
// Le lieu vient du marqueur s'il existe, sinon de la position (football : équipe écrite à droite = à l'extérieur ;
// basketball : équipe écrite à gauche = à l'extérieur, car le visiteur est cité en premier).
// Sans 1re ligne, l'équipe est celle qui apparaît dans le plus de lignes.
export function parserDerniers(texte: string, sport?: string | null): { details: DerniersMatchsDetails; ignorees: string[] } {
  const lignes = (texte || '').split('\n').map(l => l.trim()).filter(Boolean);
  const ignorees: string[] = [];
  let equipe = '';
  const RE_SCORE = /^(.+?)\s+(\d+)\s*[-–:]\s*(\d+)\s+(.+)$/;
  type Brut = { a: string; b: string; s1: string; s2: string; date: string; comp: string; lieu: Lieu };
  const brutes: Brut[] = [];
  lignes.forEach((ligne, idx) => {
    const { lieu, texte: brut } = extraireLieu(ligne);
    const segs = brut.split(/\s*\|\s*|\s+[-–—]\s+/).map(s => s.trim()).filter(Boolean);
    const nett = nettoyerFinLigne(segs[segs.length - 1] || '');
    const m = nett.texte.match(RE_SCORE);
    if (!m) {
      if (idx === 0 && segs.length === 1) equipe = brut; else ignorees.push(ligne);
      return;
    }
    const avant = segs.slice(0, -1);
    const comp0 = avant.length > 1 ? avant.slice(1).join(' - ') : '';
    brutes.push({ a: m[1].trim(), b: m[4].trim(), s1: m[2], s2: m[3], date: avant.length ? normaliserDate(avant[0]) : '', comp: comp0 + (nett.mention ? (comp0 ? ' ' : '') + '(' + nett.mention + ')' : ''), lieu });
  });
  // Sans en-tête : l'équipe est celle présente dans le plus de lignes.
  if (!equipe && brutes.length) {
    const candidats = [brutes[0].a, brutes[0].b];
    let meilleur = candidats[0], max = -1;
    candidats.forEach(c => {
      const n = brutes.filter(x => memeEquipe(x.a, c) || memeEquipe(x.b, c)).length;
      if (n > max) { max = n; meilleur = c; }
    });
    equipe = meilleur;
  }
  const matchs: DernierMatch[] = brutes.map(x => {
    const mA = memeEquipe(x.a, equipe), mB = memeEquipe(x.b, equipe);
    // Côté de l'équipe : reconnu par le nom ; sinon le marqueur décide ; sinon à gauche.
    const dom = gaucheEstDomicile(sport);
    const droite = mB && !mA ? true : mA && !mB ? false : (dom ? x.lieu === 'ext' : x.lieu === 'dom');
    // Position : football, équipe écrite à droite = à l'extérieur ; basketball, équipe écrite à gauche = à l'extérieur.
    const exterieur = x.lieu ? x.lieu === 'ext' : (dom ? droite : !droite);
    return {
      date: x.date, competition: x.comp,
      adversaire: droite ? x.a : x.b,
      score1: droite ? x.s2 : x.s1, score2: droite ? x.s1 : x.s2,
      exterieur,
    };
  });
  return { details: { equipe, matchs: matchs.slice(0, MAX_DERNIERS) }, ignorees };
}
