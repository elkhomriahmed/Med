// Boats and ships. Local frame: origin = waterline centre, forward = +Z (bow), up = +Y. Characters stand on deck markers
// (Object3D children named in `spots`), so they move with the boat when the integrator parents them or reads world positions.
import * as THREE from "three";
import { roundedBox, roundedCylinder, place, tint, boxUV, grainUV, mergedMesh, lathe, plankField, tube } from "../geometry.js";
import { pbr, plain, plateTexture } from "../materials.js";
import { rng } from "../../shared/assets.js";
import { snowify, smooth, lerp } from "./util.js";

/** Planked hull. L length, B beam, draft (keel below water), free (sheer above water at midships), rise (extra sheer at bow),
 *  transom (stern width fraction), paint: [[yFrom, color], ...] bands by height (non-indexed, per-strake tone). */
export function hullGeometry({ L = 8, B = 2.6, draft = 0.7, free = 1.0, rise = 0.35, transom = 0.75, stations = 30, ring = 14,
  paint = [[-9, 0x7a2a1c], [0.05, 0x2a4a6a], [0.75, 0xf2ece0]], seed = 3 } = {}) {
  const r = rng(seed);
  const w = (s) => (s < 0.55 ? lerp(transom, 1, Math.sin((s / 0.55) * Math.PI / 2)) : Math.sqrt(Math.max(0, 1 - ((s - 0.55) / 0.45) ** 2.2))) * B / 2;
  const keel = (s) => -draft + draft * 0.75 * smooth(0.72, 1.0, s) + draft * 0.3 * smooth(0.12, 0, s);
  const sheer = (s) => free + rise * Math.max(0, (s - 0.5) * 2) ** 2 + 0.12 * rise * Math.max(0, (0.5 - s) * 2) ** 2;
  const P = (s, j) => { // j in [-ring, ring]; 0 = keel, +-ring = gunwale
    const phi = (Math.abs(j) / ring) * Math.PI / 2, x = Math.sign(j) * w(s) * Math.pow(Math.sin(phi), 0.55);
    const y = sheer(s) - (sheer(s) - keel(s)) * Math.pow(Math.cos(phi), 1.25);
    return new THREE.Vector3(x, y, (s - 0.5) * L);
  };
  const pos = [], uv = [], col = [];
  const strakeTone = Array.from({ length: ring * 2 + 1 }, () => 0.86 + r() * 0.2);
  const colorAt = (y) => { let c = paint[0][1]; for (const [y0, cc] of paint) if (y >= y0) c = cc; return new THREE.Color(c); };
  const girth = (j) => (j / ring) * (B / 2 + draft) * 0.9;
  for (let i = 0; i < stations; i++) for (let j = -ring; j < ring; j++) {
    const s0 = i / stations, s1 = (i + 1) / stations;
    const q = [P(s0, j), P(s1, j), P(s1, j + 1), P(s0, j + 1)], quv = [[girth(j), s0 * L], [girth(j), s1 * L], [girth(j + 1), s1 * L], [girth(j + 1), s0 * L]];
    const ym = (q[0].y + q[1].y + q[2].y + q[3].y) / 4, c = colorAt(ym).multiplyScalar(strakeTone[j + ring]);
    for (const k of [0, 1, 2, 0, 2, 3]) { pos.push(q[k].x, q[k].y, q[k].z); uv.push(quv[k][0] / 1.4, quv[k][1] / 2.2); col.push(c.r, c.g, c.b); }
  }
  // transom (flat stern) fan
  const cT = new THREE.Vector3(0, (sheer(0) + keel(0)) / 2, -L / 2);
  for (let j = -ring; j < ring; j++) { const a = P(0, j), b = P(0, j + 1), c = colorAt((a.y + b.y) / 2).multiplyScalar(0.9);
    for (const p of [cT, b, a]) { pos.push(p.x, p.y, p.z); uv.push(p.x / 1.4, p.y / 1.4); col.push(c.r, c.g, c.b); } }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3)); g.computeVertexNormals();
  return { geom: g, w, keel, sheer, P, L, B, ring };
}

