"use client";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { createNativeGL, nativeColor, nativeClamp } from "./native-gl";
import { effectRuntime } from "./effect-runtime";
import { thermalFragment } from "./thermal-shaders";
export type HourlyWeather = {
  time: string;
  temperature: number;
  smoke?: boolean;
};
export type ThermalSmokeProps = {
  city?: string;
  temperature?: number;
  condition?: string;
  warmColor?: string;
  coldColor?: string;
  smokeDensity?: number;
  flowSpeed?: number;
  hourlyData?: HourlyWeather[];
  autoTriggerIntro?: boolean;
  paused?: boolean;
  compact?: boolean;
  className?: string;
};
function Smoke({
  warm,
  cold,
  density,
  speed,
  paused,
  compact,
  replay,
  mini = false,
  onCount,
}: {
  warm: string;
  cold: string;
  density: number;
  speed: number;
  paused: boolean;
  compact: boolean;
  replay: number;
  mini?: boolean;
  onCount?: (n: number) => void;
}) {
  const host = useRef<HTMLDivElement>(null),
    canvas = useRef<HTMLCanvasElement>(null),
    invalidate = useRef<() => void>(() => {}),
    values = useRef({ warm, cold, density, speed, paused, replay, onCount });
  values.current = { warm, cold, density, speed, paused, replay, onCount };
  const [generation, restart] = useState(0),
    [failed, setFailed] = useState(false);
  useEffect(() => {
    let gpu: ReturnType<typeof createNativeGL> | undefined;
    const element = host.current!,
      surface = canvas.current!;
    let clock: ReturnType<typeof effectRuntime> | undefined;
    setFailed(false);
    try {
      gpu = createNativeGL(surface);
      const pass = gpu.pass(thermalFragment);
      let elapsed = replay > 0 ? 0 : 3,
        lastReplay = replay,
        lastCount = -1;
      clock = effectRuntime(
        element,
        surface,
        (time, dt) => {
          const o = values.current;
          if (o.replay !== lastReplay) {
            lastReplay = o.replay;
            elapsed = 0;
            lastCount = -1;
          }
          const reduced = matchMedia(
            "(prefers-reduced-motion: reduce)",
          ).matches;
          elapsed += dt;
          const intro =
            mini || reduced || o.paused ? 1 : Math.min(1, elapsed / 2.25);
          gpu!.draw(pass, null, {
            uResolution: [surface.width, surface.height],
            uTime: time,
            uDensity: nativeClamp(o.density, 0.2, 2.5),
            uIntro: 1 - Math.pow(1 - intro, 3),
            uSpeed: nativeClamp(o.speed, 0, 3),
            uWarm: nativeColor(o.warm, "#ffb55c"),
            uCold: nativeColor(o.cold, "#729eff"),
            uMini: mini ? 1 : 0,
          });
          const count = Math.min(2, Math.floor(intro * 2.99));
          if (count !== lastCount) {
            lastCount = count;
            o.onCount?.(count);
          }
        },
        () => values.current.paused,
        undefined,
        compact,
      );
      invalidate.current = clock.invalidate;
    } catch (error) {
      console.error("ThermalSmoke:", error);
      gpu?.dispose();
      element.dataset.failed = "true";
      setFailed(true);
    }
    const lost = (e: Event) => {
      e.preventDefault();
      clock?.dispose();
      gpu?.dispose();
      setFailed(true);
    };
    const restored = () => restart((n) => n + 1);
    surface.addEventListener("webglcontextlost", lost);
    surface.addEventListener("webglcontextrestored", restored);
    return () => {
      invalidate.current = () => {};
      clock?.dispose();
      gpu?.dispose();
      surface.removeEventListener("webglcontextlost", lost);
      surface.removeEventListener("webglcontextrestored", restored);
    };
  }, [compact, mini, generation]);
  useEffect(
    () => invalidate.current(),
    [warm, cold, density, speed, paused, replay],
  );
  return (
    <div
      ref={host}
      className={`mq-thermal-smoke ${failed ? "mq-thermal-smoke-failed" : ""}`}
    >
      <canvas ref={canvas} aria-hidden="true" />
    </div>
  );
}
export default function ThermalSmoke({
  city = "Buenos Aires",
  temperature = 26,
  condition = "Partly cloudy",
  warmColor = "#ffb55c",
  coldColor = "#729eff",
  smokeDensity = 1.35,
  flowSpeed = 0.8,
  autoTriggerIntro = true,
  paused = false,
  compact = false,
  className = "",
}: ThermalSmokeProps) {
  const root = useRef<HTMLDivElement>(null),
    [replay, setReplay] = useState(0),
    [count, setCount] = useState(2);
  useEffect(() => {
    if (autoTriggerIntro && !compact && !paused) {
      setReplay((n) => n + 1);
      setCount(0);
    }
  }, [autoTriggerIntro, compact]);
  const displayTemperature =
    Math.round(nativeClamp(temperature, -99, 99)) - 2 + count;
  return (
    <div
      ref={root}
      className={`mq-thermal-stage ${className}`}
      style={{ "--thermal-warm": warmColor } as CSSProperties}
    >
      <style>{styles}</style>
      <section className="mq-thermal-card" aria-label={`${city} weather`}>
        <header>
          <h2>{city}</h2>
        </header>
        <div className="mq-thermal-main">
          <Smoke
            warm={warmColor}
            cold={coldColor}
            density={smokeDensity}
            speed={flowSpeed}
            paused={paused}
            compact={compact}
            replay={replay}
            onCount={setCount}
          />
          <div
            className="mq-thermal-temperature"
            aria-label={`${Math.round(temperature)} degrees, ${condition}`}
          >
            <strong aria-hidden="true">
              {displayTemperature}
              <sup>°</sup>
            </strong>
            <span>{condition}</span>
          </div>
        </div>
        <div className="mq-thermal-metrics">
          <span>
            <svg viewBox="0 0 20 20">
              <path d="M2 6h11a3 3 0 1 0-3-3M2 10h15M2 14h9a2 2 0 1 1-2 2" />
            </svg>
            7 m/s
          </span>
          <span>
            <svg viewBox="0 0 20 20">
              <path d="M10 2C8 6 4 9 4 13a6 6 0 0 0 12 0c0-4-4-7-6-11Z" />
            </svg>
            45%
          </span>
          <span>
            <svg viewBox="0 0 20 20">
              <circle cx="10" cy="10" r="7" />
              <path d="m10 10 3-4M5 13h10" />
            </svg>
            850 hPa
          </span>
        </div>
      </section>
    </div>
  );
}
const styles = `
.mq-thermal-stage{position:relative;display:grid;place-items:center;width:100%;height:100%;min-height:220px;overflow:hidden;background:#000;container-type:size}
.mq-thermal-card{position:relative;isolation:isolate;width:min(94cqw,76cqh,520px);color:#f5f5f5;font-family:inherit;container-type:inline-size}
.mq-thermal-card header{height:19cqw;display:flex;justify-content:center;align-items:center;position:relative;z-index:2}
.mq-thermal-card h2{font-size:clamp(12px,4.8cqw,18px);font-weight:500;letter-spacing:-.02em;margin:0}
.mq-thermal-main{height:100cqw;position:relative;margin-top:-5cqw}
.mq-thermal-smoke{position:absolute;inset:0}.mq-thermal-smoke>canvas{width:100%;height:100%;display:block}
.mq-thermal-temperature{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;pointer-events:none;gap:3px}
.mq-thermal-temperature strong{font-size:17cqw;line-height:1;font-weight:600;letter-spacing:-.07em;font-style:italic}
.mq-thermal-temperature sup{font-size:8cqw;vertical-align:top;line-height:1.5;margin-left:2px;font-weight:400}
.mq-thermal-temperature>span{font-size:3.2cqw;color:#d7d7da;margin-top:2cqw}
.mq-thermal-metrics{display:flex;justify-content:center;gap:6cqw;margin:3cqw 0;color:#b5b5bc}
.mq-thermal-metrics span{display:flex;gap:1.5cqw;align-items:center;font-size:2.8cqw}
.mq-thermal-metrics svg{width:4.5cqw;height:4.5cqw;fill:none;stroke:currentColor;stroke-width:1;opacity:.65}
.mq-thermal-smoke-failed:after{content:'';position:absolute;left:25%;top:25%;width:50%;height:50%;border:1px solid var(--thermal-warm,#ffb55c);border-radius:50%}
@media(prefers-reduced-motion:reduce){.mq-thermal-card *{animation:none!important;transition:none!important}}
`;
