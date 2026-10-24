"use client";
import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
const SAMPLE = Array.from(
  { length: 28 },
  (_, i) => 28 + ((i * 19 + i * i * 3) % 57),
);
function SignalMetric({ value, still }: { value: number; still: boolean }) {
  const node = useRef<HTMLSpanElement>(null),
    current = useRef(value);
  useEffect(() => {
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0,
      last = 0,
      velocity = 0;
    const finish = () => {
      cancelAnimationFrame(frame);
      current.current = value;
      if (node.current) node.current.textContent = String(value);
    };
    function tick(now: number) {
      const dt = Math.min((now - (last || now - 16.67)) / 1000, 0.033);
      last = now;
      velocity += (value - current.current) * 160 * dt;
      velocity *= Math.exp(-dt * 22);
      current.current += velocity * dt;
      if (node.current)
        node.current.textContent = String(Math.round(current.current));
      if (Math.abs(value - current.current) > 0.02 || Math.abs(velocity) > 0.02)
        frame = requestAnimationFrame(tick);
      else finish();
    }
    if (still || media.matches || document.hidden || current.current === value)
      finish();
    else {
      if (node.current)
        node.current.textContent = String(Math.round(current.current));
      frame = requestAnimationFrame(tick);
    }
    const changed = () => {
      if (media.matches || document.hidden) finish();
    };
    media.addEventListener("change", changed);
    document.addEventListener("visibilitychange", changed);
    return () => {
      cancelAnimationFrame(frame);
      media.removeEventListener("change", changed);
      document.removeEventListener("visibilitychange", changed);
    };
  }, [value, still]);
  return (
    <span
      aria-label={String(value)}
      style={{
        display: "inline",
        margin: 0,
        color: "inherit",
        fontSize: "inherit",
      }}
    >
      <span
        aria-hidden="true"
        ref={node}
        style={{
          display: "inline",
          margin: 0,
          color: "inherit",
          fontSize: "inherit",
        }}
      >
        {value}
      </span>
    </span>
  );
}
export type SignalGridProps = {
  values?: number[];
  defaultSamples?: 14 | 28;
  accentColor?: string;
  accent?: string;
  autoAnimate?: boolean;
  paused?: boolean;
  compact?: boolean;
  className?: string;
};
export default function SignalGrid({
  values = SAMPLE,
  defaultSamples = 28,
  accentColor = "#34d399",
  accent,
  autoAnimate = true,
  paused = false,
  compact = false,
  className = "",
}: SignalGridProps) {
  const [windowSize, setWindowSize] = useState<14 | 28>(
      defaultSamples === 14 ? 14 : 28,
    ),
    [selected, setSelected] = useState(-1),
    [pinned, setPinned] = useState(false),
    [replay, setReplay] = useState(0);
  const host = useRef<HTMLDivElement>(null),
    live = useRef<HTMLSpanElement>(null),
    invalidate = useRef<(() => void) | null>(null),
    opts = useRef({ paused, autoAnimate });
  opts.current = { paused, autoAnimate };
  const uid = useId().replace(/:/g, ""),
    color = accent ?? accentColor;
  const data = useMemo(
    () =>
      (values.length ? values : SAMPLE)
        .slice(-windowSize)
        .map((v) => (Number.isFinite(v) ? Math.max(0, Math.min(100, v)) : 0)),
    [values, windowSize],
  );
  const active =
      selected < 0 ? data.length - 1 : Math.min(selected, data.length - 1),
    mean = Math.round(data.reduce((a, b) => a + b, 0) / data.length),
    peak = Math.max(...data),
    strong = data.filter((v) => v >= 70).length;
  useEffect(() => {
    setWindowSize(defaultSamples === 14 ? 14 : 28);
    setSelected(-1);
    setPinned(false);
  }, [defaultSamples]);
  useEffect(() => {
    setSelected(-1);
    setPinned(false);
  }, [values]);
  useEffect(() => {
    const root = host.current!,
      media = matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0,
      visible = true,
      gone = false,
      last = 0,
      time = 0,
      report = 0;
    const columns = [...root.querySelectorAll<SVGGElement>("[data-sg-column]")];
    function draw(now: number) {
      frame = 0;
      if (gone || !visible || document.hidden) return;
      const still =
          media.matches || opts.current.paused || !opts.current.autoAnimate,
        elapsed = (now - (last || now)) / 1000,
        dt = Math.min(elapsed, 0.05);
      last = now;
      if (!still) time += dt;
      columns.forEach((el, i) =>
        el.style.setProperty(
          "--sg-breath",
          String(still ? 1 : 0.92 + Math.sin(time * 2 + i * 0.47) * 0.08),
        ),
      );
      if (live.current && now - report > 700) {
        live.current.textContent = still
          ? "STATIC SIGNAL"
          : elapsed > 0
            ? `${(1 / elapsed).toFixed(1)} Hz · LIVE`
            : "MEASURING";
        report = now;
      }
      root.dataset.ready = "true";
      if (!still) frame = requestAnimationFrame(draw);
    }
    function start() {
      if (!gone && !frame && visible && !document.hidden)
        frame = requestAnimationFrame(draw);
    }
    function stop() {
      cancelAnimationFrame(frame);
      frame = 0;
      last = 0;
    }
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (visible) start();
      else stop();
    });
    io.observe(root);
    const ro = new ResizeObserver(start);
    ro.observe(root);
    function visibility() {
      if (document.hidden) stop();
      else start();
    }
    document.addEventListener("visibilitychange", visibility);
    media.addEventListener("change", start);
    invalidate.current = start;
    start();
    return () => {
      gone = true;
      stop();
      io.disconnect();
      ro.disconnect();
      media.removeEventListener("change", start);
      document.removeEventListener("visibilitychange", visibility);
      invalidate.current = null;
    };
  }, [data]);
  useEffect(() => {
    invalidate.current?.();
  }, [paused, autoAnimate]);
  function inspect(i: number) {
    if (!pinned) setSelected(i);
  }
  function pointerIndex(e: React.PointerEvent<HTMLDivElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    return Math.max(
      0,
      Math.min(
        data.length - 1,
        Math.floor(((e.clientX - r.left) / Math.max(1, r.width)) * data.length),
      ),
    );
  }
  function restart() {
    setReplay((v) => v + 1);
    setPinned(false);
    setSelected(-1);
  }
  const history = Array.from({ length: 8 }, (_, i) =>
      Math.max(
        0,
        Math.min(
          100,
          data[active] + Math.sin((active + 1) * 1.7 + i * 1.3) * 8,
        ),
      ),
    ),
    spark = history.map((v, i) => `${i * 10},${34 - v * 0.3}`).join(" "),
    delta = active > 0 ? data[active] - data[active - 1] : 0;
  return (
    <div
      ref={host}
      className={`signal-grid ${className}`}
      data-paused={paused || !autoAnimate || undefined}
      data-compact={compact || undefined}
      style={{ "--sg-accent": color } as CSSProperties}
    >
      <style>{styles}</style>
      <section className="sg-card" aria-label="Signal activity">
        <header className="sg-head">
          <div>
            <div className="sg-kicker">
              <i /> TELEMETRY MATRIX / CH-01
            </div>
            <h2>Signal activity</h2>
          </div>
          <div className="sg-head-controls">
            <span ref={live} className="sg-live">
              LIVE SIGNAL
            </span>
            <div
              className="sg-range"
              role="group"
              aria-label="Observation range"
            >
              {([14, 28] as const).map((size) => (
                <button
                  type="button"
                  key={size}
                  aria-label={`${size} samples`}
                  aria-pressed={windowSize === size}
                  onClick={() => {
                    setWindowSize(size);
                    restart();
                  }}
                >
                  {windowSize === size && <i className="sg-pill" />}
                  <span>{size} samples</span>
                </button>
              ))}
            </div>
          </div>
        </header>
        <div
          className="sg-plot"
          tabIndex={0}
          role="group"
          aria-label="Inspect signal observations with arrow keys. Enter pins a signal; Space replays."
          onPointerDown={(e) => inspect(pointerIndex(e))}
          onPointerMove={(e) => inspect(pointerIndex(e))}
          onPointerLeave={() => {
            if (!pinned) setSelected(-1);
          }}
          onClick={() => {
            setSelected(active);
            setPinned(!pinned);
          }}
          onKeyDown={(e) => {
            if (["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) {
              e.preventDefault();
              setSelected(
                e.key === "Home"
                  ? 0
                  : e.key === "End"
                    ? data.length - 1
                    : Math.max(
                        0,
                        Math.min(
                          data.length - 1,
                          active + (e.key === "ArrowRight" ? 1 : -1),
                        ),
                      ),
              );
            } else if (e.key === "Enter") {
              e.preventDefault();
              setSelected(active);
              setPinned(!pinned);
            } else if (e.key === " ") {
              e.preventDefault();
              restart();
            } else if (e.key === "Escape") {
              setPinned(false);
              setSelected(-1);
            }
          }}
        >
          <svg
            key={replay}
            viewBox={`0 0 ${data.length * 22} 146`}
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <defs>
              <linearGradient id={`${uid}-lit`} x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="0"
                  stopColor="color-mix(in srgb,var(--sg-accent) 65%,white)"
                />
                <stop offset=".4" stopColor="var(--sg-accent)" />
                <stop
                  offset="1"
                  stopColor="color-mix(in srgb,var(--sg-accent) 72%,#003f31)"
                />
              </linearGradient>
            </defs>
            {data.map((value, i) => (
              <g key={i} data-sg-column>
                {selected === i && (
                  <line
                    x1={i * 22 + 9}
                    x2={i * 22 + 9}
                    y1="-5"
                    y2="136"
                    stroke="var(--sg-accent)"
                    strokeWidth="19"
                    opacity=".08"
                  />
                )}
                {Array.from({ length: 10 }, (_, row) => {
                  const lit = row >= 10 - Math.round(value / 10),
                    white =
                      lit && (i >= data.length - 2 || (value > 80 && row < 3)),
                    neighbor = Math.max(data[i - 1] || 0, data[i + 1] || 0);
                  return (
                    <rect
                      className={`sg-cell ${lit ? "sg-lit" : ""} ${white ? "sg-white" : ""}`}
                      key={row}
                      x={i * 22 + 2}
                      y={row * 13.2}
                      width="15"
                      height="10.5"
                      rx="2.6"
                      fill={
                        lit
                          ? white
                            ? "#f7fafc"
                            : `url(#${uid}-lit)`
                          : "#14171d"
                      }
                      stroke={
                        lit
                          ? "#ffffff29"
                          : neighbor > row * 10
                            ? "color-mix(in srgb,var(--sg-accent) 12%,#14171d)"
                            : "#ffffff07"
                      }
                      strokeWidth=".5"
                      style={{
                        animationDelay: `${i * 16 + (9 - row) * 10}ms`,
                        opacity: selected >= 0 && selected !== i ? 0.58 : 1,
                      }}
                    />
                  );
                })}
                <line
                  x1={i * 22 + 9}
                  x2={i * 22 + 9}
                  y1="138"
                  y2={selected === i ? 146 : 142}
                  stroke={selected === i ? "var(--sg-accent)" : "#ffffff20"}
                />
              </g>
            ))}
          </svg>
          {selected >= 0 && (
            <div
              className="sg-tooltip"
              style={{
                left: `clamp(0px,calc(${(active / (data.length - 1 || 1)) * 100}% - 107px),calc(100% - 215px))`,
              }}
            >
              <div className="sg-tip-head">
                <span>Observation {active + 1}</span>
                {pinned && <small>● PINNED</small>}
              </div>
              <div className="sg-tip-value">
                <b>
                  {data[active]}
                  <small>%</small>
                </b>
                <div>
                  <svg viewBox="0 0 70 36" aria-hidden="true">
                    <polyline
                      points={spark}
                      fill="none"
                      stroke="var(--sg-accent)"
                      strokeWidth="1.5"
                    />
                  </svg>
                  <span>
                    {delta >= 0 ? "+" : ""}
                    {delta.toFixed(1)} pts
                  </span>
                </div>
              </div>
              <span className="sg-comparison">
                {data[active] >= 70
                  ? "High intensity"
                  : data[active] >= 40
                    ? "Within range"
                    : "Low intensity"}{" "}
                · {pinned ? "Click to release" : "Click to pin"}
              </span>
            </div>
          )}
          <div className="sg-axis">
            <span>01</span>
            <span>Signal strength</span>
            <span>{String(data.length).padStart(2, "0")}</span>
          </div>
        </div>
        <div className="sg-summary">
          <div>
            <b>
              <SignalMetric value={mean} still={paused || !autoAnimate} />%
            </b>
            <span>Mean intensity</span>
            <div className="sg-meter">
              <i style={{ width: `${mean}%` }} />
            </div>
          </div>
          <div>
            <b>
              <SignalMetric value={peak} still={paused || !autoAnimate} />%
            </b>
            <span>Peak signal</span>
            <small>CH-{String(data.indexOf(peak) + 1).padStart(2, "0")}</small>
          </div>
          <div>
            <b>
              <SignalMetric value={strong} still={paused || !autoAnimate} />
            </b>
            <span>Strong observations</span>
            <div className="sg-dots" aria-hidden="true">
              {Array.from({ length: 8 }, (_, i) => (
                <i key={i} data-lit={i < strong || undefined} />
              ))}
            </div>
          </div>
        </div>
        <div className="sg-controls">
          <span>
            {pinned
              ? "Signal pinned · Escape to release"
              : "Move across the field to inspect · Click column to lock"}
          </span>
          <button type="button" onClick={restart}>
            Replay ↗
          </button>
        </div>
        <span className="sg-accessible" role="status">
          {selected >= 0
            ? `Observation ${active + 1}: ${data[active]} percent${pinned ? ", pinned" : ""}`
            : ""}
        </span>
      </section>
    </div>
  );
}
const styles = `.signal-grid{width:100%;height:100%;min-height:300px;display:grid;place-items:center;background:#000;color:#f4f5f8;font:12px 'Urbanist Variable',Urbanist,system-ui,sans-serif;container-type:inline-size}.signal-grid *{box-sizing:border-box}.sg-card{width:92%;max-width:960px;padding:34px 36px;border:1px solid #ffffff14;border-radius:24px;background:radial-gradient(circle at 20% 0%,color-mix(in srgb,var(--sg-accent) 6%,transparent),transparent 55%),linear-gradient(#ffffff02 1px,transparent 1px) 0 0/22px 22px,#090a0d;box-shadow:inset 0 1px #ffffff1e,0 30px 80px #000b}.sg-head{display:flex;align-items:center;justify-content:space-between;gap:16px}.sg-kicker{font:9px ui-monospace,monospace;letter-spacing:.15em;color:#9aa2b0;display:flex;gap:8px;align-items:center}.sg-kicker i{height:6px;width:6px;border-radius:50%;background:var(--sg-accent);box-shadow:0 0 10px var(--sg-accent)}.sg-head h2{font-size:24px;font-weight:500;letter-spacing:-.025em;margin:9px 0 0}.sg-head-controls{display:flex;align-items:center;gap:16px}.sg-live{font:10px ui-monospace,monospace;color:var(--sg-accent);white-space:nowrap}.sg-range{display:flex;gap:3px;padding:4px;border-radius:99px;border:1px solid #ffffff12;background:#111318;box-shadow:inset 0 2px 5px #0008}.sg-range button{position:relative;isolation:isolate;min-height:36px;padding:0 13px;border:0;border-radius:99px;background:none;color:#a8b0bc;font:inherit;font-size:11px;cursor:pointer;white-space:nowrap}.sg-range button[aria-pressed=true]{color:#fff}.sg-pill{position:absolute;inset:0;z-index:-1;border-radius:99px;background:linear-gradient(#454b59a0,#272c37c0);box-shadow:inset 0 1px #ffffff27,0 2px 8px #0006;animation:sg-pill-in .3s cubic-bezier(.2,1.4,.4,1)}.sg-range button:focus-visible,.sg-controls button:focus-visible{outline:2px solid var(--sg-accent);outline-offset:3px}.sg-plot{position:relative;margin:36px 0 24px;outline:none}.sg-plot:focus-visible{outline:2px solid var(--sg-accent);outline-offset:8px}.sg-plot>svg{width:100%;height:170px;display:block;overflow:visible}.sg-cell{transform-box:fill-box;transform-origin:center;animation:sg-reveal .8s cubic-bezier(.2,.7,.15,1) both;transition:opacity .2s,fill .2s;paint-order:stroke fill}.sg-lit{filter:drop-shadow(0 0 3px color-mix(in srgb,var(--sg-accent) 25%,transparent));opacity:var(--sg-breath,1)}.sg-white{filter:drop-shadow(0 0 4px #ffffff90)}.sg-tooltip{position:absolute;z-index:3;top:-50px;width:215px;max-width:100%;padding:16px;border:1px solid #ffffff20;border-radius:16px;background:#13161ced;backdrop-filter:blur(22px);box-shadow:0 20px 50px #0009,inset 0 1px #ffffff20;pointer-events:none;transition:left .28s cubic-bezier(.22,1,.36,1);animation:sg-tip .2s ease-out}.sg-tip-head{display:flex;justify-content:space-between;align-items:center;color:#b4bcc8;font-size:11px}.sg-tip-head small{font:7px ui-monospace,monospace;color:var(--sg-accent);letter-spacing:.08em}.sg-tip-value{display:flex;align-items:center;justify-content:space-between;margin:9px 0}.sg-tip-value b{font-size:34px;font-weight:550;color:var(--sg-accent);letter-spacing:-.04em;font-variant-numeric:tabular-nums}.sg-tip-value b small{font-size:17px;font-weight:400;letter-spacing:0;margin-left:2px}.sg-tip-value>div{width:70px;text-align:right}.sg-tip-value svg{display:block;width:70px;height:29px}.sg-tip-value>div>span{font:8px ui-monospace,monospace;color:#a7b4b9}.sg-comparison{font-size:10px;color:#a9b2bf}.sg-axis{display:flex;justify-content:space-between;font:9px ui-monospace,monospace;color:#9ba4b0;letter-spacing:.04em;margin-top:10px}.sg-summary{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:24px;border-top:1px solid #ffffff12;padding-top:24px}.sg-summary b{font-size:30px;line-height:1.2;font-weight:450;letter-spacing:-.04em;font-variant-numeric:tabular-nums;display:block}.sg-summary span{display:block;margin-top:8px;color:#a1aab8;font-size:11px}.sg-summary small{display:block;margin-top:12px;font:8px ui-monospace,monospace;color:#98a3b4}.sg-meter{width:44px;height:3px;margin-top:14px;background:#ffffff10;border-radius:4px;overflow:hidden}.sg-meter i{display:block;height:100%;background:var(--sg-accent);border-radius:inherit;transition:width .6s cubic-bezier(.22,1,.36,1)}.sg-dots{display:flex;gap:4px;margin-top:14px}.sg-dots i{width:4px;height:4px;border-radius:50%;background:#ffffff17}.sg-dots i[data-lit]{background:var(--sg-accent)}.sg-controls{display:flex;align-items:center;justify-content:space-between;gap:15px;margin-top:22px;color:#929caa;font-size:11px}.sg-controls button{min-height:36px;white-space:nowrap;padding:0 10px;font:inherit;background:none;color:#e4eaf0;border:0;border-radius:7px;cursor:pointer}.sg-controls button:hover{background:#ffffff08;color:var(--sg-accent)}.sg-accessible{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%)}@keyframes sg-reveal{from{opacity:0;transform:translateY(9px) scale(.6)}to{opacity:1;transform:translateY(0) scale(1)}}@keyframes sg-tip{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}@keyframes sg-pill-in{from{opacity:.5;transform:scale(.93)}to{opacity:1;transform:scale(1)}}.signal-grid[data-paused] .sg-cell{animation:none}.signal-grid[data-compact] .sg-card{padding:20px;border-radius:18px}.signal-grid[data-compact] .sg-kicker{font-size:6px}.signal-grid[data-compact] .sg-head h2{font-size:17px}.signal-grid[data-compact] .sg-live{display:none}.signal-grid[data-compact] .sg-range button{font-size:8px;padding:0 9px;min-height:30px}.signal-grid[data-compact] .sg-plot{margin:20px 0 14px}.signal-grid[data-compact] .sg-plot>svg{height:94px}.signal-grid[data-compact] .sg-summary{padding-top:14px;gap:12px}.signal-grid[data-compact] .sg-summary b{font-size:21px}.signal-grid[data-compact] .sg-summary span{font-size:9px}.signal-grid[data-compact] .sg-controls{font-size:8px;margin-top:12px}.signal-grid[data-compact] .sg-meter,.signal-grid[data-compact] .sg-dots,.signal-grid[data-compact] .sg-summary small{display:none}@container(max-width:650px){.sg-live{display:none}.sg-card{padding:25px 22px}.sg-head h2{font-size:21px}.sg-kicker{font-size:7px}.sg-range button{padding:0 10px;font-size:9px}.sg-controls{font-size:10px}.sg-controls>span{max-width:240px;line-height:1.6}}@container(max-width:360px){.sg-card{padding:22px 15px}.sg-head{align-items:start;gap:10px}.sg-head h2{font-size:19px}.sg-kicker{font-size:6px;letter-spacing:.06em}.sg-range button{font-size:8px;padding:0 8px;min-height:34px}.sg-summary{gap:12px}.sg-summary b{font-size:25px}.sg-summary span{font-size:10px}.sg-controls>span{max-width:180px}}@media(prefers-reduced-motion:reduce){.signal-grid *{animation:none!important;transition:none!important}}`;
