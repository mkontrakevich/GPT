const SECURITY = {
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
  "X-Frame-Options": "DENY",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  "Cache-Control": "no-store",
  "Content-Security-Policy": "default-src 'none'; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline'; connect-src 'self' https://cdn.jsdelivr.net; img-src 'self' data:; font-src 'self' data:; frame-ancestors 'none'; base-uri 'none'; form-action 'none'"
};
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/health") return Response.json({
      ok: true, service: "health-game-console", version: "preview-assets-v0.2",
      demo_only: true, personal_data_backend: false
    }, {headers: {"Cache-Control":"no-store"}});
    const original = await env.ASSETS.fetch(request);
    const h = new Headers(original.headers);
    for (const [k,v] of Object.entries(SECURITY)) h.set(k,v);
    return new Response(original.body,{status:original.status,statusText:original.statusText,headers:h});
  }
};