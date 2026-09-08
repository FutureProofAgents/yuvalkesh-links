import crypto from 'node:crypto';

const BASE = 'appSZz4NuPjcVEvQ1';
const TABLES = {
  campaigns: 'tblnN2eDaxXxYMXnh',
  recipients: 'tbliJbjnTklFZRYIA',
  events: 'tbldZ6o8avEQgY0b8',
  suppressions: 'tblZLWhGa8QPgZvtI',
  applications: 'tblW8r4jXEMTm5LBD',
};
const TOOL_VERSIONS = {
  AIRTABLE_LIST_RECORDS: '20260902_00',
  AIRTABLE_CREATE_RECORDS: '20260902_00',
  AIRTABLE_UPDATE_RECORD: '20260902_00',
  GMAIL_SEND_EMAIL: '20260903_00',
  GMAIL_FETCH_EMAILS: '20260903_00',
  RESEND_SEND_EMAIL: '20260903_00',
  RESEND_RETRIEVE_EMAIL: '20260903_00',
};
const COMPOSIO_BASE_URL = process.env.COMPOSIO_BASE_URL || 'https://backend.composio.dev';
const ADMIN_EMAIL = (process.env.OUTREACH_ADMIN_EMAIL || 'y@uxwritinghub.com').toLowerCase();
const SESSION_SECRET = process.env.OUTREACH_SESSION_SECRET;
const APP_URL = process.env.OUTREACH_APP_URL || 'https://yuvalkesh-links.vercel.app';
const ALLOWED_ORIGINS = new Set([APP_URL, 'https://yuvalkesh-links.vercel.app', 'http://localhost:4321', 'http://127.0.0.1:4321']);

