const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),ts=require('typescript-compiler-api'),React=require('react'),{JSDOM}=require('jsdom');
function load(file,mocks){const filename=path.resolve(__dirname,'..',file),entry=new Module(filename,module);entry.filename=filename;entry.paths=Module._nodeModulePaths(path.dirname(filename));const normal=entry.require.bind(entry);entry.require=id=>mocks[id]??normal(id);entry._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText,filename);return entry.exports;}
test('Saved to Library publishes one continuous navigation update without clearing the active item',async()=>{
 const dom=new JSDOM('<div id="mount"></div>',{pretendToBeVisual:true}),old=new Map(['window','document','IS_REACT_ACT_ENVIRONMENT'].map(k=>[k,Object.getOwnPropertyDescriptor(globalThis,k)]));for(const[k,v]of Object.entries({window:dom.window,document:dom.window.document,IS_REACT_ACT_ENVIRONMENT:true}))Object.defineProperty(globalThis,k,{value:v,configurable:true,writable:true});
 const snapshots=[],publish=value=>snapshots.push(value),Frame=load('components/site-frame.tsx',{'./site-shell':{useSiteNavigation:()=>publish},'./site-footer':{default:()=>null}}).default,root=require('react-dom/client').createRoot(document.getElementById('mount'));let mounted=true;
 try{await React.act(()=>root.render(React.createElement(Frame,{collection:true,savedOnly:true,savedCount:3},'Saved')));snapshots.length=0;await React.act(()=>root.render(React.createElement(Frame,{collection:true,savedOnly:false,savedCount:3},'Library')));assert.equal(snapshots.length,1);assert.equal(snapshots[0].savedOnly,false);assert.equal(snapshots[0].collection,true);await React.act(()=>root.unmount());mounted=false;assert.deepEqual(snapshots.at(-1),{});
 }finally{if(mounted)await React.act(()=>root.unmount());dom.window.close();for(const[k,v]of old){if(v)Object.defineProperty(globalThis,k,v);else delete globalThis[k];}}
});

test('Catalog server rendering includes posters without starting component loaders or requesting videos',()=>{
 const Preview=load('components/card-preview.tsx',{'@/registry/previews.json':{width:400,height:300,items:{helix:{dark:'/helix.webp',light:'/helix-light.webp'}}},'@/registry/preview-videos.json':{items:{helix:{dark:'/helix.mp4',light:'/helix-light.mp4'}}},'@/lib/preview-budget':{}}).default;
 const html=require('react-dom/server').renderToStaticMarkup(React.createElement(Preview,{id:'helix',paused:false}));
 assert.match(html,/helix.webp/);assert.match(html,/<video/);assert.doesNotMatch(html,/src="\/helix.mp4"|<canvas|class="demo/);
});
