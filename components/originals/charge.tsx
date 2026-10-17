'use client';
import {useEffect,useId,useRef} from 'react';
import {chargeClamp,chargeHex} from './charge-math';
import {createChargeScene,type ChargeOptions} from './charge-scene';

export type ChargeProps={percentage?:number;statusText?:string;flowSpeed?:number;particleCount?:number;primaryColor?:string;secondaryColor?:string;animateCount?:boolean;compact?:boolean;paused?:boolean;className?:string};

/** A plasma inlet feeding two ascending currents around a luminous battery orb. */
export default function Charge({percentage=46,statusText='Quick Charge',flowSpeed=1,particleCount=240,primaryColor='#00e5ff',secondaryColor='#ffb52e',animateCount=true,compact=false,paused=false,className=''}:ChargeProps){
 const root=useRef<HTMLDivElement>(null),canvas=useRef<HTMLCanvasElement>(null),value=useRef<HTMLSpanElement>(null),scene=useRef<ReturnType<typeof createChargeScene>|null>(null);
 const initialValue=useRef(Math.round(chargeClamp(percentage,0,100)));
 const options=useRef<ChargeOptions>({percentage,flowSpeed,particleCount,primaryColor,secondaryColor,animateCount,paused});options.current={percentage,flowSpeed,particleCount,primaryColor,secondaryColor,animateCount,paused};
 const id=useId().replace(/:/g,''),target=Math.round(chargeClamp(percentage,0,100)),cyan=chargeHex(primaryColor,'#00e5ff'),gold=chargeHex(secondaryColor,'#ffb52e');
 useEffect(()=>{
  const host=root.current!;delete host.dataset.failed;
  try{scene.current=createChargeScene(canvas.current!,compact,()=>options.current,n=>{if(value.current)value.current.textContent=String(n);});}
  catch{host.dataset.failed='true';if(value.current)value.current.textContent=String(Math.round(chargeClamp(options.current.percentage,0,100)));}
  return()=>{scene.current?.dispose();scene.current=null;};
 },[compact]);
 useEffect(()=>{if(scene.current)scene.current.sync();else if(value.current)value.current.textContent=String(Math.round(chargeClamp(percentage,0,100)));},[percentage,flowSpeed,particleCount,primaryColor,secondaryColor,animateCount,paused]);
 return <div ref={root} className={`charge ${className}`}><style>{styles}</style>
  <div className="charge-panel" tabIndex={compact?-1:0} role="progressbar" aria-label="Battery charge. Space pauses or resumes the energy flow." aria-valuemin={0} aria-valuemax={100} aria-valuenow={target} aria-valuetext={`${target} percent, ${statusText}`}>
   <svg className="charge-fallback" viewBox="0 0 400 800" preserveAspectRatio="none" aria-hidden="true"><defs><filter id={`${id}-bloom`} x="-80%" y="-40%" width="260%" height="180%"><feGaussianBlur stdDeviation="8"/></filter><linearGradient id={`${id}-light`} x1="0" y1="1" x2=".3" y2="0"><stop stopColor={gold}/><stop offset=".45" stopColor={cyan}/><stop offset="1" stopColor="#efffff"/></linearGradient></defs><g fill="none" stroke={`url(#${id}-light)`}><path d="M200 800V430C200 423 200 424 196 424A128 128 0 1 1 204 424C200 424 200 425 200 430" strokeWidth="12" opacity=".6" filter={`url(#${id}-bloom)`}/><path d="M200 800V429C200 424 200 424 196 424A128 128 0 1 1 204 424C200 424 200 425 200 429" strokeWidth="2"/></g></svg>
   <canvas ref={canvas} aria-hidden="true"/>
   <div className="charge-readout" aria-hidden="true"><div className="charge-value"><span ref={value}>{initialValue.current}</span><span className="charge-unit">%</span></div><span className="charge-status">{statusText}</span></div>
  </div>
 </div>;
}
const styles=`.charge{position:relative;width:100%;height:100%;min-height:0;overflow:clip;background:#030303;container-type:size}.charge-panel{position:absolute;top:6%;left:50%;transform:translateX(-50%);width:min(86cqw,64cqh,380px);height:max(min(172cqw,128cqh,760px),108cqh);border:1px solid #ffffff24;border-radius:clamp(18px,8cqw,34px);overflow:hidden;isolation:isolate;background:#000;outline:none;container-type:inline-size}.charge-panel>canvas,.charge-fallback{position:absolute;inset:0;width:100%;height:100%;display:block;pointer-events:none;transition:opacity 300ms linear}.charge-panel>canvas{opacity:0}.charge[data-ready=true] canvas{opacity:1}.charge[data-ready=true] .charge-fallback{opacity:0}.charge-readout{position:absolute;top:37%;left:16%;right:16%;transform:translateY(-50%);text-align:center;pointer-events:none;font-family:inherit;color:#fff}.charge-value{display:flex;align-items:baseline;justify-content:center;font-size:clamp(24px,13cqw,49px);font-weight:500;font-variant-numeric:tabular-nums;line-height:1.12;letter-spacing:-.055em;text-shadow:0 0 16px #9cecff33}.charge-unit{font-size:.49em;letter-spacing:-.02em;margin-left:.06em}.charge-status{display:block;font-size:clamp(8px,3.15cqw,12px);font-weight:400;line-height:1.5;letter-spacing:.025em;color:#ffffffbf;margin-top:.6em;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.charge-panel:focus-visible{outline:1px solid #fff;outline-offset:-4px}html[data-theme=light] .charge{background:#f6f5f3}@media(prefers-reduced-motion:reduce){.charge-panel>canvas,.charge-fallback{transition:none}}`;
