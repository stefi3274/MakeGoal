import { createClient } from '@supabase/supabase-js';
import { QUIZZ_FOOT_SEUIL_POURCENTAGE } from '../../../lib/points';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string
);

// 10 questions x 10 secondes + marge de sécurité réseau.
const DELAI_MAX_MS = 10 * 10 * 1000 + 60 * 1000;

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

  const { quizzId, reponses } = await request.json();
  if (!quizzId || !reponses) return Response.json({ error: 'Données manquantes' }, { status: 400 });

  const { data: participation } = await supabaseAdmin
    .from('quizz_foot_participations').select('id, termine, debute_at').eq('quizz_id', quizzId).eq('user_id', userId).maybeSingle();
  if (!participation) return Response.json({ error: "Vous n'avez pas commencé ce FootQuizz." }, { status: 400 });
  if (participation.termine) return Response.json({ error: 'Vous avez déjà soumis vos réponses.' }, { status: 409 });

  const ecoule = Date.now() - new Date(participation.debute_at).getTime();
  if (ecoule > DELAI_MAX_MS) {
    return Response.json({ error: 'Le temps imparti est dépassé pour ce FootQuizz.' }, { status: 400 });
  }

  const { data: quizz } = await supabaseAdmin.from('quizz_foot').select('questions').eq('id', quizzId).single();
  if (!quizz) return Response.json({ error: 'Quizz introuvable' }, { status: 404 });

  const questions = quizz.questions as { id: string; bonne_reponse: string }[];
  let score = 0;
  questions.forEach(q => {
    const donnee = reponses[q.id];
    if (donnee && String(donnee).trim().toLowerCase() === q.bonne_reponse.trim().toLowerCase()) score++;
  });
  const pourcentage = Math.round((score / questions.length) * 100);

  const { error: erreurMaj } = await supabaseAdmin
    .from('quizz_foot_participations')
    .update({ reponses, score, pourcentage, termine: true, termine_at: new Date().toISOString() })
    .eq('id', participation.id);
  if (erreurMaj) return Response.json({ error: erreurMaj.message }, { status: 500 });

  return Response.json({
    score, total: questions.length, pourcentage,
    eligible: pourcentage >= QUIZZ_FOOT_SEUIL_POURCENTAGE
  });
}
