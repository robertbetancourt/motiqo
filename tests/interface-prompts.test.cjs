const { test } = require("node:test"),
  assert = require("node:assert/strict");
const { load, mount, React } = require("./support/component-harness.cjs");
test("SignalGrid external sample count, accent and pause preserve keyboard pinning and release all clocks", async () => {
  const C = load("components/originals/signal-grid.tsx").default,
    h = await mount(C, {
      defaultSamples: 14,
      accentColor: "#38bdf8",
      autoAnimate: true,
    });
  try {
    assert.equal(document.querySelectorAll(".sg-cell").length, 140);
    await h.advance(2);
    assert.equal(h.frames.size, 1);
    await h.key(document.querySelector(".sg-plot"), "Home");
    await h.key(document.querySelector(".sg-plot"), "Enter");
    assert.match(document.querySelector(".sg-tooltip").textContent, /PINNED/);
    await h.update({ defaultSamples: 28, paused: true });
    await h.advance(2);
    assert.equal(document.querySelectorAll(".sg-cell").length, 280);
    assert.equal(document.querySelector(".sg-tooltip"), null);
    assert.equal(h.frames.size, 0);
  } finally {
    await h.close();
  }
  assert.equal(h.frames.size, 0);
  assert.ok(h.observers.every((x) => x.disconnected));
});
test("Prism pricing switches billing, multiplies seats, bounds the seat selector and calls tier callbacks", async () => {
  const C = load("components/originals/prism-tier-pricing.tsx").default,
    selections = [],
    h = await mount(C, { onSelectTier: (x) => selections.push(x) });
  try {
    assert.equal(document.querySelector('.pt-header h2,.pt-header p,.pt-header>span'),null);
    assert.equal(document.querySelectorAll('.pt-billing button').length,2);
    assert.ok(document.querySelector('[aria-label="$24"]'));
    assert.ok(document.querySelector('[aria-label="$395"]'));
    await h.click(document.querySelector(".pt-billing button"));
    assert.ok(document.querySelector('[aria-label="$29"]'));
    assert.ok(document.querySelector('[aria-label="$495"]'));
    const input = document.querySelector("input");
    await React.act(() => {
      Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        "value",
      ).set.call(input, "50");
      input.dispatchEvent(new window.Event("input", { bubbles: true }));
      input.dispatchEvent(new window.Event("change", { bubbles: true }));
    });
    assert.ok(document.querySelector('[aria-label="$4950"]'));
    await h.click(document.querySelector(".pt-featured .pt-cta"));
    assert.deepEqual(selections, ["pro"]);
    await h.update({ defaultAnnual: false });
    await h.update({ defaultAnnual: true });
    assert.ok(document.querySelector('[aria-label="$3950"]'));
    assert.match(document.querySelector(".pt-seats").textContent, /50/);
  } finally {
    await h.close();
  }
});
test("Obsidian validates inputs, exposes password state, simulates completion and cancels pending timers", async () => {
  const C = load("components/originals/obsidian-gate.tsx").default,
    oldSet = global.setTimeout,
    oldClear = global.clearTimeout,
    timers = new Map();
  let id = 0,
    success = 0;
  global.setTimeout = (fn, ms) => {
    timers.set(++id, { fn, ms });
    return id;
  };
  global.clearTimeout = (id) => timers.delete(id);
  let h;
  try {
    h = await mount(C, { onSuccess: () => success++ });
    const submit = () =>
      document
        .querySelector("form")
        .dispatchEvent(
          new window.Event("submit", { bubbles: true, cancelable: true }),
        );
    await React.act(submit);
    assert.match(document.querySelector("[role=alert]").textContent, /email/);
    const change = async (name, value) =>
      React.act(() => {
        const el = document.querySelector(`[name="${name}"]`);
        Object.getOwnPropertyDescriptor(
          window.HTMLInputElement.prototype,
          "value",
        ).set.call(el, value);
        el.dispatchEvent(new window.Event("input", { bubbles: true }));
        el.dispatchEvent(new window.Event("change", { bubbles: true }));
      });
    await change("email", "designer@example.com");
    await change("password", "safe-demo-pass");
    await h.click(document.querySelector(".og-visibility"));
    assert.equal(document.querySelector("[name=password]").type, "text");
    await React.act(submit);
    assert.equal(
      document.querySelector(".og-submit").getAttribute("aria-busy"),
      "true",
    );
    await React.act(() => {
      for (const [key, timer] of [...timers])
        if (timer.ms === 1400) {
          timers.delete(key);
          timer.fn();
        }
    });
    assert.equal(success, 1);
    assert.match(
      document.querySelector(".og-message").textContent,
      /Access granted/,
    );
  } finally {
    if (h) await h.close();
    global.setTimeout = oldSet;
    global.clearTimeout = oldClear;
  }
  assert.ok(![...timers.values()].some((t) => t.ms === 650 || t.ms === 1400));
});
