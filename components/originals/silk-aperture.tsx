'use client';

import { useEffect, useId, useRef, useState } from 'react';

export type SilkApertureProps = {
  title?: string;
  subtitle?: string;
  eyebrow?: string;
  paused?: boolean;
  compact?: boolean;
  href?: string;
  cta?: string;
  className?: string;
  minimal?: boolean;
  light?: 'dawn' | 'dusk';
  showControls?: boolean;
  onLightChange?: (light: 'dawn' | 'dusk') => void;
};

// Frame-rate independent interpolation: equal settling time at 60 / 120 Hz.
const lerp = (from: number, to: number, amount: number) => from + (to - from) * amount;
const ribs = Array.from({ length: 23 }, (_, i) => i - 11);

export default function SilkAperture({
  title = 'A slower kind of somewhere.',
  subtitle = 'An intimate retreat. Between the mountains and the sea.',
  eyebrow = 'STILLROOM — PRIVATE RETREAT',
  paused = false, compact = false, href, cta = 'Discover the retreat', className = '',
  minimal = true, light, showControls = !minimal, onLightChange,
}: SilkApertureProps) {
  const root = useRef<HTMLElement>(null);
  const art = useRef<SVGSVGElement>(null);
  const target = useRef({ x: 0, y: 0, open: 0 });
  const wake = useRef<() => void>(() => {});
  const [internalDusk, setInternalDusk] = useState(true);
  const dusk = light ? light === 'dusk' : internalDusk;
  function setDusk(value: boolean) { setInternalDusk(value); onLightChange?.(value ? 'dusk' : 'dawn'); }
  const uid = useId().replace(/:/g, '');

  useEffect(() => {
    const element = root.current;
    const drawing = art.current;
    if (!element || !drawing) return;
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    const shutters = Array.from(drawing.querySelectorAll<SVGPathElement>('[data-rib]'));
    let frame = 0;
    let last = 0;
    let visible = true;
    let current = { x: 0, y: 0, open: 0 };

    function paint() {
      element!.style.setProperty('--sa-x', current.x.toFixed(4));
      element!.style.setProperty('--sa-y', current.y.toFixed(4));
      shutters.forEach((rib, i) => {
        const n = ribs[i];
        const distance = Math.abs(n) / 11;
        const bow = Math.sin(distance * Math.PI) * current.open * 52;
        const x = 300 + n * (14 + current.open * 5.5);
        const bend = Math.sign(n) * bow + current.x * (1 - distance) * 24;
        rib.setAttribute('d', `M ${x} 42 C ${x + bend} 138, ${x + bend + current.y * 16} 282, ${x} 378`);
        rib.style.opacity = String(.16 + distance * .64 - current.open * (1 - distance) * .13);
      });
    }
    function stop() { cancelAnimationFrame(frame); frame = 0; last = 0; }
    function tick(time: number) {
      frame = 0;
      const dt = last ? Math.min((time - last) / 1000, .05) : 1 / 60;
      last = time;
      const alpha = 1 - Math.exp(-6.8 * dt);
      current.x = lerp(current.x, target.current.x, alpha);
      current.y = lerp(current.y, target.current.y, alpha);
      current.open = lerp(current.open, target.current.open, 1 - Math.exp(-4.6 * dt));
      paint();
      if (Math.abs(current.x - target.current.x) + Math.abs(current.y - target.current.y) + Math.abs(current.open - target.current.open) > .001) {
        frame = requestAnimationFrame(tick);
      } else last = 0;
    }
    function start() {
      if (!frame && visible && !document.hidden && !paused && !media.matches) frame = requestAnimationFrame(tick);
    }
    function reset() {
      stop();
      target.current = { x: 0, y: 0, open: 0 };
      current = { x: 0, y: 0, open: 0 };
      paint();
    }
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) start(); else stop();
    });
    const visibility = () => { if (document.hidden) stop(); else start(); };
    observer.observe(element);
    media.addEventListener('change', reset);
    document.addEventListener('visibilitychange', visibility);
    wake.current = start;
    reset();
    return () => {
      stop(); observer.disconnect();
      media.removeEventListener('change', reset);
      document.removeEventListener('visibilitychange', visibility);
      wake.current = () => {};
    };
  }, [paused]);

  function release() { target.current = { x: 0, y: 0, open: 0 }; wake.current(); }

  return <section ref={root} className={`silk-aperture ${minimal ? 'sa-minimal' : ''} ${compact ? 'sa-compact' : ''} ${paused ? 'sa-paused' : ''} ${className}`} data-light={dusk ? 'dusk' : 'dawn'} aria-label="Silk Aperture retreat experience"
    onPointerMove={event => {
      if (event.pointerType === 'touch') return;
      const rect = event.currentTarget.getBoundingClientRect();
      target.current = {
        x: Math.max(-1, Math.min(1, (event.clientX - rect.left) / rect.width * 2 - 1)),
        y: Math.max(-1, Math.min(1, (event.clientY - rect.top) / rect.height * 2 - 1)),
        open: 1,
      };
      wake.current();
    }} onPointerLeave={event => { if (event.pointerType !== 'touch') release(); }} onPointerCancel={release}
    onPointerDown={event => {
      if (event.pointerType === 'touch') {
        target.current = { x: 0, y: 0, open: target.current.open ? 0 : 1 };
        wake.current();
      }
    }}
    onFocusCapture={() => { target.current.open = 1; wake.current(); }}
    onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget)) release(); }}>
    <style>{styles}</style>
    <div className="sa-grain" aria-hidden="true" />
    {!minimal && <header className="sa-header"><span>{eyebrow}</span><span className="sa-edition">A PLACE TO EXHALE / 01</span></header>}
    <div className="sa-stage">
      {!minimal && <div className="sa-orbit" aria-hidden="true"><span>LESS, BUT CLOSER.</span></div>}
      <svg ref={art} className="sa-art" viewBox="0 0 600 420" fill="none" aria-hidden="true">
        <defs>
          <linearGradient id={`${uid}-sky`} x1="300" y1="45" x2="300" y2="380" gradientUnits="userSpaceOnUse"><stop stopColor="var(--sa-sky)"/><stop offset=".58" stopColor="var(--sa-horizon)"/><stop offset="1" stopColor="var(--sa-sea)"/></linearGradient>
          <linearGradient id={`${uid}-metal`} x1="125" y1="0" x2="465" y2="0" gradientUnits="userSpaceOnUse"><stop stopColor="#675342"/><stop offset=".28" stopColor="#ecd2a6"/><stop offset=".52" stopColor="#a88058"/><stop offset=".72" stopColor="#f3dfb7"/><stop offset="1" stopColor="#6b5544"/></linearGradient>
          <radialGradient id={`${uid}-sun`}><stop stopColor="#fff3d2"/><stop offset=".7" stopColor="#eed3a0"/><stop offset="1" stopColor="#eed3a0" stopOpacity="0"/></radialGradient>
          <clipPath id={`${uid}-arch`}><path d="M155 378V192a145 145 0 0 1 290 0v186Z"/></clipPath>
        </defs>
        <path className="sa-arch-outline" d="M142 378V192a158 158 0 0 1 316 0v186M132 378V192a168 168 0 0 1 336 0v186"/>
        <g clipPath={`url(#${uid}-arch)`}>
          <path d="M155 42h290v336H155z" fill={`url(#${uid}-sky)`}/>
          <g className="sa-landscape">
            <circle cx="341" cy="170" r="40" fill={`url(#${uid}-sun)`}/>
            <circle cx="341" cy="170" r="17" fill="#f4dfb8"/>
            <path d="M100 278 181 209 241 250 297 230 367 268 464 202 514 288v140H100Z" fill="var(--sa-mountain-back)"/>
            <path d="m100 304 116-42 67 36 56-27 68 28 107-34v163H100Z" fill="var(--sa-mountain)"/>
            <path d="M100 318q120-31 207 0t207-7v117H100Z" fill="var(--sa-sea)"/>
            {[0, 1, 2, 3, 4, 5].map(i => <path key={i} d={`M${257 - i * 9} ${327 + i * 8}q${30 + i * 5} -3 ${60 + i * 10} 0`} stroke="#e7c6a0" strokeOpacity={.32 - i * .035}/>) }
          </g>
        </g>
        <g stroke={`url(#${uid}-metal)`} strokeWidth="5" strokeLinecap="round">
          {ribs.map(n => <path key={n} data-rib="" d={`M${300 + n * 14} 42V378`} opacity={.16 + Math.abs(n) / 11 * .64}/>)}
        </g>
        <path d="M125 379h350" stroke={`url(#${uid}-metal)`} strokeOpacity=".6"/>
        <path d="M155 378V192a145 145 0 0 1 290 0v186" stroke={`url(#${uid}-metal)`} strokeOpacity=".8"/>
      </svg>
      <div className="sa-caption"><span>THE ART OF</span><span>being elsewhere.</span></div>
      {!minimal && <span className="sa-side-note">LIGHT. SPACE. STILLNESS.</span>}
    </div>
    {(!minimal || showControls) && <footer className="sa-footer">
      {!minimal && <div className="sa-copy"><h2>{title}</h2><p>{subtitle}</p>{href && <a className="sa-cta" href={href}>{cta}<span aria-hidden="true">↗</span></a>}</div>}
      {showControls && <div className="sa-light" role="group" aria-label="Landscape light">
        <span className="sa-light-label">CHOOSE YOUR LIGHT</span>
        <div>{[false, true].map(value => <button key={String(value)} type="button" aria-pressed={dusk === value} onClick={() => setDusk(value)}><span className={`sa-swatch ${value ? 'sa-dusk' : 'sa-dawn'}`} aria-hidden="true"/>{value ? 'Dusk' : 'Dawn'}</button>)}</div>
      </div>}
    </footer>}
  </section>;
}

