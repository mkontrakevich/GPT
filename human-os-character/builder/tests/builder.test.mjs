import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,rmSync,writeFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const js=readFileSync(new URL('../builder.js',import.meta.url),'utf8');

test('standalone editor is syntax-valid JavaScript',()=>{
 const dir=mkdtempSync(join(tmpdir(),'hgos-builder-'));
 try{const p=join(dir,'builder.mjs');writeFileSync(p,js);
 const s=spawnSync(process.execPath,['--check',p],{encoding:'utf8'});
 assert.equal(s.status,0,s.stderr)}
 finally{rmSync(dir,{recursive:true,force:true})}
});
test('real WebGL mannequin uses pose-derived volumetric geometry and OrbitControls',()=>{
 for(const q of ["from 'three'","new THREE.WebGLRenderer","new THREE.OrthographicCamera","new THREE.SphereGeometry","new THREE.CylinderGeometry","new OrbitControls","function updateRig()","function segment(","point3("])
 assert.ok(js.includes(q),q);
 assert.ok(!js.includes('characterFinalReady:true'));
});
test('13 editable 2D joints, pose image overlay, precise camera preset controls',()=>{
 for(const k of ['nose','leftShoulder','rightShoulder','leftElbow','rightElbow','leftWrist','rightWrist','leftHip','rightHip','leftKnee','rightKnee','leftAnkle','rightAnkle'])
 assert.ok(js.includes("'"+k+"'"),k);
 for(const id of ['referenceImage','markers','tabRef','tabModel','poseA','poseT','poseHero','headSize','shoulderSize','bodyMass'])
 assert.match(html,new RegExp('id="'+id+'"'));
 for(const id of ['front','threequarter','side','back'])assert.match(html,new RegExp('data-camera="'+id+'"'));
});
test('local-only image workflow, optional on-demand MediaPipe and manual fallback',()=>{
 assert.match(js,/URL\.createObjectURL\(file\)/);
 assert.match(js,/input\.files|imageFile/);
 assert.match(js,/loadImage\(file\)/);
 assert.match(js,/PoseLandmarker\.createFromOptions/);
 assert.match(js,/model\.detect\(img\)/);
 assert.match(js,/minPoseDetectionConfidence/);
 assert.match(js,/localOnly:true,imageUploadedToServer:false/);
 assert.doesNotMatch(js,/fetch\(\s*['"]\/api|navigator\.sendBeacon|XMLHttpRequest|localStorage\.setItem/);
});
test('JSON prototype and GLB exporter cannot claim rigged final asset',()=>{
 assert.match(js,/hgos\.pose-prototype\.v1/);
 assert.match(js,/status:'BLOCKOUT_UNRIGGED'/);
 assert.match(js,/new GLTFExporter\(\)\.parseAsync/);
 assert.match(js,/HUMAN_OS_MANNEQUIN_BLOCKOUT_UNRIGGED\.glb/);
 assert.match(js,/Single image cannot recover unique 3D anatomy or hidden geometry/);
 assert.match(js,/!webglReady/);
});
test('reference uploads never embedded in JSON project and can be restored with validation',()=>{
 assert.match(js,/embeddedImage:false/);
 assert.match(js,/file\.size>18\*1024\*1024/);
 assert.match(js,/obj\.schemaVersion!=='hgos\.pose-prototype\.v1'/);
 assert.match(js,/v\.every\(x=>typeof x==='number'&&Number\.isFinite/);
});
test('mobile tabs preserve editor access without blocking stage',()=>{
 assert.match(html,/data-view="model"/);
 assert.match(html,/id="tabRef"/);
 assert.match(html,/body\[data-view=ref\] \.panel3d\{display:none\}/);
 assert.match(html,/body\[data-view=model\] \.panelRef\{display:none\}/);
});
