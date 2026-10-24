/** Lightweight catalog IDs for navigation, without shipping prompts in the sidebar. */
export const heroIds = ['pavilion', 'diorama', 'arcadia', 'solace', 'aster', 'noema', 'aevora', 'florra', 'sprig', 'sway', 'kinetic-nebula', 'luminary', 'zenith-beam', 'bio-terrain'] as const;
export type HeroId = (typeof heroIds)[number];
