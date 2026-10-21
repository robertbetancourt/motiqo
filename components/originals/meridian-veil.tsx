'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';

export type MeridianVeilTheme = 'mint' | 'silver' | 'magenta' | 'violet' | 'ice';

export interface MeridianThemeConfig {
  name: MeridianVeilTheme;
  label: string;
  bg: string;
  particle1: string;
  particle2: string;
  core: string;
  halo: string;
}

export const MERIDIAN_THEMES: Record<MeridianVeilTheme, MeridianThemeConfig> = {
  mint: {
    name: 'mint',
    label: 'Mint',
    bg: '#000000',
    particle1: '#5EEAD4',
    particle2: '#A7F3D0',
    core: '#0D9488',
    halo: '#0D9488',
  },
  silver: {
    name: 'silver',
    label: 'Silver',
    bg: '#000000',
    particle1: '#F8FAFC',
    particle2: '#CBD5E1',
    core: '#475569',
    halo: '#475569',
  },
  magenta: {
    name: 'magenta',
    label: 'Magenta',
    bg: '#1F0333',
    particle1: '#F0ABFC',
    particle2: '#E879F9',
    core: '#A21CAF',
    halo: '#A21CAF',
  },
  violet: {
    name: 'violet',
    label: 'Violet',
    bg: '#140826',
    particle1: '#C4B5FD',
    particle2: '#DDD6FE',
    core: '#6D28D9',
    halo: '#6D28D9',
  },
  ice: {
    name: 'ice',
    label: 'Ice',
    bg: '#040D2A',
    particle1: '#7DD3FC',
    particle2: '#BAE6FD',
    core: '#0284C7',
    halo: '#0284C7',
  },
};

export const THEME_KEYS: MeridianVeilTheme[] = ['mint', 'silver', 'magenta', 'violet', 'ice'];

export interface MeridianVeilProps {
  theme?: MeridianVeilTheme;
  autoCycleThemes?: boolean;
  meridianCount?: number;
  pointsPerMeridian?: number;
  waveAmplitude?: number;
  speed?: number;
  centerLabel?: string;
  showThemeSwitcher?: boolean;
  interactive?: boolean;
  compact?: boolean;
  paused?: boolean;
  className?: string;
}

export const meridianClamp = (n: number, min: number, max: number) =>
  Math.max(min, Math.min(max, Number.isFinite(n) ? n : min));

export const validHexColor = (color: string | undefined, fallback: string) =>
  color && /^#[\da-f]{6}$/i.test(color) ? color : fallback;

/** Generates structured particle coordinates organized in meridians and latitudes. */
export function createMeridianGeometry(meridianCount = 60, pointsPerMeridian = 150) {
  const mCount = Math.max(12, Math.min(180, Math.round(meridianClamp(meridianCount, 12, 180))));
  const pCount = Math.max(30, Math.min(300, Math.round(meridianClamp(pointsPerMeridian, 30, 300))));
  const total = mCount * pCount;

  const positions = new Float32Array(total * 3);
  const uvs = new Float32Array(total * 2);

  let ptr3 = 0;
  let ptr2 = 0;

  for (let m = 0; m < mCount; m++) {
    const u = m / mCount;
    const theta = u * Math.PI * 2;
    for (let p = 0; p < pCount; p++) {
      const v = p / (pCount - 1);
      const phi = v * Math.PI;

      const sinPhi = Math.sin(phi);
      const cosPhi = Math.cos(phi);

      positions[ptr3] = sinPhi * Math.cos(theta);
      positions[ptr3 + 1] = cosPhi;
      positions[ptr3 + 2] = sinPhi * Math.sin(theta);

      uvs[ptr2] = u;
      uvs[ptr2 + 1] = v;

      ptr3 += 3;
      ptr2 += 2;
    }
  }

  return { positions, uvs, total, meridianCount: mCount, pointsPerMeridian: pCount };
}

