// Video 3: 1870s flour mill on a river, at night (LAYOUT_v03.md). Owner: world agent A (world/mill).
// Footprint x -5..+5, z -4..+4. Ground floor: stone walls (real blocks), flagstones, millstones on a timber platform, sacks,
// chutes, posts + girders + joists; west inside wall (x -4.6) is wood-clad for the NO FLAMES sign; steep stair at x 3.5 rising
// toward -z to a hatch. Top floor (attic, floor y 3.6): trusses (tie beams y 5.6-5.82, queen posts, king posts, purlins) thick
// with flour, pitched slate roof (eaves ~5.8, ridge 7.8, ridge along x), river window in the +z wall at x -2.5 (sill 4.4).
// Outside: yard, bank wall z 5.5, river y -1.2 to z 25, mill race + water wheel on the +x side, stone bridge x 24, far town.
//
//   const mill = await buildMill({ time: "night", sign: true });  scene.add(mill.group);
//   mill.set({ blast: 0..1, shake: 0..1, t, glassBroken });   // pure function of its inputs
//   mill.setTime("night" | "day");  mill.update(t, camera);
//   mill.anchors: signWall {pos, normal}, foremanSpot/newGuyGround/coworkerSpot/stairBottom/stairTop/topSpot {pos, yaw},
//     candleSpot (Vector3, top of crate), fireballPath [Vector3], beamDust [{a, b, w}], flyWindow {pos, normal}, riverLanding,
//     millExteriorBlastCenter, views {groundWide, signClose, topWide, topCandle, rafters, stairs, exteriorNight, riverWide, windowOutside}
//   mill.keyLightPos (world, moon direction) — pass to characters.
import * as THREE from "three";
import { pbr, plain, canvasTex } from "../materials.js";
import { mergedMesh } from "../geometry.js";
import { tileField } from "../apartment/parts.js";
import { TIMES } from "../exterior/util.js";
import { buildOutside } from "./outside.js";
import { V, clamp01, smooth, wob, yawTo, rng, box, boxMM, boxUV, tint, place, clean, cheapBox, stoneFace, coreSlab, flourStrip, flourMound,
  sackPlaced, millstone, woodGear, roundedBox } from "./parts.js";

// ------------------------------------------------------------------------------------------------ dimensions
const F2 = 3.6;                       // top floor level
const STONE_TOP = 3.53;
const PLATE = [5.6, 5.78];            // wall plate (z walls)
const RIDGE = 7.8, SLOPE = 0.46;      // roof top line y = RIDGE - SLOPE*|z|
const TH = Math.atan(SLOPE), SIN = Math.sin(TH), COS = Math.cos(TH);
const LV = 4.85;                      // rafter length along the slope (incl. 0.4 overhang)
const yRoof = (z) => RIDGE - SLOPE * Math.abs(z);
const TRUSS_X = [-3.75, -1.25, 1.25, 3.75];
const HATCH = { x0: 2.95, x1: 4.15, z0: -2.5, z1: -0.5 };
const MOON_DIR = V(0.62, 0.44, 0.65).normalize();     // toward the moon (NE, over the river)

// openings (u = x for z-walls, u = z for x-walls)
const OPEN = {
  south: [{ u0: -0.7, u1: 0.7, y0: -0.1, y1: 2.3 }, { u0: -3.35, u1: -2.25, y0: 1.0, y1: 2.2 }, { u0: 1.9, u1: 2.9, y0: 1.0, y1: 2.2 }],
  north: [{ u0: -3.1, u1: -2.1, y0: 1.0, y1: 2.3 }, { u0: 0.7, u1: 1.7, y0: 1.2, y1: 2.3 }],
  east: [{ u0: -1.7, u1: -0.7, y0: 1.2, y1: 2.2 }],
  west: [],
};
const UP_OPEN = { north: [{ u0: -3.0, u1: -2.0, y0: 4.4, y1: 5.6 }, { u0: 0.5, u1: 1.3, y0: 4.5, y1: 5.4 }], south: [{ u0: 1.6, u1: 2.4, y0: 4.5, y1: 5.3 }] };
const GABLE_WIN = { y0: 6.0, y1: 6.75, u0: -0.38, u1: 0.38 };

export const MILL_TIMES = {
  night: { key: [0x9fb8ff, 2.7], hemi: [0x3a5a7a, 0x10141a, 0.55], fill: 1.6, town: 2.2, river: { deep: [0.004, 0.016, 0.03], spec: 1.0 },
    sky: { ...TIMES.night.sky, zenith: [0.006, 0.014, 0.06], horizon: [0.04, 0.08, 0.17], haze: [0.11, 0.16, 0.26], sunDir: MOON_DIR.toArray(), sunSize: 0.026, clouds: 0.3 },
    hint: { exposure: 1.5 } },
  day: { key: [0xd4deee, 1.5], hemi: [0x9aaabe, 0x2c3138, 1.25], fill: 0.6, town: 0, river: { deep: [0.02, 0.05, 0.07], spec: 0.4 },
    sky: { ...TIMES.winter.sky, sunDir: MOON_DIR.toArray(), clouds: 0.95, zenith: [0.30, 0.37, 0.48], horizon: [0.58, 0.64, 0.72] }, hint: { exposure: 1.1 } },
};

// ------------------------------------------------------------------------------------------------ helpers
const toneC = (r, lo = 0.82, hi = 1.12) => { const k = lo + r() * (hi - lo); return new THREE.Color(k, k, k * 1.02); };
function bucketSet() { const m = new Map(); return { add(k, g) { if (!m.has(k)) m.set(k, []); m.get(k).push(g); return g; }, map: m }; }
/** Build one mesh per material key from a bucket set, add to `parent`. */
function buildInto(parent, B, M, { cast = true, prefix = "" } = {}) {
  const out = {};
  for (const [k, list] of B.map) { if (!list.length) continue; const mesh = mergedMesh(list, M[k], { cast: cast && k !== "glass", name: prefix + k }); parent.add(mesh); out[k] = mesh; }
  return out;
}
/** Re-centre geometries of a bucket set around pivot P (so a group placed at P holds them). */
function recentre(B, P) { for (const list of B.map.values()) for (const g of list) g.translate(-P.x, -P.y, -P.z); }

