import { createClient } from '@supabase/supabase-js';
import { parrainageDirectViaLien } from '../../../lib/points';

// Client admin avec la clé service_role (côté serveur uniquement)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string
);

export async function POST(request: Request) {
  // 1. Vérifier le token de l'utilisateur qui appelle (le nouvel inscrit lui-même)
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return Response.json({ error: 'Non autorisé' }, { status: 401 });
  }
  const token = authHeader.replace('Bearer ', '');

  const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
  if (userError || !userData.user) {
    return Response.json({ error: 'Session invalide' }, { status: 401 });
  }

  // 2. On ne fait JAMAIS confiance à un "nouvelUserId" envoyé par le client :
  // c'est toujours l'utilisateur authentifié par son propre token qui est crédité.
  const nouvelUserId = userData.user.id;

  const { parrainId } = await request.json();
  if (!parrainId) {
    return Response.json({ error: 'parrainId manquant' }, { status: 400 });
  }
  if (parrainId === nouvelUserId) {
    return Response.json({ error: 'Impossible de se parrainer soi-même' }, { status: 400 });
  }

  // 3. Vérifier qu'un parrainage n'a pas déjà été enregistré pour ce nouvel utilisateur
  // (empêche qu'un même compte se fasse créditer plusieurs fois en rappelant la route)
  const { data: existant } = await supabaseAdmin
    .from('parrainages').select('id').eq('filleul_id', nouvelUserId).maybeSingle();
  if (existant) {
    return Response.json({ error: 'Parrainage déjà enregistré pour ce compte' }, { status: 409 });
  }

  // 4. Vérifier que le parrain existe réellement
  const { data: parrain } = await supabaseAdmin.auth.admin.getUserById(parrainId);
  if (!parrain?.user) {
    return Response.json({ error: 'Parrain introuvable' }, { status: 404 });
  }

  const resultat = await parrainageDirectViaLien(parrainId, nouvelUserId, supabaseAdmin);
  if (!resultat.ok) {
    return Response.json({ error: resultat.erreur }, { status: 400 });
  }

  return Response.json({ success: true });
}
