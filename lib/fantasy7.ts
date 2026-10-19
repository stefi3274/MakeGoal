// Source UNIQUE du mode « MakeGoal Fantasy 7 » : 7 joueurs (1 G, 2 D, 2 M, 2 A), même budget et mêmes points
// de joueurs que le mode 11 joueurs, pas de réservistes. Maximum 3 « Légendes Or Top » dans l'équipe.
import { Poste, POSTES, JoueurFantasy, BUDGET_DEPART, MONNAIE, PerfJoueur, compterPostes } from './fantasy';
import { categorieJoueur } from './fantasyBanque';

export const NB_JOUEURS_7 = 7;
export const MAX_TOPS = 3;
export const FORMATION_7: Record<Poste, number> = { G: 1, D: 2, M: 2, A: 2 };
export type Equipe7 = { titulaires: string[]; capitaine: string | null };
export type DetailLigne7 = { id: string; points: number; capitaine?: boolean };

export const estTop = (j: JoueurFantasy | undefined) => !!j && categorieJoueur(j.prix).cle === 'top';
export const nbTops = (ids: string[], joueurs: Map<string, JoueurFantasy>) => ids.filter(id => estTop(joueurs.get(id))).length;
export const coutEquipe7 = (ids: string[], joueurs: Map<string, JoueurFantasy>) => ids.reduce((n, id) => n + (joueurs.get(id)?.prix || 0), 0);

export function validerEquipe7(eq: Equipe7, joueurs: Map<string, JoueurFantasy>, budget = BUDGET_DEPART): { ok: boolean; erreurs: string[]; cout: number } {
  const erreurs: string[] = [];
  if (eq.titulaires.length !== NB_JOUEURS_7) erreurs.push('Il faut ' + NB_JOUEURS_7 + ' joueurs (' + eq.titulaires.length + ' choisis).');
  if (new Set(eq.titulaires).size !== eq.titulaires.length) erreurs.push('Un joueur ne peut apparaître qu\'une fois.');
  for (const id of eq.titulaires) {
    const j = joueurs.get(id);
    if (!j) { erreurs.push('Joueur introuvable.'); break; }
    if (!j.actif) { erreurs.push(j.nom + ' n\'est plus disponible.'); break; }
  }
  if (!erreurs.length) {
    const c = compterPostes(eq.titulaires, joueurs);
    if (!POSTES.every(p => c[p] === FORMATION_7[p])) erreurs.push('Composition 1-2-2-2 obligatoire : 1 gardien, 2 défenseurs, 2 milieux, 2 attaquants.');
    if (nbTops(eq.titulaires, joueurs) > MAX_TOPS) erreurs.push('Maximum ' + MAX_TOPS + ' Légendes Or Top.');
  }
  if (!eq.capitaine || !eq.titulaires.includes(eq.capitaine)) erreurs.push('Choisis un capitaine parmi tes joueurs.');
  const cout = coutEquipe7(eq.titulaires, joueurs);
  if (cout > budget) erreurs.push('Budget dépassé : ' + cout + ' ' + MONNAIE + ' sur ' + budget + ' ' + MONNAIE + '.');
  return { ok: erreurs.length === 0, erreurs, cout };
}

// Le capitaine compte double s'il a joué. Pas de remplacement automatique.
export function scoreEquipe7(eq: Equipe7, perfs: Map<string, PerfJoueur>): { total: number; detail: DetailLigne7[] } {
  const detail: DetailLigne7[] = [];
  let total = 0;
  for (const id of eq.titulaires) {
    const p = perfs.get(id);
    let pts = p?.points || 0;
    const cap = id === eq.capitaine && (p?.minutes || 0) > 0;
    if (cap) pts *= 2;
    total += pts;
    detail.push({ id, points: pts, capitaine: cap || undefined });
  }
  return { total, detail };
}
