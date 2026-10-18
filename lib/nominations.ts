// Source UNIQUE de « Nominations » (admin, post public, vidéo).
// Une catégorie (Ballon d'or, Meilleur entraîneur...), une édition, et la liste des nominés.
import { normaliserDate } from './confrontations';
import { drapeau } from './formations';

export type Nomine = { nom: string; equipe: string; pays: string; note: string; photo?: string; ecusson?: string };
export type NominationsDetails = { categorie: string; edition: string; nomines: Nomine[] };

export const MAX_NOMINES = 30;
export const NOMINE_VIDE: Nomine = { nom: '', equipe: '', pays: '', note: '', photo: '', ecusson: '' };
export const NOMINATIONS_VIDE: NominationsDetails = { categorie: '', edition: '', nomines: [{ ...NOMINE_VIDE }] };

export const CATEGORIES_NOMINATION = ['Ballon d\'or', 'Meilleur entraîneur', 'Meilleur gardien', 'Meilleure équipe'];
export const CATEGORIES_NOMINATION_BASKET = ['MVP', 'Meilleur marqueur', 'Meilleur défenseur', 'Meilleur sixième homme', 'Rookie de l\'année', 'Meilleur entraîneur', 'Meilleure équipe'];
export const categoriesNomination = (sport: string | null | undefined) => (sport === 'basketball' ? CATEGORIES_NOMINATION_BASKET : CATEGORIES_NOMINATION);

export const nomineValide = (n: Nomine) => n.nom.trim() !== '';
export const nominesPublies = (l: Nomine[]) => l.filter(nomineValide).slice(0, MAX_NOMINES);

// Format :
//   Ballon d'or | 2026                       (1re ligne facultative : catégorie | édition)
//   Ousmane Dembélé - PSG - France - 35 buts  (nom - équipe - pays - note, tout sauf le nom est facultatif)
//   Lamine Yamal - FC Barcelone - Espagne
// Avec 2 éléments après le nom : « équipe - pays » si le 2e est un pays connu, sinon « équipe - note ».
export function parserNominations(texte: string): { details: NominationsDetails; ignorees: string[] } {
  const lignes = (texte || '').split('\n').map(l => l.trim()).filter(Boolean);
  const nomines: Nomine[] = [];
  const ignorees: string[] = [];
  let categorie = '', edition = '';
  const estEntete = (l: string) => {
    const n = l.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    return /ballon|entraineur|gardien|equipe|meilleur|nomin|trophee|soulier|joueur de l|mvp|rookie|marqueur|defenseur|sixieme|majeur/.test(n) && !/\s[-–—]\s/.test(l);
  };
  lignes.forEach((brut, idx) => {
    if (idx === 0 && (estEntete(brut) || /\|/.test(brut))) {
      const segs = brut.split(/\s*\|\s*/).map(s => s.trim());
      categorie = segs[0] || ''; edition = segs[1] ? normaliserDate(segs[1]) : '';
      return;
    }
    const segs = brut.split(/\s+[-–—]\s+|\s*\|\s*/).map(s => s.trim()).filter(Boolean);
    if (!segs[0]) { ignorees.push(brut); return; }
    const [nom, a, b, c] = segs;
    if (segs.length >= 4) nomines.push({ nom, equipe: a, pays: b, note: c });
    else if (segs.length === 3) {
      // 3e élément : un pays (drapeau reconnu) ou, sinon, une note
      const estPays = !!b && drapeau(b) !== '🏳️';
      nomines.push({ nom, equipe: a, pays: estPays ? b : '', note: estPays ? '' : b });
    }
    else nomines.push({ nom, equipe: a || '', pays: '', note: '' });
  });
  return { details: { categorie, edition, nomines: nomines.slice(0, MAX_NOMINES) }, ignorees };
}
