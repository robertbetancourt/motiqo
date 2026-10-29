"use client";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import * as THREE from "three";
import {
  advanceElasticRail,
  rubberProfile,
  rubberLabels,
  railLayout,
  advanceRail,
  createRailMotion,
  railClamp,
  railWrap,
  railImageSource,
  railVertex,
  railFragment,
} from "./liquid-rail-motion";

export type LiquidRailItem = { src: string; title: string; year?: string };
export type LiquidRailProps = {
  variant?: "rail" | "stream" | "horizontal" | "elastic";
  minWidthRatio?: number;
  waistSigma?: number;
  stretchAmount?: number;
  items?: LiquidRailItem[];
  title?: string;
  autoPlay?: boolean;
  flowSpeed?: number;
  liquidStrength?: number;
  response?: number;
  spacing?: number;
  theme?: "auto" | "light" | "dark";
  paused?: boolean;
  compact?: boolean;
  className?: string;
  style?: CSSProperties;
  onIndexChange?: (index: number) => void;
};
export const defaultRailItems: LiquidRailItem[] = [
  { src: "/media/gallery/image-01.webp", title: "Chromatic", year: "2026" },
  { src: "/media/gallery/image-11.webp", title: "Florilegium", year: "2026" },
  { src: "/media/gallery/image-18.webp", title: "Solstice", year: "2025" },
  { src: "/media/gallery/image-05.webp", title: "Stillwater", year: "2025" },
  { src: "/media/gallery/image-16.webp", title: "Tidal", year: "2024" },
  { src: "/media/gallery/image-03.webp", title: "Afterlight", year: "2024" },
];

