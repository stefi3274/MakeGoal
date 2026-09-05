import { createClient } from '@supabase/supabase-js';
import { resoudreCombinesPourMatch } from '../../../lib/paris';

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

  const { matchId, resultat } = await request.json();
  if (!matchId || !['1', 'X', '2'].includes(resultat)) {
    return Response.json({ error: 'matchId et resultat (1, X ou 2) sont obligatoires' }, { status: 400 });
  }

  const resultatFinal = await resoudreCombinesPourMatch(matchId, resultat, supabaseAdmin);
  if (!resultatFinal.ok) return Response.json({ error: 'Erreur lors de la résolution' }, { status: 500 });

  return Response.json({ success: true, combinesTraites: resultatFinal.traites });
}
