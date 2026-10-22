import * as catalog from '../registry/hero-prompts.json';
import type {HeroId} from './hero-catalog';
export type {HeroId} from './hero-catalog';
export type HeroEntry={id:HeroId;title:string;tags:string[];prompt:string;poster:string};
export const heroes=catalog.items as HeroEntry[];
export function findHero(id:string|null|undefined){return heroes.find(hero=>hero.id===id);}
export function filterHeroes(query:string,tag=''){const term=query.trim().toLocaleLowerCase();return heroes.filter(hero=>(!tag||hero.tags.includes(tag))&&(!term||[hero.title,...hero.tags].join(' ').toLocaleLowerCase().includes(term)));}
