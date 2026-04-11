-- (Opcional) Mesmo esquema se usar PostgreSQL hospedado no Supabase em vez do Railway.
-- Com Railway Postgres + DATABASE_URL, o Node cria a tabela automaticamente — este arquivo não é obrigatório.

create table if not exists public.app_state (
  key text primary key,
  payload jsonb not null default '[]'::jsonb,
  updated_at timestamptz default now()
);

alter table public.app_state enable row level security;

-- Sem políticas: o cliente público NÃO usa Supabase diretamente — só o servidor Node com service_role.

comment on table public.app_state is 'Conteúdo do site Betim Cor Brazil; escrita/leitura via API Node + service role.';
