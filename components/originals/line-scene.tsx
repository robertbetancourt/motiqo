'use client';

import { useEffect, useId, useRef } from 'react';

export type LineProps = { compact?: boolean; paused?: boolean; className?: string };
export type Point = [number, number];
export type Input = { x: number; y: number; strength: number };
export type Scene = { update: (dt: number, input: Input, small: boolean) => boolean; reset: () => void; activate?: (input: Input) => void; key?: (key: string, input: Input) => void };
export type Factory = (group: SVGGElement, id: string) => Scene;
export const limit = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
export const mix = (a: number, b: number, t: number) => a + (b - a) * t;
export const coordinates = (p: Point) => `${p[0].toFixed(2)},${p[1].toFixed(2)}`;
export const outline = (points: Point[], closed = false) => 'M' + points.map(coordinates).join('L') + (closed ? 'Z' : '');
export function node<K extends keyof SVGElementTagNameMap>(parent: SVGElement, tag: K, attrs: Record<string, string | number> = {}) {
  const element = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (const [key, value] of Object.entries(attrs)) element.setAttribute(key, String(value));
  parent.append(element); return element;
}
export function path(parent: SVGElement, attrs: Record<string, string | number> = {}) {
  return node(parent, 'path', { fill: 'none', stroke: '#91a29a', 'stroke-width': .75, ...attrs });
}
export const spring = (x = 0) => ({ x, v: 0 });
/** Exact damped oscillator step: stable across variable frame lengths, no Euler overshoot. */
export function settle(s: { x: number; v: number }, target: number, dt: number, stiffness = 115, damping = 17) {
  const decayRate = damping / 2, frequency = Math.sqrt(Math.max(.01, stiffness - decayRate ** 2));
  const displacement = s.x - target, quadrature = (s.v + decayRate * displacement) / frequency;
  const decay = Math.exp(-decayRate * dt), sin = Math.sin(frequency * dt), cos = Math.cos(frequency * dt);
  s.x = target + decay * (displacement * cos + quadrature * sin);
  s.v = decay * (s.v * cos - (decayRate * quadrature + frequency * displacement) * sin);
  if (Math.abs(s.x - target) < .0005 && Math.abs(s.v) < .005) { s.x = target; s.v = 0; return false; }
  return true;
}
export const edge = (amount: number) => `rgb(${Math.round(mix(141, 232, amount))},${Math.round(mix(163, 201, amount))},${Math.round(mix(155, 153, amount))})`;

