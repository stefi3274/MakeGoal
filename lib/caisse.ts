// ============================================================
// PARIS EN CAISSE : règles pures (sans accès base), utilisées par les routes serveur et les pages.
// ============================================================

export type Marche = '1x2' | 'dc' | 'mt_1x2' | 'mt_dc' | 'une_mt' | 'ou' | 'combo' | 'buteur' | 'premier_buteur' | 'qualif';
export type Resultat = 'gagne' | 'perdu' | 'annule';
export type Leg = { marche: Marche; choix: string };
export type Contexte = { ftH: number | null; ftA: number | null; htH: number | null; htA: number | null };

// Limites de la caisse (à ajuster ici).
export const MISE_MIN = 25;
export const MISE_MAX = 1000;
export const PAIEMENT_CAISSIER_MAX = 100000; // au-dessus : paiement par un administrateur seulement
export const GAIN_MAX = 1000000;
export const SELECTIONS_MAX = 20;
export const VALIDITE_JOURS = 30; // délai pour réclamer un gain après le dernier match

export const MARCHES: Record<Marche, { label: string; auto: boolean }> = {
  '1x2': { label: 'Victoire 1 / Nul / Victoire 2', auto: true },
  dc: { label: 'Double chance', auto: true },
  mt_1x2: { label: 'Mi-temps : 1 / Nul / 2', auto: true },
  mt_dc: { label: 'Mi-temps : double chance', auto: true },
  une_mt: { label: 'Gagne au moins une mi-temps', auto: true },
  ou: { label: 'Plus / Moins de buts', auto: true },
  combo: { label: 'Combo', auto: true },
  buteur: { label: 'Buteur (marque dans le match)', auto: false },
  premier_buteur: { label: 'Premier buteur', auto: false },
  qualif: { label: 'Qualification', auto: false }
};

const CHOIX_1X2 = ['1', 'X', '2'];
const CHOIX_DC = ['1X', 'X2', '12'];

export function choixValide(marche: Marche, choix: string): boolean {
  switch (marche) {
    case '1x2': case 'mt_1x2': return CHOIX_1X2.includes(choix);
    case 'dc': case 'mt_dc': return CHOIX_DC.includes(choix);
    case 'une_mt': case 'qualif': return choix === '1' || choix === '2';
    case 'ou': return /^(over|under)_\d{1,2}\.5$/.test(choix);
    case 'buteur': case 'premier_buteur': return choix.trim().length >= 2 && choix.length <= 60;
    case 'combo': return choix.trim().length >= 2 && choix.length <= 80;
    default: return false;
  }
}

const gagnePerdu = (b: boolean): Resultat => (b ? 'gagne' : 'perdu');

function issue1x2(choix: string, h: number, a: number): Resultat | null {
  if (choix === '1') return gagnePerdu(h > a);
  if (choix === 'X') return gagnePerdu(h === a);
  if (choix === '2') return gagnePerdu(a > h);
  return null;
}
function issueDc(choix: string, h: number, a: number): Resultat | null {
  if (choix === '1X') return gagnePerdu(h >= a);
  if (choix === 'X2') return gagnePerdu(a >= h);
  if (choix === '12') return gagnePerdu(h !== a);
  return null;
}

// Résultat calculable automatiquement à partir des scores. null = pas assez d'information (ou règlement manuel).
export function resultatAuto(marche: Marche, choix: string, ctx: Contexte, legs?: Leg[] | null): Resultat | null {
  const { ftH, ftA, htH, htA } = ctx;
  const ft = ftH !== null && ftA !== null;
  const ht = htH !== null && htA !== null;
  switch (marche) {
    case '1x2': return ft ? issue1x2(choix, ftH as number, ftA as number) : null;
    case 'dc': return ft ? issueDc(choix, ftH as number, ftA as number) : null;
    case 'mt_1x2': return ht ? issue1x2(choix, htH as number, htA as number) : null;
    case 'mt_dc': return ht ? issueDc(choix, htH as number, htA as number) : null;
    case 'une_mt': {
      if (!ft || !ht) return null;
      const h2 = (ftH as number) - (htH as number), a2 = (ftA as number) - (htA as number);
      if (h2 < 0 || a2 < 0) return null; // scores incohérents : à corriger avant règlement
      if (choix === '1') return gagnePerdu((htH as number) > (htA as number) || h2 > a2);
      if (choix === '2') return gagnePerdu((htA as number) > (htH as number) || a2 > h2);
      return null;
    }
    case 'ou': {
      if (!ft) return null;
      const m = /^(over|under)_(\d{1,2}\.5)$/.exec(choix);
      if (!m) return null;
      const total = (ftH as number) + (ftA as number), ligne = parseFloat(m[2]);
      return gagnePerdu(m[1] === 'over' ? total > ligne : total < ligne);
    }
    case 'combo': {
      if (!legs || legs.length < 2) return null;
      let tout = true;
      for (const l of legs) {
        if (l.marche === 'combo' || !MARCHES[l.marche]?.auto) return null;
        const r = resultatAuto(l.marche, l.choix, ctx);
        if (r === null) return null;
        if (r === 'perdu') return 'perdu';
        if (r !== 'gagne') tout = false;
      }
      return tout ? 'gagne' : null;
    }
    default: return null;
  }
}

