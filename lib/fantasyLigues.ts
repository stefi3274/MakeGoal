// Règles des ligues privées de MakeGoal Fantasy.
export const MAX_LIGUES_PAR_JOUEUR = 5;
export const MAX_MEMBRES_LIGUE = 50;
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sans I, O, 0, 1 (faciles à confondre)
export const LONGUEUR_CODE = 6;
export function genererCode(): string {
  let c = '';
  for (let i = 0; i < LONGUEUR_CODE; i++) c += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  return c;
}
export const normaliserCode = (t: string) => (t || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, LONGUEUR_CODE);
