create table public.roundsai_activity (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 kind text not null check(kind in ('note.generated','chart.generated','ai.error')),
 created_at timestamptz not null default now()
);
alter table public.roundsai_activity enable row level security;
revoke all on public.roundsai_activity from anon,authenticated;
grant insert on public.roundsai_activity to authenticated;
create policy activity_self_insert on public.roundsai_activity for insert to authenticated with check(user_id=(select auth.uid()));
create index roundsai_activity_user_time on public.roundsai_activity(user_id,created_at desc);
create table public.roundsai_live_settings (
 workflow text primary key check(workflow in ('hpi','progress','consult','admission','icu','discharge','summary','presentation','headsup','learning')),
 config jsonb not null, revision bigint not null default 0, release_id uuid, updated_at timestamptz not null default now()
);
alter table public.roundsai_live_settings enable row level security;
revoke all on public.roundsai_live_settings from anon,authenticated;
grant select on public.roundsai_live_settings to authenticated;
create policy signed_in_settings_read on public.roundsai_live_settings for select to authenticated using(true);
create table public.roundsai_setting_releases (
 id uuid primary key default gen_random_uuid(),workflow text not null references public.roundsai_live_settings(workflow),
 config jsonb not null, actor text not null, created_at timestamptz not null default now()
);
alter table public.roundsai_setting_releases enable row level security;
revoke all on public.roundsai_setting_releases from anon,authenticated;
create index roundsai_release_workflow_time on public.roundsai_setting_releases(workflow,created_at desc);
create function public.roundsai_admin_publish(p_workflow text,p_config jsonb,p_expected bigint,p_actor text)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare v_release uuid:=gen_random_uuid();v_revision bigint;
begin
 if jsonb_typeof(p_config)<>'object' or length(p_config::text)>40000 or length(p_config->>'instructions')<20 then raise exception 'Invalid configuration';end if;
 insert into public.roundsai_live_settings(workflow,config,revision) values(p_workflow,'{}',0) on conflict do nothing;
 update public.roundsai_live_settings set config=p_config,revision=revision+1,release_id=v_release,updated_at=now() where workflow=p_workflow and revision=p_expected returning revision into v_revision;
 if v_revision is null then raise exception 'Configuration changed; reload before publishing';end if;
 insert into public.roundsai_setting_releases(id,workflow,config,actor) values(v_release,p_workflow,p_config,p_actor);
 return jsonb_build_object('release_id',v_release,'revision',v_revision);
end;$$;
revoke all on function public.roundsai_admin_publish(text,jsonb,bigint,text) from public,anon,authenticated;
grant execute on function public.roundsai_admin_publish(text,jsonb,bigint,text) to service_role;
create function public.roundsai_admin_stats(p_start timestamptz,p_end timestamptz)
returns jsonb language sql stable security invoker set search_path='' as $$
with qa as (select user_id,count(*) attempts,count(distinct question_id) distinct_questions,count(*) filter(where correct) correct,max(created_at) last_answer from public.roundsai_quiz_attempts where created_at>=p_start and created_at<p_end group by user_id),
activity as (select user_id,count(*) filter(where kind='note.generated') notes,count(*) filter(where kind='chart.generated') chart_drafts,count(*) filter(where kind='ai.error') errors from public.roundsai_activity where created_at>=p_start and created_at<p_end group by user_id),
daily as (select user_id,(created_at at time zone 'America/New_York')::date as activity_date,count(*) attempts,count(*) filter(where correct) correct from public.roundsai_quiz_attempts where created_at>=p_start and created_at<p_end group by user_id,(created_at at time zone 'America/New_York')::date)
select coalesce(jsonb_agg(jsonb_build_object('id',u.id,'email',u.email,'joined_at',u.created_at,'last_sign_in_at',u.last_sign_in_at,'attempts',coalesce(q.attempts,0),'distinct_questions',coalesce(q.distinct_questions,0),'correct',coalesce(q.correct,0),'last_answer_at',q.last_answer,'notes',coalesce(a.notes,0),'chart_drafts',coalesce(a.chart_drafts,0),'errors',coalesce(a.errors,0),'daily',coalesce((select jsonb_agg(jsonb_build_object('date',d.activity_date,'attempts',d.attempts,'correct',d.correct) order by d.activity_date) from daily d where d.user_id=u.id),'[]'::jsonb)) order by u.created_at),'[]'::jsonb)
from auth.users u left join qa q on q.user_id=u.id left join activity a on a.user_id=u.id;
$$;
revoke all on function public.roundsai_admin_stats(timestamptz,timestamptz) from public,anon,authenticated;
grant execute on function public.roundsai_admin_stats(timestamptz,timestamptz) to service_role;
create function public.roundsai_admin_review(p_actor_id uuid,p_id uuid,p_updated timestamptz,p_values jsonb)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare q public.roundsai_questions;
begin
 if not exists(select 1 from public.roundsai_reviewers where user_id=p_actor_id) then raise exception 'Reviewer required';end if;
 perform set_config('request.jwt.claims',jsonb_build_object('sub',p_actor_id,'role','authenticated')::text,true);
 update public.roundsai_questions set question=p_values->>'question',options=p_values->'options',correct_index=(p_values->>'correct_index')::integer,explanation=p_values->>'explanation',sources=p_values->'sources',status=p_values->>'status'
 where id=p_id and updated_at=p_updated returning * into q;
 if q.id is null then raise exception 'Question changed; reload before reviewing';end if;
 return to_jsonb(q);
end;$$;
revoke all on function public.roundsai_admin_review(uuid,uuid,timestamptz,jsonb) from public,anon,authenticated;
grant execute on function public.roundsai_admin_review(uuid,uuid,timestamptz,jsonb) to service_role;
