import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.NEXT_PUBLIC_SUPABASE_KEY as string
);

export async function POST(request: Request) {
  const { concours_match_id } = await request.json();
  if (!concours_match_id) {
    return Response.json({ error: 'concours_match_id manquant' }, { status: 400 });
  }

  const { data: match } = await supabase
    .from('concours_matchs')
    .select('*')
    .eq('id', concours_match_id)
    .single();

  if (!match || !match.resultat_1x2) {
    return Response.json({ error: 'Résultat du match non défini' }, { status: 400 });
  }

  const buteursReels: string[] = (match.buteurs_reels || []).map((b: string) => b.toLowerCase().trim());

  const { data: participations } = await supabase
    .from('participations_matchs')
    .select('*')
    .eq('concours_match_id', concours_match_id);

  if (!participations) {
    return Response.json({ error: 'Aucune participation' }, { status: 400 });
  }

  for (const part of participations) {
    let points = 0;

    // Résultat 1X2 : 10 si voté, +25 si exact
    if (part.choix_1x2) {
      points += 10;
      if (part.choix_1x2 === match.resultat_1x2) {
        points += 25;
      }
    }

    // Score exact : 10 si tenté, +25 si exact
    if (part.score_home !== null && part.score_away !== null) {
      points += 10;
      if (part.score_home === match.score_home && part.score_away === match.score_away) {
        points += 25;
      }
    }

    // Buteurs : 10 par buteur proposé, +25 par buteur correct
    const buteursJoueur: string[] = (part.buteurs || []).map((b: string) => b.toLowerCase().trim()).filter((b: string) => b);
    buteursJoueur.forEach(b => {
      points += 10;
      if (buteursReels.includes(b)) {
        points += 25;
      }
    });

    await supabase
      .from('participations_matchs')
      .update({ points })
      .eq('id', part.id);
  }

  return Response.json({ success: true, participants: participations.length });
}