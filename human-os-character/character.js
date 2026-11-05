import * as T from 'three';

const $=s=>document.querySelector(s), canvas=$('#stage'), mobile=innerWidth<700;
let renderer;
try {renderer=new T.WebGLRenderer({canvas,antialias:true,alpha:true,powerPreference:'high-performance'});}
catch(err){$('#loading').hidden=true;$('#error').style.display='flex';throw err}
renderer.outputColorSpace=T.SRGBColorSpace;
renderer.toneMapping=T.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.05;
renderer.setPixelRatio(Math.min(devicePixelRatio||1,mobile?1.45:1.8));
renderer.shadowMap.enabled=false;

const scene=new T.Scene();scene.background=new T.Color(0x1c1a32);
const camera=new T.PerspectiveCamera(35,1,.1,100);
const pivot=new T.Vector3(0,2.22,0);
const hemi=new T.HemisphereLight(0xd5dcff,0x302641,2.1);scene.add(hemi);
const key=new T.DirectionalLight(0xffd3a1,2.6);key.position.set(-3.5,7,5);scene.add(key);
const rim=new T.DirectionalLight(0xe3a5e0,2.0);rim.position.set(2.5,5,-3.5);scene.add(rim);
const cool=new T.DirectionalLight(0x889ce6,.65);cool.position.set(-5,2,-4);scene.add(cool);
const root=new T.Group();root.name='HUMAN_OS_heroine_blockout';root.userData={characterStage:'BLOCKOUT_UNRIGGED',rigged:false,identity:'original-heroine'};scene.add(root);
const lighting={alternate:false};
const getMaterial=(color,extra={})=>new T.MeshStandardMaterial({color,roughness:.79,metalness:.02,...extra});
const lineMat=new T.MeshBasicMaterial({color:0xffd8a7});
const darkline=getMaterial(0x493346);
const skin=getMaterial(0xe8a995,{roughness:.87});
const skinSoft=getMaterial(0xf5baa0,{roughness:.9});
const blush=getMaterial(0xd98b86);
const lips=getMaterial(0xae5666,{roughness:.6});
const eyeWhite=getMaterial(0xffeddd);
const iris=getMaterial(0x8b573b,{roughness:.31});
const irisDark=getMaterial(0x201923);
const brows=getMaterial(0x432632);
const hair=getMaterial(0x49303d,{roughness:.95});
const hairDeep=getMaterial(0x302437,{roughness:1});
const hairLight=getMaterial(0x86515a,{roughness:.76});
const hairAmber=getMaterial(0xaa6a60,{roughness:.72});
const pearl=getMaterial(0xdad2d3,{metalness:.2,roughness:.38});
const metallic=getMaterial(0x997c78,{metalness:.7,roughness:.29});
const gold=getMaterial(0xd6aa82,{metalness:.7,roughness:.27});
const glowing=new T.MeshBasicMaterial({color:0xffc58f});
const shadow=getMaterial(0x5e5068);
let seed=84;const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296};

