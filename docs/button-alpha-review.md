# Button alpha review — 2026-10-28

Reviewed Library button renderers in the local working diff.

- Optical, Spectral, Caustic: optical-shaders.ts mixed edge RGB separately from coverage, creating a different composite at partially covered pixels. Corrected radiance composition with straight-alpha output, matching native-gl.ts (premultipliedAlpha:false).
- Lenticular, Photon: same issue in button-optics.ts compositeGlass. Corrected shared composition and smooth outer falloff.
- OpticalButton host: canvas now bleeds 20 CSS pixels on every side; logical resolution and drawing buffer agree. Capsule dimensions, hit target and pointer coordinates are preserved. Applies to all six consumers, including Prism.
- Prism: its color/mask output uses conventional straight alpha; no matching shader defect found.
- Lumen: independent canvas renderer and intentional CSS clipping; no matching optical composite expression found. This does not certify its rendering on every GPU.

Validation: typecheck passed. 12 tests passed in catalog-behavior.test.cjs and optical-effects.test.cjs (simulated DOM/GPU, lifecycle and interactions). Existing component-tests.json mappings already cover the six consumers; retained them. Focused component quality command regenerated distribution and preview sources. Distribution junction tests fail with EPERM because this environment cannot create Windows symlinks; this is separate from button behavior.

Pending: real Chrome/Opera GPU rendering at desktop/mobile widths and zoom, shader compilation on those GPUs, visual contrast, and performance comparison. Simulated tests do not prove the pixel output. No publication or push performed.
