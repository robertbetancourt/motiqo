'use client';

import { useEffect, useId, useRef } from 'react';

export type PleatProps = { compact?: boolean; paused?: boolean; className?: string };
const COUNT = 25;
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const blend = (a: number, b: number, t: number) => a + (b - a) * t;

/** An original Motiqo sculpture. All geometry is generated here; React is its only dependency. */
export default function Pleat({ compact = false, paused = false, className = '' }: PleatProps) {
  const host = useRef<HTMLDivElement>(null);
  const drawing = useRef<SVGGElement>(null);
  const stop = useRef(paused);
  const wakeRef = useRef<(() => void) | null>(null);
  const id = useId().replace(/:/g, '');
  stop.current = paused;

  useEffect(() => { wakeRef.current?.(); }, [paused]);
  useEffect(() => {
    const root = host.current!, group = drawing.current!;
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    const paths = Array.from(group.querySelectorAll<SVGPathElement>('[data-blade]'));
    const edges = Array.from(group.querySelectorAll<SVGPathElement>('[data-edge]'));
    const bearings = Array.from(group.querySelectorAll<SVGCircleElement>('[data-bearing]'));
    const ribs = Array.from({ length: COUNT }, (_, i) => ({ x: 0, v: 0, light: 0, rest: 47 + 32 * Math.exp(-(((i - 10) / 8) ** 2)) + 6 * Math.sin(i * .27) }));
    const input = { target: 12, current: 12, strength: 0, amount: 0, depth: .5, depthTarget: .5, small: false };
    let raf = 0, last = 0, visible = true, release = 0, keyIndex = 12, disposed = false;
    // Orthographic projection, in an independent 640 × 440 drawing space.
    const project = (x: number, y: number, z: number): [number, number] => [320 + x * .84 - y * .54, 250 + (x * .54 + y * .84) * .48 - z * .877];
    const coord = (p: [number, number]) => `${p[0].toFixed(2)},${p[1].toFixed(2)}`;
    const line = (p: [number, number][]) => 'M' + p.map(coord).join('L');
    const base = [project(-161, -83, 0), project(161, -83, 0), project(161, 83, 0), project(-161, 83, 0)];
    group.querySelector<SVGPathElement>('[data-base]')!.setAttribute('d', line(base) + 'Z');
    const lower = base.map(([x, y]) => [x, y + 7] as [number, number]);
    group.querySelector<SVGPathElement>('[data-plinth]')!.setAttribute('d', line([base[1], base[2], base[3], lower[3], lower[2], lower[1]]) + 'Z');

    function paint() {
      ribs.forEach((rib, i) => {
        const x = (i - 12) * 11.7;
        const top: [number, number][] = [], bottom: [number, number][] = [];
        for (let j = 0; j <= 28; j++) {
          const t = j / 28, y = (t - .5) * 146;
          const arch = Math.sin(Math.PI * t) ** .62;
          const z = 5 + rib.rest * arch;
          // Anchored feet, a bowed spine, and an opening that leans away from the hand.
          const displacement = rib.x * arch * (1 + .23 * Math.sin(t * Math.PI * 2));
          top.push(project(x + displacement, y, z - Math.abs(rib.x) * .18 * arch));
          bottom.push(project(x, y, 3));
        }
        paths[i].setAttribute('d', line([...top, ...bottom.reverse()]) + 'Z');
        edges[i].setAttribute('d', line(top));
        edges[i].setAttribute('stroke', `rgb(${Math.round(blend(172, 236, rib.light))},${Math.round(blend(181, 205, rib.light))},${Math.round(blend(177, 153, rib.light))})`);
        edges[i].setAttribute('stroke-opacity', String(.48 + rib.light * .5));
        const foot = project(x, 76, 3);
        bearings[i].setAttribute('cx', String(foot[0])); bearings[i].setAttribute('cy', String(foot[1]));
      });
    }

    function frame(now: number) {
      raf = 0;
      if (disposed || !visible || document.hidden) return;
      const dt = Math.min(.04, Math.max(.001, (now - last) / 1000)); last = now;
      if (stop.current || media.matches) {
        // A composed still edition, independent of the last pointer position.
        ribs.forEach(r => { r.x = 0; r.v = 0; r.light = 0; });
        input.amount = 0; paint(); return;
      }
      const alpha = 1 - Math.exp(-dt * 9);
      input.current = blend(input.current, input.target, alpha);
      input.depth = blend(input.depth, input.depthTarget, alpha);
      input.amount = blend(input.amount, input.strength, alpha);
      const steps = Math.ceil(dt / .008), h = dt / steps;
      let moving = Math.abs(input.amount - input.strength) > .001 || Math.abs(input.current - input.target) > .001;
      for (let n = 0; n < steps; n++) {
        // Compute every force before advancing positions: neighbour coupling stays symmetric.
        const forces = ribs.map((r, i) => {
          const d = i - input.current, spread = 2.9 + input.depth * 1.5;
          const influence = Math.exp(-((d / spread) ** 2));
          const target = Math.tanh(d * .62) * influence * 28 * input.amount * (input.small ? .65 : 1);
          const neighbour = (ribs[Math.max(0, i - 1)].x + ribs[Math.min(COUNT - 1, i + 1)].x - 2 * r.x);
          return 122 * (target - r.x) + 34 * neighbour - 17.5 * r.v;
        });
        ribs.forEach((r, i) => { r.v += forces[i] * h; r.x += r.v * h; });
      }
      ribs.forEach((r, i) => {
        const targetLight = Math.exp(-(((i - input.current) / 3.5) ** 2)) * input.amount;
        r.light = blend(r.light, targetLight, alpha);
        moving ||= Math.abs(r.v) > .025 || Math.abs(r.light - targetLight) > .001;
      });
      paint();
      if (moving) raf = requestAnimationFrame(frame);
    }
    function wake() {
      if (!disposed && !raf && visible && !document.hidden) { last = performance.now(); raf = requestAnimationFrame(frame); }
    }
    wakeRef.current = wake;
    function reset() { input.strength = 0; wake(); }
    function pointer(e: PointerEvent) {
      if (stop.current || media.matches) return;
      clearTimeout(release);
      const rect = root.querySelector('svg')!.getBoundingClientRect();
      const scale = Math.min(rect.width / 640, rect.height / 440);
      const sx = (e.clientX - rect.left - (rect.width - 640 * scale) / 2) / scale;
      const sy = (e.clientY - rect.top - (rect.height - 440 * scale) / 2) / scale;
      // Undo projection at the middle of the sculpture, then select a spine.
      const px = sx - 320, py = (sy - 250 + 36 * .877) / .48;
      const worldX = (px * .84 + py * .54) / (.84 ** 2 + .54 ** 2);
      input.target = clamp(worldX / 11.7 + 12, 0, COUNT - 1);
      input.depthTarget = clamp((sy - 150) / 160, 0, 1);
      input.strength = 1;
      wake();
    }
    function end(e: PointerEvent) {
      if (e.pointerType === 'mouse') reset();
      else { clearTimeout(release); release = window.setTimeout(reset, 1200); }
    }
    function lift(e: PointerEvent) { if (e.pointerType !== 'mouse') end(e); }
    function keyboard(e: KeyboardEvent) {
      if (stop.current || media.matches) return;
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
      e.preventDefault(); clearTimeout(release);
      keyIndex = e.key === 'Home' ? 0 : e.key === 'End' ? COUNT - 1 : clamp(keyIndex + (e.key === 'ArrowRight' ? 1 : -1), 0, COUNT - 1);
      input.target = keyIndex; input.strength = 1; wake();
    }
    function visibility() { if (document.hidden) { cancelAnimationFrame(raf); raf = 0; } else wake(); }
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (!visible) { cancelAnimationFrame(raf); raf = 0; } else wake();
    });
    const size = new ResizeObserver(([entry]) => { input.small = entry.contentRect.width < 500; });
    observer.observe(root); size.observe(root);
    root.addEventListener('pointermove', pointer); root.addEventListener('pointerdown', pointer);
    root.addEventListener('pointerleave', end); root.addEventListener('pointerup', lift);
    root.addEventListener('pointercancel', reset); root.addEventListener('keydown', keyboard); root.addEventListener('blur', reset);
    document.addEventListener('visibilitychange', visibility); media.addEventListener('change', wake);
    paint();
    return () => {
      disposed = true; cancelAnimationFrame(raf); clearTimeout(release); wakeRef.current = null;
      observer.disconnect(); size.disconnect();
      root.removeEventListener('pointermove', pointer); root.removeEventListener('pointerdown', pointer);
      root.removeEventListener('pointerleave', end); root.removeEventListener('pointerup', lift);
      root.removeEventListener('pointercancel', reset); root.removeEventListener('keydown', keyboard); root.removeEventListener('blur', reset);
      document.removeEventListener('visibilitychange', visibility); media.removeEventListener('change', wake);
    };
  }, []);

  return <div ref={host} className={`pleat ${compact ? 'pleat-compact' : ''} ${className}`} tabIndex={compact ? -1 : 0} role="group" aria-label="Pleat, interactive folded sculpture" aria-describedby={`${id}-help`}>
    <style>{css}</style>
    <span id={`${id}-help`} className="pleat-help">Move or touch the sculpture to open its folds. Use Left and Right arrow keys, Home or End to select a fold.</span>
    <svg viewBox="0 0 640 440" aria-hidden="true">
      <defs>
        <radialGradient id={`${id}-ground`}><stop stopColor="#6b766b" stopOpacity=".14"/><stop offset="1" stopColor="#0b1012" stopOpacity="0"/></radialGradient>
        <linearGradient id={`${id}-face`} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#1c2627"/><stop offset=".55" stopColor="#10181a"/><stop offset="1" stopColor="#0b1214"/></linearGradient>
      </defs>
      <ellipse cx="320" cy="253" rx="245" ry="120" fill={`url(#${id}-ground)`}/>
      <g ref={drawing} strokeLinejoin="round" strokeLinecap="round">
        <path data-plinth fill="#0b1113" stroke="#344143" strokeWidth=".7"/>
        <path data-base fill="#0e1618" stroke="#475354" strokeWidth=".7"/>
        {Array.from({ length: COUNT }, (_, i) => <g key={i}>
          <path data-blade fill={`url(#${id}-face)`} stroke="#596563" strokeWidth=".65"/>
          <path data-edge fill="none" strokeWidth=".85"/>
          <circle data-bearing r="1.1" fill="#839089"/>
        </g>)}
      </g>
    </svg>
  </div>;
}

const css = `
.pleat{position:relative;display:grid;place-items:center;width:100%;height:440px;min-height:280px;overflow:hidden;background:radial-gradient(ellipse at 52% 48%,#172023 0%,#0b1113 57%,#080e10 100%);touch-action:pan-y;outline:none}
.pleat svg{display:block;width:min(100%,700px);height:auto;max-height:100%}.pleat:focus-visible{outline:1px solid #d9be8f;outline-offset:-5px}.pleat-compact{height:100%;min-height:0}.pleat-help{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%)}
@media(max-width:500px){.pleat:not(.pleat-compact){height:320px}}
`;
