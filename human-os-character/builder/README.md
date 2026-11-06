# HUMAN OS — Reference-to-3D Character Builder v0.1

**Purpose:** A browser-only editor for **image → pose landmarks → neutral 3D mannequin**. NO Blender required for this prototyping stage. This is intentionally a **technical posing / camera / proportions tool**; not the artistic delivery of the approved painterly heroine.

## Existing project relation
- Contour: PERSONAL OS; repository: `mkontrakevich/GPT`.
- Feature branch: `feat/human-os-reference-to-3d-builder`.
- Character art progress: **50%** until the actual heroine geometry and facial resemblance is approved.
- Protected main six-island Living World remains unchanged.
- The current Character Lab remains separate; builder operates as a standalone Cloudflare Worker.
- Reference-to-3D is a **reusable subtool** that can feed the Character Lab via GLB+pose JSON, not a copy or replacement of the original painted reference.

## Workflow
1. Open the URL on iPhone or desktop.
2. Import the approved image locally (PNG/JPG/WebP, max 18 MB).
3. Optionally click **АВТОПОЗА**. MediaPipe Pose Landmarker (lite) loads on first use, detects 33 points and maps 13 relevant points to the user-editable skeleton. If the remote model/CDN fails, manual editing is fully available.
4. Tap or drag markers on the source image to align the neutral mannequin with the reference's pose.
5. Change proportional head/shoulder/body volumes (heuristic, **not inferred from one image**).
6. Inspect from front, 3/4, profile and back via orbitable Three.js scene. Side/back geometry are speculative, not ground truth.
7. Export `HUMAN_OS_POSE_PROTOTYPE.json` for reproducible pose metadata or `HUMAN_OS_MANNEQUIN_BLOCKOUT_UNRIGGED.glb` as an editable 3D volume, without rig or textures of the user-approved heroine.
8. Use the exported pose and camera as constraints for building a higher-quality master avatar in later stages.

## Honest limits
- A single image does **not** uniquely determine 3D anatomy, clothing thickness, hair back volume, facial identity, the unseen limbs or a skeletal rig.
- A rough mannequin is correct as a **construction instrument**, not as a final stylized game model. It does not overwrite the user-approved heroine identity.
- MediaPipe world landmarks estimate body pose, **not** character face/coat topology.
- No server upload or storage; image remains in the local browser's current memory; PoseLandmarker JS and model files load from public third-party CDN/model hosting on demand.
- No external AI generation, API key or paid subscription is necessary for the manual editor.
- The exported JSON contains the local filename/size, but **not** image bytes. Users control the exported files on their devices.

## Acceptance stages
- [x] GitHub versioned editor with 2D ref image, draggable pose markers, neutral 3D mannequin, camera presets, parameters, JSON and GLB exports.
- [ ] GitHub CI pass.
- [ ] Cloudflare isolated Worker deployed; mobile portrait and desktop runtime QA, GLB export.
- [ ] Pose Landmarker tested on representative image with user opt-in.
- [ ] Reliable depth estimation and proportion measurement refined with second angle or human confirmation.
- [ ] Separate final painterly shape-generation pipeline based on approved source and user review.

## Why no Blender today?
Three.js provides WebGL geometry and GLTFExporter, so a **pose prototype** is completely possible without Blender. In later production quality, external modeling or web-native sculpting/retopology may still be necessary. Do not promise that a single 2D image automatically yields an accurate, animated production avatar.

## Future best-of-breed options
- `MediaPipe Pose Landmarker` for photo keypoints (already optional).
- `pose-toolkit` / `PoseForge` for articulations and reference alignment ideas.
- `humanoid-kit` (pre-release; pin tested version) or licensed open neutral human base for parametric face/body geometry in a later iteration.
- Final visual floor: user-approved painterly heroine, adult facial anatomy and costume; **not** the unstyled mannequin in this tool.
