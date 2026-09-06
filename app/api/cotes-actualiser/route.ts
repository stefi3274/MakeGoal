import { createClient } from '@supabase/supabase-js';
import { limiteCotes, verifierLimite } from '../../../lib/rateLimit';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string
);

// Clés de championnat reconnues par The Odds API (the-odds-api.com)
const CLES_SPORT: Record<string, string> = {
  'Angleterre': 'soccer_epl',
  'Espagne': 'soccer_spain_la_liga',
  'Italie': 'soccer_italy_serie_a',
  'France': 'soccer_france_ligue_one',
  'Portugal': 'soccer_portugal_primeira_liga',
  'Ligue des Champions': 'soccer_uefa_champs_league'
};

// Retire accents, préfixes de club et espaces superflus pour comparer deux noms d'équipe
// Traductions courantes anglais/portugais/allemand ↔ français des noms de villes,
// pour que "Athens" (API) et "Athènes" (chez toi) soient reconnus comme identiques.
const TRADUCTIONS: [RegExp, string][] = [
  [/\bathens\b/g, 'athenes'],
  [/\bbrugge\b/g, 'bruges'],
  [/\bbarcelona\b/g, 'barcelone'],
  [/\bpraha\b/g, 'prague'],
  [/\bmunchen\b/g, 'munich'],
  [/\bmunhen\b/g, 'munich'],
  [/\blisboa\b/g, 'lisbonne'],
  [/\bwarszawa\b/g, 'varsovie'],
  [/\bmoscow\b|\bmoskva\b/g, 'moscou'],
  [/\bmilano\b/g, 'milan'],
  [/\broma\b/g, 'rome'],
  [/\bnapoli\b/g, 'naples'],
  [/\bathletic bilbao\b/g, 'athletic'],
];

// Paires de noms qui ne partagent aucune racine commune (surnoms de clubs
// différents d'une langue à l'autre) : ajoutées ici au cas par cas.
const ALIAS: [string, string][] = [
  ['sportinglisbon', 'sportingcp'],
  ['internazionale', 'internazionalemilan'],
];

const normaliser = (nom: string) => {
  let n = nom.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  for (const [motif, remplacement] of TRADUCTIONS) n = n.replace(motif, remplacement);
  return n
    .replace(/\b(fc|cf|cd|ac|as|rc|club|real|deportivo|calcio|united|city)\b/g, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();
};

const correspondent = (nomLocal: string, nomApi: string) => {
  const a = normaliser(nomLocal), b = normaliser(nomApi);
  if (!a || !b) return false;
  if (a === b || a.includes(b) || b.includes(a)) return true;
  return ALIAS.some(([x, y]) => (a === x && b === y) || (a === y && b === x));
};

export async function POST(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return Response.json({ error: 'Non autorisé' }, { status: 401 });
  }
  const token = authHeader.replace('Bearer ', '');

  const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
  if (userError || !userData.user) {
    return Response.json({ error: 'Session invalide' }, { status: 401 });
  }

  const { data: adminData } = await supabaseAdmin
    .from('admins').select('user_id').eq('user_id', userData.user.id).single();
  if (!adminData) {
    return Response.json({ error: 'Accès réservé aux administrateurs' }, { status: 403 });
  }

  const limiteDepassee = await verifierLimite(limiteCotes, userData.user.id);
  if (limiteDepassee) return limiteDepassee;

  if (!process.env.THE_ODDS_API_KEY) {
    return Response.json({ error: "La clé THE_ODDS_API_KEY n'est pas configurée sur le serveur." }, { status: 500 });
  }

  const { championnat } = await request.json();
  const cleSport = CLES_SPORT[championnat];
  if (!cleSport) {
    return Response.json({ error: 'Championnat non reconnu. Valeurs possibles : ' + Object.keys(CLES_SPORT).join(', ') }, { status: 400 });
  }

  const urlOdds = 'https://api.the-odds-api.com/v4/sports/' + cleSport + '/odds?regions=eu,uk&markets=h2h,totals&oddsFormat=decimal&apiKey=' + process.env.THE_ODDS_API_KEY;
  const reponseOdds = await fetch(urlOdds);
  if (!reponseOdds.ok) {
    const texte = await reponseOdds.text();
    return Response.json({ error: 'The Odds API a répondu : ' + reponseOdds.status + ' — ' + texte.slice(0, 200) }, { status: 502 });
  }
  const evenements: any[] = await reponseOdds.json();

  const { data: matchsLocaux } = await supabaseAdmin
    .from('matchs').select('id, equipe1, equipe2, resultat_reel').is('resultat_reel', null);

  let miseAJour = 0;
  const nonTrouves: string[] = [];

  for (const ev of evenements) {
    const bookmaker = ev.bookmakers?.[0];
    const marcheH2h = bookmaker?.markets?.find((m: any) => m.key === 'h2h');
    if (!marcheH2h) continue;

    const cote1 = marcheH2h.outcomes.find((o: any) => o.name === ev.home_team)?.price;
    const cote2 = marcheH2h.outcomes.find((o: any) => o.name === ev.away_team)?.price;
    const coteX = marcheH2h.outcomes.find((o: any) => o.name === 'Draw')?.price;
    if (!cote1 || !cote2) continue;

    // Marché "Buts" (totals) : cherche la ligne à 2.5 buts en priorité, sinon la première disponible
    const marcheTotals = bookmaker?.markets?.find((m: any) => m.key === 'totals');
    let cotePlus, coteMoins;
    if (marcheTotals) {
      const ligne25 = marcheTotals.outcomes.filter((o: any) => o.point === 2.5);
      const outcomesRetenus = ligne25.length === 2 ? ligne25 : marcheTotals.outcomes;
      cotePlus = outcomesRetenus.find((o: any) => o.name === 'Over')?.price;
      coteMoins = outcomesRetenus.find((o: any) => o.name === 'Under')?.price;
    }

    const trouve = matchsLocaux?.find(m =>
      correspondent(m.equipe1, ev.home_team) && correspondent(m.equipe2, ev.away_team)
    );

    if (!trouve) { nonTrouves.push(ev.home_team + ' vs ' + ev.away_team); continue; }

    const { error } = await supabaseAdmin.from('matchs').update({
      cote_1: cote1, cote_x: coteX || null, cote_2: cote2,
      cote_plus2_5: cotePlus || null, cote_moins2_5: coteMoins || null
    }).eq('id', trouve.id);
    if (!error) miseAJour++;
  }

  return Response.json({
    success: true,
    miseAJour,
    totalEvenementsApi: evenements.length,
    nonTrouves
  });
}
