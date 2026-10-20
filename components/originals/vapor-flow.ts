import type { createNativeGL } from "./native-gl";
import { nativeClamp } from "./native-gl";
import { vaporFlowFragment } from "./vapor-shaders";

/** Transport two interleaved pigments through one continuous, dissipating field. */
export function createVaporFlow(
  gpu: ReturnType<typeof createNativeGL>,
  compact: boolean,
) {
  const size = compact ? 160 : 256;
  const pass = gpu.pass(vaporFlowFragment);
  let front = gpu.target(size, size),
    back = gpu.target(size, size),
    seeded = false;
  const advance = (
    time: number,
    dt: number,
    radius: number,
    turbulence: number,
  ) => {
    gpu.draw(pass, back, {
      uState: { texture: front.texture },
      uTexel: [1 / size, 1 / size],
      uTime: time,
      uDt: dt,
      uRadius: nativeClamp(radius, 0.18, 0.3),
      uTurbulence: nativeClamp(turbulence, 0.2, 2),
    });
    const previous = front;
    front = back;
    back = previous;
  };
  return {
    update(time: number, dt: number, radius: number, turbulence: number) {
      if (!seeded) {
        for (let i = 0; i < 48; i++)
          advance(time - 2.4 + (i + 1) * 0.05, 0.05, radius, turbulence);
        seeded = true;
      } else if (dt > 0) {
        const duration = Math.min(dt, 0.08),
          steps = Math.ceil(duration / (1 / 30));
        for (let i = 0; i < steps; i++)
          advance(
            time - duration + ((i + 1) * duration) / steps,
            duration / steps,
            radius,
            turbulence,
          );
      }
      return front.texture;
    },
  };
}
