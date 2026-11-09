import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {APPROVED_HEROINE,SKELETON_KEYS,sha256OfBlob,lookupApprovedReference,completeDetectedPose} from '../reference-poses.js';
import {derivePoseSuggestions} from '../pose.js';

const canonical=JSON.parse(readFileSync(new URL('../reference/approved-heroine-joints.v1.json',import.meta.url),'utf8'));
const script=readFileSync(new URL('../studio.js',import.meta.url),'utf8');
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');

test('the approved heroine has exactly 14 carefully annotated joints tied to actual original SHA-256',()=>{
 assert.equal(APPROVED_HEROINE.sha256,'023f874b0b00049212cc086ac63d2bbdb2196b2d01fbfb57e4144620be4e7974');
 assert.equal(APPROVED_HEROINE.width,941);
 assert.equal(APPROVED_HEROINE.height,1672);
 assert.equal(SKELETON_KEYS.length,14);
 assert.deepEqual(Object.keys(APPROVED_HEROINE.anchors).sort(),[...SKELETON_KEYS].sort());
 assert.deepEqual(APPROVED_HEROINE.anchors,canonical.joints);
 for(const [key,p] of Object.entries(canonical.joints)){
  assert.ok(p.x>0&&p.x<1&&p.y>0&&p.y<1,key);
 }
 assert.deepEqual([...APPROVED_HEROINE.approximate].sort(),[...canonical.approximateJoints].sort());
});
test('SHA-256 is computed locally, never matched by filename or dimensions',async()=>{
 assert.equal(await sha256OfBlob(new Blob(['abc'])),'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
 assert.equal(await lookupApprovedReference(new Blob(['other source'])) ,null);
});
test('automated MediaPipe proposals extrapolate missing joints while marking the estimates',()=>{
 const anchors={
  ls:{x:.31,y:.26},rs:{x:.63,y:.27},lh:{x:.42,y:.54},rh:{x:.58,y:.54},
  le:{x:.28,y:.38},re:{x:.68,y:.39},lw:{x:.19,y:.45},rw:{x:.77,y:.49},
  lk:{x:.40,y:.75},rk:{x:.61,y:.74}
 };
 const result=completeDetectedPose({ok:true,anchors,depth:{ls:.1},score:.94,used:10});
 assert.equal(result.ok,true);
 assert.equal(Object.keys(result.anchors).length,14);
 assert.ok(result.estimated.includes('head'));
 assert.ok(result.estimated.includes('ra'));
 assert.equal(result.source,'mediapipe-autopose');
 assert.equal(result.confidence,.94);
 assert.equal(result.depth.ls,.1);
});
test('untrusted / missing core poses are rejected, not promoted to reference truth',()=>{
 assert.equal(completeDetectedPose({ok:false,anchors:{}}),null);
 assert.equal(completeDetectedPose({ok:true,anchors:{ls:{x:.2,y:.3}},score:1}),null);
});
test('MediaPipe left/right indices follow image-space shoulder ordering',()=>{
 const pts=Array.from({length:33},()=>({x:.5,y:.5,visibility:.01}));
 const fill=(i,x,y)=>pts[i]={x,y,visibility:.96};
 fill(11,.65,.28);fill(12,.35,.28);
 fill(13,.72,.43);fill(14,.28,.43);fill(15,.78,.54);fill(16,.22,.54);
 fill(23,.60,.58);fill(24,.40,.58);fill(25,.58,.76);fill(26,.42,.76);
 const r=derivePoseSuggestions(pts,[],.55);
 assert.equal(r.ok,true);
 assert.ok(r.anchors.ls.x<r.anchors.rs.x);
 assert.equal(r.anchors.lw.x,.22);
 assert.equal(r.anchors.rw.x,.78);
});
test('upload immediately triggers local identity match or automatic pose, never incorrect default bones',()=>{
 assert.match(script,/autoplaceAfterUpload\(file,image,token\)/);
 assert.match(script,/lookupApprovedReference\(file\)/);
 assert.match(script,/analyzeReferenceImage\(image\)/);
 assert.match(script,/applyAutoplacedJoints\(result,token\)/);
 assert.match(script,/if\(!skeletonVisible \|\| !autoPoseReady\)return/);
 assert.match(script,/poseAutoplacedSource/);
 assert.match(script,/document\.body\.classList\.add\('pose-ready'\)/);
 assert.match(script,/\$\('#mobile3D'\)\.disabled=true/);
 assert.match(html,/body\.pose-ready #refOverlay,body\.pose-ready #guideStrip/);
 assert.match(html,/id="dockPose".*aria-pressed="false"/);
});
