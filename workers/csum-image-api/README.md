# CSUM Image API

Безопасный backend встроенного **CSUM Image Studio**.

## Контур
Browser editor → Cloudflare Worker → OpenRouter Image API → candidate preview → R2 → active image manifest → public site.

## Endpoints
- `POST /api/generate` — генерация через OpenRouter `POST /api/v1/images`;
- `POST /api/apply` — публикация выбранного candidate;
- `GET /api/content` — активные изображения сайта;
- `GET /generated/*` — generated assets из R2;
- `GET /api/models` — актуальный каталог OpenRouter image models;
- `GET /health` — диагностика.

## Безопасность
- `OPENROUTER_API_KEY` хранится только в Worker secret.
- Генерация и публикация требуют `ADMIN_TOKEN`.
- Ни один секрет не попадает в GitHub Pages, localStorage или HTML.
- В браузере хранится только публичный URL Worker; admin token хранится в sessionStorage редактора.

## Storage
Один R2 bucket `csum-nn-images` хранит и candidate-файлы, и `_content/active-images.json`. Отдельная база не нужна.

## Deploy
```bash
wrangler r2 bucket create csum-nn-images
wrangler secret put OPENROUTER_API_KEY
wrangler secret put ADMIN_TOKEN
wrangler deploy
```

После deploy откройте `/admin.html`, укажите публичный URL Worker и admin token. После проверки этот же Worker URL можно зафиксировать в `config.js`, чтобы все посетители автоматически получали опубликованные изображения.
