// Render locally; no image-generation service and no network required.
import { chromium } from '/Users/Yuval/Dev/tools/midjourney-playwright/node_modules/playwright/index.mjs';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
const root=path.resolve(import.meta.dirname,'..');
const out=path.join(root,'public/images/projects');
const data=JSON.parse(await fs.readFile(path.join(root,'src/data/project-infographics.json'),'utf8'));
const browser=await chromium.launch({headless:true,channel:'chrome'});
const manifest=[];
try{
 for(const d of data){
  for(const kind of ['cover','hero']){
   const width=kind==='cover'?1600:1000, height=kind==='cover'?900:1250;
   const basename=`${d.slug}-flow-${kind}-v1`;
   const file=path.join(out,basename+'.svg');
   const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:1});
   await page.goto('file://'+file); await page.evaluate(()=>document.fonts.ready);
   // Fit replacement copy inside the approved containers, never across a card edge.
   const result=await page.evaluate(({kind,construction})=>{
    const fits=[];
    for(const t of document.querySelectorAll('text')){
     if(t.parentElement?.tagName==='text')continue;
     const x=Number(t.getAttribute('x')), y=Number(t.getAttribute('y'));
     let max;
     if(kind==='hero'){
      if(x===60&&y<300)max=880;
      if(x===98)max=390;
      if(x===86)max=(y===938||y===1143)?725:735;
      if(x===107)max=352;
      if(x===528)max=365;
      if(x===60&&y>1200)max=665;
     }else{
      if(x===1190)max=316;
      if(x===70&&y<300)max=1460;
      if(x===98)max=194;
      if(x===475)max=327;
      if(x===932)max=194;
      if(x===1228)max=263;
      if(x===1207&&y===758)max=310;
      if(x===96)max=1110;
      if(x===18)max=223;
     }
     if(!construction&&max&&t.getBBox().width>max){
      const before=Number(t.getAttribute('font-size'));
      const size=Math.floor(before*max/t.getBBox().width*10)/10;
      t.setAttribute('font-size',size);fits.push({text:t.textContent,before,size});
     }
    }
    const w=Number(document.documentElement.getAttribute('width')),h=Number(document.documentElement.getAttribute('height'));
    const overflow=[...document.querySelectorAll('text')].filter(t=>{const b=t.getBBox();return b.x<0||b.x+b.width>w||b.y<0||b.y+b.height>h;}).map(t=>t.textContent);
    return {fits,overflow,svg:document.documentElement.outerHTML};
   },{kind,construction:d.icp==='construction'});
   if(result.overflow.length)throw new Error(JSON.stringify({basename,overflow:result.overflow}));
   // Save only adjusted variants. Approved construction remains byte-for-byte intact.
   if(d.icp!=='construction')await fs.writeFile(file,result.svg);
   await page.locator('svg').screenshot({path:path.join(out,basename+'.png')});
   if(d.icp==='construction'){
    await fs.copyFile(`/Users/Yuval/Documents/US-client-acquisition-2026-10-09/flowchart-cover-preview/construction-flow-${kind}-v1.png`,path.join(out,basename+'.png'));
   }else{
    execFileSync('python3',['-c',"from PIL import Image; import sys; p=sys.argv[1]; im=Image.open(p).convert('RGB'); im.quantize(colors=256,method=Image.Quantize.MEDIANCUT,dither=Image.Dither.NONE).save(p,optimize=True,compress_level=9)",path.join(out,basename+'.png')]);
   }
   const png=await fs.readFile(path.join(out,basename+'.png'));
   manifest.push({icp:d.icp,slug:d.slug,kind,width,height,url:`https://futureproofagents.com/images/projects/${basename}.png`,alt:d.alt,sha256:crypto.createHash('sha256').update(png).digest('hex'),bytes:png.length,textFits:result.fits,overflow:result.overflow});
   await page.close();
  }
 }
}finally{await browser.close();}
await fs.writeFile(path.join(root,'src/data/project-infographic-assets.json'),JSON.stringify(manifest,null,2)+'\n');
console.log(JSON.stringify({assets:manifest.length,totalBytes:manifest.reduce((a,x)=>a+x.bytes,0),textOverflow:0}));
