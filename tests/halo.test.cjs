const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),ts=require('typescript'),React=require('react');
const {JSDOM}=require('jsdom');
function load(file,mocks={}){const filename=path.resolve(__dirname,'..',file),entry=new Module(filename,module);entry.filename=filename;entry.paths=Module._nodeModulePaths(path.dirname(filename));const normal=entry.require.bind(entry);entry.require=id=>mocks[id]??normal(id);entry._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022},fileName:filename}).outputText,filename);return entry.exports;}
const math=load('components/originals/halo-math.ts');
test('Halo morphs on the spherical shell, returns to its cloud and projects two depth hemispheres',()=>{
 const points=math.createHaloPoints(480);assert.deepEqual(points,math.createHaloPoints(480));assert.equal(math.haloOrder(4),0);assert.equal(math.haloOrder(14),1);assert.equal(math.haloOrder(23),0);assert.equal(math.haloOrder(24),0);
 const output=new Float32Array(points.length*5),state={time:0,order:0,tiltX:0,tiltY:0,pointerX:0,pointerY:0,presence:0,intensity:1};
 for(const order of [0,.25,.5,.75,1]){math.projectHalo(points,{...state,order},output);let front=false,back=false;
  for(let i=0;i<points.length;i++){const offset=i*5,z=output[offset+2],perspective=3.8/(3.8-z*.25);const length=Math.hypot(output[offset]/perspective,output[offset+1]/perspective,z);assert.ok(Math.abs(length-1)<1e-6,'morph never collapses through the centre');assert.ok(Number.isFinite(output[offset]));front||=z>0;back||=z<0;}assert.ok(front&&back);
 }
 const before=output.slice();math.projectHalo(points,{...state,time:5},output);assert.notDeepEqual(output,before);assert.equal(new Set(points.map(p=>p.orderedLatitude)).size,20,'ordered form has consistent latitude bands');
});
test('Halo renders, interpolates input, holds the globe, adapts quality and suspends or disposes work',async()=>{
 const dom=new JSDOM('<div id="mount"></div>',{pretendToBeVisual:true,url:'http://localhost'}),frames=new Map(),listeners=new Set(),sizes=[],visible=[];let serial=0,now=1000,disconnected=0,draws=0,ink='',width=640,height=480;
 const context={clearRect(){draws++;},setTransform(){},beginPath(){},arc(x,y,r){assert.ok([x,y,r].every(Number.isFinite));},fill(){},set fillStyle(value){ink=value;},set globalAlpha(value){assert.ok(value>=0&&value<=1);}};
 dom.window.HTMLCanvasElement.prototype.getContext=()=>context;dom.window.HTMLElement.prototype.getBoundingClientRect=()=>({left:0,top:0,width,height});
 const media={matches:false,addEventListener:(_,fn)=>listeners.add(fn),removeEventListener:(_,fn)=>listeners.delete(fn)};
 class Size{constructor(fn){this.fn=fn;sizes.push(this);}observe(){this.fn();}disconnect(){disconnected++;}}
 class Visible{constructor(fn){this.fn=fn;visible.push(this);}observe(){this.fn([{isIntersecting:true}]);}disconnect(){disconnected++;}}
 const globals={window:dom.window,document:dom.window.document,HTMLElement:dom.window.HTMLElement,IS_REACT_ACT_ENVIRONMENT:true,performance:{now:()=>now},matchMedia:()=>media,ResizeObserver:Size,IntersectionObserver:Visible,requestAnimationFrame:fn=>{frames.set(++serial,fn);return serial;},cancelAnimationFrame:id=>frames.delete(id)};
 const old=new Map(Object.keys(globals).map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)]));Object.entries(globals).forEach(([key,value])=>Object.defineProperty(globalThis,key,{value,writable:true,configurable:true}));
 const root=require('react-dom/client').createRoot(document.getElementById('mount'));let mounted=true;
 const advance=(n=120)=>{for(let i=0;i<n&&frames.size;i++){now+=1000/60;const batch=[...frames.values()];frames.clear();batch.forEach(fn=>fn(now));}};
 try{
  const Halo=load('components/originals/halo.tsx',{'./halo-math':math}).default;
  await React.act(()=>root.render(React.createElement(React.StrictMode,null,React.createElement(Halo))));const host=document.querySelector('.halo');advance(30);assert.equal(host.dataset.pointCount,'480');assert.ok(draws>0);const start=host.dataset.haloTime;
  host.dispatchEvent(new dom.window.MouseEvent('pointermove',{clientX:640,clientY:100}));advance();assert.ok(Number(host.dataset.haloTilt.split(',')[1])>.6);assert.notEqual(host.dataset.haloTime,start);
  host.dispatchEvent(new dom.window.KeyboardEvent('keydown',{key:' '}));advance();assert.ok(Number(host.dataset.haloOrder)>.99);
  await React.act(()=>root.render(React.createElement(React.StrictMode,null,React.createElement(Halo,{paused:true}))));advance();const frozen=host.dataset.haloTime;assert.equal(frames.size,0);advance();assert.equal(host.dataset.haloTime,frozen);
  document.documentElement.dataset.theme='light';document.dispatchEvent(new dom.window.Event('motiqo-theme-change'));assert.equal(ink,'#4a4540','paused canvas updates its theme without remounting');
  await React.act(()=>root.render(React.createElement(React.StrictMode,null,React.createElement(Halo,{count:600}))));advance(2);assert.equal(host.dataset.pointCount,'600');
  width=390;height=480;sizes.at(-1).fn();advance(2);assert.equal(host.dataset.pointCount,'280');visible.at(-1).fn([{isIntersecting:false}]);assert.equal(frames.size,0);visible.at(-1).fn([{isIntersecting:true}]);assert.ok(frames.size>0);
  media.matches=true;listeners.forEach(fn=>fn());advance();assert.equal(frames.size,0);assert.equal(host.dataset.haloTime,'0.000');assert.equal(host.dataset.haloTilt,'0.000,0.000');
  await React.act(()=>root.unmount());mounted=false;assert.equal(frames.size,0);assert.equal(listeners.size,0);assert.equal(disconnected,4);
 }finally{if(mounted)await React.act(()=>root.unmount());dom.window.close();for(const[key,value]of old){if(value)Object.defineProperty(globalThis,key,value);else delete globalThis[key];}}
});
