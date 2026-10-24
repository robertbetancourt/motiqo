const { test } = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("node:fs"),
  path = require("node:path"),
  Module = require("node:module"),
  ts = require("typescript-compiler-api"),
  React = require("react"),
  THREE = require("three"),
  { JSDOM } = require("jsdom");
function load(file, mocks = {}) {
  const name = path.resolve(__dirname, "..", file),
    m = new Module(name, module);
  m.filename = name;
  m.paths = Module._nodeModulePaths(path.dirname(name));
  const normal = m.require.bind(m);
  m.require = (id) =>
    mocks[id] ??
    (id.startsWith(".") &&
    fs.existsSync(path.resolve(path.dirname(name), id + ".ts"))
      ? load(
          path.relative(
            path.resolve(__dirname, ".."),
            path.resolve(path.dirname(name), id + ".ts"),
          ),
          mocks,
        )
      : normal(id));
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
  return m.exports;
}
const source = "components/originals/flow-gallery.tsx",
  flow = load(source);
test("Paper center stays flat, side folds persist and vary by image; ribbon mapping is continuous", () => {
  assert.equal(flow.paperFold(0.5, 0.3, 0, 2), 0);
  assert.equal(flow.paperFold(0.5, 0.3, 4, 0), 0);
  assert.notEqual(flow.paperFold(.5,.3,0,1,1,1),0);
  assert.notEqual(flow.paperFold(.5,.3,0,1,1,1),flow.paperFold(.5,.3,0,1,2,1));
  assert.equal(flow.paperFold(.5,.3,100,2,7,0),0);
  assert.ok(Math.abs(flow.paperFold(0.5, 0.3, 1e6, 3)) < 3);
  assert.equal(flow.flowPosition(-1, 6, true), 5);
  assert.equal(flow.flowPosition(99, 6, false), 5);
  for (let x = -3; x < 3; x += 0.1) {
    const a = flow.ribbonPoint(x, 0.3, 0.82, 0.6),
      b = flow.ribbonPoint(x + 0.001, 0.3, 0.82, 0.6);
    assert.ok(a.every(Number.isFinite));
    assert.ok(Math.hypot(a[0] - b[0], a[1] - b[1]) < 0.01);
  }
});
test("Paper Flow prompt and export use exact selected settings including booleans", () => {
  const controls = load("lib/element-controls.ts"),
    catalog = load("lib/catalog.ts");
  const item = catalog.elements.find((x) => x.id === "paper-flow"),
    settings = {
      ...controls.defaultsFor(item.id),
      mode: "drag",
      direction: "vertical",
      speed: 2.3,
      deformation: 0,
      perspective: 65,
      inertia: 0.9,
      loop: "disabled",
    };
  const usage = controls.usageFor(item, settings),
    prompt = catalog.makePrompt(item, "Codex", settings);
  for (const value of [
    'mode={"drag"}',
    'direction={"vertical"}',
    "speed={2.3}",
    "deformation={0}",
    "perspective={65}",
    "inertia={0.9}",
    "loop={false}",
  ]) {
    assert.ok(usage.includes(value));
    assert.ok(prompt.includes(value));
  }
  assert.ok(!usage.includes('loop="disabled"'));
});
async function env(fn) {
  const dom = new JSDOM('<div id="root"></div>', { pretendToBeVisual: true }),
    keys = [
      "window",
      "document",
      "HTMLElement",
      "Image",
      "matchMedia",
      "IS_REACT_ACT_ENVIRONMENT",
    ],
    old = Object.fromEntries(keys.map((k) => [k, global[k]]));
  Object.assign(global, {
    window: dom.window,
    document: dom.window.document,
    HTMLElement: dom.window.HTMLElement,
    Image: dom.window.Image,
    matchMedia: () => ({ matches: false }),
    IS_REACT_ACT_ENVIRONMENT: true,
  });
  dom.window.HTMLCanvasElement.prototype.getContext = () => ({
    fillRect() {},
    fillText() {},
  });
  dom.window.HTMLElement.prototype.setPointerCapture = () => {};
  const root = require("react-dom/client").createRoot(
    document.getElementById("root"),
  );
  try {
    await fn(root, dom);
  } finally {
    await React.act(() => root.unmount());
    for (const k of keys) {
      if (old[k] === undefined) delete global[k];
      else global[k] = old[k];
    }
    dom.window.close();
  }
}
test("Gallery controls move geometry uniforms, update live without remount and dispose renderer", () =>
  env(async (root) => {
    let callback,
      scene,
      disposed = 0,
      created = 0;
    class Renderer {
      constructor() {
        created++;
        this.capabilities = { getMaxAnisotropy: () => 4 };
      }
      setPixelRatio() {}
      setSize() {}
      render(s) {
        scene = s;
      }
      dispose() {
        disposed++;
      }
    }
    const Gallery = load(source, {
      three: { ...THREE, WebGLRenderer: Renderer },
      "./effect-runtime": {
        effectRuntime: (host, el, render, paused, resize) => {
          callback = render;
          resize(640, 480, 1);
          return {
            invalidate() {
              render(0, 0);
            },
            dispose() {},
          };
        },
      },
    }).default;
    await React.act(() =>
      root.render(
        React.createElement(Gallery, { variant: "paper", mode: "drag" }),
      ),
    );
    const uniforms = () => scene.children[0].material.uniforms;
    assert.equal(uniforms().uCenter.value, 0);
    assert.equal(uniforms().uCrumple.value,0);
    await React.act(() =>
      document.querySelector(".flow-gallery").dispatchEvent(new window.KeyboardEvent("keydown", {key:"ArrowRight",bubbles:true})),
    );
    await React.act(() => {
      for (let i = 0; i < 180; i++) callback(i / 60, 1 / 60);
    });
    assert.ok(Math.abs(uniforms().uCenter.value + 1) < 0.01);
    assert.ok(Math.abs(uniforms().uVelocity.value) < 0.001);
    assert.ok(uniforms().uCrumple.value>.7);
    assert.equal(scene.children[1].material.uniforms.uCrumple.value,0);
    await React.act(() =>
      root.render(
        React.createElement(Gallery, {
          variant: "paper",
          direction: "vertical",
          deformation: 2,
          perspective: 60,
        }),
      ),
    );
    assert.equal(created, 1);
    assert.equal(uniforms().uDeformation.value, 2);
    assert.equal(uniforms().uAspect.value, 1);
    await React.act(() => root.unmount());
    assert.equal(disposed, 1);
  }));
