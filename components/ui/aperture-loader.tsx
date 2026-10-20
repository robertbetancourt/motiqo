'use client';
import { useEffect, useRef } from 'react';
import { createKineticLoop } from './kinetic-loop';

export type ApertureLoaderProps={fontUrl?:string;images?:string[];duration?:number;circleSize?:number;autoPlay?:boolean;loopDelay?:number;onComplete?:()=>void;interactive?:boolean;paused?:boolean;compact?:boolean;className?:string};
export const apertureImages=[
 '/media/gallery/image-01.webp','/media/gallery/image-02.webp','/media/gallery/image-03.webp','/media/gallery/image-04.webp',
 '/media/gallery/image-05.webp','/media/gallery/image-06.webp','/media/gallery/image-07.webp','/media/gallery/image-08.webp',
 '/media/gallery/image-09.webp','/media/gallery/image-10.webp','/media/gallery/image-11.webp','/media/gallery/image-12.webp',
];
const clamp=(n:number,a:number,b:number)=>Math.max(a,Math.min(b,Number.isFinite(n)?n:a));
export function apertureProgress(t:number){t=clamp(t,0,1);if(t<.28)return 1+17*Math.pow(t/.28,1.45);if(t<.78){const u=(t-.28)/.5;return 18+70*(u*u*(3-2*u));}return 88+12*(1-Math.pow(1-(t-.78)/.22,2.2));}
export function apertureTime(progress:number){if(progress>=100)return 1;if(progress<=1)return 0;let a=0,b=1;for(let i=0;i<20;i++){const m=(a+b)/2;if(apertureProgress(m)<progress)a=m;else b=m;}return(a+b)/2;}

