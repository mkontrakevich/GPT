# HUMAN OS — Reference Prototype Studio v0.1.1

**Project DNA:** PERSONAL-OS/HUMAN-OS/CHARACTER-SYSTEM  
**Stage:** Character First / Gate A (50% → 65%: reference matching and pose geometry).  
**Status:** browser-proven technical pose and framing editor; **NOT** a source-faithful finished avatar.

## Why this exists
The previously published character was a cartoon-like extrapolation that does not meet the user-approved mature painterly heroine reference. Do not keep polishing that avatar as the final look. This studio **separates frame/pose/proportion matching from professional 3D art production** and allows precise, repeatable adjustments without Blender.

## Inputs, outputs and privacy
- Input: locally selected PNG/JPEG/WebP reference (up to 20 MiB). No server upload. It is displayed only in local browser memory; no image data in JSON.
- Manual: 14 2D points (head, neck, shoulders, elbows, wrists, hips, knees, ankles), editable by dragging on top of the image.
- Output: articulated **3D blockout** with torso, head, hips, arms, legs and hands. Adjustable head/shoulders/hips/torso; camera view, focal length (28–85 mm equivalent) and zoom. No automatic claim of depth, likeness or anatomy from one picture.
- Export: parameters JSON (reopenable); PNG of 3D viewport; genuine unrigged geometry GLB. GLB is NOT skinned, UV-authored, artist-approved or ready for animation. No health/HROS data.
- Four camera presets: front, ¾, profile, back. Profile/back are **inferred 3D** — not verified views of the illustration.
- Browser editor: https://human-os-prototype-studio.kontrakevich.workers.dev/

## User workflow
1. Upload the **approved original heroine** in REF.
2. Align all 14 joint markers to the original photo. View updates automatically.
3. Use ¾ camera and adjust proportions until the silhouette and posture match as much as blockout allows.
4. Compare by enabling overlay. Change focal length to match perspective and shot composition.
5. Export JSON for repeatable state and PNG for side-by-side review; GLB for further sculpting if needed.

## Guardrails
- Do not use current simple grey mannequin as a substitute for the approved painterly art. The goal is an **editable proxy**, not final art.
- No new identity, face generation, artistic style transfer or unsupported back-view approval.
- No Blender required for pose/camera editing. A production-ready facial likeness, clothing topology and actual rig still require dedicated 3D authoring, whether in a future web mesh editor or Blender.
- GPU/WebGL, rendering and browser mechanics must remain stable; main six-island world Worker and original Character Lab remain unchanged.

## Architecture
GitHub: `mkontrakevich/GPT` branch `feat/human-os-reference-blockout-studio`.  
Cloudflare staging Worker: `human-os-prototype-studio`.  
Browser: pinned Three.js 0.180.0, parameterized joint rig, local file object URLs, JSON/PNG/GLB exports via GLTFExporter. No paid APIs and no backend database.

## QA / next stages
- [x] Local reference upload; manual 14-point pose tracking; real WebGL geometry and four cameras.
- [x] Phone/desktop browser smoke with actual WebGL.
- [x] Browser synthetic-image upload and joint drag testing.
- [x] Browser GLB export successfully generated >90 kB of actual binary data.
- [ ] Independent real iPhone Safari acceptance, including upload from Photos, gestures, JSON/PNG/GLB downloads and FPS.
- [ ] Optional on-device MediaPipe pose landmark suggestion (user confirmed) with low-visibility rejection and manual correction; **not** an automatic identity rebuild. Official browser library can derive 33 pose landmarks from images, but depth is approximate.
- [ ] Camera geometry match calibration / full pose depth editing and semantic anatomy constraints.
- [ ] Artist-reviewed face/head/hair/coat shape matching; genuine production topology, UV, rig, then section-specific wardrobe.
- [ ] Reference on-screen visual approval; no Character System progress >50% merely for tools.
