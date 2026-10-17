// Source UNIQUE des types de FootQuizz : durée de disponibilité, puis tirage au sort par l'admin.
export type TypeQuizz = 'weekend' | 'semaine';

export const TYPES_QUIZZ: Record<TypeQuizz, { label: string; heures: number; emoji: string }> = {
  weekend: { label: 'Quizz du weekend', heures: 48, emoji: '🎉' },
  semaine: { label: 'Quizz de semaine', heures: 72, emoji: '📅' },
};

export const typeValide = (t: unknown): TypeQuizz => (t === 'weekend' ? 'weekend' : 'semaine');

// Pas de colonne en plus : le type se déduit de la durée (48 h ou 72 h) entre création et fermeture.
export function typeDepuisDurees(creation: string | null | undefined, fermeture: string | null | undefined): TypeQuizz | null {
  if (!creation || !fermeture) return null;
  const h = (new Date(fermeture).getTime() - new Date(creation).getTime()) / 3600000;
  if (!isFinite(h)) return null;
  if (Math.abs(h - 48) < 1) return 'weekend';
  if (Math.abs(h - 72) < 1) return 'semaine';
  return null;
}
