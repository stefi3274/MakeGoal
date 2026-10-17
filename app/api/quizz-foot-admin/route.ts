import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string
);

const NB_QUESTIONS = 10;
import { TYPES_QUIZZ, typeValide } from '../../../lib/quizzTypes';
import { sponsorsPublies } from '../../../lib/promo';

// La table quizz_foot est verrouillée (aucun accès direct depuis le navigateur).
// L'admin passe donc par cette route : lecture de la liste et création d'un quizz.
async function verifierAdmin(request: Request): Promise<Response | null> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return Response.json({ error: 'Non autorisé' }, { status: 401 });
  }
  const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(authHeader.replace('Bearer ', ''));
  if (userError || !userData.user) {
    return Response.json({ error: 'Session invalide, reconnectez-vous.' }, { status: 401 });
  }
  const { data: adminData } = await supabaseAdmin
    .from('admins').select('user_id').eq('user_id', userData.user.id).single();
  if (!adminData) {
    return Response.json({ error: 'Accès réservé aux administrateurs' }, { status: 403 });
  }
  return null;
}

export async function GET(request: Request) {
  const refus = await verifierAdmin(request);
  if (refus) return refus;
  const { data, error } = await supabaseAdmin
    .from('quizz_foot')
    .select('id, titre, sport, statut, date_fermeture, created_at, questions, sponsors')
    .order('created_at', { ascending: false })
    .limit(60);
  if (error) {
    // Colonne « sponsors » pas encore créée : on relit sans elle pour ne rien casser.
    const r2 = await supabaseAdmin.from('quizz_foot').select('id, titre, sport, statut, date_fermeture, created_at, questions').order('created_at', { ascending: false }).limit(60);
    if (r2.error) return Response.json({ error: r2.error.message }, { status: 500 });
    return Response.json({ quizzes: r2.data || [] });
  }
  return Response.json({ quizzes: data || [] });
}

type OptionQ = { cle: string; texte: string };
type QuestionQ = { id?: string; question: string; options: OptionQ[]; bonne_reponse: string };

export async function POST(request: Request) {
  const refus = await verifierAdmin(request);
  if (refus) return refus;

  const body = await request.json().catch(() => null) as { titre?: string; sport?: string; type?: string; sponsors?: { nom?: string; logo?: string }[]; questions?: QuestionQ[] } | null;
  const titre = (body?.titre || '').trim();
  const sport = body?.sport === 'basketball' ? 'basketball' : 'football';
  const questions = body?.questions;
  const duree = TYPES_QUIZZ[typeValide(body?.type)].heures;
  if (!titre) return Response.json({ error: 'Le titre est obligatoire.' }, { status: 400 });
  if (!Array.isArray(questions) || questions.length !== NB_QUESTIONS) {
    return Response.json({ error: 'Il faut exactement ' + NB_QUESTIONS + ' questions.' }, { status: 400 });
  }
  const propres: QuestionQ[] = [];
  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    const options = (q.options || []).filter(o => o && (o.texte || '').trim()).map(o => ({ cle: o.cle, texte: o.texte.trim() }));
    if (!(q.question || '').trim() || options.length < 2) {
      return Response.json({ error: 'La question ' + (i + 1) + ' doit avoir un texte et au moins 2 options.' }, { status: 400 });
    }
    if (!options.some(o => o.cle === q.bonne_reponse)) {
      return Response.json({ error: 'La question ' + (i + 1) + ' : la bonne réponse doit correspondre à une option remplie.' }, { status: 400 });
    }
    propres.push({ id: 'q' + (i + 1), question: q.question.trim(), options, bonne_reponse: q.bonne_reponse });
  }

  const sponsors = sponsorsPublies((body?.sponsors || []).map(x => ({ nom: (x.nom || '').trim(), logo: x.logo || '' })));
  const ligne = {
    titre, sport, questions: propres, statut: 'ouvert',
    date_fermeture: new Date(Date.now() + duree * 3600 * 1000).toISOString(),
  };
  // La colonne « sponsors » n'est envoyée que s'il y en a : tant que le SQL n'est pas passé, rien ne casse.
  let { error } = await supabaseAdmin.from('quizz_foot').insert(sponsors.length ? { ...ligne, sponsors } : ligne);
  if (error && sponsors.length && /sponsors/i.test(error.message)) {
    return Response.json({ error: "La colonne « sponsors » n'existe pas encore : lance d'abord le SQL fourni, puis recrée le quizz." }, { status: 500 });
  }
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ success: true });
}
