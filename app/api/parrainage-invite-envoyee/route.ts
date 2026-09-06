import { createClient } from '@supabase/supabase-js';
import { parrainageInviteEnvoyee } from '../../../lib/points';
import { limiteParrainage, verifierLimite } from '../../../lib/rateLimit';

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

  const { email } = await request.json();
  if (!email || typeof email !== 'string') {
    return Response.json({ error: 'Email manquant' }, { status: 400 });
  }

  const limiteDepassee = await verifierLimite(limiteParrainage, userData.user.id);
  if (limiteDepassee) return limiteDepassee;

  const resultat = await parrainageInviteEnvoyee(userData.user.id, email.trim().toLowerCase(), supabaseAdmin);
  if (!resultat.ok) return Response.json({ error: resultat.erreur }, { status: 400 });

  return Response.json({ success: true, invitationId: resultat.invitationId });
}
