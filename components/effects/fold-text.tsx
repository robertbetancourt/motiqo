'use client';
import { useEffect, useRef, type CSSProperties } from 'react';
import './fold-text.css';
type Props={text:string;hinge?:'top'|'bottom'|'left'|'right';duration?:number;stagger?:number;paused?:boolean;className?:string};
/** Authored Motiqo text entrance using the browser animation API. */
export default function FoldText({text,hinge='left',duration=.8,stagger=.024,paused=false,className=''}:Props){
  const root=useRef<HTMLSpanElement>(null);
  useEffect(()=>{
    const media=matchMedia('(prefers-reduced-motion: reduce)'),pieces=Array.from(root.current!.querySelectorAll<HTMLElement>('.mf-piece'));
    let animations:Animation[]=[],gone=false,frame=0;
    const clear=()=>{animations.forEach(animation=>animation.cancel());animations=[];};
    const play=()=>{clear();if(paused||media.matches){pieces.forEach(piece=>{piece.style.opacity='1';piece.style.transform='none';});return;}
      pieces.forEach((piece,i)=>{piece.style.removeProperty('opacity');piece.style.removeProperty('transform');const transform=hinge==='left'?'rotateY(80deg)':hinge==='right'?'rotateY(-80deg)':hinge==='top'?'rotateX(-80deg)':'rotateX(80deg)';
        animations.push(piece.animate([{opacity:0,transform},{opacity:1,transform:'rotateX(0) rotateY(0)'}],{duration:Math.max(.1,duration)*1000,delay:i*Math.max(0,stagger)*1000,easing:'cubic-bezier(.16,.75,.24,1)',fill:'both'}));});
    };
    document.fonts.ready.then(()=>{if(!gone)frame=requestAnimationFrame(play);});media.addEventListener('change',play);
    return()=>{gone=true;cancelAnimationFrame(frame);clear();media.removeEventListener('change',play);};
  },[text,hinge,duration,stagger,paused]);
  return <span ref={root} className={`motiqo-fold ${className}`} data-paused={paused||undefined} style={{'--mf-origin':hinge==='left'?'0% 50%':hinge==='right'?'100% 50%':hinge==='top'?'50% 0%':'50% 100%'} as CSSProperties}><span className="sr-only">{text}</span><span aria-hidden="true">{text.split('\n').map((line,i)=><span className="mf-line" key={i}>{line.split(' ').map((word,j)=><span className="mf-word" key={j}>{j>0&&'\u00a0'}{Array.from(word).map((letter,k)=><span className="mf-hinge" key={k}><span className="mf-piece">{letter}</span></span>)}</span>)}</span>)}</span></span>;
}
