begin;
create table public.fp_consulting_requests (
 id uuid primary key default gen_random_uuid(),
 email text not null unique,
 payload jsonb not null,
 completed boolean not null default false,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 version bigint not null default 1,
 sync_status text not null default 'pending' check(sync_status in ('pending','sending','synced','failed')),
 sync_attempts integer not null default 0,
 sync_next_at timestamptz not null default now(),
 lease_until timestamptz,
 lease_token uuid,
 synced_at timestamptz,
 error_code text not null default ''
);
alter table public.fp_consulting_requests enable row level security;
revoke all on public.fp_consulting_requests from public,anon,authenticated;

create function public.fp_consulting_ingest(secret text,payload jsonb,is_complete boolean)
returns jsonb language plpgsql security definer set search_path='' as $$
declare p jsonb; r public.fp_consulting_requests;
begin
 perform public.fp_campaign_authorize(secret);
 if jsonb_typeof(payload)<>'object' or length(payload::text)>20000 or coalesce(payload->>'email','')='' then raise exception 'Invalid request'; end if;
 select coalesce(jsonb_object_agg(key,value),'{}'::jsonb) into p from jsonb_each(payload) where value<>'null'::jsonb and value<>'""'::jsonb;
 insert into public.fp_consulting_requests as old(email,payload,completed)
 values(lower(p->>'email'),p,is_complete)
 on conflict(email) do update set
 payload=case when old.completed and not is_complete then old.payload else old.payload||p||jsonb_build_object('signedUpAt',old.payload->>'signedUpAt') end,
 completed=old.completed or is_complete,
 updated_at=now(),
 version=case when old.completed and not is_complete then old.version else old.version+1 end,
 sync_status=case when old.completed and not is_complete then old.sync_status else 'pending' end,
 sync_next_at=case when old.completed and not is_complete then old.sync_next_at else now() end
 returning * into r;
 return jsonb_build_object('id',r.id,'completed',r.completed);
end $$;

create function public.fp_consulting_claim(secret text,lead_id uuid default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
 perform public.fp_campaign_authorize(secret);
 with queue as (
 select id from public.fp_consulting_requests r where r.sync_status<>'synced'
 and (lead_id is null or r.id=lead_id) and r.sync_next_at<=now()
 and (r.lease_until is null or r.lease_until<now())
 order by r.completed desc,r.sync_next_at limit 1 for update skip locked
 ), claimed as (
 update public.fp_consulting_requests r set sync_status='sending',lease_until=now()+interval '3 minutes',lease_token=gen_random_uuid(),sync_attempts=r.sync_attempts+1
 from queue q where r.id=q.id returning r.*
 ) select coalesce(jsonb_agg(to_jsonb(c)),'[]'::jsonb) into result from claimed c;
 return result;
end $$;

create function public.fp_consulting_result(secret text,lead_id uuid,claim_token uuid,record_version bigint,succeeded boolean)
returns void language plpgsql security definer set search_path='' as $$
begin
 perform public.fp_campaign_authorize(secret);
 update public.fp_consulting_requests r set
 sync_status=case when r.version<>record_version then 'pending' when succeeded then 'synced' else 'failed' end,
 sync_next_at=case when r.version<>record_version then now() else now()+interval '1 minute' end,
 synced_at=case when succeeded then now() else r.synced_at end,
 error_code=case when succeeded then '' else 'airtable_unavailable' end,
 lease_until=null,lease_token=null
 where r.id=lead_id and r.lease_token=claim_token;
end $$;
revoke all on function public.fp_consulting_ingest(text,jsonb,boolean),public.fp_consulting_claim(text,uuid),public.fp_consulting_result(text,uuid,uuid,bigint,boolean) from public,anon,authenticated;
grant execute on function public.fp_consulting_ingest(text,jsonb,boolean),public.fp_consulting_claim(text,uuid),public.fp_consulting_result(text,uuid,uuid,bigint,boolean) to anon;

select cron.schedule('futureproof-consulting-sync','* * * * *',$job$
 select net.http_post(
 url:='https://yuvalkesh-links.vercel.app/api/consulting-sync',
 headers:=jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||(select decrypted_secret from vault.decrypted_secrets where name='fp_campaign_sync_trigger')),
 body:='{}'::jsonb,timeout_milliseconds:=60000
 ) where exists(select 1 from public.fp_consulting_requests where sync_status<>'synced' and sync_next_at<=now() and (lease_until is null or lease_until<now()));
$job$);
notify pgrst,'reload schema';
commit;
