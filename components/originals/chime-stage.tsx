"use client";
import { useEffect, useRef, useState, type PointerEvent } from "react";
import { useKineticCanvas } from "./kinetic-canvas";
import { makeCurtain, placeCurtain, stepCurtain } from "./chime-physics";
import { sculpture } from "./chime-sculptures";
import { createChimeAudio } from "./chime-audio";
export type ChimeStageProps = {
  initialMonolith?: number;
  ensembleMode?: boolean;
  defaultEnsembleMode?: boolean;
  soundEnabled?: boolean;
  theme?: "paper" | "obsidian";
  paused?: boolean;
  compact?: boolean;
  className?: string;
  prism?: boolean;
};
const chapters = [
  [
    "SOLARIS ASTROLABE",
    "HOROLOGY",
    "Solaris — brass meridians, golden arcs, and pendulums that measure silence",
    "☉☽∆◊ΩΨΦ0149°′″+−≡",
  ],
  [
    "KINETIC CANTILEVER",
    "TECTONICS",
    "Bauhaus — vermilion cantilevers, steel beams, and gravity turned into rhythm",
    "AEKMOQ RSTVXZ0123/:▪▫",
  ],
  [
    "AETHER OCULUS",
    "ACOUSTICS",
    "Oculus — alabaster ribs, desert wind, and equations that sing when touched",
    "∑∏√∞∫≈≠≤≥⊕⊗⊙⊢⊣⊤⊥",
  ],
];
const prisms = [
  [
    "TESSERACT GATE",
    "TOPOLOGY",
    "A fold in the visible. Light finding a fourth dimension.",
    "Ψ∇∮ℵℋℏℓℜℂ",
  ],
  [
    "CYMATIC TORUS",
    "RESONANCE",
    "A circle is a sound that has learned to return.",
    "⊕⊗⊙∰ℳℱ𝒯ℰ𝒬𝒰",
  ],
  [
    "SINGULARITY SPIRE",
    "FIELD THEORY",
    "The weight of a photon. The shape of a pause.",
    "cℏGkeμεhπei",
  ],
];
export default function ChimeStage({
  initialMonolith = 0,
  ensembleMode,
  defaultEnsembleMode = false,
  soundEnabled = true,
  theme = "paper",
  paused = false,
  compact = false,
  className = "",
  prism = false,
}: ChimeStageProps) {
  const [chapter, setChapter] = useState(() =>
      Math.max(0, Math.min(2, Math.round(initialMonolith) || 0)),
    ),
    [trio, setTrio] = useState(ensembleMode ?? defaultEnsembleMode),
    [sound, setSound] = useState(soundEnabled),
    [armed, setArmed] = useState(false);
  const data = prism ? prisms : chapters,
    dark = prism || theme === "obsidian";
  const audio = useRef<ReturnType<typeof createChimeAudio> | null>(null),
    pointer = useRef({
      x: -1000,
      y: -1000,
      px: -1000,
      py: -1000,
      active: false,
    }),
    physics = useRef<ReturnType<typeof makeCurtain>[]>([]),
    layout = useRef({
      w: 0,
      h: 0,
      trio: false,
      chapter: 0,
      centres: [0, 0, 0],
      velocity: [0, 0, 0],
      accumulator: 0,
    }),
    cooldowns = useRef(new Map<number, number>()),
    clock = useRef(0),
    grain = useRef<HTMLCanvasElement | null>(null);
  if (!physics.current.length)
    physics.current = Array.from({ length: 3 }, () =>
      makeCurtain(prism ? 32 : 28, prism ? 28 : 26),
    );
  useEffect(
    () =>
      setChapter(Math.max(0, Math.min(2, Math.round(initialMonolith) || 0))),
    [initialMonolith],
  );
  useEffect(() => {
    setTrio(ensembleMode ?? defaultEnsembleMode);
  }, [ensembleMode, defaultEnsembleMode]);
  useEffect(() => setSound(soundEnabled), [soundEnabled]);
  useEffect(() => {
    let visible = true;
    const sync = () => {
      if (paused || document.hidden || !sound || !visible)
        void audio.current?.suspend();
      else if (armed) void audio.current?.resume();
    };
    const observer = new IntersectionObserver((entries) => {
      visible = entries[0].isIntersecting;
      if (!visible) pointer.current.active = false;
      sync();
    });
    if (host.current) observer.observe(host.current);
    sync();
    document.addEventListener("visibilitychange", sync);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", sync);
    };
  }, [paused, sound, armed]);
  useEffect(
    () => () => {
      audio.current?.dispose();
      audio.current = null;
    },
    [],
  );
  const { host, canvas, invalidate } = useKineticCanvas(
    ({ g, w, h, dt, still }) => {
      const state = layout.current,
        curtainWidth = trio
          ? Math.min(w * 0.25, h * 0.42)
          : Math.min(w * (w > 680 ? 0.43 : 0.67), h * 0.47),
        top = h * 0.35;
      if (state.w !== w || state.h !== h) {
        state.w = w;
        state.h = h;
        for (let i = 0; i < 3; i++) {
          const x = trio
            ? (w * (i + 0.5)) / 3
            : w * (w > 680 ? 0.65 : 0.5) + (i - chapter) * w;
          state.centres[i] = x;
          state.velocity[i] = 0;
          placeCurtain(physics.current[i], x, top, curtainWidth);
        }
      }
      const staticChange =
        still && (state.trio !== trio || state.chapter !== chapter);
      state.trio = trio;
      state.chapter = chapter;
      clock.current += dt;
      state.accumulator = Math.min(0.05, state.accumulator + dt);
      for (let i = 0; i < 3; i++) {
        const target = trio
          ? (w * (i + 0.5)) / 3
          : w * (w > 680 ? 0.65 : 0.5) + (i - chapter) * w;
        if (still) {
          state.velocity[i] = 0;
          if (staticChange) {
            state.centres[i] = target;
            placeCurtain(physics.current[i], target, top, curtainWidth);
          }
        } else {
          const steps = Math.max(1, Math.ceil(dt / 0.008)),
            s = dt / steps;
          for (let k = 0; k < steps; k++) {
            state.velocity[i] += (target - state.centres[i]) * 130 * s;
            state.velocity[i] *= Math.exp(-18 * s);
            state.centres[i] += state.velocity[i] * s;
          }
          const c = physics.current[i],
            next =
              c.spacing +
              (curtainWidth / (c.rows - 1) - c.spacing) *
                (1 - Math.exp(-dt * 5)),
            ratio = next / c.spacing;
          for (const n of c.nodes) {
            n.x = c.x + (n.x - c.x) * ratio;
            n.px = c.x + (n.px - c.x) * ratio;
            n.y = c.y + (n.y - c.y) * ratio;
            n.py = c.y + (n.py - c.y) * ratio;
          }
          c.spacing = next;
        }
      }
      while (state.accumulator >= 1 / 60 && !still) {
        for (let i = 0; i < 3; i++)
          if (Math.abs(state.centres[i] - w / 2) < w * 0.9)
            stepCurtain(
              physics.current[i],
              state.centres[i],
              top,
              pointer.current,
              clock.current,
              prism ? 5 : 4,
            );
        state.accumulator -= 1 / 60;
      }
      pointer.current.px = pointer.current.x;
      pointer.current.py = pointer.current.y;
      g.fillStyle = dark ? "#080a10" : "#eae5dc";
      g.fillRect(0, 0, w, h);
      if (!grain.current) {
        const c = document.createElement("canvas");
        c.width = c.height = 128;
        const ctx = c.getContext("2d");
        if (ctx) {
          let seed = 423;
          for (let i = 0; i < 900; i++) {
            seed = (seed * 1664525 + 1013904223) >>> 0;
            ctx.fillStyle = i % 2 ? "#ffffff16" : "#00000012";
            ctx.fillRect(seed % 128, (seed >>> 8) % 128, 1, 1);
          }
        }
        grain.current = c;
      }
      const pattern = g.createPattern(grain.current, "repeat");
      if (pattern) {
        g.fillStyle = pattern;
        g.fillRect(0, 0, w, h);
      }
      for (let i = 0; i < 3; i++) {
        const x = state.centres[i];
        if (x < -curtainWidth || x > w + curtainWidth) continue;
        const c = physics.current[i],
          glyphs = Array.from(data[i][3]);
        if (!dark) {
          g.fillStyle = "#23190f12";
          g.beginPath();
          g.moveTo(x - curtainWidth * 0.5, top);
          g.lineTo(x + curtainWidth * 0.5, top);
          g.lineTo(x + curtainWidth * 0.9, top + curtainWidth * 0.3);
          g.lineTo(x - curtainWidth * 0.1, top + curtainWidth * 0.3);
          g.fill();
        }
        sculpture(g, x, top, curtainWidth, i, prism, clock.current);
        g.font = `${Math.max(4, c.spacing * 0.68)}px Georgia,serif`;
        g.textAlign = "center";
        g.textBaseline = "middle";
        for (let col = 0; col < c.cols; col++)
          for (let row = 1; row < c.rows; row++) {
            const n = c.nodes[col * c.rows + row],
              prev = c.nodes[col * c.rows + row - 1],
              angle = Math.atan2(n.y - prev.y, n.x - prev.x) - Math.PI / 2,
              char = glyphs[(col * 7 + row * 3) % glyphs.length];
            if (!dark) {
              g.save();
              g.translate(n.x + 22, n.y + 27);
              g.rotate(angle);
              g.fillStyle = "#33271a12";
              g.fillText(char, 0, 0);
              g.restore();
            }
            g.save();
            g.translate(n.x, n.y);
            g.rotate(angle);
            g.fillStyle = prism
              ? `hsla(${175 + i * 35 + n.light * 65},70%,${64 + n.light * 24}%,${0.48 + n.light * 0.5})`
              : dark
                ? `rgba(228,207,170,${0.5 + n.light * 0.5})`
                : n.light > 0.3
                  ? "#a45d23"
                  : "#514b41";
            g.fillText(char, 0, 0);
            g.restore();
          }
        if (prism) {
          g.save();
          g.globalCompositeOperation = "lighter";
          g.strokeStyle = "#38bdf81a";
          g.lineWidth = 5;
          for (let col = 0; col < c.cols; col += 2) {
            g.beginPath();
            for (let row = 0; row < c.rows; row++) {
              const n = c.nodes[col * c.rows + row];
              row ? g.lineTo(n.x, n.y) : g.moveTo(n.x, n.y);
            }
            g.stroke();
          }
          g.restore();
        }
      }
      host.current!.dataset.chapter = String(chapter);
      host.current!.dataset.nodes = String(
        (prism ? 896 : 728) * (trio ? 3 : 1),
      );
    },
    paused,
    compact,
  );
  async function enable(force = false) {
    if (compact || paused || (!sound && !force)) return false;
    try {
      if (!audio.current) audio.current = createChimeAudio(prism);
      const engine = audio.current;
      await engine.resume();
      if (audio.current !== engine) return false;
      setArmed(true);
      return true;
    } catch {
      if (audio.current) setArmed(false);
      return false;
    }
  }
  function move(e: PointerEvent) {
    const r = e.currentTarget.getBoundingClientRect(),
      p = pointer.current,
      x = ((e.clientX - r.left) * host.current!.clientWidth) / r.width,
      y = ((e.clientY - r.top) * host.current!.clientHeight) / r.height;
    p.px = p.active ? p.x : x;
    p.py = p.active ? p.y : y;
    p.x = x;
    p.y = y;
    p.active = true;
    invalidate();
    if (!compact && sound && armed && !paused) {
      const now = performance.now();
      for (let i = 0; i < 3; i++) {
        if (!trio && i !== chapter) continue;
        const c = physics.current[i],
          col = Math.round(
            ((x - (c.x - c.spacing * (c.rows - 1) * 0.5)) /
              (c.spacing * (c.rows - 1))) *
              (c.cols - 1),
          ),
          key = i * 100 + col;
        if (
          col >= 0 &&
          col < c.cols &&
          y > c.y &&
          y < c.y + c.spacing * c.rows &&
          now - (cooldowns.current.get(key) ?? -1000) > 65
        ) {
          audio.current?.pluck(
            col,
            i,
            (x / Math.max(1, host.current!.clientWidth)) * 2 - 1,
            Math.min(2, Math.hypot(x - p.px, y - p.py) / 12),
          );
          cooldowns.current.set(key, now);
        }
      }
    }
  }
  function navigate(delta: number) {
    setChapter((v) => (v + delta + 3) % 3);
  }
  return (
    <section
      className={`chime-stage ${className}`}
      data-theme={dark ? "obsidian" : "paper"}
      data-prism={prism || undefined}
      data-ensemble={trio}
      data-compact={compact || undefined}
      data-paused={paused || undefined}
      aria-label={
        prism
          ? "Prism Chime, an interactive harmonic curtain"
          : "Verlet Chime, an interactive typographic curtain"
      }
    >
      <style>{styles}</style>
      <canvas ref={canvas} aria-hidden="true" />
      <div
        ref={host}
        className="chime-surface"
        tabIndex={compact ? -1 : 0}
        aria-label="Move across the strings. Arrow keys change sculpture; space plucks a note."
        onPointerMove={move}
        onPointerDown={(e) => {
          if (e.isTrusted && sound) enable();
          move(e);
        }}
        onPointerLeave={() => {
          pointer.current.active = false;
        }}
        onPointerCancel={() => {
          pointer.current.active = false;
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
            e.preventDefault();
            navigate(e.key === "ArrowRight" ? 1 : -1);
          }
          if (e.key === " ") {
            e.preventDefault();
            void enable().then((ready) => {
              if (ready && sound) audio.current?.pluck(8, chapter, 0, 1);
            });
          }
        }}
      />
      <header>
        <span>
          {prism ? "DICHROIC STUDIES" : "ACOUSTIC ARCHITECTURE"}
          <small> / 0{chapter + 1}</small>
        </span>
        <div>
          <button aria-pressed={trio} onClick={() => setTrio((v) => !v)}>
            {trio ? "Solo" : "Ensemble"}
          </button>
          {!compact && (
            <button
              aria-pressed={sound && armed}
              onClick={() => {
                if (!armed || !sound) {
                  setSound(true);
                  void enable(true);
                } else setSound(false);
              }}
            >
              {sound && armed ? "Mute" : "Enable sound"}
            </button>
          )}
        </div>
      </header>
      {!trio && (
        <article key={chapter}>
          <small>
            0{chapter + 1} / {data[chapter][1]}
          </small>
          <h2>
            {data[chapter][2].split(" ").map((word, i) => (
              <span key={i} style={{ animationDelay: `${i * 32}ms` }}>
                {word}{" "}
              </span>
            ))}
          </h2>
        </article>
      )}
      <button
        className="chime-prev"
        aria-label="Previous sculpture"
        onClick={() => navigate(-1)}
      >
        <span aria-hidden="true">←</span>
        <small>0{((chapter + 2) % 3) + 1}</small>
      </button>
      <button
        className="chime-next"
        aria-label="Next sculpture"
        onClick={() => navigate(1)}
      >
        <span aria-hidden="true">→</span>
        <small>0{((chapter + 1) % 3) + 1}</small>
      </button>
      <footer>
        <span>{data[chapter][0]}</span>
        <span>
          {trio
            ? "Three bodies. One field."
            : "Pass through. Leave a resonance."}
        </span>
      </footer>
    </section>
  );
}
const styles = `.chime-stage{--ch-paper:#eae5dc;--ch-ink:#302b25;position:relative;isolation:isolate;width:100%;height:100%;min-height:300px;overflow:hidden;background:var(--ch-paper);color:var(--ch-ink);font-family:'Urbanist Variable',Urbanist,Arial,sans-serif;container-type:inline-size}.chime-stage[data-theme=obsidian]{--ch-paper:#080a10;--ch-ink:#ece4d6}.chime-stage>canvas,.chime-surface{position:absolute;inset:0;width:100%;height:100%;display:block}.chime-surface{z-index:1;touch-action:pan-y}.chime-stage>header{position:absolute;top:0;left:0;right:0;z-index:3;padding:25px 30px;display:flex;justify-content:space-between;gap:14px;align-items:center;pointer-events:none;font:9px ui-monospace,monospace;letter-spacing:.08em}.chime-stage header div{display:flex;gap:8px;pointer-events:auto}.chime-stage button{font:11px 'Urbanist Variable',Urbanist,Arial;background:color-mix(in srgb,var(--ch-paper) 85%,transparent);color:inherit;border:1px solid color-mix(in srgb,var(--ch-ink) 25%,transparent);cursor:pointer;min-height:44px;padding:8px 13px}.chime-stage article{position:absolute;left:5%;top:32%;width:26%;pointer-events:none;z-index:2}.chime-stage article small{font:8px ui-monospace,monospace;letter-spacing:.06em;opacity:.6}.chime-stage h2{font:400 clamp(25px,3.8cqw,52px)/1.04 Georgia,serif;letter-spacing:-.035em;margin:22px 0}.chime-stage h2 span{animation:ch-word .7s both;display:inline-block;white-space:pre}.chime-prev,.chime-next{position:absolute;top:37%;width:52px;height:64px;display:grid;gap:4px;place-items:center;z-index:3;padding:8px!important}.chime-prev{left:2%}.chime-next{right:2%}.chime-stage article~.chime-prev{top:17%}.chime-stage button span{font-size:19px}.chime-stage button small{font:8px ui-monospace,monospace;opacity:.6}.chime-stage footer{position:absolute;bottom:22px;left:30px;right:30px;display:flex;justify-content:space-between;gap:20px;pointer-events:none;z-index:2;font:8px ui-monospace,monospace;letter-spacing:.06em}.chime-stage footer>span:last-child{max-width:190px;text-align:right;opacity:.6}.chime-stage button:active{transform:scale(.97)}.chime-stage button:focus-visible,.chime-surface:focus-visible{outline:2px solid #9e713c;outline-offset:-4px}.chime-stage[data-compact] article{display:none}.chime-stage[data-compact] header{padding:12px 16px;font-size:6px}.chime-stage[data-compact] header small{display:none}.chime-stage[data-compact] header button{font-size:9px;min-height:30px;padding:4px 8px}.chime-stage[data-compact] footer{bottom:12px;left:16px;right:16px;font-size:6px}.chime-stage[data-compact] footer>span:last-child{display:none}.chime-stage[data-compact] .chime-prev,.chime-stage[data-compact] .chime-next{width:27px;height:44px;top:43%}.chime-stage[data-paused] *{animation:none!important;transition:none!important}@keyframes ch-word{from{opacity:.15;filter:blur(8px);transform:translateY(8px)}to{opacity:1;filter:none;transform:none}}@container(max-width:680px){.chime-stage article{display:none}.chime-stage header{padding:16px;font-size:7px}.chime-stage header div{gap:4px}.chime-stage header button{font-size:10px;padding:6px 8px}.chime-stage footer{left:16px;right:16px;font-size:7px}.chime-stage footer>span:last-child{max-width:115px}.chime-prev,.chime-next{width:36px;height:52px;top:40%}.chime-stage article~.chime-prev{top:40%}}@media(prefers-reduced-motion:reduce){.chime-stage *{animation:none!important;transition:none!important}}`;
