export type ElementId = 'silk-aperture' | 'gilded-signal' | 'pleat' | 'arbor' | 'drawer' | 'tempo' | 'gyro' | 'lantern' | 'relay';
export type SourceFile = { name: string; code: string };
export type OriginalSources = Partial<Record<ElementId, SourceFile[]>>;
export type Category = 'All elements' | 'Linework' | 'Motion' | 'Objects';
export type AITool = 'Universal' | 'Claude' | 'ChatGPT' | 'Codex' | 'Cursor';
export const aiTools: AITool[] = ['Universal', 'Claude', 'ChatGPT', 'Codex', 'Cursor'];
export type LibraryElement = {
  id: ElementId; number: string; title: string; category: Exclude<Category, 'All elements'>;
  description: string; hint: string; source: string; sourceUrl: string;
  tags: string[]; dependencies: string[]; code: string; brief: string; original?: boolean;
  previewSize?: 'cinema'; installNote?: string;
};
export const categories: Category[] = ['All elements', 'Linework', 'Motion', 'Objects'];
export const elements: LibraryElement[] = [
  {
    id: 'relay', number: '13', title: 'Relay', category: 'Linework', original: true,
    description: 'A small impulse. A shared response.', hint: 'Click to send the motion onward',
    source: 'Motiqo', sourceUrl: '/docs#relay', tags: ['SVG', 'Isometric', 'Chain reaction'], dependencies: ['React'],
    installNote: 'Copy relay.tsx, line-scene.tsx and line-solid.ts into one folder. All geometry, input smoothing and lifecycle handling are included; only React is required.',
    code: `import Relay from './relay';\n\nexport default function Reaction() {\n  return <Relay />;\n}`,
    brief: 'Integrate Motiqo Relay, a mechanical row of five spring-driven rockers joined by articulated rods on a solid isometric base. Copy relay.tsx, line-scene.tsx and line-solid.ts. Hover depresses the nearest rocker; click/tap or Space launches a damped motion pulse travelling outward from the selected rocker with a delay between neighbours. Rod endpoints follow the actual lever transforms rather than fixed screen points. Use opaque depth-sorted solids, shaped caps, metal axles and restrained champagne highlights. Preserve exponential Lerp input, arrow-key selection, Home/End, compact/paused props, lower mobile amplitude, reduced motion, sleep when settled, offscreen suspension and cleanup. React is the only dependency.',
  },
  {
    id: 'lantern', number: '12', title: 'Lantern', category: 'Linework', original: true,
    description: 'A quiet shell. A warmer centre.', hint: 'Move closer to reveal the light',
    source: 'Motiqo', sourceUrl: '/docs#lantern', tags: ['SVG', 'Isometric', 'Light'], dependencies: ['React'],
    installNote: 'Copy lantern.tsx, line-scene.tsx and line-solid.ts into one folder. React is the only dependency.',
    code: `import Lantern from './lantern';\n\nexport default function Light() {\n  return <Lantern />;\n}`,
    brief: 'Integrate Motiqo Lantern, eight curved metal petals on radial hinges around a warm spherical light. Copy lantern.tsx, line-scene.tsx and line-solid.ts together. Panels have exterior and interior walls, sealed edges and real thickness. A 2:1 orthographic camera and opaque depth-sorted surfaces hide the bulb when closed and reveal it as the petals open. Frame-independent Lerp and differently tuned damped springs respond to proximity; the glow follows the opening. Click/tap or Space holds it open, arrows steer and Home closes it. Preserve compact/paused props, smaller mobile opening, reduced motion, sleeping at rest, visibility suspension and cleanup. Only React is required.',
  },
  {
    id: 'gyro', number: '11', title: 'Gyro', category: 'Linework', original: true,
    description: 'Three axes. One quiet equilibrium.', hint: 'Move to tilt. Click to turn.',
    source: 'Motiqo', sourceUrl: '/docs#gyro', tags: ['SVG', 'Isometric', 'Inertia'], dependencies: ['React'],
    installNote: 'Copy gyro.tsx, line-scene.tsx and line-solid.ts into one folder. All geometry and CSS are included; only React is required.',
    code: `import Gyro from './gyro';\n\nexport default function Mechanism() {\n  return <Gyro />;\n}`,
    brief: 'Integrate Motiqo Gyro, three nested solid gimbal rings above a calibrated circular plinth. Copy gyro.tsx, line-scene.tsx and line-solid.ts together. The orthographic camera projects real annular surfaces and axle pins; all visible faces and contour segments share depth ordering. Lerp input and separate damped oscillators tilt the rings around different axes. Click or Space advances the inner ring by one spring-driven quarter turn. Preserve arrow keys, Home reset, touch, minimal presentation, compact/paused props, reduced motion, 30fps narrow previews, sleeping at rest and complete cleanup. React is the only dependency.',
  },
  {
    id: 'arbor', number: '08', title: 'Arbor', category: 'Linework', original: true,
    description: 'Rooted in place. Open to a little wind.', hint: 'Move or touch the branches',
    source: 'Motiqo', sourceUrl: '/docs#arbor', tags: ['SVG', 'Elastic', 'Organic'], dependencies: ['React'],
    installNote: 'Copy arbor.tsx and line-scene.tsx into one folder. Only React is required; the shared stage includes scoped CSS and motion cleanup.',
    code: `import Arbor from './arbor';\n\nexport default function Tree() {\n  return <Arbor />;\n}`,
    brief: 'Integrate Arbor, a Motiqo procedural line tree with anchored roots, curved branches, outlined leaves and locally illuminated edges. Copy arbor.tsx and line-scene.tsx from Source code into one folder. Exponential Lerp smooths the hand; damped oscillators propagate wind through parent-child branches. Preserve minimal presentation, touch gusts, arrow-key wind, compact and paused props, reduced motion, offscreen/hidden-tab suspension and cleanup. React is the only dependency.',
  },
  {
    id: 'drawer', number: '09', title: 'Drawer', category: 'Linework', original: true,
    description: 'A little room for what comes next.', hint: 'Hover to open. Click to keep.',
    source: 'Motiqo', sourceUrl: '/docs#drawer', tags: ['SVG', 'Isometric', 'Interactive'], dependencies: ['React'],
    installNote: 'Copy drawer.tsx and line-scene.tsx into one folder. All cabinet geometry and motion are authored for Motiqo; no external figure library is required.',
    code: `import Drawer from './drawer';\n\nexport default function Cabinet() {\n  return <Drawer />;\n}`,
    brief: 'Integrate Motiqo Drawer, an authored isometric cabinet with three chamfered trays, visible interiors, dividers, inset faces and restrained metal handles. Copy drawer.tsx and line-scene.tsx together. Hover opens the nearest tray with a damped spring; click/tap pins or releases it. Arrow keys select trays and Enter/Space pins them. Preserve Lerp input, scaled mobile movement, compact and paused props, reduced motion, viewport suspension and complete cleanup. React is the only dependency. Inspiration is the physical drawer interaction, not borrowed Hairline geometry or code.',
  },
  {
    id: 'tempo', number: '10', title: 'Tempo', category: 'Linework', original: true,
    description: 'Six spheres. A slower passage.', hint: 'Move closer to slow time',
    source: 'Motiqo', sourceUrl: '/docs#tempo', tags: ['SVG', 'Isometric', 'Volumetric'], dependencies: ['React'],
    installNote: 'Copy tempo.tsx, line-scene.tsx and line-solid.ts into one folder. The conveyor, solid portal and six spheres use an orthographic SVG camera; React is the only dependency.',
    code: `import Tempo from './tempo';\n\nexport default function Procession() {\n  return <Tempo />;\n}`,
    brief: 'Integrate Motiqo Tempo, six shaded spheres travelling one way on a thin isometric conveyor. Copy tempo.tsx, line-scene.tsx and line-solid.ts. Use an orthonormal 45-degree azimuth and 30-degree elevation camera, real solid gate posts and lintel, opaque sphere silhouettes with front-only curved surface arcs, and depth ordering shared by spheres and gate. Each sphere grows in and shrinks out with a fifth-order envelope before wrapping invisibly; never reverse the procession. Hover smoothly dilates the clock and lifts only the nearest sphere. Click or Space keeps the slower tempo. Preserve Lerp pointer, touch/keyboard, paused/compact props, reduced motion, 30fps on narrow previews, viewport suspension and cleanup. React is the only dependency.',
  },
  {
    id: 'pleat', number: '07', title: 'Pleat', category: 'Linework', original: true,
    description: 'Twenty-five folds. One quiet ripple.', hint: 'Move or touch to open the folds',
    source: 'Motiqo', sourceUrl: '/docs#pleat',
    tags: ['SVG', 'Elastic', 'Isometric'], dependencies: ['React'],
    installNote: 'Save the complete source as pleat.tsx. All geometry, motion and CSS are included; only React is required.',
    code: `import Pleat from './pleat';\n\nexport default function Sculpture() {\n  return <Pleat />;\n}`,
    brief: 'Integrate Pleat, an original Motiqo SVG sculpture of 25 curved lamellae on an orthographic plinth. Copy the complete pleat.tsx source from the Code panel. No Hairline or animation library is used. Smooth pointer input with frame-rate independent exponential Lerp; neighbour-coupled damped springs open a local cavity and restore the sculpture. Preserve subtle champagne edge highlights, minimal presentation, touch and arrow-key interaction, compact and paused props, reduced motion, viewport and hidden-tab suspension, and complete listener/observer/RAF cleanup.',
  },
  {
    id: 'gilded-signal', number: '06', title: 'Gilded Signal', category: 'Objects', original: true, previewSize: 'cinema',
    description: 'An engraved artifact. A little light, a lot of character.', hint: 'Move, drag or turn the card',
    source: 'Motiqo', sourceUrl: '/docs#gilded-signal',
    tags: ['WebGL', 'Holographic', 'Interactive'], dependencies: ['React', 'Three.js'],
    installNote: 'Copy the four source files into the same folder. Install three and @types/three. Supply your backgroundSrc and emblemSrc assets; defaults use Motiqo’s media and SVG.',
    code: `import GildedCard from './gilded-card';\n\nexport default function Artifact() {\n  return <GildedCard\n    backgroundSrc="/media/atmosphere.webp"\n    emblemSrc="/branding/Isotype.svg"\n  />;\n}`,
    brief: 'Integrate Gilded Signal, an original Motiqo interpretation of an engraved holographic card. Copy all four source files from the Source code panel into one directory. Use React and Three.js (implementation built with 0.172.0), with SVGLoader from three/addons. A real beveled frame has an arched aperture, four-channel engraving atlas, foil shader, suspended extruded Motiqo SVG emblem and a separately printed reverse. The background combines supplied artwork, procedural smoke, additive filaments, dust and a GPU displacement field on desktop. Provide local backgroundSrc and emblemSrc paths. Keep pointer input scoped to the canvas, exponential interpolation, drag inertia, Turn control and host pause support, reduced motion, low mobile quality, viewport suspension and GPU cleanup. Only one card is implemented; there is no chapter navigation or card-to-card cable. compact enables the gallery version; paused follows the host control.',
  },
  {
    id: 'silk-aperture', number: '05', title: 'Silk Aperture', category: 'Motion', original: true,
    description: 'An architectural reveal. A slower kind of motion.', hint: 'Move or tap to reveal the light',
    source: 'Motiqo', sourceUrl: '/docs#silk-aperture', installNote: 'Save as silk-aperture.tsx. Includes all CSS; only React is required. Minimal by default; control light with dawn or dusk.',
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
export function makePrompt(element: LibraryElement, tool: AITool) {
  return `${adapters[tool]}\n\nElement: ${element.title}\n${element.brief}\n\nDocumentation: ${element.sourceUrl}\nRequired dependencies: ${element.dependencies.join(', ')}.\n${element.original ? (element.installNote || 'Copy the implementation files from the Motiqo Code panel before using this example.') : 'Install the component using its documentation before using these example imports.'}\nPreserve the existing stack; explain any required adaptation. Include keyboard support, responsive sizing and prefers-reduced-motion. Verify the visual and functional result.\n\nUsage example:\n${element.code}`;
}
