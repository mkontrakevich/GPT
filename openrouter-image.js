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
    "photorealistic editorial photography",
    "premium city magazine visual language",
    "natural human behavior and believable materials",
    "clean composition with room for HTML typography outside the image",
    "no words, no captions, no poster, no interface, no website mockup, no collage, no watermark, no logos",
    "not an advertising banner, not a marketplace product card, not a stock-photo cliché",
    "realistic light, restrained color grading, documentary credibility"
  ];

  const buildPrompt = (item, notes = "") => {
    const heroRule = item.type === "hero"
      ? "Preserve the identity, proportions, facade rhythm, openings and entrance geometry of the supplied reference architecture. Do not redesign the building."
      : "The image must be a self-contained photographic scene, not an image of the CSUM facade unless the story truly requires it.";
    return [
      "Create a high-end editorial photograph for the digital magazine of CSUM Nizhny Novgorod.",
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

  async function generate({item, prompt, model, aspectRatio, referenceDataUrl, referenceUrl}) {
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
        reference_url:referenceUrl || undefined
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
