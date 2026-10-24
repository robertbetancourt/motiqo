"use client";
import { useEffect, useId, useRef, useState, type PointerEvent } from "react";

import HyperbolicRibbon from "../originals/hyperbolic-ribbon";
import {
  Mark,
  useCollectionScene,
  type CollectionHeroProps,
} from "./collection-runtime";
import s from "./collection.module.css";
const directions = [
  { name: "Botanical", image: "study-20.webp", banner: "study-11.webp" },
  { name: "Liquid", image: "study-22.webp", banner: "study-22.webp" },
  { name: "Otherworldly", image: "study-8.webp", banner: "study-19.webp" },
];
function point(r: number, a: number) {
  return `${200 + r * Math.cos(a)},${200 + r * Math.sin(a)}`;
}
/** Fillets on all four corners give each cutout a rounded petal silhouette. */
export function petal(index: number) {
  const a = (index * Math.PI) / 6 - Math.PI / 2 + 0.035,
    b = a + Math.PI / 6 - 0.07;
  return `M${point(83, a)} L${point(174, a)} Q${point(188, a)} ${point(188, a + 0.065)} A188 188 0 0 1 ${point(188, b - 0.065)} Q${point(188, b)} ${point(174, b)} L${point(83, b)} Q${point(71, b)} ${point(71, b - 0.12)} A71 71 0 0 0 ${point(71, a + 0.12)} Q${point(71, a)} ${point(83, a)} Z`;
}
export function FlorraHero({
  paused = false,
  brandName = "florra",
  className = "",
}: CollectionHeroProps) {
  const [active, setActive] = useState(0),
    { root } = useCollectionScene(paused),
    uid = useId().replace(/:/g, ""),
    direction = directions[0];
  return (
    <section
      ref={root}
      className={`${s.root} ${s.florra} ${className}`}
      aria-label="Florra creative studio hero"
    >
      <header className={s.nav}>
        <strong className={s.wordmark}>
          <Mark kind="star" />
          {brandName}
        </strong>
        <nav aria-label="Florra navigation">{["Product", "Solutions", "Resources"].map((label,i)=><button key={label} onClick={()=>setActive(i)} aria-pressed={active===i}>{label}</button>)}</nav>
        <button className={s.primary}>Start creating</button>
      </header>
      <div className={s.florraHeading}>
        <h1>
          Make room
          <br />
          for new ideas.
        </h1>

      </div>
      <div className={s.florraWork}>
        <div className={s.florraOutput}>
          <span>Preview</span>
          <img
            src={`/heroes/new/${direction.image}`}
            alt={`${direction.name} image preview`}
          />
        </div>
        <div className={s.florraWheel}>
          <img
            className={s.wheelPreload}
            src={`/heroes/new/${direction.image}`}
            alt=""
          />
          <svg
            viewBox="0 0 400 400"
            role="img"
            aria-label={`${direction.name}, twelve rounded photographic petals`}
          >
            <defs>
              {Array.from({ length: 12 }, (_, i) => (
                <clipPath key={i} id={`${uid}-petal-${i}`}>
                  <path d={petal(i)} />
                </clipPath>
              ))}
            </defs>
            <g>
              {Array.from({ length: 12 }, (_, i) => (
                <image
                  key={i}
                  href={`/heroes/new/study-${[20,9,11,6,20,9,11,6,20,9,11,6][i]}.webp`}
                  width="400"
                  height="400"
                  preserveAspectRatio="xMidYMid slice"
                  clipPath={`url(#${uid}-petal-${i})`}
                />
              ))}
            </g>
          </svg>
          <span className={s.wheelCenter} aria-hidden="true"><Mark kind="star" /></span>
        </div>
      </div>
      <div className={s.florraBanner}>
        <img src={`/heroes/new/${direction.banner}`} alt="" />
        <span className={s.collectionLabel} aria-live="polite">
          {direction.name} collection
        </span>
      </div>
    </section>
  );
}
type Card = { image: string; name: string };
const products: Card[] = [
  "The everyday ritual",
  "A fresh start",
  "Slow mornings",
  "A sound of your own",
  "Room to grow",
  "The little details",
  "Fresh thinking",
  "Something to savor",
  "Tune into yourself",
  "A natural kind of good",
].map((name, i) => ({ image: `product-${(i % 5) + 1}.webp`, name }));
export function carouselGeometry(
  index: number,
  offset: number,
  count: number,
  width: number,
) {
  const pitch = 220 * Math.max(1, width / 1440),
    total = count * pitch,
    t =
      ((((index * pitch - offset + total / 2) % total) + total) % total) -
      total / 2,
    d = Math.min(Math.abs(t) / 620, 1.4);
  return {
    x: width / 2 + t * (1 + 0.065 * d * d),
    y: width < 600 ? 180 : 220,
    width: 200 + d * d * 8,
    height: (width < 600 ? 270 : 340) + d * d * 12,
    angle: (t / 620) * -2,
  };
}
function StoryCarousel({
  paused,
  request,
}: {
  paused: boolean;
  request: number;
}) {
  const [selected, setSelected] = useState<number | null>(null),
    items = useRef<(HTMLButtonElement | null)[]>([]),
    band = useRef<HTMLDivElement>(null),
    movement = useRef({
      offset: 0,
      velocity: 0,
      down: false,
      x: 0,
      start: 0,
      moved: false,
      last: 0,
      keyboard: false,
      hover: false,
    });
  const { root, invalidate } = useCollectionScene(
    paused,
    ({ dt, still }, host) => {
      const m = movement.current;
      if (!m.down && !m.keyboard && !still) {
        m.offset += (m.hover ? 0 : 26 * dt) + m.velocity * dt;
        m.velocity *= Math.exp(-dt * 4);
      }
      items.current.forEach((node, i) => {
        if (!node) return;
        const g = carouselGeometry(
            i,
            m.offset,
            products.length,
            host.clientWidth,
          ),
          shown = g.x > -160 && g.x < host.clientWidth + 160;
        node.style.width = `${g.width}px`;
        node.style.height = `${g.height}px`;
        node.style.transform = `translate3d(${g.x - g.width / 2}px,${g.y - g.height / 2}px,0) rotate(${g.angle}deg)`;
        node.style.visibility = shown ? "visible" : "hidden";
        node.tabIndex = shown ? 0 : -1;
        node.setAttribute("aria-hidden", String(!shown));
      });
    },
  );
  function step(value: number) {
    movement.current.offset += value * 176;
    movement.current.velocity = 0;
    setSelected(
      (current) =>
        ((current ?? (value > 0 ? -1 : 0)) + value + products.length) %
        products.length,
    );
    invalidate();
  }
  const previous = useRef(request);
  useEffect(() => {
    if (previous.current !== request) {
      previous.current = request;
      step(1);
    }
  }, [request]);
  function start(e: PointerEvent<HTMLDivElement>) {
    if (e.button !== 0) return;
    const m = movement.current;
    m.down = true;
    m.keyboard = false;
    m.x = m.start = e.clientX;
    m.last = e.timeStamp;
    m.moved = false;
    m.velocity = 0;
  }
  function move(e: PointerEvent<HTMLDivElement>) {
    const m = movement.current;
    if (!m.down) return;
    const delta = e.clientX - m.x;
    m.offset -= delta;
    m.velocity = (-delta / Math.max(8, e.timeStamp - m.last)) * 1000;
    m.x = e.clientX;
    m.last = e.timeStamp;
    if (Math.abs(e.clientX - m.start) > 6) {
      m.moved = true;
      band.current?.setPointerCapture(e.pointerId);
    }
    invalidate();
  }
  function end() {
    movement.current.down = false;
    invalidate();
  }
  return (
    <section
      ref={root}
      className={s.carousel}
      aria-label="Product story carousel"
    >
      <div
        ref={band}
        className={s.cardBand}
        data-testid="story-band"
        onPointerEnter={() => {
          movement.current.hover = true;
        }}
        onPointerLeave={() => {
          movement.current.hover = false;
          invalidate();
        }}
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={end}
        onPointerCancel={end}
        onLostPointerCapture={end}
        onKeyDownCapture={() => {
          movement.current.keyboard = true;
        }}
        onFocusCapture={(e) => {
          if ((e.target as HTMLElement).matches(":focus-visible"))
            movement.current.keyboard = true;
        }}
        onBlurCapture={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node)) {
            movement.current.keyboard = false;
            invalidate();
          }
        }}
        onClickCapture={(e) => {
          if (movement.current.moved) {
            e.preventDefault();
            e.stopPropagation();
            movement.current.moved = false;
          }
        }}
      >
        {products.map((card, i) => (
          <button
            key={i}
            ref={(node) => {
              items.current[i] = node;
            }}
            className={s.storyCard}
            aria-label={`Select ${card.name}`}
            aria-pressed={selected === i}
            onClick={() => {
              setSelected(i);
              movement.current.offset = i * 176;
              movement.current.velocity = 0;
              invalidate();
            }}
          >
            <img
              src={`/heroes/new/${card.image}`}
              alt={card.name}
              draggable={false}
            />
          </button>
        ))}
      </div>

    </section>
  );
}
export function SprigHero({
  paused = false,
  brandName = "sprig",
  className = "",
}: CollectionHeroProps) {
  const [audience, setAudience] = useState(0), { root } = useCollectionScene(true);
  return (
    <section
      ref={root}
      className={`${s.root} ${s.sprig} ${className}`}
      aria-label="Sprig creator marketplace hero"
    >
      <header className={s.nav}>
        <strong className={s.wordmark}>
          <Mark kind="leaf" />
          {brandName}
        </strong>
        <nav aria-label="Sprig audience">
          {["Platform", "Creators", "About"].map((label, i) => (
            <button
              key={label}
              aria-pressed={audience === i}
              onClick={() => setAudience(i)}
            >
              {label}
            </button>
          ))}
        </nav>
        <button className={s.secondary}>
          Get started
        </button>
      </header>
      <div className={s.sprigCopy}>
        <h1>
          Good things.<br />In motion.
        </h1>
        <button className={s.primary}>
          Meet your next creator
        </button>
      </div>
      <div className={s.sprigCarousel}>
        <StoryCarousel paused={paused} request={0} />
      </div>
    </section>
  );
}
const views = [
  { name: "Landscapes", images: [21, 6, 9, 5, 10] },
  { name: "After dark", images: [16, 19, 8, 22, 5] },
  { name: "Dreamscapes", images: [20, 8, 11, 19, 16] },
];
export function SwayHero({
  paused = false,
  brandName = "sway",
  className = "",
}: CollectionHeroProps) {
  const [category, setCategory] = useState(0), view = views[0],
    items = view.images.map((image,i) => ({src:`/heroes/new/study-${image}.webp`,title:`Visual study ${i+1}`}));
  return (
    <section
      className={`${s.root} ${s.sway} ${className}`}
      aria-label="Sway travel stories hero"
    >
      <header className={s.nav}>
        <strong className={s.wordmark}>
          <Mark kind="sway" />
          {brandName}
        </strong>
        <nav aria-label="Sway navigation">{["Work", "Studio", "Contact"].map((label,i)=><button key={label} aria-pressed={category===i} onClick={()=>setCategory(i)}>{label}</button>)}</nav>
        <button className={s.primary}>Let's talk</button>
      </header>
      <div className={s.swayCopy}><h1>Ideas off<br />the grid.</h1><span className={s.swayStamp} aria-hidden="true">↗</span></div>
      <div className={s.swayRibbon}>
        <HyperbolicRibbon
          items={items}
          paused={paused}
          mode="drag"
          autoPlay
          stepInterval={3200}
          pinchScale={0.82}
          angleDeg={-8}
          gap={0.1}
          backgroundColor="#090909"
        />
      </div>
    </section>
  );
}
