// Source UNIQUE des catégories "Stats joueur".
// Importé par l'admin (app/admin/media/page.tsx) ET par le post public
// (app/post/[id]/PostClient.tsx) : ne jamais recopier ces listes ailleurs.

export type ChampStat = { cle: string; label: string };
export type GroupeStat = { titre: string; champs: ChampStat[] };
export type StatsPoste = 'attaquant' | 'milieu' | 'defenseur' | 'gardien';

export const POSTES_LABELS: Record<StatsPoste, string> = {
  attaquant: '⚽ Attaquant',
  milieu: '🎯 Milieu',
  defenseur: '🛡️ Défenseur',
  gardien: '🧤 Gardien',
};

// Anciens posts : le poste s'appelait 'champ'.
export function normaliserPoste(p: string | null | undefined): StatsPoste {
  return p === 'milieu' || p === 'defenseur' || p === 'gardien' ? p : 'attaquant';
}

// Catalogue complet des statistiques football (une seule définition par clé).
const CAT: Record<string, string> = {
  // Général
  matchsJoues: 'Matchs joués', titularisations: 'Titularisations', minutes: 'Minutes jouées', note: 'Note',
  // Attaque
  buts: 'Buts', penaltysMarques: 'Penalties marqués', tirs: 'Tirs', tirsCadres: 'Tirs cadrés',
  grossesOccasionsRatees: 'Grosses occasions ratées', dribbles: 'Dribbles réussis', ballonsTouches: 'Ballons touchés', horsJeu: 'Hors-jeu',
  // Création et passes
  passesDec: 'Passes décisives', passesCles: 'Passes clés', occasionsCreees: 'Occasions créées', centresReussis: 'Centres réussis',
  passesReussies: 'Passes réussies', mauvaisesPasses: 'Mauvaises passes', longsBallons: 'Longs ballons réussis', pertesBalle: 'Pertes de balle',
  // Défense
  tacles: 'Tacles réussis', interceptions: 'Interceptions', recuperations: 'Récupérations', degagements: 'Dégagements',
  tirsBloques: 'Tirs bloqués', duelsGagnes: 'Duels gagnés', duelsPerdus: 'Duels perdus', duelsAeriensGagnes: 'Duels aériens gagnés',
  dribbleSubis: 'Dribblé (subis)', cleanSheet: 'Clean sheets', erreursBut: 'Erreurs menant à un but',
  // Discipline
  fautesCommises: 'Fautes commises', fautesSubies: 'Fautes subies', cartonJaune: 'Carton jaune', cartonRouge: 'Carton rouge',
  // Carrière : palmarès collectif
  coupesMonde: 'Coupes du monde', titresContinentaux: 'Titres continentaux (Euro, Copa, CAN...)', olympiques: 'Médailles olympiques',
  coupesNationales: 'Coupes nationales', supercoupes: 'Supercoupes nationales', coupesMondeClubs: 'Coupes du monde des clubs',
  // Carrière : distinctions individuelles
  theBest: 'Prix The Best (FIFA)', souliersOr: 'Souliers d\'or', meilleurJoueurMondial: 'Meilleur joueur de Coupe du monde', mvpChampionnat: 'MVP de championnat', titresMeilleurButeur: 'Titres de meilleur buteur',
  // Palmarès (comparaisons de carrière)
  titres: 'Titres', ballonsOr: 'Ballons d\'or', trophees: 'Trophées', ligueChampions: 'Ligues des champions', titresChampionnat: 'Titres de champion', selections: 'Sélections', butsSelection: 'Buts en sélection',
  // Match : ajouts
  tirsNonCadres: 'Tirs non cadrés', tirsContres: 'Tirs contrés', poteaux: 'Poteaux / barres', penaltysObtenus: 'Penalties obtenus', penaltysRates: 'Penalties ratés',
  butsTete: 'Buts de la tête', butsCoupFranc: 'Buts sur coup franc', xg: 'xG (buts attendus)', dribblesTentes: 'Dribbles tentés', ballonsSurface: 'Ballons touchés dans la surface',
  passesTentees: 'Passes tentées', pctPasses: '% de passes réussies', passesProgressives: 'Passes progressives', prePasseDec: 'Passes pré-décisives', grossesOccasionsCreees: 'Grosses occasions créées', xa: 'xA (passes dé. attendues)', centresTentes: 'Centres tentés',
  pctDuels: '% de duels gagnés', duelsSolGagnes: 'Duels au sol gagnés', duelsAeriensPerdus: 'Duels aériens perdus', sauvetagesLigne: 'Sauvetages sur la ligne', pressings: 'Pressings réussis', butContreSonCamp: 'But contre son camp',
  doubleJaune: 'Double carton jaune', penaltysConcedes: 'Penalties concédés',
  distance: 'Distance parcourue (km)', sprints: 'Sprints', vitesseMax: 'Vitesse max (km/h)',
  tirsAffrontes: 'Tirs cadrés affrontés', arretsDifficiles: 'Arrêts difficiles', butsEvites: 'Buts évités (xGP)', ballonsAeriensCaptes: 'Ballons aériens captés', relancesMain: 'Relances à la main', degagementsPoing: 'Dégagements au poing', passesGardien: 'Passes réussies (gardien)',
  // Carrière : totaux et détails
  contributionsDirectes: 'Contributions directes', hatTricks: 'Triplés (hat-tricks)', butsCoupFrancCarriere: 'Buts sur coup franc',
  titresSelection: 'Titres en sélection', titresClub: 'Titres en club',
  finalissima: 'Finalissima', coupeMondeJeunes: 'Coupe du monde des jeunes (U20)', supercoupesContinentales: 'Supercoupes continentales (UEFA...)', coupesLigue: 'Coupes de la Ligue / Trophées des champions', ligueNations: 'Ligue des nations', autresTitresClub: 'Autres titres de club (Leagues Cup, Supporters\' Shield...)',
  joueurAnnee: 'Joueur de l\'année (continental)', meilleurJoueurContinental: 'Meilleur joueur de compétition continentale', titresMeilleurPasseur: 'Titres de meilleur passeur', equipesType: 'Équipes types', meilleurJeune: 'Meilleur jeune',
  // Gardien
  arrets: 'Arrêts', pctArrets: '% d\'arrêts', butsEncaisses: 'Buts encaissés', penaltysArretes: 'Penalties arrêtés', sorties: 'Sorties',
};

