// Mill surroundings (video 3): yard cobbles, river bank wall, mill race, calm river (shader), stone arch bridge, the far bank
// with a town skyline (3D houses, lit windows, church spire), distant hills, trees, night sky. Owner: world/mill.
import * as THREE from "three";
import { pbr, plain } from "../materials.js";
import { tileField } from "../apartment/parts.js";
import { createExteriorSky } from "../exterior/sky.js";
import { createRiver, RIVER_Y } from "./river.js";
import { stoneFace, coreSlab, boxMM, box, boxUV, tint, place, clean, mergeGeometries, rng, V } from "./parts.js";
import { mergedMesh } from "../geometry.js";

export { RIVER_Y };
export const BANK_Z = 5.5, FAR_Z = 25, RACE = { x0: 5.4, x1: 7.4, z0: -8 }, BRIDGE_X = 24;

/** Foam proximity map (r = 1 at a bank -> 0 at `width` m) over [-half, half]^2. dist(x, z) = signed distance to the nearest bank. */
function bakeFoamFn(dist, { half = 40, size = 512, width = 0.9 } = {}) {
  const data = new Uint8Array(size * size * 4);
  for (let j = 0; j < size; j++) for (let i = 0; i < size; i++) {
    const x = ((i + 0.5) / size * 2 - 1) * half, z = ((j + 0.5) / size * 2 - 1) * half, d = dist(x, z), k = 4 * (j * size + i);
    data[k] = Math.max(0, Math.min(1, 1 - Math.max(d, 0) / width)) * 255; data[k + 3] = 255;
  }
  const t = new THREE.DataTexture(data, size, size); t.magFilter = t.minFilter = THREE.LinearFilter; t.needsUpdate = true; t.userData = { half }; return t;
}

/** Far-bank ground height (gentle rise, hills from ~90 m out). */
export const farY = (x, z) => { const d = Math.max(0, z - FAR_Z - 0.4);
  return 0.4 + Math.max(0, d - 18) * 0.05 + Math.max(0, d - 90) * 0.18 * (0.6 + 0.4 * Math.sin(x * 0.02 + 1.3)) + Math.sin(x * 0.07) * Math.min(1, d / 60) * 0.25; };

