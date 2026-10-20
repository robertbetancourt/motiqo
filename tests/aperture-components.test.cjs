const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),ts=require('typescript'),React=require('react'),THREE=require('three'),{JSDOM}=require('jsdom');
function load(file,mocks={}){const filename=path.resolve(__dirname,'..',file),entry=new Module(filename,module);entry.filename=filename;entry.paths=Module._nodeModulePaths(path.dirname(filename));const normal=entry.require.bind(entry);entry.require=id=>mocks[id]??normal(id);entry._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText,filename);return entry.exports;}
const timing=load('components/ui/kinetic-loop.ts');
const optical={'./optical-button':{OpticalButton:({iconOnly,paused,compact,...props})=>React.createElement('button',props)}};
test('loader curve is monotone, exact at all phase boundaries and invertible for scrubbing',()=>{
 const api=load('components/ui/aperture-loader.tsx',{'./kinetic-loop':timing});let previous=0;
 for(let i=0;i<=2000;i++){const p=api.apertureProgress(i/2000);assert.ok(Number.isFinite(p)&&p>=previous&&p<=100);previous=p;assert.ok(Math.abs(api.apertureProgress(api.apertureTime(p))-p)<.001);}
 assert.equal(api.apertureProgress(0),1);assert.equal(api.apertureProgress(.28),18);assert.equal(api.apertureProgress(.78),88);assert.equal(api.apertureProgress(1),100);
});
test('Sonic grid has 50,176 finite desktop samples and bounded mobile density',()=>{
 const api=load('components/ui/sonic-aperture.tsx',{'./kinetic-loop':timing,...optical}),full=api.createSonicGrid(),small=api.createSonicGrid(true);try{assert.equal(full.getAttribute('aUv').count,50176);assert.ok(small.getAttribute('aUv').count<50176);assert.ok(full.getAttribute('aUv').array.every(x=>Number.isFinite(x)&&x>0&&x<1));}finally{full.dispose();small.dispose();}
});
test('registry exports all new controls with real booleans and nested lyric arrays',()=>{
 const controls=load('lib/element-controls.ts'),manifest=require('../registry/manifest.json');
 for(const id of ['sonic-aperture','prism-core','aperture-loader']){const item=manifest.items.find(i=>i.id===id);assert.ok(item);assert.ok(item.files.some(f=>f.source.endsWith('kinetic-loop.ts')));for(const mood of item.moods)assert.deepEqual(controls.normalizeSettings(id,mood.settings),mood.settings);const code=controls.usageFor(item,controls.defaultsFor(id));assert.doesNotMatch(code,/autoPlay="enabled"|interactive="enabled"|defaultListening="closed"/);if(id==='sonic-aperture')assert.match(code,/lyrics=\{\[\[/);}
 const loader=manifest.items.find(i=>i.id==='aperture-loader');assert.equal(loader.files.filter(f=>f.source.endsWith('.webp')).length,12);
 assert.equal(controls.defaultsFor('prism-core').prismOffset,.10);
 const sonic=manifest.items.find(i=>i.id==='sonic-aperture');assert.ok(sonic.files.some(f=>f.source==='components/originals/optical-button.tsx'));assert.ok(!loader.files.some(f=>f.source.endsWith('.woff2')),'Fontshare font is not redistributed with components');
 assert.equal(controls.normalizeSettings('sonic-aperture',{lyrics:"My broken\npieces, you\npick them up\n\nDon't leave\nme hanging\nHanging come\ngive me some"}).lyrics,controls.defaultsFor('sonic-aperture').lyrics);assert.equal(controls.normalizeSettings('sonic-aperture',{lyrics:'My own copy'}).lyrics,'My own copy');assert.equal(controls.normalizeSettings('sonic-aperture',{lyrics:'Come be\nthe man\nI need'}).lyrics,controls.defaultsFor('sonic-aperture').lyrics);
});
function fixture(){
 const dom=new JSDOM('<div id="mount"></div>',{pretendToBeVisual:true}),frames=new Map(),observers=[],mediaCallbacks=new Set(),resources=new Set(),renderers=[];let serial=0,now=1000,hidden=false,draws=0;
 const media={matches:false,addEventListener:(_,fn)=>mediaCallbacks.add(fn),removeEventListener:(_,fn)=>mediaCallbacks.delete(fn)};
 class Resize{constructor(fn){this.fn=fn;observers.push(this);}observe(){this.fn();}disconnect(){this.disconnected=true;}}
 class Intersection extends Resize{observe(){this.fn([{isIntersecting:true}]);}}
 const ctx={setTransform(){},clearRect(){},fillRect(){},save(){},restore(){},beginPath(){},arc(){},clip(){},drawImage(){draws++;}};
 dom.window.HTMLCanvasElement.prototype.getContext=()=>ctx;
 Object.defineProperties(dom.window.HTMLElement.prototype,{clientWidth:{get:()=>900},clientHeight:{get:()=>640}});dom.window.HTMLElement.prototype.getBoundingClientRect=()=>({left:0,top:0,width:900,height:640});Object.defineProperty(dom.window.document,'hidden',{get:()=>hidden});
 class Image{constructor(){this.naturalWidth=1600;this.naturalHeight=1200;}set src(value){this._src=value;queueMicrotask(()=>this.onload?.());}get src(){return this._src;}}
 class Renderer{constructor(){this.debug={};this.disposed=0;renderers.push(this);}setClearColor(){}setPixelRatio(){}setSize(){}render(scene,camera){camera.updateMatrixWorld();scene.updateMatrixWorld();this.scene=scene;scene.traverse(n=>{if(n.geometry)resources.add(n.geometry);if(n.material)resources.add(n.material);});}dispose(){this.disposed++;}}
 const globals={window:dom.window,document:dom.window.document,Image,devicePixelRatio:2,MutationObserver:dom.window.MutationObserver,IS_REACT_ACT_ENVIRONMENT:true,matchMedia:()=>media,ResizeObserver:Resize,IntersectionObserver:Intersection,requestAnimationFrame:fn=>{frames.set(++serial,fn);return serial;},cancelAnimationFrame:id=>frames.delete(id)};
 const saved=new Map(Object.keys(globals).map(k=>[k,Object.getOwnPropertyDescriptor(globalThis,k)]));Object.assign(globalThis,globals);
 const mocks={'./kinetic-loop':timing,...optical,three:{...THREE,WebGLRenderer:Renderer}};
 return{dom,media,frames,observers,mediaCallbacks,resources,renderers,get draws(){return draws;},load:file=>load(file,mocks),advance(n=1){for(let i=0;i<n;i++){now+=1000/60;const jobs=[...frames.values()];frames.clear();jobs.forEach(fn=>fn(now));}},hidden(value){hidden=value;document.dispatchEvent(new window.Event('visibilitychange'));},close(){dom.window.close();for(const[k,v]of saved)v?Object.defineProperty(globalThis,k,v):delete globalThis[k];}};
}
test('Sonic opens, reveals and closes without microphone access or geometry replacement; Core drag and suspension clean resources',async()=>{
 for(const kind of ['sonic-aperture','prism-core']){const f=fixture(),Component=f.load(`components/ui/${kind}.tsx`).default,root=require('react-dom/client').createRoot(document.getElementById('mount'));let mounted=true;
  try{await React.act(async()=>root.render(React.createElement(Component,kind==='prism-core'?{autoPlay:false}:{})));await React.act(async()=>f.advance(4));const host=document.querySelector(kind==='sonic-aperture'?'.sonic-aperture':'.prism-core');assert.equal(host.dataset.gl,'on');
   if(kind==='sonic-aperture'){const points=f.renderers[0].scene.children.find(n=>n.isPoints),geometry=points.geometry;await React.act(async()=>host.querySelector('button').click());await React.act(async()=>f.advance(120));assert.ok(points.material.uniforms.uMorph.value>.99);assert.equal(host.dataset.open,'true');assert.equal(points.geometry,geometry);assert.equal(f.renderers[0].scene.children.filter(n=>n.isMesh).length,0,'closed sphere uses particles without a solid skin');assert.equal(host.querySelector('button').getAttribute('aria-pressed'),'true');await React.act(async()=>host.querySelector('button').click());await React.act(async()=>f.advance(120));assert.ok(points.material.uniforms.uMorph.value<.01);}
   else{const group=f.renderers[0].scene.children[0],pose=group.rotation.clone();await React.act(async()=>f.advance(60));assert.deepEqual(group.rotation.toArray(),pose.toArray(),'autoplay disabled fixes every automatic rotation axis');const old=group.rotation.y;const event=(type,x)=>{const e=new window.Event(type,{bubbles:true});Object.assign(e,{clientX:x,clientY:250,pointerId:1});host.dispatchEvent(e);};event('pointerdown',300);event('pointermove',400);event('pointerup',400);await React.act(async()=>f.advance(20));assert.ok(group.rotation.y>old+.5);}
   await React.act(async()=>f.hidden(true));assert.equal(f.frames.size,0);await React.act(async()=>f.hidden(false));assert.ok(f.frames.size>0);f.media.matches=true;await React.act(async()=>f.mediaCallbacks.forEach(fn=>fn()));assert.equal(f.frames.size,0);
   const counts=new Map();for(const resource of f.resources)resource.addEventListener('dispose',()=>counts.set(resource,(counts.get(resource)||0)+1));await React.act(async()=>root.unmount());mounted=false;assert.ok([...f.resources].every(r=>counts.get(r)===1));assert.ok(f.renderers.every(r=>r.disposed===1));assert.equal(f.frames.size,0);assert.equal(f.mediaCallbacks.size,0);assert.ok(f.observers.every(o=>o.disconnected));
  }finally{if(mounted)await React.act(async()=>root.unmount());f.close();}
 }
});
test('loader preloads, completes once in single-run mode, replays and cleans frames and image callbacks',async()=>{
 const f=fixture(),Loader=f.load('components/ui/aperture-loader.tsx').default,root=require('react-dom/client').createRoot(document.getElementById('mount'));let complete=0,mounted=true;
 try{await React.act(async()=>root.render(React.createElement(Loader,{autoPlay:false,duration:800,onComplete:()=>complete++})));await React.act(async()=>f.advance(100));const host=document.querySelector('.aperture-loader');assert.equal(host.getAttribute('aria-valuenow'),'100');assert.equal(complete,1);assert.ok(f.draws>10);assert.equal(f.frames.size,0);
  const key=new window.KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true});await React.act(async()=>host.dispatchEvent(key));await React.act(async()=>f.advance(100));assert.equal(complete,2);await React.act(async()=>root.unmount());mounted=false;assert.equal(f.frames.size,0);assert.equal(f.mediaCallbacks.size,0);
 }finally{if(mounted)await React.act(async()=>root.unmount());f.close();}
});
