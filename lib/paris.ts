import { supabase } from './supabase';
import type { SupabaseClient } from '@supabase/supabase-js';

// ============================================================
// MOTEUR DE PARIS — MakeGoal (v2)
// - 1 000 Gourdes virtuelles à l'inscription
// - Paris COMBINÉS uniquement : 10 sélections minimum
// - Cote ≥ 2.00 par sélection pour que la mise compte dans
//   l'objectif de mise cumulée (25 × 1 000 = 25 000 Gourdes)
// - Mise minimum : 100 Gourdes par combiné
// - Si UNE SEULE sélection est perdante sur les 10+ : la mise est
//   REMBOURSÉE (ni gain, ni perte). 2 pertes ou plus : mise perdue.
//   0 perte : gain complet (mise × cote totale).
// - Une fois l'objectif de mise cumulée atteint, l'utilisateur peut
//   À TOUT MOMENT choisir de retirer 1 000 Gourdes (montant fixe,
//   peu importe le solde réel), ou continuer à parier avec son
//   solde actuel. Le retrait ne se déclenche jamais automatiquement.
// ============================================================

const SOLDE_INITIAL = 1000;
const COTE_MIN_QUALIFIANTE = 2.00;
const SELECTIONS_MIN = 10;
const MISE_MIN = 100;
const OBJECTIF_MISE_CUMULEE = 25000; // 25 × 1 000
const MONTANT_RETRAIT = 1000;

export type Pronostic = '1' | 'X' | '2';

export type SelectionPari = {
  matchId: string;
  pronostic: Pronostic;
  cote: number;
};

// ------------------------------------------------------------
// Initialisation : appelé une fois à l'inscription d'un compte
// ------------------------------------------------------------
export async function initialiserSoldeParis(userId: string, client: SupabaseClient = supabase) {
  const { data: existant } = await client
    .from('paris_soldes').select('user_id').eq('user_id', userId).maybeSingle();
  if (existant) return { ok: true, dejaExistant: true };

  const { error } = await client.from('paris_soldes').insert({
    user_id: userId, solde: SOLDE_INITIAL, mise_cumulee_valide: 0, retire: false
  });
  if (error) return { ok: false, erreur: error.message };
  return { ok: true };
}

// ------------------------------------------------------------
// Lecture du solde de paris
// ------------------------------------------------------------
export async function soldeParis(userId: string, client: SupabaseClient = supabase) {
  const { data } = await client.from('paris_soldes').select('*').eq('user_id', userId).single();
  return data as { user_id: string; solde: number; mise_cumulee_valide: number; retire: boolean } | null;
}

// ------------------------------------------------------------
// Placer un pari combiné (10 sélections minimum, mise ≥ 100 Gourdes)
// ------------------------------------------------------------
export async function placerCombine(
  userId: string,
  mise: number,
  selections: SelectionPari[],
  client: SupabaseClient = supabase
) {
  if (selections.length < SELECTIONS_MIN) {
    return { ok: false, erreur: 'Un pari combiné doit contenir au moins ' + SELECTIONS_MIN + ' sélections.' };
  }
  if (mise < MISE_MIN) {
    return { ok: false, erreur: 'La mise minimum est de ' + MISE_MIN + ' Gourdes.' };
  }

  const solde = await soldeParis(userId, client);
  if (!solde) return { ok: false, erreur: 'Compte de paris introuvable.' };
  if (mise > solde.solde) return { ok: false, erreur: 'Solde insuffisant (solde actuel : ' + solde.solde + ' Gourdes).' };

  const coteTotale = selections.reduce((acc, s) => acc * s.cote, 1);
  const gainPotentiel = Math.round(mise * coteTotale * 100) / 100;
  const miseQualifiante = selections.every(s => s.cote >= COTE_MIN_QUALIFIANTE);

  const { data: combine, error } = await client.from('paris_combines').insert({
    user_id: userId, mise, cote_totale: coteTotale, gain_potentiel: gainPotentiel,
    statut: 'en_attente', mise_qualifiante: miseQualifiante
  }).select().single();
  if (error) return { ok: false, erreur: error.message };

  const lignes = selections.map(s => ({
    combine_id: combine.id, match_id: s.matchId, pronostic: s.pronostic, cote: s.cote, statut: 'en_attente'
  }));
  const { error: erreurLignes } = await client.from('paris_selections').insert(lignes);
  if (erreurLignes) return { ok: false, erreur: erreurLignes.message };

  // Débit immédiat de la mise
  const { error: erreurSolde } = await client
    .from('paris_soldes').update({ solde: solde.solde - mise }).eq('user_id', userId);
  if (erreurSolde) return { ok: false, erreur: erreurSolde.message };

  return { ok: true, combineId: combine.id, coteTotale, gainPotentiel, miseQualifiante };
}

