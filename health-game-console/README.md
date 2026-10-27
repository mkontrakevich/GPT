# HEALTH GAME CONSOLE — MVP Preview
Status: synthetic public preview; **not** a medical device and not a production personal-health repository.

## Architecture
GitHub branch `feat/health-game-console-mvp` in `mkontrakevich/GPT` holds a self-contained preview at `health-game-console/preview.html`; Cloudflare Worker `health-game-console-mvp` proxies the file from an immutable commit SHA. The Worker has no user identity provider and is **public**, therefore it must only host synthetic data and local-only user imports.

## Features
- Seven health modules: overview, vitals, recovery, mobility, activity, body, mind.
- Three.js WebGL figure with orbiting systems; 2D fallback when CDN/WebGL unavailable.
- Demo data explicitly labeled; 3-, 7-, and 30-day metrics and trend chart.
- Local JSON import/export of manually prepared values and localStorage check-in for energy, mood, knee discomfort.
- Missions are voluntary and have no medical score or punishment.
- Source and date shown on each metric. No direct Zepp / Apple Health integration, no automatic medical advice.

## Local full-source prototype
The ChatGPT-delivered ZIP contains a larger modular MVP with pure data core, 7 unit tests, full CSS, and browser QA artifacts. That ZIP is separate from this public preview. Moving its complete source into a **dedicated private repo** is a prerequisite for production deployment.

## Safety & acceptance gates
1. Public preview never includes real user medical records or measurement fixtures.
2. Web UI, mobile, module navigation, import/export, check-in work.
3. WebGL rendering verified on a browser with access to jsDelivr (offline environment only verified 2D fallback).
4. Private GitHub repository, separate CI and Cloudflare Access required for actual health-data use.
5. Automated Apple Health / Zepp sync requires a separate authorized data bridge; ChatGPT Health data is not exposed as a website API.

### Scope and progress
A synthetic public preview can be considered feature-complete when the website is reachable, but the overall personal-health product is **not production-ready** until items 3-5 are fulfilled.