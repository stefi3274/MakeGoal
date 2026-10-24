import { createClient } from '@supabase/supabase-js';
import { tirerGagnantsQuestionEclair } from '../../../lib/points';

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

  const { data: adminData } = await supabaseAdmin
    .from('admins').select('user_id').eq('user_id', userData.user.id).single();
  if (!adminData) {
    return Response.json({ error: 'Accès réservé aux administrateurs' }, { status: 403 });
  }

  const { questionId } = await request.json();
  if (!questionId) return Response.json({ error: 'questionId manquant' }, { status: 400 });

  // Ferme d'abord la question pour qu'aucune nouvelle réponse n'arrive pendant le tirage
  await supabaseAdmin.from('questions_eclair').update({ statut: 'fermee' }).eq('id', questionId).eq('statut', 'ouverte');

  const resultat = await tirerGagnantsQuestionEclair(questionId, supabaseAdmin);
  if (!resultat.ok) return Response.json({ error: resultat.erreur }, { status: 400 });

  return Response.json({ success: true, nombreGagnants: resultat.gagnants?.length || 0 });
}
