import { createClient } from '@supabase/supabase-js';
import { traiterPrediction } from '../../../lib/points';

// Client admin avec la clé service_role (côté serveur uniquement)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string
);

export async function POST(request: Request) {
  // 1. Vérifier le token de l'utilisateur qui appelle
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return Response.json({ error: 'Non autorisé' }, { status: 401 });
  }
  const token = authHeader.replace('Bearer ', '');

  const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
  if (userError || !userData.user) {
    return Response.json({ error: 'Session invalide' }, { status: 401 });
  }

  // 2. Vérifier que cet utilisateur est admin
  const { data: adminData } = await supabaseAdmin
    .from('admins')
    .select('user_id')
    .eq('user_id', userData.user.id)
    .single();

  if (!adminData) {
    return Response.json({ error: 'Accès réservé aux administrateurs' }, { status: 403 });
  }

  // 3. Calcul des points (uniquement si admin validé)
  const { concours_match_id } = await request.json();
  if (!concours_match_id) {
    return Response.json({ error: 'concours_match_id manquant' }, { status: 400 });
  }

  const { data: match } = await supabaseAdmin
    .from('concours_matchs')
    .select('*')
    .eq('id', concours_match_id)
    .single();

  if (!match || !match.resultat_1x2) {
    return Response.json({ error: 'Résultat du match non défini' }, { status: 400 });
  }

  const buteursReels: string[] = (match.buteurs_reels || []).map((b: string) => b.toLowerCase().trim());
  const passeursReels: string[] = (match.passeurs_reels || []).map((p: string) => p.toLowerCase().trim());

  const { data: participations } = await supabaseAdmin
    .from('participations_matchs')
    .select('*')
    .eq('concours_match_id', concours_match_id);

  if (!participations) {
    return Response.json({ error: 'Aucune participation' }, { status: 400 });
  }

  for (const part of participations) {
    // points local = affichage propre à CE concours (classement/lots de ce concours précis)
    let points = 0;

    // --- Résultat (1X2) : correct = +10, faux = -5 ---
    if (part.choix_1x2) {
      const correct = part.choix_1x2 === match.resultat_1x2;
      points += correct ? 15 : -20;
      if (part.user_id) {
        await traiterPrediction(part.user_id, 'resultat', correct, concours_match_id, supabaseAdmin);
      }
    }

    // --- Score exact : correct = +10, faux = -5 ---
    if (part.score_home !== null && part.score_away !== null) {
      const correct = part.score_home === match.score_home && part.score_away === match.score_away;
      points += correct ? 15 : -20;
      if (part.user_id) {
        await traiterPrediction(part.user_id, 'score_exact', correct, concours_match_id, supabaseAdmin);
      }
    }

    // --- Buteurs : un mouvement par buteur proposé, correct = +10, faux = -5 ---
    const buteursJoueur: string[] = (part.buteurs || []).map((b: string) => b.toLowerCase().trim()).filter((b: string) => b);
    for (const b of buteursJoueur) {
      const correct = buteursReels.includes(b);
      points += correct ? 15 : -20;
      if (part.user_id) {
        await traiterPrediction(part.user_id, 'buteur', correct, concours_match_id, supabaseAdmin);
      }
    }

    // --- Passeurs : un mouvement par passeur proposé, correct = +10, faux = -5 ---
    const passeursJoueur: string[] = (part.passeurs || []).map((p: string) => p.toLowerCase().trim()).filter((p: string) => p);
    for (const p of passeursJoueur) {
      const correct = passeursReels.includes(p);
      points += correct ? 15 : -20;
      if (part.user_id) {
        await traiterPrediction(part.user_id, 'passeur', correct, concours_match_id, supabaseAdmin);
      }
    }

    await supabaseAdmin
      .from('participations_matchs')
      .update({ points })
      .eq('id', part.id);
  }

  return Response.json({ success: true, participants: participations.length });
}