function paint(a,b,kind='fabric'){
 const c=document.createElement('canvas');c.width=c.height=256;
 const g=c.getContext('2d');const grad=g.createLinearGradient(0,0,256,256);
 grad.addColorStop(0,a);grad.addColorStop(.53,b);grad.addColorStop(1,a);
 g.fillStyle=grad;g.fillRect(0,0,256,256);
 if(kind!=='skin'){
   for(let i=0;i<190;i++){
    const x=rand()*280-10,y=rand()*280-10,len=8+rand()*50,thick=1+rand()*7;
    g.fillStyle=i%3?'rgba(249,229,223,.055)':'rgba(40,34,59,.075)';
    g.beginPath();g.moveTo(x,y);g.lineTo(x+len*.7,y-len*.3);g.lineTo(x+len*.7+thick,y-len*.3+thick);g.lineTo(x+thick,y+thick);g.closePath();g.fill();
   }
 }else{
   for(let i=0;i<130;i++){g.fillStyle=i%3?'rgba(255,216,189,.06)':'rgba(139,68,75,.047)';g.fillRect(rand()*256,rand()*256,1+rand()*3,1+rand()*3)}
 }
 const tex=new T.CanvasTexture(c);tex.colorSpace=T.SRGBColorSpace;tex.wrapS=tex.wrapT=T.RepeatWrapping;
 tex.anisotropy=4;return tex;
}
const coat=getMaterial(0xf0e8e4,{map:paint('#cfc9d2','#a7a3b2'),side:T.DoubleSide,roughness:.92});
const coatLight=getMaterial(0xffe6d7,{map:paint('#e4d5d1','#b7b2c1'),side:T.DoubleSide,roughness:.83});
const coatLining=getMaterial(0x62506c,{map:paint('#85708a','#52475e'),side:T.DoubleSide,roughness:.97});
const pants=getMaterial(0xcac3c3,{map:paint('#c1b7b8','#9a929c'),roughness:.93});
const pantsShadow=getMaterial(0x998d9c,{map:paint('#a89a9e','#807e8f')});
const top=getMaterial(0xffece8,{map:paint('#eee2d7','#c9c3d0')});
const boot=getMaterial(0xf5ddd0,{map:paint('#ece0d2','#c3b9be'),roughness:.78});
const rubber=getMaterial(0xcbb4ad,{roughness:.83});
const belt=getMaterial(0x565063,{roughness:.7});
const outline=new T.MeshBasicMaterial({color:0x292338,side:T.BackSide});
const globe=new T.SphereGeometry(1,24,16);
const mesh=(geo,mat,parent=root)=>{const o=new T.Mesh(geo,mat);parent.add(o);return o};
function ball(parent,x,y,z,sx,sy,sz,mat){let o=mesh(globe,mat,parent);o.position.set(x,y,z);o.scale.set(sx,sy,sz);return o}
function box(parent,x,y,z,w,h,d,mat,ang=0){const o=mesh(new T.BoxGeometry(w,h,d),mat,parent);o.position.set(x,y,z);o.rotation.z=ang;return o}
function tube(parent,coords,r,mat,seg=28){const pts=coords.map(p=>new T.Vector3(...p));const c=new T.CatmullRomCurve3(pts);const o=mesh(new T.TubeGeometry(c,seg,r,6,false),mat,parent);return o}
function tapered(parent,pts,rs,mat,side=12){
 const path=new T.CatmullRomCurve3(pts.map(p=>new T.Vector3(...p)));
 const n=Math.max(10,pts.length*7),frames=path.computeFrenetFrames(n,false),positions=[],uv=[],ind=[];
 for(let i=0;i<=n;i++){
   const t=i/n,k=Math.min(rs.length-2,Math.floor(t*(rs.length-1))),frac=t*(rs.length-1)-k;
   const r=rs[k]*(1-frac)+rs[k+1]*frac,center=path.getPointAt(t);
   for(let j=0;j<=side;j++){
     const ang=j/side*Math.PI*2,p=new T.Vector3().copy(frames.normals[i]).multiplyScalar(Math.cos(ang)*r).addScaledVector(frames.binormals[i],Math.sin(ang)*r).add(center);
     positions.push(p.x,p.y,p.z);uv.push(j/side,t);
     if(i<n&&j<side){const a=i*(side+1)+j,b=a+side+1;ind.push(a,b,a+1,b,b+1,a+1)}
   }
 }
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(ind);g.computeVertexNormals();return mesh(g,mat,parent);
}
function loft(parent,rings,mat,segments=20,from=0,to=2*Math.PI){
 const p=[],uv=[],indices=[];const open=Math.abs(to-from)<Math.PI*2-.01;
 for(let i=0;i<rings.length;i++){
  const r=rings[i];
  for(let j=0;j<=segments;j++){
   const t=j/segments,ang=from+(to-from)*t;
   const xx=r.x+Math.sin(ang)*r.rx,zz=r.z+Math.cos(ang)*r.rz;
   p.push(xx,r.y+(r.undulate||0)*Math.sin(ang*3+r.phase||0),zz);uv.push(t,i/(rings.length-1));
   if(i<rings.length-1&&j<segments){let a=i*(segments+1)+j,b=a+segments+1;indices.push(a,b,a+1,b,b+1,a+1)}
  }
 }
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();return mesh(g,mat,parent);
}
function panel(parent,rows,mat){
 // rows: [x1,y1,z1, x2,y2,z2] for opposing fabric edges; doubled so both sides are lit
 const pos=[],uv=[],ids=[];
 rows.forEach((r,i)=>{pos.push(...r.slice(0,3),...r.slice(3,6));uv.push(0,i/(rows.length-1),1,i/(rows.length-1));if(i<rows.length-1){const k=i*2;ids.push(k,k+2,k+1,k+1,k+2,k+3)}});
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(ids);g.computeVertexNormals();return mesh(g,mat,parent);
}
function ring(parent,x,y,z,rx,rz,thick,mat){
 const points=[];for(let j=0;j<=64;j++){let a=j/64*Math.PI*2;points.push([x+Math.sin(a)*rx,y,z+Math.cos(a)*rz])}
 return tube(parent,points,thick,mat,64);
}

// Actor-specific movable groups, never a 2D billboard
const torso=new T.Group(),head=new T.Group(),coatMotion=new T.Group();
root.add(torso);torso.add(head);root.add(coatMotion);
torso.position.y=0;head.position.set(0,3.37,.02); // local head anatomy uses head-relative coordinates

