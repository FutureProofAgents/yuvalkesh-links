import {authorizedWorker,syncLeads} from '../lib/campaign-leads.js';
import {syncAdConversions} from '../lib/ad-conversions.js';
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 if(!authorizedWorker(req.headers.authorization))return res.status(401).json({ok:false});
 if(!['GET','POST'].includes(req.method))return res.status(405).json({ok:false});
 const [sheet,ads]=await Promise.allSettled([syncLeads(),syncAdConversions()]);
 const ok=sheet.status==='fulfilled'&&ads.status==='fulfilled';
 return res.status(ok?200:503).json({ok,...(sheet.status==='fulfilled'?sheet.value:{sheet_error:true}),ads:ads.status==='fulfilled'?ads.value:{error:true}});
}