const g = (titre: string, ...cles: string[]): GroupeStat => ({ titre, champs: cles.map(cle => ({ cle, label: CAT[cle] })) });

const GENERAL = (...extra: string[]) => g('Général', 'matchsJoues', 'titularisations', 'minutes', 'note', 'distance', 'sprints', 'vitesseMax', ...extra);
const ATTAQUE = (titre: string) => g(titre, 'buts', 'butsTete', 'butsCoupFranc', 'penaltysMarques', 'penaltysObtenus', 'penaltysRates', 'tirs', 'tirsCadres', 'tirsNonCadres', 'tirsContres', 'poteaux', 'grossesOccasionsRatees', 'xg', 'dribblesTentes', 'dribbles', 'ballonsTouches', 'ballonsSurface', 'horsJeu');
const CREATION = (titre: string) => g(titre, 'passesDec', 'prePasseDec', 'passesCles', 'occasionsCreees', 'grossesOccasionsCreees', 'xa', 'centresTentes', 'centresReussis', 'passesTentees', 'passesReussies', 'pctPasses', 'passesProgressives', 'mauvaisesPasses', 'longsBallons', 'pertesBalle');
const DEFENSE = (titre: string) => g(titre, 'tacles', 'interceptions', 'recuperations', 'pressings', 'degagements', 'tirsBloques', 'sauvetagesLigne', 'duelsGagnes', 'duelsPerdus', 'pctDuels', 'duelsSolGagnes', 'duelsAeriensGagnes', 'duelsAeriensPerdus', 'dribbleSubis', 'cleanSheet', 'erreursBut', 'butContreSonCamp');
const DISCIPLINE = () => g('Discipline', 'fautesCommises', 'fautesSubies', 'cartonJaune', 'doubleJaune', 'cartonRouge', 'penaltysConcedes');