/** Deck boards inside the hull outline at height y (local). */
function deckBoards(H, inset, y, seed) {
  const { L, w } = H;
  const pcs = plankField({ halfX: H.B / 2, rowHalf: (x) => { // half-length (along Z) where |x| fits inside w(s) - inset
      let lo = 1, hi = 0; for (let k = 0; k <= 60; k++) { const s = k / 60; if (w(s) - inset > Math.abs(x)) { lo = Math.min(lo, s); hi = Math.max(hi, s); } }
      return hi > lo ? ((hi - lo) * L) / 2 : 0; }, plankW: 0.16, gap: 0.01, thick: 0.05, minLen: 1.5, maxLen: 3.2, tile: 1.2, seed, tone: [0.82, 1.1] });
  // plankField centres rows around z = 0; shift each row to its hull span centre
  for (const g of pcs) { g.computeBoundingBox(); const cx = (g.boundingBox.min.x + g.boundingBox.max.x) / 2;
    let lo = 1, hi = 0; for (let k = 0; k <= 60; k++) { const s = k / 60; if (w(s) - inset > Math.abs(cx)) { lo = Math.min(lo, s); hi = Math.max(hi, s); } }
    g.translate(0, y, ((lo + hi) / 2 - 0.5) * L); }
  return pcs;
}

function marker(name, x, y, z, parent) { const o = new THREE.Object3D(); o.name = name; o.position.set(x, y, z); parent.add(o); return o; }

/** Shared materials for every boat (built once). */
let _mats = null;
async function boatMats() {
  if (_mats) return _mats;
  const [hullM, deckM, woodM, ironM] = await Promise.all([
    pbr("wood", { color: [1.25, 1.2, 1.15], normalScale: 1.5, side: THREE.DoubleSide }),
    pbr("wood", { color: [1.35, 1.05, 0.78], normalScale: 1.6 }),
    pbr("wood", { color: [0.85, 0.6, 0.4], normalScale: 1.6 }),
    pbr("rustMetal", { color: [0.2, 0.19, 0.18], metalness: 0.55, roughness: 0.9, normalScale: 0.8, vertexColors: false }),
  ]);
  const sailM = plain(0xeadfc6, { roughness: 0.92, relief: 0.55, side: THREE.DoubleSide });
  const ropeM = plain(0x3a2c20, { roughness: 0.9, relief: 0.2 });
  const paintM = plain(0xf0ebe0, { roughness: 0.55, relief: 0.3, vertexColors: true });
  const glow = new THREE.MeshStandardMaterial({ color: 0x221100, emissive: new THREE.Color(1.0, 0.62, 0.25), emissiveIntensity: 3.5 });
  const winM = new THREE.MeshStandardMaterial({ color: 0x0b0e14, roughness: 0.12, metalness: 0.3, envMapIntensity: 1.4,
    emissive: new THREE.Color(1.0, 0.6, 0.28), emissiveIntensity: 0 });
  [hullM, deckM, woodM, ironM, sailM, paintM].forEach((m) => snowify(m, { thresh: 0.6 }));
  return (_mats = { hullM, deckM, woodM, ironM, sailM, ropeM, paintM, glow, winM });
}

