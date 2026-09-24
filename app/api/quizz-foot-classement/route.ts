import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string
);

// Classement d'un FootQuizz : score décroissant, puis temps croissant
// (le plus rapide départage à score égal). Réservé à l'admin — sert à
// pré-remplir un post "Classement" prêt à publier.
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

  const { data: quizz } = await supabaseAdmin.from('quizz_foot').select('titre').eq('id', quizzId).single();
  if (!quizz) return Response.json({ error: 'Quizz introuvable' }, { status: 404 });

  const { data: participations, error } = await supabaseAdmin
    .from('quizz_foot_participations')
    .select('user_id, score, pourcentage, debute_at, termine_at')
    .eq('quizz_id', quizzId).eq('termine', true);
  if (error) return Response.json({ error: error.message }, { status: 500 });

  const resultats = await Promise.all((participations || []).map(async p => {
    const { data: u } = await supabaseAdmin.auth.admin.getUserById(p.user_id);
    const nom = u?.user?.user_metadata?.username || u?.user?.email?.split('@')[0] || 'Joueur';
    const tempsSecondes = p.termine_at ? Math.max(0, Math.round((new Date(p.termine_at).getTime() - new Date(p.debute_at).getTime()) / 1000)) : null;
    return { nom, score: p.score ?? 0, pourcentage: p.pourcentage ?? 0, tempsSecondes };
  }));

  resultats.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return (a.tempsSecondes ?? 999999) - (b.tempsSecondes ?? 999999);
  });

  return Response.json({ titre: quizz.titre, resultats });
}
