'use client';

import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { ArrowRight, Check, ChevronDown, Copy } from 'lucide-react';
import { aiTools, makePrompt, type AITool, type LibraryElement } from '@/lib/catalog';
import OutlineField from './outline-field';

const descriptions: Record<AITool, string> = {
  Universal: 'Copy as is', Claude: 'Plan & implement', ChatGPT: 'Discuss & implement',
  Codex: 'Implement & verify', Cursor: 'Use your repo context',
};

export default function PromptControl({ element, tool, onToolChange, copy, onReview, paused = false, liquid = false }: {
  element: LibraryElement; tool: AITool; onToolChange: (tool: AITool) => void;
  copy: (text: string) => Promise<boolean>; onReview: () => void; paused?: boolean; liquid?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const selector = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const focusFrame = useRef(0);
  const mounted = useRef(true);
  const id = useId();
  const target = useRef({ x: .5, y: .5, strength: 0 });
  const position = useRef({ x: .5, y: .5, strength: 0 });
  const wake = useRef<(() => void) | null>(null);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; if (timer.current) clearTimeout(timer.current); cancelAnimationFrame(focusFrame.current); };
  }, []);
  useEffect(() => { setCopied(false); }, [tool]);
  useLayoutEffect(() => {
    if (!open) return;
    const panel = menu.current!;
    panel.showPopover();
    const place = () => {
      const anchor = root.current!.querySelector('.prompt-split')!.getBoundingClientRect();
      const width = panel.offsetWidth, height = panel.offsetHeight;
      const above = anchor.top - height - 10;
      const desired = above >= 12 ? above : anchor.bottom + 10;
      panel.style.left = `${Math.max(12, Math.min(window.innerWidth - width - 12, anchor.right - width))}px`;
      panel.style.top = `${Math.max(12, Math.min(window.innerHeight - height - 12, desired))}px`;
    };
    place();
    panel.querySelector<HTMLButtonElement>('[aria-checked="true"]')?.focus({ preventScroll: true });
    const outside = (e: PointerEvent) => { if (!root.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('pointerdown', outside);
    window.addEventListener('resize', place);
    document.addEventListener('scroll', place, true);
    return () => { document.removeEventListener('pointerdown', outside); window.removeEventListener('resize', place); document.removeEventListener('scroll', place, true); };
  }, [open]);

  useEffect(() => {
    if (!liquid || paused) {
      root.current?.style.setProperty('--liquid-strength', '0');
      return;
    }
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    let frame = 0, last = 0;
    function tick(now: number) {
      frame = 0;
      const alpha = 1 - Math.exp(-Math.min(.05, (now - last) / 1000) * 11); last = now;
      const current = position.current, wanted = target.current;
      current.x += (wanted.x - current.x) * alpha;
      current.y += (wanted.y - current.y) * alpha;
      current.strength += (wanted.strength - current.strength) * alpha;
      const style = root.current?.style;
      style?.setProperty('--liquid-x', `${current.x * 100}%`);
      style?.setProperty('--liquid-y', `${current.y * 100}%`);
      style?.setProperty('--liquid-strength', String(current.strength));
      if (Math.abs(current.x - wanted.x) + Math.abs(current.y - wanted.y) + Math.abs(current.strength - wanted.strength) > .002) frame = requestAnimationFrame(tick);
    }
    function start() { if (!frame && !reduced.matches) { last = performance.now(); frame = requestAnimationFrame(tick); } }
    function motionChanged() {
      if (reduced.matches) { cancelAnimationFrame(frame); frame = 0; root.current?.style.setProperty('--liquid-strength', '0'); }
      else start();
    }
    wake.current = start;
    reduced.addEventListener('change', motionChanged);
    return () => { cancelAnimationFrame(frame); wake.current = null; reduced.removeEventListener('change', motionChanged); };
  }, [liquid, paused]);

  function choose(value: AITool) {
    onToolChange(value); setOpen(false);
    focusFrame.current = requestAnimationFrame(() => selector.current?.focus());
  }
  return <div ref={root} className={`prompt-control ${liquid ? 'prompt-liquid' : ''}`} data-paused={paused || undefined}
    onBlurCapture={e => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOpen(false); }}
    onPointerMove={e => {
      if (!liquid || paused || e.pointerType === 'touch' || (e.target as HTMLElement).closest('.prompt-menu')) return;
      const rect = root.current!.querySelector('.prompt-split')!.getBoundingClientRect();
      target.current = { x: Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)), y: Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height)), strength: 1 };
      wake.current?.();
    }} onPointerLeave={() => { target.current.strength = 0; wake.current?.(); }}>
    <OutlineField className="prompt-frame" paused={paused}>
      <div className="prompt-split">
        <button className="prompt-button" aria-label={`Copy ${element.title} prompt for ${tool}`} onClick={async () => {
          const success = await copy(makePrompt(element, tool));
          if (!mounted.current) return;
          setOpen(false); setCopied(success);
          if (timer.current) clearTimeout(timer.current);
          if (success) timer.current = setTimeout(() => setCopied(false), 2000);
        }}>{copied ? <Check size={15}/> : <Copy size={15}/>}<span aria-live="polite">{copied ? 'Copied' : tool === 'Universal' ? 'Copy prompt' : `Copy ${tool}`}</span></button>
        <button ref={selector} className="prompt-select" aria-label={`Choose AI for ${element.title}`} aria-haspopup="menu" aria-expanded={open} aria-controls={open ? id : undefined} onClick={() => setOpen(!open)}><ChevronDown size={14}/></button>
      </div>
    </OutlineField>
    {open && <div ref={menu} id={id} className="prompt-menu" popover="manual" role="menu" aria-label={`Prompt target for ${element.title}`} onKeyDown={e => {
      const options = Array.from(e.currentTarget.querySelectorAll<HTMLButtonElement>('[role="menuitemradio"], [role="menuitem"]'));
      const index = options.indexOf(document.activeElement as HTMLButtonElement);
      if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(e.key)) {
        e.preventDefault();
        options[e.key === 'Home' ? 0 : e.key === 'End' ? options.length - 1 : (index + (e.key === 'ArrowDown' ? 1 : options.length - 1)) % options.length]?.focus();
      }
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); setOpen(false); selector.current?.focus(); }
    }}>
      {aiTools.map(value => <button role="menuitemradio" aria-checked={tool === value} key={value} onClick={() => choose(value)}>
        <span className="tool-symbol" aria-hidden="true">{value === 'Claude' ? '✳' : value === 'ChatGPT' ? '◎' : value === 'Codex' ? '›_' : '↗'}</span>
        <span>{value}<small>{descriptions[value]}</small></span>
        <span className="tool-check" aria-hidden="true">{tool === value && <Check size={15}/>}</span>
      </button>)}
      <div className="prompt-review"><button role="menuitem" className="review-prompt" onClick={() => { setOpen(false); onReview(); }}>Review prompt first <ArrowRight size={14}/></button></div>
    </div>}
  </div>;
}
