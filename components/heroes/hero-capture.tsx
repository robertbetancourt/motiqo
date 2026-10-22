'use client';
import {useEffect,useRef} from 'react';
import type {HeroId} from '@/lib/heroes';
import HeroStage from './hero-stage';
export default function HeroCapture({id,paused}:{id:HeroId;paused:boolean}){
 const host=useRef<HTMLDivElement>(null);
 useEffect(()=>{let gone=false,sent=false,frame=0;const node=host.current!;function report(){if(sent||!node.querySelector('[data-ready=true],[data-failed=true]'))return;sent=true;document.fonts.ready.then(async()=>{const images=[...node.querySelectorAll('img')].filter(image=>getComputedStyle(image).visibility!=='hidden'&&image.getBoundingClientRect().bottom>0);await Promise.all(images.map(image=>image.complete?Promise.resolve():new Promise(resolve=>{image.addEventListener('load',resolve,{once:true});image.addEventListener('error',resolve,{once:true});})));if(gone)return;frame=requestAnimationFrame(()=>{frame=requestAnimationFrame(()=>{if(gone)return;node.dataset.ready='true';if(window.parent!==window)window.parent.postMessage({type:'motiqo:hero-ready',id},window.location.origin);});});});}const observer=new MutationObserver(report);observer.observe(node,{subtree:true,attributes:true,attributeFilter:['data-ready','data-failed']});report();return()=>{gone=true;observer.disconnect();cancelAnimationFrame(frame);};},[id]);
 return <div ref={host} data-testid="hero-capture" style={{position:'absolute',left:0,top:0,zIndex:999999,overflow:'hidden',background:'#fff',height:paused?'900px':'max(100dvh, 780px)',width:paused?'1280px':'100%',isolation:'isolate'}}><HeroStage id={id} paused={paused}/></div>;
}
