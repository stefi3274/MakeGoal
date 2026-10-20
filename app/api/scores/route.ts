import { createClient } from '@supabase/supabase-js';
import { adminDe, supabaseAdmin } from '../../../lib/fantasyServeur';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.NEXT_PUBLIC_SUPABASE_KEY as string
);

export async function GET() {
  const { data } = await supabase.from('scores').select('*');
  return Response.json({ scores: data || [] });
}

// Écriture des scores : réservée aux administrateurs (clé service côté serveur).
export async function POST(request: Request) {
  const a = await adminDe(request);
  if (a instanceof Response) return a;
  const { match_id, home_score, away_score, statut } = await request.json();
  if (match_id === undefined || home_score === undefined || away_score === undefined) {
    return Response.json({ error: 'Données manquantes' }, { status: 400 });
  }
  const { data, error } = await supabaseAdmin
    .from('scores')
    .upsert({ match_id, home_score, away_score, statut: statut || 'final', updated_at: new Date().toISOString() },
    { onConflict: 'match_id' })
    .select()
    .single();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ success: true, score: data });
} 