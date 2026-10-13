const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const React = require('react');
const { JSDOM } = require('jsdom');

const filename = path.resolve(__dirname, '../components/originals/pleat.tsx');
const entry = new Module(filename, module);
entry.filename = filename;
entry.paths = Module._nodeModulePaths(path.dirname(filename));
entry._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 },
  fileName: filename,
}).outputText, filename);
const Pleat = entry.exports.default;

test('elastic folds settle, pause and reduced motion stay static, unmount releases the scene', async () => {
  const dom = new JSDOM('<div id="mount"></div>', { url: 'http://localhost', pretendToBeVisual: true });
  const keys = ['window','document','HTMLElement','IS_REACT_ACT_ENVIRONMENT','matchMedia','requestAnimationFrame','cancelAnimationFrame','IntersectionObserver','ResizeObserver','performance'];
  const original = new Map(keys.map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  const frames = new Map(); let serial = 0, now = 1000, disconnected = 0;
  const mediaListeners = new Set();
  const media = { matches: false, addEventListener: (_, fn) => mediaListeners.add(fn), removeEventListener: (_, fn) => mediaListeners.delete(fn) };
  class Visible { constructor(fn) { this.fn = fn; } observe() { this.fn([{ isIntersecting: true }]); } disconnect() { disconnected++; } }
  class Sized { constructor(fn) { this.fn = fn; } observe() { this.fn([{ contentRect: { width: 640 } }]); } disconnect() { disconnected++; } }
  const environment = { window: dom.window, document: dom.window.document, HTMLElement: dom.window.HTMLElement, IS_REACT_ACT_ENVIRONMENT: true,
    matchMedia: () => media, requestAnimationFrame: fn => { frames.set(++serial, fn); return serial; }, cancelAnimationFrame: key => frames.delete(key),
    IntersectionObserver: Visible, ResizeObserver: Sized, performance: { now: () => now } };
  for (const [key, value] of Object.entries(environment)) Object.defineProperty(globalThis, key, { value, writable: true, configurable: true });
  const { createRoot } = require('react-dom/client');
  const root = createRoot(document.getElementById('mount'));
  const advance = (count = 500) => {
    for (let i = 0; i < count && frames.size; i++) {
      now += 1000 / 60;
      const batch = [...frames.values()]; frames.clear(); batch.forEach(fn => fn(now));
    }
  };
  let mounted = true;
  try {
    await React.act(() => root.render(React.createElement(Pleat)));
    advance();
    const scene = document.querySelector('.pleat');
    scene.querySelector('svg').getBoundingClientRect = () => ({ left: 0, top: 0, width: 640, height: 440 });
    const paths = () => [...scene.querySelectorAll('[data-blade]')].map(el => el.getAttribute('d'));
    const resting = paths();
    assert.equal(resting.length, 25);
    const hand = new dom.window.MouseEvent('pointermove', { clientX: 320, clientY: 210 });
    Object.defineProperty(hand, 'pointerType', { value: 'mouse' });
    scene.dispatchEvent(hand); advance();
    assert.notDeepEqual(paths(), resting);
    assert.ok(paths().every(d => d && !/NaN|Infinity/.test(d)));
    assert.equal(frames.size, 0, 'settled hover stops requesting frames');
    scene.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'Home', bubbles: true })); advance();
    const home = paths();
    scene.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'End', bubbles: true })); advance();
    assert.notDeepEqual(paths(), home, 'keyboard reaches opposite ends of the sculpture');
    const leave = new dom.window.MouseEvent('pointerleave');
    Object.defineProperty(leave, 'pointerType', { value: 'mouse' });
    scene.dispatchEvent(leave); advance();
    const returned = paths();
    assert.equal(frames.size, 0, 'resting sculpture sleeps');
    // Return within subpixel tolerance rather than requiring bit-identical spring rounding.
    returned.forEach((d, i) => {
      const a = d.match(/-?\d+(?:\.\d+)?/g).map(Number), b = resting[i].match(/-?\d+(?:\.\d+)?/g).map(Number);
      assert.ok(a.every((n, j) => Math.abs(n - b[j]) < .08));
    });
    await React.act(() => root.render(React.createElement(Pleat, { paused: true })));
    advance(); scene.dispatchEvent(hand); advance(); assert.deepEqual(paths(), resting);
    await React.act(() => root.render(React.createElement(Pleat, { paused: false })));
    media.matches = true; mediaListeners.forEach(fn => fn()); advance();
    scene.dispatchEvent(hand); advance(); assert.deepEqual(paths(), resting);
    await React.act(() => root.unmount()); mounted = false;
    assert.equal(disconnected, 2); assert.equal(mediaListeners.size, 0); assert.equal(frames.size, 0);
    scene.dispatchEvent(hand); assert.equal(frames.size, 0, 'detached scene has no input listener');
  } finally {
    if (mounted) await React.act(() => root.unmount());
    dom.window.close();
    for (const [key, descriptor] of original) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor); else delete globalThis[key];
    }
  }
});
