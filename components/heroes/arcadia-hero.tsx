'use client';
import {useEffect,useRef,useState} from 'react';
import {heroClock} from './hero-clock';
import styles from './heroes.module.css';

export const arcadiaImages=Array.from({length:16},(_,i)=>`/media/gallery/image-${String(i+1).padStart(2,'0')}.webp`);
export type ArcadiaHeroProps={images?:string[];autoPlay?:boolean;rotationSpeed?:number;radius?:number;titleLine1?:string;titleLine2?:string;subtitle?:string;ctaText?:string;onCtaClick?:()=>void;paused?:boolean;dark?:boolean;className?:string};
export default function ArcadiaHero({images=arcadiaImages,autoPlay=true,rotationSpeed=1,radius,titleLine1='Make room for',titleLine2='your next idea.',subtitle='Turn a passing thought into a visual worth keeping.',ctaText='Explore your vision',onCtaClick,paused=false,dark=false,className=''}:ArcadiaHeroProps){
 const root=useRef<HTMLElement>(null),cards=useRef<(HTMLButtonElement|null)[]>([]),clock=useRef<ReturnType<typeof heroClock>|null>(null),options=useRef({autoPlay,rotationSpeed,paused,radius}),state=useRef({angle:0,velocity:0,hover:-1,focused:false,still:false,offsets:Array(16).fill(0) as number[],width:1280,height:900,drag:false,lastX:0,distance:0}),[selected,setSelected]=useState(-1);
 options.current={autoPlay,rotationSpeed,paused,radius};const collection=images.length?Array.from({length:16},(_,i)=>images[i%images.length]):[];
 useEffect(()=>{
  const host=root.current!,s=state.current;
  clock.current=heroClock(host,({dt,still})=>{
   s.still=still;const p=options.current;if(!still){s.angle+=((p.autoPlay&&!s.focused ? .15*Math.max(-4,Math.min(4,p.rotationSpeed))*(s.hover<0?1:.3):0)+s.velocity)*dt;s.velocity*=Math.exp(-3.1*dt);s.angle%=Math.PI*2;}
   const mobile=s.width<600,r=p.radius&&p.radius>0?Math.min(p.radius,s.width*.8):mobile?s.width*.66:Math.min(s.width*.43,590),cy=mobile?s.height*.37:s.height*.76;
   cards.current.forEach((card,i)=>{if(!card)return;const target=s.hover===i?26:0;s.offsets[i]+=(target-s.offsets[i])*(still?1:1-Math.exp(-dt*11));const a=(i/16)*Math.PI*2+s.angle,normalized=Math.atan2(Math.sin(a),Math.cos(a)),x=Math.sin(a)*(r+s.offsets[i]),y=-Math.cos(a)*(r+s.offsets[i]);
    // Fade through the lower arc before hiding, including reverse drag and angle wrap.
    const fade=Math.max(0,Math.min(1,(Math.abs(normalized)/Math.PI-.48)/.22)),opacity=1-fade*fade*fade*(fade*(fade*6-15)+10),interactive=opacity>.15;
    card.style.transform=`translate3d(${s.width*.5+x}px,${cy+y}px,0) translate(-50%,-50%) rotate(${normalized*180/Math.PI}deg) scale(${1+s.offsets[i]/430})`;card.style.opacity=String(opacity);card.style.visibility=opacity>0?'visible':'hidden';card.style.pointerEvents=interactive?'auto':'none';card.tabIndex=interactive?0:-1;card.setAttribute('aria-hidden',String(!interactive));});
  },(width,height)=>{s.width=width;s.height=height;},()=>options.current.paused);
  const wheel=(e:WheelEvent)=>{if(Math.abs(e.deltaX)<=Math.abs(e.deltaY))return;e.preventDefault();s.angle+=e.deltaX*.002;clock.current?.invalidate();};host.addEventListener('wheel',wheel,{passive:false});
  return()=>{host.removeEventListener('wheel',wheel);clock.current?.dispose();clock.current=null;};
 },[images.length]);
 useEffect(()=>{clock.current?.invalidate();},[paused,autoPlay,rotationSpeed,radius]);
 function nudge(direction:number){const s=state.current;if(s.still){s.angle+=direction*Math.PI/8;s.velocity=0;}else{s.velocity=Math.max(-4,Math.min(4,s.velocity+direction*1.22));}clock.current?.invalidate();}
 return <section ref={root} className={`${styles.hero} ${styles.arcadia} ${dark?styles.arcadiaDark:''} ${className}`} aria-label="Arcadia photographic hero">
  <div className={styles.orbit} role="group" aria-label="Drag the image orbit or use the arrow keys" onKeyDown={e=>{if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();nudge(e.key==='ArrowRight'?1:-1);}}} onPointerDown={e=>{if(e.button!==0)return;const s=state.current;s.drag=true;s.lastX=e.clientX;s.distance=0;const target=(e.target as HTMLElement).closest('button')??e.currentTarget;target.setPointerCapture(e.pointerId);}} onPointerMove={e=>{const s=state.current;if(!s.drag)return;const dx=e.clientX-s.lastX;s.angle+=dx*.004;s.velocity=Math.max(-2,Math.min(2,dx*.08));s.lastX=e.clientX;s.distance+=Math.abs(dx);clock.current?.invalidate();}} onPointerUp={()=>{state.current.drag=false;}} onPointerCancel={()=>{state.current.drag=false;}}>
   {collection.map((image,i)=><button key={`${i}-${image}`} ref={node=>{cards.current[i]=node;}} className={styles.orbitCard} aria-label={`Select image ${i+1}`} aria-pressed={selected===i} onPointerEnter={()=>{state.current.hover=i;clock.current?.invalidate();}} onPointerLeave={()=>{state.current.hover=-1;}} onFocus={()=>{state.current.focused=true;state.current.hover=i;clock.current?.invalidate();}} onBlur={()=>{state.current.focused=false;state.current.hover=-1;}} onClick={()=>{if(state.current.distance<8)setSelected(i);}}><img src={image} alt="" draggable={false} loading="eager" decoding="async"/></button>)}
  </div>
  <div className={styles.arcadiaCopy}><h1>{titleLine1}<br/>{titleLine2}</h1><p>{subtitle}</p><button className={styles.darkButton} onClick={()=>{state.current.velocity+=1.4;clock.current?.invalidate();onCtaClick?.();}}>{ctaText}<span aria-hidden="true">→</span></button><div className={styles.orbitControls}><button aria-label="Rotate gallery left" onClick={()=>nudge(-1)}>←</button><span>{selected<0?'Explore the possibilities':`Image ${selected+1} selected`}</span><button aria-label="Rotate gallery right" onClick={()=>nudge(1)}>→</button></div></div>
  <div className={styles.arcadiaFeatures}>{[['Your perspective','Start with the way you see things.'],['Room to play','Follow an idea somewhere unexpected.'],['Made to keep','Find the image that feels like you.']].map(([title,description])=><div key={title}><h2>{title}</h2><p>{description}</p></div>)}</div>
 </section>;
}
