// BANK interior (video 2, LAYOUT_v02.md): a 1995 bank hall behind the street facade. Two instances (same layout, own palette).
//
//   const bank = await buildBank({ preset: "first" });      // or "peoples", or full opts { name, palette, origin, size, doorX }
//   scene.add(bank.group); bank.setTime("day"|"morning"|"night"); bank.update(t, camera);
//   bank.anchors = { door, doorOutside, counterSpot, tellerSpot, managerSpot, cctv, keyLightPos, yaw: {counterSpot, tellerSpot, ...},
//                    views: { hallWide, counterClose, cctvView, cctvDoor } }       // views = { pos, target, fov } world, vertical fov deg
//   bank.cctvView === bank.anchors.views.cctvView (the exact view from the security camera lens)
//   bank.lights = { sun, counterSpot, fill, hemi }
// Local frame: x 0..W along world +X from origin.x, z 0..D from the facade plane (origin.z) into the bank (+Z), floor y 0.
// Front wall z 0.1..0.5 (world z +8.6..+9.0) with the door opening at doorX (open glass leaves) + high windows (daylight key).
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { pbr, plain, canvasTex } from "../materials.js";
import {
  C, makeBuilder, marbleTex, posterTex, clockTex, labelTex, tileField, panelWall, pilaster, cornice, frameGeoms, stanchionGeom, ropeGeom,
  cctvCamera, bracketGeoms, wallRects, plantGeoms, toWorld, viewW, roundedBox, boxUV, grainUV, tint, lathe, place, tube, roundedCylinder,
} from "./interiorKit.js";

export const BANK_PALETTES = {
  green: { floorA: "#efe7d6", floorB: "#2e5a46", floorC: "#d9cdb4", wain: "marble", wainA: "#ece2cc", wainB: "#2f5c47", wall: "#eadfc6",
    trim: "#f3ebd9", accent: "#24503e", accentKind: "marble", ceil: "#f1e9d8", beam: "#e6dac0", brass: "#d0a548", rope: "#1f5a3e", wood: "#7a5234",
    leather: "#23402f", posterBand: "#24503e", plaque: "#1d3d2e" },
  burgundy: { floorA: "#eadbc2", floorB: "#5a1c24", floorC: "#c9b08e", wain: "wood", wainA: "#9a6038", wainB: "#7c4a2a", wall: "#e9cfaa",
    trim: "#8a5a3a", accent: "#8a5430", accentKind: "wood", ceil: "#eadcc6", beam: "#8c6a50", brass: "#cf9f45", rope: "#7a1f2c", wood: "#8a5430",
    leather: "#6a1e28", posterBand: "#6e2129", plaque: "#4a1a20" },
};

export const BANK_PRESETS = {
  first: { name: "FIRST CITY BANK", palette: "green", origin: [-4, 0, 8.5], size: [12, 5.2, 13.5], doorX: 2, seed: 21, clock: [10, 42],
    posters: [["SAVE", "5.25%", "PASSBOOK SAVINGS"], ["HOME", "LOANS", "ASK INSIDE"], ["FDIC", "INSURED", "EACH DEPOSITOR"], ["NEW!", "ATM CARD", "24 HOUR BANKING"]] },
  peoples: { name: "PEOPLES SAVINGS & LOAN", palette: "burgundy", origin: [14, 0, 8.5], size: [10, 5.2, 11.5], doorX: 19, seed: 37, clock: [11, 37],
    posters: [["CDs", "6.10%", "12 MONTH TERM"], ["AUTO", "LOANS", "LOW RATES"], ["FDIC", "INSURED", "EACH DEPOSITOR"], ["THANK", "YOU", "FOR SAVING WITH US"]] },
};

export const BANK_TIMES = {
  day:     { sunDir: [0.32, 0.56, -0.76], sun: "#fff1dc", sunI: 4.2, hemiSky: "#cfe0ff", hemiGround: "#b89a74", hemiI: 0.9, globe: 1.6, fixI: 9, spotI: 26 },
  morning: { sunDir: [0.62, 0.36, -0.70], sun: "#ffcf96", sunI: 3.8, hemiSky: "#bfd0f0", hemiGround: "#a88a68", hemiI: 0.75, globe: 1.6, fixI: 9, spotI: 26 },
  night:   { sunDir: [0.30, 0.50, -0.80], sun: "#8aa0ff", sunI: 0.35, hemiSky: "#3a4a80", hemiGround: "#3a2a1c", hemiI: 0.35, globe: 2.0, fixI: 12, spotI: 30 },
};

