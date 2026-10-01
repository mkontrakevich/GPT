const CACHE="personal-sign-1.5.0";
const APP=["./","./index.html","./manifest.webmanifest","./icon.svg"];
const REMOTE=[
"https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js",
"https://unpkg.com/docx-preview@0.3.7/dist/docx-preview.min.js",
"https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js",
"https://cdnjs.cloudflare.com/ajax/libs/pdf-lib/1.17.1/pdf-lib.min.js",
"https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js",
"https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js",
"https://cdn.jsdelivr.net/gh/Alpaq92/JSDoc@main/src/docToText.js"
];
self.addEventListener("install",e=>{e.waitUntil((async()=>{const c=await caches.open(CACHE);await c.addAll(APP).catch(()=>{});for(const u of REMOTE){try{const r=await fetch(u,{mode:"cors",cache:"reload"});if(r)await c.put(u,r.clone())}catch(_){}}self.skipWaiting()})())});
self.addEventListener("activate",e=>{e.waitUntil((async()=>{for(const k of await caches.keys())if(k.startsWith("personal-sign-")&&k!==CACHE)await caches.delete(k);await self.clients.claim()})())});
self.addEventListener("fetch",e=>{if(e.request.method!=="GET")return;e.respondWith((async()=>{const c=await caches.open(CACHE),hit=await c.match(e.request);if(hit)return hit;try{const r=await fetch(e.request);if(r&&(r.ok||r.type==="opaque"))await c.put(e.request,r.clone());return r}catch(err){const fallback=await c.match("./index.html");if(fallback&&e.request.mode==="navigate")return fallback;throw err}})())});