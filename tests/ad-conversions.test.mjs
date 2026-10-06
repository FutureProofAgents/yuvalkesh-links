import test from 'node:test';import assert from 'node:assert/strict';
import {conversionEvent,syncAdConversions} from '../lib/ad-conversions.js';
const row=language=>({lead_id:'lead-123',language,event_time:'2026-10-06T12:00:00Z',oppref:'original_click_token',lease_token:'claim-123',email:'private@example.com',full_name:'Private Name',revenue_band:'20m_100m'});
test('conversion contains only the saved-lead event and correct language page',()=>{
 for(const language of ['en','he']){const e=conversionEvent(row(language));assert.equal(e.id,'lead:lead-123');assert.equal(e.source_url,`https://futureproofagents.com/${language==='he'?'he/':''}ai-transformation/`);assert.equal(e.oppref,'original_click_token');assert.equal(e.opt_out,true);assert.deepEqual(Object.keys(e).sort(),['action_source','data','id','oppref','opt_out','source_url','timestamp_ms','type']);}
 assert.throws(()=>conversionEvent(row('fr')));
});
test('languages route to different pixels and successful receipts acknowledge the lease',async()=>{
 const requests=[],acks=[];const env={OPENAI_CONVERSIONS_API_KEY:'secret',OPENAI_ADS_PIXEL_EN:'en-pixel',OPENAI_ADS_PIXEL_HE:'he-pixel'};
 const result=await syncAdConversions(null,{env,rpc:async(n,a)=>{if(n==='fp_campaign_ad_claim')return [row('en'),row('he')];acks.push(a);},fetcher:async(url,opts)=>{requests.push({url,body:JSON.parse(opts.body)});return {ok:true,json:async()=>({accepted_events:1})};}});
 assert.equal(result.sent,2);assert.match(requests[0].url,/pid=en-pixel$/);assert.match(requests[1].url,/pid=he-pixel$/);assert.ok(acks.every(a=>a.succeeded&&a.claim_token==='claim-123'));
});
test('timeout stays queued and retries retain the identical conversion ID',async()=>{
 const requests=[],acks=[];let attempt=0;const deps={env:{OPENAI_CONVERSIONS_API_KEY:'secret',OPENAI_ADS_PIXEL_EN:'en',OPENAI_ADS_PIXEL_HE:'he'},rpc:async(n,a)=>n==='fp_campaign_ad_claim'?[row('en')]:acks.push(a),fetcher:async(url,o)=>{requests.push(JSON.parse(o.body));if(attempt++===0)throw Error('timeout');return {ok:true,json:async()=>({accepted_events:1})};}};
 assert.equal((await syncAdConversions(null,deps)).sent,0);assert.equal((await syncAdConversions(null,deps)).sent,1);assert.equal(acks[0].succeeded,false);assert.equal(acks[1].succeeded,true);assert.equal(requests[0].events[0].id,requests[1].events[0].id);
});
test('unconfigured conversion delivery cannot consume queued records',async()=>{assert.equal((await syncAdConversions(null,{env:{},rpc:()=>{throw Error('must not claim');}})).configured,false);});
