const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),ts=require('typescript-compiler-api'),React=require('react');
const {JSDOM}=require('jsdom');
function load(file,overrides={}){const filename=path.resolve(__dirname,'..',file),entry=new Module(filename,module);entry.filename=filename;entry.paths=Module._nodeModulePaths(path.dirname(filename));const normal=entry.require.bind(entry);entry.require=id=>overrides[id]??(id.endsWith('.module.css')?{default:new Proxy({},{get:(_,key)=>String(key)})}:normal(id));entry._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{fileName:filename,compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText,filename);return entry.exports;}
async function environment(run){const dom=new JSDOM('<div id="mount"></div>',{pretendToBeVisual:true,url:'http://localhost/hero'}),frames=new Map(),sizes=[],intersections=[],mediaEvents=new Set();let serial=0;
 const media={matches:false,addEventListener:(_,f)=>mediaEvents.add(f),removeEventListener:(_,f)=>mediaEvents.delete(f)};
 class Size{constructor(fn){this.fn=fn;sizes.push(this);}observe(){this.fn([{contentRect:{width:1280,height:900}}]);}disconnect(){this.off=true;}}
 class Visible{constructor(fn){this.fn=fn;intersections.push(this);}observe(){}disconnect(){this.off=true;}}
 const globals={window:dom.window,document:dom.window.document,navigator:dom.window.navigator,HTMLElement:dom.window.HTMLElement,ResizeObserver:Size,IntersectionObserver:Visible,matchMedia:()=>media,requestAnimationFrame:f=>{frames.set(++serial,f);return serial;},cancelAnimationFrame:id=>frames.delete(id),IS_REACT_ACT_ENVIRONMENT:true},previous=new Map(Object.keys(globals).map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)]));Object.entries(globals).forEach(([key,value])=>Object.defineProperty(globalThis,key,{value,writable:true,configurable:true}));
 window.scrollTo=()=>{};const root=require('react-dom/client').createRoot(document.getElementById('mount'));
 try{await run({dom,root,frames,sizes,intersections,media,mediaEvents,tick(time=1000){const batch=[...frames.values()];frames.clear();batch.forEach(f=>f(time));}});}finally{await React.act(()=>root.unmount());dom.window.close();for(const[key,value]of previous){if(value)Object.defineProperty(globalThis,key,value);else delete globalThis[key];}}
}
function sceneClock(){let draw,disposed=0;return{api:{heroClock:(host,fn,resize)=>{draw=fn;resize?.(1280,900);fn({time:0,dt:1/60,still:false});return{invalidate:()=>fn({time:1,dt:1/60,still:false}),dispose:()=>disposed++};}},get disposed(){return disposed;},draw:(time,dt,still=false)=>draw({time,dt,still})};}
test('Hero clock sleeps offscreen, hidden and under reduced motion, then releases observers',()=>environment(async e=>{
 const {heroClock}=load('components/heroes/hero-clock.ts'),host=document.getElementById('mount'),drawn=[];const clock=heroClock(host,frame=>drawn.push(frame));assert.equal(e.frames.size,1);e.tick();assert.equal(e.frames.size,1);assert.equal(host.dataset.ready,'true');
 e.media.matches=true;e.mediaEvents.forEach(f=>f());e.tick(1020);assert.equal(drawn.at(-1).still,true);assert.equal(e.frames.size,0);
 e.media.matches=false;e.mediaEvents.forEach(f=>f());e.intersections[0].fn([{isIntersecting:false}]);assert.equal(e.frames.size,0);e.intersections[0].fn([{isIntersecting:true}]);assert.equal(e.frames.size,1);
 Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new e.dom.window.Event('visibilitychange'));assert.equal(e.frames.size,0);Object.defineProperty(document,'hidden',{configurable:true,value:false});document.dispatchEvent(new e.dom.window.Event('visibilitychange'));assert.equal(e.frames.size,1);
 clock.dispose();assert.equal(e.frames.size,0);assert.equal(e.mediaEvents.size,0);assert.ok(e.sizes[0].off&&e.intersections[0].off);
}));
test('Hero capture waits for the actual scene and two paint frames before exposing readiness',()=>environment(async e=>{
 let sceneReady=false;Object.defineProperty(document,'fonts',{value:{ready:Promise.resolve()},configurable:true});const previous=Object.getOwnPropertyDescriptor(globalThis,'MutationObserver');Object.defineProperty(globalThis,'MutationObserver',{value:e.dom.window.MutationObserver,configurable:true});
 try{const Capture=load('components/heroes/hero-capture.tsx',{'./hero-stage':{default:()=>React.createElement('div',{'data-ready':sceneReady})}}).default;await React.act(()=>e.root.render(React.createElement(Capture,{id:'pavilion',paused:true})));const host=document.querySelector('[data-testid=hero-capture]');assert.equal(host.dataset.ready,undefined);
 sceneReady=true;await React.act(async()=>{e.root.render(React.createElement(Capture,{id:'pavilion',paused:true}));await Promise.resolve();await Promise.resolve();});assert.equal(host.dataset.ready,undefined);assert.equal(e.frames.size,1);e.tick();assert.equal(host.dataset.ready,undefined);e.tick(1020);assert.equal(host.dataset.ready,'true');await React.act(()=>e.root.unmount());assert.equal(e.frames.size,0);
 }finally{if(previous)Object.defineProperty(globalThis,'MutationObserver',previous);else delete globalThis.MutationObserver;}
}));
test('Hero collection copies original prompts, filters, deep-links and switches review tabs',()=>environment(async e=>{
 const catalog=load('lib/heroes.ts');assert.deepEqual(catalog.heroes.map(item=>item.id),['pavilion','diorama','arcadia','solace','aster','noema','aevora','florra','sprig','sway','kinetic-nebula','luminary','zenith-beam','bio-terrain']);assert.equal(catalog.findHero('unknown'),undefined);assert.deepEqual(catalog.filterHeroes('three.js').map(item=>item.id),['pavilion','kinetic-nebula','luminary','zenith-beam','bio-terrain']);assert.equal(catalog.filterHeroes('','Physics')[0].id,'arcadia');assert.equal(catalog.filterHeroes('missing').length,0);
 let copied='';Object.defineProperty(navigator,'clipboard',{value:{writeText:async text=>{copied=text;}}});
 const HeroModule=load('components/hero-prompts.tsx',{'@/lib/heroes':catalog,'./site-frame':{default:({children})=>React.createElement('main',null,children)},'./heroes/hero-stage':{default:({id})=>React.createElement('div',{'data-stage':id})},'motion/react':{useReducedMotion:()=>true},'next/navigation':{useSearchParams:()=>new URLSearchParams(window.location.search)},'./outline-field':{default:({children})=>children},'./choice-select':{default:()=>null,workflowOptions:[]}}); const Hero=HeroModule.default;assert.deepEqual(HeroModule.heroFrameFit(640,450,'desktop'),{width:1280,height:900,scale:.5});assert.deepEqual(HeroModule.heroFrameFit(390,422,'mobile'),{width:390,height:844,scale:.5});
 for(const [width,height,viewport] of [[1304,704,'desktop'],[665,660,'desktop'],[768,480,'tablet'],[390,660,'mobile'],[320,548,'mobile'],[1800,1000,'desktop']]){const fit=HeroModule.heroFrameFit(width,height,viewport);assert.ok(fit.width*fit.scale<=width+1e-8,'Hero fits the container width');assert.ok(fit.height*fit.scale<=height+1e-8,'Hero fits the container height');}
 await React.act(()=>e.root.render(React.createElement(Hero)));assert.equal(document.querySelectorAll('article').length,14);
 await React.act(async()=>{document.querySelector('[aria-label="Copy Pavilion prompt"]').click();await Promise.resolve();});assert.equal(copied,catalog.heroes[0].prompt);assert.match(copied,/Spaces shaped/);assert.equal(document.querySelector('[role=tooltip]').textContent,'Copied');assert.equal(document.querySelector('[aria-label="Copy Pavilion prompt"] span').textContent,'Copy prompt','feedback does not resize the button');
 await React.act(()=>document.querySelector('[aria-label="Filter by Physics"]').click());assert.equal(document.querySelectorAll('article').length,1);assert.match(document.querySelector('article').textContent,/Arcadia/);await React.act(()=>document.querySelector('[aria-label="Clear Physics filter"]').click());
 await React.act(()=>document.querySelector('[aria-label="Preview Pavilion"]').click());assert.match(window.location.search,/hero=pavilion/);assert.equal(document.querySelector('[data-stage]').dataset.stage,'pavilion');await React.act(()=>document.querySelector('#hero-prompt-tab').click());assert.equal(document.querySelector('pre').textContent,catalog.heroes[0].prompt);assert.match(window.location.search,/view=prompt/);assert.equal(document.querySelector('#hero-prompt-tab').getAttribute('aria-selected'),'true');
 await React.act(()=>{window.history.replaceState({},'','/hero');window.dispatchEvent(new e.dom.window.PopStateEvent('popstate'));});assert.equal(document.querySelectorAll('article').length,14);assert.equal(document.activeElement.textContent,'Pavilion');
}));
test('Atelier inspects and rotates the reused pavilion and destroys its scene',()=>environment(async e=>{
 let inspected=false,rotated=0,destroyed=0,surfaces=0;const api={setInspection(value){inspected=value;},setPaused(){},inspectNext(){surfaces++;},reset(){},rotate(value){rotated+=value;},destroy(){destroyed++;}};
 const Atelier=load('components/heroes/atelier-hero.tsx',{'./atelier-scene':{createHouseScene:()=>api}}).default;
 await React.act(async()=>{e.root.render(React.createElement(Atelier));await Promise.resolve();});await React.act(()=>[...document.querySelectorAll('button')].find(b=>b.textContent==='Explore the house').click());assert.equal(inspected,true);assert.ok([...document.querySelectorAll('button')].some(b=>b.textContent==='Exit inspection'));
 await React.act(()=>document.querySelector('[aria-label="Inspect next surface"]').click());assert.equal(surfaces,1);await React.act(()=>document.querySelector('[aria-label="Rotate model right"]').click());assert.ok(rotated>0);await React.act(()=>e.root.unmount());assert.equal(destroyed,1);
}));
test('Diorama dashboard filters update reservations and chart, and stays open reservation details',()=>environment(async e=>{
 const clock=sceneClock(),Diorama=load('components/heroes/diorama-hero.tsx',{'./hero-clock':clock.api}).default;
 await React.act(()=>e.root.render(React.createElement(Diorama)));assert.match(document.body.textContent,/Reservations128/);assert.equal(document.querySelectorAll('canvas').length,0);assert.equal(document.querySelectorAll('img').length,1,'only the foreground landscape remains');
 await React.act(()=>[...document.querySelectorAll('button')].find(b=>b.textContent==='Highlands').click());assert.match(document.body.textContent,/Reservations96/);
 await React.act(()=>[...document.querySelectorAll('button')].find(b=>b.textContent==='Month').click());assert.match(document.body.textContent,/Reservations384/);assert.match(document.querySelector('[role=img]').getAttribute('aria-label'),/Highlands bookings over the last 30 days/);
 await React.act(()=>[...document.querySelectorAll('button')].find(b=>b.textContent.includes('Pine House')).click());assert.match(document.querySelector('h2').textContent,/Reservations/);assert.match(document.querySelector('[role=status]').textContent,/Pine House reservation selected/);
 await React.act(()=>e.root.unmount());assert.equal(clock.disposed,1);
}));
test('Arcadia responds to keyboard orbit controls and supports empty image input',()=>environment(async e=>{
 const clock=sceneClock(),Arcadia=load('components/heroes/arcadia-hero.tsx',{'./hero-clock':clock.api}).default;
 await React.act(()=>e.root.render(React.createElement(Arcadia)));const cards=[...document.querySelectorAll('[aria-label^="Select image"]')];assert.equal(cards.length,16);const before=cards[0].style.transform;await React.act(()=>document.querySelector('[aria-label="Rotate gallery right"]').click());assert.notEqual(cards[0].style.transform,before);assert.ok(cards.every(card=>!/NaN|Infinity/.test(card.style.transform)));
 await React.act(()=>cards[0].click());assert.equal(cards[0].getAttribute('aria-pressed'),'true');await React.act(()=>e.root.render(React.createElement(Arcadia,{images:[]})));assert.equal(document.querySelectorAll('[aria-label^="Select image"]').length,0);assert.equal(clock.disposed,1);
}));
test('Solace starts, restarts and resets focus sessions and changes its intention',()=>environment(async e=>{
 const intervals=new Map(),oldSet=globalThis.setInterval,oldClear=globalThis.clearInterval,oldNow=Date.now;let serial=0,now=1000;globalThis.setInterval=fn=>{intervals.set(++serial,fn);return serial;};globalThis.clearInterval=id=>intervals.delete(id);Date.now=()=>now;
 try{const clock=sceneClock(),Solace=load('components/heroes/solace-hero.tsx',{'./hero-clock':clock.api}).default;await React.act(()=>e.root.render(React.createElement(Solace)));await React.act(()=>[...document.querySelectorAll('button')].find(b=>b.textContent.includes('Find your rhythm')).click());assert.equal(intervals.size,1);assert.match(document.querySelector('[role=status]').textContent,/started/);now+=1000;await React.act(()=>[...intervals.values()].forEach(fn=>fn()));assert.match(document.body.textContent,/01:59/);
 await React.act(()=>[...document.querySelectorAll('button')].find(b=>b.textContent.includes('Restart your moment')).click());assert.equal(intervals.size,1);assert.match(document.body.textContent,/02:00/);now+=120000;await React.act(()=>[...intervals.values()].forEach(fn=>fn()));assert.match(document.querySelector('[role=status]').textContent,/complete/);assert.equal(intervals.size,0);
 const intention=[...document.querySelectorAll('button')].find(b=>b.textContent.includes("TODAY'S INTENTION"));await React.act(()=>intention.click());assert.match(intention.textContent,/Finish one thing/);await React.act(()=>document.querySelector('[aria-label="Mark a small win"]').click());assert.match(document.body.textContent,/4 small wins/);
 await React.act(()=>[...document.querySelectorAll('button')].find(b=>b.textContent.includes('Reset moment')).click());assert.match(document.body.textContent,/02:00/);assert.equal(intervals.size,0);await React.act(()=>e.root.unmount());assert.equal(clock.disposed,1);
 }finally{globalThis.setInterval=oldSet;globalThis.clearInterval=oldClear;Date.now=oldNow;}
}));

