'use client';

import { useEffect, useRef } from 'react';
import { LiquidEngine, type EngineOptions } from './liquid-particle-engine';

/** Motiqo interactive artwork with its elastic material and filament engine. */
export type LiquidRelicProps = {
  src?: string; imageAlt?: string; label?:string; compact?: boolean; paused?: boolean;
  strength?: number; radius?: number; particleSpread?: number; turbulence?: number;
  liquid?: number; returnSpeed?: number; speed?: number; dotSize?: number;
  particleDensity?: number; restStyle?: 'image' | 'particles'; sculptureScale?: number;
  className?: string;
};
const limit = (value:number,min:number,max:number) => Math.max(min,Math.min(max,Number.isFinite(value)?value:min));

export default function LiquidRelic({
  src='/media/liquid-relic.svg', imageAlt='A sculpted metal Motiqo symbol', label='Liquid Relic, an interactive particle sculpture', compact=false, paused=false,
  strength=1, radius=220, particleSpread=1, turbulence=1, liquid=1, returnSpeed=1, speed=1,
  dotSize=1, particleDensity=.8, restStyle='image', sculptureScale=1, className='',
}: LiquidRelicProps) {
  const root=useRef<HTMLDivElement>(null),image=useRef<HTMLImageElement>(null);
  const sync=useRef<(()=>void)|null>(null);
  const options=useRef({paused,strength,radius,particleSpread,turbulence,liquid,returnSpeed,speed,dotSize,particleDensity,restStyle,sculptureScale});
  options.current={paused,strength,radius,particleSpread,turbulence,liquid,returnSpeed,speed,dotSize,particleDensity,restStyle,sculptureScale};

  useEffect(()=>{
    const host=root.current!,fallback=image.current!,canvas=document.createElement('canvas');
    canvas.className='lr-canvas';canvas.setAttribute('aria-hidden','true');host.appendChild(canvas);
    const media=matchMedia('(prefers-reduced-motion: reduce)');
    let instance:LiquidEngine|null=null,gone=false,visible=true,aspect=1,lastSmall:boolean|undefined;
    const hand={x:.5,y:.35};
    const settings=():EngineOptions=>{
      const o=options.current,small=compact||host.clientWidth<500;
      return {
        compact:small,paused:o.paused,interactive:!o.paused&&!media.matches,reducedMotion:media.matches,
        strength:limit(o.strength,0,2),radius:limit(o.radius,40,600),density:Math.min(small?.35:1.2,limit(o.particleDensity,.15,1.2)),
        spread:limit(o.particleSpread,0,2),turbulence:limit(o.turbulence,0,2),liquid:limit(o.liquid,0,2),
        returnSpeed:limit(o.returnSpeed,.2,2),speed:limit(o.speed,.25,3),dotSize:limit(o.dotSize,.2,3),
        streaks:true,restStyle:o.restStyle,ambient:false,ambientIntensity:0,intro:false,
        bg:[10/255,16/255,16/255],imgBg:null,
      };
    };
    function layout(){
      const w=host.clientWidth,h=host.clientHeight;if(!w||!h)return;
      const small=compact||w<500;
      if(small!==lastSmall){lastSmall=small;instance?.setOptions(settings());}
      let rw=w*.92*limit(options.current.sculptureScale,.6,1.2);
      rw=Math.min(rw,h*.92*limit(options.current.sculptureScale,.6,1.2)*aspect);
      const rh=rw/aspect,rect={x:(w-rw)/2,y:(h-rh)/2,w:rw,h:rh};
      Object.assign(fallback.style,{left:`${rect.x}px`,top:`${rect.y}px`,width:`${rw}px`,height:`${rh}px`});
      instance?.resize(w,h,rect);
      if(instance)host.dataset.particles=String(instance.particleCount);
    }
    function updateVisibility(){instance?.setVisible(visible&&!document.hidden);}
    function changed(){instance?.setOptions(settings());layout();updateVisibility();if(instance)host.dataset.particles=String(instance.particleCount);}
    function fail(){if(!gone)host.dataset.gl='off';}
    try{instance=new LiquidEngine(canvas,settings(),fail);}catch{fail();}
    const bitmap=new Image();bitmap.crossOrigin='anonymous';bitmap.decoding='async';
    bitmap.onload=()=>{
      if(gone)return;aspect=bitmap.naturalWidth/bitmap.naturalHeight||1;layout();
      if(!instance)return;
      try{
        instance.onFirstFrame=()=>{if(!gone)host.dataset.gl='on';};
        instance.setImage(bitmap);host.dataset.particles=String(instance.particleCount);layout();updateVisibility();
      }catch{fail();instance.destroy();instance=null;}
    };
    bitmap.onerror=fail;bitmap.src=src;
    const resize=new ResizeObserver(layout),intersection=new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;updateVisibility();});
    resize.observe(host);intersection.observe(host);
    function pointer(event:PointerEvent,type:'move'|'down'|'up'|'leave'){
      if(options.current.paused||media.matches)return;
      if(event.pointerType==='touch'&&type==='move'&&!event.buttons&&!event.pressure)return;
      const b=host.getBoundingClientRect();instance?.pointer(type,event.clientX-b.left,event.clientY-b.top,event.pointerType==='touch');
    }
    const move=(event:PointerEvent)=>pointer(event,'move'),down=(event:PointerEvent)=>pointer(event,'down');
    const up=(event:PointerEvent)=>pointer(event,'up'),leave=(event:PointerEvent)=>pointer(event,'leave');
    const blur=()=>instance?.pointer('leave',0,0,false);
    function key(event:KeyboardEvent){
      if(event.target!==host||options.current.paused||media.matches||!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home',' ','Enter'].includes(event.key))return;
      event.preventDefault();
      if(event.key==='Home'){hand.x=.5;hand.y=.35;blur();return;}
      hand.x=limit(hand.x+(event.key==='ArrowLeft'?-.08:event.key==='ArrowRight'?.08:0),.1,.9);
      hand.y=limit(hand.y+(event.key==='ArrowUp'?-.08:event.key==='ArrowDown'?.08:0),.1,.9);
      instance?.pointer(event.key===' '||event.key==='Enter'?'down':'move',hand.x*host.clientWidth,hand.y*host.clientHeight,false);
    }
    sync.current=changed;media.addEventListener('change',changed);document.addEventListener('visibilitychange',updateVisibility);
    host.addEventListener('pointermove',move);host.addEventListener('pointerdown',down);host.addEventListener('pointerup',up);
    host.addEventListener('pointercancel',leave);host.addEventListener('pointerleave',leave);host.addEventListener('blur',blur);host.addEventListener('keydown',key);
    layout();
    return()=>{
      gone=true;sync.current=null;bitmap.onload=bitmap.onerror=null;
      resize.disconnect();intersection.disconnect();media.removeEventListener('change',changed);document.removeEventListener('visibilitychange',updateVisibility);
      host.removeEventListener('pointermove',move);host.removeEventListener('pointerdown',down);host.removeEventListener('pointerup',up);
      host.removeEventListener('pointercancel',leave);host.removeEventListener('pointerleave',leave);host.removeEventListener('blur',blur);host.removeEventListener('keydown',key);
      instance?.destroy();canvas.remove();delete host.dataset.gl;delete host.dataset.particles;
    };
  },[src,compact]);

  useEffect(()=>sync.current?.(),[paused,strength,radius,particleSpread,turbulence,liquid,returnSpeed,speed,dotSize,particleDensity,restStyle,sculptureScale]);
  return <div ref={root} className={`liquid-relic ${className}`} role="group" aria-label={label} tabIndex={compact?-1:0}>
    <style>{styles}</style><img ref={image} className="lr-fallback" src={src} alt={imageAlt} draggable={false}/>
    <span className="lr-help">Move or touch to draw liquid trails through the artwork. Arrow keys move the disturbance; Space stirs the material and Home lets it settle.</span>
  </div>;
}

