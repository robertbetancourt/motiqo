"use client";
import { useEffect, useId, useRef, useState, type PointerEvent } from "react";
import { createNativeGL } from "./native-gl";
import { effectRuntime } from "./effect-runtime";
export type VeilItem = { label: string; subtitle?: string; image?: string };
export type LiquidVeilProps = {
  items?: readonly VeilItem[];
  defaultOpen?: boolean;
  brandName?: string;
  onSelect?: (item: VeilItem) => void;
  paused?: boolean;
  compact?: boolean;
  className?: string;
};
const defaults = [
  {
    label: "Primitives",
    subtitle: "Objects for a different web",
    image: "/media/gallery/image-01.webp",
  },
  {
    label: "Shaders",
    subtitle: "Fragment & vertex experiments",
    image: "/media/gallery/image-03.webp",
  },
  {
    label: "Architecture",
    subtitle: "Design tokens & motion physics",
    image: "/media/gallery/image-05.webp",
  },
  {
    label: "Manifesto",
    subtitle: "Small details. Deep feeling.",
    image: "/media/gallery/image-07.webp",
  },
];
export const veilFragment = `uniform vec2 uResolution,uMouse,uVelocity;uniform float uTime,uOpenProgress,uDirection,uBlend;uniform sampler2D uImage,uPrevious;
float hash21(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
void main(){float bend=sin(vUv.x*3.14159265)*sin(uOpenProgress*3.14159265)*.26*uDirection;float threshold=1.-(uOpenProgress*1.25-bend);float mask=smoothstep(threshold-.015,threshold+.005,vUv.y);vec3 col=vec3(.025,.028,.042);float edge=exp(-abs(vUv.y-threshold)*170.);col+=edge*(.3+.7*cos(vec3(0.,2.,4.)+vUv.x*7.+uTime));vec2 p=(vUv-uMouse)*vec2(uResolution.x/uResolution.y,1.);p.x+=p.y*uVelocity.x*.25;p*=1.+dot(p,p)*length(uVelocity)*.7;vec2 uv=p/vec2(.25,.32)+.5;float box=step(0.,uv.x)*step(uv.x,1.)*step(0.,uv.y)*step(uv.y,1.);vec2 shift=uVelocity*.015;vec3 a=vec3(texture(uImage,uv+shift).r,texture(uImage,uv).g,texture(uImage,uv-shift).b),b=texture(uPrevious,uv).rgb;col=mix(col,mix(b,a,uBlend)*.63,box*smoothstep(.1,.8,uOpenProgress));col+=(hash21(gl_FragCoord.xy)-.5)*.016;fragColor=vec4(col*mask,mask);}`;
export default function LiquidVeil({
  items = defaults,
  defaultOpen = true,
  brandName = "",
  onSelect,
  paused = false,
  compact = false,
  className = "",
}: LiquidVeilProps) {
  const [open, setOpen] = useState(false),
    [selected, setSelected] = useState(0),
    [generation, restart] = useState(0),
    root = useRef<HTMLElement>(null),
    canvas = useRef<HTMLCanvasElement>(null),
    trigger = useRef<HTMLButtonElement>(null),
    autoTimer = useRef(0),
    clock = useRef<HTMLSpanElement>(null),
    coords = useRef<HTMLSpanElement>(null),
    wake = useRef(() => {}),
    input = useRef({ x: 0.76, y: 0.5, tx: 0, ty: 0 }),
    options = useRef({ open, selected, paused });
  options.current = { open, selected, paused };
  const id = useId(),
    links = items.slice(0, 6);
  useEffect(() => {
    setOpen(false);
    if (defaultOpen)
      autoTimer.current = window.setTimeout(() => setOpen(true), 800);
    return () => window.clearTimeout(autoTimer.current);
  }, [defaultOpen]);
  useEffect(() => wake.current(), [open, selected, paused]);
  useEffect(() => {
    const host = root.current!,
      surface = canvas.current!;
    let gpu: ReturnType<typeof createNativeGL> | undefined,
      runtime: ReturnType<typeof effectRuntime> | undefined,
      gone = false;
    const images: HTMLImageElement[] = [];
    try {
      gpu = createNativeGL(surface, true);
      const pass = gpu.pass(veilFragment),
        textures = links.map((item, i) => {
          const texture = gpu!.texture();
          gpu!.gl.bindTexture(gpu!.gl.TEXTURE_2D, texture);
          gpu!.gl.texImage2D(
            gpu!.gl.TEXTURE_2D,
            0,
            gpu!.gl.RGBA,
            1,
            1,
            0,
            gpu!.gl.RGBA,
            gpu!.gl.UNSIGNED_BYTE,
            new Uint8Array([30 + i * 30, 40, 60, 255]),
          );
          const image = new Image();
          image.crossOrigin = "anonymous";
          image.onload = () => {
            if (!gone) {
              try {
                gpu!.upload(texture, image);
                wake.current();
              } catch {
                /* Keep the initialized texture if a remote image denies canvas access. */
              }
            }
          };
          image.onerror = () => {};
          image.src = /^(https?:\/\/|\/(?!\/))/.test(item.image ?? "")
            ? item.image!
            : defaults[i % 4].image;
          images.push(image);
          return { texture };
        });
      let p = open ? 1 : 0,
        v = 0,
        x = 0.76,
        y = 0.5,
        lastX = x,
        lastY = y,
        old = 0,
        active = 0,
        blend = 1,
        mx = 0,
        my = 0,
        telemetry = 0;
      runtime = effectRuntime(
        host,
        surface,
        (time, dt) => {
          const target = options.current.open ? 1 : 0,
            direction = target > p ? 1 : -1;
          if (!dt) {
            p = target;
            v = 0;
          } else {
            for (let i = 0; i < 4; i++) {
              v += (((target - p) * 180 - v * 24) * dt) / 4;
              p += (v * dt) / 4;
            }
          }
          p = Math.max(0, Math.min(1, p));
          x += (input.current.x - x) * (dt ? 1 - Math.exp(-dt * 10) : 1);
          y += (input.current.y - y) * (dt ? 1 - Math.exp(-dt * 10) : 1);
          mx += (input.current.tx - mx) * (dt ? 1 - Math.exp(-dt * 15) : 1);
          my += (input.current.ty - my) * (dt ? 1 - Math.exp(-dt * 15) : 1);
          if (trigger.current)
            trigger.current.style.translate = `${mx}px ${my}px`;
          if (active !== options.current.selected) {
            old = active;
            active = options.current.selected;
            blend = 0;
          }
          blend += (1 - blend) * (dt ? 1 - Math.exp(-dt * 8) : 1);
          const texture = textures[active % textures.length],
            previous = textures[old % textures.length];
          if (texture)
            gpu!.draw(pass, null, {
              uResolution: [host.clientWidth, host.clientHeight],
              uTime: time,
              uOpenProgress: p,
              uDirection: direction,
              uMouse: [x, 1 - y],
              uVelocity: [dt ? (x - lastX) * 50 : 0, dt ? (lastY - y) * 50 : 0],
              uImage: texture,
              uPrevious: previous,
              uBlend: blend,
            });
          lastX = x;
          lastY = y;
          host.dataset.gl = "on";
          host.style.setProperty("--lv-progress", String(p));
          if (time - telemetry > 0.1) {
            telemetry = time;
            if (clock.current)
              clock.current.textContent =
                new Date().toISOString().slice(11, 23) + " UTC";
            if (coords.current)
              coords.current.textContent = `X ${x.toFixed(2)} / Y ${y.toFixed(2)}`;
          }
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
      gone = true;
      for (const image of images) {
        image.onload = image.onerror = null;
        image.src = "";
      }
      surface.removeEventListener("webglcontextlost", lost);
      surface.removeEventListener("webglcontextrestored", restore);
      runtime?.dispose();
      gpu?.dispose();
      wake.current = () => {};
    };
  }, [items, compact, generation]);
  function close() {
    window.clearTimeout(autoTimer.current);
    setOpen(false);
    trigger.current?.focus();
  }
  function move(e: PointerEvent) {
    const r = e.currentTarget.getBoundingClientRect();
    const tr = trigger.current!.getBoundingClientRect(),
      dx = e.clientX - tr.left - tr.width / 2,
      dy = e.clientY - tr.top - tr.height / 2;
    const near = Math.abs(dx) < tr.width && Math.abs(dy) < 48;
    input.current = {
      x: Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)),
      y: Math.max(0, Math.min(1, (e.clientY - r.top) / r.height)),
      tx: near ? Math.max(-8, Math.min(8, dx * 0.15)) : 0,
      ty: near ? Math.max(-8, Math.min(8, dy * 0.15)) : 0,
    };
    wake.current();
  }
  return (
    <section
      ref={root}
      className={`liquid-veil ${className}`}
      data-open={open}
      data-compact={compact || undefined}
      data-paused={paused || undefined}
      onPointerMove={move}
      onPointerLeave={() => {
        input.current.tx = input.current.ty = 0;
        wake.current();
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          close();
        }
      }}
    >
      <style>{styles}</style>
      <canvas ref={canvas} aria-hidden="true" />
      <header>
        <span>
          {brandName || "+"}
          <small>SYS / 026</small>
        </span>
        <span className="lv-telemetry">
          <span ref={clock}>UTC</span>
          <span ref={coords}>X .76 / Y .50</span>
        </span>
        <button
          ref={trigger}
          className="lv-trigger"
          aria-expanded={open}
          aria-controls={id}
          onClick={() => {
            window.clearTimeout(autoTimer.current);
            setOpen((v) => !v);
          }}
        >
          <span>{open ? "CLOSE" : "INDEX"}</span>
          <i aria-hidden="true">
            <b />
            <b />
          </i>
        </button>
      </header>
      <div className="lv-base" aria-hidden={open}>
        <span>AN INDEX OF POSSIBILITIES.</span>
        <h2>
          The space
          <br />
          <em>between things.</em>
        </h2>
        <span>Objects / Shaders / Experiments</span>
      </div>
      <nav
        id={id}
        aria-label="Liquid index"
        className="lv-index"
        inert={!open}
        aria-hidden={!open}
      >
        {links.map((item, i) => (
          <button
            key={item.label + i}
            data-active={selected === i}
            onPointerEnter={() => setSelected(i)}
            onFocus={() => setSelected(i)}
            onClick={() => {
              onSelect?.(item);
              close();
            }}
          >
            <small>0{i + 1}</small>
            <span>
              {item.label}
              <em>{item.subtitle}</em>
            </span>
            <b aria-hidden="true">↗</b>
          </button>
        ))}
        <footer>
          <span>DESIGNED TO BE FELT.</span>
          <span>Scroll less. Look closer.</span>
        </footer>
      </nav>
    </section>
  );
}
const styles = `.liquid-veil{position:relative;isolation:isolate;width:100%;height:100%;min-height:300px;overflow:hidden;background:#05060a;color:#f1f0ea;font-family:'Urbanist Variable',Urbanist,Arial,sans-serif;container-type:inline-size}.liquid-veil>canvas{position:absolute;inset:0;width:100%;height:100%;z-index:1;pointer-events:none}.liquid-veil header{position:relative;z-index:4;display:flex;align-items:center;justify-content:space-between;height:80px;margin:0 35px;border-bottom:1px solid #ffffff20;font:11px ui-monospace,monospace}.liquid-veil header>span:first-child{display:flex;align-items:center;gap:20px}.liquid-veil header small{font-size:9px;opacity:.4}.lv-telemetry{display:flex;gap:20px;font-size:8px;opacity:.5}.lv-trigger{display:flex;align-items:center;gap:20px;border:0;background:none;color:inherit;font:10px ui-monospace,monospace;letter-spacing:.2em;min-height:44px;cursor:pointer}.lv-trigger i{position:relative;width:28px;height:24px}.lv-trigger b{position:absolute;top:8px;right:0;width:28px;height:1px;background:currentColor;transition:transform .5s,width .5s}.lv-trigger b+b{width:16px;top:15px}.liquid-veil[data-open=true] .lv-trigger b{transform:translateY(3.5px) rotate(45deg)}.liquid-veil[data-open=true] .lv-trigger b+b{width:28px;transform:translateY(-3.5px) rotate(-45deg)}.lv-base{padding:60px 8%;position:relative}.lv-base>span{font:8px ui-monospace,monospace;letter-spacing:.15em;opacity:.4}.lv-base h2{font-size:clamp(32px,7cqw,85px);font-weight:350;line-height:1;letter-spacing:-.04em}.lv-base h2 em{font-family:Georgia,serif;font-weight:400}.lv-index{position:absolute;z-index:3;inset:100px 6% 28px;display:flex;flex-direction:column;justify-content:center;transition:opacity .35s,transform .6s;opacity:0;transform:translateY(20px);pointer-events:none}.liquid-veil[data-open=true] .lv-index{opacity:1;transform:none;pointer-events:auto}.lv-index button{display:flex;align-items:baseline;gap:25px;padding:17px 0;border:0;background:none;text-align:left;color:#f1f0ea;font-family:inherit;cursor:pointer;border-bottom:1px solid #ffffff15;transition:opacity .35s}.lv-index button small{font:9px ui-monospace,monospace;opacity:.4}.lv-index button>span{font:400 clamp(30px,7cqw,80px)/.95 Georgia,serif;letter-spacing:-.04em;transition:transform .5s}.lv-index button em{display:block;font:8px ui-monospace,monospace;letter-spacing:.02em;margin-top:12px;opacity:.5}.lv-index button b{font-size:24px;font-weight:300;margin-left:auto}.lv-index:has(button:hover) button:not(:hover){opacity:.25}.lv-index button:hover>span,.lv-index button:focus-visible>span{transform:translateX(20px);font-style:italic}.lv-index footer{display:flex;justify-content:space-between;gap:10px;margin-top:30px;font:8px ui-monospace,monospace;opacity:.5}.liquid-veil button:focus-visible{outline:1px solid #a0d6ed;outline-offset:5px}.liquid-veil[data-gl=off][data-open=true]{background:#08090e}.liquid-veil[data-open=true] .lv-base{visibility:hidden}.liquid-veil[data-compact] header{height:50px;margin:0 18px}.liquid-veil[data-compact] .lv-telemetry{display:none}.liquid-veil[data-compact] .lv-index{inset:60px 20px 16px}.liquid-veil[data-compact] .lv-index button{padding:10px 0;gap:15px}.liquid-veil[data-compact] .lv-index button>span{font-size:30px}.liquid-veil[data-compact] .lv-index em{font-size:6px;margin-top:5px}.liquid-veil[data-compact] .lv-index footer{margin-top:16px;font-size:6px}@container(max-width:600px){.lv-telemetry{display:none}.liquid-veil header{margin:0 20px}.lv-index{inset:90px 20px 20px}.lv-index button{gap:16px}.lv-index button>span{font-size:36px}}.liquid-veil[data-paused] *{transition:none!important}@media(prefers-reduced-motion:reduce){.liquid-veil *{transition:none!important}}`;
