"use client";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { createBioTerrainScene } from "./bio-terrain-scene";
export type BioTerrainHeroProps = {
  particleCount?: number;
  waveSpeed?: number;
  pulseIntensity?: number;
  accentColor?: string;
  paused?: boolean;
  className?: string;
};
export default function BioTerrainHero({
  particleCount = 45000,
  waveSpeed = 1,
  pulseIntensity = 1,
  accentColor = "#9EF054",
  paused = false,
  className = "",
}: BioTerrainHeroProps) {
  const root = useRef<HTMLElement>(null),
    canvas = useRef<HTMLCanvasElement>(null),
    scene = useRef<ReturnType<typeof createBioTerrainScene>>(null),
    [activated, setActivated] = useState(false),
    [details, setDetails] = useState(false),
    options = useRef({
      particleCount,
      waveSpeed,
      pulseIntensity,
      accentColor,
      paused,
    });
  options.current = {
    particleCount,
    waveSpeed,
    pulseIntensity,
    accentColor,
    paused,
  };
  useEffect(() => {
    scene.current = createBioTerrainScene(
      root.current!,
      canvas.current!,
      () => options.current,
    );
    return () => {
      scene.current?.dispose();
      scene.current = null;
    };
  }, [particleCount]);
  useEffect(
    () => scene.current?.invalidate(),
    [waveSpeed, pulseIntensity, accentColor, paused],
  );
  function activate() {
    setActivated(true);
    scene.current?.pulse();
  }
  const accent = /^#[\da-f]{6}$/i.test(accentColor) ? accentColor : "#9EF054";
  return (
    <section
      ref={root}
      className={`bio-hero ${className}`}
      aria-label="Bio Terrain hero"
      style={{ "--bio-accent": accent } as CSSProperties}
    >
      <style>{styles}</style>
      <div className="bio-fallback" aria-hidden="true" />
      <canvas ref={canvas} aria-hidden="true" />
      <header inert aria-hidden="true">
        <a href="#bio-main" className="bio-brand">
          <svg width="26" height="26" viewBox="0 0 32 32" aria-hidden="true">
            <path
              d="m16 1 3.2 10.5L28 5l-6.5 8.8L32 17l-10.5 3.2L28 29l-8.8-6.5L16 33l-3.2-10.5L4 29l6.5-8.8L0 17l10.5-3.2L4 5l8.8 6.5Z"
              fill="currentColor"
            />
          </svg>
          Motiqo
        </a>
        <nav aria-label="Bio Terrain navigation">
          {["Primitives", "Telemetry", "Shaders", "Changelog", "Pricing"].map(
            (label) => (
              <a
                href={
                  label === "Pricing"
                    ? "/pricing"
                    : label === "Primitives"
                      ? "/library"
                      : "#bio-architecture"
                }
                key={label}
                onClick={() => {
                  if (["Telemetry", "Shaders", "Changelog"].includes(label))
                    setDetails(true);
                }}
              >
                {label}
              </a>
            ),
          )}
        </nav>
        <div>
          <a href="/library?group=forms">Sign In</a>
          <a className="bio-docs" href="/docs">
            Documentation ↗
          </a>
        </div>
      </header>
      <main id="bio-main">
        <span className="bio-badge">SYNTHETIC TELEMETRY ENGINE · V3.0</span>
        <h1>
          Living data.
          <br />
          Zero latency.
        </h1>
        <p>
          Stream, cluster, and illuminate your ideas through a GPU-powered
          spatial field built for human interaction.
        </p>
        <div className="bio-ctas">
          <button onClick={activate}>
            Deploy Cluster <span aria-hidden="true">↗</span>
          </button>
          <button
            aria-expanded={details}
            aria-controls="bio-architecture"
            onClick={() => setDetails((old) => !old)}
          >
            Explore Architecture
          </button>
        </div>
        <span className="bio-feedback" role="status">
          {activated ? "Bioluminescent wave released." : ""}
        </span>
        <div id="bio-architecture" hidden={!details}>
          <strong>One field. Three layers.</strong>
          <p>
            Simplex terrain shapes the surface. A travelling energy field lights
            the crests. Your pointer and deployment pulse excite the particles.
          </p>
        </div>
      </main>
      <footer>
        <span>PROCEDURAL TERRAIN / GPU PARTICLES</span>
        <span>Designed to feel alive.</span>
      </footer>
    </section>
  );
}
const styles = `.bio-hero{box-sizing:border-box;position:relative;isolation:isolate;min-height:780px;height:100%;overflow:hidden;background:#000;color:#f4f7f1;font-family:'Urbanist Variable',Urbanist,Arial,sans-serif}.bio-hero *{box-sizing:border-box}.bio-hero canvas,.bio-fallback{position:absolute;inset:0;width:100%;height:100%;z-index:-1}.bio-fallback{background:radial-gradient(ellipse at 20% 95%,#15582b55,transparent 35%),radial-gradient(ellipse at 80% 95%,#7fae3340,transparent 40%);opacity:1}.bio-hero[data-gl=on] .bio-fallback{opacity:0}.bio-hero header{display:flex;align-items:center;justify-content:space-between;gap:25px;padding:32px 4%;font-size:11px}.bio-hero a{text-decoration:none;color:inherit}.bio-brand{display:flex;gap:10px;align-items:center;font-size:16px;font-weight:600}.bio-brand svg{animation:bio-spin 50s linear infinite}.bio-hero nav{display:flex;gap:26px;color:#a8ada4}.bio-hero header>div{display:flex;gap:24px;align-items:center}.bio-docs{padding:10px 15px;border:1px solid #ffffff28;border-radius:99px;background:#ffffff06}.bio-hero main{position:relative;text-align:center;max-width:800px;margin:68px auto 0;padding:0 24px}.bio-badge{display:inline-flex;padding:9px 17px;border:1px solid #83c56833;border-radius:99px;font-size:9px;letter-spacing:.08em;color:#c2cbb9;background:#a9d98806}.bio-hero h1{font-size:clamp(54px,5.3vw,76px);font-weight:500;line-height:1.04;letter-spacing:-.045em;margin:24px 0 21px}.bio-hero main>p{max-width:420px;margin:0 auto;color:#a2a99e;font-size:13px;line-height:1.6}.bio-ctas{display:flex;justify-content:center;gap:14px;margin-top:28px}.bio-hero button{font:inherit;cursor:pointer}.bio-ctas button{border-radius:99px;padding:14px 24px;font-size:12px;font-weight:600;border:1px solid #4ade8040;background:#112a16cc;color:#b7e779;backdrop-filter:blur(10px)}.bio-ctas button:first-child{background:var(--bio-accent);color:#061b09;border-color:transparent;box-shadow:0 0 30px color-mix(in srgb,var(--bio-accent) 18%,transparent)}.bio-ctas button span{margin-left:13px}.bio-ctas button:hover{filter:brightness(1.12)}.bio-feedback{display:block;color:#b7d99e;font-size:10px;min-height:20px;margin-top:15px}#bio-architecture{max-width:450px;margin:8px auto;padding:20px;background:#07130dcc;border:1px solid #8dcc7033;border-radius:14px;backdrop-filter:blur(16px);text-align:left;font-size:12px}#bio-architecture p{font-size:12px;line-height:1.6;color:#b0bfa9;margin-bottom:0}.bio-hero footer{position:absolute;bottom:26px;left:4%;right:4%;display:flex;justify-content:space-between;font-size:8px;letter-spacing:.1em;color:#9cae93}.bio-hero a:focus-visible,.bio-hero button:focus-visible{outline:2px solid var(--bio-accent);outline-offset:5px}@keyframes bio-spin{to{transform:rotate(360deg)}}@media(max-width:900px){.bio-hero nav{display:none}}@media(max-width:560px){.bio-hero header{padding:22px 20px}.bio-hero header>div>a:first-child{display:none}.bio-docs{padding:9px 12px;font-size:10px}.bio-hero main{margin-top:85px;padding:0 20px}.bio-badge{font-size:7px;padding:8px 12px}.bio-hero h1{font-size:56px}.bio-ctas{gap:8px}.bio-ctas button{padding:13px 15px;font-size:10px}.bio-hero footer span:first-child{display:none}.bio-hero footer{justify-content:center}}@media(prefers-reduced-motion:reduce){.bio-hero *{animation:none!important;transition:none!important}}`;
