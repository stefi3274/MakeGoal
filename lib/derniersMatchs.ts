// Source UNIQUE de « Derniers matchs » d'une équipe (admin, post public, vidéo).
// Jusqu'à 10 matchs. score1 = buts de l'équipe, score2 = buts de l'adversaire.
import { normaliserDate, memeEquipe, nettoyerFinLigne } from './confrontations';

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

// Ordre d'affichage : l'équipe qui reçoit est à gauche, avec son score.
export function affichageDernier(equipe: string, m: DernierMatch) {
  return m.exterieur
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
export function parserDerniers(texte: string): { details: DerniersMatchsDetails; ignorees: string[] } {
  const lignes = (texte || '').split('\n').map(l => l.trim()).filter(Boolean);
  const matchs: DernierMatch[] = [];
  const ignorees: string[] = [];
  let equipe = '';
  const nn = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim();
  const RE_SCORE = /^(.+?)\s+(\d+)\s*[-–:]\s*(\d+)\s+(.+)$/;
  lignes.forEach((brut, idx) => {
    const segs = brut.split(/\s*\|\s*|\s+[-–—]\s+/).map(s => s.trim()).filter(Boolean);
    const nett = nettoyerFinLigne(segs[segs.length - 1] || '');
    const m = nett.texte.match(RE_SCORE);
    if (!m) {
      if (idx === 0 && segs.length === 1) equipe = brut; else ignorees.push(brut);
      return;
    }
    const a = m[1].trim(), b = m[4].trim();
    if (!equipe) equipe = a;
    let adversaire = b, s1 = m[2], s2 = m[3];
    const exterieur = memeEquipe(b, equipe) && !memeEquipe(a, equipe);
    if (exterieur) { adversaire = a; [s1, s2] = [s2, s1]; }
    const avant = segs.slice(0, -1);
    const comp0 = avant.length > 1 ? avant.slice(1).join(' - ') : '';
    matchs.push({ date: avant.length ? normaliserDate(avant[0]) : '', competition: comp0 + (nett.mention ? (comp0 ? ' ' : '') + '(' + nett.mention + ')' : ''), adversaire, score1: s1, score2: s2, exterieur });
  });
  return { details: { equipe, matchs: matchs.slice(0, MAX_DERNIERS) }, ignorees };
}
