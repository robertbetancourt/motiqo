const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),ts=require('typescript-compiler-api'),React=require('react'),{JSDOM}=require('jsdom');
function load(relative,mocks={},cache=new Map()){
 const filename=path.resolve(__dirname,'..',relative);if(cache.has(filename))return cache.get(filename).exports;
 const m=new Module(filename,module);cache.set(filename,m);m.filename=filename;m.paths=Module._nodeModulePaths(path.dirname(filename));const normal=m.require.bind(m);
 m.require=id=>{if(Object.hasOwn(mocks,id))return mocks[id];if(id.startsWith('.'))for(const ext of ['','.ts','.tsx']){const p=path.resolve(path.dirname(filename),id+ext);if(fs.existsSync(p)&&fs.statSync(p).isFile()&&/\.tsx?$/.test(p))return load(path.relative(path.resolve(__dirname,'..'),p),mocks,cache);}return normal(id);};
 m._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,filename);return m.exports;
}
const math=load('components/originals/kinetic-math.ts');
test('Turbine moves continuously through cool, green, yellow, orange and danger at increasing speeds',async()=>{
 const {mount}=require('./support/component-harness.cjs');let draw;
 const gradient={addColorStop(){}},g=new Proxy({createLinearGradient:()=>gradient,createRadialGradient:()=>gradient},{get:(o,k)=>o[k]??(()=>{})});
 const C=load('components/originals/iris-turbine.tsx',{'./kinetic-canvas':{useKineticCanvas(render){draw=render;return{host:React.useRef(null),canvas:React.useRef(null),invalidate(){}};}}}).default;
 const e=await mount(C,{speed:0,paused:true});try{
  for(const [speed,color] of [[0,'rgb(56,189,248)'],[52.5,'rgb(52,211,153)'],[105,'rgb(250,204,21)'],[157.5,'rgb(251,146,60)'],[210,'rgb(239,68,68)']]){
   await e.update({speed,paused:true});draw({g,w:500,h:500,dt:0,still:true,time:0});
   assert.equal(document.querySelector('.mq-turbine').style.getPropertyValue('--turbine-color'),color);
  }
 }finally{await e.close();}
});
test('Lotus progresses through rays, interlaced petals and a rounded halo with a continuous round trip',()=>{
 const rays=math.lotusPose(0),flower=math.lotusPose(56),halo=math.lotusPose(100);
 assert.ok(rays.spread<flower.spread/5);assert.equal(flower.roundness,0);assert.equal(halo.roundness,1);assert.ok(halo.radius<flower.radius);
 assert.equal(math.lotusCycle(0,20),0);assert.equal(math.lotusCycle(10,20),100);assert.equal(math.lotusCycle(20,20),0);
 assert.ok(Math.abs(math.lotusCycle(20.001,20)-math.lotusCycle(19.999,20))<.0001);
 for(let p=-20;p<130;p++)for(const n of Object.values(math.lotusPose(p)))assert.ok(Number.isFinite(n));
});
test('Turbine follows the reference acceleration, respects the speed limit and shifts at the specified boundaries',()=>{
 assert.deepEqual([0,25,26,50,51,85,86,125,126,160,161,240].map(math.turbineGear),[1,1,2,2,3,3,4,4,5,5,6,6]);
 for(const [t,v]of [[0,9],[5,46],[13,169],[16,188],[20,136],[24,9]])assert.equal(math.turbineDemo(t),v);
 assert.equal(math.turbineDemo(16,130),130);
 assert.ok(Math.abs(math.turbineDemo(24.001)-math.turbineDemo(23.999))<.01);
});
test('Particle rows preserve dense X sampling, bounded count and finite geometry; organic loops close exactly',()=>{
 const a=math.terrainSeeds(70,220);assert.equal(a.length,15400*3);assert.ok(a.every(Number.isFinite));
 assert.ok(Math.abs(a[3]-a[0])<Math.abs(a[220*3+2]-a[2]));
 assert.equal(math.terrainSeeds(999,999).length,120*320*3);
 for(let layer=0;layer<8;layer++){assert.ok(Math.abs(math.orbitRadius(0,2,layer)-math.orbitRadius(Math.PI*2,2,layer))<1e-10);}
});
test('Tag matching is exact, case insensitive and composes with saved/category/search filters',()=>{
 const {filterTaggedElements}=load('lib/tag-filter.ts');const items=[{id:'a',title:'Blue',category:'Motion',tags:['WebGL','Orb']},{id:'b',title:'Waves',category:'Motion',tags:['webgl','Particles']},{id:'c',title:'Other',category:'Objects',tags:['WebGL2']}];
 assert.deepEqual(filterTaggedElements(items,{tag:' WEBGL '}).map(i=>i.id),['a','b']);
 assert.deepEqual(filterTaggedElements(items,{tag:'WebGL',query:'particles'}).map(i=>i.id),['b']);
 assert.deepEqual(filterTaggedElements(items,{tag:'WebGL',savedOnly:true,saved:['a']}).map(i=>i.id),['a']);
 assert.equal(filterTaggedElements(items,{tag:'WebGL',category:'Objects'}).length,0);
 assert.equal(filterTaggedElements(items,{tag:''}).length,3);
});
test('Three.js studies update existing geometry and uniforms, disable interaction when paused, and release every GPU resource',()=>{
 const THREE=require('three'),dom=new JSDOM('<div><canvas></canvas></div>'),canvas=dom.window.document.querySelector('canvas');let frame,resize,renderer,clockDisposed=0;
 class Renderer{constructor(){renderer=this;}setClearColor(){}setPixelRatio(){}setSize(){}render(scene,camera){this.scene=scene;this.camera=camera;}dispose(){this.disposed=true;}}
 const mocks={three:{...THREE,WebGLRenderer:Renderer},'./effect-runtime':{effectRuntime:(_h,_c,render,_paused,resized)=>{frame=render;resize=resized;return{invalidate(){},dispose(){clockDisposed++;}};}}};
 const saved=Object.getOwnPropertyDescriptor(globalThis,'matchMedia');Object.defineProperty(globalThis,'matchMedia',{value:()=>({matches:false}),configurable:true});
 try{
  const bokeh=load('components/originals/bokeh-scene.ts',mocks),o={lineCount:70,pointsPerLine:220,waveSpeed:1,waveHeight:1.5,primaryColor:'#2563eb',secondaryColor:'#7c3aed',accentColor:'#fef9c3',showStars:true,interactive:true,paused:false};
  const scene=bokeh.createBokehScene(canvas,false,()=>o);resize(600,400,2);frame(2,.016);assert.equal(canvas.parentElement.dataset.particles,'15400');const points=renderer.scene.children.find(x=>x.isPoints),geometry=points.geometry;const records=[];renderer.scene.traverse(x=>{if(x.geometry)records.push(x.geometry);if(x.material)records.push(x.material);});let released=0;records.forEach(r=>r.addEventListener('dispose',()=>released++));
  o.lineCount=50;frame(3,.016);assert.equal(points.geometry,geometry);assert.equal(geometry.attributes.position.count,11000);assert.ok(released>0,'old geometry buffers released before replacing attributes');
  o.paused=true;const time=canvas.parentElement.dataset.waveTime;frame(4,0);assert.equal(canvas.parentElement.dataset.waveTime,time);scene.dispose();scene.dispose();assert.ok(renderer.disposed);assert.equal(clockDisposed,1);assert.ok(released>=records.length);
  const opaline=load('components/originals/opaline-scene.ts',mocks),p={layerCount:4,ringDensity:38,morphSpeed:1,morphIntensity:1,colorPalette:opaline.opalineColors,interactive:true,listening:false,paused:false};const orb=opaline.createOpalineScene(canvas,false,()=>p);resize(500,500,1);frame(0,.016);assert.equal(canvas.parentElement.dataset.membranes,'4');const group=renderer.scene.children.find(x=>x.isGroup);const shared=group.children[0].geometry;
  p.layerCount=2;p.listening=true;frame(1,.016);assert.equal(group.children.filter(x=>x.visible).length,3);assert.equal(group.children[1].geometry,shared);assert.ok(group.children[0].material.uniforms.uActivity.value>0);orb.dispose();assert.equal(clockDisposed,2);assert.ok(renderer.disposed);
 }finally{dom.window.close();saved?Object.defineProperty(globalThis,'matchMedia',saved):delete globalThis.matchMedia;}
});
test('Orbit agent reacts to keyboard and clicks without changing the selected mood',async()=>{
 const dom=new JSDOM('<div id="mount"></div>'),saved=new Map();let tick,ovalCount=0,mouthCurveCount=0,backgrounds=0,arcs=0;const translations=[],scales=[];const gradient={addColorStop(){}};const g=new Proxy({createLinearGradient:()=>gradient,createRadialGradient:()=>gradient,ellipse(){ovalCount++;},quadraticCurveTo(){mouthCurveCount++;},arc(){arcs++;},translate(x,y){translations.push([x,y]);},scale(x,y){scales.push([x,y]);},fillRect(x,y,w,h){if(x===0&&y===0&&w===500&&h===500)backgrounds++;}},{get:(o,key)=>key in o?o[key]:()=>{}});
 for(const[k,v]of Object.entries({window:dom.window,document:dom.window.document,IS_REACT_ACT_ENVIRONMENT:true})){saved.set(k,Object.getOwnPropertyDescriptor(globalThis,k));Object.defineProperty(globalThis,k,{value:v,configurable:true,writable:true});}
 const Component=load('components/originals/orbit-agent.tsx',{'./kinetic-canvas':{useKineticCanvas(render){tick=render;return{host:React.useRef(null),canvas:React.useRef(null),invalidate(){}};}}}).default;
 const root=require('react-dom/client').createRoot(document.getElementById('mount')),seen=[];
 try{await React.act(()=>root.render(React.createElement(Component,{agentMood:'listening',onAgentClick:m=>seen.push(m)})));const button=document.querySelector('[role=button]');
  for(const mood of ['listening','listening','listening','listening']){await React.act(()=>button.dispatchEvent(new dom.window.KeyboardEvent('keydown',{key:'Enter',bubbles:true})));assert.match(button.getAttribute('aria-label'),new RegExp(mood));tick({g,w:500,h:500,dt:.016,time:2,still:false});}
  assert.deepEqual(seen,['listening','listening','listening','listening']);assert.equal(ovalCount,16,'two oval eyes and two cheeks per greeting frame');assert.equal(mouthCurveCount,0,'no legacy eye arches or mouth');await React.act(()=>root.render(React.createElement(Component,{paused:true,onAgentClick:m=>seen.push(m)})));await React.act(()=>button.click());assert.equal(seen.length,4);assert.equal(backgrounds,4,'standalone rendering retains its background by default');await React.act(()=>root.render(React.createElement(Component,{transparent:true})));tick({g,w:500,h:500,dt:.016,time:2,still:false});assert.equal(button.style.background,'transparent');assert.equal(backgrounds,4,'embedded Orbit leaves the canvas background transparent');const beforeArcs=arcs;await React.act(()=>root.render(React.createElement(Component,{transparent:true,showStars:false,gazeTarget:{current:{x:100,y:-100}}})));tick({g,w:500,h:500,dt:.016,time:2,still:false});assert.equal(arcs-beforeArcs,5,'only orbital dots remain when the rectangular star field is disabled');const gazeShift=translations.at(-1);assert.ok(gazeShift[0]>0&&gazeShift[0]<6);assert.ok(gazeShift[1]<0&&gazeShift[1]>-6,'external gaze is bounded and moves the pupils');const impulse={current:0};await React.act(()=>root.render(React.createElement(Component,{transparent:true,impulseTarget:impulse})));tick({g,w:500,h:500,dt:.016,time:2,still:false});const beforeSquash=scales.at(-1);impulse.current++;tick({g,w:500,h:500,dt:.016,time:2,still:false});assert.notDeepEqual(scales.at(-1),beforeSquash,'external greetings inject a real squash impulse');assert.ok(scales.at(-1).every(Number.isFinite));
 }finally{await React.act(()=>root.unmount());dom.window.close();for(const[k,v]of saved)v?Object.defineProperty(globalThis,k,v):delete globalThis[k];}
});
test('Manual turbine accelerates from its current speed, coasts on release, and freezes without jumping when paused',async()=>{
 const dom=new JSDOM('<div id="mount"></div>'),saved=new Map();let tick;const gradient={addColorStop(){}};const g=new Proxy({createLinearGradient:()=>gradient,createRadialGradient:()=>gradient},{get:(o,key)=>key in o?o[key]:()=>{}});
 for(const[k,v]of Object.entries({window:dom.window,document:dom.window.document,IS_REACT_ACT_ENVIRONMENT:true,matchMedia:()=>({matches:false})})){saved.set(k,Object.getOwnPropertyDescriptor(globalThis,k));Object.defineProperty(globalThis,k,{value:v,configurable:true,writable:true});}
 const Component=load('components/originals/iris-turbine.tsx',{'./kinetic-canvas':{useKineticCanvas(render){tick=render;return{host:React.useRef(null),canvas:React.useRef(null),invalidate(){}};}}}).default;
 const root=require('react-dom/client').createRoot(document.getElementById('mount'));
 const step=(count,still=false)=>{for(let i=0;i<count;i++)tick({g,w:500,h:500,dt:still?0:.016,still,time:i*.016});};
 try{await React.act(()=>root.render(React.createElement(Component,{autoDemo:false})));const host=document.querySelector('.mq-turbine');step(1);
  await React.act(()=>host.dispatchEvent(new dom.window.KeyboardEvent('keydown',{key:' ',bubbles:true})));step(240);const fast=Number(host.dataset.speed);assert.ok(fast>150);
  await React.act(()=>host.dispatchEvent(new dom.window.KeyboardEvent('keyup',{key:' ',bubbles:true})));step(200);assert.ok(Number(host.dataset.speed)<fast);
  const before=host.dataset.speed;await React.act(()=>root.render(React.createElement(Component,{autoDemo:false,paused:true})));step(10,true);assert.equal(host.dataset.speed,before);
 }finally{await React.act(()=>root.unmount());dom.window.close();for(const[k,v]of saved)v?Object.defineProperty(globalThis,k,v):delete globalThis[k];}
});
test('Generative scene props update without remounting; context loss and restoration have single resource owners',async()=>{
 const dom=new JSDOM('<div id="mount"></div>'),saved=new Map();for(const[k,v]of Object.entries({window:dom.window,document:dom.window.document,IS_REACT_ACT_ENVIRONMENT:true})){saved.set(k,Object.getOwnPropertyDescriptor(globalThis,k));Object.defineProperty(globalThis,k,{value:v,configurable:true,writable:true});}
 const {useGenerativeScene}=load('components/originals/generative-scene.ts');let creates=0,disposes=0,current;
 function create(_canvas,_compact,get){creates++;current=get;return{sync(){},dispose(){disposes++;}};}
 function Fixture({value}){const {host,canvas}=useGenerativeScene(create,{value},false);return React.createElement('div',{ref:host},React.createElement('canvas',{ref:canvas}));}
 const root=require('react-dom/client').createRoot(document.getElementById('mount'));
 try{await React.act(()=>root.render(React.createElement(Fixture,{value:1})));await React.act(()=>root.render(React.createElement(Fixture,{value:2})));assert.equal(creates,1);assert.equal(current().value,2);
  const canvas=document.querySelector('canvas'),lost=new dom.window.Event('webglcontextlost',{cancelable:true});await React.act(()=>canvas.dispatchEvent(lost));assert.ok(lost.defaultPrevented);assert.equal(disposes,1);assert.equal(canvas.parentElement.dataset.failed,'true');
  await React.act(()=>canvas.dispatchEvent(new dom.window.Event('webglcontextrestored')));assert.equal(creates,2);assert.equal(current().value,2);await React.act(()=>root.unmount());assert.equal(disposes,2);
 }finally{dom.window.close();for(const[k,v]of saved)v?Object.defineProperty(globalThis,k,v):delete globalThis[k];}
});


