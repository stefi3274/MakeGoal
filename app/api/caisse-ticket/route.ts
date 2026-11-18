import { randomBytes } from 'crypto';
import { supabaseAdmin, authentifier, estReponse, journal } from '../../../lib/caisseServeur';
import { limiteCaisse, limiteVerifTicket, verifierLimite } from '../../../lib/rateLimit';
import { MISE_MIN, MISE_MAX, GAIN_MAX, SELECTIONS_MAX, calculerTicket, codeDepuisOctets, lireNumero } from '../../../lib/caisse';

// Création d'un ticket. Les cotes et libellés sont TOUJOURS relus en base : on ne fait jamais confiance au navigateur.
export async function POST(request: Request) {
  const acteur = await authentifier(request);
  if (estReponse(acteur)) return acteur;
  { const l = await verifierLimite(limiteCaisse, acteur.userId); if (l) return l; }
  const body = await request.json().catch(() => null) as { mise?: number; offreIds?: string[]; cotes?: Record<string, number> } | null;
  const mise = Math.round(Number(body?.mise) * 100) / 100;
  const offreIds = Array.from(new Set(Array.isArray(body?.offreIds) ? body!.offreIds!.filter(x => typeof x === 'string') : []));
  if (!Number.isFinite(mise) || mise < MISE_MIN || mise > MISE_MAX) return Response.json({ error: 'Mise entre ' + MISE_MIN + ' et ' + MISE_MAX + ' Gourdes.' }, { status: 400 });
  if (offreIds.length < 1 || offreIds.length > SELECTIONS_MAX) return Response.json({ error: 'Entre 1 et ' + SELECTIONS_MAX + ' sélections.' }, { status: 400 });

  const { data: offres } = await supabaseAdmin.from('paris_offres').select('id, match_id, libelle, cote, actif, resultat').in('id', offreIds);
  if (!offres || offres.length !== offreIds.length) return Response.json({ error: 'Une sélection n\'existe plus. Rechargez la page.' }, { status: 409 });
  // Les cotes affichées à l'écran doivent être celles de la base : sinon l'admin vient de les changer.
  if (body?.cotes && (offres as { id: string; cote: number }[]).some(o => Math.abs(Number(o.cote) - Number(body.cotes![o.id])) > 0.001)) return Response.json({ error: 'Des cotes ont changé. Rechargement des cotes : vérifiez le ticket et revalidez.' }, { status: 409 });
  const matchIds = offres.map((o: { match_id: string }) => o.match_id);
  if (new Set(matchIds).size !== matchIds.length) return Response.json({ error: 'Une seule sélection par match (utilisez un combo pour associer plusieurs choix).' }, { status: 400 });
  if (offres.some((o: { actif: boolean; resultat: string | null }) => !o.actif || o.resultat)) return Response.json({ error: 'Une sélection est fermée. Rechargez la page.' }, { status: 409 });

  const { data: matchs } = await supabaseAdmin.from('matchs').select('id, equipe1, equipe2, date_match').in('id', matchIds);
  type MatchLigne = { id: string; equipe1: string; equipe2: string; date_match: string };
  const parId = new Map<string, MatchLigne>(((matchs || []) as MatchLigne[]).map(m => [m.id, m] as [string, MatchLigne]));
  const maintenant = Date.now();
  for (const o of offres as { match_id: string }[]) {
    const m = parId.get(o.match_id);
    if (!m || new Date(m.date_match).getTime() <= maintenant) return Response.json({ error: 'Un match a déjà commencé : sélection refusée.' }, { status: 409 });
  }

  const { coteTotale, gain } = calculerTicket(mise, (offres as { cote: number }[]).map(o => Number(o.cote)));
  if (gain > GAIN_MAX) return Response.json({ error: 'Gain maximum dépassé (' + GAIN_MAX + ' Gourdes). Réduisez la mise ou les sélections.' }, { status: 400 });

  const code = codeDepuisOctets(randomBytes(6));
  const { data: ticket, error } = await supabaseAdmin.from('tickets_caisse')
    .insert({ code, caissier_id: acteur.userId, mise, cote_totale: coteTotale, gain_potentiel: gain } as never).select('id, numero').single();
  if (error || !ticket) return Response.json({ error: 'Création impossible : ' + (error?.message || 'erreur') }, { status: 500 });

  const lignes = (offres as { id: string; match_id: string; libelle: string; cote: number }[]).map(o => {
    const m = parId.get(o.match_id)!;
    return { ticket_id: ticket.id, offre_id: o.id, match_id: o.match_id, match_libelle: m.equipe1 + ' - ' + m.equipe2, date_match: m.date_match, libelle: o.libelle, cote: Number(o.cote) };
  });
  const { error: errL } = await supabaseAdmin.from('tickets_caisse_lignes').insert(lignes as never);
  if (errL) {
    await supabaseAdmin.from('tickets_caisse').delete().eq('id', ticket.id);
    return Response.json({ error: 'Création impossible : ' + errL.message }, { status: 500 });
  }
  await journal(acteur, 'ticket_cree', { numero: ticket.numero, mise, cote_totale: coteTotale, gain_potentiel: gain });
  return Response.json({ id: ticket.id, numero: ticket.numero, code });
}

const COLONNES_PUBLIQUES = 'id, numero, code, mise, cote_totale, gain_potentiel, statut, gain_final, created_at, regle_at, paye_at';

// Lecture d'un ticket : par id (impression) ou par numéro + code (vérification au guichet).
export async function GET(request: Request) {
  const acteur = await authentifier(request);
  if (estReponse(acteur)) return acteur;
  { const l = await verifierLimite(limiteVerifTicket, acteur.userId); if (l) return l; }
  const u = new URL(request.url);
  let ticket: Record<string, unknown> | null = null;
  const id = u.searchParams.get('id');
  if (id) {
    const { data } = await supabaseAdmin.from('tickets_caisse').select(COLONNES_PUBLIQUES).eq('id', id).maybeSingle();
    ticket = data;
  } else {
    const n = lireNumero(u.searchParams.get('numero') || '');
    const code = (u.searchParams.get('code') || '').trim().toUpperCase();
    if (n === null || code.length !== 6) return Response.json({ error: 'Numéro et code (6 caractères) requis.' }, { status: 400 });
    const { data } = await supabaseAdmin.from('tickets_caisse').select(COLONNES_PUBLIQUES).eq('numero', n).eq('code', code).maybeSingle();
    ticket = data;
  }
  if (!ticket) return Response.json({ error: 'Ticket introuvable ou code incorrect.' }, { status: 404 });
  const { data: lignes } = await supabaseAdmin.from('tickets_caisse_lignes').select('id, match_libelle, date_match, libelle, cote, paris_offres(resultat)').eq('ticket_id', ticket.id as string).order('date_match', { ascending: true });
  const lg = ((lignes || []) as unknown as { id: string; match_libelle: string; date_match: string; libelle: string; cote: number; paris_offres: { resultat: string | null } | { resultat: string | null }[] | null }[]).map(l => {
    const o = Array.isArray(l.paris_offres) ? l.paris_offres[0] : l.paris_offres;
    return { id: l.id, match_libelle: l.match_libelle, date_match: l.date_match, libelle: l.libelle, cote: l.cote, resultat: o?.resultat ?? null };
  });
  return Response.json({ ticket, lignes: lg });
}
