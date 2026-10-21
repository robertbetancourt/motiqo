# Contributing

Motiqo is in active development. Open an issue before a large change so we can agree on its scope. Small bug fixes are welcome.

Use Node.js 24 and npm ci. Run npm run dev, then open http://127.0.0.1:3014. Before submitting: npm test, npm run typecheck, npm run build, npm run verify:exports. For README images run npm run readme:build.

Keep components portable: include local imports and assets in registry/manifest.json, bound controls, preserve keyboard input, reduced motion, pause, offscreen suspension and cleanup. Describe visual changes with screenshots and include steps to reproduce bugs. Do not commit screenshots containing credentials or personal data.

Contribute code you have the right to license under MIT. Identify third-party sources and licenses; visual inspiration does not establish authorship of copied code. Artwork and audio need separate permission. See LICENSE and THIRD_PARTY_NOTICES.md. Report vulnerabilities as described in SECURITY.md.

## TypeScript toolchain

The `typescript` dependency provides the `tsc` CLI for project and export checks. Tests and the export example adapter use `typescript-compiler-api`, an explicit npm alias of TypeScript 5.9.3, because TypeScript 7 does not yet expose the JavaScript compiler API. Keep these responsibilities separate; do not bypass peer resolution or skip type checking to make dependency updates pass.

## Component checks

Register behavior tests in `tests/component-tests.json`; use `npm run test:component -- <id>` while working, or `-- --files <helper-path>` for shared helpers. Existing gaps are tracked explicitly and do not count as coverage. The complete CI suite remains required before publishing.

For each new or changed component, check keyboard/focus, accessible names and states, loading/errors, contrast, responsive layout, reduced motion, and resource cleanup as applicable. Verify canvas/WebGL fallbacks and independent exports. Distinguish simulated tests from real browser checks; document any pending zoom, screen-reader or device-performance checks. New components require behavior tests, not another baseline waiver.

Keep personal notes, research and raw captures local. `docs/` is private except for the README images in `docs/readme/`. Only deliberately public Markdown files are allowed by `.gitignore`; do not force-add ignored notes.

## README animations

The development-only authoring route `/preview-capture/<id>?theme=dark&motion=1` renders the real component in a 320 × 320 frame. Without motion=1, the existing static poster mode is preserved. Record that surface into numbered PNGs under `screenshots/readme-motion/<id>/` with a timing.json containing id, times (capture milliseconds), and duration (milliseconds). These raw recordings stay ignored by Git.

With a trusted FFmpeg installed (or FFMPEG_BIN pointing to its executable), run `npm run readme:gifs`. It encodes four-second, 256 × 256 looping GIFs at 12 fps with an optimized palette, then updates the README. `npm run readme:build` prefers a component’s GIF when available and keeps its WebP fallback. The hero.png is maintained manually and is not regenerated.
