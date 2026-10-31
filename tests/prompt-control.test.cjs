const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript-compiler-api');
const React = require('react');
const { JSDOM } = require('jsdom');

function load(relative, overrides = {}) {
  const filename = path.resolve(__dirname, relative), entry = new Module(filename, module);
  entry.filename = filename; entry.paths = Module._nodeModulePaths(path.dirname(filename));
  const resolve = entry.require.bind(entry);
  entry.require = name => Object.hasOwn(overrides, name) ? overrides[name] : resolve(name);
  entry._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 }, fileName: filename,
  }).outputText, filename);
  return entry.exports;
}
const settings = load('../lib/element-controls.ts');
const catalog = load('../lib/catalog.ts', { './element-controls': settings });
const choice = load('../components/choice-select.tsx', { '@/lib/catalog': catalog });
const liquid = load('../components/liquid-action.tsx', {
  './outline-field': { default: ({ children }) => React.createElement('div', null, children) },
});

test('Source loads on demand, protects copying, retries failures and aborts when leaving the tab',async()=>{
  const dom=new JSDOM('<div id="mount"></div>',{url:'http://localhost/library'}),requests=[];
  const values={window:dom.window,document:dom.window.document,HTMLElement:dom.window.HTMLElement,IS_REACT_ACT_ENVIRONMENT:true,requestAnimationFrame:()=>1,cancelAnimationFrame:()=>{},matchMedia:()=>({matches:true,addEventListener(){},removeEventListener(){}}),fetch:(url,options)=>new Promise(resolve=>requests.push({url,signal:options.signal,resolve}))};
  const old=new Map(Object.keys(values).map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)]));for(const[key,value]of Object.entries(values))Object.defineProperty(globalThis,key,{value,writable:true,configurable:true});
  const root=require('react-dom/client').createRoot(document.getElementById('mount'));let copied='';
  const props={element:catalog.elements.find(e=>e.id==='crate'),onBack(){},onPrevious(){},onNext(){},index:0,total:30,saved:false,onSave(){},paused:true,copy:async text=>{copied=text;return true;},originalSource:{},onToolChange(){}};
  try{
    await React.act(()=>root.render(React.createElement(Workspace,props)));assert.equal(requests.length,0,'Preview never fetches implementation text');
    await React.act(()=>document.querySelector('#tab-code').click());assert.equal(requests.length,1);assert.equal(document.querySelector('[aria-label="Copy source file"]').disabled,true);assert.match(document.querySelector('.document-loading').textContent,/Loading/);
    await React.act(async()=>{requests[0].resolve(new Response('failure',{status:500}));await Promise.resolve();});assert.match(document.querySelector('.document-loading').textContent,/could not be loaded/);
    await React.act(()=>document.querySelector('.document-loading button').click());assert.equal(requests.length,2);
    await React.act(async()=>{requests[1].resolve(Response.json({files:[{name:'crate.tsx',code:'export const realSource = 42;'}]}));await Promise.resolve();});assert.equal(document.querySelector('[aria-label="Copy source file"]').disabled,false);
    await React.act(async()=>document.querySelector('[aria-label="Copy source file"]').click());assert.equal(copied,'export const realSource = 42;');
    await React.act(()=>root.render(React.createElement(Workspace,{...props,key:'gyro',element:catalog.elements.find(e=>e.id==='gyro'),initialTab:'code'})));assert.equal(requests.length,3);assert.match(requests[2].url,/gyro\?format=source/);
    await React.act(()=>document.querySelector('#tab-preview').click());assert.equal(requests[2].signal.aborted,true);
    await React.act(()=>root.unmount());
  }finally{dom.window.close();for(const[key,value]of old){if(value)Object.defineProperty(globalThis,key,value);else delete globalThis[key];}}
});
const Control = load('../components/prompt-control.tsx', {
  '@/lib/catalog': catalog,
  './choice-select': choice,
  './liquid-action': liquid,
}).default;
const Workspace = load('../components/element-workspace.tsx', {
  './element-workspace.module.css': {default:{cosmosStage:'cosmos-stage'}},
  'next/dynamic': {default:()=>props=>React.createElement('div',{'data-cosmos':true,'data-brand':props.brandName,'data-cycling':String(props.autoCycleSlides),'data-paused':String(props.paused)})},
  '@/lib/element-controls': settings,
  './use-component-settings': load('../components/use-component-settings.ts', {'@/lib/element-controls': settings}),
  '@/lib/catalog': catalog,
  './demos': { Demo: props => React.createElement('div', { 'data-demo': true, 'data-count': props.settings.count }) },
  './prompt-control': { default: Control },
  './choice-select': choice,
  './liquid-action': liquid,
  './source-view': load('../components/source-view.tsx'),
}).default;

