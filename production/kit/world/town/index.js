// World kit: the harbour town across the water from the lighthouse (Video 1, shot 21; LAYOUT_v01.md).
// Square centred at world (40, -33, 300), stone quay edge at z = 280 facing the lighthouse (-Z), ground (quay top) y = -33.
// No sea and no sky here (exterior agent owns them); the quay wall runs down to y = -36 so it meets the shared sea (y = -34).
//
//   const town = await buildTown();  scene.add(town.group);
//   town.setTime("night" | "dusk" | "day" | "morning" | "winter");   // per frame, no rebuild (lights, windows, lamps, snow)
//   town.update(t, camera);                                         // boats bob (deterministic in t)
//   town.anchors.{ square, quayEdge, signGossip, crowdCenter, keyLightPos, spots: {fisher, baker, lady, kid, extra},
//                  views: { fromWater, crowdWide, twoShot, signs } }   // views = { pos, target, fov } (world, vertical fov deg)
//   town.lights = { key, hemi, lamps: [PointLight, PointLight] }; town.keyDir (world unit vector toward the key source)
import * as THREE from "three";
import { roundedBox, boxUV, grainUV, tint, clean, mergeGeometries, lathe, extrude, place } from "../geometry.js";
import { pbr, plain, canvasTex, plateTexture } from "../materials.js";
import { prop } from "../props.js";
import { rng } from "../../shared/assets.js";

export const TOWN_ORIGIN = new THREE.Vector3(40, -33, 300);
const C = (h) => new THREE.Color(h);

// Times of day. dir = unit vector from the town toward the key source (matches the sky presets' sunDir where they exist).
export const TOWN_TIMES = {
  night:   { dir: [-0.55, 0.32, -0.77], key: "#9db2ff", keyI: 1.1, sky: "#22306a", ground: "#0c0a08", hemiI: 0.55, win: 2.4, lamp: 4.0, pt: 30, snow: false },
  dusk:    { dir: [-0.40, 0.16, -0.90], key: "#ff9858", keyI: 2.4, sky: "#6a5c96", ground: "#3a2418", hemiI: 0.75, win: 1.4, lamp: 2.4, pt: 14, snow: false },
  morning: { dir: [0.75, 0.28, -0.60], key: "#ffc890", keyI: 2.6, sky: "#9ab4e0", ground: "#5a4a38", hemiI: 0.8, win: 0, lamp: 0, pt: 0, snow: false },
  day:     { dir: [0.30, 0.60, -0.70], key: "#fff0d8", keyI: 3.6, sky: "#b8d0ff", ground: "#86705a", hemiI: 0.9, win: 0, lamp: 0, pt: 0, snow: false },
  winter:  { dir: [0.28, 0.50, -0.82], key: "#dce6ff", keyI: 1.7, sky: "#b4c4dc", ground: "#d8e2ee", hemiI: 1.15, win: 0.55, lamp: 0.8, pt: 4, snow: true },
};

// Back-row houses (fronts on z = +12, facing the quay). Signs sit in the middle so one view reads all four.
const ROW = [
  { w: 4.4, h: 7.0, rh: 2.2, wall: "#e9a3a0", roof: "#a8442c", shut: "#3d6f86", timber: false },
  { w: 4.6, h: 6.2, rh: 2.4, wall: "#e86a4c", roof: "#7a3324", shut: "#2f5f7a", sign: ["FISH", "#2f6f8f", "#f6ecd4"], awn: ["#f4efe6", "#2f6f8f"] },
  { w: 5.0, h: 6.4, rh: 2.3, wall: "#f3c95c", roof: "#94402a", shut: "#7a3a1e", sign: ["BAKERY", "#f2dca6", "#5a2e12"], awn: ["#f4efe6", "#c4472c"] },
  { w: 5.4, h: 6.8, rh: 2.5, wall: "#f0e6d2", roof: "#5e5a66", shut: "#2e5a3a", timber: true, sign: ["TAVERN", "#3b2a1c", "#e8b24a"], awn: ["#efe2c4", "#2e5a3a"] },
  { w: 4.8, h: 6.2, rh: 2.3, wall: "#9fcc8c", roof: "#a8442c", shut: "#b0485a", sign: ["GOSSIP & TEA", "#d97a8c", "#fff4e6"], awn: ["#fff4e6", "#d97a8c"] },
  { w: 4.4, h: 7.2, rh: 2.2, wall: "#7fb4c4", roof: "#7a3324", shut: "#f0e6d2", timber: false },
];

/** Warm window interior (emissive at night): lamp-lit gradient, curtains, a little silhouette shelf. */
function interiorTex() {
  return canvasTex(128, 160, (g, w, h) => {
    const gr = g.createRadialGradient(w * 0.5, h * 0.35, 5, w * 0.5, h * 0.4, h * 0.75);
    gr.addColorStop(0, "#ffe2a0"); gr.addColorStop(0.55, "#f0a050"); gr.addColorStop(1, "#8a4420");
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.fillStyle = "rgba(120,30,20,0.85)"; g.fillRect(0, 0, w * 0.2, h); g.fillRect(w * 0.8, 0, w * 0.2, h);   // curtains
    g.fillStyle = "rgba(70,30,15,0.7)"; g.fillRect(w * 0.2, h * 0.78, w * 0.6, h * 0.05);                     // shelf
    g.fillRect(w * 0.3, h * 0.66, w * 0.08, h * 0.12); g.fillRect(w * 0.58, h * 0.7, w * 0.12, h * 0.08);
  });
}
function stripeTex(a, b, n = 4) {
  const t = canvasTex(256, 32, (g, w, h) => { for (let i = 0; i < n * 2; i++) { g.fillStyle = i % 2 ? b : a; g.fillRect((i * w) / (n * 2), 0, w / (n * 2) + 1, h); } });
  t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}

