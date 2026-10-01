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

## AI image generation contract — v4

All new editorial visuals are created from the website's built-in **CSUM Image Studio** (`admin.html`) through OpenRouter. The public browser never receives the OpenRouter API key.

### Workflow
1. Select a page section or article in Image Studio.
2. The editor builds a prompt from the editorial brief in `content/visuals.json`.
3. The editor may revise the prompt manually.
4. For identity-sensitive scenes, especially the main facade hero, attach the current visual or an uploaded image as a reference.
5. Generate through the OpenRouter Image API.
6. Review the candidate before publication.
7. Apply the approved candidate. With R2 + KV bindings the Worker publishes it for all visitors; without those bindings it remains a local editor preview.

### Security
- Browser → Cloudflare Worker → OpenRouter.
- `OPENROUTER_API_KEY` exists only as a Worker secret.
- Generation and publication require `ADMIN_TOKEN`.
- Never place API keys in `config.js`, HTML, localStorage, query strings or the repository.
- `config.js` stores only the public Worker endpoint.

### Visual policy
- photography/editorial scene, not illustration unless specifically requested;
- no text, labels, UI, webpage mockups, collages, watermarks or fake logos inside an image;
- no marketplace-style packshot as the main editorial image;
- scene must visualize the article's meaning, not simply display a product;
- the exterior facade of ЦУМ is reserved for the main hero;
- article and section imagery should normally avoid the facade;
- when the real ЦУМ architecture is used, prefer a real reference image and preserve identity and geometry rather than inventing a new building;
- 16:9 is the primary site ratio; change it only when the page component requires another format.

### Editorial + commerce connection
The article creates interest first. The image reinforces that story. Tenant/product links appear only after the reader understands the practical need. Never generate an image whose sole meaning is “buy this product”.

### Required fields for every new article
When the skill creates a new article it must also add an entry to `content/visuals.json` containing:
- stable `id`;
- `type: "article"`;
- article title;
- aspect ratio;
- concise visual brief;
- non-generated fallback image only as a temporary resilience layer.

The generated candidate becomes the preferred visual through the Image API content manifest rather than by baking text or commerce into the image.
