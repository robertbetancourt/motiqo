'use client';
import {useEffect,useRef} from 'react';
import {createResonanceScene,type ResonanceOptions} from './resonance-scene';
export type ResonanceProps={size?:number;speed?:number;waveAmplitude?:number;ribbonCount?:number;colorPalette?:readonly [string,string,string];intensity?:number;compact?:boolean;paused?:boolean;className?:string};
const palette=['#234bff','#5a8cff','#1a3cff'] as const;
export default function Resonance({size=300,speed=1,waveAmplitude=1,ribbonCount=38,colorPalette=palette,intensity=1,compact=false,paused=false,className=''}:ResonanceProps){
 const root=useRef<HTMLDivElement>(null),canvas=useRef<HTMLCanvasElement>(null),scene=useRef<ReturnType<typeof createResonanceScene>|null>(null),options=useRef<ResonanceOptions>({size,speed,waveAmplitude,ribbonCount,colorPalette,intensity,paused});options.current={size,speed,waveAmplitude,ribbonCount,colorPalette,intensity,paused};
 useEffect(()=>{try{scene.current=createResonanceScene(canvas.current!,compact,()=>options.current);}catch{root.current!.dataset.failed='true';}return()=>{scene.current?.dispose();scene.current=null;};},[compact,ribbonCount]);
 useEffect(()=>scene.current?.sync(),[size,speed,waveAmplitude,colorPalette,intensity,paused]);
 return <div ref={root} className={`resonance ${className}`} tabIndex={compact?-1:0} role="img" aria-label="Resonance, flowing luminous blue ribbons around a dark core. Hover or focus to agitate the waves."><style>{styles}</style><div className="resonance-fallback" aria-hidden="true"/><canvas ref={canvas} aria-hidden="true"/></div>;
}
const styles=`.resonance{position:relative;width:100%;height:100%;min-height:0;overflow:hidden;background:#000;outline:none}.resonance canvas{position:absolute;inset:0;width:100%;height:100%;display:block;opacity:0;transition:opacity .5s linear;pointer-events:none}.resonance[data-ready=true] canvas{opacity:1}.resonance-fallback{position:absolute;width:min(48%,54cqh);aspect-ratio:1;top:50%;left:50%;transform:translate(-50%,-50%) rotate(-15deg);border:2px solid #bacbff;border-radius:48% 52% 47% 53%;box-shadow:0 0 9px #fff,0 0 24px #5265ff,inset 0 0 18px #374cff;transition:opacity .5s linear}.resonance[data-ready=true] .resonance-fallback{opacity:0}.resonance:focus-visible{outline:1px solid #fff;outline-offset:-5px}@media(prefers-reduced-motion:reduce){.resonance canvas,.resonance-fallback{transition:none}}`;
