import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.NEXT_PUBLIC_SUPABASE_KEY as string
);

export async function GET() {
  const { data: matchs, error: e1 } = await supabase
    .from('pronostics')
    .select('id, match, competition, date_match, lieu, contexte, confiance_globale')
    .eq('publie', true)
    .order('date_match', { ascending: true });

  if (e1 || !matchs) {
    return Response.json({ pronostics: [] });
  }

  const ids = matchs.map((m: {id: string}) => m.id);

  const { data: paris, error: e2 } = await supabase
    .from('pronostics_paris')
    .select('*')
    .in('pronostic_id', ids)
    .order('ordre', { ascending: true });

  if (e2 || !paris) {
    return Response.json({ pronostics: matchs.map((m: {id: string}) => ({ ...m, paris: [] })) });
  }

  const resultat = matchs.map((m: {id: string}) => ({
    ...m,
    paris: paris.filter((p: {pronostic_id: string}) => p.pronostic_id === m.id)
  }));

  return Response.json({ pronostics: resultat });
}
