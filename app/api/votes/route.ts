import { createClient } from '@supabase/supabase-js';
import { createHmac } from 'crypto';
import { limiteVotes, verifierLimite, cleIp } from '../../../lib/rateLimit';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.NEXT_PUBLIC_SUPABASE_KEY as string
);

export async function POST(request: Request) {
  const limite = await verifierLimite(limiteVotes, cleIp(request));
  if (limite) return limite;
  const body = await request.json().catch(() => null) as { pronostic_id?: unknown; type?: unknown } | null;
  const pronostic_id = body?.pronostic_id;
  const type = body?.type;

  if ((typeof pronostic_id !== 'string' && typeof pronostic_id !== 'number') || String(pronostic_id).length > 64 || typeof type !== 'string' || !['up', 'down'].includes(type)) {
    return Response.json({ error: 'Données invalides' }, { status: 400 });
  }

  // Empreinte irréversible de l'IP (HMAC avec un secret serveur) : l'adresse n'est jamais stockée en clair.
  const ip_hash = createHmac('sha256', process.env.SUPABASE_SERVICE_ROLE_KEY || 'sel').update(cleIp(request)).digest('hex');

  const { data: existing } = await supabase
    .from('votes')
    .select('id')
    .eq('pronostic_id', pronostic_id)
    .eq('ip_hash', ip_hash)
    .single();

  if (existing) {
    return Response.json({ error: 'Déjà voté', already: true });
  }

  await supabase.from('votes').insert({ pronostic_id, type, ip_hash });

  const { count: up } = await supabase
    .from('votes')
    .select('*', { count: 'exact' })
    .eq('pronostic_id', pronostic_id)
    .eq('type', 'up');

  const { count: down } = await supabase
    .from('votes')
    .select('*', { count: 'exact' })
    .eq('pronostic_id', pronostic_id)
    .eq('type', 'down');

  return Response.json({ success: true, up: up || 0, down: down || 0 });
}