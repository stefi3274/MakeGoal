-- DURCISSEMENT SÉCURITÉ MakeGoal (à exécuter dans le SQL Editor de Supabase).
-- Tout le code du site qui touche aux points et aux soldes passe par le serveur (clé service_role),
-- qui n'est pas concernée par ces restrictions.

-- 1. Points : plus aucune écriture directe du solde par les utilisateurs.
drop policy if exists "Creation de son propre solde" on points_soldes;
drop policy if exists "Maj de son propre solde (invitation)" on points_soldes;

-- 2. Solde de paris : la création de son propre solde est limitée à la valeur de départ (1000).
drop policy if exists "Creation de son propre solde de paris" on paris_soldes;
create policy "Creation de son propre solde de paris" on paris_soldes
  for insert to authenticated
  with check (auth.uid() = user_id and solde = 1000 and mise_cumulee_valide = 0 and retire = false);

-- 3. Fonctions qui créditent ou débitent des points / Gourdes : réservées au serveur.
do $$
declare r record;
begin
  for r in
    select p.oid::regprocedure as sig
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in ('ajuster_points', 'deduire_points_conversion', 'deduire_mise_paris', 'crediter_paris', 'resoudre_paris_credit')
  loop
    execute format('revoke all on function %s from public, anon, authenticated', r.sig);
    execute format('grant execute on function %s to service_role', r.sig);
  end loop;
end $$;

-- 4. Scores : plus d'écriture anonyme (l'écriture passe par l'API admin).
drop policy if exists "scores public insert" on scores;
drop policy if exists "scores public update" on scores;

-- 5. Profil : un utilisateur ne peut modifier que son pseudo et son pays.
revoke update on profiles from anon, authenticated;
grant update (username, pays) on profiles to authenticated;

-- 6. Parrainages : écriture réservée au serveur. Participations (ancienne table) : plus d'écriture directe.
drop policy if exists "parrainages insert filleul" on parrainages;
drop policy if exists "participations insert connecte" on participations;
drop policy if exists "participations update proprietaire" on participations;

-- 7. Pronostics de concours : impossible de créer ou modifier un pronostic après le coup d'envoi.
create or replace function verrou_pronostic_apres_coup_envoi() returns trigger
language plpgsql as $$
declare debut timestamptz;
begin
  if coalesce(auth.role(), '') = 'service_role' then return new; end if;
  -- La colonne points est calculée par le serveur : un joueur ne peut pas la choisir.
  if tg_op = 'INSERT' then new.points := 0; else new.points := old.points; end if;
  select date_match into debut from concours_matchs where id = new.concours_match_id;
  if debut is not null and debut <= now() then
    raise exception 'Le match a commencé : les pronostics sont fermés.';
  end if;
  return new;
end $$;
drop trigger if exists verrou_pronostic on participations_matchs;
create trigger verrou_pronostic before insert or update on participations_matchs
  for each row execute function verrou_pronostic_apres_coup_envoi();

notify pgrst, 'reload schema';
