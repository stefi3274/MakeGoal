// Source UNIQUE de « Promo » (admin, post public, vidéo) et des sponsors (aussi utilisés par les FootQuizz).
// Une promo = une accroche, les lots à gagner (tablette, téléphone, maillot...), le quizz concerné,
// les conditions, une date limite et les sponsors (nom + logo).
import { normaliserDate } from './confrontations';

export type Sponsor = { nom: string; logo?: string };
export type Lot = { nom: string; detail?: string; photo?: string };
export type PromoDetails = { accroche: string; quizz: string; fin: string; conditions: string; lots: Lot[]; sponsors: Sponsor[] };

export const MAX_LOTS = 8;
export const MAX_SPONSORS = 6;
export const LOT_VIDE: Lot = { nom: '', detail: '', photo: '' };
export const SPONSOR_VIDE: Sponsor = { nom: '', logo: '' };
export const PROMO_VIDE: PromoDetails = { accroche: '', quizz: '', fin: '', conditions: '', lots: [{ ...LOT_VIDE }], sponsors: [{ ...SPONSOR_VIDE }] };

export const lotsPublies = (l: Lot[]) => (l || []).filter(x => (x.nom || '').trim() !== '').slice(0, MAX_LOTS);
export const sponsorsPublies = (l: Sponsor[] | null | undefined) => (l || []).filter(x => (x.nom || '').trim() !== '' || (x.logo || '') !== '').slice(0, MAX_SPONSORS);
export const promoValide = (p: PromoDetails | null | undefined) => !!p && lotsPublies(p.lots || []).length > 0;

// Format (tout est facultatif sauf au moins un lot) :
//   Gagne un iPhone 16 | Quizz du weekend | 19/10/2026     (1re ligne : accroche | quizz | date de fin)
//   iPhone 16 Pro - 256 Go                                  (une ligne par lot : nom - détail)
//   Maillot du Real Madrid - dédicacé
//   Condition : 80 % de bonnes réponses minimum
//   Sponsor : Natcom, Digicel                               (noms séparés par des virgules)
export function parserPromo(texte: string): { details: PromoDetails; ignorees: string[] } {
  const lignes = (texte || '').split('\n').map(l => l.trim()).filter(Boolean);
  const lots: Lot[] = [];
  const sponsors: Sponsor[] = [];
  const conditions: string[] = [];
  let accroche = '', quizz = '', fin = '';
  const ignorees: string[] = [];
  lignes.forEach((brut, idx) => {
    const mSp = brut.match(/^sponsors?\s*[:=]\s*(.+)$/i);
    if (mSp) { mSp[1].split(/\s*[,;]\s*/).map(s => s.trim()).filter(Boolean).forEach(nom => sponsors.push({ nom, logo: '' })); return; }
    const mCo = brut.match(/^conditions?\s*[:=]\s*(.+)$/i);
    if (mCo) { conditions.push(mCo[1].trim()); return; }
    if (idx === 0 && /\|/.test(brut)) {
      const segs = brut.split(/\s*\|\s*/).map(s => s.trim());
      accroche = segs[0] || ''; quizz = segs[1] || ''; fin = segs[2] ? normaliserDate(segs[2]) : '';
      return;
    }
    const segs = brut.split(/\s+[-–—]\s+|\s*\|\s*/).map(s => s.trim()).filter(Boolean);
    if (!segs[0]) { ignorees.push(brut); return; }
    lots.push({ nom: segs[0], detail: segs.slice(1).join(' - '), photo: '' });
  });
  return { details: { accroche, quizz, fin, conditions: conditions.join('\n'), lots: lots.slice(0, MAX_LOTS), sponsors: sponsors.slice(0, MAX_SPONSORS) }, ignorees };
}
