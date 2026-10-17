"use client";
import { useMemo, useRef } from "react";
import { useKineticCanvas } from "./kinetic-canvas";
import { kineticClamp, orbitRadius, seededKinetic } from "./kinetic-math";
export type AgentMood = "idle" | "happy" | "listening" | "sleepy";
export type OrbitAgentProps = {
  agentMood?: AgentMood;
  ringCount?: number;
  orbitSpeed?: number;
  accentColor?: string;
  onAgentClick?: (mood: AgentMood) => void;
  interactive?: boolean;
  paused?: boolean;
  compact?: boolean;
  className?: string;
};
export default function OrbitAgent({
  agentMood = "idle",
  ringCount = 5,
  orbitSpeed = 1,
  accentColor = "#c4b5fd",
  onAgentClick,
  interactive = true,
  paused = false,
  compact = false,
  className = "",
}: OrbitAgentProps) {
  const mood = agentMood;
  const state = useRef({
      time: 2,
      x: 0,
      y: 0,
      tx: 0,
      ty: 0,
      hover: 0,
      hoverTo: 0,
      ring: 0,
      ringV: 0,
      jump: 0,
      jumpV: 0,
      squash: 0,
      squashV: 0,
      age: 10,
    }),
    stars = useMemo(() => {
      const r = seededKinetic(307);
      return Array.from({ length: 23 }, () => ({
        x: r(),
        y: r(),
        size: r(),
        phase: r() * Math.PI * 2,
      }));
    }, []);
  const { host, canvas, invalidate } = useKineticCanvas(
    ({ g, w, h, dt, still }) => {
      const s = state.current;
      if (!still) {
        s.time += dt * kineticClamp(orbitSpeed, 0.1, 3);
        s.age += dt;
        const ease = 1 - Math.exp(-dt * 7);
        s.x += (s.tx - s.x) * ease;
        s.y += (s.ty - s.y) * ease;
        s.hover += (s.hoverTo - s.hover) * ease;
        for (const [pos, vel, k, d] of [
          ["ring", "ringV", 70, 12],
          ["jump", "jumpV", 95, 11],
          ["squash", "squashV", 130, 13],
        ] as const) {
          s[vel] += (-s[pos] * k - s[vel] * d) * dt;
          s[pos] += s[vel] * dt;
        }
      }
      const accent = /^#[\da-f]{6}$/i.test(accentColor)
          ? accentColor
          : "#c4b5fd",
        unit = Math.min(w, h),
        body = unit * 0.16,
        time = still ? 2 : s.time,
        flash = still ? 0 : Math.exp(-s.age * 3),
        happy = (!still && s.age < 0.85) || mood === "happy";
      g.fillStyle = "#0b0d14";
      g.fillRect(0, 0, w, h);
      for (let i = 0; i < stars.length; i++) {
        const star = stars[i],
          x = star.x * w,
          y = star.y * h,
          alpha =
            0.15 + (0.5 + 0.5 * Math.sin(time * 0.65 + star.phase)) * 0.45;
        g.globalAlpha = alpha;
        g.fillStyle = i % 3 === 0 ? accent : "#eef2ff";
        const r = 0.45 + star.size * 0.7;
        g.beginPath();
        g.arc(x, y, r, 0, Math.PI * 2);
        g.fill();
        if (i % 5 === 0) {
          g.strokeStyle = accent;
          g.lineWidth = 0.6;
          g.beginPath();
          g.moveTo(x - r * 3, y);
          g.lineTo(x + r * 3, y);
          g.moveTo(x, y - r * 3);
          g.lineTo(x, y + r * 3);
          g.stroke();
        }
      }
      g.globalAlpha = 1;
      g.save();
      g.translate(w / 2, h / 2);
      g.globalCompositeOperation = "lighter";
      const count = Math.round(kineticClamp(ringCount, 3, 8));
      for (let layer = 0; layer < count; layer++) {
        const radius = unit * (0.235 + layer * 0.024) * (1 + s.ring * 0.09),
          rotation = time * (0.035 + layer * 0.008) * (layer % 2 ? -1 : 1),
          speed = time * (1 + s.hover * 0.15);
        g.save();
        g.rotate(rotation);
        g.scale(1, 0.89 + layer * 0.025);
        g.beginPath();
        const point = (index: number) => {
          const a = (index / 96) * Math.PI * 2,
            r = radius * orbitRadius(a, speed, layer);
          return [Math.cos(a) * r, Math.sin(a) * r];
        };
        const start = point(0);
        g.moveTo(start[0], start[1]);
        for (let i = 0; i < 96; i++) {
          const a = point(i - 1),
            b = point(i),
            c = point(i + 1),
            d = point(i + 2);
          g.bezierCurveTo(
            b[0] + (c[0] - a[0]) / 6,
            b[1] + (c[1] - a[1]) / 6,
            c[0] - (d[0] - b[0]) / 6,
            c[1] - (d[1] - b[1]) / 6,
            c[0],
            c[1],
          );
        }
        g.closePath();
        g.globalAlpha = Math.min(
          1,
          0.16 + ((count - layer) / count) * 0.48 + flash * 0.65,
        );
        g.strokeStyle = layer % 2 ? accent : "#e8ecff";
        g.lineWidth = Math.max(0.55, unit / 850);
        g.shadowColor = accent;
        g.shadowBlur = flash * 7;
        g.stroke();
        g.shadowBlur = 0;
        g.globalAlpha = 1;
        const a = time * 0.12 + layer * 1.1,
          r = radius * orbitRadius(a, speed, layer);
        g.beginPath();
        g.arc(Math.cos(a) * r, Math.sin(a) * r, unit * 0.0022, 0, Math.PI * 2);
        g.fillStyle = "#fff";
        g.globalAlpha = 0.55 + flash * 0.4;
        g.fill();
        g.globalAlpha = 1;
        g.restore();
      }
      if (s.age < 1.5 && !still)
        for (let i = 0; i < 14; i++) {
          const a = (i / 14) * Math.PI * 2 + 0.2,
            r = body * (1.3 + s.age * 3.2),
            x = Math.cos(a) * r,
            y = Math.sin(a) * r,
            size = unit * 0.007 * (1 - s.age / 1.5),
            tail = 1 - s.age / 1.5;
          g.globalAlpha = tail;
          g.strokeStyle = i % 2 ? accent : "#fff";
          g.lineWidth = 1;
          g.beginPath();
          g.moveTo(x - size, y);
          g.lineTo(x + size, y);
          g.moveTo(x, y - size);
          g.lineTo(x, y + size);
          g.stroke();
        }
      g.globalAlpha = 1;
      g.globalCompositeOperation = "source-over";
      const float = Math.sin(time * 1.15) * body * 0.045,
        tilt = (interactive ? s.x * 0.12 : 0) + Math.sin(time * 0.65) * 0.025;
      g.translate(
        (interactive ? s.x : 0) * body * 0.12,
        float + s.jump * body * 0.5,
      );
      g.rotate(tilt);
      g.scale(1 + s.squash * 0.09, 1 - s.squash * 0.12);
      const gradient = g.createLinearGradient(-body, -body, body, body);
      gradient.addColorStop(0, "#74adff");
      gradient.addColorStop(0.4, "#b2e7ff");
      gradient.addColorStop(0.72, "#f8c8f7");
      gradient.addColorStop(1, "#b29aee");
      // A smooth scalloped silhouette, with gently breathing, unequal lobes.
      const outline = (index: number) => {
        const a = (index / 96) * Math.PI * 2;
        const r =
          body *
          (1 +
            0.036 * Math.cos(a * 10 + Math.sin(time * 0.5) * 0.3) +
            0.024 * Math.sin(a * 3 - time * 0.25));
        return [Math.cos(a) * r, Math.sin(a) * r];
      };
      g.beginPath();
      const start = outline(0);
      g.moveTo(start[0], start[1]);
      for (let i = 0; i < 96; i++) {
        const a = outline(i - 1),
          b = outline(i),
          c = outline(i + 1),
          d = outline(i + 2);
        g.bezierCurveTo(
          b[0] + (c[0] - a[0]) / 6,
          b[1] + (c[1] - a[1]) / 6,
          c[0] - (d[0] - b[0]) / 6,
          c[1] - (d[1] - b[1]) / 6,
          c[0],
          c[1],
        );
      }
      g.closePath();
      g.fillStyle = gradient;
      g.shadowColor = "#b6b4ff";
      g.shadowBlur = body * 0.32;
      g.fill();
      g.shadowBlur = 0;
      g.save();
      g.clip();
      for (const [x, y, color] of [
        [-0.55, 0.4, "#c3ffff"],
        [0.6, -0.4, "#ffd5f6"],
        [-0.3, -0.55, "#67a9ff"],
      ] as const) {
        const light = g.createRadialGradient(
          body * x,
          body * y,
          0,
          body * x,
          body * y,
          body * 1.2,
        );
        light.addColorStop(0, color);
        light.addColorStop(1, color + "00");
        g.fillStyle = light;
        g.fillRect(-body * 1.1, -body * 1.1, body * 2.2, body * 2.2);
      }
      const pearl = g.createRadialGradient(
        0,
        0,
        body * 0.55,
        0,
        0,
        body * 1.04,
      );
      pearl.addColorStop(0, "#ffffff00");
      pearl.addColorStop(0.75, "#fff2ff22");
      pearl.addColorStop(1, "#fff1ffb0");
      g.fillStyle = pearl;
      g.fillRect(-body * 1.1, -body * 1.1, body * 2.2, body * 2.2);
      g.restore();
      g.strokeStyle = "#f2ddffbd";
      g.lineWidth = body * 0.045;
      g.stroke();
      g.strokeStyle = "#ffffff80";
      g.lineWidth = body * 0.012;
      g.stroke();
      g.translate(s.x * body * 0.075, s.y * body * 0.065);
      const eyeY = -body * 0.11,
        eyeX = body * 0.235,
        blink = still ? 1 : Math.abs(Math.sin(time * 0.37)) < 0.035 ? 0.08 : 1;
      g.strokeStyle = "#26112f";
      g.fillStyle = "#26112f";
      g.lineWidth = body * 0.055;
      g.lineCap = "round";
      for (const side of [-1, 1]) {
        const x = eyeX * side;
        g.beginPath();
        if (happy) {
          g.moveTo(x - body * 0.09, eyeY + body * 0.025);
          g.quadraticCurveTo(
            x,
            eyeY - body * 0.14,
            x + body * 0.09,
            eyeY + body * 0.025,
          );
          g.stroke();
        } else if (mood === "sleepy") {
          g.moveTo(x - body * 0.08, eyeY);
          g.quadraticCurveTo(x, eyeY + body * 0.05, x + body * 0.08, eyeY);
          g.stroke();
        } else {
          g.ellipse(
            x,
            eyeY,
            body * 0.16,
            body * 0.265 * blink,
            -0.12,
            0,
            Math.PI * 2,
          );
          g.fill();
        }
      }
      g.strokeStyle = "#39405d";
      g.lineWidth = body * 0.035;
      g.beginPath();
      if (mood === "listening" && !happy) {
        g.ellipse(
          0,
          body * 0.19,
          body * 0.045,
          body * 0.065,
          0,
          0,
          Math.PI * 2,
        );
      } else if (happy) {
        g.moveTo(-body * 0.07, body * 0.16);
        g.quadraticCurveTo(
          0,
          body * (happy ? 0.28 : 0.22),
          body * 0.07,
          body * 0.16,
        );
      }
      g.stroke();
      for (const side of [-1, 1]) {
        const blush = g.createRadialGradient(
          side * body * 0.4,
          body * 0.16,
          0,
          side * body * 0.4,
          body * 0.16,
          body * 0.15,
        );
        blush.addColorStop(0, accent + "80");
        blush.addColorStop(1, accent + "00");
        g.fillStyle = blush;
        g.beginPath();
        g.ellipse(
          side * body * 0.4,
          body * 0.16,
          body * 0.15,
          body * 0.1,
          0,
          0,
          Math.PI * 2,
        );
        g.fill();
      }
      if (mood === "listening")
        for (let i = 0; i < 3; i++) {
          g.fillStyle = accent;
          g.globalAlpha = 0.4 + 0.5 * Math.sin(time * 3 + i);
          g.beginPath();
          g.arc(
            (i - 1) * body * 0.2,
            -body * 1.35,
            body * 0.035,
            0,
            Math.PI * 2,
          );
          g.fill();
        }
      g.globalAlpha = 1;
      g.restore();
    },
    paused,
    compact,
  );
  const activate = () => {
    if (!interactive || paused) return;
    onAgentClick?.(mood);
    const s = state.current;
    s.age = 0;
    s.ringV += 3.8;
    s.jumpV -= 3.8;
    s.squashV += 4.5;
    invalidate();
  };
  return (
    <div
      ref={host}
      className={`mq-orbit-agent ${className}`}
      role={interactive ? "button" : "img"}
      tabIndex={interactive && !compact ? 0 : -1}
      aria-label={`AI agent, ${mood}. ${interactive ? "Activate to greet." : ""}`}
      onClick={activate}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          if (!e.repeat) activate();
        }
      }}
      onPointerMove={(e) => {
        if (!interactive || paused) return;
        const r = e.currentTarget.getBoundingClientRect();
        const s = state.current;
        s.tx = kineticClamp(((e.clientX - r.left) / r.width) * 2 - 1, -1, 1);
        s.ty = kineticClamp(((e.clientY - r.top) / r.height) * 2 - 1, -1, 1);
        s.hoverTo = 1;
      }}
      onPointerLeave={() => {
        const s = state.current;
        s.tx = s.ty = s.hoverTo = 0;
      }}
    >
      <style>{styles}</style>
      <canvas ref={canvas} aria-hidden="true" />
    </div>
  );
}
const styles = `.mq-orbit-agent{position:relative;width:100%;height:100%;min-height:220px;overflow:hidden;background:#0b0d14;outline:none;touch-action:manipulation}.mq-orbit-agent[role=button]{cursor:pointer}.mq-orbit-agent:focus-visible{outline:1px solid #c4b5fd;outline-offset:-6px}.mq-orbit-agent>canvas{position:absolute;inset:0;display:block;width:100%;height:100%}`;
