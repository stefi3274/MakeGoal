import { supabaseAdmin, adminDe, tousLesJoueurs, equipeDeLigne, journeeCourante } from '../../../lib/fantasyServeur';
import { crediterFantasy, crediterFantasy7 } from '../../../lib/points';
import { NB_JOUEURS_7, scoreEquipe7 } from '../../../lib/fantasy7';
import { parserJoueurs, parserStatsJournee, pointsJoueur, scoreEquipe, lirePoste, FACTEUR_CLASSEMENT, NB_TITULAIRES, PerfJoueur, StatsJoueur } from '../../../lib/fantasy';

export const maxDuration = 60;

export async function GET(request: Request) {
  const a = await adminDe(request);
  if (a instanceof Response) return a;
  const [joueurs, { data: journees }, { count }] = await Promise.all([
    tousLesJoueurs(false),
    supabaseAdmin.from('fantasy_journees').select('id, titre, statut, date_limite, created_at').order('created_at', { ascending: false }).limit(60),
    supabaseAdmin.from('fantasy_equipes').select('user_id', { count: 'exact', head: true }),
  ]);
  return Response.json({ joueurs, journees: journees || [], equipes: count || 0 });
}

export async function POST(request: Request) {
  const a = await adminDe(request);
  if (a instanceof Response) return a;
  const body = await request.json().catch(() => ({}));
  const action = body.action as string;

  if (action === 'importJoueurs') {
    const { joueurs: saisis, ignorees } = parserJoueurs(String(body.texte || ''));
    if (!saisis.length) return Response.json({ error: 'Aucun joueur reconnu. Format : Nom - Poste - Club - Prix.', ignorees }, { status: 400 });
    const existants = await tousLesJoueurs(false);
    const cle = (nom: string, club: string) => nom.trim().toLowerCase() + '|' + club.trim().toLowerCase();
    const parCle = new Map(existants.map(j => [cle(j.nom, j.club), j]));
    let ajoutes = 0, maj = 0;
    const aInserer: Record<string, unknown>[] = [];
    const aMettreAJour: { id: string; champs: Record<string, unknown> }[] = [];
    const vus = new Set<string>();
    for (const s of saisis) {
      const k = cle(s.nom, s.club);
      if (vus.has(k)) continue;
      vus.add(k);
      // même nom, club différent (transfert) : si le nom est unique, on met à jour la ligne existante
      const memeNom = existants.filter(j => j.nom.trim().toLowerCase() === s.nom.trim().toLowerCase());
      const ex = parCle.get(k) || (memeNom.length === 1 ? memeNom[0] : undefined);
      if (ex) aMettreAJour.push({ id: ex.id, champs: { poste: s.poste, club: s.club, prix: s.prix, pays: s.pays || ex.pays || '', actif: true } });
      else aInserer.push({ nom: s.nom, poste: s.poste, club: s.club, prix: s.prix, pays: s.pays, competition: s.competition });
    }
    // envoi par paquets (250 joueurs en quelques secondes au lieu d'un appel par joueur)
    for (let i = 0; i < aInserer.length; i += 200) {
      const lot = aInserer.slice(i, i + 200);
      const { error } = await supabaseAdmin.from('fantasy_joueurs').insert(lot as never);
      if (error) return Response.json({ error: error.message, ajoutes, maj, ignorees }, { status: 500 });
      ajoutes += lot.length;
    }
    for (let i = 0; i < aMettreAJour.length; i += 20) {
      const rs = await Promise.all(aMettreAJour.slice(i, i + 20).map(m => supabaseAdmin.from('fantasy_joueurs').update(m.champs as never).eq('id', m.id)));
      maj += rs.filter(r => !r.error).length;
    }
    return Response.json({ ok: true, ajoutes, maj, ignorees });
  }

  if (action === 'majJoueur') {
    const champs: Record<string, unknown> = {};
    if (typeof body.prix === 'number') champs.prix = Math.max(100, Math.min(3000, Math.round(body.prix)));
    if (typeof body.actif === 'boolean') champs.actif = body.actif;
    if (typeof body.poste === 'string' && lirePoste(body.poste)) champs.poste = lirePoste(body.poste);
    if (typeof body.club === 'string') champs.club = body.club.trim();
    if (typeof body.nom === 'string' && body.nom.trim()) champs.nom = body.nom.trim();
    if (!body.id || !Object.keys(champs).length) return Response.json({ error: 'Rien à modifier.' }, { status: 400 });
    const { error } = await supabaseAdmin.from('fantasy_joueurs').update(champs as never).eq('id', body.id);
    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json({ ok: true });
  }

  if (action === 'creerJournee') {
    const titre = String(body.titre || '').trim();
    if (!titre) return Response.json({ error: 'Donne un titre à la journée (ex: Journée 5).' }, { status: 400 });
    const courante = await journeeCourante();
    if (courante && courante.statut !== 'calculee') return Response.json({ error: 'La journée « ' + courante.titre + ' » n\'est pas terminée : verrouille-la, saisis les stats et calcule les points avant d\'en ouvrir une nouvelle.' }, { status: 409 });
    const { error } = await supabaseAdmin.from('fantasy_journees').insert({ titre, date_limite: body.date_limite || null } as never);
    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json({ ok: true });
  }

  if (action === 'verrouiller') {
    const { data: j } = await supabaseAdmin.from('fantasy_journees').select('id, statut').eq('id', body.journeeId).maybeSingle();
    if (!j) return Response.json({ error: 'Journée introuvable.' }, { status: 404 });
    if (j.statut !== 'ouverte') return Response.json({ error: 'Cette journée est déjà verrouillée.' }, { status: 409 });
    const { data: equipes } = await supabaseAdmin.from('fantasy_equipes').select('user_id, titulaires, reservistes, capitaine');
    const lignes = (equipes || [])
      .map(e => ({ user_id: e.user_id, ...equipeDeLigne(e as { titulaires: unknown; reservistes: unknown; capitaine: string | null }) }))
      .filter(e => e.titulaires.length === NB_TITULAIRES)
      .map(e => ({ journee_id: j.id, user_id: e.user_id, titulaires: e.titulaires, reservistes: e.reservistes, capitaine: e.capitaine }));
    for (let i = 0; i < lignes.length; i += 500) {
      const { error } = await supabaseAdmin.from('fantasy_instantanes').upsert(lignes.slice(i, i + 500) as never);
      if (error) return Response.json({ error: error.message }, { status: 500 });
    }
    const { data: equipes7 } = await supabaseAdmin.from('fantasy7_equipes').select('user_id, titulaires, capitaine');
    const lignes7 = (equipes7 || [])
      .filter(e => Array.isArray(e.titulaires) && (e.titulaires as unknown[]).length === NB_JOUEURS_7)
      .map(e => ({ journee_id: j.id, user_id: e.user_id, titulaires: e.titulaires, capitaine: e.capitaine }));
    for (let i = 0; i < lignes7.length; i += 500) {
      const { error } = await supabaseAdmin.from('fantasy7_instantanes').upsert(lignes7.slice(i, i + 500) as never);
      if (error) return Response.json({ error: error.message }, { status: 500 });
    }
    await supabaseAdmin.from('fantasy_journees').update({ statut: 'verrouillee' } as never).eq('id', j.id);
    return Response.json({ ok: true, equipes: lignes.length, equipes7: lignes7.length });
  }

  if (action === 'saisirStats') {
    const { data: j } = await supabaseAdmin.from('fantasy_journees').select('id, statut').eq('id', body.journeeId).maybeSingle();
    if (!j) return Response.json({ error: 'Journée introuvable.' }, { status: 404 });
    if (j.statut === 'ouverte') return Response.json({ error: 'Verrouille d\'abord la journée (les équipes doivent être figées).' }, { status: 409 });
    const joueurs = await tousLesJoueurs(false);
    const postes = new Map(joueurs.map(x => [x.id, x.poste]));
    const { entrees, inconnus, ignorees } = parserStatsJournee(String(body.texte || ''), joueurs);
    if (!entrees.size) return Response.json({ error: 'Aucun joueur reconnu.', inconnus, ignorees }, { status: 400 });
    const lignes = [...entrees.entries()].map(([joueur_id, stats]) => ({ journee_id: j.id, joueur_id, stats, points: pointsJoueur(postes.get(joueur_id)!, stats) }));
    for (let i = 0; i < lignes.length; i += 500) {
      const { error } = await supabaseAdmin.from('fantasy_stats').upsert(lignes.slice(i, i + 500) as never);
      if (error) return Response.json({ error: error.message }, { status: 500 });
    }
    return Response.json({ ok: true, joueurs: lignes.length, inconnus, ignorees });
  }

  if (action === 'calculer') {
    const { data: j } = await supabaseAdmin.from('fantasy_journees').select('id, statut').eq('id', body.journeeId).maybeSingle();
    if (!j) return Response.json({ error: 'Journée introuvable.' }, { status: 404 });
    if (j.statut === 'ouverte') return Response.json({ error: 'Verrouille d\'abord la journée.' }, { status: 409 });
    const joueurs = await tousLesJoueurs(false);
    const mapJ = new Map(joueurs.map(x => [x.id, x]));
    const { data: st } = await supabaseAdmin.from('fantasy_stats').select('joueur_id, stats, points').eq('journee_id', j.id).limit(5000);
    if (!st || !st.length) return Response.json({ error: 'Aucune stat saisie pour cette journée.' }, { status: 400 });
    const perfs = new Map<string, PerfJoueur>();
    st.forEach(s => { const jo = mapJ.get(s.joueur_id); if (jo) perfs.set(s.joueur_id, { poste: jo.poste, minutes: (s.stats as StatsJoueur).minutes || 0, points: s.points }); });
    const { data: instantanes } = await supabaseAdmin.from('fantasy_instantanes').select('user_id, titulaires, reservistes, capitaine').eq('journee_id', j.id).limit(50000);
    const { data: anciens } = await supabaseAdmin.from('fantasy_scores').select('user_id, credites').eq('journee_id', j.id).limit(50000);
    const credites = new Map<string, number>((anciens || []).map(x => [x.user_id as string, x.credites as number] as [string, number]));
    let calcules = 0, meilleur = 0; const erreurs: string[] = [];
    for (const inst of instantanes || []) {
      const eq = equipeDeLigne(inst as { titulaires: unknown; reservistes: unknown; capitaine: string | null });
      const r = scoreEquipe(eq, perfs, mapJ);
      const aCrediter = Math.round(r.total * FACTEUR_CLASSEMENT);
      const deja = credites.get(inst.user_id) || 0;
      const delta = aCrediter - deja;
      let creditesApres = deja;
      if (delta !== 0) {
        const c = await crediterFantasy(inst.user_id, delta, j.id, supabaseAdmin);
        if (c.ok) creditesApres = aCrediter; else erreurs.push(c.erreur || 'Crédit refusé');
      }
      const { error } = await supabaseAdmin.from('fantasy_scores').upsert({ journee_id: j.id, user_id: inst.user_id, points: r.total, credites: creditesApres, detail: { lignes: r.detail, remplacements: r.remplacements } } as never);
      if (error) erreurs.push(error.message);
      calcules++; meilleur = Math.max(meilleur, r.total);
    }
    // Mode 7 joueurs
    const { data: inst7 } = await supabaseAdmin.from('fantasy7_instantanes').select('user_id, titulaires, capitaine').eq('journee_id', j.id).limit(50000);
    const { data: anciens7 } = await supabaseAdmin.from('fantasy7_scores').select('user_id, credites').eq('journee_id', j.id).limit(50000);
    const credites7 = new Map<string, number>((anciens7 || []).map(x => [x.user_id as string, x.credites as number] as [string, number]));
    let calcules7 = 0, meilleur7 = 0;
    for (const inst of inst7 || []) {
      const eq7 = { titulaires: Array.isArray(inst.titulaires) ? (inst.titulaires as string[]) : [], capitaine: (inst.capitaine as string | null) || null };
      const r = scoreEquipe7(eq7, perfs);
      const aCrediter = Math.round(r.total * FACTEUR_CLASSEMENT);
      const deja = credites7.get(inst.user_id) || 0;
      const delta = aCrediter - deja;
      let creditesApres = deja;
      if (delta !== 0) {
        const c = await crediterFantasy7(inst.user_id, delta, j.id, supabaseAdmin);
        if (c.ok) creditesApres = aCrediter; else erreurs.push(c.erreur || 'Crédit refusé');
      }
      const { error } = await supabaseAdmin.from('fantasy7_scores').upsert({ journee_id: j.id, user_id: inst.user_id, points: r.total, credites: creditesApres, detail: { lignes: r.detail } } as never);
      if (error) erreurs.push(error.message);
      calcules7++; meilleur7 = Math.max(meilleur7, r.total);
    }
    await supabaseAdmin.from('fantasy_journees').update({ statut: 'calculee' } as never).eq('id', j.id);
    return Response.json({ ok: true, equipes: calcules, meilleur, equipes7: calcules7, meilleur7, erreurs: erreurs.slice(0, 5) });
  }

  return Response.json({ error: 'Action inconnue.' }, { status: 400 });
}
