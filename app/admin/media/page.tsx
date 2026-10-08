'use client';
import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../../lib/supabase';
import { getSport, SPORT_COULEURS, SPORT_LABEL, Sport } from '../../../lib/sport';

import AdminAuth from '../../../components/AdminAuth';
import { listePays } from '../../../lib/formations';
import { EliminationDetails, ELIMINATION_VIDE, Rencontre, RENCONTRE_VIDE, TOURS, parserElimination, qualifie as qualifieRencontre } from '../../../lib/elimination';
import { genererVideo, typeVideo } from '../../../lib/video';
import { FORMATIONS_LISTE, CATEGORIES_ONZE, OnzeJoueur, OnzeDetails, ONZE_DETAILS_VIDES, parserOnze } from '../../../lib/formations';
import { GROUPES_DISTINCTIONS, DISTINCTIONS, DETAILS_VIDES, DistinctionDetails, estDistinctionEquipe, parserLotDistinctions } from '../../../lib/distinctions';
import { CHAMPS_STATS_BASKET, POSTES_LABELS, PERIODES, StatsPoste, Periode, PeriodeType, champsFootball, groupesFootball, normaliserPoste, libellePeriode, trouverCleStat, parserLigneJoueur } from '../../../lib/statsJoueur';

const VIOLET = '#bf00ff';



const TAGS_GROUPES: { titre: string; tags: string[] }[] = [
  { titre: 'Compétition', tags: ['Club', 'Sélection', 'Championnat', 'Coupe', 'Ligue des Champions', 'Coupe du Monde', 'Euro', 'Éliminatoires', 'Copa America', 'CAN'] },
  { titre: 'Genre & catégorie', tags: ['Masculin', 'Féminin', 'U-17', 'U-20', 'Olympique'] },
  { titre: 'Statut du match', tags: ['Match bientôt', 'Mi-temps', 'Match terminé', 'Statistiques'] },
  { titre: 'Transfert', tags: ['Transfert', 'En attente', 'Officiel'] },
];

type MatchJour = {
  id: string; equipe1: string; equipe2: string; competition: string | null; pays: string | null;
  date_match: string; score1: number | null; score2: number | null;
};

type But = { equipe: string; joueur: string; minute: string; passeur: string };
type CarteEvenement = { joueur: string; minute: string };

type StatJoueur = { nom: string; equipe: string; adversaire: string; photo?: string; pays?: string; valeurs: Record<string, string> };
type QuartTemps = { quart: string; score1: string; score2: string };

type Match = {
  id: string; equipe1: string; equipe2: string; competition: string | null; pays: string | null;
  date_match: string; score_home: number | null; score_away: number | null;
};

type AdversaireParcours = { nom: string; date: string; label: string; scoreEquipe: string; scoreAdversaire: string };
type Parcours = { equipe: string; competition: string; poule: string; adversaires: AdversaireParcours[] };
type Declaration = { nom: string; fonction: string; citation: string; contexte: string; pays?: string };
type MatchInvitation = { equipe1: string; equipe2: string };
type InvitationConcours = { titreConcours: string; lots: string; slogan: string; matchs: MatchInvitation[] };
type Gagnant = { nom: string; prix: string };
type Gagnants = { titreTirage: string; gagnants: Gagnant[] };

type Article = {
  id: string; titre: string; categorie: string; type: string; langue: string;
  source_nom: string | null; source_url: string | null;
  tags: string[] | null; pays1: string | null; pays2: string | null;
  ligue: string | null; ligue_logo: string | null;
  equipe1: string | null; equipe2: string | null;
  score1: number | null; score2: number | null; statut_match: string | null;
  heure_match: string | null; stade: string | null;
  distinction_type: string | null; laureat: string | null; distinction_note: string | null; distinction_stats: string | null; distinction_details?: DistinctionDetails | null;
  formation: string | null; onze: OnzeJoueur[] | null; onze_details?: OnzeDetails | null; elimination?: EliminationDetails | null;
  relance_at: string | null;
  classement_type: string | null; classement_titre: string | null; classement_pays: string | null;
  classement: { pos: string; nom: string; extra: string; diff: string; pays: string; val: string; couleur?: string }[] | null;
  matchs_jour: MatchJour[] | null;
  resultat_details: { buts: But[]; rouges: CarteEvenement[]; jaunes: CarteEvenement[] } | null;
  quarts_temps: QuartTemps[] | null;
  parcours: Parcours | null;
  declaration: Declaration | null;
  invitation_concours: InvitationConcours | null;
  gagnants: Gagnants | null;
  stats_joueur: { mode: string; poste: string; nbMatchs: string | null; periode?: Periode | null; joueurs: StatJoueur[] } | null;
  pub_actif: boolean | null; pub_nom: string | null; pub_logo: string | null; pub_lien: string | null;
  image_couverture: string | null; extrait: string | null; contenu: string | null;
  publie: boolean; created_at: string; sport: string | null;
};

