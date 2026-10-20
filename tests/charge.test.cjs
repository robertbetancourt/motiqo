const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),ts=require('typescript-compiler-api'),{JSDOM}=require('jsdom');
function load(file,mocks={}){const filename=path.resolve(__dirname,'..',file),entry=new Module(filename,module);entry.filename=filename;entry.paths=Module._nodeModulePaths(path.dirname(filename));const normal=entry.require.bind(entry);entry.require=id=>mocks[id]??normal(id);entry._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText,filename);return entry.exports;}
const math=load('components/originals/charge-math.ts');

test('Charge particles accelerate from the inlet and divide continuously into both perimeter and interior streams',()=>{
 const particles=math.createChargeParticles(240);assert.deepEqual(particles,math.createChargeParticles(240));assert.equal(math.createChargeParticles(999).length,300);assert.equal(math.createChargeParticles(0).length,150);
 assert.ok(particles.some(p=>p.interior)&&particles.some(p=>!p.interior&&p.side===-1)&&particles.some(p=>!p.interior&&p.side===1));
 for(const p of particles)for(let t=0;t<18;t+=.17){const v=math.chargeParticle(p,t,2);assert.ok(Number.isFinite(v.x+v.y+v.fade));assert.ok(Math.abs(v.x)<.34&&v.y>=-1.26&&v.y<=.321);assert.ok(v.fade>=0&&v.fade<=1);assert.ok(p.size>=.5&&p.size<=2.5);}
 for(const interior of [false,true])for(const side of [-1,1]){const p={...particles[0],phase:0,pace:1,interior,side},a=math.chargeParticle(p,.57-1e-7,2),b=math.chargeParticle(p,.57+1e-7,2);assert.ok(Math.hypot(a.x-b.x,a.y-b.y)<.00001,'junction has no teleport');const end=math.chargeParticle(p,1-1e-8,2);assert.ok(end.fade<.00001,'recycling occurs after fade-out');}
 const p={...particles[0],phase:0,pace:1},early=math.chargeParticle(p,.1,2).y-math.chargeParticle(p,.09,2).y,late=math.chargeParticle(p,.5,2).y-math.chargeParticle(p,.49,2).y;assert.ok(late>early*4,'inlet accelerates');
});

test('Charge preserves one renderer and bounded particle buffers, handles live props, pause, reduced motion and context restore, and disposes everything',()=>{
 const dom=new JSDOM('<div id="host"><div id="panel"><canvas></canvas></div></div>',{pretendToBeVisual:true}),THREE=require('three'),frames=new Map(),sizes=[],visibility=[],listeners=new Set(),owned=new Set(),disposed=new Set(),values=[];let serial=0,now=1000,draws=0,hidden=false;
 const track=Base=>class extends Base{constructor(...args){super(...args);owned.add(this);this.addEventListener('dispose',()=>disposed.add(this));}};
 class Renderer{constructor({canvas}){this.canvas=canvas;this.ratio=1;this.disposed=false;Renderer.instance=this;}setClearColor(){}setPixelRatio(v){this.ratio=v;}getPixelRatio(){return this.ratio;}setSize(w,h){this.canvas.width=Math.round(w*this.ratio);this.canvas.height=Math.round(h*this.ratio);}render(scene){draws++;Renderer.scene=scene;for(const v of scene.children)if(v.isPoints)assert.ok(v.geometry.attributes.position.array.every(Number.isFinite));}dispose(){this.disposed=true;}}
 const mock={...THREE,WebGLRenderer:Renderer,BufferGeometry:track(THREE.BufferGeometry),PlaneGeometry:track(THREE.PlaneGeometry),ShaderMaterial:track(THREE.ShaderMaterial)};
 const media={matches:false,addEventListener:(_,fn)=>listeners.add(fn),removeEventListener:(_,fn)=>listeners.delete(fn)};
 class Size{constructor(fn){this.fn=fn;sizes.push(this);}observe(){this.fn();}disconnect(){this.disconnected=true;}}class Visible{constructor(fn){this.fn=fn;visibility.push(this);}observe(){this.fn([{isIntersecting:true}]);}disconnect(){this.disconnected=true;}}
 Object.defineProperty(dom.window.document,'hidden',{get:()=>hidden});dom.window.HTMLElement.prototype.getBoundingClientRect=()=>({width:640,height:480});
 const globals={window:dom.window,document:dom.window.document,matchMedia:()=>media,performance:{now:()=>now},ResizeObserver:Size,IntersectionObserver:Visible,requestAnimationFrame:fn=>{frames.set(++serial,fn);return serial;},cancelAnimationFrame:id=>frames.delete(id)},old=new Map(Object.keys(globals).map(k=>[k,Object.getOwnPropertyDescriptor(globalThis,k)]));Object.entries(globals).forEach(([k,v])=>Object.defineProperty(globalThis,k,{value:v,writable:true,configurable:true}));
 let options={percentage:46,flowSpeed:1,particleCount:240,primaryColor:'#00e5ff',secondaryColor:'#ffb52e',animateCount:true,paused:false},engine;
 const advance=(count,hz=60)=>{for(let i=0;i<count;i++){now+=1000/hz;const queue=[...frames.values()];frames.clear();queue.forEach(fn=>fn(now));}};
 try{
  const {createChargeScene}=load('components/originals/charge-scene.ts',{'three':mock,'./charge-math':math,'./charge-shaders':load('components/originals/charge-shaders.ts')});
  const host=document.getElementById('host'),panel=document.getElementById('panel'),canvas=panel.querySelector('canvas');engine=createChargeScene(canvas,false,()=>options,v=>values.push(v));
  const renderer=Renderer.instance,points=Renderer.scene.children.find(v=>v.isPoints),buffer=points.geometry.attributes.position.array;assert.equal(host.dataset.ready,'true');assert.equal(host.dataset.particles,'240');assert.equal(values[0],0);
  let baseline=draws;advance(120);assert.equal(draws-baseline,120);assert.equal(points.geometry.attributes.position.array,buffer);assert.ok(values.at(-1)>=45&&values.at(-1)<=46);
  baseline=draws;advance(120,120);assert.equal(draws-baseline,60,'120Hz display retains a 60Hz rendering target');
  options={...options,percentage:83,particleCount:300,primaryColor:'#aaccff'};engine.sync();advance(120);assert.equal(Renderer.instance,renderer);assert.equal(host.dataset.particles,'300');assert.equal(points.geometry.attributes.position.count,300);assert.equal(values.at(-1),83);
  options={...options,paused:true};engine.sync();assert.equal(frames.size,0);const frozen=host.dataset.flowTime;advance(20);assert.equal(host.dataset.flowTime,frozen);options={...options,percentage:88};engine.sync();assert.equal(values.at(-1),88,'paused data stays accurate when its target changes');
  options={...options,paused:false};engine.sync();advance(2);panel.dispatchEvent(new dom.window.KeyboardEvent('keydown',{key:' ',bubbles:true}));assert.equal(frames.size,0);panel.dispatchEvent(new dom.window.KeyboardEvent('keydown',{key:' ',bubbles:true}));assert.ok(frames.size>0);
  visibility[0].fn([{isIntersecting:false}]);assert.equal(frames.size,0);visibility[0].fn([{isIntersecting:true}]);assert.ok(frames.size>0);hidden=true;document.dispatchEvent(new dom.window.Event('visibilitychange'));assert.equal(frames.size,0);hidden=false;document.dispatchEvent(new dom.window.Event('visibilitychange'));
  const lost=new dom.window.Event('webglcontextlost',{cancelable:true});canvas.dispatchEvent(lost);assert.equal(frames.size,0);assert.equal(host.dataset.ready,undefined);assert.ok(lost.defaultPrevented);canvas.dispatchEvent(new dom.window.Event('webglcontextrestored'));assert.equal(host.dataset.ready,'true');
  media.matches=true;listeners.forEach(fn=>fn());assert.equal(frames.size,0);assert.equal(values.at(-1),88);assert.equal(host.dataset.flowTime,'2.700');options={...options,percentage:100};engine.sync();assert.equal(values.at(-1),100);
  engine.dispose();engine.dispose();assert.ok(renderer.disposed);assert.equal(disposed.size,owned.size);assert.equal(frames.size,0);assert.equal(listeners.size,0);assert.ok(sizes.every(o=>o.disconnected)&&visibility.every(o=>o.disconnected));assert.equal(canvas.width,0);assert.equal(host.dataset.ready,undefined);
 }finally{engine?.dispose();dom.window.close();for(const[k,v]of old){if(v)Object.defineProperty(globalThis,k,v);else delete globalThis[k];}}
});

