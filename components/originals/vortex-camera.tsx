"use client";

import { useEffect, useId, useRef, useState } from "react";
import * as THREE from "three";
import {
  clampProgress,
  getCameraLens,
  getCameraLookAt,
  getCameraPosition,
  smoothstep,
} from "./vortex-camera-path";
import {
  createVortexScene,
  DEFAULT_VORTEX_IMAGES,
} from "./vortex-camera-scene";
import "./vortex-camera.css";

export interface VortexCameraProps {
  images?: string[];
  autoFlight?: boolean;
  sensitivity?: number;
  smoothing?: number;
  darkness?: number;
  particleColor?: string;
  showHUD?: boolean;
  progress?: number;
  paused?: boolean;
  compact?: boolean;
  className?: string;
}

const STAGES = [
  {
    from: 0.02,
    to: 0.22,
    title: "ORBITAL HORIZON",
    detail: "Counter-rotating spatial gallery",
    position: "top",
  },
  {
    from: 0.26,
    to: 0.46,
    title: "THE CAMERA LEADS",
    detail: "Sweeping the zenith aperture",
    position: "center",
  },
  {
    from: 0.52,
    to: 0.76,
    title: "INSIDE THE AXIS",
    detail: "Grazing the inner curvature at warp FOV",
    position: "center",
  },
  {
    from: 0.82,
    to: 0.98,
    title: "BEYOND THE VORTEX",
    detail: "Emergence on the opposite vector",
    position: "bottom",
  },
] as const;

type Command =
  | { kind: "seek"; value: number }
  | { kind: "step"; value: number }
  | { kind: "restart" };
type Status = "loading" | "ready" | "image-error" | "unavailable";

