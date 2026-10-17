"use client";
import { motion } from "motion/react";
export type GardenColors = {
  background: string;
  text: string;
  foliage: string;
  flowers: string;
  flowerStrokes: string;
};
export const gardenPalettes: Record<string, GardenColors> = {
  "Rose Noir": {
    background: "#05070e",
    text: "#ffffff",
    foliage: "#0044ff",
    flowers: "#ff1e27",
    flowerStrokes: "#0044ff",
  },
  Midnight: {
    background: "#0c3b9e",
    text: "#ffffff",
    foliage: "#041642",
    flowers: "#ff4d2e",
    flowerStrokes: "#041642",
  },
  Orchid: {
    background: "#280836",
    text: "#f3e8ff",
    foliage: "#10b981",
    flowers: "#d946ef",
    flowerStrokes: "#713283",
  },
  Tomato: {
    background: "#e61919",
    text: "#0a0a0a",
    foliage: "#0a0a0a",
    flowers: "#f5f2eb",
    flowerStrokes: "#e61919",
  },
  Moss: {
    background: "#071f18",
    text: "#ecfdf5",
    foliage: "#34d399",
    flowers: "#fb7185",
    flowerStrokes: "#8b264b",
  },
  Paper: {
    background: "#f4f1ea",
    text: "#1c1917",
    foliage: "#1d4ed8",
    flowers: "#e11d48",
    flowerStrokes: "#1d4ed8",
  },
};
export type GardenLetter = { id: number; char: string; seed: number };
export type GardenFlower = "rose" | "cosmos" | "poppy" | "tulip" | "mixed";
export type GardenArrangement = "wild" | "climbing" | "meadow";
export function botanicalPlan(
  seed: number,
  density: number,
  arrangement: GardenArrangement = "wild",
) {
  let state = seed | 0;
  const random = () => {
    state = (state + 0x6d2b79f5) | 0;
    let x = Math.imul(state ^ (state >>> 15), state | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
  const count = Math.min(3, Math.max(1, Math.floor(density + random() * 1.4)));
  return Array.from({ length: count }, (_, i) => {
    const below = arrangement === "wild" && random() < 0.32;
    const x = 2 + random() * 76,
      y = below
        ? 100 + random() * 29
        : -10 - random() * (arrangement === "climbing" ? 55 : 35);
    const baseX = 18 + random() * 42,
      baseY = 68 + random() * 30;
    const c1: [number, number] = [
      baseX + (random() - 0.5) * 90,
      baseY - 12 - random() * 38,
    ];
    const c2: [number, number] = [
      x + (random() - 0.5) * 85,
      y + (below ? -30 : 35),
    ];
    return {
      x,
      y,
      baseX,
      baseY,
      c1,
      c2,
      front: random() < 0.4,
      size: (0.35 + random() * 0.42) * (arrangement === "meadow" ? 0.76 : 1),
      rotation: (random() - 0.5) * 115,
      species: Math.floor(random() * 4),
      bud: random() < 0.18,
      delay: random() * 0.3 + i * 0.09,
      sway: 1.5 + random() * 4,
      duration: 4 + random() * 5,
      leaves: 2 + Math.floor(random() * 3),
      curl: (random() - 0.5) * 45,
    };
  });
}
/** Preserve surviving glyph identity when editing in the middle, not just at the end. */
export function reconcileGarden(
  previous: GardenLetter[],
  text: string,
  nextId: () => number,
): GardenLetter[] {
  const chars = Array.from(text);
  let prefix = 0,
    suffix = 0;
  while (
    prefix < previous.length &&
    prefix < chars.length &&
    previous[prefix].char === chars[prefix]
  )
    prefix++;
  while (
    suffix < previous.length - prefix &&
    suffix < chars.length - prefix &&
    previous[previous.length - 1 - suffix].char ===
      chars[chars.length - 1 - suffix]
  )
    suffix++;
  return chars.map((char, i) => {
    if (i < prefix) return previous[i];
    if (i >= chars.length - suffix)
      return previous[previous.length - (chars.length - i)];
    const id = nextId();
    return { id, char, seed: (char.codePointAt(0) ?? 0) * 31 + i * 137 };
  });
}
export function Rose({
  x,
  y,
  size,
  rotation,
  colors,
  seed,
  still,
}: {
  x: number;
  y: number;
  size: number;
  rotation: number;
  colors: GardenColors;
  seed: number;
  still: boolean;
}) {
  const petals = Array.from({ length: 11 + (seed % 6) }, (_, j) => {
    const angle = ((j * 137.508 + (seed % 90)) * Math.PI) / 180,
      r = 11 * (1 - j / 18),
      cx = Math.cos(angle) * r,
      cy = Math.sin(angle) * r,
      s = 17 - j * 0.72;
    return (
      <path
        key={j}
        d={`M${cx - s * 0.8} ${cy}C${cx - s} ${cy - s * 0.8} ${cx + s * 0.3} ${cy - s * 1.15} ${cx + s * 0.8} ${cy - s * 0.4}C${cx + s * 1.2} ${cy + s * 0.3} ${cx + s * 0.15} ${cy + s * 0.9} ${cx - s * 0.8} ${cy}Z`}
        fill={colors.flowers}
        stroke={colors.flowerStrokes}
        strokeWidth={0.75 + (j % 3) * 0.15}
        transform={`rotate(${j * 18} ${cx} ${cy})`}
      />
    );
  });
  return (
    <g transform={`translate(${x} ${y}) rotate(${rotation}) scale(${size})`}>
      <motion.g
        initial={still ? false : { scale: 0, rotate: -35 }}
        animate={{ scale: 1, rotate: 0 }}
        exit={{ scale: 0 }}
        transition={{
          type: "spring",
          stiffness: 220,
          damping: 14,
          delay: still ? 0 : 0.14 + (seed % 5) * 0.035,
        }}
      >
        <path
          d="M-5 7-21 13-9-1-10-17 1-8 13-16 10 1 21 11 6 9Z"
          fill={colors.foliage}
        />
        <path
          d="M-25 0C-27-15-9-23 0-19C11-26 28-12 25 1C31 15 8 26 0 20C-17 27-30 11-25 0Z"
          fill={colors.flowers}
          stroke={colors.flowerStrokes}
          strokeWidth="1.1"
        />
        {petals}
        <path
          d="M-4 2C-7-5 5-9 7-2C10 3-1 8-3 2C-6-2 3-4 3 0"
          fill="none"
          stroke={colors.flowerStrokes}
          strokeWidth="1.2"
        />
      </motion.g>
    </g>
  );
}
