'use client';

import {useEffect,useId,useMemo,useRef} from 'react';
import * as THREE from 'three';

export type HelixProps={particleCount?:number;rotationSpeed?:number;dispersionStrength?:number;colors?:readonly [string,string,string];interactive?:boolean;compact?:boolean;paused?:boolean;className?:string};
export const helixColors=['#7c3aed','#ec4899','#06b6d4'] as const;
export const helixClamp=(n:number,min:number,max:number)=>Math.max(min,Math.min(max,Number.isFinite(n)?n:min));
const validColor=(color:string,fallback:string)=>/^#[\da-f]{6}$/i.test(color)?color:fallback;
/** Two continuous particle strands plus evenly spaced rungs. No solid meshes. */
export function createHelixParticles(count=45000){
  count=Math.round(helixClamp(count,30000,60000));const positions=new Float32Array(count*3),seeds=new Float32Array(count*4);let state=0x48454c58;
  const random=()=>{state^=state<<13;state^=state>>>17;state^=state<<5;return(state>>>0)/4294967296;};
  const normal=()=>Math.sqrt(-2*Math.log(Math.max(.00001,random())))*Math.cos(random()*Math.PI*2);
  for(let i=0;i<count;i++){
    const strand=random()<.65,t=strand?random():Math.floor(random()*32)/31,theta=t*Math.PI*5.8;
    const bridge=strand?(random()<.5?-1:1):random()*2-1,radius=.7;
    const j=.009+random()*.015,n=i*3,k=i*4;
    positions[n]=Math.cos(theta)*radius*bridge+normal()*j;positions[n+1]=(t-.5)*7.2+normal()*j;positions[n+2]=Math.sin(theta)*radius*bridge+normal()*j;
    seeds[k]=random();seeds[k+1]=random()*Math.PI*2;seeds[k+2]=random();seeds[k+3]=strand?0:1;
  }
  return{positions,seeds};
}

export const helixVertex=`
precision highp float;
attribute vec4 aSeed;
uniform float uTime;
uniform float uRotation;
uniform float uDispersion;
uniform float uPixelScale;
uniform float uHover;
uniform vec2 uPointer;
uniform vec3 uColors[3];
varying vec3 vColor;
varying float vLight;
float hash(vec3 p){p=fract(p*.3183099+vec3(.13,.37,.73));p*=17.;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
// Analytic gradient of a smooth 3D lattice noise field.
vec3 noiseGradient(vec3 p){
  vec3 cell=floor(p),f=fract(p),w=f*f*(3.-2.*f),dw=6.*f*(1.-f);
  float a=hash(cell),b=hash(cell+vec3(1,0,0)),c=hash(cell+vec3(0,1,0)),d=hash(cell+vec3(1,1,0));
  float e=hash(cell+vec3(0,0,1)),f1=hash(cell+vec3(1,0,1)),g=hash(cell+vec3(0,1,1)),h=hash(cell+vec3(1,1,1));
  return vec3(
    mix(mix(b-a,d-c,w.y),mix(f1-e,h-g,w.y),w.z)*dw.x,
    mix(mix(c-a,d-b,w.x),mix(g-e,h-f1,w.x),w.z)*dw.y,
    (mix(mix(e,f1,w.x),mix(g,h,w.x),w.y)-mix(mix(a,b,w.x),mix(c,d,w.x),w.y))*dw.z
  );
}
vec3 curlNoise(vec3 p){
  vec3 x=noiseGradient(p),y=noiseGradient(p+vec3(19.1,7.3,3.7)),z=noiseGradient(p+vec3(4.7,23.5,11.9));
  vec3 curl=vec3(z.y-y.z,x.z-z.x,y.x-x.y);return curl/(.65+length(curl));
}
void main(){
  float turn=uTime*uRotation,c=cos(turn),s=sin(turn);
  vec3 p=position;p.xz=mat2(c,-s,s,c)*p.xz;
  vec4 resting=modelViewMatrix*vec4(p,1.);vec4 clip=projectionMatrix*resting;
  vec2 screen=clip.xy/max(.001,clip.w);
  float brush=exp(-dot(screen-uPointer,screen-uPointer)*7.)*uHover;
  float breath=.5-.5*cos(uTime*.85),cycle=smoothstep(.05,.9,breath);
  float freedom=.12+.88*smoothstep(.18,1.,aSeed.x);
  float amount=uDispersion*(cycle*.85+brush*.7)*freedom;
  vec3 field=curlNoise(p*1.8+vec3(uTime*.18,-uTime*.12,uTime*.11)+aSeed.y*.07);
  vec3 detail=curlNoise(p*3.6+vec3(7.1,uTime*.22,3.9));
  p+=(field+detail*.22)*amount;
  p.xz+=vec2(sin(aSeed.y+uTime*.8),cos(aSeed.y+uTime*.7))*amount*.05;
  vec4 view=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*view;
  float depth=uPixelScale/max(2.,-view.z),size=mix(.025,.055,aSeed.z);
  gl_PointSize=clamp(size*depth,1.,8.);
  float along=clamp((position.y+3.6)/7.2,0.,1.);
  vColor=along>.52?mix(uColors[1],uColors[0],smoothstep(.52,1.,along)):mix(uColors[2],uColors[1],smoothstep(0.,.52,along));
  vColor=mix(vColor,vec3(.9,.82,1.),aSeed.z*.2);
  vLight=(.6+.4*sin(aSeed.y+uTime*(.6+aSeed.x)))*(.75+freedom*.25);
}`;
export const helixFragment=`
precision highp float;
varying vec3 vColor;
varying float vLight;
void main(){
  vec2 p=gl_PointCoord*2.-1.;float r2=dot(p,p);if(r2>1.)discard;
  float alpha=(exp(-r2*7.)*.48+exp(-r2*2.5)*.055)*vLight;
  gl_FragColor=vec4(vColor,alpha);
  #include <colorspace_fragment>
}`;

