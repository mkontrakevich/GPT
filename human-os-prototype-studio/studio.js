import * as T from 'three';
import {GLTFExporter} from 'three/addons/exporters/GLTFExporter.js';
import {createRig} from './rig.js';
import {analyzeReferenceImage,POSE_MODEL_INFO} from './pose.js';
import {lookupApprovedReference,completeDetectedPose} from './reference-poses.js';

const $=s=>document.querySelector(s),ref=$('#refCanvas'),view=$('#view');
const keys=['head','neck','ls','rs','le','re','lw','rw','lh','rh','lk','rk','la','ra'];
const defaults={
 head:[.50,.125],neck:[.50,.242],ls:[.386,.276],rs:[.622,.274],
 le:[.292,.392],re:[.712,.39],lw:[.206,.449],rw:[.714,.520],
 lh:[.439,.529],rh:[.581,.53],lk:[.447,.73],rk:[.599,.725],
 la:[.445,.914],ra:[.597,.913]
};
const fresh=()=>Object.fromEntries(keys.map(k=>[k,{x:defaults[k][0],y:defaults[k][1]}]));
const state={schema:'human-os.blockout.v1',anchors:fresh(),proportions:{headScale:.93,shoulderScale:1,hipScale:1,torsoScale:1},camera:{view:'threequarter',yaw:-.36,pitch:.05,zoom:1,focal:52},overlay:0,wireframe:false,depth:Object.fromEntries(keys.map(k=>[k,0]))};
let photo=null,photoUrl=null,aspect=.667,imageRect={x:0,y:0,w:1,h:1},drag=null,renderer,scene,camera,rig,last={x:0,y:0},touches=new Map(),posePreview=null,poseBusy=false;
let autoPoseSequence=0,autoPoseReady=false,skeletonVisible=false,autoPoseMethod='none';
let baselineAnchors=null,baselineDepth=null;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const compact={head:'Голова',neck:'Шея',ls:'Л. плечо',rs:'П. плечо',le:'Л. локоть',re:'П. локоть',lw:'Л. кисть',rw:'П. кисть',lh:'Л. бедро',rh:'П. бедро',lk:'Л. колено',rk:'П. колено',la:'Л. стопа',ra:'П. стопа'};
const links=[['head','neck'],['neck','ls'],['neck','rs'],['ls','le'],['le','lw'],['rs','re'],['re','rw'],['neck','lh'],['neck','rh'],['lh','rh'],['lh','lk'],['lk','la'],['rh','rk'],['rk','ra']];
// Guided entry makes the purpose explicit: align pose and camera, not generate likeness.
function showStep(step){
 const strip=$('#guideStrip'),dock=$('#dockPose');
 if(step==='no-reference'){dock.disabled=true;strip.textContent='Шаг 1/3 · Выбери изображение персонажа';return}
 if(step==='detecting'){dock.disabled=true;strip.textContent='Система определяет суставы на изображении…';return}
 if(step==='no-pose'){dock.disabled=true;strip.textContent='Не удалось уверенно определить позу';return}
 dock.disabled=false;
 if(step==='suggestion'){strip.textContent='Шаг 2/3 · Проверь золотые точки, затем нажми ПРИНЯТЬ';return}
 if(step==='edited'){strip.textContent='Шаг 3/3 · Проверь силуэт, вращай 3D и сохрани результат';return}
 strip.textContent='Суставы построены автоматически. Включи разметку для проверки.';
}
// Single-column mobile stage: entire viewport belongs either to reference or to true 3D.
function setMobileStage(stage){
 const view3d=stage==='3d';
 document.body.classList.toggle('mobile-3d',view3d);
 for(const [id,active] of [['mobileRef',!view3d],['mobile3D',view3d]]){
  const btn=$('#'+id);btn.classList.toggle('active',active);btn.setAttribute('aria-pressed',String(active));
 }
 if(window.__STUDIO_QA)window.__STUDIO_QA.mobileStage=stage;
 requestAnimationFrame(()=>{resize();setTimeout(resize,170)});
}
function setAdvanced(open){
 document.body.classList.toggle('advanced-open',!!open);
 const button=$('#advancedToggle');
 button.setAttribute('aria-expanded',String(!!open));
 button.classList.toggle('active',!!open);
 button.textContent=open?'3 · Скрыть':'3 · Настройки';
 if(window.__STUDIO_QA)window.__STUDIO_QA.advancedOpen=!!open;
 requestAnimationFrame(()=>{resize();setTimeout(resize,170)});
}
$('#mobileRef').onclick=()=>{setAdvanced(false);setMobileStage('ref')};
$('#mobile3D').onclick=()=>{
 if(!photo)return notify('Сначала выбери изображение');
 setAdvanced(false);setMobileStage('3d');
};
$('#advancedBackdrop').onclick=()=>setAdvanced(false);
window.addEventListener('keydown',e=>{if(e.key==='Escape')setAdvanced(false)});
setMobileStage('ref');
$('#welcomePick').addEventListener('click',()=>$('#refFile').click());
$('#dockChoose').addEventListener('click',()=>$('#refFile').click());
$('#dockPose').addEventListener('click',()=>{
 if(!photo)return notify('Сначала выбери референс');
 if(!autoPoseReady)return notify('Идёт определение суставов');
 setAdvanced(false);setMobileStage('ref');
 skeletonVisible=!skeletonVisible;
 const b=$('#dockPose');
 b.setAttribute('aria-pressed',String(skeletonVisible));
 b.classList.toggle('active',skeletonVisible);
 drawRef();
 if(window.__STUDIO_QA)window.__STUDIO_QA.skeletonVisible=skeletonVisible;
 notify(skeletonVisible?'Скелет показан. При необходимости поправь точки.':'Скелет скрыт. 3D-фигура сохранена.');
});
$('#advancedToggle').addEventListener('click',()=>setAdvanced(!document.body.classList.contains('advanced-open')));
showStep('no-reference');

