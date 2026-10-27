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

export function createAvatarModel(THREE,{parent,initialState=null,initialWardrobe="male"}={}){
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
