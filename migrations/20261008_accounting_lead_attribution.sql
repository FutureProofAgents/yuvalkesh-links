-- The new Google Ads page shares lead storage, but must not create OpenAI conversions.
create or replace function public.fp_campaign_queue_ad_event()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.landing_page not in (
  'https://futureproofagents.com/ai-transformation/',
  'https://futureproofagents.com/he/ai-transformation/'
 ) then return new; end if;
 insert into public.fp_campaign_ad_events(lead_id,language,event_time,source_url,oppref)
 values(new.id,new.language,new.created_at,new.landing_page,
  coalesce(nullif(new.attribution->'last'->>'oppref',''),nullif(new.attribution->'first'->>'oppref',''),''));
 return new;
end $$;
