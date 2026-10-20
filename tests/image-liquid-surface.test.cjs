const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');const path=require('node:path');const Module=require('node:module');const ts=require('typescript');const {JSDOM}=require('jsdom');
function load(relative,overrides={}){const filename=path.resolve(__dirname,relative),entry=new Module(filename,module);entry.filename=filename;entry.paths=Module._nodeModulePaths(path.dirname(filename));const normal=entry.require.bind(entry);entry.require=name=>overrides[name]||normal(name);entry._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText,filename);return entry.exports;}
const shaders=load('../components/ui/liquid-particle-shaders.ts'),wake=load('../components/ui/liquid-material-wake.ts');const {LiquidEngine}=load('../components/ui/liquid-particle-engine.ts',{'./liquid-particle-shaders':shaders,'./liquid-material-wake':wake});
const opts={interactive:true,strength:1,radius:220,density:.15,dotSize:1,spread:1,turbulence:1,returnSpeed:1,streaks:true,restStyle:'image',ambient:false,ambientIntensity:0,speed:1,intro:false,reducedMotion:false,bg:[.04,.06,.06],imgBg:null,liquid:1};

test('material wake follows the stroke direction, persists behind the cursor, stays bounded and fully relaxes',()=>{
 const field=new wake.MaterialWake(),sample=new Float32Array(3),options={...opts,radius:80,turbulence:0};
 field.step(1/60,640,480,180,220,320,220,1,false,options,0);
 field.sample(240,220,640,480,sample);assert.ok(sample[0]>30);assert.ok(Math.abs(sample[1])<1);assert.ok(sample[2]>.4,'a fast stroke releases material along its path');
 field.step(1/60,640,480,500,400,540,400,1,false,options,.02);
 field.sample(240,220,640,480,sample);assert.ok(sample[0]>25,'the deformation remains after the pointer moves away');
 for(let i=0;i<180;i++)field.step(1/60,640,480,180,220,600,220,1,true,{...options,strength:2,liquid:2,spread:2},i/60);
 assert.ok(field.state.every(Number.isFinite));assert.ok(field.activity<=126);
 for(let i=0;i<500;i++)field.step(1/60,640,480,600,220,600,220,0,false,options,i/60);
 assert.equal(field.activity,0);assert.ok(field.state.every(v=>v===0));
 const quiet=new wake.MaterialWake();quiet.step(1/60,640,480,10,10,400,300,1,true,{...options,strength:0},0);assert.equal(quiet.activity,0,'zero response leaves the image untouched');
});
function gpu({float=true,failShader=0,incomplete=false}={}){
  let serial=0,compiled=0;const live=new Set(),uniforms=new Map(),calls={parts:0,image:0,lost:0};let active;
  const make=kind=>{const resource={kind,id:++serial};live.add(resource);return resource;};
  const free=resource=>{if(resource)assert.ok(live.delete(resource),'each GPU allocation is released exactly once');};
  const gl={COMPILE_STATUS:1,LINK_STATUS:2,ACTIVE_UNIFORMS:3,FRAMEBUFFER_COMPLETE:4,VERTEX_SHADER:5,FRAGMENT_SHADER:6,POINTS:7,TRIANGLES:8,
    createProgram:()=>make('program'),createShader:()=>make('shader'),shaderSource:(shader,source)=>shader.source=source,compileShader:shader=>shader.compilation=++compiled,getShaderParameter:shader=>shader.compilation!==failShader,getShaderInfoLog:()=>'',attachShader:(program,shader)=>(program.shaders??=[]).push(shader),bindAttribLocation(){},linkProgram:program=>{program.uniforms=[...new Set(program.shaders.flatMap(shader=>[...shader.source.matchAll(/uniform\s+\w+\s+(\w+)\s*;/g)].map(match=>match[1])))];},getProgramParameter:(program,key)=>key===3?program.uniforms.length:true,getActiveUniform:(program,i)=>({name:program.uniforms[i]}),getUniformLocation:(_,name)=>name,getProgramInfoLog:()=>'',deleteShader:free,deleteProgram:free,
    createBuffer:()=>make('buffer'),createVertexArray:()=>make('vao'),createTexture:()=>make('texture'),createFramebuffer:()=>make('framebuffer'),deleteBuffer:free,deleteVertexArray:free,deleteTexture:free,deleteFramebuffer:free,
    bindVertexArray(){},bindBuffer(){},bufferData(){},enableVertexAttribArray(){},vertexAttribPointer(){},vertexAttribDivisor(){},bindTexture(){},pixelStorei(){},texImage2D(){},texParameteri(){},bindFramebuffer(){},framebufferTexture2D(){},viewport(){},clearColor(){},clear(){},generateMipmap(){},activeTexture(){},disable(){},enable(){},blendFunc(){},checkFramebufferStatus:()=>incomplete?0:4,
    useProgram:program=>active=program,uniform1i(){},uniform1f:(name,value)=>uniforms.set(name,value),uniform2f:(name,x,y)=>uniforms.set(name,[x,y]),uniform3f(){},uniform4f(){},drawArrays:(mode,_,n)=>{if(mode===7){calls.parts++;calls.count=n;}else calls.image++;},drawArraysInstanced:(_,__,___,n)=>{calls.parts++;calls.count=n;},getExtension:name=>name==='WEBGL_lose_context'?{loseContext:()=>calls.lost++}:float?{}:null};
  return {gl,live,uniforms,calls};
}
function setup(){
  const dom=new JSDOM('<div id="host"><canvas></canvas></div><div id="mount"></div>',{pretendToBeVisual:true});let now=1000,serial=0;const frames=new Map(),contexts=[],images=[],mediaListeners=new Set();
  const media={matches:false,addEventListener:(_,fn)=>mediaListeners.add(fn),removeEventListener:(_,fn)=>mediaListeners.delete(fn)};
  Object.defineProperty(dom.window.HTMLElement.prototype,'clientWidth',{get:()=>640});Object.defineProperty(dom.window.HTMLElement.prototype,'clientHeight',{get:()=>480});dom.window.HTMLElement.prototype.getBoundingClientRect=()=>({left:0,top:0,width:640,height:480});
  dom.window.HTMLCanvasElement.prototype.getContext=function(type){if(type==='webgl2'){const context=gpu();contexts.push(context);return context.gl;}return {drawImage(){},getImageData:()=>{const data=new Uint8ClampedArray(this.width*this.height*4);for(let i=0;i<data.length;i+=4){if(i/4%5===0){data[i]=190;data[i+1]=205;data[i+2]=192;data[i+3]=255;}}return {data};}};};
  class Bitmap{naturalWidth=16;naturalHeight=16;onload=null;onerror=null;set src(value){this.url=value;images.push(this);}}
  let disconnected=0;class Resize{constructor(fn){this.fn=fn;}observe(){this.fn();}disconnect(){disconnected++;}}class Visible{constructor(fn){this.fn=fn;}observe(){this.fn([{isIntersecting:true}]);}disconnect(){disconnected++;}}
  const globals={window:dom.window,document:dom.window.document,navigator:{hardwareConcurrency:8,userAgent:dom.window.navigator.userAgent},HTMLElement:dom.window.HTMLElement,Image:Bitmap,matchMedia:()=>media,ResizeObserver:Resize,IntersectionObserver:Visible,performance:{now:()=>now},IS_REACT_ACT_ENVIRONMENT:true,requestAnimationFrame:fn=>{frames.set(++serial,fn);return serial;},cancelAnimationFrame:id=>frames.delete(id)};
  const old=new Map(Object.keys(globals).map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)]));Object.entries(globals).forEach(([key,value])=>Object.defineProperty(globalThis,key,{value,writable:true,configurable:true}));dom.window.matchMedia=()=>media;
  const advance=(steps=700)=>{for(let i=0;i<steps&&frames.size;i++){now+=1000/60;const batch=[...frames.values()];frames.clear();batch.forEach(fn=>fn(now));}};
  return {dom,frames,contexts,images,media,mediaListeners,advance,disconnected:()=>disconnected,close(){dom.window.close();for(const[key,value]of old){if(value)Object.defineProperty(globalThis,key,value);else delete globalThis[key];}}};
}

