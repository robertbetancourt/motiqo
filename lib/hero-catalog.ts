/** Lightweight catalog IDs for navigation, without shipping prompts in the sidebar. */
export const heroIds = ['atelier', 'diorama', 'arcadia', 'solace'] as const;
export type HeroId = (typeof heroIds)[number];
