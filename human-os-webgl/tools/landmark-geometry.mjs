
const TAU=Math.PI*2;
const add=(a,b)=>a.map((v,i)=>v+b[i]), sub=(a,b)=>a.map((v,i)=>v-b[i]), mul=(a,s)=>a.map(v=>v*s);
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const norm=a=>mul(a,1/(Math.hypot(...a)||1));
function surface(grid,U,V,pos,idx){let off=pos.length/3;for(let u=0;u<=U;u++)for(let v=0;v<=V;v++)pos.push(...grid(u/U,v/V));for(let u=0;u<U;u++)for(let v=0;v<V;v++){const a=off+u*(V+1)+v,b=a+V+1;idx.push(a,b,a+1,b,b+1,a+1)}}
function tube(path,r,U,pos,idx){surface((t,v)=>{const p=path(t),d=norm(sub(path(Math.min(1,t+.001)),path(Math.max(0,t-.001)))),n=norm(cross(d,Math.abs(d[1])>.9?[1,0,0]:[0,1,0])),b=cross(d,n),ang=v*TAU,rr=typeof r==='function'?r(t):r;return add(p,add(mul(n,Math.cos(ang)*rr),mul(b,Math.sin(ang)*rr)))},U,6,pos,idx)}
function b64(bytes){const chars='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';let out='';for(let i=0;i<bytes.length;i+=3){const a=bytes[i],b=bytes[i+1]||0,c=bytes[i+2]||0,n=a*65536+b*256+c;out+=chars[(n>>>18)&63]+chars[(n>>>12)&63]+(i+1<bytes.length?chars[(n>>>6)&63]:'=')+(i+2<bytes.length?chars[n&63]:'=')}return out}
export function buildAsset(id){
 const pos=[],idx=[];
 if(id==='health')for(let j=0;j<8;j++){const a=j*TAU/8;tube(t=>{const angle=(t-.5)*Math.PI;return [Math.cos(a)*(1.58-.25*Math.cos(angle))-Math.sin(a)*.38*Math.sin(angle),.82+1.5*Math.cos(angle),Math.sin(a)*(1.58-.25*Math.cos(angle))+Math.cos(a)*.38*Math.sin(angle)]},.035,16,pos,idx)}
 if(id==='relationships')for(let j=0;j<7;j++){const a=j*2.399;tube(t=>[Math.cos(a)*(.08+1.0*t*t),1.1+2.1*t,Math.sin(a)*(.08+.95*t*t)],t=>.095*(1-.75*t),12,pos,idx)}
 if(id==='projects')for(let j=0;j<3;j++){const a=j*Math.PI/3;tube(t=>{const x=Math.cos(t*TAU)*1.08,y=Math.sin(t*TAU)*1.08;return [x*Math.cos(a),2.07+y,x*Math.sin(a)]},.026,40,pos,idx)}
 if(id==='work'){for(let j=0;j<4;j++){const a=j*Math.PI/2;tube(t=>[Math.cos(a)*(.28*(1-t)),.82+t*3.2,Math.sin(a)*(.28*(1-t))],.028,10,pos,idx)}for(let k=0;k<6;k++){const y=1.15+k*.42,r=.28*(1-k/8);tube(t=>[Math.cos(t*TAU)*r,y,Math.sin(t*TAU)*r],.024,20,pos,idx)}}
 if(id==='personal'){for(const x of [-1.9,-.7])for(const z of [.75,1.75])tube(t=>[x,.72+t*1.05,z],.04,3,pos,idx);for(let j=0;j<7;j++){const z=.7+j*.18;tube(t=>[-1.98+t*1.36,1.84+.12*Math.sin(t*Math.PI),z],.031,10,pos,idx)}}
 if(id==='memory')for(const s of [-1,1])for(let page=0;page<5;page++){const yy=1.12+page*.018;surface((u,v)=>[s*u*.61,yy+.19*Math.sin(u*Math.PI*.72)+.035*Math.sin(v*Math.PI),-.37+v*.74],10,5,pos,idx)}
 const normals=new Float32Array(pos.length);
 for(let i=0;i<idx.length;i+=3){const a=idx[i]*3,b=idx[i+1]*3,c=idx[i+2]*3,n=cross(sub(pos.slice(b,b+3),pos.slice(a,a+3)),sub(pos.slice(c,c+3),pos.slice(a,a+3)));for(const k of [a,b,c])for(let j=0;j<3;j++)normals[k+j]+=n[j]}
 for(let i=0;i<normals.length;i+=3){const n=norm([...normals.slice(i,i+3)]);normals.set(n,i)}
 const p=new Float32Array(pos),indices=new Uint16Array(idx),bytes=new Uint8Array(p.byteLength+normals.byteLength+indices.byteLength);
 bytes.set(new Uint8Array(p.buffer),0);bytes.set(new Uint8Array(normals.buffer),p.byteLength);bytes.set(new Uint8Array(indices.buffer),p.byteLength+normals.byteLength);
 const min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];for(let i=0;i<pos.length;i++) {min[i%3]=Math.min(min[i%3],pos[i]);max[i%3]=Math.max(max[i%3],pos[i])}
 const colors={health:[.55,.70,.66,1],relationships:[.24,.12,.10,1],projects:[.72,.42,.18,1],work:[.26,.44,.57,1],personal:[.54,.40,.25,1],memory:[.83,.72,.51,1]};
 return {asset:{version:'2.0',generator:'Human OS Landmark Studio 0.5',copyright:'Original HUMAN OS project geometry; no third-party models'},scene:0,scenes:[{nodes:[0]}],nodes:[{name:id+'-signature',mesh:0}],meshes:[{name:id+'-signature',primitives:[{attributes:{POSITION:0,NORMAL:1},indices:2,material:0}]}],materials:[{name:id+'-signature-pbr',doubleSided:id==='memory',pbrMetallicRoughness:{baseColorFactor:colors[id],metallicFactor:['work','projects'].includes(id)?.65:.08,roughnessFactor:id==='memory'?.82:.43}}],buffers:[{byteLength:bytes.length,uri:'data:application/octet-stream;base64,'+b64(bytes)}],bufferViews:[{buffer:0,byteOffset:0,byteLength:p.byteLength,target:34962},{buffer:0,byteOffset:p.byteLength,byteLength:normals.byteLength,target:34962},{buffer:0,byteOffset:p.byteLength+normals.byteLength,byteLength:indices.byteLength,target:34963}],accessors:[{bufferView:0,componentType:5126,count:p.length/3,type:'VEC3',min,max},{bufferView:1,componentType:5126,count:normals.length/3,type:'VEC3'},{bufferView:2,componentType:5123,count:indices.length,type:'SCALAR'}],extras:{domain:id,role:'Additive signature detail; approved landmark remains',source:'tools/landmark-geometry.mjs'}};
}
