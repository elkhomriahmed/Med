// POLICE STATION interior (video 2, LAYOUT_v02.md): behind the police facade, world x +22..+34, z -8.5..-22, floor y 0.
//
//   const police = await buildPolice({ time: "night" });  scene.add(police.group);
//   police.set({ cellDoor: 0..1 });        // 0 = open (slid aside), 1 = shut; per frame, no rebuild
//   police.setTime("night"|"day"); police.update(t, camera);
//   police.anchors = { door, deskSpot, newspaperSpot, interrogationChairRobber, interrogationChairCop, tvScreenCenter, cellInside,
//                      cellDoor (clang point when shut), cellDoorOpen, keyLightPos, yaw: {...}, views: { deskWide, interrogationWide,
//                      interrogationClose, cellWide } }          // views = { pos, target, fov } world, vertical fov deg
//   police.tvScreen   = Mesh (plane, MeshStandardMaterial; set .material.map/.emissiveMap for the tape picture, emissive is white)
//   police.rooms      = { lobby, interrogation, cells } groups (furniture + that room's lights): hide the ones the camera can't see
//   police.lights     = { deskLamp, interLamp, cellLamp, moon, hemi }
// Local frame: group at world (34, 0, -8.5) turned 180 deg, so local x 0..12 -> world x 34..22, local z 0..13.5 -> world z -8.5..-22.
// Front wall local z 0.1..0.5 (world -8.6..-9.0) with the door opening at world x 28 (local x 6), windows with venetian blinds.
import * as THREE from "three";
import { pbr, plain, canvasTex } from "../materials.js";
import {
  C, makeBuilder, linoTex, posterTex, clockTex, labelTex, tileField, blockWall, cornice, frameGeoms, barsGeoms, wallRects, toWorld,
  roundedBox, boxUV, grainUV, tint, lathe, place, tube, roundedCylinder,
} from "../bank/interiorKit.js";

export const POLICE_TIMES = {
  night: { hemiSky: "#4a5e92", hemiGround: "#2a2a2c", hemiI: 0.8, moon: "#8aa2ff", moonI: 0.9, fluo: 0.35, lamp: 1, outside: "#0e1830" },
  day:   { hemiSky: "#c8d8f0", hemiGround: "#8a7a68", hemiI: 1.1, moon: "#fff0dc", moonI: 2.2, fluo: 1.0, lamp: 0.6, outside: "#9ab8e0" },
};

