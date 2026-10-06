begin;
create table public.fp_campaign_email_alerts (
 lead_id uuid primary key references public.fp_campaign_leads(id) on delete cascade,
 status text not null default 'pending' check(status in ('pending','sending','sent','failed')),
 draft_id text, message_id text, attempts integer not null default 0,
 next_at timestamptz not null default now(), lease_until timestamptz,lease_token uuid,
 sent_at timestamptz,error_code text not null default ''
);
alter table public.fp_campaign_email_alerts enable row level security;
revoke all on public.fp_campaign_email_alerts from public,anon,authenticated;
grant select on public.fp_campaign_email_alerts to authenticated;
create policy email_alert_owner on public.fp_campaign_email_alerts for select to authenticated
 using((select auth.uid())='c774e590-7732-4481-add1-6ed377a10522'::uuid);
create function public.fp_campaign_queue_email() returns trigger language plpgsql security definer set search_path='' as $$
begin insert into public.fp_campaign_email_alerts(lead_id) values(new.id);return new;end $$;
create trigger campaign_email_alert after insert on public.fp_campaign_leads for each row execute function public.fp_campaign_queue_email();
revoke all on function public.fp_campaign_queue_email() from public,anon,authenticated;

create function public.fp_campaign_email_claim(secret text,lead_id uuid default null) returns jsonb
language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
 perform public.fp_campaign_authorize(secret);
 with queue as (
  select e.lead_id from public.fp_campaign_email_alerts e where e.status<>'sent' and e.next_at<=now()
   and (e.lease_until is null or e.lease_until<now())
   and (fp_campaign_email_claim.lead_id is null or e.lead_id=fp_campaign_email_claim.lead_id)
  order by e.next_at limit 3 for update skip locked
 ), claimed as (
  update public.fp_campaign_email_alerts e set status='sending',lease_until=now()+interval '3 minutes',
   lease_token=gen_random_uuid(),attempts=e.attempts+1 from queue q where e.lead_id=q.lead_id returning e.*
 ) select coalesce(jsonb_agg(to_jsonb(c)||jsonb_build_object('lead',to_jsonb(l)-'ip_hash')),'[]'::jsonb)
 into result from claimed c join public.fp_campaign_leads l on l.id=c.lead_id;
 return result;
end $$;

create function public.fp_campaign_email_checkpoint(secret text,lead_id uuid,claim_token uuid,new_draft_id text)
returns boolean language plpgsql security definer set search_path='' as $$
declare n integer;
begin
 perform public.fp_campaign_authorize(secret);
 update public.fp_campaign_email_alerts e set draft_id=new_draft_id
 where e.lead_id=fp_campaign_email_checkpoint.lead_id and e.lease_token=claim_token;
 get diagnostics n=row_count;return n=1;
end $$;
create function public.fp_campaign_email_result(secret text,lead_id uuid,claim_token uuid,succeeded boolean,gmail_message_id text default null,error_code text default '')
returns void language plpgsql security definer set search_path='' as $$
begin
 perform public.fp_campaign_authorize(secret);
 update public.fp_campaign_email_alerts e set status=case when succeeded then 'sent' else 'failed' end,
  message_id=coalesce(gmail_message_id,e.message_id),sent_at=case when succeeded then now() else e.sent_at end,
  error_code=case when succeeded then '' else left(fp_campaign_email_result.error_code,100) end,
  next_at=now()+interval '5 minutes',lease_until=null,lease_token=null
 where e.lead_id=fp_campaign_email_result.lead_id and e.lease_token=claim_token;
end $$;
revoke all on function public.fp_campaign_email_claim(text,uuid),public.fp_campaign_email_checkpoint(text,uuid,uuid,text),public.fp_campaign_email_result(text,uuid,uuid,boolean,text,text) from public,anon,authenticated;
grant execute on function public.fp_campaign_email_claim(text,uuid),public.fp_campaign_email_checkpoint(text,uuid,uuid,text),public.fp_campaign_email_result(text,uuid,uuid,boolean,text,text) to anon;

select cron.schedule('futureproof-campaign-sheet-sync','*/5 * * * *',$job$
 select net.http_post(
  url:='https://yuvalkesh-links.vercel.app/api/lead-sync',
  headers:=jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||(select decrypted_secret from vault.decrypted_secrets where name='fp_campaign_sync_trigger')),
  body:='{}'::jsonb,timeout_milliseconds:=60000
 ) where exists(select 1 from public.fp_campaign_leads where sync_status<>'synced' and sync_next_at<=now() and (sync_lease_until is null or sync_lease_until<now()))
 or exists(select 1 from public.fp_campaign_ad_events where status not in ('sent','expired') and next_at<=now() and (lease_until is null or lease_until<now()))
 or exists(select 1 from public.fp_campaign_email_alerts where status<>'sent' and next_at<=now() and (lease_until is null or lease_until<now()));
$job$);
notify pgrst,'reload schema';
commit;