/** Static 2D fallback points for SSR and no-GPU environments. */
export function createMeridianFallbackPoints(meridianCount = 36, pointsPerMeridian = 40) {
  const points: Array<{ x: number; y: number; opacity: number }> = [];
  for (let m = 0; m < meridianCount; m++) {
    const theta = (m / meridianCount) * Math.PI * 2;
    for (let p = 0; p < pointsPerMeridian; p++) {
      const phi = (p / (pointsPerMeridian - 1)) * Math.PI;
      const sinPhi = Math.sin(phi);
      const cosPhi = Math.cos(phi);
      const x = sinPhi * Math.cos(theta);
      const y = cosPhi;
      const z = sinPhi * Math.sin(theta);
      points.push({
        x: x * 0.88,
        y: -y * 0.88,
        opacity: Math.max(0.12, Math.min(0.95, 0.45 + z * 0.4)),
      });
    }
  }
  return points;
}

// ---------------------------------------------------------------------------
// GLSL Shaders
// ---------------------------------------------------------------------------

export const curtainVertexShader = `
precision highp float;

attribute vec2 aUv;

uniform float uTime;
uniform float uWaveAmplitude;
uniform float uPixelRatio;
uniform float uPixelScale;
uniform vec2 uPointer;
uniform float uHover;

varying float vDisplacement;
varying vec2 vUv;
varying vec3 vNormal;

// 3D Simplex Noise by Stefan Gustavson / Ian McEwan (Ashima Arts)
vec4 permute(vec4 x){ return mod(((x * 34.0) + 1.0) * x, 289.0); }
vec4 taylorInvSqrt(vec4 r){ return 1.79284291400159 - 0.85373472095314 * r; }

float snoise(vec3 v){
  const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);

  vec3 i  = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);

  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);

  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;

  i = mod(i, 289.0);
  vec4 p = permute(permute(permute(
            i.z + vec4(0.0, i1.z, i2.z, 1.0))
          + i.y + vec4(0.0, i1.y, i2.y, 1.0))
          + i.x + vec4(0.0, i1.x, i2.x, 1.0));

  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;

  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);

  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);

  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);

  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);

  vec4 s0 = floor(b0) * 2.0 + 1.0;
  vec4 s1 = floor(b1) * 2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));

  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;

  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);

  vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;

  vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
}

void main() {
  float theta = aUv.x * 6.28318530718;
  float phi = aUv.y * 3.14159265359;
  float sinPhi = sin(phi);
  float cosPhi = cos(phi);

  // 1. Polar pinch and subtle azimuthal twist near poles
  float polarPinch = pow(abs(cosPhi), 1.6) * 0.18;
  float polarTwist = cosPhi * 0.35 * (1.0 - sinPhi);
  float modifiedTheta = theta + polarTwist;

  // Base normal direction on the unit sphere
  vec3 norm = vec3(sinPhi * cos(modifiedTheta), cosPhi, sinPhi * sin(modifiedTheta));
  norm.y += sign(cosPhi) * polarPinch;
  norm = normalize(norm);

  // 2. Wave envelope (asymmetric rotating curtain zone with power curve)
  float mask = pow(clamp(sin(theta - uTime * 0.5) * 0.5 + 0.5, 0.0, 1.0), 2.2);
  float curtainZone = mask;

  // 3. Multi-octave 3D simplex noise with time translation
  vec3 noiseCoord1 = norm * 1.7 + vec3(0.0, uTime * 0.45, 0.0);
  float n1 = snoise(noiseCoord1);
  vec3 noiseCoord2 = norm * 3.2 + vec3(uTime * 0.35, 1.7, 3.4);
  float n2 = snoise(noiseCoord2) * 0.5;
  float noiseSum = (n1 + n2) * 0.65;

  // Sinusoidal wave harmonics
  float harmonic = sin(theta * 4.0 + phi * 5.0 - uTime * 1.6) * 0.25;
  float totalWave = noiseSum + harmonic;

  // Outward radial displacement (expanding up to ~+0.65)
  // Mask applied to noise and wave envelope so at least 45% of meridians remain adhered to R = 1.0
  float radialDisp = sinPhi * mask * uWaveAmplitude * (0.55 + totalWave);

  // Lateral tangential drape (silk folding effect)
  vec3 tangent = vec3(-sin(modifiedTheta), 0.2 * cos(phi * 3.0), cos(modifiedTheta));
  float tangentDisp = n1 * 0.22 * sinPhi * mask * uWaveAmplitude;

  // Interactive pointer attraction/expansion
  vec4 restingView = modelViewMatrix * vec4(norm, 1.0);
  vec4 clip = projectionMatrix * restingView;
  vec2 ndc = clip.xy / max(0.001, clip.w);
  float ptrDist = length(ndc - uPointer);
  float ptrEffect = exp(-ptrDist * ptrDist * 4.5) * uHover * 0.35 * sinPhi;

  vec3 finalPos = norm * (1.0 + radialDisp + ptrEffect) + tangent * tangentDisp;

  vec4 mvPosition = modelViewMatrix * vec4(finalPos, 1.0);
  gl_Position = projectionMatrix * mvPosition;

  vDisplacement = radialDisp + ptrEffect;
  vUv = aUv;
  vNormal = norm;

  // Point size: fine and crisp, scaled with pixel ratio and depth
  float pointSize = (2.2 + vDisplacement * 0.9) * uPixelRatio * (4.0 / -mvPosition.z);
  gl_PointSize = clamp(pointSize, 1.0, 18.0);
}
`;

