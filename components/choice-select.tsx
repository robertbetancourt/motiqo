'use client';

import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { aiTools, type AITool } from '@/lib/catalog';

export type ChoiceOption = { value: string; label: string; description?: string; symbol?: ReactNode };
const descriptions: Record<AITool, string> = {
  Universal: 'Copy as is', Claude: 'Plan & implement', ChatGPT: 'Discuss & implement',
  Codex: 'Implement & verify', Cursor: 'Use your repo context',
};
export const workflowOptions: ChoiceOption[] = aiTools.map(value => ({
  value, label: value, description: descriptions[value],
  symbol: value === 'Universal' ? <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c5 5 5 13 0 18-5-5-5-13 0-18Z"/></svg> : <img className={`workflow-logo ${value==='Claude'?'workflow-claude':''}`} src={`/brands/${value==='Claude'?'claude':value==='Cursor'?'cursor':'openai'}.svg`} width="16" height="16" alt=""/>,
}));

/** A single selection menu for source files and every prompt workflow. */
export default function ChoiceSelect({ options, value, onChange, label, iconOnly = false, className = '', footer, paused = false }: {
  options: ChoiceOption[]; value: string; onChange: (value: string) => void; label: string;
  iconOnly?: boolean; className?: string; footer?: ReactNode; paused?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const focusFrame = useRef(0);
  const id = useId();
  const selected = options.find(option => option.value === value);

  useEffect(() => () => cancelAnimationFrame(focusFrame.current), []);
  function dismiss(restoreFocus = false) {
    setOpen(false);
    cancelAnimationFrame(focusFrame.current);
    if (restoreFocus) focusFrame.current = requestAnimationFrame(() => { focusFrame.current = 0; trigger.current?.focus(); });
  }
  useLayoutEffect(() => {
    if (!open) return;
    const panel = menu.current!, anchor = trigger.current!;
    panel.showPopover();
    const place = () => {
      const bounds = anchor.getBoundingClientRect();
      const width = panel.offsetWidth, height = panel.offsetHeight;
      const below = bounds.bottom + 8;
      const above = bounds.top - height - 8;
      panel.style.left = `${Math.max(12, Math.min(window.innerWidth - width - 12, bounds.right - width))}px`;
      panel.style.top = `${Math.max(12, Math.min(window.innerHeight - height - 12, below + height <= window.innerHeight - 12 ? below : above))}px`;
    };
    place();
    panel.querySelector<HTMLButtonElement>('[aria-checked="true"]')?.focus({ preventScroll: true });
    const outside = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener('pointerdown', outside);
    window.addEventListener('resize', place);
    document.addEventListener('scroll', place, true);
    return () => {
      document.removeEventListener('pointerdown', outside);
      window.removeEventListener('resize', place);
      document.removeEventListener('scroll', place, true);
    };
  }, [open]);

  return <div ref={root} className={`choice-select ${className}`} data-paused={paused || undefined}
    onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false); }}>
    <button ref={trigger} className={`choice-trigger ${iconOnly ? 'prompt-select' : ''}`} aria-label={label}
      aria-haspopup="menu" aria-expanded={open} aria-controls={open ? id : undefined}
      onClick={() => setOpen(!open)} onKeyDown={event => {
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); setOpen(true); }
      }}>
      {!iconOnly && <span>{selected?.label}</span>}<ChevronDown size={14} aria-hidden="true"/>
    </button>
    {open && <div ref={menu} id={id} className="prompt-menu choice-menu" popover="manual" role="menu" aria-label={label} onKeyDown={event => {
      const buttons = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="menuitemradio"], [role="menuitem"]'));
      const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
      if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
        event.preventDefault();
        buttons[event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1 : (index + (event.key === 'ArrowDown' ? 1 : buttons.length - 1)) % buttons.length]?.focus();
      } else if (event.key === 'Escape') {
        event.preventDefault(); event.stopPropagation(); dismiss(true);
      } else if (event.key.length === 1 && /\S/.test(event.key)) {
        const match = buttons.find(button => button.dataset.label?.toLowerCase().startsWith(event.key.toLowerCase()));
        if (match) { event.preventDefault(); match.focus(); }
      }
    }}>
      {options.map(option => <button key={option.value} role="menuitemradio" aria-checked={value === option.value} data-label={option.label}
        onClick={() => { onChange(option.value); dismiss(true); }}>
        {option.symbol && <span className="tool-symbol" aria-hidden="true">{option.symbol}</span>}
        <span className="choice-label">{option.label}{option.description && <small>{option.description}</small>}</span>
        <span className="tool-check" aria-hidden="true">{value === option.value && <Check size={15}/>}</span>
      </button>)}
      {footer && <div className="prompt-review" onClick={() => dismiss()}>{footer}</div>}
    </div>}
  </div>;
}
