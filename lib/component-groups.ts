import * as registry from '../registry/manifest.json';

export function isElementNew(element?: { addedAt?: string } | null): boolean {
  if (!element?.addedAt) return false;
  const added = new Date(element.addedAt).getTime();
  if (Number.isNaN(added)) return false;
  const twoWeeksMs = 14 * 24 * 60 * 60 * 1000;
  const diff = Date.now() - added;
  return diff >= 0 && diff <= twoWeeksMs;
}

export const componentGroups = [
  { id: 'buttons', title: 'Buttons', section: 'Interface' },
  { id: 'carousels', title: 'Carousels', section: 'Interface' },
  { id: 'navigation', title: 'Navigation', section: 'Interface' },
  { id: 'loaders', title: 'Loaders', section: 'Interface' },
  { id: 'cards', title: 'Cards', section: 'Interface' },
  { id: 'forms', title: 'Forms', section: 'Interface' },
  { id: 'dialogs', title: 'Dialogs', section: 'Interface' },
  { id: 'backgrounds', title: 'Motion & effects', section: 'Visuals' },
  { id: 'typography', title: 'Typography', section: 'Visuals' },
  { id: 'data', title: 'Data visualization', section: 'Visuals' },
  { id: 'objects', title: 'Objects', section: 'Visuals' },
  { id: 'linework', title: 'Linework', section: 'Visuals' },
] as const;

export type ComponentGroup = typeof componentGroups[number]['id'];
type Component = { id: string; category: string; tags: readonly string[] };

/** Give every component one home; specific UI types take priority over visuals. */
export function componentGroupFor(item: Component): ComponentGroup {
  if (item.id.endsWith('-button') || item.tags.includes('Button')) return 'buttons';
  if (item.tags.includes('Carousel')) return 'carousels';
  if (item.category === 'Navigation') return 'navigation';
  if (item.tags.includes('Loader')) return 'loaders';
  if (item.tags.includes('Card')) return 'cards';
  if (item.tags.includes('Form')) return 'forms';
  if (item.tags.includes('Dialog')) return 'dialogs';
  if (item.tags.includes('Typography')) return 'typography';
  if (item.tags.includes('Chart') || item.tags.includes('Data') || item.tags.includes('Score')) return 'data';
  if (item.category === 'Linework') return 'linework';
  if (item.category === 'Objects') return 'objects';
  return 'backgrounds';
}

export function readComponentGroup(value: string | null | undefined): ComponentGroup | undefined {
  return componentGroups.find(group => group.id === value)?.id;
}

const catalogItems = registry.items;
export const componentGroupCounts = Object.fromEntries(componentGroups.map(group => [
  group.id, catalogItems.filter(item => componentGroupFor(item) === group.id).length,
])) as Record<ComponentGroup, number>;

export const newComponentsByGroup = Object.fromEntries(componentGroups.map(group => [
  group.id, catalogItems.filter(item => componentGroupFor(item) === group.id && isElementNew(item as any)).length,
])) as Record<ComponentGroup, number>;
