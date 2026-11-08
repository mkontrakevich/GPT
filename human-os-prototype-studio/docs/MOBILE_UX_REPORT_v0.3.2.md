# HUMAN OS — Character Prototype Studio / Mobile UX v0.3.2

**PROJECT ID:** `PERSONAL-OS/HUMAN-OS/CHARACTER-SYSTEM`  
**Goal:** create a comprehensible iPhone-first reference-to-pose WebGL workflow; no Blender requirement.  
**Stage:** guided mobile prototype, not the finished heroine.  
**Overall character readiness:** 50% / Gate A HOLD.  
**Branch:** `feat/human-os-prototype-guided-v3`.  
**Isolated preview:** https://human-os-prototype-guided-v3.kontrakevich.workers.dev/

## Initial problem
The earlier mobile editor used 40/60 split columns for a dense 2D landmark editor and real 3D mannequin. At phone width each view was too small, four camera tabs and technical controls competed for space, and the result could look like a generic cartoon/low-poly figure instead of the approved painterly adult heroine. This confused the product goal. **A geometry/pose blockout must never masquerade as a finished visually matched character.**

## Implemented
- Image-first entry screen: one primary action to choose the approved local image; clearly explains the tool builds pose and camera, not final facial identity/hair/outfit.
- On mobile, the **reference and 3D model are independent full-width views** with clear accessible tabs, not 40/60 miniatures.
- 3D tab unlocks only when a local image has loaded; user can switch back to correct landmarks without losing their state.
- Auto Pose remains opt-in; after MediaPipe inference suggestions still require explicit accept/reject and manually editing occluded joints is supported.
- A three-action bottom dock: choose photo, detect pose, settings.
- Technical parameters are hidden by default in a vertically scrollable mobile bottom sheet with a backdrop tap/Escape dismiss.
- iPhone safe-area padding, compact camera presets, responsive portrait/landscape layout, full-screen WebGL orbit/pinch.
- Scene transitions are **instant**, not transparent overlays, preventing double images while switching.
- Old v0.1 and v0.2 versions, Character Lab and protected Living World remain unmodified.

## Quality / evidence
- Cloudflare deployment `human-os-prototype-guided-v3` version `v0.3.2-mobile` at independent public Worker.
- Browser rendering confirms WebGL ACTIVE and photo-first landing at 390×844.
- A synthetic PNG load closed the welcome screen, enabled the 3D tab, and preserved local-only reference handling.
- Browser integration confirmed instant ref-hidden/scene-visible switching and return from 3D to reference, both full panel width; settings sheet open/dismiss works.
- QA reviewed screenshots of initial mobile onboarding.
- GitHub Actions test suite for full editor and mobile UI **PASS**: https://github.com/mkontrakevich/GPT/actions/runs/42533326995 .
- No personal source image is embedded in public Worker or repository.

## Explicit limitations
- Mannequin is a pose and proportion proxy, NOT a beautiful image-matched painterly heroine.
- MediaPipe model has not been validated against the user-approved illustrated character on physical iPhone; real-world recognition quality remains unknown.
- Real iPhone Safari selection from Photos, GPU thermals/FPS, pinch and file downloads need actual device acceptance.
- No final skinned GLB, facial rig, wardrobe, real environment, Health/HROS synchronization or user art sign-off.
- Mobile interface implementation completion does **not** raise Character System progress from 50%.

## Next acceptance actions
1. User tests the separate URL on iPhone, selects approved picture, confirms the two full-screen modes and gesture comfort.
2. Evaluate Auto Pose on the real illustration; keep the result as provisional if landmarks are inaccurate.
3. Improve silhouette and 3D proxy mapping, then produce artist-quality geometry by reference, not arbitrary low-poly approximation.
4. Maintain rollback and promote only after accepted screenshots and real hardware tests.

**Review rule:** approved painterly reference sets minimum artistic quality; technical mannequin is intentionally labeled as a blockout.