// ------------------------------------------------------------
// ⚠️ RÉSERVÉ AU SERVEUR (route API avec service_role) : résout
// tous les combinés en attente qui contiennent ce match, une fois
// son résultat réel connu. Ne JAMAIS appeler depuis le navigateur.
//
// Règle : 0 sélection perdante = gain complet. Exactement 1 = mise
// remboursée. 2 ou plus = mise perdue.
// ------------------------------------------------------------
export async function resoudreCombinesPourMatch(
  matchId: string,
  resultatReel: Pronostic,
  client: SupabaseClient = supabase
) {
  const { data: selections } = await client
    .from('paris_selections').select('*').eq('match_id', matchId).eq('statut', 'en_attente');
  if (!selections || selections.length === 0) return { ok: true, traites: 0 };

  for (const sel of selections) {
    const correcte = sel.pronostic === resultatReel;
    await client.from('paris_selections')
      .update({ statut: correcte ? 'gagne' : 'perdu', resultat_reel: resultatReel })
      .eq('id', sel.id);
  }

  const combineIds = [...new Set(selections.map((s: any) => s.combine_id as string))];
  let traites = 0;

  for (const combineId of combineIds) {
    const { data: toutesSelections } = await client
      .from('paris_selections').select('statut').eq('combine_id', combineId);
    if (!toutesSelections || toutesSelections.some(s => s.statut === 'en_attente')) continue; // combiné pas encore complet

    const { data: combine } = await client.from('paris_combines').select('*').eq('id', combineId).single();
    if (!combine || combine.statut !== 'en_attente') continue;

    const nbPertes = toutesSelections.filter(s => s.statut === 'perdu').length;
    const resultat: 'gagne' | 'rembourse' | 'perdu' =
      nbPertes === 0 ? 'gagne' : nbPertes === 1 ? 'rembourse' : 'perdu';

    await client.from('paris_combines')
      .update({ statut: resultat, resolu_at: new Date().toISOString() })
      .eq('id', combineId);

    const solde = await soldeParis(combine.user_id, client);
    if (!solde) continue;

    let nouveauSolde = solde.solde;
    if (resultat === 'gagne') nouveauSolde += combine.gain_potentiel;
    else if (resultat === 'rembourse') nouveauSolde += combine.mise; // remise de la mise, sans gain

    const nouvelleMiseCumulee = combine.mise_qualifiante
      ? solde.mise_cumulee_valide + combine.mise
      : solde.mise_cumulee_valide;

    await client.from('paris_soldes')
      .update({ solde: nouveauSolde, mise_cumulee_valide: nouvelleMiseCumulee })
      .eq('user_id', combine.user_id);

    traites++;
  }

  return { ok: true, traites };
}

// ------------------------------------------------------------
// ⚠️ RÉSERVÉ AU SERVEUR (route API avec service_role) : vérifie
// l'objectif et effectue le retrait fixe de 1 000 Gourdes.
// Peut être demandé à tout moment après l'objectif atteint —
// l'utilisateur choisit, rien n'est automatique.
// ------------------------------------------------------------
export async function demanderRetraitParis(userId: string, client: SupabaseClient = supabase) {
  const solde = await soldeParis(userId, client);
  if (!solde) return { ok: false, erreur: 'Compte de paris introuvable.' };
  if (solde.retire) return { ok: false, erreur: 'Le retrait a déjà été effectué sur ce compte.' };
  if (solde.mise_cumulee_valide < OBJECTIF_MISE_CUMULEE) {
    return {
      ok: false,
      erreur: 'Condition non remplie : ' + Math.round(solde.mise_cumulee_valide).toLocaleString('fr-FR') +
        ' / ' + OBJECTIF_MISE_CUMULEE.toLocaleString('fr-FR') + ' Gourdes misées (cote ≥ 2.00 par sélection).'
    };
  }

  const { error } = await client.from('paris_retraits').insert({
    user_id: userId, montant: MONTANT_RETRAIT, statut: 'en_attente'
  });
  if (error) return { ok: false, erreur: error.message };

  await client.from('paris_soldes').update({ retire: true }).eq('user_id', userId);
  return { ok: true, montant: MONTANT_RETRAIT };
}

// ------------------------------------------------------------
// ⚠️ RÉSERVÉ AU SERVEUR (route API avec service_role, admin
// uniquement) : octroie manuellement des Gourdes à un compte —
// en attendant un futur système de récompenses par publicité.
// N'affecte QUE le solde jouable, jamais la mise cumulée validée
// ni le statut de retrait : l'utilisateur doit encore parier ces
// Gourdes avec de vraies mises qualifiantes pour progresser.
// ------------------------------------------------------------
export async function octroyerBonusAdmin(userId: string, montant: number, client: SupabaseClient = supabase) {
  if (montant <= 0) return { ok: false, erreur: 'Montant invalide.' };
  const solde = await soldeParis(userId, client);
  if (!solde) return { ok: false, erreur: 'Compte de paris introuvable.' };

  const { error } = await client.from('paris_soldes').update({ solde: solde.solde + montant }).eq('user_id', userId);
  if (error) return { ok: false, erreur: error.message };

  return { ok: true, nouveauSolde: solde.solde + montant };
}

export const PARIS_CONSTANTES = {
  SOLDE_INITIAL, COTE_MIN_QUALIFIANTE, SELECTIONS_MIN, MISE_MIN, OBJECTIF_MISE_CUMULEE, MONTANT_RETRAIT
};
