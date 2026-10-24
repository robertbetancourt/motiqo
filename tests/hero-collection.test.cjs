const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs"),
  path = require("node:path"),
  Module = require("node:module");
const ts = require("typescript-compiler-api"),
  React = require("react"),
  { JSDOM } = require("jsdom");
function load(file, overrides = {}) {
  const filename = path.resolve(__dirname, "..", file),
    entry = new Module(filename, module);
  entry.filename = filename;
  entry.paths = Module._nodeModulePaths(path.dirname(filename));
  const normal = entry.require.bind(entry);
  entry.require = (id) =>
    overrides[id] ??
    (id.endsWith(".module.css")
      ? { default: new Proxy({}, { get: (_, key) => String(key) }) }
      : normal(id));
  entry._compile(
    ts.transpileModule(fs.readFileSync(filename, "utf8"), {
      fileName: filename,
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        jsx: ts.JsxEmit.ReactJSX,
        target: ts.ScriptTarget.ES2022,
      },
    }).outputText,
    filename,
  );
  return entry.exports;
}
async function environment(run) {
  const dom = new JSDOM('<div id="mount"></div>', {
      pretendToBeVisual: true,
      url: "http://localhost/hero",
    }),
    frames = new Map(),
    mediaListeners = new Set(),
    sizes = [],
    visible = [];
  let serial = 0,
    time = 1000;
  const media = {
    matches: false,
    addEventListener: (_, fn) => mediaListeners.add(fn),
    removeEventListener: (_, fn) => mediaListeners.delete(fn),
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
      this.off = true;
    }
  }
  class Visible {
    constructor(fn) {
      this.fn = fn;
      visible.push(this);
    }
    observe() {}
    disconnect() {
      this.off = true;
    }
  }
  const globals = {
      window: dom.window,
      document: dom.window.document,
      HTMLElement: dom.window.HTMLElement,
      ResizeObserver: Size,
      IntersectionObserver: Visible,
      matchMedia: () => media,
      requestAnimationFrame: (fn) => {
        frames.set(++serial, fn);
        return serial;
      },
      cancelAnimationFrame: (id) => frames.delete(id),
      IS_REACT_ACT_ENVIRONMENT: true,
    },
    old = new Map(
      Object.keys(globals).map((key) => [
        key,
        Object.getOwnPropertyDescriptor(globalThis, key),
      ]),
    );
  for (const [key, value] of Object.entries(globals))
    Object.defineProperty(globalThis, key, {
      value,
      writable: true,
      configurable: true,
    });
  Object.defineProperty(dom.window.HTMLElement.prototype, "clientWidth", {
    configurable: true,
    get: () => 1280,
  });
  Object.defineProperty(dom.window.HTMLElement.prototype, "clientHeight", {
    configurable: true,
    get: () => 900,
  });
  dom.window.HTMLElement.prototype.setPointerCapture = function () {};
  dom.window.HTMLDialogElement.prototype.showModal = function () {
    this.open = true;
  };
  dom.window.HTMLDialogElement.prototype.close = function () {
    this.open = false;
    this.dispatchEvent(new dom.window.Event("close"));
  };
  const root = require("react-dom/client").createRoot(
    document.getElementById("mount"),
  );
  const clock = load("components/heroes/hero-clock.ts"),
    runtime = load("components/heroes/collection-runtime.tsx", {
      "./hero-clock": clock,
    }),
    cinematic = load("components/heroes/cinematic-heroes.tsx", {
      "./collection-runtime": runtime,
    }),
    creative = load("components/heroes/creative-heroes.tsx", {
      "./collection-runtime": runtime,
      "../originals/hyperbolic-ribbon": {
        default: (props) =>
          React.createElement("div", {
            "data-ribbon": true,
            "data-paused": String(props.paused),
            "data-items": JSON.stringify(props.items),
            "data-background": props.backgroundColor,
          }),
      },
    });
  const click = async (text) => {
    const node = [...document.querySelectorAll("button")].find(
      (button) => button.textContent.trim() === text,
    );
    assert.ok(node, `Missing button ${text}`);
    await React.act(() => node.click());
    return node;
  };
  function tick(count = 1) {
    for (let i = 0; i < count; i++) {
      time += 1000 / 60;
      const batch = [...frames.values()];
      frames.clear();
      batch.forEach((fn) => fn(time));
    }
  }
  try {
    await run({
      root,
      dom,
      frames,
      media,
      mediaListeners,
      sizes,
      visible,
      cinematic,
      creative,
      click,
      tick,
    });
  } finally {
    await React.act(() => root.unmount());
    assert.equal(frames.size, 0, "all scene frames released");
    assert.equal(mediaListeners.size, 0, "all preference listeners released");
    assert.ok(
      sizes.every((observer) => observer.off) &&
        visible.every((observer) => observer.off),
      "all observers released",
    );
    dom.window.close();
    for (const [key, value] of old) {
      if (value) Object.defineProperty(globalThis, key, value);
      else delete globalThis[key];
    }
  }
}

