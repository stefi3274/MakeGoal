import { createClient } from '@supabase/supabase-js';
import { octroyerBonusAdmin, initialiserSoldeParis } from '../../../lib/paris';

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

  const { data: adminData } = await supabaseAdmin
    .from('admins').select('user_id').eq('user_id', userData.user.id).single();
  if (!adminData) {
    return Response.json({ error: 'Accès réservé aux administrateurs' }, { status: 403 });
  }

  const { userId: cibleId, montant, email } = await request.json();
  let vraiUserId = cibleId;

  // Permet de cibler par email si l'admin n'a pas l'ID sous la main
  if (!vraiUserId && email) {
    const { data: liste } = await supabaseAdmin.auth.admin.listUsers();
    const trouve = liste?.users.find(u => u.email?.toLowerCase() === email.toLowerCase());
    if (!trouve) return Response.json({ error: 'Aucun compte trouvé avec cet email' }, { status: 404 });
    vraiUserId = trouve.id;
  }

  if (!vraiUserId || !montant || montant <= 0) {
    return Response.json({ error: 'userId (ou email) et montant sont obligatoires' }, { status: 400 });
  }

  // Crée le compte de paris s'il n'existait pas encore
  await initialiserSoldeParis(vraiUserId, supabaseAdmin);

  const resultat = await octroyerBonusAdmin(vraiUserId, montant, supabaseAdmin);
  if (!resultat.ok) return Response.json({ error: resultat.erreur }, { status: 400 });

  return Response.json({ success: true, nouveauSolde: resultat.nouveauSolde });
}
