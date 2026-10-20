"use client";

import { memo, useEffect, useId, useMemo, useRef, useState } from "react";
import type { CSSProperties, KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import {
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from "motion/react";
import { Layers2 } from "lucide-react";
import {
  buildMatrix,
  generateElevationData,
  LEVEL_LABELS,
} from "./elevation-data";
import type { MatrixCell } from "./elevation-data";
import "./elevation-matrix.css";

export type { ElevationDatum } from "./elevation-data";
export { generateElevationData } from "./elevation-data";
export type ElevationTheme = "emerald" | "violet" | "amber" | "cyan";
export type ElevationPerspective = "iso" | "front" | "wide";
export interface ElevationMatrixProps {
  data?: Array<{ date: string; value: number; meta?: string }>;
  unitLabel?: string;
  defaultView?: "2d" | "3d";
  defaultTheme?: ElevationTheme;
  view?: "2d" | "3d";
  theme?: ElevationTheme;
  perspective?: ElevationPerspective;
  compact?: boolean;
  paused?: boolean;
  className?: string;
}

const THEMES: Record<
  ElevationTheme,
  { label: string; rgb: string; colors: string[] }
> = {
  emerald: {
    label: "Emerald",
    rgb: "52, 211, 153",
    colors: ["#1d2c28", "#185f49", "#209a6a", "#39cf8d", "#a4f4c1"],
  },
  violet: {
    label: "Violet",
    rgb: "167, 139, 250",
    colors: ["#282333", "#51377d", "#7b52bb", "#ac82f4", "#dfc6ff"],
  },
  amber: {
    label: "Amber",
    rgb: "251, 191, 36",
    colors: ["#30291d", "#78531d", "#b57a20", "#f4b53d", "#ffe1a0"],
  },
  cyan: {
    label: "Cyan",
    rgb: "34, 211, 238",
    colors: ["#1c2b30", "#1b5d70", "#228ba7", "#3dc8e5", "#adf1ff"],
  },
};
const CAMERAS = {
  iso: { label: "Isometric", x: 55, z: -38 },
  front: { label: "Tilted front", x: 65, z: -12 },
  wide: { label: "Panoramic", x: 38, z: -22 },
};
const SPRING = { type: "spring" as const, stiffness: 220, damping: 24 };
const SIZE = 11;
const STEP = 15;
const MAX_HEIGHT = 88;
const number = new Intl.NumberFormat("en-US");
const dateFormat = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});
const DEMO_DATA = generateElevationData();

interface TowerProps {
  cell: MatrixCell;
  elevation: number;
  elevated: boolean;
  dimmed: boolean;
  boost: number;
  color: string;
  reduced: boolean;
  tabIndex: number;
  unitLabel: string;
  tooltipId: string | undefined;
}

