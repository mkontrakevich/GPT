(function(){
"use strict";

pdfjsLib.GlobalWorkerOptions.workerSrc="./vendor/pdfjs-worker-2.9.359.min.js";

const $=id=>document.getElementById(id);
const screens=[...document.querySelectorAll(".screen")];
const S={
  file:null,format:null,bytes:null,pdf:null,page:1,count:1,place:null,tap:null,final:null,base:null,
  signature:null,wordType:null,wordScale:1,pageDims:{}
};
let savedTextRange=null,hyphenationOn=false;

let strokes=[],curStroke=null,penDown=false,move=null;

function clamp(a,b,v){return Math.max(a,Math.min(b,v))}
function screen(id){screens.forEach(x=>x.classList.toggle("on",x.id===id))}
function prog(on,title,detail){
  $("progress").classList.toggle("on",on);
  if(title)$("ptitle").textContent=title;
  if(detail)$("pdetail").textContent=detail;
}
function base(name){return name.replace(/\.(pdf|docx|doc)$/i,"")}
function cloneStrokes(src){return src.map(st=>st.map(p=>({...p})))}

async function wipeSession(){
  try{if(S.pdf)await S.pdf.destroy()}catch(_){}
  Object.assign(S,{file:null,format:null,bytes:null,pdf:null,page:1,count:1,place:null,tap:null,final:null,base:null,signature:null,wordType:null,wordScale:1,pageDims:{}});
  savedTextRange=null;hyphenationOn=false;try{$("docEditor").classList.remove("hyphenate");$("hyphenToggle").classList.remove("active");$("hyphenToggle").textContent="Переносы: выкл"}catch(_){}
  strokes=[];curStroke=null;penDown=false;move=null;
  $("sig").hidden=true;$("sigimg").removeAttribute("src");
  $("pdfc").width=1;$("pdfc").height=1;
  $("signActions").hidden=true;$("sigControls").hidden=true;$("signHint").hidden=false;
  $("docEditor").innerHTML="";
}

function dl(data,name,type){
  const blob=data instanceof Blob?data:new Blob([data],{type});
  const url=URL.createObjectURL(blob),a=document.createElement("a");
  a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1500);
}

async function htmlCanvasToPdf(node){
  if(document.fonts&&document.fonts.ready)try{await document.fonts.ready}catch(_){}
  await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
  const oldZoom=node.style.zoom||"";
  node.style.zoom="1";
  const canvas=await html2canvas(node,{scale:Math.min(devicePixelRatio||1,2),backgroundColor:"#fff",logging:false,useCORS:true});
  node.style.zoom=oldZoom;
  const cssW=Math.max(1,node.scrollWidth),cssH=1123,ratio=canvas.width/cssW,slice=Math.round(cssH*ratio);
  const pages=Math.max(1,Math.ceil(canvas.height/slice));
  const out=await PDFLib.PDFDocument.create();
  for(let i=0;i<pages;i++){
    $("pdetail").textContent="Страница "+(i+1)+" из "+pages;
    const cc=document.createElement("canvas");cc.width=canvas.width;cc.height=slice;
    const ctx=cc.getContext("2d");ctx.fillStyle="#fff";ctx.fillRect(0,0,cc.width,cc.height);
    const h=Math.min(slice,canvas.height-i*slice);
    ctx.drawImage(canvas,0,i*slice,canvas.width,h,0,0,canvas.width,h);
    const png=await out.embedPng(cc.toDataURL("image/png"));
    const p=out.addPage([595.28,841.89]);p.drawImage(png,{x:0,y:0,width:595.28,height:841.89});
  }
  return new Uint8Array(await out.save());
}

function esc(s){return String(s).replace(/[&<>]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;"}[c]))}

function fitWordEditor(){
  const host=$("docEditor"),wrap=host.firstElementChild;
  if(!wrap)return;
  wrap.style.zoom="1";
  const viewport=$("docEditor").parentElement;
  const natural=Math.max(wrap.scrollWidth||0,wrap.getBoundingClientRect().width||0,794);
  const scale=Math.min(1,Math.max(.3,(viewport.clientWidth-14)/natural));
  wrap.style.zoom=String(scale);
  S.wordScale=scale;
}

function rememberTextSelection(){
  const sel=window.getSelection();
  if(!sel||!sel.rangeCount)return false;
  const range=sel.getRangeAt(0),host=$("docEditor");
  if(!host.contains(range.commonAncestorContainer))return false;
  savedTextRange=range.cloneRange();
  return true;
}
function restoreTextSelection(){
  if(!savedTextRange)return false;
  const sel=window.getSelection();
  sel.removeAllRanges();
  sel.addRange(savedTextRange);
  return true;
}
function updateFormatButtons(){
  document.querySelectorAll('.format-btn[data-cmd]').forEach(btn=>{
    let active=false;
    try{active=document.queryCommandState(btn.dataset.cmd)}catch(_){}
    btn.classList.toggle("active",!!active);
  });
}
function applyTextCommand(cmd){
  if(!restoreTextSelection())return;
  try{document.execCommand("styleWithCSS",false,true)}catch(_){}
  try{document.execCommand(cmd,false,null)}catch(_){}
  rememberTextSelection();updateFormatButtons();
}
function insertEditorContent(kind){
  if(!restoreTextSelection())return;
  try{
    if(kind==="zws")document.execCommand("insertText",false,"\u00A0");
    if(kind==="tab")document.execCommand("insertHTML",false,'<span class="ps-tab" contenteditable="false">&nbsp;</span>');
  }catch(_){}
  rememberTextSelection();
}
function setHyphenation(on){
  hyphenationOn=!!on;
  $("docEditor").classList.toggle("hyphenate",hyphenationOn);
  const b=$("hyphenToggle");
  b.classList.toggle("active",hyphenationOn);
  b.textContent=hyphenationOn?"Переносы: вкл":"Переносы: выкл";
}
document.addEventListener("selectionchange",()=>{
  if(!$("editDoc").classList.contains("on"))return;
  if(rememberTextSelection())updateFormatButtons();
});
document.querySelectorAll('.format-btn[data-cmd]').forEach(btn=>{
  const apply=e=>{e.preventDefault();applyTextCommand(btn.dataset.cmd)};
  btn.addEventListener("pointerdown",apply);
  btn.addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" ")apply(e)});
  btn.addEventListener("click",e=>e.preventDefault());
});
document.querySelectorAll('.format-btn[data-insert]').forEach(btn=>{
  const apply=e=>{e.preventDefault();insertEditorContent(btn.dataset.insert)};
  btn.addEventListener("pointerdown",apply);
  btn.addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" ")apply(e)});
  btn.addEventListener("click",e=>e.preventDefault());
});
$("hyphenToggle").addEventListener("pointerdown",e=>{e.preventDefault();setHyphenation(!hyphenationOn)});
$("hyphenToggle").addEventListener("click",e=>e.preventDefault());
$("docEditor").addEventListener("keydown",e=>{
  if(e.key==="Tab"){
    e.preventDefault();
    rememberTextSelection();
    insertEditorContent("tab");
  }
});

