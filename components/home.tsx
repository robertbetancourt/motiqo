'use client';

import Link from 'next/link';
import {useCallback,useEffect,useRef,useState,type ReactNode} from 'react';
import {ArrowLeft,ArrowRight,ArrowUpRight,Bookmark,Box,Check,Layers,MousePointer2,Type} from 'lucide-react';
import {AnimatePresence,useReducedMotion} from 'motion/react';
import {aiTools,elements,makePrompt,type AITool,type LibraryElement} from '@/lib/catalog';
import {encodeSettings,type Settings} from '@/lib/element-controls';
import {homeCollections,homeTopics} from '@/lib/home-collections';
import CardPreview from './card-preview';
import CardContextMenu,{type CardMenuPosition} from './card-context-menu';
import SiteFrame from './site-frame';
import styles from './home.module.css';
import RankNumber from './rank-number';

function DiscoveryRail({collection,still,children}:{collection:typeof homeCollections[number];still:boolean;children:(element:LibraryElement,priority:boolean)=>ReactNode}){
  const track=useRef<HTMLOListElement>(null),[edges,setEdges]=useState({start:true,end:false});
  function measure(){const node=track.current;if(node)setEdges({start:node.scrollLeft<2,end:node.scrollLeft+node.clientWidth>=node.scrollWidth-2});}
  useEffect(()=>{measure();const observer=new ResizeObserver(measure);observer.observe(track.current!);return()=>observer.disconnect();},[]);
  function move(direction:number){track.current?.scrollBy({left:direction*track.current.clientWidth*.85,behavior:still?'instant':'smooth'});}
  return <section className={styles.collection} aria-labelledby={`${collection.id}-title`}>
    <div className={styles.collectionHeading}><h2 id={`${collection.id}-title`}>{collection.title}</h2><div className={styles.railActions}><div className={styles.railButtons}><button aria-label={`Previous ${collection.title}`} aria-controls={collection.id} disabled={edges.start} onClick={()=>move(-1)}><ArrowLeft size={16}/></button><button aria-label={`Next ${collection.title}`} aria-controls={collection.id} disabled={edges.end} onClick={()=>move(1)}><ArrowRight size={16}/></button></div></div></div>
    <ol ref={track} id={collection.id} className={`${styles.rail} ${collection.ranked?styles.rankedRail:''}`} onScroll={measure} tabIndex={0} aria-label={collection.title}>
      {collection.items.map((element,index)=><li key={element.id} className={collection.ranked?styles.rankItem:styles.railItem}>
        {collection.ranked&&<RankNumber value={index+1} still={still} className={`${styles.rank} ${index===9?styles.tenth:''}`}/>}
        {children(element,collection.ranked&&index<3)}
      </li>)}
    </ol>
  </section>;
}

