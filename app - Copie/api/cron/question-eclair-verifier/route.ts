import { createClient } from '@supabase/supabase-js';
import { tirerGagnantsQuestionEclair } from '../../../../lib/points';
import { enregistrerAlerte } from '../../../../lib/alertes';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string
);

// Appelée par Vercel Cron (voir vercel.json). Vercel envoie automatiquement
// "Authorization: Bearer <CRON_SECRET>" — à créer soi-même comme variable
// d'environnement du projet sur Vercel.
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== 'Bearer ' + process.env.CRON_SECRET) {
    return Response.json({ error: 'Non autorisé' }, { status: 401 });
  }

  try {
    const { data: questionsExpirees } = await supabaseAdmin
      .from('questions_eclair')
      .select('id')
      .eq('statut', 'ouverte')
      .lte('date_fermeture', new Date().toISOString());

    if (!questionsExpirees || questionsExpirees.length === 0) {
      await enregistrerAlerte(supabaseAdmin, 'cron_question_eclair', 'Passage exécuté avec succès, aucune question à traiter.', 'info');
      return Response.json({ success: true, traitees: 0 });
    }

    let traitees = 0;
    for (const q of questionsExpirees) {
      const { data: verrou } = await supabaseAdmin
        .from('questions_eclair').update({ statut: 'fermee' }).eq('id', q.id).eq('statut', 'ouverte').select();
      if (!verrou || verrou.length === 0) continue;
      await tirerGagnantsQuestionEclair(q.id, supabaseAdmin);
      traitees++;
    }

    await enregistrerAlerte(supabaseAdmin, 'cron_question_eclair', 'Passage exécuté avec succès, ' + traitees + ' question(s) traitée(s).', 'info');
    return Response.json({ success: true, traitees });
  } catch (e: any) {
    await enregistrerAlerte(supabaseAdmin, 'cron_question_eclair', 'Échec du passage cron : ' + (e?.message || 'erreur inconnue'), 'erreur');
    return Response.json({ error: 'Erreur interne, alerte enregistrée.' }, { status: 500 });
  }
}
