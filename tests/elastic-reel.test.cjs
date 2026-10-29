const { test } = require("node:test"),
  assert = require("node:assert/strict"),
  THREE = require("three");
const { load, mount, React } = require("./support/component-harness.cjs");
const motion = load("components/originals/liquid-rail-motion.ts");
test("Whole label runs clear the warped image at every point and remain inset from adjacent card seams", () => {
  for (const elastic of [true, false])
    for (const velocity of [-4, 0, 4])
      for (const center of [-400, 0, 400]) {
        const min = elastic ? 0.54 : 0.2,
          sigma = elastic ? 0.42 : 0.28,
          stretch = 0.3;
        const l = motion.rubberLabels(
          center + 180,
          center - 180,
          300,
          680,
          velocity,
          min,
          sigma,
          stretch,
          elastic,
          90,
          100,
        );
        assert.ok(l.first.y >= 16);
        assert.ok(l.second.y + l.second.length <= l.height - 16);
        assert.ok(l.second.y > l.first.y + l.first.length);
        for (const run of [l.first, l.second])
          for (let j = 0; j <= 24; j++) {
            const mapped = l.top - run.y - (run.length * j) / 24;
            let lo = center - 180,
              hi = center + 180;
            for (let k = 0; k < 24; k++) {
              const mid = (hi + lo) / 2;
              if (
                motion.rubberProfile(
                  mid,
                  680,
                  velocity,
                  min,
                  sigma,
                  stretch,
                  elastic,
                ).y < mapped
              )
                lo = mid;
              else hi = mid;
            }
            const edge = motion.rubberProfile(
              (lo + hi) / 2,
              680,
              velocity,
              min,
              sigma,
              stretch,
              elastic,
            );
            assert.ok(run.x - (150 * edge.width + edge.shear) >= 22);
          }
      }
});
test("The continuous rubber map is symmetric, finite and monotonic, keeps gaps open, and pinches more with velocity", () => {
  for (const velocity of [0, 0.5, 2, 4]) {
    let last = -Infinity;
    for (let y = -1800; y <= 1800; y += 3) {
      const p = motion.rubberProfile(y, 680, velocity);
      assert.ok(p.y > last);
      last = p.y;
      assert.ok(p.width >= 0.38 && p.width <= 1);
      assert.ok(Number.isFinite(p.shear));
      assert.equal(p.width, motion.rubberProfile(-y, 680, velocity).width);
    }
    const top = motion.rubberProfile(240, 680, velocity),
      bottom = motion.rubberProfile(250, 680, velocity);
    assert.ok(bottom.y - top.y >= 10);
  }
  assert.equal(motion.rubberProfile(0, 680, 4).width, 1);
  assert.ok(
    motion.rubberProfile(300, 680, 3).width <
      motion.rubberProfile(300, 680, 0).width,
  );
});
test("Damped elastic snapping converges at both refresh rates without leaving a running oscillator", () => {
  const run = (hz) => {
    const s = motion.createRailMotion();
    s.target = 2;
    for (let i = 0; i < hz * 4; i++) motion.advanceElasticRail(s, 1 / hz, 6);
    return s;
  };
  for (const hz of [60, 120, 240]) {
    const s = run(hz);
    assert.ok(Math.abs(s.cursor - 2) < 1e-7);
    assert.ok(Math.abs(s.velocity) < 1e-7);
  }
  assert.ok(Math.abs(run(60).cursor - run(120).cursor) < 1e-8);
});
const noGPU = {
  ...THREE,
  WebGLRenderer: class {
    constructor() {
      throw Error("GPU unavailable");
    }
  },
};
test("SilkStream uses distinct bundled artwork and a smaller gap while ElasticReel adapts label/meta and clicks neighbors", async () => {
  const Rail = load("components/originals/liquid-rail.tsx", { three: noGPU });
  const Silk = load("components/originals/silk-stream.tsx", {
    "./liquid-rail": { __esModule: true, default: Rail.default },
  });
  const original = new Set(Rail.defaultRailItems.map((i) => i.src));
  assert.ok(Silk.silkStreamItems.every((i) => !original.has(i.src)));
  const C = load("components/originals/elastic-reel.tsx", {
      "./liquid-rail": { __esModule: true, default: Rail.default },
    }).default,
    e = await mount(C, { autoPlay: false }, true);
  try {
    await e.advance();
    const root = document.querySelector(".liquid-rail");
    assert.equal(root.dataset.variant, "elastic");
    assert.match(root.getAttribute("aria-label"), /ElasticReel/);
    assert.ok(
      [...document.querySelectorAll(".lr-card-label")].some((n) =>
        n.textContent.includes("01 // 2026"),
      ),
    );
    await React.act(() => {
      root.dispatchEvent(
        new window.MouseEvent("pointerdown", {
          bubbles: true,
          button: 0,
          clientY: 550,
        }),
      );
      root.dispatchEvent(
        new window.MouseEvent("pointerup", {
          bubbles: true,
          button: 0,
          clientY: 550,
        }),
      );
    });
    await e.advance();
    assert.equal(Number(root.dataset.cursor), 1);
    await e.key(root, "Home");
    await e.advance();
    assert.equal(Number(root.dataset.cursor), 0);
    await e.update({ autoPlay: false, items: [] });
    await e.advance();
    assert.ok(document.querySelector("[role=status]"));
    assert.equal(e.frames.size, 0);
  } finally {
    await e.close();
    assert.ok(e.observers.every((o) => o.disconnected));
  }
});
test("ElasticReel autoplay advances discretely after its idle interval and freezes under external pause", async () => {
  const Rail = load("components/originals/liquid-rail.tsx", {
      three: noGPU,
    }).default,
    C = load("components/originals/elastic-reel.tsx", {
      "./liquid-rail": { __esModule: true, default: Rail },
    }).default,
    e = await mount(C, {});
  try {
    await e.advance(120);
    assert.equal(
      Number(document.querySelector(".liquid-rail").dataset.cursor),
      0,
    );
    await e.advance(115);
    assert.ok(
      Number(document.querySelector(".liquid-rail").dataset.cursor) > 0.9,
    );
    await e.update({ paused: true });
    const value = document.querySelector(".liquid-rail").dataset.cursor;
    await e.advance(60);
    assert.equal(document.querySelector(".liquid-rail").dataset.cursor, value);
    assert.equal(e.frames.size, 0);
  } finally {
    await e.close();
  }
});
