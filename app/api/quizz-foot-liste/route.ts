import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string
);

// Liste publique des FootQuizz. Ne renvoie JAMAIS les bonnes réponses ici
// (question complète avec bonne_reponse reste côté serveur jusqu'à la
// correction). Si un token utilisateur est fourni, on renvoie aussi son
// statut de participation (pas commencé / en cours / terminé + score).
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sport = searchParams.get('sport') || 'football';

  const { data: quizzes, error } = await supabaseAdmin
    .from('quizz_foot')
    .select('id, titre, sport, statut, date_fermeture, created_at')
    .eq('sport', sport)
    .order('created_at', { ascending: false })
    .limit(10);
  if (error) return Response.json({ error: error.message }, { status: 500 });

  let userId: string | null = null;
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const { data: userData } = await supabaseAdmin.auth.getUser(authHeader.replace('Bearer ', ''));
    userId = userData.user?.id || null;
  }

  let participations: Record<string, { termine: boolean; score: number | null; pourcentage: number | null }> = {};
  if (userId && quizzes && quizzes.length > 0) {
    const { data: parts } = await supabaseAdmin
      .from('quizz_foot_participations')
      .select('quizz_id, termine, score, pourcentage')
      .eq('user_id', userId)
      .in('quizz_id', quizzes.map(q => q.id));
    if (parts) {
      parts.forEach(p => { participations[p.quizz_id] = { termine: p.termine, score: p.score, pourcentage: p.pourcentage }; });
    }
  }

  return Response.json({ quizzes: quizzes || [], participations });
}