export async function buildPolice(opts = {}) {
  const O = { origin: [34, 0, -8.5], time: "night", seed: 53, ...opts };
  const W = 12, D = 13.5, H = 3.05, dx = 6;
  const group = new THREE.Group(); group.name = "police"; group.position.set(...O.origin); group.rotation.y = Math.PI; group.updateMatrixWorld(true);

  // ------------------------------------------------------------------ palette + materials (grey-blue + one warm lamp per room)
  const PAL = { blockHi: "#a4bad2", blockLo: "#5f7a96", band: "#34506a", trim: "#56687a", floorA: "#c9cdc8", floorB: "#8c969c", ceil: "#d8dad4",
    desk: "#5b4634", steel: "#7e8a92", bars: "#36424e", conc: "#9a9a94" };
  const lino = linoTex({ seed: 4 });
  const M = {
    block: await pbr("plaster2", { normalScale: 1.8, roughness: 1 }),
    mortar: plain("#4a5058", { roughness: 1, relief: 0.4 }),
    lino: new THREE.MeshStandardMaterial({ map: lino, vertexColors: true, roughness: 0.45, envMapIntensity: 0.5 }),
    conc: await pbr("plaster", { normalScale: 1.5, roughness: 1 }),
    paint: plain("#ffffff", { roughness: 0.55, relief: 0.3, vertexColors: true }),
    wood: await pbr("darkWood", { normalScale: 1.3 }),
    steel: plain("#ffffff", { roughness: 0.38, metalness: 0.7, relief: 0.35, envMapIntensity: 1.4, vertexColors: true }),
    bars: plain("#ffffff", { roughness: 0.55, metalness: 0.2, relief: 0.45, envMapIntensity: 1.0, vertexColors: true }),
    plastic: plain("#ffffff", { roughness: 0.5, relief: 0.1, vertexColors: true }),
    cloth: plain("#ffffff", { roughness: 0.92, relief: 0.5, vertexColors: true }),
    paper: plain("#ffffff", { roughness: 0.85, relief: 0.05, vertexColors: true }),
    tile: plain("#ffffff", { roughness: 0.6, relief: 0.15, vertexColors: true }),
  };
  const fluoM = new THREE.MeshStandardMaterial({ color: C("#e8f0ff"), emissive: C("#cfe0ff"), emissiveIntensity: 0.35, roughness: 0.5 });
  const bulbM = new THREE.MeshStandardMaterial({ color: C("#fff4dc"), emissive: C("#ffc070"), emissiveIntensity: 3.0, roughness: 0.3 });
  const outsideM = new THREE.MeshBasicMaterial({ color: C("#0e1830") });
  const mirrorM = new THREE.MeshStandardMaterial({ color: C("#1a2026"), roughness: 0.04, metalness: 1.0, envMapIntensity: 1.8 });
  const screenM = new THREE.MeshStandardMaterial({ color: C("#0b0e10"), emissive: C("#ffffff"), emissiveIntensity: 0.0, roughness: 0.18, metalness: 0.1, envMapIntensity: 1.2 });

  const S = makeBuilder(M, O.seed); const { r, piece } = S;
  const rooms = { lobby: new THREE.Group(), interrogation: new THREE.Group(), cells: new THREE.Group() };
  for (const [k, g] of Object.entries(rooms)) { g.name = "police_" + k; group.add(g); }
  const mesh = (geo, mat, pos = [0, 0, 0], rot = [0, 0, 0], parent = rooms.lobby, { cast = true, receive = true } = {}) => {
    const m = new THREE.Mesh(geo, mat); m.position.set(...pos); m.rotation.set(...rot); m.castShadow = cast; m.receiveShadow = receive; parent.add(m); return m; };

  // room boundaries (local)
  const zF = 0.5, zP = 6.0, zPb = 6.2, xDiv = 5.5, zCellBars = 8.6, zB = D - 0.2;
  const ROOM = { lobby: [0.2, W - 0.2, zF, zP], inter: [xDiv + 0.1, W - 0.2, zPb, zB], cells: [0.2, xDiv - 0.1, zPb, zB] };

  // ------------------------------------------------------------------ floors: vinyl tiles (lobby + interrogation), concrete in cells
  { const g = new THREE.PlaneGeometry(W, D); g.rotateX(-Math.PI / 2); g.translate(W / 2, -0.006, D / 2); S.add("mortar", g); }
  const tf = (x0, x1, z0, z1, a, b) => S.B.lino.push(...tileField({ x0, x1, z0, z1, tile: 0.305, gap: 0.004, thick: 0.01, top: 0.002, tex: 0.6, r, simple: true,
    colorAt: (i, j) => ((i + j) % 2 ? a : b) }));
  tf(0.2, W - 0.2, zF, zP + 0.1, PAL.floorA, PAL.floorB);
  tf(xDiv + 0.1, W - 0.2, zPb, zB, "#b9bfbc", "#a6aeb0");
  tf(0.2, xDiv - 0.1, zPb, zCellBars, PAL.floorA, PAL.floorB);
  { const g = roundedBox(xDiv - 0.3, 0.03, zB - zCellBars, 0.01, 1); boxUV(g, 2.0); tint(g, C(PAL.conc)); g.translate(xDiv / 2, 0.0, (zCellBars + zB) / 2); S.add("conc", g);
    for (let k = 1; k < 3; k++) { const j = roundedBox(0.012, 0.004, zB - zCellBars, 0.002, 1); tint(j, C("#55524c")); j.translate(k * (xDiv / 3), 0.016, (zCellBars + zB) / 2); S.add("mortar", j); }
    const drain = new THREE.CylinderGeometry(0.09, 0.09, 0.006, 20); tint(drain, C("#3a3e40")); drain.translate(3.6, 0.017, 11.0); S.add("steel", drain); }

  // ------------------------------------------------------------------ cinder-block walls (two-tone paint, real mortar depth) + slabs
  const lo = 1.05;
  const colorAt = (x, y) => (y < lo ? PAL.blockLo : PAL.blockHi);
  const wall = (len, xf, openings = [], { slab = true } = {}) => {
    for (const g of blockWall({ len, h: H, openings, r, colorAt })) S.add("block", xf(g));
    if (slab) for (const q of wallRects(len, H, openings)) { const g = new THREE.BoxGeometry(q.x1 - q.x0, q.y1 - q.y0, 0.02); g.translate((q.x0 + q.x1) / 2, (q.y0 + q.y1) / 2, -0.07); S.add("mortar", xf(g)); }
    // painted band at the colour change + rubber skirting
    const segs = []; let x = 0; for (const o of [...openings].sort((a, b) => a.x0 - b.x0)) { if (o.y0 < 0.2) { if (o.x0 - x > 0.05) segs.push([x, o.x0]); x = o.x1; } } if (len - x > 0.05) segs.push([x, len]);
    for (const [a, b] of segs) { const g = roundedBox(b - a, 0.05, 0.02, 0.006, 1); tint(g, C(PAL.band)); g.translate((a + b) / 2, lo, 0.01); S.add("paint", xf(g));
      const sk = roundedBox(b - a, 0.1, 0.02, 0.006, 1); tint(sk, C("#2a2e32")); sk.translate((a + b) / 2, 0.05, 0.01); S.add("plastic", xf(sk)); }
  };
  // transforms: local wall XY (x along, face +Z) -> group local
  const XF = {
    front: (g) => g.translate(0, 0, zF),                                                                   // face +z at zF
    back: (g) => { g.rotateY(Math.PI); g.translate(W, 0, zB); return g; },                                  // face -z
    left: (z0, z1) => (g) => { g.rotateY(Math.PI / 2); g.translate(0.2, 0, z1); return g; },              // at x 0.2, face +x, x-> z1 - x
    right: (z0, z1) => (g) => { g.rotateY(-Math.PI / 2); g.translate(W - 0.2, 0, z0); return g; },        // at x W-0.2, face -x, x -> z0 + x
    partS: (g) => { g.rotateY(Math.PI); g.translate(W, 0, zP); return g; },                                 // partition lobby side (face -z)
    partN: (g) => g.translate(0, 0, zPb),                                                                   // partition back side (face +z)
    divI: (z0, z1) => (g) => { g.rotateY(Math.PI / 2); g.translate(xDiv + 0.1, 0, z1); return g; },        // divider, interrogation side (face +x)
    divC: (z0, z1) => (g) => { g.rotateY(-Math.PI / 2); g.translate(xDiv - 0.1, 0, z0); return g; },      // divider, cell side (face -x)
  };
  const winXs = [2.4, 9.6];
  const frontOpen = [{ x0: dx - 1.0, x1: dx + 1.0, y0: 0, y1: 2.5 }, ...winXs.map((x) => ({ x0: x - 0.8, x1: x + 0.8, y0: 1.0, y1: 2.3 }))];
  wall(W, XF.front, frontOpen);
  const doorI = 8.7, doorC = 2.6;
  const partOpen = [{ x0: doorI - 0.55, x1: doorI + 0.55, y0: 0, y1: 2.2 }, { x0: doorC - 0.55, x1: doorC + 0.55, y0: 0, y1: 2.2 }];
  wall(W, XF.partN, partOpen);
  wall(W, XF.partS, partOpen.map((o) => ({ ...o, x0: W - o.x1, x1: W - o.x0 })));
  for (const q of wallRects(W, H, partOpen)) { const b = new THREE.BoxGeometry(q.x1 - q.x0, q.y1 - q.y0, zPb - zP - 0.12); b.translate((q.x0 + q.x1) / 2, (q.y0 + q.y1) / 2, (zP + zPb) / 2); S.add("mortar", b); }
  wall(zP - zF, XF.left(zF, zP)); wall(zP - zF, XF.right(zF, zP));
  wall(zB - zPb, XF.left(zPb, zB)); wall(zB - zPb, XF.right(zPb, zB));
  wall(zB - zPb, XF.divI(zPb, zB)); wall(zB - zPb, XF.divC(zPb, zB));
  { const b = new THREE.BoxGeometry(0.08, H, zB - zPb); b.translate(xDiv, H / 2, (zPb + zB) / 2); S.add("mortar", b); }
  const cellWin = { x0: 3.75, x1: 4.65, y0: 2.0, y1: 2.6 };          // back wall local x (back XF flips: world-local x = W - x)
  const backOpen = [{ x0: W - cellWin.x1, x1: W - cellWin.x0, y0: cellWin.y0, y1: cellWin.y1 }];
  wall(W, XF.back, backOpen);
  // door/opening casings (steel frames painted trim colour)
  const casing = (o, xf, depth = 0.24) => { const w = o.x1 - o.x0, h = o.y1 - o.y0;
    for (const [bw, bh, x, y] of [[0.08, h, o.x0 - 0.04, o.y0 + h / 2], [0.08, h, o.x1 + 0.04, o.y0 + h / 2], [w + 0.16, 0.08, (o.x0 + o.x1) / 2, o.y1 + 0.04]]) {
      const g = roundedBox(bw, bh, depth, 0.012, 2); tint(g, C(PAL.trim)); g.translate(x, y, -depth / 2 + 0.04); S.add("steel", xf(g)); }
    if (o.y0 > 0.05) { const g = roundedBox(w + 0.16, 0.06, depth + 0.06, 0.012, 2); tint(g, C(PAL.trim)); g.translate((o.x0 + o.x1) / 2, o.y0 - 0.03, -depth / 2 + 0.07); S.add("steel", xf(g)); } };
  frontOpen.forEach((o) => casing(o, XF.front, 0.46)); partOpen.forEach((o) => casing(o, XF.partN, 0.3)); casing(backOpen[0], XF.back, 0.3);

  // windows: venetian blinds (individual tilted slats) + night outside plane
  for (const x of winXs) { const g = rooms.lobby;
    for (let k = 0; k < 15; k++) { const s = roundedBox(1.56, 0.004, 0.06, 0.002, 1); s.rotateX(0.55); tint(s, C("#d8d4c4")); s.translate(x, 1.06 + k * 0.08, zF - 0.06); S.add("plastic", s); }
    const rail = roundedBox(1.62, 0.05, 0.06, 0.01, 2); tint(rail, C("#cfcabb")); rail.translate(x, 2.27, zF - 0.06); S.add("plastic", rail);
    for (const s of [-0.5, 0.5]) S.add("cloth", tint(tube([new THREE.Vector3(x + s, 2.25, zF - 0.03), new THREE.Vector3(x + s, 1.06, zF - 0.03)], 0.002, 4, 4), C("#eeeeee")));
    mesh(new THREE.PlaneGeometry(1.7, 1.4), outsideM, [x, 1.65, 0.12], [0, 0, 0], g, { cast: false, receive: false }); }
  mesh(new THREE.PlaneGeometry(1.2, 0.8), outsideM, [W - (W - cellWin.x0 - 0.45) , 2.3, zB + 0.3], [0, Math.PI, 0], rooms.cells, { cast: false, receive: false });
  { // cell window bars
    for (let k = 0; k < 5; k++) { const b = new THREE.CylinderGeometry(0.015, 0.015, 0.62, 8); tint(b, C(PAL.bars)); b.translate(cellWin.x0 + 0.12 + k * 0.165, 2.3, zB + 0.08); S.add("bars", b); } }

  // ------------------------------------------------------------------ drop ceiling: tiles in a raised T-bar grid + fluorescent troffers
  { const g = new THREE.PlaneGeometry(W, D); g.rotateX(Math.PI / 2); g.translate(W / 2, H + 0.01, D / 2); boxUV(g, 0.6); tint(g, C("#c4cad0")); S.add("conc", g);
    for (let x = 0.2; x <= W - 0.2 + 1e-3; x += 0.61) { const b = roundedBox(0.025, 0.03, D, 0.004, 1); tint(b, C("#e8e8e2")); b.translate(x, H - 0.012, D / 2); S.add("paint", b); }
    for (let z = 0.5; z <= D; z += 0.61) { const b = roundedBox(W, 0.03, 0.025, 0.004, 1); tint(b, C("#e8e8e2")); b.translate(W / 2, H - 0.012, z); S.add("paint", b); } }
  const troffer = (x, z, parent) => { const f = roundedBox(0.62, 0.05, 1.22, 0.01, 2); tint(f, C("#dcdcd6")); f.translate(x, H - 0.03, z); S.add("paint", f);
    const p = new THREE.PlaneGeometry(0.54, 1.12); p.rotateX(Math.PI / 2); mesh(p, fluoM, [x, H - 0.058, z], [0, 0, 0], parent, { cast: false }); };
  troffer(3.0, 2.0, rooms.lobby); troffer(9.0, 2.0, rooms.lobby); troffer(1.8, 7.2, rooms.cells);

  // ------------------------------------------------------------------ LOBBY: front desk (raised sergeant's desk), newspaper, lamp, boards
  const deskX = 6.6, deskZ = 3.5, dl = 3.4, dh = 1.12, dd = 0.75;
  { // front panel with recessed panels + kick plate, top with bullnose, inner low writing desk
    piece("wood", roundedBox(dl, dh - 0.04, 0.08, 0.012, 2), [deskX, (dh - 0.04) / 2, deskZ - dd / 2], [0, 0, 0], { uv: "grain", tile: 1.2, color: PAL.desk });
    for (let k = 0; k < 4; k++) { const x = deskX - dl / 2 + (k + 0.5) * dl / 4;
      piece("wood", roundedBox(dl / 4 - 0.14, dh - 0.42, 0.03, 0.01, 2), [x, 0.66, deskZ - dd / 2 - 0.05], [0, 0, 0], { uv: "grain", tile: 1.2, color: "#6b5440", jitter: 0.08 });
      for (const [w, h, ox, oy] of [[dl / 4 - 0.1, 0.035, 0, (dh - 0.42) / 2 + 0.02], [dl / 4 - 0.1, 0.035, 0, -(dh - 0.42) / 2 - 0.02], [0.035, dh - 0.36, -(dl / 4 - 0.14) / 2 - 0.02, 0], [0.035, dh - 0.36, (dl / 4 - 0.14) / 2 + 0.02, 0]]) {
        piece("wood", roundedBox(w, h, 0.04, 0.012, 2), [x + ox, 0.66 + oy, deskZ - dd / 2 - 0.06], [0, 0, 0], { uv: "grain", tile: 1, color: "#4a3626" }); } }
    piece("plastic", roundedBox(dl, 0.14, 0.03, 0.01, 1), [deskX, 0.07, deskZ - dd / 2 - 0.05], [0, 0, 0], { color: "#2a2e32" });
    for (const s of [-1, 1]) piece("wood", roundedBox(0.08, dh - 0.04, dd, 0.012, 2), [deskX + s * (dl / 2 - 0.04), (dh - 0.04) / 2, deskZ], [0, 0, 0], { uv: "grain", color: PAL.desk });
    piece("wood", roundedBox(dl + 0.12, 0.06, 0.42, 0.025, 3), [deskX, dh, deskZ - dd / 2 + 0.12], [0, 0, 0], { uv: "grain", tile: 1.2, color: "#6a5038" });   // transaction ledge
    piece("wood", roundedBox(dl - 0.1, 0.05, dd - 0.1, 0.015, 2), [deskX, 0.8, deskZ + 0.02], [0, 0, 0], { uv: "grain", tile: 1.2, color: PAL.desk });      // writing desk
    // hanging "DESK SERGEANT" sign above the desk (two chains, framed board)
    const np = labelTex("DESK SERGEANT", { w: 1024, h: 150, bg: "#1f2e44", ink: "#e8e4d8", font: "Arial", size: 0.55 });
    const sy = 2.45, sw = 1.3, sh = 0.2;
    piece("wood", roundedBox(sw + 0.08, sh + 0.08, 0.04, 0.012, 2), [deskX, sy, deskZ - 0.2], [0, 0, 0], { uv: "grain", color: "#3a2c20" });
    mesh(new THREE.PlaneGeometry(sw, sh), new THREE.MeshStandardMaterial({ map: np, roughness: 0.4 }), [deskX, sy, deskZ - 0.2 - 0.021], [0, Math.PI, 0], rooms.lobby, { cast: false });
    for (const s of [-0.5, 0.5]) S.add("steel", tint(tube([new THREE.Vector3(deskX + s, sy + sh / 2 + 0.04, deskZ - 0.2), new THREE.Vector3(deskX + s, H, deskZ - 0.2)], 0.005, 4, 5), C("#444")));
  }
  const newspaperLocal = new THREE.Vector3(deskX - 0.55, dh + 0.033, deskZ - dd / 2 + 0.14);
  { // desk props on the ledge: phone, mug, in-tray with forms, typewriter on the writing desk, lamp (warm key)
    const L = rooms.lobby, top = dh + 0.03, zl = deskZ - dd / 2 + 0.12;
    piece("plastic", roundedBox(0.22, 0.07, 0.2, 0.02, 3), [deskX + 0.9, top + 0.035, zl], [0, 0.3, 0], { color: "#2b2b2b" });
    piece("plastic", roundedBox(0.22, 0.05, 0.06, 0.02, 2), [deskX + 0.9, top + 0.1, zl], [0, 0.3, 0], { color: "#222" });
    S.add("cloth", tint(tube([new THREE.Vector3(deskX + 0.98, top + 0.03, zl + 0.08), new THREE.Vector3(deskX + 1.1, top - 0.02, zl + 0.2), new THREE.Vector3(deskX + 1.0, top + 0.01, zl + 0.15)], 0.005, 16, 4), C("#222")));
    const mug = lathe([[0.0001, 0], [0.04, 0], [0.042, 0.1], [0.038, 0.1], [0.036, 0.01], [0.0001, 0.01]], 18); tint(mug, C("#f0ece2")); mug.translate(deskX + 0.45, top, zl - 0.04); S.add("plastic", mug);
    for (let k = 0; k < 4; k++) piece("paper", roundedBox(0.22, 0.004, 0.3, 0.001, 1), [deskX + 0.15 + (r() - 0.5) * 0.02, top + 0.004 + k * 0.006, zl + 0.02], [0, 0.05 * (r() - 0.5), 0], { color: k % 2 ? "#f2eee2" : "#f6e3a8" });
    piece("plastic", roundedBox(0.5, 0.14, 0.4, 0.04, 3), [deskX - 0.5, 0.92, deskZ + 0.1], [0, 0, 0], { color: "#3a4a52" });   // typewriter
    piece("plastic", roundedBox(0.52, 0.06, 0.08, 0.02, 2), [deskX - 0.5, 1.02, deskZ + 0.22], [0, 0, 0], { color: "#2a2a2a" });
    // gooseneck desk lamp (the lobby key light)
    const lx = deskX + 1.35, lz = zl - 0.02;
    const base = lathe([[0.0001, 0], [0.09, 0], [0.085, 0.025], [0.03, 0.04], [0.0001, 0.04]], 20); tint(base, C("#2c3a32")); base.translate(lx, top, lz); S.add("steel", base);
    const neck = [new THREE.Vector3(lx, top + 0.03, lz), new THREE.Vector3(lx, top + 0.25, lz + 0.02), new THREE.Vector3(lx - 0.12, top + 0.42, lz + 0.02), new THREE.Vector3(lx - 0.3, top + 0.42, lz)];
    S.add("steel", tint(tube(neck, 0.011, 24, 8), C("#2c3a32")));
    const shade = lathe([[0.03, 0], [0.04, -0.03], [0.1, -0.12], [0.11, -0.13]], 24); shade.rotateZ(0.35); tint(shade, C("#2e5a44")); shade.translate(lx - 0.33, top + 0.44, lz); S.add("steel", shade);
    mesh(new THREE.SphereGeometry(0.035, 16, 10), bulbM, [lx - 0.36, top + 0.36, lz], [0, 0, 0], L, { cast: false });
    var deskLampPos = new THREE.Vector3(lx - 0.37, top + 0.33, lz);
    // cop chair behind the desk
    const ch = new THREE.Group(); ch.position.set(deskX + 0.2, 0, deskZ + 0.85); ch.rotation.y = Math.PI; L.add(ch);
    const seat = new THREE.Mesh(roundedBox(0.5, 0.09, 0.48, 0.035, 3), M.cloth); tint(seat.geometry, C("#3a4652")); seat.position.y = 0.56; ch.add(seat);
    const back = new THREE.Mesh(roundedBox(0.46, 0.5, 0.07, 0.035, 3), M.cloth); tint(back.geometry, C("#3a4652")); back.position.set(0, 0.95, -0.24); ch.add(back);
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.45, 10), M.steel); tint(post.geometry, C("#333")); post.position.y = 0.3; ch.add(post);
    for (let k = 0; k < 5; k++) { const leg = new THREE.Mesh(roundedBox(0.3, 0.03, 0.04, 0.01, 1), M.steel); tint(leg.geometry, C("#333")); const a = k / 5 * Math.PI * 2; leg.position.set(Math.cos(a) * 0.15, 0.06, Math.sin(a) * 0.15); leg.rotation.y = -a; ch.add(leg); }
    ch.traverse((o) => { if (o.isMesh) { o.castShadow = o.receiveShadow = true; } });
  }
  { // lobby walls: bulletin board with wanted posters, clock, benches, filing cabinets, flag pole, plant-free (police)
    const L = rooms.lobby;
    const bx = 3.0, by = 1.75, bw = 1.8, bh = 1.05;   // on the partition (lobby face = partS, local x' = W - x)
    for (const g of frameGeoms(bw, bh, { bar: 0.05, depth: 0.04 })) { tint(g, C("#6a5038")); g.translate(W - bx, by, 0); S.add("wood", XF.partS(g)); }
    { const g = new THREE.PlaneGeometry(bw, bh); tint(g, C("#a8784a")); boxUV(g, 0.5); g.translate(W - bx, by, 0.012); S.add("cloth", XF.partS(g)); }
    const notes = [["WANTED", 0.12, "#7a1a10"], ["BANK FRAUD", 0.09], ["MISSING", 0.12, "#1a3a7a"], ["NOTICE", 0.12], ["WANTED", 0.12, "#7a1a10"]];
    notes.forEach((n, i) => { const tex = posterTex([[n[0], n[1], n[2]], ["$5,000 REWARD", 0.06, "#333", 0.78]], { w: 256, h: 340, bg: i % 2 ? "#f1ead2" : "#e8e4da", seed: i + 3, photo: i !== 3, font: "Arial Black" });
      const pw = 0.27 + (i % 2) * 0.04, ph = pw * 1.33; const x = bx - 0.68 + i * 0.34, y = by + (i % 2 ? -0.12 : 0.14);
      const g = new THREE.PlaneGeometry(pw, ph); g.rotateZ((r() - 0.5) * 0.08); g.translate(W - x, y, 0.02); XF.partS(g);
      mesh(g, new THREE.MeshStandardMaterial({ map: tex, roughness: 0.8 }), [0, 0, 0], [0, 0, 0], L, { cast: false });
      const pin = new THREE.SphereGeometry(0.012, 8, 6); tint(pin, C("#c02020")); pin.translate(W - x, y + ph / 2 - 0.03, 0.03); S.add("plastic", XF.partS(pin)); });
    // clock above the desk on the partition
    { const cx = W - deskX, cy = 2.45, rr = 0.2; const rim = new THREE.TorusGeometry(rr, 0.025, 10, 40); tint(rim, C("#2a2e32")); rim.translate(cx, cy, 0.04); S.add("plastic", XF.partS(rim));
      const fg = new THREE.CircleGeometry(rr, 40); fg.translate(cx, cy, 0.03); XF.partS(fg); mesh(fg, new THREE.MeshStandardMaterial({ map: clockTex({ hh: 11, mm: 6, face: "#f2f0ea", ink: "#1a1a1a" }), roughness: 0.4 }), [0, 0, 0], [0, 0, 0], L, { cast: false }); }
    // "POLICE" crest plaque on the partition right
    { const t = labelTex("CITY POLICE  ·  PRECINCT 4", { w: 1024, h: 120, bg: "#1f2e44", ink: "#d8c27a", size: 0.5, font: "Arial" }); const g = new THREE.PlaneGeometry(2.0, 0.24); g.translate(W - 8.7, 2.55, 0.03); XF.partS(g);
      mesh(g, new THREE.MeshStandardMaterial({ map: t, roughness: 0.4, metalness: 0.2 }), [0, 0, 0], [0, 0, 0], L, { cast: false }); }
    // filing cabinets left of the desk (against partition)
    for (let k = 0; k < 2; k++) { const x = 9.9 + k * 0.5; piece("steel", roundedBox(0.48, 1.32, 0.6, 0.015, 2), [x, 0.66, zP - 0.32], [0, 0, 0], { color: "#6d7a84" });
      for (let d = 0; d < 4; d++) { piece("steel", roundedBox(0.42, 0.28, 0.02, 0.01, 2), [x, 0.18 + d * 0.31, zP - 0.625], [0, 0, 0], { color: "#7b8892" });
        piece("steel", roundedBox(0.12, 0.025, 0.03, 0.01, 1), [x, 0.26 + d * 0.31, zP - 0.645], [0, 0, 0], { color: "#c8c8c0" }); } }
    // benches along the side walls (out of the door view foreground)
    for (const x of [0.55, W - 0.55]) { piece("wood", roundedBox(0.42, 0.05, 1.8, 0.015, 2), [x, 0.46, 2.6], [0, 0, 0], { uv: "grain", color: "#6a5038" });
      piece("wood", roundedBox(0.05, 0.38, 1.8, 0.015, 2), [x + Math.sign(0.5 - x / W) * -0.19, 0.78, 2.6], [0, 0, 0], { uv: "grain", color: "#6a5038" });
      for (const z of [1.85, 3.35]) piece("steel", roundedBox(0.38, 0.44, 0.04, 0.01, 1), [x, 0.22, z], [0, 0, 0], { color: "#3a3e42" }); }
  }

  // ------------------------------------------------------------------ INTERROGATION: metal table, 2 chairs, TV+VCR cart, one-way mirror, hanging lamp
  const IX = (xDiv + 0.1 + W - 0.2) / 2, IZ = 9.9;
  const I = rooms.interrogation;
  { // table: steel top with rolled edge, 4 legs, cross rails, D-ring for cuffs
    piece("steel", roundedBox(1.25, 0.04, 0.8, 0.015, 3), [IX, 0.74, IZ], [0, 0, 0], { color: "#8a959c" });
    piece("steel", roundedBox(1.15, 0.08, 0.7, 0.01, 2), [IX, 0.68, IZ], [0, 0, 0], { color: "#6a747a" });
    for (const [sx, sz] of [[-0.55, -0.33], [0.55, -0.33], [-0.55, 0.33], [0.55, 0.33]]) { const l = new THREE.CylinderGeometry(0.022, 0.022, 0.66, 10); tint(l, C("#5a646a")); l.translate(IX + sx, 0.33, IZ + sz); S.add("steel", l);
      const f = new THREE.CylinderGeometry(0.03, 0.03, 0.015, 10); tint(f, C("#222")); f.translate(IX + sx, 0.008, IZ + sz); S.add("plastic", f); }
    for (const s of [-1, 1]) { const b = tube([new THREE.Vector3(IX - 0.55, 0.15, IZ + s * 0.33), new THREE.Vector3(IX + 0.55, 0.15, IZ + s * 0.33)], 0.012, 4, 8); tint(b, C("#5a646a")); S.add("steel", b); }
    const ring = new THREE.TorusGeometry(0.035, 0.007, 8, 16); ring.rotateX(Math.PI / 2); tint(ring, C("#b0b8bc")); ring.translate(IX, 0.765, IZ); S.add("steel", ring);
    // a manila folder + polaroids on the table
    piece("paper", roundedBox(0.32, 0.01, 0.24, 0.002, 1), [IX - 0.3, 0.765, IZ - 0.1], [0, 0.25, 0], { color: "#e2c88a" });
    piece("paper", roundedBox(0.09, 0.004, 0.11, 0.001, 1), [IX + 0.12, 0.764, IZ + 0.08], [0, -0.3, 0], { color: "#f6f4ee" });
  }
  const chairI = (x, z, ry) => { const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; I.add(g);
    const add = (geo, color, p, k = "steel") => { tint(geo, C(color)); const m = new THREE.Mesh(geo, M[k]); m.position.set(...p); m.castShadow = m.receiveShadow = true; g.add(m); };
    add(roundedBox(0.44, 0.04, 0.42, 0.012, 2), "#7a858c", [0, 0.46, 0]); add(roundedBox(0.42, 0.26, 0.03, 0.012, 2), "#7a858c", [0, 0.82, -0.2]);
    for (const [sx, sz] of [[-0.19, -0.18], [0.19, -0.18], [-0.19, 0.18], [0.19, 0.18]]) add(new THREE.CylinderGeometry(0.014, 0.014, 0.46, 8), "#4a5258", [sx, 0.23, sz]);
    for (const sx of [-0.19, 0.19]) add(new THREE.CylinderGeometry(0.012, 0.012, 0.5, 8), "#4a5258", [sx, 0.7, -0.19]); };
  // robber on the far side (faces local -z, toward the camera door side), cop on the near side (faces +z)
  const robberSeat = new THREE.Vector3(IX, 0, IZ + 0.72), copSeat = new THREE.Vector3(IX, 0, IZ - 0.72);
  chairI(robberSeat.x, robberSeat.z + 0.05, Math.PI); chairI(copSeat.x, copSeat.z - 0.05, 0);
  // one-way mirror on the right (outer) wall, framed, with a lit observation-room glow kept dark
  { const mz = IZ, mw = 2.6, mh = 1.15, my = 1.55;
    const g = new THREE.PlaneGeometry(mw, mh); mesh(g, mirrorM, [W - 0.2 - 0.035, my, mz], [0, -Math.PI / 2, 0], I, { cast: false });
    for (const f of frameGeoms(mw, mh, { bar: 0.07, depth: 0.06 })) { tint(f, C("#3e4a54")); f.translate(mz - zPb, my, 0); S.add("steel", XF.right(zPb, zB)(f)); }
    const sill = roundedBox(mw + 0.2, 0.05, 0.12, 0.012, 2); tint(sill, C("#3e4a54")); sill.translate(mz - zPb, my - mh / 2 - 0.09, 0.06); S.add("steel", XF.right(zPb, zB)(sill)); }
  // TV + VCR on a rolling cart, angled toward the table
  const tvGroup = new THREE.Group(); tvGroup.position.set(xDiv + 0.85, 0, 12.4); tvGroup.rotation.y = Math.PI * 0.82; I.add(tvGroup);
  let tvScreen;
  { const add = (geo, color, p, k = "steel", rot = [0, 0, 0]) => { tint(geo, C(color)); const m = new THREE.Mesh(geo, M[k]); m.position.set(...p); m.rotation.set(...rot); m.castShadow = m.receiveShadow = true; tvGroup.add(m); return m; };
    for (const y of [0.18, 0.62, 0.98]) add(roundedBox(0.8, 0.03, 0.55, 0.01, 2), "#3a4248", [0, y, 0]);
    for (const [sx, sz] of [[-0.38, -0.25], [0.38, -0.25], [-0.38, 0.25], [0.38, 0.25]]) { add(new THREE.CylinderGeometry(0.016, 0.016, 0.88, 8), "#2a3036", [sx, 0.55, sz]);
      add(roundedBox(0.04, 0.05, 0.06, 0.01, 1), "#222", [sx, 0.09, sz], "plastic"); add(new THREE.CylinderGeometry(0.035, 0.035, 0.025, 14), "#111", [sx, 0.04, sz], "plastic", [0, 0, Math.PI / 2]); }
    // VCR on the middle shelf: slot, buttons, green clock
    add(roundedBox(0.43, 0.09, 0.32, 0.01, 2), "#1e1f22", [0, 0.68, 0.0], "plastic"); add(roundedBox(0.2, 0.02, 0.01, 0.004, 1), "#0a0a0a", [-0.06, 0.69, 0.162], "plastic");
    for (let k = 0; k < 5; k++) add(roundedBox(0.022, 0.012, 0.01, 0.003, 1), "#555", [0.08 + k * 0.03, 0.665, 0.162], "plastic");
    const vcrClock = new THREE.Mesh(new THREE.PlaneGeometry(0.07, 0.02), new THREE.MeshStandardMaterial({ color: C("#000"), emissive: C("#38ff7a"), emissiveIntensity: 1.2 })); vcrClock.position.set(0.12, 0.7, 0.161); tvGroup.add(vcrClock);
    // CRT TV: deep box with tapered back, bezel, slightly convex screen
    add(roundedBox(0.62, 0.5, 0.36, 0.05, 3), "#2a2b2e", [0, 1.25, 0.03], "plastic");
    add(roundedBox(0.44, 0.38, 0.22, 0.05, 3), "#232427", [0, 1.24, -0.22], "plastic");
    for (let k = 0; k < 6; k++) add(roundedBox(0.3, 0.008, 0.01, 0.002, 1), "#111", [0, 1.18 + k * 0.025, -0.33], "plastic");
    for (let k = 0; k < 3; k++) add(new THREE.CylinderGeometry(0.012, 0.012, 0.012, 12), "#666", [0.25, 1.12 + k * 0.035, 0.215], "plastic", [Math.PI / 2, 0, 0]);
    const sg = new THREE.PlaneGeometry(0.46, 0.35, 8, 8); { const p = sg.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i); p.setZ(i, 0.018 * (1 - (x * x) / 0.06 - (y * y) / 0.035)); } sg.computeVertexNormals(); }
    tvScreen = new THREE.Mesh(sg, screenM); tvScreen.position.set(-0.04, 1.26, 0.211); tvScreen.name = "tvScreen"; tvScreen.castShadow = false; tvGroup.add(tvScreen);
    S.add("cloth", tint(tube([new THREE.Vector3(0.1, 1.05, -0.2).applyMatrix4(new THREE.Matrix4().compose(tvGroup.position, tvGroup.quaternion, new THREE.Vector3(1, 1, 1))),
      new THREE.Vector3(xDiv + 0.5, 0.4, 12.9), new THREE.Vector3(xDiv + 0.35, 0.02, 13.1), new THREE.Vector3(xDiv + 0.25, 0.3, zB - 0.02)], 0.008, 24, 5), C("#111")));
  }
  // hanging lamp over the table (the interrogation key light): cord, enamel cone shade, bulb
  const lampP = new THREE.Vector3(IX, 2.15, IZ);
  { S.add("cloth", tint(tube([new THREE.Vector3(IX, H, IZ), new THREE.Vector3(IX, lampP.y + 0.14, IZ)], 0.006, 4, 6), C("#151515")));
    const sh = lathe([[0.02, 0.16], [0.05, 0.15], [0.07, 0.11], [0.2, 0.0], [0.215, -0.01], [0.21, -0.015]], 32); tint(sh, C("#2f4a3e")); sh.translate(IX, lampP.y, IZ); S.add("steel", sh);
    const inner = lathe([[0.205, -0.012], [0.19, -0.0], [0.065, 0.11], [0.045, 0.145]], 32); tint(inner, C("#f0eee6")); inner.translate(IX, lampP.y - 0.002, IZ); S.add("paint", inner);
    mesh(new THREE.SphereGeometry(0.05, 18, 12), bulbM, [IX, lampP.y + 0.02, IZ], [0, 0, 0], I, { cast: false }); }
  // interrogation extras: wall clock, camera in the corner, ashtray
  { const cx = IX, rr = 0.17; const rim = new THREE.TorusGeometry(rr, 0.02, 10, 40); tint(rim, C("#222")); rim.translate(W - cx, 2.45, 0.04); S.add("plastic", XF.back(rim));
    const fg = new THREE.CircleGeometry(rr, 40); fg.translate(W - cx, 2.45, 0.03); XF.back(fg); mesh(fg, new THREE.MeshStandardMaterial({ map: clockTex({ hh: 11, mm: 52, face: "#f2f0ea", ink: "#1a1a1a" }), roughness: 0.4 }), [0, 0, 0], [0, 0, 0], I, { cast: false });
    const ash = lathe([[0.0001, 0], [0.06, 0], [0.07, 0.025], [0.055, 0.025], [0.05, 0.008], [0.0001, 0.008]], 20); tint(ash, C("#8a9aa0")); ash.translate(IX + 0.42, 0.76, IZ - 0.2); S.add("steel", ash); }

  // ------------------------------------------------------------------ CELLS: bar front with a sliding door, divider bars, bunk, toilet/sink
  const C0 = rooms.cells;
  const cellA = [0.2, 2.75], cellB = [2.85, xDiv - 0.1];       // cell B = the robber's cell
  const doorW = 1.0, doorX0 = cellB[0] + 0.15, doorX1 = doorX0 + doorW, barH = H - 0.05;
  const barsXf = (x0, z) => (g) => g.translate(x0, 0, z);
  const barsPanel = (x0, x1, z) => { for (const g of barsGeoms({ w: x1 - x0, h: barH })) { tint(g, C(PAL.bars)); S.add("bars", barsXf(x0, z)(g)); } };
  barsPanel(cellA[0] + 0.05, cellA[1], zCellBars);                       // cell A front
  barsPanel(cellA[1], doorX0, zCellBars);                                // post between cells + small fixed piece
  barsPanel(doorX1, cellB[1] - 0.02, zCellBars);                         // fixed bars right of the door (door slides in front of these)
  { const g = barsGeoms({ w: zB - zCellBars - 0.05, h: barH }); for (const b of g) { tint(b, C(PAL.bars)); b.rotateY(-Math.PI / 2); b.translate(cellA[1] + 0.05, 0, zCellBars); S.add("bars", b); } }   // divider A|B
  { const hdr = roundedBox(cellB[1] - cellA[0], 0.16, 0.14, 0.012, 2); tint(hdr, C("#3e4852")); hdr.translate((cellA[0] + cellB[1]) / 2, barH - 0.02, zCellBars); S.add("steel", hdr);   // track header
    const track = roundedBox(doorW * 2 + 0.2, 0.05, 0.05, 0.01, 1); tint(track, C("#2e363e")); track.translate(doorX0 + doorW, barH - 0.12, zCellBars - 0.1); S.add("steel", track);
    const lockBox = roundedBox(0.16, 0.3, 0.12, 0.02, 2); tint(lockBox, C("#3e4852")); lockBox.translate(doorX0 - 0.05, 1.05, zCellBars - 0.02); S.add("steel", lockBox);
    const sill = roundedBox(cellB[1] - cellA[0], 0.04, 0.12, 0.01, 1); tint(sill, C("#3e4852")); sill.translate((cellA[0] + cellB[1]) / 2, 0.02, zCellBars); S.add("steel", sill); }
  // the sliding door (its own mesh, moved by set({cellDoor}))
  const doorGroup = new THREE.Group(); doorGroup.name = "cellDoor"; C0.add(doorGroup);
  { const parts = barsGeoms({ w: doorW, h: barH - 0.16, straps: [0.12, 1.05, 1.9] }); for (const g of parts) tint(g, C("#46525e"));
    const hangers = []; for (const x of [0.15, doorW - 0.15]) { const w = new THREE.CylinderGeometry(0.035, 0.035, 0.03, 14); w.rotateX(Math.PI / 2); w.translate(x, barH - 0.12, 0.0); hangers.push(tint(w, C("#222")));
      const s = roundedBox(0.03, 0.08, 0.02, 0.005, 1); s.translate(x, barH - 0.17, 0); hangers.push(tint(s, C("#333"))); }
    const handle = roundedBox(0.06, 0.25, 0.05, 0.015, 2); tint(handle, C("#2a2e32")); handle.translate(0.04, 1.05, -0.05);
    const dm = new THREE.Mesh(mergeAll([...parts, ...hangers, handle]), M.bars); dm.castShadow = dm.receiveShadow = true; doorGroup.add(dm);
    doorGroup.position.set(doorX0, 0, zCellBars - 0.1); }
  // bunk: steel shelf on wall brackets + chains, thin striped mattress, folded blanket, pillow
  const bunkX = (cellB[0] + cellB[1]) / 2 + 0.25, bunkZ = zB - 0.4, bunkY = 0.45;
  { piece("steel", roundedBox(1.9, 0.05, 0.72, 0.012, 2), [bunkX, bunkY, bunkZ], [0, 0, 0], { color: "#6a767e" });
    piece("steel", roundedBox(1.9, 0.12, 0.03, 0.01, 1), [bunkX, bunkY - 0.04, bunkZ - 0.35], [0, 0, 0], { color: "#5c676e" });
    for (const s of [-0.8, 0.8]) { piece("steel", roundedBox(0.04, 0.4, 0.04, 0.008, 1), [bunkX + s, bunkY - 0.22, bunkZ + 0.33], [0, 0, 0], { color: "#5c676e" });
      const ch = []; for (let k = 0; k < 12; k++) { const t = k / 11; ch.push(new THREE.Vector3(bunkX + s, bunkY + 0.03 + t * 0.95, bunkZ - 0.34 + t * 0.66)); }
      for (let k = 0; k < 11; k++) { const a = ch[k], b = ch[k + 1], l = new THREE.TorusGeometry(0.035, 0.007, 6, 12); l.scale(1, 1.6, 1); l.lookAt(b.clone().sub(a)); if (k % 2) l.rotateZ(0); l.rotateY(k % 2 ? Math.PI / 2 : 0);
        l.translate((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2); tint(l, C("#444c52")); S.add("steel", l); } }
    piece("cloth", roundedBox(1.85, 0.09, 0.68, 0.04, 3), [bunkX, bunkY + 0.07, bunkZ], [0, 0, 0], { tile: 0.5, color: "#a3aca0" });
    for (let k = 0; k < 9; k++) piece("cloth", roundedBox(0.04, 0.092, 0.69, 0.01, 1), [bunkX - 0.8 + k * 0.2, bunkY + 0.071, bunkZ], [0, 0, 0], { color: "#7a8a7c" });
    piece("cloth", roundedBox(0.5, 0.12, 0.6, 0.05, 3), [bunkX + 0.62, bunkY + 0.17, bunkZ + 0.02], [0, 0.05, 0], { tile: 0.4, color: "#6a5a48" });
    piece("cloth", roundedBox(0.42, 0.09, 0.3, 0.045, 3), [bunkX - 0.7, bunkY + 0.16, bunkZ + 0.1], [0, -0.1, 0.05], { tile: 0.4, color: "#e2e0d6" }); }
  { // steel toilet + sink combo in the corner, cup
    const tx = cellB[0] + 0.45, tz = zB - 0.3;
    piece("steel", roundedBox(0.5, 0.95, 0.32, 0.04, 3), [tx, 0.475, tz], [0, 0, 0], { color: "#a8b2b6" });
    const bowl = lathe([[0.0001, 0], [0.16, 0], [0.2, 0.32], [0.21, 0.42], [0.18, 0.43], [0.0001, 0.2]], 24); bowl.scale(1, 1, 1.25); tint(bowl, C("#b8c2c6")); bowl.translate(tx, 0, tz - 0.36); S.add("steel", bowl);
    piece("steel", roundedBox(0.36, 0.05, 0.22, 0.02, 2), [tx, 0.97, tz - 0.12], [0, 0, 0], { color: "#c0c8cc" });
    const btn = new THREE.CylinderGeometry(0.02, 0.02, 0.02, 12); btn.rotateX(Math.PI / 2); tint(btn, C("#888")); btn.translate(tx + 0.15, 0.8, tz - 0.165); S.add("steel", btn); }
  // cell graffiti tally marks on the back wall (paint strokes)
  for (let k = 0; k < 4; k++) for (let m = 0; m < 5; m++) { const s = roundedBox(0.012, 0.12, 0.004, 0.002, 1); if (m === 4) { s.rotateZ(1.1); } tint(s, C("#2a3238"));
    s.translate(W - (cellB[0] + 0.95 + k * 0.17 + (m === 4 ? 0.035 : m * 0.018)), 1.5, 0.002); S.add("paint", XF.back(s)); }
  // caged bulb on the corridor ceiling (the cell key light) + cage
  const cellLampP = new THREE.Vector3(cellB[0] + 0.6, H - 0.25, zCellBars - 1.0);
  { const base = roundedCylinder(0.08, 0.04, 0.01, 20); tint(base, C("#3a4248")); base.translate(cellLampP.x, H - 0.03, cellLampP.z); S.add("steel", base);
    for (let k = 0; k < 6; k++) { const a = (k / 6) * Math.PI * 2; const w = tube([new THREE.Vector3(cellLampP.x + Math.cos(a) * 0.06, H - 0.05, cellLampP.z + Math.sin(a) * 0.06), new THREE.Vector3(cellLampP.x + Math.cos(a) * 0.09, cellLampP.y + 0.02, cellLampP.z + Math.sin(a) * 0.09), new THREE.Vector3(cellLampP.x, cellLampP.y - 0.1, cellLampP.z)], 0.004, 12, 4); tint(w, C("#30383e")); S.add("steel", w); }
    mesh(new THREE.SphereGeometry(0.045, 16, 10), bulbM, [cellLampP.x, cellLampP.y, cellLampP.z], [0, 0, 0], C0, { cast: false }); }

  // ------------------------------------------------------------------ merge buckets into the shared shell
  const shell = new THREE.Group(); shell.name = "police_shell"; group.add(shell);
  const meshes = S.build(shell, { noCast: ["mortar"] });

  // ------------------------------------------------------------------ lights (one warm key per room, cool night fill)
  const spot = (color, I, pos, tgt, angle, pen, parent, mapSize = 1024) => { const l = new THREE.SpotLight(color, I, 0, angle, pen, 2); l.position.copy(pos); l.target.position.copy(tgt); parent.add(l, l.target);
    l.castShadow = true; l.shadow.mapSize.set(mapSize, mapSize); l.shadow.bias = -0.0005; l.shadow.normalBias = 0.02; l.shadow.radius = 4; l.shadow.camera.near = 0.1; l.shadow.camera.far = 14; return l; };
  const deskLamp = spot(0xffb466, 9, deskLampPos, new THREE.Vector3(deskLampPos.x - 0.6, 0.6, deskLampPos.z + 0.6), 1.25, 0.9, rooms.lobby);
  const deskGlow = new THREE.PointLight(0xffa860, 1.6, 0, 2); deskGlow.position.copy(deskLampPos).add(new THREE.Vector3(0, 0.05, -0.25)); rooms.lobby.add(deskGlow);
  const interLamp = spot(0xffbe70, 22, lampP.clone().add(new THREE.Vector3(0, -0.02, 0)), new THREE.Vector3(IX, 0, IZ), 1.05, 0.65, I);
  const interBounce = new THREE.PointLight(0xffb070, 1.2, 0, 2); interBounce.position.set(IX, 1.0, IZ); I.add(interBounce);
  const cellLamp = spot(0xffb466, 30, cellLampP, new THREE.Vector3(bunkX - 0.3, 0.3, zB - 0.9), 1.0, 0.6, C0);
  const cellGlow = new THREE.PointLight(0xffa860, 1.2, 0, 2); cellGlow.position.copy(cellLampP).add(new THREE.Vector3(0, -0.1, -0.3)); C0.add(cellGlow);
  const moon = new THREE.DirectionalLight(0x8aa2ff, 0.9); moon.position.set(4.2, 6.5, D + 6); moon.target.position.set(4.2, 0, 10.5); C0.add(moon, moon.target);
  const hemi = new THREE.HemisphereLight(0x3c4c78, 0x2a2420, 0.7); group.add(hemi);
  const fluoFill = new THREE.PointLight(0xcfe0ff, 0.0, 0, 2); fluoFill.position.set(6, H - 0.4, 2.2); rooms.lobby.add(fluoFill);

  // ------------------------------------------------------------------ anchors (world)
  const Lw = (x, y, z) => toWorld(group, new THREE.Vector3(x, y, z));
  const yawW = (ly) => ly + Math.PI;                   // local yaw -> world yaw (group turned 180 deg); characters face +Z at yaw 0
  const tvWorld = new THREE.Vector3(); tvScreen.getWorldPosition(tvWorld);
  const anchors = {
    origin: new THREE.Vector3(...O.origin), door: Lw(dx, 0, 1.0), doorOutside: Lw(dx, 0, -0.6), doorFlight: [Lw(dx, 1.8, -2.5), Lw(dx, 1.8, 0.3), Lw(dx + 1.6, 1.9, 2.4)],
    deskSpot: Lw(deskX + 0.2, 0, deskZ + 0.7), newspaperSpot: Lw(newspaperLocal.x, newspaperLocal.y, newspaperLocal.z),
    interrogationDoor: Lw(doorI, 0, zPb), interrogationChairRobber: Lw(robberSeat.x, 0, robberSeat.z), interrogationChairCop: Lw(copSeat.x, 0, copSeat.z),
    seatHeight: 0.48, tvScreenCenter: tvWorld.clone(), tvScreen: tvWorld.clone(), cellDoorwayInside: Lw(doorX0 + doorW / 2, 0, zCellBars + 0.5),
    cellInside: Lw(bunkX - 0.25, bunkY + 0.12, bunkZ - 0.05), cellDoor: Lw(doorX0, 1.05, zCellBars - 0.1), cellDoorOpen: Lw(doorX1, 1.05, zCellBars - 0.1),
    keyLightPos: Lw(deskLampPos.x, deskLampPos.y, deskLampPos.z),
    keyLights: { lobby: Lw(deskLampPos.x, deskLampPos.y, deskLampPos.z), interrogation: Lw(lampP.x, lampP.y, lampP.z), cells: Lw(cellLampP.x, cellLampP.y, cellLampP.z) },
    yaw: { deskSpot: yawW(Math.PI), interrogationChairRobber: yawW(Math.PI), interrogationChairCop: yawW(0), cellInside: yawW(Math.PI), door: yawW(0) },
    views: {
      deskWide: { pos: Lw(dx - 1.5, 2.05, 0.75), target: Lw(deskX + 0.1, 1.2, deskZ + 0.6), fov: 56 },
      interrogationWide: { pos: Lw(W - 0.75, 2.35, zPb + 0.55), target: Lw(IX - 0.3, 0.85, IZ + 0.5), fov: 64 },
      interrogationClose: { pos: Lw(IX - 1.5, 1.75, IZ - 2.55), target: Lw(IX + 0.05, 1.15, IZ + 0.72), fov: 55 },
      cellWide: { pos: Lw(doorX0 + 0.1, 1.6, zPb + 0.35), target: Lw(bunkX - 0.25, 0.8, bunkZ - 0.4), fov: 56 },
    },
  };
  anchors.views.tvClose = { pos: tvWorld.clone().add(Lw(0, 0, 0).sub(Lw(0, 0, 0))), target: tvWorld.clone(), fov: 30 };
  { const n = new THREE.Vector3(0, 0, 1).applyQuaternion(tvScreen.getWorldQuaternion(new THREE.Quaternion())); anchors.views.tvClose.pos = tvWorld.clone().addScaledVector(n, 1.7).add(new THREE.Vector3(0, 0.05, 0)); }

  // ------------------------------------------------------------------ controls
  const state = { cellDoor: 0 };
  const set = (c = {}) => { if (c.cellDoor !== undefined) { state.cellDoor = Math.min(1, Math.max(0, c.cellDoor));
    const k = state.cellDoor, e = k * k * (3 - 2 * k); doorGroup.position.x = doorX0 + (1 - e) * doorW; doorGroup.updateMatrixWorld(true); } };
  set({ cellDoor: O.cellDoor ?? 0 });
  let current = null;
  const setTime = (name) => { const T = POLICE_TIMES[name] || POLICE_TIMES.night; if (current === name) return; current = name;
    hemi.color.set(T.hemiSky); hemi.groundColor.set(T.hemiGround); hemi.intensity = T.hemiI; moon.color.set(T.moon); moon.intensity = T.moonI;
    fluoM.emissiveIntensity = T.fluo; outsideM.color.set(T.outside); fluoFill.intensity = name === "day" ? 3 : 0;
    deskLamp.intensity = 9 * T.lamp; interLamp.intensity = 22; cellLamp.intensity = 30 * T.lamp; };
  setTime(O.time);
  const update = () => {};
  group.updateMatrixWorld(true);
  return { group, anchors, set, setTime, update, tvScreen, rooms, meshes, lights: { deskLamp, deskGlow, interLamp, interBounce, cellLamp, cellGlow, moon, hemi, fluoFill },
    get time() { return current; } };
}

import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
function mergeAll(list) { return mergeGeometries(list.map((g) => { const n = g.index ? g.toNonIndexed() : g; for (const k of Object.keys(n.attributes)) if (!["position", "normal", "uv", "color"].includes(k)) n.deleteAttribute(k);
  if (!n.attributes.uv) boxUV(n, 1); if (!n.attributes.color) tint(n, C(0xffffff)); return n; }), false); }
