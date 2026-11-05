# HUMAN OS — Character DNA v1.0
**PROJECT DNA ID:** `PERSONAL-OS/HUMAN-OS/CHARACTER-SYSTEM`  
**Status:** SPECIFICATION APPROVED FOR EXECUTION — visual quality NOT approved; prototype is a blockout.  
**Effective:** 2026-11-05  
**Owner contour:** PERSONAL OS (never MARINS OS).  
**Owner:** user; implementation partner: ChatGPT / GitHub + Cloudflare.  
**Source:** `mkontrakevich/GPT`, branch `feat/human-os-character-painterly-webgl`, draft PR #22, Issue #21.  
**Preview:** https://human-os-character-lab.kontrakevich.workers.dev/  
**Approved world:** https://human-os-living-world.kontrakevich.workers.dev/ — frozen as a protected release; no changes while Character System is built.

## Executive decision: CHARACTER FIRST
Character is the stable visual and behavioral identity of HUMAN OS. Camera, outfit, gestures, pose, expressions and content follow the character; themed islands and environments are **adapters**, not separate bespoke characters. Keep the existing six-island Living World on a protected, rollback-ready baseline. Do not merge unfinished avatar into it.

**Order of work:** face/anatomy → hairstyle/silhouette → outfit/materials → game-ready mesh/rig → motion → outfit variants → scene adapters → QA and release.

## Character DNA 01 — FACE / ANATOMY
**Reference:** the user-approved 2D original futuristic heroine and its painterly interpretation. Reference is an **art-direction target**, not proof that the current WebGL model matches it. Do not claim resemblance to the user or any real person.
- Adult, expressive heroine; proportional human anatomy, refined cheekbones/jaw/nose, natural eyelids and lips.
- Faces must remain attractive and recognizable in front, left/right 3/4, profile, and rear head views.
- Expressiveness comes from silhouette, properly formed facial volumes, eyebrows, eyelids and painterly materials — **not** bulbous primitive eye meshes, toy-like proportions or floating facial cards.
- Preferred body reading: fashion-illustration-inspired but anatomically credible; approximately 7.5–8 head heights as an art guideline, not a fixed biometric identity.
- Scalable expression rig (blink, look, smile, neutral); eyelids/jaw must not collide or detach at close range.
- The current procedural WebGL blockout FAILS final facial-art acceptance. A finished topology/UV workflow is required.

**Acceptance:** head and body matched against the approved 2D concept in a six-view turntable; no distorted hands/ears/neck/eyes, unnatural intersections or visibly detached parts; user approval recorded.

## Character DNA 02 — HAIR / SILHOUETTE
- Dark chestnut, controlled painterly copper highlights; large stylized sculpted locks/strands, coherent hairline and visible volume at back.
- Hair design readably echoes approved updo/loose curls, but uses game-ready meshes and limited material variants.
- Silhouette priority: face, swept hair, angular jacket collar, long coat tails, leg line and chunky boots.
- Avoid fully strand-simulated photoreal hair, card noise, unstable alpha transparency and overdraw on iPhone.
- Secondary-motion bones for hair clusters and coat tails, deterministic subtle animation when paused/idle.

**Acceptance:** recognizable silhouette at 3–5 m camera distance on 390 px screen; convincing profile/back; no helmet-like mass or mesh clipping.

## Character DNA 03 — COSTUME / MATERIALS
**Neutral base outfit:** tailored ivory/taupe futuristic-casual coat with dramatic asymmetric tails, pale fitted top, high-waisted utility trousers, narrow belt/straps and ivory boots; restrained warm gold edge accents.
- Fabric must communicate weight, weave, seams, thickness and folds. Painted gradients alone cannot replace cloth construction.
- **Hand-painted PBR / painterly-toon hybrid:** authored albedo brushwork, controlled roughness, softened planar shadow treatment and selective rim highlights. No excessive metallic sheen, white clipping or indiscriminate bloom.
- Consistent silhouette and garment attachment points across outfits; coats, belts, boots and hair may vary only within approved identity parameters.
- Neutral costume is the benchmark; each thematic costume is a separately versioned modular asset.
- Original independent visual design; inspiration in painterly serialized animation, without copying protected character/wardrobe artwork.

**Acceptance:** front/back/side and 3/4 views render without intersections; movement includes plausible cloth behavior; baseline fit is approved before variations.

## Character DNA 04 — BEHAVIOR / CAMERA
- Primary view: full-height, legible adult character; user can inspect face, silhouette and wardrobe without HUD overlap.
- Controls: drag/touch to orbit 360°, pinch/wheel zoom, full-body and portrait camera presets, reset camera, pause motion; touch-friendly controls.
- Base animation states: `idle`, `turn`, `walk`. Later: `inspect`, `gesture`, `transition`; use the same rig and reference identity.
- State switches must not reset identity or mesh/material versions unexpectedly. Aim for discreet, cinematic motion; no looping distracting idle dance.
- Character remains central at every resolution; environment is reduced or hidden in Character Lab.

