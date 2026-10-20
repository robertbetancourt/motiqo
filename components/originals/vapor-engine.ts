import { createNativeGL, nativeClamp, nativeColor } from "./native-gl";
import { effectRuntime } from "./effect-runtime";
import { vaporFragment } from "./vapor-shaders";
import { createVaporFlow } from "./vapor-flow";

export interface VaporOptions {
  warmColor: string;
  coldColor: string;
  smokeDensity: number;
  flowSpeed: number;
  turbulence: number;
  ringRadius: number;
  paused: boolean;
}

/** Own one bounded drawing surface and release it on loss or unmount. */
export function createVaporEngine(
  host: HTMLElement,
  canvas: HTMLCanvasElement,
  compact: boolean,
  options: () => VaporOptions,
) {
  const gpu = createNativeGL(canvas);
  let clock: ReturnType<typeof effectRuntime> | undefined;
  let disposed = false;
  let lastTime = -Infinity;
  let simulationTime = 2.5;
  let pendingTime = 0;
  try {
    const pass = gpu.pass(vaporFragment);
    const flow = createVaporFlow(gpu, compact);
    clock = effectRuntime(
      host,
      canvas,
      (time, dt) => {
        const o = options();
        const speed = nativeClamp(o.flowSpeed, 0, 2);
        simulationTime += dt * speed;
        pendingTime += dt * speed;
        // The runtime sleeps while hidden or reduced; high-refresh displays stay bounded.
        if (dt > 0 && time - lastTime < 1 / 60 - 0.001) return false;
        lastTime = time;
        const texture = flow.update(
          simulationTime,
          pendingTime,
          o.ringRadius,
          o.turbulence,
        );
        pendingTime = 0;
        gpu.draw(pass, null, {
          uResolution: [canvas.width, canvas.height],
          uTime: simulationTime,
          uFlow: { texture },
          uDensity: nativeClamp(o.smokeDensity, 0.2, 2.5),
          uTurbulence: nativeClamp(o.turbulence, 0.2, 2),
          uRadius: nativeClamp(o.ringRadius, 0.18, 0.3),
          uWarm: nativeColor(o.warmColor, "#ff5549"),
          uCold: nativeColor(o.coldColor, "#4ca9ad"),
        });
      },
      () => options().paused || nativeClamp(options().flowSpeed, 0, 2) === 0,
      (width, height, dpr) => {
        const budget = compact ? 105_000 : 300_000;
        const scale = Math.min(dpr, 1.5, Math.sqrt(budget / (width * height)));
        canvas.width = Math.max(1, Math.round(width * scale));
        canvas.height = Math.max(1, Math.round(height * scale));
      },
      compact,
    );
    return {
      sync() {
        if (!disposed) {
          lastTime = -Infinity;
          clock?.invalidate();
        }
      },
      dispose() {
        if (disposed) return;
        disposed = true;
        clock?.dispose();
        gpu.dispose();
        delete host.dataset.ready;
      },
    };
  } catch (error) {
    clock?.dispose();
    gpu.dispose();
    throw error;
  }
}
