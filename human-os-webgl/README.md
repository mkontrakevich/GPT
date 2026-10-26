# HUMAN OS — WebGL Living World (mobile preview)
Production preview: https://human-os-living-world.kontrakevich.workers.dev/

## Status
Cloudflare Worker published directly from this GitHub source on 2026-10-26. Browser Rendering mobile emulation (390×844) showed WebGL ACTIVE and all six navigation buttons. Actual iPhone Safari verification is still required.

## Modules
Health → Health Game Console (synthetic data only)
Relationships / Memory → HROS existing GitHub Pages (local browser data)
Projects, Work, Personal → UI preview, marked Coming Soon.

## Code deployment
This folder is canonical source for WebGL preview. Current live Worker is an embedded static HTML asset pinned to a snapshot, **not automatically re-deployed by GitHub pushes**.
Manual GitHub workflow `.github/workflows/human-os-webgl.yml` can deploy exactly these assets with Wrangler after storing CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID as repository secrets. No token is stored in code. Do not use real private records in this public demo.

## Data
This 3D world is a navigation UI and does not read or synchronize HROS or Apple Health records. HROS data on GitHub Pages and local Health Console records remain separately held in each browser and are **not synced across devices**. Real synchronization requires identity, access policies, and encrypted storage. Do not claim otherwise.
