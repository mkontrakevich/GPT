const AVATAR_CONTEXTS=Object.freeze({
 health:{title:'Здоровье',outfit:'swim',top:0x2c7886,bottom:0x2c7886},
 work:{title:'Работа',outfit:'work',top:0x33475d,bottom:0x28384a},
 personal:{title:'Личное',outfit:'home',top:0xb9c4af,bottom:0x7e8d8d},
 relationships:{title:'Отношения',outfit:'casual',top:0x416f72,bottom:0x33475d},
 projects:{title:'Проекты',outfit:'studio',top:0x637d8b,bottom:0x33475d},
 memory:{title:'Память',outfit:'casual',top:0x9a8570,bottom:0x33475d}
});
function resolveAvatarContext(input={}){
 const island=Object.hasOwn(AVATAR_CONTEXTS,input.islandId)?input.islandId:'health';
 const role=['neutral','creative','office','hospitality','construction'].includes(input.role)?input.role:'neutral';
 const result={...AVATAR_CONTEXTS[island],islandId:island,role,roleSource:role==='neutral'?'unspecified':'explicit'};
 if(island==='work'&&role==='creative')result.top=0x243340;
 if(island==='work'&&role==='hospitality')result.top=0xe0d6bf;
 if(island==='work'&&role==='construction')result.top=0xc89850;
 return result;
}

