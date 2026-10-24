"use client";
import { useEffect, useRef, useState, useId } from "react";
import { createLuminaryScene } from "./luminary-scene";
export type LuminaryHeroProps = {
  brandTitle?: string;
  titleLine1?: string;
  titleLine2?: string;
  subtitle?: string;
  ior?: number;
  causticIntensity?: number;
  paused?: boolean;
  className?: string;
};
export default function LuminaryHero({
  brandTitle = "LUMINARY",
  titleLine1 = "Precision optics for",
  titleLine2 = "spatial interfaces.",
  subtitle = "Sub-pixel shaders, physically damped springs, and refractive glass primitives. Made to move with you.",
  ior = 1.52,
  causticIntensity = 1,
  paused = false,
  className = "",
}: LuminaryHeroProps) {
  const root = useRef<HTMLElement>(null),
    canvas = useRef<HTMLCanvasElement>(null),
    iorInput = useRef<HTMLInputElement>(null),
    scene = useRef<ReturnType<typeof createLuminaryScene>>(null),
    [refraction, setRefraction] = useState(ior),
    [intensity, setIntensity] = useState(causticIntensity),
    [tab, setTab] = useState("Optics"),
    [docs, setDocs] = useState(false),
    [inspecting, setInspecting] = useState(false);
  const docId = useId();
  const safeIor = Number.isFinite(refraction)
      ? Math.max(1, Math.min(2.5, refraction))
      : 1.52,
    safeIntensity = Number.isFinite(intensity)
      ? Math.max(0, Math.min(2.5, intensity))
      : 1,
    options = useRef({ ior: safeIor, causticIntensity: safeIntensity, paused });
  options.current = { ior: safeIor, causticIntensity: safeIntensity, paused };
  useEffect(() => setRefraction(ior), [ior]);
  useEffect(() => setIntensity(causticIntensity), [causticIntensity]);
  useEffect(() => {
    scene.current = createLuminaryScene(
      root.current!,
      canvas.current!,
      () => options.current,
    );
    return () => {
      scene.current?.dispose();
      scene.current = null;
    };
  }, []);
  useEffect(
    () => scene.current?.invalidate(),
    [safeIor, safeIntensity, paused],
  );
  function inspect() {
    setInspecting(true);
    iorInput.current?.focus({ preventScroll: true });
    iorInput.current?.scrollIntoView({ block: "nearest", behavior: "instant" });
  }
  function preset(value: string) {
    setTab(value);
    const p: Record<string, [number, number]> = {
      Optics: [1.52, 1],
      Materials: [1.82, 0.7],
      Field: [1.3, 1.8],
      Studio: [1.52, 1.3],
    };
    setRefraction(p[value][0]);
    setIntensity(p[value][1]);
  }
  return (
    <section
      ref={root}
      className={`luminary-hero ${className}`}
      aria-label="Luminary optical studio hero"
      onPointerMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        scene.current?.pointer(
          ((e.clientX - r.left) / r.width) * 2 - 1,
          1 - ((e.clientY - r.top) / r.height) * 2,
        );
      }}
      onPointerLeave={() => scene.current?.pointer(0, 0)}
    >
      <style>{styles}</style>
      <div className="lh-fallback" aria-hidden="true" />
      <canvas ref={canvas} aria-hidden="true" />
      <nav className="lh-nav" aria-label="Optical presets">
        <span className="lh-brand">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="m12 2 10 10-10 10L2 12Z M12 2v20 M2 12h20" />
          </svg>
          {brandTitle}
        </span>
        <div role="group" aria-label="Studio presets">
          {["Optics", "Materials", "Field", "Studio"].map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={tab === value}
              onClick={() => preset(value)}
            >
              {value}
            </button>
          ))}
        </div>
        <button type="button" className="lh-launch" onClick={inspect}>
          Launch Studio <span aria-hidden="true">↗</span>
        </button>
      </nav>
      <div className="lh-editorial">
        <span className="lh-badge">
          <i /> MOTIQO ENGINE · REALTIME OPTICS
        </span>
        <h1>
          {titleLine1}
          <br />
          <span>{titleLine2}</span>
        </h1>
        <p>{subtitle}</p>
        <div className="lh-actions">
          <button type="button" className="lh-primary" onClick={inspect}>
            Explore Primitives <span aria-hidden="true">↗</span>
          </button>
          <button
            type="button"
            className="lh-secondary"
            aria-expanded={docs}
            aria-controls={docId}
            onClick={() => setDocs((v) => !v)}
          >
            View Documentation
          </button>
        </div>
      </div>
      {docs && (
        <aside className="lh-docs" id={docId} aria-label="Optics documentation">
          <strong>The lens, explained.</strong>
          <p>
            IOR bends the background through the toroidal lens. Caustic
            intensity controls the surrounding light field. Pointer movement
            tilts the lens. All controls remain available with reduced motion.
          </p>
          <button type="button" onClick={() => setDocs(false)}>
            Close documentation
          </button>
        </aside>
      )}
      <div
        className="lh-dock"
        data-inspecting={inspecting || undefined}
        aria-label="Optical inspection controls"
      >
        <div className="lh-stat">
          <span>01 / RENDER</span>
          <div className="lh-stat-row">
            <strong data-lum-frame>Measuring…</strong>
            <svg viewBox="0 0 80 30" aria-hidden="true">
              <path
                d="M0 21 9 21 15 13 21 21 30 21 35 8 43 23 48 14 54 18 60 16 66 17 72 6 80 19"
                fill="none"
                stroke="currentColor"
                strokeWidth="1"
              />
            </svg>
          </div>
          <p>Frame interval · 5 active uniforms</p>
        </div>
        <label className="lh-stat">
          <span>02 / REFRACTION</span>
          <div className="lh-stat-row">
            <strong>{safeIor.toFixed(2)}</strong>
            <small>IOR</small>
          </div>
          <input
            ref={iorInput}
            type="range"
            aria-label="Refraction IOR"
            min="1"
            max="2.5"
            step=".01"
            value={safeIor}
            onChange={(e) => setRefraction(Number(e.target.value))}
          />
        </label>
        <label className="lh-stat">
          <span>03 / CAUSTICS</span>
          <div className="lh-stat-row">
            <strong>{safeIntensity.toFixed(2)}</strong>
            <small>INTENSITY</small>
          </div>
          <input
            type="range"
            aria-label="Caustic intensity"
            min="0"
            max="2.5"
            step=".05"
            value={safeIntensity}
            onChange={(e) => setIntensity(Number(e.target.value))}
          />
        </label>
      </div>
      <footer className="lh-footer">
        <span>CRAFTED IN LIGHT. ENGINEERED IN CODE.</span>
        <span>
          EXPLORE A DIFFERENT REFRACTION <i>↗</i>
        </span>
      </footer>
      <p className="lh-status" role="status">
        {inspecting
          ? "Optical inspection enabled. Adjust refraction and caustics below."
          : ""}
      </p>
      <p className="lh-gl-notice">Static light study. WebGL is unavailable.</p>
    </section>
  );
}
const styles = `.luminary-hero{position:relative;isolation:isolate;width:100%;min-height:780px;height:100%;overflow:hidden;background:#040508;color:#eff5ff;font-family:'Urbanist Variable',Urbanist,Arial,sans-serif;container-type:inline-size}.luminary-hero *{box-sizing:border-box}.luminary-hero>canvas,.lh-fallback{position:absolute;inset:0;width:100%;height:100%;z-index:-1}.lh-fallback{background:radial-gradient(ellipse at 50% 70%,#2c3fc866,#040508 65%)}.luminary-hero[data-gl=on] .lh-fallback{opacity:0}.lh-nav{position:relative;z-index:3;display:flex;align-items:center;justify-content:space-between;gap:25px;width:max-content;max-width:calc(100% - 50px);margin:28px auto 0;padding:8px 10px 8px 20px;border:1px solid #ffffff16;border-radius:99px;background:#ffffff05;backdrop-filter:blur(24px);box-shadow:inset 0 1px #ffffff15}.lh-brand{display:flex;align-items:center;gap:9px;font-size:12px;letter-spacing:.12em;font-weight:550;white-space:nowrap}.lh-brand svg{width:23px;height:23px;fill:none;stroke:#d6e5ff;stroke-width:.8}.lh-nav>div{display:flex;align-items:center;gap:5px}.lh-nav button{min-height:36px;padding:0 12px;background:none;color:#a1b1c8;border:0;border-radius:99px;font:inherit;font-size:11px;cursor:pointer;white-space:nowrap}.lh-nav button[aria-pressed=true]{color:#e9f3ff;background:#ffffff09}.lh-nav .lh-launch{background:#cadcf30f;border:1px solid #bfd4ed2b;color:#e0edff;padding:0 15px;display:flex;align-items:center;gap:14px}.lh-editorial{position:relative;z-index:1;padding:96px 25px 0;text-align:center;pointer-events:none}.lh-editorial button{pointer-events:auto}.lh-badge{display:inline-flex;gap:8px;align-items:center;font:8px ui-monospace,monospace;letter-spacing:.12em;border:1px solid #a8c7ff2b;border-radius:99px;padding:9px 13px;background:#1d2b4d33;color:#afc9e8;box-shadow:inset 0 1px #ffffff12}.lh-badge>i{width:4px;height:4px;border-radius:50%;background:#b6e8ff;box-shadow:0 0 9px #a3deff}.lh-editorial h1{font-size:clamp(44px,6cqw,82px);line-height:1.02;letter-spacing:-.05em;font-weight:550;margin:26px 0 22px;background:linear-gradient(#ffffff,#f3f6ff 42%,#8998ba);background-clip:text;color:transparent}.lh-editorial>p{font-size:14px;line-height:1.8;color:#a5b4cb;max-width:470px;margin:0 auto;white-space:normal;text-wrap:pretty}.lh-actions{display:flex;align-items:center;justify-content:center;gap:12px;margin-top:27px}.lh-actions button{display:inline-flex;align-items:center;justify-content:center;gap:20px;min-height:46px;padding:12px 22px;border-radius:99px;font:inherit;font-size:12px;cursor:pointer;transition:box-shadow .2s,background .2s,transform .2s}.lh-primary{border:1px solid #fff9;background:#edf6ff;color:#152033;box-shadow:0 0 35px #6fbcff25}.lh-primary:hover{box-shadow:0 0 45px #6fbcff50;transform:translateY(-1px)}.lh-secondary{border:1px solid #ffffff1c;background:#ffffff07;color:#c9d8ee;backdrop-filter:blur(15px)}.lh-secondary:hover{background:#ffffff12}.lh-dock{position:absolute;z-index:2;left:50%;bottom:100px;transform:translateX(-50%);width:min(850px,calc(100% - 80px));display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px;perspective:1000px}.lh-stat{display:block;min-width:0;padding:21px 23px;border:1px solid #c1d4ff24;border-radius:17px;background:#0b0d1375;backdrop-filter:blur(20px);box-shadow:inset 0 1px #ffffff0e,0 15px 35px #0003;transition:transform .35s,border-color .2s}.lh-stat:hover{transform:rotateX(3deg) rotateY(-3deg) translateY(-4px);border-color:#bfd9ff55}.lh-stat>span{font:8px ui-monospace,monospace;letter-spacing:.12em;color:#90a5c6}.lh-stat-row{display:flex;align-items:center;justify-content:space-between;gap:15px;margin:15px 0 10px}.lh-stat-row strong{font-size:30px;font-weight:450;letter-spacing:-.04em;line-height:1;font-variant-numeric:tabular-nums}.lh-stat-row small{font:8px ui-monospace,monospace;color:#a6bedf}.lh-stat-row svg{width:65px;height:28px;color:#b0d5ff}.lh-stat p{font-size:10px;color:#8499b7;margin:14px 0 0}.lh-stat input{display:block;width:100%;height:24px;accent-color:#a9ccf7;cursor:pointer;margin:6px 0 0}.lh-dock[data-inspecting] .lh-stat{border-color:#bfd9ff55}.lh-footer{position:absolute;bottom:32px;left:40px;right:40px;display:flex;justify-content:space-between;gap:20px;border-top:1px solid #ffffff0d;padding-top:20px;font:7px ui-monospace,monospace;letter-spacing:.12em;color:#7c91b0}.lh-footer i{font-style:normal;margin-left:12px}.lh-docs{position:absolute;z-index:5;left:50%;top:475px;transform:translateX(-50%);width:min(460px,calc(100% - 40px));padding:24px;border:1px solid #c8dcff33;border-radius:17px;background:#0a1324ed;backdrop-filter:blur(20px);box-shadow:0 20px 60px #0008}.lh-docs strong{font-size:17px;font-weight:500}.lh-docs p{font-size:12px;color:#adbfda;line-height:1.8}.lh-docs button{min-height:36px;border:1px solid #ffffff25;border-radius:6px;background:#ffffff0d;color:#dcecff;font:inherit;font-size:11px;padding:8px 12px;cursor:pointer}.lh-status{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%)}.lh-gl-notice{display:none;position:absolute;bottom:70px;left:25px;color:#9ab1d2;font-size:10px}.luminary-hero[data-gl=off] .lh-gl-notice{display:block}.luminary-hero button:focus-visible,.luminary-hero input:focus-visible{outline:2px solid #c6dfff;outline-offset:4px}@container(max-width:850px){.lh-nav{gap:12px}.lh-nav>div{gap:0}.lh-nav button{font-size:10px;padding:0 8px}.lh-editorial{padding-top:110px}.lh-editorial h1{font-size:clamp(43px,7.2cqw,66px)}.lh-dock{width:calc(100% - 50px);gap:10px}.lh-stat{padding:19px 16px}.lh-stat-row strong{font-size:26px}.lh-stat p{font-size:8px}}@container(max-width:550px){.lh-nav{width:calc(100% - 32px);max-width:none;padding-left:15px;margin-top:18px;justify-content:space-between}.lh-nav>div{display:none}.lh-brand{font-size:11px}.lh-editorial{padding-top:105px}.lh-editorial h1{font-size:clamp(40px,10cqw,54px)}.lh-editorial>p{font-size:13px;max-width:310px}.lh-badge{font-size:6px}.lh-actions{gap:8px}.lh-actions button{font-size:10px;padding:12px 15px;gap:10px}.lh-dock{width:calc(100% - 34px);bottom:110px;gap:7px}.lh-stat{padding:14px 10px;border-radius:12px}.lh-stat>span{font-size:5px;letter-spacing:.05em}.lh-stat-row{margin:12px 0 5px;gap:5px}.lh-stat-row strong{font-size:21px}.lh-stat-row small{font-size:5px}.lh-stat-row svg{display:none}.lh-stat p{font-size:7px;line-height:1.5;margin-top:11px}.lh-stat input{height:22px}.lh-footer{left:20px;right:20px;font-size:6px;line-height:1.6}.lh-footer>span:last-child{max-width:100px;text-align:right}.lh-docs{top:470px}.lh-editorial h1{letter-spacing:-.045em}}@media(prefers-reduced-motion:reduce){.luminary-hero *{animation:none!important;transition:none!important}.lh-stat:hover{transform:none}}`;
