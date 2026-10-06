const json = (data,status=200,headers={}) => new Response(JSON.stringify(data),{status,headers:{"content-type":"application/json; charset=utf-8",...headers}});
const cors = env => ({
  "access-control-allow-origin": env.ALLOWED_ORIGIN || "*",
  "access-control-allow-headers": "content-type,x-csum-admin-token",
  "access-control-allow-methods": "GET,POST,OPTIONS",
  "cache-control":"no-store"
});
const unauthorized = env => json({error:"UNAUTHORIZED"},401,cors(env));
const requireAdmin = (req,env) => !!env.ADMIN_TOKEN && req.headers.get("X-CSUM-Admin-Token") === env.ADMIN_TOKEN;
const bytesFromBase64 = b64 => Uint8Array.from(atob(b64),c=>c.charCodeAt(0));
const extFor = media => media?.includes("png")?"png":media?.includes("jpeg")?"jpg":"webp";
const httpReference = value => { try { const u=new URL(value); return ["http:","https:"].includes(u.protocol); } catch { return false; } };
const officialReference = value => { try { const u=new URL(value); return httpReference(value) && /(^|\\.)csum\\.ru$/i.test(u.hostname); } catch { return false; } };
const projectReference = (value,env) => { try { const u=new URL(value); const allowed=[new URL(env.SITE_URL||"https://mkontrakevich.github.io/GPT/").hostname,new URL(env.PROJECT_ASSET_BASE||"https://mkontrakevich.github.io/GPT/").hostname]; return httpReference(value)&&allowed.includes(u.hostname); } catch { return false; } };
const referenceList = body => [...new Set([...(Array.isArray(body.reference_urls)?body.reference_urls:[]),body.reference_url].filter(Boolean))].filter(officialReference).slice(0,3);

async function openRouter(env,path,init={}){
  if(!env.OPENROUTER_API_KEY) throw new Error("OPENROUTER_API_KEY is not configured");
  const res=await fetch("https://openrouter.ai"+path,{
    ...init,
    headers:{
      "Authorization":"Bearer "+env.OPENROUTER_API_KEY,
      "Content-Type":"application/json",
      "HTTP-Referer":env.SITE_URL || "https://mkontrakevich.github.io/GPT/",
      "X-Title":"CSUM Nizhny Novgorod Image Studio",
      ...(init.headers||{})
    }
  });
  const data=await res.json().catch(()=>({}));
  if(!res.ok) throw new Error(data?.error?.message || data?.message || ("OpenRouter HTTP "+res.status));
  return data;
}

async function loadManifest(env){
  if(!env.CSUM_IMAGES) return {};
  const obj=await env.CSUM_IMAGES.get("_content/active-images.json");
  if(!obj) return {};
  try{return await obj.json();}catch{return {};}
}
async function saveManifest(env,images){
  await env.CSUM_IMAGES.put("_content/active-images.json",JSON.stringify(images),{httpMetadata:{contentType:"application/json"}});
}