test('Arcadia fades continuously across both edges and full revolutions without exposing hidden cards',()=>environment(async e=>{
 const clock=sceneClock(),Arcadia=load('components/heroes/arcadia-hero.tsx',{'./hero-clock':clock.api}).default;
 for(const direction of [4,-4]){
  await React.act(()=>e.root.render(React.createElement(Arcadia,{rotationSpeed:direction})));const cards=[...document.querySelectorAll('[aria-label^="Select image"]')];let previous=Number(cards[0].style.opacity),partial=0,hidden=0;
  for(let frame=0;frame<1300;frame++){clock.draw(frame/60,1/60);const opacity=Number(cards[0].style.opacity);assert.ok(Math.abs(opacity-previous)<.04,'no boundary jump');if(opacity>0&&opacity<1)partial++;if(opacity===0)hidden++;for(const card of cards){if(Number(card.style.opacity)>0)assert.equal(card.style.visibility,'visible');else{assert.equal(card.style.visibility,'hidden');assert.equal(card.tabIndex,-1);assert.equal(card.style.pointerEvents,'none');assert.equal(card.getAttribute('aria-hidden'),'true');}}previous=opacity;}
  assert.ok(partial>100&&hidden>100,'both transition and hidden arc traversed');assert.ok(cards.every(card=>card.querySelector('img').getAttribute('loading')==='eager'));
 }
}));
test('Hero prompts use original identities and agree with their public downloads',()=>{
 const items=JSON.parse(fs.readFileSync(path.resolve(__dirname,'../registry/hero-prompts.json'),'utf8')).items;
 assert.deepEqual([...load('lib/hero-catalog.ts').heroIds],items.map(hero=>hero.id),'lightweight sidebar catalog stays in sync');
 for(const hero of items){assert.equal(fs.readFileSync(path.resolve(__dirname,'../public/heroes/'+hero.id+'-prompt.txt'),'utf8'),hero.prompt);assert.doesNotMatch(hero.prompt,/BRRAL|Fulcrum|Yasir|Intelligence Canvas|Create Stunning AI Generated|Photos Instantly/);}
 assert.ok(items[1].tags.includes('TypeScript'));assert.match(items[1].prompt,/diorama-foreground.png/);
});

