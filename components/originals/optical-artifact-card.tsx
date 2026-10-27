"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useId,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type CSSProperties,
} from "react";
import { createNativeGL } from "./native-gl";
import { effectRuntime } from "./effect-runtime";
import { opticalFragment } from "./optical-shaders";

export interface OpticalArtifactCardProps {
  ownerId?: string;
  creatorId?: string;
  priceEth?: string;
  priceUsd?: string;
  accentColor?: string;
  opticalIntensity?: number;
  theme?: "auto" | "light" | "dark";
  artworkSrc?: string;
  paused?: boolean;
  compact?: boolean;
  className?: string;
}

// OpticalButton's complete shader, adapted only for the card silhouette and surface.
export const cardOpticalShader = opticalFragment
  .replace("uniform float uHueOffset;", "uniform float uHueOffset,uIsDark;")
  .replace(
    "return sdRoundedBox(p,b,min(b.x,b.y));",
    "return sdRoundedBox(p,b,min(26.,min(b.x,b.y)));",
  )
  .replace(
    /float perimeter\(vec2 p\)\{[\s\S]*?\n\}/,
    `float perimeter(vec2 p){
    vec2 b=uSize*.5;float r=min(26.,min(b.x,b.y));vec2 straight=b-r,q=abs(p);
    float quarter=straight.x+straight.y+PI*r*.5,arc;
    if(q.x>straight.x&&q.y>straight.y)arc=straight.y+r*atan(q.y-straight.y,q.x-straight.x);
    else if(q.x>straight.x)arc=q.y;
    else arc=straight.y+PI*r*.5+straight.x-q.x;
    float distance=p.x>=0.?(p.y>=0.?arc:4.*quarter-arc):(p.y>=0.?2.*quarter-arc:2.*quarter+arc);
    return distance/(4.*quarter);
  }`,
  )
  .replace(
    "vec3 color=vec3(.033,.036,.047)*(1.-uDarkness*.007);",
    "vec3 color=mix(vec3(.965),vec3(.035),uIsDark)*(1.-uDarkness*.007);",
  )
  .replaceAll("vec3(.7,.8,1.)", "vec3(.85)")
  .replaceAll("vec3(.72,.82,.95)", "vec3(.82)");

