import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';

const $=s=>document.querySelector(s);
const $all=s=>[...document.querySelectorAll(s)];
const keyNames=['nose','leftShoulder','rightShoulder','leftElbow','rightElbow','leftWrist','rightWrist','leftHip','rightHip','leftKnee','rightKnee','leftAnkle','rightAnkle'];
const skeleton=[['leftShoulder','rightShoulder'],['leftShoulder','leftElbow'],['leftElbow','leftWrist'],['rightShoulder','rightElbow'],['rightElbow','rightWrist'],['leftShoulder','leftHip'],['rightShoulder','rightHip'],['leftHip','rightHip'],['leftHip','leftKnee'],['leftKnee','leftAnkle'],['rightHip','rightKnee'],['rightKnee','rightAnkle']];
const defaults=()=>({
 nose:[.5,.15],leftShoulder:[.39,.30],rightShoulder:[.61,.30],
 leftElbow:[.31,.43],rightElbow:[.69,.43],
 leftWrist:[.25,.58],rightWrist:[.75,.58],
 leftHip:[.44,.57],rightHip:[.56,.57],
 leftKnee:[.43,.76],rightKnee:[.57,.76],
 leftAnkle:[.42,.94],rightAnkle:[.58,.94]
});
const clonePose=p=>Object.fromEntries(Object.entries(p).map(([k,v])=>[k,[...v]]));
const presets={
 A:defaults(),
 T:{...defaults(),leftElbow:[.27,.30],rightElbow:[.73,.30],leftWrist:[.12,.30],rightWrist:[.88,.30]},
 HERO:{...defaults(),leftElbow:[.28,.39],leftWrist:[.13,.34],rightElbow:[.62,.44],rightWrist:[.56,.55]}
};
const state={pose:clonePose(presets.A),params:{head:1,shoulders:1,body:1},ref:null,imageURL:null,autoLandmarks:false,preset:'A',quality:'BLOCKOUT_UNRIGGED',selected:null,view:'model'};
let toastTimer;
function notice(message){const e=$('#toast');e.textContent=message;e.style.display='block';clearTimeout(toastTimer);toastTimer=setTimeout(()=>e.style.display='none',2800)}
const clamp=(v,min,max)=>Math.min(max,Math.max(min,v));
function setPreset(name){if(!presets[name])return;state.pose=clonePose(presets[name]);state.preset=name;state.autoLandmarks=false;for(const id of ['poseA','poseT','poseHero'])$('#'+id).classList.toggle('on',id==='pose'+name.charAt(0)+name.slice(1).toLowerCase()||(name==='HERO'&&id==='poseHero'));draw();updateRig()}
$('#poseA').onclick=()=>setPreset('A');$('#poseT').onclick=()=>setPreset('T');$('#poseHero').onclick=()=>setPreset('HERO');
function syncParams(){
 const list=[['headSize','head','headVal'],['shoulderSize','shoulders','shoulderVal'],['bodyMass','body','bodyVal']];
 for(const [id,key,label] of list){const el=$('#'+id);el.value=String(Math.round(state.params[key]*100));$('#'+label).textContent=el.value+'%';}
}
for(const [id,key,label] of [['headSize','head','headVal'],['shoulderSize','shoulders','shoulderVal'],['bodyMass','body','bodyVal']]){
 $('#'+id).addEventListener('input',e=>{state.params[key]=Number(e.target.value)/100;$('#'+label).textContent=e.target.value+'%';updateRig()});
}
$('#opacity').addEventListener('input',e=>$('#referenceImage').style.opacity=String(Number(e.target.value)/100));
$('#load').onclick=()=>$('#imageFile').click();
$('#imageFile').addEventListener('change',e=>{const file=e.target.files?.[0];if(file)loadImage(file);e.target.value='';});
function loadImage(file){
 if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>18*1024*1024){notice('Только PNG / JPEG / WebP до 18 МБ');return;}
 if(state.imageURL)URL.revokeObjectURL(state.imageURL);
 const url=URL.createObjectURL(file),img=$('#referenceImage');
 state.imageURL=url;img.onload=()=>{$('#placeholder').hidden=true;img.hidden=false;state.ref={width:img.naturalWidth,height:img.naturalHeight,filename:file.name};$('#refInfo').textContent='ЛОКАЛЬНО · '+img.naturalWidth+' × '+img.naturalHeight;$('#detect').disabled=false;draw();notice('Референс загружен локально. Отметь суставы или нажми АВТОПОЗА.');};
 img.onerror=()=>{notice('Не удалось прочесть изображение');$('#detect').disabled=true;};
 img.src=url;
}
function imageRect(){
 const stage=$('#refStage'),img=$('#referenceImage'),w=stage.clientWidth,h=stage.clientHeight;
 if(!img.naturalWidth||!img.naturalHeight)return null;
 const scale=Math.min(w/img.naturalWidth,h/img.naturalHeight),rw=img.naturalWidth*scale,rh=img.naturalHeight*scale;
 return{x:(w-rw)/2,y:(h-rh)/2,w:rw,h:rh};
}
const layer=$('#markers'),ctx=layer.getContext('2d');
function draw(){
 const stage=$('#refStage'),dpr=Math.min(devicePixelRatio||1,2),w=stage.clientWidth,h=stage.clientHeight;
 if(w<2||h<2)return;
 layer.width=Math.round(w*dpr);layer.height=Math.round(h*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);
 const rect=imageRect();if(!rect)return;
 const point=k=>[rect.x+state.pose[k][0]*rect.w,rect.y+state.pose[k][1]*rect.h];
 ctx.lineCap='round';ctx.lineJoin='round';ctx.lineWidth=2;
 for(const [a,b] of skeleton){const p=point(a),q=point(b);ctx.strokeStyle='rgba(16,21,35,.62)';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(...p);ctx.lineTo(...q);ctx.stroke();
 ctx.strokeStyle='rgba(235,206,178,.92)';ctx.lineWidth=1.75;ctx.beginPath();ctx.moveTo(...p);ctx.lineTo(...q);ctx.stroke();}
 for(const k of keyNames){const [x,y]=point(k),active=state.selected===k;
 ctx.beginPath();ctx.arc(x,y,active?7:5.6,0,Math.PI*2);ctx.fillStyle=active?'#fff':'#eac9b1';ctx.fill();ctx.lineWidth=2;ctx.strokeStyle='#34283d';ctx.stroke();}
}
let drag=null;
layer.addEventListener('pointerdown',e=>{
 const rect=imageRect();if(!rect)return;const bounds=layer.getBoundingClientRect(),x=e.clientX-bounds.left,y=e.clientY-bounds.top;
 let best=null,bestD=Infinity;
 for(const k of keyNames){const p=state.pose[k],dx=rect.x+p[0]*rect.w-x,dy=rect.y+p[1]*rect.h-y,d=dx*dx+dy*dy;if(d<bestD){best=k;bestD=d;}}
 if(bestD>28*28)return;
 drag=best;state.selected=best;layer.setPointerCapture(e.pointerId);draw();
});
layer.addEventListener('pointermove',e=>{
 if(!drag)return;const rect=imageRect();if(!rect)return;const b=layer.getBoundingClientRect();
 state.pose[drag]=[clamp((e.clientX-b.left-rect.x)/rect.w,.03,.97),clamp((e.clientY-b.top-rect.y)/rect.h,.035,.98)];
 state.preset='CUSTOM';state.autoLandmarks=false;draw();updateRig();
});
for(const event of ['pointerup','pointercancel','lostpointercapture'])layer.addEventListener(event,()=>{drag=null;state.selected=null;draw()});
window.addEventListener('resize',()=>{draw();resize3D()});

