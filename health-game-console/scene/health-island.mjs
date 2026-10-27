// HUMAN OS shared island visual vocabulary, derived from world commit 993b3e19ee46388cb4d0262629c90d39afd9bb47.
// Geometry, palette, canvas stone, vegetation instancing and lighting match the approved island world.
export function mountHealthIsland({host,ids,onSelect,getSelection=()=>ids[0]}){
 const $=s=>document.querySelector(s);
 let R,ready=false,contextReady=true,inView=true;
 const qa=window.__HEALTH_ISLAND_QA={version:'health-island-v0.4',style:'human-os-floating-islands',sourceWorld:'993b3e19ee46388cb4d0262629c90d39afd9bb47',loaded:false,context:{lost:0,restored:0},errors:[]};
 const fallback=err=>{qa.errors.push(String(err));$('#fallback').style.display='grid';$('#render').textContent='2D FALLBACK / 3D НЕДОСТУПЕН';if(R)R.domElement.style.display='none'};
 Promise.race([import('https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js'),new Promise((_,reject)=>setTimeout(()=>reject(Error('3D timeout')),5500))]).then(THREE=>{
 try{
 R=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:'high-performance'});
 R.setPixelRatio(Math.min(devicePixelRatio||1,1.2));R.outputColorSpace=THREE.SRGBColorSpace;R.toneMapping=THREE.ACESFilmicToneMapping;R.toneMappingExposure=1.16;
 const canvas=R.domElement;canvas.setAttribute('aria-label','Трёхмерный остров здоровья HUMAN OS');host.insertBefore(canvas,host.firstChild);
 const S=new THREE.Scene();S.fog=new THREE.FogExp2(0x0b1022,.009);
 const camera=new THREE.PerspectiveCamera(44,1,.1,100);
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
  const p=new THREE.Group();p.position.set(...a.p);S.add(p);let r=i===0?3.35:3.12;rockBase(p,r,a,i);
  // Undergrowth scattered around the landmark, preserving navigable central arena
  const n=mobile?13:24;
  for(let j=0;j<n;j++){let th=rnd()*Math.PI*2,rad=1.55+rnd()*1.14;let x=Math.cos(th)*rad,z=Math.sin(th)*rad,h=.67+rnd()*.36;
   if(i===1 && j%3===0) broad(p,x,z,h,palette.blossom);
   else if(i===4 && j%3===0) broad(p,x,z,h,palette.pine);
   else if(i===3 && j%3===0) continue;
   else pine(p,x,z,h);
  }
  flowerPoints(p,r,[0x90d9bc,0xf3b2d3,0xf5c26a,0x8cdfff,0xbdd9a5,0xe8c892][i]);
  // Landmark architecture per life domain
  if(i===0){
    const terr=cyl(1.72,1.8,.25,palette.cream,p,0,.6,0,42);terr.userData.area=a;allPick.push(terr);
    cyl(1.48,1.48,.08,palette.ocean,p,0,.75,0,44);
    let t=mesh(new THREE.TorusGeometry(1.5,.055,8,64),palette.light,p,0,.82,0);t.rotation.x=Math.PI/2;
    for(let j=0;j<7;j++){let q=j*Math.PI*2/7;cyl(.11,.15,.45,palette.cream,p,Math.cos(q)*1.74,.89,Math.sin(q)*1.74)}
    cyl(.14,.20,1.05,palette.aqua,p,0,1.30,0);sphere(.23,palette.aqua,p,0,1.99,0);for(const q of [-1,1]){const arm=cyl(.055,.07,.72,palette.aqua,p,.27*q,1.43,0);arm.rotation.z=q*.64;const leg=cyl(.075,.095,.71,palette.aqua,p,q*.13,.67,0);leg.rotation.z=q*.19}halo(p,0,2.26,0,2.5,halos[i]);
    for(const q of [-1,1])waterfall(p,q*2.35,r,i);
  }
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

 const p=groups[0],index=0;strataCliffs(p,areas[0],0);
 if(index===0){
   // health: mountain skyline, ice, stepped mineral gardens
   for(let j=0;j<5;j++){let x=-1.9+j*.73,z=-1.0-(j%2)*.48,h=1.3+(j%3)*.69;
     const mountain=mesh(new THREE.ConeGeometry(.57,h,6),volcanic,p,x,.59+h/2,z);mountain.rotation.y=j*.55;
     const cap=mesh(new THREE.ConeGeometry(.26,.4,6),palette.quartz,p,x,.59+h-.15,z);cap.rotation.y=j*.55;
   }
   for(let j=0;j<DETAIL_COUNT;j++){let ang=j*2.399,rad=1.80+(j%3)*.23;const bud=sphere(.08,palette.aqua,p,Math.cos(ang)*rad,.90,Math.sin(ang)*rad)}
   for(let j=0;j<3;j++){const step=cyl(.42+j*.20,.5+j*.22,.11,pearl,p,0,.58+j*.12,1.68-j*.23,12)}
 }
 
 // Seven ivory/gold gate lights retain the existing seven health modules.
 const nodes=ids.map((id,i)=>{const angle=i*Math.PI*2/ids.length;const m=new THREE.MeshStandardMaterial({color:0xffcc9d,emissive:0x5faaa4,emissiveIntensity:.2,metalness:.2,roughness:.3});const n=sphere(.115,m,p,Math.cos(angle)*1.74,1.17,Math.sin(angle)*1.74);n.userData.module=id;return n});
 const select=id=>nodes.forEach(n=>{const active=n.userData.module===id;n.material.color.setHex(active?0x8dfbff:0xffcc9d);n.material.emissiveIntensity=active?.8:.1;n.scale.setScalar(active?1.45:1)});
 window.__healthIslandSelect=select;select(getSelection());
 const points=[];for(let i=0;i<85;i++)points.push((rnd()-.5)*24,(rnd()-.5)*14,-9-rnd()*8);
 const starGeo=new THREE.BufferGeometry();starGeo.setAttribute('position',new THREE.Float32BufferAttribute(points,3));S.add(new THREE.Points(starGeo,new THREE.PointsMaterial({color:0xd4eaff,size:.035,transparent:true,opacity:.55,depthWrite:false})));
 let yaw=.55,pitch=.68,distance=13.2;
 function cam(){camera.position.set(Math.sin(yaw)*Math.cos(pitch)*distance,Math.sin(pitch)*distance-.3,Math.cos(yaw)*Math.cos(pitch)*distance);camera.lookAt(0,-.3,0)}
 function resize(){const w=Math.max(1,host.clientWidth),h=Math.max(1,host.clientHeight);camera.aspect=w/h;camera.updateProjectionMatrix();R.setSize(w,h,false);cam()}
 resize();new ResizeObserver(resize).observe(host);
 new IntersectionObserver(entries=>{inView=entries[0].isIntersecting}).observe(host);
 const pointers=new Map();let movement=0,gesture=false,pinch=0;
 canvas.addEventListener('pointerdown',e=>{pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(pointers.size===1){movement=0;gesture=false}else{gesture=true;pinch=0}canvas.setPointerCapture(e.pointerId)});
 canvas.addEventListener('pointermove',e=>{
  const previous=pointers.get(e.pointerId);if(!previous)return;pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if(pointers.size===2){const [a,b]=[...pointers.values()],d=Math.hypot(a.x-b.x,a.y-b.y);if(pinch)distance=Math.max(9.5,Math.min(18,distance+(pinch-d)*.025));pinch=d;gesture=true;movement=99}
  else{const dx=e.clientX-previous.x;movement+=Math.abs(dx)+Math.abs(e.clientY-previous.y);yaw-=dx*.007}cam();
 });
 const ray=new THREE.Raycaster(),mouse=new THREE.Vector2();
 function end(e,cancel=false){if(!pointers.has(e.pointerId))return;pointers.delete(e.pointerId);pinch=0;if(cancel||gesture||movement>8||pointers.size)return;const b=canvas.getBoundingClientRect();mouse.set((e.clientX-b.left)/b.width*2-1,-((e.clientY-b.top)/b.height*2-1));ray.setFromCamera(mouse,camera);const hit=ray.intersectObjects(nodes)[0];if(hit)onSelect(hit.object.userData.module)}
 canvas.addEventListener('pointerup',e=>end(e));canvas.addEventListener('pointercancel',e=>end(e,true));canvas.addEventListener('lostpointercapture',e=>end(e,true));
 canvas.addEventListener('wheel',e=>{e.preventDefault();distance=Math.max(9.5,Math.min(18,distance+e.deltaY*.015));cam()},{passive:false});
 $('#sceneHome').onclick=()=>{yaw=.55;pitch=.68;distance=13.2;cam()};
 canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();contextReady=false;qa.context.lost++;pointers.clear();$('#render').textContent='ВОССТАНОВЛЕНИЕ 3D'});
 canvas.addEventListener('webglcontextrestored',()=>{contextReady=true;qa.context.restored++;resize();$('#render').textContent='WEBGL / THREE.JS'});
 qa.inspect=()=>({yaw,distance,selected:getSelection(),pointers:pointers.size,drawCalls:R.info.render.calls,triangles:R.info.render.triangles,textures:R.info.memory.textures,contextLost:R.getContext().isContextLost(),markers:nodes.map(n=>{const v=n.getWorldPosition(new THREE.Vector3()).project(camera),b=canvas.getBoundingClientRect();return{id:n.userData.module,x:b.left+(v.x*.5+.5)*b.width,y:b.top+(-v.y*.5+.5)*b.height}})});
 qa.palette={stone:palette.cream.color.getHexString(),ocean:palette.ocean.color.getHexString(),basalt:palette.basalt[0].color.getHexString(),metal:copper.color.getHexString()};
 qa.meshCount=0;S.traverse(o=>{if(o.isMesh)qa.meshCount++});
 const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 function frame(){requestAnimationFrame(frame);if(document.hidden||!contextReady||!inView)return;if(!reduced&&!pointers.size){const t=clock.getElapsedTime();for(const o of animated)if(o.isSprite)o.material.opacity=.88+Math.sin(t*.8)*.1}R.render(S,camera);qa.drawCalls=R.info.render.calls;if(!ready){ready=true;qa.loaded=true;$('#fallback').style.display='none';$('#render').textContent='WEBGL / THREE.JS'}}
 frame();
 }catch(err){fallback(err)}
 }).catch(fallback);
}