export default function Home(){
  const [hydrated,setHydrated]=useState(false),[saved,setSaved]=useState<string[]>([]),[settings,setSettings]=useState<Record<string,Settings>>({});
  const [context,setContext]=useState<CardMenuPosition|null>(null),[toast,setToast]=useState(''),[tool,setTool]=useState<AITool>('Universal');
  const trigger=useRef<HTMLElement|null>(null),toastTimer=useRef<ReturnType<typeof setTimeout>|null>(null),reduced=useReducedMotion(),still=hydrated&&!!reduced;
  const dismiss=useCallback((restore=false)=>{if(restore)trigger.current?.focus({preventScroll:true});setContext(null);},[]);
  useEffect(()=>{
    setHydrated(true);
    function restore(){try{const value:unknown=JSON.parse(localStorage.getItem('motiqo-saved')||localStorage.getItem('prism4-saved')||'[]');if(Array.isArray(value))setSaved([...new Set(value.map(id=>id==='watt'?'holdings':id).filter((id):id is string=>typeof id==='string'&&elements.some(element=>element.id===id)))]);const preferred=localStorage.getItem('motiqo-prompt-tool');if(aiTools.includes(preferred as AITool))setTool(preferred as AITool);}catch{}}
    restore();window.addEventListener('storage',restore);return()=>{window.removeEventListener('storage',restore);if(toastTimer.current)clearTimeout(toastTimer.current);};
  },[]);
  function notify(message:string){setToast(message);if(toastTimer.current)clearTimeout(toastTimer.current);toastTimer.current=setTimeout(()=>setToast(''),3000);}
  function toggleSave(id:string){const next=saved.includes(id)?saved.filter(value=>value!==id):[...saved,id];setSaved(next);try{localStorage.setItem('motiqo-saved',JSON.stringify(next));}catch{}}
  function href(element:LibraryElement,view?:string){return `/library?element=${element.id}${settings[element.id]?`&config=${encodeURIComponent(encodeSettings(element.id,settings[element.id]))}`:''}${view?`&view=${view}`:''}`;}
  async function copy(value:string){try{await navigator.clipboard.writeText(value);notify('Copied. Make something good.');}catch{notify('Clipboard unavailable. Open the component to select the text.');}}
  function card(element:LibraryElement,priority:boolean){return <article className={styles.card} data-element={element.id} onContextMenu={event=>{if(event.shiftKey)return;event.preventDefault();const link=event.currentTarget.querySelector<HTMLAnchorElement>('a')!,box=link.getBoundingClientRect();trigger.current=link;setContext({element,x:event.clientX||box.left+20,y:event.clientY||box.top+20,trigger:link});}}>
    <div className={styles.stage}><CardPreview id={element.id} paused={still} priority={priority} settings={settings[element.id]}/><Link href={href(element)} prefetch={false} className={styles.stageLink} aria-label={`Explore ${element.title}`}/><span className={styles.previewArrow}><ArrowUpRight size={17}/></span></div><Link href={href(element)} prefetch={false} className={styles.cardLink}><div className={styles.cardMeta}><h3>{element.title}</h3><span>{element.category}</span></div></Link>
    <button className={`${styles.save} ${saved.includes(element.id)?styles.saved:''}`} aria-label={`${saved.includes(element.id)?'Unsave':'Save'} ${element.title}`} aria-pressed={saved.includes(element.id)} onClick={()=>toggleSave(element.id)}><Bookmark size={14} fill={saved.includes(element.id)?'currentColor':'none'}/></button>
  </article>;}
  const topicIcons=[Box,Type,MousePointer2,Layers];
  return <SiteFrame paused={still}>
    <div className={styles.page}>
      <header className={styles.header}><div><h1>Discover<span aria-hidden="true">.</span></h1><p>Good things happen when you look a little closer.</p></div><div className={styles.headerActions}><Link href="/library" className={styles.browse}>Browse all<span>{elements.length}</span><ArrowUpRight size={15}/></Link></div></header>
      {homeCollections.map(collection=><DiscoveryRail key={collection.id} collection={collection} still={still}>{card}</DiscoveryRail>)}
      <section className={styles.topics} aria-labelledby="home-topics-title"><div className={styles.topicHeading}><h2 id="home-topics-title">Find your kind of motion</h2><span>A few ways in.</span></div><div className={styles.topicGrid}>{homeTopics.map((topic,index)=>{const Icon=topicIcons[index];return <Link key={topic.tag} href={`/library?tag=${encodeURIComponent(topic.tag)}`} className={styles.topic}><div className={styles.topicTop}><Icon size={19}/><span>{String(topic.count).padStart(2,'0')}</span></div><h3>{topic.title}</h3><p>{topic.description}</p><span className={styles.topicTag}>{topic.tag}<ArrowUpRight size={13}/></span></Link>;})}</div></section>
    </div>
    <AnimatePresence>{context&&<CardContextMenu key={context.element.id} position={context} href={href(context.element)} saved={saved.includes(context.element.id)} settings={settings[context.element.id]} onClose={dismiss} onOpen={view=>window.location.assign(href(context.element,view))} onSave={()=>toggleSave(context.element.id)} onShare={()=>{void copy(new URL(href(context.element),window.location.origin).href);}} onPrompt={()=>{void copy(makePrompt(context.element,tool,settings[context.element.id]));}} onMood={value=>{setSettings(current=>({...current,[context.element.id]:value}));notify('Mood updated.');}}/>}</AnimatePresence>
    <div className={`toast ${toast?'visible':''}`} role="status" aria-live="polite"><Check size={16}/>{toast}</div>
  </SiteFrame>;
}
