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
- **Library** contains twelve elements, search, category filters and saved items. Desktop uses four columns; narrower screens use two or one.
- Opening a card leads to an addressable workspace at `/library?element=…`, with a large canvas and inspector. Source and Prompt share the preview's dimensions.
- Inspector controls change actual component properties. Current props, Usage code and Copy prompt include the selected configuration. Reset settings restores defaults.
- Sidebar navigation includes Home, Library, Saved, Getting started, accent colour and the repository link. It collapses on mobile.

## Elements

| Element | Implementation | Adjustable properties |
| --- | --- | --- |
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

The source panel exports complete component files, not demo placeholders. Components include scoped styles; standalone exports do not depend on the site's global stylesheet. Install instructions specify any additional files and packages.

## Motion and accessibility

Pointer interactions use frame-independent exponential interpolation. Sculptures sleep when settled and suspend offscreen or in hidden tabs. Reduced motion retains a static composition. Components clean up timers, animation frames, observers, listeners and GPU resources. Native keyboard controls provide alternatives to pointer input.

The workspace uses normal page navigation without a focus trap or body scroll lock. View tabs support arrow keys. Selection menus support keyboard navigation and Escape. The focus indicator is a thin white outline. Copy and viewport controls are 50px tall.

Saved items migrate from the former storage key. Accent colour and prompt workflow persist locally. The loader follows actual document, font and route readiness without an artificial minimum duration. The GitHub action uses the official Invertocat asset from the [GitHub brand toolkit](https://brand.github.com/foundations/logo).

Website `/lab` is separate and has not been changed.

## Liquid Relic

Liquid Relic retains the user-supplied Sculpture Hero particle engine by Guglielmo Giannattasio (guglielmogiannattasio.it), distributed via 21st.dev. Its flow map, curl noise, complementary image/particle dissolve, velocity streaks and elastic return remain intact. This is an adapted engine with Motiqo’s own metallic emblem artwork and minimal presentation; engine authorship is credited in source, documentation and generated prompts.

Copy the three files from `components/ui/` into one folder. Save the supplied `liquid-relic.svg` in `public/media`, or pass your own same-origin/CORS-readable `src`. Inspector parameters update the live simulation and generated usage. Reduced motion remains static; pause freezes the current frame. Compact/mobile previews cap particle density and render at 30fps. Offscreen/hidden canvases suspend; unmount disposes GPU programs, shaders, textures, framebuffers, buffers, observers, listeners and queued presentation frames.
