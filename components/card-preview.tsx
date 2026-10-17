'use client';
import {Component,memo,startTransition,useEffect,useRef,useState,type ReactNode} from 'react';
import type {ElementId} from '@/lib/catalog';
import {preloadPreview} from '@/lib/preview-loaders';
import {observePreviewReady} from '@/lib/preview-ready';
import {schedulePreview,retainPreview,releasePreview} from '@/lib/preview-scheduler';
import * as posters from '@/registry/previews.json';
import {Demo} from './demos';

class PreviewBoundary extends Component<{children:ReactNode;onFailure:()=>void},{failed:boolean}>{
  state={failed:false};
  static getDerivedStateFromError(){return{failed:true};}
  componentDidCatch(){this.props.onFailure();}
  render(){return this.state.failed?null:this.props.children;}
}

/** Posters render with the page. Only visible, loaded scenes may enter the GPU. */
export default memo(function CardPreview({id,paused,priority=false}:{id:ElementId;paused:boolean;priority?:boolean}){
  const host=useRef<HTMLDivElement>(null),[mounted,setMounted]=useState(false),[visible,setVisible]=useState(false),[ready,setReady]=useState(false);
  const painted=useRef(false),stopped=useRef(paused),wake=useRef<()=>void>(()=>{});stopped.current=paused;
  const artwork=posters.items[id];
  useEffect(()=>{
    const root=host.current!,key=Symbol(id);
    let gone=false,active=false,near=false,live=false,loaded=false,loading=false,cancelLoad:(()=>void)|undefined,cancelMount:(()=>void)|undefined;
    const distance=()=>{const r=root.getBoundingClientRect();return r.bottom>0&&r.top<window.innerHeight?Math.max(0,r.top):100000+Math.abs(r.top);};
    function mount(){
      if(gone||live||cancelMount||!active||stopped.current)return;
      cancelMount=schedulePreview(()=>{
        cancelMount=undefined;
        if(gone||!active||stopped.current)return;
        live=true;startTransition(()=>setMounted(true));
      },()=>distance()-1000);
    }
    function load(){
      if(gone||stopped.current||live)return;
      if(loaded){if(active)mount();return;}
      if(loading||cancelLoad)return;
      cancelLoad=schedulePreview(()=>{
        cancelLoad=undefined;if(gone||!near&&!active||stopped.current)return;
        loading=true;
        preloadPreview(id).then(()=>{loading=false;loaded=true;if(!gone&&active)mount();}).catch(()=>{loading=false;});
      },distance);
    }
    function show(value:boolean){
      active=value;setVisible(value);
      if(value){releasePreview(key);load();}
      else{
        cancelMount?.();cancelMount=undefined;
        if(live&&!painted.current){live=false;setMounted(false);setReady(false);}
        else if(live)retainPreview(key,()=>{live=false;painted.current=false;if(!gone){setMounted(false);setReady(false);}});
      }
    }
    wake.current=()=>{if(stopped.current){cancelLoad?.();cancelLoad=undefined;cancelMount?.();cancelMount=undefined;}else if(active||near)load();};
    if(typeof IntersectionObserver==='undefined'){show(true);return()=>{gone=true;wake.current=()=>{};cancelLoad?.();cancelMount?.();releasePreview(key);};}
    const actual=new IntersectionObserver(([entry])=>show(entry.isIntersecting),{rootMargin:'0px'});
    const anticipate=new IntersectionObserver(([entry])=>{
      near=entry.isIntersecting;
      if(near)load();else{cancelLoad?.();cancelLoad=undefined;}
    },{rootMargin:'200px'});
    actual.observe(root);anticipate.observe(root);
    return()=>{gone=true;wake.current=()=>{};actual.disconnect();anticipate.disconnect();cancelLoad?.();cancelMount?.();releasePreview(key);};
  },[id]);
  useEffect(()=>wake.current(),[paused]);
  useEffect(()=>{
    if(mounted)return observePreviewReady(host.current!,()=>{painted.current=true;setReady(true);},()=>{painted.current=false;setReady(false);setMounted(false);});
  },[mounted]);
  return <div ref={host} className="card-preview" inert aria-hidden="true" data-preview-id={id} data-live={mounted&&ready&&visible||undefined} data-preview-state={mounted?(visible?'live':'cached'):'poster'}>
    <img className="card-poster card-poster-dark" src={artwork.dark} alt="" width={posters.width} height={posters.height} loading={priority?'eager':'lazy'} fetchPriority={priority?'high':'auto'} decoding="async"/>
    <img className="card-poster card-poster-light" src={artwork.light} alt="" width={posters.width} height={posters.height} loading={priority?'eager':'lazy'} fetchPriority={priority?'high':'auto'} decoding="async"/>
    {mounted&&<div className="card-live"><PreviewBoundary onFailure={()=>{painted.current=false;setReady(false);setMounted(false);}}><Demo id={id} paused={paused||!visible}/></PreviewBoundary></div>}
  </div>;
});
