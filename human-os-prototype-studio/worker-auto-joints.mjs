// HUMAN OS: on-device reference matching and MediaPipe with no user-photo uploads.
const H={
  'X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer',
  'X-Frame-Options':'DENY','Cache-Control':'no-store',
  'Permissions-Policy':'camera=(), microphone=(), geolocation=()',
  'Content-Security-Policy':"default-src 'none'; script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' https://cdn.jsdelivr.net; worker-src 'self' blob:; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self' https://cdn.jsdelivr.net https://storage.googleapis.com; font-src 'self'; frame-ancestors 'none'"
};
export default{async fetch(request,env){
 const p=new URL(request.url).pathname;
 if(p==='/health')return Response.json({ok:true,service:'human-os-prototype-auto-joints-v4',version:'0.4.0',referenceUploads:false,sourceOnly:'client-local',rigged:false,autoApply:true,visualQualityApproved:false},{headers:H});
 const response=await env.ASSETS.fetch(request);
 const headers=new Headers(response.headers);
 for(const [k,v] of Object.entries(H))headers.set(k,v);
 return new Response(response.body,{status:response.status,statusText:response.statusText,headers});
}};
