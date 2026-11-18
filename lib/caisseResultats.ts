// Collage en lot des résultats. Une ligne par match :
//   Equipe1 - Equipe2 - 2-1            (score final)
//   Equipe1 - Equipe2 - 2-1 (1-0)      (score final + mi-temps)
// Fonctions pures, sans accès base de données.

export type ResultatMatch = { equipe1: string; equipe2: string; ftH: number; ftA: number; htH: number | null; htA: number | null; ligne: number };

export const normaliser = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

const SCORE = /^(\d{1,2})\s*[-:]\s*(\d{1,2})(?:\s*[(\[]?\s*(?:mt\s*:?\s*)?(\d{1,2})\s*[-:]\s*(\d{1,2})\s*[)\]]?)?$/i;

export function parserResultats(texte: string): { resultats: ResultatMatch[]; erreurs: string[] } {
  const resultats: ResultatMatch[] = [];
  const erreurs: string[] = [];
  texte.split(/\r?\n/).forEach((brut, i) => {
    const l = brut.trim();
    if (!l) return;
    const parts = l.split(/\s+[-–]\s+/).map(p => p.trim()).filter(Boolean);
    if (parts.length < 3) { erreurs.push('Ligne ' + (i + 1) + ' : format « Equipe1 - Equipe2 - 2-1 (1-0) » attendu.'); return; }
    const sc = SCORE.exec(parts[parts.length - 1]);
    if (!sc) { erreurs.push('Ligne ' + (i + 1) + ' : score illisible « ' + parts[parts.length - 1] + ' ».'); return; }
    const equipes = parts.slice(0, -1);
    if (equipes.length !== 2) { erreurs.push('Ligne ' + (i + 1) + ' : deux équipes attendues.'); return; }
    const ftH = Number(sc[1]), ftA = Number(sc[2]);
    const htH = sc[3] !== undefined ? Number(sc[3]) : null, htA = sc[4] !== undefined ? Number(sc[4]) : null;
    if (htH !== null && htA !== null && (htH > ftH || htA > ftA)) { erreurs.push('Ligne ' + (i + 1) + ' : mi-temps supérieure au score final.'); return; }
    resultats.push({ equipe1: equipes[0], equipe2: equipes[1], ftH, ftA, htH, htA, ligne: i + 1 });
  });
  return { resultats, erreurs };
}

export type MatchRef = { id: string; equipe1: string; equipe2: string; date_match: string };

// Trouve le match du système (le plus récent déjà commencé) ; accepte les équipes inversées (renvoie alors inverse=true).
export function trouverMatch(matchs: MatchRef[], e1: string, e2: string, maintenant: number = Date.now()): { match: MatchRef; inverse: boolean } | null {
  const a = normaliser(e1), b = normaliser(e2);
  const commences = matchs.filter(m => new Date(m.date_match).getTime() <= maintenant).sort((x, y) => y.date_match.localeCompare(x.date_match));
  const droit = commences.find(m => normaliser(m.equipe1) === a && normaliser(m.equipe2) === b);
  if (droit) return { match: droit, inverse: false };
  const inv = commences.find(m => normaliser(m.equipe1) === b && normaliser(m.equipe2) === a);
  return inv ? { match: inv, inverse: true } : null;
}
