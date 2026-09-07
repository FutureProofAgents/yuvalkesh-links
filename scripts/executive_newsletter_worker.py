"""Owner-reviewed executive newsletter. CLI auth is managed by Composio.
No secrets, recipient bodies or confirmation URLs are printed by this worker.
Run on the agent host, never in the public browser.
"""
import fcntl,json,subprocess,tempfile,sys,time,uuid
from pathlib import Path
from urllib.request import Request,urlopen
from urllib.parse import urlencode
BASE='appSZz4NuPjcVEvQ1'
TABLE='tblW8r4jXEMTm5LBD'
OWNER_EMAIL='y@uxwritinghub.com'
VERIFICATION_LIST=44
EXECUTIVE_LIST=45
FORM=20

def tool(slug,data):
    p=subprocess.run(['composio','execute',slug,'-d','-'],input=json.dumps(data),text=True,capture_output=True,timeout=50)
    try:r=json.loads(p.stdout)
    except Exception:raise RuntimeError(slug+' returned invalid response')
    if r.get('storedInFile'):r=json.loads(Path(r['outputFilePath']).read_text())
    if r.get('successful') is False:raise RuntimeError(slug+' failed')
    d=r.get('data',r)
    return d.get('data',d) if isinstance(d,dict) else d

def get_record(rid):
    d=tool('AIRTABLE_GET_RECORD',{'baseId':BASE,'tableIdOrName':TABLE,'recordId':rid})
    return d.get('record',d)

def update(rid,fields):
    return tool('AIRTABLE_UPDATE_RECORD',{'baseId':BASE,'tableIdOrName':TABLE,'recordId':rid,'fields':fields})

def list_records():
    out=[];offset=None
    while True:
        args={'baseId':BASE,'tableIdOrName':TABLE,'filterByFormula':"{Source}='futureproof-executive-application'",'pageSize':100}
        if offset:args['offset']=offset
        d=tool('AIRTABLE_LIST_RECORDS',args);out.extend(d.get('records',[]));offset=d.get('offset')
        if not offset:return out

def notify(record):
    f=record['fields'];rid=record['id']
    body=('בקשת הצטרפות לניוזלטר האקזקיוטיבז של FutureProof Agents\n\n'
          f"שם: {f.get('Full Name','')}\nמייל: {f['Email']}\nתפקיד: {f.get('Job Title','')}\nחברה: {f.get('Organization','')}\nשפה מועדפת: {f.get('Preferred Language','לא צוינה')}\n\n"
          'הבקשה ממתינה לבדיקה שלך. אין צירוף אוטומטי לדיוור.\n'
          f'לפתיחת הבקשה בחשבון Airtable שלך:\nhttps://airtable.com/{BASE}/{TABLE}/{rid}\n\n'
          'לאישור: סמן את Executive Approved.\nלדחייה: שנה את Review Status ל-rejected והשאר את האישור לא מסומן.\n'
          'האישור יטופל בתוך כ-5 דקות. לאחר מכן יישלח לנרשם מייל לאימות הכתובת; רק אחרי שני האישורים יצורף לרשימת הדיוור.\n'
          'אין צורך להשיב למייל הזה; ההחלטה נשמרת ברשומת הבקשה.')
    tool('GMAIL_SEND_EMAIL',{'recipient_email':OWNER_EMAIL,'subject':'בקשת הצטרפות לאישור — FutureProof Executives','body':body,'is_html':False})
    update(rid,{'Notification Status':'sent'})

def request_confirmation(email):
    fields={'u':str(FORM),'f':str(FORM),'s':'','c':'0','m':'0','act':'sub','v':'2','email':email}
    boundary='----FutureProof'+uuid.uuid4().hex
    body=''.join(f'--{boundary}\r\nContent-Disposition: form-data; name="{key}"\r\n\r\n{value}\r\n' for key,value in fields.items())+f'--{boundary}--\r\n'
    req=Request('https://uxwritinghub.activehosted.com/proc.php?jsonp=true',data=body.encode(),headers={'Accept':'application/json','Content-Type':'multipart/form-data; boundary='+boundary},method='POST')
    with urlopen(req,timeout=25) as r:d=json.load(r)
    js=d.get('js','')
    import re
    if not re.search(r'_show_thank_you\(\s*[\'"]20[\'"]',js) or '_show_error(' in js:raise RuntimeError('Native verification form rejected request')

