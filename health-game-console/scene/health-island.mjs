// HUMAN OS shared island visual vocabulary, derived from world commit 993b3e19ee46388cb4d0262629c90d39afd9bb47.
// Geometry, palette, canvas stone, vegetation instancing and lighting match the approved island world.
export function mountHealthIsland({host,ids,onSelect,getSelection=()=>ids[0]}){
 const $=s=>document.querySelector(s);
 let R,ready=false,contextReady=true,inView=true;
 const qa=window.__HEALTH_ISLAND_QA={version:'health-character-v0.5',style:'human-os-floating-islands',sourceWorld:'993b3e19ee46388cb4d0262629c90d39afd9bb47',loaded:false,context:{lost:0,restored:0},errors:[]};
 const fallback=err=>{qa.errors.push(String(err));$('#fallback').style.display='grid';$('#render').textContent='2D FALLBACK / 3D НЕДОСТУПЕН';if(R)R.domElement.style.display='none'};
 Promise.race([import('https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js'),new Promise((_,reject)=>setTimeout(()=>reject(Error('3D timeout')),5500))]).then(THREE=>{
 try{
 R=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:'high-performance'});
 R.setPixelRatio(Math.min(devicePixelRatio||1,1.2));R.outputColorSpace=THREE.SRGBColorSpace;R.toneMapping=THREE.ACESFilmicToneMapping;R.toneMappingExposure=1.16;
 const canvas=R.domElement;canvas.setAttribute('aria-label','Персонаж HUMAN OS в стилистике островов');host.insertBefore(canvas,host.firstChild);
 const S=new THREE.Scene();S.fog=new THREE.FogExp2(0x0b1022,.009);
 const camera=new THREE.PerspectiveCamera(40,1,.1,100);
 S.add(new THREE.HemisphereLight(0xc4dafa,0x364565,1.75));const sun=new THREE.DirectionalLight(0xffdbad,3.35);sun.position.set(-8,19,3);S.add(sun);
 const mobile=true,areas=[{id:'health',color:0x59f0e7,p:[0,0,0]}];
const materialCache=new Map();
const mat=(c,metal=0,rough=.65)=>{const k=[c,metal,rough].join(':');if(!materialCache.has(k))materialCache.set(k,new THREE.MeshStandardMaterial({color:c,metalness:metal,roughness:rough}));return materialCache.get(k)};
const allPick=[];const clock=new THREE.Clock(),animated=[];
function mesh(g,m,parent=S,x=0,y=0,z=0){let o=new THREE.Mesh(g,m);o.position.set(x,y,z);parent.add(o);return o}
const cube=(sx,sy,sz,m,p,x,y,z)=>mesh(new THREE.BoxGeometry(sx,sy,sz),m,p,x,y,z);
function cyl(rt,rb,h,m,p,x,y,z,n=9){return mesh(new THREE.CylinderGeometry(rt,rb,h,n),m,p,x,y,z)}
function sphere(r,m,p,x,y,z){return mesh(new THREE.SphereGeometry(r,12,8),m,p,x,y,z)}

const palette={
 basalt:[mat(0x33475d),mat(0x4b5069),mat(0x5c6277)], meadow:[mat(0x4b9076),mat(0x527f65),mat(0x6b8a6a)],
 bark:mat(0x6d4c4b), cream:mat(0xd7be9b), lantern:mat(0xffcc9d,.2,.24),
 coral:mat(0xf4a7b9),blossom:mat(0xeaa0c4),rose:mat(0xdc81ab),
 pine:mat(0x4e9f88), fir:mat(0x367e87), aqua:mat(0x68cbd6,.3,.22),
 ocean:new THREE.MeshStandardMaterial({color:0x2c9aab,metalness:.35,roughness:.17,emissive:0x125266,emissiveIntensity:.5}),
 brick:mat(0x9d8f81),quartz:mat(0xf3dfb0),metal:mat(0x587b96,.5,.28),
 light:new THREE.MeshBasicMaterial({color:0x8dfbff}),white:new THREE.MeshBasicMaterial({color:0xffebc2})
};
let starSeed=23;const rnd=()=>{starSeed=(starSeed*1664525+1013904223)>>>0;return starSeed/4294967296};
function labelGlow(hex){const sprite=document.createElement('canvas');sprite.width=sprite.height=64;const ctx=sprite.getContext('2d');const g=ctx.createRadialGradient(32,32,0,32,32,32);g.addColorStop(0,'rgba(255,255,255,.87)');g.addColorStop(.22,'rgba(170,237,255,.35)');g.addColorStop(1,'rgba(70,170,220,0)');ctx.fillStyle=g;ctx.fillRect(0,0,64,64);const tex=new THREE.CanvasTexture(sprite);return new THREE.SpriteMaterial({map:tex,color:hex,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending})}
const halos=areas.map(a=>labelGlow(a.color));
function halo(p,x,y,z,size,material){const s=new THREE.Sprite(material);s.position.set(x,y,z);s.scale.set(size,size,size);p.add(s);return s}
function pine(p,x,z,h=1.15){(p.userData.pineInstances ||= []).push({x,z,h})}
function broad(p,x,z,h=1,color=palette.pine){cyl(.075,.1,h*.8,palette.bark,p,x,.64,z,6);sphere(h*.45,color,p,x,1.45*h,z);sphere(h*.33,color,p,x-h*.25,1.26*h,z+h*.1);sphere(h*.31,color,p,x+h*.25,1.24*h,z-h*.12)}
function flowerPoints(p,r,color){const pos=[];for(let j=0;j<(mobile?24:52);j++){let a=rnd()*6.283,rad=1.45+rnd()*(r-1.76);pos.push(Math.cos(a)*rad,.61+rnd()*.07,Math.sin(a)*rad)}const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));p.add(new THREE.Points(geo,new THREE.PointsMaterial({color,size:.095,transparent:true,opacity:.89,sizeAttenuation:true})))}
function waterfall(p,a,r,idx){const x=Math.cos(a)*r,z=Math.sin(a)*r;let w=.3+rnd()*.34;let falls=mesh(new THREE.PlaneGeometry(w,3.0,1,6),new THREE.MeshBasicMaterial({color:0x8eeaf7,transparent:true,opacity:.33,side:THREE.DoubleSide,depthWrite:false,blending:THREE.AdditiveBlending}),p,x,-1.0,z);falls.rotation.y=-a+Math.PI/2;let splash=halo(p,x,-2.5,z,.75,halos[idx]);animated.push(splash);return falls}
function stoneWalk(p){const walk=mesh(new THREE.CylinderGeometry(.9,1.1,.15,20),palette.cream,p,0,.59,0);for(let k=0;k<4;k++){let ring=mesh(new THREE.TorusGeometry(.8+k*.1,.012,5,48),palette.light,p,0,.69+k*.012,0);ring.rotation.x=Math.PI/2}}
function rockBase(p,r,a,idx){
  const sides=19;const g=new THREE.CylinderGeometry(r*.97,r*.8,.69,sides,2);
  const ar=g.attributes.position;for(let k=0;k<ar.count;k++){const x=ar.getX(k),y=ar.getY(k),z=ar.getZ(k);const ang=Math.atan2(z,x),s=1+.06*Math.sin(ang*4+idx)+.035*Math.cos(ang*9);ar.setXYZ(k,x*s,y,z*s)}g.computeVertexNormals();
  const solid=mesh(g,palette.basalt[idx%3],p,0,-.04,0);solid.userData.area=a;allPick.push(solid);
  const soil=mesh(new THREE.CylinderGeometry(r*.98,r*.98,.16,30),palette.meadow[idx%3],p,0,.34,0);
  soil.userData.area=a;allPick.push(soil);
  const lip=mesh(new THREE.CylinderGeometry(r*.98,r*.95,.16,26),palette.meadow[(idx+1)%3],p,0,.48,0);lip.userData.area=a;allPick.push(lip);
  const bottom=mesh(new THREE.ConeGeometry(r*.87,3.25,13,2),palette.basalt[(idx+1)%3],p,0,-2.15,0);bottom.rotation.z=Math.PI;bottom.userData.area=a;allPick.push(bottom);
  for(let j=0;j<8;j++){const angle=j*Math.PI/4+.25,rad=r*(.44+.31*rnd()),h=.8+rnd()*1.75;const rock=mesh(new THREE.ConeGeometry(.28+rnd()*.3,h,5),palette.basalt[j%3],p,Math.cos(angle)*rad,-.68-h*.46,Math.sin(angle)*rad);rock.rotation.z=Math.PI}
  for(let j=0;j<5;j++){let angle=(j+.6)*Math.PI*2/5;let edge=sphere(.18+rnd()*.18,palette.basalt[j%3],p,Math.cos(angle)*(r*.88),.48,Math.sin(angle)*(r*.88));edge.scale.y=.7}
  const ribbon=mesh(new THREE.TorusGeometry(r*.98,.017,4,80),new THREE.MeshBasicMaterial({color:a.color,transparent:true,opacity:.65}),p,0,.51,0);ribbon.rotation.x=Math.PI/2;
}
function isle(a,i){
 const p=new THREE.Group();S.add(p);rockBase(p,3.35,a,0);
 cyl(1.72,1.8,.25,palette.cream,p,0,.6,0,42);
 cyl(1.48,1.48,.08,palette.ocean,p,0,.75,0,44);
 for(let j=0;j<5;j++){const angle=3.2+j*.43;pine(p,Math.cos(angle)*2.55,Math.sin(angle)*2.55,.6)}
 return p;
}
const groups=areas.map(isle);
function flushPineInstances(groups){
 const dummy=new THREE.Object3D();
 for(const p of groups){
  const rows=p.userData.pineInstances||[], n=rows.length;if(!n)continue;
  const batches=[
   new THREE.InstancedMesh(new THREE.CylinderGeometry(.06,.09,.58,5),palette.bark,n),
   ...[0,1,2].map(k=>new THREE.InstancedMesh(new THREE.CylinderGeometry(.03,.44-k*.11,.62,7),palette.fir,n))
  ];
  for(const b of batches){b.instanceMatrix.setUsage(THREE.StaticDrawUsage);b.frustumCulled=false;p.add(b)}
  for(let i=0;i<n;i++){
   const v=rows[i];
   dummy.position.set(v.x,.66,v.z);dummy.rotation.set(0,0,0);dummy.scale.set(1,v.h,1);dummy.updateMatrix();batches[0].setMatrixAt(i,dummy.matrix);
   for(let k=0;k<3;k++){dummy.position.set(v.x,1+k*.27,v.z);dummy.scale.set(1,1,1);dummy.updateMatrix();batches[k+1].setMatrixAt(i,dummy.matrix)}
  }
  for(const b of batches)b.instanceMatrix.needsUpdate=true;
  delete p.userData.pineInstances;
 }
}
flushPineInstances(groups);


