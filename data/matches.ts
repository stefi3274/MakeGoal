export const FLAGS: Record<string, string> = {
  'Mexique':'🇲🇽','Afrique du Sud':'🇿🇦','Corée du Sud':'🇰🇷','Rép. Tchèque':'🇨🇿',
  'Canada':'🇨🇦','Qatar':'🇶🇦','Bosnie-Herzégovine':'🇧🇦','Suisse':'🇨🇭',
  'Brésil':'🇧🇷','Écosse':'🏴󠁧󠁢󠁳󠁣󠁴󠁿','Maroc':'🇲🇦','Haïti':'🇭🇹',
  'États-Unis':'🇺🇸','Türkiye':'🇹🇷','Paraguay':'🇵🇾','Australie':'🇦🇺',
  'Allemagne':'🇩🇪','Équateur':'🇪🇨','Côte d\'Ivoire':'🇨🇮','Curaçao':'🇨🇼',
  'Pays-Bas':'🇳🇱','Tunisie':'🇹🇳','Japon':'🇯🇵','Suède':'🇸🇪',
  'Belgique':'🇧🇪','Nouvelle-Zélande':'🇳🇿','Égypte':'🇪🇬','Iran':'🇮🇷',
  'Espagne':'🇪🇸','Cap-Vert':'🇨🇻','Uruguay':'🇺🇾','Arabie Saoudite':'🇸🇦',
  'France':'🇫🇷','Irak':'🇮🇶','Sénégal':'🇸🇳','Norvège':'🇳🇴',
  'Argentine':'🇦🇷','Jordanie':'🇯🇴','Algérie':'🇩🇿','Autriche':'🇦🇹',
  'Portugal':'🇵🇹','RD Congo':'🇨🇩','Colombie':'🇨🇴','Ouzbékistan':'🇺🇿',
  'Angleterre':'🏴󠁧󠁢󠁥󠁮󠁧󠁿','Panama':'🇵🇦','Croatie':'🇭🇷','Ghana':'🇬🇭',
};

export const GROUP_COLORS: Record<string, string> = {
  A:'#e74c3c',B:'#e67e22',C:'#f1c40f',D:'#2ecc71',
  E:'#1abc9c',F:'#3498db',G:'#9b59b6',H:'#e91e8c',
  I:'#ff5722',J:'#4caf50',K:'#00bcd4',L:'#ff9800',
  KO:'#7c3aed',
};

export type Match = {
  id: number;
  group: string;
  date: string;
  day: string;
  home: string;
  away: string;
  stadium: string;
  city: string;
  time: string;
  featured?: boolean;
  label?: string;
};

