const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),ts=require('typescript-compiler-api');
const React=require('react'),{JSDOM}=require('jsdom');
function load(file,mocks={}){const filename=path.resolve(__dirname,'..',file),m=new Module(filename,module);m.filename=filename;m.paths=Module._nodeModulePaths(path.dirname(filename));const normal=m.require.bind(m);m.require=id=>Object.hasOwn(mocks,id)?mocks[id]:normal(id);m._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText,filename);return m.exports;}
const shaders=load('components/originals/elastic-showcase-shaders.ts');
const source=load('components/originals/elastic-showcase-engine.ts',{'./elastic-showcase-shaders':shaders});
function environment(){const dom=new JSDOM('<div id="root"></div>',{url:'http://localhost',pretendToBeVisual:true}),old=new Map(),observers=[],frames=new Map();let now=0,seq=0;const media={matches:false,addEventListener(){},removeEventListener(){}};class Observer{constructor(fn){this.fn=fn;observers.push(this)}observe(){}disconnect(){this.disconnected=true}}
 const values={window:dom.window,document:dom.window.document,HTMLElement:dom.window.HTMLElement,IS_REACT_ACT_ENVIRONMENT:true,matchMedia:()=>media,ResizeObserver:Observer,IntersectionObserver:Observer,requestAnimationFrame:fn=>{frames.set(++seq,fn);return seq},cancelAnimationFrame:id=>frames.delete(id)};
 for(const[k,v]of Object.entries(values)){old.set(k,Object.getOwnPropertyDescriptor(globalThis,k));Object.defineProperty(globalThis,k,{value:v,configurable:true,writable:true})}
 return {dom,observers,frames,media,advance(n=1){for(let i=0;i<n;i++){now+=1000/60;const batch=[...frames.values()];frames.clear();batch.forEach(fn=>fn(now))}},close(){dom.window.close();for(const[k,v]of old){if(v)Object.defineProperty(globalThis,k,v);else delete globalThis[k]}}};}

