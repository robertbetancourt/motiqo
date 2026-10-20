const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const ts = require("typescript-compiler-api");
function load(file, mocks = {}) {
  const filename = path.resolve(__dirname, "..", file),
    m = new Module(filename, module);
  m.filename = filename;
  m.paths = Module._nodeModulePaths(path.dirname(filename));
  const normal = m.require.bind(m);
  m.require = (id) => (Object.hasOwn(mocks, id) ? mocks[id] : normal(id));
  m._compile(
    ts.transpileModule(fs.readFileSync(filename, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        esModuleInterop: true,
        jsx: ts.JsxEmit.ReactJSX,
      },
    }).outputText,
    filename,
  );
  return m.exports;
}
const data = load("components/originals/elevation-data.ts");
const controls = load("lib/element-controls.ts");
const catalog = load("lib/catalog.ts", { "./element-controls": controls });

test("Elevation Matrix is discoverable with configurable usage and the complete motion prompt", () => {
  const item = catalog.elements.find((item) => item.id === "elevation-matrix");
  assert.ok(item);
  const settings = {
    ...controls.defaultsFor(item.id),
    defaultView: "2d",
    defaultTheme: "violet",
  };
  const usage = controls.usageFor(item, settings);
  assert.match(usage, /import ElevationMatrix from '.\/elevation-matrix'/);
  assert.match(usage, /defaultView="2d"/);
  assert.match(usage, /defaultTheme="violet"/);
  assert.match(usage, /perspective="iso"/);
  assert.deepEqual(
    controls.controlsFor(item.id).map((control) => control.key),
    ["unitLabel", "defaultView", "perspective", "defaultTheme"],
  );
  assert.equal(item.hint, "");
  assert.equal(
    controls.normalizeSettings(item.id, { unitLabel: "contribuciones" })
      .unitLabel,
    "contributions",
  );
  assert.equal(
    controls.normalizeSettings(item.id, { unitLabel: "deployments" }).unitLabel,
    "deployments",
  );
  const prompt = catalog.makePrompt(item, "Codex", settings);
  for (const text of [
    "Manhattan",
    "three visible faces",
    "one shared glass tooltip",
    "elevation-matrix.css",
  ])
    assert.ok(prompt.includes(text));
});

test("the portable component renders only the matrix and English intensity legend", () => {
  const React = require("react");
  const { renderToStaticMarkup } = require("react-dom/server");
  const { JSDOM } = require("jsdom");
  const Component = load("components/originals/elevation-matrix.tsx", {
    "./elevation-data": data,
    "./elevation-matrix.css": {},
  }).default;
  const dom = new JSDOM(renderToStaticMarkup(React.createElement(Component)));
  try {
    const root = dom.window.document.querySelector(".em-root");
    assert.equal(root.querySelectorAll(".em-cell").length, 365);
    assert.equal(root.querySelectorAll(".em-face").length, 1095);
    assert.equal(
      root.querySelectorAll(
        "h1,h2,header,select,.em-kpis,.em-stage-caption,.em-hint,.em-controls",
      ).length,
      0,
    );
    assert.deepEqual(
      [...root.querySelectorAll(".em-legend > span")].map(
        (el) => el.textContent,
      ),
      ["Less", "More"],
    );
    assert.equal(root.querySelectorAll(".em-legend button").length, 5);
    assert.match(
      root.querySelector(".em-cell").getAttribute("aria-label"),
      /October.*contributions, level 1, Low/,
    );
    assert.equal(
      root.querySelector(".em-legend").getAttribute("aria-label"),
      "Filter by intensity",
    );
  } finally {
    dom.window.close();
  }
});

test("source panel and component bundle include the CSS and data helper alongside TSX", async () => {
  const registry = load("lib/registry.server.ts", {
    "./format-source.server": { formatSource: async (source) => source },
  });
  const sources = await registry.originalSources(["elevation-matrix"]);
  assert.deepEqual(
    sources["elevation-matrix"].map((file) => file.name),
    ["elevation-matrix.tsx", "elevation-data.ts", "elevation-matrix.css", "elevation-matrix.css.d.ts"],
  );
  const bundle = await registry.componentBundle("elevation-matrix");
  assert.equal(bundle.files.length, 4);
  for (const file of bundle.files)
    assert.equal(
      file.content,
      fs.readFileSync(path.resolve(__dirname, "..", file.source), "utf8"),
    );
  for (const name of ["motion", "lucide-react"])
    assert.ok(bundle.packageDependencies[name]);
});

test("365 UTC dates fit a Monday-first 53-week calendar with consistent KPIs", () => {
  const sample = data.generateElevationData("2024-03-01");
  assert.deepEqual(sample, data.generateElevationData("2024-03-01"));
  assert.ok(sample.some((day) => day.date === "2024-02-29"));
  const matrix = data.buildMatrix(sample);
  assert.equal(matrix.cells.length, 365);
  assert.equal(matrix.weeks, 53);
  assert.equal(
    new Set(matrix.cells.map((c) => `${c.week}:${c.day}`)).size,
    365,
  );
  assert.equal(
    matrix.total,
    sample.reduce((total, point) => total + point.value, 0),
  );
  for (const cell of matrix.cells)
    assert.equal(cell.day, (new Date(cell.date).getUTCDay() + 6) % 7);
  const sparse = data.buildMatrix([
    { date: "2026-10-18", value: 40 },
    { date: "2026-10-16", value: 10 },
    { date: "2026-10-17", value: 20 },
  ]);
  assert.equal(sparse.streak, 3);
  assert.equal(sparse.record.value, 40);
  assert.deepEqual(
    sparse.cells.slice(-4).map((c) => c.level),
    [0, 1, 2, 4],
  );
  assert.equal(data.buildMatrix([]).cells.length, 0);
  assert.equal(
    data.buildMatrix([{ date: "2026-10-18", value: 0 }]).record,
    undefined,
  );
});
