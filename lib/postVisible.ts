// Décide si un post de type "match" est encore visible selon son statut (logique "stories").
// - "À venir"      : visible tant que l'heure du match n'est pas passée (si date connue)
// - "Mi-temps"     : visible 20 minutes après le passage en mi-temps
// - "Match terminé": visible 24 heures après le passage en terminé
// Les posts SANS statut de match et les articles restent toujours visibles.

type ArticleLike = {
  type?: string | null;
  statut_match?: string | null;
  statut_change_at?: string | null;
  date_match_iso?: string | null; // optionnel : heure du match si disponible
};

export function postVisible(a: ArticleLike): boolean {
  // Pas un post, ou pas de statut de match => toujours visible
  if (a.type !== 'post' || !a.statut_match) return true;

  const maintenant = Date.now();

  if (a.statut_match === 'À venir') {
    // Si on connaît l'heure du match, on masque une fois l'heure passée
    if (a.date_match_iso) {
      return maintenant < new Date(a.date_match_iso).getTime();
    }
    return true; // pas d'heure connue => on garde visible
  }

  if (!a.statut_change_at) return true;
  const depuis = new Date(a.statut_change_at).getTime();

  if (a.statut_match === 'Mi-temps') {
    return maintenant < depuis + 20 * 60 * 1000; // 20 minutes
  }

  if (a.statut_match === 'Match terminé') {
    return maintenant < depuis + 24 * 3600 * 1000; // 24 heures
  }

  return true;
}