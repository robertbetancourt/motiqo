const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),Module=require('node:module');
const ts=require('typescript-compiler-api'),React=require('react'),{JSDOM}=require('jsdom');
function load(file,mocks={}){const filename=path.resolve(__dirname,'..',file),m=new Module(filename,module);m.filename=filename;m.paths=Module._nodeModulePaths(path.dirname(filename));const normal=m.require.bind(m);m.require=id=>Object.hasOwn(mocks,id)?mocks[id]:normal(id);m._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText,filename);return m.exports;}
const motion=load('components/originals/voyage-motion.ts');
const Component=load('components/originals/voyage.tsx',{'./voyage-motion':motion}).default;
function environment(reduced=false,flat=false){
 const dom=new JSDOM('<div id="root"></div>',{url:'http://localhost',pretendToBeVisual:true}),old=new Map(),observers=[],frames=new Map(),listeners=new Set();let now=0,seq=0;
 const media={matches:reduced,addEventListener(_,fn){listeners.add(fn)},removeEventListener(_,fn){listeners.delete(fn)}};
 class Observer{constructor(fn){this.fn=fn;observers.push(this)}observe(){}disconnect(){this.disconnected=true}}
 const values={window:dom.window,document:dom.window.document,HTMLElement:dom.window.HTMLElement,IS_REACT_ACT_ENVIRONMENT:true,CSS:{supports:()=>!flat},matchMedia:()=>media,ResizeObserver:Observer,IntersectionObserver:Observer,requestAnimationFrame:fn=>{frames.set(++seq,fn);return seq},cancelAnimationFrame:id=>frames.delete(id)};
 for(const[k,v]of Object.entries(values)){old.set(k,Object.getOwnPropertyDescriptor(globalThis,k));Object.defineProperty(globalThis,k,{value:v,configurable:true,writable:true})}
 dom.window.matchMedia=()=>media;
 return{dom,observers,frames,listeners,media,advance(n=1,hz=60){for(let i=0;i<n;i++){now+=1000/hz;const batch=[...frames.values()];frames.clear();batch.forEach(fn=>fn(now))}},reduce(value){media.matches=value;for(const fn of listeners)fn()},close(){dom.window.close();for(const[k,v]of old){if(v)Object.defineProperty(globalThis,k,v);else delete globalThis[k]}}};
}
function fixture(env,count=8){const host=document.getElementById('root'),world=document.createElement('div');host.append(world);Object.defineProperties(host,{clientWidth:{value:880,configurable:true},clientHeight:{value:590,configurable:true}});const cards=Array.from({length:count},()=>{const el=document.createElement('button');world.append(el);return el});const options={paused:false,playing:false,speed:1,intensity:1,zoom:1},changes=[];const owner=motion.createVoyageMotion(host,world,cards,()=>options,i=>changes.push(i));return{host,world,cards,options,changes,owner};}


