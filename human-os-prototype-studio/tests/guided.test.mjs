import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, mkdtempSync, writeFileSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';

const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const script=readFileSync(new URL('../studio.js',import.meta.url),'utf8');
test('scripts parse',()=>{
 const dir=mkdtempSync(join(tmpdir(),'hgos-guided-'));
 try{const file=join(dir,'studio.mjs');writeFileSync(file,script);
 const r=spawnSync(process.execPath,['--check',file],{encoding:'utf8'});
 assert.equal(r.status,0,r.stderr)}finally{rmSync(dir,{recursive:true,force:true})}
});
test('first screen starts with an image upload rather than mannequin',()=>{
 assert.match(html,/id="welcome"/);
 assert.match(html,/id="welcomeTitle"/);
 assert.match(html,/id="welcomePick"/);
 assert.match(html,/id="dockChoose"/);
 assert.match(html,/id="dockPose"[^>]*disabled/);
 assert.match(html,/#welcome\[hidden\]\{display:none\}/);
 assert.match(script,/\$\('#welcome'\)\.hidden=true/);
 assert.match(script,/document\.body\.classList\.add\('has-reference'\)/);
});
test('UI explicitly distinguishes a 3D blockout from finished face and costume',()=>{
 assert.match(html,/не генератор готового лица и одежды/);
 assert.match(html,/3D-основы/);
 assert.match(html,/изображение остаётся на устройстве/i);
 assert.match(html,/id="advancedToggle"/);
 assert.match(html,/body:not\(\.advanced-open\) \.controls\{display:none\}/);
 assert.match(script,/classList\.toggle\('advanced-open'\)/);
});
test('guided sequence retains user control over detection and correction',()=>{
 for(const s of ["showStep('no-reference')","showStep('ready')","showStep('suggestion')","showStep('edited')","$('#autoPose').click()","$('#refFile').click()"])
  assert.ok(script.includes(s),s);
 assert.match(script,/poseAccepted=true/);
 assert.match(script,/state\.depth/);
 assert.match(script,/rig\?\.update/);
});
test('production export and local-only reference remain intact',()=>{
 for(const s of ['GLTFExporter','HUMAN_OS_POSE_UNRIGGED.glb','saveJSON','savePNG','URL.createObjectURL(file)','referenceLocalOnly:true'])assert.ok(script.includes(s),s);
 assert.doesNotMatch(script,/localStorage\.setItem|XMLHttpRequest|fetch\(/);
});

test('mobile layout uses full-stage views, never squeezed 40/60 panels',()=>{
  assert.match(html,/id="mobileViews"/);
  assert.match(html,/id="mobileRef"/);
  assert.match(html,/id="mobile3D"/);
  assert.match(html,/body\.mobile-3d \.refcol/);
  assert.match(html,/body:not\(\.mobile-3d\) \.scenecol/);
  assert.match(html,/width:100%;height:100%;grid-column:auto;grid-row:auto/);
  assert.match(html,/#simpleDock\{/);
});
test('mobile has accessible scene switch, bottom settings sheet and dismiss control',()=>{
  assert.match(script,/function setMobileStage/);
  assert.match(script,/function setAdvanced/);
  assert.match(script,/\$\('#mobile3D'\)\.disabled=false/);
  assert.match(script,/setMobileStage\('3d'\)/);
  assert.match(script,/\$\('#advancedBackdrop'\)\.onclick/);
  assert.match(html,/id="advancedBackdrop"/);
  assert.match(html,/aria-pressed="false"/);
  assert.match(html,/max-width:700px/);
  assert.match(html,/env\(safe-area-inset-bottom\)/);
});
