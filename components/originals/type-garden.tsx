"use client";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  gardenPalettes,
  reconcileGarden,
  type GardenColors,
  type GardenLetter,
  type GardenFlower,
  type GardenArrangement,
} from "./garden-botany";
import { BotanicalLayer } from "./garden-sprouts";
export type TypeGardenProps = {
  defaultText?: string;
  editable?: boolean;
  palette?: string | GardenColors;
  motionMode?: "breeze" | "grow" | "pulse" | "flutter";
  floralDensity?: number;
  flowerType?: GardenFlower;
  arrangement?: GardenArrangement;
  showButterflies?: boolean;
  showControls?: boolean;
  paused?: boolean;
  compact?: boolean;
  autoDemo?: boolean;
  className?: string;
  onTextChange?: (text: string) => void;
  onPaletteChange?: (palette: string) => void;
};
export default function TypeGarden({
  defaultText = "Type Garden",
  editable = true,
  palette = "Rose Noir",
  motionMode = "breeze",
  floralDensity = 1,
  flowerType = "rose",
  arrangement = "wild",
  showButterflies = true,
  showControls = true,
  paused = false,
  compact = false,
  autoDemo = false,
  className = "",
  onTextChange,
  onPaletteChange,
}: TypeGardenProps) {
  const host = useRef<HTMLDivElement>(null),
    input = useRef<HTMLTextAreaElement>(null),
    nextId = useRef(0),
    [text, setText] = useState(autoDemo ? '' : defaultText.slice(0, 160)),
    [letters, setLetters] = useState<GardenLetter[]>(() =>
      reconcileGarden([], autoDemo ? '' : defaultText.slice(0, 160), () => nextId.current++),
    ),
    [chosen, setChosen] = useState(palette),
    [size, setSize] = useState(70),
    [focused, setFocused] = useState(false),
    reduced = useReducedMotion(),
    still = paused || !!reduced;
  useEffect(() => {
    if (!autoDemo || still) return;
    const words = ['Motion', 'Design', 'Motiqo'];
    let timer: ReturnType<typeof setTimeout>, word = 0, value = '', deleting = false;
    function tick() {
      if (document.hidden || host.current?.hasAttribute('data-resting')) { timer = setTimeout(tick, 250); return; }
      const target = words[word];
      value = deleting ? value.slice(0, -1) : target.slice(0, value.length + 1);
      setText(value);
      setLetters(previous => reconcileGarden(previous, value, () => nextId.current++));
      let delay = deleting ? 130 : 240;
      if (!deleting && value === target) { deleting = true; delay = 2000; }
      else if (deleting && !value) { deleting = false; word = (word + 1) % words.length; delay = 600; }
      timer = setTimeout(tick, delay);
    }
    timer = setTimeout(tick, 600);
    return () => clearTimeout(timer);
  }, [autoDemo, still]);
  useEffect(() => setChosen(palette), [palette]);
  useEffect(() => {
    if (autoDemo) return;
    const value = defaultText.slice(0, 160);
    setText(value);
    setLetters((previous) =>
      reconcileGarden(previous, value, () => nextId.current++),
    );
  }, [defaultText, autoDemo]);
  useEffect(() => {
    const element = host.current!,
      measure = document.createElement("canvas").getContext("2d")!;
    const resize = () => {
      measure.font = "100px Georgia";
      const longest = Math.max(
        1,
        ...text
          .split("\n")
          .map(
            (line) =>
              measure.measureText(line || " ").width - line.length * 4.5,
          ),
      );
      const rows = text.split("\n").length;
      setSize(
        Math.max(
          14,
          Math.min(
            120,
            ((element.clientWidth * 0.76) / longest) * 100,
            (element.clientHeight - (showControls ? 90 : 25)) /
              (rows * 1.7 + 1),
          ),
        ),
      );
      element.dataset.ready = "true";
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(element);
    return () => observer.disconnect();
  }, [text, showControls]);
  useEffect(() => {
    const element = host.current!;
    let visible = true;
    const rest = () => {
      element.toggleAttribute("data-resting", !visible || document.hidden);
    };
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      rest();
    });
    observer.observe(element);
    document.addEventListener("visibilitychange", rest);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", rest);
    };
  }, []);
  const colors =
      typeof chosen === "string"
        ? (gardenPalettes[chosen] ?? gardenPalettes["Rose Noir"])
        : chosen,
    density = Math.max(0.5, Math.min(2, floralDensity));
  function update(value: string) {
    value = value.slice(0, 160);
    setText(value);
    setLetters((previous) =>
      reconcileGarden(previous, value, () => nextId.current++),
    );
    onTextChange?.(value);
  }
  return (
    <div
      ref={host}
      className={`mq-garden mq-garden-${motionMode} ${still ? "mq-garden-still" : ""} ${compact ? "mq-garden-compact" : ""} ${className}`}
      style={
        {
          background: colors.background,
          color: colors.text,
          "--garden-foliage": colors.foliage,
          "--garden-flower": colors.flowers,
        } as CSSProperties
      }
    >
      <style>{styles}</style>
      <div className="mq-garden-composition" style={{ fontSize: text ? size : 18 }}>
        <div className="mq-garden-word" aria-hidden="true">
          <AnimatePresence initial={!still} mode="sync">
            {letters.map((letter, i) =>
              letter.char === "\n" ? (
                <br key={letter.id} />
              ) : (
                <motion.span
                  key={letter.id}
                  className="mq-garden-letter"
                  layout={!still}
                  initial={still ? false : { opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{
                    opacity: 0,
                    scale: 0.1,
                    width: 0,
                    transition: { duration: still ? 0 : 0.3 },
                  }}
                  transition={{ type: "spring", stiffness: 220, damping: 22 }}
                  style={{ "--garden-delay": `${-i * 0.43}s` } as CSSProperties}
                >
                  {letter.char.trim() && (
                    <BotanicalLayer
                      letter={letter}
                      front={false}
                      colors={colors}
                      density={density}
                      still={still}
                      flowerType={flowerType}
                      arrangement={arrangement}
                    />
                  )}
                  <span className="mq-garden-glyph">{letter.char}</span>
                  {letter.char.trim() && (
                    <BotanicalLayer
                      letter={letter}
                      front
                      colors={colors}
                      density={density}
                      still={still}
                      flowerType={flowerType}
                      arrangement={arrangement}
                    />
                  )}
                </motion.span>
              ),
            )}
          </AnimatePresence>
        </div>
        {editable ? (
          <textarea
            ref={input}
            aria-label="Garden text"
            value={text}
            onChange={(e) => update(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            spellCheck={false}
            maxLength={160}
            rows={Math.max(1, text.split("\n").length)}
            wrap="off"
            className="mq-garden-input"
            style={{ caretColor: colors.text }}
          />
        ) : (
          <span className="mq-garden-sr">{text}</span>
        )}
        {showButterflies && text.length > 0 &&
          [0, 1, 2].map((i) => (
            <svg
              key={i}
              className={`mq-garden-butterfly mq-garden-butterfly-${i}`}
              viewBox="0 0 34 26"
              aria-hidden="true"
              style={{ color: i === 1 ? colors.flowers : colors.foliage }}
            >
              <g className="mq-garden-wings">
                <path
                  d="M17 13C4-11-7 6 10 15C-2 27 16 29 17 13ZM17 13C30-11 41 6 24 15C36 27 18 29 17 13Z"
                  fill="currentColor"
                />
                <path
                  d="m12 7 5 6 5-6M11 18l6-5 6 5"
                  fill="none"
                  stroke={colors.background}
                  strokeWidth=".8"
                />
              </g>
              <path
                d="M17 10v10m0-9-3-6m3 6 3-6"
                stroke="currentColor"
                strokeWidth="1"
                fill="none"
              />
            </svg>
          ))}
      </div>
      {showControls && (
        <div className="mq-garden-toolbar" aria-label="Garden palettes">
          {Object.entries(gardenPalettes).map(([name, p]) => (
            <button
              key={name}
              type="button"
              aria-label={name}
              title={name}
              aria-pressed={typeof chosen === "string" && chosen === name}
              onClick={() => {
                setChosen(name);
                onPaletteChange?.(name);
              }}
            >
              <span
                style={{
                  background: `linear-gradient(135deg,${p.background} 50%,${p.flowers} 50%)`,
                  borderColor: p.text + "45",
                }}
              />
            </button>
          ))}
        </div>
      )}
      {editable && !compact && !focused && text.length > 0 && (
        <span className="mq-garden-hint">
          Click the letters. Let something grow.
        </span>
      )}
    </div>
  );
}
const styles = `.mq-garden{position:relative;width:100%;height:100%;min-height:220px;display:grid;place-items:center;overflow:hidden;isolation:isolate;transition:background .6s,color .6s}.mq-garden-composition{position:relative;max-width:100%;margin-bottom:15px;font-family:Georgia,serif;line-height:1.18;letter-spacing:-.045em;font-kerning:none;font-variant-ligatures:none;font-weight:400;text-align:center;white-space:pre}.mq-garden-word{position:relative;pointer-events:none;min-width:1em;min-height:1.18em}.mq-garden-letter{display:inline-block;position:relative;white-space:pre}.mq-garden-glyph{position:relative;z-index:20;line-height:1.18}.mq-garden-botany{position:absolute;left:-.08em;top:0;width:.85em;height:1.18em;pointer-events:none}.mq-garden-back{z-index:10}.mq-garden-front{z-index:30}.mq-garden-sway{animation:mq-garden-breeze 5.5s ease-in-out infinite alternate;transform-box:fill-box}.mq-garden-grow .mq-garden-sway{animation:mq-garden-grow 6s ease-in-out infinite;animation-delay:var(--garden-delay,0s)}.mq-garden-pulse .mq-garden-sway{animation:mq-garden-pulse 2.5s ease-in-out infinite alternate}.mq-garden-flutter .mq-garden-butterfly{animation-duration:5s}.mq-garden-flutter .mq-garden-wings{animation-duration:.15s}.mq-garden-flutter .mq-garden-sway{animation:mq-garden-flutter 2s ease-in-out infinite alternate}.mq-garden-input{position:absolute;inset:0;width:100%;height:100%;font:inherit;line-height:1.18;letter-spacing:inherit;font-kerning:none;font-variant-ligatures:none;text-align:center;padding:0;margin:0;border:0;outline:0;background:transparent;resize:none;color:transparent;-webkit-text-fill-color:transparent;overflow:hidden;z-index:40;white-space:pre;cursor:text;border-radius:4px}.mq-garden-input::selection{background:#ffffff22}.mq-garden-input:focus-visible{outline:1px dashed #ffffff23;outline-offset:24px}.mq-garden-toolbar{position:absolute;bottom:39px;left:50%;transform:translateX(-50%);display:flex;gap:8px;padding:9px 13px;border:1px solid #ffffff1a;border-radius:40px;background:#ffffff09;backdrop-filter:blur(16px)}.mq-garden-toolbar button{display:grid;place-items:center;width:25px;height:25px;padding:0;background:none;border:1px solid transparent;border-radius:50%;cursor:pointer;transition:transform .3s,border-color .3s}.mq-garden-toolbar button span{display:block;width:17px;height:17px;border-radius:50%;border:1px solid}.mq-garden-toolbar button:hover{transform:translateY(-3px)}.mq-garden-toolbar button[aria-pressed=true]{border-color:#ffffffa0}.mq-garden-toolbar button:focus-visible{outline:2px solid currentColor;outline-offset:3px}.mq-garden-hint{position:absolute;bottom:15px;font:9px/1.2 sans-serif;letter-spacing:.06em;opacity:.35}.mq-garden-butterfly{position:absolute;width:.25em;height:.2em;z-index:35;pointer-events:none;animation:mq-garden-flight 9s ease-in-out infinite alternate}.mq-garden-butterfly-0{left:18%;top:-.65em}.mq-garden-butterfly-1{right:12%;top:-.25em;animation-delay:-4s;animation-duration:11s}.mq-garden-butterfly-2{left:60%;bottom:-.45em;animation-delay:-6s;animation-duration:13s}.mq-garden-wings{transform-origin:17px 13px;animation:mq-garden-wing .24s ease-in-out infinite alternate}.mq-garden-compact .mq-garden-toolbar{bottom:20px;padding:7px 10px;gap:5px}.mq-garden-compact .mq-garden-toolbar button{width:23px;height:23px}.mq-garden[data-resting] *,.mq-garden-still *{animation-play-state:paused!important;transition:none!important}.mq-garden-sr{position:absolute;width:1px;height:1px;clip-path:inset(50%);overflow:hidden}@keyframes mq-garden-breeze{from{transform:rotate(calc(var(--garden-sway,3deg)*-1))}to{transform:rotate(var(--garden-sway,3deg))}}@keyframes mq-garden-grow{0%,100%{transform:scale(.05) rotate(-7deg)}30%,70%{transform:scale(1) rotate(2deg)}}@keyframes mq-garden-pulse{from{transform:scale(.97) rotate(-2deg)}to{transform:scale(1.04) rotate(2deg)}}@keyframes mq-garden-flutter{0%,100%{transform:rotate(-4deg) skewX(-1deg)}40%{transform:rotate(3deg) skewX(2deg)}70%{transform:rotate(-1deg)}}@keyframes mq-garden-flight{0%{transform:translate(0,0) rotate(-15deg)}35%{transform:translate(.35em,-.25em) rotate(15deg)}70%{transform:translate(-.25em,.1em) rotate(-8deg)}100%{transform:translate(.15em,-.3em) rotate(12deg)}}@keyframes mq-garden-wing{from{transform:scaleX(1)}to{transform:scaleX(.18)}}@media(prefers-reduced-motion:reduce){.mq-garden *{animation:none!important;transition:none!important}}`;