export function libelleOffre(marche: Marche, choix: string, e1: string, e2: string): string {
  const nom = (c: string) => (c === '1' ? e1 : c === '2' ? e2 : 'Nul');
  const dc = (c: string) => (c === '1X' ? e1 + ' ou Nul' : c === 'X2' ? 'Nul ou ' + e2 : e1 + ' ou ' + e2);
  switch (marche) {
    case '1x2': return choix === 'X' ? 'Match nul' : 'Victoire ' + nom(choix);
    case 'dc': return 'Double chance : ' + dc(choix);
    case 'mt_1x2': return 'Mi-temps : ' + (choix === 'X' ? 'Nul' : 'Victoire ' + nom(choix));
    case 'mt_dc': return 'Mi-temps double chance : ' + dc(choix);
    case 'une_mt': return nom(choix) + ' gagne au moins une mi-temps';
    case 'ou': { const [s, l] = choix.split('_'); return (s === 'over' ? 'Plus de ' : 'Moins de ') + l + ' buts'; }
    case 'buteur': return 'Buteur : ' + choix.trim();
    case 'premier_buteur': return 'Premier buteur : ' + choix.trim();
    case 'qualif': return 'Qualification : ' + nom(choix);
    default: return choix.trim();
  }
}

// Texte d'un combo à partir de ses jambes (si l'admin n'en donne pas).
export function libelleCombo(legs: Leg[], e1: string, e2: string): string {
  return legs.map(l => libelleOffre(l.marche, l.choix, e1, e2)).join(' + ');
}

export const arrondi2 = (n: number) => Math.round(n * 100) / 100;
export const plancher2 = (n: number) => Math.floor(n * 100 + 1e-9) / 100;

export function calculerTicket(mise: number, cotes: number[]): { coteTotale: number; gain: number } {
  const coteTotale = arrondi2(cotes.reduce((acc, c) => acc * c, 1));
  return { coteTotale, gain: plancher2(mise * coteTotale) };
}

export type LigneRegl = { cote: number; resultat: Resultat | null };

// État d'un ticket à partir de ses lignes. Une ligne annulée compte pour une cote de 1.
export function statutTicket(mise: number, lignes: LigneRegl[]): { statut: 'en_attente' | 'gagnant' | 'perdant'; gain: number | null } {
  if (lignes.some(l => l.resultat === 'perdu')) return { statut: 'perdant', gain: 0 };
  if (lignes.some(l => l.resultat === null)) return { statut: 'en_attente', gain: null };
  const cotes = lignes.filter(l => l.resultat === 'gagne').map(l => l.cote);
  const { gain } = calculerTicket(mise, cotes);
  return { statut: 'gagnant', gain: Math.min(gain, GAIN_MAX) };
}

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export function codeDepuisOctets(octets: Uint8Array): string {
  let c = '';
  for (let i = 0; i < 6; i++) c += ALPHABET[octets[i] % ALPHABET.length];
  return c;
}

export const numeroAffiche = (n: number) => 'T' + String(n).padStart(6, '0');
export function lireNumero(saisie: string): number | null {
  const m = /^\s*T?0*(\d{1,12})\s*$/i.exec(saisie || '');
  return m ? parseInt(m[1], 10) : null;
}
