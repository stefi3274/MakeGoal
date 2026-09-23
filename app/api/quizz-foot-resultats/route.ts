import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string
);

// Résultats détaillés d'un FootQuizz, réservés à l'admin (jamais affichés
// publiquement). Sert à préparer manuellement le post "Gagnants" une fois
// le tirage effectué.
export async function GET(request: Request) {
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
  if (!adminData) return Response.json({ error: 'Accès réservé aux administrateurs' }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const quizzId = searchParams.get('quizzId');
  if (!quizzId) return Response.json({ error: 'quizzId manquant' }, { status: 400 });

  const { data: participations, error } = await supabaseAdmin
    .from('quizz_foot_participations')
    .select('user_id, score, pourcentage, termine, gagnant, termine_at')
    .eq('quizz_id', quizzId)
    .order('score', { ascending: false });
  if (error) return Response.json({ error: error.message }, { status: 500 });

  const resultats = await Promise.all((participations || []).map(async p => {
    const { data: u } = await supabaseAdmin.auth.admin.getUserById(p.user_id);
    const nom = u?.user?.user_metadata?.username || u?.user?.email?.split('@')[0] || 'Joueur';
    return { nom, score: p.score, pourcentage: p.pourcentage, termine: p.termine, gagnant: p.gagnant };
  }));

  return Response.json({ resultats });
}