/** Supply boat with wheelhouse and a readable name board on both bow sides. */
export async function buildSupplyBoat({ name = "MARY ANN", sub = "SUPPLY" } = {}) {
  const M = await boatMats(), group = new THREE.Group(); group.name = "supplyBoat"; const r = rng(77);
  const H = hullGeometry({ L: 8.2, B: 2.7, draft: 0.75, free: 1.05, rise: 0.45, transom: 0.78, seed: 5,
    paint: [[-9, 0x8a2e1e], [0.06, 0x24506e], [0.82, 0xf0eadc]] });
  const hull = new THREE.Mesh(H.geom, M.hullM); hull.name = "hull"; group.add(hull);
  const deckY = 0.86;
  group.add(mergedMesh(deckBoards(H, 0.1, deckY, 21), M.deckM, { name: "deck" }));
  // gunwale cap rail along the sheer (both sides)
  const rail = [];
  for (const sd of [-1, 1]) { const pts = []; for (let k = 0; k <= 40; k++) { const s = 0.005 + (k / 40) * 0.99, p = H.P(s, sd * 14); pts.push(p.add(new THREE.Vector3(-sd * 0.03, 0.03, 0))); }
    rail.push(tube(pts, 0.05, 80, 8)); }
  // wheelhouse (aft), windows, roof; small mast with lamp; fenders
  const wh = [], whZ = -1.6;
  wh.push(place(roundedBox(1.8, 1.55, 1.7, 0.04), [0, deckY + 0.78, whZ]));
  const roof = place(roundedBox(2.05, 0.1, 2.0, 0.03), [0, deckY + 1.6, whZ]);
  const mast = place(roundedCylinder(0.06, 3.2, 0.02, 10), [0, deckY + 1.6 + 1.6, whZ + 0.2]);
  wh.forEach((g) => boxUV(g, 1.2)); grainUV(roof, 1.2); grainUV(mast, 1.4);
  group.add(mergedMesh(wh, M.paintM, { name: "wheelhouse" }));
  group.add(mergedMesh([...rail, roof, mast], M.woodM, { name: "trim" }));
  const wins = [];
  for (const sd of [-1, 1]) for (const z of [-0.42, 0.42]) wins.push(place(new THREE.PlaneGeometry(0.55, 0.5), [sd * 0.905, deckY + 1.08, whZ + z], [0, sd * Math.PI / 2, 0]));
  wins.push(place(new THREE.PlaneGeometry(1.3, 0.5), [0, deckY + 1.08, whZ + 0.855]));
  group.add(mergedMesh(wins, M.winM, { cast: false, name: "wheelhouseWindows" }));
  // cargo on the foredeck: sacks (squashed spheres) + small crates
  const cargo = [];
  for (let i = 0; i < 5; i++) { const g = new THREE.SphereGeometry(0.28, 14, 10); g.scale(1.25, 0.6, 0.9); boxUV(g, 0.8); tint(g, new THREE.Color(0.95 + r() * 0.1, 0.85, 0.66));
    cargo.push(place(g, [-0.5 + (i % 3) * 0.48, deckY + 0.18 + Math.floor(i / 3) * 0.28, 1.2 + (i % 2) * 0.45], [0, r(), 0])); }
  group.add(mergedMesh(cargo, plain(0xd8c49a, { roughness: 0.95, relief: 0.9, vertexColors: true }), { name: "sacks" }));
  const crates = [];
  for (let i = 0; i < 3; i++) { const g = roundedBox(0.55, 0.45, 0.55, 0.02); boxUV(g, 0.7); tint(g, new THREE.Color(0.9 + r() * 0.15, 0.9, 0.9));
    crates.push(place(g, [0.5 - i * 0.05, deckY + 0.225 + (i === 2 ? 0.45 : 0), 2.3 - (i === 1 ? 0.6 : 0)], [0, r() * 0.4, 0])); }
  group.add(mergedMesh(crates, M.woodM, { name: "boatCrates" }));
  const fend = [];
  for (const z of [-2.2, -0.4, 1.4]) { const g = new THREE.CapsuleGeometry(0.13, 0.3, 4, 10); fend.push(place(g, [H.w(z / H.L + 0.5) + 0.1, 0.55, z])); }
  group.add(mergedMesh(fend, plain(0x26303a, { roughness: 0.8, relief: 0.4 }), { name: "fenders" }));
  // name boards on both bow sides (painted plank, readable)
  const tex = plateTexture([[name, 0.5], [sub, 0.22]], { w: 1024, h: 300, bg: "#f2ead6", ink: "#1d3550", border: true });
  const boardM = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6, envMapIntensity: 0.5 });
  const nameBoards = [];
  for (const sd of [1, -1]) {
    const s = 0.8, p = H.P(s, sd * 11), p2 = H.P(s + 0.02, sd * 11), tng = p2.clone().sub(p).normalize();
    const out = new THREE.Vector3(sd, 0, 0).addScaledVector(tng, -tng.x * sd).normalize();                           // horizontal outward normal
    const back = new THREE.Mesh(roundedBox(1.6, 0.48, 0.05, 0.015), M.woodM); const face = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.42), boardM);
    face.position.z = 0.027; const b = new THREE.Group(); b.add(back, face);
    b.position.copy(p).addScaledVector(out, 0.06); b.position.y = 0.72;
    b.quaternion.setFromRotationMatrix(new THREE.Matrix4().lookAt(new THREE.Vector3(), out.clone().negate(), new THREE.Vector3(0, 1, 0)));
    group.add(b); nameBoards.push(b);
  }
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 10), M.glow); lamp.position.set(0, deckY + 4.6, whZ + 0.2); lamp.name = "bulb"; group.add(lamp);
  const spots = { captain: marker("captain", 0.6, deckY, -0.4, group), sailor1: marker("sailor1", -0.55, deckY, 0.3, group),
    sailor2: marker("sailor2", 0.2, deckY, 2.9, group), wheel: marker("wheel", 0, deckY + 1.1, whZ + 0.5, group),
    nameBoard: marker("nameBoard", nameBoards[0].position.x, nameBoards[0].position.y, nameBoards[0].position.z, group) };
  finish(group);
  return { group, spots, hull: H, deckY, nameBoards, winM: M.winM };
}

