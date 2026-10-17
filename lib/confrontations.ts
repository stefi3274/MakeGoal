// Source UNIQUE de « Confrontations dans le passé » (admin, post public, vidéo).
// Jusqu'à 10 matchs entre deux équipes. Les scores sont toujours donnés du point de vue
// de l'équipe 1 (score1) et de l'équipe 2 (score2), peu importe qui recevait.

// inverse = true : c'est l'équipe 2 qui reçoit (elle s'affiche à gauche). score1 reste toujours celui de l'équipe 1.
export type Confrontation = { date: string; competition: string; score1: string; score2: string; inverse?: boolean };
export type ConfrontationsDetails = { equipe1: string; equipe2: string; matchs: Confrontation[]; ecussons?: Record<string, string> };

export const MAX_CONFRONTATIONS = 10;
export const CONFRONTATION_VIDE: Confrontation = { date: '', competition: '', score1: '', score2: '', inverse: false };
export const CONFRONTATIONS_VIDE: ConfrontationsDetails = { equipe1: '', equipe2: '', matchs: [{ ...CONFRONTATION_VIDE }] };

export type IssueConf = 'G' | 'P' | 'N';

const num = (v: string | null | undefined): number | null => {
  const t = (v ?? '').toString().trim();
  return /^\d+$/.test(t) ? parseInt(t, 10) : null;
};

export const matchValide = (m: Confrontation) => num(m.score1) !== null && num(m.score2) !== null;

// Issue du point de vue de l'équipe 1 : G = équipe 1 gagne, P = équipe 1 perd, N = nul.
export function issueConf(m: Confrontation): IssueConf | null {
  const a = num(m.score1), b = num(m.score2);
  if (a === null || b === null) return null;
  return a > b ? 'G' : a < b ? 'P' : 'N';
}

const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

// "2022-03-12" -> "12 mars 2022" ; une année seule ou un texte libre restent tels quels.
export function formaterDate(d: string): string {
  const t = (d || '').trim();
  const m = t.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return t;
  const mois = MOIS[parseInt(m[2], 10) - 1];
  return mois ? parseInt(m[3], 10) + (m[3] === '01' ? 'er' : '') + ' ' + mois + ' ' + m[1] : t;
}

// Accepte 12/03/2022, 12-03-2022, 12.03.2022, 2022-03-12 ou 2022 ; renvoie le format stocké.
export function normaliserDate(d: string): string {
  const t = (d || '').trim();
  let m = t.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4})$/);
  if (m) return m[3] + '-' + m[2].padStart(2, '0') + '-' + m[1].padStart(2, '0');
  m = t.match(/^(\d{4})[\/.\-](\d{1,2})[\/.\-](\d{1,2})$/);
  if (m) return m[1] + '-' + m[2].padStart(2, '0') + '-' + m[3].padStart(2, '0');
  return t;
}

// Outils de collage, partagés avec « Derniers matchs ».
const sansAccent = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
// « FC Barcelone » = « Barcelone » ; « Real Madrid » = « real madrid ».
export function memeEquipe(a: string, b: string): boolean {
  const x = sansAccent(a), y = sansAccent(b);
  if (!x || !y) return false;
  if (x === y) return true;
  const court = x.length <= y.length ? x : y, long = x.length <= y.length ? y : x;
  return court.length >= 4 && (' ' + long + ' ').includes(' ' + court + ' ');
}
// Retire les notes collées après le score (« (a.p.) », « [1] », liens) et renvoie la mention
// de prolongation / tirs au but éventuelle pour l'ajouter à la compétition.
export function nettoyerFinLigne(txt: string): { texte: string; mention: string } {
  let t = txt.replace(/\[\d+\]/g, ' ').replace(/\(?\s*https?:\/\/[^\s)]*\s*\)?/gi, ' ').replace(/\s+/g, ' ').trim();
  let mention = '';
  for (;;) {
    const m = t.match(/\s*[\(\[]([^()\[\]]*)[\)\]]\s*$/);
    if (!m) break;
    if (/a\.?\s?p|prol|tab|t\.a\.b|pen/i.test(m[1]) && !mention) mention = m[1].trim();
    t = t.slice(0, m.index).trim();
  }
  return { texte: t, mention };
}

