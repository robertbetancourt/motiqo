const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),ts=require('typescript-compiler-api'),{JSDOM}=require('jsdom');
function load(file,mocks={}){const filename=path.resolve(__dirname,'..',file),m=new Module(filename,module);m.filename=filename;m.paths=Module._nodeModulePaths(path.dirname(filename));const normal=m.require.bind(m);m.require=id=>Object.hasOwn(mocks,id)?mocks[id]:normal(id);m._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText,filename);return m.exports;}
const native=load('components/originals/native-gl.ts'),inkMath=load('components/originals/inkshift-math.ts'),brushMath=load('components/originals/atelier-math.ts');

// This GL double checks ownership and framebuffer feedback, while actual GLSL is checked in the browser.
function fixture(){
 const dom=new JSDOM('<div id="host" tabindex="0"><canvas></canvas></div>',{pretendToBeVisual:true}),owned=new Set(),deleted=new Set(),frames=new Map(),sizes=[],visibility=[],mediaListeners=new Set(),images=[],draws=[];let id=0,now=1000,hidden=false,active=0,program,framebuffer;const bound=new Map();
 const make=kind=>{const value={kind,id:++id};owned.add(value);return value;},remove=value=>{assert.ok(owned.has(value));assert.ok(!deleted.has(value),`double delete of ${value.kind}`);deleted.add(value);};
 const gl={VERTEX_SHADER:1,FRAGMENT_SHADER:2,COMPILE_STATUS:3,LINK_STATUS:4,TEXTURE_2D:5,TEXTURE0:100,FRAMEBUFFER:6,FRAMEBUFFER_COMPLETE:7,failShader:false,failTarget:false,
  createVertexArray:()=>make('vao'),deleteVertexArray:remove,bindVertexArray(){},disable(){},createShader:type=>({...make('shader'),type}),shaderSource(s,source){s.source=source;},compileShader(){},getShaderParameter(){return !gl.failShader;},getShaderInfoLog:()=> 'test compile failure',deleteShader(s){const real=[...owned].find(x=>x.id===s.id);remove(real);},
  createProgram:()=>make('program'),attachShader(p,s){if(s.type===2)p.source=s.source;},linkProgram(){},getProgramParameter:()=>true,getProgramInfoLog:()=>'',deleteProgram:remove,useProgram(p){program=p;},
  createTexture:()=>make('texture'),deleteTexture:remove,bindTexture(_,t){bound.set(active,t);},texParameteri(){},texImage2D(){},pixelStorei(){},activeTexture(unit){active=unit-100;},
  createFramebuffer:()=>make('framebuffer'),deleteFramebuffer:remove,bindFramebuffer(_,f){framebuffer=f;},framebufferTexture2D(_,__,___,texture){framebuffer.texture=texture;},checkFramebufferStatus:()=>gl.failTarget?0:7,viewport(){},clearColor(){},clear(){},getExtension:()=>({}),
  getUniformLocation:(p,name)=>({p,name}),uniform1f(l,value){(l.p.uniforms??={})[l.name]=value;},uniform1i(l,unit){(l.p.samplers??={})[l.name]=unit;},uniform2f(){},uniform3f(){},uniform4f(){},uniform4fv(){},
  drawArrays(){for(const unit of Object.values(program.samplers??{}))assert.notEqual(bound.get(unit),framebuffer?.texture,'a pass must never sample its destination');draws.push({source:program.source,uniforms:{...program.uniforms},program});}
 };
 const context2d={font:'',measureText(char){return{width:parseFloat(this.font.split(' ')[1])* .55};},setTransform(){},clearRect(){},save(){},beginPath(){},rect(){},clip(){},fillText(){},restore(){}};
 dom.window.HTMLCanvasElement.prototype.getContext=function(type){return type==='webgl2'?gl:context2d;};
 dom.window.HTMLElement.prototype.getBoundingClientRect=()=>({left:0,top:0,width:640,height:480});dom.window.HTMLElement.prototype.setPointerCapture=function(id){this.capture=id;};dom.window.HTMLElement.prototype.hasPointerCapture=function(id){return this.capture===id;};dom.window.HTMLElement.prototype.releasePointerCapture=function(){this.capture=undefined;};
 class Resize{constructor(fn){this.fn=fn;sizes.push(this);}observe(){this.fn();}disconnect(){this.disconnected=true;}}
 class Visible{constructor(fn){this.fn=fn;visibility.push(this);}observe(){this.fn([{isIntersecting:true}]);}disconnect(){this.disconnected=true;}}
 class Image{constructor(){this.naturalWidth=1600;this.naturalHeight=900;images.push(this);}src='';}
 const media={matches:false,addEventListener:(_,fn)=>mediaListeners.add(fn),removeEventListener:(_,fn)=>mediaListeners.delete(fn)};
 Object.defineProperty(dom.window.document,'hidden',{get:()=>hidden});Object.defineProperty(dom.window.document,'fonts',{value:{load:()=>Promise.resolve([])}});
 const globals={window:dom.window,document:dom.window.document,devicePixelRatio:2,performance:{now:()=>now},Image,matchMedia:()=>media,ResizeObserver:Resize,IntersectionObserver:Visible,requestAnimationFrame:fn=>{frames.set(++id,fn);return id;},cancelAnimationFrame:id=>frames.delete(id)},old=new Map(Object.keys(globals).map(k=>[k,Object.getOwnPropertyDescriptor(globalThis,k)]));Object.entries(globals).forEach(([k,v])=>Object.defineProperty(globalThis,k,{value:v,writable:true,configurable:true}));
 const host=document.getElementById('host'),canvas=host.querySelector('canvas');
 return{host,canvas,gl,draws,images,frames,media,visibility,owned,deleted,
  advance(count,hz=60){for(let i=0;i<count;i++){now+=1000/hz;const work=[...frames.values()];frames.clear();work.forEach(fn=>fn(now));}},
  pointer(type,x,y){const event=new dom.window.MouseEvent(type,{clientX:x,clientY:y,bubbles:true});Object.defineProperties(event,{pointerId:{value:1},pointerType:{value:'touch'}});host.dispatchEvent(event);},
  key(key){host.dispatchEvent(new dom.window.KeyboardEvent('keydown',{key,bubbles:true,cancelable:true}));},
  lost(){const e=new dom.window.Event('webglcontextlost',{cancelable:true});canvas.dispatchEvent(e);assert.ok(e.defaultPrevented);},restored(){canvas.dispatchEvent(new dom.window.Event('webglcontextrestored'));},
  reduce(value){media.matches=value;mediaListeners.forEach(fn=>fn());},hide(value){hidden=value;document.dispatchEvent(new dom.window.Event('visibilitychange'));},
  clean(){assert.equal(frames.size,0);assert.equal(mediaListeners.size,0);assert.ok(sizes.every(o=>o.disconnected)&&visibility.every(o=>o.disconnected));assert.equal(deleted.size,owned.size,'every allocated GPU resource is released');assert.equal(canvas.width,0);assert.equal(host.dataset.ready,undefined);},
  close(){dom.window.close();for(const[k,v]of old){if(v)Object.defineProperty(globalThis,k,v);else delete globalThis[k];}}
 };
}