test("Gallery keeps navigable artwork when WebGL initialization fails", () =>
  env(async (root) => {
    const Gallery = load(source, {
      three: {
        ...THREE,
        WebGLRenderer: class {
          constructor() {
            throw Error("GPU unavailable");
          }
        },
      },
    }).default;
    await React.act(() =>
      root.render(React.createElement(Gallery, { variant: "paper" })),
    );
    assert.equal(
      document.querySelector(".flow-gallery").dataset.failed,
      "true",
    );
    await React.act(() =>
      document.querySelector(".flow-gallery").dispatchEvent(new window.KeyboardEvent("keydown", {key:"ArrowRight",bubbles:true})),
    );
    assert.equal(document.querySelector(".flow-controls"), null);
    await React.act(() =>
      document.querySelector(".flow-gallery").dispatchEvent(new window.KeyboardEvent("keydown", {key:"ArrowLeft",bubbles:true})),
    );
    assert.ok(document.querySelector(".flow-fallback"));
  }));
test("TopoContour updates uniforms, emits click waves and releases native GL", () =>
  env(async (root) => {
    let uniforms,
      disposed = 0,
      callback;
    const Topo = load("components/originals/topo-contour.tsx", {
      "./native-gl": {
        ...load("components/originals/native-gl.ts"),
        createNativeGL: () => ({
          pass: () => ({}),
          draw: (p, t, u) => {
            uniforms = u;
          },
          dispose() {
            disposed++;
          },
        }),
      },
      "./effect-runtime": {
        effectRuntime: (h, e, render) => {
          callback = render;
          return {
            invalidate() {
              render(0, 0.016);
            },
            dispose() {},
          };
        },
      },
    }).default;
    await React.act(() =>
      root.render(React.createElement(Topo, { contourDensity: 30 })),
    );
    assert.equal(uniforms.uDensity, 30);
    await React.act(() => document.querySelector("button").click());
    assert.ok(uniforms.uWave > 0.9);
    await React.act(() =>
      root.render(
        React.createElement(Topo, { contourDensity: 99, warpStrength: 0 }),
      ),
    );
    assert.equal(uniforms.uDensity, 60);
    assert.equal(uniforms.uWarp, 0);
    await React.act(() => root.unmount());
    assert.equal(disposed, 1);
  }));
