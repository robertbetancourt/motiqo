import * as THREE from "three";
import { heroClock } from "./hero-clock";
import { SIMPLEX_GLSL } from "./optics-noise";
export type BioOptions = {
  particleCount: number;
  waveSpeed: number;
  pulseIntensity: number;
  accentColor: string;
  paused: boolean;
};
export function createBioTerrainScene(
  host: HTMLElement,
  canvas: HTMLCanvasElement,
  read: () => BioOptions,
) {
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: "high-performance",
    });
  } catch {
    host.dataset.gl = "off";
    host.dataset.ready = "true";
    return null;
  }
  renderer.setClearColor(0x000000, 1);
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  const scene = new THREE.Scene(),
    camera = new THREE.PerspectiveCamera(48, 1, 0.1, 100),
    geometry = new THREE.BufferGeometry();
  camera.position.set(0, 2.6, 7.2);
  camera.lookAt(0, -0.6, 0);
  const raw = read().particleCount,
    count = Number.isFinite(raw)
      ? Math.min(100000, Math.max(1000, Math.round(raw)))
      : 45000;
  const positions = new Float32Array(count * 3),
    seeds = new Float32Array(count * 3),
    sparks = new Float32Array(count);
  let seed = 1731;
  const rand = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  for (let i = 0; i < count; i++) {
    positions[i * 3] = ((i * 0.754877666) % 1) * 22 - 11;
    positions[i * 3 + 1] = (rand() - 0.5) * 0.7;
    positions[i * 3 + 2] = ((i * 0.569840291) % 1) * 12 - 7;
    seeds.set([rand(), rand(), rand()], i * 3);
    sparks[i] = rand() > 0.85 ? 1 : 0;
  }
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 3));
  geometry.setAttribute("aSpark", new THREE.BufferAttribute(sparks, 1));
  const uniforms = {
    uTime: { value: 0 },
    uPointer3D: { value: new THREE.Vector2(100, 100) },
    uPulse: { value: -100 },
    uPulseIntensity: { value: 1 },
    uPixelRatio: { value: 1 },
    uAccent: { value: new THREE.Color("#9ef054") },
  };
  const material = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: vertex,
    fragmentShader: fragment,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    depthTest: false,
  });
  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  scene.add(points);
  let lost = false,
    disposed = false,
    clock: ReturnType<typeof heroClock> | null = null,
    pending = false,
    time = 0;
  const target = new THREE.Vector2(100, 100),
    raycaster = new THREE.Raycaster(),
    plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0),
    hit = new THREE.Vector3();
  const move = (event: PointerEvent) => {
    const rect = host.getBoundingClientRect();
    raycaster.setFromCamera(
      new THREE.Vector2(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        (-(event.clientY - rect.top) / rect.height) * 2 + 1,
      ),
      camera,
    );
    if (raycaster.ray.intersectPlane(plane, hit)) target.set(hit.x, hit.z);
    clock?.invalidate();
  };
  const leave = () => {
    target.set(100, 100);
    clock?.invalidate();
  };
  const contextLost = (event: Event) => {
    event.preventDefault();
    lost = true;
    host.dataset.gl = "off";
  };
  const contextRestored = () => {
    lost = false;
    host.dataset.gl = "on";
    clock?.invalidate();
  };
  host.addEventListener("pointermove", move);
  host.addEventListener("pointerleave", leave);
  canvas.addEventListener("webglcontextlost", contextLost);
  canvas.addEventListener("webglcontextrestored", contextRestored);
  host.dataset.gl = "on";
  host.dataset.particles = String(count);
  clock = heroClock(
    host,
    ({ dt, still }) => {
      if (lost || disposed) return;
      const options = read();
      const speed = Number.isFinite(options.waveSpeed)
        ? Math.max(0, Math.min(3, options.waveSpeed))
        : 1;
      time += dt * speed;
      uniforms.uTime.value = still ? time || 2.5 : time;
      uniforms.uPointer3D.value.lerp(target, still ? 1 : Math.min(1, dt * 8));
      uniforms.uPulseIntensity.value = Number.isFinite(options.pulseIntensity)
        ? Math.min(3, Math.max(0, options.pulseIntensity))
        : 1;
      uniforms.uAccent.value.set(
        /^#[\da-f]{6}$/i.test(options.accentColor)
          ? options.accentColor
          : "#9ef054",
      );
      if (pending) {
        uniforms.uPulse.value = uniforms.uTime.value;
        pending = false;
        host.dataset.pulse = "active";
      }
      renderer.render(scene, camera);
    },
    (w, h) => {
      renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      uniforms.uPixelRatio.value = renderer.getPixelRatio();
    },
    () => read().paused || lost,
  );
  return {
    invalidate: () => clock?.invalidate(),
    pulse() {
      pending = true;
      clock?.invalidate();
    },
    dispose() {
      disposed = true;
      clock?.dispose();
      host.removeEventListener("pointermove", move);
      host.removeEventListener("pointerleave", leave);
      canvas.removeEventListener("webglcontextlost", contextLost);
      canvas.removeEventListener("webglcontextrestored", contextRestored);
      geometry.dispose();
      material.dispose();
      renderer.dispose();
    },
  };
}
const vertex = /* glsl */ `
precision highp float;
attribute vec3 aSeed;attribute float aSpark;
uniform float uTime,uPulse,uPixelRatio,uPulseIntensity;uniform vec2 uPointer3D;
varying float vBioEnergy,vSpark,vDistanceFade;
${SIMPLEX_GLSL}
void main(){
 vec3 pos=position;float t=uTime;
 pos.xz+=vec2(opticalNoise(vec3(pos.xz*.16,t*.08)),opticalNoise(vec3(pos.zx*.19,t*.09+4.0)))*.3;
 vec3 field=vec3(pos.x*.28+t*.14,pos.z*.32-t*.1,t*.18);
 pos.y+=opticalNoise(field)*1.55+opticalNoise(field*2.03+3.0)*.6+opticalNoise(field*4.07+7.0)*.18;
 pos.xz+=sin(aSeed.xy*6.283+t*.12)*.055;
 float wave1=opticalNoise(vec3(pos.x*.18-t*.22,pos.z*.20+t*.12,t*.15));
 float wave2=sin(pos.x*.45-pos.z*.35+t*.65)*.5+.5;
 float ridgeBoost=smoothstep(-.2,.9,pos.y);
 vBioEnergy=smoothstep(.12,.88,(wave1*.5+.5)*.65+wave2*.35)*(.4+.6*ridgeBoost);
 float pointerDistance=distance(pos.xz,uPointer3D);float crest=exp(-pointerDistance*pointerDistance/2.88);
 pos.y+=crest*.7;vBioEnergy=mix(clamp(vBioEnergy*1.8,0.0,1.0),1.0,crest);
 float age=t-uPulse;float shock=exp(-pow((length(pos.xz)-age*5.0)*2.0,2.0))*step(0.0,age)*(1.0-smoothstep(1.8,3.5,age))*uPulseIntensity;
 pos.y+=shock*.55;vBioEnergy=clamp(vBioEnergy+shock,0.0,1.0);vSpark=aSpark;
 vec4 mvPosition=modelViewMatrix*vec4(pos,1.0);gl_Position=projectionMatrix*mvPosition;
 float baseSize=mix(1.45,3.8,aSpark)*(.65+.65*vBioEnergy);
 gl_PointSize=clamp(baseSize*1.65*uPixelRatio*(5.5/max(.1,-mvPosition.z)),.5,18.0);
 vDistanceFade=smoothstep(-6.8,-2.5,pos.z)*(1.0-smoothstep(6.0,10.5,abs(pos.x)));
 vDistanceFade*=1.0-smoothstep(-.2,.18,gl_Position.y/gl_Position.w);
}`;
const fragment = /* glsl */ `
precision highp float;varying float vBioEnergy,vSpark,vDistanceFade;uniform vec3 uAccent;
void main(){float d=length(gl_PointCoord-.5)*2.0;if(d>1.0)discard;
 vec3 color=mix(vec3(.016,.184,.086),vec3(.086,.639,.29),smoothstep(0.0,.5,vBioEnergy));
 color=mix(color,uAccent,smoothstep(.45,.85,vBioEnergy));
 color=mix(color,vec3(.925,.988,.796),smoothstep(.6,.95,vBioEnergy)*(.35+.65*vSpark));
 float alpha=pow(1.0-d,1.8)*(.12+.78*vBioEnergy)*vDistanceFade;
 gl_FragColor=vec4(color*vec3(3.5,4.0,1.6),alpha);
}`;