export default function LiquidRail(props: LiquidRailProps) {
  const host = useRef<HTMLElement>(null),
    canvas = useRef<HTMLCanvasElement>(null);
  const options = useRef(props),
    wake = useRef(() => {}),
    select = useRef((_: number) => {});
  const [active, setActive] = useState(0),
    [playing, setPlaying] = useState(false);
  options.current = props;
  const items = (props.items ?? defaultRailItems).slice(0, 18).map((item) => ({
    src: railImageSource(item.src),
    title: String(item.title || "Untitled").slice(0, 80),
    year: String(item.year || "").slice(0, 12),
  }));
  const signature = JSON.stringify(items);
  useEffect(() => {
    const root = host.current!,
      surface = canvas.current!;
    const variant = props.variant ?? "rail",
      horizontal = variant === "horizontal",
      elastic = variant === "elastic",
      rubber = elastic || variant === "stream";
    const axis = (e: PointerEvent) => (horizontal ? e.clientX : e.clientY);
    const count = items.length,
      s = createRailMotion(),
      reduced = matchMedia("(prefers-reduced-motion: reduce)");
    let gone = false,
      visible = true,
      frame = 0,
      last = 0,
      time = 0,
      interaction = 0,
      loaded = 0;
    let width = 1,
      height = 1,
      cardWidth = 1,
      cardHeight = 1,
      pitch = 1,
      currentIndex = -1;
    let isPlaying = false,
      nextAuto = 3.2,
      snapAt = 0,
      snapPending = false;
    const rubberOptions = () => ({
      min: railClamp(
        options.current.minWidthRatio,
        0.38,
        0.8,
        elastic ? 0.54 : 0.2,
      ),
      sigma: railClamp(
        options.current.waistSigma,
        0.15,
        0.8,
        elastic ? 0.42 : 0.28,
      ),
      stretch: railClamp(
        options.current.stretchAmount,
        0,
        0.8,
        elastic ? 0.3 : 0.22,
      ),
    });
    const profile = (y: number) => {
      const o = rubberOptions();
      return rubberProfile(
        y,
        height,
        reduced.matches ? 0 : railClamp(s.velocity, -4, 4, 0),
        o.min,
        o.sigma,
        o.stretch,
        elastic,
      );
    };
    let drag:
      | {
          id: number;
          y: number;
          target: number;
          lastY: number;
          lastTime: number;
          velocity: number;
        }
      | undefined;
    let renderer: THREE.WebGLRenderer | undefined,
      scene: THREE.Scene,
      camera: THREE.OrthographicCamera;
    let geometry: THREE.PlaneGeometry | undefined;
    const textures: THREE.Texture[] = [],
      meshes: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>[] = [];
    const labels = Array.from(
      root.querySelectorAll<HTMLElement>(".lr-card-label"),
    );
    const fallback = Array.from(
      root.querySelectorAll<HTMLElement>(".lr-fallback-card"),
    );
    const halted = () =>
      !!options.current.paused || !visible || document.hidden;
    const settings = () => ({
      liquid: railClamp(options.current.liquidStrength, 0, 2, 1),
      response: railClamp(options.current.response, 0, 1, 0.65),
      spacing: railClamp(options.current.spacing, 0.005, 0.2, 0.055),
      speed: railClamp(options.current.flowSpeed, 0.08, 1, 0.22),
    });
    function disposeGPU() {
      meshes.splice(0).forEach((mesh) => mesh.material.dispose());
      geometry?.dispose();
      geometry = undefined;
      textures.splice(0).forEach((texture) => texture.dispose());
      renderer?.dispose();
      renderer = undefined;
    }
    function initialize() {
      disposeGPU();
      if (gone) return;
      if (!count) {
        root.dataset.renderer = "fallback";
        resize();
        return;
      }
      try {
        renderer = new THREE.WebGLRenderer({
          canvas: surface,
          alpha: true,
          antialias: true,
          powerPreference: elastic ? "high-performance" : "low-power",
        });
        renderer.setClearColor(0, 0);
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        scene = new THREE.Scene();
        camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 100);
        camera.position.z = 10;
        geometry = new THREE.PlaneGeometry(
          1,
          1,
          rubber ? 64 : 24,
          rubber ? 64 : 40,
        );
        for (let i = 0; i < 7; i++) {
          const material = new THREE.ShaderMaterial({
            vertexShader: railVertex,
            fragmentShader: railFragment,
            uniforms: {
              uMap: { value: null },
              uCover: { value: new THREE.Vector2(1, 1) },
              uBend: { value: 0 },
              uLiquid: { value: 1 },
              uTime: { value: 0 },
              uVariant: {
                value: elastic
                  ? 3
                  : variant === "stream"
                    ? 1
                    : horizontal
                      ? 2
                      : 0,
              },
              uOffset: { value: 0 },
              uViewportHeight: { value: 1 },
              uVelocity: { value: 0 },
              uMinWidth: { value: 0.54 },
              uWaistSigma: { value: 0.42 },
              uStretchAmount: { value: 0.3 },
              uLoaded: { value: 0 },
            },
            depthTest: false,
            depthWrite: false,
            transparent: rubber,
            side: THREE.DoubleSide,
          });
          const mesh = new THREE.Mesh(geometry, material);
          mesh.frustumCulled = false;
          scene.add(mesh);
          meshes.push(mesh);
        }
        root.dataset.renderer = "webgl";
        loaded = 0;
        const owner = renderer,
          loader = new THREE.TextureLoader();
        loader.setCrossOrigin("anonymous");
        items.forEach((item, index) => {
          if (!item.src) {
            loaded++;
            invalidate();
            return;
          }
          loader.load(
            item.src,
            (texture) => {
              if (gone || owner !== renderer) {
                texture.dispose();
                return;
              }
              texture.colorSpace = THREE.SRGBColorSpace;
              texture.minFilter = THREE.LinearFilter;
              texture.magFilter = THREE.LinearFilter;
              texture.generateMipmaps = false;
              // Card previews upload small textures; the expanded scene keeps the original artwork.
              const image = texture.image as HTMLImageElement;
              if (
                options.current.compact &&
                Math.max(image.width, image.height) > 640
              ) {
                const scaled = document.createElement("canvas"),
                  ratio = 640 / Math.max(image.width, image.height);
                scaled.width = Math.round(image.width * ratio);
                scaled.height = Math.round(image.height * ratio);
                const context = scaled.getContext("2d");
                if (context) {
                  context.drawImage(image, 0, 0, scaled.width, scaled.height);
                  texture.image = scaled;
                }
              }
              texture.anisotropy = Math.min(
                4,
                owner.capabilities.getMaxAnisotropy(),
              );
              textures[index] = texture;
              loaded++;
              invalidate();
            },
            undefined,
            () => {
              if (!gone && owner === renderer) {
                loaded++;
                invalidate();
              }
            },
          );
        });
      } catch {
        disposeGPU();
        root.dataset.renderer = "fallback";
        loaded = count;
      }
      resize();
    }
    function resize() {
      const box = root.getBoundingClientRect();
      width = Math.max(1, box.width);
      height = Math.max(1, box.height);
      cardWidth = Math.min(width * (width < 580 ? 0.62 : 0.34), height * 0.53);
      cardHeight = cardWidth * 1.23;
      if (renderer) {
        renderer.setPixelRatio(
          Math.min(
            devicePixelRatio || 1,
            options.current.compact ? 1.25 : elastic ? 2 : 1.75,
          ),
        );
        renderer.setSize(width, height, false);
        camera.left = -width / 2;
        camera.right = width / 2;
        camera.top = height / 2;
        camera.bottom = -height / 2;
        camera.updateProjectionMatrix();
      }
      invalidate();
    }
    function announce() {
      const next = railWrap(Math.round(s.cursor), count);
      if (next !== currentIndex) {
        currentIndex = next;
        setActive(next);
        options.current.onIndexChange?.(next);
      }
    }
    function paint() {
      const cfg = settings();
      pitch =
        (horizontal ? Math.min(width * 0.56, height * 0.65) : cardHeight) *
        (1 + cfg.spacing);
      const x = width < 580 ? -width * 0.025 : width * 0.025;
      root.dataset.cursor = s.cursor.toFixed(4);
      root.dataset.bend = s.bend.toFixed(4);
      const center = Math.round(s.cursor);
      for (let slot = 0; slot < 7; slot++) {
        const logical = center + slot - 3,
          index = railWrap(logical, count),
          offset = logical - s.cursor;
        const layout = railLayout(offset, width, height, variant, cfg.spacing),
          { w, h, y } = layout;
        const px = layout.x;
        const shown = count > 0 && (count > 1 || logical === 0);
        if (meshes[slot]) {
          const mesh = meshes[slot],
            u = mesh.material.uniforms,
            texture = textures[index];
          mesh.visible = shown;
          mesh.position.set(px, -y, 0);
          mesh.rotation.z = layout.rotation;
          mesh.rotation.y = horizontal
            ? Math.max(-0.6, Math.min(0.6, offset * 0.22))
            : 0;
          u.uOffset.value = offset;
          mesh.scale.set(w, h, 1);
          u.uMap.value = texture ?? null;
          u.uLoaded.value = texture ? 1 : 0;
          const image = texture?.image as
            { width: number; height: number } | undefined;
          const aspect = image ? image.width / image.height : w / h;
          u.uCover.value.set(
            Math.min(1, w / h / aspect),
            Math.min(1, aspect / (w / h)),
          );
          u.uBend.value = reduced.matches ? 0 : s.bend;
          u.uLiquid.value = cfg.liquid;
          u.uTime.value = time;
          const ro = rubberOptions();
          u.uViewportHeight.value = height;
          u.uVelocity.value = reduced.matches
            ? 0
            : railClamp(s.velocity, -4, 4, 0);
          u.uMinWidth.value = ro.min;
          u.uWaistSigma.value = ro.sigma;
          u.uStretchAmount.value = ro.stretch;
        }
        const label = labels[slot],
          card = fallback[slot];
        if (label && !rubber) {
          label.style.transform = `translate3d(${width / 2 + px + w / 2 + 8}px,${height / 2 + y - h / 2}px,0)`;
          label.style.height = `${h}px`;
          label.style.visibility = shown ? "visible" : "hidden";
          if (label.dataset.index !== String(index)) {
            label.dataset.index = String(index);
            label.children[0].textContent = items[index]?.year ?? "";
            label.children[1].textContent = items[index]?.title ?? "";
          }
        }
        if (label && rubber) {
          const first = label.children[0] as HTMLElement,
            second = label.children[1] as HTMLElement;
          first.textContent = elastic
            ? (items[index]?.title ?? "")
            : (items[index]?.year ?? "");
          second.textContent = elastic
            ? (items[index]?.year ?? "")
            : (items[index]?.title ?? "");
          const o = rubberOptions(),
            mid = profile(-y),
            layout = rubberLabels(
              -y + h / 2,
              -y - h / 2,
              w,
              height,
              reduced.matches ? 0 : railClamp(s.velocity, -4, 4, 0),
              o.min,
              o.sigma,
              o.stretch,
              elastic,
              (first.textContent?.length ?? 0) * (elastic ? 11 : 8) + 8,
              (second.textContent?.length ?? 0) * (elastic ? 11 : 8) + 8,
            );
          label.style.transform = `translate3d(${width / 2 + px}px,${height / 2 - layout.top}px,0)`;
          label.style.height = layout.height + "px";
          label.style.opacity = String(0.35 + 0.6 * mid.focus);
          label.style.visibility = shown ? "visible" : "hidden";
          for (const [node, anchor] of [
            [first, layout.first],
            [second, layout.second],
          ] as const) {
            node.style.height = anchor.length + "px";
            node.style.overflow = "hidden";
            node.style.textOverflow = "ellipsis";
            // Rotate around the text run itself; its translation stays in screen coordinates.
            node.style.transformOrigin = "center";
            node.style.transform = `translate3d(${anchor.x}px,${anchor.y}px,0) ${elastic ? "rotate(180deg)" : ""}`;
          }
        }
        if (card && !renderer) {
          card.style.width = `${w}px`;
          card.style.height = `${h}px`;
          card.style.transform = `translate3d(${width / 2 + px - w / 2}px,${height / 2 + y - h / 2}px,0)`;
          card.style.visibility = shown ? "visible" : "hidden";
          if (rubber) {
            const top = profile(-y + h / 2),
              bottom = profile(-y - h / 2),
              total = top.y - bottom.y;
            card.style.height = total + "px";
            card.style.transform = `translate3d(${width / 2 + px - w / 2}px,${height / 2 - top.y}px,0)`;
            const polygon: string[] = [];
            for (const side of [-1, 1])
              for (let j = 0; j <= 32; j++) {
                const k = side < 0 ? j : 32 - j,
                  point = profile(-y + h / 2 - (h * k) / 32);
                polygon.push(
                  `${50 + side * point.width * 50 + (point.shear / w) * 100}% ${((top.y - point.y) / total) * 100}%`,
                );
              }
            card.style.clipPath = "polygon(" + polygon.join(",") + ")";
          }

          if (card.dataset.index !== String(index)) {
            card.dataset.index = String(index);
            const img = card.querySelector("img")!;
            img.hidden = false;
            const src = items[index]?.src;
            if (src) img.src = src;
            else img.removeAttribute("src");
          }
        }
      }
      renderer?.render(scene, camera);
      announce();
      if (loaded >= count || !renderer) root.dataset.ready = "true";
    }
    function tick(now: number) {
      frame = 0;
      if (gone || halted()) {
        last = 0;
        return;
      }
      if (last && now - last < 1000 / 60 - 0.8) {
        frame = requestAnimationFrame(tick);
        return;
      }
      const dt = last ? Math.min(0.05, (now - last) / 1000) : 0;
      last = now;
      time += dt;
      const auto =
        count > 1 &&
        options.current.autoPlay !== false &&
        !drag &&
        time >= interaction &&
        !reduced.matches;
      if (auto !== isPlaying) {
        isPlaying = auto;
        setPlaying(auto);
      }
      if (reduced.matches) {
        s.cursor = s.target;
        s.velocity = s.bend = s.bendVelocity = s.coast = 0;
      } else if (elastic) {
        if (snapPending && !drag && time >= snapAt) {
          s.target = Math.round(s.target + s.coast * 0.05);
          s.coast = 0;
          snapPending = false;
        }
        if (auto && time >= nextAuto) {
          s.target = Math.round(s.target) + 1;
          nextAuto = time + 3.2;
        } else if (!auto) nextAuto = time + 3.2;
        advanceElasticRail(s, dt, count);
      } else
        advanceRail(
          s,
          dt,
          auto ? settings().speed : 0,
          settings().response,
          count,
        );
      paint();
      if (
        !reduced.matches &&
        (auto ||
          drag ||
          Math.abs(s.cursor - s.target) +
            Math.abs(s.velocity) +
            Math.abs(s.bend) +
            Math.abs(s.coast) >
            0.0001 ||
          (time < interaction && options.current.autoPlay !== false))
      )
        frame = requestAnimationFrame(tick);
      else last = 0;
    }
    function invalidate() {
      if (gone) return;
      if (options.current.paused) {
        cancelAnimationFrame(frame);
        frame = 0;
        last = 0;
        if (isPlaying) {
          isPlaying = false;
          setPlaying(false);
        }
        paint();
        return;
      }
      if (reduced.matches) {
        s.velocity = s.bend = s.bendVelocity = s.coast = 0;
        paint();
      }
      if (!frame && !halted()) frame = requestAnimationFrame(tick);
    }
    function goTo(index: number) {
      if (!count || options.current.paused) return;
      const current = railWrap(s.cursor, count),
        distance = railWrap(index - current + count / 2, count) - count / 2;
      snapPending = false;
      s.target = s.cursor + distance;
      s.coast = 0;
      interaction = time + 3.2;
      if (reduced.matches) s.cursor = s.target;
      invalidate();
    }
    select.current = goTo;
    wake.current = invalidate;
    function wheel(event: WheelEvent) {
      if (options.current.paused || count < 2 || event.ctrlKey || event.metaKey)
        return;
      event.preventDefault();
      const pixels =
        (horizontal && Math.abs(event.deltaX) > Math.abs(event.deltaY)
          ? event.deltaX
          : event.deltaY) *
        (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? height : 1);
      s.target += railClamp(pixels / Math.max(180, pitch), -1.8, 1.8, 0);
      s.coast = 0;
      interaction = time + 2.4;
      if (elastic) {
        snapPending = true;
        snapAt = time + 0.2;
      }
      if (reduced.matches) s.cursor = s.target;
      invalidate();
    }
    function down(event: PointerEvent) {
      if (
        options.current.paused ||
        count < 2 ||
        event.button !== 0 ||
        (event.target as HTMLElement).closest("button")
      )
        return;
      root.focus({ preventScroll: true });
      root.setPointerCapture?.(event.pointerId);
      root.dataset.pointer = "true";
      drag = {
        id: event.pointerId,
        y: axis(event),
        target: s.target,
        lastY: axis(event),
        lastTime: event.timeStamp,
        velocity: 0,
      };
      s.coast = 0;
      interaction = time + 3.2;
      root.dataset.dragging = "true";
      invalidate();
    }
    function move(event: PointerEvent) {
      if (!drag || drag.id !== event.pointerId) return;
      const delta = (drag.lastY - axis(event)) / Math.max(1, pitch),
        dt = Math.max(0.008, (event.timeStamp - drag.lastTime) / 1000);
      drag.velocity = drag.velocity * 0.35 + (delta / dt) * 0.65;
      s.target = drag.target + (drag.y - axis(event)) / Math.max(1, pitch);
      drag.lastY = axis(event);
      drag.lastTime = event.timeStamp;
      interaction = time + 3.2;
      if (reduced.matches) s.cursor = s.target;
      invalidate();
    }
    function up(event: PointerEvent) {
      if (!drag || drag.id !== event.pointerId) return;
      s.coast =
        reduced.matches || event.type === "pointercancel"
          ? 0
          : railClamp(drag.velocity, -4, 4, 0);
      const clicked = elastic && Math.abs(drag.y - axis(event)) < 5;
      drag = undefined;
      delete root.dataset.dragging;
      if (elastic) {
        if (clicked) {
          const rect = root.getBoundingClientRect();
          goTo(
            Math.round(
              s.cursor + (event.clientY - rect.top - height / 2) / pitch,
            ),
          );
        } else {
          snapPending = true;
          snapAt = time + 0.18;
        }
      }
      interaction = time + 3.2;
      if (root.hasPointerCapture?.(event.pointerId))
        root.releasePointerCapture(event.pointerId);
      invalidate();
    }
    function key(event: KeyboardEvent) {
      delete root.dataset.pointer;
      if (
        (event.target as HTMLElement).closest("button") ||
        !count ||
        options.current.paused
      )
        return;
      let index: number | undefined;
      if (event.key === "ArrowDown" || event.key === "ArrowRight")
        index = Math.round(s.target) + 1;
      if (event.key === "ArrowUp" || event.key === "ArrowLeft")
        index = Math.round(s.target) - 1;
      if (event.key === "Home") index = 0;
      if (event.key === "End") index = count - 1;
      if (index !== undefined) {
        event.preventDefault();
        goTo(index);
      }
    }
    function visibility() {
      cancelAnimationFrame(frame);
      frame = 0;
      last = 0;
      drag = undefined;
      delete root.dataset.dragging;
      invalidate();
    }
    function lost(event: Event) {
      event.preventDefault();
      disposeGPU();
      root.dataset.renderer = "fallback";
      loaded = count;
      invalidate();
    }
    function restored() {
      if (!gone) initialize();
    }
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(root);
    const intersection = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      visibility();
    });
    intersection.observe(root);
    root.addEventListener("wheel", wheel, { passive: false });
    root.addEventListener("pointerdown", down);
    root.addEventListener("pointermove", move);
    root.addEventListener("pointerup", up);
    root.addEventListener("pointercancel", up);
    root.addEventListener("lostpointercapture", up);
    root.addEventListener("keydown", key);
    surface.addEventListener("webglcontextlost", lost);
    surface.addEventListener("webglcontextrestored", restored);
    document.addEventListener("visibilitychange", visibility);
    reduced.addEventListener("change", visibility);
    initialize();
    return () => {
      gone = true;
      cancelAnimationFrame(frame);
      wake.current = () => {};
      select.current = () => {};
      resizeObserver.disconnect();
      intersection.disconnect();
      disposeGPU();
      root.removeEventListener("wheel", wheel);
      root.removeEventListener("pointerdown", down);
      root.removeEventListener("pointermove", move);
      root.removeEventListener("pointerup", up);
      root.removeEventListener("pointercancel", up);
      root.removeEventListener("lostpointercapture", up);
      root.removeEventListener("keydown", key);
      surface.removeEventListener("webglcontextlost", lost);
      surface.removeEventListener("webglcontextrestored", restored);
      document.removeEventListener("visibilitychange", visibility);
      reduced.removeEventListener("change", visibility);
    };
    // Item content alone owns the GPU; panel updates mutate existing uniforms.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature, props.variant]);
  useEffect(
    () => wake.current(),
    [
      props.paused,
      props.autoPlay,
      props.flowSpeed,
      props.liquidStrength,
      props.response,
      props.spacing,
      props.minWidthRatio,
      props.waistSigma,
      props.stretchAmount,
    ],
  );
  return (
    <section
      ref={host}
      className={`liquid-rail ${props.className ?? ""}`}
      style={props.style}
      data-variant={props.variant ?? "rail"}
      data-theme={props.theme ?? "auto"}
      data-compact={props.compact || undefined}
      aria-label={`${props.variant === "stream" ? "SilkStream" : props.variant === "horizontal" ? "ArcDrift" : props.variant === "elastic" ? "ElasticReel" : "LiquidRail"} image carousel`}
      aria-roledescription="carousel"
      tabIndex={0}
    >
      <style>{css}</style>
      <canvas ref={canvas} className="lr-canvas" aria-hidden="true" />
      <div className="lr-fallback" aria-hidden="true">
        {Array.from({ length: 7 }, (_, i) => (
          <div key={i} className="lr-fallback-card">
            <img
              alt=""
              draggable={false}
              onError={(e) => {
                e.currentTarget.hidden = true;
              }}
            />
          </div>
        ))}
      </div>
      <div className="lr-labels" aria-hidden="true">
        {Array.from({ length: 7 }, (_, i) => (
          <div className="lr-card-label" key={i}>
            <span />
            <span />
          </div>
        ))}
      </div>
      <span className="lr-edition" aria-hidden="true">
        A collection in motion{" "}
        <span>— {String(items.length).padStart(2, "0")}</span>
      </span>
      <div className="lr-heading" aria-hidden="true">
        <span>Selected</span>
        <span>{props.title || "perspectives."}</span>
      </div>
      {items.length ? (
        <>
          <nav className="lr-index" aria-label="Select image">
            {items.map((item, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Show ${item.title}`}
                aria-current={active === i ? "true" : undefined}
                onClick={() => select.current(i)}
              >
                <span className="lr-index-no" aria-hidden="true">
                  {String(i + 1).padStart(2, "0")}
                </span>
                {item.src ? (
                  <img
                    src={item.src}
                    alt=""
                    draggable={false}
                    loading="lazy"
                    onError={(e) => {
                      e.currentTarget.style.opacity = "0";
                    }}
                  />
                ) : (
                  <span className="lr-missing" />
                )}
              </button>
            ))}
          </nav>
          <div className="lr-footer" aria-hidden="true">
            <span>Scroll or drag ↕</span>
            <span>
              {String(active + 1).padStart(2, "0")}{" "}
              <i>/ {String(items.length).padStart(2, "0")}</i>
            </span>
          </div>
          <p className="lr-sr" aria-live={playing ? "off" : "polite"}>
            {items[active]?.title}, {active + 1} of {items.length}. Use arrow
            keys or drag to browse.
          </p>
        </>
      ) : (
        <p className="lr-empty" role="status">
          Add images to start your collection.
        </p>
      )}
    </section>
  );
}

const css = `
.liquid-rail{--lr-bg:#f5f2e9;--lr-ink:#292923;--lr-muted:#797970;position:relative;isolation:isolate;width:100%;height:100%;min-height:240px;overflow:hidden;container-type:inline-size;container-name:liquidrail;background:var(--lr-bg);color:var(--lr-ink);font-family:Urbanist,system-ui,sans-serif;touch-action:pan-x pinch-zoom;cursor:grab;user-select:none;outline:none}
.liquid-rail[data-theme=dark],html[data-theme=dark] .liquid-rail[data-theme=auto]{--lr-bg:#141512;--lr-ink:#e8e8dc;--lr-muted:#93968b}
@media(prefers-color-scheme:dark){.liquid-rail[data-theme=auto]{--lr-bg:#141512;--lr-ink:#e8e8dc;--lr-muted:#93968b}html[data-theme=light] .liquid-rail[data-theme=auto]{--lr-bg:#f5f2e9;--lr-ink:#292923;--lr-muted:#797970}}
.liquid-rail:focus-visible{outline:2px solid var(--lr-ink);outline-offset:-5px}.liquid-rail[data-pointer=true]:focus-visible{outline:none}.liquid-rail[data-dragging=true]{cursor:grabbing}.liquid-rail *{box-sizing:border-box}.lr-canvas,.lr-fallback,.lr-labels{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}.lr-canvas{display:block;opacity:0}.liquid-rail[data-renderer=webgl] .lr-canvas{opacity:1}.liquid-rail[data-renderer=webgl] .lr-fallback{display:none}.lr-fallback-card{position:absolute;top:0;left:0;overflow:hidden;background:#77756e;will-change:transform}.lr-fallback-card img{height:100%;width:100%;object-fit:cover}.lr-card-label{position:absolute;top:0;left:0;display:flex;justify-content:space-between;writing-mode:vertical-rl;font-size:10px;line-height:1;letter-spacing:.015em;text-transform:uppercase;will-change:transform}.lr-edition{position:absolute;top:30px;left:30px;font-size:10px;letter-spacing:.06em}.lr-edition>span{color:var(--lr-muted)}.lr-heading{position:absolute;left:30px;bottom:50px;display:flex;flex-direction:column;max-width:32%;overflow-wrap:anywhere;font-size:clamp(30px,5.8cqw,76px);line-height:.88;font-weight:500;letter-spacing:-.065em;pointer-events:none}.lr-heading>span:last-child{color:var(--lr-muted)}.lr-index{position:absolute;right:30px;top:50%;transform:translateY(-50%);display:flex;flex-direction:column;gap:6px;z-index:2}.lr-index button{position:relative;display:block;width:38px;height:46px;padding:0;border:0;background:transparent;cursor:pointer;opacity:.42;transition:opacity .25s ease,transform .35s ease;transform-origin:right center}.lr-index button img,.lr-missing{display:block;width:100%;height:100%;object-fit:cover}.lr-missing{background:#77756e}.lr-index button[aria-current=true]{opacity:1;transform:translateX(-6px)}.lr-index button:hover,.lr-index button:focus-visible{opacity:1}.lr-index button:focus-visible{outline:1px solid var(--lr-ink);outline-offset:3px}.lr-index-no{position:absolute;left:-21px;top:4px;font-size:9px;color:var(--lr-ink);opacity:0}.lr-index button[aria-current=true] .lr-index-no,.lr-index button:focus-visible .lr-index-no{opacity:1}.lr-footer{position:absolute;bottom:25px;left:30px;right:30px;display:flex;justify-content:space-between;align-items:flex-end;font-size:10px;letter-spacing:.015em;pointer-events:none}.lr-footer>span:first-child{margin-left:auto;margin-right:35px;color:var(--lr-muted)}.lr-footer i{font-style:normal;color:var(--lr-muted)}.lr-sr{position:absolute;width:1px;height:1px;margin:-1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap}.lr-empty{position:absolute;inset:45% 10% auto;text-align:center;font-size:14px;color:var(--lr-muted)}
@container liquidrail (max-width:580px){.lr-heading{display:block;writing-mode:vertical-rl;transform:rotate(180deg);white-space:nowrap;left:16px;bottom:20px;font-size:22px;line-height:1;letter-spacing:-.04em}.lr-heading>span:first-child{display:none}.lr-edition{top:16px;left:16px;font-size:8px;max-width:70px;line-height:1.4}.lr-index{right:14px;gap:5px}.lr-index button{width:24px;height:30px}.lr-index-no{font-size:7px;left:-16px}.lr-card-label{font-size:8px}.lr-footer{right:16px;left:auto;bottom:18px;font-size:9px}.lr-footer>span:first-child{display:none}}
@container liquidrail (max-width:350px){.lr-heading{font-size:19px;left:14px}.lr-edition{max-width:36px;font-size:7px}.lr-index{right:10px}.lr-index button{width:21px;height:26px}}
.liquid-rail[data-variant=stream] .lr-heading,.liquid-rail[data-variant=stream] .lr-edition,.liquid-rail[data-variant=stream] .lr-footer,.liquid-rail[data-variant=horizontal] .lr-heading,.liquid-rail[data-variant=horizontal] .lr-edition,.liquid-rail[data-variant=horizontal] .lr-labels,.liquid-rail[data-variant=horizontal] .lr-footer{display:none}
.liquid-rail[data-variant=horizontal]{touch-action:pan-y pinch-zoom}.liquid-rail[data-variant=horizontal] .lr-index{top:auto;bottom:20px;left:50%;right:auto;transform:translateX(-50%);flex-direction:row}.liquid-rail[data-variant=horizontal] .lr-index button{width:30px;height:36px}.liquid-rail[data-variant=horizontal] .lr-index button[aria-current=true]{transform:translateY(-5px)}.liquid-rail[data-variant=horizontal] .lr-index-no,.liquid-rail[data-variant=stream] .lr-index-no{display:none}
.liquid-rail[data-variant=elastic] .lr-edition,.liquid-rail[data-variant=elastic] .lr-heading,.liquid-rail[data-variant=elastic] .lr-footer,.liquid-rail[data-variant=elastic] .lr-index{display:none}
.liquid-rail[data-variant=elastic] .lr-card-label,.liquid-rail[data-variant=stream] .lr-card-label{display:block;writing-mode:initial}
.liquid-rail[data-variant=elastic] .lr-card-label>span,.liquid-rail[data-variant=stream] .lr-card-label>span{position:absolute;top:0;left:0;writing-mode:vertical-rl;white-space:nowrap}
.liquid-rail[data-variant=elastic] .lr-card-label>span{font-family:ui-monospace,monospace;font-size:11px;letter-spacing:.2em;transform-origin:top left}
@media(prefers-reduced-motion:reduce){.lr-index button{transition:none}}
`;
