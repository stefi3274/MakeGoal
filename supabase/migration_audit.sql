-- Journal des actions sensibles de la caisse (lecture/écriture serveur uniquement)
create table if not exists public.audit_caisse (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  user_id uuid,
  email text,
  action text not null,
  details jsonb not null default '{}'::jsonb
);
create index if not exists audit_caisse_created_idx on public.audit_caisse (created_at desc);
alter table public.audit_caisse enable row level security;
revoke all on public.audit_caisse from anon, authenticated;
