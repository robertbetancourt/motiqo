"use client";
import { useEffect, useRef, useState } from "react";
import { useKineticCanvas } from "./kinetic-canvas";
import {
  kineticClamp,
  kineticMix,
  kineticSmooth,
  turbineGear,
  turbineDemo,
  turbineCrowns,
  turbineShiftPulse,
} from "./kinetic-math";
export type IrisTurbineProps = {
  speed?: number;
  maxSpeed?: number;
  redlineThreshold?: number;
  bladeCount?: number;
  cruiseColor?: string;
  ignitionColor?: string;
  autoDemo?: boolean;
  interactive?: boolean;
  showTelemetry?: boolean;
  paused?: boolean;
  compact?: boolean;
  className?: string;
};
export default function IrisTurbine({
  speed,
  maxSpeed = 210,
  redlineThreshold = 55,
  bladeCount = 24,
  cruiseColor = "#38bdf8",
  ignitionColor = "#ef4444",
  autoDemo = true,
  interactive = true,
  showTelemetry = false,
  paused = false,
  compact = false,
  className = "",
}: IrisTurbineProps) {
  const number = useRef<HTMLElement>(null),
    gearLabel = useRef<HTMLSpanElement>(null),
    held = useRef(false),
    manual = useRef(false),
    sliderDrive = useRef(false),
    target = useRef(9),
    state = useRef({
      speed: 9,
      velocity: 0,
      rotation: 0,
      time: 0,
      gear: 1,
      pulse: 0,
      shiftAge: 10,
    }),
    [setting, setSetting] = useState(9);
  const { host, canvas, invalidate } = useKineticCanvas(
    ({ g, w, h, dt, still }) => {
      const s = state.current,
        limit = kineticClamp(maxSpeed, 30, 400),
        external = speed !== undefined;
      if (!still) {
        s.time += dt;
        if (held.current && interactive && !external) {
          manual.current = true;
          target.current = Math.min(limit, target.current + dt * 65);
        } else if (manual.current && !sliderDrive.current)
          target.current = Math.max(0, target.current - dt * 14);
      }
      const desired = external
        ? kineticClamp(speed, 0, limit)
        : still
          ? s.time === 0
            ? 88
            : s.speed
          : autoDemo && !manual.current
            ? turbineDemo(s.time, limit)
            : target.current;
      if (still) s.speed = desired;
      else {
        s.velocity += (desired - s.speed) * dt * 24;
        s.velocity *= Math.exp(-dt * 9);
        s.speed = kineticClamp(s.speed + s.velocity * dt, 0, limit);
        s.rotation += dt * (0.045 + s.speed * 0.0028);
      }
      const gear = turbineGear(s.speed);
      if (gear > s.gear && !still) s.shiftAge = 0;
      s.gear = gear;
      s.shiftAge += dt;
      s.pulse = turbineShiftPulse(s.shiftAge);
      if (number.current)
        number.current.textContent = String(Math.round(s.speed));
      if (gearLabel.current) gearLabel.current.textContent = String(gear);
      const rgb = (hex: string, fallback: string) =>
          (/^#[\da-f]{6}$/i.test(hex) ? hex : fallback)
            .slice(1)
            .match(/../g)!
            .map((channel) => parseInt(channel, 16)),
        palette = [rgb(cruiseColor,"#38bdf8"),rgb("#34d399","#34d399"),rgb("#facc15","#facc15"),rgb("#fb923c","#fb923c"),rgb(ignitionColor,"#ef4444")],
        heat = kineticClamp(s.speed / limit,0,1) * 4,
        zone = Math.min(3,Math.floor(heat)),
        mix = kineticSmooth(0,1,heat-zone),
        red = Math.round(kineticMix(palette[zone][0], palette[zone+1][0], mix)),
        green = Math.round(kineticMix(palette[zone][1], palette[zone+1][1], mix)),
        blue = Math.round(kineticMix(palette[zone][2], palette[zone+1][2], mix)),
        color = `${red},${green},${blue}`;
      const tipColor = `rgb(${[red, green, blue].map((c) => Math.round(kineticMix(c, 255, 0.82))).join(",")})`;
      host.current?.style.setProperty("--turbine-color", `rgb(${color})`);
      host.current!.dataset.speed = s.speed.toFixed(1);
      const r = Math.min(w, h) * 0.36,
        count = Math.round(kineticClamp(bladeCount, 12, 48));
      g.fillStyle = "#000";
      g.fillRect(0, 0, w, h);
      g.save();
      g.translate(w / 2, h / 2);
      g.rotate(s.rotation);
      g.globalCompositeOperation = "lighter";
      for (const crown of turbineCrowns(
        still && s.time === 0 ? 2.1 : s.time,
      ).sort((a, b) => b.phase - a.phase)) {
        if (crown.opacity < 0.001) continue;
        const inner = r * 0.47,
          outer = r * crown.radius * (1 + s.pulse * 0.025),
          span = outer - inner,
          twist = crown.twist;
        g.save();
        g.rotate(crown.phase * 0.21);
        g.globalAlpha = crown.opacity;
        for (let i = 0; i < count; i++) {
          g.save();
          g.rotate((i * Math.PI * 2) / count);
          const step = (Math.PI * 2) / count;
          const tipX = Math.cos(twist) * outer,
            tipY = Math.sin(twist) * outer;
          g.beginPath();
          g.moveTo(inner, 0);
          g.bezierCurveTo(
            inner + span * 0.2,
            -span * 0.36,
            tipX - span * 0.12,
            tipY - span * 0.46,
            tipX,
            tipY,
          );
          g.bezierCurveTo(
            tipX - span * 0.35,
            tipY - span * 0.06,
            inner + span * 0.16,
            inner * step * 0.7 + span * 0.05,
            Math.cos(step * 0.7) * inner,
            Math.sin(step * 0.7) * inner,
          );
          g.bezierCurveTo(
            inner * 1.13,
            r * 0.035,
            inner * 1.04,
            r * 0.025,
            inner,
            0,
          );
          const fill = g.createRadialGradient(0, 0, inner, 0, 0, outer);
          fill.addColorStop(0, `rgba(${color},0)`);
          fill.addColorStop(
            0.5,
            `rgba(${color},${0.06 + crown.phase * 0.1 + (s.speed / limit) * 0.12})`,
          );
          fill.addColorStop(0.85, `rgba(${color},.22)`);
          fill.addColorStop(1, `rgba(${color},.08)`);
          g.fillStyle = fill;
          g.fill();
          const edge = g.createLinearGradient(inner, 0, tipX, tipY);
          edge.addColorStop(0, `rgba(${color},.16)`);
          edge.addColorStop(0.6, `rgba(${color},.95)`);
          edge.addColorStop(1, tipColor);
          g.strokeStyle = edge;
          g.lineWidth = Math.max(0.65, r / 200);
          g.shadowColor = `rgb(${color})`;
          g.shadowBlur = 3 + (s.speed / limit) * 8 + s.pulse * 8;
          g.stroke();
          g.shadowBlur = 0;
          // A soft secondary vein gives the curved blade a folded, petal-like body.
          g.beginPath();
          g.moveTo(inner, 0);
          g.bezierCurveTo(
            inner + span * 0.25,
            -span * 0.05,
            tipX - span * 0.36,
            tipY - span * 0.27,
            tipX,
            tipY,
          );
          g.strokeStyle = `rgba(${color},.24)`;
          g.lineWidth = Math.max(0.4, r / 330);
          g.stroke();
          g.fillStyle = tipColor;
          g.beginPath();
          g.arc(tipX, tipY, Math.max(0.7, r * 0.0055), 0, Math.PI * 2);
          g.fill();
          g.globalAlpha = crown.opacity * 0.45;
          g.beginPath();
          g.arc(inner, 0, r * 0.004, 0, Math.PI * 2);
          g.fill();
          g.globalAlpha = crown.opacity;
          g.restore();
        }
        g.restore();
      }
      g.restore();
    },
    paused,
    compact,
  );
  useEffect(() => {
    if (autoDemo) {
      manual.current = false;
      sliderDrive.current = false;
    }
  }, [autoDemo]);
  function accelerate() {
    if (
      !interactive ||
      paused ||
      speed !== undefined ||
      matchMedia("(prefers-reduced-motion: reduce)").matches
    )
      return;
    if (!held.current) target.current = state.current.speed;
    held.current = true;
    manual.current = true;
    sliderDrive.current = false;
  }
  const release = () => {
    held.current = false;
  };
  useEffect(() => {
    const release = () => {
      held.current = false;
    };
    const visibility = () => {
      if (document.hidden) release();
    };
    window.addEventListener("blur", release);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      window.removeEventListener("blur", release);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, []);
  return (
    <div
      ref={host}
      className={`mq-turbine ${className}`}
      tabIndex={interactive && !compact ? 0 : -1}
      role="group"
      aria-label="Iris turbine speedometer. Hold Space or press and hold to accelerate."
      onPointerDown={(e) => {
        if (!interactive || paused || e.target instanceof HTMLInputElement)
          return;
        accelerate();
        e.currentTarget.setPointerCapture(e.pointerId);
      }}
      onPointerUp={release}
      onPointerCancel={release}
      onLostPointerCapture={release}
      onBlur={release}
      onKeyDown={(e) => {
        if (e.key === " " && interactive && !paused) {
          e.preventDefault();
          accelerate();
        }
        if (
          ["ArrowUp", "ArrowDown"].includes(e.key) &&
          interactive &&
          !paused
        ) {
          e.preventDefault();
          if (!manual.current) target.current = state.current.speed;
          manual.current = true;
          sliderDrive.current = false;
          target.current = kineticClamp(
            target.current + (e.key === "ArrowUp" ? 10 : -10),
            0,
            maxSpeed,
          );
          invalidate();
        }
      }}
      onKeyUp={(e) => {
        if (e.key === " ") release();
      }}
      onWheel={(e) => {
        if (!interactive || paused || speed !== undefined) return;
        if (!manual.current) target.current = state.current.speed;
        manual.current = true;
        sliderDrive.current = false;
        target.current = kineticClamp(
          target.current - e.deltaY * 0.12,
          0,
          maxSpeed,
        );
        invalidate();
      }}
    >
      <style>{styles}</style>
      <canvas ref={canvas} aria-hidden="true" />
      {showTelemetry && (
        <div className="mq-turbine-telemetry">
          17°C <span>22:36</span>
        </div>
      )}
      <div className="mq-turbine-readout">
        <strong ref={number}>{Math.round(speed ?? 9)}</strong>
        <span>KM/H</span>
        <span ref={gearLabel} className="mq-turbine-gear">
          {turbineGear(speed ?? 9)}
        </span>
      </div>
      {interactive && !compact && speed === undefined && !autoDemo && (
        <label className="mq-turbine-slider">
          <span className="mq-turbine-sr">Target speed</span>
          <input
            aria-label="Target speed"
            type="range"
            min="0"
            max={maxSpeed}
            value={setting}
            onChange={(e) => {
              setSetting(Number(e.target.value));
              manual.current = true;
              sliderDrive.current = true;
              target.current = Number(e.target.value);
              invalidate();
            }}
          />
        </label>
      )}
    </div>
  );
}
const styles = `.mq-turbine{position:relative;width:100%;height:100%;min-height:220px;background:#000;overflow:hidden;container-type:size;outline:none;touch-action:pan-y}.mq-turbine:focus-visible{outline:1px solid var(--turbine-color,#93c5fd);outline-offset:-6px}.mq-turbine>canvas{position:absolute;width:100%;height:100%;inset:0}.mq-turbine-readout{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;flex-direction:column;pointer-events:none;color:#f8fafc}.mq-turbine-readout strong{font-size:clamp(28px,10cqmin,64px);font-weight:250;font-variant-numeric:tabular-nums;line-height:1;letter-spacing:-.06em}.mq-turbine-readout>span:not(.mq-turbine-gear){font-size:clamp(7px,1.8cqmin,10px);font-weight:400;line-height:1.5;letter-spacing:.15em;color:#64748b;margin-top:9px}.mq-turbine-gear{width:clamp(17px,5cqmin,28px);height:clamp(17px,5cqmin,28px);border:1px solid color-mix(in srgb,var(--turbine-color,#93c5fd) 50%,transparent);border-radius:50%;display:grid;place-items:center;color:var(--turbine-color,#93c5fd);font-size:clamp(8px,2cqmin,11px);margin-top:16px;transition:color .4s,border-color .4s}.mq-turbine-telemetry{position:absolute;top:8%;width:100%;text-align:center;color:#94a3b8;font-size:10px;letter-spacing:.04em}.mq-turbine-telemetry span{margin-left:15px}.mq-turbine-slider{position:absolute;bottom:6%;left:30%;right:30%}.mq-turbine-slider input{width:100%;accent-color:var(--turbine-color,#93c5fd)}.mq-turbine-sr{position:absolute;clip-path:inset(50%);width:1px;height:1px}`;