/** Remap lathe UVs to world metres (u around the circumference at radius rr, v along the profile). */
function latheUV(g, rr, len, tile) {
  const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * (Math.PI * 2 * rr) / tile, uv.getY(i) * len / tile); return g;
}

export async function buildTown(opts = {}) {
  const r = rng(opts.seed ?? 31);
  const group = new THREE.Group(); group.name = "town"; group.position.copy(TOWN_ORIGIN);

  // ---------- materials (one per bucket; everything in a bucket is merged into one mesh) ----------
  const M = {
    plaster: await pbr("plaster", { normalScale: 1.4 }),
    timber: await pbr("wood", { normalScale: 1.4 }),
    planks: await pbr("darkPlanks", { normalScale: 1.4 }),
    roof: await pbr("clay_roof_tiles_02", { normalScale: 1.8 }),
    stone: await pbr("stacked_stone_wall", { normalScale: 1.6 }),
    cobble: await pbr("cobblestone_floor_04", { normalScale: 1.7, vertexColors: false, color: [0.95, 0.9, 0.84] }),
    grass: await pbr("aerial_grass_rock", { normalScale: 1.4, vertexColors: false, color: [0.55, 0.68, 0.42] }),
    snow: await pbr("snow_02", { normalScale: 0.9, color: [1.0, 1.02, 1.08], envMapIntensity: 0.8 }),
    metal: plain("#2b3a34", { roughness: 0.45, metalness: 0.6, relief: 0.35, vertexColors: true }),
    paint: plain("#ffffff", { roughness: 0.55, relief: 0.3, vertexColors: true, side: THREE.DoubleSide }),
    cloth: plain("#ffffff", { roughness: 0.85, relief: 0.15, vertexColors: true, side: THREE.DoubleSide }),
    rope: plain("#8a7050", { roughness: 0.9, relief: 0.2 }),
    water: plain("#0b1a20", { roughness: 0.15, relief: 0.2 }),
  };
  const itx = interiorTex();
  M.winLit = new THREE.MeshStandardMaterial({ map: itx, emissiveMap: itx, emissive: C("#ffffff"), emissiveIntensity: 0, color: C("#3a4656"), roughness: 0.12, metalness: 0.1, envMapIntensity: 1.2 });
  M.winDark = new THREE.MeshStandardMaterial({ map: itx, color: C("#3a4656"), roughness: 0.12, metalness: 0.1, envMapIntensity: 1.2 });
  M.lampGlass = new THREE.MeshStandardMaterial({ color: C("#fff1c8"), emissive: C("#ffc36a"), emissiveIntensity: 0, roughness: 0.2 });
  const B = Object.fromEntries(Object.keys(M).map((k) => [k, []]));
  const extra = [];                              // special meshes (signs, awnings) already in town-local space
  const add = (k, g) => { B[k].push(g); return g; };

  // UV + tone helper: geometry in its own space -> uv (box/grain/keep) -> tint -> place.
  const piece = (k, g, pos, rot = [0, 0, 0], { uv = "box", tile = 1.5, swap = false, color = 0xffffff, jitter = 0 } = {}) => {
    if (uv === "box") boxUV(g, tile, [r() * 7, r() * 7], swap); else if (uv === "grain") grainUV(g, tile, [r() * 7, r() * 7]);
    const c = C(color); if (jitter) c.multiplyScalar(1 - jitter / 2 + r() * jitter);
    tint(g, c); place(g, pos, Array.isArray(rot) ? rot : [0, 0, 0]); return add(k, g);
  };

  // ---------- ground: land block with the quay wall, cobbled square, quay slabs, terrace + hill behind ----------
  piece("stone", roundedBox(70, 3.0, 72, 0.08), [0, -1.55, 16], [0, 0, 0], { tile: 2.6, color: "#a39a8e" });     // land block (front face = quay wall, z = -20)
  { const g = new THREE.PlaneGeometry(70, 66.7); g.rotateX(-Math.PI / 2); g.translate(0, 0.0, 16.65); boxUV(g, 2.6); add("cobble", g); } // z -17..50
  for (let x = -34.5; x < 34.5; x += 1.15) {                                                                      // quay coping slabs
    const w = 1.1, d = 2.95; const g = roundedBox(w, 0.32, d, 0.045); piece("stone", g, [x + w / 2 + 0.02, -0.16 + 0.004 * (r() - 0.5), -18.52], [0, 0, 0], { tile: 1.8, color: "#c4bcb0", jitter: 0.16 });
  }
  { const g = roundedBox(70, 2.56, 31, 0.1); piece("stone", g, [0, 0.7, 39.5], [0, 0, 0], { tile: 2.6, color: "#a9a091" }); }   // terrace z 24..30, top y 2.0
  { const g = new THREE.PlaneGeometry(70, 31); g.rotateX(-Math.PI / 2); g.translate(0, 2.0, 39.52); boxUV(g, 2.6); add("cobble", g); }
  { // grass banks beside the town (rising out of the sea) + a hill behind it; hidden under the town footprint
    const g = new THREE.PlaneGeometry(220, 180, 44, 36); g.rotateX(-Math.PI / 2); const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i) + 80, ax = Math.abs(x);
      const side = THREE.MathUtils.smoothstep(-ax, -100, -62), front = THREE.MathUtils.smoothstep(z, -24, -6);
      const k = THREE.MathUtils.smoothstep(z, 56, 150);
      let y = -5 + 6.5 * side * front + side * k * (16 + Math.sin(x * 0.045) * 4 + Math.sin(x * 0.11 + z * 0.06) * 1.6);
      if (ax <= 35.01 && z <= 55.01) y = -0.5;
      p.setY(i, y); p.setZ(i, z); }
    g.computeVertexNormals(); boxUV(g, 7); add("grass", g);
  }

  // ---------- houses ----------
  // House frame: front-centre at the origin on the ground, front faces -Z, body runs to +Z by d.
  const house = (H, x, z, rotY = 0, yBase = 0, detail = true) => {
    const parts = [], meshes = [], d = H.d ?? 7, w = H.w, h = H.h, rh = H.rh;
    const P = (k, g, pos, rot, o) => { const gg = g; parts.push([k, gg]); rot = Array.isArray(rot) ? rot : [0, 0, 0]; if (o?.uv === "keep") { tint(gg, C(o.color ?? 0xffffff)); place(gg, pos, rot); return; }
      if ((o?.uv ?? "box") === "box") boxUV(gg, o?.tile ?? 1.5, [r() * 7, r() * 7], o?.swap); else grainUV(gg, o?.tile ?? 1.2, [r() * 7, r() * 7]);
      const c = C(o?.color ?? 0xffffff); if (o?.jitter) c.multiplyScalar(1 - o.jitter / 2 + r() * o.jitter); tint(gg, c); place(gg, pos, rot); };
    // body: gable-front pentagon, bevelled
    const s = new THREE.Shape(); s.moveTo(-w / 2, 0); s.lineTo(w / 2, 0); s.lineTo(w / 2, h); s.lineTo(0, h + rh); s.lineTo(-w / 2, h); s.closePath();
    const body = extrude(s, d - 0.08, 0.04, 1); body.translate(0, 0, d / 2); P("plaster", body, [0, 0, 0], [0, 0, 0], { tile: 2.2, color: H.wall, jitter: 0.06 });
    // roof slabs (tiles run across the slope), ridge, chimney, snow caps
    const a = Math.atan2(rh, w / 2), L = Math.hypot(w / 2, rh) + 0.42, th = 0.16, ridge = new THREE.Vector2(0, h + rh);
    for (const sx of [-1, 1]) {
      const u = new THREE.Vector2(sx * Math.cos(a), -Math.sin(a)), n = new THREE.Vector2(sx * Math.sin(a), Math.cos(a));
      const c = ridge.clone().addScaledVector(u, L / 2 - 0.06).addScaledVector(n, th / 2 + 0.02);
      P("roof", roundedBox(L, th, d + 0.7, 0.04, 2), [c.x, c.y, d / 2], [0, 0, -sx * a], { tile: 1.6, swap: true, color: H.roof, jitter: 0.08 });
      const cs = ridge.clone().addScaledVector(u, L / 2 - 0.02).addScaledVector(n, th + 0.09);
      P("snow", roundedBox(L - 0.02, 0.14, d + 0.62, 0.06, 2), [cs.x, cs.y, d / 2], [0, 0, -sx * a], { tile: 1.4 });
    }
    { const g = new THREE.CylinderGeometry(0.13, 0.13, d + 0.75, 10); g.rotateX(Math.PI / 2); P("roof", g, [0, h + rh + 0.2, d / 2], [0, 0, 0], { tile: 1, color: H.roof }); }
    { const cx = w * 0.24, cy = h + rh * 0.5 + 0.7, cz = d * 0.62;
      P("stone", roundedBox(0.62, 2.0, 0.62, 0.04), [cx, cy, cz], [0, 0, 0], { tile: 1.2, color: "#b8aa9a" });
      P("stone", roundedBox(0.78, 0.14, 0.78, 0.03), [cx, cy + 1.05, cz], [0, 0, 0], { tile: 1.2, color: "#8a8076" });
      P("snow", roundedBox(0.8, 0.1, 0.8, 0.04), [cx, cy + 1.16, cz], [0, 0, 0], { tile: 1 }); }
    // stone plinth
    P("stone", roundedBox(w + 0.1, 0.3, 0.16, 0.03), [0, 0.15, -0.06], [0, 0, 0], { tile: 1.6, color: "#a89c8e" });
    const FZ = -0.04;                                         // facade plane
    const shopH = H.sign ? 3.9 : 3.2;
    // windows: glass (uv 0..1), timber frame, mullions, sill, painted shutters
    const win = (wx, wy, ww, wh, shutters = true) => {
      const lit = r() < 0.7; const g = new THREE.BoxGeometry(ww, wh, 0.03); P(lit ? "winLit" : "winDark", g, [wx, wy, FZ - 0.02], [0, 0, 0], { uv: "keep" });
      const fc = "#5a3b26";
      P("timber", roundedBox(ww + 0.2, 0.1, 0.12, 0.02), [wx, wy + wh / 2 + 0.05, FZ - 0.05], 0, { uv: "grain", color: fc });
      P("timber", roundedBox(0.1, wh, 0.12, 0.02), [wx - ww / 2 - 0.05, wy, FZ - 0.05], 0, { uv: "grain", color: fc });
      P("timber", roundedBox(0.1, wh, 0.12, 0.02), [wx + ww / 2 + 0.05, wy, FZ - 0.05], 0, { uv: "grain", color: fc });
      P("timber", roundedBox(0.045, wh, 0.06, 0.01), [wx, wy, FZ - 0.05], 0, { uv: "grain", color: "#f0e8d8" });
      P("timber", roundedBox(ww, 0.045, 0.06, 0.01), [wx, wy + wh * 0.12, FZ - 0.05], 0, { uv: "grain", color: "#f0e8d8" });
      P("stone", roundedBox(ww + 0.34, 0.09, 0.24, 0.02), [wx, wy - wh / 2 - 0.05, FZ - 0.1], 0, { tile: 1, color: "#d8d0c4" });
      P("snow", roundedBox(ww + 0.3, 0.05, 0.2, 0.02), [wx, wy - wh / 2 + 0.015, FZ - 0.11], 0, { tile: 1 });
      if (shutters) for (const sx of [-1, 1]) {
        const sw = ww * 0.5; P("planks", roundedBox(sw, wh + 0.04, 0.05, 0.012), [wx + sx * (ww / 2 + 0.1 + sw / 2), wy, FZ - 0.03], 0, { tile: 1.2, color: H.shut, jitter: 0.05 });
      }
    };
    // door
    const door = (dx) => {
      P("planks", roundedBox(1.0, 2.05, 0.08, 0.015), [dx, 0.3 + 1.025, FZ - 0.02], 0, { tile: 1.4, color: H.shut, jitter: 0.04 });
      P("timber", roundedBox(1.3, 0.14, 0.16, 0.02), [dx, 2.42, FZ - 0.06], 0, { uv: "grain", color: "#4a3020" });
      for (const sx of [-1, 1]) P("timber", roundedBox(0.14, 2.12, 0.16, 0.02), [dx + sx * 0.58, 0.3 + 1.06, FZ - 0.06], 0, { uv: "grain", color: "#4a3020" });
      P("stone", roundedBox(1.5, 0.3, 0.55, 0.03), [dx, 0.15, FZ - 0.3], 0, { tile: 1.2, color: "#b0a698" });
      P("metal", new THREE.SphereGeometry(0.04, 10, 8), [dx + 0.35, 1.3, FZ - 0.1], 0, { tile: 1, color: "#c8a050" });
    };
    if (H.sign) {
      const dx = -w / 2 + 0.95; door(dx);
      const sx0 = dx + 0.75, sx1 = w / 2 - 0.35, sw = sx1 - sx0, scx = (sx0 + sx1) / 2;
      win(scx, 1.65, sw - 0.3, 1.5, false);                   // shop window
      // awning (striped canvas) + valance
      const am = new THREE.MeshStandardMaterial({ map: stripeTex(H.awn[0], H.awn[1]), roughness: 0.85, side: THREE.DoubleSide });
      am.map.repeat.set(1, 1);
      const ag = roundedBox(sw + 0.2, 0.04, 1.25, 0.015); boxUV(ag, 1.0); place(ag, [scx, 2.7, -0.62], [-0.34, 0, 0]);
      const vg = roundedBox(sw + 0.2, 0.26, 0.03, 0.01); boxUV(vg, 1.0); place(vg, [scx, 2.38, -1.22], [0, 0, 0]);
      const am2 = new THREE.Mesh(mergeGeometries([clean(ag), clean(vg)]), am); am2.castShadow = am2.receiveShadow = true; meshes.push(am2);
            for (const sx of [-1, 1]) P("metal", new THREE.CylinderGeometry(0.018, 0.018, 1.3, 6), [scx + sx * (sw / 2), 2.54, -0.6], [-1.23, 0, 0], { tile: 1, color: "#2a2a2a" });
      // painted sign board in a bevelled timber frame (text on the front face only)
      const [txt, bg, ink] = H.sign, bw = Math.min(w - 0.5, 0.42 * txt.length + 0.9), bh = 0.68, by = 3.4;
      const tex = plateTexture([[txt, 0.56]], { w: Math.round(320 * bw / bh), h: 320, bg, ink, font: "Arial Black" });
      const tm = M.planks, sm = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6 });
      const sb = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, 0.05), [tm, tm, tm, tm, tm, sm]);
      sb.position.set(0, by, FZ - 0.06); sb.castShadow = sb.receiveShadow = true; meshes.push(sb);
      tint(sb.geometry, C("#4a3020"));
      P("timber", roundedBox(bw + 0.16, 0.08, 0.1, 0.02), [0, by + bh / 2 + 0.04, FZ - 0.07], 0, { uv: "grain", color: "#4a3020" });
      P("timber", roundedBox(bw + 0.16, 0.08, 0.1, 0.02), [0, by - bh / 2 - 0.04, FZ - 0.07], 0, { uv: "grain", color: "#4a3020" });
      for (const sx of [-1, 1]) P("timber", roundedBox(0.08, bh, 0.1, 0.02), [sx * (bw / 2 + 0.04), by, FZ - 0.07], 0, { uv: "grain", color: "#4a3020" });
      P("snow", roundedBox(bw + 0.14, 0.05, 0.08, 0.02), [0, by + bh / 2 + 0.105, FZ - 0.07], 0, { tile: 1 });
    } else {
      door(0); if (detail) { win(-w * 0.3, 1.7, 0.8, 1.1); win(w * 0.3, 1.7, 0.8, 1.1); }
    }
    // upper floor(s)
    const up0 = shopH + 0.25; let fy = up0 + 0.85;
    while (fy + 0.6 < h + rh * 0.35) {
      const single = fy > h - 0.3;
      if (single) win(0, fy, 0.65, 0.85, false);
      else if (detail || true) { win(-w * 0.26, fy, 0.75, 1.05); win(w * 0.26, fy, 0.75, 1.05); }
      fy += 2.1;
    }
    // half-timbering / floor band
    if (H.timber) {
      const tc = "#4a3020";
      P("timber", roundedBox(w + 0.04, 0.18, 0.1, 0.02), [0, shopH + 0.05, FZ - 0.04], 0, { uv: "grain", color: tc });
      P("timber", roundedBox(w + 0.04, 0.16, 0.1, 0.02), [0, h - 0.05, FZ - 0.04], 0, { uv: "grain", color: tc });
      for (const sx of [-1, 1]) P("timber", roundedBox(0.18, h - shopH, 0.1, 0.02), [sx * (w / 2 - 0.09), (shopH + h) / 2, FZ - 0.04], 0, { uv: "grain", color: tc });
      for (const sx of [-1, 1]) { const len = Math.hypot(w * 0.18, h - shopH - 0.3);
        P("timber", roundedBox(0.14, len, 0.08, 0.02), [sx * (w / 2 - 0.3), (shopH + h) / 2, FZ - 0.03], [0, 0, sx * Math.atan2(w * 0.18, h - shopH - 0.3) * 0.9], { uv: "grain", color: tc }); }
    } else {
      P("stone", roundedBox(w + 0.06, 0.14, 0.1, 0.02), [0, shopH + 0.05, FZ - 0.03], 0, { tile: 1.4, color: "#efe8dc" });
      P("stone", roundedBox(w + 0.06, 0.12, 0.1, 0.02), [0, h - 0.04, FZ - 0.03], 0, { tile: 1.4, color: "#efe8dc" });
    }
    // to town space
    const Mx = new THREE.Matrix4().makeRotationY(rotY).setPosition(x, yBase, z);
    for (const [k, g] of parts) { g.applyMatrix4(Mx); add(k, g); }
    for (const m of meshes) { m.applyMatrix4(Mx); extra.push(m); }
    return Mx;
  };

  // back row (fronts at z = 12)
  const gap = 0.16, total = ROW.reduce((s, H) => s + H.w, 0) + gap * (ROW.length - 1);
  let cx = -total / 2; const signAt = {};
  for (const H of ROW) { const x = cx + H.w / 2; house(H, x, 12); if (H.sign) signAt[H.sign[0]] = new THREE.Vector3(x, 3.4, 11.85); cx += H.w + gap; }
  // side rows (left faces +X, right faces -X), leaving the quay corners open
  const SIDE = [
    { w: 4.6, h: 6.0, rh: 2.2, wall: "#f2d4a8", roof: "#94402a", shut: "#3d6f86" },
    { w: 4.2, h: 6.6, rh: 2.0, wall: "#c9dbe0", roof: "#5e5a66", shut: "#a8442c", timber: true },
    { w: 4.8, h: 5.8, rh: 2.4, wall: "#e9b98c", roof: "#7a3324", shut: "#2e5a3a" },
  ];
  SIDE.forEach((H, i) => house({ ...H, d: 6 }, -17.0, -6 + i * 5.0, -Math.PI / 2));
  SIDE.forEach((H, i) => house({ ...SIDE[(i + 1) % 3], wall: ["#b9d7a8", "#f4e3c0", "#e8a090"][i], d: 6 }, 17.0, -1 + i * 5.0, Math.PI / 2));
  // second row on the terrace (skyline), simpler
  const BACK = ["#f0e2c8", "#e48a6a", "#a8c8d8", "#f3d27a", "#d9b8d0", "#c8dcb0", "#efc8a0"];
  BACK.forEach((wall, i) => house({ w: 4.6 + r() * 1.2, h: 6.5 + r() * 2.2, rh: 2.2 + r() * 0.6, wall, roof: ["#a8442c", "#7a3324", "#5e5a66"][i % 3], shut: "#3d5a6a", d: 6 },
    -16.5 + i * 5.6, 26, 0, 2.0, false));
  // church on the terrace: stone tower with a pointed roof (landmark on the skyline)
  { const tx = 23, tz = 31;
    piece("stone", roundedBox(4, 15, 4, 0.08), [tx, 2 + 7.5, tz], 0, { tile: 2.2, color: "#cfc6b8" });
    piece("stone", roundedBox(4.4, 0.4, 4.4, 0.06), [tx, 2 + 15.1, tz], 0, { tile: 2.2, color: "#a99e90" });
    const cone = new THREE.ConeGeometry(3.1, 6, 4, 1); cone.rotateY(Math.PI / 4); piece("roof", cone, [tx, 2 + 18.3, tz], 0, { tile: 1.6, swap: true, color: "#5e5a66" });
    const sc = new THREE.ConeGeometry(3.25, 1.6, 4, 1, true); sc.rotateY(Math.PI / 4); piece("snow", sc, [tx, 2 + 20.55, tz], 0, { tile: 1 });
    const bell = new THREE.BoxGeometry(1.2, 1.8, 0.05); piece("winDark", bell, [tx, 2 + 12.8, tz - 2.03], 0, { uv: "keep" });
    house({ w: 7, h: 6, rh: 3.5, wall: "#e8e0d0", roof: "#5e5a66", shut: "#3d5a6a", d: 10 }, tx, tz + 2, 0, 2.0, false); }

  // ---------- square furniture ----------
  // well (stone ring, water, two posts, little tiled roof, winch)
  const wellAt = [-9, 0, 1.5];
  { const prof = [[0.72, 0], [0.98, 0], [1.02, 0.06], [1.02, 0.78], [0.96, 0.88], [0.78, 0.88], [0.72, 0.8], [0.72, 0]];
    const g = latheUV(lathe(prof, 36), 1.0, 2.6, 1.3); piece("stone", g, wellAt, 0, { uv: "keep", color: "#b4a898" });
    const wtr = new THREE.CircleGeometry(0.74, 24); wtr.rotateX(-Math.PI / 2); piece("water", wtr, [wellAt[0], 0.55, wellAt[2]], 0, { uv: "keep" });
    for (const sz of [-1, 1]) piece("timber", roundedBox(0.14, 3.1, 0.14, 0.03), [wellAt[0], 1.55, wellAt[2] + sz * 0.86], 0, { uv: "grain", color: "#5a3b26" });
    const wc = new THREE.CylinderGeometry(0.1, 0.1, 1.9, 12); wc.rotateX(Math.PI / 2); piece("timber", wc, [wellAt[0], 1.95, wellAt[2]], 0, { uv: "grain", color: "#6a4a30" });
    const ra = Math.atan2(0.55, 0.9), rl = Math.hypot(0.9, 0.55) + 0.25;
    for (const sx of [-1, 1]) {
      piece("roof", roundedBox(rl, 0.1, 2.3, 0.03), [wellAt[0] + sx * 0.56, 2.86, wellAt[2]], [0, 0, -sx * ra], { tile: 1.2, swap: true, color: "#94402a" });
      piece("snow", roundedBox(rl - 0.05, 0.1, 2.24, 0.04), [wellAt[0] + sx * (0.56 + 0.1 * Math.sin(ra)), 2.86 + 0.1 * Math.cos(ra), wellAt[2]], [0, 0, -sx * ra], { tile: 1 }); }
  }
  // lamp posts (two of them carry the warm point lights near the crowd)
  const lampSpots = [[-5.5, -15.6], [6.0, -15.6], [-12.5, 7.5], [12.5, 7.5], [-14.5, -10], [14.5, -10]];
  const lampHeads = [];
  for (const [lx, lz] of lampSpots) {
    const post = lathe([[0, 0], [0.2, 0], [0.2, 0.12], [0.14, 0.2], [0.09, 0.32], [0.065, 0.6], [0.055, 3.4], [0.09, 3.48], [0.09, 3.55], [0, 3.55]], 16);
    piece("metal", post, [lx, 0, lz], 0, { uv: "keep", color: "#ffffff" });
    piece("lampGlass", new THREE.BoxGeometry(0.28, 0.4, 0.28), [lx, 3.78, lz], 0, { uv: "keep" });
    for (const [ox, oz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) piece("metal", new THREE.BoxGeometry(0.035, 0.44, 0.035), [lx + ox * 0.15, 3.78, lz + oz * 0.15], 0, { uv: "keep" });
    piece("metal", new THREE.BoxGeometry(0.36, 0.05, 0.36), [lx, 3.56, lz], 0, { uv: "keep" });
    const cap = new THREE.ConeGeometry(0.3, 0.3, 4); cap.rotateY(Math.PI / 4); piece("metal", cap, [lx, 4.14, lz], 0, { uv: "keep" });
    const sc = new THREE.ConeGeometry(0.27, 0.12, 4); sc.rotateY(Math.PI / 4); piece("snow", sc, [lx, 4.24, lz], 0, { tile: 0.5 });
    lampHeads.push(new THREE.Vector3(lx, 3.78, lz));
  }
  // bollards along the quay
  for (let bx = -30; bx <= 30; bx += 6) {
    if (Math.abs(bx) < 4) continue;
    const b = lathe([[0, 0], [0.17, 0], [0.17, 0.08], [0.12, 0.14], [0.11, 0.4], [0.16, 0.5], [0.16, 0.56], [0, 0.6]], 16);
    piece("metal", b, [bx, 0, -19.3], 0, { uv: "keep", color: "#9aa0a0" });
  }
  // bunting: three sagging strings from the back-row facades to the quay lamp posts / side houses
  { const strings = [[[-16.9, 5.3, -4.5], [16.9, 5.3, -2.5]], [[-16.9, 5.5, 3.5], [16.9, 5.5, 6.5]]];
    const cols = ["#d8402c", "#f2c040", "#3a8ac0", "#f4efe6", "#5aa060"];
    for (const [a, b] of strings) {
      const A = new THREE.Vector3(...a), Bv = new THREE.Vector3(...b), n = Math.floor(A.distanceTo(Bv) / 0.55), sag = A.distanceTo(Bv) * 0.04;
      const pt = (t) => A.clone().lerp(Bv, t).add(new THREE.Vector3(0, -sag * 4 * t * (1 - t), 0));
      const pts = Array.from({ length: 25 }, (_, i) => pt(i / 24));
      const rope = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 48, 0.012, 5); add("rope", rope);
      for (let i = 1; i < n; i++) {
        const p0 = pt((i - 0.38) / n), p1 = pt((i + 0.38) / n), mid = p0.clone().lerp(p1, 0.5).add(new THREE.Vector3(0, -0.36, 0));
        const g = new THREE.BufferGeometry().setFromPoints([p0, mid, p1]); g.computeVertexNormals();
        g.setAttribute("uv", new THREE.Float32BufferAttribute([0, 0, 0.5, 1, 1, 0], 2)); tint(g, C(cols[i % cols.length])); add("cloth", g);
      }
    }
  }
  // stalls of crates / barrels (GLTF props) at the sides, never in front of the crowd views
  const props = new THREE.Group(); props.name = "townProps";
  const P = async (n, pos, ry = 0, s = 1) => props.add(await prop(n, { position: pos, rotationY: ry, scale: s }));
  const fishX = signAt.FISH.x, tavX = signAt.TAVERN.x;
  await P("wooden_crate_01", [fishX + 1.6, 0, 10.9], 0.2); await P("wooden_crate_02", [fishX + 2.15, 0, 10.6], -0.3);
  await P("wine_barrel_01", [tavX - 2.0, 0, 11.1], 0.4); await P("wine_barrel_01", [tavX - 1.25, 0, 11.3], 1.2);
  await P("wooden_bucket_02", [wellAt[0] + 1.25, 0, wellAt[2] - 0.3], 0.5);
  await P("wooden_crate_01", [-22, 0, -17.6], 0.1); await P("wooden_crate_02", [-22.9, 0, -17.2], -0.4); await P("wine_barrel_01", [-21.2, 0, -16.6], 0.3);
  await P("wooden_crate_02", [22.5, 0, -17.4], 0.6); await P("wine_barrel_01", [23.4, 0, -17.0], 2.0);
  group.add(props);

  // ---------- boats (moored along the quay, float on the shared sea at local y = -1) ----------
  const boats = [];
  const boat = (bx, bz, ry, hullCol, mast, bollard) => {
    const bg = new THREE.Group(); bg.position.set(bx, -1.0, bz); bg.rotation.y = ry;
    const hull = new THREE.SphereGeometry(1, 28, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2);
    const p = hull.attributes.position; const cs = new Float32Array(p.count * 3), hc = C(hullCol), wc = C("#f2ece0");
    for (let i = 0; i < p.count; i++) { let x = p.getX(i) * 1.0, y = p.getY(i) * 0.75, z = p.getZ(i) * 2.7; if (z > 0) x *= 1 - 0.55 * (z / 2.7) ** 2;
      p.setXYZ(i, x, y + 0.45, z); const c = y > -0.16 ? wc : hc; cs.set([c.r, c.g, c.b], i * 3); }
    hull.setAttribute("color", new THREE.BufferAttribute(cs, 3)); hull.computeVertexNormals(); boxUV(hull, 1);
    const hm = new THREE.Mesh(hull, M.paint); hm.castShadow = hm.receiveShadow = true; bg.add(hm);
    const rim = []; const N = 40; const pts = [];
    for (let i = 0; i <= N; i++) { const t = (i / N) * Math.PI * 2; let x = Math.cos(t), z = Math.sin(t) * 2.7; if (z > 0) x *= 1 - 0.55 * (z / 2.7) ** 2; pts.push(new THREE.Vector3(x, 0.47, z)); }
    rim.push(clean(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, true), 80, 0.05, 6, true), 0x6a4a30));
    for (const tz of [-1.1, 0.2, 1.3]) { const hw = tz > 0 ? 1 - 0.55 * (tz / 2.7) ** 2 : 1; const g = roundedBox(hw * 1.9, 0.06, 0.3, 0.02); grainUV(g, 1); place(g, [0, 0.25, tz]); rim.push(clean(g, 0xb08a60)); }
    const floor = roundedBox(1.0, 0.04, 3.1, 0.02); grainUV(floor, 1); place(floor, [0, -0.12, -0.1]); rim.push(clean(floor, 0x7a5a40));
    if (mast) { const m = new THREE.CylinderGeometry(0.05, 0.065, 3.6, 10); boxUV(m, 1); place(m, [0, 1.9, 0.6]); rim.push(clean(m, 0x8a6a48)); }
    const wm = new THREE.Mesh(mergeGeometries(rim), M.timber); wm.castShadow = wm.receiveShadow = true; bg.add(wm);
    const sn = roundedBox(1.0, 0.06, 0.26, 0.02); boxUV(sn, 1); place(sn, [0, 0.31, -1.1]); const snm = new THREE.Mesh(clean(sn), M.snow); snm.receiveShadow = true; bg.add(snm); snm.userData.snow = true;
    // mooring line: a straight cylinder re-aimed every frame between the bow cleat and the bollard (stays attached while bobbing)
    const line = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 1, 6).translate(0, 0.5, 0).rotateX(Math.PI / 2), M.rope); line.castShadow = true;
    group.add(bg); group.add(line);
    boats.push({ g: bg, line, bow: new THREE.Vector3(0, 0.5, 2.3), bollard: new THREE.Vector3(...bollard), y0: -1.0, ph: r() * 6, ry });
  };
  boat(-12.5, -22.3, Math.PI / 2 + 0.05, "#c8402c", true, [-12, 0.5, -19.3]);
  boat(-19.5, -22.6, Math.PI / 2 - 0.06, "#3a7ab0", false, [-18, 0.5, -19.3]);
  boat(13.5, -22.4, -Math.PI / 2 + 0.04, "#2e7a5a", true, [12, 0.5, -19.3]);

  // ---------- merge buckets ----------
  const meshes = {};
  for (const [k, list] of Object.entries(B)) {
    if (!list.length) continue;
    const m = new THREE.Mesh(mergeGeometries(list.map((g) => clean(g))), M[k]); m.name = `town_${k}`;
    m.castShadow = !["cobble", "grass", "water", "winLit", "winDark", "lampGlass"].includes(k); m.receiveShadow = true;
    meshes[k] = m; group.add(m);
  }
  for (const m of extra) group.add(m);

  // ---------- snow ground (winter): thin slabs over the square, quay and terrace ----------
  const snowGround = new THREE.Group(); snowGround.name = "townSnowGround";
  { const g1 = roundedBox(70, 0.04, 70, 0.015); boxUV(g1, 3); tint(g1, C("#ffffff")); place(g1, [0, 0.005, 15]);           // z -20..50, top 0.025
    const g2 = roundedBox(70, 0.04, 26, 0.015); boxUV(g2, 3); tint(g2, C("#ffffff")); place(g2, [0, 2.005, 37]);
    const m = new THREE.Mesh(mergeGeometries([clean(g1), clean(g2)]), M.snow); m.receiveShadow = true; snowGround.add(m); }
  const grassSnow = M.grass.clone(); grassSnow.color = new THREE.Color(1.0, 1.02, 1.08); grassSnow.map = M.snow.map; grassSnow.normalMap = M.snow.normalMap;
  group.add(snowGround);
  const snowParts = [meshes.snow, snowGround, ...boats.map((b) => b.g.children.find((c) => c.userData.snow))];

  // ---------- lights ----------
  const key = new THREE.DirectionalLight(0xffffff, 1); key.name = "townKey"; key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048); Object.assign(key.shadow.camera, { left: -38, right: 38, top: 38, bottom: -38, near: 1, far: 260 });
  key.shadow.bias = -0.0004; key.shadow.normalBias = 0.04; key.target.position.set(0, 0, 4); group.add(key, key.target);
  const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 1); group.add(hemi);
  const lamps = [0, 1].map((i) => { const l = new THREE.PointLight(0xffb060, 0, 18, 2); l.position.copy(lampHeads[i]).add(new THREE.Vector3(0, -0.05, 0)); group.add(l); return l; });
  const keyDir = new THREE.Vector3();

  // ---------- anchors (world space) ----------
  const W = (x, y, z) => new THREE.Vector3(x, y, z).add(TOWN_ORIGIN);
  const spots = { fisher: W(-2.4, 0, -12.1), baker: W(-1.1, 0, -11.5), lady: W(0.3, 0, -11.9), kid: W(1.45, 0, -12.5), extra: W(2.65, 0, -11.3) };
  const crowdCenter = W(0.1, 0, -11.9);
  const anchors = {
    origin: TOWN_ORIGIN.clone(), square: W(0, 0, 0), quayEdge: W(0, 0, -20), signGossip: signAt["GOSSIP & TEA"].clone().add(TOWN_ORIGIN),
    signs: Object.fromEntries(Object.entries(signAt).map(([k, v]) => [k, v.clone().add(TOWN_ORIGIN)])),
    well: W(...wellAt), crowdCenter, spots, keyLightPos: new THREE.Vector3(),
    views: {
      // low over the water just off the quay, looking at the crowd (houses + signs behind them; lighthouse is behind this camera)
      fromWater: { pos: W(1.2, 1.55, -28.5), target: W(0.1, 1.5, -11.5), fov: 42 },
      // low behind/beside the crowd looking out over the quay: crowd in front, lighthouse in the far background (-Z)
      crowdWide: { pos: W(2.6, 1.8, -4.6), target: W(-0.6, 1.75, -14.5), fov: 52 },
      // two-shot (fisher + baker) from the quay side, heads ~20% of frame width
      twoShot: { pos: W(-1.15, 1.45, -17.9), target: W(-1.75, 1.2, -11.8), fov: 36 },
      // the shop signs from the middle of the square
      signs: { pos: W(signAt.TAVERN.x - 1.0, 2.2, -1.5), target: W(signAt.TAVERN.x - 1.0, 3.3, 12), fov: 58 },
    },
  };

  let current = null;
  const setTime = (name) => {
    const T = TOWN_TIMES[name] || TOWN_TIMES.night; if (current === name) return; current = name;
    keyDir.set(...T.dir).normalize(); key.position.copy(keyDir).multiplyScalar(140).add(key.target.position);
    key.color.set(T.key); key.intensity = T.keyI; hemi.color.set(T.sky); hemi.groundColor.set(T.ground); hemi.intensity = T.hemiI;
    M.winLit.emissiveIntensity = T.win; M.lampGlass.emissiveIntensity = T.lamp; lamps.forEach((l) => { l.intensity = T.pt; });
    M.winLit.color.set(T.win > 0.8 ? "#5a4a3a" : "#55657a");
    for (const s of snowParts) if (s) s.visible = T.snow;
    meshes.grass.material = T.snow ? grassSnow : M.grass; meshes.cobble.visible = !T.snow;
    anchors.keyLightPos.copy(keyDir).multiplyScalar(140).add(key.target.position).add(TOWN_ORIGIN);
  };
  setTime(opts.time || "night");

  const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3();
  const update = (t = 0 /* , camera */) => {
    for (const b of boats) {
      b.g.position.y = b.y0 + 0.035 * Math.sin(t * 1.25 + b.ph); b.g.rotation.z = 0.025 * Math.sin(t * 1.05 + b.ph * 1.7);
      b.g.rotation.x = 0.012 * Math.sin(t * 0.9 + b.ph * 0.6); b.g.updateMatrix(); b.g.updateMatrixWorld(true);
      tmp.copy(b.bow).applyMatrix4(b.g.matrix); tmp2.copy(b.bollard);
      b.line.position.copy(tmp); b.line.lookAt(tmp2.clone().add(group.position)); b.line.scale.set(1, 1, tmp.distanceTo(tmp2));
    }
  };
  group.updateMatrixWorld(true); update(0);

  return { group, anchors, update, setTime, lights: { key, hemi, lamps }, keyDir, get time() { return current; }, meshes };
}
