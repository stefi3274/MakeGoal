-- Ligues privées entre amis (code d'invitation) pour MakeGoal Fantasy.
create table if not exists fantasy_ligues (
  id uuid primary key default gen_random_uuid(),
  nom text not null,
  code text not null unique,
  createur uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists fantasy_ligues_membres (
  ligue_id uuid not null references fantasy_ligues(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (ligue_id, user_id)
);
create index if not exists fantasy_ligues_membres_user on fantasy_ligues_membres (user_id);

alter table fantasy_ligues enable row level security;
alter table fantasy_ligues_membres enable row level security;
revoke all on fantasy_ligues, fantasy_ligues_membres from authenticated, anon;

notify pgrst, 'reload schema';
