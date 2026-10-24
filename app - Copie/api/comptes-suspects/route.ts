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

  const { data: journal } = await supabaseAdmin
    .from('signup_ip_log').select('user_id, ip_address, created_at').order('created_at', { ascending: true });

  if (!journal) return Response.json({ groupes: [] });

  const parIp: Record<string, { user_id: string; created_at: string }[]> = {};
  for (const ligne of journal) {
    if (ligne.ip_address === 'inconnue') continue;
    if (!parIp[ligne.ip_address]) parIp[ligne.ip_address] = [];
    parIp[ligne.ip_address].push({ user_id: ligne.user_id, created_at: ligne.created_at });
  }

  const groupesSuspects = Object.entries(parIp).filter(([, comptes]) => comptes.length >= 2);

  const groupes = await Promise.all(groupesSuspects.map(async ([ip, comptes]) => {
    const comptesAvecNom = await Promise.all(comptes.map(async c => {
      const { data: u } = await supabaseAdmin.auth.admin.getUserById(c.user_id);
      const nom = u?.user?.user_metadata?.username || u?.user?.email || c.user_id.slice(0, 8);
      return { nom, createdAt: c.created_at };
    }));
    return { ip, comptes: comptesAvecNom };
  }));

  return Response.json({ groupes });
}
