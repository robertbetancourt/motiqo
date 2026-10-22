"use client";
import { useState } from "react";
const sample = Array.from(
  { length: 28 },
  (_, i) => 28 + ((i * 19 + i * i * 3) % 57),
);
export type SignalGridProps = {
  values?: number[];
  accent?: string;
  paused?: boolean;
  compact?: boolean;
  className?: string;
};
export default function SignalGrid({
  values = sample,
  accent = "#eeeeef",
  paused = false,
  compact = false,
  className = "",
}: SignalGridProps) {
  const [windowSize, setWindowSize] = useState(28);
  const [selected, setSelected] = useState(-1),
    [pinned, setPinned] = useState(false),
    [replay, setReplay] = useState(0);
  const data = (values.length ? values : sample)
      .slice(0, 60)
      .slice(-windowSize)
      .map((v) => (Number.isFinite(v) ? Math.max(0, Math.min(100, v)) : 0)),
    active =
      selected < 0 ? data.length - 1 : Math.min(selected, data.length - 1);
  const inspect = (index: number) => {
    if (!pinned) setSelected(index);
  };
  return (
    <div
      className={`signal-grid ${className}`}
      data-paused={paused || undefined}
      data-compact={compact || undefined}
      style={{ "--sg-accent": accent } as React.CSSProperties}
    >
      <style>{`.signal-grid{width:100%;height:100%;min-height:300px;display:grid;place-items:center;background:#050505;color:#ededf0;font:12px Urbanist,system-ui,sans-serif;container-type:inline-size}.sg-card{width:88%;max-width:780px;padding:30px 28px;background:#0d0d0f;border:1px solid #ffffff0c;border-radius:18px;box-sizing:border-box}.sg-head{display:flex;justify-content:space-between;align-items:center;gap:10px}.sg-head strong{white-space:nowrap;font-size:14px;font-weight:500}.sg-range{display:flex;gap:3px;padding:3px;border-radius:99px;background:#ffffff06}.sg-range button{font:inherit;font-size:9px;color:#929299;border:0;border-radius:99px;padding:7px 9px;background:none;cursor:pointer;min-height:36px;min-width:44px}.sg-range button[aria-pressed=true]{background:#ffffff12;color:#ededf0}.sg-range button:focus-visible{outline:2px solid #ddd;outline-offset:2px}.sg-head span{font-size:10px;color:#8f8f96}.sg-plot{position:relative;margin:28px 0 22px;outline:none}.sg-plot:focus-visible{outline:2px solid var(--sg-accent);outline-offset:8px}.sg-plot svg{width:100%;height:150px;display:block;overflow:visible}.sg-cell{transform-box:fill-box;transform-origin:center;animation:sg-reveal 900ms cubic-bezier(.2,.7,.15,1) both;transition:opacity 250ms,fill 250ms,translate 350ms cubic-bezier(.2,1.4,.4,1)}.sg-tooltip{position:absolute;top:-38px;width:160px;max-width:100%;box-sizing:border-box;backdrop-filter:blur(18px);background:#1b1b1e;border:1px solid #ffffff18;border-radius:9px;padding:10px 13px;pointer-events:none;box-shadow:0 8px 25px #0003;animation:sg-tip 180ms ease-out}.sg-tooltip span{display:block;color:#9e9ea5;font-size:9px}.sg-tooltip small{font-size:12px;margin-left:3px;color:#a1a1a8}.sg-tooltip .sg-comparison{margin-top:8px;font-size:9px;white-space:nowrap}.sg-tooltip b{display:block;font-size:21px;font-weight:500;margin-top:5px;color:var(--sg-accent)}.sg-axis{display:flex;justify-content:space-between;color:#77777f;font-size:9px;margin-top:10px}.sg-summary{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px;border-top:1px solid #ffffff0b;padding-top:19px}.sg-summary b{display:block;font-size:21px;font-weight:400;letter-spacing:-.04em}.sg-summary span{display:block;color:#929299;font-size:9px;margin-top:7px}.sg-controls{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-top:18px;color:#939399;font-size:9px}.sg-controls button{font:inherit;color:#e3e3e8;background:none;border:0;cursor:pointer;min-height:32px;padding:0 8px;border-radius:5px}.sg-controls button:focus-visible{outline:2px solid var(--sg-accent)}@keyframes sg-reveal{from{opacity:0;transform:translateY(10px) scale(.5)}to{opacity:1;transform:translateY(0) scale(1)}}@keyframes sg-tip{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}.signal-grid[data-paused] .sg-cell{animation:none}.signal-grid[data-compact] .sg-card{padding:16px 18px}.signal-grid[data-compact] .sg-plot{margin:14px 0}.signal-grid[data-compact] .sg-plot svg{height:90px}.signal-grid[data-compact] .sg-summary{padding-top:12px}.signal-grid[data-compact] .sg-summary b{font-size:18px}.signal-grid[data-compact] .sg-controls{margin-top:8px}.signal-grid[data-compact] .sg-head span{display:none}@container(max-width:450px){.sg-card{padding:22px 18px;width:94%}.sg-head span{display:none}.sg-summary b{font-size:18px}.sg-summary span{font-size:8px}.sg-controls>span{max-width:140px;line-height:1.5}}@media(prefers-reduced-motion:reduce){.sg-cell{animation:none;transition:none}.sg-tooltip{animation:none}}`}</style>
      <section className="sg-card" aria-label="Signal activity">
        <header className="sg-head">
          <strong>Signal activity</strong>
          <div className="sg-range" role="group" aria-label="Observation range">
            {[14, 28].map((size) => (
              <button
                type="button"
                key={size}
                aria-label={`${size} samples`} aria-pressed={windowSize === size}
                onClick={() => {
                  setWindowSize(size);
                  setPinned(false);
                  setSelected(-1);
                  setReplay((v) => v + 1);
                }}
              >
                {size}<span> samples</span>
              </button>
            ))}
          </div>
        </header>
        <div
          className="sg-plot"
          tabIndex={0}
          role="group"
          aria-label="Inspect signal observations with arrow keys. Enter pins a signal; Space replays."
          onPointerDown={(e) => {
            const r = e.currentTarget.getBoundingClientRect();
            inspect(
              Math.max(
                0,
                Math.min(
                  data.length - 1,
                  Math.floor(((e.clientX - r.left) / r.width) * data.length),
                ),
              ),
            );
          }}
          onPointerMove={(e) => {
            const r = e.currentTarget.getBoundingClientRect();
            inspect(
              Math.max(
                0,
                Math.min(
                  data.length - 1,
                  Math.floor(((e.clientX - r.left) / r.width) * data.length),
                ),
              ),
            );
          }}
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
              setReplay((v) => v + 1);
            } else if (e.key === "Escape") {
              setPinned(false);
              setSelected(-1);
            }
          }}
        >
          <svg
            key={replay}
            viewBox={`0 0 ${data.length * 20} 132`}
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            {data.flatMap((value, i) =>
              Array.from({ length: 10 }, (_, row) => {
                const lit = row >= 10 - Math.round(value / 10),
                  focus = selected === i;
                return (
                  <rect
                    className="sg-cell"
                    key={`${i}-${row}`}
                    x={i * 20 + 2}
                    y={row * 13}
                    width="10"
                    height="9"
                    rx="1"
                    fill={
                      lit
                        ? i > data.length - 3
                          ? "#ffffff"
                          : accent
                        : "#232326"
                    }
                    style={{
                      animationDelay: `${i * 14 + (9 - row) * 12}ms`,
                      opacity: selected >= 0 && !focus ? 0.38 : 1,
                      translate: focus ? "0 -5px" : "0 0",
                    }}
                  />
                );
              }),
            )}
          </svg>
          {selected >= 0 && (
            <div
              className="sg-tooltip"
              style={{
                left: `clamp(0px, calc(${(active / (data.length - 1 || 1)) * 100}% - 80px), calc(100% - 160px))`,
              }}
            >
              <span>
                Observation {active + 1}
                {pinned ? " · pinned" : ""}
              </span>
              <b>
                {data[active]}
                <small>%</small>
              </b>
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
            <b>{Math.round(data.reduce((a, b) => a + b, 0) / data.length)}%</b>
            <span>Mean intensity</span>
          </div>
          <div>
            <b>{Math.max(...data)}%</b>
            <span>Peak signal</span>
          </div>
          <div>
            <b>{data.filter((v) => v >= 70).length}</b>
            <span>Strong observations</span>
          </div>
        </div>
        <div className="sg-controls">
          <span>
            {pinned
              ? "Signal pinned · Escape to release"
              : "Move across the field to inspect"}
          </span>
          <button
            onClick={() => {
              setReplay((v) => v + 1);
              setPinned(false);
              setSelected(-1);
            }}
          >
            Replay ↗
          </button>
        </div>
        <span
          role="status"
          style={{
            position: "absolute",
            width: 1,
            height: 1,
            overflow: "hidden",
            clipPath: "inset(50%)",
          }}
        >
          {selected >= 0
            ? `Observation ${active + 1}: ${data[active]} percent${pinned ? ", pinned" : ""}`
            : ""}
        </span>
      </section>
    </div>
  );
}
