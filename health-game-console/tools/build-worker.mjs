import {readFileSync,writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
export function buildWorker(){
 const html=readFileSync(new URL('../preview.html',import.meta.url),'utf8');
 const source=readFileSync(new URL('../worker.mjs',import.meta.url),'utf8');
 const security=source.slice(0,source.indexOf('export default'));
 return 'const HTML='+JSON.stringify(html)+';\n'+security+"export default {async fetch(request){const p=new URL(request.url).pathname;if(p==='/health')return Response.json({ok:true,service:'health-game-console',version:'preview-v0.5-avatar',demo_only:true,personal_data_backend:false},{headers:SECURITY});if(p!=='/'&&p!=='/index.html')return new Response('Not found',{status:404,headers:SECURITY});return new Response(request.method==='HEAD'?null:HTML,{headers:{...SECURITY,'Content-Type':'text/html; charset=utf-8'}})}};";
}
if(process.argv[1]===fileURLToPath(import.meta.url))writeFileSync(new URL('../dist-worker.mjs',import.meta.url),buildWorker());
