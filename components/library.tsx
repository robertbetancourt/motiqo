'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Bookmark, Check, Command, Pause, Play, Search, SlidersHorizontal } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { aiTools, categories, elements, type AITool, type Category, type LibraryElement, type OriginalSources } from '@/lib/catalog';
import { Demo } from './demos';
import DetailDialog from './detail-dialog';
import SiteFrame from './site-frame';
import SponsorCards from './sponsor-cards';
import GitHubControl from './github-control';
import OutlineField from './outline-field';
import PromptControl from './prompt-control';
import FoldText from './effects/fold-text';

export default function Library({ originalSource }: { originalSource: OriginalSources }) {
  const [category,setCategory] = useState<Category>('All elements');
  const [query,setQuery] = useState('');
  const [saved,setSaved] = useState<string[]>([]);
  const [savedOnly,setSavedOnly] = useState(false);
  const [selected,setSelected] = useState<LibraryElement | null>(null);
  const [initialTab,setInitialTab] = useState<'preview' | 'code' | 'prompt'>('preview');
  const [tool,setTool] = useState<AITool>('Universal');
  const [toast,setToast] = useState('');
  const [paused,setPaused] = useState(false);
  const search = useRef<HTMLInputElement>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reduced = useReducedMotion();
  const still = paused || !!reduced;
  const timing = {duration:still ? 0 : .32,ease:[.22,1,.36,1] as [number,number,number,number]};

  useEffect(() => {
    try {
      const stored:unknown = JSON.parse(localStorage.getItem('motiqo-saved') || localStorage.getItem('prism4-saved') || '[]');
      if(Array.isArray(stored)) setSaved(stored.filter((id):id is string => typeof id==='string' && elements.some(element=>element.id===id)));
      const preferred=localStorage.getItem('motiqo-prompt-tool');
      if(aiTools.includes(preferred as AITool)) setTool(preferred as AITool);
    } catch {}
    const sync = () => {
      const params=new URL(window.location.href).searchParams;
      const id=params.get('element');
      setSavedOnly(params.get('saved')==='1');
      setSelected(elements.find(e=>e.id===id) || null); setInitialTab('preview');
    };
    sync(); window.addEventListener('popstate',sync);
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
    setSelected(element);setInitialTab(tab);
    const url=new URL(window.location.href);url.searchParams.set('element',element.id);window.history.pushState({},'',url);
  }
  function close(){setSelected(null);const url=new URL(window.location.href);url.searchParams.delete('element');window.history.replaceState({},'',url);}
  function collection(){setSavedOnly(false);setCategory('All elements');setQuery('');}
  function showSaved(){setSavedOnly(true);setCategory('All elements');setQuery('');}
  const filtered=elements.filter(e=>(category==='All elements'||e.category===category)&&(!savedOnly||saved.includes(e.id))&&`${e.title} ${e.tags.join(' ')} ${e.category}`.toLowerCase().includes(query.toLowerCase()));

  return <>
    <a href="#collection" className="skip-link">Skip to collection</a>
    <SiteFrame collection paused={still} savedOnly={savedOnly} savedCount={saved.length} onCollection={collection} onSaved={showSaved}>
        <section className="intro intro-centered" aria-labelledby="collection-title">
          <motion.div className="intro-copy" initial={false} animate={{opacity:1,y:0}} transition={{...timing,duration:reduced?0:.55}}><h1 id="collection-title"><FoldText text={'Small details.\nStrong impressions.'} hinge="left" splitBy="char" duration={.8} stagger={.028} ease="expo.out" perspective={725} creaseShading={.5} paused={still}/></h1><p>Interactive elements with a little more character.<br/>Explore, experiment, and make them your own.</p><div className="hero-actions"><a className="primary-button" href="#collection">Explore the collection <ArrowRight size={15}/></a><GitHubControl/></div></motion.div>
        </section>
        <section id="collection" className="collection" aria-label={savedOnly?'Saved element collection':'Element collection'}>
          <div className="filter-row"><div className="filters" aria-label="Filter by category">{categories.map(c=><button key={c} aria-pressed={category===c} className={category===c?'selected':''} onClick={()=>setCategory(c)}>{c}</button>)}</div><div className="search-tools"><button className="motion-control" aria-pressed={paused} disabled={!!reduced} onClick={()=>setPaused(!paused)}>{still?<Play size={13}/>:<Pause size={13}/>} {reduced?'Reduced motion':paused?'Resume motion':'Pause motion'}</button><OutlineField className="search-frame" paused={still}><label className="search"><Search size={15}/><span className="sr-only">Search elements</span><input ref={search} value={query} onChange={e=>setQuery(e.target.value)} placeholder="Find something"/><kbd><Command size={10}/> K</kbd></label></OutlineField></div></div>
          <motion.div className="element-grid" layout transition={timing}><AnimatePresence>
            {filtered.map((element,index)=><motion.article key={element.id} layout className={`element-card card-${element.id}`} initial={still?false:{opacity:0,y:18}} animate={{opacity:1,y:0}} exit={{opacity:0,scale:.97}} transition={{...timing,delay:still?0:index*.035,layout:timing}} whileHover={still?undefined:{y:-4}} onClick={e=>{const target=e.target as HTMLElement;if(!target.closest('button,a,input,select,textarea,.prompt-control')&&!window.getSelection()?.toString())open(element);}}>
              <div className="card-stage"><Demo id={element.id} paused={still}/><span className="stage-hint">{element.hint}</span><button className={`save-button preview-save ${saved.includes(element.id)?'is-saved':''}`} aria-label={`${saved.includes(element.id)?'Unsave':'Save'} ${element.title}`} aria-pressed={saved.includes(element.id)} onClick={()=>toggleSave(element.id)}><Bookmark size={16} fill={saved.includes(element.id)?'currentColor':'none'}/></button></div>
              <div className="card-info"><div className="card-title-row"><button className="card-title" onClick={()=>open(element)}><h2>{element.title}</h2></button><span className="category-label">{element.category}</span></div><p>{element.description}</p><div className="tags">{element.tags.map(t=><span key={t}>{t}</span>)}</div></div>
              <footer className="card-actions"><button className="code-button" onClick={()=>open(element,'code')}><span className="code-symbol">&lt;/&gt;</span> Code</button><PromptControl element={element} tool={tool} onToolChange={chooseTool} copy={copy} onReview={()=>open(element,'prompt')} paused={still}/></footer>
            </motion.article>)}
          </AnimatePresence></motion.div>
          {filtered.length===0&&<motion.div className="empty-results" initial={{opacity:0}} animate={{opacity:1}} transition={timing}><SlidersHorizontal size={24}/><h2>{savedOnly&&saved.length===0?'Keep the good ones close.':'Nothing here. Yet.'}</h2><p>{savedOnly&&saved.length===0?'Bookmark an element and it will be waiting here.':'Try another search or explore the whole collection.'}</p><button className="secondary-button" onClick={collection}>Explore all elements <ArrowRight size={15}/></button></motion.div>}
        </section>
        <SponsorCards paused={still}/>
    </SiteFrame>
    <div className={`toast ${toast?'visible':''}`} role="status" aria-live="polite"><Check size={16}/>{toast}</div>
    {selected&&<DetailDialog key={`${selected.id}-${initialTab}`} element={selected} onClose={close} paused={still} copy={copy} initialTab={initialTab} initialTool={tool} onToolChange={chooseTool} originalSource={originalSource}/>}
  </>;
}
