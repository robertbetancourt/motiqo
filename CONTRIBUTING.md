# Contributing

Motiqo is in active development. Open an issue before a large change so we can agree on its scope. Small bug fixes are welcome.

Use Node.js 24 and npm ci. Run npm run dev, then open http://127.0.0.1:3014. Before submitting: npm test, npm run typecheck, npm run build, npm run verify:exports. For README images run npm run readme:build.

Keep components portable: include local imports and assets in registry/manifest.json, bound controls, preserve keyboard input, reduced motion, pause, offscreen suspension and cleanup. Describe visual changes with screenshots and include steps to reproduce bugs. Do not commit screenshots containing credentials or personal data.

Contribute code you have the right to license under MIT. Identify third-party sources and licenses; visual inspiration does not establish authorship of copied code. Artwork and audio need separate permission. See LICENSE and THIRD_PARTY_NOTICES.md. Report vulnerabilities as described in SECURITY.md.
