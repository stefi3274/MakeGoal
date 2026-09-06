import { createClient } from '@supabase/supabase-js';
import { demanderConversion } from '../../../lib/points';
import { limiteConversion, verifierLimite } from '../../../lib/rateLimit';

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

  // On ne fait jamais confiance à un userId envoyé par le client : c'est
  // toujours le compte authentifié par son propre token qui est débité.
  const userId = userData.user.id;

  const limiteDepassee = await verifierLimite(limiteConversion, userId);
  if (limiteDepassee) return limiteDepassee;

  const { points } = await request.json();
  const pointsAConvertir = parseInt(points);
  if (!pointsAConvertir || pointsAConvertir <= 0) {
    return Response.json({ error: 'Nombre de points invalide' }, { status: 400 });
  }

  const resultat = await demanderConversion(userId, pointsAConvertir, supabaseAdmin);
  if (!resultat.ok) {
    return Response.json({ error: resultat.erreur }, { status: 400 });
  }

  return Response.json({ success: true, montantGourdes: resultat.montantGourdes, conversionId: resultat.conversionId });
}