test('workflow keyboard selection copies the matching prompt; review and motion clean up', async () => {
  const dom = new JSDOM('<div id="mount"></div>', { pretendToBeVisual: true, url: 'http://localhost' });
  const keys = ['window', 'document', 'HTMLElement', 'IS_REACT_ACT_ENVIRONMENT', 'matchMedia', 'requestAnimationFrame', 'cancelAnimationFrame'];
  const original = new Map(keys.map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  const frames = new Map(), mediaListeners = new Set(); let serial = 0, written = '', reviewed = 0, mobileMatch=false, mobileChange;
  dom.window.HTMLElement.prototype.showPopover = function () {};
  dom.window.HTMLDialogElement.prototype.showModal = function () { this.open = true; };
  const values = { window: dom.window, document: dom.window.document, HTMLElement: dom.window.HTMLElement, IS_REACT_ACT_ENVIRONMENT: true,
    matchMedia: query => ({ get matches(){return query.includes('780px')&&mobileMatch;}, addEventListener: (_, fn) => {mediaListeners.add(fn);if(query.includes('780px'))mobileChange=fn;}, removeEventListener: (_, fn) => mediaListeners.delete(fn) }),
    requestAnimationFrame: fn => { frames.set(++serial, fn); return serial; }, cancelAnimationFrame: key => frames.delete(key) };
  for (const [key, value] of Object.entries(values)) Object.defineProperty(globalThis, key, { value, writable: true, configurable: true });
  const { createRoot } = require('react-dom/client');
  const root = createRoot(document.getElementById('mount'));
  function Fixture({ paused = false }) {
    const [tool, setTool] = React.useState('Universal');
    return React.createElement(Control, { element: catalog.elements.find(element => element.id === 'pleat'), tool, onToolChange: setTool,
      copy: async text => { written = text; return true; }, onReview: () => reviewed++, liquid: true, paused });
  }
  let mounted = true;
  try {
    const registered = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../registry/manifest.json'), 'utf8')).items.filter(item=>item.visibility!=='draft').map(item => item.id).sort();
    assert.deepEqual(catalog.elements.map(e => e.id).sort(), registered);
    assert.deepEqual(catalog.elements.filter(e=>e.category==='Linework').map(e=>e.id).sort(), ['arbor','clustered','crate','deck','district','drawer','gyro','lantern','pleat','tempo']);
    assert.ok(catalog.elements.every(e => !e.tags.includes('Original') && catalog.categories.includes(e.category)));
    await React.act(() => root.render(React.createElement(Fixture)));
    await React.act(() => document.querySelector('.prompt-select').click());
    const menu = document.querySelector('[role=menu]');
    assert.equal(document.activeElement.getAttribute('aria-checked'), 'true');
    await React.act(() => menu.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true })));
    assert.match(document.activeElement.textContent, /Claude/);
    await React.act(() => document.activeElement.click());
    assert.equal(document.querySelector('[role=menu]'), null);
    await React.act(async () => { document.querySelector('.prompt-button').click(); await Promise.resolve(); });
    assert.ok(written.startsWith('Inspect the existing project'));
    assert.ok(written.includes('Element: Pleat'));
    assert.match(document.querySelector('.prompt-button').textContent, /Copied/);
    await React.act(() => document.querySelector('.prompt-select').click());
    await React.act(() => document.querySelector('.review-prompt').click());
    assert.equal(reviewed, 1); assert.equal(document.querySelector('[role=menu]'), null);
    const hand = new dom.window.MouseEvent('pointermove', { bubbles: true, clientX: 20, clientY: 10 });
    document.querySelector('.prompt-split').getBoundingClientRect = () => ({ left: 0, top: 0, width: 160, height: 48 });
    await React.act(() => document.querySelector('.prompt-button').dispatchEvent(hand));
    assert.ok(frames.size > 0);
    let now = performance.now();
    await React.act(() => {
      for (let i = 0; i < 120 && frames.size; i++) {
        now += 1000 / 60; const batch = [...frames.values()]; frames.clear(); batch.forEach(fn => fn(now));
      }
    });
    assert.ok(Number(document.querySelector('.prompt-liquid').style.getPropertyValue('--liquid-strength')) > .9);
    await React.act(() => root.render(React.createElement(Fixture, { paused: true })));
    assert.equal(document.querySelector('.prompt-liquid').style.getPropertyValue('--liquid-strength'), '0');

    // The full-page workspace keeps source, workflow, navigation and preview state in sync.
    let closed = 0, workflow = '';
    const crate = catalog.elements.find(element => element.id === 'crate');
    await React.act(() => root.render(React.createElement(Workspace, {
      element: crate, paused: true, onBack: () => closed++, onPrevious: () => {}, onNext: () => {}, index: 0, total: 12,
      saved: false, onSave: () => {}, onPause: () => {}, onToolChange: value => { workflow = value; },
      copy: async text => { written = text; return true; },
      originalSource: { crate: [{ name: 'crate.tsx', code: 'export const crate = 1;' }, { name: 'line-scene.tsx', code: 'export const scene = 2;' }] },
    })));
    assert.equal(document.querySelector('.element-workbench h1').textContent, 'Crate');
    assert.equal(document.querySelector('dialog'), null);
    assert.equal(document.body.style.overflow, '');
    const preview = document.querySelector('[data-demo]');
    const disclosure=document.querySelector('details.inspector-customization');
    assert.equal(document.querySelector('.mobile-settings-toggle'),null);
    assert.equal(disclosure.open,true,'desktop controls stay open');
    mobileMatch=true;await React.act(()=>mobileChange());assert.equal(disclosure.open,false,'mobile uses a collapsed disclosure');
    await React.act(()=>disclosure.querySelector('summary').click());assert.equal(disclosure.open,true);

    const records=document.querySelector('[aria-label=Records]');
    await React.act(()=>{Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype,'value').set.call(records,'5');records.dispatchEvent(new dom.window.Event('input',{bubbles:true}));});
    assert.equal(preview.dataset.count,'5','live controls pass actual component props');assert.equal(disclosure.open,true,'editing a control retains the expanded disclosure');
    await React.act(()=>disclosure.querySelector('summary').click());assert.equal(disclosure.open,false);assert.equal(preview.dataset.count,'5');
    mobileMatch=false;await React.act(()=>mobileChange());assert.equal(disclosure.open,true,'desktop restores visible controls');
    assert.equal(document.querySelector('.detail-description'), null);
    assert.equal(document.querySelector('.element-workbench select'), null);
    assert.equal(document.querySelector('.inspector-disclosure'), null,'auxiliary props and usage sections are removed');
    await React.act(() => document.querySelector('#tab-preview').dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'End', bubbles: true })));
    assert.equal(document.querySelector('#tab-prompt').getAttribute('aria-selected'), 'true');
    await React.act(() => document.querySelector('.document-toolbar .choice-trigger').click());
    await React.act(() => document.querySelector('[data-label="Codex"]').click());
    assert.equal(workflow, 'Codex');
    await React.act(async () => { document.querySelector('.workbench-actions .prompt-button').click(); await Promise.resolve(); });
    assert.equal(written, catalog.makePrompt(crate, 'Codex', {...settings.defaultsFor('crate'),count:5}));
    await React.act(() => document.querySelector('#tab-code').click());
    await React.act(() => document.querySelector('.document-toolbar .choice-trigger').click());
    await React.act(() => document.querySelector('[data-label="line-scene.tsx"]').click());
    await React.act(async () => { document.querySelector('.workbench-actions .prompt-button').click(); await Promise.resolve(); });
    assert.equal(written, 'export const scene = 2;');
    assert.ok(document.querySelector('.source-content').textContent.includes(written));
    await React.act(() => document.querySelector('#tab-preview').click());
    assert.equal(document.querySelector('[data-demo]'), preview);
    assert.equal(document.querySelector('.workbench-preview').hidden, false);
    await React.act(()=>document.querySelector('.parameter-reset').click());assert.equal(preview.dataset.count,'8');
    await React.act(()=>document.querySelector('[aria-label="Mood"]').click());
    const mood=settings.moodsFor('crate')[1];await React.act(()=>document.querySelector(`[data-label="${mood.label}"]`).click());assert.equal(preview.dataset.count,String(mood.settings.count));
    await React.act(async()=>{document.querySelector('.inspector-delivery button').click();await Promise.resolve();});assert.deepEqual(settings.decodeSettings('crate',new URL(written).searchParams.get('config')),mood.settings);assert.match(document.querySelector('.inspector-delivery a').href,/api\/components\/crate/);
    await React.act(() => document.querySelector('[aria-label="mobile preview"]').click());
    assert.equal(document.querySelector('.workbench-stage').dataset.viewport, 'mobile');
    await React.act(() => document.querySelector('.workbench-back').click());
    assert.equal(closed, 1);
    await React.act(() => root.unmount()); mounted = false;
    assert.equal(frames.size, 0); assert.equal(mediaListeners.size, 0);
  } finally {
    if (mounted) await React.act(() => root.unmount());
    dom.window.close();
    for (const [key, descriptor] of original) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor); else delete globalThis[key];
    }
  }
});

