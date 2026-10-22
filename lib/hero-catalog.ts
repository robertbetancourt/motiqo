/** Lightweight catalog IDs for navigation, without shipping prompts in the sidebar. */
export const heroIds = ['pavilion', 'diorama', 'arcadia', 'solace', 'aster'] as const;
export type HeroId = (typeof heroIds)[number];
