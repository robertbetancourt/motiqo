export const kineticClamp = (v: number, a: number, b: number) =>
  Math.max(a, Math.min(b, Number.isFinite(v) ? v : a));
export const kineticMix = (a: number, b: number, t: number) => a + (b - a) * t;
export const kineticSmooth = (a: number, b: number, v: number) => {
  const t = kineticClamp((v - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
export function lotusPose(progress: number) {
  const p = kineticClamp(progress, 0, 100) / 100,
    open = kineticSmooth(0.1, 0.5, p),
    round = kineticSmooth(0.8, 1, p);
  return {
    spread: kineticMix(0.025, 0.245, open),
    radius: kineticMix(0.72, 1, open) * (1 - round * 0.035),
    roundness: round,
    open,
  };
}
/** Round-trip cycling reaches 100 without a discontinuity back to the first pose. */
export const lotusCycle = (elapsed: number, duration: number) =>
  50 - 50 * Math.cos((Math.PI * 2 * elapsed) / Math.max(2, duration));
export function lotusFormation(progress: number) {
  return {
    gather: kineticSmooth(0, 12, progress),
    petals: kineticSmooth(5, 18, progress),
    dust: 1 - kineticSmooth(9, 20, progress),
  };
}
/** Two overlapping generations: a new crown grows as the older one dissolves. */
export function turbineCrowns(time: number) {
  return [0, 0.5].map((offset) => {
    const phase = (((time / 5.6 + offset) % 1) + 1) % 1;
    return {
      phase,
      radius: kineticMix(0.56, 1.13, phase),
      opacity:
        kineticSmooth(0, 0.18, phase) * (1 - kineticSmooth(0.68, 1, phase)),
      twist: kineticMix(0.48, 0.08, kineticSmooth(0.05, 0.85, phase)),
    };
  });
}
/** A C1 envelope: gear changes begin and end at zero, without a radius/glow step. */
export const turbineShiftPulse = (age: number) =>
  age >= 0 && age < 0.75 ? Math.sin((Math.PI * age) / 0.75) ** 2 : 0;
export function agentBlink(time: number) {
  const cycle = Math.floor(time / 7.3),
    phase = time - cycle * 7.3;
  const lid = (start: number) =>
    kineticSmooth(start, start + 0.09, phase) *
    (1 - kineticSmooth(start + 0.11, start + 0.28, phase));
  return 1 - 0.95 * Math.max(lid(4.15), cycle % 3 === 1 ? lid(4.59) : 0);
}
/** Overscan the far edge, where the perspective frustum is widest. */
export function terrainCoverage(aspect: number, cameraZ: number, fov = 43) {
  return Math.max(
    1,
    (Math.tan((fov * Math.PI) / 360) * (cameraZ + 19) * aspect * 1.18) / 18,
  );
}
export const turbineGear = (speed: number) =>
  speed <= 25
    ? 1
    : speed <= 50
      ? 2
      : speed <= 85
        ? 3
        : speed <= 125
          ? 4
          : speed <= 160
            ? 5
            : 6;
export function turbineDemo(time: number, maxSpeed = 210) {
  const t = ((time % 24) + 24) % 24;
  const keys = [
    [0, 9],
    [2, 18],
    [5, 46],
    [9, 104],
    [13, 169],
    [16, 188],
    [20, 136],
    [22, 136],
    [24, 9],
  ];
  const i = keys.findIndex(
    (k, j) => j < keys.length - 1 && t >= k[0] && t < keys[j + 1][0],
  );
  const a = keys[Math.max(0, i)],
    b = keys[Math.max(0, i) + 1];
  return Math.min(
    maxSpeed,
    kineticMix(a[1], b[1], kineticSmooth(a[0], b[0], t)),
  );
}
export function seededKinetic(seed: number) {
  let state = seed | 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) | 0;
    return (state >>> 0) / 4294967296;
  };
}
export function orbitRadius(angle: number, time: number, layer: number) {
  return (
    1 +
    Math.sin(angle * 3 + time * 0.42 + layer * 1.3) * (0.045 + layer * 0.009) +
    Math.cos(angle * 2 - time * 0.28 + layer) * 0.06 +
    Math.sin(angle * 5 + time * 0.16) * 0.018
  );
}
export function terrainSeeds(lines: number, points: number) {
  const l = Math.round(kineticClamp(lines, 16, 120)),
    n = Math.round(kineticClamp(points, 40, 320)),
    data = new Float32Array(l * n * 3);
  for (let z = 0; z < l; z++)
    for (let x = 0; x < n; x++) {
      const i = (z * n + x) * 3;
      data[i] = (x / (n - 1) - 0.5) * 36;
      data[i + 1] = 0;
      data[i + 2] = (z / (l - 1)) * 32 - 16;
    }
  return data;
}
