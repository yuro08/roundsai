create table public.roundsai_admin_documents (id text primary key check (length(id) between 1 and 120), payload jsonb not null, revision integer not null default 1 check (revision>0), updated_at timestamptz not null default now());
alter table public.roundsai_admin_documents enable row level security;
revoke all on public.roundsai_admin_documents from anon, authenticated;
grant select,insert,update on public.roundsai_admin_documents to service_role;
create function public.roundsai_admin_document_write(p_id text,p_payload jsonb,p_revision integer) returns boolean language plpgsql security invoker set search_path=public as $$
declare changed integer;
begin
 if p_id !~ '^(profile:(hpi|progress|consult|admission|icu|discharge|summary|presentation|headsup|learning)|event:[a-f0-9-]{36})$' or octet_length(p_payload::text)>1000000 or p_revision<0 then raise exception 'Invalid document'; end if;
 if p_revision=0 then insert into public.roundsai_admin_documents(id,payload) values(p_id,p_payload) on conflict do nothing;
 else update public.roundsai_admin_documents set payload=p_payload,revision=revision+1,updated_at=now() where id=p_id and revision=p_revision; end if;
 get diagnostics changed=row_count;return changed=1;
end;$$;
revoke all on function public.roundsai_admin_document_write(text,jsonb,integer) from public,anon,authenticated;
grant execute on function public.roundsai_admin_document_write(text,jsonb,integer) to service_role;
