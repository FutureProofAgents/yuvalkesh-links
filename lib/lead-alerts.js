import {rpc} from './campaign-leads.js';
const RECIPIENTS=['y@uxwritinghub.com','yuval.kesh@gmail.com'];
const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const labels={marketing:'Marketing',sales:'Sales & CRM',operations:'Operations',service:'Customer service',knowledge:'Internal knowledge',not_sure:'Help choosing'};
const revenue={pre_revenue:'Pre-revenue',under_250k:'Under 250k','250k_1m':'250k–1m','1m_5m':'1m–5m','5m_20m':'5m–20m','20m_100m':'20m–100m','100m_plus':'100m+','undisclosed':'Prefer not to say'};
export function leadAlert(lead){
 const marker='FPlead-'+lead.id,source=lead.attribution?.last||{};
 const fields=[['Name',lead.full_name],['Email',lead.email],['Role',lead.job_title],['Company',lead.company],['Business',lead.business_description],['Annual revenue',(revenue[lead.revenue_band]||lead.revenue_band)+' '+lead.revenue_currency],['Looking for',(lead.solutions||[]).map(x=>labels[x]||x).join(', ')],['Phone',lead.phone],['LinkedIn',lead.linkedin_url],['Page language',lead.language==='he'?'Hebrew':'English'],['Source',lead.source],['Campaign',lead.campaign],['Ad ID',source.ad_id||source.utm_content],['Received',lead.created_at]];
 return {user_id:'me',recipient_email:RECIPIENTS[0],extra_recipients:[RECIPIENTS[1]],is_html:true,
  subject:`New FutureProof lead: ${lead.company} — ${lead.full_name} [${marker}]`,
  body:`<h2>New FutureProof inquiry</h2><table>${fields.filter(([,v])=>v).map(([k,v])=>`<tr><th align="left" valign="top">${k}</th><td dir="auto">${escape(v)}</td></tr>`).join('')}</table><p><a href="https://futureproof-content-studio-swart.vercel.app/crm/campaign-leads">Open lead inbox in Content Studio</a></p><p>The visitor was offered a free session after submitting. This alert does not mean a session has been booked.</p><p>Lead reference: ${marker}</p>`};
}
export async function gmailTool(slug,args,{fetcher=fetch,env=process.env}={}){
 const response=await fetcher(`${env.COMPOSIO_BASE_URL||'https://backend.composio.dev'}/api/v3.1/tools/execute/${slug}`,{
  method:'POST',headers:{'x-user-api-key':env.CAMPAIGN_COMPOSIO_KEY||env.COMPOSIO_USER_API_KEY,'x-org-id':env.COMPOSIO_ORG_ID,'x-project-id':env.COMPOSIO_PROJECT_ID,'x-framework':'futureproof-lead-alerts','Content-Type':'application/json'},
  body:JSON.stringify({user_id:env.COMPOSIO_USER_ID,version:'20260915_00',arguments:args}),signal:AbortSignal.timeout(10000)});
 const result=await response.json().catch(()=>null);
 if(!response.ok||!result?.successful)throw Error('gmail_unavailable');
 return result?.data?.data||result?.data||{};
}
const messages=data=>data.messages||data.emails||[];
async function recoverDraft(marker,tool){
 const found=await tool('GMAIL_FETCH_EMAILS',{user_id:'me',query:`in:drafts subject:${marker}`,max_results:10,ids_only:true,verbose:false});
 const ids=new Set(messages(found).map(m=>m.id||m.messageId));
 if(!ids.size)return null;
 let page_token='';
 do{
  const page=await tool('GMAIL_LIST_DRAFTS',{user_id:'me',max_results:500,verbose:false,page_token});
  const match=(page.drafts||[]).find(d=>ids.has(d.message?.id));
  if(match)return match.id;
  page_token=page.nextPageToken||page.next_page_token||'';
 }while(page_token);
 throw Error('draft_reconciliation_pending');
}
export async function syncLeadAlerts(leadId=null,deps={}){
 const env=deps.env||process.env,call=deps.rpc||((n,a)=>rpc(n,a,deps)),tool=deps.gmailTool||((n,a)=>gmailTool(n,a,deps));
 if(!env.CAMPAIGN_COMPOSIO_KEY&&!env.COMPOSIO_USER_API_KEY)return {sent:0,configured:false};
 const rows=await call('fp_campaign_email_claim',{lead_id:leadId});let sent=0;
 await Promise.all(rows.map(async row=>{
  let messageId=null,error_code='gmail_unavailable';
  try{
   const marker='FPlead-'+row.lead_id;
   // Reconcile Gmail before retrying a send whose previous result was uncertain.
   const existing=await tool('GMAIL_FETCH_EMAILS',{user_id:'me',query:`in:sent subject:${marker}`,max_results:2,ids_only:true,verbose:false});
   messageId=messages(existing)[0]?.id||messages(existing)[0]?.messageId||null;
   if(!messageId){
    let draftId=row.draft_id;
    if(!draftId&&row.attempts>1)draftId=await recoverDraft(marker,tool);
    if(!draftId){const draft=await tool('GMAIL_CREATE_EMAIL_DRAFT',leadAlert(row.lead));draftId=draft.id||draft.draft?.id;if(!draftId)throw Error('draft_receipt_missing');}
    const checkpoint=await call('fp_campaign_email_checkpoint',{lead_id:row.lead_id,claim_token:row.lease_token,new_draft_id:draftId});
    if(checkpoint!==true)throw Error('claim_expired');
    // Gmail consumes a draft when sending; the same draft ID cannot send twice.
    const delivered=await tool('GMAIL_SEND_DRAFT',{user_id:'me',draft_id:draftId});
    messageId=delivered.id||delivered.message?.id||null;
    if(!messageId)throw Error('send_receipt_missing');
   }
   sent++;
  }catch(error){error_code=['draft_reconciliation_pending','claim_expired','draft_receipt_missing','send_receipt_missing'].includes(error.message)?error.message:'gmail_unavailable';}
  await call('fp_campaign_email_result',{lead_id:row.lead_id,claim_token:row.lease_token,succeeded:!!messageId,gmail_message_id:messageId,error_code});
 }));
 return {sent,processed:rows.length,configured:true};
}
