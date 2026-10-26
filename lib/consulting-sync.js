import {rpc} from './campaign-leads.js';
import {saveRequest} from './consulting-airtable.js';
export async function syncConsulting(leadId=null, deps={}) {
  const call=deps.rpc||rpc, save=deps.saveRequest||saveRequest;
  const rows=await call('fp_consulting_claim',{lead_id:leadId});
  let synced=0;
  for(const row of rows) {
    try {
      await save(row.payload,{partial:!row.completed});
      await call('fp_consulting_result',{lead_id:row.id,claim_token:row.lease_token,record_version:row.version,succeeded:true});
      synced++;
    } catch {
      await call('fp_consulting_result',{lead_id:row.id,claim_token:row.lease_token,record_version:row.version,succeeded:false});
    }
  }
  return {processed:rows.length,synced};
}
