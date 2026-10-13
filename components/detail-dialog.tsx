'use client';

import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { Code2, Play, Sparkles, X } from 'lucide-react';
import { Demo } from './demos';
import { makePrompt, type AITool, type LibraryElement, type OriginalSources } from '@/lib/catalog';
import PromptControl from './prompt-control';
import ChoiceSelect, { workflowOptions } from './choice-select';
import LiquidAction, { LiquidCopyButton } from './liquid-action';
import SourceView from './source-view';

type View = 'preview' | 'code' | 'prompt';
const views: View[] = ['preview', 'code', 'prompt'];

export default function DetailDialog({ element, onClose, paused, copy, originalSource, onToolChange, initialTab = 'preview', initialTool = 'Universal' }: {
  element: LibraryElement; onClose: () => void; paused: boolean;
  copy: (text: string) => Promise<boolean>; originalSource: OriginalSources; initialTab?: View; initialTool?: AITool; onToolChange: (tool: AITool) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [tab, setTab] = useState(initialTab);
  const [tool, setTool] = useState<AITool>(initialTool);
  const [closing, setClosing] = useState(false);
  const [sourceIndex, setSourceIndex] = useState(0);
  const [silkLight, setSilkLight] = useState<'dawn' | 'dusk'>('dusk');
  const files = originalSource[element.id] || [];
  const code = files[sourceIndex]?.code || element.code;
  const prompt = useMemo(() => makePrompt(element, tool), [element, tool]);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  function chooseTool(value: AITool) { setTool(value); onToolChange(value); }
  function reviewPrompt() { setTab('prompt'); dialog.current?.querySelector<HTMLButtonElement>('#tab-prompt')?.focus(); }
  function requestClose() {
    if (closing) return;
    if (paused) { onClose(); return; }
    setClosing(true);
    closeTimer.current = setTimeout(onClose, 180);
  }
  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;
    dialog.current?.showModal();
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
      if (closeTimer.current) clearTimeout(closeTimer.current);
      previousFocus?.focus({ preventScroll: true });
    };
  }, []);

  return <dialog ref={dialog} className={`detail-dialog ${element.previewSize === 'cinema' ? 'detail-cinema' : ''} ${closing ? 'is-closing' : ''}`}
    data-paused={paused || undefined} onCancel={event => { event.preventDefault(); requestClose(); }}
    onClick={event => { if (event.target === event.currentTarget) requestClose(); }} aria-labelledby="detail-title">
    <div className="detail-inner">
      <header className="detail-header"><h2 id="detail-title">{element.title}</h2><button autoFocus className="icon-button" aria-label="Close element" onClick={requestClose}><X size={20}/></button></header>
      <div className="detail-tabs" role="tablist" aria-label="Element views" style={{ '--segment-index': views.indexOf(tab) } as CSSProperties} onKeyDown={event => {
        if (!['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(event.key)) return;
        event.preventDefault();
        const index = event.key === 'Home' ? 0 : event.key === 'End' ? 2 : (views.indexOf(tab) + (event.key === 'ArrowRight' ? 1 : 2)) % 3;
        setTab(views[index]);
        dialog.current?.querySelector<HTMLButtonElement>(`#tab-${views[index]}`)?.focus();
      }}>
        <span className="segment-thumb" aria-hidden="true"/>
        {views.map(view => <button key={view} role="tab" id={`tab-${view}`} aria-selected={tab === view} aria-controls="detail-panel" tabIndex={tab === view ? 0 : -1}
          className={tab === view ? 'active' : ''} onClick={() => setTab(view)}>
          {view === 'preview' ? <Play size={14}/> : view === 'code' ? <Code2 size={14}/> : <Sparkles size={14}/>}
          {view === 'code' ? 'Source code' : view === 'preview' ? 'Preview' : 'Prompt'}
        </button>)}
      </div>
      <div id="detail-panel" className="detail-workspace" role="tabpanel" aria-labelledby={`tab-${tab}`} tabIndex={0}>
        {tab === 'preview' ? <div className="detail-preview detail-original">
          <Demo id={element.id} paused={paused} expanded silkLight={silkLight}/>
          {element.id === 'silk-aperture' && <div className="preview-controls" role="group" aria-label="Landscape light">
            {(['dawn', 'dusk'] as const).map(value => <button key={value} className="light-option" aria-pressed={silkLight === value} onClick={() => setSilkLight(value)}>
              <span className={`light-swatch light-${value}`} aria-hidden="true"/>{value === 'dawn' ? 'Dawn' : 'Dusk'}
            </button>)}
          </div>}
        </div> : <div className={`document-surface ${tab === 'code' ? 'source-surface' : 'prompt-surface'}`}>
          <div className="document-toolbar">
            <span className="document-label">{tab === 'code' ? 'React / TSX' : 'Prompt'}</span>
            {tab === 'code' ? files.length > 1 ? <ChoiceSelect className="source-file-picker" label="Source file" value={String(sourceIndex)}
              onChange={value => setSourceIndex(Number(value))} options={files.map((file, index) => ({ value: String(index), label: file.name }))} paused={paused}/>
              : <span className="document-filename">{files[0]?.name || `${element.id}.tsx`}</span>
              : <ChoiceSelect label="AI tool" options={workflowOptions} value={tool} onChange={value => chooseTool(value as AITool)} paused={paused}/>}
          </div>
          {tab === 'code' ? <SourceView code={code}/> : <div className="prompt-document" aria-label="Prompt text">
            {prompt.split('\n\n').map((paragraph, index) => paragraph.startsWith('Usage example:')
              ? <pre className="prompt-example" key={index}><code>{paragraph}</code></pre>
              : <p key={index}>{paragraph}</p>)}
          </div>}
          {tab === 'code' && element.installNote && <div className="document-note">{element.installNote}</div>}
        </div>}
      </div>
      <footer className="detail-footer-row">
        <div className="detail-classification"><span className="category-label">{element.category}</span>
          <div className="tags">{(tab === 'preview' ? element.tags : element.dependencies).map(tag => <span key={tag}>{tag}</span>)}</div>
        </div>
        {tab === 'preview' ? <PromptControl element={element} tool={tool} onToolChange={chooseTool} copy={copy} onReview={reviewPrompt} paused={paused} liquid/>
          : <LiquidAction paused={paused}><LiquidCopyButton text={tab === 'code' ? code : prompt} label={tab === 'code' ? 'Copy source file' : 'Copy prompt'} copy={copy}/></LiquidAction>}
      </footer>
    </div>
  </dialog>;
}
