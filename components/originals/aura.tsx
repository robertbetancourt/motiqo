'use client';
import {useCallback,useMemo,useRef,useState,type CSSProperties} from 'react';
import SphereStage,{sphereClamp,type SphereState} from './sphere-stage';
import {auraRisk,nextAuraScore,createAura,projectAura} from './aura-math';
export type AuraProps={score?:number;onScoreChange?:(score:number)=>void;compact?:boolean;paused?:boolean;speed?:number;intensity?:number;waves?:number;density?:number};
const resting:SphereState={time:0,tiltX:0,tiltY:0,pointerX:0,pointerY:0,presence:0,burst:0,intensity:0,small:false,light:false,width:1,height:1,radius:1};
export default function Aura({score,onScoreChange,compact=false,paused=false,speed=1,intensity=1,waves=1,density=1}:AuraProps){
  const [localScore,setLocalScore]=useState(4.12),goal=sphereClamp(score??localScore,0,5),risk=auraRisk(goal);
  const number=useRef<HTMLSpanElement>(null),level=useRef<HTMLSpanElement>(null),readout=useRef<HTMLDivElement>(null);
  const display=useRef({score:goal,time:0,color:[...risk.color]});
  const full=useMemo(()=>createAura(false,density),[density]),small=useMemo(()=>createAura(true,density),[density]);
  const fallback=useMemo(()=>{const geometry=compact?small:full,data=projectAura(geometry,resting,waves,goal);return Array.from({length:geometry.rows},(_,row)=>Array.from({length:geometry.columns},(_,col)=>{const n=(row*geometry.columns+col)*6;return `${col?'L':'M'}${data[n].toFixed(5)} ${(-data[n+1]).toFixed(5)}`;}).join('')+'Z');},[compact,full,small,waves,goal]);
  const render=useCallback((context:CanvasRenderingContext2D,state:SphereState)=>{
    const current=display.current,dt=Math.max(.001,Math.min(.05,state.time-current.time)),alpha=state.static?1:1-Math.exp(-dt*7);current.time=state.time;
    current.score+=(goal-current.score)*alpha;if(Math.abs(current.score-goal)<.005)current.score=goal;
    for(let i=0;i<3;i++)current.color[i]+=(risk.color[i]-current.color[i])*alpha;
    const color=current.color.map(value=>Math.round(value*(state.light?.6:1))),css=`rgb(${color.join(',')})`;
    if(number.current)number.current.textContent=current.score.toFixed(2);if(level.current)level.current.textContent=auraRisk(current.score).label;
    readout.current?.style.setProperty('--aura-color',css);readout.current?.style.setProperty('--aura-value-size',`${state.radius*.38}px`);
    if(readout.current){readout.current.dataset.score=current.score.toFixed(2);readout.current.dataset.particles=String((state.small?small:full).rows*(state.small?small:full).columns);}
    const geometry=state.small?small:full,data=projectAura(geometry,state,waves,current.score),r=state.radius,cx=state.width/2,cy=state.height/2;
    context.strokeStyle=css;context.fillStyle=css;context.lineWidth=state.small?.35:.45;context.globalAlpha=state.light?.15:.1;
    for(let row=0;row<geometry.rows;row++){
      context.beginPath();for(let col=0;col<=geometry.columns;col++){const n=(row*geometry.columns+col%geometry.columns)*6,x=cx+data[n]*r,y=cy-data[n+1]*r;if(col===0)context.moveTo(x,y);else context.lineTo(x,y);}context.stroke();
    }
    // Continuous luminous strands collect at the silhouette's travelling wave crests.
    context.globalAlpha=state.light?.38:.48;context.lineWidth=state.small?.65:.85;context.shadowColor=css;context.shadowBlur=state.light?0:6;context.beginPath();
    for(let row=0;row<geometry.rows;row++)for(let col=0;col<geometry.columns;col++){
      const n=(row*geometry.columns+col)*6,m=(row*geometry.columns+(col+1)%geometry.columns)*6;
      if(data[n+5]<.86||data[m+5]<.86)continue;
      context.moveTo(cx+data[n]*r,cy-data[n+1]*r);context.lineTo(cx+data[m]*r,cy-data[m+1]*r);
    }
    context.stroke();context.shadowBlur=0;
    // Rim-weighted particles reveal the moving crests while leaving the score readable.
    for(let side=0;side<2;side++)for(let i=0;i<data.length/6;i+=2){const n=i*6;if((data[n+2]>=0?1:0)!==side)continue;context.globalAlpha=Math.min(1,data[n+3]*(state.light?1.35:1));context.beginPath();context.arc(cx+data[n]*r,cy-data[n+1]*r,data[n+4]*(state.small?.8:1.2),0,Math.PI*2);context.fill();}
  },[full,small,goal,risk.label,waves]);
  const change=(value:number)=>{if(paused)return;value=Math.round(sphereClamp(value,0,5)*100)/100;if(score===undefined)setLocalScore(value);onScoreChange?.(value);};
  const content=<><span ref={number} className="aura-value" aria-hidden="true">{display.current.score.toFixed(2)}</span><span className="aura-risk" aria-hidden="true">Risk: <span ref={level}>{auraRisk(display.current.score).label}</span></span></>;
  const overlay=<div ref={readout} className={`aura-readout ${compact?'is-compact':''}`} style={{'--aura-color':`rgb(${display.current.color.join(',')})`} as CSSProperties}>
    <span className="aura-label">Score</span>
    {compact?<div className="aura-score">{content}</div>:<button type="button" className="aura-score" aria-label={`Change score, currently ${goal.toFixed(2)} out of 5. Enter cycles risk levels; arrow keys adjust.`} disabled={paused||(score!==undefined&&!onScoreChange)} onClick={()=>change(nextAuraScore(goal))} onKeyDown={event=>{if(!['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;event.preventDefault();event.stopPropagation();change(event.key==='Home'?0:event.key==='End'?5:goal+(['ArrowUp','ArrowRight'].includes(event.key)?.1:-.1));}}>{content}</button>}
    <span className="aura-announcement" role="meter" aria-label="Illustrative risk score" aria-valuemin={0} aria-valuemax={5} aria-valuenow={goal} aria-valuetext={`${goal.toFixed(2)} out of 5. ${risk.label} risk.`}/><span className="aura-announcement" aria-live="polite" aria-atomic="true">Score {goal.toFixed(2)} out of 5. Risk: {risk.label}.</span>
  </div>;
  return <SphereStage name="aura" label="Aura, a fluid particle sphere with an illustrative score. Move or touch to shape the waves; select the number to change the score." {...{compact,paused,speed,intensity,render,overlay}}><style>{styles}</style><g fill="none" stroke={`rgb(${risk.color.join(',')})`} strokeWidth=".0024" opacity=".24">{fallback.map((d,i)=><path key={i} d={d}/>)}</g></SphereStage>;
}
const styles=`.sphere-aura .aura-readout{position:absolute;z-index:2;left:50%;top:50%;transform:translate(-50%,-50%);text-align:center;--aura-value-size:64px}.aura-label{display:block;font-family:inherit;font-size:11px;line-height:1.5;color:#92929b;margin-bottom:6px;letter-spacing:.02em}.aura-score{appearance:none;display:flex;flex-direction:column;align-items:center;gap:10px;border:0;border-radius:14px;padding:7px 14px;background:transparent;color:#f5f5f8;cursor:pointer}.aura-score:disabled{opacity:1;cursor:default}.aura-score:focus-visible{outline:1px solid #fff;outline-offset:4px}.aura-value{font-family:inherit;font-size:var(--aura-value-size);font-weight:300;line-height:1;letter-spacing:-.05em;font-variant-numeric:tabular-nums}.aura-risk{white-space:nowrap;font-size:11px;line-height:1.5;color:#99999f}.aura-risk>span{color:var(--aura-color)}.is-compact .aura-label{font-size:9px;margin-bottom:2px}.is-compact .aura-score{gap:7px;cursor:inherit;padding:4px}.is-compact .aura-risk{font-size:9px}.aura-announcement{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%)}html[data-theme=light] .aura-score{color:#25232a}html[data-theme=light] .aura-label,html[data-theme=light] .aura-risk{color:#69656e}html[data-theme=light] .aura-score:focus-visible{outline-color:#25232a}`;
