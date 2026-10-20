"use client";

import { useEffect, useRef, useState } from "react";

export type ArtifactShape = 0 | 1 | 2;
export type LiquidArtifactProps = {
  defaultTheme?: "dark" | "light";
  defaultShape?: ArtifactShape;
  particleDensity?: "auto" | "high" | "medium";
  vortexSpeed?: number;
  vortexRadius?: number;
  compact?: boolean;
  paused?: boolean;
  className?: string;
};
const tau = Math.PI * 2;
const clamp = (n: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, n));
type Vec3 = [number, number, number];

/** Three authored parametric surfaces, sampled once. No bitmap or model asset. */
export function artifactSurface(
  shape: ArtifactShape,
  u: number,
  v: number,
  plume = false,
): Vec3 {
  if (shape === 0) {
    if (plume) {
      const side = u < Math.PI ? -1 : 1;
      return [
        side * (1.03 + v * 1.85),
        0.18 * Math.sin(v * 6 + side) + 0.19 * Math.cos(u * 2) * (1 - v * 0.45),
        0.23 * Math.sin(u * 2) + 0.16 * Math.cos(v * 5),
      ];
    }
    const ring = 0.96 + 0.18 * Math.cos(u * 3),
      fold = v * tau + u * 1.5;
    const tube = 0.32 + 0.09 * Math.sin(u * 4 + v * tau * 3);
    return [
      (ring + tube * Math.cos(fold)) * Math.cos(u),
      (ring + tube * Math.cos(fold)) * Math.sin(u) * 0.8,
      tube * Math.sin(fold) + 0.24 * Math.sin(u * 3),
    ];
  }
  if (shape === 1) {
    const h = v * 2 - 1,
      twist = u + h * 0.85;
    const profile = 0.29 + 0.48 * Math.pow(v, 2.2) + 0.12 * Math.cos(h * 5.2);
    const r = profile * (1 + 0.2 * Math.cos(u * 6 + h * 5));
    return [r * Math.cos(twist), h * 1.25, r * Math.sin(twist)];
  }
  // Photon ring and a thin accretion disk, with the far side lensed above
  // the shadow. Radial filaments are sampled densely near the inner edge.
  if (v < 0.38) {
    const band = v / 0.38;
    const r = 0.70 + band * 0.18;
    return [r * Math.cos(u), r * Math.sin(u), 0.025 * Math.sin(band * tau)];
  }
  const band = (v - 0.38) / 0.62;
  const r = 0.88 + Math.pow(band, 1.7) * 1.75;
  const x = r * Math.cos(u), sine = Math.sin(u);
  const rear = Math.max(0, sine);
  // A Gaussian lens has no hard cutoff or vertical tangent at the shoulders.
  // Match the inner far-side rim to the photon ring before flattening the disk.
  const lens = Math.exp(-((x / 0.95) ** 4));
  const join = Math.exp(-(band * band) / 0.025);
  const lift = 0.87 * r * join + 0.86 * lens * (1 - join);
  return [x, 0.13 * r * sine + rear * lift,
    (0.12 * sine + 0.012 * Math.sin(band * 90 + u * 9)) * (1 - join)];
}

export function createArtifactGeometry(count: number) {
  const positions = Array.from(
    { length: 3 },
    () => new Float32Array(count * 3),
  );
  const normals = Array.from({ length: 3 }, () => new Float32Array(count * 3));
  const seeds = new Float32Array(count * 3);
  let seed = 0x4d6f7469;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  for (let i = 0; i < count; i++) {
    const u = random() * tau,
      v = 0.0001 + random() * 0.9998,
      plume = random() < 0.16;
    seeds.set([u / tau, v, random()], i * 3);
    for (let shape = 0; shape < 3; shape++) {
      const p = artifactSurface(
        shape as ArtifactShape,
        u,
        v,
        shape === 0 && plume,
      );
      const du = artifactSurface(
        shape as ArtifactShape,
        u + 0.001,
        v,
        shape === 0 && plume,
      );
      const dv = artifactSurface(
        shape as ArtifactShape,
        u,
        v + 0.0001,
        shape === 0 && plume,
      );
      const a = du.map((x, k) => x - p[k]),
        b = dv.map((x, k) => x - p[k]);
      const n = [
        a[1] * b[2] - a[2] * b[1],
        a[2] * b[0] - a[0] * b[2],
        a[0] * b[1] - a[1] * b[0],
      ];
      const length = Math.hypot(...n) || 1,
        sign = shape === 1 ? -1 : 1;
      positions[shape].set(p, i * 3);
      normals[shape].set(
        n.map((x) => (x / length) * sign),
        i * 3,
      );
    }
  }
  return { positions, normals, seeds };
}

