const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),ts=require('typescript-compiler-api'),{JSDOM}=require('jsdom');
function load(file,mocks={}){const filename=path.resolve(__dirname,'..',file),entry=new Module(filename,module);entry.filename=filename;entry.paths=Module._nodeModulePaths(path.dirname(filename));const normal=entry.require.bind(entry);entry.require=id=>mocks[id]??normal(id);entry._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText,filename);return entry.exports;}

test('Elevation cards remain static across visibility, motion and settings changes without loading the 3D module or scheduling work',async()=>{
 const React=require('react'),dom=new JSDOM('<div id="mount"></div>'),calls=[];
 const values={window:dom.window,document:dom.window.document,HTMLElement:dom.window.HTMLElement,IS_REACT_ACT_ENVIRONMENT:true,IntersectionObserver:class{constructor(){calls.push('observer');}observe(){}disconnect(){}}},old=new Map(Object.keys(values).map(k=>[k,Object.getOwnPropertyDescriptor(globalThis,k)]));
 Object.entries(values).forEach(([k,v])=>Object.defineProperty(globalThis,k,{value:v,writable:true,configurable:true}));
 const Card=load('components/card-preview.tsx',{
  '@/lib/preview-loaders':{preloadPreview:()=>{calls.push('import');return Promise.resolve();}},
  '@/lib/preview-ready':{observePreviewReady:()=>{calls.push('ready');return()=>{};}},
  '@/lib/preview-demo':{startPreviewDemo:()=>{calls.push('animation');return()=>{};}},
  '@/lib/preview-scheduler':{schedulePreview:()=>{calls.push('schedule');return()=>{};},retainPreview(){},releasePreview(){}},
  '@/registry/previews.json':require('../registry/previews.json'),
  './demos':{Demo:()=>{calls.push('scene');return React.createElement('div');}},
 }).default;
 const root=require('react-dom/client').createRoot(document.getElementById('mount'));
 try{
  for(const paused of [false,true,false])await React.act(()=>root.render(React.createElement(React.StrictMode,null,React.createElement(Card,{id:'elevation-matrix',paused,priority:true,settings:{defaultView:'3d',defaultTheme:paused?'violet':'emerald'}}))));
  const card=document.querySelector('.card-preview');assert.equal(card.dataset.previewMode,'static-2d');assert.equal(card.dataset.previewState,'poster');assert.equal(card.querySelectorAll('img').length,2);assert.equal(card.querySelector('.card-live'),null);assert.deepEqual(calls,[]);
  await React.act(()=>root.unmount());assert.deepEqual(calls,[]);
 }finally{dom.window.close();for(const[k,v]of old){if(v)Object.defineProperty(globalThis,k,v);else delete globalThis[k];}}
});

test('Elevation thumbnail captures use frozen 2D while opening the workspace retains its configured 3D view',async()=>{
 const React=require('react'),dom=new JSDOM('<div id="mount"></div>'),old=new Map(),props=[];
 for(const[k,v]of Object.entries({window:dom.window,document:dom.window.document,IS_REACT_ACT_ENVIRONMENT:true})){old.set(k,Object.getOwnPropertyDescriptor(globalThis,k));Object.defineProperty(globalThis,k,{value:v,writable:true,configurable:true});}
 const loader=()=>{},Demo=load('components/demos.tsx',{
  'next/dynamic':{default:load=>load===loader?value=>{props.push(value);return React.createElement('div');}:()=>null},
  '@/lib/preview-loaders':{previewLoaders:{'elevation-matrix':loader}},
  'motion/react':{useReducedMotion:()=>false},
 }).Demo,root=require('react-dom/client').createRoot(document.getElementById('mount'));
 try{
  await React.act(()=>root.render(React.createElement(Demo,{id:'elevation-matrix',autoDemo:true,settings:{defaultView:'3d'}})));
  assert.equal(props.at(-1).view,'2d');assert.equal(props.at(-1).paused,true);
  await React.act(()=>root.render(React.createElement(Demo,{id:'elevation-matrix',expanded:true,settings:{defaultView:'3d'}})));
  assert.equal(props.at(-1).view,'3d');assert.equal(props.at(-1).paused,false);
  await React.act(()=>root.render(React.createElement(Demo,{id:'elevation-matrix',expanded:true,settings:{defaultView:'2d'}})));
  assert.equal(props.at(-1).view,'2d');await React.act(()=>root.unmount());
 }finally{dom.window.close();for(const[k,v]of old){if(v)Object.defineProperty(globalThis,k,v);else delete globalThis[k];}}
});

