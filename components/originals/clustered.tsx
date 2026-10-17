'use client';
import {useEffect,useRef} from 'react';
import {effectRuntime} from './effect-runtime';
export type ClusteredProps={strandCount?:number;clusterCount?:number;fallSpeed?:number;pulseFrequency?:number;glowIntensity?:number;motionIntensity?:number;colorPalette?:readonly string[];interactive?:boolean;compact?:boolean;paused?:boolean;className?:string};
const palette=['#082fff','#3b82f6','#bae6fd'];
const clamp=(v:number,a:number,b:number)=>Math.max(a,Math.min(b,Number.isFinite(v)?v:a));
const random=(n:number)=>{const v=Math.sin(n*127.1+311.7)*43758.5453;return v-Math.floor(v);};
const gust=(time:number,seed:number)=>{const n=Math.floor(time),f=time-n,ease=f*f*(3-2*f);return random(n+seed)*(1-ease)+random(n+1+seed)*ease;};
/** The first scene only: continuous silk curtains and falling fiber-optic beads. */
export default function Clustered({strandCount=64,clusterCount=6,fallSpeed=1,pulseFrequency=1,glowIntensity=1,motionIntensity=1,colorPalette=palette,interactive=true,compact=false,paused=false,className=''}:ClusteredProps){
 const root=useRef<HTMLDivElement>(null),canvas=useRef<HTMLCanvasElement>(null),wake=useRef<()=>void>(()=>{}),options=useRef({strandCount,clusterCount,fallSpeed,pulseFrequency,glowIntensity,motionIntensity,colorPalette,interactive,paused});options.current={strandCount,clusterCount,fallSpeed,pulseFrequency,glowIntensity,motionIntensity,colorPalette,interactive,paused};
 useEffect(()=>{
  const host=root.current!,surface=canvas.current!,ctx=surface.getContext('2d',{alpha:false}),aura=document.createElement('canvas'),blur=aura.getContext('2d');if(!ctx||!blur){host.dataset.failed='true';return;}
  let mx=-10,my=-10,hover=0,w=1,h=1,dpr=1,drift=0,flow=0;const points=new Float32Array(97*2),wind=new Float64Array(10*7),strandSeeds=Float64Array.from({length:100},(_,i)=>random(i+21));let segments=96;
  function xAt(y:number,time:number,i:number,count:number,clusters:number){
   const cluster=i%clusters,j=Math.floor(i/clusters),members=Math.ceil((count-cluster)/clusters),k=cluster*7;
   const offset=(j-(members-1)*.5)*wind[k+4];
   const widening=.85+.68*Math.sin(y*4.7+wind[k+5]);
   let x=wind[k]+Math.sin(y*4.3-wind[k+2]+wind[k+1])*wind[k+3]
    +Math.sin(y*8.4+wind[k+2]*.61+wind[k+1]*.7)*.018
    +offset*widening
    +Math.sin(y*13.5+j*.76-wind[k+2]*1.12)*(.0035+strandSeeds[i]*.0055)*(1.+Math.sin(y*3.1+wind[k+6])*.45);
   if(options.current.interactive&&hover){const dy=y-my,dx=x-mx;const influence=Math.exp(-(dx*dx*30+dy*dy*4));x+=dx*influence*.16*hover;}
   return x*w;
  }
  const clock=effectRuntime(host,surface,(time,dt)=>{
   const p=options.current,count=Math.round(clamp(p.strandCount,10,100)),clusters=Math.round(clamp(p.clusterCount,1,10)),glow=clamp(p.glowIntensity,0,3),frequency=clamp(p.pulseFrequency,0,3),colors=palette.map((fallback,i)=>/^#[\da-f]{6}$/i.test(p.colorPalette[i]??'')?p.colorPalette[i]:fallback);
   const fieldTime=time*clamp(p.motionIntensity,0,2.5);
   // Each curtain has its own wind, travel rate, opening width and breathing phase.
   // These are cached per frame; fine filaments and beads reuse the same curve.
   for(let c=0;c<clusters;c++){
    const k=c*7,seed=random(c+917),phase=c*1.79;
    wind[k]=(clusters===1?.5:-.025+c/(clusters-1)*1.05)+(seed-.5)*.07
     +Math.sin(fieldTime*(.19+seed*.12)+phase)*.026+Math.sin(fieldTime*.41+phase*2.)*.012+(gust(fieldTime*.29,c+42)-.5)*.036;
    wind[k+1]=phase;wind[k+2]=fieldTime*(.62+seed*.7)+Math.sin(fieldTime*.28+phase)*.65+(gust(fieldTime*.38,c+83)-.5)*1.1;
    wind[k+3]=.055+seed*.028+Math.sin(fieldTime*.33+phase)*.018+(gust(fieldTime*.31,c+132)-.5)*.028;
    wind[k+4]=.0065+seed*.0038;wind[k+5]=fieldTime*(.34+seed*.21)+phase;wind[k+6]=fieldTime*.37+phase;
   }
   drift+=dt;flow+=dt*clamp(p.fallSpeed,0,3);hover=Math.max(0,hover-dt*.16);segments=compact?64:96;
   ctx.setTransform(dpr,0,0,dpr,0,0);ctx.globalCompositeOperation='source-over';ctx.globalAlpha=1;ctx.fillStyle='#02040a';ctx.fillRect(0,0,w,h);
   const aw=aura.width,ah=aura.height;blur.setTransform(1,0,0,1,0,0);blur.clearRect(0,0,aw,ah);blur.setTransform(aw/w,0,0,ah/h,0,0);blur.globalCompositeOperation='lighter';blur.lineWidth=w*.016;blur.strokeStyle=colors[0];blur.globalAlpha=.11*glow;blur.lineCap='round';
   ctx.globalCompositeOperation='lighter';ctx.lineCap='round';
   for(let i=0;i<count;i++){
    for(let j=0;j<=segments;j++){const y=j/segments;points[j*2]=xAt(y,time,i,count,clusters);points[j*2+1]=y*h;}
    blur.beginPath();ctx.beginPath();for(let j=0;j<=segments;j++){if(j===0){blur.moveTo(points[0],0);ctx.moveTo(points[0],0);}else{blur.lineTo(points[j*2],points[j*2+1]);ctx.lineTo(points[j*2],points[j*2+1]);}}blur.lineWidth=w*(.013+strandSeeds[i]*.014);blur.globalAlpha=(.045+strandSeeds[i]*.09)*glow;blur.stroke();
    ctx.lineWidth=(.65+strandSeeds[i]*1.05)*(compact?.85:1);ctx.globalAlpha=(.16+strandSeeds[i]*.37)*Math.min(glow,1.8);ctx.strokeStyle=i%8===0?colors[2]:colors[1];ctx.stroke();
    if(i%13===3){
     // A few foreground silk sheets add body between the fine threads and the broad aura.
     ctx.strokeStyle=colors[1];ctx.globalAlpha=(.08+strandSeeds[i]*.065)*glow;ctx.lineWidth=w*(.004+strandSeeds[i]*.006);ctx.stroke();
     ctx.globalAlpha=.12*glow;ctx.lineWidth=Math.max(1.3,w*.0018);ctx.stroke();
    }
   }
   ctx.globalAlpha=.95;ctx.filter='blur(6px)';ctx.drawImage(aura,0,0,w,h);ctx.filter='none';
   if(frequency>0){for(let i=0;i<count;i++){
    if(random(i+91)>.34*frequency)continue;
    const head=((flow*(.08+random(i+5)*.11)+random(i+51)*1.5)%1.5)-.15;
    const tailLength=.12+random(i+6)*.12,beads=6+Math.floor(random(i+7)*9),x=xAt(head,time,i,count,clusters);
    const gradient=ctx.createLinearGradient(0,(head-tailLength)*h,0,head*h);gradient.addColorStop(0,'transparent');gradient.addColorStop(.7,colors[1]);gradient.addColorStop(1,colors[2]);ctx.strokeStyle=gradient;ctx.globalAlpha=.7*glow;ctx.lineWidth=1.2;
    ctx.beginPath();for(let j=0;j<=20;j++){const y=head-tailLength+j/20*tailLength;if(j===0)ctx.moveTo(xAt(y,time,i,count,clusters),y*h);else ctx.lineTo(xAt(y,time,i,count,clusters),y*h);}ctx.stroke();
    for(let k=0;k<beads;k++){const y=head-k*.009,px=xAt(y,time,i,count,clusters),py=y*h,radius=(1-k/beads)*1.15+.25;if(y<0||y>1)continue;ctx.globalAlpha=(1-k/beads)*Math.min(glow,1.8);ctx.fillStyle=colors[2];ctx.beginPath();ctx.arc(px,py,radius,0,Math.PI*2);ctx.fill();if(k===0){const g=ctx.createRadialGradient(px,py,0,px,py,9);g.addColorStop(0,colors[1]);g.addColorStop(1,'transparent');ctx.fillStyle=g;ctx.fillRect(px-9,py-9,18,18);}}
   }}
   for(let i=0;i<60;i++){const px=((random(i+200)*w+Math.sin(drift*.08+i)*8)+w)%w,py=((random(i+400)*h-drift*(1+random(i+601)*3))%h+h)%h,r=.3+random(i+800)*.8;ctx.globalAlpha=(.12+random(i+201)*.48)*glow;ctx.fillStyle=colors[2];ctx.beginPath();ctx.arc(px,py,r,0,Math.PI*2);ctx.fill();}
   ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';
  },()=>options.current.paused,(width,height,ratio)=>{w=width;h=height;dpr=ratio;aura.width=Math.max(1,Math.round(w/4));aura.height=Math.max(1,Math.round(h/4));},compact);wake.current=clock.invalidate;
  function move(e:PointerEvent){const r=host.getBoundingClientRect();mx=(e.clientX-r.left)/r.width;my=(e.clientY-r.top)/r.height;hover=1;clock.invalidate();}function leave(){hover=0;clock.invalidate();}host.addEventListener('pointermove',move);host.addEventListener('pointerleave',leave);
  return()=>{clock.dispose();wake.current=()=>{};host.removeEventListener('pointermove',move);host.removeEventListener('pointerleave',leave);aura.width=1;aura.height=1;};
 },[compact]);
 useEffect(()=>wake.current(),[strandCount,clusterCount,fallSpeed,pulseFrequency,glowIntensity,motionIntensity,colorPalette,interactive,paused]);
 return <div ref={root} className={`mq-clustered ${className}`} role="img" aria-label="Blue silk-like light filaments in organic clusters, with falling luminous beads"><style>{`.mq-clustered{position:relative;width:100%;height:100%;min-height:160px;overflow:hidden;background:#02040a}.mq-clustered>canvas{display:block;position:absolute;inset:0;width:100%;height:100%;pointer-events:none}`}</style><canvas ref={canvas} aria-hidden="true"/></div>;
}
