#!/usr/bin/env python3
from __future__ import annotations
import base64, hashlib, html as html_lib, io, json, os, re, sys, time
import urllib.request, urllib.error
from datetime import datetime, timezone
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
ARTICLES_DIR = ROOT / "articles"
OUT_DIR = ROOT / "assets" / "generated"
MANIFEST_PATH = OUT_DIR / "manifest.json"
API_BASE = "https://openrouter.ai/api/v1"
API_KEY = os.environ.get("OPENROUTER_API_KEY", "").strip()
MODEL = os.environ.get("OPENROUTER_IMAGE_MODEL", "bytedance-seed/seedream-4.5").strip()
FORCE = os.environ.get("FORCE_REGENERATE", "0").lower() in {"1","true","yes"}
HERO_REFERENCE_URL = os.environ.get("CSUM_HERO_REFERENCE_URL","https://www.csum.ru/upload/content/max_685126cd7bccf.jpg").strip()

ARTICLE_FILES = [
"dorozhnaya-avtonomnost.html",
"dva-chasa-do-poezda.html",
"pereryv-kotoryi-vozvrashchaet-vnimanie.html",
"semeinyi-marshrut.html",
"suvenir-kak-pamyat.html",
"svet-tkan-i-cvet.html",
"univermag-v-povsednevnom-marshrute.html",
"vecher-v-gorode.html",
"vechernii-obraz-v-dvizhenii.html",
]

VISUAL_POLICY = """
Create a premium editorial photograph for the digital magazine of the Central
Department Store (ЦУМ) in Nizhny Novgorod. Horizontal 16:9 composition.
Photorealistic, restrained, contemporary, believable human scale, natural light,
strong photographic composition and useful negative space. This is a photograph,
not a webpage, poster, collage, banner, advertising mockup or UI screen.
No text, no letters, no typography, no captions, no watermarks, no fake logos,
no invented tenant signage. Do not show the ЦУМ exterior/facade unless the prompt
explicitly says this is the hero image. Avoid generic stock-photo aesthetics.
The scene must visualize the editorial meaning of the article rather than simply
displaying a product.
""".strip()

HERO_PROMPT = f"""
{VISUAL_POLICY}

HERO IMAGE EXCEPTION: show the real ЦУМ Нижний Новгород building as the subject.
Use the supplied reference image to preserve the building identity, proportions,
window rhythm, central entrance, cornice, architectural details and geometry.
Create a frontal, orthogonal architectural editorial photograph with corrected
verticals, calm premium daylight and a lively but uncluttered city foreground.
No redesign of the building, no extra floors, no invented signs, no text inside
the image. The result should feel like the cover photograph of a serious city
magazine. The site proposition is: “Добро пожаловать в ЦУМ — путешествие
начинается здесь”.
""".strip()

def request_json(url, *, method="GET", payload=None, timeout=180):
    headers={"Authorization":f"Bearer {API_KEY}","Content-Type":"application/json",
             "HTTP-Referer":"https://mkontrakevich.github.io/GPT/",
             "X-Title":"CSUM Nizhny Novgorod Editorial",
             "User-Agent":"CSUM-Editorial-Image-Generator/1.0"}
    data=None if payload is None else json.dumps(payload).encode("utf-8")
    req=urllib.request.Request(url,data=data,headers=headers,method=method)
    try:
        with urllib.request.urlopen(req,timeout=timeout) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        body=exc.read().decode("utf-8","replace")
        raise RuntimeError(f"OpenRouter HTTP {exc.code}: {body[:4000]}") from exc

def model_metadata():
    data=request_json(f"{API_BASE}/images/models",timeout=60)
    models=data.get("data", data if isinstance(data,list) else [])
    for item in models:
        if item.get("id")==MODEL: return item
    raise RuntimeError(f"OPENROUTER_IMAGE_MODEL={MODEL!r} is not available in /images/models")

def parameter_supported(meta,name):
    params=meta.get("supported_parameters") or {}
    return name in params if isinstance(params,(dict,list)) else False

def parameter_values(meta,name):
    params=meta.get("supported_parameters") or {}
    if isinstance(params,dict):
        spec=params.get(name) or {}
        if isinstance(spec,dict): return [str(x) for x in (spec.get("values") or [])]
    return []

def strip_tags(s):
    s=re.sub(r"<script\b[^>]*>.*?</script>"," ",s,flags=re.I|re.S)
    s=re.sub(r"<style\b[^>]*>.*?</style>"," ",s,flags=re.I|re.S)
    s=re.sub(r"<[^>]+>"," ",s)
    return re.sub(r"\s+"," ",html_lib.unescape(s)).strip()

