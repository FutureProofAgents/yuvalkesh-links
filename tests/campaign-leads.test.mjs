import test from 'node:test';import assert from 'node:assert/strict';
import {validate,sheetValues,SHEET_HEADERS,syncLeads,allowedOrigin,authorizedWorker,PROJECT_FORMS} from '../lib/campaign-leads.js';
const input=()=>({submission_id:'9ce3cbb2-aec2-4d25-a0d7-b4cd4cd5ac76',full_name:'QA Example',email:'QA@example.com',job_title:'Founder',company:'QA Company',business_description:'We sell software to companies.',industry:'technology',market:'global',revenue_band:'1m_5m',revenue_currency:'USD',solutions:['sales','operations'],consent:true,language:'en',attribution:{first:{utm_source:'newsletter',utm_campaign:'initial'},last:{utm_source:'openai',utm_medium:'paid',utm_campaign:'ai-growth',campaign_id:'campaign123',ad_group_id:'group123',ad_id:'ad123',click_id:'click123',page:'https://futureproofagents.com/ai-transformation/?email=private@example.com',referrer:'https://chatgpt.com/?private=1'}}});
test('inquiry keeps attribution while stripping unrelated query data',()=>{const p=validate(input());assert.equal(p.source,'openai');assert.equal(p.email,'qa@example.com');assert.equal(p.attribution.first.utm_source,'newsletter');assert.equal(p.attribution.last.referrer,'https://chatgpt.com/');assert.equal(p.attribution.last.ad_id,'ad123');assert.equal(p.attribution.last.page,'https://futureproofagents.com/ai-transformation/');assert.equal(p.consent_version,'inquiry-2026-10-06');});
test('both languages preserve currency and broad revenue ranges',()=>{const p=validate({...input(),language:'he',revenue_currency:'ILS',revenue_band:'undisclosed'});assert.equal(p.revenue_currency,'ILS');assert.equal(p.revenue_band,'undisclosed');assert.match(p.landing_page,/\/he\//);});
test('missing qualification, invalid LinkedIn, and missing consent fail validation',()=>{for(const patch of [{email:'invalid'},{job_title:''},{company:''},{business_description:'no'},{solutions:[]},{solutions:['made_up']},{revenue_band:'rich'},{consent:false},{linkedin_url:'https://linkedin.com.attacker.com/me'},{linkedin_url:'javascript:alert(1)'}])assert.throws(()=>validate({...input(),...patch}));assert.equal(validate({...input(),website_check:'bot'}).spam,true);});
test('origins and worker credential are scoped',()=>{assert.equal(allowedOrigin('https://attacker.vercel.app'),false);assert.equal(allowedOrigin('https://futureproofagents.com'),true);assert.equal(authorizedWorker('Bearer worker',{LEAD_SYNC_SECRET:'worker',LEAD_INGEST_SECRET:'ingest'}),true);assert.equal(authorizedWorker('Bearer ingest',{LEAD_SYNC_SECRET:'worker',LEAD_INGEST_SECRET:'ingest'}),false);});
const row=()=>({...validate(input()),id:'lead123',sheet_row:5,created_at:'2026-10-06T12:00:00Z',updated_at:'2026-10-06T12:00:00Z',status:'new',sync_status:'pending',version:1,notes:'',next_followup:null});
test('sheet row has exactly one column for each header and all required dimensions',()=>{const values=sheetValues(row());assert.equal(values.length,SHEET_HEADERS.length);assert.equal(values[20],'group123');assert.equal(values[27],'click123');assert.equal(values[23],'newsletter');});
const fixture=({fail=false,moved=false,headerChanged=false}={})=>{const calls=[],lead=row();return {calls,env:{CAMPAIGN_SHEET_ID:'sheet'},rpc:async(name,args)=>{calls.push([name,args]);return name==='fp_campaign_claim'?[lead]:null;},sheetTool:async(name,args)=>{calls.push([name,args]);if(name==='GOOGLESHEETS_GET_SPREADSHEET_INFO')return {sheets:[{properties:{title:'Leads',gridProperties:{rowCount:1000}}}]};if(name==='GOOGLESHEETS_VALUES_GET')return {values:[args.range.endsWith('A1:AF1')?(headerChanged?['Changed']:SHEET_HEADERS):moved?['someone_else']:['lead123']]};if(fail)throw Error('timeout');return {updatedRows:1};}};};
test('sheet sync uses fixed rows and RAW input',async()=>{const d=fixture();assert.equal((await syncLeads(null,d)).synced,1);const write=d.calls.find(x=>x[0]==='GOOGLESHEETS_VALUES_UPDATE')[1];assert.equal(write.value_input_option,'RAW');assert.equal(write.range,"'Leads'!A5:AF5");});
test('uncertain sheet failure remains queued for idempotent retry',async()=>{const d=fixture({fail:true});assert.equal((await syncLeads(null,d)).synced,0);assert.equal(d.calls.at(-1)[1].succeeded,false);assert.equal(d.calls.at(-1)[1].error_code,'sheets_unavailable');});
test('moved rows and changed headers cannot overwrite other records',async()=>{for(const patch of [{moved:true},{headerChanged:true}]){const d=fixture(patch);await syncLeads(null,d);assert.equal(d.calls.some(c=>c[0]==='GOOGLESHEETS_VALUES_UPDATE'),false);}});

test('form API allows the Render domain preflight and blocks unrelated origins',async()=>{const {default:handler}=await import('../api/lead.js');const response=()=>({headers:{},setHeader(k,v){this.headers[k]=v;},status(v){this.code=v;return this;},end(){},json(v){this.body=v;}});for(const [origin,code] of [['https://futureproofagents.com',204],['https://evil.example',403]]){const res=response();await handler({method:'OPTIONS',headers:{origin}},res);assert.equal(res.code,code);assert.equal(res.headers['Access-Control-Allow-Origin'],code===204?origin:undefined);}});

test('internal navigation is not misreported as a referral',()=>{for(const referrer of ['https://futureproofagents.com/blog/','https://www.futureproofagents.com/']){const p=validate({...input(),attribution:{first:{referrer},last:{referrer}}});assert.equal(p.source,'direct');assert.equal(p.medium,'none');assert.equal(sheetValues({...row(),...p})[23],'direct');}assert.equal(validate({...input(),attribution:{last:{referrer:'https://chatgpt.com/'}}}).source,'chatgpt.com');});

test('shorter form accepts omitted market, industry and challenge without inventing answers',()=>{const body=input();delete body.market;delete body.industry;delete body.challenge;const p=validate(body);assert.equal(p.market,'');assert.equal(p.industry,'');assert.equal(p.challenge,'');assert.equal(sheetValues({...row(),...p})[9],'');assert.equal(validate(input()).market,'global');});

const accounting=()=>({...input(),form_type:'accounting_us',team_size:'5_10',project_budget:'10k_25k',current_software:'TaxDome and Microsoft 365',firm_website:'https://example.com/?private=value',challenge:'Connect incoming client documents to our workflow.',attribution:{first:{utm_source:'google',gclid:'test-click'},last:{utm_source:'google',utm_medium:'cpc',utm_campaign:'us-accounting',gclid:'test-click',gbraid:'test-braid'}}});
test('accounting qualification survives existing database and sheet fields with Google attribution',()=>{const p=validate(accounting());assert.equal(p.landing_page,'https://futureproofagents.com/ai-for-accounting-firms/');assert.equal(p.source,'google');assert.equal(p.attribution.last.gclid,'test-click');assert.equal(p.attribution.last.gbraid,'test-braid');assert.equal(p.market,'north_america');assert.match(p.challenge,/\$10,000–\$25,000/);assert.match(p.challenge,/TaxDome and Microsoft 365/);assert.ok(!p.challenge.includes('private=value'));assert.equal(sheetValues({...row(),...p})[13],p.challenge);assert.equal(sheetValues({...row(),...p})[25],p.landing_page);});
test('accounting cannot submit incomplete budget or software details, unsafe URLs or oversized text',()=>{for(const patch of [{team_size:''},{project_budget:'free'},{current_software:''},{challenge:'short'},{firm_website:'javascript:alert(1)'},{language:'he'},{current_software:'x'.repeat(201)},{challenge:'x'.repeat(1001)}])assert.throws(()=>validate({...accounting(),...patch}));});

test('each project saves its canonical page and ICP while preserving campaign attribution',()=>{
 for(const [slug,project] of Object.entries(PROJECT_FORMS)){
  const p=validate({...accounting(),form_type:'project_us',project_slug:slug,landing_page:'https://attacker.example/',attribution:{first:{utm_source:'outreach',utm_campaign:'first-wave'},last:{utm_source:'email',utm_medium:'outbound',utm_campaign:'us-icp-pilot',utm_content:'US-A01',page:'https://futureproofagents.com/pages/'+slug+'/?email=private@example.com'}}});
  assert.equal(p.landing_page,'https://futureproofagents.com/pages/'+slug+'/');
  assert.deepEqual(p.attribution.form,{type:'project_us',project_slug:slug,icp:project.icp});
  assert.equal(p.attribution.first.utm_source,'outreach');assert.equal(p.attribution.last.utm_content,'US-A01');
  assert.equal(p.source,'email');assert.equal(p.medium,'outbound');assert.equal(p.campaign,'us-icp-pilot');
  assert.ok(p.challenge.includes(project.label));assert.equal(p.industry,project.industry);
  const values=sheetValues({...row(),...p});assert.equal(values[25],p.landing_page);assert.equal(values[13],p.challenge);
  assert.ok(!JSON.stringify(p.attribution).includes('private@example.com'));
 }
});
test('project routing rejects unknown slugs and inherits inquiry qualification safeguards',()=>{
 const valid={...accounting(),form_type:'project_us',project_slug:'construction-document-workflows'};
 for(const project_slug of ['',undefined,'https://attacker.example/','constructor','__proto__','../ai-transformation'])assert.throws(()=>validate({...valid,project_slug}),/project_slug/);
 for(const patch of [{consent:false},{team_size:''},{project_budget:'free'},{current_software:''},{challenge:'short'},{firm_website:'javascript:alert(1)'},{language:'he'}])assert.throws(()=>validate({...valid,...patch}));
 assert.equal(validate(accounting()).attribution.form,undefined);
 assert.equal(validate(input()).attribution.form,undefined);
});
test('project inquiries can leave budget undecided without changing the accounting ads qualification',()=>{
 const p=validate({...accounting(),form_type:'project_us',project_slug:'construction-document-workflows',project_budget:'not_sure'});
 assert.match(p.challenge,/Project budget \(USD\): Not decided yet/);
 assert.ok(!p.challenge.includes('$5,000+ understood'));
 assert.throws(()=>validate({...accounting(),project_budget:'not_sure'}),/project_budget/);
});

test('Japanese inquiry owns its locale, market and canonical route',()=>{
 const p=validate({...accounting(),form_type:'project_jp',project_slug:'executive-search-intelligence-japan',language:'ja',project_budget:'not_sure',landing_page:'https://attacker.example/',market:'global'});
 assert.equal(p.language,'ja');assert.equal(p.market,'japan');assert.equal(p.revenue_currency,'USD');
 assert.equal(p.landing_page,'https://futureproofagents.com/ja/pages/executive-search-intelligence/');
 assert.deepEqual(p.attribution.form,{type:'project_jp',project_slug:'executive-search-intelligence-japan',icp:'executive_search',country:'JP',locale:'ja'});
 assert.equal(sheetValues({...row(),...p})[16],'ja');assert.equal(p.attribution.last.gclid,'test-click');
});
test('Japan cannot be misrouted through an English form or an unregistered project',()=>{
 const valid={...accounting(),form_type:'project_jp',project_slug:'executive-search-intelligence-japan',language:'ja'};
 for(const patch of [{language:'en'},{language:'he'},{language:'xx'},{project_slug:'executive-search-intelligence'},{project_slug:'__proto__'},{form_type:'project_us'},{form_type:'accounting_us'},{form_type:''},{consent:false}])assert.throws(()=>validate({...valid,...patch}));
});

const hire=()=>({...input(),form_type:'hire_pricing_test',selected_tier:'checkup',team_size:'1-10',phone:'+1 (202) 555-0123',challenge:'Route incoming requests to the correct team.'});
test('hire tiers own routing and defaults in both languages and retain sheet and attribution dimensions',async()=>{
 const {HIRE_TIERS,HIRE_TEAM_SIZES}=await import('../lib/campaign-leads.js');
 assert.deepEqual(HIRE_TIERS,{checkup:{he:"צ'ק-אפ",en:'Check-up'},first_agent:{he:'הסוכן הראשון',en:'First agent'},retainer:{he:'ליווי חודשי',en:'Monthly accompaniment'}});
 assert.deepEqual(HIRE_TEAM_SIZES,['1-10','11-50','51-200','201-1000','1000+']);
 for(const language of ['he','en'])for(const [selected_tier,label] of Object.entries(HIRE_TIERS))for(const team_size of HIRE_TEAM_SIZES){
  const body={...hire(),language,selected_tier,team_size,landing_page:'https://attacker.example/',revenue_band:'free',revenue_currency:'BAD',solutions:['invalid'],business_description:'x'.repeat(801),...(language==='he'?{market:'invalid'}:{}),attribution:{first:{utm_source:'newsletter',utm_campaign:'initial',page:'https://futureproofagents.com/?email=private@example.com'},last:{utm_source:'google',utm_content:selected_tier,page:'https://futureproofagents.com/hire/?utm_content='+selected_tier+'&email=private@example.com'}}};
  const before=JSON.stringify(body),p=validate(body);
  assert.equal(JSON.stringify(body),before);
  assert.equal(p.landing_page,`https://futureproofagents.com/${language==='he'?'he/':''}hire/`);
  assert.equal(p.revenue_band,'undisclosed');assert.equal(p.revenue_currency,language==='he'?'ILS':'USD');
  assert.deepEqual(p.solutions,['not_sure']);assert.equal(p.business_description,'Hire pricing test: '+label.en);
  assert.equal(p.market,language==='he'?'israel':'global');assert.equal(p.consent_version,'hire-2026-11-13');
  assert.deepEqual(p.attribution.form,{type:'hire_pricing_test',selected_tier});
  assert.equal(p.attribution.first.utm_source,'newsletter');assert.equal(p.attribution.last.utm_content,selected_tier);
  assert.equal(p.attribution.last.page,'https://futureproofagents.com/hire/');
  assert.ok(!JSON.stringify(p.attribution).includes('private@example.com'));
  assert.equal(p.challenge,`Plan of interest: ${label.en} (${selected_tier}). Team size: ${team_size}. Preferred language: ${language==='he'?'Hebrew':'English'}. Current AI use: Not provided. Workflow: ${body.challenge}`);
  const values=sheetValues({...row(),...p});assert.equal(values[13],p.challenge);assert.equal(values[25],p.landing_page);
 }
});

test('hire rejects invalid tier before other fields, but preserves honeypot handling',()=>{
 for(const selected_tier of ['enterprise','__proto__','constructor','',undefined,[],['checkup'],{},null])assert.throws(()=>validate({form_type:'hire_pricing_test',selected_tier}),{message:'selected_tier'});
 assert.deepEqual(validate({form_type:'hire_pricing_test',website_check:'bot'}),{spam:true});
});

test('hire field errors enforce qualification and shared safeguards',()=>{
 for(const [key,values] of Object.entries({
  language:['ja','xx','',undefined],team_size:['',undefined,'5_10',[],['1-10']],
  phone:['',undefined,1234567,'+------','1------','123456','1234567x','1'.repeat(31)],
  challenge:['',undefined,'short',' '.repeat(10),'x'.repeat(1001),{}],
  current_ai_usage:['x'.repeat(401),{},null],preferred_language:['ja','',null,[]],
  submission_id:['', '9ce3cbb2-aec2-1d25-a0d7-b4cd4cd5ac76'],full_name:[''],job_title:[''],company:[''],email:['bad'],consent:[false,'true']
 }))for(const value of values)assert.throws(()=>validate({...hire(),[key]:value}),{message:key});
 assert.throws(()=>validate({...hire(),market:'invalid'}),{message:'market'});
 assert.equal(validate({...hire(),market:undefined}).market,'');
});

test('hire accepts boundaries and preferred language without truncating workflow',()=>{
 for(const language of ['he','en']){
  const p=validate({...hire(),language,selected_tier:'retainer',team_size:'201-1000',phone:'1234567',challenge:'x'.repeat(1000),current_ai_usage:'y'.repeat(400),preferred_language:language==='he'?'en':'he'});
  assert.ok(p.challenge.length<=1600);
  assert.ok(p.challenge.endsWith('Workflow: '+'x'.repeat(1000)));
  assert.ok(p.challenge.includes('Current AI use: '+'y'.repeat(400)+'.'));
  assert.ok(p.challenge.includes('Preferred language: '+(language==='he'?'English':'Hebrew')+'.'));
 }
 assert.ok(validate({...hire(),challenge:'x'.repeat(10),current_ai_usage:''}).challenge.includes('Not provided'));
});

test('ordinary inquiries remain unchanged when hire-only fields are supplied',()=>{
 const base=validate(input());
 assert.deepEqual(validate({...input(),selected_tier:'enterprise',team_size:'bad',current_ai_usage:{},preferred_language:'ja',landing_page:'https://attacker.example/'}),base);
 assert.equal(base.attribution.form,undefined);
});