/** Small rowboat: open hull, thwarts, floorboards, two oars. */
export async function buildRowboat() {
  const M = await boatMats(), group = new THREE.Group(); group.name = "rowboat";
  const H = hullGeometry({ L: 3.4, B: 1.36, draft: 0.26, free: 0.42, rise: 0.16, transom: 0.6, ring: 10, stations: 22, seed: 9,
    paint: [[-9, 0x6a3a22], [0.0, 0x2f7a6a], [0.33, 0xefe6d2]] });
  { const hm = new THREE.Mesh(H.geom, M.hullM); hm.name = "hull"; group.add(hm); }
  const wood = [];
  for (const [z, wd] of [[-0.95, 0.9], [0.05, 1.12], [0.95, 0.8]]) { const g = roundedBox(wd * 1.02, 0.05, 0.24, 0.012); grainUV(g, 1.0); wood.push(place(g, [0, 0.2, z])); }
  for (let i = -2; i <= 2; i++) { const g = roundedBox(0.12, 0.025, 2.5, 0.006); grainUV(g, 1.0); wood.push(place(g, [i * 0.14, -0.13, -0.1])); }
  for (const sd of [-1, 1]) { const pts = []; for (let k = 0; k <= 30; k++) { const s = 0.01 + (k / 30) * 0.98; pts.push(H.P(s, sd * 10).add(new THREE.Vector3(-sd * 0.02, 0.02, 0))); }
    wood.push(tube(pts, 0.03, 60, 6)); }
  for (const sd of [-1, 1]) {   // oars resting along the gunwales
    const a = new THREE.Vector3(sd * 0.62, 0.48, 0.25), b = new THREE.Vector3(sd * 0.3, 0.32, -1.25);
    const d = b.clone().sub(a), g = roundedCylinder(0.025, d.length(), 0.01, 8); grainUV(g, 1.2);
    g.applyMatrix4(new THREE.Matrix4().makeRotationFromQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize())));
    g.translate((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2); wood.push(g);
    const bl = roundedBox(0.16, 0.6, 0.02, 0.01); boxUV(bl, 0.6);
    bl.applyMatrix4(new THREE.Matrix4().makeRotationFromQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize())));
    bl.translate(a.x + d.x * 0.03 - d.x * 0.15, a.y - d.y * 0.12, a.z - d.z * 0.12); wood.push(bl);
  }
  group.add(mergedMesh(wood, M.woodM, { name: "rowboatWood" }));
  const spots = { seat: marker("seat", 0, 0.2, 0.05, group), stand: marker("stand", 0, -0.11, 0.45, group), bow: marker("bow", 0, 0.4, 1.6, group) };
  finish(group);
  return { group, spots, hull: H };
}

