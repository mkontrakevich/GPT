(() => {
  const articleSlug = () => {
    const m = location.pathname.match(/\/articles\/([^/]+)\.html$/);
    return m ? m[1] : null;
  };

  function keyFromAiPath(value = "") {
    const name = value.split("/").pop()?.replace(/\.(webp|png|jpg|jpeg)$/i, "") || "";
    if (name === "hero-csum") return "hero-csum";
    if (name === "dva-chasa-do-poezda") return "guide";
    if (name === "vecher-v-gorode") return "culture";
    if (name === "suvenir-kak-pamyat") return "gifts";
    if (name === "semeinyi-marshrut") return "family";
    if (name.includes("office") || name.includes("pereryv")) return "office";
    if (name.includes("locals") || name.includes("univermag")) return "locals";
    return name;
  }

  function markImages(catalog) {
    const map = Object.fromEntries((catalog.items || []).map(x => [x.id, x]));
    document.querySelectorAll("img[data-ai-src]").forEach(img => {
      const key = keyFromAiPath(img.dataset.aiSrc);
      if (map[key]) img.dataset.aiKey = key;
    });

    document.querySelectorAll(".mag-card").forEach(card => {
      const href = card.getAttribute("href") || "";
      const m = href.match(/articles\/([^/]+)\.html/);
      const img = card.querySelector("img");
      if (m && img) img.dataset.aiKey = "article-" + m[1];
    });

    const slug = articleSlug();
    if (slug) {
      const img = document.querySelector(".cover img");
      if (img) img.dataset.aiKey = "article-" + slug;
    }

    document.querySelectorAll("img[data-ai-key]").forEach(img => {
      const item = map[img.dataset.aiKey];
      if (item?.defaultSrc && (!img.src || img.src.includes("/https://") || img.naturalWidth === 0)) {
        img.src = item.defaultSrc;
      }
    });
    return map;
  }

  function applyRecord(id, record) {
    if (!record?.url) return;
    document.querySelectorAll('img[data-ai-key="' + CSS.escape(id) + '"]').forEach(img => {
      img.removeAttribute("srcset");
      img.src = record.url;
      img.classList.add("ai-image-ready");
    });
  }

  async function boot() {
    let catalog = {items:[]};
    try {
      const base = location.pathname.includes("/articles/") ? "../" : "";
      catalog = await fetch(base + "content/visuals.json", {cache:"no-store"}).then(r => r.json());
    } catch {}
    markImages(catalog);

    const local = window.CSUMImageAPI?.loadLocalOverrides?.() || {};
    Object.entries(local).forEach(([id, record]) => applyRecord(id, record));

    const published = await window.CSUMImageAPI?.loadPublished?.() || {};
    Object.entries(published).forEach(([id, record]) => applyRecord(id, record));

    try {
      const cms = await fetch((window.CSUM_CONFIG?.imageApiBase || "") + "/api/editor/published", {cache:"no-store"}).then(r => r.ok ? r.json() : ({patches:[]}));
      (cms.layout || []).forEach(op => { try { const el=document.querySelector(op.selector), parent=document.querySelector(op.parent), before=op.before?document.querySelector(op.before):null; if(el&&parent&&el.parentElement===parent) parent.insertBefore(el,before&&before.parentElement===parent?before:null); } catch {} });
      (cms.patches || []).forEach(p => { try { const el=document.querySelector(p.selector); if(el && typeof p.text === "string") el.textContent=p.text; } catch {} });
    } catch {}
  }

  addEventListener("DOMContentLoaded", boot, {once:true});
})();
