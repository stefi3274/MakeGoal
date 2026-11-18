import { createClient } from '@supabase/supabase-js';
import { CAISSE_ACTIVE } from './features';
import { aalDuJeton } from './aal';
import { statutTicket, type Resultat } from './caisse';

// Module serveur uniquement (clé service_role). Ne jamais l'importer depuis une page.
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string
);

export type Acteur = { userId: string; admin: boolean; email: string };

// Journal des actions sensibles (ne doit jamais bloquer l'action elle-même).
export async function journal(acteur: Acteur, action: string, details: Record<string, unknown> = {}) {
  try { await supabaseAdmin.from('audit_caisse').insert({ user_id: acteur.userId, email: acteur.email, action, details } as never); } catch { /* ignoré */ }
}

// Vérifie le jeton, la session MFA n'étant pas exigée ici (gérée à l'écran), et le rôle : admin ou caissier.
export async function authentifier(request: Request, adminSeulement = false): Promise<Acteur | Response> {
  if (!CAISSE_ACTIVE) return Response.json({ error: 'La caisse est désactivée.' }, { status: 503 });
  const h = request.headers.get('authorization');
  if (!h || !h.startsWith('Bearer ')) return Response.json({ error: 'Non autorisé' }, { status: 401 });
  const { data, error } = await supabaseAdmin.auth.getUser(h.replace('Bearer ', ''));
  if (error || !data.user) return Response.json({ error: 'Session invalide' }, { status: 401 });
  const userId = data.user.id;
  const email = data.user.email || '';
  if (aalDuJeton(h.replace('Bearer ', '')) !== 'aal2') return Response.json({ error: 'Double authentification requise.' }, { status: 401 });
  const { data: a } = await supabaseAdmin.from('admins').select('user_id').eq('user_id', userId).maybeSingle();
  if (a) return { userId, admin: true, email };
  if (adminSeulement) return Response.json({ error: 'Accès réservé aux administrateurs' }, { status: 403 });
  const { data: c } = await supabaseAdmin.from('caissiers').select('user_id').eq('user_id', userId).maybeSingle();
  if (c) return { userId, admin: false, email };
  return Response.json({ error: 'Accès réservé aux caissiers' }, { status: 403 });
}

export const estReponse = (x: Acteur | Response): x is Response => x instanceof Response;

// Recalcule l'état des tickets (non payés, non annulés) qui contiennent l'une de ces offres.
export async function recalculerTickets(offreIds: string[]): Promise<number> {
  if (!offreIds.length) return 0;
  const { data: lies } = await supabaseAdmin.from('tickets_caisse_lignes').select('ticket_id').in('offre_id', offreIds);
  const ids = Array.from(new Set((lies || []).map((l: { ticket_id: string }) => l.ticket_id)));
  let modifies = 0;
  for (let i = 0; i < ids.length; i += 100) {
    const lot = ids.slice(i, i + 100);
    const { data: tickets } = await supabaseAdmin.from('tickets_caisse').select('id, mise, statut, gain_final').in('id', lot).in('statut', ['en_attente', 'gagnant', 'perdant']);
    for (const t of (tickets || []) as { id: string; mise: number; statut: string; gain_final: number | null }[]) {
      const { data: lignes } = await supabaseAdmin.from('tickets_caisse_lignes').select('cote, paris_offres(resultat)').eq('ticket_id', t.id);
      const calc = statutTicket(Number(t.mise), ((lignes || []) as unknown as { cote: number; paris_offres: { resultat: Resultat | null } | { resultat: Resultat | null }[] | null }[]).map(l => {
        const o = Array.isArray(l.paris_offres) ? l.paris_offres[0] : l.paris_offres;
        return { cote: Number(l.cote), resultat: (o?.resultat ?? null) as Resultat | null };
      }));
      if (calc.statut !== t.statut || (calc.gain ?? null) !== (t.gain_final === null ? null : Number(t.gain_final))) {
        // Garde atomique : on ne touche jamais un ticket déjà payé ou annulé entre-temps.
        const { data: maj } = await supabaseAdmin.from('tickets_caisse')
          .update({ statut: calc.statut, gain_final: calc.gain, regle_at: calc.statut === 'en_attente' ? null : new Date().toISOString() } as never)
          .eq('id', t.id).in('statut', ['en_attente', 'gagnant', 'perdant']).select('id');
        if (maj && maj.length) modifies++;
      }
    }
  }
  return modifies;
}
