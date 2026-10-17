"use client";
import { motion } from "motion/react";
import type { CSSProperties } from "react";
import {
  botanicalPlan,
  Rose,
  type GardenArrangement,
  type GardenColors,
  type GardenFlower,
  type GardenLetter,
} from "./garden-botany";

function Blossom({
  x,
  y,
  size,
  rotation,
  colors,
  seed,
  still,
  species,
  bud,
}: {
  x: number;
  y: number;
  size: number;
  rotation: number;
  colors: GardenColors;
  seed: number;
  still: boolean;
  species: Exclude<GardenFlower, "mixed">;
  bud: boolean;
}) {
  if (species === "rose" && !bud)
    return <Rose {...{ x, y, size, rotation, colors, seed, still }} />;
  return (
    <g transform={`translate(${x} ${y}) rotate(${rotation}) scale(${size})`}>
      <motion.g
        initial={still ? false : { scale: 0, rotate: -25 }}
        animate={{ scale: 1, rotate: 0 }}
        exit={{ scale: 0 }}
        transition={{
          type: "spring",
          stiffness: 220,
          damping: 14,
          delay: still ? 0 : 0.16 + (seed % 7) * 0.035,
        }}
      >
        <path d="m-7 10-12 9 13-3 6 8 5-9 14 3-12-9" fill={colors.foliage} />
        {bud ? (
          <>
            <path
              d="M0 15C-18 2-12-20-1-24C12-22 18 0 0 15Z"
              fill={colors.flowers}
              stroke={colors.flowerStrokes}
              strokeWidth="1.2"
            />
            <path
              d="M-2-20C8-6-6 0 0 15M-11-9C-3-5 1-7 8-12"
              fill="none"
              stroke={colors.flowerStrokes}
            />
            <path d="m-10 4 10 11 10-10-4 17-6-3-6 4Z" fill={colors.foliage} />
          </>
        ) : species === "tulip" ? (
          <>
            <path
              d="M-22-22C-26 10-13 24 0 23C18 25 28 5 22-23L9-13 0-29-10-13Z"
              fill={colors.flowers}
              stroke={colors.flowerStrokes}
              strokeWidth="1.1"
            />
            <path
              d="M-22-22C-7-7-10 9 0 23M22-23C10-6 11 12 0 23M0-29C-4-9 7 8 0 23"
              fill="none"
              stroke={colors.flowerStrokes}
              strokeWidth="1.1"
            />
          </>
        ) : species === "poppy" ? (
          <>
            {[0, 1, 2, 3, 4].map((i) => (
              <g key={i} transform={`rotate(${i * 72 + (seed % 27)})`}>
                <path
                  d="M0 5C-18 2-28-10-20-22C-18-30-5-25 0-27C13-30 25-21 20-10C17-2 8 3 0 5Z"
                  fill={colors.flowers}
                  stroke={colors.flowerStrokes}
                  strokeWidth=".9"
                />
                <path
                  d="M0 3-12-19M1 1 10-19M-2-2-2-22"
                  stroke={colors.flowerStrokes}
                  strokeOpacity=".45"
                  fill="none"
                  strokeWidth=".6"
                />
              </g>
            ))}
            <path
              d="M-7-2-4-8 3-7 8-2 5 6-3 8-8 3Z"
              fill={colors.flowerStrokes}
            />
            {Array.from({ length: 11 }, (_, i) => (
              <path
                key={i}
                d="M0-6v-6m-2 0h4"
                transform={`rotate(${i * 32.7})`}
                stroke={colors.flowerStrokes}
                fill="none"
                strokeWidth="1"
              />
            ))}
          </>
        ) : (
          <>
            {Array.from({ length: 8 }, (_, i) => (
              <g key={i} transform={`rotate(${i * 45 + (seed % 22)})`}>
                <path
                  d="M-2 5C-12-3-17-21-9-29L-4-27 0-31 5-27 10-29C18-19 11-2 2 5Z"
                  fill={colors.flowers}
                  stroke={colors.flowerStrokes}
                  strokeWidth=".85"
                />
                <path
                  d="M0-5v-20M-4-23-1-7 5-23"
                  stroke={colors.flowerStrokes}
                  strokeWidth=".5"
                  strokeOpacity=".5"
                  fill="none"
                />
              </g>
            ))}
            <ellipse rx="6" ry="5" fill={colors.flowerStrokes} />
            {Array.from({ length: 9 }, (_, i) => (
              <path
                key={i}
                d="M0-2v-2"
                transform={`rotate(${i * 40})`}
                stroke={colors.flowers}
                strokeWidth=".8"
              />
            ))}
          </>
        )}
      </motion.g>
    </g>
  );
}

