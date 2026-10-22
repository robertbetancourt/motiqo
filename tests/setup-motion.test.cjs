const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),ts=require('typescript-compiler-api'),React=require('react'),{JSDOM}=require('jsdom');
function load(file,mocks={}){const filename=path.resolve(__dirname,'..',file),entry=new Module(filename,module);entry.filename=filename;entry.paths=Module._nodeModulePaths(path.dirname(filename));const normal=entry.require.bind(entry);entry.require=id=>mocks[id]??normal(id);entry._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText,filename);return entry.exports;}
const liquid=load('lib/liquid-selection-motion.ts'),orbit=load('lib/orbit-motion.ts');

test('Liquid stretches a connecting neck, detaches in either direction, and finishes as one exact capsule',()=>{
 for(const [from,to] of [[57,171],[171,57],[57,285],[285,57]]){
  const start=liquid.restingLiquid(from,114);
  assert.match(liquid.liquidBodyPath(start.head),/A19 19/,'resting ends are true semicircles');
  assert.equal(liquid.sampleLiquid(start,to,114,0),start);
  assert.notEqual(liquid.liquidNeckPath(liquid.sampleLiquid(start,to,114,.3)),'');
  const detached=liquid.sampleLiquid(start,to,114,.68);
  assert.equal(liquid.liquidNeckPath(detached),'');assert.ok(detached.tail.rx>1);
  assert.ok(Math.abs(detached.head.x-detached.tail.x)>detached.head.rx+detached.tail.rx,'the two masses visibly separate');
  for(let i=0;i<=100;i++){
   const frame=liquid.sampleLiquid(start,to,114,i/100);
   for(const mass of [frame.head,frame.tail]){assert.ok(mass.rx>=0&&mass.ry>=0);assert.ok(Object.values(mass).every(Number.isFinite));const shape=liquid.liquidBodyPath(mass);assert.doesNotMatch(shape,/NaN|Infinity|Q/);if(shape)assert.match(shape,/A/,'all moving masses retain circular end caps');}
  }
  assert.deepEqual(liquid.sampleLiquid(start,to,114,1),liquid.restingLiquid(to,114));
  const interrupted=liquid.sampleLiquid(start,to,114,.4);
  assert.equal(liquid.sampleLiquid(interrupted,from,114,0),interrupted,'retargeting begins at the current shape');
 }
});

test('Orbit follows with inertia, converges, banks in both directions and bounces inside viewport bounds',()=>{
 const bounds={left:0,right:600,top:0,bottom:500},state=()=>({x:300,y:250,vx:0,vy:0,roll:0,turn:0,turnV:0});
 for(const direction of [-1,1]){
  const s=state(),target={x:300+direction*180,y:160};orbit.stepOrbit(s,target,bounds,1/60);
  assert.ok(Math.abs(s.x-300)>0&&Math.abs(s.x-300)<5,'no teleport to target');assert.equal(Math.sign(s.roll),direction);
  for(let i=0;i<240;i++)orbit.stepOrbit(s,target,bounds,1/60);
  assert.ok(Math.abs(s.x-target.x)<.01&&Math.abs(s.y-target.y)<.01);
 }
 const s=state();s.x=599;s.vx=1200;s.turnV=210;
 assert.equal(orbit.stepOrbit(s,{x:600,y:250},bounds,1/60),true);assert.equal(s.x,600);assert.ok(s.vx<0);
 for(let i=0;i<200;i++){orbit.stepOrbit(s,{x:i%2?-1000:1000,y:1000},bounds,20);assert.ok(Object.values(s).every(Number.isFinite));assert.ok(s.x>=0&&s.x<=600&&s.y>=0&&s.y<=500);}
 const angle=orbit.angleToward(Math.PI-.02,-Math.PI+.02,.5);assert.ok(Math.abs(angle-Math.PI)<.001,'heading takes the short path across ±π');
});

test('Shared selector supports two or three options, follows rapid changes and resize without animation loops',async()=>{
 const dom=new JSDOM('<div id="mount"></div>',{pretendToBeVisual:true}),saved=new Map(),frames=new Map(),listeners=new Set();let serial=0,now=0;
 const media={matches:false,addEventListener:(_,fn)=>listeners.add(fn),removeEventListener:(_,fn)=>listeners.delete(fn)};dom.window.matchMedia=()=>media;
 for(const [key,value] of Object.entries({window:dom.window,document:dom.window.document,IS_REACT_ACT_ENVIRONMENT:true,requestAnimationFrame:fn=>{frames.set(++serial,fn);return serial;},cancelAnimationFrame:id=>frames.delete(id)})){saved.set(key,Object.getOwnPropertyDescriptor(globalThis,key));Object.defineProperty(globalThis,key,{value,configurable:true,writable:true});}
 const Component=load('components/liquid-selection.tsx',{'@/lib/liquid-selection-motion':liquid}).default,root=require('react-dom/client').createRoot(document.getElementById('mount'));
 const render=(selected,width=114)=>React.act(()=>root.render(React.createElement(Component,{selected,width}))),advance=async(ms)=>{await React.act(()=>{now+=ms;const jobs=[...frames.values()];frames.clear();jobs.forEach(fn=>fn(now));});};
 let mounted=true;
 try{
  await render(0);const indicator=document.querySelector('.segment-selection');assert.equal(indicator.getAttribute('aria-hidden'),'true');assert.equal(document.querySelector('svg'),null);
  await render(2);assert.equal(indicator.style.transform,'translate3d(228px,0,0)');
  await render(1,137);assert.equal(indicator.style.width,'137px');assert.equal(indicator.style.transform,'translate3d(137px,0,0)','Saved uses its actual two-option geometry');
  await render(0,90);assert.equal(indicator.style.transform,'translate3d(0px,0,0)');assert.equal(frames.size,0);assert.equal(listeners.size,0);
  await React.act(()=>root.unmount());mounted=false;assert.equal(frames.size,0);
 }finally{if(mounted)await React.act(()=>root.unmount());dom.window.close();for(const [key,value] of saved){if(value)Object.defineProperty(globalThis,key,value);else delete globalThis[key];}}
});
