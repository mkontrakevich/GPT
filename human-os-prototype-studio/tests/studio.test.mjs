import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const studio=readFileSync(new URL('../studio.js',import.meta.url),'utf8');
const rig=readFileSync(new URL('../rig.js',import.meta.url),'utf8');
test('Three.js client modules parse',()=>{
 for(const source of [studio,rig]){
  const d=mkdtempSync(join(tmpdir(),'hos-'));
  try{const p=join(d,'client.mjs');writeFileSync(p,source);const run=spawnSync(process.execPath,['--check',p],{encoding:'utf8'});assert.equal(run.status,0,run.stderr)}
  finally{rmSync(d,{recursive:true,force:true})}
 }
});
test('scene has real editable mannequin, not image billboard',()=>{
 for(const k of ['CylinderGeometry','SphereGeometry','setWireframe','update(s,aspect','putBone','putBall'])assert.ok(rig.includes(k),k);
 assert.match(studio,/rig\.update\(state,aspect\)/);
 assert.match(studio,/state\.anchors\[drag\]/);
});
test('reference stays local and is validated',()=>{
 assert.match(html,/type="file" accept="image\/png,image\/jpeg,image\/webp"/);
 assert.match(studio,/URL\.createObjectURL\(file\)/);
 assert.match(studio,/image\.naturalWidth\/image\.naturalHeight/);
 assert.doesNotMatch(studio,/localStorage|XMLHttpRequest|fetch\s*\(/);
});
test('all 14 editable joints, four fixed cameras and proportions exist',()=>{
 for(const k of ['head','neck','ls','rs','le','re','lw','rw','lh','rh','lk','rk','la','ra'])assert.match(studio,new RegExp(k+":"));
 for(const v of ['front','threequarter','side','back'])assert.ok(html.includes('data-view="'+v+'"'));
 for(const id of ['headScale','shoulderScale','hipScale','torsoScale','focal'])assert.ok(html.includes('id="'+id+'"'));
});
test('three export formats and restore support the blockout',()=>{
 assert.match(studio,/saveJSON/);assert.match(studio,/loadJSON/);
 assert.match(studio,/GLTFExporter/);assert.match(studio,/UNRIGGED\.glb/);
 assert.match(studio,/savePNG/);assert.match(studio,/schema:'human-os\.blockout\.v1'/);
});
test('visual studio stays separate from real health and relationships data',()=>{
 assert.match(html,/НЕ ГОТОВЫЙ ПЕРСОНАЖ/);
 assert.match(studio,/rigged:false/);
 assert.doesNotMatch(studio,/api\.openai\.com|hros\.snapshot|oxygenSaturation|CLOUDFLARE_API_TOKEN/);
});
