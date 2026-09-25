// Source UNIQUE des catégories "Stats joueur".
// Importé par l'admin (app/admin/media/page.tsx) ET par le post public
// (app/post/[id]/PostClient.tsx) : ne jamais recopier ces listes ailleurs.

export type ChampStat = { cle: string; label: string };
export type StatsPoste = 'champ' | 'defenseur' | 'gardien';

export const POSTES_LABELS: Record<StatsPoste, string> = {
  champ: '🏃 Attaquant / Milieu',
  defenseur: '🛡️ Défenseur',
  gardien: '🧤 Gardien',
};

export const CHAMPS_STATS: Record<StatsPoste, ChampStat[]> = {
  champ: [
    { cle: 'matchsJoues', label: 'Matchs joués' }, { cle: 'minutes', label: 'Minutes jouées' }, { cle: 'note', label: 'Note' },
    { cle: 'buts', label: 'Buts' }, { cle: 'passesDec', label: 'Passes décisives' },
    { cle: 'tirs', label: 'Tirs' }, { cle: 'tirsCadres', label: 'Tirs cadrés' },
    { cle: 'occasionsCreees', label: 'Occasions créées' }, { cle: 'centresReussis', label: 'Centres réussis' },
    { cle: 'dribbles', label: 'Dribbles réussis' }, { cle: 'ballonsTouches', label: 'Ballons touchés' },
    { cle: 'passesReussies', label: 'Passes réussies' }, { cle: 'mauvaisesPasses', label: 'Mauvaises passes' },
    { cle: 'pertesBalle', label: 'Pertes de balle' },
    { cle: 'duelsGagnes', label: 'Duels gagnés' }, { cle: 'duelsPerdus', label: 'Duels perdus' },
    { cle: 'interceptions', label: 'Interceptions' }, { cle: 'horsJeu', label: 'Hors-jeu' },
    { cle: 'fautesCommises', label: 'Fautes commises' }, { cle: 'fautesSubies', label: 'Fautes subies' },
    { cle: 'cartonJaune', label: 'Carton jaune' }, { cle: 'cartonRouge', label: 'Carton rouge' },
  ],
  defenseur: [
    { cle: 'matchsJoues', label: 'Matchs joués' }, { cle: 'minutes', label: 'Minutes jouées' }, { cle: 'note', label: 'Note' },
    { cle: 'tacles', label: 'Tacles réussis' }, { cle: 'interceptions', label: 'Interceptions' },
    { cle: 'degagements', label: 'Dégagements' }, { cle: 'tirsBloques', label: 'Tirs bloqués' },
    { cle: 'recuperations', label: 'Récupérations' },
    { cle: 'duelsAeriensGagnes', label: 'Duels aériens gagnés' },
    { cle: 'duelsGagnes', label: 'Duels gagnés' }, { cle: 'duelsPerdus', label: 'Duels perdus' },
    { cle: 'dribbleSubis', label: 'Dribblé (subis)' },
    { cle: 'passesReussies', label: 'Passes réussies' }, { cle: 'longsBallons', label: 'Longs ballons réussis' },
    { cle: 'mauvaisesPasses', label: 'Mauvaises passes' }, { cle: 'pertesBalle', label: 'Pertes de balle' },
    { cle: 'erreursBut', label: 'Erreurs menant à un but' },
    { cle: 'buts', label: 'Buts' }, { cle: 'passesDec', label: 'Passes décisives' },
    { cle: 'fautesCommises', label: 'Fautes commises' },
    { cle: 'cartonJaune', label: 'Carton jaune' }, { cle: 'cartonRouge', label: 'Carton rouge' },
  ],
  gardien: [
    { cle: 'matchsJoues', label: 'Matchs joués' }, { cle: 'minutes', label: 'Minutes jouées' }, { cle: 'note', label: 'Note' },
    { cle: 'arrets', label: 'Arrêts' }, { cle: 'butsEncaisses', label: 'Buts encaissés' }, { cle: 'cleanSheet', label: 'Clean sheet' },
    { cle: 'penaltysArretes', label: 'Penalties arrêtés' }, { cle: 'sorties', label: 'Sorties' },
    { cle: 'degagements', label: 'Dégagements' },
    { cle: 'passesReussies', label: 'Passes réussies' }, { cle: 'longsBallons', label: 'Longs ballons réussis' },
    { cle: 'erreursBut', label: 'Erreurs menant à un but' },
    { cle: 'cartonJaune', label: 'Carton jaune' }, { cle: 'cartonRouge', label: 'Carton rouge' },
  ],
};

