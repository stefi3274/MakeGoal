import { supabaseAdmin, authentifier, estReponse, recalculerTickets, journal } from '../../../lib/caisseServeur';
import { parserLotCaisse, offresDuLot, matchVisibleCaisse, type Fuseau } from '../../../lib/caisseLot';
import { limiteAdminCaisse, verifierLimite } from '../../../lib/rateLimit';
import { parserResultats, trouverMatch } from '../../../lib/caisseResultats';
import { VALIDITE_JOURS } from '../../../lib/caisse';
import { MARCHES, choixValide, libelleOffre, libelleCombo, resultatAuto, type Marche, type Leg, type Resultat } from '../../../lib/caisse';

type OffreIn = { marche: Marche; choix: string; cote: number; actif?: boolean; libelle?: string; legs?: Leg[] | null };
type Match = { id: string; equipe1: string; equipe2: string; date_match: string; cote_1: number | null; cote_x: number | null; cote_2: number | null; cote_plus2_5?: number | null; cote_moins2_5?: number | null; score_home: number | null; score_away: number | null; score_mt_home: number | null; score_mt_away: number | null };

const dc = (a: number, b: number) => Math.round((1 / (1 / a + 1 / b)) * 100) / 100;
const entier = (v: unknown) => (v === null || v === '' || v === undefined ? null : Number.isInteger(Number(v)) && Number(v) >= 0 && Number(v) <= 99 ? Number(v) : NaN);

const ACTIONS_JOURNALISEES = new Set(['sauver', 'activer', 'supprimer', 'regler_match', 'resultat_offre', 'annuler_ticket', 'importer_lot', 'resultats_lot', 'caissier_ajouter', 'caissier_retirer']);

export async function POST(request: Request) {
  const copie = request.clone();
  const rep = await traiterAdmin(request);
  if (rep.ok) {
    const b = await copie.json().catch(() => null) as Record<string, unknown> | null;
    if (b && typeof b.action === 'string' && ACTIONS_JOURNALISEES.has(b.action)) {
      const acteur = await authentifier(copie, true);
      if (!estReponse(acteur)) {
        const { action, texte, ...reste } = b;
        await journal(acteur, 'admin_' + String(action), { ...reste, ...(typeof texte === 'string' ? { texte: texte.slice(0, 500) } : {}) });
      }
    }
  }
  return rep;
}