function noOverlays() {
  assert.equal(
    document.querySelectorAll("dialog,[role=dialog],a,em").length,
    0,
  );
  assert.equal(
    [...document.querySelectorAll("button")].some((button) =>
      /pause|resume/i.test(
        button.getAttribute("aria-label") || button.textContent,
      ),
    ),
    false,
  );
}
function pointer(e, node, type, x, y) {
  const event = new e.dom.window.Event(type, { bubbles: true });
  for (const [key, value] of Object.entries({
    clientX: x,
    clientY: y,
    pointerId: 1,
    pointerType: "mouse",
    button: 0,
  }))
    Object.defineProperty(event, key, { value });
  node.dispatchEvent(event);
}
test("Noema navigation changes selection without swapping copy or adding a hover layer",()=>environment(async e=>{
 await React.act(()=>e.root.render(React.createElement(e.cinematic.NoemaHero,{paused:true})));e.tick();
 const before=document.querySelector('h1').textContent,copy=document.querySelector('p').textContent;
 await e.click('Imagine');assert.equal(document.querySelector('[aria-label="Explore Noema"] [aria-pressed=true]').textContent,'Imagine');
 assert.equal(document.querySelector('h1').textContent,before);assert.equal(document.querySelector('p').textContent,copy);
 assert.equal(document.querySelectorAll('[data-testid=noema-robot] img').length,1);assert.equal(document.querySelector('[data-testid=noema-robot]').hasAttribute('tabindex'),false);noOverlays();
}));


test("Aevora keeps one destination and moves transparent cloud layers with reduced-motion reset", () =>
  environment(async (e) => {
    await React.act(() =>
      e.root.render(React.createElement(e.cinematic.AevoraHero)),
    );
    e.tick();
    const original=document.querySelector('h1').textContent;
    await e.click('The isles');assert.equal(document.querySelector('h1').textContent,original);
    assert.equal(document.querySelectorAll('[aria-label="Aevora navigation"]').length,1);
    assert.equal(
      document.querySelectorAll('img[src$="aevora-clouds.png"]').length,
      2,
    );
    const host = document.querySelector("section");
    host.getBoundingClientRect = () => ({
      left: 0,
      top: 0,
      width: 1280,
      height: 900,
    });
    await React.act(() => pointer(e, host, "pointermove", 1100, 700));
    e.tick(24);
    assert.ok(parseFloat(host.style.getPropertyValue("--parallax-x")) > 1);
    e.media.matches = true;
    e.mediaListeners.forEach((fn) => fn());
    e.tick();
    assert.equal(host.style.getPropertyValue("--parallax-x"), "0px");
    assert.equal(e.frames.size, 0);
    noOverlays();
  }));
test("Florra has twelve rounded petals, a decorative center and no decorative process panel", () =>
  environment(async (e) => {
    await React.act(() =>
      e.root.render(
        React.createElement(e.creative.FlorraHero, { paused: true }),
      ),
    );
    e.tick();
    const paths = [...document.querySelectorAll("clipPath")].map(
      (node) => node.firstElementChild,
    );
    assert.equal(paths.length, 12);
    assert.ok(
      paths.every(
        (path) => (path.getAttribute("d").match(/Q/g) || []).length === 4,
      ),
    );
    const artwork=[...document.querySelectorAll('image')].map(n=>n.getAttribute('href'));
    await e.click('Solutions');assert.deepEqual([...document.querySelectorAll('image')].map(n=>n.getAttribute('href')),artwork);
    assert.equal(document.querySelector('[aria-label="Next creative direction"]'),null);
    assert.equal(document.querySelectorAll('button').length,4);
    assert.doesNotMatch(
      document.body.textContent,
      /A GOOD KIND|Imagine it|Give it shape/,
    );
    noOverlays();
  }));
