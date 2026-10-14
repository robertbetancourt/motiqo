'use client';

import {useEffect,useMemo,useRef} from 'react';
import {createHaloPoints,haloOrder,haloClamp,projectHalo,type HaloPoint,type HaloState} from './halo-math';

export type HaloProps={compact?:boolean;paused?:boolean;speed?:number;intensity?:number;count?:number;dotSize?:number;className?:string};

export default function Halo({compact=false,paused=false,speed=1,intensity=1,count=480,dotSize=1,className=''}:HaloProps){
  const host=useRef<HTMLDivElement>(null),canvas=useRef<HTMLCanvasElement>(null),wakeRef=useRef<()=>void>(()=>{});
  const options=useRef({paused,speed,intensity,count,dotSize});options.current={paused,speed,intensity,count,dotSize};
  const fallback=useMemo(()=>{
    const points=createHaloPoints(compact?Math.min(count,280):count),data=new Float32Array(points.length*5);
    return projectHalo(points,{time:0,order:0,tiltX:0,tiltY:0,pointerX:0,pointerY:0,presence:0,intensity:0},data);
  },[count,compact]);
  useEffect(()=>wakeRef.current(),[paused,speed,intensity,count,dotSize]);

  useEffect(()=>{
    const root=host.current!,surface=canvas.current!,context=surface.getContext('2d',{alpha:true});
    if(!context)return;
    const reduced=matchMedia('(prefers-reduced-motion: reduce)');
    let frame=0,last=0,time=0,width=0,height=0,radius=1,visible=true,small=compact,gone=false,release=0;
    let points:HaloPoint[]=[],projected=new Float32Array(),held=false,order=0;
    const hand={x:0,y:0,presence:0},wanted={...hand};
    const state:HaloState={time:0,order:0,tiltX:0,tiltY:0,pointerX:0,pointerY:0,presence:0,intensity:1};

    function draw(){
      if(!width||!height)return;
      const desiredCount=Math.round(haloClamp(small?Math.min(options.current.count,280):options.current.count,160,1000));
      if(points.length!==desiredCount){points=createHaloPoints(desiredCount);projected=new Float32Array(points.length*5);}
      state.time=reduced.matches?0:time;state.order=reduced.matches?0:order;
      state.intensity=haloClamp(options.current.intensity,0,1.4)*(small?.8:1);
      state.tiltX=hand.y*.48*state.intensity;state.tiltY=hand.x*.65*state.intensity;state.pointerX=hand.x;state.pointerY=hand.y;
      state.presence=reduced.matches?0:hand.presence;
      projectHalo(points,state,projected);
      context!.clearRect(0,0,width,height);
      const light=document.documentElement.dataset.theme==='light';context!.fillStyle=light?'#4a4540':'#f3f0ea';
      // Back and front hemispheres are composited in depth order.
      for(let side=0;side<2;side++)for(let i=0;i<points.length;i++){
        const n=i*5;if((projected[n+2]>=0?1:0)!==side)continue;
        context!.globalAlpha=projected[n+4];context!.beginPath();
        context!.arc(width/2+projected[n]*radius,height/2-projected[n+1]*radius,projected[n+3]*haloClamp(options.current.dotSize,.5,2.5)*(small?.95:1.4),0,Math.PI*2);context!.fill();
      }
      context!.globalAlpha=1;
      root.dataset.ready='true';root.dataset.haloOrder=state.order.toFixed(4);root.dataset.haloTime=state.time.toFixed(3);root.dataset.pointCount=String(points.length);root.dataset.haloTilt=`${state.tiltX.toFixed(3)},${state.tiltY.toFixed(3)}`;
    }
    function tick(now:number){
      frame=0;if(gone||!visible||document.hidden)return;
      if(options.current.paused||reduced.matches){if(reduced.matches){hand.x=hand.y=hand.presence=0;}draw();return;}
      const elapsed=(now-last)/1000;if(small&&elapsed<1/30){frame=requestAnimationFrame(tick);return;}
      const dt=Math.min(.05,Math.max(.001,elapsed)),alpha=1-Math.exp(-dt*9);last=now;
      time+=dt*haloClamp(options.current.speed,.25,2);
      hand.x+=(wanted.x-hand.x)*alpha;hand.y+=(wanted.y-hand.y)*alpha;hand.presence+=(wanted.presence-hand.presence)*alpha;
      order+=((held?1:haloOrder(time))-order)*(1-Math.exp(-dt*7));draw();frame=requestAnimationFrame(tick);
    }
    function wake(){if(!gone&&!frame&&visible&&!document.hidden){last=performance.now();frame=requestAnimationFrame(tick);}}
    wakeRef.current=wake;
    function resize(){
      const box=root.getBoundingClientRect();width=box.width;height=box.height;small=compact||width<500;radius=Math.min(width,height)*(compact?.4:.35);
      const density=Math.min(window.devicePixelRatio||1,small?1:1.5);surface.width=Math.max(1,Math.round(width*density));surface.height=Math.max(1,Math.round(height*density));context!.setTransform(density,0,0,density,0,0);draw();wake();
    }
    function move(event:PointerEvent){
      if(options.current.paused||reduced.matches)return;
      clearTimeout(release);const box=root.getBoundingClientRect();wanted.x=haloClamp((event.clientX-box.left-width/2)/radius,-1,1);wanted.y=haloClamp(-(event.clientY-box.top-height/2)/radius,-1,1);wanted.presence=1;wake();
    }
    const rest=()=>{wanted.x=wanted.y=wanted.presence=0;wake();};
    const up=(event:PointerEvent)=>{if(event.pointerType!=='mouse'){clearTimeout(release);release=window.setTimeout(rest,650);}};
    function key(event:KeyboardEvent){
      if(options.current.paused||reduced.matches||!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home',' '].includes(event.key))return;
      event.preventDefault();clearTimeout(release);
      if(event.key===' '){held=!held;}
      else if(event.key==='Home'){held=false;rest();}
      else {wanted.presence=1;wanted.x=haloClamp(wanted.x+(event.key==='ArrowLeft'?-.25:event.key==='ArrowRight'?.25:0),-1,1);wanted.y=haloClamp(wanted.y+(event.key==='ArrowUp'?.25:event.key==='ArrowDown'?-.25:0),-1,1);}
      wake();
    }
    const visibility=()=>{cancelAnimationFrame(frame);frame=0;wake();};
    const theme=()=>{draw();};
    const preference=()=>{if(reduced.matches){held=false;wanted.x=wanted.y=wanted.presence=hand.x=hand.y=hand.presence=0;}visibility();};
    const size=new ResizeObserver(resize),intersection=new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;visibility();});size.observe(root);intersection.observe(root);
    root.addEventListener('pointermove',move);root.addEventListener('pointerdown',move);root.addEventListener('pointerup',up);root.addEventListener('pointerleave',rest);root.addEventListener('pointercancel',rest);root.addEventListener('keydown',key);root.addEventListener('blur',rest);
    document.addEventListener('visibilitychange',visibility);document.addEventListener('motiqo-theme-change',theme);reduced.addEventListener('change',preference);resize();
    return()=>{
      gone=true;cancelAnimationFrame(frame);clearTimeout(release);size.disconnect();intersection.disconnect();wakeRef.current=()=>{};
      root.removeEventListener('pointermove',move);root.removeEventListener('pointerdown',move);root.removeEventListener('pointerup',up);root.removeEventListener('pointerleave',rest);root.removeEventListener('pointercancel',rest);root.removeEventListener('keydown',key);root.removeEventListener('blur',rest);
      document.removeEventListener('visibilitychange',visibility);document.removeEventListener('motiqo-theme-change',theme);reduced.removeEventListener('change',preference);surface.width=surface.height=0;delete root.dataset.ready;
    };
  },[compact]);

  const extent=compact?1.25:1/.7;
  return <div ref={host} className={`halo ${className}`} tabIndex={compact?-1:0} role="group" aria-label="Halo, a rotating particle globe. Move or touch to tilt it; arrow keys steer, Space holds the ordered globe and Home resets."><style>{styles}</style><svg className="halo-fallback" viewBox={`${-extent} ${-extent} ${extent*2} ${extent*2}`} aria-hidden="true">{Array.from({length:fallback.length/5},(_,i)=><circle key={i} cx={fallback[i*5]} cy={-fallback[i*5+1]} r={fallback[i*5+3]*.007*dotSize} opacity={fallback[i*5+4]}/>)}</svg><canvas ref={canvas} aria-hidden="true"/></div>;
}
const styles=`.halo{--halo-ink:#f3f0ea;position:relative;isolation:isolate;width:100%;height:100%;overflow:hidden;touch-action:pan-y;background:radial-gradient(ellipse at 50% 45%,#171717,#0a0a0a 72%);outline:none}.halo canvas,.halo-fallback{position:absolute;inset:0;width:100%;height:100%;display:block;transition:opacity 600ms cubic-bezier(.22,1,.36,1)}.halo canvas{opacity:0}.halo-fallback{fill:var(--halo-ink)}.halo[data-ready=true] canvas{opacity:1}.halo[data-ready=true] .halo-fallback{opacity:0;pointer-events:none}.halo:focus-visible{outline:1px solid #fff;outline-offset:-5px}html[data-theme=light] .halo{--halo-ink:#4a4540;background:radial-gradient(ellipse at 50% 47%,#fff,#f1eee8 74%)}html[data-theme=light] .halo:focus-visible{outline-color:#302c28}@media(prefers-reduced-motion:reduce){.halo canvas,.halo-fallback{transition:none}}`;
