const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),ts=require('typescript-compiler-api'),React=require('react'),{JSDOM}=require('jsdom');
function load(file,mocks={}){const filename=path.resolve(__dirname,'..',file),m=new Module(filename,module);m.filename=filename;m.paths=Module._nodeModulePaths(path.dirname(filename));const normal=m.require.bind(m);m.require=id=>mocks[id]??normal(id);m._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText,filename);return m.exports;}
test('Eight shared slots revoke before admitting replacements and release on disposal',()=>{
 const {registerPreviewCandidate}=load('lib/preview-budget.ts'),active=new Set(),items=Array.from({length:10},(_,i)=>registerPreviewCandidate(()=>i,on=>{on?active.add(i):active.delete(i);assert.ok(active.size<=8);}));
 try{items.forEach(item=>item.update(true));assert.equal(active.size,8);assert.ok(!active.has(8));items[9].update(true,true);assert.ok(active.has(9));assert.ok(!active.has(7));items[0].update(false);assert.ok(active.has(7));}finally{items.forEach(item=>item.dispose());assert.equal(active.size,0);}
});
test('Catalog videos stop offscreen, on pause, hidden tabs and reduced motion without mounting scenes',async()=>{
 const dom=new JSDOM('<div id="mount"></div>',{pretendToBeVisual:true}),observers=[],old=new Map(),media={matches:false,addEventListener(){},removeEventListener(){}};
 const values={window:dom.window,document:dom.window.document,MutationObserver:dom.window.MutationObserver,IS_REACT_ACT_ENVIRONMENT:true,matchMedia:()=>media,IntersectionObserver:class{constructor(fn){this.fn=fn;observers.push(this);}observe(node){this.node=node;}disconnect(){this.disconnected=true;}}};
 for(const[k,v]of Object.entries(values)){old.set(k,Object.getOwnPropertyDescriptor(globalThis,k));Object.defineProperty(globalThis,k,{value:v,writable:true,configurable:true});}
 dom.window.HTMLMediaElement.prototype.play=function(){this.dataset.playing='true';return Promise.resolve();};dom.window.HTMLMediaElement.prototype.pause=function(){delete this.dataset.playing;};
 const ids=Array.from({length:10},(_,i)=>'clip'+i),items=Object.fromEntries(ids.map(id=>[id,{dark:'/'+id+'.mp4',light:'/'+id+'-light.mp4'}]));
 const Preview=load('components/card-preview.tsx',{'@/lib/preview-budget':load('lib/preview-budget.ts'),'@/registry/previews.json':{items:{},width:400,height:300},'@/registry/preview-videos.json':{items}}).default,root=require('react-dom/client').createRoot(document.getElementById('mount'));
 const render=paused=>root.render(React.createElement(React.Fragment,null,ids.map(id=>React.createElement(Preview,{key:id,id,paused}))));
 const playing=()=>document.querySelectorAll('video[data-playing]').length;
 try{
  await React.act(()=>render(false));await React.act(()=>observers.forEach(o=>o.fn([{isIntersecting:true}])));assert.equal(playing(),8);assert.equal(document.querySelectorAll('canvas,.demo').length,0);
  await React.act(()=>observers[0].fn([{isIntersecting:false}]));assert.equal(playing(),8);assert.equal(document.querySelector('video').getAttribute('src'),null);
  await React.act(()=>{Object.defineProperty(document,'hidden',{value:true,configurable:true});document.dispatchEvent(new window.Event('visibilitychange'));});assert.equal(playing(),0);
  await React.act(()=>{Object.defineProperty(document,'hidden',{value:false,configurable:true});document.dispatchEvent(new window.Event('visibilitychange'));});assert.equal(playing(),8);
  await React.act(()=>render(true));assert.equal(playing(),0);
  media.matches=true;await React.act(()=>render(false));await React.act(()=>observers.filter(o=>!o.disconnected).forEach(o=>o.fn([{isIntersecting:true}])));assert.equal(playing(),0);
 }finally{await React.act(()=>root.unmount());assert.ok(observers.every(o=>o.disconnected));dom.window.close();for(const[k,v]of old){if(v)Object.defineProperty(globalThis,k,v);else delete globalThis[k];}}
});
