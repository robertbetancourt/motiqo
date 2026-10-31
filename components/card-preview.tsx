'use client';
import {memo,useEffect,useRef,useState} from 'react';
import type {ElementId} from '@/lib/catalog';
import type {Settings} from '@/lib/element-controls';
import {registerPreviewCandidate} from '@/lib/preview-budget';
import * as posters from '@/registry/previews.json';
import * as clips from '@/registry/preview-videos.json';

/** Catalog media never imports or mounts the interactive component. */
export default memo(function CardPreview({id,paused,priority=false}:{id:ElementId;paused:boolean;priority?:boolean;settings?:Settings}){
  const host=useRef<HTMLDivElement>(null),video=useRef<HTMLVideoElement>(null);
  const [active,setActive]=useState(false),[ready,setReady]=useState(false),[theme,setTheme]=useState<'dark'|'light'>('dark');
  const artwork=(posters.items as Record<string,{dark:string;light:string}>)[id];
  const source=(clips.items as Record<string,{dark:string;light:string}>)[id]?.[theme];
  useEffect(()=>{
    const update=()=>setTheme(document.documentElement.dataset.theme==='light'?'light':'dark');update();
    const observer=new MutationObserver(update);observer.observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});return()=>observer.disconnect();
  },[]);
  useEffect(()=>{
    const root=host.current!,motion=matchMedia('(prefers-reduced-motion: reduce)');let visible=false;
    const candidate=registerPreviewCandidate(()=>Math.abs(root.getBoundingClientRect().top),setActive);
    const update=()=>candidate.update(visible&&!!source&&!paused&&!document.hidden&&!motion.matches);
    const observer=new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;update();},{threshold:0.1});observer.observe(root);
    document.addEventListener('visibilitychange',update);motion.addEventListener('change',update);
    return()=>{observer.disconnect();candidate.dispose();document.removeEventListener('visibilitychange',update);motion.removeEventListener('change',update);};
  },[paused,id,source]);
  useEffect(()=>{setReady(false);},[source]);
  useEffect(()=>{
    const player=video.current;if(!player)return;
    let cancelled=false;
    if(active&&source)player.play().catch(()=>{if(!cancelled)setReady(false);});else {player.pause();setReady(false);}
    return()=>{cancelled=true;player.pause();};
  },[active,source]);
  return <div ref={host} className="card-preview" inert aria-hidden="true" data-preview-id={id} data-preview-mode="video" data-live={active&&ready||undefined} data-preview-state={active&&ready?'video':'poster'}>
    {artwork&&<><img className="card-poster card-poster-dark" src={artwork.dark} alt="" width={posters.width} height={posters.height} loading={priority?'eager':'lazy'} decoding="async"/><img className="card-poster card-poster-light" src={artwork.light} alt="" width={posters.width} height={posters.height} loading={priority?'eager':'lazy'} decoding="async"/></>}
    {source&&<video ref={video} className="card-live" src={active?source:undefined} muted loop playsInline preload="none" disablePictureInPicture onPlaying={()=>setReady(true)} onError={()=>setReady(false)} style={{width:'100%',height:'100%',objectFit:'cover',pointerEvents:'none'}}/>}
  </div>;
});
