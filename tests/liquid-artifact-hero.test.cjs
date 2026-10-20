const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),ts=require('typescript-compiler-api'),React=require('react'),{JSDOM}=require('jsdom');
const cache=new Map();const motion=new Proxy({},{get:(_,tag)=>{if(!cache.has(tag))cache.set(tag,({children,initial,animate,transition,layoutId,...props})=>React.createElement(tag,props,children));return cache.get(tag);}});
function load(){const filename=path.resolve(__dirname,'../components/ui/liquid-artifact.tsx'),m=new Module(filename,module);m.filename=filename;m.paths=Module._nodeModulePaths(path.dirname(filename));const normal=m.require.bind(m);m.require=id=>id==='motion/react'?{motion,useReducedMotion:()=>false}:normal(id);m._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText,filename);return m.exports;}
const artifact=load();

test('Liquid Artifact restores shape moods without duplicating the hidden form selector or title',()=>{
 const manifest=require('../registry/manifest.json'),item=manifest.items.find(i=>i.id==='liquid-artifact-hero');assert.ok(item);assert.equal(item.files.length,1);assert.equal(item.entry,'liquid-artifact.tsx');assert.equal(manifest.items.some(i=>i.id==='liquid-relic'),false);
 const filename=path.resolve(__dirname,'../lib/element-controls.ts'),entry=new Module(filename,module);entry.filename=filename;entry.paths=Module._nodeModulePaths(path.dirname(filename));entry._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,filename);
 assert.equal(item.title,'Liquid Artifact');assert.equal(item.exportName,'LiquidArtifact');assert.deepEqual(item.controls.filter(c=>!c.hidden).map(c=>c.key),['particleDensity','vortexSpeed','vortexRadius']);assert.deepEqual(item.moods.map(m=>m.label),['Black Hole','Aether','Chalice']);assert.ok(item.controls.find(c=>c.key==='defaultShape').hidden);
 const cleaned=entry.exports.normalizeSettings(item.id,{defaultShape:'0',title:'Liquid Form',animation:'paused',vortexRadius:.4});assert.deepEqual(Object.keys(cleaned),['defaultShape','particleDensity','vortexSpeed','vortexRadius']);assert.equal(cleaned.defaultShape,'0');assert.equal(cleaned.vortexRadius,.4);
 const example=entry.exports.usageFor(item,{defaultShape:'0',title:'Old title',vortexSpeed:24});assert.match(example,/import LiquidArtifact from '.\/liquid-artifact'/);assert.match(example,/vortexSpeed=\{24\}/);assert.match(example,/defaultShape=\{0\}/);assert.doesNotMatch(example,/title=|Hero|paused=/);
 assert.match(artifact.artifactVertex,/blackHoleParticle\(aSeed.x,aSeed.y\)/);assert.doesNotMatch(artifact.artifactVertex,/hole.xy=mat2|float shadow=/);

 const event=manifest.items.find(i=>i.id==='event-horizon');assert.ok(event.files.some(f=>f.source.endsWith('prism-bloom.tsx')));assert.ok(event.files.every(f=>!f.source.includes('liquid-relic')));
});