function json(response, status, body) {
  response.setHeader('Cache-Control', 'no-store');
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  return response.status(status).send(JSON.stringify(body));
}
function clean(value, max = 500) {
  return String(value ?? '').replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, max);
}
function email(value) {
  const result = clean(value, 180).toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(result) ? result : '';
}
function cookieMap(header = '') {
  return Object.fromEntries(header.split(';').map((part) => part.trim().split('=').map(decodeURIComponent)).filter((x) => x.length === 2));
}
function sign(payload) {
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', SESSION_SECRET).update(encoded).digest('base64url');
  return `${encoded}.${signature}`;
}
function verify(token) {
  try {
    const [encoded, supplied] = String(token || '').split('.');
    const expected = crypto.createHmac('sha256', SESSION_SECRET).update(encoded).digest('base64url');
    if (!supplied || supplied.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(supplied), Buffer.from(expected))) return null;
    const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString());
    return payload.exp > Date.now() ? payload : null;
  } catch { return null; }
}
function setCookie(response, name, value, maxAge) {
  const cookie = `${name}=${encodeURIComponent(value)}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAge}`;
  const prior = response.getHeader('Set-Cookie') || [];
  response.setHeader('Set-Cookie', [...(Array.isArray(prior) ? prior : [prior]), cookie]);
}
function requireSession(request, response) {
  if (!SESSION_SECRET) { json(response, 503, {ok:false,error:'Authentication is not configured'}); return null; }
  const session = verify(cookieMap(request.headers.cookie).fp_outreach_session);
  if (!session || session.email !== ADMIN_EMAIL) { json(response, 401, {ok:false,error:'Authentication required'}); return null; }
  return session;
}
function validOrigin(request) {
  if (request.method === 'GET') return true;
  const origin = request.headers.origin;
  if (!origin) return false;
  return ALLOWED_ORIGINS.has(origin);
}
function unwrap(result) {
  let data = result?.data ?? result ?? {};
  if (data?.data !== undefined) data = data.data;
  return data;
}
async function tool(slug, args) {
  const required = ['COMPOSIO_USER_API_KEY','COMPOSIO_ORG_ID','COMPOSIO_PROJECT_ID','COMPOSIO_USER_ID'];
  if (required.some((key) => !process.env[key])) throw new Error('Integration service is not configured');
  const r = await fetch(`${COMPOSIO_BASE_URL}/api/v3.1/tools/execute/${encodeURIComponent(slug)}`, {
    method:'POST',
    headers:{'x-user-api-key':process.env.COMPOSIO_USER_API_KEY,'x-org-id':process.env.COMPOSIO_ORG_ID,'x-project-id':process.env.COMPOSIO_PROJECT_ID,'x-framework':'futureproof-outreach','x-source':'Vercel Function','Content-Type':'application/json'},
    body:JSON.stringify({user_id:process.env.COMPOSIO_USER_ID,version:TOOL_VERSIONS[slug],arguments:args}),
    signal:AbortSignal.timeout(20_000),
  });
  const result = await r.json().catch(() => null);
  if (!r.ok || !result?.successful) throw new Error(`${slug} failed (${r.status})`);
  return unwrap(result);
}
function records(data) { return data?.records || data?.data?.records || []; }
async function list(table, args={}) {
  return records(await tool('AIRTABLE_LIST_RECORDS',{baseId:BASE,tableIdOrName:table,pageSize:100,...args}));
}
async function create(table, rows) {
  if (!rows.length) return [];
  const out=[];
  for (let i=0;i<rows.length;i+=10) {
    const data=await tool('AIRTABLE_CREATE_RECORDS',{baseId:BASE,tableIdOrName:table,typecast:true,records:rows.slice(i,i+10).map((fields)=>({fields}))});
    out.push(...records(data));
  }
  return out;
}
async function update(table, id, fields) {
  return tool('AIRTABLE_UPDATE_RECORD',{baseId:BASE,tableIdOrName:table,recordId:id,typecast:true,fields});
}
async function event(type, recipient, campaign, summary='', provider='') {
  return create(TABLES.events,[{'Event Key':crypto.randomUUID(),'Recipient':recipient?[recipient]:[],'Campaign':campaign?[campaign]:[],'Type':type,'Occurred At':new Date().toISOString(),'Provider Event ID':provider,'Summary':clean(summary,1500)}]);
}
function render(template, fields) {
  const values={first_name:fields['First Name']||fields['Full Name']?.split(/\s+/)[0]||'',full_name:fields['Full Name']||'',company:fields.Company||'',job_title:fields['Job Title']||'',personal_note:fields['Personal Note']||''};
  return String(template||'').replace(/{{\s*(first_name|full_name|company|job_title|personal_note)\s*}}/gi,(_,key)=>values[key.toLowerCase()]||'');
}
function approvalFingerprint(campaign, recipient) {
  const approved={recipientId:recipient.id,email:email(recipient.fields.Email),subject:render(campaign.fields.Subject,recipient.fields),body:render(campaign.fields['Body Template'],recipient.fields),followupSubject:render(campaign.fields['Follow-up Subject'],recipient.fields),followupBody:render(campaign.fields['Follow-up Body'],recipient.fields),followupDays:Number(campaign.fields['Follow-up Delay Days'])||4,senderName:campaign.fields['Sender Name']||'',senderEmail:campaign.fields['Sender Email']||'',replyTo:campaign.fields['Reply To']||''};
  return crypto.createHash('sha256').update(JSON.stringify(approved)).digest('hex');
}
function publicRecord(row) { return {id:row.id,createdTime:row.createdTime,fields:row.fields||{}}; }

