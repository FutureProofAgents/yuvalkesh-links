import test from 'node:test';
import assert from 'node:assert/strict';

process.env.OUTREACH_SESSION_SECRET='test-secret-that-is-long-enough';
process.env.OUTREACH_ADMIN_EMAIL='y@uxwritinghub.com';
process.env.OUTREACH_APP_URL='https://yuvalkesh-links.vercel.app';
process.env.COMPOSIO_USER_API_KEY='test';
process.env.COMPOSIO_ORG_ID='test';
process.env.COMPOSIO_PROJECT_ID='test';
process.env.COMPOSIO_USER_ID='test';
process.env.OUTREACH_POSTAL_ADDRESS='Test address';
process.env.OUTREACH_SEND_DISABLED='false';

let calls=[];
global.fetch=async (url,options)=>{
  const body=JSON.parse(options.body);calls.push({url:String(url),body});
  const slug=String(url).split('/').pop();
  if(slug==='GMAIL_SEND_EMAIL') return Response.json({successful:true,data:{data:{id:'mail-test'}}});
  if(slug==='AIRTABLE_LIST_RECORDS') return Response.json({successful:true,data:{data:{records:[]}}});
  return Response.json({successful:true,data:{data:{records:[]}}});
};
const {default:handler}=await import('../api/outreach.js');
function response(){return {statusCode:200,headers:{},body:'',setHeader(k,v){this.headers[k]=v},getHeader(k){return this.headers[k]},status(n){this.statusCode=n;return this},send(v){this.body=v;return this}}}
function request(method,action,body={},headers={}){return {method,query:{action},body,headers:{origin:'https://yuvalkesh-links.vercel.app',...headers}}}
function parsed(res){return JSON.parse(res.body)}

test('dashboard rejects unauthenticated access',async()=>{const res=response();await handler(request('GET','dashboard',{},{}),res);assert.equal(res.statusCode,401);assert.equal(parsed(res).error,'Authentication required')});
test('state changes reject unknown origins',async()=>{const res=response();await handler(request('POST','request-login',{email:'y@uxwritinghub.com'},{origin:'https://evil.example'}),res);assert.equal(res.statusCode,403)});
test('one-time-code login issues a signed session',async()=>{calls=[];const first=response();await handler(request('POST','request-login',{email:'y@uxwritinghub.com'}),first);assert.equal(first.statusCode,202);const sent=calls.find(c=>c.url.endsWith('/GMAIL_SEND_EMAIL'));assert.ok(sent);const code=sent.body.arguments.body.match(/\b\d{6}\b/)[0];const cookies=first.headers['Set-Cookie'];const challenge=cookies.find(c=>c.startsWith('fp_outreach_challenge=')).split(';')[0];const second=response();await handler(request('POST','verify-login',{code},{cookie:challenge}),second);assert.equal(second.statusCode,200);assert.ok(second.headers['Set-Cookie'].some(c=>c.startsWith('fp_outreach_session=')))});
test('recipient send remains blocked unless sequence is approved',async()=>{calls=[];global.fetch=async(url,options)=>{const body=JSON.parse(options.body);calls.push({url:String(url),body});return Response.json({successful:true,data:{data:{records:[{id:'rec12345678901234',fields:{Email:'person@example.com',Status:'imported','Sequence Approved':false}}]}}})};
 const first=response();global.fetch=async(url,options)=>{const body=JSON.parse(options.body);calls.push({url:String(url),body});if(String(url).endsWith('/GMAIL_SEND_EMAIL'))return Response.json({successful:true,data:{data:{}}});return Response.json({successful:true,data:{data:{records:[]}}})};await handler(request('POST','request-login',{email:'y@uxwritinghub.com'}),first);const sent=calls.find(c=>c.url.endsWith('/GMAIL_SEND_EMAIL'));const code=sent.body.arguments.body.match(/\b\d{6}\b/)[0];const challenge=first.headers['Set-Cookie'].find(c=>c.startsWith('fp_outreach_challenge=')).split(';')[0];const verified=response();await handler(request('POST','verify-login',{code},{cookie:challenge}),verified);const session=verified.headers['Set-Cookie'].find(c=>c.startsWith('fp_outreach_session=')).split(';')[0];global.fetch=async()=>Response.json({successful:true,data:{data:{records:[{id:'rec12345678901234',fields:{Email:'person@example.com',Status:'imported','Sequence Approved':false}}]}}});const res=response();await handler(request('POST','send-recipient',{id:'rec12345678901234'},{cookie:session}),res);assert.equal(res.statusCode,409);assert.match(parsed(res).error,/explicit approval/)});
