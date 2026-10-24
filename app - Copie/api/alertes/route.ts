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

  const { data: alertes } = await supabaseAdmin
    .from('alertes_systeme').select('*').order('created_at', { ascending: false }).limit(50);

  const { data: dernierCron } = await supabaseAdmin
    .from('alertes_systeme').select('created_at').eq('source', 'cron_question_eclair').order('created_at', { ascending: false }).limit(1).maybeSingle();

  return Response.json({ alertes: alertes || [], dernierCronOk: dernierCron?.created_at || null });
}
