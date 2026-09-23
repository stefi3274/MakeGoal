-- FootQuizz : 10 questions, tirage parmi les >= 80%, jamais public.
create table if not exists quizz_foot (
  id uuid primary key default gen_random_uuid(),
  titre text not null,
  sport text not null default 'football',
  questions jsonb not null, -- [{id, question, options:[{cle,texte}], bonne_reponse}] x10
  statut text not null default 'ouvert', -- 'ouvert' | 'ferme' | 'tire'
  date_fermeture timestamptz not null,
  created_at timestamptz not null default now(),
  fermee_at timestamptz
);

create table if not exists quizz_foot_participations (
  id uuid primary key default gen_random_uuid(),
  quizz_id uuid not null references quizz_foot(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  debute_at timestamptz not null default now(),
  termine boolean not null default false,
  termine_at timestamptz,
  reponses jsonb not null default '{}'::jsonb,
  score int,
  pourcentage int,
  gagnant boolean not null default false,
  created_at timestamptz not null default now(),
  unique (quizz_id, user_id)
);

-- Verrouillage : tout accès passe par les routes API (clé service_role,
-- qui contourne la RLS). Aucun accès direct depuis le navigateur.
alter table quizz_foot enable row level security;
alter table quizz_foot_participations enable row level security;
revoke all on quizz_foot from authenticated, anon;
revoke all on quizz_foot_participations from authenticated, anon;

-- Post "Gagnants & primes" (annonce manuelle des gagnants d'un tirage,
-- Question Éclair, FootQuizz ou Concours).
alter table articles add column if not exists gagnants jsonb;

notify pgrst, 'reload schema';
