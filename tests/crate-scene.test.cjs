const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');const path=require('node:path');const Module=require('node:module');const ts=require('typescript');const THREE=require('three');const {JSDOM}=require('jsdom');
function load(renderer){const filename=path.resolve(__dirname,'../components/originals/crate-scene.ts'),entry=new Module(filename,module);entry.filename=filename;entry.paths=Module._nodeModulePaths(path.dirname(filename));entry.require=name=>name==='three'?{...THREE,WebGLRenderer:renderer}:require(name);entry._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,filename);return entry.exports;}
test('Crate keeps records separated, restores the shelf, pauses and disposes GPU resources',()=>{
  const dom=new JSDOM('<div id="host"><canvas></canvas></div>',{pretendToBeVisual:true});const host=dom.window.document.querySelector('#host'),canvas=host.firstChild;
  const rect=()=>({left:0,top:0,width:640,height:440});host.getBoundingClientRect=canvas.getBoundingClientRect=rect;
  Object.defineProperty(canvas,'clientWidth',{value:640});Object.defineProperty(canvas,'clientHeight',{value:440});
  let now=1000,id=0,disposed=0,disconnected=0,ready=0;const frames=new Map(),listeners=new Set(),observers=[];
  const media={matches:false,addEventListener:(_,fn)=>listeners.add(fn),removeEventListener:(_,fn)=>listeners.delete(fn)};
  class Renderer{setClearColor(){}setPixelRatio(){}setSize(){}render(scene,camera){scene.updateMatrixWorld(true);camera.updateMatrixWorld(true);}dispose(){disposed++;}}
  class Size{constructor(fn){this.fn=fn;}observe(){this.fn();}disconnect(){disconnected++;}}
  class Visible{constructor(fn){this.fn=fn;observers.push(this);}observe(){this.fn([{isIntersecting:true}]);}disconnect(){disconnected++;}}
  const globals={window:dom.window,document:dom.window.document,matchMedia:()=>media,ResizeObserver:Size,IntersectionObserver:Visible,requestAnimationFrame:fn=>{frames.set(++id,fn);return id;},cancelAnimationFrame:id=>frames.delete(id),performance:{now:()=>now}};
  const old=new Map(Object.keys(globals).map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)]));Object.entries(globals).forEach(([key,value])=>Object.defineProperty(globalThis,key,{value,writable:true,configurable:true}));
  const api=load(Renderer),advance=()=>{for(let i=0;i<500&&frames.size;i++){now+=1000/60;const batch=[...frames.values()];frames.clear();batch.forEach(fn=>fn(now));}};
  let scene;
  try{
    for(let count=3;count<=10;count++){
      const positions=api.recordLayout(count);const extremeDiscHalfWidth=2.1+2*api.CRATE_RADIUS*Math.sin(api.CRATE_LEAN);
      assert.equal(positions.length,count);for(let i=1;i<count;i++)assert.ok(positions[i]-positions[i-1]>extremeDiscHalfWidth*2,'even opposite maximum tilts cannot touch');
    }
    scene=api.createCrateScene(canvas,8,false,()=>ready++);advance();assert.equal(ready,1);
    const back=scene.records[0].pivot.parent.children.find(object=>object.geometry?.parameters?.height===26);assert.ok(back.position.z+back.geometry.parameters.depth/2< -api.CRATE_RADIUS-.22,'rear rail clears the entire disc radius');
    host.dispatchEvent(new dom.window.KeyboardEvent('keydown',{key:'End'}));advance();
    assert.ok(scene.records[7].pivot.position.y>27.9);assert.ok(scene.records[0].pivot.position.y<.01);assert.equal(frames.size,0);
    host.dispatchEvent(new dom.window.KeyboardEvent('keydown',{key:' '}));host.dispatchEvent(new dom.window.Event('pointerleave'));advance();assert.ok(scene.records[7].pivot.position.y>27.9);
    host.dispatchEvent(new dom.window.KeyboardEvent('keydown',{key:' '}));advance();assert.ok(scene.records.every(record=>record.pivot.position.y<.01), JSON.stringify(scene.records.map(record=>record.pivot.position.y)));
    host.dispatchEvent(new dom.window.KeyboardEvent('keydown',{key:'Home'}));assert.ok(frames.size>0);observers[0].fn([{isIntersecting:false}]);assert.equal(frames.size,0);observers[0].fn([{isIntersecting:true}]);advance();
    scene.setOptions({paused:true,intensity:1,speed:1});const frozen=scene.records[0].pivot.position.y;host.dispatchEvent(new dom.window.KeyboardEvent('keydown',{key:'End'}));advance();assert.equal(scene.records[0].pivot.position.y,frozen);assert.equal(frames.size,0);
    scene.setOptions({paused:false,intensity:1.4,speed:1.8});host.dispatchEvent(new dom.window.KeyboardEvent('keydown',{key:'End'}));advance();assert.ok(scene.records[7].pivot.position.y>39);assert.ok(scene.records.every(record=>Math.abs(record.pivot.rotation.z)<=api.CRATE_LEAN));
    media.matches=true;listeners.forEach(fn=>fn());assert.ok(scene.records.every(record=>record.pivot.position.y===0));assert.equal(frames.size,0);
    const geometry=new Set(),materials=new Set();scene.records[0].pivot.parent.traverse(object=>{if(object.geometry)geometry.add(object.geometry);if(object.material)materials.add(object.material);});let freed=0;[...geometry,...materials].forEach(resource=>resource.addEventListener('dispose',()=>freed++));
    scene.dispose();scene=null;assert.equal(freed,geometry.size+materials.size);assert.equal(disposed,1);assert.equal(disconnected,2);assert.equal(listeners.size,0);assert.equal(frames.size,0);
    host.dispatchEvent(new dom.window.KeyboardEvent('keydown',{key:'End'}));assert.equal(frames.size,0);
  }finally{scene?.dispose();dom.window.close();for(const[key,value]of old){if(value)Object.defineProperty(globalThis,key,value);else delete globalThis[key];}}
});
