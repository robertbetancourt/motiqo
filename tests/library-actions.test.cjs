const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),ts=require('typescript-compiler-api'),React=require('react'),{JSDOM}=require('jsdom');
function load(file,mocks={}){const filename=path.resolve(__dirname,'..',file),m=new Module(filename,module);m.filename=filename;m.paths=Module._nodeModulePaths(path.dirname(filename));const normal=m.require.bind(m);m.require=id=>mocks[id]??normal(id);m._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText,filename);return m.exports;}
const MotionElement=React.forwardRef(({children,initial,animate,exit,transition,...props},ref)=>React.createElement('div',{...props,ref},children));
const motionMock={AnimatePresence:({children})=>children,motion:{div:MotionElement},useReducedMotion:()=>false,useIsPresent:()=>true};
const controls=load('lib/element-controls.ts'),catalog=load('lib/catalog.ts',{'./element-controls':controls}),Menu=load('components/card-context-menu.tsx',{'@/lib/element-controls':controls,'motion/react':motionMock}).default;

test('Library uses native links, preserves modified clicks and carries a card mood into share, prompt, download and workspace',async()=>{
 const dom=new JSDOM('<div id="mount"></div>',{url:'http://localhost/library',pretendToBeVisual:true}),copied=[],globals={window:dom.window,document:dom.window.document,HTMLElement:dom.window.HTMLElement,localStorage:dom.window.localStorage,navigator:dom.window.navigator,IS_REACT_ACT_ENVIRONMENT:true},old=new Map(Object.keys(globals).map(k=>[k,Object.getOwnPropertyDescriptor(globalThis,k)]));
 Object.entries(globals).forEach(([k,v])=>Object.defineProperty(globalThis,k,{value:v,writable:true,configurable:true}));window.scrollTo=()=>{};Object.defineProperty(navigator,'clipboard',{value:{writeText:async value=>copied.push(value)}});
 const Wrapper=React.forwardRef(({children,layout,transition,initial,animate,exit,...props},ref)=>React.createElement('div',{...props,ref},children));
 const Library=load('components/library.tsx',{'motion/react':{AnimatePresence:({children})=>children,motion:{div:Wrapper,article:Wrapper},useReducedMotion:()=>false},'@/lib/catalog':{...catalog,elements:catalog.elements.filter(e=>['gyro','spectral-button'].includes(e.id))},'@/lib/element-controls':controls,'@/lib/tag-filter':load('lib/tag-filter.ts'),'@/lib/component-groups':load('lib/component-groups.ts'),'./card-preview':{default:()=>null},'./card-context-menu':{default:Menu},'./element-workspace':{default:props=>React.createElement('div',{'data-workspace':props.element.id,'data-settings':JSON.stringify(props.initialSettings)})},'./site-frame':{default:({children})=>children},'./outline-field':{default:({children})=>children}}).default;
 const root=require('react-dom/client').createRoot(document.getElementById('mount'));
 const click=async(node,options={})=>{let accepted;await React.act(async()=>{accepted=node.dispatchEvent(new window.MouseEvent('click',{bubbles:true,cancelable:true,...options}));await Promise.resolve();});return accepted;};
 const item=text=>Array.from(document.querySelectorAll('[role="menuitem"],[role="menuitemradio"]')).find(e=>e.textContent===text);
 const context=async selector=>React.act(()=>document.querySelector(selector).dispatchEvent(new window.MouseEvent('contextmenu',{bubbles:true,cancelable:true,clientX:1000,clientY:700})));
 try{
  await React.act(()=>root.render(React.createElement(Library,{originalSource:{},initialGroup:'buttons'})));
  assert.deepEqual([...document.querySelectorAll('.element-card')].map(node=>node.dataset.element),['spectral-button']);assert.equal(document.querySelector('.library-heading'),null);assert.equal(document.querySelector('.filters'),null);
  await React.act(()=>root.render(React.createElement(Library,{originalSource:{}})));assert.equal(document.querySelectorAll('.element-card').length,2);
  const link=document.querySelector('[data-element="gyro"] .card-preview-open');assert.equal(link.tagName,'A');assert.equal(link.getAttribute('href'),'/library?element=gyro');
  // Prevent jsdom navigation after React has had a chance to cancel or preserve it.
  let preserved;document.addEventListener('click',event=>{if(event.target===link){preserved=!event.defaultPrevented;event.preventDefault();}});
  await click(link,{ctrlKey:true});assert.equal(preserved,true);assert.equal(document.querySelector('[data-workspace]'),null);
  const middle=new window.MouseEvent('auxclick',{bubbles:true,cancelable:true,button:1});assert.equal(link.dispatchEvent(middle),true);assert.equal(document.querySelector('[data-workspace]'),null);
  await context('[data-element="spectral-button"] .card-preview-open');assert.equal(item('Mood'),undefined);await React.act(()=>document.querySelector('[role="menu"]').dispatchEvent(new window.KeyboardEvent('keydown',{key:'Escape',bubbles:true})));
  assert.equal(document.querySelector('[role="menu"]'),null);assert.equal(document.activeElement,document.querySelector('[data-element="spectral-button"] .card-preview-open'));
  await context('[data-element="gyro"] .card-preview-open');assert.equal(item('Open component'),undefined);assert.equal(document.querySelector('.card-context-heading'),null);assert.equal(document.activeElement,item('Open in new tab'));await React.act(()=>document.activeElement.dispatchEvent(new window.KeyboardEvent('keydown',{key:'ArrowDown',bubbles:true})));assert.equal(document.activeElement,item('Download'));
  await click(item('Mood'));assert.equal(document.querySelectorAll('[role="menu"]').length,2);assert.ok(item('Open in new tab'));assert.equal(document.querySelector('.card-context-menu [aria-haspopup]').getAttribute('aria-expanded'),'true');await click(item('Expressive'));const href=link.getAttribute('href'),settings=JSON.parse(new URL(href,window.location.origin).searchParams.get('config')).settings;assert.equal(settings.speed,1.3);
  await context('[data-element="gyro"] .card-preview-open');assert.equal(new URL(item('Download').href).searchParams.get('config'),new URL(href,window.location.origin).searchParams.get('config'));await click(item('Share · Copy link'));assert.equal(copied.at(-1),new URL(href,window.location.origin).href);
  await context('[data-element="gyro"] .card-preview-open');await click(item('Copy prompt'));assert.match(copied.at(-1),/Gyro/);assert.match(copied.at(-1),/1\.3/);
  const beforeHistory=window.history.length;
  const outgoingOther=document.querySelector('[data-element="spectral-button"] .card-preview-open');
  await React.act(()=>{for(const detail of [1,2,1])link.dispatchEvent(new window.MouseEvent('click',{bubbles:true,cancelable:true,detail}));outgoingOther.dispatchEvent(new window.MouseEvent('click',{bubbles:true,cancelable:true,detail:1}));});
  assert.equal(window.history.length,beforeHistory+1,'rapid repeated card clicks create one history entry');assert.equal(preserved,false);assert.equal(document.querySelector('[data-workspace]').dataset.workspace,'gyro');assert.equal(JSON.parse(document.querySelector('[data-workspace]').dataset.settings).speed,1.3);
  await React.act(async()=>{const back=new Promise(resolve=>window.addEventListener('popstate',resolve,{once:true}));window.history.back();await back;});assert.equal(document.querySelector('[data-workspace]'),null,'one Back returns to the collection');assert.equal(new URL(window.location.href).searchParams.get('element'),null);
 }finally{await React.act(()=>root.unmount());dom.window.close();for(const[k,v]of old){if(v)Object.defineProperty(globalThis,k,v);else delete globalThis[k];}}
});

