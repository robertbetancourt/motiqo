"use client";
import { useEffect, useRef, useState } from "react";

export type HalftoneWordmarkProps = {
  word?: string;
  accent?: string;
  paused?: boolean;
  compact?: boolean;
  className?: string;
};
export default function HalftoneWordmark({
  word = "HalftoneWordmark",
  accent = "#ee926c",
  paused = false,
  compact = false,
  className = "",
}: HalftoneWordmarkProps) {
  const canvas = useRef<HTMLCanvasElement>(null),
    pulse = useRef<() => void>(() => {}),
    [ready, setReady] = useState(false);
  const label = word.trim().slice(0, 24) || "HalftoneWordmark";
  useEffect(() => {
    const el = canvas.current;
    if (!el) return;
    let ctx: CanvasRenderingContext2D | null = null;
    try {
      ctx = el.getContext("2d");
    } catch {}
    if (!ctx) return;
    const ink = ctx,
      media = matchMedia("(prefers-reduced-motion: reduce)");
    let points: {
        x: number;
        y: number;
        bx: number;
        by: number;
        vx: number;
        vy: number;
      }[] = [],
      width = 0,
      height = 0,
      frame = 0,
      last = 0,
      visible = true,
      disposed = false,
      wave = -1;
    const pointer = { x: -10000, y: -10000 },
      origin = { x: 0, y: 0 };
    const paint = (time: number) => {
      frame = 0;
      if (disposed || !visible || document.hidden) return;
      const dt = Math.min(2, (time - last) / 16.67 || 1);
      last = time;
      let moving = false;
      ink.clearRect(0, 0, width, height);
      if (wave >= 0) {
        wave += 7 * dt;
        if (wave > Math.hypot(width, height) + 90) wave = -1;
        else moving = true;
      }
      for (const p of points) {
        if (!paused && !media.matches) {
          const dx = p.x - pointer.x,
            dy = p.y - pointer.y,
            d = Math.hypot(dx, dy),
            force = Math.max(0, 1 - d / 90);
          const ring =
            wave >= 0
              ? Math.max(
                  0,
                  1 -
                    Math.abs(
                      Math.hypot(p.bx - origin.x, p.by - origin.y) - wave,
                    ) /
                      34,
                )
              : 0;
          const angle = Math.atan2(p.by - origin.y, p.bx - origin.x);
          p.vx +=
            (p.bx - p.x) * 0.055 * dt +
            (dx / (d || 1)) * force * 1.9 * dt +
            Math.cos(angle) * ring * 1.25 * dt;
          p.vy +=
            (p.by - p.y) * 0.055 * dt +
            (dy / (d || 1)) * force * 1.9 * dt +
            Math.sin(angle) * ring * 1.25 * dt;
          p.vx *= Math.pow(0.78, dt);
          p.vy *= Math.pow(0.78, dt);
          p.x += p.vx * dt;
          p.y += p.vy * dt;
        }
        const shift = Math.hypot(p.x - p.bx, p.y - p.by);
        if (shift > 0.08 || Math.abs(p.vx) + Math.abs(p.vy) > 0.08)
          moving = true;
        ink.fillStyle = shift > 2 ? accent : "#d5d8cf";
        ink.globalAlpha =
          0.48 +
          Math.min(0.52, (p.by / Math.max(1, height)) * 0.5 + shift / 35);
        ink.beginPath();
        ink.arc(
          p.x,
          p.y,
          Math.max(1.1, Math.min(2.7, width / 165)),
          0,
          Math.PI * 2,
        );
        ink.fill();
      }
      ink.globalAlpha = 1;
      if (moving && !paused && !media.matches)
        frame = requestAnimationFrame(paint);
    };
    const wake = () => {
      if (!frame && visible && !document.hidden) {
        last = 0;
        frame = requestAnimationFrame(paint);
      }
    };
    const resize = () => {
      const rect = el.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      if (!width || !height) return;
      const dpr = Math.min(devicePixelRatio || 1, 2);
      el.width = Math.round(width * dpr);
      el.height = Math.round(height * dpr);
      ink.setTransform(dpr, 0, 0, dpr, 0, 0);
      const mask = document.createElement("canvas");
      mask.width = Math.ceil(width);
      mask.height = Math.ceil(height);
      const text = mask.getContext("2d");
      if (!text) return;
      text.font = "900 100px Urbanist, system-ui, sans-serif";
      const size = Math.min(
        height * 1.03,
        ((width - 12) / Math.max(1, text.measureText(label).width)) * 100,
      );
      const stretch = Math.min(3, (height * 0.95) / Math.max(1, size));
      text.setTransform(1, 0, 0, stretch, 0, 0);
      text.font = `900 ${size}px Urbanist, system-ui, sans-serif`;
      text.letterSpacing = `${-size * 0.055}px`;
      text.textAlign = "center";
      text.textBaseline = "middle";
      text.fillText(label, width / 2, (height * 0.59) / stretch);
      const pixels = text.getImageData(0, 0, mask.width, mask.height).data,
        step = Math.max(4, Math.min(6, width / 125));
      points = [];
      for (let y = 2; y < height; y += step)
        for (let x = 2; x < width; x += step)
          if (
            pixels[(Math.floor(y) * mask.width + Math.floor(x)) * 4 + 3] > 100
          )
            points.push({ x, y, bx: x, by: y, vx: 0, vy: 0 });
      setReady(points.length > 0);
      wake();
    };
    const move = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      pointer.x = e.clientX - r.left;
      pointer.y = e.clientY - r.top;
      wake();
    };
    const leave = () => {
      pointer.x = pointer.y = -10000;
      wake();
    };
    const click = (e?: PointerEvent) => {
      if (paused || media.matches) return;
      origin.x = e ? e.clientX - el.getBoundingClientRect().left : width / 2;
      origin.y = e ? e.clientY - el.getBoundingClientRect().top : height / 2;
      wave = 0;
      wake();
    };
    pulse.current = click;
    const ro = new ResizeObserver(resize);
    ro.observe(el);
    const io = new IntersectionObserver((entries) => {
      visible = entries[0]?.isIntersecting ?? true;
      if (visible) wake();
      else {
        cancelAnimationFrame(frame);
        frame = 0;
      }
    });
    io.observe(el);
    const visibility = () => {
      if (document.hidden) {
        cancelAnimationFrame(frame);
        frame = 0;
      } else wake();
    };
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerleave", leave);
    el.addEventListener("pointerdown", click);
    document.addEventListener("visibilitychange", visibility);
    media.addEventListener("change", resize);
    resize();
    document.fonts?.ready.then(() => {
      if (!disposed) resize();
    });
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      ro.disconnect();
      io.disconnect();
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerleave", leave);
      el.removeEventListener("pointerdown", click);
      document.removeEventListener("visibilitychange", visibility);
      media.removeEventListener("change", resize);
      pulse.current = () => {};
    };
  }, [label, accent, paused]);
  return (
    <section
      className={`halftone-wordmark ${className}`}
      data-compact={compact || undefined}
      data-ready={ready || undefined}
      aria-label={`${label} interactive wordmark`}
    >
      <style>{`.halftone-wordmark{position:relative;width:100%;height:100%;min-height:280px;display:flex;flex-direction:column;justify-content:space-between;background:#000;color:#f3f3ed;overflow:hidden;font:12px Urbanist,system-ui,sans-serif;container-type:inline-size}.hw-top{display:flex;align-items:start;justify-content:space-between;gap:24px;position:absolute;z-index:2;right:0;top:0;padding:16px}.hw-top p{margin:0;font-size:11px;letter-spacing:.13em;line-height:1.7}.hw-top span{display:block;color:#879084;font-size:10px;letter-spacing:0;margin-top:10px}.hw-top button{border:1px solid #d5d8cf30;background:none;color:inherit;font:inherit;border-radius:99px;width:44px;height:44px;cursor:pointer}.hw-top button:hover{background:#d5d8cf12}.hw-top button:focus-visible{outline:2px solid ${accent};outline-offset:4px}.hw-field{position:relative;flex:1;min-height:190px}.hw-field canvas{width:100%;height:100%;position:absolute;inset:0;touch-action:pan-y}.hw-fallback{position:absolute;inset:0;display:grid;place-items:center;font-size:18cqw;font-weight:900;letter-spacing:-.07em;overflow:hidden}.halftone-wordmark[data-compact] .hw-top{padding:26px 22px 6px}@container(max-width:450px){.hw-top{padding:28px 22px 8px}.hw-top p{font-size:9px}.hw-top span{font-size:9px}.hw-field{min-height:170px}}`}</style>
      <header className="hw-top">
        <button
          type="button"
          aria-label="Send a wave through the wordmark"
          onClick={() => pulse.current()}
        >
          ↗
        </button>
      </header>
      <div className="hw-field">
        <span
          className="hw-fallback"
          style={{ visibility: ready ? "hidden" : "visible" }}
          aria-hidden="true"
        >
          {label}
        </span>
        <canvas ref={canvas} aria-hidden="true" />
      </div>
    </section>
  );
}
