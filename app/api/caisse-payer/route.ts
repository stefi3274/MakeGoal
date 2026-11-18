import { supabaseAdmin, authentifier, estReponse, journal, sansPlanter } from '../../../lib/caisseServeur';
import { VALIDITE_JOURS, PAIEMENT_CAISSIER_MAX } from '../../../lib/caisse';
import { limiteVerifTicket, verifierLimite } from '../../../lib/rateLimit';

// Paiement d'un ticket gagnant. Opération atomique : un ticket ne peut être payé qu'une seule fois.
export async function POST(request: Request) { return sansPlanter(() => traiterPost(request)); }

async function traiterPost(request: Request): Promise<Response> {
  const acteur = await authentifier(request);
  if (estReponse(acteur)) return acteur;
  { const l = await verifierLimite(limiteVerifTicket, acteur.userId); if (l) return l; }
  const body = await request.json().catch(() => null) as { id?: string } | null;
  if (!body?.id) return Response.json({ error: 'Ticket requis.' }, { status: 400 });
  // Un gain se réclame dans les VALIDITE_JOURS jours qui suivent le dernier match du ticket.
  const { data: dates } = await supabaseAdmin.from('tickets_caisse_lignes').select('date_match').eq('ticket_id', body.id);
  const dernier = Math.max(0, ...((dates || []) as { date_match: string }[]).map(x => new Date(x.date_match).getTime()));
  if (dernier && Date.now() > dernier + VALIDITE_JOURS * 86400000) return Response.json({ error: 'Ticket EXPIRÉ (plus de ' + VALIDITE_JOURS + ' jours après le dernier match).' }, { status: 409 });
  // Gros gains : seul un administrateur peut payer (contrôle à deux personnes).
  if (!acteur.admin) {
    const { data: g } = await supabaseAdmin.from('tickets_caisse').select('gain_final').eq('id', body.id).maybeSingle();
    if (g && Number(g.gain_final || 0) > PAIEMENT_CAISSIER_MAX) return Response.json({ error: 'Gain supérieur à ' + PAIEMENT_CAISSIER_MAX + ' G : paiement réservé à l\'administrateur.' }, { status: 403 });
  }
  const { data } = await supabaseAdmin.from('tickets_caisse')
    .update({ statut: 'paye', paye_at: new Date().toISOString(), paye_par: acteur.userId } as never)
    .eq('id', body.id).eq('statut', 'gagnant').select('id, numero, gain_final');
  if (!data || !data.length) {
    const { data: t } = await supabaseAdmin.from('tickets_caisse').select('statut, paye_at').eq('id', body.id).maybeSingle();
    const raison = !t ? 'Ticket introuvable.' : t.statut === 'paye' ? 'Ticket DÉJÀ PAYÉ.' : t.statut === 'en_attente' ? 'Ticket pas encore réglé : ne pas payer.' : 'Ticket non gagnant : ne pas payer.';
    return Response.json({ error: raison }, { status: 409 });
  }
  await journal(acteur, 'ticket_paye', { numero: data[0].numero, gain: data[0].gain_final });
  return Response.json({ ok: true, gain: data[0].gain_final });
}
