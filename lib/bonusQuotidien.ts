// Source UNIQUE du bonus de connexion quotidien de MakeGoal Fantasy : série de 7 jours avec récompense en escalier
// (50 au départ, le 7e jour 500), puis la série repart à 1. Le bonus s'ajoute au budget des deux modes.
export const RECOMPENSES = [50, 50, 75, 75, 100, 100, 500];   // jour 1 à jour 7 (FanCoins)
export const BONUS_JOUR = RECOMPENSES[0];
export const BONUS_JOUR_7 = RECOMPENSES[RECOMPENSES.length - 1];
export const JOURS_SERIE = RECOMPENSES.length;
export const BONUS_MAX = 5000;               // plafond du bonus cumulé (évite un budget qui gonfle sans fin)
export const FUSEAU_JEU = 'America/Port-au-Prince';

// Jour calendaire (AAAA-MM-JJ) à Port-au-Prince.
export function jourHaiti(d: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: FUSEAU_JEU, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
}
export function jourPrecedent(jour: string): string {
  const [a, m, j] = jour.split('-').map(Number);
  const d = new Date(Date.UTC(a, m - 1, j - 1));
  return d.toISOString().slice(0, 10);
}

export type EtatBonus = { serie: number; dernierJour: string | null; solde: number };

// Numéro (1 à 7) du jour de série que la prochaine récupération validera, et état d'aujourd'hui.
export function etatSerie(b: EtatBonus, aujourdhui: string = jourHaiti()): { dejaReclame: boolean; serieActive: number; prochainJour: number } {
  if (b.dernierJour === aujourdhui) return { dejaReclame: true, serieActive: b.serie, prochainJour: b.serie >= JOURS_SERIE ? 1 : b.serie + 1 };
  if (b.dernierJour === jourPrecedent(aujourdhui)) return { dejaReclame: false, serieActive: b.serie, prochainJour: b.serie >= JOURS_SERIE ? 1 : b.serie + 1 };
  return { dejaReclame: false, serieActive: 0, prochainJour: 1 };
}
export const recompenseDuJour = (jourSerie: number) => RECOMPENSES[Math.min(Math.max(jourSerie, 1), JOURS_SERIE) - 1];