export const MATCHES: Match[] = [
  {id:1,group:'A',date:'11 juin',day:'Jeu',home:'Mexique',away:'Afrique du Sud',stadium:'Estadio Azteca',city:'Mexico City',time:'15h00',featured:true,label:'OUVERTURE'},
  {id:2,group:'A',date:'11 juin',day:'Jeu',home:'Corée du Sud',away:'Rép. Tchèque',stadium:'Estadio Akron',city:'Guadalajara',time:'22h00'},
  {id:3,group:'A',date:'18 juin',day:'Jeu',home:'Rép. Tchèque',away:'Afrique du Sud',stadium:'Mercedes-Benz Stadium',city:'Atlanta',time:'12h00'},
  {id:4,group:'A',date:'18 juin',day:'Jeu',home:'Mexique',away:'Corée du Sud',stadium:'Estadio Akron',city:'Guadalajara',time:'21h00'},
  {id:5,group:'A',date:'24 juin',day:'Mer',home:'Rép. Tchèque',away:'Mexique',stadium:'Estadio Azteca',city:'Mexico City',time:'17h00'},
  {id:6,group:'A',date:'24 juin',day:'Mer',home:'Afrique du Sud',away:'Corée du Sud',stadium:'Estadio BBVA',city:'Monterrey',time:'21h00'},
  {id:7,group:'B',date:'12 juin',day:'Ven',home:'Canada',away:'Bosnie-Herzégovine',stadium:'BMO Field',city:'Toronto',time:'15h00'},
  {id:8,group:'B',date:'13 juin',day:'Sam',home:'Qatar',away:'Suisse',stadium:'Levi\'s Stadium',city:'San Francisco',time:'15h00'},
  {id:9,group:'B',date:'18 juin',day:'Jeu',home:'Suisse',away:'Bosnie-Herzégovine',stadium:'SoFi Stadium',city:'Los Angeles',time:'13h00'},
  {id:10,group:'B',date:'18 juin',day:'Jeu',home:'Canada',away:'Qatar',stadium:'BC Place',city:'Vancouver',time:'18h00'},
  {id:11,group:'B',date:'24 juin',day:'Mer',home:'Suisse',away:'Canada',stadium:'BC Place',city:'Vancouver',time:'15h00'},
  {id:12,group:'B',date:'24 juin',day:'Mer',home:'Bosnie-Herzégovine',away:'Qatar',stadium:'Lumen Field',city:'Seattle',time:'18h00'},
  {id:13,group:'C',date:'13 juin',day:'Sam',home:'Brésil',away:'Maroc',stadium:'MetLife Stadium',city:'New York',time:'18h00',featured:true},
  {id:14,group:'C',date:'13 juin',day:'Sam',home:'Haïti',away:'Écosse',stadium:'Gillette Stadium',city:'Boston',time:'21h00'},
  {id:15,group:'C',date:'19 juin',day:'Ven',home:'Écosse',away:'Maroc',stadium:'Gillette Stadium',city:'Boston',time:'18h00'},
  {id:16,group:'C',date:'19 juin',day:'Ven',home:'Brésil',away:'Haïti',stadium:'Lincoln Financial Field',city:'Philadelphie',time:'20h30',featured:true},
  {id:17,group:'C',date:'24 juin',day:'Mer',home:'Écosse',away:'Brésil',stadium:'Hard Rock Stadium',city:'Miami',time:'18h00'},
  {id:18,group:'C',date:'24 juin',day:'Mer',home:'Maroc',away:'Haïti',stadium:'Mercedes-Benz Stadium',city:'Atlanta',time:'18h00'},{id:19,group:'D',date:'12 juin',day:'Ven',home:'États-Unis',away:'Paraguay',stadium:'SoFi Stadium',city:'Los Angeles',time:'21h00',featured:true},
  {id:20,group:'D',date:'13 juin',day:'Sam',home:'Australie',away:'Türkiye',stadium:'AT&T Stadium',city:'Dallas',time:'03h00'},
  {id:21,group:'D',date:'18 juin',day:'Jeu',home:'Paraguay',away:'Türkiye',stadium:'Arrowhead Stadium',city:'Kansas City',time:'18h00'},
  {id:22,group:'D',date:'18 juin',day:'Jeu',home:'États-Unis',away:'Australie',stadium:'Levi\'s Stadium',city:'San Francisco',time:'21h00'},
  {id:23,group:'D',date:'24 juin',day:'Mer',home:'Paraguay',away:'États-Unis',stadium:'AT&T Stadium',city:'Dallas',time:'21h00'},
  {id:24,group:'D',date:'24 juin',day:'Mer',home:'Türkiye',away:'Australie',stadium:'MetLife Stadium',city:'New York',time:'21h00'},
  {id:25,group:'E',date:'14 juin',day:'Dim',home:'Allemagne',away:'Curaçao',stadium:'Lincoln Financial Field',city:'Philadelphie',time:'19h00'},
  {id:26,group:'E',date:'15 juin',day:'Lun',home:'Côte d\'Ivoire',away:'Équateur',stadium:'SoFi Stadium',city:'Los Angeles',time:'01h00'},
  {id:27,group:'E',date:'19 juin',day:'Ven',home:'Équateur',away:'Curaçao',stadium:'Camping World Stadium',city:'Orlando',time:'18h00'},
  {id:28,group:'E',date:'19 juin',day:'Ven',home:'Allemagne',away:'Côte d\'Ivoire',stadium:'MetLife Stadium',city:'New York',time:'21h00'},
  {id:29,group:'E',date:'25 juin',day:'Jeu',home:'Équateur',away:'Allemagne',stadium:'Lincoln Financial Field',city:'Philadelphie',time:'21h00'},
  {id:30,group:'E',date:'25 juin',day:'Jeu',home:'Curaçao',away:'Côte d\'Ivoire',stadium:'Hard Rock Stadium',city:'Miami',time:'21h00'},
  {id:31,group:'F',date:'14 juin',day:'Dim',home:'Pays-Bas',away:'Japon',stadium:'Gillette Stadium',city:'Boston',time:'22h00'},
  {id:32,group:'F',date:'15 juin',day:'Lun',home:'Suède',away:'Tunisie',stadium:'Arrowhead Stadium',city:'Kansas City',time:'04h00'},
  {id:33,group:'F',date:'19 juin',day:'Ven',home:'Japon',away:'Tunisie',stadium:'AT&T Stadium',city:'Dallas',time:'15h00'},
  {id:34,group:'F',date:'20 juin',day:'Sam',home:'Pays-Bas',away:'Suède',stadium:'SoFi Stadium',city:'Los Angeles',time:'00h00'},
  {id:35,group:'F',date:'25 juin',day:'Jeu',home:'Japon',away:'Pays-Bas',stadium:'Lumen Field',city:'Seattle',time:'18h00'},
  {id:36,group:'F',date:'25 juin',day:'Jeu',home:'Tunisie',away:'Suède',stadium:'BC Place',city:'Vancouver',time:'18h00'},
  {id:37,group:'G',date:'15 juin',day:'Lun',home:'Belgique',away:'Égypte',stadium:'Hard Rock Stadium',city:'Miami',time:'21h00'},
  {id:38,group:'G',date:'16 juin',day:'Mar',home:'Arabie Saoudite',away:'Uruguay',stadium:'Camping World Stadium',city:'Orlando',time:'00h00'},
  {id:39,group:'G',date:'20 juin',day:'Sam',home:'Uruguay',away:'Égypte',stadium:'Arrowhead Stadium',city:'Kansas City',time:'18h00'},
  {id:40,group:'G',date:'20 juin',day:'Sam',home:'Belgique',away:'Arabie Saoudite',stadium:'AT&T Stadium',city:'Dallas',time:'21h00'},
  {id:41,group:'G',date:'25 juin',day:'Jeu',home:'Uruguay',away:'Belgique',stadium:'Levi\'s Stadium',city:'San Francisco',time:'21h00'},
  {id:42,group:'G',date:'25 juin',day:'Jeu',home:'Égypte',away:'Arabie Saoudite',stadium:'MetLife Stadium',city:'New York',time:'21h00'},
  {id:43,group:'H',date:'15 juin',day:'Lun',home:'Espagne',away:'Cap-Vert',stadium:'Estadio Azteca',city:'Mexico City',time:'18h00'},
  {id:44,group:'H',date:'16 juin',day:'Mar',home:'Iran',away:'Nouvelle-Zélande',stadium:'Estadio BBVA',city:'Monterrey',time:'03h00'},
  {id:45,group:'H',date:'20 juin',day:'Sam',home:'Cap-Vert',away:'Nouvelle-Zélande',stadium:'BC Place',city:'Vancouver',time:'15h00'},
  {id:46,group:'H',date:'20 juin',day:'Sam',home:'Espagne',away:'Iran',stadium:'Estadio Akron',city:'Guadalajara',time:'21h00'},
  {id:47,group:'H',date:'25 juin',day:'Jeu',home:'Cap-Vert',away:'Espagne',stadium:'Camping World Stadium',city:'Orlando',time:'18h00'},{id:48,group:'H',date:'25 juin',day:'Jeu',home:'Nouvelle-Zélande',away:'Iran',stadium:'BMO Field',city:'Toronto',time:'18h00'},
  {id:49,group:'I',date:'16 juin',day:'Mar',home:'France',away:'Sénégal',stadium:'MetLife Stadium',city:'New York',time:'21h00',featured:true},
  {id:50,group:'I',date:'16 juin',day:'Mar',home:'Irak',away:'Norvège',stadium:'Lumen Field',city:'Seattle',time:'18h00'},
  {id:51,group:'I',date:'21 juin',day:'Sam',home:'Norvège',away:'Sénégal',stadium:'AT&T Stadium',city:'Dallas',time:'18h00'},
  {id:52,group:'I',date:'21 juin',day:'Sam',home:'France',away:'Irak',stadium:'SoFi Stadium',city:'Los Angeles',time:'21h00'},
  {id:53,group:'I',date:'26 juin',day:'Jeu',home:'Norvège',away:'France',stadium:'Hard Rock Stadium',city:'Miami',time:'21h00'},
  {id:54,group:'I',date:'26 juin',day:'Jeu',home:'Sénégal',away:'Irak',stadium:'Lincoln Financial Field',city:'Philadelphie',time:'21h00'},
  {id:55,group:'J',date:'16 juin',day:'Mar',home:'Argentine',away:'Algérie',stadium:'AT&T Stadium',city:'Dallas',time:'21h00',featured:true},
  {id:56,group:'J',date:'17 juin',day:'Mer',home:'Autriche',away:'Jordanie',stadium:'Camping World Stadium',city:'Orlando',time:'00h00'},
  {id:57,group:'J',date:'21 juin',day:'Sam',home:'Jordanie',away:'Algérie',stadium:'BMO Field',city:'Toronto',time:'18h00'},
  {id:58,group:'J',date:'21 juin',day:'Sam',home:'Argentine',away:'Autriche',stadium:'Hard Rock Stadium',city:'Miami',time:'21h00'},
  {id:59,group:'J',date:'26 juin',day:'Jeu',home:'Jordanie',away:'Argentine',stadium:'Levi\'s Stadium',city:'San Francisco',time:'21h00'},
  {id:60,group:'J',date:'26 juin',day:'Jeu',home:'Algérie',away:'Autriche',stadium:'Estadio Akron',city:'Guadalajara',time:'21h00'},
  {id:61,group:'K',date:'17 juin',day:'Mer',home:'Portugal',away:'RD Congo',stadium:'Arrowhead Stadium',city:'Kansas City',time:'21h00'},
  {id:62,group:'K',date:'17 juin',day:'Mer',home:'Colombie',away:'Ouzbékistan',stadium:'Lumen Field',city:'Seattle',time:'18h00'},
  {id:63,group:'K',date:'22 juin',day:'Dim',home:'Ouzbékistan',away:'RD Congo',stadium:'BC Place',city:'Vancouver',time:'18h00'},
  {id:64,group:'K',date:'22 juin',day:'Dim',home:'Portugal',away:'Colombie',stadium:'SoFi Stadium',city:'Los Angeles',time:'21h00',featured:true},
  {id:65,group:'K',date:'27 juin',day:'Ven',home:'Ouzbékistan',away:'Portugal',stadium:'Gillette Stadium',city:'Boston',time:'21h00'},
  {id:66,group:'K',date:'27 juin',day:'Ven',home:'RD Congo',away:'Colombie',stadium:'Mercedes-Benz Stadium',city:'Atlanta',time:'21h00'},
  {id:67,group:'L',date:'17 juin',day:'Mer',home:'Angleterre',away:'Panama',stadium:'Hard Rock Stadium',city:'Miami',time:'18h00'},
  {id:68,group:'L',date:'18 juin',day:'Jeu',home:'Croatie',away:'Ghana',stadium:'Lincoln Financial Field',city:'Philadelphie',time:'15h00'},
  {id:69,group:'L',date:'22 juin',day:'Dim',home:'Ghana',away:'Panama',stadium:'Estadio BBVA',city:'Monterrey',time:'18h00'},
  {id:70,group:'L',date:'23 juin',day:'Lun',home:'Angleterre',away:'Croatie',stadium:'AT&T Stadium',city:'Dallas',time:'00h00',featured:true},
  {id:71,group:'L',date:'27 juin',day:'Ven',home:'Ghana',away:'Angleterre',stadium:'Arrowhead Stadium',city:'Kansas City',time:'21h00'},
  {id:72,group:'L',date:'27 juin',day:'Ven',home:'Panama',away:'Croatie',stadium:'Estadio Azteca',city:'Mexico City',time:'21h00'},
];