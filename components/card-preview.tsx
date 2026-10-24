'use client';
import {Component,memo,startTransition,useEffect,useRef,useState,type ReactNode} from 'react';
import type {ElementId} from '@/lib/catalog';
import type {Settings} from '@/lib/element-controls';
import {preloadPreview} from '@/lib/preview-loaders';
import {observePreviewReady} from '@/lib/preview-ready';
import {startPreviewDemo} from '@/lib/preview-demo';
import {schedulePreview,retainPreview,releasePreview} from '@/lib/preview-scheduler';
import {registerPreviewCandidate} from '@/lib/preview-budget';
import * as posters from '@/registry/previews.json';
import * as revisions from '../registry/preview-sources.json';
import {Demo} from './demos';

class PreviewBoundary extends Component<{children:ReactNode;onFailure:()=>void},{failed:boolean}>{
  state={failed:false};
  static getDerivedStateFromError(){return{failed:true};}
  componentDidCatch(){this.props.onFailure();}
  render(){return this.state.failed?null:this.props.children;}
}

/** Posters render with the page. Only visible, loaded scenes may enter the GPU. */
export default memo(function CardPreview({id,paused,priority=false,settings}:{id:ElementId;paused:boolean;priority?:boolean;settings?:Settings}){
  // Construct the larger matrix only while the visitor is exploring its card.
  const hoverOnly=['elevation-matrix','halftone-wordmark','signal-grid'].includes(id);
  const host=useRef<HTMLDivElement>(null),[mounted,setMounted]=useState(false),[visible,setVisible]=useState(false),[ready,setReady]=useState(false),[granted,setGranted]=useState(false);
  const [cardHovered,setCardHovered]=useState(false);
  const painted=useRef(false),stopped=useRef(paused),wake=useRef<()=>void>(()=>{});stopped.current=paused;
  const captured=(posters.items as Partial<Record<ElementId,{dark:string;light:string;sourceHash?:string}>>)[id];
  const artwork=captured?.sourceHash===revisions[id]?captured:undefined;
  useEffect(()=>{
    const root=host.current!;
    const measure=()=>{if(root.clientWidth&&root.clientHeight)root.style.setProperty('--preview-fit',String(Math.min(root.clientWidth/400,root.clientHeight/300)));};
    measure();if(typeof ResizeObserver==='undefined'){window.addEventListener('resize',measure);return()=>window.removeEventListener('resize',measure);}
    const observer=new ResizeObserver(measure);observer.observe(root);return()=>observer.disconnect();
  },[]);
  useEffect(()=>{
    const root=host.current!,key=Symbol(id);
    let gone=false,active=false,near=false,live=false,loaded=false,loading=false,allowed=false,hovered=false,cancelLoad:(()=>void)|undefined,cancelMount:(()=>void)|undefined;
    const distance=()=>{const r=root.getBoundingClientRect();return r.bottom>0&&r.top<window.innerHeight?Math.max(0,r.top):100000+Math.abs(r.top);};
    const item=root.closest('article')??root;
    function sleep(){
      cancelMount?.();cancelMount=undefined;
      if(live&&!painted.current){live=false;setMounted(false);setReady(false);}
      else if(live)retainPreview(key,()=>{live=false;painted.current=false;if(!gone){setMounted(false);setReady(false);}});
    }
    const candidate=registerPreviewCandidate(distance,value=>{
      allowed=value;if(gone)return;setGranted(value);
      if(value){releasePreview(key);load();}else{cancelLoad?.();cancelLoad=undefined;sleep();}
    });
    function updateBudget(){const engaged=hovered||item.contains(document.activeElement);candidate.update(active&&!stopped.current&&!document.hidden&&(!hoverOnly||engaged),engaged);}
    const enter=()=>{hovered=true;setCardHovered(true);updateBudget();},leave=()=>{hovered=false;setCardHovered(false);updateBudget();};
    function mount(){
      if(gone||live||cancelMount||!active||!allowed||stopped.current)return;
      cancelMount=schedulePreview(()=>{
        cancelMount=undefined;
        if(gone||!active||!allowed||stopped.current)return;
        live=true;startTransition(()=>setMounted(true));
      },()=>distance()-1000);
    }
    function load(){
      if(gone||stopped.current||live||active&&!allowed||hoverOnly&&!allowed)return;
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
      updateBudget();
    }
    wake.current=()=>{updateBudget();if(stopped.current){cancelLoad?.();cancelLoad=undefined;cancelMount?.();cancelMount=undefined;}else if(active||near)load();};
    item.addEventListener('pointerenter',enter);item.addEventListener('pointerleave',leave);item.addEventListener('focusin',updateBudget);item.addEventListener('focusout',updateBudget);document.addEventListener('visibilitychange',updateBudget);
    function cleanup(){gone=true;wake.current=()=>{};candidate.dispose();cancelLoad?.();cancelMount?.();releasePreview(key);item.removeEventListener('pointerenter',enter);item.removeEventListener('pointerleave',leave);item.removeEventListener('focusin',updateBudget);item.removeEventListener('focusout',updateBudget);document.removeEventListener('visibilitychange',updateBudget);}
    if(typeof IntersectionObserver==='undefined'){show(true);return cleanup;}
    const actual=new IntersectionObserver(([entry])=>show(entry.isIntersecting),{rootMargin:'0px'});
    const anticipate=new IntersectionObserver(([entry])=>{
      near=entry.isIntersecting;
      if(near)load();else{cancelLoad?.();cancelLoad=undefined;}
    },{rootMargin:'200px'});
    actual.observe(root);anticipate.observe(root);
    return()=>{actual.disconnect();anticipate.disconnect();cleanup();};
  },[id,hoverOnly]);
  useEffect(()=>wake.current(),[paused]);
  useEffect(()=>{
    if(mounted)return observePreviewReady(host.current!,()=>{painted.current=true;setReady(true);},()=>{painted.current=false;setReady(false);setMounted(false);});
  },[mounted]);
  useEffect(()=>{
    if(mounted&&ready&&visible&&granted&&!paused&&(!hoverOnly||cardHovered))return startPreviewDemo(host.current!,id);
  },[id,mounted,ready,visible,granted,paused,hoverOnly,cardHovered]);
  return <div ref={host} className="card-preview" inert aria-hidden="true" data-preview-id={id} data-preview-mode={hoverOnly?'hover-3d':undefined} data-live={mounted&&ready&&visible&&granted&&!paused||undefined} data-preview-state={mounted?(visible&&granted?'live':'cached'):'poster'}>
    {artwork&&<><img className="card-poster card-poster-dark" src={artwork.dark} alt="" width={posters.width} height={posters.height} loading={priority?'eager':'lazy'} fetchPriority={priority?'high':'auto'} decoding="async"/>
    <img className="card-poster card-poster-light" src={artwork.light} alt="" width={posters.width} height={posters.height} loading={priority?'eager':'lazy'} fetchPriority={priority?'high':'auto'} decoding="async"/></>}
    {mounted&&<div className="card-live" style={{width:400,height:300,left:'50%',top:'50%',right:'auto',bottom:'auto',transform:'translate(-50%,-50%) scale(var(--preview-fit,1))',transformOrigin:'center'}}><PreviewBoundary onFailure={()=>{painted.current=false;setReady(false);setMounted(false);}}><Demo id={id} paused={paused||!visible||!granted} autoDemo hovered={cardHovered} settings={settings}/></PreviewBoundary></div>}
  </div>;
});