/** Shared lifecycle only. Each sculpture supplies its own geometry and interaction rules. */
export default function LineStage({ label, help, factory, compact = false, paused = false, className = '' }: LineProps & { label: string; help: string; factory: Factory }) {
  const host = useRef<HTMLDivElement>(null), drawing = useRef<SVGGElement>(null);
  const stopped = useRef(paused), wakeRef = useRef<(() => void) | null>(null);
  stopped.current = paused;
  const id = useId().replace(/:/g, '');
  useEffect(() => { wakeRef.current?.(); }, [paused]);
  useEffect(() => {
    const root = host.current!, group = drawing.current!, svg = root.querySelector('svg')!;
    const scene = factory(group, id), reduced = matchMedia('(prefers-reduced-motion: reduce)');
    const wanted: Input = { x: 320, y: 220, strength: 0 }, current = { ...wanted };
    let raf = 0, last = 0, visible = true, small = false, gone = false, release = 0;
    let down: Point | null = null;
    function tick(now: number) {
      raf = 0;
      if (gone || !visible || document.hidden) return;
      if (reduced.matches) { scene.reset(); scene.update(0, { x: 320, y: 220, strength: 0 }, small); return; }
      if (stopped.current) return;
      const elapsed = (now - last) / 1000;
      if (small && elapsed < 1 / 30) { raf = requestAnimationFrame(tick); return; }
      const dt = Math.min(.055, Math.max(.001, elapsed)); last = now;
      const alpha = 1 - Math.exp(-dt * 11);
      current.x = mix(current.x, wanted.x, alpha); current.y = mix(current.y, wanted.y, alpha);
      current.strength = mix(current.strength, wanted.strength, alpha);
      const inputMoving = Math.abs(current.x - wanted.x) + Math.abs(current.y - wanted.y) + Math.abs(current.strength - wanted.strength) > .003;
      const moving = scene.update(dt, current, small);
      if (moving || inputMoving) raf = requestAnimationFrame(tick);
    }
    function wake() { if (!gone && !raf && visible && !document.hidden) { last = performance.now(); raf = requestAnimationFrame(tick); } }
    wakeRef.current = wake;
    function point(e: PointerEvent) {
      const r = svg.getBoundingClientRect(), scale = Math.min(r.width / 640, r.height / 440);
      if (!scale) return;
      wanted.x = limit((e.clientX - r.left - (r.width - 640 * scale) / 2) / scale, 0, 640);
      wanted.y = limit((e.clientY - r.top - (r.height - 440 * scale) / 2) / scale, 0, 440);
    }
    function move(e: PointerEvent) { if (stopped.current || reduced.matches) return; clearTimeout(release); point(e); wanted.strength = 1; wake(); }
    function press(e: PointerEvent) { down = [e.clientX, e.clientY]; move(e); }
    function rest() { clearTimeout(release); wanted.strength = 0; down = null; wake(); }
    function lift(e: PointerEvent) {
      if (!stopped.current && !reduced.matches && !compact && down && Math.hypot(e.clientX - down[0], e.clientY - down[1]) < 10) {
        point(e); scene.activate?.(wanted); wake();
      }
      down = null;
      if (e.pointerType !== 'mouse') { clearTimeout(release); release = window.setTimeout(rest, 1200); }
    }
    function leave(e: PointerEvent) { if (e.pointerType === 'mouse') rest(); else { clearTimeout(release); release = window.setTimeout(rest, 1200); } }
    function keyboard(e: KeyboardEvent) {
      if (stopped.current || reduced.matches || !['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End','Enter',' '].includes(e.key)) return;
      e.preventDefault(); clearTimeout(release); wanted.strength = 1;
      if (scene.key) scene.key(e.key, wanted);
      else {
        if (e.key === 'Home') { wanted.x = 320; wanted.y = 220; }
        if (e.key === 'End') wanted.x = 500;
        if (e.key.startsWith('Arrow')) {
          wanted.x = limit(wanted.x + (e.key === 'ArrowLeft' ? -55 : e.key === 'ArrowRight' ? 55 : 0), 110, 530);
          wanted.y = limit(wanted.y + (e.key === 'ArrowUp' ? -40 : e.key === 'ArrowDown' ? 40 : 0), 90, 350);
        }
      }
      wake();
    }
    function visibility() { if (document.hidden) { cancelAnimationFrame(raf); raf = 0; } else wake(); }
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; if (!visible) { cancelAnimationFrame(raf); raf = 0; } else wake(); });
    const size = new ResizeObserver(([entry]) => { small = entry.contentRect.width < 500; wake(); });
    observer.observe(root); size.observe(root);
    root.addEventListener('pointermove', move); root.addEventListener('pointerdown', press);
    root.addEventListener('pointerup', lift); root.addEventListener('pointerleave', leave); root.addEventListener('pointercancel', rest);
    root.addEventListener('keydown', keyboard); root.addEventListener('blur', rest);
    document.addEventListener('visibilitychange', visibility); reduced.addEventListener('change', wake);
    scene.update(0, current, small); wake();
    return () => {
      gone = true; cancelAnimationFrame(raf); clearTimeout(release); wakeRef.current = null;
      observer.disconnect(); size.disconnect();
      root.removeEventListener('pointermove', move); root.removeEventListener('pointerdown', press);
      root.removeEventListener('pointerup', lift); root.removeEventListener('pointerleave', leave); root.removeEventListener('pointercancel', rest);
      root.removeEventListener('keydown', keyboard); root.removeEventListener('blur', rest);
      document.removeEventListener('visibilitychange', visibility); reduced.removeEventListener('change', wake);
      group.replaceChildren();
    };
  }, [factory, compact, id]);
  return <div ref={host} className={`line-stage ${compact ? 'line-compact' : ''} ${className}`} role="group" tabIndex={compact ? -1 : 0} aria-label={label} aria-describedby={`${id}-help`}>
    <style>{styles}</style><span id={`${id}-help`} className="line-help">{help}</span>
    <svg viewBox="0 0 640 440" aria-hidden="true"><defs><radialGradient id={`${id}-haze`}><stop stopColor="#92aa9520"/><stop offset="1" stopColor="#080e1000"/></radialGradient></defs><ellipse cx="320" cy="299" rx="220" ry="90" fill={`url(#${id}-haze)`}/><g ref={drawing} strokeLinecap="round" strokeLinejoin="round"/></svg>
  </div>;
}
const styles = `.line-stage{position:relative;display:grid;place-items:center;width:100%;height:440px;min-height:280px;background:radial-gradient(ellipse at 50% 47%,#162123,#0b1214 63%,#080e10);overflow:hidden;touch-action:pan-y;outline:none}.line-stage svg{display:block;width:min(100%,700px);height:auto;max-height:100%}.line-stage:focus-visible{outline:1px solid #d9bf95;outline-offset:-5px}.line-compact{height:100%;min-height:0}.line-help{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%)}@media(max-width:500px){.line-stage:not(.line-compact){height:320px}}`;
