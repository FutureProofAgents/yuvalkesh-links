import crypto from 'node:crypto';

const BASE='appSZz4NuPjcVEvQ1';
const RECIPIENTS='tbliJbjnTklFZRYIA';
const SUPPRESSIONS='tblZLWhGa8QPgZvtI';
const EVENTS='tbldZ6o8avEQgY0b8';
const COMPOSIO_BASE_URL=process.env.COMPOSIO_BASE_URL||'https://backend.composio.dev';
const VERSIONS={AIRTABLE_LIST_RECORDS:'20260902_00',AIRTABLE_CREATE_RECORDS:'20260902_00',AIRTABLE_UPDATE_RECORD:'20260902_00'};
function page(res,status,title,text,extra=''){res.setHeader('Cache-Control','no-store');res.setHeader('Content-Type','text/html; charset=utf-8');return res.status(status).send(`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${title}</title><style>body{margin:0;background:#000;color:#e7e9ea;font:16px/1.6 Inter,Arial,sans-serif;display:grid;min-height:100vh;place-items:center}.card{width:min(560px,calc(100% - 40px));border:1px solid #2f3336;border-radius:20px;background:#101214;padding:36px}h1{color:#fff;font-size:28px}a{color:#1d9bf0}button{border:0;border-radius:10px;background:#1d9bf0;color:#001522;padding:11px 16px;font-weight:800;cursor:pointer;margin:8px 0 20px}</style><main class="card"><h1>${title}</h1><p>${text}</p>${extra}<br><a href="https://futureproofagents.com/newsletter/">FutureProof Newsletter</a></main></html>`);}
function verify(token){try{const [encoded,supplied]=String(token||'').split('.');const expected=crypto.createHmac('sha256',process.env.OUTREACH_SESSION_SECRET).update(encoded).digest('base64url');if(!supplied||supplied.length!==expected.length||!crypto.timingSafeEqual(Buffer.from(supplied),Buffer.from(expected)))return null;const payload=JSON.parse(Buffer.from(encoded,'base64url').toString());return payload.exp>Date.now()?payload:null;}catch{return null;}}
function unwrap(result){let d=result?.data??result??{};if(d?.data!==undefined)d=d.data;return d;}
async function tool(slug,args){const r=await fetch(`${COMPOSIO_BASE_URL}/api/v3.1/tools/execute/${slug}`,{method:'POST',headers:{'x-user-api-key':process.env.COMPOSIO_USER_API_KEY,'x-org-id':process.env.COMPOSIO_ORG_ID,'x-project-id':process.env.COMPOSIO_PROJECT_ID,'x-framework':'futureproof-outreach','x-source':'Vercel Function','Content-Type':'application/json'},body:JSON.stringify({user_id:process.env.COMPOSIO_USER_ID,version:VERSIONS[slug],arguments:args}),signal:AbortSignal.timeout(15000)});const out=await r.json().catch(()=>null);if(!r.ok||!out?.successful)throw new Error('provider failed');return unwrap(out);}
function rows(d){return d?.records||d?.data?.records||[];}
async function list(table,args={}){return rows(await tool('AIRTABLE_LIST_RECORDS',{baseId:BASE,tableIdOrName:table,pageSize:100,...args}));}
async function update(id,fields){return tool('AIRTABLE_UPDATE_RECORD',{baseId:BASE,tableIdOrName:RECIPIENTS,recordId:id,typecast:true,fields});}
async function create(table,fields){return tool('AIRTABLE_CREATE_RECORDS',{baseId:BASE,tableIdOrName:table,typecast:true,records:[{fields}]});}
export default async function handler(req,res){
  if(req.method!=='GET'&&req.method!=='POST')return page(res,405,'Method not allowed','This request was not accepted.');
  if(req.query?.action!=='unsubscribe'||!process.env.OUTREACH_SESSION_SECRET)return page(res,400,'Invalid link','This unsubscribe link is invalid or expired.');
  const payload=verify(req.query.token);const email=String(payload?.email||'').toLowerCase();if(!email)return page(res,400,'Invalid link','This unsubscribe link is invalid or expired.');
  if(req.method==='GET'){const action=`/api/outreach-public?action=unsubscribe&token=${encodeURIComponent(req.query.token)}`;return page(res,200,'Unsubscribe from outreach','Confirm that this address should receive no further FutureProof outreach.',`<form method="post" action="${action}"><button type="submit">Confirm unsubscribe</button></form>`);}
  try{
    const escaped=email.replace(/'/g,"''");const existing=await list(SUPPRESSIONS,{filterByFormula:`LOWER({Email})='${escaped}'`,maxRecords:1});
    if(!existing.length)await create(SUPPRESSIONS,{Email:email,Reason:'unsubscribe',Source:'email_link','Created At':new Date().toISOString(),Notes:'Recipient used one-click unsubscribe'});
    const recipients=await list(RECIPIENTS,{filterByFormula:`LOWER({Email})='${escaped}'`,maxRecords:100});
    for(const row of recipients){await update(row.id,{Status:'unsubscribed','Send Approved':false,'Sequence Approved':false,'Last Event At':new Date().toISOString()});await create(EVENTS,{'Event Key':crypto.randomUUID(),'Recipient':[row.id],'Campaign':row.fields?.Campaign||[],'Type':'unsubscribed','Occurred At':new Date().toISOString(),'Summary':'Recipient used unsubscribe link'});}
    return page(res,200,'You are unsubscribed','This address will not receive further FutureProof outreach.');
  }catch{return page(res,500,'Could not update preferences','Please reply to the email and ask to be removed.');}
}