async function openEditableDocx(file){
  if(!window.docx)throw Error("Не удалось открыть документ Word.");
  const host=$("docEditor");host.innerHTML="";
  prog(true,"Открываем документ","Подготавливаем редактируемый текст");
  try{
    await docx.renderAsync(await file.arrayBuffer(),host,host,{className:"docx",inWrapper:true,breakPages:true,useBase64URL:true});
    const sections=[...host.querySelectorAll("section.docx")];
    if(!sections.length)throw Error("Не удалось отобразить документ Word.");
    sections.forEach(s=>{s.contentEditable="true";s.spellcheck=false;s.lang="ru"}); $("docEditor").lang="ru"; setHyphenation(false);
    S.file=file;S.format="docx";S.wordType="docx";$("editName").textContent=file.name;
    screen("editDoc");
    requestAnimationFrame(fitWordEditor);
  }finally{prog(false)}
}

async function openEditableDoc(file){
  if(!window.docToText)throw Error("Не удалось открыть документ Word.");
  const host=$("docEditor");host.innerHTML="";
  prog(true,"Открываем документ","Подготавливаем редактируемый текст");
  try{
    const ab=await file.arrayBuffer(),rich=docToText.html(ab),plain=docToText(ab);
    if(!rich&&!plain)throw Error("Этот DOC не удалось прочитать.");
    const d=document.createElement("div");d.className="legacy";d.contentEditable="true";d.spellcheck=false;
    d.innerHTML=(rich&&rich.body?rich.body:esc(plain||"")).replace(/\t/g,"    ");d.lang="ru";host.appendChild(d);$("docEditor").lang="ru";setHyphenation(false);
    S.file=file;S.format="doc";S.wordType="doc";$("editName").textContent=file.name;
    screen("editDoc");
    requestAnimationFrame(fitWordEditor);
  }finally{prog(false)}
}

