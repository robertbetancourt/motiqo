'use client';
import {useEffect,useId,useMemo,useRef} from 'react';
import * as THREE from 'three';
import {createConstellation,createConstellationParticles,constellationClamp} from './constellation-math';
import {constellationVertex,constellationFragment,constellationThreadVertex,constellationThreadFragment} from './constellation-shaders';
export type ConstellationProps={compact?:boolean;paused?:boolean;speed?:number;intensity?:number;nodes?:number;density?:number;accent?:string};
export default function Constellation({compact=false,paused=false,speed=1,intensity=1,nodes=42,density=1,accent='#7ddfef'}:ConstellationProps){
  const host=useRef<HTMLDivElement>(null),canvas=useRef<HTMLCanvasElement>(null),sync=useRef<()=>void>(()=>{}),id=useId().replace(/:/g,'');
  const options=useRef({nodes,density,speed,intensity,accent,paused});options.current={nodes,density,speed,intensity,accent,paused};
  const fallback=useMemo(()=>createConstellation(42),[]);
  useEffect(()=>sync.current(),[nodes,density,speed,intensity,accent,paused]);
  useEffect(()=>{
    const root=host.current!,surface=canvas.current!,media=matchMedia('(prefers-reduced-motion: reduce)');
    let renderer:THREE.WebGLRenderer|null=null,gone=false,lost=false,visible=true,raf=0,last=0,time=0,width=1,height=1,count=0,sampleStart=0,samples=0,x=0,y=0,tx=0,ty=0,presence=0,targetPresence=0,held=false;
    const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(38,1,.1,50);camera.position.z=4.8;
    const uniforms={uTime:{value:0},uIntensity:{value:intensity},uPixelScale:{value:1},uBurst:{value:0},uHand:{value:new THREE.Vector2()},uAccent:{value:new THREE.Color(accent)}};
    const material=new THREE.ShaderMaterial({uniforms,vertexShader:constellationVertex,fragmentShader:constellationFragment,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false});
    const threadMaterial=new THREE.ShaderMaterial({uniforms,vertexShader:constellationThreadVertex,fragmentShader:constellationThreadFragment,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false});
    const points=new THREE.Points(new THREE.BufferGeometry(),material),threads=new THREE.LineSegments(new THREE.BufferGeometry(),threadMaterial);points.frustumCulled=threads.frustumCulled=false;scene.add(points,threads);let nodeCount=0,burst=0;
    function stop(){cancelAnimationFrame(raf);raf=0;}
    function draw(){
      if(!renderer||gone||lost)return;const o=options.current,desired=Math.round(constellationClamp((compact?9000:24000)*o.density,5000,40000)),desiredNodes=Math.round(constellationClamp(o.nodes,20,120));
      if(count!==desired||nodeCount!==desiredNodes){const data=createConstellationParticles(desiredNodes,desired),geometry=new THREE.BufferGeometry(),filaments=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(data.positions,3));geometry.setAttribute('aSeed',new THREE.BufferAttribute(data.seeds,4));filaments.setAttribute('position',new THREE.BufferAttribute(data.lines,3));filaments.setAttribute('aTrace',new THREE.BufferAttribute(data.traces,2));points.geometry.dispose();threads.geometry.dispose();points.geometry=geometry;threads.geometry=filaments;count=desired;nodeCount=desiredNodes;}
      uniforms.uTime.value=media.matches?0:time;uniforms.uIntensity.value=constellationClamp(o.intensity,0,1.5);uniforms.uHand.value.set(x*presence,y*presence);uniforms.uBurst.value=media.matches?0:burst;uniforms.uAccent.value.set(/^#[\da-f]{6}$/i.test(o.accent)?o.accent:'#7ddfef');
      renderer.render(scene,camera);root.dataset.ready='true';root.dataset.particles=String(count);root.dataset.sceneTime=uniforms.uTime.value.toFixed(3);root.dataset.sceneBurst=uniforms.uBurst.value.toFixed(3);root.dataset.presence=presence.toFixed(3);
    }
    function tick(now:number){
      raf=0;if(gone||lost||!root.isConnected||!visible||document.hidden)return;
      if(options.current.paused||held||media.matches){draw();return;}
      const elapsed=now-last;if(elapsed<1000/60-.5){raf=requestAnimationFrame(tick);return;}
      const dt=Math.min(.05,elapsed/1000),a=1-Math.exp(-dt*7);last=now;time+=dt*constellationClamp(options.current.speed,.2,2);burst=Math.max(0,burst-dt*.7);x+=(tx-x)*a;y+=(ty-y)*a;presence+=(targetPresence-presence)*a;draw();
      samples++;if(now-sampleStart>=750){root.dataset.fps=(samples*1000/(now-sampleStart)).toFixed(1);sampleStart=now;samples=0;}
      raf=requestAnimationFrame(tick);
    }
    function wake(){if(!gone&&!lost&&renderer&&!raf&&visible&&!document.hidden){last=sampleStart=performance.now();samples=0;raf=requestAnimationFrame(tick);}}
    function resize(){const box=root.getBoundingClientRect();width=Math.max(1,box.width);height=Math.max(1,box.height);if(!renderer)return;const dpr=Math.min(window.devicePixelRatio||1,compact?1:1.5);renderer.setPixelRatio(dpr);renderer.setSize(width,height,false);camera.aspect=width/height;camera.position.z=4.8*Math.max(1,.85/camera.aspect);camera.updateProjectionMatrix();uniforms.uPixelScale.value=height*dpr/(2*Math.tan(38*Math.PI/360));draw();wake();}
    function changed(){stop();if(media.matches)x=y=tx=ty=presence=targetPresence=0;draw();wake();}sync.current=changed;
    function visibility(){stop();wake();}
    function move(event:PointerEvent){if(options.current.paused||held||media.matches)return;const box=root.getBoundingClientRect();tx=constellationClamp((event.clientX-box.left)/width*2-1,-1,1);ty=constellationClamp(1-(event.clientY-box.top)/height*2,-1,1);targetPresence=1;wake();}
    function activate(event:PointerEvent){move(event);if(!options.current.paused&&!media.matches){burst=1;wake();}}
    function leave(){targetPresence=0;wake();}
    function up(event:PointerEvent){if(event.pointerType!=='mouse')leave();}
    function key(event:KeyboardEvent){if(event.target!==root||media.matches||options.current.paused)return;if(event.key===' '){event.preventDefault();burst=1;changed();}else if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home'].includes(event.key)){event.preventDefault();if(event.key==='Home')leave();else{tx=constellationClamp(tx+(event.key==='ArrowLeft'?-.25:event.key==='ArrowRight'?.25:0),-1,1);ty=constellationClamp(ty+(event.key==='ArrowUp'?.25:event.key==='ArrowDown'?-.25:0),-1,1);targetPresence=1;wake();}}}
    function contextLost(event:Event){event.preventDefault();lost=true;stop();delete root.dataset.ready;}
    function contextRestored(){lost=false;resize();wake();}
    try{renderer=new THREE.WebGLRenderer({canvas:surface,alpha:false,antialias:false,powerPreference:'high-performance'});renderer.setClearColor('#08080a',1);renderer.outputColorSpace=THREE.SRGBColorSpace;delete root.dataset.failed;}catch{root.dataset.failed='true';}
    const size=new ResizeObserver(resize),observer=new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;visibility();});
    surface.addEventListener('webglcontextlost',contextLost);surface.addEventListener('webglcontextrestored',contextRestored);root.addEventListener('pointermove',move);root.addEventListener('pointerdown',activate);root.addEventListener('pointerleave',leave);root.addEventListener('pointerup',up);root.addEventListener('pointercancel',leave);root.addEventListener('keydown',key);media.addEventListener('change',changed);document.addEventListener('visibilitychange',visibility);size.observe(root);observer.observe(root);resize();
    return()=>{gone=true;stop();sync.current=()=>{};size.disconnect();observer.disconnect();root.removeEventListener('pointermove',move);root.removeEventListener('pointerdown',activate);root.removeEventListener('pointerleave',leave);root.removeEventListener('pointerup',up);root.removeEventListener('pointercancel',leave);root.removeEventListener('keydown',key);media.removeEventListener('change',changed);document.removeEventListener('visibilitychange',visibility);surface.removeEventListener('webglcontextlost',contextLost);surface.removeEventListener('webglcontextrestored',contextRestored);points.geometry.dispose();threads.geometry.dispose();material.dispose();threadMaterial.dispose();scene.remove(points,threads);renderer?.dispose();if(!root.isConnected)renderer?.forceContextLoss();surface.width=surface.height=0;delete root.dataset.ready;};
  },[compact]);
  return <div ref={host} className="constellation" tabIndex={compact?-1:0} role="group" aria-label="Constellation, a luminous three-dimensional stellar sphere. Move to turn, click or Space sends a light pulse. Arrow keys steer and Home resets."><style>{styles}</style><svg className="constellation-fallback" viewBox="-1.65 -1.65 3.3 3.3" aria-hidden="true"><defs><radialGradient id={id}><stop stopColor="#283d6f" stopOpacity=".06"/><stop offset=".83" stopColor="#447595" stopOpacity=".08"/><stop offset="1" stopColor="#7ddfef" stopOpacity="0"/></radialGradient></defs><circle r="1.12" fill={`url(#${id})`}/><g fill="none" stroke="#7ddfef" strokeWidth=".003" opacity=".3">{fallback.edges.map(([a,b],i)=><path key={i} d={`M${fallback.nodes[a].pos[0].toFixed(4)},${fallback.nodes[a].pos[1].toFixed(4)}L${fallback.nodes[b].pos[0].toFixed(4)},${fallback.nodes[b].pos[1].toFixed(4)}`}/>)}</g>{fallback.nodes.map((p,i)=><circle key={i} cx={p.pos[0].toFixed(4)} cy={p.pos[1].toFixed(4)} r=".009" fill="#b5ebff"/>)}</svg><canvas ref={canvas} aria-hidden="true"/></div>;
}
const styles=`.constellation{position:relative;width:100%;height:100%;min-height:0;overflow:hidden;outline:none;background:#08080a}.constellation>canvas,.constellation-fallback{position:absolute;inset:0;width:100%;height:100%;display:block;pointer-events:none;transition:opacity 650ms linear}.constellation>canvas{opacity:0}.constellation[data-ready=true]>canvas{opacity:1}.constellation[data-ready=true] .constellation-fallback{opacity:0}.constellation:focus-visible{outline:1px solid #fff;outline-offset:-5px}@media(prefers-reduced-motion:reduce){.constellation>canvas,.constellation-fallback{transition:none}}`;
