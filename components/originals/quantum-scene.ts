import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { effectRuntime } from "./effect-runtime";
export type QuantumOptions = {
  coreColor: string;
  accentColor: string;
  rotationSpeed: number;
  finCount: number;
  bloomIntensity: number;
  interactive: boolean;
  paused: boolean;
};
function shellPoint(t: number, v: number, radius = 1.025) {
  const phi = t * Math.PI * 2,
    lat = 0.19 * Math.sin(phi * 2) + v;
  return new THREE.Vector3(
    Math.cos(lat) * Math.cos(phi),
    Math.sin(lat),
    Math.cos(lat) * Math.sin(phi),
  ).multiplyScalar(radius);
}
function shellGeometry(width: number, radius: number) {
  const positions: number[] = [],
    uv: number[] = [],
    indices: number[] = [];
  const segments = 256,
    rows = 20;
  for (let i = 0; i <= segments; i++)
    for (let j = 0; j <= rows; j++) {
      const p = shellPoint(i / segments, ((j / rows) * 2 - 1) * width, radius);
      positions.push(p.x, p.y, p.z);
      uv.push(i / segments, j / rows);
      if (i < segments && j < rows) {
        const a = i * (rows + 1) + j;
        indices.push(a, a + 1, a + rows + 1, a + 1, a + rows + 2, a + rows + 1);
      }
    }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(indices);
  g.computeVertexNormals();
  return g;
}
function edgeGeometry(latitude: number, radius: number, thickness: number) {
  const points = Array.from({ length: 256 }, (_, i) =>
    shellPoint(i / 256, latitude, radius),
  );
  return new THREE.TubeGeometry(
    new THREE.CatmullRomCurve3(points, true),
    256,
    thickness,
    5,
    true,
  );
}
export function createQuantumScene(
  canvas: HTMLCanvasElement,
  compact: boolean,
  get: () => QuantumOptions,
) {
  const host = canvas.parentElement!,
    renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
      powerPreference: "high-performance",
    });
  renderer.setClearColor("#03050a");
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1;
  const scene = new THREE.Scene();
  const room = new RoomEnvironment(),
    pmrem = new THREE.PMREMGenerator(renderer);
  room.traverse((object) => {
    if (
      object instanceof THREE.Mesh &&
      object.material instanceof THREE.MeshBasicMaterial
    ) {
      object.material.color.multiply(new THREE.Color("#345cff"));
      object.scale.y *= 2.5;
      object.scale.x *= 0.45;
    }
  });
  const environment = pmrem.fromScene(room, 0.06);
  room.dispose();
  pmrem.dispose();
  scene.environment = environment.texture;
  scene.environmentIntensity = 0.38;
  const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 40);
  camera.position.set(0, 0, 9);
  const rig = new THREE.Group(),
    orb = new THREE.Group(),
    turbine = new THREE.Group();
  scene.add(rig);
  rig.add(orb, turbine);
  orb.rotation.set(0.6, 0.25, -0.55);
  const physical = new THREE.MeshPhysicalMaterial({
    color: "#050b24",
    roughness: 0.15,
    metalness: 0.8,
    clearcoat: 1,
    clearcoatRoughness: 0.09,
    envMapIntensity: 0.35,
  });
  const sphere = new THREE.Mesh(
    new THREE.SphereGeometry(0.87, 96, 64),
    physical,
  );
  orb.add(sphere);
  scene.add(new THREE.AmbientLight("#20317a", 1.1));
  const fill = new THREE.DirectionalLight("#294be4", 3.2);
  fill.position.set(-3, -2, 4);
  scene.add(fill);
  const key = new THREE.DirectionalLight("#668dff", 3);
  key.position.set(2, 4, 5);
  scene.add(key);
  const coreLight = new THREE.PointLight("#315bff", 22, 5, 2);
  coreLight.position.set(0, 0, 0.1);
  rig.add(coreLight);
  // The wide curved shell has real open poles and six narrow luminous contour traces.
  const shellMaterial = new THREE.MeshPhysicalMaterial({
    color: "#09246d",
    metalness: 0.82,
    roughness: 0.16,
    clearcoat: 1,
    clearcoatRoughness: 0.07,
    envMapIntensity: 0.5,
    side: THREE.DoubleSide,
    emissive: "#081b67",
    emissiveIntensity: 0.25,
  });
  const shellRadiance = { value: new THREE.Color("#315bff") };
  shellMaterial.onBeforeCompile = (shader) => {
    shader.uniforms.mqRadiance = shellRadiance;
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        "#include <common>\nuniform vec3 mqRadiance;",
      )
      .replace(
        "#include <emissivemap_fragment>",
        "#include <emissivemap_fragment>\n totalEmissiveRadiance += mqRadiance * pow(1. - abs(dot(normal, normalize(vViewPosition))), 3.) * 1.2;",
      );
  };
  const rimMaterial = new THREE.MeshBasicMaterial({
    color: new THREE.Color(0.12, 0.48, 3.8),
    toneMapped: false,
  });
  const hairlineMaterial = new THREE.MeshBasicMaterial({
    color: new THREE.Color(0.2, 0.55, 2.6),
    toneMapped: false,
  });
  const auraMaterial = new THREE.MeshBasicMaterial({
    color: "#315bff",
    transparent: true,
    opacity: 0.11,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
  });
  for (let i = 0; i < 2; i++) {
    const group = new THREE.Group(),
      width = i === 0 ? 0.55 : 0.08,
      radius = i === 0 ? 1.025 : 1.075;
    group.rotation.set(i === 0 ? 0.55 : 1.65, i * 0.55, i === 0 ? -0.45 : 0.9);
    const body = new THREE.Mesh(shellGeometry(width, radius), shellMaterial);
    group.add(body);
    for (const side of [-1, 1]) {
      const edge = new THREE.Mesh(
        edgeGeometry(side * width, radius + 0.004, 0.012),
        rimMaterial,
      );
      edge.layers.enable(1);
      group.add(edge);
      const aura = new THREE.Mesh(
        edgeGeometry(side * width, radius + 0.004, 0.036),
        auraMaterial,
      );
      aura.layers.enable(1);
      group.add(aura);
      if (i === 0)
        for (let j = 1; j <= 2; j++) {
          const trace = new THREE.Mesh(
            edgeGeometry(side * (width - j * 0.043), radius + 0.009, 0.0038),
            hairlineMaterial,
          );
          trace.layers.enable(1);
          group.add(trace);
        }
    }
    orb.add(group);
  }
  const grooveMaterial = new THREE.MeshStandardMaterial({
    color: "#0c2052",
    metalness: 0.85,
    roughness: 0.24,
    envMapIntensity: 0.4,
  });
  for (let i = 0; i < 16; i++) {
    const slot = new THREE.Mesh(
        new THREE.BoxGeometry(0.018, 0.27, 0.022),
        grooveMaterial,
      ),
      a = (i / 16) * Math.PI * 2;
    slot.position.set(Math.cos(a) * 0.872, 0, Math.sin(a) * 0.872);
    slot.rotation.y = -a;
    orb.add(slot);
  }
  const finMaterial = new THREE.MeshPhysicalMaterial({
    color: "#0a1432",
    metalness: 0.7,
    roughness: 0.3,
    clearcoat: 0.4,
    envMapIntensity: 0.25,
  });
  const blade = new THREE.Shape();
  blade.moveTo(-0.18, -0.43);
  blade.lineTo(0.12, -0.36);
  blade.lineTo(0.2, 0.41);
  blade.lineTo(-0.16, 0.48);
  blade.closePath();
  const finGeometry = new THREE.ExtrudeGeometry(blade, {
    depth: 0.045,
    bevelEnabled: true,
    bevelSize: 0.008,
    bevelThickness: 0.007,
    bevelSegments: 2,
    steps: 1,
  });
  finGeometry.center();
  const fins = new THREE.InstancedMesh(finGeometry, finMaterial, 32);
  fins.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  turbine.add(fins);
  turbine.rotation.set(0.28, -0.42, -0.3);
  const dummy = new THREE.Object3D();
  const rimLight = new THREE.DirectionalLight("#2747ff", 4);
  rimLight.position.set(-3, 1, -2);
  scene.add(rimLight);
  const atmosphere = new THREE.Mesh(
    new THREE.PlaneGeometry(12, 12),
    new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: { accent: { value: new THREE.Color("#183dcc") } },
      vertexShader: `varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
      fragmentShader: `varying vec2 vUv;uniform vec3 accent;void main(){float r=length(vUv-.5)*2.;gl_FragColor=vec4(accent,exp(-r*r*22.)*.22);}`,
    }),
  );
  atmosphere.position.z = -2;
  scene.add(atmosphere);
  // Actual selective bloom: non-luminous meshes become black occluders only for the bloom pass.
  const black = new THREE.MeshBasicMaterial({ color: 0x000000 }),
    saved = new Map<THREE.Mesh, THREE.Material | THREE.Material[]>();
  const bloom = new EffectComposer(
    renderer,
    new THREE.WebGLRenderTarget(1, 1, {
      type: THREE.HalfFloatType,
      samples: compact ? 0 : 2,
    }),
  );
  bloom.renderToScreen = false;
  bloom.addPass(new RenderPass(scene, camera));
  const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(1, 1),
    0.9,
    0.65,
    0.12,
  );
  bloom.addPass(bloomPass);
  const final = new EffectComposer(
    renderer,
    new THREE.WebGLRenderTarget(1, 1, {
      type: THREE.HalfFloatType,
      samples: compact ? 0 : 4,
    }),
  );
  final.addPass(new RenderPass(scene, camera));
  const mix = new ShaderPass({
    uniforms: {
      tDiffuse: { value: null },
      bloomTexture: { value: bloom.renderTarget2.texture },
    },
    vertexShader: `varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader: `uniform sampler2D tDiffuse,bloomTexture;varying vec2 vUv;void main(){gl_FragColor=texture2D(tDiffuse,vUv)+texture2D(bloomTexture,vUv);}`,
  });
  final.addPass(mix);
  const output = new OutputPass();
  final.addPass(output);
  let px = 0,
    py = 0,
    x = 0,
    y = 0,
    hover = 0,
    rotation = 0.1,
    disposed = false;
  const clock = effectRuntime(
    host,
    canvas,
    (time, dt) => {
      const o = get();
      const active = o.interactive ? hover : 0;
      x += (px * active - x) * (1 - Math.exp(-5 * dt));
      y += (py * active - y) * (1 - Math.exp(-5 * dt));
      rig.rotation.set(y * 0.1, x * 0.14, 0);
      rotation +=
        dt * Math.min(3, Math.max(0, o.rotationSpeed)) * (1 + active * 0.3);
      orb.rotation.y = rotation + 0.25;
      orb.rotation.x = 0.55 + Math.sin(rotation * 0.4) * 0.14;
      const finCount = Math.round(Math.min(32, Math.max(24, o.finCount)));
      fins.count = finCount;
      for (let i = 0; i < finCount; i++) {
        const a = (i / finCount) * Math.PI * 2 + rotation * 0.13;
        const radius = 1.83 + Math.sin(time * 0.6 + i * 0.3) * 0.025;
        dummy.position.set(
          Math.cos(a) * radius,
          Math.sin(a) * radius,
          Math.sin(a * 2 + time * 0.2) * 0.12,
        );
        dummy.rotation.set(0.5 + Math.sin(a) * 0.3, 0.4, a - 1.28);
        dummy.scale.set(0.75, 0.94 + Math.sin(a * 2 + 0.7) * 0.17, 1);
        dummy.updateMatrix();
        fins.setMatrixAt(i, dummy.matrix);
      }
      fins.instanceMatrix.needsUpdate = true;
      physical.color.set(
        /^#[\da-f]{6}$/i.test(o.coreColor) ? o.coreColor : "#050b24",
      );
      const accent = new THREE.Color(
        /^#[\da-f]{6}$/i.test(o.accentColor) ? o.accentColor : "#315bff",
      );
      shellRadiance.value.copy(accent);
      auraMaterial.color.copy(accent).multiplyScalar(2.5);
      rimMaterial.color.copy(accent).multiplyScalar(3.2 + active * 0.6);
      rimMaterial.color.b = Math.max(rimMaterial.color.b, 2);
      hairlineMaterial.color.copy(rimMaterial.color).multiplyScalar(0.65);
      coreLight.color.copy(accent).lerp(new THREE.Color("#224aff"), 0.7);
      bloomPass.strength =
        Math.max(0, Math.min(2, o.bloomIntensity)) * (1 + active * 0.12);
      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh && !obj.layers.isEnabled(1)) {
          saved.set(obj, obj.material);
          obj.material = black;
        }
      });
      bloom.render(dt);
      saved.forEach((material, mesh) => {
        mesh.material = material;
      });
      saved.clear();
      final.render(dt);
      const hud = host.querySelector<SVGElement>(".mq-quantum-hud");
      if (hud) {
        hud.style.transform = `translate(${x * 5}px,${y * 5}px)`;
        const rings = hud.querySelectorAll<SVGGElement>("[data-spin]");
        rings.forEach((ring, i) =>
          ring.setAttribute(
            "transform",
            `rotate(${time * (i ? -1.3 : 2)} 400 400)`,
          ),
        );
      }
    },
    () => get().paused,
    (w, h, dpr) => {
      renderer.setPixelRatio(dpr);
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.position.z = 9 * Math.max(1, h / w);
      camera.updateProjectionMatrix();
      bloom.setPixelRatio(dpr);
      final.setPixelRatio(dpr);
      bloom.setSize(w, h);
      final.setSize(w, h);
    },
    compact,
  );
  const move = (event: PointerEvent) => {
    const r = host.getBoundingClientRect();
    px = ((event.clientX - r.left) / r.width) * 2 - 1;
    py = ((event.clientY - r.top) / r.height) * 2 - 1;
    hover = 1;
    clock.invalidate();
  };
  const leave = () => {
    hover = 0;
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
      scene.traverse((o) => {
        if (o instanceof THREE.Mesh) {
          o.geometry.dispose();
          for (const m of Array.isArray(o.material) ? o.material : [o.material])
            m.dispose();
        }
      });
      black.dispose();
      bloomPass.dispose();
      mix.dispose();
      output.dispose();
      bloom.dispose();
      final.dispose();
      environment.dispose();
      renderer.dispose();
    },
  };
}
