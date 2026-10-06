import {allowedOrigin,validate,rpc,requestHash,syncLeads} from '../lib/campaign-leads.js';
import {syncAdConversions} from '../lib/ad-conversions.js';
import {syncLeadAlerts} from '../lib/lead-alerts.js';
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');res.setHeader('Content-Type','application/json');
 if(!allowedOrigin(req.headers.origin))return res.status(403).json({ok:false});
 if(req.headers.origin)res.setHeader('Access-Control-Allow-Origin',req.headers.origin);res.setHeader('Vary','Origin');
 if(req.method==='OPTIONS'){res.setHeader('Access-Control-Allow-Methods','POST');res.setHeader('Access-Control-Allow-Headers','Content-Type');res.setHeader('Access-Control-Max-Age','86400');return res.status(204).end();}
 if(req.method!=='POST'){res.setHeader('Allow','POST, OPTIONS');return res.status(405).json({ok:false});}
 if(!String(req.headers['content-type']||'').startsWith('application/json'))return res.status(415).json({ok:false});
 let payload;try{const raw=typeof req.body==='string'?req.body:JSON.stringify(req.body);if(Buffer.byteLength(raw||'')>20000)return res.status(413).json({ok:false});payload=validate(typeof req.body==='string'?JSON.parse(req.body):req.body);}catch(e){return res.status(422).json({ok:false,field:e.message});}
 if(payload.spam)return res.status(200).json({ok:true});
 try{
  const result=await rpc('fp_campaign_ingest',{payload,request_hash:requestHash(req)});
  // The durable inquiry is accepted even if the secondary mirror is offline.
  await Promise.allSettled([syncLeads(result.id),syncAdConversions(result.id),syncLeadAlerts(result.id)]);
  return res.status(201).json({ok:true,id:result.id});
 }catch(e){const limited=e.message==='rate_limit';console.error('[campaign-lead]',limited?'rate_limit':'save_failed');if(limited)res.setHeader('Retry-After','3600');return res.status(limited?429:503).json({ok:false,error:limited?'rate_limit':'try_again'});}
}
