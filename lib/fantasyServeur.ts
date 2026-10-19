// Aides SERVEUR pour MakeGoal Fantasy (routes API uniquement : clé service_role).
import { createClient } from '@supabase/supabase-js';
import { BUDGET_DEPART, type JoueurFantasy, type EquipeFantasy, type Poste } from './fantasy';
import type { EtatBonus } from './bonusQuotidien';

export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string
);

export async function utilisateurDe(request: Request): Promise<{ userId: string } | Response> {
  const h = request.headers.get('authorization');
  if (!h || !h.startsWith('Bearer ')) return Response.json({ error: 'Connecte-toi pour jouer.' }, { status: 401 });
  const { data, error } = await supabaseAdmin.auth.getUser(h.replace('Bearer ', ''));
  if (error || !data.user) return Response.json({ error: 'Session invalide, reconnecte-toi.' }, { status: 401 });
  return { userId: data.user.id };
}

export async function adminDe(request: Request): Promise<{ userId: string } | Response> {
  const u = await utilisateurDe(request);
  if (u instanceof Response) return u;
  const { data } = await supabaseAdmin.from('admins').select('user_id').eq('user_id', u.userId).single();
  if (!data) return Response.json({ error: 'Accès réservé aux administrateurs' }, { status: 403 });
  return u;
}

type LigneJoueur = { id: string; nom: string; poste: string; club: string | null; pays: string | null; prix: number; photo: string | null; actif: boolean; competition: string | null };
export const versJoueur = (l: LigneJoueur): JoueurFantasy => ({ id: l.id, nom: l.nom, poste: l.poste as Poste, club: l.club || '', pays: l.pays, prix: l.prix, photo: l.photo, actif: l.actif, competition: l.competition });

export async function tousLesJoueurs(seulementActifs = false): Promise<JoueurFantasy[]> {
  let q = supabaseAdmin.from('fantasy_joueurs').select('id, nom, poste, club, pays, prix, photo, actif, competition').order('prix', { ascending: false }).limit(2000);
  if (seulementActifs) q = q.eq('actif', true);
  const { data } = await q;
  return ((data || []) as LigneJoueur[]).map(versJoueur);
}

export const equipeDeLigne = (l: { titulaires: unknown; reservistes: unknown; capitaine: string | null }): EquipeFantasy => ({
  titulaires: Array.isArray(l.titulaires) ? (l.titulaires as string[]) : [],
  reservistes: Array.isArray(l.reservistes) ? (l.reservistes as string[]) : [],
  capitaine: l.capitaine || null,
});

export type Journee = { id: string; titre: string; statut: string; date_limite: string | null; created_at: string };
// La journée « courante » est la plus récente. Les équipes sont modifiables tant qu'elle est ouverte
// (ou s'il n'existe encore aucune journée).
export async function journeeCourante(): Promise<Journee | null> {
  const { data } = await supabaseAdmin.from('fantasy_journees').select('id, titre, statut, date_limite, created_at').order('created_at', { ascending: false }).limit(1);
  return ((data || [])[0] as Journee) || null;
}
export function estOuverte(j: Journee | null): boolean {
  if (!j) return true;
  if (j.statut !== 'ouverte') return false;
  if (j.date_limite && new Date(j.date_limite).getTime() <= Date.now()) return false;
  return true;
}

// Bonus de connexion cumulé de l'utilisateur et budget total (budget de départ + bonus).
export async function bonusDe(userId: string): Promise<EtatBonus & { totalJours: number }> {
  const { data } = await supabaseAdmin.from('fantasy_bonus').select('solde, serie, dernier_jour, total_jours').eq('user_id', userId).maybeSingle();
  return { solde: data?.solde || 0, serie: data?.serie || 0, dernierJour: (data?.dernier_jour as string | null) || null, totalJours: data?.total_jours || 0 };
}
export async function budgetDe(userId: string): Promise<number> {
  return BUDGET_DEPART + (await bonusDe(userId)).solde;
}
