// Source UNIQUE du « Bilan historique » entre deux équipes (admin, post public, vidéo).
// On saisit les TOTAUX (victoires de chacune, nuls, buts), pas la liste des matchs.
// Rangé dans la colonne jsonb `articles.bilan_historique`.

export type BilanLigne = { label: string; v1: string; v2: string };
export type BilanHistorique = {
  equipe1: string; equipe2: string;
  matchs: string;            // total de matchs (facultatif : sinon victoires + nuls)
  victoires1: string; nuls: string; victoires2: string;
  buts1: string; buts2: string;
  competition: string;       // ex : « Toutes compétitions depuis 1902 »
  lignes: BilanLigne[];      // lignes libres (ex : Titres), 2 au maximum
  ecussons?: Record<string, string>;
};

export const MAX_LIGNES_BILAN = 2;
export const BILAN_VIDE: BilanHistorique = { equipe1: '', equipe2: '', matchs: '', victoires1: '', nuls: '', victoires2: '', buts1: '', buts2: '', competition: '', lignes: [] };
export const LIGNE_BILAN_VIDE: BilanLigne = { label: '', v1: '', v2: '' };

const chiffres = (v: string | null | undefined): string => {
  const t = (v ?? '').toString().trim();
  return /^\d{1,5}$/.test(t) ? String(parseInt(t, 10)) : '';
};
export const nb = (v: string | null | undefined): number => (chiffres(v) ? parseInt(chiffres(v), 10) : 0);

export const bilanValide = (b: BilanHistorique | null | undefined): boolean =>
  !!b && b.equipe1.trim() !== '' && b.equipe2.trim() !== '' && (nb(b.victoires1) + nb(b.nuls) + nb(b.victoires2) > 0);

// Total affiché : celui saisi, sinon la somme victoires + nuls.
export const totalMatchs = (b: BilanHistorique): number => nb(b.matchs) || (nb(b.victoires1) + nb(b.nuls) + nb(b.victoires2));

export const butsRenseignes = (b: BilanHistorique): boolean => chiffres(b.buts1) !== '' && chiffres(b.buts2) !== '' && (nb(b.buts1) + nb(b.buts2) > 0);

export const lignesPubliees = (l: BilanLigne[] | null | undefined): BilanLigne[] =>
  (Array.isArray(l) ? l : []).filter(x => x && String(x.label || '').trim() && chiffres(x.v1) !== '' && chiffres(x.v2) !== '').slice(0, MAX_LIGNES_BILAN)
    .map(x => ({ label: String(x.label).trim().slice(0, 40), v1: chiffres(x.v1), v2: chiffres(x.v2) }));

// Version propre (chiffres seulement) prête à enregistrer / afficher.
export function bilanPublie(b: BilanHistorique): BilanHistorique {
  return {
    equipe1: b.equipe1.trim(), equipe2: b.equipe2.trim(),
    matchs: chiffres(b.matchs), victoires1: chiffres(b.victoires1), nuls: chiffres(b.nuls), victoires2: chiffres(b.victoires2),
    buts1: chiffres(b.buts1), buts2: chiffres(b.buts2),
    competition: (b.competition || '').trim().slice(0, 80),
    lignes: lignesPubliees(b.lignes),
    ecussons: b.ecussons,
  };
}

// Part (0 à 1) de a dans a + b, pour les barres.
export const part = (a: number, b: number): number => (a + b > 0 ? a / (a + b) : 0.5);

export const libelleBilan = (b: BilanHistorique): string => 'Bilan historique : ' + b.equipe1 + ' vs ' + b.equipe2;

const norm = (t: string) => t.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');

// Texte collé :
//   Real Madrid vs FC Barcelone | Toutes compétitions depuis 1902   (période facultative)
//   Victoires: 105 - 100
//   Nuls: 52
//   Buts: 470 - 441
//   Matchs: 257                                                      (facultatif)
//   Titres: 98 - 90                                                  (lignes libres, 2 au maximum)
export function parserBilan(texte: string): { bilan: BilanHistorique; inconnues: string[] } {
  const lignes = (texte || '').split('\n').map(l => l.trim()).filter(Boolean);
  const b: BilanHistorique = { ...BILAN_VIDE, lignes: [] };
  const inconnues: string[] = [];
  const [premiere, ...reste] = lignes;
  if (premiere) {
    const [duel, ...per] = premiere.split('|');
    const m = duel.match(/^(.+?)\s+(?:vs\.?|v\.?|contre|-|–|—)\s+(.+)$/i);
    if (m) { b.equipe1 = m[1].trim(); b.equipe2 = m[2].trim(); b.competition = per.join('|').trim(); }
    else inconnues.push(premiere);
  }
  const deux = (v: string): [string, string] | null => {
    const m = v.match(/^(\d+)\s*(?:-|–|—|\/|:|\|)\s*(\d+)$/);
    return m ? [m[1], m[2]] : null;
  };
  reste.forEach(l => {
    const m = l.match(/^(.+?)\s*[:=]\s*(.+)$/);
    if (!m) { inconnues.push(l); return; }
    const cle = norm(m[1]), val = m[2].trim();
    if (/^victoires?$/.test(cle)) { const d = deux(val); if (d) { b.victoires1 = d[0]; b.victoires2 = d[1]; } else inconnues.push(l); }
    else if (/^nuls?$|^matchsnuls?$/.test(cle)) { if (/^\d+$/.test(val)) b.nuls = val; else inconnues.push(l); }
    else if (/^buts?(marques)?$/.test(cle)) { const d = deux(val); if (d) { b.buts1 = d[0]; b.buts2 = d[1]; } else inconnues.push(l); }
    else if (/^(total)?matchs?(joues)?$/.test(cle)) { if (/^\d+$/.test(val)) b.matchs = val; else inconnues.push(l); }
    else { const d = deux(val); if (d && b.lignes.length < MAX_LIGNES_BILAN) b.lignes.push({ label: m[1].trim(), v1: d[0], v2: d[1] }); else inconnues.push(l); }
  });
  return { bilan: b, inconnues };
}
