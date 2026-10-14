const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),ts=require('typescript'),React=require('react');
const {JSDOM}=require('jsdom');
function load(file,overrides={}){const filename=path.resolve(__dirname,'..',file),entry=new Module(filename,module);entry.filename=filename;entry.paths=Module._nodeModulePaths(path.dirname(filename));const normal=entry.require.bind(entry);entry.require=id=>overrides[id]??normal(id);entry._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022},fileName:filename}).outputText,filename);return entry.exports;}
function environment(){const dom=new JSDOM('<div id="mount"></div>',{pretendToBeVisual:true,url:'http://localhost'}),frames=new Map(),mediaListeners=new Set(),visible=[];let serial=0,now=1000,disconnected=0;
 const media={matches:false,addEventListener:(_,f)=>mediaListeners.add(f),removeEventListener:(_,f)=>mediaListeners.delete(f)};
 class Size{constructor(fn){this.fn=fn;}observe(){this.fn([{contentRect:{width:640}}]);}disconnect(){disconnected++;}}
 class Visible{constructor(fn){this.fn=fn;visible.push(this);}observe(){this.fn([{isIntersecting:true}]);}disconnect(){disconnected++;}}
 const globals={window:dom.window,document:dom.window.document,HTMLElement:dom.window.HTMLElement,IS_REACT_ACT_ENVIRONMENT:true,performance:{now:()=>now},matchMedia:()=>media,ResizeObserver:Size,IntersectionObserver:Visible,requestAnimationFrame:f=>{frames.set(++serial,f);return serial;},cancelAnimationFrame:id=>frames.delete(id)},old=new Map(Object.keys(globals).map(k=>[k,Object.getOwnPropertyDescriptor(globalThis,k)]));Object.entries(globals).forEach(([k,v])=>Object.defineProperty(globalThis,k,{value:v,writable:true,configurable:true}));
 const root=require('react-dom/client').createRoot(document.getElementById('mount'));
 return {dom,root,media,frames,mediaListeners,visible,get disconnected(){return disconnected;},advance(count=360){for(let i=0;i<count&&frames.size;i++){now+=1000/60;const batch=[...frames.values()];frames.clear();batch.forEach(f=>f(now));}},restore(){dom.window.close();for(const[k,v]of old){if(v)Object.defineProperty(globalThis,k,v);else delete globalThis[k];}}};
}
test('District selects all sixteen buildings, pins a light, settles and releases its stage',async()=>{const e=environment();let mounted=true;try{
 const stage=load('components/originals/line-scene.tsx'),solid=load('components/originals/line-solid.ts',{'./line-scene':stage}),{default:District,districtPlan}=load('components/originals/district.tsx',{'./line-scene':stage,'./line-solid':solid});
 assert.equal(new Set(districtPlan.map(b=>b.name)).size,16);for(const a of districtPlan)for(const b of districtPlan)if(a!==b)assert.ok(Math.abs(a.x-b.x)>=(a.w+b.w)/2||Math.abs(a.y-b.y)>=(a.d+b.d)/2,'separate footprints');
 await React.act(()=>e.root.render(React.createElement(District)));const host=document.querySelector('.district'),drawing=host.querySelector('svg>g');host.querySelector('svg').getBoundingClientRect=()=>({left:0,top:0,width:640,height:440});
 assert.deepEqual([...drawing.querySelectorAll('[data-city-layer]')].map(layer=>layer.dataset.cityLayer),['ground','roads','buildings'],'ground and roads are always behind the volumes');
 const key=k=>host.dispatchEvent(new e.dom.window.KeyboardEvent('keydown',{key:k}));const leave=()=>{const event=new e.dom.window.MouseEvent('pointerleave');Object.defineProperty(event,'pointerType',{value:'mouse'});host.dispatchEvent(event);};
 key('Home');e.advance();assert.equal(drawing.dataset.selectedBuilding,'0');
 for(let i=1;i<16;i++){key('ArrowRight');e.advance();assert.equal(drawing.dataset.selectedBuilding,String(i));assert.ok(Number(document.querySelector(`[data-building="${i}"]`).dataset.glow)>.98);}
 key(' ');leave();e.advance();assert.equal(drawing.dataset.selectedBuilding,'15','pin remains after the hand leaves');
 key(' ');leave();e.advance();assert.equal(drawing.dataset.selectedBuilding,'-1');assert.equal(e.frames.size,0,'static city sleeps');
 assert.ok([...host.querySelectorAll('path')].every(p=>!/NaN|Infinity/.test(p.getAttribute('d')??'')));
 await React.act(()=>e.root.unmount());mounted=false;assert.equal(e.mediaListeners.size,0);assert.equal(e.frames.size,0);assert.equal(e.disconnected,2);
 }finally{if(mounted)await React.act(()=>e.root.unmount());e.restore();}});
