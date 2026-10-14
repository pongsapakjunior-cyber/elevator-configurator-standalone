import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
const require=createRequire(import.meta.url);
const {chromium}=require('C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const origin=process.env.MODEL_QA_ORIGIN||'http://127.0.0.1:4179';
const output=new URL('../../output/configurator-model/',import.meta.url);await mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true});const errors=[],results=[];
const fixtures=[{name:'mr',elevatorType:'mr',carW:1800,carD:1500,shaftW:2500,shaftD:2100,doorW:1100,entrances:1,roping:1},{name:'mrl',elevatorType:'mrl',carW:1100,carD:1400,shaftW:1800,shaftD:1900,doorW:800,entrances:1,roping:2},{name:'through',elevatorType:'mr',carW:1400,carD:1600,shaftW:2050,shaftD:2150,doorW:900,entrances:2,roping:2},{name:'side',elevatorType:'mrl',carW:1100,carD:850,shaftW:1850,shaftD:1700,doorW:800,doorType:'side',doorPanels:2,entrances:2,roping:1}];
fixtures.push({name:'four-panel',elevatorType:'mrl',carW:1800,carD:1500,shaftW:2500,shaftD:2100,doorW:1200,doorPanels:4,entrances:2,roping:2},{name:'40-stops',elevatorType:'mr',carW:1800,carD:1500,shaftW:2500,shaftD:2100,doorW:1100,entrances:1,roping:1,floors:40});
try{
for(const fixture of fixtures){
  const page=await browser.newPage({viewport:{width:1440,height:1000},deviceScaleFactor:1});
  page.on('pageerror',e=>errors.push({fixture:fixture.name,message:e.message}));
  const payload={...fixture,capacity:630,speed:1,carH:2300,doorH:2100,doorType:fixture.doorType||'center',doorPanels:fixture.doorPanels||2,overhead:4300,pit:1500,floors:fixture.floors||3,floorHeights:Array((fixture.floors||3)-1).fill(3400),floorHeightMode:'individual',floorDimensionDisplay:'show',project:'Model review · '+fixture.name};delete payload.name;
  const code=Buffer.from(JSON.stringify(payload)).toString('base64url');
  await page.goto(origin+'/?c='+code+'&panel=0');await page.waitForFunction(()=>document.querySelector('three-d-stage')?._object?.userData.modelDetails,{timeout:45000});
  if(await page.locator('#playView').getAttribute('aria-pressed')==='true')await page.locator('#playView').click();
  const before=await page.locator('#spec').innerText(),url=page.url();
  if(await page.locator('.model-reference').count())throw Error('Installation reference must be removed');
  const fenceCount=await page.evaluate(()=>{let n=0;document.querySelector('three-d-stage')._object.traverse(o=>{if(o.name.startsWith('cwt_screen_'))n++});return n;});
  if(fenceCount)throw Error('Pit fence geometry remains');
  if(await page.locator('[data-go-floor]').count()!==payload.floors)throw Error('Floor buttons do not match configured stops');
  const initialWalls=await page.evaluate(()=>{const stage=document.querySelector('three-d-stage'),walls=[];stage._object.traverseVisible(o=>{if(/^(wall_|front_wall_|rear_wall_)/.test(o.name))walls.push(o)});return {mode:document.querySelector('.model-walls').dataset.wallMode,count:walls.length,transparent:walls.some(o=>o.material.transparent),right:walls.some(o=>o.name==='wall_right'),shadows:stage._renderer.shadowMap.enabled||walls.some(o=>o.castShadow||o.receiveShadow)};});
  if(initialWalls.mode!=='dark'||!initialWalls.count||initialWalls.transparent||initialWalls.right||initialWalls.shadows)throw Error('Dark open-side shaft mode is invalid: '+JSON.stringify(initialWalls));
  await page.locator('.model-walls').click();
  const tintedWalls=await page.evaluate(()=>{const walls=[];document.querySelector('three-d-stage')._object.traverseVisible(o=>{if(/^(wall_|front_wall_|rear_wall_)/.test(o.name))walls.push(o)});return {mode:document.querySelector('.model-walls').dataset.wallMode,count:walls.length,transparent:walls.length>0&&walls.every(o=>o.material.transparent&&o.material.opacity<1)};});
  if(tintedWalls.mode!=='tinted'||!tintedWalls.count||!tintedWalls.transparent)throw Error('Tinted-glass shaft mode is invalid: '+JSON.stringify(tintedWalls));
  await page.locator('.model-walls').click();
  const offWalls=await page.evaluate(()=>{let n=0;document.querySelector('three-d-stage')._object.traverseVisible(o=>{if(/^(wall_|front_wall_|rear_wall_)/.test(o.name))n++});return {mode:document.querySelector('.model-walls').dataset.wallMode,count:n};});
  if(offWalls.mode!=='off'||offWalls.count)throw Error('Walls-off shaft mode is invalid: '+JSON.stringify(offWalls));
  await page.locator('.model-walls').click();
  if(before!==await page.locator('#spec').innerText()||url!==page.url())throw Error('Shaft walls changed specifications or URL');
  const offeredModes=await page.locator('[data-model-view]').evaluateAll(buttons=>buttons.map(button=>button.dataset.modelView));
  if(JSON.stringify(offeredModes)!==JSON.stringify(['system','cabin','plan']))throw Error('Unexpected model views: '+JSON.stringify(offeredModes));
  const modes=fixture.name==='40-stops'?['system']:['system','plan','cabin'];
  for(const mode of modes){
    await page.locator('[data-model-view="'+mode+'"]').click();
    await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    const info=await page.evaluate(()=>{const st=document.querySelector('three-d-stage'),m=st._object;let visible=0,shadowMeshes=0;m.traverseVisible(o=>{if(o.isMesh){visible++;if(o.castShadow||o.receiveShadow)shadowMeshes++}});return {mode:m.userData.presentationView,visible,layout:m.userData.rig.layout,drawCalls:st._renderer.info.render.calls,triangles:st._renderer.info.render.triangles,params:m.userData.rig.params,shadowMap:st._renderer.shadowMap.enabled,shadowMeshes,overflow:document.documentElement.scrollWidth>innerWidth+1};});
    if(info.visible<2||info.overflow||info.shadowMap||info.shadowMeshes)throw Error('Invalid model view: '+JSON.stringify(info));
    if(before!==await page.locator('#spec').innerText()||url!==page.url())throw Error('View controls changed specifications or URL');
    results.push({fixture:fixture.name,...info});
    await page.screenshot({path:new URL(fixture.name+'-'+mode+'.png',output).pathname.replace(/^\/([A-Za-z]:)/,'$1')});
  }
  if(fixture.name==='mrl'){
    for(const width of [320,390,768]){
      await page.setViewportSize({width,height:844});await page.locator('[data-model-view="system"]').click();await page.evaluate(()=>new Promise(resolve=>setTimeout(resolve,200)));
      await page.screenshot({path:new URL('mrl-mobile-'+width+'.png',output).pathname.replace(/^\/([A-Za-z]:)/,'$1'),fullPage:true});
      const mobile=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth+1,buttons:[...document.querySelectorAll('.model-tools button,.toggle.customer button,.model-journey button')].map(el=>{const r=el.getBoundingClientRect();return {label:el.textContent,left:r.left,right:r.right,top:r.top,bottom:r.bottom,clickable:el.contains(document.elementFromPoint((r.left+r.right)/2,(r.top+r.bottom)/2))};})}));if(mobile.overflow||mobile.buttons.some(b=>b.left<0||b.right>width||b.bottom>844||!b.clickable))throw Error('Mobile model controls overflow or are covered');results.push({fixture:'mrl-mobile-'+width,...mobile});
    }
  }
  if(fixture.name==='mr'){
    // Exercise an ordinary user edit while the orthographic Plan camera is active.
    // This changes a disposable synthetic fixture, never a saved customer project.
    await page.locator('[data-model-view="plan"]').click();
    await page.evaluate(()=>{const input=document.querySelector('#carW');input.value='1750';input.dispatchEvent(new Event('input',{bubbles:true}));});
    await page.waitForFunction(()=>document.querySelector('three-d-stage')._object.userData.rig.params.carW===1750);
    const rebuilt=await page.evaluate(()=>{const s=document.querySelector('three-d-stage');return {mode:s._object.userData.presentationView,orthographic:s._camera.isOrthographicCamera,finite:s._camera.projectionMatrix.elements.every(Number.isFinite),carW:s._object.userData.rig.params.carW};});
    if(rebuilt.mode!=='plan'||!rebuilt.orthographic||!rebuilt.finite)throw Error('Plan rebuild broke the camera');
    results.push({fixture:'plan-rebuild',...rebuilt});
    await page.locator('#playView').click();
    const resumed=await page.evaluate(()=>{const s=document.querySelector('three-d-stage');return {mode:s._object.userData.presentationView,perspective:s._camera.isPerspectiveCamera,running:document.querySelector('#playView').getAttribute('aria-pressed')};});
    if(resumed.mode!=='system'||!resumed.perspective||resumed.running!=='true')throw Error('Play failed to resume Assembly view');
    results.push({fixture:'play-resume',...resumed});
    await page.locator('#playView').click();
  }
  await page.close();
}
}finally{await browser.close();await writeFile(new URL('results.json',output),JSON.stringify({results,errors},null,2));}
console.log(JSON.stringify({views:results.length,errors,output:output.href},null,2));if(errors.length)process.exitCode=1;