async function wordEditorToPdf(){
  const host=$("docEditor");
  if(!S.file||!S.wordType)return;
  prog(true,"Готовим PDF","Сохраняем ваши исправления");
  try{
    let bytes;
    if(S.wordType==="docx"){
      const sections=[...host.querySelectorAll("section.docx")];
      if(!sections.length)throw Error("Документ не найден.");
      const wrapper=host.firstElementChild,oldZoom=wrapper?.style.zoom||"";
      if(wrapper)wrapper.style.zoom="1";
      if(document.fonts&&document.fonts.ready)try{await document.fonts.ready}catch(_){}
      const out=await PDFLib.PDFDocument.create();
      for(let i=0;i<sections.length;i++){
        $("pdetail").textContent="Страница "+(i+1)+" из "+sections.length;
        const canvas=await html2canvas(sections[i],{scale:Math.min(devicePixelRatio||1,2),backgroundColor:"#fff",logging:false,useCORS:true});
        const png=await out.embedPng(canvas.toDataURL("image/png"));
        const w=sections[i].scrollWidth*72/96,h=sections[i].scrollHeight*72/96;
        const p=out.addPage([w,h]);p.drawImage(png,{x:0,y:0,width:w,height:h});
      }
      if(wrapper)wrapper.style.zoom=oldZoom;
      bytes=new Uint8Array(await out.save());
    }else{
      const d=host.querySelector(".legacy");if(!d)throw Error("Документ не найден.");
      bytes=await htmlCanvasToPdf(d);
    }
    const file=S.file,format=S.format;
    host.innerHTML="";
    await openPdf(bytes,file,format);
  }finally{prog(false)}
}

async function openPdf(bytes,file,format){
  const pdf=await pdfjsLib.getDocument({data:bytes.slice()}).promise;
  try{if(S.pdf)await S.pdf.destroy()}catch(_){}
  Object.assign(S,{file,format,bytes,pdf,page:1,count:pdf.numPages,place:null,tap:null,final:null,base:null,signature:null,wordType:null,wordScale:1,pageDims:{}});
  $("fname").textContent=file.name;$("sigWidth").value="2.6";$("sigBallpoint").checked=true;
  screen("sign");updateStep();await render();
}

async function choose(file){
  if(!file)return;
  try{
    if(/\.pdf$/i.test(file.name)||file.type==="application/pdf")return openPdf(new Uint8Array(await file.arrayBuffer()),file,"pdf");
    if(/\.docx$/i.test(file.name)||file.type.indexOf("wordprocessingml")>=0)return openEditableDocx(file);
    if(/\.doc$/i.test(file.name)||file.type==="application/msword")return openEditableDoc(file);
    throw Error("Выберите PDF, DOCX или DOC.");
  }catch(e){prog(false);alert(e.message||"Не удалось открыть документ.")}
}

function updateStep(){
  const has=!!(S.place&&S.signature);
  $("stepTitle").textContent=has?"Проверьте подпись":"Укажите место подписи";
  $("stepHelp").textContent=has
    ?"Передвиньте или измените размер. Толщину линии можно настроить ниже."
    :"Проверьте документ и коснитесь места, где должна стоять подпись.";
  $("signActions").hidden=!has;$("sigControls").hidden=!has;$("signHint").hidden=has;
}

async function render(){
  if(!S.pdf)return;
  const page=await S.pdf.getPage(S.page),baseViewport=page.getViewport({scale:1});
  S.pageDims[S.page]={w:baseViewport.width,h:baseViewport.height};
  const viewer=document.querySelector(".viewer"),width=Math.max(260,Math.min(760,viewer.clientWidth-14));
  const viewport=page.getViewport({scale:width/baseViewport.width}),dpr=Math.min(devicePixelRatio||1,2),canvas=$("pdfc");
  canvas.width=Math.round(viewport.width*dpr);canvas.height=Math.round(viewport.height*dpr);
  canvas.style.width=viewport.width+"px";canvas.style.height=viewport.height+"px";
  $("stage").style.width=viewport.width+"px";$("stage").style.height=viewport.height+"px";
  await page.render({canvasContext:canvas.getContext("2d"),viewport,transform:[dpr,0,0,dpr,0,0]}).promise;
  $("counter").textContent=S.page+" / "+S.count;$("prev").disabled=S.page<=1;$("next").disabled=S.page>=S.count;$("pageNav").hidden=S.count<=1;
  drawSignature();updateStep();
}

function syncPlaceAspect(){
  if(!S.place||!S.signature||!S.signature.aspect)return;
  const d=S.pageDims[S.place.page];
  if(!d)return;
  S.place.h=(S.place.w*d.w/S.signature.aspect)/d.h;
  S.place.x=clamp(0,Math.max(0,1-S.place.w),S.place.x);
  S.place.y=clamp(0,Math.max(0,1-S.place.h),S.place.y);
}

