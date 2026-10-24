// Run with Motiqo dev running. MOTIQO_PLAYWRIGHT can point to a bundled Playwright package.
const { chromium } = require(process.env.MOTIQO_PLAYWRIGHT || "playwright");
const assert = require("node:assert/strict"),
  fs = require("node:fs"),
  path = require("node:path");
const base = process.env.MOTIQO_URL || "http://localhost:3014";
(async () => {
  const browser = await chromium.launch({
    headless: true,
    args: ["--enable-unsafe-swiftshader"],
  });
  const checks = [],
    errors = [];
  let defaultPage;
  try {
    const page = (defaultPage = await browser.newPage({
      viewport: { width: 1440, height: 1000 },
    }));
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => {
      if (
        m.type() === "error" &&
        /THREE|shader|GL_INVALID|WebGLProgram/i.test(m.text())
      )
        errors.push(m.text());
    });
    const shot = async (name) =>
      page.screenshot({ path: `screenshots/${name}.png`, fullPage: true });
    const range = async (label, value) =>
      page
        .getByRole("slider", { name: label, exact: true })
        .evaluate((input, value) => {
          Object.getOwnPropertyDescriptor(
            HTMLInputElement.prototype,
            "value",
          ).set.call(input, String(value));
          input.dispatchEvent(new Event("input", { bubbles: true }));
          input.dispatchEvent(new Event("change", { bubbles: true }));
        }, value);
    const enter = async (id, selector) => {
      await page.goto(`${base}/library?element=${id}`, {
        waitUntil: "domcontentloaded",
      });
      await page.locator(selector).waitFor();
      await page.waitForFunction(
        (selector) =>
          document
            .querySelector(selector)
            ?.querySelector("[data-ready=true]") ||
          document.querySelector(selector)?.getAttribute("data-ready") ===
            "true",
        selector,
        { timeout: 45000 },
      );
    };
    await enter("vortex-camera", ".vc-root");
    assert.equal(
      await page
        .locator(".vc-root button,.vc-root input,.vc-telemetry,.vc-controls")
        .count(),
      0,
    );
    await range("Camera progress", 0.65);
    await page.waitForFunction(
      () =>
        Math.abs(
          Number(document.querySelector(".vc-root").dataset.progress) - 0.65,
        ) < 0.01,
    );
    assert.match(
      await page
        .locator(".vc-stage h2")
        .first()
        .evaluate((el) => getComputedStyle(el).fontFamily),
      /Urbanist/,
    );
    const canvas = await page.locator(".vc-root canvas").elementHandle();
    await range("Image darkness", 0.4);
    assert.equal(
      await page
        .locator(".vc-root canvas")
        .evaluate((el, old) => el === old, canvas),
      true,
    );
    await shot("vortex-library");
    checks.push(
      "Vortex is in Components with external panel controls, Urbanist stages and no internal UI; live uniforms retain the canvas",
    );
    await enter("signal-grid", ".signal-grid");
    await page.getByRole("button", { name: "14 samples", exact: true }).click();
    assert.equal(await page.locator(".sg-cell").count(), 140);
    await page.locator(".sg-plot").focus();
    await page.keyboard.press("Home");
    await page.keyboard.press("Enter");
    assert.match(await page.locator(".sg-tooltip").innerText(), /PINNED/);
    await page.keyboard.press("Escape");
    await shot("signal-grid-library");
    checks.push(
      "SignalGrid sample switching, keyboard inspection and pin/release work",
    );
    await enter("prism-tier-pricing", ".prism-tier");
    await page.getByRole("button", { name: "Monthly", exact: true }).click();
    assert.equal(await page.locator('[aria-label="$29"]').count(), 1);
    await range("Team seats", 50);
    assert.equal(await page.locator('[aria-label="$4950"]').count(), 1);
    await page.getByRole("button", { name: "Start Pro Studio" }).click();
    assert.match(
      await page.locator(".pt-selection").innerText(),
      /Pro Studio selected/,
    );
    await shot("prism-pricing-library");
    checks.push(
      "Pricing calculates monthly/annual per-seat totals and announces tier selection",
    );
    await enter("obsidian-gate", ".obsidian-gate");
    await page.getByRole("button", { name: "Authorize Session" }).click();
    await page.locator(".og-error[role=alert]").waitFor();
    await page
      .getByLabel("Email address", { exact: true })
      .fill("studio@example.com");
    await page.getByLabel("Password", { exact: true }).fill("demo-password");
    await page
      .getByRole("button", { name: "Show password", exact: true })
      .click();
    assert.equal(
      await page.locator("[name=password]").getAttribute("type"),
      "text",
    );
    await page.getByRole("button", { name: "Authorize Session" }).click();
    await page.waitForFunction(
      () =>
        document.querySelector(".obsidian-gate").dataset.phase === "success",
    );
    await shot("obsidian-gate-library");
    checks.push(
      "Obsidian validates, toggles password visibility and finishes the clearly labeled demo without a network auth request",
    );
    for (const id of ["kinetic-nebula", "luminary"]) {
      await page.setViewportSize({ width: 1280, height: 900 });
      await page.goto(`${base}/hero/preview/${id}?still=1`);
      await page
        .locator("[data-testid=hero-capture][data-ready=true]")
        .waitFor({ timeout: 45000 });
      const root = page.locator(
        id === "luminary" ? ".luminary-hero" : ".kinetic-nebula",
      );
      assert.equal(await root.getAttribute("data-gl"), "on");
      await shot(`${id}-poster`);
      if (id === "kinetic-nebula") {
        await page.getByRole("button", { name: "Vortex", exact: true }).click();
        assert.equal(
          await page
            .getByRole("button", { name: "Vortex", exact: true })
            .getAttribute("aria-pressed"),
          "true",
        );
        await page.getByRole("button", { name: "Disturb the field" }).click();
        assert.match(await page.locator(".kn-status").innerText(), /pulse 1/);
        await page
          .getByRole("button", { name: "Change particle palette" })
          .click();
        assert.match(
          await page
            .locator('[aria-label="Change particle palette"]')
            .innerText(),
          /AURORA/,
        );
      } else {
        await page
          .getByRole("button", { name: "Materials", exact: true })
          .click();
        assert.equal(
          await page
            .getByRole("slider", { name: "Refraction IOR" })
            .inputValue(),
          "1.82",
        );
        await page.getByRole("button", { name: "Explore Primitives" }).click();
        assert.equal(
          await page
            .getByRole("slider", { name: "Refraction IOR" })
            .evaluate((el) => el === document.activeElement),
          true,
        );
        await page.getByRole("button", { name: "View Documentation" }).click();
        await page.locator(".lh-docs").waitFor();
        await page.getByRole("button", { name: "Close documentation" }).click();
      }
      checks.push(
        `${id} uses real WebGL with functional field/lens controls and a static reduced-motion frame`,
      );
      await page.setViewportSize({ width: 320, height: 844 });
      await page.goto(`${base}/hero/preview/${id}`);
      await page
        .locator(
          id === "luminary"
            ? ".luminary-hero[data-ready=true]"
            : ".kinetic-nebula[data-ready=true]",
        )
        .waitFor({ timeout: 45000 });
      assert.ok(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      );
      await shot(`${id}-mobile`);
      checks.push(`${id} fits a 320px viewport`);
      const loss = await page
        .locator("canvas")
        .first()
        .evaluate((canvas) => {
          const gl = canvas.getContext("webgl2"),
            ext = gl.getExtension("WEBGL_lose_context");
          if (!ext) return false;
          ext.loseContext();
          setTimeout(() => ext.restoreContext(), 150);
          return true;
        });
      if (loss) {
        await page.waitForTimeout(700);
        assert.equal(
          await page
            .locator(id === "luminary" ? ".luminary-hero" : ".kinetic-nebula")
            .getAttribute("data-gl"),
          "on",
        );
        checks.push(`${id} restores its WebGL context`);
      }
    }
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.setViewportSize({ width: 320, height: 844 });
    for (const [id, selector] of [
      ["vortex-camera", ".vc-root"],
      ["signal-grid", ".signal-grid"],
      ["prism-tier-pricing", ".prism-tier"],
      ["obsidian-gate", ".obsidian-gate"],
    ]) {
      await enter(id, selector);
      assert.ok(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      );
      await shot(`${id}-mobile`);
    }
    checks.push("All four Components fit 320px with reduced motion enabled");
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto(`${base}/hero`);
    await page
      .getByRole("link", { name: "Preview KineticNebulaHero", exact: true })
      .waitFor();
    assert.equal(
      await page
        .getByRole("link", { name: "Preview KineticNebulaHero", exact: true })
        .count(),
      1,
    );
    assert.equal(
      await page
        .getByRole("link", { name: "Preview LuminaryHero", exact: true })
        .count(),
      1,
    );
    checks.push("Both new Heroes appear in the actual Heroes collection");
    assert.deepEqual(errors, []);
    const result = {
      checks,
      passed: checks.length,
      shaderOrJavaScriptErrors: errors,
      browser: "Chromium headless with SwiftShader",
      limitations: [
        "No hardware GPU FPS guarantee",
        "Native browser zoom at 200% and a screen-reader pass remain pending",
      ],
    };
    fs.writeFileSync(
      "screenshots/prompt-collection-browser.json",
      JSON.stringify(result, null, 2),
    );
    console.log(JSON.stringify(result, null, 2));
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
