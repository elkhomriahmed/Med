// Batch stills (bundle once): node world/car/test/stills.mjs [Id ...]   (run from production/kit)
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import path from "node:path";

const ids = process.argv.slice(2);
const entry = path.resolve("world/car/test/index.js");
const serveUrl = await bundle({ entryPoint: entry });
const all = ["CarInterior", "CarFront34", "CarExt", "CarRear", "Windshield", "SideWindow", "SeatSmoke", "SeatRing", "WindshieldRing", "FireBurst", "FireDoor", "OptRays", "OptFocus", "OptMelt"];
for (const id of ids.length ? ids : all) {
  const t0 = Date.now();
  const composition = await selectComposition({ serveUrl, id, chromiumOptions: { gl: "angle" }, timeoutInMilliseconds: 300000 });
  const out = path.resolve(id.startsWith("Opt") ? "world/fx_v04/out" : "world/car/out", `${id}.png`);
  await renderStill({ serveUrl, composition, output: out, chromiumOptions: { gl: "angle" }, timeoutInMilliseconds: 300000,
    onBrowserLog: (l) => { if (/CARTIME|rror/.test(l.text)) console.log(l.text); } });
  console.log(id, "->", out, ((Date.now() - t0) / 1000).toFixed(1) + " s");
}
