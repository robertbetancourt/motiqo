import { usageFor, type Settings } from './element-controls';
import * as registry from '../registry/manifest.json';
import type {ElementId} from '../registry/element-ids';
export type {ElementId} from '../registry/element-ids';
export type SourceFile = { name: string; code: string };
export type OriginalSources = Partial<Record<ElementId, SourceFile[]>>;
export type Category = 'All elements' | 'Linework' | 'Motion' | 'Objects' | 'Navigation';
export type AITool = 'Universal' | 'Claude' | 'ChatGPT' | 'Codex' | 'Cursor';
export const aiTools: AITool[] = ['Universal', 'Claude', 'ChatGPT', 'Codex', 'Cursor'];
export type LibraryElement = {
  id: ElementId; number: string; title: string; category: Exclude<Category, 'All elements'>;
  description: string; hint: string; source: string; sourceUrl: string;
  tags: string[]; dependencies: string[]; code: string; brief: string; original?: boolean;
  previewSize?: 'cinema'; installNote?: string; addedAt?: string;
};
export const categories: Category[] = ['All elements', 'Linework', 'Motion', 'Objects', 'Navigation'];
// New additions lead the collection; ties preserve their editorial registry order.
export const elements = [...registry.items as unknown as LibraryElement[]].sort((a,b)=>(b.addedAt ?? '').localeCompare(a.addedAt ?? ''));

export function isElementNew(element?: { addedAt?: string } | null): boolean {
  if (!element?.addedAt) return false;
  const added = new Date(element.addedAt).getTime();
  if (Number.isNaN(added)) return false;
  const twoWeeksMs = 14 * 24 * 60 * 60 * 1000;
  const diff = Date.now() - added;
  return diff >= 0 && diff <= twoWeeksMs;
}

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
