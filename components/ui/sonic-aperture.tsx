'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { createKineticLoop, kineticNoise } from './kinetic-loop';
import { OpticalButton } from './optical-button';

export type SonicApertureProps = { defaultListening?: boolean; lyrics?: string[][]; primaryColor?: string; accentColor?: string; compact?: boolean; paused?: boolean; className?: string };
// A short excerpt from Michael Jackson's Human Nature; custom copy is supported.
export const sonicLyrics = [['Why, why?', "Tell 'em that", "it's human nature"]];
export function createSonicGrid(small = false) {
  const side = small ? 160 : 224, uv = new Float32Array(side * side * 2);
  for (let y=0;y<side;y++) for(let x=0;x<side;x++) uv.set([(x+.5)/side,(y+.5)/side],(y*side+x)*2);
  const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position',new THREE.BufferAttribute(new Float32Array(side*side*3),3)); geometry.setAttribute('aUv',new THREE.BufferAttribute(uv,2)); return geometry;
}
export const sonicVertex = `
attribute vec2 aUv;uniform float uTime,uMorph,uDpr;uniform vec2 uPointer;varying float vLight,vMorph,vFacing;
${kineticNoise}
vec3 shellPoint(vec3 d){float n=.6*snoise(d*1.45+uTime*.25)+.2*snoise(d*2.6-uTime*.18);return d*(1.12+n*.17);}
void main(){float theta=aUv.x*6.2831853,phi=aUv.y*3.14159265;
 theta+=.045*sin(phi*5.+uTime*.3);
 vec3 dir=vec3(sin(phi)*cos(theta),cos(phi),sin(phi)*sin(theta));
 float n=.6*snoise(dir*1.45+uTime*.25)+.2*snoise(dir*2.6-uTime*.18);
 vec3 sphere=shellPoint(dir);
 vec3 tangent=normalize(cross(abs(dir.y)>.99?vec3(1.,0.,0.):vec3(0.,1.,0.),dir)),bitangent=cross(dir,tangent);
 vec3 shellNormal=normalize(cross(shellPoint(normalize(dir+tangent*.008))-sphere,shellPoint(normalize(dir+bitangent*.008))-sphere));
 float fold=sin(theta*3.+uTime*1.4)*cos(phi*2.5-uTime*.9);
 float radius=1.65+aUv.y*1.15+fold*.21+snoise(vec3(cos(theta),sin(theta),phi)+uTime*.2)*.13;
 float jitter=fract(sin(dot(aUv,vec2(127.1,311.7)))*43758.5453);
 float ringAngle=theta+(jitter-.5)*.045+.07*sin(phi*4.+uTime*.7);
 vec3 ring=vec3(cos(ringAngle)*radius,sin(ringAngle)*radius,fold*.42+.18*sin(theta*5.+phi*4.+uTime));
 vec3 p=mix(sphere,ring,uMorph);p.xy*=1.+sin(uMorph*3.14159265)*.09;
 float cx=cos(uPointer.y*.14),sx=sin(uPointer.y*.14),cy=cos(uPointer.x*.16),sy=sin(uPointer.x*.16);
 mat3 tilt=mat3(cy,0.,-sy,0.,1.,0.,sy,0.,cy)*mat3(1.,0.,0.,0.,cx,sx,0.,-sx,cx);p=tilt*p;
 vec4 mv=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*mv;
 gl_PointSize=mix(1.15,2.3,uMorph)*uDpr*(7.3/-mv.z);
 vFacing=dot(normalize(normalMatrix*tilt*dir),normalize(-mv.xyz));
 float rim=pow(1.-abs(dot(normalize(normalMatrix*tilt*shellNormal),normalize(-mv.xyz))),3.);
 float light=pow(max(dot(shellNormal,normalize(vec3(-.6,.8,1.))),0.),4.);
 vLight=mix(clamp(.12+rim*.28+light*.68+.08*n,0.,1.),clamp(.28+.35*n+.30*fold+.3*dir.z,0.,1.),uMorph);vMorph=uMorph;
}`;
export const sonicFragment = `uniform vec3 uPrimary,uAccent;varying float vLight,vMorph,vFacing;
void main(){float d=length(gl_PointCoord-.5)*2.;if(d>1.)discard;
 float shell=(.12+.85*pow(vLight,1.3))*mix(.06,1.,smoothstep(-.12,.2,vFacing));
 float alpha=(1.-smoothstep(.15,1.,d))*mix(shell,.52,vMorph);
 vec3 col=mix(uPrimary*.45,uAccent,vLight);col=mix(col,vec3(.88,.95,1.),pow(vLight,7.)*.16);
 gl_FragColor=vec4(col,alpha);
 #include <colorspace_fragment>
 gl_FragColor.rgb=mix(gl_FragColor.rgb,col,vMorph);
}`;

