"use client";
import { useEffect, useRef } from "react";
import { heroClock, type HeroFrame } from "./hero-clock";
export type CollectionHeroProps = {
  paused?: boolean;
  brandName?: string;
  className?: string;
};
export function useCollectionScene(
  paused: boolean,
  draw?: (frame: HeroFrame, host: HTMLElement) => void,
) {
  const root = useRef<HTMLElement>(null),
    pause = useRef(paused),
    render = useRef(draw),
    clock = useRef<ReturnType<typeof heroClock> | null>(null);
  pause.current = paused;
  render.current = draw;
  useEffect(() => {
    const node = root.current!;
    clock.current = heroClock(
      node,
      (frame) => {
        node.dataset.still = String(frame.still);
        node.style.setProperty("--scene-time", String(frame.time));
        render.current?.(frame, node);
      },
      undefined,
      () => pause.current,
    );
    return () => clock.current?.dispose();
  }, []);
  useEffect(() => {
    clock.current?.invalidate();
  }, [paused]);
  return { root, invalidate: () => clock.current?.invalidate() };
}
export function Mark({
  kind = "orbit",
}: {
  kind?: "orbit" | "leaf" | "star" | "sway";
}) {
  return (
    <svg
      width="26"
      height="26"
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
    >
      {kind === "leaf" ? (
        <>
          <path d="M6 25C3 9 15 4 27 5c0 13-6 23-21 20Z" fill="currentColor" />
          <path
            d="m5 27 16-16"
            stroke="var(--logo-cut,#f2f5e9)"
            strokeWidth="2"
          />
        </>
      ) : kind === "star" ? (
        <path
          d="m16 1 3.1 10.9L30 16l-10.9 3.1L16 31l-3.1-11.9L2 16l10.9-4.1L16 1Z"
          stroke="currentColor"
          strokeWidth="1.3"
        />
      ) : kind === "sway" ? (
        <>
          <path
            d="M3 10c7-12 13 12 20 0M3 21c7-12 13 12 20 0"
            stroke="currentColor"
            strokeWidth="5"
            strokeLinecap="round"
          />
        </>
      ) : (
        <>
          <ellipse
            cx="16"
            cy="16"
            rx="7"
            ry="14"
            stroke="currentColor"
            strokeWidth="1.5"
            transform="rotate(38 16 16)"
          />
          <ellipse
            cx="16"
            cy="16"
            rx="7"
            ry="14"
            stroke="currentColor"
            strokeWidth="1.5"
            transform="rotate(-38 16 16)"
          />
          <circle cx="16" cy="16" r="3" fill="currentColor" />
        </>
      )}
    </svg>
  );
}
