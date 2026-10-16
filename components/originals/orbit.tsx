'use client';
import {useMemo,useCallback} from 'react';
import SphereStage,{sphereClamp,type SphereState} from './sphere-stage';
import {createOrbit,projectOrbit} from './orbit-math';
export type OrbitProps={compact?:boolean;paused?:boolean;speed?:number;intensity?:number;rings?:number;strokeWidth?:number;spread?:number};
const resting:SphereState={time:0,tiltX:0,tiltY:0,pointerX:0,pointerY:0,presence:0,burst:0,intensity:0,small:false,light:false,width:1,height:1,radius:1};
export default function Orbit({compact=false,paused=false,speed=1,intensity=1,rings=8,strokeWidth=.95,spread=1}:OrbitProps){
  const full=useMemo(()=>createOrbit(rings),[rings]),small=useMemo(()=>createOrbit(rings,36),[rings]);
  const fallback=useMemo(()=>{const geometry=compact?small:full,data=projectOrbit(geometry,resting,spread);return geometry.paths.map(path=>Array.from({length:path.length},(_,j)=>{const n=(path.offset+j)*4;return `${j?'L':'M'}${data[n].toFixed(5)} ${(-data[n+1]).toFixed(5)}`;}).join(''));},[compact,full,small,spread]);
  const render=useCallback((context:CanvasRenderingContext2D,state:SphereState)=>{
    const geometry=state.small?small:full,data=projectOrbit(geometry,state,spread),radius=state.radius;
    context.strokeStyle=state.light?'#504b46':'#deddd8';context.lineWidth=sphereClamp(strokeWidth,.3,2)*(state.small?.85:1);context.lineCap='round';context.lineJoin='round';
    for(const path of geometry.paths){
      context.globalAlpha=.73;context.beginPath();
      for(let j=0;j<path.length;j++){const n=(path.offset+j)*4,x=state.width/2+data[n]*radius,y=state.height/2-data[n+1]*radius;if(j===0)context.moveTo(x,y);else context.lineTo(x,y);}
      context.stroke();
    }
  },[full,small,strokeWidth,spread]);
  return <SphereStage name="orbit" label="Orbit, independently rotating broken rings. Move or touch to tilt them; arrow keys steer, click or Space expands the rings and Home resets." {...{compact,paused,speed,intensity,render}}><g fill="none" stroke="currentColor" strokeWidth={strokeWidth*.004} strokeLinecap="round" opacity=".73">{fallback.map((d,i)=><path key={i} d={d}/>)}</g></SphereStage>;
}