export const CHAMPS_STATS_BASKET: ChampStat[] = [
  { cle: 'matchsJoues', label: 'Matchs joués' }, { cle: 'minutes', label: 'Minutes jouées' }, { cle: 'points', label: 'Points' },
  { cle: 'rebonds', label: 'Rebonds' }, { cle: 'passesDec', label: 'Passes décisives' },
  { cle: 'interceptions', label: 'Interceptions' }, { cle: 'contres', label: 'Contres' }, { cle: 'ballesPerdues', label: 'Balles perdues' },
  { cle: 'tirsReussis', label: '% Tirs réussis' },
];

// Toutes les catégories football, celles du poste choisi en premier.
// Sert à l'affichage public et au parsing : une stat saisie n'est
// jamais perdue, même si elle appartient à un autre poste.
export function champsFootball(poste: StatsPoste | string | null | undefined): ChampStat[] {
  const p: StatsPoste = poste === 'defenseur' || poste === 'gardien' ? poste : 'champ';
  const ordre: StatsPoste[] = [p, ...(['champ', 'defenseur', 'gardien'] as StatsPoste[]).filter(x => x !== p)];
  const vus = new Set<string>();
  const res: ChampStat[] = [];
  ordre.forEach(k => CHAMPS_STATS[k].forEach(c => { if (!vus.has(c.cle)) { vus.add(c.cle); res.push(c); } }));
  return res;
}

export function champsAffichage(sport: string | null | undefined, poste: StatsPoste | string | null | undefined): ChampStat[] {
  return sport === 'basketball' ? CHAMPS_STATS_BASKET : champsFootball(poste);
}

export const normaliserLabel = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '');

// Variantes courantes (abréviations, singulier/pluriel, synonymes).
const ALIAS: Record<string, string> = {
  passesdec: 'passesDec', passedec: 'passesDec', passedecisive: 'passesDec', passesdecisive: 'passesDec', passedecisives: 'passesDec', assists: 'passesDec', assist: 'passesDec',
  but: 'buts', goals: 'buts', goal: 'buts',
  tir: 'tirs', tirscadre: 'tirsCadres', tircadre: 'tirsCadres', tircadres: 'tirsCadres',
  centrereussi: 'centresReussis', centresreussi: 'centresReussis', centrereussis: 'centresReussis',
  occasioncreee: 'occasionsCreees', occasionscreee: 'occasionsCreees',
  passereussie: 'passesReussies', passesreussie: 'passesReussies', passereussies: 'passesReussies', passes: 'passesReussies',
  duelgagne: 'duelsGagnes', duelsgagne: 'duelsGagnes', duelperdu: 'duelsPerdus', duelsperdu: 'duelsPerdus',
  duelaeriengagne: 'duelsAeriensGagnes', duelsaeriens: 'duelsAeriensGagnes', duelsaeriensgagne: 'duelsAeriensGagnes', duelaerien: 'duelsAeriensGagnes',
  pertedeballe: 'pertesBalle', perteballe: 'pertesBalle', pertesballe: 'pertesBalle', pertesballes: 'pertesBalle', pertedeballes: 'pertesBalle', pertesdeballes: 'pertesBalle', ballesperdues: 'pertesBalle', balleperdue: 'pertesBalle',
  ballontouche: 'ballonsTouches', ballonstouche: 'ballonsTouches',
  mauvaisepasse: 'mauvaisesPasses', mauvaisespasse: 'mauvaisesPasses', passeratee: 'mauvaisesPasses', passesratees: 'mauvaisesPasses', passesmanquees: 'mauvaisesPasses', passemanquee: 'mauvaisesPasses',
  dribble: 'dribbles', dribbles: 'dribbles', dribblereussi: 'dribbles', dribblesreussi: 'dribbles',
  horsjeux: 'horsJeu',
  cartonsjaunes: 'cartonJaune', cartonjaunes: 'cartonJaune', jaune: 'cartonJaune',
  cartonsrouges: 'cartonRouge', cartonrouges: 'cartonRouge', rouge: 'cartonRouge',
  matchjoue: 'matchsJoues', matchsjoue: 'matchsJoues', matchs: 'matchsJoues',
  minutes: 'minutes', minute: 'minutes', minutesjouees: 'minutes', minutejouee: 'minutes', minutesjoue: 'minutes', temps: 'minutes', tempsdejeu: 'minutes',
  tacle: 'tacles', tacles: 'tacles', taclereussi: 'tacles', taclesreussi: 'tacles',
  interception: 'interceptions',
  degagement: 'degagements', tirbloque: 'tirsBloques', tirsbloque: 'tirsBloques', contres: 'tirsBloques', contre: 'tirsBloques',
  recuperation: 'recuperations', ballonsrecuperes: 'recuperations', ballonrecupere: 'recuperations',
  dribblesubi: 'dribbleSubis', dribblessubis: 'dribbleSubis', dribblesubis: 'dribbleSubis', dribbleadv: 'dribbleSubis', foisdribble: 'dribbleSubis',
  longballon: 'longsBallons', longsballons: 'longsBallons', longballonreussi: 'longsBallons',
  erreur: 'erreursBut', erreurs: 'erreursBut', erreurmenantaunbut: 'erreursBut',
  fautecommise: 'fautesCommises', fautes: 'fautesCommises', faute: 'fautesCommises', fautesubie: 'fautesSubies',
  arret: 'arrets', parades: 'arrets', parade: 'arrets', butencaisse: 'butsEncaisses', butsencaisse: 'butsEncaisses',
  penaltyarrete: 'penaltysArretes', penaltiesarretes: 'penaltysArretes', penaltysarretes: 'penaltysArretes', sortie: 'sorties',
  cleansheets: 'cleanSheet', rebond: 'rebonds', point: 'points', contrebasket: 'contres',
};

