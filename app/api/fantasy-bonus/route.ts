import { supabaseAdmin, utilisateurDe, bonusDe } from '../../../lib/fantasyServeur';
import { BUDGET_DEPART } from '../../../lib/fantasy';
import { BONUS_MAX, JOURS_SERIE, etatSerie, jourHaiti, recompenseDuJour } from '../../../lib/bonusQuotidien';

async function inscrit(userId: string) {
  const { data } = await supabaseAdmin.from('fantasy_equipes').select('user_id').eq('user_id', userId).maybeSingle();
  return !!data;
}

function vue(b: { serie: number; dernierJour: string | null; solde: number }) {
  const e = etatSerie(b);
  return { serie: e.serieActive, dejaReclame: e.dejaReclame, prochainJour: e.prochainJour, recompense: recompenseDuJour(e.prochainJour), bonus: b.solde, budget: BUDGET_DEPART + b.solde, plafond: BONUS_MAX, joursSerie: JOURS_SERIE };
}

export async function GET(request: Request) {
  const u = await utilisateurDe(request);
  if (u instanceof Response) return u;
  if (!(await inscrit(u.userId))) return Response.json({ inscrit: false });
  return Response.json({ inscrit: true, ...vue(await bonusDe(u.userId)) });
}

// Récupérer le bonus du jour (une fois par jour, jour calendaire de Port-au-Prince).
export async function POST(request: Request) {
  const u = await utilisateurDe(request);
  if (u instanceof Response) return u;
  if (!(await inscrit(u.userId))) return Response.json({ error: 'Rejoins d\'abord MakeGoal Fantasy.' }, { status: 400 });
  const aujourdhui = jourHaiti();
  const avant = await bonusDe(u.userId);
  const e = etatSerie(avant, aujourdhui);
  if (e.dejaReclame) return Response.json({ error: 'Bonus déjà récupéré aujourd\'hui. Reviens demain !' }, { status: 409 });
  const jourSerie = e.prochainJour;
  const gain = Math.max(0, Math.min(recompenseDuJour(jourSerie), BONUS_MAX - avant.solde));
  const nouveau = { solde: avant.solde + gain, serie: jourSerie, dernier_jour: aujourdhui, total_jours: avant.totalJours + 1, updated_at: new Date().toISOString() };
  let ok = false;
  if (avant.dernierJour === null) {
    const { error } = await supabaseAdmin.from('fantasy_bonus').insert({ user_id: u.userId, ...nouveau } as never);
    ok = !error;
  } else {
    // mise à jour conditionnelle : deux clics simultanés ne donnent qu'un seul bonus
    const { data } = await supabaseAdmin.from('fantasy_bonus').update(nouveau as never).eq('user_id', u.userId).eq('dernier_jour', avant.dernierJour).select('user_id');
    ok = !!data && data.length > 0;
  }
  if (!ok) return Response.json({ error: 'Bonus déjà récupéré aujourd\'hui. Reviens demain !' }, { status: 409 });
  return Response.json({ ok: true, gain, jourSerie, ...vue({ serie: jourSerie, dernierJour: aujourdhui, solde: nouveau.solde }) });
}
