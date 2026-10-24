const { test } = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("node:fs");
const { load, mount, React } = require("./support/component-harness.cjs"),
  THREE = require("three");
const cameraPath = load("components/originals/vortex-camera-path.ts");
test("Vortex keeps the exact 12% lead in the entire inner segment and smoothly turns only after .80", () => {
  for (let i = 450; i <= 800; i++) {
    let p = i / 1000;
    assert.ok(
      cameraPath
        .getCameraLookAt(p)
        .distanceTo(cameraPath.getCameraPosition(Math.min(1, p + 0.12))) <
        1e-10,
    );
  }
  for (const p of [0.38, 0.45, 0.8, 0.98]) {
    const h = 1e-6,
      a = cameraPath.getCameraLookAt(p),
      l = a
        .clone()
        .sub(cameraPath.getCameraLookAt(p - h))
        .divideScalar(h),
      r = cameraPath
        .getCameraLookAt(p + h)
        .sub(a)
        .divideScalar(h);
    assert.ok(l.distanceTo(r) < 0.02);
  }
  assert.equal(cameraPath.getCameraLookAt(1).length(), 0);
});
test("Vortex minimal markup has only cinematic copy, no pause/reset/telemetry or slider, and uses Urbanist", () => {
  const Component = load("components/originals/vortex-camera.tsx").default;
  const html = require("react-dom/server").renderToStaticMarkup(
    React.createElement(Component),
  );
  assert.equal((html.match(/data-vc-stage/g) || []).length, 4);
  assert.doesNotMatch(
    html,
    /<button|<input|CAM FOV|Auto-Pilot|Scroll \/ Drag|SPATIAL EXPERIMENT/,
  );
  assert.match(html, /INSIDE THE AXIS/);
  assert.match(
    fs.readFileSync("components/originals/vortex-camera.css", "utf8"),
    /Urbanist Variable/,
  );
});
test("Vortex external progress and pause work without rebuilding the renderer; StrictMode cleans frames and resources", async () => {
  const renderers = [],
    scenes = [];
  class Renderer {
    constructor() {
      this.domElement = document.createElement("canvas");
      renderers.push(this);
    }
    setPixelRatio() {}
    setClearColor() {}
    setSize() {}
    render(_, camera) {
      this.position = camera.position.clone();
    }
    dispose() {
      this.disposed = true;
    }
    forceContextLoss() {
      this.lost = true;
    }
  }
  const Component = load("components/originals/vortex-camera.tsx", {
    three: { ...THREE, WebGLRenderer: Renderer },
    "./vortex-camera-scene": {
      DEFAULT_VORTEX_IMAGES: [],
      createVortexScene() {
        const scene = {
          update() {},
          dispose() {
            this.disposed = true;
          },
        };
        scenes.push(scene);
        return scene;
      },
    },
  }).default;
  const h = await mount(Component, { autoFlight: false, progress: 0.45 });
  try {
    await h.advance(2);
    assert.equal(document.querySelector(".vc-root").dataset.progress, "0.4500");
    const count = renderers.length;
    await h.update({ autoFlight: false, progress: 0.65, paused: true });
    await h.advance(2);
    assert.equal(document.querySelector(".vc-root").dataset.progress, "0.6500");
    assert.equal(h.frames.size, 0);
    assert.equal(renderers.length, count);
    await h.key(document.querySelector(".vc-root"), "Home");
    await h.advance(2);
    assert.equal(document.querySelector(".vc-root").dataset.progress, "0.0000");
    assert.equal(h.frames.size, 0);
  } finally {
    await h.close();
  }
  assert.equal(h.frames.size, 0);
  assert.ok(renderers.every((r) => r.disposed && r.lost));
  assert.ok(scenes.every((s) => s.disposed));
  assert.ok(h.observers.every((o) => o.disconnected));
});
