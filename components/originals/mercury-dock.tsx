"use client";
import {
  useEffect,
  useRef,
  useState,
  type PointerEvent,
  type CSSProperties,
} from "react";
import { createNativeGL, nativeColor } from "./native-gl";
import { effectRuntime } from "./effect-runtime";
export type MercuryDockProps = {
  items?: readonly string[];
  accentColor?: string;
  onSelect?: (label: string) => void;
  onAction?: () => void;
  paused?: boolean;
  compact?: boolean;
  className?: string;
};
const defaults = ["Primitives", "Shaders", "Engines", "Lab"];
export const mercuryFragment = `uniform vec2 uResolution,uOrb,uCursor;uniform vec4 uMainRect;uniform float uTime,uBlob,uPulse;uniform vec3 uTint;
float box(vec2 p,vec2 b,float r){vec2 q=abs(p)-b+r;return length(max(q,0.))+min(max(q.x,q.y),0.)-r;}
float smin(float a,float b,float k){float h=max(k-abs(a-b),0.)/k;return min(a,b)-h*h*k*.25;}
float field(vec2 p){float body=box(p-uMainRect.xy,uMainRect.zw,28.),orb=length(p-uOrb)-28.;float d=smin(body,orb,44.+uPulse*12.);if(uBlob>.01)d=smin(d,length(p-uCursor)-uBlob,24.);return d;}
void main(){vec2 p=vec2(vUv.x,1.-vUv.y)*uResolution;float d=field(p),aa=max(fwidth(d),.7),cover=1.-smoothstep(-aa,aa,d);if(d>5.){fragColor=vec4(0.);return;}vec2 grad=normalize(vec2(field(p+vec2(.5,0))-field(p-vec2(.5,0)),field(p+vec2(0,.5))-field(p-vec2(0,.5)))+vec2(.0001));float rim=exp(-abs(d)*.19);float contour=.5+.5*sin(p.y*.09+grad.x*5.+uTime*.3);vec3 col=mix(vec3(.08,.10,.12),uTint*.6,contour*.6);col+=pow(max(0.,dot(grad,normalize(vec2(-.5,-1.)))),8.)*rim*1.3;col+=rim*.21;col+=uTint*exp(-pow((d+4.)/2.,2.))*.25;fragColor=vec4(col,cover);}`;
export default function MercuryDock({
  items = defaults,
  accentColor = "#becde0",
  onSelect,
  onAction,
  paused = false,
  compact = false,
  className = "",
}: MercuryDockProps) {
  const [selected, setSelected] = useState(0),
    [access, setAccess] = useState(false),
    [generation, restart] = useState(0),
    root = useRef<HTMLElement>(null),
    canvas = useRef<HTMLCanvasElement>(null),
    wake = useRef(() => {}),
    input = useRef({ x: -1000, y: -1000, active: false }),
    options = useRef({ paused, access, accentColor });
  options.current = { paused, access, accentColor };
  const links = items.slice(0, 4);
  useEffect(() => wake.current(), [paused, access, accentColor]);
  useEffect(() => {
    const host = root.current!,
      surface = canvas.current!;
    let gpu: ReturnType<typeof createNativeGL> | undefined,
      runtime: ReturnType<typeof effectRuntime> | undefined;
    try {
      gpu = createNativeGL(surface, true);
      const pass = gpu.pass(mercuryFragment);
      let orbX = 0,
        orbY = 0,
        vx = 0,
        vy = 0,
        blobX = 0,
        blobY = 0,
        mainOffset = 0;
      runtime = effectRuntime(
        host,
        surface,
        (time, dt) => {
          const w = host.clientWidth,
            h = host.clientHeight,
            frame = Math.min(w - 30, 760),
            body = frame - 82,
            left = (w - frame) / 2,
            y = h * 0.28,
            rest = left + body + 46,
            targetX =
              rest -
              (options.current.access ? 25 : input.current.active ? 14 : 0),
            targetY = y + Math.sin(time * 0.7) * 3;
          if (!orbX || !dt) {
            orbX = targetX;
            orbY = targetY;
            vx = vy = 0;
          } else
            for (let i = 0; i < 4; i++) {
              const s = dt / 4;
              vx += ((targetX - orbX) * 180 - vx * 14) * s;
              vy += ((targetY - orbY) * 180 - vy * 14) * s;
              orbX += vx * s;
              orbY += vy * s;
            }
          const p = input.current,
            nearestX = Math.max(left, Math.min(left + body, p.x)),
            near = input.current.active
              ? Math.max(0, 1 - Math.hypot(p.x - nearestX, p.y - y) / 85)
              : 0;
          blobX += (p.x - blobX) * (dt ? 1 - Math.exp(-dt * 15) : 1);
          blobY += (p.y - blobY) * (dt ? 1 - Math.exp(-dt * 15) : 1);
          mainOffset +=
            ((p.active ? (p.x - w / 2) * 0.014 : 0) - mainOffset) *
            (dt ? 1 - Math.exp(-dt * 8) : 1);
          gpu!.draw(pass, null, {
            uResolution: [w, h],
            uTime: time,
            uMainRect: [
              left + body / 2 + mainOffset,
              y,
              body / 2,
              w < 360 ? 46 : 31,
            ],
            uOrb: [orbX, orbY],
            uCursor: [blobX, blobY],
            uBlob: near * 15,
            uPulse: options.current.access ? 1 : 0,
            uTint: nativeColor(options.current.accentColor, "#becde0"),
          });
          host.style.setProperty("--md-left", left + mainOffset + "px");
          host.style.setProperty("--md-width", body + "px");
          host.style.setProperty("--md-y", y + "px");
          host.style.setProperty("--md-orb", orbX + "px");
          host.dataset.gl = "on";
        },
        () => options.current.paused,
        undefined,
        compact,
      );
      wake.current = runtime.invalidate;
    } catch {
      host.dataset.gl = "off";
      host.dataset.ready = "true";
      runtime?.dispose();
      gpu?.dispose();
    }
    const lost = (e: Event) => {
        e.preventDefault();
        runtime?.dispose();
        host.dataset.gl = "off";
      },
      restore = () => restart((v) => v + 1);
    surface.addEventListener("webglcontextlost", lost);
    surface.addEventListener("webglcontextrestored", restore);
    return () => {
      surface.removeEventListener("webglcontextlost", lost);
      surface.removeEventListener("webglcontextrestored", restore);
      runtime?.dispose();
      gpu?.dispose();
      wake.current = () => {};
    };
  }, [compact, generation]);
  function move(e: PointerEvent) {
    const r = e.currentTarget.getBoundingClientRect();
    input.current = {
      x: e.clientX - r.left,
      y: e.clientY - r.top,
      active: true,
    };
    wake.current();
  }
  return (
    <section
      ref={root}
      className={`mercury-dock ${className}`}
      data-access={access}
      data-compact={compact || undefined}
      data-paused={paused || undefined}
      onPointerMove={move}
      onPointerLeave={() => {
        input.current.active = false;
        wake.current();
      }}
      style={{ "--md-tint": accentColor } as CSSProperties}
      onKeyDown={(e) => {
        if (e.key === "Escape") setAccess(false);
      }}
    >
      <style>{styles}</style>
      <canvas ref={canvas} aria-hidden="true" />
      <nav className="md-links" aria-label="Mercury destinations">
        {links.map((label, i) => (
          <button
            key={label + i}
            aria-label={label}
            aria-current={selected === i ? "page" : undefined}
            onClick={() => {
              setSelected(i);
              onSelect?.(label);
            }}
          >
            {label}
          </button>
        ))}
      </nav>
      <button
        className="md-action"
        aria-label="Get access"
        aria-expanded={access}
        onClick={() => {
          setAccess((v) => !v);
          onAction?.();
        }}
      >
        <span aria-hidden="true">↗</span>
      </button>
      <div className="md-caption">
        <small>SURFACE TENSION / LIQUID INDEX</small>
        <h2>
          Nothing
          <br />
          <em>stands still.</em>
        </h2>
        <span>{links[selected] ?? "An open field"}</span>
      </div>
      {access && (
        <div className="md-access" role="status">
          A new point of departure.
          <br />
          <small>Your next destination is ready.</small>
        </div>
      )}
    </section>
  );
}
const styles = `.mercury-dock{position:relative;isolation:isolate;width:100%;height:100%;min-height:300px;overflow:hidden;background:radial-gradient(ellipse at 48% 30%,#28303855,transparent 50%),#080a0d;color:#f3f3ef;font-family:'Urbanist Variable',Urbanist,Arial,sans-serif;container-type:inline-size;--md-left:5%;--md-width:70%;--md-y:28%;--md-orb:90%}.mercury-dock>canvas{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}.md-links{position:absolute;left:var(--md-left);width:var(--md-width);top:calc(var(--md-y) - 31px);height:62px;display:flex;align-items:stretch;padding:0 10px;z-index:2}.md-links button{flex:1;min-width:0;border:0;background:none;color:#e3e7ed;font:500 clamp(9px,1.5cqw,14px) 'Urbanist Variable',Urbanist,Arial;cursor:pointer;padding:0 4px;transition:color .3s}.md-links button[aria-current=page]{color:#fff;text-shadow:0 0 14px #fff8}.md-links button[aria-current=page]:after{content:'·';display:block;height:0;transform:translateY(-10px);font-size:20px}.md-action{position:absolute;z-index:2;left:calc(var(--md-orb) - 28px);top:calc(var(--md-y) - 28px);width:56px;height:56px;background:none;border:0;color:#fff;font-size:25px;cursor:pointer}.md-action:active{transform:scale(.97)}.md-caption{position:absolute;left:9%;top:48%;pointer-events:none}.md-caption small{font:8px ui-monospace,monospace;letter-spacing:.12em;opacity:.4}.md-caption h2{font-size:clamp(40px,6.5cqw,80px);font-weight:350;letter-spacing:-.04em;line-height:.95;margin:22px 0}.md-caption h2 em{font-family:Georgia,serif;font-weight:400}.md-caption>span{font:10px ui-monospace,monospace;opacity:.45}.md-access{position:absolute;right:7%;bottom:16%;font-size:14px;line-height:1.6;border-top:1px solid #ffffff30;padding-top:15px}.md-access small{font-size:9px;opacity:.5}.mercury-dock button:focus-visible{outline:2px solid #c1d6ee;outline-offset:-6px}.mercury-dock[data-gl=off] .md-links{background:#343940}.mercury-dock[data-gl=off] .md-action{background:#343940}.mercury-dock[data-compact] .md-caption h2{font-size:43px;margin:14px 0}.mercury-dock[data-compact] .md-caption small{font-size:6px}.mercury-dock[data-compact] .md-access{font-size:10px;bottom:8%}.mercury-dock[data-compact] .md-access small{display:none}@container(max-width:360px){.md-links{display:grid;grid-template-columns:repeat(2,1fr);top:calc(var(--md-y) - 46px);height:92px;padding:0 6px}.md-links button{font-size:11px;padding:0 2px}.md-links button[aria-current=page]:after{display:none}}.mercury-dock[data-paused] *{transition:none!important}@media(prefers-reduced-motion:reduce){.mercury-dock *{transition:none!important}}`;