function notify(msg){$('#status').textContent=msg;clearTimeout(notify.timer);notify.timer=setTimeout(()=>{$('#status').textContent=''},3500)}
function save(blob,name){const u=URL.createObjectURL(blob),a=document.createElement('a');a.href=u;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),3000)}
function contain(w,h,ratio){let dw=w,dh=w/ratio;if(dh>h){dh=h;dw=h*ratio}return {x:(w-dw)/2,y:(h-dh)/2,w:dw,h:dh}}
function drawRef(){
 const rect=ref.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,2),w=rect.width,h=rect.height;
 if(ref.width!==Math.round(w*dpr)||ref.height!==Math.round(h*dpr)){ref.width=Math.round(w*dpr);ref.height=Math.round(h*dpr)}
 const ctx=ref.getContext('2d');ctx.setTransform(dpr,0,0,dpr,0,0);
 ctx.clearRect(0,0,w,h);
 let grd=ctx.createLinearGradient(0,0,w,h);grd.addColorStop(0,'#203343');grd.addColorStop(1,'#121a2a');
 ctx.fillStyle=grd;ctx.fillRect(0,0,w,h);
 imageRect=contain(w,h,aspect);
 if(photo)ctx.drawImage(photo,imageRect.x,imageRect.y,imageRect.w,imageRect.h);
 else{
  ctx.strokeStyle='#314a58';ctx.lineWidth=1;
  for(let k=0;k<12;k++){ctx.beginPath();ctx.moveTo(0,k*h/11);ctx.lineTo(w,k*h/11);ctx.stroke()}
  ctx.textAlign='center';ctx.font='10px system-ui';ctx.fillStyle='#a5bbca';ctx.fillText('ЗАГРУЗИТЕ РЕФЕРЕНС',w/2,25);
 }

 if(posePreview?.anchors){
  ctx.save();ctx.strokeStyle='#f4cf82';ctx.fillStyle='#ffc77f';ctx.lineWidth=1;
  for(const p of Object.values(posePreview.anchors)){
   const x=imageRect.x+p.x*imageRect.w,y=imageRect.y+p.y*imageRect.h;
   ctx.beginPath();ctx.arc(x,y,7,0,Math.PI*2);ctx.stroke();
   ctx.beginPath();ctx.moveTo(x-10,y);ctx.lineTo(x+10,y);ctx.moveTo(x,y-10);ctx.lineTo(x,y+10);ctx.stroke();
  }
  ctx.restore();
 }
 if(!skeletonVisible || !autoPoseReady)return;
 ctx.strokeStyle='#d6f2e6bd';ctx.lineWidth=1.3;
 for(const [a,b] of links){const p=state.anchors[a],q=state.anchors[b];ctx.beginPath();ctx.moveTo(imageRect.x+p.x*imageRect.w,imageRect.y+p.y*imageRect.h);ctx.lineTo(imageRect.x+q.x*imageRect.w,imageRect.y+q.y*imageRect.h);ctx.stroke()}
 for(const [k,p] of Object.entries(state.anchors)){
  const x=imageRect.x+p.x*imageRect.w,y=imageRect.y+p.y*imageRect.h;
  ctx.beginPath();ctx.arc(x,y,k===drag?7:4.8,0,Math.PI*2);ctx.fillStyle=k===drag?'#fff6dd':'#99e0d4';ctx.fill();ctx.strokeStyle='#20353e';ctx.lineWidth=2;ctx.stroke();
  if(k===drag){ctx.font='bold 10px system-ui';ctx.fillStyle='#fff';ctx.textAlign='left';ctx.fillText(compact[k],x+10,y-7)}
 }
}
function normPoint(e){const r=ref.getBoundingClientRect(),x=e.clientX-r.left,y=e.clientY-r.top;return {x,y,nx:clamp((x-imageRect.x)/imageRect.w,.005,.995),ny:clamp((y-imageRect.y)/imageRect.h,.005,.995)}}
ref.addEventListener('pointerdown',e=>{
 const q=normPoint(e);let best=null,d=Infinity;
 for(const [k,p] of Object.entries(state.anchors)){const v=Math.hypot(q.x-(imageRect.x+p.x*imageRect.w),q.y-(imageRect.y+p.y*imageRect.h));if(v<d){d=v;best=k}}
 if(!skeletonVisible||!autoPoseReady||d>Math.max(20,ref.clientWidth*.055))return;
 drag=best;$('#depthJoint').value=best;syncDepthControl();ref.setPointerCapture(e.pointerId);drawRef();
});
ref.addEventListener('pointermove',e=>{if(!drag)return;const q=normPoint(e);state.anchors[drag]={x:q.nx,y:q.ny};drawRef();rig?.update(state,aspect);showStep('edited');if(window.__STUDIO_QA)window.__STUDIO_QA.manualAdjustments=(window.__STUDIO_QA.manualAdjustments||0)+1;if(window.__STUDIO_QA){window.__STUDIO_QA.lastEditedPoint=drag;window.__STUDIO_QA.editCount=(window.__STUDIO_QA.editCount||0)+1}});
for(const ev of ['pointerup','pointercancel'])ref.addEventListener(ev,()=>{drag=null;drawRef()});
// Each imported reference independently determines its own pose.
// Only a hash-verified original uses authored reference coordinates.
// Other images run an opt-in-free, on-device detector; unreliable poses never
// get replaced by unrelated template joints.
function applyAutoplacedJoints(result,token){
 if(token!==autoPoseSequence||!result?.ok)return;
 state.anchors=Object.fromEntries(Object.entries(result.anchors).map(([k,p])=>[k,{x:p.x,y:p.y}]));
 state.depth=Object.fromEntries(keys.map(k=>[k,Number.isFinite(result.depth?.[k])?clamp(result.depth[k],-1,1):0]));
 autoPoseReady=true;autoPoseMethod=result.source;
 baselineAnchors=Object.fromEntries(Object.entries(state.anchors).map(([k,p])=>[k,{...p}]));
 baselineDepth={...state.depth};
 skeletonVisible=false;posePreview=null;
 document.body.classList.add('pose-ready');$('#mobile3D').disabled=false;
 $('#poseDecision').hidden=true;
 const btn=$('#dockPose');btn.disabled=false;btn.textContent='2 · Суставы';
 btn.classList.remove('active');btn.setAttribute('aria-pressed','false');
 $('#refOverlay').textContent='Суставы определены автоматически; включи «Суставы» для проверки.';
 showStep('ready');syncDepthControl();rig?.update(state,aspect);drawRef();
 if(window.__STUDIO_QA){
  window.__STUDIO_QA.poseAutoApplied=true;
  window.__STUDIO_QA.poseAutoplacedSource=result.source;
  window.__STUDIO_QA.poseAutoplacedCount=Object.keys(result.anchors).length;
  window.__STUDIO_QA.poseEstimateCount=result.estimated?.length||0;
  window.__STUDIO_QA.skeletonVisible=false;
 }
 notify(result.source==='approved-manual-annotation'
  ?'14 суставов сопоставлены с утверждённой героиней.'
  :'Поза построена автоматически; некоторые точки приблизительны.');
}
async function autoplaceAfterUpload(file,image,token){
 try{
  let result=await lookupApprovedReference(file);
  if(token!==autoPoseSequence)return;
  if(!result){
   const detection=await analyzeReferenceImage(image);
   if(token!==autoPoseSequence)return;
   if(!detection?.ok||detection.used<10||detection.score<.60)
    throw new Error('Не удалось надёжно определить позу на этом изображении');
   result=completeDetectedPose(detection);
  }
  if(!result)throw new Error('Недостаточно данных для 3D-скелета');
  applyAutoplacedJoints(result,token);
 }catch(err){
  if(token!==autoPoseSequence)return;
  autoPoseReady=false;skeletonVisible=false;
  document.body.classList.remove('pose-ready');$('#mobile3D').disabled=true;
  $('#dockPose').disabled=true;$('#dockPose').textContent='2 · Нет позы';
  $('#refOverlay').textContent='Поза не определена. Попробуй другое изображение или ручную разметку в настройках.';
  showStep('no-pose');drawRef();
  const msg=String(err?.message||err).slice(0,180);
  if(window.__STUDIO_QA){window.__STUDIO_QA.poseAutoApplied=false;window.__STUDIO_QA.poseError=msg}
  notify(msg);
 }
}

