// Décide si un POST est encore visible (logique "stories"). Les ARTICLES (Actualités,
// Revue de presse) ne sont jamais masqués par cette fonction.
//
// Règles pour les posts :
// - statut "À venir"       : visible tant que l'heure du match n'est pas passée (si connue)
// - statut "Mi-temps"      : visible 20 minutes après le passage en mi-temps
// - statut "Match terminé" : visible 24 heures après le passage en terminé
// - post en catégorie "Ponctuel" SANS statut match : visible 1 semaine après la dernière
//   publication/relance (relance_at sinon created_at)
// - tout le reste : toujours visible

type ArticleLike = {
  type?: string | null;
  categorie?: string | null;
  statut_match?: string | null;
  statut_change_at?: string | null;
  date_match_iso?: string | null;
  relance_at?: string | null;
  created_at?: string | null;
};

export function postVisible(a: ArticleLike): boolean {
  // Les articles restent toujours (seuls les posts expirent)
  if (a.type !== 'post') return true;

  const maintenant = Date.now();

  // Posts avec statut de match
  if (a.statut_match) {
    if (a.statut_match === 'À venir') {
      if (a.date_match_iso) return maintenant < new Date(a.date_match_iso).getTime();
      return true;
    }
    if (a.statut_change_at) {
      const depuis = new Date(a.statut_change_at).getTime();
      if (a.statut_match === 'Mi-temps') return maintenant < depuis + 20 * 60 * 1000;
      if (a.statut_match === 'Match terminé') return maintenant < depuis + 24 * 3600 * 1000;
    }
    return true;
  }

  // Posts Ponctuels sans statut match : 1 semaine depuis relance ou création
  if (a.categorie === 'Ponctuel') {
    const base = a.relance_at || a.created_at;
    if (base) return maintenant < new Date(base).getTime() + 7 * 24 * 3600 * 1000;
  }

  return true;
}

// Décide si un MATCH (table matchs) ou un CONCOURS est encore visible.
// Disparaît quand l'heure de référence (dernier match) + 2h est passée.
export function matchVisible(dateMatchIso: string | null | undefined): boolean {
  if (!dateMatchIso) return true;
  return Date.now() < new Date(dateMatchIso).getTime() + 2 * 3600 * 1000;
}