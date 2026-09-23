import { createClient } from '@supabase/supabase-js';
import { tirerGagnantsQuizzFoot } from '../../../lib/points';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string
);

// Déclenché depuis le navigateur d'un visiteur quand son chrono local
// atteint zéro (comme Question Éclair). Le tirage lui-même reste privé :
// cette route ne renvoie jamais les gagnants, seulement une confirmation.
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
  // l'instant précis de cette requête (protège contre le double-tirage si
  // plusieurs visiteurs déclenchent en même temps).
  const { data: verrou } = await supabaseAdmin
    .from('quizz_foot').update({ statut: 'ferme' }).eq('id', quizzId).eq('statut', 'ouvert').select();
  if (!verrou || verrou.length === 0) {
    return Response.json({ success: true, dejaFerme: true });
  }

  const resultat = await tirerGagnantsQuizzFoot(quizzId, supabaseAdmin);
  if (!resultat.ok) return Response.json({ error: resultat.erreur }, { status: 400 });

  return Response.json({ success: true });
}