test('Kinetic words preserve explicit dual weights and wrap smoothly with inertia, reverse movement and idle autoplay',()=>{
 assert.equal(inkMath.kineticLetters(inkMath.inkshiftWords[0]).map(l=>l.char).join(''),'Motiqo');assert.equal(inkMath.kineticLetters('M**oti**on').filter(l=>l.weight===800).map(l=>l.char).join(''),'oti');assert.equal(inkMath.kineticWords(Array(20).fill('a'.repeat(100))).length,12);assert.equal(inkMath.kineticWords(['a'.repeat(100)])[0].length,64);assert.deepEqual(inkMath.kineticWords([' ']),[...inkMath.inkshiftWords]);
 const state={position:0,velocity:6,index:0,lastInput:0,lastCycle:0};for(let i=1;i<=90;i++)inkMath.kineticAdvance(state,1/60,i/60,5,false);assert.equal(state.index,1);assert.ok(state.velocity<.001);state.position=-1;inkMath.kineticAdvance(state,0,2,5,false);assert.equal(state.index,4);state.lastInput=4;assert.equal(inkMath.kineticAdvance(state,0,5,5,true),false);assert.equal(inkMath.kineticAdvance(state,0,9,5,true),true);assert.equal(state.index,0);
});

test('Native GL releases partially failed programs and framebuffers and supports idempotent disposal',()=>{
 const f=fixture();let gpu;
 try{gpu=native.createNativeGL(f.canvas);f.gl.failShader=true;assert.throws(()=>gpu.pass('invalid'),/compile/);f.gl.failShader=false;gpu.pass('void main(){fragColor=vec4(1.);}');f.gl.failTarget=true;assert.throws(()=>gpu.target(20,20,true),/renderable/);f.gl.failTarget=false;const target=gpu.target(20,20);gpu.release(target);gpu.release(target);gpu.dispose();gpu.dispose();assert.equal(f.deleted.size,f.owned.size);}finally{gpu?.dispose();f.close();}
});

