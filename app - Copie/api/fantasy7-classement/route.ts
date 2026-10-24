import { supabaseAdmin, profilsDe } from '../../../lib/fantasyServeur';

// Classement Fantasy 7 : somme des points de toutes les journées. Public (noms d'équipe seulement).
export async function GET(request: Request) {
  const { data, error } = await supabaseAdmin.from('fantasy7_scores').select('user_id, points').limit(50000);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  const total = new Map<string, number>();
  (data || []).forEach(s => total.set(s.user_id, (total.get(s.user_id) || 0) + s.points));
  const tri = [...total.entries()].sort((a, b) => b[1] - a[1]);
  const top = tri.slice(0, 50);
  const profils = await profilsDe(top.map(t => t[0]));
  let moi: { rang: number; points: number } | null = null;
  const h = request.headers.get('authorization');
  if (h && h.startsWith('Bearer ')) {
    const { data: u } = await supabaseAdmin.auth.getUser(h.replace('Bearer ', ''));
    const id = u.user?.id;
    if (id && total.has(id)) moi = { rang: tri.findIndex(t => t[0] === id) + 1, points: total.get(id) || 0 };
  }
  return Response.json({ classement: top.map((t, i) => ({ rang: i + 1, nom: profils.get(t[0])?.nom || 'Équipe', embleme: profils.get(t[0])?.embleme, couleur: profils.get(t[0])?.couleur1, points: t[1] })), moi });
}
