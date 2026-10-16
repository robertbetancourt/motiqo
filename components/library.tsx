'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { ArrowRight, Bookmark, Check, Command, Pause, Play, Search, SlidersHorizontal } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { aiTools, categories, elements, type AITool, type Category, type LibraryElement, type OriginalSources } from '@/lib/catalog';
import CardPreview from './card-preview';
import ElementWorkspace from './element-workspace';
import SiteFrame from './site-frame';
import OutlineField from './outline-field';
import {decodeSettings} from '@/lib/element-controls';

export default function Library({ originalSource, initialElement, initialConfiguration, initialSaved = false }: { originalSource: OriginalSources; initialElement?: string; initialConfiguration?:string; initialSaved?: boolean }) {
  const [category,setCategory] = useState<Category>('All elements');
  const [query,setQuery] = useState('');
  const [saved,setSaved] = useState<string[]>([]);
  const [savedOnly,setSavedOnly] = useState(initialSaved);
  const [selected,setSelected] = useState<LibraryElement | null>(() => elements.find(element => element.id === initialElement) || null);
  const [storageReady,setStorageReady] = useState(false);
  const [initialTab,setInitialTab] = useState<'preview' | 'code' | 'prompt'>('preview');
  const [tool,setTool] = useState<AITool>('Universal');
  const [toast,setToast] = useState('');
  const [paused,setPaused] = useState(false);
  const search = useRef<HTMLInputElement>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const collectionScroll = useRef(0);
  const restoreCollection = useRef(false);
  const lastElement = useRef(initialElement);
  const reduced = useReducedMotion();
  const still = paused || !!reduced;
  const timing = {duration:still ? 0 : .32,ease:[.22,1,.36,1] as [number,number,number,number]};

  // Next retains client state for same-page links; reconcile the server URL
  // when the brand or another route brings the visitor back here.
  useEffect(() => {
    setSelected(elements.find(element=>element.id===initialElement)||null);
    setSavedOnly(initialSaved);setInitialTab('preview');
  },[initialElement,initialSaved]);

  useEffect(() => {
    try {
      const stored:unknown = JSON.parse(localStorage.getItem('motiqo-saved') || localStorage.getItem('prism4-saved') || '[]');
      if(Array.isArray(stored)) setSaved([...new Set(stored.map(id=>id==='watt'?'holdings':id).filter((id):id is string => typeof id==='string' && elements.some(element=>element.id===id)))]);
      const preferred=localStorage.getItem('motiqo-prompt-tool');
      if(aiTools.includes(preferred as AITool)) setTool(preferred as AITool);
    } catch {}
    setStorageReady(true);
    const sync = () => {
      const params=new URL(window.location.href).searchParams;
      const rawId=params.get('element'),id=rawId==='watt'?'holdings':rawId;
      setSavedOnly(params.get('saved')==='1');
      if(!id) restoreCollection.current=true;
      setSelected(elements.find(e=>e.id===id) || null); setInitialTab('preview');
    };
    window.addEventListener('popstate',sync);
    const shortcut=(e:KeyboardEvent)=>{
      if((e.metaKey || e.ctrlKey) && e.key==='k'){e.preventDefault();search.current?.focus();}
    };
    window.addEventListener('keydown',shortcut);
    return ()=>{window.removeEventListener('popstate',sync);window.removeEventListener('keydown',shortcut);if(toastTimer.current)clearTimeout(toastTimer.current);};
  },[]);

  function notify(message:string){
    setToast(message);if(toastTimer.current)clearTimeout(toastTimer.current);
    toastTimer.current=setTimeout(()=>setToast(''),3200);
  }
  async function copy(text:string){
    try{await navigator.clipboard.writeText(text);notify('Copied. Make something good.');return true;}
    catch{notify('Clipboard unavailable. Open the element to select the text manually.');return false;}
  }
  function chooseTool(value:AITool){
    setTool(value);
    try{localStorage.setItem('motiqo-prompt-tool',value);}catch{}
  }
  function toggleSave(id:string){
    const next=saved.includes(id)?saved.filter(s=>s!==id):[...saved,id];setSaved(next);
    try{localStorage.setItem('motiqo-saved',JSON.stringify(next));}catch{}
  }
  function open(element:LibraryElement,tab:'preview'|'code'|'prompt'='preview'){
    if(!selected) collectionScroll.current=window.scrollY;
    lastElement.current=element.id;
    setSelected(element);setInitialTab(tab);
    const url=new URL(window.location.href);url.hash='';url.searchParams.delete('config');url.searchParams.set('element',element.id);window.history.pushState({motiqoElement:true},'',url);
    window.scrollTo({top:0,behavior:'instant'});
  }
  function close(){
    restoreCollection.current=true;
    if(window.history.state?.motiqoElement){window.history.back();return;}
    setSelected(null);const url=new URL(window.location.href);url.searchParams.delete('element');url.searchParams.delete('config');window.history.replaceState({},'',url);
  }
  function navigate(offset:number){
    const next=elements[(elements.findIndex(element=>element.id===selected?.id)+offset+elements.length)%elements.length];
    lastElement.current=next.id;setSelected(next);setInitialTab('preview');
    const url=new URL(window.location.href);url.searchParams.delete('config');url.searchParams.set('element',next.id);window.history.replaceState(window.history.state,'',url);
  }
  function collection(onlySaved=false){
    if(selected)restoreCollection.current=true;
    setSelected(null);setSavedOnly(onlySaved);setCategory('All elements');setQuery('');
    const url=new URL(window.location.href);url.searchParams.delete('element');url.searchParams.delete('config');if(onlySaved)url.searchParams.set('saved','1');else url.searchParams.delete('saved');window.history.replaceState({},'',url);
  }
  function showSaved(){collection(true);}
  const filtered=elements.filter(e=>(category==='All elements'||e.category===category)&&(!savedOnly||saved.includes(e.id))&&`${e.title} ${e.tags.join(' ')} ${e.category}`.toLowerCase().includes(query.toLowerCase()));

  return <>
    <a href={selected?'#detail-title':'#collection'} className="skip-link">{selected?'Skip to component':'Skip to collection'}</a>
    <SiteFrame collection workspace={!!selected} paused={still} savedOnly={savedOnly} savedCount={saved.length} onCollection={()=>collection()} onSaved={showSaved}>
      <AnimatePresence mode="wait" initial={false}>
      {selected ? <motion.div key="workspace" initial={still?false:{opacity:0,y:10}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-6}} transition={{...timing,duration:still?0:.38}}>
        <ElementWorkspace key={`${selected.id}-${initialTab}`} element={selected} initialSettings={decodeSettings(selected.id,initialConfiguration??null)??undefined} onBack={close} onPrevious={()=>navigate(-1)} onNext={()=>navigate(1)} index={elements.findIndex(element=>element.id===selected.id)} total={elements.length} saved={saved.includes(selected.id)} onSave={()=>toggleSave(selected.id)} paused={paused} copy={copy} initialTab={initialTab} initialTool={tool} onToolChange={chooseTool} originalSource={originalSource}/>
      </motion.div> : <motion.div key="collection" className="collection-view" initial={false} exit={{opacity:0,y:-8}} transition={timing} ref={node=>{
        if(node&&restoreCollection.current){restoreCollection.current=false;window.scrollTo({top:collectionScroll.current,behavior:'instant'});node.querySelector<HTMLButtonElement>(`[data-element="${lastElement.current}"] .card-title`)?.focus({preventScroll:true});}
      }}>
        <header className="library-heading"><h1>{savedOnly?'Saved':'Library'}</h1><span>{filtered.length} elements</span></header>
        <section id="collection" className="collection" aria-label={savedOnly?'Saved element collection':'Element collection'}>
          <div className="filter-row"><div className="filters" aria-label="Filter by category">{categories.map(c=><button key={c} aria-pressed={category===c} className={category===c?'selected':''} onClick={()=>setCategory(c)}>{c}</button>)}</div><div className="search-tools"><button className="motion-control" aria-pressed={paused} disabled={!!reduced} onClick={()=>setPaused(!paused)}>{still?<Play size={13}/>:<Pause size={13}/>} {reduced?'Reduced motion':paused?'Resume motion':'Pause motion'}</button><OutlineField className="search-frame" paused={still}><label className="search"><Search size={15}/><span className="sr-only">Search elements</span><input ref={search} value={query} onChange={e=>setQuery(e.target.value)} placeholder="Find something"/><kbd><Command size={10}/> K</kbd></label></OutlineField></div></div>
          <motion.div className="element-grid" layout transition={timing}><AnimatePresence key={savedOnly?'saved':'library'}>
            {(!savedOnly||storageReady)&&filtered.map((element,index)=><motion.article key={element.id} layout data-element={element.id} className={`element-card card-${element.id}`} style={{'--entry-delay':`${Math.min(index,7)*45+120}ms`} as CSSProperties} initial={false} animate={{opacity:1}} exit={{opacity:0,scale:.97}} transition={{...timing,layout:timing}} onClick={e=>{const target=e.target as HTMLElement;if(!target.closest('button,a,input,select,textarea')&&!window.getSelection()?.toString())open(element);}}>
              <div className="card-stage"><CardPreview id={element.id} paused={still} priority={index<4}/><span className="stage-hint">{element.hint}</span><button className={`save-button preview-save ${saved.includes(element.id)?'is-saved':''}`} aria-label={`${saved.includes(element.id)?'Unsave':'Save'} ${element.title}`} aria-pressed={saved.includes(element.id)} onClick={()=>toggleSave(element.id)}><Bookmark size={16} fill={saved.includes(element.id)?'currentColor':'none'}/></button></div>
              <div className="card-info"><div className="card-title-row"><button className="card-title" onClick={()=>open(element)}><h2>{element.title}</h2></button><span className="category-label">{element.category}</span></div><div className="tags">{element.tags.map(t=><span key={t}>{t}</span>)}</div></div>
            </motion.article>)}
          </AnimatePresence></motion.div>
          {savedOnly&&!storageReady&&<div className="collection-restoring" aria-label="Loading saved elements" aria-busy="true"/>}
          {(!savedOnly||storageReady)&&filtered.length===0&&<motion.div className="empty-results" initial={{opacity:0}} animate={{opacity:1}} transition={timing}><SlidersHorizontal size={24}/><h2>{savedOnly&&saved.length===0?'Keep the good ones close.':'Nothing here. Yet.'}</h2><p>{savedOnly&&saved.length===0?'Bookmark an element and it will be waiting here.':'Try another search or explore the whole collection.'}</p><button className="secondary-button" onClick={()=>collection()}>Explore all elements <ArrowRight size={15}/></button></motion.div>}
        </section>
      </motion.div>}
      </AnimatePresence>
    </SiteFrame>
    <div className={`toast ${toast?'visible':''}`} role="status" aria-live="polite"><Check size={16}/>{toast}</div>
  </>;
}
