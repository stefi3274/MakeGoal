import { supabaseAdmin, authentifier, estReponse, sansPlanter } from '../../../lib/caisseServeur';

// Offres ouvertes aux paris (matchs pas encore commencés), pour l'écran de caisse.
export async function GET(request: Request) { return sansPlanter(() => traiterGet(request)); }

async function traiterGet(request: Request): Promise<Response> {
  const acteur = await authentifier(request);
  if (estReponse(acteur)) return acteur;
  const { data: offres } = await supabaseAdmin.from('paris_offres').select('id, match_id, marche, choix, libelle, cote, legs').eq('actif', true).is('resultat', null);
  const ids = Array.from(new Set((offres || []).map((o: { match_id: string }) => o.match_id)));
  if (!ids.length) return Response.json({ matchs: [] });
  const { data: matchs } = await supabaseAdmin.from('matchs').select('id, equipe1, equipe2, competition, date_match, sport')
    .in('id', ids).gt('date_match', new Date().toISOString()).order('date_match', { ascending: true });
  const res = (matchs || []).map((m: { id: string }) => ({ ...m, offres: (offres || []).filter((o: { match_id: string }) => o.match_id === m.id) }));
  return Response.json({ matchs: res });
}
