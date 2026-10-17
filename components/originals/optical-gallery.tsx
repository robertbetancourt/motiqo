"use client";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { createNativeGL, nativeClamp } from "./native-gl";
import { effectRuntime } from "./effect-runtime";
import { galleryFragment } from "./gallery-shaders";
import {
  galleryCover,
  galleryWrap,
  paintGalleryStudy,
  type GallerySlide,
} from "./carousel-art";
export type OpticalGalleryProps = {
  slides?: GallerySlide[];
  duration?: number;
  strength?: number;
  autoplay?: number;
  ink?: string;
  paused?: boolean;
  compact?: boolean;
  className?: string;
  style?: CSSProperties;
  height?: number | string;
  onChange?: (index: number) => void;
  ariaLabel?: string;
};
type Props = OpticalGalleryProps & {
  mode: "water" | "iris";
  defaults: GallerySlide[];
};
/** Shared resource ownership; the two public galleries have different optical transitions. */
export function OpticalGallery({
  slides,
  defaults,
  mode,
  duration = 1450,
  strength = 1,
  autoplay = 0,
  ink = "#f4f0e8",
  paused = false,
  compact = false,
  className = "",
  style,
  height,
  onChange,
  ariaLabel,
}: Props) {
  const collection = slides?.length ? slides : defaults,
    root = useRef<HTMLDivElement>(null),
    canvas = useRef<HTMLCanvasElement>(null);
  const [index, setIndex] = useState(0),
    [generation, restart] = useState(0),
    [fallback, setFallback] = useState<string>(),
    [fallbackNext, setFallbackNext] = useState<string>();
  const request = useRef<(dir: number, origin?: [number, number]) => void>(
      () => {},
    ),
    sync = useRef<() => void>(() => {}),
    down = useRef<{ x: number; y: number } | null>(null);
  const options = useRef({ duration, strength, autoplay, paused, onChange });
  options.current = { duration, strength, autoplay, paused, onChange };
  useEffect(() => {
    const host = root.current!,
      surface = canvas.current!;
    let dead = false,
      visible = true,
      focused = false,
      hovered = false,
      active = 0,
      elapsed = 0,
      idle = 0,
      transition: {
        from: number;
        to: number;
        origin: [number, number];
        p: number;
      } | null = null,
      queued: number | null = null;
    let gpu: ReturnType<typeof createNativeGL> | undefined,
      pass: ReturnType<ReturnType<typeof createNativeGL>["pass"]> | undefined;
    const textures: WebGLTexture[] = [],
      sizes: [number, number][] = [],
      urls: string[] = [],
      images: HTMLImageElement[] = [];
    setIndex(0);
    delete host.dataset.ready;
    try {
      gpu = createNativeGL(surface);
      pass = gpu.pass(galleryFragment);
      setFallback(undefined);
    } catch {
      gpu?.dispose();
      gpu = undefined;
    }
    let loaded = false;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    const begin = (target: number, origin: [number, number] = [0.5, 0.5]) => {
      if (!loaded || collection.length < 2) return;
      const to = galleryWrap(target, collection.length);
      if (transition) {
        queued = to;
        return;
      }
      if (to === active) return;
      idle = 0;
      setIndex(to);
      options.current.onChange?.(to);
      if (reduced.matches || options.current.paused) {
        active = to;
        if (!gpu) setFallback(urls[to]);
        setFallbackNext(undefined);
        clock.invalidate();
        return;
      }
      transition = { from: active, to, origin, p: 0 };
      host.dataset.transitioning = "true";
      host.dataset.slide = String(to);
      elapsed = 0;
      if (!gpu) {
        setFallback(urls[active]);
        setFallbackNext(urls[to]);
      }
      clock.invalidate();
    };
    request.current = (dir, origin) =>
      begin((transition?.to ?? active) + dir, origin);
    const clock = effectRuntime(
      host,
      surface,
      (_, dt) => {
        if (!loaded) return false;
        // Count from the start of each reveal, including its animation time.
        if (
          options.current.autoplay > 0 &&
          !hovered &&
          !focused &&
          visible &&
          !reduced.matches &&
          !options.current.paused
        ) {
          idle += dt * 1000;
          if (!transition && idle >= Math.max(1800, options.current.autoplay))
            begin(active + 1, [0.5, 0.5]);
        }
        if (transition) {
          elapsed += dt * 1000;
          transition.p =
            reduced.matches || options.current.paused
              ? 1
              : Math.min(
                  1,
                  elapsed / nativeClamp(options.current.duration, 200, 5000),
                );
          if (!gpu)
            host.style.setProperty("--gallery-reveal", String(transition.p));
        }
        if (gpu && pass) {
          const aspect = surface.width / surface.height,
            a = transition?.from ?? active,
            b = transition?.to ?? active;
          gpu.draw(pass, null, {
            uFrom: { texture: textures[a] },
            uTo: { texture: textures[b] },
            uResolution: [surface.width, surface.height],
            uFromCover: galleryCover(aspect, sizes[a][0] / sizes[a][1]),
            uToCover: galleryCover(aspect, sizes[b][0] / sizes[b][1]),
            uOrigin: transition?.origin ?? [0.5, 0.5],
            uProgress: transition?.p ?? 0,
            uMode: mode === "water" ? 0 : 1,
            uStrength: nativeClamp(options.current.strength, 0, 2),
            uTime: 0,
          });
        }
        if (transition?.p === 1) {
          active = transition.to;
          transition = null;
          if (!gpu) setFallback(urls[active]);
          setFallbackNext(undefined);
          delete host.dataset.transitioning;
          if (queued !== null) {
            const next = queued;
            queued = null;
            begin(next);
          }
        }
      },
      () => options.current.paused,
      undefined,
      compact,
    );
    sync.current = clock.invalidate;
    Promise.all(
      collection.map(async (slide, i) => {
        const study = paintGalleryStudy(slide);
        let image: HTMLImageElement | HTMLCanvasElement = study;
        if (slide.image) {
          const img = new Image();
          images.push(img);
          img.crossOrigin = "anonymous";
          const ok = await new Promise<boolean>((resolve) => {
            img.onload = () => resolve(true);
            img.onerror = () => resolve(false);
            img.src = slide.image!;
          });
          if (ok) image = img;
        }
        if (dead) return;
        sizes[i] = [image.width, image.height];
        urls[i] =
          image instanceof HTMLCanvasElement
            ? image.toDataURL("image/jpeg", 0.9)
            : image.src;
        if (gpu) {
          const tex = gpu.texture();
          try {
            gpu.upload(tex, image);
          } catch {
            gpu.upload(tex, study);
          }
          textures[i] = tex;
        }
      }),
    )
      .then(() => {
        if (dead) return;
        loaded = true;
        host.dataset.slide = "0";
        if (!gpu) setFallback(urls[0]);
        clock.invalidate();
      })
      .catch(() => {
        if (!dead) {
          host.dataset.failed = "true";
          setFallback("");
        }
      });
    const enter = () => {
        hovered = true;
      },
      leave = () => {
        hovered = false;
      },
      focus = () => {
        focused = true;
      },
      blur = (e: FocusEvent) => {
        if (!host.contains(e.relatedTarget as Node)) focused = false;
      };
    host.addEventListener("pointerenter", enter);
    host.addEventListener("pointerleave", leave);
    host.addEventListener("focusin", focus);
    host.addEventListener("focusout", blur);
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
    });
    observer.observe(host);
    const lost = (e: Event) => {
      e.preventDefault();
      gpu?.dispose();
      gpu = undefined;
      setFallback(urls[active]);
      clock.invalidate();
    };
    const restore = () => restart((n) => n + 1);
    surface.addEventListener("webglcontextlost", lost);
    surface.addEventListener("webglcontextrestored", restore);
    return () => {
      dead = true;
      request.current = () => {};
      sync.current = () => {};
      clock.dispose();
      observer.disconnect();
      gpu?.dispose();
      images.forEach((img) => {
        img.onload = null;
        img.onerror = null;
        img.src = "";
      });
      host.removeEventListener("pointerenter", enter);
      host.removeEventListener("pointerleave", leave);
      host.removeEventListener("focusin", focus);
      host.removeEventListener("focusout", blur);
      surface.removeEventListener("webglcontextlost", lost);
      surface.removeEventListener("webglcontextrestored", restore);
    };
  }, [collection, mode, compact, generation]);
  useEffect(() => sync.current(), [duration, strength, autoplay, paused]);
  const current = collection[galleryWrap(index, collection.length)];
  return (
    <div
      ref={root}
      className={`mq-gallery ${compact ? "mq-gallery-compact" : ""} mq-gallery-${mode} ${className}`}
      style={
        {
          ...style,
          ...(height !== undefined ? { height } : {}),
          "--gallery-ink": ink,
        } as CSSProperties
      }
      role="region"
      aria-roledescription="carousel"
      aria-label={
        ariaLabel ?? (mode === "water" ? "Tidal image studies" : "Light atlas")
      }
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.target !== e.currentTarget) return;
        if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
          e.preventDefault();
          request.current(e.key === "ArrowRight" ? 1 : -1);
        }
      }}
      onPointerDown={(e) => {
        if ((e.target as HTMLElement).closest("button")) return;
        down.current = { x: e.clientX, y: e.clientY };
      }}
      onPointerUp={(e) => {
        const start = down.current;
        down.current = null;
        if (!start || (e.target as HTMLElement).closest("button")) return;
        const rect = e.currentTarget.getBoundingClientRect(),
          dx = e.clientX - start.x,
          dy = e.clientY - start.y;
        if (Math.abs(dy) > Math.max(35, Math.abs(dx))) return;
        const x = (e.clientX - rect.left) / rect.width,
          y = 1 - (e.clientY - rect.top) / rect.height;
        request.current(
          Math.abs(dx) > 35 ? (dx < 0 ? 1 : -1) : x < 0.33 ? -1 : 1,
          [x, y],
        );
      }}
      onPointerCancel={() => {
        down.current = null;
      }}
    >
      <style>{styles}</style>
      <canvas ref={canvas} aria-hidden="true" />
      {fallback && (
        <img className="mq-gallery-fallback" src={fallback} alt="" />
      )}
      {fallbackNext && (
        <img
          className="mq-gallery-fallback mq-gallery-fallback-next"
          src={fallbackNext}
          alt=""
        />
      )}
      <div className="mq-gallery-navigation">
        <button
          type="button"
          aria-label="Previous slide"
          disabled={collection.length < 2}
          onClick={() => request.current(-1)}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M19 12H5m6-6-6 6 6 6" />
          </svg>
        </button>
        <button
          type="button"
          aria-label="Next slide"
          disabled={collection.length < 2}
          onClick={() => request.current(1)}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M5 12h14m-6-6 6 6-6 6" />
          </svg>
        </button>
      </div>
      <span className="mq-gallery-sr" aria-live={autoplay ? "off" : "polite"}>
        {current.alt ?? current.title} · {index + 1} of {collection.length}
      </span>
    </div>
  );
}
const styles = `
.mq-gallery{position:relative;isolation:isolate;width:100%;height:100%;min-height:240px;overflow:hidden;background:#080b10;color:var(--gallery-ink);font-family:inherit;touch-action:pan-y;outline:none;container-type:inline-size}
.mq-gallery:focus-visible{outline:2px solid var(--gallery-ink);outline-offset:-4px}
.mq-gallery>canvas,.mq-gallery-fallback{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.mq-gallery-fallback-next{opacity:var(--gallery-reveal,0)}
.mq-gallery-navigation{position:absolute;bottom:clamp(18px,5cqw,32px);left:50%;translate:-50% 0;display:flex;gap:10px;padding:6px;border:1px solid #ffffff24;border-radius:99px;background:#080b102e;backdrop-filter:blur(16px);box-shadow:0 4px 24px #0002}
.mq-gallery-navigation button{display:grid;place-items:center;width:44px;height:44px;padding:0;border-radius:50%;border:1px solid #ffffff26;color:inherit;background:#080b1040;cursor:pointer;transition:background .3s,border-color .3s,scale .3s;line-height:1}
.mq-gallery-navigation button:hover{background:#ffffff25;border-color:#ffffff70;scale:1.06}.mq-gallery-navigation button:active{transform:none;scale:.95}.mq-gallery-navigation button:disabled{opacity:.3;cursor:default}
.mq-gallery-navigation svg{display:block;width:20px;height:20px;fill:none;stroke:currentColor;stroke-width:1.5;stroke-linecap:round;stroke-linejoin:round;flex:none;transform:none}
.mq-gallery button:focus-visible{outline:2px solid currentColor;outline-offset:4px}
.mq-gallery-sr{position:absolute;clip-path:inset(50%);width:1px;height:1px;overflow:hidden}
.mq-gallery-compact .mq-gallery-navigation{bottom:16px;padding:4px;gap:6px}.mq-gallery-compact .mq-gallery-navigation button{width:36px;height:36px}
@media(prefers-reduced-motion:reduce){.mq-gallery button{transition:none}}
`;
