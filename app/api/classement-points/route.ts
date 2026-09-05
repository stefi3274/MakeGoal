import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string
);

export async function GET(request: Request) {
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

  const { data: soldes, error } = await supabaseAdmin
    .from('points_soldes')
    .select('user_id, solde')
    .order('solde', { ascending: false })
    .limit(10);

  if (error) return Response.json({ error: error.message }, { status: 500 });
  if (!soldes || soldes.length === 0) return Response.json({ classement: [] });

  const classement = [];
  for (const ligne of soldes) {
    const { data: u } = await supabaseAdmin.auth.admin.getUserById(ligne.user_id);
    const nom = u?.user?.user_metadata?.username || u?.user?.email?.split('@')[0] || ('Joueur ' + ligne.user_id.slice(0, 6));
    classement.push({ nom, solde: ligne.solde });
  }

  return Response.json({ classement });
}
