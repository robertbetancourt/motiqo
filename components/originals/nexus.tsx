'use client';
import {useMemo,useCallback} from 'react';
import SphereStage,{sphereClamp,type SphereState} from './sphere-stage';
import {createNexus,projectNexus} from './nexus-math';
export type NexusProps={compact?:boolean;paused?:boolean;speed?:number;intensity?:number;nodes?:number;connections?:number;strokeWidth?:number};
const resting:SphereState={time:0,tiltX:0,tiltY:0,pointerX:0,pointerY:0,presence:0,burst:0,intensity:0,small:false,light:false,width:1,height:1,radius:1};
export default function Nexus({compact=false,paused=false,speed=1,intensity=1,nodes=72,connections=1,strokeWidth=.65}:NexusProps){
  const full=useMemo(()=>createNexus(nodes),[nodes]),small=useMemo(()=>createNexus(Math.min(nodes,48)),[nodes]);
  const fallback=useMemo(()=>projectNexus(compact?small:full,resting).slice(),[compact,full,small]);
  const render=useCallback((context:CanvasRenderingContext2D,state:SphereState)=>{
    const geometry=state.small?small:full,data=projectNexus(geometry,state),radius=state.radius,cx=state.width/2,cy=state.height/2;
    context.strokeStyle=state.light?'#504b46':'#c9ced3';context.fillStyle=state.light?'#403b36':'#f3f0ea';context.lineWidth=sphereClamp(strokeWidth,.25,1.5)*(state.small?.85:1);
    for(let side=0;side<2;side++){
      for(const[a,b]of geometry.edges){const n=a*5,m=b*5,depth=(data[n+2]+data[m+2])*.5;if((depth>=0?1:0)!==side)continue;
        context.globalAlpha=sphereClamp((.17+(depth+1)*.14)*sphereClamp(connections,0,1.5)*(state.light?1.25:1),0,1);context.beginPath();context.moveTo(cx+data[n]*radius,cy-data[n+1]*radius);context.lineTo(cx+data[m]*radius,cy-data[m+1]*radius);context.stroke();
      }
      for(let i=0;i<geometry.nodes.length;i++){const n=i*5;if((data[n+2]>=0?1:0)!==side)continue;context.globalAlpha=data[n+4];context.beginPath();context.arc(cx+data[n]*radius,cy-data[n+1]*radius,data[n+3]*(state.small?.8:1.25),0,Math.PI*2);context.fill();}
    }
  },[full,small,connections,strokeWidth]);
  const geometry=compact?small:full;
  return <SphereStage name="nexus" label="Nexus, a layered network sphere. Move or touch to turn it; arrow keys steer, click or Space sends a pulse and Home resets." {...{compact,paused,speed,intensity,render}}>
    <g stroke="currentColor" strokeWidth={strokeWidth*.004} opacity={sphereClamp(connections,0,1.5)*.35}>{geometry.edges.map(([a,b],i)=><line key={i} x1={fallback[a*5]} y1={-fallback[a*5+1]} x2={fallback[b*5]} y2={-fallback[b*5+1]}/>)}</g>
    <g fill="currentColor">{geometry.nodes.map((_,i)=><circle key={i} cx={fallback[i*5]} cy={-fallback[i*5+1]} r={fallback[i*5+3]*.006} opacity={fallback[i*5+4]}/>)}</g>
  </SphereStage>;
}
