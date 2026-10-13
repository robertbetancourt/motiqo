const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
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
const catalog = load('../lib/catalog.ts');
const Control = load('../components/prompt-control.tsx', {
  '@/lib/catalog': catalog,
  './outline-field': { default: ({ children }) => React.createElement('div', null, children) },
}).default;

test('workflow keyboard selection copies the matching prompt; review and motion clean up', async () => {
  const dom = new JSDOM('<div id="mount"></div>', { pretendToBeVisual: true, url: 'http://localhost' });
  const keys = ['window', 'document', 'HTMLElement', 'IS_REACT_ACT_ENVIRONMENT', 'matchMedia', 'requestAnimationFrame', 'cancelAnimationFrame'];
  const original = new Map(keys.map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  const frames = new Map(), mediaListeners = new Set(); let serial = 0, written = '', reviewed = 0;
  dom.window.HTMLElement.prototype.showPopover = function () {};
  const values = { window: dom.window, document: dom.window.document, HTMLElement: dom.window.HTMLElement, IS_REACT_ACT_ENVIRONMENT: true,
    matchMedia: () => ({ matches: false, addEventListener: (_, fn) => mediaListeners.add(fn), removeEventListener: (_, fn) => mediaListeners.delete(fn) }),
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
    assert.deepEqual(catalog.elements.map(e => e.id).sort(), ['arbor', 'drawer', 'gilded-signal', 'gyro', 'lantern', 'pleat', 'relay', 'silk-aperture', 'tempo']);
    assert.deepEqual(catalog.elements.filter(e=>e.category==='Linework').map(e=>e.id).sort(), ['arbor','drawer','gyro','lantern','pleat','relay','tempo']);
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