test('Charge exposes the target as an accessible progressbar and keeps a complete portable fallback',()=>{
 const React=require('react'),Charge=load('components/originals/charge.tsx',{'./charge-math':math,'./charge-scene':{createChargeScene(){throw Error('No GPU');}}}).default;
 const html=require('react-dom/server').renderToStaticMarkup(React.createElement(Charge,{percentage:138,statusText:'Fully Charged'})),dom=new JSDOM(html);
 try{const bar=dom.window.document.querySelector('[role=progressbar]');assert.equal(bar.getAttribute('aria-valuenow'),'100');assert.equal(bar.getAttribute('aria-valuetext'),'100 percent, Fully Charged');assert.ok(bar.querySelector('svg path'));assert.equal(bar.querySelector('.charge-value').textContent,'100%');}finally{dom.window.close();}
});

test('Charge does not flash the target over its animated number on prop changes and keeps fallback data current',async()=>{
 const React=require('react'),dom=new JSDOM('<main></main>'),globals={window:dom.window,document:dom.window.document,IS_REACT_ACT_ENVIRONMENT:true},old=new Map(Object.keys(globals).map(k=>[k,Object.getOwnPropertyDescriptor(globalThis,k)]));Object.entries(globals).forEach(([k,v])=>Object.defineProperty(globalThis,k,{value:v,writable:true,configurable:true}));
 let created=0,disposed=0,available=true;
 const Charge=load('components/originals/charge.tsx',{'./charge-math':math,'./charge-scene':{createChargeScene(_,__,___,onValue){if(!available)throw Error('No GPU');created++;onValue(12);return{sync(){},dispose(){disposed++;}};}}}).default,root=require('react-dom/client').createRoot(document.querySelector('main'));
 try{
  const render=p=>React.act(()=>root.render(React.createElement(React.StrictMode,null,React.createElement(Charge,p))));
  await render({percentage:46});assert.equal(created,2);assert.equal(disposed,1);assert.equal(document.querySelector('.charge-value span').textContent,'12');
  await render({percentage:80});assert.equal(document.querySelector('.charge-panel').getAttribute('aria-valuenow'),'80');assert.equal(document.querySelector('.charge-value span').textContent,'12','React must not overwrite an in-progress frame with the final target');assert.equal(created,2);
  available=false;await render({compact:true,percentage:77});assert.equal(disposed,2);assert.equal(document.querySelector('.charge').dataset.failed,'true');assert.equal(document.querySelector('.charge-value span').textContent,'77');await render({compact:true,percentage:94});assert.equal(document.querySelector('.charge-value span').textContent,'94');
 }finally{await React.act(()=>root.unmount());dom.window.close();for(const[k,v]of old){if(v)Object.defineProperty(globalThis,k,v);else delete globalThis[k];}}
});