test("Ribbon autoplay advances in steps, disables live and respects drag-only wheel input", () =>
  env(async (root) => {
    let callback, scene;
    class Renderer {
      constructor() {
        this.capabilities = { getMaxAnisotropy: () => 4 };
      }
      setPixelRatio() {}
      setSize() {}
      render(s) {
        scene = s;
      }
      dispose() {}
    }
    const Gallery = load(source, {
      three: { ...THREE, WebGLRenderer: Renderer },
      "./effect-runtime": {
        effectRuntime: (h, c, render, p, resize) => {
          callback = render;
          resize(640, 480, 1);
          return {
            invalidate() {
              render(0, 0);
            },
            dispose() {},
          };
        },
      },
    }).default;
    await React.act(() =>
      root.render(
        React.createElement(Gallery, {
          variant: "ribbon",
          autoPlay: false,
          mode: "drag",
        }),
      ),
    );
    await React.act(() => callback(5, 0.016));
    assert.equal(scene.children[0].material.uniforms.uCenter.value, 0);
    const wheel = new window.WheelEvent("wheel", {
      deltaY: 550,
      cancelable: true,
      bubbles: true,
    });
    document.querySelector(".flow-gallery").dispatchEvent(wheel);
    assert.equal(wheel.defaultPrevented, false);
    await React.act(() =>
      root.render(
        React.createElement(Gallery, {
          variant: "ribbon",
          autoPlay: true,
          stepInterval: 800,
        }),
      ),
    );
    await React.act(() => {
      callback(6, 0.016);
      for (let i = 0; i < 60; i++) callback(6 + i / 1000, 0.016);
    });
    assert.ok(
      Math.abs(scene.children[0].material.uniforms.uCenter.value + 1) < 0.02,
    );
    await React.act(() =>
      root.render(
        React.createElement(Gallery, { variant: "ribbon", autoPlay: false }),
      ),
    );
    await React.act(() => {
      for (let i = 0; i < 180; i++) callback(9 + i, 0.016);
    });
    assert.ok(
      Math.abs(scene.children[0].material.uniforms.uCenter.value + 1) < 0.001,
    );
  }));

test('Ribbon slots recycle outside the visible span and use only bundled image assets',()=>{assert.equal(flow.defaultFlowItems.length,18);assert.ok(flow.defaultFlowItems.every(x=>x.src.startsWith('/media/gallery/image-')));for(let frame=0;frame<2000;frame++){const cursor=frame*.03;for(let slot=0;slot<48;slot++){const a=flow.ribbonSlot(slot,cursor),b=flow.ribbonSlot(slot,cursor+.03);if(a.logical!==b.logical){assert.ok(Math.abs(a.center)>23);assert.ok(Math.abs(b.center)>23);}else assert.ok(Math.abs(b.center-a.center+.03)<1e-10);}}});

const paperMesh=load('components/originals/paper-mesh.ts');
test('Paper mesh has deterministic shared-edge facets, bounded coordinates and unique crumpled poses',()=>{const a=paperMesh.buildPaperMesh(1),b=paperMesh.buildPaperMesh(2);assert.equal(a.triangles,384);assert.equal(a.positions.length,384*9);assert.deepEqual(a,paperMesh.buildPaperMesh(1));assert.notDeepEqual(a.crumpled,b.crumpled);const duplicates=new Map();for(let i=0;i<a.positions.length/3;i++){assert.equal(a.positions[i*3+2],0);const u=a.uvs[i*2],v=a.uvs[i*2+1];assert.ok(u>=0&&u<=1&&v>=0&&v<=1);const pose=Array.from(a.crumpled.slice(i*3,i*3+3));assert.ok(pose.every(x=>Number.isFinite(x)&&Math.abs(x)<3));const key=u+':'+v;if(duplicates.has(key))assert.deepEqual(pose,duplicates.get(key));else duplicates.set(key,pose);}const geom=paperMesh.createPaperGeometry(1);assert.equal(geom.index,null);assert.equal(geom.getAttribute('aCrumpled').count,1152);geom.dispose();});
test('Paper GPU morph keeps focus flat even at high velocity and varies continuously at the focus boundary',()=>{assert.equal(paperMesh.paperCrumple(0,3,100),0);assert.equal(paperMesh.paperCrumple(1,0,100),0);assert.ok(paperMesh.paperCrumple(1,1,0)>.7);assert.ok(paperMesh.paperCrumple(1,3,0)>paperMesh.paperCrumple(1,1,0));assert.ok(paperMesh.paperCrumple(.0801,1,0)<.0001);});
