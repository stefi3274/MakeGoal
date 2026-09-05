import { createClient } from '@supabase/supabase-js';
import { demanderRetraitParis } from '../../../lib/paris';

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

  // Toujours le compte authentifié lui-même, jamais un id fourni par le client
  const resultat = await demanderRetraitParis(userData.user.id, supabaseAdmin);
  if (!resultat.ok) return Response.json({ error: resultat.erreur }, { status: 400 });

  return Response.json({ success: true, montant: resultat.montant });
}