// Tailored cargo trousers with asymmetrical drape, purposeful seam work
for(const side of [-1,1]){
 const xx=side*.285;
 loft(root,[
  {x:xx,y:2.21,z:0,rx:.28,rz:.235},{x:xx+side*.015,y:1.92,z:0,rx:.315,rz:.25},
  {x:xx+side*.027,y:1.47,z:.01,rx:.253,rz:.223},{x:xx+side*.015,y:1.08,z:.065,rx:.255,rz:.23},
  {x:xx+side*.037,y:.56,z:.045,rx:.232,rz:.213},{x:xx+side*.026,y:.43,z:.01,rx:.155,rz:.17}
 ],pants,18);
 for(const y of [1.88,1.20,.77])tube(root,[[xx-side*.24,y+.03,.12],[xx-side*.12,y-.03,.24],[xx+side*.13,y+.015,.22]],.014,pantsShadow,10);
 box(root,xx+side*.20,1.65,.09,.25,.33,.14,pantsShadow,side*.04);
 box(root,xx+side*.20,1.65,.167,.21,.26,.04,pants,side*.04);
 tube(root,[[xx+side*.14,1.83,.22],[xx+side*.31,1.77,.18],[xx+side*.32,1.55,.17]],.025,metallic,15);
 // long modular belt strap with buckle
 box(root,xx+side*.11,1.39,.225,.27,.074,.045,belt,side*.05);
 box(root,xx+side*.20,1.39,.258,.12,.09,.02,gold);
 // boots, layered midsole and leather panels
 ball(root,xx,.205,.17,.23,.18,.385,boot);
 ball(root,xx,.112,.24,.285,.095,.49,rubber);
 ball(root,xx,.27,.05,.195,.23,.24,boot);
 ball(root,xx,.13,.17,.246,.07,.40,boot);
 box(root,xx,.31,.27,.28,.18,.07,metallic);
 for(let y of [.22,.30,.38])tube(root,[[xx-.10,y,.32],[xx,y+.015,.345],[xx+.10,y,.32]],.010,pearl,10);
 const triangle=new T.Shape();triangle.moveTo(0,.075);triangle.lineTo(.068,-.05);triangle.lineTo(-.068,-.05);triangle.closePath();
 const icon=mesh(new T.ShapeGeometry(triangle),glowing,root);icon.position.set(xx,.40,.312);
 // loose cuff above boots
 ring(root,xx,.47,.025,.183,.185,.023,pearl);
}

// Belt and top dress form
loft(torso,[{x:0,y:2.1,z:0,rx:.43,rz:.27},{x:0,y:2.29,z:0,rx:.39,rz:.22},{x:0,y:2.57,z:0,rx:.39,rz:.24},{x:0,y:2.95,z:0,rx:.50,rz:.31},{x:0,y:3.17,z:-.02,rx:.55,rz:.25}],top,28);
ring(root,0,2.24,0,.43,.278,.061,belt);
box(root,0,2.24,.30,.18,.132,.045,gold);box(root,0,2.24,.324,.125,.08,.02,belt);
for(const sx of [-1,1]){
 const breast=ball(torso,sx*.23,2.97,.26,.178,.20,.105,top);breast.rotation.z=sx*.07;
 // painted textile seam around torso
 tube(torso,[[sx*.43,3.12,.10],[sx*.42,2.88,.23],[sx*.36,2.57,.22],[sx*.34,2.34,.19]],.015,coatLining,26);
}
tube(torso,[[-.40,3.16,.22],[-.18,3.09,.32],[0,3.04,.36],[.18,3.09,.32],[.40,3.16,.22]],.020,pearl);
// chest luminous sigil: restrained original triangular Y
tube(torso,[[0,3.05,.369],[0,2.87,.395],[0,2.70,.368]],.012,glowing,16);
tube(torso,[[-.125,2.98,.37],[0,2.87,.395],[.125,2.98,.37]],.014,glowing,12);
ball(torso,0,3.34,-.018,.138,.18,.135,skin);

