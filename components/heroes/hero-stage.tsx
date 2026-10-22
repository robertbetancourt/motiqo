'use client';
import dynamic from 'next/dynamic';
import type {HeroId} from '@/lib/heroes';
const Atelier=dynamic(()=>import('./atelier-hero'),{ssr:false});
const Diorama=dynamic(()=>import('./diorama-hero'),{ssr:false});
const Arcadia=dynamic(()=>import('./arcadia-hero'),{ssr:false});
const Solace=dynamic(()=>import('./solace-hero'),{ssr:false});
export default function HeroStage({id,paused=false}:{id:HeroId;paused?:boolean}){
 if(id==='pavilion'||(id as string)==='atelier')return <Atelier paused={paused}/>;
 if(id==='diorama')return <Diorama paused={paused}/>;
 if(id==='arcadia')return <Arcadia paused={paused}/>;
 return <Solace paused={paused}/>;
}
