"use client";
import {
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent,
  type CSSProperties,
} from "react";
import { effectRuntime } from "./effect-runtime";
export type CosmosSplitAuthProps = {
  brandName?: string;
  autoCycleSlides?: boolean;
  onSubmit?: (credentials: {
    email: string;
    password: string;
  }) => void | Promise<void>;
  onGoogle?: () => void | Promise<void>;
  onSignUp?: () => void;
  onForgotPassword?: (email: string) => void;
  paused?: boolean;
  className?: string;
};
const copy = {
  EN: {
    welcome: "Welcome!",
    subtitle: "Access your Motiqo Spatial Telemetry Workspace",
    google: "Log in with Google",
    or: "or",
    email: "Your email",
    password: "Password",
    forgot: "Forgot password?",
    login: "Log In",
    account: "Don’t have an account?",
    signup: "Sign up",
    join: "Join Us",
    demo: "Demo mode. Connect onSubmit to your authentication service.",
    provider: "Connect onGoogle to enable Google sign in.",
    reset: "Connect onForgotPassword to send a reset link.",
    register: "Connect onSignUp to create an account.",
    error: "Sign in failed. Please try again.",
    success: "Sign in complete.",
    busy: "Signing in…",
  },
  ES: {
    welcome: "¡Bienvenido!",
    subtitle: "Accede a tu espacio de telemetría espacial Motiqo",
    google: "Continuar con Google",
    or: "o",
    email: "Tu correo",
    password: "Contraseña",
    forgot: "¿Olvidaste tu contraseña?",
    login: "Iniciar sesión",
    account: "¿No tienes una cuenta?",
    signup: "Regístrate",
    join: "Únete",
    demo: "Modo demo. Conecta onSubmit a tu servicio de autenticación.",
    provider: "Conecta onGoogle para iniciar sesión con Google.",
    reset: "Conecta onForgotPassword para enviar un enlace.",
    register: "Conecta onSignUp para crear una cuenta.",
    error: "No se pudo iniciar sesión. Inténtalo de nuevo.",
    success: "Sesión iniciada.",
    busy: "Iniciando…",
  },
  JP: {
    welcome: "ようこそ！",
    subtitle: "Motiqo の空間テレメトリーワークスペースへ",
    google: "Google でログイン",
    or: "または",
    email: "メールアドレス",
    password: "パスワード",
    forgot: "パスワードを忘れた場合",
    login: "ログイン",
    account: "アカウントをお持ちでない場合",
    signup: "新規登録",
    join: "参加する",
    demo: "デモモード。認証サービスを onSubmit に接続してください。",
    provider: "Google ログインには onGoogle を接続してください。",
    reset: "onForgotPassword を接続してください。",
    register: "onSignUp を接続してください。",
    error: "ログインできませんでした。再試行してください。",
    success: "ログインしました。",
    busy: "ログイン中…",
  },
};
const quotes = [
  "Explore uncharted dimensions of real-time web graphics.",
  "Sub-pixel shaders crafted for fluid human interaction.",
  "Build a universe that responds to every gesture.",
  "Your next dimension starts with a single idea.",
];
export default function CosmosSplitAuth({
  brandName = "KRONOS.",
  autoCycleSlides = true,
  onSubmit,
  onGoogle,
  onSignUp,
  onForgotPassword,
  paused = false,
  className = "",
}: CosmosSplitAuthProps) {
  const [language, setLanguage] = useState<keyof typeof copy>("EN"),
    [slide, setSlide] = useState(0),
    [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [interacting, setInteracting] = useState(false),
    [imageFailed, setImageFailed] = useState(false);
  const root = useRef<HTMLElement>(null),
    scene = useRef<HTMLDivElement>(null),
    canvas = useRef<HTMLCanvasElement>(null),
    runtime = useRef<ReturnType<typeof effectRuntime> | null>(null),
    energy = useRef(0),
    mounted = useRef(true),
    pending = useRef(false),
    id = useId(),
    c = copy[language];
  const options = useRef({ paused, autoCycleSlides, interacting });
  options.current = { paused, autoCycleSlides, interacting };
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  useEffect(() => {
    const host = scene.current!,
      ctx = canvas.current!.getContext("2d");
    let x = 0.5,
      y = 0.5,
      tx = 0.5,
      ty = 0.5,
      w = 520,
      h = 660,
      elapsed = 0,
      visible = true;
    const move = (event: PointerEvent) => {
      const r = host.getBoundingClientRect();
      tx = (event.clientX - r.left) / r.width;
      ty = (event.clientY - r.top) / r.height;
      runtime.current?.invalidate();
    };
    const io = new IntersectionObserver((entries) => {
      visible = entries[0].isIntersecting;
    });
    io.observe(host);
    host.addEventListener("pointermove", move);
    // The same visibility-aware clock rotates slides: no hidden interval keeps running.
    if (!ctx) {
      root.current!.dataset.ready = "true";
      return () => {
        io.disconnect();
        host.removeEventListener("pointermove", move);
      };
    }
    runtime.current = effectRuntime(
      host,
      canvas.current!,
      (_time, dt) => {
        if (
          options.current.autoCycleSlides &&
          !options.current.interacting &&
          visible
        ) {
          elapsed += dt;
          if (elapsed >= 7) {
            elapsed = 0;
            setSlide((old) => (old + 1) % 4);
          }
        }
        x += (tx - x) * Math.min(1, dt * 5 || 1);
        y += (ty - y) * Math.min(1, dt * 5 || 1);
        energy.current *= Math.exp(-dt * 3);
        ctx.clearRect(0, 0, w, h);
        ctx.globalCompositeOperation = "screen";
        const spot = (px: number, py: number, r: number, color: string) => {
          const g = ctx.createRadialGradient(px, py, 0, px, py, r);
          g.addColorStop(0, color);
          g.addColorStop(1, "transparent");
          ctx.fillStyle = g;
          ctx.fillRect(px - r, py - r, r * 2, r * 2);
        };
        ctx.globalAlpha = 0.18 + energy.current * 0.12;
        spot(w * (0.15 + x * 0.35), h * (0.42 + y * 0.15), w * 0.65, "#FF5E00");
        spot(w * (0.98 - x * 0.3), h * (0.65 - y * 0.14), w * 0.65, "#00E5FF");
        ctx.globalAlpha = 1;
        for (let i = 0; i < 70; i++) {
          const t =
              _time * (0.05 + (i % 7) * 0.006) * (1 + energy.current * 1.8) +
              i * 2.4,
            px = w * (0.5 + Math.sin(t + i) * (0.1 + (i % 9) * 0.047)),
            py = h * (0.5 + Math.cos(t * 0.7 + i * 2) * 0.5),
            r = 1 + (i % 5) * 0.7;
          ctx.globalAlpha = 0.2 + (i % 4) * 0.1 + energy.current * 0.1;
          spot(
            px,
            py,
            r * 3,
            i % 3 === 0 ? "#00e5ff" : i % 3 === 1 ? "#ffae62" : "#c69bff",
          );
        }
        ctx.globalAlpha = 1;
        root.current!.dataset.ready = "true";
      },
      () => options.current.paused,
      (width, height, dpr) => {
        w = width;
        h = height;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      },
    );
    return () => {
      runtime.current?.dispose();
      io.disconnect();
      host.removeEventListener("pointermove", move);
    };
  }, []);
  useEffect(
    () => runtime.current?.invalidate(),
    [paused, autoCycleSlides, interacting],
  );
  function typing() {
    energy.current = Math.min(2, energy.current + 0.35);
    runtime.current?.invalidate();
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (pending.current) return;
    if (!onSubmit) {
      setMessage(c.demo);
      return;
    }
    pending.current = true;
    setBusy(true);
    setMessage("");
    try {
      await onSubmit({ email, password });
      if (mounted.current) {
        setMessage(c.success);
        setPassword("");
      }
    } catch {
      if (mounted.current) setMessage(c.error);
    } finally {
      pending.current = false;
      if (mounted.current) setBusy(false);
    }
  }
  async function google() {
    if (!onGoogle) {
      setMessage(c.provider);
      return;
    }
    try {
      await onGoogle();
    } catch {
      if (mounted.current) setMessage(c.error);
    }
  }
  function signUp() {
    if (onSignUp) onSignUp();
    else setMessage(c.register);
  }
  return (
    <section
      ref={root}
      className={`cosmos-auth ${className}`}
      data-paused={paused||undefined}
      aria-label="Cosmos sign in"
      lang={language === "JP" ? "ja" : language.toLowerCase()}
      onFocusCapture={() => setInteracting(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget))
          setInteracting(false);
      }}
      onPointerEnter={() => setInteracting(true)}
      onPointerLeave={() => setInteracting(false)}
    >
      <style>{styles}</style>
      <div className="cs-form-panel">
        <header>
          <a className="cs-wordmark" href="#cosmos-login">
            {brandName}
          </a>
          <label className="cs-language">
            <span className="cs-sr">Language</span>
            <select
              aria-label="Language"
              value={language}
              onChange={(event) => {
                setLanguage(event.target.value as keyof typeof copy);
                setMessage("");
              }}
            >
              <option value="EN">🇬🇧 EN</option>
              <option value="ES">🇪🇸 ES</option>
              <option value="JP">🇯🇵 JP</option>
            </select>
          </label>
        </header>
        <form id="cosmos-login" onSubmit={submit}>
          <h2>{c.welcome}</h2>
          <p>{c.subtitle}</p>
          <button className="cs-google" type="button" onClick={google}>
            <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden="true">
              <path
                fill="#4285F4"
                d="M44.5 24.5c0-1.4-.1-2.8-.4-4.1H24v7.8h11.5a9.8 9.8 0 0 1-4.3 6.4v5.2h7c4.1-3.7 6.3-9.1 6.3-15.3Z"
              />
              <path
                fill="#34A853"
                d="M24 45c5.8 0 10.7-1.9 14.2-5.2l-7-5.2a13 13 0 0 1-7.2 2c-5.6 0-10.3-3.8-12-8.9H4.8v5.4A21.4 21.4 0 0 0 24 45Z"
              />
              <path
                fill="#FBBC05"
                d="M12 27.7a12.8 12.8 0 0 1 0-7.4v-5.4H4.8a21 21 0 0 0 0 18.2Z"
              />
              <path
                fill="#EA4335"
                d="M24 11.4c3.1 0 5.9 1.1 8 3.1l6-5.9A20.5 20.5 0 0 0 24 3 21.4 21.4 0 0 0 4.8 14.9l7.2 5.4c1.7-5.1 6.4-8.9 12-8.9Z"
              />
            </svg>
            {c.google}
          </button>
          <div className="cs-divider">
            <span>{c.or}</span>
          </div>
          <label>
            <span className="cs-sr">{c.email}</span>
            <input
              name="email"
              type="email"
              autoComplete="email"
              placeholder={c.email}
              required
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                typing();
              }}
            />
          </label>
          <label>
            <span className="cs-sr">{c.password}</span>
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              placeholder={c.password}
              required
              minLength={8}
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
                typing();
              }}
            />
          </label>
          <button
            className="cs-forgot"
            type="button"
            onClick={() =>
              onForgotPassword ? onForgotPassword(email) : setMessage(c.reset)
            }
          >
            {c.forgot}
          </button>
          <button className="cs-submit" type="submit" disabled={busy}>
            {busy ? c.busy : c.login}
          </button>
          <p className="cs-register">
            {c.account}{" "}
            <button type="button" onClick={signUp}>
              {c.signup}
            </button>
          </p>
          <p className="cs-feedback" role="status" aria-live="polite">
            {message}
          </p>
        </form>
        <footer>SPATIAL THINKING. HUMAN CONNECTION.</footer>
      </div>
      <div
        className="cs-space"
        ref={scene}
        data-slide={slide}
        data-image-failed={imageFailed || undefined}
        style={
          {
            "--cs-hue": `${[0, 25, -25, 155][slide]}deg`,
            "--cs-zoom": 1 + slide * 0.055,
          } as CSSProperties
        }
      >
        {!imageFailed && (
          <img
            src="/media/cosmos-astronaut.png"
            alt=""
            className="cs-astronaut"
            onError={() => setImageFailed(true)}
          />
        )}
        <div className="cs-space-shade" />
        <canvas ref={canvas} aria-hidden="true" />
        <header>
          <button onClick={signUp}>{c.signup}</button>
          <button className="cs-join" onClick={signUp}>
            {c.join}
          </button>
        </header>
        <div className="cs-community">
          <span aria-hidden="true">♧</span>
          <p>
            Largest Spatial
            <br />
            Design Community
          </p>
          <i />
        </div>
        <div className="cs-editorial">
          <span className="cs-quote" aria-hidden="true">
            “
          </span>
          <h3 key={slide}>{quotes[slide]}</h3>
          <div className="cs-slide-controls">
            <div aria-live="polite" aria-atomic="true">
              <span className="cs-sr">Scene </span>
              {String(slide + 1).padStart(2, "0")}
              <i aria-hidden="true">
                <b style={{ width: `${(slide + 1) * 25}%` }} />
              </i>
              <span aria-hidden="true">04</span>
              <span className="cs-sr"> of 4</span>
            </div>
            <div>
              <button
                aria-label="Previous scene"
                onClick={() => setSlide((old) => (old + 3) % 4)}
              >
                ←
              </button>
              <button
                aria-label="Next scene"
                onClick={() => setSlide((old) => (old + 1) % 4)}
              >
                →
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
const styles = `.cosmos-auth{box-sizing:border-box;display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,340px),1fr));max-width:1040px;width:100%;min-height:700px;margin:auto;border-radius:32px;overflow:hidden;border:1px solid #ffffff1a;box-shadow:0 35px 90px #0005;font-family:'Urbanist Variable',Urbanist,Arial,sans-serif;container-type:inline-size;background:#fafafc;color:#0d0e12}.cosmos-auth *{box-sizing:border-box}.cosmos-auth a{color:inherit;text-decoration:none}.cosmos-auth button,.cosmos-auth input,.cosmos-auth select{font:inherit}.cosmos-auth button{cursor:pointer}.cs-form-panel{padding:32px 38px 22px;display:flex;flex-direction:column;background:#fafafc}.cs-form-panel header{display:flex;align-items:center;justify-content:space-between}.cs-wordmark{font-size:24px;font-weight:900;letter-spacing:-.07em}.cs-language select{font-size:11px;background:#fff;color:#3f3f46;border:1px solid #e2e2e6;border-radius:99px;padding:9px 11px;cursor:pointer}.cs-form-panel form{max-width:340px;width:100%;margin:auto;padding:45px 0 12px}.cs-form-panel h2{font-size:52px;line-height:1;font-weight:750;letter-spacing:-.055em;text-align:center;margin:0 0 14px}.cs-form-panel form>p:first-of-type{font-size:12px;text-align:center;line-height:1.5;color:#71717a;margin:0 0 29px}.cs-google{display:flex;align-items:center;justify-content:center;gap:10px;border:1px solid #dcdce2;border-radius:11px;width:100%;padding:13px;background:#fff;color:#18181b;font-size:11px!important;font-weight:600!important}.cs-google:hover{background:#f1f1f5}.cs-divider{display:flex;align-items:center;gap:15px;color:#8c8b94;font-size:10px;margin:23px 0}.cs-divider:before,.cs-divider:after{content:'';height:1px;flex:1;background:#e6e6eb}.cs-form-panel input{display:block;width:100%;min-height:48px;border:1px solid transparent;background:#f0f1f5;border-radius:11px;padding:13px 15px;color:#15151a;font-size:12px;margin:0 0 13px}.cs-form-panel input:focus{background:#fff;border-color:#27272a;outline:none}.cs-form-panel input::placeholder{color:#777783}.cs-forgot{display:block;margin:1px 0 0 auto;font-size:10px!important;color:#1665c0;border:0;background:none;padding:3px 0}.cs-submit{width:100%;border:0;border-radius:99px;background:#111114;color:#fff;min-height:46px;margin-top:20px;font-size:12px!important;box-shadow:0 10px 25px #0002}.cs-submit:hover{background:#2b2b32}.cs-submit:disabled{opacity:.6;cursor:wait}.cs-register{font-size:10px;text-align:center;color:#6a6a76;margin-top:20px}.cs-register button{font-size:inherit;border:0;background:none;color:#1265be;padding:0 3px}.cs-feedback{min-height:29px;text-align:center;font-size:11px;line-height:1.4;color:#475569;margin:15px 0 0}.cs-form-panel footer{font-size:7px;letter-spacing:.17em;color:#95949f;text-align:center}.cs-space{position:relative;isolation:isolate;overflow:hidden;background:radial-gradient(ellipse at 65% 55%,#00687d,transparent 45%),radial-gradient(ellipse at 30% 60%,#9f3c16,transparent 45%),#07060e;color:#fff;padding:32px;display:flex;flex-direction:column;min-height:700px}.cs-astronaut{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:-3;transform:scale(var(--cs-zoom));filter:hue-rotate(var(--cs-hue));transition:transform 1.8s cubic-bezier(.22,1,.36,1),filter 1.2s}.cs-space-shade{position:absolute;inset:0;z-index:-2;background:linear-gradient(#07060ecc,transparent 35%,transparent 55%,#07060ee6)}.cs-space canvas{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:-1;mix-blend-mode:screen}.cs-space header{display:flex;gap:18px;justify-content:flex-end;align-items:center}.cs-space header button{font-size:10px;background:none;color:#fff;border:0;padding:8px 0}.cs-space header .cs-join{border:1px solid #ffffff80;border-radius:99px;padding:9px 20px;background:#ffffff05;backdrop-filter:blur(10px)}.cs-community{display:flex;align-items:center;gap:12px;margin-top:35px}.cs-community>span{display:grid;place-items:center;border-radius:50%;background:#fff;color:#101015;width:41px;height:41px;font-size:30px}.cs-community p{font-size:11px;line-height:1.25}.cs-community>i{height:1px;width:44px;margin-left:auto;background:#ffffff70}.cs-editorial{margin-top:auto;padding-top:200px}.cs-quote{font-size:62px;font-weight:700;line-height:.6}.cs-editorial h3{font-size:26px;line-height:1.16;font-weight:550;letter-spacing:-.025em;max-width:350px;margin:8px 0 26px;text-wrap:balance;animation:cs-appear .55s both}.cs-slide-controls{display:flex;justify-content:space-between;align-items:center;gap:20px;font-size:10px}.cs-slide-controls>div{display:flex;align-items:center;gap:12px}.cs-slide-controls i{width:48px;height:2px;background:#ffffff40;display:block}.cs-slide-controls b{height:100%;display:block;background:#fff;transition:width .4s}.cs-slide-controls button{display:grid;place-items:center;width:34px;height:34px;border-radius:50%;background:#07060e66;border:1px solid #ffffff60;color:#fff;backdrop-filter:blur(10px)}.cs-space button:hover{background:#fff;color:#0d0e12}.cosmos-auth button:focus-visible,.cosmos-auth a:focus-visible,.cosmos-auth select:focus-visible{outline:2px solid #0077aa;outline-offset:4px}.cs-space button:focus-visible{outline-color:#fff}.cs-sr{position:absolute;width:1px;height:1px;padding:0;overflow:hidden;clip-path:inset(50%);white-space:nowrap}@keyframes cs-appear{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}@container(max-width:680px){.cs-form-panel{padding:28px 22px}.cs-form-panel h2{font-size:42px}.cs-space{padding:25px 22px}.cs-community>i{display:none}.cs-editorial h3{font-size:23px}}@media(max-width:650px){.cosmos-auth{grid-template-columns:1fr;border-radius:22px}.cs-form-panel{min-height:660px}.cs-space{min-height:620px}.cs-editorial{padding-top:200px}.cs-form-panel h2{font-size:46px}}.cosmos-auth[data-paused] *{animation:none!important;transition:none!important}@media(prefers-reduced-motion:reduce){.cosmos-auth *{animation:none!important;transition:none!important}}`;
