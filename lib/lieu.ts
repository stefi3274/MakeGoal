// Source UNIQUE de la détection « domicile / extérieur » dans les textes collés
// (Derniers matchs, Parcours). Marqueurs reconnus : (D) (H) (dom.) domicile home
// et (E) (A) (ext.) extérieur déplacement away. « Neutre » est retiré sans effet.
export type Lieu = 'dom' | 'ext' | null;

const RE_EXT = [
  /[\(\[]\s*(?:e|a|ext\.?|away|ext[ée]rieur|d[ée]pl\.?|d[ée]placement)\s*[\)\]]/i,
  /(?:(?:^|\s)[àa]\s+l['’]\s*|\b)ext[ée]rieur\b/i,
  /\ben\s+d[ée]placement\b/i,
  /\bd[ée]placement\b/i,
  /\baway\b/i,
  /(?:^|\s)ext\.(?=\s|$)/i,
];
const RE_DOM = [
  /[\(\[]\s*(?:d|h|dom\.?|home|domicile)\s*[\)\]]/i,
  /(?:^|\s)[àa]\s+domicile\b/i,
  /\bdomicile\b/i,
  /\bhome\b/i,
  /(?:^|\s)dom\.(?=\s|$)/i,
];
const RE_NEUTRE = [/[\(\[]\s*(?:n|neutre)\s*[\)\]]/i, /\bterrain\s+neutre\b/i, /\bneutre\b/i];
// Segment isolé entre « | » : « D », « E », « Dom », « Ext »...
const SEG_EXT = /^(?:e|a|ext\.?|away)$/i;
const SEG_DOM = /^(?:d|h|dom\.?|home)$/i;

export function extraireLieu(brut: string): { lieu: Lieu; texte: string } {
  let t = brut;
  let lieu: Lieu = null;
  // segments isolés
  if (/\|/.test(t)) {
    t = t.split(/\s*\|\s*/).filter(seg => {
      const s = seg.trim();
      if (SEG_EXT.test(s)) { lieu = lieu || 'ext'; return false; }
      if (SEG_DOM.test(s)) { lieu = lieu || 'dom'; return false; }
      return true;
    }).join(' | ');
  }
  for (const re of RE_EXT) if (re.test(t)) { lieu = lieu || 'ext'; t = t.replace(new RegExp(re.source, 'gi'), ' '); }
  for (const re of RE_DOM) if (re.test(t)) { lieu = lieu || 'dom'; t = t.replace(new RegExp(re.source, 'gi'), ' '); }
  for (const re of RE_NEUTRE) t = t.replace(new RegExp(re.source, 'gi'), ' ');
  return { lieu, texte: t.replace(/\s{2,}/g, ' ').replace(/\s*\|\s*(?=\||$)/g, '').trim() };
}

// Convention d'affichage selon le sport :
// - Football : l'équipe qui REÇOIT est à gauche.
// - Basketball : c'est l'inverse, l'équipe qui SE DÉPLACE est à gauche (« visiteur @ domicile »).
export const gaucheEstDomicile = (sport?: string | null): boolean => sport !== 'basketball';
// true si l'ADVERSAIRE s'affiche à gauche, pour une équipe qui joue à domicile ou à l'extérieur.
export const adversaireAGauche = (sport: string | null | undefined, exterieur?: boolean): boolean =>
  gaucheEstDomicile(sport) ? !!exterieur : !exterieur;
