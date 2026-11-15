-- Additive learning schema. No patient data is stored in these tables.
begin;
create schema if not exists roundsai_private;
revoke all on schema roundsai_private from public,anon,authenticated;
create table if not exists public.roundsai_reviewers (
 user_id uuid primary key references auth.users(id) on delete cascade,
 created_at timestamptz not null default now()
);
alter table public.roundsai_reviewers enable row level security;
revoke all on public.roundsai_reviewers from anon,authenticated;
grant select on public.roundsai_reviewers to authenticated;
create policy "reviewer sees own role" on public.roundsai_reviewers for select to authenticated using(user_id=(select auth.uid()));
create or replace function public.roundsai_is_reviewer() returns boolean language sql stable security invoker set search_path='' as $$
 select exists(select 1 from public.roundsai_reviewers where user_id=(select auth.uid()));
$$;
revoke all on function public.roundsai_is_reviewer() from public;
grant execute on function public.roundsai_is_reviewer() to authenticated;
create table if not exists public.roundsai_questions (
 id uuid primary key default gen_random_uuid(),
 topic text not null check(length(topic) between 1 and 180),
 question text not null check(length(question) between 10 and 5000),
 options jsonb not null check(jsonb_typeof(options)='array' and jsonb_array_length(options)=4),
 correct_index integer not null check(correct_index between 0 and 3),
 explanation text not null check(length(explanation) between 10 and 8000),
 sources jsonb not null default '[]' check(jsonb_typeof(sources)='array'),
 status text not null default 'draft' check(status in ('draft','approved','rejected')),
 created_by uuid not null default auth.uid() references auth.users(id),
 reviewed_by uuid references auth.users(id), reviewed_at timestamptz,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table public.roundsai_questions enable row level security;
revoke all on public.roundsai_questions from anon,authenticated;
grant select,insert,update on public.roundsai_questions to authenticated;
create policy "learners see approved and authors see own drafts" on public.roundsai_questions for select to authenticated using(status='approved' or created_by=(select auth.uid()) or (select public.roundsai_is_reviewer()));
create policy "authors can submit draft only" on public.roundsai_questions for insert to authenticated with check(created_by=(select auth.uid()) and status='draft' and reviewed_by is null and reviewed_at is null);
create policy "reviewers edit and approve" on public.roundsai_questions for update to authenticated using((select public.roundsai_is_reviewer())) with check((select public.roundsai_is_reviewer()));
create index if not exists roundsai_questions_topic_status on public.roundsai_questions(topic,status);
create table if not exists public.roundsai_question_reviews (
 id bigint generated always as identity primary key,
 question_id uuid not null references public.roundsai_questions(id),
 reviewer_id uuid not null references auth.users(id),
 old_status text, new_status text not null, snapshot jsonb not null,
 reviewed_at timestamptz not null default now()
);
alter table public.roundsai_question_reviews enable row level security;
revoke all on public.roundsai_question_reviews from anon,authenticated;
grant select on public.roundsai_question_reviews to authenticated;
create policy "reviewers see audit history" on public.roundsai_question_reviews for select to authenticated using((select public.roundsai_is_reviewer()));
create or replace function roundsai_private.roundsai_record_review() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Authenticated reviewer required'; end if;
 new.created_by=old.created_by; new.created_at=old.created_at;
 new.updated_at=clock_timestamp();
 if new.status='approved' then
  if not public.roundsai_is_reviewer() then raise exception 'Reviewer role required'; end if;
  if jsonb_array_length(new.sources)=0 then raise exception 'At least one verified source is required'; end if;
  new.reviewed_by=auth.uid(); new.reviewed_at=now();
 else new.reviewed_by=null; new.reviewed_at=null;
 end if;
 insert into public.roundsai_question_reviews(question_id,reviewer_id,old_status,new_status,snapshot)
 values(new.id,auth.uid(),old.status,new.status,to_jsonb(new));
 return new;
end; $$;
revoke all on function roundsai_private.roundsai_record_review() from public;
create trigger roundsai_question_review_audit before update on public.roundsai_questions for each row execute function roundsai_private.roundsai_record_review();
create table if not exists public.roundsai_quiz_attempts (
 id uuid primary key default gen_random_uuid(),user_id uuid not null default auth.uid() references auth.users(id),
 question_id uuid not null references public.roundsai_questions(id),choice integer not null check(choice between 0 and 3),
 correct boolean not null,created_at timestamptz not null default now(),next_review_at timestamptz not null
);
alter table public.roundsai_quiz_attempts enable row level security;
revoke all on public.roundsai_quiz_attempts from anon,authenticated;
grant select,insert on public.roundsai_quiz_attempts to authenticated;
create policy "users see own attempts" on public.roundsai_quiz_attempts for select to authenticated using(user_id=(select auth.uid()));
create policy "users record own practice" on public.roundsai_quiz_attempts for insert to authenticated with check(user_id=(select auth.uid()));
create index if not exists roundsai_questions_author on public.roundsai_questions(created_by);
create index if not exists roundsai_questions_reviewer on public.roundsai_questions(reviewed_by);
create index if not exists roundsai_reviews_question on public.roundsai_question_reviews(question_id);
create index if not exists roundsai_reviews_reviewer on public.roundsai_question_reviews(reviewer_id);
create index if not exists roundsai_attempts_user_time on public.roundsai_quiz_attempts(user_id,created_at desc);
create index if not exists roundsai_attempts_question on public.roundsai_quiz_attempts(question_id);
commit;
-- Bootstrap the founder as reviewer in a separate explicit statement:
-- insert into public.roundsai_reviewers(user_id)
-- select id from auth.users where lower(email)=lower('YOUR_TEST_EMAIL') on conflict do nothing;
