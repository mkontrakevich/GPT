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