// Retourne la clé de la catégorie correspondant au libellé saisi, en
// cherchant dans la liste fournie (football : toutes les catégories).
export function trouverCleStat(texte: string, champs: ChampStat[]): string | undefined {
  const n = normaliserLabel(texte);
  if (!n) return undefined;
  const valides = new Set(champs.map(c => c.cle));
  for (const c of champs) if (normaliserLabel(c.label) === n) return c.cle;
  const alias = ALIAS[n];
  if (alias && valides.has(alias)) return alias;
  // Préfixe (abréviation) : au moins 5 caractères, on garde le plus long.
  let meilleur: { cle: string; lg: number } | undefined;
  for (const c of champs) {
    const l = normaliserLabel(c.label);
    if (n.length >= 5 && l.length >= 5 && (l.startsWith(n) || n.startsWith(l))) {
      const lg = Math.min(l.length, n.length);
      if (!meilleur || lg > meilleur.lg) meilleur = { cle: c.cle, lg };
    }
  }
  return meilleur?.cle;
}

// 1re ligne d'un bloc : joueur, son équipe, adversaire.
// Formats acceptés :
//   Wilson Isidor - Haïti - Trinidad-et-Tobago
//   Wilson Isidor - Haïti vs Trinidad
//   Wilson Isidor (Haïti) face à Trinidad
// Le séparateur est un tiret ENTOURÉ d'espaces : les traits d'union
// dans les noms (Jean-Philippe, Saint-Étienne) sont préservés.
export function parserLigneJoueur(ligne: string): { nom: string; equipe: string; adversaire: string } {
  let reste = (ligne || '').trim();
  let adversaire = '';
  const mAdv = reste.match(/^(.*?)\s+(?:vs\.?|v\.?|face\s+(?:à|a)|contre)\s+(.+)$/i);
  if (mAdv) { reste = mAdv[1].trim(); adversaire = mAdv[2].trim(); }
  let nom = '', equipe = '';
  const mPar = reste.match(/^(.+?)\s*\((.+?)\)\s*(?:[-–—]\s*(.+))?$/);
  if (mPar) {
    nom = mPar[1].trim(); equipe = mPar[2].trim();
    if (!adversaire && mPar[3]) adversaire = mPar[3].trim();
  } else {
    const parts = reste.split(/\s+[-–—]\s+/).map(p => p.trim()).filter(Boolean);
    nom = parts[0] || '';
    equipe = parts[1] || '';
    if (!adversaire) adversaire = parts.slice(2).join(' - ');
  }
  return { nom, equipe, adversaire };
}
