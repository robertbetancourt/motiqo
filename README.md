# Motiqo

A library of original interactive elements. Fine contours, tactile objects and considered motion, with editable previews and source ready to use.

Built with Next.js, React and TypeScript. Urbanist and IBM Plex Mono are served locally.

## Run locally

```sh
npm install
npm run dev
```

Open http://127.0.0.1:3014. No environment variables are required. An optional GitHub repository override is documented in `.env.example`.

```sh
npm run typecheck
npm run build
node --test tests/*.test.cjs
```

For Vercel, use the `Motiqo` project root and the Next.js preset. The prototype remains `noindex` while the library develops.

## Explore

- **Home** introduces the library with Motiqo's own folded text entrance and a procedural metal sculpture.
- **Library** contains interactive elements, search, category filters and saved items. Desktop uses four columns; narrower screens use two or one.
- Opening a card leads to an addressable workspace at `/library?element=…`, with a large canvas and inspector. Source and Prompt share the preview's dimensions.
- Inspector moods and controls change actual component properties. Configurations persist per element and can be shared by URL. The generated usage example and copied prompt include the selected configuration. Reset settings restores defaults.
- Sidebar navigation includes Home, Library, Saved, Getting started, accent colour and the repository link. It collapses on mobile.

## Elements

| Element | Implementation | Adjustable properties |
| --- | --- | --- |
| Constellation | GPU stellar sphere with volumetric dust, curved threads and travelling light | Response, speed, stars, dust density, accent |
| Meridian | Stepped architectural city, neon routes and cinematic tracking | Route colours, gradient, speed, replay, autoplay, scroll sensitivity, camera entrance |
| Resonance | Harmonic ribbon ring with an incandescent rim and stippled aura | Size, speed, wave amplitude, ribbon count, palette, hover intensity |
| Sleeve | Elastic 3D collection of twenty authored albums and hero selection | Albums, tilt, spring configuration, starting index, playback callback |
| Deck | Isometric CAD hardware with floating actuator, raised keys and sequential light | Spring response, sequence speed, elevation, autoplay, four gradient colours |
| Companion | Animated glass ribbon agent with cursor-tracking eyes | Response, speed, eye tracking, warm and cool light |
| Sentiment | Illustrated market line chart with smooth period morphing and cursor inspection | Asset, period, variation, speed, line width, area light |
| Helix | 3D double helix made entirely from points with shader curl turbulence | Particle count, rotation, dispersion, colours, interaction |
| Holdings | Animated segmented stock portfolio with illustrative USD positions | Portfolio target, position size, speed, line width, segment gap, activity |
| Galaxy | Inclined GPU spiral galaxy with a radiant core, dust streams and orbiting stars | Particles, orbit speed, spiral arms, inclination, glow, core and star colours |
| Luma | Coral-to-violet particle wave with drifting dust and a cropped portrait greeting | Particles, speed, wave height, glow, gradient colours |
| Aura | Fluid wave and particle sphere with interactive score and risk colours | Score, response, speed, waves, density |
| Nexus | Layered network sphere with a particle core and gentle compression | Response, speed, nodes, connections, line width |
| Orbit | Independently rotating open contours with soft 3D tilt | Response, speed, rings, line width, relief |
| Halo | Rotating 3D particle globe that settles into latitude bands | Response, speed, particle count, dot size |
| District | Sixteen stepped SVG buildings on an isometric city plan | Response, speed |
| Pulse | Progressively drawn sample activity chart | Tempo, amplitude, line colour |
| Event Horizon | Authored black-hole artwork using the credited Relic particle engine | Resting finish, response, radius, dispersion, fluidity, return, scale |
| Liquid Relic | Image-to-particle GPU sculpture with authored Motiqo artwork | Resting finish, response, radius, dispersion, fluidity, return, scale |
| Crate | Three.js orthographic vinyl shelf with real depth testing | Record count, response, speed |
| Liquid Form | Native WebGL2 signed-distance-field sculpture | Knot/Orbit/Bloom, liquidity, relief, scale, metal tint |
| Glow Nav | React navigation with one interpolated light field | Transition duration, light colour |
| Lantern | Solid SVG petals around a warm core | Response, speed |
| Gyro | Solid SVG gimbal rings on a plinth | Response, speed |
| Arbor | Procedural branches and outlined leaves | Response, speed |
| Drawer | Isometric cabinet with opening trays | Response, speed |
| Tempo | Six spheres on a one-way conveyor | Response, speed |
| Pleat | Twenty-five elastic lamellae | Response, speed |
| Gilded Signal | Three.js engraved holographic card | Local background artwork |
| Silk Aperture | SVG architectural reveal | Dawn/Dusk light |

Liquid Form generates its own geometry and metallic shading. It does not use a sculpture image or an external effect engine. Crate uses fixed spacing and bounded tilt to keep records apart; its depth buffer hides rear grooves and shelf walls correctly. Glow Nav is a standalone library element with generic destinations, independent of the site's Sidebar.

## Source structure

