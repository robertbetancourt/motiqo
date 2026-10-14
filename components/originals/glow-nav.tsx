'use client';
import { useEffect, useLayoutEffect, useRef, useState, type AnchorHTMLAttributes, type CSSProperties, type MouseEvent, type ReactNode } from 'react';
export type GlowNavItem={id:string;label:string;href:string};
export type GlowNavProps={items?:GlowNavItem[];activeId?:string;onSelect?:(item:GlowNavItem,event:MouseEvent<HTMLAnchorElement>)=>void;renderLink?:(props:AnchorHTMLAttributes<HTMLAnchorElement>)=>ReactNode;paused?:boolean;duration?:number;accent?:string;className?:string};
const defaults:GlowNavItem[]=[{id:'home',label:'Home',href:'#home'},{id:'projects',label:'Projects',href:'#projects'},{id:'search',label:'Search',href:'#search'},{id:'settings',label:'Settings',href:'#settings'}];

/** A single light field travels between destinations; labels never swap a highlight abruptly. */
export default function GlowNav({items=defaults,activeId,onSelect,renderLink,paused=false,duration=.65,accent='var(--accent, #d1b99a)',className=''}:GlowNavProps){
  const [selected,setSelected]=useState(items[0]?.id),root=useRef<HTMLElement>(null),wake=useRef<(()=>void)|null>(null);
  const target=useRef({x:0,width:0,spot:.5,opacity:0}),current=useRef({...target.current}),timing=useRef({paused,duration});timing.current={paused,duration};
  const measure=()=>{const host=root.current;if(!host)return;const item=host.querySelector<HTMLElement>('[aria-current=page]');if(!item){target.current.opacity=0;wake.current?.();return;}
    const a=host.getBoundingClientRect(),b=item.getBoundingClientRect();target.current.x=b.left-a.left-6;target.current.width=b.width+12;target.current.opacity=1;wake.current?.();};
  useLayoutEffect(measure,[activeId,selected,items]);
  useEffect(()=>{
    const host=root.current!,media=matchMedia('(prefers-reduced-motion: reduce)');let frame=0,last=0;
    const write=()=>{const s=current.current;host.style.setProperty('--gn-x',`${s.x}px`);host.style.setProperty('--gn-width',`${s.width}px`);host.style.setProperty('--gn-opacity',String(s.opacity));host.style.setProperty('--gn-spot',`${s.spot*100}%`);};
    const tick=(now:number)=>{frame=0;const alpha=1-Math.exp(-Math.min(.06,(now-last)/1000)*7/Math.max(.2,timing.current.duration));last=now;let delta=0;
      for(const key of ['x','width','spot','opacity'] as const){current.current[key]+=(target.current[key]-current.current[key])*alpha;delta+=Math.abs(target.current[key]-current.current[key]);}write();if(delta>.01)frame=requestAnimationFrame(tick);};
    const start=()=>{if(media.matches||timing.current.paused){cancelAnimationFrame(frame);frame=0;Object.assign(current.current,target.current);write();return;}if(!frame){last=performance.now();frame=requestAnimationFrame(tick);}};
    wake.current=start;const resize=new ResizeObserver(measure);resize.observe(host);media.addEventListener('change',start);measure();
    return()=>{cancelAnimationFrame(frame);wake.current=null;resize.disconnect();media.removeEventListener('change',start);};
  },[]);
  useEffect(()=>wake.current?.(),[paused,duration]);
  const active=activeId??selected;
  return <nav ref={root} className={`glow-nav ${className}`} aria-label="Navigation preview" data-paused={paused||undefined} style={{'--gn-accent':accent} as CSSProperties} onPointerMove={event=>{
    if(event.pointerType==='touch'||paused)return;const r=event.currentTarget.getBoundingClientRect();target.current.spot=Math.max(0,Math.min(1,(event.clientX-r.left)/r.width));wake.current?.();
  }}><style>{styles}</style><span className="gn-highlight" aria-hidden="true"><b/>{Array.from({length:7},(_,i)=><i key={i} style={{left:`${8+i*13}%`,animationDelay:`${i*.28}s`}}/>)}</span>{items.map(item=>{
    const props:AnchorHTMLAttributes<HTMLAnchorElement>={href:item.href,'aria-current':active===item.id?'page':undefined,className:'gn-link',onClick:event=>{if(items===defaults&&!onSelect)event.preventDefault();setSelected(item.id);onSelect?.(item,event);},children:item.label};
    return <span key={item.id} className="gn-item">{renderLink?renderLink(props):<a {...props}/>}</span>;
  })}</nav>;
}
const styles=`.glow-nav{--gn-x:0px;--gn-width:0px;--gn-opacity:0;--gn-spot:50%;display:flex;align-items:stretch;gap:24px;position:relative;isolation:isolate;font:12px var(--sans,Arial,sans-serif);color:#93a59a}.glow-nav .gn-item{display:flex;font:inherit;color:inherit}.glow-nav .gn-link{display:flex;align-items:center;justify-content:center;min-height:60px;padding:0 6px;font:inherit;color:inherit;text-decoration:none;white-space:nowrap;background:transparent;transition:color 600ms linear,text-shadow 600ms linear}.glow-nav .gn-link:hover,.glow-nav .gn-link[aria-current=page]{color:#f0f3ec;text-shadow:0 0 18px #d6ead649}.glow-nav .gn-link:focus-visible{outline:1px solid #fff;outline-offset:3px;border-radius:5px}.glow-nav .gn-highlight{position:absolute;left:0;top:0;bottom:0;width:var(--gn-width);transform:translateX(var(--gn-x));opacity:var(--gn-opacity);pointer-events:none;z-index:-1;overflow:hidden;mask-image:linear-gradient(#000,transparent 92%)}.glow-nav .gn-highlight>b{position:absolute;inset:0;background:radial-gradient(ellipse at var(--gn-spot) 0,color-mix(in srgb,var(--gn-accent) 19%,transparent),transparent 75%);border-top:1px solid color-mix(in srgb,var(--gn-accent) 70%,transparent)}.glow-nav .gn-highlight>i{position:absolute;top:0;width:1.5px;height:1.5px;border-radius:50%;opacity:0;background:var(--gn-accent);box-shadow:0 0 4px var(--gn-accent);animation:gn-dust 2.5s cubic-bezier(.25,.55,.38,.92) infinite}@keyframes gn-dust{0%{opacity:0;transform:translateY(0)}18%{opacity:.45}80%,100%{opacity:0;transform:translateY(46px)}}.glow-nav[data-paused] .gn-highlight>i{animation-play-state:paused}@media(prefers-reduced-motion:reduce){.glow-nav .gn-highlight>i{animation:none;opacity:.15}.glow-nav .gn-link{transition:none}}html[data-theme=light] .glow-nav{color:#77716a}html[data-theme=light] .glow-nav .gn-link:hover,html[data-theme=light] .glow-nav .gn-link[aria-current=page]{color:#25211e;text-shadow:0 0 18px #a0523528}html[data-theme=light] .glow-nav .gn-link:focus-visible{outline-color:#302c28}`;