async function requestLogin(request,response,body) {
  if (!SESSION_SECRET) return json(response,503,{ok:false,error:'Authentication is not configured'});
  const requested=email(body.email);
  if (requested===ADMIN_EMAIL) {
    const code=String(crypto.randomInt(100000,1000000)); const salt=crypto.randomBytes(16).toString('hex');
    const challenge=sign({email:ADMIN_EMAIL,hash:crypto.createHash('sha256').update(code+salt).digest('hex'),salt,exp:Date.now()+10*60*1000});
    setCookie(response,'fp_outreach_challenge',challenge,600);
    await tool('GMAIL_SEND_EMAIL',{recipient_email:ADMIN_EMAIL,subject:'Your FutureProof Outreach login code',body:`Your one-time code is ${code}. It expires in 10 minutes.`,is_html:false});
  }
  return json(response,202,{ok:true});
}
async function verifyLogin(request,response,body) {
  const challenge=verify(cookieMap(request.headers.cookie).fp_outreach_challenge);
  const candidate=clean(body.code,6);
  if (!challenge || !/^\d{6}$/.test(candidate)) return json(response,401,{ok:false,error:'Invalid or expired code'});
  const hash=crypto.createHash('sha256').update(candidate+challenge.salt).digest('hex');
  if (hash.length!==challenge.hash.length || !crypto.timingSafeEqual(Buffer.from(hash),Buffer.from(challenge.hash))) return json(response,401,{ok:false,error:'Invalid or expired code'});
  setCookie(response,'fp_outreach_session',sign({email:ADMIN_EMAIL,exp:Date.now()+12*60*60*1000}),43200);
  setCookie(response,'fp_outreach_challenge','',0);
  return json(response,200,{ok:true});
}
async function dashboard(response) {
  const [campaigns,recipients,applications,suppressions]=await Promise.all([list(TABLES.campaigns),list(TABLES.recipients),list(TABLES.applications),list(TABLES.suppressions)]);
  const appEmails=new Set(applications.map((x)=>String(x.fields?.Email||'').toLowerCase()));
  for (const row of recipients) if (appEmails.has(String(row.fields?.Email||'').toLowerCase()) && !['applied','unsubscribed'].includes(row.fields?.Status)) row.fields.Status='applied';
  const counts={total:recipients.length,approved:0,sent:0,replied:0,applied:0,suppressed:suppressions.length};
  for (const {fields:f={}} of recipients) { if(f['Sequence Approved'])counts.approved++; if(['sent','delivered','opened','clicked','replied','applied'].includes(f.Status))counts.sent++; if(f.Status==='replied')counts.replied++; if(f.Status==='applied')counts.applied++; }
  return json(response,200,{ok:true,counts,campaigns:campaigns.map(publicRecord),recipients:recipients.map(publicRecord),applications:applications.map(publicRecord),suppressions:suppressions.map(publicRecord)});
}
async function createCampaign(response,body) {
  const fields={'Campaign Name':clean(body.name,120),'Status':'draft','Language':body.language==='Hebrew'?'Hebrew':'English','Subject':clean(body.subject,180),'Body Template':clean(body.body,10000),'Follow-up Subject':clean(body.followupSubject,180),'Follow-up Body':clean(body.followupBody,10000),'Follow-up Delay Days':Math.max(1,Math.min(30,Number(body.followupDays)||4)),'Sender Name':clean(body.senderName,100)||'Yuval Keshtcher','Sender Email':email(body.senderEmail),'Reply To':email(body.replyTo)||ADMIN_EMAIL,'Created At':new Date().toISOString()};
  if (!fields['Campaign Name']||!fields.Subject||!fields['Body Template']||!fields['Sender Email']) return json(response,400,{ok:false,error:'Name, sender, subject and body are required'});
  const made=await create(TABLES.campaigns,[fields]); return json(response,201,{ok:true,campaign:publicRecord(made[0])});
}
async function importRecipients(response,body) {
  const campaign=clean(body.campaignId,30); const input=Array.isArray(body.contacts)?body.contacts.slice(0,500):[]; const source=clean(body.source,180);
  if(!/^rec[a-zA-Z0-9]{14}$/.test(campaign)||!input.length||!source)return json(response,400,{ok:false,error:'Campaign, source and contacts are required'});
  const existing=await list(TABLES.recipients); const seen=new Set(existing.map((r)=>`${r.fields?.Email?.toLowerCase()}|${(r.fields?.Campaign||[])[0]}`));
  const suppressed=new Set((await list(TABLES.suppressions)).map((r)=>String(r.fields?.Email||'').toLowerCase())); const now=new Date().toISOString(); const rows=[];
  for(const item of input){const e=email(item.email);if(!e||suppressed.has(e)||seen.has(`${e}|${campaign}`))continue;rows.push({'Recipient Key':`${campaign}:${e}`,'Campaign':[campaign],'Email':e,'First Name':clean(item.firstName,80),'Full Name':clean(item.fullName,120),'Job Title':clean(item.jobTitle,120),'Company':clean(item.company,160),'Language':item.language==='Hebrew'?'Hebrew':item.language==='Other'?'Other':'English','Status':'imported','Send Approved':false,'Sequence Approved':false,'Personal Note':clean(item.personalNote,1500),'Import Source':source,'Imported At':now});seen.add(`${e}|${campaign}`);}
  const made=await create(TABLES.recipients,rows); for(const row of made.slice(0,20))await event('imported',row.id,campaign,'Imported from owner-reviewed CSV');
  return json(response,201,{ok:true,imported:made.length,skipped:input.length-made.length});
}
async function approveRecipient(response,body) {
  const id=clean(body.id,30); const approved=body.approved===true; if(!/^rec[a-zA-Z0-9]{14}$/.test(id))return json(response,400,{ok:false,error:'Invalid recipient'});
  const recipient=(await list(TABLES.recipients,{filterByFormula:`RECORD_ID()='${id}'`,maxRecords:1}))[0]; if(!recipient)return json(response,404,{ok:false,error:'Recipient not found'});
  const campaignId=(recipient.fields.Campaign||[])[0]; const campaign=(await list(TABLES.campaigns,{filterByFormula:`RECORD_ID()='${campaignId}'`,maxRecords:1}))[0]; if(!campaign)return json(response,404,{ok:false,error:'Campaign not found'});
  const hash=approved?approvalFingerprint(campaign,recipient):'';
  await update(TABLES.recipients,id,{'Send Approved':approved,'Sequence Approved':approved,'Approval Hash':hash,'Approved At':approved?new Date().toISOString():'','Status':approved?'approved':'imported'}); await event('approved',id,campaignId,approved?`Exact sequence version approved: ${hash}`:'Sequence approval removed by owner'); return json(response,200,{ok:true});
}
async function sendRecipient(response,body) {
  if(process.env.OUTREACH_SEND_DISABLED!=='false')return json(response,503,{ok:false,error:'Sending is disabled until the owner canary is verified'});
  if(!process.env.OUTREACH_POSTAL_ADDRESS)return json(response,409,{ok:false,error:'A postal address must be configured before sending'});
  const id=clean(body.id,30); const recipients=await list(TABLES.recipients,{filterByFormula:`RECORD_ID()='${id}'`,maxRecords:1}); const recipient=recipients[0];
  if(!recipient?.fields?.['Sequence Approved']||recipient.fields.Status!=='approved')return json(response,409,{ok:false,error:'Recipient sequence requires explicit approval'});
  const e=email(recipient.fields.Email); if(!e)return json(response,400,{ok:false,error:'Recipient email is invalid'});
  if((await list(TABLES.suppressions,{filterByFormula:`LOWER({Email})='${e.replace(/'/g,"''")}'`,maxRecords:1})).length)return json(response,409,{ok:false,error:'Recipient is suppressed'});
  const campaignId=(recipient.fields.Campaign||[])[0]; const campaigns=await list(TABLES.campaigns,{filterByFormula:`RECORD_ID()='${campaignId}'`,maxRecords:1}); const campaign=campaigns[0]; if(!campaign)return json(response,404,{ok:false,error:'Campaign not found'});
  const currentHash=approvalFingerprint(campaign,recipient); if(recipient.fields['Approval Hash']!==currentHash){await update(TABLES.recipients,id,{'Send Approved':false,'Sequence Approved':false,'Status':'imported','Approval Hash':''});return json(response,409,{ok:false,error:'Message changed after approval; review and approve it again'});}
  const today=new Date().toISOString().slice(0,10); const sentToday=(await list(TABLES.recipients)).filter((r)=>String(r.fields?.['Sent At']||'').startsWith(today)).length; if(sentToday>=20)return json(response,429,{ok:false,error:'Daily safety limit reached'});
  const token=sign({email:e,exp:Date.now()+365*24*60*60*1000}); const unsubscribe=`${APP_URL}/api/outreach-public?action=unsubscribe&token=${encodeURIComponent(token)}`;
  const subject=render(campaign.fields.Subject,recipient.fields); const core=render(campaign.fields['Body Template'],recipient.fields); const text=`${core}\n\nFutureProof Agents · ${process.env.OUTREACH_POSTAL_ADDRESS}\nUnsubscribe: ${unsubscribe}`;
  await update(TABLES.recipients,id,{'Status':'sending','Rendered Subject':subject,'Rendered Body':text,'Last Error':''});
  try {
    const data=await tool('RESEND_SEND_EMAIL',{from:`${campaign.fields['Sender Name']||'Yuval Keshtcher'} <${campaign.fields['Sender Email']}>`,to:e,subject,text,reply_to:campaign.fields['Reply To']||ADMIN_EMAIL,headers:{'List-Unsubscribe':`<${unsubscribe}>`,'List-Unsubscribe-Post':'List-Unsubscribe=One-Click'}});
    const provider=data?.id||data?.email_id||data?.data?.id||''; const now=new Date().toISOString();
    const delay=Math.max(1,Math.min(30,Number(campaign.fields['Follow-up Delay Days'])||4));const next=new Date(Date.now()+delay*86400000).toISOString();
    await update(TABLES.recipients,id,{'Status':'sent','Provider Message ID':provider,'Sent At':now,'Next Follow-up At':next,'Last Event At':now}); await update(TABLES.campaigns,campaignId,{'Last Sent At':now}); await event('sent',id,campaignId,'Initial email sent after explicit sequence approval',provider);
    return json(response,200,{ok:true,status:'sent'});
  } catch(error){await update(TABLES.recipients,id,{'Status':'failed','Last Error':clean(error.message,500),'Last Event At':new Date().toISOString()});await event('failed',id,campaignId,'Provider rejected send');throw error;}
}
async function syncInbox(response) {
  const recipients=await list(TABLES.recipients); const byEmail=new Map(recipients.map((r)=>[String(r.fields?.Email||'').toLowerCase(),r]));
  const data=await tool('GMAIL_FETCH_EMAILS',{query:'in:inbox newer_than:30d',user_id:'me',max_results:100,include_payload:false,ids_only:false,verbose:true,include_spam_trash:false});
  const messages=data?.messages||[]; let matched=0;
  for(const message of messages){const from=String(message.from||message.sender||message.headers?.From||'');const match=from.match(/<([^>]+)>/)||from.match(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/);const e=(match?.[1]||match?.[0]||'').toLowerCase();const row=byEmail.get(e);if(!row||row.fields.Status==='replied')continue;await update(TABLES.recipients,row.id,{'Status':'replied','Gmail Thread ID':clean(message.threadId||message.thread_id,100),'Last Event At':new Date().toISOString()});await event('replied',row.id,(row.fields.Campaign||[])[0],clean(message.subject||message.snippet||'Reply received',500),message.messageId||message.id||'');matched++;}
  return json(response,200,{ok:true,checked:messages.length,matched});
}

