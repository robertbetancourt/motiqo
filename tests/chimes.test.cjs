const { test } = require("node:test"),
  assert = require("node:assert/strict");
const { load, mount, React } = require("./support/component-harness.cjs");
const math = load("components/originals/chime-physics.ts");
test("Both dense curtains keep their anchors and link lengths under repeated swept-pointer impulses", () => {
  for (const [cols, rows, iters] of [
    [28, 26, 4],
    [32, 28, 5],
  ]) {
    const c = math.makeCurtain(cols, rows);
    math.placeCurtain(c, 300, 100, 300);
    assert.equal(c.nodes.length, cols * rows);
    for (let i = 0; i < 200; i++)
      math.stepCurtain(
        c,
        300,
        100,
        {
          x: 280 + Math.sin(i * 0.1) * 110,
          y: 220,
          px: 270 + Math.sin(i * 0.1) * 110,
          py: 220,
          active: true,
        },
        i / 60,
        iters,
      );
    assert.ok(
      c.nodes.every((n) => [n.x, n.y, n.px, n.py].every(Number.isFinite)),
    );
    for (let col = 0; col < cols; col++) {
      assert.equal(c.nodes[col * rows].y, 100);
      for (let row = 1; row < rows; row++) {
        const a = c.nodes[col * rows + row - 1],
          b = c.nodes[col * rows + row];
        assert.ok(
          Math.abs(Math.hypot(a.x - b.x, a.y - b.y) - c.spacing) < 0.001,
        );
      }
    }
    assert.ok(c.nodes.some((n) => n.light > 0.1));
  }
});
test("Chime stage changes sculptures, switches ensemble and does not initialize audio for compact previews", async () => {
  const C = load("components/originals/chime-stage.tsx").default,
    e = await mount(C, { compact: true, soundEnabled: true });
  try {
    assert.ok(document.querySelector("footer").textContent.includes("SOLARIS"));
    await e.click(document.querySelector(".chime-next"));
    assert.ok(document.querySelector("footer").textContent.includes("KINETIC"));
    await e.click(document.querySelector("header button"));
    assert.equal(
      document.querySelector(".chime-stage").dataset.ensemble,
      "true",
    );
    assert.equal(document.querySelector("article"), null);
    assert.equal(document.querySelectorAll("header button").length, 1);
    await e.update({ compact: true, defaultEnsembleMode: true });
    await e.update({ compact: true, defaultEnsembleMode: false });
    assert.equal(
      document.querySelector(".chime-stage").dataset.ensemble,
      "false",
    );
    await e.update({
      prism: true,
      initialMonolith: 2,
      compact: true,
      paused: true,
    });
    assert.ok(
      document.querySelector("footer").textContent.includes("SINGULARITY"),
    );
    assert.equal(
      document.querySelector(".chime-stage").dataset.theme,
      "obsidian",
    );
  } finally {
    await e.close();
  }
  assert.ok(e.observers.every((o) => o.disconnected));
  assert.equal(e.frames.size, 0);
});

test("Chime synthesis caps polyphony, uses chapter timbres and disconnects complete voice graphs", async () => {
  const old = globalThis.AudioContext,
    contexts = [];
  const param = () => ({
    value: 0,
    setValueAtTime(v) {
      this.value = v;
    },
    exponentialRampToValueAtTime(v) {
      this.value = v;
    },
  });
  class Node {
    constructor() {
      this.gain = param();
      this.pan = param();
      this.frequency = param();
      this.Q = param();
      this.delayTime = param();
      this.links = [];
    }
    connect(node) {
      this.links.push(node);
    }
    disconnect() {
      this.disconnected = true;
    }
    start() {
      this.started = true;
    }
    stop() {
      this.stopped = true;
    }
  }
  globalThis.AudioContext = class {
    constructor() {
      this.state = "suspended";
      this.currentTime = 0;
      this.nodes = [];
      this.oscillators = [];
      this.destination = {};
      contexts.push(this);
    }
    make() {
      const n = new Node();
      this.nodes.push(n);
      return n;
    }
    createGain() {
      return this.make();
    }
    createStereoPanner() {
      return this.make();
    }
    createBiquadFilter() {
      return this.make();
    }
    createDelay() {
      const n = this.make();
      n.isDelay = true;
      return n;
    }
    createOscillator() {
      const n = this.make();
      this.oscillators.push(n);
      return n;
    }
    async resume() {
      this.state = "running";
    }
    async suspend() {
      this.state = "suspended";
    }
    async close() {
      this.state = "closed";
    }
  };
  try {
    const { createChimeAudio } = load("components/originals/chime-audio.ts"),
      audio = createChimeAudio(true),
      ctx = contexts[0];
    audio.pluck(2, 0, 0, 1);
    assert.equal(ctx.oscillators.length, 0);
    await audio.resume();
    for (let i = 0; i < 10; i++) audio.pluck(i, 2, 5, 100);
    assert.equal(ctx.oscillators.length, 16);
    assert.ok(
      ctx.nodes.filter((n) => n.pan.value).every((n) => n.pan.value === 1),
    );
    assert.equal(ctx.nodes.filter((n) => n.isDelay).length, 8);
    const first = ctx.oscillators.slice(0, 2);
    first.forEach((n) => n.onended());
    assert.ok(first.every((n) => n.disconnected));
    audio.pluck(8, 1, -1, 1);
    assert.equal(ctx.oscillators.length, 18);
    assert.ok(
      ctx.nodes.some((n) => n.links.includes(ctx.oscillators[16].frequency)),
    );
    await audio.suspend();
    audio.pluck(2, 0, 0, 1);
    assert.equal(ctx.oscillators.length, 18);
    audio.dispose();
    assert.equal(ctx.state, "closed");
    assert.ok(ctx.nodes.every((n) => n.disconnected));
    assert.ok(ctx.oscillators.every((n) => n.stopped));
  } finally {
    if (old === undefined) delete globalThis.AudioContext;
    else globalThis.AudioContext = old;
  }
});
