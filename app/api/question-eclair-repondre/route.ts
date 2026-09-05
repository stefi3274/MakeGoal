import { createClient } from '@supabase/supabase-js';

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
  const userId = userData.user.id;

  const { questionId, reponse } = await request.json();
  if (!questionId || !reponse) {
    return Response.json({ error: 'Réponse manquante' }, { status: 400 });
  }

  const { data: question } = await supabaseAdmin
    .from('questions_eclair').select('statut, bonne_reponse').eq('id', questionId).single();
  if (!question) return Response.json({ error: 'Question introuvable' }, { status: 404 });
  if (question.statut !== 'ouverte') return Response.json({ error: 'Cette question est fermée.' }, { status: 400 });

  const { data: dejaRepondu } = await supabaseAdmin
    .from('reponses_eclair').select('id').eq('question_id', questionId).eq('user_id', userId).maybeSingle();
  if (dejaRepondu) return Response.json({ error: 'Vous avez déjà répondu à cette question.' }, { status: 409 });

  const correcte = reponse.trim().toLowerCase() === question.bonne_reponse.trim().toLowerCase();

  const { error } = await supabaseAdmin.from('reponses_eclair').insert({
    question_id: questionId, user_id: userId, reponse, correcte
  });
  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ success: true, correcte });
}
