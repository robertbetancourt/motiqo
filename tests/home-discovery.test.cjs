const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),ts=require('typescript-compiler-api'),React=require('react'),{JSDOM}=require('jsdom');
function load(file,mocks={}){const filename=path.resolve(__dirname,'..',file),m=new Module(filename,module);m.filename=filename;m.paths=Module._nodeModulePaths(path.dirname(filename));const normal=m.require.bind(m);m.require=id=>mocks[id]??normal(id);m._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText,filename);return m.exports;}
const controls=load('lib/element-controls.ts'),catalog=load('lib/catalog.ts',{'./element-controls':controls}),collections=load('lib/home-collections.ts',{'./catalog':catalog});
test('The homepage has ten distinct curated picks and complete, disjoint discovery collections with real category counts',()=>{
 assert.equal(collections.homeCollections[0].items[1].id,'optical-button');
 assert.equal(collections.homeCollections[0].items[2].id,'orbit-stage-hero');assert.equal(collections.homeCollections[0].items[6].id,'optical-artifact-card');
 const top=collections.homeCollections[0];assert.equal(top.items[0].id,'thermal-smoke');assert.equal(top.items[9].id,'water-ripple-carousel');assert.equal(top.ranked,true);assert.equal(top.items.length,10);assert.equal(new Set(top.items.map(e=>e.id)).size,10);
 const ids=collections.homeCollections.flatMap(row=>row.items.map(e=>{assert.ok(catalog.elements.some(item=>item.id===e.id));return e.id;}));assert.equal(new Set(ids).size,ids.length);
 for(const topic of collections.homeTopics){assert.ok(topic.count>0);assert.equal(topic.count,catalog.elements.filter(e=>e.tags.includes(topic.tag)).length);}
});

test('Discovery rails navigate, previews autoplay, saves persist and the existing contextual mood follows the component link',async()=>{
 const dom=new JSDOM('<div id="mount"></div>',{url:'http://localhost/',pretendToBeVisual:true}),observers=[],globals={window:dom.window,document:dom.window.document,localStorage:dom.window.localStorage,IS_REACT_ACT_ENVIRONMENT:true,ResizeObserver:class{constructor(fn){this.fn=fn;observers.push(this);}observe(){this.fn();}disconnect(){this.disconnected=true;}}},old=new Map(Object.keys(globals).map(k=>[k,Object.getOwnPropertyDescriptor(globalThis,k)]));
 Object.entries(globals).forEach(([k,v])=>Object.defineProperty(globalThis,k,{value:v,writable:true,configurable:true}));
 Object.defineProperty(window.HTMLOListElement.prototype,'clientWidth',{get(){return 600;}});Object.defineProperty(window.HTMLOListElement.prototype,'scrollWidth',{get(){return 3000;}});window.HTMLOListElement.prototype.scrollBy=function(options){this.scrollLeft=Math.max(0,Math.min(2400,this.scrollLeft+options.left));this.lastBehavior=options.behavior;this.dispatchEvent(new window.Event('scroll'));};
 const Home=load('components/home.tsx',{'next/link':{default:({prefetch,children,...props})=>React.createElement('a',props,children)},'motion/react':{AnimatePresence:({children})=>children,useReducedMotion:()=>false},'@/lib/catalog':catalog,'@/lib/element-controls':controls,'@/lib/home-collections':collections,'./home.module.css':{default:new Proxy({},{get:(_,key)=>String(key)})},'./rank-number':{default:({value,className})=>React.createElement('span',{className,'aria-hidden':true},value)},'./site-frame':{default:({children})=>children},'./card-preview':{default:({id,paused,settings})=>React.createElement('div',{'data-test-preview':id,'data-paused':String(paused),'data-settings':JSON.stringify(settings)})},'./card-context-menu':{default:props=>React.createElement('button',{'data-test-menu':true,onClick:()=>{props.onMood({temperature:32});props.onClose();}},'Choose mood')}}).default;
 const root=require('react-dom/client').createRoot(document.getElementById('mount')),button=name=>document.querySelector(`button[aria-label="${name}"]`),click=async node=>React.act(()=>node.click());
 try{
  await React.act(()=>root.render(React.createElement(Home)));const top=document.getElementById('motiqo-ten');assert.equal(top.children.length,10);assert.equal(observers.length,3);assert.equal(button('Previous The Motiqo 10').disabled,true);
  await click(button('Next The Motiqo 10'));assert.equal(top.scrollLeft,510);assert.equal(button('Previous The Motiqo 10').disabled,false);assert.equal(top.lastBehavior,'smooth');
  assert.equal(button('Pause previews'),null);assert.ok([...document.querySelectorAll('[data-test-preview]')].every(e=>e.dataset.paused==='false'));await click(button('Previous The Motiqo 10'));assert.equal(top.scrollLeft,0);
  await click(button('Save ThermalSmoke'));assert.deepEqual(JSON.parse(localStorage.getItem('motiqo-saved')),['thermal-smoke']);assert.equal(button('Unsave ThermalSmoke').getAttribute('aria-pressed'),'true');
  const card=document.querySelector('[data-element="thermal-smoke"]');await React.act(()=>card.dispatchEvent(new window.MouseEvent('contextmenu',{bubbles:true,cancelable:true,clientX:200,clientY:200})));await click(document.querySelector('[data-test-menu]'));
  const href=card.querySelector('a').getAttribute('href');assert.equal(new URL(href,window.location.origin).searchParams.get('element'),'thermal-smoke');assert.equal(JSON.parse(new URL(href,window.location.origin).searchParams.get('config')).settings.temperature,32);
  assert.equal(document.querySelectorAll('a a').length,0,'interactive previews must not sit inside the navigation link');
 }finally{await React.act(()=>root.unmount());assert.ok(observers.every(o=>o.disconnected));dom.window.close();for(const[k,v]of old){if(v)Object.defineProperty(globalThis,k,v);else delete globalThis[k];}}
});

test('A source action from the homepage opens the Library source view with its configured element',async()=>{
 const Page=load('app/library/page.tsx',{'@/components/library':{default:()=>null},'@/lib/registry.server':{originalSources:async()=>({})},'@/lib/component-groups':load('lib/component-groups.ts')}).default;
 const page=await Page({searchParams:Promise.resolve({element:'gyro',view:'code',config:'example'})});assert.equal(page.props.initialElement,'gyro');assert.equal(page.props.initialView,'code');assert.equal(page.props.initialConfiguration,'example');
 const invalid=await Page({searchParams:Promise.resolve({view:'unknown'})});assert.equal(invalid.props.initialView,'preview');
 const group=await Page({searchParams:Promise.resolve({group:'carousels'})});assert.equal(group.props.initialGroup,'carousels');
 const invalidGroup=await Page({searchParams:Promise.resolve({group:['buttons','cards']})});assert.equal(invalidGroup.props.initialGroup,undefined);
});
