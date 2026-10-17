import * as THREE from 'three';
import {chargeClamp,chargeHex,chargeParticle,createChargeParticles} from './charge-math';
import {chargeVertex,chargeFragment,chargePointVertex,chargePointFragment} from './charge-shaders';
export type ChargeOptions={percentage:number;flowSpeed:number;particleCount:number;primaryColor:string;secondaryColor:string;animateCount:boolean;paused:boolean};

export function createChargeScene(canvas:HTMLCanvasElement,compact:boolean,read:()=>ChargeOptions,onValue:(value:number)=>void){
 const panel=canvas.parentElement!,host=panel.parentElement!,media=matchMedia('(prefers-reduced-motion: reduce)');
 const renderer=new THREE.WebGLRenderer({canvas,alpha:false,antialias:false,powerPreference:'high-performance'});
 renderer.setClearColor(0x000000,1);renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,compact?1.25:1.75));
 const scene=new THREE.Scene(),camera=new THREE.Camera(),plane=new THREE.PlaneGeometry(2,2);
 const uniforms={uTime:{value:2.7},uAspect:{value:2},uPrimary:{value:new THREE.Color()},uSecondary:{value:new THREE.Color()}};
 const material=new THREE.ShaderMaterial({vertexShader:chargeVertex,fragmentShader:chargeFragment,uniforms,depthWrite:false,depthTest:false});
 const field=new THREE.Mesh(plane,material);field.frustumCulled=false;scene.add(field);
 const pointUniforms={uAspect:{value:2},uDpr:{value:renderer.getPixelRatio()},uScale:{value:1}};
 const pointMaterial=new THREE.ShaderMaterial({vertexShader:chargePointVertex,fragmentShader:chargePointFragment,uniforms:pointUniforms,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,depthTest:false});
 let geometry=new THREE.BufferGeometry(),particles=createChargeParticles(read().particleCount),count=0;
 const points=new THREE.Points(geometry,pointMaterial);points.frustumCulled=false;points.renderOrder=1;scene.add(points);
 let positions=new Float32Array(0),fades=new Float32Array(0),colors=new Float32Array(0);
 let frame=0,disposed=false,lost=false,visible=true,held=false,time=2.7,last=0,width=0,height=0,shown=compact||media.matches||read().paused||!read().animateCount?chargeClamp(read().percentage,0,100):0;
 let previousNumber=-1,primary='',secondary='',valueTarget=chargeClamp(read().percentage,0,100);
 function stop(){cancelAnimationFrame(frame);frame=0;}
 function seed(){
  const desired=Math.round(chargeClamp(read().particleCount,150,300));
  if(desired===count)return;count=desired;particles=createChargeParticles(count);
  geometry.dispose();geometry=new THREE.BufferGeometry();points.geometry=geometry;
  positions=new Float32Array(count*3);fades=new Float32Array(count);colors=new Float32Array(count*3);
  geometry.setAttribute('position',new THREE.BufferAttribute(positions,3).setUsage(THREE.DynamicDrawUsage));
  geometry.setAttribute('aFade',new THREE.BufferAttribute(fades,1).setUsage(THREE.DynamicDrawUsage));
  geometry.setAttribute('aSize',new THREE.BufferAttribute(Float32Array.from(particles,p=>p.size),1));
  geometry.setAttribute('aColor',new THREE.BufferAttribute(colors,3));primary='';
 }
 function palette(){
  const o=read(),a=chargeHex(o.primaryColor,'#00e5ff'),b=chargeHex(o.secondaryColor,'#ffb52e');
  if(a===primary&&b===secondary)return;primary=a;secondary=b;uniforms.uPrimary.value.set(a);uniforms.uSecondary.value.set(b);
  const white=new THREE.Color('#efffff'),c=new THREE.Color();
  particles.forEach((p,i)=>{c.copy(p.warm<.28?uniforms.uSecondary.value:uniforms.uPrimary.value).lerp(white,p.warm>.7?.82:.2);c.toArray(colors,i*3);});
  geometry.getAttribute('aColor').needsUpdate=true;
 }
 function number(){const n=Math.round(shown);if(n!==previousNumber){previousNumber=n;onValue(n);}}
 function draw(){
  if(disposed||lost||!width||!height)return;seed();palette();
  const aspect=height/width,pose=media.matches?2.7:time;
  uniforms.uTime.value=pose;uniforms.uAspect.value=pointUniforms.uAspect.value=aspect;
  particles.forEach((p,i)=>{const v=chargeParticle(p,pose,aspect);positions[i*3]=v.x;positions[i*3+1]=v.y;fades[i]=v.fade;});
  geometry.getAttribute('position').needsUpdate=true;geometry.getAttribute('aFade').needsUpdate=true;
  renderer.render(scene,camera);number();host.dataset.ready='true';host.dataset.flowTime=pose.toFixed(3);host.dataset.particles=String(count);
 }
 function tick(now:number){
  frame=0;if(disposed||lost||!visible||document.hidden)return;
  const elapsed=now-last;if(elapsed<1000/60-.5){frame=requestAnimationFrame(tick);return;}
  const dt=Math.min(.05,Math.max(.001,elapsed/1000));last=now;
  const o=read();valueTarget=chargeClamp(o.percentage,0,100);
  if(!o.paused&&!held&&!media.matches){time+=dt*chargeClamp(o.flowSpeed,.1,3);shown+= (valueTarget-shown)*(1-Math.exp(-dt*3.7));if(Math.abs(valueTarget-shown)<.03)shown=valueTarget;}
  if(media.matches||!o.animateCount)shown=valueTarget;
  draw();if(!o.paused&&!held&&!media.matches)frame=requestAnimationFrame(tick);
 }
 function wake(){if(!disposed&&!lost&&!frame&&visible&&!document.hidden){last=performance.now();frame=requestAnimationFrame(tick);}}
 function sync(){stop();if(media.matches||!read().animateCount||read().paused||held)shown=chargeClamp(read().percentage,0,100);draw();if(!read().paused&&!held&&!media.matches)wake();}
 function resize(){
  const box=host.getBoundingClientRect();width=Math.max(1,Math.min(box.width*.86,box.height*.64,380));height=Math.max(width*2,box.height*1.08);
  panel.style.width=`${width}px`;panel.style.height=`${height}px`;
  renderer.setSize(width,height,false);pointUniforms.uScale.value=Math.max(.65,width/380);draw();wake();
 }
 function visibility(){stop();if(visible&&!document.hidden){draw();if(!read().paused&&!held&&!media.matches)wake();}}
 function key(e:KeyboardEvent){if(e.target!==panel||e.key!==' '||media.matches||read().paused)return;e.preventDefault();held=!held;host.dataset.held=String(held);sync();}
 function onLost(e:Event){e.preventDefault();lost=true;stop();delete host.dataset.ready;}
 function onRestored(){lost=false;sync();}
 const observer=new ResizeObserver(resize),intersection=new IntersectionObserver(([e])=>{visible=e.isIntersecting;visibility();});
 panel.addEventListener('keydown',key);media.addEventListener('change',sync);document.addEventListener('visibilitychange',visibility);canvas.addEventListener('webglcontextlost',onLost);canvas.addEventListener('webglcontextrestored',onRestored);
 observer.observe(host);intersection.observe(host);resize();
 return{sync,dispose(){if(disposed)return;disposed=true;stop();observer.disconnect();intersection.disconnect();panel.removeEventListener('keydown',key);media.removeEventListener('change',sync);document.removeEventListener('visibilitychange',visibility);canvas.removeEventListener('webglcontextlost',onLost);canvas.removeEventListener('webglcontextrestored',onRestored);geometry.dispose();plane.dispose();material.dispose();pointMaterial.dispose();scene.clear();renderer.dispose();canvas.width=canvas.height=0;delete host.dataset.ready;}};
}
