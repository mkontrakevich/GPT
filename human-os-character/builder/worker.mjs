const POLICY = "default-src 'none'; script-src 'self' https://cdn.jsdelivr.net 'wasm-unsafe-eval' 'sha256-7v//oCxXAqFstrYiMQqrjtK9IVdiwRhit5ZQLpcgC3I='; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data:; connect-src 'self' https://cdn.jsdelivr.net https://storage.googleapis.com; worker-src 'self' blob:; font-src 'self'; frame-ancestors 'none'; object-src 'none'; base-uri 'none'; form-action 'none'";
const HEADERS = {
  'Content-Security-Policy': POLICY,
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'no-referrer',
  'Cache-Control': 'no-store',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()'
};
export default {
  async fetch(request,env) {
    const pathname = new URL(request.url).pathname;
    if(pathname==='/health') return Response.json({
      ok:true,service:'human-os-reference-builder',version:'v0.1.2',
      imageDataTransferred:false,avatarRigged:false,
      mode:'reference-pose-3d-prototype'
    },{headers:HEADERS});
    if(!env.ASSETS?.fetch) return new Response('Static assets not configured',{status:503,headers:HEADERS});
    const response=await env.ASSETS.fetch(request);
    const headers=new Headers(response.headers);
    for(const [key,value] of Object.entries(HEADERS))headers.set(key,value);
    return new Response(response.body,{status:response.status,statusText:response.statusText,headers});
  }
};
