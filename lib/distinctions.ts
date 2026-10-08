// Source UNIQUE des distinctions (catégories + collage en lot).
// Importé par l'admin (app/admin/media/page.tsx). Le post public n'a besoin
// que de l'affichage ; ne jamais recopier ces listes ailleurs.

export type GroupeDistinction = { titre: string; items: string[] };

export const GROUPES_DISTINCTIONS: GroupeDistinction[] = [
  {
    titre: '⚽ Joueur',
    items: [
      'Joueur de la journée', 'Joueur de la semaine', 'Joueur du mois', 'Joueur du trimestre', 'Joueur de la saison',
      'Joueur du club', 'Joueur du championnat', 'Homme du match',
      'Meilleur buteur', 'Meilleur passeur', 'Meilleur gardien', 'Meilleur jeune / Révélation',
      'MVP du tournoi', 'Ballon d\'or',
    ],
  },
  {
    titre: '🧢 Entraîneur',
    items: ['Entraîneur de la journée', 'Entraîneur du mois', 'Entraîneur du trimestre', 'Entraîneur de la saison', 'Meilleur entraîneur'],
  },
  {
    titre: '🛡️ Équipe',
    items: [
      'Équipe de la journée', 'Équipe de la semaine', 'Équipe du mois', 'Équipe du trimestre', 'Équipe de la saison', 'Équipe du tournoi',
      'Meilleure attaque', 'Meilleure défense', 'Équipe fair-play',
    ],
  },
];

export const DISTINCTIONS: string[] = [...GROUPES_DISTINCTIONS.flatMap(g => g.items), 'Autre'];

export type DistinctionDetails = { equipe: string; championnat: string; periode: string; photo: string; pays?: string };
export const DETAILS_VIDES: DistinctionDetails = { equipe: '', championnat: '', periode: '', photo: '', pays: '' };

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '');

// La distinction récompense une équipe : le lauréat EST l'équipe.
export function estDistinctionEquipe(categorie: string): boolean {
  const n = norm(categorie);
  return n.startsWith('equipe') || n.startsWith('meilleureattaque') || n.startsWith('meilleuredefense');
}

// Retrouve la catégorie officielle d'après un texte saisi (accents, majuscules,
// singulier/pluriel et "du/de la/de l'" tolérés). undefined = catégorie libre.
export function trouverDistinction(texte: string): string | undefined {
  const n = norm(texte);
  if (!n) return undefined;
  return DISTINCTIONS.filter(d => d !== 'Autre').find(d => norm(d) === n);
}

export type DistinctionLot = {
  categorie: string;      // catégorie officielle, ou texte libre si inconnue
  officielle: boolean;
  laureat: string;
  equipe: string;
  championnat: string;
  periode: string;
  pays: string;
  stats: string;
  note: string;
};

// Format, un bloc par distinction, séparés par une ligne vide :
//   Joueur du mois - Wilson Isidor - Haïti - Ligue 2 - Septembre 2026
//   4 buts, 2 passes décisives            (ligne 2 : stats, optionnelle)
//   Auteur de 4 buts en 5 matchs.         (lignes suivantes : note, optionnelle)
// Pour une distinction d'ÉQUIPE le lauréat est l'équipe :
//   Équipe du mois - Arsenal - Premier League - Septembre 2026
// Pays du lauréat (drapeau), facultatif, en dernier champ :
//   Joueur du mois - Wilson Isidor - Grenoble - Ligue 2 - Septembre 2026 - Haïti
// Séparateurs de champs : " - " (tiret entouré d'espaces) ou "|".
export function parserLotDistinctions(texte: string): { distinctions: DistinctionLot[]; ignores: number } {
  const blocs = (texte || '').split(/\n\s*\n/).map(b => b.trim()).filter(Boolean);
  const distinctions: DistinctionLot[] = [];
  let ignores = 0;
  for (const bloc of blocs) {
    const lignes = bloc.split('\n').map(l => l.trim()).filter(Boolean);
    const champs = lignes[0].split(/\s+[-–—]\s+|\s*\|\s*/).map(c => c.trim());
    const categorieSaisie = champs[0] || '';
    const reste = champs.slice(1);
    if (!categorieSaisie || !reste[0]) { ignores++; continue; }
    const officielle = trouverDistinction(categorieSaisie);
    const categorie = officielle || categorieSaisie;
    const equipeLaureat = estDistinctionEquipe(categorie);
    const laureat = reste[0] || '';
    const equipe = equipeLaureat ? laureat : (reste[1] || '');
    const championnat = (equipeLaureat ? reste[1] : reste[2]) || '';
    const periode = (equipeLaureat ? reste[2] : reste[3]) || '';
    const pays = equipeLaureat ? '' : ((reste[4]) || '');
    distinctions.push({
      categorie, officielle: !!officielle, laureat, equipe, championnat, periode, pays,
      stats: lignes[1] || '', note: lignes.slice(2).join(' '),
    });
  }
  return { distinctions, ignores };
}

// "Équipe · Championnat" affiché sous le lauréat.
export function ligneContexte(d: Partial<DistinctionDetails> | null | undefined, laureat?: string | null): string {
  if (!d) return '';
  const equipe = d.equipe && d.equipe.trim().toLowerCase() !== (laureat || '').trim().toLowerCase() ? d.equipe.trim() : '';
  return [equipe, (d.championnat || '').trim()].filter(Boolean).join(' · ');
}
