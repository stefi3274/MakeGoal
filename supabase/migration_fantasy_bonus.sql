-- Bonus de connexion quotidien (série de 7 jours) de MakeGoal Fantasy.
create table if not exists fantasy_bonus (
  user_id uuid primary key references auth.users(id) on delete cascade,
  solde int not null default 0,
  serie int not null default 0,
  dernier_jour date,
  total_jours int not null default 0,
  updated_at timestamptz not null default now()
);
alter table fantasy_bonus enable row level security;
revoke all on fantasy_bonus from authenticated, anon;
notify pgrst, 'reload schema';
