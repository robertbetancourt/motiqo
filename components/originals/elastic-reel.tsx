"use client";
import LiquidRail from "./liquid-rail";
import type { CSSProperties } from "react";
export type ElasticReelProps = {
  items?: { src: string; label?: string; meta?: string }[];
  minWidthRatio?: number;
  waistSigma?: number;
  stretchAmount?: number;
  backgroundColor?: string;
  autoPlay?: boolean;
  paused?: boolean;
  compact?: boolean;
  className?: string;
  style?: CSSProperties;
  onIndexChange?: (index: number) => void;
};
export const elasticReelItems = [
  {
    src: "/media/gallery/image-12.webp",
    label: "Artifact",
    meta: "01 // 2026",
  },
  {
    src: "/media/gallery/image-13.webp",
    label: "Specimen",
    meta: "02 // 2026",
  },
  {
    src: "/media/gallery/image-14.webp",
    label: "Resonance",
    meta: "03 // 2026",
  },
  {
    src: "/media/gallery/image-15.webp",
    label: "Monolith",
    meta: "04 // 2026",
  },
  { src: "/media/gallery/image-17.webp", label: "Vortex", meta: "05 // 2026" },
  { src: "/media/gallery/image-02.webp", label: "Aether", meta: "06 // 2026" },
];
export default function ElasticReel({
  items = elasticReelItems,
  backgroundColor = "#05060a",
  style,
  ...props
}: ElasticReelProps) {
  const background = /^#[\da-f]{6}$/i.test(backgroundColor)
    ? backgroundColor
    : "#05060a";
  return (
    <LiquidRail
      {...props}
      variant="elastic"
      theme="dark"
      spacing={0.028}
      items={items.map((item, i) => ({
        src: item.src,
        title:
          item.label ||
          item.src
            .split("/")
            .pop()
            ?.replace(/\.[^.]+$/, "") ||
          "Artifact",
        year: item.meta || `${String(i + 1).padStart(2, "0")} // 2026`,
      }))}
      style={{ ...style, backgroundColor: background }}
    />
  );
}