export async function buildBank(opts = {}) {
  const pre = BANK_PRESETS[opts.preset || (opts.palette === "burgundy" ? "peoples" : "first")];
  const O = { ...pre, time: "day", ...opts };
  const P = typeof O.palette === "string" ? BANK_PALETTES[O.palette] : { ...BANK_PALETTES.green, ...O.palette };
  const [W, H, D] = O.size; const dx = O.doorX - O.origin[0];
  const group = new THREE.Group(); group.name = "bank_" + O.name.replace(/\W+/g, "_"); group.position.set(...O.origin); group.updateMatrixWorld(true);

  // ------------------------------------------------------------------ materials
  const mtex = marbleTex({ seed: O.seed, freq: 2.5 });
  const marble = new THREE.MeshStandardMaterial({ map: mtex, vertexColors: true, roughness: 0.16, metalness: 0, envMapIntensity: 0.9 });
  const M = {
    marble,
    grout: plain("#5a5246", { roughness: 0.95, relief: 0.2 }),
    plaster: await pbr("plaster", { normalScale: 1.1, roughness: 1 }),
    paint: plain("#ffffff", { roughness: 0.6, relief: 0.25, vertexColors: true }),
    wood: await pbr("wood", { normalScale: 1.2, roughness: 0.85 }),
    darkWood: await pbr("darkWood", { normalScale: 1.2 }),
    brass: plain(P.brass, { roughness: 0.28, metalness: 0.85, relief: 0.15, envMapIntensity: 1.8 }),
    steel: plain("#9aa3a8", { roughness: 0.35, metalness: 0.8, relief: 0.3, envMapIntensity: 1.5, vertexColors: true }),
    cloth: plain("#ffffff", { roughness: 0.9, relief: 0.3, vertexColors: true }),
    paper: plain("#ffffff", { roughness: 0.8, relief: 0.05, vertexColors: true }),
    plastic: plain("#ffffff", { roughness: 0.5, relief: 0.1, vertexColors: true }),
    leaf: plain("#ffffff", { roughness: 0.6, relief: 0.2, vertexColors: true, side: THREE.DoubleSide }),
  };
  const glass = new THREE.MeshStandardMaterial({ color: C("#cfe6e0"), roughness: 0.04, metalness: 0.1, transparent: true, opacity: 0.16, envMapIntensity: 1.6, depthWrite: false });
  const winGlass = new THREE.MeshStandardMaterial({ color: C("#e8f2ff"), roughness: 0.05, metalness: 0.0, transparent: true, opacity: 0.1, envMapIntensity: 1.0, depthWrite: false });
  const globeM = new THREE.MeshStandardMaterial({ color: C("#fff6e6"), emissive: C("#ffd9a0"), emissiveIntensity: 1.6, roughness: 0.4 });
  const screenM = new THREE.MeshStandardMaterial({ color: C("#0b1a12"), emissive: C("#3cff8a"), emissiveIntensity: 0.25, roughness: 0.2,
    emissiveMap: canvasTex(256, 192, (g, w, h) => { g.fillStyle = "#000"; g.fillRect(0, 0, w, h); g.fillStyle = "#6f6"; g.font = "bold 16px monospace";
      ["ACCT  4471-0293", "BAL   $1,204.55", "TRANS DEP", "> _"].forEach((s, i) => g.fillText(s, 14, 34 + i * 30)); }) });
  const ledM = new THREE.MeshStandardMaterial({ color: C("#300"), emissive: C("#ff2a1a"), emissiveIntensity: 3, roughness: 0.3 });
  const lensM = new THREE.MeshStandardMaterial({ color: C("#0a0c10"), roughness: 0.08, metalness: 0.4, envMapIntensity: 2 });
  const camBody = plain("#d6d0c2", { roughness: 0.45, relief: 0.1 });
  const camMetal = plain("#3a3d42", { roughness: 0.4, metalness: 0.6, relief: 0.1 });

  const S = makeBuilder(M, O.seed);
  const { r, piece } = S;
  const extra = new THREE.Group(); extra.name = "details"; group.add(extra);
  const mesh = (geo, mat, pos = [0, 0, 0], rot = [0, 0, 0], { cast = true, receive = true, parent = extra } = {}) => {
    const m = new THREE.Mesh(geo, mat); m.position.set(...pos); m.rotation.set(...rot); m.castShadow = cast; m.receiveShadow = receive; parent.add(m); return m; };
  const xform = (list, pos, rotY = 0) => list.map((g) => place(g, pos, [0, rotY, 0]));
  const zc = Math.round(D * 0.6 * 2) / 2;        // teller counter front line (local z)
  const zb = D - 0.2;                            // back wall inner face
  const xL = 0.2, xR = W - 0.2;                  // side wall inner faces
  const isMarble = P.wain === "marble";

  // ------------------------------------------------------------------ floor: real marble tiles with grout joints + border band
  { const g = new THREE.PlaneGeometry(W, D); g.rotateX(-Math.PI / 2); g.translate(W / 2, -0.008, D / 2); S.add("grout", g); }
  const T = 0.5, nx = Math.round((xR - xL) / T), nz = Math.round((zb - 0.5) / T);
  S.B.marble.push(...tileField({ x0: xL, x1: xR, z0: 0.5, z1: zb, tile: T, gap: 0.007, thick: 0.016, bevel: 0.004, top: 0.002, tex: 1.6, r,
    colorAt: (i, j) => (i === 0 || j === 0 || i === nx - 1 || j === nz - 1) ? P.floorB : (i === 1 || j === 1 || i === nx - 2 || j === nz - 2) ? P.floorC : (i + j) % 2 ? P.floorA : P.floorB }));
  // threshold slab in the door opening
  piece("marble", roundedBox(2.3, 0.03, 0.42, 0.008, 2), [dx, 0.0, 0.3], [0, 0, 0], { tile: 1.4, color: P.floorC });

  // ------------------------------------------------------------------ walls
  const WAIN = 1.25;
  // side + back walls: plaster slab (behind), wainscot, string course, cornice
  const wallRun = (len, toWorldXf, opens = []) => {   // builds one wall in local XY (x 0..len), face +Z; toWorldXf(g) places it
    for (const q of wallRects(len, H, opens)) { const g = roundedBox(q.x1 - q.x0, q.y1 - q.y0, 0.2, 0.004, 1); boxUV(g, 2.2, [r() * 5, r() * 5]); tint(g, C(P.wall)); g.translate((q.x0 + q.x1) / 2, (q.y0 + q.y1) / 2, -0.1); S.add("plaster", toWorldXf(g)); }
    // wainscot
    const segs = []; let x = 0; for (const o of [...opens].sort((a, b) => a.x0 - b.x0)) { if (o.y0 < WAIN) { if (o.x0 - x > 0.3) segs.push([x, o.x0]); x = o.x1; } } if (len - x > 0.3) segs.push([x, len]);
    for (const [a, b] of segs) {
      const { frame, panel } = panelWall({ len: b - a, h: WAIN, bays: Math.max(1, Math.round((b - a) / 1.0)), r });
      for (const g of frame) { tint(g, C(isMarble ? P.wainB : P.wainB)); g.translate(a, 0, 0); S.add(isMarble ? "marble" : "wood", toWorldXf(g)); }
      for (const g of panel) { boxUV(g, 1.4, [r() * 5, r() * 5]); tint(g, C(P.wainA)); g.translate(a, 0, 0); S.add(isMarble ? "marble" : "wood", toWorldXf(g)); }
      // string course at 3.1 m + picture rail
      const sc = roundedBox(b - a, 0.12, 0.07, 0.02, 2); boxUV(sc, 1.2); tint(sc, C(P.trim)); sc.translate((a + b) / 2, 3.15, 0.035); S.add("paint", toWorldXf(sc));
      const sc2 = roundedBox(b - a, 0.04, 0.04, 0.012, 2); boxUV(sc2, 1.2); tint(sc2, C(P.trim)); sc2.translate((a + b) / 2, 3.04, 0.02); S.add("paint", toWorldXf(sc2));
    }
    const cg = cornice(len, { depth: 0.3, height: 0.42 }); tint(cg, C(P.trim)); cg.translate(0, H, 0); S.add("paint", toWorldXf(cg));
  };
  // wall frames: build in local XY (x along the wall, face +Z), then place. left: face +X, world z = D - x; right: face -X, world z = x
  const leftXf = (g) => { g.rotateY(Math.PI / 2); g.translate(xL, 0, D); return g; };
  const rightXf = (g) => { g.rotateY(-Math.PI / 2); g.translate(xR, 0, 0); return g; };
  const backXf = (g) => { g.rotateY(Math.PI); g.translate(W, 0, zb); return g; };               // x->-X (from W), face -> -Z
  const frontXf = (g) => { g.translate(0, 0, 0.5); return g; };                                  // face +Z at z 0.5
  wallRun(D, leftXf); wallRun(D, rightXf); wallRun(W, backXf);
  // front wall: door + 2 high windows + transom, thickness 0.4 (z 0.1..0.5)
  const winW = 1.7, winY0 = 2.55, winY1 = 4.55, wx = [Math.max(1.4, dx - 3.6), Math.min(W - 1.4, dx + 3.6)];
  const opens = [{ x0: dx - 1.1, x1: dx + 1.1, y0: 0, y1: 3.1 }, { x0: dx - 1.0, x1: dx + 1.0, y0: 3.45, y1: 4.55 }, ...wx.map((x) => ({ x0: x - winW / 2, x1: x + winW / 2, y0: winY0, y1: winY1 }))];
  for (const q of wallRects(W, H, opens)) { const g = roundedBox(q.x1 - q.x0, q.y1 - q.y0, 0.4, 0.004, 1); boxUV(g, 2.2, [r() * 5, r() * 5]); tint(g, C(P.wall)); g.translate((q.x0 + q.x1) / 2, (q.y0 + q.y1) / 2, 0.3); S.add("plaster", g); }
  { // wainscot + cornice on the front wall (inner face)
    for (const [a, b] of [[0, dx - 1.4], [dx + 1.4, W]]) { if (b - a < 0.4) continue;
      const { frame, panel } = panelWall({ len: b - a, h: WAIN, bays: Math.max(1, Math.round((b - a) / 1.0)), r });
      for (const g of frame) { tint(g, C(P.wainB)); g.translate(a, 0, 0); S.add(isMarble ? "marble" : "wood", frontXf(g)); }
      for (const g of panel) { tint(g, C(P.wainA)); g.translate(a, 0, 0); S.add(isMarble ? "marble" : "wood", frontXf(g)); } }
    const cg = cornice(W, { depth: 0.3, height: 0.42 }); tint(cg, C(P.trim)); cg.translate(0, H, 0); S.add("paint", frontXf(cg));
  }
  // window frames (deep reveals, mullions, sills) + glass
  for (const o of opens.slice(1)) {
    const w = o.x1 - o.x0, h = o.y1 - o.y0, cx = (o.x0 + o.x1) / 2, cy = (o.y0 + o.y1) / 2;
    for (const g of frameGeoms(w, h, { bar: 0.1, depth: 0.06 })) { tint(g, C(P.trim)); g.translate(cx, cy, 0.5); S.add("paint", g); }
    const nm = Math.max(1, Math.round(w / 0.6)) - 1;
    for (let i = 1; i <= nm; i++) { const g = roundedBox(0.05, h, 0.07, 0.012, 2); boxUV(g, 1); tint(g, C(P.trim)); g.translate(o.x0 + (w * i) / (nm + 1), cy, 0.28); S.add("paint", g); }
    for (const yy of [o.y0 + h * 0.62]) { const g = roundedBox(w, 0.05, 0.07, 0.012, 2); boxUV(g, 1); tint(g, C(P.trim)); g.translate(cx, yy, 0.28); S.add("paint", g); }
    const sill = roundedBox(w + 0.3, 0.07, 0.24, 0.02, 2); boxUV(sill, 1.2); tint(sill, C(P.floorC)); sill.translate(cx, o.y0 - 0.02, 0.56); S.add("marble", sill);
    const gl = new THREE.Mesh(new THREE.PlaneGeometry(w, h), winGlass); gl.position.set(cx, cy, 0.26); gl.rotation.y = Math.PI; gl.castShadow = false; gl.receiveShadow = false; gl.name = "glass"; gl.renderOrder = 3; extra.add(gl);
  }
  // door: brass casing + two open glass leaves swung inward against the wall
  { const w = 2.2, h = 3.1;
    for (const g of frameGeoms(w, h, { bar: 0.12, depth: 0.07 })) { g.translate(dx, h / 2, 0.5); S.add("brass", g); }
    for (const s of [-1, 1]) {
      const leaf = new THREE.Group(); leaf.position.set(dx + s * 1.08, 0, 0.55); leaf.rotation.y = s * Math.PI / 2 * 0.92; extra.add(leaf);
      const lw = 1.02, lh = 2.85, lg = [];
      for (const [bw, bh, x, y] of [[lw, 0.12, 0, 0.06 + 0.02], [lw, 0.08, 0, lh - 0.04], [0.07, lh, -lw / 2 + 0.035, lh / 2], [0.07, lh, lw / 2 - 0.035, lh / 2], [lw, 0.05, 0, 1.0]]) {
        const g = roundedBox(bw, bh, 0.05, 0.012, 2); g.translate(x, y, 0); lg.push(g); }
      const pb = tube([new THREE.Vector3(-0.35, 1.05, 0.08), new THREE.Vector3(-0.3, 1.05, 0.1), new THREE.Vector3(0.3, 1.05, 0.1), new THREE.Vector3(0.35, 1.05, 0.08)], 0.018, 16, 8); lg.push(pb);
      for (const g of lg) g.translate(-s * lw / 2, 0, 0);
      const lm = new THREE.Mesh(mergeLocal(lg), M.brass); lm.castShadow = true; lm.receiveShadow = true; leaf.add(lm);
      const gl = new THREE.Mesh(new THREE.PlaneGeometry(lw - 0.12, lh - 0.25), glass); gl.position.set(-s * lw / 2, lh / 2 + 0.03, 0); gl.renderOrder = 3; gl.castShadow = false; leaf.add(gl);
      const lab = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.07), new THREE.MeshStandardMaterial({ map: labelTex(s < 0 ? "PUSH" : "PULL", { w: 256, h: 40, bg: "#c8a24a", ink: "#2a1a08", size: 0.7 }), roughness: 0.4 }));
      lab.position.set(-s * lw / 2, 1.25, 0.03); leaf.add(lab);
    }
  }

  // pilasters on the side + back walls (between them: posters)
  const pilXs = []; { const n = Math.max(3, Math.round(D / 2.8)); for (let i = 1; i < n; i++) pilXs.push((D * i) / n); }
  for (const z of pilXs) for (const xf of [leftXf, rightXf]) {
    for (const g of pilaster({ h: H - 0.4, w: 0.46, d: 0.12 })) { tint(g, C(isMarble ? P.trim : P.wainA)); g.translate(xf === leftXf ? z : D - z, 0, 0); S.add(isMarble ? "paint" : "wood", xf(g)); }
  }
  for (const x of [1.4, W - 1.4]) for (const g of pilaster({ h: H - 0.4, w: 0.46, d: 0.12 })) { tint(g, C(isMarble ? P.trim : P.wainA)); g.translate(W - x, 0, 0); S.add(isMarble ? "paint" : "wood", backXf(g)); }

  // posters in profiled frames (side walls between pilasters, at eye level above the wainscot)
  const posterSlots = [];
  { const zs = [...pilXs]; const mids = []; for (let i = 0; i < zs.length - 1; i++) mids.push((zs[i] + zs[i + 1]) / 2);
    const front = mids.filter((z) => z < zc - 0.8);
    front.slice(0, 2).forEach((z, i) => posterSlots.push({ side: "L", z })); front.slice(0, 2).forEach((z, i) => posterSlots.push({ side: "R", z })); }
  posterSlots.forEach((s, i) => {
    const txt = O.posters[i % O.posters.length]; const pw = 0.78, ph = 1.08;
    const tex = posterTex([[txt[0], 0.13, "#ffffff", 0.07], [txt[1], 0.2, P.posterBand, 0.36], [txt[2], 0.055, "#3a3026", 0.68]], { bg: "#f4ecda", band: P.posterBand, seed: i + O.seed, font: "Arial Black" });
    const xf = s.side === "L" ? leftXf : rightXf; const at = s.side === "L" ? D - s.z : s.z;
    for (const g of frameGeoms(pw, ph, { bar: 0.07, depth: 0.05 })) { tint(g, C(P.wood)); g.translate(at, 2.05, 0.02); S.add("darkWood", xf(g)); }
    const pg = new THREE.PlaneGeometry(pw, ph); pg.translate(at, 2.05, 0.035); xf(pg);
    mesh(pg, new THREE.MeshStandardMaterial({ map: tex, roughness: 0.55 }), [0, 0, 0], [0, 0, 0], { cast: false });
  });

  // ------------------------------------------------------------------ ceiling: coffers with stepped mouldings + rosettes
  { const g = new THREE.PlaneGeometry(W, D); g.rotateX(Math.PI / 2); g.translate(W / 2, H, D / 2); boxUV(g, 2.2); tint(g, C(P.ceil)); S.add("plaster", g); }
  const cx = Math.max(3, Math.round(W / 2.4)), cz = Math.max(3, Math.round(D / 2.4)), cw = W / cx, cd = D / cz;
  for (let i = 0; i <= cx; i++) { const g = roundedBox(0.3, 0.34, D, 0.03, 2); boxUV(g, 1.4); tint(g, C(P.beam)); g.translate(i * cw, H - 0.17, D / 2); S.add("paint", g); }
  for (let j = 0; j <= cz; j++) { const g = roundedBox(W, 0.34, 0.3, 0.03, 2); boxUV(g, 1.4); tint(g, C(P.beam)); g.translate(W / 2, H - 0.17, j * cd); S.add("paint", g); }
  const pendants = [];
  // keep globes out of the security camera's sight line (cctv -> counter) and away from the lens
  const camP = new THREE.Vector3(W - 0.7, H - 1.05, 0.95), camT = new THREE.Vector3(dx - 0.2, 1.3, zc - 0.55), seg = new THREE.Line3(camP, camT), tmpP = new THREE.Vector3();
  const clearOfCctv = (x, z) => { const p = new THREE.Vector3(x, H - 1.0, z); seg.closestPointToPoint(p, true, tmpP); return tmpP.distanceTo(p) > 1.8 && p.distanceTo(camP) > 5.0; };
  for (let i = 0; i < cx; i++) for (let j = 0; j < cz; j++) {
    const x0 = i * cw, z0 = j * cd, mx = x0 + cw / 2, mz = z0 + cd / 2;
    for (const [w, d, x, z] of [[cw - 0.3, 0.07, mx, z0 + 0.19], [cw - 0.3, 0.07, mx, z0 + cd - 0.19], [0.07, cd - 0.3, x0 + 0.19, mz], [0.07, cd - 0.3, x0 + cw - 0.19, mz]]) {
      const g = roundedBox(w, 0.1, d, 0.025, 2); boxUV(g, 1.4); tint(g, C(P.trim)); g.translate(x, H - 0.05, z); S.add("paint", g); }
    const ros = lathe([[0.0001, 0], [0.26, 0], [0.24, -0.03], [0.17, -0.05], [0.12, -0.09], [0.05, -0.1], [0.0001, -0.1]], 24); boxUV(ros, 1); tint(ros, C(P.trim)); ros.translate(mx, H, mz); S.add("paint", ros);
    if (((i + j) % 2 === 0 || cx * cz <= 9) && j > 0 && clearOfCctv(mx, mz)) pendants.push(new THREE.Vector3(mx, H, mz));
  }
  for (const p of pendants) {   // brass stem + opal globe
    const drop = 0.72;
    const st = new THREE.CylinderGeometry(0.012, 0.012, drop, 8); st.translate(p.x, H - drop / 2 - 0.08, p.z); S.add("brass", st);
    const cap = lathe([[0.0001, 0], [0.09, 0], [0.11, -0.04], [0.07, -0.08], [0.0001, -0.09]], 20); cap.translate(p.x, H - drop - 0.06, p.z); S.add("brass", cap);
    const gl = mesh(new THREE.SphereGeometry(0.2, 28, 18), globeM, [p.x, H - drop - 0.3, p.z], [0, 0, 0], { cast: false }); gl.name = "globe";
  }

  // ------------------------------------------------------------------ teller counter (front faces -Z at z = zc)
  const cL = xL, cR = W - 1.7, cMid = (cL + cR) / 2, cLen = cR - cL, CH = 1.06;
  const accKey = P.accentKind === "marble" ? "marble" : "wood";
  piece(accKey, roundedBox(cLen, 0.14, 0.72, 0.02, 2), [cMid, 0.07, zc + 0.3], [0, 0, 0], { tile: 1.4, color: P.floorB });                  // plinth
  piece(accKey, roundedBox(cLen, CH - 0.2, 0.62, 0.01, 1), [cMid, 0.14 + (CH - 0.2) / 2, zc + 0.36], [0, 0, 0], { tile: 1.4, color: P.accent }); // body
  { const { frame, panel } = panelWall({ len: cLen, h: CH - 0.24, bays: Math.round(cLen / 0.85), r, cap: false });   // raised panels on the front
    for (const g of [...frame, ...panel]) { tint(g, C(frame.includes(g) ? P.wainA : P.accent)); g.rotateY(Math.PI); g.translate(cR, 0.16, zc + 0.05); S.add(accKey, g); } }
  piece("marble", roundedBox(cLen + 0.1, 0.07, 0.82, 0.03, 3), [cMid, CH, zc + 0.31], [0, 0, 0], { tile: 1.6, color: P.floorA });          // bullnose top
  piece("marble", roundedBox(cLen + 0.06, 0.05, 0.06, 0.02, 2), [cMid, CH - 0.06, zc - 0.07], [0, 0, 0], { tile: 1.6, color: P.floorC });   // moulding under top
  // brass foot rail on brackets (profiled ends)
  { const rz = zc - 0.22, ry = 0.2; S.add("brass", tube([new THREE.Vector3(cL + 0.2, ry, rz), new THREE.Vector3(cR - 0.2, ry, rz)], 0.028, 8, 14));
    for (const x of [cL + 0.2, cR - 0.2]) { const e = new THREE.SphereGeometry(0.04, 16, 10); e.translate(x, ry, rz); S.add("brass", e); }
    for (let x = cL + 0.6; x < cR - 0.3; x += 1.2) { const b = lathe([[0.0001, 0], [0.03, 0], [0.018, 0.04], [0.018, 0.2], [0.0001, 0.2]], 12); b.rotateX(-Math.PI / 2); b.translate(x, ry, zc + 0.04 - 0.02); S.add("brass", b);
      const ring = new THREE.TorusGeometry(0.034, 0.008, 8, 16); ring.translate(x, ry, rz); S.add("brass", ring); } }
  // glass partitions: brass mullions at bay edges, top rail with teller plaques, glass with speak grille + deal tray slot
  const bayW = 1.7, bays = []; { let k0 = Math.ceil((cL + 0.5 - dx) / bayW - 0.5), k1 = Math.floor((cR - 0.5 - dx) / bayW + 0.5);
    for (let k = k0; k <= k1; k++) { const x = dx + k * bayW; if (x - bayW / 2 >= cL - 0.01 && x + bayW / 2 <= cR + 0.01) bays.push(x); } }
  const GT = 2.45, gz = zc + 0.22;
  const edges = [...new Set(bays.flatMap((x) => [x - bayW / 2, x + bayW / 2]).map((v) => +v.toFixed(3)))];
  for (const x of edges) {
    const post = lathe([[0.0001, 0], [0.05, 0], [0.05, 0.05], [0.035, 0.07], [0.03, GT - CH - 0.1], [0.04, GT - CH - 0.07], [0.04, GT - CH], [0.0001, GT - CH]], 16);
    post.translate(x, CH + 0.03, gz); S.add("brass", post); }
  { const a = edges[0], b = edges[edges.length - 1];
    piece(accKey, roundedBox(b - a + 0.16, 0.2, 0.16, 0.02, 2), [(a + b) / 2, GT + 0.1, gz], [0, 0, 0], { tile: 1.4, color: P.accent });
    piece("brass", roundedBox(b - a + 0.2, 0.035, 0.2, 0.012, 2), [(a + b) / 2, GT + 0.21, gz], [0, 0, 0], { uv: "keep" });
    piece("brass", roundedBox(b - a + 0.2, 0.025, 0.19, 0.01, 2), [(a + b) / 2, GT - 0.005, gz], [0, 0, 0], { uv: "keep" }); }
  bays.forEach((x, i) => {
    const gl = new THREE.Mesh(new THREE.PlaneGeometry(bayW - 0.1, GT - CH - 0.22), glass); gl.position.set(x, CH + 0.16 + (GT - CH - 0.22) / 2, gz); gl.castShadow = false; gl.renderOrder = 3; gl.name = "glass"; extra.add(gl);
    const grille = new THREE.TorusGeometry(0.075, 0.012, 8, 28); grille.translate(x, 1.62, gz - 0.006); S.add("brass", grille);
    for (let k = -2; k <= 2; k++) { const s = roundedBox(0.012, 0.11 - Math.abs(k) * 0.025, 0.008, 0.003, 1); s.translate(x + k * 0.028, 1.62, gz - 0.006); S.add("brass", s); }
    const tray = lathe([[0.0001, 0], [0.16, 0], [0.17, 0.035], [0.15, 0.03], [0.0001, 0.012]], 24); tray.scale(1.5, 1, 1); tray.translate(x, CH + 0.035, gz); S.add("brass", tray);   // deal tray under the slot
    const lt = labelTex(`TELLER ${i + 1}`, { w: 512, h: 96, bg: P.plaque, ink: "#e6c46e", size: 0.62 });
    mesh(new THREE.PlaneGeometry(0.62, 0.115), new THREE.MeshStandardMaterial({ map: lt, roughness: 0.35, metalness: 0.2 }), [x, GT + 0.1, gz - 0.082], [0, Math.PI, 0], { cast: false });
    // teller work shelf + cash drawer + CRT terminal behind the glass
    // CRT terminal on the counter behind the glass (screen faces the teller), cash tray, stamp
    { const mx = x + (i % 2 ? -0.5 : 0.5), mz = zc + 0.5;
      piece("plastic", roundedBox(0.34, 0.3, 0.32, 0.04, 3), [mx, CH + 0.24, mz], [0, 0, 0], { color: "#d9d2bf" });
      piece("plastic", roundedBox(0.26, 0.06, 0.24, 0.02, 2), [mx, CH + 0.065, mz], [0, 0, 0], { color: "#cfc7b2" });
      const sc = mesh(new THREE.PlaneGeometry(0.25, 0.19), screenM, [mx, CH + 0.25, mz + 0.162], [0, 0, 0], { cast: false }); sc.name = "crt";
      piece("plastic", roundedBox(0.3, 0.04, 0.2, 0.01, 2), [x - (i % 2 ? -0.35 : 0.35) * 0.4, CH + 0.055, zc + 0.6], [0, 0.1, 0], { color: "#3a3a3a" }); }
  });
  // counter end gate (low swing gate to the right) + end panel
  piece(accKey, roundedBox(0.12, CH, 0.8, 0.02, 2), [cR + 0.06, CH / 2, zc + 0.31], [0, 0, 0], { tile: 1.4, color: P.accent });
  { const gx0 = cR + 0.15, gx1 = xR - 0.05; piece("darkWood", roundedBox(gx1 - gx0, 0.7, 0.05, 0.015, 2), [(gx0 + gx1) / 2, 0.55, zc + 0.3], [0, 0, 0], { uv: "grain", color: P.wood });
    S.add("brass", tube([new THREE.Vector3(gx0, 0.92, zc + 0.3), new THREE.Vector3(gx1, 0.92, zc + 0.3)], 0.022, 6, 10)); }

  // ------------------------------------------------------------------ back wall: vault door, bank name, clock, cabinets
  { const vx = dx + 2.7 + 1.3 < W - 0.2 ? dx + 2.7 : dx - 2.7, vy = 1.45, vz = zb;
    const vf = roundedBox(2.5, 2.7, 0.12, 0.03, 2); boxUV(vf, 1); tint(vf, C("#8d969c")); vf.translate(vx, 1.35, vz + 0.0); S.add("steel", place(vf, [0, 0, -0.06]));
    const ring = new THREE.TorusGeometry(1.0, 0.09, 16, 64); ring.translate(vx, vy, vz - 0.14); S.add("steel", ring);
    const door = roundedCylinder(0.94, 0.22, 0.05, 64); door.rotateX(Math.PI / 2); tint(door, C("#b4bcc0")); door.translate(vx, vy, vz - 0.2); S.add("steel", door);
    for (const rr of [0.78, 0.55, 0.3]) { const t = new THREE.TorusGeometry(rr, 0.018, 8, 64); t.translate(vx, vy, vz - 0.315); S.add("steel", t); }
    for (let k = 0; k < 16; k++) { const a = (k / 16) * Math.PI * 2; const b = new THREE.CylinderGeometry(0.03, 0.03, 0.04, 12); b.rotateX(Math.PI / 2); b.translate(vx + Math.cos(a) * 0.86, vy + Math.sin(a) * 0.86, vz - 0.32); S.add("brass", b); }
    const hub = roundedCylinder(0.1, 0.12, 0.02, 24); hub.rotateX(Math.PI / 2); hub.translate(vx, vy, vz - 0.37); S.add("brass", hub);
    for (let k = 0; k < 3; k++) { const a = (k / 3) * Math.PI * 2 + 0.3; const sp = new THREE.CylinderGeometry(0.018, 0.018, 0.9, 10); sp.rotateZ(a); sp.translate(vx, vy, vz - 0.43); S.add("brass", sp);
      for (const s of [-1, 1]) { const kb = new THREE.SphereGeometry(0.045, 14, 10); kb.translate(vx + Math.cos(a + Math.PI / 2) * 0.45 * s, vy + Math.sin(a + Math.PI / 2) * 0.45 * s, vz - 0.43); S.add("brass", kb); } }
    for (const yy of [vy + 0.55, vy - 0.55]) { const h = roundedBox(0.2, 0.32, 0.22, 0.03, 2); boxUV(h, 1); tint(h, C("#7a8288")); h.translate(vx + 1.02, yy, vz - 0.16); S.add("steel", h); }
    const dial = roundedCylinder(0.09, 0.05, 0.01, 24); dial.rotateX(Math.PI / 2); dial.translate(vx - 0.42, vy + 0.4, vz - 0.33); S.add("brass", dial);
    // filing cabinets on the other side
    const fx = vx > dx ? dx - 2.0 : dx + 2.0;
    for (let k = 0; k < 2; k++) { const x = fx + (k - 0.5) * 0.52;
      piece("steel", roundedBox(0.5, 1.32, 0.62, 0.015, 2), [x, 0.66, zb - 0.32], [0, 0, 0], { color: isMarble ? "#4d6b5c" : "#6a5a4c" });
      for (let d = 0; d < 4; d++) { piece("steel", roundedBox(0.44, 0.28, 0.02, 0.01, 2), [x, 0.18 + d * 0.31, zb - 0.635], [0, 0, 0], { color: isMarble ? "#587a69" : "#7a6a5a" });
        piece("brass", roundedBox(0.12, 0.025, 0.03, 0.01, 1), [x, 0.26 + d * 0.31, zb - 0.655], [0, 0, 0], { uv: "keep" }); } }
  }
  { // bank name: gilt letters on a dark plaque in a profiled frame, high on the back wall
    const pw = Math.min(W - 3.6, 6.2), ph = 0.55, lt = labelTex(O.name, { w: 2048, h: 180, bg: P.plaque, ink: "#e8c66c", size: 0.6, font: "Times New Roman" });
    mesh(new THREE.PlaneGeometry(pw, ph), new THREE.MeshStandardMaterial({ map: lt, roughness: 0.35, metalness: 0.25, envMapIntensity: 1.2 }), [W / 2, 4.12, zb - 0.045], [0, Math.PI, 0], { cast: false });
    for (const g of frameGeoms(pw, ph, { bar: 0.08, depth: 0.05 })) { g.rotateY(Math.PI); g.translate(W / 2, 4.12, zb - 0.0); S.add("brass", g); }
  }
  { // wall clock above the centre teller window (big, brass rim, glass dome) -> in the CCTV + counter views
    const cxk = dx, cyk = 3.35, rr = 0.42;
    const rim = lathe([[rr - 0.02, 0], [rr + 0.05, 0], [rr + 0.06, 0.05], [rr + 0.03, 0.09], [rr - 0.01, 0.09]], 48); rim.rotateX(-Math.PI / 2); rim.translate(cxk, cyk, zb); S.add("brass", rim);
    const back = new THREE.CylinderGeometry(rr, rr, 0.06, 48); back.rotateX(Math.PI / 2); back.translate(cxk, cyk, zb - 0.03); S.add("darkWood", back);
    mesh(new THREE.CircleGeometry(rr - 0.01, 48), new THREE.MeshStandardMaterial({ map: clockTex({ hh: O.clock[0], mm: O.clock[1] }), roughness: 0.45 }), [cxk, cyk, zb - 0.062], [0, Math.PI, 0], { cast: false });
  }

  // ------------------------------------------------------------------ rope line (brass stanchions + velvet ropes), left of the door lane
  { const xa = dx - 0.85, xb = dx - 2.05, z0 = 2.8, z1 = zc - 1.35, n = Math.max(2, Math.round((z1 - z0) / 1.3));
    const posts = []; for (let i = 0; i <= n; i++) { const z = z0 + ((z1 - z0) * i) / n; posts.push([xa, z]); if (xb > xL + 0.8) posts.push([xb, z]); }
    for (const [x, z] of posts) { const g = stanchionGeom(0.98); g.translate(x, 0, z); S.add("brass", g); }
    const top = (x, z) => new THREE.Vector3(x, 0.93, z);
    const ropes = []; for (let i = 0; i < n; i++) { const za = z0 + ((z1 - z0) * i) / n, zb2 = z0 + ((z1 - z0) * (i + 1)) / n; ropes.push([top(xa, za), top(xa, zb2)]); if (xb > xL + 0.8) ropes.push([top(xb, za), top(xb, zb2)]); }
    if (xb > xL + 0.8) ropes.push([top(xa, z0), top(xb, z0)]);
    for (const [a, b] of ropes) { const g = ropeGeom(a.clone().add(new THREE.Vector3(0, -0.03, 0)), b.clone().add(new THREE.Vector3(0, -0.03, 0)), 0.16, 0.024); tint(g, C(P.rope)); S.add("cloth", g);
      for (const e of [a, b]) { const h = new THREE.CylinderGeometry(0.03, 0.03, 0.06, 10); h.translate(e.x, e.y - 0.04, e.z); S.add("brass", h); } }
  }

  // ------------------------------------------------------------------ manager's desk (left), banker's lamp, chairs
  const deskP = new THREE.Vector3(1.55, 0, Math.max(3.4, zc - 3.0));
  { const g = []; const dw = 0.85, dl = 1.7, dh = 0.76, X = deskP.x, Z = deskP.z;
    piece("darkWood", roundedBox(dw + 0.08, 0.05, dl + 0.08, 0.02, 3), [X, dh, Z], [0, 0, 0], { uv: "grain", tile: 1.2, color: P.wood });
    for (const s of [-1, 1]) { piece("darkWood", roundedBox(dw, dh - 0.06, 0.45, 0.012, 2), [X, (dh - 0.06) / 2 + 0.02, Z + s * (dl / 2 - 0.23)], [0, 0, 0], { uv: "grain", tile: 1.2, color: P.wood });
      for (let d = 0; d < 3; d++) { piece("darkWood", roundedBox(0.02, 0.18, 0.38, 0.008, 2), [X + dw / 2 + 0.008, 0.16 + d * 0.21, Z + s * (dl / 2 - 0.23)], [0, 0, 0], { uv: "grain", color: P.wood, jitter: 0.1 });
        piece("brass", roundedBox(0.025, 0.02, 0.1, 0.008, 1), [X + dw / 2 + 0.03, 0.2 + d * 0.21, Z + s * (dl / 2 - 0.23)], [0, 0, 0], { uv: "keep" }); } }
    piece("darkWood", roundedBox(0.02, 0.5, dl - 0.9, 0.008, 2), [X + dw / 2 - 0.12, 0.45, Z], [0, 0, 0], { uv: "grain", color: P.wood });   // modesty panel
    piece("cloth", roundedBox(0.5, 0.006, 0.7, 0.002, 1), [X + 0.05, dh + 0.028, Z], [0, 0, 0], { color: "#2d4a3a" });                     // blotter
    piece("paper", roundedBox(0.22, 0.02, 0.3, 0.004, 1), [X + 0.12, dh + 0.04, Z - 0.5], [0, 0.2, 0], { color: "#f1ece0" });
    piece("brass", roundedBox(0.36, 0.08, 0.05, 0.012, 2), [X + 0.3, dh + 0.065, Z + 0.15], [0, Math.PI / 2 - 0.25, 0], { uv: "keep" });      // nameplate
    // banker's lamp: brass base + green glass shade (emissive underside)
    const lb = lathe([[0.0001, 0], [0.09, 0], [0.09, 0.02], [0.03, 0.04], [0.015, 0.05], [0.0001, 0.05]], 20); lb.translate(X - 0.15, dh + 0.025, Z + 0.55); S.add("brass", lb);
    const ls = new THREE.CylinderGeometry(0.012, 0.012, 0.32, 8); ls.translate(X - 0.15, dh + 0.2, Z + 0.55); S.add("brass", ls);
    const shade = new THREE.CylinderGeometry(0.075, 0.075, 0.4, 20, 1, true, 0, Math.PI); shade.rotateZ(Math.PI / 2); shade.rotateY(Math.PI / 2);
    mesh(shade, new THREE.MeshStandardMaterial({ color: C("#0d5a32"), roughness: 0.15, emissive: C("#0a4020"), emissiveIntensity: 0.4, side: THREE.DoubleSide }), [X - 0.15, dh + 0.38, Z + 0.55]);
    const bulb = new THREE.PlaneGeometry(0.1, 0.36); bulb.rotateX(Math.PI / 2);
    mesh(bulb, new THREE.MeshStandardMaterial({ color: C("#fff4d8"), emissive: C("#ffe2a8"), emissiveIntensity: 1.2 }), [X - 0.15, dh + 0.385, Z + 0.55], [0, 0, 0], { cast: false });
    // chairs: manager (behind, toward the wall) + 2 client chairs
    const chair = (x, z, ry, back = 0.55) => { const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; extra.add(g);
      const parts = [[roundedBox(0.48, 0.09, 0.46, 0.035, 3), [0, 0.47, 0], "leather"], [roundedBox(0.46, back, 0.08, 0.035, 3), [0, 0.5 + back / 2, -0.2], "leather"]];
      for (const [sx, sz] of [[-0.2, -0.19], [0.2, -0.19], [-0.2, 0.19], [0.2, 0.19]]) parts.push([new THREE.CylinderGeometry(0.018, 0.014, 0.43, 8), [sx, 0.215, sz], "wood"]);
      for (const [geo, p, k] of parts) { const m = new THREE.Mesh(geo, k === "leather" ? leatherM : M.darkWood); if (k !== "leather") { grainUV(geo, 1); tint(geo, C(P.wood)); }
        m.position.set(...p); m.castShadow = m.receiveShadow = true; g.add(m); } };
    var leatherM = plain(P.leather, { roughness: 0.45, relief: 0.35 });
    chair(X - 0.75, Z, Math.PI / 2, 0.75); chair(X + 0.95, Z - 0.42, -Math.PI / 2 - 0.25); chair(X + 0.95, Z + 0.42, -Math.PI / 2 + 0.25);
  }

  // ------------------------------------------------------------------ deposit-slip stand (right, island table)
  const slipP = new THREE.Vector3(W - 2.3, 0, Math.max(3.3, zc - 3.6));
  { const X = slipP.x, Z = slipP.z, th = 1.1;
    piece("marble", roundedBox(1.5, 0.06, 0.7, 0.025, 3), [X, th, Z], [0, 0, 0], { tile: 1.4, color: P.floorA });
    for (const [sx, sz] of [[-0.62, -0.25], [0.62, -0.25], [-0.62, 0.25], [0.62, 0.25]]) { const l = lathe([[0.0001, 0], [0.05, 0], [0.04, 0.03], [0.022, 0.06], [0.02, th - 0.1], [0.032, th - 0.06], [0.03, th - 0.03], [0.0001, th - 0.03]], 14); l.translate(X + sx, 0, Z + sz); S.add("brass", l); }
    S.add("brass", tube([new THREE.Vector3(X - 0.62, 0.2, Z), new THREE.Vector3(X + 0.62, 0.2, Z)], 0.016, 4, 8));
    piece(accKey, roundedBox(1.2, 0.26, 0.12, 0.015, 2), [X, th + 0.16, Z], [0, 0, 0], { tile: 1.2, color: P.accent });                     // slip rack spine
    for (let k = 0; k < 5; k++) { piece("paper", roundedBox(0.2, 0.015, 0.13, 0.003, 1), [X - 0.44 + k * 0.22, th + 0.2, Z - 0.1], [-0.55, 0, 0], { color: k % 2 ? "#f3ecd8" : "#e3eedf" });
      piece("paper", roundedBox(0.2, 0.015, 0.13, 0.003, 1), [X - 0.44 + k * 0.22, th + 0.2, Z + 0.1], [0.55, 0, 0], { color: k % 2 ? "#efe0e0" : "#f3ecd8" }); }
    for (const s of [-1, 1]) { const pen = new THREE.CylinderGeometry(0.006, 0.006, 0.15, 8); pen.rotateZ(Math.PI / 2); pen.rotateY(0.4 * s); pen.translate(X + s * 0.45, th + 0.04, Z - 0.22 * s); tint(pen, C("#1a1a1a")); S.add("plastic", pen);
      S.add("brass", tube([new THREE.Vector3(X + s * 0.38, th + 0.04, Z - 0.22 * s), new THREE.Vector3(X + s * 0.3, th + 0.02, Z - 0.25 * s), new THREE.Vector3(X + s * 0.2, th + 0.06, Z - 0.05 * s)], 0.003, 12, 4)); }
  }

  // ------------------------------------------------------------------ potted palms (side walls near the counter, out of the front foreground)
  for (const [x, z] of [[xL + 0.45, zc - 1.0], [xR - 0.45, zc - 1.2]]) {
    const { pot, leaves, soil } = plantGeoms(r, { leaves: 16, height: 1.25, potH: 0.5, potR: 0.24 });
    for (const g of pot) { tint(g, C(isMarble ? "#e8e0cc" : "#a05a3a")); g.translate(x, 0, z); S.add("plastic", g); }
    for (const g of soil) { tint(g, C("#3a2a1c")); g.translate(x, 0, z); S.add("cloth", g); }
    for (const g of leaves) { tint(g, C("#3f7a3a").multiplyScalar(0.8 + r() * 0.35)); g.translate(x, 0, z); S.add("leaf", g); }
  }

  // ------------------------------------------------------------------ security camera, high in the front-right corner, aimed at the counter
  const cctvPos = new THREE.Vector3(xR - 0.5, H - 1.05, 0.95), cctvTarget = new THREE.Vector3(dx - 0.2, 1.3, zc - 0.55);
  { for (const g of bracketGeoms(0.46)) { tint(g, C("#d6d0c2")); g.translate(0.95, H - 1.24, 0); S.add("plastic", rightXf(g)); }
    const cam = cctvCamera({ body: camBody, metal: camMetal, lensM, led: ledM }); cam.group.position.copy(cctvPos);
    const m = new THREE.Matrix4().lookAt(cctvPos, cctvTarget, new THREE.Vector3(0, 1, 0)); cam.group.quaternion.setFromRotationMatrix(m); extra.add(cam.group);
    cam.group.updateMatrix(); var lensLocal = cam.lensLocal.clone().applyMatrix4(cam.group.matrix); }

  // ------------------------------------------------------------------ build merged meshes
  const meshes = S.build(group, { noCast: ["grout"], noReceive: [] });
  meshes.grout.name = "floor";

  // ------------------------------------------------------------------ lights: sun through the high windows (key, shadows) + counter pendant spot
  const lights = new THREE.Group(); lights.name = "lights"; group.add(lights);
  const center = new THREE.Vector3(W / 2, 0, D / 2);
  const sun = new THREE.DirectionalLight(0xffffff, 4); sun.target.position.copy(center); lights.add(sun, sun.target);
  sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.03; sun.shadow.radius = 3;
  const ext = Math.max(W, D) * 0.75; Object.assign(sun.shadow.camera, { left: -ext, right: ext, top: ext, bottom: -ext, near: 1, far: 60 });
  const ckey = new THREE.SpotLight(0xffd6a0, 26, 0, 0.62, 0.85, 2); ckey.position.set(dx + 0.3, H - 0.9, zc - 2.1); ckey.target.position.set(dx, 0.9, zc - 0.2); lights.add(ckey, ckey.target);
  ckey.castShadow = true; ckey.shadow.mapSize.set(1024, 1024); ckey.shadow.bias = -0.0005; ckey.shadow.normalBias = 0.02; ckey.shadow.radius = 4; ckey.shadow.camera.near = 0.3; ckey.shadow.camera.far = 12;
  const fill = new THREE.PointLight(0xffc890, 9, 0, 2); fill.position.set(W / 2, H - 1.4, D * 0.35); lights.add(fill);
  const fill2 = new THREE.PointLight(0xffc890, 6, 0, 2); fill2.position.set(W / 2, H - 1.4, zc + 1.2); lights.add(fill2);
  const hemi = new THREE.HemisphereLight(0xcfe0ff, 0xb89a74, 0.9); lights.add(hemi);

  // ------------------------------------------------------------------ anchors (world)
  const Lw = (x, y, z) => toWorld(group, new THREE.Vector3(x, y, z));
  const counterSpot = Lw(dx, 0, zc - 0.62), tellerSpot = Lw(dx, 0, zc + 1.0);
  const cctvView = { pos: Lw(lensLocal.x, lensLocal.y, lensLocal.z), target: Lw(cctvTarget.x, cctvTarget.y, cctvTarget.z), fov: 58 };
  const anchors = {
    origin: new THREE.Vector3(...O.origin), door: Lw(dx, 0, 1.0), doorOutside: Lw(dx, 0, -0.6), doorFlight: [Lw(dx, 1.7, -2.5), Lw(dx, 1.7, 0.3), Lw(dx, 1.9, 2.0)],
    counterSpot, tellerSpot, managerSpot: Lw(deskP.x - 0.75, 0, deskP.z), slipStand: Lw(slipP.x, 1.13, slipP.z), clock: Lw(dx, 3.35, zb - 0.07),
    counterTop: Lw(dx, CH + 0.035, zc + 0.05), cctv: cctvView.pos.clone(), keyLightPos: Lw(ckey.position.x, ckey.position.y, ckey.position.z),
    yaw: { counterSpot: 0, tellerSpot: Math.PI, managerSpot: Math.PI / 2, door: 0 },
    views: {
      hallWide: { pos: Lw(dx + 1.35, 2.25, 1.35), target: Lw(dx - 0.6, 1.35, zc + 0.4), fov: 64 },
      counterClose: { pos: Lw(dx + 3.0, 1.75, zc - 2.4), target: Lw(dx - 0.1, 1.3, zc + 0.15), fov: 56 },
      cctvView,
      cctvDoor: { pos: cctvView.pos.clone(), target: Lw(dx + 0.3, 1.2, 1.6), fov: 58 },
    },
  };

  // ------------------------------------------------------------------ time of day
  let current = null; const sunDir = new THREE.Vector3();
  const setTime = (name) => { const Tm = BANK_TIMES[name] || BANK_TIMES.day; if (current === name) return; current = name;
    sunDir.set(...Tm.sunDir).normalize(); sun.position.copy(center).addScaledVector(sunDir, 30); sun.color.set(Tm.sun); sun.intensity = Tm.sunI;
    hemi.color.set(Tm.hemiSky); hemi.groundColor.set(Tm.hemiGround); hemi.intensity = Tm.hemiI; globeM.emissiveIntensity = Tm.globe;
    fill.intensity = Tm.fixI; fill2.intensity = Tm.fixI * 0.65; ckey.intensity = Tm.spotI; };
  setTime(O.time);
  const update = (/* t, camera */) => {};
  group.updateMatrixWorld(true);
  return { group, anchors, cctvView, update, setTime, lights: { sun, counterSpot: ckey, fill, fill2, hemi }, meshes, get time() { return current; }, name: O.name };
}

function mergeLocal(list) { return mergeGeometries(list.map((g) => { const n = g.index ? g.toNonIndexed() : g; for (const k of Object.keys(n.attributes)) if (!["position", "normal", "uv"].includes(k)) n.deleteAttribute(k); if (!n.attributes.uv) boxUV(n, 1); return n; }), false); }