export const artifactVertex = `#version 300 es
precision highp float;
layout(location=0) in vec3 aShape0;
layout(location=1) in vec3 aShape1;
layout(location=2) in vec3 aShape2;
layout(location=3) in vec3 aNormal0;
layout(location=4) in vec3 aNormal1;
layout(location=5) in vec3 aNormal2;
layout(location=6) in vec3 aSeed;
uniform vec3 uWeights;
uniform vec3 uMouse3D;
uniform vec2 uMouseVelocity;
uniform vec4 uShockwave;
uniform vec2 uRelease;
uniform vec2 uViewport;
uniform vec2 uOffset;
uniform float uScale;
uniform float uDpr;
uniform float uTime;
uniform float uPresence;
uniform float uThemeMix;
uniform float uVortexPhase;
uniform float uVortexRadius;
out vec3 vColor;
out float vAlpha;
out float vSoftness;
out vec2 vDirection;
out float vStreak;

// Analytic curl of a trigonometric vector potential; two scales create folds.
vec3 curl(vec3 p){return vec3(-1.6*sin(p.y*1.6)-1.3*cos(p.z*1.3),-1.3*sin(p.z*1.3)-1.7*cos(p.x*1.7),-1.7*sin(p.x*1.7)-1.6*cos(p.y*1.6));}
mat3 rotate(float t){float a=.3+sin(t*.12)*.1,b=t*.055;float c=cos(a),s=sin(a),d=cos(b),e=sin(b);return mat3(d,0.,-e,0.,1.,0.,e,0.,d)*mat3(1.,0.,0.,0.,c,s,0.,-s,c);}
// Advect samples over a fixed surface. The camera and the disk plane stay still.
vec3 blackHoleParticle(float phase, float sampleV){
 float u=phase*6.28318530718;
 if(sampleV<.38){float band=sampleV/.38;float r=.70+band*.18;
  u+=uTime*(.18+.09*(1.-band));
  return vec3(r*cos(u),r*sin(u),.025*sin(band*6.28318530718));}
 float band=(sampleV-.38)/.62;
 float r=.88+pow(band,1.7)*1.75;
 u+=uTime*(.10+.18/(r*r));
 float x=r*cos(u),sine=sin(u),rear=max(0.,sine);
 float shoulder=x/.95;
 float lens=exp(-shoulder*shoulder*shoulder*shoulder);
 float join=exp(-(band*band)/.025);
 float lift=.87*r*join+.86*lens*(1.-join);
 return vec3(x,.13*r*sine+rear*lift,(.12*sine+.012*sin(band*90.+u*9.))*(1.-join));
}
void main(){
 vec3 home=aShape0*uWeights.x+aShape1*uWeights.y+aShape2*uWeights.z;
 vec3 normal=normalize(aNormal0*uWeights.x+aNormal1*uWeights.y+aNormal2*uWeights.z+vec3(.0001));
 mat3 rotation=rotate(uTime);
 vec3 hole=blackHoleParticle(aSeed.x,aSeed.y);
 vec3 p=mix(rotation*home,hole,uWeights.z),n=mix(rotation*normal,normal,uWeights.z);
 vec3 drift=curl(home*1.35+vec3(uTime*.13))* .022;
 p+=drift*mix(1.,.18,uWeights.z);
 vec3 delta=vec3(p.xy-uMouse3D.xy,p.z*.3);
 float recoil=sin(uRelease.x*9.)*exp(-uRelease.x*3.2)*uRelease.y*.4;
 float radius=max(.1,uVortexRadius);
 float proximity=exp(-dot(delta.xy,delta.xy)/(radius*radius))*exp(-delta.z*delta.z)*(uPresence+recoil);
 float speed=min(length(uMouseVelocity),5.);
 float orbit=length(delta.xy);
 float angle=uVortexPhase*(.8+aSeed.z*.4)-orbit*3.5;
 vec2 direction=orbit>.001?delta.xy/orbit:vec2(cos(aSeed.x*6.283),sin(aSeed.x*6.283));
 vec2 spun=mat2(cos(angle),sin(angle),-sin(angle),cos(angle))*direction;
 float influence=clamp(proximity,0.,1.);
 float rim=sqrt(orbit*orbit+.16*influence);
 // Blend orbital directions on the unit circle, so opposite phases cannot
 // collapse the material back into the eye of the vortex.
 vec2 orbitalDirection=normalize(mix(direction,spun,influence)+vec2(.00001));
 p.xy=uMouse3D.xy+orbitalDirection*rim;
 p.z+=sin(angle+orbit*5.)*.16*influence;
 vec3 turbulence=curl(p*2.2+vec3(uTime*.25))* .13+curl(p*4.5-vec3(uTime*.18))*.045;
 p+=(vec3(uMouseVelocity*.035,0.)+turbulence*.35)*proximity;
 vec3 shockDelta=p-uShockwave.xyz;
 float age=uShockwave.w;
 float wave=exp(-pow((length(shockDelta)-age*2.5)/.18,2.))*exp(-age*1.25)*step(0.,age);
 p+=normalize(shockDelta+vec3(.001))*wave*.3;
 float energy=clamp(proximity*(.25+speed*.2)+wave,0.,1.);
 float lens=4.8/(4.8-p.z);
 vec2 screen=(p.xy*lens+uOffset)*uScale;
 gl_Position=vec4(screen/uViewport*2.,-p.z*.12,1.);
 float focus=abs(p.z-.25);
 vStreak=sqrt(influence);
 vDirection=vec2(-orbitalDirection.y,orbitalDirection.x);
 gl_PointSize=clamp((.72+aSeed.x*.95+energy*.7+focus*.28)*mix(1.,11.,vStreak)*uDpr,1.,36.);
 vec3 key=normalize(vec3(-.6,.8,1.2));
 float diffuse=.22+.78*abs(dot(n,key));
 float spec=pow(max(0.,dot(reflect(-key,n),vec3(0.,0.,1.))),16.);
 vec3 platinum=mix(vec3(.36,.32,.29),vec3(.94,.91,.84),diffuse);
 platinum+=vec3(.2,.28,.3)*spec+energy*vec3(.06,.1,.12);
 vec3 graphite=mix(vec3(.15,.12,.10),vec3(.48,.37,.25),diffuse*.65);
 graphite=mix(graphite,vec3(.76,.64,.45),spec*.45);
 vec3 ember=mix(vec3(.48,.22,.07),vec3(1.,.88,.61),diffuse);
 vColor=mix(mix(platinum,graphite,uThemeMix),mix(ember,graphite,uThemeMix),uWeights.z);
 vAlpha=(.5+aSeed.y*.4)*(1.-focus*.12);
 vSoftness=.15+focus*.13;
}`;
export const artifactFragment = `#version 300 es
precision highp float;
in vec3 vColor;
in float vAlpha;
in float vSoftness;
in vec2 vDirection;
in float vStreak;
out vec4 color;
void main(){
 vec2 point=(gl_PointCoord-.5)*2.;
 vec2 axis=normalize(vec2(vDirection.x,-vDirection.y)+vec2(.00001));
 vec2 local=vec2(dot(point,axis),dot(point,vec2(-axis.y,axis.x)));
 float r=length(vec2(local.x,local.y*mix(1.,14.,vStreak)));
 if(r>1.)discard;
 float alpha=(1.-smoothstep(1.-vSoftness,1.,r))*vAlpha;
 color=vec4(vColor*alpha,alpha);
}`;

