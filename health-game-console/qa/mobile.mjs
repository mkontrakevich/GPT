import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium,webkit} from 'playwright';
import {buildWorker} from '../tools/build-worker.mjs';
const {default:worker}=await import('data:text/javascript;base64,'+Buffer.from(buildWorker()).toString('base64'));
const server=createServer(async(req,res)=>{const r=await worker.fetch(new Request('http://127.0.0.1:8797'+req.url,{method:req.method}));res.writeHead(r.status,Object.fromEntries(r.headers));res.end(Buffer.from(await r.arrayBuffer()))});
await new Promise(r=>server.listen(8797,'127.0.0.1',r));const evidence=[];
await mkdir('health-game-console/qa/artifacts',{recursive:true});
try{
for(const [name,type] of [['chromium',chromium],['webkit',webkit]]){
 const browser=await type.launch({headless:true,...(name==='chromium'?{args:['--use-angle=swiftshader','--enable-webgl','--ignore-gpu-blocklist']}:{} )});
 try{for(const [width,height] of [[320,740],[390,844],[430,932],[600,900],[768,1024],[844,390],[1024,768],[1366,900],[1440,900],[1920,1080]]){
 const page=await browser.newPage({viewport:{width,height},hasTouch:width<900});
 const errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await page.goto('http://127.0.0.1:8797/',{waitUntil:'networkidle'});
 await page.waitForFunction(()=>document.querySelector('#render').textContent==='WEBGL / THREE.JS');
 const metrics=await page.evaluate(()=>{const rect=s=>{const r=document.querySelector(s).getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,bottom:r.bottom,right:r.right}};return{width:innerWidth,scrollWidth:document.documentElement.scrollWidth,nav:rect('nav'),scene:rect('#scene'),header:rect('header'),buttons:[...document.querySelectorAll('[data-part]')].map(b=>{const r=b.getBoundingClientRect();return{label:b.getAttribute('aria-label'),y:r.y,width:r.width,height:r.height}}),render:document.querySelector('#render').textContent}});
 assert.ok(metrics.scrollWidth<=width+1,'page overflow');assert.equal(metrics.buttons.length,7);
 const island=await page.evaluate(()=>({style:__HEALTH_ISLAND_QA.style,loaded:__HEALTH_ISLAND_QA.loaded,meshCount:__HEALTH_ISLAND_QA.meshCount,drawCalls:__HEALTH_ISLAND_QA.drawCalls,errors:__HEALTH_ISLAND_QA.errors,palette:__HEALTH_ISLAND_QA.palette}));
 assert.equal(island.style,'human-os-floating-islands');assert.equal(island.loaded,true);assert.deepEqual(island.errors,[]);
 assert.ok(island.meshCount<150&&island.drawCalls<160,'single-island budget');
 assert.deepEqual(island.palette,{stone:'d7be9b',ocean:'2c9aab',basalt:'33475d',metal:'e6a96d'});

 if(width<=600||(width<=950&&height<=500)){assert.ok(metrics.nav.height<=70,'mobile nav must be a single row');assert.ok(metrics.buttons.every(b=>b.height>=44&&b.width>=44));assert.ok(metrics.buttons.every(b=>Math.abs(b.y-metrics.buttons[0].y)<1));assert.ok(metrics.scene.bottom<height,'3D must fit first mobile viewport');}
 for(const [part,title] of [['overview','ТВОЯ СИСТЕМА'],['vitals','ВИТАЛЬНЫЕ ПОКАЗАТЕЛИ'],['recovery','ВОССТАНОВЛЕНИЕ'],['mobility','МОБИЛЬНОСТЬ'],['activity','НАГРУЗКА'],['body','СОСТАВ ТЕЛА'],['mind','НАСТРОЕНИЕ']]){await page.locator('[data-part="'+part+'"]').click();assert.equal(await page.locator('#title').textContent(),title);assert.equal(await page.locator('[data-part="'+part+'"]').getAttribute('aria-pressed'),'true')}
 await page.locator('[data-part="overview"]').click();await page.evaluate(()=>scrollTo(0,0));
 if(width===390){
 const marker=await page.evaluate(()=>__HEALTH_ISLAND_QA.inspect().markers.find(m=>m.id==='vitals'));await page.mouse.click(marker.x,marker.y);
 assert.equal(await page.locator('#title').textContent(),'ВИТАЛЬНЫЕ ПОКАЗАТЕЛИ');await page.locator('[data-part="overview"]').click();
 const before=await page.evaluate(()=>__HEALTH_ISLAND_QA.inspect()),box=await page.locator('#scene canvas').boundingBox();
 await page.mouse.move(box.x+30,box.y+80);await page.mouse.down();await page.mouse.move(box.x+95,box.y+80,{steps:6});await page.mouse.up();
 assert.ok(Math.abs((await page.evaluate(()=>__HEALTH_ISLAND_QA.inspect().yaw))-before.yaw)>.2);
 await page.locator('#sceneHome').click();assert.ok(Math.abs((await page.evaluate(()=>__HEALTH_ISLAND_QA.inspect().yaw))-.40)<.001);
 if(name==='chromium'){const cdp=await page.context().newCDPSession(page),y=box.y+box.height*.65,x=box.x+box.width*.5;await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:x-40,y,id:1},{x:x+40,y,id:2}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x-65,y,id:1},{x:x+65,y,id:2}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});assert.ok((await page.evaluate(()=>__HEALTH_ISLAND_QA.inspect().distance))<9.2);await cdp.detach();await page.locator('#sceneHome').click()}
 await page.evaluate(()=>{window.__loss=document.querySelector('#scene canvas').getContext('webgl2').getExtension('WEBGL_lose_context');__loss.loseContext()});await page.waitForFunction(()=>__HEALTH_ISLAND_QA.context.lost===1);await page.waitForTimeout(1000);await page.evaluate(()=>__loss.restoreContext());await page.waitForFunction(()=>__HEALTH_ISLAND_QA.context.restored===1);assert.equal(await page.locator('#render').textContent(),'WEBGL / THREE.JS');
 }


 if(width===390){
 const beforeStorage=await page.evaluate(()=>localStorage.getItem('hgc-preview-v1'));
 await page.locator('#avatarDetails summary').click();
 await page.locator('[data-avatar-preview="low"]').click();await page.locator('#scene').scrollIntoViewIfNeeded();
 await page.waitForFunction(()=>__HEALTH_ISLAND_QA.inspect().visual.energy<.1);
 assert.equal(await page.evaluate(()=>__HEALTH_ISLAND_QA.inspect().metricMode),'PREVIEW');
 await page.locator('[data-avatar-preview="high"]').click();await page.locator('#scene').scrollIntoViewIfNeeded();
 await page.waitForFunction(()=>__HEALTH_ISLAND_QA.inspect().visual.energy>.9);
 assert.equal(await page.evaluate(()=>localStorage.getItem('hgc-preview-v1')),beforeStorage,'try-on must not change health records');
 await page.locator('#avatarLive').click();
 await page.locator('#profileHeight').fill('200');await page.locator('#saveAvatarProfile').click();await page.locator('#scene').scrollIntoViewIfNeeded();
 await page.waitForFunction(()=>__HEALTH_ISLAND_QA.inspect().visual.heightScale>1.1);
 const box=await page.locator('#scene canvas').boundingBox(),head=await page.evaluate(()=>__HEALTH_ISLAND_QA.inspect().headBox);
 assert.ok(head.top>box.y+5&&head.bottom<box.y+box.height-5,'full head stays inside scene safe zone');
 await page.evaluate(()=>{for(const [id,value] of [['energy',9],['mood',9],['knee',7]]){const el=document.querySelector('#'+id);el.value=String(value);el.dispatchEvent(new Event('input',{bubbles:true}))}});await page.locator('#save').click();await page.locator('#scene').scrollIntoViewIfNeeded();await page.waitForFunction(()=>__HEALTH_ISLAND_QA.inspect().visual.energy>.8);assert.equal(await page.evaluate(()=>__HEALTH_ISLAND_QA.inspect().visual.knee),.7);
 const records=Array.from({length:35},(_,age)=>{const date=new Date();date.setDate(date.getDate()-age);return{metric:'bodyMass',date:date.getFullYear()+'-'+String(date.getMonth()+1).padStart(2,'0')+'-'+String(date.getDate()).padStart(2,'0'),value:age<7?88:80,source:'SYNTHETIC_QA'}});
 page.on('dialog',d=>d.dismiss());
 await page.locator('#upload').setInputFiles({name:'synthetic-avatar.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({records}))});
 await page.locator('#scene').scrollIntoViewIfNeeded();await page.waitForFunction(()=>__HEALTH_ISLAND_QA.inspect().visual.bodyWidth>1.04);
 assert.equal(await page.evaluate(()=>__HEALTH_ISLAND_QA.inspect().metricMode),'LOCAL');
 await page.screenshot({path:'health-game-console/qa/artifacts/'+name+'-avatar-synthetic-local.png'});
 await page.evaluate(()=>localStorage.clear());await page.reload({waitUntil:'networkidle'});await page.waitForFunction(()=>window.__HEALTH_ISLAND_QA?.loaded);
 }
 if(width===390||width===1366){
  await page.screenshot({path:'health-game-console/qa/artifacts/'+name+'-'+width+'-top.png'});
  await page.evaluate(()=>scrollTo(0,innerHeight*.8));await page.screenshot({path:'health-game-console/qa/artifacts/'+name+'-'+width+'-middle.png'});
  await page.evaluate(()=>scrollTo(0,document.body.scrollHeight));await page.screenshot({path:'health-game-console/qa/artifacts/'+name+'-'+width+'-bottom.png'});
  for(const zoom of [.8,.9,1,1.25]){await page.evaluate(z=>{document.documentElement.style.zoom=z},zoom);const bounds=await page.evaluate(()=>({headerRight:document.querySelector('header').getBoundingClientRect().right,rootRight:document.documentElement.getBoundingClientRect().right}));assert.ok(bounds.headerRight<=bounds.rootRight+1,'header exceeds root at CSS zoom '+zoom)}
 }
 assert.deepEqual(errors,[]);evidence.push({browser:name,width,height,webgl:true,metrics,island});console.log('MOBILE_LAYOUT_CASE',name,width,height,JSON.stringify(metrics));await page.close();
 }
 const fallback=await browser.newPage({viewport:{width:390,height:844}});await fallback.route('**/cdn.jsdelivr.net/**',r=>r.abort());await fallback.goto('http://127.0.0.1:8797/');await fallback.waitForFunction(()=>document.querySelector('#render').textContent.includes('FALLBACK'));await fallback.locator('[data-part="mobility"]').click();assert.equal(await fallback.locator('#title').textContent(),'МОБИЛЬНОСТЬ');evidence.push({browser:name,fallbackNavigation:true});await fallback.close();
 }finally{await browser.close()}
}
}finally{await writeFile('health-game-console/qa/artifacts/layout.json',JSON.stringify(evidence,null,2));server.close()}
