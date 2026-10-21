const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),ts=require('typescript-compiler-api'),React=require('react'),{JSDOM}=require('jsdom');
function load(file,mocks={}){const filename=path.resolve(__dirname,'..',file),m=new Module(filename,module);m.filename=filename;m.paths=Module._nodeModulePaths(path.dirname(filename));const normal=m.require.bind(m);m.require=id=>mocks[id]??normal(id);m._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText,filename);return m.exports;}

test('The shared budget admits four, prioritizes hover and focus, revokes before granting and releases every slot',()=>{
 const {registerPreviewCandidate}=load('lib/preview-budget.ts'),active=new Set(),events=[],items=Array.from({length:8},(_,index)=>registerPreviewCandidate(()=>index,on=>{on?active.add(index):active.delete(index);events.push([index,on]);assert.ok(active.size<=4);}));
 try{
  items.forEach(item=>item.update(true));assert.deepEqual([...active],[0,1,2,3]);
  items[7].update(true,true);assert.ok(active.has(7));assert.equal(active.size,4);assert.deepEqual(events.slice(-2),[[3,false],[7,true]]);
  items[7].update(true);assert.deepEqual([...active].sort(),[0,1,2,3]);
  items[0].update(false);assert.deepEqual([...active].sort(),[1,2,3,4]);
  items[1].dispose();assert.deepEqual([...active].sort(),[2,3,4,5]);
 }finally{items.forEach(item=>item.dispose());assert.equal(active.size,0);}
});

test('A grid shares four live previews, promotes keyboard/pointer interest and stops on pause, hidden tabs and unmount',async()=>{
 const dom=new JSDOM('<div id="mount"></div>',{pretendToBeVisual:true,url:'http://localhost/library'}),frames=new Map(),observers=[],old=new Map();let serial=0;
 const values={window:dom.window,document:dom.window.document,IS_REACT_ACT_ENVIRONMENT:true,requestAnimationFrame:fn=>{frames.set(++serial,fn);return serial;},cancelAnimationFrame:id=>frames.delete(id),IntersectionObserver:class{constructor(fn,options){this.fn=fn;this.margin=options.rootMargin;observers.push(this);}observe(node){this.node=node;}disconnect(){this.disconnected=true;}}};
 for(const[key,value]of Object.entries(values)){old.set(key,Object.getOwnPropertyDescriptor(globalThis,key));Object.defineProperty(globalThis,key,{value,writable:true,configurable:true});}
 const scheduler=load('lib/preview-scheduler.ts'),budget=load('lib/preview-budget.ts');
 const Preview=load('components/card-preview.tsx',{'@/lib/preview-budget':budget,'@/lib/preview-scheduler':scheduler,'@/lib/preview-loaders':{preloadPreview:()=>Promise.resolve()},'@/lib/preview-ready':{observePreviewReady:(_root,ready)=>{ready();return()=>{};}},'@/lib/preview-demo':{startPreviewDemo:()=>()=>{}},'@/registry/previews.json':require('../registry/previews.json'),'./demos':{Demo:({id,paused})=>React.createElement('div',{'data-scene':id,'data-paused':String(paused)})}}).default;
 const ids=['meridian','helix','luma','galaxy','inkshift','type-garden','sleeve','atelier','elevation-matrix'],root=require('react-dom/client').createRoot(document.getElementById('mount'));
 const render=paused=>root.render(React.createElement(React.StrictMode,null,ids.map(id=>React.createElement('article',{key:id,'data-item':id},React.createElement(Preview,{id,paused}),React.createElement('a',{href:`#${id}`},id)))));
 const advance=async()=>{for(let i=0;i<40;i++)await React.act(async()=>{const batch=[...frames.values()];frames.clear();batch.forEach(fn=>fn(1000));await Promise.resolve();});};
 const live=()=>[...document.querySelectorAll('.card-preview[data-live]')].map(node=>node.dataset.previewId);
 try{
  await React.act(()=>render(false));await React.act(()=>observers.filter(o=>!o.disconnected).forEach(o=>o.fn([{isIntersecting:true}])));await advance();assert.equal(live().length,4);assert.ok(document.querySelectorAll('.card-live').length<=6);
  assert.equal(document.querySelector('[data-scene="elevation-matrix"]'),null);
  await React.act(()=>document.querySelector('[data-item="atelier"]').dispatchEvent(new window.MouseEvent('pointerenter')));await advance();assert.ok(live().includes('atelier'));assert.equal(live().length,4);
  await React.act(()=>document.querySelector('[data-item="sleeve"] a').focus());await advance();assert.ok(live().includes('sleeve'));assert.equal(live().length,4);assert.ok(document.querySelectorAll('.card-live').length<=6);
  await React.act(()=>document.querySelector('[data-item="elevation-matrix"]').dispatchEvent(new window.MouseEvent('pointerenter')));await advance();assert.ok(live().includes('elevation-matrix'));assert.equal(live().length,4);
  await React.act(()=>document.querySelector('[data-item="elevation-matrix"]').dispatchEvent(new window.MouseEvent('pointerleave')));await advance();assert.ok(!live().includes('elevation-matrix'));assert.equal(live().length,4);
  await React.act(()=>{Object.defineProperty(document,'hidden',{value:true,configurable:true});document.dispatchEvent(new window.Event('visibilitychange'));});assert.equal(live().length,0);assert.ok([...document.querySelectorAll('[data-scene]')].every(node=>node.dataset.paused==='true'));
  await React.act(()=>{Object.defineProperty(document,'hidden',{value:false,configurable:true});document.dispatchEvent(new window.Event('visibilitychange'));});await advance();assert.equal(live().length,4);
  await React.act(()=>render(true));await advance();assert.equal(live().length,0);assert.ok([...document.querySelectorAll('[data-scene]')].every(node=>node.dataset.paused==='true'));
  await React.act(()=>root.unmount());assert.equal(frames.size,0);assert.ok(observers.every(o=>o.disconnected));
 }finally{await React.act(()=>root.unmount());dom.window.close();for(const[key,value]of old){if(value)Object.defineProperty(globalThis,key,value);else delete globalThis[key];}}
});
