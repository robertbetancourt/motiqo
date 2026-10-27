"use client";

import {
  useCallback,
  useEffect,
  useRef,
  type PointerEvent as ReactPointerEvent,
  type WheelEvent as ReactWheelEvent,
} from "react";
import * as THREE from "three";
import { effectRuntime } from "./effect-runtime";

export interface OrbitStageHeroProps {
  titleMuted?: string;
  titleBright?: string;
  ctaText?: string;
  orbitSpeed?: number;
  images?: string[];
  screenSrc?: string;
  lineColor?: string;
  lineColor2?: string;
  lineColor3?: string;
  lineSpeed?: number;
  paused?: boolean;
  compact?: boolean;
  className?: string;
}

export const DEFAULT_ORBIT_IMAGES = [
  "/media/gallery/image-01.webp",
  "/media/gallery/image-02.webp",
  "/media/gallery/image-03.webp",
  "/media/gallery/image-04.webp",
  "/media/gallery/image-05.webp",
  "/media/gallery/image-06.webp",
  "/media/gallery/image-07.webp",
  "/media/gallery/image-08.webp",
  "/media/gallery/image-09.webp",
  "/media/gallery/image-10.webp",
];
export const DEFAULT_ORBIT_SCREEN = "/media/lumi-orbit-screen.png";

// Fallback procedural visual textures for instantaneous zero-latency offline loading
function createFallbackTexture(index: number): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 340;
  const ctx = canvas.getContext("2d")!;
  const w = canvas.width,
    h = canvas.height;

  const palettes = [
    ["#1e1035", "#ff007f", "#39ff14"],
    ["#091a28", "#00f0ff", "#a855f7"],
    ["#20081c", "#ec4899", "#84cc16"],
    ["#0b1e13", "#22c55e", "#06b6d4"],
    ["#180e29", "#8b5cf6", "#f43f5e"],
    ["#081726", "#38bdf8", "#4ade80"],
    ["#220d18", "#f43f5e", "#a3e635"],
    ["#120826", "#c084fc", "#22d3ee"],
  ];
  const [bg, c1, c2] = palettes[index % palettes.length];

  const grad = ctx.createLinearGradient(0, 0, w, h);
  grad.addColorStop(0, bg);
  grad.addColorStop(0.5, "#0b0d14");
  grad.addColorStop(1, bg);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  // Neon volumetric beams
  ctx.save();
  ctx.globalCompositeOperation = "screen";
  const g1 = ctx.createRadialGradient(
    w * 0.3,
    h * 0.4,
    10,
    w * 0.3,
    h * 0.4,
    w * 0.6,
  );
  g1.addColorStop(0, c1);
  g1.addColorStop(1, "transparent");
  ctx.fillStyle = g1;
  ctx.fillRect(0, 0, w, h);

  const g2 = ctx.createRadialGradient(
    w * 0.75,
    h * 0.7,
    10,
    w * 0.75,
    h * 0.7,
    w * 0.5,
  );
  g2.addColorStop(0, c2);
  g2.addColorStop(1, "transparent");
  ctx.fillStyle = g2;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();

  // Silhouette / stage lights
  ctx.fillStyle = "#050608";
  ctx.beginPath();
  ctx.ellipse(w * 0.5, h * 0.95, w * 0.42, h * 0.3, 0, 0, Math.PI * 2);
  ctx.fill();

  // Fine stage linework / concert energy
  ctx.strokeStyle = "rgba(255,255,255,0.18)";
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 6; i++) {
    ctx.beginPath();
    ctx.moveTo(w * 0.15 + i * 40, h);
    ctx.lineTo(w * 0.5 + (i - 2.5) * 60, h * 0.25);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  return texture;
}