// Sculpted base face with hand-painted expressive features, curved onto real 3D mesh
const H=head;
ball(H,0,.47,0,.319,.425,.267,skin);
// The oval skull itself forms the jaw; avoid a protruding chin sphere obscuring painted lips.
for(const sx of [-1,1]){
 ball(H,sx*.31,.43,-.04,.061,.112,.050,skinSoft);
}
function paintFace(){
 const c=document.createElement('canvas');c.width=512;c.height=768;
 const g=c.getContext('2d');
 const soft=(x,y,r,c0,c1)=>{const a=g.createRadialGradient(x,y,0,x,y,r);a.addColorStop(0,c0);a.addColorStop(1,c1);g.fillStyle=a;g.fillRect(x-r,y-r,r*2,r*2)};
 soft(120,471,145,'rgba(179,76,83,.21)','rgba(160,71,79,0)');
 soft(391,471,145,'rgba(179,76,83,.21)','rgba(160,71,79,0)');
 // broad angular painterly planes, colored by hand rather than procedural noise
 g.fillStyle='rgba(133,64,76,.18)';
 g.beginPath();g.moveTo(42,310);g.lineTo(84,408);g.lineTo(122,488);g.lineTo(58,457);g.closePath();g.fill();
 g.beginPath();g.moveTo(470,305);g.lineTo(436,403);g.lineTo(395,482);g.lineTo(463,445);g.closePath();g.fill();
 g.fillStyle='rgba(255,218,193,.16)';
 g.beginPath();g.moveTo(86,397);g.lineTo(182,429);g.lineTo(120,459);g.closePath();g.fill();
 g.beginPath();g.moveTo(427,399);g.lineTo(338,426);g.lineTo(396,461);g.closePath();g.fill();
 for(let i=0;i<24;i++){
  const x=66+rand()*380,y=388+rand()*160;
  g.fillStyle=i%3?'rgba(150,75,75,.13)':'rgba(226,171,144,.22)';
  g.fillRect(x,y,2+rand()*4,1+rand()*2);
 }
 // all face elements intentionally use asymmetry and tapered painterly strokes
 for(const side of [-1,1]){
  const cx=256+side*133, y=327;
  g.save();g.translate(cx,y);g.rotate(-side*.045);
  // soft orbital shadow
  g.fillStyle='rgba(116,60,78,.24)';g.beginPath();g.ellipse(0,8,87,47,0,0,Math.PI*2);g.fill();
  // natural almond eye
  g.beginPath();g.moveTo(-80,1);g.bezierCurveTo(-42,-47,41,-47,80,0);g.bezierCurveTo(42,37,-41,40,-80,1);g.closePath();
  g.fillStyle='#f3ddd1';g.fill();
  g.save();g.clip();
  g.fillStyle='#8d6456';g.beginPath();g.arc(5,7,38,0,Math.PI*2);g.fill();
  g.fillStyle='#3b2935';g.beginPath();g.arc(5,7,25,0,Math.PI*2);g.fill();
  g.fillStyle='#170f20';g.beginPath();g.arc(7,5,16,0,Math.PI*2);g.fill();
  g.fillStyle='rgba(255,255,235,.94)';g.beginPath();g.ellipse(-7,-9,9,11,.4,0,Math.PI*2);g.fill();
  g.fillStyle='rgba(255,234,207,.5)';g.beginPath();g.ellipse(22,19,5,5,0,0,Math.PI*2);g.fill();
  g.restore();
  // upper eyeliner with natural diminishing tails
  g.strokeStyle='#402733';g.lineCap='round';g.lineWidth=9;g.beginPath();
  g.moveTo(-78,0);g.bezierCurveTo(-30,-43,36,-48,77,-6);g.stroke();
  g.lineWidth=3;g.beginPath();g.moveTo(73,-4);g.lineTo(91,-19);g.stroke();
  g.strokeStyle='rgba(114,58,68,.55)';g.lineWidth=3;g.beginPath();
  g.moveTo(-55,24);g.quadraticCurveTo(12,55,61,23);g.stroke();
  // eyebrow painted as a sharp varied-width taper
  g.fillStyle='#54323d';g.beginPath();g.moveTo(-67,-127);
  g.bezierCurveTo(-30,-145,24,-143,66,-118);
  g.lineTo(65,-110);g.bezierCurveTo(22,-123,-24,-130,-70,-117);g.closePath();g.fill();
  g.restore();
 }
 // central nose: angular light, brush-like shadow, tiny nostril arcs
 g.fillStyle='rgba(250,214,186,.39)';g.beginPath();g.moveTo(248,339);g.lineTo(270,340);g.lineTo(265,482);g.lineTo(251,491);g.closePath();g.fill();
 g.fillStyle='rgba(122,63,72,.23)';g.beginPath();g.moveTo(239,399);g.lineTo(246,466);g.lineTo(236,487);g.closePath();g.fill();
 g.strokeStyle='rgba(124,64,75,.66)';g.lineWidth=4;g.lineCap='round';
 g.beginPath();g.moveTo(226,493);g.quadraticCurveTo(234,487,241,494);g.moveTo(274,494);g.quadraticCurveTo(284,488,291,494);g.stroke();
 soft(257,496,56,'rgba(249,216,194,.30)','rgba(239,174,153,0)');
 // upper lip Cupid's bow and soft lower lip
 g.fillStyle='#b26570';g.beginPath();g.moveTo(178,611);
 g.quadraticCurveTo(215,599,232,596);g.quadraticCurveTo(244,602,256,604);
 g.quadraticCurveTo(268,602,279,596);g.quadraticCurveTo(300,599,336,611);
 g.quadraticCurveTo(291,626,255,619);g.quadraticCurveTo(220,626,178,611);g.fill();
 g.fillStyle='#d58d8c';g.beginPath();g.moveTo(190,620);
 g.quadraticCurveTo(247,652,325,620);g.quadraticCurveTo(280,672,244,666);
 g.quadraticCurveTo(209,661,190,620);g.fill();
 g.strokeStyle='rgba(91,42,57,.56)';g.lineWidth=3;g.beginPath();g.moveTo(193,620);g.quadraticCurveTo(253,634,321,620);g.stroke();
 g.fillStyle='rgba(255,214,199,.63)';g.fillRect(224,652,59,3);
 // paint fades naturally at the 3D mesh borders; does not form a flat facial card
 g.globalCompositeOperation='destination-in';
 const mask=g.createRadialGradient(256,380,170,256,380,390);
 mask.addColorStop(0,'rgba(255,255,255,1)');mask.addColorStop(.68,'rgba(255,255,255,.98)');
 mask.addColorStop(1,'rgba(255,255,255,0)');
 g.fillStyle=mask;g.fillRect(0,0,512,768);g.globalCompositeOperation='source-over';
 const tex=new T.CanvasTexture(c);tex.colorSpace=T.SRGBColorSpace;tex.anisotropy=4;return tex;
}
const faceTexture=paintFace();
const faceMat=new T.MeshBasicMaterial({map:faceTexture,transparent:true,depthWrite:false,side:T.DoubleSide,polygonOffset:true,polygonOffsetFactor:-2});
const facePos=[],faceUV=[],faceInd=[],W=22,N=38;
for(let i=0;i<=N;i++){
 const y=.125+i/N*.745;
 for(let j=0;j<=W;j++){
  const x=-.304+j/W*.608;
  const nx=x/.319,ny=(y-.47)/.425;
  const z=.267*Math.sqrt(Math.max(.04,1-nx*nx-ny*ny))+.014;
  facePos.push(x,y,z);faceUV.push(j/W,i/N);
  if(i<N&&j<W){const a=i*(W+1)+j,b=a+W+1;faceInd.push(a,b,a+1,b,b+1,a+1)}
 }
}
const faceGeo=new T.BufferGeometry();faceGeo.setAttribute('position',new T.Float32BufferAttribute(facePos,3));faceGeo.setAttribute('uv',new T.Float32BufferAttribute(faceUV,2));faceGeo.setIndex(faceInd);faceGeo.computeVertexNormals();mesh(faceGeo,faceMat,H);
// small 3D nose tip adds parallax at 3/4 view without alien spherical eyes
ball(H,0,.390,.263,.038,.057,.039,skinSoft);
// Hair skull cap and handcrafted clumps (no particle-card hair)
ball(H,0,.760,-.063,.358,.342,.300,hairDeep);
ball(H,.075,.995,-.08,.28,.18,.27,hair);
ball(H,-.17,.951,-.10,.16,.15,.20,hair);
const strandArray=[
 [[-.29,.92,.16],[-.20,1.04,.13],[-.04,1.08,.14],[.17,1.02,.13]],
 [[-.25,.92,.18],[-.12,1.00,.22],[.10,.999,.19],[.32,.875,.12]],
 [[-.27,.92,.02],[-.25,1.02,.11],[-.12,1.07,.20],[.08,1.02,.24]],
 [[.05,1.04,.22],[.25,1.00,.23],[.39,.89,.12],[.39,.76,.02]],
 [[-.14,1.04,-.01],[.18,1.05,-.10],[.37,.88,-.20]],
 [[-.33,.84,.07],[-.37,.76,.12],[-.31,.61,.20],[-.32,.44,.20]],
 [[.35,.84,.12],[.39,.72,.15],[.33,.53,.23],[.30,.38,.25]],
 [[-.35,.84,-.07],[-.39,.63,-.15],[-.35,.36,-.05]],
 [[.38,.81,-.06],[.43,.64,-.12],[.35,.34,-.15]],
 [[-.10,.99,.27],[-.15,.85,.32],[-.22,.73,.33],[-.28,.64,.29]],
 [[.18,1.00,.18],[.27,.89,.28],[.26,.70,.28],[.27,.62,.24]]
];
strandArray.forEach((pts,i)=>{
 tapered(H,pts,[.075,.095,.076,.012],i%3===0?hairAmber:i%2?hairLight:hair,8);
});
for(let i=0;i<6;i++){const a=i*2.4;
 const bb=ball(H,.15+Math.cos(a)*.19,.97+Math.sin(a*.8)*.10,-.23+Math.sin(a)*.11,.18,.12,.15,i%2?hair:hairLight);
 bb.rotation.z=a*.16;
}
for(let i=0;i<8;i++){let ang=i*.79;
 tube(H,[[Math.cos(ang)*.22,.94,Math.sin(ang)*.15-.13],[Math.cos(ang)*.31,.83,Math.sin(ang)*.21-.13],[Math.cos(ang)*.30,.66,Math.sin(ang)*.25-.13]],.011,hairAmber,12);
}
for(const side of [-1,1]){
 // delicate gold earring
 const e=mesh(new T.TorusGeometry(.045,.008,5,24),gold,H);e.position.set(side*.34,.339,.025);
 ball(H,side*.34,.28,.027,.014,.028,.015,gold);
}
// necklace visible under face
tube(torso,[[-.16,3.32,.15],[0,3.19,.267],[.16,3.32,.15]],.008,gold,22);
ball(torso,0,3.18,.26,.026,.054,.025,gold);

