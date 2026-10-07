(() => {
  const cfg = () => window.CSUM_CONFIG || {};
  const storageKey = () => cfg().storageKey || "csum_image_overrides_v4";
  const apiStorageKey = () => cfg().apiBaseStorageKey || "csum_image_api_base_v4";

  const getApiBase = () => (localStorage.getItem(apiStorageKey()) || cfg().imageApiBase || "").replace(/\/$/, "");
  const setApiBase = value => localStorage.setItem(apiStorageKey(), String(value || "").replace(/\/$/, ""));

  const loadLocalOverrides = () => {
    try { return JSON.parse(localStorage.getItem(storageKey()) || "{}"); } catch { return {}; }
  };
  const saveLocalOverride = (id, record) => {
    const all = loadLocalOverrides();
    all[id] = record;
    localStorage.setItem(storageKey(), JSON.stringify(all));
    return all[id];
  };

  const editorialRules = [
    "high-end editorial photography for an international architecture, fashion and culture magazine",
    "observational magazine photography, cinematic but credible, never commercial advertising",
    "natural human behavior, authentic skin and fabric texture, believable architecture and materials, subtle real-world imperfections",
    "clean composition with room for HTML typography outside the image",
    "no words, no captions, no poster, no interface, no website mockup, no collage, no watermark, no logos",
    "not an advertising banner, not a marketplace product card, not a stock-photo cliché",
    "realistic available light or motivated practical light, restrained filmic color grading, documentary credibility",
    "35mm or 50mm full-frame editorial lens language, physically plausible depth of field, no artificial HDR, no excessive bokeh",
    "composition may be asymmetric, cropped or partially occluded like a deliberately art-directed magazine photograph",
    "avoid CGI cleanliness, plastic surfaces, hyper-sharp AI texture, luxury-advertising gloss, symmetrical showroom staging and generic influencer imagery"
  ];

  const buildPrompt = (item, notes = "") => {
    const sourceRule = "SOURCE-FIRST / IMAGE-TO-IMAGE ONLY. Treat the supplied verified reference image as factual visual ground truth. Preserve the real object, place, materials, spatial relationships and recognizable details. Do not replace the subject with a generic invented alternative.";
    const heroRule = item.type === "hero"
      ? "ORTHO HERO LOCK: show the real CSUM facade in a beautiful front-facing, near-orthographic architectural view. Camera optical axis approximately perpendicular to the principal facade plane; verticals vertical, horizontals level, minimal keystone and perspective distortion. Preserve exact building identity, massing, floors, facade rhythm, openings, columns, entrances, cornices and roofline. FACADE PRIORITY: architecture is the clear protagonist. Remove or naturally minimize lighting poles, overhead wires, utility lines, masts, barriers and other engineering clutter only when they materially cross or obscure the facade; reconstruct only the newly revealed facade area from verified architectural evidence. CITYSCAPE LOCK: do not invent, relocate or redesign recognizable surrounding buildings, street geometry, skyline or landmarks. Never force symmetry by changing architecture."
      : "Use the verified source as the factual base for this editorial scene. Preserve the actual place/object/person-independent facts visible in the reference. Do not turn it into a generic stock-photo scene. For non-architectural subjects, do not impose artificial frontal symmetry; retain a natural editorial composition appropriate to the story.";
    return [
      "Create a publication-grade editorial photograph for the digital magazine of CSUM Nizhny Novgorod. The result must look commissioned and photographed for a leading architecture/fashion/culture magazine, not AI-generated advertising.",
      sourceRule,
      "Subject: " + item.title + ".",
      "Editorial brief: " + item.brief,
      heroRule,
      ...editorialRules,
      "Composition target: " + (item.aspectRatio || "16:9") + ".",
      notes ? "Additional direction: " + notes : ""
    ].filter(Boolean).join(" ");
  };

  async function api(path, init = {}) {
    const base = getApiBase();
    if (!base) throw new Error("Не задан адрес Image API. Укажите Cloudflare Worker в панели.");
    const res = await fetch(base + path, {
      ...init,
      headers: {"Content-Type":"application/json", ...(init.headers || {})}
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || data.message || ("HTTP " + res.status));
    return data;
  }

  async function listModels() {
    return api("/api/models", {method:"GET", headers:{}});
  }

  async function generate({item, prompt, model, aspectRatio, referenceDataUrl, referenceUrl, referenceUrls=[]}) {
    return api("/api/generate", {
      method:"POST",
      body: JSON.stringify({
        id:item.id,
        prompt,
        model:model || cfg().defaultImageModel,
        aspect_ratio:aspectRatio || item.aspectRatio || "16:9",
        output_format:"webp",
        quality:"high",
        reference_data_url:referenceDataUrl || undefined,
        reference_url:referenceUrl || undefined,
        reference_urls:referenceUrls.length ? referenceUrls : undefined
      })
    });
  }

  async function apply({item, candidate}) {
    const base = getApiBase();
    if (base && candidate?.candidate_key) {
      const record = await api("/api/apply", {
        method:"POST",
        body:JSON.stringify({id:item.id,candidate_key:candidate.candidate_key,prompt:candidate.prompt,model:candidate.model})
      });
      saveLocalOverride(item.id, record);
      return record;
    }
    const record = {id:item.id,url:candidate.url,prompt:candidate.prompt,model:candidate.model,local_only:true,updated_at:new Date().toISOString()};
    saveLocalOverride(item.id, record);
    return record;
  }

  async function loadPublished() {
    const base = getApiBase();
    if (!base) return {};
    try {
      const data = await api("/api/content", {method:"GET", headers:{}});
      return data.images || {};
    } catch {
      return {};
    }
  }

  window.CSUMImageAPI = {getApiBase,setApiBase,buildPrompt,listModels,generate,apply,loadPublished,loadLocalOverrides,saveLocalOverride};
})();