type SceneState = {
  shape: ArtifactShape;
  theme: "dark" | "light";
  paused: boolean;
  compact: boolean;
  density: "auto" | "high" | "medium";
  vortexSpeed?: number;
  vortexRadius?: number;
};
export function artifactParticleCount(
  width: number,
  coarse: boolean,
  compact: boolean,
  density: SceneState["density"],
) {
  return compact || coarse || width < 600
    ? 30000
    : density === "medium"
      ? 50000
      : 80000;
}

/** All per-particle motion is evaluated by the vertex shader. Buffers stay static. */
export function createArtifactRenderer(
  host: HTMLElement,
  canvas: HTMLCanvasElement,
  read: () => SceneState,
) {
  const gl = canvas.getContext("webgl2", {
    alpha: true,
    antialias: false,
    premultipliedAlpha: true,
  });
  if (!gl) throw new Error("WebGL2 unavailable");
  const reduced = matchMedia("(prefers-reduced-motion: reduce)"),
    coarse = matchMedia("(pointer: coarse)");
  let program: WebGLProgram | null = null,
    vao: WebGLVertexArrayObject | null = null;
  let buffers: WebGLBuffer[] = [],
    uniforms: Record<string, WebGLUniformLocation | null> = {};
  let count = 0,
    frame = 0,
    last = 0,
    time = 0,
    dead = false,
    lost = false,
    visible = true;
  let width = 1,
    height = 1,
    scale = 1,
    dpr = 1,
    offsetX = 0,
    offsetY = 0,
    theme = read().theme === "light" ? 1 : 0;
  const weights = [0, 0, 0];
  weights[read().shape] = 1;
  const target = { x: 0, y: 0, active: 0 },
    pointer = { x: 0, y: 0, active: 0, vx: 0, vy: 0 };
  const shock = { x: 0, y: 0, age: 20 };
  const recoilState = { age: 20, strength: 0 };
  let vortexPhase = 0;

  function release() {
    buffers.forEach((buffer) => gl!.deleteBuffer(buffer));
    buffers = [];
    if (vao) gl!.deleteVertexArray(vao);
    if (program) gl!.deleteProgram(program);
    vao = null;
    program = null;
    count = 0;
  }
  function allocate() {
    const shaders: WebGLShader[] = [];
    try {
      program = gl!.createProgram();
      if (!program) throw new Error("Program allocation failed");
      for (const [type, source] of [
        [gl!.VERTEX_SHADER, artifactVertex],
        [gl!.FRAGMENT_SHADER, artifactFragment],
      ] as const) {
        const shader = gl!.createShader(type);
        if (!shader) throw new Error("Shader allocation failed");
        shaders.push(shader);
        gl!.shaderSource(shader, source);
        gl!.compileShader(shader);
        if (!gl!.getShaderParameter(shader, gl!.COMPILE_STATUS))
          throw new Error(
            gl!.getShaderInfoLog(shader) || "Shader compilation failed",
          );
        gl!.attachShader(program, shader);
      }
      gl!.linkProgram(program);
      if (!gl!.getProgramParameter(program, gl!.LINK_STATUS))
        throw new Error("Shader link failed");
      uniforms = {};
      for (const name of [
        "uWeights",
        "uMouse3D",
        "uMouseVelocity",
        "uShockwave",
        "uRelease",
        "uViewport",
        "uOffset",
        "uScale",
        "uDpr",
        "uTime",
        "uPresence",
        "uThemeMix",
        "uVortexPhase",
        "uVortexRadius",
      ])
        uniforms[name] = gl!.getUniformLocation(program, name);
      vao = gl!.createVertexArray();
      if (!vao) throw new Error("Vertex array allocation failed");
    } catch (error) {
      release();
      throw error;
    } finally {
      shaders.forEach((shader) => gl!.deleteShader(shader));
    }
  }
  function upload() {
    const nextCount = artifactParticleCount(
      width,
      coarse.matches,
      read().compact,
      read().density,
    );
    if (nextCount === count) return;
    const geometry = createArtifactGeometry(nextCount);
    buffers.forEach((buffer) => gl!.deleteBuffer(buffer));
    buffers = [];
    gl!.bindVertexArray(vao);
    for (const [index, data] of [
      ...geometry.positions,
      ...geometry.normals,
      geometry.seeds,
    ].entries()) {
      const buffer = gl!.createBuffer();
      if (!buffer) throw new Error("Buffer allocation failed");
      buffers.push(buffer);
      gl!.bindBuffer(gl!.ARRAY_BUFFER, buffer);
      gl!.bufferData(gl!.ARRAY_BUFFER, data, gl!.STATIC_DRAW);
      gl!.enableVertexAttribArray(index);
      gl!.vertexAttribPointer(index, 3, gl!.FLOAT, false, 0, 0);
    }
    count = nextCount;
    host.dataset.particles = String(count);
  }
  function render(dt: number) {
    if (dead || lost || !program) return;
    const state = read(),
      still = state.paused || reduced.matches;
    const blend = still ? 1 : 1 - Math.exp(-dt * 5);
    for (let i = 0; i < 3; i++)
      weights[i] += ((state.shape === i ? 1 : 0) - weights[i]) * blend;
    theme +=
      ((state.theme === "light" ? 1 : 0) - theme) *
      (still ? 1 : 1 - Math.exp(-dt * 7));
    const follow = 1 - Math.exp(-dt * 12),
      previousX = pointer.x,
      previousY = pointer.y;
    pointer.x += (target.x - pointer.x) * follow;
    pointer.y += (target.y - pointer.y) * follow;
    pointer.active += (target.active - pointer.active) * follow;
    pointer.vx +=
      ((pointer.x - previousX) / Math.max(0.001, dt) - pointer.vx) * follow;
    pointer.vy +=
      ((pointer.y - previousY) / Math.max(0.001, dt) - pointer.vy) * follow;
    if (!still) {
      time += dt;
      shock.age += dt;
      recoilState.age = Math.min(20, recoilState.age + dt);
      vortexPhase +=
        dt * clamp(state.vortexSpeed ?? 16, 0, 30) * pointer.active;
    }
    gl!.viewport(0, 0, canvas.width, canvas.height);
    gl!.clearColor(0, 0, 0, 0);
    gl!.clear(gl!.COLOR_BUFFER_BIT);
    gl!.enable(gl!.BLEND);
    gl!.blendFunc(gl!.ONE, gl!.ONE_MINUS_SRC_ALPHA);
    gl!.useProgram(program);
    gl!.bindVertexArray(vao);
    gl!.uniform3f(uniforms.uWeights, weights[0], weights[1], weights[2]);
    gl!.uniform3f(uniforms.uMouse3D, pointer.x, pointer.y, 0);
    gl!.uniform2f(
      uniforms.uMouseVelocity,
      clamp(pointer.vx, -5, 5),
      clamp(pointer.vy, -5, 5),
    );
    gl!.uniform4f(
      uniforms.uShockwave,
      shock.x,
      shock.y,
      0,
      still ? 20 : shock.age,
    );
    gl!.uniform2f(
      uniforms.uRelease,
      still ? 20 : recoilState.age,
      recoilState.strength,
    );
    gl!.uniform2f(uniforms.uViewport, width, height);
    gl!.uniform2f(uniforms.uOffset, offsetX, offsetY);
    gl!.uniform1f(uniforms.uScale, scale);
    gl!.uniform1f(uniforms.uDpr, dpr);
    gl!.uniform1f(uniforms.uTime, time);
    gl!.uniform1f(uniforms.uPresence, still ? 0 : pointer.active);
    gl!.uniform1f(uniforms.uThemeMix, theme);
    gl!.uniform1f(uniforms.uVortexPhase, vortexPhase);
    gl!.uniform1f(
      uniforms.uVortexRadius,
      clamp(state.vortexRadius ?? 0.4, 0.2, 1.6),
    );
    gl!.drawArrays(gl!.POINTS, 0, count);
    host.dataset.ready = "true";
    host.dataset.gpu = "on";
  }
  function stop() {
    cancelAnimationFrame(frame);
    frame = 0;
    last = 0;
  }
  function wake() {
    if (dead || lost || !visible || document.hidden || frame) return;
    if (read().paused || reduced.matches) {
      render(0);
      return;
    }
    frame = requestAnimationFrame(tick);
  }
  function tick(now: number) {
    frame = 0;
    if (dead || lost || !visible || document.hidden) return;
    if (last && now - last < 1000 / 60 - 0.5) {
      frame = requestAnimationFrame(tick);
      return;
    }
    const dt = Math.min(0.04, last ? (now - last) / 1000 : 1 / 60);
    last = now;
    render(dt);
    if (!read().paused && !reduced.matches) frame = requestAnimationFrame(tick);
  }
  function resize() {
    if (dead || lost) return;
    width = Math.max(1, host.clientWidth);
    height = Math.max(1, host.clientHeight);
    dpr = Math.min(window.devicePixelRatio || 1, read().compact ? 1.5 : 2);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    scale = Math.min(width * 0.24, height * 0.38);
    offsetX = 0;
    offsetY = 0;
    upload();
    render(0);
    wake();
  }
  function position(event: PointerEvent) {
    const box = host.getBoundingClientRect();
    target.x = clamp(
      (event.clientX - box.left - width / 2) / scale - offsetX,
      -4,
      4,
    );
    target.y = clamp(
      (height / 2 - event.clientY + box.top) / scale - offsetY,
      -4,
      4,
    );
    target.active = 1;
    recoilState.age = 20;
  }
  function isControl(event: Event) {
    return (
      event.target instanceof Element &&
      !!event.target.closest("button,a,input")
    );
  }
  function move(event: PointerEvent) {
    if (isControl(event) || read().paused || reduced.matches) return;
    position(event);
    wake();
  }
  function pulse(x = 0, y = 0) {
    if (read().paused || reduced.matches) return;
    shock.x = x;
    shock.y = y;
    shock.age = 0;
    wake();
  }
  function down(event: PointerEvent) {
    if (isControl(event)) return;
    position(event);
    pulse(target.x, target.y);
  }
  function leave() {
    recoilState.age = 0;
    recoilState.strength = pointer.active;
    target.active = 0;
  }
  function up(event: PointerEvent) {
    if (event.pointerType === "touch") leave();
  }
  function visibility() {
    if (document.hidden) stop();
    else wake();
  }
  function sync() {
    if (read().paused || reduced.matches) stop();
    resize();
  }
  function contextLost(event: Event) {
    event.preventDefault();
    lost = true;
    stop();
    host.dataset.gpu = "off";
  }
  function contextRestored() {
    if (dead) return;
    try {
      release();
      allocate();
      lost = false;
      resize();
    } catch {
      release();
      lost = true;
      host.dataset.gpu = "off";
    }
  }
  let resizeObserver: ResizeObserver | undefined,
    intersection: IntersectionObserver | undefined;
  try {
    allocate();
    resize();
    resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(host);
    intersection = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) wake();
      else stop();
    });
    intersection.observe(host);
  } catch (error) {
    stop();
    resizeObserver?.disconnect();
    intersection?.disconnect();
    release();
    throw error;
  }
  host.addEventListener("pointermove", move);
  host.addEventListener("pointerdown", down);
  host.addEventListener("pointerleave", leave);
  host.addEventListener("pointerup", up);
  host.addEventListener("pointercancel", leave);
  document.addEventListener("visibilitychange", visibility);
  reduced.addEventListener("change", sync);
  coarse.addEventListener("change", resize);
  canvas.addEventListener("webglcontextlost", contextLost);
  canvas.addEventListener("webglcontextrestored", contextRestored);
  return {
    sync,
    pulse,
    dispose() {
      if (dead) return;
      dead = true;
      stop();
      resizeObserver?.disconnect();
      intersection?.disconnect();
      release();
      host.removeEventListener("pointermove", move);
      host.removeEventListener("pointerdown", down);
      host.removeEventListener("pointerleave", leave);
      host.removeEventListener("pointerup", up);
      host.removeEventListener("pointercancel", leave);
      document.removeEventListener("visibilitychange", visibility);
      reduced.removeEventListener("change", sync);
      coarse.removeEventListener("change", resize);
      canvas.removeEventListener("webglcontextlost", contextLost);
      canvas.removeEventListener("webglcontextrestored", contextRestored);
      delete host.dataset.gpu;
      delete host.dataset.ready;
      delete host.dataset.particles;
    },
  };
}