// Optional one-click image-only pose detection; task runtime/model fetched ON DEMAND.
// Pixel/photo stays on this device; only library/model asset requests leave the browser.
$('#detect').onclick=async()=>{
 const img=$('#referenceImage');if(!state.ref||img.hidden)return;
 const btn=$('#detect');btn.disabled=true;btn.textContent='ОПРЕДЕЛЯЮ…';
 try{
   const {PoseLandmarker,FilesetResolver}=await import('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22/+esm');
   const vision=await FilesetResolver.forVisionTasks('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22/wasm');
   const model=await PoseLandmarker.createFromOptions(vision,{
     baseOptions:{modelAssetPath:'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',delegate:'CPU'},
     runningMode:'IMAGE',numPoses:1,minPoseDetectionConfidence:.42,minPosePresenceConfidence:.42
   });
   const result=model.detect(img);model.close();
   if(!result.landmarks?.length)throw Error('Поза на изображении не обнаружена');
   const map={nose:0,leftShoulder:11,rightShoulder:12,leftElbow:13,rightElbow:14,leftWrist:15,rightWrist:16,leftHip:23,rightHip:24,leftKnee:25,rightKnee:26,leftAnkle:27,rightAnkle:28};
   let count=0;
   for(const [key,idx] of Object.entries(map)){const p=result.landmarks[0][idx];if(p&&Number.isFinite(p.x)&&Number.isFinite(p.y)&&(p.visibility??1)>.35){state.pose[key]=[clamp(p.x,.02,.98),clamp(p.y,.02,.98)];count++}}
   if(count<8)throw Error('Недостаточно уверенных суставов; можно выставить их вручную');
   state.preset='DETECTED';state.autoLandmarks=true;draw();updateRig();
   notice('Поза оценена по '+count+' точкам. Глубина и анатомия не восстановлены.');
 }catch(error){console.warn('POSE_ESTIMATE_UNAVAILABLE',String(error?.message||error));notice('Автоопределение недоступно. Ручная настройка работает.');}
 finally{btn.disabled=!state.ref;btn.textContent='АВТОПОЗА'}
};

