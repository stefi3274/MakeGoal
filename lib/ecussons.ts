// Source UNIQUE des écussons de clubs et drapeaux de sélections (admin, post public, vidéo).
// Un écusson est une image téléversée, rangée par nom d'équipe. Si l'équipe est une sélection
// nationale connue (Haïti, France...), son drapeau est utilisé automatiquement.
import { drapeau } from './formations';

export type Ecussons = Record<string, string>;

export const cleEquipe = (nom: string | null | undefined): string =>
  (nom || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '');

export type VisuelEquipe = { url?: string; drapeau?: string };

// Écusson téléversé en priorité, sinon drapeau si c'est un pays, sinon rien.
export function visuelEquipe(nom: string | null | undefined, ecussons?: Ecussons | null): VisuelEquipe {
  const k = cleEquipe(nom);
  if (!k) return {};
  const url = ecussons ? ecussons[k] : undefined;
  if (url) return { url };
  const d = drapeau(nom || '');
  return d && d !== '🏳️' ? { drapeau: d } : {};
}

// Noms d'équipes distincts (ordre d'apparition), sans doublon d'orthographe.
export function equipesDistinctes(noms: (string | null | undefined)[]): string[] {
  const vus = new Set<string>();
  const res: string[] = [];
  noms.forEach(n => {
    const t = (n || '').trim();
    const k = cleEquipe(t);
    if (t && !vus.has(k)) { vus.add(k); res.push(t); }
  });
  return res;
}

// Ne garde que les écussons des équipes réellement présentes dans le post.
export function ecussonsUtiles(ecussons: Ecussons | undefined, noms: string[]): Ecussons {
  const res: Ecussons = {};
  noms.forEach(n => { const k = cleEquipe(n); if (ecussons && ecussons[k]) res[k] = ecussons[k]; });
  return res;
}
