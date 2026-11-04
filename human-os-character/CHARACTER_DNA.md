# HUMAN OS — Character DNA / painterly real-time 3D

STATUS: WebGL technical prototype. Do not merge to the approved Living World until the user approves its visual quality.

## Approved direction
- One original heroine inspired by the high-end painterly 3D language of premium animated fantasy, not a copy of any copyrighted character.
- Warm brunette hair with large modeled locks; expressive adult features, elegant anatomy; cream/taupe futuristic coat, tailored pants, gold seams.
- Strong cinematic silhouette and restrained game HUD. Keep the original previously approved 2D concept as the look target.
- Subsequent scene/domain changes adjust costume, light and environment but preserve identity.
- Follow visual quality floor of human-os-webgl/docs/VISUAL_QUALITY_FLOOR.md.

## Real prototype delivered
- Separate branch feat/human-os-character-painterly-webgl.
- Three.js WebGL true volumetric meshes, hand-painted CanvasTextures, curved painted face, hair, fabric and costume geometry.
- Touch/pinch 360 orbit, full body preset, lighting change and subtle idle movement.
- Dedicated synthetic public Worker: https://human-os-character-lab.kontrakevich.workers.dev/
- No personal data read or written; original world and Health/HROS untouched.

## Current limitations
- Still a procedural BLOCKOUT and not an image-matched premium Arcane-level game asset.
- Face, fabric weight and hair need professional authoring and side-by-side visual review.
- Not yet skinned, bone-rigged, GLB-exportable or supplied with genuine animation clips.
- Browser emulator working does not verify real iPhone FPS, thermals or memory.

## 100% acceptance gates
- [x] Original 2D concept and painterly visual direction approved.
- [x] Real WebGL 3D actor view on separate Cloudflare staging.
- [x] Orbit, touch zoom, front/full-body view, alternative lighting.
- [ ] Adult likeness and proportions match the 2D reference; explicit user acceptance.
- [ ] Game-ready GLB/glTF with clean topology, UV and proper skeletal rig.
- [ ] Idle / Walk / Turn clips, believable coat and hair secondary motion.
- [ ] Character identity consistency across section-specific outfits.
- [ ] Verified mobile hardware performance and accessibility/fallback testing.
- [ ] GitHub CI, independent visual QA, staged integration and rollback.

Never call this blockout 100% or mark character visual quality approved merely because WebGL renders.