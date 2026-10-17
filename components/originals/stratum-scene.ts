import * as THREE from 'three';
import {createPillarLayout,pillarHeight,interactiveHeight,springPillar,pillarPitch,stratumGrid,stratumClamp,stratumHex,stratumModes,type SequenceMode,type HoverEffect,type StratumPalette,type Shockwave} from './stratum-math';
export type StratumOptions={gridSize:number;maxHeight:number;waveSpeed:number;sequenceMode:SequenceMode;hoverEffect:HoverEffect;colorPalette:StratumPalette;paused:boolean};

export function createStratumScene(canvas:HTMLCanvasElement,compact:boolean,read:()=>StratumOptions){
 const host=canvas.parentElement!,media=matchMedia('(prefers-reduced-motion: reduce)');
 const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});
 renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,compact?1.25:1.75));renderer.outputColorSpace=THREE.SRGBColorSpace;
 renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.VSMShadowMap;
 const scene=new THREE.Scene(),camera=new THREE.OrthographicCamera(-5,5,5,-5,.1,100);
 camera.position.set(9,7.7,9);camera.lookAt(0,1.7,0);camera.updateMatrixWorld();
 const geometry=new THREE.BoxGeometry(.12,1,.12);geometry.translate(0,.5,0);
 const material=new THREE.MeshStandardMaterial({color:'#9ca3af',roughness:.4,metalness:.1});
 const floorGeometry=new THREE.PlaneGeometry(200,200),floorMaterial=new THREE.MeshStandardMaterial({color:'#101114',roughness:.95,metalness:0}),floor=new THREE.Mesh(floorGeometry,floorMaterial);
 floor.rotation.x=-Math.PI/2;floor.receiveShadow=true;scene.add(floor);
 const ambient=new THREE.HemisphereLight('#eef0f4','#23262d',.95),sun=new THREE.DirectionalLight('#eef0f4',2.2);
 const fill=new THREE.PointLight('#eef0f4',65,40,2);fill.position.set(7,5,4);scene.add(fill);
 sun.position.set(8,12,-2);sun.castShadow=true;sun.shadow.mapSize.set(compact?512:1024,compact?512:1024);sun.shadow.bias=-.00015;sun.shadow.normalBias=.015;sun.shadow.radius=compact?6:12;sun.shadow.blurSamples=12;
 Object.assign(sun.shadow.camera,{left:-8,right:8,top:8,bottom:-8,near:1,far:40});sun.shadow.camera.updateProjectionMatrix();scene.add(ambient,sun,sun.target);
 const pickGeometry=new THREE.PlaneGeometry(1,1),pickMaterial=new THREE.MeshBasicMaterial({visible:false,side:THREE.DoubleSide}),pickPlane=new THREE.Mesh(pickGeometry,pickMaterial);
 pickPlane.rotation.x=-Math.PI/2;pickPlane.position.y=.001;scene.add(pickPlane);
 const raycaster=new THREE.Raycaster(),ndc=new THREE.Vector2(),projected=new THREE.Vector3(),shocks:Shockwave[]=[];
 let layout=createPillarLayout(read().gridSize),mesh:THREE.InstancedMesh,frame=0,last=0,time=2.1,disposed=false,lost=false,visible=true,held=false,width=0,height=0;
 let hover=0,hoverTarget=0,hoverX=0,hoverZ=0,targetX=0,targetZ=0,paletteKey='';
 function stop(){cancelAnimationFrame(frame);frame=0;}
 function seed(){
  if(mesh&&layout.n===stratumGrid(read().gridSize))return;
  if(mesh){scene.remove(mesh);mesh.dispose();}layout=createPillarLayout(read().gridSize);
  mesh=new THREE.InstancedMesh(geometry,material,layout.n*layout.n);mesh.instanceMatrix=new THREE.InstancedBufferAttribute(layout.matrices,16).setUsage(THREE.DynamicDrawUsage);mesh.castShadow=mesh.receiveShadow=true;mesh.frustumCulled=false;scene.add(mesh);
  const span=(layout.n-1)*pillarPitch+.12;pickPlane.scale.set(span,span,1);pickPlane.updateMatrixWorld(true);hoverTarget=hover=0;shocks.length=0;
  update(0,true);fit();host.dataset.pillars=String(mesh.count);
 }
 function fit(){
  if(!width||!height)return;
  // Fit the full anchored volume, including its tallest possible pose, at every aspect ratio.
  const half=(layout.n-1)*pillarPitch*.5+.12;let xMin=Infinity,xMax=-Infinity,yMin=Infinity,yMax=-Infinity;
  camera.left=-1;camera.right=1;camera.top=1;camera.bottom=-1;camera.updateProjectionMatrix();
  for(const x of [-half,half])for(const y of [0,4.5])for(const z of [-half,half]){projected.set(x,y,z).project(camera);xMin=Math.min(xMin,projected.x);xMax=Math.max(xMax,projected.x);yMin=Math.min(yMin,projected.y);yMax=Math.max(yMax,projected.y);}
  const aspect=width/height,halfH=Math.max((yMax-yMin)*.5,(xMax-xMin)*.5/aspect)*1.14,cx=(xMin+xMax)*.5,cy=(yMin+yMax)*.5;
  camera.left=cx-halfH*aspect;camera.right=cx+halfH*aspect;camera.top=cy+halfH;camera.bottom=cy-halfH;camera.updateProjectionMatrix();
 }
 function palette(){const p=read().colorPalette,bg=stratumHex(p.background,'#101114'),pillars=stratumHex(p.pillars,'#9ca3af'),light=stratumHex(p.light,'#eef0f4'),key=bg+pillars+light;if(key===paletteKey)return;paletteKey=key;scene.background=new THREE.Color(bg);floorMaterial.color.set(bg);material.color.set(pillars);sun.color.set(light);ambient.color.set(light);fill.color.set(light);}
 function update(dt:number,snap=false){
  const o=read(),max=stratumClamp(o.maxHeight,.05,4.5);hover+=(hoverTarget-hover)*(1-Math.exp(-dt*9));hoverX+=(targetX-hoverX)*(1-Math.exp(-dt*14));hoverZ+=(targetZ-hoverZ)*(1-Math.exp(-dt*14));
  for(let i=0;i<layout.heights.length;i++){const x=layout.matrices[i*16+12],z=layout.matrices[i*16+14],base=pillarHeight(o.sequenceMode,x,z,Math.floor(i/layout.n),i%layout.n,time,max),target=interactiveHeight(base,x,z,max,hoverX,hoverZ,hover,o.hoverEffect,shocks,time);springPillar(layout,i,target,dt,max,snap);}
  const life=Math.SQRT2*layout.n*pillarPitch/2.7+1;while(shocks.length&&time-shocks[0].born>life)shocks.shift();mesh.instanceMatrix.needsUpdate=true;
 }
 function draw(){if(disposed||lost||!width||!height)return;palette();renderer.render(scene,camera);host.dataset.ready='true';host.dataset.sequence=read().sequenceMode==='auto'?stratumModes[Math.floor(time/8)%4]:read().sequenceMode;host.dataset.matrixTime=time.toFixed(3);host.dataset.shocks=String(shocks.length);}
 function running(){return !disposed&&!lost&&visible&&!document.hidden&&!held&&!read().paused&&!media.matches;}
 function wake(){if(!frame&&running()){last=performance.now();frame=requestAnimationFrame(tick);}}
 function tick(now:number){frame=0;if(!running())return;const elapsed=now-last;if(elapsed<1000/60-.5){frame=requestAnimationFrame(tick);return;}last=now;const dt=Math.min(.033,Math.max(.001,elapsed/1000));time+=dt*stratumClamp(read().waveSpeed,.1,3);update(dt);draw();wakeNext();}
 function wakeNext(){if(running())frame=requestAnimationFrame(tick);}
 function sync(){stop();seed();palette();update(0,media.matches);draw();wake();}
 function resize(){const box=host.getBoundingClientRect();width=Math.max(1,box.width);height=Math.max(1,box.height);renderer.setSize(width,height,false);fit();draw();wake();}
 function hit(e:PointerEvent){const rect=canvas.getBoundingClientRect();ndc.set((e.clientX-rect.left)/rect.width*2-1,1-(e.clientY-rect.top)/rect.height*2);raycaster.setFromCamera(ndc,camera);return raycaster.intersectObject(pickPlane,false)[0]?.point;}
 function move(e:PointerEvent){if(!running())return;const point=hit(e);hoverTarget=point?1:0;if(point){targetX=point.x;targetZ=point.z;}wake();}
 function leave(){hoverTarget=0;}
 function shock(x:number,z:number){if(!running())return;shocks.push({x,z,born:time});if(shocks.length>4)shocks.shift();wake();}
 function down(e:PointerEvent){if(!running())return;const point=hit(e);if(point){targetX=hoverX=point.x;targetZ=hoverZ=point.z;hoverTarget=1;shock(point.x,point.z);}if(e.pointerType==='touch'&&!compact)host.setPointerCapture(e.pointerId);}
 function up(e:PointerEvent){if(host.hasPointerCapture(e.pointerId))host.releasePointerCapture(e.pointerId);if(e.pointerType==='touch')leave();}
 function key(e:KeyboardEvent){if(e.target!==host||!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Enter',' ','Home','Escape'].includes(e.key))return;e.preventDefault();const bound=(layout.n-1)*pillarPitch*.5;
  if(e.key===' '){if(!read().paused&&!media.matches){held=!held;host.dataset.held=String(held);sync();}return;}
  if(e.key==='Home'){time=2.1;shocks.length=0;hoverTarget=hover=0;update(0,true);draw();wake();return;}
  if(e.key==='Escape'){shocks.length=0;hoverTarget=0;wake();return;}if(!running())return;
  if(e.key==='Enter'){shock(targetX,targetZ);return;}targetX=stratumClamp(targetX+(e.key==='ArrowRight'?pillarPitch:e.key==='ArrowLeft'?-pillarPitch:0),-bound,bound);targetZ=stratumClamp(targetZ+(e.key==='ArrowDown'?pillarPitch:e.key==='ArrowUp'?-pillarPitch:0),-bound,bound);hoverTarget=1;wake();
 }
 function visibility(){stop();if(visible&&!document.hidden){draw();wake();}}
 function onLost(e:Event){e.preventDefault();lost=true;stop();delete host.dataset.ready;}
 function onRestored(){lost=false;mesh.instanceMatrix.needsUpdate=true;sync();}
 const size=new ResizeObserver(resize),intersection=new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;visibility();});
 host.addEventListener('pointermove',move);host.addEventListener('pointerleave',leave);host.addEventListener('pointerdown',down);host.addEventListener('pointerup',up);host.addEventListener('pointercancel',up);host.addEventListener('keydown',key);document.addEventListener('visibilitychange',visibility);media.addEventListener('change',sync);canvas.addEventListener('webglcontextlost',onLost);canvas.addEventListener('webglcontextrestored',onRestored);
 function dispose(){if(disposed)return;disposed=true;stop();size.disconnect();intersection.disconnect();host.removeEventListener('pointermove',move);host.removeEventListener('pointerleave',leave);host.removeEventListener('pointerdown',down);host.removeEventListener('pointerup',up);host.removeEventListener('pointercancel',up);host.removeEventListener('keydown',key);document.removeEventListener('visibilitychange',visibility);media.removeEventListener('change',sync);canvas.removeEventListener('webglcontextlost',onLost);canvas.removeEventListener('webglcontextrestored',onRestored);mesh?.dispose();geometry.dispose();material.dispose();floorGeometry.dispose();floorMaterial.dispose();pickGeometry.dispose();pickMaterial.dispose();sun.shadow.dispose();scene.clear();renderer.dispose();canvas.width=canvas.height=0;delete host.dataset.ready;}
 try{seed();palette();size.observe(host);intersection.observe(host);resize();}catch(error){dispose();throw error;}
 return{sync,dispose};
}
