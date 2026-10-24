const { chromium } = require(process.env.MOTIQO_PLAYWRIGHT || "playwright"),
  fs = require("node:fs"),
  assert = require("node:assert/strict");
(async () => {
  const browser = await chromium.launch({
    headless: true,
    args: ["--enable-unsafe-swiftshader", "--allow-file-access-from-files"],
  });
  const page = await browser.newPage({
      viewport: { width: 1440, height: 1000 },
    }),
    errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error" && /shader|WebGLProgram/i.test(m.text()))
      errors.push(m.text());
  });
  try {
    const base = process.env.MOTIQO_URL || "http://localhost:3014";
    if (process.argv.includes("--video")) {
      fs.writeFileSync(
        "screenshots/reference-video.html",
        '<video src="file:///C:/Users/Robert/Downloads/New%20Moti/Hero%203.mp4" muted controls style="width:1280px"></video>',
      );
      await page.goto(
        "file:///" +
          process.cwd().replace(/\\/g, "/") +
          "/screenshots/reference-video.html",
      );
      await page.locator("video").evaluate(async (v) => {
        await new Promise((r) =>
          v.readyState >= 2
            ? r()
            : v.addEventListener("loadeddata", r, { once: true }),
        );
        v.currentTime = Math.min(3, v.duration / 2);
        await new Promise((r) =>
          v.addEventListener("seeked", r, { once: true }),
        );
      });
      await page
        .locator("video")
        .screenshot({ path: "screenshots/bio-video-reference.png" });
      console.log("Video reference frame captured");
      return;
    }
    await page.goto(base + "/hero/preview/zenith-beam?still=1");
    await page.waitForSelector("[data-testid=hero-capture][data-ready=true]");
    await page.screenshot({ path: "screenshots/zenith-beam-desktop.png" });
    await page.getByRole("button", { name: "Initialize Cluster" }).click();
    await page.getByRole("status").filter({ hasText: "initialized" }).waitFor();
    console.log("Zenith Canvas + pulse passed");
    await page.goto(base + "/pricing?element=horizon-grid-pricing");
    await page.locator(".horizon-pricing").waitFor();
    await page.getByRole("button", { name: "250K compute units" }).click();
    await page.locator('[aria-label="$329 per month"]').waitFor();
    await page.getByRole("button", { name: "Choose Expert Plan" }).click();
    assert.match(
      await page.locator(".hg-selection").innerText(),
      /Expert selected/,
    );
    await page
      .getByRole("button", { name: "View more", exact: true })
      .first()
      .click();
    assert.equal(await page.locator(".hg-extra").first().isVisible(), true);
    await page.screenshot({ path: "screenshots/horizon-pricing-desktop.png" });
    console.log("Horizon selection + capacity + disclosure passed");
    await page.goto(base + "/library?element=cosmos-split-auth");
    await page.locator(".cosmos-auth[data-ready=true]").waitFor();
    await page
      .getByRole("combobox", { name: "Language", exact: true })
      .selectOption("ES");
    await page.getByRole("heading", { name: "¡Bienvenido!" }).waitFor();
    await page
      .getByRole("textbox", { name: "Tu correo" })
      .fill("designer@example.com");
    await page.getByLabel("Contraseña", { exact: true }).fill("demo-password");
    await page
      .getByRole("button", { name: "Iniciar sesión", exact: true })
      .click();
    assert.match(await page.locator(".cs-feedback").innerText(), /Modo demo/);
    await page.getByRole("button", { name: "Next scene" }).click();
    assert.equal(
      await page.locator(".cs-space").getAttribute("data-slide"),
      "1",
    );
    assert.equal(await page.locator('.cs-astronaut').evaluate(img=>img.complete&&img.naturalWidth>0),true);
    await page.waitForTimeout(700);
    await page.screenshot({ path: "screenshots/cosmos-auth-desktop.png" });
    console.log("Cosmos localization + validated demo form + carousel passed");
    if (process.argv.includes("--partial")) return;
    await page.goto(base + "/hero/preview/bio-terrain?still=1");
    await page.locator("[data-testid=hero-capture][data-ready=true]").waitFor();
    assert.equal(await page.locator(".bio-hero").getAttribute("data-gl"), "on");
    await page.getByRole("button", { name: "Deploy Cluster" }).click();
    await page.screenshot({ path: "screenshots/bio-terrain-desktop.png" });
    console.log("Bio GPU scene + shockwave passed");
    const recovery=await page.locator('.bio-hero canvas').evaluate(async canvas=>{
      const gl=canvas.getContext('webgl2'),extension=gl?.getExtension('WEBGL_lose_context');if(!extension)return false;
      extension.loseContext();await new Promise(resolve=>setTimeout(resolve,150));extension.restoreContext();return true;
    });
    assert.equal(recovery,true);await page.waitForFunction(()=>document.querySelector('.bio-hero')?.dataset.gl==='on');console.log('Real WebGL context loss / restoration passed');
    await page.goto(base+'/library?element=prism-tier-pricing');await page.locator('.prism-tier').waitFor();assert.equal(new URL(page.url()).pathname,'/pricing');
    const proportions=await page.locator('.pt-card').first().evaluate(card=>{const r=card.getBoundingClientRect();return{width:card.offsetWidth,scaleX:r.width/card.offsetWidth,scaleY:r.height/card.offsetHeight};});assert.ok(proportions.width>300);assert.ok(Math.abs(proportions.scaleX-proportions.scaleY)<.01);console.log('Prism redirect + uniform preview scale passed');
    await page.goto(base+'/pricing');await page.getByRole('heading',{name:'Pricing',exact:true}).waitFor();assert.equal(await page.locator('[data-element="prism-tier-pricing"]').count(),1);assert.equal(await page.locator('[data-element="horizon-grid-pricing"]').count(),1);
    await page.goto(base+'/library');await page.getByRole('heading',{name:'Components',exact:true}).waitFor();assert.equal(await page.locator('[data-element="prism-tier-pricing"]').count(),0);assert.equal(await page.locator('[data-element="horizon-grid-pricing"]').count(),0);await page.getByRole('button',{name:'Back to main navigation'}).click();assert.equal(await page.locator('a[href="/pricing"]').isVisible(),true);console.log('Sections gallery, Components exclusion and sidebar return passed');
    for (const [path, selector] of [
      ["/hero/preview/zenith-beam", ".zenith-hero"],
      ["/hero/preview/bio-terrain", ".bio-hero"],
      ["/pricing?element=prism-tier-pricing", ".prism-tier"],
      ["/pricing?element=horizon-grid-pricing", ".horizon-pricing"],
      ["/library?element=cosmos-split-auth", ".cosmos-auth"],
    ]) {
      await page.setViewportSize({ width: 320, height: 844 });
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.goto(base + path);
      await page.locator(selector).waitFor();
      assert.ok(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
        "page overflow " + path,
      );
      await page.screenshot({
        path: "screenshots/spatial-mobile-" + selector.slice(1) + ".png",
        fullPage: true,
      });
      console.log("320px + reduced motion " + selector);
    }
    assert.deepEqual(errors, []);
    console.log("No browser or shader errors.");
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
