const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');const Module=require('node:module');const ts=require('typescript');
function load(relative,overrides={}){const filename=path.resolve(__dirname,'..',relative),entry=new Module(filename,module);entry.filename=filename;entry.paths=Module._nodeModulePaths(path.dirname(filename));const normal=entry.require.bind(entry);entry.require=name=>overrides[name]||normal(name);entry._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,filename);return entry.exports;}
test('download endpoint rejects ambiguous inputs before work and recovers its concurrency slots',async()=>{
 let calls=0;const release=[];
 const route=load('app/api/components/[id]/route.ts',{'@/lib/registry.server':{registryItem:id=>id==='gyro'?{}:null,originalSources:async()=>({gyro:[]})},'@/lib/component-zip.server':{componentArchive:async()=>{calls++;return new Promise(resolve=>release.push(()=>resolve(Buffer.from('zip'))));}}});
 const get=query=>route.GET(new Request('https://motiqo.test/api/components/gyro'+query),{params:Promise.resolve({id:'gyro'})});
 for(const query of ['?format=no','?format=source&format=zip','?config=a&config=b','?other=x','?format=source&config=x','?config='+'x'.repeat(4097)])assert.equal((await get(query)).status,400);
 assert.equal(calls,0);
 const pending=Array.from({length:4},()=>get(''));await new Promise(resolve=>setImmediate(resolve));assert.equal(calls,4);
 const busy=await get('');assert.equal(busy.status,503);assert.equal(busy.headers.get('Retry-After'),'1');release.splice(0).forEach(fn=>fn());assert.ok((await Promise.all(pending)).every(response=>response.status===200));
 const next=get('');await new Promise(resolve=>setImmediate(resolve));release.pop()();assert.equal((await next).status,200);
});
test('invalid settings are rejected before source reads and internal errors stay private',async()=>{
 let reads=0;const controls=load('lib/element-controls.ts');
 const zip=load('lib/component-zip.server.ts',{'./registry.server':{registryItem:()=>({}),componentBundle:async()=>{reads++;throw new Error('private path');}},'./element-controls':controls});
 await assert.rejects(()=>zip.componentArchive('gyro','bad'),TypeError);assert.equal(reads,0);
 const route=load('app/api/components/[id]/route.ts',{'@/lib/registry.server':{registryItem:()=>({})},'@/lib/component-zip.server':{componentArchive:async()=>{throw new TypeError('private path');}}});
 const response=await route.GET(new Request('https://motiqo.test/api/components/gyro'),{params:Promise.resolve({id:'gyro'})});assert.equal(response.status,400);assert.doesNotMatch(await response.text(),/private path/);
});
