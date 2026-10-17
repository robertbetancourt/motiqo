import {createNativeGL,nativeClamp,type GLTarget,type GLPass} from './native-gl';
import {addBrushStroke,ageBrush,brushRadius,coverUV,brushCapacity,type BrushPoint} from './atelier-math';
import {atelierMask,atelierComposite} from './atelier-shaders';
export type AtelierOptions={renderImage:string;sketchImage:string;portalSize:number;brushSize:number;trailFadeSpeed:number;edgeRoughness:number;paused:boolean};
export const atelierRender='/media/atelier-room.webp',atelierSketch='/media/atelier-sketch.webp';
export function pairedSketch(render:string,sketch:string){return sketch||(render===atelierRender?atelierSketch:'');}
export function createAtelierEngine(canvas:HTMLCanvasElement,compact:boolean,read:()=>AtelierOptions){
 const host=canvas.parentElement!,media=matchMedia('(prefers-reduced-motion: reduce)'),brush:BrushPoint[]=[],packed=new Float32Array(brushCapacity*4);
 let gpu:ReturnType<typeof createNativeGL>|undefined,maskPass:GLPass,compositePass:GLPass,mask:GLTarget|undefined,renderTexture:WebGLTexture,sketchTexture:WebGLTexture;
 let photo:HTMLImageElement|undefined,sketch:HTMLImageElement|undefined,photoReady=false,sketchReady=false,sketchPending=false,imageKey='',loadVersion=0,frame=0,disposed=false,lost=false,visible=true,width=0,height=0,last=0,time=0;
 let pointer:{x:number;y:number}|undefined,keyPoint={x:.5,y:.5};
 function stop(){cancelAnimationFrame(frame);frame=0;}
 function fail(){stop();host.dataset.failed='true';delete host.dataset.ready;gpu?.dispose();gpu=undefined;}
 function build(){try{gpu=createNativeGL(canvas);maskPass=gpu.pass(atelierMask);compositePass=gpu.pass(atelierComposite);renderTexture=gpu.texture();sketchTexture=gpu.texture();delete host.dataset.failed;}catch{fail();}}
 function draw(){
  if(!gpu||lost||!mask||!photoReady||!photo||sketchPending)return;
  packed.fill(0);brush.forEach((p,i)=>{packed[i*4]=p.x/width;packed[i*4+1]=1-p.y/height;packed[i*4+2]=brushRadius(p);packed[i*4+3]=Math.min(1,(1-p.age/.8)*3);});
  gpu.draw(maskPass,mask,{uResolution:[width,height],uPortal:nativeClamp(read().portalSize,.4,1.7),uBrushCount:brush.length,uBrush:{vec4Array:packed},uRoughness:nativeClamp(read().edgeRoughness,0,2),uTime:time});
  gpu.draw(compositePass,null,{uRender:{texture:renderTexture},uSketch:{texture:sketchTexture},uMask:mask,uCover:coverUV(width,height,photo.naturalWidth,photo.naturalHeight),uSketchCover:sketchReady&&sketch?coverUV(width,height,sketch.naturalWidth,sketch.naturalHeight):[1,1],uImageTexel:[1/photo.naturalWidth,1/photo.naturalHeight],uResolution:[width,height],uHasSketch:sketchReady?1:0});
  host.dataset.ready='true';host.dataset.brushCount=String(brush.length);
 }
 function wake(){if(!disposed&&!lost&&gpu&&!frame&&visible&&!document.hidden&&!read().paused&&!media.matches){last=performance.now();frame=requestAnimationFrame(tick);}}
 function tick(now:number){frame=0;if(disposed||lost||!visible||document.hidden)return;const dt=Math.min(.04,Math.max(0,(now-last)/1000));last=now;if(!read().paused&&!media.matches){time+=dt;ageBrush(brush,dt,nativeClamp(read().trailFadeSpeed,.25,3));}draw();if(brush.length&&!read().paused&&!media.matches)frame=requestAnimationFrame(tick);}
 function loadImages(){
  const o=read(),paired=pairedSketch(o.renderImage,o.sketchImage),key=`${o.renderImage}\n${paired}`;if(key===imageKey)return;imageKey=key;const version=++loadVersion;
  if(photo){photo.onload=photo.onerror=null;photo.src='';}if(sketch){sketch.onload=sketch.onerror=null;sketch.src='';}photoReady=sketchReady=false;delete host.dataset.ready;
  photo=new Image();photo.crossOrigin='anonymous';photo.decoding='async';
  photo.onload=()=>{if(disposed||version!==loadVersion||!gpu||lost)return;try{gpu.upload(renderTexture,photo!);photoReady=true;delete host.dataset.failed;draw();}catch{host.dataset.failed='true';}};
  photo.onerror=()=>{if(!disposed&&version===loadVersion)host.dataset.failed='true';};photo.src=o.renderImage;
  sketchPending=!!paired;
  if(paired){sketch=new Image();sketch.crossOrigin='anonymous';sketch.decoding='async';sketch.onload=()=>{if(disposed||version!==loadVersion||!gpu||lost)return;sketchPending=false;try{gpu.upload(sketchTexture,sketch!);sketchReady=true;draw();}catch{sketchReady=false;draw();}};sketch.onerror=()=>{if(!disposed&&version===loadVersion){sketchPending=false;sketchReady=false;draw();}};sketch.src=paired;}
 }
 function resize(){if(!gpu||lost)return;const r=host.getBoundingClientRect(),w=Math.max(1,r.width),h=Math.max(1,r.height);if(w===width&&h===height){draw();return;}width=w;height=h;const dpr=Math.min(devicePixelRatio||1,compact?1:1.5);canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);if(mask)gpu.release(mask);const scale=Math.min(1,(compact?256:440)/Math.max(w,h));try{mask=gpu.target(Math.max(16,Math.round(w*scale)),Math.max(16,Math.round(h*scale)));brush.length=0;draw();}catch{fail();}}
 function sync(){stop();if(media.matches)brush.length=0;loadImages();draw();if(brush.length)wake();}
 function point(e:PointerEvent){if(read().paused||media.matches)return;const r=host.getBoundingClientRect(),to={x:nativeClamp(e.clientX-r.left,0,width),y:nativeClamp(e.clientY-r.top,0,height)},radius=nativeClamp(read().brushSize,16,150)*(compact?.6:1);addBrushStroke(brush,pointer,to,radius);pointer=to;draw();wake();}
 function leave(){pointer=undefined;}
 function down(e:PointerEvent){if(e.pointerType==='touch'&&!compact)host.setPointerCapture(e.pointerId);point(e);}
 function up(e:PointerEvent){if(host.hasPointerCapture(e.pointerId))host.releasePointerCapture(e.pointerId);pointer=undefined;}
 function key(e:KeyboardEvent){if(e.target!==host||!['ArrowRight','ArrowLeft','ArrowUp','ArrowDown','Home','Escape'].includes(e.key))return;e.preventDefault();if(e.key==='Home'||e.key==='Escape'){brush.length=0;draw();return;}if(media.matches||read().paused)return;const old={x:keyPoint.x*width,y:keyPoint.y*height};keyPoint.x=nativeClamp(keyPoint.x+(e.key==='ArrowRight'?.07:e.key==='ArrowLeft'?-.07:0),.05,.95);keyPoint.y=nativeClamp(keyPoint.y+(e.key==='ArrowDown'?.07:e.key==='ArrowUp'?-.07:0),.05,.95);addBrushStroke(brush,old,{x:keyPoint.x*width,y:keyPoint.y*height},nativeClamp(read().brushSize,16,150));draw();wake();}
 function visibility(){stop();if(visible&&!document.hidden){draw();if(brush.length)wake();}}
 function onLost(e:Event){e.preventDefault();lost=true;stop();delete host.dataset.ready;}
 function onRestored(){gpu?.dispose();gpu=undefined;mask=undefined;lost=false;width=height=0;imageKey='';build();resize();loadImages();}
 const size=new ResizeObserver(resize),intersection=new IntersectionObserver(([e])=>{visible=e.isIntersecting;visibility();});
 host.addEventListener('pointermove',point);host.addEventListener('pointerleave',leave);host.addEventListener('pointerdown',down);host.addEventListener('pointerup',up);host.addEventListener('pointercancel',up);host.addEventListener('keydown',key);media.addEventListener('change',sync);document.addEventListener('visibilitychange',visibility);canvas.addEventListener('webglcontextlost',onLost);canvas.addEventListener('webglcontextrestored',onRestored);
 build();size.observe(host);intersection.observe(host);resize();loadImages();
 return{sync,dispose(){if(disposed)return;disposed=true;loadVersion++;stop();size.disconnect();intersection.disconnect();host.removeEventListener('pointermove',point);host.removeEventListener('pointerleave',leave);host.removeEventListener('pointerdown',down);host.removeEventListener('pointerup',up);host.removeEventListener('pointercancel',up);host.removeEventListener('keydown',key);media.removeEventListener('change',sync);document.removeEventListener('visibilitychange',visibility);canvas.removeEventListener('webglcontextlost',onLost);canvas.removeEventListener('webglcontextrestored',onRestored);if(photo){photo.onload=photo.onerror=null;photo.src='';}if(sketch){sketch.onload=sketch.onerror=null;sketch.src='';}gpu?.dispose();gpu=undefined;brush.length=0;canvas.width=canvas.height=0;delete host.dataset.ready;}};
}
