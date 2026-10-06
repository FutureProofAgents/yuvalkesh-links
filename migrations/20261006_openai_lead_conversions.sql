begin;
create table public.fp_campaign_ad_events (
 lead_id uuid primary key references public.fp_campaign_leads(id) on delete cascade,
 language text not null check(language in ('en','he')),
 event_time timestamptz not null, source_url text not null, oppref text not null default '',
 status text not null default 'pending' check(status in ('pending','sending','sent','failed','expired')),
 attempts integer not null default 0, next_at timestamptz not null default now(),
 lease_until timestamptz, lease_token uuid, sent_at timestamptz, error_code text not null default ''
);
alter table public.fp_campaign_ad_events enable row level security;
revoke all on public.fp_campaign_ad_events from public,anon,authenticated;
grant select on public.fp_campaign_ad_events to authenticated;
create policy ad_event_owner on public.fp_campaign_ad_events for select to authenticated
 using((select auth.uid())='c774e590-7732-4481-add1-6ed377a10522'::uuid);
create index fp_campaign_ad_events_queue on public.fp_campaign_ad_events(next_at) where status not in ('sent','expired');

create function public.fp_campaign_queue_ad_event() returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into public.fp_campaign_ad_events(lead_id,language,event_time,source_url,oppref)
 values(new.id,new.language,new.created_at,
  case when new.language='he' then 'https://futureproofagents.com/he/ai-transformation/' else 'https://futureproofagents.com/ai-transformation/' end,
  coalesce(nullif(new.attribution->'last'->>'oppref',''),nullif(new.attribution->'first'->>'oppref',''),''));
 return new;
end $$;
create trigger campaign_ad_event after insert on public.fp_campaign_leads for each row execute function public.fp_campaign_queue_ad_event();
revoke all on function public.fp_campaign_queue_ad_event() from public,anon,authenticated;

create function public.fp_campaign_ad_claim(secret text,lead_id uuid default null)
returns setof public.fp_campaign_ad_events language plpgsql security definer set search_path='' as $$
begin
 perform public.fp_campaign_authorize(secret);
 update public.fp_campaign_ad_events e set status='expired',error_code='event_too_old'
 where e.status not in ('sent','expired') and e.event_time<now()-interval '7 days';
 return query with queue as (
  select e.lead_id from public.fp_campaign_ad_events e
  where e.status in ('pending','sending','failed') and e.next_at<=now()
   and (e.lease_until is null or e.lease_until<now()) and (fp_campaign_ad_claim.lead_id is null or e.lead_id=fp_campaign_ad_claim.lead_id)
  order by e.next_at limit 5 for update skip locked
 ) update public.fp_campaign_ad_events e set status='sending',lease_until=now()+interval '3 minutes',
  lease_token=gen_random_uuid(),attempts=e.attempts+1 from queue q where e.lead_id=q.lead_id returning e.*;
end $$;

create function public.fp_campaign_ad_result(secret text,lead_id uuid,claim_token uuid,succeeded boolean,error_code text default '')
returns void language plpgsql security definer set search_path='' as $$
begin
 perform public.fp_campaign_authorize(secret);
 update public.fp_campaign_ad_events e set status=case when succeeded then 'sent' else 'failed' end,
  sent_at=case when succeeded then now() else e.sent_at end,
  error_code=case when succeeded then '' else left(fp_campaign_ad_result.error_code,100) end,
  next_at=now()+interval '5 minutes',lease_until=null,lease_token=null
 where e.lead_id=fp_campaign_ad_result.lead_id and e.lease_token=claim_token;
end $$;
revoke all on function public.fp_campaign_ad_claim(text,uuid),public.fp_campaign_ad_result(text,uuid,uuid,boolean,text) from public,anon,authenticated;
grant execute on function public.fp_campaign_ad_claim(text,uuid),public.fp_campaign_ad_result(text,uuid,uuid,boolean,text) to anon;
notify pgrst,'reload schema';
commit;
