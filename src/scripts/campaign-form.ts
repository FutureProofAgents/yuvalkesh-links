const form=document.querySelector<HTMLFormElement>('#lead-form')!;
const he=form.dataset.language==='he',t=(en:string,heb:string)=>he?heb:en;
const steps=[...form.querySelectorAll<HTMLFieldSetElement>('[data-step]')];
const error=form.querySelector<HTMLElement>('#form-error')!,next=form.querySelector<HTMLButtonElement>('[data-next]')!,back=form.querySelector<HTMLButtonElement>('[data-back]')!,submit=form.querySelector<HTMLButtonElement>('[data-submit]')!;
let step=0,busy=false,started=false,submissionId=crypto.randomUUID();
const params=new URLSearchParams(location.search),keys=['utm_source','utm_medium','utm_campaign','utm_content','utm_term','campaign_id','ad_group_id','ad_id','ad_account_id','oppref','click_id','gclid','fbclid'];
const safePage=(url:string)=>{try{const u=new URL(url);return u.origin+u.pathname;}catch{return '';}};
const current:Record<string,string>={page:safePage(location.href),referrer:safePage(document.referrer)};
keys.forEach(k=>{current[k]=(params.get(k)||'').slice(0,300);});
let attribution:{first:Record<string,string>,last:Record<string,string>}={first:current,last:current};
try{
 const saved=JSON.parse(sessionStorage.getItem('fp-campaign-attribution-v1')||'null');
 const externalRef=current.referrer&&!['https://futureproofagents.com','https://www.futureproofagents.com',location.origin].some(origin=>current.referrer.startsWith(origin+'/'));
 if(saved?.first&&saved?.last)attribution={first:saved.first,last:keys.some(k=>current[k])||externalRef?current:saved.last};
 sessionStorage.setItem('fp-campaign-attribution-v1',JSON.stringify(attribution));
}catch{/* Form remains usable when storage is blocked. */}
document.querySelectorAll<HTMLAnchorElement>('a[data-language]').forEach(a=>{const u=new URL(a.href);keys.forEach(k=>{if(params.get(k))u.searchParams.set(k,params.get(k)!);});a.href=u.href;});
const analytics=(event:string)=>(window as any).fpAnalytics?.(event);
form.addEventListener('input',()=>{if(!started){analytics('lead_form_start');started=true;}},{once:true});
function showStep(index:number,focus=true){step=index;steps.forEach((s,i)=>{s.hidden=i!==index;});form.querySelectorAll('[data-progress]').forEach((el,i)=>i===index?el.setAttribute('aria-current','step'):el.removeAttribute('aria-current'));back.hidden=index===0;next.hidden=index===2;submit.hidden=index!==2;form.querySelector('[data-step-count]')!.textContent=t(`Step ${index+1} of 3`,`שלב ${index+1} מתוך 3`);error.textContent='';if(focus){steps[index].querySelector<HTMLElement>('input,select,textarea')?.focus();}}
function validStep(index:number){
 if(index===1&&!form.querySelector('input[name=solutions]:checked')){error.textContent=t('Please choose at least one area where we can help.','בחרו לפחות תחום אחד שבו נוכל לעזור.');form.querySelector<HTMLInputElement>('input[name=solutions]')?.focus();return false;}
 for(const el of steps[index].querySelectorAll<HTMLInputElement>('input,textarea,select')){if(!el.checkValidity()){el.reportValidity();return false;}}
 if(index===2){const value=(form.elements.namedItem('linkedin_url') as HTMLInputElement).value.trim();if(value){try{const u=new URL(value);if(u.protocol!=='https:'||!/(^|\.)linkedin\.com$/.test(u.hostname))throw Error();}catch{error.textContent=t('Please use an HTTPS LinkedIn profile link, or leave it blank.','יש להזין קישור HTTPS לפרופיל LinkedIn, או להשאיר ריק.');return false;}}}
 return true;
}
next.addEventListener('click',()=>{if(validStep(step)){showStep(step+1);analytics('lead_form_step');}});
back.addEventListener('click',()=>{if(!busy)showStep(step-1);});
form.addEventListener('submit',async e=>{
 e.preventDefault();if(busy)return;if(step<2){next.click();return;}
 for(let i=0;i<3;i++){if(i!==step){const fields=steps[i].querySelectorAll<HTMLInputElement>('[required]');if([...fields].some(el=>!el.checkValidity())){showStep(i);validStep(i);return;}}if(i===1&&!form.querySelector('input[name=solutions]:checked')){showStep(1);validStep(1);return;}}
 if(!validStep(2))return;
 const fd=new FormData(form),payload:any=Object.fromEntries(fd.entries());payload.solutions=fd.getAll('solutions');payload.consent=fd.get('consent')==='on';payload.language=he?'he':'en';payload.submission_id=submissionId;payload.attribution=attribution;
 busy=true;submit.disabled=true;back.disabled=true;const label=submit.textContent;submit.textContent=t('Sending…','שולחים…');error.textContent='';
 try{
  const response=await fetch('https://yuvalkesh-links.vercel.app/api/lead',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),signal:AbortSignal.timeout(65000)});
  const result=await response.json();if(!response.ok||!result.ok)throw Error(response.status===429?'rate_limit':'save_failed');
  form.hidden=true;const success=document.querySelector<HTMLElement>('#form-success')!;success.hidden=false;success.focus();analytics('generate_lead');submissionId=crypto.randomUUID();
 }catch(e){error.textContent=(e as Error).message==='rate_limit'?t('We have received several requests. Please try again later or book a call.','התקבלו מספר פניות. נסו שוב מאוחר יותר או קבעו שיחה.'):t('We could not confirm your submission. Your details are still here. Please try again.','לא הצלחנו לאשר שהפנייה נקלטה. הפרטים נשמרו בטופס. נסו שוב.');analytics('lead_form_error');error.focus();}
 finally{busy=false;submit.disabled=false;back.disabled=false;submit.textContent=label;}
});
