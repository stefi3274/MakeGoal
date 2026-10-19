-- MakeGoal Fantasy 7 (7 joueurs, formation 1-2-2-2). Réutilise fantasy_joueurs, fantasy_journees et fantasy_stats.
create table if not exists fantasy7_equipes (
  user_id uuid primary key references auth.users(id) on delete cascade,
  titulaires jsonb not null default '[]'::jsonb,
  capitaine uuid,
  cout int not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists fantasy7_instantanes (
  journee_id uuid not null references fantasy_journees(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  titulaires jsonb not null,
  capitaine uuid,
  created_at timestamptz not null default now(),
  primary key (journee_id, user_id)
);

create table if not exists fantasy7_scores (
  journee_id uuid not null references fantasy_journees(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  points int not null,
  credites int not null default 0,
  detail jsonb,
  created_at timestamptz not null default now(),
  primary key (journee_id, user_id)
);

alter table fantasy7_equipes enable row level security;
alter table fantasy7_instantanes enable row level security;
alter table fantasy7_scores enable row level security;
revoke all on fantasy7_equipes, fantasy7_instantanes, fantasy7_scores from authenticated, anon;

notify pgrst, 'reload schema';
