const { test } = require("node:test"),
  assert = require("node:assert/strict");
const { load, mount, React } = require("./support/component-harness.cjs");
test("Liquid Veil selects a chapter, closes with focus restoration and supports the no-GPU fallback", async () => {
  const C = load("components/originals/liquid-veil.tsx").default;
  let selected;
  const e = await mount(C, {
    onSelect: (item) => (selected = item.label),
    defaultOpen: true,
  });
  try {
    const root = document.querySelector(".liquid-veil"),
      button = document.querySelector(".lv-trigger");
    assert.equal(button.getAttribute("aria-expanded"), "false");
    await React.act(() => new Promise((resolve) => setTimeout(resolve, 830)));
    assert.equal(button.getAttribute("aria-expanded"), "true");
    assert.equal(root.dataset.gl, "off");
    assert.ok(!root.textContent.includes("MOTIQO"));
    await e.click(document.querySelectorAll(".lv-index button")[1]);
    assert.equal(selected, "Shaders");
    assert.equal(button.getAttribute("aria-expanded"), "false");
    assert.equal(document.activeElement, button);
    await e.click(button);
    await e.key(root, "Escape");
    assert.equal(button.getAttribute("aria-expanded"), "false");
  } finally {
    await e.close();
  }
});
test("Mercury Dock callbacks, current destination and access island work without a GPU", async () => {
  const C = load("components/originals/mercury-dock.tsx").default;
  let label,
    actions = 0;
  const e = await mount(C, {
    onSelect: (v) => (label = v),
    onAction: () => actions++,
  });
  try {
    await e.click(document.querySelectorAll(".md-links button")[2]);
    assert.equal(label, "Engines");
    assert.equal(
      document
        .querySelectorAll(".md-links button")[2]
        .getAttribute("aria-current"),
      "page",
    );
    await e.click(document.querySelector(".md-action"));
    assert.equal(actions, 1);
    assert.equal(
      document.querySelector(".md-action").getAttribute("aria-expanded"),
      "true",
    );
    await e.key(document.querySelector(".mercury-dock"), "Escape");
    assert.equal(
      document.querySelector(".md-action").getAttribute("aria-expanded"),
      "false",
    );
  } finally {
    await e.close();
  }
});
test("Swiss Prism detects all four entry directions and keeps its drawer and subnavigation usable", async () => {
  const module = load("components/originals/swiss-prism.tsx");
  assert.equal(module.entryDirection(0, 30, 100, 60), "left");
  assert.equal(module.entryDirection(100, 30, 100, 60), "right");
  assert.equal(module.entryDirection(50, 0, 100, 60), "top");
  assert.equal(module.entryDirection(50, 60, 100, 60), "bottom");
  let label;
  const e = await mount(module.default, { onSelect: (v) => (label = v) });
  try {
    const cells = document.querySelectorAll(".sp-cell");
    await e.click(cells[1]);
    assert.equal(cells[1].getAttribute("aria-expanded"), "true");
    await e.click(document.querySelector(".sp-subindex button"));
    assert.equal(label, "Refraction studies");
    await e.key(document.querySelector(".swiss-prism"), "Escape");
    assert.equal(
      document.querySelector(".sp-drawer").getAttribute("aria-hidden"),
      "true",
    );
    await e.update({ showTelemetryTicker: false, paused: true });
    assert.equal(document.querySelector(".sp-ticker"), null);
  } finally {
    await e.close();
  }
});
