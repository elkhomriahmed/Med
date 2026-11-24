// Batch stills (bundle once): node world/lot/test/stills.mjs [Id ...]   (run from production/kit)
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import path from "node:path";
const ids = process.argv.slice(2);
const serveUrl = await bundle({ entryPoint: path.resolve("world/lot/test/index.js") });
for (const id of ids) {
  const t0 = Date.now();
  const composition = await selectComposition({ serveUrl, id, chromiumOptions: { gl: "angle" }, timeoutInMilliseconds: 300000 });
  const out = path.resolve("world/lot/out", `${id}.png`);
  await renderStill({ serveUrl, composition, output: out, chromiumOptions: { gl: "angle" }, timeoutInMilliseconds: 300000,
    onBrowserLog: (l) => { if (/\[lot\]|rror/.test(l.text)) console.log(l.text.slice(0, 300)); } });
  console.log(id, "->", out, ((Date.now() - t0) / 1000).toFixed(1) + " s");
}
