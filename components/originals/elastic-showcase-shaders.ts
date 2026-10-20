// Ashima Arts / Stefan Gustavson simplex noise (MIT). See THIRD_PARTY_NOTICES.md.
export const elasticVertex = /* glsl */`
varying vec2 vUv;
uniform float uProgress;
uniform vec2 uPointer;

void main() {
  vUv = uv;
  vec3 pos = position;
  pos.z += dot(pos.xy, uPointer) * 0.035;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
`;

export const elasticFragment = /* glsl */`
precision highp float;

varying vec2 vUv;

uniform sampler2D uTexCurrent;
uniform sampler2D uTexNext;
uniform float uProgress;
uniform float uTime;
uniform vec2 uPointer;
uniform vec2 uCoverCurrent;
uniform vec2 uCoverNext;

// ---------------------------------------------------------------------------
// Ashima Arts & Stefan Gustavson 2D Simplex Noise (MIT)
// ---------------------------------------------------------------------------
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec3 permute(vec3 x) { return mod289(((x * 34.0) + 1.0) * x); }

float snoise(vec2 v) {
  const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
  vec2 i  = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod289(i);
  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
  vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
  m = m * m;
  m = m * m;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
  vec3 g;
  g.x = a0.x * x0.x + h.x * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

// 3-octave Fractional Brownian Motion (fbm)
float fbm(vec2 p) {
  float value = 0.0;
  float amplitude = 0.5;
  float frequency = 1.0;
  for (int i = 0; i < 3; i++) {
    value += amplitude * snoise(p * frequency);
    frequency *= 2.0;
    amplitude *= 0.5;
  }
  return value;
}

vec2 cover(vec2 uv, vec2 ratio) {
  return clamp((uv - 0.5) * ratio + 0.5, 0.001, 0.999);
}

void main() {
  float impulse = sin(uProgress * 3.14159265);

  // 1. Deformación Cóncava de los 4 Bordes del Cuadro (Unclipped Pincushion Frame)
  // Margen transparente de 0.06 alrededor del cuadro
  vec2 uv = (vUv - 0.06) / 0.88;
  vec2 c = uv - 0.5;

  float pinchX = 1.0 + impulse * 0.14 * (0.25 - c.y * c.y) * 4.0;
  float pinchY = 1.0 + impulse * 0.14 * (0.25 - c.x * c.x) * 4.0;
  float wave = sin(c.y * 6.0 + uTime * 2.0) * impulse * 0.012;
  vec2 frameUv = vec2(0.5 + c.x * pinchX + wave, 0.5 + c.y * pinchY);

  // Antialiased frame crop mask
  float edgeDistX = min(frameUv.x, 1.0 - frameUv.x);
  float edgeDistY = min(frameUv.y, 1.0 - frameUv.y);
  float edgeDist = min(edgeDistX, edgeDistY);
  float aa = max(0.001, fwidth(edgeDist) * 1.5);
  float frameMask = smoothstep(0.0, aa, edgeDist);

  if (frameMask <= 0.0) {
    discard;
  }

  // 2. Transición de Portal Central por Luminancia + FBM Noise
  vec2 center = vec2(0.5, 0.52);
  vec2 radial = frameUv - center;
  float dist = length(radial * vec2(1.0, 0.85));
  float n = fbm(frameUv * 3.2 + uTime * 0.15) * 0.28;

  // Prelectura de luminancia de la textura entrante
  vec2 uvNextBase = cover(frameUv, uCoverNext);
  vec4 texNextPreview = texture2D(uTexNext, uvNextBase);
  float lumaNext = dot(texNextPreview.rgb, vec3(0.299, 0.587, 0.114));

  // Máscara del portal radial orgánico
  float radius = uProgress * 1.45;
  float portalThreshold = dist - n + (1.0 - lumaNext) * 0.15;
  float portalMask = 1.0 - smoothstep(radius - 0.22, radius + 0.22, portalThreshold);

  // 3. Desplazamiento UV Líquido (Lens Warp)
  vec2 shift = uPointer * 0.01;

  // Distorsión de la imagen saliente empujada radialmente hacia afuera
  vec2 uvCurrDisplaced = frameUv + radial * (portalMask * impulse * 0.18) + (n * impulse * 0.02) + shift;
  vec2 uvCurr = cover(uvCurrDisplaced, uCoverCurrent);

  // Distorsión de la imagen entrante (zoom 1.22 -> 1.0 + perturbación refractiva)
  float scaleNext = mix(1.22, 1.0, uProgress);
  vec2 uvNextDisplaced = (frameUv - center) / scaleNext + center + (radial * (1.0 - portalMask) * impulse * 0.06) + (n * (1.0 - uProgress) * 0.16) + shift;
  vec2 uvNext = cover(uvNextDisplaced, uCoverNext);

  vec4 colorCurr = texture2D(uTexCurrent, uvCurr);
  vec4 colorNext = texture2D(uTexNext, uvNext);

  // Sutil aberración cromática en la frontera del portal
  float frontier = 4.0 * portalMask * (1.0 - portalMask) * impulse;
  colorNext.r = texture2D(uTexNext, cover(uvNextDisplaced + radial * 0.006 * frontier, uCoverNext)).r;
  colorNext.b = texture2D(uTexNext, cover(uvNextDisplaced - radial * 0.006 * frontier, uCoverNext)).b;

  vec3 finalRgb = mix(colorCurr.rgb, colorNext.rgb, portalMask);

  gl_FragColor = vec4(finalRgb, frameMask);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;
