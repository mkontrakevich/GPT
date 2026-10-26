import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium,webkit,firefox} from 'playwright';
import {buildWorker} from '../tools/build-worker.mjs';
const {default:worker}=await import('data:text/javascript;base64,'+Buffer.from(buildWorker()).toString('base64'));
const server=createServer(async(req,res)=>{try{const r=await worker.fetch(new Request('http://localhost:8799'+req.url,{method:req.method}));res.writeHead(r.status,Object.fromEntries(r.headers));res.end(Buffer.from(await r.arrayBuffer()))}catch(e){res.writeHead(500);res.end(String(e))}});
await new Promise(r=>server.listen(8799,'127.0.0.1',r));
await mkdir('human-os-webgl/qa/artifacts',{recursive:true});
const evidence=[];
try{
 for(const [name,browserType] of [['chromium',chromium],['webkit',webkit],['firefox',firefox]]){
  const browser=await browserType.launch({headless:true,...(name==='chromium'?{args:['--use-angle=swiftshader','--enable-webgl','--ignore-gpu-blocklist']}:{} )});
  try{
   for(const [width,height] of [[390,844],[844,390],[1280,800]]){
    const page=await browser.newPage({viewport:{width,height},hasTouch:width<900});
    const errors=[];page.on('pageerror',e=>errors.push(String(e)));
    await page.goto('http://127.0.0.1:8799/',{waitUntil:'networkidle'});
    await page.waitForFunction(()=>['ACTIVE','FALLBACK','2D'].includes(document.querySelector('#engine').textContent));
    const engine=await page.locator('#engine').textContent();
    // Software headless engines are reported separately; unavailable GPU is never a WebGL PASS.
    assert.equal(await page.locator('#menu button').count(),6);
    const item={browser:name,width,height,engine,webglPass:false};
    for(const id of ['health','relationships','projects','work','personal','memory']){
     await page.locator('#menu [data-area="'+id+'"]').click();
     await page.waitForTimeout(100);
     assert.equal(await page.locator('#panel').isVisible(),true);
     if(engine==='ACTIVE'){assert.equal(await page.evaluate(()=>window.__WORLD_QA.inspect().selected),id);await page.locator('#homeWorld').click()}else await page.locator('#close').click();
    }
    if(engine==='ACTIVE'){
     await page.locator('#menu [data-area="health"]').click();await page.waitForFunction(()=>!window.__WORLD_QA.inspect().camera.flying,{},{timeout:15000});
     const focus=await page.evaluate(()=>window.__WORLD_QA.inspect().camera);
     assert.ok(Math.abs(focus.target[0]+5)<.15&&Math.abs(focus.target[2]+4.8)<.15);
     assert.ok(Math.abs(Math.hypot(...focus.position.map((v,i)=>v-focus.target[i]))-focus.distance)<.02);
     await page.locator('#homeWorld').click();await page.waitForTimeout(1500);
     assert.equal(await page.locator('#panel').isVisible(),false);
     assert.equal(await page.evaluate(()=>window.__WORLD_QA.inspect().selected),null);
     await page.evaluate(()=>{const c=document.querySelector('#world');c.dispatchEvent(new PointerEvent('pointercancel',{pointerId:77,bubbles:true}))});
     assert.equal(await page.evaluate(()=>window.__WORLD_QA.inspect().pointers),0);
     const qa=await page.evaluate(()=>({version:__WORLD_QA.version,meshCount:__WORLD_QA.meshCount,batching:__WORLD_QA.batching,assets:__WORLD_QA.assets,performance:__WORLD_QA.performance,state:__WORLD_QA.inspect()}));
     assert.equal(qa.assets.loaded.length,6);assert.equal(qa.assets.failed.length,0);assert.ok(qa.batching.netReduction>300);assert.ok(qa.meshCount<917);
     item.webglPass=true;item.qa=qa;
     await page.evaluate(()=>{const gl=document.querySelector('#world').getContext('webgl2');gl.getExtension('WEBGL_lose_context')?.loseContext()});
     await page.waitForTimeout(150);
     await page.evaluate(()=>{const gl=document.querySelector('#world').getContext('webgl2');gl.getExtension('WEBGL_lose_context')?.restoreContext()});
     await page.waitForTimeout(1200);
     item.recovery=await page.evaluate(()=>__WORLD_QA.context);
     assert.equal(item.recovery.lost,1);assert.equal(item.recovery.restored,1);assert.equal(await page.locator('#engine').textContent(),'ACTIVE');
    }
    if(name==='chromium')assert.equal(engine,'ACTIVE','Chromium WebGL must actually render');
    assert.deepEqual(errors,[]);
    await page.screenshot({path:'human-os-webgl/qa/artifacts/'+name+'-'+width+'x'+height+'.png'});evidence.push(item);await page.close();
   }
   const fallback=await browser.newPage();await fallback.route('**/cdn.jsdelivr.net/**',route=>route.abort());await fallback.goto('http://127.0.0.1:8799/');await fallback.waitForFunction(()=>document.querySelector('#engine').textContent==='2D');await fallback.locator('[data-area="health"]').click();assert.equal(await fallback.locator('#go').getAttribute('href'),'https://health-game-console-mvp.kontrakevich.workers.dev/');evidence.push({browser:name,fallbackPass:true});await fallback.close();
  }finally{await browser.close()}
 }
}finally{await writeFile('human-os-webgl/qa/artifacts/runtime.json',JSON.stringify(evidence,null,2));server.close()}
console.log(JSON.stringify(evidence,null,2));
