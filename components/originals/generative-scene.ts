"use client";
import { useEffect, useRef, useState } from "react";
export type GenerativeScene = { sync: () => void; dispose: () => void };
/** One renderer per canvas; context restoration recreates only its owned resources. */
export function useGenerativeScene<T>(
  create: (
    canvas: HTMLCanvasElement,
    compact: boolean,
    get: () => T,
  ) => GenerativeScene,
  options: T,
  compact: boolean,
) {
  const host = useRef<HTMLDivElement>(null),
    canvas = useRef<HTMLCanvasElement>(null),
    latest = useRef(options),
    scene = useRef<GenerativeScene | null>(null),
    [generation, restart] = useState(0),
    [failed, setFailed] = useState(false);
  latest.current = options;
  useEffect(() => {
    const el = host.current!,
      surface = canvas.current!;
    delete el.dataset.ready;
    delete el.dataset.failed;
    setFailed(false);
    try {
      scene.current = create(surface, compact, () => latest.current);
    } catch (error) {
      console.error("Motiqo scene:", error);
      el.dataset.failed = "true";
      setFailed(true);
    }
    const lost = (e: Event) => {
      e.preventDefault();
      scene.current?.dispose();
      scene.current = null;
      delete el.dataset.ready;
      el.dataset.failed = "true";
      setFailed(true);
    };
    const restored = () => restart((n) => n + 1);
    surface.addEventListener("webglcontextlost", lost);
    surface.addEventListener("webglcontextrestored", restored);
    return () => {
      surface.removeEventListener("webglcontextlost", lost);
      surface.removeEventListener("webglcontextrestored", restored);
      scene.current?.dispose();
      scene.current = null;
    };
  }, [create, compact, generation]);
  useEffect(() => scene.current?.sync());
  return { host, canvas, failed };
}
