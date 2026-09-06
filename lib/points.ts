import { supabase } from './supabase';
import type { SupabaseClient } from '@supabase/supabase-js';

// ============================================================
// MOTEUR DE POINTS — MakeGoal
// Principe : chaque mouvement de points est un ENREGISTREMENT
// permanent dans points_transactions (jamais modifié, jamais
// supprimé). Le solde affiché est toujours recalculé/vérifiable
// à partir de ce registre. points_soldes n'est qu'un cache pour
// éviter de resommer tout l'historique à chaque affichage.
// ============================================================

export type RaisonPoints =
  | 'resultat_joue' | 'resultat_gagne' | 'resultat_perdu'
  | 'score_exact_joue' | 'score_exact_gagne' | 'score_exact_perdu'
  | 'buteur_joue' | 'buteur_gagne' | 'buteur_perdu'
  | 'passeur_joue' | 'passeur_gagne' | 'passeur_perdu'
  | 'parrainage_invite' | 'parrainage_inscription' | 'parrainage_bienvenue'
  | 'question_eclair_gagnant'
  | 'conversion_gourdes';

const LIBELLES: Record<RaisonPoints, string> = {
  resultat_joue: 'Pronostic résultat joué',
  resultat_gagne: 'Pronostic résultat gagné',
  resultat_perdu: 'Pronostic résultat perdu',
  score_exact_joue: 'Pronostic score exact joué',
  score_exact_gagne: 'Score exact gagné',
  score_exact_perdu: 'Score exact perdu',
  buteur_joue: 'Pronostic buteur joué',
  buteur_gagne: 'Buteur gagné',
  buteur_perdu: 'Buteur perdu',
  passeur_joue: 'Pronostic passeur joué',
  passeur_gagne: 'Passeur gagné',
  passeur_perdu: 'Passeur perdu',
  parrainage_invite: 'Invitation envoyée',
  parrainage_inscription: 'Un de vos filleuls a rejoint MakeGoal',
  parrainage_bienvenue: 'Bienvenue — inscrit via parrainage',
  question_eclair_gagnant: 'Gagnant du tirage Question Éclair',
  conversion_gourdes: 'Conversion en Gourdes'
};

const SEUIL_CONVERSION = 10000;
const TAUX_CONVERSION = 0.20; // 20% : 10 000 pts -> 2 000 Gourdes

// ------------------------------------------------------------
// Cœur du registre : ajoute une ligne ET met à jour le solde
// ------------------------------------------------------------
async function enregistrerMouvement(
  userId: string,
  montant: number,
  raison: RaisonPoints,
  referenceType?: string,
  referenceId?: string,
  client: SupabaseClient = supabase
): Promise<{ ok: boolean; nouveauSolde?: number; erreur?: string }> {
  if (!userId || montant === 0) return { ok: false, erreur: 'Paramètres invalides' };

  // Ajustement ATOMIQUE du solde (indivisible côté base de données) : deux
  // mouvements simultanés sur le même compte ne peuvent plus s'écraser l'un
  // l'autre ni faire perdre un crédit.
  const { data: nouveauSolde, error: erreurSolde } = await client
    .rpc('ajuster_points', { p_user_id: userId, p_montant: montant });
  if (erreurSolde) return { ok: false, erreur: erreurSolde.message };

  const { error: erreurTransaction } = await client.from('points_transactions').insert({
    user_id: userId, montant, raison, libelle: LIBELLES[raison],
    reference_type: referenceType || null, reference_id: referenceId || null,
    solde_apres: nouveauSolde
  });
  if (erreurTransaction) return { ok: false, erreur: erreurTransaction.message };

  return { ok: true, nouveauSolde };
}

// ------------------------------------------------------------
// Lecture : solde actuel et historique
// ------------------------------------------------------------
export async function soldePoints(userId: string, client: SupabaseClient = supabase): Promise<number> {
  const { data } = await client.from('points_soldes').select('solde').eq('user_id', userId).single();
  return data?.solde || 0;
}