test('Inkshift runs a feedback-free pressure pipeline, retains its renderer on controls, and suspends/disposes through visibility and context changes',async()=>{
 const f=fixture(),changes=[];let options={words:inkMath.inkshiftWords,vorticity:40,dissipation:.55,splatRadius:.12,threshold:.5,backgroundColor:'#0b0c10',foregroundColor:'#f3f2ed',autoCycle:true,paused:false},engine;
 try{
  const {createInkshiftEngine}=load('components/originals/inkshift-engine.ts',{'./native-gl':native,'./inkshift-math':inkMath,'./inkshift-shaders':load('components/originals/inkshift-shaders.ts')});engine=createInkshiftEngine(f.canvas,false,()=>options,(...args)=>changes.push(args));await Promise.resolve();await Promise.resolve();await Promise.resolve();assert.equal(f.host.dataset.ready,'true');
  const programs=[...f.owned].filter(o=>o.kind==='program').length;let start=f.draws.length;f.advance(120);const display=f.draws.slice(start).filter(d=>d.source.includes('abs(ink-text)'));assert.equal(display.length,120,'one rendered frame per 60Hz tick');const inkDoses=f.draws.slice(start).filter(draw=>draw.uniforms.uDye>0).map(draw=>draw.uniforms.uDye);assert.ok(inkDoses.length>100);assert.ok(Math.max(...inkDoses)<.1,'ink enters continuously rather than flashing as a large periodic splat');assert.equal(f.draws.slice(start).filter(d=>d.source.includes('(l+r+b+t-d)*.25')).length,120*18,'18 pressure iterations per frame');
  start=f.draws.length;f.advance(120,120);assert.equal(f.draws.slice(start).filter(d=>d.source.includes('abs(ink-text)')).length,60,'120Hz displays do not double simulation cost');
  options={...options,vorticity:70,dissipation:1.2};engine.sync();f.advance(1);assert.equal([...f.owned].filter(o=>o.kind==='program').length,programs);assert.ok(f.draws.slice(-35).some(d=>d.uniforms.uStrength===70));assert.ok(f.draws.slice(-35).some(d=>d.uniforms.uDecay===1.2));
  f.key('ArrowRight');f.advance(65);assert.ok(changes.some(c=>c[1]===true));options={...options,words:['one','two']};engine.sync();assert.equal(f.host.dataset.word,'0');
  options={...options,paused:true};engine.sync();assert.equal(f.frames.size,0);const frozen=f.host.dataset.fluidTime;f.advance(5);assert.equal(f.host.dataset.fluidTime,frozen);options={...options,paused:false};engine.sync();f.visibility[0].fn([{isIntersecting:false}]);assert.equal(f.frames.size,0);f.visibility[0].fn([{isIntersecting:true}]);assert.ok(f.frames.size);f.hide(true);assert.equal(f.frames.size,0);f.hide(false);
  f.lost();assert.equal(f.frames.size,0);assert.equal(f.host.dataset.ready,undefined);f.restored();assert.equal(f.host.dataset.ready,'true');f.reduce(true);assert.equal(f.frames.size,0);f.key('ArrowRight');assert.equal(f.host.dataset.word,'1','static reduced motion is still navigable');engine.dispose();engine.dispose();f.clean();
 }finally{engine?.dispose();f.close();}
});