// Jacket wraps torso and fans into flowing long back panels.
const wrap=loft(coatMotion,[
 {x:0,y:3.22,z:-.045,rx:.59,rz:.318},
 {x:0,y:2.90,z:-.043,rx:.61,rz:.344},
 {x:0,y:2.37,z:-.035,rx:.57,rz:.345},
 {x:0,y:2.0,z:-.069,rx:.62,rz:.405},
 {x:-.04,y:1.47,z:-.13,rx:.85,rz:.45,undulate:.04,phase:1},
 {x:-.07,y:.88,z:-.25,rx:1.06,rz:.52,undulate:.08,phase:1.4}
],coat,44,.31,Math.PI*2-.31);
loft(coatMotion,[
 {x:0,y:3.22,z:-.049,rx:.552,rz:.303},
 {x:0,y:2.9,z:-.07,rx:.575,rz:.30},
 {x:0,y:2.38,z:-.06,rx:.515,rz:.301},
 {x:0,y:2.0,z:-.11,rx:.58,rz:.36},
 {x:-.04,y:1.47,z:-.16,rx:.81,rz:.41,undulate:.04},
 {x:-.07,y:.88,z:-.28,rx:1.01,rz:.47,undulate:.09}
],coatLining,38,.37,Math.PI*2-.37);
for(const sx of [-1,1]){
 // exposed front panels that curl outward in portrait
 panel(coatMotion,[
  [sx*.52,3.14,.20,sx*.23,3.24,.33],
  [sx*.60,2.88,.25,sx*.24,2.84,.40],
  [sx*.49,2.45,.30,sx*.31,2.44,.35],
  [sx*.53,2.04,.32,sx*.36,2.04,.38],
  [sx*.70,1.49,.28,sx*.52,1.49,.35],
  [sx*.96,.86,.15,sx*.69,.86,.22]
 ],coatLight);
 tube(coatMotion,[[sx*.23,3.24,.33],[sx*.24,2.84,.40],[sx*.31,2.44,.35],[sx*.36,2.04,.38],[sx*.52,1.49,.35],[sx*.69,.86,.22]],.013,glowing,40);
 // angular lapel which frames the collar and chest
 panel(coatMotion,[
  [sx*.46,3.26,.19,sx*.14,3.30,.37],
  [sx*.66,3.05,.23,sx*.24,3.06,.39],
  [sx*.48,2.72,.30,sx*.30,2.76,.39],
  [sx*.40,2.52,.33,sx*.36,2.62,.34]
 ],coatLight);
 tube(coatMotion,[[sx*.46,3.26,.19],[sx*.66,3.05,.23],[sx*.48,2.72,.30]],.015,glowing,18);
 // sleeve silhouette - wearable sculpted fabric geometry
 const shoulder=[sx*.59,3.13,.03],elbow=sideArm(sx,'elbow'),wrist=sideArm(sx,'wrist');
 ball(coatMotion,...shoulder,.18,.22,.19,coatLight);
 tapered(coatMotion,[shoulder,[sx*.66,3.00,.09],elbow,wrist],[.172,.145,.125,.104],coatLight,14);
 // shoulder seam / sleeve crease / satin piping
 tube(coatMotion,[[sx*.53,3.28,.19],[sx*.70,3.09,.22],elbow],.013,glowing,22);
 tube(coatMotion,[[elbow[0]-sx*.1,elbow[1]+.07,elbow[2]+.12],[elbow[0],elbow[1]-.04,elbow[2]+.16],[elbow[0]+sx*.11,elbow[1]+.05,elbow[2]+.11]],.012,pantsShadow,13);
 ball(coatMotion,...wrist,.118,.10,.115,pearl);
}
// collar outer shell
panel(coatMotion,[
 [-.57,3.14,.06,-.35,3.48,-.04],
 [-.46,3.24,.19,-.19,3.48,.24],
 [-.37,3.18,.35,-.19,3.30,.29]
],coatLight);
panel(coatMotion,[
 [.57,3.14,.06,.35,3.48,-.04],
 [.46,3.24,.19,.19,3.48,.24],
 [.37,3.18,.35,.19,3.30,.29]
],coatLight);

