import * as THREE from "three";
import { heroClock } from "./hero-clock";
import { SIMPLEX_GLSL } from "./optics-noise";
export const ZENITH_FRAGMENT = /* glsl */ `
precision highp float;
uniform vec2 uResolution,uPointer;uniform float uTime,uBurst;uniform vec3 uColor;
${SIMPLEX_GLSL}
void main(){
 vec2 p=(gl_FragCoord.xy-.5*uResolution)/uResolution.y;
 vec3 color=vec3(.009,.003,.021);
 vec2 dome=p-vec2(0.0,.48);float radial=length(dome);
 color+=mix(vec3(.22,.025,.44),uColor,.3)*exp(-radial*7.0)*.8;
 for(int j=0;j<3;j++){float r=.28+float(j)*.11,d=abs(radial-r),aa=max(fwidth(radial),.0005);float ring=1.0-smoothstep(aa*.25,aa*1.6,d);
 float angle=atan(dome.y,dome.x),glint=.2+.8*pow(abs(sin(angle+float(j)*.32)),4.0);
 color+=mix(vec3(.96,.37,.12),vec3(.91,.47,.98),smoothstep(-.1,.1,dome.x))*ring*glint*.55;
 color+=uColor*exp(-d*180.0)*.035;}
 float beamY=clamp((p.y+.09)/.44,0.0,1.0);
 float verticalMask=smoothstep(-.09,-.03,p.y)*(1.0-smoothstep(.345,.365,p.y));
 float halfWidth=mix(.00002,.0045,pow(beamY,1.35)),dBeam=abs(p.x)-halfWidth*verticalMask;
 float core=(1.0-smoothstep(-.0005,.0012,dBeam))*verticalMask;
 float halo=exp(-abs(p.x)/(.008+.016*beamY))*verticalMask*sqrt(beamY);
 float phase=fract(uTime*.35),photon=exp(-pow((beamY-(1.0-phase))*28.0,2.0));
 float burstAge=uTime-uBurst,burst=step(0.0,burstAge)*(1.0-smoothstep(1.5,2.0,burstAge));
 float tipFlash=exp(-pow((phase-.97)*22.0,2.0))+burst*exp(-pow((burstAge-1.3)*6.0,2.0));
 color+=uColor*halo*(.35+photon*.7)+vec3(1.0,.92,1.0)*core*(1.1+photon*.6);
 color+=vec3(.65,.3,.95)*exp(-abs(p.x)*8.0-abs(p.y+.07)*65.0)*tipFlash*.45;
 float backlight=exp(-length((p-vec2(0.0,-.34))*vec2(1.8,3.0))*7.0);
 color+=uColor*backlight*(.8+tipFlash*.3);
 vec2 cell=floor(p*220.0);float star=fract(sin(dot(cell,vec2(127.1,311.7)))*43758.5453);
 float point=exp(-length(fract(p*220.0)-.5)*18.0)*step(.996,star);
 color+=vec3(.72,.61,.95)*point*(.4+.2*sin(uTime+star*45.0));
 color*=1.0-smoothstep(.42,.54,-p.y);color=1.0-exp(-color*1.25);
 gl_FragColor=vec4(color,1.0);
}`;
export type ZenithOptions = {
  beamColor: string;
  interactive: boolean;
  paused: boolean;
};
// A real point cloud: long travelling crests, cursor ripples and soft optical depth.
export const ZENITH_PARTICLE_VERTEX = /* glsl */ `
uniform float uTime,uBurst,uDpr;uniform vec2 uPointer;
varying float vDepth,vCrest,vSeed;
void main(){
 vec3 p=position;float t=uTime;
 float seed=fract(sin(dot(p.xz,vec2(127.1,311.7)))*43758.5453);
 float crest=sin(p.x*.24+p.z*.13-t*.65)*1.1+sin(p.z*.3-p.x*.1+t*.43)*.7;
 vec2 cursor=vec2(uPointer.x*38.0,uPointer.y*18.0);
 float distanceToPointer=length(p.xz-cursor),age=uTime-uBurst;
 float ripple=sin(distanceToPointer*1.35-t*2.0)*exp(-distanceToPointer*.16)*length(uPointer)*1.8;
 float shock=exp(-pow((length(p.xz)-age*12.0)*.35,2.0))*(1.0-smoothstep(0.0,3.0,age))*step(0.0,age);
 p.y=-3.8+crest+ripple+shock*1.8;
 p.x+=sin(p.z*.12+t*.3)*.35+uPointer.x*.8;
 vec4 view=modelViewMatrix*vec4(p,1.0);vDepth=-view.z;vCrest=crest;vSeed=seed;
 float blur=abs(vDepth-35.0)*.12;
 gl_PointSize=clamp((1.1+seed*.7+blur)*uDpr*32.0/max(8.0,vDepth),1.0,9.0*uDpr);
 gl_Position=projectionMatrix*view;
}`;
export const ZENITH_PARTICLE_FRAGMENT = /* glsl */ `
precision highp float;uniform vec3 uColor;uniform float uTime;
varying float vDepth,vCrest,vSeed;
void main(){
 float r=length(gl_PointCoord-.5)*2.0;
 float soft=exp(-r*r*4.0)*(1.0-smoothstep(.65,1.0,r));
 float depthFade=smoothstep(10.0,24.0,vDepth)*(1.0-smoothstep(40.0,65.0,vDepth));
 float brightness=.28+smoothstep(-.5,1.6,vCrest)*.65;
 vec3 color=mix(uColor,vec3(.83,.7,1.0),smoothstep(.1,1.7,vCrest)*.75);
 color=mix(color,vec3(.98,.61,.36),step(.992,vSeed)*.55);
 float twinkle=.82+.18*sin(uTime*1.2+vSeed*40.0);
 gl_FragColor=vec4(color*brightness,soft*depthFade*twinkle*.72);
}`;
export function createZenithScene(
  host: HTMLElement,
  canvas: HTMLCanvasElement,
  read: () => ZenithOptions,
) {
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false,
      powerPreference: "high-performance",
    });
  } catch {
    host.dataset.gl = "off";
    host.dataset.graphics = "fallback";
    host.dataset.ready = "true";
    return null;
  }
  const scene = new THREE.Scene(),
    camera = new THREE.Camera(),
    geometry = new THREE.PlaneGeometry(2, 2),
    uniforms = {
      uResolution: { value: new THREE.Vector2(1, 1) },
      uPointer: { value: new THREE.Vector2() },
      uTime: { value: 0 },
      uBurst: { value: -100 },
      uColor: { value: new THREE.Color("#a855f7") },
    };
  const material = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: "void main(){gl_Position=vec4(position,1.0);}",
    fragmentShader: ZENITH_FRAGMENT,
    depthTest: false,
    depthWrite: false,
  });
  scene.add(new THREE.Mesh(geometry, material));
  const ocean = new THREE.Scene(),
    oceanCamera = new THREE.PerspectiveCamera(43, 1, 0.1, 100),
    oceanGeometry = new THREE.BufferGeometry(),
    positions = new Float32Array(84 * 340 * 3);
  for (let row = 0; row < 84; row++) {
    for (let column = 0; column < 340; column++) {
      const index = (row * 340 + column) * 3;
      positions[index] = (column / 339 - 0.5) * 70;
      positions[index + 1] = 0;
      positions[index + 2] = (row / 83 - 0.5) * 43;
    }
  }
  oceanGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const oceanUniforms = { ...uniforms, uDpr: { value: 1 } },
    oceanMaterial = new THREE.ShaderMaterial({
      uniforms: oceanUniforms,
      vertexShader: ZENITH_PARTICLE_VERTEX,
      fragmentShader: ZENITH_PARTICLE_FRAGMENT,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: false,
    }),
    points = new THREE.Points(oceanGeometry, oceanMaterial);
  points.frustumCulled = false;
  ocean.add(points);
  renderer.autoClear = false;
  host.dataset.particles = String(84 * 340);
  let lost = false,
    pending = false;
  const pointer = new THREE.Vector2();
  const clock = heroClock(
    host,
    ({ time, dt, still }) => {
      if (lost) return;
      const options = read();
      uniforms.uTime.value = still ? time || 2 : time;
      uniforms.uColor.value.set(
        /^#[\da-f]{6}$/i.test(options.beamColor)
          ? options.beamColor
          : "#a855f7",
      );
      uniforms.uPointer.value.lerp(
        options.interactive ? pointer : new THREE.Vector2(),
        still ? 1 : 1 - Math.exp(-dt * 5),
      );
      if (pending) {
        uniforms.uBurst.value = uniforms.uTime.value;
        pending = false;
      }
      const cursor = uniforms.uPointer.value;
      oceanCamera.position.set(cursor.x * 1.5, 7.2 + cursor.y * .5, 30);
      oceanCamera.lookAt(cursor.x * .5, 3.8, -5);
      renderer.clear();
      renderer.render(scene, camera);
      renderer.clearDepth();
      renderer.render(ocean, oceanCamera);
      host.dataset.waveTime = uniforms.uTime.value.toFixed(3);
      host.dataset.gl = "on";
      host.dataset.graphics = "webgl";
    },
    (w, h) => {
      const dpr = Math.min(devicePixelRatio || 1, 2);
      renderer.setPixelRatio(dpr);
      renderer.setSize(w, h, false);
      uniforms.uResolution.value.set(w * dpr, h * dpr);
      oceanUniforms.uDpr.value = dpr;
      oceanCamera.aspect = w / h;
      oceanCamera.updateProjectionMatrix();
    },
    () => read().paused || lost,
  );
  const move = (event: PointerEvent) => {
    const r = host.getBoundingClientRect();
    pointer.set(
      (event.clientX - r.left) / r.width - 0.5,
      0.5 - (event.clientY - r.top) / r.height,
    );
    clock.invalidate();
  };
  const leave = () => {
    pointer.set(0, 0);
    clock.invalidate();
  };
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
  host.addEventListener("pointermove", move);
  host.addEventListener("pointerleave", leave);
  canvas.addEventListener("webglcontextlost", onLost);
  canvas.addEventListener("webglcontextrestored", onRestored);
  return {
    invalidate: clock.invalidate,
    pulse() {
      pending = true;
      clock.invalidate();
    },
    dispose() {
      clock.dispose();
      host.removeEventListener("pointermove", move);
      host.removeEventListener("pointerleave", leave);
      canvas.removeEventListener("webglcontextlost", onLost);
      canvas.removeEventListener("webglcontextrestored", onRestored);
      geometry.dispose();
      material.dispose();
      oceanGeometry.dispose();
      oceanMaterial.dispose();
      renderer.dispose();
    },
  };
}
