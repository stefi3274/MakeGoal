// Source UNIQUE des formations, drapeaux et du collage en lot de l'Équipe type.
import { parserLigneJoueur } from './statsJoueur';

export const FORMATIONS: Record<string, { x: number; y: number }[]> = {
  '4-4-2': [{x:50,y:92},{x:16,y:72},{x:38,y:74},{x:62,y:74},{x:84,y:72},{x:16,y:46},{x:38,y:48},{x:62,y:48},{x:84,y:46},{x:38,y:20},{x:62,y:20}],
  '4-3-3': [{x:50,y:92},{x:16,y:72},{x:38,y:74},{x:62,y:74},{x:84,y:72},{x:30,y:48},{x:50,y:50},{x:70,y:48},{x:22,y:22},{x:50,y:18},{x:78,y:22}],
  '4-2-3-1': [{x:50,y:92},{x:16,y:72},{x:38,y:74},{x:62,y:74},{x:84,y:72},{x:36,y:54},{x:64,y:54},{x:22,y:32},{x:50,y:34},{x:78,y:32},{x:50,y:14}],
  '3-5-2': [{x:50,y:92},{x:28,y:74},{x:50,y:76},{x:72,y:74},{x:12,y:50},{x:34,y:50},{x:50,y:52},{x:66,y:50},{x:88,y:50},{x:38,y:22},{x:62,y:22}],
  '3-4-3': [{x:50,y:92},{x:28,y:74},{x:50,y:76},{x:72,y:74},{x:16,y:50},{x:38,y:50},{x:62,y:50},{x:84,y:50},{x:22,y:22},{x:50,y:18},{x:78,y:22}],
  '5-3-2': [{x:50,y:92},{x:12,y:70},{x:31,y:74},{x:50,y:76},{x:69,y:74},{x:88,y:70},{x:30,y:48},{x:50,y:50},{x:70,y:48},{x:38,y:22},{x:62,y:22}],
  '4-4-1-1': [{x:50,y:92},{x:16,y:72},{x:38,y:74},{x:62,y:74},{x:84,y:72},{x:16,y:50},{x:38,y:50},{x:62,y:50},{x:84,y:50},{x:50,y:30},{x:50,y:12}]
};
export const FORMATIONS_LISTE = Object.keys(FORMATIONS);

