const { chromium } = require(process.env.MOTIQO_PLAYWRIGHT || "playwright"),
  fs = require("node:fs"),
  crypto = require("node:crypto"),
  sharp = require("sharp");
const base = process.env.MOTIQO_URL || "http://localhost:3014";
(async () => {
  const { previewRevisions } = await import("./preview-revisions.mjs");
  const revisions = previewRevisions(),
    manifest = require("../registry/manifest.json"),
    registry = require("../registry/previews.json");
  const browser = await chromium.launch({
    headless: true,
    args: ["--enable-unsafe-swiftshader"],
  });
  const errors = [];
  try {
    const page = await browser.newPage({
      viewport: { width: 400, height: 300 },
      deviceScaleFactor: 1,
    });
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => {
      if (m.type() === "error" && /WebGLProgram|shader error/i.test(m.text()))
        errors.push(m.text());
    });
    page.setDefaultNavigationTimeout(60000);
    async function navigate(url) {
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          await page.goto(url, { waitUntil: "domcontentloaded" });
          return;
        } catch (error) {
          if (attempt === 2 || !String(error).includes("ERR_ABORTED"))
            throw error;
          await page.waitForTimeout(300);
        }
      }
    }
    const items = { ...registry.items };
    fs.mkdirSync("screenshots/posters", { recursive: true });
    for (const item of manifest.items) {
      if (items[item.id]?.sourceHash === revisions[item.id]) continue;
      const result = { sourceHash: revisions[item.id] };
      for (const theme of ["dark", "light"]) {
        await navigate(
          `${base}/preview-capture/${item.id}?theme=${theme}&frame=card`,
        );
        await page
          .locator("[data-testid=poster-surface][data-ready=true]")
          .waitFor({ timeout: 60000 });
        const bytes = await page
          .locator("[data-testid=poster-surface]")
          .screenshot();
        fs.writeFileSync(`screenshots/posters/${item.id}-${theme}.png`, bytes);
        const webp = await sharp(bytes).webp({ quality: 88 }).toBuffer(),
          hash = crypto
            .createHash("sha256")
            .update(webp)
            .digest("hex")
            .slice(0, 12),
          name = `${item.id}-${theme}-${hash}.webp`;
        fs.writeFileSync(`public/previews/${name}`, webp);
        result[theme] = `/previews/${name}`;
      }
      items[item.id] = result;
      fs.writeFileSync(
        `screenshots/posters/${item.id}.json`,
        JSON.stringify({ sourceHash: revisions[item.id] }),
      );
      fs.writeFileSync(
        "registry/previews.json",
        JSON.stringify(
          { ...registry, schemaVersion: 2, width: 400, height: 300, items },
          null,
          2,
        ) + "\n",
      );
      console.log("Captured", item.id);
    }
    console.log(
      JSON.stringify({ posterEntries: Object.keys(items).length, errors }),
    );
    if (errors.length) process.exitCode = 1;
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
