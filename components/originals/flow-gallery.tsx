"use client";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import * as THREE from "three";
import { createPaperGeometry, paperCrumple } from "./paper-mesh";
import { effectRuntime } from "./effect-runtime";
export type GalleryItem = { src?: string; title?: string };
export type FlowOptions = {
  mode?: "scroll" | "drag" | "both";
  direction?: "horizontal" | "vertical";
  speed?: number;
  deformation?: number;
  perspective?: number;
  inertia?: number;
  loop?: boolean;
  autoPlay?: boolean;
  stepInterval?: number;
  pinchScale?: number;
  angleDeg?: number;
  gap?: number;
  backgroundColor?: string;
  paused?: boolean;
  compact?: boolean;
  className?: string;
  items?: GalleryItem[];
};
export const defaultFlowItems: GalleryItem[] = [
  { src: "/media/gallery/image-18.webp", title: "Study 01" },
  { src: "/media/gallery/image-17.webp", title: "Study 02" },
  { src: "/media/gallery/image-16.webp", title: "Study 03" },
  { src: "/media/gallery/image-15.webp", title: "Study 04" },
  { src: "/media/gallery/image-14.webp", title: "Study 05" },
  { src: "/media/gallery/image-13.webp", title: "Study 06" },
  { src: "/media/gallery/image-12.webp", title: "Study 07" },
  { src: "/media/gallery/image-11.webp", title: "Study 08" },
  { src: "/media/gallery/image-10.webp", title: "Study 09" },
  { src: "/media/gallery/image-09.webp", title: "Study 10" },
  { src: "/media/gallery/image-08.webp", title: "Study 11" },
  { src: "/media/gallery/image-07.webp", title: "Study 12" },
  { src: "/media/gallery/image-06.webp", title: "Study 13" },
  { src: "/media/gallery/image-05.webp", title: "Study 14" },
  { src: "/media/gallery/image-04.webp", title: "Study 15" },
  { src: "/media/gallery/image-03.webp", title: "Study 16" },
  { src: "/media/gallery/image-02.webp", title: "Study 17" },
  { src: "/media/gallery/image-01.webp", title: "Study 18" },
];
export function ribbonSlot(slot: number, cursor: number, count = 48) {
  const logical = slot + Math.round((cursor - slot) / count) * count;
  return { logical, center: logical - cursor };
}
export function paperFocus(center: number) {
  const x = Math.max(0, Math.min(1, (Math.abs(center) - 0.08) / 0.85));
  return x * x * (3 - 2 * x);
}
export const bound = (
  v: number | undefined,
  min: number,
  max: number,
  fallback: number,
) => (Number.isFinite(v) ? Math.max(min, Math.min(max, v!)) : fallback);
export function flowPosition(value: number, count: number, loop: boolean) {
  return loop
    ? ((value % count) + count) % count
    : Math.max(0, Math.min(count - 1, value));
}
export function paperFold(
  x: number,
  y: number,
  velocity: number,
  amount: number,
  seed = 0,
  center = 0,
) {
  return (
    paperFocus(center) *
    amount *
    (0.7 + 0.3 * Math.min(1, Math.abs(velocity) * 0.12)) *
    (Math.abs(Math.sin(x * (2.1 + seed * 0.07) + y * 3.2 + seed)) * 0.35 +
      Math.sin(y * 1.7 - seed) * 0.12)
  );
}
export function ribbonPoint(s: number, v: number, k: number, angle: number) {
  const x = Math.sinh(s * k) * Math.cos(v * k) * 0.8,
    y = Math.cosh(s * k) * Math.sin(v * k) * 0.8;
  return [
    x * Math.cos(angle) - y * Math.sin(angle),
    x * Math.sin(angle) + y * Math.cos(angle),
  ];
}
export default function FlowGallery({
  variant,
  ...props
}: FlowOptions & { variant: "paper" | "ribbon" }) {
  const host = useRef<HTMLDivElement>(null),
    canvas = useRef<HTMLCanvasElement>(null),
    options = useRef(props),
    invalidate = useRef(() => {}),
    advance = useRef<(d: number) => void>(() => {}),
    [index, setIndex] = useState(0),
    [ready, setReady] = useState(false),
    [failed, setFailed] = useState(false);
  options.current = props;
  const items = (props.items?.length ? props.items : defaultFlowItems).slice(
      0,
      18,
    ),
    signature = JSON.stringify(items);
  useEffect(() => {
    const root = host.current!,
      el = canvas.current!;
    delete root.dataset.ready;
    setReady(false);
    let renderer: THREE.WebGLRenderer | undefined,
      runtime: ReturnType<typeof effectRuntime> | undefined,
      disposed = false;
    const scene = new THREE.Scene(),
      camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100),
      geometry =
        variant === "paper"
          ? createPaperGeometry(1)
          : new THREE.PlaneGeometry(1, 1, 64, 12),
      textures: THREE.Texture[] = [],
      materials: THREE.ShaderMaterial[] = [],
      meshes: THREE.Mesh[] = [];
    const paperGeometries = new Map<number, THREE.BufferGeometry>(
      variant === "paper" ? [[0, geometry]] : [],
    );
    if (variant === "ribbon")
      geometry.setAttribute("aCrumpled", geometry.getAttribute("position"));
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    let painted = false,
      resetMotionDelta = true;
    let snapTimer: ReturnType<typeof setTimeout> | undefined,
      lastBackground = "";
    let current = 0,
      target = 0,
      velocity = 0,
      spring = 0,
      drag = false,
      lastX = 0,
      lastY = 0,
      lastStep = 0,
      shown = -1,
      w = 1,
      h = 1;
    const hover = { x: 0, y: 0 },
      smooth = { x: 0, y: 0 };
    const vertex = `varying vec2 vUv;varying vec3 vPos;attribute vec3 aCrumpled;uniform float uCrumple;uniform float uCenter,uVelocity,uDeformation,uKind,uPinch,uAngle,uAspect,uGap,uSeed;uniform vec2 uHover;
float hash(float x){return fract(sin(x*127.1+uSeed*91.7)*43758.5453);}
void main(){vUv=uv;vec2 q=uv-.5;vec3 p;
if(uKind<.5){
 float focus=smoothstep(.08,.93,abs(uCenter));
 p=mix(position,aCrumpled,uCrumple);
 float tilt=sin(uSeed*2.31)*.045*focus;float c=cos(tilt),sn=sin(tilt);p.xy=mat2(c,-sn,sn,c)*p.xy;
 p.z-=abs(uCenter)*.16;
 if(uAspect>.5)p.y+=uCenter*3.3;else p.x+=uCenter*2.6;
}else{
 float k=uPinch;float s=uCenter+q.x*(1.-uGap);float v=q.y*.9;float exitBend=smoothstep(1.1,3.8,abs(uCenter));
 s+=q.y*q.y*sign(uCenter)*exitBend*.28;
 float sx=(exp(s*k)-exp(-s*k))*.5*cos(v*k);float sy=(exp(s*k)+exp(-s*k))*.5*sin(v*k);vec2 a=vec2(sx,sy)*.8;float angle=uAngle;
 p=vec3(mat2(cos(angle),sin(angle),-sin(angle),cos(angle))*a+vec2(.12,.14)+uHover*.12,sin(q.x*3.14)*uVelocity*.012+q.y*q.y*exitBend*.2);
}vPos=p;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}`;
    const fragment = `uniform sampler2D uTexture;uniform float uRatio,uKind,uOpacity;varying vec2 vUv;varying vec3 vPos;
void main(){vec2 uv=vUv;float cardRatio=uKind<.5?2.2/2.9:1.;if(uRatio>cardRatio)uv.x=(uv.x-.5)*cardRatio/uRatio+.5;else uv.y=(uv.y-.5)*uRatio/cardRatio+.5;
vec3 col=texture2D(uTexture,uv).rgb;vec3 n=normalize(cross(dFdx(vPos),dFdy(vPos)));float diffuse=max(0.,dot(gl_FrontFacing?n:-n,normalize(vec3(-.45,.65,1.))));float light=uKind<.5?.42+.58*diffuse:1.;if(uKind<.5&&!gl_FrontFacing)col=mix(col,vec3(.96,.95,.93),.88);gl_FragColor=vec4(col*light,uOpacity);}`;
    const cleanup = () => {
      clearTimeout(snapTimer);
      runtime?.dispose();
      geometry.dispose();
      paperGeometries.forEach((g) => {
        if (g !== geometry) g.dispose();
      });
      paperGeometries.clear();
      materials.forEach((m) => m.dispose());
      textures.forEach((t) => t.dispose());
      renderer?.dispose();
    };
    try {
      renderer = new THREE.WebGLRenderer({
        canvas: el,
        antialias: true,
        alpha: false,
        powerPreference: "high-performance",
      });
      camera.position.z = 7;
      const placeholder = new THREE.DataTexture(
        new Uint8Array([225, 225, 221, 255]),
        1,
        1,
      );
      placeholder.needsUpdate = true;
      textures.push(placeholder);
      const cache = new Map<
          number,
          { texture: THREE.Texture; ratio: number }
        >(),
        requested = new Set<number>();
      const load = (index: number) => {
        if (requested.has(index)) return;
        requested.add(index);
        const item = items[index];
        if (
          !item.src ||
          !(
            (item.src.startsWith("/") && !item.src.startsWith("//")) ||
            item.src.startsWith("https://")
          )
        )
          return;
        const image = new Image();
        image.crossOrigin = "anonymous";
        image.onload = () => {
          if (disposed) return;
          const max = props.compact ? 512 : 1024,
            scale = Math.min(
              1,
              max / Math.max(image.naturalWidth, image.naturalHeight),
            );
          const c = document.createElement("canvas");
          c.width = Math.max(1, Math.round(image.naturalWidth * scale));
          c.height = Math.max(1, Math.round(image.naturalHeight * scale));
          c.getContext("2d")?.drawImage(image, 0, 0, c.width, c.height);
          const photo = new THREE.CanvasTexture(c);
          photo.colorSpace = THREE.SRGBColorSpace;
          photo.anisotropy = Math.min(
            4,
            renderer!.capabilities.getMaxAnisotropy(),
          );
          photo.needsUpdate = true;
          textures.push(photo);
          cache.set(index, {
            texture: photo,
            ratio: image.naturalWidth / image.naturalHeight,
          });
          runtime?.invalidate();
        };
        image.src = item.src;
      };
      const slots = variant === "ribbon" ? 48 : items.length;
      for (let i = 0; i < slots; i++) {
        const material = new THREE.ShaderMaterial({
          vertexShader: vertex,
          fragmentShader: fragment,
          side: THREE.DoubleSide,
          transparent: variant === "ribbon",
          depthWrite: variant !== "ribbon",
          uniforms: {
            uTexture: { value: placeholder },
            uRatio: { value: 1 },
            uCenter: { value: i },
            uVelocity: { value: 0 },
            uDeformation: { value: 1 },
            uKind: { value: variant === "paper" ? 0 : 1 },
            uPinch: { value: 0.82 },
            uAngle: { value: 0.62 },
            uAspect: { value: 0 },
            uHover: { value: new THREE.Vector2() },
            uGap: { value: 0.06 },
            uSeed: { value: i },
            uCrumple: { value: 0 },
            uOpacity: { value: 0 },
          },
        });
        materials.push(material);
        const mesh = new THREE.Mesh(geometry, material);
        mesh.frustumCulled = false;
        scene.add(mesh);
        meshes.push(mesh);
      }
      runtime = effectRuntime(
        root,
        el,
        (time, dt) => {
          if (resetMotionDelta) {
            dt = Math.min(dt, 1 / 60);
            resetMotionDelta = false;
          }
          const o = options.current,
            still = !!o.paused || reduced.matches,
            speed = bound(o.speed, 0.1, 4, 1),
            inertia = bound(o.inertia, 0.02, 0.95, 0.78),
            sign = o.direction === "vertical" ? 1 : 0;
          const background =
            o.backgroundColor ?? (variant === "paper" ? "#dededc" : "#f6f6f4");
          if (background !== lastBackground) {
            lastBackground = background;
            scene.background = new THREE.Color(background);
          }
          const fov = bound(o.perspective, 20, 75, 40);
          if (camera.fov !== fov) {
            camera.fov = fov;
            camera.updateProjectionMatrix();
          }
          if (
            !still &&
            variant === "ribbon" &&
            o.autoPlay !== false &&
            !drag &&
            time - lastStep > bound(o.stepInterval, 800, 8000, 2100) / 1000
          ) {
            target += 1;
            lastStep = time;
          }
          if (!still) {
            const step = 1 - Math.pow(inertia, dt * 60);
            const old = current;
            if (variant === "ribbon") {
              spring += (target - current) * 0.085 * dt * 60;
              spring *= Math.pow(0.78, dt * 60);
              current += spring * dt * 60;
            } else current += (target - current) * step;
            velocity +=
              ((current - old) / Math.max(dt, 0.001) - velocity) *
              (1 - Math.exp(-dt * 12));
            smooth.x += (hover.x - smooth.x) * step;
            smooth.y += (hover.y - smooth.y) * step;
          } else {
            current = target;
            velocity = 0;
          }
          if (o.loop === false)
            target = flowPosition(target, items.length, false);
          if (Math.abs(current) > 10000) {
            const offset = Math.floor(current / items.length) * items.length;
            current -= offset;
            target -= offset;
          }
          const pinch = bound(o.pinchScale, 0.3, 1.2, 0.82) + smooth.x * 0.025;
          const radius =
            7 *
            Math.tan((camera.fov * Math.PI) / 360) *
            Math.hypot(1, camera.aspect);
          const span =
            variant === "ribbon"
              ? Math.min(
                  21,
                  Math.asinh((radius + 2) / (0.8 * Math.cos(0.45 * pinch))) /
                    pinch +
                    0.75,
                )
              : (o.direction === "vertical"
                  ? 7 * Math.tan((camera.fov * Math.PI) / 360)
                  : radius) /
                  2.6 +
                1.7;
          let visibleMeshes = 0;
          meshes.forEach((mesh, i) => {
            const slot =
              variant === "ribbon"
                ? ribbonSlot(i, current, slots)
                : o.loop === false
                  ? { logical: i, center: i - current }
                  : ribbonSlot(i, current, items.length);
            const center = slot.center,
              itemIndex = flowPosition(slot.logical, items.length, true),
              u = materials[i].uniforms;
            mesh.visible = Math.abs(center) < span + 0.7;
            if (!mesh.visible) return;
            visibleMeshes++;
            if (variant === "paper") {
              let pose = paperGeometries.get(itemIndex);
              if (!pose) {
                pose = createPaperGeometry(itemIndex + 1);
                paperGeometries.set(itemIndex, pose);
              }
              mesh.geometry = pose;
            }
            load(itemIndex);
            const asset = cache.get(itemIndex);
            mesh.visible = Boolean(asset);
            u.uTexture.value = asset?.texture ?? placeholder;
            u.uRatio.value = asset?.ratio ?? 1;
            u.uOpacity.value = asset
              ? Math.max(0, Math.min(1, (span + 0.7 - Math.abs(center)) / 0.7))
              : 0;
            u.uCenter.value = center;
            u.uSeed.value = itemIndex + 1;
            u.uVelocity.value = velocity;
            u.uDeformation.value = bound(o.deformation, 0, 3, 1);
            u.uCrumple.value = paperCrumple(
              center,
              u.uDeformation.value,
              velocity,
            );
            u.uPinch.value = pinch;
            u.uAngle.value = (bound(o.angleDeg, -75, 75, 36) * Math.PI) / 180;
            u.uGap.value = bound(o.gap, 0.01, 0.3, 0.06);
            u.uAspect.value = sign;
            u.uHover.value.set(smooth.x, smooth.y);
          });
          root.dataset.visibleSheets = String(visibleMeshes);
          renderer!.render(scene, camera);
          if (
            !painted &&
            cache.has(flowPosition(Math.round(current), items.length, true))
          ) {
            painted = true;
            setReady(true);
          }
          const next =
            Math.round(flowPosition(current, items.length, true)) %
            items.length;
          if (next !== shown) {
            shown = next;
            setIndex(next);
          }
          return painted;
        },
        () =>
          !!options.current.paused ||
          ((variant === "paper" || options.current.autoPlay === false) &&
            !drag &&
            Math.abs(target - current) < 0.0001 &&
            Math.abs(velocity) < 0.001 &&
            Math.abs(hover.x - smooth.x) < 0.0001 &&
            Math.abs(hover.y - smooth.y) < 0.0001),
        (width, height, dpr) => {
          w = width;
          h = height;
          renderer!.setPixelRatio(dpr);
          renderer!.setSize(width, height, false);
          camera.aspect = width / height;
          camera.updateProjectionMatrix();
        },
        !!props.compact,
      );
      invalidate.current = runtime.invalidate;
      const input = (delta: number) => {
        if (Math.abs(target - current) < 0.0001 && Math.abs(velocity) < 0.001)
          resetMotionDelta = true;
        target += delta * bound(options.current.speed, 0.1, 4, 1);
        if (options.current.loop === false)
          target = flowPosition(target, items.length, false);
        runtime?.invalidate();
      };
      advance.current = (delta) => {
        if (Math.abs(target - current) < 0.0001 && Math.abs(velocity) < 0.001)
          resetMotionDelta = true;
        target = Math.round(target) + delta;
        if (options.current.loop === false)
          target = flowPosition(target, items.length, false);
        runtime?.invalidate();
      };
      const wheel = (e: WheelEvent) => {
        if (options.current.mode === "drag") return;
        e.preventDefault();
        input(
          (e.deltaMode === 1
            ? e.deltaY * 16
            : e.deltaMode === 2
              ? e.deltaY * h
              : e.deltaY || e.deltaX) / 360,
        );
        if (variant === "paper") {
          clearTimeout(snapTimer);
          snapTimer = setTimeout(() => {
            target = Math.round(target);
            runtime?.invalidate();
          }, 170);
        }
      };
      const down = (e: PointerEvent) => {
        if (
          (options.current.mode === "scroll" && e.pointerType !== "touch") ||
          (e.target as HTMLElement).closest("button")
        )
          return;
        clearTimeout(snapTimer);
        drag = true;
        lastX = e.clientX;
        lastY = e.clientY;
        root.setPointerCapture(e.pointerId);
      };
      const move = (e: PointerEvent) => {
        const r = root.getBoundingClientRect();
        hover.x = (e.clientX - r.left) / w - 0.5;
        hover.y = (e.clientY - r.top) / h - 0.5;
        if (drag) {
          const dx = e.clientX - lastX,
            dy = e.clientY - lastY,
            a = (bound(options.current.angleDeg, -75, 75, 36) * Math.PI) / 180;
          input(
            -(options.current.mode === "scroll"
              ? dy
              : variant === "ribbon"
                ? dx * Math.cos(a) - dy * Math.sin(a)
                : options.current.direction === "vertical"
                  ? dy
                  : dx) / 240,
          );
          lastX = e.clientX;
          lastY = e.clientY;
        }
        runtime?.invalidate();
      };
      const up = () => {
        drag = false;
        target = Math.round(target);
        runtime?.invalidate();
      };
      const lost = (e: Event) => {
        e.preventDefault();
        setFailed(true);
        runtime?.dispose();
      };
      root.addEventListener("wheel", wheel, { passive: false });
      root.addEventListener("pointerdown", down);
      root.addEventListener("pointermove", move);
      root.addEventListener("pointerup", up);
      root.addEventListener("pointercancel", up);
      root.addEventListener("lostpointercapture", up);
      el.addEventListener("webglcontextlost", lost);
      return () => {
        disposed = true;
        advance.current = () => {};
        invalidate.current = () => {};
        root.removeEventListener("wheel", wheel);
        root.removeEventListener("pointerdown", down);
        root.removeEventListener("pointermove", move);
        root.removeEventListener("pointerup", up);
        root.removeEventListener("pointercancel", up);
        root.removeEventListener("lostpointercapture", up);
        el.removeEventListener("webglcontextlost", lost);
        cleanup();
      };
    } catch {
      setFailed(true);
      cleanup();
      return () => {
        disposed = true;
      };
    }
  }, [signature, variant]);
  useEffect(() => {
    invalidate.current();
  }, [props]);
  return (
    <div
      ref={host}
      role="group"
      tabIndex={0}
      aria-label={
        variant === "paper"
          ? "Paper Flow image gallery"
          : "Hyperbolic Ribbon image gallery"
      }
      onKeyDown={(e) => {
        if (e.key === "ArrowRight" || e.key === "ArrowDown") {
          e.preventDefault();
          if (failed) setIndex((v) => (v + 1) % items.length);
          else advance.current(1);
        } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
          e.preventDefault();
          if (failed) setIndex((v) => (v + items.length - 1) % items.length);
          else advance.current(-1);
        }
      }}
      className={`flow-gallery ${props.className ?? ""}`}
      data-ready={(ready && !failed) || undefined}
      data-failed={failed || undefined}
      style={
        {
          position: "relative",
          width: "100%",
          height: "100%",
          minHeight: 280,
          overflow: "hidden",
          background: props.backgroundColor ?? "#dededc",
          touchAction:
            props.mode === "scroll"
              ? "pan-x"
              : props.direction === "vertical"
                ? "pan-x"
                : "pan-y",
          fontFamily: "Urbanist,system-ui,sans-serif",
        } as CSSProperties
      }
    >
      <style>{`.flow-gallery canvas{width:100%;height:100%;display:block}.flow-gallery:focus-within{outline:1px solid #888;outline-offset:-2px}.flow-controls{position:absolute;bottom:20px;left:22px;right:22px;display:flex;justify-content:space-between;align-items:center;color:#27272b;font-size:11px;pointer-events:none}.flow-controls div{display:flex;gap:8px;pointer-events:auto}.flow-controls button{display:grid;place-items:center;padding:0;line-height:1;font:16px system-ui,sans-serif;width:44px;height:44px;border:1px solid #0002;border-radius:99px;background:#ffffffb0;color:#222;cursor:pointer;backdrop-filter:blur(12px)}.flow-controls button:focus-visible{outline:2px solid #222;outline-offset:3px}.flow-fallback{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;gap:12px;overflow:hidden}.flow-fallback img{width:42%;height:66%;object-fit:cover}.flow-fallback p{font-size:14px;padding:20px}`}</style>
      <canvas
        ref={canvas}
        aria-hidden="true"
        style={{ visibility: failed ? "hidden" : "visible" }}
      />
      {failed && (
        <div className="flow-fallback">
          {items[index].src ? (
            <img
              src={items[index].src}
              alt={items[index].title ?? "Gallery image"}
            />
          ) : (
            <p>{items[index].title ?? "Paper study"}</p>
          )}
        </div>
      )}

    </div>
  );
}

