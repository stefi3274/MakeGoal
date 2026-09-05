import { createClient } from '@supabase/supabase-js';
import { tirerGagnantsQuestionEclair } from '../../../../lib/points';

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

  const { data: questionsExpirees } = await supabaseAdmin
    .from('questions_eclair')
    .select('id')
    .eq('statut', 'ouverte')
    .lte('date_fermeture', new Date().toISOString());

  if (!questionsExpirees || questionsExpirees.length === 0) {
    return Response.json({ success: true, traitees: 0 });
  }

  let traitees = 0;
  for (const q of questionsExpirees) {
    // Même verrou "atomique" que la route déclenchée par les visiteurs : on ne
    // traite que si la question est encore réellement ouverte à cet instant.
    const { data: verrou } = await supabaseAdmin
      .from('questions_eclair').update({ statut: 'fermee' }).eq('id', q.id).eq('statut', 'ouverte').select();
    if (!verrou || verrou.length === 0) continue;
    await tirerGagnantsQuestionEclair(q.id, supabaseAdmin);
    traitees++;
  }

  return Response.json({ success: true, traitees });
}
