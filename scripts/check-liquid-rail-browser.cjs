const { chromium } = require(process.env.MOTIQO_PLAYWRIGHT || "playwright"),
  assert = require("node:assert/strict"),
  fs = require("node:fs"),
  sharp = require("sharp"),
  crypto = require("node:crypto");
(async () => {
  const browser = await chromium.launch({
      channel: process.env.MOTIQO_BROWSER || "chrome",
      headless: true,
      args: ["--enable-unsafe-swiftshader"],
    }),
    page = await browser.newPage({ viewport: { width: 1100, height: 680 } }),
    base = process.env.MOTIQO_URL || "http://127.0.0.1:3014",
    errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error" && /shader error|WebGLProgram/i.test(m.text()))
      errors.push(m.text());
  });
  page.setDefaultTimeout(60000);
  async function open(
    theme = "light",
    motion = true,
    width = 1100,
    height = 680,
  ) {
    await page.setViewportSize({ width, height });
    await page.goto(
      base +
        "/preview-capture/liquid-rail?frame=card&theme=" +
        theme +
        (motion ? "&motion=1" : ""),
      { waitUntil: "domcontentloaded" },
    );
    await page
      .locator(".liquid-rail[data-renderer=webgl][data-ready=true]")
      .waitFor();
    await page.locator(".preview-capture").evaluate(
      (n, { width, height }) => {
        n.style.setProperty("width", width + "px", "important");
        n.style.setProperty("height", height + "px", "important");
      },
      { width, height },
    );
    await page.waitForTimeout(300);
  }
  try {
    await open();
    const root = page.locator(".liquid-rail");
    await page.screenshot({
      path: "screenshots/liquid-rail-desktop-light.png",
    });
    const before = Number(await root.getAttribute("data-cursor"));
    await page.waitForTimeout(400);
    assert.notEqual(Number(await root.getAttribute("data-cursor")), before);
    await page.mouse.move(550, 490);
    await page.mouse.down();
    await page.mouse.move(550, 190, { steps: 24 });
    await page.waitForTimeout(80);
    const bend = Math.abs(Number(await root.getAttribute("data-bend")));
    assert.ok(bend > 0.05, "moving images have a visible elastic wake");
    await page.screenshot({ path: "screenshots/liquid-rail-drag.png" });
    await page.mouse.move(550, 450, { steps: 24 });
    await page.mouse.up();
    await page.getByRole("button", { name: "Show Solstice" }).click();
    await page.waitForFunction(
      () =>
        document
          .querySelectorAll(".lr-index button")[2]
          .getAttribute("aria-current") === "true",
    );
    await root.focus();
    await page.keyboard.press("ArrowUp");
    await page.waitForFunction(
      () =>
        document
          .querySelectorAll(".lr-index button")[1]
          .getAttribute("aria-current") === "true",
    );
    const wheelBefore = Number(await root.getAttribute("data-cursor"));
    await page.mouse.move(550, 400);
    await page.mouse.wheel(0, 320);
    await page.waitForTimeout(400);
    assert.ok(Number(await root.getAttribute("data-cursor")) > wheelBefore);
    await page.waitForTimeout(2700);
    const timing = await page.evaluate(
      () =>
        new Promise((resolve) => {
          const samples = [],
            long = [],
            observer = new PerformanceObserver((list) =>
              long.push(...list.getEntries().map((e) => e.duration)),
            );
          observer.observe({ type: "longtask", buffered: false });
          let previous = 0,
            cursor = document.querySelector(".liquid-rail").dataset.cursor;
          function tick(t) {
            const next = document.querySelector(".liquid-rail").dataset.cursor;
            if (next !== cursor) {
              if (previous) samples.push(t - previous);
              previous = t;
              cursor = next;
            }
            if (samples.length < 180) requestAnimationFrame(tick);
            else {
              observer.disconnect();
              const sorted = [...samples].sort((a, b) => a - b);
              resolve({
                samples: samples.length,
                medianMs: sorted[Math.floor(sorted.length * 0.5)],
                p95Ms: sorted[Math.floor(sorted.length * 0.95)],
                longTasks: long.length,
              });
            }
          }
          requestAnimationFrame(tick);
        }),
    );
    fs.writeFileSync(
      "screenshots/liquid-rail-timing.json",
      JSON.stringify(timing, null, 2),
    );
    console.log("Actual carousel update cadence:", JSON.stringify(timing));
    await root.evaluate((n) => (n.style.visibility = "hidden"));
    await page.evaluate(() => {
      window.__railLoss = document
        .querySelector(".lr-canvas")
        .getContext("webgl2")
        .getExtension("WEBGL_lose_context");
      window.__railLoss.loseContext();
    });
    await page.waitForFunction(
      () =>
        document.querySelector(".liquid-rail").dataset.renderer === "fallback",
    );
    await page.waitForTimeout(50);
    await root.evaluate((n) => (n.style.visibility = "visible"));
    await page.screenshot({ path: "screenshots/liquid-rail-fallback.png" });
    await page.getByRole("button", { name: "Show Tidal" }).click();
    await page.waitForFunction(
      () =>
        document
          .querySelectorAll(".lr-index button")[4]
          .getAttribute("aria-current") === "true",
    );
    await page.evaluate(() => window.__railLoss.restoreContext());
    await page
      .locator(".liquid-rail[data-renderer=webgl][data-ready=true]")
      .waitFor();
    await open("dark", true, 320, 780);
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    );
    await root.focus();
    await page.keyboard.press("End");
    await page.waitForFunction(
      () =>
        document
          .querySelectorAll(".lr-index button")[5]
          .getAttribute("aria-current") === "true",
    );
    await page.screenshot({ path: "screenshots/liquid-rail-mobile-dark.png" });
    const touchBefore=Number(await root.getAttribute('data-cursor')),cdp=await page.context().newCDPSession(page);
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:150,y:490}]});
    for(let i=1;i<=14;i++){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:150,y:490-i*16}]});await page.waitForTimeout(16);}
    await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.waitForTimeout(250);
    assert.ok(Number(await root.getAttribute('data-cursor'))>touchBefore+.1,'touch drag advances the image rail');await cdp.detach();
    const revisions = (
        await import("./preview-revisions.mjs")
      ).previewRevisions(),
      registry = require("../registry/previews.json"),
      entry = { sourceHash: revisions["liquid-rail"] };
    for (const theme of ["light", "dark"]) {
      await open(theme, false, 400, 300);
      const cursor = await root.getAttribute("data-cursor");
      await page.waitForTimeout(250);
      assert.equal(await root.getAttribute("data-cursor"), cursor);
      await page
        .locator("[data-testid=poster-surface][data-ready=true]")
        .waitFor();
      const png = await page.screenshot({
          path: "screenshots/liquid-rail-card-" + theme + ".png",
        }),
        bytes = await sharp(png).webp({ quality: 88 }).toBuffer(),
        hash = crypto
          .createHash("sha256")
          .update(bytes)
          .digest("hex")
          .slice(0, 12),
        name = "liquid-rail-" + theme + "-" + hash + ".webp";
      fs.writeFileSync("public/previews/" + name, bytes);
      entry[theme] = "/previews/" + name;
    }
    registry.items["liquid-rail"] = entry;
    fs.writeFileSync(
      "registry/previews.json",
      JSON.stringify(registry, null, 2) + "\n",
    );
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto(base + "/library?element=liquid-rail");
    await page.locator(".liquid-rail[data-ready=true]").waitFor();
    await page.screenshot({
      path: "screenshots/liquid-rail-workspace.png",
      fullPage: true,
    });
    assert.ok(await page.getByText("Liquid strength", { exact: true }).count());
    await page.goto(base + "/library?group=carousels");
    await page.locator("[data-element=liquid-rail]").waitFor();
    assert.equal(
      await page
        .locator(".element-grid article")
        .first()
        .getAttribute("data-element"),
      "liquid-rail",
    );
    await page.screenshot({
      path: "screenshots/liquid-rail-library.png",
      fullPage: true,
    });
    assert.deepEqual(errors, []);
    console.log(
      "Passed drag, reverse, thumbnails, keys, wheel, GPU fallback, 320px, both themes, reduced motion, workspace controls and first carousel position.",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
