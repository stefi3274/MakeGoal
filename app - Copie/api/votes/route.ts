import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.NEXT_PUBLIC_SUPABASE_KEY as string
);

export async function POST(request: Request) {
  const { pronostic_id, type } = await request.json();

  if (!pronostic_id || !['up', 'down'].includes(type)) {
    return Response.json({ error: 'Données invalides' }, { status: 400 });
  }

  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0] : 'unknown';
  const ip_hash = Buffer.from(ip).toString('base64');

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