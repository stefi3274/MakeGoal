-- ============================================================
-- PARIS EN CAISSE (tickets imprimés, sans QR Code)
-- À exécuter une fois dans Supabase > SQL Editor.
-- Tout est verrouillé : aucune lecture/écriture directe depuis le navigateur,
-- uniquement via les routes serveur (clé service_role).
-- ============================================================

-- Score à la mi-temps (le score final reste dans score_home / score_away)
alter table public.matchs add column if not exists score_mt_home int;
alter table public.matchs add column if not exists score_mt_away int;

-- Caissiers autorisés (en plus des admins). Ajout : voir la fin de ce fichier.
create table if not exists public.caissiers (
  user_id uuid primary key references auth.users(id) on delete cascade,
  nom text,
  created_at timestamptz not null default now()
);

-- Offres : une ligne = un choix pariable avec sa cote (1/X/2, double chance, mi-temps, over/under, combo, buteur, qualification)
create table if not exists public.paris_offres (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matchs(id) on delete cascade,
  marche text not null check (marche in ('1x2','dc','mt_1x2','mt_dc','une_mt','ou','combo','buteur','premier_buteur','qualif')),
  choix text not null,
  libelle text not null,
  cote numeric(8,2) not null check (cote >= 1.01 and cote <= 1000),
  actif boolean not null default true,
  resultat text check (resultat in ('gagne','perdu','annule')),
  legs jsonb,
  created_at timestamptz not null default now(),
  unique (match_id, marche, choix)
);
create index if not exists paris_offres_match_idx on public.paris_offres(match_id);

create table if not exists public.tickets_caisse (
  id uuid primary key default gen_random_uuid(),
  numero bigint generated always as identity unique,
  code text not null,
  caissier_id uuid not null,
  mise numeric(12,2) not null check (mise > 0),
  cote_totale numeric(14,2) not null,
  gain_potentiel numeric(14,2) not null,
  statut text not null default 'en_attente' check (statut in ('en_attente','gagnant','perdant','paye','annule')),
  gain_final numeric(14,2),
  created_at timestamptz not null default now(),
  regle_at timestamptz,
  paye_at timestamptz,
  paye_par uuid
);
create index if not exists tickets_caisse_created_idx on public.tickets_caisse(created_at desc);

create table if not exists public.tickets_caisse_lignes (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.tickets_caisse(id) on delete cascade,
  offre_id uuid not null references public.paris_offres(id) on delete restrict,
  match_id uuid not null,
  match_libelle text not null,
  date_match timestamptz not null,
  libelle text not null,
  cote numeric(8,2) not null
);
create index if not exists tickets_lignes_ticket_idx on public.tickets_caisse_lignes(ticket_id);
create index if not exists tickets_lignes_offre_idx on public.tickets_caisse_lignes(offre_id);

-- Verrouillage total (RLS activée, aucune politique = aucun accès navigateur)
alter table public.caissiers enable row level security;
alter table public.paris_offres enable row level security;
alter table public.tickets_caisse enable row level security;
alter table public.tickets_caisse_lignes enable row level security;
revoke all on public.caissiers, public.paris_offres, public.tickets_caisse, public.tickets_caisse_lignes from anon, authenticated;

-- Ajouter un caissier (remplacer l'email par celui d'un compte déjà inscrit) :
-- insert into public.caissiers (user_id, nom)
--   select id, 'Nom du caissier' from auth.users where email = 'caissier@exemple.com'
--   on conflict (user_id) do nothing;
