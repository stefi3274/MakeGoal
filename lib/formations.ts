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
const normPays = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[’]/g, "'").replace(/\s+/g, ' ').trim();

// Drapeau d'après un code pays ISO (HT -> 🇭🇹).
const emojiDepuisCode = (code: string) => String.fromCodePoint(...code.toUpperCase().split('').map(c => 0x1F1E6 + c.charCodeAt(0) - 65));

// TOUS les pays du monde : noms français ET anglais générés depuis les codes ISO 3166
// (Intl.DisplayNames), plus des variantes courantes ci-dessous.
const VARIANTES: Record<string, string> = {
  'usa': 'US', 'etats unis': 'US', 'etats-unis': 'US', 'états-unis': 'US', 'u.s.a.': 'US', 'hollande': 'NL', 'pays bas': 'NL', 'holland': 'NL',
  'rd congo': 'CD', 'rdc': 'CD', 'congo rdc': 'CD', 'congo kinshasa': 'CD', 'republique democratique du congo': 'CD', 'congo brazzaville': 'CG', 'republique du congo': 'CG',
  'coree du sud': 'KR', 'coree du nord': 'KP', 'republique tcheque': 'CZ', 'tchequie': 'CZ', 'czechia': 'CZ', 'turkiye': 'TR', 'turquie': 'TR',
  'cap vert': 'CV', 'cap-vert': 'CV', 'cabo verde': 'CV', 'swaziland': 'SZ', 'eswatini': 'SZ', 'macedoine': 'MK', 'macedoine du nord': 'MK', 'birmanie': 'MM', 'myanmar': 'MM',
  'trinidad': 'TT', 'trinidad et tobago': 'TT', 'trinite et tobago': 'TT', 'trinidad-et-tobago': 'TT', 'trinite-et-tobago': 'TT', 'antigua et barbuda': 'AG', 'saint kitts et nevis': 'KN',
  'saint-vincent-et-les-grenadines': 'VC', 'sainte lucie': 'LC', 'saint lucie': 'LC', 'bosnie': 'BA', 'bosnie herzegovine': 'BA', 'cote d ivoire': 'CI', "cote d'ivoire": 'CI', 'ivory coast': 'CI',
  'timor oriental': 'TL', 'palestine': 'PS', 'kosovo': 'XK', 'taiwan': 'TW', 'chine populaire': 'CN', 'emirats arabes unis': 'AE', 'emirats': 'AE', 'ouzbekistan': 'UZ',
  'uk': 'GB', 'royaume uni': 'GB', 'grande bretagne': 'GB', 'republique centrafricaine': 'CF', 'centrafrique': 'CF', 'guinee equatoriale': 'GQ', 'guinee bissau': 'GW', 'sao tome et principe': 'ST',
  'rep dominicaine': 'DO', 'republique dominicaine': 'DO', 'salvador': 'SV', 'surinam': 'SR', 'bermudes': 'BM', 'curacao': 'CW', 'antilles neerlandaises': 'CW', 'saint martin': 'MF', 'sint maarten': 'SX',
  'guyane': 'GF', 'guyane francaise': 'GF', 'iles caimans': 'KY', 'iles vierges': 'VG', 'porto rico': 'PR', 'ile maurice': 'MU', 'maurice': 'MU', 'hong kong': 'HK', 'macao': 'MO', 'nouvelle caledonie': 'NC', 'tahiti': 'PF', 'polynesie francaise': 'PF',
};
const SUBDIVISIONS: Record<string, string> = {
  'angleterre': '🏴\u{E0067}\u{E0062}\u{E0065}\u{E006E}\u{E0067}\u{E007F}', 'england': '🏴\u{E0067}\u{E0062}\u{E0065}\u{E006E}\u{E0067}\u{E007F}',
  'ecosse': '🏴\u{E0067}\u{E0062}\u{E0073}\u{E0063}\u{E0074}\u{E007F}', 'scotland': '🏴\u{E0067}\u{E0062}\u{E0073}\u{E0063}\u{E0074}\u{E007F}',
  'pays de galles': '🏴\u{E0067}\u{E0062}\u{E0077}\u{E006C}\u{E0073}\u{E007F}', 'galles': '🏴\u{E0067}\u{E0062}\u{E0077}\u{E006C}\u{E0073}\u{E007F}', 'wales': '🏴\u{E0067}\u{E0062}\u{E0077}\u{E006C}\u{E0073}\u{E007F}',
};

let CARTE: Map<string, string> | null = null;
let NOMS: string[] | null = null;
function construireCarte(): Map<string, string> {
  if (CARTE) return CARTE;
  const carte = new Map<string, string>();
  const noms: string[] = [];
  const fr = typeof Intl !== 'undefined' && 'DisplayNames' in Intl ? new Intl.DisplayNames(['fr'], { type: 'region' }) : null;
  const en = typeof Intl !== 'undefined' && 'DisplayNames' in Intl ? new Intl.DisplayNames(['en'], { type: 'region' }) : null;
  const L = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  for (const a of L) for (const b of L) {
    const code = a + b;
    if (code === 'ZZ' || code === 'EU' || code === 'UN' || code === 'EZ' || code === 'QO' || code === 'AC' || code === 'CP' || code === 'DG' || code === 'EA' || code === 'IC' || code === 'TA' || ['AN','BU','CS','DD','FX','NT','SU','TP','YD','YU','ZR','QU','XA','XB','UK'].includes(code)) continue;
    let nomFr = '', nomEn = '';
    try { nomFr = fr ? fr.of(code) || '' : ''; nomEn = en ? en.of(code) || '' : ''; } catch { continue; }
    if (!nomFr || nomFr === code || /^r[ée]gion/i.test(nomFr)) continue;
    const emoji = emojiDepuisCode(code);
    carte.set(normPays(nomFr), emoji);
    if (nomEn && nomEn !== code) carte.set(normPays(nomEn), emoji);
    carte.set(code.toLowerCase(), emoji);
    noms.push(nomFr);
  }
  const nonISO = { 'XK': 'Kosovo' };
  Object.entries(nonISO).forEach(([code, nom]) => { carte.set(normPays(nom), emojiDepuisCode(code)); noms.push(nom); });
  Object.entries(VARIANTES).forEach(([k, code]) => carte.set(normPays(k), emojiDepuisCode(code)));
  Object.entries(SUBDIVISIONS).forEach(([k, v]) => carte.set(normPays(k), v));
  ['Angleterre', 'Écosse', 'Pays de Galles'].forEach(n => noms.push(n));
  // anciennes entrées manuelles du site (compatibilité)
  Object.entries(DRAPEAUX).forEach(([k, v]) => { if (!carte.has(normPays(k))) carte.set(normPays(k), v); });
  NOMS = Array.from(new Set(noms)).sort((x, y) => x.localeCompare(y, 'fr'));
  CARTE = carte;
  return carte;
}

// '🏳️' = pays inconnu.
export const drapeau = (pays: string): string => construireCarte().get(normPays(pays || '')) || '🏳️';
export const estPays = (nom: string): boolean => drapeau(nom) !== '🏳️';
// Liste des pays (noms français) pour les listes de suggestions de l'admin.
export const listePays = (): string[] => { construireCarte(); return NOMS || []; };

export type OnzeJoueur = { nom: string; equipe: string; photo?: string; pays?: string };
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
    return { nom: p.nom, equipe: p.equipe, pays: p.pays };
  }).filter(j => j.nom);
  if (joueurs.length !== 11) erreurs.push('Il faut 11 joueurs : ' + joueurs.length + ' trouvé(s).');
  return { details, formation, joueurs, erreurs };
}