export default function AdminMedia() {
  const [connecte, setConnecte] = useState(false);
  const [articles, setArticles] = useState<Article[]>([]);
  const [message, setMessage] = useState('');
  const [vue, setVue] = useState<'liste' | 'editer'>('liste');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [editId, setEditId] = useState<string | null>(null);
  const [titre, setTitre] = useState('');
  const [type, setType] = useState('article');
  const [langue, setLangue] = useState('fr');
  const [categorie, setCategorie] = useState('Actualités');
  const [sourceNom, setSourceNom] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [imageCouverture, setImageCouverture] = useState('');
  const [extrait, setExtrait] = useState('');
  const [contenu, setContenu] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [pays1, setPays1] = useState('');
  const [pays2, setPays2] = useState('');
  const [ligue, setLigue] = useState('');
  const [ligueLogo, setLigueLogo] = useState('');
  const [equipe1, setEquipe1] = useState('');
  const [equipe2, setEquipe2] = useState('');
  const [score1, setScore1] = useState('');
  const [score2, setScore2] = useState('');
  const [statutMatch, setStatutMatch] = useState('');
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingJoueur, setUploadingJoueur] = useState<number | null>(null);
  const [distinctionType, setDistinctionType] = useState('');
  const [distinctionAutre, setDistinctionAutre] = useState('');
  const [laureat, setLaureat] = useState('');
  const [distinctionNote, setDistinctionNote] = useState('');
  const [distinctionStats, setDistinctionStats] = useState('');
  const [distEquipe, setDistEquipe] = useState('');
  const [distChampionnat, setDistChampionnat] = useState('');
  const [distPeriode, setDistPeriode] = useState('');
  const [distPhoto, setDistPhoto] = useState('');
  const [distPays, setDistPays] = useState('');
  const [uploadingDist, setUploadingDist] = useState(false);
  const [texteLotDistinctions, setTexteLotDistinctions] = useState('');
  const [lotDistinctionsOuvert, setLotDistinctionsOuvert] = useState(false);
  const [importLotDistinctions, setImportLotDistinctions] = useState(false);
  const [modePost, setModePost] = useState('simple');
  const [pubActif, setPubActif] = useState(false);
  const [pubNom, setPubNom] = useState('');
  const [pubLogo, setPubLogo] = useState('');
  const [pubLien, setPubLien] = useState('');
  const [uploadingPub, setUploadingPub] = useState(false);
  const [classementType, setClassementType] = useState('');
  const [classementTitre, setClassementTitre] = useState('');
  const [classementPays, setClassementPays] = useState('');
  const [classementPositionDepart, setClassementPositionDepart] = useState('1');
  const [classement, setClassement] = useState<{ pos: string; nom: string; extra: string; diff: string; pays: string; val: string; couleur: string }[]>(
    Array.from({length:10},(_,i)=>({pos:String(i+1),nom:'',extra:'',diff:'',pays:'',val:'',couleur:''}))
  );
  const [classementTexteColle, setClassementTexteColle] = useState('');
  const [lotClassementOuvert, setLotClassementOuvert] = useState(false);
  const [texteLotClassements, setTexteLotClassements] = useState('');
  const [typeLotClassements, setTypeLotClassements] = useState<'equipes' | 'joueurs'>('equipes');
  const [importLotClassements, setImportLotClassements] = useState(false);
  const [formation, setFormation] = useState('');
  const [onze, setOnze] = useState<OnzeJoueur[]>(Array.from({length:11},()=>({nom:'',equipe:'',photo:''})));
  const [onzeDetails, setOnzeDetails] = useState<OnzeDetails>(ONZE_DETAILS_VIDES);
  const [texteOnze, setTexteOnze] = useState('');
  const [elim, setElim] = useState<EliminationDetails>({ ...ELIMINATION_VIDE, rencontres: [{ ...RENCONTRE_VIDE }] });
  const [texteElim, setTexteElim] = useState('');
  const [videoArticle, setVideoArticle] = useState<Article | null>(null);
  const [videoPct, setVideoPct] = useState(0);
  const [videoEtape, setVideoEtape] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [videoExt, setVideoExt] = useState('mp4');
  const [videoErreur, setVideoErreur] = useState('');
  const videoSignal = useRef({ annule: false });
  const [uploadingOnze, setUploadingOnze] = useState<number | null>(null);
  const [matchsDispo, setMatchsDispo] = useState<Match[]>([]);
  const [matchsJourSelection, setMatchsJourSelection] = useState<MatchJour[]>([]);
  const [piocheMatchOuvert, setPiocheMatchOuvert] = useState(false);
  const [heureMatch, setHeureMatch] = useState('');
  const [stade, setStade] = useState('');

  const [resTexteColle, setResTexteColle] = useState('');
  const [resButs, setResButs] = useState<But[]>([]);
  const [resRouges, setResRouges] = useState<CarteEvenement[]>([]);
  const [resJaunes, setResJaunes] = useState<CarteEvenement[]>([]);
  const [resQuarts, setResQuarts] = useState<QuartTemps[]>([]);

  const [statsMode, setStatsMode] = useState<'performance' | 'comparaison' | 'bilan'>('performance');
  const [statsPoste, setStatsPoste] = useState<StatsPoste>('attaquant');
  const [statsPeriodeType, setStatsPeriodeType] = useState<PeriodeType>('match');
  const [statsPeriodeLibelle, setStatsPeriodeLibelle] = useState('');
  const [statsNbMatchs, setStatsNbMatchs] = useState('');
  const [statsJoueurs, setStatsJoueurs] = useState<StatJoueur[]>([{ nom: '', equipe: '', adversaire: '', valeurs: {} }]);
  const [statsTexteColle, setStatsTexteColle] = useState('');

  const [pEquipe, setPEquipe] = useState('');
  const [pCompetition, setPCompetition] = useState('');
  const [pPoule, setPPoule] = useState('');
  const [pAdversaires, setPAdversaires] = useState<AdversaireParcours[]>([{ nom: '', date: '', label: '', scoreEquipe: '', scoreAdversaire: '' }]);
  const [pTexteColle, setPTexteColle] = useState('');
  const [lotParcoursOuvert, setLotParcoursOuvert] = useState(false);
  const [texteLotParcours, setTexteLotParcours] = useState('');
  const [importLotParcours, setImportLotParcours] = useState(false);

  const [dNom, setDNom] = useState('');
  const [dPays, setDPays] = useState('');
  const [dFonction, setDFonction] = useState('');
  const [dCitation, setDCitation] = useState('');
  const [dContexte, setDContexte] = useState('');
  const [dTexteColle, setDTexteColle] = useState('');

  const [gTitreTirage, setGTitreTirage] = useState('');
  const [gGagnants, setGGagnants] = useState<Gagnant[]>([{ nom: '', prix: '' }]);

  const [icTitreConcours, setIcTitreConcours] = useState('');
  const [icLots, setIcLots] = useState('');
  const [icSlogan, setIcSlogan] = useState('VOTE. FÈ PWEN. RETIRE LAJAN.');
  const [icTexteMatchs, setIcTexteMatchs] = useState('');
  const [lotDeclarationsOuvert, setLotDeclarationsOuvert] = useState(false);
  const [texteLotDeclarations, setTexteLotDeclarations] = useState('');
  const [importLotDeclarations, setImportLotDeclarations] = useState(false);
  const [sportForm, setSportForm] = useState<Sport>('football');

  useEffect(() => { setSportForm(getSport()); }, []);
  // (la vérification de session + 2FA est maintenant gérée par <AdminAuth />)
  useEffect(() => { if (connecte) chargerArticles(); }, [connecte]);
  useEffect(() => { if (connecte && (modePost === 'matchsjour' || modePost === 'match') && matchsDispo.length === 0) chargerMatchsDispo(); }, [connecte, modePost]);

  const chargerMatchsDispo = async () => {
    const { data } = await supabase.from('matchs').select('*').order('date_match', { ascending: true });
    if (data) setMatchsDispo(data);
  };

  const toggleMatchJour = (m: Match) => {
    setMatchsJourSelection(prev => {
      const existe = prev.find(x => x.id === m.id);
      if (existe) return prev.filter(x => x.id !== m.id);
      return [...prev, { id: m.id, equipe1: m.equipe1, equipe2: m.equipe2, competition: m.competition, pays: m.pays, date_match: m.date_match, score1: m.score_home, score2: m.score_away }];
    });
  };

  const retirerMatchJour = (id: string) => setMatchsJourSelection(prev => prev.filter(x => x.id !== id));

  // Regroupe les matchs sélectionnés par pays + date (jour), puis crée UN post par groupe (façon carrousel)
  const [creationCarrouselEnCours, setCreationCarrouselEnCours] = useState(false);
  const creerMatchsDuJourParGroupe = async () => {
    if (matchsJourSelection.length === 0) { setMessage('❌ Sélectionnez au moins un match.'); return; }
    setCreationCarrouselEnCours(true);
    const groupes: Record<string, MatchJour[]> = {};
    matchsJourSelection.forEach(m => {
      const jour = new Date(m.date_match).toLocaleDateString('fr-CA', { timeZone: 'America/Port-au-Prince' }); // AAAA-MM-JJ stable
      const cle = (m.pays || 'Autre') + '|' + jour;
      if (!groupes[cle]) groupes[cle] = [];
      groupes[cle].push(m);
    });
    const rows = Object.entries(groupes).map(([cle, matchs]) => {
      const [pays, jour] = cle.split('|');
      const dateLisible = new Date(jour + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
      return {
        type: 'post', langue, categorie: 'Ponctuel', sport: sportForm,
        titre: 'Matchs du jour — ' + (pays !== 'Autre' ? pays + ' — ' : '') + dateLisible,
        pays1: pays !== 'Autre' ? pays : null,
        matchs_jour: matchs,
        publie: true
      };
    });
    const { error } = await supabase.from('articles').insert(rows);
    setCreationCarrouselEnCours(false);
    if (error) { setMessage('❌ ' + error.message); return; }
    setMessage('✅ ' + rows.length + ' post(s) créés, un par pays et par date (' + rows.map(r => r.titre).join(' · ') + ').');
    setMatchsJourSelection([]);
    chargerArticles();
  };

  const piocherMatch = (m: Match) => {
    setEquipe1(m.equipe1);
    setEquipe2(m.equipe2);
    setPays1(''); setPays2('');
    if (m.competition) setLigue(m.competition);
    setHeureMatch(new Date(m.date_match).toLocaleString('fr-FR', {timeZone:'America/Port-au-Prince', weekday:'short', day:'numeric', month:'short', hour:'2-digit', minute:'2-digit'}));
    if (m.score_home !== null && m.score_away !== null) {
      setScore1(String(m.score_home)); setScore2(String(m.score_away)); setStatutMatch('Match terminé');
    } else {
      setScore1(''); setScore2(''); setStatutMatch('À venir');
    }
    setPiocheMatchOuvert(false);
    setMessage('✅ Match pioché, vérifiez et complétez si besoin.');
  };

  const setScoreMatchJour = (id: string, champ: 'score1' | 'score2', val: string) => {
    setMatchsJourSelection(prev => prev.map(x => x.id === id ? { ...x, [champ]: val === '' ? null : parseInt(val) } : x));
  };

  const parserResultatFootball = (texte: string) => {
    const lignes = texte.split('\n').map(l => l.trim());
    let i = 0;
    while (i < lignes.length && !lignes[i]) i++;
    const header = lignes[i] || '';
    const mHeader = header.match(/^(.+?)\s+(\d+)\s*-\s*(\d+)\s+(.+)$/);
    if (!mHeader) return null;
    const equipe1 = mHeader[1].trim(), score1 = mHeader[2], score2 = mHeader[3], equipe2 = mHeader[4].trim();
    const buts: But[] = [];
    const rouges: CarteEvenement[] = [];
    const jaunes: CarteEvenement[] = [];
    let section: { type: 'but'; equipe: string } | { type: 'rouge' } | { type: 'jaune' } | null = null;
    for (let k = i + 1; k < lignes.length; k++) {
      const l = lignes[k];
      if (!l) continue;
      const mBut = l.match(/^buts?\s+(.+)$/i);
      if (mBut) { section = { type: 'but', equipe: mBut[1].trim() }; continue; }
      if (/^(cartons?\s+)?rouges?$/i.test(l)) { section = { type: 'rouge' }; continue; }
      if (/^(cartons?\s+)?jaunes?$/i.test(l)) { section = { type: 'jaune' }; continue; }
      const mJoueur = l.match(/^(.+?)\s+(\d{1,3})'?\s*(?:\((.+?)\))?$/);
      if (mJoueur && section) {
        const joueur = mJoueur[1].trim();
        const minute = mJoueur[2];
        const passeur = mJoueur[3] ? mJoueur[3].trim() : '';
        if (section.type === 'but') buts.push({ equipe: section.equipe, joueur, minute, passeur });
        else if (section.type === 'rouge') rouges.push({ joueur, minute });
        else if (section.type === 'jaune') jaunes.push({ joueur, minute });
      }
    }
    return { equipe1, score1, score2, equipe2, buts, rouges, jaunes };
  };

  const analyserResultat = () => {
    const r = parserResultatFootball(resTexteColle);
    if (!r) { setMessage('❌ Première ligne non reconnue. Format attendu : "Equipe1 3 - 1 Equipe2"'); return; }
    setEquipe1(r.equipe1); setScore1(r.score1); setScore2(r.score2); setEquipe2(r.equipe2);
    setResButs(r.buts); setResRouges(r.rouges); setResJaunes(r.jaunes);
    setStatutMatch('Match terminé');
    setMessage('✅ Résultat analysé. Vérifiez et corrigez si besoin avant de publier.');
  };

  const [lotResultatsOuvert, setLotResultatsOuvert] = useState(false);
  const [texteLotResultats, setTexteLotResultats] = useState('');
  const [importLotResultats, setImportLotResultats] = useState(false);
  const creerResultatsEnLot = async () => {
    const blocs = texteLotResultats.split(/\n-{3,}\n/).map(b => b.trim()).filter(Boolean);
    const aCreer = [];
    for (const bloc of blocs) {
      const r = parserResultatFootball(bloc);
      if (r) aCreer.push(r);
    }
    if (aCreer.length === 0) { setMessage('❌ Format non reconnu. Un résultat par bloc, séparés par une ligne "---".'); return; }
    setImportLotResultats(true);
    const rows = aCreer.map(r => ({
      type: 'post', langue, categorie: 'Actualités', sport: 'football',
      titre: r.equipe1 + ' vs ' + r.equipe2,
      equipe1: r.equipe1, equipe2: r.equipe2, score1: parseInt(r.score1), score2: parseInt(r.score2),
      statut_match: 'Match terminé',
      resultat_details: { buts: r.buts, rouges: r.rouges, jaunes: r.jaunes },
      publie: true
    }));
    const { error } = await supabase.from('articles').insert(rows);
    setImportLotResultats(false);
    if (error) { setMessage('❌ ' + error.message); return; }
    setMessage('✅ ' + rows.length + ' résultats créés et publiés (' + aCreer.map(r => r.equipe1 + '-' + r.equipe2).join(', ') + ').');
    setTexteLotResultats('');
    chargerArticles();
  };

  const analyserResultatBasket = () => {
    const lignes = resTexteColle.split('\n').map(l => l.trim());
    let i = 0;
    while (i < lignes.length && !lignes[i]) i++;
    const header = lignes[i] || '';
    const mHeader = header.match(/^(.+?)\s+(\d+)\s*-\s*(\d+)\s+(.+)$/);
    if (mHeader) {
      setEquipe1(mHeader[1].trim());
      setScore1(mHeader[2]);
      setScore2(mHeader[3]);
      setEquipe2(mHeader[4].trim());
    } else {
      setMessage('❌ Première ligne non reconnue. Format attendu : "Equipe1 102 - 98 Equipe2"');
      return;
    }
    const quarts: QuartTemps[] = [];
    for (let k = i + 1; k < lignes.length; k++) {
      const l = lignes[k];
      if (!l) continue;
      const m = l.match(/^(Q[1-4]|OT\d*)\s+(\d+)\s*-\s*(\d+)$/i);
      if (m) quarts.push({ quart: m[1].toUpperCase(), score1: m[2], score2: m[3] });
    }
    setResQuarts(quarts);
    setStatutMatch('Match terminé');
    setMessage('✅ Résultat analysé. Vérifiez et corrigez si besoin avant de publier.');
  };

  const modifierQuart = (i: number, champ: keyof QuartTemps, val: string) => setResQuarts(prev => prev.map((q, idx) => idx === i ? { ...q, [champ]: val } : q));
  const retirerQuart = (i: number) => setResQuarts(prev => prev.filter((_, idx) => idx !== i));
  const ajouterQuart = () => setResQuarts(prev => [...prev, { quart: 'Q' + (prev.length + 1), score1: '', score2: '' }]);

  const modifierBut = (i: number, champ: keyof But, val: string) => setResButs(prev => prev.map((b, idx) => idx === i ? { ...b, [champ]: val } : b));
  const retirerBut = (i: number) => setResButs(prev => prev.filter((_, idx) => idx !== i));
  const ajouterBut = () => setResButs(prev => [...prev, { equipe: equipe1 || '', joueur: '', minute: '', passeur: '' }]);
  const modifierCarte = (liste: 'rouges' | 'jaunes', i: number, champ: keyof CarteEvenement, val: string) => {
    const setter = liste === 'rouges' ? setResRouges : setResJaunes;
    setter(prev => prev.map((c, idx) => idx === i ? { ...c, [champ]: val } : c));
  };
  const retirerCarte = (liste: 'rouges' | 'jaunes', i: number) => {
    const setter = liste === 'rouges' ? setResRouges : setResJaunes;
    setter(prev => prev.filter((_, idx) => idx !== i));
  };
  const ajouterCarte = (liste: 'rouges' | 'jaunes') => {
    const setter = liste === 'rouges' ? setResRouges : setResJaunes;
    setter(prev => [...prev, { joueur: '', minute: '' }]);
  };

  const ajouterJoueurStats = () => { if (statsJoueurs.length < 6) setStatsJoueurs(prev => [...prev, { nom: '', equipe: '', adversaire: '', valeurs: {} }]); };
  const retirerJoueurStats = (i: number) => setStatsJoueurs(prev => prev.length > 1 ? prev.filter((_, idx) => idx !== i) : prev);
  const modifierJoueurStats = (i: number, champ: 'nom' | 'equipe' | 'adversaire' | 'photo' | 'pays', val: string) => setStatsJoueurs(prev => prev.map((j, idx) => idx === i ? { ...j, [champ]: val } : j));
  const modifierValeurStats = (i: number, cle: string, val: string) => setStatsJoueurs(prev => prev.map((j, idx) => idx === i ? { ...j, valeurs: { ...j.valeurs, [cle]: val } } : j));

  const modifierAdversaire = (i: number, champ: keyof AdversaireParcours, val: string) => setPAdversaires(prev => prev.map((a, idx) => idx === i ? { ...a, [champ]: val } : a));
  const ajouterAdversaire = () => setPAdversaires(prev => [...prev, { nom: '', date: '', label: '', scoreEquipe: '', scoreAdversaire: '' }]);
  const retirerAdversaire = (i: number) => setPAdversaires(prev => prev.filter((_, idx) => idx !== i));

  const modifierGagnant = (i: number, champ: keyof Gagnant, val: string) => setGGagnants(prev => prev.map((g, idx) => idx === i ? { ...g, [champ]: val } : g));
  const ajouterGagnant = () => setGGagnants(prev => [...prev, { nom: '', prix: '' }]);
  const retirerGagnant = (i: number) => setGGagnants(prev => prev.filter((_, idx) => idx !== i));

  const parserLigneAdversaire = (l: string): AdversaireParcours => {
    const parts = l.split(/\s+-\s+/).map(p => p.trim()).filter(p => p !== '');
    const score = parts[3] || '';
    const scoreParts = score.split('-').map(p => p.trim());
    return {
      nom: parts[0] || '',
      label: parts[1] || '',
      date: parts[2] || '',
      scoreEquipe: scoreParts.length === 2 ? scoreParts[0] : '',
      scoreAdversaire: scoreParts.length === 2 ? scoreParts[1] : ''
    };
  };

  const analyserParcours = () => {
    const lignes = pTexteColle.split('\n').map(l => l.trim());
    let i = 0;
    while (i < lignes.length && !lignes[i]) i++;
    const enTete = (lignes[i] || '').split(/\s+-\s+/).map(p => p.trim()).filter(p => p !== '');
    if (enTete.length < 2) { setMessage('❌ Première ligne non reconnue. Format attendu : "Équipe - Compétition - Poule (optionnel)"'); return; }
    setPEquipe(enTete[0]); setPCompetition(enTete[1]); setPPoule(enTete[2] || '');
    const adversaires: AdversaireParcours[] = [];
    for (let k = i + 1; k < lignes.length; k++) {
      const l = lignes[k];
      if (!l) continue;
      adversaires.push(parserLigneAdversaire(l));
    }
    if (adversaires.length === 0) { setMessage('❌ Aucun adversaire reconnu.'); return; }
    setPAdversaires(adversaires);
    setMessage('✅ Parcours analysé (' + adversaires.length + ' adversaires). Vérifiez et corrigez si besoin.');
  };

  const creerParcoursEnLot = async () => {
    const blocs = texteLotParcours.split(/\n\s*\n/).map(b => b.trim()).filter(Boolean);
    const aCreer: { equipe: string; competition: string; poule: string; adversaires: AdversaireParcours[] }[] = [];
    for (const bloc of blocs) {
      const lignes = bloc.split('\n').map(l => l.trim()).filter(Boolean);
      if (lignes.length < 2) continue;
      const enTete = lignes[0].split(/\s+-\s+/).map(p => p.trim()).filter(p => p !== '');
      if (enTete.length < 2) continue;
      const adversaires = lignes.slice(1).map(l => parserLigneAdversaire(l));
      aCreer.push({ equipe: enTete[0], competition: enTete[1], poule: enTete[2] || '', adversaires });
    }
    if (aCreer.length === 0) { setMessage('❌ Format non reconnu. Un bloc par équipe : 1ère ligne "Équipe - Compétition - Poule", puis une ligne par adversaire.'); return; }
    setImportLotParcours(true);
    const rows = aCreer.map(c => ({
      type: 'post', langue, categorie: 'Ponctuel', sport: sportForm, titre: 'Parcours — ' + c.equipe,
      parcours: c, publie: true
    }));
    const { error } = await supabase.from('articles').insert(rows);
    setImportLotParcours(false);
    if (error) { setMessage('❌ ' + error.message); return; }
    setMessage('✅ ' + rows.length + ' parcours créés et publiés (' + aCreer.map(c => c.equipe).join(', ') + ').');
    setTexteLotParcours('');
    chargerArticles();
  };

  const parserDeclaration = (bloc: string): Declaration => {
    const lignes = bloc.split('\n').map(l => l.trim());
    let i = 0;
    while (i < lignes.length && !lignes[i]) i++;
    const entete = (lignes[i] || '').split(/\s+-\s+/).map(p => p.trim()).filter(p => p !== '');
    i++;
    while (i < lignes.length && !lignes[i]) i++;
    const citation = lignes.slice(i).filter(l => l).join(' ').trim();
    return { nom: entete[0] || '', fonction: entete[1] || '', contexte: entete[2] || '', citation };
  };

  const analyserDeclaration = () => {
    if (!dTexteColle.trim()) { setMessage('❌ Collez du texte à analyser.'); return; }
    const d = parserDeclaration(dTexteColle);
    if (!d.nom || !d.citation) { setMessage('❌ Format non reconnu. 1ère ligne : "Nom - Fonction - Contexte (optionnel)", ligne vide, puis la citation.'); return; }
    setDNom(d.nom); setDPays(''); setDFonction(d.fonction); setDContexte(d.contexte); setDCitation(d.citation);
    setMessage('✅ Déclaration analysée. Vérifiez et corrigez si besoin.');
  };

  const creerDeclarationsEnLot = async () => {
    const blocs = texteLotDeclarations.split(/\n-{3,}\n/).map(b => b.trim()).filter(Boolean);
    const aCreer: Declaration[] = [];
    for (const bloc of blocs) {
      const d = parserDeclaration(bloc);
      if (d.nom && d.citation) aCreer.push(d);
    }
    if (aCreer.length === 0) { setMessage('❌ Format non reconnu. Un bloc par déclaration, séparés par une ligne "---".'); return; }
    setImportLotDeclarations(true);
    const rows = aCreer.map(d => ({
      type: 'post', langue, categorie: 'Ponctuel', sport: sportForm, titre: 'Déclaration — ' + d.nom,
      declaration: d, publie: true
    }));
    const { error } = await supabase.from('articles').insert(rows);
    setImportLotDeclarations(false);
    if (error) { setMessage('❌ ' + error.message); return; }
    setMessage('✅ ' + rows.length + ' déclarations créées et publiées (' + aCreer.map(d => d.nom).join(', ') + ').');
    setTexteLotDeclarations('');
    chargerArticles();
  };

  const erreurColonneDistinction = (msg: string) => {
    const col = ['distinction_details', 'onze_details', 'elimination'].find(c => msg.includes(c));
    return col
      ? "❌ La colonne '" + col + "' n'existe pas encore dans Supabase. Exécutez le SQL fourni (SQL Editor), puis réessayez."
      : '❌ ' + msg;
  };

  const appliquerTexteElim = () => {
    const r = parserElimination(texteElim);
    if (!r.details.rencontres.length) { setMessage('❌ Aucune rencontre reconnue. Une ligne par match : « Haïti 2-1 Cuba » ou « France vs Argentine ».'); return; }
    setElim(prev => ({ competition: r.details.competition || prev.competition, tour: r.details.tour || prev.tour, rencontres: r.details.rencontres }));
    setMessage('✅ ' + r.details.rencontres.length + ' rencontre(s) importée(s).' + (r.ignorees.length ? ' ⚠️ Lignes ignorées : ' + r.ignorees.join(' | ') : ''));
  };
  const majRencontre = (i: number, champ: keyof Rencontre, val: string) => setElim(prev => ({ ...prev, rencontres: prev.rencontres.map((r, idx) => idx === i ? { ...r, [champ]: val } : r) }));

  const uploadPhotoOnze = async (i: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploadingOnze(i); setMessage('');
    try {
      const blob = await redimensionnerImage(file, 700);
      const nom = 'onze-' + Date.now() + '-' + i + '.jpg';
      const { error } = await supabase.storage.from('articles').upload(nom, blob, { contentType: 'image/jpeg' });
      if (error) { setMessage('❌ Photo : ' + error.message); setUploadingOnze(null); return; }
      const { data } = supabase.storage.from('articles').getPublicUrl(nom);
      setJoueur(i, 'photo', data.publicUrl);
    } catch (err) {
      setMessage('❌ Photo : ' + (err instanceof Error ? err.message : 'erreur'));
    }
    setUploadingOnze(null);
  };

  const lancerVideo = async (a: Article) => {
    if (videoUrl) URL.revokeObjectURL(videoUrl);
    videoSignal.current = { annule: false };
    setVideoArticle(a); setVideoUrl(''); setVideoErreur(''); setVideoPct(0); setVideoEtape('Préparation…');
    try {
      const r = await genererVideo(a, (p, e) => { setVideoPct(p); setVideoEtape(e); }, videoSignal.current);
      setVideoExt(r.ext);
      setVideoUrl(URL.createObjectURL(r.blob));
    } catch (err) {
      if (!(err instanceof Error && err.message === 'annulé')) setVideoErreur(err instanceof Error ? err.message : 'Erreur vidéo');
    }
  };

  const fermerVideo = () => {
    videoSignal.current.annule = true;
    if (videoUrl) URL.revokeObjectURL(videoUrl);
    setVideoUrl(''); setVideoArticle(null);
  };

  const appliquerTexteOnze = () => {
    const r = parserOnze(texteOnze);
    if (r.erreurs.length) { setMessage('❌ ' + r.erreurs.join(' · ')); return; }
    setOnzeDetails(r.details);
    setFormation(r.formation);
    setOnze(r.joueurs.map((j, i) => ({ nom: j.nom, equipe: j.equipe, pays: j.pays || '', photo: onze[i]?.nom === j.nom ? (onze[i]?.photo || '') : '' })));
    setMessage('✅ Équipe importée : ' + r.joueurs.length + ' joueurs. Ajoutez les photos si vous voulez.');
  };

  const uploadPhotoDistinction = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploadingDist(true); setMessage('');
    try {
      const blob = await redimensionnerImage(file);
      const nom = 'distinction-' + Date.now() + '.jpg';
      const { error } = await supabase.storage.from('articles').upload(nom, blob, { contentType: 'image/jpeg' });
      if (error) { setMessage('❌ Photo : ' + error.message); setUploadingDist(false); return; }
      const { data } = supabase.storage.from('articles').getPublicUrl(nom);
      setDistPhoto(data.publicUrl);
      setMessage('✅ Photo ajoutée.');
    } catch (err) {
      setMessage('❌ Photo : ' + (err instanceof Error ? err.message : 'erreur'));
    }
    setUploadingDist(false);
  };

  const creerDistinctionsEnLot = async () => {
    const { distinctions, ignores } = parserLotDistinctions(texteLotDistinctions);
    if (distinctions.length === 0) { setMessage('❌ Format non reconnu. 1ère ligne de chaque bloc : "Catégorie - Lauréat - Équipe - Championnat - Période". Blocs séparés par une ligne vide.'); return; }
    setImportLotDistinctions(true);
    const rows = distinctions.map(d => ({
      type: 'post', langue, categorie: 'Ponctuel', sport: sportForm,
      titre: d.categorie + ' — ' + d.laureat + (d.periode ? ' (' + d.periode + ')' : ''),
      distinction_type: d.categorie, laureat: d.laureat,
      distinction_stats: d.stats || null, distinction_note: d.note || null,
      distinction_details: { equipe: d.equipe, championnat: d.championnat, periode: d.periode, photo: '', pays: d.pays },
      publie: true
    }));
    const { error } = await supabase.from('articles').insert(rows);
    setImportLotDistinctions(false);
    if (error) { setMessage(erreurColonneDistinction(error.message)); return; }
    const libres = distinctions.filter(d => !d.officielle).length;
    setMessage('✅ ' + rows.length + ' distinction(s) créée(s) et publiée(s) (' + distinctions.map(d => d.laureat).join(', ') + ').'
      + (libres ? ' ' + libres + ' avec une catégorie libre (hors liste).' : '')
      + (ignores ? ' ⚠️ ' + ignores + ' bloc(s) ignoré(s) (incomplets).' : ''));
    setTexteLotDistinctions('');
    chargerArticles();
  };

  const analyserStats = () => {
    // Football : on cherche dans TOUTES les catégories (poste choisi en
    // premier) pour ne jamais perdre une stat collée.
    const champs = sportForm === 'football' ? champsFootball(statsPoste) : CHAMPS_STATS_BASKET;
    const blocs = statsTexteColle.split(/\n\s*\n/).map(b => b.trim()).filter(Boolean);
    if (blocs.length === 0) { setMessage('❌ Collez du texte à analyser.'); return; }
    const nonReconnues: string[] = [];
    const joueurs: StatJoueur[] = blocs.slice(0, 6).map(bloc => {
      const lignes = bloc.split('\n').map(l => l.trim()).filter(Boolean);
      const [nomLigne, ...reste] = lignes;
      const { nom, equipe, adversaire, pays } = parserLigneJoueur(nomLigne || '');
      const valeurs: Record<string, string> = {};
      reste.forEach(l => {
        const m = l.match(/^(.+?)\s*[:=]\s*(.+)$/) || l.match(/^(.+?)\s+[-–—]\s+(.+)$/) || l.match(/^(.+?)\s+(\d+(?:[.,]\d+)?\s*%?)$/);
        const cle = m ? trouverCleStat(m[1], champs) : undefined;
        if (m && cle) valeurs[cle] = m[2].trim();
        else nonReconnues.push(l);
      });
      const ancienne = statsJoueurs.find(e => e.photo && e.nom.trim().toLowerCase() === nom.trim().toLowerCase());
      return { nom, equipe, adversaire, valeurs, photo: ancienne?.photo, pays: pays || ancienne?.pays || '' };
    });
    setStatsJoueurs(joueurs);
    if (joueurs.length >= 2 && statsMode === 'performance') setStatsMode('comparaison');
    const sansAdversaire = joueurs.filter(j => !j.adversaire).length;
    setMessage('✅ ' + joueurs.length + ' joueur(s) analysé(s).'
      + (sansAdversaire ? ' ⚠️ Adversaire manquant pour ' + sansAdversaire + ' joueur(s).' : '')
      + (nonReconnues.length ? ' ⚠️ Lignes non reconnues : ' + nonReconnues.join(' | ') : ''));
  };

  const chargerArticles = async () => {
    const { data } = await supabase.from('articles').select('*').order('created_at', { ascending: false });
    if (data) setArticles(data);
  };

  const slugify = (t: string) => t.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);

  // Réduit la photo (max 1200 px) avant l'envoi : téléversement rapide sur téléphone,
  // et largement assez net pour l'affichage et les vidéos.
  const redimensionnerImage = (file: File, max = 1200): Promise<Blob> => new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const ratio = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * ratio);
      c.height = Math.round(img.height * ratio);
      const ctx = c.getContext('2d');
      if (!ctx) { URL.revokeObjectURL(url); reject(new Error('canvas indisponible')); return; }
      ctx.drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      c.toBlob(b => (b ? resolve(b) : reject(new Error('conversion impossible'))), 'image/jpeg', 0.92);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('image illisible')); };
    img.src = url;
  });

  const uploadPhotoJoueur = async (i: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploadingJoueur(i); setMessage('');
    try {
      const blob = await redimensionnerImage(file);
      const nom = 'joueur-' + Date.now() + '-' + i + '.jpg';
      const { error } = await supabase.storage.from('articles').upload(nom, blob, { contentType: 'image/jpeg' });
      if (error) { setMessage('❌ Photo joueur : ' + error.message); setUploadingJoueur(null); return; }
      const { data } = supabase.storage.from('articles').getPublicUrl(nom);
      modifierJoueurStats(i, 'photo', data.publicUrl);
      setMessage('✅ Photo du joueur ajoutée.');
    } catch (err) {
      setMessage('❌ Photo joueur : ' + (err instanceof Error ? err.message : 'erreur'));
    }
    setUploadingJoueur(null);
  };

  const uploadImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true); setMessage('');
    const nom = Date.now() + '-' + file.name.replace(/[^a-zA-Z0-9.]/g, '_');
    const { error } = await supabase.storage.from('articles').upload(nom, file);
    if (error) { setMessage('❌ Upload : ' + error.message); setUploading(false); return; }
    const { data } = supabase.storage.from('articles').getPublicUrl(nom);
    setImageCouverture(data.publicUrl);
    setUploading(false);
    setMessage('✅ Image uploadée !');
  };

  const uploadPubLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPub(true); setMessage('');
    const nom = 'pub-' + Date.now() + '-' + file.name.replace(/[^a-zA-Z0-9.]/g, '_');
    const { error } = await supabase.storage.from('articles').upload(nom, file);
    if (error) { setMessage('❌ Upload logo pub : ' + error.message); setUploadingPub(false); return; }
    const { data } = supabase.storage.from('articles').getPublicUrl(nom);
    setPubLogo(data.publicUrl);
    setUploadingPub(false);
    setMessage('✅ Logo pub uploadé !');
  };

  const uploadLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingLogo(true); setMessage('');
    const nom = 'logo-' + Date.now() + '-' + file.name.replace(/[^a-zA-Z0-9.]/g, '_');
    const { error } = await supabase.storage.from('articles').upload(nom, file);
    if (error) { setMessage('❌ Upload logo : ' + error.message); setUploadingLogo(false); return; }
    const { data } = supabase.storage.from('articles').getPublicUrl(nom);
    setLigueLogo(data.publicUrl);
    setUploadingLogo(false);
    setMessage('✅ Logo uploadé !');
  };

  const resetForm = () => {
    setTitre(''); setType('article'); setLangue('fr'); setCategorie('Actualités');
    setSourceNom(''); setSourceUrl(''); setImageCouverture(''); setExtrait(''); setContenu('');
    setTags([]); setPays1(''); setPays2('');
    setLigue(''); setLigueLogo(''); setEquipe1(''); setEquipe2(''); setScore1(''); setScore2(''); setStatutMatch('');
    setDistinctionType(''); setDistinctionAutre(''); setLaureat(''); setDistinctionNote(''); setDistinctionStats('');
    setDistEquipe(''); setDistChampionnat(''); setDistPeriode(''); setDistPhoto(''); setDistPays('');
    setElim({ ...ELIMINATION_VIDE, rencontres: [{ ...RENCONTRE_VIDE }] }); setTexteElim('');
    setFormation(''); setOnze(Array.from({length:11},()=>({nom:'',equipe:'',photo:''}))); setOnzeDetails(ONZE_DETAILS_VIDES); setTexteOnze('');
    setModePost('simple'); setClassementType(''); setClassementTitre(''); setClassementPays(''); setClassementPositionDepart('1');
    setPubActif(false); setPubNom(''); setPubLogo(''); setPubLien('');
    setClassement(Array.from({length:10},(_,i)=>({pos:String(i+1),nom:'',extra:'',diff:'',pays:'',val:'',couleur:''})));
    setClassementTexteColle('');
    setMatchsJourSelection([]);
    setResTexteColle(''); setResButs([]); setResRouges([]); setResJaunes([]); setResQuarts([]);
    setGTitreTirage(''); setGGagnants([{ nom: '', prix: '' }]);
    setSportForm(getSport());
    setHeureMatch(''); setStade('');
    setStatsMode('performance'); setStatsPoste('attaquant'); setStatsNbMatchs('');
    setStatsPeriodeType('match'); setStatsPeriodeLibelle('');
    setStatsJoueurs([{ nom: '', equipe: '', adversaire: '', valeurs: {} }]);
    setStatsTexteColle('');
    setPEquipe(''); setPCompetition(''); setPPoule('');
    setPAdversaires([{ nom: '', date: '', label: '', scoreEquipe: '', scoreAdversaire: '' }]);
    setPTexteColle('');
    setDNom(''); setDPays(''); setDFonction(''); setDCitation(''); setDContexte('');
    setDTexteColle('');
    setIcTitreConcours(''); setIcLots(''); setIcSlogan('VOTE. FÈ PWEN. RETIRE LAJAN.'); setIcTexteMatchs('');
  };

  const nouvelArticle = () => { setEditId(null); resetForm(); setVue('editer'); };

  const editerArticle = (a: Article) => {
    setEditId(a.id); setTitre(a.titre); setType(a.type || 'article'); setLangue(a.langue || 'fr');
    setCategorie(a.categorie); setSourceNom(a.source_nom || ''); setSourceUrl(a.source_url || '');
    setImageCouverture(a.image_couverture || ''); setExtrait(a.extrait || ''); setContenu(a.contenu || '');
    setTags(a.tags || []); setPays1(a.pays1 || ''); setPays2(a.pays2 || '');
    setLigue(a.ligue || ''); setLigueLogo(a.ligue_logo || '');
    setEquipe1(a.equipe1 || ''); setEquipe2(a.equipe2 || '');
    setScore1(a.score1 !== null && a.score1 !== undefined ? String(a.score1) : '');
    setScore2(a.score2 !== null && a.score2 !== undefined ? String(a.score2) : '');
    setStatutMatch(a.statut_match || '');
    setHeureMatch(a.heure_match || ''); setStade(a.stade || '');
    const dt = a.distinction_type || '';
    if (dt && !DISTINCTIONS.includes(dt)) { setDistinctionType('Autre'); setDistinctionAutre(dt); }
    else { setDistinctionType(dt); setDistinctionAutre(''); }
    setLaureat(a.laureat || ''); setDistinctionNote(a.distinction_note || ''); setDistinctionStats(a.distinction_stats || '');
    const dd = { ...DETAILS_VIDES, ...(a.distinction_details || {}) };
    setDistEquipe(dd.equipe || ''); setDistChampionnat(dd.championnat || ''); setDistPeriode(dd.periode || ''); setDistPhoto(dd.photo || ''); setDistPays(dd.pays || '');
    setPubActif(a.pub_actif || false); setPubNom(a.pub_nom || ''); setPubLogo(a.pub_logo || ''); setPubLien(a.pub_lien || '');
    if (a.pub_actif && !(a.elimination && a.elimination.rencontres?.length) && !a.formation && !a.classement_type && !a.distinction_type && !a.pays1 && !a.equipe1 && !a.ligue && !(a.matchs_jour && a.matchs_jour.length) && !a.resultat_details && !(a.quarts_temps && a.quarts_temps.length) && !(a.stats_joueur && a.stats_joueur.joueurs?.length) && !(a.parcours && a.parcours.adversaires?.length) && !(a.declaration && a.declaration.citation) && !(a.gagnants && a.gagnants.gagnants?.length)) setModePost('sponsorise');
    else if (a.elimination && a.elimination.rencontres?.length) setModePost('elimination');
    else if (a.formation) setModePost('onze');
    else if (a.classement_type) setModePost('classement');
    else if (a.distinction_type) setModePost('distinction');
    else if (a.stats_joueur && a.stats_joueur.joueurs?.length) setModePost('stats');
    else if (a.matchs_jour && a.matchs_jour.length) setModePost('matchsjour');
    else if ((a.resultat_details && (a.resultat_details.buts?.length || a.resultat_details.rouges?.length || a.resultat_details.jaunes?.length)) || (a.quarts_temps && a.quarts_temps.length)) setModePost('resultat');
    else if (a.parcours && a.parcours.adversaires?.length) setModePost('parcours');
    else if (a.declaration && a.declaration.citation) setModePost('declaration');
    else if (a.gagnants && a.gagnants.gagnants?.length) setModePost('gagnants');
    else if (a.pays1 || a.equipe1 || a.ligue) setModePost('match');
    else setModePost('simple');
    setClassementType(a.classement_type || ''); setClassementTitre(a.classement_titre || ''); setClassementPays(a.classement_pays || ''); setClassementPositionDepart('1');
    if (a.classement && Array.isArray(a.classement) && a.classement.length > 0) setClassement(a.classement.map(l => ({...l, couleur: l.couleur || ''})));
    else setClassement(Array.from({length:10},(_,i)=>({pos:String(i+1),nom:'',extra:'',diff:'',pays:'',val:'',couleur:''})));
    setFormation(a.formation || '');
    setElim(a.elimination && a.elimination.rencontres?.length ? { competition: a.elimination.competition || '', tour: a.elimination.tour || '', rencontres: a.elimination.rencontres.map(r => ({ ...RENCONTRE_VIDE, ...r })) } : { ...ELIMINATION_VIDE, rencontres: [{ ...RENCONTRE_VIDE }] });
    setOnzeDetails(a.onze_details ? { ...ONZE_DETAILS_VIDES, ...a.onze_details } : ONZE_DETAILS_VIDES);
    if (a.onze && Array.isArray(a.onze) && a.onze.length === 11) setOnze(a.onze.map(j => ({ photo: '', ...j })));
    else setOnze(Array.from({length:11},()=>({nom:'',equipe:''})));
    setMatchsJourSelection(a.matchs_jour && Array.isArray(a.matchs_jour) ? a.matchs_jour : []);
    setResButs(a.resultat_details?.buts || []); setResRouges(a.resultat_details?.rouges || []); setResJaunes(a.resultat_details?.jaunes || []);
    setResQuarts(a.quarts_temps || []);
    if (a.parcours) {
      setPEquipe(a.parcours.equipe || ''); setPCompetition(a.parcours.competition || ''); setPPoule(a.parcours.poule || '');
      setPAdversaires(a.parcours.adversaires?.length ? a.parcours.adversaires : [{ nom: '', date: '', label: '', scoreEquipe: '', scoreAdversaire: '' }]);
    } else {
      setPEquipe(''); setPCompetition(''); setPPoule('');
      setPAdversaires([{ nom: '', date: '', label: '', scoreEquipe: '', scoreAdversaire: '' }]);
    }
    if (a.declaration) {
      setDNom(a.declaration.nom || ''); setDPays(a.declaration.pays || ''); setDFonction(a.declaration.fonction || '');
      setDCitation(a.declaration.citation || ''); setDContexte(a.declaration.contexte || '');
    } else {
      setDNom(''); setDPays(''); setDFonction(''); setDCitation(''); setDContexte('');
    }
    if (a.gagnants && a.gagnants.gagnants?.length) {
      setGTitreTirage(a.gagnants.titreTirage || '');
      setGGagnants(a.gagnants.gagnants);
    } else {
      setGTitreTirage(''); setGGagnants([{ nom: '', prix: '' }]);
    }
    setSportForm((a.sport as Sport) || 'football');
    setResTexteColle('');
    if (a.stats_joueur && a.stats_joueur.joueurs?.length) {
      // Anciens posts : le mode "bilan" est devenu une période (saison par défaut).
      setStatsMode(a.stats_joueur.mode === 'comparaison' ? 'comparaison' : 'performance');
      setStatsPoste(normaliserPoste(a.stats_joueur.poste));
      setStatsNbMatchs(a.stats_joueur.nbMatchs || '');
      setStatsPeriodeType(a.stats_joueur.periode?.type || (a.stats_joueur.mode === 'bilan' ? 'saison' : 'match'));
      setStatsPeriodeLibelle(a.stats_joueur.periode?.libelle || '');
      setStatsJoueurs(a.stats_joueur.joueurs.map(j => ({ ...j, adversaire: j.adversaire || '' })));
    } else {
      setStatsMode('performance'); setStatsPoste('attaquant'); setStatsNbMatchs('');
      setStatsPeriodeType('match'); setStatsPeriodeLibelle('');
      setStatsJoueurs([{ nom: '', equipe: '', adversaire: '', valeurs: {} }]);
    }
    setVue('editer');
  };

  const setLigne = (i: number, champ: 'pos' | 'nom' | 'extra' | 'diff' | 'pays' | 'val' | 'couleur', val: string) => {
    setClassement(prev => prev.map((l, idx) => idx === i ? { ...l, [champ]: val } : l));
  };

  const ajouterLigne = () => setClassement(prev => [...prev, { pos: String(prev.length+1), nom:'', extra:'', diff:'', pays:'', val:'', couleur:'' }]);

  const collerClassement = () => {
    const lignes = classementTexteColle.split('\n').map(l => l.trim()).filter(l => l);
    if (lignes.length === 0) { setMessage('❌ Collez du texte à analyser.'); return; }
    const depart = parseInt(classementPositionDepart) || 1;
    const parsees = lignes.map((l, i) => {
      const parts = l.split(/\s+-\s+/).map(p => p.trim()).filter(p => p !== '');
      if (classementType === 'equipes') {
        return { pos: String(depart + i), nom: parts[0] || '', extra: parts[1] || '', diff: parts[2] || '', val: parts[3] || '', pays: '', couleur: '' };
      }
      // Joueurs : "Joueur - Équipe - Buts" (3) ou "Joueur - Équipe - Pays - Buts" (4, avec drapeau)
      if (parts.length >= 4) {
        return { pos: String(depart + i), nom: parts[0] || '', extra: parts[1] || '', diff: '', pays: parts[2] || '', val: parts[3] || '', couleur: '' };
      }
      return { pos: String(depart + i), nom: parts[0] || '', extra: parts[1] || '', diff: '', pays: '', val: parts[2] || '', couleur: '' };
    });
    setClassement(parsees);
    setMessage('✅ Classement analysé (' + parsees.length + ' lignes, à partir de la position ' + depart + '). Vérifiez et corrigez si besoin.');
  };

  const [genererClassementPointsEnCours, setGenererClassementPointsEnCours] = useState(false);
  const genererClassementPoints = async () => {
    setGenererClassementPointsEnCours(true);
    setMessage('');
    const { data: sess } = await supabase.auth.getSession();
    const token = sess.session?.access_token;
    if (!token) { setGenererClassementPointsEnCours(false); setMessage('\u274c Session expir\u00e9e, reconnectez-vous.'); return; }
    const res = await fetch('/api/classement-points', { headers: { 'Authorization': 'Bearer ' + token } });
    const data = await res.json();
    setGenererClassementPointsEnCours(false);
    if (!res.ok) { setMessage('\u274c ' + (data.error || 'Erreur lors de la g\u00e9n\u00e9ration.')); return; }
    if (!data.classement || data.classement.length === 0) { setMessage('\u274c Aucun joueur avec des points pour le moment.'); return; }
    const parsees = data.classement.map((ligne: { nom: string; solde: number }, i: number) => ({
      pos: String(i + 1), nom: ligne.nom, extra: '', diff: '', pays: '', val: String(ligne.solde), couleur: ''
    }));
    setClassementType('joueurs');
    setClassementTitre('Classement de la semaine \u2014 Points MakeGoal');
    setClassement(parsees);
    setMessage('\u2705 Classement g\u00e9n\u00e9r\u00e9 \u00e0 partir des soldes r\u00e9els (' + parsees.length + ' joueurs). V\u00e9rifiez avant de publier.');
  };

  const [quizzFootListe, setQuizzFootListe] = useState<{ id: string; titre: string; statut: string }[]>([]);
  const [quizzFootChoisi, setQuizzFootChoisi] = useState('');
  const [genererClassementQuizzEnCours, setGenererClassementQuizzEnCours] = useState(false);

  const chargerQuizzFootListe = async () => {
    const { data } = await supabase.from('quizz_foot').select('id, titre, statut').order('created_at', { ascending: false }).limit(30);
    if (data) setQuizzFootListe(data);
  };

  const genererClassementQuizz = async () => {
    if (!quizzFootChoisi) { setMessage('\u274c Choisissez un FootQuizz dans la liste.'); return; }
    setGenererClassementQuizzEnCours(true);
    setMessage('');
    const { data: sess } = await supabase.auth.getSession();
    const token = sess.session?.access_token;
    if (!token) { setGenererClassementQuizzEnCours(false); setMessage('\u274c Session expir\u00e9e, reconnectez-vous.'); return; }
    const res = await fetch('/api/quizz-foot-classement?quizzId=' + quizzFootChoisi, { headers: { 'Authorization': 'Bearer ' + token } });
    const data = await res.json();
    setGenererClassementQuizzEnCours(false);
    if (!res.ok) { setMessage('\u274c ' + (data.error || 'Erreur lors de la g\u00e9n\u00e9ration.')); return; }
    if (!data.resultats || data.resultats.length === 0) { setMessage('\u274c Aucun participant ayant termin\u00e9 ce FootQuizz.'); return; }
    const formatTemps = (s: number | null) => s === null ? '\u2014' : s < 60 ? s + 's' : Math.floor(s / 60) + 'min ' + (s % 60) + 's';
    const parsees = data.resultats.map((r: { nom: string; score: number; tempsSecondes: number | null }, i: number) => ({
      pos: String(i + 1), nom: r.nom, extra: formatTemps(r.tempsSecondes), diff: '', pays: '', val: r.score + '/10', couleur: ''
    }));
    setClassementType('joueurs');
    setClassementTitre('Classement FootQuizz \u2014 ' + data.titre);
    setClassement(parsees);
    setMessage('\u2705 Classement g\u00e9n\u00e9r\u00e9 (' + parsees.length + ' participant(s), tri\u00e9s par note puis par temps). V\u00e9rifiez avant de publier.');
  };

  const creerClassementsEnLot = async () => {
    const blocs = texteLotClassements.split(/\n\s*\n/).map(b => b.trim()).filter(Boolean);
    const depart = parseInt(classementPositionDepart) || 1;
    const aCreer: { nomLigue: string; lignes: { pos: string; nom: string; extra: string; diff: string; pays: string; val: string; couleur: string }[] }[] = [];
    for (const bloc of blocs) {
      const lignes = bloc.split('\n').map(l => l.trim()).filter(Boolean);
      if (lignes.length < 2) continue;
      const nomLigue = lignes[0];
      const equipes = lignes.slice(1).map((l, i) => {
        const parts = l.split(/\s+-\s+/).map(p => p.trim()).filter(p => p !== '');
        if (typeLotClassements === 'equipes') {
          return { pos: String(depart + i), nom: parts[0] || '', extra: parts[1] || '', diff: parts[2] || '', val: parts[3] || '', pays: '', couleur: '' };
        }
        if (parts.length >= 4) {
          return { pos: String(depart + i), nom: parts[0] || '', extra: parts[1] || '', diff: '', pays: parts[2] || '', val: parts[3] || '', couleur: '' };
        }
        return { pos: String(depart + i), nom: parts[0] || '', extra: parts[1] || '', diff: '', pays: '', val: parts[2] || '', couleur: '' };
      });
      aCreer.push({ nomLigue, lignes: equipes });
    }
    if (aCreer.length === 0) { setMessage('❌ Format non reconnu. Un nom de championnat par bloc, puis une ligne par ' + (typeLotClassements === 'equipes' ? 'équipe' : 'joueur') + '.'); return; }
    setImportLotClassements(true);
    const rows = aCreer.map(c => ({
      type: 'post', langue, categorie: 'Classement', titre: 'Classement — ' + c.nomLigue,
      classement_type: typeLotClassements, classement_titre: c.nomLigue, classement_pays: classementPays || null, classement: c.lignes,
      publie: true
    }));
    const { error } = await supabase.from('articles').insert(rows);
    setImportLotClassements(false);
    if (error) { setMessage('❌ ' + error.message); return; }
    setMessage('✅ ' + rows.length + ' classements créés et publiés (' + aCreer.map(c => c.nomLigue).join(', ') + ').');
    setTexteLotClassements('');
    chargerArticles();
  };

  const COULEURS_LIGNE = [
    { cle: '', label: '—', hex: 'transparent' },
    { cle: 'vert', label: 'Qualifié', hex: '#10b981' },
    { cle: 'orange', label: 'Barrage', hex: '#f59e0b' },
    { cle: 'rouge', label: 'Éliminé', hex: '#ef4444' },
  ];

  const setJoueur = (i: number, champ: 'nom' | 'equipe' | 'photo' | 'pays', val: string) => {
    setOnze(prev => prev.map((j, idx) => idx === i ? { ...j, [champ]: val } : j));
  };

  const toggleTag = (t: string) => setTags(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]);

  const sauvegarder = async (publier: boolean) => {
    let titreFinal = titre;
    if (!titreFinal) {
      if (modePost === 'classement' && classementTitre) titreFinal = classementTitre;
      else if ((modePost === 'match' || modePost === 'resultat') && equipe1 && equipe2) titreFinal = equipe1 + ' vs ' + equipe2;
      else if (modePost === 'stats' && statsJoueurs[0]?.nom) titreFinal = statsJoueurs[0].nom + (statsJoueurs[0].equipe ? ' (' + statsJoueurs[0].equipe + ')' : '') + (statsPeriodeType === 'match' ? (statsJoueurs[0].adversaire ? ' face à ' + statsJoueurs[0].adversaire : '') : '') + ' — Stats' + (statsPeriodeType !== 'match' ? ' ' + libellePeriode({ type: statsPeriodeType, libelle: statsPeriodeLibelle }) : '');
      else if (modePost === 'distinction' && laureat) titreFinal = (distinctionType === 'Autre' ? (distinctionAutre || 'Distinction') : (distinctionType || 'Distinction')) + ' — ' + laureat + (distPeriode ? ' (' + distPeriode + ')' : '');
      else if (modePost === 'elimination' && elim.rencontres[0]?.equipe1) titreFinal = (elim.tour || 'Élimination directe') + (elim.competition ? ' — ' + elim.competition : '');
      else if (modePost === 'onze' && formation) titreFinal = onzeDetails.categorie ? (onzeDetails.categorie + (onzeDetails.competition ? ' — ' + onzeDetails.competition : '') + (onzeDetails.periode ? ' ' + onzeDetails.periode : '')) : 'Onze type — ' + formation;
      else if (modePost === 'parcours' && pEquipe) titreFinal = 'Parcours — ' + pEquipe;
      else if (modePost === 'declaration' && dNom) titreFinal = 'Déclaration — ' + dNom;
      else if (modePost === 'gagnants' && gTitreTirage) titreFinal = gTitreTirage;
      else if (modePost === 'invitation' && icTitreConcours) titreFinal = 'Invitation — ' + icTitreConcours;
      else titreFinal = 'Post MakeGoal — ' + new Date().toLocaleDateString('fr-FR');
    }
    setSaving(true); setMessage('');
    const { data: sess } = await supabase.auth.getSession();
    if (!sess.session) {
      setSaving(false);
      setMessage('❌ Session expirée. Reconnectez-vous.');
      setConnecte(false);
      return;
    }
    const payload = {
      titre: titreFinal, type, langue, categorie,
      source_nom: sourceNom || null, source_url: sourceUrl || null,
      tags, pays1: pays1 || null, pays2: pays2 || null,
      ligue: ligue || null, ligue_logo: ligueLogo || null,
      equipe1: equipe1 || null, equipe2: equipe2 || null,
      score1: score1 !== '' ? parseInt(score1) : null,
      score2: score2 !== '' ? parseInt(score2) : null,
      statut_match: statutMatch || null,
      heure_match: (modePost === 'match' || modePost === 'resultat') ? (heureMatch || null) : null,
      stade: (modePost === 'match' || modePost === 'resultat') ? (stade || null) : null,
      statut_change_at: statutMatch ? new Date().toISOString() : null,
      distinction_type: distinctionType === 'Autre' ? (distinctionAutre || null) : (distinctionType || null),
      laureat: laureat || null,
      distinction_note: distinctionNote || null,
      distinction_stats: distinctionStats || null,
      formation: formation || null,
      onze: formation ? onze : null,
      classement_type: classementType || null,
      classement_titre: classementTitre || null,
      classement_pays: classementType ? (classementPays || null) : null,
      classement: classementType ? classement.filter(l => l.nom) : null,
      matchs_jour: modePost === 'matchsjour' ? matchsJourSelection : null,
      resultat_details: modePost === 'resultat' && sportForm === 'football' ? { buts: resButs.filter(b=>b.joueur), rouges: resRouges.filter(c=>c.joueur), jaunes: resJaunes.filter(c=>c.joueur) } : null,
      quarts_temps: modePost === 'resultat' && sportForm === 'basketball' ? resQuarts.filter(q=>q.score1!=='' && q.score2!=='') : null,
      parcours: modePost === 'parcours' ? { equipe: pEquipe, competition: pCompetition, poule: pPoule, adversaires: pAdversaires.filter(a=>a.nom) } : null,
      declaration: modePost === 'declaration' ? { nom: dNom, fonction: dFonction, citation: dCitation, contexte: dContexte, pays: dPays.trim() } : null,
      gagnants: modePost === 'gagnants' ? { titreTirage: gTitreTirage, gagnants: gGagnants.filter(g => g.nom) } : null,
      invitation_concours: modePost === 'invitation' ? {
        titreConcours: icTitreConcours, lots: icLots, slogan: icSlogan,
        matchs: icTexteMatchs.split('\n').map(l => l.trim()).filter(Boolean).map(l => {
          const parts = l.split(/\s+-\s+|\s+vs\s+|\s+VS\s+/i).map(p => p.trim()).filter(Boolean);
          return { equipe1: parts[0] || '', equipe2: parts[1] || '' };
        }).filter(m => m.equipe1 && m.equipe2)
      } : null,
      stats_joueur: modePost === 'stats' ? { mode: statsMode === 'comparaison' ? 'comparaison' : 'performance', poste: statsPoste, nbMatchs: statsPeriodeType !== 'match' ? (statsNbMatchs || null) : null, periode: { type: statsPeriodeType, libelle: statsPeriodeLibelle.trim() }, joueurs: statsJoueurs.filter(j=>j.nom) } : null,
      sport: sportForm,
      pub_actif: pubActif || modePost === 'sponsorise',
      pub_nom: pubNom || null,
      pub_logo: pubLogo || null,
      pub_lien: pubLien || null,
      image_couverture: imageCouverture || null,
      extrait: extrait || null, contenu: contenu || null,
      slug: slugify(titre) + '-' + Date.now().toString().slice(-5),
      publie: publier, updated_at: new Date().toISOString(),
      // Envoyé seulement pour une distinction : les autres posts ne dépendent pas de cette colonne.
      ...(modePost === 'elimination' ? { elimination: { competition: elim.competition.trim(), tour: elim.tour.trim(), rencontres: elim.rencontres.filter(r => r.equipe1.trim() && r.equipe2.trim()) } } : {}),
      ...(modePost === 'onze' ? { onze_details: { categorie: onzeDetails.categorie.trim(), competition: onzeDetails.competition.trim(), periode: onzeDetails.periode.trim() } } : {}),
      ...(modePost === 'distinction' ? { distinction_details: { equipe: distEquipe.trim(), championnat: distChampionnat.trim(), periode: distPeriode.trim(), photo: distPhoto, pays: distPays.trim() } } : {})
    };
    if (editId) {
      const { error } = await supabase.from('articles').update(payload).eq('id', editId);
      setSaving(false);
      if (error) { setMessage(erreurColonneDistinction(error.message)); return; }
      setMessage('✅ Mis à jour !');
    } else {
      const { error } = await supabase.from('articles').insert(payload);
      setSaving(false);
      if (error) { setMessage(erreurColonneDistinction(error.message)); return; }
      setMessage('✅ Créé !');
    }
    chargerArticles();
    setTimeout(() => setVue('liste'), 1200);
  };

  const togglePublie = async (a: Article) => {
    await supabase.from('articles').update({ publie: !a.publie }).eq('id', a.id);
    chargerArticles();
  };

  const supprimer = async (id: string) => {
    if (!confirm('Supprimer ?')) return;
    await supabase.from('articles').delete().eq('id', id);
    chargerArticles();
  };

  const relancer = async (a: Article) => {
    await supabase.from('articles').update({ relance_at: new Date().toISOString(), publie: true }).eq('id', a.id);
    setMessage('✅ Post relancé pour 1 semaine !');
    chargerArticles();
  };

  const inputStyle = {width:'100%',padding:'12px',borderRadius:'10px',border:'1px solid #333',background:'#1e1e1e',color:'#fff',fontSize:'14px',boxSizing:'border-box' as const};
  const labelStyle = {fontSize:'12px',color:'#9ca3af',display:'block' as const,marginBottom:'6px',fontWeight:700 as const,textTransform:'uppercase' as const,letterSpacing:'0.5px'};
  const sectionStyle = {background:'#161616',border:'1px solid #2a2a2a',borderRadius:'14px',padding:'20px',marginBottom:'16px'};

  if (!connecte) {
    return <AdminAuth titre="📰 Admin Média" onAuthentifie={() => setConnecte(true)} />;
  }

  const btnChoix = (actif: boolean) => ({
    flex:1, padding:'12px', borderRadius:'10px', border:actif?'2px solid '+VIOLET:'1px solid #333',
    background:actif?'#2a1a3a':'#1e1e1e', color:actif?'#fff':'#9ca3af', cursor:'pointer', fontWeight:700, fontSize:'13px'
  });

  return (
    <div style={{minHeight:'100vh',background:'#0a0a0a',fontFamily:'sans-serif'}}>
      <header style={{background:'#111',padding:'14px 24px',display:'flex',justifyContent:'space-between',alignItems:'center',borderBottom:'1px solid #222',position:'sticky',top:0,zIndex:10}}>
        <h1 style={{color:VIOLET,fontWeight:900,fontSize:'18px',margin:0}}>📰 Admin Média</h1>
        <div style={{display:'flex',gap:'8px'}}>
          <a href="/admin" style={{background:'#2a2a2a',color:'#fff',textDecoration:'none',padding:'10px 16px',borderRadius:'999px',fontWeight:700,fontSize:'14px'}}>← Admin</a>
          <button onClick={() => setVue('liste')} style={{background:vue==='liste'?VIOLET:'#2a2a2a',color:'#fff',border:'none',padding:'10px 16px',borderRadius:'999px',fontWeight:700,fontSize:'14px',cursor:'pointer'}}>Liste</button>
          <button onClick={nouvelArticle} style={{background:vue==='editer'?VIOLET:'#2a2a2a',color:'#fff',border:'none',padding:'10px 16px',borderRadius:'999px',fontWeight:700,fontSize:'14px',cursor:'pointer'}}>+ Nouveau</button>
        </div>
      </header>

      {message && <div style={{padding:'12px 24px',background:message.includes('❌')?'#7f1d1d':'#064e3b',color:message.includes('❌')?'#fca5a5':'#6ee7b7',fontWeight:700,fontSize:'14px'}}>{message}</div>}

      <main style={{maxWidth:'760px',margin:'0 auto',padding:'24px 16px'}}>

        {vue === 'editer' && (
          <div>
            <h2 style={{color:'#fff',fontWeight:900,fontSize:'22px',marginBottom:'20px'}}>{editId ? '✏️ Modifier' : '✨ Nouveau contenu'}</h2>

            <div style={sectionStyle}>
              <label style={labelStyle}>Format</label>
              <div style={{display:'flex',gap:'8px',marginBottom:'16px'}}>
                <button onClick={() => setType('article')} style={btnChoix(type==='article')}>📄 Article (long)</button>
                <button onClick={() => setType('post')} style={btnChoix(type==='post')}>⚡ Post (bref)</button>
              </div>
              <label style={labelStyle}>Langue</label>
              <div style={{display:'flex',gap:'8px',marginBottom:'16px'}}>
                <button onClick={() => setLangue('fr')} style={btnChoix(langue==='fr')}>🇫🇷 Français</button>
                <button onClick={() => setLangue('kreyol')} style={btnChoix(langue==='kreyol')}>🇭🇹 Kreyòl</button>
              </div>
              <label style={labelStyle}>Sport</label>
              <div style={{display:'flex',gap:'8px',marginBottom: type === 'post' ? '16px' : '0'}}>
                {(['football','basketball'] as Sport[]).map(s => (
                  <button key={s} onClick={() => setSportForm(s)} style={{padding:'10px 18px',borderRadius:'999px',border:'none',cursor:'pointer',fontWeight:700,fontSize:'13px',background:sportForm===s?SPORT_COULEURS[s].primaire:'#333',color:'#fff'}}>{SPORT_LABEL[s].emoji} {SPORT_LABEL[s].nom}</button>
                ))}
              </div>

              {type === 'post' && (
                <>
                  <label style={labelStyle}>Type de post</label>
                  <select value={modePost} onChange={e => setModePost(e.target.value)} style={inputStyle}>
                    <optgroup label="Contenu">
                      <option value="simple">✍️ Simple (texte / image)</option>
                      <option value="sponsorise">📣 Sponsorisé (pub)</option>
                    </optgroup>
                    <optgroup label="Matchs">
                      <option value="match">⚽ Affiche de match</option>
                      <option value="matchsjour">📅 Matchs du jour</option>
                      <option value="resultat">📋 Résultat de match</option>
                      <option value="parcours">🧭 Parcours d'équipe</option>
                      <option value="elimination">⚔️ Élimination directe</option>
                    </optgroup>
                    <optgroup label="Stats & classements">
                      <option value="stats">📈 Stats joueur</option>
                      <option value="classement">📊 Classement</option>
                    </optgroup>
                    <optgroup label="Distinctions & citations">
                      <option value="distinction">🏆 Distinction</option>
                      <option value="declaration">🎤 Déclaration</option>
                      <option value="invitation">🏆 Invitation Concours</option>
                      <option value="gagnants">🎉 Gagnants &amp; primes</option>
                    </optgroup>
                    <optgroup label="Composition">
                      <option value="onze">👥 Onze type</option>
                    </optgroup>
                  </select>
                </>
              )}
            </div>

            <div style={sectionStyle}>
              <label style={labelStyle}>Titre *</label>
              <input value={titre} onChange={e => setTitre(e.target.value)} placeholder={type==='post'?"L'info percutante":"Titre de l'article"} style={{...inputStyle,marginBottom:'16px',fontSize:'16px',fontWeight:700}}/>
              <label style={labelStyle}>Catégorie</label>
              <select value={categorie} onChange={e => setCategorie(e.target.value)} style={inputStyle}>
                <option value="Actualités">Actualités</option>
                <option value="Revue de presse">Revue de presse</option>
                <option value="Ponctuel">Ponctuel</option>
                <option value="Classement">Classement</option>
              </select>
            </div>

            {type === 'post' && modePost === 'match' && (
              <div style={sectionStyle}>
                <label style={labelStyle}>⚽ Affiche de match</label>
                <p style={{fontSize:'11px',color:'#6b7280',margin:'0 0 14px'}}>Pour un post match. Remplissez ce que vous voulez afficher.</p>

                <button type="button" onClick={() => setPiocheMatchOuvert(v => !v)} style={{padding:'10px 18px',borderRadius:'999px',border:'none',cursor:'pointer',fontWeight:700,fontSize:'13px',background:piocheMatchOuvert?'#333':VIOLET,color:'#fff',marginBottom:'14px'}}>{piocheMatchOuvert ? '✕ Fermer la liste' : '🎯 Piocher un match existant'}</button>

                {piocheMatchOuvert && (
                  <div style={{maxHeight:'280px',overflowY:'auto',border:'1px solid #333',borderRadius:'10px',marginBottom:'20px'}}>
                    {matchsDispo.length === 0 && <p style={{color:'#6b7280',fontSize:'12px',padding:'14px'}}>Aucun match trouvé. Ajoutez-en dans "Matchs".</p>}
                    {matchsDispo.map(m => (
                      <div key={m.id} onClick={() => piocherMatch(m)} style={{padding:'10px 12px',borderBottom:'1px solid #222',cursor:'pointer'}}>
                        <div style={{color:'#fff',fontSize:'13px',fontWeight:700}}>{m.equipe1} vs {m.equipe2}</div>
                        <div style={{color:'#6b7280',fontSize:'11px'}}>{m.competition ? m.competition + ' · ' : ''}{new Date(m.date_match).toLocaleString('fr-FR', {timeZone:'America/Port-au-Prince', weekday:'short', day:'numeric', month:'short', hour:'2-digit', minute:'2-digit'})}{m.score_home !== null ? ' · ' + m.score_home + '-' + m.score_away : ''}</div>
                      </div>
                    ))}
                  </div>
                )}

                <p style={{fontSize:'11px',color:'#6b7280',margin:'0 0 6px',fontWeight:700}}>Ligue / compétition</p>
                <div style={{display:'flex',gap:'8px',marginBottom:'14px',alignItems:'center'}}>
                  <input value={ligue} onChange={e => setLigue(e.target.value)} placeholder="Ligue des Champions" style={inputStyle}/>
                  <label style={{background:'#1e1e1e',border:'1px solid #333',borderRadius:'10px',padding:'12px',cursor:'pointer',whiteSpace:'nowrap',color:'#9ca3af',fontSize:'12px',fontWeight:700}}>
                    {uploadingLogo ? '⏳' : '🖼️ Logo'}
                    <input type="file" accept="image/*" onChange={uploadLogo} style={{display:'none'}}/>
                  </label>
                </div>
                {ligueLogo && <img src={ligueLogo} alt="logo ligue" style={{height:'40px',marginBottom:'14px',borderRadius:'6px'}}/>}

                <p style={{fontSize:'11px',color:'#6b7280',margin:'0 0 6px',fontWeight:700}}>Sélections (drapeaux auto) OU équipes/clubs (noms)</p>
                <div style={{display:'flex',gap:'8px',marginBottom:'8px',alignItems:'center'}}>
                  <input value={pays1} onChange={e => setPays1(e.target.value)} placeholder="Pays 1 (ex: France)" style={inputStyle}/>
                  <span style={{color:VIOLET,fontWeight:900,fontSize:'12px'}}>VS</span>
                  <input value={pays2} onChange={e => setPays2(e.target.value)} placeholder="Pays 2 (ex: Haïti)" style={inputStyle}/>
                </div>
                <div style={{display:'flex',gap:'8px',marginBottom:'14px',alignItems:'center'}}>
                  <input value={equipe1} onChange={e => setEquipe1(e.target.value)} placeholder="OU Club 1 (ex: PSG)" style={inputStyle}/>
                  <span style={{color:VIOLET,fontWeight:900,fontSize:'12px'}}>VS</span>
                  <input value={equipe2} onChange={e => setEquipe2(e.target.value)} placeholder="OU Club 2 (ex: Real)" style={inputStyle}/>
                </div>

                <p style={{fontSize:'11px',color:'#6b7280',margin:'0 0 6px',fontWeight:700}}>Score (laisser vide si pas encore joué)</p>
                <div style={{display:'flex',gap:'8px',marginBottom:'14px',alignItems:'center',justifyContent:'center'}}>
                  <input type="number" value={score1} onChange={e => setScore1(e.target.value)} placeholder="0" style={{...inputStyle,width:'70px',textAlign:'center',fontSize:'18px',fontWeight:900}}/>
                  <span style={{color:VIOLET,fontWeight:900,fontSize:'18px'}}>-</span>
                  <input type="number" value={score2} onChange={e => setScore2(e.target.value)} placeholder="0" style={{...inputStyle,width:'70px',textAlign:'center',fontSize:'18px',fontWeight:900}}/>
                </div>

                <p style={{fontSize:'11px',color:'#6b7280',margin:'0 0 6px',fontWeight:700}}>Heure & lieu (optionnel)</p>
                <div style={{display:'flex',gap:'8px',marginBottom:'14px'}}>
                  <input value={heureMatch} onChange={e => setHeureMatch(e.target.value)} placeholder="🕐 Sam 15 août, 15:00" style={inputStyle}/>
                  <input value={stade} onChange={e => setStade(e.target.value)} placeholder="📍 Stade Santiago Bernabéu" style={inputStyle}/>
                </div>

                <p style={{fontSize:'11px',color:'#6b7280',margin:'0 0 6px',fontWeight:700}}>Statut</p>
                <div style={{display:'flex',gap:'6px',flexWrap:'wrap'}}>
                  {['', 'À venir', 'Mi-temps', 'Match terminé'].map(s => (
                    <button key={s || 'aucun'} type="button" onClick={() => setStatutMatch(s)} style={{
                      padding:'8px 14px', borderRadius:'999px', cursor:'pointer', fontSize:'12px', fontWeight:700,
                      border: statutMatch === s ? '2px solid '+VIOLET : '1px solid #333',
                      background: statutMatch === s ? VIOLET : '#1e1e1e',
                      color: statutMatch === s ? '#fff' : '#9ca3af'
                    }}>{s === '' ? 'Aucun' : s}</button>
                  ))}
                </div>
              </div>
            )}

            {type === 'post' && modePost === 'matchsjour' && (
              <div style={sectionStyle}>
                <label style={labelStyle}>📅 Matchs du jour</label>
                <p style={{fontSize:'11px',color:'#6b7280',margin:'0 0 14px'}}>Cochez les matchs à afficher sur une seule image. Les scores peuvent être ajoutés ou modifiés à tout moment en rééditant ce post.</p>

                {matchsJourSelection.length > 0 && (
                  <div style={{background:'#1e1e1e',border:'1px solid #6366f1',borderRadius:'10px',padding:'14px',marginBottom:'18px'}}>
                    <p style={{fontSize:'11px',color:'#c7d2fe',margin:'0 0 10px'}}>🎠 Plusieurs championnats sélectionnés ? Regroupe automatiquement par pays et par date, et publie un post par groupe (façon carrousel), au lieu d'un seul post avec tout mélangé.</p>
                    <button type="button" onClick={creerMatchsDuJourParGroupe} disabled={creationCarrouselEnCours} style={{padding:'10px 20px',borderRadius:'999px',border:'none',cursor:'pointer',fontWeight:700,fontSize:'13px',background:'#6366f1',color:'#fff'}}>{creationCarrouselEnCours ? '⏳ Création...' : '🎠 Créer un post par pays/date'}</button>
                  </div>
                )}

                {matchsJourSelection.length > 0 && (
                  <>
                    <p style={{fontSize:'11px',color:'#6b7280',margin:'0 0 8px',fontWeight:700}}>Sélectionnés ({matchsJourSelection.length}) — scores</p>
                    {matchsJourSelection.map(m => (
                      <div key={m.id} style={{display:'flex',gap:'8px',alignItems:'center',marginBottom:'8px',background:'#1e1e1e',border:'1px solid #333',borderRadius:'10px',padding:'10px'}}>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{color:'#fff',fontSize:'13px',fontWeight:700,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{m.equipe1} vs {m.equipe2}</div>
                          <div style={{color:'#6b7280',fontSize:'11px'}}>{m.competition ? m.competition + ' · ' : ''}{new Date(m.date_match).toLocaleString('fr-FR', {timeZone:'America/Port-au-Prince', weekday:'short', day:'numeric', month:'short', hour:'2-digit', minute:'2-digit'})}</div>
                        </div>
                        <input type="number" min={0} value={m.score1 ?? ''} onChange={e => setScoreMatchJour(m.id, 'score1', e.target.value)} placeholder="-" style={{...inputStyle,width:'52px',textAlign:'center',padding:'8px'}}/>
                        <span style={{color:'#6b7280'}}>-</span>
                        <input type="number" min={0} value={m.score2 ?? ''} onChange={e => setScoreMatchJour(m.id, 'score2', e.target.value)} placeholder="-" style={{...inputStyle,width:'52px',textAlign:'center',padding:'8px'}}/>
                        <button onClick={() => retirerMatchJour(m.id)} style={{background:'none',border:'none',color:'#ef4444',cursor:'pointer',fontSize:'16px'}}>🗑️</button>
                      </div>
                    ))}
                  </>
                )}

                <p style={{fontSize:'11px',color:'#6b7280',margin:'16px 0 8px',fontWeight:700}}>Matchs disponibles (liste admin/matchs)</p>
                <div style={{maxHeight:'320px',overflowY:'auto',border:'1px solid #333',borderRadius:'10px'}}>
                  {matchsDispo.length === 0 && <p style={{color:'#6b7280',fontSize:'12px',padding:'14px'}}>Aucun match trouvé. Ajoutez-en dans "Matchs".</p>}
                  {matchsDispo.map(m => {
                    const coche = matchsJourSelection.some(x => x.id === m.id);
                    return (
                      <label key={m.id} style={{display:'flex',alignItems:'center',gap:'10px',padding:'10px 12px',borderBottom:'1px solid #222',cursor:'pointer',background:coche?'#1e0033':'transparent'}}>
                        <input type="checkbox" checked={coche} onChange={() => toggleMatchJour(m)}/>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{color:'#fff',fontSize:'13px',fontWeight:700}}>{m.equipe1} vs {m.equipe2}</div>
                          <div style={{color:'#6b7280',fontSize:'11px'}}>{m.pays ? m.pays + ' · ' : ''}{m.competition ? m.competition + ' · ' : ''}{new Date(m.date_match).toLocaleString('fr-FR', {timeZone:'America/Port-au-Prince', weekday:'short', day:'numeric', month:'short', hour:'2-digit', minute:'2-digit'})}</div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            {type === 'post' && modePost === 'parcours' && (
              <div style={sectionStyle}>
                <label style={labelStyle}>🧭 Parcours d'équipe</label>
                <p style={{fontSize:'11px',color:'#6b7280',margin:'0 0 14px'}}>Inscrivez une équipe dans une compétition et listez ses adversaires, avec ou sans date. Fonctionne pour une phase de ligue (ex: Ligue des Champions), une poule, ou un tableau à élimination directe.</p>

                <button type="button" onClick={() => setLotParcoursOuvert(v => !v)} style={{padding:'10px 18px',borderRadius:'999px',border:'none',cursor:'pointer',fontWeight:700,fontSize:'13px',background:lotParcoursOuvert?'#333':VIOLET,color:'#fff',marginBottom:'16px'}}>{lotParcoursOuvert ? '✕ Fermer' : '📚 Coller plusieurs équipes à la fois'}</button>

                {lotParcoursOuvert && (
                  <div style={{background:'#1e1e1e',border:'1px solid #333',borderRadius:'10px',padding:'16px',marginBottom:'20px'}}>
                    <p style={{fontSize:'11px',color:'#6b7280',margin:'0 0 10px'}}>Crée et publie un post "Parcours" par équipe, en une fois. Un bloc par équipe, séparé par une ligne vide.</p>
                    <p style={{fontSize:'10px',color:'#6b7280',margin:'0 0 8px'}}>1ère ligne du bloc : "Équipe - Compétition - Poule (optionnel)". Puis une ligne par adversaire : "Adversaire - Étiquette (optionnel) - Date (optionnel) - Score (optionnel, ex: 3-1)".</p>
                    <textarea value={texteLotParcours} onChange={e => setTexteLotParcours(e.target.value)} rows={12} placeholder={"Real Madrid - Ligue des Champions - Phase ligue\nManchester City - J1 - 18 sept. - 3-1\nJuventus - J2 - 1 oct.\n\nBarcelone - Ligue des Champions - Phase ligue\nPSG - J1 - 17 sept.\nBayern Munich - J2 - 30 sept. - 2-2"} style={{...inputStyle,marginBottom:'10px',fontFamily:'monospace',fontSize:'13px'}}/>
                    <button type="button" onClick={creerParcoursEnLot} disabled={importLotParcours} style={{padding:'10px 20px',borderRadius:'999px',border:'none',cursor:'pointer',fontWeight:700,fontSize:'13px',background:VIOLET,color:'#fff'}}>{importLotParcours ? '⏳ Création...' : '🚀 Créer tous les parcours'}</button>
                  </div>
                )}

                <p style={{fontSize:'11px',color:'#6b7280',margin:'0 0 6px',fontWeight:700}}>Ou coller le texte pour une seule équipe (remplit le formulaire ci-dessous)</p>
                <textarea value={pTexteColle} onChange={e => setPTexteColle(e.target.value)} rows={6} placeholder={"Real Madrid - Ligue des Champions - Phase ligue\nManchester City - J1 - 18 sept. - 3-1\nJuventus - J2 - 1 oct."} style={{...inputStyle,marginBottom:'10px',fontFamily:'monospace',fontSize:'13px'}}/>
                <button type="button" onClick={analyserParcours} style={{padding:'10px 20px',borderRadius:'999px',border:'none',cursor:'pointer',fontWeight:700,fontSize:'13px',background:VIOLET,color:'#fff',marginBottom:'20px'}}>🔍 Analyser le texte</button>

                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px',marginBottom:'8px'}}>
                  <input value={pEquipe} onChange={e => setPEquipe(e.target.value)} placeholder="Équipe (ex: Real Madrid)" style={inputStyle}/>
                  <input value={pCompetition} onChange={e => setPCompetition(e.target.value)} placeholder="Compétition (ex: Ligue des Champions)" style={inputStyle}/>
                </div>
                <input value={pPoule} onChange={e => setPPoule(e.target.value)} placeholder="Poule / Groupe (optionnel, ex: Phase ligue)" style={{...inputStyle,marginBottom:'20px'}}/>

                <p style={{fontSize:'11px',color:'#6b7280',margin:'0 0 8px',fontWeight:700}}>Adversaires ({pAdversaires.length})</p>
                {pAdversaires.map((a, i) => (
                  <div key={i} style={{background:'#1e1e1e',border:'1px solid #333',borderRadius:'10px',padding:'12px',marginBottom:'10px'}}>
                    <div style={{display:'flex',gap:'6px',marginBottom:'8px'}}>
                      <input value={a.nom} onChange={e => modifierAdversaire(i,'nom',e.target.value)} placeholder="Nom de l'adversaire" style={{...inputStyle,flex:2,padding:'8px'}}/>
                      <input value={a.label} onChange={e => modifierAdversaire(i,'label',e.target.value)} placeholder="Étiquette (J1, Quart...)" style={{...inputStyle,flex:1.3,padding:'8px'}}/>
                      <button onClick={() => retirerAdversaire(i)} style={{background:'none',border:'none',color:'#ef4444',cursor:'pointer',fontSize:'15px'}}>🗑️</button>
                    </div>
                    <div style={{display:'flex',gap:'6px'}}>
                      <input value={a.date} onChange={e => modifierAdversaire(i,'date',e.target.value)} placeholder="Date (optionnel, ex: 18 sept.)" style={{...inputStyle,flex:1.6,padding:'8px'}}/>
                      <input value={a.scoreEquipe} onChange={e => modifierAdversaire(i,'scoreEquipe',e.target.value)} placeholder="Score" style={{...inputStyle,width:'55px',padding:'8px',textAlign:'center'}}/>
                      <span style={{color:'#6b7280',alignSelf:'center'}}>-</span>
                      <input value={a.scoreAdversaire} onChange={e => modifierAdversaire(i,'scoreAdversaire',e.target.value)} placeholder="Score" style={{...inputStyle,width:'55px',padding:'8px',textAlign:'center'}}/>
                    </div>
                  </div>
                ))}
                <button type="button" onClick={ajouterAdversaire} style={{padding:'8px 16px',borderRadius:'999px',border:'1px dashed #555',background:'transparent',color:'#9ca3af',cursor:'pointer',fontSize:'12px',fontWeight:700}}>+ Ajouter un adversaire</button>
              </div>
            )}

            {type === 'post' && modePost === 'invitation' && (
              <div style={sectionStyle}>
                <label style={labelStyle}>🏆 Invitation Concours</label>
                <p style={{fontSize:'11px',color:'#6b7280',margin:'0 0 14px'}}>Affiche les matchs comme des cartes de vote (Équipe A vs Équipe B), en créole, pour donner envie de participer.</p>

                <input value={icTitreConcours} onChange={e => setIcTitreConcours(e.target.value)} placeholder="Titre du concours (ex: Chocs)" style={{...inputStyle,marginBottom:'12px'}}/>
                <input value={icLots} onChange={e => setIcLots(e.target.value)} placeholder="Lots (ex: 10 000 Gourdes, tablettes, Netflix)" style={{...inputStyle,marginBottom:'12px'}}/>
                <input value={icSlogan} onChange={e => setIcSlogan(e.target.value)} placeholder="Slogan" style={{...inputStyle,marginBottom:'12px',fontWeight:700}}/>
                <p style={{fontSize:'11px',color:'#6b7280',margin:'0 0 6px',fontWeight:700}}>Matchs à afficher (un par ligne : Équipe1 - Équipe2)</p>
                <textarea value={icTexteMatchs} onChange={e => setIcTexteMatchs(e.target.value)} rows={7} placeholder={"Juventus - AC Milan\nFC Barcelone - Valencia\nArsenal - Chelsea\nMarseille - Paris FC\nMarítimo - Benfica\nReal Madrid - Inter Milan"} style={{...inputStyle,fontFamily:'monospace',fontSize:'13px'}}/>
              </div>
            )}

            {type === 'post' && modePost === 'declaration' && (
              <div style={sectionStyle}>
                <label style={labelStyle}>🎤 Déclaration</label>
                <p style={{fontSize:'11px',color:'#6b7280',margin:'0 0 14px'}}>Pour une citation d'un joueur, entraîneur ou toute autre personnalité.</p>

                <button type="button" onClick={() => setLotDeclarationsOuvert(v => !v)} style={{padding:'10px 18px',borderRadius:'999px',border:'none',cursor:'pointer',fontWeight:700,fontSize:'13px',background:lotDeclarationsOuvert?'#333':VIOLET,color:'#fff',marginBottom:'16px'}}>{lotDeclarationsOuvert ? '✕ Fermer' : '📚 Coller plusieurs déclarations à la fois'}</button>

                {lotDeclarationsOuvert && (
                  <div style={{background:'#1e1e1e',border:'1px solid #333',borderRadius:'10px',padding:'16px',marginBottom:'20px'}}>
                    <p style={{fontSize:'11px',color:'#6b7280',margin:'0 0 10px'}}>Crée et publie un post par déclaration, en une fois. Séparez chaque déclaration par une ligne "---".</p>
                    <textarea value={texteLotDeclarations} onChange={e => setTexteLotDeclarations(e.target.value)} rows={12} placeholder={"Carlo Ancelotti - Entraîneur du Real Madrid - Conférence d'après-tirage\n\nOn savait que ce tirage serait exigeant, mais cette équipe a l'habitude de répondre présent.\n---\nXabi Alonso - Entraîneur du Bayern Munich\n\nNous avons un groupe difficile mais très motivant."} style={{...inputStyle,marginBottom:'10px',fontFamily:'monospace',fontSize:'13px'}}/>
                    <button type="button" onClick={creerDeclarationsEnLot} disabled={importLotDeclarations} style={{padding:'10px 20px',borderRadius:'999px',border:'none',cursor:'pointer',fontWeight:700,fontSize:'13px',background:VIOLET,color:'#fff'}}>{importLotDeclarations ? '⏳ Création...' : '🚀 Créer toutes les déclarations'}</button>
                  </div>
                )}

                <p style={{fontSize:'11px',color:'#6b7280',margin:'0 0 6px',fontWeight:700}}>Ou coller le texte pour une seule déclaration (remplit le formulaire ci-dessous)</p>
                <textarea value={dTexteColle} onChange={e => setDTexteColle(e.target.value)} rows={5} placeholder={"Carlo Ancelotti - Entraîneur du Real Madrid - Conférence d'après-tirage\n\nOn savait que ce tirage serait exigeant, mais cette équipe a l'habitude de répondre présent."} style={{...inputStyle,marginBottom:'10px',fontFamily:'monospace',fontSize:'13px'}}/>
                <button type="button" onClick={analyserDeclaration} style={{padding:'10px 20px',borderRadius:'999px',border:'none',cursor:'pointer',fontWeight:700,fontSize:'13px',background:VIOLET,color:'#fff',marginBottom:'20px'}}>🔍 Analyser le texte</button>

                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px',marginBottom:'14px'}}>
                  <input value={dNom} onChange={e => setDNom(e.target.value)} placeholder="Nom (ex: Carlo Ancelotti)" style={inputStyle}/>
                  <input value={dFonction} onChange={e => setDFonction(e.target.value)} placeholder="Fonction (ex: Entraîneur du Real Madrid)" style={inputStyle}/>
                  <input list="liste-pays" value={dPays} onChange={e => setDPays(e.target.value)} placeholder="Pays (drapeau, optionnel)" style={inputStyle}/>
                </div>
                <textarea value={dCitation} onChange={e => setDCitation(e.target.value)} rows={5} placeholder="Le texte de la déclaration, entre guillemets ou non..." style={{...inputStyle,marginBottom:'14px',lineHeight:'1.5'}}/>
                <input value={dContexte} onChange={e => setDContexte(e.target.value)} placeholder="Contexte (optionnel, ex: Conférence d'avant-match)" style={inputStyle}/>
              </div>
            )}

            {type === 'post' && modePost === 'gagnants' && (
              <div style={sectionStyle}>
                <label style={labelStyle}>🎉 Gagnants &amp; primes</label>
                <p style={{fontSize:'11px',color:'#6b7280',margin:'0 0 14px'}}>Pour annoncer les gagnants d'un tirage au sort (Question Éclair, FootQuizz, Concours...) avec leurs lots. Le tirage lui-même reste toujours privé : ce post n'est publié que si vous choisissez de le faire.</p>
                <input value={gTitreTirage} onChange={e => setGTitreTirage(e.target.value)} placeholder="Titre (ex: Gagnants du FootQuizz de la semaine)" style={{...inputStyle,marginBottom:'14px'}}/>
                <p style={{fontSize:'11px',color:'#6b7280',margin:'0 0 8px',fontWeight:700}}>Gagnants ({gGagnants.length})</p>
                {gGagnants.map((g, i) => (
                  <div key={i} style={{display:'flex',gap:'8px',marginBottom:'8px',alignItems:'center'}}>
                    <input value={g.nom} onChange={e => modifierGagnant(i,'nom',e.target.value)} placeholder="Nom du gagnant" style={{...inputStyle,flex:2,padding:'8px'}}/>
                    <input value={g.prix} onChange={e => modifierGagnant(i,'prix',e.target.value)} placeholder="Prime / lot (ex: 500 Gourdes)" style={{...inputStyle,flex:1.5,padding:'8px'}}/>
                    <button onClick={() => retirerGagnant(i)} style={{background:'none',border:'none',color:'#ef4444',cursor:'pointer',fontSize:'15px'}}>🗑️</button>
                  </div>
                ))}
                <button type="button" onClick={ajouterGagnant} style={{padding:'8px 16px',borderRadius:'999px',border:'1px dashed #555',background:'transparent',color:'#9ca3af',cursor:'pointer',fontSize:'12px',fontWeight:700}}>+ Ajouter un gagnant</button>
              </div>
            )}

            {type === 'post' && modePost === 'resultat' && sportForm === 'football' && (
              <div style={sectionStyle}>
                <label style={labelStyle}>📋 Résultat de match</label>
                <p style={{fontSize:'11px',color:'#6b7280',margin:'0 0 12px'}}>Collez le résultat au format : première ligne "Equipe1 3 - 1 Equipe2", puis des sections "Buts Equipe1" / "Rouges" / "Jaunes" (optionnel) suivies d'une ligne par joueur "Nom minute (passeur)".</p>

                <button type="button" onClick={() => setLotResultatsOuvert(v => !v)} style={{padding:'10px 18px',borderRadius:'999px',border:'none',cursor:'pointer',fontWeight:700,fontSize:'13px',background:lotResultatsOuvert?'#333':VIOLET,color:'#fff',marginBottom:'16px'}}>{lotResultatsOuvert ? '✕ Fermer' : '📚 Coller plusieurs résultats à la fois'}</button>

                {lotResultatsOuvert && (
                  <div style={{background:'#1e1e1e',border:'1px solid #333',borderRadius:'10px',padding:'16px',marginBottom:'20px'}}>
                    <p style={{fontSize:'11px',color:'#6b7280',margin:'0 0 10px'}}>Crée et publie un post par résultat, en une fois. Séparez chaque résultat par une ligne "---".</p>
                    <textarea value={texteLotResultats} onChange={e => setTexteLotResultats(e.target.value)} rows={14} placeholder={"Real Madrid 3 - 1 Barcelone\n\nButs Real Madrid\nMbappé 23 (Valverde)\nVinicius 67\n\nButs Barcelone\nLewandowski 55\n---\nPSG 2 - 0 Monaco\n\nButs PSG\nMbappé 10 (Hakimi)\nDembélé 67"} style={{...inputStyle,marginBottom:'10px',fontFamily:'monospace',fontSize:'13px'}}/>
                    <button type="button" onClick={creerResultatsEnLot} disabled={importLotResultats} style={{padding:'10px 20px',borderRadius:'999px',border:'none',cursor:'pointer',fontWeight:700,fontSize:'13px',background:VIOLET,color:'#fff'}}>{importLotResultats ? '⏳ Création...' : '🚀 Créer tous les résultats'}</button>
                  </div>
                )}

                <p style={{fontSize:'11px',color:'#6b7280',margin:'0 0 6px',fontWeight:700}}>Ou coller le texte pour un seul résultat (remplit le formulaire ci-dessous)</p>
                <textarea value={resTexteColle} onChange={e => setResTexteColle(e.target.value)} placeholder={"Real Madrid 3 - 1 Barcelone\n\nButs Real Madrid\nMbappé 23 (Valverde)\nVinicius 67\n\nButs Barcelone\nLewandowski 55\n\nRouges\nAraújo 80"} rows={10} style={{...inputStyle,marginBottom:'10px',fontFamily:'monospace',fontSize:'13px'}}/>
                <button type="button" onClick={analyserResultat} style={{padding:'10px 20px',borderRadius:'999px',border:'none',cursor:'pointer',fontWeight:700,fontSize:'13px',background:VIOLET,color:'#fff',marginBottom:'18px'}}>🔍 Analyser le texte</button>

                <p style={{fontSize:'11px',color:'#6b7280',margin:'0 0 6px',fontWeight:700}}>Score (vérifiez / corrigez)</p>
                <div style={{display:'flex',gap:'8px',alignItems:'center',marginBottom:'18px'}}>
                  <input value={equipe1} onChange={e => setEquipe1(e.target.value)} placeholder="Équipe 1" style={{...inputStyle,flex:2}}/>
                  <input type="number" value={score1} onChange={e => setScore1(e.target.value)} style={{...inputStyle,width:'50px',textAlign:'center'}}/>
                  <span style={{color:'#6b7280'}}>-</span>
                  <input type="number" value={score2} onChange={e => setScore2(e.target.value)} style={{...inputStyle,width:'50px',textAlign:'center'}}/>
                  <input value={equipe2} onChange={e => setEquipe2(e.target.value)} placeholder="Équipe 2" style={{...inputStyle,flex:2}}/>
                </div>
                <div style={{display:'flex',gap:'8px',marginBottom:'18px'}}>
                  <input value={heureMatch} onChange={e => setHeureMatch(e.target.value)} placeholder="🕐 Sam 15 août, 15:00" style={inputStyle}/>
                  <input value={stade} onChange={e => setStade(e.target.value)} placeholder="📍 Stade" style={inputStyle}/>
                </div>

                <p style={{fontSize:'11px',color:'#6b7280',margin:'0 0 8px',fontWeight:700}}>⚽ Buts ({resButs.length})</p>
                {resButs.map((b, i) => (
                  <div key={i} style={{display:'flex',gap:'6px',marginBottom:'6px',alignItems:'center'}}>
                    <input value={b.equipe} onChange={e => modifierBut(i,'equipe',e.target.value)} placeholder="Équipe" style={{...inputStyle,flex:1.3,padding:'8px'}}/>
                    <input value={b.joueur} onChange={e => modifierBut(i,'joueur',e.target.value)} placeholder="Buteur" style={{...inputStyle,flex:1.5,padding:'8px'}}/>
                    <input value={b.minute} onChange={e => modifierBut(i,'minute',e.target.value)} placeholder="Min" style={{...inputStyle,width:'50px',padding:'8px',textAlign:'center'}}/>
                    <input value={b.passeur} onChange={e => modifierBut(i,'passeur',e.target.value)} placeholder="Passeur (optionnel)" style={{...inputStyle,flex:1.5,padding:'8px'}}/>
                    <button onClick={() => retirerBut(i)} style={{background:'none',border:'none',color:'#ef4444',cursor:'pointer',fontSize:'15px'}}>🗑️</button>
                  </div>
                ))}
                <button type="button" onClick={ajouterBut} style={{marginBottom:'18px',padding:'6px 14px',borderRadius:'999px',border:'1px dashed #555',background:'transparent',color:'#9ca3af',cursor:'pointer',fontSize:'11px',fontWeight:700}}>+ Ajouter un but</button>

                <p style={{fontSize:'11px',color:'#6b7280',margin:'0 0 8px',fontWeight:700}}>🟥 Cartons rouges ({resRouges.length})</p>
                {resRouges.map((c, i) => (
                  <div key={i} style={{display:'flex',gap:'6px',marginBottom:'6px',alignItems:'center'}}>
                    <input value={c.joueur} onChange={e => modifierCarte('rouges',i,'joueur',e.target.value)} placeholder="Joueur" style={{...inputStyle,flex:1,padding:'8px'}}/>
                    <input value={c.minute} onChange={e => modifierCarte('rouges',i,'minute',e.target.value)} placeholder="Min" style={{...inputStyle,width:'50px',padding:'8px',textAlign:'center'}}/>
                    <button onClick={() => retirerCarte('rouges',i)} style={{background:'none',border:'none',color:'#ef4444',cursor:'pointer',fontSize:'15px'}}>🗑️</button>
                  </div>
                ))}
                <button type="button" onClick={() => ajouterCarte('rouges')} style={{marginBottom:'18px',padding:'6px 14px',borderRadius:'999px',border:'1px dashed #555',background:'transparent',color:'#9ca3af',cursor:'pointer',fontSize:'11px',fontWeight:700}}>+ Ajouter un rouge</button>

                <p style={{fontSize:'11px',color:'#6b7280',margin:'0 0 8px',fontWeight:700}}>🟨 Cartons jaunes ({resJaunes.length})</p>
                {resJaunes.map((c, i) => (
                  <div key={i} style={{display:'flex',gap:'6px',marginBottom:'6px',alignItems:'center'}}>
                    <input value={c.joueur} onChange={e => modifierCarte('jaunes',i,'joueur',e.target.value)} placeholder="Joueur" style={{...inputStyle,flex:1,padding:'8px'}}/>
                    <input value={c.minute} onChange={e => modifierCarte('jaunes',i,'minute',e.target.value)} placeholder="Min" style={{...inputStyle,width:'50px',padding:'8px',textAlign:'center'}}/>
                    <button onClick={() => retirerCarte('jaunes',i)} style={{background:'none',border:'none',color:'#ef4444',cursor:'pointer',fontSize:'15px'}}>🗑️</button>
                  </div>
                ))}
                <button type="button" onClick={() => ajouterCarte('jaunes')} style={{padding:'6px 14px',borderRadius:'999px',border:'1px dashed #555',background:'transparent',color:'#9ca3af',cursor:'pointer',fontSize:'11px',fontWeight:700}}>+ Ajouter un jaune</button>
              </div>
            )}

            {type === 'post' && modePost === 'resultat' && sportForm === 'basketball' && (
              <div style={sectionStyle}>
                <label style={labelStyle}>📋 Résultat de match</label>
                <p style={{fontSize:'11px',color:'#6b7280',margin:'0 0 12px'}}>Collez le résultat au format : première ligne "Equipe1 102 - 98 Equipe2", puis une ligne par quart-temps "Q1 28-22" (Q1 à Q4, OT pour prolongation).</p>
                <textarea value={resTexteColle} onChange={e => setResTexteColle(e.target.value)} placeholder={"Lakers 102 - 98 Celtics\n\nQ1 28-22\nQ2 24-26\nQ3 25-24\nQ4 25-26"} rows={9} style={{...inputStyle,marginBottom:'10px',fontFamily:'monospace',fontSize:'13px'}}/>
                <button type="button" onClick={analyserResultatBasket} style={{padding:'10px 20px',borderRadius:'999px',border:'none',cursor:'pointer',fontWeight:700,fontSize:'13px',background:SPORT_COULEURS.basketball.primaire,color:'#fff',marginBottom:'18px'}}>🔍 Analyser le texte</button>

                <p style={{fontSize:'11px',color:'#6b7280',margin:'0 0 6px',fontWeight:700}}>Score final (vérifiez / corrigez)</p>
                <div style={{display:'flex',gap:'8px',alignItems:'center',marginBottom:'18px'}}>
                  <input value={equipe1} onChange={e => setEquipe1(e.target.value)} placeholder="Équipe 1" style={{...inputStyle,flex:2}}/>
                  <input type="number" value={score1} onChange={e => setScore1(e.target.value)} style={{...inputStyle,width:'55px',textAlign:'center'}}/>
                  <span style={{color:'#6b7280'}}>-</span>
                  <input type="number" value={score2} onChange={e => setScore2(e.target.value)} style={{...inputStyle,width:'55px',textAlign:'center'}}/>
                  <input value={equipe2} onChange={e => setEquipe2(e.target.value)} placeholder="Équipe 2" style={{...inputStyle,flex:2}}/>
                </div>
                <div style={{display:'flex',gap:'8px',marginBottom:'18px'}}>
                  <input value={heureMatch} onChange={e => setHeureMatch(e.target.value)} placeholder="🕐 Sam 15 août, 19:00" style={inputStyle}/>
                  <input value={stade} onChange={e => setStade(e.target.value)} placeholder="📍 Salle" style={inputStyle}/>
                </div>

                <p style={{fontSize:'11px',color:'#6b7280',margin:'0 0 8px',fontWeight:700}}>🏀 Quarts-temps ({resQuarts.length})</p>
                {resQuarts.map((q, i) => (
                  <div key={i} style={{display:'flex',gap:'6px',marginBottom:'6px',alignItems:'center'}}>
                    <input value={q.quart} onChange={e => modifierQuart(i,'quart',e.target.value)} placeholder="Q1" style={{...inputStyle,width:'60px',padding:'8px',textAlign:'center'}}/>
                    <input value={q.score1} onChange={e => modifierQuart(i,'score1',e.target.value)} placeholder="0" style={{...inputStyle,width:'55px',padding:'8px',textAlign:'center'}}/>
                    <span style={{color:'#6b7280'}}>-</span>
                    <input value={q.score2} onChange={e => modifierQuart(i,'score2',e.target.value)} placeholder="0" style={{...inputStyle,width:'55px',padding:'8px',textAlign:'center'}}/>
                    <button onClick={() => retirerQuart(i)} style={{background:'none',border:'none',color:'#ef4444',cursor:'pointer',fontSize:'15px'}}>🗑️</button>
                  </div>
                ))}
                <button type="button" onClick={ajouterQuart} style={{padding:'6px 14px',borderRadius:'999px',border:'1px dashed #555',background:'transparent',color:'#9ca3af',cursor:'pointer',fontSize:'11px',fontWeight:700}}>+ Ajouter une période</button>
              </div>
            )}

            {type === 'post' && modePost === 'stats' && (
              <div style={sectionStyle}>
                <label style={labelStyle}>📈 Stats joueur</label>
                <p style={{fontSize:'11px',color:'#6b7280',margin:'0 0 14px'}}>Un joueur ou une comparaison, sur un match, une journée, un mois, un trimestre ou une saison.</p>

                <div style={{display:'flex',gap:'8px',marginBottom:'14px',flexWrap:'wrap'}}>
                  <button type="button" onClick={() => setStatsMode('performance')} style={btnChoix(statsMode==='performance')}>👤 Performance</button>
                  <button type="button" onClick={() => { setStatsMode('comparaison'); if (statsJoueurs.length < 2) setStatsJoueurs([{nom:'',equipe:'',adversaire:'',valeurs:{}},{nom:'',equipe:'',adversaire:'',valeurs:{}}]); }} style={btnChoix(statsMode==='comparaison')}>⚖️ Comparaison</button>
                </div>

                <div style={{display:'flex',gap:'8px',marginBottom:'14px',flexWrap:'wrap'}}>
                  {sportForm === 'football' ? (
                    <>
                      {(Object.keys(POSTES_LABELS) as StatsPoste[]).map(p => (
                        <button key={p} type="button" onClick={() => setStatsPoste(p)} style={btnChoix(statsPoste===p)}>{POSTES_LABELS[p]}</button>
                      ))}
                    </>
                  ) : (
                    <span style={{fontSize:'12px',color:'#6b7280',fontWeight:700}}>🏀 Champs basketball (Points, Rebonds, Passes...)</span>
                  )}
                </div>

                <p style={{fontSize:'11px',color:'#6b7280',margin:'0 0 6px',fontWeight:700}}>📋 Coller un texte (optionnel)</p>
                <p style={{fontSize:'10px',color:'#6b7280',margin:'0 0 8px'}}>Un joueur par bloc (ligne vide entre 2 joueurs pour une comparaison). 1ère ligne : "Joueur - Son équipe - Adversaire" (pour un mois, une saison, etc. l'adversaire est inutile : "Joueur - Son équipe"). Puis une ligne par stat : "Label: valeur". Les stats non remplies n'apparaissent pas dans le post.</p>
                <textarea value={statsTexteColle} onChange={e => setStatsTexteColle(e.target.value)} rows={7} placeholder={sportForm==='football' ? "Wilson Isidor - Haïti - Trinidad-et-Tobago\nMinutes jouées: 90\nButs: 1\nPasses décisives: 2\nRécupérations: 4\n\nAlex Christian - Haïti - Trinidad-et-Tobago\nTacles réussis: 4\nInterceptions: 3\nPasses clés: 2\nTirs cadrés: 1" : "LeBron James - Lakers - Warriors\nPoints: 28\nRebonds: 9\nPasses décisives: 7"} style={{...inputStyle,marginBottom:'10px',fontFamily:'monospace',fontSize:'13px'}}/>
                <button type="button" onClick={analyserStats} style={{padding:'10px 20px',borderRadius:'999px',border:'none',cursor:'pointer',fontWeight:700,fontSize:'13px',background:SPORT_COULEURS[sportForm].primaire,color:'#fff',marginBottom:'20px'}}>🔍 Analyser le texte</button>

                <p style={{fontSize:'11px',color:'#6b7280',margin:'0 0 6px',fontWeight:700}}>🗓️ Période couverte par ces stats</p>
                <div style={{display:'flex',gap:'8px',marginBottom:'10px',flexWrap:'wrap'}}>
                  {PERIODES.map(pe => (
                    <button key={pe.type} type="button" onClick={() => setStatsPeriodeType(pe.type)} style={btnChoix(statsPeriodeType===pe.type)}>{pe.label}</button>
                  ))}
                </div>
                <div style={{display:'flex',gap:'8px',marginBottom:'16px',flexWrap:'wrap'}}>
                  <input value={statsPeriodeLibelle} onChange={e => setStatsPeriodeLibelle(e.target.value)} placeholder={PERIODES.find(pe => pe.type === statsPeriodeType)?.placeholder} style={{...inputStyle,flex:2,minWidth:'180px'}}/>
                  {statsPeriodeType !== 'match' && (
                    <input value={statsNbMatchs} onChange={e => setStatsNbMatchs(e.target.value)} placeholder="Nb de matchs (optionnel)" style={{...inputStyle,flex:1,minWidth:'140px'}}/>
                  )}
                </div>
                {libellePeriode({ type: statsPeriodeType, libelle: statsPeriodeLibelle }, statsNbMatchs) && (
                  <p style={{fontSize:'11px',color:SPORT_COULEURS[sportForm].primaire,margin:'-8px 0 16px',fontWeight:700}}>Sur le post : {libellePeriode({ type: statsPeriodeType, libelle: statsPeriodeLibelle }, statsNbMatchs)}</p>
                )}

                {statsJoueurs.map((j, i) => (
                  <div key={i} style={{background:'#1e1e1e',border:'1px solid #333',borderRadius:'10px',padding:'14px',marginBottom:'12px'}}>
                    <div style={{display:'flex',gap:'12px',marginBottom:'12px',alignItems:'center'}}>
                      {j.photo ? (
                        <img src={j.photo} alt="" style={{width:'56px',height:'56px',borderRadius:'50%',objectFit:'cover',objectPosition:'center top',border:'2px solid '+SPORT_COULEURS[sportForm].primaire}}/>
                      ) : (
                        <div style={{width:'56px',height:'56px',borderRadius:'50%',background:'#2a2a2a',border:'2px dashed #555',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'22px'}}>👤</div>
                      )}
                      <label style={{padding:'8px 14px',borderRadius:'999px',border:'1px dashed #555',color:'#9ca3af',cursor:'pointer',fontSize:'12px',fontWeight:700}}>
                        {uploadingJoueur === i ? '⏳ Envoi...' : (j.photo ? '📷 Changer la photo' : '📷 Ajouter la photo du joueur')}
                        <input type="file" accept="image/*" onChange={e => uploadPhotoJoueur(i, e)} style={{display:'none'}}/>
                      </label>
                      {j.photo && (
                        <button type="button" onClick={() => modifierJoueurStats(i,'photo','')} style={{background:'none',border:'none',color:'#ef4444',cursor:'pointer',fontSize:'12px',fontWeight:700}}>Retirer</button>
                      )}
                    </div>
                    <div style={{display:'flex',gap:'8px',marginBottom:'12px',alignItems:'center'}}>
                      <input value={j.nom} onChange={e => modifierJoueurStats(i,'nom',e.target.value)} placeholder="Nom du joueur" style={{...inputStyle,flex:1.3}}/>
                      <input value={j.equipe} onChange={e => modifierJoueurStats(i,'equipe',e.target.value)} placeholder="Son équipe" style={{...inputStyle,flex:1}}/>
                      <input value={j.adversaire} onChange={e => modifierJoueurStats(i,'adversaire',e.target.value)} placeholder="Face à (adversaire)" style={{...inputStyle,flex:1}}/>
                      <input list="liste-pays" value={j.pays || ''} onChange={e => modifierJoueurStats(i,'pays',e.target.value)} placeholder="Pays 🏳️" style={{...inputStyle,flex:0.8}}/>
                      {statsMode === 'comparaison' && statsJoueurs.length > 2 && (
                        <button onClick={() => retirerJoueurStats(i)} style={{background:'none',border:'none',color:'#ef4444',cursor:'pointer',fontSize:'16px'}}>🗑️</button>
                      )}
                    </div>
                    {(sportForm === 'football' ? groupesFootball(statsPoste) : [{ titre: '', champs: CHAMPS_STATS_BASKET }])
                      .filter(gr => gr.titre !== 'Autres statistiques' || gr.champs.some(c => statsJoueurs.some(sj => sj.valeurs[c.cle])))
                      .map((gr, gi) => (
                      <details key={gr.titre + gi} open={gi < 2 || gr.champs.some(c => j.valeurs[c.cle])} style={{marginBottom:'10px'}}>
                        {gr.titre && <summary style={{cursor:'pointer',fontSize:'12px',fontWeight:800,color:SPORT_COULEURS[sportForm].primaire,margin:'0 0 8px',listStyle:'revert'}}>{gr.titre} ({gr.champs.filter(c => j.valeurs[c.cle]).length}/{gr.champs.length})</summary>}
                        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px',marginTop:'8px'}}>
                          {gr.champs.map(c => (
                            <div key={c.cle}>
                              <p style={{fontSize:'10px',color:'#6b7280',margin:'0 0 4px'}}>{c.label}</p>
                              <input value={j.valeurs[c.cle] || ''} onChange={e => modifierValeurStats(i,c.cle,e.target.value)} style={{...inputStyle,padding:'8px'}}/>
                            </div>
                          ))}
                        </div>
                      </details>
                    ))}
                  </div>
                ))}
                {statsMode === 'comparaison' && statsJoueurs.length < 6 && (
                  <button type="button" onClick={ajouterJoueurStats} style={{padding:'8px 16px',borderRadius:'999px',border:'1px dashed #555',background:'transparent',color:'#9ca3af',cursor:'pointer',fontSize:'12px',fontWeight:700}}>+ Ajouter un joueur ({statsJoueurs.length}/6)</button>
                )}
              </div>
            )}

            {type === 'post' && modePost === 'distinction' && (
              <div style={sectionStyle}>
                <label style={labelStyle}>🏆 Distinction</label>
                <p style={{fontSize:'11px',color:'#6b7280',margin:'0 0 12px'}}>Pour un post récompense : joueur du mois, équipe de la semaine...</p>

                <button type="button" onClick={() => setLotDistinctionsOuvert(v => !v)} style={{padding:'10px 18px',borderRadius:'999px',border:'none',cursor:'pointer',fontWeight:700,fontSize:'13px',background:lotDistinctionsOuvert?'#333':VIOLET,color:'#fff',marginBottom:'16px'}}>{lotDistinctionsOuvert ? '✕ Fermer' : '📚 Coller plusieurs distinctions à la fois'}</button>

                {lotDistinctionsOuvert && (
                  <div style={{background:'#1e1e1e',border:'1px solid #333',borderRadius:'10px',padding:'16px',marginBottom:'20px'}}>
                    <p style={{fontSize:'11px',color:'#6b7280',margin:'0 0 6px'}}>Crée et publie un post par distinction. Un bloc par distinction, séparés par une ligne vide.</p>
                    <p style={{fontSize:'10px',color:'#6b7280',margin:'0 0 10px'}}>1ère ligne : "Catégorie - Lauréat - Équipe - Championnat - Période". Ligne 2 (optionnelle) : les chiffres. Ligne 3 (optionnelle) : la note. Pour une distinction d'équipe, le lauréat est l'équipe : "Équipe du mois - Arsenal - Premier League - Septembre 2026". Les photos s'ajoutent ensuite en modifiant le post.</p>
                    <textarea value={texteLotDistinctions} onChange={e => setTexteLotDistinctions(e.target.value)} rows={12} placeholder={"Joueur du mois - Wilson Isidor - Haïti - Ligue 2 - Septembre 2026\n4 buts, 2 passes décisives\nAuteur de 4 buts en 5 matchs.\n\nEntraîneur du mois - Mikel Arteta - Arsenal - Premier League - Septembre 2026\n\nÉquipe du mois - Arsenal - Premier League - Septembre 2026"} style={{...inputStyle,marginBottom:'10px',fontFamily:'monospace',fontSize:'13px'}}/>
                    <button type="button" onClick={creerDistinctionsEnLot} disabled={importLotDistinctions} style={{padding:'10px 20px',borderRadius:'999px',border:'none',cursor:'pointer',fontWeight:700,fontSize:'13px',background:VIOLET,color:'#fff'}}>{importLotDistinctions ? '⏳ Création...' : '🚀 Créer toutes les distinctions'}</button>
                  </div>
                )}

                <p style={{fontSize:'11px',color:'#6b7280',margin:'0 0 6px',fontWeight:700}}>Type de distinction</p>
                <select value={distinctionType} onChange={e => setDistinctionType(e.target.value)} style={{...inputStyle,marginBottom:'12px'}}>
                  <option value="">— Aucune —</option>
                  {GROUPES_DISTINCTIONS.map(g => (
                    <optgroup key={g.titre} label={g.titre}>
                      {g.items.map(d => <option key={d} value={d}>{d}</option>)}
                    </optgroup>
                  ))}
                  <option value="Autre">✏️ Autre (à écrire)</option>
                </select>

                {distinctionType === 'Autre' && (
                  <input value={distinctionAutre} onChange={e => setDistinctionAutre(e.target.value)} placeholder="Votre distinction (ex: Meilleur gardien de la CAN)" style={{...inputStyle,marginBottom:'12px'}}/>
                )}

                {distinctionType && (
                  <>
                    <div style={{display:'flex',gap:'12px',marginBottom:'12px',alignItems:'center'}}>
                      {distPhoto ? (
                        <img src={distPhoto} alt="" style={{width:'64px',height:'64px',borderRadius:'50%',objectFit:'cover',objectPosition:'center top',border:'2px solid #ffd700'}}/>
                      ) : (
                        <div style={{width:'64px',height:'64px',borderRadius:'50%',background:'#2a2a2a',border:'2px dashed #555',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'24px'}}>🏆</div>
                      )}
                      <label style={{padding:'8px 14px',borderRadius:'999px',border:'1px dashed #555',color:'#9ca3af',cursor:'pointer',fontSize:'12px',fontWeight:700}}>
                        {uploadingDist ? '⏳ Envoi...' : (distPhoto ? '📷 Changer la photo' : '📷 Ajouter la photo du lauréat')}
                        <input type="file" accept="image/*" onChange={uploadPhotoDistinction} style={{display:'none'}}/>
                      </label>
                      {distPhoto && <button type="button" onClick={() => setDistPhoto('')} style={{background:'none',border:'none',color:'#ef4444',cursor:'pointer',fontSize:'12px',fontWeight:700}}>Retirer</button>}
                    </div>

                    <p style={{fontSize:'11px',color:'#6b7280',margin:'0 0 6px',fontWeight:700}}>{estDistinctionEquipe(distinctionType === 'Autre' ? distinctionAutre : distinctionType) ? 'Lauréat (l\'équipe)' : 'Lauréat (joueur ou entraîneur)'}</p>
                    <input value={laureat} onChange={e => setLaureat(e.target.value)} placeholder={estDistinctionEquipe(distinctionType === 'Autre' ? distinctionAutre : distinctionType) ? "Nom de l'équipe" : 'Nom du joueur ou de l\'entraîneur'} style={{...inputStyle,marginBottom:'12px'}}/>

                    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px',marginBottom:'12px'}}>
                      {!estDistinctionEquipe(distinctionType === 'Autre' ? distinctionAutre : distinctionType) && (
                        <div>
                          <p style={{fontSize:'11px',color:'#6b7280',margin:'0 0 6px',fontWeight:700}}>Son équipe</p>
                          <input value={distEquipe} onChange={e => setDistEquipe(e.target.value)} placeholder="Ex: Haïti, Arsenal" style={inputStyle}/>
                        </div>
                      )}
                      {!estDistinctionEquipe(distinctionType === 'Autre' ? distinctionAutre : distinctionType) && (
                        <div>
                          <p style={{fontSize:'11px',color:'#6b7280',margin:'0 0 6px',fontWeight:700}}>Pays du lauréat (drapeau)</p>
                          <input list="liste-pays" value={distPays} onChange={e => setDistPays(e.target.value)} placeholder="Ex: Haïti" style={inputStyle}/>
                        </div>
                      )}
                      <div>
                        <p style={{fontSize:'11px',color:'#6b7280',margin:'0 0 6px',fontWeight:700}}>Championnat / compétition</p>
                        <input value={distChampionnat} onChange={e => setDistChampionnat(e.target.value)} placeholder="Ex: Ligue 2, Premier League" style={inputStyle}/>
                      </div>
                      <div>
                        <p style={{fontSize:'11px',color:'#6b7280',margin:'0 0 6px',fontWeight:700}}>Période</p>
                        <input value={distPeriode} onChange={e => setDistPeriode(e.target.value)} placeholder="Ex: Septembre 2026, 2025-26" style={inputStyle}/>
                      </div>
                    </div>

                    <p style={{fontSize:'11px',color:'#6b7280',margin:'0 0 6px',fontWeight:700}}>Stats / chiffres (optionnel)</p>
                    <input value={distinctionStats} onChange={e => setDistinctionStats(e.target.value)} placeholder="Ex: 12 buts, 5 passes décisives" style={{...inputStyle,marginBottom:'12px'}}/>

                    <p style={{fontSize:'11px',color:'#6b7280',margin:'0 0 6px',fontWeight:700}}>Note / justification (optionnel)</p>
                    <textarea value={distinctionNote} onChange={e => setDistinctionNote(e.target.value)} rows={2} placeholder="Pourquoi cette distinction..." style={{...inputStyle,resize:'vertical'}}/>
                  </>
                )}
              </div>
            )}

            {type === 'post' && modePost === 'classement' && (
              <div style={sectionStyle}>
                <label style={labelStyle}>📊 Classement</label>
                <p style={{fontSize:'11px',color:'#6b7280',margin:'0 0 12px'}}>Classement d'équipes (groupe, FIFA, championnat) ou de joueurs (buteurs, passeurs).</p>

                <div style={{display:'flex',gap:'8px',marginBottom:'14px'}}>
                  <button type="button" onClick={() => setClassementType('')} style={btnChoix(classementType==='')}>Aucun</button>
                  <button type="button" onClick={() => setClassementType('equipes')} style={btnChoix(classementType==='equipes')}>🛡️ Équipes</button>
                  <button type="button" onClick={() => setClassementType('joueurs')} style={btnChoix(classementType==='joueurs')}>👤 Joueurs</button>
                </div>

                {classementType && (
                  <div>
                    <button type="button" onClick={() => setLotClassementOuvert(v => !v)} style={{padding:'10px 18px',borderRadius:'999px',border:'none',cursor:'pointer',fontWeight:700,fontSize:'13px',background:lotClassementOuvert?'#333':VIOLET,color:'#fff',marginBottom:'16px'}}>{lotClassementOuvert ? '✕ Fermer' : '📚 Coller plusieurs championnats à la fois'}</button>
                    {' '}
                    <button type="button" onClick={genererClassementPoints} disabled={genererClassementPointsEnCours} style={{padding:'10px 18px',borderRadius:'999px',border:'none',cursor:'pointer',fontWeight:700,fontSize:'13px',background:'#10b981',color:'#fff',marginBottom:'16px'}}>{genererClassementPointsEnCours ? '⏳ Génération...' : '🏆 Générer le classement des points (top 10)'}</button>

                    <div style={{background:'#1e1e1e',border:'1px solid #333',borderRadius:'10px',padding:'16px',marginBottom:'16px'}}>
                      <p style={{fontSize:'11px',color:'#6b7280',margin:'0 0 10px',fontWeight:700}}>🧠 Générer depuis un FootQuizz (note puis temps)</p>
                      <div style={{display:'flex',gap:'8px',flexWrap:'wrap'}}>
                        <select value={quizzFootChoisi} onChange={e => setQuizzFootChoisi(e.target.value)} onFocus={chargerQuizzFootListe} style={{...inputStyle,flex:1,minWidth:'220px'}}>
                          <option value="">— Choisir un FootQuizz —</option>
                          {quizzFootListe.map(q => <option key={q.id} value={q.id}>{q.titre} ({q.statut === 'ouvert' ? 'ouvert' : q.statut === 'ferme' ? 'fermé' : 'tiré'})</option>)}
                        </select>
                        <button type="button" onClick={genererClassementQuizz} disabled={genererClassementQuizzEnCours} style={{padding:'10px 18px',borderRadius:'999px',border:'none',cursor:'pointer',fontWeight:700,fontSize:'13px',background:VIOLET,color:'#fff'}}>{genererClassementQuizzEnCours ? '⏳...' : '🧠 Générer le classement'}</button>
                      </div>
                    </div>

                    {lotClassementOuvert && (
                      <div style={{background:'#1e1e1e',border:'1px solid #333',borderRadius:'10px',padding:'16px',marginBottom:'20px'}}>
                        <p style={{fontSize:'11px',color:'#6b7280',margin:'0 0 10px'}}>Crée et publie un post "Classement" par championnat, en une fois. Un bloc par championnat, séparé par une ligne vide : la 1ère ligne du bloc = nom du championnat, puis une ligne par {typeLotClassements==='equipes'?'équipe':'joueur'}.</p>
                        <div style={{display:'flex',gap:'8px',marginBottom:'12px'}}>
                          <button type="button" onClick={() => setTypeLotClassements('equipes')} style={btnChoix(typeLotClassements==='equipes')}>🏆 Équipes</button>
                          <button type="button" onClick={() => setTypeLotClassements('joueurs')} style={btnChoix(typeLotClassements==='joueurs')}>👤 Joueurs</button>
                        </div>
                        <textarea value={texteLotClassements} onChange={e => setTexteLotClassements(e.target.value)} rows={12} placeholder={"La Liga\nSevilla - 2 - 6\nAlavés - 2 - 4\n\nPremier League\nBrighton - 1 - 3\nArsenal - 1 - 3"} style={{...inputStyle,marginBottom:'10px',fontFamily:'monospace',fontSize:'13px'}}/>
                        <button type="button" onClick={creerClassementsEnLot} disabled={importLotClassements} style={{padding:'10px 20px',borderRadius:'999px',border:'none',cursor:'pointer',fontWeight:700,fontSize:'13px',background:VIOLET,color:'#fff'}}>{importLotClassements ? '⏳ Création...' : '🚀 Créer tous les classements'}</button>
                      </div>
                    )}

                    <p style={{fontSize:'11px',color:'#6b7280',margin:'0 0 6px',fontWeight:700}}>Titre du classement</p>
                    <input value={classementTitre} onChange={e => setClassementTitre(e.target.value)} placeholder={classementType==='equipes'?'Ex: Groupe A / Classement FIFA':'Ex: Meilleurs buteurs Ligue 1'} style={{...inputStyle,marginBottom:'14px'}}/>

                    <div style={{display:'grid',gridTemplateColumns:'2fr 1fr',gap:'8px',marginBottom:'14px'}}>
                      <input value={classementPays} onChange={e => setClassementPays(e.target.value)} placeholder="Pays pour le drapeau de la bannière (optionnel, ex: Espagne)" style={inputStyle}/>
                      <input type="number" min={1} value={classementPositionDepart} onChange={e => setClassementPositionDepart(e.target.value)} placeholder="Position de départ" style={inputStyle}/>
                    </div>
                    <p style={{fontSize:'10px',color:'#6b7280',margin:'0 0 14px'}}>La position de départ sert à créer un extrait "milieu de tableau" ou "bas de tableau" (ex: 11 pour démarrer au 11ᵉ rang) au lieu de toujours recommencer à 1.</p>

                    <p style={{fontSize:'11px',color:'#6b7280',margin:'0 0 6px',fontWeight:700}}>Coller le classement (une ligne par {classementType==='equipes'?'équipe':'joueur'})</p>
                    <p style={{fontSize:'10px',color:'#6b7280',margin:'0 0 8px'}}>Format : {classementType==='equipes' ? 'Équipe - Joués - Diff. buts - Points' : 'Joueur - Équipe - Buts/Passes (ou Joueur - Équipe - Pays - Buts/Passes pour afficher le drapeau du joueur)'} (un tiret entre chaque valeur)</p>
                    <textarea value={classementTexteColle} onChange={e => setClassementTexteColle(e.target.value)} placeholder={classementType==='equipes' ? 'France - 6 - +12 - 16\nArgentine - 6 - +8 - 15\nBrésil - 6 - +5 - 13' : 'Mbappé - France - 8\nMessi - Argentine - 7'} rows={6} style={{...inputStyle,marginBottom:'10px',fontFamily:'monospace',fontSize:'13px'}}/>
                    <button type="button" onClick={collerClassement} style={{padding:'10px 20px',borderRadius:'999px',border:'none',cursor:'pointer',fontWeight:700,fontSize:'13px',background:VIOLET,color:'#fff',marginBottom:'20px'}}>🔍 Analyser le texte</button>

                    <div style={{display:'flex',gap:'6px',marginBottom:'6px',fontSize:'10px',color:'#6b7280',fontWeight:700,textTransform:'uppercase'}}>
                      <span style={{width:'34px'}}>Pos</span>
                      <span style={{flex:2}}>{classementType==='equipes'?'Équipe':'Joueur'}</span>
                      <span style={{flex:1.5}}>{classementType==='equipes'?'Joués':'Équipe'}</span>
                      <span style={{flex:1}}>{classementType==='equipes'?'Points':'Buts/Passes'}</span>
                    </div>

                    {classement.map((l, i) => (
                      <div key={i} style={{display:'flex',gap:'6px',marginBottom:'6px',alignItems:'center'}}>
                        <div style={{display:'flex',gap:'2px'}}>
                          {COULEURS_LIGNE.map(col => (
                            <button key={col.cle} type="button" title={col.label} onClick={() => setLigne(i,'couleur',col.cle)} style={{
                              width:'16px',height:'26px',borderRadius:'4px',cursor:'pointer',padding:0,
                              background: col.hex === 'transparent' ? '#1e1e1e' : col.hex,
                              border: l.couleur === col.cle ? '2px solid #fff' : '1px solid #333'
                            }}/>
                          ))}
                        </div>
                        <input value={l.pos} onChange={e => setLigne(i,'pos',e.target.value)} style={{...inputStyle,width:'34px',padding:'8px 4px',textAlign:'center'}}/>
                        <input value={l.nom} onChange={e => setLigne(i,'nom',e.target.value)} placeholder={classementType==='equipes'?'Équipe':'Joueur'} style={{...inputStyle,flex:2,padding:'8px'}}/>
                        <input value={l.extra} onChange={e => setLigne(i,'extra',e.target.value)} placeholder={classementType==='equipes'?'Joués':'Équipe'} style={{...inputStyle,flex:1.5,padding:'8px'}}/>
                        {classementType === 'equipes' && (
                          <input value={l.diff} onChange={e => setLigne(i,'diff',e.target.value)} placeholder="Diff" style={{...inputStyle,flex:1,padding:'8px'}}/>
                        )}
                        {classementType === 'joueurs' && (
                          <input value={l.pays} onChange={e => setLigne(i,'pays',e.target.value)} placeholder="Pays (drapeau)" style={{...inputStyle,flex:1.2,padding:'8px'}}/>
                        )}
                        <input value={l.val} onChange={e => setLigne(i,'val',e.target.value)} placeholder={classementType==='equipes'?'Pts':'Nb'} style={{...inputStyle,flex:1,padding:'8px'}}/>
                      </div>
                    ))}
                    <div style={{display:'flex',gap:'12px',marginTop:'10px',flexWrap:'wrap'}}>
                      {COULEURS_LIGNE.filter(c2 => c2.cle).map(col => (
                        <span key={col.cle} style={{display:'flex',alignItems:'center',gap:'4px',fontSize:'11px',color:'#9ca3af'}}>
                          <span style={{width:'10px',height:'10px',borderRadius:'2px',background:col.hex,display:'inline-block'}}/>{col.label}
                        </span>
                      ))}
                    </div>
                    <button type="button" onClick={ajouterLigne} style={{marginTop:'10px',padding:'8px 16px',borderRadius:'999px',border:'1px dashed #555',background:'transparent',color:'#9ca3af',cursor:'pointer',fontSize:'12px',fontWeight:700}}>+ Ajouter une ligne</button>
                  </div>
                )}
              </div>
            )}

            {type === 'post' && modePost === 'elimination' && (
              <div style={sectionStyle}>
                <label style={labelStyle}>⚔️ Élimination directe</label>
                <p style={{fontSize:'11px',color:'#6b7280',margin:'0 0 12px'}}>Le qualifié et l'éliminé s'affichent automatiquement. Score, AP (après prolongation) et TAB (tirs au but) sont facultatifs : sans score, la rencontre s'affiche comme à venir.</p>
                <select value={TOURS.includes(elim.tour) ? elim.tour : ''} onChange={e => setElim({...elim, tour: e.target.value})} style={{...inputStyle,marginBottom:'8px'}}>
                  <option value="">Tour (choisir ou écrire ci-dessous)</option>
                  {TOURS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <input value={elim.tour} onChange={e => setElim({...elim, tour: e.target.value})} placeholder="Tour (ex: Quarts de finale)" style={{...inputStyle,marginBottom:'8px'}}/>
                <input value={elim.competition} onChange={e => setElim({...elim, competition: e.target.value})} placeholder="Compétition (ex: Ligue des champions)" style={{...inputStyle,marginBottom:'12px'}}/>

                <details style={{marginBottom:'14px'}}>
                  <summary style={{cursor:'pointer',fontSize:'12px',fontWeight:800,color:VIOLET}}>📋 Coller toutes les rencontres d'un coup</summary>
                  <p style={{fontSize:'10px',color:'#6b7280',margin:'8px 0'}}>Ligne 1 (facultative) : Tour - Compétition. Puis une ligne par match : « Haïti 2-1 Cuba », « Brésil 1-1 Croatie ap 1-1 tab 4-2 », ou « France vs Argentine » (à venir).</p>
                  <textarea value={texteElim} onChange={e => setTexteElim(e.target.value)} rows={8} placeholder={'Quarts de finale - Ligue des champions\nHaïti 2-1 Cuba\nBrésil 1-1 Croatie ap 1-1 tab 4-2\nFrance vs Argentine'} style={{...inputStyle,fontFamily:'inherit',marginBottom:'8px'}}/>
                  <button type="button" onClick={appliquerTexteElim} style={{padding:'9px 16px',borderRadius:'999px',border:'none',background:VIOLET,color:'#fff',fontWeight:800,fontSize:'12px',cursor:'pointer'}}>Appliquer</button>
                </details>

                {elim.rencontres.map((r, i) => {
                  const q = qualifieRencontre(r);
                  return (
                    <div key={i} style={{background:'#1e1e1e',border:'1px solid #333',borderRadius:'12px',padding:'10px',marginBottom:'10px'}}>
                      <div style={{display:'flex',gap:'6px',alignItems:'center',marginBottom:'6px'}}>
                        <input list="liste-pays" value={r.equipe1} onChange={e => majRencontre(i,'equipe1',e.target.value)} placeholder="Équipe 1" style={{...inputStyle,flex:3,padding:'8px'}}/>
                        <input value={r.score1} onChange={e => majRencontre(i,'score1',e.target.value)} inputMode="numeric" placeholder="-" style={{...inputStyle,flex:1,padding:'8px',textAlign:'center'}}/>
                        <input value={r.score2} onChange={e => majRencontre(i,'score2',e.target.value)} inputMode="numeric" placeholder="-" style={{...inputStyle,flex:1,padding:'8px',textAlign:'center'}}/>
                        <input list="liste-pays" value={r.equipe2} onChange={e => majRencontre(i,'equipe2',e.target.value)} placeholder="Équipe 2" style={{...inputStyle,flex:3,padding:'8px'}}/>
                        {elim.rencontres.length > 1 && <button type="button" onClick={() => setElim(prev => ({...prev, rencontres: prev.rencontres.filter((_, idx) => idx !== i)}))} style={{background:'none',border:'none',color:'#ef4444',cursor:'pointer',fontSize:'16px'}}>🗑️</button>}
                      </div>
                      <div style={{display:'flex',gap:'6px',alignItems:'center',flexWrap:'wrap'}}>
                        <span style={{fontSize:'11px',color:'#9ca3af',fontWeight:800}}>AP</span>
                        <input value={r.ap1} onChange={e => majRencontre(i,'ap1',e.target.value)} inputMode="numeric" placeholder="-" style={{...inputStyle,width:'46px',padding:'6px',textAlign:'center'}}/>
                        <input value={r.ap2} onChange={e => majRencontre(i,'ap2',e.target.value)} inputMode="numeric" placeholder="-" style={{...inputStyle,width:'46px',padding:'6px',textAlign:'center'}}/>
                        <span style={{fontSize:'11px',color:'#9ca3af',fontWeight:800,marginLeft:'6px'}}>TAB</span>
                        <input value={r.tab1} onChange={e => majRencontre(i,'tab1',e.target.value)} inputMode="numeric" placeholder="-" style={{...inputStyle,width:'46px',padding:'6px',textAlign:'center'}}/>
                        <input value={r.tab2} onChange={e => majRencontre(i,'tab2',e.target.value)} inputMode="numeric" placeholder="-" style={{...inputStyle,width:'46px',padding:'6px',textAlign:'center'}}/>
                        <select value={r.qualifie} onChange={e => majRencontre(i,'qualifie',e.target.value)} style={{...inputStyle,flex:1,minWidth:'130px',padding:'6px'}}>
                          <option value="">Qualifié : auto</option>
                          <option value="1">Qualifié : équipe 1</option>
                          <option value="2">Qualifié : équipe 2</option>
                        </select>
                      </div>
                      <p style={{fontSize:'10px',margin:'6px 0 0',fontWeight:700,color:q ? '#10b981' : '#9ca3af'}}>{q === 1 ? '✅ ' + (r.equipe1 || 'Équipe 1') + ' qualifié(e)' : q === 2 ? '✅ ' + (r.equipe2 || 'Équipe 2') + ' qualifié(e)' : 'Pas encore de qualifié'}</p>
                    </div>
                  );
                })}
                <button type="button" onClick={() => setElim(prev => ({...prev, rencontres: [...prev.rencontres, { ...RENCONTRE_VIDE }]}))} style={{padding:'8px 16px',borderRadius:'999px',border:'1px dashed #555',background:'transparent',color:'#9ca3af',cursor:'pointer',fontSize:'12px',fontWeight:700}}>+ Ajouter une rencontre</button>
              </div>
            )}

            {type === 'post' && modePost === 'onze' && (
              <div style={sectionStyle}>
                <label style={labelStyle}>👥 Équipe type (onze)</label>
                <p style={{fontSize:'11px',color:'#6b7280',margin:'0 0 12px'}}>Équipe de la journée / du mois / de la saison : joueurs de plusieurs équipes. Remplissez l'en-tête, la formation, puis les 11 joueurs (photo facultative).</p>

                <select value={onzeDetails.categorie} onChange={e => setOnzeDetails({...onzeDetails, categorie: e.target.value})} style={{...inputStyle,marginBottom:'8px'}}>
                  <option value="">Sans titre (onze simple)</option>
                  {CATEGORIES_ONZE.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <input value={onzeDetails.competition} onChange={e => setOnzeDetails({...onzeDetails, competition: e.target.value})} placeholder="Compétition (ex: Concacaf Nations League A)" style={{...inputStyle,marginBottom:'8px'}}/>
                <input value={onzeDetails.periode} onChange={e => setOnzeDetails({...onzeDetails, periode: e.target.value})} placeholder="Période (ex: Septembre-Octobre 2026)" style={{...inputStyle,marginBottom:'12px'}}/>

                <details style={{marginBottom:'14px'}}>
                  <summary style={{cursor:'pointer',fontSize:'12px',fontWeight:800,color:VIOLET}}>📋 Coller toute l'équipe d'un coup</summary>
                  <p style={{fontSize:'10px',color:'#6b7280',margin:'8px 0'}}>Ligne 1 : Catégorie - Compétition - Période. Ligne 2 : formation (ex: 4-3-3). Puis 11 lignes « Joueur - Club | Pays » (le pays après la barre | est facultatif) : gardien, défenseurs, milieux, attaquants (de gauche à droite).</p>
                  <textarea value={texteOnze} onChange={e => setTexteOnze(e.target.value)} rows={14} placeholder={'Équipe du mois - Concacaf Nations League A - Septembre-Octobre 2026\n4-3-3\nGardien - Équipe\n...'} style={{...inputStyle,fontFamily:'inherit',marginBottom:'8px'}}/>
                  <button type="button" onClick={appliquerTexteOnze} style={{padding:'9px 16px',borderRadius:'999px',border:'none',background:VIOLET,color:'#fff',fontWeight:800,fontSize:'12px',cursor:'pointer'}}>Appliquer</button>
                </details>

                <p style={{fontSize:'11px',color:'#6b7280',margin:'0 0 6px',fontWeight:700}}>Formation</p>
                <div style={{display:'flex',flexWrap:'wrap',gap:'6px',marginBottom:'16px'}}>
                  <button type="button" onClick={() => setFormation('')} style={{padding:'8px 14px',borderRadius:'999px',cursor:'pointer',fontSize:'12px',fontWeight:700,border:formation===''?'2px solid '+VIOLET:'1px solid #333',background:formation===''?VIOLET:'#1e1e1e',color:formation===''?'#fff':'#9ca3af'}}>Aucune</button>
                  {FORMATIONS_LISTE.map(f => (
                    <button key={f} type="button" onClick={() => setFormation(f)} style={{padding:'8px 14px',borderRadius:'999px',cursor:'pointer',fontSize:'12px',fontWeight:700,border:formation===f?'2px solid '+VIOLET:'1px solid #333',background:formation===f?VIOLET:'#1e1e1e',color:formation===f?'#fff':'#9ca3af'}}>{f}</button>
                  ))}
                </div>

                {formation && (
                  <div>
                    <p style={{fontSize:'11px',color:'#6b7280',margin:'0 0 8px',fontWeight:700}}>Les 11 joueurs (n°1 = gardien)</p>
                    {onze.map((j, i) => (
                      <div key={i} style={{display:'flex',gap:'6px',marginBottom:'6px',alignItems:'center'}}>
                        <span style={{color:VIOLET,fontWeight:900,fontSize:'13px',width:'22px'}}>{i+1}</span>
                        <input value={j.nom} onChange={e => setJoueur(i,'nom',e.target.value)} placeholder="Joueur" style={{...inputStyle,flex:2}}/>
                        <input value={j.equipe} onChange={e => setJoueur(i,'equipe',e.target.value)} placeholder="Équipe / Club" style={{...inputStyle,flex:2}}/>
                        <input list="liste-pays" value={j.pays || ''} onChange={e => setJoueur(i,'pays',e.target.value)} placeholder="Pays" style={{...inputStyle,flex:1.4}}/>
                        <label style={{width:'34px',height:'34px',flexShrink:0,borderRadius:'50%',border:'1px dashed #555',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',overflow:'hidden',background:'#1e1e1e',fontSize:'14px'}}>
                          {j.photo ? <img src={j.photo} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/> : (uploadingOnze===i ? '…' : '📷')}
                          <input type="file" accept="image/*" onChange={e => uploadPhotoOnze(i,e)} style={{display:'none'}}/>
                        </label>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {type === 'post' && modePost === 'sponsorise' && (
              <div style={sectionStyle}>
                <label style={labelStyle}>📣 Post sponsorisé</label>
                <p style={{fontSize:'11px',color:'#6b7280',margin:'0 0 12px'}}>Un post 100% publicité : logo du produit, nom et lien.</p>
                <label style={{...labelStyle,fontSize:'12px'}}>Nom du produit / marque</label>
                <input value={pubNom} onChange={e => setPubNom(e.target.value)} placeholder="Ex: Digicel, Natcom..." style={{...inputStyle,marginBottom:'12px'}}/>
                <label style={{...labelStyle,fontSize:'12px'}}>Lien (site, page, WhatsApp...)</label>
                <input value={pubLien} onChange={e => setPubLien(e.target.value)} placeholder="https://..." style={{...inputStyle,marginBottom:'12px'}}/>
                <label style={{...labelStyle,fontSize:'12px'}}>Logo du produit</label>
                <input type="file" accept="image/*" onChange={uploadPubLogo} style={{color:'#9ca3af',fontSize:'13px'}}/>
                {uploadingPub && <p style={{color:'#c46bff',fontSize:'12px'}}>Upload...</p>}
                {pubLogo && <img src={pubLogo} alt="logo" style={{maxHeight:'80px',marginTop:'10px',borderRadius:'8px',background:'#fff',padding:'6px'}}/>}
              </div>
            )}

            {type === 'post' && modePost !== 'sponsorise' && (
              <div style={sectionStyle}>
                <details>
                  <summary style={{color:'#c46bff',fontSize:'14px',fontWeight:700,cursor:'pointer'}}>📣 Ajouter un encart pub (optionnel)</summary>
                  <div style={{marginTop:'14px'}}>
                    <label style={{display:'flex',alignItems:'center',gap:'8px',color:'#e5e7eb',fontSize:'13px',marginBottom:'12px',cursor:'pointer'}}>
                      <input type="checkbox" checked={pubActif} onChange={e => setPubActif(e.target.checked)} style={{width:'18px',height:'18px'}}/>
                      Afficher un encart sponsorisé sur ce post
                    </label>
                    {pubActif && (
                      <div>
                        <input value={pubNom} onChange={e => setPubNom(e.target.value)} placeholder="Nom du produit / marque" style={{...inputStyle,marginBottom:'12px'}}/>
                        <input value={pubLien} onChange={e => setPubLien(e.target.value)} placeholder="Lien https://..." style={{...inputStyle,marginBottom:'12px'}}/>
                        <input type="file" accept="image/*" onChange={uploadPubLogo} style={{color:'#9ca3af',fontSize:'13px'}}/>
                        {uploadingPub && <p style={{color:'#c46bff',fontSize:'12px'}}>Upload...</p>}
                        {pubLogo && <img src={pubLogo} alt="logo" style={{maxHeight:'60px',marginTop:'10px',borderRadius:'8px',background:'#fff',padding:'6px'}}/>}
                      </div>
                    )}
                  </div>
                </details>
              </div>
            )}

            <div style={sectionStyle}>
              <label style={labelStyle}>🏷️ Tags</label>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px'}}>
                {TAGS_GROUPES.map(groupe => (
                  <div key={groupe.titre}>
                    <p style={{fontSize:'11px',color:'#6b7280',margin:'0 0 6px',fontWeight:700}}>{groupe.titre}</p>
                    <select value="" onChange={e => { if (e.target.value) toggleTag(e.target.value); }} style={{...inputStyle,padding:'10px'}}>
                      <option value="">+ Ajouter…</option>
                      {groupe.tags.filter(t => !tags.includes(t)).map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                ))}
              </div>
              {tags.length > 0 && (
                <div style={{display:'flex',flexWrap:'wrap',gap:'6px',marginTop:'12px'}}>
                  {tags.map(t => (
                    <button key={t} type="button" onClick={() => toggleTag(t)} title="Retirer" style={{
                      padding:'6px 12px', borderRadius:'999px', cursor:'pointer', fontSize:'12px', fontWeight:700,
                      border:'2px solid '+VIOLET, background:VIOLET, color:'#fff'
                    }}>{t} ✕</button>
                  ))}
                </div>
              )}
            </div>

            <div style={sectionStyle}>
              <label style={labelStyle}>📎 Source (optionnel)</label>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px'}}>
                <input value={sourceNom} onChange={e => setSourceNom(e.target.value)} placeholder="Fabrizio Romano, L'Équipe..." style={inputStyle}/>
                <input value={sourceUrl} onChange={e => setSourceUrl(e.target.value)} placeholder="https://... (lien)" style={inputStyle}/>
              </div>
            </div>

            <div style={sectionStyle}>
              <label style={labelStyle}>🖼️ Image {type==='post'?'(optionnelle)':'de couverture'}</label>
              <input type="file" accept="image/*" onChange={uploadImage} style={{...inputStyle,padding:'8px'}}/>
              {uploading && <p style={{color:'#f59e0b',fontSize:'12px',margin:'8px 0 0'}}>⏳ Upload...</p>}
              {imageCouverture && <img src={imageCouverture} alt="" style={{width:'100%',maxHeight:'200px',objectFit:'cover',borderRadius:'10px',marginTop:'12px'}}/>}
            </div>

            {type === 'article' && (
              <div style={sectionStyle}>
                <label style={labelStyle}>Extrait (résumé pour la liste)</label>
                <textarea value={extrait} onChange={e => setExtrait(e.target.value)} rows={2} placeholder="Résumé court..." style={{...inputStyle,resize:'vertical'}}/>
              </div>
            )}

            <div style={sectionStyle}>
              <label style={labelStyle}>{type==='post' ? '✍️ Le texte du post' : '✍️ Contenu (Markdown)'}</label>
              {type === 'article' && <p style={{fontSize:'11px',color:'#6b7280',margin:'0 0 8px'}}>## titre, **gras**, *italique*, ![img](url), [lien](url)</p>}
              <textarea value={contenu} onChange={e => setContenu(e.target.value)} rows={type==='post'?6:16} placeholder={type==='post'?'Écrivez votre brève percutante...':'Écrivez votre article...'} style={{...inputStyle,resize:'vertical',lineHeight:'1.6',fontFamily:type==='article'?'monospace':'inherit'}}/>
            </div>

            <div style={{display:'flex',gap:'12px',position:'sticky',bottom:'16px'}}>
              <button onClick={() => sauvegarder(false)} disabled={saving} style={{flex:1,padding:'16px',background:'#374151',color:'#fff',border:'none',borderRadius:'999px',fontWeight:700,fontSize:'15px',cursor:'pointer'}}>💾 Brouillon</button>
              <button onClick={() => sauvegarder(true)} disabled={saving} style={{flex:2,padding:'16px',background:VIOLET,color:'#fff',border:'none',borderRadius:'999px',fontWeight:900,fontSize:'15px',cursor:'pointer',boxShadow:'0 4px 16px rgba(191,0,255,0.4)'}}>{saving ? '...' : '🚀 Publier'}</button>
            </div>
          </div>
        )}

        {vue === 'liste' && (
          <>
            {articles.length === 0 && <p style={{color:'#6b7280'}}>Aucun contenu.</p>}
            {articles.map(a => (
              <div key={a.id} style={{background:'#161616',border:'1px solid #2a2a2a',borderRadius:'14px',padding:'16px',marginBottom:'12px',display:'flex',gap:'16px',alignItems:'center',flexWrap:'wrap'}}>
                {a.image_couverture && <img src={a.image_couverture} alt={a.titre} style={{width:'80px',height:'60px',objectFit:'cover',borderRadius:'10px'}}/>}
                <div style={{flex:1,minWidth:'200px'}}>
                  <div style={{display:'flex',gap:'6px',marginBottom:'6px',flexWrap:'wrap'}}>
                    <span style={{fontSize:'10px',background:a.type==='post'?VIOLET:'#374151',color:'#fff',padding:'2px 8px',borderRadius:'999px',fontWeight:700}}>{a.type==='post'?'⚡ Post':'📄 Article'}</span>
                    <span style={{fontSize:'10px',background:'#1e1e1e',color:'#fff',padding:'2px 8px',borderRadius:'999px'}}>{a.langue==='kreyol'?'🇭🇹 Kreyòl':'🇫🇷 FR'}</span>
                    <span style={{fontSize:'10px',background:'#1e1e1e',color:'#9ca3af',padding:'2px 8px',borderRadius:'999px'}}>{a.categorie}</span>
                  </div>
                  <p style={{color:'#fff',fontWeight:700,margin:'4px 0 2px',fontSize:'15px'}}>{a.titre}</p>
                  {a.source_nom && <p style={{color:'#9ca3af',fontSize:'11px',margin:0}}>Source : {a.source_nom}</p>}
                </div>
                <div style={{display:'flex',gap:'6px',flexWrap:'wrap'}}>
                  <button onClick={() => togglePublie(a)} style={{padding:'6px 12px',borderRadius:'999px',border:'none',cursor:'pointer',fontWeight:700,fontSize:'11px',background:a.publie?'#10b981':'#374151',color:'#fff'}}>{a.publie ? '✓ Publié' : 'Brouillon'}</button>
                  {a.type === 'post' && a.categorie === 'Ponctuel' && <button onClick={() => relancer(a)} style={{padding:'6px 12px',borderRadius:'999px',border:'2px solid #f59e0b',background:'transparent',color:'#f59e0b',cursor:'pointer',fontWeight:700,fontSize:'11px'}}>🔄 Relancer</button>}
                  {a.type === 'post' && <button onClick={() => lancerVideo(a)} style={{padding:'6px 12px',borderRadius:'999px',border:'2px solid #10b981',background:'transparent',color:'#10b981',cursor:'pointer',fontWeight:700,fontSize:'11px'}}>🎬 Vidéo</button>}
                  <button onClick={() => editerArticle(a)} style={{padding:'6px 12px',borderRadius:'999px',border:'2px solid '+VIOLET,background:'transparent',color:VIOLET,cursor:'pointer',fontWeight:700,fontSize:'11px'}}>✏️</button>
                  <button onClick={() => supprimer(a.id)} style={{padding:'6px 12px',borderRadius:'999px',border:'2px solid #ef4444',background:'transparent',color:'#ef4444',cursor:'pointer',fontWeight:700,fontSize:'11px'}}>🗑️</button>
                </div>
              </div>
            ))}
          </>
        )}

      </main>

      <datalist id="liste-pays">{listePays().map(n => <option key={n} value={n}/>)}</datalist>

      {videoArticle && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.85)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:'16px'}}>
          <div style={{background:'#161616',border:'1px solid #333',borderRadius:'16px',padding:'20px',width:'100%',maxWidth:'420px',maxHeight:'94vh',overflowY:'auto',color:'#fff'}}>
            <p style={{fontWeight:900,fontSize:'15px',margin:'0 0 4px'}}>🎬 Vidéo · {typeVideo(videoArticle)}</p>
            <p style={{color:'#9ca3af',fontSize:'12px',margin:'0 0 14px'}}>{videoArticle.titre}</p>
            {videoErreur ? (
              <p style={{color:'#f87171',fontSize:'13px',fontWeight:700}}>❌ {videoErreur}</p>
            ) : !videoUrl ? (
              <div>
                <div style={{height:'10px',background:'#2a2a2a',borderRadius:'999px',overflow:'hidden',marginBottom:'8px'}}>
                  <div style={{height:'100%',width:videoPct+'%',background:'linear-gradient(90deg,#bf00ff,#ff7a00)',transition:'width .2s'}}/>
                </div>
                <p style={{fontSize:'12px',color:'#d1d5db',margin:0}}>{videoEtape} {videoPct}%</p>
                <p style={{fontSize:'11px',color:'#9ca3af',margin:'8px 0 0'}}>Gardez cet onglet ouvert et visible pendant l'enregistrement (environ la durée de la vidéo).</p>
              </div>
            ) : (
              <div>
                <video src={videoUrl} controls playsInline style={{width:'100%',borderRadius:'12px',background:'#000',marginBottom:'12px'}}/>
                <a href={videoUrl} download={'makegoal-' + slugify(videoArticle.titre) + '.' + videoExt} style={{display:'block',textAlign:'center',padding:'12px',borderRadius:'999px',background:VIOLET,color:'#fff',fontWeight:900,fontSize:'13px',textDecoration:'none',marginBottom:'8px'}}>⬇️ Télécharger la vidéo (.{videoExt})</a>
              </div>
            )}
            <button onClick={fermerVideo} style={{width:'100%',padding:'10px',borderRadius:'999px',border:'1px solid #444',background:'transparent',color:'#d1d5db',fontWeight:700,fontSize:'12px',cursor:'pointer',marginTop:'4px'}}>{videoUrl || videoErreur ? 'Fermer' : 'Annuler'}</button>
          </div>
        </div>
      )}
    </div>
  );
}