test('material engine renders filaments, settles, pauses, respects reduced motion and disposes GPU resources',()=>{
  const env=setup(),context=gpu(),canvas=document.querySelector('canvas');canvas.getContext=()=>context.gl;let instance;
  try{
    instance=new LiquidEngine(canvas,{...opts},()=>assert.fail('unexpected GPU failure'));instance.resize(640,480,{x:80,y:0,w:480,h:480});instance.setImage({naturalWidth:16,naturalHeight:16});env.advance();assert.equal(env.frames.size,0);assert.ok(instance.particleCount>900);
    instance.pointer('move',200,200,false);env.advance(2);instance.pointer('move',400,200,false);env.advance(1);assert.ok(instance.hand.x>200&&instance.hand.x<400,'pointer input interpolates instead of snapping');env.advance(80);assert.ok(context.calls.parts>0);assert.equal(context.calls.count,instance.particleCount);
    const deformed=Array.from(instance.positions);instance.setOptions({strength:1.2});instance.resize(640,480,{x:80,y:0,w:480,h:480});assert.deepEqual(Array.from(instance.positions),deformed,'live controls and unchanged layout retain the flowing material');
    instance.setOptions({paused:true});const drawn=context.calls.image;instance.pointer('move',10,10,false);env.advance();assert.equal(context.calls.image,drawn);assert.equal(env.frames.size,0);
    instance.setOptions({paused:false});instance.pointer('leave',0,0,false);env.advance();assert.equal(env.frames.size,0,'elastic return eventually sleeps');assert.equal(instance.hand.active,0);
    instance.pointer('move',350,180,false);env.advance(2);instance.setVisible(false);assert.equal(env.frames.size,0);instance.setVisible(true);assert.ok(env.frames.size>0);
    instance.setOptions({reducedMotion:true});const still=context.calls.image;instance.pointer('down',350,180,false);env.advance();assert.equal(context.calls.image,still);assert.equal(env.frames.size,0);assert.equal(instance.hand.active,0);
    instance.destroy();instance=null;assert.equal(context.live.size,0);assert.equal(context.calls.lost,1);assert.equal(env.frames.size,0);
    for(const options of [1,2,3,4].map(failShader=>({failShader}))){const failed=gpu(options);canvas.getContext=()=>failed.gl;assert.throws(()=>new LiquidEngine(canvas,{...opts},()=>{}));assert.equal(failed.live.size,0,'partial initialization frees allocated shaders/programs');}
    const fallback=gpu({float:false});canvas.getContext=()=>fallback.gl;instance=new LiquidEngine(canvas,{...opts},()=>{});instance.setImage({naturalWidth:16,naturalHeight:16});env.advance();assert.ok(fallback.calls.parts>0,'does not require floating-point texture extensions');
    canvas.dispatchEvent(new window.Event('webglcontextlost',{cancelable:true}));assert.equal(env.frames.size,0);
    canvas.dispatchEvent(new window.Event('webglcontextrestored'));env.advance();assert.ok(fallback.calls.parts>1);instance.destroy();instance=null;assert.equal(fallback.live.size,0);

  }finally{instance?.destroy();env.close();}
});

