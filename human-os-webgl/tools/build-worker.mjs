import {readFileSync,writeFileSync,mkdirSync,copyFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
const base=new URL('../',import.meta.url);
export function buildWorker(){
 const html=readFileSync(new URL('index.html',base),'utf8'),assets={};
 for(const id of ['health','relationships','projects','work','personal','memory'])assets[id]=readFileSync(new URL('assets/'+id+'-signature.gltf',base),'utf8');
 return 'const HTML='+JSON.stringify(html)+';\nconst ASSETS='+JSON.stringify(assets)+';\nconst HEADERS='+JSON.stringify({"X-Content-Type-Options":"nosniff","Referrer-Policy":"no-referrer","X-Frame-Options":"DENY","Cache-Control":"no-store","Content-Security-Policy":"default-src 'none'; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline'; connect-src 'self' data: https://cdn.jsdelivr.net; img-src 'self' data: blob:; frame-ancestors 'none'"})+';\n'+"export default {async fetch(request){const p=new URL(request.url).pathname;if(!['GET','HEAD'].includes(request.method))return new Response('Method not allowed',{status:405,headers:{...HEADERS,Allow:'GET, HEAD'}});let response;if(p==='/health')response=Response.json({ok:true,service:'human-os-living-world',version:'v0.5-candidate',demo_only:true},{headers:HEADERS});else if(p==='/'||p==='/index.html')response=new Response(HTML,{headers:{...HEADERS,'Content-Type':'text/html; charset=utf-8'}});else {const key=p.startsWith('/assets/')&&p.endsWith('-signature.gltf')?p.slice(8,-15):'';if(key&&ASSETS[key])response=new Response(ASSETS[key],{headers:{...HEADERS,'Cache-Control':'public, max-age=0, must-revalidate','Content-Type':'model/gltf+json'}});else response=new Response('Not found',{status:404,headers:HEADERS})}return request.method==='HEAD'?new Response(null,{status:response.status,headers:response.headers}):response}};";
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 mkdirSync(new URL('dist/assets/',base),{recursive:true});
 copyFileSync(new URL('index.html',base),new URL('dist/index.html',base));
 for(const id of ['health','relationships','projects','work','personal','memory'])copyFileSync(new URL('assets/'+id+'-signature.gltf',base),new URL('dist/assets/'+id+'-signature.gltf',base));
 writeFileSync(new URL('dist-worker.mjs',base),buildWorker());
 console.log('Built deterministic Worker and six glTF assets');
}
