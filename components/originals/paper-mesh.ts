import * as THREE from "three";
/** A fixed, seeded paper pose. Constraint relaxation runs once, never per frame. */
export function buildPaperMesh(seed = 1, columns = 12, rows = 16) {
  columns = Math.max(4, Math.min(24, Math.round(columns)));
  rows = Math.max(4, Math.min(32, Math.round(rows)));
  const random = (n: number) => {
    const v = Math.sin(n * 127.1 + seed * 311.7) * 43758.5453;
    return v - Math.floor(v);
  };
  const flat: number[] = [],
    pose: number[] = [],
    uv: number[] = [],
    triangles: number[] = [],
    edges = new Map<string, [number, number, number]>();
  for (let y = 0; y <= rows; y++)
    for (let x = 0; x <= columns; x++) {
      const i = y * (columns + 1) + x,
        u =
          (x + (x > 0 && x < columns ? (random(i * 3) - 0.5) * 0.6 : 0)) /
          columns,
        v =
          (y + (y > 0 && y < rows ? (random(i * 3 + 1) - 0.5) * 0.6 : 0)) /
          rows;
      const px = (u - 0.5) * 2.2,
        py = (v - 0.5) * 2.9;
      flat.push(px, py, 0);
      uv.push(u, v);
      const z =
        Math.sin(px * 3.2 + seed) * Math.sin(py * 2.8 - seed * 0.7) * 0.26 +
        Math.sin(px * 6.4 + py * 4.3 + seed) * 0.13 +
        (random(i + 101) - 0.5) * 0.16;
      pose.push(
        px * 0.79 + 0.035 * Math.sin(py * 4 + seed),
        py * 0.85 + 0.025 * Math.cos(px * 5 - seed),
        z,
      );
    }
  const add = (a: number, b: number, c: number) => {
    triangles.push(a, b, c);
    for (const [i, j] of [
      [a, b],
      [b, c],
      [c, a],
    ]) {
      const key = Math.min(i, j) + ":" + Math.max(i, j);
      if (!edges.has(key))
        edges.set(key, [
          i,
          j,
          Math.hypot(
            flat[i * 3] - flat[j * 3],
            flat[i * 3 + 1] - flat[j * 3 + 1],
          ),
        ]);
    }
  };
  for (let y = 0; y < rows; y++)
    for (let x = 0; x < columns; x++) {
      const a = y * (columns + 1) + x,
        b = a + 1,
        c = a + columns + 1,
        d = c + 1;
      if (random(a + 401) > 0.5) {
        add(a, b, d);
        add(a, d, c);
      } else {
        add(a, b, c);
        add(b, d, c);
      }
    }
  const initial = pose.slice();
  for (let pass = 0; pass < 32; pass++) {
    for (const [a, b, length] of edges.values()) {
      const i = a * 3,
        j = b * 3,
        dx = pose[j] - pose[i],
        dy = pose[j + 1] - pose[i + 1],
        dz = pose[j + 2] - pose[i + 2],
        distance = Math.hypot(dx, dy, dz) || 1,
        correction = ((distance - length) / distance) * 0.46;
      pose[i] += dx * correction;
      pose[i + 1] += dy * correction;
      pose[i + 2] += dz * correction;
      pose[j] -= dx * correction;
      pose[j + 1] -= dy * correction;
      pose[j + 2] -= dz * correction;
    }
    for (let i = 2; i < pose.length; i += 3)
      pose[i] += (initial[i] - pose[i]) * 0.035;
  }
  const center =
      (Math.round(rows / 2) * (columns + 1) + Math.round(columns / 2)) * 3,
    offset = [
      pose[center] - flat[center],
      pose[center + 1] - flat[center + 1],
      pose[center + 2],
    ];
  const positions = new Float32Array(triangles.length * 3),
    crumpled = new Float32Array(triangles.length * 3),
    uvs = new Float32Array(triangles.length * 2);
  triangles.forEach((node, i) => {
    for (let k = 0; k < 3; k++) {
      positions[i * 3 + k] = flat[node * 3 + k];
      crumpled[i * 3 + k] = pose[node * 3 + k] - offset[k];
    }
    uvs[i * 2] = uv[node * 2];
    uvs[i * 2 + 1] = uv[node * 2 + 1];
  });
  return { positions, crumpled, uvs, triangles: triangles.length / 3 };
}
export function createPaperGeometry(seed: number) {
  const data = buildPaperMesh(seed),
    geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.BufferAttribute(data.positions, 3),
  );
  geometry.setAttribute(
    "aCrumpled",
    new THREE.BufferAttribute(data.crumpled, 3),
  );
  geometry.setAttribute("uv", new THREE.BufferAttribute(data.uvs, 2));
  return geometry;
}
export function paperCrumple(
  center: number,
  deformation: number,
  velocity: number,
) {
  const p = Math.max(0, Math.min(1, (Math.abs(center) - 0.08) / 0.85)),
    focus = p * p * (3 - 2 * p);
  return (
    focus *
    (1 - Math.exp(-Math.max(0, Math.min(3, deformation)) * 1.7)) *
    (1 + Math.min(0.07, Math.abs(velocity) * 0.008))
  );
}