test('POV rail passes above the rim into the circle and returns continuously',()=>{
 const start=motion.voyageCamera(0,0),end=motion.voyageCamera(1,0),inside=motion.voyageCamera(.6,0),entry=motion.voyageCamera(.4,0);
 assert.deepEqual(start,end);assert.ok(start.distance>1000);assert.ok(inside.inside&&inside.distance<200);assert.ok(entry.eye[1]<-400);assert.ok(Math.hypot(...inside.target)>400);
 for(let p=0;p<1;p+=.005){const c=motion.voyageCamera(p,1);const view=motion.voyageView(c.eye,c.target);assert.ok(view.every(Number.isFinite));for(let row=0;row<3;row++)assert.ok(Math.abs(view[row]*c.eye[0]+view[4+row]*c.eye[1]+view[8+row]*c.eye[2]+view[12+row])<1e-8)}
});
test('autoplay travels inside and keeps running while dragging; lifecycle suspension releases frames',()=>{
 const env=environment();let f;try{f=fixture(env);f.options.playing=true;f.owner.sync();env.advance(36*60);assert.equal(env.frames.size,1);assert.ok(f.owner.position()>6);assert.match(f.world.style.transform,/matrix3d/);f.owner.dragging(true);f.owner.drag(.3);const phase=+f.host.dataset.phase;env.advance(20);assert.notEqual(+f.host.dataset.phase,phase);f.owner.dragging(false);
 f.options.paused=true;f.owner.sync();assert.equal(env.frames.size,0);f.options.paused=false;f.owner.sync();assert.equal(env.frames.size,1);env.observers[1].fn([{isIntersecting:false}]);assert.equal(env.frames.size,0);env.observers[1].fn([{isIntersecting:true}]);assert.equal(env.frames.size,1);
 }finally{f?.owner.dispose();assert.equal(env.frames.size,0);assert.equal(env.listeners.size,0);assert.ok(env.observers.every(x=>x.disconnected));env.close()}
});
test('markup contains curved image segments and no visible labels, logos, buttons or icons',()=>{
 const html=require('react-dom/server').renderToStaticMarkup(React.createElement(Component));const dom=new JSDOM(html),d=dom.window.document;assert.equal(d.querySelectorAll('.vg-strip').length,192);assert.equal(d.querySelectorAll('button,svg,header,footer,h2,h3').length,0);assert.equal(d.querySelectorAll('.vg-accessible-image').length,8);assert.ok(d.querySelector('.vg-scroll[tabindex="0"]'));assert.ok(!html.includes('A collection in motion'));assert.match(require('react-dom/server').renderToStaticMarkup(React.createElement(Component,{items:[]})),/No artwork/);dom.window.close();
});
test('component always autoplays, including with old false prop, and keyboard does not stop its clock',async()=>{
 const env=environment();let root;try{root=require('react-dom/client').createRoot(document.getElementById('root'));await React.act(async()=>root.render(React.createElement(Component,{autoPlay:false})));await React.act(async()=>env.advance(60));const host=document.querySelector('.voyage'),before=+host.dataset.cursor,viewport=document.querySelector('.vg-viewport');await React.act(async()=>{viewport.focus();viewport.dispatchEvent(new env.dom.window.KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true}));env.advance(180)});assert.ok(+host.dataset.cursor>before+1);assert.equal(env.frames.size,1);assert.equal(document.querySelectorAll('button').length,0);
 }finally{if(root)await React.act(async()=>root.unmount());assert.equal(env.frames.size,0);env.close()}
});
test('reduced motion shows one navigable image; replacement, unsafe images and failure remain useful',async()=>{
 const env=environment(true);let root;try{root=require('react-dom/client').createRoot(document.getElementById('root'));await React.act(async()=>root.render(React.createElement(Component)));await React.act(async()=>env.advance(2));assert.equal(env.frames.size,0);assert.equal(document.querySelectorAll('.vg-card[style*="visibility: visible"]').length,1);await React.act(async()=>{document.querySelector('.vg-viewport').dispatchEvent(new env.dom.window.KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true}));env.advance(1)});assert.equal(document.querySelectorAll('.vg-card')[1].dataset.active,'true');
 await React.act(async()=>root.render(React.createElement(Component,{items:[null,{title:'Safe',image:'javascript:alert(1)'}]})));assert.equal(document.querySelector('.vg-strip'),null);assert.match(document.querySelector('.vg-unavailable').textContent,/unavailable/);await React.act(async()=>root.render(React.createElement(Component,{items:[]})));assert.match(document.querySelector('[role=status]').textContent,/No artwork/);
 }finally{if(root)await React.act(async()=>root.unmount());assert.equal(env.frames.size,0);assert.equal(env.listeners.size,0);env.close()}
});
test('StrictMode cleans every observer and the registry puts Voyage first with no autoplay toggle',async()=>{
 const env=environment();let root;try{root=require('react-dom/client').createRoot(document.getElementById('root'));await React.act(async()=>root.render(React.createElement(React.StrictMode,null,React.createElement(Component))));assert.equal(env.observers.length,4);assert.ok(env.observers.slice(0,2).every(x=>x.disconnected));}finally{if(root)await React.act(async()=>root.unmount());assert.equal(env.frames.size,0);assert.ok(env.observers.every(x=>x.disconnected));env.close()}
 const m=require('../registry/manifest.json');assert.equal(m.items[0].id,'voyage');assert.ok(!m.items[0].controls.some(x=>['autoPlay','title','accentColor','textColor'].includes(x.key)));assert.equal(m.items[0].files.filter(x=>x.source.endsWith('.webp')).length,8);
 for(const url of ['javascript:alert(1)','data:image/svg+xml,x','//outside.test/a','/\\outside.test/a','http://outside.test/a'])assert.equal(motion.voyageImage(url),'');
});


