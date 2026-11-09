-- Dominus: controle de uso do monitor com IA.
-- Rode uma vez no Supabase: SQL Editor > New query > cole tudo > Run.
-- Pode rodar de novo sem problema.

-- Quantos pedidos cada pessoa fez ao monitor em cada dia.
create table if not exists public.uso_claude (
  owner uuid not null default auth.uid() references auth.users (id) on delete cascade,
  dia date not null default current_date,
  pedidos integer not null default 0,
  primary key (owner, dia)
);

alter table public.uso_claude enable row level security;

drop policy if exists "uso_claude: ler o próprio" on public.uso_claude;
create policy "uso_claude: ler o próprio" on public.uso_claude
  for select to authenticated using (owner = (select auth.uid()));

revoke all on public.uso_claude from anon;
grant select on public.uso_claude to authenticated;

-- Soma um pedido para a pessoa logada e devolve quantos ainda restam hoje (-1 = passou do limite).
-- É chamada pela função "claude" a cada pedido ao monitor.
create or replace function public.registrar_uso_claude(limite integer)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  usados integer;
begin
  if auth.uid() is null then
    raise exception 'É preciso estar logado.';
  end if;
  insert into public.uso_claude (owner, dia, pedidos)
  values (auth.uid(), current_date, 1)
  on conflict (owner, dia) do update set pedidos = public.uso_claude.pedidos + 1
  returning pedidos into usados;
  if usados > limite then
    return -1;
  end if;
  return limite - usados;
end;
$$;

revoke all on function public.registrar_uso_claude(integer) from public, anon;
grant execute on function public.registrar_uso_claude(integer) to authenticated;