export const curtainFragmentShader = `
precision highp float;

uniform vec3 uParticleColor1;
uniform vec3 uParticleColor2;
uniform float uOpacity;

varying float vDisplacement;
varying vec2 vUv;
varying vec3 vNormal;

void main() {
  float d = length(gl_PointCoord - 0.5) * 2.0;
  if (d > 1.0) discard;

  // Defined core with smooth edge
  float core = smoothstep(1.0, 0.15, d);

  // Vertical and displacement color gradient
  float colorMix = clamp(vDisplacement * 1.1 + vUv.y * 0.35, 0.0, 1.0);
  vec3 col = mix(uParticleColor1, uParticleColor2, colorMix);

  // Additive intensity where strands cross or near poles
  float brightness = 0.65 + vDisplacement * 0.85 + pow(abs(vNormal.y), 2.2) * 0.45;
  float alpha = core * uOpacity * brightness;

  gl_FragColor = vec4(col, alpha);
  #include <colorspace_fragment>
}
`;

export const coreVertexShader = `
precision highp float;

varying vec3 vNormal;
varying vec3 vViewDir;

void main() {
  vNormal = normalize(normalMatrix * normal);
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  vViewDir = normalize(-mvPosition.xyz);
  gl_Position = projectionMatrix * mvPosition;
}
`;

export const coreFragmentShader = `
precision highp float;

uniform vec3 uCoreColor;
uniform float uCoreOpacity;
uniform float uTime;

varying vec3 vNormal;
varying vec3 vViewDir;

void main() {
  // Fresnel reflection on the rim of the sphere
  float fresnel = pow(1.0 - abs(dot(vNormal, vViewDir)), 2.4);
  float hemi = dot(vNormal, vec3(0.0, 1.0, 0.4)) * 0.5 + 0.5;
  float pulse = 0.92 + 0.08 * sin(uTime * 1.3);

  float alpha = clamp((fresnel * 0.88 + 0.07 * hemi) * uCoreOpacity * pulse, 0.0, 1.0);
  vec3 col = uCoreColor * (0.8 + 0.45 * fresnel);

  gl_FragColor = vec4(col, alpha);
  #include <colorspace_fragment>
}
`;

export const haloVertexShader = `
precision highp float;

varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const haloFragmentShader = `
precision highp float;

uniform vec3 uHaloColor;
uniform float uHaloOpacity;

varying vec2 vUv;

