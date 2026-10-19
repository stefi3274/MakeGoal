import { supabaseAdmin } from '../../../lib/fantasyServeur';

// Classement Fantasy : somme des points de toutes les journées. Public (noms d'équipe seulement).
export async function GET(request: Request) {
  const { data, error } = await supabaseAdmin.from('fantasy_scores').select('user_id, points').limit(50000);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  const total = new Map<string, number>();
  (data || []).forEach(s => total.set(s.user_id, (total.get(s.user_id) || 0) + s.points));
  const tri = [...total.entries()].sort((a, b) => b[1] - a[1]);
  const top = tri.slice(0, 50);
  const noms: Record<string, string> = {};
  if (top.length) {
    const { data: eq } = await supabaseAdmin.from('fantasy_equipes').select('user_id, nom_equipe').in('user_id', top.map(t => t[0]));
    (eq || []).forEach(e => { noms[e.user_id] = e.nom_equipe; });
  }
  let moi: { rang: number; points: number } | null = null;
  const h = request.headers.get('authorization');
  if (h && h.startsWith('Bearer ')) {
    const { data: u } = await supabaseAdmin.auth.getUser(h.replace('Bearer ', ''));
    const id = u.user?.id;
    if (id && total.has(id)) moi = { rang: tri.findIndex(t => t[0] === id) + 1, points: total.get(id) || 0 };
  }
  const { count } = await supabaseAdmin.from('fantasy_equipes').select('user_id', { count: 'exact', head: true });
  return Response.json({ classement: top.map((t, i) => ({ rang: i + 1, nom: noms[t[0]] || 'Équipe', points: t[1] })), moi, participants: count || 0 });
}
