"use client";
import {
  forwardRef,
  useEffect,
  useId,
  useImperativeHandle,
  useRef,
  useState,
  type CSSProperties,
} from "react";
export type TitaniumFinish = "pearl" | "obsidian" | "chrome";
export type TitaniumCardHandle = {
  flip: () => void;
  reveal: () => void;
  triggerNfcPulse: () => void;
};
export type TitaniumCardProps = {
  holder?: string;
  number?: string;
  expires?: string;
  cvv?: string;
  tier?: string;
  finish?: TitaniumFinish;
  maxTilt?: number;
  foil?: boolean;
  showControls?: boolean;
  paused?: boolean;
  compact?: boolean;
  className?: string;
};
const TitaniumCard = forwardRef<TitaniumCardHandle, TitaniumCardProps>(
  function TitaniumCard(
    {
      holder = "ALEX MORGAN",
      number = "4716 0381 9254 4242",
      expires = "09/29",
      cvv = "731",
      tier = "TITANIUM",
      finish = "pearl",
      maxTilt = 15,
      foil = true,
      showControls = true,
      paused = false,
      compact = false,
      className = "",
    },
    ref,
  ) {
    const [material, setMaterial] = useState<TitaniumFinish>(finish),
      [revealed, setRevealed] = useState(false),
      [cvvShown, setCvvShown] = useState(false),
      [message, setMessage] = useState(""),
      root = useRef<HTMLElement>(null),
      card = useRef<HTMLDivElement>(null),
      hitArea = useRef<HTMLDivElement>(null),
      front = useRef<HTMLDivElement>(null),
      back = useRef<HTMLDivElement>(null),
      shadow = useRef<HTMLDivElement>(null),
      digits = useRef<HTMLSpanElement>(null),
      security = useRef<HTMLSpanElement>(null),
      wake = useRef<() => void>(() => {}),
      grain = useId().replace(/:/g, "");
    const motion = useRef({
      rx: 0,
      ry: 0,
      tx: 0,
      ty: 0,
      hy: 0,
      vry: 0,
      target: 0,
      forced: false,
      dragging: false,
      startX: 0,
      lastX: 0,
      lastAt: 0,
      moved: 0,
      mx: 50,
      my: 50,
      hover: false,
      reveal: false,
      cvv: false,
      scramble: -1000,
      cvvScramble: -1000,
      pulse: -1000,
      dragId: -1,
    });
    const safeNumber = number.replace(/\D/g, "").slice(0, 16).padEnd(16, "0"),
      safeCvv = cvv.replace(/\D/g, "").slice(0, 4) || "731",
      options = useRef({ paused, maxTilt, safeNumber, safeCvv });
    options.current = {
      paused,
      maxTilt: Number.isFinite(maxTilt)
        ? Math.min(25, Math.max(0, maxTilt))
        : 15,
      safeNumber,
      safeCvv,
    };
    useEffect(() => setMaterial(finish), [finish]);
    function flip() {
      const m = motion.current;
      m.target = Math.round(m.ry / 180) * 180 + 180;
      m.forced = true;
      m.vry = 0;
      wake.current();
    }
    function reveal() {
      const m = motion.current;
      m.reveal = !m.reveal;
      m.scramble = performance.now();
      setRevealed(m.reveal);
      setMessage(m.reveal ? "Card number revealed." : "Card number hidden.");
      wake.current();
    }
    function triggerNfcPulse() {
      motion.current.pulse = performance.now();
      setMessage("NFC pulse · visual demo only.");
      wake.current();
    }
    useImperativeHandle(ref, () => ({ flip, reveal, triggerNfcPulse }));
    useEffect(() => {
      const host = root.current!,
        pose = card.current!,
        reduced = matchMedia("(prefers-reduced-motion: reduce)");
      let frame = 0,
        last = 0,
        gone = false,
        visible = true;
      const masked = (value: string) => "•••• •••• •••• " + value.slice(-4),
        format = (value: string) => value.match(/.{1,4}/g)?.join(" ") || value;
      function draw(now: number) {
        frame = 0;
        if (gone || !visible || document.hidden) return;
        const m = motion.current,
          o = options.current,
          still = reduced.matches || o.paused,
          dt = still ? 0 : Math.min(0.04, (now - (last || now)) / 1000);
        last = now;
        const smooth = still ? 1 : 1 - Math.exp(-dt * 12);
        m.rx += (m.tx - m.rx) * smooth;
        m.hy += (m.ty - m.hy) * smooth;
        if (!m.dragging) {
          if (!m.forced && Math.abs(m.vry) > 1.2) {
            m.ry += m.vry * dt * 60;
            m.vry *= Math.pow(0.95, dt * 60);
            m.target = Math.round(m.ry / 180) * 180;
          } else {
            m.ry += (m.target - m.ry) * smooth;
            if (Math.abs(m.target - m.ry) < 0.04) {
              m.ry = m.target;
              m.forced = false;
            }
          }
        }
        const angle = m.ry + (still ? 0 : m.hy),
          rad = (angle * Math.PI) / 180,
          pulseAge = (now - m.pulse) / 1000,
          pulse = pulseAge >= 0 && pulseAge < 1 ? pulseAge : 1;
        pose.style.transform = `rotateX(${still ? 0 : m.rx}deg) rotateY(${angle}deg) translateZ(${still ? 0 : Math.sin(pulse * Math.PI) * 18}px)`;
        for (const [key, value] of Object.entries({
          "--mx": `${m.mx}%`,
          "--my": `${m.my}%`,
          "--hx": `${50 + m.ty * 3}%`,
          "--hy": `${50 + m.rx * 3}%`,
          "--ho": m.hover ? ".85" : ".48",
          "--ca": `${angle * 1.5 + 120}deg`,
          "--st": `${m.mx - 30}%`,
          "--ea": `${Math.abs(Math.sin(rad))}`,
          "--ti-pulse": String(pulse),
        }))
          pose.style.setProperty(key, value);
        if (shadow.current)
          shadow.current.style.transform = `translateX(-50%) scaleX(${1 - Math.abs(Math.sin(rad)) * 0.48})`;
        const showingBack = Math.cos(rad) < 0;
        if (front.current) {
          front.current.inert = showingBack;
          front.current.setAttribute("aria-hidden", String(showingBack));
        }
        if (back.current) {
          back.current.inert = !showingBack;
          back.current.setAttribute("aria-hidden", String(!showingBack));
        }
        const scramble = (
          value: string,
          start: number,
          reveal: boolean,
          spacing: boolean,
        ) => {
          if (!reveal) return spacing ? masked(value) : "•••";
          const age = now - start;
          if (still || age > 790) return spacing ? format(value) : value;
          const result = Array.from(value, (digit, index) =>
            age > 520 + Math.floor(index / 4) * 90
              ? digit
              : String(
                  Math.floor(
                    Math.abs(Math.sin(now * 0.13 + index * 17.1)) * 10,
                  ) % 10,
                ),
          ).join("");
          return spacing ? format(result) : result;
        };
        if (digits.current)
          digits.current.textContent = scramble(
            o.safeNumber,
            m.scramble,
            m.reveal,
            true,
          );
        if (security.current)
          security.current.textContent = scramble(
            o.safeCvv,
            m.cvvScramble,
            m.cvv,
            false,
          );
        host.dataset.ready = "true";
        const active =
          m.dragging ||
          Math.abs(m.vry) > 1.2 ||
          Math.abs(m.target - m.ry) > 0.04 ||
          Math.abs(m.tx - m.rx) > 0.02 ||
          Math.abs(m.ty - m.hy) > 0.02 ||
          pulse < 1 ||
          (m.reveal && now - m.scramble < 800) ||
          (m.cvv && now - m.cvvScramble < 800);
        if (active && !still) frame = requestAnimationFrame(draw);
      }
      function invalidate() {
        if (!gone && !frame && visible && !document.hidden) {
          last = 0;
          frame = requestAnimationFrame(draw);
        }
      }
      wake.current = invalidate;
      const size = new ResizeObserver(invalidate);
      size.observe(host);
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
      const orientation = (event: DeviceOrientationEvent) => {
        if (reduced.matches || motion.current.dragging) return;
        const m = motion.current;
        m.tx = Math.max(-oTilt(), Math.min(oTilt(), (event.beta ?? 0) * 0.2));
        m.ty = Math.max(-oTilt(), Math.min(oTilt(), (event.gamma ?? 0) * 0.3));
        invalidate();
      };
      const oTilt = () => options.current.maxTilt;
      document.addEventListener("visibilitychange", visibility);
      reduced.addEventListener("change", invalidate);
      window.addEventListener("deviceorientation", orientation);
      invalidate();
      return () => {
        gone = true;
        cancelAnimationFrame(frame);
        size.disconnect();
        io.disconnect();
        document.removeEventListener("visibilitychange", visibility);
        reduced.removeEventListener("change", invalidate);
        window.removeEventListener("deviceorientation", orientation);
        wake.current = () => {};
      };
    }, []);
    useEffect(() => wake.current(), [paused, maxTilt, number, cvv, material]);
    const layers = (
      <>
        <div className="ti-grain" style={{ filter: `url(#${grain}-grain)` }} />
        <div className="ti-film" />
        <div className="ti-film2" />
        <div className="ti-lines" />
        <div className="ti-streak" />
        <div className="ti-glare" />
        <i className="ti-pulse" />
      </>
    );
    function release(cancel = false) {
      const m = motion.current;
      if (!m.dragging) return;
      m.dragging = false;
      if (cancel) {
        m.vry = 0;
        m.target = Math.round(m.ry / 180) * 180;
        m.forced = true;
      } else if (m.moved < 4) flip();
      else {
        m.target = Math.round(m.ry / 180) * 180;
        m.forced = false;
      }
      wake.current();
    }
    return (
      <section
        ref={root}
        className={`titanium-study ${className}`}
        data-finish={material}
        data-foil={foil}
        data-compact={compact || undefined}
        aria-label="Titanium card study"
      >
        <style>{styles}</style>
        <svg width="0" height="0" className="ti-defs" aria-hidden="true">
          <filter id={`${grain}-grain`}>
            <feTurbulence
              type="fractalNoise"
              baseFrequency=".9 .02"
              numOctaves="3"
              seed="9"
              stitchTiles="stitch"
            />
          </filter>
        </svg>
        <div ref={hitArea} className="ti-space"
            onPointerDown={(event) => {
              if ((event.target as HTMLElement).closest("button")) return;
              const m = motion.current;
              m.dragging = true;
              m.startX = m.lastX = event.clientX;
              m.lastAt = performance.now();
              m.moved = 0;
              m.vry = 0;
              m.forced = false;
              m.dragId = event.pointerId;
              event.currentTarget.setPointerCapture?.(event.pointerId);
              wake.current();
            }}
            onPointerMove={(event) => {
              const m = motion.current,
                r = hitArea.current!.getBoundingClientRect();
              m.mx = Math.max(0, Math.min(100, ((event.clientX - r.left) / Math.max(1, r.width)) * 100));
              m.my = Math.max(0, Math.min(100, ((event.clientY - r.top) / Math.max(1, r.height)) * 100));
              m.hover = true;
              if (m.dragging) {
                const now = performance.now(),
                  dx = event.clientX - m.lastX;
                m.ry += dx * 0.6;
                m.vry = (dx * 0.6) / Math.max(1, (now - m.lastAt) / 16.67);
                m.moved = Math.max(m.moved, Math.abs(event.clientX - m.startX));
                m.lastX = event.clientX;
                m.lastAt = now;
              } else {
                m.tx = -(m.my / 100 - 0.5) * options.current.maxTilt * 2;
                m.ty = (m.mx / 100 - 0.5) * options.current.maxTilt * 2;
              }
              wake.current();
            }}
            onPointerUp={(event) => {
              release();
              if (event.currentTarget.hasPointerCapture?.(event.pointerId))
                event.currentTarget.releasePointerCapture(event.pointerId);
            }}
            onPointerCancel={() => release(true)}
            onLostPointerCapture={() => release(true)}
            onPointerLeave={() => {
              const m = motion.current;
              m.hover = false;
              m.tx = 0;
              m.ty = 0;
              wake.current();
            }}
        >
          <div ref={shadow} className="ti-shadow" />
          <div
            ref={card}
            className="ti-card"
            role="group"
            tabIndex={0}
            aria-label="Titanium card. Press Enter to flip; left and right arrows turn the card."
            onKeyDown={(event) => {
              if (event.target !== event.currentTarget) return;
              if (
                ["Enter", " ", "ArrowLeft", "ArrowRight"].includes(event.key)
              ) {
                event.preventDefault();
                flip();
              }
            }}

          >
            {[1, 2, 3, 4].map((depth) => (
              <div
                className="ti-edge"
                key={depth}
                style={{ transform: `translateZ(-${depth}px)` }}
                aria-hidden="true"
              />
            ))}
            <div ref={front} className="ti-face ti-front">
              {layers}
              <div className="ti-content">
                <header>
                  <svg
                    width="30"
                    height="30"
                    viewBox="0 0 30 30"
                    aria-hidden="true"
                  >
                    <path
                      d="m15 3 12 7v10l-12 7-12-7V10Z M3 10l12 7 12-7M15 17v10"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                    />
                  </svg>
                  <span>{tier}</span>
                </header>
                <div className="ti-hardware">
                  <svg
                    className="ti-chip"
                    width="44"
                    height="34"
                    viewBox="0 0 44 34"
                    aria-label="EMV chip"
                  >
                    <rect
                      x=".5"
                      y=".5"
                      width="43"
                      height="33"
                      rx="6"
                      fill="#cfb886"
                      stroke="#a28e61"
                    />
                    <path
                      d="M15 0v10h14V0M15 34V24h14v10M0 11h14v12H0m44-12H30v12h14M15 10v14m14-14v14"
                      stroke="#9c8552"
                      fill="none"
                    />
                    <rect
                      x="17"
                      y="12"
                      width="10"
                      height="10"
                      rx="2"
                      fill="#e7d6a9"
                    />
                  </svg>
                  <button
                    className="ti-nfc"
                    aria-label="Trigger NFC pulse"
                    onClick={triggerNfcPulse}
                  >
                    <svg
                      width="24"
                      height="28"
                      viewBox="0 0 24 28"
                      fill="none"
                      aria-hidden="true"
                    >
                      <path
                        d="M7 9c3 3 3 7 0 10m4-14c5 5 5 13 0 18M15 1c7 7 7 19 0 26M3 12c1 1 1 3 0 4"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                      />
                    </svg>
                  </button>
                </div>
                <button
                  className="ti-number"
                  aria-label={
                    revealed
                      ? `Hide card number ${safeNumber}`
                      : `Reveal card number ending ${safeNumber.slice(-4)}`
                  }
                  aria-pressed={revealed}
                  onClick={reveal}
                >
                  <span ref={digits}>
                    •••• •••• •••• {safeNumber.slice(-4)}
                  </span>
                </button>
                <footer>
                  <div>
                    <span>CARD HOLDER</span>
                    <strong>{holder}</strong>
                  </div>
                  <div>
                    <span>EXPIRES</span>
                    <strong>{expires}</strong>
                  </div>
                  <svg
                    className="ti-network"
                    width="47"
                    height="30"
                    viewBox="0 0 47 30"
                    aria-label="Demo card network"
                  >
                    <circle
                      cx="16"
                      cy="15"
                      r="13"
                      fill="currentColor"
                      opacity=".2"
                    />
                    <circle
                      cx="31"
                      cy="15"
                      r="13"
                      fill="currentColor"
                      opacity=".35"
                    />
                  </svg>
                </footer>
              </div>
            </div>
            <div ref={back} className="ti-face ti-back" aria-hidden="true">
              {layers}
              <div className="ti-magnetic" />
              <div className="ti-back-content">
                <div className="ti-signature">
                  <span>AUTHORIZED SIGNATURE</span>
                  <button
                    aria-label={
                      cvvShown ? "Hide security code" : "Reveal security code"
                    }
                    aria-pressed={cvvShown}
                    onClick={() => {
                      const m = motion.current;
                      m.cvv = !m.cvv;
                      m.cvvScramble = performance.now();
                      setCvvShown(m.cvv);
                      wake.current();
                    }}
                  >
                    CVV <span ref={security}>•••</span>
                  </button>
                </div>
                <div className="ti-hologram" />
                <p>
                  Crafted for the way you move.
                  <br />A material study by Motiqo.
                </p>
                <span className="ti-back-tier">{tier}</span>
              </div>
            </div>
          </div>
        </div>
        {showControls && !compact && (
          <div className="ti-dock">
            <div>
              <button onClick={flip}>Flip 180°</button>
              <button onClick={reveal}>
                {revealed ? "Hide number" : "Reveal number"}
              </button>
              <button onClick={triggerNfcPulse}>Tap to Pay</button>
            </div>
            <div role="group" aria-label="Titanium finish">
              {(["pearl", "obsidian", "chrome"] as const).map((value) => (
                <button
                  key={value}
                  aria-pressed={material === value}
                  onClick={() => setMaterial(value)}
                >
                  {value[0].toUpperCase() + value.slice(1)}
                </button>
              ))}
            </div>
          </div>
        )}
        <p className="ti-feedback" role="status">
          {message}
        </p>
      </section>
    );
  },
);
export default TitaniumCard;
const styles = `.titanium-study{--ti-text:#1d1d1f;--ti-bg:#f2f2f7;--ti-base:linear-gradient(135deg,#fdfdfe 0%,#ececf1 38%,#f8f8fa 62%,#e2e2e8 100%);box-sizing:border-box;position:relative;display:flex;flex-direction:column;justify-content:center;align-items:center;gap:45px;width:100%;height:100%;min-height:570px;padding:55px 30px 30px;background-color:var(--ti-bg);background-image:radial-gradient(#99999d25 .7px,transparent .7px);background-size:23px 23px;color:var(--ti-text);font-family:'Urbanist Variable',Urbanist,Arial,sans-serif;overflow:hidden;container-type:inline-size}.titanium-study *{box-sizing:border-box}.titanium-study[data-finish=obsidian]{--ti-text:#f4f4f6;--ti-bg:#06070a;--ti-base:linear-gradient(135deg,#090a0f,#181a24 50%,#0b0c12)}.titanium-study[data-finish=chrome]{--ti-base:linear-gradient(120deg,#fafafa,#aaaeb7 18%,#f8f8fa 36%,#8e929c 51%,#e3e5e8 58%,#fafafa 70%,#b2b5bd)}.ti-defs{position:absolute;pointer-events:none}.ti-space{position:relative;width:min(440px,100%);aspect-ratio:1.586;perspective:1100px;touch-action:pan-y}.ti-card{position:absolute;inset:0;transform-style:preserve-3d;touch-action:pan-y;outline:none;cursor:grab}.ti-card:active{cursor:grabbing}.ti-card:focus-visible{outline:2px solid #8170d0;outline-offset:10px;border-radius:20px}.ti-shadow{position:absolute;width:87%;height:24px;bottom:-36px;left:50%;transform:translateX(-50%);border-radius:50%;background:#14172244;filter:blur(16px)}.ti-face,.ti-edge{position:absolute;inset:0;border-radius:20px;transform-style:preserve-3d}.ti-face{background:var(--ti-base);backface-visibility:hidden;overflow:hidden;border:1px solid #777a821c;box-shadow:inset 0 1px 1px #ffffff66}.ti-front{transform:translateZ(1px)}.ti-back{transform:rotateY(180deg) translateZ(4px)}.ti-edge{background:linear-gradient(90deg,#c5c6ce,#eeeef3 18%,#ced0d9 48%,#fafaff 75%,#bfc2cc);box-shadow:0 0 0 .25px #b8bac22a}.ti-face>div:not(.ti-content):not(.ti-back-content):not(.ti-magnetic),.ti-pulse{position:absolute;inset:0;pointer-events:none}.ti-grain{opacity:.13;mix-blend-mode:soft-light;background:#888}.ti-film{background:linear-gradient(115deg,#ffd9ec 0%,#ffe6cf 12%,#fff6c9 22%,#d4f7e4 34%,#c9ecff 46%,#d9d4ff 58%,#f6d0ff 70%,#ffd9ec 82%,#ffe6cf 100%);background-size:300% 300%;background-position:var(--hx,50%) var(--hy,50%);opacity:var(--ho,.48);mask-image:radial-gradient(ellipse at var(--mx,50%) var(--my,50%),#000 10%,transparent 90%);mix-blend-mode:multiply}.ti-film2{background:conic-gradient(from var(--ca,120deg) at var(--mx,50%) var(--my,50%),#ff9ad5,#ffc58f,#fff08f,#9ff0c6,#8fd6ff,#b8a6ff,#ff9ad5);mix-blend-mode:color;opacity:.16}.ti-lines{background:repeating-linear-gradient(115deg,#ffffffa6 0 1px,transparent 1px 3px);opacity:.08;mask-image:radial-gradient(ellipse at var(--mx,50%) var(--my,50%),#000,transparent 70%)}.ti-streak{background:linear-gradient(115deg,transparent 25%,#ffffffa6 45%,#fff 50%,transparent 68%);background-size:230% 100%;background-position:var(--st,20%) center;opacity:.2;mix-blend-mode:screen}.ti-glare{background:radial-gradient(ellipse at var(--mx,50%) var(--my,50%),#fff6,transparent 50%);opacity:.3}.titanium-study[data-foil=false] :is(.ti-film,.ti-film2,.ti-lines){opacity:0}.titanium-study[data-finish=obsidian] .ti-film{mix-blend-mode:screen;opacity:.2}.ti-pulse{inset:auto!important;left:80%;top:40%;width:70px;height:70px;border:2px solid #f4daff;border-radius:50%;box-shadow:0 0 20px #bad6ff;transform:translate(-50%,-50%) scale(calc(var(--ti-pulse,1)*11));opacity:calc(1 - var(--ti-pulse,1));mix-blend-mode:screen}.ti-content{position:relative;height:100%;padding:26px 29px;display:flex;flex-direction:column;z-index:2}.ti-content header{display:flex;align-items:center;justify-content:space-between}.ti-content header>span{font-size:9px;letter-spacing:.25em;font-weight:650;opacity:.65}.ti-hardware{display:flex;justify-content:space-between;align-items:center;margin-top:19px}.titanium-study button{font:inherit;cursor:pointer;color:inherit}.ti-nfc{background:none;border:0;padding:0 2px;opacity:.55}.ti-nfc:hover{opacity:1}.ti-number{font-family:ui-monospace,'SFMono-Regular',monospace!important;background:none;border:0;padding:0;margin:23px 0 0;text-align:left;font-size:clamp(13px,2.1cqw,23px)!important;letter-spacing:.08em;white-space:nowrap;text-shadow:0 1px #fff9;font-variant-numeric:tabular-nums}.ti-content footer{display:flex;align-items:end;gap:35px;margin-top:auto}.ti-content footer>div{display:flex;flex-direction:column;gap:5px}.ti-content footer span{font-size:6px;letter-spacing:.15em;opacity:.5}.ti-content footer strong{font-size:10px;letter-spacing:.06em;font-weight:550}.ti-network{margin-left:auto;width:40px;height:25px}.ti-magnetic{position:absolute;left:0;right:0;top:33px;height:43px;background:linear-gradient(#2a2a2e,#111);z-index:2}.ti-back-content{position:relative;z-index:3;padding:100px 28px 20px;height:100%}.ti-signature{display:flex;justify-content:space-between;align-items:center;background:#ffffff88;min-height:36px;padding:7px 11px;border-radius:3px;color:#27272b}.ti-signature>span{font-size:5px;letter-spacing:.1em}.ti-signature button{font:9px ui-monospace,monospace;background:none;border:0}.ti-signature button span{margin-left:14px;min-width:35px;display:inline-block;text-align:right}.ti-hologram{margin-top:21px;width:37px;height:37px;border-radius:50%;background:conic-gradient(from var(--ca,120deg),#f9e2a4,#afd7db,#e7b9f0,#fff3c8,#b0c4e7,#f9e2a4);box-shadow:inset 0 0 0 4px #ffffff55;float:left}.ti-back-content p{font-size:9px;line-height:1.6;margin:22px 0 0 55px;opacity:.55}.ti-back-tier{position:absolute;bottom:22px;right:28px;font-size:7px;letter-spacing:.2em;opacity:.45}.ti-dock{display:flex;flex-direction:column;align-items:center;gap:10px;max-width:100%}.ti-dock>div{display:flex;gap:3px;max-width:100%;padding:4px;border:1px solid #88888825;border-radius:99px;background:color-mix(in srgb,var(--ti-text) 3%,var(--ti-bg))}.ti-dock button{border:0;background:none;border-radius:99px;padding:10px 15px;font-size:10px;white-space:nowrap}.ti-dock button:hover,.ti-dock button[aria-pressed=true]{background:color-mix(in srgb,var(--ti-text) 10%,transparent)}.ti-feedback{font-size:10px;min-height:14px;opacity:.6;margin:0}.titanium-study button:focus-visible{outline:2px solid #8b71c5;outline-offset:3px}.titanium-study[data-compact]{min-height:300px;padding:42px 32px}.titanium-study[data-compact] .ti-feedback{display:none}.titanium-study[data-compact] .ti-content{padding:18px 23px}.titanium-study[data-compact] .ti-hardware{margin-top:9px}.titanium-study[data-compact] .ti-number{margin-top:16px;font-size:17px!important}.titanium-study[data-compact] .ti-content footer{gap:25px}.titanium-study[data-compact] .ti-chip{width:33px;height:26px}.titanium-study[data-compact] .ti-content header>svg{width:24px;height:24px}.titanium-study[data-compact] .ti-back-content{padding-top:77px}.titanium-study[data-compact] .ti-magnetic{top:25px;height:30px}@container(max-width:400px){.ti-content{padding:18px 22px}.ti-hardware{margin-top:12px}.ti-number{margin-top:15px}.ti-content footer{gap:20px}.ti-chip{width:35px;height:27px}.ti-content header>svg{width:24px;height:24px}.ti-content footer strong{font-size:8px}.ti-back-content{padding-top:80px}.ti-magnetic{height:32px;top:25px}.ti-dock button{padding:10px;font-size:9px}}@media(max-width:400px){.titanium-study{padding:45px 20px;min-height:500px}.ti-number{font-size:14px!important}.ti-content{padding:17px}.ti-content footer{gap:15px}.ti-content header>span{font-size:7px}.ti-content footer span{font-size:5px}}@media(prefers-reduced-motion:reduce){.titanium-study *{transition:none!important;animation:none!important}}`;
