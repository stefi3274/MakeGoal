import { FANTASY_11_ACTIF } from '../../../lib/features';
import { supabaseAdmin, utilisateurDe, tousLesJoueurs, equipeDeLigne, journeeCourante, estOuverte, budgetDe, profilsDe } from '../../../lib/fantasyServeur';
import { couleurValide, emblemeValide } from '../../../lib/fantasyProfil';
import { TRANSFERTS_PAR_JOURNEE, validerEquipe, nbTransferts, EquipeFantasy } from '../../../lib/fantasy';

async function derniereEquipeVerrouillee(userId: string): Promise<EquipeFantasy | null> {
  const { data } = await supabaseAdmin.from('fantasy_instantanes').select('titulaires, reservistes, capitaine, created_at').eq('user_id', userId).order('created_at', { ascending: false }).limit(1);
  const l = (data || [])[0];
  return l ? equipeDeLigne(l as { titulaires: unknown; reservistes: unknown; capitaine: string | null }) : null;
}

// Mon équipe, l'état de la journée, mes transferts restants et mes points.
export async function GET(request: Request) {
  const u = await utilisateurDe(request);
  if (u instanceof Response) return u;
  const [{ data: ligne }, journee, precedente, { data: scores }] = await Promise.all([
    supabaseAdmin.from('fantasy_equipes').select('nom_equipe, titulaires, reservistes, capitaine, cout').eq('user_id', u.userId).maybeSingle(),
    journeeCourante(),
    derniereEquipeVerrouillee(u.userId),
    supabaseAdmin.from('fantasy_scores').select('journee_id, points, created_at').eq('user_id', u.userId).order('created_at', { ascending: false }).limit(40),
  ]);
  const titres: Record<string, string> = {};
  const ids = (scores || []).map(s => s.journee_id);
  if (ids.length) {
    const { data: js } = await supabaseAdmin.from('fantasy_journees').select('id, titre').in('id', ids);
    (js || []).forEach(j => { titres[j.id] = j.titre; });
  }
  const points = (scores || []).map(s => ({ journee: titres[s.journee_id] || 'Journée', points: s.points }));
  const profil = (await profilsDe([u.userId])).get(u.userId);
  const equipe = ligne ? { nom_equipe: ligne.nom_equipe, couleur1: profil?.couleur1, couleur2: profil?.couleur2, embleme: profil?.embleme, ...equipeDeLigne(ligne as { titulaires: unknown; reservistes: unknown; capitaine: string | null }) } : null;
  const utilises = equipe && precedente ? nbTransferts(equipe, precedente) : 0;
  return Response.json({
    equipe, budget: await budgetDe(u.userId),
    journee: journee ? { id: journee.id, titre: journee.titre, statut: journee.statut, date_limite: journee.date_limite } : null,
    ouverte: estOuverte(journee),
    transfertsMax: precedente ? TRANSFERTS_PAR_JOURNEE : null,
    transfertsUtilises: precedente ? utilises : null,
    points, total: points.reduce((n, p) => n + p.points, 0),
  });
}

export async function POST(request: Request) {
  const u = await utilisateurDe(request);
  if (u instanceof Response) return u;
  const body = await request.json().catch(() => ({}));
  const action = body.action as string;

  if (action === 'rejoindre') {
    const nom = String(body.nom_equipe || '').trim().slice(0, 30);
    if (nom.length < 2) return Response.json({ error: 'Donne un nom à ton équipe (2 lettres minimum).' }, { status: 400 });
    const { data: existe } = await supabaseAdmin.from('fantasy_equipes').select('user_id').eq('user_id', u.userId).maybeSingle();
    if (existe) return Response.json({ error: 'Tu as déjà une équipe.' }, { status: 409 });
    const { error } = await supabaseAdmin.from('fantasy_equipes').insert({ user_id: u.userId, nom_equipe: nom } as never);
    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json({ ok: true });
  }

  if (action === 'profil') {
    const champs: Record<string, unknown> = {};
    if (body.nom_equipe !== undefined) {
      const nom = String(body.nom_equipe || '').trim().slice(0, 30);
      if (nom.length < 2) return Response.json({ error: 'Le nom de l\'équipe doit avoir 2 lettres minimum.' }, { status: 400 });
      champs.nom_equipe = nom;
    }
    if (body.couleur1 !== undefined) { if (!couleurValide(body.couleur1)) return Response.json({ error: 'Couleur invalide.' }, { status: 400 }); champs.couleur1 = body.couleur1; }
    if (body.couleur2 !== undefined) { if (!couleurValide(body.couleur2)) return Response.json({ error: 'Couleur invalide.' }, { status: 400 }); champs.couleur2 = body.couleur2; }
    if (body.embleme !== undefined) { if (!emblemeValide(body.embleme)) return Response.json({ error: 'Emblème invalide.' }, { status: 400 }); champs.embleme = body.embleme; }
    if (!Object.keys(champs).length) return Response.json({ error: 'Rien à modifier.' }, { status: 400 });
    const { data: existe } = await supabaseAdmin.from('fantasy_equipes').select('user_id').eq('user_id', u.userId).maybeSingle();
    if (!existe) return Response.json({ error: 'Rejoins d\'abord MakeGoal Fantasy.' }, { status: 400 });
    const { error } = await supabaseAdmin.from('fantasy_equipes').update(champs as never).eq('user_id', u.userId);
    if (error) return Response.json({ error: /column/i.test(error.message) ? 'Personnalisation pas encore activée : lance le SQL sql-fantasy-profil.sql dans Supabase.' : error.message }, { status: 500 });
    return Response.json({ ok: true });
  }

  if (action === 'sauver') {
    if (!FANTASY_11_ACTIF) return Response.json({ error: 'Le format 11 joueurs n\'existe plus : MakeGoal Fantasy se joue à 7 joueurs.' }, { status: 410 });
    const journee = await journeeCourante();
    if (!estOuverte(journee)) return Response.json({ error: 'Les changements sont fermés jusqu\'à la prochaine journée.' }, { status: 403 });
    const { data: ligne } = await supabaseAdmin.from('fantasy_equipes').select('user_id').eq('user_id', u.userId).maybeSingle();
    if (!ligne) return Response.json({ error: 'Rejoins d\'abord le jeu.' }, { status: 400 });
    const eq: EquipeFantasy = {
      titulaires: Array.isArray(body.titulaires) ? body.titulaires.map(String) : [],
      reservistes: Array.isArray(body.reservistes) ? body.reservistes.map(String) : [],
      capitaine: body.capitaine ? String(body.capitaine) : null,
    };
    const joueurs = new Map((await tousLesJoueurs(true)).map(j => [j.id, j]));
    const v = validerEquipe(eq, joueurs, await budgetDe(u.userId));
    if (!v.ok) return Response.json({ error: v.erreurs.join(' ') }, { status: 400 });
    const precedente = await derniereEquipeVerrouillee(u.userId);
    if (precedente) {
      const n = nbTransferts(eq, precedente);
      if (n > TRANSFERTS_PAR_JOURNEE) return Response.json({ error: 'Trop de transferts : ' + n + ' joueurs changés, maximum ' + TRANSFERTS_PAR_JOURNEE + ' par journée.' }, { status: 400 });
    }
    const { error } = await supabaseAdmin.from('fantasy_equipes').update({
      titulaires: eq.titulaires, reservistes: eq.reservistes, capitaine: eq.capitaine, cout: v.cout, updated_at: new Date().toISOString(),
    } as never).eq('user_id', u.userId);
    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json({ ok: true, cout: v.cout });
  }

  return Response.json({ error: 'Action inconnue.' }, { status: 400 });
}
