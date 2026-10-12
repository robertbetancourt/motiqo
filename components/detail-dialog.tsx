'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, Check, Code2, Copy, Play, Sparkles, X } from 'lucide-react';
import { Demo } from './demos';
import { aiTools, makePrompt, type AITool, type LibraryElement, type OriginalSources } from '@/lib/catalog';
import OutlineField from './outline-field';

export default function DetailDialog({ element, onClose, paused, copy, originalSource, initialTab = 'preview', initialTool = 'Universal' }: {
  element: LibraryElement; onClose: () => void; paused: boolean;
  copy: (text: string) => Promise<boolean>; originalSource: OriginalSources; initialTab?: 'preview' | 'code' | 'prompt'; initialTool?: AITool;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [tab, setTab] = useState(initialTab);
  const [tool, setTool] = useState<AITool>(initialTool);
  const [copied, setCopied] = useState(false);
  const [closing, setClosing] = useState(false);
  const [sourceIndex, setSourceIndex] = useState(0);
  const [silkLight, setSilkLight] = useState<'dawn' | 'dusk'>('dusk');
  const files = originalSource[element.id] || [];
  const code = element.original ? (files[sourceIndex]?.code || element.code) : element.code;
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  function requestClose() {
    if (closing) return;
    if (paused) { onClose(); return; }
    setClosing(true);
    closeTimer.current = setTimeout(onClose, 180);
  }
  useEffect(() => {
    dialog.current?.showModal();
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previous; if (closeTimer.current) clearTimeout(closeTimer.current); };
  }, []);
  useEffect(() => { setCopied(false); }, [tab, tool, sourceIndex]);
  return <dialog ref={dialog} className={`detail-dialog ${element.previewSize === 'cinema' ? 'detail-cinema' : ''} ${closing ? 'is-closing' : ''}`} onCancel={e=>{e.preventDefault();requestClose();}} onClick={e => { if (e.target === e.currentTarget) requestClose(); }} aria-labelledby="detail-title">
    <div className="detail-inner">
      <header className="detail-header"><div><h2 id="detail-title">{element.title}</h2></div><button autoFocus className="icon-button" aria-label="Close element" onClick={requestClose}><X size={20} /></button></header>
      {(!element.original || tab !== 'preview') && <p className="detail-description">{element.description}</p>}
      <div className="detail-tabs" role="tablist" aria-label="Element views" onKeyDown={e => {
        const options: ('preview' | 'code' | 'prompt')[] = ['preview', 'code', 'prompt'];
        if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
          e.preventDefault();
          const index = (options.indexOf(tab) + (e.key === 'ArrowRight' ? 1 : 2)) % 3;
          setTab(options[index]);
          (e.currentTarget.children[index] as HTMLButtonElement).focus();
        }
      }}>
        {(['preview', 'code', 'prompt'] as const).map(view => <button key={view} role="tab" id={`tab-${view}`} aria-selected={tab === view} aria-controls="detail-panel" tabIndex={tab === view ? 0 : -1} className={`cursor-target ${tab === view ? 'active' : ''}`} onClick={() => setTab(view)}>{view === 'preview' ? <Play size={14} /> : view === 'code' ? <Code2 size={14} /> : <Sparkles size={14} />}{view === 'code' ? (element.original ? 'Source code' : 'Usage code') : view.charAt(0).toUpperCase() + view.slice(1)}</button>)}
      </div>
      <div id="detail-panel" role="tabpanel" aria-labelledby={`tab-${tab}`} tabIndex={0}>
        {tab === 'preview' ? <><div className={`detail-preview ${element.original ? 'detail-original' : ''}`}><Demo id={element.id} paused={paused} expanded silkLight={silkLight} />{!element.original && <span className="preview-hint">{element.hint}</span>}</div>{element.id === 'silk-aperture' && <div className="preview-controls" role="group" aria-label="Landscape light">{(['dawn','dusk'] as const).map(value=><button key={value} className="light-option" aria-pressed={silkLight === value} onClick={()=>setSilkLight(value)}><span className={`light-swatch light-${value}`} aria-hidden="true"/>{value === 'dawn' ? 'Dawn' : 'Dusk'}</button>)}</div>}</> : <>
          <div className="code-toolbar"><span className="eyebrow">{tab === 'code' ? (element.original ? 'REACT · TSX · COMPLETE SOURCE' : 'REACT · TSX · USAGE EXAMPLE') : 'COPY A PROMPT FOR'}</span>{tab === 'prompt' && <OutlineField className="select-frame" paused={paused}><select aria-label="AI tool" value={tool} onChange={e => setTool(e.target.value as AITool)}>{aiTools.map(value=><option key={value}>{value}</option>)}</select></OutlineField>}</div>
          {tab === 'code' && files.length > 1 && <div className="source-file-picker"><label htmlFor="source-file">Source file</label><select id="source-file" value={sourceIndex} onChange={e => setSourceIndex(Number(e.target.value))}>{files.map((file, index) => <option key={file.name} value={index}>{file.name}</option>)}</select><span>{sourceIndex + 1} / {files.length}</span></div>}<pre className="code-view"><code>{tab === 'code' ? code : makePrompt(element, tool)}</code></pre>
          <button className="primary-button cursor-target full-width" onClick={async () => { setCopied(await copy(tab === 'code' ? code : makePrompt(element, tool))); }}>{copied ? <Check size={16} /> : <Copy size={16} />}{copied ? 'Copied to clipboard' : tab === 'code' ? (element.original ? (files.length > 1 ? 'Copy source file' : 'Copy complete component') : 'Copy usage example') : `Copy prompt for ${tool}`}</button>
          <p className="reference-note">{tab === 'code' ? (element.original ? element.installNote : 'Install the component before using this example.') : 'Review the prompt and adapt it to your project.'}</p>
        </>}
      </div>
      {(!element.original || tab !== 'preview') && <div className="detail-meta"><div><span className="eyebrow">DEPENDENCIES</span><div className="tags">{element.dependencies.map(d => <span key={d}>{d}</span>)}</div></div><a className="source-link cursor-target" href={element.sourceUrl} target="_blank" rel="noreferrer">View on {element.source}<ArrowUpRight size={16} /></a></div>}
    </div>
  </dialog>;
}
