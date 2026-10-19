import { supabaseAdmin, utilisateurDe } from '../../../lib/fantasyServeur';
import { MAX_LIGUES_PAR_JOUEUR, MAX_MEMBRES_LIGUE, genererCode, normaliserCode } from '../../../lib/fantasyLigues';

async function inscrit(userId: string) {
  const { data } = await supabaseAdmin.from('fantasy_equipes').select('user_id').eq('user_id', userId).maybeSingle();
  return !!data;
}

// GET : mes ligues. GET ?ligue=ID&mode=7 (ou 11) : classement de la ligue (réservé aux membres).
export async function GET(request: Request) {
  const u = await utilisateurDe(request);
  if (u instanceof Response) return u;
  const url = new URL(request.url);
  const ligueId = url.searchParams.get('ligue');

  if (!ligueId) {
    const { data: m } = await supabaseAdmin.from('fantasy_ligues_membres').select('ligue_id').eq('user_id', u.userId);
    const ids = (m || []).map(x => x.ligue_id);
    if (!ids.length) return Response.json({ ligues: [] });
    const [{ data: ligues }, { data: tous }] = await Promise.all([
      supabaseAdmin.from('fantasy_ligues').select('id, nom, code, createur, created_at').in('id', ids).order('created_at', { ascending: false }),
      supabaseAdmin.from('fantasy_ligues_membres').select('ligue_id').in('ligue_id', ids).limit(5000),
    ]);
    const nb = new Map<string, number>();
    (tous || []).forEach(x => nb.set(x.ligue_id, (nb.get(x.ligue_id) || 0) + 1));
    return Response.json({ ligues: (ligues || []).map(l => ({ id: l.id, nom: l.nom, code: l.code, createur: l.createur === u.userId, membres: nb.get(l.id) || 0 })) });
  }

  const { data: moi } = await supabaseAdmin.from('fantasy_ligues_membres').select('user_id').eq('ligue_id', ligueId).eq('user_id', u.userId).maybeSingle();
  if (!moi) return Response.json({ error: 'Tu ne fais pas partie de cette ligue.' }, { status: 403 });
  const mode = url.searchParams.get('mode') === '7' ? '7' : '11';
  const { data: membres } = await supabaseAdmin.from('fantasy_ligues_membres').select('user_id').eq('ligue_id', ligueId).limit(MAX_MEMBRES_LIGUE + 10);
  const ids = (membres || []).map(x => x.user_id);
  const [{ data: equipes }, { data: scores }] = await Promise.all([
    supabaseAdmin.from('fantasy_equipes').select('user_id, nom_equipe').in('user_id', ids),
    supabaseAdmin.from(mode === '7' ? 'fantasy7_scores' : 'fantasy_scores').select('user_id, points').in('user_id', ids).limit(50000),
  ]);
  const noms = new Map((equipes || []).map(e => [e.user_id, e.nom_equipe as string]));
  const total = new Map<string, number>(ids.map(id => [id, 0]));
  (scores || []).forEach(s => total.set(s.user_id, (total.get(s.user_id) || 0) + (s.points as number)));
  const lignes = [...total.entries()].sort((a, b) => b[1] - a[1]).map(([id, points], i) => ({ rang: i + 1, nom: noms.get(id) || 'Équipe', points, moi: id === u.userId }));
  return Response.json({ mode, classement: lignes });
}

export async function POST(request: Request) {
  const u = await utilisateurDe(request);
  if (u instanceof Response) return u;
  const body = await request.json().catch(() => ({}));
  const action = body.action as string;
  if (!(await inscrit(u.userId))) return Response.json({ error: 'Rejoins d\'abord MakeGoal Fantasy.' }, { status: 400 });

  const nbLigues = async () => {
    const { count } = await supabaseAdmin.from('fantasy_ligues_membres').select('ligue_id', { count: 'exact', head: true }).eq('user_id', u.userId);
    return count || 0;
  };

  if (action === 'creer') {
    const nom = String(body.nom || '').trim().slice(0, 40);
    if (nom.length < 3) return Response.json({ error: 'Donne un nom à ta ligue (3 lettres minimum).' }, { status: 400 });
    if ((await nbLigues()) >= MAX_LIGUES_PAR_JOUEUR) return Response.json({ error: 'Tu es déjà dans ' + MAX_LIGUES_PAR_JOUEUR + ' ligues (maximum).' }, { status: 409 });
    for (let essai = 0; essai < 6; essai++) {
      const code = genererCode();
      const { data, error } = await supabaseAdmin.from('fantasy_ligues').insert({ nom, code, createur: u.userId } as never).select('id, code').single();
      if (error || !data) { if (error && !/duplicate|unique/i.test(error.message)) return Response.json({ error: error.message }, { status: 500 }); continue; }
      const { error: e2 } = await supabaseAdmin.from('fantasy_ligues_membres').insert({ ligue_id: data.id, user_id: u.userId } as never);
      if (e2) return Response.json({ error: e2.message }, { status: 500 });
      return Response.json({ ok: true, id: data.id, code: data.code });
    }
    return Response.json({ error: 'Impossible de créer la ligue, réessaie.' }, { status: 500 });
  }

  if (action === 'rejoindre') {
    const code = normaliserCode(String(body.code || ''));
    const { data: ligue } = await supabaseAdmin.from('fantasy_ligues').select('id, nom').eq('code', code).maybeSingle();
    if (!ligue) return Response.json({ error: 'Code inconnu. Vérifie le code que ton ami t\'a envoyé.' }, { status: 404 });
    const { data: deja } = await supabaseAdmin.from('fantasy_ligues_membres').select('user_id').eq('ligue_id', ligue.id).eq('user_id', u.userId).maybeSingle();
    if (deja) return Response.json({ ok: true, id: ligue.id, nom: ligue.nom, dejaMembre: true });
    if ((await nbLigues()) >= MAX_LIGUES_PAR_JOUEUR) return Response.json({ error: 'Tu es déjà dans ' + MAX_LIGUES_PAR_JOUEUR + ' ligues (maximum).' }, { status: 409 });
    const { count } = await supabaseAdmin.from('fantasy_ligues_membres').select('user_id', { count: 'exact', head: true }).eq('ligue_id', ligue.id);
    if ((count || 0) >= MAX_MEMBRES_LIGUE) return Response.json({ error: 'Cette ligue est complète (' + MAX_MEMBRES_LIGUE + ' joueurs).' }, { status: 409 });
    const { error } = await supabaseAdmin.from('fantasy_ligues_membres').insert({ ligue_id: ligue.id, user_id: u.userId } as never);
    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json({ ok: true, id: ligue.id, nom: ligue.nom });
  }

  if (action === 'quitter') {
    const { error } = await supabaseAdmin.from('fantasy_ligues_membres').delete().eq('ligue_id', String(body.ligueId || '')).eq('user_id', u.userId);
    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json({ ok: true });
  }

  return Response.json({ error: 'Action inconnue.' }, { status: 400 });
}
