import { createClient } from '@supabase/supabase-js';
import { placerCombine, coteDoubleChance, Pronostic } from '../../../lib/paris';
import { limiteParis, verifierLimite } from '../../../lib/rateLimit';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string
);

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
  const userId = userData.user.id;

  const limiteDepassee = await verifierLimite(limiteParis, userId);
  if (limiteDepassee) return limiteDepassee;

  const { mise, selections } = await request.json();
  if (!mise || !Array.isArray(selections) || selections.length === 0) {
    return Response.json({ error: 'Requête invalide' }, { status: 400 });
  }

  const selectionsVerifiees = [];
  for (const s of selections) {
    if (!s.matchId || !s.pronostic) {
      return Response.json({ error: 'Sélection invalide' }, { status: 400 });
    }

    const { data: match } = await supabaseAdmin
      .from('matchs')
      .select('cote_1, cote_x, cote_2, cote_plus2_5, cote_moins2_5, resultat_reel, date_match')
      .eq('id', s.matchId)
      .single();

    if (!match) return Response.json({ error: 'Match introuvable : ' + s.matchId }, { status: 400 });
    if (match.resultat_reel !== null) {
      return Response.json({ error: "Ce match est déjà terminé, impossible d'y parier." }, { status: 400 });
    }
    if (new Date(match.date_match) <= new Date()) {
      return Response.json({ error: 'Ce match a déjà commencé, impossible d\'y parier.' }, { status: 400 });
    }

    let cote: number | null = null;
    const p = s.pronostic as Pronostic;
    if (p === '1') cote = match.cote_1;
    else if (p === 'X') cote = match.cote_x;
    else if (p === '2') cote = match.cote_2;
    else if (p === '1X' && match.cote_1 && match.cote_x) cote = coteDoubleChance(match.cote_1, match.cote_x);
    else if (p === 'X2' && match.cote_x && match.cote_2) cote = coteDoubleChance(match.cote_x, match.cote_2);
    else if (p === '12' && match.cote_1 && match.cote_2) cote = coteDoubleChance(match.cote_1, match.cote_2);
    else if (p === 'plus2.5') cote = match.cote_plus2_5;
    else if (p === 'moins2.5') cote = match.cote_moins2_5;

    if (!cote) return Response.json({ error: 'Cote indisponible pour cette sélection.' }, { status: 400 });

    selectionsVerifiees.push({ matchId: s.matchId, pronostic: p, cote });
  }

  const resultat = await placerCombine(userId, parseFloat(mise), selectionsVerifiees, supabaseAdmin);
  if (!resultat.ok) return Response.json({ error: resultat.erreur }, { status: 400 });

  return Response.json({ success: true, ...resultat });
}
