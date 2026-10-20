import { supabaseAdmin, utilisateurDe, tousLesJoueurs, journeeCourante, estOuverte, budgetDe, profilsDe } from '../../../lib/fantasyServeur';
import { validerEquipe7, Equipe7 } from '../../../lib/fantasy7';

// Mon équipe de 7 : nécessite d'avoir rejoint MakeGoal Fantasy (le nom d'équipe est partagé).
export async function GET(request: Request) {
  const u = await utilisateurDe(request);
  if (u instanceof Response) return u;
  const [{ data: base }, { data: ligne }, journee, { data: scores }] = await Promise.all([
    supabaseAdmin.from('fantasy_equipes').select('nom_equipe').eq('user_id', u.userId).maybeSingle(),
    supabaseAdmin.from('fantasy7_equipes').select('titulaires, capitaine, cout').eq('user_id', u.userId).maybeSingle(),
    journeeCourante(),
    supabaseAdmin.from('fantasy7_scores').select('journee_id, points, created_at').eq('user_id', u.userId).order('created_at', { ascending: false }).limit(40),
  ]);
  const profil = (await profilsDe([u.userId])).get(u.userId) || null;
  const titres: Record<string, string> = {};
  const ids = (scores || []).map(s => s.journee_id);
  if (ids.length) {
    const { data: js } = await supabaseAdmin.from('fantasy_journees').select('id, titre').in('id', ids);
    (js || []).forEach(j => { titres[j.id] = j.titre; });
  }
  const points = (scores || []).map(s => ({ journee: titres[s.journee_id] || 'Journée', points: s.points }));
  return Response.json({
    inscrit: !!base, nom_equipe: base?.nom_equipe || null, profil,
    equipe: ligne ? { titulaires: Array.isArray(ligne.titulaires) ? ligne.titulaires : [], capitaine: ligne.capitaine || null } : null,
    budget: await budgetDe(u.userId),
    journee: journee ? { id: journee.id, titre: journee.titre, statut: journee.statut } : null,
    ouverte: estOuverte(journee),
    points, total: points.reduce((n, p) => n + p.points, 0),
  });
}

export async function POST(request: Request) {
  const u = await utilisateurDe(request);
  if (u instanceof Response) return u;
  const body = await request.json().catch(() => ({}));
  if (body.action !== 'sauver') return Response.json({ error: 'Action inconnue.' }, { status: 400 });
  const journee = await journeeCourante();
  if (!estOuverte(journee)) return Response.json({ error: 'Les changements sont fermés jusqu\'à la prochaine journée.' }, { status: 403 });
  const { data: base } = await supabaseAdmin.from('fantasy_equipes').select('user_id').eq('user_id', u.userId).maybeSingle();
  if (!base) return Response.json({ error: 'Rejoins d\'abord MakeGoal Fantasy (page Fantasy).' }, { status: 400 });
  const eq: Equipe7 = {
    titulaires: Array.isArray(body.titulaires) ? body.titulaires.map(String) : [],
    capitaine: body.capitaine ? String(body.capitaine) : null,
  };
  const joueurs = new Map((await tousLesJoueurs(true)).map(j => [j.id, j]));
  const v = validerEquipe7(eq, joueurs, await budgetDe(u.userId));
  if (!v.ok) return Response.json({ error: v.erreurs.join(' ') }, { status: 400 });
  const { error } = await supabaseAdmin.from('fantasy7_equipes').upsert({
    user_id: u.userId, titulaires: eq.titulaires, capitaine: eq.capitaine, cout: v.cout, updated_at: new Date().toISOString(),
  } as never);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true, cout: v.cout });
}