function loadImage(file){
 if(!file||!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>20*1024*1024)return notify('Нужен PNG/JPEG/WebP до 20 МБ');
 const url=URL.createObjectURL(file),image=new Image();
 image.onload=()=>{
  const token=++autoPoseSequence;
  if(photoUrl)URL.revokeObjectURL(photoUrl);
  photoUrl=url;photo=image;aspect=image.naturalWidth/image.naturalHeight;$('#ghost').src=url;
  state.anchors=fresh();state.depth=Object.fromEntries(keys.map(k=>[k,0]));
  autoPoseReady=false;skeletonVisible=false;autoPoseMethod='none';posePreview=null;
  baselineAnchors=null;baselineDepth=null;
  document.body.classList.remove('pose-ready');
  $('#welcome').hidden=true;document.body.classList.add('has-reference');showStep('detecting');
  $('#mobile3D').disabled=true;setMobileStage('ref');
  $('#poseDecision').hidden=true;
  $('#dockPose').textContent='2 · Ищем суставы';
  $('#dockPose').setAttribute('aria-pressed','false');
  $('#refOverlay').textContent='Суставы определяются автоматически…';
  drawRef();rig?.update(state,aspect);
  window.__STUDIO_QA.referenceLoaded=true;
  window.__STUDIO_QA.poseAutoApplied=false;
  autoplaceAfterUpload(file,image,token);
 };
 image.onerror=()=>{URL.revokeObjectURL(url);notify('Ошибка чтения файла')};image.src=url;
}
$('#loadRef').onclick=()=>$('#refFile').click();
$('#refFile').onchange=e=>{loadImage(e.target.files?.[0]);e.target.value=''};

