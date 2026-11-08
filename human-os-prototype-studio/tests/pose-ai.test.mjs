import test from 'node:test';
import assert from 'node:assert/strict';
import {derivePoseSuggestions,POSE_MODEL_INFO} from '../pose.js';
import {readFileSync} from 'node:fs';

const studio=readFileSync(new URL('../studio.js',import.meta.url),'utf8');
const rig=readFileSync(new URL('../rig.js',import.meta.url),'utf8');
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const fullPose=()=>Array.from({length:33},()=>({x:.5,y:.5,z:0,visibility:.01}));
const point=(pose,index,x,y,visibility=.94)=>pose[index]={x,y,z:0,visibility};

test('MediaPipe landmark map yields 14 reliable joints without auto-applying',()=>{
 const pts=fullPose();
 point(pts,0,.5,.09);point(pts,7,.46,.125);point(pts,8,.54,.125);
 for(const [i,x,y] of [[11,.4,.29],[12,.6,.29],[13,.36,.42],[14,.64,.42],
  [15,.28,.54],[16,.72,.54],[23,.43,.57],[24,.57,.57],[25,.44,.75],[26,.56,.75],[27,.44,.92],[28,.56,.92]])
  point(pts,i,x,y);
 const world=Array.from({length:33},()=>({x:0,y:0,z:.2}));
 const result=derivePoseSuggestions(pts,world);
 assert.equal(result.ok,true);
 assert.equal(result.used,14);
 assert.ok(result.score>.9);
 assert.deepEqual(result.anchors.lw,{x:.28,y:.54});
 assert.equal(result.anchors.head.y,.109);
 assert.ok(Number.isFinite(result.depth.lw));
 assert.equal(result.depth.lw,-.24);
});
test('occluded joints do not erase manually aligned values',()=>{
 const pts=fullPose();
 for(const [i,x,y] of [[11,.4,.29],[12,.6,.29],[13,.36,.42],[14,.64,.42],
  [15,.28,.54],[16,.72,.54],[23,.43,.57],[24,.57,.57],[25,.44,.75],[26,.56,.75]])point(pts,i,x,y);
 const result=derivePoseSuggestions(pts);
 assert.equal(result.ok,true);
 assert.equal(Object.hasOwn(result.anchors,'la'),false);
 assert.equal(Object.hasOwn(result.anchors,'ra'),false);
});
test('missing core or invalid image geometry cannot pass',()=>{
 const pts=fullPose();point(pts,11,.4,.29);point(pts,12,.6,.29);
 assert.equal(derivePoseSuggestions(pts).ok,false);
 assert.equal(derivePoseSuggestions([]).ok,false);
 const a=fullPose();for(const [i,x,y] of [[11,.4,.29],[12,.6,.29],[13,.36,.42],
  [14,.64,.42],[15,.28,.54],[16,.72,.54],[23,.43,.57],[24,.57,.57]])point(a,i,x,y);
 a[15]={x:5,y:.54,visibility:.99};
 const result=derivePoseSuggestions(a);assert.equal(result.ok,true);
 assert.ok(!result.anchors.lw);
});
test('depth values remain bounded, never described as true depth',()=>{
 const pts=fullPose();
 for(const [i,x,y] of [[0,.5,.12],[7,.48,.14],[8,.52,.14],
  [11,.4,.29],[12,.6,.29],[13,.36,.42],[14,.64,.42],
  [15,.28,.54],[16,.72,.54],[23,.43,.57],[24,.57,.57],
  [25,.44,.75],[26,.56,.75],[27,.44,.92],[28,.56,.92]])point(pts,i,x,y);
 const world=Array.from({length:33},()=>({z:40}));
 const r=derivePoseSuggestions(pts,world);
 assert.equal(r.depth.rw,-.65);
 assert.match(html,/2D-референс не определяет точную глубину/);
 assert.match(rig,/s\.depth\?\.\[key\]/);
});
test('opt-in on-device proposal, approve/reject and local-only reference',()=>{
 for(const k of ['id="autoPose"','id="poseDecision"','id="acceptPose"','id="discardPose"','id="depthJoint"','id="depth"'])
  assert.ok(html.includes(k),k);
 for(const s of ['analyzeReferenceImage','posePreview=result','clearPoseSuggestion','poseAccepted=true','depthEditCount','state.depth','referenceLocalOnly:true'])
  assert.ok(studio.includes(s),s);
 assert.equal(POSE_MODEL_INFO.processing,'on-device');
 assert.doesNotMatch(studio,/fetch\(|XMLHttpRequest|localStorage\.setItem/);
});
