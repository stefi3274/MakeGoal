import { supabaseAdmin, utilisateurDe, profilsDe } from '../../../lib/fantasyServeur';
import { EMOJIS_CHAT, ID_VALIDE, MESSAGES_AFFICHES, SEUIL_MASQUAGE, contientLien, nettoyerMessage } from '../../../lib/chat';

export const maxDuration = 20;
const SANS_CACHE = { 'Cache-Control': 'no-store' };
const rep = (corps: Record<string, unknown>, status = 200) => Response.json(corps, { status, headers: SANS_CACHE });
const il_y_a = (ms: number) => new Date(Date.now() - ms).toISOString();

async function estAdmin(userId: string): Promise<boolean> {
  const { data } = await supabaseAdmin.from('admins').select('user_id').eq('user_id', userId).maybeSingle();
  return !!data;
}
async function banActif(userId: string): Promise<{ jusqu_a: string; raison: string | null } | null> {
  const { data } = await supabaseAdmin.from('chat_bans').select('jusqu_a, raison').eq('user_id', userId).maybeSingle();
  if (!data || new Date(data.jusqu_a as string).getTime() <= Date.now()) return null;
  return { jusqu_a: data.jusqu_a as string, raison: (data.raison as string | null) || null };
}

type Ligne = { id: string; user_id: string; contenu: string; statut: string; nb_signalements: number; cree_le: string };

// GET : derniers messages avec réactions. Connexion obligatoire (lecture comprise).
export async function GET(request: Request) {
  const u = await utilisateurDe(request);
  if (u instanceof Response) return u;
  const admin = await estAdmin(u.userId);

  let q = supabaseAdmin.from('chat_messages').select('id, user_id, contenu, statut, nb_signalements, cree_le').order('cree_le', { ascending: false }).limit(MESSAGES_AFFICHES);
  q = admin ? q.neq('statut', 'supprime') : q.eq('statut', 'visible');
  const { data, error } = await q;
  if (error) return rep({ error: 'Le chat n\'est pas encore activé (SQL manquant).' }, 500);
  const lignes = ((data || []) as Ligne[]).reverse();
  const ids = lignes.map(l => l.id);
  const auteurs = [...new Set(lignes.map(l => l.user_id))];

  const [{ data: reacts }, { data: noms }, profils, ban] = await Promise.all([
    ids.length ? supabaseAdmin.from('chat_reactions').select('message_id, user_id, emoji').in('message_id', ids).limit(20000) : Promise.resolve({ data: [] as { message_id: string; user_id: string; emoji: string }[] }),
    auteurs.length ? supabaseAdmin.from('profiles').select('id, username').in('id', auteurs) : Promise.resolve({ data: [] as { id: string; username: string | null }[] }),
    profilsDe(auteurs),
    banActif(u.userId),
  ]);
  const pseudo = new Map<string, string>((noms || []).map(n => [String(n.id), String(n.username || '')]));
  const parMessage = new Map<string, Map<string, { n: number; moi: boolean }>>();
  (reacts || []).forEach(r => {
    const m = parMessage.get(r.message_id) || new Map<string, { n: number; moi: boolean }>();
    const e = m.get(r.emoji) || { n: 0, moi: false };
    e.n += 1; if (r.user_id === u.userId) e.moi = true;
    m.set(r.emoji, e); parMessage.set(r.message_id, m);
  });

  const messages = lignes.map(l => {
    const p = profils.get(l.user_id);
    const reactions = [...(parMessage.get(l.id) || new Map<string, { n: number; moi: boolean }>()).entries()].map(([emoji, v]) => ({ emoji, n: v.n, moi: v.moi }));
    return {
      id: l.id, contenu: l.contenu, cree_le: l.cree_le, moi: l.user_id === u.userId,
      auteur: pseudo.get(l.user_id) || p?.nom || 'Fan', embleme: p?.embleme || '⚽', couleur: p?.couleur1 || '#bf00ff',
      reactions,
      ...(admin ? { statut: l.statut, signalements: l.nb_signalements, user_id: l.user_id } : {}),
    };
  });
  return rep({ messages, admin, ban, emojis: EMOJIS_CHAT });
}

