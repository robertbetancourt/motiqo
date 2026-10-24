"use client";
import { useState } from "react";
import LiquidArtifact from "../ui/liquid-artifact";
import styles from "./aster.module.css";
export type AsterHeroProps = {
  paused?: boolean;
  brandName?: string;
  className?: string;
};
export default function AsterHero({
  paused = false,
  brandName = "Aster",
  className = "",
}: AsterHeroProps) {
  const [energized, setEnergized] = useState(false), [menuActive, setMenuActive] = useState(false);
  return (
    <section
      className={`${styles.hero} ${className}`}
      aria-label="Aster space observatory" data-paused={paused}
    >
      <div className={styles.stars} aria-hidden="true">{Array.from({length:38},(_,i)=><i key={i} style={{left:`${(i*37+11)%100}%`,top:`${(i*23+7)%100}%`,opacity:.12+(i%4)*.07}} />)}</div>
      <div className={styles.orbit} aria-hidden="true">
        <i />
        <i />
        <i />
      </div>
      <div className={styles.field}>
        <LiquidArtifact
          defaultTheme="dark"
          defaultShape={2}
          particleDensity="medium"
          vortexSpeed={energized ? 22 : 12}
          paused={paused}
          className={styles.artifact}
        />
      </div>
      <header className={styles.nav}>
        <strong>
          <svg
            width="27"
            height="27"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M12 2v20M2 12h20M5 5l14 14M19 5 5 19"
              stroke="currentColor"
              strokeWidth="1.2"
            />
            <circle
              cx="12"
              cy="12"
              r="4"
              fill="#08080a"
              stroke="currentColor"
            />
          </svg>
          {brandName}
        </strong>

        <button className={styles.menu} aria-label="Menu" aria-pressed={menuActive} onClick={()=>setMenuActive(!menuActive)}><i/><i/></button>
      </header>
      <div className={styles.copy}>
        <h1>Explore the unknown.</h1>
      </div>
      <div className={styles.action}>
        <button onClick={() => setEnergized(!energized)} aria-pressed={energized}>
          Begin observation
        </button>
      </div>
      <div className={styles.scrollCue} aria-hidden="true"><span /></div>
    </section>
  );
}
