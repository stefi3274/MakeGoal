import { createClient } from '@supabase/supabase-js';
import { tirerGagnantsQuestionEclair } from '../../../lib/points';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string
);

export async function POST(request: Request) {
  const { questionId } = await request.json();
  if (!questionId) return Response.json({ error: 'questionId manquant' }, { status: 400 });

  const { data: question } = await supabaseAdmin
    .from('questions_eclair').select('statut, date_fermeture').eq('id', questionId).single();
  if (!question) return Response.json({ error: 'Question introuvable' }, { status: 404 });

  if (question.statut !== 'ouverte') {
    return Response.json({ success: true, dejaFerme: true });
  }
  if (!question.date_fermeture || new Date(question.date_fermeture) > new Date()) {
    return Response.json({ error: "Le temps n'est pas encore écoulé." }, { status: 400 });
  }

  // Fermeture "atomique" : ne procède que si la question était encore ouverte à
  // l'instant précis de cette requête. Si un autre visiteur a déclenché la même
  // chose une milliseconde avant, cette condition échoue et on ne double-tire pas.
  const { data: verrou } = await supabaseAdmin
    .from('questions_eclair').update({ statut: 'fermee' }).eq('id', questionId).eq('statut', 'ouverte').select();
  if (!verrou || verrou.length === 0) {
    return Response.json({ success: true, dejaFerme: true });
  }

  const resultat = await tirerGagnantsQuestionEclair(questionId, supabaseAdmin);
  if (!resultat.ok) return Response.json({ error: resultat.erreur }, { status: 400 });

  return Response.json({ success: true, nombreGagnants: resultat.gagnants?.length || 0 });
}