def extract_article(path):
    text=path.read_text(encoding="utf-8")
    h1=re.search(r"<h1\b[^>]*>(.*?)</h1>",text,flags=re.I|re.S)
    desc=re.search(r'<meta\s+name=["\']description["\']\s+content=["\']([^"\']+)["\']',text,flags=re.I|re.S)
    paras=[strip_tags(x) for x in re.findall(r"<p\b[^>]*>(.*?)</p>",text,flags=re.I|re.S)]
    paras=[x for x in paras if len(x)>=60][:3]
    if not h1 or not desc: raise RuntimeError(f"{path}: h1/meta description required")
    return {"slug":path.stem,"path":path,"title":strip_tags(h1.group(1)),
            "description":html_lib.unescape(desc.group(1)).strip(),"context":" ".join(paras)}

def article_prompt(a):
    return f"""
{VISUAL_POLICY}

ARTICLE TITLE:
{a["title"]}

ARTICLE DESCRIPTION — this is the primary visual brief:
{a["description"]}

EDITORIAL CONTEXT:
{a["context"][:1800]}

Translate the text into one specific, believable editorial photographic scene.
Do not illustrate every sentence literally. Choose the strongest visual metaphor
or real-life situation. Do not show the exterior of ЦУМ. Products, if present,
must be part of everyday life rather than a packshot or direct advertisement.
""".strip()

def source_hash(prompt,reference_url=None):
    raw=json.dumps({"model":MODEL,"prompt":prompt,"reference":reference_url or "","pipeline":3},
                   ensure_ascii=False,sort_keys=True).encode()
    return hashlib.sha256(raw).hexdigest()

def fetch_reference_data_url(url):
    req=urllib.request.Request(url,headers={"User-Agent":"Mozilla/5.0"})
    with urllib.request.urlopen(req,timeout=60) as resp:
        raw=resp.read(); ctype=resp.headers.get_content_type() or "image/jpeg"
    return f"data:{ctype};base64,{base64.b64encode(raw).decode('ascii')}"

def save_webp(raw,output):
    with Image.open(io.BytesIO(raw)) as im:
        if im.mode not in {"RGB","RGBA"}: im=im.convert("RGB")
        if im.mode=="RGBA":
            bg=Image.new("RGB",im.size,"white"); bg.paste(im,mask=im.getchannel("A")); im=bg
        output.parent.mkdir(parents=True,exist_ok=True)
        im.save(output,"WEBP",quality=92,method=6)

def generate(prompt,output,meta,reference_url=None):
    payload={"model":MODEL,"prompt":prompt}
    ratios=parameter_values(meta,"aspect_ratio")
    if parameter_supported(meta,"aspect_ratio") and (not ratios or "16:9" in ratios):
        payload["aspect_ratio"]="16:9"
    resolutions=parameter_values(meta,"resolution")
    if parameter_supported(meta,"resolution"):
        for candidate in ("2K","1K"):
            if not resolutions or candidate in resolutions:
                payload["resolution"]=candidate; break
    if reference_url:
        if parameter_supported(meta,"input_references"):
            payload["input_references"]=[{"type":"image_url","image_url":{"url":fetch_reference_data_url(reference_url)}}]
        else:
            print(f"WARNING: {MODEL} does not advertise input_references; hero has no reference",file=sys.stderr)
    response=request_json(f"{API_BASE}/images",method="POST",payload=payload,timeout=360)
    data=response.get("data") or []
    if not data or not data[0].get("b64_json"):
        raise RuntimeError("No image bytes in OpenRouter response: "+json.dumps(response)[:3000])
    save_webp(base64.b64decode(data[0]["b64_json"]),output)
    usage=response.get("usage") or {}
    return {"media_type_received":data[0].get("media_type"),"cost_usd":usage.get("cost"),
            "bytes_webp":output.stat().st_size}

def load_manifest():
    if not MANIFEST_PATH.exists(): return {"version":1,"items":{}}
    try:
        data=json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
        data.setdefault("items",{})
        return data
    except Exception:
        return {"version":1,"items":{}}

def replace_first_img_in_section(text,section_id,src):
    pattern=re.compile(rf'(<section\b[^>]*\bid=["\']{re.escape(section_id)}["\'][^>]*>.*?<img\b[^>]*\bsrc=["\'])[^"\']+(["\'])',re.I|re.S)
    return pattern.sub(lambda m:m.group(1)+src+m.group(2),text,count=1)