// « 10 dernières confrontations », « 3 dernières confrontations », « Dernière confrontation ».
export const libelleConfrontations = (n: number) => (n <= 1 ? 'Dernière confrontation' : n + ' dernières confrontations');

// Ordre d'affichage d'un match : l'équipe qui reçoit est à gauche, avec son score.
export function affichageConf(d: ConfrontationsDetails, m: Confrontation) {
  return m.inverse
    ? { a: d.equipe2, b: d.equipe1, sa: m.score2.trim(), sb: m.score1.trim() }
    : { a: d.equipe1, b: d.equipe2, sa: m.score1.trim(), sb: m.score2.trim() };
}

export function bilanConf(d: ConfrontationsDetails) {
  let v1 = 0, n = 0, v2 = 0, b1 = 0, b2 = 0;
  d.matchs.forEach(m => {
    const i = issueConf(m);
    if (!i) return;
    if (i === 'G') v1++; else if (i === 'P') v2++; else n++;
    b1 += num(m.score1) || 0; b2 += num(m.score2) || 0;
  });
  return { v1, n, v2, b1, b2, total: v1 + n + v2 };
}

// Matchs prêts à être publiés : score complet, 10 maximum.
export const matchsPublies = (matchs: Confrontation[]) => matchs.filter(matchValide).slice(0, MAX_CONFRONTATIONS);

// Format (une ligne par match, séparateurs « | » ou « - » entourés d'espaces) :
//   Haïti vs Cuba                                   (1re ligne facultative : les deux équipes)
//   12/03/2022 | Gold Cup | Haïti 2-1 Cuba
//   2019 - Éliminatoires - Cuba 0-0 Haïti
// Si les équipes sont données, le score est automatiquement orienté vers l'équipe 1.
export function parserConfrontations(texte: string): { details: ConfrontationsDetails; ignorees: string[] } {
  const lignes = (texte || '').split('\n').map(l => l.trim()).filter(Boolean);
  const matchs: Confrontation[] = [];
  const ignorees: string[] = [];
  let equipe1 = '', equipe2 = '';
  const RE_SCORE = /^(.+?)\s+(\d+)\s*[-–:]\s*(\d+)\s+(.+)$/;
  const nn = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim();
  lignes.forEach((brut, idx) => {
    const segs = brut.split(/\s*\|\s*|\s+[-–—]\s+/).map(s => s.trim()).filter(Boolean);
    const nett = nettoyerFinLigne(segs[segs.length - 1] || '');
    const dernier = nett.texte;
    const mScore = dernier.match(RE_SCORE);
    if (!mScore) {
      const mVs = idx === 0 && segs.length === 1 ? brut.match(/^(.+?)\s+(?:vs\.?|v\.?|contre|-|–|—)\s+(.+)$/i) : null;
      if (mVs) { equipe1 = mVs[1].trim(); equipe2 = mVs[2].trim(); } else ignorees.push(brut);
      return;
    }
    const a = mScore[1].trim(), b = mScore[4].trim();
    let sa = mScore[2], sb = mScore[3];
    if (!equipe1 && !equipe2) { equipe1 = a; equipe2 = b; }
    // Orientation : le score écrit à gauche appartient à l'équipe de gauche. Si c'est l'équipe 2, on inverse.
    const gaucheEst2 = memeEquipe(a, equipe2) && !memeEquipe(a, equipe1);
    const droiteEst1 = memeEquipe(b, equipe1) && !memeEquipe(b, equipe2);
    if (gaucheEst2 || droiteEst1) { [sa, sb] = [sb, sa]; }
    const avant = segs.slice(0, -1);
    const date = avant.length ? normaliserDate(avant[0]) : '';
    const competition0 = avant.length > 1 ? avant.slice(1).join(' - ') : '';
    const competition = competition0 + (nett.mention ? (competition0 ? ' ' : '') + '(' + nett.mention + ')' : '');
    matchs.push({ date, competition, score1: sa, score2: sb, inverse: gaucheEst2 || droiteEst1 });
  });
  return { details: { equipe1, equipe2, matchs: matchs.slice(0, MAX_CONFRONTATIONS) }, ignorees };
}
