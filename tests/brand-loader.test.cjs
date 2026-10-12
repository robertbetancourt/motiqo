const { test, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const { JSDOM } = require('jsdom');

const dom = new JSDOM('<!doctype html><body><div id="test-root"></div></body>', { url: 'http://localhost' });
global.window = dom.window;
global.document = dom.window.document;
global.HTMLElement = dom.window.HTMLElement;
global.IS_REACT_ACT_ENVIRONMENT = true;
const React = require('react');
const { createRoot } = require('react-dom/client');
const { act } = React;

// Compile the real TSX components without adding a separate test bundler.
const project = path.resolve(__dirname, '..');
const modules = new Map();
function loadComponent(filename) {
  if (modules.has(filename)) return modules.get(filename).exports;
  const compiled = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 },
    fileName: filename,
  }).outputText;
  const entry = new Module(filename, module);
  entry.filename = filename;
  entry.paths = Module._nodeModulePaths(path.dirname(filename));
  modules.set(filename, entry);
  entry.require = name => {
    if (name.startsWith('@/') || name.startsWith('.')) {
      const base = name.startsWith('@/') ? path.join(project, name.slice(2)) : path.resolve(path.dirname(filename), name);
      for (const extension of ['.tsx', '.ts']) {
        if (fs.existsSync(base + extension)) return loadComponent(base + extension);
      }
    }
    return Module.prototype.require.call(entry, name);
  };
  entry._compile(compiled, filename);
  return entry.exports;
}
const InitialLoader = loadComponent(path.join(project, 'components/initial-page-loader.tsx')).default;
const RouteLoading = loadComponent(path.join(project, 'app/loading.tsx')).default;
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const deferred = () => { let resolve; const promise = new Promise(done => { resolve = done; }); return { promise, resolve }; };
let root;
let readiness = 'complete';
Object.defineProperty(document, 'readyState', { get: () => readiness });
function fonts(status, ready) { Object.defineProperty(document, 'fonts', { configurable: true, value: { status, ready } }); }

beforeEach(() => {
  readiness = 'complete';
  fonts('loaded', Promise.resolve());
  root = createRoot(document.querySelector('#test-root'));
});
afterEach(async () => {
  await act(async () => root.unmount());
  document.body.innerHTML = '<div id="test-root"></div>';
});

test('ready page does not play an intro or show a loader', async () => {
  await act(async () => root.render(React.createElement(InitialLoader)));
  await act(async () => sleep(160));
  assert.equal(document.querySelector('.brand-loader'), null);
});

test('pending fonts show branding even in an existing session, then finish immediately', async () => {
  window.sessionStorage.setItem('motiqo-intro-seen', 'yes');
  const ready = deferred();
  fonts('loading', ready.promise);
  await act(async () => root.render(React.createElement(InitialLoader)));
  await act(async () => sleep(160));
  assert.equal(document.querySelectorAll('.brand-loader').length, 1);
  assert.equal(document.querySelector('.brand-loader').getAttribute('role'), 'status');
  assert.equal(document.querySelectorAll('.loader-isotype path').length, 5);
  await act(async () => ready.resolve());
  assert.equal(document.querySelector('.brand-loader'), null);
});

test('initial loader waits for both fonts and the document', async () => {
  const ready = deferred();
  readiness = 'loading';
  fonts('loading', ready.promise);
  await act(async () => root.render(React.createElement(InitialLoader)));
  await act(async () => sleep(160));
  await act(async () => ready.resolve());
  assert.ok(document.querySelector('.brand-loader'));
  await act(async () => {
    readiness = 'complete';
    window.dispatchEvent(new window.Event('load'));
  });
  assert.equal(document.querySelector('.brand-loader'), null);
});

test('fast font load never flashes branding after it finishes', async () => {
  const ready = deferred();
  fonts('loading', ready.promise);
  let shown = false;
  const observer = new window.MutationObserver(() => { if (document.querySelector('.brand-loader')) shown = true; });
  observer.observe(document.body, { childList: true, subtree: true });
  await act(async () => root.render(React.createElement(InitialLoader)));
  await act(async () => ready.resolve());
  await act(async () => sleep(160));
  observer.disconnect();
  assert.equal(shown, false);
  assert.equal(document.querySelector('.brand-loader'), null);
});

test('route Suspense uses the same animation only until its content is ready', async () => {
  const ready = deferred();
  let resolved = false;
  function Section() {
    if (!resolved) throw ready.promise;
    return React.createElement('h1', { id: 'ready-section' }, 'Section ready');
  }
  await act(async () => root.render(React.createElement(React.Suspense, { fallback: React.createElement(RouteLoading) }, React.createElement(Section))));
  await act(async () => sleep(160));
  assert.ok(document.querySelector('.brand-loader'));
  await act(async () => { resolved = true; ready.resolve(); });
  assert.equal(document.querySelector('.brand-loader'), null);
  assert.ok(document.querySelector('#ready-section'));
});
