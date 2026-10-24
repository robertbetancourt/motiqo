const { chromium } = require(process.env.MOTIQO_PLAYWRIGHT || "playwright"),
  assert = require("node:assert/strict");
(async () => {
  const browser = await chromium.launch({
      headless: true,
      args: ["--enable-unsafe-swiftshader"],
    }),
    page = await browser.newPage({ viewport: { width: 1034, height: 884 } }),
    base = process.env.MOTIQO_URL || "http://localhost:3014",
    errors = [];
  page.setDefaultTimeout(30000);
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (
      m.type() === "error" &&
      /shader|WebGLProgram|GL_INVALID/i.test(m.text())
    )
      errors.push(m.text());
  });
  const shot = async (name) =>
    page.screenshot({
      path: "screenshots/revision-" + name + ".png",
      fullPage: true,
    });
  try {
    await page.goto(base + "/hero");
    await page.locator('[data-hero="bio-terrain"] .card-title').click();
    await page.locator(".bio-hero").waitFor();
    const history = await page.evaluate(() => window.history.length);
    await page.getByRole("button", { name: "Previous hero" }).click();
    await page.locator(".zenith-hero[data-gl=on]").waitFor();
    assert.equal(await page.evaluate(() => window.history.length), history);
    const url = page.url();
    await page.locator(".zenith-hero header a").first().click({ force: true });
    assert.equal(page.url(), url);
    await shot("zenith");
    await page.getByRole("button", { name: "Hero", exact: true }).click();
    await page.waitForURL(base + "/hero");
    await page.getByRole("heading", { name: "Heroes", exact: true }).waitFor();
    console.log(
      "Hero pagination returns to gallery; decorative navbar is inert; Zenith shader rendered",
    );
    await page.locator('[data-hero="bio-terrain"] .card-title').click();
    await page.locator(".bio-hero").waitFor();
    await page.locator(".bio-hero header a").first().click({ force: true });
    assert.match(page.url(), /hero=bio-terrain/);
    await page
      .locator("aside")
      .getByRole("link", { name: "Home", exact: true })
      .click();
    await page.waitForURL(base + "/");
    await page
      .getByRole("heading", { name: "Discover", exact: true })
      .waitFor();
    console.log("Sidebar exits a Hero directly");
    await page.goto(base + "/library");
    await page
      .getByRole("heading", { name: "Components", exact: true })
      .waitFor();
    assert.equal(
      await page.locator('[data-element="cosmos-split-auth"]').count(),
      0,
    );
    const widths = await page
      .locator(".element-card[data-element]")
      .evaluateAll((cards) =>
        cards.map((card) => card.getBoundingClientRect().width),
      );
    assert.ok(widths.every((w) => w >= 279));
    const rows = await page
      .locator("aside .sidebar-link")
      .evaluateAll((rows) =>
        rows.map((row) => row.getBoundingClientRect().height),
      );
    assert.ok(rows.every((h) => h === 34));
    await shot("library");
    await page.getByRole("button", { name: "Back to main navigation" }).click();
    assert.equal(
      await page.locator('aside a[href="/pricing"] small').innerText(),
      "2",
    );
    assert.equal(
      await page.locator('aside a[href="/login"] small').innerText(),
      "1",
    );
    await page.locator('aside a[href="/login"]').click();
    await page.getByRole("heading", { name: "Login", exact: true }).waitFor();
    assert.equal(
      await page.locator('[data-element="cosmos-split-auth"]').count(),
      1,
    );
    console.log(
      "Sidebar rows/counts, grid minimum width and Login section passed",
    );
    await page.goto(
      base +
        "/library?element=ink-headline&config=" +
        encodeURIComponent(
          JSON.stringify({
            v: 1,
            id: "ink-headline",
            settings: { trigger: "manual", progress: 0.45 },
          }),
        ),
    );
    await page.locator(".ink-headline[data-ready=true]").waitFor();
    assert.match(
      await page.locator("[data-ink-unit]").first().getAttribute("style"),
      /url/,
    );
    await shot("ink-mid");
    await page
      .getByRole("slider", { name: "Manual progress", exact: true })
      .evaluate((input) => {
        Object.getOwnPropertyDescriptor(
          HTMLInputElement.prototype,
          "value",
        ).set.call(input, "1");
        input.dispatchEvent(new Event("input", { bubbles: true }));
        input.dispatchEvent(new Event("change", { bubbles: true }));
      });
    await page.waitForFunction(() =>
      [...document.querySelectorAll("[data-ink-unit]")].every(
        (node) => node.style.filter === "none",
      ),
    );
    console.log("Ink scrubbing removes heavy filters when dry");
    await page.goto(base + "/library?element=lumen-button");
    await page.locator(".lb-main .lumen-button[data-gl=on]").waitFor();
    await page.locator(".lb-main .lumen-button").click();
    assert.equal(await page.locator(".lb-main .lumen-button").getAttribute("data-status"),"success");
    assert.equal(await page.locator(".lb-studio").count(),0);
    await shot("lumen");
    console.log("Lumen real WebGL2 and direct success passed");
    await page.goto(base + "/library?element=titanium-card");
    await page.locator(".titanium-study[data-ready=true]").waitFor();
    await page
      .getByRole("button", { name: "Reveal number", exact: true })
      .click();
    await page.waitForTimeout(950);
    assert.equal(
      await page.locator(".ti-number span").textContent(),
      "4716 0381 9254 4242",
    );
    await page.getByRole("button", { name: "Flip 180°" }).click();
    await page.waitForTimeout(1100);
    assert.equal(
      await page.locator(".ti-back").getAttribute("aria-hidden"),
      "false",
    );
    await page.getByRole("button", { name: "Reveal security code" }).click();
    await page.waitForTimeout(900);
    assert.equal(
      await page.locator(".ti-signature button span").textContent(),
      "731",
    );
    await page.getByRole("button", { name: "Obsidian", exact: true }).click();
    await page.getByRole("button", { name: "Tap to Pay" }).click();
    await shot("titanium");
    console.log("Titanium flip, reveal, CVV, finish and NFC passed");
    for (const [path, selector] of [
      ["/library", ".element-grid"],
      ["/login", ".element-grid"],
      ["/library?element=ink-headline", ".ink-headline"],
      ["/library?element=lumen-button", ".lumen-showcase"],
      ["/library?element=titanium-card", ".titanium-study"],
      ["/hero?hero=zenith-beam", ".zenith-hero"],
    ]) {
      await page.setViewportSize({ width: 320, height: 844 });
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.goto(base + path);
      await page.locator(selector).waitFor();
      assert.ok(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
        "overflow " + path,
      );
      await shot("mobile-" + selector.slice(1));
      console.log("320px / reduced motion " + selector);
    }
    await page.setViewportSize({width:1440,height:1000});await page.emulateMedia({reducedMotion:'no-preference'});
    await page.goto(base+'/library?group=buttons');await page.locator('[data-element="lumen-button"] .card-title').click();await page.locator('.lumen-showcase').waitFor();await page.getByRole('button',{name:'Next component',exact:true}).click();await page.getByRole('button',{name:'Library',exact:true}).click();await page.waitForFunction(()=>!new URL(location.href).searchParams.has('element'));assert.equal(new URL(page.url()).searchParams.get('group'),'buttons');await page.getByRole('button',{name:'Back to main navigation'}).click();await page.locator('aside').getByRole('link',{name:'Docs',exact:true}).click();await page.waitForURL(base+'/docs');console.log('Component pagination returns to its category; sidebar exits to Docs');
    for(const [id,selector] of [['ink-headline','.ink-headline'],['lumen-button','.lumen-showcase'],['titanium-card','.titanium-study']]){
      await page.goto(base+'/library?element='+id);await page.locator(selector+'[data-ready=true],'+selector+' [data-ready=true]').first().waitFor();await page.locator(selector).evaluate(root=>{for(const link of document.querySelectorAll('link[rel=stylesheet]'))link.remove();Object.assign(root.style,{position:'fixed',left:'0',top:'0',width:'900px',height:'700px',zIndex:'999999'});});await page.waitForTimeout(500);assert.ok((await page.locator(selector).boundingBox()).width>=899);await shot('standalone-'+id);console.log('Own CSS retained without site styles: '+id);
    }
    assert.deepEqual(errors, []);
    console.log("No JavaScript or shader errors");
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