// High-quality neutral form as a measuring instrument, NOT the final heroine or an Arcane imitation.
let renderer,scene,camera,controls,actor,webglReady=false;
const canvas=$('#three');
try{
 renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true,powerPreference:'high-performance'});
 renderer.setPixelRatio(Math.min(devicePixelRatio||1,innerWidth<700?1.4:1.8));
 renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.25;
 scene=new THREE.Scene();scene.background=new THREE.Color(0x26283c);
 camera=new THREE.OrthographicCamera(-3,3,3,-3,.1,60);
 camera.position.set(0,2.35,10);scene.add(new THREE.HemisphereLight(0xe1d8ed,0x302a43,2.5));
 const key=new THREE.DirectionalLight(0xffd2ae,3.2);key.position.set(-3,8,6);scene.add(key);
 const rim=new THREE.DirectionalLight(0x909be0,2.2);rim.position.set(5,5,-4);scene.add(rim);
 const grid=new THREE.GridHelper(9,18,0x635d76,0x444052);grid.position.y=-.02;scene.add(grid);
 const floor=new THREE.Mesh(new THREE.CylinderGeometry(1.8,1.8,.09,60),new THREE.MeshStandardMaterial({color:0x484052,roughness:.74,metalness:.11}));floor.position.y=-.09;scene.add(floor);
 actor=new THREE.Group();actor.name='HUMAN_OS_REFERENCE_MANNEQUIN_UNRIGGED';scene.add(actor);
 controls=new OrbitControls(camera,canvas);controls.target.set(0,2.12,0);controls.enableDamping=true;controls.dampingFactor=.12;controls.enablePan=false;controls.minZoom=.55;controls.maxZoom=2.1;controls.update();
 webglReady=true;$('#engine').textContent='WEBGL · РЕГУЛИРУЕМАЯ 3D-ФИГУРА';
}catch(error){console.error('MANNEQUIN_WEBGL_UNAVAILABLE',String(error?.message||error));$('#engine').textContent='2D ONLY';$('#webglError').style.display='flex';}