/** Two-masted schooner with gaff sails, jibs, bowsprit, shrouds, wheel and stern lantern. scale 1 = 17 m. */
export async function buildSchooner({ hullPaint = [[-9, 0x5a2416], [0.1, 0x1d2630], [1.25, 0xe0b040], [1.45, 0x1d2630]], sail = 0xeadfc6, seed = 13, detail = 1 } = {}) {
  const M = await boatMats(), group = new THREE.Group(); group.name = "schooner";
  const H = hullGeometry({ L: 17, B: 4.6, draft: 1.7, free: 1.75, rise: 0.75, transom: 0.7, stations: detail ? 36 : 20, ring: detail ? 14 : 8, paint: hullPaint, seed });
  { const hm = new THREE.Mesh(H.geom, M.hullM); hm.name = "hull"; group.add(hm); }
  const deckY = 1.45;
  group.add(mergedMesh(deckBoards(H, 0.2, deckY, seed + 1), M.deckM, { name: "deck" }));
  const wood = [], rope = [], sails = [];
  // bulwark rail + stanchions
  for (const sd of [-1, 1]) { const pts = []; for (let k = 0; k <= 40; k++) { const s = 0.01 + (k / 40) * 0.98; pts.push(H.P(s, sd * (detail ? 14 : 8)).add(new THREE.Vector3(-sd * 0.06, 0.35, 0))); }
    wood.push(tube(pts, 0.07, 80, 6));
    for (let k = 1; k < 14; k++) { const p = H.P(k / 14, sd * (detail ? 14 : 8)); wood.push(place(roundedBox(0.08, 0.4, 0.08, 0.01), [p.x - sd * 0.06, p.y + 0.15, p.z])); } }
  // masts (fore shorter), booms, gaffs, bowsprit
  const masts = [{ z: 3.6, h: 13.5 }, { z: -1.8, h: 15.5 }];
  for (const m of masts) { const g = roundedCylinder(0.15, m.h, 0.05, 12); g.translate(0, deckY + m.h / 2, m.z); grainUV(g, 1.6); wood.push(g); }
  const bs = new THREE.Vector3(0, H.sheer(1) + 0.15, H.L / 2 - 0.3), bsEnd = new THREE.Vector3(0, H.sheer(1) + 1.1, H.L / 2 + 4.2);
  wood.push(tube([bs, bsEnd], 0.11, 4, 10));
  const boomAng = 0.28;     // sails eased out to port
  const sailQuad = (mast, foot, headH, footLen, gaffLen) => {   // gaff sail between mast, boom and gaff, billowed
    const m0 = new THREE.Vector3(0, deckY + 1.2, mast.z), m1 = new THREE.Vector3(0, deckY + headH, mast.z);
    const dir = new THREE.Vector3(Math.sin(boomAng), 0, -Math.cos(boomAng));
    const b1 = m0.clone().addScaledVector(dir, footLen), g1 = m1.clone().addScaledVector(dir.clone().add(new THREE.Vector3(0, 0.55, 0)).normalize(), gaffLen);
    wood.push(tube([m0, b1], 0.08, 4, 8), tube([m1, g1], 0.07, 4, 8));
    const nu = 12, nv = 12, pos = [], idx = [];
    const side = new THREE.Vector3(-Math.cos(boomAng), 0, -Math.sin(boomAng)), sd = 1;
    for (let v = 0; v <= nv; v++) for (let u = 0; u <= nu; u++) {
      const a = m0.clone().lerp(m1, v / nv), b = b1.clone().lerp(g1, v / nv), p = a.lerp(b, u / nu);
      const bil = Math.sin(Math.PI * u / nu) * Math.sin(Math.PI * (0.15 + 0.85 * v / nv)) * 0.55 * footLen / 7;
      p.addScaledVector(side, bil * sd); pos.push(p.x, p.y, p.z);
    }
    for (let v = 0; v < nv; v++) for (let u = 0; u < nu; u++) { const a = v * (nu + 1) + u; idx.push(a, a + 1, a + nu + 1, a + 1, a + nu + 2, a + nu + 1); }
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
    boxUV(g, 2.0); sails.push(g); rope.push(tube([b1, b1.clone().add(new THREE.Vector3(0, -0.9, -0.2)).setY(deckY + 0.3)], 0.015, 4, 4));
  };
  sailQuad(masts[1], null, 12.2, 7.6, 5.0);
  sailQuad(masts[0], null, 10.6, 5.2, 3.6);
  // jibs: triangles from the foremast to the bowsprit
  for (const [top, end] of [[12.0, 1.0], [9.5, 0.55]]) {
    const a = new THREE.Vector3(0, deckY + top, masts[0].z + 0.15), b = bs.clone().lerp(bsEnd, end), c = new THREE.Vector3(0.9, deckY + 1.0, masts[0].z + 2.2);
    const pos = [], idx = [], n = 8;
    for (let i = 0; i <= n; i++) for (let j = 0; j <= n - i; j++) { const u = i / n, v = j / n, w = 1 - u - v;
      const p = a.clone().multiplyScalar(w).addScaledVector(b, u).addScaledVector(c, v); p.x += Math.sin(Math.PI * Math.min(1, (u + v))) * u * v * 2.2; pos.push(p.x, p.y, p.z); }
    let k = 0; const id = []; for (let i = 0; i <= n; i++) { id[i] = []; for (let j = 0; j <= n - i; j++) id[i][j] = k++; }
    for (let i = 0; i < n; i++) for (let j = 0; j < n - i; j++) { idx.push(id[i][j], id[i + 1][j], id[i][j + 1]); if (j < n - i - 1) idx.push(id[i + 1][j], id[i + 1][j + 1], id[i][j + 1]); }
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); boxUV(g, 2); sails.push(g);
    rope.push(tube([a, b], 0.018, 4, 4));
  }
  // shrouds (mast tops to the rails) + stays
  for (const m of masts) for (const sd of [-1, 1]) for (const dz of [-0.8, 0.4]) {
    const top = new THREE.Vector3(0, deckY + m.h - 0.6, m.z), foot = H.P(0.5 + (m.z + dz) / H.L, sd * H.ring).add(new THREE.Vector3(-sd * 0.05, 0.35, 0));
    rope.push(tube([top, foot], 0.018, 2, 4)); }
  rope.push(tube([new THREE.Vector3(0, deckY + masts[1].h - 0.4, masts[1].z), new THREE.Vector3(0, deckY + masts[0].h - 0.4, masts[0].z)], 0.02, 2, 4));
  rope.push(tube([new THREE.Vector3(0, deckY + masts[0].h - 0.3, masts[0].z), bsEnd], 0.02, 2, 4));
  // wheel at the stern + binnacle
  const wz = -H.L / 2 + 2.0;
  wood.push(place(roundedBox(0.2, 1.0, 0.2, 0.02), [0, deckY + 0.5, wz - 0.2]));
  const wheel = new THREE.TorusGeometry(0.45, 0.04, 8, 28); wheel.translate(0, deckY + 1.1, wz); wood.push(wheel);
  for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2; wood.push(place(roundedCylinder(0.02, 1.15, 0.006, 6), [0, deckY + 1.1, wz], [0, 0, a])); }
  // hatch + cabin trunk amidships
  wood.push(place(roundedBox(1.6, 0.5, 2.2, 0.04), [0, deckY + 0.25, 0.8]), place(roundedBox(2.0, 0.7, 2.6, 0.05), [0, deckY + 0.35, -4.5]));
  wood.forEach((g) => { if (!g.attributes.uv) boxUV(g, 1.2); });
  group.add(mergedMesh(wood, M.woodM, { name: "spars" }));
  group.add(mergedMesh(rope, M.ropeM, { name: "rigging", receive: false }));
  group.add(mergedMesh(sails, plain(sail, { roughness: 0.92, relief: 0.55, side: THREE.DoubleSide }), { name: "sails" }));
  const lan = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 10), M.glow); lan.position.set(0, H.sheer(0) + 0.9, -H.L / 2 + 0.2); lan.name = "bulb"; group.add(lan);
  const lan2 = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 10), M.glow); lan2.position.set(0, deckY + masts[0].h * 0.55, masts[0].z + 0.2); lan2.name = "bulb"; group.add(lan2);
  const spots = { captain: marker("captain", 0.0, deckY, wz + 0.9, group), sailor1: marker("sailor1", -1.05, deckY, 1.6, group),
    sailor2: marker("sailor2", 1.0, deckY, 5.6, group), bow: marker("bow", 0, deckY, H.L / 2 - 1.8, group) };
  finish(group);
  return { group, spots, hull: H, deckY, lanterns: [lan, lan2] };
}

function finish(group) { group.traverse((o) => { if (!o.isMesh) return; o.receiveShadow = o.name !== "bulb"; o.castShadow = !["bulb", "wheelhouseWindows"].includes(o.name); }); }