export default {
  async fetch(req,env){
    const url=new URL(req.url);
    if(req.method==="OPTIONS") return new Response(null,{status:204,headers:cors(env)});
    try{
      if(url.pathname==="/health") return json({ok:true,service:"csum-image-api",version:"reference-v4-project-grounding",r2:!!env.CSUM_IMAGES,openrouter:!!env.OPENROUTER_API_KEY},200,cors(env));

      if(url.pathname==="/api/models" && req.method==="GET"){
        const data=await openRouter(env,"/api/v1/images/models",{method:"GET"});
        return json(data,200,cors(env));
      }

      if(url.pathname==="/api/content" && req.method==="GET"){
        return json({images:await loadManifest(env)},200,cors(env));
      }

      if(url.pathname.startsWith("/generated/") && req.method==="GET"){
        if(!env.CSUM_IMAGES) return new Response("R2 not configured",{status:404,headers:cors(env)});
        const key=decodeURIComponent(url.pathname.slice("/generated/".length));
        const obj=await env.CSUM_IMAGES.get(key);
        if(!obj) return new Response("Not found",{status:404,headers:cors(env)});
        return new Response(obj.body,{headers:{...cors(env),"content-type":obj.httpMetadata?.contentType||"image/webp","cache-control":"public,max-age=31536000,immutable"}});
      }

      if(url.pathname==="/api/reference-generate" && req.method==="POST"){
        if(!requireAdmin(req,env)) return unauthorized(env);
        const body=await req.json();
        if(!body.id || !body.prompt) return json({error:"id and prompt are required"},400,cors(env));
        const sourceBase=env.EDITORIAL_API || "https://csum-nn-source-collector.kontrakevich.workers.dev";
        let library=await fetch(sourceBase+"/api/visual-assets").then(r=>r.ok?r.json():({assets:[]}));
        if(!(library.assets||[]).length){const articles=await fetch(sourceBase+"/api/articles").then(r=>r.ok?r.json():({articles:[]}));library={assets:(articles.articles||[]).flatMap(a=>(a.visual?.source_images||[]).map(image_url=>({image_url,title:a.title||"",source:"csum.ru",tags:["editorial"]})))};}
        const terms=String([body.title,body.prompt,body.kind].filter(Boolean).join(" ")).toLowerCase().split(/[^a-zа-яё0-9]+/i).filter(x=>x.length>3);
        const ranked=(library.assets||[]).map(a=>{const hay=String((a.title||"")+" "+(a.tags||[]).join(" ")).toLowerCase();return {...a,score:terms.reduce((s,t)=>s+(hay.includes(t)?1:0),0)+(body.kind==="hero"&&a.tags?.includes("architecture")?4:0)};}).sort((a,b)=>b.score-a.score);
        const requested=[...(Array.isArray(body.project_reference_urls)?body.project_reference_urls:[]),body.project_reference_url].filter(Boolean);
        const suppliedReferences=[...(Array.isArray(body.reference_urls)?body.reference_urls:[]),body.reference_url].filter(httpReference);
        const manifest=await fetch((env.SITE_URL||"https://mkontrakevich.github.io/GPT/").replace(/\/$/,"")+"/content/visuals.json").then(r=>r.ok?r.json():({items:[]})).catch(()=>({items:[]}));
        const visual=(manifest.items||[]).find(x=>x.id===body.id)||{};
        const manifestRefs=[...(Array.isArray(visual.sourceReferences)?visual.sourceReferences:[]),visual.defaultSrc].filter(Boolean);
        const projectRefs=[...new Set([...requested,...manifestRefs].filter(ref=>projectReference(ref,env)))].slice(0,3);
        const manifestOfficialRefs=[...new Set(manifestRefs.filter(officialReference))];
        const officialRefs=[...new Set([...manifestOfficialRefs,...ranked.map(x=>x.image_url).filter(officialReference)])].slice(0,3);
        const refs=[...new Set([...projectRefs,...suppliedReferences,...officialRefs])].slice(0,3);
        if(!refs.length) return json({error:"NO_GROUNDED_REFERENCES"},422,cors(env));
        const referenceSources=refs.map(ref=>({url:ref,type:projectRefs.includes(ref)?"project_source":officialReference(ref)?"official_source":"open_source"}));
        const entity=String(body.entity||visual.entity||body.title||visual.title||"").trim();
        const facts=[...(Array.isArray(body.verified_facts)?body.verified_facts:[]),...(Array.isArray(visual.verifiedFacts)?visual.verifiedFacts:[])].filter(Boolean).slice(0,12);
        const factualContext=[entity?("Exact subject: "+entity):"",facts.length?("Verified context: "+facts.join(" | ")):"",body.prompt].filter(Boolean).join("\n");
        const payload={model:body.model||"bytedance-seed/seedream-4.5",prompt:factualContext,aspect_ratio:body.aspect_ratio||"16:9",output_format:body.output_format||"webp",n:1,input_references:refs.map(ref=>({type:"image_url",image_url:{url:ref}}))};
        const result=await openRouter(env,"/api/v1/images",{method:"POST",body:JSON.stringify(payload)});
        const first=result?.data?.[0]; if(!first?.b64_json)return json({error:"OpenRouter returned no image"},502,cors(env));
        const media=first.media_type||"image/webp", ext=extFor(media), candidateKey="candidates/"+body.id+"/"+Date.now()+"-"+crypto.randomUUID()+"."+ext;
        await env.CSUM_IMAGES.put(candidateKey,bytesFromBase64(first.b64_json),{httpMetadata:{contentType:media}});
        return json({ok:true,id:body.id,url:new URL("/generated/"+encodeURIComponent(candidateKey),url.origin).toString(),candidate_key:candidateKey,persistent_candidate:true,prompt:factualContext,model:payload.model,entity,verified_facts:facts,reference_urls:refs,reference_count:refs.length,reference_sources:referenceSources,reference_grounded:true,generated_derivative:true,usage:result.usage||null},200,cors(env));
      }

      if(url.pathname==="/api/generate" && req.method==="POST"){
        if(!requireAdmin(req,env)) return unauthorized(env);
        const body=await req.json();
        if(!body.id || !body.prompt) return json({error:"id and prompt are required"},400,cors(env));

        const refs=referenceList(body); const ref=body.reference_data_url || refs[0];
        const payload={
          model:body.model || "bytedance-seed/seedream-4.5",
          prompt:body.prompt,
          aspect_ratio:body.aspect_ratio || "16:9",
          output_format:body.output_format || "webp",
          n:1
        };
        if(body.reference_data_url) payload.input_references=[{type:"image_url",image_url:{url:body.reference_data_url}}]; else if(refs.length) payload.input_references=refs.map(ref=>({type:"image_url",image_url:{url:ref}}));

        let result;
        try{
          result=await openRouter(env,"/api/v1/images",{method:"POST",body:JSON.stringify(payload)});
        }catch(firstError){
          const fallback={model:payload.model,prompt:payload.prompt};
          if(ref) fallback.input_references=payload.input_references;
          result=await openRouter(env,"/api/v1/images",{method:"POST",body:JSON.stringify(fallback)});
        }

        const first=result?.data?.[0];
        if(!first?.b64_json) return json({error:"OpenRouter returned no image"},502,cors(env));
        const media=first.media_type || "image/webp";
        const ext=extFor(media);
        const candidateKey="candidates/"+body.id+"/"+Date.now()+"-"+crypto.randomUUID()+"."+ext;
        let imageUrl="data:"+media+";base64,"+first.b64_json;
        let persisted=false;
        if(env.CSUM_IMAGES){
          await env.CSUM_IMAGES.put(candidateKey,bytesFromBase64(first.b64_json),{httpMetadata:{contentType:media}});
          imageUrl=new URL("/generated/"+encodeURIComponent(candidateKey),url.origin).toString();
          persisted=true;
        }
        return json({
          ok:true,id:body.id,url:imageUrl,candidate_key:persisted?candidateKey:null,
          persistent_candidate:persisted,prompt:body.prompt,model:payload.model,media_type:media,reference_urls:refs,reference_grounded:refs.length>0,usage:result.usage||null
        },200,cors(env));
      }

      if(url.pathname==="/api/apply" && req.method==="POST"){
        if(!requireAdmin(req,env)) return unauthorized(env);
        if(!env.CSUM_IMAGES) return json({error:"Persistent publishing requires the CSUM_IMAGES R2 binding"},409,cors(env));
        const body=await req.json();
        if(!body.id || !body.candidate_key) return json({error:"id and candidate_key are required"},400,cors(env));
        const obj=await env.CSUM_IMAGES.head(body.candidate_key);
        if(!obj) return json({error:"Candidate not found"},404,cors(env));
        const record={
          id:body.id,
          url:new URL("/generated/"+encodeURIComponent(body.candidate_key),url.origin).toString(),
          prompt:body.prompt||"",
          model:body.model||"",
          candidate_key:body.candidate_key,
          updated_at:new Date().toISOString()
        };
        const images=await loadManifest(env);
        images[body.id]=record;
        await saveManifest(env,images);
        return json(record,200,cors(env));
      }

      return json({error:"NOT_FOUND"},404,cors(env));
    }catch(err){
      return json({error:err?.message||String(err)},500,cors(env));
    }
  }
};