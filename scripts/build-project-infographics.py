"""Reproduce the approved FutureProof workflow composition without external services."""
from pathlib import Path
import json, re, shutil
from html import escape

ROOT = Path(__file__).resolve().parents[1]
APPROVED = Path('/Users/Yuval/Documents/US-client-acquisition-2026-10-09/flowchart-cover-preview')
OUT = ROOT / 'public/images/projects'
DATA = json.loads((ROOT / 'src/data/project-infographics.json').read_text())
portrait = (APPROVED / 'construction-flow-hero-v1.svg').read_text()
wide = (APPROVED / 'construction-flow-cover-v1.svg').read_text()
base = DATA[0]

def swap(svg, before, after):
    old = '>'+escape(before, quote=False)+'<'
    assert old in svg, before
    return svg.replace(old, '>'+escape(after, quote=False)+'<')

def meta(svg, d):
    svg = re.sub(r'<title id="title">.*?</title>', '<title id="title">'+escape(d['industry']+': '+ ' '.join(d['headline']))+'</title>',svg)
    return re.sub(r'<desc id="desc">.*?</desc>', '<desc id="desc">'+escape(d['alt'])+'</desc>',svg)

wide_details = [
    ['Notes, photos, plans','Rooms and finishes'], ['Documents and period','Payroll requirements'],
    ['Plans and exhibits','Jurisdiction checklist'], ['Authorized CRM notes','Agreed follow-up date'],
    ['Consultation notes','Firm templates'], ['Business contact','Permitted call notes'],
    ['Original source order','Approved item mappings'], ['Customer and site','Approved prior scope'],
    ['Calendar and notes','Permitted source range']
]
outputs = [
    ['Room scope + reviewed price','Interior concepts + finish options','Allowances + next decisions'],
    ['Package readiness','Approved item request','Assigned exceptions'],
    ['Evidence and references','Reviewed open questions','Client-facing summary'],
    ['Account meeting brief','Reviewed follow-up','CRM next action'],
    ['Approved client request','Case checklist and tasks','Missing-item status'],
    ['Business lead and owner','Approved partner reply','Dated next action'],
    ['Approved order fields','Original PO linked','ERP result and sync status'],
    ['Approved renewal proposal','Reply and next action','Scheduling handoff'],
    ['Source-linked CRM update','Resolved or flagged contacts','Optional meeting brief']
]

for i,d in enumerate(DATA):
    slug=d['slug']
    if i == 0:
        # Preserve the user's exact approved construction compositions.
        for kind in ['cover','hero']:
            shutil.copyfile(APPROVED/f'construction-flow-{kind}-v1.svg',OUT/f'{slug}-flow-{kind}-v1.svg')
        continue
    s=meta(portrait,d)
    pairs=[(base['industry'].upper(),d['industry'].upper())]
    for key in ['headline','input','review','output']:
        pairs.extend(zip(base[key],d[key]))
    for a,b in zip(base['agents'],d['agents']): pairs.extend(zip(a,b))
    pairs.append((base['footer'],d['footer']))
    for a,b in pairs:s=swap(s,a,b)
    # Industry badge fits the longest label; retain all other approved geometry.
    s=s.replace('x="60" y="116" width="360"','x="60" y="116" width="440"')
    s=s.replace('04 / READY TO PRESENT','04 / THE BUSINESS OUTPUT')
    (OUT/f'{slug}-flow-hero-v1.svg').write_text(s)

    s=meta(wide,d)
    pairs=[(base['industry'].upper(),d['industry'].upper()),
           ('AI renovation quotes.',d['headline'][0]),('With the design built in.',d['headline'][1]),
           ('From site notes to one branded proposal your team has reviewed.','Inputs. Agent preparation. Your review. A clear business output.'),
           ('01  /  THE BRIEF','01  /  THE INPUT'),('04  /  READY TO PRESENT','04  /  THE OUTPUT'),
           ('Site visit &',d['inputShort'][0]),('client brief',d['inputShort'][1]),
           ('Notes, photos, plans',wide_details[i][0]),('Rooms and finishes',wide_details[i][1]),
           ('Estimator +',d['reviewShort'][0]),('designer',d['reviewShort'][1]),
           ('Before anything is sent.','Before the next action.'),
           ('Kitchen renovation','Reviewed output'),
           ('YOUR FIRM  /  CLIENT PROPOSAL','YOUR TEAM  /  APPROVED WORK'),
           ('One clear offer for the homeowner.','Your tools. Your team. Your decision.'),
           ('Built around your pricing, design process and CRM.',d['footer'])]
    for a,b in zip(base['agents'],d['agents']):
        for aa,bb in zip(a,b):
            if aa=='Base design + upgrades.':aa='Base design + upgrade options.'
            pairs.append((aa,bb))
    for a,b in zip(outputs[0],outputs[i]):pairs.append((a,b))
    for a,b in pairs:s=swap(s,a,b)
    # Sector-specific output replaces the construction-only room sketch.
    graphic='<g transform="translate(1228 488)"><rect width="259" height="104" rx="4" fill="#e0ebf1"/>'
    for y,txt in zip([38,76],d['outputShort']):
        graphic+=f'<text x="18" y="{y}" fill="#2b5a7a" font-size="24" font-weight="650">{escape(txt)}</text>'
    graphic+='</g>'
    s=re.sub(r'<g transform="translate\(1228 488\)".*?</g>',lambda _:graphic,s,flags=re.S)
    (OUT/f'{slug}-flow-cover-v1.svg').write_text(s)

print(f'Prepared {len(DATA)*2} editable SVG compositions; construction unchanged.')