const styles=`.liquid-relic{position:relative;isolation:isolate;width:100%;height:100%;overflow:hidden;touch-action:pan-y;background:radial-gradient(ellipse at 50% 52%,#33333333,transparent 65%),#0b0b0b}.liquid-relic .lr-canvas{position:absolute;inset:0;width:100%;height:100%;opacity:0;transition:opacity 600ms cubic-bezier(.22,1,.36,1);pointer-events:none}.liquid-relic .lr-fallback{position:absolute;inset:5%;width:90%;height:90%;max-width:none;object-fit:contain;user-select:none;pointer-events:none;opacity:1;transition:opacity 600ms cubic-bezier(.22,1,.36,1)}.liquid-relic[data-gl=on] .lr-canvas{opacity:1}.liquid-relic[data-gl=on] .lr-fallback{opacity:0}.liquid-relic .lr-help{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%)}.liquid-relic:focus-visible{outline:1px solid #fff;outline-offset:-5px}@media(prefers-reduced-motion:reduce){.liquid-relic .lr-canvas,.liquid-relic .lr-fallback{transition:none}}html[data-theme=light] .liquid-relic{background:radial-gradient(ellipse at 50% 47%,#fff,#f1eee8 74%)}html[data-theme=light] .liquid-relic:focus-visible{outline-color:#302c28}`;
