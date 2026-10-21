'use client';
import {useLayoutEffect,useRef} from 'react';
import {restingLiquid,sampleLiquid,liquidBodyPath,liquidNeckPath,type LiquidFrame} from '@/lib/liquid-selection-motion';

export default function LiquidSelection({selected,width}:{selected:number;width:number}){
  const initial=useRef(restingLiquid((selected+.5)*width,width)),frame=useRef(initial.current),previousWidth=useRef(width);
  const svg=useRef<SVGSVGElement>(null),head=useRef<SVGPathElement>(null),tail=useRef<SVGPathElement>(null),neck=useRef<SVGPathElement>(null);
  useLayoutEffect(()=>{
    const media=window.matchMedia('(prefers-reduced-motion: reduce)');let raf=0,startTime:number|undefined;
    const target=(selected+.5)*width;
    function paint(value:LiquidFrame){frame.current=value;head.current?.setAttribute('d',liquidBodyPath(value.head));tail.current?.setAttribute('d',liquidBodyPath(value.tail));neck.current?.setAttribute('d',liquidNeckPath(value));}
    const settle=()=>{cancelAnimationFrame(raf);raf=0;paint(restingLiquid(target,width));svg.current?.setAttribute('data-liquid-phase','1');};
    if(previousWidth.current!==width||media.matches){previousWidth.current=width;settle();}
    else if(Math.abs(frame.current.head.x-target)>.01||frame.current.tail.rx>.01){
      const start=frame.current,duration=660+Math.min(100,Math.abs(target-start.head.x)*.35);
      const tick=(now:number)=>{startTime??=now;const p=Math.min(1,(now-startTime)/duration);paint(sampleLiquid(start,target,width,p));svg.current?.setAttribute('data-liquid-phase',p.toFixed(3));if(p<1)raf=requestAnimationFrame(tick);else raf=0;};
      raf=requestAnimationFrame(tick);
    }else settle();
    const preference=()=>{if(media.matches)settle();};media.addEventListener('change',preference);
    return()=>{cancelAnimationFrame(raf);media.removeEventListener('change',preference);};
  },[selected,width]);
  return <svg ref={svg} data-liquid-selection="" viewBox={`0 0 ${width*3} 38`} preserveAspectRatio="none" aria-hidden="true" focusable="false" style={{position:'absolute',left:4,top:4,width:'calc(100% - 8px)',height:'calc(100% - 8px)',zIndex:-1,pointerEvents:'none',overflow:'visible'}} fill="color-mix(in srgb,var(--raised) 92%,var(--text) 8%)">
    <path ref={neck} d=""/><path ref={tail} d={liquidBodyPath(initial.current.tail)}/><path ref={head} d={liquidBodyPath(initial.current.head)}/>
  </svg>;
}