function createAvatarModel(THREE,{parent,initialState=null,initialWardrobe="male"}={}){
 const qa={};const materialCache=new Map();
 const mat=(c,metal=0,rough=.65)=>{const k=[c,metal,rough].join(':');if(!materialCache.has(k))materialCache.set(k,new THREE.MeshStandardMaterial({color:c,metalness:metal,roughness:rough}));return materialCache.get(k)};
 function mesh(g,m,p=parent,x=0,y=0,z=0){const o=new THREE.Mesh(g,m);o.position.set(x,y,z);p.add(o);return o}
 const cube=(sx,sy,sz,m,p,x,y,z)=>mesh(new THREE.BoxGeometry(sx,sy,sz),m,p,x,y,z);
 const cyl=(rt,rb,h,m,p,x,y,z,n=12)=>mesh(new THREE.CylinderGeometry(rt,rb,h,n),m,p,x,y,z);
 const sphere=(r,m,p,x=0,y=0,z=0)=>mesh(new THREE.SphereGeometry(r,20,12),m,p,x,y,z);
 const bronze=mat(0x8f7763,.05,.8);
 // Faceted, clothed character: identity geometry stays fixed across metric updates.
 const hero=new THREE.Group();hero.position.y=.42;parent.add(hero);
 const skin=mat(0xd7be9b,.03,.82),hair=mat(0x33475d,.04,.8),coat=mat(0xd7be9b,.03,.82),pants=mat(0xd7be9b,.03,.82),boot=mat(0xd7be9b,.03,.82),eyeMat=mat(0x152537,.12,.3);
 // Elliptical anatomical cross sections: pelvis, iliac crest, waist, ribs, deltoids, neck.
 function loft(rows,segments=24){const vertices=[],index=[];for(const [y,rx,rz,zc=0] of rows)for(let j=0;j<=segments;j++){const a=j/segments*Math.PI*2;vertices.push(Math.sin(a)*rx,y,Math.cos(a)*rz+zc)}for(let i=0;i<rows.length-1;i++)for(let j=0;j<segments;j++){const k=i*(segments+1)+j;index.push(k,k+1,k+segments+1,k+1,k+segments+2,k+segments+1)}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));g.setIndex(index);g.computeVertexNormals();const normals=g.attributes.normal;for(let i=0;i<rows.length;i++){const a=i*(segments+1),b=a+segments,n=new THREE.Vector3(normals.getX(a)+normals.getX(b),normals.getY(a)+normals.getY(b),normals.getZ(a)+normals.getZ(b)).normalize();normals.setXYZ(a,n.x,n.y,n.z);normals.setXYZ(b,n.x,n.y,n.z)}return g}
 const upper=new THREE.Group();upper.position.y=1.43;hero.add(upper);
 const torsoGeo=loft([[-.23,.03,.05],[-.18,.16,.10],[-.10,.27,.17],[0,.30,.18],[.13,.285,.165],[.27,.25,.15],[.42,.265,.175],[.58,.31,.19],[.74,.35,.19],[.87,.36,.165],[.94,.34,.145],[1.02,.20,.11],[1.07,.125,.095],[1.12,.095,.09]]);
 const torso=mesh(torsoGeo,skin,upper,0,0,0);
 const torsoBase=new Float32Array(torsoGeo.attributes.position.array);
 const hips=new THREE.Group();hero.add(hips);
 const swim=mat(0x2c7886,0,.91),swimwear=new THREE.Group();hero.add(swimwear);
 function fabricPatch(back=false){const verts=[],ind=[],N=16,rows=[[1.51,.30,.184,1.40],[1.46,.31,.195,back?.18:.72],[1.34,.29,.19,back?.075:.27],[1.22,.17,.125,back?.07:.25]];
 for(const [y,rx,rz,span] of rows)for(let j=0;j<=N;j++){const a=(j/N*2-1)*span;verts.push(Math.sin(a)*rx,y,(back?-1:1)*Math.cos(a)*rz)}
 for(let i=0;i<rows.length-1;i++)for(let j=0;j<N;j++){const k=i*(N+1)+j;ind.push(k,k+1,k+N+1,k+1,k+N+2,k+N+1)}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));g.setIndex(ind);g.computeVertexNormals();return g}
 const fabricMaterial=new THREE.MeshStandardMaterial({color:0x2c7886,roughness:.91,side:THREE.DoubleSide});
 mesh(fabricPatch(),fabricMaterial,swimwear);mesh(fabricPatch(true),fabricMaterial,swimwear);
 for(const side of [-1,1]){const curve=new THREE.QuadraticBezierCurve3(new THREE.Vector3(side*.295,1.51,.033),new THREE.Vector3(side*.325,1.55,0),new THREE.Vector3(side*.295,1.51,-.033));mesh(new THREE.TubeGeometry(curve,12,.016,5,false),swim,swimwear)}
 const belt=swimwear;
 const bikiniTop=new THREE.Group();upper.add(bikiniTop);
 for(const side of [-1,1]){const cup=sphere(.145,swim,bikiniTop,side*.153,.72,.177);cup.scale.set(1.05,.86,.72);
 const strap=new THREE.QuadraticBezierCurve3(new THREE.Vector3(side*.23,.81,.20),new THREE.Vector3(side*.24,1.0,.02),new THREE.Vector3(side*.23,.79,-.16));mesh(new THREE.TubeGeometry(strap,14,.012,5,false),swim,bikiniTop)}
 cube(.065,.020,.025,swim,bikiniTop,0,.72,.219);
 const backBand=mesh(new THREE.TorusGeometry(.32,.014,5,32),swim,bikiniTop,0,.65,0);backBand.rotation.x=Math.PI/2;backBand.scale.y=.59;
 let wardrobe=initialWardrobe==='female'?'female':'male';bikiniTop.visible=false;
 function setWardrobe(value){wardrobe=value==='female'?'female':'male';applyContext();}

 cyl(.092,.10,.13,skin,upper,0,1.14,0,16);
 const head=new THREE.Group();head.position.set(0,1.38,0);upper.add(head);
 const face=mesh(loft([[-.21,.055,.075,.014],[-.18,.10,.105,.008],[-.12,.137,.125],[0,.16,.145],[.10,.155,.14],[.18,.13,.12],[.225,.075,.075],[.24,.005,.005]],24),skin,head);
 const hairCap=mesh(new THREE.SphereGeometry(.165,20,10,0,Math.PI*2,0,1.52),hair,head,0,.09,-.012);hairCap.scale.set(1,1.08,.97);
 const forelock=mesh(new THREE.IcosahedronGeometry(.065,1),hair,head,-.045,.18,.10);forelock.scale.set(1.3,.45,.9);forelock.rotation.z=-.18;
 const eyes=[],brows=[];
 for(const side of [-1,1]){
  eyes.push(sphere(.011,eyeMat,head,side*.062,.015,.138));
  brows.push(cube(.052,.009,.012,hair,head,side*.062,.055,.137));
  const ear=sphere(.034,skin,head,side*.159,-.005,-.005);ear.scale.set(.55,1,.55);
 }
 const noseGeo=new THREE.BufferGeometry();noseGeo.setAttribute('position',new THREE.Float32BufferAttribute([-.015,.052,.134,.015,.052,.134,0,-.039,.197,-.023,-.051,.145,.023,-.051,.145],3));noseGeo.setIndex([0,2,1,0,3,2,1,2,4,3,4,2]);noseGeo.computeVertexNormals();mesh(noseGeo,skin,head);
 const mouthNeutral=cube(.064,.007,.009,bronze,head,0,-.106,.127);
 const mouthSmile=mesh(new THREE.TorusGeometry(.033,.004,4,12,Math.PI),bronze,head,0,-.094,.13);mouthSmile.rotation.z=Math.PI;
 const arms=[],legs=[],kneeRings=[];
 for(const side of [-1,1]){
  const shoulder=new THREE.Group();shoulder.position.set(side*.345,.84,0);upper.add(shoulder);
  // A continuous deltoid-to-wrist surface replaces disconnected cylinders.
  const arm=mesh(loft([[-.94,.060,.061],[-.88,.068,.070],[-.76,.087,.080],[-.64,.100,.088],[-.54,.088,.082],[-.49,.081,.080],[-.38,.105,.092],[-.23,.118,.105],[-.10,.126,.115],[.01,.09,.09],[.07,.015,.02]],20),skin,shoulder);
  const sleeve=arm,forearm=new THREE.Group();
  const hand=new THREE.Group();hand.position.set(0,-1.025,.015);shoulder.add(hand);
  const palm=mesh(loft([[-.08,.043,.026],[-.04,.050,.029],[.035,.044,.027],[.065,.030,.025]],16),skin,hand);
  for(let finger=0;finger<4;finger++){const f=mesh(loft([[-.12,.010,.010],[-.10,.013,.013],[-.035,.016,.015],[0,.017,.016]],10),skin,hand,(finger-1.5)*.027,-.045,.002);f.scale.y=[.88,1,.94,.72][finger];f.rotation.z=(finger-1.5)*-.025}
  const thumb=mesh(loft([[-.10,.010,.010],[-.07,.017,.016],[0,.025,.023]],10),skin,hand,side*.065,-.015,.01);thumb.rotation.z=side*.52;
  arms.push({side,pivot:shoulder,sleeve,forearm});
  const leg=new THREE.Group();leg.position.set(side*.157,1.35,0);hero.add(leg);
  mesh(loft([[-1.26,.062,.069],[-1.15,.065,.073],[-1.02,.077,.09],[-.84,.101,.112],[-.71,.098,.102],[-.63,.087,.091],[-.56,.096,.10],[-.43,.116,.123],[-.22,.138,.148],[0,.145,.15],[.10,.105,.12]],22),skin,leg);
  const foot=sphere(.105,skin,leg,0,-1.275,.079);foot.scale.set(.70,.48,1.72);foot.rotation.y=side*.055;for(let toe=0;toe<5;toe++){const o=sphere(.023-toe*.002,skin,leg,side*(-.048+toe*.023),-1.282,.225-toe*.008);o.scale.set(.8,.6,1.1)}legs.push(leg);
  const ring=mesh(new THREE.TorusGeometry(.14,.013,5,24),new THREE.MeshBasicMaterial({color:0xe6a96d,transparent:true,opacity:0}),leg,0,-.63,.07);kneeRings.push(ring);
 }

 const topMaterial=mat(0xb9c4af,0,.94).clone(),bottomMaterial=mat(0x7e8d8d,0,.95).clone();
 const topGeo=loft([[.04,.301,.189],[.13,.296,.176],[.27,.261,.161],[.42,.276,.186],[.58,.321,.201],[.74,.361,.201],[.87,.371,.176],[.94,.351,.156],[1.02,.211,.121],[1.07,.136,.106],[1.12,.106,.101]]);
 const topBase=new Float32Array(topGeo.attributes.position.array),top=mesh(topGeo,topMaterial,upper);
 const trouserHip=mesh(loft([[-.225,.045,.065],[-.18,.173,.113],[-.10,.283,.183],[0,.313,.193],[.16,.296,.178]]),bottomMaterial,upper);
 const clothArms=[],clothLegs=[],shoeShells=[];
 arms.forEach(({pivot})=>clothArms.push(mesh(loft([[-.91,.071,.072],[-.76,.098,.091],[-.64,.111,.099],[-.49,.092,.091],[-.38,.116,.103],[-.23,.129,.116],[-.10,.137,.126],[.01,.101,.101],[.07,.026,.031]],20),topMaterial,pivot)));
 legs.forEach(leg=>{clothLegs.push(mesh(loft([[-1.23,.075,.080],[-1.02,.090,.103],[-.84,.114,.125],[-.63,.100,.104],[-.43,.129,.136],[-.22,.151,.161],[0,.158,.163],[.10,.118,.133]],22),bottomMaterial,leg));const shoe=sphere(.112,mat(0x33475d,0,.85),leg,0,-1.275,.08);shoe.scale.set(.78,.53,1.8);shoeShells.push(shoe)});
 const lapels=new THREE.Group();upper.add(lapels);
 const lapelMaterial=mat(0x20333e,0,.88);
 for(const side of [-1,1]){const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute([side*.09,1.04,.13,side*.25,.84,.18,side*.08,.53,.211],3));g.setIndex(side===1?[0,1,2]:[2,1,0]);g.computeVertexNormals();mesh(g,new THREE.MeshStandardMaterial({color:0x20333e,roughness:.88,side:THREE.DoubleSide}),lapels)}
 const helmet=mesh(new THREE.SphereGeometry(.183,20,10,0,Math.PI*2,0,1.6),mat(0xd7be9b,0,.7),head,0,.10,-.01);
 let context=resolveAvatarContext({islandId:'health'});
 function applyContext(){
 const swimming=context.outfit==='swim',work=context.outfit==='work';
 swimwear.visible=swimming;bikiniTop.visible=swimming&&wardrobe==='female';
 top.visible=!swimming;trouserHip.visible=!swimming;topMaterial.color.setHex(context.top);bottomMaterial.color.setHex(context.bottom);
 clothArms.forEach(o=>o.visible=!swimming);clothLegs.forEach(o=>o.visible=!swimming);
 shoeShells.forEach(o=>o.visible=!swimming&&context.outfit!=='home');
 lapels.visible=work&&['office','hospitality','creative'].includes(context.role);
 helmet.visible=work&&context.role==='construction';
 qa.wardrobe=swimming?(wardrobe==='female'?'adult-mini-bikini-thong':'adult-swim-thong'):context.outfit+':'+context.role;
 qa.context={...context};qa.presentation=wardrobe;
 }
 function setIslandContext(input){context=resolveAvatarContext(input);applyContext()}
 setWardrobe(wardrobe);

 const chestCore=mesh(new THREE.CircleGeometry(.026,12),new THREE.MeshStandardMaterial({color:0x68cbd6,emissive:0x68cbd6,emissiveIntensity:.3,metalness:.3,roughness:.25}),upper,-.12,.50,.21);
 const motionRing=mesh(new THREE.TorusGeometry(1.34,.019,5,64),new THREE.MeshBasicMaterial({color:0x8dfbff,transparent:true,opacity:.4}),parent,0,.40,0);motionRing.rotation.x=Math.PI/2;
 const sleepRing=mesh(new THREE.TorusGeometry(1.45,.012,5,64,Math.PI*1.4),new THREE.MeshBasicMaterial({color:0xe6a96d,transparent:true,opacity:.3}),parent,0,.39,0);sleepRing.rotation.x=Math.PI/2;
 const shadow=mesh(new THREE.CircleGeometry(.62,24),new THREE.MeshBasicMaterial({color:0x0b1022,transparent:true,opacity:.25,depthWrite:false}),parent,0,.34,0);shadow.rotation.x=-Math.PI/2;
 const gaitRings=[0,Math.PI].map(angle=>{const o=mesh(new THREE.TorusGeometry(1.08,.012,5,48,Math.PI*.72),new THREE.MeshBasicMaterial({color:0xe6a96d,transparent:true,opacity:.1}),parent,0,.405,0);o.rotation.x=Math.PI/2;o.rotation.z=angle;return o});
 const oxygenRing=mesh(new THREE.RingGeometry(1.57,1.59,96,1),new THREE.MeshBasicMaterial({color:0x68cbd6,transparent:true,opacity:.1}),parent,0,.38,0);oxygenRing.rotation.x=-Math.PI/2;
 let avatarState={mode:'DEMO',visual:{heightScale:1,bodyWidth:1,waist:1,shoulders:1,energy:.5,mood:.5,knee:null,activity:null,sleep:null,pulseHz:null,breathHz:null,gaitCue:null,gaitTempo:null,oxygen:null}};
 let smooth={...avatarState.visual};
 function applyState(state){if(state?.visual){avatarState=state;qa.metricMode=state.mode;qa.identityLocked=true}}
 applyState(initialState||avatarState);
 function animateCharacter(t,dt,reduced){
  const target=avatarState.visual,k=reduced?1:1-Math.exp(-Math.min(dt,.15)*3);
  for(const name of ['heightScale','bodyWidth','waist','shoulders','energy','mood'])smooth[name]+=(target[name]-smooth[name])*k;
  hero.scale.y=smooth.heightScale;head.scale.y=1/smooth.heightScale;
  upper.rotation.x=(.5-smooth.energy)*.10;
  const pos=torsoGeo.attributes.position;
  for(let i=0;i<pos.count;i++){const y=torsoBase[i*3+1],waistInfluence=Math.max(0,1-Math.abs(y-.25)/.45),feminine=wardrobe==='female',shape=feminine?(1-.10*waistInfluence-.04*Math.max(0,(y-.6)/.5)+.04*Math.max(0,-y/.2)):1;pos.setX(i,torsoBase[i*3]*smooth.bodyWidth*(1+(smooth.waist-1)*waistInfluence)*(1+(smooth.shoulders-1)*Math.max(0,(y-.5)/.6))*shape);pos.setZ(i,torsoBase[i*3+2]*(1+(smooth.waist-1)*waistInfluence))}
  pos.needsUpdate=true;torsoGeo.computeVertexNormals();
 const clothPos=topGeo.attributes.position;
 for(let i=0;i<clothPos.count;i++){const y=topBase[i*3+1],w=Math.max(0,1-Math.abs(y-.25)/.45),shape=wardrobe==='female'?(1-.10*w-.04*Math.max(0,(y-.6)/.5)):1;clothPos.setX(i,topBase[i*3]*smooth.bodyWidth*(1+(smooth.waist-1)*w)*(1+(smooth.shoulders-1)*Math.max(0,(y-.5)/.6))*shape);clothPos.setZ(i,topBase[i*3+2]*(1+(smooth.waist-1)*w))}
 clothPos.needsUpdate=true;topGeo.computeVertexNormals();
  trouserHip.scale.x=smooth.bodyWidth;trouserHip.scale.z=1+Math.max(0,smooth.waist-1);
  belt.scale.x=smooth.bodyWidth*(1+(smooth.waist-1)*.3);belt.scale.z=1+(smooth.waist-1)*.3;
  arms.forEach(({side,pivot,sleeve,forearm})=>{pivot.position.x=side*.345*smooth.shoulders*smooth.bodyWidth*(wardrobe==='female'?.95:1);pivot.rotation.z=side*(.03+smooth.energy*.14);sleeve.scale.x=sleeve.scale.z=smooth.shoulders;forearm.scale.x=forearm.scale.z=smooth.shoulders});
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

 return {hero,head,smooth,animateCharacter,applyState,setWardrobe,setIslandContext,inspect:()=>({...qa,visual:{...smooth}}),get state(){return avatarState}};
}

