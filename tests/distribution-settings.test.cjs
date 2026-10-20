const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),ts=require('typescript'),React=require('react'),{JSDOM}=require('jsdom'),{inflateRawSync}=require('node:zlib');
function load(file,mocks={}){const filename=path.resolve(__dirname,'..',file),m=new Module(filename,module);m.filename=filename;m.paths=Module._nodeModulePaths(path.dirname(filename));const normal=m.require.bind(m);m.require=id=>Object.hasOwn(mocks,id)?mocks[id]:normal(id);m._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,filename);return m.exports;}
const controls=load('lib/element-controls.ts'),manifest=require('../registry/manifest.json');

test('Thermal Smoke uses Buenos Aires while preserving custom locations',()=>{assert.equal(controls.defaultsFor('thermal-smoke').city,'Buenos Aires');assert.equal(controls.normalizeSettings('thermal-smoke',{city:'Stockholm'}).city,'Buenos Aires');assert.equal(controls.normalizeSettings('thermal-smoke',{city:'Tokyo'}).city,'Tokyo');});

test('Native canvas text settings are bounded, retain multiline words and export real arrays and booleans',()=>{
 assert.equal(controls.normalizeSettings('inkshift',{words:'ui**xNin**ja\npr**odu**ct\nd**esi**gn\nsy**stem**s\nen**gineer**ing'}).words,controls.defaultsFor('inkshift').words);assert.equal(controls.normalizeSettings('atelier',{title:'Designing the feeling of a room.'}).title,'From quiet lines to warm spaces.');assert.equal(controls.normalizeSettings('atelier',{title:'My custom room'}).title,'My custom room');
 const ink=controls.normalizeSettings('inkshift',{words:'mo**ti**qo\n**ink**\u0000',autoCycle:'disabled'});assert.equal(ink.words,'mo**ti**qo\n**ink**');assert.deepEqual(controls.decodeSettings('inkshift',controls.encodeSettings('inkshift',ink)),ink);
 assert.equal(controls.normalizeSettings('inkshift',{words:'x'.repeat(2000)}).words.length,700);assert.equal(controls.normalizeSettings('atelier',{title:'x'.repeat(400)}).title.length,160);assert.equal(controls.normalizeSettings('atelier',{title:123}).title,controls.defaultsFor('atelier').title);
 const item=manifest.items.find(i=>i.id==='inkshift'),example=controls.usageFor(item,ink);assert.match(example,/words=\{\["mo\*\*ti\*\*qo","\*\*ink\*\*"\]\}/);assert.match(example,/autoCycle=\{false\}/);assert.doesNotMatch(example,/autoCycle="disabled"/);
});

test('All moods are complete valid settings; shared payloads reject wrong versions, ids, unsafe values and prototype keys',()=>{
 for(const item of manifest.items)for(const mood of controls.moodsFor(item.id))assert.deepEqual(controls.normalizeSettings(item.id,mood.settings),mood.settings);
 const id='helix',defaults=controls.defaultsFor(id),bad=controls.normalizeSettings(id,{particleCount:Infinity,rotationSpeed:999,interactive:'<script>',violet:'url(evil)',__proto__:{evil:true}});
 assert.equal(bad.particleCount,defaults.particleCount);assert.equal(bad.rotationSpeed,controls.controlsFor(id).find(c=>c.key==='rotationSpeed').max);assert.equal(bad.interactive,defaults.interactive);assert.equal(bad.violet,defaults.violet);assert.equal(bad.evil,undefined);
 assert.equal(controls.decodeSettings(id,'x'.repeat(5000)),null);assert.equal(controls.decodeSettings(id,'{'),null);assert.equal(controls.decodeSettings(id,JSON.stringify({v:2,id,settings:{}})),null);assert.equal(controls.decodeSettings(id,controls.encodeSettings('gyro',{})),null);
 const mood=controls.moodsFor(id)[0].settings,url=controls.configurationUrl('https://motiqo.test/library?saved=1#old',id,mood);assert.equal(url.hash,'');assert.equal(url.searchParams.get('saved'),'1');assert.deepEqual(controls.decodeSettings(id,url.searchParams.get('config')),mood);
});

