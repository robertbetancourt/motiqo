const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const Module=require('node:module');
const ts=require('typescript');
const React=require('react');
const {JSDOM}=require('jsdom');
function load(relative,overrides={}){
  const filename=path.resolve(__dirname,relative),entry=new Module(filename,module);
  entry.filename=filename;entry.paths=Module._nodeModulePaths(path.dirname(filename));
  const normal=entry.require.bind(entry);entry.require=name=>overrides[name]||normal(name);
  entry._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022},fileName:filename}).outputText,filename);
  return entry.exports;
}

test('Liquid Form has a static fallback; Glow Nav interpolates selection and releases its resources',async()=>{
  const dom=new JSDOM('<div id="mount"></div>',{pretendToBeVisual:true,url:'http://localhost'});
  const frames=new Map(),mediaListeners=new Set();let frameId=0,disconnected=0;
  const media={matches:false,addEventListener:(_,fn)=>mediaListeners.add(fn),removeEventListener:(_,fn)=>mediaListeners.delete(fn)};
  class Size{constructor(fn){this.fn=fn;}observe(){this.fn();}disconnect(){disconnected++;}}
  dom.window.HTMLCanvasElement.prototype.getContext=()=>null;
  const globals={window:dom.window,document:dom.window.document,HTMLElement:dom.window.HTMLElement,
    IS_REACT_ACT_ENVIRONMENT:true,matchMedia:()=>media,ResizeObserver:Size,
    requestAnimationFrame:fn=>{frames.set(++frameId,fn);return frameId;},cancelAnimationFrame:id=>frames.delete(id)};
  const original=new Map(Object.keys(globals).map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)]));
  Object.entries(globals).forEach(([key,value])=>Object.defineProperty(globalThis,key,{value,writable:true,configurable:true}));
  const root=require('react-dom/client').createRoot(document.getElementById('mount'));let mounted=true;
  try{
    const Sculpture=load('../components/originals/liquid-form.tsx',{'./liquid-form-shaders':load('../components/originals/liquid-form-shaders.ts')}).default;
    await React.act(()=>root.render(React.createElement(Sculpture)));
    assert.equal(document.querySelector('.liquid-form').tabIndex,0);
    assert.equal(document.querySelector('.liquid-form').dataset.ready,undefined);
    assert.ok(document.querySelector('.lf-fallback'));assert.equal(document.querySelector('img'),null);
    assert.equal(frames.size,0,'unsupported WebGL schedules no work');
    const Nav=load('../components/originals/glow-nav.tsx').default;
    await React.act(()=>root.render(React.createElement(Nav)));
    assert.equal(document.querySelector('canvas'),null);assert.equal(mediaListeners.size,1);
    assert.deepEqual([...document.querySelectorAll('a')].map(a=>a.textContent),['Home','Projects','Search','Settings']);
    const nav=document.querySelector('nav'),links=[...nav.querySelectorAll('a')];
    nav.getBoundingClientRect=()=>({left:0,top:0,width:800,height:60});
    links.forEach((link,i)=>link.getBoundingClientRect=()=>({left:200*i,top:0,width:180,height:60}));
    await React.act(()=>links[3].click());assert.equal(links[3].getAttribute('aria-current'),'page');assert.equal(dom.window.location.hash,'');
    assert.ok(parseFloat(nav.style.getPropertyValue('--gn-x'))!==594,'highlight does not jump to the target');
    await React.act(()=>nav.dispatchEvent(new dom.window.MouseEvent('pointermove',{clientX:650,bubbles:true})));
    let now=performance.now();for(let i=0;i<120&&frames.size;i++){now+=1000/60;const batch=[...frames.values()];frames.clear();batch.forEach(fn=>fn(now));}
    assert.ok(parseFloat(nav.style.getPropertyValue('--gn-spot'))>80);assert.ok(Math.abs(parseFloat(nav.style.getPropertyValue('--gn-x'))-594)<.02);assert.equal(frames.size,0);
    await React.act(()=>root.render(React.createElement(Nav,{paused:true})));assert.equal(frames.size,0);
    await React.act(()=>root.unmount());mounted=false;assert.equal(frames.size,0);assert.equal(mediaListeners.size,0);assert.equal(disconnected,1);
  }finally{if(mounted)await React.act(()=>root.unmount());dom.window.close();for(const[key,value]of original){if(value)Object.defineProperty(globalThis,key,value);else delete globalThis[key];}}
});