/** A button and exactly three visible faces; no hidden cube geometry. */
const Tower = memo(function Tower({
  cell,
  elevation,
  elevated,
  dimmed,
  boost,
  color,
  reduced,
  tabIndex,
  unitLabel,
  tooltipId,
}: TowerProps) {
  const height = useMotionValue(elevated ? elevation : 0);
  const roofTransform = useTransform(height, (h) => `translateZ(${h}px)`);
  const frontTransform = useTransform(
    height,
    (h) => `translateY(${SIZE}px) rotateX(90deg) scaleY(${h / MAX_HEIGHT})`,
  );
  const rightTransform = useTransform(
    height,
    (h) =>
      `translateX(${SIZE}px) rotateZ(90deg) rotateX(90deg) scaleY(${h / MAX_HEIGHT})`,
  );
  const previousView = useRef(elevated);

  useEffect(() => {
    const changedView = previousView.current !== elevated;
    previousView.current = elevated;
    const target = elevated ? (dimmed ? 1 : elevation + boost) : 0;
    const control = animate(
      height,
      target,
      reduced
        ? { duration: 0 }
        : {
            ...SPRING,
            delay: changedView ? cell.week * 0.008 + cell.day * 0.004 : 0,
          },
    );
    return () => control.stop();
  }, [
    elevated,
    elevation,
    dimmed,
    boost,
    reduced,
    height,
    cell.week,
    cell.day,
  ]);

  const alpha = dimmed ? 0.15 : 1;
  return (
    <button
      type="button"
      className="em-cell"
      data-index={cell.index}
      tabIndex={tabIndex}
      aria-label={`${dateFormat.format(new Date(`${cell.date}T00:00:00Z`))}: ${number.format(cell.value)} ${unitLabel}, level ${cell.level}, ${LEVEL_LABELS[cell.level]}${cell.meta ? `, ${cell.meta}` : ""}`}
      aria-describedby={tooltipId}
      style={
        {
          left: cell.week * STEP,
          top: cell.day * STEP,
          "--cell-color": color,
        } as CSSProperties
      }
    >
      <motion.span
        className="em-face em-roof"
        style={{ transform: roofTransform }}
        animate={{
          opacity: alpha,
          boxShadow:
            boost > 6 && !dimmed
              ? `0 0 16px ${color}, inset 0 0 0 1px #ffffffb0`
              : "0 0 0px transparent, inset 0 0 0 1px #ffffff12",
        }}
        transition={reduced ? { duration: 0 } : { duration: 0.18 }}
      />
      <motion.span
        className="em-face em-wall em-front"
        style={{ transform: frontTransform }}
        animate={{ opacity: alpha }}
        transition={{ duration: reduced ? 0 : 0.18 }}
      />
      <motion.span
        className="em-face em-wall em-right"
        style={{ transform: rightTransform }}
        animate={{ opacity: alpha }}
        transition={{ duration: reduced ? 0 : 0.18 }}
      />
    </button>
  );
});

