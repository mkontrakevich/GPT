import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const source=html.match(/<script type="module">([\s\S]*?)<\/script>/)?.[1];
test('client-side WebGL source parses as a module',()=>{
 assert.ok(source?.length>12000,'missing module'); const dir=mkdtempSync(join(tmpdir(),'hgos-'));
 try{const path=join(dir,'main.mjs');writeFileSync(path,source);const r=spawnSync(process.execPath,['--check',path],{encoding:'utf8'});assert.equal(r.status,0,r.stderr)}
 finally{rmSync(dir,{recursive:true,force:true})}
});
test('six domains and stable links available',()=>{
 for(const id of ['health','relationships','projects','work','personal','memory'])assert.match(html,new RegExp("id:'"+id+"'"));
 assert.match(html,/health-game-console-mvp/);assert.match(html,/HROS-Web3D/);
});
test('mobile camera and island focus controls exist',()=>{
 for(const part of ['pointerdown','pointermove','touchmove','wheel','__focusArea','__worldHome','cameraFly','worldTag'])
 assert.ok(html.includes(part),part);
});
test('cinematic art direction has reusable physical model helpers',()=>{
 for(const part of ['strataCliffs','architecturalTower','cityFacadeTexture','arch(','modularTree(','lineBeads','stoneTexture'])
 assert.ok(html.includes(part),part);
});
test('demo explicitly prohibits real health data syncing',()=>{
 assert.match(html,/БЕЗ ЛИЧНЫХ ДАННЫХ/);
 assert.doesNotMatch(html,/hros\.snapshot\.v1|apple-health-token|api\.apple\.com|openai\.com\/v1/);
 assert.doesNotMatch(html,/localStorage\.setItem|document\.cookie\s*=/);
});
test('art preset and count are inspectable for QA',()=>{
 assert.match(html,/__WORLD_QA/);assert.match(html,/meshCount/);assert.match(html,/detailTier/);
});

test('quiet interface removes promotional overlays without deleting content',()=>{
 assert.match(html,/HUMAN OS quiet HUD v0\.4/);
 assert.match(html,/\.mobileIntro,\.mobileFoot,\.legend,\.toast,\.subtitle,\.mobileTitle\{display:none !important\}/);
 assert.match(html,/\.worldTag\{[\s\S]*?font-size:0;/);
 assert.match(html,/aria-label','Открыть '/);
});
test('all six mobile controls fit without horizontal scroll',()=>{
 assert.match(html,/\.bottom button\{min-width:0;flex:1 1 0;/);
 assert.match(html,/\.bottom\{left:6px;right:6px;/);
 assert.match(html,/\#worldTags/);
});
test('golden 3D visuals and interaction survive interface reduction',()=>{
 for(const marker of ['strataCliffs','cityFacadeTexture','flushPineInstances','cameraFly','positionLabels','waterfall(','meshes','__WORLD_QA'])
  assert.ok(html.includes(marker),'Visual floor regression: '+marker);
});

test('original reusable glTF assets have valid bounded buffers and geometry',async()=>{
 const {buildAsset}=await import('../tools/landmark-geometry.mjs');
 for(const id of ['health','relationships','projects','work','personal','memory']){
  const text=readFileSync(new URL('../assets/'+id+'-signature.gltf',import.meta.url),'utf8'),g=JSON.parse(text);
  const generated=buildAsset(id);assert.deepEqual(g.meshes,generated.meshes);assert.deepEqual(g.materials,generated.materials);assert.deepEqual(g.bufferViews,generated.bufferViews);
  const generatedBytes=Buffer.from(generated.buffers[0].uri.split(',')[1],'base64'),storedBytes=Buffer.from(g.buffers[0].uri.split(',')[1],'base64');
  for(let offset=0;offset<g.bufferViews[2].byteOffset;offset+=4)assert.ok(Math.abs(storedBytes.readFloatLE(offset)-generatedBytes.readFloatLE(offset))<1e-5,'cross-engine geometry tolerance');
  assert.deepEqual(storedBytes.subarray(g.bufferViews[2].byteOffset),generatedBytes.subarray(g.bufferViews[2].byteOffset));
  assert.equal(g.asset.version,'2.0');assert.ok(Buffer.byteLength(text)<65000);
  const bytes=Buffer.from(g.buffers[0].uri.split(',')[1],'base64');assert.equal(bytes.length,g.buffers[0].byteLength);
  for(const view of g.bufferViews)assert.ok(view.byteOffset+view.byteLength<=bytes.length);
  const v=g.bufferViews[0],n=g.bufferViews[1],ind=g.bufferViews[2];
  for(let i=0;i<v.byteLength;i+=4)assert.ok(Number.isFinite(bytes.readFloatLE(v.byteOffset+i)));
  for(let i=0;i<n.byteLength;i+=12){const length=Math.hypot(...[0,4,8].map(k=>bytes.readFloatLE(n.byteOffset+i+k)));assert.ok(length>.99&&length<1.01,'unit normals')}
  for(let i=0;i<ind.byteLength;i+=2)assert.ok(bytes.readUInt16LE(ind.byteOffset+i)<g.accessors[0].count);
  assert.equal(g.accessors[2].count%3,0);
 }
});
test('bundled Worker parses and only serves known demo routes',async()=>{
 const {buildWorker}=await import('../tools/build-worker.mjs');
 const code=buildWorker();const dir=mkdtempSync(join(tmpdir(),'hgos-worker-'));
 try{const file=join(dir,'worker.mjs');writeFileSync(file,code);assert.equal(spawnSync(process.execPath,['--check',file],{encoding:'utf8'}).status,0);const {default:w}=await import('file://'+file);
 for(const path of ['/','/health','/assets/health-signature.gltf'])assert.equal((await w.fetch(new Request('https://demo.test'+path))).status,200);
 assert.equal((await w.fetch(new Request('https://demo.test/no-such-route'))).status,404);
 assert.equal((await w.fetch(new Request('https://demo.test/',{method:'POST'}))).status,405);
 assert.equal(await (await w.fetch(new Request('https://demo.test/',{method:'HEAD'}))).text(),'');
 }finally{rmSync(dir,{recursive:true,force:true})}
});

test('world bundles the same maintained adult avatar and context resolver',()=>{const factory=readFileSync(new URL('../../human-os-shared/avatar-model.mjs',import.meta.url),'utf8').replaceAll('export ','');assert.ok(html.includes(factory));assert.match(html,/__setAvatarIsland/);assert.match(html,/QA.avatar/);assert.match(html,/avatarView/)});