test('Lotus begins as dust, converges before becoming visible petals, and returns continuously',()=>{
 assert.deepEqual(math.lotusFormation(0),{gather:0,petals:0,dust:1});
 const gathering=math.lotusFormation(8);assert.ok(gathering.gather>gathering.petals);assert.equal(gathering.dust,1);
 assert.deepEqual(math.lotusFormation(20),{gather:1,petals:1,dust:0});
});
test('Turbine crowns grow monotonically, overlap during the handoff and have no visible reset',()=>{
 for(let t=0;t<11.2;t+=.03){
  const crowns=math.turbineCrowns(t);assert.equal(crowns.length,2);
  assert.ok(crowns.some(c=>c.opacity>.6),'one crown remains visible through every handoff');
  for(const c of crowns){assert.ok(c.radius>=.56&&c.radius<=1.13);assert.ok(c.opacity>=0&&c.opacity<=1);}
 }
 const start=math.turbineCrowns(0)[0],before=math.turbineCrowns(5.6-.0001)[0];
 assert.equal(start.opacity,0);assert.ok(before.opacity<1e-7);
 assert.ok(math.turbineCrowns(1)[0].radius<math.turbineCrowns(2)[0].radius);
});
test('Bokeh far edge covers wide and portrait camera frustums with parallax overscan',()=>{
 for(const aspect of [.5,1,16/9,21/9,4]){
  const z=26*Math.max(1,.72/aspect),scale=math.terrainCoverage(aspect,z);
  const halfFrustum=Math.tan(43*Math.PI/360)*(z+19)*aspect;
  assert.ok(18*scale>halfFrustum+1);
 }
});


test('Agent eyelids close and reopen continuously at the full oval width, including occasional double blinks',()=>{
 assert.equal(math.agentBlink(0),1);assert.ok(math.agentBlink(4.25)<.07);assert.equal(math.agentBlink(4.5),1);
 let previous=1;for(let t=0;t<22;t+=.001){const value=math.agentBlink(t);assert.ok(value>=.049&&value<=1);assert.ok(Math.abs(value-previous)<.017);previous=value;}
 assert.ok(math.agentBlink(7.3+4.7)<.07);
});
test('Gear-shift glow has a continuous onset and end, avoiding the previous instant radius step',()=>{
 assert.equal(math.turbineShiftPulse(0),0);assert.equal(math.turbineShiftPulse(.75),0);assert.equal(math.turbineShiftPulse(1),0);
 assert.ok(math.turbineShiftPulse(.016)<.005);assert.ok(math.turbineShiftPulse(.375)>.999);
 let previous=0;for(let age=0;age<1;age+=1/120){const value=math.turbineShiftPulse(age);assert.ok(Math.abs(value-previous)<.036);previous=value;}
});
