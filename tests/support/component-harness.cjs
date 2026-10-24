const fs = require("node:fs"),
  path = require("node:path"),
  Module = require("node:module"),
  ts = require("typescript-compiler-api"),
  React = require("react"),
  { JSDOM } = require("jsdom");
function load(file, mocks = {}) {
  const filename = path.resolve(__dirname, "../..", file),
    m = new Module(filename, module);
  m.filename = filename;
  m.paths = Module._nodeModulePaths(path.dirname(filename));
  const normal = m.require.bind(m);
  m.require = (id) => {
    if (Object.hasOwn(mocks, id)) return mocks[id];
    if (id.endsWith(".css")) return {};
    if (id.startsWith(".")) {
      let f = path.resolve(path.dirname(filename), id);
      for (const ext of [".ts", ".tsx"])
        if (fs.existsSync(f + ext))
          return load(
            path.relative(path.resolve(__dirname, "../.."), f + ext),
            mocks,
          );
    }
    return normal(id);
  };
  m._compile(
    ts.transpileModule(fs.readFileSync(filename, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        jsx: ts.JsxEmit.ReactJSX,
        target: ts.ScriptTarget.ES2022,
        esModuleInterop: true,
      },
    }).outputText,
    filename,
  );
  return m.exports;
}
async function mount(Component, props = {}, reduced = false) {
  const dom = new JSDOM('<div id="root"></div>', {
      pretendToBeVisual: true,
      url: "http://localhost",
    }),
    old = new Map(),
    frames = new Map(),
    observers = [],
    mediaListeners = new Set();
  let sequence = 0,
    now = 0;
  const media = {
    matches: reduced,
    addEventListener(_, fn) {
      mediaListeners.add(fn);
    },
    removeEventListener(_, fn) {
      mediaListeners.delete(fn);
    },
  };
  class Observer {
    constructor(fn) {
      this.fn = fn;
      observers.push(this);
    }
    observe() {}
    disconnect() {
      this.disconnected = true;
    }
  }
  const raf = (fn) => {
      frames.set(++sequence, fn);
      return sequence;
    },
    cancel = (id) => frames.delete(id);
  for (const [k, v] of Object.entries({
    window: dom.window,
    document: dom.window.document,
    HTMLElement: dom.window.HTMLElement,
    Element: dom.window.Element,
    IS_REACT_ACT_ENVIRONMENT: true,
    requestAnimationFrame: raf,
    cancelAnimationFrame: cancel,
    matchMedia: () => media,
    ResizeObserver: Observer,
    IntersectionObserver: Observer,
    devicePixelRatio: 1,
  })) {
    old.set(k, Object.getOwnPropertyDescriptor(globalThis, k));
    Object.defineProperty(globalThis, k, {
      value: v,
      configurable: true,
      writable: true,
    });
  }
  dom.window.matchMedia = () => media;
  dom.window.requestAnimationFrame = raf;
  dom.window.cancelAnimationFrame = cancel;
  dom.window.HTMLElement.prototype.getBoundingClientRect = () => ({
    left: 0,
    top: 0,
    width: 900,
    height: 620,
    right: 900,
    bottom: 620,
  });
  dom.window.HTMLCanvasElement.prototype.getContext = () => null;
  const root = require("react-dom/client").createRoot(
    document.getElementById("root"),
  );
  await React.act(() =>
    root.render(
      React.createElement(
        React.StrictMode,
        null,
        React.createElement(Component, props),
      ),
    ),
  );
  return {
    dom,
    frames,
    observers,
    media,
    async update(next) {
      await React.act(() =>
        root.render(
          React.createElement(
            React.StrictMode,
            null,
            React.createElement(Component, next),
          ),
        ),
      );
    },
    async advance(count = 1) {
      await React.act(() => {
        for (let i = 0; i < count; i++) {
          now += 1000 / 60;
          const batch = [...frames.values()];
          frames.clear();
          batch.forEach((fn) => fn(now));
        }
      });
    },
    async key(el, key) {
      await React.act(() =>
        el.dispatchEvent(
          new dom.window.KeyboardEvent("keydown", { key, bubbles: true }),
        ),
      );
    },
    async click(el) {
      await React.act(() => el.click());
    },
    async close() {
      await React.act(() => root.unmount());
      dom.window.close();
      for (const [k, v] of old) {
        if (v) Object.defineProperty(globalThis, k, v);
        else delete globalThis[k];
      }
    },
  };
}
module.exports = { load, mount, React };
