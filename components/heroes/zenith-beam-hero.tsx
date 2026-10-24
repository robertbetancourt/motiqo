"use client";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { createZenithScene } from "./zenith-beam-scene";
export type ZenithBeamHeroProps = {
  title?: string;
  subtitle?: string;
  beamColor?: string;
  interactive?: boolean;
  paused?: boolean;
  className?: string;
};
export default function ZenithBeamHero({
  title = "Quantum Core",
  subtitle = "A new dimension of distributed computing. Connect your ideas through a luminous, spatial infrastructure.",
  beamColor = "#A855F7",
  interactive = true,
  paused = false,
  className = "",
}: ZenithBeamHeroProps) {
  const root = useRef<HTMLElement>(null),
    canvas = useRef<HTMLCanvasElement>(null),
    [activated, setActivated] = useState(false);
  const options = useRef({ beamColor, interactive, paused });
  options.current = {
    beamColor: /^#[\da-f]{6}$/i.test(beamColor) ? beamColor : "#A855F7",
    interactive,
    paused,
  };
  const scene = useRef<ReturnType<typeof createZenithScene>>(null);
  useEffect(() => {
    scene.current = createZenithScene(
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
    [beamColor, interactive, paused],
  );
  function activate() {
    setActivated(true);
    scene.current?.pulse();
  }
  return (
    <section
      ref={root}
      className={`zenith-hero ${className}`}
      style={{ "--zb-color": options.current.beamColor } as CSSProperties}
      aria-label="Zenith Beam hero"
    >
      <style>{styles}</style>
      <canvas ref={canvas} aria-hidden="true" />
      <header inert aria-hidden="true">
        <a href="#zenith-main" className="zb-brand">
          <span aria-hidden="true">✳</span> AETHER <small>QUANTUM</small>
        </a>
        <nav aria-label="Zenith navigation">
          {["Architecture", "Protocols", "Benchmarks", "Docs", "Journal"].map(
            (label, i) => (
              <a key={label} href={i === 3 ? "/docs" : "#zenith-details"}>
                {label}
              </a>
            ),
          )}
        </nav>
        <div className="zb-actions">
          <span>● Network online</span>
          <a href="/library?group=forms">Sign In</a>
          <button onClick={activate}>Launch Node ↗</button>
        </div>
      </header>
      <main id="zenith-main">
        <div className="zb-title">
          <h1>{title}</h1>
          <i aria-hidden="true" />
        </div>
        <p>{subtitle}</p>
        <div className="zb-chassis">
          <button onClick={activate}>
            Initialize Cluster <span>→</span>
          </button>
        </div>
        <span className="zb-status" role="status">
          {activated ? "Energy pulse initialized" : ""}
        </span>
      </main>
      <aside id="zenith-details">
        <strong>Deploy in seconds</strong>
        <p>
          Shape your infrastructure.
          <br />
          Find your next dimension.
        </p>
        <a href="/pricing">
          Configure Tier <span>↗</span>
        </a>
      </aside>
      <a className="zb-scroll" href="#zenith-details">
        Scroll to explore ↓
      </a>
    </section>
  );
}
const styles = `.zenith-hero{position:relative;isolation:isolate;min-height:780px;height:100%;overflow:hidden;color:#f5f1fc;background:radial-gradient(ellipse at 50% 0,#36105d,#05020c 65%);font-family:'Urbanist Variable',Urbanist,Arial,sans-serif}.zenith-hero *{box-sizing:border-box}.zenith-hero canvas{position:absolute;inset:0;width:100%;height:100%;z-index:-1}.zenith-hero header{display:flex;align-items:center;justify-content:space-between;gap:24px;padding:32px 4%;font-size:11px}.zenith-hero a{color:inherit;text-decoration:none}.zb-brand{display:flex;align-items:center;gap:9px;font-size:14px;font-weight:650}.zb-brand>span{font-size:29px;color:#ded3ff}.zb-brand small{font-size:8px;letter-spacing:.1em;color:#a99cbd}.zenith-hero nav{display:flex;gap:24px;color:#c6bcd2}.zb-actions{display:flex;gap:18px;align-items:center}.zb-actions>span{font-size:9px;color:#c5a9e1}.zenith-hero button,.zb-actions>a,.zb-chassis{border:1px solid #ffffff22;border-radius:8px;color:#fff;background:#ffffff06;font:inherit;cursor:pointer;padding:10px 16px}.zb-actions button,.zb-chassis button{background:linear-gradient(#7470f6,#4842c9);box-shadow:inset 0 1px #ffffff55,0 0 25px #6b50df55}.zenith-hero main{position:relative;text-align:center;position:absolute;top:46%;left:0;right:0;margin:0 auto;padding:0 24px;transform:translateY(-12%);max-width:950px}.zb-title{position:relative}.zb-title h1{margin:0;font-size:clamp(58px,8vw,112px);font-weight:500;line-height:1;letter-spacing:-.055em;background:linear-gradient(#fff 10%,#ddd4e1 38%,#665c77 85%);background-clip:text;color:transparent;filter:drop-shadow(0 8px 25px #ae6bff22)}.zb-title i{position:absolute;left:calc(50% - 60px);top:25px;width:120px;height:55px;background:var(--zb-color);filter:blur(40px);opacity:.28;mix-blend-mode:screen;pointer-events:none}.zenith-hero main>p{max-width:420px;margin:26px auto;color:#beb3cc;font-size:13px;line-height:1.7}.zb-chassis{display:inline-block;padding:5px;backdrop-filter:blur(15px);box-shadow:0 0 50px #7847dd40}.zb-chassis button{padding:13px 23px;font-size:12px}.zb-chassis span{margin-left:18px}.zb-status{display:block;min-height:20px;margin-top:16px;font-size:10px;color:#c8b4e4}.zenith-hero aside{position:absolute;bottom:36px;left:32px;width:190px;padding:18px;border:1px solid #ffffff22;border-radius:14px;background:#100a2377;backdrop-filter:blur(18px);font-size:12px}.zenith-hero aside strong{font-weight:550}.zenith-hero aside p{font-size:11px;line-height:1.5;color:#bcb0cd}.zenith-hero aside a{display:flex;justify-content:space-between;padding:10px;background:linear-gradient(#6860e2,#443ab2);border-radius:7px;font-size:11px}.zb-scroll{position:absolute;bottom:40px;left:50%;transform:translateX(-50%);font-size:10px;color:#b6a7c8!important}.zenith-hero a:focus-visible,.zenith-hero button:focus-visible{outline:2px solid #e9d5ff;outline-offset:5px}.zenith-hero button:hover{filter:brightness(1.15)}@media(max-width:900px){.zenith-hero nav,.zb-actions>span{display:none}}@media(max-width:560px){.zenith-hero header{padding:22px 20px}.zb-brand small,.zb-actions>a{display:none}.zenith-hero main{top:44%;margin-top:0}.zb-title h1{font-size:58px}.zenith-hero aside{bottom:60px;left:20px;width:170px;padding:14px}.zb-scroll{bottom:22px}.zb-actions{gap:6px}}@media(prefers-reduced-motion:reduce){.zenith-hero *{scroll-behavior:auto;transition:none!important}}`;