export async function historiquePoints(userId: string, limite = 50) {
  const { data } = await supabase
    .from('points_transactions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limite);
  return data || [];
}

// ------------------------------------------------------------
// Prédictions (Résultat / Score exact / Buteur)
// Correct = +10, faux = -5 (la moitié)
// ------------------------------------------------------------
export async function traiterPrediction(
  userId: string,
  type: 'resultat' | 'score_exact' | 'buteur' | 'passeur',
  correcte: boolean,
  referenceId?: string,
  client: SupabaseClient = supabase
) {
  // Règle : on joue = +5 (toujours), puis on gagne = +10, ou on perd = -7
  const raisonJoue = (type + '_joue') as RaisonPoints;
  await enregistrerMouvement(userId, 5, raisonJoue, 'concours_match', referenceId, client);

  const raisonResultat = (type + '_' + (correcte ? 'gagne' : 'perdu')) as RaisonPoints;
  const montant = correcte ? 10 : -25;
  return enregistrerMouvement(userId, montant, raisonResultat, 'concours_match', referenceId, client);
}

// ------------------------------------------------------------
// Parrainage en chaîne
// Règle : à chaque événement (invitation envoyée OU inscription
// confirmée), le parrain direct reçoit +10, et CHAQUE ancêtre
// au-dessus dans la chaîne reçoit +5 (sans limite de niveau).
// ------------------------------------------------------------
async function propagerChaineParrainage(userId: string, raison: RaisonPoints, referenceId?: string, client: SupabaseClient = supabase) {
  // Le parrain direct de userId
  const { data: lien } = await client
    .from('parrainages').select('parrain_id').eq('filleul_id', userId).single();
  if (!lien?.parrain_id) return;

  // +10 au parrain direct
  await enregistrerMouvement(lien.parrain_id, 10, raison, 'parrainage', referenceId, client);

  // +5 à chaque ancêtre au-dessus, en remontant la chaîne (sans limite)
  let courant = lien.parrain_id;
  const dejaVus = new Set<string>([userId, lien.parrain_id]);
  while (true) {
    const { data: lienSuperieur } = await client
      .from('parrainages').select('parrain_id').eq('filleul_id', courant).single();
    const ancetre = lienSuperieur?.parrain_id;
    if (!ancetre || dejaVus.has(ancetre)) break; // racine atteinte ou boucle de sécurité
    await enregistrerMouvement(ancetre, 5, raison, 'parrainage', referenceId, client);
    dejaVus.add(ancetre);
    courant = ancetre;
  }
}

// Appelé quand A envoie une invitation à B (avant que B ne s'inscrive)
// SANS RISQUE côté client : ne crédite QUE le compte de l'appelant lui-même.
export async function parrainageInviteEnvoyee(parrainId: string, filleulEmail: string, client: SupabaseClient = supabase) {
  // Anti-spam : une seule invitation créditée par email envoyé, par parrain
  const { data: dejaEnvoyee } = await client
    .from('parrainages').select('id').eq('parrain_id', parrainId).eq('filleul_email', filleulEmail).maybeSingle();
  if (dejaEnvoyee) {
    return { ok: false, erreur: 'Une invitation a déjà été envoyée à cet email.' };
  }

  const { data: invitation, error } = await client.from('parrainages').insert({
    parrain_id: parrainId, filleul_email: filleulEmail, statut: 'invite'
  }).select().single();
  if (error) return { ok: false, erreur: error.message };
  await enregistrerMouvement(parrainId, 10, 'parrainage_invite', 'parrainage', invitation.id, client);
  return { ok: true, invitationId: invitation.id };
}

// ⚠️ RÉSERVÉ AU SERVEUR (route API avec service_role) : crédite le parrain
// et toute la chaîne au-dessus — ne JAMAIS appeler depuis le navigateur.
export async function parrainageInscriptionConfirmee(invitationId: string, nouvelUserId: string, client: SupabaseClient = supabase) {
  const { data: invitation } = await client.from('parrainages').select('*').eq('id', invitationId).single();
  if (!invitation) return { ok: false, erreur: 'Invitation introuvable' };

  await client.from('parrainages').update({
    filleul_id: nouvelUserId, statut: 'inscrit', inscrit_at: new Date().toISOString()
  }).eq('id', invitationId);

  // Bienvenue au nouvel inscrit
  await enregistrerMouvement(nouvelUserId, 10, 'parrainage_bienvenue', 'parrainage', invitationId, client);

  // Propagation dans la chaîne (parrain direct +10, ancêtres +5 chacun)
  await propagerChaineParrainage(nouvelUserId, 'parrainage_inscription', invitationId, client);

  return { ok: true };
}

// ⚠️ RÉSERVÉ AU SERVEUR (route API avec service_role) : pour une inscription
// via simple lien partagé (?ref=xxx), sans étape d'invitation préalable.
// Équivaut à "invitation envoyée" + "inscription confirmée" d'un coup :
// les deux paliers de la chaîne s'appliquent, comme pour le parcours complet.
export async function parrainageDirectViaLien(parrainId: string, nouvelUserId: string, client: SupabaseClient = supabase) {
  if (!parrainId || parrainId === nouvelUserId) return { ok: false, erreur: 'Parrainage invalide' };

  const { error } = await client.from('parrainages').insert({
    parrain_id: parrainId, filleul_id: nouvelUserId, statut: 'inscrit', inscrit_at: new Date().toISOString()
  });
  if (error) return { ok: false, erreur: error.message };

  await enregistrerMouvement(nouvelUserId, 10, 'parrainage_bienvenue', 'parrainage', undefined, client);
  await propagerChaineParrainage(nouvelUserId, 'parrainage_invite', undefined, client);
  await propagerChaineParrainage(nouvelUserId, 'parrainage_inscription', undefined, client);

  return { ok: true };
}

// ------------------------------------------------------------
// Conversion en Gourdes
// Seuil minimum 10 000 points, taux 20%
// ------------------------------------------------------------
// ⚠️ RÉSERVÉ AU SERVEUR (route API avec service_role) : vérifie et déduit
// un solde réel — ne JAMAIS appeler depuis le navigateur pour de l'argent réel.
export async function demanderConversion(userId: string, pointsAConvertir: number, client: SupabaseClient = supabase) {
  if (pointsAConvertir < SEUIL_CONVERSION) {
    return { ok: false, erreur: 'Le minimum pour convertir est de ' + SEUIL_CONVERSION + ' points.' };
  }
  const montantGourdes = Math.round(pointsAConvertir * TAUX_CONVERSION);

  const { data: conversion, error } = await client.from('conversions').insert({
    user_id: userId, points_convertis: pointsAConvertir, montant_gourdes: montantGourdes, statut: 'en_attente'
  }).select().single();
  if (error) return { ok: false, erreur: error.message };

  // Débit ATOMIQUE : vérifie et déduit en une seule opération indivisible.
  // Empêche deux demandes de conversion simultanées de puiser deux fois
  // dans le même solde de points.
  const { data: nouveauSolde, error: erreurDebit } = await client
    .rpc('deduire_points_conversion', { p_user_id: userId, p_points: pointsAConvertir });
  if (erreurDebit) {
    await client.from('conversions').delete().eq('id', conversion.id); // annule la demande orpheline
    if (erreurDebit.message.includes('SOLDE_INSUFFISANT')) {
      return { ok: false, erreur: 'Solde insuffisant pour cette conversion.' };
    }
    return { ok: false, erreur: erreurDebit.message };
  }

  await client.from('points_transactions').insert({
    user_id: userId, montant: -pointsAConvertir, raison: 'conversion_gourdes', libelle: LIBELLES['conversion_gourdes'],
    reference_type: 'conversion', reference_id: conversion.id, solde_apres: nouveauSolde
  });

  return { ok: true, montantGourdes, conversionId: conversion.id };
}

// ------------------------------------------------------------
// Question Éclair — tirage automatique
// Choisit jusqu'à 10 gagnants au hasard PARMI LES BONNES RÉPONSES
// uniquement, +15 points chacun.
// ------------------------------------------------------------
// ⚠️ RÉSERVÉ AU SERVEUR (route API avec service_role) : crédite les
// gagnants — ne JAMAIS appeler depuis le navigateur.
export async function tirerGagnantsQuestionEclair(questionId: string, client: SupabaseClient = supabase) {
  const { data: bonnesReponses, error } = await client
    .from('reponses_eclair').select('id, user_id').eq('question_id', questionId).eq('correcte', true);
  if (error) return { ok: false, erreur: error.message };
  if (!bonnesReponses || bonnesReponses.length === 0) {
    await client.from('questions_eclair').update({ statut: 'tiree', fermee_at: new Date().toISOString() }).eq('id', questionId);
    return { ok: true, gagnants: [] };
  }

  const melange = [...bonnesReponses].sort(() => Math.random() - 0.5);
  const gagnants = melange.slice(0, 10);

  for (const g of gagnants) {
    await enregistrerMouvement(g.user_id, 15, 'question_eclair_gagnant', 'question_eclair', questionId, client);
    await client.from('reponses_eclair').update({ gagnant: true }).eq('id', g.id);
  }

  await client.from('questions_eclair').update({ statut: 'tiree', fermee_at: new Date().toISOString() }).eq('id', questionId);
  return { ok: true, gagnants: gagnants.map(g => g.user_id) };
}
