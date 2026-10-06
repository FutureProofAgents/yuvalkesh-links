import test from 'node:test';import assert from 'node:assert/strict';
import {leadAlert,syncLeadAlerts} from '../lib/lead-alerts.js';
const lead={id:'lead-123',company:'<img onerror=attack>',full_name:'QA Test',email:'qa@example.com',job_title:'Founder',business_description:'Test business',revenue_band:'1m_5m',revenue_currency:'USD',solutions:['sales'],language:'he',source:'openai',campaign:'Campaign A',created_at:'2026-10-06T12:00:00Z'};
const row={lead_id:lead.id,lead,lease_token:'lease',attempts:1,draft_id:null};
test('alerts go only to both requested addresses and escape submitted HTML',()=>{
 const a=leadAlert({...lead,recipient_email:'attacker@example.com'});assert.equal(a.recipient_email,'y@uxwritinghub.com');assert.deepEqual(a.extra_recipients,['yuval.kesh@gmail.com']);assert.ok(a.body.includes('&lt;img onerror=attack&gt;'));assert.ok(!a.body.includes('<img onerror'));assert.match(a.body,/Hebrew/);assert.match(a.body,/1m–5m USD/);assert.match(a.body,/Sales &amp; CRM/);
});
function fixture({existing=false,failSend=false,checkpoint=true,draftId=null}={}){
 const calls=[],acks=[];
 return {calls,acks,env:{CAMPAIGN_COMPOSIO_KEY:'secret'},rpc:async(n,a)=>{calls.push(n);if(n==='fp_campaign_email_claim')return [{...row,draft_id:draftId}];if(n==='fp_campaign_email_checkpoint')return checkpoint;acks.push(a);},gmailTool:async(n,a)=>{calls.push([n,a]);if(n==='GMAIL_FETCH_EMAILS')return {messages:existing?[{id:'sent-1'}]:[]};if(n==='GMAIL_CREATE_EMAIL_DRAFT')return {id:'draft-1'};if(n==='GMAIL_SEND_DRAFT'){if(failSend)throw Error('timeout');return {id:'sent-1'};}throw Error('unexpected tool');}};
}
test('draft receipt is persisted before sending and success is acknowledged',async()=>{const d=fixture();assert.equal((await syncLeadAlerts(null,d)).sent,1);assert.ok(d.calls.indexOf('fp_campaign_email_checkpoint')<d.calls.findIndex(c=>Array.isArray(c)&&c[0]==='GMAIL_SEND_DRAFT'));assert.equal(d.acks[0].gmail_message_id,'sent-1');});
test('a sent receipt reconciles uncertain delivery without another send',async()=>{const d=fixture({existing:true,draftId:'consumed-draft'});assert.equal((await syncLeadAlerts(null,d)).sent,1);assert.equal(d.calls.some(c=>Array.isArray(c)&&/CREATE|SEND/.test(c[0])),false);});
test('send timeout remains pending with its draft ID; retry reuses it',async()=>{const d=fixture({failSend:true,draftId:'draft-1'});await syncLeadAlerts(null,d);assert.equal(d.acks[0].succeeded,false);assert.equal(d.calls.some(c=>Array.isArray(c)&&c[0]==='GMAIL_CREATE_EMAIL_DRAFT'),false);});
test('an expired database claim cannot send an email',async()=>{const d=fixture({checkpoint:false});await syncLeadAlerts(null,d);assert.equal(d.calls.some(c=>Array.isArray(c)&&c[0]==='GMAIL_SEND_DRAFT'),false);assert.equal(d.acks[0].succeeded,false);});
