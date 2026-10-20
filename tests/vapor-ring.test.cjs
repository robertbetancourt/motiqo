const { test } = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("node:fs"),
  path = require("node:path"),
  Module = require("node:module"),
  ts = require("typescript");
function load(file, mocks = {}) {
  const filename = path.resolve(__dirname, "..", file),
    m = new Module(filename, module);
  m.filename = filename;
  m.paths = Module._nodeModulePaths(path.dirname(filename));
  const normal = m.require.bind(m);
  m.require = (id) => (Object.hasOwn(mocks, id) ? mocks[id] : normal(id));
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
const defaults = {
  warmColor: "#ff5549",
  coldColor: "#4ca9ad",
  smokeDensity: 1.25,
  flowSpeed: 0.7,
  turbulence: 1.1,
  ringRadius: 0.25,
  paused: false,
};

test("the continuous smoke field transports existing dye with bounded substeps and no framebuffer feedback", () => {
  const targets = [],
    draws = [];
  const gpu = {
    pass: () => ({}),
    target(width, height) {
      const target = { width, height, texture: { id: targets.length } };
      targets.push(target);
      return target;
    },
    draw(pass, destination, uniforms) {
      assert.notEqual(uniforms.uState.texture, destination.texture);
      draws.push({ destination, ...uniforms });
    },
  };
  const { createVaporFlow } = load("components/originals/vapor-flow.ts", {
    "./native-gl": load("components/originals/native-gl.ts"),
    "./vapor-shaders": load("components/originals/vapor-shaders.ts"),
  });
  const flow = createVaporFlow(gpu, false);
  const first = flow.update(2.5, 0, 0.25, 1.1);
  assert.equal(targets.length, 2);
  assert.equal(targets[0].width, 256);
  assert.ok(
    draws.length > 0 && draws.length <= 48,
    "a bounded warm-up yields a complete static composition",
  );
  const initialCount = draws.length;
  assert.equal(flow.update(2.5, 0, 0.25, 1.1), first);
  assert.equal(
    draws.length,
    initialCount,
    "paused paints retain the transported field",
  );
  flow.update(2.58, 0.08, 0.25, 1.1);
  assert.equal(targets.length, 2, "no frame allocates textures");
  assert.ok(draws.length - initialCount <= 3);
  assert.ok(draws.slice(initialCount).every((draw) => draw.uDt <= 1 / 30));
  assert.ok(
    draws
      .slice(initialCount)
      .every(
        (draw) =>
          draw.uState.texture === targets[0].texture ||
          draw.uState.texture === targets[1].texture,
      ),
  );
});

test("VaporRing bounds pixels and uniforms, caps high-refresh draws and retains one GPU owner across live settings", () => {
  let render,
    isPaused,
    resize,
    disposed = 0,
    clockDisposed = 0,
    invalidated = 0,
    passes = 0;
  const draws = [],
    host = { dataset: {} },
    canvas = { width: 1, height: 1 };
  const gpu = {
    pass() {
      passes++;
      return {};
    },
    draw(pass, target, uniforms) {
      draws.push(uniforms);
    },
    dispose() {
      disposed++;
    },
  };
  const native = load("components/originals/native-gl.ts");
  const { createVaporEngine } = load("components/originals/vapor-engine.ts", {
    "./native-gl": { ...native, createNativeGL: () => gpu },
    "./vapor-shaders": load("components/originals/vapor-shaders.ts"),
    "./vapor-flow": { createVaporFlow: () => ({ update: () => ({}) }) },
    "./effect-runtime": {
      effectRuntime(h, c, paint, paused, onResize) {
        render = paint;
        isPaused = paused;
        resize = onResize;
        return {
          invalidate() {
            invalidated++;
          },
          dispose() {
            clockDisposed++;
          },
        };
      },
    },
  });
  let values = { ...defaults };
  const engine = createVaporEngine(host, canvas, false, () => values);
  resize(1600, 1200, 3);
  assert.ok(
    canvas.width * canvas.height <= 301000,
    "standalone pixel budget stays bounded",
  );
  for (let i = 0; i < 120; i++) render(2.5 + i / 120, 1 / 120);
  assert.equal(draws.length, 60);
  const initialTime = draws.at(-1).uTime;
  values = { ...values, flowSpeed: 2 };
  engine.sync();
  render(3.5, 0);
  assert.ok(
    Math.abs(draws.at(-1).uTime - initialTime) < 0.01,
    "changing speed does not seek the simulation",
  );
  const pausedTime = draws.at(-1).uTime;
  values = { ...values, paused: true };
  engine.sync();
  render(9, 0);
  assert.equal(draws.at(-1).uTime, pausedTime);
  values = {
    ...values,
    warmColor: "invalid",
    smokeDensity: Infinity,
    turbulence: 9,
    ringRadius: -1,
  };
  engine.sync();
  render(4, 0);
  assert.equal(passes, 1);
  assert.equal(invalidated, 3);
  const uniforms = draws.at(-1);
  assert.equal(uniforms.uDensity, 0.2);
  assert.equal(uniforms.uTurbulence, 2);
  assert.equal(uniforms.uRadius, 0.18);
  assert.deepEqual(
    uniforms.uWarm,
    native.nativeColor(defaults.warmColor, defaults.warmColor),
  );
  values = { ...defaults, flowSpeed: 0 };
  assert.equal(isPaused(), true);
  values = { ...defaults, paused: true };
  assert.equal(isPaused(), true);
  engine.dispose();
  engine.dispose();
  assert.equal(disposed, 1);
  assert.equal(clockDisposed, 1);
  engine.sync();
  assert.equal(invalidated, 3);
  const compact = createVaporEngine(host, canvas, true, () => defaults);
  resize(700, 700, 3);
  assert.ok(canvas.width * canvas.height <= 106000);
  compact.dispose();
});

test("a shader initialization failure releases its GPU without starting a clock", () => {
  let released = 0;
  const { createVaporEngine } = load("components/originals/vapor-engine.ts", {
    "./native-gl": {
      createNativeGL: () => ({
        pass() {
          throw Error("compile");
        },
        dispose() {
          released++;
        },
      }),
    },
    "./vapor-shaders": { vaporFragment: "" },
    "./vapor-flow": {
      createVaporFlow() {
        throw Error("must not start");
      },
    },
    "./effect-runtime": {
      effectRuntime() {
        throw Error("must not start");
      },
    },
  });
  assert.throws(
    () => createVaporEngine({}, {}, false, () => defaults),
    /compile/,
  );
  assert.equal(released, 1);
});

test("VaporRing preserves a readable no-GPU fallback, updates uniforms without remounting and restores lost contexts safely", async () => {
  const React = require("react"),
    { JSDOM } = require("jsdom");
  const dom = new JSDOM('<div id="mount"></div>'),
    keys = ["window", "document", "HTMLElement", "IS_REACT_ACT_ENVIRONMENT"],
    old = new Map(
      keys.map((k) => [k, Object.getOwnPropertyDescriptor(globalThis, k)]),
    );
  for (const [k, value] of Object.entries({
    window: dom.window,
    document: dom.window.document,
    HTMLElement: dom.window.HTMLElement,
    IS_REACT_ACT_ENVIRONMENT: true,
  }))
    Object.defineProperty(globalThis, k, {
      value,
      writable: true,
      configurable: true,
    });
  const instances = [];
  const Component = load("components/originals/vapor-ring.tsx", {
    "./vapor-engine": {
      createVaporEngine(host, canvas, compact, options) {
        const instance = {
          disposed: false,
          syncs: 0,
          options,
          dispose() {
            assert.equal(this.disposed, false);
            this.disposed = true;
          },
          sync() {
            this.syncs++;
          },
        };
        instances.push(instance);
        return instance;
      },
    },
  }).default;
  const root = require("react-dom/client").createRoot(
    document.getElementById("mount"),
  );
  try {
    await React.act(() =>
      root.render(
        React.createElement(
          React.StrictMode,
          null,
          React.createElement(Component),
        ),
      ),
    );
    const count = instances.length;
    await React.act(() =>
      root.render(
        React.createElement(
          React.StrictMode,
          null,
          React.createElement(Component, {
            temperature: 31,
            smokeDensity: 1.8,
            paused: true,
          }),
        ),
      ),
    );
    assert.equal(instances.length, count);
    assert.equal(instances.at(-1).options().smokeDensity, 1.8);
    assert.equal(instances.at(-1).options().paused, true);
    assert.equal(document.querySelectorAll("canvas").length, 1);
    assert.equal(document.querySelectorAll(".mq-vapor-fallback").length, 1);
    assert.match(
      document.querySelector("section").getAttribute("aria-label"),
      /31 degrees Celsius/,
    );
    assert.equal(
      document.querySelectorAll("button,select,input").length,
      0,
      "all customization is external",
    );
    const surface = document.querySelector("canvas");
    const lost = new window.Event("webglcontextlost", { cancelable: true });
    await React.act(() => surface.dispatchEvent(lost));
    assert.equal(lost.defaultPrevented, true);
    assert.equal(instances.at(-1).disposed, true);
    assert.equal(
      document.querySelector(".mq-vapor-volume").dataset.failed,
      "true",
    );
    await React.act(() =>
      surface.dispatchEvent(new window.Event("webglcontextrestored")),
    );
    assert.equal(instances.length, count + 1);
    assert.equal(
      document.querySelector(".mq-vapor-volume").dataset.failed,
      undefined,
    );
    await React.act(() => root.unmount());
    assert.ok(instances.every((instance) => instance.disposed));
  } finally {
    dom.window.close();
    for (const [k, value] of old) {
      if (value) Object.defineProperty(globalThis, k, value);
      else delete globalThis[k];
    }
  }
});

test("the new component has complete portable sources, moods and prompt alongside the original ThermalSmoke", () => {
  const manifest = require("../registry/manifest.json"),
    item = manifest.items.find((i) => i.id === "vapor-ring");
  assert.ok(manifest.items.some((i) => i.id === "thermal-smoke"));
  assert.equal(item.files.length, 6);
  assert.equal(item.hint, "");
  const controls = load("lib/element-controls.ts");
  for (const mood of item.moods)
    assert.deepEqual(
      controls.normalizeSettings(item.id, mood.settings),
      mood.settings,
    );
  const code = controls.usageFor(item, controls.defaultsFor(item.id));
  assert.match(code, /height: 620/);
  assert.match(code, /turbulence=\{1.1\}/);
  assert.match(item.brief, /eighteen/);
  assert.match(item.brief, /Beer-Lambert/);
  for (const file of item.files)
    assert.ok(fs.existsSync(path.resolve(__dirname, "..", file.source)));
});
