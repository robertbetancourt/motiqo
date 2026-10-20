const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),ts=require('typescript-compiler-api'),React=require('react'),{JSDOM}=require('jsdom');
function load(name,mocks={}){const filename=path.resolve(__dirname,'../components/originals',name),m=new Module(filename,module);m.filename=filename;m.paths=Module._nodeModulePaths(path.dirname(filename));const normal=m.require.bind(m);m.require=id=>Object.hasOwn(mocks,id)?mocks[id]:normal(id);m._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,filename);return m.exports;}

test('Spectrum responds to actual frequency bands and waveform energy, including silence',()=>{
 const {spectrumBand,spectrumRms}=load('spectrum-analysis.ts');
 const bins=new Uint8Array(512),wave=new Uint8Array(1024).fill(128);
 assert.equal(spectrumBand(bins,.2),0);assert.equal(spectrumRms(wave),0);
 bins.fill(255,1,6);assert.ok(spectrumBand(bins,.1)>.8);assert.equal(spectrumBand(bins,.9),0);
 bins.fill(0);bins.fill(230,90,150);assert.ok(spectrumBand(bins,.85)>.6);assert.equal(spectrumBand(bins,.1),0);
 for(let i=0;i<wave.length;i++)wave[i]=128+Math.round(Math.sin(i*.2)*90);
 assert.ok(spectrumRms(wave)>.45&&spectrumRms(wave)<.55);
});

test('Botanical growth is deterministic, diverse, bounded and responds to density and arrangement',()=>{
 const {botanicalPlan}=load('garden-botany.tsx');
 assert.deepEqual(botanicalPlan(907,1.5),botanicalPlan(907,1.5));
 const specimens=Array.from({length:40},(_,i)=>botanicalPlan(i*137+2061,1.5));
 assert.ok(new Set(specimens.flat().map(p=>p.species)).size===4);
 assert.ok(specimens.flat().some(p=>p.y>100));assert.ok(specimens.flat().some(p=>p.y<0));
 assert.ok(new Set(specimens.flat().map(p=>p.rotation)).size>30);
 for(const p of specimens.flat()){assert.ok(p.size>0&&p.size<1);assert.ok(p.leaves>=2&&p.leaves<=4);}
 assert.ok(botanicalPlan(907,2).length>=botanicalPlan(907,.5).length);
 assert.notDeepEqual(botanicalPlan(907,1.5,'meadow'),botanicalPlan(907,1.5,'climbing'));
});

test('Every carousel navigation renders a fresh GPU transition without an opaque fallback covering it',async()=>{
 const dom=new JSDOM('<div id="mount"></div>',{url:'https://motiqo.test'}),saved=new Map();
 const globals={window:dom.window,document:dom.window.document,IS_REACT_ACT_ENVIRONMENT:true,
  matchMedia:()=>({matches:false}),IntersectionObserver:class{observe(){}disconnect(){}},
  Image:class{width=1280;height=720;set src(v){this._src=v;if(v)queueMicrotask(()=>this.onload?.());}get src(){return this._src;}},HTMLCanvasElement:dom.window.HTMLCanvasElement};
 for(const[k,v]of Object.entries(globals)){saved.set(k,Object.getOwnPropertyDescriptor(globalThis,k));Object.defineProperty(globalThis,k,{value:v,configurable:true,writable:true});}
 const draws=[];let tick;
 const art=load('carousel-art.ts');
 const {OpticalGallery}=load('optical-gallery.tsx',{
  './carousel-art':{...art,paintGalleryStudy:()=>{const c=document.createElement('canvas');c.width=1280;c.height=720;return c;}},
  './gallery-shaders':{galleryFragment:''},
  './native-gl':{nativeClamp:(v,a,b)=>Math.max(a,Math.min(b,v)),createNativeGL:()=>({pass:()=>({}),texture:()=>({id:Math.random()}),upload(){},dispose(){},draw(_p,_t,u){draws.push(u);}})},
  './effect-runtime':{effectRuntime:(_h,c,render)=>{c.width=800;c.height=600;tick=render;return{invalidate(){},dispose(){}};}}
 });
 const root=require('react-dom/client').createRoot(document.getElementById('mount'));
 try{
  await React.act(()=>root.render(React.createElement(OpticalGallery,{mode:'water',defaults:[{image:'/a'},{image:'/b'},{image:'/c'}],duration:400})));
  await React.act(async()=>{await Promise.resolve();tick(0,0);});
  const next=document.querySelector('[aria-label="Next slide"]');
  let previousTexture;
  for(let i=0;i<4;i++){
   await React.act(()=>next.click());await React.act(()=>tick(i,.1));
   const u=draws.at(-1);assert.equal(u.uProgress,.25);assert.notEqual(u.uFrom.texture,u.uTo.texture);
   if(previousTexture)assert.equal(u.uFrom.texture,previousTexture);
   await React.act(()=>tick(i,.4));previousTexture=u.uTo.texture;
   assert.equal(document.querySelector('.mq-gallery-fallback'),null,'GPU remains visible after transition completion');
   assert.equal(document.querySelector('.mq-gallery').dataset.slide,String((i+1)%3));
  }
  assert.equal(document.querySelector('.mq-gallery-pagination'),null);
  const changes=[],defaults=[{image:'/a'},{image:'/b'},{image:'/c'}];
  await React.act(()=>root.render(React.createElement(OpticalGallery,{mode:'water',defaults,compact:true,duration:1250,autoplay:4000,onChange:i=>changes.push(i)})));
  await React.act(async()=>{await Promise.resolve();tick(0,0);});
  const frames=async n=>{await React.act(()=>{for(let j=0;j<n;j++)tick(0,.04);});};
  await frames(99);assert.equal(changes.length,0);await frames(1);assert.deepEqual(changes,[1]);
  await frames(99);assert.equal(changes.length,1);await frames(1);assert.deepEqual(changes,[1,2],'four seconds between reveal starts, not four plus transition duration');
  await React.act(()=>root.render(React.createElement(OpticalGallery,{mode:'water',defaults,compact:true,duration:1250,autoplay:4000,paused:true,onChange:i=>changes.push(i)})));
  await frames(200);assert.equal(changes.length,2,'autoplay obeys explicit pause');

 }finally{await React.act(()=>root.unmount());dom.window.close();for(const[k,v]of saved)v?Object.defineProperty(globalThis,k,v):delete globalThis[k];}
});

test('Library ships both local recordings as binary assets, with track before the remaining controls',()=>{
 const m=require('../registry/manifest.json'),item=m.items.find(i=>i.id==='radial-spectrum');
 assert.equal(item.controls[0].key,'track');assert.ok(!item.controls.some(c=>c.key==='audioUrl'));
 for(const name of ['Momentum','Temporal']){const asset=item.files.find(f=>f.source===`public/media/music/${name}.mp3`);assert.ok(asset);assert.ok(fs.readFileSync(path.resolve(__dirname,'..',asset.source)).equals(fs.readFileSync(path.resolve(__dirname,'../assets/music',`${name}.mp3`))));}
});
