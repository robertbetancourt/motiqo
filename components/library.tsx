'use client';

import { useCallback, useEffect, useRef, useState, type CSSProperties, type MouseEvent } from 'react';
import { ArrowRight, Bookmark, Check, Command, Pause, Play, Search, SlidersHorizontal } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { aiTools, elements, makePrompt, type AITool, type LibraryElement, type OriginalSources } from '@/lib/catalog';
import { componentGroups, componentGroupFor, readComponentGroup, type ComponentGroup } from '@/lib/component-groups';
import CardPreview from './card-preview';
import ElementWorkspace from './element-workspace';
import SiteFrame from './site-frame';
import OutlineField from './outline-field';
import {decodeSettings,encodeSettings,type Settings} from '@/lib/element-controls';
import CardContextMenu,{type CardMenuPosition} from './card-context-menu';
import {filterTaggedElements,normalizeTag} from '@/lib/tag-filter';

export default function Library({ originalSource, initialElement, initialConfiguration, initialSaved = false, initialTag = '', initialGroup, initialView = 'preview' }: { originalSource: OriginalSources; initialElement?: string; initialConfiguration?:string; initialSaved?: boolean; initialTag?:string; initialGroup?:ComponentGroup; initialView?:'preview'|'code'|'prompt' }) {
  const [group,setGroup] = useState(initialGroup);
  const [query,setQuery] = useState('');
  const [tag,setTag] = useState(initialTag);
  const [saved,setSaved] = useState<string[]>([]);
  const [savedOnly,setSavedOnly] = useState(initialSaved);
  const [selected,setSelected] = useState<LibraryElement | null>(() => elements.find(element => element.id === initialElement) || null);
  const [storageReady,setStorageReady] = useState(false);
  const [initialTab,setInitialTab] = useState<'preview' | 'code' | 'prompt'>(initialView);
  const [tool,setTool] = useState<AITool>('Universal');
  const [toast,setToast] = useState('');
  const [paused,setPaused] = useState(false);
  const [contextMenu,setContextMenu]=useState<CardMenuPosition|null>(null);
  const [cardSettings,setCardSettings]=useState<Record<string,Settings>>({});
  const [workspaceSettings,setWorkspaceSettings]=useState<Settings>();
  const menuTrigger=useRef<HTMLElement|null>(null);
  const dismissMenu=useCallback((restore=false)=>{if(restore)menuTrigger.current?.focus({preventScroll:true});setContextMenu(null);},[]);
  const search = useRef<HTMLInputElement>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const collectionScroll = useRef(0);
  const restoreCollection = useRef(false);
  const lastElement = useRef(initialElement);
  const prefersReduced = useReducedMotion();
  const [hydrated,setHydrated] = useState(false);
  useEffect(()=>setHydrated(true),[]);
  const reduced = hydrated && prefersReduced;
  const still = paused || !!reduced;
  const timing = {duration:still ? 0 : .32,ease:[.22,1,.36,1] as [number,number,number,number]};

  // Next retains client state for same-page links; reconcile the server URL
  // when the brand or another route brings the visitor back here.
  useEffect(() => {
    setSelected(elements.find(element=>element.id===initialElement)||null);
    setWorkspaceSettings(undefined);setContextMenu(null);
    setSavedOnly(initialSaved);setTag(initialTag);setGroup(initialGroup);setQuery('');setInitialTab(initialView);
  },[initialElement,initialSaved,initialTag,initialGroup,initialView]);

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
      setSavedOnly(params.get('saved')==='1');setTag(params.get('tag')??'');setGroup(readComponentGroup(params.get('group')));setQuery('');
      if(!id) restoreCollection.current=true;
      setSelected(elements.find(e=>e.id===id) || null);const view=params.get('view');setInitialTab(view==='code'||view==='prompt'?view:'preview');
      const element=elements.find(e=>e.id===id);setWorkspaceSettings(element?decodeSettings(element.id,params.get('config'))??undefined:undefined);setContextMenu(null);
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
    // Outgoing cards can still receive the second click during their exit animation.
    if(new URL(window.location.href).searchParams.has('element'))return;
    if(!selected) collectionScroll.current=window.scrollY;
    lastElement.current=element.id;
    setSelected(element);setInitialTab(tab);setWorkspaceSettings(cardSettings[element.id]);setContextMenu(null);
    const url=new URL(window.location.href);url.hash='';url.searchParams.delete('config');url.searchParams.delete('view');if(tab!=='preview')url.searchParams.set('view',tab);if(cardSettings[element.id])url.searchParams.set('config',encodeSettings(element.id,cardSettings[element.id]));url.searchParams.set('element',element.id);window.history.pushState({motiqoElement:true},'',url);
    window.scrollTo({top:0,behavior:'instant'});
  }
  function close(){
    restoreCollection.current=true;
    if(window.history.state?.motiqoElement){window.history.back();return;}
    setSelected(null);const url=new URL(window.location.href);url.searchParams.delete('element');url.searchParams.delete('config');url.searchParams.delete('view');window.history.replaceState({},'',url);
  }
  function navigate(offset:number){
    const next=elements[(elements.findIndex(element=>element.id===selected?.id)+offset+elements.length)%elements.length];
    lastElement.current=next.id;setSelected(next);setInitialTab('preview');setWorkspaceSettings(undefined);
    const url=new URL(window.location.href);url.searchParams.delete('config');url.searchParams.delete('view');url.searchParams.set('element',next.id);window.history.replaceState(window.history.state,'',url);
  }
  function collection(onlySaved=false,nextGroup?:ComponentGroup){
    restoreCollection.current=false;collectionScroll.current=0;
    setSelected(null);setSavedOnly(onlySaved);setGroup(nextGroup);setQuery('');setTag('');
    const url=new URL(window.location.href);url.hash='';url.searchParams.delete('element');url.searchParams.delete('config');url.searchParams.delete('view');url.searchParams.delete('tag');if(nextGroup)url.searchParams.set('group',nextGroup);else url.searchParams.delete('group');if(onlySaved)url.searchParams.set('saved','1');else url.searchParams.delete('saved');if(url.href!==window.location.href)window.history.pushState({},'',url);window.scrollTo({top:0,behavior:'instant'});
  }
  function chooseTag(value:string){
    const next=normalizeTag(value)===normalizeTag(tag)?'':value;
    setTag(next);setGroup(undefined);setQuery('');setSelected(null);restoreCollection.current=false;
    const url=new URL(window.location.href);url.searchParams.delete('group');url.searchParams.delete('element');url.searchParams.delete('config');url.searchParams.delete('view');if(next)url.searchParams.set('tag',next);else url.searchParams.delete('tag');window.history.pushState({},'',url);window.scrollTo({top:0,behavior:still?'instant':'smooth'});
  }
  function showSaved(){collection(true);}
  const filtered=filterTaggedElements(elements,{query,savedOnly,saved,tag}).filter(element=>!group||componentGroupFor(element)===group);
  const groupTitle=componentGroups.find(item=>item.id===group)?.title;
  function elementHref(element:LibraryElement){return `/library?element=${element.id}${group?`&group=${group}`:''}${savedOnly?'&saved=1':''}${tag?`&tag=${encodeURIComponent(tag)}`:''}${cardSettings[element.id]?`&config=${encodeURIComponent(encodeSettings(element.id,cardSettings[element.id]))}`:''}`;}
  function follow(event:MouseEvent<HTMLAnchorElement>,element:LibraryElement){if(event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;event.preventDefault();if(event.detail<2)open(element);}

  return <>
    <a href={selected?'#detail-title':'#collection'} className="skip-link">{selected?'Skip to component':'Skip to collection'}</a>
    <SiteFrame collection workspace={!!selected} paused={still} savedOnly={savedOnly} savedCount={saved.length} onCollection={group=>collection(false,group)} onSaved={showSaved}>
      <AnimatePresence mode="wait" initial={false}>
      {selected ? <motion.div key="workspace" initial={still?false:{opacity:0,y:10}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-6}} transition={{...timing,duration:still?0:.38}}>
        <ElementWorkspace key={`${selected.id}-${initialTab}`} element={selected} initialSettings={workspaceSettings??decodeSettings(selected.id,initialConfiguration??null)??undefined} onBack={close} onPrevious={()=>navigate(-1)} onNext={()=>navigate(1)} index={elements.findIndex(element=>element.id===selected.id)} total={elements.length} saved={saved.includes(selected.id)} onSave={()=>toggleSave(selected.id)} paused={paused} copy={copy} initialTab={initialTab} initialTool={tool} onToolChange={chooseTool} originalSource={originalSource} onTag={chooseTag}/>
      </motion.div> : <motion.div key="collection" className="collection-view" initial={false} exit={{opacity:0,y:-8}} transition={timing} ref={node=>{
        if(node&&restoreCollection.current){restoreCollection.current=false;window.scrollTo({top:collectionScroll.current,behavior:'instant'});node.querySelector<HTMLElement>(`[data-element="${lastElement.current}"] .card-title`)?.focus({preventScroll:true});}
      }}>
        <h1 className="sr-only">{savedOnly?'Saved':groupTitle??'Library'}</h1>
        <section id="collection" className="collection" aria-label={savedOnly?'Saved element collection':'Element collection'}>
          <div className="filter-row collection-toolbar"><span className="collection-label">{groupTitle}</span><div className="search-tools"><button className="motion-control" aria-pressed={paused} disabled={!!reduced} onClick={()=>setPaused(!paused)}>{still?<Play size={13}/>:<Pause size={13}/>} {reduced?'Reduced motion':paused?'Resume motion':'Pause motion'}</button><OutlineField className="search-frame" paused={still}><label className="search"><Search size={15}/><span className="sr-only">Search elements</span><input ref={search} value={query} onChange={e=>setQuery(e.target.value)} placeholder="Find something"/><kbd><Command size={10}/> K</kbd></label></OutlineField></div></div>
          {tag&&<div className="active-tag-filter" role="status"><span>Tagged</span><button type="button" aria-label={`Clear ${tag} filter`} onClick={()=>chooseTag(tag)}>{tag}<span aria-hidden="true">×</span></button><span>{filtered.length} {filtered.length===1?'element':'elements'}</span></div>}
          <div className="element-grid">
            {(!savedOnly||storageReady)&&filtered.map((element,index)=><article key={element.id} data-element={element.id} className={`element-card card-${element.id}`} style={{'--entry-delay':`${Math.min(index,7)*45+120}ms`} as CSSProperties} onContextMenu={event=>{if(event.shiftKey)return;event.preventDefault();const trigger=event.currentTarget.querySelector<HTMLElement>('.card-preview-open')!;const box=trigger.getBoundingClientRect();menuTrigger.current=trigger;setContextMenu({element,x:event.clientX||box.left+20,y:event.clientY||box.top+20,trigger});}} onClick={e=>{const target=e.target as HTMLElement;if(!target.closest('button,a,input,select,textarea')&&!window.getSelection()?.toString()&&e.detail<2)open(element);}}>
              <div className="card-stage"><CardPreview id={element.id} paused={still} priority={index<4} settings={cardSettings[element.id]}/><span className="stage-hint">{element.hint}</span><a href={elementHref(element)} className="card-preview-open" aria-label={`Preview and edit ${element.title}`} onClick={event=>follow(event,element)}/><button className={`save-button preview-save ${saved.includes(element.id)?'is-saved':''}`} aria-label={`${saved.includes(element.id)?'Unsave':'Save'} ${element.title}`} aria-pressed={saved.includes(element.id)} onClick={()=>toggleSave(element.id)}><Bookmark size={16} fill={saved.includes(element.id)?'currentColor':'none'}/></button></div>
              <div className="card-info"><div className="card-title-row"><a className="card-title" href={elementHref(element)} onClick={event=>follow(event,element)}><h2>{element.title}</h2></a><span className="category-label">{element.category}</span></div><div className="tags">{element.tags.map(t=><button type="button" key={t} className="tag-filter-button" aria-label={`Filter by ${t}`} aria-pressed={normalizeTag(tag)===normalizeTag(t)} onClick={()=>chooseTag(t)}>{t}</button>)}</div></div>
            </article>)}
          </div>
          {savedOnly&&!storageReady&&<div className="collection-restoring" aria-label="Loading saved elements" aria-busy="true"/>}
          {(!savedOnly||storageReady)&&filtered.length===0&&<motion.div className="empty-results" initial={{opacity:0}} animate={{opacity:1}} transition={timing}><SlidersHorizontal size={24}/><h2>{savedOnly&&saved.length===0?'Keep the good ones close.':'Nothing here. Yet.'}</h2><p>{savedOnly&&saved.length===0?'Bookmark an element and it will be waiting here.':'Try another search or explore the whole collection.'}</p><button className="secondary-button" onClick={()=>collection()}>Explore all elements <ArrowRight size={15}/></button></motion.div>}
        </section>
      </motion.div>}
      </AnimatePresence>
    </SiteFrame>
    <AnimatePresence>{contextMenu&&<CardContextMenu key={contextMenu.element.id} position={contextMenu} href={elementHref(contextMenu.element)} saved={saved.includes(contextMenu.element.id)} settings={cardSettings[contextMenu.element.id]} onClose={dismissMenu} onOpen={tab=>open(contextMenu.element,tab)} onSave={()=>toggleSave(contextMenu.element.id)} onShare={()=>{void copy(new URL(elementHref(contextMenu.element),window.location.origin).href);}} onPrompt={()=>{void copy(makePrompt(contextMenu.element,tool,cardSettings[contextMenu.element.id]));}} onMood={settings=>{setCardSettings(current=>({...current,[contextMenu.element.id]:settings}));notify('Mood updated.');}}/>}</AnimatePresence>
    <div className={`toast ${toast?'visible':''}`} role="status" aria-live="polite"><Check size={16}/>{toast}</div>
  </>;
}
