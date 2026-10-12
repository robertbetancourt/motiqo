export type ElementId = 'magnet-lines' | 'circular-text' | 'folder-float' | 'terrain' | 'silk-aperture' | 'gilded-signal';
export type SourceFile = { name: string; code: string };
export type OriginalSources = Partial<Record<ElementId, SourceFile[]>>;
export type Category = 'All elements' | 'Motion' | 'Typography' | 'Objects';
export type AITool = 'Universal' | 'Claude' | 'ChatGPT' | 'Codex' | 'Cursor';
export const aiTools: AITool[] = ['Universal', 'Claude', 'ChatGPT', 'Codex', 'Cursor'];
export type LibraryElement = {
  id: ElementId; number: string; title: string; category: Exclude<Category, 'All elements'>;
  description: string; hint: string; source: string; sourceUrl: string;
  tags: string[]; dependencies: string[]; code: string; brief: string; original?: boolean;
  previewSize?: 'cinema'; installNote?: string;
};
export const categories: Category[] = ['All elements', 'Motion', 'Typography', 'Objects'];
export const elements: LibraryElement[] = [
  {
    id: 'gilded-signal', number: '06', title: 'Gilded Signal', category: 'Objects', original: true, previewSize: 'cinema',
    description: 'An engraved artifact. A little light, a lot of character.', hint: 'Move, drag or turn the card',
    source: 'Motiqo', sourceUrl: '/docs#gilded-signal',
    tags: ['WebGL', 'Holographic', 'Original'], dependencies: ['React', 'Three.js'],
    installNote: 'Copy the four source files into the same folder. Install three and @types/three. Supply your backgroundSrc and emblemSrc assets; defaults use Motiqo’s media and SVG.',
    code: `import GildedCard from './gilded-card';\n\nexport default function Artifact() {\n  return <GildedCard\n    backgroundSrc="/media/atmosphere.webp"\n    emblemSrc="/branding/Isotype.svg"\n  />;\n}`,
    brief: 'Integrate Gilded Signal, an original Motiqo interpretation of an engraved holographic card. Copy all four source files from the Source code panel into one directory. Use React and Three.js (implementation built with 0.172.0), with SVGLoader from three/addons. A real beveled frame has an arched aperture, four-channel engraving atlas, foil shader, suspended extruded Motiqo SVG emblem and a separately printed reverse. The background combines supplied artwork, procedural smoke, additive filaments, dust and a GPU displacement field on desktop. Provide local backgroundSrc and emblemSrc paths. Keep pointer input scoped to the canvas, exponential interpolation, drag inertia, Turn and Pause controls, reduced motion, low mobile quality, viewport suspension and GPU cleanup. Only one card is implemented; there is no chapter navigation or card-to-card cable. compact enables the gallery version; paused follows the host control.',
  },
  {
    id: 'silk-aperture', number: '05', title: 'Silk Aperture', category: 'Motion', original: true,
    description: 'An architectural reveal. A slower kind of motion.', hint: 'Move or tap to reveal the light',
    source: 'Motiqo', sourceUrl: '/docs#silk-aperture', installNote: 'Save as silk-aperture.tsx. Includes all CSS; only React is required. Minimal by default; control light with dawn or dusk.',
    tags: ['Original', 'Lerp', 'SVG'], dependencies: ['React'],
    code: `import SilkAperture from './silk-aperture';\n\nexport default function Preview() {\n  return <SilkAperture minimal light="dusk" />;\n}`,
    brief: 'Integrate the original Motiqo Silk Aperture component. Copy the complete self-contained TSX implementation from its Code panel; it only requires React and includes scoped CSS. An illustrated arch is veiled by 23 metallic ribs that bow and spread with frame-rate independent exponential Lerp. Use obsidian, ivory, copper and sage. Keep the minimal view with only The Art of Being Elsewhere over the illustration. Place Dawn/Dusk controls outside the component and pass the controlled light prop. Preserve unique SVG IDs, reduced motion, pause support and cleanup. Rich header, subtitle and CTA are opt-in with minimal=false; do not invent a booking destination.',
  },
  {
    id: 'magnet-lines', number: '01', title: 'Magnet Lines', category: 'Motion',
    description: 'A field of lines. A little attraction.', hint: 'Move your pointer',
    source: 'React Bits', sourceUrl: 'https://reactbits.dev/animations/magnet-lines',
    tags: ['Interactive', 'Pointer'], dependencies: ['React'],
    code: `import MagnetLines from './MagnetLines';\n\nexport default function Demo() {\n  return (\n    <MagnetLines\n      rows={9}\n      columns={11}\n      containerSize="260px"\n      lineColor="#ec7668"\n      lineWidth="2px"\n      lineHeight="15px"\n    />\n  );\n}`,
    brief: 'Create a compact grid of thin coral lines that rotate toward the pointer. Use a dark background, preserve generous spacing, and stop pointer animation when reduced motion is requested.',
  },
  {
    id: 'circular-text', number: '02', title: 'Circular Text', category: 'Typography',
    description: 'Words that take the scenic route.', hint: 'Hover to slow down',
    source: 'React Bits', sourceUrl: 'https://reactbits.dev/text-animations/circular-text',
    tags: ['Loop', 'Hover'], dependencies: ['React', 'Motion'],
    code: `import CircularText from './CircularText';\n\nexport default function Demo() {\n  return (\n    <CircularText\n      text="GOOD THINGS TAKE A LITTLE MOTION · "\n      spinDuration={24}\n      onHover="slowDown"\n    />\n  );\n}`,
    brief: 'Arrange the phrase GOOD THINGS TAKE A LITTLE MOTION around a circle, with slow continuous rotation. Slow down on hover and provide a static readable version for reduced motion. Place a small geometric mark at its center.',
  },
  {
    id: 'folder-float', number: '03', title: 'Folder Float', category: 'Objects',
    description: 'A home for your next bright idea.', hint: 'Click the folder',
    source: 'React Bits', sourceUrl: 'https://reactbits.dev/micro/folder-float',
    tags: ['Microinteraction', 'Click'], dependencies: ['React', 'Matter.js'],
    code: `import FolderFloat from './FolderFloat';\n\nexport default function Demo() {\n  return (\n    <FolderFloat\n      label="Little ideas"\n      items={['Make it move', 'Stay curious', 'Try something']}\n      trigger="click"\n      folderColor="#ac4037"\n      frontColor="#db6554"\n      paperColor="#f3dcc4"\n      physics={false}\n    />\n  );\n}`,
    brief: 'Build a coral folder with layered cream papers. Clicking it reveals three idea labels with a gentle spring. Support Enter and Space, preserve focus, and use a static open state when motion is reduced.',
  },
  {
    id: 'terrain', number: '04', title: 'Terrain', category: 'Objects',
    description: 'A landscape, drawn in a single language.', hint: 'Explore with your pointer',
    source: 'Hairline', sourceUrl: 'https://hairline.lucasmarkes.com/figures#data',
    tags: ['Isometric', 'SVG'], dependencies: ['React', '@lucasmarkes/hairline'],
    code: `import { Terrain } from '@lucasmarkes/hairline/react';\n\nexport default function Page() {\n  return <Terrain />;\n}`,
    brief: 'Integrate the Terrain figure from @lucasmarkes/hairline/react in a responsive dark preview, with delicate muted ivory lines. Preserve its pointer interaction and accessible reduced-motion behavior.',
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
