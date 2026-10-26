// Hook : la phrase d'accroche affichée en tout début de CHAQUE vidéo (toutes les vidéos, sans exception).
// Rangé dans `articles.hook` (posts) et `quizz_foot.hook` (FootQuizz).
// Dans tous les formats à coller, il s'écrit sur une ligne :  Hook: ta phrase   (ou  🎣 ta phrase)

export const MAX_HOOK = 100;

const LIGNE_HOOK = /^\s*(?:hook\s*[:=]|🎣\s*[:=]?)\s*(.+?)\s*$/i;

export const hookPublie = (h: string | null | undefined): string => (h || '').replace(/\s+/g, ' ').trim().slice(0, MAX_HOOK);

// Retire du texte collé la ligne « Hook: ... » (la première trouvée) et la renvoie à part.
// Le reste du texte est rendu sans cette ligne, prêt à être lu par le format habituel.
export function separerHook(texte: string): { hook: string; reste: string } {
  const lignes = (texte || '').split('\n');
  let hook = '';
  const reste: string[] = [];
  for (const l of lignes) {
    if (!hook) {
      const m = l.match(LIGNE_HOOK);
      if (m) { hook = hookPublie(m[1]); continue; }
    }
    reste.push(l);
  }
  return { hook, reste: hook ? reste.join('\n').replace(/^\s*\n+/, '') : (texte || '') };
}
