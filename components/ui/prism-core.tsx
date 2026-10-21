'use client';
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { createKineticLoop, kineticNoise } from './kinetic-loop';

export type PrismCoreProps = {size?:number;ior?:number;prismOffset?:number;rotationSpeed?:number;colorCycleSpeed?:number;wireframeOpacity?:number;interactive?:boolean;autoPlay?:boolean;compact?:boolean;paused?:boolean;className?:string};
const clamp=(v:number,a:number,b:number)=>Math.max(a,Math.min(b,Number.isFinite(v)?v:a));
export const coreVertex=`varying vec3 vLocal,vNormal,vWorldNormal,vWorldPoint;varying vec2 vUv;void main(){vLocal=position;vNormal=normal;vUv=uv;vWorldNormal=normalize(mat3(modelMatrix)*normal);vWorldPoint=(modelMatrix*vec4(position,1.)).xyz;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;
export const coreFragment=`
precision highp float;uniform vec3 uCamera;uniform float uTime,uIor,uOffset,uCycle,uBack;varying vec3 vLocal,vNormal,vWorldNormal,vWorldPoint;varying vec2 vUv;
${kineticNoise}
float intersectSphere(vec3 ro,vec3 rd,float r){float b=dot(ro,rd),c=dot(ro,ro)-r*r,h=b*b-c;if(h<0.)return -1.;float near=-b-sqrt(h),far=-b+sqrt(h);return near>.001?near:far>.001?far:-1.;}
vec3 spectral(float t){
 vec3 rainbow=.5+.5*cos(6.2831853*(t/3.+vec3(.0,.67,.33)));
 return pow(rainbow,vec3(1.3));
}
vec4 planet(vec3 ro,vec3 rd,float phase){
 float t=intersectSphere(ro,rd,.96);if(t<0.)return vec4(0.);
 vec3 hit=ro+rd*t,n=normalize(hit),p=hit*2.4;
 float warp=snoise(p*.85+vec3(0.,uTime*.10,0.));
 float terrain=kfbm(p+vec3(warp*.85,warp*.5,uTime*.055));
 float bands=.5+.5*sin(p.y*7.+warp*3.+terrain*4.);
 vec3 pigment=mix(spectral(phase+terrain*.38),spectral(phase+.38+terrain*.24),smoothstep(.25,.8,bands));
 float light=.64+.36*max(dot(n,normalize(vec3(-.7,.9,1.3))),0.);
 float rim=pow(1.-abs(dot(n,-rd)),3.);
 return vec4(pigment*(.55+.45*smoothstep(-.4,.5,terrain))*light+spectral(phase+.15)*rim*.35,1.);
}
// Analytic studio softboxes stay fixed in world space as the glass rotates.
vec3 studio(vec3 ray){
 float key=pow(max(dot(ray,normalize(vec3(-.65,.65,1.))),0.),55.);
 float windowLight=pow(max(dot(ray,normalize(vec3(.85,.25,.6))),0.),90.);
 float ceiling=pow(max(dot(ray,normalize(vec3(.1,1.,-.25))),0.),14.);
 float floorLight=pow(max(dot(ray,normalize(vec3(-.3,-.9,.5))),0.),28.);
 float panel=exp(-pow((ray.x+.55)/.23,4.))*smoothstep(-.95,-.65,ray.y)*(1.-smoothstep(.5,.85,ray.y));
 float ribbon=exp(-pow((ray.y+.48)/.14,4.))*(1.-smoothstep(.25,.65,abs(ray.x)));
 return vec3(.018,.024,.035)+vec3(.8,.9,1.)*(key*2.8+panel*1.5)+vec3(1.,.91,.78)*(windowLight*1.9+ribbon*.8)+vec3(.6,.72,1.)*ceiling*.25+vec3(.14,.18,.24)*floorLight;
}
void main(){
 float edge=min(min(vUv.x,1.-vUv.x),min(vUv.y,1.-vUv.y));
 float bevel=1.-smoothstep(.0,.045,edge);
 vec3 face=normalize(mix(vNormal,normalize(vLocal),bevel*.38))*(uBack>.5?-1.:1.);
 vec3 incident=normalize(vLocal-uCamera),rd=refract(incident,face,1./uIor);
 vec3 ro=vLocal+rd*max(.003,uOffset*.08);
 float phase=uTime*.22*uCycle+.35;
 vec3 tint=spectral(phase);
 float glint=1.-smoothstep(.001,.012,edge);
 float f0=pow((uIor-1.)/(uIor+1.),2.);
 float fresnel=f0+(1.-f0)*pow(1.-abs(dot(face,-incident)),5.);
 // Each wavelength follows a different refracted ray, producing real edge separation.
 vec4 center=planet(ro,rd,phase);
 vec4 red=planet(ro,refract(incident,face,1./max(1.001,uIor-.018)),phase);
 vec4 blue=planet(ro,refract(incident,face,1./(uIor+.024)),phase);
 vec3 color=vec3(red.r,center.g,blue.b);
 float coverage=max(center.a,max(red.a,blue.a));
 vec3 worldIncident=normalize(vWorldPoint-cameraPosition);
 vec3 reflected=studio(reflect(worldIncident,normalize(vWorldNormal)));
 // Clear faces, wavelength separation through the core, and a thicker beveled rim.
 vec3 absorption=exp(-vec3(.075,.035,.018)*(1.+uOffset*3.));
 color=color*absorption*(1.-fresnel)*1.08+reflected*(fresnel+bevel*.14);
 color+=mix(vec3(.58,.72,.88),tint,.12)*glint*.22;
 float alpha=clamp(.06+fresnel*.34+glint*.26+length(reflected)*.2+coverage*.86,.025,.98);
 if(uBack>.5){color=reflected*.15+vec3(.28,.4,.53)*glint*.13;alpha=.025+glint*.12+fresnel*.08;}
 // The transmission/reflection sum is premultiplied energy; Three blends straight alpha.
 gl_FragColor=vec4(color/max(alpha,.025),alpha);
 #include <colorspace_fragment>
}`;

export default function PrismCore({size=2.35,ior=1.52,prismOffset=.10,rotationSpeed=1,colorCycleSpeed=1,wireframeOpacity=.6,interactive=true,autoPlay=true,compact=false,paused=false,className=''}:PrismCoreProps){
  const host=useRef<HTMLDivElement>(null),canvas=useRef<HTMLCanvasElement>(null),sync=useRef<(()=>void)|null>(null);
  const options=useRef({size,ior,prismOffset,rotationSpeed,colorCycleSpeed,wireframeOpacity,interactive,autoPlay,paused});options.current={size,ior,prismOffset,rotationSpeed,colorCycleSpeed,wireframeOpacity,interactive,autoPlay,paused};
  useEffect(()=>{
    const root=host.current!,surface=canvas.current!,scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(42,1,.1,30);camera.position.z=6.8;
    let renderer:THREE.WebGLRenderer;try{renderer=new THREE.WebGLRenderer({canvas:surface,antialias:true,alpha:true,powerPreference:'high-performance'});}catch{root.dataset.gl='off';root.dataset.ready='true';return;}
    renderer.setClearColor(0,0);let broken=false;renderer.debug.onShaderError=()=>{broken=true;};
    const group=new THREE.Group();scene.add(group);const box=new THREE.BoxGeometry(2.35,2.35,2.35),edges=new THREE.EdgesGeometry(box);
    const uniforms={uCamera:{value:new THREE.Vector3()},uTime:{value:0},uIor:{value:ior},uOffset:{value:prismOffset},uCycle:{value:colorCycleSpeed}};
    const back=new THREE.ShaderMaterial({uniforms:{...uniforms,uBack:{value:1}},vertexShader:coreVertex,fragmentShader:coreFragment,side:THREE.BackSide,transparent:true,depthWrite:false});
    const front=new THREE.ShaderMaterial({uniforms:{...uniforms,uBack:{value:0}},vertexShader:coreVertex,fragmentShader:coreFragment,side:THREE.FrontSide,transparent:true,depthWrite:false});
    const rearMesh=new THREE.Mesh(box,back),frontMesh=new THREE.Mesh(box,front);rearMesh.renderOrder=0;frontMesh.renderOrder=1;group.add(rearMesh,frontMesh);
    const lineMaterial=new THREE.LineBasicMaterial({color:0xffffff,transparent:true,opacity:wireframeOpacity,depthWrite:false}),outerMaterial=new THREE.LineBasicMaterial({color:0xe2e8f0,transparent:true,opacity:wireframeOpacity*.3,depthWrite:false});
    const lines=new THREE.LineSegments(edges,lineMaterial),outer=new THREE.LineSegments(edges,outerMaterial);outer.scale.setScalar(1.018);lines.renderOrder=2;outer.renderOrder=3;group.add(lines,outer);
    let time=0,spin=0,lost=false,drag=false,lastX=0,lastY=0,targetX=0,targetY=0,angleX=0,angleY=0,vx=0,vy=0,dragX=0,dragY=0;
    const inverse=new THREE.Matrix4();
    function resize(){const w=root.clientWidth||1,h=root.clientHeight||1;camera.aspect=w/h;camera.position.z=w<h?6.8*h/w:6.8;camera.updateProjectionMatrix();renderer.setPixelRatio(Math.min(devicePixelRatio||1,compact?1.25:2));renderer.setSize(w,h,false);}
    function draw(dt:number,still:boolean,reduced:boolean){if(lost)return;const o=options.current;if(!still){time+=dt;if(o.autoPlay)spin+=dt*.38*clamp(o.rotationSpeed,0,3);if(!drag){dragX+=vx*dt;dragY+=vy*dt;vx*=Math.exp(-dt*5);vy*=Math.exp(-dt*5);}const ease=1-Math.exp(-dt*6);angleX+=(targetX-angleX)*ease;angleY+=(targetY-angleY)*ease;}
      group.rotation.set(.55+dragY+(reduced?0:angleY+Math.sin(spin*1.05)*.09),spin+dragX+(reduced?0:angleX),.42+Math.sin(spin*.5)*.06);
      group.scale.setScalar(clamp(o.size,.8,3.2)/2.35);group.updateMatrixWorld(true);camera.updateMatrixWorld();inverse.copy(group.matrixWorld).invert();uniforms.uCamera.value.copy(camera.position).applyMatrix4(inverse);
      uniforms.uTime.value=time;uniforms.uIor.value=clamp(o.ior+angleX*.04,1.01,2.2);uniforms.uOffset.value=clamp(o.prismOffset,0,.7);uniforms.uCycle.value=clamp(o.colorCycleSpeed,0,3);
      lineMaterial.opacity=clamp(o.wireframeOpacity,0,1)*.24;outerMaterial.opacity=lineMaterial.opacity*.12;
      renderer.render(scene,camera);if(broken)throw Error('Shader unavailable');root.dataset.gl='on';
    }
    const loop=createKineticLoop(root,draw,resize,()=>options.current.paused||lost);sync.current=loop.sync;
    const move=(e:PointerEvent)=>{if(!options.current.interactive||options.current.paused||loop.reduced())return;const rect=root.getBoundingClientRect();targetX=((e.clientX-rect.left)/rect.width-.5)*.34;targetY=((e.clientY-rect.top)/rect.height-.5)*.24;
      if(drag){const dx=e.clientX-lastX,dy=e.clientY-lastY;dragX+=dx*.008;dragY+=dy*.008;vx=dx*.35;vy=dy*.35;lastX=e.clientX;lastY=e.clientY;}};
    const down=(e:PointerEvent)=>{if(!options.current.interactive||loop.reduced())return;drag=true;lastX=e.clientX;lastY=e.clientY;root.setPointerCapture?.(e.pointerId);};
    const up=()=>{drag=false;},leave=()=>{targetX=targetY=0;};
    const key=(e:KeyboardEvent)=>{if(e.target!==root||!options.current.interactive||options.current.paused||loop.reduced()||!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home'].includes(e.key))return;e.preventDefault();if(e.key==='Home'){dragX=dragY=targetX=targetY=vx=vy=0;}else{dragX+=e.key==='ArrowLeft'?-.15:e.key==='ArrowRight'?.15:0;dragY+=e.key==='ArrowUp'?-.15:e.key==='ArrowDown'?.15:0;}loop.sync();};
    const loss=(e:Event)=>{e.preventDefault();lost=true;root.dataset.gl='off';loop.sync();},restore=()=>{lost=false;broken=false;loop.sync();};
    root.addEventListener('pointermove',move);root.addEventListener('pointerdown',down);root.addEventListener('pointerup',up);root.addEventListener('pointercancel',up);root.addEventListener('lostpointercapture',up);root.addEventListener('pointerleave',leave);root.addEventListener('keydown',key);surface.addEventListener('webglcontextlost',loss);surface.addEventListener('webglcontextrestored',restore);
    return()=>{loop.dispose();sync.current=null;root.removeEventListener('pointermove',move);root.removeEventListener('pointerdown',down);root.removeEventListener('pointerup',up);root.removeEventListener('pointercancel',up);root.removeEventListener('lostpointercapture',up);root.removeEventListener('pointerleave',leave);root.removeEventListener('keydown',key);surface.removeEventListener('webglcontextlost',loss);surface.removeEventListener('webglcontextrestored',restore);box.dispose();edges.dispose();front.dispose();back.dispose();lineMaterial.dispose();outerMaterial.dispose();renderer.dispose();};
  },[compact]);
  useEffect(()=>sync.current?.(),[size,ior,prismOffset,rotationSpeed,colorCycleSpeed,wireframeOpacity,interactive,autoPlay,paused]);
  return <div ref={host} className={`prism-core ${className}`} role="group" aria-label="Prism Core, drag or use arrow keys to rotate the dichroic cube" tabIndex={compact?-1:0}><style>{`.prism-core{position:relative;width:100%;height:100%;min-height:220px;overflow:hidden;background:#000;touch-action:pan-y;outline-offset:-4px}.prism-core canvas{position:absolute;inset:0;width:100%;height:100%}.pc-fallback{position:absolute;inset:20%;border:1px solid #cfd5e5;transform:rotate(-24deg) skew(12deg);background:radial-gradient(circle,#38bdf8,#8b5cf6 42%,#000 65%);opacity:.8}.prism-core[data-gl=on] .pc-fallback{opacity:0}`}</style><div className="pc-fallback" aria-hidden="true"/><canvas ref={canvas} aria-hidden="true"/></div>;
}
