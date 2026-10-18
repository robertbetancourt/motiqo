const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),ts=require('typescript'),{JSDOM}=require('jsdom');
const filename=path.resolve(__dirname,'../lib/preview-demo.ts'),entry=new Module(filename,module);
entry._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,filename);
const {startPreviewDemo}=entry.exports;

function setup(html){
 const dom=new JSDOM(`<main>${html}</main>`,{pretendToBeVisual:true}),jobs=new Map(),listeners=new Set();let now=0,serial=0;
 const media={matches:false,addEventListener:(_,fn)=>listeners.add(fn),removeEventListener:(_,fn)=>listeners.delete(fn)};
 dom.window.matchMedia=()=>media;
 const values={window:dom.window,document:dom.window.document,PointerEvent:dom.window.MouseEvent,WheelEvent:dom.window.WheelEvent,KeyboardEvent:dom.window.KeyboardEvent,performance:{now:()=>now},requestAnimationFrame:fn=>{jobs.set(++serial,fn);return serial;},cancelAnimationFrame:id=>jobs.delete(id)},old=new Map(Object.keys(values).map(k=>[k,Object.getOwnPropertyDescriptor(globalThis,k)]));
 Object.entries(values).forEach(([k,v])=>Object.defineProperty(globalThis,k,{value:v,writable:true,configurable:true}));
 const root=document.querySelector('main');
 root.querySelectorAll('*').forEach(node=>node.getBoundingClientRect=()=>({left:100,top:50,width:300,height:200}));
 return{root,dom,jobs,listeners,media,advance(count=1){for(let i=0;i<count;i++){now+=40;const batch=[...jobs.values()];jobs.clear();batch.forEach(fn=>fn(now));}},reduce(value){media.matches=value;listeners.forEach(fn=>fn());},restore(){dom.window.close();for(const[k,v]of old){if(v)Object.defineProperty(globalThis,k,v);else delete globalThis[k];}}};
}

test('Hover demos sweep inside the scene, rest, repeat and release all work on pause/unmount',()=>{
 const env=setup('<div class="helix"></div>'),target=env.root.firstElementChild,points=[];let entered=0,left=0,clicked=0;
 target.addEventListener('pointermove',e=>points.push([e.clientX,e.clientY]));target.addEventListener('pointerenter',()=>entered++);target.addEventListener('pointerleave',()=>left++);target.addEventListener('click',()=>clicked++);
 try{
  const stop=startPreviewDemo(env.root,'helix');env.advance(100);assert.equal(entered,1);assert.ok(points.length>50);assert.notDeepEqual(points[0],points.at(-1));assert.ok(points.every(([x,y])=>x>100&&x<400&&y>50&&y<250));
  env.advance(60);assert.equal(left,1);const rested=points.length;env.advance(25);assert.equal(points.length,rested);env.advance(30);assert.equal(entered,2);
  env.reduce(true);assert.equal(env.jobs.size,0);assert.equal(left,2);const paused=points.length;env.advance(20);assert.equal(points.length,paused);env.reduce(false);env.advance();assert.equal(entered,3);
  Object.defineProperty(document,'hidden',{value:true,configurable:true});document.dispatchEvent(new env.dom.window.Event('visibilitychange'));assert.equal(env.jobs.size,0);assert.equal(left,3);
  Object.defineProperty(document,'hidden',{value:false,configurable:true});document.dispatchEvent(new env.dom.window.Event('visibilitychange'));env.advance();stop();assert.equal(env.jobs.size,0);assert.equal(env.listeners.size,0);assert.equal(clicked,0);
 }finally{env.restore();}
});

test('Sleeve automatically browses forward and back without sending scroll to the page',()=>{
 const env=setup('<div class="sleeve" data-cursor="0"><div class="sleeve-viewport"></div></div>'),sleeve=env.root.firstElementChild,screen=sleeve.firstElementChild;let min=Infinity,max=0,pageScroll=0,forward=false,back=false;
 screen.addEventListener('wheel',event=>{const before=Number(sleeve.dataset.cursor),next=Math.max(0,Math.min(19,before+event.deltaY/250));forward||=next>before;back||=next<before;min=Math.min(min,next);max=Math.max(max,next);sleeve.dataset.cursor=next.toFixed(3);});env.root.addEventListener('wheel',()=>pageScroll++);
 try{const stop=startPreviewDemo(env.root,'sleeve');env.advance(260);assert.ok(forward&&back);assert.ok(max>2.9&&min<.1);assert.equal(pageScroll,0);stop();assert.equal(env.jobs.size,0);}finally{env.restore();}
});

