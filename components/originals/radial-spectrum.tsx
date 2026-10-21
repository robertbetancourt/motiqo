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
  autoDemo?: boolean;
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
  autoDemo = false,
  className = "",
}: RadialSpectrumProps) {
  const recording = spectrumTracks[track] ?? spectrumTracks.momentum,
    source = audioUrl || recording.url,
    title = trackTitle || recording.title;
  const host = useRef<HTMLDivElement>(null),
    canvas = useRef<HTMLCanvasElement>(null),
    ring = useRef({
      width: 0,
      height: 0,
      base: 0,
      count: 0,
      amplitudes: new Float32Array(720),
    }),
    engine = useRef<ReturnType<typeof createScoreEngine> | null>(null),
    request = useRef(0),
    wantsPlayback = useRef(false),
    playingRef = useRef(false),
    draw = useRef<() => void>(() => {}),
    [playing, setPlaying] = useState(false),
    [loading, setLoading] = useState(false),
    [position, setPosition] = useState(0),
    [duration, setDuration] = useState(0),
    [error, setError] = useState("");
  const options = useRef({ barCount, radius, sensitivity, paused, autoDemo });
  options.current = { barCount, radius, sensitivity, paused, autoDemo };
  const stop = () => {
    request.current++;
    wantsPlayback.current = false;
    playingRef.current = false;
    setPlaying(false);
    setLoading(false);
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
    const amplitudes = ring.current.amplitudes;
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
          // Silent illustrative signal for cards; audio still requires explicit playback.
          if (o.autoDemo && compact) {
            for (let i = 0; i < bins.length; i++)
              bins[i] = Math.round(
                180 *
                  Math.exp(-i / 190) *
                  (0.5 + 0.5 * Math.sin(i * 0.075 - time * 3)) *
                  (0.65 + 0.35 * Math.sin(time * 1.8) ** 2),
              );
            for (let i = 0; i < waveform.length; i++)
              waveform[i] =
                128 +
                Math.round(
                  26 *
                    Math.sin(i * 0.12 + time * 5) *
                    (0.6 + 0.4 * Math.sin(time * 2)),
                );
          }
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
        Object.assign(ring.current, { width: w, height: h, base, count });
        const media = engine.current?.media;
        const progress =
          media && Number.isFinite(media.duration) && media.duration > 0
            ? media.currentTime / media.duration
            : 0;
        for (let i = 0; i < count; i++) {
          const u = i / (count - 1),
            angle = ((-55 + 290 * u) * Math.PI) / 180;
          const fft = spectrumBand(bins, u, engine.current?.context.sampleRate);
          const target =
            (0.012 +
              0.065 *
                Math.tanh(
                  (fft * 0.85 + rms * 0.12) * Math.max(0, o.sensitivity),
                )) *
            Math.min(w, h);
          amplitudes[i] +=
            (target - amplitudes[i]) *
            (dt ? 1 - Math.exp(-dt * (target > amplitudes[i] ? 24 : 8)) : 1);
          const amplitude = amplitudes[i];
          const sx = Math.cos(angle),
            sy = Math.sin(angle);
          const played = progress > 0 && u <= progress;
          g.strokeStyle = `rgba(245,247,250,${played ? 0.95 : 0.48 + fft * 0.27})`;
          g.lineWidth = compact ? 0.9 : 1.25;
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
        element.style.setProperty("--score-energy", String(energy));
        element.dataset.audioEnergy = energy.toFixed(3);
      },
      () => options.current.paused,
      undefined,
      compact,
    );
    draw.current = clock.invalidate;
    return () => {
      clock.dispose();
      draw.current = () => {};
    };
  }, [compact]);
  useEffect(() => {
    if (paused) stop();
    draw.current();
  }, [paused, barCount, radius, sensitivity]);
  useEffect(() => {
    stop();
    setPosition(0);
    setDuration(0);
    return () => {
      request.current++;
      wantsPlayback.current = false;
      const current = engine.current;
      engine.current = null;
      playingRef.current = false;
      void current?.dispose();
    };
  }, [source, preset]);
  useEffect(() => {
    if (!compact && !paused) void start(true);
    return stop;
  }, [source, preset, compact, paused]);
  async function start(automatic = false) {
    const ticket = ++request.current;
    wantsPlayback.current = true;
    setLoading(true);
    setError("");
    let current = engine.current;
    try {
      if (!current) {
        current = createScoreEngine(source, preset);
        engine.current = current;
        const media = current.media;
        const sync = () => {
          if (engine.current !== current) return;
          setPosition(media?.currentTime || 0);
          setDuration(
            media && Number.isFinite(media.duration) ? media.duration : 0,
          );
          draw.current();
        };
        media?.addEventListener("timeupdate", sync);
        media?.addEventListener("loadedmetadata", sync);
        media?.addEventListener("durationchange", sync);
      }
      await current.play();
      if (engine.current !== current || ticket !== request.current) {
        if (!wantsPlayback.current) await current.pause();
        return;
      }
      playingRef.current = true;
      setPlaying(true);
      draw.current();
    } catch (cause) {
      if (engine.current !== current || ticket !== request.current) return;
      stop();
      if (automatic && (cause as { name?: string })?.name === "NotAllowedError")
        return;
      setError("The track could not be played. Press Play to try again.");
    } finally {
      if (ticket === request.current) setLoading(false);
    }
  }
  function toggle() {
    if (playingRef.current || wantsPlayback.current) {
      stop();
      return;
    }
    void start();
  }
  function seek(seconds: number) {
    const media = engine.current?.media;
    if (!media || !Number.isFinite(media.duration) || media.duration <= 0)
      return;
    media.currentTime = Math.max(0, Math.min(media.duration, seconds));
    setPosition(media.currentTime);
    draw.current();
  }
  return (
    <div
      ref={host}
      role="group"
      aria-label={`${title} audio player`}
      className={`mq-score ${compact ? "mq-score-compact" : ""} ${className}`}
    >
      <style>{styles}</style>
      <canvas
        ref={canvas}
        role="slider"
        tabIndex={0}
        aria-label={`Playback position of ${title}`}
        aria-valuemin={0}
        aria-valuemax={duration || 0}
        aria-valuenow={position}
        aria-valuetext={`${Math.floor(position)} of ${Math.floor(duration)} seconds`}
        onKeyDown={(event) => {
          const value =
            event.key === "Home"
              ? 0
              : event.key === "End"
                ? duration
                : event.key === "ArrowRight" || event.key === "ArrowUp"
                  ? position + 5
                  : event.key === "ArrowLeft" || event.key === "ArrowDown"
                    ? position - 5
                    : null;
          if (value === null) return;
          event.preventDefault();
          event.stopPropagation();
          seek(value);
        }}
        onClick={(event) => {
          const rect = event.currentTarget.getBoundingClientRect();
          const layout = ring.current;
          if (!layout.count || !rect.width || !rect.height) return;
          const x =
            ((event.clientX - rect.left) * layout.width) / rect.width -
            layout.width / 2;
          const y =
            ((event.clientY - rect.top) * layout.height) / rect.height -
            layout.height / 2 -
            Math.min(layout.width, layout.height) * 0.012;
          const angle = ((Math.atan2(y, x) * 180) / Math.PI + 55 + 360) % 360;
          if (angle > 290) return;
          const index = Math.round((angle / 290) * (layout.count - 1));
          const amplitude = layout.amplitudes[index];
          const distance = Math.hypot(x, y);
          if (
            distance < layout.base - amplitude * 0.45 - 12 ||
            distance > layout.base + amplitude * 0.55 + 12
          )
            return;
          event.stopPropagation();
          seek((angle / 290) * duration);
        }}
      />
      <div className="mq-score-center">
        <span className="mq-score-top">
          {loading ? "LOADING" : playing ? "PLAYING" : "LISTEN"}
          {subtitleTop && <><br />{subtitleTop}</>}
        </span>
        <strong>{title}</strong>
        <span className="mq-score-bottom">{subtitleBottom}</span>
        <button
          className="mq-score-play"
          type="button"
          onClick={toggle}
          aria-label={`${loading ? "Cancel loading" : playing ? "Pause" : "Play"} ${title}`}
          aria-pressed={playing}
          aria-busy={loading}
        >
          <span aria-hidden="true">{loading ? "×" : playing ? "Ⅱ" : "▷"}</span>
        </button>
      </div>
      <p className={error ? "mq-score-error" : "mq-score-announcement"} role="status" aria-atomic="true">
        {loading ? `Loading ${title}. Press Cancel loading to stop waiting.` : error}
      </p>
    </div>
  );
}
const styles = `
.mq-score{position:relative;width:100%;height:100%;min-height:220px;overflow:hidden;background:#000;color:#f5f5f5;container-type:size}
.mq-score>canvas{position:absolute;inset:0;width:100%;height:100%;cursor:pointer}
.mq-score>canvas:focus-visible{outline:1px solid #ffffff80;outline-offset:-4px}
.mq-score .mq-score-center{position:absolute;inset:0;margin:auto;display:flex;flex-direction:column;align-items:center;justify-content:center;width:62%;height:fit-content;max-height:64%;padding:12px 0;gap:clamp(14px,5cqmin,30px);color:inherit;font-family:inherit;pointer-events:none;text-align:center}
.mq-score-center strong{max-width:100%;font-weight:400;font-size:clamp(16px,3.2cqmin,22px);letter-spacing:.29em;line-height:1.8;overflow-wrap:anywhere;transition:color .5s;text-shadow:0 0 calc(var(--score-energy,0)*18px) #ffffff65}
.mq-score-top,.mq-score-bottom{font-size:clamp(12px,2cqmin,14px);letter-spacing:.18em;line-height:1.6;color:#929292}
.mq-score .mq-score-play{position:absolute;top:100%;display:grid;place-items:center;width:44px;height:44px;padding:0;border:0;border-radius:50%;background:transparent;box-shadow:none;transform:none;font-family:inherit;font-size:18px;color:#ccc;cursor:pointer;pointer-events:auto}
.mq-score .mq-score-play:hover{background:#ffffff10;color:#fff}.mq-score .mq-score-play:focus-visible{outline:1px solid #ffffff80;outline-offset:3px}
.mq-score-announcement{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap;border:0}
.mq-score-error{position:absolute;bottom:12px;left:5%;width:90%;margin:0;font-size:12px;line-height:1.5;text-align:center;color:#b19898}@media(prefers-reduced-motion:reduce){.mq-score *{transition:none!important}}
`;