- `lib/catalog.ts` — classifications, dependency instructions and prompt adapters.
- `lib/element-controls.ts` — editable properties, defaults and generated usage examples.
- `components/originals/` — authored component geometry, shaders and motion.
- `components/element-workspace.tsx` — preview, inspector, source and prompt views.
- `components/site-sidebar.tsx` — shared site navigation.
- `components/effects/fold-text.tsx` — native Web Animations letter entrance.
- `components/outline-field.tsx` — authored CSS bezel with interpolated pointer lighting.
- `components/liquid-action.tsx` — reusable glass copy action.
- `app/library/page.tsx` — reads the actual implementation files into Source.
- `public/media/` — optimized local artwork from the supplied assets.

The source panel exports complete component files, not demo placeholders. Library requests only the initially selected component source; other sources load on demand with cancellation, retry and copy protection while loading. Components include scoped styles; standalone exports do not depend on the site's global stylesheet. Install instructions specify any additional files and packages.

## Motion and accessibility

Library renders local, theme-aware posters immediately. Each component has its own lazy module; code for the next row is anticipated, while visible scenes enter progressively after the page has painted. A poster remains until the real scene has drawn its first frame. Two recently viewed scenes stay paused offscreen for quick return; older scenes are disposed. Fresh paused/reduced-motion cards use the complete still composition without creating a simulation.

Posters are captured from the actual compact components, including complete chart readouts. In development, open `/preview-capture/<id>?theme=dark` or `?theme=light`, wait for the surface's `data-ready="true"`, and capture its top-left 320 × 320 pixels to `screenshots/posters/<id>-<theme>.png`. Run `npm run previews:build` to generate optimized, content-addressed WebPs and `registry/previews.json`. Commit those outputs; source captures are ignored. The capture route returns 404 in production. Tests check every poster's content/hash, scene admission, readiness, cancellation and bounded retention.

Pointer interactions use frame-independent exponential interpolation. Sculptures sleep when settled and suspend offscreen or in hidden tabs. Reduced motion retains a static composition. Components clean up timers, animation frames, observers, listeners and GPU resources. Native keyboard controls provide alternatives to pointer input.

The workspace uses normal page navigation without a focus trap or body scroll lock. View tabs support arrow keys. Selection menus support keyboard navigation and Escape. The focus indicator is a thin white outline. Copy and viewport controls are 50px tall.

Saved items migrate from the former storage key. Accent colour and prompt workflow persist locally. The loader follows actual document, font and route readiness without an artificial minimum duration. The GitHub action uses the official Invertocat asset from the [GitHub brand toolkit](https://brand.github.com/foundations/logo).

Website `/lab` is separate and has not been changed.

## Liquid Relic

Liquid Relic retains the user-supplied Sculpture Hero particle engine by Guglielmo Giannattasio (guglielmogiannattasio.it), distributed via 21st.dev. Its flow map, curl noise, complementary image/particle dissolve, velocity streaks and elastic return remain intact. This is an adapted engine with Motiqo’s own metallic emblem artwork and minimal presentation; engine authorship is credited in source, documentation and generated prompts.

Copy the three files from `components/ui/` into one folder. Save the supplied `liquid-relic.svg` in `public/media`, or pass your own same-origin/CORS-readable `src`. Inspector parameters update the live simulation and generated usage. Reduced motion remains static; pause freezes the current frame. Compact/mobile previews cap particle density and render at 30fps. Offscreen/hidden canvases suspend; unmount disposes GPU programs, shaders, textures, framebuffers, buffers, observers, listeners and queued presentation frames.

## Distribution and validation

```sh
npm run distribution:build
npm test
npm run build
npm run verify:exports
```

The build validates the manifest and bundles the actual implementation and artwork into `public/downloads/motiqo-cli-0.1.0.tgz`. This package is downloadable from Getting started; it is not published on npm. No remote registry is required by the installed CLI.

```sh
npm install --save-dev ./motiqo-cli-0.1.0.tgz
npx motiqo list --json
npx motiqo add helix --dir src/components/motiqo --dry-run
npx motiqo add helix --dir src/components/motiqo
npx motiqo skill
```

`--install` explicitly installs missing npm dependencies with lifecycle scripts disabled. Existing dependency declarations are retained. Other package managers receive dependency instructions. Conflicting files require `--overwrite`; the installer rejects traversal and symbolic-link destinations, validates bundled SHA-256 hashes and rolls back copied files after a write failure.

The workspace ZIP endpoint (`/api/components/<id>`) uses the same manifest. It includes complete files/assets, an example matching the selected configuration and a dependency README. Settings from URLs/storage are versioned, bounded and restricted to declared controls. A shared URL takes precedence over locally saved settings; Reset restores defaults. Clearing site storage clears locally saved configurations.

`verify:exports` creates an independent temporary React project, installs the packed CLI and pinned dependencies, copies all components and assets, and typechecks the default and both mood examples for every component. It uses no Next.js runtime, site stylesheet or project aliases. Successful fixtures are removed; failures are retained for diagnosis. Browser checks remain necessary for visual quality and GPU support. CI runs tests, the production build and export verification without publishing or deployment.

Aura exposes a semantic risk meter; Holdings announces selected portfolio values. Pulse and Sentiment provide data tables and keyboard inspection. Live announcements describe interaction results rather than decorative animation frames. Reduced motion preserves data inspection.

Future work, including MCP, hosted playgrounds, video export and public package distribution, is tracked in [PENDIENTES.md](PENDIENTES.md).
