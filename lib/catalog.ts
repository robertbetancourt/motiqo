import { usageFor, type Settings } from './element-controls';
export type ElementId = 'silk-aperture' | 'gilded-signal' | 'pleat' | 'arbor' | 'drawer' | 'tempo' | 'gyro' | 'lantern' | 'crate' | 'liquid-sculpture' | 'liquid-relic' | 'glow-nav' | 'event-horizon' | 'pulse' | 'district' | 'halo';
export type SourceFile = { name: string; code: string };
export type OriginalSources = Partial<Record<ElementId, SourceFile[]>>;
export type Category = 'All elements' | 'Linework' | 'Motion' | 'Objects' | 'Navigation';
export type AITool = 'Universal' | 'Claude' | 'ChatGPT' | 'Codex' | 'Cursor';
export const aiTools: AITool[] = ['Universal', 'Claude', 'ChatGPT', 'Codex', 'Cursor'];
export type LibraryElement = {
  id: ElementId; number: string; title: string; category: Exclude<Category, 'All elements'>;
  description: string; hint: string; source: string; sourceUrl: string;
  tags: string[]; dependencies: string[]; code: string; brief: string; original?: boolean;
  previewSize?: 'cinema'; installNote?: string;
};
export const categories: Category[] = ['All elements', 'Linework', 'Motion', 'Objects', 'Navigation'];
export const elements: LibraryElement[] = [
  {
    id:'halo',number:'21',title:'Halo',category:'Motion',original:true,
    description:'A little disorder. A quiet orbit.',hint:'Move to tilt. Space holds the ordered globe.',source:'Motiqo',sourceUrl:'/docs#installation',tags:['Canvas','Particles','3D'],dependencies:['React'],
    installNote:'Copy halo.tsx and halo-math.ts into one folder. Styles and deterministic particle geometry are included; React is the only dependency.',code:`import Halo from './halo';\n\nexport default function Globe() {\n  return <Halo />;\n}`,
    brief:'Integrate Halo, an authored Motiqo particle globe inspired by the first sphere in the supplied video. A seeded spherical point cloud slowly rotates in three dimensions, then orders itself into dotted latitude bands and returns to the cloud over a 24-second cycle. Use shortest angular interpolation to keep every point on the spherical shell, fifth-order pattern transitions, depth-dependent dot size and opacity, and no connecting lines. A Canvas 2D renderer projects the actual 3D geometry without a WebGL dependency. Pointer and touch input use exponential Lerp to steer the axes and create a restrained local ripple. Arrow keys steer, Space holds the ordered globe, Home resets. Configure speed, intensity, count and dotSize. Preserve a matching SVG fallback, dark/light ink, paused and static reduced motion, lower mobile density and 30fps, offscreen/hidden suspension and full RAF/timer/listener/observer cleanup. Implement only this first globe.',
  },
  {
    id:'district',number:'20',title:'District',category:'Linework',original:true,
    description:'A city of little possibilities.',hint:'Explore a building. Click to keep its light.',source:'Motiqo',sourceUrl:'/docs#installation',tags:['SVG','Isometric','Architecture'],dependencies:['React'],
    installNote:'Copy district.tsx, line-scene.tsx and line-solid.ts into one folder.',code:`import District from './district';\n\nexport default function City() {\n  return <District />;\n}`,
    brief:'Integrate District, an original Motiqo isometric city with sixteen independently authored stepped buildings, fine floor contours, pavements and roads. Use the shared orthographic SVG camera and solid painter for projected depth and occlusion. Hit-test projected visible building faces from front to back. Hover highlights the selected volume in coral with a smoothly positioned label; click or Space pins it, arrows browse, Home and End select the ends. Preserve exponential Lerp input, intensity and speed, reduced motion, touch, compact and paused props, offscreen suspension, sleep at rest and cleanup.',
  },
  {
    id:'pulse',number:'19',title:'Pulse',category:'Motion',original:true,
    description:'A signal, slowly taking shape.',hint:'Explore the timeline. Space replays the line.',source:'Motiqo',sourceUrl:'/docs#installation',tags:['SVG','Chart','Timeline'],dependencies:['React'],
    installNote:'Copy pulse.tsx. Styling is included. The deterministic dataset is sample activity, not a live feed.',code:`import Pulse from './pulse';\n\nexport default function Signal() {\n  return <Pulse />;\n}`,
    brief:'Integrate Motiqo Pulse, a minimal dark activity card with a fine progressively drawn SVG line, subtle area fade, metric, time labels and cursor crosshair. Use deterministic sample data, a cubic reveal and slow evolving signal. Exponential Lerp smooths the pointer and crosshair presence; touch and arrow keys inspect the timeline, Space or Replay redraws it. Configure speed, amplitude and accent. Preserve compact and paused props, static reduced motion, 30fps small displays, hidden/offscreen suspension and complete RAF/observer/listener cleanup. React is the only dependency.',
  },
  {
    id:'event-horizon',number:'18',title:'Event Horizon',category:'Motion',original:false,
    description:'Where light comes undone.',hint:'Move or touch to disturb the accretion disk.',source:'Motiqo',sourceUrl:'/docs#installation',tags:['WebGL2','Particles','Cosmic'],dependencies:['React'],
    installNote:'Copy event-horizon.tsx, liquid-relic.tsx, liquid-particle-engine.ts and liquid-particle-shaders.ts into one folder. Save event-horizon.svg in public/media. The original black-hole artwork is Motiqo’s; retain the particle engine credit to Guglielmo Giannattasio.',code:`import EventHorizon from './event-horizon';\n\nexport default function BlackHole() {\n  return <EventHorizon />;\n}`,
    brief:'Integrate Motiqo Event Horizon, an authored black-hole illustration with a dark shadow, photon ring, lensed upper arc and copper/champagne accretion filaments. It uses the same credited GPU particle engine as Liquid Relic to dissolve and reconstruct the artwork around the hand. Preserve the original flow-map wake, curl advection and elastic return. Expose resting finish, strength, radius, particleSpread, liquid, returnSpeed and sculptureScale. Preserve Lerp pointer input, touch and keyboard, lower mobile density, static reduced motion, fallback image, visibility suspension and full GPU/listener/observer cleanup. Changing the artwork does not remove the engine attribution.',
  },
  {
    id:'liquid-relic',number:'17',title:'Liquid Relic',category:'Motion',original:false,
    description:'Metal, momentarily undone.',hint:'Move or touch to dissolve the metal into particles.',
    source:'Motiqo',sourceUrl:'/docs#installation',tags:['WebGL2','Particles','Flow'],dependencies:['React'],
    installNote:'Copy liquid-relic.tsx, liquid-particle-engine.ts and liquid-particle-shaders.ts into one folder. Save liquid-relic.svg under public/media, or supply your own CORS-readable src. Retain the engine credit to Guglielmo Giannattasio; the metallic Motiqo artwork and presentation are authored for Motiqo.',
    code:`import LiquidRelic from './liquid-relic';\n\nexport default function Sculpture() {\n  return <LiquidRelic src="/media/liquid-relic.svg" />;\n}`,
    brief:'Integrate Liquid Relic, Motiqo’s metallic emblem using the particle dynamics adapted from the supplied Sculpture Hero by Guglielmo Giannattasio. Keep its original GPU flow-map wake, curl-noise advection, complementary image/particle dissolve, velocity-stretched streaks and elastic return. Motiqo provides its own local artwork and minimal presentation, without the reference hero text or navigation. Configure strength, radius, particleSpread, liquid, returnSpeed, restStyle and sculptureScale. Preserve exponential Lerp pointer input, touch and keyboard stirring, paused/static reduced motion, lower mobile particle density and 30fps, visibility suspension, fresh canvases per lifecycle, static image fallback and complete GPU/listener/observer/RAF cleanup.',
  },
  {
    id:'crate',number:'14',title:'Crate',category:'Linework',original:true,
    description:'A record of good motion.',hint:'Browse the records. Click to keep one.',source:'Motiqo',sourceUrl:'/docs#installation',
    tags:['WebGL','Isometric','Vinyl'],dependencies:['React','Three.js'],installNote:'Copy crate.tsx and crate-scene.ts into one folder. Install three and @types/three for TypeScript.',
    code:`import Crate from './crate';\n\nexport default function Records() {\n  return <Crate />;\n}`,
    brief:'Integrate Motiqo Crate, a shelf of solid vinyl records rendered with Three.js and an orthographic camera. Real depth testing keeps labels, grooves and shelf walls correctly occluded. A fixed pitch and bounded lean keep records separated. Exponential Lerp input drives critically damped springs to lift the nearest record. Click/tap or Space pins it; arrow keys browse and Home/End reach the ends. Configure count (3–10), intensity and speed. Preserve compact/paused props, reduced motion, sleeping at rest, visibility suspension, static fallback and full GPU/observer/listener cleanup.',
  },
  {
    id:'liquid-sculpture',number:'15',title:'Liquid Form',category:'Motion',original:true,
    description:'Matter, shaped by your hand.',hint:'Move or touch to turn and shape the metal.',source:'Motiqo',sourceUrl:'/docs#installation',
    tags:['WebGL2','Procedural','Liquid'],dependencies:['React'],
    installNote:'Copy liquid-form.tsx and liquid-form-shaders.ts into one folder. No images or additional packages are required.',
    code:`import LiquidForm from './liquid-form';\n\nexport default function Sculpture() {\n  return <LiquidForm shape="knot" />;\n}`,
    brief:'Integrate Motiqo Liquid Form, an independently authored native WebGL2 sculpture. Signed-distance fields and ray marching generate Knot, Orbit and Bloom forms with procedural ridges, flowing surface deformation and metallic studio lighting. No sculpture image or external engine is used. Configure shape, liquidity, relief, scale and tint. Pointer position and presence use frame-independent exponential Lerp. Preserve keyboard/touch input, SVG fallback, static reduced motion, capped pixel density, sleeping at rest, offscreen/hidden-tab suspension and shader/buffer/context/listener cleanup.',
  },
  {
    id:'glow-nav',number:'16',title:'Glow Nav',category:'Navigation',original:true,
    description:'A little light, a clear direction.',hint:'Hover or select a destination.',source:'Motiqo',sourceUrl:'/docs#installation',
    tags:['Lerp','Navigation','Ambient'],dependencies:['React'],
    installNote:'Copy glow-nav.tsx. Styling is scoped and included. Pass items, activeId and onSelect; optionally use renderLink for your framework router.',
    code:`import GlowNav from './glow-nav';\n\nexport default function Navigation() {\n  return <GlowNav items={[{ id: 'home', label: 'Home', href: '/' }, { id: 'library', label: 'Library', href: '/library' }]} activeId="home" onSelect={() => {}} />;\n}`,
    brief:'Integrate Motiqo Glow Nav, a minimal navigation with Home, Projects, Search and Settings defaults. A single light field glides between destinations; pointer input, position, width and opacity use frame-independent exponential Lerp. There is no logo, divider or dropdown. Configure items with id/label/href, activeId, onSelect, duration and accent. Use renderLink for your framework router. Preserve native keyboard navigation, thin white focus, paused and reduced-motion support, and complete RAF/ResizeObserver/media-query cleanup. React is the only dependency.',
  },
  {
    id: 'lantern', number: '12', title: 'Lantern', category: 'Linework', original: true,
    description: 'A quiet shell. A warmer centre.', hint: 'Move closer to reveal the light',
    source: 'Motiqo', sourceUrl: '/docs#installation', tags: ['SVG', 'Isometric', 'Light'], dependencies: ['React'],
    installNote: 'Copy lantern.tsx, line-scene.tsx and line-solid.ts into one folder. React is the only dependency.',
    code: `import Lantern from './lantern';\n\nexport default function Light() {\n  return <Lantern />;\n}`,
    brief: 'Integrate Motiqo Lantern, eight curved metal petals on radial hinges around a warm spherical light. Copy lantern.tsx, line-scene.tsx and line-solid.ts together. Panels have exterior and interior walls, sealed edges and real thickness. A 2:1 orthographic camera and opaque depth-sorted surfaces hide the bulb when closed and reveal it as the petals open. Frame-independent Lerp and differently tuned damped springs respond to proximity; the glow follows the opening. Click/tap or Space holds it open, arrows steer and Home closes it. Preserve compact/paused props, smaller mobile opening, reduced motion, sleeping at rest, visibility suspension and cleanup. Only React is required.',
  },
  {
    id: 'gyro', number: '11', title: 'Gyro', category: 'Linework', original: true,
    description: 'Three axes. One quiet equilibrium.', hint: 'Move to tilt. Click to turn.',
    source: 'Motiqo', sourceUrl: '/docs#installation', tags: ['SVG', 'Isometric', 'Inertia'], dependencies: ['React'],
    installNote: 'Copy gyro.tsx, line-scene.tsx and line-solid.ts into one folder. All geometry and CSS are included; only React is required.',
    code: `import Gyro from './gyro';\n\nexport default function Mechanism() {\n  return <Gyro />;\n}`,
    brief: 'Integrate Motiqo Gyro, three nested solid gimbal rings floating above a calibrated circular plinth, with no support posts or crossing rods. Copy gyro.tsx, line-scene.tsx and line-solid.ts together. The orthographic camera projects real annular surfaces; all faces and contour segments share depth ordering. Lerp input and separate damped oscillators tilt the rings around different axes. Click or Space advances the inner ring by one spring-driven quarter turn. Preserve arrow keys, Home reset, touch, minimal presentation, compact/paused props, reduced motion, 30fps narrow previews, sleeping at rest and complete cleanup. React is the only dependency.',
  },
  {
    id: 'arbor', number: '08', title: 'Arbor', category: 'Linework', original: true,
    description: 'Rooted in place. Open to a little wind.', hint: 'Move or touch the branches',
    source: 'Motiqo', sourceUrl: '/docs#installation', tags: ['SVG', 'Elastic', 'Organic'], dependencies: ['React'],
    installNote: 'Copy arbor.tsx and line-scene.tsx into one folder. Only React is required; the shared stage includes scoped CSS and motion cleanup.',
    code: `import Arbor from './arbor';\n\nexport default function Tree() {\n  return <Arbor />;\n}`,
    brief: 'Integrate Arbor, a Motiqo procedural line tree with anchored roots, curved branches, outlined leaves and locally illuminated edges. Copy arbor.tsx and line-scene.tsx from Source code into one folder. Exponential Lerp smooths the hand; damped oscillators propagate wind through parent-child branches. Preserve minimal presentation, touch gusts, arrow-key wind, compact and paused props, reduced motion, offscreen/hidden-tab suspension and cleanup. React is the only dependency.',
  },
  {
    id: 'drawer', number: '09', title: 'Drawer', category: 'Linework', original: true,
    description: 'A little room for what comes next.', hint: 'Hover to open. Click to keep.',
    source: 'Motiqo', sourceUrl: '/docs#installation', tags: ['SVG', 'Isometric', 'Interactive'], dependencies: ['React'],
    installNote: 'Copy drawer.tsx and line-scene.tsx into one folder. All cabinet geometry and motion are authored for Motiqo; no external figure library is required.',
    code: `import Drawer from './drawer';\n\nexport default function Cabinet() {\n  return <Drawer />;\n}`,
    brief: 'Integrate Motiqo Drawer, an authored isometric cabinet with three chamfered trays, visible interiors, dividers, inset faces and restrained metal handles. Copy drawer.tsx and line-scene.tsx together. Hover opens the nearest tray with a damped spring; click/tap pins or releases it. Arrow keys select trays and Enter/Space pins them. Preserve Lerp input, scaled mobile movement, compact and paused props, reduced motion, viewport suspension and complete cleanup. React is the only dependency.',
  },
  {
    id: 'tempo', number: '10', title: 'Tempo', category: 'Linework', original: true,
    description: 'Six spheres. A slower passage.', hint: 'Move closer to slow time',
    source: 'Motiqo', sourceUrl: '/docs#installation', tags: ['SVG', 'Isometric', 'Volumetric'], dependencies: ['React'],
    installNote: 'Copy tempo.tsx, line-scene.tsx and line-solid.ts into one folder. The conveyor, solid portal and six spheres use an orthographic SVG camera; React is the only dependency.',
    code: `import Tempo from './tempo';\n\nexport default function Procession() {\n  return <Tempo />;\n}`,
    brief: 'Integrate Motiqo Tempo, six shaded spheres travelling one way on a thin isometric conveyor. Copy tempo.tsx, line-scene.tsx and line-solid.ts. Use an orthonormal 45-degree azimuth and 30-degree elevation camera, real solid gate posts and lintel, opaque sphere silhouettes with front-only curved surface arcs, and depth ordering shared by spheres and gate. Each sphere grows in and shrinks out with a fifth-order envelope before wrapping invisibly; never reverse the procession. Hover smoothly dilates the clock and lifts only the nearest sphere. Click or Space keeps the slower tempo. Preserve Lerp pointer, touch/keyboard, paused/compact props, reduced motion, 30fps on narrow previews, viewport suspension and cleanup. React is the only dependency.',
  },
  {
    id: 'pleat', number: '07', title: 'Pleat', category: 'Linework', original: true,
    description: 'Twenty-five folds. One quiet ripple.', hint: 'Move or touch to open the folds',
    source: 'Motiqo', sourceUrl: '/docs#installation',
    tags: ['SVG', 'Elastic', 'Isometric'], dependencies: ['React'],
    installNote: 'Save the complete source as pleat.tsx. All geometry, motion and CSS are included; only React is required.',
    code: `import Pleat from './pleat';\n\nexport default function Sculpture() {\n  return <Pleat />;\n}`,
    brief: 'Integrate Pleat, an original Motiqo SVG sculpture of 25 curved lamellae on an orthographic plinth. Copy the complete pleat.tsx source from the Code panel. Smooth pointer input with frame-rate independent exponential Lerp; neighbour-coupled damped springs open a local cavity and restore the sculpture. Preserve subtle champagne edge highlights, minimal presentation, touch and arrow-key interaction, compact and paused props, reduced motion, viewport and hidden-tab suspension, and complete listener/observer/RAF cleanup.',
  },
  {
    id: 'gilded-signal', number: '06', title: 'Gilded Signal', category: 'Objects', original: true, previewSize: 'cinema',
    description: 'An engraved artifact. A little light, a lot of character.', hint: 'Move, drag or turn the card',
    source: 'Motiqo', sourceUrl: '/docs#installation',
    tags: ['WebGL', 'Holographic', 'Interactive'], dependencies: ['React', 'Three.js'],
    installNote: 'Copy the four source files into the same folder. Install three and @types/three. Supply your backgroundSrc and emblemSrc assets; defaults use Motiqo’s media and SVG.',
    code: `import GildedCard from './gilded-card';\n\nexport default function Artifact() {\n  return <GildedCard\n    backgroundSrc="/media/atmosphere.webp"\n    emblemSrc="/branding/Isotype.svg"\n  />;\n}`,
    brief: 'Integrate Gilded Signal, an original Motiqo interpretation of an engraved holographic card. Copy all four source files from the Source code panel into one directory. Use React and Three.js (implementation built with 0.172.0), with SVGLoader from three/addons. A real beveled frame has an arched aperture, four-channel engraving atlas, foil shader, suspended extruded Motiqo SVG emblem and a separately printed reverse. The background combines supplied artwork, procedural smoke, additive filaments, dust and a GPU displacement field on desktop. Provide local backgroundSrc and emblemSrc paths. Keep pointer input scoped to the canvas, exponential interpolation, drag inertia, Turn control and host pause support, reduced motion, low mobile quality, viewport suspension and GPU cleanup. Only one card is implemented; there is no chapter navigation or card-to-card cable. compact enables the gallery version; paused follows the host control.',
  },
  {
    id: 'silk-aperture', number: '05', title: 'Silk Aperture', category: 'Motion', original: true,
    description: 'An architectural reveal. A slower kind of motion.', hint: 'Move or tap to reveal the light',
    source: 'Motiqo', sourceUrl: '/docs#installation', installNote: 'Save as silk-aperture.tsx. Includes all CSS; only React is required. Minimal by default; control light with dawn or dusk.',
    tags: ['SVG', 'Lerp', 'Reveal'], dependencies: ['React'],
    code: `import SilkAperture from './silk-aperture';\n\nexport default function Preview() {\n  return <SilkAperture minimal light="dusk" />;\n}`,
    brief: 'Integrate the original Motiqo Silk Aperture component. Copy the complete self-contained TSX implementation from its Code panel; it only requires React and includes scoped CSS. An illustrated arch is veiled by 23 metallic ribs that bow and spread with frame-rate independent exponential Lerp. Use obsidian, ivory, copper and sage. Keep the minimal view with only The Art of Being Elsewhere over the illustration. Place Dawn/Dusk controls outside the component and pass the controlled light prop. Preserve unique SVG IDs, reduced motion, pause support and cleanup. Rich header, subtitle and CTA are opt-in with minimal=false; do not invent a booking destination.',
  },

];
const adapters: Record<AITool, string> = {
  Universal: 'Implement the element described below in the existing project. Follow its conventions, explain any required adaptation, and verify the result.',
  Claude: 'Inspect the existing project and explain the integration approach briefly before implementing it. Follow its conventions and verify the final result.',
  ChatGPT: 'Review the supplied project context. Explain the integration and provide the complete implementation and verification steps. Ask for missing project files when needed rather than assuming their contents.',
  Codex: 'Read the repository instructions, find the appropriate integration point, implement the element, and run the relevant checks. Summarize what changed and what you verified.',
  Cursor: 'Use the current repository context and project rules. Integrate the element with existing components and styling, then check its behavior and responsiveness.',
};
export function makePrompt(element: LibraryElement, tool: AITool, settings?: Settings) {
  return `${adapters[tool]}\n\nElement: ${element.title}\n${element.brief}\n\nDocumentation: ${element.sourceUrl}\nRequired dependencies: ${element.dependencies.join(', ')}.\n${element.installNote || 'Copy the implementation files from the Motiqo Source panel before using this example.'}\nPreserve the existing stack; explain any required adaptation. Include keyboard support, responsive sizing and prefers-reduced-motion. Verify the visual and functional result.\n\nUsage example:\n${usageFor(element,settings)}`;
}
