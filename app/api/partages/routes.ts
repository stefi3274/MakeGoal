import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.NEXT_PUBLIC_SUPABASE_KEY as string
);

export async function POST(request: Request) {
  const { pronostic_id, canal } = await request.json();
  if (!pronostic_id) return Response.json({ error: 'ID manquant' }, { status: 400 });
  await supabase.from('partages').insert({ pronostic_id, canal: canal || 'whatsapp' });
  await supabase.from('pronostics').update({ vues: supabase.rpc('increment', { x: 1 }) }).eq('id', pronostic_id);
  return Response.json({ success: true });
}