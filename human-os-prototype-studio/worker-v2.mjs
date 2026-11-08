// Versioned stage only — no user reference is stored or transmitted by this Worker.
const H={
 'X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer',
 'X-Frame-Options':'DENY','Cache-Control':'no-store',
 'Permissions-Policy':'camera=(), microphone=(), geolocation=()',
 'Content-Security-Policy':"default-src 'none'; script-src 'self' 'wasm-unsafe-eval' https://cdn.jsdelivr.net; worker-src 'self' blob:; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self' https://cdn.jsdelivr.net https://storage.googleapis.com; font-src 'self'; frame-ancestors 'none'"
};
export default{async fetch(request,env){
 const p=new URL(request.url).pathname;
 if(p==='/health')return Response.json({ok:true,service:'human-os-prototype-studio-v2',version:'0.2.0',demoOnly:true,poseDetection:'opt-in on-device',referenceUploads:false,rigged:false},{headers:H});
 const response=await env.ASSETS.fetch(request);
 const headers=new Headers(response.headers);for(const [k,v] of Object.entries(H))headers.set(k,v);
 return new Response(response.body,{status:response.status,statusText:response.statusText,headers});
}};
