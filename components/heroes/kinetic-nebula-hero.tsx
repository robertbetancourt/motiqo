"use client";
import { useEffect, useRef, useState } from "react";
import { createNebulaScene, type NebulaOptions } from "./nebula-scene";
export type KineticNebulaHeroProps = {
  particleCount?: number;
  flowSpeed?: number;
  turbulence?: number;
  colorPreset?: "cyber" | "aurora" | "gold";
  paused?: boolean;
  className?: string;
};
export default function KineticNebulaHero({
  particleCount = 30000,
  flowSpeed = 1,
  turbulence = 1,
  colorPreset = "cyber",
  paused = false,
  className = "",
}: KineticNebulaHeroProps) {
  const root = useRef<HTMLElement>(null),
    canvas = useRef<HTMLCanvasElement>(null),
    scene = useRef<ReturnType<typeof createNebulaScene>>(null),
    [mode, setMode] = useState<NebulaOptions["mode"]>("laminar"),
    [pulseCount, setPulseCount] = useState(0);
  const count = Number.isFinite(particleCount)
    ? Math.max(1000, Math.min(60000, Math.round(particleCount)))
    : 30000;
  const options = useRef<NebulaOptions>({
    particleCount: count,
    flowSpeed,
    turbulence,
    colorPreset,
    mode,
    paused,
  });
  options.current = {
    particleCount: count,
    flowSpeed: Number.isFinite(flowSpeed)
      ? Math.max(0, Math.min(4, flowSpeed))
      : 1,
    turbulence: Number.isFinite(turbulence)
      ? Math.max(0, Math.min(3, turbulence))
      : 1,
    colorPreset:
      colorPreset in { cyber: 1, aurora: 1, gold: 1 } ? colorPreset : "cyber",
    mode,
    paused,
  };
  useEffect(() => {
    scene.current = createNebulaScene(
      root.current!,
      canvas.current!,
      () => options.current,
    );
    return () => {
      scene.current?.dispose();
      scene.current = null;
    };
  }, [count]);
  useEffect(
    () => scene.current?.invalidate(),
    [paused, flowSpeed, turbulence, colorPreset, mode],
  );
  function pulse() {
    scene.current?.pulse();
    setPulseCount((v) => v + 1);
  }
  return (
    <section
      ref={root}
      className={`kinetic-nebula ${className}`}
      aria-label="Kinetic Nebula generative particle hero"
      onPointerMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        scene.current?.pointer(
          ((e.clientX - r.left) / r.width) * 2 - 1,
          1 - ((e.clientY - r.top) / r.height) * 2,
        );
      }}
      onPointerLeave={() => {
        scene.current?.pointer(4, 4);
        scene.current?.hold(false);
      }}
    >
      <style>{styles}</style>
      <div className="kn-fallback" aria-hidden="true" />
      <canvas ref={canvas} aria-hidden="true" />
      <nav className="kn-nav" aria-label="Particle flow">
        <span className="kn-brand">
          <svg viewBox="0 0 30 30" aria-hidden="true">
            <ellipse
              cx="15"
              cy="15"
              rx="12"
              ry="5"
              transform="rotate(-35 15 15)"
            />
            <ellipse
              cx="15"
              cy="15"
              rx="12"
              ry="5"
              transform="rotate(35 15 15)"
            />
          </svg>
          NEBULA<span>FIELD SYSTEMS</span>
        </span>
        <span className="kn-particle-count">
          {count.toLocaleString("en-US")} GPU PARTICLES · CURL FIELD
        </span>
        <div className="kn-modes" role="group" aria-label="Flow mode">
          {(["laminar", "vortex", "pulse"] as const).map((value) => (
            <button
              type="button"
              key={value}
              aria-pressed={mode === value}
              onClick={() => setMode(value)}
            >
              {value[0].toUpperCase() + value.slice(1)}
            </button>
          ))}
        </div>
      </nav>
      <div className="kn-content">
        <span className="kn-eyebrow">
          <i /> GENERATIVE FIELD SYSTEM
        </span>
        <h1>
          Fluid intelligence
          <br />
          <span>in every particle.</span>
        </h1>
        <p>
          Divergence-free curl noise streams and real-time depth-of-field optics
          that respond organically to every gesture.
        </p>
        <button
          type="button"
          className="kn-cta"
          onClick={pulse}
          onPointerDown={() => scene.current?.hold(true)}
          onPointerUp={() => scene.current?.hold(false)}
          onPointerCancel={() => scene.current?.hold(false)}
          onBlur={() => scene.current?.hold(false)}
        >
          Disturb the field <span aria-hidden="true">↗</span>
        </button>
        <span className="kn-cta-note">HOLD TO BEND THE CURRENT</span>
      </div>
      <footer className="kn-footer">
        <span>DESIGNED TO BE DISTURBED.</span>
        <span>
          NO TWO CURRENTS ALIKE <i>—</i> MOTIQO
        </span>
      </footer>
      <p className="kn-status" role="status">
        {pulseCount > 0 ? `Field pulse ${pulseCount} released.` : ""}
      </p>
      <p className="kn-gl-notice">
        Static field preview. WebGL is unavailable.
      </p>
    </section>
  );
}
const styles = `.kinetic-nebula{position:relative;isolation:isolate;width:100%;min-height:780px;height:100%;overflow:hidden;background:#030407;color:#edf4ff;font-family:'Urbanist Variable',Urbanist,Arial,sans-serif;container-type:inline-size}.kinetic-nebula *{box-sizing:border-box}.kinetic-nebula>canvas,.kn-fallback{position:absolute;inset:0;width:100%;height:100%;z-index:-1}.kn-fallback{background:radial-gradient(ellipse at 75% 48%,#2941b833,transparent 45%),radial-gradient(ellipse at 70% 65%,#7c3aed26,transparent 37%)}.kinetic-nebula[data-gl=on] .kn-fallback{opacity:0}.kn-nav{display:flex;align-items:center;justify-content:space-between;gap:20px;padding:35px 45px;position:relative;z-index:2}.kn-brand{display:flex;gap:11px;align-items:center;letter-spacing:.15em;font-size:17px;font-weight:550}.kn-brand>svg{width:30px;height:30px;fill:none;stroke:#d8eaff;stroke-width:1}.kn-brand>span{font:7px ui-monospace,monospace;letter-spacing:.12em;color:#8b9cb7;max-width:45px;line-height:1.6}.kn-particle-count{font:8px ui-monospace,monospace;letter-spacing:.12em;color:#8298b8}.kn-modes{display:flex;gap:3px;padding:4px;background:#11192777;border:1px solid #ffffff12;border-radius:99px;backdrop-filter:blur(15px)}.kn-modes button{border:0;border-radius:99px;background:none;color:#9fb0ca;min-height:34px;padding:0 15px;font:inherit;font-size:11px;cursor:pointer}.kn-modes button[aria-pressed=true]{background:#29395188;color:#f3f8ff}.kn-content{position:relative;z-index:1;padding:135px 7% 100px;max-width:850px;pointer-events:none}.kn-content button{pointer-events:auto}.kn-eyebrow{display:inline-flex;align-items:center;gap:8px;border:1px solid #a3cbff28;border-radius:99px;padding:8px 12px;color:#afc6e8;font:8px ui-monospace,monospace;letter-spacing:.12em;background:#18305225}.kn-eyebrow i{width:4px;height:4px;border-radius:50%;background:#85bdff;box-shadow:0 0 8px #85bdff}.kn-content h1{font-size:clamp(45px,6.3cqw,86px);line-height:1.03;font-weight:500;letter-spacing:-.05em;margin:27px 0 23px;text-shadow:0 2px 35px #030407}.kn-content h1 span{background:linear-gradient(115deg,#edf3ff,#a7bbef 60%,#838cc6);background-clip:text;color:transparent}.kn-content>p{font-size:15px;line-height:1.8;color:#9baecb;max-width:390px;margin:0 0 30px;text-wrap:pretty}.kn-cta{min-height:48px;padding:12px 22px;border:1px solid #a4c5ff65;border-radius:99px;background:#dcecff;color:#0a1629;box-shadow:0 0 35px #4285ff25;font:600 12px inherit;cursor:pointer;display:inline-flex;gap:30px;align-items:center}.kn-cta:hover{box-shadow:0 0 50px #4285ff60}.kn-cta-note{display:block;margin:13px 0 0 9px;font:7px ui-monospace,monospace;letter-spacing:.1em;color:#879ebd}.kn-footer{position:absolute;bottom:32px;left:45px;right:45px;display:flex;justify-content:space-between;gap:20px;border-top:1px solid #ffffff0f;padding-top:24px;font:7px ui-monospace,monospace;letter-spacing:.16em;color:#7086a3}.kn-footer i{margin:0 12px;font-style:normal;color:#4b5b71}.kn-status{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%)}.kn-gl-notice{display:none;position:absolute;bottom:65px;left:7%;font-size:11px;color:#a6bad5}.kinetic-nebula[data-gl=off] .kn-gl-notice{display:block}.kinetic-nebula button:focus-visible{outline:2px solid #bdd9ff;outline-offset:4px}@container(max-width:800px){.kn-nav{padding:25px}.kn-particle-count{display:none}.kn-content{padding:160px 7% 130px}.kn-content h1{font-size:clamp(48px,8cqw,72px)}.kn-footer{left:25px;right:25px}.kn-brand{font-size:15px}}@container(max-width:500px){.kinetic-nebula{min-height:780px;height:100%}.kn-nav{align-items:start;flex-wrap:wrap;gap:18px}.kn-brand>span{max-width:none}.kn-modes{width:100%;justify-content:center}.kn-modes button{flex:1}.kn-content{padding:100px 7% 110px}.kn-content h1{font-size:clamp(42px,10cqw,60px)}.kn-content>p{font-size:14px}.kn-footer{font-size:6px;letter-spacing:.08em}.kn-footer>span:last-child{max-width:110px;text-align:right;line-height:1.6}.kn-footer i{margin:0 4px}}@media(prefers-reduced-motion:reduce){.kinetic-nebula *{animation:none!important;transition:none!important}}`;
