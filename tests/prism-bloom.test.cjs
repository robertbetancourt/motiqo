const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),ts=require('typescript-compiler-api'),THREE=require('three'),{JSDOM}=require('jsdom');
function load(mocks={}){const filename=path.resolve(__dirname,'../components/ui/prism-bloom.tsx'),m=new Module(filename,module);m.filename=filename;m.paths=Module._nodeModulePaths(path.dirname(filename));const normal=m.require.bind(m);m.require=id=>mocks[id]??normal(id);m._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText,filename);return m.exports;}
const bloom=load();
test('Prism Bloom replaces the artwork export with a self-contained 3D sculpture and bounded complete moods',()=>{
 const item=require('../registry/manifest.json').items.find(i=>i.id==='event-horizon');assert.equal(item.title,'Prism Bloom');assert.equal(item.exportName,'PrismBloom');assert.equal(item.entry,'prism-bloom.tsx');assert.equal(item.files.length,1);assert.equal(item.files[0].source,'components/ui/prism-bloom.tsx');assert.ok(item.packageDependencies.three);assert.ok(!item.controls.some(c=>['restStyle','particleSpread','liquid'].includes(c.key)));
 for(const mood of item.moods){assert.equal(Object.keys(mood.settings).length,item.controls.length);for(const c of item.controls)assert.ok(mood.settings[c.key]>=c.min&&mood.settings[c.key]<=c.max);}
});
test('petals have finite unit normals, real thickness, closed rims and lower mobile detail',()=>{
 const detailed=bloom.createBloomPetal(),small=bloom.createBloomPetal(true);
 try{assert.ok(small.getAttribute('position').count<detailed.getAttribute('position').count);
  for(const geometry of [detailed,small]){const p=geometry.getAttribute('position'),n=geometry.getAttribute('normal'),index=geometry.index.array;assert.ok(p.array.every(Number.isFinite));assert.ok(n.array.every(Number.isFinite));assert.ok(geometry.boundingSphere.radius>.8);
   for(let i=0;i<n.count;i++)assert.ok(Math.abs(Math.hypot(n.getX(i),n.getY(i),n.getZ(i))-1)<.001);
   const layer=p.count/2;for(let i=0;i<layer;i++){const a=new THREE.Vector3().fromBufferAttribute(p,i),b=new THREE.Vector3().fromBufferAttribute(p,i+layer);assert.ok(a.distanceTo(b)>.035&&a.distanceTo(b)<.053);}
   const edges=new Map();for(let i=0;i<index.length;i+=3)for(const[a,b]of [[index[i],index[i+1]],[index[i+1],index[i+2]],[index[i+2],index[i]]]){const key=a<b?`${a}:${b}`:`${b}:${a}`;edges.set(key,(edges.get(key)||0)+1);}assert.ok([...edges.values()].every(n=>n===2),'every triangle edge is shared by two faces');
  }
 }finally{detailed.dispose();small.dispose();}
});
function fixture(){
 const dom=new JSDOM('<div id="host"><canvas></canvas></div>',{pretendToBeVisual:true}),host=dom.window.document.getElementById('host'),canvas=host.querySelector('canvas'),frames=new Map(),observers=[],listeners=new Set();let serial=0,now=1000,hidden=false;
 Object.defineProperties(host,{clientWidth:{value:900},clientHeight:{value:640}});host.getBoundingClientRect=()=>({left:0,top:0,width:900,height:640});Object.defineProperty(dom.window.document,'hidden',{get:()=>hidden});
 const media={matches:false,addEventListener:(_,fn)=>listeners.add(fn),removeEventListener:(_,fn)=>listeners.delete(fn)};
 class Resize{constructor(fn){this.fn=fn;observers.push(this);}observe(){this.fn();}disconnect(){this.disconnected=true;}}
 class Intersection extends Resize{observe(){this.fn([{isIntersecting:true}]);}}
 const env={disposed:0,generated:0,renderers:[],shader:null,geometry:null,material:null};
 class Renderer{constructor(){this.debug={};this.disposed=0;this.draws=0;env.renderers.push(this);}setClearColor(){}setPixelRatio(v){this.dpr=v;}setSize(){}render(scene,camera){this.scene=scene;this.draws++;camera.updateMatrixWorld();scene.updateMatrixWorld();scene.traverse(n=>{if(n.isMesh&&!env.geometry){env.geometry=n.geometry;env.material=n.material;const shader={uniforms:{},vertexShader:'#include <beginnormal_vertex>\n#include <begin_vertex>'};n.material.onBeforeCompile(shader);env.shader=shader;}});}dispose(){this.disposed++;}}
 class Room extends THREE.Scene{dispose(){}}
 class PMREM{fromScene(){env.generated++;return{texture:new THREE.Texture(),dispose(){env.disposed++;}};}dispose(){}}
 const globals={window:dom.window,document:dom.window.document,devicePixelRatio:2,matchMedia:()=>media,ResizeObserver:Resize,IntersectionObserver:Intersection,requestAnimationFrame:fn=>{frames.set(++serial,fn);return serial;},cancelAnimationFrame:id=>frames.delete(id)};
 const saved=new Map(Object.keys(globals).map(k=>[k,Object.getOwnPropertyDescriptor(globalThis,k)]));Object.assign(globalThis,globals);
 const api=load({three:{...THREE,WebGLRenderer:Renderer,PMREMGenerator:PMREM},'three/addons/environments/RoomEnvironment.js':{RoomEnvironment:Room}});
 return{...env,env,host,canvas,media,frames,observers,listeners,api,advance(count=1){for(let i=0;i<count;i++){now+=1000/60;const batch=[...frames.values()];frames.clear();batch.forEach(fn=>fn(now));}},pointer(type,x=530,y=270,pointerType='mouse'){const e=new dom.window.Event(type,{bubbles:true});Object.assign(e,{clientX:x,clientY:y,pointerType,buttons:type==='pointerdown'?1:0});host.dispatchEvent(e);},hidden(v){hidden=v;document.dispatchEvent(new dom.window.Event('visibilitychange'));},close(){dom.window.close();for(const[k,v]of saved)v?Object.defineProperty(globalThis,k,v):delete globalThis[k];}};
}
test('GPU brush returns elastically, live controls do not rebuild geometry, motion preferences and context recovery clean up',()=>{
 const f=fixture();let state={strength:1,radius:.85,returnSpeed:1,iridescence:.85,bloom:.85,sculptureScale:1,compact:false,paused:false,theme:'dark'};let controller;
 try{controller=f.api.createPrismBloomRenderer(f.host,f.canvas,()=>state);f.advance(5);assert.equal(f.host.dataset.gl,'on');assert.equal(f.env.renderers[0].dpr,1.5);const vertices=f.env.geometry.getAttribute('position').array.slice();
  f.pointer('pointermove');f.advance(120);assert.ok(f.env.shader.uniforms.pbForce.value>.95);assert.ok(f.env.shader.vertexShader.includes('objectNormal=normalize'));
  f.pointer('pointerleave');f.advance(180);assert.ok(Math.abs(f.env.shader.uniforms.pbForce.value)<.001);
  f.pointer('pointerdown',530,270,'touch');f.advance(100);assert.ok(f.env.shader.uniforms.pbForce.value>.95);f.pointer('pointerup',530,270,'touch');f.advance(180);assert.ok(Math.abs(f.env.shader.uniforms.pbForce.value)<.001);
  f.host.dispatchEvent(new window.KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true,cancelable:true}));f.advance(100);assert.ok(f.env.shader.uniforms.pbForce.value>.95);f.host.dispatchEvent(new window.KeyboardEvent('keydown',{key:'Home',bubbles:true,cancelable:true}));f.advance(180);assert.ok(Math.abs(f.env.shader.uniforms.pbForce.value)<.001);
  state={...state,radius:1.2,bloom:1.1,iridescence:.3,theme:'light'};controller.sync();f.advance(2);assert.equal(f.env.shader.uniforms.pbRadius.value,1.2);assert.equal(f.env.material.iridescence,.3);assert.deepEqual(f.env.geometry.getAttribute('position').array,vertices);
  f.hidden(true);assert.equal(f.frames.size,0);f.hidden(false);assert.ok(f.frames.size);
  state.paused=true;controller.sync();const time=f.env.shader.uniforms.pbTime.value;f.advance(30);assert.equal(f.frames.size,0);assert.equal(f.env.shader.uniforms.pbTime.value,time);
  state.paused=false;f.media.matches=true;controller.sync();assert.equal(f.frames.size,0);assert.equal(f.env.shader.uniforms.pbBreathe.value,0);f.media.matches=false;controller.sync();f.advance();
  f.canvas.dispatchEvent(new window.Event('webglcontextlost',{cancelable:true}));assert.equal(f.frames.size,0);assert.equal(f.host.dataset.gl,'off');f.canvas.dispatchEvent(new window.Event('webglcontextrestored'));f.advance();assert.equal(f.host.dataset.gl,'on');assert.equal(f.env.generated,2);assert.equal(f.env.disposed,1);
  let geometryDisposed=0,materialDisposed=0;f.env.geometry.addEventListener('dispose',()=>geometryDisposed++);f.env.material.addEventListener('dispose',()=>materialDisposed++);controller.dispose();controller.dispose();assert.equal(geometryDisposed,1);assert.equal(materialDisposed,1);assert.equal(f.env.disposed,2);assert.equal(f.env.renderers[0].disposed,1);assert.equal(f.frames.size,0);assert.equal(f.listeners.size,0);assert.ok(f.observers.every(o=>o.disconnected));
 }finally{controller?.dispose();f.close();}
});

test('restored sculpture uses the original broad cup and compact inner tier',()=>{const middle=bloom.bloomSurface(.5,1);assert.ok(Math.abs(middle.x-(.588*Math.cos(.175)+.12))<1e-9);assert.equal(bloom.bloomSurface(0,0).y,.12);const f=fixture(),state={strength:1,radius:.85,returnSpeed:1,iridescence:.85,bloom:.85,sculptureScale:1,compact:false,paused:true,theme:'dark'};let controller;try{controller=f.api.createPrismBloomRenderer(f.host,f.canvas,()=>state);const petals=f.env.renderers[0].scene.children[0].children;assert.equal(petals.length,11);assert.ok(petals.slice(7).every(p=>p.position.z===.34&&p.rotation.x===-.38&&p.rotation.order==='XYZ'));}finally{controller?.dispose();f.close();}});
