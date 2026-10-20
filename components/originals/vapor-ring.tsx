"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { createVaporEngine, type VaporOptions } from "./vapor-engine";

export interface VaporRingProps {
  city?: string;
  temperature?: number;
  condition?: string;
  warmColor?: string;
  coldColor?: string;
  smokeDensity?: number;
  flowSpeed?: number;
  turbulence?: number;
  ringRadius?: number;
  compact?: boolean;
  paused?: boolean;
  className?: string;
}

export default function VaporRing({
  city = "Buenos Aires",
  temperature = 26,
  condition = "Partly cloudy",
  warmColor = "#ff5549",
  coldColor = "#4ca9ad",
  smokeDensity = 1.25,
  flowSpeed = 0.7,
  turbulence = 1.1,
  ringRadius = 0.25,
  compact = false,
  paused = false,
  className = "",
}: VaporRingProps) {
  const host = useRef<HTMLDivElement>(null),
    canvas = useRef<HTMLCanvasElement>(null);
  const engine = useRef<ReturnType<typeof createVaporEngine> | null>(null);
  const options = useRef<VaporOptions>({
    warmColor,
    coldColor,
    smokeDensity,
    flowSpeed,
    turbulence,
    ringRadius,
    paused,
  });
  options.current = {
    warmColor,
    coldColor,
    smokeDensity,
    flowSpeed,
    turbulence,
    ringRadius,
    paused,
  };
  const [generation, setGeneration] = useState(0);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const element = host.current!,
      surface = canvas.current!;
    setFailed(false);
    delete element.dataset.failed;
    try {
      engine.current = createVaporEngine(
        element,
        surface,
        compact,
        () => options.current,
      );
    } catch {
      element.dataset.failed = "true";
      setFailed(true);
    }
    const lost = (event: Event) => {
      event.preventDefault();
      engine.current?.dispose();
      engine.current = null;
      element.dataset.failed = "true";
      setFailed(true);
    };
    const restored = () => setGeneration((value) => value + 1);
    surface.addEventListener("webglcontextlost", lost);
    surface.addEventListener("webglcontextrestored", restored);
    return () => {
      engine.current?.dispose();
      engine.current = null;
      surface.removeEventListener("webglcontextlost", lost);
      surface.removeEventListener("webglcontextrestored", restored);
    };
  }, [compact, generation]);
  useEffect(
    () => engine.current?.sync(),
    [
      warmColor,
      coldColor,
      smokeDensity,
      flowSpeed,
      turbulence,
      ringRadius,
      paused,
    ],
  );
  const value = Number.isFinite(temperature)
    ? Math.max(-99, Math.min(99, Math.round(temperature)))
    : 26;
  return (
    <div
      className={`mq-vapor-stage ${className}`}
      style={
        {
          "--vapor-warm": warmColor,
          "--vapor-cold": coldColor,
        } as CSSProperties
      }
    >
      <style>{styles}</style>
      <section
        className="mq-vapor-card"
        aria-label={`${city}: ${value} degrees Celsius, ${condition}`}
      >
        <header>
          <h2>{city}</h2>
        </header>
        <div className="mq-vapor-main">
          <div
            ref={host}
            className="mq-vapor-volume"
            data-failed={failed || undefined}
          >
            <div className="mq-vapor-fallback" aria-hidden="true" />
            <canvas ref={canvas} aria-hidden="true" />
          </div>
          <div className="mq-vapor-reading" aria-hidden="true">
            <strong>
              {value}
              <sup>°</sup>
            </strong>
            <span>{condition}</span>
          </div>
        </div>
        <div
          className="mq-vapor-metrics"
          aria-label="Illustrative weather details"
        >
          <span>
            <svg aria-hidden="true" viewBox="0 0 20 20">
              <path d="M2 6h10a3 3 0 1 0-3-3M2 10h15M2 14h9a2 2 0 1 1-2 2" />
            </svg>
            7 m/s
          </span>
          <span>
            <svg aria-hidden="true" viewBox="0 0 20 20">
              <path d="M10 2C8 6 4 9 4 13a6 6 0 0 0 12 0c0-4-4-7-6-11Z" />
            </svg>
            45%
          </span>
          <span>
            <svg aria-hidden="true" viewBox="0 0 20 20">
              <circle cx="10" cy="10" r="7" />
              <path d="m10 10 3-4M5 13h10" />
            </svg>
            1013 hPa
          </span>
        </div>
      </section>
    </div>
  );
}

const styles = `
.mq-vapor-stage{position:relative;display:grid;place-items:center;width:100%;height:100%;min-height:220px;overflow:hidden;background:#000;container-type:size}
.mq-vapor-card{position:relative;isolation:isolate;width:min(94cqw,78cqh,560px);color:#f5f5f5;font-family:inherit;container-type:inline-size}
.mq-vapor-card header{height:15cqw;display:flex;justify-content:center;align-items:center;position:relative;z-index:2}
.mq-vapor-card h2{font-size:clamp(12px,4.4cqw,19px);font-weight:500;letter-spacing:-.02em;margin:0}
.mq-vapor-main{height:100cqw;position:relative;margin-top:-4cqw}
.mq-vapor-volume{position:absolute;inset:0}
.mq-vapor-volume>canvas{width:100%;height:100%;display:block;position:relative;opacity:0}
.mq-vapor-volume[data-ready=true]>canvas{opacity:1}
.mq-vapor-fallback{position:absolute;inset:13%;border-radius:50%;background:conic-gradient(from 20deg,var(--vapor-cold),transparent 20%,var(--vapor-warm) 38%,var(--vapor-cold) 55%,transparent 72%,var(--vapor-warm));filter:blur(9px);mask:radial-gradient(transparent 42%,#000 49%,#000 55%,transparent 70%);opacity:.65}
.mq-vapor-volume[data-ready=true]>.mq-vapor-fallback{visibility:hidden}
.mq-vapor-reading{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;pointer-events:none}
.mq-vapor-reading strong{font-size:17cqw;line-height:1;letter-spacing:-.065em;font-weight:550;font-style:italic}
.mq-vapor-reading sup{font-size:7cqw;vertical-align:top;margin-left:3px;line-height:1.5;font-weight:400;color:#999}
.mq-vapor-reading>span{font-size:3.2cqw;margin-top:3cqw;color:#c5c6ca}
.mq-vapor-metrics{display:flex;justify-content:center;gap:7cqw;margin:0 0 4cqw;color:#a7a8af}
.mq-vapor-metrics>span{display:flex;align-items:center;gap:1.5cqw;font-size:2.7cqw}
.mq-vapor-metrics svg{width:4cqw;height:4cqw;fill:none;stroke:currentColor;stroke-width:1;opacity:.7}
.demo-vapor-ring{padding:0!important}.demo-vapor-ring>.mq-vapor-stage{min-height:0}
@media(prefers-reduced-motion:reduce){.mq-vapor-card *{transition:none!important;animation:none!important}}
`;
