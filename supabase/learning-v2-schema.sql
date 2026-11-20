begin;
create table public.roundsai_learning_sessions (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null default auth.uid() references auth.users(id),
 kind text not null check(kind in ('quick','cases','study')),
 topic text not null default '' check(length(topic)<=180),
 status text not null default 'generating' check(status in ('generating','ready','failed')),
 created_at timestamptz not null default now(), expires_at timestamptz not null default (now()+interval '6 hours'),
 lease_until timestamptz not null default (now()+interval '5 minutes'),
 content jsonb not null default '{}' check(jsonb_typeof(content)='object' and octet_length(content::text)<200000)
);
alter table public.roundsai_learning_sessions enable row level security;
revoke all on public.roundsai_learning_sessions from public,anon,authenticated;
grant select,insert,update on public.roundsai_learning_sessions to authenticated;
create policy "read own learning sessions" on public.roundsai_learning_sessions for select to authenticated using(user_id=(select auth.uid()));
create policy "create own learning sessions" on public.roundsai_learning_sessions for insert to authenticated with check(user_id=(select auth.uid()));
create policy "update own learning sessions" on public.roundsai_learning_sessions for update to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
create index roundsai_learning_sessions_user_time on public.roundsai_learning_sessions(user_id,created_at desc);
create function roundsai_private.guard_learning_session() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if auth.uid() is null or new.user_id<>auth.uid() then raise exception 'Own authenticated session required' using errcode='42501'; end if;
 if tg_op='INSERT' then
  perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text,0));
  if new.kind='quick' and exists(select 1 from public.roundsai_learning_sessions where user_id=auth.uid() and kind='quick' and status<>'failed' and expires_at>clock_timestamp()) then raise exception 'Quick Fire refreshes every six hours' using errcode='23505'; end if;
  new.created_at=clock_timestamp();new.expires_at=new.created_at+interval '6 hours';new.lease_until=new.created_at+interval '5 minutes';new.status='generating';new.content='{}';
 else
  if new.user_id<>old.user_id or new.kind<>old.kind or new.topic<>old.topic or new.created_at<>old.created_at or new.expires_at<>old.expires_at then raise exception 'Session identity and refresh time are immutable' using errcode='42501';end if;
  if old.status<>'generating' then raise exception 'Completed learning sessions are immutable' using errcode='42501'; end if;
  if new.status='ready' and (jsonb_typeof(new.content->'questions') is distinct from 'array' or jsonb_array_length(new.content->'questions')<>case when new.kind='study' then 3 else 5 end) then raise exception 'Incomplete question set';end if;
 end if;
 return new;
end;$$;
revoke all on function roundsai_private.guard_learning_session() from public,anon,authenticated;
create trigger roundsai_learning_session_guard before insert or update on public.roundsai_learning_sessions for each row execute function roundsai_private.guard_learning_session();
alter table public.roundsai_quiz_attempts add column session_id uuid references public.roundsai_learning_sessions(id), add column confidence text check(confidence in ('guess','unsure','sure'));
create unique index roundsai_attempts_session_question on public.roundsai_quiz_attempts(session_id,question_id);
create table public.roundsai_learning_reports (
 id uuid primary key default gen_random_uuid(),user_id uuid not null default auth.uid() references auth.users(id),
 session_id uuid not null references public.roundsai_learning_sessions(id),question_id uuid not null references public.roundsai_questions(id),
 reason text not null check(length(reason) between 3 and 2000),created_at timestamptz not null default now()
);
alter table public.roundsai_learning_reports enable row level security;
revoke all on public.roundsai_learning_reports from public,anon,authenticated;
grant select,insert on public.roundsai_learning_reports to authenticated;
create policy "own or reviewer reads learning reports" on public.roundsai_learning_reports for select to authenticated using(user_id=(select auth.uid()) or (select public.roundsai_is_reviewer()));
create policy "report own session question" on public.roundsai_learning_reports for insert to authenticated with check(user_id=(select auth.uid()) and exists(select 1 from public.roundsai_learning_sessions s where s.id=session_id and s.user_id=(select auth.uid())));
create index roundsai_learning_reports_user on public.roundsai_learning_reports(user_id);
create index roundsai_learning_reports_session on public.roundsai_learning_reports(session_id);
create index roundsai_learning_reports_question on public.roundsai_learning_reports(question_id);
commit;
