import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string
);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const questionId = searchParams.get('questionId');
  if (!questionId) return Response.json({ error: 'questionId manquant' }, { status: 400 });

  const { data: question } = await supabaseAdmin
    .from('questions_eclair').select('statut, bonne_reponse').eq('id', questionId).single();
  if (!question) return Response.json({ error: 'Question introuvable' }, { status: 404 });

  if (question.statut !== 'tiree') {
    return Response.json({ termine: false });
  }

  const { data: gagnantsIds } = await supabaseAdmin
    .from('reponses_eclair').select('user_id').eq('question_id', questionId).eq('gagnant', true);

  const gagnants = await Promise.all((gagnantsIds || []).map(async g => {
    const { data: u } = await supabaseAdmin.auth.admin.getUserById(g.user_id);
    return u?.user?.user_metadata?.username || u?.user?.email?.split('@')[0] || 'Joueur';
  }));

  return Response.json({ termine: true, bonneReponse: question.bonne_reponse, gagnants });
}