export function VortexCamera({
  images = DEFAULT_VORTEX_IMAGES,
  autoFlight = true,
  sensitivity = 0.0009,
  smoothing = 0.075,
  darkness = 0.22,
  particleColor = "#38BDF8",
  showHUD = true,
  progress: requestedProgress,
  paused = false,
  compact = false,
  className = "",
}: VortexCameraProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const mountRef = useRef<HTMLDivElement>(null);
  const hudRef = useRef<HTMLDivElement>(null);
  const commandRef = useRef<((command: Command) => void) | null>(null);
  const optionsRef = useRef({
    autoFlight,
    sensitivity,
    smoothing,
    paused,
    darkness,
    particleColor,
  });
  const syncRef = useRef<(() => void) | null>(null);
  const [status, setStatus] = useState<Status>("loading");
  const [retry, setRetry] = useState(0);
  const helpId = useId();

  useEffect(() => {
    optionsRef.current = {
      autoFlight,
      paused,
      darkness: Number.isFinite(darkness)
        ? THREE.MathUtils.clamp(darkness, 0, 1)
        : 0.22,
      particleColor,
      sensitivity: Number.isFinite(sensitivity)
        ? Math.max(0, sensitivity)
        : 0.0009,
      smoothing: Number.isFinite(smoothing)
        ? THREE.MathUtils.clamp(smoothing, 0.001, 1)
        : 0.075,
    };
  }, [autoFlight, paused, sensitivity, smoothing, darkness, particleColor]);
  useEffect(() => {
    syncRef.current?.();
  }, [paused, autoFlight, darkness, particleColor, showHUD]);
  useEffect(() => {
    if (
      typeof requestedProgress === "number" &&
      Number.isFinite(requestedProgress)
    )
      commandRef.current?.({ kind: "seek", value: requestedProgress });
  }, [requestedProgress]);

  useEffect(() => {
    const root = rootRef.current!;
    const mount = mountRef.current!;
    let renderer: THREE.WebGLRenderer;
    setStatus("loading");
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        powerPreference: "high-performance",
      });
    } catch {
      setStatus("unavailable");
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor("#05060a");
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.domElement.setAttribute("aria-hidden", "true");
    mount.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(44, 1, 0.025, 100);
    const safeDarkness = Number.isFinite(darkness)
      ? THREE.MathUtils.clamp(darkness, 0, 1)
      : 0.22;
    const vortex = createVortexScene(
      scene,
      images,
      safeDarkness,
      particleColor,
      (failed) => {
        setStatus(failed ? "image-error" : "ready");
        root.dataset.ready = "true";
        start();
      },
    );

    let active = true;
    let frame = 0;
    let visible = true;
    let contextLost = false;
    let width = 1;
    let height = 1;
    let progress = clampProgress(
      Number.isFinite(requestedProgress) ? requestedProgress! : 0,
    );
    let target = progress;
    let lastRotation = 0;
    let lastTime = performance.now();
    let lastInteraction = lastTime;
    let endSince = 0;
    let autoDirection = 1;
    let pointerId: number | null = null;
    let dragY = 0;
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    let reducedMotion = motionQuery.matches;
    const pointer = new THREE.Vector2();
    const smoothedPointer = new THREE.Vector2();
    const direction = new THREE.Vector3();
    const lookAt = new THREE.Vector3();
    const right = new THREE.Vector3(1, 0, 0);
    const baseUp = new THREE.Vector3(0, 1, 0);
    const idealUp = new THREE.Vector3();
    const worldUp = new THREE.Vector3(0, 1, 0);

    function interact() {
      lastInteraction = performance.now();
      endSince = 0;
      autoDirection = 1;
      start();
    }
    commandRef.current = (command) => {
      interact();
      if (command.kind === "seek") target = clampProgress(command.value);
      if (command.kind === "step")
        target = clampProgress(target + command.value);
      if (command.kind === "restart") target = 0;
    };
    function resize() {
      const rect = mount.getBoundingClientRect();
      width = Math.max(rect.width, 1);
      height = Math.max(rect.height, 1);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setSize(width, height, false);
    }
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(mount);
    resize();

    function onWheel(event: WheelEvent) {
      if (
        event.ctrlKey ||
        (event.target instanceof Element &&
          event.target.closest("button,input,a"))
      )
        return;
      const delta =
        event.deltaY *
        (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? height : 1);
      const next = clampProgress(
        target + delta * optionsRef.current.sensitivity,
      );
      // Let the page scroll naturally once the flight reaches either boundary.
      if (next !== target) event.preventDefault();
      target = next;
      interact();
    }
    function updatePointer(event: PointerEvent) {
      const rect = mount.getBoundingClientRect();
      pointer.set(
        THREE.MathUtils.clamp(
          ((event.clientX - rect.left) / width) * 2 - 1,
          -1,
          1,
        ),
        THREE.MathUtils.clamp(
          1 - ((event.clientY - rect.top) / height) * 2,
          -1,
          1,
        ),
      );
    }
    function onPointerDown(event: PointerEvent) {
      if (
        !event.isPrimary ||
        event.button !== 0 ||
        (event.target as Element).closest("button,input,a")
      )
        return;
      pointerId = event.pointerId;
      dragY = event.clientY;
      root.setPointerCapture(pointerId);
      root.dataset.dragging = "true";
      root.focus({ preventScroll: true });
      interact();
    }
    function onPointerMove(event: PointerEvent) {
      if (event.pointerType !== "touch") updatePointer(event);
      if (pointerId !== event.pointerId) return;
      target = clampProgress(
        target +
          (dragY - event.clientY) * optionsRef.current.sensitivity * 1.65,
      );
      dragY = event.clientY;
      interact();
    }
    function onPointerEnd(event: PointerEvent) {
      if (pointerId !== event.pointerId) return;
      if (root.hasPointerCapture(pointerId))
        root.releasePointerCapture(pointerId);
      pointerId = null;
      root.dataset.dragging = "false";
      interact();
    }
    function onPointerLeave() {
      pointer.set(0, 0);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (
        event.target !== root ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey
      )
        return;
      const steps: Record<string, number> = {
        ArrowDown: 0.035,
        ArrowRight: 0.035,
        ArrowUp: -0.035,
        ArrowLeft: -0.035,
        PageDown: 0.15,
        PageUp: -0.15,
      };
      if (event.key in steps) {
        event.preventDefault();
        commandRef.current?.({ kind: "step", value: steps[event.key] });
      }
      if (event.key === "Home" || event.key === "End") {
        event.preventDefault();
        commandRef.current?.({
          kind: "seek",
          value: event.key === "Home" ? 0 : 1,
        });
      }
    }
    function onMotionChange(event: MediaQueryListEvent) {
      reducedMotion = event.matches;
      pointer.set(0, 0);
      interact();
    }
    function stop() {
      cancelAnimationFrame(frame);
      frame = 0;
    }
    function start() {
      if (!active || frame || !visible || document.hidden || contextLost)
        return;
      lastTime = performance.now();
      frame = requestAnimationFrame(animate);
    }
    function onVisibilityChange() {
      if (document.hidden) stop();
      else {
        interact();
        start();
      }
    }
    function onContextLost(event: Event) {
      event.preventDefault();
      contextLost = true;
      stop();
      setStatus("unavailable");
    }
    function onContextRestored() {
      contextLost = false;
      setRetry((value) => value + 1);
    }
    const intersectionObserver = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) start();
      else stop();
    });
    intersectionObserver.observe(root);

    function animate(now: number) {
      frame = 0;
      if (!active || !visible || document.hidden || contextLost) return;
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;
      const opts = optionsRef.current;
      const automatic =
        !opts.paused &&
        opts.autoFlight &&
        !reducedMotion &&
        pointerId === null &&
        now - lastInteraction >= 2500;
      if (automatic) {
        // Ping-pong on the same path, with a hold at the ends; never teleport.
        if (
          (target >= 1 && autoDirection > 0) ||
          (target <= 0 && autoDirection < 0)
        ) {
          if (!endSince) endSince = now;
          if (now - endSince > 1800) {
            autoDirection *= -1;
            endSince = 0;
          }
        }
        if (!endSince) {
          const organicSpeed =
            0.022 + 0.024 * Math.sin(progress * Math.PI) ** 2;
          target = clampProgress(target + dt * organicSpeed * autoDirection);
        }
      }
      progress +=
        (target - progress) *
        (reducedMotion || opts.paused
          ? 1
          : 1 - (1 - opts.smoothing) ** (dt * 60));
      const rotation = progress * Math.PI * 2 * 4.5;
      const velocity = rotation - lastRotation;
      lastRotation = rotation;
      smoothedPointer.lerp(
        reducedMotion ? pointer.set(0, 0) : pointer,
        1 - Math.exp(-dt * 5),
      );
      getCameraPosition(progress, camera.position);
      getCameraLookAt(progress, lookAt);
      direction.subVectors(lookAt, camera.position).normalize();
      // Parallel-transport the up vector through the near-vertical dive.
      // Projecting it avoids a horizon flip when forward crosses the Y axis.
      baseUp.addScaledVector(direction, -baseUp.dot(direction)).normalize();
      idealUp.copy(worldUp).addScaledVector(direction, -worldUp.dot(direction));
      if (idealUp.lengthSq() > 0.3)
        baseUp.lerp(idealUp.normalize(), 1 - Math.exp(-dt * 1.8)).normalize();
      right.crossVectors(direction, baseUp).normalize();
      lookAt.addScaledVector(right, smoothedPointer.x * 0.65);
      lookAt.addScaledVector(baseUp, smoothedPointer.y * 0.65);
      direction.subVectors(lookAt, camera.position).normalize();
      const lens = getCameraLens(progress);
      camera.up
        .copy(baseUp)
        .applyAxisAngle(direction, reducedMotion ? 0 : lens.roll);
      camera.lookAt(lookAt);
      if (Math.abs(camera.fov - lens.fov) > 0.001) {
        camera.fov = lens.fov;
        camera.updateProjectionMatrix();
      }
      vortex.update(
        rotation,
        velocity,
        smoothedPointer,
        dt,
        reducedMotion,
        opts,
      );
      renderer.render(scene, camera);
      root.dataset.progress = progress.toFixed(4);
      root.dataset.fov = camera.fov.toFixed(2);

      hudRef.current
        ?.querySelectorAll<HTMLElement>("[data-vc-stage]")
        .forEach((node, i) => {
          const stage = STAGES[i];
          const opacity =
            smoothstep(stage.from, stage.from + 0.025, progress) *
            (1 - smoothstep(stage.to - 0.025, stage.to, progress));
          node.style.opacity = String(opacity);
          node.style.filter = `blur(${(1 - opacity) * 5}px)`;
          node.style.transform = `translateY(${(1 - opacity) * 10}px) scale(${0.97 + opacity * 0.03})`;
        });
      root.style.setProperty("--vc-progress", String(progress));
      if (!opts.paused && !reducedMotion)
        frame = requestAnimationFrame(animate);
    }

    syncRef.current = start;
    root.addEventListener("wheel", onWheel, { passive: false });
    root.addEventListener("pointerdown", onPointerDown);
    root.addEventListener("pointermove", onPointerMove);
    root.addEventListener("pointerup", onPointerEnd);
    root.addEventListener("pointercancel", onPointerEnd);
    root.addEventListener("lostpointercapture", onPointerEnd);
    root.addEventListener("pointerleave", onPointerLeave);
    root.addEventListener("keydown", onKeyDown);
    root.addEventListener("focusin", interact);
    motionQuery.addEventListener("change", onMotionChange);
    document.addEventListener("visibilitychange", onVisibilityChange);
    renderer.domElement.addEventListener("webglcontextlost", onContextLost);
    renderer.domElement.addEventListener(
      "webglcontextrestored",
      onContextRestored,
    );
    start();

    return () => {
      active = false;
      stop();
      commandRef.current = null;
      syncRef.current = null;
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      if (pointerId !== null && root.hasPointerCapture(pointerId))
        root.releasePointerCapture(pointerId);
      root.removeEventListener("wheel", onWheel);
      root.removeEventListener("pointerdown", onPointerDown);
      root.removeEventListener("pointermove", onPointerMove);
      root.removeEventListener("pointerup", onPointerEnd);
      root.removeEventListener("pointercancel", onPointerEnd);
      root.removeEventListener("lostpointercapture", onPointerEnd);
      root.removeEventListener("pointerleave", onPointerLeave);
      root.removeEventListener("keydown", onKeyDown);
      root.removeEventListener("focusin", interact);
      motionQuery.removeEventListener("change", onMotionChange);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      renderer.domElement.removeEventListener(
        "webglcontextlost",
        onContextLost,
      );
      renderer.domElement.removeEventListener(
        "webglcontextrestored",
        onContextRestored,
      );
      vortex.dispose();
      scene.clear();
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    };
  }, [images, retry]);

  return (
    <div
      ref={rootRef}
      className={`vc-root ${className}`}
      role="group"
      aria-label="Vortex Camera interactive gallery"
      aria-describedby={helpId}
      tabIndex={compact ? -1 : 0}
      data-compact={compact || undefined}
    >
      <div ref={mountRef} className="vc-canvas" />
      <p id={helpId} className="vc-sr-only">
        Scroll or drag vertically to travel. Arrow keys move along the camera
        path. Home and End go to its endpoints. Flight and appearance controls
        are available in the Motiqo panel.
      </p>
      {showHUD && (
        <div ref={hudRef} className="vc-hud" aria-hidden="true">
          {STAGES.map((stage, i) => (
            <div
              key={stage.title}
              data-vc-stage
              className={`vc-stage vc-stage-${stage.position}`}
            >
              <span className="vc-stage-number">
                FLIGHT SEQUENCE / 0{i + 1}
              </span>
              <h2>{stage.title}</h2>
              <p>{stage.detail}</p>
            </div>
          ))}
        </div>
      )}
      <div className="vc-status" role="status" aria-live="polite">
        {status === "loading" && (
          <span className="vc-sr-only">Loading the gallery.</span>
        )}
        {status === "image-error" && (
          <span className="vc-image-error">
            Some images are unavailable. Placeholder panels remain interactive.
          </span>
        )}
        {status === "unavailable" && (
          <div className="vc-fallback">
            <h2>The gallery needs WebGL.</h2>
            <p>Enable graphics acceleration to explore the camera flight.</p>
            <button type="button" onClick={() => setRetry((v) => v + 1)}>
              Try again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
export default VortexCamera;