// Hands and stylized fingers. Open left hand implies gesture; right hand rests near pocket.
function sideArm(sx,section){
 if(sx<0)return section==='elbow'?[-.94,2.90,.12]:[-1.22,3.02,.34];
 return section==='elbow'?[.79,2.57,.08]:[.64,2.22,.30];
}
function palm(sx){
 const w=sideArm(sx,'wrist');const open=sx<0;
 const center=open?[-1.35,3.06,.41]:[.64,2.10,.34];
 ball(root,...center,open?.16:.14,open?.09:.17,.065,skin);
 if(open){
  for(let k=0;k<4;k++){const y=3.08+(k-1.5)*.036;
   tapered(root,[[-1.42,y,.43],[-1.57,y+.05,.445],[-1.68-(k%2)*.015,y+.055,.46]],[.026,.020,.011],skin,7);
  }
  tapered(root,[[-1.29,3.00,.44],[-1.33,2.92,.47],[-1.40,2.89,.51]],[.035,.022,.012],skinSoft,7);
 }else{
  for(let k=0;k<4;k++)tapered(root,[[.66+(k-1.5)*.055,2.07,.36],[.65+(k-1.5)*.055,1.98,.38]],[.03,.015],skin,7);
 }
 const metallicCuff=ball(root,...w,.165,.066,.17,metallic);
}
palm(-1);palm(1);
// dangling details and folds remain individually modeled
for(let side of [-1,1]){
 tube(coatMotion,[[side*.56,2.35,.30],[side*.62,2.05,.32],[side*.77,1.35,.25]],.023,metallic,24);
 const b=ball(coatMotion,side*.57,2.45,.34,.055,.08,.03,gold);
}
const sigil=ball(root,0,3.02,.34,.04,.065,.015,glowing);sigil.visible=false;