// Every part is a genuine independent mesh. Pose parameters are serialized, not inferred identity.
const skin=new THREE.MeshStandardMaterial({color:0xd7c5bd,roughness:.93,metalness:0});
const core=new THREE.MeshStandardMaterial({color:0xddd9dc,roughness:.88,metalness:.04});
const soft=new THREE.MeshStandardMaterial({color:0x9492a3,roughness:.87,metalness:.03});
const jointMat=new THREE.MeshStandardMaterial({color:0xc2a88f,roughness:.73});
const sphereGeo=new THREE.SphereGeometry(1,24,16),cylinderGeo=new THREE.CylinderGeometry(1,1,1,18,1);
const point3=(key)=>{const p=state.pose[key]||[.5,.5];return new THREE.Vector3((p[0]-.5)*4.1,(1-p[1])*4.45,({leftWrist:.12,rightWrist:.12,nose:.26,leftElbow:.04,rightElbow:.04}[key]||0))};
function makePart(shape,mat,name){const object=new THREE.Mesh(shape,mat);object.name=name;actor.add(object);return object;}
const parts={};
if(actor){
 for(const name of ['head','neck','chest','hips','leftUpperArm','leftLowerArm','rightUpperArm','rightLowerArm','leftThigh','leftCalf','rightThigh','rightCalf','leftHand','rightHand','leftFoot','rightFoot','leftShoulderJoint','rightShoulderJoint','leftKneeJoint','rightKneeJoint','leftElbowJoint','rightElbowJoint']){
  const isLimb=name.includes('Arm')||name.includes('Thigh')||name.includes('Calf')||name==='neck';
  parts[name]=makePart(isLimb?cylinderGeo:sphereGeo, name==='head'?skin:isLimb?core:name.endsWith('Joint')?jointMat:soft,name);
 }
}
const Y=new THREE.Vector3(0,1,0);
function segment(mesh,a,b,r){
 const d=new THREE.Vector3().subVectors(b,a);
 mesh.position.copy(a).add(b).multiplyScalar(.5);
 mesh.quaternion.setFromUnitVectors(Y,d.clone().normalize());
 mesh.scale.set(r,Math.max(.015,d.length()),r);
}
function volume(mesh,pos,sx,sy,sz){mesh.position.copy(pos);mesh.scale.set(sx,sy,sz);mesh.quaternion.identity();}
function midpoint(a,b){return a.clone().add(b).multiplyScalar(.5);}
function updateRig(){
 if(!webglReady||!actor)return;
 const p=Object.fromEntries(keyNames.map(k=>[k,point3(k)])),s=state.params;
 const ls=p.leftShoulder.clone(),rs=p.rightShoulder.clone(),lh=p.leftHip.clone(),rh=p.rightHip.clone(),nose=p.nose.clone();
 const shoulderCenter=midpoint(ls,rs),hipCenter=midpoint(lh,rh),shWidth=Math.max(.25,ls.distanceTo(rs))*s.shoulders;
 // Neck is inferred from nose/shoulders (not verified by one photo).
 const neckBase=shoulderCenter.clone(),neckTop=midpoint(nose,shoulderCenter);neckTop.y+=.04;
 segment(parts.neck,neckBase,neckTop,.125*s.body);
 const headPos=nose.clone();headPos.y+=.19*s.head;
 volume(parts.head,headPos,.275*s.head,.355*s.head,.238*s.head);
 const chestPos=midpoint(shoulderCenter,hipCenter);chestPos.y+=.07;
 volume(parts.chest,chestPos,shWidth*.61,shoulderCenter.distanceTo(hipCenter)*.62,.32*s.body);
 volume(parts.hips,hipCenter,.37*s.body,.22*s.body,.27*s.body);
 for(const side of ['left','right']){
  const sh=p[side+'Shoulder'],el=p[side+'Elbow'],wr=p[side+'Wrist'],hip=p[side+'Hip'],kn=p[side+'Knee'],an=p[side+'Ankle'];
  const shift=(side==='left'?-1:1)*(s.shoulders-1)*shWidth*.5;
  sh.x+=shift;
  segment(parts[side+'UpperArm'],sh,el,.132*s.body);
  segment(parts[side+'LowerArm'],el,wr,.099*s.body);
  segment(parts[side+'Thigh'],hip,kn,.21*s.body);
  segment(parts[side+'Calf'],kn,an,.142*s.body);
  volume(parts[side+'Hand'],wr,.103,.137,.075);
  const foot=an.clone();foot.z+=.16;foot.y-=.055;
  volume(parts[side+'Foot'],foot,.16,.10,.29);
  for(const [name,pos,size] of [['ShoulderJoint',sh,.13],['ElbowJoint',el,.112],['KneeJoint',kn,.17]])
   volume(parts[side+name],pos,size,size,size);
 }
}
function resize3D(){
 if(!renderer||!camera)return;
 const width=Math.max(1,canvas.clientWidth),height=Math.max(1,canvas.clientHeight),a=width/height;
 const halfH=a<.8?3.15:2.75;
 camera.left=-halfH*a;camera.right=halfH*a;camera.top=halfH;camera.bottom=-halfH;camera.updateProjectionMatrix();
 renderer.setSize(width,height,false);
}
function cameraPreset(name){
 if(!webglReady)return;
 const coords={
  front:[0,2.2,11],threequarter:[6.6,3.0,8.4],side:[11,2.2,0],back:[0,2.2,-11]
 };
 const v=coords[name];if(!v)return;camera.position.set(...v);controls.target.set(0,2.15,0);controls.update();
 $all('[data-camera]').forEach(b=>b.classList.toggle('on',b.dataset.camera===name));
 window.__BUILDER_QA.cameraPreset=name;
}
$all('[data-camera]').forEach(b=>b.onclick=()=>cameraPreset(b.dataset.camera));
function setView(name){
 document.body.dataset.view=name;
 $('#tabRef').classList.toggle('on',name==='ref');$('#tabModel').classList.toggle('on',name==='model');
 state.view=name;requestAnimationFrame(()=>{draw();resize3D()});
}
$('#tabRef').onclick=()=>setView('ref');$('#tabModel').onclick=()=>setView('model');