test('scroll scrubs the POV in both directions and motion energy settles without an idle loop',()=>{
 const env=environment();let f;try{f=fixture(env);env.advance(2);assert.equal(env.frames.size,0);f.owner.scrub(.5);env.advance(10);assert.ok(+f.host.style.getPropertyValue('--vg-energy')>.1);env.advance(230);assert.ok(Math.abs(+f.host.dataset.travel-17)<.001);assert.equal(f.host.dataset.pov,'inside');assert.equal(env.frames.size,0);
 f.owner.scrub(-.5);env.advance(240);assert.ok(Math.abs(+f.host.dataset.travel)<.001);assert.equal(f.host.dataset.pov,'orbit');assert.equal(env.frames.size,0);f.owner.scrub(NaN);assert.equal(env.frames.size,0);
 }finally{f?.owner.dispose();assert.equal(env.frames.size,0);env.close()}
});
test('dust follows a deterministic cylindrical envelope and scroll speed lengthens its tangential wake',()=>{
 for(let i=0;i<56;i++){const a=motion.voyageDust(i,3,0),b=motion.voyageDust(i,3,1);assert.deepEqual(a,motion.voyageDust(i,3,0));assert.ok(Math.hypot(a.x,a.z)>=438&&Math.hypot(a.x,a.z)<548.01);assert.ok(Math.abs(a.y)<200);assert.ok(b.width>a.width&&b.opacity>a.opacity);assert.ok(Object.values(b).every(Number.isFinite))}
});
test('native scroll surface drives the camera, preserves browser wheel handling and decorative nodes are hidden from AT',async()=>{
 const env=environment();let root;try{root=require('react-dom/client').createRoot(document.getElementById('root'));await React.act(async()=>root.render(React.createElement(Component)));const scroll=document.querySelector('.vg-scroll');Object.defineProperties(scroll,{scrollHeight:{value:2400},clientHeight:{value:400}});await React.act(async()=>{scroll.scrollTop=1000;scroll.dispatchEvent(new env.dom.window.Event('scroll',{bubbles:false}));env.advance(180)});assert.equal(document.querySelector('.voyage').dataset.pov,'inside');assert.equal(document.querySelectorAll('.vg-particle').length,56);assert.equal(document.querySelectorAll('.vg-orbit-line').length,3);assert.equal(document.querySelector('.vg-decorations').getAttribute('aria-hidden'),'true');assert.ok(parseFloat(document.querySelector('.vg-particle').style.width)>=2);const wheel=new env.dom.window.WheelEvent('wheel',{deltaY:100,cancelable:true,bubbles:true});scroll.dispatchEvent(wheel);assert.equal(wheel.defaultPrevented,false);await React.act(async()=>{scroll.scrollTop=0;scroll.dispatchEvent(new env.dom.window.Event('scroll'));env.advance(180)});assert.equal(document.querySelector('.voyage').dataset.pov,'orbit');
 }finally{if(root)await React.act(async()=>root.unmount());assert.equal(env.frames.size,0);env.close()}
});