export default function SonicAperture({defaultListening=false,lyrics=sonicLyrics,primaryColor='#1D4ED8',accentColor='#38BDF8',compact=false,paused=false,className=''}:SonicApertureProps){
  const host=useRef<HTMLDivElement>(null),canvas=useRef<HTMLCanvasElement>(null),text=useRef<HTMLDivElement>(null),sync=useRef<(()=>void)|null>(null);
  const [listening,setListening]=useState(defaultListening),[stanza,setStanza]=useState(0);
  const verses=useMemo(()=>lyrics.filter(v=>Array.isArray(v)&&v.some(line=>typeof line==='string'&&line.length)).map(v=>v.map(String)).slice(0,30),[lyrics]);
  const copy=verses.length?verses:sonicLyrics,options=useRef({listening,paused,primaryColor,accentColor,copy});options.current={listening,paused,primaryColor,accentColor,copy};
  useEffect(()=>setListening(defaultListening),[defaultListening]);
  useEffect(()=>{
    const root=host.current!,surface=canvas.current!,scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(48,1,.1,30);camera.position.z=7.3;
    let renderer:THREE.WebGLRenderer|null=null,geometry:THREE.BufferGeometry|null=null,material:THREE.ShaderMaterial|null=null,lost=false,broken=false;
    const uniforms={uTime:{value:0},uMorph:{value:defaultListening?1:0},uDpr:{value:1},uPointer:{value:new THREE.Vector2()},uPrimary:{value:new THREE.Color(primaryColor)},uAccent:{value:new THREE.Color(accentColor)}};
    try{renderer=new THREE.WebGLRenderer({canvas:surface,alpha:true,antialias:true,powerPreference:'high-performance'});renderer.setClearColor(0,0);renderer.debug.onShaderError=()=>{broken=true;};geometry=createSonicGrid(compact||root.clientWidth<500);material=new THREE.ShaderMaterial({uniforms,vertexShader:sonicVertex,fragmentShader:sonicFragment,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending});const points=new THREE.Points(geometry,material);points.frustumCulled=false;scene.add(points);}catch{root.dataset.gl='off';}
    let morph=defaultListening?1:0,velocity=0,time=0,lyricTime=0,previous=defaultListening,currentStanza=-1;
    const pointer=new THREE.Vector2();
    function resize(){const w=root.clientWidth||1,h=root.clientHeight||1;camera.aspect=w/h;camera.position.z=w<h?7.3*h/w:7.3;camera.updateProjectionMatrix();const dpr=Math.min(devicePixelRatio||1,compact?1.25:2);renderer?.setPixelRatio(dpr);renderer?.setSize(w,h,false);uniforms.uDpr.value=dpr;}
    function draw(dt:number,still:boolean,reduced:boolean){
      const o=options.current;if(o.listening!==previous){lyricTime=0;previous=o.listening;}
      if(!still){time+=dt;velocity+=((Number(o.listening)-morph)*70-velocity*15)*dt;morph=Math.max(0,Math.min(1,morph+velocity*dt));if(morph===0||morph===1)velocity=0;}
      if(reduced||still&&time===0){morph=Number(o.listening);if(o.listening)lyricTime=3.2;}
      if(o.listening&&morph>.65&&!still)lyricTime+=dt;
      const index=Math.floor(lyricTime/4.2)%o.copy.length;if(index!==currentStanza){currentStanza=index;setStanza(index);}
      const container=text.current;if(container){container.style.opacity=String(o.listening?Math.max(0,Math.min(1,(morph-.65)/.25)):0);const chars=container.querySelectorAll<HTMLElement>('[data-char]'),cursor=(lyricTime%4.2)/3.2*chars.length;
        chars.forEach((el,i)=>{const gap=cursor-i;el.style.opacity=reduced?'1':gap>=0?'1':gap>=-3?'.35':'0';el.style.filter=!reduced&&gap<0?'blur(1.5px)':'none';});}
      uniforms.uTime.value=time;uniforms.uMorph.value=morph;uniforms.uPointer.value.lerp(pointer,1-Math.exp(-dt*7));uniforms.uPrimary.value.set(o.primaryColor);uniforms.uAccent.value.set(o.accentColor);
      if(renderer&&!lost){renderer.render(scene,camera);if(broken)throw Error('Shader unavailable');root.dataset.gl='on';}
    }
    const loop=createKineticLoop(root,draw,resize,()=>options.current.paused||lost);sync.current=loop.sync;
    const move=(e:PointerEvent)=>{const r=root.getBoundingClientRect();pointer.set((e.clientX-r.left)/r.width*2-1,1-(e.clientY-r.top)/r.height*2);};const leave=()=>pointer.set(0,0);
    const loss=(e:Event)=>{e.preventDefault();lost=true;root.dataset.gl='off';loop.sync();},restore=()=>{lost=false;broken=false;loop.sync();};
    root.addEventListener('pointermove',move);root.addEventListener('pointerleave',leave);surface.addEventListener('webglcontextlost',loss);surface.addEventListener('webglcontextrestored',restore);
    return()=>{loop.dispose();sync.current=null;root.removeEventListener('pointermove',move);root.removeEventListener('pointerleave',leave);surface.removeEventListener('webglcontextlost',loss);surface.removeEventListener('webglcontextrestored',restore);geometry?.dispose();material?.dispose();renderer?.dispose();};
  },[compact]);
  useEffect(()=>sync.current?.(),[listening,paused,primaryColor,accentColor,copy]);
  return <div ref={host} className={`sonic-aperture ${className}`} data-open={listening} data-compact={compact||undefined}>
    <style>{`.sonic-aperture{position:relative;width:100%;height:100%;min-height:240px;overflow:hidden;background:#000;color:#fff;container-type:size}.sonic-aperture canvas{position:absolute;inset:0;width:100%;height:100%}.sa-fallback{position:absolute;left:50%;top:50%;width:28%;aspect-ratio:1;transform:translate(-50%,-50%);border-radius:50%;background:radial-gradient(circle at 35% 25%,#38bdf8,#1d4ed8 45%,#07193f 70%);box-shadow:0 0 30px #1d4ed855}.sonic-aperture[data-open=true] .sa-fallback{width:78%;background:none;border:15px solid #1d4ed866}.sonic-aperture[data-gl=on] .sa-fallback{opacity:0}.sa-lyrics{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:30cqmin;max-width:150px;text-align:center;font:600 clamp(11px,3.5cqmin,20px)/1.22 sans-serif;letter-spacing:-.04em;pointer-events:none;opacity:0;transition:opacity .3s}.sa-lyrics p{margin:0}.sa-lyrics span{white-space:pre}.sa-mic svg{pointer-events:none}.sa-mic:hover{scale:1.04}.sa-mic:active{scale:.96}@media(prefers-reduced-motion:reduce){.sa-mic,.sa-lyrics{transition:none}}`}</style>
    <div className="sa-fallback" aria-hidden="true"/><canvas ref={canvas} aria-hidden="true"/>
    <div ref={text} className="sa-lyrics" aria-label={listening?(copy[stanza%copy.length]??copy[0]).join(' '):undefined} aria-hidden={!listening}>{(copy[stanza%copy.length]??copy[0]).map((line,i)=><p key={`${stanza}-${i}`}>{Array.from(line).map((char,j)=><span data-char key={j} aria-hidden="true">{char}</span>)}</p>)}</div>
    <OpticalButton iconOnly paused={paused} compact={compact} className="sa-mic" style={{position:'absolute',bottom:compact?'4%':'5%',left:'50%',transform:'translateX(-50%)',width:compact?52:80,height:compact?44:64}} aria-label={listening?'Collapse Sonic Aperture':'Expand Sonic Aperture'} aria-pressed={listening} onPointerDown={event=>event.currentTarget.setPointerCapture?.(event.pointerId)} onClick={event=>{if(event.detail<2)setListening(v=>!v);}}><svg width={compact?14:20} height={compact?18:24} viewBox="0 0 24 28" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><rect x="8" y="2" width="8" height="15" rx="4"/><path d="M5 12v2a7 7 0 0 0 14 0v-2M12 21v5M8 26h8"/></svg></OpticalButton>
  </div>;
}
