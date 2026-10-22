const { test } = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("node:fs"),
  path = require("node:path"),
  Module = require("node:module"),
  ts = require("typescript-compiler-api"),
  React = require("react"),
  { JSDOM } = require("jsdom");
function load(file) {
  const name = path.resolve(__dirname, "..", file),
    m = new Module(name, module);
  m.filename = name;
  m.paths = Module._nodeModulePaths(path.dirname(name));
  m._compile(
    ts.transpileModule(fs.readFileSync(name, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        jsx: ts.JsxEmit.ReactJSX,
        target: ts.ScriptTarget.ES2022,
      },
    }).outputText,
    name,
  );
  return m.exports.default;
}
const Signal = load("components/originals/signal-grid.tsx"),
  Halftone = load("components/originals/halftone-wordmark.tsx");
async function mount(Component, props = {}, canvas = false, reduced = false) {
  const dom = new JSDOM('<div id="root"></div>', { pretendToBeVisual: true });
  const previous = {};
  for (const key of [
    "window",
    "document",
    "HTMLElement",
    "IS_REACT_ACT_ENVIRONMENT",
    "ResizeObserver",
    "IntersectionObserver",
    "requestAnimationFrame",
    "cancelAnimationFrame",
    "matchMedia",
    "devicePixelRatio",
  ])
    previous[key] = global[key];
  global.window = dom.window;
  global.document = dom.window.document;
  global.HTMLElement = dom.window.HTMLElement;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  const frames = new Map();
  let count = 0,
    disconnects = 0;
  global.requestAnimationFrame = (fn) => {
    frames.set(++count, fn);
    return count;
  };
  global.cancelAnimationFrame = (id) => frames.delete(id);
  global.devicePixelRatio = 1;
  global.matchMedia = () => ({
    matches: reduced,
    addEventListener() {},
    removeEventListener() {},
  });
  global.ResizeObserver = class {
    observe() {}
    disconnect() {
      disconnects++;
    }
  };
  let intersect;
  global.IntersectionObserver = class extends global.ResizeObserver {
    constructor(callback) {
      super();
      intersect = callback;
    }
  };
  if (canvas) {
    dom.window.HTMLCanvasElement.prototype.getBoundingClientRect = () => ({
      width: 400,
      height: 220,
      left: 0,
      top: 0,
    });
    dom.window.HTMLCanvasElement.prototype.getContext = () => ({
      setTransform() {},
      clearRect() {},
      measureText: () => ({ width: 420 }),
      fillText() {},
      getImageData: () => ({ data: new Uint8Array(400 * 220 * 4).fill(255) }),
      beginPath() {},
      arc() {},
      fill() {},
    });
  } else dom.window.HTMLCanvasElement.prototype.getContext = () => null;
  const { createRoot } = require("react-dom/client"),
    root = createRoot(document.getElementById("root"));
  await React.act(() => root.render(React.createElement(Component, props)));
  return {
    dom,
    frames,
    intersect: (visible) => intersect([{ isIntersecting: visible }]),
    get disconnects() {
      return disconnects;
    },
    async update(p) {
      await React.act(() => root.render(React.createElement(Component, p)));
    },
    async close() {
      await React.act(() => root.unmount());
      for (const [k, v] of Object.entries(previous)) {
        if (v === undefined) delete global[k];
        else global[k] = v;
      }
      dom.window.close();
    },
  };
}
test("SignalGrid keyboard inspection, pinning, replay and bounded values", async () => {
  const h = await mount(Signal, { values: [-5, NaN, 120, 50] });
  try {
    assert.equal(document.querySelectorAll("rect").length, 40);
    const plot = document.querySelector(".sg-plot"),
      key = async (k) =>
        React.act(() =>
          plot.dispatchEvent(
            new window.KeyboardEvent("keydown", { key: k, bubbles: true }),
          ),
        );
    await key("Home");
    assert.match(document.querySelector(".sg-tooltip").textContent, /0%/);
    await key("End");
    assert.match(document.querySelector(".sg-tooltip").textContent, /50%/);
    await key("Enter");
    assert.match(document.querySelector(".sg-controls").textContent, /pinned/);
    await key("Escape");
    assert.equal(document.querySelector(".sg-tooltip"), null);
    await key("ArrowLeft");
    assert.match(document.querySelector(".sg-tooltip").textContent, /100%/);
    await React.act(() =>
      document.querySelector(".sg-controls button").click(),
    );
    assert.equal(document.querySelector(".sg-tooltip"), null);
    await h.update({ values: [] });
    assert.equal(document.querySelectorAll("rect").length, 280);
    await React.act(() => document.querySelector(".sg-range button").click());
    assert.equal(document.querySelectorAll("rect").length, 140);
    assert.equal(
      document.querySelector(".sg-range button").getAttribute("aria-pressed"),
      "true",
    );
  } finally {
    await h.close();
  }
});
test("Halftone keeps readable fallback without Canvas and normalizes empty copy", async () => {
  const h = await mount(Halftone, { word: "  " });
  try {
    assert.equal(document.querySelector(".hw-fallback").textContent, "HalftoneWordmark");
    assert.equal(
      document.querySelector(".hw-fallback").style.visibility,
      "visible",
    );
    await React.act(() => document.querySelector("button").click());
    assert.equal(h.frames.size, 0);
  } finally {
    await h.close();
  }
});
test("Halftone creates dots, schedules wave and releases observers and frames", async () => {
  const h = await mount(Halftone, {}, true);
  try {
    assert.equal(
      document.querySelector(".hw-fallback").style.visibility,
      "hidden",
    );
    assert.equal(h.frames.size, 1);
    const run = () => {
      const [id, fn] = h.frames.entries().next().value;
      h.frames.delete(id);
      fn(1000);
    };
    run();
    assert.equal(h.frames.size, 0, "settled wordmark sleeps");
    await React.act(() => document.querySelector("button").click());
    assert.equal(h.frames.size, 1);
    await h.update({ paused: true });
    assert.equal(h.disconnects, 2);
    const [id, fn] = h.frames.entries().next().value;
    h.frames.delete(id);
    fn(1016);
    assert.equal(h.frames.size, 0, "paused draws once");
  } finally {
    await h.close();
  }
  assert.equal(h.disconnects, 4);
  assert.equal(h.frames.size, 0);
});

test("Halftone suspends offscreen waves and respects reduced motion", async () => {
  const h = await mount(Halftone, {}, true);
  try {
    h.intersect(false);
    assert.equal(h.frames.size, 0);
    await React.act(() => document.querySelector("button").click());
    assert.equal(h.frames.size, 0);
    h.intersect(true);
    assert.equal(h.frames.size, 1);
  } finally {
    await h.close();
  }
  const reduced = await mount(Halftone, {}, true, true);
  try {
    const [id, fn] = reduced.frames.entries().next().value;
    reduced.frames.delete(id);
    fn(1000);
    await React.act(() => document.querySelector("button").click());
    assert.equal(reduced.frames.size, 0);
  } finally {
    await reduced.close();
  }
});
