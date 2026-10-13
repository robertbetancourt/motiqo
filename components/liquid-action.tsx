'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Check, Copy } from 'lucide-react';
import OutlineField from './outline-field';

export default function LiquidAction({ children, paused = false, liquid = true }: { children: ReactNode; paused?: boolean; liquid?: boolean }) {
  const root = useRef<HTMLDivElement>(null);
  const target = useRef({ x: .5, y: .5, strength: 0 });
  const position = useRef({ x: .5, y: .5, strength: 0 });
  const wake = useRef<(() => void) | null>(null);
  useEffect(() => {
    if (!liquid || paused) { root.current?.style.setProperty('--liquid-strength', '0'); return; }
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
  return <div ref={root} className={`prompt-control ${liquid ? 'prompt-liquid' : ''}`} data-paused={paused || undefined}
    onPointerMove={event => {
      if (!liquid || paused || event.pointerType === 'touch' || (event.target as HTMLElement).closest('.prompt-menu')) return;
      const bounds = root.current!.querySelector('.prompt-split')!.getBoundingClientRect();
      target.current = { x: Math.max(0, Math.min(1, (event.clientX - bounds.left) / bounds.width)), y: Math.max(0, Math.min(1, (event.clientY - bounds.top) / bounds.height)), strength: 1 };
      wake.current?.();
    }} onPointerLeave={() => { target.current.strength = 0; wake.current?.(); }}>
    <OutlineField className="prompt-frame" paused={paused}><div className="prompt-split">{children}</div></OutlineField>
  </div>;
}

export function LiquidCopyButton({ text, label, ariaLabel, copy }: {
  text: string; label: string; ariaLabel?: string; copy: (text: string) => Promise<boolean>;
}) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const generation = useRef(0);
  useEffect(() => {
    generation.current++;
    setCopied(false);
    return () => { generation.current++; if (timer.current) clearTimeout(timer.current); };
  }, [text]);
  return <button className="prompt-button" aria-label={ariaLabel || label} onClick={async () => {
    const current = generation.current;
    const success = await copy(text);
    if (current !== generation.current) return;
    setCopied(success);
    if (timer.current) clearTimeout(timer.current);
    if (success) timer.current = setTimeout(() => setCopied(false), 2000);
  }}>{copied ? <Check size={15}/> : <Copy size={15}/>}<span aria-live="polite">{copied ? 'Copied' : label}</span></button>;
}
