'use client';

import {useEffect,useRef,type ReactNode} from 'react';

export type SphereState={time:number;tiltX:number;tiltY:number;pointerX:number;pointerY:number;presence:number;burst:number;intensity:number;small:boolean;light:boolean;width:number;height:number;radius:number;static?:boolean};
export type SphereRenderer=(context:CanvasRenderingContext2D,state:SphereState)=>void;
export const sphereClamp=(value:number,min:number,max:number)=>Math.max(min,Math.min(max,Number.isFinite(value)?value:min));
export const smoothSphere=(value:number)=>{const t=sphereClamp(value,0,1);return t*t*t*(t*(t*6-15)+10);};

/** Shared input, scheduling and canvas ownership; each sculpture owns its geometry. */
export default function SphereStage({name,label,compact=false,paused=false,speed=1,intensity=1,render,children,overlay}:{name:string;label:string;compact?:boolean;paused?:boolean;speed?:number;intensity?:number;render:SphereRenderer;children:ReactNode;overlay?:ReactNode}){
  const host=useRef<HTMLDivElement>(null),canvas=useRef<HTMLCanvasElement>(null),wakeRef=useRef<()=>void>(()=>{});
  const options=useRef({paused,speed,intensity,render});options.current={paused,speed,intensity,render};
  useEffect(()=>wakeRef.current(),[paused,speed,intensity,render]);
  useEffect(()=>{
    const root=host.current!,surface=canvas.current!,context=surface.getContext('2d',{alpha:true});if(!context)return;
    const reduced=matchMedia('(prefers-reduced-motion: reduce)');
    let frame=0,last=0,time=0,visible=true,gone=false,release=0,impulse=0;
    const hand={x:0,y:0,presence:0},wanted={...hand};
    const state:SphereState={time:0,tiltX:0,tiltY:0,pointerX:0,pointerY:0,presence:0,burst:0,intensity:1,small:compact,light:false,width:0,height:0,radius:1};
    function draw(){
      if(!state.width||!state.height)return;
      state.time=reduced.matches?0:time;state.static=options.current.paused||reduced.matches;state.intensity=sphereClamp(options.current.intensity,0,1.4)*(state.small?.8:1);
      state.tiltX=hand.y*.5*state.intensity;state.tiltY=hand.x*.65*state.intensity;state.pointerX=hand.x;state.pointerY=hand.y;state.presence=reduced.matches?0:hand.presence;
      state.light=document.documentElement.dataset.theme==='light';
      context!.clearRect(0,0,state.width,state.height);options.current.render(context!,state);context!.globalAlpha=1;
      root.dataset.ready='true';root.dataset.sceneTime=state.time.toFixed(3);root.dataset.sceneTilt=`${state.tiltX.toFixed(3)},${state.tiltY.toFixed(3)}`;root.dataset.sceneBurst=state.burst.toFixed(3);root.dataset.quality=state.small?'compact':'full';
    }
    function tick(now:number){
      frame=0;if(gone||!visible||document.hidden)return;
      if(options.current.paused||reduced.matches){if(reduced.matches){hand.x=hand.y=hand.presence=state.burst=impulse=0;}draw();return;}
      const elapsed=(now-last)/1000;if(state.small&&elapsed<1/30){frame=requestAnimationFrame(tick);return;}
      const dt=Math.min(.05,Math.max(.001,elapsed)),alpha=1-Math.exp(-dt*8);last=now;time+=dt*sphereClamp(options.current.speed,.25,2);
      hand.x+=(wanted.x-hand.x)*alpha;hand.y+=(wanted.y-hand.y)*alpha;hand.presence+=(wanted.presence-hand.presence)*alpha;impulse*=Math.exp(-dt*1.2);state.burst+=(impulse-state.burst)*alpha;
      draw();frame=requestAnimationFrame(tick);
    }
    function wake(){if(!gone&&!frame&&visible&&!document.hidden){last=performance.now();frame=requestAnimationFrame(tick);}}
    wakeRef.current=wake;
    function resize(){
      const box=root.getBoundingClientRect();state.width=box.width;state.height=box.height;state.small=compact||box.width<500;state.radius=Math.min(box.width,box.height)*(compact?.4:.35);
      const density=Math.min(window.devicePixelRatio||1,state.small?1:1.5);surface.width=Math.max(1,Math.round(box.width*density));surface.height=Math.max(1,Math.round(box.height*density));context!.setTransform(density,0,0,density,0,0);draw();wake();
    }
    function move(event:PointerEvent){
      if(options.current.paused||reduced.matches)return;clearTimeout(release);const box=root.getBoundingClientRect();
      wanted.x=sphereClamp((event.clientX-box.left-state.width/2)/state.radius,-1,1);wanted.y=sphereClamp(-(event.clientY-box.top-state.height/2)/state.radius,-1,1);wanted.presence=1;wake();
    }
    const rest=()=>{wanted.x=wanted.y=wanted.presence=0;wake();};
    const activate=(event:PointerEvent)=>{if(options.current.paused||reduced.matches)return;move(event);impulse=1;wake();};
    const up=(event:PointerEvent)=>{if(event.pointerType!=='mouse'){clearTimeout(release);release=window.setTimeout(rest,650);}};
    function key(event:KeyboardEvent){
      if(options.current.paused||reduced.matches||!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home',' '].includes(event.key))return;
      event.preventDefault();clearTimeout(release);
      if(event.key===' '){impulse=1;}
      else if(event.key==='Home'){impulse=0;rest();}
      else {wanted.presence=1;wanted.x=sphereClamp(wanted.x+(event.key==='ArrowLeft'?-.25:event.key==='ArrowRight'?.25:0),-1,1);wanted.y=sphereClamp(wanted.y+(event.key==='ArrowUp'?.25:event.key==='ArrowDown'?-.25:0),-1,1);}
      wake();
    }
    const visibility=()=>{cancelAnimationFrame(frame);frame=0;wake();};
    const theme=()=>draw();
    const preference=()=>{if(reduced.matches){wanted.x=wanted.y=wanted.presence=hand.x=hand.y=hand.presence=state.burst=impulse=0;}visibility();};
    const size=new ResizeObserver(resize),intersection=new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;visibility();});size.observe(root);intersection.observe(root);
    root.addEventListener('pointermove',move);root.addEventListener('pointerdown',activate);root.addEventListener('pointerup',up);root.addEventListener('pointerleave',rest);root.addEventListener('pointercancel',rest);root.addEventListener('keydown',key);root.addEventListener('blur',rest);
    document.addEventListener('visibilitychange',visibility);document.addEventListener('motiqo-theme-change',theme);reduced.addEventListener('change',preference);resize();
    return()=>{
      gone=true;cancelAnimationFrame(frame);clearTimeout(release);size.disconnect();intersection.disconnect();wakeRef.current=()=>{};
      root.removeEventListener('pointermove',move);root.removeEventListener('pointerdown',activate);root.removeEventListener('pointerup',up);root.removeEventListener('pointerleave',rest);root.removeEventListener('pointercancel',rest);root.removeEventListener('keydown',key);root.removeEventListener('blur',rest);
      document.removeEventListener('visibilitychange',visibility);document.removeEventListener('motiqo-theme-change',theme);reduced.removeEventListener('change',preference);surface.width=surface.height=0;delete root.dataset.ready;
    };
  },[compact]);
  const extent=compact?1.25:1/.7;
  return <div ref={host} className={`sphere-stage sphere-${name}`} tabIndex={compact?-1:0} role="group" aria-label={label}><style>{styles}</style><svg className="sphere-fallback" viewBox={`${-extent} ${-extent} ${extent*2} ${extent*2}`} aria-hidden="true">{children}</svg><canvas ref={canvas} aria-hidden="true"/>{overlay}</div>;
}
const styles=`.sphere-stage{--sphere-ink:#f3f0ea;position:relative;isolation:isolate;width:100%;height:100%;overflow:hidden;touch-action:pan-y;background:radial-gradient(ellipse at 50% 45%,#171717,#0a0a0a 72%);outline:none}.sphere-stage canvas,.sphere-fallback{position:absolute;inset:0;width:100%;height:100%;display:block;transition:opacity 600ms cubic-bezier(.22,1,.36,1)}.sphere-stage canvas{opacity:0}.sphere-fallback{color:var(--sphere-ink)}.sphere-stage[data-ready=true] canvas{opacity:1}.sphere-stage[data-ready=true] .sphere-fallback{opacity:0;pointer-events:none}.sphere-stage:focus-visible{outline:1px solid #fff;outline-offset:-5px}html[data-theme=light] .sphere-stage{--sphere-ink:#4a4540;background:radial-gradient(ellipse at 50% 47%,#fff,#f1eee8 74%)}html[data-theme=light] .sphere-stage:focus-visible{outline-color:#302c28}@media(prefers-reduced-motion:reduce){.sphere-stage canvas,.sphere-fallback{transition:none}}`;
