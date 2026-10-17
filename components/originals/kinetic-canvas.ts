"use client";
import { useEffect, useRef } from "react";
import { effectRuntime } from "./effect-runtime";
export type KineticFrame = {
  g: CanvasRenderingContext2D;
  w: number;
  h: number;
  time: number;
  dt: number;
  still: boolean;
};
/** Shared visibility, DPR, pause and resource ownership for the three 2D studies. */
export function useKineticCanvas(
  render: (frame: KineticFrame) => void,
  paused: boolean,
  compact: boolean,
) {
  const host = useRef<HTMLDivElement>(null),
    canvas = useRef<HTMLCanvasElement>(null),
    latest = useRef({ render, paused }),
    sync = useRef<() => void>(() => {});
  latest.current = { render, paused };
  useEffect(() => {
    const el = host.current!,
      surface = canvas.current!,
      g = surface.getContext("2d");
    if (!g) {
      el.dataset.failed = "true";
      return;
    }
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    const clock = effectRuntime(
      el,
      surface,
      (time, dt) => {
        const w = el.clientWidth,
          h = el.clientHeight;
        if (!w || !h) return false;
        g.setTransform(surface.width / w, 0, 0, surface.height / h, 0, 0);
        g.globalCompositeOperation = "source-over";
        g.globalAlpha = 1;
        g.shadowBlur = 0;
        g.clearRect(0, 0, w, h);
        latest.current.render({
          g,
          w,
          h,
          time,
          dt,
          still: latest.current.paused || reduced.matches,
        });
      },
      () => latest.current.paused,
      undefined,
      compact,
    );
    sync.current = clock.invalidate;
    return () => {
      sync.current = () => {};
      clock.dispose();
      surface.width = surface.height = 0;
    };
  }, [compact]);
  useEffect(() => sync.current());
  return { host, canvas, invalidate: () => sync.current() };
}
