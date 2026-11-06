import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {createHash} from 'node:crypto';
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const worker=readFileSync(new URL('../worker.mjs',import.meta.url),'utf8');
test('strict CSP allows precisely the pinned Three importmap',()=>{
 const map=html.match(/<script type="importmap">([\s\S]*?)<\/script>/)?.[1];assert.ok(map);
 const hash=createHash('sha256').update(map).digest('base64');
 assert.ok(worker.includes('sha256-'+hash),'Importmap SHA changed: browser WebGL would not load');
 assert.match(worker,/wasm-unsafe-eval/);
 assert.doesNotMatch(worker,/script-src [^;]*'unsafe-inline'/);
});
test('Cloudflare worker does not expose a user-image upload endpoint',()=>{
 assert.match(worker,/env\.ASSETS\.fetch/);
 assert.match(worker,/imageDataTransferred:false/);
 assert.doesNotMatch(worker,/R2Bucket|D1Database|request\.formData\(\)|request\.json\(\)/);
});
