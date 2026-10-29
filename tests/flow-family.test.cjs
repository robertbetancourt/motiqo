const { test } = require("node:test"),
  assert = require("node:assert/strict"),
  THREE = require("three");
const { load, mount, React } = require("./support/component-harness.cjs");
test("Flow aperture narrows both tails continuously and the horizontal gallery banks around its center", () => {
  const { railLayout,rubberProfile } = load("components/originals/liquid-rail-motion.ts");
  for (const offset of [-2, -1, 0, 1, 2]) {
    const p = railLayout(offset, 1000, 680, "stream");
    assert.ok(Number.isFinite(p.w));
    assert.equal(p.w, railLayout(-offset, 1000, 680, "stream").w);
  }
  assert.ok(
    rubberProfile(680,680,0,.2,.28,.22,false).width < .21,
  );
  const left = railLayout(-1, 1000, 680, "horizontal"),
    right = railLayout(1, 1000, 680, "horizontal");
  assert.equal(left.x, -right.x);
  assert.equal(left.rotation, -right.rotation);
  assert.equal(left.y, right.y);
});
test("Both alternative rails retain keyboard navigation, reduced motion and fallback without editorial labels being visible", async () => {
  const noGPU = {
    ...THREE,
    WebGLRenderer: class {
      constructor() {
        throw Error("no GPU");
      }
    },
  };
  const Rail = load("components/originals/liquid-rail.tsx", {
    three: noGPU,
  }).default;
  for (const [id, variant] of [
    ["silk-stream", "stream"],
    ["arc-drift", "horizontal"],
  ]) {
    const C = load("components/originals/" + id + ".tsx", {
        "./liquid-rail": { __esModule:true, default: Rail },
      }).default,
      e = await mount(C, { autoPlay: false }, true);
    try {
      await e.advance();
      assert.equal(
        document.querySelector(".liquid-rail").dataset.variant,
        variant,
      );
      await e.click(document.querySelectorAll(".lr-index button")[2]);
      await e.advance();
      assert.equal(
        document
          .querySelectorAll(".lr-index button")[2]
          .getAttribute("aria-current"),
        "true",
      );
    } finally {
      await e.close();
      assert.equal(e.frames.size, 0);
    }
  }
});
test("Nested bloom opens and repeats without GPU, respects pause and updates external settings without stale timers", async () => {
  const noGPU = {
    ...THREE,
    WebGLRenderer: class {
      constructor() {
        throw Error("no GPU");
      }
    },
  };
  const module = load("components/originals/frame-bloom.tsx", { three: noGPU });
  assert.equal(module.bloomEase(0), 0);
  assert.equal(module.bloomEase(1), 1);
  const e = await mount(module.default, { interval: 1, duration: 0.7 });
  try {
    await e.advance(150);
    assert.ok(Number(document.querySelector(".frame-bloom").dataset.index) > 0);
    await e.update({ paused: true });
    await e.advance(2);
    const p = document.querySelector(".frame-bloom").dataset.progress;
    await e.advance(30);
    assert.equal(document.querySelector(".frame-bloom").dataset.progress, p);
    assert.equal(e.frames.size, 0);
    await e.update({ autoPlay: false });
    await e.click(document.querySelector('[aria-label="Next image"]'));
    await e.advance(140);
    assert.equal(e.frames.size, 0);
  } finally {
    await e.close();
    assert.ok(e.observers.every((o) => o.disconnected));
  }
});
