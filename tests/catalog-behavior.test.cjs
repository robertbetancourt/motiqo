const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),ts=require('typescript-compiler-api'),React=require('react'),{JSDOM}=require('jsdom');
function loader(mocks={}){const cache=new Map();return function load(relative){const file=path.resolve(__dirname,'..',relative);if(cache.has(file))return cache.get(file).exports;const m=new Module(file,module);cache.set(file,m);m.filename=file;m.paths=Module._nodeModulePaths(path.dirname(file));const normal=m.require.bind(m);m.require=id=>Object.hasOwn(mocks,id)?mocks[id]:id.startsWith('.')?load(path.relative(path.resolve(__dirname,'..'),path.resolve(path.dirname(file),id))+(path.extname(id)?'':fs.existsSync(path.resolve(path.dirname(file),id)+'.tsx')?'.tsx':'.ts')):normal(id);m._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText,file);return m.exports;};}
function fixture(){
 const dom=new JSDOM('<div id="root"></div>',{pretendToBeVisual:true}),saved=new Map(),clocks=[],gpus=[],draws=[];let fail=false;
 for(const[key,value]of Object.entries({window:dom.window,document:dom.window.document,IS_REACT_ACT_ENVIRONMENT:true,matchMedia:()=>({matches:false})})){saved.set(key,Object.getOwnPropertyDescriptor(globalThis,key));Object.defineProperty(globalThis,key,{value,configurable:true,writable:true});}
 const context=new Proxy({createLinearGradient:()=>({addColorStop(){}}),createRadialGradient:()=>({addColorStop(){}})},{get:(target,key)=>target[key]??(()=>{})});
 dom.window.HTMLCanvasElement.prototype.getContext=()=>fail?null:context;
 const effectRuntime=(host,canvas,draw,paused,resize)=>{const clock={disposed:false,paused,draw,invalidate(){if(!this.disposed){resize?.(320,320,1);draw(1,0);}},dispose(){this.disposed=true;}};clocks.push(clock);clock.invalidate();return clock;};
 const gpu={createNativeGL(){if(fail)throw Error('No GPU');const owner={disposed:false,pass:()=>({}),draw:(_,__,uniforms)=>draws.push(uniforms),dispose(){this.disposed=true;}};gpus.push(owner);return owner;},nativeClamp:(v,a,b)=>Math.max(a,Math.min(b,Number.isFinite(v)?v:a)),nativeColor:()=>[1,.5,.2]};
 const root=require('react-dom/client').createRoot(document.getElementById('root'));
 return{dom,root,clocks,gpus,draws,gpu,effectRuntime,setFail(value){fail=value;},async render(Component,props={}){await React.act(async()=>this.root.render(React.createElement(React.StrictMode,null,React.createElement(Component,props))));},async close(){await React.act(async()=>this.root.unmount());dom.window.close();for(const[k,d]of saved)d?Object.defineProperty(globalThis,k,d):delete globalThis[k];},assertDisposed(){assert.ok(clocks.every(c=>c.disposed));assert.ok(gpus.every(g=>g.disposed));}};
}
for(const[file,name,label]of [['lenticular-button','LenticularButton','Lenticular Button'],['photon-button','PhotonButton','Photon Button'],['optical-button','OpticalButton','Optical Button'],['spectral-button','SpectralButton','Spectral Button'],['caustic-button','CausticButton','Caustic Button'],['prism-button','PrismButton','Prism Button']]){
 test(`${file}: native click, disabled state, props updates, fallback, context recovery and StrictMode cleanup`,async()=>{
  const f=fixture();let clicks=0;const log=console.error;console.error=()=>{};
  try{const load=loader({'./native-gl':f.gpu,'./effect-runtime':{effectRuntime:f.effectRuntime}}),Component=load(`components/originals/${file}.tsx`)[name];
   await f.render(Component,{onClick:()=>clicks++});const button=document.querySelector('button');assert.equal(button.type,'button');assert.match(button.textContent,new RegExp(label));await React.act(async()=>button.click());assert.equal(clicks,1);
   const count=f.gpus.length;await f.render(Component,{disabled:true,paused:true,children:'Custom label',onClick:()=>clicks++});button.click();assert.equal(clicks,1);assert.match(button.textContent,/Custom label/);assert.equal(f.gpus.length,count);assert.equal(f.clocks.at(-1).paused(),true);
   await React.act(async()=>button.querySelector('canvas').dispatchEvent(new f.dom.window.Event('webglcontextlost',{cancelable:true})));assert.match(button.textContent,/Graphics unavailable/);
   await React.act(async()=>button.querySelector('canvas').dispatchEvent(new f.dom.window.Event('webglcontextrestored')));assert.ok(f.gpus.length>count);
   await React.act(async()=>f.root.unmount());f.assertDisposed();
   // Recreate the root for an actual initialization failure; native button remains usable.
   f.root=require('react-dom/client').createRoot(document.getElementById('root'));f.setFail(true);await f.render(Component,{onClick:()=>clicks++});document.querySelector('button').click();assert.equal(clicks,2);assert.match(document.querySelector('[role="status"]').textContent,/Graphics unavailable/);
  }finally{console.error=log;await f.close();f.assertDisposed();}
 });
}
test('thermal-smoke: bounded temperature, text-safe labels, live uniforms, pause and GPU failure',async()=>{
 const f=fixture(),log=console.error;console.error=()=>{};try{const load=loader({'./native-gl':f.gpu,'./effect-runtime':{effectRuntime:f.effectRuntime}}),Component=load('components/originals/thermal-smoke.tsx').default;
  await f.render(Component,{city:'<script>city</script>',temperature:Infinity,autoTriggerIntro:false,paused:true});assert.equal(document.querySelector('script'),null);assert.match(document.querySelector('section').getAttribute('aria-label'),/<script>city/);assert.ok(!document.body.textContent.includes('NaN'));assert.equal(f.clocks.at(-1).paused(),true);
  const count=f.gpus.length;await f.render(Component,{temperature:30,autoTriggerIntro:false,smokeDensity:99,flowSpeed:NaN});assert.equal(f.gpus.length,count);assert.equal(f.draws.at(-1).uDensity,2.5);assert.equal(f.draws.at(-1).uSpeed,0);assert.match(document.querySelector('.mq-thermal-temperature').getAttribute('aria-label'),/30 degrees/);
  await React.act(async()=>f.root.unmount());f.root=require('react-dom/client').createRoot(document.getElementById('root'));f.setFail(true);await f.render(Component);assert.ok(document.querySelector('.mq-thermal-smoke-failed'));assert.ok(document.querySelector('h2').textContent);
 }finally{console.error=log;await f.close();f.assertDisposed();}
});
test('clustered: bounded draw inputs, pause propagation, canvas failure and lifecycle cleanup',async()=>{
 const f=fixture();try{const Component=loader({'./effect-runtime':{effectRuntime:f.effectRuntime}})('components/originals/clustered.tsx').default;
  await f.render(Component,{strandCount:Infinity,clusterCount:-8,colorPalette:['bad'],paused:true});assert.ok(document.querySelector('[role="img"]').getAttribute('aria-label'));assert.equal(f.clocks.at(-1).paused(),true);
  const count=f.clocks.length;await f.render(Component,{strandCount:100,paused:false});assert.equal(f.clocks.length,count);assert.equal(f.clocks.at(-1).paused(),false);
  await React.act(async()=>f.root.unmount());f.root=require('react-dom/client').createRoot(document.getElementById('root'));f.setFail(true);await f.render(Component);assert.equal(document.querySelector('.mq-clustered').dataset.failed,'true');
 }finally{await f.close();f.assertDisposed();}
});
test('quantum-core: live scene settings, pause, context loss/recovery, failed initialization and disposal',async()=>{
 const f=fixture(),owners=[],log=console.error;console.error=()=>{};let fail=false;try{const Component=loader({'./quantum-scene':{createQuantumScene:(surface,compact,getOptions)=>{if(fail)throw Error('No GPU');const owner={getOptions,syncs:0,disposed:false,sync(){this.syncs++;},dispose(){this.disposed=true;}};owners.push(owner);return owner;}}})('components/originals/quantum-core.tsx').default;
  await f.render(Component);assert.ok(document.querySelector('[role="img"]').getAttribute('aria-label'));const count=owners.length;await f.render(Component,{paused:true,finCount:12});assert.equal(owners.length,count);assert.equal(owners.at(-1).getOptions().paused,true);assert.equal(owners.at(-1).getOptions().finCount,12);
  const canvas=document.querySelector('canvas');await React.act(async()=>canvas.dispatchEvent(new f.dom.window.Event('webglcontextlost',{cancelable:true})));assert.equal(owners.at(-1).disposed,true);await React.act(async()=>canvas.dispatchEvent(new f.dom.window.Event('webglcontextrestored')));assert.ok(owners.length>count);
  fail=true;await f.render(Component,{compact:true});assert.equal(document.querySelector('.mq-quantum').dataset.failed,'true');
 }finally{console.error=log;await f.close();assert.ok(owners.every(o=>o.disposed));}
});
test('quantum-core: composite pass retains the real render-target texture without cloning it',()=>{
 const THREE=require('three'),target=new THREE.WebGLRenderTarget(1,1),warnings=[],normal=console.warn;console.warn=(...args)=>warnings.push(args.join(' '));let pass;
 try{const {createQuantumCompositePass}=loader({'./effect-runtime':{}})('components/originals/quantum-scene.ts');pass=createQuantumCompositePass(target.texture);assert.equal(pass.uniforms.bloomTexture.value,target.texture);assert.equal(pass.material.uniforms.bloomTexture.value,target.texture);assert.deepEqual(warnings,[]);}finally{console.warn=normal;pass?.dispose();target.dispose();}
});
test('gilded-signal: readiness, flip, paused/failed controls, delayed imports and cleanup',async()=>{
 const f=fixture(),owners=[];try{const Component=loader({'./gilded-scene':{createGildedScene:(canvas,options)=>{const owner={options,flips:0,disposed:false,setPaused(v){this.paused=v;},flip(){this.flips++;},dispose(){this.disposed=true;}};owners.push(owner);queueMicrotask(options.onReady);return owner;}}})('components/originals/gilded-card.tsx').default;
  await f.render(Component);const button=document.querySelector('button');assert.equal(button.disabled,false);await React.act(async()=>button.click());assert.equal(owners.at(-1).flips,1);const count=owners.length;await f.render(Component,{paused:true});assert.equal(owners.length,count);assert.equal(owners.at(-1).paused,true);assert.equal(button.disabled,true);
  await React.act(async()=>owners.at(-1).options.onLost());assert.ok(document.querySelector('.gc-failed'));assert.equal(button.disabled,true);
  await f.render(Component,{compact:true});assert.equal(document.querySelector('button'),null);
 }finally{await f.close();assert.ok(owners.every(o=>o.disposed));}
});