export const DRAPEAUX: Record<string, string> = {
  'france': '🇫🇷', 'haiti': '🇭🇹', 'haïti': '🇭🇹', 'bresil': '🇧🇷', 'brésil': '🇧🇷',
  'argentine': '🇦🇷', 'espagne': '🇪🇸', 'angleterre': '🏴󠁧󠁢󠁥󠁮󠁧󠁿', 'allemagne': '🇩🇪',
  'portugal': '🇵🇹', 'italie': '🇮🇹', 'belgique': '🇧🇪', 'pays-bas': '🇳🇱', 'hollande': '🇳🇱',
  'usa': '🇺🇸', 'etats-unis': '🇺🇸', 'états-unis': '🇺🇸', 'canada': '🇨🇦', 'mexique': '🇲🇽',
  'maroc': '🇲🇦', 'senegal': '🇸🇳', 'sénégal': '🇸🇳', 'cameroun': '🇨🇲', 'nigeria': '🇳🇬',
  'ghana': '🇬🇭', 'algerie': '🇩🇿', 'algérie': '🇩🇿', 'tunisie': '🇹🇳', 'egypte': '🇪🇬', 'égypte': '🇪🇬',
  'cote d\'ivoire': '🇨🇮', "côte d'ivoire": '🇨🇮', 'colombie': '🇨🇴', 'uruguay': '🇺🇾',
  'chili': '🇨🇱', 'perou': '🇵🇪', 'pérou': '🇵🇪', 'japon': '🇯🇵', 'coree du sud': '🇰🇷',
  'corée du sud': '🇰🇷', 'croatie': '🇭🇷', 'suisse': '🇨🇭', 'pologne': '🇵🇱', 'danemark': '🇩🇰',
  'suede': '🇸🇪', 'suède': '🇸🇪', 'norvege': '🇳🇴', 'norvège': '🇳🇴', 'ecosse': '🏴󠁧󠁢󠁳󠁣󠁴󠁿', 'écosse': '🏴󠁧󠁢󠁳󠁣󠁴󠁿',
  'jamaique': '🇯🇲', 'jamaïque': '🇯🇲', 'panama': '🇵🇦', 'costa rica': '🇨🇷', 'honduras': '🇭🇳',
  'republique dominicaine': '🇩🇴', 'république dominicaine': '🇩🇴', 'venezuela': '🇻🇪', 'equateur': '🇪🇨', 'équateur': '🇪🇨',
  'australie': '🇦🇺', 'qatar': '🇶🇦', 'arabie saoudite': '🇸🇦', 'iran': '🇮🇷', 'turquie': '🇹🇷',
  'grece': '🇬🇷', 'grèce': '🇬🇷', 'serbie': '🇷🇸', 'ukraine': '🇺🇦', 'russie': '🇷🇺',
  'curacao': '🇨🇼', 'curaçao': '🇨🇼', 'guatemala': '🇬🇹', 'trinidad': '🇹🇹', 'trinidad et tobago': '🇹🇹', 'trinite-et-tobago': '🇹🇹', 'trinité-et-tobago': '🇹🇹', 'trinidad-et-tobago': '🇹🇹',
  'el salvador': '🇸🇻', 'salvador': '🇸🇻', 'nicaragua': '🇳🇮', 'cuba': '🇨🇺', 'suriname': '🇸🇷', 'surinam': '🇸🇷', 'bermudes': '🇧🇲', 'guyana': '🇬🇾', 'martinique': '🇲🇶',
  'guadeloupe': '🇬🇵', 'belize': '🇧🇿', 'paraguay': '🇵🇾', 'bolivie': '🇧🇴', 'grenade': '🇬🇩', 'antigua-et-barbuda': '🇦🇬', 'saint-kitts-et-nevis': '🇰🇳', 'sainte-lucie': '🇱🇨',
  'barbade': '🇧🇧', 'autriche': '🇦🇹', 'hongrie': '🇭🇺', 'roumanie': '🇷🇴', 'mali': '🇲🇱', 'rd congo': '🇨🇩', 'afrique du sud': '🇿🇦', 'chine': '🇨🇳', 'inde': '🇮🇳'
};
const normPays = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[’]/g, "'").trim();
const DRAPEAUX_NORM: Record<string, string> = Object.fromEntries(Object.entries(DRAPEAUX).map(([k, v]) => [normPays(k), v]));
export const drapeau = (pays: string) => DRAPEAUX_NORM[normPays(pays || '')] || '🏳️';

export type OnzeJoueur = { nom: string; equipe: string; photo?: string };
export type OnzeDetails = { categorie: string; competition: string; periode: string };
export const ONZE_DETAILS_VIDES: OnzeDetails = { categorie: '', competition: '', periode: '' };
export const CATEGORIES_ONZE = ['Équipe de la journée', 'Équipe de la semaine', 'Équipe du mois', 'Équipe du trimestre', 'Équipe de la saison', 'Équipe du tournoi'];

// Format :
//   Équipe du mois - Concacaf Nations League A - Septembre-Octobre 2026
//   4-3-3
//   puis 11 lignes "Nom - Équipe" (gardien, défenseurs, milieux, attaquants, de gauche à droite)
export function parserOnze(texte: string): { details: OnzeDetails; formation: string; joueurs: OnzeJoueur[]; erreurs: string[] } {
  const lignes = (texte || '').split('\n').map(l => l.trim()).filter(Boolean);
  const erreurs: string[] = [];
  const entete = (lignes[0] || '').split(/\s+[-–—]\s+|\s*\|\s*/).map(c => c.trim());
  const details: OnzeDetails = { categorie: entete[0] || '', competition: entete[1] || '', periode: entete[2] || '' };
  const brut = (lignes[1] || '').replace(/\s+/g, '').replace(/[–—−]/g, '-');
  const formation = Object.keys(FORMATIONS).find(f => f === brut) || '';
  if (!formation) erreurs.push('Formation non reconnue (ligne 2). Choix : ' + Object.keys(FORMATIONS).join(', '));
  const joueurs: OnzeJoueur[] = lignes.slice(2).map(l => {
    const p = parserLigneJoueur(l);
    return { nom: p.nom, equipe: p.equipe };
  }).filter(j => j.nom);
  if (joueurs.length !== 11) erreurs.push('Il faut 11 joueurs : ' + joueurs.length + ' trouvé(s).');
  return { details, formation, joueurs, erreurs };
}