test('Reduced motion starts idle, unrelated scenes do not allocate a loop, late scenes can load',()=>{
 const env=setup('');
 try{assert.equal(startPreviewDemo(env.root,'charge'),undefined);assert.equal(env.jobs.size,0);env.reduce(true);const stop=startPreviewDemo(env.root,'helix');assert.equal(env.jobs.size,0);env.reduce(false);env.advance();env.root.innerHTML='<div class="helix"></div>';let moves=0;env.root.firstElementChild.addEventListener('pointermove',()=>moves++);env.advance();assert.equal(moves,1);stop();assert.equal(env.listeners.size,0);}finally{env.restore();}
});

test('Optical hover reaches React handlers inside an inert card without activating its button',async()=>{
 const env=setup('<div id="mount"></div>'),React=require('react'),old=Object.getOwnPropertyDescriptor(globalThis,'IS_REACT_ACT_ENVIRONMENT');globalThis.IS_REACT_ACT_ENVIRONMENT=true;
 const root=require('react-dom/client').createRoot(document.getElementById('mount'));let enters=0,moves=0,leaves=0,clicks=0,stop;
 try{
  await React.act(()=>root.render(React.createElement('div',{inert:true},React.createElement('button',{className:'mq-optical-button',onPointerEnter:()=>enters++,onPointerMove:()=>moves++,onPointerLeave:()=>leaves++,onClick:()=>clicks++},'Optical'))));
  stop=startPreviewDemo(env.root,'optical-button');env.advance(10);assert.equal(enters,1);assert.ok(moves>0);env.advance(140);assert.equal(leaves,1);assert.equal(clicks,0);stop();stop=undefined;
 }finally{stop?.();await React.act(()=>root.unmount());if(old)Object.defineProperty(globalThis,'IS_REACT_ACT_ENVIRONMENT',old);else delete globalThis.IS_REACT_ACT_ENVIRONMENT;env.restore();}
});

test('All requested pointer-driven previews receive local input without leaking it to window',()=>{
 const targets={gyro:'gyro',drawer:'drawer',arbor:'arbor',lantern:'lantern',crate:'crate-stage',pulse:'pulse','event-horizon':'liquid-relic',sentiment:'sentiment-plot','opaline-orb':'mq-opaline','orbit-agent':'mq-orbit-agent'};
 for(const[id,className]of Object.entries(targets)){
  const env=setup(`<div class="${className}"></div>`);let moves=0,globalMoves=0;env.root.firstElementChild.addEventListener('pointermove',()=>moves++);window.addEventListener('pointermove',()=>globalMoves++);
  try{const stop=startPreviewDemo(env.root,id);env.advance(5);assert.ok(moves>0,`${id} receives a demo`);if(id!=='orbit-agent')assert.equal(globalMoves,0,`${id} stays scoped to its card`);stop();}finally{env.restore();}
 }
});

test('Atelier uses a continuous closed path with no rest gap or jump at a loop boundary',()=>{
 const env=setup('<div class="atelier"></div>'),points=[];let leaves=0;
 env.root.firstElementChild.addEventListener('pointermove',e=>points.push([e.clientX,e.clientY]));env.root.firstElementChild.addEventListener('pointerleave',()=>leaves++);
 try{const stop=startPreviewDemo(env.root,'atelier');env.advance(610);assert.equal(leaves,0);assert.equal(points.length,610);for(let i=1;i<points.length;i++)assert.ok(Math.hypot(points[i][0]-points[i-1][0],points[i][1]-points[i-1][1])<3,'brush follows a smooth trajectory across loops');stop();}finally{env.restore();}
});