function syncDepthControl(){
 const key=$('#depthJoint').value,val=Number(state.depth[key]||0);
 $('#depth').value=String(val);$('#depthVal').textContent=val.toFixed(2);
}
function clearPoseSuggestion(){
 posePreview=null;$('#poseDecision').hidden=true;drawRef();
}
$('#autoPose').onclick=async()=>{
 if(!photo)return notify('Сначала загрузите утверждённый референс');
 if(poseBusy)return;
 poseBusy=true;const b=$('#autoPose');b.disabled=true;b.textContent='АНАЛИЗ…';
 clearPoseSuggestion();notify('Модель MediaPipe загружается. Анализ выполняется на устройстве.');
 try{
  // The original file is never passed to Cloudflare; MediaPipe accesses the in-memory HTMLImageElement.
  const result=await analyzeReferenceImage(photo);
  window.__STUDIO_QA.poseDetectionAttempted=true;
  window.__STUDIO_QA.poseModel=POSE_MODEL_INFO.model;
  window.__STUDIO_QA.poseSuggestedCount=result.used;
  window.__STUDIO_QA.poseSuggestedScore=Number((result.score||0).toFixed(3));
  if(!result.ok){notify(result.reason);$('#poseStatus').textContent=result.reason;return}
  posePreview=result;
  showStep('suggestion');
  $('#poseDecision').hidden=false;
  const percent=Math.round(result.score*100);
  $('#poseStatus').textContent='Предложено '+result.used+' из 14 точек · уверенность ≈'+percent+'%';
  drawRef();notify('Проверьте золотые метки. Принятие — только вручную.');
 }catch(err){
  console.error('POSE_LANDMARKER_ERROR',String(err?.message||err));
  window.__STUDIO_QA.poseError=String(err?.message||err).slice(0,160);
  notify('Автопоза недоступна: ручной редактор продолжает работать.');
 }finally{poseBusy=false;b.disabled=false;b.textContent='АВТО-ПОЗА'}
};
$('#acceptPose').onclick=()=>{
 if(!posePreview?.ok)return;
 // Merge only confident landmarks; do not alter missing/occluded body parts.
 for(const [k,p] of Object.entries(posePreview.anchors))state.anchors[k]={x:p.x,y:p.y};
 for(const [k,v] of Object.entries(posePreview.depth))state.depth[k]=clamp(v,-1,1);
 window.__STUDIO_QA.poseAccepted=true;window.__STUDIO_QA.poseAppliedCount=posePreview.used;
 autoPoseReady=true;autoPoseMethod='manual-mediapipe-accept';
 baselineAnchors=Object.fromEntries(Object.entries(state.anchors).map(([k,p])=>[k,{...p}]));
 baselineDepth={...state.depth};
 document.body.classList.add('pose-ready');$('#mobile3D').disabled=false;
 $('#dockPose').disabled=false;$('#dockPose').textContent='2 · Суставы';
 showStep('edited');
 if(matchMedia('(max-width:700px)').matches)setMobileStage('3d');
 posePreview=null;$('#poseDecision').hidden=true;
 syncDepthControl();drawRef();rig?.update(state,aspect);
 notify('Подсказанные суставы применены. Проверьте и исправьте вручную.');
};
$('#discardPose').onclick=()=>{clearPoseSuggestion();showStep('ready');notify('Автоматические подсказки отклонены. Ручная поза сохранена.')};
$('#depthJoint').onchange=syncDepthControl;
$('#depth').oninput=e=>{
 const key=$('#depthJoint').value;
 state.depth[key]=clamp(Number(e.target.value),-1,1);
 syncDepthControl();rig?.update(state,aspect);
 if(window.__STUDIO_QA){window.__STUDIO_QA.depthEditCount=(window.__STUDIO_QA.depthEditCount||0)+1;window.__STUDIO_QA.lastDepthKey=key}
};
$('#resetDepth').onclick=()=>{
 for(const k of keys)state.depth[k]=0;
 syncDepthControl();rig?.update(state,aspect);notify('Смещения по глубине сброшены');
};
$('#poseCamera').onclick=()=>{
 // Controlled camera framing. No single-image depth or exact intrinsics are inferred.
 state.camera.focal=52;state.camera.zoom=1;state.camera.pitch=.04;
 preset('threequarter');syncUI();notify('Камера приведена к базовому 52 мм · скорректируйте по эталону');
};

