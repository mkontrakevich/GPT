# ЦУМ Нижний Новгород — repository instructions

For any frontend/layout task in this repository, read and follow:

`skills/web-layout/SKILL.md`

For any content/editorial task in this repository, read and follow:

`skills/csum-editorial-writer/SKILL.md`

Core constraints:
- no question-form headlines;
- write full useful magazine articles, not ad cards;
- native tenant/product integration appears only after useful editorial content;
- verify tenant/product/event claims against current csum.ru or official tenant sources;
- never invent stock, price, discount or product availability;
- preserve the existing v2 visual composition unless the task explicitly asks to redesign it.
- editorial imagery is automatic OpenRouter-generated media from article text; never add stock/hotlink article photos manually;
- keep OpenRouter credentials server/CI-side only; never expose API keys in browser code;
- use `assets/brand/csum-logo.svg` for the CSUM header brand asset;


## v4 image workflow
For all new editorial imagery use the built-in `admin.html` / CSUM Image Studio and the Cloudflare Worker under `workers/csum-image-api/`. Do not introduce third-party image hotlinks as the preferred production source. The OpenRouter key must never appear in browser code or commits. Every new article must receive a matching entry in `content/visuals.json`.
