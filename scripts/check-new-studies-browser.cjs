const { chromium } = require(process.env.MOTIQO_PLAYWRIGHT || "playwright");
const assert = require("node:assert/strict");
(async () => {
  const browser = await chromium.launch({
    headless: true,
    args: ["--enable-unsafe-swiftshader"],
  });
  const context = await browser.newContext({
    viewport: { width: 1600, height: 1050 },
    deviceScaleFactor: 1,
    permissions: ["clipboard-read", "clipboard-write"],
  });
  await context.addInitScript(() => {
    window.chimeContexts = [];
    const Audio = window.AudioContext;
    window.AudioContext = class extends Audio {
      constructor(...args) {
        super(...args);
        window.chimeContexts.push(this);
      }
    };
  });
  const page = await context.newPage(),
    errors = [],
    base = "http://localhost:3014";
  page.setDefaultTimeout(45000);
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error" && /shader|WebGLProgram/i.test(m.text()))
      errors.push(m.text());
  });
  async function open(id, selector) {
    await page.goto(base + "/library?element=" + id);
    await page.locator(selector).waitFor();
    await page.waitForTimeout(600);
  }
  async function restoreGPU(selector) {
    const supported = await page
      .locator(selector + ">canvas")
      .evaluate((canvas) => {
        const ext = canvas
          .getContext("webgl2")
          .getExtension("WEBGL_lose_context");
        window.testLostContext = ext;
        if (ext) ext.loseContext();
        return !!ext;
      });
    assert.ok(supported);
    await page.locator(selector + "[data-gl=off]").waitFor();
    await page.waitForTimeout(150);
    await page.evaluate(() => window.testLostContext.restoreContext());
    await page.locator(selector + "[data-gl=on]").waitFor();
  }
  try {
    await open("liquid-veil", ".liquid-veil[data-gl=on]");
    const veil = page.locator(".liquid-veil");
    await veil.getByRole("button", { name: /Architecture/ }).hover();
    await veil.screenshot({ path: "screenshots/liquid-veil-live.png" });
    await veil.getByRole("button", { name: /Architecture/ }).click();
    assert.equal(await veil.getAttribute("data-open"), "false");
    await veil.getByRole("button", { name: "INDEX", exact: true }).click();
    await page.keyboard.press("Escape");
    assert.equal(await veil.getAttribute("data-open"), "false");
    await restoreGPU(".liquid-veil");
    console.log("LiquidVeil: native shader, hover lens, selection and Escape");
    await open("mercury-dock", ".mercury-dock[data-gl=on]");
    const mercury = page.locator(".mercury-dock");
    await mercury.getByRole("button", { name: "Shaders", exact: true }).click();
    assert.equal(
      await mercury
        .getByRole("button", { name: "Shaders", exact: true })
        .getAttribute("aria-current"),
      "page",
    );
    await mercury
      .getByRole("button", { name: "Get access", exact: true })
      .click();
    assert.equal(await mercury.getAttribute("data-access"), "true");
    await page.waitForTimeout(500);
    await mercury.screenshot({ path: "screenshots/mercury-dock-live.png" });
    await page.keyboard.press("Escape");
    assert.equal(await mercury.getAttribute("data-access"), "false");
    await restoreGPU(".mercury-dock");
    console.log("MercuryDock: native SDF shader, navigation and action");
    await open("swiss-prism", ".swiss-prism[data-ready=true]");
    const swiss = page.locator(".swiss-prism");
    await swiss.getByRole("button", { name: "Shaders", exact: true }).hover();
    await page.waitForTimeout(600);
    assert.equal(
      await swiss
        .getByRole("button", { name: "Shaders", exact: true })
        .getAttribute("aria-expanded"),
      "true",
    );
    await swiss.screenshot({ path: "screenshots/swiss-prism-live.png" });
    await swiss
      .getByRole("button", { name: "Close index −", exact: true })
      .click();
    assert.equal(
      await swiss.locator(".sp-drawer").getAttribute("aria-hidden"),
      "true",
    );
    console.log("SwissPrism: directional cells, drums and canvas drawer");
    for (const id of ["verlet-chime", "prism-chime"]) {
      await open(id, ".chime-surface[data-ready=true]");
      const stage = page.locator(".chime-stage");
      assert.equal(await page.evaluate(() => window.chimeContexts.length), 0);
      await stage.screenshot({ path: "screenshots/" + id + "-solo-live.png" });
      await stage
        .getByRole("button", { name: "Next sculpture", exact: true })
        .click();
      await page.waitForTimeout(1200);
      assert.equal(
        await page.locator(".chime-surface").getAttribute("data-chapter"),
        "1",
      );
      await stage
        .getByRole("button", { name: "Ensemble", exact: true })
        .click();
      await page.waitForTimeout(1200);
      assert.equal(await stage.getAttribute("data-ensemble"), "true");
      assert.equal(
        await page.locator(".chime-surface").getAttribute("data-nodes"),
        id === "verlet-chime" ? "2184" : "2688",
      );
      await stage
        .getByRole("button", { name: "Enable sound", exact: true })
        .click();
      await stage.getByRole("button", { name: "Mute", exact: true }).waitFor();
      assert.equal(await page.evaluate(() => window.chimeContexts.length), 1);
      const box = await stage.boundingBox();
      await page.mouse.move(box.x + box.width * 0.2, box.y + box.height * 0.55);
      await page.mouse.move(
        box.x + box.width * 0.8,
        box.y + box.height * 0.65,
        { steps: 18 },
      );
      await stage.screenshot({ path: "screenshots/" + id + "-trio-live.png" });
      await stage.getByRole("button", { name: "Mute", exact: true }).click();
      await page.waitForTimeout(150);
      assert.equal(
        await page.evaluate(() => window.chimeContexts[0].state),
        "suspended",
      );
      await page.locator(".sidebar-brand").click();
      await page.waitForURL(base + "/");
      await page.waitForFunction(
        () => window.chimeContexts[0]?.state === "closed",
      );
      assert.equal(
        await page.evaluate(() => window.chimeContexts[0]?.state),
        "closed",
      );
      console.log(
        id + ": solo/trio, exact density, sound gesture/mute/disposal",
      );
    }
    await open("liquid-sculpture", ".liquid-form[data-ready=true]");
    await page.waitForTimeout(600);
    await page
      .locator(".liquid-form")
      .screenshot({ path: "screenshots/liquid-form-reinvented.png" });
    console.log("Liquid Form: raymarch shader rendered");
    for (const id of [
      "liquid-veil",
      "mercury-dock",
      "swiss-prism",
      "verlet-chime",
      "prism-chime",
    ]) {
      await page.setViewportSize({ width: 320, height: 884 });
      await open(
        id,
        id === "liquid-veil"
          ? ".liquid-veil[data-ready=true]"
          : id === "mercury-dock"
            ? ".mercury-dock[data-ready=true]"
            : id === "swiss-prism"
              ? ".swiss-prism[data-ready=true]"
              : ".chime-surface[data-ready=true]",
      );
      assert.ok(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
      );
      await page.screenshot({
        path: "screenshots/" + id + "-320.png",
        fullPage: true,
      });
    }
    await page.setViewportSize({ width: 1600, height: 1050 });
    await page.goto(base + "/docs");
    await page.waitForLoadState("networkidle");
    const doc = page.locator("pre").first();
    await doc.waitFor();
    const docStyle = await doc.evaluate((el) => ({
      font: getComputedStyle(el).fontFamily,
      codeFont: getComputedStyle(el.querySelector('code')).fontFamily,
      tokenFont: getComputedStyle(el.querySelector('[data-syntax]')).fontFamily,
      tokenColor: getComputedStyle(el.querySelector('[data-syntax]')).color,
      bg: getComputedStyle(el.parentElement).backgroundColor,
      radius: getComputedStyle(el.parentElement).borderRadius,
    }));
    await page
      .getByRole("button", { name: "Copy CLI installation", exact: true })
      .click();
    await page.getByRole("tooltip", { name: "Copied", exact: true }).waitFor();
    assert.match(
      await page.evaluate(() => navigator.clipboard.readText()),
      /^npm install --save-dev/,
    );
    await page.screenshot({
      path: "screenshots/docs-shared-code-block.png",
      fullPage: true,
    });
    await page.goto(base + "/skill");
    await page.locator("pre").first().waitFor();
    const skillStyle = await page
      .locator("pre")
      .first()
      .evaluate((el) => ({
        font: getComputedStyle(el).fontFamily,
        codeFont: getComputedStyle(el.querySelector('code')).fontFamily,
        tokenFont: getComputedStyle(el.querySelector('[data-syntax]')).fontFamily,
        tokenColor: getComputedStyle(el.querySelector('[data-syntax]')).color,
        bg: getComputedStyle(el.parentElement).backgroundColor,
        radius: getComputedStyle(el.parentElement).borderRadius,
      }));
    assert.deepEqual(docStyle, skillStyle);
    console.log("Docs: exact shared Skill styles and working clipboard copy");
    await page.emulateMedia({ reducedMotion: "reduce" });
    await open("prism-chime", ".chime-surface[data-ready=true]");
    await page.locator(".chime-next").click();
    await page.waitForTimeout(200);
    assert.equal(
      await page.locator(".chime-surface").getAttribute("data-chapter"),
      "1",
    );
    assert.equal(await page.evaluate(() => window.chimeContexts.length), 0);
    console.log(
      "Reduced motion: static curtain with chapter navigation, no autoplay audio",
    );
    assert.deepEqual(errors, []);
    console.log("No JavaScript or shader errors; no page overflow at 320px");
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