export async function buildOutside() {
  const group = new THREE.Group(); group.name = "millOutside";
  const [stone, grass, cobble, wood, slate] = await Promise.all([
    pbr("stacked_stone_wall", { color: [0.36, 0.47, 0.74], normalScale: 1.5 }),
    pbr("aerial_grass_rock", { color: [0.3, 0.4, 0.46], normalScale: 1.2 }),
    pbr("cobblestone_floor_04", { color: [0.5, 0.56, 0.68], vertexColors: false, normalScale: 1.4 }),
    pbr("wood", { color: [0.4, 0.45, 0.53] }),
    pbr("stacked_stone_wall", { color: [0.3, 0.36, 0.46], normalScale: 1.2 }),
  ]);
  const mortar = plain(0x262b33, { roughness: 0.95, relief: 0.9, vertexColors: true });
  const S = [], MO = [], W = [];

  // ---------------------------------------------------------------- terrain (near bank y -0.03, far bank y 0.4 rising into hills)
  {
    const pieces = [];
    const flat = (x0, z0, x1, z1, y, tile = 6) => { const g = new THREE.PlaneGeometry(x1 - x0, z1 - z0, 1, 1); g.rotateX(-Math.PI / 2); g.translate((x0 + x1) / 2, y, (z0 + z1) / 2); boxUV(g, tile); pieces.push(clean(g)); };
    flat(-220, -220, RACE.x0, BANK_Z - 0.4, -0.03); flat(RACE.x1, -220, 220, BANK_Z - 0.4, -0.03); flat(RACE.x0, -220, RACE.x1, RACE.z0 - 0.4, -0.03);
    // far bank: gently rising ground with noise (z 25.4 .. 420)
    const g = new THREE.PlaneGeometry(440, 400, 110, 80); g.rotateX(-Math.PI / 2); g.translate(0, 0, FAR_Z + 0.4 + 200);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) p.setY(i, farY(p.getX(i), p.getZ(i)));
    g.computeVertexNormals(); boxUV(g, 6); pieces.push(clean(g));
    const m = mergedMesh(pieces, grass, { cast: false, name: "terrain" }); group.add(m);
  }
  // yard cobbles around the mill (rounded instanced stones), kept outside the footprint + race
  for (const [u0, u1, v0, v1, seed] of [[-10, 5.3, -10, -4.06, 3], [-10, -5.06, -4.06, BANK_Z - 0.42, 4], [-5.06, 5.06, 4.06, BANK_Z - 0.42, 5], [7.5, 12, -10, BANK_Z - 0.42, 6]]) {
    const f = tileField({ u0, u1, v0, v1, size: 0.24, sizeV: 0.2, gap: 0.02, depth: 0.08, bevel: 0.03, plane: "y", at: -0.07, material: cobble, seed, jitter: 0.012,
      colorFn: (i, j, r) => { const k = 0.7 + r() * 0.45; return new THREE.Color(k * 0.95, k, k * 1.05); } });
    f.castShadow = false; group.add(f);
  }

  // ---------------------------------------------------------------- river bank walls (near + far) with coping, mill race walls
  const bankOpen = [{ u0: RACE.x0, u1: RACE.x1, y0: -3, y1: 0.5 }];
  S.push(...stoneFace({ axis: "x", faceN: BANK_Z, dir: 1, u0: -70, u1: 70, y0: -2.6, y1: -0.02, openings: bankOpen, seed: 21, len: [0.5, 1.0], rowH: [0.3, 0.42] }));
  MO.push(...coreSlab({ axis: "x", nA: BANK_Z - 0.6, nB: BANK_Z - 0.02, u0: -70, u1: 70, y0: -2.6, y1: -0.02, openings: bankOpen }));
  { const r = rng(5); for (let x = -70; x < 70; x += 0.9) { if (x + 0.9 > RACE.x0 - 0.05 && x < RACE.x1 + 0.05) continue;
    S.push(box(0.88, 0.16, 0.7, [x + 0.45, 0.02 + r() * 0.015, BANK_Z - 0.28], { r: 0.035, tone: new THREE.Color().setScalar(0.85 + r() * 0.25), tile: 0.9 })); } }
  S.push(...stoneFace({ axis: "x", faceN: FAR_Z, dir: -1, u0: -70, u1: 70, y0: -2.6, y1: 0.38, seed: 22, len: [0.5, 1.0], rowH: [0.3, 0.42] }));
  MO.push(...coreSlab({ axis: "x", nA: FAR_Z + 0.02, nB: FAR_Z + 0.6, u0: -70, u1: 70, y0: -2.6, y1: 0.38 }));
  // race: two side walls along z + end wall with a sluice gate
  for (const [xf, dir, seed] of [[RACE.x0, 1, 31], [RACE.x1, -1, 32]]) {
    S.push(...stoneFace({ axis: "z", faceN: xf, dir, u0: RACE.z0, u1: BANK_Z, y0: -2.4, y1: -0.02, seed, len: [0.45, 0.9] }));
    MO.push(...coreSlab({ axis: "z", nA: dir > 0 ? xf - 0.5 : xf + 0.02, nB: dir > 0 ? xf - 0.02 : xf + 0.5, u0: RACE.z0 - 0.4, u1: BANK_Z, y0: -2.4, y1: -0.02 }));
    const r = rng(seed); for (let z = RACE.z0 - 0.4; z < BANK_Z - 0.4; z += 0.85) S.push(box(0.6, 0.15, 0.83, [xf - dir * 0.26, 0.02 + r() * 0.015, z + 0.43], { r: 0.035, tone: new THREE.Color().setScalar(0.85 + r() * 0.25), tile: 0.9 }));
  }
  S.push(...stoneFace({ axis: "x", faceN: RACE.z0, dir: 1, u0: RACE.x0, u1: RACE.x1, y0: -2.4, y1: -0.02, seed: 33 }));
  MO.push(...coreSlab({ axis: "x", nA: RACE.z0 - 0.5, nB: RACE.z0 - 0.02, u0: RACE.x0 - 0.3, u1: RACE.x1 + 0.3, y0: -2.4, y1: -0.02 }));
  W.push(box(RACE.x1 - RACE.x0 + 0.1, 1.5, 0.08, [(RACE.x0 + RACE.x1) / 2, -0.55, RACE.z0 + 0.12], { r: 0.01, tile: 0.8, grain: true }));
  for (const x of [RACE.x0 + 0.1, RACE.x1 - 0.1]) W.push(box(0.14, 2.2, 0.14, [x, -0.2, RACE.z0 + 0.2], { r: 0.012, grain: true }));
  W.push(box(RACE.x1 - RACE.x0 + 0.3, 0.14, 0.16, [(RACE.x0 + RACE.x1) / 2, 0.85, RACE.z0 + 0.2], { r: 0.012, grain: true }));

  // ---------------------------------------------------------------- stone arch bridge across the river at x = BRIDGE_X
  {
    const sh = new THREE.Shape(); const zA = BANK_Z - 2.5, zB = FAR_Z + 2.5, yb = -2.6, yt = 1.0;
    sh.moveTo(zA, yb); sh.lineTo(zB, yb); sh.lineTo(zB, yt); sh.lineTo(zA, yt); sh.closePath();
    const spans = [[BANK_Z + 0.6, BANK_Z + 6.6], [BANK_Z + 7.5, BANK_Z + 12.5], [BANK_Z + 13.4, FAR_Z - 0.6]];
    for (const [a, b] of spans) { const h = new THREE.Path(), c = (a + b) / 2, rx = (b - a) / 2, spring = -0.75;
      h.moveTo(a, yb - 0.01 + 0.2); h.lineTo(a, spring); h.absellipse(c, spring, rx, 1.35, Math.PI, 0, true); h.lineTo(b, yb + 0.2); h.closePath(); sh.holes.push(h); }
    const g = new THREE.ExtrudeGeometry(sh, { depth: 4, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.04, bevelSegments: 1, curveSegments: 24 });
    g.rotateY(-Math.PI / 2); g.translate(BRIDGE_X + 2, 0, 0); boxUV(g, 1.6); tint(g, 0xd0d4dc); S.push(clean(g));
    // voussoir ring stones + parapets with coping + approach ramps
    const r = rng(8);
    for (const [a, b] of spans) { const c = (a + b) / 2, rx = (b - a) / 2, n = 15;
      for (let i = 0; i <= n; i++) { const t = Math.PI - (i / n) * Math.PI, z = c + Math.cos(t) * (rx + 0.12), y = -0.75 + Math.sin(t) * (1.35 + 0.12);
        for (const xf of [BRIDGE_X - 2.06, BRIDGE_X + 2.06]) S.push(box(0.1, 0.42, 0.3, [xf, y, z], { r: 0.02, rot: [-(t - Math.PI / 2) * (1.35 / rx), 0, 0], tone: new THREE.Color().setScalar(0.8 + r() * 0.3), tile: 0.8 })); } }
    for (const xf of [BRIDGE_X - 1.85, BRIDGE_X + 1.85]) {
      S.push(boxMM(xf - 0.16, 0.98, zA, xf + 0.16, 1.6, zB, { r: 0.02, tile: 1.4 }));
      for (let z = zA; z < zB - 0.1; z += 0.7) S.push(box(0.42, 0.12, 0.68, [xf, 1.66, z + 0.35], { r: 0.03, tone: new THREE.Color().setScalar(0.85 + r() * 0.2), tile: 0.9 }));
    }
    for (const [z0, z1, y0, y1] of [[zA - 7, zA + 0.01, -0.03, 1.0], [zB - 0.01, zB + 7, 1.0, 0.4]]) {
      const len = z1 - z0, ang = Math.atan2(y1 - y0, len), gg = box(3.6, 0.5, Math.hypot(len, y1 - y0), [BRIDGE_X, (y0 + y1) / 2 - 0.25, (z0 + z1) / 2], { r: 0.03, rot: [-ang, 0, 0], tile: 1.5 }); S.push(gg);
    }
  }

  // ---------------------------------------------------------------- town on the far bank (3D houses, lit windows, church), hills
  const houseG = [], roofG = [], winLit = [], winDark = [], r = rng(77);
  const house = (x, z, w, h, d, yBase, wallTone, lit = 0.28) => {
    houseG.push(box(w, h, d, [x, yBase + h / 2, z], { r: 0.05, tone: wallTone, tile: 3 }));
    const rh = 0.45 * d + r() * 0.6, rs = new THREE.Shape(); rs.moveTo(-d / 2 - 0.3, 0); rs.lineTo(d / 2 + 0.3, 0); rs.lineTo(0, rh); rs.closePath();
    const rg = new THREE.ExtrudeGeometry(rs, { depth: w + 0.4, bevelEnabled: false }); rg.translate(0, 0, -(w + 0.4) / 2); rg.rotateY(Math.PI / 2); rg.translate(x, yBase + h - 0.02, z);
    boxUV(rg, 3); tint(rg, new THREE.Color().setScalar(0.75 + r() * 0.3)); roofG.push(clean(rg));
    if (r() < 0.7) houseG.push(box(0.5, 1.4, 0.5, [x + (r() - 0.5) * w * 0.6, yBase + h + rh * 0.6, z + (r() - 0.5) * d * 0.3], { r: 0.02, tone: wallTone, tile: 2 }));
    const cols = Math.max(1, Math.floor(w / 1.6)), rows = Math.max(1, Math.floor((h - 0.8) / 2.4));
    for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
      const wx = x - w / 2 + (i + 0.5) * (w / cols), wy = yBase + 1.2 + j * 2.4, wg = box(0.7, 1.0, 0.06, [wx, wy, z - d / 2 - 0.01], { r: 0.01 });
      (r() < lit ? winLit : winDark).push(wg);
    }
  };
  for (let x = -70; x < 70;) {           // front row facing the river
    const w = 4 + r() * 4, h = 4 + r() * 5, d = 6 + r() * 2;
    if (Math.abs(x + w / 2 - BRIDGE_X) > 4) house(x + w / 2, FAR_Z + 4.5 + d / 2 + r() * 1.2, w - 0.3, h, d, 0.38, new THREE.Color().setHSL(0.58 + r() * 0.05, 0.12 + r() * 0.1, 0.2 + r() * 0.12));
    x += w + 0.2 + (r() < 0.2 ? 2 + r() * 3 : 0);
  }
  for (let x = -90; x < 90;) {           // second and third rows on the slope (higher, dimmer)
    const w = 5 + r() * 5, h = 5 + r() * 6, d = 7;
    for (const [zz, k] of [[52, 0.85], [74, 0.7]]) {
      const hz = zz + r() * 4, yb = farY(x + w / 2, hz) - 0.45;
      house(x + w / 2, hz, w - 0.4, h, d, yb, new THREE.Color().setHSL(0.6, 0.15, (0.13 + r() * 0.08) * k), 0.22);
    }
    x += w + 0.5 + r() * 2;
  }
  { // church: nave + tower + spire
    const cx = -18, cz = 62, yb = farY(-18, 62) - 0.5, tone = new THREE.Color().setHSL(0.6, 0.12, 0.2);
    houseG.push(box(7, 9, 16, [cx, yb + 4.5, cz + 6], { r: 0.05, tone, tile: 3 }));
    houseG.push(box(5, 18, 5, [cx, yb + 9, cz - 3.5], { r: 0.05, tone, tile: 3 }));
    const sp = new THREE.ConeGeometry(3.4, 12, 4); sp.rotateY(Math.PI / 4); sp.translate(cx, yb + 18 + 6, cz - 3.5); boxUV(sp, 3); roofG.push(clean(sp));
    winLit.push(box(1.2, 2.4, 0.06, [cx, yb + 12, cz - 6.04], { r: 0.01 }));
  }
  group.add(mergedMesh(houseG, plain(0xffffff, { roughness: 0.9, relief: 0.6, vertexColors: true }), { cast: false, name: "townWalls" }));
  group.add(mergedMesh(roofG, slate, { cast: false, name: "townRoofs" }));
  const townLitM = plain(0x2a2014, { roughness: 0.6, relief: 0, emissive: 0xffc860, emissiveIntensity: 2.2, vertexColors: true });
  group.add(mergedMesh(winLit, townLitM, { cast: false, name: "townWinLit" }));
  group.add(mergedMesh(winDark, plain(0x1a2638, { roughness: 0.2, relief: 0, vertexColors: true, envMapIntensity: 1.2 }), { cast: false, name: "townWinDark" }));

  // trees (blobby crowns on trunks): a few on the near bank (left of the mill) and along the far bank
  { const crowns = [], trunks = [], rr = rng(41);
    const tree = (x, z, y0, s) => {
      trunks.push(box(0.22 * s, 2.4 * s, 0.22 * s, [x, y0 + 1.2 * s, z], { r: 0.05, grain: true }));
      for (let k = 0; k < 5; k++) { const g = new THREE.IcosahedronGeometry((1.1 + rr() * 0.6) * s, 1), p = g.attributes.position;
        for (let i = 0; i < p.count; i++) { const f = 1 + 0.18 * Math.sin(p.getX(i) * 4 + k) * Math.sin(p.getY(i) * 5); p.setXYZ(i, p.getX(i) * f, p.getY(i) * f, p.getZ(i) * f); }
        g.computeVertexNormals(); g.translate(x + (rr() - 0.5) * 1.6 * s, y0 + (2.6 + rr() * 1.6) * s, z + (rr() - 0.5) * 1.6 * s); boxUV(g, 1.5);
        tint(g, new THREE.Color().setHSL(0.5 + rr() * 0.06, 0.25, 0.13 + rr() * 0.07)); crowns.push(clean(g)); }
    };
    tree(-10.5, 1.5, 0, 1.2); tree(-13, -3, 0, 1.4); tree(11, -6, 0, 1.1); tree(-24, 3.2, 0, 1.3);
    for (let x = -60; x < 60; x += 7 + rr() * 9) if (Math.abs(x - BRIDGE_X) > 5) tree(x, FAR_Z + 2.6 + rr() * 1.2, 0.38, 0.9 + rr() * 0.5);
    group.add(mergedMesh(trunks, wood, { cast: true, name: "trunks" }));
    group.add(mergedMesh(crowns, plain(0xffffff, { roughness: 0.95, relief: 1.2, vertexColors: true }), { cast: true, name: "crowns" }));
  }

  group.add(mergedMesh(S, stone, { cast: true, name: "bankStone" }));
  group.add(mergedMesh(MO, mortar, { cast: false, name: "bankMortar" }));
  group.add(mergedMesh(W, wood, { cast: true, name: "sluice" }));

  // ---------------------------------------------------------------- river (main strip + mill race), foam along banks and piers
  const rg = [];
  { const a = new THREE.PlaneGeometry(600, FAR_Z - BANK_Z + 0.2, 1, 1); a.rotateX(-Math.PI / 2); a.translate(0, RIVER_Y, (BANK_Z + FAR_Z) / 2); rg.push(a);
    const b = new THREE.PlaneGeometry(RACE.x1 - RACE.x0 + 0.1, BANK_Z - RACE.z0 + 0.1, 1, 1); b.rotateX(-Math.PI / 2); b.translate((RACE.x0 + RACE.x1) / 2, RIVER_Y, (RACE.z0 + BANK_Z) / 2); rg.push(b); }
  const piers = [[BANK_Z + 7.05], [BANK_Z + 12.95]].map(([z]) => ({ x: BRIDGE_X, z }));
  const foam = bakeFoamFn((x, z) => {
    let d = Math.min(Math.abs(z - BANK_Z), Math.abs(z - FAR_Z));
    if (z < BANK_Z) d = Math.min(Math.abs(x - RACE.x0), Math.abs(x - RACE.x1));
    for (const p of piers) d = Math.min(d, Math.max(Math.abs(x - p.x) - 2, Math.abs(z - p.z) - 0.45));
    d = Math.min(d, Math.hypot(x - 6.1, z - 1.8) - 0.6);           // water wheel paddles
    return d;
  });
  const river = createRiver(foam, mergeGeometries(rg));
  group.add(river);

  const sky = createExteriorSky(1500); group.add(sky);
  return { group, river, sky, townLitM };
}
