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
 if(width<=600){assert.ok(metrics.nav.height<=70,'mobile nav must be a single row');assert.ok(metrics.buttons.every(b=>b.height>=44&&b.width>=44));assert.ok(metrics.buttons.every(b=>Math.abs(b.y-metrics.buttons[0].y)<1));assert.ok(metrics.scene.bottom<height,'3D must fit first mobile viewport');}
 for(const [part,title] of [['overview','ТВОЯ СИСТЕМА'],['vitals','ВИТАЛЬНЫЕ ПОКАЗАТЕЛИ'],['recovery','ВОССТАНОВЛЕНИЕ'],['mobility','МОБИЛЬНОСТЬ'],['activity','НАГРУЗКА'],['body','СОСТАВ ТЕЛА'],['mind','НАСТРОЕНИЕ']]){await page.locator('[data-part="'+part+'"]').click();assert.equal(await page.locator('#title').textContent(),title);assert.equal(await page.locator('[data-part="'+part+'"]').getAttribute('aria-pressed'),'true')}
 await page.locator('[data-part="overview"]').click();await page.evaluate(()=>scrollTo(0,0));
 if(width===390||width===1366){
  await page.screenshot({path:'health-game-console/qa/artifacts/'+name+'-'+width+'-top.png'});
  await page.evaluate(()=>scrollTo(0,innerHeight*.8));await page.screenshot({path:'health-game-console/qa/artifacts/'+name+'-'+width+'-middle.png'});
  await page.evaluate(()=>scrollTo(0,document.body.scrollHeight));await page.screenshot({path:'health-game-console/qa/artifacts/'+name+'-'+width+'-bottom.png'});
  for(const zoom of [.8,.9,1,1.25]){await page.evaluate(z=>{document.documentElement.style.zoom=z},zoom);const right=await page.locator('header').evaluate(el=>el.getBoundingClientRect().right);assert.ok(right<=width+1,'zoom overflow '+zoom)}
 }
 assert.deepEqual(errors,[]);evidence.push({browser:name,width,height,webgl:true,metrics});console.log('MOBILE_LAYOUT_CASE',name,width,height,JSON.stringify(metrics));await page.close();
 }
 const fallback=await browser.newPage({viewport:{width:390,height:844}});await fallback.route('**/cdn.jsdelivr.net/**',r=>r.abort());await fallback.goto('http://127.0.0.1:8797/');await fallback.waitForFunction(()=>document.querySelector('#render').textContent.includes('FALLBACK'));await fallback.locator('[data-part="mobility"]').click();assert.equal(await fallback.locator('#title').textContent(),'МОБИЛЬНОСТЬ');evidence.push({browser:name,fallbackNavigation:true});await fallback.close();
 }finally{await browser.close()}
}
}finally{await writeFile('health-game-console/qa/artifacts/layout.json',JSON.stringify(evidence,null,2));server.close()}
