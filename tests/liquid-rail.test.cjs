const { test } = require("node:test"),
  assert = require("node:assert/strict");
const { load, mount, React } = require("./support/component-harness.cjs"),
  THREE = require("three");
const motion = load("components/originals/liquid-rail-motion.ts");
test("Rail follows continuous input at both refresh rates, settles without overshoot, and rebases full turns without a seam", () => {
  const result = (hz) => {
    const s = motion.createRailMotion();
    for (let i = 0; i < hz * 6; i++)
      motion.advanceRail(s, 1 / hz, 0.22, 0.65, 6);
    return s;
  };
  assert.ok(Math.abs(result(60).cursor - result(120).cursor) < 0.002);
  const s = motion.createRailMotion();
  s.target = 3;
  let before = 0;
  for (let i = 0; i < 180; i++) {
    motion.advanceRail(s, 1 / 60, 0, 0.65, 6);
    assert.ok(s.cursor >= before && s.cursor <= 3);
    before = s.cursor;
  }
  assert.ok(Math.abs(s.cursor - 3) < 1e-6);
  assert.ok(Math.abs(s.bend) < 1e-5);
  s.cursor = 60.25;
  s.target = 61;
  s.velocity = 1;
  motion.advanceRail(s, 0, 0, 0.65, 6);
  assert.equal(s.cursor, 0.25);
  assert.equal(s.target, 1);
  assert.equal(s.velocity, 1);
  assert.equal(motion.railWrap(-1, 6), 5);
});
test("Rail accepts only explicit HTTP or root-relative image sources and rejects nonfinite panel values", () => {
  for (const src of [
    "javascript:alert(1)",
    "data:text/html,no",
    "//example.com/x.png",
    "https://a:b@example.com/img.png",
    "/\\evil/x",
    " /image.png",
  ])
    assert.equal(motion.railImageSource(src), "");
  assert.equal(
    motion.railImageSource("/media/gallery/image-01.webp"),
    "/media/gallery/image-01.webp",
  );
  assert.equal(
    motion.railImageSource("https://example.com/a.png"),
    "https://example.com/a.png",
  );
  assert.equal(motion.railClamp(NaN, 0, 2, 1), 1);
  assert.equal(motion.railClamp(Infinity, 0, 2, 1), 1);
});
const noGPU = {
  ...THREE,
  WebGLRenderer: class {
    constructor() {
      throw Error("GPU unavailable");
    }
  },
};
test("No-GPU rail still navigates by index and keyboard, updates items, respects reduced motion and cleans its clock", async () => {
  const C = load("components/originals/liquid-rail.tsx", {
    three: noGPU,
  }).default;
  const selected = [],
    e = await mount(
      C,
      { autoPlay: false, onIndexChange: (i) => selected.push(i) },
      true,
    );
  try {
    const root = document.querySelector(".liquid-rail");
    await e.advance(2);
    assert.equal(root.dataset.renderer, "fallback");
    assert.equal(root.dataset.ready, "true");
    const buttons = document.querySelectorAll(".lr-index button");
    assert.equal(buttons.length, 6);
    await e.click(buttons[2]);
    await e.advance();
    assert.equal(buttons[2].getAttribute("aria-current"), "true");
    await e.key(root, "ArrowDown");
    await e.advance();
    assert.equal(buttons[3].getAttribute("aria-current"), "true");
    await e.key(root, "Home");
    await e.advance();
    assert.equal(buttons[0].getAttribute("aria-current"), "true");
    assert.equal(e.frames.size, 0);
    await e.update({ items: [], autoPlay: false });
    await e.advance();
    assert.match(
      document.querySelector("[role=status]").textContent,
      /Add images/,
    );
    assert.equal(document.querySelectorAll(".lr-index button").length, 0);
    await e.update({
      items: [{ src: "javascript:evil()", title: "Own image" }],
      autoPlay: false,
    });
    await e.advance();
    assert.equal(document.querySelector(".lr-index button img"), null);
    assert.ok(selected.includes(2));
  } finally {
    await e.close();
    assert.equal(e.frames.size, 0);
    assert.ok(e.observers.every((o) => o.disconnected));
  }
});
test("GPU ownership survives panel changes, pauses exactly, handles context loss/restore, and disposes late textures under StrictMode", async () => {
  const renderers = [],
    pending = [],
    textures = [];
  class Renderer {
    constructor() {
      this.capabilities = { getMaxAnisotropy: () => 4 };
      renderers.push(this);
    }
    setClearColor() {}
    setPixelRatio() {}
    setSize() {}
    render() {
      this.renders = (this.renders || 0) + 1;
    }
    dispose() {
      this.disposed = true;
    }
  }
  class Loader {
    setCrossOrigin() {}
    load(src, success) {
      const texture = new THREE.Texture();
      texture.image = { width: 1600, height: 1200 };
      texture.addEventListener("dispose", () => (texture.disposed = true));
      textures.push(texture);
      pending.push(() => success(texture));
    }
  }
  const C = load("components/originals/liquid-rail.tsx", {
    three: { ...THREE, WebGLRenderer: Renderer, TextureLoader: Loader },
  }).default;
  const e = await mount(C, { autoPlay: true });
  try {
    await React.act(() => pending.splice(0).forEach((fn) => fn()));
    await e.advance(40);
    const root = document.querySelector(".liquid-rail"),
      canvas = document.querySelector(".lr-canvas"),
      owner = renderers.at(-1),
      count = renderers.length;
    assert.equal(root.dataset.renderer, "webgl");
    assert.equal(root.dataset.ready, "true");
    assert.ok(Number(root.dataset.cursor) > 0);
    await e.update({ autoPlay: true, liquidStrength: 1.8, response: 0.9 });
    await e.advance(5);
    assert.equal(renderers.length, count);
    await e.update({ paused: true });
    const cursor = root.dataset.cursor,
      bend = root.dataset.bend,
      renders = owner.renders;
    await e.advance(50);
    assert.equal(root.dataset.cursor, cursor);
    assert.equal(root.dataset.bend, bend);
    assert.equal(owner.renders, renders);
    assert.equal(e.frames.size, 0);
    await e.update({ autoPlay: true });
    await e.advance(5);
    assert.notEqual(root.dataset.cursor, cursor);
    await React.act(()=>e.observers.at(-1).fn([{isIntersecting:false}]));
    const offscreen=root.dataset.cursor,offscreenRenders=owner.renders;
    await e.advance(40);assert.equal(root.dataset.cursor,offscreen);assert.equal(owner.renders,offscreenRenders);assert.equal(e.frames.size,0);
    await React.act(()=>e.observers.at(-1).fn([{isIntersecting:true}]));await e.advance(5);assert.notEqual(root.dataset.cursor,offscreen);
    await React.act(() =>
      canvas.dispatchEvent(
        new window.Event("webglcontextlost", { cancelable: true }),
      ),
    );
    assert.equal(root.dataset.renderer, "fallback");
    assert.ok(owner.disposed);
    await React.act(() =>
      canvas.dispatchEvent(new window.Event("webglcontextrestored")),
    );
    assert.equal(root.dataset.renderer, "webgl");
    assert.equal(renderers.length, count + 1);
    await e.close();
    await React.act(() => pending.splice(0).forEach((fn) => fn()));
    assert.ok(textures.every((t) => t.disposed));
    assert.ok(renderers.every((r) => r.disposed));
    assert.equal(e.frames.size, 0);
  } catch (err) {
    await e.close();
    throw err;
  }
});
