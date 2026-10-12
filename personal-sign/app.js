(function(){
"use strict";

pdfjsLib.GlobalWorkerOptions.workerSrc="./vendor/pdfjs-worker-2.9.359.min.js";

const $=id=>document.getElementById(id);
const screens=[...document.querySelectorAll(".screen")];
const S={file:null,format:null,bytes:null,pdf:null,page:1,count:1,place:null,tap:null,final:null,base:null};

function screen(id){
  screens.forEach(x=>x.classList.toggle("on",x.id===id));
}

function prog(on,title,detail){
  $("progress").classList.toggle("on",on);
  if(title)$("ptitle").textContent=title;
  if(detail)$("pdetail").textContent=detail;
}

function base(name){
  return name.replace(/\.(pdf|docx|doc)$/i,"");
}

async function wipeSession(){
  try{if(S.pdf)await S.pdf.destroy()}catch(e){}
  S.file=null;S.format=null;S.bytes=null;S.pdf=null;S.page=1;S.count=1;S.place=null;S.tap=null;S.final=null;S.base=null;
  strokes=[];cur=null;down=false;
  $("sig").hidden=true;
  $("sigimg").removeAttribute("src");
  $("pdfc").width=1;$("pdfc").height=1;
  $("signActions").hidden=true;
  $("signHint").hidden=false;
}

function dl(data,name,type){
  const blob=data instanceof Blob?data:new Blob([data],{type});
  const url=URL.createObjectURL(blob);
  const a=document.createElement("a");
  a.href=url;a.download=name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1500);
}

async function htmlCanvasToPdf(node,title){
  if(document.fonts&&document.fonts.ready)try{await document.fonts.ready}catch(e){}
  await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
  const canvas=await html2canvas(node,{scale:Math.min(devicePixelRatio||1,2),backgroundColor:"#fff",logging:false,useCORS:true});
  const cssW=794,cssH=1123,ratio=canvas.width/cssW,slice=Math.round(cssH*ratio);
  const pages=Math.max(1,Math.ceil(canvas.height/slice));
  const out=await PDFLib.PDFDocument.create();
  for(let i=0;i<pages;i++){
    $("pdetail").textContent="Страница "+(i+1)+" из "+pages;
    const cc=document.createElement("canvas");
    cc.width=canvas.width;cc.height=slice;
    const ctx=cc.getContext("2d");
    ctx.fillStyle="#fff";ctx.fillRect(0,0,cc.width,cc.height);
    const h=Math.min(slice,canvas.height-i*slice);
    ctx.drawImage(canvas,0,i*slice,canvas.width,h,0,0,canvas.width,h);
    const png=await out.embedPng(cc.toDataURL("image/png"));
    const p=out.addPage([595.28,841.89]);
    p.drawImage(png,{x:0,y:0,width:595.28,height:841.89});
  }
  return new Uint8Array(await out.save());
}

async function docxToPdf(file){
  if(!window.docx)throw Error("Не удалось открыть документ Word.");
  const sb=$("sandbox");
  sb.innerHTML="";
  prog(true,"Готовим документ","Это происходит на вашем устройстве");
  try{
    await docx.renderAsync(await file.arrayBuffer(),sb,sb,{className:"docx",inWrapper:true,breakPages:true,useBase64URL:true});
    const sections=[...sb.querySelectorAll("section.docx")];
    if(!sections.length)throw Error("Не удалось отобразить документ Word.");
    const out=await PDFLib.PDFDocument.create();
    for(let i=0;i<sections.length;i++){
      $("pdetail").textContent="Страница "+(i+1)+" из "+sections.length;
      const canvas=await html2canvas(sections[i],{scale:Math.min(devicePixelRatio||1,2),backgroundColor:"#fff",logging:false,useCORS:true});
      const png=await out.embedPng(canvas.toDataURL("image/png"));
      const w=sections[i].scrollWidth*72/96,h=sections[i].scrollHeight*72/96;
      const p=out.addPage([w,h]);
      p.drawImage(png,{x:0,y:0,width:w,height:h});
    }
    return new Uint8Array(await out.save());
  }finally{
    sb.innerHTML="";
    prog(false);
  }
}

function esc(s){
  return String(s).replace(/[&<>]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;"}[c]));
}

async function docToPdf(file){
  if(!window.docToText)throw Error("Не удалось открыть документ Word.");
  prog(true,"Готовим документ","Это происходит на вашем устройстве");
  const sb=$("sandbox");
  sb.innerHTML="";
  try{
    const ab=await file.arrayBuffer();
    const rich=docToText.html(ab),plain=docToText(ab);
    if(!rich&&!plain)throw Error("Этот DOC не удалось прочитать.");
    const d=document.createElement("div");
    d.className="legacy";
    d.innerHTML=(rich&&rich.body?rich.body:esc(plain||"")).replace(/\t/g,"    ");
    sb.appendChild(d);
    return await htmlCanvasToPdf(d,"DOC");
  }finally{
    sb.innerHTML="";
    prog(false);
  }
}

function updateStep(){
  const has=!!S.place;
  $("stepTitle").textContent=has?"Проверьте подпись":"Укажите место подписи";
  $("stepHelp").textContent=has
    ?"Перетащите или растяните подпись при необходимости. Затем подпишите документ."
    :"Проверьте документ и коснитесь места, где должна стоять подпись.";
  $("signActions").hidden=!has;
  $("signHint").hidden=has;
}

async function openPdf(bytes,file,format){
  const pdf=await pdfjsLib.getDocument({data:bytes.slice()}).promise;
  try{if(S.pdf)await S.pdf.destroy()}catch(e){}
  S.file=file;S.format=format;S.bytes=bytes;S.pdf=pdf;S.page=1;S.count=pdf.numPages;S.place=null;S.tap=null;S.final=null;S.base=null;
  $("fname").textContent=file.name;
  screen("sign");
  updateStep();
  await render();
}

async function choose(file){
  if(!file)return;
  try{
    if(/\.pdf$/i.test(file.name)||file.type==="application/pdf"){
      return openPdf(new Uint8Array(await file.arrayBuffer()),file,"pdf");
    }
    if(/\.docx$/i.test(file.name)||file.type.indexOf("wordprocessingml")>=0){
      return openPdf(await docxToPdf(file),file,"docx");
    }
    if(/\.doc$/i.test(file.name)||file.type==="application/msword"){
      return openPdf(await docToPdf(file),file,"doc");
    }
    throw Error("Выберите PDF, DOCX или DOC.");
  }catch(e){
    prog(false);
    alert(e.message||"Не удалось открыть документ.");
  }
}

async function render(){
  if(!S.pdf)return;
  const page=await S.pdf.getPage(S.page);
  const baseViewport=page.getViewport({scale:1});
  const viewer=document.querySelector(".viewer");
  const width=Math.max(260,Math.min(760,viewer.clientWidth-14));
  const viewport=page.getViewport({scale:width/baseViewport.width});
  const dpr=Math.min(devicePixelRatio||1,2);
  const canvas=$("pdfc");
  canvas.width=Math.round(viewport.width*dpr);
  canvas.height=Math.round(viewport.height*dpr);
  canvas.style.width=viewport.width+"px";
  canvas.style.height=viewport.height+"px";
  $("stage").style.width=viewport.width+"px";
  $("stage").style.height=viewport.height+"px";
  await page.render({canvasContext:canvas.getContext("2d"),viewport,transform:[dpr,0,0,dpr,0,0]}).promise;
  $("counter").textContent=S.page+" / "+S.count;
  $("prev").disabled=S.page<=1;
  $("next").disabled=S.page>=S.count;
  $("pageNav").hidden=S.count<=1;
  draw();
}

function draw(){
  const el=$("sig"),p=S.place;
  if(!p||p.page!==S.page){
    el.hidden=true;
    updateStep();
    return;
  }
  el.hidden=false;
  el.style.left=(p.x*100)+"%";
  el.style.top=(p.y*100)+"%";
  el.style.width=(p.w*100)+"%";
  el.style.height=(p.h*100)+"%";
  $("sigimg").src=p.url;
  updateStep();
}

const pad=$("pad");
const penWidth=$("penWidth");
const ballpoint=$("ballpoint");
let strokes=[],cur=null,down=false;

function psize(){
  const r=pad.getBoundingClientRect();
  const d=Math.min(devicePixelRatio||1,3);
  pad.width=Math.max(1,Math.round(r.width*d));
  pad.height=Math.max(1,Math.round(r.height*d));
  predraw();
}

function pt(e){
  const r=pad.getBoundingClientRect();
  return{
    x:(e.clientX-r.left)/r.width,
    y:(e.clientY-r.top)/r.height,
    t:performance.now(),
    p:(e.pressure&&e.pressure>0)?e.pressure:.5
  };
}

function clamp(a,b,v){return Math.max(a,Math.min(b,v))}

function predraw(){
  const r=pad.getBoundingClientRect();
  if(!r.width||!r.height)return;
  const d=pad.width/r.width;
  const ctx=pad.getContext("2d");
  const bw=Number(penWidth.value)||2.6;
  ctx.setTransform(d,0,0,d,0,0);
  ctx.clearRect(0,0,r.width,r.height);
  ctx.strokeStyle="#1f4e9e";
  ctx.lineCap="round";
  ctx.lineJoin="round";
  for(const st of (cur?[...strokes,cur]:strokes)){
    if(!st.length)continue;
    if(st.length===1){
      ctx.globalAlpha=.92;
      ctx.beginPath();
      ctx.arc(st[0].x*r.width,st[0].y*r.height,bw/2,0,Math.PI*2);
      ctx.fillStyle="#1f4e9e";
      ctx.fill();
      continue;
    }
    for(let i=1;i<st.length;i++){
      const a=st[i-1],b=st[i];
      const dx=(b.x-a.x)*r.width,dy=(b.y-a.y)*r.height;
      const speed=Math.hypot(dx,dy)/Math.max(1,b.t-a.t);
      const pressure=clamp(.72,1.15,.82+(b.p||.5)*.42);
      const speedFactor=clamp(.72,1.08,1.06-speed*.34);
      ctx.globalAlpha=clamp(.72,.96,.94-speed*.12);
      ctx.lineWidth=bw*pressure*speedFactor;
      ctx.beginPath();
      ctx.moveTo(a.x*r.width,a.y*r.height);
      ctx.lineTo(b.x*r.width,b.y*r.height);
      ctx.stroke();
    }
  }
  ctx.globalAlpha=1;
  $("okPad").disabled=!(strokes.length||cur);
}

function openPad(){
  strokes=[];cur=null;down=false;
  $("modal").classList.add("on");
  requestAnimationFrame(psize);
}

function closePad(){
  $("modal").classList.remove("on");
}

pad.onpointerdown=e=>{
  e.preventDefault();
  down=true;
  cur=[pt(e)];
  pad.setPointerCapture?.(e.pointerId);
  predraw();
};

pad.onpointermove=e=>{
  if(!down)return;
  e.preventDefault();
  cur.push(pt(e));
  predraw();
};

function endStroke(e){
  if(!down)return;
  down=false;
  if(cur&&cur.length)strokes.push(cur);
  cur=null;
  predraw();
  try{pad.releasePointerCapture?.(e.pointerId)}catch(_){}
}
pad.onpointerup=endStroke;
pad.onpointercancel=endStroke;

function crop(){
  let minx=1,miny=1,maxx=0,maxy=0;
  strokes.flat().forEach(p=>{minx=Math.min(minx,p.x);miny=Math.min(miny,p.y);maxx=Math.max(maxx,p.x);maxy=Math.max(maxy,p.y)});
  const r=pad.getBoundingClientRect(),d=pad.width/r.width,padn=10*d;
  const sx=Math.max(0,minx*pad.width-padn),sy=Math.max(0,miny*pad.height-padn);
  const ex=Math.min(pad.width,maxx*pad.width+padn),ey=Math.min(pad.height,maxy*pad.height+padn);
  const out=document.createElement("canvas");
  out.width=Math.max(1,Math.round(ex-sx));
  out.height=Math.max(1,Math.round(ey-sy));
  out.getContext("2d").drawImage(pad,sx,sy,out.width,out.height,0,0,out.width,out.height);
  return{url:out.toDataURL("image/png"),aspect:out.width/out.height};
}

$("stage").addEventListener("pointerup",e=>{
  if(S.place||e.target.closest(".sig"))return;
  const r=$("stage").getBoundingClientRect();
  S.tap={x:(e.clientX-r.left)/r.width,y:(e.clientY-r.top)/r.height};
  openPad();
});

$("clearPad").onclick=()=>{strokes=[];cur=null;predraw()};
$("cancelPad").onclick=()=>{closePad();S.tap=null};

$("okPad").onclick=()=>{
  const z=crop(),r=$("stage").getBoundingClientRect();
  const w=.32,h=Math.min(.20,(w*r.width)/(z.aspect*r.height));
  const t=S.tap||{x:.65,y:.72};
  S.place={
    page:S.page,
    x:Math.max(0,Math.min(1-w,t.x-w/2)),
    y:Math.max(0,Math.min(1-h,t.y-h/2)),
    w,h,url:z.url,aspect:z.aspect
  };
  closePad();
  draw();
};

let move=null;

$("sig").onpointerdown=e=>{
  if(e.target===$("handle"))return;
  const r=$("stage").getBoundingClientRect();
  move={type:"m",sx:e.clientX,sy:e.clientY,x:S.place.x,y:S.place.y,r};
  e.currentTarget.setPointerCapture?.(e.pointerId);
};

$("handle").onpointerdown=e=>{
  e.stopPropagation();
  const r=$("stage").getBoundingClientRect();
  move={type:"r",sx:e.clientX,w:S.place.w,r};
  e.currentTarget.setPointerCapture?.(e.pointerId);
};

window.addEventListener("pointermove",e=>{
  if(!move||!S.place)return;
  if(move.type==="m"){
    S.place.x=Math.max(0,Math.min(1-S.place.w,move.x+(e.clientX-move.sx)/move.r.width));
    S.place.y=Math.max(0,Math.min(1-S.place.h,move.y+(e.clientY-move.sy)/move.r.height));
  }else{
    const w=Math.max(.10,Math.min(.75,move.w+(e.clientX-move.sx)/move.r.width));
    S.place.w=w;
    S.place.h=Math.min(.30,(w*move.r.width)/(S.place.aspect*move.r.height));
  }
  draw();
});

window.addEventListener("pointerup",()=>move=null);

async function finalize(){
  if(!S.place||!S.bytes)return;
  prog(true,"Подписываем документ","Добавляем подпись в PDF");
  try{
    const originalName=S.file.name;
    const doc=await PDFLib.PDFDocument.load(S.bytes.slice());
    const page=doc.getPages()[S.place.page-1];
    const image=await doc.embedPng(S.place.url);
    const size=page.getSize();
    page.drawImage(image,{
      x:S.place.x*size.width,
      y:size.height-(S.place.y+S.place.h)*size.height,
      width:S.place.w*size.width,
      height:S.place.h*size.height
    });
    S.final=new Uint8Array(await doc.save());
    S.base=base(originalName)+"_signed";
    try{if(S.pdf)await S.pdf.destroy()}catch(e){}
    S.pdf=null;S.bytes=null;S.file=null;S.format=null;S.place=null;S.tap=null;
    strokes=[];cur=null;down=false;
    $("sig").hidden=true;
    $("sigimg").removeAttribute("src");
    $("pdfc").width=1;$("pdfc").height=1;
    pad.width=1;pad.height=1;
    screen("done");
  }catch(e){
    alert(e.message||"Не удалось подписать документ.");
  }finally{
    prog(false);
  }
}

document.querySelectorAll(".help-link").forEach(btn=>{
  btn.addEventListener("click",()=>{
    $("helpImage").src=btn.dataset.help;
    $("helpImage").alt=btn.dataset.title||"Инструкция";
    $("helpModal").hidden=false;
  });
});
function closeHelp(){
  $("helpModal").hidden=true;
  $("helpImage").removeAttribute("src");
}
$("helpClose").onclick=closeHelp;
$("helpModal").addEventListener("click",e=>{if(e.target===$("helpModal"))closeHelp()});
document.addEventListener("keydown",e=>{if(e.key==="Escape"&&!$("helpModal").hidden)closeHelp()});

$("start").onclick=()=>$("picker").click();
$("picker").onchange=e=>{choose(e.target.files[0]);e.target.value=""};

$("homeBtn").onclick=async()=>{await wipeSession();screen("home")};
$("doneHome").onclick=async()=>{await wipeSession();screen("home")};

$("prev").onclick=async()=>{if(S.page>1){S.page--;await render()}};
$("next").onclick=async()=>{if(S.page<S.count){S.page++;await render()}};

$("redraw").onclick=()=>{
  S.tap=S.place?{x:S.place.x+S.place.w/2,y:S.place.y+S.place.h/2}:null;
  openPad();
};

$("finish").onclick=finalize;
$("getPdf").onclick=()=>{if(S.final)dl(S.final,S.base+".pdf","application/pdf")};

window.addEventListener("resize",()=>{
  if($("modal").classList.contains("on"))psize();
  if(S.pdf&&$("sign").classList.contains("on"))render().catch(()=>{});
});

if("serviceWorker"in navigator){
  window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js").catch(()=>{}));
}
})();