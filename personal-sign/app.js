(function(){
"use strict";

pdfjsLib.GlobalWorkerOptions.workerSrc="./vendor/pdfjs-worker-2.9.359.min.js";

const $=id=>document.getElementById(id);
const screens=[...document.querySelectorAll(".screen")];
const S={
  file:null,format:null,bytes:null,pdf:null,page:1,count:1,final:null,base:null,
  mode:"sign",tap:null,place:null,signature:null,textEdits:[],editTextId:null,textTap:null,pageMetrics:{}
};
let textSeq=1;
let strokes=[],cur=null,down=false,padEditing=false,move=null;

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
  Object.assign(S,{file:null,format:null,bytes:null,pdf:null,page:1,count:1,final:null,base:null,mode:"sign",tap:null,place:null,signature:null,textEdits:[],editTextId:null,textTap:null,pageMetrics:{}});
  strokes=[];cur=null;down=false;move=null;
  $("sig").hidden=true;$("sigimg").removeAttribute("src");$("textLayer").innerHTML="";
  $("pdfc").width=1;$("pdfc").height=1;$("signActions").hidden=true;$("sigControls").hidden=true;
  $("textMode").classList.remove("active");
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
  const canvas=await html2canvas(node,{scale:Math.min(devicePixelRatio||1,2),backgroundColor:"#fff",logging:false,useCORS:true});
  const cssW=794,cssH=1123,ratio=canvas.width/cssW,slice=Math.round(cssH*ratio);
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

async function docxToPdf(file){
  if(!window.docx)throw Error("Не удалось открыть документ Word.");
  const sb=$("sandbox");sb.innerHTML="";prog(true,"Готовим документ","Это происходит на вашем устройстве");
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
      const p=out.addPage([w,h]);p.drawImage(png,{x:0,y:0,width:w,height:h});
    }
    return new Uint8Array(await out.save());
  }finally{sb.innerHTML="";prog(false)}
}

