# CSUM Image API

Безопасный backend для встроенного Image Studio.

## Что делает
- `POST /api/generate` — генерирует изображение через OpenRouter `POST /api/v1/images`;
- `POST /api/apply` — публикует выбранный candidate;
- `GET /api/content` — отдаёт активные изображения сайту;
- `GET /generated/*` — отдаёт изображения из R2;
- `GET /api/models` — проксирует актуальный каталог image-моделей OpenRouter;
- `GET /health` — диагностика.

## Безопасность
`OPENROUTER_API_KEY` хранится только как secret Worker. Генерация и публикация требуют `ADMIN_TOKEN` в заголовке `X-CSUM-Admin-Token`. Ключ OpenRouter не попадает в браузер и GitHub.

## Минимальный preview-режим
Worker работает и без R2/KV: изображение вернётся как data URL, а Image Studio сможет применить его локально в браузере редактора.

## Production-публикация
Создайте:
```bash
wrangler r2 bucket create csum-nn-images
wrangler kv namespace create CSUM_CONTENT
```
Добавьте в `wrangler.toml` реальные bindings:
```toml
[[r2_buckets]]
binding = "CSUM_IMAGES"
bucket_name = "csum-nn-images"

[[kv_namespaces]]
binding = "CSUM_CONTENT"
id = "REAL_KV_NAMESPACE_ID"
```

Затем:
```bash
wrangler secret put OPENROUTER_API_KEY
wrangler secret put ADMIN_TOKEN
wrangler deploy
```

После deploy вставьте URL Worker в `admin.html`. Для общего сайта зафиксируйте тот же URL в `config.js`.