test('elastic clock wraps, rejects reentry and invalid targets, freezes and finishes at equal elapsed time',()=>{
 const clock=source.elasticClock(5);assert.equal(clock.go(NaN),false);assert.equal(clock.go(0),false);assert.equal(clock.go(-1),true);assert.equal(clock.next,4);assert.equal(clock.go(2),false);
 assert.equal(clock.advance(550,1100),.5);assert.equal(clock.advance(60000,1100,true),.5);assert.equal(clock.advance(550,1100),1);assert.equal(clock.current,4);assert.equal(clock.moving,false);
 for(const hz of [30,60,120]){const c=source.elasticClock(5);c.go(1);for(let i=0;i<hz;i++)c.advance(1000/hz,1000);assert.ok(!c.moving||c.advance(.01,1000)===1);assert.equal(c.current,1)}
 assert.equal(source.elasticClock(1).go(1),false);assert.equal(source.elasticClock(0).go(1),false);
});
test('image inputs reject executable, implicit-host and credential URLs; timing bounds reject nonfinite values',()=>{
 for(const value of ['javascript:alert(1)','data:image/svg+xml,test','//outside.test/a','http://outside.test/a','https://user:password@outside.test/a',null,'/\\outside.test/a'])assert.equal(source.safeImage(value),'');
 assert.equal(source.safeImage('/media/local.webp'),'/media/local.webp');assert.equal(source.safeImage('https://example.com/a.webp'),'https://example.com/a.webp');assert.equal(source.bounded(Infinity,1100,200,5000),1100);assert.equal(source.bounded(-2,1100,200,5000),200);
});
test('standalone markup contains named thumbnail controls, semantic status, unique filters and an empty state',()=>{
 const Component=load('components/originals/elastic-showcase.tsx',{'./elastic-showcase-engine':source}).default,{renderToStaticMarkup}=require('react-dom/server');
 const html=renderToStaticMarkup(React.createElement('div',null,React.createElement(Component),React.createElement(Component))),dom=new JSDOM(html);
 const doc=dom.window.document;assert.equal(doc.querySelectorAll('button').length,10);assert.equal(doc.querySelectorAll('[aria-pressed=true]').length,2);assert.notEqual(...[...doc.querySelectorAll('filter')].map(x=>x.id));assert.ok(doc.querySelector('[aria-roledescription=carousel]'));assert.ok(doc.querySelector('.es-sr'));assert.ok(doc.querySelector('.es-fallback img'));
 assert.match(renderToStaticMarkup(React.createElement(Component,{items:[]})),/No projects to display/);dom.window.close();
});
test('no-GPU fallback remains keyboard/click navigable and handles replacement, bad items and image failure',async()=>{
 const env=environment();let root;
 try{const Component=load('components/originals/elastic-showcase.tsx',{'./elastic-showcase-engine':{...source,createElasticEngine(){throw Error('No GPU')}}}).default;const {createRoot}=require('react-dom/client');root=createRoot(document.getElementById('root'));
 await React.act(async()=>root.render(React.createElement(Component,{autoPlay:false})));assert.equal(document.querySelectorAll('.es-rail button').length,5);
 await React.act(async()=>document.querySelectorAll('.es-rail button')[2].click());assert.match(document.querySelector('.es-sr').textContent,/Project 3 of 5/);
 await React.act(async()=>document.querySelector('section').dispatchEvent(new env.dom.window.KeyboardEvent('keydown',{key:'End',bubbles:true})));assert.equal(document.querySelectorAll('[aria-pressed=true]').length,1);assert.match(document.querySelector('.es-sr').textContent,/Project 5 of 5/);
 await React.act(async()=>document.querySelector('.es-fallback img').dispatchEvent(new env.dom.window.Event('error')));assert.match(document.querySelector('.es-fallback').textContent,/Image unavailable/);
 await React.act(async()=>root.render(React.createElement(Component,{items:[null,{title:'Replacement',image:'javascript:alert(1)',roles:[]}],autoPlay:false})));assert.equal(document.querySelectorAll('.es-rail button').length,1);assert.match(document.querySelector('.es-sr').textContent,/Replacement/);assert.equal(document.querySelector('.es-fallback img'),null);
 await React.act(async()=>root.render(React.createElement(Component,{items:[]})));assert.equal(document.querySelector('[role=status]').textContent,'No projects to display.');
 }finally{if(root)await React.act(async()=>root.unmount());assert.equal(env.frames.size,0);assert.ok(env.observers.every(x=>x.disconnected));env.close()}
});
test('GPU owner preloads once, stops idle RAF, freezes/resumes, restores context and disposes late loads',()=>{
 const env=environment(),THREE=require('three'),loads=[],renderers=[],disposed=[];let engine;
 class Renderer{constructor(){this.domElement=document.createElement('canvas');renderers.push(this)}setClearColor(){}setPixelRatio(v){this.dpr=v}setSize(){}render(s){this.mesh=s.children[0];this.draws=(this.draws||0)+1}dispose(){this.disposed=true}forceContextLoss(){this.lost=true}}
 class Loader{setCrossOrigin(){}load(url,fn){const texture=new THREE.Texture({width:1400,height:1000});texture.addEventListener('dispose',()=>disposed.push(texture));loads.push({texture,fn});return texture}}
 try{const lib=load('components/originals/elastic-showcase-engine.ts',{three:{...THREE,WebGLRenderer:Renderer,TextureLoader:Loader},'./elastic-showcase-shaders':shaders});const host=document.getElementById('root');Object.defineProperties(host,{clientWidth:{value:640},clientHeight:{value:600}});let options={duration:1100,suspended:false,reduced:false},ended=[],available=[];
 engine=lib.createElasticEngine(host,['/a.webp','/b.webp','/c.webp'],()=>options,{start(){},progress(){},end:i=>ended.push(i),gpu:v=>available.push(v)});loads.slice(0,2).forEach(x=>x.fn(x.texture));env.advance(2);assert.equal(env.frames.size,0);assert.equal(loads.length,3);assert.equal(renderers.length,1);assert.ok(renderers[0].dpr<=2);assert.equal(renderers[0].mesh.geometry.parameters.widthSegments,48);
 assert.equal(engine.go(1),true);env.advance(20);options.suspended=true;engine.sync();env.advance(20);assert.equal(env.frames.size,0);assert.equal(ended.length,0);options.suspended=false;engine.sync();env.advance(80);assert.deepEqual(ended,[1]);assert.equal(env.frames.size,0);
 const canvas=host.querySelector('canvas'),lost=new env.dom.window.Event('webglcontextlost',{cancelable:true});canvas.dispatchEvent(lost);assert.ok(lost.defaultPrevented);assert.equal(available.at(-1),false);canvas.dispatchEvent(new env.dom.window.Event('webglcontextrestored'));env.advance(2);assert.equal(available.at(-1),true);
 options.reduced=true;engine.go(0);assert.equal(ended.at(-1),0);engine.dispose();engine.dispose();loads[2].fn(loads[2].texture);assert.equal(disposed.length,3);assert.equal(new Set(disposed).size,3);assert.equal(host.querySelector('canvas'),null);assert.equal(env.frames.size,0);assert.ok(renderers[0].disposed&&renderers[0].lost);assert.ok(env.observers.every(x=>x.disconnected));
 }finally{engine?.dispose();env.close()}
});
test('exported control examples use boolean autoplay and normalized panel values',()=>{
 const controls=load('lib/element-controls.ts'),item=require('../registry/manifest.json').items.find(x=>x.id==='elastic-showcase');const example=controls.usageFor(item,{...controls.defaultsFor(item.id),autoPlay:'disabled',transitionDuration:Infinity});assert.match(example,/ElasticShowcase/);assert.match(example,/autoPlay=\{false\}/);assert.match(example,/transitionDuration=\{1100\}/);assert.equal(item.files.filter(x=>x.source.endsWith('.webp')).length,5);
});
test('StrictMode disposes every owner; autoplay, pause and live timing props do not recreate the GPU',async()=>{
 const env=environment();let root,created=0,disposed=0;const timers=new Map();let id=0;
 env.dom.window.setTimeout=fn=>{timers.set(++id,fn);return id};env.dom.window.clearTimeout=key=>timers.delete(key);
 try{const mock={...source,createElasticEngine(host,sources,read,events){created++;let current=0;return{go(next){events.start(current,next);current=next;events.end(next);return true},sync(){},pointer(){},dispose(){disposed++}}}};
 const Component=load('components/originals/elastic-showcase.tsx',{'./elastic-showcase-engine':mock}).default;root=require('react-dom/client').createRoot(document.getElementById('root'));
 const render=props=>React.createElement(React.StrictMode,null,React.createElement(Component,props));
 await React.act(async()=>root.render(render({})));assert.equal(created,2);assert.equal(disposed,1);assert.equal(timers.size,1);
 await React.act(async()=>{const timer=[...timers.values()][0];timers.clear();timer()});assert.match(document.querySelector('.es-sr').textContent,/Project 2 of 5/);
 await React.act(async()=>root.render(render({paused:true,transitionDuration:1800,interval:4000})));assert.equal(timers.size,0);assert.equal(created,2);
 await React.act(async()=>root.render(render({autoPlay:false})));assert.equal(timers.size,0);assert.equal(created,2);
 }finally{if(root)await React.act(async()=>root.unmount());assert.equal(created,disposed);assert.equal(timers.size,0);env.close()}
});
