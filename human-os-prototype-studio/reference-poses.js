// HUMAN OS — authored reference registration (no identity generation).
// The approved heroine was manually annotated from the exact original 941×1672 PNG.
// Anatomically hidden joints are explicitly flagged as estimates.
export const APPROVED_HEROINE=Object.freeze({
 id:'HUMAN_OS_HEROINE_REFERENCE_V1',
 sha256:'023f874b0b00049212cc086ac63d2bbdb2196b2d01fbfb57e4144620be4e7974',
 width:941,height:1672,
 source:'user-approved-original',method:'art-director-authored-14-joints',
 approximate:['re','rw','lh','rh','lk','rk','la','ra'],
 anchors:{
  head:{x:.493092,y:.086124},neck:{x:.488842,y:.147129},
  ls:{x:.364506,y:.179426},rs:{x:.603613,y:.180622},
  le:{x:.314559,y:.267943},re:{x:.666312,y:.279306},
  lw:{x:.231668,y:.251196},rw:{x:.656748,y:.353469},
  lh:{x:.435707,y:.337919},rh:{x:.589798,y:.340909},
  lk:{x:.368757,y:.533493},rk:{x:.523911,y:.543062},
  la:{x:.284803,y:.778110},ra:{x:.499469,y:.778708}
 }
});
export const SKELETON_KEYS=Object.freeze(['head','neck','ls','rs','le','re','lw','rw','lh','rh','lk','rk','la','ra']);

export async function sha256OfBlob(file){
 const raw=await file.arrayBuffer();
 const subtle=globalThis.crypto?.subtle;
 if(!subtle)throw new Error('SHA-256 not available in this browser');
 const digest=await subtle.digest('SHA-256',raw);
 return [...new Uint8Array(digest)].map(v=>v.toString(16).padStart(2,'0')).join('');
}
export async function lookupApprovedReference(file){
 if(!file||file.size>22*1024*1024)return null;
 const sha=await sha256OfBlob(file);
 if(sha!==APPROVED_HEROINE.sha256)return null;
 return {
  ok:true,
  anchors:Object.fromEntries(Object.entries(APPROVED_HEROINE.anchors).map(([k,p])=>[k,{...p}])),
  depth:{},
  source:'approved-manual-annotation',
  confidence:1,used:SKELETON_KEYS.length,
  estimated:[...APPROVED_HEROINE.approximate],
  sourceHash:sha,
  reason:'14 точек выставлены по утверждённому оригиналу; скрытые одеждой суставы оценочные'
 };
}

// Map detection proposals into a full, but provenance-aware, articulated skeleton.
// Never present estimated points as detector findings; do not auto-accept an
// unreliable body core or convert an unsupported profile to verified anatomy.
export function completeDetectedPose(result){
 if(!result?.ok)return null;
 const source=Object.fromEntries(Object.entries(result.anchors||{}).map(([k,p])=>[k,{...p}]));
 const available=new Set(Object.keys(source));
 if(!['ls','rs','lh','rh'].every(k=>available.has(k)))return null;
 const anchors={...source},estimated=[];
 const set=(key,x,y)=>{
  if(anchors[key])return;
  anchors[key]={x:Math.max(.003,Math.min(.997,x)),y:Math.max(.003,Math.min(.997,y))};
  estimated.push(key);
 };
 const mid=(a,b)=>({x:(a.x+b.x)/2,y:(a.y+b.y)/2});
 const sh=mid(anchors.ls,anchors.rs),hips=mid(anchors.lh,anchors.rh);
 const shWidth=Math.abs(anchors.rs.x-anchors.ls.x);
 const coreHeight=Math.max(.12,hips.y-sh.y);
 set('neck',sh.x,sh.y-.015);
 set('head',anchors.neck.x,anchors.neck.y-Math.min(.12,coreHeight*.58));
 for(const side of ['l','r']){
  const shoulder=anchors[side+'s'],elbow=anchors[side+'e'],wrist=anchors[side+'w'];
  const hip=anchors[side+'h'],knee=anchors[side+'k'],ankle=anchors[side+'a'];
  const sign=side==='l'?-1:1;
  if(!elbow)set(side+'e',shoulder.x+sign*shWidth*.34,shoulder.y+coreHeight*.65);
  if(!wrist){
   const e=anchors[side+'e'];
   set(side+'w',e.x+(e.x-shoulder.x)*.55,e.y+coreHeight*.53);
  }
  if(!knee)set(side+'k',hip.x+sign*shWidth*.06,hip.y+coreHeight*1.17);
  if(!ankle){
   const k=anchors[side+'k'];
   set(side+'a',k.x+(k.x-hip.x)*.23,k.y+coreHeight*1.10);
  }
 }
 if(SKELETON_KEYS.some(k=>!anchors[k]))return null;
 return {
  ok:true,anchors,depth:result.depth||{},source:'mediapipe-autopose',
  confidence:Number(result.score||0),used:Number(result.used||0),
  estimated,sourceHash:null,
  reason:estimated.length
   ? 'Автоматическая поза построена; часть закрытых суставов оценочная'
   : 'Автоматическая поза построена по изображению'
 };
}
