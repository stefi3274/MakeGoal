import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string
);

const TAUX_CONVERSION_POINTS = 0.20; // 10 000 points = 2 000 Gourdes

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

  // Points : seul ce qui dépasse 10 000 (seuil de conversion) est vraiment
  // "convertible" à tout moment, mais on compte large : la totalité du solde
  // de chaque compte, au taux de conversion, comme exposition maximale.
  const { data: pointsSoldes } = await supabaseAdmin.from('points_soldes').select('solde');
  const totalPointsEnCirculation = (pointsSoldes || []).reduce((s, p) => s + (p.solde || 0), 0);
  const expositionPoints = Math.round(totalPointsEnCirculation * TAUX_CONVERSION_POINTS);

  // Paris : le solde virtuel total en circulation n'est dû que si chaque
  // compte atteint l'objectif ET demande son retrait fixe de 1000G — on
  // affiche donc deux chiffres : le solde virtuel total, et l'exposition
  // réelle maximale (1000G par compte ayant déjà atteint l'objectif).
  const { data: parisSoldes } = await supabaseAdmin
    .from('paris_soldes').select('solde, mise_cumulee_valide, retire');
  const totalParisEnCirculation = (parisSoldes || []).reduce((s, p) => s + (p.solde || 0), 0);
  const comptesEligiblesRetrait = (parisSoldes || []).filter(p => p.mise_cumulee_valide >= 25000 && !p.retire).length;
  const expositionParisMax = comptesEligiblesRetrait * 1000;

  // Montants déjà validés mais pas encore payés (obligation ferme et immédiate)
  const { data: conversionsEnAttente } = await supabaseAdmin
    .from('conversions').select('montant_gourdes').eq('statut', 'en_attente');
  const totalConversionsEnAttente = (conversionsEnAttente || []).reduce((s, c) => s + (c.montant_gourdes || 0), 0);

  const { data: retraitsEnAttente } = await supabaseAdmin
    .from('paris_retraits').select('montant').eq('statut', 'en_attente');
  const totalRetraitsEnAttente = (retraitsEnAttente || []).reduce((s, r) => s + (r.montant || 0), 0);

  const obligationImmediate = totalConversionsEnAttente + totalRetraitsEnAttente;
  const expositionTotaleMax = expositionPoints + expositionParisMax + obligationImmediate;

  return Response.json({
    points: {
      totalEnCirculation: totalPointsEnCirculation,
      expositionGourdes: expositionPoints,
      nombreComptes: (pointsSoldes || []).length
    },
    paris: {
      totalSoldeVirtuel: totalParisEnCirculation,
      comptesEligiblesRetrait,
      expositionMaxGourdes: expositionParisMax,
      nombreComptes: (parisSoldes || []).length
    },
    obligationImmediate: {
      conversions: totalConversionsEnAttente,
      retraits: totalRetraitsEnAttente,
      total: obligationImmediate
    },
    expositionTotaleMax
  });
}
