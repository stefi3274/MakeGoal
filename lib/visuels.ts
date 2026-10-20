// Visuels libres d'un post (tous types de post) : écusson de club, drapeau de pays, photo de joueur.
// Rangés dans la colonne jsonb `articles.visuels`.
import { drapeau } from './formations';

export type TypeVisuel = 'ecusson' | 'drapeau' | 'joueur';
export type Visuel = { type: TypeVisuel; nom: string; url?: string };

export const MAX_VISUELS = 8;
export const LIBELLE_VISUEL: Record<TypeVisuel, string> = { ecusson: '🛡️ Écusson', drapeau: '🚩 Drapeau', joueur: '👤 Photo joueur' };

const urlSure = (u: unknown): u is string => typeof u === 'string' && /^https:\/\//i.test(u);

// Ne garde que les visuels complets et sûrs (image https pour écusson/joueur, pays connu pour un drapeau).
export function visuelsPublies(liste: unknown): Visuel[] {
  if (!Array.isArray(liste)) return [];
  const res: Visuel[] = [];
  for (const v of liste as Partial<Visuel>[]) {
    if (!v || (v.type !== 'ecusson' && v.type !== 'drapeau' && v.type !== 'joueur')) continue;
    const nom = String(v.nom || '').trim().slice(0, 40);
    if (v.type === 'drapeau') { if (nom && drapeau(nom) !== '🏳️') res.push({ type: 'drapeau', nom }); }
    else if (urlSure(v.url)) res.push({ type: v.type, nom, url: v.url });
    if (res.length >= MAX_VISUELS) break;
  }
  return res;
}