test('Component settings survive remounts and restore shared URLs and browser history without adding entries',async()=>{
 const dom=new JSDOM('<div id="mount"></div>',{url:'https://motiqo.test/library?element=crate'}),keys=['window','document','IS_REACT_ACT_ENVIRONMENT'],old=new Map(keys.map(k=>[k,Object.getOwnPropertyDescriptor(globalThis,k)]));
 Object.entries({window:dom.window,document:dom.window.document,IS_REACT_ACT_ENVIRONMENT:true}).forEach(([k,v])=>Object.defineProperty(globalThis,k,{value:v,writable:true,configurable:true}));
 const hook=load('components/use-component-settings.ts',{'@/lib/element-controls':controls}).default,root=require('react-dom/client').createRoot(document.getElementById('mount'));let model;
 function Fixture({initial,id='crate'}={}){model=hook(id,initial);return React.createElement('output',null,model.settings.count);}
 try{
  assert.equal(require('react-dom/server').renderToString(React.createElement(Fixture,{initial:{count:10}})),'<output>10</output>','shared props are present in the server markup');
  const historyLength=window.history.length;await React.act(()=>root.render(React.createElement(Fixture)));await React.act(()=>model.update({count:5}));assert.equal(document.querySelector('output').textContent,'5');assert.equal(window.history.length,historyLength);assert.equal(JSON.parse(window.localStorage.getItem('motiqo-settings-v1:crate')).count,5);
  await React.act(()=>root.render(null));window.history.replaceState({},'','/library?saved=1&element=crate');await React.act(()=>root.render(React.createElement(Fixture)));assert.equal(model.settings.count,5,'Saved reopens persisted configuration');
  const shared=controls.configurationUrl(window.location.href,'crate',{count:10});window.history.replaceState({},'',shared);await React.act(()=>window.dispatchEvent(new dom.window.PopStateEvent('popstate')));assert.equal(model.settings.count,10,'shared configuration wins over local storage');
  await React.act(()=>model.reset());assert.deepEqual(model.settings,controls.defaultsFor('crate'));assert.equal(controls.decodeSettings('crate',new URL(window.location.href).searchParams.get('config')).count,8);

  await React.act(()=>root.render(null));
  window.history.replaceState({},'','/library?element=water-ripple-carousel');
  window.localStorage.setItem('motiqo-settings-v1:water-ripple-carousel',JSON.stringify({autoplay:0,strength:1.4}));
  await React.act(()=>root.render(React.createElement(React.StrictMode,null,React.createElement(Fixture,{id:'water-ripple-carousel'}))));
  assert.equal(model.settings.autoplay,2500,'old autoplay-off default upgrades once');assert.equal(model.settings.strength,1.4,'other saved edits survive');
  await React.act(()=>model.update({autoplay:0}));await React.act(()=>root.render(null));
  window.history.replaceState({},'','/library?element=water-ripple-carousel');
  await React.act(()=>root.render(React.createElement(Fixture,{id:'water-ripple-carousel'})));
  assert.equal(model.settings.autoplay,0,'a later explicit autoplay-off choice survives remount');
  await React.act(()=>root.unmount());
 }finally{dom.window.close();for(const[k,v]of old){if(v)Object.defineProperty(globalThis,k,v);else delete globalThis[k];}}
});

test('ZIP downloads contain exact artwork, helpers and a configuration-specific runnable example',async()=>{
 const server=load('lib/registry.server.ts',{'./format-source.server':load('lib/format-source.server.ts')}),zip=load('lib/component-zip.server.ts',{'./registry.server':server,'./element-controls':controls});
 const archive=await zip.componentArchive('gilded-signal',null),files=new Map();let offset=0;
 while(archive.readUInt32LE(offset)===0x04034b50){const size=archive.readUInt32LE(offset+18),length=archive.readUInt16LE(offset+26),extra=archive.readUInt16LE(offset+28),name=archive.subarray(offset+30,offset+30+length).toString(),start=offset+30+length+extra,bytes=inflateRawSync(archive.subarray(start,start+size));assert.equal(bytes.length,archive.readUInt32LE(offset+22));assert.equal(zip.crc32(bytes),archive.readUInt32LE(offset+14));files.set(name,bytes);offset=start+size;}
 assert.equal(archive.readUInt32LE(offset),0x02014b50);assert.equal(archive.readUInt32LE(archive.length-22),0x06054b50);assert.equal(archive.readUInt16LE(archive.length-12),files.size);
 assert.ok(files.get('public/media/atmosphere.webp').equals(fs.readFileSync(path.resolve(__dirname,'../public/media/atmosphere.webp'))));assert.match(files.get('Example.tsx').toString(),/\.\/components\/motiqo\/gilded-card/);assert.ok(files.has('public/branding/Isotype.svg'));
 assert.match(files.get('LICENSE').toString(),/Copyright \(c\) 2026 Robert Betancourt/);assert.match(files.get('THIRD_PARTY_NOTICES.md').toString(),/excluded from the code MIT grant/);
 for(const name of ['C:/escape','a\\b','/absolute','a/../b','bad\u0000name'])await assert.rejects(()=>zip.zipFiles([{name,bytes:Buffer.alloc(0)}]),/Unsafe/);
 await assert.rejects(()=>zip.zipFiles([{name:'a',bytes:Buffer.alloc(0)},{name:'a',bytes:Buffer.alloc(0)}]),/duplicate/);
 await assert.rejects(()=>zip.zipFiles([{name:'big',bytes:Buffer.alloc(16*1024*1024+1)}]),/budget/);
 assert.equal(await zip.componentArchive('missing',null),null);await assert.rejects(()=>zip.componentArchive('gyro','malformed'),TypeError);await assert.rejects(()=>zip.zipFiles([{name:'../escape',bytes:Buffer.alloc(0)}]),/Unsafe/);assert.equal(zip.crc32(Buffer.from('123456789')),0xcbf43926);
 const route=load('app/api/components/[id]/route.ts',{'@/lib/component-zip.server':zip,'@/lib/registry.server':server});const get=(id,query='')=>route.GET(new Request(`https://motiqo.test/api/components/${id}${query}`),{params:Promise.resolve({id})});
 assert.equal((await get('missing')).status,404);const source=await get('gyro','?format=source');assert.equal(source.status,200);assert.equal((await source.json()).files.length,3);assert.equal((await get('missing','?format=source')).status,404);assert.equal((await get('gyro','?config=bad')).status,400);const response=await get('gyro',`?config=${encodeURIComponent(controls.encodeSettings('gyro',controls.moodsFor('gyro')[1].settings))}`);assert.equal(response.status,200);assert.equal(response.headers.get('content-type'),'application/zip');assert.match(response.headers.get('content-disposition'),/motiqo-gyro.zip/);assert.ok((await response.arrayBuffer()).byteLength>1000);
});
