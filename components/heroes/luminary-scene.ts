import * as THREE from "three";
import { heroClock } from "./hero-clock";
import { SIMPLEX_GLSL } from "./optics-noise";
export type LuminaryOptions = {
  ior: number;
  causticIntensity: number;
  paused: boolean;
};
export const LUMINARY_FRAGMENT = /* glsl */ `
precision highp float;
${SIMPLEX_GLSL}
uniform vec2 uResolution,uPointer;uniform float uTime,uIor,uCaustic;
mat2 rotation(float a){return mat2(cos(a),-sin(a),sin(a),cos(a));}
vec3 lensSpace(vec3 p){p.yz=rotation(.42+uPointer.y*.16)*p.yz;p.xz=rotation(-.36+uPointer.x*.2)*p.xz;return p;}
float lens(vec3 world){vec3 p=lensSpace(world-vec3(0.0,-.4,-.4));vec2 q=vec2(length(p.xy)-1.25,p.z);return length(q)-.23;}
vec3 atmosphere(vec2 uv){
 vec3 domain=vec3(uv*1.5,uTime*.06);float warp=opticalFbm(domain+vec3(0.0,0.0,2.4));float field=opticalFbm(domain+vec3(warp*.9,warp*.6,0.0));
 float arc=exp(-abs(length((uv-vec2(0.0,-.12))*vec2(.65,1.0))-.48-field*.16)*9.0);
 float rays=pow(max(0.0,.5+.5*sin(uv.x*5.5+field*2.8+uTime*.16)),7.0)*exp(-abs(uv.y+.1)*1.4);
 vec3 color=vec3(.0012,.0015,.0025)+mix(vec3(.05,.04,.27),vec3(.08,.25,.78),.5+.5*field)*(arc*.24+rays*.12)*uCaustic;
 color+=vec3(.24,.09,.54)*pow(max(arc,0.0),3.0)*.15*uCaustic;
 return color;
}
void main(){
 vec2 uv=(gl_FragCoord.xy-.5*uResolution)/uResolution.y;
 vec3 ro=vec3(0.0,0.0,9.0),rd=normalize(vec3(uv,-2.2));vec3 color=atmosphere(uv);
 float travel=0.0;bool hit=false;vec3 p=ro;
 for(int i=0;i<52;i++){p=ro+rd*travel;float d=lens(p);if(d<.002){hit=true;break;}travel+=d*.85;if(travel>10.0)break;}
 if(hit){vec2 eps=vec2(.003,0.0);vec3 n=normalize(vec3(lens(p+eps.xyy)-lens(p-eps.xyy),lens(p+eps.yxy)-lens(p-eps.yxy),lens(p+eps.yyx)-lens(p-eps.yyx)));float fresnel=pow(1.0-max(dot(n,-rd),0.0),3.0);vec3 refracted=refract(rd,n,1.0/uIor);vec2 sampleUv=uv+refracted.xy*.18+n.xy*.11;float dispersion=(uIor-1.0)*.026;vec3 glass=vec3(atmosphere(sampleUv+n.xy*dispersion).r,atmosphere(sampleUv).g,atmosphere(sampleUv-n.xy*dispersion).b);float spec=pow(max(dot(reflect(normalize(vec3(-.5,.8,1.0)),n),rd),0.0),32.0);color=glass*.72+vec3(.02,.035,.075)+fresnel*vec3(.45,.63,.95)*.65+spec*vec3(.65,.82,1.0)*.45;}
 vec2 grid=abs(fract(uv*35.0)-.5);float line=1.0-smoothstep(.47,.49,max(grid.x,grid.y));line=1.0-line;float mask=clamp(length(color)*.8+exp(-length(uv-uPointer*.6)*5.0)*.15,0.0,.5);color+=vec3(.22,.35,.58)*line*mask*.12;
 color*=1.0-smoothstep(.55,1.7,length(uv))*.55;gl_FragColor=vec4(color,1.0);
 #include <colorspace_fragment>
}`;
export function createLuminaryScene(
  host: HTMLElement,
  canvas: HTMLCanvasElement,
  read: () => LuminaryOptions,
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
      uIor: { value: 1.52 },
      uCaustic: { value: 1 },
    };
  const material = new THREE.ShaderMaterial({
    vertexShader: "void main(){gl_Position=vec4(position,1.0);}",
    fragmentShader: LUMINARY_FRAGMENT,
    uniforms,
    depthTest: false,
    depthWrite: false,
  });
  scene.add(new THREE.Mesh(geometry, material));
  const pointer = new THREE.Vector2();
  let lost = false,
    lastReport = 0,
    previousFrame = 0;
  const clock = heroClock(
    host,
    ({ time, dt, still }) => {
      if (lost) return;
      const now = performance.now(),
        interval = previousFrame ? now - previousFrame : 0;
      previousFrame = still ? 0 : now;
      const opt = read();
      uniforms.uTime.value = time;
      uniforms.uIor.value = opt.ior;
      uniforms.uCaustic.value = opt.causticIntensity;
      uniforms.uPointer.value.lerp(pointer, still ? 1 : 1 - Math.exp(-dt * 5));
      renderer.render(scene, camera);
      host.dataset.gl = "on";
      if (time - lastReport > 0.2 || still) {
        const label = host.querySelector<HTMLElement>("[data-lum-frame]");
        if (label)
          label.textContent = still
            ? "Static"
            : interval > 0
              ? `${interval.toFixed(1)} ms`
              : "Measuring…";
        lastReport = time;
      }
    },
    (w, h) => {
      const ratio = Math.min(devicePixelRatio || 1, 1.5);
      renderer.setPixelRatio(ratio);
      renderer.setSize(w, h, false);
      uniforms.uResolution.value.set(w * ratio, h * ratio);
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
      pointer.set(x, y);
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