def contact_for(email):
    d=tool('ACTIVE_CAMPAIGN_FIND_CONTACT',{'email':email})
    if not d.get('found'):return None
    if d.get('email','').lower()!=email.lower():raise RuntimeError('Contact email mismatch')
    cid=d.get('contact_id',d.get('id'))
    if not cid:raise RuntimeError('Contact match did not include ID')
    return int(cid)

def memberships(cid):
    d=tool('ACTIVE_CAMPAIGN_GET_CONTACT_LISTS',{'contact_id':cid})
    rows=d.get('contactLists',d.get('contact_lists',[]))
    return {int(x['list']):int(x['status']) for x in rows}

def process(record):
    rid=record['id'];f=record['fields'];state=f.get('Review Status','')
    # Notification is queued independently of the review decision, once per application.
    if f.get('Notification Status')=='pending':notify(record)
    # Always re-read owner decision rather than trusting the initial scan.
    f=get_record(rid)['fields'];approved=f.get('Executive Approved') is True;state=f.get('Review Status','')
    if state=='pending_review' and approved:
        update(rid,{'Review Status':'requesting_confirmation'})
        try:request_confirmation(f['Email'])
        except Exception:
            # Ambiguous network failures never activate; require manual retry/review.
            update(rid,{'Review Status':'confirmation_error'});raise
        update(rid,{'Review Status':'pending_confirmation'})
        return 'confirmation_requested'
    if state=='pending_confirmation' and approved:
        cid=contact_for(f['Email'])
        if not cid:return 'waiting'
        states=memberships(cid)
        if states.get(EXECUTIVE_LIST)==2:
            update(rid,{'Review Status':'unsubscribed'});return 'unsubscribed'
        if states.get(VERIFICATION_LIST)!=1:return 'waiting'
        fresh=get_record(rid)['fields']
        if fresh.get('Executive Approved') is not True or fresh.get('Review Status')!='pending_confirmation':return 'waiting'
        tool('ACTIVE_CAMPAIGN_ADD_CONTACT_TO_LIST',{'contact':cid,'list':EXECUTIVE_LIST,'status':1})
        update(rid,{'Review Status':'executive_active','ActiveCampaign Contact ID':str(cid)})
        return 'activated'
    if state=='executive_active' and not approved:
        cid=f.get('ActiveCampaign Contact ID')
        if not cid:raise RuntimeError('Cannot revoke missing contact ID')
        tool('ACTIVE_CAMPAIGN_ADD_CONTACT_TO_LIST',{'contact':int(cid),'list':EXECUTIVE_LIST,'status':2})
        update(rid,{'Review Status':'approval_revoked'});return 'revoked'
    return 'waiting'

def main():
    lock=open(Path(tempfile.gettempdir())/'futureproof-executive-worker.lock','w')
    try:fcntl.flock(lock,fcntl.LOCK_EX|fcntl.LOCK_NB)
    except BlockingIOError:print(json.dumps({'busy':True}));return
    records=list_records();todo=[r for r in records if r['fields'].get('Notification Status')=='pending' or (r['fields'].get('Review Status') in ['pending_review','pending_confirmation'] and r['fields'].get('Executive Approved') is True) or (r['fields'].get('Review Status')=='executive_active' and r['fields'].get('Executive Approved') is not True)]
    # New alerts/decisions take priority; rotate waiting confirmations to avoid starvation.
    urgent=[r for r in todo if r['fields'].get('Notification Status')=='pending' or r['fields'].get('Review Status')!='pending_confirmation']
    waiting=[r for r in todo if r not in urgent]
    if waiting:
        pivot=int(time.time()//300)%len(waiting);waiting=waiting[pivot:]+waiting[:pivot]
    todo=urgent+waiting
    summary={'candidates':len(todo),'processed':0,'errors':0}
    for record in todo[:8]:
        try:
            result=process(record);summary[result]=summary.get(result,0)+1;summary['processed']+=1
        except Exception as e:
            summary['errors']+=1
            print('Worker operation failed: '+type(e).__name__,file=sys.stderr)
    print(json.dumps(summary))
    if summary['errors']:sys.exit(1)
if __name__=='__main__':main()
