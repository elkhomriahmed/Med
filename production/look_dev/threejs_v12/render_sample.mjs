// Render the three.js sample headless: node render_sample.mjs OUTDIR [scale] [t1,t2,...]  (no times = every frame at 30 fps)
import { createRequire } from "module"; import fs from "fs"; import { execSync } from "child_process";
const { chromium } = createRequire(import.meta.url)(execSync("npm root -g").toString().trim() + "/playwright");
const [out, scale = "1", times] = process.argv.slice(2); fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch({ args: ["--no-proxy-server", "--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const p = await b.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
p.on("pageerror", (e) => console.log("PAGEERR", e.message)); p.on("console", (m) => { if (m.type() === "error") console.log("PAGE", m.text().slice(0, 300)); });
const t0 = Date.now(); await p.goto(`http://127.0.0.1:8765/sample.html?scale=${scale}`);
await p.waitForFunction(() => window.__ready, null, { timeout: 600000 }); console.log("LOAD_S", ((Date.now() - t0) / 1000).toFixed(1));
const list = times ? times.split(",").map(Number) : Array.from({ length: Math.round(7.3 * 30) }, (_, i) => i / 30);
const ts = Date.now();
for (let i = 0; i < list.length; i++) {
  await p.evaluate((t) => window.renderAt(t), list[i]);
  const data = await p.evaluate(() => document.querySelector("canvas").toDataURL("image/png"));
  fs.writeFileSync(`${out}/f_${String(i + 1).padStart(4, "0")}.png`, Buffer.from(data.split(",")[1], "base64"));
  if (i % 20 === 0) console.log("FRAME", i + 1, "/", list.length, ((Date.now() - ts) / 1000 / (i + 1)).toFixed(2), "s/frame");
}
console.log("DONE", list.length, "frames", ((Date.now() - ts) / 1000).toFixed(1), "s", ((Date.now() - ts) / 1000 / list.length).toFixed(2), "s/frame");
await b.close();