export function BotanicalLayer({
  letter,
  front,
  colors,
  density,
  still,
  flowerType = "rose",
  arrangement = "wild",
}: {
  letter: GardenLetter;
  front: boolean;
  colors: GardenColors;
  density: number;
  still: boolean;
  flowerType?: GardenFlower;
  arrangement?: GardenArrangement;
}) {
  const plan = botanicalPlan(letter.seed, density, arrangement);
  return (
    <svg
      className={`mq-garden-botany ${front ? "mq-garden-front" : "mq-garden-back"}`}
      viewBox="0 0 80 110"
      aria-hidden="true"
      style={{ overflow: "visible" }}
    >
      {plan.map((p, i) => {
        const seed = letter.seed + i * 37;
        const point = (t: number) => {
          const a = 1 - t;
          return [
            a * a * a * p.baseX +
              3 * a * a * t * p.c1[0] +
              3 * a * t * t * p.c2[0] +
              t * t * t * p.x,
            a * a * a * p.baseY +
              3 * a * a * t * p.c1[1] +
              3 * a * t * t * p.c2[1] +
              t * t * t * p.y,
          ];
        };
        const species =
          flowerType === "mixed"
            ? (["rose", "cosmos", "poppy", "tulip"] as const)[p.species]
            : flowerType;
        return (
          <g
            key={`${i}-${flowerType}-${arrangement}`}
            className="mq-garden-sway"
            style={
              {
                transformOrigin: `${p.baseX}px ${p.baseY}px`,
                animationDelay: `-${(seed % 51) / 7}s`,
                animationDuration: `${p.duration}s`,
                "--garden-sway": `${p.sway}deg`,
              } as CSSProperties
            }
          >
            {!front && (
              <>
                <motion.path
                  d={`M${p.baseX} ${p.baseY}C${p.c1} ${p.c2} ${p.x} ${p.y}`}
                  stroke={colors.foliage}
                  strokeWidth={i ? 1.15 : 1.7}
                  fill="none"
                  initial={still ? false : { pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{
                    duration: still ? 0 : 0.65,
                    delay: still ? 0 : p.delay,
                    ease: "easeOut",
                  }}
                />
                {Array.from({ length: p.leaves }, (_, j) => {
                  const t = 0.22 + j * 0.17,
                    [x, y] = point(t),
                    [nx, ny] = point(Math.min(1, t + 0.04));
                  const rotation =
                    (Math.atan2(ny - y, nx - x) * 180) / Math.PI +
                    90 +
                    (j % 2 ? 105 : -15);
                  return (
                    <g
                      key={j}
                      transform={`translate(${x} ${y}) rotate(${rotation}) scale(${0.6 + ((seed + j * 13) % 7) * 0.045})`}
                    >
                      <motion.g
                        initial={still ? false : { scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{
                          type: "spring",
                          stiffness: 220,
                          damping: 14,
                          delay: still ? 0 : p.delay + 0.12 + j * 0.06,
                        }}
                      >
                        <path
                          d={
                            j % 2
                              ? "M0 0C-21-5-29-19-32-32C-12-31 5-19 0 0Z"
                              : "M0 0C-6-13-3-29 5-39C13-25 12-7 0 0Z"
                          }
                          fill={colors.foliage}
                        />
                        <path
                          d={
                            j % 2
                              ? "M0 0-27-27M-7-8-19-12"
                              : "M0 0 5-33M2-10 8-20"
                          }
                          fill="none"
                          stroke={colors.text}
                          strokeOpacity=".2"
                          strokeWidth=".55"
                        />
                      </motion.g>
                    </g>
                  );
                })}
              </>
            )}
            {p.front === front && (
              <Blossom
                {...{
                  x: p.x,
                  y: p.y,
                  size: p.size,
                  rotation: p.rotation,
                  colors,
                  seed,
                  still,
                  species,
                  bud: p.bud,
                }}
              />
            )}
            {front && i === 0 && (
              <motion.path
                d={`M${p.baseX - 12} ${p.baseY + 10}C${p.baseX - 45} ${p.baseY - 5} ${p.x + 42} ${p.y + 20} ${p.x + 15} ${p.y + 12}q${p.curl} -18 ${p.curl - 4} 1t-8 2`}
                fill="none"
                stroke={colors.foliage}
                strokeWidth=".85"
                initial={still ? false : { pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{
                  duration: still ? 0 : 0.9,
                  delay: still ? 0 : p.delay + 0.1,
                }}
              />
            )}
          </g>
        );
      })}
    </svg>
  );
}
