import { supabase } from './supabase';
import type { SupabaseClient } from '@supabase/supabase-js';

// ============================================================
// MOTEUR DE PARIS — MakeGoal (v3)
// - 1 000 Gourdes virtuelles à l'inscription
// - Paris COMBINÉS uniquement : 10 sélections minimum
// - Mise minimum : 100 Gourdes par combiné
// - Types de sélection : 1 / X / 2, Double Chance (1X, X2, 12),
//   Buts (+2.5 / -2.5 buts au total dans le match)
// - Cote minimum PAR SÉLECTION pour qu'une mise compte dans
//   l'objectif de retrait, PROGRESSIVE selon le nombre de
//   sélections du combiné :
//     10 à 19 sélections → cote ≥ 2.00
//     20 à 39 sélections → cote ≥ 1.50
//     40 sélections ou plus → cote ≥ 1.20
// - Si UNE SEULE sélection est perdante : mise REMBOURSÉE.
//   2 pertes ou plus : mise perdue. 0 perte : gain complet.
// - Objectif de mise cumulée : 25 000 Gourdes (25 × 1 000).
//   Une fois atteint, retrait fixe de 1 000 Gourdes à tout moment,
//   au choix de l'utilisateur — rien n'est automatique.
// ============================================================

const SOLDE_INITIAL = 1000;
const SELECTIONS_MIN = 2; // plancher structurel : un "combiné" suppose au moins 2 sélections
const MISE_MIN = 100;
const OBJECTIF_MISE_CUMULEE = 25000;
const MONTANT_RETRAIT = 1000;

// Qualification basée sur la cote la PLUS BASSE utilisée dans le combiné,
// et sur la cote TOTALE atteinte. Plus les cotes utilisées sont hautes
// (donc plus risquées), moins la cote totale exigée est grande.
//   Toutes les sélections ≥ 2.00 → cote totale exigée ≥ 20
//   Toutes les sélections ≥ 1.50 → cote totale exigée ≥ 50
//   Toutes les sélections ≥ 1.20 → cote totale exigée ≥ 70
//   Une seule sélection sous 1.20 → jamais qualifiant
export type PalierCote = { coteMinParSelection: number; coteTotaleExigee: number };
const PALIERS_COTE: PalierCote[] = [
  { coteMinParSelection: 2.0, coteTotaleExigee: 20 },
  { coteMinParSelection: 1.5, coteTotaleExigee: 50 },
  { coteMinParSelection: 1.2, coteTotaleExigee: 70 }
];

// Renvoie le palier applicable (le plus favorable que respectent TOUTES les
// sélections), à partir de la cote la plus basse du combiné. null si une
// sélection est sous 1.20 (aucun palier ne s'applique).
export function palierPourCoteMin(coteMinParSelection: number): PalierCote | null {
  return PALIERS_COTE.find(p => coteMinParSelection >= p.coteMinParSelection) || null;
}

export function descriptionPaliers(): string {
  return PALIERS_COTE.map(p => 'cotes ≥ ' + p.coteMinParSelection.toFixed(2) + ' → cote totale ≥ ' + p.coteTotaleExigee).join(' · ');
}

export type Pronostic = '1' | 'X' | '2' | '1X' | 'X2' | '12' | 'plus2.5' | 'moins2.5';

export type SelectionPari = {
  matchId: string;
  pronostic: Pronostic;
  cote: number;
};

// Combine deux cotes mutuellement exclusives en une cote de Double Chance
// (formule standard : 1 / (1/cote_A + 1/cote_B))
export function coteDoubleChance(coteA: number, coteB: number): number {
  return Math.round((1 / (1 / coteA + 1 / coteB)) * 100) / 100;
}

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
  const coteMinDuCombine = Math.min(...selections.map(s => s.cote));
  const palier = palierPourCoteMin(coteMinDuCombine);
  const miseQualifiante = !!palier && coteTotale >= palier.coteTotaleExigee;

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

  const { error: erreurSolde } = await client
    .from('paris_soldes').update({ solde: solde.solde - mise }).eq('user_id', userId);
  if (erreurSolde) return { ok: false, erreur: erreurSolde.message };

  return { ok: true, combineId: combine.id, coteTotale, gainPotentiel, miseQualifiante, palierApplique: palier };
}

