"use client";
import {
  useEffect,
  useId,
  useState,
  type CSSProperties,
  type PointerEvent,
} from "react";
export type HorizonGridPricingProps = {
  defaultTierIndex?: 0 | 1 | 2;
  accentColor?: string;
  onSelectPlan?: (plan: "starter" | "expert", capacity: number) => void;
  paused?: boolean;
  className?: string;
};
const capacities = [50000, 100000, 250000],
  prices = [
    [89, 129, 189],
    [149, 219, 329],
  ];
function bounded(value: number) {
  return Number.isFinite(value)
    ? Math.max(0, Math.min(2, Math.round(value)))
    : 0;
}
export default function HorizonGridPricing({
  defaultTierIndex = 0,
  accentColor = "#6366F1",
  onSelectPlan,
  paused = false,
  className = "",
}: HorizonGridPricingProps) {
  const [tier, setTier] = useState(bounded(defaultTierIndex)),
    [active, setActive] = useState(0),
    [hovered, setHovered] = useState<number | null>(null),
    [expanded, setExpanded] = useState([false, false]),
    [message, setMessage] = useState(""),
    id = useId();
  useEffect(() => setTier(bounded(defaultTierIndex)), [defaultTierIndex]);
  const accent = /^#[\da-f]{6}$/i.test(accentColor) ? accentColor : "#6366F1";
  function select(index: number) {
    setActive(index);
    setMessage(
      `${index ? "Expert" : "Starter"} selected · ${capacities[tier].toLocaleString("en-US")} compute units${onSelectPlan ? "" : ". Demo selection."}`,
    );
    onSelectPlan?.(index ? "expert" : "starter", capacities[tier]);
  }
  function tilt(event: PointerEvent<HTMLElement>) {
    if (paused || matchMedia("(prefers-reduced-motion: reduce)").matches)
      return;
    const r = event.currentTarget.getBoundingClientRect(),
      x = (event.clientX - r.left) / r.width,
      y = (event.clientY - r.top) / r.height;
    event.currentTarget.style.setProperty("--hg-rx", `${(y - 0.5) * -5}deg`);
    event.currentTarget.style.setProperty("--hg-ry", `${(x - 0.5) * 5}deg`);
    event.currentTarget.style.setProperty("--hg-x", `${x * 100}%`);
    event.currentTarget.style.setProperty("--hg-y", `${y * 100}%`);
  }
  return (
    <section
      className={`horizon-pricing ${className}`}
      data-paused={paused || undefined}
      aria-label="Horizon pricing"
      style={
        {
          "--hg-accent": accent,
          "--hg-position": `${25 + (hovered ?? active) * 50}%`,
        } as CSSProperties
      }
    >
      <style>{styles}</style>
      <div className="hg-stars" aria-hidden="true" />
      <header>
        <span>INFRASTRUCTURE, IN BALANCE</span>
        <h2>
          Scale precision
          <br />
          at your own pace.
        </h2>
        <p>A clear path from your first signal to your next horizon.</p>
        <div className="hg-capacity" role="group" aria-label="Compute capacity">
          {capacities.map((value, index) => (
            <button
              key={value}
              onClick={() => setTier(index)}
              aria-pressed={tier === index}
            >
              {value / 1000}K <span>compute units</span>
            </button>
          ))}
        </div>
      </header>
      <div className="hg-floor" aria-hidden="true">
        <div />
        <i />
      </div>
      <div className="hg-plans">
        {["Starter", "Expert"].map((name, index) => {
          const throughput = [3000, 7500][index] * [1, 2, 5][tier],
            nodes = [3, 12][index] * [1, 2, 4][tier];
          return (
            <article
              key={name}
              data-active={active === index}
              onPointerEnter={() => setHovered(index)}
              onPointerMove={tilt}
              onPointerLeave={(event) => {
                setHovered(null);
                event.currentTarget.style.setProperty("--hg-rx", "0deg");
                event.currentTarget.style.setProperty("--hg-ry", "0deg");
              }}
              onFocusCapture={() => setHovered(index)}
              onBlurCapture={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget))
                  setHovered(null);
              }}
            >
              <h3>{name}</h3>
              <div
                className="hg-price"
                aria-label={`$${prices[index][tier]} per month`}
              >
                <span aria-hidden="true">$</span>
                <span className="hg-odometer" aria-hidden="true">
                  {String(prices[index][tier])
                    .padStart(3, " ")
                    .split("")
                    .map((digit, column) => (
                      <span key={column} data-blank={digit === " "}>
                        <i
                          style={{
                            transform: `translateY(-${Number(digit) * 10}%)`,
                          }}
                        >
                          {Array.from({ length: 10 }, (_, n) => (
                            <b key={n}>{n}</b>
                          ))}
                        </i>
                      </span>
                    ))}
                </span>
                <small aria-hidden="true">/ month</small>
              </div>
              <p>Simple and powerful.</p>
              <button
                className="hg-choose"
                aria-pressed={active === index}
                onClick={() => select(index)}
              >
                Choose {name} Plan <span aria-hidden="true">→</span>
              </button>
              <div className="hg-specs">
                <span>Included telemetry</span>
                <dl>
                  {[
                    [
                      "Throughput target",
                      `${throughput.toLocaleString("en-US")} req/s`,
                    ],
                    ["SLA uptime", index ? "99.99%" : "99.90%"],
                    [
                      "Daily bandwidth",
                      index
                        ? "Unlimited"
                        : `${(1000 * [1, 2, 5][tier]).toLocaleString("en-US")} GB`,
                    ],
                    ["Max latency", index ? "0.40 ms" : "2.00 ms"],
                    ["Concurrent nodes", nodes],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <dt>{label}</dt>
                      <dd>{value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
              <div
                id={`${id}-${index}`}
                className="hg-extra"
                hidden={!expanded[index]}
              >
                <dl>
                  {[
                    ["WebGL2 shaders", "Included"],
                    ["Custom uniforms", index ? "Unlimited" : "12 slots"],
                    ["Dedicated support", index ? "Priority" : "Community"],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <dt>{label}</dt>
                      <dd>{value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
              <button
                className="hg-more"
                aria-expanded={expanded[index]}
                aria-controls={`${id}-${index}`}
                onClick={() =>
                  setExpanded((old) =>
                    old.map((value, i) => (i === index ? !value : value)),
                  )
                }
              >
                {expanded[index] ? "View less" : "View more"}{" "}
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 16 16"
                  fill="none"
                  aria-hidden="true"
                  style={{
                    transform: expanded[index] ? "rotate(180deg)" : undefined,
                  }}
                >
                  <path
                    d="m4 6 4 4 4-4"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  />
                </svg>
              </button>
              <i className="hg-base" aria-hidden="true" />
            </article>
          );
        })}
      </div>
      <p className="hg-selection" role="status">
        {message}
      </p>
      <p className="hg-note">
        Illustrative plans · Specifications describe plan targets.
      </p>
    </section>
  );
}
const styles = `.horizon-pricing{box-sizing:border-box;isolation:isolate;position:relative;overflow:hidden;width:100%;min-height:860px;padding:64px 28px 36px;background:#020308;color:#f1f1fc;font-family:'Urbanist Variable',Urbanist,Arial,sans-serif;container-type:inline-size}.horizon-pricing *{box-sizing:border-box}.horizon-pricing button{font:inherit;cursor:pointer;color:inherit}.horizon-pricing header{position:relative;z-index:2;text-align:center}.horizon-pricing header>span{font-size:9px;letter-spacing:.18em;color:#9292b6}.horizon-pricing h2{font-size:48px;line-height:1.04;font-weight:450;letter-spacing:-.045em;margin:18px 0;background:linear-gradient(#fff,#a4a5be);background-clip:text;color:transparent}.horizon-pricing header p{font-size:12px;color:#9695af}.hg-capacity{display:inline-flex;gap:3px;padding:4px;border:1px solid #ffffff16;border-radius:99px;margin:25px 0 32px;background:#090a17}.hg-capacity button{background:transparent;border:1px solid transparent;padding:9px 14px;border-radius:99px;font-size:10px;color:#9e9bbb}.hg-capacity button[aria-pressed=true]{background:linear-gradient(#303051,#18192e);color:#f1edff;border-color:#8781ff40;box-shadow:inset 0 1px #ffffff25,0 0 18px #6366f120}.hg-plans{position:relative;z-index:2;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:20px;max-width:760px;margin:0 auto;perspective:1000px}.hg-plans article{--hg-rx:0deg;--hg-ry:0deg;position:relative;border:1px solid #ffffff15;border-radius:22px;padding:28px;background:radial-gradient(300px circle at var(--hg-x,-100px) var(--hg-y,-100px),#8581ff18,transparent 70%),linear-gradient(#0b0f22d9,#070a16f2 55%,#050710f5);box-shadow:inset 0 1px #ffffff06;backdrop-filter:blur(20px);transform:rotateX(var(--hg-rx)) rotateY(var(--hg-ry));transition:transform .25s,border-color .3s,box-shadow .3s}.hg-plans article[data-active=true]{border-color:color-mix(in srgb,var(--hg-accent) 55%,transparent);box-shadow:0 0 0 5px #6366f108,0 20px 65px #1413672a,inset 0 1px #ffffff10}.hg-plans h3{color:#bbb8ee;font-size:13px;font-weight:500;margin:0 0 25px}.hg-price{display:flex;align-items:baseline;font-size:46px;line-height:1;font-weight:500;letter-spacing:-.04em}.hg-price small{font-size:11px;color:#9190a8;margin-left:8px;letter-spacing:0}.hg-odometer{display:inline-flex;height:1em;overflow:hidden}.hg-odometer>span{display:block;width:.58em;height:1em;overflow:hidden}.hg-odometer>span[data-blank=true]{width:0}.hg-odometer i{display:flex;flex-direction:column;font-style:normal;transition:transform .6s cubic-bezier(.22,1,.36,1)}.hg-odometer b{font:inherit;height:1em;line-height:1}.hg-plans article>p{font-size:12px;color:#a09fb6;margin:14px 0 25px}.hg-choose{display:flex;width:100%;align-items:center;justify-content:center;gap:20px;min-height:44px;border:1px solid #ffffff18;border-radius:10px;background:#0b0f24;font-size:11px!important}.hg-plans article[data-active=true] .hg-choose{background:linear-gradient(color-mix(in srgb,var(--hg-accent) 90%,white),color-mix(in srgb,var(--hg-accent) 80%,#111139));box-shadow:inset 0 1px #ffffff55,0 6px 30px color-mix(in srgb,var(--hg-accent) 35%,transparent)}.hg-specs{margin-top:27px;padding-top:20px;border-top:1px solid #ffffff10}.hg-specs>span{font-size:10px;color:#b5b3cd}.horizon-pricing dl{margin:17px 0 0;font-size:11px}.horizon-pricing dl>div{display:flex;justify-content:space-between;gap:15px;margin:15px 0}.horizon-pricing dt{color:#9896b1}.horizon-pricing dd{margin:0;color:#e3e0f2;font-variant-numeric:tabular-nums;text-align:right}.hg-more{display:flex;gap:8px;align-items:center;justify-content:center;margin:20px auto 0;background:transparent;border:0;padding:8px;font-size:10px!important}.hg-more svg{transition:transform .25s}.hg-extra{border-top:1px solid #ffffff10}.hg-base{position:absolute;bottom:-1px;left:32px;right:32px;height:2px;background:linear-gradient(90deg,transparent,var(--hg-accent),transparent);box-shadow:0 0 20px var(--hg-accent);opacity:0;transition:opacity .3s}.hg-plans article[data-active=true] .hg-base{opacity:1}.hg-floor{position:absolute;z-index:0;bottom:15px;left:50%;transform:translateX(-50%);width:min(1050px,120%);height:280px;perspective:800px;pointer-events:none}.hg-floor>div{position:absolute;inset:0;background-image:linear-gradient(#6366f130 1px,transparent 1px),linear-gradient(90deg,#6366f130 1px,transparent 1px);background-size:64px 52px;transform:rotateX(68deg) scale(1.15);mask-image:radial-gradient(ellipse,#000 20%,transparent 70%)}.hg-floor>i{position:absolute;left:var(--hg-position);top:15px;transform:translateX(-50%);height:180px;width:340px;filter:blur(55px);background:var(--hg-accent);opacity:.23;transition:left .6s}.hg-stars{position:absolute;inset:0;z-index:0;opacity:.18;background-image:radial-gradient(circle,#a8a2ff 1px,transparent 1px);background-size:113px 79px;mask-image:radial-gradient(ellipse,#000,transparent 75%)}.hg-selection{position:relative;z-index:2;min-height:16px;text-align:center;font-size:11px;color:#bab5e1;margin:23px 0 0}.hg-note{position:relative;text-align:center;font-size:9px;color:#83809c;margin-top:10px}.horizon-pricing button:focus-visible{outline:2px solid #c7c4ff;outline-offset:4px}.horizon-pricing button:hover{filter:brightness(1.17)}.horizon-pricing[data-paused] *{transition:none!important}@container(max-width:560px){.hg-plans{grid-template-columns:1fr;max-width:370px}.horizon-pricing h2{font-size:38px}.hg-capacity button{padding:8px 12px}.hg-capacity button span{display:none}}@media(prefers-reduced-motion:reduce){.horizon-pricing *{transition:none!important}.hg-plans article{transform:none!important}}`;