test('Pulse draws progressively, interpolates inspection, pauses, reduces motion and suspends offscreen',async()=>{const e=environment();let mounted=true;try{
 const {default:Pulse,pulseSample}=load('components/originals/pulse.tsx');assert.equal(pulseSample(12),pulseSample(12));
 await React.act(()=>e.root.render(React.createElement(Pulse)));const host=document.querySelector('.pulse'),line=host.querySelector('[pathLength]');host.querySelector('svg').getBoundingClientRect=()=>({left:0,top:0,width:520,height:370});
 e.advance(30);const early=Number(line.getAttribute('stroke-dashoffset'));assert.ok(early>0&&early<1);e.advance(180);assert.equal(Number(line.getAttribute('stroke-dashoffset')),0);
 host.dispatchEvent(new e.dom.window.MouseEvent('pointermove',{clientX:26,clientY:200}));e.advance(180);assert.equal(host.querySelector('time').textContent,'00:00');
 host.dispatchEvent(new e.dom.window.KeyboardEvent('keydown',{key:'End'}));e.advance(180);assert.equal(host.querySelector('time').textContent,'12:00');
 await React.act(()=>e.root.render(React.createElement(Pulse,{paused:true})));e.advance();const frozen=line.getAttribute('d');assert.equal(e.frames.size,0);e.advance(60);assert.equal(line.getAttribute('d'),frozen);
 await React.act(()=>e.root.render(React.createElement(Pulse,{paused:false,amplitude:.4})));e.advance(5);assert.notEqual(line.getAttribute('d'),frozen);
 e.visible.at(-1).fn([{isIntersecting:false}]);assert.equal(e.frames.size,0);e.visible.at(-1).fn([{isIntersecting:true}]);assert.ok(e.frames.size>0);
 e.media.matches=true;e.mediaListeners.forEach(f=>f());e.advance();assert.equal(e.frames.size,0);assert.equal(line.getAttribute('stroke-dashoffset'),'0');
 await React.act(()=>e.root.unmount());mounted=false;assert.equal(e.frames.size,0);assert.equal(e.mediaListeners.size,0);assert.equal(e.disconnected,2);
 }finally{if(mounted)await React.act(()=>e.root.unmount());e.restore();}});
test('Shared shell preserves the sidebar node and tool state across page replacement',async()=>{const e=environment();let mounted=true,mounts=0,unmounts=0;try{
 const Sidebar=()=>{const[value,set]=React.useState(0);React.useEffect(()=>{mounts++;return()=>unmounts++;},[]);return React.createElement('aside',null,React.createElement('button',{onClick:()=>set(value+1)},value));};
 const shell=load('components/site-shell.tsx',{'./site-sidebar':{default:Sidebar}}),Frame=load('components/site-frame.tsx',{'./site-shell':shell,'./site-footer':{default:()=>null}}).default;
 const render=name=>React.createElement(shell.default,null,React.createElement(Frame,{key:name},React.createElement('h1',null,name)));
 await React.act(()=>e.root.render(render('Home')));const sidebar=document.querySelector('aside');await React.act(()=>sidebar.querySelector('button').click());await React.act(()=>e.root.render(render('Library')));
 assert.equal(document.querySelector('aside'),sidebar);assert.equal(sidebar.textContent,'1');assert.equal(document.querySelector('h1').textContent,'Library');assert.equal(mounts,1);assert.equal(unmounts,0);
 await React.act(()=>e.root.unmount());mounted=false;assert.equal(unmounts,1);
 }finally{if(mounted)await React.act(()=>e.root.unmount());e.restore();}});
test('Sidebar light follows the route even while prior Library metadata is being cleared',async()=>{const e=environment();let mounted=true,route='/library';try{
 const Empty=()=>null,Link=({href,children,...props})=>React.createElement('a',{href,...props},children);
 const Sidebar=load('components/site-sidebar.tsx',{'next/link':{default:Link},'next/navigation':{usePathname:()=>route},'./navigation-icon':{default:Empty},'./sidebar-art':{default:Empty},'./brand':{default:Empty},'./color-picker':{default:Empty},'./github-control':{default:Empty},'./theme-control':{default:Empty}}).default;
 Object.defineProperty(e.dom.window.HTMLElement.prototype,'offsetTop',{get(){return this.parentElement?.tagName==='NAV'?[...this.parentElement.querySelectorAll('a')].indexOf(this)*56:0;},configurable:true});
 await React.act(()=>e.root.render(React.createElement(Sidebar,{collection:true})));e.advance();const sidebar=document.querySelector('aside');route='/docs';await React.act(()=>e.root.render(React.createElement(Sidebar,{collection:true})));e.advance();
 const active=[...sidebar.querySelectorAll('[aria-current="page"]')];assert.equal(active.length,1);assert.equal(active[0].textContent,'Getting started');assert.ok(Math.abs(parseFloat(sidebar.querySelector('nav').style.getPropertyValue('--nav-y'))-168)<.1);assert.equal(document.querySelector('aside'),sidebar);
 await React.act(()=>e.root.unmount());mounted=false;assert.equal(e.frames.size,0);
 }finally{if(mounted)await React.act(()=>e.root.unmount());e.restore();}});
