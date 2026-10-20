// Profil d'équipe MakeGoal Fantasy : nom, emblème et deux couleurs (maillot) choisis par le joueur.
export const COULEUR1_DEFAUT = '#bf00ff';
export const COULEUR2_DEFAUT = '#ffffff';
export const EMBLEME_DEFAUT = '⚽';

export type ProfilEquipe = { nom: string; couleur1: string; couleur2: string; embleme: string };

export const PALETTES: { nom: string; c1: string; c2: string }[] = [
  { nom: 'Violet MakeGoal', c1: '#bf00ff', c2: '#ffffff' },
  { nom: 'Haïti', c1: '#00209f', c2: '#d21034' },
  { nom: 'Or et noir', c1: '#f5c518', c2: '#111111' },
  { nom: 'Vert', c1: '#16a34a', c2: '#ffffff' },
  { nom: 'Rouge', c1: '#dc2626', c2: '#ffffff' },
  { nom: 'Orange', c1: '#f97316', c2: '#111111' },
  { nom: 'Bleu ciel', c1: '#38bdf8', c2: '#0c4a6e' },
  { nom: 'Rose', c1: '#ec4899', c2: '#ffffff' },
  { nom: 'Turquoise', c1: '#14b8a6', c2: '#ffffff' },
  { nom: 'Noir et blanc', c1: '#111111', c2: '#ffffff' },
];
export const EMBLEMES = ['⚽', '🦁', '🐯', '🦅', '🐺', '🐉', '🦈', '🔥', '⚡', '👑', '💎', '🚀', '🏆', '⭐', '🌴', '🇭🇹'];

export const couleurValide = (c: unknown): c is string => typeof c === 'string' && /^#[0-9a-fA-F]{6}$/.test(c);
export const emblemeValide = (e: unknown): e is string => typeof e === 'string' && EMBLEMES.includes(e);

// Texte lisible (noir ou blanc) sur un fond de couleur donnée.
export function texteSur(hex: string): string {
  const h = couleurValide(hex) ? hex : COULEUR1_DEFAUT;
  const r = parseInt(h.slice(1, 3), 16), g = parseInt(h.slice(3, 5), 16), b = parseInt(h.slice(5, 7), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) > 150 ? '#111111' : '#ffffff';
}
