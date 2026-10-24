import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.NEXT_PUBLIC_SUPABASE_KEY as string
);

// GET : récupérer les stats de vote de tous les matchs
export async function GET() {
  const { data, error } = await supabase
    .from('votes_matchs')
    .select('match_id, choix');

  if (error || !data) {
    return Response.json({ stats: {} });
  }

  const stats: Record<number, { '1': number; 'X': number; '2': number; total: number }> = {};

  data.forEach((v: { match_id: number; choix: string }) => {
    if (!stats[v.match_id]) {
      stats[v.match_id] = { '1': 0, 'X': 0, '2': 0, total: 0 };
    }
    stats[v.match_id][v.choix as '1' | 'X' | '2']++;
    stats[v.match_id].total++;
  });

  return Response.json({ stats });
}