export default async function handler(request,response){
  try{
    if(!validOrigin(request))return json(response,403,{ok:false,error:'Origin not allowed'});
    const action=clean(request.query?.action,50); if(typeof request.body==='string'&&request.body.length>250000)return json(response,413,{ok:false,error:'Request too large'}); const body=typeof request.body==='string'?JSON.parse(request.body||'{}'):(request.body||{});
    if(request.method==='POST'&&action==='request-login')return requestLogin(request,response,body);
    if(request.method==='POST'&&action==='verify-login')return verifyLogin(request,response,body);
    const session=requireSession(request,response); if(!session)return;
    if(request.method==='POST'&&action==='logout'){setCookie(response,'fp_outreach_session','',0);return json(response,200,{ok:true});}
    if(request.method==='GET'&&action==='session')return json(response,200,{ok:true,email:session.email});
    if(request.method==='GET'&&action==='dashboard')return dashboard(response);
    if(request.method==='POST'&&action==='create-campaign')return createCampaign(response,body);
    if(request.method==='POST'&&action==='import-recipients')return importRecipients(response,body);
    if(request.method==='POST'&&action==='approve-recipient')return approveRecipient(response,body);
    if(request.method==='POST'&&action==='send-recipient')return sendRecipient(response,body);
    if(request.method==='POST'&&action==='sync-inbox')return syncInbox(response);
    return json(response,404,{ok:false,error:'Unknown action'});
  }catch(error){console.error('[outreach]',error?.message||'unknown');return json(response,500,{ok:false,error:'Operation failed safely'});}
}