test('Mood opens a separate hover menu, bridges the gap, flips at the viewport edge and supports keyboard return',async()=>{
 const dom=new JSDOM('<div id="mount"></div>',{url:'http://localhost/library',pretendToBeVisual:true}),globals={window:dom.window,document:dom.window.document,IS_REACT_ACT_ENVIRONMENT:true},old=new Map(Object.keys(globals).map(k=>[k,Object.getOwnPropertyDescriptor(globalThis,k)]));
 Object.entries(globals).forEach(([k,v])=>Object.defineProperty(globalThis,k,{value:v,writable:true,configurable:true}));
 Object.defineProperty(window.HTMLElement.prototype,'offsetWidth',{get(){return this.classList.contains('card-context-submenu')?180:226;}});Object.defineProperty(window.HTMLElement.prototype,'offsetHeight',{get(){return this.classList.contains('card-context-submenu')?112:270;}});
 window.HTMLElement.prototype.getBoundingClientRect=function(){const parent=this.closest('.card-context-menu'),left=parseFloat(this.style.left)||0,top=parseFloat(this.style.top)||0;return{left,top:this.hasAttribute('aria-haspopup')?parseFloat(parent.style.top)+110:top,right:left+this.offsetWidth,bottom:top+this.offsetHeight,width:this.offsetWidth,height:this.offsetHeight};};
 const root=require('react-dom/client').createRoot(document.getElementById('mount'));let dismissed=0;
 const pointer=async(node,type,relatedTarget)=>React.act(()=>{if(type==='pointerover'&&relatedTarget){const out=new window.MouseEvent('pointerout',{bubbles:true,relatedTarget:node});Object.defineProperty(out,'pointerType',{value:'mouse'});relatedTarget.dispatchEvent(out);}const event=new window.MouseEvent(type,{bubbles:true,relatedTarget});Object.defineProperty(event,'pointerType',{value:'mouse'});node.dispatchEvent(event);});
 const key=async(node,value)=>React.act(()=>node.dispatchEvent(new window.KeyboardEvent('keydown',{key:value,bubbles:true})));
 try{
  await React.act(()=>root.render(React.createElement(Menu,{position:{element:catalog.elements.find(e=>e.id==='gyro'),x:1000,y:700,trigger:document.getElementById('mount')},href:'/library?element=gyro',saved:false,onClose:()=>dismissed++,onOpen:()=>{},onSave:()=>{},onShare:()=>{},onPrompt:()=>{},onMood:()=>{}})));
  const main=document.querySelector('[aria-label="Gyro actions"]'),trigger=main.querySelector('[aria-haspopup]'),original=main.textContent;
  await pointer(trigger,'pointerover',main);let sub=document.querySelector('[aria-label="Mood"]');assert.ok(sub);assert.equal(main.textContent,original,'main actions remain visible');assert.equal(trigger.getAttribute('aria-expanded'),'true');assert.equal(sub.dataset.side,'left');assert.ok(parseFloat(sub.style.left)+180<parseFloat(main.style.left));
  await pointer(main,'pointerout',sub);await pointer(sub,'pointerover',main);await React.act(async()=>new Promise(resolve=>setTimeout(resolve,260)));assert.ok(document.querySelector('[aria-label="Mood"]'),'crossing the gap keeps the submenu open');assert.equal(dismissed,0);
  await key(sub,'Escape');assert.equal(document.querySelector('[aria-label="Mood"]'),null);assert.equal(document.activeElement,trigger);assert.ok(main.isConnected);
  await key(trigger,'ArrowRight');sub=document.querySelector('[aria-label="Mood"]');assert.equal(document.activeElement,sub.querySelector('[role=menuitemradio]'));await key(sub,'ArrowLeft');assert.equal(document.activeElement,trigger);
  await pointer(trigger,'pointerover',main);await pointer(main.querySelector('a'),'pointerover',trigger);await React.act(async()=>new Promise(resolve=>setTimeout(resolve,260)));assert.equal(document.querySelector('[aria-label="Mood"]'),null);assert.ok(main.isConnected);
 }finally{await React.act(()=>root.unmount());dom.window.close();for(const[k,v]of old){if(v)Object.defineProperty(globalThis,k,v);else delete globalThis[k];}}
});

