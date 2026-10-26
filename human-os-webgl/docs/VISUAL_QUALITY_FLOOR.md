# HUMAN OS — Visual quality floor / v0.3 reference

**Rule:** Every update must keep or improve the approved six-island cinematic v0.3 visual quality. Never introduce a regression in the rendered scene or block interaction with ornamental UI. This rule applies to Human OS visual work and must be tested before deployment.

## Immutable approved reference
- Reference release: `feat/human-os-cinematic-assets` source at commit `2f9d0b1650c2e7cab54d09d1332c71f0050935f6`, before HUD simplification.
- Approved look: floating six-island diorama with six distinct biomes, multi-level rock cliffs, textured facades, glowing bridge network, atmospheric background, teal/rose/gold lighting, central core, cinematic camera.
- The v0.4 improvement **only changes the HUD**, not the geometry, materials, lighting or camera baseline.
- Preview URLs: cinematic staging `https://human-os-cinematic-v3.kontrakevich.workers.dev/`; stable production demo `https://human-os-living-world.kontrakevich.workers.dev/` remains independent until promotion.
- This is an **art-direction/QA baseline**, not a promise of photorealistic asset quality and not a protected personal-data deployment.

## Always-on review contract
1. **World first.** The 3D scene occupies the screen; large copy, onboarding headlines, tooltips and decorative labels must not obscure the island silhouettes.
2. **Progressive disclosure.** Use small round context markers, six minimal bottom navigation items; show details only after the user explicitly selects an island.
3. **No degraded interaction.** Rotating, pinch-to-zoom, focus & return and module links remain operational on iPhone/desktop. 2D fallback must preserve navigation.
4. **No degraded art.** Retain terrain, trees, architecture, islands and bridges. Use camera screenshot review before accepting any material/geometry/light change.
5. **No degraded performance.** Run browser renderer at portrait phone, landscape phone and desktop; use baseline mobile geometry count ≈917 meshes. Mesh count is **not FPS**; verify device FPS separately and do not misrepresent it as a performance measurement.
6. **No fabricated data.** Public demo remains synthetic. Never push HROS diary or health measurements into public Worker or GitHub fixtures.
7. **No fake PASS.** GitHub CI, Cloudflare browser WebGL, screenshot review and functional nav QA must pass. Preserve rollback.
8. **Document diffs.** Changes to art direction require before/after images and explicit baseline comparison; do not use generic pleasing text instead of visual evidence.

## v0.4 HUD acceptance
- [x] Promotional hero/introduction, help legend, footnote and toast are visually hidden.
- [x] All six bottom nav modules are on a single mobile row.
- [x] Round clickable tags replace always-visible large labels.
- [x] Staging runs WebGL on 390×844, 844×390 and desktop.
- [ ] CI for HUD-specific guard tests green.
- [ ] Mobile selection, focus and return controls independently verified in staging.
- [ ] Review screenshot and promote to canonical stable demo only after all prior gates pass.
- [ ] Real iPhone Safari manual acceptance remains separate from emulator QA.

## Continuation
Future visual work should start with project name, goal, stage, progress, and reference this v0.3 quality floor. Continue using GitHub + Cloudflare rather than Work.
