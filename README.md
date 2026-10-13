# Motiqo

Independent interface and motion collection. Project folder renamed from Prism4 to Motiqo. Next.js + React + TypeScript, local Urbanist and IBM Plex Mono fonts.

## Development

```sh
npm install
npm run dev
```

Open http://127.0.0.1:3014. `npm run typecheck` checks TypeScript; `npm run build` creates the production build. Vercel: project root `Motiqo`, Next.js preset, `npm run build`. No required environment variables. The prototype remains noindex until its original collection is ready.

## Structure

- `lib/catalog.ts`: nine Motiqo components, usage code and Universal/Claude/ChatGPT/Codex/Cursor prompt adapters.
- `components/originals/silk-aperture.tsx`: first original Motiqo element, a self-contained React component with scoped CSS and an illustrated architectural SVG reveal. The server reads the implementation files into the Code panel; copied source stays aligned with the live demos.
- `assets/branding/`: original Logo, Isotype, Imagotype and Monogram SVGs, unchanged.
- `lib/brand-shapes.ts`: SVG path geometry extracted from those files for native rendering and animation; update when the source branding changes.
- `components/brand.tsx`: logo in header, isotype in the rail, imagotype in footer, monogram in favicon and sponsorship page.
- `components/brand-loader.tsx`: original arc assembly and wordmark reveal while a real load is pending. A 120ms reveal delay avoids flashing during fast loads; there is no minimum playback duration or session flag. Reduced motion uses a static mark.
- `components/initial-page-loader.tsx`: waits for the initial document and local fonts only when still pending.
- `app/loading.tsx`: Next.js Suspense fallback for pending section loads; removed automatically when ready.
- `components/color-picker.tsx`: persistent primary color, presets and custom picker. Applied through semantic CSS variables to identity, controls and previews.
- `components/github-control.tsx`: https://github.com/robertbetancourt/motiqo; displays stars from the public GitHub API, omits count if unavailable. `.env.example` supports an optional repository override.
- `components/library.tsx`: centered hero, animated four-column gallery, native search, saved elements and URL-addressable detail dialog. Clicking the card opens its preview, while buttons keep their own interactions. Copy prompt copies instantly; its separate arrow chooses the AI workflow.
- `components/vuesax/`: original `vs-chip-outline` JavaScript, TypeScript declarations and React wrapper from the Vuesax MCP, kept unchanged.
- `components/outline-field.tsx`: renders that original ring as a decorative, inert sibling behind a native input/select. The shadow-root adaptation only sizes the chip and hides its label/check controls; there is no duplicate conic-border implementation.
- `components/sponsor-cards.tsx`: Uriat sponsor concept, available sponsor space, and maker portfolio card. Uriat is a local mock sponsor approved for this prototype; its link goes to the local sponsorship page, not an invented Uriat URL.
- `app/docs/page.tsx`: getting started, code/prompt workflow, planned CLI and Skills, accessibility.
- `app/sponsors/page.tsx`: sponsorship information and link to Robert's portfolio.
- `public/media/`: optimized artwork from supplied assets. Original artwork remains in `assets/`.

## Behavior and accessibility

Desktop at 1024px and above uses four element columns; tablet uses two and narrow mobile one. Pause sits immediately left of search. A subtle grayscale image, grain and accent light give depth to the darker background. Ambient movement pauses with the demos.

Pointer input stays scoped to each preview. Motion follows reduced-motion settings. Native modal dialogs trap focus and restore the triggering focus; Escape closes them, tab arrows switch views, and Ctrl/Cmd K focuses search. Preview, Source code and Prompt use a shared segmented control and a fixed preview-sized shell, with scrolling inside the document. ChoiceSelect provides the same inset, keyboard-accessible menu for prompt workflows and source files. LiquidAction gives all dialog copy actions a Lerp-driven glass reflection and the same decorative ring used by search. All frames, listeners and timers are cleaned up.

