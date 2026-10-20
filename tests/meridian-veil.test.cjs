const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript-compiler-api');
const React = require('react');
const THREE = require('three');
const { JSDOM } = require('jsdom');

function load(file, mocks = {}) {
  const filename = path.resolve(__dirname, '..', file);
  const m = new Module(filename, module);
  m.filename = filename;
  m.paths = Module._nodeModulePaths(path.dirname(filename));
  const normal = m.require.bind(m);
  m.require = (id) => mocks[id] ?? normal(id);
  m._compile(
    ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        jsx: ts.JsxEmit.ReactJSX,
        target: ts.ScriptTarget.ES2022,
      },
    }).outputText,
    filename,
  );
  return m.exports;
}

const meridian = load('components/originals/meridian-veil.tsx');

test('MeridianVeil generates structured particle coordinates and deterministic fallback points', () => {
  const data = meridian.createMeridianGeometry(60, 150);
  assert.equal(data.total, 9000);
  assert.equal(data.positions.length, 27000);
  assert.equal(data.uvs.length, 18000);
  assert.deepEqual(data, meridian.createMeridianGeometry(60, 150));

  for (let i = 0; i < 9000; i++) {
    const p = i * 3;
    const u = i * 2;
    assert.ok(Number.isFinite(data.positions[p]));
    assert.ok(Number.isFinite(data.positions[p + 1]));
    assert.ok(Number.isFinite(data.positions[p + 2]));
    const dist = Math.hypot(data.positions[p], data.positions[p + 1], data.positions[p + 2]);
    assert.ok(Math.abs(dist - 1.0) < 1e-4, 'Particle must lie on unit sphere');
    assert.ok(data.uvs[u] >= 0 && data.uvs[u] <= 1);
    assert.ok(data.uvs[u + 1] >= 0 && data.uvs[u + 1] <= 1);
  }

  // Bounds clamping
  assert.equal(meridian.createMeridianGeometry(1, 1).total, 12 * 30);
  assert.equal(meridian.createMeridianGeometry(1e6, 1e6).total, 180 * 300);

  // Fallback points for SSR
  const fallback = meridian.createMeridianFallbackPoints(36, 40);
  assert.equal(fallback.length, 1440);
  for (const pt of fallback) {
    assert.ok(Number.isFinite(pt.x) && Number.isFinite(pt.y) && Number.isFinite(pt.opacity));
    assert.ok(pt.opacity >= 0.12 && pt.opacity <= 0.95);
  }

  // Static SSR render
  const html = require('react-dom/server').renderToStaticMarkup(
    React.createElement(meridian.default, { showThemeSwitcher: true, centerLabel: '3.14' }),
  );
  const dom = new JSDOM(html);
  try {
    assert.equal(dom.window.document.querySelectorAll('circle').length, 1442);
    assert.equal(dom.window.document.querySelectorAll('.theme-dot').length, 5);
    assert.ok(html.includes('3.14'));
    assert.ok(!/NaN|Infinity/.test(html));
  } finally {
    dom.window.close();
  }
});

test('MeridianVeil inspector settings generate valid portable component usage', () => {
  const controls = load('lib/element-controls.ts');
  const catalog = load('lib/catalog.ts', { './element-controls': controls });
  const element = catalog.elements.find((e) => e.id === 'meridian-veil');
  assert.ok(element, 'meridian-veil must exist in catalog');

  const settings = {
    ...controls.defaultsFor('meridian-veil'),
    theme: 'magenta',
    meridianCount: 72,
    pointsPerMeridian: 180,
    waveAmplitude: 0.85,
    speed: 1.2,
    interactive: 'disabled',
    showThemeSwitcher: 'hide',
  };

  const code = controls.usageFor(element, settings);
  assert.match(code, /theme="magenta"/);
  assert.match(code, /meridianCount=\{72\}/);
  assert.match(code, /pointsPerMeridian=\{180\}/);
  assert.match(code, /waveAmplitude=\{0\.85\}/);
  assert.match(code, /speed=\{1\.2\}/);
  assert.match(code, /interactive=\{false\}/);
  assert.match(code, /showThemeSwitcher=\{false\}/);
});