test('Brush interpolation is bounded, fades in 0.8 seconds and uses one exact cover transform for a paired room',()=>{
 const points=[];brushMath.addBrushStroke(points,undefined,{x:0,y:0},64);brushMath.addBrushStroke(points,{x:0,y:0},{x:140,y:0},64);for(let i=1;i<points.length;i++)assert.ok(points[i].x-points[i-1].x<=64*.22);const initial=brushMath.brushRadius(points[0]);brushMath.ageBrush(points,.4,1);assert.ok(brushMath.brushRadius(points[0])<initial);brushMath.ageBrush(points,.4,1);assert.equal(points.length,0);for(let i=0;i<100;i++)brushMath.addBrushStroke(points,undefined,{x:i,y:i},60);assert.equal(points.length,32);brushMath.ageBrush(points,.4,2);assert.equal(points.length,0);assert.deepEqual(brushMath.coverUV(1600,900,1600,900),[1,1]);assert.deepEqual(brushMath.coverUV(400,800,1600,900),[.28125,1]);
});

test('A slow 60Hz Atelier sweep keeps a full fading trail without churning its point capacity',()=>{
 const points=[];let previous;
 for(let i=0;i<600;i++){
  brushMath.ageBrush(points,1/60,1);const next={x:150+72*Math.sin(i/60*Math.PI/6),y:110+32*Math.sin(i/60*Math.PI/3)};
  brushMath.addBrushStroke(points,previous,next,38);previous=next;
  assert.ok(points.length<20,'dense input coalesces rather than evicting still-visible brush points');assert.equal(points.at(-1).age,0);assert.ok(points.every(p=>Number.isFinite(brushMath.brushRadius(p))));
 }
});

test('Atelier waits for the aligned image pair, rejects stale loads, sleeps at rest and owns every resource across live images and context restoration',()=>{
 const f=fixture();let options={renderImage:'/media/atelier-room.webp',sketchImage:'',portalSize:1,brushSize:64,trailFadeSpeed:1,edgeRoughness:1,paused:false},engine;
 try{
  const {createAtelierEngine,pairedSketch}=load('components/originals/atelier-engine.ts',{'./native-gl':native,'./atelier-math':brushMath,'./atelier-shaders':load('components/originals/atelier-shaders.ts')});assert.equal(pairedSketch('/custom.webp',''),'');engine=createAtelierEngine(f.canvas,false,()=>options);assert.equal(f.images.length,2);f.images[0].onload();assert.equal(f.host.dataset.ready,undefined,'wait for the paired sketch');f.images[1].onload();assert.equal(f.host.dataset.ready,'true');assert.equal(f.frames.size,0,'the persistent portal needs no idle loop');
  f.pointer('pointermove',250,250);f.pointer('pointermove',390,310);assert.ok(+f.host.dataset.brushCount>1);f.advance(60);assert.equal(f.host.dataset.brushCount,'0');assert.equal(f.frames.size,0);f.key('ArrowRight');assert.ok(+f.host.dataset.brushCount>0);
  options={...options,paused:true};engine.sync();assert.equal(f.frames.size,0);const frozen=f.host.dataset.brushCount;f.advance(60);assert.equal(f.host.dataset.brushCount,frozen);options={...options,paused:false};engine.sync();f.reduce(true);assert.equal(f.host.dataset.brushCount,'0');assert.equal(f.frames.size,0);f.reduce(false);
  const programs=[...f.owned].filter(o=>o.kind==='program').length;options={...options,portalSize:1.3};engine.sync();assert.equal(f.images.length,2);assert.equal([...f.owned].filter(o=>o.kind==='program').length,programs);options={...options,renderImage:'/custom-one.webp'};engine.sync();const stale=f.images.at(-1).onload;options={...options,renderImage:'/custom-two.webp'};engine.sync();stale();assert.equal(f.host.dataset.ready,undefined);f.images.at(-1).onload();assert.equal(f.host.dataset.ready,'true','custom photos derive their sketch when none is supplied');
  f.pointer('pointermove',400,200);f.hide(true);assert.equal(f.frames.size,0);f.hide(false);assert.ok(f.frames.size);f.lost();assert.equal(f.frames.size,0);f.restored();f.images.at(-1).onload();assert.equal(f.host.dataset.ready,'true');engine.dispose();engine.dispose();assert.ok(f.images.every(i=>!i.onload&&!i.onerror&&i.src===''));f.clean();
 }finally{engine?.dispose();f.close();}
});