// Chaque poste a ses statistiques principales PLUS l'apport de l'autre
// registre (attaquant avec apport défensif, défenseur avec apport offensif,
// milieu avec les deux).
export const GROUPES_POSTE: Record<StatsPoste, GroupeStat[]> = {
  attaquant: [GENERAL(), ATTAQUE('Attaque'), CREATION('Création et passes'), DEFENSE('Apport défensif'), DISCIPLINE()],
  milieu: [GENERAL(), CREATION('Création et passes'), ATTAQUE('Apport offensif'), DEFENSE('Apport défensif'), DISCIPLINE()],
  defenseur: [GENERAL(), DEFENSE('Défense'), CREATION('Passes et relance'), ATTAQUE('Apport offensif'), DISCIPLINE()],
  gardien: [
    GENERAL(),
    g('Gardien', 'arrets', 'pctArrets', 'tirsAffrontes', 'arretsDifficiles', 'butsEvites', 'butsEncaisses', 'cleanSheet', 'penaltysArretes', 'sorties', 'ballonsAeriensCaptes', 'degagementsPoing', 'sauvetagesLigne'),
    g('Jeu au pied', 'passesTentees', 'passesReussies', 'pctPasses', 'longsBallons', 'relancesMain', 'degagements', 'erreursBut', 'butContreSonCamp'),
    DISCIPLINE(),
  ],
};

// Les statistiques saisies hors des groupes du poste ne sont jamais perdues :
// elles sont regroupées à la fin.
export function groupesFootball(poste: StatsPoste | string | null | undefined): GroupeStat[] {
  const groupes = GROUPES_POSTE[normaliserPoste(poste)];
  const vus = new Set<string>();
  groupes.forEach(gr => gr.champs.forEach(c => vus.add(c.cle)));
  const autres: ChampStat[] = [];
  (Object.keys(GROUPES_POSTE) as StatsPoste[]).forEach(k => GROUPES_POSTE[k].forEach(gr => gr.champs.forEach(c => {
    if (!vus.has(c.cle)) { vus.add(c.cle); autres.push(c); }
  })));
  return autres.length ? [...groupes, { titre: 'Autres statistiques', champs: autres }] : groupes;
}

// Carrière : un affichage PROPRE et distinct des stats de match (pas de dribbles,
// de tacles... ni d'adversaire). Trois blocs : chiffres cumulés, palmarès collectif,
// distinctions individuelles.
export const GROUPES_CARRIERE: GroupeStat[] = [
  g('Chiffres de carrière', 'matchsJoues', 'minutes', 'buts', 'passesDec', 'contributionsDirectes', 'penaltysMarques', 'butsCoupFrancCarriere', 'butsTete', 'hatTricks', 'cleanSheet', 'selections', 'butsSelection'),
  g('Total des titres', 'titres', 'titresClub', 'titresSelection', 'trophees'),
  g('Palmarès en sélection', 'coupesMonde', 'titresContinentaux', 'finalissima', 'olympiques', 'coupeMondeJeunes', 'ligueNations'),
  g('Palmarès en club', 'ligueChampions', 'titresChampionnat', 'coupesNationales', 'coupesLigue', 'supercoupes', 'supercoupesContinentales', 'coupesMondeClubs', 'autresTitresClub'),
  g('Distinctions individuelles', 'ballonsOr', 'theBest', 'joueurAnnee', 'souliersOr', 'meilleurJoueurMondial', 'meilleurJoueurContinental', 'mvpChampionnat', 'titresMeilleurButeur', 'titresMeilleurPasseur', 'equipesType', 'meilleurJeune'),
];

export const CHAMPS_STATS_BASKET: ChampStat[] = [
  { cle: 'matchsJoues', label: 'Matchs joués' }, { cle: 'minutes', label: 'Minutes jouées' }, { cle: 'points', label: 'Points' },
  { cle: 'rebonds', label: 'Rebonds' }, { cle: 'passesDec', label: 'Passes décisives' },
  { cle: 'interceptions', label: 'Interceptions' }, { cle: 'contres', label: 'Contres' }, { cle: 'ballesPerdues', label: 'Balles perdues' },
  { cle: 'tirsReussis', label: '% Tirs réussis' },
];

export function groupesAffichage(sport: string | null | undefined, poste: StatsPoste | string | null | undefined): GroupeStat[] {
  return sport === 'basketball' ? [{ titre: '', champs: CHAMPS_STATS_BASKET }] : groupesFootball(poste);
}

