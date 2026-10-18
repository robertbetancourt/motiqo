'use client';
import {useEffect,useId,useRef} from 'react';
import * as THREE from 'three';

export type CompanionProps={speed?:number;intensity?:number;eyeResponse?:number;warmColor?:string;coolColor?:string;interactive?:boolean;compact?:boolean;paused?:boolean;className?:string};
export const companionClamp=(n:number,min:number,max:number)=>Math.max(min,Math.min(max,Number.isFinite(n)?n:min));
const color=(value:string,fallback:string)=>/^#[\da-f]{6}$/i.test(value)?value:fallback;
/** Static ribbon parameters; the vertex shader supplies the moving three-dimensional surface. */
export function companionGeometry(){
  const segments=160,rows=8,bands=5,vertices:number[]=[],indices:number[]=[];
  for(let band=0;band<bands;band++){
    const base=vertices.length/3;
    for(let i=0;i<=segments;i++)for(let j=0;j<=rows;j++)vertices.push(i/segments*Math.PI*2,j/rows*2-1,band);
    for(let i=0;i<segments;i++)for(let j=0;j<rows;j++){const a=base+i*(rows+1)+j,b=a+rows+1;indices.push(a,b,a+1,b,b+1,a+1);}
  }
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geometry.setIndex(indices);return geometry;
}
export const companionVertex=`
uniform float uTime;
uniform float uIntensity;
uniform float uJoy;
uniform float uGesture;
uniform vec2 uHand;
varying vec3 vPosition;
varying vec3 vNormal;
varying float vWidth;
vec3 surface(float a,float w,float band){
  float t=uTime;
  float phase=t*.88-1.7+band*.28;
  float fold=sin(a*2.-phase)*.13+sin(a*3.+phase*.7+band*.4)*.045;
  float width=.38+.055*sin(phase*.65+band*.3);
  float latitude=w*width+fold*uIntensity;
  float radius=.91+band*.017+sin(a*2.+phase)*.035*uIntensity;
  // A curved spherical membrane, rather than a flat annulus. Its near side
  // folds across the face while the opaque core masks the rear surface.
  vec3 p=radius*vec3(cos(a)*cos(latitude),sin(a)*cos(latitude),sin(latitude));
  p.z+=sin(a-phase)*.10*uIntensity;
  p.z+=sin(a*4.-uGesture*11.+band*.5)*.025*uJoy;
  float pitch=-(.48+band*.065+sin(phase)*.44*uIntensity)+uHand.y*.12;
  p.yz=mat2(cos(pitch),sin(pitch),-sin(pitch),cos(pitch))*p.yz;
  float turn=sin(phase*.7+band*.25)*.32*uIntensity+uHand.x*.12;
  p.xz=mat2(cos(turn),-sin(turn),sin(turn),cos(turn))*p.xz;
  float spin=sin(phase*.45)*.24+band*.1;
  p.xy=mat2(cos(spin),sin(spin),-sin(spin),cos(spin))*p.xy;
  return p;
}
void main(){
  vec3 p=surface(position.x,position.y,position.z);
  vec3 tangent=surface(position.x+.002,position.y,position.z)-p;
  vec3 across=surface(position.x,position.y+.002,position.z)-p;
  vNormal=normalize(normalMatrix*normalize(cross(tangent,across)));vPosition=p;vWidth=position.y;
  gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);
}`;
export const companionFragment=`
uniform vec3 uWarm;
uniform vec3 uCool;
varying vec3 vPosition;
varying vec3 vNormal;
varying float vWidth;
void main(){
  vec3 n=normalize(vNormal);float edge=pow(1.-abs(n.z),2.);
  vec3 tint=mix(uCool,uWarm,smoothstep(-.55,.75,vPosition.y));
  tint=mix(tint,vec3(.22,.035,.7),smoothstep(.1,1.,-vPosition.x)*.55);
  float lip=exp(-pow((abs(vWidth)-.72)/.16,2.));
  float light=.65+.35*abs(dot(n,normalize(vec3(-.6,.9,1.))));
  float grain=fract(sin(dot(gl_FragCoord.xy,vec2(12.9898,78.233)))*43758.5453);
  float veil=1.-smoothstep(.58,1.,abs(vWidth));
  float alpha=(.16+edge*.19+lip*.05)*veil;
  gl_FragColor=vec4(tint*light*(.84+grain*.16)+tint*lip*.10,alpha);
  #include <colorspace_fragment>
}`;
const coreVertex=`varying vec3 vNormal;varying vec3 vPosition;void main(){vNormal=normalize(normalMatrix*normal);vPosition=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;
const coreFragment=`uniform float uTime;uniform vec3 uCool;varying vec3 vNormal;varying vec3 vPosition;void main(){float edge=pow(1.-max(0.,normalize(vNormal).z),2.5);float cloud=.5+.5*sin(vPosition.x*3.+uTime*.35)*cos(vPosition.y*3.-uTime*.25);vec3 ink=mix(vec3(.002,.004,.016),uCool*.045,edge);ink+=vec3(.006,.014,.065)*cloud*(1.-edge);gl_FragColor=vec4(ink,1.);#include <colorspace_fragment>}`.replace(';#include',';\n#include');

export default function Companion({speed=1,intensity=1,eyeResponse=1,warmColor='#ff7459',coolColor='#32d7ec',interactive=true,compact=false,paused=false,className=''}:CompanionProps){
  const host=useRef<HTMLDivElement>(null),canvas=useRef<HTMLCanvasElement>(null),eyes=useRef<HTMLDivElement>(null),sync=useRef<()=>void>(()=>{}),id=useId().replace(/:/g,'');
  const options=useRef({speed,intensity,eyeResponse,warmColor,coolColor,interactive,paused});options.current={speed,intensity,eyeResponse,warmColor,coolColor,interactive,paused};
  useEffect(()=>sync.current(),[speed,intensity,eyeResponse,warmColor,coolColor,interactive,paused]);
  useEffect(()=>{
    const root=host.current!,surface=canvas.current!,face=eyes.current!,media=matchMedia('(prefers-reduced-motion: reduce)');
    let renderer:THREE.WebGLRenderer|null=null,raf=0,last=0,time=0,gestureTime=0,lastReaction=-Infinity,visible=true,gone=false,lost=false,held=false,width=1,height=1,size=1,x=0,y=0,tx=0,ty=0,sampleStart=0,samples=0,box=root.getBoundingClientRect();
    const reactions:number[]=[];
    const scene=new THREE.Scene(),camera=new THREE.OrthographicCamera(-2,2,2,-2,.1,20);camera.position.z=5;
    const uniforms={uTime:{value:0},uIntensity:{value:intensity},uJoy:{value:0},uGesture:{value:0},uHand:{value:new THREE.Vector2()},uWarm:{value:new THREE.Color(color(warmColor,'#ff7459'))},uCool:{value:new THREE.Color(color(coolColor,'#32d7ec'))}};
    const geometry=companionGeometry(),sphere=new THREE.SphereGeometry(.69,64,40),ribbonMaterial=new THREE.ShaderMaterial({uniforms,vertexShader:companionVertex,fragmentShader:companionFragment,side:THREE.DoubleSide,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false}),coreMaterial=new THREE.ShaderMaterial({uniforms,vertexShader:coreVertex,fragmentShader:coreFragment,toneMapped:false});
    const core=new THREE.Mesh(sphere,coreMaterial),ribbons=new THREE.Mesh(geometry,ribbonMaterial);ribbons.frustumCulled=false;ribbons.renderOrder=1;scene.add(core,ribbons);
    function stop(){cancelAnimationFrame(raf);raf=0;}
    function draw(){
      if(!renderer||lost||gone)return;const o=options.current,still=media.matches,t=still?0:time;
      while(reactions.length&&gestureTime-reactions[0]>=1.15)reactions.shift();
      let remaining=1,weight=0,hop=0,squash=0,tilt=0;
      if(!still)for(const start of reactions){const age=gestureTime-start,pulse=Math.sin(Math.PI*age/1.15)**2;remaining*=1-pulse;weight+=pulse;hop+=pulse*(.035+.10*Math.sin(age*14));squash+=pulse*Math.sin(age*14-.6);tilt+=pulse*Math.sin(age*9);}
      const joy=1-remaining,normalizer=Math.max(1,weight),lift=hop/normalizer,sy=1+squash/normalizer*.075,sx=1/Math.sqrt(sy),roll=tilt/normalizer*.045;
      for(const body of [core,ribbons]){body.position.y=lift;body.scale.set(sx,sy,sx);body.rotation.z=roll;}
      uniforms.uTime.value=t;uniforms.uJoy.value=joy;uniforms.uGesture.value=gestureTime;uniforms.uIntensity.value=companionClamp(o.intensity,0,1.5);uniforms.uHand.value.set(still?0:x,still?0:y);uniforms.uWarm.value.set(color(o.warmColor,'#ff7459'));uniforms.uCool.value.set(color(o.coolColor,'#32d7ec'));renderer.render(scene,camera);
      const gaze=companionClamp(o.eyeResponse,0,1.5),gx=still?0:x*size*.085*gaze,gy=still?0:y*size*.07*gaze,phase=t%5.6,blink=still?1:1-.96*Math.exp(-(((phase-4.8)/.075)**2));
      face.style.transform=`translate(calc(-50% + ${gx.toFixed(3)}px),calc(-50% + ${(gy-lift*size/2.6).toFixed(3)}px)) rotate(${-roll}rad) scale(${sx},${sy})`;face.style.setProperty('--blink',(blink*(1-joy*.80)).toFixed(3));root.dataset.gaze=`${gx.toFixed(3)},${gy.toFixed(3)}`;root.dataset.gesture=joy>.01?'laugh':'idle';root.dataset.joy=joy.toFixed(3);root.dataset.sceneTime=t.toFixed(3);root.dataset.ready='true';
    }
    function tick(now:number){
      raf=0;if(gone||lost||!root.isConnected||!visible||document.hidden)return;if(options.current.paused||held||media.matches){draw();return;}
      const elapsed=now-last;if(elapsed<1000/60-.5){raf=requestAnimationFrame(tick);return;}
      const dt=Math.min(.05,elapsed/1000),a=1-Math.exp(-dt*8);last=now;time+=dt*companionClamp(options.current.speed,.3,2);gestureTime+=dt;x+=(tx-x)*a;y+=(ty-y)*a;draw();samples++;if(now-sampleStart>=750){root.dataset.fps=(samples*1000/(now-sampleStart)).toFixed(1);sampleStart=now;samples=0;}raf=requestAnimationFrame(tick);
    }
    function wake(){if(!gone&&!lost&&renderer&&!raf&&visible&&!document.hidden){last=sampleStart=performance.now();samples=0;raf=requestAnimationFrame(tick);}}
    function measure(){box=root.getBoundingClientRect();}
    function resize(){measure();width=Math.max(1,box.width);height=Math.max(1,box.height);size=Math.max(1,Math.min(width*.8,height*.73,340));root.style.setProperty('--companion-size',`${size}px`);if(!renderer)return;const world=height/size*2.6;camera.top=world/2;camera.bottom=-world/2;camera.left=-world*width/height/2;camera.right=world*width/height/2;camera.updateProjectionMatrix();renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,compact?1:1.5));renderer.setSize(width,height,false);draw();wake();}
    function changed(){stop();if(media.matches||!options.current.interactive){tx=ty=0;reactions.length=0;lastReaction=-Infinity;}if(media.matches)x=y=0;draw();wake();}sync.current=changed;
    function visibility(){stop();wake();}
    const simulatedPreview=(event:PointerEvent)=>!event.isTrusted&&!!(event.target as HTMLElement)?.closest?.('[data-preview-id]');
    function move(event:PointerEvent){if(simulatedPreview(event)||!options.current.interactive||media.matches||options.current.paused||held)return;measure();tx=companionClamp((event.clientX-box.left-width/2)/(size*.9),-1,1);ty=companionClamp((event.clientY-box.top-height/2)/(size*.9),-1,1);wake();}
    function rest(){tx=ty=0;wake();}
    function out(event:PointerEvent){if(!simulatedPreview(event)&&!event.relatedTarget)rest();}
    function react(){if(compact||!options.current.interactive||options.current.paused||held||media.matches||gestureTime-lastReaction<.16)return;lastReaction=gestureTime;reactions.push(gestureTime);wake();}
    function key(event:KeyboardEvent){if(event.target!==root||media.matches||options.current.paused)return;if(event.key==='Enter'){event.preventDefault();if(!event.repeat)react();}else if(event.key===' '){event.preventDefault();held=!held;root.dataset.held=String(held);changed();}else if(['Home','ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key)&&options.current.interactive){event.preventDefault();if(event.key==='Home')rest();else{tx=companionClamp(tx+(event.key==='ArrowLeft'?-.3:event.key==='ArrowRight'?.3:0),-1,1);ty=companionClamp(ty+(event.key==='ArrowUp'?-.3:event.key==='ArrowDown'?.3:0),-1,1);wake();}}}
    const onLost=(event:Event)=>{event.preventDefault();lost=true;stop();delete root.dataset.ready;},onRestored=()=>{lost=false;resize();wake();};
    try{renderer=new THREE.WebGLRenderer({canvas:surface,alpha:false,antialias:true,powerPreference:'high-performance'});renderer.setClearColor('#000',1);renderer.outputColorSpace=THREE.SRGBColorSpace;delete root.dataset.failed;}catch{root.dataset.failed='true';}
    const sizeObserver=new ResizeObserver(resize),observer=new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;visibility();});sizeObserver.observe(root);observer.observe(root);resize();
    window.addEventListener('pointermove',move,{passive:true});window.addEventListener('pointerout',out);window.addEventListener('scroll',measure,true);window.addEventListener('blur',rest);root.addEventListener('keydown',key);root.addEventListener('click',react);surface.addEventListener('webglcontextlost',onLost);surface.addEventListener('webglcontextrestored',onRestored);media.addEventListener('change',changed);document.addEventListener('visibilitychange',visibility);
    return()=>{gone=true;stop();sync.current=()=>{};sizeObserver.disconnect();observer.disconnect();window.removeEventListener('pointermove',move);window.removeEventListener('pointerout',out);window.removeEventListener('scroll',measure,true);window.removeEventListener('blur',rest);root.removeEventListener('keydown',key);root.removeEventListener('click',react);surface.removeEventListener('webglcontextlost',onLost);surface.removeEventListener('webglcontextrestored',onRestored);media.removeEventListener('change',changed);document.removeEventListener('visibilitychange',visibility);geometry.dispose();sphere.dispose();ribbonMaterial.dispose();coreMaterial.dispose();scene.remove(core,ribbons);renderer?.dispose();if(!root.isConnected)renderer?.forceContextLoss();surface.width=surface.height=0;delete root.dataset.ready;};
  },[compact]);
  return <div ref={host} className={`companion ${className}`} data-interactive={interactive&&!compact&&!paused||undefined} role="group" tabIndex={compact?-1:0} aria-label="Companion, a translucent animated agent. Its eyes follow your cursor. Click or press Enter for a playful laugh; arrow keys steer its gaze, Home recentres and Space pauses or resumes."><style>{styles}</style><svg className="companion-fallback" viewBox="-1.5 -1.5 3 3" aria-hidden="true"><defs><linearGradient id={id} x1="0" y1="0" x2=".8" y2="1"><stop stopColor={color(warmColor,'#ff7459')}/><stop offset=".45" stopColor="#9849ed"/><stop offset="1" stopColor={color(coolColor,'#32d7ec')}/></linearGradient><radialGradient id={`${id}-face`}><stop stopColor="#111e50"/><stop offset="1" stopColor="#030819"/></radialGradient></defs><circle r=".78" fill={`url(#${id}-face)`}/>{[0,1,2,3,4].map(i=><ellipse key={i} rx="1" ry={.75+i*.035} stroke={`url(#${id})`} strokeWidth=".12" opacity=".3" fill="none" transform={`rotate(${i*17})`}/>)}</svg><canvas ref={canvas} aria-hidden="true"/><div ref={eyes} className="companion-eyes" aria-hidden="true"><i/><i/></div></div>;
}
const styles=`.companion{--companion-size:min(73cqh,80cqw,340px);position:relative;width:100%;height:100%;min-height:0;overflow:hidden;background:#000;container-type:size;outline:none}.companion[data-interactive=true]{cursor:pointer}.companion>canvas{position:absolute;inset:0;width:100%;height:100%;opacity:0;transition:opacity 700ms cubic-bezier(.22,1,.36,1)}.companion-fallback{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:var(--companion-size);height:var(--companion-size);transition:opacity 700ms cubic-bezier(.22,1,.36,1)}.companion[data-ready=true]>canvas{opacity:1}.companion[data-ready=true] .companion-fallback{opacity:0}.companion-eyes{--blink:1;position:absolute;left:50%;top:49%;display:flex;gap:calc(var(--companion-size)*.14);transform:translate(-50%,-50%);pointer-events:none}.companion-eyes i{display:block;width:calc(var(--companion-size)*.05);height:calc(var(--companion-size)*.105);border-radius:999px;background:#f2f6ff;box-shadow:0 0 9px #c6d8ff3a;transform:scaleY(var(--blink));transform-origin:center}.companion:focus-visible{outline:1px solid #fff;outline-offset:-5px}@media(prefers-reduced-motion:reduce){.companion>canvas,.companion-fallback{transition:none}}`;