const styles = `
.silk-aperture{--sa-x:0;--sa-y:0;--sa-ink:#141815;--sa-paper:#eee5d5;--sa-muted:#b9b5a6;--sa-sky:#555450;--sa-horizon:#c89672;--sa-mountain-back:#6f7366;--sa-mountain:#394c46;--sa-sea:#233c3b;position:relative;isolation:isolate;container-type:inline-size;width:100%;overflow:hidden;color:var(--sa-paper);background:radial-gradient(ellipse at 51% 34%,#43433555,transparent 57%),radial-gradient(ellipse at 15% 100%,#76614322,transparent 45%),var(--sa-ink);border:1px solid #cdbb942c;font-family:Arial,sans-serif;text-align:left}
.silk-aperture[data-light=dawn]{--sa-sky:#7c9a9e;--sa-horizon:#d6c9a9;--sa-mountain-back:#8c9b83;--sa-mountain:#617a68;--sa-sea:#465e58}
.silk-aperture *{box-sizing:border-box}.sa-grain{pointer-events:none;position:absolute;inset:0;z-index:5;opacity:.065;background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 180 180' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.86' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Cpath fill='%23fff' filter='url(%23n)' d='M0 0h180v180H0z'/%3E%3C/svg%3E")}
.sa-header{position:relative;z-index:2;display:flex;justify-content:space-between;gap:20px;padding:27px 32px;font:10px/1.5 monospace;letter-spacing:2px;color:var(--sa-muted)}.sa-edition{opacity:.75}.sa-stage{position:relative;height:390px;display:grid;place-items:center}.sa-art{position:absolute;width:570px;max-width:110%;height:100%;overflow:visible;transform:translate(calc(var(--sa-x)*9px),calc(var(--sa-y)*5px));will-change:transform}.sa-landscape{transform:translate(calc(var(--sa-x)*-7px),calc(var(--sa-y)*-4px))}.sa-arch-outline{stroke:#baaa8155;stroke-width:.6}
.sa-caption{pointer-events:none;position:relative;z-index:2;display:grid;text-align:center;margin-top:105px;text-shadow:0 2px 22px #14201d;transform:translate(calc(var(--sa-x)*-5px),calc(var(--sa-y)*-3px))}.sa-caption>span:first-child{font:9px monospace;letter-spacing:4px;margin-bottom:10px}.sa-caption>span:last-child{font:italic 58px/.95 Georgia,serif;letter-spacing:-3px;max-width:340px}.sa-orbit{position:absolute;left:6%;top:43%;width:68px;height:68px;display:grid;place-items:center;border:1px solid #c2b58d44;border-radius:50%;transform:rotate(calc(-22deg + var(--sa-x)*12deg))}.sa-orbit span{font:8px/1.7 monospace;letter-spacing:1.4px;max-width:48px;text-align:center;color:var(--sa-muted)}.sa-side-note{position:absolute;right:5%;writing-mode:vertical-rl;font:8px monospace;letter-spacing:3px;color:var(--sa-muted)}
.sa-footer{position:relative;z-index:2;display:flex;justify-content:space-between;gap:24px;align-items:end;margin:0 32px;padding:26px 0 28px;border-top:1px solid #c2b58d33}.sa-copy h2{font:400 22px/1.2 Georgia,serif;letter-spacing:-.5px;margin:0 0 8px}.sa-copy p{font:12px/1.7 Arial,sans-serif;color:var(--sa-muted);margin:0;max-width:310px}.sa-cta{display:inline-flex;align-items:center;gap:28px;font:12px Arial,sans-serif;color:var(--sa-paper);border-bottom:1px solid #c2b58d66;padding:14px 0 7px;text-decoration:none;transform:translate(calc(var(--sa-x)*2px),calc(var(--sa-y)*1px));transition:color .4s cubic-bezier(.22,.8,.24,1)}.sa-cta:hover{color:#f3ce94}.sa-light{flex-shrink:0}.sa-light-label{display:block;font:8px monospace;letter-spacing:1.4px;color:var(--sa-muted);margin-bottom:8px}.sa-light>div{display:flex;gap:5px}.sa-light button{display:flex;align-items:center;justify-content:center;gap:7px;min-height:44px;padding:8px 12px;color:var(--sa-muted);background:transparent;border:1px solid transparent;border-radius:40px;font:11px Arial,sans-serif;cursor:pointer;transition:border-color .45s cubic-bezier(.22,.8,.24,1),background-color .45s cubic-bezier(.22,.8,.24,1),color .45s cubic-bezier(.22,.8,.24,1)}.sa-light button[aria-pressed=true]{color:var(--sa-paper);border-color:#c2b58d66;background:#c2b58d0c}.sa-light button:hover{border-color:#c2b58d99}.silk-aperture :is(button,a):focus-visible{outline:2px solid #ead0a3;outline-offset:4px}.sa-swatch{width:9px;height:9px;border-radius:50%}.sa-dawn{background:radial-gradient(circle at 25% 20%,#e9d5a8,#647e74)}.sa-dusk{background:radial-gradient(circle at 25% 20%,#e3b98d,#725e59)}
.sa-compact .sa-header{padding:15px 18px;font-size:8px;letter-spacing:1.5px}.sa-compact .sa-edition,.sa-compact .sa-footer,.sa-compact .sa-side-note,.sa-compact .sa-orbit{display:none}.sa-compact .sa-stage{height:200px}.sa-compact .sa-caption{margin-top:54px}.sa-compact .sa-caption>span:last-child{font-size:34px;letter-spacing:-1.5px;max-width:210px}.sa-compact .sa-caption>span:first-child{font-size:7px;letter-spacing:2px}.sa-compact .sa-art{width:320px}
@container(max-width:480px){.sa-header{padding:20px;font-size:8px}.sa-edition{display:none}.sa-stage{height:310px}.sa-caption>span:last-child{font-size:46px;max-width:280px}.sa-orbit{display:none}.sa-footer{margin:0 20px;flex-direction:column;align-items:start;gap:18px}.sa-copy h2{font-size:23px}.sa-copy p{font-size:13px}.sa-light-label{font-size:9px}.sa-caption{margin-top:85px}.sa-side-note{right:3%;font-size:7px}}
@media(prefers-reduced-motion:reduce){.silk-aperture *{transition:none!important;will-change:auto!important;transform:none!important}}
.silk-aperture svg :is(path,stop){transition:fill .85s cubic-bezier(.19,.82,.24,1),stop-color 1.1s cubic-bezier(.19,.82,.24,1)}
.sa-paused *{transition:none!important;will-change:auto!important;transform:none!important}
.sa-minimal .sa-stage{height:clamp(300px,52dvh,480px)}
.sa-minimal.sa-compact .sa-stage{height:100%;min-height:210px}
`;
