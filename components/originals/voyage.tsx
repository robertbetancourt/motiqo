"use client";
import {useEffect,useMemo,useRef,useState,type CSSProperties} from 'react';
import {bounded,createVoyageMotion,voyageImage} from './voyage-motion';
export type VoyageItem={image:string;title:string;category?:string;alt?:string};
export type VoyageProps={items?:VoyageItem[];speed?:number;cameraIntensity?:number;zoom?:number;backgroundColor?:string;className?:string;paused?:boolean;compact?:boolean;onIndexChange?:(index:number)=>void;autoPlay?:boolean;textColor?:string;accentColor?:string;title?:string};
const artwork: VoyageItem[] = [
  { image: '/media/gallery/image-01.webp', title: 'Soft machinery', category: 'Study 01' },
  { image: '/media/gallery/image-03.webp', title: 'Other worlds', category: 'Study 02' },
  { image: '/media/gallery/image-05.webp', title: 'A little wonder', category: 'Study 03' },
  { image: '/media/gallery/image-07.webp', title: 'Night companion', category: 'Study 04' },
  { image: '/media/gallery/image-10.webp', title: 'New perspectives', category: 'Study 05' },
  { image: '/media/gallery/image-12.webp', title: 'Quiet energy', category: 'Study 06' },
  { image: '/media/gallery/image-14.webp', title: 'Somewhere else', category: 'Study 07' },
  { image: '/media/gallery/image-18.webp', title: 'The unexpected', category: 'Study 08' },
];