export default function OpticalArtifactCard({
  ownerId = "5811EX",
  creatorId = "45TY87",
  priceEth = "5.65",
  priceUsd = "10,344",
  accentColor = "#9b6be8",
  opticalIntensity = 1.0,
  theme: initialTheme = "auto",
  artworkSrc = "/media/optical-artifact-bust-purple.png",
  paused = false,
  compact = false,
  className = "",
}: OpticalArtifactCardProps) {
  const [theme, setTheme] = useState<"light" | "dark">(
    initialTheme === "light" ? "light" : "dark",
  );
  const defaultArtwork = "/media/optical-artifact-bust-purple.png";
  const safeArtwork = typeof artworkSrc === "string" && /^(https?:\/\/|\/(?!\/))/i.test(artworkSrc.trim()) ? artworkSrc.trim() : defaultArtwork;
  const [failedArtwork, setFailedArtwork] = useState<string | null>(null);
  const isDark = theme === "dark";
  const chartId = useId().replace(/:/g, "");

  const currentAccent = /^#[\da-f]{6}$/i.test(accentColor)
    ? accentColor
    : "#9b6be8";
  const renderOptions = useRef({ paused, isDark, opticalIntensity });
  renderOptions.current = { paused, isDark, opticalIntensity };
  const wrapperRef = useRef<HTMLDivElement>(null),
    fitRef = useRef<HTMLDivElement>(null),
    hitRef = useRef<HTMLDivElement>(null);
  const wake = useRef<() => void>(() => {}),
    [generation, setGeneration] = useState(0);
  useEffect(() => {
    const scheme = matchMedia("(prefers-color-scheme: light)");
    const sync = () => {
      const site = document.documentElement.dataset.theme;
      setTheme(
        initialTheme === "auto"
          ? site === "light" || site === "dark"
            ? site
            : scheme.matches
              ? "light"
              : "dark"
          : initialTheme,
      );
    };
    sync();
    if (initialTheme !== "auto") return;
    const observer = new window.MutationObserver(sync);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
    scheme.addEventListener("change", sync);
    return () => {
      observer.disconnect();
      scheme.removeEventListener("change", sync);
    };
  }, [initialTheme]);
  useLayoutEffect(() => {
    const measure = () => {
      const host = wrapperRef.current!,
        hit = hitRef.current!,
        scale = Math.min(
          1,
          Math.max(0.1, (host.clientWidth - 28) / 350),
          Math.max(0.1, (host.clientHeight - 28) / (hit.clientHeight || 454)),
        );
      fitRef.current!.style.transform = `scale(${scale})`;
    };
    measure();
    const size = new ResizeObserver(measure);
    size.observe(wrapperRef.current!);
    size.observe(hitRef.current!);
    return () => size.disconnect();
  }, []);

  const [multiplier, setMultiplier] = useState<1 | 2 | 5>(1);
  const [scrambleUsd, setScrambleUsd] = useState(priceUsd);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [buyState, setBuyState] = useState<"idle" | "processing" | "collected">(
    "idle",
  );

  const cardRef = useRef<HTMLDivElement>(null);
  const opticalCanvasRef = useRef<HTMLCanvasElement>(null);

  const inputState = useRef({
    x: 0,
    y: 0,
    hover: 0,
    clickX: 0,
    clickY: 0,
    click: 0,
    tiltX: 0,
    tiltY: 0,
  });

  const scrambleIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null,
  );
  const buyTimeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    return () => {
      if (scrambleIntervalRef.current)
        clearInterval(scrambleIntervalRef.current);
      buyTimeoutsRef.current.forEach((t) => clearTimeout(t));
    };
  }, []);

  const cycleMultiplier = useCallback(() => {
    if (scrambleIntervalRef.current) clearInterval(scrambleIntervalRef.current);
    const next = multiplier === 1 ? 2 : multiplier === 2 ? 5 : 1;
    setMultiplier(next);

    const baseNum =
      Number(priceUsd.replace(/,/g, "")) || parseFloat(priceEth) * 1830.8;
    const targetVal = Math.round(baseNum * next);

    if (paused || matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setScrambleUsd(targetVal.toLocaleString("en-US"));
      return;
    }
    let count = 0;
    scrambleIntervalRef.current = setInterval(() => {
      count++;
      if (count > 6) {
        if (scrambleIntervalRef.current) {
          clearInterval(scrambleIntervalRef.current);
          scrambleIntervalRef.current = null;
        }
        setScrambleUsd(targetVal.toLocaleString("en-US"));
      } else {
        const rand = Math.floor(Math.random() * 90000 + 10000);
        setScrambleUsd(rand.toLocaleString("en-US"));
      }
    }, 45);
  }, [multiplier, priceEth, priceUsd, paused]);

  const handleBuyNow = useCallback(() => {
    if (buyState !== "idle") return;
    setBuyState("processing");

    // Trigger Optical shockwave ripple
    inputState.current.clickX = inputState.current.x;
    inputState.current.clickY = inputState.current.y;
    inputState.current.click++;
    wake.current();

    const t1 = setTimeout(() => {
      setBuyState("collected");
      const t2 = setTimeout(() => {
        setBuyState("idle");
      }, 2600);
      buyTimeoutsRef.current.push(t2);
    }, 650);
    buyTimeoutsRef.current.push(t1);
  }, [buyState]);

  const handlePointerMove = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      const card = cardRef.current;
      if (!card) return;
      const r = hitRef.current!.getBoundingClientRect();
      const curX = ((e.clientX - r.left) / r.width - 0.5) * card.clientWidth;
      const curY = (0.5 - (e.clientY - r.top) / r.height) * card.clientHeight;

      const nx = Math.max(
        -1,
        Math.min(1, ((e.clientX - r.left) / r.width) * 2 - 1),
      );
      const ny = Math.max(
        -1,
        Math.min(1, ((e.clientY - r.top) / r.height) * 2 - 1),
      );

      const s = inputState.current;
      s.x = curX;
      s.y = curY;
      s.hover = 1;
      s.tiltX = -ny * 5;
      s.tiltY = nx * 5;
      wake.current();
    },
    [],
  );

  const handlePointerLeave = useCallback(() => {
    const s = inputState.current;
    s.hover = 0;
    s.tiltX = 0;
    s.tiltY = 0;
    wake.current();
  }, []);

  // WebGL2 Optical Shader Runtime (Exact math and rendering from OpticalButton)
  useEffect(() => {
    const card = cardRef.current;
    const canvas = opticalCanvasRef.current;
    if (!card || !canvas) return;

    let renderer: ReturnType<typeof createNativeGL> | undefined;
    let clock: ReturnType<typeof effectRuntime> | undefined;

    try {
      renderer = createNativeGL(canvas, true);
      const pass = renderer.pass(cardOpticalShader);

      let x = 0,
        y = 0,
        vx = 0,
        vy = 0,
        hover = 0,
        rx = 0,
        ry = 0,
        ripple = 100,
        clickVersion = 0;

      clock = effectRuntime(
        card,
        canvas,
        (time, dt) => {
          const step = dt || 0,
            opt = renderOptions.current;
          const target = inputState.current;

          vx += (target.x - x) * 190 * step;
          vy += (target.y - y) * 190 * step;
          vx *= Math.exp(-23 * step);
          vy *= Math.exp(-23 * step);
          x += vx * step;
          y += vy * step;
          hover += (target.hover - hover) * (1 - Math.exp(-12 * step));

          if (target.click !== clickVersion) {
            clickVersion = target.click;
            ripple = 0;
          } else {
            ripple += dt;
          }

          if (card) {
            const ease = dt ? 1 - Math.exp(-dt * 12) : 1;
            rx += (target.tiltX - rx) * ease;
            ry += (target.tiltY - ry) * ease;
            card.style.transform = `perspective(1100px) rotateX(${dt ? rx : 0}deg) rotateY(${dt ? ry : 0}deg)`;
          }

          const uniforms: Record<string, number | readonly number[]> = {
            uResolution: [card.clientWidth, card.clientHeight],
            uSize: [card.clientWidth - 12, card.clientHeight - 12],
            uTime: time,
            uHueOffset: 0.0,
            uCursor: [x, y],
            uVelocity: [vx, vy],
            uHover: hover,
            uClick: [target.clickX, target.clickY],
            uRippleAge: ripple,
            uIsDark: opt.isDark ? 1.0 : 0.0,
            uRefraction: 56,
            uThickness: 32,
            uBevelWidth: 16,
            uFrost: 28,
            uDispersion: 96,
            uLightSheen: 16,
            uLightAngle: 24,
            uDarkness: opt.isDark ? 12 : 0,
            uEdgeRim: 16,
            uBrightness:
              44 *
              (Number.isFinite(opt.opticalIntensity)
                ? Math.max(0.2, Math.min(2.5, opt.opticalIntensity))
                : 1),
            uWaveSpeed: 80,
            uWaveScale: 88,
            uAuraWidth: 12,
            uCenterClarity: 98,
            uBorderBeam: 96,
            uHoverGlow: 180,
            uCursorFlow: 100,
            uClickRipple: 110,
          };

          renderer!.draw(pass, null, uniforms);
          card.dataset.gl = "on";
        },
        () => renderOptions.current.paused,
        undefined,
        compact,
      );
    } catch (e) {
      card.dataset.gl = "off";
      card.dataset.ready = "true";
      clock?.dispose();
      renderer?.dispose();
    }

    wake.current = () => clock?.invalidate();
    const lost = (event: Event) => {
      event.preventDefault();
      clock?.dispose();
      card.dataset.gl = "off";
    };
    const restored = () => setGeneration((value) => value + 1);
    canvas.addEventListener("webglcontextlost", lost);
    canvas.addEventListener("webglcontextrestored", restored);
    return () => {
      clock?.dispose();
      renderer?.dispose();
      wake.current = () => {};
      canvas.removeEventListener("webglcontextlost", lost);
      canvas.removeEventListener("webglcontextrestored", restored);
    };
  }, [compact, generation]);
  useEffect(() => wake.current(), [paused, isDark, opticalIntensity]);

  return (
    <div
      ref={wrapperRef}
      className={`optical-artifact-wrapper ${className}`}
      data-theme={theme}
      data-compact={compact || undefined}
      data-paused={paused || undefined}
      style={{ "--opt-accent": currentAccent } as CSSProperties}
    >
      <style>{scopedCardStyles}</style>

      {/* Main Physical Card Container with WebGL2 Optical Background & Borders */}
      <div ref={fitRef} className="opt-card-fit">
        <div
          ref={hitRef}
          className="opt-card-hit"
          onPointerMove={handlePointerMove}
          onPointerLeave={handlePointerLeave}
        >
          <div
            ref={cardRef}
            className={`optical-card ${isDark ? "opt-card-dark" : "opt-card-light"}`}
            aria-label="Optical Artifact Card"
          >
            {/* WebGL2 Optical Glass & Border Canvas (Background & Bevel) */}
            <canvas
              ref={opticalCanvasRef}
              className="opt-canvas"
              aria-hidden="true"
            />

            {/* 1. Cabecera de Procedencia Dual (Top Provenance Bar) */}
            <header className="opt-provenance">
              {/* Left: Owner */}
              <div className="opt-user-cell opt-user-owner">
                <div className="opt-avatar-ring opt-avatar-ring-mint">
                  <div className="opt-avatar-inner">
                    <img
                      src="/media/gallery/image-01.webp"
                      alt="Owner"
                      className="opt-avatar-img"
                    />
                  </div>
                  <span className="opt-badge opt-badge-cyan">✓</span>
                </div>
                <div className="opt-user-meta">
                  <span className="opt-user-label">Owned by</span>
                  <span className="opt-user-id">{ownerId}</span>
                </div>
              </div>

              {/* Central Divider */}
              <div className="opt-divider" />

              {/* Right: Creator */}
              <div className="opt-user-cell opt-user-creator">
                <div className="opt-user-meta opt-user-meta-right">
                  <span className="opt-user-label">Created by</span>
                  <span className="opt-user-id">{creatorId}</span>
                </div>
                <div className="opt-avatar-ring opt-avatar-ring-purple">
                  <div className="opt-avatar-inner">
                    <img
                      src="/media/gallery/image-02.webp"
                      alt="Creator"
                      className="opt-avatar-img"
                    />
                  </div>
                  <span className="opt-badge opt-badge-emerald">✓</span>
                </div>
              </div>
            </header>

            {/* 2. Escenario Central de la Obra con Parallax + Subsurface Color Bleed */}
            <div className="opt-art-container">
              {/* Subsurface Organic Color Bleed into price area */}
              <div
                className="opt-subsurface"
                style={{ backgroundColor: currentAccent }}
              />

              {/* Artwork Render Container */}
              <div className="opt-art-inner">
                <img
                  src={failedArtwork === safeArtwork ? defaultArtwork : safeArtwork}
                  onError={() => setFailedArtwork(safeArtwork)}
                  referrerPolicy="no-referrer"
                  className="opt-artwork"
                  alt="Classical bust in amethyst stone with violet and mauve inlays"
                />

                {/* Specular museum glass sheen */}
                <div className="opt-sheen" />

                {/* Glass History Drawer Overlay */}
                {historyOpen && (
                  <div
                    className="opt-drawer"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="opt-drawer-head">
                      <span className="opt-drawer-title">
                        Price Trend (Demo)
                      </span>
                      <span className="opt-drawer-trend">+18.4%</span>
                    </div>

                    <div className="opt-drawer-chart">
                      <svg viewBox="0 0 300 70">
                        <defs>
                          <linearGradient
                            id={chartId}
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="0%"
                              stopColor="#00F0A8"
                              stopOpacity="0.4"
                            />
                            <stop
                              offset="100%"
                              stopColor="#00F0A8"
                              stopOpacity="0"
                            />
                          </linearGradient>
                        </defs>
                        <path
                          d="M0 50 Q40 45 80 55 T160 30 T240 25 T300 12 L300 70 L0 70 Z"
                          fill={`url(#${chartId})`}
                        />
                        <path
                          d="M0 50 Q40 45 80 55 T160 30 T240 25 T300 12"
                          fill="none"
                          stroke="#00F0A8"
                          strokeWidth="2.5"
                        />
                        <circle cx="300" cy="12" r="4" fill="#FFFFFF" />
                      </svg>
                    </div>

                    <div className="opt-drawer-rows">
                      <div className="opt-drawer-row">
                        <span>0.4h ago</span>
                        <span>5.65 ETH</span>
                        <span className="opt-drawer-hash">0x82...3f</span>
                      </div>
                      <div className="opt-drawer-row">
                        <span>1.2h ago</span>
                        <span>5.40 ETH</span>
                        <span className="opt-drawer-hash">0xa1...bc</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 3. Franja de Precio y Equivalencia */}
            <div className="opt-price-bar">
              <div className="opt-price-left">
                <span className="opt-price-tag">Price:</span>
                <span className="opt-price-val">ETH {priceEth}</span>
                <button
                  type="button"
                  onClick={cycleMultiplier}
                  className={`opt-mult-btn ${isDark ? "opt-mult-btn-dark" : "opt-mult-btn-light"}`}
                  title="Change multiplier"
                >
                  - X{multiplier}
                </button>
              </div>

              <div className="opt-equals">
                <span className="opt-equals-bar" />
                <span className="opt-equals-bar" />
              </div>

              <div className="opt-price-usd">(${scrambleUsd})</div>
            </div>

            {/* 4. Dock Inferior de Acciones con Optical CTA Button */}
            <div
              className={`opt-dock ${isDark ? "opt-dock-dark" : "opt-dock-light"}`}
            >
              <button
                type="button"
                onClick={() => setHistoryOpen(!historyOpen)}
                className="optical-history-btn opt-history-btn"
                aria-expanded={historyOpen}
              >
                <span className="opt-history-arrows">↑↓</span>
                <span>{historyOpen ? "Close history" : "View history"}</span>
              </button>

              <button
                type="button"
                onClick={handleBuyNow}
                disabled={buyState !== "idle"}
                className="optical-buy-btn opt-buy-btn"
              >
                <span className="opt-buy-rim" />
                {buyState === "processing" && <span className="opt-laser" />}

                <span className="opt-buy-label">
                  {buyState === "idle" && "Buy Now"}
                  {buyState === "processing" && "Processing..."}
                  {buyState === "collected" && "Collected ✓"}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const scopedCardStyles = `
.optical-artifact-wrapper{--opt-bg:#0c0c0c;--opt-text:#f3f3f3;--opt-muted:#999;--opt-dock:#191919;--opt-buy-bg:#f5f5f5;--opt-buy-text:#111;--opt-buy-hover:#ddd;--opt-line:#ffffff16;box-sizing:border-box;position:relative;display:flex;align-items:center;justify-content:center;width:100%;height:100%;min-height:260px;overflow:hidden;font-family:'Urbanist Variable',Urbanist,Arial,sans-serif;color:var(--opt-text)}
.optical-artifact-wrapper[data-theme=light]{--opt-bg:#f8f8f8;--opt-text:#171717;--opt-muted:#777;--opt-dock:#eee;--opt-buy-bg:#151515;--opt-buy-text:#fff;--opt-buy-hover:#333;--opt-line:#14171b13}
.optical-artifact-wrapper *{box-sizing:border-box}.opt-card-fit{width:350px;flex:none;transform-origin:center}.opt-card-hit{width:350px;perspective:1100px}.optical-card{position:relative;isolation:isolate;width:100%;padding:18px;border-radius:32px;color:var(--opt-text);transform-style:preserve-3d;box-shadow:0 20px 45px #00000014}
.optical-card:before{content:'';position:absolute;inset:6px;border:0;border-radius:26px;background:var(--opt-bg);z-index:-1}.opt-canvas{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:0}.optical-card>*:not(canvas){position:relative;z-index:1}
.opt-provenance{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:4px 3px 12px}.opt-user-cell{display:flex;align-items:center;gap:8px}.opt-user-meta{display:flex;flex-direction:column;gap:2px}.opt-user-id{font-size:12px;font-weight:600;letter-spacing:.015em}.opt-user-label{font-size:9px;color:var(--opt-muted)}.opt-user-meta-right{text-align:right}.opt-avatar-ring{width:32px;height:32px;border-radius:50%;overflow:hidden}.opt-avatar-inner{width:100%;height:100%}.opt-avatar-img{width:100%;height:100%;border-radius:50%;object-fit:cover;border:2px solid color-mix(in srgb,var(--opt-accent) 35%,transparent)}.opt-user-creator .opt-avatar-img{border-color:#d08b3c88}.opt-divider{width:1px;height:24px;background:var(--opt-line)}.opt-badge{display:none}
.opt-art-container{aspect-ratio:1.21;border-radius:15px;overflow:hidden;background:#7a3fbd;box-shadow:0 10px 24px color-mix(in srgb,var(--opt-accent) 10%,transparent)}.opt-art-inner{position:relative;width:100%;height:100%;overflow:hidden;border-radius:inherit}.opt-artwork{width:100%;height:100%;object-fit:cover;object-position:50% 30%;display:block}.opt-subsurface{display:none}.opt-sheen{position:absolute;inset:0;background:linear-gradient(125deg,#fff0 38%,#ffffff0b 52%,#fff0 65%);pointer-events:none}
.opt-price-bar{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:17px 1px 13px;font-size:11px;white-space:nowrap}.opt-price-left{display:flex;align-items:center;gap:4px}.opt-price-tag{font-weight:650}.optical-card button{font-family:inherit;cursor:pointer;color:inherit}.opt-price-bar button{border:0;padding:0;background:none;font-size:11px}.opt-equals{display:flex;flex-direction:column;gap:3px}.opt-equals-bar{height:1px;width:14px;background:var(--opt-muted)}
.opt-dock{display:flex;align-items:center;gap:8px;padding:7px;border:0;border-radius:17px;background:var(--opt-dock)}.opt-history-btn{display:flex;align-items:center;justify-content:center;gap:9px;flex:1;border:0;background:none;font-size:11px;font-weight:550;padding:9px 0;white-space:nowrap}.opt-history-arrows{font-size:17px}.opt-buy-btn{position:relative;border:0;min-height:39px;min-width:137px;border-radius:11px;background:var(--opt-buy-bg);color:var(--opt-buy-text)!important;font-size:11px;font-weight:600;box-shadow:0 4px 10px #0002;transition:background .2s,transform .2s}.opt-buy-btn:hover{background:var(--opt-buy-hover)}.opt-buy-btn:active{transform:scale(.97)}.opt-buy-rim,.opt-laser{display:none}.optical-card button:focus-visible{outline:2px solid #64e7bf;outline-offset:4px}
.opt-drawer{position:absolute;inset:auto 0 0;background:#101010eb;backdrop-filter:blur(16px);border-top:1px solid #ffffff26;padding:17px;color:#f5f6fa;animation:opt-reveal .3s ease both}.opt-drawer-head,.opt-drawer-row{display:flex;justify-content:space-between;gap:12px;font-size:10px}.opt-drawer-title{font-weight:600}.opt-drawer-trend{color:#7ae2bf}.opt-drawer-chart svg{display:block;width:100%;margin:14px 0}.opt-drawer-rows{display:flex;flex-direction:column;gap:7px}.opt-drawer-hash{color:#999}
@keyframes opt-reveal{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}.optical-artifact-wrapper[data-paused] *{animation:none!important;transition:none!important}@media(prefers-reduced-motion:reduce){.optical-card{transform:none!important}.optical-artifact-wrapper *{animation:none!important;transition:none!important}}
`;