export default function ApertureLoader({fontUrl='https://cdn.fontshare.com/wf/FPDAZ2S6SW4QMSRIIKNNGTPM6VIXYMKO/5HNPQ453FRLIQWV2FNOBUU3FKTDZQVSG/Z3MGHFHX6DCTLQ55LJYRJ5MDCZPMFZU6.woff2',images=apertureImages,duration=3200,circleSize=160,autoPlay=true,loopDelay=900,onComplete,interactive=true,paused=false,compact=false,className=''}:ApertureLoaderProps){
  const host=useRef<HTMLDivElement>(null),canvas=useRef<HTMLCanvasElement>(null),output=useRef<HTMLOutputElement>(null),sync=useRef<(()=>void)|null>(null),replay=useRef<(()=>void)|null>(null);
  const options=useRef({duration,circleSize,autoPlay,loopDelay,onComplete,interactive,paused});options.current={duration,circleSize,autoPlay,loopDelay,onComplete,interactive,paused};
  const imageKey=JSON.stringify(images.filter(s=>typeof s==='string'&&s.length).slice(0,40));
  useEffect(()=>{
    const root=host.current!,surface=canvas.current!,context=surface.getContext('2d');if(!context){root.dataset.ready='true';return;}const ctx:CanvasRenderingContext2D=context;
    let width=1,height=1,dpr=1,elapsed=0,ready=false,disposed=false,done=false,completed=false,started=false,drag=false,moved=false,startX=0,startY=0,oldIndex=-1,imageTime=0,lastPercent=-1;
    let px=0,py=0,tx=0,ty=0;const loaded:HTMLImageElement[]=[];
    const resize=()=>{width=root.clientWidth||1;height=root.clientHeight||1;dpr=Math.min(devicePixelRatio||1,compact?1.25:2);surface.width=Math.round(width*dpr);surface.height=Math.round(height*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);};
    const reset=()=>{elapsed=0;done=completed=false;started=true;oldIndex=-1;imageTime=0;loop.sync();};replay.current=reset;
    function draw(dt:number,still:boolean,reduced:boolean){
      const o=options.current,d=clamp(o.duration,400,20000),delay=clamp(o.loopDelay,0,10000);
      if(ready&&!still&&!drag){elapsed+=dt*1000;started=true;}
      if(still&&!started)elapsed=d;
      if(ready&&elapsed>=d&&!completed&&!still){completed=true;o.onComplete?.();if(!o.autoPlay)done=true;}
      if(o.autoPlay&&elapsed>=d+delay&&ready&&!still){elapsed=0;completed=false;oldIndex=-1;}
      const progress=apertureProgress(elapsed/d),index=Math.min(loaded.length-1,Math.floor((progress-1)/99*loaded.length));
      if(index!==oldIndex){oldIndex=index;imageTime=0;}if(!still)imageTime+=dt;
      px+=(tx-px)*(1-Math.exp(-dt*8));py+=(ty-py)*(1-Math.exp(-dt*8));if(reduced)px=py=0;
      const hold=Math.max(0,elapsed-d),pulse=progress>=100&&!still?.05*Math.sin(Math.PI*Math.min(1,hold/Math.max(1,delay))):0;
      const diameter=Math.min(clamp(o.circleSize,60,360),Math.min(width,height)*.65)*(1+pulse),r=diameter/2,cx=width/2+px,cy=height/2+py;
      ctx.clearRect(0,0,width,height);ctx.fillStyle='#000';ctx.fillRect(0,0,width,height);ctx.save();ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);ctx.clip();
      const image=loaded[index];if(image){const zoom=still?1:1+.12*Math.exp(-imageTime*7),scale=Math.max(diameter/image.naturalWidth,diameter/image.naturalHeight)*zoom;const iw=image.naturalWidth*scale,ih=image.naturalHeight*scale;ctx.drawImage(image,cx-iw/2,cy-ih/2,iw,ih);}else{ctx.fillStyle='#222';ctx.fillRect(cx-r,cy-r,diameter,diameter);}ctx.restore();
      const percent=Math.min(100,Math.floor(progress));if(lastPercent!==percent){lastPercent=percent;if(output.current)output.current.textContent=`${percent}%`;root.setAttribute('aria-valuenow',String(percent));}
      return ready;
    }
    const loop=createKineticLoop(root,draw,resize,()=>options.current.paused||done);sync.current=()=>{if(options.current.autoPlay)done=false;loop.sync();};
    const sources=JSON.parse(imageKey) as string[];const assets=sources.map(src=>new Image());
    Promise.all(assets.map((image,i)=>new Promise<HTMLImageElement|null>(resolve=>{image.crossOrigin='anonymous';image.onload=()=>resolve(image);image.onerror=()=>resolve(null);image.src=sources[i];}))).then(result=>{if(disposed)return;loaded.push(...result.filter((image):image is HTMLImageElement=>!!image));ready=true;elapsed=0;started=false;loop.sync();});
    const down=(e:PointerEvent)=>{if(!options.current.interactive||loop.reduced())return;drag=true;moved=false;startX=e.clientX;startY=e.clientY;done=false;root.setPointerCapture?.(e.pointerId);};
    const move=(e:PointerEvent)=>{if(!options.current.interactive||loop.reduced())return;const b=root.getBoundingClientRect(),x=(e.clientX-b.left)/b.width,y=(e.clientY-b.top)/b.height;tx=(x-.5)*16;ty=(y-.5)*16;
      if(drag&&Math.hypot(e.clientX-startX,e.clientY-startY)>4){moved=true;elapsed=apertureTime(clamp(x,0,1)*99+1)*clamp(options.current.duration,400,20000);started=true;loop.sync();}};
    const up=()=>{if(!drag)return;drag=false;if(!moved)reset();else loop.sync();};const leave=()=>{tx=ty=0;};const cancel=()=>{drag=false;leave();};
    const key=(e:KeyboardEvent)=>{if(e.target!==root||!['Enter',' ','Home','ArrowLeft','ArrowRight','End'].includes(e.key))return;e.preventDefault();if(['Enter',' ','Home'].includes(e.key)){reset();return;}const p=apertureProgress(elapsed/clamp(options.current.duration,400,20000));elapsed=apertureTime(e.key==='End'?100:clamp(p+(e.key==='ArrowRight'?5:-5),1,100))*clamp(options.current.duration,400,20000);done=false;completed=false;started=true;loop.sync();};
    root.addEventListener('pointerdown',down);root.addEventListener('pointermove',move);root.addEventListener('pointerup',up);root.addEventListener('pointercancel',cancel);root.addEventListener('lostpointercapture',cancel);root.addEventListener('pointerleave',leave);root.addEventListener('keydown',key);
    return()=>{disposed=true;loop.dispose();sync.current=replay.current=null;for(const image of assets){image.onload=image.onerror=null;}root.removeEventListener('pointerdown',down);root.removeEventListener('pointermove',move);root.removeEventListener('pointerup',up);root.removeEventListener('pointercancel',cancel);root.removeEventListener('lostpointercapture',cancel);root.removeEventListener('pointerleave',leave);root.removeEventListener('keydown',key);};
  },[imageKey,compact]);
  useEffect(()=>sync.current?.(),[duration,circleSize,autoPlay,loopDelay,interactive,paused]);
  return <div ref={host} className={`aperture-loader ${className}`} role="progressbar" aria-label="Aperture Loader. Click or press Enter to replay; arrow keys scrub" aria-valuemin={1} aria-valuemax={100} aria-valuenow={1} tabIndex={compact?-1:0}><style>{`@font-face{font-family:'Motiqo Clash Display';src:url(${JSON.stringify(fontUrl)}) format('woff2');font-weight:600;font-style:normal;font-display:swap}.aperture-loader{position:relative;width:100%;height:100%;min-height:220px;overflow:hidden;background:#000;color:white;user-select:none;touch-action:pan-y;outline-offset:-4px;container-type:size}.aperture-loader canvas{position:absolute;inset:0;width:100%;height:100%}.al-percent{position:absolute;right:7%;bottom:7%;font:600 clamp(32px,10cqw,60px)/1 'Motiqo Clash Display',sans-serif;letter-spacing:-.065em;font-variant-numeric:tabular-nums;pointer-events:none}`}</style><canvas ref={canvas} aria-hidden="true"/><output ref={output} className="al-percent" aria-hidden="true">1%</output></div>;
}
