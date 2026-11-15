// Render the three.js v12 frame headless and save PNG + timing.  node render.mjs SERVE_ROOT OUT.png "query"
import { createRequire } from "module"; const { chromium } = createRequire(import.meta.url)("/opt/node22/lib/node_modules/playwright");
import fs from "fs";
const [root, out, q] = process.argv.slice(2);
const browser = await chromium.launch({ args: ["--no-proxy-server", "--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
page.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") console.log("PAGE", m.type(), m.text().slice(0, 300)); });
page.on("pageerror", (e) => console.log("PAGEERR", e.message));
const t0 = Date.now();
await page.goto(`http://127.0.0.1:8765/index.html?${q || ""}`);
await page.waitForFunction(() => window.__done, null, { timeout: 600000 });
const done = await page.evaluate(() => window.__done);
const data = await page.evaluate(() => document.querySelector("canvas").toDataURL("image/png"));
fs.writeFileSync(out, Buffer.from(data.split(",")[1], "base64"));
console.log("FRAME_MS", JSON.stringify(done.ms.map((x) => Math.round(x))), "TOTAL_S", ((Date.now() - t0) / 1000).toFixed(1));
await browser.close();