test('Aster reuses one Liquid Artifact across observation changes and forwards paused state',()=>environment(async e=>{
 let mounts=0,disposed=0;const Artifact=props=>{React.useEffect(()=>{mounts++;return()=>disposed++;},[]);return React.createElement('div',{'data-artifact-shape':props.defaultShape,'data-paused':String(props.paused),'data-theme':props.defaultTheme});};
 const Aster=load('components/heroes/aster-hero.tsx',{'../ui/liquid-artifact':{default:Artifact}}).default;
 await React.act(()=>e.root.render(React.createElement(Aster)));const shape=()=>document.querySelector('[data-artifact-shape]');assert.equal(shape().dataset.artifactShape,'2');assert.equal(shape().dataset.theme,'dark');
 await React.act(()=>document.querySelector('button').click());assert.equal(shape().dataset.artifactShape,'2');assert.equal(document.querySelectorAll('button').length,2);assert.equal(document.querySelector('[aria-label=Menu]').getAttribute('aria-pressed'),'true');assert.equal(document.querySelector('[role=dialog]'),null);
 await React.act(()=>e.root.render(React.createElement(Aster,{paused:true})));assert.equal(shape().dataset.paused,'true');assert.equal(mounts,1);await React.act(()=>e.root.unmount());assert.equal(disposed,1);
}));