test('black-hole lens has smooth shoulders and the inner far rim meets the photon ring',()=>{
 for(const u of [.15,.45,.9,1.3,1.57,1.9,2.3,2.8,3.0]){
  const ring=artifact.artifactSurface(2,u,.38-1e-8),disk=artifact.artifactSurface(2,u,.38+1e-8);
  assert.ok(Math.hypot(...ring.map((n,k)=>n-disk[k]))<1e-6,'inner far rim is position-continuous');
 }
 for(const x of [-1.05,1.05]){
  const band=.45,r=.88+band**1.7*1.75,u=Math.acos(x/r),v=.38+.62*band,h=1e-4;
  const before=artifact.artifactSurface(2,u-h,v),at=artifact.artifactSurface(2,u,v),after=artifact.artifactSurface(2,u+h,v);
  const slopeLeft=(at[1]-before[1])/h,slopeRight=(after[1]-at[1])/h;
  assert.ok(Math.abs(slopeLeft-slopeRight)<.01,'no hard cutoff at either shoulder');
 }
 assert.doesNotMatch(artifact.artifactVertex,/pow\(x\//,'GLSL lens does not take pow of a negative base');
});

test('three original surfaces have finite unit normals, repeat deterministically and enforce adaptive density',()=>{
 const a=artifact.createArtifactGeometry(1200),b=artifact.createArtifactGeometry(1200);
 assert.deepEqual(a,b);assert.equal(a.positions.length,3);
 for(let i=0;i<1200;i++){const expected=artifact.artifactSurface(2,a.seeds[i*3]*Math.PI*2,a.seeds[i*3+1]);for(let k=0;k<3;k++)assert.ok(Math.abs(expected[k]-a.positions[2][i*3+k])<.00001,'GPU flow samples start on the authored static surface');}assert.notDeepEqual(a.positions[0],a.positions[1]);assert.notDeepEqual(a.positions[1],a.positions[2]);
 for(const data of [...a.positions,...a.normals,a.seeds])assert.ok(data.every(Number.isFinite));
 for(const normals of a.normals)for(let i=0;i<normals.length;i+=3)assert.ok(Math.abs(Math.hypot(...normals.subarray(i,i+3))-1)<.001);
 assert.ok(a.positions[0].some((v,i)=>i%3===0&&Math.abs(v)>2),'Aether has continuous lateral plumes');
 for(let v=.001;v<.38;v+=.01){const p=artifact.artifactSurface(2,1,v);assert.ok(Math.hypot(p[0],p[1])>=.69,'the photon ring surrounds a clear shadow');}assert.ok(a.positions[2].some((v,i)=>i%3===0&&Math.abs(v)>2),'black hole has a broad accretion disk');assert.equal(artifact.artifactParticleCount(1200,false,false,'auto'),80000);assert.equal(artifact.artifactParticleCount(1200,false,false,'medium'),50000);
 for(const [w,coarse,compact]of [[390,false,false],[1200,true,false],[1200,false,true]])assert.equal(artifact.artifactParticleCount(w,coarse,compact,'high'),30000);
});

function fixture({failShader=0,unsupported=false}={}){
 const dom=new JSDOM('<div id="mount"></div>',{pretendToBeVisual:true,url:'https://motiqo.test'}),frames=new Map(),live=new Set(),uniforms=new Map(),observers=[],mediaListeners=new Set();
 let serial=0,compiled=0,now=1000,width=1200,height=720,hidden=false,uploads=0,draws=0,count=0;
 const make=kind=>{const n={kind,id:++serial};live.add(n);return n;},free=n=>{if(n)assert.ok(live.delete(n),'every GPU resource is released once');};
 const gl={VERTEX_SHADER:1,FRAGMENT_SHADER:2,COMPILE_STATUS:3,LINK_STATUS:4,ARRAY_BUFFER:5,STATIC_DRAW:6,FLOAT:7,POINTS:8,ONE:1,ONE_MINUS_SRC_ALPHA:9,BLEND:10,COLOR_BUFFER_BIT:11,
  createProgram:()=>make('program'),createShader:()=>make('shader'),shaderSource(){},compileShader(s){s.number=++compiled;},getShaderParameter:s=>s.number!==failShader,getShaderInfoLog:()=> 'shader failure',attachShader(){},linkProgram(){},getProgramParameter:()=>true,getUniformLocation:(_,name)=>name,
  createVertexArray:()=>make('vao'),createBuffer:()=>make('buffer'),deleteProgram:free,deleteShader:free,deleteVertexArray:free,deleteBuffer:free,
  bindVertexArray(){},bindBuffer(){},bufferData(){uploads++;},enableVertexAttribArray(){},vertexAttribPointer(){},viewport(){},clearColor(){},clear(){},enable(){},blendFunc(){},useProgram(){},
  uniform1f:(key,a)=>uniforms.set(key,a),uniform2f:(key,...v)=>uniforms.set(key,v),uniform3f:(key,...v)=>uniforms.set(key,v),uniform4f:(key,...v)=>uniforms.set(key,v),drawArrays(_,__,n){draws++;count=n;}};
 dom.window.HTMLCanvasElement.prototype.getContext=()=>unsupported?null:gl;
 Object.defineProperties(dom.window.HTMLElement.prototype,{clientWidth:{get:()=>width},clientHeight:{get:()=>height}});
 dom.window.HTMLElement.prototype.getBoundingClientRect=()=>({left:0,top:0,width,height});
 Object.defineProperty(dom.window.document,'hidden',{get:()=>hidden});
 const reduced={matches:false,addEventListener:(_,fn)=>mediaListeners.add(fn),removeEventListener:(_,fn)=>mediaListeners.delete(fn)},coarse={...reduced};
 class Observer{constructor(fn){this.fn=fn;observers.push(this);}observe(){if(this instanceof Intersection)this.fn([{isIntersecting:true}]);else this.fn();}disconnect(){this.disconnected=true;}}
 class Intersection extends Observer{}
 const globals={window:dom.window,document:dom.window.document,Element:dom.window.Element,MutationObserver:dom.window.MutationObserver,IS_REACT_ACT_ENVIRONMENT:true,ResizeObserver:Observer,IntersectionObserver:Intersection,matchMedia:q=>q.includes('coarse')?coarse:reduced,requestAnimationFrame:fn=>{frames.set(++serial,fn);return serial;},cancelAnimationFrame:id=>frames.delete(id)};
 const saved=new Map(Object.keys(globals).map(k=>[k,Object.getOwnPropertyDescriptor(globalThis,k)]));for(const[k,v]of Object.entries(globals))Object.defineProperty(globalThis,k,{value:v,configurable:true,writable:true});
 return {dom,frames,live,uniforms,observers,reduced,mediaListeners,get uploads(){return uploads;},get draws(){return draws;},get count(){return count;},
  advance(n=90,hz=60){for(let i=0;i<n;i++){now+=1000/hz;const batch=[...frames.values()];frames.clear();batch.forEach(fn=>fn(now));}},
  resize(w,h){width=w;height=h;observers.filter(o=>!(o instanceof Intersection)).forEach(o=>o.fn());},
  hidden(value){hidden=value;document.dispatchEvent(new dom.window.Event('visibilitychange'));},
  pointer(type,x,y,touch=false){const event=new dom.window.MouseEvent(type,{clientX:x,clientY:y,bubbles:true});Object.defineProperty(event,'pointerType',{value:touch?'touch':'mouse'});document.querySelector('.lah-canvas').dispatchEvent(event);},
  close(){dom.window.close();for(const[k,v]of saved)v?Object.defineProperty(globalThis,k,v):delete globalThis[k];}};
}

test('external panel props drive morphs and themes; stationary hover sustains fast vortex motion without vertex uploads',async()=>{
 const env=fixture(),root=require('react-dom/client').createRoot(document.getElementById('mount'));let mounted=true,props={defaultTheme:'dark'};
 const render=async patch=>{props={...props,...patch};await React.act(async()=>root.render(React.createElement(artifact.default,props)));};
 try{
  await render({});env.advance();assert.equal(env.count,80000);assert.equal(env.uploads,7);
  assert.deepEqual(env.uniforms.get('uWeights'),[0,0,1]);assert.equal(env.uniforms.get('uVortexRadius'),.4);const host=document.querySelector('.lah-root');assert.equal(host.dataset.gpu,'on');assert.equal(host.querySelectorAll('button,header,footer,nav').length,0,'the hero contains no internal interface');assert.equal(host.querySelector('h1,.lah-title'),null);assert.equal(host.getAttribute('aria-label'),'Liquid Artifact');assert.doesNotMatch(host.querySelector('style').textContent,/::after|lah-title/);
  await render({defaultShape:1});env.advance(1);let w=env.uniforms.get('uWeights');assert.ok(w[2]>0&&w[1]>0&&w[1]<1);env.advance();assert.ok(env.uniforms.get('uWeights')[1]>.99);assert.equal(env.uploads,7);
  await render({defaultShape:2});env.advance(3);await render({defaultShape:0});env.advance();assert.ok(env.uniforms.get('uWeights')[0]>.99);
  env.pointer('pointermove',820,320,true);env.advance(4);assert.ok(env.uniforms.get('uPresence')>.3);assert.ok(env.uniforms.get('uMouseVelocity').every(v=>Math.abs(v)<=5));
  const initialPhase=env.uniforms.get('uVortexPhase');env.advance(120);assert.ok(env.uniforms.get('uVortexPhase')-initialPhase>28,'hover produces multiple revolutions even with a stationary pointer');assert.ok(env.uniforms.get('uMouseVelocity').every(v=>Math.abs(v)<.001));assert.equal(env.uploads,7);
  await render({vortexSpeed:0,vortexRadius:1.25});const stoppedPhase=env.uniforms.get('uVortexPhase');env.advance(30);assert.equal(env.uniforms.get('uVortexPhase'),stoppedPhase);assert.equal(env.uniforms.get('uVortexRadius'),1.25);
  await render({vortexSpeed:24});env.advance(30);assert.ok(env.uniforms.get('uVortexPhase')-stoppedPhase>11);
  env.pointer('pointerdown',820,320,true);env.advance(1);assert.ok(env.uniforms.get('uShockwave')[3]<.1);env.pointer('pointerup',820,320,true);env.advance();assert.ok(env.uniforms.get('uPresence')<.001);
  await render({defaultTheme:'light'});env.advance();assert.equal(host.dataset.theme,'light');assert.ok(env.uniforms.get('uThemeMix')>.99);assert.equal(env.uploads,7);
  const before=env.draws;env.advance(120,120);assert.ok(env.draws-before<=61);
  env.hidden(true);assert.equal(env.frames.size,0);env.hidden(false);assert.ok(env.frames.size>0);
  await render({paused:true});const paused=env.draws;env.advance();assert.equal(env.frames.size,0);assert.equal(env.draws,paused);
  env.reduced.matches=true;env.mediaListeners.forEach(fn=>fn());assert.equal(env.frames.size,0);assert.equal(env.uniforms.get('uPresence'),0);
  await render({defaultShape:2});assert.deepEqual(env.uniforms.get('uWeights'),[0,0,1]);
  env.resize(390,720);assert.equal(env.count,30000);assert.equal(env.live.size,9);
  const canvas=host.querySelector('canvas');canvas.dispatchEvent(new env.dom.window.Event('webglcontextlost',{cancelable:true}));assert.equal(host.dataset.gpu,'off');assert.equal(env.frames.size,0);canvas.dispatchEvent(new env.dom.window.Event('webglcontextrestored'));assert.equal(host.dataset.gpu,'on');
  await React.act(async()=>root.unmount());mounted=false;assert.equal(env.live.size,0);assert.equal(env.frames.size,0);assert.equal(env.mediaListeners.size,0);assert.ok(env.observers.every(o=>o.disconnected));
 }finally{if(mounted)await React.act(async()=>root.unmount());env.close();}
});

test('StrictMode, partial shader failures and unsupported WebGL preserve a usable hero and clean all allocations',async()=>{
 for(const options of [{},{failShader:2},{unsupported:true}]){
  const env=fixture(options),root=require('react-dom/client').createRoot(document.getElementById('mount'));
  try{
   await React.act(async()=>root.render(React.createElement(React.StrictMode,null,React.createElement(artifact.default,{compact:true}))));env.advance();
   assert.equal(document.querySelector('h1'),null);assert.ok(document.querySelector('.lah-fallback'));if(options.unsupported)assert.equal(document.querySelector('.lah-root').dataset.gpu,'off');else assert.equal(env.count,30000);
  }finally{await React.act(async()=>root.unmount());assert.equal(env.live.size,0);assert.equal(env.frames.size,0);env.close();}
 }
});