test('Cosmos editor keeps its live desktop component, forwards settings and pauses on the code tab',async()=>{
 const dom=new JSDOM('<div id="mount"></div>',{url:'http://localhost/login'}),old=new Map();const values={window:dom.window,document:dom.window.document,HTMLElement:dom.window.HTMLElement,IS_REACT_ACT_ENVIRONMENT:true,requestAnimationFrame:()=>1,cancelAnimationFrame:()=>{},matchMedia:()=>({matches:false,addEventListener(){},removeEventListener(){}})};
 for(const[k,v]of Object.entries(values)){old.set(k,Object.getOwnPropertyDescriptor(globalThis,k));Object.defineProperty(globalThis,k,{value:v,configurable:true,writable:true});}
 dom.window.localStorage.setItem('motiqo-settings-v1:cosmos-split-auth',JSON.stringify({brandName:'MISSION',autoCycleSlides:'disabled'}));
 const root=require('react-dom/client').createRoot(document.getElementById('mount')),element=catalog.elements.find(e=>e.id==='cosmos-split-auth');
 try{await React.act(()=>root.render(React.createElement(Workspace,{element,initialSettings:{brandName:'MISSION',autoCycleSlides:'disabled'},onBack(){},onPrevious(){},onNext(){},index:0,total:1,saved:false,onSave(){},paused:false,copy:async()=>true,originalSource:{[element.id]:[{name:'cosmos.tsx',code:'export default function Cosmos(){}'}]},onToolChange(){}})));
 const live=document.querySelector('[data-cosmos]');assert.ok(document.querySelector('.cosmos-stage'));assert.equal(document.querySelector('[data-demo]'),null);assert.equal(live.dataset.brand,'MISSION');assert.equal(live.dataset.cycling,'false');assert.equal(live.dataset.paused,'false');await React.act(()=>document.querySelector('#tab-code').click());assert.equal(live.dataset.paused,'true');await React.act(()=>document.querySelector('#tab-preview').click());assert.equal(live.dataset.paused,'false');
 }finally{await React.act(()=>root.unmount());dom.window.close();for(const[k,v]of old){if(v)Object.defineProperty(globalThis,k,v);else delete globalThis[k];}}
});
