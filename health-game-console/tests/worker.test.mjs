import assert from 'node:assert/strict';
import test from 'node:test';
import worker from '../worker.mjs';
const base='https://health-game-console-mvp.kontrakevich.workers.dev';
test('health reports explicitly synthetic demo without real data', async () => {
 const r=await worker.fetch(new Request(base+'/health'),{ASSETS:{fetch(){throw Error('unnecessary')}}});
 assert.equal(r.status,200);
 const j=await r.json();
 assert.equal(j.ok,true);
 assert.equal(j.demo_only,true);
 assert.equal(j.personal_data_backend,false);
});
test('assets are served locally without GitHub runtime dependency',async()=>{
 let called=0;
 const env={ASSETS:{async fetch(){called++;return new Response('<!doctype html><title>Preview</title>',{headers:{'content-type':'text/html'}})}}};
 const r=await worker.fetch(new Request(base+'/'),env);
 assert.equal(r.status,200);assert.equal(called,1);
 assert.match(await r.text(),/Preview/);
 assert.equal(r.headers.get('x-content-type-options'),'nosniff');
 assert.match(r.headers.get('content-security-policy')||'',/frame-ancestors 'none'/);
});
test('missing assets retain 404 instead of fake success',async()=>{
 const r=await worker.fetch(new Request(base+'/absent'),{ASSETS:{fetch:async()=>new Response('Not found',{status:404})}});
 assert.equal(r.status,404);
});