import * as THREE from "three";
import { effectRuntime } from "./effect-runtime";
import { kineticClamp } from "./kinetic-math";
import {
  opalineVertex,
  opalineFragment,
  opalineCoreVertex,
  opalineCoreFragment,
  opalineGlowFragment,
} from "./opaline-shaders";
export type OpalinePalette = {
  coreBlue: string;
  warmPeach: string;
  outerLavender: string;
  lineColor: string;
};
export const opalineColors: OpalinePalette = {
  coreBlue: "#8ab8f8",
  warmPeach: "#ffbe98",
  outerLavender: "#c4b5fd",
  lineColor: "#ffffff",
};
export type OpalineOptions = {
  layerCount: number;
  ringDensity: number;
  morphSpeed: number;
  morphIntensity: number;
  colorPalette: OpalinePalette;
  interactive: boolean;
  listening: boolean;
  paused: boolean;
};
export function createOpalineScene(
  canvas: HTMLCanvasElement,
  compact: boolean,
  get: () => OpalineOptions,
) {
  const host = canvas.parentElement!,
    renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
  renderer.setClearColor(0x000000, 0);
  const scene = new THREE.Scene(),
    camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
  camera.position.z = 6.5;
  const group = new THREE.Group();
  scene.add(group);
  const colors = {
    uBlue: { value: new THREE.Color(opalineColors.coreBlue) },
    uPeach: { value: new THREE.Color(opalineColors.warmPeach) },
    uLavender: { value: new THREE.Color(opalineColors.outerLavender) },
    uLine: { value: new THREE.Color(opalineColors.lineColor) },
  };
  const sphere = new THREE.SphereGeometry(
      1,
      compact ? 80 : 128,
      compact ? 64 : 128,
    ),
    materials: THREE.ShaderMaterial[] = [],
    shells: THREE.Mesh[] = [];
  for (let i = 0; i < 5; i++) {
    const material = new THREE.ShaderMaterial({
      vertexShader: opalineVertex,
      fragmentShader: opalineFragment,
      uniforms: {
        ...colors,
        uTime: { value: 2 },
        uLayer: { value: i },
        uIntensity: { value: 1 },
        uActivity: { value: 0 },
        uDensity: { value: 34 },
      },
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(sphere, material);
    mesh.scale.setScalar(0.88 + i * 0.2);
    mesh.renderOrder = 2 + i;
    group.add(mesh);
    materials.push(material);
    shells.push(mesh);
  }
  const coreMaterial = new THREE.ShaderMaterial({
    vertexShader: opalineCoreVertex,
    fragmentShader: opalineCoreFragment,
    uniforms: colors,
    transparent: true,
    depthWrite: false,
  });
  const core = new THREE.Mesh(sphere, coreMaterial);
  core.scale.setScalar(0.83);
  core.renderOrder = 1;
  group.add(core);
  const glowGeometry = new THREE.PlaneGeometry(4.6, 4.6),
    glowMaterial = new THREE.ShaderMaterial({
      vertexShader:
        "varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}",
      fragmentShader: opalineGlowFragment,
      uniforms: colors,
      transparent: true,
      depthWrite: false,
    });
  const glow = new THREE.Mesh(glowGeometry, glowMaterial);
  glow.position.z = -0.6;
  glow.renderOrder = 0;
  scene.add(glow);
  let time = 2,
    px = 0,
    py = 0,
    hover = 0,
    x = 0,
    y = 0,
    response = 0,
    velocity = 0,
    disposed = false;
  const clock = effectRuntime(
    host,
    canvas,
    (_time, dt) => {
      const o = get(),
        target = o.listening ? 1 : o.interactive ? hover * 0.55 : 0;
      if (dt) {
        velocity += ((target - response) * 65 - velocity * 14) * dt;
        response += velocity * dt;
      } else response = target;
      time += dt * kineticClamp(o.morphSpeed, 0, 3) * (1 + response * 0.65);
      const ease = dt ? 1 - Math.exp(-dt * 4) : 1;
      x += ((o.interactive ? px : 0) - x) * ease;
      y += ((o.interactive ? py : 0) - y) * ease;
      group.rotation.y = x * 0.16;
      group.rotation.x = y * 0.12;
      group.rotation.z = Math.sin(time * 0.1) * 0.06;
      const palette = o.colorPalette;
      for (const [u, key] of [
        [colors.uBlue, "coreBlue"],
        [colors.uPeach, "warmPeach"],
        [colors.uLavender, "outerLavender"],
        [colors.uLine, "lineColor"],
      ] as const) {
        const color = palette[key];
        u.value.set(/^#[\da-f]{6}$/i.test(color) ? color : opalineColors[key]);
      }
      const count = Math.round(kineticClamp(o.layerCount, 1, 5));
      shells.forEach((shell, i) => {
        shell.visible = i < count;
        const u = materials[i].uniforms;
        u.uTime.value = time;
        u.uIntensity.value = kineticClamp(o.morphIntensity, 0, 2.5);
        u.uActivity.value = response;
        u.uDensity.value = kineticClamp(o.ringDensity, 12, 100);
      });
      core.scale.setScalar(
        0.82 + Math.sin(time * 0.7) * 0.014 + response * 0.025,
      );
      renderer.render(scene, camera);
      host.dataset.membranes = String(count);
      host.dataset.morphTime = time.toFixed(3);
    },
    () => get().paused,
    (w, h, dpr) => {
      renderer.setPixelRatio(dpr);
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.position.z = 6.5 * Math.max(1, h / w);
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
    hover = 1;
    clock.invalidate();
  };
  const leave = () => {
    px = py = hover = 0;
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
      sphere.dispose();
      materials.forEach((m) => m.dispose());
      coreMaterial.dispose();
      glowGeometry.dispose();
      glowMaterial.dispose();
      renderer.dispose();
    },
  };
}