export default function Helix({particleCount=45000,rotationSpeed=.28,dispersionStrength=1,colors=helixColors,interactive=true,compact=false,paused=false,className=''}:HelixProps){
  const host=useRef<HTMLDivElement>(null),canvas=useRef<HTMLCanvasElement>(null),sync=useRef<()=>void>(()=>{});
  const options=useRef({particleCount,rotationSpeed,dispersionStrength,colors,interactive,paused});options.current={particleCount,rotationSpeed,dispersionStrength,colors,interactive,paused};
  const gradient=useId().replace(/:/g,''),fallback=useMemo(()=>{const {positions}=createHelixParticles(30000);return Array.from({length:1300},(_,i)=>{const n=i*3,x=positions[n],y=positions[n+1],z=positions[n+2];return{x:x*Math.cos(.5)-y*Math.sin(.5),y:-(x*Math.sin(.5)+y*Math.cos(.5)),z};});},[]);
  useEffect(()=>sync.current(),[particleCount,rotationSpeed,dispersionStrength,colors,interactive,paused]);
  useEffect(()=>{
    const root=host.current!,surface=canvas.current!,media=matchMedia('(prefers-reduced-motion: reduce)');
    let renderer:THREE.WebGLRenderer|null=null,gone=false,lost=false,visible=true,raf=0,last=0,time=0,width=1,height=1,count=0,sampleStart=0,samples=0,x=0,y=0,tx=0,ty=0,presence=0,targetPresence=0,held=false;
    const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(38,1,.1,50);camera.position.z=10.5;
    const uniforms={uTime:{value:0},uRotation:{value:rotationSpeed},uDispersion:{value:dispersionStrength},uPixelScale:{value:1},uHover:{value:0},uPointer:{value:new THREE.Vector2()},uColors:{value:helixColors.map((c,i)=>new THREE.Color(validColor(colors[i]??c,c)))}};
    const material=new THREE.ShaderMaterial({uniforms,vertexShader:helixVertex,fragmentShader:helixFragment,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,depthTest:false,toneMapped:false});
    const points=new THREE.Points(new THREE.BufferGeometry(),material);points.rotation.z=.5;points.frustumCulled=false;scene.add(points);
    function stop(){cancelAnimationFrame(raf);raf=0;}
    function draw(){
      if(!renderer||gone||lost)return;const o=options.current,desired=Math.round(helixClamp(compact?Math.min(o.particleCount,30000):o.particleCount,30000,60000));
      if(count!==desired){const data=createHelixParticles(desired),next=new THREE.BufferGeometry();next.setAttribute('position',new THREE.BufferAttribute(data.positions,3));next.setAttribute('aSeed',new THREE.BufferAttribute(data.seeds,4));points.geometry.dispose();points.geometry=next;count=desired;}
      uniforms.uTime.value=media.matches?0:time;uniforms.uRotation.value=helixClamp(o.rotationSpeed,0,1.5);uniforms.uDispersion.value=helixClamp(o.dispersionStrength,0,2);
      uniforms.uHover.value=media.matches||!o.interactive?0:presence;uniforms.uPointer.value.set(x,y);
      for(let i=0;i<3;i++)uniforms.uColors.value[i].set(validColor(o.colors[i]??helixColors[i],helixColors[i]));
      renderer.render(scene,camera);root.dataset.ready='true';root.dataset.particles=String(count);root.dataset.sceneTime=uniforms.uTime.value.toFixed(3);root.dataset.dispersion=(media.matches?0:(.5-.5*Math.cos(time*.85))).toFixed(3);root.dataset.presence=uniforms.uHover.value.toFixed(3);
    }
    function tick(now:number){
      raf=0;if(gone||lost||!root.isConnected||!visible||document.hidden)return;
      if(options.current.paused||held||media.matches){draw();return;}
      const elapsed=now-last;if(elapsed<1000/60-.5){raf=requestAnimationFrame(tick);return;}
      const dt=Math.min(.05,elapsed/1000),a=1-Math.exp(-dt*7);last=now;time+=dt;x+=(tx-x)*a;y+=(ty-y)*a;presence+=(targetPresence-presence)*a;draw();
      samples++;if(now-sampleStart>=750){root.dataset.fps=(samples*1000/(now-sampleStart)).toFixed(1);sampleStart=now;samples=0;}
      raf=requestAnimationFrame(tick);
    }
    function wake(){if(!gone&&!lost&&renderer&&!raf&&visible&&!document.hidden){last=sampleStart=performance.now();samples=0;raf=requestAnimationFrame(tick);}}
    function resize(){const box=root.getBoundingClientRect();width=Math.max(1,box.width);height=Math.max(1,box.height);if(!renderer)return;const dpr=Math.min(window.devicePixelRatio||1,compact?1:1.5);renderer.setPixelRatio(dpr);renderer.setSize(width,height,false);camera.aspect=width/height;camera.position.z=width<height?10.5*Math.max(1,.68/camera.aspect):10.5;camera.updateProjectionMatrix();uniforms.uPixelScale.value=height*dpr/(2*Math.tan(38*Math.PI/360));draw();wake();}
    function changed(){stop();if(!options.current.interactive)targetPresence=0;if(media.matches)x=y=tx=ty=presence=targetPresence=0;draw();wake();}sync.current=changed;
    function visibility(){stop();wake();}
    function move(event:PointerEvent){if(!options.current.interactive||options.current.paused||held||media.matches)return;const box=root.getBoundingClientRect();tx=helixClamp((event.clientX-box.left)/width*2-1,-1,1);ty=helixClamp(1-(event.clientY-box.top)/height*2,-1,1);targetPresence=1;wake();}
    function leave(){targetPresence=0;wake();}
    function up(event:PointerEvent){if(event.pointerType!=='mouse')leave();}
    function key(event:KeyboardEvent){if(event.target!==root||media.matches||options.current.paused)return;if(event.key===' '){event.preventDefault();held=!held;root.dataset.held=String(held);changed();}else if(options.current.interactive&&['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home'].includes(event.key)){event.preventDefault();if(event.key==='Home')leave();else{tx=helixClamp(tx+(event.key==='ArrowLeft'?-.25:event.key==='ArrowRight'?.25:0),-1,1);ty=helixClamp(ty+(event.key==='ArrowUp'?.25:event.key==='ArrowDown'?-.25:0),-1,1);targetPresence=1;wake();}}}
    function contextLost(event:Event){event.preventDefault();lost=true;stop();delete root.dataset.ready;}
    function contextRestored(){lost=false;resize();wake();}
    try{renderer=new THREE.WebGLRenderer({canvas:surface,alpha:false,antialias:false,powerPreference:'high-performance'});renderer.setClearColor('#08080a',1);renderer.outputColorSpace=THREE.SRGBColorSpace;delete root.dataset.failed;}catch{root.dataset.failed='true';}
    const size=new ResizeObserver(resize),observer=new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;visibility();});
    surface.addEventListener('webglcontextlost',contextLost);surface.addEventListener('webglcontextrestored',contextRestored);root.addEventListener('pointermove',move);root.addEventListener('pointerdown',move);root.addEventListener('pointerleave',leave);root.addEventListener('pointerup',up);root.addEventListener('pointercancel',leave);root.addEventListener('keydown',key);media.addEventListener('change',changed);document.addEventListener('visibilitychange',visibility);size.observe(root);observer.observe(root);resize();
    return()=>{gone=true;stop();sync.current=()=>{};size.disconnect();observer.disconnect();root.removeEventListener('pointermove',move);root.removeEventListener('pointerdown',move);root.removeEventListener('pointerleave',leave);root.removeEventListener('pointerup',up);root.removeEventListener('pointercancel',leave);root.removeEventListener('keydown',key);media.removeEventListener('change',changed);document.removeEventListener('visibilitychange',visibility);surface.removeEventListener('webglcontextlost',contextLost);surface.removeEventListener('webglcontextrestored',contextRestored);points.geometry.dispose();material.dispose();scene.remove(points);renderer?.dispose();if(!root.isConnected)renderer?.forceContextLoss();surface.width=surface.height=0;delete root.dataset.ready;};
  },[compact]);
  return <div ref={host} className={`helix ${className}`} tabIndex={compact?-1:0} role="group" aria-label="Helix, a three-dimensional particle DNA sculpture. Move or touch to disperse it. Arrow keys steer, Home releases and Space pauses or resumes."><style>{styles}</style><svg className="helix-fallback" viewBox="-3 -3.5 6 7" aria-hidden="true"><defs><linearGradient id={gradient} x1="0" y1="0" x2="1" y2="1"><stop stopColor={validColor(colors[0],helixColors[0])}/><stop offset=".5" stopColor={validColor(colors[1],helixColors[1])}/><stop offset="1" stopColor={validColor(colors[2],helixColors[2])}/></linearGradient></defs><g fill={`url(#${gradient})`}>{fallback.map((p,i)=><circle key={i} cx={p.x.toFixed(4)} cy={p.y.toFixed(4)} r=".009" opacity={(.4+(p.z+.8)*.2).toFixed(3)}/>)}</g></svg><canvas ref={canvas} aria-hidden="true"/></div>;
}
const styles=`.helix{position:relative;width:100%;height:100%;min-height:0;overflow:hidden;background:#08080a;isolation:isolate;outline:none}.helix>canvas,.helix-fallback{position:absolute;inset:0;width:100%;height:100%;display:block;pointer-events:none;transition:opacity 700ms cubic-bezier(.22,1,.36,1)}.helix>canvas{opacity:0}.helix[data-ready=true]>canvas{opacity:1}.helix[data-ready=true] .helix-fallback{opacity:0}.helix:focus-visible{outline:1px solid white;outline-offset:-5px}@media(prefers-reduced-motion:reduce){.helix>canvas,.helix-fallback{transition:none}}`;
