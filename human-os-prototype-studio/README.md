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

## v0.2.3 — Optional AI pose proposals + depth editing (2026-11-09)

**Staging URL:** https://human-os-prototype-studio-v2.kontrakevich.workers.dev/ . Stable v0.1 stays separately available and was not overwritten.

- Click **АВТО-ПОЗА** only after selecting the reference locally. Browser downloads pinned `@mediapipe/tasks-vision@1.2.2` JS/WASM and Google's Pose Landmarker Lite model. Pose inference uses the local HTML image; the raw reference is never transmitted to the Worker. MediaPipe may send its own usage metrics as described by Google; no personal data service is integrated.
- MediaPipe proposes up to **14** 2D body controls and approximate depths; per-point confidence and visibility are validated. Partial/occluded points are left unchanged. The gold candidates do **not** replace current pose until user clicks **ПРИНЯТЬ**; **ОТКЛОНИТЬ** discards them.
- New **ГЛУБИНА И ПЕРСПЕКТИВА** panel selects each joint, adjusts Z relative to camera, resets estimated depth and standardizes focal length. JSON includes depth edits and older v0.1 JSON is backward-compatible.
- iPhone split view camera margin expanded for outstretched arms; the four shot buttons fit on the mobile panel.
- Cloudflare browser QA: WebGL active at 390×844 and 1280×800, 31 meshes; changing left-hand depth updates the real 3D rig. Model initialization/detection completed on a synthetic blank image (0 landmarks, expected). No confirmed true-positive on the painterly heroine yet.
- GitHub CI PASS: [AI QA #42531384248](https://github.com/mkontrakevich/GPT/actions/runs/42531384248), [legacy QA #42531384266](https://github.com/mkontrakevich/GPT/actions/runs/42531384266).
- Remaining risks: stylized illustration may confuse the pose model; camera calibration from one still is not unique, the avatar is an unrigged blockout rather than the visually approved mature heroine; real iPhone Safari/photo picker/download, model performance and GLB import not yet independently verified.
- Avoid implying that Google pose landmarks provide exact anatomy or face, hair, costume or 3D scan. **Overall Character System remains 50% — Gate A HOLD**.