/* CINEMATIC DETAIL PASS V3 - procedural reusable architectural asset families */
const detailTier=(navigator.hardwareConcurrency||4)<=4||innerWidth<620?'mobile':'desktop';
const DETAIL_COUNT=detailTier==='mobile'?6:11;
const stoneTexture=(()=>{
 const cv=document.createElement('canvas');cv.width=cv.height=128;const ctx=cv.getContext('2d');ctx.fillStyle='#8c90a2';ctx.fillRect(0,0,128,128);
 for(let i=0;i<650;i++){const x=rnd()*128,y=rnd()*128,r=1+rnd()*10;ctx.fillStyle=i%3?'rgba(20,28,47,.11)':'rgba(232,238,249,.07)';ctx.fillRect(x,y,r,r*.4)}
 const tex=new THREE.CanvasTexture(cv);tex.wrapS=tex.wrapT=THREE.RepeatWrapping;tex.repeat.set(2.2,1.4);tex.colorSpace=THREE.SRGBColorSpace;tex.anisotropy=4;return tex;
})();
const volcanic=new THREE.MeshStandardMaterial({color:0x7e91ac,map:stoneTexture,roughness:.86,metalness:.04,flatShading:true});
const darkVolcanic=new THREE.MeshStandardMaterial({color:0x556a88,map:stoneTexture,roughness:.92,flatShading:true});
const copper=new THREE.MeshStandardMaterial({color:0xe6a96d,metalness:.48,roughness:.29});
const pearl=new THREE.MeshStandardMaterial({color:0xe9d4aa,metalness:.07,roughness:.72});
const bronze=new THREE.MeshStandardMaterial({color:0x8f7763,metalness:.36,roughness:.48});
const windowLight=new THREE.MeshBasicMaterial({color:0xffcc8a});
const gardenPink=new THREE.MeshStandardMaterial({color:0xdb89b2,roughness:.93});
const riverGlow=new THREE.MeshBasicMaterial({color:0x92e8ed,transparent:true,opacity:.65,depthWrite:false});
function strataCliffs(p,a,index){
 const N=36;
 for(let band=0;band<3;band++){
  const geo=new THREE.BufferGeometry(),vertices=[],norms=[],colors=[],indices=[];
  const top=.04-band*.69,bot=top-.80,rad=3.02*(1-band*.105);
  for(let j=0;j<=N;j++){let angle=j/N*Math.PI*2,noise=Math.sin(angle*7+index)*.16+Math.cos(angle*13+band)*.10,offset=rad+noise,xb=Math.cos(angle),zb=Math.sin(angle);
   vertices.push(xb*(offset+.18),top+.08*Math.sin(angle*5+band),zb*(offset+.18));
   vertices.push(xb*(offset-.25),bot-.10*Math.sin(angle*9),zb*(offset-.25));
  }
  for(let j=0;j<N;j++){let k=j*2;indices.push(k,k+1,k+2,k+1,k+3,k+2)}
  geo.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geo.setIndex(indices);geo.computeVertexNormals();
  mesh(geo,band%2?darkVolcanic:volcanic,p,0,-.08,0);
 }
 // thin erosion terrace lines
 for(let j=0;j<3;j++){let t=mesh(new THREE.TorusGeometry(2.55-j*.31,.018+j*.004,5,80),new THREE.MeshBasicMaterial({color:j===0?a.color:0x617d96,transparent:true,opacity:j===0?.40:.19}),p,0,-.32-j*.72,0);t.rotation.x=Math.PI/2}
}

 const p=groups[0];strataCliffs(p,areas[0],0);p.scale.set(.62,.42,.62);

 // Faceted, clothed character: identity geometry stays fixed across metric updates.
 const hero=new THREE.Group();hero.position.y=.42;S.add(hero);
 const skin=mat(0xd7be9b,.03,.82),hair=mat(0x33475d,.04,.8),coat=mat(0x356d72,.08,.8),pants=mat(0xa7b7b2,.02,.9),boot=mat(0x33475d,.2,.65),eyeMat=mat(0x152537,.12,.3);
 const upper=new THREE.Group();upper.position.y=1.12;hero.add(upper);
 const torsoGeo=new THREE.LatheGeometry([[.25,0],[.30,.12],[.27,.43],[.34,.70],[.40,.88],[.31,1.03],[.19,1.10]].map(v=>new THREE.Vector2(...v)),12);
 const torso=mesh(torsoGeo,coat,upper,0,0,0);torso.scale.z=.67;
 const torsoBase=new Float32Array(torsoGeo.attributes.position.array);
 const hips=sphere(.29,pants,hero,0,1.05,0);hips.scale.set(1,.6,.67);
 const belt=mesh(new THREE.TorusGeometry(.265,.025,5,24),copper,upper,0,.07,0);belt.rotation.x=Math.PI/2;belt.scale.y=.67;
 const seam=cube(.018,.72,.025,copper,upper,0,.50,.235);
 for(const y of [.32,.55,.78])sphere(.026,pearl,upper,.075,y,.25);
 cyl(.12,.13,.18,skin,upper,0,1.18,0,10);
 const head=new THREE.Group();head.position.set(0,1.49,0);upper.add(head);
 const face=mesh(new THREE.IcosahedronGeometry(.315,2),skin,head);face.scale.set(.87,1.08,.86);
 const hairCap=mesh(new THREE.SphereGeometry(.322,12,7,0,Math.PI*2,0,1.38),hair,head,0,.035,-.012);hairCap.scale.set(.92,1.05,.92);
 const forelock=mesh(new THREE.IcosahedronGeometry(.14,0),hair,head,-.09,.22,.20);forelock.scale.set(1.15,.55,.6);forelock.rotation.z=-.22;
 const eyes=[],brows=[];
 for(const side of [-1,1]){
  eyes.push(sphere(.024,eyeMat,head,side*.105,.015,.265));
  brows.push(cube(.10,.018,.022,hair,head,side*.105,.082,.264));
  const ear=sphere(.057,skin,head,side*.275,-.015,-.005);ear.scale.set(.65,1,.7);
 }
 const nose=mesh(new THREE.ConeGeometry(.050,.135,4),skin,head,0,-.03,.30);nose.rotation.x=Math.PI/2;
 const mouthNeutral=cube(.11,.014,.018,bronze,head,0,-.132,.252);
 const mouthSmile=mesh(new THREE.TorusGeometry(.060,.008,4,12,Math.PI),bronze,head,0,-.105,.257);mouthSmile.rotation.z=Math.PI;
 const arms=[],legs=[],kneeRings=[];
 for(const side of [-1,1]){
  const shoulder=new THREE.Group();shoulder.position.set(side*.385,.88,0);upper.add(shoulder);
  const sleeve=cyl(.13,.105,.50,coat,shoulder,0,-.22,0,10);
  sphere(.10,coat,shoulder,0,-.48,0);
  const forearm=cyl(.10,.082,.42,coat,shoulder,0,-.70,0,10);
  cyl(.088,.088,.045,copper,shoulder,0,-.905,0,10);
  const hand=sphere(.10,skin,shoulder,0,-1.02,.01);hand.scale.set(.72,1.16,.75);
  arms.push({side,pivot:shoulder,sleeve,forearm});
  const leg=new THREE.Group();leg.position.set(side*.16,1,0);hero.add(leg);
  cyl(.135,.12,.43,pants,leg,0,-.20,0,10);
  sphere(.112,pants,leg,0,-.46,0);
  cyl(.115,.095,.39,pants,leg,0,-.68,0,10);
  const shoe=cube(.20,.145,.34,boot,leg,0,-.91,.06);shoe.rotation.y=side*.04;legs.push(leg);
  const ring=mesh(new THREE.TorusGeometry(.14,.013,5,24),new THREE.MeshBasicMaterial({color:0xe6a96d,transparent:true,opacity:0}),leg,0,-.46,.07);kneeRings.push(ring);
 }
 const chestCore=mesh(new THREE.OctahedronGeometry(.065,0),new THREE.MeshStandardMaterial({color:0x68cbd6,emissive:0x68cbd6,emissiveIntensity:.3,metalness:.3,roughness:.25}),upper,-.12,.72,.25);
 const motionRing=mesh(new THREE.TorusGeometry(1.34,.019,5,64),new THREE.MeshBasicMaterial({color:0x8dfbff,transparent:true,opacity:.4}),S,0,.40,0);motionRing.rotation.x=Math.PI/2;
 const sleepRing=mesh(new THREE.TorusGeometry(1.45,.012,5,64,Math.PI*1.4),new THREE.MeshBasicMaterial({color:0xe6a96d,transparent:true,opacity:.3}),S,0,.39,0);sleepRing.rotation.x=Math.PI/2;
 const shadow=mesh(new THREE.CircleGeometry(.62,24),new THREE.MeshBasicMaterial({color:0x0b1022,transparent:true,opacity:.25,depthWrite:false}),S,0,.34,0);shadow.rotation.x=-Math.PI/2;
 const gaitRings=[0,Math.PI].map(angle=>{const o=mesh(new THREE.TorusGeometry(1.08,.012,5,48,Math.PI*.72),new THREE.MeshBasicMaterial({color:0xe6a96d,transparent:true,opacity:.1}),S,0,.405,0);o.rotation.x=Math.PI/2;o.rotation.z=angle;return o});
 const oxygenRing=mesh(new THREE.RingGeometry(1.57,1.59,96,1),new THREE.MeshBasicMaterial({color:0x68cbd6,transparent:true,opacity:.1}),S,0,.38,0);oxygenRing.rotation.x=-Math.PI/2;
 let avatarState={mode:'DEMO',visual:{heightScale:1,bodyWidth:1,waist:1,shoulders:1,energy:.5,mood:.5,knee:null,activity:null,sleep:null,pulseHz:null,breathHz:null,gaitCue:null,gaitTempo:null,oxygen:null}};
 let smooth={...avatarState.visual};
 window.__applyAvatarState=state=>{if(state?.visual){avatarState=state;qa.metricMode=state.mode;qa.identityLocked=true}};
 window.__applyAvatarState(window.__AVATAR_STATE||avatarState);
 function animateCharacter(t,dt,reduced){
  const target=avatarState.visual,k=1-Math.exp(-Math.min(dt,.15)*3);
  for(const name of ['heightScale','bodyWidth','waist','shoulders','energy','mood'])smooth[name]+=(target[name]-smooth[name])*k;
  hero.scale.y=smooth.heightScale;head.scale.y=1/smooth.heightScale;
  upper.rotation.x=(.5-smooth.energy)*.10;
  const pos=torsoGeo.attributes.position;
  for(let i=0;i<pos.count;i++){const y=torsoBase[i*3+1],waistInfluence=1-Math.min(1,y/.65);pos.setX(i,torsoBase[i*3]*smooth.bodyWidth*(1+(smooth.waist-1)*waistInfluence)*(1+(smooth.shoulders-1)*(1-waistInfluence)))}
  pos.needsUpdate=true;torsoGeo.computeVertexNormals();
  hips.scale.x=smooth.bodyWidth*smooth.waist;belt.scale.x=smooth.bodyWidth*smooth.waist;
  arms.forEach(({side,pivot,sleeve,forearm})=>{pivot.position.x=side*.385*smooth.shoulders*smooth.bodyWidth;pivot.rotation.z=side*(.03+smooth.energy*.14);sleeve.scale.x=sleeve.scale.z=smooth.shoulders;forearm.scale.x=forearm.scale.z=smooth.shoulders});
  brows.forEach((b,i)=>b.rotation.z=(i?1:-1)*(.5-smooth.mood)*.12);
  mouthSmile.visible=smooth.mood>.62;mouthNeutral.visible=!mouthSmile.visible;
  eyes.forEach(o=>o.scale.y=.85+smooth.energy*.3);
  kneeRings.forEach(r=>{r.material.opacity=target.knee===null||target.knee===0?0:.12+target.knee*.35});
  torso.scale.y=!reduced&&target.breathHz!==null?1+Math.sin(t*target.breathHz*Math.PI*2)*.009:1;
  chestCore.material.emissiveIntensity=target.pulseHz===null?.12:.30+(!reduced?Math.sin(t*target.pulseHz*Math.PI*2)*.045:0);
  motionRing.material.opacity=target.activity===null?.13:.22+target.activity*.12;
  sleepRing.material.opacity=target.sleep===null?.1:.2+target.sleep*.10;
  gaitRings.forEach((r,i)=>{r.material.opacity=target.gaitCue==null?.1:.16+target.gaitCue*.25;if(!reduced&&target.gaitTempo!=null)r.rotation.z=i*Math.PI+t*(.04+target.gaitTempo*.08)});
  oxygenRing.material.color.setHex(target.oxygen==null?0x587b96:0x68cbd6);oxygenRing.material.opacity=target.oxygen==null?.1:.32;oxygenRing.geometry.setDrawRange(0,target.oxygen==null?oxygenRing.geometry.index.count:Math.floor(oxygenRing.geometry.index.count*target.oxygen/3)*3);
  if(!reduced&&target.activity!==null)motionRing.rotation.z=t*(.07+target.activity*.12);
 }
 // Seven ivory/gold gate lights retain the existing seven health modules.
 const nodes=ids.map((id,i)=>{const angle=i*Math.PI*2/ids.length;const m=new THREE.MeshStandardMaterial({color:0xffcc9d,emissive:0x5faaa4,emissiveIntensity:.2,metalness:.2,roughness:.3});const n=sphere(.115,m,p,Math.cos(angle)*1.74,1.17,Math.sin(angle)*1.74);n.userData.module=id;return n});
 const select=id=>nodes.forEach(n=>{const active=n.userData.module===id;n.material.color.setHex(active?0x8dfbff:0xffcc9d);n.material.emissiveIntensity=active?.8:.1;n.scale.setScalar(active?1.45:1)});
 window.__healthIslandSelect=select;select(getSelection());
 const points=[];for(let i=0;i<85;i++)points.push((rnd()-.5)*24,(rnd()-.5)*14,-9-rnd()*8);
 const starGeo=new THREE.BufferGeometry();starGeo.setAttribute('position',new THREE.Float32BufferAttribute(points,3));S.add(new THREE.Points(starGeo,new THREE.PointsMaterial({color:0xd4eaff,size:.035,transparent:true,opacity:.55,depthWrite:false})));
 let yaw=.40,pitch=.24,distance=9.2;
 function cam(){camera.position.set(Math.sin(yaw)*Math.cos(pitch)*distance,Math.sin(pitch)*distance+.75,Math.cos(yaw)*Math.cos(pitch)*distance);camera.lookAt(0,.75,0)}
 function resize(){const w=Math.max(1,host.clientWidth),h=Math.max(1,host.clientHeight);camera.aspect=w/h;camera.updateProjectionMatrix();R.setSize(w,h,false);cam()}
 resize();new ResizeObserver(resize).observe(host);
 new IntersectionObserver(entries=>{inView=entries[0].isIntersecting}).observe(host);
 const pointers=new Map();let movement=0,gesture=false,pinch=0;
 canvas.addEventListener('pointerdown',e=>{pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(pointers.size===1){movement=0;gesture=false}else{gesture=true;pinch=0}canvas.setPointerCapture(e.pointerId)});
 canvas.addEventListener('pointermove',e=>{
  const previous=pointers.get(e.pointerId);if(!previous)return;pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if(pointers.size===2){const [a,b]=[...pointers.values()],d=Math.hypot(a.x-b.x,a.y-b.y);if(pinch)distance=Math.max(8.8,Math.min(15,distance+(pinch-d)*.025));pinch=d;gesture=true;movement=99}
  else{const dx=e.clientX-previous.x;movement+=Math.abs(dx)+Math.abs(e.clientY-previous.y);yaw-=dx*.007}cam();
 });
 const ray=new THREE.Raycaster(),mouse=new THREE.Vector2();
 function end(e,cancel=false){if(!pointers.has(e.pointerId))return;pointers.delete(e.pointerId);pinch=0;if(cancel||gesture||movement>8||pointers.size)return;const b=canvas.getBoundingClientRect();mouse.set((e.clientX-b.left)/b.width*2-1,-((e.clientY-b.top)/b.height*2-1));ray.setFromCamera(mouse,camera);const hit=ray.intersectObjects(nodes)[0];if(hit)onSelect(hit.object.userData.module)}
 canvas.addEventListener('pointerup',e=>end(e));canvas.addEventListener('pointercancel',e=>end(e,true));canvas.addEventListener('lostpointercapture',e=>end(e,true));
 canvas.addEventListener('wheel',e=>{e.preventDefault();distance=Math.max(8.8,Math.min(15,distance+e.deltaY*.015));cam()},{passive:false});
 $('#sceneHome').onclick=()=>{yaw=.40;pitch=.24;distance=9.2;cam()};
 canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();contextReady=false;qa.context.lost++;pointers.clear();$('#render').textContent='ВОССТАНОВЛЕНИЕ 3D'});
 canvas.addEventListener('webglcontextrestored',()=>{contextReady=true;qa.context.restored++;resize();$('#render').textContent='WEBGL / THREE.JS'});
 qa.inspect=()=>({yaw,distance,selected:getSelection(),headBox:(()=>{const b=canvas.getBoundingClientRect(),points=[[-.34,-.4],[.34,-.4],[-.34,.45],[.34,.45]].map(([x,y])=>head.localToWorld(new THREE.Vector3(x,y,.30)).project(camera));return{top:b.top+(-Math.max(...points.map(v=>v.y))*.5+.5)*b.height,bottom:b.top+(-Math.min(...points.map(v=>v.y))*.5+.5)*b.height}})(),visual:{...smooth,knee:avatarState.visual.knee,activity:avatarState.visual.activity},metricMode:avatarState.mode,pointers:pointers.size,drawCalls:R.info.render.calls,triangles:R.info.render.triangles,textures:R.info.memory.textures,contextLost:R.getContext().isContextLost(),markers:nodes.map(n=>{const v=n.getWorldPosition(new THREE.Vector3()).project(camera),b=canvas.getBoundingClientRect();return{id:n.userData.module,x:b.left+(v.x*.5+.5)*b.width,y:b.top+(-v.y*.5+.5)*b.height}})});
 qa.palette={stone:palette.cream.color.getHexString(),ocean:palette.ocean.color.getHexString(),basalt:palette.basalt[0].color.getHexString(),metal:copper.color.getHexString()};
 qa.meshCount=0;S.traverse(o=>{if(o.isMesh)qa.meshCount++});
 let previousFrame=performance.now();
 const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 function frame(){requestAnimationFrame(frame);const now=performance.now(),dt=(now-previousFrame)/1000;previousFrame=now;if(document.hidden||!contextReady||!inView)return;animateCharacter(clock.getElapsedTime(),dt,reduced);if(!reduced&&!pointers.size){const t=clock.getElapsedTime();for(const o of animated)if(o.isSprite)o.material.opacity=.88+Math.sin(t*.8)*.1}R.render(S,camera);qa.drawCalls=R.info.render.calls;if(!ready){ready=true;qa.loaded=true;$('#fallback').style.display='none';$('#render').textContent='WEBGL / THREE.JS'}}
 frame();
 }catch(err){fallback(err)}
 }).catch(fallback);
}
