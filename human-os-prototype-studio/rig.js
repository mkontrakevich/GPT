// Human OS Character Prototype Studio — parametric articulated blockout.
// This is a deliberate anatomical study, NOT an identity-matched final actor.
export function createRig(T,scene){
 const root=new T.Group();root.name='HUMAN_OS_EDITABLE_BLOCKOUT_UNRIGGED';scene.add(root);
 const clay=new T.MeshStandardMaterial({color:0xbdc9c6,roughness:.82});
 const light=new T.MeshStandardMaterial({color:0xe2d4c1,roughness:.88});
 const dark=new T.MeshStandardMaterial({color:0x526d78,roughness:.82});
 const gold=new T.MeshStandardMaterial({color:0xc4a784,roughness:.65,metalness:.16});
 const mats=[clay,light,dark,gold];
 const sph=new T.SphereGeometry(1,20,16),cyl=new T.CylinderGeometry(1,1,1,18);
 const up=new T.Vector3(0,1,0),parts={};
 function ball(id,mat=clay){const m=new T.Mesh(sph,mat);m.name=id;root.add(m);parts[id]=m;return m}
 function segment(id,mat=clay,rt=1,rb=1){const m=new T.Mesh(new T.CylinderGeometry(rt,rb,1,18),mat);m.name=id;root.add(m);parts[id]=m;return m}
 function putBall(m,p,sx,sy,sz){m.position.copy(p);m.scale.set(sx,sy,sz)}
 function putBone(m,a,b,rx,rz=rx){const v=b.clone().sub(a),len=Math.max(.001,v.length());m.position.copy(a).add(b).multiplyScalar(.5);m.quaternion.setFromUnitVectors(up,v.normalize());m.scale.set(rx,len,rz)}
 segment('torso',clay,.94,.78);ball('pelvis');segment('neck',light);ball('head',light);ball('hairCap',dark);ball('nose',light);
 for(const s of ['l','r']){
  segment(s+'upperArm',clay,1,.88);segment(s+'forearm',light,1,.82);
  segment(s+'thigh',clay,1.05,.83);segment(s+'calf',light,1,.79);
  for(const t of ['shoulder','elbow','wrist','hip','knee','ankle'])ball(s+t,t==='wrist'||t==='ankle'?light:clay);
  ball(s+'hand',light);ball(s+'foot',dark);
 }
 const ring=new T.Mesh(new T.TorusGeometry(1.5,.022,6,64),gold);ring.rotation.x=-Math.PI/2;ring.position.y=.03;root.add(ring);
 const pnt=(x,y,z)=>new T.Vector3(x,y,z);
 function points(s,aspect){
  const p={},xc=5.25*Math.max(.68,Math.min(1.38,aspect/.667));
  for(const [k,v] of Object.entries(s.anchors))p[k]=pnt((v.x-.5)*xc,(.955-v.y)*5,0);
  const mid=p.lh.clone().add(p.rh).multiplyScalar(.5);
  for(const k of ['head','neck','ls','rs','le','re','lw','rw'])p[k].y=mid.y+(p[k].y-mid.y)*s.proportions.torsoScale;
  for(const sd of ['l','r']){
   for(const name of ['s','e','w'])p[sd+name].x*=s.proportions.shoulderScale;
   p[sd+'h'].x*=s.proportions.hipScale;
   p[sd+'k'].x*=1+(s.proportions.hipScale-1)*.35;
  }
  Object.assign(p,{});
  p.head.z=.17;p.neck.z=.1;
  for(const k of ['ls','rs'])p[k].z=-.04;
  for(const k of ['le','re'])p[k].z=.07;
  for(const k of ['lw','rw'])p[k].z=.28;
  for(const k of ['lh','rh'])p[k].z=-.04;
  for(const k of ['lk','rk'])p[k].z=.07;
  for(const k of ['la','ra'])p[k].z=.11;
  return p;
 }
 function update(s,aspect=.667){
  const p=points(s,aspect);
  const shoulders=p.ls.clone().add(p.rs).multiplyScalar(.5),hips=p.lh.clone().add(p.rh).multiplyScalar(.5);
  const shoulderW=p.ls.distanceTo(p.rs),hipW=p.lh.distanceTo(p.rh);
  shoulders.y-=.06;hips.y+=.1;
  putBone(parts.torso,hips,shoulders,shoulderW*.37,.26);
  putBall(parts.pelvis,hips,hipW*.54,.19,.24);
  putBone(parts.neck,pnt(p.neck.x,p.neck.y-.16,.05),pnt(p.head.x,p.head.y-.25,.18),.095,.09);
  const hs=s.proportions.headScale;
  putBall(parts.head,p.head,.285*hs,.385*hs,.245*hs);
  putBall(parts.hairCap,pnt(p.head.x,p.head.y+.20*hs,p.head.z-.06),.285*hs,.22*hs,.255*hs);
  putBall(parts.nose,pnt(p.head.x,p.head.y-.055,p.head.z+.235*hs),.039,.064,.055);
  for(const sd of ['l','r']){
   const a=p[sd+'s'],b=p[sd+'e'],c=p[sd+'w'],h=p[sd+'h'],k=p[sd+'k'],foot=p[sd+'a'];
   putBone(parts[sd+'upperArm'],b,a,.12,.115);
   putBone(parts[sd+'forearm'],c,b,.10,.092);
   putBone(parts[sd+'thigh'],k,h,.17,.155);
   putBone(parts[sd+'calf'],foot,k,.125,.116);
   for(const [j,q,r] of [['shoulder',a,.135],['elbow',b,.104],['wrist',c,.078],['hip',h,.16],['knee',k,.13],['ankle',foot,.083]])putBall(parts[sd+j],q,r,r,r);
   putBall(parts[sd+'hand'],pnt(c.x,c.y-.12,c.z+.04),.08,.135,.052);
   putBall(parts[sd+'foot'],pnt(foot.x,foot.y-.04,foot.z+.16),.14,.08,.26);
  }
 }
 function setWireframe(v){for(const m of mats)m.wireframe=!!v}
 function metrics(){let meshes=0,triangles=0;root.traverse(o=>{if(!o.isMesh)return;meshes++;const g=o.geometry;triangles+=Math.round((g.index?g.index.count:g.attributes.position.count)/3)});return {meshes,triangles}}
 return {root,update,setWireframe,metrics};
}