/** Moonlight shaft: soft additive volume from a window rect along -lightDir. */
function shaftMaterial(k = 0.05) {
  return new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    uniforms: { k: { value: k }, col: { value: new THREE.Color(0x9fb8ff) } },
    vertexShader: `varying vec3 lp; void main(){ lp = position; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
    fragmentShader: `uniform float k; uniform vec3 col; varying vec3 lp;
      void main(){ float e = smoothstep(0.5, 0.22, abs(lp.x)) * smoothstep(0.5, 0.22, abs(lp.y)); float l = clamp(lp.z + 0.5, 0.0, 1.0);
        float a = e * pow(1.0 - l, 1.6) * smoothstep(0.0, 0.08, l) * k; gl_FragColor = vec4(col * a, a); }` });
}
function shaft(center, right, up, w, h, len, mat) {
  const g = new THREE.BoxGeometry(1, 1, 1), ez = MOON_DIR.clone().multiplyScalar(-len);
  const m = new THREE.Matrix4().makeBasis(right.clone().multiplyScalar(w), up.clone().multiplyScalar(h), ez);
  m.setPosition(center.clone().addScaledVector(ez, 0.5)); const mesh = new THREE.Mesh(g, mat); mesh.matrixAutoUpdate = false; mesh.matrix.copy(m);
  mesh.castShadow = false; mesh.receiveShadow = false; mesh.renderOrder = 5; mesh.frustumCulled = false; mesh.name = "moonShaft"; return mesh;
}

/** Window joinery in a wall opening: lining through the wall (nIn..nOut), sill, mullion + transom bars, glass pane. axis as stoneFace. */
function windowFit(B, axis, o, nIn, nOut, { bars = [2, 2], glassAt = null } = {}) {
  const P = (u, y, n) => (axis === "x" ? [u, y, n] : [n, y, u]);
  const mm = (ua, ya, na, ub, yb, nb, opt) => (axis === "x" ? boxMM(ua, ya, na, ub, yb, nb, opt) : boxMM(na, ya, ua, nb, yb, ub, opt));
  const nA = Math.min(nIn, nOut), nB = Math.max(nIn, nOut), t = 0.06;
  B.add("frame", mm(o.u0, o.y0, nA, o.u0 + t, o.y1, nB, { r: 0.006, grain: true }));
  B.add("frame", mm(o.u1 - t, o.y0, nA, o.u1, o.y1, nB, { r: 0.006, grain: true }));
  B.add("frame", mm(o.u0 + t - 0.01, o.y1 - t, nA, o.u1 - t + 0.01, o.y1, nB, { r: 0.006, grain: true }));
  B.add("frame", mm(o.u0 - 0.05, o.y0 - 0.06, nA - 0.04, o.u1 + 0.05, o.y0 + 0.02, nB + 0.04, { r: 0.012, grain: true }));   // sill
  const gn = glassAt ?? (nA + nB) / 2, [cu, cr] = bars;
  for (let i = 1; i < cu; i++) { const u = o.u0 + ((o.u1 - o.u0) * i) / cu; B.add("frame", mm(u - 0.018, o.y0 + 0.02, gn - 0.025, u + 0.018, o.y1 - t + 0.005, gn + 0.025, { r: 0.004 })); }
  for (let j = 1; j < cr; j++) { const y = o.y0 + ((o.y1 - o.y0) * j) / cr; B.add("frame", mm(o.u0 + t - 0.005, y - 0.018, gn - 0.024, o.u1 - t + 0.005, y + 0.018, gn + 0.024, { r: 0.004 })); }
  const gl = mm(o.u0 + t - 0.005, o.y0 + 0.02, gn - 0.004, o.u1 - t + 0.005, o.y1 - t + 0.005, gn + 0.004, { r: 0.001 }); B.add("glass", gl);
}

// ------------------------------------------------------------------------------------------------ build
export async function buildMill(opts = {}) {
  const O = { time: "night", sign: true, ...opts };
  const group = new THREE.Group(); group.name = "mill";
  const [stone, beam, board, floorW, slate, mstone] = await Promise.all([
    pbr("stacked_stone_wall", { color: [0.36, 0.47, 0.74], normalScale: 1.5 }),
    pbr("wood", { color: [0.38, 0.45, 0.58], normalScale: 1.4 }),
    pbr("darkPlanks", { color: [0.6, 0.66, 0.76], normalScale: 1.4 }),
    pbr("darkWood", { color: [0.66, 0.7, 0.8], normalScale: 1.3 }),
    pbr("stacked_stone_wall", { color: [0.28, 0.34, 0.44], normalScale: 1.1 }),
    pbr("brushed_concrete", { color: [0.62, 0.65, 0.72], normalScale: 1.6 }),
  ]);
  const flag = await pbr("stacked_stone_wall", { color: [0.36, 0.45, 0.62], vertexColors: false, normalScale: 1.3 });
  const M = {
    stone, beam, frame: beam, board, floor: floorW, slate, mstone,
    mortar: plain(0x262b33, { roughness: 0.95, relief: 0.9, vertexColors: true }),
    flour: plain(0xf3efe6, { roughness: 0.96, relief: 1.1, vertexColors: true }),
    sack: plain(0xeae4d6, { roughness: 0.95, relief: 1.8, vertexColors: true }),
    iron: plain(0x3a414a, { roughness: 0.5, metalness: 0.6, relief: 0.5, vertexColors: true }),
    glass: plain(0x9fb8ff, { roughness: 0.05, metalness: 0.1, relief: 0, transparent: true, opacity: 0.16, envMapIntensity: 1.6, vertexColors: true }),
  };
  M.glass.depthWrite = false;

  const outside = await buildOutside(); group.add(outside.group);
  const S = bucketSet();                      // static interior/exterior shell
  const glassMeshes = [];

  // ---------------------------------------------------------------- ground floor stone walls (blocks both faces, mortar core)
  const walls = [
    { name: "south", axis: "x", out: -4.0, inn: -3.6, u0: -5.0, u1: 5.0, ops: OPEN.south, seed: 1 },
    { name: "north", axis: "x", out: 4.0, inn: 3.6, u0: -5.0, u1: 5.0, ops: OPEN.north, seed: 2 },
    { name: "east", axis: "z", out: 5.0, inn: 4.6, u0: -3.98, u1: 3.98, ops: OPEN.east, seed: 3 },
    { name: "west", axis: "z", out: -5.0, inn: -4.7, u0: -3.98, u1: 3.98, ops: OPEN.west, seed: 4 },
  ];
  for (const w of walls) {
    const d = Math.sign(w.out - w.inn), qu = w.axis === "x" ? [w.u0 - 0.06, w.u1 + 0.06] : [w.u0, w.u1];
    for (const g of coreSlab({ axis: w.axis, nA: Math.min(w.inn, w.out) + 0.02, nB: Math.max(w.inn, w.out) - 0.02, u0: qu[0], u1: qu[1], y0: -0.05, y1: STONE_TOP, openings: w.ops })) S.add("mortar", g);
    for (const g of stoneFace({ axis: w.axis, faceN: w.out, dir: d, u0: qu[0], u1: qu[1], y0: -0.02, y1: STONE_TOP, openings: w.ops, seed: w.seed })) S.add("stone", g);
    if (w.name !== "west") for (const g of stoneFace({ axis: w.axis, faceN: w.inn, dir: -d, u0: w.axis === "x" ? -4.62 : -3.62, u1: w.axis === "x" ? 4.62 : 3.62,
      y0: 0.0, y1: STONE_TOP - 0.18, openings: w.ops, seed: w.seed + 10, tone: [0.72, 1.0] })) S.add("stone", g);
    for (const o of w.ops) {
      if (o.y0 < 0) continue;                                                              // door handled below
      windowFit(S, w.axis, o, w.inn - d * 0.02, w.out + d * 0.02, { glassAt: w.out - d * 0.12, bars: [2, 3] });
      // stone lintel over the opening (outside + inside)
      for (const n of [w.out + d * 0.015, w.inn - d * 0.015]) S.add("stone", w.axis === "x" ? box(o.u1 - o.u0 + 0.5, 0.26, 0.1, [(o.u0 + o.u1) / 2, o.y1 + 0.13, n], { r: 0.02, tile: 0.9 })
        : box(0.1, 0.26, o.u1 - o.u0 + 0.5, [n, o.y1 + 0.13, (o.u0 + o.u1) / 2], { r: 0.02, tile: 0.9 }));
    }
  }
  // big corner quoins outside
  { const r = rng(9); for (const [x, z] of [[-5, -4], [5, -4], [-5, 4], [5, 4]]) for (let y = 0, k = 0; y < STONE_TOP - 0.1; y += 0.42, k++) {
    const h = Math.min(0.4, STONE_TOP - y - 0.02), long = k % 2 === 0;
    S.add("stone", box(long ? 0.72 : 0.45, h, long ? 0.45 : 0.72, [x + Math.sign(x) * (long ? -0.28 : -0.145), y + h / 2, z + Math.sign(z) * (long ? -0.145 : -0.28)], { r: 0.03, tone: toneC(r, 0.9, 1.15), tile: 0.9 })); } }
  // west inside wall: wood cladding (horizontal boards over battens), front face exactly x = -4.6
  { const r = rng(12);
    for (const z of [-3.2, -2.1, -1.0, 0.1, 1.2, 2.3, 3.3]) S.add("beam", boxMM(-4.69, 0.0, z - 0.05, -4.635, 3.4, z + 0.05, { r: 0.006, grain: true }));
    for (let y = 0.0, i = 0; y < 3.38; y += 0.2, i++) { let z = -3.6 + (i % 3) * -0.7;
      while (z < 3.6) { const len = 1.6 + r() * 1.6, za = Math.max(z, -3.6), zb = Math.min(z + len, 3.6);
        if (zb - za > 0.15) S.add("board", boxMM(-4.638, y + 0.004, za + 0.004, -4.6, y + 0.196, zb - 0.004, { r: 0.006, grain: true, tile: 1.3, tone: toneC(r, 0.78, 1.12) }));
        z += len; } }
    S.add("beam", boxMM(-4.64, 0.0, -3.6, -4.56, 0.16, 3.6, { r: 0.01, grain: true }));                 // skirting
    S.add("beam", boxMM(-4.645, 3.22, -3.6, -4.575, 3.36, 3.6, { r: 0.01, grain: true }));               // top rail
  }
  // door (south, x 0): plank double door with iron straps, step, lining
  { const r = rng(14);
    for (const s of [-1, 1]) for (let k = 0; k < 4; k++) { const x0 = s < 0 ? -0.66 + k * 0.165 : 0.005 + k * 0.165;
      S.add("board", boxMM(x0, 0.02, -3.86, x0 + 0.158, 2.26, -3.79, { r: 0.008, grain: true, tone: toneC(r, 0.75, 1.0) })); }
    for (const y of [0.35, 1.15, 1.95]) { S.add("iron", boxMM(-0.62, y, -3.875, -0.04, y + 0.05, -3.855, { r: 0.004 })); S.add("iron", boxMM(0.04, y, -3.875, 0.62, y + 0.05, -3.855, { r: 0.004 })); }
    S.add("frame", boxMM(-0.78, -0.02, -4.04, -0.66, 2.36, -3.56, { r: 0.01, grain: true })); S.add("frame", boxMM(0.66, -0.02, -4.04, 0.78, 2.36, -3.56, { r: 0.01, grain: true }));
    S.add("frame", boxMM(-0.8, 2.28, -4.05, 0.8, 2.42, -3.55, { r: 0.01, grain: true }));
    S.add("stone", box(1.9, 0.14, 0.6, [0, 0.02, -4.28], { r: 0.03, tile: 0.9 }));
    // painted mill sign board above the door (cool slate blue with white lettering)
    S.add("frame", boxMM(-1.1, 2.58, -4.09, 1.1, 3.06, -4.04, { r: 0.01, grain: true }));
  }

  // ---------------------------------------------------------------- ground floor: flagstones, posts, girders, joists, ceiling = top floor
  const flags = tileField({ u0: -4.66, u1: 4.6, v0: -3.62, v1: 3.62, size: 0.62, sizeV: 0.5, gap: 0.018, depth: 0.07, bevel: 0.014, plane: "y", at: -0.07, material: flag, seed: 5,
    jitter: 0.01, colorFn: (i, j, r) => { const k = 0.72 + r() * 0.42; return new THREE.Color(k * 0.97, k, k * 1.04); } });
  flags.castShadow = false; group.add(flags);
  S.add("mortar", boxMM(-4.8, -0.12, -3.8, 4.8, -0.045, 3.8, { r: 0.002 }));
  // shaker frames: ground posts + girders (group), attic trusses (groups), purlins (groups)
  const shakers = [];
  const mkShaker = (name, pivot) => { const B = bucketSet(); const g = new THREE.Group(); g.name = name; return { B, g, pivot, base: pivot.clone(), seed: shakers.length + 1 }; };
  const ground = mkShaker("groundFrame", V(0, 0, 0));
  for (const z of [-1.2, 1.2]) {
    ground.B.add("beam", boxMM(-4.72, 3.12, z - 0.12, 4.64, 3.37, z + 0.12, { r: 0.018, grain: true, tile: 1.5 }));
    ground.B.add("flour", place(flourStrip(9.2, 0.18, { seed: z > 0 ? 3 : 4 }), [0, 3.35, z]));
    for (const x of [-1.8, 1.8]) {
      ground.B.add("beam", boxMM(x - 0.11, 0.08, z - 0.11, x + 0.11, 3.14, z + 0.11, { r: 0.018, grain: true, tile: 1.5 }));
      for (const s of [-1, 1]) ground.B.add("beam", box(0.1, 0.62, 0.1, [x + s * 0.32, 2.88, z], { r: 0.012, rot: [0, 0, s * 0.785], grain: true }));     // knee braces
      ground.B.add("stone", box(0.4, 0.12, 0.4, [x, 0.05, z], { r: 0.03, tile: 0.8 }));
    }
  }
  shakers.push(ground);
  // joists (static, carry the floor boards; split around the hatch)
  for (let x = -4.5; x <= 4.51; x += 0.6) {
    const inH = x > HATCH.x0 - 0.06 && x < HATCH.x1 + 0.06, segs = inH ? [[-3.72, HATCH.z0 - 0.06], [HATCH.z1 + 0.06, 3.72]] : [[-3.72, 3.72]];
    for (const [a, b] of segs) S.add("beam", boxMM(x - 0.05, 3.36, a, x + 0.05, 3.565, b, { r: 0.01, grain: true, tile: 1.4 }));
  }
  for (const z of [HATCH.z0 - 0.08, HATCH.z1 + 0.08]) S.add("beam", boxMM(HATCH.x0 - 0.12, 3.37, z - 0.06, HATCH.x1 + 0.12, 3.562, z + 0.06, { r: 0.01, grain: true }));
  // top floor boards (along x, rows step in z), hole for the hatch
  { const r = rng(21);
    for (let z = -3.84, row = 0; z < 3.84; z += 0.2, row++) {
      const za = z + 0.004, zb = Math.min(z + 0.2, 3.84) - 0.004, inH = zb > HATCH.z0 && za < HATCH.z1;
      const spans = inH ? [[-4.84, HATCH.x0], [HATCH.x1, 4.84]] : [[-4.84, 4.84]];
      for (const [a, b] of spans) { let x = a - r() * 1.5;
        while (x < b) { const len = 1.4 + r() * 2.0, xa = Math.max(x, a), xb = Math.min(x + len, b);
          if (xb - xa > 0.12) S.add("floor", boxMM(xa + 0.004, F2 - 0.05, za, xb - 0.004, F2 + (r() - 0.5) * 0.004, zb, { r: 0.006, grain: true, tile: 1.4, tone: toneC(r, 0.72, 1.1) }));
          x += len; } }
    }
  }
  // stairs (x 3.05..3.95) from (z 0, y 0) up to (z -2.5, y 3.6) + handrail on the open (west) side
  { const len = Math.hypot(2.5, F2), ang = Math.atan2(F2, 2.5);
    for (const x of [3.08, 3.92]) S.add("beam", box(0.06, 0.26, len + 0.2, [x, F2 / 2 - 0.05, -1.25], { r: 0.01, rot: [ang, 0, 0], grain: true, tile: 1.6 }));
    for (let k = 1; k < 12; k++) S.add("floor", box(0.8, 0.045, 0.27, [3.5, k * 0.3 - 0.022, -k * (2.5 / 12) + 0.06], { r: 0.008, grain: true, tile: 1 }));
    S.add("beam", box(0.05, 0.07, len + 0.1, [3.06, F2 / 2 + 0.85, -1.25], { r: 0.012, rot: [ang, 0, 0], grain: true }));
    for (const [z, y] of [[0.0, 0], [-2.5 + 0.05, F2 - 0.02]]) S.add("beam", boxMM(3.02, y, z - 0.04, 3.1, y + 1.05, z + 0.04, { r: 0.01, grain: true }));
    // hatch railing on the top floor
    S.add("beam", boxMM(HATCH.x0 - 0.1, F2 + 0.92, HATCH.z0, HATCH.x0 - 0.03, F2 + 0.99, HATCH.z1 + 0.1, { r: 0.012, grain: true }));
    S.add("beam", boxMM(HATCH.x0 - 0.1, F2 + 0.921, HATCH.z1 + 0.03, HATCH.x1 + 0.05, F2 + 0.989, HATCH.z1 + 0.1, { r: 0.012, grain: true }));
    for (const [x, z] of [[HATCH.x0 - 0.065, HATCH.z0 + 0.05], [HATCH.x0 - 0.065, HATCH.z1 + 0.065], [HATCH.x1, HATCH.z1 + 0.065]]) S.add("beam", boxMM(x - 0.04, F2 - 0.01, z - 0.04, x + 0.04, F2 + 0.93, z + 0.04, { r: 0.008, grain: true }));
  }

  // ---------------------------------------------------------------- ground floor dressing: millstone platform, tun, hopper, chutes, gear, sacks, flour
  { const r = rng(31);
    const P = { x0: -1.2, x1: 1.4, z0: 1.6, z1: 3.45, h: 0.7 };
    for (const [x, z] of [[P.x0 + 0.08, P.z0 + 0.08], [P.x1 - 0.08, P.z0 + 0.08], [P.x0 + 0.08, P.z1 - 0.08], [P.x1 - 0.08, P.z1 - 0.08], [0.1, P.z0 + 0.08]])
      S.add("beam", boxMM(x - 0.08, 0, z - 0.08, x + 0.08, P.h - 0.05, z + 0.08, { r: 0.012, grain: true }));
    S.add("beam", boxMM(P.x0, P.h - 0.2, P.z0, P.x1, P.h - 0.05, P.z0 + 0.1, { r: 0.012, grain: true }));
    S.add("beam", boxMM(P.x0, P.h - 0.2, P.z0 + 0.1, P.x0 + 0.1, P.h - 0.05, P.z1, { r: 0.012, grain: true }));
    for (let x = P.x0 + 0.005; x < P.x1 - 0.01; x += 0.2) S.add("floor", boxMM(x, P.h - 0.045, P.z0, Math.min(x + 0.195, P.x1), P.h, P.z1, { r: 0.006, grain: true, tone: toneC(r, 0.75, 1.1) }));
    for (let x = P.x0 + 0.002; x < P.x1 - 0.05; x += 0.22) S.add("board", boxMM(x, 0.0, P.z0 - 0.03, Math.min(x + 0.215, P.x1), P.h - 0.2, P.z0 + 0.0, { r: 0.006, grain: true, tone: toneC(r, 0.7, 1.0) }));
    // two steps up on the west side
    for (const [k, y] of [[0, 0.23], [1, 0.46]]) S.add("floor", boxMM(P.x0 - 0.62 + k * 0.3, 0, 2.2, P.x0 + 0.02, y, 2.9, { r: 0.01, grain: true }));
    // tun (staved casing around the stones) + lid + hopper on its horse + chute from the ceiling
    const C = V(0.1, P.h, 2.55), R = 0.78, staves = 22;
    for (let i = 0; i < staves; i++) { const a = (i / staves) * Math.PI * 2, g = box(0.21, 0.48, 0.05, [C.x + Math.cos(a) * R, C.y + 0.24, C.z + Math.sin(a) * R], { r: 0.008, rot: [0, -a + Math.PI / 2, 0], grain: true, tone: toneC(r, 0.75, 1.05) }); S.add("board", g); }
    for (const y of [0.1, 0.38]) { const hoop = new THREE.TorusGeometry(R + 0.03, 0.012, 6, 48); hoop.rotateX(Math.PI / 2); hoop.translate(C.x, C.y + y, C.z); boxUV(hoop, 0.5); S.add("iron", clean(hoop)); }
    for (let x = -R + 0.02; x < R - 0.05; x += 0.19) { const half = Math.sqrt(Math.max(0, R * R - (x + 0.095) ** 2)) - 0.03; if (half > 0.1) S.add("board", boxMM(C.x + x, C.y + 0.46, C.z - half, C.x + x + 0.185, C.y + 0.5, C.z + half, { r: 0.006, grain: true, tone: toneC(r, 0.8, 1.1) })); }
    for (const [dx, dz] of [[-0.42, -0.42], [0.42, -0.42], [-0.42, 0.42], [0.42, 0.42]]) S.add("beam", box(0.07, 0.62, 0.07, [C.x + dx, C.y + 0.8, C.z + dz], { r: 0.01, rot: [dz * 0.25, 0, -dx * 0.25], grain: true }));
    const hop = new THREE.CylinderGeometry(0.5, 0.12, 0.55, 4, 1, true); hop.rotateY(Math.PI / 4); hop.translate(C.x, C.y + 1.33, C.z); boxUV(hop, 0.8); tint(hop, 0xd8d8d8);
    const hopM = new THREE.Mesh(hop, board.clone()); hopM.material.side = THREE.DoubleSide; hopM.castShadow = true; hopM.receiveShadow = true; group.add(hopM);
    S.add("flour", place(flourMound(0.28, 0.28, 0.12, 3), [C.x, C.y + 1.36, C.z]));
    { const a = V(C.x + 0.25, 3.36, C.z - 0.1), b = V(C.x, C.y + 1.5, C.z), L = a.distanceTo(b), g = box(0.2, L + 0.1, 0.2, [0, 0, 0], { r: 0.01, grain: true });
      const q = new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), a.clone().sub(b).normalize()); g.applyQuaternion(q); const m = a.clone().add(b).multiplyScalar(0.5); g.translate(m.x, m.y, m.z); S.add("board", g); }
    // spare millstone lying on blocks, furrowed face up
    for (const g of millstone(0.6, 0.22, 4)) S.add("mstone", place(g, [-2.35, 0.12, 2.9], [0, 0.4, 0]));
    for (const dz of [-0.3, 0.3]) S.add("beam", box(0.9, 0.12, 0.14, [-2.35, 0.06, 2.9 + dz], { r: 0.01, grain: true }));
    // water-wheel shaft through the east wall + pit gear on the inside
    { const sh = new THREE.CylinderGeometry(0.11, 0.11, 2.1, 16); sh.rotateZ(Math.PI / 2); sh.translate(4.9, 0.62, 1.9); boxUV(sh, 0.6); S.add("beam", clean(sh));
      const gear = woodGear(0.48, 22, 0.13); gear.rotateY(Math.PI / 2); gear.translate(4.25, 0.62, 1.9); S.add("beam", gear);
      S.add("beam", boxMM(3.8, 0, 1.75, 4.05, 0.52, 2.05, { r: 0.012, grain: true })); }
    // sack spout from the ceiling with a sack under it
    { S.add("board", box(0.18, 2.0, 0.18, [-0.6, 2.35, -2.3], { r: 0.01, grain: true, rot: [0.12, 0, 0] })); S.add("iron", box(0.14, 0.12, 0.14, [-0.6, 1.3, -2.42], { r: 0.01 }));
      S.add("sack", sackPlaced(1, [-0.6, 0, -2.45], 0.2, false, 0xffffff, 1.05)); S.add("flour", place(flourMound(0.5, 0.42, 0.06, 7), [-0.6, -0.005, -2.3])); }
    // sack piles (lying, stacked), standing sacks
    const pile = (x0, z0, nx, nz, layers, yaw, seed, y0 = 0) => { const rr = rng(seed);
      for (let L = 0; L < layers; L++) for (let i = 0; i < nx - L * 0.5; i++) for (let j = 0; j < nz; j++) {
        const x = x0 + (i + L * 0.5) * 0.56 + (rr() - 0.5) * 0.05, z = z0 + j * 0.66 + (rr() - 0.5) * 0.04;
        S.add("sack", sackPlaced(Math.floor(rr() * 3), [x, y0 + L * 0.31, z], yaw + (rr() - 0.5) * 0.16, true, toneC(rr, 0.82, 1.02), 0.97 + rr() * 0.06)); } };
    pile(-4.15, 2.55, 3, 2, 2, 0, 41);
    pile(1.05, -3.22, 3, 2, 2, 0, 42);
    pile(3.35, 3.2, 2, 1, 2, 0, 43);
    for (const [x, z, a] of [[-4.2, -1.45, 0.3], [-3.82, -1.78, -0.4], [-4.25, -2.1, 1.0]]) S.add("sack", sackPlaced(Math.floor(r() * 3), [x, 0, z], a, false, toneC(r, 0.85, 1.02)));
    // flour on the floor: drifts at wall feet, around the platform
    for (const [x, z, rx, rz, h] of [[-0.2, 1.4, 0.9, 0.3, 0.035], [1.5, 2.2, 0.35, 0.8, 0.03], [-4.3, 2.3, 0.35, 0.6, 0.04], [2.2, -3.25, 0.7, 0.3, 0.03], [4.3, -0.2, 0.25, 0.7, 0.03]])
      S.add("flour", place(flourMound(rx, rz, h, Math.round(x * 10 + z)), [x, -0.004, z]));
  }

  // ---------------------------------------------------------------- NO FLAMES sign on the west cladding (red accent #c22a22)
  const signWall = { pos: V(-4.6, 1.65, 0.1), normal: V(1, 0, 0) };
  let signMesh = null;
  if (O.sign) {
    const tex = canvasTex(1024, 640, (g, w, h) => {
      g.fillStyle = "#c22a22"; g.fillRect(0, 0, w, h); const r = rng(3);
      for (let i = 0; i < 1600; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "255,255,255" : "0,0,0"},${r() * 0.07})`; g.fillRect(r() * w, r() * h, 2 + r() * 40, 2); }
      g.strokeStyle = "#f3efe6"; g.lineWidth = 22; g.strokeRect(34, 34, w - 68, h - 68);
      g.fillStyle = "#f3efe6"; g.textAlign = "center"; g.textBaseline = "middle"; g.font = `900 210px "Arial Black", sans-serif`; g.fillText("NO", w / 2, h * 0.34);
      g.font = `900 170px "Arial Black", sans-serif`; g.fillText("FLAMES!", w / 2, h * 0.7);
    });
    const gb = roundedBox(1.1, 0.69, 0.035, 0.008, 2); boxUV(gb, 1);
    const mats = [plain(0x3b3631, { roughness: 0.8, relief: 0.6 })];
    signMesh = new THREE.Group(); signMesh.name = "noFlamesSign";
    const back = new THREE.Mesh(gb, beam); back.castShadow = true; back.receiveShadow = true; signMesh.add(back);
    const face = new THREE.Mesh(new THREE.PlaneGeometry(1.02, 0.61), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.75, metalness: 0, normalMap: mats[0].normalMap, normalScale: new THREE.Vector2(0.35, 0.35) }));
    face.position.z = 0.023; face.receiveShadow = true; signMesh.add(face);
    for (const sx of [-0.47, 0.47]) for (const sy of [-0.27, 0.27]) { const n = new THREE.Mesh(new THREE.SphereGeometry(0.014, 8, 6), M.iron); n.position.set(sx, sy, 0.02); signMesh.add(n); }
    signMesh.position.copy(signWall.pos).add(V(0.02, 0, 0)); signMesh.rotation.y = Math.PI / 2; signMesh.rotation.z = 0.025; group.add(signMesh);
  }

  // ---------------------------------------------------------------- top floor dressing: grain bin, crates, sack rows, flour drifts
  const candleSpot = V(0.75, F2 + 0.5, 0.35);
  { const r = rng(51);
    // grain bin over the stones
    const B0 = { x0: -0.5, x1: 0.75, z0: 1.95, z1: 3.15, h: 1.15 };
    for (let y = F2; y < F2 + B0.h - 0.05; y += 0.2) { const t = 0.035;
      S.add("board", boxMM(B0.x0, y + 0.003, B0.z0, B0.x1, y + 0.197, B0.z0 + t, { r: 0.006, grain: true, tone: toneC(r, 0.75, 1.05) }));
      S.add("board", boxMM(B0.x0, y + 0.003, B0.z0 + t, B0.x0 + t, y + 0.197, B0.z1, { r: 0.006, grain: true, tone: toneC(r, 0.75, 1.05) }));
      S.add("board", boxMM(B0.x1 - t, y + 0.003, B0.z0 + t, B0.x1, y + 0.197, B0.z1, { r: 0.006, grain: true, tone: toneC(r, 0.75, 1.05) })); }
    for (const [x, z] of [[B0.x0, B0.z0], [B0.x1, B0.z0]]) S.add("beam", boxMM(x - 0.06, F2, z - 0.06, x + 0.06, F2 + B0.h + 0.05, z + 0.06, { r: 0.01, grain: true }));
    S.add("flour", place(flourMound(0.55, 0.5, 0.25, 11), [0.12, F2 + 0.85, 2.6]));
    // crates (candle crate at candleSpot) with plank sides
    const crate = (x, z, s, y0 = F2, yaw = 0) => {
      const out = [];
      for (let k = 0; k < 3; k++) { const yy = y0 + 0.008 + k * (s / 3); out.push(box(s, s / 3 - 0.012, s, [0, yy + s / 6 - 0.006, 0], { r: 0.008, grain: true, tone: toneC(r, 0.72, 1.05) })); }
      for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) out.push(box(0.05, s + 0.004, 0.05, [dx * (s / 2 - 0.02), y0 + s / 2 + 0.002, dz * (s / 2 + 0.008)], { r: 0.008, grain: true }));
      for (const g of out) { g.rotateY(yaw); g.translate(x, 0, z); S.add("board", g); }
    };
    crate(candleSpot.x, candleSpot.z, 0.5, F2, 0.15);
    S.add("board", box(0.47, 0.03, 0.47, [candleSpot.x, F2 + 0.5 + 0.01, candleSpot.z], { r: 0.006, grain: true, rot: [0, 0.15, 0] }));       // lid top = candleSpot.y + 0.025
    crate(1.35, 0.95, 0.55, F2, -0.2); crate(1.4, 0.98, 0.42, F2 + 0.55, 0.3);
    candleSpot.y = F2 + 0.5 + 0.025;
    // sack rows along the walls
    const row = (x0, z, n, layers, seed) => { const rr = rng(seed); for (let L = 0; L < layers; L++) for (let i = 0; i < n - L; i++)
      S.add("sack", sackPlaced(Math.floor(rr() * 3), [x0 + (i + L * 0.5) * 0.56, F2 + L * 0.31, z + (rr() - 0.5) * 0.04], (rr() - 0.5) * 0.16, true, toneC(rr, 0.85, 1.02))); };
    row(1.9, 3.42, 5, 2, 61); row(-4.3, -3.42, 6, 2, 62); row(-4.35, 3.42, 2, 1, 63);
    for (const [x, z, a] of [[-1.6, 3.35, 0.2], [-1.05, 3.4, -0.3], [-4.35, 1.6, 0.9], [-4.3, 0.95, -0.2]]) S.add("sack", sackPlaced(Math.floor(r() * 3), [x, F2, z], a, false, toneC(r, 0.86, 1.02)));
    for (const [x, z, rx, rz, h] of [[-4.5, -1.5, 0.3, 1.6, 0.05], [4.5, 1.6, 0.3, 1.4, 0.05], [-1.8, -3.6, 1.3, 0.25, 0.05], [0.2, 0.6, 0.6, 0.4, 0.02], [-2.6, 1.6, 0.5, 0.35, 0.02]])
      S.add("flour", place(flourMound(rx, rz, h, Math.round(x * 7 + z * 3)), [x, F2 - 0.004, z]));
  }

  // ---------------------------------------------------------------- attic trusses (shakers): tie beam, queen posts + braces, king post, purlin posts
  const beamDust = [];
  TRUSS_X.forEach((x, i) => {
    const T = mkShaker(`truss${i}`, V(x, F2, 0));
    T.B.add("beam", boxMM(x - 0.11, PLATE[0], -3.95, x + 0.11, 5.82, 3.95, { r: 0.02, grain: true, tile: 1.6 }));
    T.B.add("flour", place(flourStrip(7.3, 0.17, { seed: 70 + i }), [x, 5.8, 0], [0, Math.PI / 2, 0]));
    beamDust.push({ a: V(x, 5.86, -3.4), b: V(x, 5.86, 3.4), w: 0.2 });
    for (const s of [-1, 1]) {
      T.B.add("beam", boxMM(x - 0.09, F2 - 0.01, s * 2 - 0.09, x + 0.09, PLATE[0] + 0.02, s * 2 + 0.09, { r: 0.016, grain: true }));               // queen post
      T.B.add("beam", box(0.08, 0.85, 0.09, [x, 5.3, s * 1.72], { r: 0.012, rot: [s * 0.785, 0, 0], grain: true }));                            // knee brace
      T.B.add("beam", boxMM(x - 0.075, 5.81, s * 2 - 0.075, x + 0.075, 6.56, s * 2 + 0.075, { r: 0.012, grain: true }));                        // purlin post
      T.B.add("flour", place(flourMound(0.08, 0.08, 0.05, i * 3 + s), [x, 6.555, s * 2]));
    }
    T.B.add("beam", boxMM(x - 0.08, 5.81, -0.08, x + 0.08, 7.42, 0.08, { r: 0.014, grain: true }));                                                // king post
    for (const s of [-1, 1]) T.B.add("beam", box(0.07, 1.2, 0.08, [x, 6.45, s * 0.42], { r: 0.01, rot: [-s * 0.62, 0, 0], grain: true }));          // struts
    shakers.push(T);
  });
  for (const s of [-1, 1]) {
    const Pu = mkShaker(`purlin${s > 0 ? "N" : "S"}`, V(0, 6.62, s * 2));
    Pu.B.add("beam", boxMM(-4.96, 6.535, s * 2 - 0.08, 4.96, 6.715, s * 2 + 0.08, { r: 0.018, grain: true, tile: 1.6 }));
    shakers.push(Pu);
  }
  // build shakers into groups (geometry re-centred on their pivot)
  for (const sh of shakers) { recentre(sh.B, sh.pivot); buildInto(sh.g, sh.B, M, { prefix: sh.g.name + "_" }); sh.g.position.copy(sh.pivot); group.add(sh.g); }
  beamDust.push({ a: V(-4.4, 3.4, -1.2), b: V(4.3, 3.4, -1.2), w: 0.24 }, { a: V(-4.4, 3.4, 1.2), b: V(4.3, 3.4, 1.2), w: 0.24 });

  // ---------------------------------------------------------------- upper timber walls (fold outward in the blast)
  const folds = [];
  const upShafts = [];
  const shM = shaftMaterial(0.05), shMg = shaftMaterial(0.04);
  const mkWall = (name, pivot, axis, sgn) => ({ name, B: bucketSet(), g: new THREE.Group(), pivot, axis, sgn });
  // z walls (north +z, south -z)
  for (const [name, s] of [["north", 1], ["south", -1]]) {
    const W = mkWall(`upper_${name}`, V(0, 3.75, s * 4.02), "x", s), ops = UP_OPEN[name], r = rng(s > 0 ? 81 : 82);
    // sill beam stays static
    S.add("beam", boxMM(-5.12, 3.5, s > 0 ? 3.88 : -4.1, 5.12, 3.75, s > 0 ? 4.1 : -3.88, { r: 0.02, grain: true, tile: 1.6 }));
    // studs
    const studX = []; for (let x = -4.92; x <= 4.93; x += 0.82) studX.push(x);
    for (const o of ops) studX.push(o.u0 - 0.06, o.u1 + 0.06);
    for (const x of studX) { if (ops.some((o) => x > o.u0 - 0.04 && x < o.u1 + 0.04)) continue;
      W.B.add("beam", boxMM(x - 0.06, 3.74, s > 0 ? 3.85 : -3.985, x + 0.06, PLATE[0] + 0.01, s > 0 ? 3.985 : -3.85, { r: 0.01, grain: true })); }
    // girt at 4.25, cut at openings
    { let c = -4.98; for (const o of [...ops].sort((a, b) => a.u0 - b.u0)) { if (o.y0 < 4.33) { W.B.add("beam", boxMM(c, 4.2, s > 0 ? 3.86 : -3.98, o.u0 - 0.06, 4.31, s > 0 ? 3.98 : -3.86, { r: 0.008, grain: true })); c = o.u1 + 0.06; } }
      W.B.add("beam", boxMM(c, 4.2, s > 0 ? 3.86 : -3.98, 4.98, 4.31, s > 0 ? 3.98 : -3.86, { r: 0.008, grain: true })); }
    // wall plate (flour on top inside)
    W.B.add("beam", boxMM(-5.0, PLATE[0], s > 0 ? 3.84 : -4.03, 5.0, PLATE[1], s > 0 ? 4.03 : -3.84, { r: 0.018, grain: true, tile: 1.6 }));
    W.B.add("flour", place(flourStrip(9.4, 0.12, { seed: s > 0 ? 91 : 92 }), [0, PLATE[1] - 0.02, s * 3.9]));
    // vertical boards with gaps + battens, cut around openings
    for (let x = -5.04; x < 5.04; x += 0.22) {
      const xa = x + 0.005, xb = Math.min(x + 0.22, 5.04) - 0.005, yA = 3.7, yB = PLATE[1] - 0.03, tone = toneC(r, 0.72, 1.1);
      const cut = ops.find((o) => xb > o.u0 && xa < o.u1);
      const spans = cut ? [[yA, cut.y0 - 0.0], [cut.y1 + 0.0, yB]] : [[yA, yB]];
      for (const [ya, yb] of spans) if (yb - ya > 0.05) W.B.add("board", boxMM(cut ? Math.max(xa, xa) : xa, ya, s > 0 ? 3.985 : -4.015, xb, yb, s > 0 ? 4.015 : -3.985, { r: 0.006, grain: true, tile: 1.3, tone }));
      const bx = x + 0.22; if (bx < 5.0 && !ops.some((o) => bx > o.u0 - 0.04 && bx < o.u1 + 0.04)) W.B.add("beam", boxMM(bx - 0.03, yA, s > 0 ? 4.01 : -4.045, bx + 0.03, yB, s > 0 ? 4.045 : -4.01, { r: 0.008, grain: true }));
      else if (bx < 5.0) for (const o of ops) if (bx > o.u0 - 0.04 && bx < o.u1 + 0.04) for (const [ya, yb] of [[yA, o.y0 - 0.08], [o.y1 + 0.08, yB]]) if (yb - ya > 0.05) W.B.add("beam", boxMM(bx - 0.03, ya, s > 0 ? 4.01 : -4.045, bx + 0.03, yb, s > 0 ? 4.045 : -4.01, { r: 0.008, grain: true }));
    }
    // corner trims
    for (const x of [-5.0, 5.0]) W.B.add("beam", boxMM(x - 0.07, 3.72, s > 0 ? 4.0 : -4.06, x + 0.07, PLATE[1], s > 0 ? 4.06 : -4.0, { r: 0.01, grain: true }));
    for (const o of ops) {
      windowFit(W.B, "x", o, s * 3.84, s * 4.05, { glassAt: s * 3.96, bars: [2, 2] });
      for (const [u, y] of [[(o.u0 + o.u1) / 2, o.y1 + 0.06]]) W.B.add("beam", boxMM(o.u0 - 0.14, y - 0.06, s > 0 ? 4.0 : -4.07, o.u1 + 0.14, y + 0.07, s > 0 ? 4.07 : -4.0, { r: 0.01, grain: true }));
      if (s > 0) { const c = V((o.u0 + o.u1) / 2, (o.y0 + o.y1) / 2, 3.96); const sm = shaft(c, V(1, 0, 0), V(0, 1, 0), o.u1 - o.u0 - 0.1, o.y1 - o.y0 - 0.1, 6.5, shM); upShafts.push(sm); W.g.add(sm); }
    }
    if (s > 0) { // hoist beam (lucam) over the river window: beam out, pulley, rope
      W.B.add("beam", boxMM(-2.58, 5.86, 3.6, -2.42, 6.02, 5.0, { r: 0.015, grain: true }));
      const pul = new THREE.TorusGeometry(0.11, 0.03, 8, 20); pul.rotateY(Math.PI / 2); pul.translate(-2.5, 5.72, 4.85); boxUV(pul, 0.4); W.B.add("iron", clean(pul));
      const rope = new THREE.CylinderGeometry(0.012, 0.012, 1.7, 6); rope.translate(-2.5 + 0.11, 4.9, 4.85); boxUV(rope, 0.3); W.B.add("sack", clean(rope));
    }
    folds.push(W);
  }
  // gable walls (east +x, west -x)
  for (const [name, s] of [["east", 1], ["west", -1]]) {
    const W = mkWall(`gable_${name}`, V(s * 5.02, 3.75, 0), "z", s), r = rng(s > 0 ? 83 : 84), o = GABLE_WIN;
    S.add("beam", boxMM(s > 0 ? 4.88 : -5.1, 3.48, -3.9, s > 0 ? 5.1 : -4.88, 3.73, 3.9, { r: 0.02, grain: true, tile: 1.6 }));
    for (let z = -3.6; z <= 3.61; z += 0.9) { if (z > o.u0 - 0.05 && z < o.u1 + 0.05) continue; const top = yRoof(Math.abs(z) + 0.07) - 0.2;
      W.B.add("beam", boxMM(s > 0 ? 4.85 : -4.985, 3.72, z - 0.06, s > 0 ? 4.985 : -4.85, top, z + 0.06, { r: 0.01, grain: true })); }
    for (const z of [o.u0 - 0.06, o.u1 + 0.06]) W.B.add("beam", boxMM(s > 0 ? 4.85 : -4.985, 3.72, z - 0.05, s > 0 ? 4.985 : -4.85, yRoof(Math.abs(z) + 0.05) - 0.2, z + 0.05, { r: 0.01, grain: true }));
    for (let z = -3.97; z < 3.97; z += 0.21) {
      const za = z + 0.005, zb = Math.min(z + 0.21, 3.97) - 0.005, top = yRoof(Math.max(Math.abs(za), Math.abs(zb))) - 0.035, tone = toneC(r, 0.72, 1.1);
      const cut = zb > o.u0 && za < o.u1, spans = cut ? [[3.7, o.y0], [o.y1, top]] : [[3.7, top]];
      for (const [ya, yb] of spans) if (yb - ya > 0.05) W.B.add("board", boxMM(s > 0 ? 4.985 : -5.015, ya, za, s > 0 ? 5.015 : -4.985, yb, zb, { r: 0.006, grain: true, tile: 1.3, tone }));
    }
    windowFit(W.B, "z", o, s * 4.84, s * 5.05, { glassAt: s * 4.96, bars: [2, 2] });
    folds.push(W);
  }
  for (const W of folds) { recentre(W.B, W.pivot); buildInto(W.g, W.B, M, { prefix: W.name + "_" }); W.g.position.copy(W.pivot); group.add(W.g);
    W.g.traverse((o) => { if (o.isMesh && o.name.endsWith("glass")) glassMeshes.push(o); });
    // shafts were added in world coords before re-centring: shift them into the group's frame
    for (const c of W.g.children) if (c.name === "moonShaft") { c.matrix.premultiply(new THREE.Matrix4().makeTranslation(-W.pivot.x, -W.pivot.y, -W.pivot.z)); } }

  // ---------------------------------------------------------------- roof: 6 panels (rafters + sarking + slates + barge boards) and the ridge
  const flyers = [];
  const RAF_X = []; for (let x = -5.1; x <= 5.11; x += 0.6) RAF_X.push(x);
  const panelX = [[-5.36, -1.79], [-1.79, 1.79], [1.79, 5.36]];
  for (const s of [-1, 1]) panelX.forEach(([xa, xb], pi) => {
    const B = bucketSet(), r = rng(100 + pi * 7 + (s > 0 ? 50 : 0));
    // local (u along x, v down slope, w outward) -> world: x = u, y = RIDGE - v*SIN + w*COS, z = s*(v*COS + w*SIN). (u flipped for s>0 to keep handedness)
    const basis = new THREE.Matrix4().makeBasis(V(-s, 0, 0), V(0, -SIN, s * COS), V(0, COS, s * SIN)).setPosition(0, RIDGE, 0);
    const add = (k, g) => { g.applyMatrix4(basis); B.add(k, g); };
    const U = (x) => -s * x;                                   // world x -> local u
    const ua = Math.min(U(xa), U(xb)), ub = Math.max(U(xa), U(xb));
    for (const x of RAF_X) if (x > xa + 0.02 && x < xb - 0.02) add("beam", box(0.08, LV - 0.05, 0.16, [U(x), (LV + 0.05) / 2, -0.08], { r: 0.01, grain: true, tile: 1.6 }));
    for (let v = 0.06; v < LV; v += 0.25) add("board", box(ub - ua - 0.01, Math.min(0.24, LV - v), 0.025, [(ua + ub) / 2, v + 0.12, 0.0125], { r: 0.004, grain: true, tile: 1.4, tone: toneC(r, 0.7, 1.0) }));
    for (let row = 0, vl = LV + 0.03; vl > 0.24; row++, vl -= 0.17) {
      for (let u = ua - (row % 2) * 0.14; u < ub; u += 0.28) { const u0 = Math.max(u, ua), u1 = Math.min(u + 0.28, ub); if (u1 - u0 < 0.06) continue;
        add("slate", cheapBox(u1 - u0 - 0.012, 0.36, 0.014, [(u0 + u1) / 2, vl - 0.18, 0.039 + (r() - 0.5) * 0.004], [0.04, 0, (r() - 0.5) * 0.02], toneC(r, 0.7, 1.15), 0.5)); }
    }
    if (pi !== 1) { const ue = pi === 0 ? U(-5.34) : U(5.34);     // barge board on the gable end
      add("board", box(0.03, LV + 0.02, 0.26, [ue, LV / 2, -0.07], { r: 0.006, grain: true })); }
    const C = V((xa + xb) / 2, RIDGE - (LV / 2) * SIN, s * (LV / 2) * COS);
    recentre(B, C); const g = new THREE.Group(); g.name = `roof_${s > 0 ? "N" : "S"}${pi}`; buildInto(g, B, M, { prefix: g.name + "_" }); g.position.copy(C); group.add(g);
    flyers.push({ g, base: C.clone(), vel: V((xa + xb) / 2 * 0.9 + (r() - 0.5) * 3, 13 + r() * 6, s * (5 + r() * 4)), spinAxis: V(r() - 0.5, (r() - 0.5) * 0.4, r() - 0.5).normalize(), spin: (2.2 + r() * 2.5) * (r() < 0.5 ? -1 : 1), gk: 6 });
  });
  { const B = bucketSet(), C = V(0, RIDGE - 0.1, 0);
    B.add("beam", boxMM(-5.2, 7.4, -0.065, 5.2, 7.64, 0.065, { r: 0.018, grain: true, tile: 1.6 }));
    const cap = new THREE.CylinderGeometry(0.13, 0.13, 10.8, 14, 1, false, 0, Math.PI); cap.rotateZ(Math.PI / 2); cap.rotateX(-Math.PI / 2); cap.translate(0, RIDGE - 0.02, 0); boxUV(cap, 0.6); tint(cap, 0xc8ccd4); B.add("slate", clean(cap));
    recentre(B, C); const g = new THREE.Group(); g.name = "ridge"; buildInto(g, B, M, { prefix: "ridge_" }); g.position.copy(C); group.add(g);
    flyers.push({ g, base: C.clone(), vel: V(0.5, 17, -1.5), spinAxis: V(0.2, 0.1, 1).normalize(), spin: 1.6, gk: 6 });
  }

  // ---------------------------------------------------------------- water wheel (+x side, in the mill race)
  const wheel = new THREE.Group(); wheel.name = "waterWheel"; wheel.position.set(6.1, 0.62, 1.9); group.add(wheel);
  { const B = bucketSet(), R = 1.9, n = 16;
    for (const sx of [-0.38, 0.38]) { const rim = new THREE.TorusGeometry(R, 0.06, 8, 64); rim.rotateY(Math.PI / 2); rim.translate(sx, 0, 0); boxUV(rim, 0.6); B.add("beam", clean(rim));
      const rim2 = new THREE.TorusGeometry(R - 0.35, 0.05, 8, 48); rim2.rotateY(Math.PI / 2); rim2.translate(sx, 0, 0); boxUV(rim2, 0.6); B.add("beam", clean(rim2));
      for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; B.add("beam", box(0.07, R * 2 - 0.1, 0.09, [sx, 0, 0], { r: 0.01, rot: [a, 0, 0], grain: true })); } }
    for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2; B.add("board", box(0.86, 0.42, 0.04, [0, Math.cos(a) * (R - 0.17), Math.sin(a) * (R - 0.17)], { r: 0.006, rot: [a, 0, 0], grain: true })); }
    const hub = new THREE.CylinderGeometry(0.2, 0.2, 1.75, 16); hub.rotateZ(Math.PI / 2); boxUV(hub, 0.5); B.add("iron", clean(hub));
    buildInto(wheel, B, M, { prefix: "wheel_" });
  }
  // wheel bearing post on the race wall
  S.add("beam", boxMM(6.95, -0.6, 1.74, 7.13, 0.75, 2.06, { r: 0.012, grain: true }));

  // ---------------------------------------------------------------- static shell
  const shell = buildInto(group, S, M, { prefix: "mill_" });
  if (shell.glass) glassMeshes.push(shell.glass);

  // ---------------------------------------------------------------- lights: moon key (shadows), hemi, cool interior fills, shafts
  const key = new THREE.DirectionalLight(0x9fb8ff, 2.7); key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048); key.shadow.bias = -0.0003; key.shadow.normalBias = 0.025;
  const sc = key.shadow.camera; sc.left = -11; sc.right = 11; sc.top = 11; sc.bottom = -11; sc.near = 1; sc.far = 80;
  const focus = V(0.5, 3, 1); key.position.copy(focus).addScaledVector(MOON_DIR, 40); key.target.position.copy(focus); group.add(key, key.target);
  const hemi = new THREE.HemisphereLight(0x3a5a7a, 0x10141a, 0.55); group.add(hemi);
  const fills = [[-2.6, 1.6, 1.8, 2.0, 7], [1.5, 1.8, -1.2, 1.4, 7], [-1.5, 5.0, 1.4, 1.7, 7], [2.0, 5.2, -1.4, 1.0, 6]].map(([x, y, z, k, d]) => {
    const l = new THREE.PointLight(0x7f9fd8, k, d, 2); l.position.set(x, y, z); l.userData.k = k; group.add(l); return l; });
  const lowShafts = [];
  for (const o of OPEN.north) { const c = V((o.u0 + o.u1) / 2, (o.y0 + o.y1) / 2, 3.88); const m = shaft(c, V(1, 0, 0), V(0, 1, 0), o.u1 - o.u0 - 0.12, o.y1 - o.y0 - 0.12, 6, shMg); lowShafts.push(m); group.add(m); }
  { const o = OPEN.east[0]; const c = V(4.88, (o.y0 + o.y1) / 2, (o.u0 + o.u1) / 2); const m = shaft(c, V(0, 0, 1), V(0, 1, 0), o.u1 - o.u0 - 0.12, o.y1 - o.y0 - 0.12, 5, shMg); lowShafts.push(m); group.add(m); }

  // ---------------------------------------------------------------- anchors + views
  const at = (pos, yaw) => ({ pos, yaw });
  const foreman = V(-3.7, 0, 0.9), newGuy = V(-2.35, 0, -0.65), cow = V(-3.4, 0, 2.4);
  const topSpot = V(0, F2, 0), stairTop = V(3.55, F2, -3.05);
  const vw = (pos, target, fov) => ({ pos, target, fov });
  const anchors = {
    signWall,
    foremanSpot: at(foreman, yawTo(foreman, newGuy) - 0.35),
    newGuyGround: at(newGuy, yawTo(newGuy, foreman) + 0.35),
    coworkerSpot: at(cow, yawTo(cow, V(-3.0, 0, 0.4))),
    stairBottom: at(V(3.5, 0, 0.45), Math.PI),
    stairTop: at(stairTop, yawTo(stairTop, topSpot)),
    topSpot: at(topSpot, 2.2),
    candleSpot,
    fireballPath: [V(-4.3, 6.3, -1.0), V(-2.2, 6.45, -0.85), V(0, 6.5, -1.05), V(2.2, 6.45, -0.9), V(4.3, 6.3, -1.0)],
    beamDust,
    flyWindow: { pos: V(-2.5, 5.0, 4.05), normal: V(0, 0, 1) },
    riverLanding: V(-2.5, -1.2, 8.0),
    millExteriorBlastCenter: V(0, 5.6, 0),
    keyLightPos: focus.clone().addScaledVector(MOON_DIR, 40),
    views: {
      groundWide: vw(V(2.6, 1.7, 0.3), V(-3.2, 1.2, 0.35), 50),
      signClose: vw(V(-2.3, 1.65, -1.0), V(-4.6, 1.6, 0.1), 40),
      topWide: vw(V(3.7, 4.95, -3.15), V(-1.2, 4.7, 1.0), 58),
      topCandle: vw(V(2.45, 4.6, -2.35), V(0.25, 4.4, 0.15), 64),
      rafters: vw(V(-2.5, 4.4, -1.0), V(1.5, 6.6, 0.6), 62),
      stairs: vw(V(0.6, 1.5, 1.4), V(3.5, 1.8, -1.4), 48),
      exteriorNight: vw(V(14, 3.0, 22), V(-1, 3.6, 0), 50),
      riverWide: vw(V(-16, 3.2, 10), V(10, 0.5, 18), 52),
      windowOutside: vw(V(-1.6, 5.4, 8.8), V(-2.5, 4.95, 4.0), 46),
    },
  };

  // ---------------------------------------------------------------- set / setTime / update
  for (const sh of shakers) sh.baseRot = sh.g.rotation.clone();
  const q = new THREE.Quaternion();
  function set({ blast = 0, shake = 0, t = 0, glassBroken = false } = {}) {
    const b = clamp01(blast), k = clamp01(shake);
    // shake: rattle trusses / purlins / ground frame with deterministic noise of t
    for (const sh of shakers) {
      const A = k, i = sh.seed;
      sh.g.position.set(sh.base.x + A * 0.012 * wob(t * 0.9, i + 9), sh.base.y + A * 0.01 * Math.abs(wob(t * 1.3, i + 5)), sh.base.z + A * 0.01 * wob(t * 1.1, i + 2));
      sh.g.rotation.set(A * 0.008 * wob(t, i), 0, A * 0.006 * wob(t * 1.2, i + 4));
    }
    // blast: roof panels + ridge fly up and spin; upper walls fold outward at their base
    for (const f of flyers) {
      const e = b;
      f.g.position.set(f.base.x + f.vel.x * e, f.base.y + f.vel.y * e - f.gk * e * e, f.base.z + f.vel.z * e);
      f.g.quaternion.copy(q.setFromAxisAngle(f.spinAxis, f.spin * e * 2.2));
      f.g.visible = true;
    }
    const ang = (Math.PI / 2) * 1.04 * smooth(0.0, 0.6, b);
    for (const W of folds) {
      W.g.rotation.set(0, 0, 0);
      if (W.axis === "x") W.g.rotation.x = W.sgn * ang; else W.g.rotation.z = -W.sgn * ang;
      W.g.position.copy(W.pivot);
    }
    const glassOn = !glassBroken && b <= 0;
    for (const m of glassMeshes) m.visible = glassOn;
    for (const m of upShafts) m.visible = b < 0.02;
  }
  function setTime(name = "night") {
    const P = MILL_TIMES[name] || MILL_TIMES.night;
    key.color.set(P.key[0]); key.intensity = P.key[1];
    hemi.color.set(P.hemi[0]); hemi.groundColor.set(P.hemi[1]); hemi.intensity = P.hemi[2];
    for (const l of fills) l.intensity = l.userData.k * P.fill;
    outside.sky.userData.setPreset(P.sky);
    const su = outside.river.userData.uniforms;
    su.keyDir.value.copy(MOON_DIR); su.keyCol.value.copy(new THREE.Vector3(key.color.r, key.color.g, key.color.b)).multiplyScalar(P.key[1] * 0.6);
    su.amb.value.set(hemi.color.r, hemi.color.g, hemi.color.b).multiplyScalar(P.hemi[2] * 0.5);
    su.deep.value.set(...P.river.deep); su.specK.value = P.river.spec;
    for (const kk of ["zenith", "horizon", "haze", "seaH"]) su[kk].value.set(...P.sky[kk]);
    su.hazeW.value = P.sky.hazeW; su.hazeK.value = P.sky.hazeK; su.clouds.value = P.sky.clouds; su.cloudLit.value.set(...P.sky.cloudLit);
    outside.townLitM.emissiveIntensity = P.town;
    shM.uniforms.k.value = name === "day" ? 0.02 : 0.05; shMg.uniforms.k.value = name === "day" ? 0.015 : 0.04;
    return P.hint;
  }
  function update(t = 0, camera = null) {
    outside.sky.userData.update(t); outside.river.userData.uniforms.time.value = t;
    wheel.rotation.x = -t * 0.55;
  }
  setTime(O.time); set({});

  return { group, set, setTime, update, anchors, keyLightPos: anchors.keyLightPos, signMesh, lights: { key, hemi, fills } };
}