function download(name,blob){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),3000)}
function projectJSON(){
 return{
  schemaVersion:'hgos.pose-prototype.v1',status:'BLOCKOUT_UNRIGGED',
  characterId:'human-os-primary-heroine',sourceRef:{width:state.ref?.width||null,height:state.ref?.height||null,filename:state.ref?.filename||null,embeddedImage:false},
  pose:clonePose(state.pose),params:{...state.params},poseDetectedAutomatically:state.autoLandmarks,
  limitations:['Single image cannot recover unique 3D anatomy or hidden geometry','Not the approved heroine mesh','No skinning, UV identity, animation, texture reconstruction']
 };
}
$('#saveJSON').onclick=()=>{download('HUMAN_OS_POSE_PROTOTYPE.json',new Blob([JSON.stringify(projectJSON(),null,2)],{type:'application/json'}));notice('Сохранён проект позы. Фото внутрь файла не включено.')};
$('#loadJSON').onclick=()=>$('#projectFile').click();
$('#projectFile').addEventListener('change',async(e)=>{
 const f=e.target.files?.[0];e.target.value='';if(!f)return;
 try{
  if(f.size>90000)throw Error('Файл слишком большой');
  const obj=JSON.parse(await f.text());if(obj.schemaVersion!=='hgos.pose-prototype.v1')throw Error('Неизвестный формат');
  for(const k of keyNames){const v=obj.pose?.[k];if(!Array.isArray(v)||v.length!==2||!v.every(x=>typeof x==='number'&&Number.isFinite(x)&&x>=0&&x<=1))throw Error('Неверная координата '+k)}
  const params=obj.params||{};for(const [k,min,max] of [['head',.75,1.35],['shoulders',.75,1.35],['body',.7,1.4]]){if(!Number.isFinite(params[k])||params[k]<min||params[k]>max)throw Error('Неверная пропорция '+k)}
  state.pose=clonePose(obj.pose);state.params={...params};state.autoLandmarks=false;state.preset='CUSTOM';syncParams();draw();updateRig();notice('Поза восстановлена. При необходимости загрузи изображение отдельно.');
 }catch(err){notice('Ошибка импорта JSON: '+String(err.message||err))}
});
$('#saveGLB').onclick=async()=>{
 if(!actor){notice('WebGL недоступен');return;}const btn=$('#saveGLB'),old=btn.textContent;btn.disabled=true;btn.textContent='ЭКСПОРТ…';
 try{
  const {GLTFExporter}=await import('three/addons/exporters/GLTFExporter.js');
  actor.updateMatrixWorld(true);
  const glb=await new GLTFExporter().parseAsync(actor,{binary:true,onlyVisible:true,trs:true,maxTextureSize:1024});
  if(!(glb instanceof ArrayBuffer)||glb.byteLength<1500)throw Error('Пустой экспорт');
  window.__BUILDER_QA.exportBytes=glb.byteLength;
  download('HUMAN_OS_MANNEQUIN_BLOCKOUT_UNRIGGED.glb',new Blob([glb],{type:'model/gltf-binary'}));
  notice('GLB выгружен. Это болванка без скелета и текстур персонажа.');
 }catch(err){console.warn('MANNEQUIN_EXPORT_ERROR',String(err?.message||err));notice('Не удалось выгрузить GLB');}
 finally{btn.disabled=false;btn.textContent=old}
};

