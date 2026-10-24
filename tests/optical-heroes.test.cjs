const { test } = require("node:test"),
  assert = require("node:assert/strict"),
  { load, mount } = require("./support/component-harness.cjs");
test("Nebula switches real field modes, palettes and pulses while forwarding clamped props", async () => {
  const sessions = [];
  const C = load("components/heroes/kinetic-nebula-hero.tsx", {
    "./nebula-scene": {
      createNebulaScene(host, canvas, read) {
        const s = {
          read,
          pulses: 0,
          dispose() {
            this.disposed = true;
          },
          invalidate() {},
          pointer() {},
          hold() {},
          pulse() {
            this.pulses++;
          },
        };
        sessions.push(s);
        host.dataset.ready = "true";
        return s;
      },
    },
  }).default;
  const h = await mount(C, { particleCount: 30000 });
  try {
    assert.match(
      document.querySelector(".kn-particle-count").textContent,
      /30,000/,
    );
    await h.click(
      [...document.querySelectorAll(".kn-modes button")].find(
        (x) => x.textContent === "Vortex",
      ),
    );
    assert.equal(sessions.at(-1).read().mode, "vortex");
    await h.click(document.querySelector(".kn-cta"));
    assert.equal(sessions.at(-1).pulses, 1);
    assert.match(
      document.querySelector("[role=status]").textContent,
      /pulse 1/,
    );
    assert.equal(document.querySelector(".kn-telemetry"),null);
    await h.update({particleCount:30000,colorPreset:"aurora"});
    assert.equal(sessions.at(-1).read().colorPreset, "aurora");
    await h.update({ particleCount: 1, flowSpeed: Infinity, paused: true });
    assert.equal(sessions.at(-1).read().particleCount, 1000);
    assert.equal(sessions.at(-1).read().flowSpeed, 1);
    assert.equal(sessions.at(-1).read().paused, true);
  } finally {
    await h.close();
  }
  assert.ok(sessions.every((x) => x.disposed));
});
test("Luminary presets change lens uniforms, documentation toggles, inspection focuses an actual slider", async () => {
  const sessions = [];
  const C = load("components/heroes/luminary-hero.tsx", {
    "./luminary-scene": {
      createLuminaryScene(host, canvas, read) {
        const s = {
          read,
          dispose() {
            this.disposed = true;
          },
          invalidate() {},
          pointer() {},
        };
        sessions.push(s);
        return s;
      },
    },
  }).default;
  const h = await mount(C);
  try {
    window.HTMLElement.prototype.scrollIntoView = () => {};
    await h.click(
      [...document.querySelectorAll(".lh-nav button")].find(
        (x) => x.textContent === "Materials",
      ),
    );
    assert.equal(sessions.at(-1).read().ior, 1.82);
    await h.click(document.querySelector(".lh-secondary"));
    assert.ok(document.querySelector(".lh-docs"));
    await h.click(document.querySelector(".lh-docs button"));
    assert.equal(document.querySelector(".lh-docs"), null);
    await h.click(document.querySelector(".lh-primary"));
    assert.equal(
      document.activeElement.getAttribute("aria-label"),
      "Refraction IOR",
    );
    await h.update({ ior: 99, causticIntensity: -5, paused: true });
    assert.equal(sessions.at(-1).read().ior, 2.5);
    assert.equal(sessions.at(-1).read().causticIntensity, 0);
    assert.equal(sessions.at(-1).read().paused, true);
  } finally {
    await h.close();
  }
  assert.ok(sessions.every((x) => x.disposed));
});
test("Optical heroes gracefully expose useful static compositions without WebGL", async () => {
  for (const file of ["kinetic-nebula-hero", "luminary-hero"]) {
    const h = await mount(load(`components/heroes/${file}.tsx`).default);
    try {
      assert.equal(document.querySelector("section").dataset.gl, "off");
      assert.ok(document.querySelector("h1"));
      assert.ok(document.querySelectorAll("button").length > 0);
    } finally {
      await h.close();
    }
    assert.equal(h.frames.size, 0);
  }
});
