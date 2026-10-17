"use client";
import { useEffect, useId, useRef, useState, type CSSProperties } from "react";
import { createQuantumScene, type QuantumOptions } from "./quantum-scene";
export type QuantumCoreProps = Partial<QuantumOptions> & {
  compact?: boolean;
  className?: string;
};
/** Only the core and reticle: no branding, titles, or surrounding interface. */
export default function QuantumCore({
  coreColor = "#050b24",
  accentColor = "#315bff",
  rotationSpeed = 0.22,
  finCount = 28,
  bloomIntensity = 1,
  interactive = true,
  paused = false,
  compact = false,
  className = "",
}: QuantumCoreProps) {
  const root = useRef<HTMLDivElement>(null),
    canvas = useRef<HTMLCanvasElement>(null),
    scene = useRef<ReturnType<typeof createQuantumScene> | null>(null),
    [generation, restart] = useState(0),
    [failed, setFailed] = useState(false),
    id = useId().replace(/:/g, "");
  const options = useRef<QuantumOptions>({
    coreColor,
    accentColor,
    rotationSpeed,
    finCount,
    bloomIntensity,
    interactive,
    paused,
  });
  options.current = {
    coreColor,
    accentColor,
    rotationSpeed,
    finCount,
    bloomIntensity,
    interactive,
    paused,
  };
  useEffect(() => {
    const host = root.current!,
      surface = canvas.current!;
    delete host.dataset.ready;
    delete host.dataset.failed;
    setFailed(false);
    try {
      scene.current = createQuantumScene(
        surface,
        compact,
        () => options.current,
      );
    } catch (error) {
      console.error("QuantumCore:", error);
      host.dataset.failed = "true";
      setFailed(true);
    }
    const lost = (e: Event) => {
      e.preventDefault();
      scene.current?.dispose();
      scene.current = null;
      setFailed(true);
    };
    const restored = () => restart((n) => n + 1);
    surface.addEventListener("webglcontextlost", lost);
    surface.addEventListener("webglcontextrestored", restored);
    return () => {
      scene.current?.dispose();
      scene.current = null;
      surface.removeEventListener("webglcontextlost", lost);
      surface.removeEventListener("webglcontextrestored", restored);
    };
  }, [compact, generation]);
  useEffect(
    () => scene.current?.sync(),
    [
      coreColor,
      accentColor,
      rotationSpeed,
      finCount,
      bloomIntensity,
      interactive,
      paused,
    ],
  );
  return (
    <div
      ref={root}
      className={`mq-quantum ${className}`}
      style={
        {
          "--quantum-accent": /^#[\da-f]{6}$/i.test(accentColor)
            ? accentColor
            : "#00d8ff",
        } as CSSProperties
      }
      role="img"
      aria-label="Rotating quantum core with orbital light ribbons, turbine fins and a geometric telemetry reticle"
    >
      <style>{styles}</style>
      <canvas ref={canvas} aria-hidden="true" />
      <svg className="mq-quantum-hud" viewBox="0 0 800 800" aria-hidden="true">
        <defs>
          <linearGradient id={`${id}-line`} x1="0" y1="0" x2="1" y2="1">
            <stop stopColor="#fff" stopOpacity=".7" />
            <stop offset=".5" stopColor={accentColor} stopOpacity=".14" />
            <stop offset="1" stopColor="#9b91ff" stopOpacity=".6" />
          </linearGradient>
          <filter
            id={`${id}-glow`}
            x="-200%"
            y="-200%"
            width="500%"
            height="500%"
          >
            <feGaussianBlur stdDeviation="4" />
          </filter>
        </defs>
        <path
          d="M0 400H800M400 0V800M0 0L800 800M800 0L0 800"
          fill="none"
          stroke="#64a0ff"
          strokeOpacity=".12"
          strokeWidth=".7"
        />
        <path
          d="M400 135L665 400 400 665 135 400Z"
          fill="none"
          stroke={`url(#${id}-line)`}
          strokeWidth="1"
        />
        <circle
          cx="400"
          cy="400"
          r="354"
          fill="none"
          stroke="#9ab8ff"
          strokeOpacity=".17"
          strokeWidth=".6"
        />
        <g data-spin="outer">
          {Array.from({ length: 120 }, (_, i) => {
            const a = (i * Math.PI) / 60;
            return (
              <path
                key={i}
                d={`M${400 + Math.cos(a) * 315} ${400 + Math.sin(a) * 315}L${400 + Math.cos(a) * (i % 5 === 0 ? 324 : 319)} ${400 + Math.sin(a) * (i % 5 === 0 ? 324 : 319)}`}
                stroke={i % 5 === 0 ? "#c4d8ff" : "#5574aa"}
                strokeOpacity={i % 5 === 0 ? 0.5 : 0.22}
                strokeWidth=".8"
              />
            );
          })}
          <circle
            cx="400"
            cy="400"
            r="354"
            fill="none"
            stroke={`url(#${id}-line)`}
            strokeDasharray="190 500 80 1455"
            strokeWidth="1"
          />
        </g>
        <g data-spin="inner">
          {Array.from({ length: 56 }, (_, i) => {
            const a = (i * Math.PI) / 28;
            return (
              <circle
                key={i}
                cx={400 + Math.cos(a) * 280}
                cy={400 + Math.sin(a) * 280}
                r={i % 7 === 0 ? 1.6 : 0.7}
                fill="#b4c8ff"
                opacity={i % 7 === 0 ? 0.65 : 0.2}
              />
            );
          })}
          <circle
            cx="400"
            cy="400"
            r="275"
            stroke="#9b9aff"
            strokeOpacity=".18"
            fill="none"
            strokeDasharray="2 8"
          />
        </g>
        {[
          [400, 135],
          [665, 400],
          [400, 665],
          [135, 400],
        ].map(([x, y], i) => (
          <g key={i}>
            <circle
              cx={x}
              cy={y}
              r="5"
              fill="#c3caff"
              filter={`url(#${id}-glow)`}
            />
            <path
              d={`M${x - 5} ${y}H${x + 5}M${x} ${y - 5}V${y + 5}`}
              stroke="#cbd6ff"
              strokeWidth=".65"
            />
            <circle cx={x} cy={y} r="1.3" fill="#fff" />
          </g>
        ))}
        {failed && (
          <g>
            <circle
              cx="400"
              cy="400"
              r="94"
              fill="#050b24"
              stroke={accentColor}
            />
            <ellipse
              cx="400"
              cy="400"
              rx="94"
              ry="38"
              fill="none"
              stroke={accentColor}
              transform="rotate(40 400 400)"
            />
            <ellipse
              cx="400"
              cy="400"
              rx="94"
              ry="38"
              fill="none"
              stroke={accentColor}
              transform="rotate(-40 400 400)"
            />
          </g>
        )}
      </svg>
    </div>
  );
}
const styles = `.mq-quantum{position:relative;width:100%;height:100%;min-height:180px;background:#03050a;overflow:hidden;isolation:isolate}.mq-quantum>canvas{position:absolute;inset:0;width:100%;height:100%;display:block}.mq-quantum-hud{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;will-change:transform}`;
