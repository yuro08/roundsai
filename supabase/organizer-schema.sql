create table public.roundsai_organizers (
 user_id uuid primary key references auth.users(id) on delete cascade,
 data jsonb not null default '{"tasks":[]}'::jsonb check(jsonb_typeof(data->'tasks')='array' and jsonb_array_length(data->'tasks')<=2000),
 revision bigint not null default 1 check(revision>0),
 updated_at timestamptz not null default now()
);
alter table public.roundsai_organizers enable row level security;
revoke all on public.roundsai_organizers from anon,authenticated;
grant select,insert,update on public.roundsai_organizers to authenticated;
create policy organizer_read on public.roundsai_organizers for select to authenticated using ((select auth.uid())=user_id);
create policy organizer_create on public.roundsai_organizers for insert to authenticated with check ((select auth.uid())=user_id);
create policy organizer_update on public.roundsai_organizers for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
