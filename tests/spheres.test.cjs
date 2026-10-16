const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),ts=require('typescript'),React=require('react');
const {JSDOM}=require('jsdom');
function load(file,mocks={}){const filename=path.resolve(__dirname,'..',file),entry=new Module(filename,module);entry.filename=filename;entry.paths=Module._nodeModulePaths(path.dirname(filename));const normal=entry.require.bind(entry);entry.require=id=>mocks[id]??normal(id);entry._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022},fileName:filename}).outputText,filename);return entry.exports;}
const stage=load('components/originals/sphere-stage.tsx'),nexus=load('components/originals/nexus-math.ts',{'./sphere-stage':stage}),orbit=load('components/originals/orbit-math.ts',{'./sphere-stage':stage});
const state={time:0,tiltX:0,tiltY:0,pointerX:0,pointerY:0,presence:0,burst:0,intensity:1,small:false,light:false,width:640,height:480,radius:168};

test('Nexus has deterministic bounded graph layers, true depth and a reversible compression cycle',()=>{
 const geometry=nexus.createNexus(72),again=nexus.createNexus(72);assert.deepEqual(geometry,again);assert.equal(geometry.nodes.length,72+36+88);
 const seen=new Set();for(const[a,b]of geometry.edges){assert.ok(a>=0&&b<108&&a!==b);const key=[a,b].sort((x,y)=>x-y).join(':');assert.ok(!seen.has(key),'each link is painted once');seen.add(key);}
 assert.ok(geometry.edges.length<72*4,'graph is bounded, not an all-pairs frame operation');
 const initial=nexus.projectNexus(geometry,state).slice();assert.ok(initial.some((v,i)=>i%5===2&&v<-.8));assert.ok(initial.some((v,i)=>i%5===2&&v>.8));
 assert.equal(nexus.nexusCompression(5),0);assert.equal(nexus.nexusCompression(16),1);assert.equal(nexus.nexusCompression(24),0);assert.ok(nexus.nexusCompression(12)>0&&nexus.nexusCompression(12)<1);
 const turned=nexus.projectNexus(geometry,{...state,time:5,tiltX:.4,tiltY:.6,presence:1,pointerX:.4}).slice();assert.notDeepEqual(initial,turned);
 for(const time of [0,10,14,17,23,24]){const data=nexus.projectNexus(geometry,{...state,time,burst:1});for(let i=0;i<data.length;i+=5){assert.ok(Number.isFinite(data[i]));assert.ok(Math.hypot(data[i],data[i+1])<1.2);assert.ok(data[i+3]>0&&data[i+4]>0&&data[i+4]<=1);}}
 const a=nexus.projectNexus(geometry,{...state,time:23.999}).slice(),b=nexus.projectNexus(geometry,{...state,time:24.001});assert.ok(Math.max(...a.map((v,i)=>Math.abs(v-b[i])))<.002,'cycle boundary has no jump');
});

test('Orbit maintains open, separate contours with independent continuous motion and bounded 3D relief',()=>{
 const geometry=orbit.createOrbit();assert.equal(geometry.rings.length,8);assert.equal(geometry.paths.length,16);assert.ok(geometry.rings.some(r=>r.velocity<0)&&geometry.rings.some(r=>r.velocity>0));
 const data=orbit.projectOrbit(geometry,state,0).slice();for(const path of geometry.paths){
  const ring=geometry.rings[path.ring];for(let j=0;j<path.length;j++){const n=(path.offset+j)*4,z=data[n+2],p=3.8/(3.8-z*.2);assert.ok(Math.abs(Math.hypot(data[n]/p,data[n+1]/p,z)-ring.radius)<1e-6);}
  const first=path.offset*4,last=(path.offset+path.length-1)*4;assert.ok(Math.hypot(data[first]-data[last],data[first+1]-data[last+1])>.1,'arcs retain their gaps');
 }
 const next=orbit.projectOrbit(geometry,{...state,time:.016},0).slice();assert.notDeepEqual(data,next);assert.ok(Math.max(...next.map((v,i)=>Math.abs(v-data[i])))<.01,'angular movement is continuous');
 const tilt=orbit.projectOrbit(geometry,{...state,time:5,tiltX:.5,tiltY:.65,burst:1},2);assert.ok(tilt.every(Number.isFinite));assert.ok(tilt.some((v,i)=>i%4===2&&Math.abs(v)>.4),'tilting has actual depth');
 assert.equal(orbit.createOrbit(100).rings.length,12);assert.equal(orbit.createOrbit(1).rings.length,4);
});

