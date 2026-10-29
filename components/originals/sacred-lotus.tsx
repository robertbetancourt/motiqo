"use client";
import { useRef, type CSSProperties } from "react";
import { useKineticCanvas } from "./kinetic-canvas";
import {
  kineticClamp,
  kineticMix,
  lotusPose,
  lotusCycle,
  lotusFormation,
  seededKinetic,
} from "./kinetic-math";
export type LotusColors = { inner: string; middle: string; outer: string };
const palettes: Record<string, LotusColors> = {
  aurora: { inner: "#9f71d6", middle: "#e0a6d1", outer: "#fff0d5" },
  glacier: { inner: "#a5b4fc", middle: "#ddd6fe", outer: "#f5f3ff" },
  ember: { inner: "#be567d", middle: "#e9a578", outer: "#fff0ce" },
};
export type SacredLotusProps = {
  progress?: number;
  duration?: number;
  petalCount?: number;
  layerCount?: number;
  statusText?: string;
  colorScheme?: string | LotusColors;
  interactive?: boolean;
  paused?: boolean;
  compact?: boolean;
  className?: string;
};
export default function SacredLotus({
  progress,
  duration = 10,
  petalCount = 12,
  layerCount = 3,
  statusText = "Loading...",
  colorScheme = "aurora",
  interactive = true,
  paused = false,
  compact = false,
  className = "",
}: SacredLotusProps) {
  const label = useRef<HTMLSpanElement>(null),
    pointer = useRef(0),
    openness = useRef(0),
    elapsed = useRef(0),
    rotation = useRef(0);
  const { host, canvas } = useKineticCanvas(
    ({ g, w, h, dt, still }) => {
      if (!still) {
        elapsed.current += dt;
        rotation.current += dt;
      }
      const pct =
        progress === undefined
          ? still
            ? 56
            : lotusCycle(elapsed.current, duration * 2)
          : kineticClamp(progress, 0, 100);
      if (label.current) {
        label.current.textContent = `${Math.round(pct)}%`;
        label.current.parentElement?.setAttribute(
          "aria-valuenow",
          String(Math.round(pct)),
        );
      }
      openness.current +=
        (pointer.current - openness.current) * (dt ? 1 - Math.exp(-dt * 5) : 1);
      const pose = lotusPose(pct),
        formation = lotusFormation(pct),
        radius = Math.min(w * 0.38, h * 0.32),
        count = Math.round(kineticClamp(petalCount, 6, 24)),
        layers = Math.round(kineticClamp(layerCount, 1, 5));
      const colors =
        typeof colorScheme === "string"
          ? (palettes[colorScheme] ?? palettes.aurora)
          : colorScheme;
      const safe = (hex: string, fallback: string) =>
        /^#[\da-f]{6}$/i.test(hex) ? hex : fallback;
      const a = safe(colors.inner, palettes.aurora.inner),
        b = safe(colors.middle, palettes.aurora.middle),
        c = safe(colors.outer, palettes.aurora.outer);
      g.fillStyle = "#000";
      g.fillRect(0, 0, w, h);
      g.save();
      g.translate(w / 2, h / 2);
      g.globalCompositeOperation = "lighter";
      // Each seeded point converges on an orbital node before the lines appear.
      const random = seededKinetic(418);
      for (let i = 0; i < count * layers * 2; i++) {
        const angle = random() * Math.PI * 2,
          distance = Math.sqrt(random()) * radius * 1.12,
          layer = i % layers,
          petal = Math.floor(i / layers),
          targetAngle =
            (petal / (count * 2)) * Math.PI * 2 + (layer * Math.PI) / count,
          targetRadius =
            radius *
            (0.35 + (0.65 * layer) / Math.max(1, layers - 1)) *
            pose.radius,
          x = kineticMix(
            Math.cos(angle) * distance,
            Math.cos(targetAngle) * targetRadius,
            formation.gather,
          ),
          y = kineticMix(
            Math.sin(angle) * distance,
            Math.sin(targetAngle) * targetRadius,
            formation.gather,
          );
        g.globalAlpha = formation.dust * (0.3 + random() * 0.65);
        g.fillStyle = "#e8f5ff";
        g.beginPath();
        g.arc(x, y, 0.45 + random() * 0.35, 0, Math.PI * 2);
        g.fill();
      }
      g.globalAlpha = formation.petals;
      g.save();
      for (let layer = layers - 1; layer >= 0; layer--) {
        const ratio = layers === 1 ? 1 : 0.5 + (0.5 * layer) / (layers - 1),
          r = radius * ratio * pose.radius;
        const turn =
          (still ? 2 : rotation.current) *
            (0.035 + layer * 0.012) *
            (layer % 2 ? -1 : 1) +
          (layer * Math.PI) / count;
        for (let i = 0; i < count; i++) {
          g.save();
          g.rotate((i * Math.PI * 2) / count + turn);
          const belly = r * pose.spread * (1 + openness.current * 0.18),
            round = r * 0.18 * pose.roundness;
          g.beginPath();
          g.moveTo(0, 0);
          g.bezierCurveTo(
            r * 0.2,
            -belly * 0.85,
            r * 0.72,
            -belly * 1.2,
            r - round,
            -round * 0.8,
          );
          g.bezierCurveTo(
            r + round * 0.13,
            -round * 0.4,
            r + round * 0.13,
            round * 0.4,
            r - round,
            round * 0.8,
          );
          g.bezierCurveTo(r * 0.72, belly * 1.2, r * 0.2, belly * 0.85, 0, 0);
          const fill = g.createRadialGradient(0, 0, 0, 0, 0, r);
          fill.addColorStop(0, a + "20");
          fill.addColorStop(0.55, b + "16");
          fill.addColorStop(1, c + "24");
          g.fillStyle = fill;
          g.fill();
          const stroke = g.createLinearGradient(0, 0, r, 0);
          stroke.addColorStop(0, a + "a0");
          stroke.addColorStop(0.5, b + "c0");
          stroke.addColorStop(0.78, c);
          stroke.addColorStop(0.9, "#fff4e6");
          stroke.addColorStop(1, "#fffaf2");
          g.strokeStyle = stroke;
          g.lineWidth = Math.max(0.7, radius / 160) * 1.15;
          // Layered strokes retain the halo without a full blurred surface per petal.
          const width = g.lineWidth;
          g.globalAlpha = formation.petals * 0.12;
          g.lineWidth = width + 4;
          g.stroke();
          g.globalAlpha = formation.petals * 0.25;
          g.lineWidth = width + 2;
          g.stroke();
          g.globalAlpha = formation.petals;
          g.lineWidth = width;
          g.stroke();
          if (layer === layers - 1 || layer === 0) {
            g.beginPath();
            g.arc(
              r + radius * 0.045,
              0,
              Math.max(0.65, radius * 0.006),
              0,
              Math.PI * 2,
            );
            g.fillStyle = "#dff6ff";
            g.fill();
          }
          g.restore();
        }
      }
      g.restore();
      const halo = pose.roundness;
      g.globalAlpha = halo * 0.8;
      g.strokeStyle = c;
      g.lineWidth = 1.25;
      g.beginPath();
      g.arc(0, 0, radius * pose.radius, 0, Math.PI * 2);
      g.globalAlpha = halo * 0.12;
      g.lineWidth = 5;
      g.stroke();
      g.globalAlpha = halo * 0.8;
      g.lineWidth = 1.25;
      g.stroke();
      g.globalAlpha = formation.petals;
      g.shadowBlur = 0;
      const flare = g.createRadialGradient(0, 0, 0, 0, 0, radius * 0.13);
      flare.addColorStop(0, "#fff");
      flare.addColorStop(0.1, "#ddd6feaf");
      flare.addColorStop(0.4, a + "35");
      flare.addColorStop(1, a + "00");
      g.fillStyle = flare;
      g.beginPath();
      g.arc(0, 0, radius * 0.13, 0, Math.PI * 2);
      g.fill();
      g.restore();
    },
    paused,
    compact,
  );
  return (
    <div
      ref={host}
      className={`mq-lotus ${className}`}
      onPointerMove={() => {
        if (interactive && !paused) pointer.current = 1;
      }}
      onPointerLeave={() => (pointer.current = 0)}
      style={{ "--lotus-edge": "#ffffff24" } as CSSProperties}
    >
      <style>{styles}</style>
      <canvas ref={canvas} aria-hidden="true" />
      <p>{statusText}</p>
      <div
        className="mq-lotus-progress"
        role="progressbar"
        aria-label={statusText}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={
          progress === undefined ? undefined : Math.round(progress)
        }
      >
        <span ref={label}>{progress ?? 0}%</span>
      </div>
    </div>
  );
}
const styles = `.mq-lotus{position:relative;width:100%;height:100%;min-height:220px;background:#000;border:1px solid var(--lotus-edge);border-radius:24px;overflow:hidden;container-type:size}.mq-lotus canvas{position:absolute;inset:0;display:block;width:100%;height:100%}.mq-lotus>p{position:absolute;top:9%;left:0;right:0;margin:0;text-align:center;font-size:clamp(10px,2.4cqmin,14px);font-weight:400;line-height:1.5;color:#a1a1aa;letter-spacing:.04em}.mq-lotus-progress{position:absolute;bottom:9%;left:0;right:0;text-align:center;color:#d4d4d8;font-size:clamp(10px,2.4cqmin,14px);font-variant-numeric:tabular-nums;letter-spacing:.05em}`;
