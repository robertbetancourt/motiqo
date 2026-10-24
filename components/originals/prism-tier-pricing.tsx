"use client";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { effectRuntime } from "./effect-runtime";

export type PrismTierPricingProps = {
  defaultAnnual?: boolean;
  accentColor?: string;
  onSelectTier?: (tier: string) => void;
  paused?: boolean;
  compact?: boolean;
  className?: string;
};
export function AnimatedPrice({ value }: { value: number }) {
  return (
    <span className="pt-price" aria-label={`$${value}`}>
      <span aria-hidden="true">$</span>
      <span className="pt-digits" aria-hidden="true">
        {String(Math.max(0, Math.round(value)))
          .split("")
          .map((digit, i) => (
            <span className="pt-digit" key={i}>
              <span
                style={{
                  transform: `translateY(-${Number(digit) * 10}%)`,
                  transitionDelay: `${i * 35}ms`,
                }}
              >
                {Array.from({ length: 10 }, (_, n) => (
                  <span key={n}>{n}</span>
                ))}
              </span>
            </span>
          ))}
      </span>
    </span>
  );
}
const features = [
  ["Three original components", "Personal projects", "Community updates"],
  [
    "Every Motiqo component",
    "Unlimited Commercial Projects",
    "WebGL2 Source Code",
    "Custom GLSL Uniforms",
  ],
  [
    "Everything in Pro Studio",
    "Shared team workspace",
    "Priority implementation support",
    "Organization licensing",
  ],
];
export default function PrismTierPricing({
  defaultAnnual = true,
  accentColor = "#38bdf8",
  onSelectTier,
  paused = false,
  compact = false,
  className = "",
}: PrismTierPricingProps) {
  const [annual, setAnnual] = useState(defaultAnnual),
    [seats, setSeats] = useState(5),
    [selected, setSelected] = useState("");
  const root = useRef<HTMLDivElement>(null),
    field = useRef<HTMLDivElement>(null),
    canvas = useRef<HTMLCanvasElement>(null),
    sync = useRef<(() => void) | null>(null),
    opts = useRef({ paused, hover: false, accentColor });
  opts.current.paused = paused;
  opts.current.accentColor = accentColor;
  useEffect(() => setAnnual(defaultAnnual), [defaultAnnual]);
  useEffect(() => {
    const node = field.current!,
      surface = canvas.current!,
      ctx = surface.getContext("2d");
    if (!ctx) {
      root.current!.dataset.ready = "true";
      return;
    }
    let w = 1,
      h = 1,
      boost = 1;
    const runtime = effectRuntime(
      node,
      surface,
      (time, dt) => {
        boost += ((opts.current.hover ? 2 : 1) - boost) * Math.min(1, dt * 4);
        ctx.clearRect(0, 0, w, h);
        ctx.globalCompositeOperation = "lighter";
        for (let band = 0; band < 22; band++) {
          ctx.beginPath();
          for (let x = 0; x <= w; x += 5) {
            const u = x / w,
              y =
                h * 0.48 +
                Math.sin(u * 4.2 + time * (0.5 + boost * 0.12) + band * 0.075) *
                  h *
                  0.23 +
                Math.sin(u * 9 - time * 0.3 + band * 0.1) * h * 0.11 +
                band * 1.3;
            if (x === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.strokeStyle =
            band % 3 === 0 ? "#a78bfaaa" : opts.current.accentColor + "65";
          ctx.lineWidth = 0.7;
          ctx.stroke();
        }
        ctx.globalCompositeOperation = "source-over";
      },
      () => opts.current.paused,
      (width, height, dpr) => {
        w = width;
        h = height;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      },
      compact,
    );
    sync.current = runtime.invalidate;
    return () => {
      sync.current = null;
      runtime.dispose();
    };
  }, [compact]);
  useEffect(() => sync.current?.(), [paused, accentColor]);
  function spotlight(e: React.PointerEvent<HTMLDivElement>) {
    const cards = [
        ...e.currentTarget.querySelectorAll<HTMLElement>(".pt-card"),
      ],
      positions = cards.map((card) => card.getBoundingClientRect());
    cards.forEach((card, i) => {
      card.style.setProperty("--pt-x", `${e.clientX - positions[i].left}px`);
      card.style.setProperty("--pt-y", `${e.clientY - positions[i].top}px`);
    });
  }
  function choose(tier: string) {
    setSelected(tier);
    onSelectTier?.(tier);
  }
  const prices = [0, annual ? 24 : 29, (annual ? 79 : 99) * seats];
  return (
    <section
      ref={root}
      className={`prism-tier ${className}`}
      data-compact={compact || undefined}
      style={{ "--pt-accent": accentColor } as CSSProperties}
      aria-label="Subscription plans"
    >
      <style>{styles}</style>
      <header className="pt-header">
        <div className="pt-billing" role="group" aria-label="Billing cycle">
          <button
            type="button"
            aria-pressed={!annual}
            onClick={() => setAnnual(false)}
          >
            Monthly
          </button>
          <button
            type="button"
            aria-pressed={annual}
            onClick={() => setAnnual(true)}
          >
            Annual <small>UP TO 20% OFF</small>
          </button>
        </div>
      </header>
      <div
        className="pt-grid"
        onPointerMove={spotlight}
        onPointerLeave={(e) => {
          e.currentTarget
            .querySelectorAll<HTMLElement>(".pt-card")
            .forEach((el) => {
              el.style.setProperty("--pt-x", "-500px");
              el.style.setProperty("--pt-y", "-500px");
            });
        }}
      >
        {["Starter", "Pro Studio", "Enterprise"].map((name, i) => (
          <article
            key={name}
            className={`pt-card ${i === 1 ? "pt-featured" : ""}`}
            onPointerEnter={() => {
              if (i === 1) opts.current.hover = true;
            }}
            onPointerLeave={() => {
              if (i === 1) opts.current.hover = false;
            }}
          >
            {i === 1 && (
              <>
                <div ref={field} className="pt-field">
                  <canvas ref={canvas} aria-hidden="true" />
                </div>
                <span className="pt-popular">MOST POPULAR</span>
              </>
            )}
            <div className="pt-card-content">
              <span className="pt-plan-index">
                0{i + 1} / {i === 0 ? "EXPLORE" : i === 1 ? "CREATE" : "SCALE"}
              </span>
              <h3>{name}</h3>
              <p>
                {
                  [
                    "A first step into motion.",
                    "A complete creative toolkit.",
                    "Built for teams that go further.",
                  ][i]
                }
              </p>
              <div className="pt-cost">
                <AnimatedPrice value={prices[i]} />
                <span>/ mo</span>
              </div>
              <div className="pt-billing-detail">
                {i === 0
                  ? "Free, for personal exploration."
                  : i === 1
                    ? annual
                      ? "$288 billed annually."
                      : "Billed monthly."
                    : `${seats} seats · $${annual ? 79 : 99} / seat / mo`}
              </div>
              {i === 2 && (
                <label className="pt-seats">
                  <span>
                    Team seats <output>{seats}</output>
                  </span>
                  <input
                    aria-label="Team seats"
                    type="range"
                    min="5"
                    max="50"
                    step="1"
                    value={seats}
                    onChange={(e) => setSeats(Number(e.target.value))}
                  />
                </label>
              )}
              <button
                type="button"
                className="pt-cta"
                onClick={() => choose(["starter", "pro", "enterprise"][i])}
              >
                {
                  ["Start exploring", "Start Pro Studio", "Choose Enterprise"][
                    i
                  ]
                }{" "}
                <span aria-hidden="true">↗</span>
              </button>
              <ul>
                {features[i].map((feature) => (
                  <li key={feature}>
                    <svg viewBox="0 0 20 20" aria-hidden="true">
                      <path
                        d="m5 10 3 3 7-7"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                      />
                    </svg>
                    {feature.includes("GL") ||
                    feature.includes("Commercial") ? (
                      <abbr
                        tabIndex={0}
                        title={
                          feature.includes("GL")
                            ? "Editable graphics source and shader parameters."
                            : "Use the included code in unlimited commercial projects under its license."
                        }
                      >
                        {feature}
                      </abbr>
                    ) : (
                      feature
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </article>
        ))}
      </div>
      <p className="pt-selection" role="status">
        {selected
          ? `${selected === "pro" ? "Pro Studio" : selected === "starter" ? "Starter" : "Enterprise"} selected. ${onSelectTier ? "Continue with your checkout." : "Demo selection — connect onSelectTier to your checkout."}`
          : "Transparent pricing. Full source. Yours to shape."}
      </p>
    </section>
  );
}
const styles = `.prism-tier{box-sizing:border-box;width:100%;min-height:100%;padding:30px;background:#040508;color:#edf2f8;font-family:'Urbanist Variable',Urbanist,Arial,sans-serif;container-type:inline-size}.prism-tier *{box-sizing:border-box}.pt-header{text-align:center}.pt-header>span{font:9px ui-monospace,monospace;letter-spacing:.2em;color:#9aa8bb}.pt-header h2{font-size:clamp(28px,4.2cqw,50px);font-weight:550;letter-spacing:-.04em;margin:16px 0 12px}.pt-header p{color:#a0abba;font-size:14px}.pt-billing{display:inline-flex;gap:4px;border:1px solid #ffffff16;padding:4px;border-radius:99px;background:#10131a;margin:0}.pt-billing button{min-height:38px;padding:0 17px;background:none;color:#a6b2c0;border:0;border-radius:99px;font:inherit;font-size:12px;cursor:pointer;transition:background .3s,color .3s}.pt-billing button[aria-pressed=true]{background:#2a303c;color:#fff;box-shadow:inset 0 1px #ffffff20}.pt-billing small{font-size:8px;color:#a9ebcc;margin-left:8px}.pt-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:18px;max-width:1180px;margin:35px auto 0;align-items:stretch}.pt-card{--pt-x:-500px;--pt-y:-500px;position:relative;isolation:isolate;overflow:hidden;border:1px solid #ffffff19;border-radius:20px;background:radial-gradient(420px circle at var(--pt-x) var(--pt-y),color-mix(in srgb,var(--pt-accent) 10%,transparent),transparent 65%),#0a0c10;box-shadow:inset 0 1px #ffffff07}.pt-card::before{content:'';position:absolute;inset:0;border:1px solid transparent;border-radius:inherit;background:radial-gradient(250px circle at var(--pt-x) var(--pt-y),var(--pt-accent),transparent 65%) border-box;mask:linear-gradient(#000 0 0) padding-box,linear-gradient(#000 0 0);mask-composite:exclude;pointer-events:none;opacity:.65}.pt-featured{transform:translateY(-12px);border-color:color-mix(in srgb,var(--pt-accent) 45%,#7c3aed);box-shadow:0 0 35px #2255aa13,inset 0 1px #ffffff19}.pt-card-content{position:relative;z-index:1;padding:30px 27px}.pt-plan-index{font:8px ui-monospace,monospace;color:#95a5bb;letter-spacing:.12em}.pt-card h3{font-size:23px;font-weight:500;letter-spacing:-.03em;margin:18px 0 8px}.pt-card p{font-size:12px;color:#a0aab9;line-height:1.6;margin:0}.pt-cost{display:flex;gap:8px;align-items:baseline;margin:30px 0 8px;min-height:53px}.pt-cost>span:last-child{font-size:12px;color:#8f9aaa}.pt-price{display:inline-flex;font-size:45px;letter-spacing:-.05em;font-weight:500;line-height:1;font-variant-numeric:tabular-nums}.pt-price>span:first-child{font-size:22px;align-self:start;margin:4px 4px 0 0}.pt-digits{display:flex}.pt-digit{display:block;height:1em;overflow:hidden;width:.61em}.pt-digit>span{display:flex;flex-direction:column;transition:transform .65s cubic-bezier(.22,1,.36,1)}.pt-digit>span>span{height:1em;line-height:1;flex-shrink:0}.pt-billing-detail{min-height:35px;color:#99a6b5;font-size:10px;line-height:1.5}.pt-seats{display:block;margin:4px 0 13px;color:#b8c5d4;font-size:11px}.pt-seats>span{display:flex;justify-content:space-between}.pt-seats input{display:block;accent-color:var(--pt-accent);width:100%;height:20px;margin:7px 0 0;cursor:pointer}.pt-cta{width:100%;min-height:44px;border:1px solid #ffffff20;border-radius:9px;background:#171c24;color:#e6edf5;padding:10px 13px;display:flex;align-items:center;justify-content:space-between;font:inherit;font-size:12px;cursor:pointer;position:relative;overflow:hidden}.pt-featured .pt-cta{color:#07101c;background:#e5f5ff;border-color:#fff;box-shadow:0 0 18px #38bdf81a}.pt-cta::after{content:'';position:absolute;inset:-50% auto -50% -40%;width:20%;background:#fff7;transform:rotate(25deg);transition:left .6s}.pt-cta:hover::after{left:125%}.pt-card ul{padding:23px 0 0;margin:24px 0 0;border-top:1px solid #ffffff12;list-style:none}.pt-card li{display:flex;align-items:center;gap:9px;color:#b8c4d2;font-size:11px;line-height:1.7;margin-bottom:12px}.pt-card li svg{width:16px;height:16px;flex-shrink:0;color:var(--pt-accent)}.pt-card abbr{text-decoration:underline dotted #718096;text-underline-offset:4px;cursor:help}.pt-field{position:absolute;top:0;left:0;right:0;height:160px;opacity:.45;mask-image:linear-gradient(#000,transparent)}.pt-field canvas{display:block;width:100%;height:100%}.pt-popular{position:absolute;right:15px;top:16px;z-index:2;font:7px ui-monospace,monospace;letter-spacing:.1em;color:#d6efff;border:1px solid #9ac8f93a;border-radius:99px;padding:6px 9px;background:#10233a99}.pt-selection{text-align:center;font-size:11px;color:#9aa9ba;line-height:1.6;margin:24px auto 0;min-height:20px}.prism-tier button:focus-visible,.prism-tier input:focus-visible,.prism-tier abbr:focus-visible{outline:2px solid var(--pt-accent);outline-offset:4px}.prism-tier[data-compact]{padding:25px 14px}.prism-tier[data-compact] .pt-header h2{font-size:22px}.prism-tier[data-compact] .pt-header p,.prism-tier[data-compact] .pt-header>span,.prism-tier[data-compact] .pt-card ul,.prism-tier[data-compact] .pt-plan-index,.prism-tier[data-compact] .pt-selection,.prism-tier[data-compact] .pt-billing-detail{display:none}.prism-tier[data-compact] .pt-grid{gap:8px;margin-top:25px}.prism-tier[data-compact] .pt-card-content{padding:18px 12px}.prism-tier[data-compact] .pt-card h3{font-size:14px;margin-top:10px}.prism-tier[data-compact] .pt-card p{font-size:9px}.prism-tier[data-compact] .pt-cost{margin-top:18px;min-height:30px}.prism-tier[data-compact] .pt-price{font-size:25px}.prism-tier[data-compact] .pt-price>span:first-child{font-size:14px}.prism-tier[data-compact] .pt-cta{font-size:9px;padding:7px;min-height:34px}.prism-tier[data-compact] .pt-seats{font-size:9px}.prism-tier[data-compact] .pt-popular{font-size:5px;right:8px;top:6px;padding:3px}.prism-tier[data-compact] .pt-billing{margin-top:7px}@container(max-width:700px){.prism-tier:not([data-compact]) .pt-grid{grid-template-columns:1fr;gap:22px;max-width:400px}.pt-featured{transform:none}.pt-header h2{font-size:32px}.pt-card-content{padding:28px}.pt-card h3{font-size:24px}}@container(max-width:330px){.prism-tier[data-compact] .pt-card-content{padding:16px 7px}.prism-tier[data-compact] .pt-card p{display:none}.prism-tier[data-compact] .pt-cost>span:last-child{font-size:9px}.prism-tier[data-compact] .pt-price{font-size:21px}}@media(prefers-reduced-motion:reduce){.prism-tier *{animation:none!important;transition:none!important}}`;
