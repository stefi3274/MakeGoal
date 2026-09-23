import { createClient } from '@supabase/supabase-js';
import { limiteQuizzFoot, verifierLimite } from '../../../lib/rateLimit';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string
);

// Réserve la tentative (une seule fois par utilisateur et par quizz) et
// renvoie les 10 questions SANS la bonne réponse. Le chrono (1 min par
// question, 10 questions) est affiché côté client mais la correction
// finale est toujours vérifiée côté serveur avec un délai de grâce.
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

  const limiteDepassee = await verifierLimite(limiteQuizzFoot, userId);
  if (limiteDepassee) return limiteDepassee;

  const { quizzId } = await request.json();
  if (!quizzId) return Response.json({ error: 'quizzId manquant' }, { status: 400 });

  const { data: quizz } = await supabaseAdmin
    .from('quizz_foot').select('statut, date_fermeture, questions').eq('id', quizzId).single();
  if (!quizz) return Response.json({ error: 'Quizz introuvable' }, { status: 404 });
  if (quizz.statut !== 'ouvert') return Response.json({ error: 'Ce FootQuizz est fermé.' }, { status: 400 });
  if (new Date(quizz.date_fermeture) <= new Date()) return Response.json({ error: 'Le temps est écoulé pour ce FootQuizz.' }, { status: 400 });

  const { data: dejaCommence } = await supabaseAdmin
    .from('quizz_foot_participations').select('id, termine').eq('quizz_id', quizzId).eq('user_id', userId).maybeSingle();
  if (dejaCommence) {
    return Response.json({ error: dejaCommence.termine ? 'Vous avez déjà fait ce FootQuizz.' : 'Vous avez déjà commencé ce FootQuizz.' }, { status: 409 });
  }

  const { error: erreurInsert } = await supabaseAdmin.from('quizz_foot_participations').insert({
    quizz_id: quizzId, user_id: userId, debute_at: new Date().toISOString(), termine: false, reponses: {}
  });
  if (erreurInsert) return Response.json({ error: erreurInsert.message }, { status: 500 });

  const questionsSansReponses = (quizz.questions as any[]).map(q => ({ id: q.id, question: q.question, options: q.options }));
  return Response.json({ questions: questionsSansReponses });
}