export default function LiquidArtifact({
  defaultTheme,
  defaultShape = 2,
  particleDensity = "auto",
  vortexSpeed = 16,
  vortexRadius = 0.4,
  compact = false,
  paused = false,
  className = "",
}: LiquidArtifactProps) {
  const host = useRef<HTMLElement>(null),
    canvas = useRef<HTMLCanvasElement>(null);
  const renderer = useRef<ReturnType<typeof createArtifactRenderer> | null>(
    null,
  );
  const [theme, setTheme] = useState<"dark" | "light">(defaultTheme ?? "dark");
  const shape = defaultShape;
  const state = useRef<SceneState>({
    shape,
    theme,
    paused,
    compact,
    density: particleDensity,
    vortexSpeed,
    vortexRadius,
  });
  state.current = {
    shape,
    theme,
    paused,
    compact,
    density: particleDensity,
    vortexSpeed,
    vortexRadius,
  };
  useEffect(() => {
    if (defaultTheme) {
      setTheme(defaultTheme);
      return;
    }
    const sync = () =>
      setTheme(
        document.documentElement.dataset.theme === "light" ? "light" : "dark",
      );
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
    return () => observer.disconnect();
  }, [defaultTheme]);
  useEffect(() => {
    try {
      renderer.current = createArtifactRenderer(
        host.current!,
        canvas.current!,
        () => state.current,
      );
    } catch {
      host.current!.dataset.gpu = "off";
      host.current!.dataset.ready = "true";
    }
    return () => {
      renderer.current?.dispose();
      renderer.current = null;
    };
  }, []);
  useEffect(
    () => renderer.current?.sync(),
    [shape, theme, paused, compact, particleDensity, vortexSpeed, vortexRadius],
  );
  return (
    <section
      ref={host}
      className={`lah-root ${compact ? "lah-compact" : ""} ${className}`}
      data-theme={theme}
      data-shape={shape}
      aria-label="Liquid Artifact"
    >
      <style>{artifactStyles}</style>
      <svg className="lah-fallback" viewBox="-2 -1.6 4 3.2" aria-hidden="true">
        {Array.from({ length: 28 }, (_, i) => (
          <ellipse
            key={i}
            cx="0"
            cy="0"
            rx={shape === 2 ? 0.7 + i * 0.006 : shape === 1 ? 0.35 + i * 0.013 : 0.68 + i * 0.015}
            ry={shape === 2 ? 0.7 + i * 0.006 : shape === 1 ? 0.8 + i * 0.012 : 0.52 + i * 0.012}
            fill="none"
            stroke="currentColor"
            strokeWidth=".004"
            transform={`rotate(${i * (shape === 2 ? 0 : 2)})`}
          />
        ))}
        {shape === 2 && Array.from({ length: 24 }, (_, i) => (
          <ellipse key={`disk-${i}`} cx="0" cy="0" rx={0.9 + i * 0.07}
            ry={0.08 + i * 0.006} fill="none" stroke="currentColor" strokeWidth=".004" />
        ))}
      </svg>
      <canvas ref={canvas} className="lah-canvas" aria-hidden="true" />
    </section>
  );
}
const artifactStyles = `
.lah-root{position:relative;isolation:isolate;width:100%;height:100%;min-height:220px;overflow:hidden;container-type:size;background:#08080a;color:#e9e5db;font-family:inherit;transition:background .65s,color .65s}
.lah-root[data-theme=light]{background:#f6f5f0;color:#302c27}
.lah-canvas,.lah-fallback{position:absolute;inset:0;width:100%;height:100%}.lah-canvas{touch-action:none;z-index:2;opacity:0;transition:opacity .6s}.lah-root[data-gpu=on] .lah-canvas{opacity:1}.lah-root[data-gpu=on] .lah-fallback{opacity:0}.lah-fallback{opacity:.5;transition:opacity .6s;pointer-events:none}
@media(prefers-reduced-motion:reduce){.lah-root,.lah-canvas,.lah-fallback{transition:none}}
`;
