import {authorizedWorker} from '../lib/campaign-leads.js';
import {syncConsulting} from '../lib/consulting-sync.js';
export default async function handler(req,res) {
  res.setHeader('Cache-Control','no-store');
  if(!authorizedWorker(req.headers.authorization))return res.status(401).json({ok:false});
  if(!['GET','POST'].includes(req.method))return res.status(405).json({ok:false});
  try { const result=await syncConsulting();return res.status(200).json({ok:true,...result}); }
  catch { return res.status(503).json({ok:false}); }
}
