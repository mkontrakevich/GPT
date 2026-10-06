const DAY=86400000, WINDOW_DAYS=7, ARTICLE_SCHEMA_VERSION=3;
const json=(d,s=200,h={})=>new Response(JSON.stringify(d),{status:s,headers:{"content-type":"application/json; charset=utf-8","access-control-allow-origin":"*","cache-control":"no-store",...h}});
const clean=s=>(s||"").replace(/<script[\s\S]*?<\/script>/gi," ").replace(/<style[\s\S]*?<\/style>/gi," ").replace(/<[^>]+>/g," ").replace(/&nbsp;/g," ").replace(/&amp;/g,"&").replace(/\s+/g," ").trim();
const hash=async s=>Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(s)))).map(x=>x.toString(16).padStart(2,"0")).join("");
async function read(env,key,fallback){const o=await env.CSUM_IMAGES.get(key);if(!o)return fallback;try{return await o.json()}catch{return fallback}}
async function write(env,key,v){await env.CSUM_IMAGES.put(key,JSON.stringify(v),{httpMetadata:{contentType:"application/json"}})}
function abs(href,base){try{return new URL(href,base).toString()}catch{return null}}
function sourceImages(html,base){const out=[],seen=new Set(),push=v=>{const raw=String(v||"").trim().split(/\s+/)[0];const u=abs(raw,base);if(!u)return;try{const q=new URL(u);if(!["http:","https:"].includes(q.protocol)||!/(^|\.)csum\.ru$/i.test(q.hostname)||seen.has(q.href)||/logo|icon|sprite|pixel|counter|favicon/i.test(q.pathname))return;seen.add(q.href);out.push(q.href)}catch{}};for(const tag of html.match(/<img\b[^>]*>/gi)||[]){for(const a of ["src","data-src","data-lazy-src","data-original","data-image","srcset","data-srcset"]){const m=tag.match(new RegExp(a+'=["\\\']([^"\\\']+)["\\\']',"i"));if(m)push(m[1]);if(out.length>=12)return out}}for(const m of html.matchAll(/(?:og:image|twitter:image)[^>]+content=["']([^"']+)["']/gi)){push(m[1]);if(out.length>=12)break}return out}
function wordSet(s){return new Set(String(s||"").toLowerCase().replace(/[^a-zа-яё0-9 ]/gi," ").split(/\s+/).filter(x=>x.length>3))}
function similarity(a,b){const A=wordSet(a),B=wordSet(b);if(!A.size||!B.size)return 0;let n=0;for(const x of A)if(B.has(x))n++;return n/Math.min(A.size,B.size)}
function dedupeTopics(topics,facts){const kept=[];for(const t of [...(topics||[])].sort((a,b)=>(a.priority||99)-(b.priority||99))){const idx=[...new Set((t.fact_indexes||[]).filter(i=>facts[i]))],fps=new Set(idx.map(i=>facts[i].source_fingerprint)),entities=new Set(idx.map(i=>String(facts[i].entity||"").toLowerCase()).filter(Boolean));const evidence=idx.map(i=>facts[i].evidence||"").join(" ");const dup=kept.some(k=>{const sameEntity=[...entities].some(x=>k.entities.has(x)),semantic=similarity((t.title||"")+" "+(t.angle||""),(k.topic.title||"")+" "+(k.topic.angle||"")),evidenceSim=similarity(evidence,k.evidence);return (sameEntity&&semantic>.52&&evidenceSim>.35)||(semantic>.68&&evidenceSim>.45)});if(!dup)kept.push({topic:{...t,fact_indexes:idx},fps,entities,evidence})}return kept.map(x=>x.topic)}
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
 const html=await res.text(), candidates=[{title:"ЦУМ Нижний Новгород",url:root}], seen=new Set([root]), re=/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi; let m;
 while((m=re.exec(html))&&candidates.length<12){
  const title=clean(m[2]).replace(/^[-–—>\s]+|[-–—<\s]+$/g,""),u=abs(m[1],root);
  if(title.length<4||!u)continue; const q=new URL(u); if(q.hostname!=="www.csum.ru"&&q.hostname!=="csum.ru")continue;
  q.hash=""; const canonical=q.toString(); if(seen.has(canonical))continue; seen.add(canonical); candidates.push({title,url:canonical});
 }
 const rows=await Promise.all(candidates.map(async x=>{
  try{
   const r=await fetch(x.url,{headers:{"user-agent":"CSUM Editorial Source Collector/1.0"}});
   if(!r.ok)return null; const page=await r.text();
   const pageTitle=clean((page.match(/<title[^>]*>([\s\S]*?)<\/title>/i)||[])[1]||x.title);
   const body=clean(page.replace(/<!--[\s\S]*?-->/g," ")).slice(0,2500);
   if(body.length<40)return null;
   return {source:"csum.ru",source_url:x.url,title:pageTitle||x.title,published_at:null,raw_excerpt:body,source_images:sourceImages(page,x.url),collected_at:new Date().toISOString()};
  }catch{return null}
 }));
 return rows.filter(Boolean);
}
async function normalize(items){
 const seen=new Set(), out=[];
 for(const x of items){const fp=await hash([x.source,x.source_url,x.title,x.published_at||"",x.raw_excerpt||""].join("|"));if(seen.has(fp))continue;seen.add(fp);out.push({...x,fingerprint:fp})}
 return out;
}
async function extractFacts(env,items){
 if(!env.OPENROUTER_API_KEY||!items.length)return {facts:[],warning:"OPENROUTER_API_KEY_NOT_CONFIGURED"};
 const unique=[];const seenUrls=new Set();
 for(const x of items){if(!x.source_url||seenUrls.has(x.source_url)||String(x.raw_excerpt||"").length<80)continue;seenUrls.add(x.source_url);unique.push(x);if(unique.length>=20)break}
 const input=unique.map(x=>({fingerprint:x.fingerprint,source:x.source,url:x.source_url,title:x.title,published_at:x.published_at,excerpt:String(x.raw_excerpt||"").slice(0,1800),images:(x.source_images||[]).slice(0,3)}));
 const prompt="Extract only explicit facts from these official CSUM Nizhny Novgorod source records. Never infer prices, stock, dates, brands, products, promotions or events. Return strict JSON object {facts:[{source_fingerprint,type,title,entity,date,source_url,evidence,confidence}]}. type must be one of event,promotion,store,brand,product,service,news. confidence 0..1. Evidence must be a short paraphrase grounded in source. INPUT:"+JSON.stringify(input);
 const res=await fetch("https://openrouter.ai/api/v1/chat/completions",{method:"POST",headers:{"authorization":"Bearer "+env.OPENROUTER_API_KEY,"content-type":"application/json","HTTP-Referer":"https://mkontrakevich.github.io/GPT/","X-Title":"CSUM Editorial Fact Extractor"},body:JSON.stringify({model:env.TEXT_MODEL||"google/gemini-2.5-flash",messages:[{role:"user",content:prompt}],response_format:{type:"json_object"},temperature:0,usage:{include:true}})});
 if(!res.ok)throw new Error("OpenRouter facts HTTP "+res.status);
 const data=await res.json(), raw=data?.choices?.[0]?.message?.content||"{\"facts\":[]}";
 let parsed;try{parsed=JSON.parse(raw)}catch{parsed={facts:[]}}
 const allowed=new Set(input.map(x=>x.fingerprint));
 const facts=(parsed.facts||[]).filter(f=>allowed.has(f.source_fingerprint)&&f.source_url&&f.evidence).map(f=>({...f,extracted_at:new Date().toISOString()}));
 return {facts,cost_usd:Number(data?.usage?.cost||0)};
}
async function planContent(env,facts){
 if(!env.OPENROUTER_API_KEY||!facts.length)return {topics:[],warning:"NO_FACTS_OR_OPENROUTER"};
 const prompt="Plan a current editorial homepage for CSUM Nizhny Novgorod in RUSSIAN using ONLY supplied verified facts. Do not use outside knowledge or infer anything beyond the evidence. Return strict JSON {topics:[{id,title,deck,angle,fact_indexes,native_integrations,priority}]}. Create 3-7 useful magazine topics. Native integrations must refer only to entities explicitly present in facts; never invent products, stock, prices or promotions. Headlines must be statements, not questions. FACTS:"+JSON.stringify(facts);
 const res=await fetch("https://openrouter.ai/api/v1/chat/completions",{method:"POST",headers:{"authorization":"Bearer "+env.OPENROUTER_API_KEY,"content-type":"application/json","HTTP-Referer":"https://mkontrakevich.github.io/GPT/","X-Title":"CSUM Editorial Planner"},body:JSON.stringify({model:env.TEXT_MODEL||"google/gemini-2.5-flash",messages:[{role:"user",content:prompt}],response_format:{type:"json_object"},temperature:.2,usage:{include:true}})});
 if(!res.ok)throw new Error("OpenRouter planner HTTP "+res.status);
 const d=await res.json();let p;try{p=JSON.parse(d?.choices?.[0]?.message?.content||"{}")}catch{p={topics:[]}}
 let topics=dedupeTopics((p.topics||[]).slice(0,7),facts);
 if(!topics.length){
  const groups=new Map();
  facts.forEach((f,i)=>{const key=String(f.type||"news");if(!groups.has(key))groups.set(key,[]);groups.get(key).push(i)});
  topics=[...groups.entries()].slice(0,6).map(([type,idx],n)=>({id:"auto-"+type,title:({event:"Афиша ЦУМа",promotion:"Актуальные предложения ЦУМа",store:"Магазины ЦУМа",brand:"Бренды ЦУМа",product:"Выбор в ЦУМе",service:"Сервисы ЦУМа",news:"Новости ЦУМа"}[type]||"Новости ЦУМа"),deck:"Проверенная информация из официальных источников ЦУМа.",angle:"Обзор подтверждённых фактов без повторов.",fact_indexes:idx.slice(0,12),native_integrations:[],priority:n+1}));
  topics=dedupeTopics(topics,facts);
 }
 return {topics,generated_at:new Date().toISOString(),cost_usd:Number(d?.usage?.cost||0)};
}
async function generateArticleImage(env,id,brief,references=[]){
 if(!brief||!env.OPENROUTER_API_KEY||!env.CSUM_IMAGES)return null;
 const res=await fetch("https://openrouter.ai/api/v1/images",{method:"POST",headers:{"authorization":"Bearer "+env.OPENROUTER_API_KEY,"content-type":"application/json","HTTP-Referer":"https://mkontrakevich.github.io/GPT/","X-Title":"CSUM Editorial Image Generator"},body:JSON.stringify({model:env.IMAGE_MODEL||"bytedance-seed/seedream-4.5",prompt:brief,aspect_ratio:"16:9",output_format:"webp",n:1,...(references.length?{input_references:references.slice(0,3).map(u=>({type:"image_url",image_url:{url:u}}))}:{})})});
 const data=await res.json().catch(()=>({}));
 if(!res.ok)throw new Error("OPENROUTER_IMAGE_"+res.status+":"+(data?.error?.message||data?.message||"unknown"));
 const first=data?.data?.[0]; if(!first?.b64_json)throw new Error("OPENROUTER_IMAGE_NO_DATA");
 const cost_usd=Number(data?.usage?.cost||0);
 const media=first.media_type||"image/webp",ext=media.includes("png")?"png":media.includes("jpeg")?"jpg":"webp";
 const key="articles/"+id+"/"+Date.now()+"-"+crypto.randomUUID()+"."+ext;
 const bytes=Uint8Array.from(atob(first.b64_json),x=>x.charCodeAt(0));
 await env.CSUM_IMAGES.put(key,bytes,{httpMetadata:{contentType:media}});
 return {url:"https://csum-nn-image-studio.kontrakevich.workers.dev/generated/"+encodeURIComponent(key),cost_usd};
}
async function hydrateArticleImages(env,articles){
 let generatedNow=0;
 for(const a of articles||[]){
  if(a?.visual?.mode!=="editorial"||a.image_url||!a.visual?.brief||generatedNow>=2)continue;
  const u=await generateArticleImage(env,a.id,a.visual.brief,a.visual.source_images||[]).catch(e=>{a.visual.error=e.message||String(e);return null});
  if(u){a.image_url=u.url;a.visual.generated=true;a.visual.reason="editorial_illustration";a.visual.cost_usd=Number(u.cost_usd||0);delete a.visual.error;generatedNow++;}
 }
 return articles;
}
function dedupeArticles(articles){
 const kept=[];
 for(const a of articles||[]){
  const textA=(a.title||"")+" "+(a.deck||"")+" "+(a.sections||[]).map(s=>(s.heading||"")+" "+(s.body||"")).join(" ");
  const factsA=new Set(a.source_fingerprints||[]);
  const dup=kept.some(k=>{const titleSim=similarity(a.title,k.a.title),bodySim=similarity(textA,k.text),shared=[...factsA].filter(x=>k.facts.has(x)).length/Math.max(1,Math.min(factsA.size,k.facts.size));return titleSim>.55||(bodySim>.5&&shared>.35)||(titleSim>.4&&bodySim>.42)});
  if(!dup)kept.push({a,text:textA,facts:factsA});
 }
 return kept.map(x=>x.a);
}
async function writeArticles(env,plan,facts,items){
 const articles=[];
 for(const topic of (plan.topics||[])){
  const used=(topic.fact_indexes||[]).map(i=>facts[i]).filter(Boolean); if(!used.length)continue;
  const prompt="Write a Russian CSUM city-magazine article grounded ONLY in VERIFIED_FACTS. Do NOT add historical background, descriptions, amenities, locations, brands, products, dates, availability or any other knowledge unless explicitly stated in VERIFIED_FACTS evidence. If facts are sparse, write a shorter 250-500 word useful article rather than filling gaps. Every factual claim must be directly supported by supplied evidence.  Structure: headline, deck, 3-5 sections, practical conclusion, then subtle native commerce in final 20-30%, one CTA. Commercial content <=15%. Do not invent facts, products, availability, prices, dates or discounts. Return strict JSON {title,deck,sections:[{heading,body}],native_integrations:[{entity,context,source_url}],cta:{label,url},visual_brief}. TOPIC:"+JSON.stringify(topic)+" VERIFIED_FACTS:"+JSON.stringify(used);
  const res=await fetch("https://openrouter.ai/api/v1/chat/completions",{method:"POST",headers:{"authorization":"Bearer "+env.OPENROUTER_API_KEY,"content-type":"application/json","HTTP-Referer":"https://mkontrakevich.github.io/GPT/","X-Title":"CSUM Editorial Writer"},body:JSON.stringify({model:env.TEXT_MODEL||"google/gemini-2.5-flash",messages:[{role:"user",content:prompt}],response_format:{type:"json_object"},temperature:.45,usage:{include:true}})});
  if(!res.ok)continue; const d=await res.json();let a;try{a=JSON.parse(d?.choices?.[0]?.message?.content||"{}")}catch{continue}
  const allowedUrls=new Set(used.map(x=>x.source_url).filter(Boolean));
  a.native_integrations=(a.native_integrations||[]).filter(x=>x&&allowedUrls.has(x.source_url));
  if(a.cta&&!allowedUrls.has(a.cta.url))a.cta=null;
  const articleId=topic.id||crypto.randomUUID();
  const sources=[...new Map(used.filter(x=>x.source_url).map(x=>[x.source_url,{url:x.source_url,title:x.title||x.entity||"Источник",source_fingerprint:x.source_fingerprint,evidence:x.evidence||null}])).values()];
  const sourceItems=used.map(f=>(items||[]).find(x=>x.fingerprint===f.source_fingerprint)).filter(Boolean);
  const source_images=[...new Set(sourceItems.flatMap(x=>x.source_images||[]))].slice(0,8);
  const factualTypes=new Set(["product","promotion","store","brand","event"]);
  const factualVisual=used.some(x=>factualTypes.has(String(x.type||"").toLowerCase()));
  if(!source_images.length) continue;
  const retailVisual=used.some(x=>["store","brand","product"].includes(String(x.type||"").toLowerCase()));\n  const groundedBrief=retailVisual?("Create a premium associative editorial photograph inspired by the retail category and article theme, not a literal reconstruction of the named store. Do not recreate the storefront, interior, signage, wordmarks, labels or readable text. Do not render or redraw any logo. If branding is needed it will be composited later from an original approved logo asset under BRAND LOCK. Avoid generic advertising CGI; use credible magazine photography, natural materials, restrained styling and an observational composition. ARTICLE THEME: "+(a.title||"")+" "+(a.deck||"")+" VERIFIED FACTS FOR CONTEXT ONLY: "+used.map(x=>x.evidence).join(" ")):("Create a publication-grade editorial photograph for this exact article. Ground identity-critical real-world subjects in supplied references and verified facts. Do not invent architecture, products, people, prices, readable text, signage or event details. ARTICLE: "+(a.title||"")+" "+(a.deck||"")+" VERIFIED FACTS: "+used.map(x=>x.evidence).join(" "));
  const primaryEntity=(used.find(x=>x.entity)?.entity||a.title||topic.title||"").trim();
  const visual={mode:factualVisual?"factual":"editorial",brief:groundedBrief,generated:false,reason:factualVisual?"verified_real-world_subject":"source_grounded_editorial",entity:primaryEntity,verified_facts:used.map(x=>x.evidence).filter(Boolean),reference_urls:source_images.slice(0,3),generation_package:{id:"article-"+articleId,kind:retailVisual?"associative_retail":factualVisual?"entity":"editorial",entity:primaryEntity,title:a.title||topic.title||"",prompt:groundedBrief,verified_facts:used.map(x=>x.evidence).filter(Boolean),project_reference_urls:[],reference_urls:source_images.slice(0,3),aspect_ratio:"16:9",require_specific_grounding:!retailVisual,associative_retail:retailVisual,brand_lock:true,logo_policy:"original_asset_only_no_redraw"},source_images};
  const image_url=null;
  visual.generated=false;
  articles.push({...a,id:articleId,image_url,visual,text_cost_usd:Number(d?.usage?.cost||0),schema_version:ARTICLE_SCHEMA_VERSION,generated_at:new Date().toISOString(),sources,source_urls:sources.map(x=>x.url),source_fingerprints:used.map(x=>x.source_fingerprint)});
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
 const configured={vk:false,telegram:false};
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
 let articles=reuse?(previousArticles.articles||[]):await writeArticles(env,plan,factStore.facts,active).catch(()=>[]);
 if(!reuse&&!articles.length&&Array.isArray(previousArticles?.articles)&&previousArticles.articles.length){articles=previousArticles.articles;factStore.warning=factStore.warning||"REFRESH_EMPTY_PRESERVED_PREVIOUS_ARTICLES"}
 articles=dedupeArticles(articles); if(!reuse)articles=await hydrateArticleImages(env,articles);
 const cycle_cost_usd=reuse?0:Number(Number(extracted.cost_usd||0)+Number(plan.cost_usd||0)+articles.reduce((s,a)=>s+Number(a.text_cost_usd||0)+Number(a.visual?.cost_usd||0),0));
 const previous_total_cost_usd=Number(previousArticles?.total_cost_usd||0);
 const total_cost_usd=previous_total_cost_usd+cycle_cost_usd;
 await write(env,"_editorial/source-cache.json",cache);await write(env,"_editorial/source-archive.json",{updated_at:cache.refreshed_at,items:archive});await write(env,"_editorial/facts.json",factStore);await write(env,"_editorial/content-plan.json",plan);await write(env,"_editorial/articles.json",{updated_at:cache.refreshed_at,context_hash,reused:reuse,cost:{cycle_usd:cycle_cost_usd,total_usd:total_cost_usd},total_cost_usd,articles});
 return {...cache,fact_count:factStore.facts.length,topic_count:(plan.topics||[]).length,article_count:articles.length,cost:{cycle_usd:cycle_cost_usd,total_usd:total_cost_usd},fact_warning:factStore.warning,plan_warning:plan.warning||null};
}
export default{async fetch(req,env){const u=new URL(req.url);if(req.method==="OPTIONS")return new Response(null,{status:204,headers:{"access-control-allow-origin":"*","access-control-allow-methods":"GET,POST,OPTIONS","access-control-allow-headers":"x-csum-admin-token"}});
 try{
  if(u.pathname==="/health")return json({ok:true,service:"csum-source-collector",r2:!!env.CSUM_IMAGES,window_days:WINDOW_DAYS});
  if(u.pathname==="/api/sources"&&req.method==="GET"){let c=await read(env,"_editorial/source-cache.json",null);if(!c||Date.now()-Date.parse(c.refreshed_at)>15*60*1000)c=await refresh(env);return json(c)}
  if(u.pathname==="/api/facts"&&req.method==="GET")return json(await read(env,"_editorial/facts.json",{window_days:WINDOW_DAYS,facts:[]}));
  if(u.pathname==="/api/content-plan"&&req.method==="GET")return json(await read(env,"_editorial/content-plan.json",{topics:[]}));
  if(u.pathname==="/api/articles"&&req.method==="GET")return json(await read(env,"_editorial/articles.json",{articles:[]}));
  if(u.pathname==="/api/visual-assets"&&req.method==="GET"){
   const cache=await read(env,"_editorial/source-cache.json",{items:[]});
   const assets=[]; const seen=new Set();
   for(const item of cache.items||[])for(const image_url of (item.source_images||item.images||[])){if(seen.has(image_url))continue;seen.add(image_url);assets.push({image_url,source_url:item.source_url,title:item.title||"",source:"csum.ru",tags:[/контакт|цум/i.test(item.title||"")?"architecture":"editorial"],collected_at:item.collected_at});}
   return json({count:assets.length,assets});
  }
  if(u.pathname==="/api/sources/refresh"&&req.method==="POST"){if(!env.ADMIN_TOKEN||req.headers.get("x-csum-admin-token")!==env.ADMIN_TOKEN)return json({error:"UNAUTHORIZED"},401);return json(await refresh(env))}
  return json({error:"NOT_FOUND"},404);
 }catch(e){return json({error:e.message||String(e)},500)}}};