export async function POST(request: Request) {
  const u = await utilisateurDe(request);
  if (u instanceof Response) return u;
  const brut = await request.text();
  if (brut.length > 4000) return rep({ error: 'Requête trop grande.' }, 413);
  let body: Record<string, unknown> = {};
  try { body = JSON.parse(brut); } catch { return rep({ error: 'Requête invalide.' }, 400); }
  const action = String(body.action || '');
  const admin = await estAdmin(u.userId);
  const idMessage = typeof body.message_id === 'string' && ID_VALIDE.test(body.message_id) ? body.message_id : null;

  // Actions réservées aux administrateurs.
  if (action === 'bannir' || action === 'debannir' || action === 'retablir') {
    if (!admin) return rep({ error: 'Accès réservé aux administrateurs.' }, 403);
    if (action === 'retablir') {
      if (!idMessage) return rep({ error: 'Message invalide.' }, 400);
      await supabaseAdmin.from('chat_messages').update({ statut: 'visible', nb_signalements: 0 } as never).eq('id', idMessage);
      await supabaseAdmin.from('chat_signalements').delete().eq('message_id', idMessage);
      return rep({ ok: true });
    }
    const cible = typeof body.user_id === 'string' && ID_VALIDE.test(body.user_id) ? body.user_id : null;
    if (!cible) return rep({ error: 'Utilisateur invalide.' }, 400);
    if (action === 'debannir') { await supabaseAdmin.from('chat_bans').delete().eq('user_id', cible); return rep({ ok: true }); }
    if (await estAdmin(cible)) return rep({ error: 'Impossible de bannir un administrateur.' }, 400);
    const heures = Math.min(Math.max(Math.floor(Number(body.heures) || 24), 1), 24 * 365);
    const raison = nettoyerMessage(body.raison).slice(0, 120) || null;
    await supabaseAdmin.from('chat_bans').upsert({ user_id: cible, jusqu_a: new Date(Date.now() + heures * 3600000).toISOString(), raison, par: u.userId } as never);
    // Retire les messages récents de la personne bannie (24 h).
    await supabaseAdmin.from('chat_messages').update({ statut: 'supprime' } as never).eq('user_id', cible).gte('cree_le', il_y_a(24 * 3600000));
    return rep({ ok: true });
  }

  if (action === 'supprimer') {
    if (!idMessage) return rep({ error: 'Message invalide.' }, 400);
    const { data: m } = await supabaseAdmin.from('chat_messages').select('user_id').eq('id', idMessage).maybeSingle();
    if (!m) return rep({ error: 'Message introuvable.' }, 404);
    if (m.user_id !== u.userId && !admin) return rep({ error: 'Tu ne peux supprimer que tes messages.' }, 403);
    await supabaseAdmin.from('chat_messages').update({ statut: 'supprime' } as never).eq('id', idMessage);
    return rep({ ok: true });
  }

  // Les actions ci-dessous sont interdites aux personnes bannies.
  const ban = await banActif(u.userId);
  if (ban) return rep({ error: 'Tu es suspendu du chat jusqu\'au ' + new Date(ban.jusqu_a).toLocaleString('fr-FR') + '.', ban }, 403);

  if (action === 'envoyer') {
    const contenu = nettoyerMessage(body.contenu);
    if (contenu.length < 1) return rep({ error: 'Écris un message.' }, 400);
    if (!admin && contientLien(contenu)) return rep({ error: 'Les liens ne sont pas autorisés dans le chat.' }, 400);
    const [{ data: dernier }, { count: sur30s }, { count: surHeure }] = await Promise.all([
      supabaseAdmin.from('chat_messages').select('contenu, cree_le').eq('user_id', u.userId).order('cree_le', { ascending: false }).limit(1),
      supabaseAdmin.from('chat_messages').select('id', { count: 'exact', head: true }).eq('user_id', u.userId).gte('cree_le', il_y_a(30000)),
      supabaseAdmin.from('chat_messages').select('id', { count: 'exact', head: true }).eq('user_id', u.userId).gte('cree_le', il_y_a(3600000)),
    ]);
    const d = (dernier || [])[0] as { contenu: string; cree_le: string } | undefined;
    if (!admin) {
      if (d && Date.now() - new Date(d.cree_le).getTime() < 2000) return rep({ error: 'Doucement, attends 2 secondes.' }, 429);
      if ((sur30s || 0) >= 4) return rep({ error: 'Trop de messages d\'un coup. Respire, réessaie dans un instant.' }, 429);
      if ((surHeure || 0) >= 60) return rep({ error: 'Limite horaire atteinte (60 messages). Reviens plus tard.' }, 429);
      if (d && d.contenu.toLowerCase() === contenu.toLowerCase() && Date.now() - new Date(d.cree_le).getTime() < 120000) return rep({ error: 'Message déjà envoyé.' }, 400);
    }
    const { error } = await supabaseAdmin.from('chat_messages').insert({ user_id: u.userId, contenu } as never);
    if (error) return rep({ error: 'Envoi impossible.' }, 500);
    return rep({ ok: true });
  }

  if (action === 'reagir') {
    const emoji = String(body.emoji || '');
    if (!idMessage || !EMOJIS_CHAT.includes(emoji)) return rep({ error: 'Réaction invalide.' }, 400);
    const { data: m } = await supabaseAdmin.from('chat_messages').select('statut').eq('id', idMessage).maybeSingle();
    if (!m || m.statut !== 'visible') return rep({ error: 'Message indisponible.' }, 404);
    const { data: deja } = await supabaseAdmin.from('chat_reactions').select('emoji').eq('message_id', idMessage).eq('user_id', u.userId).eq('emoji', emoji).maybeSingle();
    if (deja) { await supabaseAdmin.from('chat_reactions').delete().eq('message_id', idMessage).eq('user_id', u.userId).eq('emoji', emoji); return rep({ ok: true }); }
    if (!admin) {
      const { count } = await supabaseAdmin.from('chat_reactions').select('message_id', { count: 'exact', head: true }).eq('user_id', u.userId).gte('cree_le', il_y_a(60000));
      if ((count || 0) >= 20) return rep({ error: 'Trop de réactions, ralentis un peu.' }, 429);
    }
    const { error } = await supabaseAdmin.from('chat_reactions').insert({ message_id: idMessage, user_id: u.userId, emoji } as never);
    if (error) return rep({ error: 'Réaction impossible.' }, 500);
    return rep({ ok: true });
  }

  if (action === 'signaler') {
    if (!idMessage) return rep({ error: 'Message invalide.' }, 400);
    const { data: m } = await supabaseAdmin.from('chat_messages').select('user_id, statut').eq('id', idMessage).maybeSingle();
    if (!m || m.statut === 'supprime') return rep({ error: 'Message introuvable.' }, 404);
    if (m.user_id === u.userId) return rep({ error: 'Tu ne peux pas signaler ton propre message.' }, 400);
    if (!admin) {
      const { count } = await supabaseAdmin.from('chat_signalements').select('message_id', { count: 'exact', head: true }).eq('user_id', u.userId).gte('cree_le', il_y_a(3600000));
      if ((count || 0) >= 10) return rep({ error: 'Trop de signalements pour le moment.' }, 429);
    }
    await supabaseAdmin.from('chat_signalements').upsert({ message_id: idMessage, user_id: u.userId } as never, { onConflict: 'message_id,user_id', ignoreDuplicates: true });
    const { count } = await supabaseAdmin.from('chat_signalements').select('user_id', { count: 'exact', head: true }).eq('message_id', idMessage);
    const n = count || 0;
    const maj: Record<string, unknown> = { nb_signalements: n };
    if (n >= SEUIL_MASQUAGE && m.statut === 'visible') maj.statut = 'masque';
    await supabaseAdmin.from('chat_messages').update(maj as never).eq('id', idMessage);
    return rep({ ok: true });
  }

  return rep({ error: 'Action inconnue.' }, 400);
}