export function ElevationMatrix({
  data,
  unitLabel = "contributions",
  defaultView = "3d",
  defaultTheme = "emerald",
  view: controlledView,
  theme: controlledTheme,
  perspective = "iso",
  compact = false,
  paused = false,
  className = "",
}: ElevationMatrixProps) {
  const id = useId();
  const prefersReducedMotion = useReducedMotion();
  const reduced = paused || (prefersReducedMotion ?? false);
  const view = controlledView ?? defaultView;
  const theme = controlledTheme ?? defaultTheme;
  const [hoveredCell, setHoveredCell] = useState<MatrixCell | null>(null);
  const [lockedLevel, setLockedLevel] = useState<number | null>(null);
  const [previewLevel, setPreviewLevel] = useState<number | null>(null);
  const [focusIndex, setFocusIndex] = useState(364);
  const [mounted, setMounted] = useState(false);
  const [stageWidth, setStageWidth] = useState(900);
  const [availableHeight, setAvailableHeight] = useState(600);
  const stage = useRef<HTMLDivElement>(null);
  const pointer = useRef<{ x: number; y: number } | null>(null);
  const matrix = useMemo(() => buildMatrix(data ?? DEMO_DATA), [data]);
  const activeLevel = previewLevel ?? lockedLevel;
  const palette = THEMES[theme];
  const elevated = view === "3d";
  const tooltipX = useMotionValue(0);
  const tooltipY = useMotionValue(0);
  const x = useSpring(tooltipX, { stiffness: 400, damping: 28 });
  const y = useSpring(tooltipY, { stiffness: 400, damping: 28 });

  useEffect(() => {
    setMounted(true);
  }, []);
  useEffect(() => {
    const element = stage.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      setStageWidth(entry.contentRect.width);
      setAvailableHeight(entry.contentRect.height);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    setHoveredCell(null);
    const clear = () => setHoveredCell(null);
    window.addEventListener("scroll", clear, true);
    window.addEventListener("resize", clear);
    return () => {
      window.removeEventListener("scroll", clear, true);
      window.removeEventListener("resize", clear);
    };
  }, [data, view, perspective]);

  const moveTooltip = (clientX: number, clientY: number, snap = false) => {
    const tx = Math.max(8, Math.min(clientX + 18, window.innerWidth - 264));
    const ty = Math.max(8, Math.min(clientY + 20, window.innerHeight - 152));
    if (snap || reduced) {
      x.jump(tx);
      y.jump(ty);
    }
    tooltipX.set(tx);
    tooltipY.set(ty);
  };
  const selectCell = (
    target: EventTarget | null,
    clientX?: number,
    clientY?: number,
  ) => {
    const button =
      target instanceof Element
        ? target.closest<HTMLButtonElement>("button[data-index]")
        : null;
    if (!button) return;
    const cell = matrix.cells[Number(button.dataset.index)];
    if (!cell) return;
    const rect = clientX === undefined ? button.getBoundingClientRect() : null;
    moveTooltip(
      clientX ?? rect!.left + rect!.width / 2,
      clientY ?? rect!.top,
      hoveredCell === null,
    );
    setHoveredCell((current) => (current?.date === cell.date ? current : cell));
  };
  const onCellKey = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      setHoveredCell(null);
      setLockedLevel(null);
      setPreviewLevel(null);
      return;
    }
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>(
      "button[data-index]",
    );
    if (!button) return;
    const offsets: Record<string, number> = {
      ArrowRight: 7,
      ArrowLeft: -7,
      ArrowUp: -1,
      ArrowDown: 1,
      Home: -365,
      End: 365,
    };
    if (!(event.key in offsets)) return;
    event.preventDefault();
    const next = Math.max(
      0,
      Math.min(364, Number(button.dataset.index) + offsets[event.key]),
    );
    setFocusIndex(next);
    stage.current
      ?.querySelector<HTMLButtonElement>(`[data-index="${next}"]`)
      ?.focus({ preventScroll: true });
  };
  // Respect both dimensions of an embedded preview, including raised roofs.
  const preset = CAMERAS[perspective];
  const radians = Math.PI / 180;
  const projectedHeight =
    matrix.weeks *
      STEP *
      Math.abs(Math.sin(preset.z * radians)) *
      Math.cos(preset.x * radians) +
    7 * STEP * Math.cos(preset.z * radians) * Math.cos(preset.x * radians) +
    MAX_HEIGHT * Math.sin(preset.x * radians);
  const scale = Math.min(
    1.12,
    Math.max(0.16, (stageWidth - 60) / (matrix.weeks * STEP + 80)),
    elevated ? Math.max(0.16, (availableHeight - 38) / projectedHeight) : 1.12,
  );
  const tooltipCell =
    !paused && !compact && hoveredCell
      ? matrix.cells.find((c) => c.date === hoveredCell.date)
      : null;

  return (
    <section
      className={`em-root ${className}`}
      data-compact={compact || undefined}
      style={{ "--em-rgb": palette.rgb } as CSSProperties}
      aria-label="Activity elevation matrix"
    >
      <motion.div
        ref={stage}
        className="em-stage"
        transition={reduced ? { duration: 0 } : SPRING}
        onPointerMove={(event) => {
          pointer.current = { x: event.clientX, y: event.clientY };
          moveTooltip(event.clientX, event.clientY);
        }}
        onPointerOver={(event) =>
          selectCell(event.target, event.clientX, event.clientY)
        }
        onPointerLeave={() => {
          pointer.current = null;
          setHoveredCell(null);
        }}
        onFocusCapture={(event) => {
          const button = (
            event.target as HTMLElement
          ).closest<HTMLButtonElement>("button[data-index]");
          if (button) {
            setFocusIndex(Number(button.dataset.index));
            selectCell(button);
          }
        }}
        onBlurCapture={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget))
            setHoveredCell(null);
        }}
        onClick={(event) =>
          selectCell(event.target, pointer.current?.x, pointer.current?.y)
        }
        onKeyDown={onCellKey}
      >
        <motion.div
          className="em-ambience"
          animate={{ opacity: elevated ? 0.6 : 0.12 }}
          transition={{ duration: reduced ? 0 : 0.6 }}
        />
        {matrix.cells.length > 0 ? (
          <div className="em-board-anchor">
            <motion.div
              className="em-board"
              style={{
                width: matrix.weeks * STEP,
                height: 7 * STEP,
                marginLeft: (-matrix.weeks * STEP) / 2,
              }}
              animate={{
                rotateX: elevated ? preset.x : 0,
                rotateZ: elevated ? preset.z : 0,
                scale,
              }}
              transition={reduced ? { duration: 0 } : SPRING}
            >
              <div className="em-ground" />
              {matrix.cells.map((cell) => {
                const distance = hoveredCell
                  ? Math.abs(hoveredCell.week - cell.week) +
                    Math.abs(hoveredCell.day - cell.day)
                  : Infinity;
                return (
                  <Tower
                    key={cell.date}
                    cell={cell}
                    elevation={
                      cell.value ? 6 + (cell.value / matrix.max) * 64 : 2
                    }
                    elevated={elevated}
                    dimmed={activeLevel !== null && cell.level !== activeLevel}
                    boost={
                      elevated
                        ? distance === 0
                          ? 14
                          : distance === 1
                            ? 6
                            : 0
                        : 0
                    }
                    color={palette.colors[cell.level]}
                    reduced={reduced}
                    tabIndex={focusIndex === cell.index ? 0 : -1}
                    unitLabel={unitLabel}
                    tooltipId={
                      tooltipCell?.index === cell.index
                        ? `${id}-tooltip`
                        : undefined
                    }
                  />
                );
              })}
            </motion.div>
          </div>
        ) : (
          <div className="em-empty">
            <Layers2 size={28} />
            <p>No activity yet.</p>
          </div>
        )}
      </motion.div>

      <footer className="em-footer">
        <div
          className="em-legend"
          role="group"
          aria-label="Filter by intensity"
        >
          <span>Less</span>
          {palette.colors.map((color, level) => (
            <button
              type="button"
              key={level}
              aria-label={`Level ${level}: ${LEVEL_LABELS[level]}`}
              aria-pressed={lockedLevel === level}
              onPointerEnter={(e) => {
                if (e.pointerType !== "touch") setPreviewLevel(level);
              }}
              onPointerLeave={() => setPreviewLevel(null)}
              onFocus={() => setPreviewLevel(level)}
              onBlur={() => setPreviewLevel(null)}
              onClick={() => {
                setPreviewLevel(null);
                setLockedLevel((current) => (current === level ? null : level));
              }}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  setPreviewLevel(null);
                  setLockedLevel(null);
                }
              }}
            >
              <span
                style={{
                  background: color,
                  outline:
                    activeLevel === level ? "1px solid white" : undefined,
                }}
              />
            </button>
          ))}
          <span>More</span>
        </div>
      </footer>
      <p className="em-sr-only">
        Use Tab to enter the matrix and arrow keys to explore dates. Home and
        End move to the first and last day. Escape closes the detail and clears
        the intensity filter. Select the active legend level again to clear it.
      </p>

      {mounted &&
        tooltipCell &&
        createPortal(
          <motion.div
            id={`${id}-tooltip`}
            role="tooltip"
            className="em-tooltip"
            style={{ x, y, ...({ "--em-rgb": palette.rgb } as CSSProperties) }}
          >
            <div className="em-tooltip-date">
              {dateFormat.format(new Date(`${tooltipCell.date}T00:00:00Z`))}
            </div>
            <div className="em-tooltip-value">
              {number.format(tooltipCell.value)} <span>{unitLabel}</span>
            </div>
            <div className="em-tooltip-level">
              <span style={{ background: palette.colors[tooltipCell.level] }} />
              Level {tooltipCell.level} · {LEVEL_LABELS[tooltipCell.level]}
            </div>
            {tooltipCell.meta && (
              <div className="em-tooltip-meta">{tooltipCell.meta}</div>
            )}
          </motion.div>,
          document.body,
        )}
    </section>
  );
}

export default ElevationMatrix;
