"use client";
import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
/** Preserve desktop proportions: both axes share the same scale. */
export default function SectionPreviewFit({
  children,
  height = 860,
  responsive = false,
  frameWidth = 1100,
}: {
  children: ReactNode;
  height?: number;
  responsive?: boolean;
  frameWidth?: number;
}) {
  const root = useRef<HTMLDivElement>(null),
    content = useRef<HTMLDivElement>(null),
    [width, setWidth] = useState(frameWidth),
    [naturalHeight, setNaturalHeight] = useState(height);
  useLayoutEffect(() => {
    const host = root.current!,
      inner = content.current!;
    const measure = () => {
      setWidth(host.clientWidth || frameWidth);
      setNaturalHeight(Math.max(height, inner.scrollHeight));
    };
    const size = new ResizeObserver(measure);
    measure();
    size.observe(host);
    size.observe(inner);
    return () => size.disconnect();
  }, [height, frameWidth]);
  const mobile = responsive && width < 560,
    scale = mobile ? 1 : width / frameWidth;
  return (
    <div
      ref={root}
      style={{
        width: "100%",
        height: naturalHeight * scale,
        overflow: "hidden",
        position: "relative",
      }}
    >
      <div
        ref={content}
        style={{
          width: mobile ? "100%" : frameWidth,
          minHeight: height,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
        }}
      >
        {children}
      </div>
    </div>
  );
}
