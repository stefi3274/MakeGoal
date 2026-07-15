import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.NEXT_PUBLIC_SUPABASE_KEY as string
);

export async function POST(request: Request) {
  const { concours_id } = await request.json();
  if (!concours_id) {
    return Response.json({ error: 'concours_id manquant' }, { status: 400 });
  }

  const { data: concours } = await supabase
    .from('concours')
    .select('*')
    .eq('id', concours_id)
    .single();

  if (!concours || !concours.resultat_1x2) {
    return Response.json({ error: 'Résultat du concours non défini' }, { status: 400 });
  }

  const buteursReels: string[] = (concours.buteurs_reels || []).map((b: string) => b.toLowerCase().trim());

  const { data: participations } = await supabase
    .from('participations')
    .select('*')
    .eq('concours_id', concours_id);

  if (!participations) {
    return Response.json({ error: 'Aucune participation' }, { status: 400 });
  }

  const { data: parrainages } = await supabase
    .from('parrainages')
    .select('parrain_id')
    .eq('concours_id', concours_id);

  const comptageParrainages: Record<string, number> = {};
  (parrainages || []).forEach((p: { parrain_id: string }) => {
    comptageParrainages[p.parrain_id] = (comptageParrainages[p.parrain_id] || 0) + 1;
  });

  for (const part of participations) {
    let points = 0;

    if (part.choix_1x2 === concours.resultat_1x2) {
      points += 10;
    }

    if (part.score_home === concours.score_home && part.score_away === concours.score_away) {
      points += 20;
    }

    const buteursJoueur: string[] = (part.buteurs || []).map((b: string) => b.toLowerCase().trim());
    buteursJoueur.forEach(b => {
      if (buteursReels.includes(b)) {
        points += 10;
      }
    });

    const parrainagesPoints = (comptageParrainages[part.user_id] || 0) * 15;
    points += parrainagesPoints;

    await supabase
      .from('participations')
      .update({ points })
      .eq('id', part.id);
  }

  await supabase
    .from('concours')
    .update({ statut: 'termine' })
    .eq('id', concours_id);

  return Response.json({ success: true, participants: participations.length });
}