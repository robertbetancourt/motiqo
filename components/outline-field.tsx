'use client';
import { useEffect, useRef, type ReactNode } from 'react';

/** Motiqo's one-pixel illuminated bezel. No custom element or third-party field. */
export default function OutlineField({children,className='',paused=false}:{children:ReactNode;className?:string;paused?:boolean}){
  const root=useRef<HTMLDivElement>(null),target=useRef({x:.5,y:.5,strength:0}),current=useRef({...target.current}),wake=useRef<(()=>void)|null>(null);
  useEffect(()=>{
    if(paused){root.current?.style.setProperty('--bezel-strength','0');return;}const media=matchMedia('(prefers-reduced-motion: reduce)');let frame=0,last=0;
    const tick=(now:number)=>{frame=0;const alpha=1-Math.exp(-Math.min(.06,(now-last)/1000)*11);last=now;let delta=0;
      for(const key of ['x','y','strength'] as const){current.current[key]+=(target.current[key]-current.current[key])*alpha;delta+=Math.abs(target.current[key]-current.current[key]);}
      const style=root.current?.style;style?.setProperty('--bezel-x',`${current.current.x*100}%`);style?.setProperty('--bezel-y',`${current.current.y*100}%`);style?.setProperty('--bezel-strength',String(current.current.strength));if(delta>.002)frame=requestAnimationFrame(tick);
    };
    const start=()=>{if(!frame&&!media.matches){last=performance.now();frame=requestAnimationFrame(tick);}};const changed=()=>{if(media.matches){cancelAnimationFrame(frame);frame=0;root.current?.style.setProperty('--bezel-strength','0');}};
    wake.current=start;media.addEventListener('change',changed);return()=>{cancelAnimationFrame(frame);wake.current=null;media.removeEventListener('change',changed);};
  },[paused]);
  return <div ref={root} className={`outline-field motiqo-bezel ${className}`} onPointerMove={event=>{if(paused||event.pointerType==='touch'||(event.target as HTMLElement).closest('.choice-menu'))return;const r=event.currentTarget.getBoundingClientRect();target.current={x:(event.clientX-r.left)/r.width,y:(event.clientY-r.top)/r.height,strength:1};wake.current?.();}}
    onPointerLeave={()=>{target.current.strength=0;wake.current?.();}} onFocusCapture={()=>{target.current.strength=.8;wake.current?.();}} onBlurCapture={event=>{if(!event.currentTarget.contains(event.relatedTarget as Node|null)){target.current.strength=0;wake.current?.();}}}>
    <span className="motiqo-bezel-light" aria-hidden="true"/>{children}
  </div>;
}