function drawSignature(){
  const el=$("sig");
  if(!S.place||!S.signature||S.place.page!==S.page){el.hidden=true;return}
  if(!Number.isFinite(S.place.h))syncPlaceAspect();
  el.hidden=false;
  el.style.left=(S.place.x*100)+"%";
  el.style.top=(S.place.y*100)+"%";
  el.style.width=(S.place.w*100)+"%";
  el.style.height=(S.place.h*100)+"%";
  $("sigimg").src=S.signature.url;
}

const pad=$("pad"),penWidth=$("penWidth"),ballpoint=$("ballpoint");

function psize(){
  const r=pad.getBoundingClientRect(),d=Math.min(devicePixelRatio||1,3);
  pad.width=Math.max(1,Math.round(r.width*d));pad.height=Math.max(1,Math.round(r.height*d));predraw();
}
function pointFromEvent(e){
  const r=pad.getBoundingClientRect();
  return{x:clamp(0,1,(e.clientX-r.left)/r.width),y:clamp(0,1,(e.clientY-r.top)/r.height),t:e.timeStamp||performance.now(),p:(e.pressure&&e.pressure>0)?e.pressure:.5};
}
function appendPoint(e){
  const p=pointFromEvent(e),last=curStroke&&curStroke[curStroke.length-1];
  if(last){
    p.x=last.x*.22+p.x*.78;p.y=last.y*.22+p.y*.78;
    if(Math.hypot(p.x-last.x,p.y-last.y)<.00065)return;
  }
  curStroke.push(p);
}
function lineStyle(a,b,bw,ball,W,H){
  if(!ball)return{w:bw,a:1};
  const dx=(b.x-a.x)*W,dy=(b.y-a.y)*H,speed=Math.hypot(dx,dy)/Math.max(1,b.t-a.t);
  const pressure=clamp(.72,1.18,.82+(b.p||.5)*.44),speedFactor=clamp(.72,1.08,1.06-speed*.32);
  return{w:bw*pressure*speedFactor,a:clamp(.76,.98,.95-speed*.10)};
}
function drawStroke(ctx,st,W,H,bw,ball){
  if(!st.length)return;
  ctx.strokeStyle="#1f4e9e";ctx.fillStyle="#1f4e9e";ctx.lineCap="round";ctx.lineJoin="round";
  if(st.length===1){
    ctx.globalAlpha=.94;ctx.beginPath();ctx.arc(st[0].x*W,st[0].y*H,bw/2,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;return;
  }
  ctx.beginPath();ctx.moveTo(st[0].x*W,st[0].y*H);
  for(let i=1;i<st.length;i++){
    const a=st[i-1],b=st[i],n=st[i+1]||b,endX=((b.x+n.x)/2)*W,endY=((b.y+n.y)/2)*H,s=lineStyle(a,b,bw,ball,W,H);
    ctx.globalAlpha=s.a;ctx.lineWidth=s.w;ctx.quadraticCurveTo(b.x*W,b.y*H,endX,endY);ctx.stroke();
    ctx.beginPath();ctx.moveTo(endX,endY);
  }
  ctx.globalAlpha=1;
}
function predraw(){
  const r=pad.getBoundingClientRect();if(!r.width||!r.height)return;
  const d=pad.width/r.width,ctx=pad.getContext("2d"),bw=Number(penWidth.value)||2.6;
  ctx.setTransform(d,0,0,d,0,0);ctx.clearRect(0,0,r.width,r.height);
  for(const st of (curStroke?[...strokes,curStroke]:strokes))drawStroke(ctx,st,r.width,r.height,bw,ballpoint.checked);
  $("okPad").disabled=!(strokes.length||curStroke);
}
function renderSignatureAsset(model){
  const H=900,W=Math.max(900,Math.round(H*(model.padAspect||1.8))),bw=(Number(model.width)||2.6)*4;
  let minx=1,miny=1,maxx=0,maxy=0;
  model.strokes.flat().forEach(p=>{minx=Math.min(minx,p.x);miny=Math.min(miny,p.y);maxx=Math.max(maxx,p.x);maxy=Math.max(maxy,p.y)});
  const full=document.createElement("canvas");full.width=W;full.height=H;const ctx=full.getContext("2d");
  for(const st of model.strokes)drawStroke(ctx,st,W,H,bw,model.ballpoint);
  const padPx=Math.max(18,bw*2.6),sx=Math.max(0,Math.floor(minx*W-padPx)),sy=Math.max(0,Math.floor(miny*H-padPx));
  const ex=Math.min(W,Math.ceil(maxx*W+padPx)),ey=Math.min(H,Math.ceil(maxy*H+padPx));
  const out=document.createElement("canvas");out.width=Math.max(1,ex-sx);out.height=Math.max(1,ey-sy);
  out.getContext("2d").drawImage(full,sx,sy,out.width,out.height,0,0,out.width,out.height);
  return{url:out.toDataURL("image/png"),aspect:out.width/out.height};
}
function openPad(existing){
  if(existing&&S.signature){
    strokes=cloneStrokes(S.signature.strokes);penWidth.value=String(S.signature.width);ballpoint.checked=!!S.signature.ballpoint;
  }else{
    strokes=[];penWidth.value=String($("sigWidth").value||2.6);ballpoint.checked=$("sigBallpoint").checked;
  }
  curStroke=null;penDown=false;$("modal").classList.add("on");requestAnimationFrame(psize);
}
function closePad(){$("modal").classList.remove("on")}

pad.onpointerdown=e=>{e.preventDefault();penDown=true;curStroke=[];appendPoint(e);pad.setPointerCapture?.(e.pointerId);predraw()};
pad.onpointermove=e=>{
  if(!penDown)return;e.preventDefault();
  const evs=e.getCoalescedEvents?e.getCoalescedEvents():[e];
  for(const ev of evs)appendPoint(ev);
  predraw();
};
function endStroke(e){
  if(!penDown)return;penDown=false;
  if(curStroke&&curStroke.length)strokes.push(curStroke);
  curStroke=null;predraw();try{pad.releasePointerCapture?.(e.pointerId)}catch(_){}
}
pad.onpointerup=endStroke;pad.onpointercancel=endStroke;
penWidth.oninput=predraw;ballpoint.onchange=predraw;
$("clearPad").onclick=()=>{strokes=[];curStroke=null;predraw()};
$("cancelPad").onclick=()=>{closePad();S.tap=null};

$("okPad").onclick=()=>{
  const r=pad.getBoundingClientRect();
  const model={strokes:cloneStrokes(strokes),width:Number(penWidth.value)||2.6,ballpoint:ballpoint.checked,padAspect:r.width/Math.max(1,r.height)};
  const asset=renderSignatureAsset(model);model.url=asset.url;model.aspect=asset.aspect;S.signature=model;
  $("sigWidth").value=String(model.width);$("sigBallpoint").checked=model.ballpoint;
  if(!S.place){
    const d=S.pageDims[S.page],w=.32,h=d?(w*d.w/model.aspect)/d.h:.10,t=S.tap||{x:.65,y:.72};
    S.place={page:S.page,x:clamp(0,1-w,t.x-w/2),y:clamp(0,Math.max(0,1-h),t.y-h/2),w,h};
  }
  closePad();S.tap=null;drawSignature();updateStep();
};

function refreshSignatureStyle(){
  if(!S.signature)return;
  S.signature.width=Number($("sigWidth").value)||2.6;S.signature.ballpoint=$("sigBallpoint").checked;
  const asset=renderSignatureAsset(S.signature);S.signature.url=asset.url;S.signature.aspect=asset.aspect;syncPlaceAspect();drawSignature();
}
$("sigWidth").oninput=refreshSignatureStyle;
$("sigBallpoint").onchange=refreshSignatureStyle;
$("redraw").onclick=()=>openPad(true);
$("removeSig").onclick=()=>{S.place=null;S.signature=null;$("sig").hidden=true;updateStep()};

$("stage").addEventListener("pointerup",e=>{
  if(e.target.closest(".sig")||S.signature)return;
  const r=$("stage").getBoundingClientRect();
  S.tap={x:clamp(0,1,(e.clientX-r.left)/r.width),y:clamp(0,1,(e.clientY-r.top)/r.height)};
  openPad(false);
});

$("sig").onpointerdown=e=>{
  if(e.target===$("handle")||!S.place)return;e.preventDefault();
  const r=$("stage").getBoundingClientRect();
  move={type:"m",sx:e.clientX,sy:e.clientY,x:S.place.x,y:S.place.y,r};
  e.currentTarget.setPointerCapture?.(e.pointerId);
};
$("handle").onpointerdown=e=>{
  if(!S.place||!S.signature)return;e.preventDefault();e.stopPropagation();
  const r=$("stage").getBoundingClientRect();
  move={type:"r",sx:e.clientX,sy:e.clientY,w:S.place.w,r};
  e.currentTarget.setPointerCapture?.(e.pointerId);
};

window.addEventListener("pointermove",e=>{
  if(!move||!S.place||!S.signature)return;
  if(move.type==="m"){
    S.place.x=clamp(0,1-S.place.w,move.x+(e.clientX-move.sx)/move.r.width);
    S.place.y=clamp(0,Math.max(0,1-S.place.h),move.y+(e.clientY-move.sy)/move.r.height);
  }else{
    const d=S.pageDims[S.place.page];
    const dx=(e.clientX-move.sx)/move.r.width;
    const dy=(e.clientY-move.sy)/move.r.height;
    const dyAsWidth=d?dy*S.signature.aspect*d.h/d.w:dy;
    const delta=Math.abs(dx)>=Math.abs(dyAsWidth)?dx:dyAsWidth;
    S.place.w=clamp(.10,.78,move.w+delta);
    syncPlaceAspect();
  }
  drawSignature();
});
window.addEventListener("pointerup",()=>move=null);

async function finalize(){
  if(!S.place||!S.signature||!S.bytes)return;
  prog(true,"Подписываем документ","Добавляем подпись в PDF");
  try{
    const originalName=S.file.name,doc=await PDFLib.PDFDocument.load(S.bytes.slice()),page=doc.getPages()[S.place.page-1];
    const image=await doc.embedPng(S.signature.url),size=page.getSize(),w=S.place.w*size.width,h=S.place.h*size.height;
    page.drawImage(image,{x:S.place.x*size.width,y:size.height-S.place.y*size.height-h,width:w,height:h});
    S.final=new Uint8Array(await doc.save());S.base=base(originalName)+"_signed";
    try{if(S.pdf)await S.pdf.destroy()}catch(_){}
    S.pdf=null;S.bytes=null;S.file=null;S.format=null;S.place=null;S.tap=null;S.signature=null;
    strokes=[];curStroke=null;penDown=false;$("sig").hidden=true;$("sigimg").removeAttribute("src");
    $("pdfc").width=1;$("pdfc").height=1;pad.width=1;pad.height=1;screen("done");
  }catch(e){alert(e.message||"Не удалось подписать документ.")}
  finally{prog(false)}
}

function psRound(ctx,x,y,w,h,r,fill,stroke){
  ctx.beginPath();
  const rr=Math.min(r,w/2,h/2);
  ctx.moveTo(x+rr,y);ctx.arcTo(x+w,y,x+w,y+h,rr);ctx.arcTo(x+w,y+h,x,y+h,rr);ctx.arcTo(x,y+h,x,y,rr);ctx.arcTo(x,y,x+w,y,rr);ctx.closePath();
  if(fill){ctx.fillStyle=fill;ctx.fill()} if(stroke){ctx.strokeStyle=stroke;ctx.stroke()}
}
function psWrap(ctx,text,x,y,maxWidth,lineHeight,maxLines=4){
  const words=String(text).split(/\s+/);let line="",lines=[];
  for(const word of words){
    const t=line?line+" "+word:word;
    if(ctx.measureText(t).width>maxWidth&&line){lines.push(line);line=word}else line=t;
  }
  if(line)lines.push(line);
  lines=lines.slice(0,maxLines);
  lines.forEach((ln,i)=>ctx.fillText(ln,x,y+i*lineHeight));
  return y+lines.length*lineHeight;
}
function psDocIcon(ctx,cx,cy,s){
  ctx.save();ctx.translate(cx,cy);ctx.lineWidth=5*s;ctx.strokeStyle="#1677f2";ctx.fillStyle="#fff";
  psRound(ctx,-34*s,-44*s,68*s,88*s,10*s,"#fff","#1677f2");
  ctx.beginPath();ctx.moveTo(-20*s,-18*s);ctx.lineTo(16*s,-18*s);ctx.moveTo(-20*s,-2*s);ctx.lineTo(11*s,-2*s);ctx.strokeStyle="#9ec7ff";ctx.stroke();
  ctx.beginPath();ctx.moveTo(-22*s,24*s);ctx.bezierCurveTo(-5*s,4*s,0*s,38*s,25*s,12*s);ctx.strokeStyle="#0b63ce";ctx.lineWidth=4*s;ctx.stroke();ctx.restore();
}
function psMiniIllustration(ctx,type,x,y,w,h){
  ctx.save();ctx.translate(x,y);
  ctx.strokeStyle="#0b63ce";ctx.fillStyle="#eaf3ff";ctx.lineWidth=5;
  if(type==="file"){psDocIcon(ctx,w/2,h/2,1.15);ctx.beginPath();ctx.arc(w*.76,h*.65,22,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.beginPath();ctx.moveTo(w*.76-10,h*.65);ctx.lineTo(w*.76+10,h*.65);ctx.moveTo(w*.76,h*.65-10);ctx.lineTo(w*.76,h*.65+10);ctx.stroke()}
  if(type==="place"){psRound(ctx,w*.16,h*.18,w*.68,h*.62,18,"#fff","#b7c7d9");ctx.strokeStyle="#c5d1de";ctx.lineWidth=7;for(let i=0;i<4;i++){ctx.beginPath();ctx.moveTo(w*.25,h*(.30+i*.11));ctx.lineTo(w*.70,h*(.30+i*.11));ctx.stroke()}ctx.strokeStyle="#1677f2";ctx.setLineDash([12,9]);ctx.strokeRect(w*.52,h*.58,w*.22,h*.12);ctx.setLineDash([])}
  if(type==="sign"){psRound(ctx,w*.12,h*.14,w*.76,h*.67,20,"#fff","#b7c7d9");ctx.beginPath();ctx.moveTo(w*.25,h*.65);ctx.bezierCurveTo(w*.40,h*.35,w*.42,h*.78,w*.58,h*.50);ctx.bezierCurveTo(w*.63,h*.42,w*.64,h*.69,w*.78,h*.45);ctx.strokeStyle="#1677f2";ctx.lineWidth=7;ctx.lineCap="round";ctx.stroke()}
  if(type==="pdf"){psDocIcon(ctx,w*.48,h*.46,1.12);ctx.beginPath();ctx.arc(w*.72,h*.28,30,0,Math.PI*2);ctx.fillStyle="#e7f7ef";ctx.fill();ctx.strokeStyle="#27b96f";ctx.stroke();ctx.beginPath();ctx.moveTo(w*.61,h*.28);ctx.lineTo(w*.69,h*.37);ctx.lineTo(w*.84,h*.19);ctx.strokeStyle="#27b96f";ctx.lineWidth=7;ctx.stroke()}
  if(type==="link"){psRound(ctx,w*.15,h*.26,w*.70,h*.38,22,"#fff","#b7c7d9");psDocIcon(ctx,w*.34,h*.45,.72);ctx.fillStyle="#0b63ce";ctx.font="700 24px Arial";ctx.fillText("Personal Sign",w*.47,h*.46)}
  if(type==="menu"){psRound(ctx,w*.18,h*.18,w*.64,h*.64,26,"#fff","#b7c7d9");ctx.fillStyle="#eaf3ff";psRound(ctx,w*.26,h*.51,w*.48,h*.22,18,"#eaf3ff");ctx.strokeStyle="#1677f2";ctx.beginPath();ctx.moveTo(w*.36,h*.62);ctx.lineTo(w*.36,h*.45);ctx.moveTo(w*.30,h*.51);ctx.lineTo(w*.36,h*.45);ctx.lineTo(w*.42,h*.51);ctx.stroke()}
  if(type==="home"){psRound(ctx,w*.18,h*.17,w*.64,h*.66,24,"#fff","#b7c7d9");for(let i=0;i<3;i++){psRound(ctx,w*(.28+i*.15),h*.36,w*.10,h*.10,10,"#eaf3ff");psRound(ctx,w*(.28+i*.15),h*.53,w*.10,h*.10,10,"#eaf3ff")}ctx.strokeStyle="#1677f2";ctx.lineWidth=6;ctx.beginPath();ctx.moveTo(w*.40,h*.72);ctx.lineTo(w*.50,h*.62);ctx.lineTo(w*.60,h*.72);ctx.stroke()}
  if(type==="confirm"){psRound(ctx,w*.17,h*.16,w*.66,h*.67,25,"#fff","#b7c7d9");psDocIcon(ctx,w*.42,h*.48,.72);ctx.beginPath();ctx.arc(w*.68,h*.40,31,0,Math.PI*2);ctx.fillStyle="#1677f2";ctx.fill();ctx.strokeStyle="#fff";ctx.lineWidth=7;ctx.beginPath();ctx.moveTo(w*.57,h*.40);ctx.lineTo(w*.65,h*.49);ctx.lineTo(w*.80,h*.30);ctx.stroke()}
  ctx.restore();
}
async function buildInstructionPdf(kind){
  const c=document.createElement("canvas");c.width=1080;c.height=1920;const ctx=c.getContext("2d");
  const blue="#0b63ce",ink="#071b45",muted="#7186a4",line="#dce8f5";
  ctx.fillStyle="#f9fcff";ctx.fillRect(0,0,c.width,c.height);
  const grad=ctx.createRadialGradient(100,60,20,100,60,620);grad.addColorStop(0,"#dceeff");grad.addColorStop(1,"rgba(220,238,255,0)");ctx.fillStyle=grad;ctx.fillRect(0,0,700,680);
  psDocIcon(ctx,382,105,.72);ctx.fillStyle=ink;ctx.font="800 48px Arial";ctx.fillText("Personal",440,121);ctx.fillStyle=blue;ctx.fillText("Sign",650,121);
  const home=kind==="home";
  ctx.fillStyle=ink;ctx.textAlign="center";ctx.font="800 68px Arial";
  ctx.fillText(home?"Как добавить на экран телефона":"Как подписать документ",540,245);
  ctx.fillStyle=muted;ctx.font="400 31px Arial";
  ctx.fillText(home?"Чтобы открывать Personal Sign как приложение.":"Короткий путь: документ → подпись → PDF.",540,300);
  ctx.textAlign="left";
  const data=home?[
    ["Откройте ссылку","Запустите Personal Sign в браузере телефона.","link"],
    ["Откройте меню","Нажмите «Поделиться» или кнопку меню браузера.","menu"],
    ["Добавьте на экран","Выберите «На экран Домой» или «Установить приложение».","home"],
    ["Подтвердите","Нажмите «Добавить», и иконка появится на экране.","confirm"]
  ]:[
    ["Выберите документ","Откройте PDF, DOCX или DOC.","file"],
    ["Укажите место подписи","Коснитесь нужного места в документе.","place"],
    ["Поставьте подпись","Распишитесь пальцем в белом поле.","sign"],
    ["Скачайте PDF","Получите готовый подписанный файл.","pdf"]
  ];
  const xs=[48,554],ys=[360,1024],cw=478,ch=620;
  data.forEach((it,i)=>{
    const x=xs[i%2],y=ys[Math.floor(i/2)];
    psRound(ctx,x,y,cw,ch,30,"#fff",line);
    ctx.fillStyle="#e5f2ff";ctx.beginPath();ctx.arc(x+54,y+58,38,0,Math.PI*2);ctx.fill();
    ctx.fillStyle=blue;ctx.font="800 40px Arial";ctx.textAlign="center";ctx.fillText(String(i+1),x+54,y+72);
    ctx.textAlign="left";ctx.fillStyle=ink;ctx.font="800 34px Arial";psWrap(ctx,it[0],x+106,y+55,cw-132,40,2);
    ctx.fillStyle=muted;ctx.font="400 27px Arial";psWrap(ctx,it[1],x+106,y+110,cw-132,34,3);
    psMiniIllustration(ctx,it[2],x+34,y+205,cw-68,365);
  });
  psRound(ctx,48,1690,984,140,28,home?"#eaf3ff":"#e7f7ef",null);
  ctx.fillStyle=home?blue:"#168554";ctx.font="800 42px Arial";ctx.textAlign="center";ctx.fillText(home?"⌂":"✓",108,1776);
  ctx.fillStyle=ink;ctx.font="700 26px Arial";ctx.textAlign="left";
  psWrap(ctx,home?"После добавления Personal Sign открывается как обычное приложение.":"Документ обрабатывается только на вашем устройстве.",165,1742,815,35,2);
  const png=c.toDataURL("image/png");
  const doc=await PDFLib.PDFDocument.create(),img=await doc.embedPng(png),page=doc.addPage([540,960]);
  page.drawImage(img,{x:0,y:0,width:540,height:960});
  return new Uint8Array(await doc.save());
}
function openInstructionPdf(kind){
  const popup=window.open("about:blank","_blank");
  prog(true,"Готовим инструкцию","Создаём PDF на вашем устройстве");
  buildInstructionPdf(kind).then(bytes=>{
    const blob=new Blob([bytes],{type:"application/pdf"}),url=URL.createObjectURL(blob);
    if(popup)popup.location.href=url;else dl(bytes,kind==="home"?"personal-sign-add-to-home-screen.pdf":"personal-sign-how-to-use.pdf","application/pdf");
    setTimeout(()=>URL.revokeObjectURL(url),60000);
  }).catch(e=>{try{popup?.close()}catch(_){};alert(e.message||"Не удалось открыть инструкцию.")}).finally(()=>prog(false));
}
document.querySelectorAll(".help-link").forEach(btn=>btn.addEventListener("click",()=>openInstructionPdf(btn.dataset.instruction)));

$("start").onclick=()=>$("picker").click();
$("picker").onchange=e=>{choose(e.target.files[0]);e.target.value=""};
$("editBack").onclick=async()=>{await wipeSession();screen("home")};
$("editContinue").onclick=wordEditorToPdf;
$("homeBtn").onclick=async()=>{await wipeSession();screen("home")};
$("doneHome").onclick=async()=>{await wipeSession();screen("home")};
$("prev").onclick=async()=>{if(S.page>1){S.page--;await render()}};
$("next").onclick=async()=>{if(S.page<S.count){S.page++;await render()}};
$("finish").onclick=finalize;
$("getPdf").onclick=()=>{if(S.final)dl(S.final,S.base+".pdf","application/pdf")};

window.addEventListener("resize",()=>{
  if($("modal").classList.contains("on"))psize();
  if($("editDoc").classList.contains("on"))fitWordEditor();
  if(S.pdf&&$("sign").classList.contains("on"))render().catch(()=>{});
});

if("serviceWorker"in navigator)window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js").catch(()=>{}));
})();