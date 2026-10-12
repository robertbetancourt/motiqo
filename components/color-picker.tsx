'use client';

import { useEffect, useRef, useState } from 'react';
import { Palette, RotateCcw } from 'lucide-react';

export const defaultAccent = '#ef6052';
const swatches = [{name:'Coral',value:defaultAccent},{name:'Acid',value:'#d5ec73'},{name:'Ice',value:'#82c7f4'},{name:'Lilac',value:'#bd9bfa'},{name:'Mint',value:'#82d2b0'}];
export default function ColorPicker() {
  const [color, setColor] = useState(defaultAccent);
  const details = useRef<HTMLDetailsElement>(null);
  function apply(value: string) {
    if (!/^#[0-9a-f]{6}$/i.test(value)) return;
    setColor(value); document.documentElement.style.setProperty('--accent',value);
    try { localStorage.setItem('motiqo-accent',value); } catch {}
  }
  useEffect(() => {
    try { const stored = localStorage.getItem('motiqo-accent'); if (stored) apply(stored); } catch {}
    const dismiss = (e: PointerEvent) => { if (!details.current?.contains(e.target as Node) && details.current) details.current.open = false; };
    const escape = (e: KeyboardEvent) => { if (e.key === 'Escape' && details.current) details.current.open = false; };
    document.addEventListener('pointerdown',dismiss); document.addEventListener('keydown',escape);
    return () => { document.removeEventListener('pointerdown',dismiss); document.removeEventListener('keydown',escape); };
  }, []);
  return <details className="color-picker" ref={details}><summary className="header-tool cursor-target" aria-label="Change primary color"><Palette size={15} /><span>Accent</span><i className="color-dot" /></summary>
    <div className="color-panel"><div className="color-panel-title"><span className="eyebrow">MAKE IT YOURS</span><button aria-label="Reset primary color" className="icon-button" onClick={() => apply(defaultAccent)}><RotateCcw size={14} /></button></div><p>A little change. A different feeling.</p><div className="color-swatches">{swatches.map(s => <button key={s.name} style={{background:s.value}} className={color.toLowerCase() === s.value ? 'chosen' : ''} aria-label={`${s.name} primary color`} aria-pressed={color.toLowerCase() === s.value} onClick={() => apply(s.value)} />)}</div><label className="custom-color">Custom color <span>{color.toUpperCase()}</span><input aria-label="Custom primary color" type="color" value={color} onChange={e => apply(e.target.value)} /></label></div>
  </details>;
}
