-- Dominus: tabela de dados e regras de acesso (Row Level Security).
-- Rode uma vez no Supabase: SQL Editor > New query > cole tudo > Run.
-- Pode rodar de novo sem problema: os comandos não duplicam nada.

-- Cada linha guarda um item do app (disciplina, tema, trabalho, evento...) de um único usuário.
create table if not exists public.docs (
  owner uuid not null default auth.uid() references auth.users (id) on delete cascade,
  col text not null,
  id text not null,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (owner, col, id)
);

comment on table public.docs is 'Dados do app Dominus: um registro por item, sempre de um único usuário (owner).';

-- Ninguém lê ou altera dados de outra pessoa: cada usuário só enxerga as próprias linhas.
alter table public.docs enable row level security;

drop policy if exists "docs: ler os próprios" on public.docs;
drop policy if exists "docs: criar os próprios" on public.docs;
drop policy if exists "docs: alterar os próprios" on public.docs;
drop policy if exists "docs: apagar os próprios" on public.docs;

create policy "docs: ler os próprios" on public.docs
  for select to authenticated using (owner = (select auth.uid()));
create policy "docs: criar os próprios" on public.docs
  for insert to authenticated with check (owner = (select auth.uid()));
create policy "docs: alterar os próprios" on public.docs
  for update to authenticated using (owner = (select auth.uid())) with check (owner = (select auth.uid()));
create policy "docs: apagar os próprios" on public.docs
  for delete to authenticated using (owner = (select auth.uid()));

-- Só usuários logados acessam a tabela; visitantes sem login não têm acesso nenhum.
revoke all on public.docs from anon;
grant select, insert, update, delete on public.docs to authenticated;
