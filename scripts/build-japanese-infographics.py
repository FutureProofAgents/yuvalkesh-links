from pathlib import Path
import json,base64,re,html
from fontTools import subset
from fontTools.ttLib import TTFont
r=Path(__file__).resolve().parents[1];delivery=Path('/Users/Yuval/Documents/US-client-acquisition-2026-10-09/japan-executive-search/site-delivery');out=r/'public/images/projects';fontdir=r/'public/fonts/noto-sans-jp';fontdir.mkdir(parents=True,exist_ok=True)
hero={
'EXECUTIVE SEARCH':'人材紹介・エグゼクティブサーチ',
'AI client meeting briefs.':'AIで顧客商談を準備。', 'Follow up with context.':'フォローを、次の一歩へ。',
'01 / THE BRIEF':'01 / もとになる情報','Account history + agreed commitments':'顧客とのやり取り・約束事項','Authorized CRM records, notes and follow-up dates.':'CRM・メール・確認済みの商談メモ。',
'02 / AGENTS PREPARE YOUR DRAFT':'02 / AIが資料と文面を準備',
'Relationship brief':'商談の事前資料','Gather relevant history.':'過去の案件・会話を整理','Show sources and dates.':'出典と日付を添える',
'Next-action draft':'フォロー文面','Surface the agreed check-in.':'合意した連絡日を確認','Prepare a relevant message.':'次の質問と文面を下書き',
'03 / YOUR TEAM REVIEWS':'03 / 担当者が判断','Relationship partner review':'顧客担当者が確認・承認','The account owner checks context and decides on contact.':'情報の鮮度、連絡の必要性、宛先と文面を確認。',
'04 / THE BUSINESS OUTPUT':'04 / 次の行動へ','A prepared call. An owned next step.':'商談の準備と、次の行動を明確に。','Record the actual outcome in your existing CRM.':'承認後に対応し、実際の結果をCRMへ記録。',
'Relationship context. Partner judgment. Reviewed contact.':'貴社の情報。担当者の判断。承認された連絡。','ILLUSTRATIVE WORKFLOW':'導入を想定したフロー例'}
cover={
'EXECUTIVE SEARCH':hero['EXECUTIVE SEARCH'],'AI client meeting briefs.':hero['AI client meeting briefs.'],'Follow up with context.':hero['Follow up with context.'],
'Inputs. Agent preparation. Your review. A clear business output.':'過去のやり取りから、次の商談と顧客フォローへ。',
'01  /  THE INPUT':'01 / 顧客の経緯','02  /  AGENTS PREPARE':'02 / AIが準備','03  /  YOUR REVIEW':'03 / 担当者の承認','04  /  THE OUTPUT':'04 / 次の行動',
'Client history +':'過去の会話と','commitments':'約束事項','Authorized CRM notes':'CRM・メール・メモ','Agreed follow-up date':'合意した連絡日',
'Relationship brief':'商談の事前資料','Gather relevant history.':'過去の案件・会話を整理','Show sources and dates.':'出典と日付を添える',
'Next-action draft':'フォロー文面','Surface the agreed check-in.':'合意した連絡日を確認','Prepare a relevant message.':'次の質問と文面を下書き',
'Relationship':'顧客担当者が','partner':'確認・承認','Check. Revise. Approve.':'確認・修正・承認','Before the next action.':'実行する前に確認。',
'YOUR TEAM  /  APPROVED WORK':'貴社の業務 / 承認後に対応','Reviewed output':'次の会話へ','Prepared call +':'商談準備と','next action':'次のアクション',
'Account meeting brief':'出典付きの顧客事前資料','Reviewed follow-up':'確認済みのフォロー文面','CRM next action':'CRMに担当・期限を記録',
'Your tools. Your team. Your decision.':'判断は、貴社の担当者に。',
'Relationship context. Partner judgment. Reviewed contact.':hero['Relationship context. Partner judgment. Reviewed contact.'],'ILLUSTRATIVE WORKFLOW':'導入を想定したフロー例'}
text=''.join(hero.values())+''.join(cover.values())
for p in [r/'src/data/japan-executive-search.json',r/'src/components/JapaneseProjectLandingPage.astro',r/'src/components/JapaneseProjectInquiryForm.astro',r/'src/scripts/campaign-form.ts',r/'public/scripts/analytics.js']:
 text+=p.read_text()
font=TTFont(delivery/'NotoSansJP[wght].ttf');opts=subset.Options();opts.name_IDs=['*'];opts.name_languages=['*'];ss=subset.Subsetter(options=opts);ss.populate(text=text);ss.subset(font);font.flavor='woff';fp=fontdir/'futureproof-japanese-v1.woff';font.save(fp)
license=(delivery/'OFL.txt').read_text();(fontdir/'OFL.txt').write_text(license)
fontdata=base64.b64encode(fp.read_bytes()).decode();fontcss=f"@font-face{{font-family:'FP Noto Sans JP';src:url(data:font/woff;base64,{fontdata}) format('woff');font-weight:100 900}}text{{font-family:Inter,'FP Noto Sans JP',sans-serif}}"
alt=json.loads((r/'src/data/japan-executive-search.json').read_text())['image']['alt']
for kind,mapping in [('cover',cover),('hero',hero)]:
 s=(out/f'executive-search-intelligence-flow-{kind}-v1.svg').read_text()
 for en,ja in mapping.items():
  a='>'+html.escape(en,quote=False)+'<';assert a in s,(kind,en);s=s.replace(a,'>'+html.escape(ja,quote=False)+'<')
 s=s.replace('</style>',fontcss+'</style>',1);s=re.sub(r'<title id="title">.*?</title>','<title id="title">人材紹介会社の顧客商談・フォロー支援 | FutureProof Agents</title>',s);s=re.sub(r'<desc id="desc">.*?</desc>','<desc id="desc">'+alt+'</desc>',s)
 s=s.replace('<defs>','<metadata>'+html.escape('Japanese font: Noto Sans JP; '+license)+'</metadata><defs>',1)
 # Reset widths inherited from longer English copy before Japanese-specific fitting.
 s=s.replace('letter-spacing="-2.6"','letter-spacing="-1"')
 (out/f'executive-search-intelligence-ja-flow-{kind}-v1.svg').write_text(s)
print(json.dumps({'font_bytes':fp.stat().st_size,'svg_files':2}))
