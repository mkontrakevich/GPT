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