test('Liquid Form reuses its canvas safely in React StrictMode and updates GPU uniforms without leaking',async()=>{
  const dom=new JSDOM('<div id="mount"></div>',{pretendToBeVisual:true});const frames=new Map(),mediaListeners=new Set(),uniforms=new Map();let frameId=0,programs=0,buffers=0,deletedPrograms=0,deletedBuffers=0,disconnected=0,lost=false,draws=0;
  const gl={VERTEX_SHADER:35633,FRAGMENT_SHADER:35632,COMPILE_STATUS:35713,LINK_STATUS:35714,ARRAY_BUFFER:34962,STATIC_DRAW:35044,FLOAT:5126,TRIANGLE_STRIP:5,
    createProgram:()=>{programs++;return {};},createShader:()=>({}),shaderSource(){},compileShader(){},getShaderParameter:()=>!lost,attachShader(){},linkProgram(){},getProgramParameter:()=>true,useProgram(){},
    createBuffer:()=>{buffers++;return {};},bindBuffer(){},bufferData(){},getAttribLocation:()=>0,enableVertexAttribArray(){},vertexAttribPointer(){},deleteShader(){},getUniformLocation:(_,name)=>name,viewport(){},
    uniform1f:(name,value)=>uniforms.set(name,value),uniform2f(){},uniform3f(){},drawArrays:()=>draws++,isContextLost:()=>lost,deleteBuffer:()=>deletedBuffers++,deleteProgram:()=>deletedPrograms++,
    getExtension:()=>({loseContext:()=>{lost=true;}})};
  dom.window.HTMLCanvasElement.prototype.getContext=()=>gl;
  dom.window.HTMLElement.prototype.getBoundingClientRect=()=>({left:0,top:0,width:640,height:480});
  const media={matches:false,addEventListener:(_,fn)=>mediaListeners.add(fn),removeEventListener:(_,fn)=>mediaListeners.delete(fn)};
  class Size{constructor(fn){this.fn=fn;}observe(){this.fn();}disconnect(){disconnected++;}}
  class Visible{constructor(fn){this.fn=fn;}observe(){this.fn([{isIntersecting:true}]);}disconnect(){disconnected++;}}
  const globals={window:dom.window,document:dom.window.document,HTMLElement:dom.window.HTMLElement,IS_REACT_ACT_ENVIRONMENT:true,matchMedia:()=>media,ResizeObserver:Size,IntersectionObserver:Visible,requestAnimationFrame:fn=>{frames.set(++frameId,fn);return frameId;},cancelAnimationFrame:id=>frames.delete(id)};
  const old=new Map(Object.keys(globals).map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)]));Object.entries(globals).forEach(([key,value])=>Object.defineProperty(globalThis,key,{value,writable:true,configurable:true}));
  const root=require('react-dom/client').createRoot(document.getElementById('mount'));let mounted=true;
  try{
    const Form=load('../components/originals/liquid-form.tsx',{'./liquid-form-shaders':load('../components/originals/liquid-form-shaders.ts')}).default;
    await React.act(()=>root.render(React.createElement(React.StrictMode,null,React.createElement(Form))));
    assert.equal(programs,2,'development replays initialization');assert.equal(document.querySelector('.liquid-form').dataset.ready,'true');assert.equal(lost,false,'cleanup leaves a reusable context');
    await React.act(()=>root.render(React.createElement(React.StrictMode,null,React.createElement(Form,{shape:'bloom',scale:1.2,paused:true}))));
    assert.equal(uniforms.get('shape'),2);assert.equal(uniforms.get('scale'),1.2);assert.equal(programs,2,'properties update without rebuilding shaders');assert.equal(frames.size,0);assert.ok(draws>1);
    await React.act(()=>root.unmount());mounted=false;assert.equal(deletedPrograms,programs);assert.equal(deletedBuffers,buffers);assert.equal(mediaListeners.size,0);assert.equal(frames.size,0);assert.equal(disconnected,4);
  }finally{if(mounted)await React.act(()=>root.unmount());dom.window.close();for(const[key,value]of old){if(value)Object.defineProperty(globalThis,key,value);else delete globalThis[key];}}
});
