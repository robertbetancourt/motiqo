import {createNativeGL,nativeClamp,nativeColor,type GLTarget,type GLPass} from './native-gl';
import {inkshiftWords,kineticWords,kineticLetters,kineticAdvance,kineticEase,type KineticState} from './inkshift-math';
import * as shaders from './inkshift-shaders';
export type InkshiftOptions={words:readonly string[];vorticity:number;dissipation:number;splatRadius:number;threshold:number;backgroundColor:string;foregroundColor:string;autoCycle:boolean;paused:boolean};
type Pair={read:GLTarget;write:GLTarget};
type Splat={x:number;y:number;dx:number;dy:number;dye:number};
export function createInkshiftEngine(canvas:HTMLCanvasElement,compact:boolean,read:()=>InkshiftOptions,onWord:(index:number,manual:boolean)=>void){
 const host=canvas.parentElement!,media=matchMedia('(prefers-reduced-motion: reduce)'),textCanvas=document.createElement('canvas'),ctx=textCanvas.getContext('2d');
 if(!ctx)throw Error('Text canvas unavailable');
 let gpu:ReturnType<typeof createNativeGL>|undefined,passes:Record<string,GLPass>={},velocity:Pair,dye:Pair,pressure:Pair,curl:GLTarget,divergence:GLTarget,textTexture:WebGLTexture;
 let targets:GLTarget[]=[],frame=0,disposed=false,lost=false,visible=true,width=0,height=0,time=0,last=0,energyUntil=8,fontReady=false,textDirty=true,words=kineticWords(read().words),wordsKey=JSON.stringify(words),from=0,transition=-10,direction=1;
 let lastPointer:{x:number;y:number}|undefined,dragY:number|undefined,pointerId:number|undefined,pulseStarted=-10;
 const state:KineticState={position:0,velocity:0,index:0,lastInput:-10,lastCycle:0},queue:Splat[]=[];
 const swap=(p:Pair)=>{[p.read,p.write]=[p.write,p.read];};
 function stop(){cancelAnimationFrame(frame);frame=0;}
 function fail(){stop();host.dataset.failed='true';delete host.dataset.ready;gpu?.dispose();gpu=undefined;}
 function build(){
  try{gpu=createNativeGL(canvas);if(!gpu.gl.getExtension('EXT_color_buffer_float'))throw Error('Floating point fluid targets unavailable');passes=Object.fromEntries(Object.entries(shaders).map(([key,source])=>[key,gpu!.pass(source)]));textTexture=gpu.texture();delete host.dataset.failed;}
  catch{fail();}
 }
 function makePair(w:number,h:number):Pair{const a=gpu!.target(w,h,true),b=gpu!.target(w,h,true);targets.push(a,b);return{read:a,write:b};}
 function enqueue(s:Splat){queue.push(s);if(queue.length>24)queue.shift();energyUntil=time+8;}
 function burst(){
  pulseStarted=time;energyUntil=time+8;
 }
 function change(index:number,manual:boolean,stepDirection:number){from=state.index;state.index=index;transition=time;direction=stepDirection;textDirty=true;state.lastCycle=time;burst();onWord(index,manual);}
 function step(dt:number){
  if(!gpu)return;const o=read(),vTexel=[1/velocity.read.width,1/velocity.read.height],dTexel=[1/dye.read.width,1/dye.read.height];
  const age=time-pulseStarted;
  if(age>=0&&age<1.1){const envelope=Math.sin(age/1.1*Math.PI);for(let i=0;i<6;i++){const a=i*2.399+state.index*.7+age*.3;enqueue({x:.5+Math.cos(a)*.19,y:.5+Math.sin(a)*.14,dx:Math.sin(a)*110*dt*envelope,dy:Math.cos(a)*105*dt*envelope,dye:2.1*dt*envelope});}}
  for(const s of queue.splice(0,8)){
   const params={uPoint:[s.x,s.y],uRadius:nativeClamp(o.splatRadius,.025,.22),uAspect:width/height};
   gpu.draw(passes.inkSplat,velocity.write,{...params,uSource:velocity.read,uForce:[s.dx,s.dy],uDye:0});swap(velocity);
   gpu.draw(passes.inkSplat,dye.write,{...params,uSource:dye.read,uForce:[0,0],uDye:s.dye});swap(dye);
  }
  gpu.draw(passes.inkCurl,curl,{uVelocity:velocity.read,uTexel:vTexel});
  gpu.draw(passes.inkVorticity,velocity.write,{uVelocity:velocity.read,uCurl:curl,uTexel:vTexel,uDt:dt,uStrength:nativeClamp(o.vorticity,0,80)});swap(velocity);
  gpu.draw(passes.inkDivergence,divergence,{uVelocity:velocity.read,uTexel:vTexel});
  gpu.draw(passes.inkClear,pressure.write,{uSource:pressure.read,uScale:.8});swap(pressure);
  for(let i=0;i<18;i++){gpu.draw(passes.inkPressure,pressure.write,{uPressure:pressure.read,uDivergence:divergence,uTexel:vTexel});swap(pressure);}
  gpu.draw(passes.inkGradient,velocity.write,{uPressure:pressure.read,uVelocity:velocity.read,uTexel:vTexel});swap(velocity);
  gpu.draw(passes.inkAdvect,velocity.write,{uVelocity:velocity.read,uSource:velocity.read,uVelocityTexel:vTexel,uSourceTexel:vTexel,uDt:dt,uDecay:.45});swap(velocity);
  gpu.draw(passes.inkAdvect,dye.write,{uVelocity:velocity.read,uSource:dye.read,uVelocityTexel:vTexel,uSourceTexel:dTexel,uDt:dt,uDecay:nativeClamp(o.dissipation,.08,2)});swap(dye);
 }
 function layout(word:string){
  const letters=kineticLetters(word);let font=Math.min(width*.32,256),tracking=-font*.05;
  function measure(){return letters.map(l=>{ctx!.font=`${l.weight} ${font}px MotiqoInkshift,Arial,sans-serif`;return ctx!.measureText(l.char).width+tracking;});}
  let advances=measure(),total=advances.reduce((a,b)=>a+b,0);if(total>width*.93){font*=width*.93/total;tracking=-font*.05;advances=measure();total=advances.reduce((a,b)=>a+b,0);}
  return{letters,font,advances,left:(width-total)*.5};
 }
 function paintWord(index:number,incoming:boolean){
  const l=layout(words[index]??inkshiftWords[0]),baseline=height*.5+l.font*.34;let x=l.left;
  l.letters.forEach((letter,i)=>{const q=media.matches?1:nativeClamp((time-transition-i*.026)/.52,0,1),ease=kineticEase(q),offset=incoming?(1-ease)*l.font*1.35*direction:-ease*l.font*1.35*direction;
   ctx!.save();ctx!.beginPath();ctx!.rect(x-l.font*.02,baseline-l.font*1.02,l.advances[i]+l.font*.09,l.font*1.24);ctx!.clip();ctx!.font=`${letter.weight} ${l.font}px MotiqoInkshift,Arial,sans-serif`;ctx!.fillText(letter.char,x,baseline+offset);ctx!.restore();x+=l.advances[i];});
 }
 function text(){
  if(!gpu||!textDirty)return;textCanvas.width=Math.max(1,Math.round(width* Math.min(devicePixelRatio||1,1.5)));textCanvas.height=Math.max(1,Math.round(height*Math.min(devicePixelRatio||1,1.5)));
  ctx!.setTransform(textCanvas.width/width,0,0,textCanvas.height/height,0,0);ctx!.clearRect(0,0,width,height);ctx!.fillStyle='#ffffff';
  if(time-transition<1.5&&!media.matches)paintWord(from,false);paintWord(state.index,true);gpu.upload(textTexture,textCanvas);textDirty=false;
 }
 function draw(){if(!gpu||!width||!height||lost)return;text();gpu.draw(passes.inkDisplay,null,{uDye:dye.read,uText:{texture:textTexture},uThreshold:nativeClamp(read().threshold,.1,.9),uTime:time,uBackground:nativeColor(read().backgroundColor,'#0b0c10'),uForeground:nativeColor(read().foregroundColor,'#f3f2ed'),uResolution:[width,height]});if(fontReady)host.dataset.ready='true';host.dataset.word=String(state.index);host.dataset.fluidTime=time.toFixed(3);}
 function tick(now:number){frame=0;if(disposed||lost||!visible||document.hidden||!gpu)return;const elapsed=now-last;if(elapsed<1000/60-.5){frame=requestAnimationFrame(tick);return;}last=now;const dt=Math.min(.033,elapsed/1000);
  if(!read().paused&&!media.matches){
   time+=dt;const previous=state.index,velocitySign=state.velocity<0?-1:1;
   if(kineticAdvance(state,dt,time,words.length,read().autoCycle)){const next=state.index;state.index=previous;change(next,time-state.lastInput<2.5,velocitySign);}
   // Replenish ink gently between word bursts instead of letting the idle canvas drain.
   if(read().autoCycle){const a=time*.7;enqueue({x:.5+Math.cos(a)*.17,y:.5+Math.sin(a)*.16,dx:Math.sin(a)*45*dt,dy:Math.cos(a)*40*dt,dye:1.5*dt});}
   step(dt);if(time-transition<1.5)textDirty=true;
  }
  draw();if(!read().paused&&!media.matches&&(read().autoCycle||time<energyUntil||time-transition<1.5))frame=requestAnimationFrame(tick);
 }
 function wake(){if(!disposed&&!lost&&gpu&&!frame&&visible&&!document.hidden&&!read().paused&&!media.matches){last=performance.now();frame=requestAnimationFrame(tick);}}
 function resize(){
  if(!gpu||lost)return;const box=host.getBoundingClientRect();const w=Math.max(1,box.width),h=Math.max(1,box.height);if(w===width&&h===height){draw();return;}width=w;height=h;
  const dpr=Math.min(devicePixelRatio||1,compact?1:1.5);canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);targets.forEach(t=>gpu!.release(t));targets=[];
  const ratio=w/h,side=compact?128:192,vw=Math.round(ratio>=1?side:side*ratio),vh=Math.round(ratio>=1?side/ratio:side),ds=compact?320:512,dw=Math.round(ratio>=1?ds:ds*ratio),dh=Math.round(ratio>=1?ds/ratio:ds);
  try{velocity=makePair(Math.max(16,vw),Math.max(16,vh));pressure=makePair(Math.max(16,vw),Math.max(16,vh));dye=makePair(Math.max(32,dw),Math.max(32,dh));curl=gpu.target(Math.max(16,vw),Math.max(16,vh),true);divergence=gpu.target(Math.max(16,vw),Math.max(16,vh),true);targets.push(curl,divergence);burst();for(let i=0;i<10;i++)step(1/60);textDirty=true;draw();wake();}catch{fail();}
 }
 function sync(){stop();const next=kineticWords(read().words),key=JSON.stringify(next);if(key!==wordsKey){wordsKey=key;words=next;state.position=state.index=0;from=0;transition=-10;textDirty=true;burst();onWord(0,false);}if(media.matches){transition=-10;textDirty=true;}draw();wake();}
 function point(event:PointerEvent){if(read().paused||media.matches)return;const r=host.getBoundingClientRect(),p={x:nativeClamp((event.clientX-r.left)/r.width,0,1),y:nativeClamp(1-(event.clientY-r.top)/r.height,0,1)};if(lastPointer){const distance=Math.hypot(p.x-lastPointer.x,p.y-lastPointer.y);enqueue({...p,dx:nativeClamp((p.x-lastPointer.x)*1400,-300,300),dy:nativeClamp((p.y-lastPointer.y)*1400,-300,300),dye:Math.min(.2,distance*3)});}lastPointer=p;state.lastInput=time;if(dragY!==undefined&&event.pointerId===pointerId){state.velocity=nativeClamp(state.velocity+(dragY-event.clientY)*.035,-6,6);dragY=event.clientY;}wake();}
 function leave(){lastPointer=undefined;}
 function down(e:PointerEvent){if(compact)return;pointerId=e.pointerId;dragY=e.clientY;host.setPointerCapture(e.pointerId);state.lastInput=time;point(e);}
 function up(e:PointerEvent){if(pointerId===e.pointerId){if(host.hasPointerCapture(e.pointerId))host.releasePointerCapture(e.pointerId);pointerId=undefined;dragY=undefined;lastPointer=undefined;}}
 function wheel(e:WheelEvent){if(compact)return;e.preventDefault();if(read().paused||media.matches)return;state.lastInput=time;state.velocity=nativeClamp(state.velocity+e.deltaY*(e.deltaMode===1?16:e.deltaMode===2?height:1)*.022,-6,6);enqueue({x:.5,y:.5,dx:state.velocity*65,dy:100,dye:1.5});wake();}
 function key(e:KeyboardEvent){if(e.target!==host||!['ArrowRight','ArrowDown','ArrowLeft','ArrowUp','Home',' '].includes(e.key))return;e.preventDefault();const sign=e.key==='ArrowLeft'||e.key==='ArrowUp'?-1:1;state.lastInput=time;state.velocity=0;state.position=e.key==='Home'?0:Math.round(state.position)+sign;change(((Math.round(state.position)%words.length)+words.length)%words.length,true,sign);if(media.matches||read().paused){transition=-10;textDirty=true;step(1/60);draw();}else wake();}
 function visibility(){stop();if(visible&&!document.hidden){draw();wake();}}
 function onLost(e:Event){e.preventDefault();lost=true;stop();delete host.dataset.ready;}
 function onRestored(){gpu?.dispose();gpu=undefined;lost=false;width=height=0;build();resize();}
 const size=new ResizeObserver(resize),intersection=new IntersectionObserver(([e])=>{visible=e.isIntersecting;visibility();});
 host.addEventListener('pointermove',point);host.addEventListener('pointerleave',leave);host.addEventListener('pointerdown',down);host.addEventListener('pointerup',up);host.addEventListener('pointercancel',up);host.addEventListener('keydown',key);if(!compact)host.addEventListener('wheel',wheel,{passive:false});document.addEventListener('visibilitychange',visibility);media.addEventListener('change',sync);canvas.addEventListener('webglcontextlost',onLost);canvas.addEventListener('webglcontextrestored',onRestored);
 build();size.observe(host);intersection.observe(host);resize();
 Promise.all([document.fonts?.load('100 32px MotiqoInkshift'),document.fonts?.load('800 32px MotiqoInkshift')]).catch(()=>{}).then(()=>{if(disposed)return;fontReady=true;textDirty=true;draw();});
 return{sync,dispose(){if(disposed)return;disposed=true;stop();size.disconnect();intersection.disconnect();host.removeEventListener('pointermove',point);host.removeEventListener('pointerleave',leave);host.removeEventListener('pointerdown',down);host.removeEventListener('pointerup',up);host.removeEventListener('pointercancel',up);host.removeEventListener('keydown',key);host.removeEventListener('wheel',wheel);document.removeEventListener('visibilitychange',visibility);media.removeEventListener('change',sync);canvas.removeEventListener('webglcontextlost',onLost);canvas.removeEventListener('webglcontextrestored',onRestored);gpu?.dispose();gpu=undefined;queue.length=0;canvas.width=canvas.height=textCanvas.width=textCanvas.height=0;delete host.dataset.ready;}};
}
