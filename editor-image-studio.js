(() => {
  const $ = s => document.querySelector(s);
  const state = {catalog:null,item:null,candidate:null,referenceDataUrl:""};
  const tokenKey = "csum_image_admin_token_v4";
  const status = (msg, kind="") => { const el=$("#status"); el.textContent=msg; el.className="status "+kind; };

  async function loadCatalog(){
    state.catalog = await fetch("content/visuals.json",{cache:"no-store"}).then(r=>r.json());
    $("#catalog").innerHTML = state.catalog.items.map((item,i)=>'<button class="item'+(i===0?' active':'')+'" data-id="'+item.id+'"><b>'+item.title+'</b><small>'+item.type+' · '+item.aspectRatio+'</small></button>').join("");
    $("#catalog").addEventListener("click",e=>{const b=e.target.closest(".item");if(!b)return; selectItem(b.dataset.id);});
    selectItem(state.catalog.items[0].id);
  }

  function selectItem(id){
    state.item=state.catalog.items.find(x=>x.id===id); state.candidate=null;
    document.querySelectorAll(".item").forEach(b=>b.classList.toggle("active",b.dataset.id===id));
    $("#itemTitle").value=state.item.title;
    $("#aspect").value=state.item.aspectRatio || "16:9";
    $("#currentImage").src=state.item.defaultSrc;
    $("#candidateImage").removeAttribute("src");
    $("#prompt").value=window.CSUMImageAPI.buildPrompt(state.item,$("#notes").value);
    $("#apply").disabled=true;
    $("#generationMeta").textContent="";
  }

  async function fileToDataUrl(file){
    return await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(file);});
  }

  function setup(){
    $("#apiBase").value=window.CSUMImageAPI.getApiBase();
    $("#adminToken").value=sessionStorage.getItem(tokenKey)||"";
    $("#saveSetup").onclick=()=>{
      window.CSUMImageAPI.setApiBase($("#apiBase").value.trim());
      sessionStorage.setItem(tokenKey,$("#adminToken").value.trim());
      status("Подключение сохранено. Генерация готова к проверке.","ok");
    };
    $("#rebuildPrompt").onclick=()=>{$("#prompt").value=window.CSUMImageAPI.buildPrompt(state.item,$("#notes").value);};
    $("#notes").addEventListener("change",()=>$("#prompt").value=window.CSUMImageAPI.buildPrompt(state.item,$("#notes").value));
    $("#referenceFile").addEventListener("change",async e=>{state.referenceDataUrl=e.target.files?.[0]?await fileToDataUrl(e.target.files[0]):"";});

    $("#generate").onclick=async()=>{
      const btn=$("#generate"); btn.disabled=true; status("OpenRouter генерирует изображение…");
      try{
        const token=sessionStorage.getItem(tokenKey)||$("#adminToken").value.trim();
        const base=window.CSUMImageAPI.getApiBase();
        if(!base) throw new Error("Укажите адрес Cloudflare Worker.");
        const currentRef=$("#useCurrentReference").checked ? $("#currentImage").src : "";
        const res=await fetch(base+"/api/generate",{
          method:"POST",
          headers:{"Content-Type":"application/json","X-CSUM-Admin-Token":token},
          body:JSON.stringify({
            id:state.item.id,
            prompt:$("#prompt").value.trim(),
            model:$("#model").value,
            aspect_ratio:$("#aspect").value,
            output_format:"webp",
            quality:"high",
            reference_data_url:state.referenceDataUrl||undefined,
            reference_url:state.referenceDataUrl?undefined:(currentRef||undefined)
          })
        });
        const data=await res.json(); if(!res.ok) throw new Error(data.error||("HTTP "+res.status));
        state.candidate=data;
        $("#candidateImage").src=data.url;
        $("#apply").disabled=false;
        const cost=data.usage?.cost!=null ? " · стоимость: $"+Number(data.usage.cost).toFixed(4) : "";
        $("#generationMeta").textContent=(data.model||$("#model").value)+cost+(data.persistent_candidate?" · candidate сохранён":" · preview only");
        status("Кандидат готов. Проверьте изображение и нажмите «Применить к сайту».","ok");
      }catch(err){status(err.message||String(err),"err");}finally{btn.disabled=false;}
    };

    $("#apply").onclick=async()=>{
      if(!state.candidate)return; const btn=$("#apply");btn.disabled=true;status("Применяю изображение…");
      try{
        const token=sessionStorage.getItem(tokenKey)||$("#adminToken").value.trim();
        const base=window.CSUMImageAPI.getApiBase();
        let record;
        if(base && state.candidate.candidate_key){
          const res=await fetch(base+"/api/apply",{method:"POST",headers:{"Content-Type":"application/json","X-CSUM-Admin-Token":token},body:JSON.stringify({id:state.item.id,candidate_key:state.candidate.candidate_key,prompt:state.candidate.prompt,model:state.candidate.model})});
          record=await res.json(); if(!res.ok) throw new Error(record.error||("HTTP "+res.status));
        }else{
          record={id:state.item.id,url:state.candidate.url,prompt:state.candidate.prompt,model:state.candidate.model,local_only:true,updated_at:new Date().toISOString()};
        }
        window.CSUMImageAPI.saveLocalOverride(state.item.id,record);
        $("#currentImage").src=record.url;
        status(record.local_only?"Применено на этом устройстве. Для публикации подключите R2 к Worker.":"Опубликовано: сайт будет брать этот visual через Image API.","ok");
      }catch(err){status(err.message||String(err),"err");}finally{btn.disabled=false;}
    };
  }

  addEventListener("DOMContentLoaded",async()=>{setup();try{await loadCatalog();status(window.CSUMImageAPI.getApiBase()?"Каталог загружен. Можно генерировать.":"Каталог загружен. Укажите Image API.","ok");}catch(e){status("Не удалось загрузить каталог: "+e.message,"err");}});
})();