function CurvedPrint({item}:{item:VoyageItem}){
 const [failed,setFailed]=useState(false);
 useEffect(()=>setFailed(false),[item.image]);
 return <>{item.image&&!failed?<><img className="vg-accessible-image" src={item.image} alt={item.alt??item.title} draggable={false} onError={()=>setFailed(true)}/><span className="vg-surface" aria-hidden="true">{Array.from({length:24},(_,i)=>{
 const u=(i+.5)/24-.5,angle=u*.64,radius=280/.64;
 return <span className="vg-strip" key={i} style={{width:280/24,transform:`translate3d(${Math.sin(angle)*radius-280/48}px,-105px,${radius*(Math.cos(angle)-1)}px) rotateY(${angle*180/Math.PI}deg)`,backgroundImage:`url(${JSON.stringify(item.image)})`,backgroundPosition:`${-i*280/24}px 0`}}/>;
 })}</span></>:<span className="vg-unavailable">Image unavailable</span>}</>;
}
export default function Voyage({items=artwork,speed=1,cameraIntensity=1,zoom=1,backgroundColor='#101210',accentColor='#b9cab8',className='',paused=false,compact=false,onIndexChange}:VoyageProps){
 const collection=useMemo(()=>(Array.isArray(items)?items:[]).filter(x=>x&&typeof x.title==='string').map(x=>({...x,image:voyageImage(x.image)})),[items]);
 const signature=JSON.stringify(collection),host=useRef<HTMLElement>(null),world=useRef<HTMLDivElement>(null),engine=useRef<ReturnType<typeof createVoyageMotion>|null>(null);
 const options=useRef({paused,playing:true,speed,intensity:cameraIntensity,zoom});options.current={paused,playing:true,speed:bounded(speed,1,.2,3),intensity:bounded(cameraIntensity,1,0,2),zoom:bounded(zoom,1,.7,1.35)};
 const callback=useRef(onIndexChange);callback.current=onIndexChange;
 const gesture=useRef<{id:number;x:number;y:number;last:number;dragged:boolean}|null>(null),wheelAt=useRef(-Infinity);
 const lastScroll=useRef(0),scrollSurface=useRef<HTMLDivElement>(null);
 useEffect(()=>{
  if(!host.current||!world.current||!collection.length)return;
  lastScroll.current=scrollSurface.current?.scrollTop??0;
  const owner=createVoyageMotion(host.current,world.current,[...world.current.querySelectorAll<HTMLElement>('.vg-card')],()=>options.current,index=>callback.current?.(index));engine.current=owner;
  return()=>{owner.dispose();engine.current=null;gesture.current=null};
 },[signature]);
 useEffect(()=>engine.current?.sync(),[paused,speed,cameraIntensity,zoom]);
 return <section ref={host} className={`voyage ${className}`} style={{'--vg-bg':backgroundColor,'--vg-ink':accentColor} as CSSProperties} data-compact={compact||undefined} aria-label="Immersive image gallery" role="region">
 <style>{css}</style>{collection.length?<div className="vg-viewport" role="group" aria-label="Scroll to fly through the gallery. Drag to look around."
 onKeyDown={e=>{if(e.altKey||e.ctrlKey||e.metaKey)return;if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();engine.current?.step(e.key==='ArrowRight'?1:-1)}}}
 onPointerDown={e=>{if(e.button!==0)return;gesture.current={id:e.pointerId,x:e.clientX,y:e.clientY,last:e.clientX,dragged:false}}}
 onPointerMove={e=>{const g=gesture.current;if(g&&g.id===e.pointerId){if(!g.dragged&&Math.abs(e.clientX-g.x)>7&&Math.abs(e.clientX-g.x)>Math.abs(e.clientY-g.y)){g.dragged=true;engine.current?.dragging(true);try{e.currentTarget.setPointerCapture(e.pointerId)}catch{}}if(g.dragged){engine.current?.drag((g.last-e.clientX)/Math.max(180,e.currentTarget.clientWidth*.3));g.last=e.clientX}}else{const b=e.currentTarget.getBoundingClientRect();engine.current?.pointer((e.clientX-b.left)/Math.max(1,b.width)*2-1,(e.clientY-b.top)/Math.max(1,b.height)*2-1)}}}
 onPointerUp={()=>{gesture.current=null;engine.current?.dragging(false)}} onPointerCancel={()=>{gesture.current=null;engine.current?.dragging(false)}} onLostPointerCapture={()=>{gesture.current=null;engine.current?.dragging(false)}}
 onPointerLeave={()=>{engine.current?.pointer(0,0);if(!gesture.current?.dragged)gesture.current=null}}
 onWheel={e=>{if(e.ctrlKey||Math.abs(e.deltaY)>=Math.abs(e.deltaX)||Math.abs(e.deltaX)<8)return;const now=performance.now();if(now-wheelAt.current>450){wheelAt.current=now;engine.current?.step(Math.sign(e.deltaX))}}}>
 <div ref={scrollSurface} className="vg-scroll" tabIndex={0} role="region" aria-label="Camera scroll. Scroll or use Page Down and Page Up to travel."
 onScroll={e=>{const node=e.currentTarget,range=node.scrollHeight-node.clientHeight,delta=node.scrollTop-lastScroll.current;lastScroll.current=node.scrollTop;if(range>0)engine.current?.scrub(delta/range)}}><div className="vg-scroll-space" aria-hidden="true"/></div>
 <div ref={world} className="vg-world"><div className="vg-decorations" aria-hidden="true">
 {[0,1].map(i=><span className="vg-orbit-line" key={i} style={{transform:`translate(-50%,-50%) translateY(${i?-132:132}px) rotateX(90deg)`}}/>)}
 <span className="vg-orbit-line vg-outer-orbit" style={{transform:'translate(-50%,-50%) rotateX(82deg) rotateZ(16deg)'}}/>
 {Array.from({length:56},(_,i)=><span className="vg-particle" key={i}/>)}
 </div>{collection.map((item,i)=><div className="vg-card" key={`${i}-${item.image}`}><CurvedPrint item={item}/></div>)}</div>
 </div>:<p className="vg-empty" role="status">No artwork to explore.</p>}</section>;
}
const css=`
.voyage{position:relative;width:100%;height:100%;min-height:280px;overflow:hidden;isolation:isolate;background:var(--vg-bg);color:#eee}
.voyage *{box-sizing:border-box}.voyage .vg-viewport{position:absolute;inset:0;perspective:var(--vg-perspective,1000px);perspective-origin:50% 50%;touch-action:pan-y pinch-zoom;cursor:grab;outline-offset:-5px}.voyage .vg-scroll:focus-visible{outline:2px solid var(--vg-ink);outline-offset:-4px}.voyage .vg-viewport:active{cursor:grabbing}
.voyage .vg-scroll{position:absolute;inset:0;overflow-y:auto;overflow-x:hidden;scrollbar-width:none;z-index:2;touch-action:pan-y pinch-zoom}.voyage .vg-scroll::-webkit-scrollbar{display:none}.voyage .vg-scroll-space{height:600%;min-height:1800px;pointer-events:none}.voyage .vg-world{pointer-events:none}
.voyage .vg-decorations{position:absolute;transform-style:preserve-3d;pointer-events:none}.voyage .vg-orbit-line{position:absolute;width:876px;height:876px;border:1px solid color-mix(in srgb,var(--vg-ink) 32%,transparent);border-radius:50%;opacity:calc(.38 + var(--vg-energy,0)*.5)}.voyage .vg-outer-orbit{width:1020px;height:1020px;border-style:dashed;border-color:color-mix(in srgb,var(--vg-ink) 20%,transparent)}.voyage .vg-particle{position:absolute;left:0;top:0;height:2px;border-radius:50%;background:var(--vg-ink);box-shadow:0 0 4px color-mix(in srgb,var(--vg-ink) 35%,transparent);transform-origin:left center}
.voyage .vg-world{position:absolute;top:50%;left:50%;width:0;height:0;transform-style:preserve-3d;will-change:transform}.voyage .vg-card{position:absolute;top:0;left:0;width:0;height:0;transform-style:preserve-3d}.voyage .vg-surface{position:absolute;transform-style:preserve-3d}.voyage .vg-strip{position:absolute;left:0;top:0;height:210px;background-size:280px 210px;background-repeat:no-repeat;backface-visibility:visible}
.voyage .vg-accessible-image{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%);pointer-events:none}.voyage .vg-unavailable{position:absolute;transform:translate(-50%,-50%);width:280px;height:210px;display:grid;place-items:center;background:#232622;color:#eee;font:14px sans-serif}.voyage .vg-empty{position:absolute;inset:45% 20px auto;text-align:center}
.voyage[data-reduced=true] .vg-surface{transform:none}.voyage[data-reduced=true] .vg-world{will-change:auto}
.voyage[data-reduced=true] .vg-decorations{display:none}
`;
