create table public.roundsai_workspaces (
 user_id uuid primary key references auth.users(id) on delete cascade,
 data jsonb not null check (jsonb_typeof(data) = 'object' and jsonb_typeof(data->'patients') = 'array' and jsonb_typeof(data->'discharged') = 'array' and octet_length(data::text) <= 4500000),
 revision bigint not null default 1 check (revision > 0), updated_at timestamptz not null default now()
);
alter table public.roundsai_workspaces enable row level security;
grant select, insert, update on public.roundsai_workspaces to authenticated;
revoke all on public.roundsai_workspaces from anon;
create policy workspace_select on public.roundsai_workspaces for select to authenticated using ((select auth.uid()) = user_id);
create policy workspace_insert on public.roundsai_workspaces for insert to authenticated with check ((select auth.uid()) = user_id);
create policy workspace_update on public.roundsai_workspaces for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
