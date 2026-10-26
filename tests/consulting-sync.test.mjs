import test from 'node:test';
import assert from 'node:assert/strict';
import {syncConsulting} from '../lib/consulting-sync.js';
const row={id:'lead',payload:{email:'qa@example.com'},completed:true,lease_token:'lease',version:2};
test('Airtable outage records a retryable failure for the durable request',async()=>{
 const calls=[];
 const result=await syncConsulting('lead',{rpc:async(n,a)=>{calls.push([n,a]);return n==='fp_consulting_claim'?[row]:null;},saveRequest:async()=>{throw Error('offline');}});
 assert.equal(result.synced,0);
 assert.deepEqual(calls[1],['fp_consulting_result',{lead_id:'lead',claim_token:'lease',record_version:2,succeeded:false}]);
});
test('successful mirror acknowledges exactly the claimed version and completion state',async()=>{
 const calls=[];
 const result=await syncConsulting(null,{rpc:async(n,a)=>{calls.push([n,a]);return n==='fp_consulting_claim'?[row]:null;},saveRequest:async(p,opts)=>{assert.equal(p.email,'qa@example.com');assert.deepEqual(opts,{partial:false});}});
 assert.equal(result.synced,1);assert.equal(calls[1][1].succeeded,true);assert.equal(calls[1][1].record_version,2);
});
test('an empty queue does not write to Airtable',async()=>{
 const r=await syncConsulting(null,{rpc:async()=>[],saveRequest:async()=>assert.fail('unexpected write')});
 assert.deepEqual(r,{processed:0,synced:0});
});
