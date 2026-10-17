import * as THREE from "three";
import { effectRuntime } from "./effect-runtime";
import {
  kineticClamp,
  seededKinetic,
  terrainSeeds,
  terrainCoverage,
} from "./kinetic-math";
import {
  bokehVertex,
  bokehFragment,
  bokehDustVertex,
  bokehDustFragment,
} from "./bokeh-shaders";
export type BokehOptions = {
  lineCount: number;
  pointsPerLine: number;
  waveSpeed: number;
  waveHeight: number;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  showStars: boolean;
  interactive: boolean;
  paused: boolean;
};
export function createBokehScene(
  canvas: HTMLCanvasElement,
  compact: boolean,
  get: () => BokehOptions,
) {
  const host = canvas.parentElement!,
    renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: false,
      antialias: false,
      powerPreference: "high-performance",
    });
  renderer.setClearColor("#020205");
  const scene = new THREE.Scene(),
    camera = new THREE.PerspectiveCamera(43, 1, 0.1, 100);
  camera.position.set(0, 6.2, 26);
  camera.lookAt(0, 3.2, -6);
  const uniforms = {
    uTime: { value: 0 },
    uHeight: { value: 1.5 },
    uDpr: { value: 1 },
    uScale: { value: 1 },
    uHover: { value: 0 },
    uPointer: { value: new THREE.Vector2() },
    uPrimary: { value: new THREE.Color() },
    uSecondary: { value: new THREE.Color() },
    uAccent: { value: new THREE.Color() },
  };
  const material = new THREE.ShaderMaterial({
    vertexShader: bokehVertex,
    fragmentShader: bokehFragment,
    uniforms,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    depthTest: false,
  });
  const geometry = new THREE.BufferGeometry(),
    points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  scene.add(points);
  const random = seededKinetic(619),
    positions = new Float32Array(1200),
    seeds = new Float32Array(400);
  for (let i = 0; i < 400; i++) {
    positions[i * 3] = (random() - 0.5) * 52;
    positions[i * 3 + 1] = random() * 24 - 5;
    positions[i * 3 + 2] = (random() - 0.5) * 45;
    seeds[i] = random();
  }
  const dustGeometry = new THREE.BufferGeometry();
  dustGeometry.setAttribute(
    "position",
    new THREE.BufferAttribute(positions, 3),
  );
  dustGeometry.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 1));
  const dustMaterial = new THREE.ShaderMaterial({
    vertexShader: bokehDustVertex,
    fragmentShader: bokehDustFragment,
    uniforms: { uTime: uniforms.uTime, uDpr: uniforms.uDpr },
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    depthTest: false,
  });
  const dust = new THREE.Points(dustGeometry, dustMaterial);
  scene.add(dust);
  let key = "",
    time = 2,
    px = 0,
    py = 0,
    x = 0,
    y = 0,
    hover = 0,
    disposed = false;
  const clock = effectRuntime(
    host,
    canvas,
    (_time, dt) => {
      const o = get(),
        lines = Math.round(kineticClamp(o.lineCount, 16, 120)),
        columns = Math.round(kineticClamp(o.pointsPerLine, 40, 320)),
        next = lines + ":" + columns;
      if (next !== key) {
        if (key) geometry.dispose();
        geometry.setAttribute(
          "position",
          new THREE.BufferAttribute(terrainSeeds(lines, columns), 3),
        );
        key = next;
        host.dataset.particles = String(lines * columns);
      }
      time += dt * kineticClamp(o.waveSpeed, 0, 3);
      const ease = dt ? 1 - Math.exp(-dt * 4) : 1;
      x += ((o.interactive ? px : 0) - x) * ease;
      y += ((o.interactive ? py : 0) - y) * ease;
      hover += ((o.interactive && (px || py) ? 1 : 0) - hover) * ease;
      uniforms.uTime.value = time;
      uniforms.uHover.value = hover;
      uniforms.uPointer.value.set(x, y);
      uniforms.uHeight.value = kineticClamp(o.waveHeight, 0, 4);
      for (const [u, color] of [
        [uniforms.uPrimary, o.primaryColor],
        [uniforms.uSecondary, o.secondaryColor],
        [uniforms.uAccent, o.accentColor],
      ] as const)
        u.value.set(/^#[\da-f]{6}$/i.test(color) ? color : "#67e8f9");
      dust.visible = o.showStars;
      camera.position.x = x * 0.65;
      camera.position.y = 6.2 + y * 0.4;
      camera.lookAt(x * 0.2, 3.2, -6);
      renderer.render(scene, camera);
      host.dataset.waveTime = time.toFixed(3);
    },
    () => get().paused,
    (w, h, dpr) => {
      renderer.setPixelRatio(dpr);
      renderer.setSize(w, h, false);
      uniforms.uDpr.value = dpr;
      uniforms.uScale.value = Math.min(1.7, Math.max(0.85, h / 600));
      camera.aspect = w / h;
      camera.position.z = 26 * Math.max(1, (h / w) * 0.72);
      points.scale.x = terrainCoverage(
        camera.aspect,
        camera.position.z,
        camera.fov,
      );
      camera.updateProjectionMatrix();
    },
    compact,
  );
  const move = (e: PointerEvent) => {
    if (
      !get().interactive ||
      get().paused ||
      matchMedia("(prefers-reduced-motion: reduce)").matches
    )
      return;
    const r = host.getBoundingClientRect();
    px = ((e.clientX - r.left) / r.width) * 2 - 1;
    py = ((e.clientY - r.top) / r.height) * 2 - 1;
    clock.invalidate();
  };
  const leave = () => {
    px = py = 0;
    clock.invalidate();
  };
  host.addEventListener("pointermove", move);
  host.addEventListener("pointerleave", leave);
  return {
    sync: clock.invalidate,
    dispose() {
      if (disposed) return;
      disposed = true;
      clock.dispose();
      host.removeEventListener("pointermove", move);
      host.removeEventListener("pointerleave", leave);
      geometry.dispose();
      material.dispose();
      dustGeometry.dispose();
      dustMaterial.dispose();
      renderer.dispose();
    },
  };
}
