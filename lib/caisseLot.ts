// Collage en lot pour la caisse : des matchs avec leurs cotes et leur date.
//
// Format (une ligne par match, ligne d'en-tête = nom de la compétition) :
//   Ligue 2
//   Auxerre - Metz - 2026-11-20 20:00 - 2.10 3.20 3.50
//   Caen - Rodez - 21/11/2026 15:00 - 1.80 3.40 4.50 1X 1.15 +2.5 1.95 -2.5 1.80
// Après les trois cotes (1, X, 2), des cotes facultatives : 1X, X2, 12 (double chance) et +2.5 / -2.5
// (plus/moins de buts, toute ligne en .5). Une double chance absente est calculée à partir du 1X2.

export type CotesLot = { c1: number; cx: number; c2: number; dc1x?: number; dcx2?: number; dc12?: number; ou: { sens: 'over' | 'under'; ligne: string; cote: number }[] };
export type MatchLot = { competition: string; equipe1: string; equipe2: string; date_match: string; cotes: CotesLot };
export type ResultatLot = { matchs: MatchLot[]; erreurs: string[] };

export type Fuseau = 'Haiti' | 'Europe';

const RE_DATE = /^(\d{4})-(\d{2})-(\d{2})\s+(\d{1,2}):(\d{2})$|^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})$/;

// Haïti : UTC-4 toute l'année. Europe : UTC+2 d'avril à octobre, UTC+1 sinon.
export function dateVersUTC(texte: string, fuseau: Fuseau): string | null {
  const m = RE_DATE.exec(texte.trim());
  if (!m) return null;
  const [a, mo, j, h, mi] = m[1] ? [m[1], m[2], m[3], m[4], m[5]] : [m[8], m[7], m[6], m[9], m[10]];
  const p2 = (x: string) => x.padStart(2, '0');
  if (+mo < 1 || +mo > 12 || +j < 1 || +j > 31 || +h > 23 || +mi > 59) return null;
  const decalage = fuseau === 'Haiti' ? '-04:00' : (+mo >= 4 && +mo <= 10 ? '+02:00' : '+01:00');
  const d = new Date(a + '-' + p2(mo) + '-' + p2(j) + 'T' + p2(h) + ':' + mi + ':00' + decalage);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

const nombre = (t: string) => {
  if (!/^\d+([.,]\d{1,2})?$/.test(t)) return null;
  const v = parseFloat(t.replace(',', '.'));
  return v >= 1.01 && v <= 1000 ? v : null;
};

export function parserLotCaisse(texte: string, fuseau: Fuseau, maintenant: number = Date.now()): ResultatLot {
  const matchs: MatchLot[] = [];
  const erreurs: string[] = [];
  let competition = '';
  for (const brut of texte.split('\n')) {
    const ligne = brut.trim();
    if (!ligne) continue;
    const parts = ligne.split(' - ').map(p => p.trim());
    const aDate = parts.length >= 4 && RE_DATE.test(parts[parts.length - 2]);
    if (!aDate) {
      // Sans date : en-tête de compétition (mais une ligne qui ressemble à un match mal formé est signalée).
      if (/\d{1,2}:\d{2}/.test(ligne) || / - .* - /.test(ligne)) erreurs.push(ligne + '  → format : Équipe1 - Équipe2 - AAAA-MM-JJ HH:MM - 1.90 3.20 4.10');
      else competition = ligne.slice(0, 80);
      continue;
    }
    const oddsTxt = parts[parts.length - 1];
    const dateTxt = parts[parts.length - 2];
    const equipe2 = parts[parts.length - 3];
    const equipe1 = parts.slice(0, parts.length - 3).join(' - ');
    const date = dateVersUTC(dateTxt, fuseau);
    if (!equipe1 || !equipe2 || !date) { erreurs.push(ligne + '  → équipes ou date illisibles'); continue; }
    if (new Date(date).getTime() <= maintenant) { erreurs.push(ligne + '  → date déjà passée'); continue; }

    const tok = oddsTxt.split(/\s+/);
    const base = tok.slice(0, 3).map(nombre);
    if (tok.length < 3 || base.some(v => v === null)) { erreurs.push(ligne + '  → trois cotes 1 X 2 attendues (entre 1.01 et 1000)'); continue; }
    const cotes: CotesLot = { c1: base[0] as number, cx: base[1] as number, c2: base[2] as number, ou: [] };
    let ok = true;
    for (let i = 3; i < tok.length; i += 2) {
      const cle = tok[i].toUpperCase(), v = nombre(tok[i + 1] || '');
      const mou = /^([+-])(\d{1,2}\.5)$/.exec(tok[i]);
      if (v === null || !(cle === '1X' || cle === 'X2' || cle === '12' || mou)) { ok = false; break; }
      if (cle === '1X') cotes.dc1x = v; else if (cle === 'X2') cotes.dcx2 = v; else if (cle === '12') cotes.dc12 = v;
      else if (mou) cotes.ou.push({ sens: mou[1] === '+' ? 'over' : 'under', ligne: mou[2], cote: v });
    }
    if (!ok) { erreurs.push(ligne + '  → cote facultative illisible (1X, X2, 12, +2.5, -2.5 suivis d\'une cote)'); continue; }
    matchs.push({ competition, equipe1, equipe2, date_match: date, cotes });
  }
  return { matchs, erreurs };
}

// Offres à créer pour un match collé (double chance calculée si non fournie).
const dcCalc = (a: number, b: number) => Math.max(1.01, Math.round((1 / (1 / a + 1 / b)) * 100) / 100);
export function offresDuLot(c: CotesLot): { marche: '1x2' | 'dc' | 'ou'; choix: string; cote: number }[] {
  return [
    { marche: '1x2', choix: '1', cote: c.c1 }, { marche: '1x2', choix: 'X', cote: c.cx }, { marche: '1x2', choix: '2', cote: c.c2 },
    { marche: 'dc', choix: '1X', cote: c.dc1x ?? dcCalc(c.c1, c.cx) },
    { marche: 'dc', choix: 'X2', cote: c.dcx2 ?? dcCalc(c.cx, c.c2) },
    { marche: 'dc', choix: '12', cote: c.dc12 ?? dcCalc(c.c1, c.c2) },
    ...c.ou.map(o => ({ marche: 'ou' as const, choix: o.sens + '_' + o.ligne, cote: o.cote }))
  ];
}

// Règle des 3 jours : un match disparaît des listes d'administration 3 jours après son coup d'envoi.
export const JOURS_VISIBILITE = 3;
export const matchVisibleCaisse = (dateMatch: string, maintenant: number = Date.now()) =>
  new Date(dateMatch).getTime() + JOURS_VISIBILITE * 86400000 > maintenant;
