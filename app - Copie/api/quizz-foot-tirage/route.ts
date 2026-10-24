import { createClient } from '@supabase/supabase-js';
import { tirerGagnantsQuizzFoot } from '../../../lib/points';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string
);

// Déclenchement manuel par un admin depuis /admin/quizz-foot.
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

  const { quizzId } = await request.json();
  if (!quizzId) return Response.json({ error: 'quizzId manquant' }, { status: 400 });

  // Ferme d'abord le quizz pour qu'aucune nouvelle tentative n'arrive pendant le tirage
  await supabaseAdmin.from('quizz_foot').update({ statut: 'ferme' }).eq('id', quizzId).eq('statut', 'ouvert');

  const resultat = await tirerGagnantsQuizzFoot(quizzId, supabaseAdmin);
  if (!resultat.ok) return Response.json({ error: resultat.erreur }, { status: 400 });

  return Response.json({ success: true, nombreGagnants: resultat.gagnants?.length || 0 });
}
