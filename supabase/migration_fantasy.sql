-- MakeGoal Fantasy : jeu gratuit, équipe virtuelle de 11 joueurs + réservistes, 10 000 $ virtuels.
-- Tout l'accès passe par les routes API (clé service_role). Aucun accès direct depuis le navigateur.

create table if not exists fantasy_joueurs (
  id uuid primary key default gen_random_uuid(),
  nom text not null,
  poste text not null check (poste in ('G','D','M','A')),
  club text not null default '',
  pays text default '',
  prix int not null default 500,
  photo text,
  competition text default '',
  actif boolean not null default true,
  created_at timestamptz not null default now()
);
create unique index if not exists fantasy_joueurs_nom_club on fantasy_joueurs (lower(nom), lower(club));

create table if not exists fantasy_journees (
  id uuid primary key default gen_random_uuid(),
  titre text not null,
  statut text not null default 'ouverte' check (statut in ('ouverte','verrouillee','calculee')),
  date_limite timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists fantasy_equipes (
  user_id uuid primary key references auth.users(id) on delete cascade,
  nom_equipe text not null,
  titulaires jsonb not null default '[]'::jsonb,
  reservistes jsonb not null default '[]'::jsonb,
  capitaine uuid,
  cout int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Photo de l'équipe au moment du verrouillage d'une journée (sert au calcul des points et aux transferts).
create table if not exists fantasy_instantanes (
  journee_id uuid not null references fantasy_journees(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  titulaires jsonb not null,
  reservistes jsonb not null,
  capitaine uuid,
  created_at timestamptz not null default now(),
  primary key (journee_id, user_id)
);

create table if not exists fantasy_stats (
  journee_id uuid not null references fantasy_journees(id) on delete cascade,
  joueur_id uuid not null references fantasy_joueurs(id) on delete cascade,
  stats jsonb not null,
  points int not null default 0,
  primary key (journee_id, joueur_id)
);

-- credites = points déjà ajoutés au classement général (permet de corriger sans doublon).
create table if not exists fantasy_scores (
  journee_id uuid not null references fantasy_journees(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  points int not null,
  credites int not null default 0,
  detail jsonb,
  created_at timestamptz not null default now(),
  primary key (journee_id, user_id)
);

alter table fantasy_joueurs enable row level security;
alter table fantasy_journees enable row level security;
alter table fantasy_equipes enable row level security;
alter table fantasy_instantanes enable row level security;
alter table fantasy_stats enable row level security;
alter table fantasy_scores enable row level security;
revoke all on fantasy_joueurs, fantasy_journees, fantasy_equipes, fantasy_instantanes, fantasy_stats, fantasy_scores from authenticated, anon;

-- Autorise la nouvelle raison 'fantasy_journee' dans le registre des points
-- (retire une éventuelle contrainte qui listerait les raisons autorisées).
do $$
declare c text;
begin
  for c in select conname from pg_constraint
           where conrelid = 'points_transactions'::regclass and contype = 'c' and pg_get_constraintdef(oid) ilike '%raison%'
  loop
    execute 'alter table points_transactions drop constraint ' || quote_ident(c);
  end loop;
end $$;

notify pgrst, 'reload schema';
