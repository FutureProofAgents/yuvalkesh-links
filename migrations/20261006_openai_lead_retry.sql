begin;
-- Reuse the existing worker and secret; wake it for either delivery queue.
select cron.schedule('futureproof-campaign-sheet-sync','*/5 * * * *',$job$
 select net.http_post(
  url:='https://yuvalkesh-links.vercel.app/api/lead-sync',
  headers:=jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||(select decrypted_secret from vault.decrypted_secrets where name='fp_campaign_sync_trigger')),
  body:='{}'::jsonb,timeout_milliseconds:=60000
 ) where exists(select 1 from public.fp_campaign_leads where sync_status<>'synced' and sync_next_at<=now() and (sync_lease_until is null or sync_lease_until<now()))
 or exists(select 1 from public.fp_campaign_ad_events where status not in ('sent','expired') and next_at<=now() and (lease_until is null or lease_until<now()));
$job$);
commit;