function syncUI(){
 for(const k of ['headScale','shoulderScale','hipScale','torsoScale','focal','overlay']){
  let v=k in state.proportions?state.proportions[k]:k==='focal'?state.camera.focal:state.overlay;
  $('#'+k).value=String(v);$('#'+k+'Val').textContent=k==='focal'?Math.round(v)+' мм':k==='overlay'?Math.round(v)+'%':Number(v).toFixed(2);
 }
 $('#wireToggle').checked=state.wireframe;
 syncDepthControl();
 document.querySelectorAll('[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===state.camera.view));
}
function cameraUpdate(){
 if(!camera)return;const c=state.camera,fov=T.MathUtils.radToDeg(2*Math.atan(24/(2*c.focal)));
 camera.fov=fov;camera.updateProjectionMatrix();
 // Fit the full body and extended arms in narrow iPhone side-by-side viewport.
 const span=Math.max(6.50,4.3/Math.max(.28,camera.aspect));
 const distance=span/(2*Math.tan(T.MathUtils.degToRad(fov)/2))*c.zoom;
 const center=new T.Vector3(0,2.28,0);
 camera.position.set(Math.sin(c.yaw)*Math.cos(c.pitch)*distance,center.y+Math.sin(c.pitch)*distance,Math.cos(c.yaw)*Math.cos(c.pitch)*distance);
 camera.lookAt(center);$('#camStat').textContent=Math.round(c.focal)+' MM · PERSPECTIVE';
}
function preset(name){
 const angles={front:0,threequarter:-.36,side:-Math.PI/2,back:Math.PI};
 state.camera.yaw=angles[name]??-.36;state.camera.pitch=.04;state.camera.view=name;cameraUpdate();syncUI();
}
function resize(){
 if(renderer){
  const b=view.getBoundingClientRect(),w=Math.max(1,Math.round(b.width)),h=Math.max(1,Math.round(b.height));
  renderer.setSize(w,h,false);camera.aspect=w/h;cameraUpdate();
 }
 drawRef();
}
function init(){
 try{renderer=new T.WebGLRenderer({canvas:view,antialias:true,preserveDrawingBuffer:true,powerPreference:'high-performance'})}
 catch(e){notify('WebGL недоступен');return}
 renderer.setPixelRatio(Math.min(devicePixelRatio||1,innerWidth<700?1.3:1.7));
 renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.13;
 scene=new T.Scene();scene.add(new T.HemisphereLight(0xc5dfed,0x344656,2.2));
 const sun=new T.DirectionalLight(0xffd9b1,3);sun.position.set(-4,7,5);scene.add(sun);
 const rim=new T.DirectionalLight(0x8fdfd5,2.3);rim.position.set(4,6,-4);scene.add(rim);
 camera=new T.PerspectiveCamera(38,1,.1,100);
 const floor=new T.Mesh(new T.CircleGeometry(2.7,48),new T.MeshBasicMaterial({color:0x93a7ad,transparent:true,opacity:.09,side:T.DoubleSide}));floor.rotation.x=-Math.PI/2;floor.position.y=.01;scene.add(floor);
 const grid=new T.GridHelper(10,20,0x5c7a88,0x587587);grid.material.transparent=true;grid.material.opacity=.10;scene.add(grid);
 rig=createRig(T,scene);rig.update(state,aspect);
 resize();requestAnimationFrame(render);
 window.__STUDIO_QA={version:'0.4.0-auto-joints',webgl:true,poseEditable:true,referenceLocalOnly:true,rigged:false,metrics:rig.metrics(),referenceLoaded:false,exportJSON:true,exportGLB:true,poseDetectionAttempted:false,poseAccepted:false,depthEditCount:0};
}
let frameCount=0,start=performance.now();
function render(t){requestAnimationFrame(render);if(!renderer||document.hidden)return;renderer.render(scene,camera);frameCount++;if(t-start>2000){window.__STUDIO_QA.fpsObserved=Math.round(frameCount*1000/(t-start));frameCount=0;start=t}}
view.addEventListener('pointerdown',e=>{view.setPointerCapture(e.pointerId);last={x:e.clientX,y:e.clientY};touches.set(e.pointerId,last)});
view.addEventListener('pointermove',e=>{
 if(!touches.has(e.pointerId))return;
 if(touches.size>=2){let vs=[...touches.values()],before=Math.hypot(vs[0].x-vs[1].x,vs[0].y-vs[1].y);touches.set(e.pointerId,{x:e.clientX,y:e.clientY});vs=[...touches.values()];const after=Math.hypot(vs[0].x-vs[1].x,vs[0].y-vs[1].y);if(before>4&&after>4){state.camera.zoom=clamp(state.camera.zoom*before/after,.55,2.4);cameraUpdate()}return}
 const dx=e.clientX-last.x,dy=e.clientY-last.y;state.camera.yaw-=dx*.008;state.camera.pitch=clamp(state.camera.pitch+dy*.005,-.4,.5);state.camera.view='custom';last={x:e.clientX,y:e.clientY};touches.set(e.pointerId,last);cameraUpdate();syncUI();
});
for(const ev of ['pointerup','pointercancel'])view.addEventListener(ev,e=>touches.delete(e.pointerId));
view.addEventListener('wheel',e=>{e.preventDefault();state.camera.zoom=clamp(state.camera.zoom*(1+e.deltaY*.0013),.55,2.4);cameraUpdate()},{passive:false});
for(const b of document.querySelectorAll('[data-view]'))b.onclick=()=>preset(b.dataset.view);
for(const k of ['headScale','shoulderScale','hipScale','torsoScale','focal','overlay'])$('#'+k).oninput=e=>{
 const v=Number(e.target.value);if(k in state.proportions){state.proportions[k]=v;rig?.update(state,aspect)}
 else if(k==='focal'){state.camera.focal=v;cameraUpdate()}
 else{state.overlay=v;$('#ghost').style.opacity=String(v/100);document.body.classList.toggle('ghost',v>0&&!!photo)}
 syncUI();
};
$('#ghostToggle').onchange=e=>{if(e.target.checked&&state.overlay===0)state.overlay=35;$('#ghost').style.opacity=String(state.overlay/100);document.body.classList.toggle('ghost',e.target.checked&&!!photo);syncUI()};
$('#wireToggle').onchange=e=>{state.wireframe=e.target.checked;rig?.setWireframe(state.wireframe)};
$('#resetPose').onclick=()=>{state.anchors=baselineAnchors?Object.fromEntries(Object.entries(baselineAnchors).map(([k,p])=>[k,{...p}])):fresh();state.proportions={headScale:.93,shoulderScale:1,hipScale:1,torsoScale:1};state.depth=baselineDepth?{...baselineDepth}:Object.fromEntries(keys.map(k=>[k,0]));clearPoseSuggestion();showStep(autoPoseReady?'ready':'no-reference');syncUI();drawRef();rig?.update(state,aspect);notify(autoPoseReady?'Возвращена автоматически определённая поза':'Поза сброшена')};
$('#resetCamera').onclick=()=>{state.camera.zoom=1;preset('threequarter')};
$('#saveJSON').onclick=()=>{
 const payload={schema:state.schema,anchors:state.anchors,depth:state.depth,poseSource:autoPoseMethod,poseAutoApplied:autoPoseReady,proportions:state.proportions,camera:state.camera,reference:{filename:photo?.src?'local image (not included)':null,width:photo?.naturalWidth||0,height:photo?.naturalHeight||0},notice:'This is unrigged pose geometry, not a finished identity.'};
 save(new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}),'HUMAN_OS_POSE_BLOCKOUT_v1.json');notify('JSON сохранён');
};
$('#loadJSON').onclick=()=>$('#jsonFile').click();
$('#jsonFile').onchange=async e=>{
 const file=e.target.files?.[0];e.target.value='';if(!file||file.size>100000)return notify('Слишком большой JSON');
 try{
  const d=JSON.parse(await file.text());if(d.schema!=='human-os.blockout.v1')throw Error('Неверная версия');
  const a={};for(const k of keys){const p=d.anchors?.[k];if(!p||!Number.isFinite(p.x)||!Number.isFinite(p.y))throw Error('Нет точки '+k);a[k]={x:clamp(p.x,0,1),y:clamp(p.y,0,1)}}
  state.anchors=a;
  autoPoseReady=true;autoPoseMethod='imported-json';skeletonVisible=false;
  document.body.classList.add('pose-ready');$('#mobile3D').disabled=false;
  $('#dockPose').disabled=false;$('#dockPose').textContent='2 · Суставы';
  state.depth=Object.fromEntries(keys.map(k=>[k,Number.isFinite(d.depth?.[k])?clamp(d.depth[k],-1,1):0]));
  baselineAnchors=Object.fromEntries(Object.entries(state.anchors).map(([k,p])=>[k,{...p}]));
  baselineDepth={...state.depth};
  clearPoseSuggestion();
  for(const [k,m] of Object.entries({headScale:[.75,1.2],shoulderScale:[.75,1.35],hipScale:[.75,1.35],torsoScale:[.75,1.25]})){const v=d.proportions?.[k];if(Number.isFinite(v))state.proportions[k]=clamp(v,...m)}
  for(const [k,m] of Object.entries({yaw:[-30,30],pitch:[-.4,.5],zoom:[.55,2.4],focal:[28,85]})){const v=d.camera?.[k];if(Number.isFinite(v))state.camera[k]=clamp(v,...m)}
  state.camera.view='custom';syncUI();drawRef();rig.update(state,aspect);cameraUpdate();notify('Параметры восстановлены');
 }catch(err){notify('Ошибка JSON: '+String(err?.message||err))}
};
$('#savePNG').onclick=()=>{if(!renderer)return notify('WebGL недоступен');renderer.render(scene,camera);renderer.domElement.toBlob(blob=>{if(blob){save(blob,'HUMAN_OS_BLOCKOUT_FRAME.png');notify('PNG сохранён')}},'image/png')};
$('#saveGLB').onclick=async()=>{
 if(!rig)return;const b=$('#saveGLB');b.disabled=true;b.textContent='…';
 try{const bytes=await new GLTFExporter().parseAsync(rig.root,{binary:true,onlyVisible:true,trs:true});if(!(bytes instanceof ArrayBuffer)||bytes.byteLength<1000)throw Error('Пустая модель');save(new Blob([bytes],{type:'model/gltf-binary'}),'HUMAN_OS_POSE_UNRIGGED.glb');window.__STUDIO_QA.glbBytes=bytes.byteLength;notify('GLB сохранён — без скелета')}
 catch(err){console.error('BLOCKOUT_EXPORT',err);notify('GLB: '+String(err?.message||err))}
 finally{b.disabled=false;b.textContent='GLB ↓'}
};
$('#help').onclick=()=>$('#modal').classList.add('show');$('#closeHelp').onclick=()=>$('#modal').classList.remove('show');
window.addEventListener('resize',resize);
const observer=new ResizeObserver(resize);observer.observe(view);observer.observe(ref);
syncUI();drawRef();init();setMobileStage('ref');notify('Готово. Загрузите утверждённый референс.');
