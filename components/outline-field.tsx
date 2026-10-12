'use client';

import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { VsChipOutline } from './vuesax/VsChipOutline';
import type { VsChipOutlineElement } from './vuesax/vs-chip-outline.js';

// Reuse the original Vuesax ring behind a native, labelled input. The chip is
// decorative and inert, so the field never nests an input inside a button.
export default function OutlineField({ children, className='', paused=false }: { children:ReactNode; className?:string; paused?:boolean }) {
  const chip = useRef<VsChipOutlineElement>(null);
  const [hovered,setHovered] = useState(false);
  const [focused,setFocused] = useState(false);
  useLayoutEffect(() => {
    const root = chip.current?.shadowRoot;
    if (!root || root.querySelector('[data-motiqo-layout]')) return;
    const sizing = document.createElement('style');
    sizing.setAttribute('data-motiqo-layout','');
    // Layout only. Animation, conic mask and reduced-motion behavior remain
    // entirely in the unchanged original vs-chip-outline.js implementation.
    sizing.textContent = ':host{width:100%;height:100%}.vco{width:100%;height:100%;padding:0}.vco__avatar,.vco__dot,.vco__check,.vco__label,.vco__close{display:none!important}:host([data-paused]) .vco__ring{animation-play-state:paused!important}';
    root.append(sizing);
  }, []);
  return <div className={`outline-field ${className}`} onPointerEnter={()=>setHovered(true)} onPointerLeave={()=>setHovered(false)} onFocusCapture={()=>setFocused(true)} onBlurCapture={e=>{ if(!e.currentTarget.contains(e.relatedTarget as Node | null)) setFocused(false); }}>
    <VsChipOutline ref={chip} className="field-ring" label="" radius="pill" variant="soft" selectable modelValue={hovered || focused} aria-hidden="true" inert data-paused={paused || undefined}/>
    {children}
  </div>;
}