test('MeridianVeil 3-layer architecture, shaders, pointer/keyboard input and full lifecycle cleanup', async () => {
  const dom = new JSDOM('<div id="mount"></div>', { pretendToBeVisual: true });
  const frames = new Map();
  const listeners = new Set();
  const sizes = [];
  const visible = [];
  const resources = new Set();
  let serial = 0;
  let now = 1000;
  let width = 640;
  let height = 480;
  let renders = 0;
  let geometries = 0;
  let forced = 0;
  let disconnected = 0;
  let lastScene;
  let lastCamera;
  let available = true;

  class Geometry extends THREE.BufferGeometry {
    constructor() {
      super();
      resources.add(this);
      geometries++;
      this.addEventListener('dispose', () => resources.delete(this));
    }
  }

  class PlaneGeom extends THREE.PlaneGeometry {
    constructor(w, h) {
      super(w, h);
      resources.add(this);
      geometries++;
      this.addEventListener('dispose', () => resources.delete(this));
    }
  }

  class SphereGeom extends THREE.SphereGeometry {
    constructor(r, ws, hs) {
      super(r, ws, hs);
      resources.add(this);
      geometries++;
      this.addEventListener('dispose', () => resources.delete(this));
    }
  }

  class Material extends THREE.ShaderMaterial {
    constructor(options) {
      super(options);
      resources.add(this);
      assert.equal(options.blending, THREE.AdditiveBlending);
      assert.equal(options.depthWrite, false);
      this.addEventListener('dispose', () => resources.delete(this));
    }
  }

  class Renderer {
    constructor({ canvas }) {
      if (!available) throw new Error('No GPU');
      this.canvas = canvas;
      resources.add(this);
    }
    setClearColor() {}
    setPixelRatio(value) {
      this.dpr = value;
    }
    setSize(w, h) {
      this.canvas.width = w * (this.dpr || 1);
      this.canvas.height = h * (this.dpr || 1);
    }
    render(scene, camera) {
      lastScene = scene;
      lastCamera = camera;
      renders++;
    }
    dispose() {
      resources.delete(this);
    }
    forceContextLoss() {
      forced++;
    }
  }

  const media = {
    matches: false,
    addEventListener: (_, fn) => listeners.add(fn),
    removeEventListener: (_, fn) => listeners.delete(fn),
  };

  class Size {
    constructor(fn) {
      this.fn = fn;
      sizes.push(this);
    }
    observe() {
      this.fn();
    }
    disconnect() {
      disconnected++;
    }
  }

  class Visible {
    constructor(fn) {
      this.fn = fn;
      visible.push(this);
    }
    observe() {
      this.fn([{ isIntersecting: true }]);
    }
    disconnect() {
      disconnected++;
    }
  }

  dom.window.HTMLElement.prototype.getBoundingClientRect = () => ({
    left: 0,
    top: 0,
    width,
    height,
  });

  const globals = {
    window: dom.window,
    document: dom.window.document,
    HTMLElement: dom.window.HTMLElement,
    IS_REACT_ACT_ENVIRONMENT: true,
    performance: { now: () => now },
    matchMedia: () => media,
    ResizeObserver: Size,
    IntersectionObserver: Visible,
    requestAnimationFrame: (fn) => {
      frames.set(++serial, fn);
      return serial;
    },
    cancelAnimationFrame: (id) => frames.delete(id),
  };

  const old = new Map(Object.keys(globals).map((k) => [k, Object.getOwnPropertyDescriptor(globalThis, k)]));
  Object.entries(globals).forEach(([k, v]) => Object.defineProperty(globalThis, k, { value: v, writable: true, configurable: true }));

  const root = require('react-dom/client').createRoot(document.getElementById('mount'));
  const advance = (n = 60, hz = 60) => {
    for (let i = 0; i < n && frames.size; i++) {
      now += 1000 / hz;
      const batch = [...frames.values()];
      frames.clear();
      batch.forEach((fn) => fn(now));
    }
  };

  let mounted = true;
  try {
    const MeridianVeil = load('components/originals/meridian-veil.tsx', {
      three: {
        ...THREE,
        BufferGeometry: Geometry,
        PlaneGeometry: PlaneGeom,
        SphereGeometry: SphereGeom,
        ShaderMaterial: Material,
        WebGLRenderer: Renderer,
      },
    }).default;

    const render = (props) =>
      React.act(() => root.render(React.createElement(React.StrictMode, null, React.createElement(MeridianVeil, props))));

    await render({ showThemeSwitcher: true });

    const host = document.querySelector('.meridian-veil');
    const canvas = host.querySelector('canvas');
    assert.ok(host, 'Host element must exist');
    assert.ok(canvas, 'Canvas element must exist');

    // Verify 3 layers inside centralGroup
    const group = lastScene.children[0];
    assert.equal(group.children.length, 3, 'Must contain 3 layers: Halo, Core, and Curtain');
    const haloMesh = group.children[0];
    const coreMesh = group.children[1];
    const curtainPoints = group.children[2];

    assert.ok(curtainPoints.isPoints, 'Layer 3 must be THREE.Points');
    assert.equal(curtainPoints.geometry.getAttribute('position').count, 9000);
    assert.equal(curtainPoints.geometry.getAttribute('aUv').itemSize, 2);

    // Verify shader formulas
    assert.match(curtainPoints.material.vertexShader, /snoise/);
    assert.match(curtainPoints.material.vertexShader, /polarPinch/);
    assert.match(curtainPoints.material.vertexShader, /curtainZone/);
    assert.match(curtainPoints.material.vertexShader, /pow\(clamp\(sin\(theta\s*-\s*uTime\s*\*\s*0\.5\)\s*\*\s*0\.5\s*\+\s*0\.5,\s*0\.0,\s*1\.0\),\s*2\.2\)/);
    assert.match(coreMesh.material.fragmentShader, /pow\(1\.0\s*-\s*abs\(dot\(vNormal,\s*vViewDir\)\),\s*2\.4\)/);

    // Initial render
    advance();
    assert.equal(host.dataset.ready, 'true');
    assert.equal(host.dataset.theme, 'mint');
    assert.equal(host.dataset.particles, '9000');

    // Particle positions stay on GPU in vertex shader
    const posArray = curtainPoints.geometry.getAttribute('position').array;
    advance(60);
    assert.equal(curtainPoints.geometry.getAttribute('position').array, posArray);

    // Pointer move interaction
    host.dispatchEvent(new dom.window.MouseEvent('pointermove', { clientX: 400, clientY: 200 }));
    advance(1);
    assert.ok(curtainPoints.material.uniforms.uHover.value > 0);

    // Theme switching via props
    await render({ theme: 'magenta', meridianCount: 72, pointsPerMeridian: 180, showThemeSwitcher: true });
    advance(1);
    assert.equal(curtainPoints.geometry.getAttribute('position').count, 72 * 180);
    assert.equal(host.dataset.theme, 'magenta');

    // Theme dot click
    const dots = host.querySelectorAll('.theme-dot');
    assert.equal(dots.length, 5);
    await React.act(async () => {
      dots[3].dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
    });
    advance(1);
    assert.equal(host.dataset.theme, 'violet');

    // Keyboard interaction
    const sendKey = (k) => host.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: k, bubbles: true }));
    sendKey(' ');
    advance(1);
    assert.equal(host.dataset.held, 'true');
    sendKey(' ');
    advance(1);
    assert.equal(host.dataset.held, 'false');

    sendKey('ArrowLeft');
    sendKey('ArrowUp');
    advance(1);
    assert.ok(group.rotation.x !== 0);

    sendKey('Home');
    advance(60);
    assert.ok(Math.abs(group.rotation.x) < 0.005);

    // Paused prop
    await render({ paused: true, showThemeSwitcher: true });
    advance(1);
    const frozenTime = host.dataset.sceneTime;
    advance(30);
    assert.equal(host.dataset.sceneTime, frozenTime);

    // Context loss & restore
    const lost = new dom.window.Event('webglcontextlost', { cancelable: true });
    canvas.dispatchEvent(lost);
    assert.ok(lost.defaultPrevented);
    assert.equal(host.dataset.ready, undefined);

    canvas.dispatchEvent(new dom.window.Event('webglcontextrestored'));
    advance(1);
    assert.equal(host.dataset.ready, 'true');

    // Reduced motion
    media.matches = true;
    listeners.forEach((fn) => fn());
    advance(1);
    assert.equal(curtainPoints.material.uniforms.uTime.value, 0);
    assert.equal(curtainPoints.material.uniforms.uHover.value, 0);
    media.matches = false;
    listeners.forEach((fn) => fn());

    // Unmount and verify complete resource disposal
    document.getElementById('mount').remove();
    await React.act(() => root.unmount());
    mounted = false;

    assert.equal(resources.size, 0, 'All geometries, materials and renderer must be disposed');
    assert.equal(listeners.size, 0);
    assert.equal(canvas.width, 0);
    assert.equal(forced, 1);

    // Fallback on missing GPU
    available = false;
    const fallbackMount = document.createElement('div');
    document.body.appendChild(fallbackMount);
    const fallbackRoot = require('react-dom/client').createRoot(fallbackMount);
    await React.act(() => fallbackRoot.render(React.createElement(MeridianVeil)));
    assert.equal(fallbackMount.querySelector('.meridian-veil').dataset.failed, 'true');
    await React.act(() => fallbackRoot.unmount());
    assert.equal(resources.size, 0);
  } finally {
    if (mounted) await React.act(() => root.unmount());
    dom.window.close();
    for (const [k, v] of old) {
      if (v) Object.defineProperty(globalThis, k, v);
      else delete globalThis[k];
    }
  }
});
