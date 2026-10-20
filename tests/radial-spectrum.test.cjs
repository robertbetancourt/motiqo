const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),ts=require('typescript-compiler-api'),React=require('react'),{JSDOM}=require('jsdom');
function load(name,mocks={}){const filename=path.resolve(__dirname,'../components/originals',name),m=new Module(filename,module);m.filename=filename;m.paths=Module._nodeModulePaths(path.dirname(filename));const normal=m.require.bind(m);m.require=id=>Object.hasOwn(mocks,id)?mocks[id]:normal(id);m._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText,filename);return m.exports;}

test('Radial needles seek the recording, show progress, follow FFT rather than a clock pattern, and keep playback available',async()=>{
 const dom=new JSDOM('<div id="mount"></div>',{url:'https://motiqo.test'}),saved=new Map(),engines=[],strokes=[];
 let tick,blocked=true,pending,frequency=0,saturated=false;
 const globals={window:dom.window,document:dom.window.document,IS_REACT_ACT_ENVIRONMENT:true,IntersectionObserver:class{observe(){}disconnect(){}}};
 for(const[k,v]of Object.entries(globals)){saved.set(k,Object.getOwnPropertyDescriptor(globalThis,k));Object.defineProperty(globalThis,k,{value:v,configurable:true,writable:true});}
 Object.defineProperty(document,'hidden',{value:false,configurable:true});
 Object.defineProperties(dom.window.HTMLElement.prototype,{clientWidth:{get:()=>600},clientHeight:{get:()=>600}});
 const g={setTransform(){},fillRect(){},beginPath(){},moveTo(x,y){this.from=[x,y];},lineTo(x,y){this.to=[x,y];},stroke(){strokes.push({from:this.from,to:this.to,ink:this.strokeStyle,width:this.lineWidth});}};
 dom.window.HTMLCanvasElement.prototype.getContext=()=>g;
 dom.window.HTMLCanvasElement.prototype.getBoundingClientRect=()=>({left:0,top:0,width:600,height:600});
 const {default:RadialSpectrum}=load('radial-spectrum.tsx',{
  './spectrum-analysis':load('spectrum-analysis.ts'),
  './effect-runtime':{effectRuntime:(_host,surface,render)=>{surface.width=600;tick=render;return{invalidate(){},dispose(){}};}},
  './score-engine':{createScoreEngine(source){
   const media=document.createElement('audio');Object.defineProperty(media,'duration',{value:200,writable:true});
   const e={source,media,plays:0,pauses:0,disposed:false,context:{sampleRate:48000},analyser:{getByteFrequencyData(bins){bins.fill(saturated?255:0);if(!saturated)bins.fill(230,frequency,frequency+8);},getByteTimeDomainData(wave){wave.fill(saturated?255:128);}},
    async play(){e.plays++;if(blocked)throw Object.assign(new Error('blocked'),{name:'NotAllowedError'});if(pending)await pending;},async pause(){e.pauses++;},async dispose(){e.disposed=true;}};
   engines.push(e);return e;
  }}
 });
 const root=require('react-dom/client').createRoot(document.getElementById('mount'));
 const render=props=>React.act(async()=>root.render(React.createElement(RadialSpectrum,props)));
 const paint=(time=0)=>{strokes.length=0;tick(time,0);return strokes.map(s=>({...s}));};
 try{
  await render({compact:true,autoDemo:true});assert.equal(engines.length,0,'gallery cards never load or autoplay audio');
  await render({});const first=engines[0];assert.equal(first.plays,1,'expanded view attempts autoplay');
  const play=document.querySelector('button'),slider=document.querySelector('[role=slider]');assert.equal(play.disabled,false);assert.equal(play.getAttribute('aria-pressed'),'false');assert.equal(document.querySelector('[role=status]'),null,'browser policy does not become a load error');
  blocked=false;await React.act(async()=>play.click());assert.equal(play.getAttribute('aria-pressed'),'true','manual play recovers from blocked autoplay');
  await React.act(async()=>first.media.dispatchEvent(new dom.window.Event('loadedmetadata')));
  await React.act(async()=>first.media.dispatchEvent(new dom.window.Event('timeupdate')));
  const a=paint(0),b=paint(20);assert.deepEqual(a,b,'unchanged audio produces unchanged needles at different animation times');
  frequency=100;const high=paint(20);assert.notDeepEqual(a.map(s=>s.to),high.map(s=>s.to),'a different frequency distribution moves different needles');
  const angle=90*Math.PI/180; // The bottom needle is 145 degrees into the 290-degree arc.
  await React.act(async()=>slider.dispatchEvent(new dom.window.MouseEvent('click',{clientX:300+222*Math.cos(angle),clientY:307.2+222*Math.sin(angle),bubbles:true})));
  assert.ok(Math.abs(first.media.currentTime-100)<.001);assert.equal(slider.getAttribute('aria-valuenow'),'100');
  const progress=paint();assert.ok(progress.every(s=>s.width===1.25),'progress never adds thicker needles');assert.ok(progress.some(s=>s.ink==='rgba(245,247,250,0.95)'),'elapsed needles are highlighted');
  saturated=true;const loud=paint();assert.ok(loud.every(s=>Math.hypot(s.to[0]-s.from[0],s.to[1]-s.from[1])<=600*.077+.001),'even saturated FFT and waveform cannot grow past the bounded needle height');assert.ok(Math.max(...loud.map(s=>Math.hypot(s.to[0]-s.from[0],s.to[1]-s.from[1])))-Math.min(...loud.map(s=>Math.hypot(s.to[0]-s.from[0],s.to[1]-s.from[1])) )<.001,'equal audio has no protruding progress needles');saturated=false;paint();
  const pauses=first.pauses;Object.defineProperty(document,'hidden',{value:true,configurable:true});await React.act(async()=>document.dispatchEvent(new dom.window.Event('visibilitychange')));await React.act(async()=>window.dispatchEvent(new dom.window.Event('blur')));assert.equal(first.pauses,pauses,'backgrounding does not pause audio');assert.equal(play.getAttribute('aria-pressed'),'true');Object.defineProperty(document,'hidden',{value:false,configurable:true});
  await React.act(async()=>slider.dispatchEvent(new dom.window.KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true})));assert.equal(first.media.currentTime,105);
  await React.act(async()=>slider.dispatchEvent(new dom.window.KeyboardEvent('keydown',{key:'End',bubbles:true})));assert.equal(first.media.currentTime,200);
  await React.act(async()=>slider.dispatchEvent(new dom.window.KeyboardEvent('keydown',{key:'Home',bubbles:true})));assert.equal(first.media.currentTime,0);
  await React.act(async()=>slider.dispatchEvent(new dom.window.MouseEvent('click',{clientX:300,clientY:300,bubbles:true})));assert.equal(first.media.currentTime,0,'center clicks do not seek');
  const plays=first.plays;await React.act(async()=>slider.dispatchEvent(new dom.window.MouseEvent('click',{clientX:522,clientY:307.2,bubbles:true})));assert.ok(Math.abs(first.media.currentTime-55/290*200)<.001,'the right side of the ring seeks the track');assert.equal(first.plays,plays);assert.equal(first.pauses,pauses);assert.equal(document.querySelector('.mq-score-center').tagName,'DIV','the text block is no longer an oversized button');assert.equal(play.className,'mq-score-play');assert.equal(window.getComputedStyle(document.querySelector('.mq-score-center')).pointerEvents,'none');assert.equal(window.getComputedStyle(play).pointerEvents,'auto');
  await render({track:'temporal'});assert.equal(first.disposed,true);assert.equal(engines[1].source,'/media/music/Temporal.mp3');assert.equal(engines[1].plays,1);assert.equal(slider.getAttribute('aria-valuenow'),'0');
  await render({track:'temporal',paused:true});assert.equal(play.disabled,false);await React.act(async()=>play.click());assert.equal(play.getAttribute('aria-pressed'),'true','render pause does not disable explicit playback');
  await React.act(async()=>play.click());assert.equal(play.getAttribute('aria-pressed'),'false');
  let resolve;pending=new Promise(r=>resolve=r);await React.act(async()=>play.click());await render({track:'momentum',paused:true});await React.act(async()=>{resolve();await Promise.resolve();});assert.equal(play.getAttribute('aria-pressed'),'false','a stale play completion cannot restart a replaced song');
 }finally{await React.act(async()=>root.unmount());assert.ok(engines.every(e=>e.disposed));dom.window.close();for(const[k,v]of saved)v?Object.defineProperty(globalThis,k,v):delete globalThis[k];}
});
