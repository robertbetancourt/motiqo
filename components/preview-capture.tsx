'use client';
import {useEffect,useRef,useState} from 'react';
import type {ElementId} from '@/registry/element-ids';
import {Demo} from './demos';
import {observePreviewReady} from '@/lib/preview-ready';

export default function PreviewCapture({id,theme}:{id:ElementId;theme:'dark'|'light'}){
  const root=useRef<HTMLDivElement>(null),[ready,setReady]=useState(false),[prepared,setPrepared]=useState(false);
  useEffect(()=>{
    const previous=document.documentElement.dataset.theme,match=window.matchMedia.bind(window);
    // Capture each component's own complete reduced-motion pose. This fixture
    // lives only in development and restores the document on unmount.
    window.matchMedia=query=>query.includes('prefers-reduced-motion')?({...match(query),matches:true,media:query,addEventListener(){},removeEventListener(){},addListener(){},removeListener(){},dispatchEvent(){return true;},onchange:null} as MediaQueryList):match(query);
    const frame=requestAnimationFrame(()=>{document.documentElement.dataset.theme=theme;document.dispatchEvent(new CustomEvent('motiqo-theme-change',{detail:theme}));setPrepared(true);});
    return()=>{cancelAnimationFrame(frame);window.matchMedia=match;document.documentElement.dataset.theme=previous;document.dispatchEvent(new CustomEvent('motiqo-theme-change',{detail:previous}));};
  },[theme]);
  useEffect(()=>{
    if(!prepared)return;
    let gone=false,timer:ReturnType<typeof setTimeout>|undefined;
    const stop=observePreviewReady(root.current!,()=>{document.fonts.ready.then(()=>{if(!gone)timer=setTimeout(()=>{if(!gone)setReady(true);},500);});});
    return()=>{gone=true;stop();clearTimeout(timer);};
  },[prepared]);
  return <div ref={root} className="preview-capture" data-testid="poster-surface" data-ready={ready||undefined} aria-label={`${id} ${theme} poster`}>
    <style>{`.preview-capture{position:fixed!important;left:0;top:0;width:320px;height:320px;z-index:999999;background:var(--bg);overflow:hidden;isolation:isolate}.preview-capture>.demo{width:100%;height:100%}.preview-capture *{transition:none!important;animation:none!important}`}</style>
    {prepared&&<Demo id={id}/>}
  </div>;
}