// Liste à plat (toutes les catégories, celles du poste en premier).
export function champsFootball(poste: StatsPoste | string | null | undefined): ChampStat[] {
  const vus = new Set<string>();
  const res: ChampStat[] = [];
  groupesFootball(poste).forEach(gr => gr.champs.forEach(c => { if (!vus.has(c.cle)) { vus.add(c.cle); res.push(c); } }));
  return res;
}

// Le contexte (match / période / carrière) décide ce qui est proposé :
//  - match, journée, Ligue des champions : un adversaire, catégories du poste ;
//  - mois, trimestre, saison : pas d'adversaire, catégories du poste ;
//  - carrière : ni adversaire ni poste, blocs de carrière uniquement.
export const periodeAvecAdversaire = (type: string | null | undefined): boolean => !type || type === 'match' || type === 'journee' || type === 'ldc';
export const periodeAvecNbMatchs = (type: string | null | undefined): boolean => type === 'mois' || type === 'trimestre' || type === 'saison';
export const estCarriere = (type: string | null | undefined): boolean => type === 'carriere';

export function groupesPourPeriode(sport: string | null | undefined, poste: StatsPoste | string | null | undefined, periodeType?: string | null): GroupeStat[] {
  if (sport !== 'basketball' && estCarriere(periodeType)) return GROUPES_CARRIERE;
  return groupesAffichage(sport, poste);
}
export function champsPourPeriode(sport: string | null | undefined, poste: StatsPoste | string | null | undefined, periodeType?: string | null): ChampStat[] {
  const vus = new Set<string>(); const res: ChampStat[] = [];
  groupesPourPeriode(sport, poste, periodeType).forEach(gr => gr.champs.forEach(c => { if (!vus.has(c.cle)) { vus.add(c.cle); res.push(c); } }));
  return res;
}

export function champsAffichage(sport: string | null | undefined, poste: StatsPoste | string | null | undefined): ChampStat[] {
  return sport === 'basketball' ? CHAMPS_STATS_BASKET : champsFootball(poste);
}

// ---- Période couverte par les stats ----
export type PeriodeType = 'match' | 'journee' | 'ldc' | 'mois' | 'trimestre' | 'saison' | 'carriere';
export type Periode = { type: PeriodeType; libelle: string };

export const PERIODES: { type: PeriodeType; label: string; placeholder: string }[] = [
  { type: 'match', label: '🎯 Un match', placeholder: 'Précision (optionnel, ex: Match amical)' },
  { type: 'journee', label: '📅 Journée de championnat', placeholder: 'Ex: Journée 7 de Ligue 1' },
  { type: 'ldc', label: '⭐ Ligue des champions', placeholder: 'Ex: Phase de ligue, Journée 3' },
  { type: 'mois', label: '🗓️ Un mois', placeholder: 'Ex: Septembre 2026' },
  { type: 'trimestre', label: '📆 Un trimestre', placeholder: 'Ex: T3 2026' },
  { type: 'saison', label: '🏆 Une saison', placeholder: 'Ex: 2025-26' },
  { type: 'carriere', label: '👑 Carrière', placeholder: 'Ex: en club, en sélection, complète (optionnel)' },
];