// Halos, studio ambience and platform -- all real 3D, not a cutout
const backdrop=new T.Group();scene.add(backdrop);
function arcRing(r,angleFrom,angleTo,z,color,w=.014){
 const curve=[];for(let i=0;i<=80;i++){const a=angleFrom+(angleTo-angleFrom)*i/80;curve.push([Math.cos(a)*r,2.35+Math.sin(a)*r,z]);}
 return tube(backdrop,curve,w,color,80);
}
const haloMat=new T.MeshBasicMaterial({color:0xe1ac96,transparent:true,opacity:.67});
arcRing(2.17,-.20,2.85,-1.6,haloMat,.014);
arcRing(2.47,3.2,5.92,-1.75,new T.MeshBasicMaterial({color:0xa072ad,transparent:true,opacity:.27}),.012);
const pedestal=mesh(new T.CylinderGeometry(1.62,1.72,.17,96),getMaterial(0x39304b,{metalness:.43,roughness:.22}),scene);pedestal.position.y=-.11;
const topDisk=mesh(new T.CylinderGeometry(1.46,1.46,.015,96),new T.MeshStandardMaterial({color:0x55506c,metalness:.66,roughness:.21}),scene);topDisk.position.y=-.013;
for(let radius of [1.19,1.47,1.71])ring(scene,0,.014,0,radius,radius,.017,radius===1.71?haloMat:glowing);
const centered=new T.Mesh(new T.CircleGeometry(1.49,64),new T.MeshBasicMaterial({color:0x89728a,transparent:true,opacity:.085,depthWrite:false}));centered.rotation.x=-Math.PI/2;centered.position.y=.002;scene.add(centered);
for(let i=0;i<36;i++){const a=i*2.4,r=1.8+rand()*2.25;let o=ball(scene,Math.sin(a)*r,.2+rand()*4.1,-2.5+rand()*.7,.012,.012,.012,i%3?glowing:haloMat);o.material.transparent=true}
const heroLight=new T.PointLight(0xffcf9f,7,5,2);heroLight.position.set(-2.0,2.8,1.6);scene.add(heroLight);

