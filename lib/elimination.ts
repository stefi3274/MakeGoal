// Source UNIQUE des confrontations à élimination directe (admin, post public, vidéo).
// Chaque rencontre peut avoir : score, AP (après prolongation) et TAB (tirs au but),
// tous OPTIONNELS. Le qualifié se déduit tout seul (TAB > AP > score) ou se force à la main.

export type Rencontre = {
  equipe1: string; equipe2: string;
  score1: string; score2: string;
  ap1: string; ap2: string;
  tab1: string; tab2: string;
  qualifie: '' | '1' | '2';   // '' = automatique
};
export type EliminationDetails = { competition: string; tour: string; rencontres: Rencontre[] };

export const RENCONTRE_VIDE: Rencontre = { equipe1: '', equipe2: '', score1: '', score2: '', ap1: '', ap2: '', tab1: '', tab2: '', qualifie: '' };
export const ELIMINATION_VIDE: EliminationDetails = { competition: '', tour: '', rencontres: [] };

export const TOURS = ['Tour préliminaire', 'Barrages', '32es de finale', '16es de finale', '8es de finale', 'Quarts de finale', 'Demi-finales', 'Match pour la 3e place', 'Finale'];

const num = (v: string | null | undefined): number | null => {
  const t = (v ?? '').toString().trim();
  return /^\d+$/.test(t) ? parseInt(t, 10) : null;
};
const paire = (a: string, b: string): [number, number] | null => {
  const x = num(a), y = num(b);
  return x !== null && y !== null ? [x, y] : null;
};

export const aScore = (r: Rencontre) => paire(r.score1, r.score2) !== null;
export const aAP = (r: Rencontre) => paire(r.ap1, r.ap2) !== null;
export const aTAB = (r: Rencontre) => paire(r.tab1, r.tab2) !== null;

// 0 = pas (encore) de qualifié, 1 ou 2 = équipe qualifiée.
export function qualifie(r: Rencontre): 0 | 1 | 2 {
  if (r.qualifie === '1') return 1;
  if (r.qualifie === '2') return 2;
  for (const p of [paire(r.tab1, r.tab2), paire(r.ap1, r.ap2), paire(r.score1, r.score2)]) {
    if (p && p[0] !== p[1]) return p[0] > p[1] ? 1 : 2;
  }
  return 0;
}

// Texte court du détail : "AP 2-2 · TAB 4-2".
export function detailScore(r: Rencontre): string {
  const parts: string[] = [];
  if (aAP(r)) parts.push('AP ' + r.ap1.trim() + '-' + r.ap2.trim());
  if (aTAB(r)) parts.push('TAB ' + r.tab1.trim() + '-' + r.tab2.trim());
  return parts.join(' · ');
}

// Format :
//   Quarts de finale - Ligue des champions          (1re ligne : tour - compétition, facultative)
//   Haïti 2-1 Trinidad
//   Brésil 1-1 Croatie ap 1-1 tab 4-2
//   France vs Argentine                              (sans score : match à venir)
export function parserElimination(texte: string): { details: EliminationDetails; ignorees: string[] } {
  const lignes = (texte || '').split('\n').map(l => l.trim()).filter(Boolean);
  const rencontres: Rencontre[] = [];
  const ignorees: string[] = [];
  let tour = '', competition = '';
  const RE_TAB = /\s*\(?\s*(?:tab|t\.a\.b\.?|tirs?\s+au\s+but)\.?\s*:?\s*(\d+)\s*[-–:]\s*(\d+)\s*\)?/i;
  const RE_AP = /\s*\(?\s*(?:ap|a\.p\.?|apr[eè]s\s+prolongation|prolongation)\.?\s*:?\s*(\d+)\s*[-–:]\s*(\d+)\s*\)?/i;
  lignes.forEach((brut, idx) => {
    let l = brut;
    const mTab = l.match(RE_TAB); let tab1 = '', tab2 = '';
    if (mTab) { tab1 = mTab[1]; tab2 = mTab[2]; l = l.replace(RE_TAB, ' '); }
    const mAp = l.match(RE_AP); let ap1 = '', ap2 = '';
    if (mAp) { ap1 = mAp[1]; ap2 = mAp[2]; l = l.replace(RE_AP, ' '); }
    l = l.replace(/\s+/g, ' ').trim();
    const mScore = l.match(/^(.+?)\s+(\d+)\s*[-–:]\s*(\d+)\s+(.+)$/);
    const mVs = l.match(/^(.+?)\s+(?:vs\.?|v\.?|contre|-|–|—)\s+(.+)$/i);
    const estEntete = idx === 0 && !mScore && /(finale|tour|barrage|quart|demi|huiti|seizi|32es|16es|8es|3e place|phase|play-?off)/i.test(brut);
    if (estEntete) {
      const ch = brut.split(/\s+[-–—]\s+|\s*\|\s*/).map(c => c.trim());
      tour = ch[0] || ''; competition = ch[1] || '';
    } else if (mScore) {
      rencontres.push({ ...RENCONTRE_VIDE, equipe1: mScore[1].trim(), equipe2: mScore[4].trim(), score1: mScore[2], score2: mScore[3], ap1, ap2, tab1, tab2 });
    } else if (mVs) {
      rencontres.push({ ...RENCONTRE_VIDE, equipe1: mVs[1].trim(), equipe2: mVs[2].trim() });
    } else {
      ignorees.push(brut);
    }
  });
  return { details: { competition, tour, rencontres }, ignorees };
}
