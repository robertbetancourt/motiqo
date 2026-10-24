"use client";
import { useRef, useState, type PointerEvent } from "react";
import {
  Mark,
  useCollectionScene,
  type CollectionHeroProps,
} from "./collection-runtime";
import s from "./collection.module.css";
const thoughts = [
  { name: "Understand", line: "Connect ideas. Find a clearer answer." },
  { name: "Imagine", line: "Explore unexpected connections." },
  { name: "Create", line: "Turn a thought into a first draft." },
];
export function NoemaHero({
  paused = false,
  brandName = "noema",
  className = "",
}: CollectionHeroProps) {
  const [mode, setMode] = useState(0);
  const { root } = useCollectionScene(paused);
  return (
    <section
      ref={root}
      className={`${s.root} ${s.noema} ${className}`}
      aria-label="Noema intelligence hero"
    >
      <header className={s.nav}>
        <strong className={s.wordmark}>
          <Mark />
          {brandName}
        </strong>
        <nav className={s.noemaNav} aria-label="Explore Noema" style={{"--nav-index":mode} as import("react").CSSProperties}>
          {thoughts.map((item, i) => (
            <button
              key={item.name}
              aria-pressed={mode === i}
              onClick={() => setMode(i)} onFocus={() => setMode(i)}
            >
              {item.name}
            </button>
          ))}
        </nav>
        <button className={s.primary}>
          Try Noema
        </button>
      </header>
      <div className={s.noemaTitle}>
        <h1>
          A mind
          <br />
          of its own.
        </h1>
      </div>
      <div
        className={s.noemaPortrait}
        data-testid="noema-robot"
      >
        <img
          src="/heroes/new/noema.webp"
          alt="Graphite android with silver contours and illuminated eyes"
        />
      </div>
      <div className={s.noemaBottom}>
        <p aria-live="polite">Intelligence, with a point of view.</p>
        <button className={s.secondary} >
          Explore Noema
        </button>
      </div>
    </section>
  );
}
const realms = [
  {
    name: "Skyward Isles",
    title: (
      <>
        Explore beyond
        <br />
        the ordinary.
      </>
    ),
    image: "aevora.webp",
    detail: "Floating islands. A different view of the world.",
  },
  {
    name: "Quiet Valley",
    title: (
      <>
        Take a path
        <br />
        less traveled.
      </>
    ),
    image: "study-9.webp",
    detail: "An open valley, waiting to be explored.",
  },
  {
    name: "Amber Passage",
    title: (
      <>
        Follow the light.
        <br />
        Find your way.
      </>
    ),
    image: "study-21.webp",
    detail: "Discover the hidden routes through the canyon.",
  },
];
export function AevoraHero({
  paused = false,
  brandName = "AEVORA",
  className = "",
}: CollectionHeroProps) {
  const [active, setActive] = useState(0),
    pointer = useRef({ x: 0, y: 0 }),
    smooth = useRef({ x: 0, y: 0 });
  const { root, invalidate } = useCollectionScene(
    paused,
    ({ dt, still }, node) => {
      const target = still ? { x: 0, y: 0 } : pointer.current,
        k = still ? 1 : 1 - Math.exp(-dt * 5);
      smooth.current.x += (target.x - smooth.current.x) * k;
      smooth.current.y += (target.y - smooth.current.y) * k;
      node.style.setProperty("--parallax-x", `${smooth.current.x}px`);
      node.style.setProperty("--parallax-y", `${smooth.current.y}px`);
    },
  );
  function move(e: PointerEvent<HTMLElement>) {
    if (e.pointerType === "touch") return;
    const b = e.currentTarget.getBoundingClientRect();
    pointer.current = {
      x: ((e.clientX - b.left) / b.width - 0.5) * 24,
      y: ((e.clientY - b.top) / b.height - 0.5) * 18,
    };
    invalidate();
  }
  const realm = realms[0];
  return (
    <section
      ref={root}
      className={`${s.root} ${s.aevora} ${className}`}
      aria-label="Aevora exploration hero"
      onPointerMove={move}
      onPointerLeave={() => {
        pointer.current = { x: 0, y: 0 };
        invalidate();
      }}
    >
      <div className={s.realmArt}>
        {realms.map((item, i) => (
          <img
            key={item.image}
            src={`/heroes/new/${item.image}`}
            alt={i === 0 ? item.detail : ""}
            aria-hidden={i !== 0}
            className={i === 0 ? s.realmVisible : ""}
          />
        ))}
      </div>
      <img
        className={s.realmCloudBack}
        src="/heroes/new/aevora-clouds.png"
        alt=""
        aria-hidden="true"
      />
      <div className={s.realmScrim} />
      <img
        className={s.realmCloudFront}
        src="/heroes/new/aevora-clouds.png"
        alt=""
        aria-hidden="true"
      />
      <header className={s.nav}>
        <strong className={s.realmLogo}>
          <Mark kind="star" />
          {brandName}
        </strong>
        <nav aria-label="Aevora navigation">{["Discover", "The isles", "Our world"].map((label, i) => <button key={label} aria-pressed={active === i} onClick={() => setActive(i)}>{label}</button>)}</nav>
        
      </header>
      <div className={s.realmCopy}>
        <h1>{realm.title}</h1>
        <p aria-live="polite">{realm.detail}</p>
        <button
          className={s.primary}
          
        >
          Explore the isles
        </button>
      </div>

    </section>
  );
}

