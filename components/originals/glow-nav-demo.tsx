'use client';
import GlowNav from './glow-nav';
export default function GlowNavDemo({compact=false,paused=false,duration=.65,accent='var(--accent, #d1b99a)'}:{compact?:boolean;paused?:boolean;duration?:number;accent?:string}){
  return <div className={`glow-nav-demo ${compact?'is-compact':''}`}><style>{`.glow-nav-demo{display:flex;justify-content:center;container-type:inline-size;width:100%;padding:0 18px}.glow-nav-demo .glow-nav{gap:32px;font-size:14px}.glow-nav-demo.is-compact{padding:0 8px}.glow-nav-demo.is-compact .glow-nav{gap:clamp(4px,4cqw,10px);font-size:clamp(8px,4cqw,10px)}.glow-nav-demo.is-compact .gn-link{padding:0 2px;min-height:56px}@media(max-width:550px){.glow-nav-demo:not(.is-compact) .glow-nav{gap:16px;font-size:12px}}`}</style><GlowNav paused={paused} duration={duration} accent={accent}/></div>;
}