// Pointer controls and camera, touch navigation on iPhone
let azimuth=.17,elev=.07,dist=8.8,automatic=false,drag=false,lastX=0,lastY=0,moved=0,pinch=0;
function setCam(){const p=2.22;
 camera.position.set(Math.sin(azimuth)*dist*Math.cos(elev),p+Math.sin(elev)*dist*.65,Math.cos(azimuth)*dist*Math.cos(elev));
 camera.lookAt(0,p,0);
}
function resize(){const w=innerWidth,h=innerHeight;
 camera.aspect=w/h;
 camera.fov=w<700?(w>h?37:34):35;
 camera.updateProjectionMatrix();
 renderer.setSize(w,h,false);setCam();
}
resize();addEventListener('resize',resize);
canvas.addEventListener('pointerdown',e=>{drag=true;automatic=false;$('#turn').classList.remove('active');lastX=e.clientX;lastY=e.clientY;moved=0;canvas.setPointerCapture(e.pointerId)});
canvas.addEventListener('pointermove',e=>{if(!drag)return;const dx=e.clientX-lastX,dy=e.clientY-lastY;moved+=Math.abs(dx)+Math.abs(dy);lastX=e.clientX;lastY=e.clientY;azimuth-=dx*.008;elev=Math.max(-.22,Math.min(.44,elev+dy*.004));setCam()});
canvas.addEventListener('pointerup',()=>drag=false);
canvas.addEventListener('wheel',e=>{e.preventDefault();dist=Math.max(5.9,Math.min(12.4,dist+e.deltaY*.013));setCam()},{passive:false});
canvas.addEventListener('touchmove',e=>{if(e.touches.length!==2)return;const a=e.touches[0],b=e.touches[1],current=Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY);
 if(pinch)dist=Math.max(5.9,Math.min(12.4,dist+(pinch-current)*.022));pinch=current;setCam();e.preventDefault()
},{passive:false});
canvas.addEventListener('touchend',()=>pinch=0);
$('#front').onclick=()=>{automatic=false;azimuth=.10;elev=.08;dist=8.8;setCam();updateButtons('front')};
$('#turn').onclick=()=>{automatic=!automatic;updateButtons(automatic?'turn':'front')};
$('#light').onclick=()=>{lighting.alternate=!lighting.alternate;
 if(lighting.alternate){key.color.set(0xa8d8ff);rim.color.set(0xffbc7a);hemi.intensity=2.4;heroLight.color.set(0xe59eeb)}
 else{key.color.set(0xffd3a1);rim.color.set(0xe3a5e0);hemi.intensity=3;heroLight.color.set(0xffcf9f)}
 updateButtons('light')};
$('#full').onclick=()=>{dist=10.2;azimuth=.12;elev=.06;automatic=false;setCam();updateButtons('full')};
function updateButtons(which){for(const id of ['front','turn','light','full'])$('#'+id).classList.toggle('active',id===which)}
// Export existing THREE.Mesh geometry into a genuine (unrigged) GLB for Blender refinement.
// This does not certify artistic likeness, rigging, animations or production readiness.
const exportGLBButton=$('#exportGLB');
if(exportGLBButton)exportGLBButton.onclick=async ()=>{
  const oldText=exportGLBButton.textContent;
  exportGLBButton.disabled=true;exportGLBButton.textContent='GLB…';
  try{
    const {GLTFExporter}=await import('three/addons/exporters/GLTFExporter.js');
    root.updateMatrixWorld(true);
    const bytes=await new GLTFExporter().parseAsync(root,{
      binary:true,onlyVisible:true,trs:true,maxTextureSize:1024
    });
    if(!(bytes instanceof ArrayBuffer)||bytes.byteLength<2048)throw new Error('Empty GLB');
    const url=URL.createObjectURL(new Blob([bytes],{type:'model/gltf-binary'}));
    const a=document.createElement('a');
    a.href=url;a.download='HUMAN_OS_HEROINE_BLOCKOUT_UNRIGGED.glb';
    document.body.append(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),3000);
    $('#state').textContent='GLB: BLOCKOUT';
  }catch(error){
    console.error('HUMAN_OS_GLB_EXPORT_ERROR',String(error?.message||error));
    $('#state').textContent='GLB: ОШИБКА';
    alert('Экспорт GLB недоступен: '+String(error?.message||error));
  }finally{exportGLBButton.disabled=false;exportGLBButton.textContent=oldText;}
};

const clock=new T.Clock();let frames=0,fps=0,prev=performance.now(),acc=0,metricsCount=0;
let actualTriangles=0,meshCount=0;
scene.traverse(o=>{if(!o.isMesh)return;meshCount++;const g=o.geometry;const count=g.index?g.index.count/3:g.attributes.position.count/3;actualTriangles+=Math.round(count)});
window.__HUMAN_CHARACTER_QA={version:'0.3.1-painted-face-fix',source:'real-time-procedural-mesh',isBillboard:false,rigged:false,meshes:meshCount,triangles:actualTriangles,renderer:'three-webgl',mobileOptimized:true,healthData:false};
$('#state').textContent='WEBGL ACTIVE';$('#loading').hidden=true;
function render(){
 requestAnimationFrame(render);if(document.hidden)return;const t=clock.getElapsedTime();
 if(automatic)azimuth+=.0035;
 // subtle secondary movement keeps forms readable on phone
 const breathing=Math.sin(t*1.55)*.004;
 torso.scale.set(1+breathing,1+breathing,1+breathing);
 head.rotation.z=Math.sin(t*.72)*.014;
 coatMotion.rotation.y=Math.sin(t*.55)*.014;
 coatMotion.rotation.z=Math.sin(t*.43)*.013;
 backdrop.rotation.z=Math.sin(t*.085)*.015;
 if(automatic)setCam();
 renderer.render(scene,camera);
 frames++;const now=performance.now();if(now-prev>1600){fps=Math.round(frames*1000/(now-prev));frames=0;prev=now;window.__HUMAN_CHARACTER_QA.fpsMeasured=fps;$('#fps').textContent='WEBGL · '+fps+' FPS (DEVICE)';}
}
render();
