import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
const require=createRequire(import.meta.url);
const {chromium}=require('C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const browser=await chromium.launch({channel:'chrome',headless:true});
try {
  const page=await browser.newPage();await page.goto('http://127.0.0.1:4192/?page=decoration');
  const report=await page.evaluate(async()=>{
    const {composeCabinPreview,CEILING_CODES,FLOOR_CODES,CABIN_PLANES}=await import('/assets/cabin-preview.mjs');
    const assetBase=new URL('/assets/',location.href).href;
    const pixels=async src=>{const img=new Image();img.src=src;await img.decode();const c=document.createElement('canvas');c.width=img.naturalWidth;c.height=img.naturalHeight;const ctx=c.getContext('2d',{willReadFrequently:true});ctx.drawImage(img,0,0);return ctx.getImageData(0,0,c.width,c.height);};
    const base=await pixels(new URL('decorations/sc-c-a.webp',assetBase).href);
    const inside=(x,y,quad)=>{let a=false,b=false;for(let i=0;i<4;i++){const p=quad[i],q=quad[(i+1)%4],v=(q[0]-p[0])*(y-p[1])-(q[1]-p[1])*(x-p[0]);if(v<0)a=true;if(v>0)b=true;}return !(a&&b);};
    const results=[];
    for(const [ceiling,floor] of [...CEILING_CODES.map(c=>[c,'none']),...FLOOR_CODES.map(f=>['none',f]),['CD-004','MG-03']]) {
      const start=performance.now();
      const result=await composeCabinPreview({cabinStyle:'SC-C-A',ceilingFinish:ceiling,floorFinish:floor},{assetBase});
      const output=await pixels(result.src);let outsideChanged=0,insideChanged=0;
      for(let y=0;y<base.height;y++)for(let x=0;x<base.width;x++) {
        const i=(y*base.width+x)*4;
        if(output.data[i]===base.data[i]&&output.data[i+1]===base.data[i+1]&&output.data[i+2]===base.data[i+2]&&output.data[i+3]===base.data[i+3])continue;
        const allowed=(ceiling!=='none'&&inside(x+.5,y+.5,CABIN_PLANES.ceiling))||(floor!=='none'&&inside(x+.5,y+.5,CABIN_PLANES.floor));
        if(allowed)insideChanged++;else outsideChanged++;
      }
      results.push({ceiling,floor,outsideChanged,insideChanged,ms:Math.round(performance.now()-start)});
    }
    const none=await composeCabinPreview({cabinStyle:'SC-C-A',ceilingFinish:'invalid',floorFinish:'../../other'},{assetBase});
    return {results,none:{applied:none.applied,src:none.src}};
  });
  for(const result of report.results) {assert.equal(result.outsideChanged,0,JSON.stringify(result));assert.ok(result.insideChanged>10000,JSON.stringify(result));}
  assert.equal(report.none.applied,false);
  await mkdir(new URL('../output/cabin-preview/',import.meta.url),{recursive:true});
  await writeFile(new URL('../output/cabin-preview/pixel-report.json',import.meta.url),JSON.stringify(report,null,2));
  console.log(JSON.stringify({cases:report.results.length,outsideChanged:0,maxMs:Math.max(...report.results.map(r=>r.ms)),invalidSelection:'original'}));
}finally{await browser.close();}
