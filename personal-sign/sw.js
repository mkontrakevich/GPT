const CACHE="personal-sign-1.9.0";
const APP=[
"./","./index.html","./app.js","./manifest.webmanifest","./icon.svg",
"./vendor/jszip-3.10.1.min.js",
"./vendor/docx-preview-0.4.1.min.js",
"./vendor/html2canvas-1.4.1.min.js",
"./vendor/pdf-lib-1.17.1.min.js",
"./vendor/pdfjs-2.9.359.min.js",
"./vendor/pdfjs-worker-2.9.359.min.js",
"./vendor/docToText-0.1.0.js"
];
self.addEventListener("install",e=>{e.waitUntil((async()=>{const c=await caches.open(CACHE);await c.addAll(APP);self.skipWaiting()})())});
self.addEventListener("activate",e=>{e.waitUntil((async()=>{for(const k of await caches.keys())if(k.startsWith("personal-sign-")&&k!==CACHE)await caches.delete(k);await self.clients.claim()})())});
self.addEventListener("fetch",e=>{if(e.request.method!=="GET")return;e.respondWith((async()=>{const u=new URL(e.request.url);if(u.origin!==self.location.origin)throw new Error("External network blocked");const c=await caches.open(CACHE),hit=await c.match(e.request);if(hit)return hit;try{const r=await fetch(e.request);if(r&&r.ok)await c.put(e.request,r.clone());return r}catch(err){const fallback=await c.match("./index.html");if(fallback&&e.request.mode==="navigate")return fallback;throw err}})())});