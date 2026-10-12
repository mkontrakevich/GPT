# projects.kontrakevich.com — Cloudflare Pages

## Source
Repository: mkontrakevich/GPT
Branch: main

## Build settings
Build command:
```
bash build-projects.sh
```

Build output directory:
```
dist
```

Root directory: leave empty / repository root.

## Custom domain
Attach:
```
projects.kontrakevich.com
```

The published routes are:
- `/` — project catalog
- `/personal-sign/` — Personal Sign

## Adding future projects
Keep project source in its own top-level repository folder and add only its deployable files to `build-projects.sh`.
Add one card to `project-hub/index.html`.

This keeps project sources independent while one Pages deployment publishes the curated public catalog.
