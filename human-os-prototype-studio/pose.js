// HUMAN OS: optional on-device pose suggestion. No user image is uploaded.
// MediaPipe performs image inference locally. Its runtime/model are downloaded on demand.
// Output is a DRAFT, never silently replaces a user's manually aligned landmarks.
const pairs={
 ls:11,rs:12,le:13,re:14,lw:15,rw:16,
 lh:23,rh:24,lk:25,rk:26,la:27,ra:28
};
const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
const confidence=p=>p?Number.isFinite(p.visibility)?p.visibility:Number.isFinite(p.presence)?p.presence:.9:0;
const midpoint=(a,b)=>({x:(a.x+b.x)/2,y:(a.y+b.y)/2});
const valid=p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.y);

export function derivePoseSuggestions(landmarks,worldLandmarks=[],threshold=.55){
 if(!Array.isArray(landmarks)||landmarks.length<29)return {ok:false,reason:'Детектор не вернул 33 контрольные точки',anchors:{},depth:{},score:0,used:0};
 const anchors={},depth={},support={},rejected=[];
 const get=(index)=>{const p=landmarks[index];return valid(p)&&confidence(p)>=threshold?p:null};
 const xyz=(index)=>{const p=worldLandmarks?.[index];return p&&Number.isFinite(p.z)?clamp(-p.z*1.2,-.75,.75):null};
 const set=(key,p,indices)=>{
  if(!p){rejected.push(key);return}
  if(p.x<-.12||p.x>1.12||p.y<-.12||p.y>1.12){rejected.push(key);return}
  anchors[key]={x:clamp(p.x,.003,.997),y:clamp(p.y,.003,.997)};
  support[key]=Math.min(...indices.map(i=>confidence(landmarks[i])));
  const nums=indices.map(xyz).filter(Number.isFinite);
  if(nums.length===indices.length)depth[key]=clamp(nums.reduce((a,b)=>a+b,0)/nums.length,-.65,.65);
 };
 for(const [name,index] of Object.entries(pairs))set(name,get(index),[index]);
 const leftS=get(11),rightS=get(12);
 if(leftS&&rightS){
  const sh=midpoint(leftS,rightS),span=Math.hypot(leftS.x-rightS.x,leftS.y-rightS.y);
  set('neck',{x:sh.x,y:sh.y-span*.10},[11,12]);
 }
 const earL=get(7),earR=get(8),nose=get(0);
 if(earL&&earR){
  const pos=midpoint(earL,earR);set('head',{x:pos.x,y:pos.y-.016},[7,8]);
 }else if(nose){
  set('head',{x:nose.x,y:nose.y-.014},[0]);
 }
 // Require stable body core before allowing a "suggestion" to be applied.
 const coreOk=['ls','rs','lh','rh'].every(k=>anchors[k]);
 const used=Object.keys(anchors).length;
 const avgScore=used?Object.keys(anchors).reduce((sum,k)=>sum+support[k],0)/used:0;
 if(!coreOk||used<8)return {ok:false,reason:'Недостаточно надёжно распознано тело. Расставьте точки вручную.',anchors,depth,score:avgScore,used,rejected};
 return {ok:true,anchors,depth,score:avgScore,used,rejected,reason:used<12?'Часть суставов закрыта: проверьте подсказки':'Проверьте положение всех подсказанных суставов'};
}

const VERSION='1.2.2';
const ROOT='https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@'+VERSION;
const MODEL='https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task';
let landmarkerPromise=null;

export async function initializePoseDetector(){
 if(!landmarkerPromise){
  landmarkerPromise=(async()=>{
   const vision=await import(ROOT+'/vision_bundle.mjs');
   if(!vision.FilesetResolver||!vision.PoseLandmarker)throw new Error('MediaPipe API недоступен');
   const fileset=await vision.FilesetResolver.forVisionTasks(ROOT+'/wasm');
   return vision.PoseLandmarker.createFromOptions(fileset,{
    baseOptions:{modelAssetPath:MODEL,delegate:'CPU'},
    runningMode:'IMAGE',numPoses:1,
    minPoseDetectionConfidence:.5,minPosePresenceConfidence:.5,
    minTrackingConfidence:.5
   });
  })().catch(e=>{landmarkerPromise=null;throw e});
 }
 return landmarkerPromise;
}

export async function analyzeReferenceImage(image){
 if(!(image instanceof HTMLImageElement)||!image.complete||!image.naturalWidth)throw new Error('Сначала загрузите изображение');
 const detector=await initializePoseDetector();
 const result=detector.detect(image);
 return derivePoseSuggestions(result?.landmarks?.[0],result?.worldLandmarks?.[0],.55);
}
export const POSE_MODEL_INFO=Object.freeze({provider:'Google MediaPipe',version:VERSION,model:'Pose Landmarker Lite',processing:'on-device',depth:'approximate'});
