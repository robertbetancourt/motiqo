'use client';
import { useEffect, useId, useRef } from 'react';
export type PulseProps = {
    compact?: boolean;
    paused?: boolean;
    speed?: number;
    amplitude?: number;
    accent?: string;
};
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
/** Deterministic sample activity, never presented as a live financial feed. */
export function pulseSample(index: number, time = 0, amplitude = 1) { const wave = .14 * Math.sin(index * .15 - 1) + .065 * Math.sin(index * .84) + .043 * Math.sin(index * 2.27) + .27 * Math.exp(-(((index - 42) / 14) ** 2)) - .18 * Math.exp(-(((index - 65) / 8) ** 2)); return clamp(.51 + wave * amplitude + Math.sin(time * .55 + index * .14) * .013, .07, .94); }
export default function Pulse({ compact = false, paused = false, speed = 1, amplitude = 1, accent = '#cdd6cc' }: PulseProps) {
    const root = useRef<HTMLDivElement>(null), line = useRef<SVGPathElement>(null), area = useRef<SVGPathElement>(null), cross = useRef<SVGGElement>(null), dot = useRef<SVGCircleElement>(null), metric = useRef<HTMLElement>(null), timestamp = useRef<HTMLTimeElement>(null), restart = useRef<() => void>(() => { }), wakeRef = useRef<() => void>(() => { }), options = useRef({ paused, speed, amplitude });
    options.current = { paused, speed, amplitude };
    const id = useId().replace(/:/g, '');
    useEffect(() => { wakeRef.current(); }, [paused, speed, amplitude]);
    useEffect(() => {
        const host = root.current!, svg = host.querySelector('svg')!, media = matchMedia('(prefers-reduced-motion: reduce)');
        let raf = 0, last = 0, elapsed = 0, visible = true, small = compact, gone = false, progress = 0, x = 83, tx = 83, presence = 0, targetPresence = 0, selected = -1, selectedAmplitude = NaN, initialized = false;
        const frame = (now: number) => {
            raf = 0;
            if (gone || !visible || document.hidden)
                return;
            if (options.current.paused && initialized && !media.matches)
                return;
            const dt = Math.min(.05, Math.max(.001, (now - last) / 1000));
            if (small && now - last < 1000 / 30) {
                raf = requestAnimationFrame(frame);
                return;
            }
            last = now;
            const still = media.matches || options.current.paused;
            initialized = true;
            if (!still)
                elapsed += dt * clamp(options.current.speed, .4, 2);
            progress = still ? 1 : Math.min(1, elapsed / 2.8);
            const reveal = 1 - (1 - progress) ** 3, alpha = still ? 1 : 1 - Math.exp(-dt * 11);
            x += (tx - x) * alpha;
            presence += (targetPresence - presence) * alpha;
            const points = Array.from({ length: 90 }, (_, i) => [26 + i / 89 * 468, 270 - pulseSample(i, still ? 0 : elapsed, options.current.amplitude) * 174]);
            const path = 'M' + points.map(p => p.map(n => n.toFixed(2)).join(',')).join('L');
            line.current!.setAttribute('d', path);
            line.current!.setAttribute('stroke-dashoffset', String(1 - reveal));
            area.current!.setAttribute('d', `${path}L494,281L26,281Z`);
            area.current!.setAttribute('opacity', String(reveal * .65));
            const cursor = clamp(x, 0, 89), lower = Math.floor(cursor), upper = Math.min(89, lower + 1), fraction = cursor - lower;
            const index = Math.round(cursor), point = [26 + cursor / 89 * 468, points[lower][1] + (points[upper][1] - points[lower][1]) * fraction];
            cross.current!.setAttribute('transform', `translate(${point[0].toFixed(2)} 0)`);
            cross.current!.setAttribute('opacity', String(presence));
            dot.current!.setAttribute('cx', String(point[0]));
            dot.current!.setAttribute('cy', String(point[1]));
            dot.current!.setAttribute('opacity', String(presence * reveal));
            if (index !== selected || options.current.amplitude !== selectedAmplitude) {
                selected = index;
                selectedAmplitude = options.current.amplitude;
                metric.current!.textContent = Intl.NumberFormat('en-US').format(Math.round(18400 + pulseSample(index, 0, options.current.amplitude) * 12300));
                const minutes = Math.round(index / 89 * 720);
                timestamp.current!.textContent = `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
            }
            if (!still)
                raf = requestAnimationFrame(frame);
        };
        const wake = () => { if (!gone && !raf && visible && !document.hidden) {
            last = performance.now();
            raf = requestAnimationFrame(frame);
        } };
        wakeRef.current = wake;
        const move = (event: PointerEvent) => { if (media.matches || options.current.paused)
            return; const r = svg.getBoundingClientRect(), scale = Math.min(r.width / 520, r.height / 370); const sx = (event.clientX - r.left - (r.width - 520 * scale) / 2) / scale; tx = clamp((sx - 26) / 468 * 89, 0, 89); targetPresence = 1; wake(); };
        const leave = () => { targetPresence = 0; wake(); };
        const key = (event: KeyboardEvent) => { if (options.current.paused)
            return; if (!['ArrowLeft', 'ArrowRight', 'Home', 'End', ' '].includes(event.key))
            return; event.preventDefault(); if (event.key === ' ') {
            elapsed = progress = 0;
            wake();
            return;
        } tx = event.key === 'Home' ? 0 : event.key === 'End' ? 89 : clamp(tx + (event.key === 'ArrowLeft' ? -4 : 4), 0, 89); targetPresence = 1; wake(); };
        const visibility = () => { cancelAnimationFrame(raf); raf = 0; wake(); };
        const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; visibility(); });
        const size = new ResizeObserver(([entry]) => { small = entry.contentRect.width < 500; });
        observer.observe(host);
        size.observe(host);
        restart.current = () => { elapsed = progress = 0; wake(); };
        host.addEventListener('pointermove', move);
        host.addEventListener('pointerdown', move);
        host.addEventListener('pointerleave', leave);
        host.addEventListener('pointercancel', leave);
        host.addEventListener('keydown', key);
        host.addEventListener('blur', leave);
        document.addEventListener('visibilitychange', visibility);
        media.addEventListener('change', visibility);
        wake();
        return () => { gone = true; cancelAnimationFrame(raf); observer.disconnect(); size.disconnect(); wakeRef.current = () => { }; restart.current = () => { }; host.removeEventListener('pointermove', move); host.removeEventListener('pointerdown', move); host.removeEventListener('pointerleave', leave); host.removeEventListener('pointercancel', leave); host.removeEventListener('keydown', key); host.removeEventListener('blur', leave); document.removeEventListener('visibilitychange', visibility); media.removeEventListener('change', visibility); };
    }, [compact]);
    return <div className={`pulse ${compact ? 'pulse-compact' : ''}`} ref={root} tabIndex={compact ? -1 : 0} role="group" aria-label="Pulse, sample activity chart. Arrow keys inspect the timeline; Space replays the draw." style={{ '--pulse-accent': accent } as React.CSSProperties}><style>{styles}</style><div className="pulse-card"><div className="pulse-header"><div><span className="pulse-label">ACTIVITY</span><strong ref={metric}>24,820</strong><span className="pulse-change">+1,238 <span>↗ 24.64%</span></span></div><span className="pulse-period">Today</span></div><svg viewBox="0 0 520 370" aria-hidden="true"><defs><linearGradient id={`${id}-fade`} x1="0" y1="0" x2="0" y2="1"><stop stopColor={accent} stopOpacity=".065"/><stop offset="1" stopColor={accent} stopOpacity="0"/></linearGradient></defs><path d="M26 170H494 M26 281H494" stroke="#ffffff09" strokeWidth=".7" strokeDasharray="2 6"/><path ref={area} fill={`url(#${id}-fade)`} opacity="0"/><path ref={line} fill="none" stroke={accent} strokeWidth="1.15" strokeLinejoin="round" pathLength="1" strokeDasharray="1" strokeDashoffset="1"/><g ref={cross} opacity="0"><path d="M0 90V282" stroke="#ffffff30" strokeWidth=".7" strokeDasharray="2 5"/><circle cy="281" r="2" fill={accent}/></g><circle ref={dot} r="4" stroke="#111" strokeWidth="1.7" fill={accent} opacity="0"/>{['00:00', '03:00', '06:00', '09:00', '12:00'].map((text, i) => <text key={text} x={26 + i * 117} y="310" textAnchor={i === 0 ? 'start' : i === 4 ? 'end' : 'middle'} fill="#8b8b8b" fontSize="10" fontFamily="monospace">{text}</text>)}</svg><div className="pulse-footer"><span>SAMPLE SIGNAL <time ref={timestamp}>11:12</time></span><button tabIndex={compact ? -1 : 0} onClick={() => restart.current()} aria-label="Replay chart animation">↻</button></div></div></div>;
}
const styles = `.pulse{display:grid;place-items:center;width:100%;height:100%;min-height:280px;background:radial-gradient(ellipse at 50% 45%,#191919,#0a0a0a 72%);outline:none;touch-action:pan-y}.pulse:focus-visible{outline:1px solid #fff;outline-offset:-5px}.pulse-card{position:relative;width:min(76%,480px);aspect-ratio:1.2;border:1px solid #ffffff16;border-radius:20px;background:linear-gradient(150deg,#1b1b1b,#141414);box-shadow:0 20px 60px #0002;overflow:hidden}.pulse-card>svg{display:block;width:100%;height:100%}.pulse-header{position:absolute;top:6%;left:5%;right:5%;display:flex;justify-content:space-between;pointer-events:none}.pulse-header>div{display:flex;flex-direction:column;gap:7px}.pulse-label{font:8px monospace;letter-spacing:1.4px;color:#999}.pulse-header strong{font:500 clamp(20px,2.7vw,34px) 'Urbanist Variable',sans-serif;letter-spacing:-.8px;color:#f4f3f0;line-height:1}.pulse-change{font:10px monospace;color:#e4e4dd}.pulse-change>span{margin-left:8px;color:var(--pulse-accent)}.pulse-period{font:10px sans-serif;color:#aaa}.pulse-footer{position:absolute;left:5%;right:5%;bottom:4%;display:flex;align-items:center;justify-content:space-between;border-top:1px solid #ffffff14;padding-top:9px}.pulse-footer>span{font:8px monospace;letter-spacing:1px;color:#777}.pulse-footer time{margin-left:12px;color:#ccc}.pulse-footer button{width:32px;height:32px;border:1px solid #ffffff15;border-radius:50%;background:#ffffff05;color:#ddd;font-size:18px;cursor:pointer}.pulse-footer button:focus-visible{outline:1px solid #fff;outline-offset:3px}.pulse-compact .pulse-card{width:83%;border-radius:13px}.pulse-compact .pulse-header{top:7%}.pulse-compact .pulse-header strong{font-size:22px}.pulse-compact .pulse-label{font-size:6px}.pulse-compact .pulse-change{font-size:7px}.pulse-compact .pulse-footer{padding-top:4px}.pulse-compact .pulse-footer button{width:22px;height:22px;font-size:14px}.pulse-compact .pulse-footer>span{font-size:6px}@media(max-width:500px){.pulse-card{width:88%}.pulse-header strong{font-size:28px}}html[data-theme=light] .pulse{background:radial-gradient(ellipse at 50% 47%,#fff,#f1eee8 74%)}html[data-theme=light] .pulse-card{background:linear-gradient(155deg,#fffdf9,#f4f0e9);border-color:#00000014;box-shadow:0 20px 60px #46332108}html[data-theme=light] .pulse-header strong{color:#1c1b1a}html[data-theme=light] :is(.pulse-label,.pulse-period,.pulse-footer>span){color:#64615e}html[data-theme=light] :is(.pulse-change,.pulse-footer time){color:#1c1b1a}html[data-theme=light] .pulse-change>span{color:#616758}html[data-theme=light] .pulse-card svg text{fill:#797169}html[data-theme=light] .pulse-card svg path[pathLength]{stroke:color-mix(in srgb,var(--pulse-accent) 40%,#24271f)}html[data-theme=light] .pulse-card svg>circle{fill:#747e66;stroke:#fff}html[data-theme=light] .pulse-card svg>path:first-of-type{stroke:#00000012}html[data-theme=light] .pulse-card svg>g path{stroke:#746d5f70}html[data-theme=light] .pulse-card svg>g circle{fill:#746d5f}html[data-theme=light] .pulse-footer{border-color:#e5e2dd}html[data-theme=light] .pulse-footer button{color:#1c1b1a;background:#ffffff90;border-color:#d7d4d0}html[data-theme=light] .pulse:focus-visible{outline-color:#302c28}`;
