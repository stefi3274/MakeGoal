import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string
);

// Déclenché depuis le navigateur d'un visiteur quand son chrono local
// atteint zéro (comme Question Éclair). Ne fait QUE fermer le quizz (plus
// aucune nouvelle tentative) — le tirage au sort des gagnants reste une
// action manuelle de l'admin, déclenchée depuis /admin/quizz-foot.
export async function POST(request: Request) {
  const { quizzId } = await request.json();
  if (!quizzId) return Response.json({ error: 'quizzId manquant' }, { status: 400 });

  const { data: quizz } = await supabaseAdmin
    .from('quizz_foot').select('statut, date_fermeture').eq('id', quizzId).single();
  if (!quizz) return Response.json({ error: 'Quizz introuvable' }, { status: 404 });

  if (quizz.statut !== 'ouvert') {
    return Response.json({ success: true, dejaFerme: true });
  }
  if (!quizz.date_fermeture || new Date(quizz.date_fermeture) > new Date()) {
    return Response.json({ error: "Le temps n'est pas encore écoulé." }, { status: 400 });
  }

  // Fermeture atomique : ne procède que si le quizz était encore ouvert à
  // l'instant précis de cette requête.
  await supabaseAdmin.from('quizz_foot').update({ statut: 'ferme' }).eq('id', quizzId).eq('statut', 'ouvert');

  return Response.json({ success: true });
}
