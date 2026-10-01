# CSUM Editorial Writer Skill

## Purpose
Create useful magazine-style articles for the website of the Central Department Store (ЦУМ) in Nizhny Novgorod. The article must be interesting and useful even if the reader never buys anything. Commerce appears only as a natural continuation of an already formed need.

## Brand role
ЦУМ is a significant city place at the main arrival node of Nizhny Novgorod. It connects the railway station, local residents, office workers, families, cultural events, shopping, food and city routes. The website behaves like an intelligent city magazine, not a banner catalogue.

## Editorial voice
- intelligent, calm, urban, observant;
- concrete rather than promotional;
- premium through precision, not through luxury vocabulary;
- locally rooted without folklore kitsch;
- useful before commercial;
- readable as a city/lifestyle magazine.

## Headlines
Headlines are statements, themes or observations.

Do NOT use question headlines or headline constructions beginning with:
- «Почему»
- «Как»
- «Что»
- «Зачем»
- «Где»
- «Когда»
- «Куда»

Preferred headline patterns:
- «Свет, ткань и цвет: один оттенок в разное время суток»
- «Запас энергии как часть дорожной инфраструктуры»
- «Сувенир как память о месте, а не надпись на предмете»
- «Смена впечатлений как основа семейного маршрута»

## Article structure
1. **Headline** — statement, no question mark.
2. **Deck** — 1–2 sentences explaining the value of the article.
3. **Editorial opening** — human observation, fact, history, cultural context or useful scenario.
4. **Main body** — 3–5 sections, each advancing the subject. No store pitch.
5. **Practical conclusion** — give the reader a concrete way to use the information.
6. **Native integration** — only in the final 20–30% of the article, or at a naturally relevant moment.
7. **CTA** — one clear next step: open a store card, category, map, event or route.

## Native commerce rules
- Product/store mentions must not exceed ~15% of the article.
- The article must still work if all commercial links are removed.
- First create the need through information; only then show where to solve it in ЦУМ.
- Prefer one to three relevant tenants rather than a list of logos.
- Never write “buy now”, “best price”, “unique offer”, “hurry”, or similar direct-response copy.
- Do not invent availability, price, stock, discounts or product models.
- If exact product availability is unknown, link to the tenant or category instead of inventing a SKU.
- When a specific tenant/product is mentioned, verify it on the current csum.ru site or official tenant source.

## Preferred editorial formats
- city route;
- cultural preview;
- material/design explainer;
- travel checklist with context;
- family scenario;
- workday/lifestyle essay;
- history of an object or habit;
- practical review without ratings;
- seasonal guide;
- local craft or gastronomy story.

## Audience lenses
### Visitors / travelers
Focus on limited time, arrival/departure, useful city knowledge, gifts, charging, food, orientation.

### Cultural audience
Focus on the city event itself, atmosphere, timing, route, meeting point, preparation.

### Families
Focus on rhythm: curiosity → movement → rest → food. Avoid generic “family fun” language.

### Office workers
Focus on time, useful errands, lunch, short reset, meetings, after-work route.

### Local residents
Focus on everyday convenience, seasonality, physical comparison, familiar place with renewed value.

## Visual brief for article images
- independent photographic/editorial scene, never a screenshot or designed web page;
- orthogonal or visually controlled perspective when architecture/interiors appear;
- preserve identity of the real ЦУМ building when it appears;
- no text embedded in images;
- no fake logos, no invented tenant signage;
- editorial quality, natural human scale, restrained styling;
- use 16:10 / 1.6:1 as primary article cover ratio.

## Quality checklist
Before publishing, verify:
- headline is not a question;
- article has a useful thesis unrelated to sale;
- no invented facts about tenant stock/prices;
- native integration appears late and logically;
- links point to live csum.ru tenant/category/event pages;
- at least one concrete practical takeaway exists;
- no generic mall copy (“уютная атмосфера”, “широкий ассортимент”, “для всей семьи”) unless factually necessary;
- paragraphs are concise and journalistic;
- commercial CTA is one step, not a banner stack.

## AI image generation contract
Every editorial cover image is generated automatically through OpenRouter from the article itself.

### Source of visual meaning
- Every article MUST contain a meaningful `<meta name="description">`; this is the primary visual description.
- The generator combines the article `<h1>`, meta description and the first substantive paragraphs.
- Do not hand-pick an unrelated stock image after writing the article.
- The text must be sufficient to produce one clear photographic scene.

### Generation pipeline
- Generator: `tools/generate_csum_images.py`.
- OpenRouter Image API is called only in GitHub Actions; never from public browser JavaScript.
- API credential: GitHub Actions secret `OPENROUTER_API_KEY`.
- Model is configurable with repository variable `OPENROUTER_IMAGE_MODEL`; default is `bytedance-seed/seedream-4.5`.
- Generated files are committed to `assets/generated/`.
- The generator stores a prompt/source hash in `assets/generated/manifest.json` and regenerates only when the article text, model or visual policy changes.
- Production HTML must reference local generated files only. Third-party editorial image hotlinks are prohibited.
- If generation fails, do not replace the image with a random external photo and do not publish a broken image.

### Visual rules for generated article images
- premium editorial photography, realistic rather than illustrative;
- horizontal cover composition; current pipeline requests 16:9;
- no text, typography, labels, UI, webpage mockups, collages or watermarks inside the image;
- no fake tenant logos or invented signage;
- scene derives from the editorial thesis, not from a literal product packshot;
- restrained contemporary styling and believable human scale;
- the exterior facade of ЦУМ is prohibited in article covers.

### Hero exception
- Only the site hero may show the ЦУМ facade.
- Hero generation uses a real facade reference at generation time when the selected OpenRouter image model supports `input_references`.
- Preserve building identity, proportions, window rhythm, central entrance, cornice, verticals and architecture.
- Do not redesign, add floors or invent signage.
- The reference is generation input, not the production hero image; production displays the generated result.

### Publishing rule
Article text change → OpenRouter generation → local generated asset → HTML rewiring → validation that no remote editorial image sources remain → GitHub Pages deploy.


## Automated image generation
All editorial imagery for the production site is generated through OpenRouter. Do not hotlink article images from external websites and do not use stock photography as a production dependency.

Pipeline:
1. The article HTML is the source of truth.
2. The generator reads the article headline, meta description and opening paragraphs.
3. It converts that text into an editorial visual brief automatically.
4. It calls OpenRouter's dedicated `POST /api/v1/images` endpoint.
5. The returned image bytes are converted to local WebP assets under `assets/generated/`.
6. The generated assets are committed and the site is redeployed.

Rules:
- default model: `openai/gpt-image-2`, overridable through repository variable `OPENROUTER_IMAGE_MODEL`;
- API key exists only as GitHub Actions secret `OPENROUTER_API_KEY`; never expose it in browser JavaScript;
- high quality and 16:9 are requested when supported by the selected model;
- no text, typography, UI, banners, watermarks or fake tenant logos inside generated images;
- article imagery visualizes the editorial meaning, not a direct product advertisement;
- the ЦУМ facade is allowed only for the main hero; hero generation uses the official facade image as a reference when the selected model supports `input_references`;
- all other generated images must avoid the facade;
- if article text changes, its source hash changes and the corresponding image is regenerated automatically.
