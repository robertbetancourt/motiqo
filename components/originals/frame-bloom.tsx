"use client";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import * as THREE from "three";
import { effectRuntime } from "./effect-runtime";
import { railClamp, railImageSource, railWrap } from "./liquid-rail-motion";
export type FrameBloomProps = {
  items?: { src: string; title?: string }[];
  autoPlay?: boolean;
  interval?: number;
  duration?: number;
  insetScale?: number;
  theme?: "auto" | "light" | "dark";
  paused?: boolean;
  compact?: boolean;
  style?: CSSProperties;
  className?: string;
  onIndexChange?: (index: number) => void;
};
const artwork = [
  { src: "/media/gallery/image-18.webp", title: "Solstice" },
  { src: "/media/gallery/image-01.webp", title: "Chromatic" },
  { src: "/media/gallery/image-11.webp", title: "Florilegium" },
  { src: "/media/gallery/image-05.webp", title: "Stillwater" },
  { src: "/media/gallery/image-16.webp", title: "Tidal" },
  { src: "/media/gallery/image-03.webp", title: "Afterlight" },
];
export const bloomEase = (p: number) => {
  p = railClamp(p, 0, 1, 0);
  return p * p * p * (p * (p * 6 - 15) + 10);
};
const vertex = `varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;
const fragment = `varying vec2 vUv;uniform sampler2D uBase;uniform sampler2D uNext;uniform vec2 uCoverA;uniform vec2 uCoverB;uniform float uProgress;uniform float uInset;uniform float uReveal;uniform vec2 uPointer;
void main(){float p=uProgress;float e=p*p*p*(p*(p*6.-15.)+10.);vec2 size=mix(vec2(uInset),vec2(1.),e);vec2 inner=(vUv-.5)/size+.5;vec2 drift=uPointer*.012*(1.-e);vec2 a=(vUv-.5)*uCoverA*(1.-e*.06)+.5+drift;vec2 b=(inner-.5)*uCoverB+.5;vec3 base=texture2D(uBase,clamp(a,.001,.999)).rgb;vec3 next=texture2D(uNext,clamp(b,.001,.999)).rgb;vec2 dist=abs(vUv-.5)-size*.5;float mask=1.-smoothstep(-.0015,.0015,max(dist.x,dist.y));gl_FragColor=vec4(mix(base,next,mask*uReveal),1.);
#include <tonemapping_fragment>
#include <colorspace_fragment>
}`;
export default function FrameBloom(props: FrameBloomProps) {
  const host = useRef<HTMLElement>(null),
    picture = useRef<HTMLDivElement>(null),
    canvas = useRef<HTMLCanvasElement>(null),
    options = useRef(props),
    action = useRef((_: number) => {}),
    wake = useRef(() => {});
  options.current = props;
  const [active, setActive] = useState(0),
    [next, setNext] = useState(1);
  const items = (props.items ?? artwork)
      .slice(0, 18)
      .map((i) => ({
        src: railImageSource(i.src),
        title: String(i.title ?? "Image"),
      })),
    signature = JSON.stringify(items);
  useEffect(() => {
    const root = host.current!,
      box = picture.current!,
      el = canvas.current!,
      count = items.length;
    let gone = false,
      index = 0,
      target = count > 1 ? 1 : 0,
      progress = 0,
      hold = 0,
      animating = false,
      drag: undefined | { y: number; p: number },
      lastPaint = -1,
      pendingDt = 0,
      px = 0,
      py = 0,
      sx = 0,
      sy = 0;
    let renderer: THREE.WebGLRenderer | undefined,
      geometry: THREE.PlaneGeometry | undefined,
      material: THREE.ShaderMaterial | undefined,
      scene: THREE.Scene,
      camera: THREE.OrthographicCamera;
    const textures: THREE.Texture[] = [];
    setActive(0);setNext(target);
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    let runtime: ReturnType<typeof effectRuntime>;
    const a = box.querySelector<HTMLImageElement>(".fb-base")!,
      b = box.querySelector<HTMLImageElement>(".fb-next")!;
    function dispose() {
      textures.splice(0).forEach((t) => t.dispose());
      geometry?.dispose();
      material?.dispose();
      renderer?.dispose();
      renderer = undefined;
    }
    function init() {
      dispose();
      if (!count) {
        root.dataset.ready = "true";
        return;
      }
      try {
        renderer = new THREE.WebGLRenderer({
          canvas: el,
          alpha: true,
          antialias: true,
          powerPreference: "low-power",
        });
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        scene = new THREE.Scene();
        camera = new THREE.OrthographicCamera(-0.5, 0.5, 0.5, -0.5, 0.1, 10);
        camera.position.z = 2;
        geometry = new THREE.PlaneGeometry(1, 1);
        material = new THREE.ShaderMaterial({
          vertexShader: vertex,
          fragmentShader: fragment,
          uniforms: {
            uBase: { value: null },
            uNext: { value: null },
            uCoverA: { value: new THREE.Vector2(1, 1) },
            uCoverB: { value: new THREE.Vector2(1, 1) },
            uProgress: { value: 0 },
            uInset: { value: 0.2 },
            uReveal: { value: 0 },
            uPointer: { value: new THREE.Vector2() },
          },
        });
        scene.add(new THREE.Mesh(geometry, material));
        const owner = renderer;
        root.dataset.renderer = "loading";
        let loaded = 0;
        const finish = () => {
          loaded++;
          if (loaded === count) {
            root.dataset.renderer = "webgl";
            runtime?.invalidate();
          }
        };
        items.forEach((item, i) => {
          if (!item.src) {
            finish();
            return;
          }
          new THREE.TextureLoader().load(
            item.src,
            (t) => {
              if (gone || renderer !== owner) {
                t.dispose();
                return;
              }
              t.colorSpace = THREE.SRGBColorSpace;
              t.minFilter = THREE.LinearFilter;
              t.generateMipmaps = false;
              textures[i] = t;
              finish();
            },
            undefined,
            () => {
              if (!gone && owner === renderer) finish();
            },
          );
        });
      } catch {
        dispose();
        root.dataset.renderer = "fallback";
      }
      runtime?.invalidate();
    }
    function choose(delta: number) {
      if (options.current.paused || !count || animating) return;
      target = railWrap(index + delta, count);
      setNext(target);
      if (reduced.matches) {
        index = target;
        setActive(index);
        options.current.onIndexChange?.(index);
        target = railWrap(index + 1, count);
        setNext(target);
        hold = 0;
      } else {
        progress = 0;
        animating = true;
        hold = 1;
      }
      runtime.invalidate();
    }
    action.current = choose;
    function paint(time: number, dt: number) {
      pendingDt = dt === 0 ? 0 : pendingDt + dt;
      if (time - lastPaint < 1 / 60 - 0.0008 && dt > 0) return;
      dt = pendingDt; pendingDt = 0;
      lastPaint = time;
      const cfg = options.current,
        duration = railClamp(cfg.duration, 0.7, 3, 1.65),
        interval = railClamp(cfg.interval, 1, 8, 2.8);
      sx += (px - sx) * (1 - Math.exp(-dt * 9));
      sy += (py - sy) * (1 - Math.exp(-dt * 9));
      if (!reduced.matches && dt > 0 && !drag) {
        if (animating) {
          progress = Math.min(1, progress + dt / duration);
          if (progress === 1) {
            index = target;
            setActive(index);
            options.current.onIndexChange?.(index);
            target = railWrap(index + 1, count);
            setNext(target);
            progress = 0;
            animating = false;
            hold = 0;
          }
        } else if (cfg.autoPlay !== false && count > 1) {
          hold += dt;
          if (hold >= interval) {
            animating = true;
            progress = 0;
          }
        }
      }
      const inset = railClamp(cfg.insetScale, 0.1, 0.4, 0.22),
        reveal = reduced.matches ? 0 : animating ? 1 : Math.min(1, hold / 0.5),
        scale = inset + (1 - inset) * bloomEase(progress);
      const setImage = (img: HTMLImageElement, src: string) => {
        if (img.getAttribute("src") !== src) {
          if (src) img.src = src;
          else img.removeAttribute("src");
        }
      };
      setImage(a, items[index]?.src ?? "");
      setImage(b, items[target]?.src ?? "");
      b.style.transform = `translate(-50%,-50%) scale(${scale})`;
      b.style.opacity = String(reveal);
      root.dataset.progress = progress.toFixed(4);
      root.dataset.index = String(index);
      if (renderer && material) {
        const w = box.clientWidth || 300,
          h = box.clientHeight || 400;
        const dpr = Math.min(devicePixelRatio || 1, cfg.compact ? 1.25 : 1.75);
        if(renderer.getPixelRatio()!==dpr)renderer.setPixelRatio(dpr);
        if (
          el.width !== Math.round(w * renderer.getPixelRatio()) ||
          el.height !== Math.round(h * renderer.getPixelRatio())
        )
          renderer.setSize(w, h, false);
        const u = material.uniforms;
        u.uBase.value = textures[index] ?? null;
        u.uNext.value = textures[target] ?? null;
        for (const [key, n] of [
          ["uCoverA", index],
          ["uCoverB", target],
        ] as const) {
          const img = textures[n]?.image,
            aspect = img ? img.width / img.height : w / h;
          u[key].value.set(
            Math.min(1, w / h / aspect),
            Math.min(1, aspect / (w / h)),
          );
        }
        u.uProgress.value = progress;
        u.uInset.value = inset;
        u.uReveal.value = reveal;
        u.uPointer.value.set(sx, sy);
        renderer.render(scene, camera);
      }
      if (root.dataset.renderer !== "loading") root.dataset.ready = "true";
    }
    function pointer(e: PointerEvent) {
      const r = box.getBoundingClientRect();
      px = (e.clientX - r.left) / r.width - 0.5;
      py = 0.5 - (e.clientY - r.top) / r.height;
      if (drag) {
        progress = railClamp(
          drag.p + (drag.y - e.clientY) / Math.max(100, r.height * 0.7),
          0,
          0.999,
          0,
        );
      }
      runtime.invalidate();
    }
    function down(e: PointerEvent) {
      if (
        options.current.paused ||
        e.button !== 0 ||
        (e.target as HTMLElement).closest("button") ||
        reduced.matches ||
        count < 2
      )
        return;
      box.setPointerCapture?.(e.pointerId);
      drag = { y: e.clientY, p: progress };
      hold = 1;
      runtime.invalidate();
    }
    function up() {
      if (!drag) return;
      drag = undefined;
      animating = true;
      runtime.invalidate();
    }
    function key(e: KeyboardEvent) {
      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        e.preventDefault();
        choose(1);
      }
      if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        choose(-1);
      }
    }
    function loss(e: Event) {
      e.preventDefault();
      dispose();
      root.dataset.renderer = "fallback";
      runtime.invalidate();
    }
    const restore = () => init();
    box.addEventListener("pointermove", pointer);
    box.addEventListener("pointerdown", down);
    box.addEventListener("pointerup", up);
    box.addEventListener("pointercancel", up);
    root.addEventListener("keydown", key);
    el.addEventListener("webglcontextlost", loss);
    el.addEventListener("webglcontextrestored", restore);
    init();
    runtime = effectRuntime(
      root,
      el,
      paint,
      () =>
        !!options.current.paused ||
        (options.current.autoPlay === false && !animating && !drag),
      undefined,
      props.compact,
    );
    wake.current = () => runtime.invalidate();
    return () => {
      gone = true;
      runtime.dispose();
      dispose();
      action.current = () => {};
      wake.current = () => {};
      box.removeEventListener("pointermove", pointer);
      box.removeEventListener("pointerdown", down);
      box.removeEventListener("pointerup", up);
      box.removeEventListener("pointercancel", up);
      root.removeEventListener("keydown", key);
      el.removeEventListener("webglcontextlost", loss);
      el.removeEventListener("webglcontextrestored", restore);
    };
  }, [signature]);
  useEffect(
    () => wake.current(),
    [
      props.paused,
      props.autoPlay,
      props.interval,
      props.duration,
      props.insetScale,
    ],
  );
  return (
    <section
      ref={host}
      className={`frame-bloom ${props.className ?? ""}`}
      style={props.style}
      data-theme={props.theme ?? "auto"}
      aria-label="FrameBloom image carousel"
      aria-roledescription="carousel"
      tabIndex={0}
    >
      <style>{css}</style>
      <div ref={picture} className="fb-picture">
        <img className="fb-base" alt="" />
        <img className="fb-next" alt="" />
        <canvas ref={canvas} aria-hidden="true" />
      </div>
      {items.length ? (
        <nav className="fb-nav" aria-label="Image navigation">
          <button
            onClick={() => action.current(-1)}
            aria-label="Previous image"
          >
            ←
          </button>
          <span
            aria-live={props.autoPlay === false ? "polite" : "off"}
            className="fb-sr"
          >
            {items[active]?.title}, {active + 1} of {items.length}. Next image:{" "}
            {items[next]?.title}.
          </span>
          <button onClick={() => action.current(1)} aria-label="Next image">
            →
          </button>
        </nav>
      ) : (
        <p role="status">Add images to begin.</p>
      )}
    </section>
  );
}
const css = `.frame-bloom{--fb-bg:#eceae3;--fb-fg:#242522;position:relative;width:100%;height:100%;min-height:240px;display:flex;align-items:center;justify-content:center;background:var(--fb-bg);color:var(--fb-fg);overflow:hidden;outline:none;font-family:Urbanist,system-ui,sans-serif}.frame-bloom[data-theme=dark],html[data-theme=dark] .frame-bloom[data-theme=auto]{--fb-bg:#131411;--fb-fg:#e9e9e2}.frame-bloom:focus-visible{outline:1px solid var(--fb-fg);outline-offset:-5px}.fb-picture{position:relative;height:84%;aspect-ratio:3/4;max-width:85%;overflow:hidden;box-shadow:0 24px 60px #0002;cursor:ns-resize;touch-action:pan-x pinch-zoom;background:#858378}.fb-picture>canvas,.fb-picture>img{position:absolute;inset:0;width:100%;height:100%;display:block;object-fit:cover;pointer-events:none}.fb-picture>.fb-next{inset:auto;top:50%;left:50%;transform-origin:center;transform:translate(-50%,-50%) scale(.22)}.fb-picture canvas{opacity:0}.frame-bloom[data-renderer=webgl] .fb-picture canvas{opacity:1}.frame-bloom[data-renderer=webgl] .fb-picture img{visibility:hidden}.fb-nav{position:absolute;bottom:9px;display:flex;gap:14px}.fb-nav button{width:28px;height:28px;border:0;background:transparent;color:inherit;font:18px system-ui;cursor:pointer;opacity:.6}.fb-nav button:hover,.fb-nav button:focus-visible{opacity:1;outline:1px solid currentColor;outline-offset:2px}.fb-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap}`;
