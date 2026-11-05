import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
const js=readFileSync(new URL('../character.js',import.meta.url),'utf8');
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
test('client WebGL source parses as ES module',()=>{
 const dir=mkdtempSync(join(tmpdir(),'hgoschar-'));
 try{const p=join(dir,'character.mjs');writeFileSync(p,js);
 const result=spawnSync(process.execPath,['--check',p],{encoding:'utf8'});
 assert.equal(result.status,0,result.stderr)}
 finally{rmSync(dir,{recursive:true,force:true})}
});
test('contains genuine volumetric 3D character geometry',()=>{
 for(const sym of ['new T.WebGLRenderer','new T.BufferGeometry','new T.TubeGeometry','new T.SphereGeometry','faceGeo','loft(','panel('])
  assert.ok(js.includes(sym),'missing '+sym);
 assert.match(js,/isBillboard:false/);
});
test('painted 3D face, hair and wardrobe exist',()=>{
 for(const sym of ['paintFace','faceMat','hairAmber','coatLining','tapered(','ring(','palm(','rubber'])
  assert.ok(js.includes(sym),'missing '+sym);
});
test('mobile touch and rotation controls are implemented',()=>{
 for(const sym of ['pointermove','touchmove','wheel','requestAnimationFrame','automatic=!automatic','lighting.alternate=!lighting.alternate','dist=10.2'])
  assert.ok(js.includes(sym),'missing '+sym);
 for(const id of ['front','turn','light','full']) assert.ok(html.includes('id="'+id+'"'),'missing '+id);
});
test('public prototype contains no personal data, credentials or integration',()=>{
 assert.match(html,/CHARACTER LAB \/ PAINTERLY 3D/);
 assert.doesNotMatch(js,/localStorage|document\.cookie|Authorization:\s*Bearer|hros\.snapshot|applehealth/ig);
});
test('fallback and measurable browser telemetry are present',()=>{
 assert.match(html,/id="error"/);
 assert.match(js,/fpsMeasured/);
 assert.match(js,/rigged:false/);
 assert.match(js,/triangles:actualTriangles/);
});

test('exports an explicitly unrigged GLB instead of pretending to deliver the final rig',()=>{
  assert.match(html,/id="exportGLB"/);
  assert.match(html,/type="importmap"/);
  assert.match(js,/GLTFExporter/);
  assert.match(js,/parseAsync\(importedModel\|\|root/);
  assert.match(js,/HUMAN_OS_HEROINE_BLOCKOUT_UNRIGGED\.glb/);
  assert.match(js,/exportValidatedBytes=bytes\.byteLength/);
  assert.match(js,/rigged:false/);
});

test('local-only new reconstruction import is available on mobile',()=>{
  assert.match(html,/id="importGLB"/);
  assert.match(html,/id="localGLB"/);
  assert.match(js,/GLTFLoader/);
  assert.match(js,/file\.arrayBuffer\(\)/);
  assert.match(js,/localOnly:true/);
  assert.match(js,/root\.visible=false/);
});

test('side-by-side character QA stays local and unapproved views are disclosed',()=>{
 for(const term of ['id="reviewToggle"','id="qaReference"','id="qaImage"','id="referenceFile"','data-angle="profile"','data-angle="back"'])
  assert.ok(html.includes(term),'missing QA element '+term);
 for(const term of ['setCompare(','FileReader','readAsDataURL','compareAngles','НЕ ПОДТВЕРЖДЁН','referenceLocalOnly=true'])
  assert.ok(js.includes(term),'missing QA control '+term);
 assert.doesNotMatch(js,/fetch\([^)]*reference|localStorage\.setItem|XMLHttpRequest/);
});