// Texte du bandeau de période affiché sur le post ('' = rien à afficher).
export function libellePeriode(periode: Periode | null | undefined, nbMatchs?: string | null): string {
  if (!periode) return nbMatchs ? 'Bilan sur ' + nbMatchs + ' matchs' : '';
  const lib = (periode.libelle || '').trim();
  let texte = '';
  if (periode.type === 'match') texte = lib;
  else if (periode.type === 'journee') texte = 'Journée de championnat' + (lib ? ' · ' + lib : '');
  else if (periode.type === 'ldc') texte = 'Ligue des champions' + (lib ? ' · ' + lib : '');
  else if (periode.type === 'mois') texte = 'Mois' + (lib ? ' ' + lib : '');
  else if (periode.type === 'trimestre') texte = 'Trimestre' + (lib ? ' ' + lib : '');
  else if (periode.type === 'carriere') texte = 'Carrière' + (lib ? ' ' + lib : '');
  else texte = 'Saison' + (lib ? ' ' + lib : '');
  const nb = periode.type !== 'match' && nbMatchs ? nbMatchs + ' matchs' : '';
  return [texte, nb].filter(Boolean).join(' · ');
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
  passecle: 'passesCles', passescle: 'passesCles', keypass: 'passesCles', keypasses: 'passesCles',
  titularisation: 'titularisations', titulaire: 'titularisations', titulaires: 'titularisations', matchstitulaire: 'titularisations', matchstitulaires: 'titularisations',
  penaltymarque: 'penaltysMarques', penaltiesmarques: 'penaltysMarques', penaltysmarque: 'penaltysMarques',
  grosseoccasionratee: 'grossesOccasionsRatees', grossesoccasionsratee: 'grossesOccasionsRatees', occasionsratees: 'grossesOccasionsRatees', occasionratee: 'grossesOccasionsRatees',
  pourcentagearrets: 'pctArrets', arretspourcentage: 'pctArrets', tauxarrets: 'pctArrets',
  fautessubie: 'fautesSubies', fautessubies: 'fautesSubies',
  theb: 'theBest', thebest: 'theBest', prixthebest: 'theBest', fifathebest: 'theBest', soulierdor: 'souliersOr', souliersdor: 'souliersOr', soulierseuropeens: 'souliersOr', meilleurjoueurcoupedumonde: 'meilleurJoueurMondial', ballondorcoupedumonde: 'meilleurJoueurMondial', mvpmls: 'mvpChampionnat', mvp: 'mvpChampionnat', meilleurbuteurtitres: 'titresMeilleurButeur', coupedumonde: 'coupesMonde', coupesdumonde: 'coupesMonde', copaamerica: 'titresContinentaux', euro: 'titresContinentaux', can: 'titresContinentaux', titrescontinentaux: 'titresContinentaux', medailleolympique: 'olympiques', medaillesolympiques: 'olympiques', coupenationale: 'coupesNationales', coupesnationales: 'coupesNationales', supercoupe: 'supercoupes', coupesdumondedesclubs: 'coupesMondeClubs', coupedumondedesclubs: 'coupesMondeClubs',
  ballondor: 'ballonsOr', ballonsdor: 'ballonsOr', ballondors: 'ballonsOr', trophee: 'trophees', titres: 'titres', titre: 'titres', ligueschampions: 'ligueChampions', liguedeschampions: 'ligueChampions', ldc: 'ligueChampions', championsleague: 'ligueChampions',
  tirsnoncadres: 'tirsNonCadres', tirnoncadre: 'tirsNonCadres', tirscontres: 'tirsContres', tircontre: 'tirsContres', poteau: 'poteaux', poteaux: 'poteaux', barres: 'poteaux', barretransversale: 'poteaux', poteauxbarres: 'poteaux',
  penaltysobtenus: 'penaltysObtenus', penaltiesobtenus: 'penaltysObtenus', penaltyobtenu: 'penaltysObtenus', penaltysrates: 'penaltysRates', penaltiesrates: 'penaltysRates', penaltyrate: 'penaltysRates',
  butstete: 'butsTete', butdelatete: 'butsTete', butsdelatete: 'butsTete', butscoupfranc: 'butsCoupFranc', butcoupfranc: 'butsCoupFranc', butssurcoupfranc: 'butsCoupFranc', coupsfrancs: 'butsCoupFranc', xg: 'xg', butsattendus: 'xg', expectedgoals: 'xg',
  dribblestentes: 'dribblesTentes', dribbletente: 'dribblesTentes', ballonssurface: 'ballonsSurface', ballonstouchesdanslasurface: 'ballonsSurface', touchesdanslasurface: 'ballonsSurface',
  passestentees: 'passesTentees', passetentee: 'passesTentees', pctpasses: 'pctPasses', pourcentagepasses: 'pctPasses', passesreussiespourcentage: 'pctPasses', precisiondespasses: 'pctPasses', precisionpasses: 'pctPasses',
  passesprogressives: 'passesProgressives', passeprogressive: 'passesProgressives', prepassedecisive: 'prePasseDec', prepassesdecisives: 'prePasseDec', prepassedec: 'prePasseDec',
  grossesoccasionscreees: 'grossesOccasionsCreees', grosseoccasioncreee: 'grossesOccasionsCreees', xa: 'xa', centrestentes: 'centresTentes', centretente: 'centresTentes',
  pctduels: 'pctDuels', pourcentageduels: 'pctDuels', duelssolgagnes: 'duelsSolGagnes', duelsolgagne: 'duelsSolGagnes', duelsaeriensperdus: 'duelsAeriensPerdus', duelaerienperdu: 'duelsAeriensPerdus',
  sauvetageligne: 'sauvetagesLigne', sauvetagessurlaligne: 'sauvetagesLigne', sauvetagesurlaligne: 'sauvetagesLigne', pressing: 'pressings', pressings: 'pressings', pressingsreussis: 'pressings',
  butcontresoncamp: 'butContreSonCamp', csc: 'butContreSonCamp', contresoncamp: 'butContreSonCamp',
  doublejaune: 'doubleJaune', doublecartonjaune: 'doubleJaune', penaltysconcedes: 'penaltysConcedes', penaltiesconcedes: 'penaltysConcedes', penaltyconcede: 'penaltysConcedes',
  distance: 'distance', distanceparcourue: 'distance', km: 'distance', sprint: 'sprints', vitessemax: 'vitesseMax', vitessemaximale: 'vitesseMax',
  tirsaffrontes: 'tirsAffrontes', tirscadresaffrontes: 'tirsAffrontes', arretsdifficiles: 'arretsDifficiles', arretdifficile: 'arretsDifficiles', butsevites: 'butsEvites', xgp: 'butsEvites',
  ballonsaeriens: 'ballonsAeriensCaptes', ballonsaeriensaptes: 'ballonsAeriensCaptes', ballonsaeriencaptes: 'ballonsAeriensCaptes', relancesmain: 'relancesMain', relancesalamain: 'relancesMain', degagementspoing: 'degagementsPoing', degagementsaupoing: 'degagementsPoing',
  contributionsdirectes: 'contributionsDirectes', contributionsdirectesaunbut: 'contributionsDirectes', hattricks: 'hatTricks', hattrick: 'hatTricks', triples: 'hatTricks', triplet: 'hatTricks',
  titresselection: 'titresSelection', titresenselection: 'titresSelection', titresclub: 'titresClub', titresenclub: 'titresClub',
  finalissima: 'finalissima', coupedumondeu20: 'coupeMondeJeunes', coupedumondejeunes: 'coupeMondeJeunes', mondialu20: 'coupeMondeJeunes', liguedesnations: 'ligueNations',
  supercoupescontinentales: 'supercoupesContinentales', supercoupeuefa: 'supercoupesContinentales', supercoupedeleurope: 'supercoupesContinentales', supercoupesnationales: 'supercoupes', coupesdelaligue: 'coupesLigue', coupedelaligue: 'coupesLigue', trophedeschampions: 'coupesLigue', trophesdeschampions: 'coupesLigue', coupedurioi: 'coupesNationales', coupesduroi: 'coupesNationales',
  autrestitres: 'autresTitresClub', leaguescup: 'autresTitresClub', supportersshield: 'autresTitresClub',
  joueurdelannee: 'joueurAnnee', meilleurjoueurdelannee: 'joueurAnnee', meilleurjoueurcontinental: 'meilleurJoueurContinental', meilleurjoueurdelacopa: 'meilleurJoueurContinental', meilleurjoueureuro: 'meilleurJoueurContinental',
  meilleurpasseur: 'titresMeilleurPasseur', titresmeilleurpasseur: 'titresMeilleurPasseur', equipetype: 'equipesType', equipestypes: 'equipesType', equipedelannee: 'equipesType', meilleurjeune: 'meilleurJeune', goldenboy: 'meilleurJeune', kopa: 'meilleurJeune', trophekopa: 'meilleurJeune',
  titredechampion: 'titresChampionnat', titreschampion: 'titresChampionnat', titreschampionnat: 'titresChampionnat', selection: 'selections', caps: 'selections', matchsselection: 'selections', butsenselection: 'butsSelection', butsselection: 'butsSelection',
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
export function parserLigneJoueur(ligne: string): { nom: string; equipe: string; adversaire: string; pays: string } {
  // Pays facultatif en fin de ligne après une barre verticale : "Joueur - Équipe - Adversaire | Haïti"
  let pays = '';
  let reste = (ligne || '').trim();
  const iBarre = reste.lastIndexOf('|');
  if (iBarre >= 0) { pays = reste.slice(iBarre + 1).trim(); reste = reste.slice(0, iBarre).trim(); }
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
  return { nom, equipe, adversaire, pays };
}
