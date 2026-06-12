import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.NEXT_PUBLIC_SUPABASE_KEY as string
);

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const { data, error } = await supabase
    .from('pronostics')
    .select('*, pronostics_paris(*)')
    .eq('id', id)
    .eq('publie', true)
    .single();
  if (error || !data) {
    return Response.json({ error: 'Pronostic introuvable' }, { status: 404 });
  }
  const pronostic = {
    ...data,
    paris: (data.pronostics_paris || []).sort((a: { ordre: number }, b: { ordre: number }) => a.ordre - b.ordre)
  };
  await supabase.from('pronostics').update({ vues: (data.vues || 0) + 1 }).eq('id', id);
  return Response.json({ pronostic });
}