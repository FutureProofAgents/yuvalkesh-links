import {rpc} from './campaign-leads.js';

export function conversionEvent(row){
 const he=row.language==='he';
 if(!['en','he'].includes(row.language))throw Error('invalid_language');
 const event={id:'lead:'+row.lead_id,type:'lead_created',timestamp_ms:Date.parse(row.event_time),
  action_source:'web',source_url:`https://futureproofagents.com/${he?'he/':''}ai-transformation/`,
  opt_out:true,data:{type:'customer_action'}};
 if(!Number.isFinite(event.timestamp_ms))throw Error('invalid_time');
 if(row.oppref)event.oppref=row.oppref;
 return event;
}

export async function syncAdConversions(leadId=null,deps={}){
 const env=deps.env||process.env,fetcher=deps.fetcher||fetch,call=deps.rpc||((name,args)=>rpc(name,args,deps));
 if(!env.OPENAI_CONVERSIONS_API_KEY||!env.OPENAI_ADS_PIXEL_EN||!env.OPENAI_ADS_PIXEL_HE)return {sent:0,configured:false};
 const rows=await call('fp_campaign_ad_claim',{lead_id:leadId});let sent=0;
 await Promise.all(rows.map(async row=>{
  let succeeded=false,error_code='conversion_unavailable';
  try{
   const event=conversionEvent(row),pid=row.language==='he'?env.OPENAI_ADS_PIXEL_HE:env.OPENAI_ADS_PIXEL_EN;
   const response=await fetcher('https://bzr.openai.com/v1/events?pid='+encodeURIComponent(pid),{
    method:'POST',redirect:'error',headers:{Authorization:'Bearer '+env.OPENAI_CONVERSIONS_API_KEY,'Content-Type':'application/json'},
    body:JSON.stringify({integration_source:'futureproof_agents_leads',events:[event]}),signal:AbortSignal.timeout(10000)});
   const body=await response.json().catch(()=>null);
   succeeded=response.ok&&body?.accepted_events===1&&!body.error;
   if(succeeded)sent++;else error_code='conversion_http_'+response.status;
  }catch{/* Retry the same event ID; never log request bodies or credentials. */}
  await call('fp_campaign_ad_result',{lead_id:row.lead_id,claim_token:row.lease_token,succeeded,error_code});
 }));
 return {sent,processed:rows.length,configured:true};
}
