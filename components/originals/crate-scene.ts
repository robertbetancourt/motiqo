import * as THREE from 'three';
export type CrateOptions={paused:boolean;intensity:number;speed:number};
export function recordLayout(count:number){const n=Math.max(3,Math.min(10,Math.round(count)));return Array.from({length:n},(_,i)=>(i-(n-1)/2)*CRATE_PITCH);}
/** Centres at 32-unit pitch and a 0.045-radian lean limit keep full discs separated. */
export const CRATE_PITCH=32,CRATE_RADIUS=44,CRATE_LEAN=.045;
const clamp=(n:number,a:number,b:number)=>Math.max(a,Math.min(b,n));
const spring=()=>({x:0,v:0});
function settle(s:{x:number;v:number},target:number,dt:number,omega=12){const d=s.x-target,c=s.v+omega*d,e=Math.exp(-omega*dt);s.x=target+(d+c*dt)*e;s.v=(s.v-omega*c*dt)*e;if(Math.abs(s.x-target)<.001&&Math.abs(s.v)<.003){s.x=target;s.v=0;return false;}return true;}

export function createCrateScene(canvas:HTMLCanvasElement,count:number,compact:boolean,onReady:(ready:boolean)=>void){
  const host=canvas.parentElement!,scene=new THREE.Scene(),camera=new THREE.OrthographicCamera(-220,220,155,-155,1,1200);
  camera.position.set(290,230,320);camera.lookAt(0,43,0);
  const renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:true,powerPreference:'low-power'});renderer.setClearColor(0,0);renderer.outputColorSpace=THREE.SRGBColorSpace;
  scene.add(new THREE.AmbientLight('#b9cebe',1.5));const light=new THREE.DirectionalLight('#d8d7bd',2.1);light.position.set(-100,220,130);scene.add(light);
  const geometry=new Set<THREE.BufferGeometry>(),materials=new Set<THREE.Material>();
  const track=<T extends THREE.BufferGeometry>(g:T)=>{geometry.add(g);return g;};
  const material=(color:string)=>{const m=new THREE.MeshStandardMaterial({color,roughness:.85,metalness:.16});materials.add(m);return m;};
  const plate=material('#172b24'),black=material('#101d19');
  const edge=new THREE.LineBasicMaterial({color:'#7e9788',transparent:true,opacity:.72});materials.add(edge);
  function solid(g:THREE.BufferGeometry,m:THREE.Material,parent:THREE.Object3D){const mesh=new THREE.Mesh(track(g),m);parent.add(mesh);return mesh;}
  function box(w:number,h:number,d:number,x:number,y:number,z:number){const mesh=solid(new THREE.BoxGeometry(w,h,d),plate,scene);mesh.position.set(x,y,z);const lines=new THREE.LineSegments(track(new THREE.EdgesGeometry(mesh.geometry)),edge);mesh.add(lines);}
  const n=clamp(Math.round(count),3,10),width=(n-1)*CRATE_PITCH+48;
  box(width,7,104,0,-3.5,0);box(width,26,4,0,13,-50);[-1,1].forEach(sign=>box(5,28,104,sign*(width/2-2.5),14,0));
  const shape=new THREE.Shape();shape.absarc(0,0,CRATE_RADIUS,0,Math.PI*2,false);const hole=new THREE.Path();hole.absarc(0,0,3.2,0,Math.PI*2,true);shape.holes.push(hole);
  const recordGeometry=track(new THREE.ExtrudeGeometry(shape,{depth:1.6,bevelEnabled:true,bevelSize:.22,bevelThickness:.2,bevelSegments:1,steps:1,curveSegments:48}));
  const labelGeometry=track(new THREE.RingGeometry(3.3,12,48));
  const grooveGeometry=[CRATE_RADIUS,39,34,29,24,18].map(radius=>track(new THREE.BufferGeometry().setFromPoints(Array.from({length:96},(_,i)=>new THREE.Vector3(radius*Math.cos(i/96*Math.PI*2),radius*Math.sin(i/96*Math.PI*2),1.85)))));
  const grooves=new THREE.LineBasicMaterial({color:'#6f8978',transparent:true,opacity:.55,depthWrite:false});materials.add(grooves);
  const records=Array.from({length:n},(_,i)=>{
    const pivot=new THREE.Group();pivot.position.x=(i-(n-1)/2)*CRATE_PITCH;scene.add(pivot);
    const disc=new THREE.Group();disc.position.y=CRATE_RADIUS+.5;disc.rotation.y=Math.PI/2;pivot.add(disc);
    disc.add(new THREE.Mesh(recordGeometry,black));
    const labelMat=material(['#727d64','#536e65','#91836c'][i%3]);const label=new THREE.Mesh(labelGeometry,labelMat);label.position.z=1.9;disc.add(label);
    grooveGeometry.forEach(g=>disc.add(new THREE.LineLoop(g,grooves)));
    return {pivot,lift:spring(),lean:spring(),labelMat};
  });
  const media=matchMedia('(prefers-reduced-motion: reduce)'),wanted={x:0,y:0,presence:0},current={...wanted};
  let settings:CrateOptions={paused:false,intensity:1,speed:1},frame=0,last=0,visible=true,disposed=false,small=compact,contextLost=false,release=0,pinned=-1,selected=0;
  const projected=new THREE.Vector3();
  let presented=false;
  function render(){if(contextLost||disposed)return;scene.updateMatrixWorld(true);renderer.render(scene,camera);if(!presented){presented=true;onReady(true);}}
  function stop(){cancelAnimationFrame(frame);frame=0;}
  function wake(){if(!frame&&!disposed&&!contextLost&&visible&&!document.hidden&&!settings.paused&&!media.matches){last=performance.now();frame=requestAnimationFrame(tick);}}
  function nearest(point=current){let best=Infinity,index=selected;records.forEach((r,i)=>{projected.set(r.pivot.position.x,CRATE_RADIUS+.5,0).project(camera);const d=Math.hypot((projected.x-point.x)*canvas.clientWidth/Math.max(1,canvas.clientHeight),projected.y-point.y);if(d<best){best=d;index=i;}});return {index,distance:best};}
  function tick(now:number){frame=0;if(disposed||contextLost||!visible||document.hidden||settings.paused||media.matches)return;
    const elapsed=(now-last)/1000;if(small&&elapsed<1/30){frame=requestAnimationFrame(tick);return;}
    const dt=Math.min(.05,elapsed);last=now;const alpha=1-Math.exp(-dt*11);current.x+=(wanted.x-current.x)*alpha;current.y+=(wanted.y-current.y)*alpha;current.presence+=(wanted.presence-current.presence)*alpha;
    const hot=nearest();selected=hot.index;let moving=Math.abs(current.x-wanted.x)+Math.abs(current.y-wanted.y)+Math.abs(current.presence-wanted.presence)>.002;
    records.forEach((r,i)=>{const influence=current.presence*Math.exp(-((hot.distance/.5)**2));const attention=Math.max(pinned===i?1:0,influence*Math.exp(-(((i-hot.index)/.7)**2)));
      const lean=clamp(influence*(i-hot.index)*Math.exp(-(((i-hot.index)/2)**2))*.025,-CRATE_LEAN,CRATE_LEAN);
      moving=settle(r.lift,attention*(small?19.6:28)*clamp(settings.intensity,0,1.4),dt*clamp(settings.speed,.4,2),13)||moving;
      moving=settle(r.lean,lean,dt*clamp(settings.speed,.4,2),10)||moving;
      r.pivot.position.y=clamp(r.lift.x,0,40);r.pivot.rotation.z=clamp(r.lean.x,-CRATE_LEAN,CRATE_LEAN);r.labelMat.emissive.setRGB(attention*.045,attention*.04,attention*.025);
    });render();if(moving)frame=requestAnimationFrame(tick);
  }
  function resize(){const r=host.getBoundingClientRect();small=compact||r.width<500;const aspect=r.width/Math.max(1,r.height),span=Math.max(compact?165:155,(width*.75+114*.67)*.62/Math.max(.1,aspect));camera.left=-span*aspect;camera.right=span*aspect;camera.top=span;camera.bottom=-span;camera.updateProjectionMatrix();renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,small?1:1.5));renderer.setSize(Math.max(1,r.width),Math.max(1,r.height),false);render();}
  function move(event:PointerEvent){if(settings.paused||media.matches)return;const r=canvas.getBoundingClientRect();wanted.x=(event.clientX-r.left)/r.width*2-1;wanted.y=1-(event.clientY-r.top)/r.height*2;wanted.presence=1;wake();}
  function leave(){wanted.presence=0;wake();}
  let down:{x:number;y:number}|null=null;
  const press=(event:PointerEvent)=>{down={x:event.clientX,y:event.clientY};move(event);};
  const up=(event:PointerEvent)=>{if(!compact&&down&&Math.hypot(event.clientX-down.x,event.clientY-down.y)<8&&!settings.paused&&!media.matches){const hot=nearest(wanted);pinned=pinned===hot.index?-1:hot.index;wake();}down=null;if(event.pointerType==='touch'){clearTimeout(release);release=window.setTimeout(leave,650);}};
  function key(event:KeyboardEvent){if(settings.paused||media.matches||!['ArrowLeft','ArrowRight','Home','End',' ','Enter'].includes(event.key))return;event.preventDefault();if(event.key===' '||event.key==='Enter')pinned=pinned===selected?-1:selected;else{selected=event.key==='Home'?0:event.key==='End'?n-1:clamp(selected+(event.key==='ArrowLeft'?-1:1),0,n-1);projected.set(records[selected].pivot.position.x,CRATE_RADIUS,0).project(camera);wanted.x=projected.x;wanted.y=projected.y;wanted.presence=1;}wake();}
  const lost=()=>{contextLost=true;presented=false;stop();onReady(false);},restored=()=>{contextLost=false;resize();wake();};
  canvas.addEventListener('webglcontextlost',lost);canvas.addEventListener('webglcontextrestored',restored);
  const ro=new ResizeObserver(resize),io=new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;if(visible)wake();else stop();});ro.observe(host);io.observe(host);
  const visibility=()=>{if(document.hidden)stop();else wake();},reduced=()=>{stop();if(media.matches){pinned=-1;records.forEach(r=>{r.lift.x=r.lift.v=r.lean.x=r.lean.v=0;r.pivot.position.y=r.pivot.rotation.z=0;});render();}else wake();};
  const theme=()=>{const light=document.documentElement.dataset.theme==='light';plate.color.set(light?'#d9dbd8':'#172b24');black.color.set(light?'#252625':'#101d19');edge.color.set(light?'#5d655f':'#7e9788');render();};
  media.addEventListener('change',reduced);document.addEventListener('visibilitychange',visibility);document.addEventListener('motiqo-theme-change',theme);host.addEventListener('pointermove',move);host.addEventListener('pointerdown',press);host.addEventListener('pointerup',up);host.addEventListener('pointerleave',leave);host.addEventListener('pointercancel',leave);host.addEventListener('keydown',key);host.addEventListener('blur',leave);theme();resize();
  return {setOptions(options:CrateOptions){settings=options;stop();render();wake();},dispose(){disposed=true;stop();clearTimeout(release);ro.disconnect();io.disconnect();media.removeEventListener('change',reduced);document.removeEventListener('visibilitychange',visibility);document.removeEventListener('motiqo-theme-change',theme);host.removeEventListener('pointermove',move);host.removeEventListener('pointerdown',press);host.removeEventListener('pointerup',up);host.removeEventListener('pointerleave',leave);host.removeEventListener('pointercancel',leave);host.removeEventListener('keydown',key);host.removeEventListener('blur',leave);canvas.removeEventListener('webglcontextlost',lost);canvas.removeEventListener('webglcontextrestored',restored);geometry.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());renderer.dispose();},records};
}