def update_html_references(article_assets):
    for slug,rel in article_assets.items():
        path=ARTICLES_DIR/f"{slug}.html"; text=path.read_text(encoding="utf-8")
        text=re.sub(r'(<div\s+class=["\']cover["\'][^>]*>\s*<img\b[^>]*\bsrc=["\'])[^"\']+(["\'])',
                    lambda m:m.group(1)+"../"+rel+m.group(2),text,count=1,flags=re.I|re.S)
        text=re.sub(r'\s+srcset=["\'][^"\']*["\']',"",text,flags=re.I)
        path.write_text(text,encoding="utf-8")
    mag_path=ROOT/"magazine.html"; mag=mag_path.read_text(encoding="utf-8")
    for slug,rel in article_assets.items():
        pat=re.compile(rf'(<a\b[^>]*class=["\'][^"\']*\bmag-card\b[^"\']*["\'][^>]*href=["\']articles/{re.escape(slug)}\.html["\'][^>]*>\s*<img\b[^>]*\bsrc=["\'])[^"\']+(["\'])',re.I|re.S)
        mag=pat.sub(lambda m:m.group(1)+rel+m.group(2),mag,count=1)
    mag_path.write_text(mag,encoding="utf-8")
    p=ROOT/"index.html"; index=p.read_text(encoding="utf-8")
    index=replace_first_img_in_section(index,"hero","assets/generated/hero-csum.webp")
    index=re.sub(r'(<article\b[^>]*class=["\'][^"\']*\bmagazine-lead\b[^"\']*["\'][^>]*>.*?<img\b[^>]*\bsrc=["\'])[^"\']+(["\'])',
                 lambda m:m.group(1)+"assets/generated/dva-chasa-do-poezda.webp"+m.group(2),index,count=1,flags=re.I|re.S)
    for sid,slug in {"culture":"vecher-v-gorode","guide":"dva-chasa-do-poezda","gifts":"suvenir-kak-pamyat",
                     "family":"semeinyi-marshrut","office":"pereryv-kotoryi-vozvrashchaet-vnimanie",
                     "locals":"univermag-v-povsednevnom-marshrute"}.items():
        index=replace_first_img_in_section(index,sid,f"assets/generated/{slug}.webp")
    index=re.sub(r'(<section\b[^>]*class=["\'][^"\']*\bfinal-story\b[^"\']*["\'][^>]*>.*?<img\b[^>]*\bsrc=["\'])[^"\']+(["\'])',
                 lambda m:m.group(1)+"assets/generated/dva-chasa-do-poezda.webp"+m.group(2),index,count=1,flags=re.I|re.S)
    index=re.sub(r'\s+data-fallback=["\'][^"\']*["\']',"",index,flags=re.I)
    index=re.sub(r'\s+srcset=["\'][^"\']*["\']',"",index,flags=re.I)
    p.write_text(index,encoding="utf-8")

def validate_no_remote_editorial_images():
    targets=[ROOT/"index.html",ROOT/"magazine.html"]+[ARTICLES_DIR/name for name in ARTICLE_FILES]
    bad=[]
    for path in targets:
        text=path.read_text(encoding="utf-8")
        for m in re.finditer(r'<img\b[^>]*\bsrc=["\']([^"\']+)["\']',text,flags=re.I):
            src=m.group(1)
            if src.startswith(("http://","https://")) or "../http" in src: bad.append((str(path.relative_to(ROOT)),src))
    if bad: raise RuntimeError("Remote editorial image sources remain: "+json.dumps(bad,ensure_ascii=False))

def main():
    if not API_KEY:
        raise RuntimeError("OPENROUTER_API_KEY is missing. Add it as a GitHub Actions repository secret; never place it in browser JavaScript.")
    OUT_DIR.mkdir(parents=True,exist_ok=True)
    manifest=load_manifest(); meta=model_metadata(); items=manifest.setdefault("items",{})
    articles=[extract_article(ARTICLES_DIR/name) for name in ARTICLE_FILES]
    jobs=[("hero-csum",HERO_PROMPT,HERO_REFERENCE_URL)]+[(a["slug"],article_prompt(a),None) for a in articles]
    assets={}
    for slug,prompt,reference in jobs:
        output=OUT_DIR/f"{slug}.webp"; digest=source_hash(prompt,reference); prev=items.get(slug) or {}
        if not FORCE and prev.get("source_hash")==digest and output.exists() and output.stat().st_size>10000:
            print("SKIP",slug)
        else:
            print("GENERATE",slug,"via",MODEL)
            result=generate(prompt,output,meta,reference)
            items[slug]={"source_hash":digest,"model":MODEL,"prompt":prompt,"reference_url":reference,
                         "generated_at":datetime.now(timezone.utc).isoformat(),**result}
            print("DONE",slug,result); time.sleep(1)
        if slug!="hero-csum": assets[slug]=f"assets/generated/{slug}.webp"
    manifest["version"]=1; manifest["model"]=MODEL
    MANIFEST_PATH.write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    update_html_references(assets); validate_no_remote_editorial_images()
    print("All CSUM editorial images are local generated assets.")

if __name__=="__main__":
    main()