test('particle wrapper survives StrictMode, exports live options and cancels image/presentation work on unmount',async()=>{
  const env=setup(),React=require('react'),root=require('react-dom/client').createRoot(document.getElementById('mount'));let mounted=true;
  const Relic=load('../components/ui/image-liquid-surface.tsx',{'./liquid-particle-engine':{LiquidEngine}}).default;
  try{
    await React.act(()=>root.render(React.createElement(React.StrictMode,null,React.createElement(Relic))));assert.equal(env.contexts.length,2);assert.equal(env.contexts[0].live.size,0);assert.equal(env.images[0].onload,null,'obsolete image callbacks are detached');assert.equal(document.querySelectorAll('.lr-canvas').length,1);
    await React.act(()=>env.images.at(-1).onload());env.advance();assert.equal(document.querySelector('.image-liquid-surface').dataset.gl,'on');
    await React.act(()=>root.render(React.createElement(React.StrictMode,null,React.createElement(Relic,{paused:true,strength:1.5,restStyle:'particles'}))));assert.equal(env.contexts.length,2,'live options retain the engine');assert.equal(env.frames.size,0);assert.equal(env.contexts[1].uniforms.get('uRest'),1);
    await React.act(()=>root.unmount());mounted=false;assert.ok(env.contexts.every(context=>context.live.size===0));assert.equal(env.frames.size,0);assert.equal(env.mediaListeners.size,0);assert.equal(env.disconnected(),4);
  }finally{if(mounted)await React.act(()=>root.unmount());env.close();}
});

test('spring grains remain finite at maximum controls, return home and resample deterministically',()=>{
 const env=setup(),context=gpu(),canvas=document.querySelector('canvas');canvas.getContext=()=>context.gl;let instance;
 try{
  instance=new LiquidEngine(canvas,{...opts,strength:2,radius:600,spread:2,turbulence:2,liquid:2,speed:3,returnSpeed:.2},()=>{});
  instance.resize(640,480,{x:80,y:0,w:480,h:480});instance.setImage({naturalWidth:16,naturalHeight:16});env.advance();
  const home=Array.from(instance.positions),count=instance.particleCount;
  instance.pointer('down',320,240,true);env.advance(300);
  assert.ok(instance.positions.every(Number.isFinite));assert.ok(instance.velocities.every(Number.isFinite));
  assert.ok(instance.positions.some((value,i)=>i%4<2&&Math.abs(value-home[i])>1),'pointer forces move grains away from their anchors');
  instance.pointer('up',320,240,true);assert.equal(instance.target.active,0,'lifting a touch lets the material settle without requiring pointerleave');
  instance.pointer('leave',0,0,true);assert.equal(instance.target.x,instance.hand.x,'leaving never sweeps a ghost stroke to the corner');env.advance(2000);assert.equal(env.frames.size,0);assert.deepEqual(Array.from(instance.positions),home);
  instance.setOptions({density:.3});assert.ok(instance.particleCount>count);const anchors=Array.from(instance.anchors);
  instance.setImage({naturalWidth:16,naturalHeight:16});assert.deepEqual(Array.from(instance.anchors),anchors);
  instance.destroy();instance.destroy();instance=null;assert.equal(context.live.size,0);assert.equal(context.calls.lost,1);
 }finally{instance?.destroy();env.close();}
});
