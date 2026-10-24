"use client";
import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
export type InkHeadlineProps = {
  defaultText?: string;
  by?: "word" | "char";
  ease?: "linear" | "easeOut" | "spring";
  bleed?: number;
  feather?: number;
  stagger?: number;
  duration?: number;
  noiseScale?: number;
  trigger?: "inView" | "click" | "manual";
  progress?: number;
  showControls?: boolean;
  defaultTheme?: "dark" | "light";
  paused?: boolean;
  compact?: boolean;
  className?: string;
};
const bound = (n: number, min: number, max: number, fallback: number) =>
  Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : fallback;
export default function InkHeadline({
  defaultText = "Written in ink, word by word.",
  by = "word",
  ease = "easeOut",
  bleed = 0.6,
  feather = 0.12,
  stagger = 240,
  duration = 1800,
  noiseScale = 2.2,
  trigger = "inView",
  progress,
  showControls = false,
  defaultTheme = "dark",
  paused = false,
  compact = false,
  className = "",
}: InkHeadlineProps) {
  const [text, setText] = useState(defaultText),
    [unit, setUnit] = useState(by),
    [curve, setCurve] = useState(ease),
    [theme, setTheme] = useState(defaultTheme),
    [controls, setControls] = useState(showControls),
    [mode, setMode] = useState(trigger),
    [scrub, setScrub] = useState<number | undefined>(progress),
    [values, setValues] = useState({
      bleed,
      feather,
      stagger,
      duration,
      noiseScale,
    });
  useEffect(() => setText(defaultText), [defaultText]);
  useEffect(() => setUnit(by), [by]);
  useEffect(() => setCurve(ease), [ease]);
  useEffect(() => setTheme(defaultTheme), [defaultTheme]);
  useEffect(() => setControls(showControls), [showControls]);
  useEffect(() => setMode(trigger), [trigger]);
  useEffect(() => setScrub(progress), [progress]);
  useEffect(
    () => setValues({ bleed, feather, stagger, duration, noiseScale }),
    [bleed, feather, stagger, duration, noiseScale],
  );
  const root = useRef<HTMLElement>(null),
    replayRef = useRef<() => void>(() => {}),
    rewet = useRef(new Map<number, number>()),
    wake = useRef<() => void>(() => {}),
    uid = useId().replace(/:/g, ""),
    parts = useMemo(
      () =>
        unit === "char" ? Array.from(text) : text.match(/\S+|\s+/gu) || [],
      [unit, text],
    );
  const safe = {
    bleed: bound(values.bleed, 0, 1.5, 0.6),
    feather: bound(values.feather, 0.01, 0.5, 0.12),
    stagger: bound(values.stagger, 0, 600, 240),
    duration: bound(values.duration, 400, 4000, 1800),
    noiseScale: bound(values.noiseScale, 0.5, 5, 2.2),
  };
  const options = useRef({ paused, scrub, mode, curve, ...safe });
  options.current = { paused, scrub, mode, curve, ...safe };
  useEffect(() => {
    const host = root.current!,
      units = [...host.querySelectorAll<HTMLElement>("[data-ink-unit]")],
      motion = matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0,
      last = 0,
      elapsed = 0,
      visible = true,
      gone = false,
      started = options.current.mode !== "click";
    const total = () =>
      options.current.duration +
      Math.max(0, units.length - 1) * options.current.stagger;
    function draw(now: number) {
      frame = 0;
      if (gone || !visible || document.hidden) return;
      const o = options.current,
        dt = last ? Math.min(80, now - last) : 0;
      last = now;
      if (
        started &&
        !o.paused &&
        !motion.matches &&
        o.scrub === undefined &&
        o.mode !== "manual"
      )
        elapsed += dt;
      const raw = motion.matches
        ? 1
        : o.scrub !== undefined
          ? bound(o.scrub, 0, 1, 1)
          : o.mode === "manual"
            ? 0.5
            : Math.min(1, elapsed / total());
      let wet = false;
      units.forEach((node, index) => {
        let p = bound(
          (raw * total() - index * o.stagger) / o.duration,
          0,
          1,
          0,
        );
        if (o.curve === "easeOut") p = 1 - Math.pow(1 - p, 3);
        else if (o.curve === "spring")
          p = Math.min(1, 1 - Math.exp(-7 * p) * Math.cos(p * 8));
        const stamp = rewet.current.get(index),
          age = stamp === undefined ? Infinity : now - stamp;
        if (p >= 0.99 && age < 850 && !motion.matches) {
          p = 0.93 + 0.07 * Math.min(1, age / 850);
          wet = true;
        } else if (age >= 850) rewet.current.delete(index);
        const filter = host.querySelector<SVGFilterElement>(
            `#${uid}-ink-${index}`,
          ),
          wetness = 1 - p,
          halo = node.querySelector<HTMLElement>("[data-ink-halo]");
        node.dataset.dry = String(p >= 0.99);
        node.style.opacity = p <= 0 ? "0" : "1";
        node.style.filter = p >= 0.99 ? "none" : `url(#${uid}-ink-${index})`;
        filter
          ?.querySelector("feDisplacementMap")
          ?.setAttribute("scale", String(o.bleed * wetness * 32));
        filter
          ?.querySelector("feTurbulence")
          ?.setAttribute("baseFrequency", String(0.018 * o.noiseScale));
        const alpha = filter?.querySelector("feFuncA");
        alpha?.setAttribute("slope", String(1 / o.feather));
        alpha?.setAttribute("intercept", String((p * 1.5 - 0.8) / o.feather));
        if (halo) halo.style.opacity = String(Math.sin(p * Math.PI) * 0.85);
        node.style.setProperty("--ink-local", String(p));
      });
      host.dataset.ready = "true";
      host.dataset.progress = String(raw);
      if (
        ((started && raw < 1 && o.scrub === undefined && o.mode !== "manual") ||
          wet) &&
        !o.paused &&
        !motion.matches
      )
        frame = requestAnimationFrame(draw);
    }
    function invalidate() {
      last = 0;
      if (!gone && !frame && visible && !document.hidden)
        frame = requestAnimationFrame(draw);
    }
    const replay = () => {
      elapsed = 0;
      started = true;
      rewet.current.clear();
      invalidate();
    };
    replayRef.current = replay;
    wake.current = invalidate;
    const io = new IntersectionObserver((entries) => {
      visible = entries[0].isIntersecting;
      if (visible) invalidate();
      else {
        cancelAnimationFrame(frame);
        frame = 0;
        last = 0;
      }
    });
    io.observe(host);
    const visibility = () => {
      if (document.hidden) {
        cancelAnimationFrame(frame);
        frame = 0;
        last = 0;
      } else invalidate();
    };
    document.addEventListener("visibilitychange", visibility);
    motion.addEventListener("change", invalidate);
    invalidate();
    return () => {
      gone = true;
      cancelAnimationFrame(frame);
      io.disconnect();
      document.removeEventListener("visibilitychange", visibility);
      motion.removeEventListener("change", invalidate);
      replayRef.current = () => {};
      wake.current = () => {};
    };
  }, [parts, uid]);
  useEffect(() => wake.current(), [paused, scrub, mode, curve, values]);
  function replay() {
    setScrub(undefined);
    setMode("inView");
    replayRef.current();
  }
  let inkIndex = -1;
  return (
    <section
      ref={root}
      className={`ink-headline ${className}`}
      data-theme={theme}
      data-compact={compact || undefined}
      data-controls={controls || undefined}
      aria-label="Ink Headline"
    >
      <style>{styles}</style>
      <svg width="0" height="0" aria-hidden="true" className="ih-defs">
        <defs>
          {parts
            .filter((part) => part.trim())
            .map((part, index) => (
              <filter
                key={index}
                id={`${uid}-ink-${index}`}
                x="-30%"
                y="-40%"
                width="160%"
                height="180%"
                colorInterpolationFilters="sRGB"
              >
                <feTurbulence
                  type="fractalNoise"
                  baseFrequency={0.018 * safe.noiseScale}
                  numOctaves="4"
                  seed={index * 17 + 5}
                  result="noise"
                />
                <feColorMatrix
                  in="noise"
                  type="matrix"
                  values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 .333 .333 .333 0 0"
                  result="alphaNoise"
                />
                <feComponentTransfer in="alphaNoise" result="soak">
                  <feFuncA type="linear" slope="8" intercept="-4" />
                </feComponentTransfer>
                <feDisplacementMap
                  in="SourceGraphic"
                  in2="noise"
                  scale="12"
                  xChannelSelector="R"
                  yChannelSelector="G"
                  result="ink"
                />
                <feComposite in="ink" in2="soak" operator="in" />
              </filter>
            ))}
        </defs>
      </svg>
      <div className="ih-page">
        <div
          className="ih-editorial"
          onClick={() => {
            if (mode === "click") replay();
          }}
        >
          <h2 aria-label={text}>
            {parts.map((part, index) => {
              if (!part.trim()) return part;
              const order = ++inkIndex;
              return (
                <span
                  className="ih-unit"
                  key={`${index}-${part}`}
                  aria-hidden="true"
                  data-ink-unit
                  onPointerEnter={() => {
                    if (
                      root.current
                        ?.querySelectorAll("[data-ink-unit]")
                        [order]?.getAttribute("data-dry") === "true"
                    ) {
                      rewet.current.set(order, performance.now());
                      wake.current();
                    }
                  }}
                >
                  {part}
                  <span className="ih-pooling" data-ink-halo aria-hidden="true">
                    {part}
                  </span>
                </span>
              );
            })}
          </h2>
          <button type="button" aria-label="Replay ink" className="ih-replay" onClick={event => { event.stopPropagation(); replay(); }}>
            INK IT AGAIN <span aria-hidden="true">↻</span>
          </button>
        </div>
      </div>
      {controls && (
        <aside aria-label="Ink controls">
          <header>
            Ink studio <span>LIVE</span>
          </header>
          <label>
            By{" "}
            <select
              value={unit}
              onChange={(e) => setUnit(e.target.value as typeof unit)}
            >
              <option value="word">word</option>
              <option value="char">char</option>
            </select>
          </label>
          <label>
            Ease{" "}
            <select
              value={curve}
              onChange={(e) => setCurve(e.target.value as typeof curve)}
            >
              {["linear", "easeOut", "spring"].map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </label>
          <label className="ih-text">
            Text
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value.slice(0, 240))}
            />
          </label>
          {(
            ["bleed", "feather", "stagger", "duration", "noiseScale"] as const
          ).map((key) => {
            const spec = {
              bleed: [0, 1.5, 0.01],
              feather: [0.01, 0.5, 0.01],
              stagger: [0, 600, 10],
              duration: [400, 4000, 50],
              noiseScale: [0.5, 5, 0.1],
            }[key];
            return (
              <label
                className="ih-scrub"
                key={key}
                style={
                  {
                    "--ih-fill": `${((safe[key] - spec[0]) / (spec[1] - spec[0])) * 100}%`,
                  } as CSSProperties
                }
              >
                <span>
                  {key === "noiseScale"
                    ? "Noise Scale"
                    : key[0].toUpperCase() + key.slice(1)}
                </span>
                <output>{safe[key]}</output>
                <input
                  aria-label={key}
                  type="range"
                  min={spec[0]}
                  max={spec[1]}
                  step={spec[2]}
                  value={safe[key]}
                  onChange={(e) =>
                    setValues((old) => ({
                      ...old,
                      [key]: Number(e.target.value),
                    }))
                  }
                />
              </label>
            );
          })}
          <label>
            Trigger
            <select
              value={mode}
              onChange={(e) => {
                setMode(e.target.value as typeof mode);
                setScrub(e.target.value === "manual" ? 0.5 : undefined);
              }}
            >
              {["inView", "click", "manual"].map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </label>
          <label className="ih-scrub">
            <span>Progress</span>
            <output>{(scrub ?? 0).toFixed(2)}</output>
            <input
              aria-label="Progress"
              type="range"
              min="0"
              max="1"
              step=".01"
              value={scrub ?? 0}
              onChange={(e) => {
                setMode("manual");
                setScrub(Number(e.target.value));
              }}
            />
          </label>
        </aside>
      )}
    </section>
  );
}
const styles = `.ink-headline{--ih-bg:#08080a;--ih-ink:#f4f4f0;--ih-line:#ffffff18;box-sizing:border-box;position:relative;display:flex;width:100%;min-height:360px;height:100%;background:var(--ih-bg);color:var(--ih-ink);font-family:'Urbanist Variable',Urbanist,Arial,sans-serif;container-type:inline-size;overflow:hidden}.ink-headline *{box-sizing:border-box}.ink-headline[data-theme=light]{--ih-bg:#f5f2eb;--ih-ink:#121214;--ih-line:#12121420}.ih-defs{position:absolute;pointer-events:none}.ih-page{position:relative;flex:1;min-width:0;padding:48px 36px;justify-content:center;align-items:center;text-align:center;display:flex;flex-direction:column}.ih-toolbar{position:absolute;top:22px;left:25px;display:flex;gap:3px;border:1px solid var(--ih-line);border-radius:9px;padding:3px;background:color-mix(in srgb,var(--ih-ink) 3%,transparent)}.ink-headline button,.ink-headline select,.ink-headline textarea{font:inherit;color:inherit}.ink-headline button{cursor:pointer}.ih-toolbar button{display:grid;place-items:center;width:32px;height:32px;background:none;border:0;border-radius:5px;font-size:20px}.ih-toolbar button:hover{background:var(--ih-line)}.ih-editorial{margin:auto;max-width:690px;width:100%}.ih-kicker{font:9px ui-monospace,monospace;letter-spacing:.18em;opacity:.55}.ih-editorial h2{font-family:Georgia,'Times New Roman',serif;font-size:clamp(45px,7cqw,78px);font-weight:400;line-height:1.08;letter-spacing:-.035em;max-width:630px;text-wrap:balance;margin:0 auto 32px;overflow-wrap:anywhere}.ih-unit{position:relative;display:inline-block;white-space:pre;isolation:isolate;will-change:filter}.ih-unit[data-dry=true]{will-change:auto}.ih-pooling{position:absolute;inset:0;color:transparent;-webkit-text-stroke:1.2px var(--ih-ink);pointer-events:none;user-select:none;opacity:0}.ih-editorial p{font-size:14px;line-height:1.8;opacity:.58;max-width:460px;margin:30px 0}.ih-replay{margin:0 auto;display:flex;gap:22px;border:1px solid var(--ih-line);border-radius:99px;background:none;padding:13px 22px;font:10px ui-monospace,monospace!important;letter-spacing:.13em}.ih-replay:hover{background:var(--ih-line)}.ih-page footer{font:8px ui-monospace,monospace;letter-spacing:.18em;opacity:.3;margin-top:45px}.ink-headline aside{width:290px;flex-shrink:0;border-left:1px solid var(--ih-line);padding:24px 20px;background:color-mix(in srgb,var(--ih-ink) 2%,var(--ih-bg))}.ink-headline aside header{display:flex;align-items:center;justify-content:space-between;font-size:13px;margin-bottom:24px}.ink-headline aside header span{font:8px ui-monospace,monospace;opacity:.4;letter-spacing:.1em}.ink-headline aside label{display:flex;align-items:center;justify-content:space-between;position:relative;font-size:11px;margin:10px 0;gap:14px}.ink-headline select{background:var(--ih-bg);border:1px solid var(--ih-line);padding:7px 9px;border-radius:6px;min-width:105px}.ih-text{flex-direction:column;align-items:start!important}.ink-headline textarea{width:100%;resize:vertical;background:transparent;border:1px solid var(--ih-line);padding:10px;border-radius:6px;min-height:68px}.ink-headline aside .ih-scrub{min-height:36px;border-radius:6px;border:1px solid var(--ih-line);padding:10px;background:linear-gradient(90deg,var(--ih-line) var(--ih-fill,50%),transparent var(--ih-fill,50%))}.ih-scrub input{position:absolute;inset:0;opacity:0;cursor:ew-resize;width:100%;margin:0}.ih-scrub:focus-within{outline:2px solid currentColor;outline-offset:2px}.ink-headline button:focus-visible,.ink-headline select:focus-visible,.ink-headline textarea:focus-visible{outline:2px solid currentColor;outline-offset:4px}.ink-headline[data-compact]{min-height:300px;height:100%}.ink-headline[data-compact] .ih-page{padding:38px 30px}.ink-headline[data-compact] aside{display:none}.ink-headline[data-compact] .ih-page{min-height:0;padding:26px}.ink-headline[data-compact] .ih-replay{padding:10px 15px;font-size:8px!important}.ink-headline[data-compact] .ih-kicker{font-size:6px}.ink-headline[data-compact] h2{font-size:clamp(28px,10cqw,42px);margin:0 auto 24px}.ink-headline[data-compact] p{font-size:10px;margin:16px 0}@container(max-width:700px){.ink-headline aside{width:230px;padding:20px 14px}.ih-page{padding:36px 28px}.ih-editorial h2{font-size:clamp(32px,9cqw,64px)}}@media(max-width:600px){.ink-headline{flex-direction:column}.ink-headline aside{width:100%;border-left:0;border-top:1px solid var(--ih-line)}.ih-page{min-height:0}}@media(prefers-reduced-motion:reduce){.ih-unit{filter:none!important;opacity:1!important}.ih-pooling{display:none}}`;
