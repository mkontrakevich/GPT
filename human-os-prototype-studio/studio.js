import * as T from 'three';
import {GLTFExporter} from 'three/addons/exporters/GLTFExporter.js';
import {createRig} from './rig.js';

const $=s=>document.querySelector(s),ref=$('#refCanvas'),view=$('#view');
const keys=['head','neck','ls','rs','le','re','lw','rw','lh','rh','lk','rk','la','ra'];
const defaults={
 head:[.50,.125],neck:[.50,.242],ls:[.386,.276],rs:[.622,.274],
 le:[.292,.392],re:[.712,.39],lw:[.206,.449],rw:[.714,.520],
 lh:[.439,.529],rh:[.581,.53],lk:[.447,.73],rk:[.599,.725],
 la:[.445,.914],ra:[.597,.913]
};
const fresh=()=>Object.fromEntries(keys.map(k=>[k,{x:defaults[k][0],y:defaults[k][1]}]));
const state={schema:'human-os.blockout.v1',anchors:fresh(),proportions:{headScale:.93,shoulderScale:1,hipScale:1,torsoScale:1},camera:{view:'threequarter',yaw:-.36,pitch:.05,zoom:1,focal:52},overlay:0,wireframe:false};
let photo=null,photoUrl=null,aspect=.667,imageRect={x:0,y:0,w:1,h:1},drag=null,renderer,scene,camera,rig,last={x:0,y:0},touches=new Map();
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const compact={head:'Голова',neck:'Шея',ls:'Л. плечо',rs:'П. плечо',le:'Л. локоть',re:'П. локоть',lw:'Л. кисть',rw:'П. кисть',lh:'Л. бедро',rh:'П. бедро',lk:'Л. колено',rk:'П. колено',la:'Л. стопа',ra:'П. стопа'};
const links=[['head','neck'],['neck','ls'],['neck','rs'],['ls','le'],['le','lw'],['rs','re'],['re','rw'],['neck','lh'],['neck','rh'],['lh','rh'],['lh','lk'],['lk','la'],['rh','rk'],['rk','ra']];
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
 if(d>Math.max(20,ref.clientWidth*.055))return;
 drag=best;ref.setPointerCapture(e.pointerId);drawRef();
});
ref.addEventListener('pointermove',e=>{if(!drag)return;const q=normPoint(e);state.anchors[drag]={x:q.nx,y:q.ny};drawRef();rig?.update(state,aspect);if(window.__STUDIO_QA){window.__STUDIO_QA.lastEditedPoint=drag;window.__STUDIO_QA.editCount=(window.__STUDIO_QA.editCount||0)+1}});
for(const ev of ['pointerup','pointercancel'])ref.addEventListener(ev,()=>{drag=null;drawRef()});
function loadImage(file){
 if(!file||!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>20*1024*1024)return notify('Нужен PNG/JPEG/WebP до 20 МБ');
 const url=URL.createObjectURL(file),image=new Image();
 image.onload=()=>{
  if(photoUrl)URL.revokeObjectURL(photoUrl);
  photoUrl=url;photo=image;aspect=image.naturalWidth/image.naturalHeight;$('#ghost').src=url;
  $('#refOverlay').textContent='Перетаскивайте точки на референсе';
  drawRef();rig?.update(state,aspect);notify('Изображение загружено локально');
  window.__STUDIO_QA.referenceLoaded=true;
 };
 image.onerror=()=>{URL.revokeObjectURL(url);notify('Ошибка чтения файла')};image.src=url;
}
$('#loadRef').onclick=()=>$('#refFile').click();
$('#refFile').onchange=e=>{loadImage(e.target.files?.[0]);e.target.value=''};
function syncUI(){
 for(const k of ['headScale','shoulderScale','hipScale','torsoScale','focal','overlay']){
  let v=k in state.proportions?state.proportions[k]:k==='focal'?state.camera.focal:state.overlay;
  $('#'+k).value=String(v);$('#'+k+'Val').textContent=k==='focal'?Math.round(v)+' мм':k==='overlay'?Math.round(v)+'%':Number(v).toFixed(2);
 }
 $('#wireToggle').checked=state.wireframe;
 document.querySelectorAll('[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===state.camera.view));
}
function cameraUpdate(){
 if(!camera)return;const c=state.camera,fov=T.MathUtils.radToDeg(2*Math.atan(24/(2*c.focal)));
 camera.fov=fov;camera.updateProjectionMatrix();
 const distance=6.50/(2*Math.tan(T.MathUtils.degToRad(fov)/2))*c.zoom;
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
 window.__STUDIO_QA={version:'0.1.0',webgl:true,poseEditable:true,referenceLocalOnly:true,rigged:false,metrics:rig.metrics(),referenceLoaded:false,exportJSON:true,exportGLB:true};
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
$('#resetPose').onclick=()=>{state.anchors=fresh();state.proportions={headScale:.93,shoulderScale:1,hipScale:1,torsoScale:1};syncUI();drawRef();rig?.update(state,aspect);notify('Поза сброшена')};
$('#resetCamera').onclick=()=>{state.camera.zoom=1;preset('threequarter')};
$('#saveJSON').onclick=()=>{
 const payload={schema:state.schema,anchors:state.anchors,proportions:state.proportions,camera:state.camera,reference:{filename:photo?.src?'local image (not included)':null,width:photo?.naturalWidth||0,height:photo?.naturalHeight||0},notice:'This is unrigged pose geometry, not a finished identity.'};
 save(new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}),'HUMAN_OS_POSE_BLOCKOUT_v1.json');notify('JSON сохранён');
};
$('#loadJSON').onclick=()=>$('#jsonFile').click();
$('#jsonFile').onchange=async e=>{
 const file=e.target.files?.[0];e.target.value='';if(!file||file.size>100000)return notify('Слишком большой JSON');
 try{
  const d=JSON.parse(await file.text());if(d.schema!=='human-os.blockout.v1')throw Error('Неверная версия');
  const a={};for(const k of keys){const p=d.anchors?.[k];if(!p||!Number.isFinite(p.x)||!Number.isFinite(p.y))throw Error('Нет точки '+k);a[k]={x:clamp(p.x,0,1),y:clamp(p.y,0,1)}}
  state.anchors=a;
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
syncUI();drawRef();init();notify('Готово. Загрузите утверждённый референс.');