**Acceptance:** orbit/touch/focus operate at iPhone portrait/landscape and desktop; animation transitions without body snapping, foot sliding or cloth penetrations.

## Character DNA 05 — WORLD ADAPTERS (AFTER BASE CHARACTER)
Six existing domains: HEALTH, RELATIONSHIPS, PROJECTS, WORK, PERSONAL, MEMORY.
Each domain supplies **only** `environment_id`, `outfit_variant_id`, `lighting_preset`, `animation_set`, `camera_preset` and approved content access; it does NOT introduce a new identity.
- HEALTH: breathable activewear and recovery space, no diagnosis visuals attached without verified data and user consent.
- RELATIONSHIPS: casual authentic outfit, warm atmospheric space; HROS private context isolated by permission.
- PROJECTS: creativity / studio wear and workspace.
- WORK: architectural/formal modern attire, credible professional setting.
- PERSONAL: relaxed informal clothes and calm home atmosphere.
- MEMORY: subdued reflective palette and archival setting.
The six-island world is held on the current approved quality floor. Use scene adapters to place the character in world sections **only after** the character itself clears its art, rig and performance gates.

## Production asset contract (future deliverables, not yet present)
| Asset / manifest | Expected content | Acceptance |
|---|---|---|
| `source/character_master.blend` | Editable Blender master, clean object hierarchy | Reopens without missing linked assets |
| `export/character_master.glb` | Proper skinned glTF 2.0, calibrated Y-up transforms | glTF validator clean; 360° body, no flat-card substitution |
| `export/character_mobile.glb` | Mobile LOD using shared identity and rig | Actual-device timing and visual check |
| `textures/` | Authored albedo, normal, roughness and accent masks; KTX2 where supported | No invalid alpha/compression artifacts |
| `animations/` | Idle, walk, turn clips with stable bone naming | Animation smoke tests pass |
| `outfits/*.glb` | Rig-compatible thematic clothing | Clip/intersection tests pass |
| `character.manifest.v1.json` | Source provenance, allowed outfits, LOD, animation, asset verification | No unsupported claim of READY |
| `qa/` | Turntable six views, mobile/desktop screenshots, measured FPS and QA record | Human art approval documented |

Initial **engineering budgets to validate on actual device**, not promises: mobile character ≤45k triangles incl. clothing/hair, 1K textures for mobile unless visual QA requires 2K, GPU-compressed texture fallback, image and mesh LOD, 30 FPS target on modern iPhone, not a declared measured result. Optimize visually before optimizing triangle count.

## Explicit quality gates / truthful project progress
- **50→65% | Identity & art:** multi-view reference sheets, adult anatomical head and body, hair silhouette, approved costume study, user visual sign-off. Current procedural model does not fulfill these.
- **65→75% | Asset engineering:** editable model, UVs, game-ready materials, GLB export, proper rig/skin/LODs; zero validator errors.
- **75→85% | Motion:** idle/turn/walk clips and believable hair/coat secondary motion, transition and foot-placement review.
- **85→92% | Variations:** common skeleton + locked identity, at least neutral outfit and two domain outfits, deterministic appearance across scenes.
- **92→100% | Integration capability / release:** clean independent character renderer; neutral stage plus **one** isolated representative environment adapter; desktop and real-iPhone QA, latency/FPS, context-loss fallback, accessibility, CI, Cloudflare staged rollback and explicit aesthetic approval.
- **After Character System 100%:** create and approve **all** thematic environments and fully integrate HROS/Health through separately permissioned data adapters. Reaching Character System 100% is NOT 100% for HUMAN OS overall.

### Mandatory verification rules
1. Never increase progress for writing code or text alone: require screenshots/GLB validator, GitHub test evidence and independent visual sign-off.
2. Keep a real `ready / hold / blocked` field per acceptance gate. Blocked gate keeps the stage incomplete.
3. No real user portraits, HROS diaries or personal health data in public GitHub, demo logs or Cloudflare Worker.
4. Protect the proven six-island v0.4 baseline; preserve backup/rollback and do not merge unfinished actor into the main release.
5. GitHub is source of truth, Cloudflare staging validates the browser implementation, Drive can hold original high-resolution visual reference when user has authorized the project folder.
6. **Artistic floor:** no less than approved painterly concept and existing Living World v0.3–v0.4 quality. No generic low-poly toy substitute.
7. QA/reporting begins with name, goal, stage, task and verified progress. End with done, checked, blockers and next executable action.

### Current verified baseline
- Public character-only demo v0.3.1 exists and is synthetic-only; real WebGL geometry and orbit are active in browser emulation.
- Face was improved with a curved hand-painted texture, but **visual fidelity remains below the approved illustration**.
- GLB master, Blender asset, rig, animation clips, outfits and real-phone verification DO NOT yet exist.
- Separate draft PR #22 and Issue #21; no protected main-world deployment changes.
