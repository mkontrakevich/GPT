const DAY=86400000, WINDOW_DAYS=7, ARTICLE_SCHEMA_VERSION=2;
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
async function planContent(env,facts){
 if(!env.OPENROUTER_API_KEY||!facts.length)return {topics:[],warning:"NO_FACTS_OR_OPENROUTER"};
 const prompt="Plan a current editorial homepage for CSUM Nizhny Novgorod in RUSSIAN using ONLY supplied verified facts. Do not use outside knowledge or infer anything beyond the evidence. Return strict JSON {topics:[{id,title,deck,angle,fact_indexes,native_integrations,priority}]}. Create 3-7 useful magazine topics. Native integrations must refer only to entities explicitly present in facts; never invent products, stock, prices or promotions. Headlines must be statements, not questions. FACTS:"+JSON.stringify(facts);
 const res=await fetch("https://openrouter.ai/api/v1/chat/completions",{method:"POST",headers:{"authorization":"Bearer "+env.OPENROUTER_API_KEY,"content-type":"application/json","HTTP-Referer":"https://mkontrakevich.github.io/GPT/","X-Title":"CSUM Editorial Planner"},body:JSON.stringify({model:env.TEXT_MODEL||"google/gemini-2.5-flash",messages:[{role:"user",content:prompt}],response_format:{type:"json_object"},temperature:.2})});
 if(!res.ok)throw new Error("OpenRouter planner HTTP "+res.status);
 const d=await res.json();let p;try{p=JSON.parse(d?.choices?.[0]?.message?.content||"{}")}catch{p={topics:[]}}
 return {topics:(p.topics||[]).slice(0,7),generated_at:new Date().toISOString()};
}
async function generateArticleImage(env,id,brief){if(!env.ADMIN_TOKEN||!brief)return null;const base="https://csum-nn-image-studio.kontrakevich.workers.dev";const g=await fetch(base+"/api/generate",{method:"POST",headers:{"content-type":"application/json","x-csum-admin-token":env.ADMIN_TOKEN},body:JSON.stringify({id:"article-"+id,prompt:brief,aspect_ratio:"16:9",output_format:"webp"})});if(!g.ok){const e=await g.json().catch(()=>({}));throw new Error("IMAGE_GENERATE_"+g.status+":"+(e.error||"unknown"));}const d=await g.json();if(!d.candidate_key)throw new Error("IMAGE_GENERATE_NO_CANDIDATE");const a=await fetch(base+"/api/apply",{method:"POST",headers:{"content-type":"application/json","x-csum-admin-token":env.ADMIN_TOKEN},body:JSON.stringify({id:"article-"+id,candidate_key:d.candidate_key})});if(!a.ok)return d.url||null;const x=await a.json();return x.url||d.url||null;}
async function hydrateArticleImages(env,articles){
 for(const a of articles||[]){
  if(a?.visual?.mode!=="editorial"||a.image_url||!a.visual?.brief)continue;
  const u=await generateArticleImage(env,a.id,a.visual.brief).catch(e=>{a.visual.error=e.message||String(e);return null});
  if(u){a.image_url=u;a.visual.generated=true;a.visual.reason="editorial_illustration";}
 }
 return articles;
}
async function writeArticles(env,plan,facts){
 const articles=[];
 for(const topic of (plan.topics||[])){
  const used=(topic.fact_indexes||[]).map(i=>facts[i]).filter(Boolean); if(!used.length)continue;
  const prompt="Write a Russian CSUM city-magazine article grounded ONLY in VERIFIED_FACTS. Do NOT add historical background, descriptions, amenities, locations, brands, products, dates, availability or any other knowledge unless explicitly stated in VERIFIED_FACTS evidence. If facts are sparse, write a shorter 250-500 word useful article rather than filling gaps. Every factual claim must be directly supported by supplied evidence.  Structure: headline, deck, 3-5 sections, practical conclusion, then subtle native commerce in final 20-30%, one CTA. Commercial content <=15%. Do not invent facts, products, availability, prices, dates or discounts. Return strict JSON {title,deck,sections:[{heading,body}],native_integrations:[{entity,context,source_url}],cta:{label,url},visual_brief}. TOPIC:"+JSON.stringify(topic)+" VERIFIED_FACTS:"+JSON.stringify(used);
  const res=await fetch("https://openrouter.ai/api/v1/chat/completions",{method:"POST",headers:{"authorization":"Bearer "+env.OPENROUTER_API_KEY,"content-type":"application/json","HTTP-Referer":"https://mkontrakevich.github.io/GPT/","X-Title":"CSUM Editorial Writer"},body:JSON.stringify({model:env.TEXT_MODEL||"google/gemini-2.5-flash",messages:[{role:"user",content:prompt}],response_format:{type:"json_object"},temperature:.45})});
  if(!res.ok)continue; const d=await res.json();let a;try{a=JSON.parse(d?.choices?.[0]?.message?.content||"{}")}catch{continue}
  const allowedUrls=new Set(used.map(x=>x.source_url).filter(Boolean));
  a.native_integrations=(a.native_integrations||[]).filter(x=>x&&allowedUrls.has(x.source_url));
  if(a.cta&&!allowedUrls.has(a.cta.url))a.cta=null;
  const articleId=topic.id||crypto.randomUUID();
  const sources=[...new Map(used.filter(x=>x.source_url).map(x=>[x.source_url,{url:x.source_url,title:x.title||x.entity||"Источник",source_fingerprint:x.source_fingerprint,evidence:x.evidence||null}])).values()];
  const factualTypes=new Set(["product","promotion","store","brand","event"]);
  const factualVisual=used.some(x=>factualTypes.has(String(x.type||"").toLowerCase()));
  const visual={mode:factualVisual?"factual":"editorial",brief:a.visual_brief||"",generated:false,reason:factualVisual?"verified_real-world_subject":"editorial_illustration"};
  const image_url=factualVisual?null:await generateArticleImage(env,articleId,a.visual_brief).catch(()=>null);
  visual.generated=!!image_url;
  articles.push({...a,id:articleId,image_url,visual,schema_version:ARTICLE_SCHEMA_VERSION,generated_at:new Date().toISOString(),sources,source_urls:sources.map(x=>x.url),source_fingerprints:used.map(x=>x.source_fingerprint)});
 }
 return articles;
}
async function refresh(env){
 const previousArticles=await read(env,"_editorial/articles.json",null);
 if(!env.CSUM_IMAGES)throw new Error("CSUM_IMAGES binding required");
 const previous=await read(env,"_editorial/source-cache.json",{items:[]});
 let fresh=[], errors=[];
 try{fresh.push(...await collectCsum())}catch(e){errors.push({source:"csum.ru",error:e.message})}
 // VK/TG adapters are deliberately gated until official channel URLs are configured.
 const official=await discoverOfficialSources().catch(()=>({contacts_url:"https://www.csum.ru/contacts",vk:null,telegram:null}));
 const configured={vk:!!official.vk,telegram:!!official.telegram};
 const merged=await normalize([...fresh,...previous.items]);
 const cutoff=Date.now()-WINDOW_DAYS*DAY;
 const active=merged.filter(x=>Date.parse(x.published_at||x.collected_at||0)>=cutoff).slice(0,250);
 const archive=merged.filter(x=>Date.parse(x.published_at||x.collected_at||0)<cutoff).slice(0,1000);
 const cache={window_days:WINDOW_DAYS,refreshed_at:new Date().toISOString(),sources:{csum:true,...configured},official_sources:official,errors,items:active};
 const context_hash=await hash(active.map(x=>x.fingerprint).sort().join("|"));
 const previousFacts=await read(env,"_editorial/facts.json",null), previousPlan=await read(env,"_editorial/content-plan.json",null);
 const articlesCurrent=Array.isArray(previousArticles?.articles)&&previousArticles.articles.length>0&&previousArticles.articles.every(a=>a?.schema_version===ARTICLE_SCHEMA_VERSION&&Array.isArray(a.sources)&&a.sources.length>0&&a.visual?.mode);
 const reuse=articlesCurrent&&previousArticles?.context_hash===context_hash&&previousFacts?.context_hash===context_hash&&previousPlan?.context_hash===context_hash;
 const extracted=reuse?{facts:previousFacts.facts||[],warning:previousFacts.warning||null}:await extractFacts(env,active).catch(e=>({facts:[],warning:e.message}));
 const factStore={window_days:WINDOW_DAYS,updated_at:cache.refreshed_at,context_hash,warning:extracted.warning||null,facts:extracted.facts};
 const plan=reuse?previousPlan:await planContent(env,factStore.facts).catch(e=>({topics:[],warning:e.message})); plan.context_hash=context_hash;
 let articles=reuse?(previousArticles.articles||[]):await writeArticles(env,plan,factStore.facts).catch(()=>[]); articles=await hydrateArticleImages(env,articles);
 await write(env,"_editorial/source-cache.json",cache);await write(env,"_editorial/source-archive.json",{updated_at:cache.refreshed_at,items:archive});await write(env,"_editorial/facts.json",factStore);await write(env,"_editorial/content-plan.json",plan);await write(env,"_editorial/articles.json",{updated_at:cache.refreshed_at,context_hash,reused:reuse,articles});
 return {...cache,fact_count:factStore.facts.length,topic_count:(plan.topics||[]).length,article_count:articles.length,fact_warning:factStore.warning,plan_warning:plan.warning||null};
}
export default{async fetch(req,env){const u=new URL(req.url);if(req.method==="OPTIONS")return new Response(null,{status:204,headers:{"access-control-allow-origin":"*","access-control-allow-methods":"GET,POST,OPTIONS","access-control-allow-headers":"x-csum-admin-token"}});
 try{
  if(u.pathname==="/health")return json({ok:true,service:"csum-source-collector",r2:!!env.CSUM_IMAGES,window_days:WINDOW_DAYS});
  if(u.pathname==="/api/sources"&&req.method==="GET"){let c=await read(env,"_editorial/source-cache.json",null);if(!c||Date.now()-Date.parse(c.refreshed_at)>15*60*1000)c=await refresh(env);return json(c)}
  if(u.pathname==="/api/facts"&&req.method==="GET")return json(await read(env,"_editorial/facts.json",{window_days:WINDOW_DAYS,facts:[]}));
  if(u.pathname==="/api/content-plan"&&req.method==="GET")return json(await read(env,"_editorial/content-plan.json",{topics:[]}));
  if(u.pathname==="/api/articles"&&req.method==="GET")return json(await read(env,"_editorial/articles.json",{articles:[]}));
  if(u.pathname==="/api/sources/refresh"&&req.method==="POST"){if(!env.ADMIN_TOKEN||req.headers.get("x-csum-admin-token")!==env.ADMIN_TOKEN)return json({error:"UNAUTHORIZED"},401);return json(await refresh(env))}
  return json({error:"NOT_FOUND"},404);
 }catch(e){return json({error:e.message||String(e)},500)}}};