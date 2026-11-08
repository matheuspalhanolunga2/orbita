-- ============================================================================
-- Órbita — Supabase schema
-- Run once in Supabase Dashboard → SQL Editor (safe to run again).
--
-- Every entity (task, area, goal, log…) is one row, so edits from different
-- devices only conflict when they touch the same item. Row Level Security
-- guarantees each user can only read and write their own rows.
-- ============================================================================

create table if not exists public.items (
  user_id    uuid        not null default auth.uid() references auth.users (id) on delete cascade,
  collection text        not null check (collection in (
               'areas','tasks','routine','logs','vocab','chords','songs','skills',
               'content','lives','goals','activity','meta')),
  id         text        not null check (char_length(id) between 1 and 100),
  data       jsonb,
  deleted    boolean     not null default false,
  updated_at timestamptz not null default clock_timestamp(),
  primary key (user_id, collection, id),
  -- guard against abuse: a single item must stay small
  constraint item_size check (pg_column_size(data) < 64000)
);

create index if not exists items_user_updated on public.items (user_id, updated_at);

-- Server clock decides the order of changes (clients' clocks may be wrong)
create or replace function public.items_touch() returns trigger
language plpgsql as $$
begin
  new.updated_at := clock_timestamp();
  if new.deleted then new.data := null; end if;
  return new;
end $$;

drop trigger if exists items_touch on public.items;
create trigger items_touch before insert or update on public.items
  for each row execute function public.items_touch();

-- ---------------------------------------------------------------- security
alter table public.items enable row level security;

drop policy if exists "items: read own"   on public.items;
drop policy if exists "items: insert own" on public.items;
drop policy if exists "items: update own" on public.items;
drop policy if exists "items: delete own" on public.items;

create policy "items: read own"   on public.items for select to authenticated using ((select auth.uid()) = user_id);
create policy "items: insert own" on public.items for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "items: update own" on public.items for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "items: delete own" on public.items for delete to authenticated using ((select auth.uid()) = user_id);

revoke all on public.items from anon;

-- ------------------------------------------------------- account deletion
-- Lets a signed-in user delete their own account (LGPD). Items are removed by the FK cascade.
create or replace function public.delete_my_account() returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  delete from auth.users where id = auth.uid();
end $$;

revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
