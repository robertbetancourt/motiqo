const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),ts=require('typescript-compiler-api'),React=require('react'),{renderToStaticMarkup}=require('react-dom/server');
function preview(sourceHash){
 const filename=path.resolve(__dirname,'../components/card-preview.tsx'),entry=new Module(filename,module);entry.filename=filename;entry.paths=Module._nodeModulePaths(path.dirname(filename));
 const mocks={'@/registry/preview-videos.json':{items:{}},'@/registry/previews.json':{width:400,height:300,items:{'sonic-aperture':{dark:'/current-dark.webp',light:'/current-light.webp',sourceHash}}},'../registry/preview-sources.json':{'sonic-aperture':'current'},'./demos':{Demo:()=>null}};
 entry.require=id=>Object.hasOwn(mocks,id)?mocks[id]:id.startsWith('@/lib/')?{}:require(id);
 entry._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText,filename);
 return renderToStaticMarkup(React.createElement(entry.exports.default,{id:'sonic-aperture',paused:true}));
}
test('The last stored poster remains visible during revision changes rather than leaving a blank card',()=>{
 for(const hash of [undefined,'old']){assert.match(preview(hash),/current-dark\.webp/);assert.match(preview(hash),/current-light\.webp/);}
 const current=preview('current');assert.match(current,/current-dark\.webp/);assert.match(current,/current-light\.webp/);assert.match(current,/data-preview-state="poster"/);
});
test('Implementation and default changes invalidate their poster; a shared frame change invalidates every poster',async()=>{
 const {previewRevisions}=await import('../scripts/preview-revisions.mjs'),os=require('node:os'),temp=fs.mkdtempSync(path.join(os.tmpdir(),'motiqo-poster-test-'));
 const write=(file,text)=>{fs.mkdirSync(path.dirname(path.join(temp,file)),{recursive:true});fs.writeFileSync(path.join(temp,file),text);};
 const items=['a','b'].map(id=>({id,controls:[{defaultValue:1}],files:[{source:`components/${id}.tsx`}]}));
 try{
  for(const file of ['components/demos.tsx','components/preview-capture.tsx','app/globals.css','components/a.tsx','components/b.tsx'])write(file,'initial\n');
  write('registry/manifest.json',JSON.stringify({items}));const initial=previewRevisions(temp);assert.deepEqual(initial,previewRevisions(temp));
  write('components/a.tsx','initial\r\n');write('app/globals.css','initial\r\n');assert.deepEqual(previewRevisions(temp),initial,'checkout line endings do not invalidate a faithful capture');
  write('components/a.tsx','new component');const source=previewRevisions(temp);assert.notEqual(source.a,initial.a);assert.equal(source.b,initial.b);
  items[1].controls[0].defaultValue=2;write('registry/manifest.json',JSON.stringify({items}));const defaults=previewRevisions(temp);assert.notEqual(defaults.b,source.b);assert.equal(defaults.a,source.a);
  write('components/demos.tsx','new framing');const shared=previewRevisions(temp);for(const id of ['a','b'])assert.notEqual(shared[id],defaults[id]);
 }finally{if(path.dirname(temp)===os.tmpdir()&&path.basename(temp).startsWith('motiqo-poster-test-'))fs.rmSync(temp,{recursive:true,force:true});}
});