test('Both native components retain useful portable fallbacks and keyboard instructions without a GPU',()=>{
 const React=require('react'),{renderToStaticMarkup}=require('react-dom/server'),Inkshift=load('components/originals/inkshift.tsx',{'./inkshift-engine':{},'./inkshift-math':inkMath}).default,Atelier=load('components/originals/atelier.tsx',{'./atelier-engine':{atelierRender:'/room.webp',pairedSketch:()=>'/sketch.webp'}}).default;
 const ink=new JSDOM(renderToStaticMarkup(React.createElement(Inkshift))),atelier=new JSDOM(renderToStaticMarkup(React.createElement(Atelier)));try{assert.match(ink.window.document.querySelector('[role=group]').getAttribute('aria-label'),/arrow keys/);assert.equal(ink.window.document.querySelector('.inkshift-fallback>div').textContent,'Motiqo');assert.equal(atelier.window.document.querySelectorAll('img').length,2);assert.match(atelier.window.document.querySelector('[role=group]').getAttribute('aria-label'),/Escape/);assert.match(atelier.window.document.querySelector('style').textContent,/touch-action:pan-y/);}finally{ink.window.close();atelier.window.close();}
});

test('Compact Inkshift halves simulation updates and uses eight pressure passes; the full renderer keeps sixty updates and eighteen passes',async()=>{
 const engineModule=load('components/originals/inkshift-engine.ts',{'./native-gl':native,'./inkshift-math':inkMath,'./inkshift-shaders':load('components/originals/inkshift-shaders.ts')});
 for(const compact of [true,false]){
  const f=fixture();let engine;
  try{
   const options={words:inkMath.inkshiftWords,vorticity:40,dissipation:.55,splatRadius:.12,threshold:.5,backgroundColor:'#0b0c10',foregroundColor:'#f3f2ed',autoCycle:true,paused:false};
   engine=engineModule.createInkshiftEngine(f.canvas,compact,()=>options,()=>{});await Promise.resolve();await Promise.resolve();await Promise.resolve();
   const start=f.draws.length;f.advance(120);const draws=f.draws.slice(start),display=draws.filter(draw=>draw.source.includes('abs(ink-text)')),pressure=draws.filter(draw=>draw.source.includes('(l+r+b+t-d)*.25'));
   assert.equal(display.length,compact?60:120);assert.equal(pressure.length,display.length*(compact?8:18));assert.equal(f.host.dataset.ready,'true');
   engine.dispose();f.clean();
  }finally{engine?.dispose();f.close();}
 }
});