window.__BUILDER_QA={version:'0.1-reference-editor',status:'BLOCKOUT_UNRIGGED',poseKeyCount:keyNames.length,localOnly:true,imageUploadedToServer:false,mediapipeOnDemand:true,webgl:!!webglReady};
if(webglReady){
 updateRig();resize3D();cameraPreset('front');
 let frames=0,stamp=performance.now();
 const loop=()=>{
  requestAnimationFrame(loop);if(document.hidden)return;
  controls.update();renderer.render(scene,camera);
  frames++;const now=performance.now();if(now-stamp>1800){window.__BUILDER_QA.fps=Math.round(frames*1000/(now-stamp));frames=0;stamp=now}
 };
 loop();
}
syncParams();setView(innerWidth<700?'model':'ref');


// BUILDER_SELF_TEST: opt-in, synthetic-only, safe for Cloudflare Browser Rendering.
// Never reads, exports or submits a reference image. Exposes pass/fail through DOM.
if(new URLSearchParams(location.search).has('qa')){
 (async()=>{
  const tests={webgl:!!webglReady,landmarks:keyNames.length===13,json:false,glb:false,presets:false,detail:''};
  try{
   const before=JSON.stringify(projectJSON());
   setPreset('T');
   tests.presets=state.pose.leftWrist[1]===.30;
   setPreset('A');
   const project=projectJSON();
   tests.json=project.schemaVersion==='hgos.pose-prototype.v1' && project.sourceRef.embeddedImage===false;
   if(webglReady){
    const {GLTFExporter}=await import('three/addons/exporters/GLTFExporter.js');
    actor.updateMatrixWorld(true);
    const bytes=await new GLTFExporter().parseAsync(actor,{binary:true,trs:true,onlyVisible:true,maxTextureSize:1024});
    tests.glb=bytes instanceof ArrayBuffer&&bytes.byteLength>1500;
    tests.glbBytes=bytes.byteLength;
   }
  }catch(error){tests.detail=String(error?.message||error).slice(0,180);}
  tests.pass=tests.webgl&&tests.landmarks&&tests.json&&tests.glb&&tests.presets;
  window.__BUILDER_QA.selfTest=tests;
  document.documentElement.dataset.builderSelfTest=tests.pass?'PASS':'FAIL';
  document.documentElement.dataset.builderGlbBytes=String(tests.glbBytes||0);
  document.documentElement.dataset.builderSelfTestDetail=tests.detail;
  $('#engine').textContent=tests.pass?'WEBGL · SELF TEST PASS':'WEBGL · SELF TEST FAIL';
 })();
}
