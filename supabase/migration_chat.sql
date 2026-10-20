-- Chat global MakeGoal : messages, réactions emojis, signalements, bannissements.
-- Accès uniquement via les routes API (clé service_role). RLS active, aucun accès direct.
create table if not exists chat_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  contenu text not null check (char_length(contenu) between 1 and 300),
  statut text not null default 'visible' check (statut in ('visible', 'masque', 'supprime')),
  nb_signalements int not null default 0,
  cree_le timestamptz not null default now()
);
create index if not exists chat_messages_cree on chat_messages (cree_le desc);
create index if not exists chat_messages_user on chat_messages (user_id, cree_le desc);

create table if not exists chat_reactions (
  message_id uuid not null references chat_messages(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  emoji text not null check (char_length(emoji) between 1 and 8),
  cree_le timestamptz not null default now(),
  primary key (message_id, user_id, emoji)
);
create index if not exists chat_reactions_user on chat_reactions (user_id, cree_le desc);

create table if not exists chat_signalements (
  message_id uuid not null references chat_messages(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  cree_le timestamptz not null default now(),
  primary key (message_id, user_id)
);

create table if not exists chat_bans (
  user_id uuid primary key references auth.users(id) on delete cascade,
  jusqu_a timestamptz not null,
  raison text,
  par uuid references auth.users(id) on delete set null,
  cree_le timestamptz not null default now()
);

alter table chat_messages enable row level security;
alter table chat_reactions enable row level security;
alter table chat_signalements enable row level security;
alter table chat_bans enable row level security;
revoke all on chat_messages, chat_reactions, chat_signalements, chat_bans from authenticated, anon;

notify pgrst, 'reload schema';
