const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),ts=require('typescript-compiler-api'),{JSDOM}=require('jsdom');
function load(file,mocks={}){const filename=path.resolve(__dirname,'..',file),entry=new Module(filename,module);entry.filename=filename;entry.paths=Module._nodeModulePaths(path.dirname(filename));const normal=entry.require.bind(entry);entry.require=id=>mocks[id]??normal(id);entry._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText,filename);return entry.exports;}
function frames(){const jobs=new Map();let serial=0,now=performance.now();const old=new Map(['requestAnimationFrame','cancelAnimationFrame'].map(k=>[k,Object.getOwnPropertyDescriptor(globalThis,k)]));globalThis.requestAnimationFrame=fn=>{jobs.set(++serial,fn);return serial;};globalThis.cancelAnimationFrame=id=>jobs.delete(id);return{jobs,get now(){return now;},advance(){now+=1000/60;const batch=[...jobs.values()];jobs.clear();batch.forEach(fn=>fn(now));},restore(){for(const[k,v]of old){if(v)Object.defineProperty(globalThis,k,v);else delete globalThis[k];}}};}

test('Visible preview admission yields a paint, reevaluates priority, admits one scene per turn and cancels cleanly',()=>{
 const clock=frames(),scheduler=load('lib/preview-scheduler.ts'),calls=[];let first=20,second=100;
 try{
  const cancel=scheduler.schedulePreview(()=>calls.push('cancelled'),()=>0);cancel();assert.equal(clock.jobs.size,0);
  const a=scheduler.schedulePreview(()=>calls.push('a'),()=>first),b=scheduler.schedulePreview(()=>calls.push('b'),()=>second);
  clock.advance();assert.deepEqual(calls,[],'the poster gets a paint before scene admission');second=1;clock.advance();assert.deepEqual(calls,['b'],'priority is measured at admission rather than registration');
  clock.advance();clock.advance();assert.deepEqual(calls,['b','a']);assert.equal(clock.jobs.size,0);a();b();assert.equal(clock.jobs.size,0);
 }finally{clock.restore();}
});

test('Only two offscreen scenes are retained; returning to a scene preserves it and evicts the least recent one',()=>{
 const scheduler=load('lib/preview-scheduler.ts'),a=Symbol(),b=Symbol(),c=Symbol(),d=Symbol(),released=[];
 scheduler.retainPreview(a,()=>released.push('a'));scheduler.retainPreview(b,()=>released.push('b'));scheduler.releasePreview(a);scheduler.retainPreview(c,()=>released.push('c'));assert.deepEqual(released,[]);
 scheduler.retainPreview(a,()=>released.push('a'));assert.deepEqual(released,['b']);scheduler.retainPreview(d,()=>released.push('d'));assert.deepEqual(released,['b','c']);scheduler.releasePreview(a);scheduler.releasePreview(d);
});

test('Poster handoff waits for a real GPU frame, observes asynchronously loaded DOM, detects failure and releases observers',async()=>{
 const dom=new JSDOM('<main><div class="demo"><section><canvas></canvas></section></div></main>'),old=Object.getOwnPropertyDescriptor(globalThis,'MutationObserver'),clock=frames();globalThis.MutationObserver=dom.window.MutationObserver;
 const {observePreviewReady}=load('lib/preview-ready.ts'),root=dom.window.document.querySelector('main');let ready=0,failed=0;
 try{
  const stop=observePreviewReady(root,()=>ready++,()=>failed++);clock.advance();clock.advance();assert.equal(ready,0,'canvas insertion does not mean that its first frame is rendered');root.querySelector('section').dataset.ready='true';await Promise.resolve();clock.advance();assert.equal(ready,0);clock.advance();assert.equal(ready,1);root.querySelector('section').dataset.ready='false';await Promise.resolve();assert.equal(clock.jobs.size,0);stop();
  root.innerHTML='<div class="demo"></div>';const stopDom=observePreviewReady(root,()=>ready++);root.querySelector('.demo').innerHTML='<nav>Home · Search</nav>';await Promise.resolve();clock.advance();clock.advance();assert.equal(ready,2);stopDom();
  root.innerHTML='<div class="demo"><div data-failed="true"><canvas></canvas></div></div>';const stopFailed=observePreviewReady(root,()=>ready++,()=>failed++);assert.equal(failed,1);assert.equal(ready,2);stopFailed();
  root.innerHTML='<div class="demo"><svg><path d="M0 0L1 1"/></svg></div>';const cancel=observePreviewReady(root,()=>ready++);cancel();clock.advance();clock.advance();assert.equal(ready,2);assert.equal(clock.jobs.size,0);
 }finally{clock.restore();dom.window.close();if(old)Object.defineProperty(globalThis,'MutationObserver',old);else delete globalThis.MutationObserver;}
});

