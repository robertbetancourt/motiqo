import { Vector3 } from "three";

type Vec3 = readonly [number, number, number];
type Ease = "in" | "out" | "inOut";

export interface CameraKeyframe {
  p: number;
  eye: Vec3;
  target: Vec3;
  roll: number;
  fov: number;
  ease: Ease;
}

export const CAM_TRACK: readonly CameraKeyframe[] = [
  {
    p: 0,
    eye: [-2.2, -0.8, 8.8],
    target: [0, 0, 0],
    roll: 0,
    fov: 44,
    ease: "inOut",
  },
  {
    p: 0.22,
    eye: [0, 0.2, 6.2],
    target: [0, 0, 0],
    roll: 0,
    fov: 44,
    ease: "inOut",
  },
  {
    p: 0.36,
    eye: [0.9, 4.9, 2.4],
    target: [0, -0.4, 0],
    roll: 8,
    fov: 48,
    ease: "out",
  },
  {
    p: 0.45,
    eye: [-1.1, 3.4, 1.2],
    target: [0, -0.4, 0],
    roll: 12,
    fov: 48,
    ease: "in",
  },
  {
    p: 0.52,
    eye: [-0.6, 1.8, 0.5],
    target: [0, -0.4, 0],
    roll: -22,
    fov: 59,
    ease: "inOut",
  },
  {
    p: 0.65,
    eye: [0.05, 0.1, 0.2],
    target: [0, -0.4, 0],
    roll: -4,
    fov: 66,
    ease: "inOut",
  },
  {
    p: 0.78,
    eye: [0.45, -1.4, -0.55],
    target: [0, 0, 0],
    roll: 16,
    fov: 61,
    ease: "in",
  },
  {
    p: 0.8,
    eye: [0.75, -1.95, -1],
    target: [0, 0, 0],
    roll: 14,
    fov: 58,
    ease: "out",
  },
  {
    p: 0.9,
    eye: [3, -2.3, -4.8],
    target: [0, 0, 0],
    roll: 4,
    fov: 49,
    ease: "out",
  },
  {
    p: 1,
    eye: [4.8, -1.6, -7.2],
    target: [0, 0, 0],
    roll: 0,
    fov: 45,
    ease: "inOut",
  },
];

export const clampProgress = (p: number) => Math.max(0, Math.min(1, p));
export const smoothstep = (a: number, b: number, p: number) => {
  const t = clampProgress((p - a) / (b - a));
  return t * t * (3 - 2 * t);
};

function ease(t: number, curve: Ease) {
  if (curve === "in") return t * t * t;
  if (curve === "out") return 1 - (1 - t) ** 3;
  return t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2;
}

function segment(p: number) {
  let i = 0;
  while (i < CAM_TRACK.length - 2 && p > CAM_TRACK[i + 1].p) i++;
  return i;
}

/** Time-aware cubic Hermite: continuous eye velocity at every keyframe. */
export function getCameraPosition(progress: number, out = new Vector3()) {
  const p = clampProgress(progress);
  const i = segment(p);
  const a = CAM_TRACK[i];
  const b = CAM_TRACK[i + 1];
  const prev = CAM_TRACK[Math.max(0, i - 1)];
  const next = CAM_TRACK[Math.min(CAM_TRACK.length - 1, i + 2)];
  const duration = b.p - a.p;
  const t = (p - a.p) / duration;
  const t2 = t * t;
  const t3 = t2 * t;
  for (let axis = 0; axis < 3; axis++) {
    const m0 = ((b.eye[axis] - prev.eye[axis]) / (b.p - prev.p)) * duration;
    const m1 = ((next.eye[axis] - a.eye[axis]) / (next.p - a.p)) * duration;
    out.setComponent(
      axis,
      (2 * t3 - 3 * t2 + 1) * a.eye[axis] +
        (t3 - 2 * t2 + t) * m0 +
        (-2 * t3 + 3 * t2) * b.eye[axis] +
        (t3 - t2) * m1,
    );
  }
  return out;
}

export function getCameraLens(progress: number) {
  const p = clampProgress(progress);
  const i = segment(p);
  const a = CAM_TRACK[i];
  const b = CAM_TRACK[i + 1];
  const t = ease((p - a.p) / (b.p - a.p), b.ease);
  return {
    fov: a.fov + (b.fov - a.fov) * t,
    roll: ((a.roll + (b.roll - a.roll) * t) * Math.PI) / 180,
  };
}

/** Base lookAt, before optional local-space cursor parallax. No frame lag. */
export function getCameraLookAt(progress: number, out = new Vector3()) {
  const p = clampProgress(progress);
  const i = segment(p);
  const a = CAM_TRACK[i];
  const b = CAM_TRACK[i + 1];
  const t = smoothstep(a.p, b.p, p);
  if (p < 0.38) {
    return out.set(
      a.target[0] + (b.target[0] - a.target[0]) * t,
      a.target[1] + (b.target[1] - a.target[1]) * t,
      a.target[2] + (b.target[2] - a.target[2]) * t,
    );
  }

  // The inner flight ALWAYS leads by 12% of the trajectory, including p = .80.
  getCameraPosition(Math.min(1.0, p + 0.12), out);
  if (p < 0.45) {
    const mix = smoothstep(0.38, 0.45, p);
    out.set(out.x * mix, -0.4 + (out.y + 0.4) * mix, out.z * mix);
  } else if (p > 0.8) {
    // Smoothly turn back to [0, 0, 0] only AFTER clearing the tunnel.
    out.multiplyScalar(1 - smoothstep(0.8, 0.98, p));
  }
  return out;
}
