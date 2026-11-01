-- Run once in the Supabase project configured by src/auth-config.js.
-- Every operation is scoped to the authenticated owner; never use a service key in browsers.
create table if not exists public.sparkboard_boards (
  owner_id uuid not null references auth.users(id) on delete cascade,
  board_id uuid not null,
  payload jsonb,
  version bigint not null default 1 check (version >= 1),
  deleted boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (owner_id, board_id),
  constraint board_payload_limit check (
    payload is null or octet_length(payload::text) <= 8388608
  ),
  constraint live_board_has_payload check (deleted or payload is not null)
);
alter table public.sparkboard_boards enable row level security;
revoke all on public.sparkboard_boards from anon, authenticated;
grant select, insert, update on public.sparkboard_boards to authenticated;

drop policy if exists sparkboard_owner_select on public.sparkboard_boards;
create policy sparkboard_owner_select on public.sparkboard_boards
  for select to authenticated using ((select auth.uid()) = owner_id);

drop policy if exists sparkboard_owner_insert on public.sparkboard_boards;
create policy sparkboard_owner_insert on public.sparkboard_boards
  for insert to authenticated with check ((select auth.uid()) = owner_id);

drop policy if exists sparkboard_owner_update on public.sparkboard_boards;
create policy sparkboard_owner_update on public.sparkboard_boards
  for update to authenticated using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

-- No DELETE grant: devices use version-checked tombstones to prevent resurrection.
comment on table public.sparkboard_boards is
  'Account-owned Sparkboard snapshots; RLS required. Clients use conditional versioned PATCH.';