async function traiterAdmin(request: Request): Promise<Response> {
  const acteur = await authentifier(request, true);
  if (estReponse(acteur)) return acteur;
  { const l = await verifierLimite(limiteAdminCaisse, acteur.userId); if (l) return l; }
  const b = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!b || typeof b.action !== 'string') return Response.json({ error: 'Action requise.' }, { status: 400 });

  const charger = async (matchId: unknown) => {
    if (typeof matchId !== 'string') return null;
    const { data } = await supabaseAdmin.from('matchs').select('*').eq('id', matchId).maybeSingle();
    return data as Match | null;
  };

  // Enregistre les scores d'un match, règle les offres automatiques et recalcule les tickets touchés.
  const appliquerScore = async (m: Match, ftH: number | null, ftA: number | null, htH: number | null, htA: number | null) => {
    const { error: errM } = await supabaseAdmin.from('matchs').update({ score_home: ftH, score_away: ftA, score_mt_home: htH, score_mt_away: htA } as never).eq('id', m.id);
    if (errM) return { erreur: errM.message, offresReglees: 0, ticketsMisAJour: 0 };
    const { data: offres } = await supabaseAdmin.from('paris_offres').select('id, marche, choix, legs, resultat').eq('match_id', m.id);
    const ctx = { ftH, ftA, htH, htA };
    const modifies: string[] = [];
    for (const o of (offres || []) as { id: string; marche: Marche; choix: string; legs: Leg[] | null; resultat: Resultat | null }[]) {
      if (!MARCHES[o.marche].auto) continue;
      const r = resultatAuto(o.marche, o.choix, ctx, o.legs);
      if (r !== o.resultat) {
        const { error } = await supabaseAdmin.from('paris_offres').update({ resultat: r } as never).eq('id', o.id);
        if (!error) modifies.push(o.id);
      }
    }
    const ticketsMisAJour = await recalculerTickets(modifies);
    return { erreur: null as string | null, offresReglees: modifies.length, ticketsMisAJour };
  };

  switch (b.action) {
    case 'lister': {
      const m = await charger(b.matchId);
      if (!m) return Response.json({ error: 'Match introuvable.' }, { status: 404 });
      const { data } = await supabaseAdmin.from('paris_offres').select('*').eq('match_id', m.id).order('created_at', { ascending: true });
      return Response.json({ match: m, offres: data || [] });
    }

    // Crée 1/X/2, double chance et plus/moins 2.5 à partir des cotes déjà reçues de l'API (sans écraser l'existant).
    case 'preremplir': {
      const m = await charger(b.matchId);
      if (!m) return Response.json({ error: 'Match introuvable.' }, { status: 404 });
      const n = (v: number | null | undefined) => (v && Number(v) >= 1.01 ? Number(v) : null);
      const c1 = n(m.cote_1), cx = n(m.cote_x), c2 = n(m.cote_2);
      const prop: OffreIn[] = [];
      if (c1) prop.push({ marche: '1x2', choix: '1', cote: c1 });
      if (cx) prop.push({ marche: '1x2', choix: 'X', cote: cx });
      if (c2) prop.push({ marche: '1x2', choix: '2', cote: c2 });
      if (c1 && cx) prop.push({ marche: 'dc', choix: '1X', cote: Math.max(1.01, dc(c1, cx)) });
      if (cx && c2) prop.push({ marche: 'dc', choix: 'X2', cote: Math.max(1.01, dc(cx, c2)) });
      if (c1 && c2) prop.push({ marche: 'dc', choix: '12', cote: Math.max(1.01, dc(c1, c2)) });
      if (n(m.cote_plus2_5)) prop.push({ marche: 'ou', choix: 'over_2.5', cote: Number(m.cote_plus2_5) });
      if (n(m.cote_moins2_5)) prop.push({ marche: 'ou', choix: 'under_2.5', cote: Number(m.cote_moins2_5) });
      if (!prop.length) return Response.json({ error: 'Aucune cote API pour ce match : saisissez-les à la main.' }, { status: 400 });
      const { data: ex } = await supabaseAdmin.from('paris_offres').select('marche, choix').eq('match_id', m.id);
      const deja = new Set((ex || []).map((o: { marche: string; choix: string }) => o.marche + '|' + o.choix));
      const lignes = prop.filter(o => !deja.has(o.marche + '|' + o.choix)).map(o => ({ match_id: m.id, marche: o.marche, choix: o.choix, libelle: libelleOffre(o.marche, o.choix, m.equipe1, m.equipe2), cote: o.cote, actif: true }));
      if (lignes.length) {
        const { error } = await supabaseAdmin.from('paris_offres').insert(lignes as never);
        if (error) return Response.json({ error: error.message }, { status: 500 });
      }
      return Response.json({ ok: true, ajoutees: lignes.length });
    }

    case 'sauver': {
      const m = await charger(b.matchId);
      if (!m) return Response.json({ error: 'Match introuvable.' }, { status: 404 });
      const liste = Array.isArray(b.offres) ? (b.offres as OffreIn[]) : [];
      if (!liste.length || liste.length > 60) return Response.json({ error: 'Entre 1 et 60 offres.' }, { status: 400 });
      const lignes: Record<string, unknown>[] = [];
      for (const o of liste) {
        if (!o || !(o.marche in MARCHES)) return Response.json({ error: 'Marché inconnu.' }, { status: 400 });
        const choix = String(o.choix || '').trim();
        const cote = Math.round(Number(o.cote) * 100) / 100;
        if (!choixValide(o.marche, choix)) return Response.json({ error: 'Choix invalide pour ' + MARCHES[o.marche].label + ' : « ' + choix + ' »' }, { status: 400 });
        if (!Number.isFinite(cote) || cote < 1.01 || cote > 1000) return Response.json({ error: 'Cote invalide (1.01 à 1000) pour « ' + choix + ' ».' }, { status: 400 });
        let legs: Leg[] | null = null;
        if (o.marche === 'combo') {
          legs = Array.isArray(o.legs) ? o.legs : [];
          if (legs.length < 2 || legs.length > 4 || legs.some(l => !l || l.marche === 'combo' || !MARCHES[l.marche]?.auto || !choixValide(l.marche, String(l.choix)))) return Response.json({ error: 'Un combo = 2 à 4 jambes valides (1X2, double chance, mi-temps, plus/moins).' }, { status: 400 });
        }
        const libelle = (o.libelle || '').trim() || (legs ? libelleCombo(legs, m.equipe1, m.equipe2) : libelleOffre(o.marche, choix, m.equipe1, m.equipe2));
        lignes.push({ match_id: m.id, marche: o.marche, choix, libelle: libelle.slice(0, 140), cote, actif: o.actif !== false, legs });
      }
      const { error } = await supabaseAdmin.from('paris_offres').upsert(lignes as never, { onConflict: 'match_id,marche,choix' });
      if (error) return Response.json({ error: error.message }, { status: 500 });
      return Response.json({ ok: true });
    }

    case 'activer': {
      const { error } = await supabaseAdmin.from('paris_offres').update({ actif: b.actif === true } as never).eq('id', String(b.offreId));
      return error ? Response.json({ error: error.message }, { status: 500 }) : Response.json({ ok: true });
    }

    case 'supprimer': {
      const { data: utilisee } = await supabaseAdmin.from('tickets_caisse_lignes').select('id').eq('offre_id', String(b.offreId)).limit(1);
      if (utilisee && utilisee.length) return Response.json({ error: 'Offre déjà jouée sur un ticket : désactivez-la au lieu de la supprimer.' }, { status: 409 });
      const { error } = await supabaseAdmin.from('paris_offres').delete().eq('id', String(b.offreId));
      return error ? Response.json({ error: error.message }, { status: 500 }) : Response.json({ ok: true });
    }

    // Saisie du score (final + mi-temps) : règle automatiquement tous les marchés calculables.
    case 'regler_match': {
      const m = await charger(b.matchId);
      if (!m) return Response.json({ error: 'Match introuvable.' }, { status: 404 });
      const ftH = entier(b.ftH), ftA = entier(b.ftA), htH = entier(b.htH), htA = entier(b.htA);
      if ([ftH, ftA, htH, htA].some(v => typeof v === 'number' && Number.isNaN(v))) return Response.json({ error: 'Scores : entiers de 0 à 99.' }, { status: 400 });
      if ((ftH === null) !== (ftA === null) || (htH === null) !== (htA === null)) return Response.json({ error: 'Saisissez les deux scores de chaque période.' }, { status: 400 });
      if (ftH !== null && htH !== null && ((htH as number) > (ftH as number) || (htA as number) > (ftA as number))) return Response.json({ error: 'Score mi-temps supérieur au score final : incohérent.' }, { status: 400 });
      const r = await appliquerScore(m, ftH as number | null, ftA as number | null, htH as number | null, htA as number | null);
      if (r.erreur) return Response.json({ error: r.erreur }, { status: 500 });
      return Response.json({ ok: true, offresReglees: r.offresReglees, ticketsMisAJour: r.ticketsMisAJour });
    }

    // Règlement manuel (buteurs, qualification, ou correction d'une offre).
    case 'resultat_offre': {
      const r = b.resultat === null ? null : String(b.resultat);
      if (r !== null && !['gagne', 'perdu', 'annule'].includes(r)) return Response.json({ error: 'Résultat invalide.' }, { status: 400 });
      const { error } = await supabaseAdmin.from('paris_offres').update({ resultat: r } as never).eq('id', String(b.offreId));
      if (error) return Response.json({ error: error.message }, { status: 500 });
      const tickets = await recalculerTickets([String(b.offreId)]);
      return Response.json({ ok: true, ticketsMisAJour: tickets });
    }

    // Résultats en lot : une ligne « Equipe1 - Equipe2 - 2-1 (1-0) » par match déjà commencé.
    case 'resultats_lot': {
      const { resultats, erreurs } = parserResultats(typeof b.texte === 'string' ? b.texte : '');
      if (!resultats.length) return Response.json({ error: 'Aucun résultat reconnu.', erreurs }, { status: 400 });
      if (resultats.length > 60) return Response.json({ error: 'Maximum 60 résultats par collage.' }, { status: 400 });
      const limite = new Date(Date.now() - 30 * 86400000).toISOString();
      const { data: cand } = await supabaseAdmin.from('matchs').select('id, equipe1, equipe2, date_match').eq('sport', 'football').gte('date_match', limite).limit(500);
      const rapport: { ligne: number; texte: string; ok: boolean }[] = [];
      let offresReglees = 0, ticketsMisAJour = 0;
      for (const r of resultats) {
        const t = trouverMatch((cand || []) as { id: string; equipe1: string; equipe2: string; date_match: string }[], r.equipe1, r.equipe2);
        const nom = r.equipe1 + ' - ' + r.equipe2;
        if (!t) { rapport.push({ ligne: r.ligne, ok: false, texte: nom + ' : match introuvable (ou pas encore commencé).' }); continue; }
        const m = await charger(t.match.id);
        if (!m) { rapport.push({ ligne: r.ligne, ok: false, texte: nom + ' : match introuvable.' }); continue; }
        const [ftH, ftA, h1, h2] = t.inverse ? [r.ftA, r.ftH, r.htA, r.htH] : [r.ftH, r.ftA, r.htH, r.htA];
        // Mi-temps absente du collage : on garde celle déjà saisie, s'il y en a une.
        const htH = h1 !== null ? h1 : m.score_mt_home, htA = h2 !== null ? h2 : m.score_mt_away;
        if (htH !== null && htA !== null && (htH > ftH || htA > ftA)) { rapport.push({ ligne: r.ligne, ok: false, texte: nom + ' : mi-temps incohérente avec le score final.' }); continue; }
        const res = await appliquerScore(m, ftH, ftA, htH, htA);
        if (res.erreur) { rapport.push({ ligne: r.ligne, ok: false, texte: nom + ' : ' + res.erreur }); continue; }
        offresReglees += res.offresReglees; ticketsMisAJour += res.ticketsMisAJour;
        rapport.push({ ligne: r.ligne, ok: true, texte: m.equipe1 + ' ' + ftH + '-' + ftA + ' ' + m.equipe2 + (htH !== null ? ' (mi-temps ' + htH + '-' + htA + ')' : '') + (t.inverse ? ' · équipes inversées corrigées' : '') });
      }
      return Response.json({ ok: true, rapport, erreurs, offresReglees, ticketsMisAJour });
    }

    // Tickets gagnants à payer et total à reverser (expirés signalés).
    case 'gagnants': {
      const { data } = await supabaseAdmin.from('tickets_caisse').select('id, numero, mise, cote_totale, gain_final, created_at').eq('statut', 'gagnant').order('numero', { ascending: true }).limit(1000);
      const base = (data || []) as { id: string; numero: number; mise: number; cote_totale: number; gain_final: number | null; created_at: string }[];
      const dernier = new Map<string, number>();
      if (base.length) {
        const { data: lignes } = await supabaseAdmin.from('tickets_caisse_lignes').select('ticket_id, date_match').in('ticket_id', base.map(t => t.id));
        for (const l of (lignes || []) as { ticket_id: string; date_match: string }[]) dernier.set(l.ticket_id, Math.max(dernier.get(l.ticket_id) || 0, new Date(l.date_match).getTime()));
      }
      const liste = base.map(t => ({ ...t, expire: Date.now() > (dernier.get(t.id) || 0) + VALIDITE_JOURS * 86400000 }));
      const total = Math.round(liste.filter(t => !t.expire).reduce((a, t) => a + Number(t.gain_final || 0), 0) * 100) / 100;
      return Response.json({ gagnants: liste, total, nombre: liste.length });
    }

    // Gestion des caissiers (comptes déjà inscrits sur le site).
    case 'caissiers_lister': {
      const { data } = await supabaseAdmin.from('caissiers').select('user_id, nom, created_at').order('created_at', { ascending: true });
      const liste = [];
      for (const c of (data || []) as { user_id: string; nom: string | null; created_at: string }[]) {
        const { data: u } = await supabaseAdmin.auth.admin.getUserById(c.user_id);
        liste.push({ ...c, email: u?.user?.email || '' });
      }
      return Response.json({ caissiers: liste });
    }
    case 'caissier_ajouter': {
      const email = typeof b.email === 'string' ? b.email.trim().toLowerCase() : '';
      const nom = typeof b.nom === 'string' ? b.nom.trim().slice(0, 60) : '';
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return Response.json({ error: 'Email invalide.' }, { status: 400 });
      let userId: string | null = null;
      for (let page = 1; page <= 20 && !userId; page++) {
        const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 200 });
        if (error) return Response.json({ error: error.message }, { status: 500 });
        userId = data.users.find(u => (u.email || '').toLowerCase() === email)?.id || null;
        if (data.users.length < 200) break;
      }
      if (!userId) return Response.json({ error: 'Aucun compte avec cet email : le caissier doit d\'abord créer son compte sur le site.' }, { status: 404 });
      const { error } = await supabaseAdmin.from('caissiers').upsert({ user_id: userId, nom: nom || null } as never, { onConflict: 'user_id' });
      if (error) return Response.json({ error: error.message }, { status: 500 });
      return Response.json({ ok: true });
    }
    case 'caissier_retirer': {
      if (typeof b.userId !== 'string') return Response.json({ error: 'Caissier requis.' }, { status: 400 });
      const { error } = await supabaseAdmin.from('caissiers').delete().eq('user_id', b.userId);
      if (error) return Response.json({ error: error.message }, { status: 500 });
      return Response.json({ ok: true });
    }
    case 'journal': {
      const { data } = await supabaseAdmin.from('audit_caisse').select('id, created_at, email, action, details').order('created_at', { ascending: false }).limit(200);
      return Response.json({ journal: data || [] });
    }

    case 'annuler_ticket': {
      const { data: t } = await supabaseAdmin.from('tickets_caisse').select('id, statut').eq('id', String(b.ticketId)).maybeSingle();
      if (!t || t.statut !== 'en_attente') return Response.json({ error: 'Seul un ticket en attente peut être annulé.' }, { status: 409 });
      const { data: l } = await supabaseAdmin.from('tickets_caisse_lignes').select('date_match').eq('ticket_id', t.id);
      if ((l || []).some((x: { date_match: string }) => new Date(x.date_match).getTime() <= Date.now())) return Response.json({ error: 'Un match a déjà commencé : annulation impossible.' }, { status: 409 });
      const { data: maj } = await supabaseAdmin.from('tickets_caisse').update({ statut: 'annule' } as never).eq('id', t.id).eq('statut', 'en_attente').select('id');
      return maj && maj.length ? Response.json({ ok: true }) : Response.json({ error: 'Ticket modifié entre-temps.' }, { status: 409 });
    }

    // Rapport de caisse depuis une date (par défaut : aujourd'hui, heure d'Haïti UTC-4) + derniers tickets.
    case 'tickets': {
      const hHaiti = new Date(Date.now() - 4 * 3600 * 1000);
      const defaut = new Date(Date.UTC(hHaiti.getUTCFullYear(), hHaiti.getUTCMonth(), hHaiti.getUTCDate(), 4, 0, 0)).toISOString();
      const depuis = typeof b.depuis === 'string' && !Number.isNaN(Date.parse(b.depuis)) ? new Date(b.depuis).toISOString() : defaut;
      const { data } = await supabaseAdmin.from('tickets_caisse').select('id, numero, mise, cote_totale, gain_potentiel, statut, gain_final, created_at, caissier_id').gte('created_at', depuis).order('created_at', { ascending: false }).limit(300);
      const t = (data || []) as { mise: number; statut: string; gain_final: number | null }[];
      const somme = (f: (x: { mise: number; statut: string; gain_final: number | null }) => number) => Math.round(t.reduce((a, x) => a + f(x), 0) * 100) / 100;
      return Response.json({
        depuis, tickets: data || [],
        rapport: {
          nombre: t.filter(x => x.statut !== 'annule').length,
          encaisse: somme(x => (x.statut === 'annule' ? 0 : Number(x.mise))),
          paye: somme(x => (x.statut === 'paye' ? Number(x.gain_final || 0) : 0)),
          aPayer: somme(x => (x.statut === 'gagnant' ? Number(x.gain_final || 0) : 0)),
          enAttente: t.filter(x => x.statut === 'en_attente').length
        }
      });
    }

    // Liste des matchs pour l'admin. Règle des 3 jours : un match disparaît 3 jours après son coup d'envoi,
    // sauf s'il reste des offres non réglées jouées sur des tickets en attente (il faut pouvoir les régler).
    case 'matchs': {
      const limite = new Date(Date.now() - 30 * 86400000).toISOString();
      const { data } = await supabaseAdmin.from('matchs').select('id, equipe1, equipe2, competition, date_match, sport').eq('sport', 'football').gte('date_match', limite).order('date_match', { ascending: false }).limit(200);
      const tous = (data || []) as { id: string; date_match: string }[];
      const vieux = tous.filter(m => !matchVisibleCaisse(m.date_match));
      let gardes = new Set<string>();
      if (vieux.length) {
        const { data: offres } = await supabaseAdmin.from('paris_offres').select('id, match_id').in('match_id', vieux.map(m => m.id)).is('resultat', null);
        const ids = (offres || []).map((o: { id: string }) => o.id);
        if (ids.length) {
          const { data: lignes } = await supabaseAdmin.from('tickets_caisse_lignes').select('offre_id, tickets_caisse(statut)').in('offre_id', ids);
          const actifs = new Set(((lignes || []) as unknown as { offre_id: string; tickets_caisse: { statut: string } | { statut: string }[] | null }[])
            .filter(l => { const t = Array.isArray(l.tickets_caisse) ? l.tickets_caisse[0] : l.tickets_caisse; return t && t.statut === 'en_attente'; }).map(l => l.offre_id));
          gardes = new Set((offres || []).filter((o: { id: string }) => actifs.has(o.id)).map((o: { match_id: string }) => o.match_id));
        }
      }
      const visibles = tous.filter(m => matchVisibleCaisse(m.date_match) || gardes.has(m.id)).map(m => ({ ...m, a_regler: !matchVisibleCaisse(m.date_match) }));
      return Response.json({ matchs: visibles });
    }

    // Collage en lot : crée les matchs (ou met à jour leurs cotes s'ils existent) et leurs offres.
    case 'importer_lot': {
      const fuseau: Fuseau = b.fuseau === 'Europe' ? 'Europe' : 'Haiti';
      const { matchs, erreurs } = parserLotCaisse(typeof b.texte === 'string' ? b.texte : '', fuseau);
      if (!matchs.length) return Response.json({ error: 'Aucun match reconnu.', erreurs }, { status: 400 });
      if (matchs.length > 60) return Response.json({ error: 'Maximum 60 matchs par collage.' }, { status: 400 });
      let crees = 0, misAJour = 0, offres = 0;
      for (const m of matchs) {
        const ou25 = (sens: 'over' | 'under') => m.cotes.ou.find(o => o.sens === sens && o.ligne === '2.5')?.cote ?? null;
        const champsCotes = { cote_1: m.cotes.c1, cote_x: m.cotes.cx, cote_2: m.cotes.c2, cote_plus2_5: ou25('over'), cote_moins2_5: ou25('under') };
        const { data: ex } = await supabaseAdmin.from('matchs').select('id').eq('equipe1', m.equipe1).eq('equipe2', m.equipe2).eq('date_match', m.date_match).maybeSingle();
        let id = ex?.id as string | undefined;
        if (id) {
          await supabaseAdmin.from('matchs').update(champsCotes as never).eq('id', id);
          misAJour++;
        } else {
          const { data: cree, error } = await supabaseAdmin.from('matchs').insert({ equipe1: m.equipe1, equipe2: m.equipe2, competition: m.competition || null, date_match: m.date_match, sport: 'football', ...champsCotes } as never).select('id').single();
          if (error || !cree) { erreurs.push(m.equipe1 + ' - ' + m.equipe2 + '  → ' + (error?.message || 'création impossible')); continue; }
          id = cree.id as string; crees++;
        }
        const lignes = offresDuLot(m.cotes).map(o => ({ match_id: id, marche: o.marche, choix: o.choix, libelle: libelleOffre(o.marche, o.choix, m.equipe1, m.equipe2), cote: o.cote, actif: true }));
        const { error: errO } = await supabaseAdmin.from('paris_offres').upsert(lignes as never, { onConflict: 'match_id,marche,choix' });
        if (errO) erreurs.push(m.equipe1 + ' - ' + m.equipe2 + '  → offres : ' + errO.message); else offres += lignes.length;
      }
      return Response.json({ ok: true, crees, misAJour, offres, erreurs });
    }
  }
  return Response.json({ error: 'Action inconnue.' }, { status: 400 });
}
