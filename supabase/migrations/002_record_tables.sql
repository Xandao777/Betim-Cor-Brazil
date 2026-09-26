-- Colecoes de crescimento continuo: uma linha por registro.
-- O servidor Node executa a mesma migracao automaticamente no Railway.

create table if not exists public.event_registrations (
  id text primary key,
  payload jsonb not null,
  seq bigserial,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.contact_messages (
  id text primary key,
  payload jsonb not null,
  seq bigserial,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.donation_requests (
  id text primary key,
  payload jsonb not null,
  seq bigserial,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.membership_requests (
  id text primary key,
  payload jsonb not null,
  seq bigserial,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.member_messages (
  id text primary key,
  payload jsonb not null,
  seq bigserial,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists event_registrations_created_idx on public.event_registrations (created_at);
create index if not exists contact_messages_created_idx on public.contact_messages (created_at);
create index if not exists donation_requests_created_idx on public.donation_requests (created_at);
create index if not exists membership_requests_created_idx on public.membership_requests (created_at);
create index if not exists member_messages_created_idx on public.member_messages (created_at);

-- Migra arrays legados de app_state de forma idempotente.
insert into public.event_registrations (id, payload)
select coalesce(nullif(item->>'id', ''), md5(item::text || '-' || ordinality::text)), item
from public.app_state,
lateral jsonb_array_elements(case when jsonb_typeof(payload) = 'array' then payload else '[]'::jsonb end)
with ordinality as migrated(item, ordinality)
where key = 'inscricoes'
on conflict (id) do nothing;

insert into public.contact_messages (id, payload)
select coalesce(nullif(item->>'id', ''), md5(item::text || '-' || ordinality::text)), item
from public.app_state,
lateral jsonb_array_elements(case when jsonb_typeof(payload) = 'array' then payload else '[]'::jsonb end)
with ordinality as migrated(item, ordinality)
where key = 'mensagens_contato'
on conflict (id) do nothing;

insert into public.donation_requests (id, payload)
select coalesce(nullif(item->>'id', ''), md5(item::text || '-' || ordinality::text)), item
from public.app_state,
lateral jsonb_array_elements(case when jsonb_typeof(payload) = 'array' then payload else '[]'::jsonb end)
with ordinality as migrated(item, ordinality)
where key = 'pedidos_doacao'
on conflict (id) do nothing;

insert into public.membership_requests (id, payload)
select coalesce(nullif(item->>'id', ''), md5(item::text || '-' || ordinality::text)), item
from public.app_state,
lateral jsonb_array_elements(case when jsonb_typeof(payload) = 'array' then payload else '[]'::jsonb end)
with ordinality as migrated(item, ordinality)
where key = 'pedidos_filiacao'
on conflict (id) do nothing;

insert into public.member_messages (id, payload)
select coalesce(nullif(item->>'id', ''), md5(item::text || '-' || ordinality::text)), item
from public.app_state,
lateral jsonb_array_elements(case when jsonb_typeof(payload) = 'array' then payload else '[]'::jsonb end)
with ordinality as migrated(item, ordinality)
where key = 'mensagens_membros'
on conflict (id) do nothing;

delete from public.app_state
where key in (
  'inscricoes',
  'mensagens_contato',
  'pedidos_doacao',
  'pedidos_filiacao',
  'mensagens_membros'
);

alter table public.event_registrations enable row level security;
alter table public.contact_messages enable row level security;
alter table public.donation_requests enable row level security;
alter table public.membership_requests enable row level security;
alter table public.member_messages enable row level security;

-- Sem politicas: acesso somente pelo backend Node/service role.
