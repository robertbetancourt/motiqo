import * as THREE from "three";
import { heroClock } from "./hero-clock";
import { SIMPLEX_GLSL } from "./optics-noise";
export type NebulaOptions = {
  particleCount: number;
  flowSpeed: number;
  turbulence: number;
  colorPreset: "cyber" | "aurora" | "gold";
  mode: "laminar" | "vortex" | "pulse";
  paused: boolean;
};
export const NEBULA_VERTEX = /* glsl */ `
${SIMPLEX_GLSL}
attribute vec3 aSeed;attribute float aScale;attribute float aColorMix;
uniform float uTime,uTurbulence,uPixelRatio,uPulse,uMode;uniform vec3 uPointer3D,uPointerVelocity;
varying float vDof,vColor,vEnergy,vComposition;
void main(){
 vec3 p=position;vec3 curl=opticalCurl(p*.42+vec3(uTime*.12,0.0,uTime*.08)+aSeed*.1);
 p+=curl*(.12+.2*uTurbulence);p.y+=sin(p.x*.9+uTime*.45+aSeed.x)*.18;
 if(uMode>0.5&&uMode<1.5){float a=uTime*.12+p.x*.1;mat2 rot=mat2(cos(a),-sin(a),sin(a),cos(a));p.yz=rot*p.yz;}
 vec3 d=p-uPointer3D;float influence=1.0-smoothstep(0.0,2.2,length(d));
 p+=vec3(-d.y,d.x,sin(aSeed.x))*influence*(.12+min(length(uPointerVelocity),3.0)*.15);
 p+=normalize(d+vec3(.001))*influence*min(length(uPointerVelocity),2.0)*.12;
 float pulse=uPulse+(uMode>1.5?pow(max(sin(uTime*.8),0.0),8.0)*.35:0.0);
 p*=1.0+pulse*(.25+sin(length(p)*2.0-uTime*2.0)*.12);
 vec4 mvPosition=modelViewMatrix*vec4(p,1.0);float dof=abs(mvPosition.z+4.5);
 gl_PointSize=clamp((aScale*3.5+dof*2.2)*uPixelRatio*(4.5/max(.3,-mvPosition.z)),1.0,38.0);
 vDof=clamp(dof*.35,0.0,1.0);vColor=aColorMix;vEnergy=clamp(length(curl)*.12,0.0,1.0);vComposition=mix(.22,1.0,smoothstep(-1.8,1.5,position.x));gl_Position=projectionMatrix*mvPosition;
}`;
export const NEBULA_FRAGMENT = /* glsl */ `
uniform vec3 uColorA,uColorB,uColorC;varying float vDof,vColor,vEnergy,vComposition;
void main(){float d=length(gl_PointCoord-.5)*2.0;if(d>1.0)discard;float sharp=exp(-d*d*4.5),bokeh=(1.0-smoothstep(.2,1.0,d))*.18;float alpha=mix(sharp,bokeh,vDof)*.72*vComposition;vec3 color=mix(uColorA,uColorB,smoothstep(.0,.6,vColor));color=mix(color,uColorC,smoothstep(.55,1.0,vColor));color=mix(color,vec3(.95,.98,1.0),vEnergy*.35);gl_FragColor=vec4(color,alpha);
#include <colorspace_fragment>
}`;
const PALETTES = {
  cyber: ["#1d4ed8", "#38bdf8", "#a855f7"],
  aurora: ["#064e3b", "#34d399", "#a7f3d0"],
  gold: ["#92400e", "#fbbf24", "#fff4cf"],
};
export function createNebulaScene(
  host: HTMLElement,
  canvas: HTMLCanvasElement,
  read: () => NebulaOptions,
) {
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false,
      alpha: true,
      powerPreference: "high-performance",
    });
  } catch {
    host.dataset.gl = "off";
    host.dataset.ready = "true";
    return null;
  }
  const scene = new THREE.Scene(),
    camera = new THREE.PerspectiveCamera(56, 1, 0.1, 30);
  camera.position.z = 4.5;
  let seed = 137;
  const rand = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const n = read().particleCount,
    positions = new Float32Array(n * 3),
    seeds = new Float32Array(n * 3),
    scales = new Float32Array(n),
    colors = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const a = rand() * Math.PI * 2,
      r = Math.sqrt(rand()),
      x = (rand() - 0.5) * 9;
    positions.set(
      [
        x,
        Math.sin(a) * r * (0.65 + 0.4 * Math.sin(x * 0.7)),
        Math.cos(a) * r * 1.55,
      ],
      i * 3,
    );
    seeds.set([rand() * 6.28, rand(), rand()], i * 3);
    scales[i] = 0.25 + rand() * 0.8;
    colors[i] = rand();
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 3));
  geometry.setAttribute("aScale", new THREE.BufferAttribute(scales, 1));
  geometry.setAttribute("aColorMix", new THREE.BufferAttribute(colors, 1));
  const uniforms = {
    uTime: { value: 0 },
    uTurbulence: { value: 1 },
    uPixelRatio: { value: 1 },
    uPulse: { value: 0 },
    uMode: { value: 0 },
    uPointer3D: { value: new THREE.Vector3(9, 9, 0) },
    uPointerVelocity: { value: new THREE.Vector3() },
    uColorA: { value: new THREE.Color() },
    uColorB: { value: new THREE.Color() },
    uColorC: { value: new THREE.Color() },
  };
  const material = new THREE.ShaderMaterial({
    vertexShader: NEBULA_VERTEX,
    fragmentShader: NEBULA_FRAGMENT,
    uniforms,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  scene.add(points);
  let pulse = 0,
    held = false,
    lost = false;
  const target = new THREE.Vector3(9, 9, 0),
    previous = new THREE.Vector3(9, 9, 0);
  const clock = heroClock(
    host,
    ({ dt, still }) => {
      if (lost) return;
      const options = read();
      uniforms.uTime.value += dt * options.flowSpeed;
      uniforms.uTurbulence.value = options.turbulence;
      uniforms.uMode.value =
        options.mode === "laminar" ? 0 : options.mode === "vortex" ? 1 : 2;
      uniforms.uPointer3D.value.lerp(target, still ? 1 : 1 - Math.exp(-dt * 8));
      uniforms.uPointerVelocity.value
        .subVectors(uniforms.uPointer3D.value, previous)
        .multiplyScalar(dt > 0 ? 1 / dt : 0)
        .clampLength(0, 4);
      previous.copy(uniforms.uPointer3D.value);
      pulse = still
        ? 0
        : held
          ? Math.min(1, pulse + dt * 2)
          : pulse * Math.exp(-dt * 1.7);
      uniforms.uPulse.value = pulse;
      const palette = PALETTES[options.colorPreset];
      uniforms.uColorA.value.set(palette[0]);
      uniforms.uColorB.value.set(palette[1]);
      uniforms.uColorC.value.set(palette[2]);
      renderer.render(scene, camera);
      host.dataset.gl = "on";
    },
    (w, h) => {
      const dpr = Math.min(devicePixelRatio || 1, 2);
      renderer.setPixelRatio(dpr);
      renderer.setSize(w, h, false);
      uniforms.uPixelRatio.value = dpr;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    },
    () => read().paused || lost,
  );
  function onLost(e: Event) {
    e.preventDefault();
    lost = true;
    host.dataset.gl = "off";
    clock.invalidate();
  }
  function onRestored() {
    lost = false;
    clock.invalidate();
  }
  canvas.addEventListener("webglcontextlost", onLost);
  canvas.addEventListener("webglcontextrestored", onRestored);
  return {
    invalidate: clock.invalidate,
    pointer(x: number, y: number) {
      target.set(x * camera.aspect * 2.4, y * 2.4, 0);
      clock.invalidate();
    },
    pulse() {
      pulse = 1;
      clock.invalidate();
    },
    hold(value: boolean) {
      held = value;
      clock.invalidate();
    },
    dispose() {
      clock.dispose();
      canvas.removeEventListener("webglcontextlost", onLost);
      canvas.removeEventListener("webglcontextrestored", onRestored);
      geometry.dispose();
      material.dispose();
      renderer.dispose();
    },
  };
}