function esc(s){return String(s).replace(/[&<>]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;"}[c]))}
async function docToPdf(file){
  if(!window.docToText)throw Error("Не удалось открыть документ Word.");
  prog(true,"Готовим документ","Это происходит на вашем устройстве");
  const sb=$("sandbox");sb.innerHTML="";
  try{
    const ab=await file.arrayBuffer(),rich=docToText.html(ab),plain=docToText(ab);
    if(!rich&&!plain)throw Error("Этот DOC не удалось прочитать.");
    const d=document.createElement("div");d.className="legacy";
    d.innerHTML=(rich&&rich.body?rich.body:esc(plain||"")).replace(/\t/g,"    ");sb.appendChild(d);
    return await htmlCanvasToPdf(d);
  }finally{sb.innerHTML="";prog(false)}
}

async function openPdf(bytes,file,format){
  const pdf=await pdfjsLib.getDocument({data:bytes.slice()}).promise;
  try{if(S.pdf)await S.pdf.destroy()}catch(_){}
  Object.assign(S,{file,format,bytes,pdf,page:1,count:pdf.numPages,final:null,base:null,mode:"sign",tap:null,place:null,signature:null,textEdits:[],editTextId:null,textTap:null,pageMetrics:{}});
  $("fname").textContent=file.name;$("sigWidth").value="2.6";$("sigBallpoint").checked=true;
  screen("sign");updateStep();await render();
}

async function choose(file){
  if(!file)return;
  try{
    if(/\.pdf$/i.test(file.name)||file.type==="application/pdf")return openPdf(new Uint8Array(await file.arrayBuffer()),file,"pdf");
    if(/\.docx$/i.test(file.name)||file.type.indexOf("wordprocessingml")>=0)return openPdf(await docxToPdf(file),file,"docx");
    if(/\.doc$/i.test(file.name)||file.type==="application/msword")return openPdf(await docToPdf(file),file,"doc");
    throw Error("Выберите PDF, DOCX или DOC.");
  }catch(e){prog(false);alert(e.message||"Не удалось открыть документ.")}
}

function signatureHeightFrac(rect){
  if(!S.place||!S.signature||!S.signature.aspect)return 0;
  return (S.place.w*rect.width/S.signature.aspect)/rect.height;
}
function textHeightPts(edit){
  const lines=Math.max(1,String(edit.text||"").split("\n").length);
  return edit.fontSize*(1.38*lines+.55);
}
function textHeightFrac(edit){
  const m=S.pageMetrics[edit.page];
  return m?textHeightPts(edit)/m.pdfH:.04;
}

function updateStep(){
  const has=!!(S.place&&S.signature);
  const textMode=S.mode==="text";
  $("textMode").classList.toggle("active",textMode);
  $("textMode").textContent=textMode?"Отмена":"Исправить текст";
  if(textMode){
    $("stepTitle").textContent="Исправьте текст";
    $("stepHelp").textContent="Коснитесь места в документе и введите правильный текст.";
    $("signHint").textContent="Коснитесь строки или слова, которое нужно заменить";
    $("signHint").hidden=false;$("sigControls").hidden=true;$("signActions").hidden=true;
  }else if(has){
    $("stepTitle").textContent="Проверьте подпись";
    $("stepHelp").textContent="Передвиньте или измените размер. Настройте толщину линии при необходимости.";
    $("signHint").hidden=true;$("sigControls").hidden=false;$("signActions").hidden=false;
  }else{
    $("stepTitle").textContent="Укажите место подписи";
    $("stepHelp").textContent="Проверьте документ и коснитесь места, где должна стоять подпись.";
    $("signHint").textContent="Коснитесь документа, чтобы поставить подпись";
    $("signHint").hidden=false;$("sigControls").hidden=true;$("signActions").hidden=true;
  }
}

async function render(){
  if(!S.pdf)return;
  const page=await S.pdf.getPage(S.page),baseViewport=page.getViewport({scale:1});
  const viewer=document.querySelector(".viewer");
  const width=Math.max(260,Math.min(760,viewer.clientWidth-12));
  const viewport=page.getViewport({scale:width/baseViewport.width}),dpr=Math.min(devicePixelRatio||1,2),canvas=$("pdfc");
  canvas.width=Math.round(viewport.width*dpr);canvas.height=Math.round(viewport.height*dpr);
  canvas.style.width=viewport.width+"px";canvas.style.height=viewport.height+"px";
  $("stage").style.width=viewport.width+"px";$("stage").style.height=viewport.height+"px";
  S.pageMetrics[S.page]={pdfW:baseViewport.width,pdfH:baseViewport.height,stageW:viewport.width,stageH:viewport.height};
  await page.render({canvasContext:canvas.getContext("2d"),viewport,transform:[dpr,0,0,dpr,0,0]}).promise;
  $("counter").textContent=S.page+" / "+S.count;$("prev").disabled=S.page<=1;$("next").disabled=S.page>=S.count;$("pageNav").hidden=S.count<=1;
  drawAll();
}

function drawAll(){drawSignature();renderTextEdits();updateStep()}

function drawSignature(){
  const el=$("sig");
  if(!S.place||!S.signature||S.place.page!==S.page){el.hidden=true;return}
  const r=$("stage").getBoundingClientRect(),h=signatureHeightFrac(r);
  S.place.y=clamp(0,Math.max(0,1-h),S.place.y);S.place.x=clamp(0,Math.max(0,1-S.place.w),S.place.x);
  el.hidden=false;el.style.left=(S.place.x*100)+"%";el.style.top=(S.place.y*100)+"%";el.style.width=(S.place.w*100)+"%";el.style.height=(h*100)+"%";
  $("sigimg").src=S.signature.url;
}

function renderTextEdits(){
  const layer=$("textLayer");layer.innerHTML="";
  const m=S.pageMetrics[S.page];if(!m)return;
  const scale=m.stageW/m.pdfW;
  for(const edit of S.textEdits.filter(x=>x.page===S.page)){
    const el=document.createElement("div");el.className="text-edit"+(edit.cover?" cover":"");el.dataset.id=edit.id;
    el.style.left=(edit.x*100)+"%";el.style.top=(edit.y*100)+"%";el.style.width=(edit.w*100)+"%";el.style.fontSize=(edit.fontSize*scale)+"px";el.style.minHeight=(textHeightPts(edit)*scale)+"px";
    const span=document.createElement("span");span.className="txt";span.textContent=edit.text;el.appendChild(span);
    const h=document.createElement("div");h.className="text-handle";el.appendChild(h);layer.appendChild(el);

    el.addEventListener("pointerdown",e=>{
      if(e.target===h)return;
      e.preventDefault();const r=$("stage").getBoundingClientRect();
      move={type:"tm",id:edit.id,el,sx:e.clientX,sy:e.clientY,x:edit.x,y:edit.y,r,dragged:false};
      el.setPointerCapture?.(e.pointerId);
    });
    h.addEventListener("pointerdown",e=>{
      e.preventDefault();e.stopPropagation();const r=$("stage").getBoundingClientRect();
      move={type:"tr",id:edit.id,el,sx:e.clientX,w:edit.w,r,dragged:false};h.setPointerCapture?.(e.pointerId);
    });
  }
}

function pointFromEvent(e){
  const r=pad.getBoundingClientRect();
  return{x:clamp(0,1,(e.clientX-r.left)/r.width),y:clamp(0,1,(e.clientY-r.top)/r.height),t:e.timeStamp||performance.now(),p:(e.pressure&&e.pressure>0)?e.pressure:.5};
}
function appendPoint(e){
  const p=pointFromEvent(e),last=cur&&cur[cur.length-1];
  if(last){
    p.x=last.x*.22+p.x*.78;p.y=last.y*.22+p.y*.78;
    if(Math.hypot(p.x-last.x,p.y-last.y)<.00065)return;
  }
  cur.push(p);
}
function lineStyle(a,b,bw,ball,W,H){
  if(!ball)return{w:bw,a:1};
  const dx=(b.x-a.x)*W,dy=(b.y-a.y)*H,speed=Math.hypot(dx,dy)/Math.max(1,b.t-a.t);
  const pressure=clamp(.72,1.18,.82+(b.p||.5)*.44),speedFactor=clamp(.72,1.08,1.06-speed*.32);
  return{w:bw*pressure*speedFactor,a:clamp(.76,.98,.95-speed*.10)};
}
function drawStroke(ctx,st,W,H,bw,ball){
  if(!st.length)return;ctx.strokeStyle="#1f4e9e";ctx.fillStyle="#1f4e9e";ctx.lineCap="round";ctx.lineJoin="round";
  if(st.length===1){ctx.globalAlpha=.94;ctx.beginPath();ctx.arc(st[0].x*W,st[0].y*H,bw/2,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;return}
  for(let i=1;i<st.length;i++){
    const a=st[i-1],b=st[i],n=st[i+1]||b,endX=((b.x+n.x)/2)*W,endY=((b.y+n.y)/2)*H,s=lineStyle(a,b,bw,ball,W,H);
    ctx.globalAlpha=s.a;ctx.lineWidth=s.w;ctx.beginPath();ctx.moveTo(a.x*W,a.y*H);ctx.quadraticCurveTo(b.x*W,b.y*H,endX,endY);ctx.stroke();
  }
  ctx.globalAlpha=1;
}

const pad=$("pad"),penWidth=$("penWidth"),ballpoint=$("ballpoint");
function psize(){
  const r=pad.getBoundingClientRect(),d=Math.min(devicePixelRatio||1,3);
  pad.width=Math.max(1,Math.round(r.width*d));pad.height=Math.max(1,Math.round(r.height*d));predraw();
}
function predraw(){
  const r=pad.getBoundingClientRect();if(!r.width||!r.height)return;
  const d=pad.width/r.width,ctx=pad.getContext("2d"),bw=Number(penWidth.value)||2.6;
  ctx.setTransform(d,0,0,d,0,0);ctx.clearRect(0,0,r.width,r.height);
  for(const st of (cur?[...strokes,cur]:strokes))drawStroke(ctx,st,r.width,r.height,bw,ballpoint.checked);
  $("okPad").disabled=!(strokes.length||cur);
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
  padEditing=!!(existing&&S.signature);
  if(padEditing){
    strokes=cloneStrokes(S.signature.strokes);penWidth.value=String(S.signature.width);ballpoint.checked=!!S.signature.ballpoint;
  }else{
    strokes=[];penWidth.value=String($("sigWidth").value||2.6);ballpoint.checked=$("sigBallpoint").checked;
  }
  cur=null;down=false;$("modal").classList.add("on");requestAnimationFrame(psize);
}
function closePad(){$("modal").classList.remove("on")}

pad.onpointerdown=e=>{e.preventDefault();down=true;cur=[];appendPoint(e);pad.setPointerCapture?.(e.pointerId);predraw()};
pad.onpointermove=e=>{
  if(!down)return;e.preventDefault();const evs=e.getCoalescedEvents?e.getCoalescedEvents():[e];for(const ev of evs)appendPoint(ev);predraw();
};
function endStroke(e){
  if(!down)return;down=false;if(cur&&cur.length)strokes.push(cur);cur=null;predraw();try{pad.releasePointerCapture?.(e.pointerId)}catch(_){}
}
pad.onpointerup=endStroke;pad.onpointercancel=endStroke;
penWidth.oninput=predraw;ballpoint.onchange=predraw;
$("clearPad").onclick=()=>{strokes=[];cur=null;predraw()};
$("cancelPad").onclick=()=>{closePad();S.tap=null};

$("okPad").onclick=()=>{
  const r=pad.getBoundingClientRect(),model={strokes:cloneStrokes(strokes),width:Number(penWidth.value)||2.6,ballpoint:ballpoint.checked,padAspect:r.width/Math.max(1,r.height)};
  const asset=renderSignatureAsset(model);model.url=asset.url;model.aspect=asset.aspect;S.signature=model;
  $("sigWidth").value=String(model.width);$("sigBallpoint").checked=model.ballpoint;
  if(!S.place){
    const stage=$("stage").getBoundingClientRect(),w=.32,h=(w*stage.width/model.aspect)/stage.height,t=S.tap||{x:.65,y:.72};
    S.place={page:S.page,x:clamp(0,1-w,t.x-w/2),y:clamp(0,Math.max(0,1-h),t.y-h/2),w};
  }
  closePad();S.tap=null;S.mode="sign";drawAll();
};

function refreshSignatureStyle(){
  if(!S.signature)return;
  S.signature.width=Number($("sigWidth").value)||2.6;S.signature.ballpoint=$("sigBallpoint").checked;
  const asset=renderSignatureAsset(S.signature);S.signature.url=asset.url;S.signature.aspect=asset.aspect;drawSignature();
}
$("sigWidth").oninput=refreshSignatureStyle;$("sigBallpoint").onchange=refreshSignatureStyle;
$("redraw").onclick=()=>openPad(true);
$("removeSig").onclick=()=>{S.place=null;S.signature=null;$("sig").hidden=true;updateStep()};

function openTextEditor(id,tap){
  S.editTextId=id||null;S.textTap=tap||null;const edit=id?S.textEdits.find(x=>x.id===id):null;
  $("textValue").value=edit?edit.text:"";$("textSize").value=String(edit?edit.fontSize:14);$("textSizeValue").textContent=$("textSize").value;$("textCover").checked=edit?edit.cover:true;$("textDelete").hidden=!edit;
  $("textModal").hidden=false;setTimeout(()=>$("textValue").focus(),60);
}
function closeTextEditor(){$("textModal").hidden=true;S.editTextId=null;S.textTap=null}
$("textSize").oninput=()=>$("textSizeValue").textContent=$("textSize").value;
$("textCancel").onclick=()=>{closeTextEditor();S.mode="sign";updateStep()};
$("textDelete").onclick=()=>{
  if(S.editTextId)S.textEdits=S.textEdits.filter(x=>x.id!==S.editTextId);
  closeTextEditor();S.mode="sign";renderTextEdits();updateStep();
};
$("textSave").onclick=()=>{
  const text=$("textValue").value.trimEnd();if(!text.trim()){alert("Введите текст.");return}
  const fontSize=Number($("textSize").value)||14,cover=$("textCover").checked,m=S.pageMetrics[S.page];if(!m)return;
  const lines=text.split("\n"),longest=Math.max(...lines.map(x=>x.length),1),autoW=clamp(.12,.78,(longest*fontSize*.58+fontSize*1.2)/m.pdfW);
  let edit=S.editTextId?S.textEdits.find(x=>x.id===S.editTextId):null;
  if(edit){
    edit.text=text;edit.fontSize=fontSize;edit.cover=cover;edit.w=Math.max(edit.w,Math.min(.78,autoW));edit.y=clamp(0,Math.max(0,1-textHeightFrac(edit)),edit.y);
  }else{
    const tap=S.textTap||{x:.2,y:.2},temp={page:S.page,text,fontSize,cover},h=textHeightPts(temp)/m.pdfH,w=autoW;
    edit={id:"t"+(textSeq++),page:S.page,text,fontSize,cover,w,x:clamp(0,1-w,tap.x),y:clamp(0,Math.max(0,1-h),tap.y-h/2)};
    S.textEdits.push(edit);
  }
  closeTextEditor();S.mode="sign";renderTextEdits();updateStep();
};

$("textMode").onclick=()=>{S.mode=S.mode==="text"?"sign":"text";updateStep()};

$("stage").addEventListener("pointerup",e=>{
  if(e.target.closest(".sig")||e.target.closest(".text-edit"))return;
  const r=$("stage").getBoundingClientRect(),tap={x:clamp(0,1,(e.clientX-r.left)/r.width),y:clamp(0,1,(e.clientY-r.top)/r.height)};
  if(S.mode==="text"){openTextEditor(null,tap);return}
  if(!S.signature){S.tap=tap;openPad(false)}
});

$("sig").onpointerdown=e=>{
  if(e.target===$("handle")||!S.place)return;e.preventDefault();const r=$("stage").getBoundingClientRect();
  move={type:"sm",sx:e.clientX,sy:e.clientY,x:S.place.x,y:S.place.y,r};e.currentTarget.setPointerCapture?.(e.pointerId);
};
$("handle").onpointerdown=e=>{
  if(!S.place||!S.signature)return;e.preventDefault();e.stopPropagation();const r=$("stage").getBoundingClientRect();
  move={type:"sr",sx:e.clientX,sy:e.clientY,w:S.place.w,r};e.currentTarget.setPointerCapture?.(e.pointerId);
};

window.addEventListener("pointermove",e=>{
  if(!move)return;
  if(move.type==="sm"&&S.place&&S.signature){
    const h=signatureHeightFrac(move.r);S.place.x=clamp(0,1-S.place.w,move.x+(e.clientX-move.sx)/move.r.width);S.place.y=clamp(0,Math.max(0,1-h),move.y+(e.clientY-move.sy)/move.r.height);drawSignature();
  }else if(move.type==="sr"&&S.place&&S.signature){
    const dx=e.clientX-move.sx,dy=e.clientY-move.sy,delta=(dx+dy*S.signature.aspect)/2,start=move.w*move.r.width;
    S.place.w=clamp(.10,.78,(start+delta)/move.r.width);const h=signatureHeightFrac(move.r);S.place.x=clamp(0,1-S.place.w,S.place.x);S.place.y=clamp(0,Math.max(0,1-h),S.place.y);drawSignature();
  }else if((move.type==="tm"||move.type==="tr")){
    const edit=S.textEdits.find(x=>x.id===move.id);if(!edit)return;
    if(move.type==="tm"){
      const dx=(e.clientX-move.sx)/move.r.width,dy=(e.clientY-move.sy)/move.r.height,h=textHeightFrac(edit);
      if(Math.abs(e.clientX-move.sx)+Math.abs(e.clientY-move.sy)>5)move.dragged=true;
      edit.x=clamp(0,1-edit.w,move.x+dx);edit.y=clamp(0,Math.max(0,1-h),move.y+dy);
      move.el.style.left=(edit.x*100)+"%";move.el.style.top=(edit.y*100)+"%";
    }else{
      if(Math.abs(e.clientX-move.sx)>3)move.dragged=true;
      edit.w=clamp(.10,.80,move.w+(e.clientX-move.sx)/move.r.width);edit.x=clamp(0,1-edit.w,edit.x);move.el.style.width=(edit.w*100)+"%";move.el.style.left=(edit.x*100)+"%";
    }
  }
});
window.addEventListener("pointerup",()=>{
  if(move&&move.type==="tm"&&!move.dragged){const id=move.id;move=null;openTextEditor(id);return}
  move=null;
});

function makeTextImage(text,fontSize){
  const scale=4,lines=String(text).split("\n"),probe=document.createElement("canvas"),pc=probe.getContext("2d");
  pc.font=`${fontSize*scale}px Arial, sans-serif`;
  const pad=fontSize*.22*scale,lineH=fontSize*1.35*scale,maxW=Math.max(...lines.map(l=>pc.measureText(l||" ").width));
  const c=document.createElement("canvas");c.width=Math.max(4,Math.ceil(maxW+pad*2));c.height=Math.max(4,Math.ceil(lines.length*lineH+pad*2));
  const ctx=c.getContext("2d");ctx.font=`${fontSize*scale}px Arial, sans-serif`;ctx.fillStyle="#111";ctx.textBaseline="top";
  lines.forEach((line,i)=>ctx.fillText(line,pad,pad+i*lineH));
  return{url:c.toDataURL("image/png"),w:c.width/scale,h:c.height/scale};
}

async function finalize(){
  if(!S.place||!S.signature||!S.bytes)return;
  prog(true,"Подписываем документ","Добавляем исправления и подпись");
  try{
    const originalName=S.file.name,doc=await PDFLib.PDFDocument.load(S.bytes.slice()),pages=doc.getPages();

    for(const edit of S.textEdits){
      const page=pages[edit.page-1];if(!page)continue;const size=page.getSize(),imgData=makeTextImage(edit.text,edit.fontSize),boxH=textHeightPts(edit);
      const x=edit.x*size.width,top=edit.y*size.height,boxW=edit.w*size.width,y=size.height-top-boxH;
      if(edit.cover)page.drawRectangle({x,y,width:boxW,height:boxH,color:PDFLib.rgb(1,1,1)});
      const img=await doc.embedPng(imgData.url),imgY=size.height-top-imgData.h-(edit.fontSize*.10);
      page.drawImage(img,{x:x+edit.fontSize*.12,y:imgY,width:imgData.w,height:imgData.h});
    }

    const page=pages[S.place.page-1],size=page.getSize(),image=await doc.embedPng(S.signature.url),w=S.place.w*size.width,h=w/S.signature.aspect;
    page.drawImage(image,{x:S.place.x*size.width,y:size.height-S.place.y*size.height-h,width:w,height:h});

    S.final=new Uint8Array(await doc.save());S.base=base(originalName)+"_signed";
    try{if(S.pdf)await S.pdf.destroy()}catch(_){}
    S.pdf=null;S.bytes=null;S.file=null;S.format=null;S.place=null;S.signature=null;S.tap=null;S.textEdits=[];S.pageMetrics={};
    strokes=[];cur=null;down=false;$("sig").hidden=true;$("sigimg").removeAttribute("src");$("textLayer").innerHTML="";$("pdfc").width=1;$("pdfc").height=1;pad.width=1;pad.height=1;
    screen("done");
  }catch(e){alert(e.message||"Не удалось подписать документ.")}
  finally{prog(false)}
}

document.querySelectorAll(".help-link").forEach(btn=>btn.addEventListener("click",()=>{
  $("helpImage").src=btn.dataset.help;$("helpImage").alt=btn.dataset.title||"Инструкция";$("helpModal").hidden=false;
}));
function closeHelp(){$("helpModal").hidden=true;$("helpImage").removeAttribute("src")}
$("helpClose").onclick=closeHelp;$("helpModal").addEventListener("click",e=>{if(e.target===$("helpModal"))closeHelp()});
document.addEventListener("keydown",e=>{if(e.key==="Escape"&&!$("helpModal").hidden)closeHelp()});

$("start").onclick=()=>$("picker").click();$("picker").onchange=e=>{choose(e.target.files[0]);e.target.value=""};
$("homeBtn").onclick=async()=>{await wipeSession();screen("home")};$("doneHome").onclick=async()=>{await wipeSession();screen("home")};
$("prev").onclick=async()=>{if(S.page>1){S.page--;await render()}};$("next").onclick=async()=>{if(S.page<S.count){S.page++;await render()}};
$("finish").onclick=finalize;$("getPdf").onclick=()=>{if(S.final)dl(S.final,S.base+".pdf","application/pdf")};

window.addEventListener("resize",()=>{
  if($("modal").classList.contains("on"))psize();
  if(S.pdf&&$("sign").classList.contains("on"))render().catch(()=>{});
});

if("serviceWorker"in navigator)window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js").catch(()=>{}));
})();