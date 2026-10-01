const DAY=86400000, WINDOW_DAYS=7;
const json=(d,s=200,h={})=>new Response(JSON.stringify(d),{status:s,headers:{"content-type":"application/json; charset=utf-8","access-control-allow-origin":"*","cache-control":"no-store",...h}});
const clean=s=>(s||"").replace(/<script[\s\S]*?<\/script>/gi," ").replace(/<style[\s\S]*?<\/style>/gi," ").replace(/<[^>]+>/g," ").replace(/&nbsp;/g," ").replace(/&amp;/g,"&").replace(/\s+/g," ").trim();
const hash=async s=>Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(s)))).map(x=>x.toString(16).padStart(2,"0")).join("");
async function read(env,key,fallback){const o=await env.CSUM_IMAGES.get(key);if(!o)return fallback;try{return await o.json()}catch{return fallback}}
async function write(env,key,v){await env.CSUM_IMAGES.put(key,JSON.stringify(v),{httpMetadata:{contentType:"application/json"}})}
function abs(href,base){try{return new URL(href,base).toString()}catch{return null}}
async function discoverOfficialSources(){
 const page=await fetch("https://www.csum.ru/contacts",{headers:{"user-agent":"CSUM Editorial Source Collector/1.0"}}).then(r=>r.text());
 const links=[...page.matchAll(/href=["\']([^"\']+)["\']/gi)].map(m=>m[1]);
 const vk=links.find(x=>/vk\.com\//i.test(x))||null;
 const telegram=links.find(x=>/(?:t\.me|telegram\.me)\//i.test(x))||null;
 return {contacts_url:"https://www.csum.ru/contacts",vk,telegram,discovered_at:new Date().toISOString()};
}
async function collectCsum(){
 const root="https://www.csum.ru/";
 const res=await fetch(root,{headers:{"user-agent":"CSUM Editorial Source Collector/1.0"}});
 if(!res.ok)throw new Error("csum.ru HTTP "+res.status);
 const html=await res.text(), out=[], re=/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi; let m;
 while((m=re.exec(html))&&out.length<80){const title=clean(m[2]);const u=abs(m[1],root);if(title.length<12||!u||!u.includes("csum.ru"))continue;out.push({source:"csum.ru",source_url:u,title,published_at:null,raw_excerpt:title,collected_at:new Date().toISOString()})}
 return out;
}
async function normalize(items){
 const seen=new Set(), out=[];
 for(const x of items){const fp=await hash([x.source,x.source_url,x.title,x.published_at||""].join("|"));if(seen.has(fp))continue;seen.add(fp);out.push({...x,fingerprint:fp})}
 return out;
}
async function extractFacts(env,items){
 if(!env.OPENROUTER_API_KEY||!items.length)return {facts:[],warning:"OPENROUTER_API_KEY_NOT_CONFIGURED"};
 const input=items.slice(0,80).map(x=>({fingerprint:x.fingerprint,source:x.source,url:x.source_url,title:x.title,published_at:x.published_at,excerpt:x.raw_excerpt}));
 const prompt="Extract only explicit facts from these official CSUM Nizhny Novgorod source records. Never infer prices, stock, dates, brands, products, promotions or events. Return strict JSON object {facts:[{source_fingerprint,type,title,entity,date,source_url,evidence,confidence}]}. type must be one of event,promotion,store,brand,product,service,news. confidence 0..1. Evidence must be a short paraphrase grounded in source. INPUT:"+JSON.stringify(input);
 const res=await fetch("https://openrouter.ai/api/v1/chat/completions",{method:"POST",headers:{"authorization":"Bearer "+env.OPENROUTER_API_KEY,"content-type":"application/json","HTTP-Referer":"https://mkontrakevich.github.io/GPT/","X-Title":"CSUM Editorial Fact Extractor"},body:JSON.stringify({model:env.TEXT_MODEL||"google/gemini-2.5-flash",messages:[{role:"user",content:prompt}],response_format:{type:"json_object"},temperature:0})});
 if(!res.ok)throw new Error("OpenRouter facts HTTP "+res.status);
 const data=await res.json(), raw=data?.choices?.[0]?.message?.content||"{\"facts\":[]}";
 let parsed;try{parsed=JSON.parse(raw)}catch{parsed={facts:[]}}
 const allowed=new Set(input.map(x=>x.fingerprint));
 const facts=(parsed.facts||[]).filter(f=>allowed.has(f.source_fingerprint)&&f.source_url&&f.evidence).map(f=>({...f,extracted_at:new Date().toISOString()}));
 return {facts};
}
async function refresh(env){
 if(!env.CSUM_IMAGES)throw new Error("CSUM_IMAGES binding required");
 const previous=await read(env,"_editorial/source-cache.json",{items:[]});
 let fresh=[], errors=[];
 try{fresh.push(...await collectCsum())}catch(e){errors.push({source:"csum.ru",error:e.message})}
 // VK/TG adapters are deliberately gated until official channel URLs are configured.
 const official=await discoverOfficialSources().catch(()=>({contacts_url:"https://www.csum.ru/contacts",vk:null,telegram:null}));
 const configured={vk:!!official.vk,telegram:!!official.telegram};
 const merged=await normalize([...fresh,...previous.items]);
 const cutoff=Date.now()-WINDOW_DAYS*DAY;
 const active=merged.filter(x=>!x.published_at||Date.parse(x.published_at)>=cutoff).slice(0,250);
 const archive=merged.filter(x=>x.published_at&&Date.parse(x.published_at)<cutoff).slice(0,1000);
 const cache={window_days:WINDOW_DAYS,refreshed_at:new Date().toISOString(),sources:{csum:true,...configured},official_sources:official,errors,items:active};
 const extracted=await extractFacts(env,active).catch(e=>({facts:[],warning:e.message}));
 const factStore={window_days:WINDOW_DAYS,updated_at:cache.refreshed_at,warning:extracted.warning||null,facts:extracted.facts};
 await write(env,"_editorial/source-cache.json",cache);await write(env,"_editorial/source-archive.json",{updated_at:cache.refreshed_at,items:archive});await write(env,"_editorial/facts.json",factStore);
 return {...cache,fact_count:factStore.facts.length,fact_warning:factStore.warning};
}
export default{async fetch(req,env){const u=new URL(req.url);if(req.method==="OPTIONS")return new Response(null,{status:204,headers:{"access-control-allow-origin":"*","access-control-allow-methods":"GET,POST,OPTIONS","access-control-allow-headers":"x-csum-admin-token"}});
 try{
  if(u.pathname==="/health")return json({ok:true,service:"csum-source-collector",r2:!!env.CSUM_IMAGES,window_days:WINDOW_DAYS});
  if(u.pathname==="/api/sources"&&req.method==="GET"){let c=await read(env,"_editorial/source-cache.json",null);if(!c||Date.now()-Date.parse(c.refreshed_at)>15*60*1000)c=await refresh(env);return json(c)}
  if(u.pathname==="/api/facts"&&req.method==="GET")return json(await read(env,"_editorial/facts.json",{window_days:WINDOW_DAYS,facts:[]}));
  if(u.pathname==="/api/sources/refresh"&&req.method==="POST"){if(!env.ADMIN_TOKEN||req.headers.get("x-csum-admin-token")!==env.ADMIN_TOKEN)return json({error:"UNAUTHORIZED"},401);return json(await refresh(env))}
  return json({error:"NOT_FOUND"},404);
 }catch(e){return json({error:e.message||String(e)},500)}}};