// GLSL for the Bi-Chromatic Slipstream Ribbons
const SLIPSTREAM_VERTEX = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vWorldPos;
  void main() {
    vUv = uv;
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPos = worldPos.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

const SLIPSTREAM_FRAGMENT = /* glsl */ `
  precision highp float;
  uniform float uTime;
  uniform float uIntensity;
  uniform vec3 uLineColor;
  uniform vec3 uLineColor2;
  uniform vec3 uLineColor3;
  uniform float uLinePhase;
  uniform float uDirection;
  varying vec2 vUv;
  varying vec3 vWorldPos;

  void main() {
    // High-speed energy pulse running along the closed ribbon loop
    float speed = 0.65;
    float pulse = sin((vUv.x - uLinePhase * speed * uDirection) * 32.0) * 0.5 + 0.5;
    float streak = pow(pulse, 4.5) * 1.1 + 0.65;

    // Transverse Gaussian core falloff
    float core = pow(1.0 - abs(vUv.y - 0.5) * 2.0, 2.5);

    // Three distinct spatial zones travel continuously around the loop.
    float zone = fract(vUv.x - uLinePhase * 0.065 * uDirection) * 3.0;
    float blend = smoothstep(0.0, 1.0, fract(zone));
    vec3 ribbonColor = zone < 1.0 ? mix(uLineColor,uLineColor2,blend)
      : zone < 2.0 ? mix(uLineColor2,uLineColor3,blend)
      : mix(uLineColor3,uLineColor,blend);

    // Incandescent white core for high physical brightness
    vec3 whiteCore = vec3(1.0, 1.0, 1.0) * pow(core, 8.0) * 0.28;

    vec3 finalColor = (ribbonColor * streak + whiteCore) * core * uIntensity;
    gl_FragColor = vec4(finalColor, core * streak * 0.92);
  }
`;

// GLSL for the Curved Media Cards (Cylindrical arc + SDF soft rounded corners + edge reflection)
const CARD_VERTEX = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vWorldPos;

  void main() {
    vUv = uv;
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPos = worldPos.xyz;
    vNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

const CARD_FRAGMENT = /* glsl */ `
  precision highp float;
  uniform sampler2D uTexture;
  uniform float uHover;
  uniform vec3 uZoneReflection;
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vWorldPos;

  // Signed distance field for rounded box corners
  float roundedBoxSDF(vec2 p, vec2 b, float r) {
    vec2 d = abs(p) - b + vec2(r);
    return min(max(d.x, d.y), 0.0) + length(max(d, 0.0)) - r;
  }

  void main() {
    // Normalized centered UV coordinates [-1, 1]
    vec2 p = (vUv - 0.5) * 2.0;
    float d = roundedBoxSDF(p, vec2(0.96, 0.96), 0.14);
    if (d > 0.0) discard;

    vec4 texColor = texture2D(uTexture, vUv);

    // Specular border ring
    float border = 1.0 - smoothstep(0.0, 0.018, abs(d));
    vec3 edgeColor = vec3(1.0) * border * 0.35;

    // Subtle bottom reflection matching current orbital zone (Lime in front, Violet in back)
    float bottomRim = (1.0 - smoothstep(0.0, 0.24, vUv.y));
    vec3 reflection = uZoneReflection * bottomRim * 0.55;

    // Hover brightness highlight
    vec3 finalColor = texColor.rgb * (1.0 + uHover * 0.25) + edgeColor + reflection;

    gl_FragColor = vec4(finalColor, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

export default function OrbitStage({
  titleMuted = "Your Motion.",
  titleBright = "Your System. One Engine",
  orbitSpeed = 1.0,
  images = DEFAULT_ORBIT_IMAGES,
  screenSrc = DEFAULT_ORBIT_SCREEN,
  lineColor = "#b898ff",
  lineColor2 = "#a3e635",
  lineColor3 = "#ec4899",
  lineSpeed = 1,
  paused = false,
  compact = false,
  className = "",
}: OrbitStageHeroProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Parallax tilt state for the background monumental text
  const options = useRef({ paused, orbitSpeed, lineColor, lineColor2, lineColor3, lineSpeed });
  options.current = {
    paused,
    lineColor: /^#[\da-f]{6}$/i.test(lineColor) ? lineColor : "#b898ff",
    lineColor2: /^#[\da-f]{6}$/i.test(lineColor2) ? lineColor2 : "#a3e635",
    lineColor3: /^#[\da-f]{6}$/i.test(lineColor3) ? lineColor3 : "#ec4899",
    lineSpeed: Number.isFinite(lineSpeed) ? Math.max(0,Math.min(4,lineSpeed)) : 1,
    orbitSpeed: Number.isFinite(orbitSpeed)
      ? Math.max(0, Math.min(3, orbitSpeed))
      : 1,
  };
  const wake = useRef<() => void>(() => {});

  // References for the 3D scene loop and interaction
  const sceneState = useRef<{
    renderer: THREE.WebGLRenderer | null;
    camera: THREE.PerspectiveCamera | null;
    scene: THREE.Scene | null;
    orbitGroup: THREE.Group | null;
    cardMeshes: THREE.Mesh[] | null;
    slipstreamMaterials: THREE.ShaderMaterial[];
    cardMaterials: THREE.ShaderMaterial[];
    orbitAngle: number;
    angularVelocity: number;
    targetCameraZ: number;
    currentCameraZ: number;
    hoveredIndex: number;
    isDragging: boolean;
    lastPointerX: number;
    dragIntensity: number;
    clockTime: number;
    reqId: number;
  }>({
    renderer: null,
    camera: null,
    scene: null,
    orbitGroup: null,
    cardMeshes: null,
    slipstreamMaterials: [],
    cardMaterials: [],
    orbitAngle: 0,
    angularVelocity: 0,
    targetCameraZ: 13.6,
    currentCameraZ: 13.6,
    hoveredIndex: -1,
    isDragging: false,
    lastPointerX: 0,
    dragIntensity: 1.0,
    clockTime: 0,
    reqId: 0,
  });

  // Pointer drag to accelerate orbital rotation with spring damping
  const handlePointerDown = useCallback((e: ReactPointerEvent) => {
    const s = sceneState.current;
    if ((e.target as HTMLElement).closest("button")) return;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    s.isDragging = true;
    s.lastPointerX = e.clientX;
  }, []);

  const handlePointerMove = useCallback((e: ReactPointerEvent) => {
    const s = sceneState.current;
    if (s.isDragging) {
      const deltaX = e.clientX - s.lastPointerX;
      s.lastPointerX = e.clientX;
      s.angularVelocity += deltaX * 0.0035;
      s.dragIntensity = Math.min(
        2.4,
        s.dragIntensity + Math.abs(deltaX) * 0.05,
      );
    }

    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const ny = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      containerRef.current.style.setProperty("--orbit-px", `${nx * 6}px`);
      containerRef.current.style.setProperty("--orbit-py", `${-ny * 4}px`);
      wake.current();

      // Raycaster for card hover focus
      if (s.camera && s.cardMeshes) {
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(new THREE.Vector2(nx, ny), s.camera);
        const intersects = raycaster.intersectObjects(s.cardMeshes, false);
        if (intersects.length > 0) {
          const hitMesh = intersects[0].object as THREE.Mesh;
          s.hoveredIndex = s.cardMeshes.indexOf(hitMesh);
        } else {
          s.hoveredIndex = -1;
        }
      }
    }
  }, []);

  const handlePointerUp = useCallback(() => {
    sceneState.current.isDragging = false;
  }, []);

  // Mouse wheel scroll to smoothly zoom the camera
  const handleWheel = useCallback((e: ReactWheelEvent) => {
    const s = sceneState.current;
    wake.current();
    s.targetCameraZ = Math.min(
      16.0,
      Math.max(12.6, s.targetCameraZ + e.deltaY * 0.003),
    );
  }, []);

  useEffect(() => {
    const host = containerRef.current;
    const canvas = canvasRef.current;
    if (!host || !canvas) return;

    let gone = false;
    const textures = new Set<THREE.Texture>();
    let width = host.clientWidth || 1100;
    let height = host.clientHeight || 680;

    // 1. Initialize Three.js Scene and Renderer
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 100);
    camera.position.set(0, 1.7, 13.6);
    camera.lookAt(0, -0.5, 0);

    let renderer: THREE.WebGLRenderer | null = null;
    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        alpha: true,
        antialias: true,
        powerPreference: "high-performance",
      });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setSize(width, height);
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.15;
    } catch {
      host.dataset.gl = "off";
      host.dataset.ready = "true";
      return;
    }

    // Light the physical frame so its thickness and side controls remain visible.
    scene.add(new THREE.HemisphereLight(0xd8d2e2, 0x080808, 1.4));
    const keyLight = new THREE.DirectionalLight(0xffffff, 3.2);
    keyLight.position.set(-4, 6, 8);
    scene.add(keyLight);
    const rimLight = new THREE.DirectionalLight(0xbca7d8, 1.6);
    rimLight.position.set(-5, 2, -3);
    scene.add(rimLight);
    const fadePhone = (material: THREE.Material) => {
      material.transparent = true;
      material.onBeforeCompile = (shader) => {
        shader.vertexShader =
          "varying float vPhoneY;\n" +
          shader.vertexShader.replace(
            "#include <begin_vertex>",
            "#include <begin_vertex>\nvPhoneY=(position.y+2.375)/4.75;",
          );
        shader.fragmentShader =
          "varying float vPhoneY;\n" +
          shader.fragmentShader.replace(
            "#include <dithering_fragment>",
            "#include <dithering_fragment>\nfloat verticalMask=smoothstep(0.35,0.58,vPhoneY); gl_FragColor.rgb=mix(vec3(0.0),gl_FragColor.rgb,verticalMask); gl_FragColor.a*=verticalMask; if(verticalMask<=0.0)discard;",
          );
      };
      material.customProgramCacheKey = () => "orbit-phone-half-fade-v2";
    };

    // 2. Central Monolith: Sleek Dark Glass UI Slab at (0, -0.35, 0)
    const monolithGroup = new THREE.Group();
    monolithGroup.position.set(0, -1.0, 0);
    monolithGroup.rotation.y = 0.24;
    monolithGroup.rotation.x = -0.09;
    monolithGroup.rotation.z = -0.035;
    monolithGroup.name = "OrbitStage phone mockup";

    // Rounded chassis geometry
    const shape = new THREE.Shape();
    const mw = 2.18,
      mh = 4.75,
      mr = 0.42;
    const x0 = -mw / 2,
      y0 = -mh / 2;
    shape.moveTo(x0 + mr, y0);
    shape.lineTo(x0 + mw - mr, y0);
    shape.quadraticCurveTo(x0 + mw, y0, x0 + mw, y0 + mr);
    shape.lineTo(x0 + mw, y0 + mh - mr);
    shape.quadraticCurveTo(x0 + mw, y0 + mh, x0 + mw - mr, y0 + mh);
    shape.lineTo(x0 + mr, y0 + mh);
    shape.quadraticCurveTo(x0, y0 + mh, x0, y0 + mh - mr);
    shape.lineTo(x0, y0 + mr);
    shape.quadraticCurveTo(x0, y0, x0 + mr, y0);

    const chassisGeom = new THREE.ExtrudeGeometry(shape, {
      depth: 0.22,
      bevelEnabled: true,
      bevelSegments: 4,
      steps: 1,
      bevelSize: 0.035,
      bevelThickness: 0.035,
    });
    chassisGeom.center();

    const chassisMat = new THREE.MeshPhysicalMaterial({
      color: 0x4a4b57,
      metalness: 0.65,
      roughness: 0.28,
      clearcoat: 1.0,
      clearcoatRoughness: 0.12,
    });
    fadePhone(chassisMat);
    const chassisMesh = new THREE.Mesh(chassisGeom, chassisMat);
    monolithGroup.add(chassisMesh);

    // The supplied Lumi screen retains its complete portrait aspect inside a rounded chassis.
    const screenShape = new THREE.Shape();
    const sw = mw - 0.085,
      sh = mh - 0.085,
      sr = 0.38;
    screenShape.moveTo(-sw / 2 + sr, -sh / 2);
    screenShape.lineTo(sw / 2 - sr, -sh / 2);
    screenShape.quadraticCurveTo(sw / 2, -sh / 2, sw / 2, -sh / 2 + sr);
    screenShape.lineTo(sw / 2, sh / 2 - sr);
    screenShape.quadraticCurveTo(sw / 2, sh / 2, sw / 2 - sr, sh / 2);
    screenShape.lineTo(-sw / 2 + sr, sh / 2);
    screenShape.quadraticCurveTo(-sw / 2, sh / 2, -sw / 2, sh / 2 - sr);
    screenShape.lineTo(-sw / 2, -sh / 2 + sr);
    screenShape.quadraticCurveTo(-sw / 2, -sh / 2, -sw / 2 + sr, -sh / 2);
    const screenGeom = new THREE.ShapeGeometry(screenShape, 16),
      screenUV = screenGeom.attributes.uv,
      screenPosition = screenGeom.attributes.position;
    for (let i = 0; i < screenUV.count; i++)
      screenUV.setXY(
        i,
        screenPosition.getX(i) / sw + 0.5,
        screenPosition.getY(i) / sh + 0.5,
      );
    const screenMat = new THREE.MeshBasicMaterial({
      color: "#ffffff",
      toneMapped: false,
    });
    fadePhone(screenMat);
    const screenMesh = new THREE.Mesh(screenGeom, screenMat);
    screenMesh.name = "Lumi display with lower fade";
    screenMesh.position.z = 0.153;
    monolithGroup.add(screenMesh);
    const bezelShape = shape.clone();
    bezelShape.holes.push(screenShape);
    const bezelMaterial = new THREE.MeshBasicMaterial({color:0x98939f,toneMapped:false});
    fadePhone(bezelMaterial);
    const bezel = new THREE.Mesh(new THREE.ShapeGeometry(bezelShape,32),bezelMaterial);
    bezel.name = "Fine illuminated screen bezel";
    bezel.position.z = 0.15;
    monolithGroup.add(bezel);
    const hardwareMaterial = new THREE.MeshStandardMaterial({
      color: 0x4a4b57,
      metalness: 0.75,
      roughness: 0.28,
    });
    fadePhone(hardwareMaterial);
    for (const [x, y, height] of [
      [-mw / 2 - 0.025, 1.15, 0.31],
      [-mw / 2 - 0.025, 0.65, 0.31],
      [-mw / 2 - 0.025, 1.65, 0.14],
      [mw / 2 + 0.025, 1.03, 0.49],
    ]) {
      const control = new THREE.Mesh(
        new THREE.BoxGeometry(0.034, height, 0.095),
        hardwareMaterial,
      );
      control.position.set(x, y, -0.025);
      monolithGroup.add(control);
    }
    const antenna = new THREE.Mesh(new THREE.BoxGeometry(0.012,0.025,0.22),new THREE.MeshBasicMaterial({color:0x9a99a5}));
    antenna.position.set(-mw/2-0.035,1.98,0);
    monolithGroup.add(antenna);
    const speakerMaterial = new THREE.MeshBasicMaterial({ color: 0x181818 }),
      speaker = new THREE.Mesh(
        new THREE.BoxGeometry(0.3, 0.018, 0.012),
        speakerMaterial,
      );
    speaker.position.set(0, mh / 2 - 0.08, 0.184);
    monolithGroup.add(speaker);

    const textureLoader = new THREE.TextureLoader();
    textureLoader.load(
      screenSrc,
      (texture) => {
        if (gone) {
          texture.dispose();
          return;
        }
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.anisotropy = renderer!.capabilities.getMaxAnisotropy();
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;
        texture.generateMipmaps = false;
        textures.add(texture);
        screenMat.map = texture;
        screenMat.needsUpdate = true;
        host.dataset.screenLoaded = "true";
        wake.current();
      },
      undefined,
      () => {
        host.dataset.screenLoaded = "false";
      },
    );

    scene.add(monolithGroup);

    // 3. Orbital Ring Group: Inclined 3D Orbit (tiltZ = -9°, tiltX = 16°)
    const orbitGroup = new THREE.Group();
    orbitGroup.position.set(0, -1.45, 0);
    orbitGroup.rotation.x = 0.28; // ~16 deg
    orbitGroup.rotation.z = -0.15; // ~-9 deg
    scene.add(orbitGroup);

    // Atmospheric Backlight Glows behind the ring
    const glowGeom = new THREE.PlaneGeometry(5, 5);

    // Lower-Left Neon Lime Glow
    const limeGlowCanvas = document.createElement("canvas");
    limeGlowCanvas.width = 256;
    limeGlowCanvas.height = 256;
    const lCtx = limeGlowCanvas.getContext("2d")!;
    const lGrad = lCtx.createRadialGradient(128, 128, 10, 128, 128, 128);
    lGrad.addColorStop(0, "rgba(163, 230, 53, 0.42)");
    lGrad.addColorStop(0.5, "rgba(74, 222, 128, 0.18)");
    lGrad.addColorStop(1, "transparent");
    lCtx.fillStyle = lGrad;
    lCtx.fillRect(0, 0, 256, 256);
    const limeGlowTex = new THREE.CanvasTexture(limeGlowCanvas);
    const limeGlowMat = new THREE.MeshBasicMaterial({
      map: limeGlowTex,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    limeGlowMat.opacity = 0.22;
    const limeGlowMesh = new THREE.Mesh(glowGeom, limeGlowMat);
    limeGlowMesh.position.set(-3.2, -1.8, -1.5);
    scene.add(limeGlowMesh);

    // Upper-Right Violet/Magenta Glow
    const violetGlowCanvas = document.createElement("canvas");
    violetGlowCanvas.width = 256;
    violetGlowCanvas.height = 256;
    const vCtx = violetGlowCanvas.getContext("2d")!;
    const vGrad = vCtx.createRadialGradient(128, 128, 10, 128, 128, 128);
    vGrad.addColorStop(0, "rgba(168, 85, 247, 0.45)");
    vGrad.addColorStop(0.5, "rgba(236, 72, 153, 0.20)");
    vGrad.addColorStop(1, "transparent");
    vCtx.fillStyle = vGrad;
    vCtx.fillRect(0, 0, 256, 256);
    const violetGlowTex = new THREE.CanvasTexture(violetGlowCanvas);
    const violetGlowMat = new THREE.MeshBasicMaterial({
      map: violetGlowTex,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    violetGlowMat.opacity = 0.22;
    const violetGlowMesh = new THREE.Mesh(glowGeom, violetGlowMat);
    violetGlowMesh.position.set(3.4, 1.6, -1.8);
    scene.add(violetGlowMesh);

    // 4. Volumetric Neon Slipstream Ribbons (4 Closed Tubes)
    const slipstreamMaterials: THREE.ShaderMaterial[] = [];
    const lowerRibbons = [
      { rOffset: 0.0, yOffset: 0.0, radius: 0.034 },
      { rOffset: -0.12, yOffset: -0.14, radius: 0.026 },
      { rOffset: 0.14, yOffset: 0.16, radius: 0.028 },
      { rOffset: 0.06, yOffset: -0.06, radius: 0.038 },
    ];

    const ribbonOffsets = [
      ...lowerRibbons.map((config) => ({
        ...config,
        height: -0.68,
        intensity: 1,
      })),
      ...lowerRibbons.map((config, index) => ({
        ...config,
        rOffset: config.rOffset + 0.06,
        height: 0.65 + index * 0.035,
        intensity: 0.32,
      })),
    ];
    host.dataset.trailLayers = "2";

    for (let r = 0; r < ribbonOffsets.length; r++) {
      const config = ribbonOffsets[r];
      for (const glow of [false, true]) {
        const segments = 256,
          positions = new Float32Array((segments + 1) * 6),
          uv = new Float32Array((segments + 1) * 4),
          indices: number[] = [];
        const halfWidth = glow ? 0.6 : config.radius * 5;
        for (let k = 0; k <= segments; k++) {
          const angle = (k / segments) * Math.PI * 2;
          for (let side = 0; side < 2; side++) {
            const width = (side * 2 - 1) * halfWidth,
              index = k * 2 + side;
            positions[index * 3] =
              Math.cos(angle) * (5.45 + config.rOffset + width);
            positions[index * 3 + 1] =
              Math.sin(angle * 2) * 0.08 + config.yOffset + config.height;
            positions[index * 3 + 2] =
              Math.sin(angle) * (2.85 + config.rOffset * 0.65 + width);
            uv[index * 2] = k / segments;
            uv[index * 2 + 1] = side;
          }
          if (k < segments) {
            const i = k * 2;
            indices.push(i, i + 1, i + 2, i + 1, i + 3, i + 2);
          }
        }
        const ribbon = new THREE.BufferGeometry();
        ribbon.setAttribute(
          "position",
          new THREE.BufferAttribute(positions, 3),
        );
        ribbon.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
        ribbon.setIndex(indices);
        const mat = new THREE.ShaderMaterial({
          vertexShader: SLIPSTREAM_VERTEX,
          fragmentShader: SLIPSTREAM_FRAGMENT,
          uniforms: {
            uTime: { value: 0 },
            uDirection: { value: config.height > 0 ? -1 : 1 },
            uLineColor: { value: new THREE.Color(options.current.lineColor) },
            uLineColor2: { value: new THREE.Color(options.current.lineColor2) },
            uLineColor3: { value: new THREE.Color(options.current.lineColor3) },
            uLinePhase: { value: 0 },
            uIntensity: { value: (glow ? 0.08 : 1) * config.intensity },
          },
          transparent: true,
          side: THREE.DoubleSide,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        });
        mat.userData.glowFactor = (glow ? 0.08 : 1) * config.intensity;
        mat.userData.layer = config.height > 0 ? "upper" : "lower";
        slipstreamMaterials.push(mat);
        orbitGroup.add(new THREE.Mesh(ribbon, mat));
      }
    }

    // 5. 8 Curved Media Cards with Cylindrical Geometry
    const cardMeshes: THREE.Mesh[] = [];
    const cardMaterials: THREE.ShaderMaterial[] = [];
    const cardCount = 10;
    const Rx = 5.2;
    const Rz = 2.65;

    // Segmented plane bent along the cylindrical arc
    const basePlane = new THREE.PlaneGeometry(2.15, 1.55, 32, 16);
    const posAttr = basePlane.attributes.position;
    const bendRadius = 3.6;
    for (let j = 0; j < posAttr.count; j++) {
      const px = posAttr.getX(j);
      const pz =
        bendRadius - Math.sqrt(Math.max(0, bendRadius * bendRadius - px * px));
      posAttr.setZ(j, -pz * 0.72);
    }
    basePlane.computeVertexNormals();

    const loader = new THREE.TextureLoader();
    loader.crossOrigin = "anonymous";

    for (let i = 0; i < cardCount; i++) {
      const initialTex = createFallbackTexture(i);
      textures.add(initialTex);

      // Upgrade with the local gallery texture
      const imgUrl = images[i % images.length];
      if (imgUrl) {
        loader.load(
          imgUrl,
          (loadedTex) => {
            if (gone) {
              loadedTex.dispose();
              return;
            }
            textures.add(loadedTex);
            loadedTex.minFilter = THREE.LinearFilter;
            loadedTex.magFilter = THREE.LinearFilter;
            loadedTex.colorSpace = THREE.SRGBColorSpace;
            cardMat.uniforms.uTexture.value = loadedTex;
            wake.current();
          },
          undefined,
          () => {
            // Keep fallback texture on network error
          },
        );
      }

      const cardMat = new THREE.ShaderMaterial({
        vertexShader: CARD_VERTEX,
        fragmentShader: CARD_FRAGMENT,
        uniforms: {
          uTexture: { value: initialTex },
          uHover: { value: 0.0 },
          uZoneReflection: { value: new THREE.Vector3(0.52, 0.8, 0.09) },
        },
        side: THREE.DoubleSide,
      });

      cardMaterials.push(cardMat);
      const cardMesh = new THREE.Mesh(basePlane.clone(), cardMat);
      cardMeshes.push(cardMesh);
      orbitGroup.add(cardMesh);
    }

    // Save references to state
    const s = sceneState.current;
    s.orbitAngle = -0.38;
    s.angularVelocity = 0;
    s.clockTime = 0;
    s.currentCameraZ = s.targetCameraZ = 13.6;
    s.renderer = renderer;
    s.camera = camera;
    s.scene = scene;
    s.orbitGroup = orbitGroup;
    s.cardMeshes = cardMeshes;
    s.slipstreamMaterials = slipstreamMaterials;
    s.cardMaterials = cardMaterials;

    // 6. Resize Observer for fluid responsiveness
    let lost = false, linePhase = 0;
    const clock = effectRuntime(
      host,
      canvas,
      (time, dt) => {
        if (lost) return false;
        s.clockTime = time;
        linePhase += dt * options.current.lineSpeed;
        // Inertial angular velocity update
        s.orbitAngle +=
          (s.angularVelocity + 0.28 * options.current.orbitSpeed) * dt;
        s.angularVelocity *= Math.pow(0.94, dt * 60);

        // Drag intensity decay back to baseline 1.0
        s.dragIntensity +=
          (1.0 - s.dragIntensity) * (1 - Math.pow(0.92, dt * 60));

        // Smooth camera zoom
        s.currentCameraZ +=
          (s.targetCameraZ - s.currentCameraZ) * (1 - Math.pow(0.9, dt * 60));
        camera.position.z = s.currentCameraZ;
        monolithGroup.rotation.set(-0.09, 0.24, -0.035);

        // Update slipstream ribbon uniforms
        for (const mat of s.slipstreamMaterials) {
          mat.uniforms.uTime.value = s.clockTime;
          mat.uniforms.uLineColor.value.set(options.current.lineColor);
          mat.uniforms.uLineColor2.value.set(options.current.lineColor2);
          mat.uniforms.uLineColor3.value.set(options.current.lineColor3);
          mat.uniforms.uLinePhase.value = linePhase;
          mat.uniforms.uIntensity.value =
            s.dragIntensity * (mat.userData.glowFactor ?? 1);
        }

        // Update each of the 8 orbital curved cards
        for (let i = 0; i < cardCount; i++) {
          const mesh = cardMeshes[i];
          const mat = cardMaterials[i];
          const theta = (i / cardCount) * Math.PI * 2 + s.orbitAngle;

          const cx = Math.cos(theta) * Rx;
          const cz = Math.sin(theta) * Rz;
          const cy = Math.sin(theta * 2.0) * 0.12;

          mesh.position.set(cx, cy, cz);

          // Card faces radially outward from center
          mesh.rotation.y = -theta + Math.PI / 2;

          // Hover scale & brightness boost
          const isHovered = s.hoveredIndex === i;
          const targetHover = isHovered ? 1.0 : 0.0;
          mat.uniforms.uHover.value +=
            (targetHover - mat.uniforms.uHover.value) * 0.15;
          const targetScale = isHovered ? 1.08 : 1.0;
          mesh.scale.set(targetScale, targetScale, targetScale);

          // Zone reflection: Lime in front-left (cz > 0, cx < 0), Violet in rear-right (cz < 0, cx > 0)
          const angle = Math.atan2(cz, cx);
          const blend = (Math.sin(angle - 0.6) + 1.0) * 0.5;
          // #84CC16 (Lime) to #A855F7 (Violet)
          mat.uniforms.uZoneReflection.value.set(
            THREE.MathUtils.lerp(0.66, 0.52, blend),
            THREE.MathUtils.lerp(0.33, 0.8, blend),
            THREE.MathUtils.lerp(0.97, 0.09, blend),
          );
        }
        renderer.render(scene, camera);
        host.dataset.gl = "on";
        host.dataset.orbitAngle = s.orbitAngle.toFixed(4);
        return host.dataset.screenLoaded !== undefined;
      },
      () => options.current.paused || lost,
      (w, h, dpr) => {
        renderer.setPixelRatio(dpr);
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
      },
      compact,
    );
    wake.current = clock.invalidate;
    const onLost = (event: Event) => {
      event.preventDefault();
      lost = true;
      host.dataset.gl = "off";
      clock.invalidate();
    };
    const onRestored = () => {
      lost = false;
      clock.invalidate();
    };
    canvas.addEventListener("webglcontextlost", onLost);
    canvas.addEventListener("webglcontextrestored", onRestored);

    // 8. Clean up upon unmount
    return () => {
      gone = true;
      clock.dispose();
      wake.current = () => {};
      canvas.removeEventListener("webglcontextlost", onLost);
      canvas.removeEventListener("webglcontextrestored", onRestored);
      const geometries = new Set<THREE.BufferGeometry>(),
        materials = new Set<THREE.Material>();
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          geometries.add(object.geometry);
          for (const material of Array.isArray(object.material)
            ? object.material
            : [object.material])
            materials.add(material);
        }
      });
      geometries.forEach((geometry) => geometry.dispose());
      textures.forEach((texture) => texture.dispose());
      renderer.dispose();
      materials.forEach((material) => material.dispose());
      limeGlowTex.dispose();
      violetGlowTex.dispose();
      basePlane.dispose();
    };
  }, [images, screenSrc, compact]);
  useEffect(() => wake.current(), [paused, orbitSpeed, lineColor, lineColor2, lineColor3, lineSpeed]);

  return (
    <div
      ref={containerRef}
      className={`orbit-stage-hero ${compact ? "orbit-compact" : ""} ${className}`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      onPointerCancel={handlePointerUp}
      tabIndex={0}
      role="region"
      data-paused={paused || undefined}
      onKeyDown={(event) => {
        if (event.target !== event.currentTarget) return;
        if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
          event.preventDefault();
          sceneState.current.angularVelocity +=
            event.key === "ArrowRight" ? 0.8 : -0.8;
          wake.current();
        }
      }}
      onWheel={handleWheel}
      aria-label="OrbitStage"
    >
      <style>{scopedStyles}</style>

      {/* Monumental Headline in Background (z-10) */}
      <div className="orbit-headline-container">
        <span className="orbit-title-muted">{titleMuted}</span>
        <span className="orbit-title-bright">{titleBright}</span>
      </div>

      <div className="orbit-scene-fallback" aria-hidden="true">
        <img src={screenSrc} alt="" />
      </div>
      {/* Three.js Canvas Scene (z-15) */}
      <canvas ref={canvasRef} className="orbit-canvas" aria-hidden="true" />
    </div>
  );
}

const scopedStyles = `
.orbit-stage-hero {
  position: relative;
  width: 100%;
  height: 680px;
  min-height: 680px;
  background: #000000;
  color: #ffffff;
  overflow: hidden;
  user-select: none;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  box-sizing: border-box;
  container-type:inline-size;
  touch-action: pan-y;
  font-family: 'Urbanist Variable', Urbanist, system-ui, -apple-system, sans-serif;
}
.orbit-stage-hero.orbit-compact {
  height: 680px;
  min-height: 680px;
}
.orbit-stage-hero .orbit-headline-container {
  position: absolute;
  left: 0;
  right: 0;
  top: 9%;
  z-index: 10;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  text-align: center;
  transform:translate(var(--orbit-px,0px),var(--orbit-py,0px));
  transition: transform 0.15s ease-out;
}
.orbit-stage-hero .orbit-title-muted {
  font-size: clamp(38px,7cqw,82px);
  font-weight: 900;
  letter-spacing: -0.04em;
  line-height: 0.96;
  color: #48484F;
  text-align: center;
}
.orbit-stage-hero .orbit-title-bright {
  font-size: clamp(38px,7cqw,82px);
  font-weight: 900;
  letter-spacing: -0.04em;
  line-height: 0.96;
  color: #FFFFFF;
  text-align: center;
}
.orbit-stage-hero.orbit-compact .orbit-title-muted,
.orbit-stage-hero.orbit-compact .orbit-title-bright {
  font-size: 76px;
  line-height: 1.0;
}
.orbit-stage-hero .orbit-canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  z-index: 15;
  cursor: grab;
  outline: none;
  display: block;
}
.orbit-stage-hero .orbit-canvas:active {
  cursor: grabbing;
}
.orbit-stage-hero:focus-visible{outline:2px solid #a3e635;outline-offset:-4px}.orbit-scene-fallback{position:absolute;inset:35% 0 4%;display:grid;place-items:center;z-index:11;background:radial-gradient(ellipse at 30% 65%,#84cc1622,transparent 55%),radial-gradient(ellipse at 75% 35%,#a855f722,transparent 50%)}.orbit-scene-fallback img{height:100%;max-height:360px;border:4px solid #26262e;border-radius:23px;box-shadow:0 0 35px #a855f722}.orbit-stage-hero[data-gl=on] .orbit-scene-fallback{display:none}.orbit-stage-hero[data-paused] *{animation-play-state:paused!important}
@keyframes orbitPing {
  75%, 100% {
    transform: scale(2.2);
    opacity: 0;
  }
}
@media (prefers-reduced-motion: reduce) {
  .orbit-stage-hero * {
    animation: none !important;
    transition: none !important;
  }
}
`;
