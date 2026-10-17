"use client";
import { useEffect, useRef, useState } from "react";
import { effectRuntime } from "./effect-runtime";
import { createScoreEngine, type ScorePreset } from "./score-engine";
import { spectrumBand, spectrumRms } from "./spectrum-analysis";
export const spectrumTracks = {
  momentum: { title: "MOMENTUM", url: "/media/music/Momentum.mp3" },
  temporal: { title: "TEMPORAL", url: "/media/music/Temporal.mp3" },
} as const;
export type RadialSpectrumProps = {
  track?: keyof typeof spectrumTracks;
  trackTitle?: string;
  subtitleTop?: string;
  subtitleBottom?: string;
  audioUrl?: string;
  barCount?: number;
  radius?: number;
  sensitivity?: number;
  preset?: ScorePreset;
  paused?: boolean;
  compact?: boolean;
  className?: string;
};
export default function RadialSpectrum({
  track = "momentum",
  trackTitle,
  subtitleTop = "",
  subtitleBottom = "MOTIQO",
  audioUrl,
  barCount = 260,
  radius = 175,
  sensitivity = 1.2,
  preset = "interstellar",
  paused = false,
  compact = false,
  className = "",
}: RadialSpectrumProps) {
  const recording = spectrumTracks[track] ?? spectrumTracks.momentum,
    source = audioUrl || recording.url,
    title = trackTitle || recording.title;
  const host = useRef<HTMLDivElement>(null),
    canvas = useRef<HTMLCanvasElement>(null),
    button = useRef<HTMLButtonElement>(null),
    engine = useRef<ReturnType<typeof createScoreEngine> | null>(null),
    busy = useRef(false),
    playingRef = useRef(false),
    draw = useRef<() => void>(() => {}),
    [playing, setPlaying] = useState(false),
    [error, setError] = useState("");
  const options = useRef({ barCount, radius, sensitivity, paused });
  options.current = { barCount, radius, sensitivity, paused };
  const stop = () => {
    playingRef.current = false;
    setPlaying(false);
    void engine.current?.pause().catch(() => {});
    draw.current();
  };
  useEffect(() => {
    const element = host.current!,
      surface = canvas.current!,
      g = surface.getContext("2d");
    if (!g) {
      element.dataset.failed = "true";
      return;
    }
    const bins = new Uint8Array(512),
      waveform = new Uint8Array(1024);
    let energy = 0;
    const amplitudes = new Float32Array(720);
    const clock = effectRuntime(
      element,
      surface,
      (time, dt) => {
        const o = options.current,
          w = element.clientWidth,
          h = element.clientHeight,
          dpr = surface.width / w;
        g.setTransform(dpr, 0, 0, dpr, 0, 0);
        g.fillStyle = "#000";
        g.fillRect(0, 0, w, h);
        if (engine.current && playingRef.current) {
          engine.current.analyser.getByteFrequencyData(bins);
          engine.current.analyser.getByteTimeDomainData(waveform);
        } else {
          bins.fill(0);
          waveform.fill(128);
        }
        const rms = spectrumRms(waveform);
        let bass = 0;
        for (let j = 1; j < 18; j++) bass += bins[j] / 255;
        bass /= 17;
        const loudness = Math.min(1, bass * 0.65 + rms * 1.8);
        energy +=
          (loudness - energy) *
          (dt ? 1 - Math.exp(-dt * (loudness > energy ? 14 : 4)) : 1);
        const count = Math.round(Math.max(40, Math.min(720, o.barCount))),
          base =
            Math.min(w, h) *
            0.37 *
            Math.max(0.5, Math.min(1.25, o.radius / 175)) *
            (1 + energy * 0.025),
          cx = w / 2,
          cy = h / 2 + Math.min(w, h) * 0.012;
        for (let i = 0; i < count; i++) {
          const u = i / (count - 1),
            angle = ((-55 + 290 * u) * Math.PI) / 180,
            window =
              0.14 +
              1.3 * Math.exp(-Math.pow((u - 0.97) / 0.065, 2)) +
              0.7 * Math.exp(-Math.pow((u - 0.5) / 0.065, 2)) +
              0.45 * Math.exp(-Math.pow((u - 0.22) / 0.1, 2));
          const fft = spectrumBand(bins, u, engine.current?.context.sampleRate);
          const organic =
              0.6 +
              0.4 * Math.sin(i * 0.47 + Math.sin(i * 0.13) * 2 + time * 0.35),
            travel = 0.5 + 0.5 * Math.sin(u * 38 - time * 2.5);
          const target =
            (0.007 +
              window * 0.027 * organic +
              fft *
                o.sensitivity *
                (0.065 + 0.14 * window) *
                (0.8 + travel * 0.2) +
              rms * 0.025 * o.sensitivity) *
            Math.min(w, h);
          amplitudes[i] +=
            (target - amplitudes[i]) *
            (dt ? 1 - Math.exp(-dt * (target > amplitudes[i] ? 24 : 8)) : 1);
          const amplitude = amplitudes[i];
          const sx = Math.cos(angle),
            sy = Math.sin(angle);
          g.strokeStyle = `rgba(245,247,250,${Math.min(0.85, 0.19 + window * 0.18 + fft * 0.45)})`;
          g.lineWidth = compact ? 0.72 : 1;
          g.lineCap = "round";
          g.beginPath();
          g.moveTo(
            cx + sx * (base - amplitude * 0.45),
            cy + sy * (base - amplitude * 0.45),
          );
          g.lineTo(
            cx + sx * (base + amplitude * 0.55),
            cy + sy * (base + amplitude * 0.55),
          );
          g.stroke();
        }
        button.current?.style.setProperty("--score-energy", String(energy));
        element.dataset.audioEnergy = energy.toFixed(3);
      },
      () => options.current.paused,
      undefined,
      compact,
    );
    draw.current = clock.invalidate;
    const hidden = () => {
      if (document.hidden) stop();
    };
    document.addEventListener("visibilitychange", hidden);
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) stop();
    });
    observer.observe(element);
    return () => {
      clock.dispose();
      draw.current = () => {};
      document.removeEventListener("visibilitychange", hidden);
      observer.disconnect();
    };
  }, [compact]);
  useEffect(() => {
    if (paused) stop();
    draw.current();
  }, [paused, barCount, radius, sensitivity]);
  useEffect(() => {
    stop();
    return () => {
      const current = engine.current;
      engine.current = null;
      playingRef.current = false;
      void current?.dispose();
    };
  }, [source, preset]);
  async function toggle() {
    if (busy.current || paused) return;
    if (playingRef.current) {
      stop();
      return;
    }
    busy.current = true;
    setError("");
    try {
      engine.current ??= createScoreEngine(source, preset);
      const current = engine.current;
      await current.play();
      if (engine.current !== current) {
        await current.dispose();
        return;
      }
      playingRef.current = true;
      setPlaying(true);
      draw.current();
    } catch {
      stop();
      setError(
        audioUrl
          ? "The track could not be loaded. Please try again."
          : "Audio is unavailable in this browser.",
      );
    } finally {
      busy.current = false;
    }
  }
  return (
    <div
      ref={host}
      className={`mq-score ${compact ? "mq-score-compact" : ""} ${className}`}
    >
      <style>{styles}</style>
      <canvas ref={canvas} aria-hidden="true" />
      <button
        ref={button}
        className="mq-score-center"
        type="button"
        onClick={toggle}
        disabled={paused}
        aria-label={`${playing ? "Pause" : "Play"} ${title}`}
        aria-pressed={playing}
      >
        <span className="mq-score-top">
          {playing ? "PLAYING" : "LISTEN"}
          <br />
          {subtitleTop}
        </span>
        <strong>{title}</strong>
        <span className="mq-score-bottom">{subtitleBottom}</span>
        <span className="mq-score-play" aria-hidden="true">
          {playing ? "Ⅱ" : "▷"}
        </span>
      </button>
      {error && (
        <p className="mq-score-error" role="status">
          {error}
        </p>
      )}
    </div>
  );
}
const styles = `
.mq-score{position:relative;width:100%;height:100%;min-height:220px;overflow:hidden;background:#000;color:#f5f5f5;container-type:size}
.mq-score>canvas{position:absolute;inset:0;width:100%;height:100%}
.mq-score .mq-score-center{position:absolute;inset:0;margin:auto;display:flex;flex-direction:column;align-items:center;justify-content:center;width:62%;height:fit-content;max-height:64%;padding:12px 0;gap:clamp(14px,5cqmin,30px);background:transparent;border:0;color:inherit;font-family:inherit;cursor:pointer;text-align:center;transform:none;box-shadow:none}
.mq-score .mq-score-center:active,.mq-score .mq-score-center[aria-pressed=true]{transform:none;background:transparent;box-shadow:none;color:inherit}
.mq-score-center strong{max-width:100%;font-weight:400;font-size:clamp(12px,3.2cqmin,22px);letter-spacing:.29em;line-height:1.8;overflow-wrap:anywhere;transition:color .5s;text-shadow:0 0 calc(var(--score-energy,0)*18px) #ffffff65}
.mq-score-top,.mq-score-bottom{font-size:clamp(7px,1.6cqmin,10px);letter-spacing:.3em;line-height:2.1;color:#77777c}
.mq-score-play{position:absolute;top:calc(100% + 10px);font-size:13px;color:#777;opacity:0;transform:translateY(3px);transition:opacity .35s,transform .35s}
.mq-score-center:hover .mq-score-play,.mq-score-center:focus-visible .mq-score-play{opacity:1;transform:translateY(0)}
.mq-score-center:hover strong{color:#fff}.mq-score-center:focus-visible{outline:1px solid #ffffff59;border-radius:20px;outline-offset:14px}.mq-score-center:disabled{cursor:default}
.mq-score-error{position:absolute;bottom:15px;left:10%;width:80%;font-size:10px;text-align:center;color:#b19898}@media(prefers-reduced-motion:reduce){.mq-score *{transition:none!important}}
`;