test('Category changes release outgoing previews immediately, including rapid switches between effects, type and data',async()=>{
 const dom=new JSDOM('<div id="mount"></div>',{url:'http://localhost/library?group=backgrounds',pretendToBeVisual:true}),keys=['window','document','HTMLElement','localStorage','IS_REACT_ACT_ENVIRONMENT'],old=new Map(keys.map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)]));
 for(const[key,value]of Object.entries({window:dom.window,document:dom.window.document,HTMLElement:dom.window.HTMLElement,localStorage:dom.window.localStorage,IS_REACT_ACT_ENVIRONMENT:true}))Object.defineProperty(globalThis,key,{value,writable:true,configurable:true});
 window.scrollTo=()=>{};
 const {AnimatePresence,usePresence}=require('motion/react'),active=new Set(),releases=[];
 const Preview=({id})=>{React.useEffect(()=>{active.add(id);return()=>{active.delete(id);releases.push(id);};},[id]);return React.createElement('div',{'data-scene':id});};
 // Give real Presence a delayed renderer so retaining an outgoing card reproduces
 // the GPU lifecycle overlap without constructing WebGL scenes in the test.
 const Animated=React.forwardRef(({children,layout,transition,initial,animate,exit,...props},ref)=>{
  const[present,remove]=usePresence();React.useEffect(()=>{if(!present){const timer=setTimeout(remove,320);return()=>clearTimeout(timer);}},[present,remove]);
  return React.createElement('div',{...props,ref},children);
 });
 const Frame=({children,onCollection})=>React.createElement(React.Fragment,null,['backgrounds','typography','data'].map(group=>React.createElement('button',{key:group,'data-group':group,onClick:()=>onCollection(group)},group)),children);
 const Library=load('components/library.tsx',{'motion/react':{AnimatePresence,motion:{div:Animated,article:Animated},useReducedMotion:()=>false},'@/lib/catalog':catalog,'@/lib/component-groups':load('lib/component-groups.ts'),'@/lib/element-controls':controls,'@/lib/tag-filter':load('lib/tag-filter.ts'),'./card-preview':{default:Preview},'./card-context-menu':{default:()=>null},'./element-workspace':{default:()=>null},'./site-frame':{default:Frame},'./outline-field':{default:({children})=>children}}).default;
 const root=require('react-dom/client').createRoot(document.getElementById('mount')),choose=group=>React.act(()=>document.querySelector(`[data-group="${group}"]`).click());
 try{
  await React.act(()=>root.render(React.createElement(Library,{originalSource:{},initialGroup:'backgrounds'})));assert.ok(active.has('sonic-aperture'));assert.ok(active.has('stratum'));
  await choose('typography');assert.deepEqual([...active].sort(),['inkshift','type-garden']);assert.equal(document.querySelectorAll('.element-card').length,2);assert.ok(releases.includes('sonic-aperture'));
  await choose('data');assert.deepEqual([...active].sort(),['aura','elevation-matrix','holdings','pulse','sentiment']);assert.ok(releases.includes('inkshift'));assert.equal(new URL(window.location.href).searchParams.get('group'),'data');
  await choose('backgrounds');await choose('typography');assert.deepEqual([...active].sort(),['inkshift','type-garden']);
 }finally{await React.act(()=>root.unmount());assert.equal(active.size,0);dom.window.close();for(const[key,value]of old){if(value)Object.defineProperty(globalThis,key,value);else delete globalThis[key];}}
});