for(const name of ['nexus','orbit'])test(`${name} handles keyboard, touch, live settings, theme, pause, visibility, reduced motion and StrictMode cleanup`,async()=>{
 const dom=new JSDOM('<div id="mount"></div>',{pretendToBeVisual:true,url:'http://localhost'}),frames=new Map(),timers=new Map(),listeners=new Set(),sizes=[],visible=[];let serial=0,now=1000,disconnected=0,width=640,height=480,hidden=false,arcs=0,moves=0,draws=0,stroke='',ink='';
 const context={clearRect(){draws++;arcs=0;moves=0;},setTransform(){},beginPath(){},arc(x,y,r){assert.ok([x,y,r].every(Number.isFinite));assert.ok(r>0);arcs++;},moveTo(x,y){assert.ok([x,y].every(Number.isFinite));moves++;},lineTo(x,y){assert.ok([x,y].every(Number.isFinite));},stroke(){},fill(){},set fillStyle(value){ink=value;},set strokeStyle(value){stroke=value;},set globalAlpha(value){assert.ok(value>=0&&value<=1);},set lineWidth(value){assert.ok(value>0);}};
 dom.window.HTMLCanvasElement.prototype.getContext=()=>context;dom.window.HTMLElement.prototype.getBoundingClientRect=()=>({left:0,top:0,width,height});Object.defineProperty(dom.window.document,'hidden',{get:()=>hidden});dom.window.setTimeout=fn=>{timers.set(++serial,fn);return serial;};
 const media={matches:false,addEventListener:(_,fn)=>listeners.add(fn),removeEventListener:(_,fn)=>listeners.delete(fn)};
 class Size{constructor(fn){this.fn=fn;sizes.push(this);}observe(){this.fn();}disconnect(){disconnected++;}}
 class Visible{constructor(fn){this.fn=fn;visible.push(this);}observe(){this.fn([{isIntersecting:true}]);}disconnect(){disconnected++;}}
 const globals={window:dom.window,document:dom.window.document,HTMLElement:dom.window.HTMLElement,IS_REACT_ACT_ENVIRONMENT:true,performance:{now:()=>now},matchMedia:()=>media,ResizeObserver:Size,IntersectionObserver:Visible,requestAnimationFrame:fn=>{frames.set(++serial,fn);return serial;},cancelAnimationFrame:id=>frames.delete(id),clearTimeout:id=>timers.delete(id)};
 const old=new Map(Object.keys(globals).map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)]));Object.entries(globals).forEach(([key,value])=>Object.defineProperty(globalThis,key,{value,writable:true,configurable:true}));
 const root=require('react-dom/client').createRoot(document.getElementById('mount'));let mounted=true;
 const advance=(n=120)=>{for(let i=0;i<n&&frames.size;i++){now+=1000/60;const batch=[...frames.values()];frames.clear();batch.forEach(fn=>fn(now));}};
 try{
  const Sculpture=load(`components/originals/${name}.tsx`,{'./sphere-stage':stage,[`./${name}-math`]:name==='nexus'?nexus:orbit}).default;
  const render=props=>React.act(()=>root.render(React.createElement(React.StrictMode,null,React.createElement(Sculpture,props))));
  await render({});const host=document.querySelector('.sphere-stage'),surface=host.querySelector('canvas');advance(30);assert.ok(draws>0);assert.equal(host.dataset.ready,'true');assert.equal(host.dataset.quality,'full');const count=name==='nexus'?arcs:moves;
  host.dispatchEvent(new dom.window.MouseEvent('pointermove',{clientX:640,clientY:80}));advance(1);assert.ok(Number(host.dataset.sceneTilt.split(',')[1])<.2,'input does not jump to its target');advance(120);assert.ok(Number(host.dataset.sceneTilt.split(',')[1])>.6);
  host.dispatchEvent(new dom.window.KeyboardEvent('keydown',{key:' '}));advance(1);assert.ok(Number(host.dataset.sceneBurst)>.05&&Number(host.dataset.sceneBurst)<.3,'pulse ramps rather than appearing instantly');advance(240);assert.ok(Number(host.dataset.sceneBurst)<.03);
  host.dispatchEvent(new dom.window.KeyboardEvent('keydown',{key:'Home'}));advance();assert.equal(host.dataset.sceneTilt,'0.000,0.000');
  host.dispatchEvent(new dom.window.KeyboardEvent('keydown',{key:'ArrowLeft'}));advance();assert.ok(Number(host.dataset.sceneTilt.split(',')[1])<-.15);
  await render(name==='nexus'?{nodes:100}:{rings:12});advance(2);assert.ok((name==='nexus'?arcs:moves)>count);assert.equal(sizes.length,2,'live settings do not remount the animation');
  await render({paused:true});advance();const frozen=host.dataset.sceneTime;assert.equal(frames.size,0);host.dispatchEvent(new dom.window.KeyboardEvent('keydown',{key:' '}));assert.equal(frames.size,0);
  document.documentElement.dataset.theme='light';document.dispatchEvent(new dom.window.Event('motiqo-theme-change'));assert.equal(stroke,'#504b46');if(name==='nexus')assert.equal(ink,'#403b36');assert.equal(host.dataset.sceneTime,frozen);
  await render({});advance(10);assert.notEqual(host.dataset.sceneTime,frozen);width=390;sizes.at(-1).fn();advance(4);assert.equal(host.dataset.quality,'compact');assert.equal(surface.width,390);if(name==='nexus')assert.equal(arcs,48+24+88);else assert.ok(moves===16);
  visible.at(-1).fn([{isIntersecting:false}]);assert.equal(frames.size,0);visible.at(-1).fn([{isIntersecting:true}]);assert.ok(frames.size>0);hidden=true;document.dispatchEvent(new dom.window.Event('visibilitychange'));assert.equal(frames.size,0);hidden=false;document.dispatchEvent(new dom.window.Event('visibilitychange'));assert.ok(frames.size>0);
  const touch=new dom.window.MouseEvent('pointerdown',{clientX:390,clientY:20});Object.defineProperty(touch,'pointerType',{value:'touch'});host.dispatchEvent(touch);advance(40);const up=new dom.window.MouseEvent('pointerup');Object.defineProperty(up,'pointerType',{value:'touch'});host.dispatchEvent(up);assert.equal(timers.size,1);for(const fn of timers.values())fn();timers.clear();advance(120);assert.equal(host.dataset.sceneTilt,'0.000,0.000');
  media.matches=true;listeners.forEach(fn=>fn());advance();assert.equal(frames.size,0);assert.equal(host.dataset.sceneTime,'0.000');assert.equal(host.dataset.sceneTilt,'0.000,0.000');assert.equal(host.dataset.sceneBurst,'0.000');
  media.matches=false;listeners.forEach(fn=>fn());advance(2);host.dispatchEvent(up);assert.equal(timers.size,1);
  await React.act(()=>root.unmount());mounted=false;assert.equal(frames.size,0);assert.equal(listeners.size,0);assert.equal(timers.size,0);assert.equal(disconnected,4);assert.equal(surface.width,0);
 }finally{if(mounted)await React.act(()=>root.unmount());dom.window.close();for(const[key,value]of old){if(value)Object.defineProperty(globalThis,key,value);else delete globalThis[key];}}
});
