// Source UNIQUE de « Résultats de la journée » (admin, post public, vidéo).
// Une compétition, une journée ou un tour (2e journée, quarts de finale...), une date,
// et les matchs joués avec leurs scores.
import { normaliserDate } from './confrontations';

export type MatchJournee = { equipe1: string; equipe2: string; score1: string; score2: string };
export type JourneeDetails = { competition: string; journee: string; date: string; matchs: MatchJournee[] };

export const MAX_JOURNEE = 20;
export const MATCH_JOURNEE_VIDE: MatchJournee = { equipe1: '', equipe2: '', score1: '', score2: '' };
export const JOURNEE_VIDE: JourneeDetails = { competition: '', journee: '', date: '', matchs: [{ ...MATCH_JOURNEE_VIDE }] };

export const JOURNEES = ['1re journée', '2e journée', '3e journée', 'Phase de groupes', 'Phase de ligue', 'Barrages', '16es de finale', '8es de finale', 'Quarts de finale', 'Demi-finales', 'Match pour la 3e place', 'Finale'];

const num = (v: string | null | undefined): number | null => {
  const t = (v ?? '').toString().trim();
  return /^\d+$/.test(t) ? parseInt(t, 10) : null;
};
export const matchJourneeValide = (m: MatchJournee) => m.equipe1.trim() !== '' && m.equipe2.trim() !== '' && num(m.score1) !== null && num(m.score2) !== null;
export const matchsJourneePublies = (ms: MatchJournee[]) => ms.filter(matchJourneeValide).slice(0, MAX_JOURNEE);

// 'G' = équipe 1 gagne, 'P' = équipe 2 gagne, 'N' = nul.
export function issueJournee(m: MatchJournee): 'G' | 'P' | 'N' | null {
  const a = num(m.score1), b = num(m.score2);
  if (a === null || b === null) return null;
  return a > b ? 'G' : a < b ? 'P' : 'N';
}

// Format :
//   Liga | 2e journée | 12/10/2025               (1re ligne facultative : compétition | journée | date)
//   Real Madrid 2-1 Barcelone
//   Séville 0-0 Betis
export function parserJournee(texte: string): { details: JourneeDetails; ignorees: string[] } {
  const lignes = (texte || '').split('\n').map(l => l.trim()).filter(Boolean);
  const matchs: MatchJournee[] = [];
  const ignorees: string[] = [];
  let competition = '', journee = '', date = '';
  const RE = /^(.+?)\s+(\d+)\s*[-–:]\s*(\d+)\s+(.+)$/;
  lignes.forEach((brut, idx) => {
    const m = brut.match(RE);
    if (m) { matchs.push({ equipe1: m[1].trim(), equipe2: m[4].trim(), score1: m[2], score2: m[3] }); return; }
    if (idx === 0) {
      const segs = brut.split(/\s*\|\s*|\s+[-–—]\s+/).map(s => s.trim()).filter(Boolean);
      competition = segs[0] || ''; journee = segs[1] || ''; date = segs[2] ? normaliserDate(segs[2]) : '';
      return;
    }
    ignorees.push(brut);
  });
  return { details: { competition, journee, date, matchs: matchs.slice(0, MAX_JOURNEE) }, ignorees };
}