void main() {
  float d = length(vUv - 0.5) * 2.0;
  if (d > 1.0) discard;

  float glow = pow(1.0 - d, 2.2);
  float alpha = glow * uHaloOpacity * 0.42;

  gl_FragColor = vec4(uHaloColor, alpha);
  #include <colorspace_fragment>
}
`;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function MeridianVeil({
  theme = 'mint',
  autoCycleThemes = false,
  meridianCount = 60,
  pointsPerMeridian = 150,
  waveAmplitude = 0.62,
  speed = 1.0,
  centerLabel = '',
  showThemeSwitcher = false,
  interactive = true,
  compact = false,
  paused = false,
  className = '',
}: MeridianVeilProps) {
  const host = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const sync = useRef<()=>void>(()=>{});
  const [activeTheme, setActiveTheme] = useState<MeridianVeilTheme>(theme);

  // Sync external theme changes
  useEffect(() => {
    setActiveTheme(theme);
  }, [theme]);

  const options = useRef({
    theme: activeTheme,
    autoCycleThemes,
    meridianCount,
    pointsPerMeridian,
    waveAmplitude,
    speed,
    interactive,
    paused,
  });
  options.current = {
    theme: activeTheme,
    autoCycleThemes,
    meridianCount,
    pointsPerMeridian,
    waveAmplitude,
    speed,
    interactive,
    paused,
  };

  const gradientId = useId().replace(/:/g, '');
  const activeConfig = MERIDIAN_THEMES[activeTheme] ?? MERIDIAN_THEMES.mint;
  const fallbackPoints = useMemo(() => createMeridianFallbackPoints(36, 40), []);

  useEffect(() => sync.current(), [
    activeTheme,
    autoCycleThemes,
    meridianCount,
    pointsPerMeridian,
    waveAmplitude,
    speed,
    interactive,
    paused,
  ]);

  useEffect(() => {
    const root = host.current;
    const surface = canvas.current;
    if (!root || !surface) return;

    const media = matchMedia('(prefers-reduced-motion: reduce)');
    let renderer: THREE.WebGLRenderer | null = null;
    let gone = false;
    let lost = false;
    let visible = true;
    let raf = 0;
    let last = 0;
    let time = 0;
    let width = 1;
    let height = 1;
    let currentMCount = 0;
    let currentPCount = 0;
    let sampleStart = 0;
    let samples = 0;
    let userHeld = false;

    // Interaction springs
    let tiltX = 0;
    let tiltY = 0;
    let targetTiltX = 0;
    let targetTiltY = 0;
    let ptrX = 0;
    let ptrY = 0;
    let targetPtrX = 0;
    let targetPtrY = 0;
    let hoverState = 0;
    let targetHover = 0;

    // Auto-cycle timer
    let cycleTimer = 0;

    // Three.js Scene Setup
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 40);
    camera.position.z = 4.3;

    const centralGroup = new THREE.Group();
    scene.add(centralGroup);

    // Initial theme colors
    const initialConfig = MERIDIAN_THEMES[options.current.theme] ?? MERIDIAN_THEMES.mint;
    const currParticle1 = new THREE.Color(initialConfig.particle1);
    const currParticle2 = new THREE.Color(initialConfig.particle2);
    const currCore = new THREE.Color(initialConfig.core);
    const currHalo = new THREE.Color(initialConfig.halo);

    // 1. Layer 1: Atmospheric Halo
    const haloGeometry = new THREE.PlaneGeometry(3.6, 3.6);
    const haloUniforms = {
      uHaloColor: { value: currHalo },
      uHaloOpacity: { value: 0.95 },
    };
    const haloMaterial = new THREE.ShaderMaterial({
      uniforms: haloUniforms,
      vertexShader: haloVertexShader,
      fragmentShader: haloFragmentShader,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: false,
    });
    const haloMesh = new THREE.Mesh(haloGeometry, haloMaterial);
    haloMesh.position.z = -0.35;
    centralGroup.add(haloMesh);

    // 2. Layer 2: Inner Glass Core Sphere
    const coreGeometry = new THREE.SphereGeometry(0.98, 64, 64);
    const coreUniforms = {
      uCoreColor: { value: currCore },
      uCoreOpacity: { value: 0.85 },
      uTime: { value: 0 },
    };
    const coreMaterial = new THREE.ShaderMaterial({
      uniforms: coreUniforms,
      vertexShader: coreVertexShader,
      fragmentShader: coreFragmentShader,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: true,
    });
    const coreMesh = new THREE.Mesh(coreGeometry, coreMaterial);
    centralGroup.add(coreMesh);

    // 3. Layer 3: Particle Curtain Points
    const curtainUniforms = {
      uTime: { value: 0 },
      uWaveAmplitude: { value: waveAmplitude },
      uPixelRatio: { value: 1.0 },
      uPixelScale: { value: 1.0 },
      uPointer: { value: new THREE.Vector2(0, 0) },
      uHover: { value: 0 },
      uParticleColor1: { value: currParticle1 },
      uParticleColor2: { value: currParticle2 },
      uOpacity: { value: 0.92 },
    };
    const curtainMaterial = new THREE.ShaderMaterial({
      uniforms: curtainUniforms,
      vertexShader: curtainVertexShader,
      fragmentShader: curtainFragmentShader,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: true,
    });
    const curtainPoints = new THREE.Points(new THREE.BufferGeometry(), curtainMaterial);
    curtainPoints.frustumCulled = false;
    centralGroup.add(curtainPoints);

    function stop() {
      if (raf) {
        cancelAnimationFrame(raf);
        raf = 0;
      }
    }

    function updateGeometry(mCount: number, pCount: number) {
      const data = createMeridianGeometry(mCount, pCount);
      const next = new THREE.BufferGeometry();
      next.setAttribute('position', new THREE.BufferAttribute(data.positions, 3));
      next.setAttribute('aUv', new THREE.BufferAttribute(data.uvs, 2));
      curtainPoints.geometry.dispose();
      curtainPoints.geometry = next;
      currentMCount = data.meridianCount;
      currentPCount = data.pointsPerMeridian;
      root!.dataset.particles = String(data.total);
    }

    function draw() {
      if (!renderer || gone || lost) return;
      const o = options.current;

      const targetM = compact ? Math.min(o.meridianCount, 40) : o.meridianCount;
      const targetP = compact ? Math.min(o.pointsPerMeridian, 100) : o.pointsPerMeridian;
      if (currentMCount !== targetM || currentPCount !== targetP) {
        updateGeometry(targetM, targetP);
      }

      const targetCfg = MERIDIAN_THEMES[o.theme] ?? MERIDIAN_THEMES.mint;
      const targetP1 = new THREE.Color(targetCfg.particle1);
      const targetP2 = new THREE.Color(targetCfg.particle2);
      const targetC = new THREE.Color(targetCfg.core);
      const targetH = new THREE.Color(targetCfg.halo);

      // Smooth color morphing
      currParticle1.lerp(targetP1, 0.08);
      currParticle2.lerp(targetP2, 0.08);
      currCore.lerp(targetC, 0.08);
      currHalo.lerp(targetH, 0.08);

      curtainUniforms.uTime.value = media.matches ? 0 : time;
      curtainUniforms.uWaveAmplitude.value = meridianClamp(o.waveAmplitude, 0, 1.5);
      curtainUniforms.uHover.value = media.matches || !o.interactive ? 0 : hoverState;
      curtainUniforms.uPointer.value.set(ptrX, ptrY);

      coreUniforms.uTime.value = media.matches ? 0 : time;

      // Group rotation
      if (!media.matches) {
        centralGroup.rotation.y += o.speed * 0.005;
      }
      centralGroup.rotation.x = tiltY;
      centralGroup.rotation.z = -tiltX * 0.35;

      renderer.render(scene, camera);

      root!.dataset.ready = 'true';
      root!.dataset.theme = o.theme;
      root!.dataset.sceneTime = curtainUniforms.uTime.value.toFixed(3);
    }

    function tick(now: number) {
      raf = 0;
      if (gone || lost || !root!.isConnected || !visible || document.hidden) return;
      if (options.current.paused || userHeld || media.matches) {
        draw();
        return;
      }

      const elapsed = now - last;
      if (elapsed < 1000 / 60 - 0.5) {
        raf = requestAnimationFrame(tick);
        return;
      }

      const dt = Math.min(0.05, elapsed / 1000);
      last = now;
      time += dt * options.current.speed;

      // Auto cycle themes if enabled
      if (options.current.autoCycleThemes) {
        cycleTimer += dt;
        if (cycleTimer >= 6.5) {
          cycleTimer = 0;
          const currentIdx = THEME_KEYS.indexOf(options.current.theme);
          const nextTheme = THEME_KEYS[(currentIdx + 1) % THEME_KEYS.length];
          setActiveTheme(nextTheme);
        }
      }

      // Smooth interaction spring dampening
      const springFactor = 1 - Math.exp(-dt * 6.5);
      tiltX += (targetTiltX - tiltX) * springFactor;
      tiltY += (targetTiltY - tiltY) * springFactor;
      ptrX += (targetPtrX - ptrX) * springFactor;
      ptrY += (targetPtrY - ptrY) * springFactor;
      hoverState += (targetHover - hoverState) * springFactor;

      draw();

      samples++;
      if (now - sampleStart >= 750) {
        root!.dataset.fps = ((samples * 1000) / (now - sampleStart)).toFixed(1);
        sampleStart = now;
        samples = 0;
      }

      raf = requestAnimationFrame(tick);
    }

    function wake() {
      if (!gone && !lost && renderer && !raf && visible && !document.hidden) {
        last = sampleStart = performance.now();
        samples = 0;
        raf = requestAnimationFrame(tick);
      }
    }

    function resize() {
      const box = root!.getBoundingClientRect();
      width = Math.max(1, box.width);
      height = Math.max(1, box.height);
      if (!renderer) return;

      const dpr = Math.min(window.devicePixelRatio || 1, compact ? 1 : 2);
      renderer.setPixelRatio(dpr);
      renderer.setSize(width, height, false);

      camera.aspect = width / height;
      camera.position.z = width < height ? 4.3 * Math.max(1, 0.72 / camera.aspect) : 4.3;
      camera.updateProjectionMatrix();

      curtainUniforms.uPixelRatio.value = dpr;
      curtainUniforms.uPixelScale.value = (height * dpr) / (2 * Math.tan((38 * Math.PI) / 360));

      draw();
      wake();
    }

    function changed() {
      stop();
      if (!options.current.interactive) targetHover = 0;
      if (media.matches) {
        tiltX = tiltY = targetTiltX = targetTiltY = 0;
        ptrX = ptrY = targetPtrX = targetPtrY = 0;
        hoverState = targetHover = 0;
      }
      draw();
      wake();
    }
    sync.current = changed;

    function visibility() {
      stop();
      wake();
    }

    function move(event: PointerEvent) {
      if (!options.current.interactive || options.current.paused || userHeld || media.matches) return;
      const box = root!.getBoundingClientRect();
      const nx = ((event.clientX - box.left) / width) * 2 - 1;
      const ny = 1 - ((event.clientY - box.top) / height) * 2;

      targetTiltX = meridianClamp(nx * 0.45, -0.6, 0.6);
      targetTiltY = meridianClamp(-ny * 0.45, -0.6, 0.6);
      targetPtrX = meridianClamp(nx, -1, 1);
      targetPtrY = meridianClamp(ny, -1, 1);
      targetHover = 1;
      wake();
    }

    function leave() {
      targetTiltX = 0;
      targetTiltY = 0;
      targetHover = 0;
      wake();
    }

    function key(event: KeyboardEvent) {
      if (event.target !== root || media.matches || options.current.paused) return;
      if (event.key === ' ') {
        event.preventDefault();
        userHeld = !userHeld;
        root!.dataset.held = String(userHeld);
        changed();
      } else if (event.key === 'Home') {
        leave();
      } else if (options.current.interactive && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) {
        event.preventDefault();
        targetTiltX = meridianClamp(targetTiltX + (event.key === 'ArrowLeft' ? -0.15 : event.key === 'ArrowRight' ? 0.15 : 0), -0.6, 0.6);
        targetTiltY = meridianClamp(targetTiltY + (event.key === 'ArrowUp' ? -0.15 : event.key === 'ArrowDown' ? 0.15 : 0), -0.6, 0.6);
        targetHover = 1;
        wake();
      } else if (['1', '2', '3', '4', '5'].includes(event.key)) {
        const idx = Number(event.key) - 1;
        if (THEME_KEYS[idx]) {
          setActiveTheme(THEME_KEYS[idx]);
        }
      } else if (event.key.toLowerCase() === 't') {
        const currentIdx = THEME_KEYS.indexOf(options.current.theme);
        const nextTheme = THEME_KEYS[(currentIdx + 1) % THEME_KEYS.length];
        setActiveTheme(nextTheme);
      }
    }

    function contextLost(event: Event) {
      event.preventDefault();
      lost = true;
      stop();
      delete root!.dataset.ready;
    }

    function contextRestored() {
      lost = false;
      resize();
      wake();
    }

    try {
      renderer = new THREE.WebGLRenderer({
        canvas: surface,
        alpha: true,
        antialias: true,
        powerPreference: 'high-performance',
      });
      renderer.setClearColor(0x000000, 0);
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      delete root.dataset.failed;
    } catch {
      root.dataset.failed = 'true';
    }

    const sizeObserver = new ResizeObserver(resize);
    const intersectObserver = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      visibility();
    });

    surface.addEventListener('webglcontextlost', contextLost);
    surface.addEventListener('webglcontextrestored', contextRestored);
    root.addEventListener('pointermove', move);
    root.addEventListener('pointerdown', move);
    root.addEventListener('pointerleave', leave);
    root.addEventListener('pointercancel', leave);
    root.addEventListener('keydown', key);
    media.addEventListener('change', changed);
    document.addEventListener('visibilitychange', visibility);

    sizeObserver.observe(root);
    intersectObserver.observe(root);
    resize();

    return () => {
      gone = true;
      stop();
      sync.current = () => {};
      sizeObserver.disconnect();
      intersectObserver.disconnect();

      root.removeEventListener('pointermove', move);
      root.removeEventListener('pointerdown', move);
      root.removeEventListener('pointerleave', leave);
      root.removeEventListener('pointercancel', leave);
      root.removeEventListener('keydown', key);
      media.removeEventListener('change', changed);
      document.removeEventListener('visibilitychange', visibility);
      surface.removeEventListener('webglcontextlost', contextLost);
      surface.removeEventListener('webglcontextrestored', contextRestored);

      curtainPoints.geometry.dispose();
      curtainMaterial.dispose();
      coreGeometry.dispose();
      coreMaterial.dispose();
      haloGeometry.dispose();
      haloMaterial.dispose();

      centralGroup.clear();
      renderer?.dispose();
      if (!root.isConnected) renderer?.forceContextLoss();
      surface.width = surface.height = 0;
      delete root.dataset.ready;
    };
  }, [compact]);

  return (
    <div
      ref={host}
      className={`meridian-veil ${className}`}
      style={{ backgroundColor: activeConfig.bg }}
      tabIndex={compact ? -1 : 0}
      role="group"
      aria-label="Meridian Veil, a generative 3D sphere of particle meridians with floating curtain physics. Move pointer to influence the veil. Arrow keys tilt, Space pauses or resumes."
    >
      <style>{styles}</style>

      {/* Accessible Static SVG Fallback */}
      <svg className="meridian-veil-fallback" viewBox="-1.5 -1.5 3 3" aria-hidden="true">
        <defs>
          <radialGradient id={`glow-${gradientId}`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={activeConfig.halo} stopOpacity="0.5" />
            <stop offset="65%" stopColor={activeConfig.core} stopOpacity="0.18" />
            <stop offset="100%" stopColor={activeConfig.bg} stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle cx="0" cy="0" r="1.3" fill={`url(#glow-${gradientId})`} />
        <circle cx="0" cy="0" r="0.95" fill={activeConfig.core} fillOpacity="0.12" stroke={activeConfig.core} strokeOpacity="0.35" strokeWidth="0.02" />
        <g fill={activeConfig.particle1}>
          {fallbackPoints.map((p, i) => (
            <circle
              key={i}
              cx={p.x.toFixed(4)}
              cy={p.y.toFixed(4)}
              r="0.012"
              opacity={p.opacity.toFixed(3)}
            />
          ))}
        </g>
      </svg>

      <canvas ref={canvas} aria-hidden="true" />

      {/* Optional Central Label */}
      {centerLabel && (
        <div className="meridian-veil-label" aria-hidden="true">
          <span>{centerLabel}</span>
        </div>
      )}

      {/* Minimalist Theme Switcher UI */}
      {showThemeSwitcher && (
        <div className="meridian-veil-switcher" role="toolbar" aria-label="Meridian Veil color schemes">
          {THEME_KEYS.map((key) => {
            const item = MERIDIAN_THEMES[key];
            const isSelected = activeTheme === key;
            return (
              <button
                key={key}
                type="button"
                className={`theme-dot ${isSelected ? 'is-active' : ''}`}
                style={{ '--dot-color': item.particle1 } as React.CSSProperties}
                aria-label={`Switch to ${item.label} theme`}
                aria-pressed={isSelected}
                onClick={() => setActiveTheme(key)}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

const styles = `
.meridian-veil {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 0;
  overflow: hidden;
  background: #000000;
  isolation: isolate;
  outline: none;
  user-select: none;
  transition: background-color 650ms cubic-bezier(0.22, 1, 0.36, 1);
}
.meridian-veil > canvas,
.meridian-veil-fallback {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  display: block;
  pointer-events: none;
  transition: opacity 700ms cubic-bezier(0.22, 1, 0.36, 1);
}
.meridian-veil > canvas {
  opacity: 0;
}
.meridian-veil[data-ready="true"] > canvas {
  opacity: 1;
}
.meridian-veil[data-ready="true"] .meridian-veil-fallback {
  opacity: 0;
}
.meridian-veil:focus-visible {
  outline: 2px solid rgba(255, 255, 255, 0.6);
  outline-offset: -4px;
}
.meridian-veil-label {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  color: #ffffff;
  font-family: var(--sans, Inter, system-ui, sans-serif);
  font-size: 1.1rem;
  font-weight: 500;
  letter-spacing: 0.05em;
  text-shadow: 0 2px 10px rgba(0, 0, 0, 0.6);
  z-index: 2;
}
.meridian-veil-switcher {
  position: absolute;
  bottom: 16px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  border-radius: 9999px;
  background: rgba(255, 255, 255, 0.06);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  z-index: 4;
}
.theme-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: none;
  padding: 0;
  cursor: pointer;
  background: var(--dot-color, #ffffff);
  opacity: 0.5;
  transition: transform 200ms ease, opacity 200ms ease, box-shadow 200ms ease;
}
.theme-dot:hover {
  opacity: 0.85;
  transform: scale(1.18);
}
.theme-dot.is-active {
  opacity: 1;
  transform: scale(1.3);
  box-shadow: 0 0 8px var(--dot-color, #ffffff);
}
.theme-dot:focus-visible {
  outline: 2px solid #ffffff;
  outline-offset: 2px;
}
@media (prefers-reduced-motion: reduce) {
  .meridian-veil > canvas,
  .meridian-veil-fallback,
  .meridian-veil {
    transition: none;
  }
}
`;
