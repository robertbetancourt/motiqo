const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),ts=require('typescript-compiler-api'),{JSDOM}=require('jsdom');
function load(file,mocks={}){const filename=path.resolve(__dirname,'..',file),entry=new Module(filename,module);entry.filename=filename;entry.paths=Module._nodeModulePaths(path.dirname(filename));const normal=entry.require.bind(entry);entry.require=id=>mocks[id]??normal(id);entry._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText,filename);return entry.exports;}

test('Elevation hover previews use live 3D while opening the workspace retains its configured view',async()=>{
 const React=require('react'),dom=new JSDOM('<div id="mount"></div>'),old=new Map(),props=[];
 for(const[k,v]of Object.entries({window:dom.window,document:dom.window.document,IS_REACT_ACT_ENVIRONMENT:true})){old.set(k,Object.getOwnPropertyDescriptor(globalThis,k));Object.defineProperty(globalThis,k,{value:v,writable:true,configurable:true});}
 const loader=()=>{},Demo=load('components/demos.tsx',{
  'next/dynamic':{default:load=>load===loader?value=>{props.push(value);return React.createElement('div');}:()=>null},
  '@/lib/preview-loaders':{previewLoaders:{'elevation-matrix':loader}},
  'motion/react':{useReducedMotion:()=>false},
 }).Demo,root=require('react-dom/client').createRoot(document.getElementById('mount'));
 try{
  await React.act(()=>root.render(React.createElement(Demo,{id:'elevation-matrix',autoDemo:true,settings:{defaultView:'3d'}})));
  assert.equal(props.at(-1).view,'3d');assert.equal(props.at(-1).paused,false);
  await React.act(()=>root.render(React.createElement(Demo,{id:'elevation-matrix',expanded:true,settings:{defaultView:'3d'}})));
  assert.equal(props.at(-1).view,'3d');assert.equal(props.at(-1).paused,false);
  await React.act(()=>root.render(React.createElement(Demo,{id:'elevation-matrix',expanded:true,settings:{defaultView:'2d'}})));
  assert.equal(props.at(-1).view,'2d');await React.act(()=>root.unmount());
 }finally{dom.window.close();for(const[k,v]of old){if(v)Object.defineProperty(globalThis,k,v);else delete globalThis[k];}}
});