The hero uses the supplied React Bits FoldText effect, adapted to TypeScript and responsive word wrapping, with GSAP and static reduced-motion support. Its attribution and license are retained in `components/effects/ReactBits-LICENSE.md`; it is used as site decoration and is not listed in the original component catalog. GitHub buttons use the unmodified white Invertocat from the [official GitHub brand toolkit](https://brand.github.com/foundations/logo).

Saved items migrate from the former Prism4 storage key without deleting old data. Primary color saves under `motiqo-accent`; selected prompt workflow saves under `motiqo-prompt-tool`.

## Local demo implementations

Gilded Signal (`components/originals/gilded-{card,scene,artwork,shaders}`) is an original Motiqo interpretation of the researched FIL card experience. It uses Three.js 0.172.0, a real extruded frame with an aperture and stencil-clipped miniature world, four-channel procedural engraving masks, authored foil and atmosphere shaders, the supplied Motiqo SVG as an extruded centerpiece, and the existing optimized floral artwork as the background. There is one card and no inter-card cable. The large dialog is opt-in through catalog `previewSize: 'cinema'`; other dialogs retain their dimensions. The Source code panel has a file selector for the four modules, with install and asset instructions. No source from FIL is shipped.

`GildedCard` props: `compact`, `paused`, `backgroundSrc`, `emblemSrc`, `className`. Desktop gets a low-resolution advected GPU smoke displacement field. Mobile/compact instances use three noise octaves, fewer particles/filaments, DPR 1 and a 30fps render cap without the extra render targets. Pause and reduced motion settle into a static render. Intersection and page visibility suspend rendering. Async-loaded textures are disposed if they arrive after unmount; canvas listeners, observers, textures, geometry, materials, environment targets and context are released. Local controls provide a keyboard alternative to drag/flip. A static branded fallback appears if WebGL is unavailable or its context is lost.

Silk Aperture is an original Motiqo implementation. Save its complete Code panel as `silk-aperture.tsx`; React is its only dependency. Props: `title`, `subtitle`, `eyebrow`, `href`, `cta`, `compact`, `paused`, `className`. The optional CTA needs a real destination supplied by the consumer. The illustration and metallic ribs are native SVG with unique IDs per instance, without external assets. Mouse position and shutter opening use exponential Lerp (`1 - exp(-rate * dt)`), not React state per frame. Pointer input is scoped to the component; touch can tap to reveal and keyboard focus on the light controls also opens the aperture. The loop sleeps once settled and suspends offscreen or in hidden tabs. Reduced motion leaves a static scene and functional Dawn/Dusk controls. Frames, observers and media/visibility listeners are cleaned up on unmount.

The collection contains only Gyro, Lantern, Relay, Arbor, Drawer, Tempo, Pleat, Gilded Signal and Silk Aperture. React Bits reference files and the Hairline/Matter dependencies have been removed. The internal original flag describes the source-code workflow; it is not displayed as a tag.

## Design research

Navigation: Hairline uses Figures, Skill and Docs, with installation/API/accessibility documentation; React Bits has getting started, component browsing, Skills and sponsors. Motiqo therefore uses Collection, Getting started and a Resources menu; CLI and Skills explicitly remain planned.

Motion research: [BUCK's Comfy brand system](https://www.buck.co/work/comfy-brand-refresh) uses the brand's own shapes for spatial reveals and regrouping. [Ordinary Folk's process](https://www.ordinaryfolk.co/process) emphasizes animation that expresses the identity. The Motiqo loader uses its supplied arcs and dot, with short staggered assembly and a masked wordmark reveal; no borrowed studio animation or logo geometry.

Website `/lab` has not been modified. Integration comes later.

## Curved UI refinement

Buttons, inputs, selects and tags use pill radii; cards use 16px and dialog panels 20px. Target Cursor and its GSAP dependency have been removed. Card save controls live inside previews, and the previous arrow, MQ counters and interactive status labels are gone. Code icons inherit their action highlight. The hero is centered, with collection and repository actions; the former coordinate labels and hero isotype are removed. Route entry, gallery filtering, card hover, sponsorship reveal, menu and modal transitions use Motion/CSS and respect reduced motion.

## Loader verification

Run `npm run test:loader` for five focused DOM regressions: ready page, pending fonts in an existing session, document plus font readiness, fast-load suppression, and real React Suspense section loading. The tests mount the actual loader components with React DOM.

## Consistent section frame and minimal previews

Collection, documentation and sponsors share SiteFrame: ambient artwork, navigation rail, header, main margins and footer. Route transitions fade without translating the ancestor of fixed elements. Artwork has a matching resting transform before its ambient animation starts. Active navigation uses an upper light beam and subtle falling particles; reduced motion freezes them. Collection has no count in the nav.

Silk Aperture defaults to minimal artwork and The Art of Being Elsewhere. Its popup owns the Dawn/Dusk buttons outside the preview and passes the controlled light prop. Headers, orbit copy, side labels and footers are opt-in with minimal=false. Previews keep the artwork minimal and place category, technique tags and a liquid-glass prompt action below it.

## Linear section transitions

AmbientBackground lives in the persistent root layout, so route changes do not reset its image or animation. The route template does not fade the frame. SiteFrame animates only the main content by 10px over 320ms with linear timing and full opacity; reduced motion and Pause skip this motion. Rail navigation icons are removed; branding remains. On desktop, the upper nav beam sits 24px above the label center, matching the visual gap of narrow layouts.

### Pleat

An original Motiqo SVG sculpture of 25 elastic lamellae. Copy components/originals/pleat.tsx; React is its only dependency. Includes scoped CSS, exponential pointer Lerp, coupled springs, keyboard and touch input, pause/reduced-motion support and complete cleanup. Pleat does not import Hairline or reuse its geometry.


### Arbor, Drawer and Tempo

Each component has its own procedural SVG geometry. Copy arbor.tsx or drawer.tsx together with line-scene.tsx, which owns scoped styles, exponential Lerp, exact damped springs and the visibility/input lifecycle. Tempo also needs line-solid.ts. No figure library is imported. Arbor propagates local gusts through a rooted branching structure. Drawer opens and pins three trays. Tempo moves six shaded spheres in one direction, with a fifth-order grow/shrink envelope at the conveyor ends. It uses a solid portal and shared depth ordering instead of the former single bishop and return journey. All support compact/paused props, keyboard and touch, reduced motion, 30fps narrow previews and full cleanup.

Linework is the catalog category for Gyro, Lantern, Relay, Arbor, Drawer, Tempo and Pleat. Isometric remains a technique tag on the projected solids; Arbor is organic linework. Silk Aperture and Gilded Signal keep their Motion and Objects categories.

### Gyro, Lantern and Relay

Copy gyro.tsx, lantern.tsx or relay.tsx with line-scene.tsx and line-solid.ts. The latter is Motiqo's own SVG solid painter: an orthonormal 45°/30° camera, opaque shaded surfaces, back-face culling and depth ordering. Gyro has three nested annular rings and a spring-driven quarter-turn action. Lantern has eight curved, sealed panels on radial hinges that reveal a warm sphere. Relay has five rockers whose joints carry articulated rods; a click launches a delayed pulse through the mechanism. All sleep when settled and inherit the shared input/visibility lifecycle.

Tempo research: [Slow's source](https://github.com/lucasmarkes/hairline/blob/main/packages/hairline/src/figures/slow.ts) uses six pooled objects, one-way phase progression, smooth size envelopes and depth-sorted posts/lintel. [Its camera](https://github.com/lucasmarkes/hairline/blob/main/packages/hairline/src/core/iso.ts) is orthographic, with a 2:1 ground view. Our previous sinusoidal return trip, incorrectly scaled vertical axis and insufficiently occluded arch changed that reading. The new implementation uses independently authored sphere geometry, a fifth-order envelope and Motiqo's palette; it imports no Hairline code or dependency.

`node --test tests/line-sculptures.test.cjs tests/kinetic-sculptures.test.cjs tests/prompt-control.test.cjs` checks forward recycling, clock dilation, geometric responses, wave timing, keyboard/pin behavior, pause/reduced motion, suspension, resource cleanup and the complete original catalog.
