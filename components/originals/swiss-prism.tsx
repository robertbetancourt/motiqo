"use client";
import {
  useId,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent,
} from "react";
import { useKineticCanvas } from "./kinetic-canvas";
export type SwissItem = {
  label: string;
  meta?: string;
  entries?: readonly string[];
};
export type SwissPrismProps = {
  items?: readonly SwissItem[];
  accentColor?: string;
  showTelemetryTicker?: boolean;
  onSelect?: (label: string) => void;
  onLaunch?: () => void;
  paused?: boolean;
  compact?: boolean;
  className?: string;
};
const defaults = [
  {
    label: "Primitives",
    meta: "OBJECT LIBRARY",
    entries: ["Liquid surfaces", "Kinetic type", "Spatial objects"],
  },
  {
    label: "Shaders",
    meta: "WEBGL2",
    entries: ["Refraction studies", "Chromatic fields", "Signed distances"],
  },
  {
    label: "Archive",
    meta: "2026.Q4",
    entries: ["Edition one", "Motion experiments", "Field recordings"],
  },
];
export function entryDirection(x: number, y: number, w: number, h: number) {
  const angle = Math.atan2(
    (y - h / 2) / Math.max(1, h),
    (x - w / 2) / Math.max(1, w),
  );
  return Math.abs(angle) < Math.PI / 4
    ? "right"
    : Math.abs(angle) > Math.PI * 0.75
      ? "left"
      : angle > 0
        ? "bottom"
        : "top";
}
export default function SwissPrism({
  items = defaults,
  accentColor = "#f4f4f0",
  showTelemetryTicker = true,
  onSelect,
  onLaunch,
  paused = false,
  compact = false,
  className = "",
}: SwissPrismProps) {
  const [active, setActive] = useState<number | null>(0),
    [hot, setHot] = useState(-1),
    pointer = useRef({ x: 0.7, y: 0.6, v: 0, last: 0 }),
    ticker = useRef<HTMLDivElement>(null),
    readout = useRef<HTMLSpanElement>(null),
    measure = useRef({ start: 0, frames: 0 }),
    id = useId(),
    links = items.slice(0, 3),
    safe = /^#[\da-f]{6}$/i.test(accentColor) ? accentColor : "#f4f4f0";
  const { host, canvas, invalidate } = useKineticCanvas(
    ({ g, w, h, time, dt, still }) => {
      const p = pointer.current;
      p.v *= Math.exp(-dt * 6);
      g.clearRect(0, 0, w, h);
      g.strokeStyle = safe;
      g.lineWidth = 0.8;
      const ow = Math.min(62, w * 0.13);
      g.beginPath();
      for (let i = 0; i <= ow; i++) {
        const y =
          52 +
          Math.sin(i * 0.17 - time * (3 + Math.abs(p.v) * 0.02)) * 5 +
          Math.sin(i * 0.31 + time) * 2;
        i ? g.lineTo(18 + i, y) : g.moveTo(18 + i, y);
      }
      g.stroke();
      if (active !== null) {
        const left = w < 600 ? 0 : w * 0.32,
          top = w < 600 ? 180 : 116,
          gw = w - left,
          gh = Math.min(270, h - top - 35);
        g.save();
        g.beginPath();
        g.rect(left, top, gw, Math.max(0, gh));
        g.clip();
        for (let row = 0; row < 32; row++) {
          g.beginPath();
          for (let i = 0; i <= 100; i++) {
            const x = left + (gw * i) / 100,
              base = top + (gh * row) / 31,
              dist = Math.hypot(x / w - p.x, base / h - p.y),
              wave = Math.sin(
                i * 0.09 + row * 0.2 + time * (0.4 + (active ?? 0) * 0.15),
              ),
              y =
                base +
                wave *
                  (10 + 35 * Math.exp(-dist * dist * 8)) *
                  (active === 2 ? 0.5 : 1),
              skew = active === 1 ? Math.sin(row * 0.13 + time) * 30 : 0;
            i ? g.lineTo(x + skew, y) : g.moveTo(x + skew, y);
          }
          g.globalAlpha = 0.13 + (row / 31) * 0.35;
          g.stroke();
        }
        g.restore();
      }
      if (ticker.current)
        ticker.current.style.transform = `translateX(${-((time * (12 + Math.abs(p.v) * 0.1)) % 420)}px) skewX(${Math.max(-8, Math.min(8, p.v * 0.015))}deg)`;
      if (!still) {
        const now = performance.now();
        if (!measure.current.start) measure.current.start = now;
        measure.current.frames++;
        if (now - measure.current.start > 800) {
          if (readout.current)
            readout.current.textContent = `${Math.round((measure.current.frames * 1000) / (now - measure.current.start))} FPS / X ${p.x.toFixed(2)} Y ${p.y.toFixed(2)}`;
          measure.current = { start: now, frames: 0 };
        }
      } else if (readout.current) readout.current.textContent = "STATIC FIELD";
    },
    paused,
    compact,
  );
  function hover(
    e: PointerEvent<HTMLButtonElement>,
    i: number,
    enter: boolean,
  ) {
    const r = e.currentTarget.getBoundingClientRect();
    e.currentTarget.dataset.direction = entryDirection(
      e.clientX - r.left,
      e.clientY - r.top,
      r.width,
      r.height,
    );
    setHot(enter ? i : -1);
    if (enter) setActive(i);
  }
  return (
    <section
      ref={host}
      className={`swiss-prism ${className}`}
      data-compact={compact || undefined}
      data-paused={paused || undefined}
      style={{ "--sp-accent": safe } as CSSProperties}
      onPointerMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect(),
          x = (e.clientX - r.left) / r.width;
        pointer.current.v = (x - pointer.current.x) * r.width;
        pointer.current.x = x;
        pointer.current.y = (e.clientY - r.top) / r.height;
        invalidate();
      }}
      onKeyDown={(e) => {
        if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
          e.preventDefault();
          onLaunch?.();
        }
        if (e.key === "Escape") {
          setActive(null);
          setHot(-1);
        }
      }}
    >
      <style>{styles}</style>
      <canvas ref={canvas} aria-hidden="true" />
      <nav className="sp-grid" aria-label="Swiss destinations">
        <div className="sp-core">
          <small>[00 // CORE]</small>
          <span>
            +<i />
          </span>
        </div>
        {links.map((item, i) => (
          <button
            key={item.label + i}
            className="sp-cell"
            data-hot={hot === i}
            aria-expanded={active === i}
            aria-controls={id}
            onPointerEnter={(e) => hover(e, i, true)}
            onPointerLeave={(e) => hover(e, i, false)}
            onFocus={() => {
              setHot(i);
              setActive(i);
            }}
            onBlur={() => setHot(-1)}
            onClick={() => setActive((v) => (v === i ? null : i))}
            aria-label={item.label}
          >
            <i className="sp-wipe" aria-hidden="true" />
            <small>
              [0{i + 1}] / {item.meta}
            </small>
            <span className="sp-drum" aria-hidden="true">
              {Array.from(item.label.toUpperCase()).map((c, j) => (
                <span
                  className="sp-char"
                  key={j}
                  style={{ transitionDelay: `${j * 22}ms` }}
                >
                  <b>{c}</b>
                  <em>{c}</em>
                </span>
              ))}
            </span>
            <span className="sp-registration" aria-hidden="true">
              +
            </span>
          </button>
        ))}
        <button
          className="sp-launch"
          aria-keyshortcuts="Meta+K Control+K"
          onClick={() => onLaunch?.()}
        >
          <small>[04 // ACCESS]</small>
          <span>LAUNCH STUDIO ↗</span>
          <small>⌘ + K</small>
        </button>
      </nav>
      {showTelemetryTicker && (
        <div className="sp-ticker" aria-hidden="true">
          <div ref={ticker}>
            {Array.from({ length: 5 }, (_, i) => (
              <span key={i}>
                FORM FOLLOWS FEELING + TYPE IN MOTION + MATTER / LIGHT /
                FREQUENCY +{" "}
              </span>
            ))}
          </div>
        </div>
      )}
      <div
        id={id}
        className="sp-drawer"
        data-open={active !== null}
        inert={active === null}
        aria-hidden={active === null}
      >
        <div className="sp-subindex">
          <small>
            0{(active ?? 0) + 1} / {links[active ?? 0]?.label}
          </small>
          {(links[active ?? 0]?.entries ?? []).map((label, i) => (
            <button key={label + i} onClick={() => onSelect?.(label)}>
              <small>0{i + 1}</small>
              <span>{label}</span>
              <b aria-hidden="true">↗</b>
            </button>
          ))}
          <button className="sp-close" onClick={() => setActive(null)}>
            Close index −
          </button>
        </div>
        <div className="sp-field-label">
          <span>FIELD / 0{(active ?? 0) + 1}</span>
          <span ref={readout}>FIELD INITIALIZING</span>
        </div>
      </div>
      <div className="sp-bottom" aria-hidden="true">
        <span>
          STRUCTURE.
          <br />
          <em>THEN SURPRISE.</em>
        </span>
        <small>
          A PRACTICE IN PRECISE
          <br />
          AND UNEXPECTED MOTION.
        </small>
      </div>
    </section>
  );
}
const styles = `.swiss-prism{position:relative;isolation:isolate;width:100%;height:100%;min-height:300px;overflow:hidden;background:#050608;color:#f4f4f0;font-family:'Urbanist Variable',Urbanist,Arial,sans-serif;container-type:inline-size}.swiss-prism>canvas{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}.sp-grid{display:grid;grid-template-columns:1.2fr repeat(3,1fr) 1.4fr;position:relative;z-index:2;border-bottom:1px solid #ffffff28;min-height:90px}.sp-grid>*{border:0;border-right:1px solid #ffffff28;background:none;min-width:0;padding:16px 15px;color:inherit;position:relative}.sp-grid small,.sp-subindex>small{font:7px ui-monospace,monospace;letter-spacing:.03em;opacity:.5;display:block}.sp-core>span{display:block;margin-top:8px;font-size:22px;text-align:right}.sp-cell{text-align:left;cursor:pointer;overflow:hidden;perspective:600px}.sp-cell>small{position:relative;z-index:1}.sp-wipe{position:absolute;inset:0;background:var(--sp-accent);transform:translateY(-101%);transition:transform .45s cubic-bezier(.22,1,.36,1)}.sp-cell[data-direction=bottom] .sp-wipe{transform:translateY(101%)}.sp-cell[data-direction=left] .sp-wipe{transform:translateX(-101%)}.sp-cell[data-direction=right] .sp-wipe{transform:translateX(101%)}.sp-cell[data-hot=true] .sp-wipe{transform:translate(0)}.sp-cell[data-hot=true]{color:#050608}.sp-drum{display:flex;position:relative;height:20px;margin-top:13px;font-size:12px;line-height:20px;font-weight:600;letter-spacing:-.025em}.sp-char{position:relative;display:block;width:.68em;height:20px;transform-style:preserve-3d;transition:transform .55s cubic-bezier(.22,1,.36,1)}.sp-char b,.sp-char em{position:absolute;inset:0;backface-visibility:hidden;font:inherit}.sp-char b{transform:rotateX(0) translateZ(10px)}.sp-char em{transform:rotateX(-90deg) translateZ(10px);font-family:Georgia,serif;font-style:italic}.sp-cell[data-hot=true] .sp-char{transform:rotateX(90deg)}.sp-registration{position:absolute;right:-3px;bottom:-8px;font:14px ui-monospace,monospace;z-index:3;transition:transform .5s}.sp-cell[data-hot=true] .sp-registration{transform:rotate(90deg)}.sp-launch{display:flex;flex-direction:column;gap:8px;cursor:pointer;text-align:left}.sp-launch>span{font-size:11px}.sp-ticker{position:relative;z-index:2;border-bottom:1px solid #ffffff20;overflow:hidden;height:28px;background:#050608;font:7px/28px ui-monospace,monospace;letter-spacing:.13em;color:#92949c}.sp-ticker>div{white-space:nowrap;will-change:transform}.sp-drawer{position:relative;z-index:1;display:grid;grid-template-columns:32% 1fr;min-height:270px;border-bottom:1px solid #ffffff25;transition:opacity .3s,transform .5s;opacity:1}.sp-drawer[data-open=false]{opacity:0;transform:translateY(-15px);pointer-events:none}.sp-subindex{padding:25px 22px;border-right:1px solid #ffffff25;background:#07080cee}.sp-subindex>small{margin-bottom:25px}.sp-subindex button{display:flex;align-items:center;gap:12px;width:100%;padding:12px 0;color:inherit;border:0;border-bottom:1px solid #ffffff15;background:none;text-align:left;cursor:pointer;font:12px 'Urbanist Variable',Urbanist,Arial}.sp-subindex button small{font:8px ui-monospace,monospace;opacity:.4}.sp-subindex button b{margin-left:auto;font-weight:400}.sp-subindex .sp-close{font-size:9px;margin-top:12px;opacity:.5}.sp-field-label{padding:14px;display:flex;justify-content:space-between;gap:8px;align-items:flex-end;pointer-events:none;font:7px ui-monospace,monospace;letter-spacing:.04em;color:#888d9b}.sp-bottom{padding:30px 25px;display:flex;justify-content:space-between;gap:20px;pointer-events:none}.sp-bottom>span{font-size:clamp(22px,5cqw,60px);font-weight:500;letter-spacing:-.045em;line-height:.95}.sp-bottom em{font-family:Georgia,serif;font-weight:400}.sp-bottom small{font:7px/1.6 ui-monospace,monospace;opacity:.4}.swiss-prism button:focus-visible{outline:2px solid #b9c8ed;outline-offset:-4px}.swiss-prism[data-compact] .sp-core,.swiss-prism[data-compact] .sp-launch{display:none}.swiss-prism[data-compact] .sp-grid{grid-template-columns:repeat(3,1fr);min-height:64px}.swiss-prism[data-compact] .sp-grid>*{padding:12px 10px}.swiss-prism[data-compact] .sp-drum{font-size:11px;margin-top:10px}.swiss-prism[data-compact] .sp-grid small{font-size:5px}.swiss-prism[data-compact] .sp-drawer{min-height:180px;grid-template-columns:40% 1fr}.swiss-prism[data-compact] .sp-subindex{padding:15px 12px}.swiss-prism[data-compact] .sp-subindex>small{font-size:6px;margin-bottom:12px}.swiss-prism[data-compact] .sp-subindex button{font-size:9px;padding:9px 0;gap:6px}.swiss-prism[data-compact] .sp-field-label{font-size:5px}.swiss-prism[data-compact] .sp-bottom{display:none}@container(max-width:600px){.sp-core{display:none}.sp-grid{grid-template-columns:repeat(3,1fr);min-height:76px}.sp-launch{grid-column:span 3;flex-direction:row;align-items:center;justify-content:space-between;min-height:44px;border-top:1px solid #ffffff25}.sp-grid>*{padding:12px 10px}.sp-drum{font-size:11px}.sp-grid small{font-size:6px}.sp-drawer{grid-template-columns:1fr;min-height:320px}.sp-subindex{display:flex;flex-wrap:wrap;gap:0 12px;align-content:flex-start;border-bottom:1px solid #ffffff20;border-right:0;padding:14px}.sp-subindex>small{width:100%;margin-bottom:8px}.sp-subindex button{width:auto;font-size:10px;padding:9px 0}.sp-subindex .sp-close{margin-top:0}.sp-field-label{min-height:130px}.sp-bottom small{display:none}}.sp-char{width:auto}.sp-char b{position:relative;display:block}.swiss-prism[data-paused] *{transition:none!important;will-change:auto!important}@media(prefers-reduced-motion:reduce){.swiss-prism *{transition:none!important;will-change:auto!important}}`;
