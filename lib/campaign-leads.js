import {createHmac,timingSafeEqual} from 'node:crypto';

export const SHEET_HEADERS=['Lead ID','Received (UTC)','Status','Full name','Email','Title','Company','Business','Industry','Market','Annual revenue band','Currency','Solutions needed','Challenge','Phone','LinkedIn','Language','Source','Medium','Campaign','Ad group ID','Ad ID','Campaign ID','First source','First campaign','Landing page','Referrer','OpenAI click ID','Next follow-up','Notes','Consent version','Updated (UTC)'];
export const CHOICES={industry:['technology','professional_services','retail','finance','healthcare','education','travel','manufacturing','real_estate','other'],market:['israel','north_america','europe','global','other'],revenue_band:['pre_revenue','under_250k','250k_1m','1m_5m','5m_20m','20m_100m','100m_plus','undisclosed'],revenue_currency:['USD','ILS','EUR','GBP'],solutions:['marketing','sales','operations','service','knowledge','not_sure']};
const clean=(v,max)=>typeof v==='string'?v.replace(/[\u0000-\u001f]/g,' ').trim().slice(0,max):'';
const allowedOrigins=new Set(['https://futureproofagents.com','https://www.futureproofagents.com','https://yuvalkesh-links.vercel.app']);
export const allowedOrigin=origin=>!origin||allowedOrigins.has(origin);
export function safePage(value){try{const u=new URL(value);return ['http:','https:'].includes(u.protocol)?u.origin+u.pathname:'';}catch{return '';}}
export function referralSource(value){try{const u=new URL(value);return allowedOrigins.has(u.origin)?'direct':u.hostname;}catch{return 'direct';}}
export function normalizeAttribution(value){
 const result={};for(const touch of ['first','last']){
  const raw=value?.[touch]||{},out={};
  for(const k of ['utm_source','utm_medium','utm_campaign','utm_content','utm_term','campaign_id','ad_group_id','ad_id','ad_account_id','oppref','click_id','gclid','fbclid'])out[k]=clean(raw[k],300);
  out.page=safePage(raw.page);out.referrer=safePage(raw.referrer);result[touch]=out;
 }
 return result;
}
export function validate(body){
 if(!body||typeof body!=='object'||Array.isArray(body))throw Error('invalid_body');
 if(body.website_check)return {spam:true};
 if(!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.submission_id||''))throw Error('submission_id');
 const p={submission_id:body.submission_id,language:body.language==='he'?'he':'en'};
 for(const [key,max,min] of [['full_name',120,2],['job_title',120,2],['company',160,2],['business_description',800,5],['email',180,5],['challenge',1600,0],['phone',60,0],['linkedin_url',300,0]]){
  if(typeof body[key]==='string'&&body[key].length>max)throw Error(key);
  p[key]=clean(body[key],max);if(p[key].length<min)throw Error(key);
 }
 p.email=p.email.toLowerCase();if(!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(p.email))throw Error('email');
 if(p.linkedin_url){try{const u=new URL(p.linkedin_url);if(u.protocol!=='https:'||!/(^|\.)linkedin\.com$/.test(u.hostname)||u.username||u.password)throw Error();p.linkedin_url=u.origin+u.pathname;}catch{throw Error('linkedin_url');}}
 for(const key of ['industry','market','revenue_band','revenue_currency']){if(!CHOICES[key].includes(body[key]))throw Error(key);p[key]=body[key];}
 p.solutions=[...new Set(Array.isArray(body.solutions)?body.solutions:[])];if(!p.solutions.length||p.solutions.length>6||p.solutions.some(s=>!CHOICES.solutions.includes(s)))throw Error('solutions');
 if(body.consent!==true)throw Error('consent');p.consent_version='inquiry-2026-10-06';
 p.attribution=normalizeAttribution(body.attribution);const a=p.attribution.last;
 p.source=a.utm_source||referralSource(a.referrer);
 p.medium=a.utm_medium||(p.source==='direct'?'none':'referral');p.campaign=a.utm_campaign||a.campaign_id||'';
 p.landing_page=`https://futureproofagents.com/${p.language==='he'?'he/':''}ai-transformation/`;
 return p;
}
export async function rpc(name,args,{fetcher=fetch,env=process.env}={}){
 if(!env.LEAD_INGEST_SECRET||!env.LEAD_SUPABASE_ANON_KEY)throw Error('lead_service_unavailable');
 const response=await fetcher('https://wfxqbqyxrswxrneddqau.supabase.co/rest/v1/rpc/'+name,{method:'POST',headers:{apikey:env.LEAD_SUPABASE_ANON_KEY,Authorization:'Bearer '+env.LEAD_SUPABASE_ANON_KEY,'Content-Type':'application/json'},body:JSON.stringify({secret:env.LEAD_INGEST_SECRET,...args}),signal:AbortSignal.timeout(12000)});
 const data=await response.json().catch(()=>null);
 if(!response.ok)throw Error(data?.message==='Too many requests'?'rate_limit':'database_unavailable');return data;
}
export async function sheetTool(slug,args,{fetcher=fetch,env=process.env}={}){
 const response=await fetcher(`${env.COMPOSIO_BASE_URL||'https://backend.composio.dev'}/api/v3.1/tools/execute/${slug}`,{method:'POST',headers:{'x-user-api-key':env.CAMPAIGN_COMPOSIO_KEY||env.COMPOSIO_USER_API_KEY,'x-org-id':env.COMPOSIO_ORG_ID,'x-project-id':env.COMPOSIO_PROJECT_ID,'x-framework':'futureproof-campaign-leads','Content-Type':'application/json'},body:JSON.stringify({user_id:env.COMPOSIO_USER_ID,version:'20261001_00',arguments:args}),signal:AbortSignal.timeout(10000)});
 const result=await response.json().catch(()=>null);if(!response.ok||!result?.successful)throw Error('sheets_unavailable');return result?.data?.data||result?.data||{};
}
const serialDate=value=>value?Date.parse(value)/86400000+25569:'';
export function sheetValues(l){const a=l.attribution?.last||{},f=l.attribution?.first||{};const firstSource=f.utm_source||referralSource(f.referrer);return [l.id,serialDate(l.created_at),l.status,l.full_name,l.email,l.job_title,l.company,l.business_description,l.industry,l.market,l.revenue_band,l.revenue_currency,l.solutions.join(', '),l.challenge,l.phone,l.linkedin_url,l.language,l.source,l.medium,l.campaign,a.ad_group_id||'',a.ad_id||a.utm_content||'',a.campaign_id||'',firstSource||'direct',f.utm_campaign||'',l.landing_page,a.referrer||'',a.oppref||a.click_id||'',serialDate(l.next_followup),l.notes,l.consent_version,serialDate(l.updated_at)];}
export async function syncLeads(leadId=null,deps={}){
 const env=deps.env||process.env,call=deps.rpc||((n,a)=>rpc(n,a,deps)),tool=deps.sheetTool||((n,a)=>sheetTool(n,a,deps));
 if(!env.CAMPAIGN_SHEET_ID)return {synced:0,pending:true};
 const rows=await call('fp_campaign_claim',{lead_id:leadId});let synced=0;
 if(!rows.length)return {synced:0,processed:0};
 let gridRows=0,headerOK=false;
 try{
  const info=await tool('GOOGLESHEETS_GET_SPREADSHEET_INFO',{spreadsheet_id:env.CAMPAIGN_SHEET_ID,fields:'sheets.properties'});
  gridRows=info.sheets?.find(s=>s.properties?.title==='Leads')?.properties?.gridProperties?.rowCount||0;
  const header=await tool('GOOGLESHEETS_VALUES_GET',{spreadsheet_id:env.CAMPAIGN_SHEET_ID,range:"'Leads'!A1:AF1"});
  headerOK=JSON.stringify(header.values?.[0])===JSON.stringify(SHEET_HEADERS);
 }catch{/* Each claimed record stays visible as a failed sync. */}
 await Promise.all(rows.map(async lead=>{
  try{
   if(!headerOK||!gridRows)throw Error('sheet_layout_changed');
   const range=`'Leads'!A${lead.sheet_row}:AF${lead.sheet_row}`;
   const current=lead.sheet_row>gridRows?{}:await tool('GOOGLESHEETS_VALUES_GET',{spreadsheet_id:env.CAMPAIGN_SHEET_ID,range:`'Leads'!A${lead.sheet_row}`});
   const cell=current.values?.[0]?.[0];if(cell&&cell!==lead.id)throw Error('sheet_row_moved');
   const values=sheetValues(lead);
   await tool('GOOGLESHEETS_VALUES_UPDATE',{spreadsheet_id:env.CAMPAIGN_SHEET_ID,range,value_input_option:'RAW',values:[values],auto_expand_sheet:true});
   await call('fp_campaign_sync_result',{lead_id:lead.id,record_version:lead.version,succeeded:true});synced++;
  }catch(error){await call('fp_campaign_sync_result',{lead_id:lead.id,record_version:lead.version,succeeded:false,error_code:['sheet_row_moved','sheet_layout_changed'].includes(error.message)?error.message:'sheets_unavailable'});}
 }));
 return {synced,processed:rows.length};
}
export const requestHash=(request,env=process.env)=>createHmac('sha256',env.LEAD_INGEST_SECRET).update(String(request.headers['x-vercel-forwarded-for']||request.headers['x-forwarded-for']||request.socket?.remoteAddress||'unknown').split(',')[0].trim()).digest('hex');
export function authorizedWorker(value,env=process.env){const a=Buffer.from(String(value||'')),b=Buffer.from('Bearer '+env.LEAD_SYNC_SECRET);return !!env.LEAD_SYNC_SECRET&&a.length===b.length&&timingSafeEqual(a,b);}