test('Every catalog element has complete, content-addressed dark and light WebP posters',async()=>{
 const manifest=require('../registry/manifest.json'),posters=require('../registry/previews.json'),crypto=require('node:crypto'),sharp=require('sharp');
 assert.deepEqual(Object.keys(posters.items).sort(),manifest.items.map(item=>item.id).sort());
 for(const item of manifest.items)for(const theme of ['dark','light']){
  const url=posters.items[item.id][theme];assert.match(url,new RegExp(`^/previews/${item.id}-${theme}-[a-f0-9]{12}\\.webp$`));
  const bytes=fs.readFileSync(path.resolve(__dirname,'../public'+url)),hash=crypto.createHash('sha256').update(bytes).digest('hex').slice(0,12);assert.ok(url.endsWith(`-${hash}.webp`));
  const metadata=await sharp(bytes).metadata();assert.equal(metadata.width,320);assert.equal(metadata.height,320);assert.equal(metadata.format,'webp');const stats=await sharp(bytes).stats();assert.ok(stats.channels.some(channel=>channel.max>channel.min),`${item.id}/${theme} must contain a rendered composition`);
 }
});

test('Compact data previews begin complete while standalone charts retain their animated entrance',async()=>{
 const React=require('react'),dom=new JSDOM('<div id="mount"></div>',{pretendToBeVisual:true}),clock=frames(),values={window:dom.window,document:dom.window.document,HTMLElement:dom.window.HTMLElement,IS_REACT_ACT_ENVIRONMENT:true,performance:{now:()=>clock.now},matchMedia:()=>({matches:false,addEventListener(){},removeEventListener(){}}),IntersectionObserver:class{constructor(fn){this.fn=fn;}observe(){this.fn([{isIntersecting:true}]);}disconnect(){}},ResizeObserver:class{constructor(fn){this.fn=fn;}observe(){this.fn([{contentRect:{width:320}}]);}disconnect(){}}},old=new Map(Object.keys(values).map(k=>[k,Object.getOwnPropertyDescriptor(globalThis,k)]));Object.entries(values).forEach(([k,v])=>Object.defineProperty(globalThis,k,{value:v,writable:true,configurable:true}));
 const Holdings=load('components/originals/holdings.tsx').default,Sentiment=load('components/originals/sentiment.tsx').default,Pulse=load('components/originals/pulse.tsx').default,root=require('react-dom/client').createRoot(document.getElementById('mount'));
 const render=compact=>React.createElement(React.Fragment,null,React.createElement(Holdings,{compact,activity:0,key:`holdings-${compact}`}),React.createElement(Sentiment,{compact,key:`sentiment-${compact}`}),React.createElement(Pulse,{compact,key:`pulse-${compact}`}));
 try{
  await React.act(()=>root.render(render(true)));await React.act(()=>{for(let i=0;i<4;i++)clock.advance();});
  assert.equal(document.querySelector('.holdings').dataset.progress,'1.000');assert.equal(document.querySelector('.holdings-number').textContent,'$61,800');assert.equal(document.querySelector('.sentiment').dataset.reveal,'1.000');assert.notEqual(document.querySelector('.sentiment-metrics strong').textContent,'$0.00');assert.equal(document.querySelector('.pulse [pathLength]').getAttribute('stroke-dashoffset'),'0');
  await React.act(()=>root.render(render(false)));assert.equal(document.querySelector('.holdings-number').textContent,'$0');assert.equal(document.querySelector('.sentiment').dataset.reveal,'0.000');assert.equal(document.querySelector('.pulse [pathLength]').getAttribute('stroke-dashoffset'),'1');
  await React.act(()=>root.unmount());assert.equal(clock.jobs.size,0);
 }finally{clock.restore();dom.window.close();for(const[k,v]of old){if(v)Object.defineProperty(globalThis,k,v);else delete globalThis[k];}}
});
