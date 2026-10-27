"use client";
import { useEffect, useId, useRef, useState, type CSSProperties } from "react";
import { effectRuntime } from "./effect-runtime";
export type ObsidianGateProps = {
  brandTitle?: string;
  subtitle?: string;
  accentColor?: string;
  onSuccess?: () => void;
  onProvider?: (provider: "github" | "google") => void;
  paused?: boolean;
  compact?: boolean;
  autoDemo?: boolean;
  className?: string;
};
type Phase = "idle" | "focused" | "authenticating" | "success";
export default function ObsidianGate({
  brandTitle = "Welcome back to Motiqo",
  subtitle = "Enter your credentials to access the spatial library",
  accentColor = "#38bdf8",
  onSuccess,
  onProvider,
  paused = false,
  compact = false,
  autoDemo = false,
  className = "",
}: ObsidianGateProps) {
  const root = useRef<HTMLDivElement>(null),
    canvas = useRef<HTMLCanvasElement>(null),
    card = useRef<HTMLDivElement>(null),
    sync = useRef<(() => void) | null>(null),
    timers = useRef<ReturnType<typeof setTimeout>[]>([]),
    ripples = useRef<{ radius: number; life: number }[]>([]),
    pointer = useRef({ x: 0.5, y: 0.5 }),
    opts = useRef({ paused, phase: "idle" as Phase });
  const [phase, setPhase] = useState<Phase>("idle"),
    [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [show, setShow] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");
  const uid = useId();
  useEffect(() => {
    if (!autoDemo || paused || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let step = 0;
    const timer = setInterval(() => {
      if (document.hidden) return;
      step = (step + 1) % 4;
      setPhase((['idle','focused','authenticating','success'] as Phase[])[step]);
      setEmail(step ? 'hello@motiqo.design' : '');
      setPassword(step ? 'motiqo-demo' : '');
      setMessage(step === 3 ? 'Access granted · demo session ready.' : step === 2 ? 'Verifying demo session…' : '');
      if (step === 2) ripples.current.push({radius:25,life:1});
    }, 2400);
    return () => clearInterval(timer);
  }, [autoDemo, paused]);
  opts.current = { paused, phase };
  useEffect(() => {
    const host = root.current!,
      surface = canvas.current!,
      ctx = surface.getContext("2d");
    if (!ctx) {
      host.dataset.ready = "true";
      return;
    }
    let w = 1,
      h = 1;
    const runtime = effectRuntime(
      host,
      surface,
      (_, dt) => {
        ctx.clearRect(0, 0, w, h);
        const state = opts.current.phase,
          color =
            state === "success" || state === "authenticating"
              ? "#10b981"
              : state === "focused"
                ? "#06b6d4"
                : "#6366f1";
        const glow = ctx.createRadialGradient(
          w * 0.5,
          h * 0.48,
          0,
          w * 0.5,
          h * 0.48,
          Math.max(w, h) * 0.57,
        );
        glow.addColorStop(0, color + "35");
        glow.addColorStop(0.55, color + "0b");
        glow.addColorStop(1, color + "00");
        ctx.fillStyle = glow;
        ctx.fillRect(0, 0, w, h);
        for (let x = 20; x < w; x += 28)
          for (let y = 20; y < h; y += 28) {
            const dx = x - pointer.current.x * w,
              dy = y - pointer.current.y * h,
              d = Math.hypot(dx, dy),
              influence = Math.exp((-d * d) / 36000),
              px = x + dx * 0.06 * influence,
              py = y + dy * 0.06 * influence;
            ctx.strokeStyle = `rgba(154,178,220,${0.12 + influence * 0.17})`;
            ctx.beginPath();
            ctx.moveTo(px - 2, py);
            ctx.lineTo(px + 2, py);
            ctx.moveTo(px, py - 2);
            ctx.lineTo(px, py + 2);
            ctx.stroke();
          }
        if (dt > 0) ripples.current = ripples.current.filter((r) => r.life > 0);
        else ripples.current = [];
        for (const ripple of ripples.current) {
          ripple.radius += dt * 210;
          ripple.life -= dt * 0.8;
          ctx.strokeStyle = `rgba(56,189,248,${Math.max(0, ripple.life) * 0.28})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.ellipse(
            w * 0.5,
            h * 0.48,
            ripple.radius,
            ripple.radius * 0.72,
            0,
            0,
            Math.PI * 2,
          );
          ctx.stroke();
        }
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
      runtime.dispose();
      sync.current = null;
    };
  }, [compact]);
  useEffect(() => sync.current?.(), [paused, phase]);
  useEffect(
    () => () => {
      timers.current.forEach(clearTimeout);
    },
    [],
  );
  function ripple() {
    if (ripples.current.length < 10)
      ripples.current.push({ radius: 25, life: 1 });
    sync.current?.();
  }
  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (phase === "authenticating" || phase === "success") return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("Enter a valid email address.");
      root.current
        ?.querySelector<HTMLInputElement>('input[type="email"]')
        ?.focus();
      return;
    }
    if (password.length < 8) {
      setError("Use at least 8 characters.");
      root.current
        ?.querySelector<HTMLInputElement>('[name="password"]')
        ?.focus();
      return;
    }
    setError("");
    setPhase("authenticating");
    setMessage("Generating ephemeral key…");
    ripple();
    timers.current.forEach(clearTimeout);
    timers.current = [
      setTimeout(() => setMessage("Verifying demo session…"), 650),
      setTimeout(() => {
        setPhase("success");
        setMessage("Access granted · demo session ready.");
        onSuccess?.();
      }, 1400),
    ];
  }
  function provider(name: "github" | "google") {
    if (onProvider) {
      onProvider(name);
      return;
    }
    setMessage(
      `${name === "github" ? "GitHub" : "Google"} selected. Connect onProvider to your authentication service.`,
    );
  }
  const busy = phase === "authenticating" || phase === "success",
    segments = Math.min(4, Math.floor(password.length / 3));
  return (
    <section
      ref={root}
      className={`obsidian-gate ${className}`}
      data-phase={phase}
      data-compact={compact || undefined}
      style={{ "--og-accent": accentColor } as CSSProperties}
      aria-label="Motiqo sign-in demo"
      onPointerMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        pointer.current = {
          x: (e.clientX - r.left) / Math.max(1, r.width),
          y: (e.clientY - r.top) / Math.max(1, r.height),
        };
        const c = card.current?.getBoundingClientRect();
        if (c) {
          card.current?.style.setProperty("--og-x", `${e.clientX - c.left}px`);
          card.current?.style.setProperty("--og-y", `${e.clientY - c.top}px`);
        }
        sync.current?.();
      }}
    >
      <style>{styles}</style>
      <canvas ref={canvas} aria-hidden="true" />
      <div ref={card} className="og-chassis">
        <div className="og-card">
          <div className="og-crest" aria-hidden="true">
            <svg viewBox="0 0 40 40">
              <path
                d="m20 6 12 7v14l-12 7-12-7V13Z M8 13l12 7 12-7 M20 20v14"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.2"
              />
              <circle
                cx="20"
                cy="20"
                r="5"
                fill="none"
                stroke="currentColor"
                strokeWidth=".6"
              />
            </svg>
          </div>
          <h2>{brandTitle}</h2>
          <p className="og-subtitle">{subtitle}</p>
          <div className="og-sso">
            <button
              type="button"
              disabled={busy}
              onClick={() => provider("github")}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path
                  fill="currentColor"
                  d="M12 2a10 10 0 0 0-3.16 19.49c.5.09.68-.22.68-.48v-1.86c-2.78.6-3.37-1.18-3.37-1.18-.45-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.61.07-.61 1 .07 1.53 1.03 1.53 1.03.89 1.52 2.34 1.08 2.91.83.09-.65.35-1.08.63-1.33-2.22-.25-4.55-1.11-4.55-4.94 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.65 0 0 .84-.27 2.75 1.03A9.6 9.6 0 0 1 12 6.84c.85 0 1.71.11 2.51.34 1.91-1.3 2.75-1.03 2.75-1.03.55 1.38.2 2.4.1 2.65.64.7 1.03 1.59 1.03 2.68 0 3.84-2.34 4.68-4.57 4.93.36.31.68.92.68 1.85v2.75c0 .27.18.58.69.48A10 10 0 0 0 12 2Z"
                />
              </svg>
              GitHub
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => provider("google")}
            >
              <span className="og-google" aria-hidden="true">
                G
              </span>
              Google
            </button>
          </div>
          <div className="og-divider">
            <span>OR CONTINUE WITH EMAIL</span>
          </div>
          <form
            onSubmit={submit}
            noValidate
            onFocus={() => {
              if (!busy) setPhase("focused");
            }}
            onBlur={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget) && !busy)
                setPhase("idle");
            }}
          >
            <label htmlFor={`${uid}-email`}>Email address</label>
            <input
              id={`${uid}-email`}
              type="email"
              name="email"
              autoComplete="email"
              value={email}
              disabled={busy}
              aria-invalid={!!error && error.includes("email")}
              aria-describedby={error ? `${uid}-error` : undefined}
              placeholder="you@studio.com"
              onChange={(e) => {
                setEmail(e.target.value);
                setError("");
              }}
              onKeyDown={(e) => {
                if (e.key.length === 1) ripple();
              }}
            />
            <label htmlFor={`${uid}-password`}>Password</label>
            <div className="og-password">
              <input
                id={`${uid}-password`}
                type={show ? "text" : "password"}
                name="password"
                autoComplete="current-password"
                value={password}
                disabled={busy}
                aria-invalid={!!error && error.includes("characters")}
                aria-describedby={`${uid}-length${error ? ` ${uid}-error` : ""}`}
                placeholder="At least 8 characters"
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError("");
                }}
                onKeyDown={(e) => {
                  if (e.key.length === 1) ripple();
                }}
              />
              <button
                type="button"
                className="og-visibility"
                disabled={busy}
                aria-label={show ? "Hide password" : "Show password"}
                aria-pressed={show}
                onClick={() => setShow((v) => !v)}
              >
                {show ? "Hide" : "Show"}
              </button>
            </div>
            <div className="og-length" id={`${uid}-length`}>
              <span>Password length</span>
              <div aria-label={`${password.length} characters`}>
                {[0, 1, 2, 3].map((i) => (
                  <i key={i} data-lit={i < segments || undefined} />
                ))}
              </div>
            </div>
            {error && (
              <p className="og-error" id={`${uid}-error`} role="alert">
                {error}
              </p>
            )}
            <button
              type="submit"
              className="og-submit"
              disabled={busy}
              aria-busy={phase === "authenticating"}
            >
              {phase === "authenticating"
                ? "Authorizing…"
                : phase === "success"
                  ? "Session authorized"
                  : "Authorize Session"}
              <span aria-hidden="true">{phase === "success" ? "✓" : "↗"}</span>
            </button>
          </form>
          <p className="og-message" role="status" aria-live="polite">
            {message || "Demo session · credentials stay in this browser."}
          </p>
        </div>
      </div>
    </section>
  );
}
const styles = `.obsidian-gate{box-sizing:border-box;position:relative;isolation:isolate;width:100%;min-height:100%;display:grid;place-items:center;overflow:hidden;padding:48px 25px;background:#050609;color:#f2f4f8;font-family:'Urbanist Variable',Urbanist,Arial,sans-serif;container-type:inline-size}.obsidian-gate *{box-sizing:border-box}.obsidian-gate>canvas{position:absolute;inset:0;z-index:-1;width:100%;height:100%}.og-chassis{--og-x:50%;--og-y:0%;width:100%;max-width:420px;position:relative;padding:1px;border-radius:28px;background:radial-gradient(280px circle at var(--og-x) var(--og-y),var(--og-accent),transparent 70%),linear-gradient(135deg,#ffffff22,#ffffff07);box-shadow:0 30px 90px #000b}.og-card{border-radius:27px;padding:32px;background:#0b0d12ed;backdrop-filter:blur(24px);box-shadow:inset 0 1px #ffffff14}.og-crest{width:48px;height:48px;margin:0 auto;border-radius:15px;border:1px solid #ffffff20;display:grid;place-items:center;color:#c5e9ff;background:linear-gradient(#ffffff14,#ffffff03);box-shadow:inset 0 1px #ffffff1e,0 8px 22px #0004}.og-crest svg{width:32px;height:32px;animation:og-orbit 20s linear infinite}.obsidian-gate[data-phase=focused] .og-crest svg{animation-duration:8s}.obsidian-gate h2{text-align:center;font-size:23px;font-weight:550;letter-spacing:-.035em;margin:22px 0 8px}.og-subtitle{text-align:center;font-size:12px;line-height:1.6;color:#a6afbe;max-width:290px;margin:0 auto}.og-sso{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:26px}.og-sso button{display:flex;gap:8px;align-items:center;justify-content:center;min-height:44px;border:1px solid #ffffff14;border-radius:11px;background:#12151e;color:#d2d9e4;box-shadow:inset 0 1px #ffffff0d;cursor:pointer;font:inherit;font-size:12px}.og-sso button:hover{background:#1a1f2b}.og-sso svg{width:15px;height:15px}.og-google{font-weight:650;font-size:17px}.og-divider{display:flex;align-items:center;gap:12px;margin:24px 0;color:#919dab;font:8px ui-monospace,monospace;letter-spacing:.12em}.og-divider::before,.og-divider::after{content:'';height:1px;background:#ffffff12;flex:1}.og-divider span{white-space:nowrap}.og-card form>label{display:block;font-size:11px;margin:17px 0 8px;color:#c0c9d5}.og-card input{display:block;width:100%;min-height:46px;border:1px solid #ffffff17;border-radius:10px;background:#080b11;color:#f4f6fa;padding:12px 14px;font:inherit;font-size:13px;transition:border-color .2s,box-shadow .2s}.og-card input::placeholder{color:#748092}.og-card input:focus{outline:none;border-color:var(--og-accent);box-shadow:0 0 0 3px color-mix(in srgb,var(--og-accent) 10%,transparent)}.og-card input[aria-invalid=true]{border-color:#fda4af}.og-password{position:relative}.og-password input{padding-right:65px}.og-visibility{position:absolute;top:1px;right:2px;bottom:1px;min-width:55px;border:0;background:transparent;color:#aebbc9;font:inherit;font-size:10px;cursor:pointer}.og-length{display:flex;justify-content:space-between;align-items:center;margin-top:10px;color:#8996a7;font-size:9px}.og-length>div{display:flex;gap:3px}.og-length i{width:18px;height:3px;border-radius:3px;background:#ffffff13;transition:background .2s}.og-length i[data-lit]{background:var(--og-accent)}.og-submit{display:flex;align-items:center;justify-content:space-between;position:relative;overflow:hidden;margin-top:25px;width:100%;min-height:46px;border:1px solid #ffffff60;border-radius:10px;background:linear-gradient(#fff,#dce5ef);color:#101520;font:inherit;font-weight:600;font-size:12px;padding:12px 16px;box-shadow:0 0 25px #bfe9ff12;cursor:pointer}.og-submit::before{content:'';position:absolute;inset:-50% auto -50% -40%;width:20%;background:#ffffffaa;transform:rotate(25deg);transition:left .65s}.og-submit:hover::before{left:125%}.og-submit:hover{box-shadow:0 0 30px color-mix(in srgb,var(--og-accent) 20%,transparent)}.og-submit:disabled{cursor:default;opacity:.75}.obsidian-gate[data-phase=success] .og-submit{background:#c5f5df;border-color:#8bebc1;color:#07462e}.og-error{font-size:11px;color:#fda4af;line-height:1.5;margin:10px 0}.og-message{font-size:10px;line-height:1.6;color:#92a2b6;text-align:center;margin:18px 0 0;min-height:30px}.og-card button:focus-visible{outline:2px solid var(--og-accent);outline-offset:3px}.og-card button:disabled:not(.og-submit){opacity:.5;cursor:default}@keyframes og-orbit{to{transform:rotate(360deg)}}.obsidian-gate[data-compact]{padding:16px;min-height:300px}.obsidian-gate[data-compact] .og-chassis{max-width:260px;border-radius:20px}.obsidian-gate[data-compact] .og-card{padding:18px;border-radius:19px}.obsidian-gate[data-compact] .og-crest{width:30px;height:30px;border-radius:9px}.obsidian-gate[data-compact] .og-crest svg{width:22px;height:22px}.obsidian-gate[data-compact] h2{font-size:16px;margin:12px 0 7px}.obsidian-gate[data-compact] .og-subtitle,.obsidian-gate[data-compact] .og-divider,.obsidian-gate[data-compact] .og-sso,.obsidian-gate[data-compact] .og-message,.obsidian-gate[data-compact] .og-length{display:none}.obsidian-gate[data-compact] .og-card form>label{font-size:9px;margin:10px 0 5px}.obsidian-gate[data-compact] .og-card input{min-height:34px;font-size:10px;padding:8px 10px}.obsidian-gate[data-compact] .og-password input{padding-right:55px}.obsidian-gate[data-compact] .og-submit{min-height:34px;margin-top:14px;font-size:10px;padding:8px 10px}@container(max-width:400px){.og-card{padding:26px 21px}.obsidian-gate h2{font-size:22px}.og-card input{font-size:16px}.og-subtitle{font-size:12px}.og-message{font-size:10px}}@media(prefers-reduced-motion:reduce){.obsidian-gate *{animation:none!important;transition:none!important}}`;
