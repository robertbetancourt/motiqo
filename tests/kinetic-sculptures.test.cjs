const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const Module=require('node:module');
const ts=require('typescript');
const React=require('react');
const {JSDOM}=require('jsdom');
const cache=new Map();
function load(name){
  if(cache.has(name))return cache.get(name);
  const file=path.resolve(__dirname,'../components/originals',name),entry=new Module(file,module);
  entry.filename=file;entry.paths=Module._nodeModulePaths(path.dirname(file));
  const normal=entry.require.bind(entry);
  entry.require=name=>name.startsWith('./line-')?load(name.slice(2)+(name==='./line-scene'?'.tsx':'.ts')):normal(name);
  entry._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText,file);
  cache.set(name,entry.exports);return entry.exports;
}
test('Gyro, Lantern and Relay have solid depth, respond, settle and release every animation resource',async()=>{
  const dom=new JSDOM('<div id="mount"></div>',{pretendToBeVisual:true,url:'http://localhost'});
  const frames=new Map(),mediaListeners=new Set(),observers=[];let serial=0,now=1000,disconnected=0;
  const media={matches:false,addEventListener:(_,fn)=>mediaListeners.add(fn),removeEventListener:(_,fn)=>mediaListeners.delete(fn)};
  class Visibility{constructor(fn){this.fn=fn;observers.push(this);}observe(){this.fn([{isIntersecting:true}]);}disconnect(){disconnected++;}}
  class Size{constructor(fn){this.fn=fn;}observe(){this.fn([{contentRect:{width:640}}]);}disconnect(){disconnected++;}}
  const globals={window:dom.window,document:dom.window.document,HTMLElement:dom.window.HTMLElement,IS_REACT_ACT_ENVIRONMENT:true,
    matchMedia:()=>media,requestAnimationFrame:fn=>{frames.set(++serial,fn);return serial;},cancelAnimationFrame:id=>frames.delete(id),IntersectionObserver:Visibility,ResizeObserver:Size,performance:{now:()=>now}};
  const old=new Map(Object.keys(globals).map(k=>[k,Object.getOwnPropertyDescriptor(globalThis,k)]));
  Object.entries(globals).forEach(([k,value])=>Object.defineProperty(globalThis,k,{value,writable:true,configurable:true}));
  const root=require('react-dom/client').createRoot(document.getElementById('mount'));let mounted=true;
  const advance=(n=500)=>{for(let i=0;i<n&&frames.size;i++){now+=1000/60;const batch=[...frames.values()];frames.clear();batch.forEach(fn=>fn(now));}};
  const pointer=(host,type,x=410,y=160)=>{const e=new dom.window.MouseEvent(type,{clientX:x,clientY:y});Object.defineProperty(e,'pointerType',{value:'mouse'});host.dispatchEvent(e);};
  const paths=()=>[...document.querySelectorAll('path')].map(p=>p.getAttribute('d'));
  const prepare=()=>{const host=document.querySelector('.line-stage');host.querySelector('svg').getBoundingClientRect=()=>({left:0,top:0,width:640,height:440});return host;};
  try{
    const Gyro=load('gyro.tsx').default;
    await React.act(()=>root.render(React.createElement(Gyro)));let host=prepare();advance();
    assert.ok(document.querySelectorAll('[data-solid-face]').length>600);
    assert.ok(document.querySelectorAll('[data-solid-face][visibility="hidden"]').length>100,'back faces are culled');
    const rest=paths();pointer(host,'pointermove');advance(90);assert.notDeepEqual(paths(),rest);
    const angle=document.querySelector('[data-gyro-angle]').getAttribute('data-gyro-angle').split(',').map(Number);assert.ok(angle[0]>.4&&angle[1]>.3);
    pointer(host,'pointerleave');advance();assert.equal(frames.size,0,'mechanism sleeps at rest');
    host.dispatchEvent(new dom.window.KeyboardEvent('keydown',{key:' '}));advance();
    assert.ok(Math.abs(Number(document.querySelector('[data-gyro-angle]').getAttribute('data-gyro-angle').split(',')[2])-Math.PI/2)<.001);
    pointer(host,'pointerleave');advance();
    pointer(host,'pointermove');advance(2);observers.at(-1).fn([{isIntersecting:false}]);assert.equal(frames.size,0);
    observers.at(-1).fn([{isIntersecting:true}]);assert.ok(frames.size>0);
    await React.act(()=>root.render(React.createElement(Gyro,{paused:true})));advance(2);const paused=paths();pointer(host,'pointermove',200,300);advance(60);assert.deepEqual(paths(),paused);assert.equal(frames.size,0);
    await React.act(()=>root.render(React.createElement(Gyro)));media.matches=true;mediaListeners.forEach(fn=>fn());advance(2);const still=paths();pointer(host,'pointermove');advance(60);assert.deepEqual(paths(),still);assert.equal(frames.size,0);
    assert.ok(paths().every(d=>!d||!/NaN|Infinity/.test(d)));
    media.matches=false;
    const Lantern=load('lantern.tsx').default;
    await React.act(()=>root.render(React.createElement(Lantern)));host=prepare();advance();
    assert.equal(document.querySelectorAll('[data-vane]').length,8);
    const closed=paths(),dark=Number(document.querySelector('[data-lantern-light]').getAttribute('opacity'));
    pointer(host,'pointermove',320,210);advance(120);
    assert.notDeepEqual(paths(),closed);
    assert.ok([...document.querySelectorAll('[data-vane]')].every(v=>Number(v.getAttribute('data-open'))>.65));
    assert.ok(Number(document.querySelector('[data-lantern-light]').getAttribute('opacity'))>dark+.5);
    host.dispatchEvent(new dom.window.KeyboardEvent('keydown',{key:'Enter'}));pointer(host,'pointerleave');advance();
    assert.ok(Number(document.querySelector('[data-lantern-open]').getAttribute('data-lantern-open'))>.99,'pin holds the lantern open');
    assert.equal(frames.size,0,'held-open lantern sleeps');
    host.dispatchEvent(new dom.window.KeyboardEvent('keydown',{key:'Enter'}));pointer(host,'pointerleave');advance();
    assert.ok([...document.querySelectorAll('[data-vane]')].every(v=>Number(v.getAttribute('data-open'))<.001));
    assert.equal(frames.size,0);
    await React.act(()=>root.render(React.createElement(Lantern,{paused:true})));advance(2);const held=paths();pointer(host,'pointermove',320,210);advance(60);assert.deepEqual(paths(),held);
    await React.act(()=>root.render(React.createElement(Lantern)));media.matches=true;mediaListeners.forEach(fn=>fn());advance(2);const reduced=paths();pointer(host,'pointermove',320,210);advance(60);assert.deepEqual(paths(),reduced);assert.equal(frames.size,0);
    assert.ok(paths().every(d=>!d||!/NaN|Infinity/.test(d)));
    media.matches=false;
    const Relay=load('relay.tsx').default;
    await React.act(()=>root.render(React.createElement(Relay)));host=prepare();advance();
    assert.equal(document.querySelectorAll('[data-lever]').length,5);
    host.dispatchEvent(new dom.window.KeyboardEvent('keydown',{key:'End'}));advance(120);
    assert.ok(Number(document.querySelector('[data-lever="4"]').getAttribute('data-tilt'))>.2);
    assert.ok(Number(document.querySelector('[data-lever="0"]').getAttribute('data-tilt'))<.001);
    host.dispatchEvent(new dom.window.KeyboardEvent('keydown',{key:' '}));pointer(host,'pointerleave');advance(12);
    const pulses=()=>[...document.querySelectorAll('[data-lever]')].map(el=>Number(el.getAttribute('data-pulse')));
    let pulse=pulses();assert.ok(pulse[4]>.7&&pulse[3]>0&&pulse[0]===0,'pulse starts at the selected rocker');
    advance(45);pulse=pulses();assert.ok(pulse[0]>.7&&pulse[4]===0,'pulse reaches the distant rocker later');
    advance();assert.ok([...document.querySelectorAll('[data-lever]')].every(el=>Math.abs(Number(el.getAttribute('data-tilt')))<.001));assert.equal(frames.size,0);
    pointer(host,'pointerdown',320,230);pointer(host,'pointerup',320,230);advance(2);
    observers.at(-1).fn([{isIntersecting:false}]);assert.equal(frames.size,0);observers.at(-1).fn([{isIntersecting:true}]);assert.ok(frames.size>0);
    await React.act(()=>root.render(React.createElement(Relay,{paused:true})));advance(2);const frozen=paths();advance(60);assert.deepEqual(paths(),frozen);assert.equal(frames.size,0);
    await React.act(()=>root.render(React.createElement(Relay)));media.matches=true;mediaListeners.forEach(fn=>fn());advance(2);const reducedRelay=paths();pointer(host,'pointerdown');pointer(host,'pointerup');advance(60);assert.deepEqual(paths(),reducedRelay);assert.equal(frames.size,0);
    assert.ok(paths().every(d=>!d||!/NaN|Infinity/.test(d)));
    await React.act(()=>root.unmount());mounted=false;assert.equal(frames.size,0);assert.equal(mediaListeners.size,0);assert.equal(disconnected,6);
  }finally{if(mounted)await React.act(()=>root.unmount());dom.window.close();for(const [k,desc]of old){if(desc)Object.defineProperty(globalThis,k,desc);else delete globalThis[k];}}
});
