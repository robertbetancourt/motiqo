const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const React = require('react');
const { JSDOM } = require('jsdom');

function load(name, stage) {
  const filename = path.resolve(__dirname, '../components/originals', name), entry = new Module(filename, module);
  entry.filename = filename; entry.paths = Module._nodeModulePaths(path.dirname(filename));
  const requireNormal = entry.require.bind(entry);
  entry.require = name => name === './line-scene' ? stage : name === './line-solid' ? load('line-solid.ts', stage) : requireNormal(name);
  entry._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 }, fileName: filename,
  }).outputText, filename);
  return entry.exports;
}
const stage = load('line-scene.tsx');
const Arbor = load('arbor.tsx', stage).default, Drawer = load('drawer.tsx', stage).default, Tempo = load('tempo.tsx', stage).default;

test('Arbor, Drawer and Tempo respond, settle or suspend, and release their shared lifecycle', async () => {
  const dom = new JSDOM('<div id="mount"></div>', { pretendToBeVisual: true, url: 'http://localhost' });
  const keys = ['window','document','HTMLElement','IS_REACT_ACT_ENVIRONMENT','matchMedia','requestAnimationFrame','cancelAnimationFrame','IntersectionObserver','ResizeObserver','performance'];
  const original = new Map(keys.map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  const frames = new Map(), listeners = new Set(), observers = []; let serial = 0, now = 1000, disconnected = 0;
  const media = { matches: false, addEventListener: (_, fn) => listeners.add(fn), removeEventListener: (_, fn) => listeners.delete(fn) };
  class Visible { constructor(fn) { this.fn = fn; observers.push(this); } observe() { this.fn([{ isIntersecting: true }]); } disconnect() { disconnected++; } }
  class Sized { constructor(fn) { this.fn = fn; } observe() { this.fn([{ contentRect: { width: 640 } }]); } disconnect() { disconnected++; } }
  const values = { window: dom.window, document: dom.window.document, HTMLElement: dom.window.HTMLElement, IS_REACT_ACT_ENVIRONMENT: true,
    matchMedia: () => media, requestAnimationFrame: fn => { frames.set(++serial, fn); return serial; }, cancelAnimationFrame: key => frames.delete(key),
    IntersectionObserver: Visible, ResizeObserver: Sized, performance: { now: () => now } };
  for (const [key, value] of Object.entries(values)) Object.defineProperty(globalThis, key, { value, writable: true, configurable: true });
  const { createRoot } = require('react-dom/client');
  const root = createRoot(document.getElementById('mount'));
  const advance = (count = 600) => {
    for (let i = 0; i < count && frames.size; i++) { now += 1000/60; const batch = [...frames.values()]; frames.clear(); batch.forEach(fn => fn(now)); }
  };
  const prepare = () => {
    const host = document.querySelector('.line-stage');
    host.querySelector('svg').getBoundingClientRect = () => ({ left: 0, top: 0, width: 640, height: 440 });
    return host;
  };
  const pointer = (host, type, x, y, pointerType = 'mouse') => {
    const event = new dom.window.MouseEvent(type, { clientX: x, clientY: y });
    Object.defineProperty(event, 'pointerType', { value: pointerType }); host.dispatchEvent(event);
  };
  const paths = selector => [...document.querySelectorAll(selector)].map(el => el.getAttribute('d'));
  const finite = () => assert.ok(paths('.line-stage path').every(d => !d || !/NaN|Infinity/.test(d)));
  let mounted = true;
  try {
    await React.act(() => root.render(React.createElement(Arbor)));
    let host = prepare(); advance(); const rest = paths('[data-branch]');
    assert.equal(rest.length, 94); const trunkStart = document.querySelector('[data-trunk]').getAttribute('d').split('Q')[0];
    pointer(host, 'pointermove', 420, 170); advance();
    assert.notDeepEqual(paths('[data-branch]'), rest); finite();
    assert.equal(document.querySelector('[data-trunk]').getAttribute('d').split('Q')[0], trunkStart, 'roots stay anchored');
    pointer(host, 'pointerleave', 0, 0); advance();
    assert.equal(frames.size, 0, 'tree sleeps after wind settles');

    await React.act(() => root.render(React.createElement(Drawer))); host = prepare(); advance();
    host.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'End' })); advance();
    let trays = [...document.querySelectorAll('[data-drawer]')].map(el => Number(el.getAttribute('data-open')));
    assert.ok(trays[2] > .99 && trays[0] < .01 && trays[1] < .01);
    host.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'Enter' }));
    pointer(host, 'pointerleave', 0, 0); advance();
    assert.ok(Number(document.querySelector('[data-drawer="2"]').getAttribute('data-open')) > .99, 'pin persists after leaving');
    // The open front has moved: clicking it again must release the same drawer.
    const x = 320 - (43+64)*.55*1.32, y = 312 + (43+64)*.83*.58 - 130*1.20;
    pointer(host, 'pointerdown', x, y); pointer(host, 'pointerup', x, y); pointer(host, 'pointerleave', 0, 0); advance();
    assert.ok([...document.querySelectorAll('[data-drawer]')].every(el => Number(el.getAttribute('data-open')) < .01)); finite();

    await React.act(() => root.render(React.createElement(Tempo))); host = prepare(); advance(60);
    const orbs = [...document.querySelectorAll('[data-orb]')];
    assert.equal(orbs.length, 6);
    assert.ok(document.querySelectorAll('[data-solid-face]').length >= 24, 'track and portal have thickness');
    let previous = orbs.map(el => Number(el.getAttribute('data-x'))), wraps = 0;
    for (let i = 0; i < 780; i++) {
      advance(1);
      const next = orbs.map(el => Number(el.getAttribute('data-x')));
      next.forEach((x,j) => {
        if (x < previous[j]) {
          wraps++;
          assert.ok(previous[j] > 200 && x < -200, 'only invisible endpoint recycling may reset position');
          assert.ok(Number(orbs[j].getAttribute('data-scale')) < .002, 'sphere wraps while fully shrunk');
        } else assert.ok(x > previous[j], 'spheres only travel forward');
      });
      previous = next;
    }
    assert.ok(wraps >= 6, 'all six spheres complete their loop');
    const before = paths('[data-orb] path'); advance(30); assert.notDeepEqual(paths('[data-orb] path'), before);
    pointer(host, 'pointermove', 350, 245); advance(120);
    assert.ok(Number(document.querySelector('[data-rate]').getAttribute('data-rate')) < .2, 'hover dilates the clock');
    assert.ok(orbs.some(el => Number(el.getAttribute('data-lift')) > 1), 'the nearest sphere lifts off the track');
    finite();
    const observed = observers.at(-1); observed.fn([{ isIntersecting: false }]); assert.equal(frames.size, 0);
    observed.fn([{ isIntersecting: true }]); assert.ok(frames.size > 0);
    await React.act(() => root.render(React.createElement(Tempo, { paused: true }))); advance(2);
    const paused = paths('[data-orb] path'); advance(60); assert.deepEqual(paths('[data-orb] path'), paused); assert.equal(frames.size, 0);
    await React.act(() => root.render(React.createElement(Tempo)));
    media.matches = true; listeners.forEach(fn => fn()); advance(2);
    const still = paths('[data-orb] path'); pointer(host, 'pointermove', 470, 240); advance(60);
    assert.deepEqual(paths('[data-orb] path'), still); assert.equal(frames.size, 0);
    await React.act(() => root.unmount()); mounted = false;
    assert.equal(disconnected, 6); assert.equal(listeners.size, 0); assert.equal(frames.size, 0);
    pointer(host, 'pointermove', 350, 220); assert.equal(frames.size, 0);
  } finally {
    if (mounted) await React.act(() => root.unmount());
    dom.window.close();
    for (const [key, descriptor] of original) { if (descriptor) Object.defineProperty(globalThis, key, descriptor); else delete globalThis[key]; }
  }
});