// Détermine si une sélection est gagnante, à partir du résultat 1X2 réel
// et du total de buts marqués dans le match.
function selectionGagnante(pronostic: Pronostic, resultat1x2: '1' | 'X' | '2', totalButs: number): boolean {
  switch (pronostic) {
    case '1': return resultat1x2 === '1';
    case 'X': return resultat1x2 === 'X';
    case '2': return resultat1x2 === '2';
    case '1X': return resultat1x2 !== '2';
    case 'X2': return resultat1x2 !== '1';
    case '12': return resultat1x2 !== 'X';
    case 'plus2.5': return totalButs > 2.5;
    case 'moins2.5': return totalButs < 2.5;
    default: return false;
  }
}

// ------------------------------------------------------------
// ⚠️ RÉSERVÉ AU SERVEUR (route API avec service_role) : résout
// tous les combinés en attente qui contiennent ce match, une fois
// son résultat réel (et son score) connus. Ne JAMAIS appeler
// depuis le navigateur.
//
// Règle : 0 sélection perdante = gain complet. Exactement 1 = mise
// remboursée. 2 ou plus = mise perdue.
// ------------------------------------------------------------
export async function resoudreCombinesPourMatch(
  matchId: string,
  resultatReel: '1' | 'X' | '2',
  client: SupabaseClient = supabase
) {
  const { data: match } = await client.from('matchs').select('score_home, score_away').eq('id', matchId).single();
  const totalButs = (match?.score_home ?? 0) + (match?.score_away ?? 0);

  const { data: selections } = await client
    .from('paris_selections').select('*').eq('match_id', matchId).eq('statut', 'en_attente');
  if (!selections || selections.length === 0) return { ok: true, traites: 0 };

  for (const sel of selections) {
    const correcte = selectionGagnante(sel.pronostic as Pronostic, resultatReel, totalButs);
    await client.from('paris_selections')
      .update({ statut: correcte ? 'gagne' : 'perdu', resultat_reel: resultatReel })
      .eq('id', sel.id);
  }

  const combineIds = [...new Set(selections.map((s: any) => s.combine_id as string))];
  let traites = 0;

  for (const combineId of combineIds) {
    const { data: toutesSelections } = await client
      .from('paris_selections').select('statut').eq('combine_id', combineId);
    if (!toutesSelections || toutesSelections.some(s => s.statut === 'en_attente')) continue;

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
    else if (resultat === 'rembourse') nouveauSolde += combine.mise;

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
// ⚠️ RÉSERVÉ AU SERVEUR : vérifie l'objectif et effectue le
// retrait fixe de 1 000 Gourdes. Demandé à tout moment, jamais
// automatique.
// ------------------------------------------------------------
export async function demanderRetraitParis(userId: string, client: SupabaseClient = supabase) {
  const solde = await soldeParis(userId, client);
  if (!solde) return { ok: false, erreur: 'Compte de paris introuvable.' };
  if (solde.retire) return { ok: false, erreur: 'Le retrait a déjà été effectué sur ce compte.' };
  if (solde.mise_cumulee_valide < OBJECTIF_MISE_CUMULEE) {
    return {
      ok: false,
      erreur: 'Condition non remplie : ' + Math.round(solde.mise_cumulee_valide).toLocaleString('fr-FR') +
        ' / ' + OBJECTIF_MISE_CUMULEE.toLocaleString('fr-FR') + ' Gourdes misées en mises qualifiantes.'
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
// ⚠️ RÉSERVÉ AU SERVEUR (admin uniquement) : octroie manuellement
// des Gourdes à un compte.
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
  SOLDE_INITIAL, SELECTIONS_MIN, MISE_MIN, OBJECTIF_MISE_CUMULEE, MONTANT_RETRAIT, PALIERS_COTE
};