export function mountHealthIsland({host,ids,onSelect,getSelection=()=>ids[0]}){
 const $=s=>document.querySelector(s);
 let R,ready=false,contextReady=true,inView=true;
 const qa=window.__HEALTH_ISLAND_QA={version:'health-character-v0.6',style:'human-os-floating-islands',sourceWorld:'993b3e19ee46388cb4d0262629c90d39afd9bb47',loaded:false,context:{lost:0,restored:0},errors:[]};
 const fallback=err=>{qa.errors.push(String(err));$('#fallback').style.display='grid';$('#render').textContent='2D FALLBACK / 3D НЕДОСТУПЕН';$('#avatarRenderMode').textContent+=' · 2D';if(R)R.domElement.style.display='none'};
 Promise.race([import('https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js'),new Promise((_,reject)=>setTimeout(()=>reject(Error('3D timeout')),5500))]).then(THREE=>{
 try{
 R=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:'high-performance'});
 R.setPixelRatio(Math.min(devicePixelRatio||1,1.2));R.outputColorSpace=THREE.SRGBColorSpace;R.toneMapping=THREE.ACESFilmicToneMapping;R.toneMappingExposure=1.16;
 const canvas=R.domElement;canvas.setAttribute('aria-label','Персонаж HUMAN OS в стилистике островов');host.insertBefore(canvas,host.firstChild);
 const S=new THREE.Scene();S.fog=new THREE.FogExp2(0x0b1022,.009);
 const camera=new THREE.PerspectiveCamera(34,1,.1,100);
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


 const avatar=createAvatarModel(THREE,{parent:S,initialState:window.__AVATAR_STATE});
 const {hero,head,smooth,animateCharacter}=avatar;
 window.__applyAvatarState=state=>{avatar.applyState(state);qa.metricMode=state.mode;qa.identityLocked=true};
 const wardrobeButtons=document.querySelectorAll('[data-wardrobe]');
 wardrobeButtons.forEach(button=>button.addEventListener('click',()=>{avatar.setWardrobe(button.dataset.wardrobe);wardrobeButtons.forEach(b=>b.setAttribute('aria-pressed',String(b===button)));document.querySelector('.fallbackBikini').style.display=button.dataset.wardrobe==='female'?'':'none';qa.wardrobe=avatar.inspect().wardrobe}));
 function changeContext(){avatar.setIslandContext({islandId:document.querySelector('#avatarContext').value,role:document.querySelector('#avatarRole').value});qa.wardrobe=avatar.inspect().wardrobe;qa.avatarContext=avatar.inspect().context;document.querySelector('#avatarRoleLabel').hidden=document.querySelector('#avatarContext').value!=='work'}
 document.querySelector('#avatarContext').value=resolveAvatarContext({islandId:new URL(location.href).searchParams.get('island')}).islandId;
 document.querySelector('#avatarContext').addEventListener('change',changeContext);document.querySelector('#avatarRole').addEventListener('change',changeContext);changeContext();
 // Seven ivory/gold gate lights retain the existing seven health modules.
 const nodes=ids.map((id,i)=>{const angle=i*Math.PI*2/ids.length;const m=new THREE.MeshStandardMaterial({color:0xffcc9d,emissive:0x5faaa4,emissiveIntensity:.2,metalness:.2,roughness:.3});const n=sphere(.115,m,p,Math.cos(angle)*1.74,2.4,Math.sin(angle)*1.74);n.userData.module=id;return n});
 const select=id=>nodes.forEach(n=>{const active=n.userData.module===id;n.material.color.setHex(active?0x8dfbff:0xffcc9d);n.material.emissiveIntensity=active?.8:.1;n.scale.setScalar(active?1.45:1)});
 window.__healthIslandSelect=select;select(getSelection());
 const points=[];for(let i=0;i<85;i++)points.push((rnd()-.5)*24,(rnd()-.5)*14,-9-rnd()*8);
 const starGeo=new THREE.BufferGeometry();starGeo.setAttribute('position',new THREE.Float32BufferAttribute(points,3));S.add(new THREE.Points(starGeo,new THREE.PointsMaterial({color:0xd4eaff,size:.035,transparent:true,opacity:.55,depthWrite:false})));
 let yaw=.18,pitch=.08,distance=6.25;
 function minCameraDistance(){return 5.95+Math.max(0,smooth.heightScale-1)*5.5}
 function cam(){const targetY=.42+1.57*smooth.heightScale;camera.position.set(Math.sin(yaw)*Math.cos(pitch)*distance,Math.sin(pitch)*distance+targetY,Math.cos(yaw)*Math.cos(pitch)*distance);camera.lookAt(0,targetY,0)}
 function resize(){const w=Math.max(1,host.clientWidth),h=Math.max(1,host.clientHeight);camera.aspect=w/h;camera.updateProjectionMatrix();R.setSize(w,h,false);cam()}
 resize();new ResizeObserver(resize).observe(host);
 new IntersectionObserver(entries=>{inView=entries[0].isIntersecting}).observe(host);
 const pointers=new Map();let movement=0,gesture=false,pinch=0;
 canvas.addEventListener('pointerdown',e=>{pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(pointers.size===1){movement=0;gesture=false}else{gesture=true;pinch=0}canvas.setPointerCapture(e.pointerId)});
 canvas.addEventListener('pointermove',e=>{
  const previous=pointers.get(e.pointerId);if(!previous)return;pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if(pointers.size===2){const [a,b]=[...pointers.values()],d=Math.hypot(a.x-b.x,a.y-b.y);if(pinch)distance=Math.max(minCameraDistance(),Math.min(15,distance+(pinch-d)*.025));pinch=d;gesture=true;movement=99}
  else{const dx=e.clientX-previous.x;movement+=Math.abs(dx)+Math.abs(e.clientY-previous.y);yaw-=dx*.007}cam();
 });
 const ray=new THREE.Raycaster(),mouse=new THREE.Vector2();
 function end(e,cancel=false){if(!pointers.has(e.pointerId))return;pointers.delete(e.pointerId);pinch=0;if(cancel||gesture||movement>8||pointers.size)return;const b=canvas.getBoundingClientRect();mouse.set((e.clientX-b.left)/b.width*2-1,-((e.clientY-b.top)/b.height*2-1));ray.setFromCamera(mouse,camera);const hit=ray.intersectObjects(nodes)[0];if(hit)onSelect(hit.object.userData.module)}
 canvas.addEventListener('pointerup',e=>end(e));canvas.addEventListener('pointercancel',e=>end(e,true));canvas.addEventListener('lostpointercapture',e=>end(e,true));
 canvas.addEventListener('wheel',e=>{e.preventDefault();distance=Math.max(minCameraDistance(),Math.min(15,distance+e.deltaY*.015));cam()},{passive:false});
 $('#sceneHome').onclick=()=>{yaw=.18;pitch=.08;distance=Math.max(6.25,minCameraDistance());cam()};
 canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();contextReady=false;qa.context.lost++;pointers.clear();$('#render').textContent='ВОССТАНОВЛЕНИЕ 3D';$('#avatarRenderMode').textContent='ВОССТАНОВЛЕНИЕ 3D'});
 canvas.addEventListener('webglcontextrestored',()=>{contextReady=true;qa.context.restored++;resize();$('#render').textContent='WEBGL / THREE.JS'});
 // Wardrobe is an explicit adult presentation choice, never inferred from health metrics.
 function heroFrame(){hero.updateWorldMatrix(true,true);camera.updateMatrixWorld();const b=canvas.getBoundingClientRect(),box=new THREE.Box3().setFromObject(hero),points=[];for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z])points.push(new THREE.Vector3(x,y,z).project(camera));const top=(-Math.max(...points.map(v=>v.y))*.5+.5)*b.height,bottom=(-Math.min(...points.map(v=>v.y))*.5+.5)*b.height;return{top:b.top+top,bottom:b.top+bottom,pixels:bottom-top,occupancy:(bottom-top)/b.height}}
 qa.inspect=()=>({yaw,distance,heroFrame:heroFrame(),wardrobe:qa.wardrobe,selected:getSelection(),headBox:(()=>{const b=canvas.getBoundingClientRect(),points=[[-.20,-.23],[.20,-.23],[-.20,.26],[.20,.26]].map(([x,y])=>head.localToWorld(new THREE.Vector3(x,y,.18)).project(camera));return{top:b.top+(-Math.max(...points.map(v=>v.y))*.5+.5)*b.height,bottom:b.top+(-Math.min(...points.map(v=>v.y))*.5+.5)*b.height}})(),visual:{...smooth,knee:avatar.state.visual.knee,activity:avatar.state.visual.activity},metricMode:avatar.state.mode,pointers:pointers.size,drawCalls:R.info.render.calls,triangles:R.info.render.triangles,textures:R.info.memory.textures,contextLost:R.getContext().isContextLost(),markers:nodes.map(n=>{const v=n.getWorldPosition(new THREE.Vector3()).project(camera),b=canvas.getBoundingClientRect();return{id:n.userData.module,x:b.left+(v.x*.5+.5)*b.width,y:b.top+(-v.y*.5+.5)*b.height}})});
 qa.palette={stone:palette.cream.color.getHexString(),ocean:palette.ocean.color.getHexString(),basalt:palette.basalt[0].color.getHexString(),metal:copper.color.getHexString()};
 qa.anatomy={model:'adult-proportion-study-v1',headUnits:7.0,continuousLimbs:true,individualFingers:true,clinicalModel:false};
 qa.meshCount=0;S.traverse(o=>{if(o.isMesh)qa.meshCount++});
 let previousFrame=performance.now();
 const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 function frame(){requestAnimationFrame(frame);const now=performance.now(),dt=(now-previousFrame)/1000;previousFrame=now;if(document.hidden||!contextReady||!inView)return;animateCharacter(clock.getElapsedTime(),dt,reduced);if(distance<minCameraDistance())distance=minCameraDistance();cam();if(!reduced&&!pointers.size){const t=clock.getElapsedTime();for(const o of animated)if(o.isSprite)o.material.opacity=.88+Math.sin(t*.8)*.1}R.render(S,camera);qa.drawCalls=R.info.render.calls;if(!ready){ready=true;qa.loaded=true;$('#fallback').style.display='none';$('#render').textContent='WEBGL / THREE.JS'}}
 frame();
 }catch(err){fallback(err)}
 }).catch(fallback);
}
