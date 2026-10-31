'use client';

import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { ArrowLeft, Bookmark, ChevronDown, ChevronLeft, ChevronRight, Code2, Download, Link, Monitor, Play, SlidersHorizontal, Smartphone, Sparkles, Tablet } from 'lucide-react';
import { Demo } from './demos';
import dynamic from 'next/dynamic';
import styles from './element-workspace.module.css';
import { makePrompt, type AITool, type LibraryElement, type OriginalSources, type SourceFile } from '@/lib/catalog';
import PromptControl from './prompt-control';
import ChoiceSelect, { workflowOptions } from './choice-select';
import LiquidAction, { LiquidCopyButton } from './liquid-action';
import SourceView from './source-view';
import { controlsFor, moodsFor, normalizeSettings, configurationUrl, type Settings } from '@/lib/element-controls';
import useComponentSettings from './use-component-settings';

type View = 'preview' | 'code' | 'prompt';
const CosmosSplitAuth = dynamic(() => import('./originals/cosmos-split-auth'), {ssr:false});
type Viewport = 'desktop' | 'tablet' | 'mobile';
const views: View[] = ['preview', 'code', 'prompt'];

/** An addressable collection section: no overlay, focus trap or body scroll lock. */
export default function ElementWorkspace({ element, onBack, onPrevious, onNext, index, total, saved, onSave, paused, copy, originalSource, onToolChange, initialSettings, initialTab = 'preview', initialTool = 'Universal', onTag, collectionLabel='Library' }: {
  element: LibraryElement; collectionLabel?:string; onBack: () => void; onPrevious: () => void; onNext: () => void; index: number; total: number;
  onTag?:(tag:string)=>void; saved: boolean; onSave: () => void; paused: boolean; initialSettings?:Settings;
  copy: (text: string) => Promise<boolean>; originalSource: OriginalSources; initialTab?: View; initialTool?: AITool; onToolChange: (tool: AITool) => void;
}) {
  const root = useRef<HTMLElement>(null);
  const [tab, setTab] = useState(initialTab);
  const [tool, setTool] = useState<AITool>(initialTool);
  const [sourceIndex, setSourceIndex] = useState(0);
  const [viewport, setViewport] = useState<Viewport>('desktop');
  const [mobileInspector,setMobileInspector]=useState(false);
  const {settings,update,reset}=useComponentSettings(element.id,initialSettings);
  const controls=controlsFor(element.id);
  const moods=moodsFor(element.id);
  const selectedMood=moods.find(mood=>JSON.stringify(normalizeSettings(element.id,mood.settings))===JSON.stringify(settings))?.id??(JSON.stringify(normalizeSettings(element.id,{}))===JSON.stringify(settings)?'default':'custom');
  const [files,setFiles]=useState<SourceFile[]>(()=>originalSource[element.id]||[]);
  const [sourceState,setSourceState]=useState<'idle'|'loading'|'ready'|'error'>(files.length?'ready':'idle');
  const [sourceRetry,setSourceRetry]=useState(0);
  const code = files[sourceIndex]?.code || element.code;
  const prompt = useMemo(() => makePrompt(element, tool, settings), [element, tool, settings]);
  function chooseTool(value: AITool) { setTool(value); onToolChange(value); }
  function reviewPrompt() { setTab('prompt'); root.current?.querySelector<HTMLButtonElement>('#tab-prompt')?.focus(); }
  useEffect(() => { setTool(initialTool); }, [initialTool]);
  useEffect(()=>{
    const media=matchMedia('(max-width: 780px)');
    const sync=()=>setMobileInspector(media.matches);
    sync();media.addEventListener('change',sync);
    return()=>media.removeEventListener('change',sync);
  },[]);
  useEffect(() => { root.current?.querySelector<HTMLElement>('#detail-title')?.focus({ preventScroll: true }); }, []);
  useEffect(()=>{
    if(tab!=='code'||files.length)return;
    const controller=new AbortController();setSourceState('loading');
    fetch(`/api/components/${element.id}?format=source`,{signal:controller.signal})
      .then(async response=>{if(!response.ok)throw Error('Source unavailable');return response.json();})
      .then(data=>{if(controller.signal.aborted)return;if(!Array.isArray(data.files)||!data.files.length||!data.files.every((file:SourceFile)=>typeof file.name==='string'&&typeof file.code==='string'))throw Error('Invalid source response');setFiles(data.files);setSourceState('ready');})
      .catch(()=>{if(!controller.signal.aborted)setSourceState('error');});
    return()=>controller.abort();
  },[element.id,tab,sourceRetry,files.length]);

  return <section ref={root} className="element-workbench" data-paused={paused || undefined} aria-labelledby="detail-title">
    <div className="workbench-toolbar">
      <button className="workbench-back" onClick={event=>{if(event.detail<2)onBack();}}><ArrowLeft size={16}/> {collectionLabel}</button>
    </div>
    <div className="workbench-layout">
      <div className="workbench-canvas">
        <div className={`workbench-stage ${element.id==='cosmos-split-auth'&&tab==='preview'?styles.cosmosStage:''}`} data-viewport={viewport}>
          <div id="detail-panel" className="detail-workspace" role="tabpanel" aria-labelledby={`tab-${tab}`} tabIndex={0}>
            <div className="workbench-preview" hidden={tab !== 'preview'}>
              {element.id==='cosmos-split-auth'
                ? <CosmosSplitAuth {...settings} autoCycleSlides={settings.autoCycleSlides!=='disabled'} paused={paused || tab !== 'preview'}/>
                : <Demo id={element.id} paused={paused || tab !== 'preview'} expanded settings={settings} onSettingsChange={update}/>}
            </div>
            {tab !== 'preview' && <div key={tab} className={`document-surface panel-enter ${tab === 'code' ? 'source-surface' : 'prompt-surface'}`}>
              <div className="document-toolbar">
                <span className="document-label">{tab === 'code' ? files[sourceIndex]?.name.endsWith('.svg') ? 'SVG / Artwork' : files[sourceIndex]?.name.endsWith('.css') ? 'CSS / Styles' : 'React / TSX' : 'Prompt'}</span>
                {tab === 'code' ? files.length > 1 ? <ChoiceSelect className="source-file-picker" label="Source file" value={String(sourceIndex)}
                  onChange={value => setSourceIndex(Number(value))} options={files.map((file, fileIndex) => ({ value: String(fileIndex), label: file.name }))} paused={paused}/>
                  : <span className="document-filename">{files[0]?.name || `${element.id}.tsx`}</span>
                  : <ChoiceSelect label="AI tool" options={workflowOptions} value={tool} onChange={value => chooseTool(value as AITool)} paused={paused}/>}
              </div>
              {tab === 'code' ? files.length?<SourceView code={code} filename={files[sourceIndex]?.name}/>:<div className="document-loading" role="status">{sourceState==='error'?<>Source could not be loaded. <button onClick={()=>setSourceRetry(value=>value+1)}>Try again</button></>:'Loading source…'}</div> : <div className="prompt-document" aria-label="Prompt text">
                {prompt.split('\n\n').map((paragraph, paragraphIndex) => paragraph.startsWith('Usage example:')
                  ? <pre className="prompt-example" key={paragraphIndex}><code>{paragraph}</code></pre>
                  : <p key={paragraphIndex}>{paragraph}</p>)}
              </div>}
              {tab === 'code' && element.installNote && <div className="document-note">{element.installNote}</div>}
            </div>}
          </div>
        </div>
        <div className="workbench-bottom-bar">
          <div className="workbench-pagination" aria-label="Browse components">
            <button className="icon-button" aria-label="Previous component" onClick={event=>{if(event.detail<2)onPrevious();}}><ChevronLeft size={16}/></button>
            <span>{String(index + 1).padStart(2, '0')} <span>/ {String(total).padStart(2, '0')}</span></span>
            <button className="icon-button" aria-label="Next component" onClick={event=>{if(event.detail<2)onNext();}}><ChevronRight size={16}/></button>
          </div>
          <div className="workbench-viewport" role="group" aria-label="Preview viewport">
          {(['mobile', 'tablet', 'desktop'] as const).map(size => <button key={size} aria-label={`${size} preview`} aria-pressed={viewport === size}
            onClick={() => setViewport(size)}>{size === 'desktop' ? <Monitor size={16}/> : size === 'tablet' ? <Tablet size={16}/> : <Smartphone size={16}/>}</button>)}
          </div>
          <div className="workbench-actions">
            <button className={`save-button ${saved ? 'is-saved' : ''}`} aria-label={`${saved ? 'Unsave' : 'Save'} ${element.title}`} aria-pressed={saved} onClick={onSave}><Bookmark size={16} fill={saved ? 'currentColor' : 'none'}/></button>
            {tab === 'code' ? <LiquidAction paused={paused}><LiquidCopyButton text={code} label="Copy source file" copy={copy} disabled={!files.length}/></LiquidAction>
              : <PromptControl element={element} tool={tool} onToolChange={chooseTool} copy={copy} onReview={reviewPrompt} paused={paused} liquid settings={settings}/>}
          </div>
        </div>
      </div>
      <aside className="workbench-inspector" aria-label="Component details">
        <div className="workbench-inspector-scroll">
        <header className="workbench-heading"><h1 id="detail-title" tabIndex={-1}>{element.title}</h1>
          <div className="tags">{element.tags.map(tag => onTag?<button type="button" key={tag} className="tag-filter-button" aria-label={`Filter by ${tag}`} onClick={()=>onTag(tag)}>{tag}</button>:<span key={tag}>{tag}</span>)}</div>
        </header>
        <div className="detail-tabs" role="tablist" aria-label="Element views" style={{ '--segment-index': views.indexOf(tab) } as CSSProperties} onKeyDown={event => {
          if (!['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(event.key)) return;
          event.preventDefault();
          const next = event.key === 'Home' ? 0 : event.key === 'End' ? 2 : (views.indexOf(tab) + (event.key === 'ArrowRight' ? 1 : 2)) % 3;
          setTab(views[next]); root.current?.querySelector<HTMLButtonElement>(`#tab-${views[next]}`)?.focus();
        }}>
          <span className="segment-thumb" aria-hidden="true"/>
          {views.map(view => <button key={view} role="tab" id={`tab-${view}`} aria-selected={tab === view} aria-controls="detail-panel" tabIndex={tab === view ? 0 : -1}
            className={tab === view ? 'active' : ''} onClick={() => setTab(view)}>
            {view === 'preview' ? <Play size={13}/> : view === 'code' ? <Code2 size={13}/> : <Sparkles size={13}/>}
            {view === 'code' ? 'Source' : view === 'preview' ? 'Preview' : 'Prompt'}
          </button>)}
        </div>
        <details id="component-settings" className="inspector-customization" open={!mobileInspector}>
        <summary className="inspector-settings-summary"><SlidersHorizontal size={14}/><span>Settings</span><ChevronDown size={16}/></summary>
        <div className="inspector-group inspector-controls" aria-label="Live component settings">
          {moods.length>0&&<div className="parameter-select"><span>Mood</span><ChoiceSelect label="Mood" value={selectedMood} options={[{value:'default',label:'Default'},...moods.map(mood=>({value:mood.id,label:mood.label})),...(selectedMood==='custom'?[{value:'custom',label:'Custom'}]:[])]} onChange={value=>{const mood=moods.find(item=>item.id===value);if(mood)update(mood.settings);else if(value==='default')reset();}} paused={paused}/></div>}
          {controls.filter(control=>!control.hidden).map(control=>{
            if(element.id==='iris-turbine'&&control.key==='speed'&&settings.mode!=='controlled')return null;
            if(element.id==='sacred-lotus'&&control.key==='progress'&&settings.playback!=='controlled')return null;
            const value=settings[control.key]??control.defaultValue;
            const change=(next:string|number)=>update({[control.key]:next});
            if(control.kind==='range')return <label key={control.key} className="parameter-range" style={{'--range-fill':`${(Number(value)-control.min!)/(control.max!-control.min!)*100}%`} as CSSProperties}><span>{control.label}</span><output>{control.step!==undefined&&Number.isInteger(control.step)?value:Number(value).toFixed(Math.min(6,Math.max(2,-Math.floor(Math.log10(control.step??.01)))))}</output><input aria-label={control.label} type="range" min={control.min} max={control.max} step={control.step} value={value} onChange={event=>change(Number(event.target.value))}/></label>;
            if(control.kind==='color')return <label key={control.key} className="parameter-colour"><span>{control.label}</span><div><input aria-label={control.label} type="color" value={String(value)} onChange={event=>change(event.target.value)}/><code>{String(value).toUpperCase()}</code></div></label>;
            if(control.kind==='text')return <label key={control.key} className="parameter-text"><span>{control.label}</span>{control.multiline?<textarea aria-label={control.label} rows={4} maxLength={control.maxLength??200} value={String(value)} onChange={event=>change(event.target.value)}/>:<input aria-label={control.label} type="text" maxLength={control.maxLength??200} value={String(value)} onChange={event=>change(event.target.value)}/>}</label>;
            return <div key={control.key} className="parameter-select"><span>{control.label}</span><ChoiceSelect label={control.label} value={String(value)} options={control.choices!} onChange={change} paused={paused}/></div>;
          })}
          <button className="parameter-reset" onClick={reset}>Reset settings</button>
        </div>
        </details>
        <div className="inspector-delivery">
          <button onClick={()=>copy(configurationUrl(window.location.href,element.id,settings).href)}><Link size={14}/> Share configuration</button>
          <a href={`/api/components/${element.id}?config=${encodeURIComponent(JSON.stringify({v:1,id:element.id,settings}))}`} download><Download size={14}/> Download component</a>
        </div>
        <div className="inspector-group inspector-dependencies"><span className="document-label">Dependencies</span><div className="tags">{element.dependencies.map(tag => <span key={tag}>{tag}</span>)}</div></div>
        </div>
      </aside>
    </div>
  </section>;
}
