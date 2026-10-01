(function(){
"use strict";
pdfjsLib.GlobalWorkerOptions.workerSrc="./vendor/pdfjs-worker-2.9.359.min.js";
const $=id=>document.getElementById(id), screens=[...document.querySelectorAll(".screen")];
const S={file:null,format:null,bytes:null,pdf:null,page:1,count:1,place:null,tap:null,final:null,psig:null,base:null};
function screen(id){screens.forEach(x=>x.classList.toggle("on",x.id===id));scrollTo(0,0)}
function msg(t,bad){const e=$("banner");e.textContent=t;e.className="notice"+(bad?" err":"")}
function prog(on,title,detail){$("progress").classList.toggle("on",on);if(title)$("ptitle").textContent=title;if(detail)$("pdetail").textContent=detail}
function base(n){return n.replace(/\.(pdf|docx|doc)$/i,"")}
function hex(a){return [...a].map(x=>x.toString(16).padStart(2,"0")).join("")}
async function sha(b){return new Uint8Array(await crypto.subtle.digest("SHA-256",b instanceof Uint8Array?b:new Uint8Array(b)))}
function b64u(a){let s="";a.forEach(x=>s+=String.fromCharCode(x));return btoa(s).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"")}
function unb64(s){s=s.replace(/-/g,"+").replace(/_/g,"/");s=s.padEnd(Math.ceil(s.length/4)*4,"=");return Uint8Array.from(atob(s),c=>c.charCodeAt(0))}
function db(){return new Promise((ok,no)=>{const r=indexedDB.open("personal-sign",2);r.onupgradeneeded=()=>{const d=r.result;if(!d.objectStoreNames.contains("keys"))d.createObjectStore("keys");if(!d.objectStoreNames.contains("vault"))d.createObjectStore("vault",{keyPath:"id"})};r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error)})}
async function key(){const d=await db();const old=await new Promise((ok,no)=>{const r=d.transaction("keys","readonly").objectStore("keys").get("k");r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error)});if(old)return old;const p=await crypto.subtle.generateKey({name:"ECDSA",namedCurve:"P-256"},false,["sign","verify"]);const jwk=await crypto.subtle.exportKey("jwk",p.publicKey);const rec={privateKey:p.privateKey,publicKeyJwk:jwk};await new Promise((ok,no)=>{const r=d.transaction("keys","readwrite").objectStore("keys").put(rec,"k");r.onsuccess=ok;r.onerror=()=>no(r.error)});return rec}
async function mkpsig(bytes,sourceFormat){const h=hex(await sha(bytes)),k=await key(),m=new TextEncoder().encode("PERSONAL-SIGN-1\n"+h),sg=new Uint8Array(await crypto.subtle.sign({name:"ECDSA",hash:"SHA-256"},k.privateKey,m));return{format:"PERSONAL-SIGN-1",documentSha256:h,signedAt:new Date().toISOString(),algorithm:"ECDSA-P256-SHA256",publicKeyJwk:k.publicKeyJwk,signatureBase64Url:b64u(sg),sourceFormat,appVersion:"1.7.0"}}
let vaultSessionKey=null,vaultLockTimer=null;
async function keyGet(name){const d=await db();return await new Promise((ok,no)=>{const r=d.transaction("keys","readonly").objectStore("keys").get(name);r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error)})}
async function keyPut(name,value){const d=await db();return await new Promise((ok,no)=>{const r=d.transaction("keys","readwrite").objectStore("keys").put(value,name);r.onsuccess=()=>ok();r.onerror=()=>no(r.error)})}
async function keyDelete(name){const d=await db();return await new Promise((ok,no)=>{const r=d.transaction("keys","readwrite").objectStore("keys").delete(name);r.onsuccess=()=>ok();r.onerror=()=>no(r.error)})}
async function deriveVaultKey(secret,salt,iterations){const material=await crypto.subtle.importKey("raw",new TextEncoder().encode(secret),"PBKDF2",false,["deriveKey"]);return await crypto.subtle.deriveKey({name:"PBKDF2",salt:new Uint8Array(salt),iterations,hash:"SHA-256"},material,{name:"AES-GCM",length:256},false,["encrypt","decrypt"])}
function lockVault(){vaultSessionKey=null;if(vaultLockTimer){clearTimeout(vaultLockTimer);vaultLockTimer=null}}
function armVaultLock(){if(vaultLockTimer)clearTimeout(vaultLockTimer);if(vaultSessionKey)vaultLockTimer=setTimeout(lockVault,120000)}
function touchVault(){if(vaultSessionKey)armVaultLock()}
async function setupVaultProtection(){let p1=prompt("Создайте PIN/пароль для локального Vault. Минимум 8 символов. Он НЕ отправляется и НЕ сохраняется.");if(p1===null)return false;if(p1.length<8){alert("Нужно минимум 8 символов.");return false}let p2=prompt("Повторите PIN/пароль Vault.");if(p2===null)return false;if(p1!==p2){alert("PIN/пароли не совпадают.");return false}const salt=Array.from(crypto.getRandomValues(new Uint8Array(16))),iterations=350000,k=await deriveVaultKey(p1,salt,iterations),checkIv=crypto.getRandomValues(new Uint8Array(12)),checkCipher=await crypto.subtle.encrypt({name:"AES-GCM",iv:checkIv},k,new TextEncoder().encode("PERSONAL-SIGN-VAULT-1"));const cfg={version:1,salt,iterations,checkIv:Array.from(checkIv),checkCipher:Array.from(new Uint8Array(checkCipher))};const legacy=await keyGet("vault-aes"),recs=await vaultRecords(),migrated=[];if(legacy&&recs.length){try{for(const rec of recs){const plain=await crypto.subtle.decrypt({name:"AES-GCM",iv:new Uint8Array(rec.iv)},legacy,rec.cipher),iv=crypto.getRandomValues(new Uint8Array(12)),cipher=await crypto.subtle.encrypt({name:"AES-GCM",iv},k,plain);migrated.push({...rec,iv:Array.from(iv),cipher})}}catch(e){alert("Не удалось перенести существующий Vault. Защита PIN не включена.");return false}}const d=await db();await new Promise((ok,no)=>{const tx=d.transaction(["keys","vault"],"readwrite");tx.objectStore("keys").put(cfg,"vault-pin-config");tx.objectStore("keys").delete("vault-aes");for(const rec of migrated)tx.objectStore("vault").put(rec);tx.oncomplete=ok;tx.onerror=()=>no(tx.error)});vaultSessionKey=k;armVaultLock();p1=p2="";return true}
async function unlockVault(){if(vaultSessionKey){touchVault();return true}const cfg=await keyGet("vault-pin-config");if(!cfg)return await setupVaultProtection();for(let attempt=1;attempt<=3;attempt++){let secret=prompt("Введите PIN/пароль локального Vault.");if(secret===null)return false;try{const k=await deriveVaultKey(secret,cfg.salt,cfg.iterations),plain=await crypto.subtle.decrypt({name:"AES-GCM",iv:new Uint8Array(cfg.checkIv)},k,new Uint8Array(cfg.checkCipher));secret="";if(new TextDecoder().decode(plain)==="PERSONAL-SIGN-VAULT-1"){vaultSessionKey=k;armVaultLock();return true}}catch(e){}if(attempt<3)await new Promise(r=>setTimeout(r,attempt*700));alert(attempt<3?"Неверный PIN/пароль.":"Vault остаётся заблокированным.")}return false}
function bytesB64(a){let s="",step=32768;for(let i=0;i<a.length;i+=step)s+=String.fromCharCode(...a.subarray(i,Math.min(a.length,i+step)));return btoa(s)}
function b64Bytes(s){const b=atob(s),a=new Uint8Array(b.length);for(let i=0;i<b.length;i++)a[i]=b.charCodeAt(i);return a}
async function vaultSaveCurrent(){if(!S.final||!S.psig)return;if(!await unlockVault())throw Error("Vault заблокирован");const k=vaultSessionKey,iv=crypto.getRandomValues(new Uint8Array(12)),id=(crypto.randomUUID?crypto.randomUUID():Date.now()+"-"+Math.random().toString(16).slice(2)),payload=new TextEncoder().encode(JSON.stringify({name:S.base+".pdf",pdf:bytesB64(S.final),psig:S.psig})),cipher=await crypto.subtle.encrypt({name:"AES-GCM",iv},k,payload),rec={id,createdAt:Date.now(),iv:Array.from(iv),cipher};const d=await db();await new Promise((ok,no)=>{const r=d.transaction("vault","readwrite").objectStore("vault").put(rec);r.onsuccess=ok;r.onerror=()=>no(r.error)});touchVault();return id}
async function vaultRecords(){const d=await db();return await new Promise((ok,no)=>{const r=d.transaction("vault","readonly").objectStore("vault").getAll();r.onsuccess=()=>ok((r.result||[]).sort((a,b)=>b.createdAt-a.createdAt));r.onerror=()=>no(r.error)})}
async function vaultDecode(rec){if(!vaultSessionKey)throw Error("Vault locked");const plain=await crypto.subtle.decrypt({name:"AES-GCM",iv:new Uint8Array(rec.iv)},vaultSessionKey,rec.cipher);touchVault();return JSON.parse(new TextDecoder().decode(plain))}
async function vaultDelete(id){if(!await unlockVault())return;const d=await db();await new Promise((ok,no)=>{const r=d.transaction("vault","readwrite").objectStore("vault").delete(id);r.onsuccess=ok;r.onerror=()=>no(r.error)});touchVault()}
async function vaultCount(){return (await vaultRecords()).length}
async function renderVault(){const list=$("vaultList"),empty=$("vaultEmpty");list.innerHTML="";if(!await unlockVault()){screen("home");return}const recs=await vaultRecords();empty.hidden=recs.length>0;for(const rec of recs){const box=document.createElement("div");box.className="vault-item";let payload=null;try{payload=await vaultDecode(rec)}catch(e){}const name=document.createElement("div");name.className="vault-name";name.textContent=payload?.name||"Зашифрованный документ";const meta=document.createElement("div");meta.className="vault-meta";meta.textContent=new Date(rec.createdAt).toLocaleString("ru-RU");const acts=document.createElement("div");acts.className="vault-actions";const pdf=document.createElement("button");pdf.className="btn";pdf.textContent="PDF";pdf.disabled=!payload;pdf.onclick=()=>{touchVault();payload&&dl(b64Bytes(payload.pdf),payload.name,"application/pdf")};const ps=document.createElement("button");ps.className="btn";ps.textContent=".PSIG";ps.disabled=!payload;ps.onclick=()=>{touchVault();payload&&dl(JSON.stringify(payload.psig,null,2),payload.name.replace(/\.pdf$/i,"")+".psig","application/json")};const del=document.createElement("button");del.className="btn danger";del.textContent="×";del.onclick=async()=>{if(confirm("Удалить документ из локального Vault?")){await vaultDelete(rec.id);await renderVault()}};acts.append(pdf,ps,del);box.append(name,meta,acts);list.append(box)}}
async function updatePrivacy(){try{$("privacyVaultCount").textContent=String(await vaultCount());$("vaultProtection").textContent=(await keyGet("vault-pin-config"))?"PIN/пароль + AES-256-GCM":"Настроится при первом сохранении"}catch(e){$("privacyVaultCount").textContent="—";$("vaultProtection").textContent="—"}$("offlineStatus").textContent="Встроены локально"}
async function clearAllLocal(){if(!confirm("Удалить Vault, криптографические ключи и настройки Personal Sign с этого устройства?"))return;lockVault();const d=await db();await new Promise((ok,no)=>{const tx=d.transaction(["keys","vault"],"readwrite");tx.objectStore("keys").clear();tx.objectStore("vault").clear();tx.oncomplete=ok;tx.onerror=()=>no(tx.error)});try{localStorage.removeItem("personal-sign-pen-width");localStorage.removeItem("personal-sign-ballpoint");localStorage.removeItem("personal-sign-legal-v1")}catch(e){}if("caches"in window){for(const n of await caches.keys())if(n.startsWith("personal-sign"))await caches.delete(n)}alert("Локальные данные Personal Sign очищены.");location.reload()}
async function wipeSession(){try{if(S.pdf)await S.pdf.destroy()}catch(e){}S.file=null;S.format=null;S.bytes=null;S.pdf=null;S.page=1;S.count=1;S.place=null;S.tap=null;S.final=null;S.psig=null;S.base=null;strokes=[];cur=null;$("sig").hidden=true;$("pdfc").width=1;$("pdfc").height=1}
function dl(data,name,type){const blob=data instanceof Blob?data:new Blob([data],{type}),u=URL.createObjectURL(blob),a=document.createElement("a");a.href=u;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),1200)}
async function htmlCanvasToPdf(node,title){
 if(document.fonts&&document.fonts.ready)try{await document.fonts.ready}catch(e){}
 await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
 const c=await html2canvas(node,{scale:Math.min(devicePixelRatio||1,2),backgroundColor:"#fff",logging:false,useCORS:true});
 const cssW=794,cssH=1123,ratio=c.width/cssW,slice=Math.round(cssH*ratio),n=Math.max(1,Math.ceil(c.height/slice)),out=await PDFLib.PDFDocument.create();
 for(let i=0;i<n;i++){ $("pdetail").textContent=title+" — страница "+(i+1)+" из "+n; const cc=document.createElement("canvas");cc.width=c.width;cc.height=slice;const x=cc.getContext("2d");x.fillStyle="#fff";x.fillRect(0,0,cc.width,cc.height);x.drawImage(c,0,i*slice,c.width,Math.min(slice,c.height-i*slice),0,0,c.width,Math.min(slice,c.height-i*slice));const png=await out.embedPng(cc.toDataURL("image/png"));const p=out.addPage([595.28,841.89]);p.drawImage(png,{x:0,y:0,width:595.28,height:841.89});}
 return new Uint8Array(await out.save());
}
async function docxToPdf(f){
 if(!window.docx)throw Error("Модуль DOCX не загрузился.");
 const sb=$("sandbox");sb.innerHTML="";prog(true,"Преобразую DOCX","Файл остаётся на устройстве");
 try{await docx.renderAsync(await f.arrayBuffer(),sb,sb,{className:"docx",inWrapper:true,breakPages:true,useBase64URL:true});
 const secs=[...sb.querySelectorAll("section.docx")];if(!secs.length)throw Error("Не удалось отрисовать DOCX.");
 const out=await PDFLib.PDFDocument.create();
 for(let i=0;i<secs.length;i++){ $("pdetail").textContent="DOCX — страница "+(i+1)+" из "+secs.length;const c=await html2canvas(secs[i],{scale:Math.min(devicePixelRatio||1,2),backgroundColor:"#fff",logging:false,useCORS:true});const png=await out.embedPng(c.toDataURL("image/png"));const w=secs[i].scrollWidth*72/96,h=secs[i].scrollHeight*72/96,p=out.addPage([w,h]);p.drawImage(png,{x:0,y:0,width:w,height:h})}return new Uint8Array(await out.save())}finally{sb.innerHTML="";prog(false)}
}
function esc(s){return String(s).replace(/[&<>]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;"}[c]))}
async function docToPdf(f){
 if(!window.docToText)throw Error("Модуль DOC не загрузился.");
 prog(true,"Преобразую DOC","Файл остаётся на устройстве");
 const sb=$("sandbox");sb.innerHTML="";
 try{const ab=await f.arrayBuffer(),rich=docToText.html(ab),plain=docToText(ab);if(!rich&&!plain)throw Error("Этот DOC не удалось прочитать. Возможно, файл защищён или повреждён.");
 const d=document.createElement("div");d.className="legacy";d.innerHTML=(rich&&rich.body?rich.body:esc(plain||"")).replace(/\t/g,"    ");sb.appendChild(d);return await htmlCanvasToPdf(d,"DOC")}finally{sb.innerHTML="";prog(false)}
}
async function openPdf(bytes,file,format){
 const p=await pdfjsLib.getDocument({data:bytes.slice()}).promise;if(S.pdf)try{await S.pdf.destroy()}catch(e){}
 S.file=file;S.format=format;S.bytes=bytes;S.pdf=p;S.page=1;S.count=p.numPages;S.place=null;$("fname").textContent=file.name+(format==="pdf"?"":" → PDF");screen("sign");
 msg(format==="pdf"?"Коснитесь места, где должна стоять подпись.":format.toUpperCase()+" преобразован локально в PDF. Проверьте страницы и коснитесь места подписи.");await render()
}
async function choose(f){
 if(!f)return;try{
 if(/\.pdf$/i.test(f.name)||f.type==="application/pdf")return openPdf(new Uint8Array(await f.arrayBuffer()),f,"pdf");
 if(/\.docx$/i.test(f.name)||f.type.indexOf("wordprocessingml")>=0)return openPdf(await docxToPdf(f),f,"docx");
 if(/\.doc$/i.test(f.name)||f.type==="application/msword")return openPdf(await docToPdf(f),f,"doc");
 throw Error("Нужен PDF, DOCX или DOC.");
 }catch(e){prog(false);alert(e.message||"Не удалось открыть документ.")}
}
async function render(){
 const p=await S.pdf.getPage(S.page),basev=p.getViewport({scale:1}),viewer=document.querySelector(".viewer"),w=Math.max(280,Math.min(720,viewer.clientWidth-16)),v=p.getViewport({scale:w/basev.width}),d=Math.min(devicePixelRatio||1,2),c=$("pdfc");c.width=Math.round(v.width*d);c.height=Math.round(v.height*d);c.style.width=v.width+"px";c.style.height=v.height+"px";$("stage").style.width=v.width+"px";$("stage").style.height=v.height+"px";await p.render({canvasContext:c.getContext("2d"),viewport:v,transform:[d,0,0,d,0,0]}).promise;$("pages").textContent="Страница "+S.page+" из "+S.count;$("counter").textContent=S.page+" / "+S.count;$("prev").disabled=S.page<=1;$("next").disabled=S.page>=S.count;draw()
}
function draw(){const e=$("sig"),p=S.place;if(!p||p.page!==S.page){e.hidden=true;return}e.hidden=false;e.style.left=(p.x*100)+"%";e.style.top=(p.y*100)+"%";e.style.width=(p.w*100)+"%";e.style.height=(p.h*100)+"%";$("sigimg").src=p.url;$("finish").disabled=false;$("redraw").disabled=false}
const pad=$("pad"),penWidth=$("penWidth"),ballpoint=$("ballpoint");let strokes=[],cur=null,down=false;
try{const w=localStorage.getItem("personal-sign-pen-width"),b=localStorage.getItem("personal-sign-ballpoint");if(w)penWidth.value=w;if(b!==null)ballpoint.checked=b==="1"}catch(e){}
function syncPen(){ $("penWidthVal").textContent=Number(penWidth.value).toFixed(1);try{localStorage.setItem("personal-sign-pen-width",penWidth.value);localStorage.setItem("personal-sign-ballpoint",ballpoint.checked?"1":"0")}catch(e){} predraw() }
penWidth.oninput=syncPen;ballpoint.onchange=syncPen;syncPen();
function psize(){const r=pad.getBoundingClientRect(),d=Math.min(devicePixelRatio||1,3);pad.width=Math.max(1,Math.round(r.width*d));pad.height=Math.max(1,Math.round(r.height*d));predraw()}
function pt(e){const r=pad.getBoundingClientRect();return{x:(e.clientX-r.left)/r.width,y:(e.clientY-r.top)/r.height,t:performance.now(),p:(e.pressure&&e.pressure>0)?e.pressure:.5}}
function clamp(a,b,v){return Math.max(a,Math.min(b,v))}
function predraw(){const r=pad.getBoundingClientRect();if(!r.width)return;const d=pad.width/r.width,x=pad.getContext("2d"),bw=Number(penWidth.value)||2.6,ball=ballpoint.checked;x.setTransform(d,0,0,d,0,0);x.clearRect(0,0,r.width,r.height);x.strokeStyle="#1f4e9e";x.lineCap="round";x.lineJoin="round";for(const st of (cur?[...strokes,cur]:strokes)){if(!st.length)continue;if(st.length===1){x.globalAlpha=.92;x.beginPath();x.arc(st[0].x*r.width,st[0].y*r.height,bw/2,0,Math.PI*2);x.fillStyle="#1f4e9e";x.fill();continue}for(let i=1;i<st.length;i++){const a=st[i-1],b=st[i],dx=(b.x-a.x)*r.width,dy=(b.y-a.y)*r.height,dist=Math.hypot(dx,dy),dt=Math.max(1,b.t-a.t),speed=dist/dt;let mult=1,alpha=.96;if(ball){const pressure=clamp(.72,1.15,.82+(b.p||.5)*.42);const speedFactor=clamp(.72,1.08,1.06-speed*.34);mult=pressure*speedFactor;alpha=clamp(.72,.96,.94-speed*.12)}x.globalAlpha=alpha;x.lineWidth=bw*mult;x.beginPath();x.moveTo(a.x*r.width,a.y*r.height);x.lineTo(b.x*r.width,b.y*r.height);x.stroke()}}x.globalAlpha=1;$("okPad").disabled=!(strokes.length||cur)}
function openPad(){strokes=[];cur=null;$("modal").classList.add("on");requestAnimationFrame(psize)}
function closePad(){$("modal").classList.remove("on")}
pad.onpointerdown=e=>{e.preventDefault();down=true;cur=[pt(e)];pad.setPointerCapture?.(e.pointerId);predraw()};
pad.onpointermove=e=>{if(!down)return;e.preventDefault();cur.push(pt(e));predraw()};
pad.onpointerup=e=>{if(!down)return;down=false;if(cur&&cur.length)strokes.push(cur);cur=null;predraw()};
function crop(){let minx=1,miny=1,maxx=0,maxy=0;strokes.flat().forEach(p=>{minx=Math.min(minx,p.x);miny=Math.min(miny,p.y);maxx=Math.max(maxx,p.x);maxy=Math.max(maxy,p.y)});const r=pad.getBoundingClientRect(),d=pad.width/r.width,padn=10*d,sx=Math.max(0,minx*pad.width-padn),sy=Math.max(0,miny*pad.height-padn),ex=Math.min(pad.width,maxx*pad.width+padn),ey=Math.min(pad.height,maxy*pad.height+padn),o=document.createElement("canvas");o.width=Math.max(1,ex-sx);o.height=Math.max(1,ey-sy);o.getContext("2d").drawImage(pad,sx,sy,o.width,o.height,0,0,o.width,o.height);return{url:o.toDataURL("image/png"),aspect:o.width/o.height}}
$("stage").addEventListener("pointerup",e=>{if(S.place||e.target.closest(".sig"))return;const r=$("stage").getBoundingClientRect();S.tap={x:(e.clientX-r.left)/r.width,y:(e.clientY-r.top)/r.height};openPad()});
$("clearPad").onclick=()=>{strokes=[];cur=null;predraw()};$("cancelPad").onclick=()=>{closePad();S.tap=null};
$("okPad").onclick=()=>{const z=crop(),r=$("stage").getBoundingClientRect(),w=.32,h=Math.min(.20,(w*r.width)/(z.aspect*r.height)),t=S.tap||{x:.65,y:.72};S.place={page:S.page,x:Math.max(0,Math.min(1-w,t.x-w/2)),y:Math.max(0,Math.min(1-h,t.y-h/2)),w,h,url:z.url,aspect:z.aspect};closePad();draw()};
let move=null;$("sig").onpointerdown=e=>{if(e.target===$("handle"))return;const r=$("stage").getBoundingClientRect();move={type:"m",sx:e.clientX,sy:e.clientY,x:S.place.x,y:S.place.y,r};e.currentTarget.setPointerCapture?.(e.pointerId)};
$("handle").onpointerdown=e=>{e.stopPropagation();const r=$("stage").getBoundingClientRect();move={type:"r",sx:e.clientX,w:S.place.w,r};e.currentTarget.setPointerCapture?.(e.pointerId)};
window.onpointermove=e=>{if(!move||!S.place)return;if(move.type==="m"){S.place.x=Math.max(0,Math.min(1-S.place.w,move.x+(e.clientX-move.sx)/move.r.width));S.place.y=Math.max(0,Math.min(1-S.place.h,move.y+(e.clientY-move.sy)/move.r.height))}else{const w=Math.max(.10,Math.min(.75,move.w+(e.clientX-move.sx)/move.r.width));S.place.w=w;S.place.h=Math.min(.30,(w*move.r.width)/(S.place.aspect*move.r.height))}draw()};window.onpointerup=()=>move=null;
async function finalize(){
 if(!S.place)return;prog(true,"Фиксирую PDF","Подпись встраивается в документ");
 try{const outputBase=base(S.file.name)+"_signed",sourceFormat=S.format,d=await PDFLib.PDFDocument.load(S.bytes.slice()),p=d.getPages()[S.place.page-1],img=await d.embedPng(S.place.url),sz=p.getSize();p.drawImage(img,{x:S.place.x*sz.width,y:sz.height-(S.place.y+S.place.h)*sz.height,width:S.place.w*sz.width,height:S.place.h*sz.height});S.final=new Uint8Array(await d.save());S.psig=await mkpsig(S.final,sourceFormat);S.base=outputBase;$("hash").textContent=S.psig.documentSha256;try{if(S.pdf)await S.pdf.destroy()}catch(e){}S.pdf=null;S.bytes=null;S.file=null;S.format=null;S.place=null;S.tap=null;strokes=[];cur=null;$("sig").hidden=true;$("sigimg").removeAttribute("src");$("pdfc").width=1;$("pdfc").height=1;pad.width=1;pad.height=1;screen("done")}catch(e){alert(e.message||"Не удалось сформировать PDF")}finally{prog(false)}
}
async function verify(){
 try{const f=$("vpdf").files[0],s=$("vpsig").files[0];if(!f||!s)return;const bytes=new Uint8Array(await f.arrayBuffer()),o=JSON.parse(await s.text()),h=hex(await sha(bytes)),pub=await crypto.subtle.importKey("jwk",o.publicKeyJwk,{name:"ECDSA",namedCurve:"P-256"},true,["verify"]),m=new TextEncoder().encode("PERSONAL-SIGN-1\n"+o.documentSha256),ok=await crypto.subtle.verify({name:"ECDSA",hash:"SHA-256"},pub,unb64(o.signatureBase64Url),m),r=$("vresult");r.hidden=false;if(!ok){r.className="notice err";r.textContent="INVALID SIGNATURE — файл .PSIG изменён или повреждён."}else if(h!==o.documentSha256){r.className="notice err";r.textContent="DOCUMENT MODIFIED — PDF отличается от подписанной версии."}else{r.className="notice ok";r.textContent="VERIFIED — PDF совпадает с зафиксированной версией."}}catch(e){alert("Не удалось проверить: "+e.message)}
}
function legalAccepted(){try{return localStorage.getItem("personal-sign-legal-v1")==="accepted"}catch(e){return false}}
function openPolicy(from){$("policyBack").dataset.from=from||"home";screen("policy")}
function openTerms(from){$("termsBack").dataset.from=from||"home";screen("terms")}
$("acceptLegal").onchange=e=>{$("acceptLegalBtn").disabled=!e.target.checked};
$("acceptLegalBtn").onclick=()=>{if(!$("acceptLegal").checked)return;try{localStorage.setItem("personal-sign-legal-v1","accepted")}catch(e){}screen("home")};
$("gatePolicy").onclick=()=>openPolicy("legalGate");$("gateTerms").onclick=()=>openTerms("legalGate");
$("privacyPolicyBtn").onclick=()=>openPolicy("privacy");$("privacyTermsBtn").onclick=()=>openTerms("privacy");
$("policyBack").onclick=()=>screen($("policyBack").dataset.from||"home");$("termsBack").onclick=()=>screen($("termsBack").dataset.from||"home");
$("start").onclick=()=>{if(!legalAccepted()){screen("legalGate");return}$("picker").click()};$("picker").onchange=e=>{choose(e.target.files[0]);e.target.value=""};
$("homeBtn").onclick=async()=>{await wipeSession();screen("home")};$("doneHome").onclick=async()=>{await wipeSession();screen("home")};$("verifyBack").onclick=$("vaultBack").onclick=$("privacyBack").onclick=()=>screen("home");
$("prev").onclick=async()=>{if(S.page>1){S.page--;await render()}};$("next").onclick=async()=>{if(S.page<S.count){S.page++;await render()}};
$("redraw").onclick=openPad;$("finish").onclick=finalize;$("getPdf").onclick=()=>dl(S.final,S.base+".pdf","application/pdf");$("getPsig").onclick=()=>dl(JSON.stringify(S.psig,null,2),S.base+".psig","application/json");
$("saveVault").onclick=async()=>{try{$("saveVault").disabled=true;$("vaultSaveStatus").textContent="Шифрую и сохраняю на этом устройстве…";await vaultSaveCurrent();$("vaultSaveStatus").textContent="Сохранено в локальный зашифрованный Vault.";$("saveVault").textContent="Сохранено в Vault"}catch(e){$("saveVault").disabled=false;$("vaultSaveStatus").textContent="Не удалось сохранить: "+(e.message||e)}};
$("vaultOpen").onclick=async()=>{screen("vault");await renderVault()};$("privacyOpen").onclick=async()=>{screen("privacy");await updatePrivacy()};$("clearLocal").onclick=clearAllLocal;
$("verifyOpen").onclick=()=>screen("verify");$("vpdf").onchange=$("vpsig").onchange=()=>{$("verifyBtn").disabled=!($("vpdf").files[0]&&$("vpsig").files[0])};$("verifyBtn").onclick=verify;
window.addEventListener("resize",()=>{if($("modal").classList.contains("on"))psize();if(S.pdf&&$("sign").classList.contains("on"))render().catch(()=>{})});
["pointerdown","keydown","touchstart"].forEach(ev=>document.addEventListener(ev,touchVault,{passive:true}));
document.addEventListener("visibilitychange",()=>{const curtain=$("privacyCurtain");if(document.hidden){lockVault();curtain.style.display="flex"}else{curtain.style.display="none"}});
window.addEventListener("pagehide",()=>{lockVault();$("privacyCurtain").style.display="flex"});
window.addEventListener("pageshow",()=>{$("privacyCurtain").style.display="none"});
if("serviceWorker"in navigator)window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js").catch(()=>{}));
if(!legalAccepted())screen("legalGate");
})();
