'use client';
import { useEffect, useRef, useState } from 'react';
import { createCrateScene } from './crate-scene';
export type CrateProps={compact?:boolean;paused?:boolean;count?:number;intensity?:number;speed?:number;className?:string};
export default function Crate({compact=false,paused=false,count=8,intensity=1,speed=1,className=''}:CrateProps){
  const canvas=useRef<HTMLCanvasElement>(null),scene=useRef<ReturnType<typeof createCrateScene>|null>(null),[ready,setReady]=useState(false);
  const settings=useRef({paused,intensity,speed});settings.current={paused,intensity,speed};
  useEffect(()=>{setReady(false);let gone=false;try{scene.current=createCrateScene(canvas.current!,count,compact,value=>{if(!gone)setReady(value);});scene.current.setOptions(settings.current);}catch{scene.current?.dispose();scene.current=null;}
    return()=>{gone=true;scene.current?.dispose();scene.current=null;};},[compact,count]);
  useEffect(()=>scene.current?.setOptions(settings.current),[paused,intensity,speed]);
  return <div className={`crate-stage ${ready?'is-ready':''} ${className}`} role="group" aria-label="Crate, a shelf of responsive vinyl records" tabIndex={compact?-1:0}><style>{`.crate-stage{position:relative;width:100%;height:100%;min-height:0;overflow:hidden;touch-action:pan-y;background:radial-gradient(ellipse at 50% 52%,#20312666,transparent 68%)}.crate-stage>canvas{display:block;width:100%;height:100%;opacity:0;transition:opacity 500ms cubic-bezier(.22,1,.36,1)}.crate-stage.is-ready>canvas{opacity:1}.crate-stage .crate-fallback{position:absolute;inset:20%;width:60%;height:60%;opacity:1;transition:opacity 500ms cubic-bezier(.22,1,.36,1)}.crate-stage.is-ready .crate-fallback{opacity:0;pointer-events:none}.crate-stage:focus-visible{outline:1px solid #fff;outline-offset:-5px}html[data-theme=light] .crate-stage{background:radial-gradient(ellipse at 50% 47%,#fff,#f1eee8 74%)}html[data-theme=light] .crate-stage:focus-visible{outline-color:#302c28}`}</style><svg className="crate-fallback" viewBox="0 0 400 240" aria-hidden="true"><path d="m30 163 248 55 89-42-249-55Z" fill="#152820" stroke="#96aa98"/>{Array.from({length:Math.max(3,Math.min(10,count))},(_,i)=><ellipse key={i} cx={65+i*29} cy={115+i*4} rx="18" ry="53" fill="#101b18" stroke="#819b87"/>)}</svg><canvas ref={canvas} aria-hidden="true"/></div>;
}
