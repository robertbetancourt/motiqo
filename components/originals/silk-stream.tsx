"use client";
import LiquidRail, { type LiquidRailProps } from "./liquid-rail";
export const silkStreamItems = [
  { src: "/media/gallery/image-02.webp", title: "Artifact", year: "2026" },
  { src: "/media/gallery/image-04.webp", title: "Reverie", year: "2026" },
  { src: "/media/gallery/image-06.webp", title: "Monolith", year: "2025" },
  { src: "/media/gallery/image-07.webp", title: "Aether", year: "2025" },
  { src: "/media/gallery/image-09.webp", title: "Resonance", year: "2024" },
  { src: "/media/gallery/image-10.webp", title: "Specimen", year: "2024" },
];
export default function SilkStream(props: Omit<LiquidRailProps, "variant">) {
  return (
    <LiquidRail
      {...props}
      items={props.items ?? silkStreamItems}
      spacing={props.spacing ?? 0.018}
      variant="stream"
    />
  );
}