test("Sprig selects stories inline, drags with inertia, cancels pointers and sleeps for reduced motion", () =>
  environment(async (e) => {
    await React.act(() =>
      e.root.render(React.createElement(e.creative.SprigHero)),
    );
    e.tick();
    await e.click("Creators");
    assert.match(document.querySelector("h1").textContent, /Good things/);
    assert.doesNotMatch(
      document.body.textContent,
      /Meet the makers|A lasting impression|DRAG A LITTLE/,
    );
    const band = document.querySelector("[data-testid=story-band]"),
      card = band.querySelector("button"),
      before = card.style.transform;
    e.tick(60);
    assert.notEqual(card.style.transform, before);
    await React.act(() => card.click());
    e.tick();
    assert.equal(card.getAttribute("aria-pressed"), "true");
    assert.equal(document.querySelector('[aria-label="Previous stories"]'), null);
    await e.click("Meet your next creator");
    e.tick();
    assert.equal(document.querySelectorAll('[aria-pressed="true"]').length > 0, true);
    const moved = card.style.transform;
    await React.act(() => {
      pointer(e, band, "pointerdown", 100, 0);
      pointer(e, band, "pointermove", 180, 0);
    });
    e.tick();
    assert.notEqual(card.style.transform, moved);
    await React.act(() => pointer(e, band, "pointercancel", 180, 0));
    const released = card.style.transform;
    e.tick(8);
    assert.notEqual(card.style.transform, released);
    e.media.matches = true;
    e.mediaListeners.forEach((fn) => fn());
    e.tick();
    assert.equal(e.frames.size, 0);
    noOverlays();
    for (const offset of [-1e12, -1, 0, 1000, 1e12])
      for (let i = 0; i < 10; i++)
        assert.ok(
          Object.values(e.creative.carouselGeometry(i, offset, 10, 320)).every(
            Number.isFinite,
          ),
        );
  }));
test("Sway reuses Hyperbolic Ribbon, forwards paused state and keeps artwork stable during navigation", () =>
  environment(async (e) => {
    await React.act(() =>
      e.root.render(React.createElement(e.creative.SwayHero, { paused: true })),
    );
    const ribbon = () => document.querySelector("[data-ribbon]");
    assert.equal(ribbon().dataset.paused, "true");
    assert.equal(ribbon().dataset.background,"#090909");const before=ribbon().dataset.items;
    await e.click('Studio');assert.equal(ribbon().dataset.items,before);
    await React.act(() =>
      e.root.render(
        React.createElement(e.creative.SwayHero, { paused: false }),
      ),
    );
    assert.equal(ribbon().dataset.paused, "false");
    assert.equal(document.querySelector("[data-testid=story-band]"), null);
    noOverlays();
  }));

test("Collection prompts and download files stay in sync with local assets and revised behavior", () => {
  const catalog = require("../registry/hero-prompts.json").items;
  for (const id of [
    "aster",
    "noema",
    "aevora",
    "florra",
    "sprig",
    "sway",
  ]) {
    const item = catalog.find((item) => item.id === id);
    assert.ok(item);
    assert.equal(
      fs.readFileSync(
        path.resolve(__dirname, "../public/heroes/" + id + "-prompt.txt"),
        "utf8",
      ),
      item.prompt,
    );
    assert.ok(
      fs.existsSync(path.resolve(__dirname, "../public" + item.poster)),
    );
    assert.match(item.prompt, /No popups/);
  }
  for (const file of ["cinematic-heroes.tsx", "creative-heroes.tsx"]) {
    const source = fs.readFileSync(
      path.resolve(__dirname, "../components/heroes/" + file),
      "utf8",
    );
    assert.doesNotMatch(
      source,
      /showModal|ExperienceSheet|MotionButton|<dialog|<em/,
    );
    assert.deepEqual(
      require("./component-tests.json").site["components/heroes/" + file],
      ["tests/hero-collection.test.cjs"],
    );
  }
});
