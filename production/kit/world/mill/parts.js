// Mill kit (video 3): stone walls with real blocks, flour strips, sacks with folds, millstones with furrows, deterministic noise.
// Owner: world agent A (world/mill). Pure geometry helpers; materials live in index.js.
import * as THREE from "three";
import { roundedBox, boxUV, grainUV, tint, place, clean, mergeGeometries, rng, box, boxMM } from "../apartment/parts.js";

export { roundedBox, boxUV, grainUV, tint, place, clean, mergeGeometries, rng, box, boxMM };

export const V = (x, y, z) => new THREE.Vector3(x, y, z);
export const clamp01 = (x) => Math.min(1, Math.max(0, x));
export const smooth = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
/** Deterministic smooth noise of t (sum of incommensurate sines), range ~[-1, 1]. */
export const wob = (t, s = 0) => (Math.sin(t * 13.1 + s * 1.7) * 0.5 + Math.sin(t * 21.7 + s * 3.1) * 0.3 + Math.sin(t * 37.3 + s * 5.3) * 0.2);
/** yaw so that a character at `from` (facing +Z at yaw 0) faces `to`. */
export const yawTo = (from, to) => Math.atan2(to.x - from.x, to.z - from.z);
const toneJ = (r, lo, hi, cool = 0.04) => { const k = lo + r() * (hi - lo), w = (r() - 0.5) * cool; return new THREE.Color(k * (1 - w), k, k * (1 + w)); };

/** Plain box with box UVs + tone, no bevel (cheap repeated pieces: slates, cobbles). */
export function cheapBox(w, h, d, pos, rot = [0, 0, 0], tone = 0xffffff, tile = 1) {
  const g = new THREE.BoxGeometry(w, h, d); boxUV(g, tile, [pos[0] * 0.31 % 1, pos[2] * 0.47 % 1]); tint(g, tone); return place(clean(g), pos, rot);
}

/**
 * Stone wall face made of real blocks over a recessed mortar core.
 * axis "x": wall runs along X at depth n (faces ±Z); axis "z": wall runs along Z at depth n (faces ±X).
 * faceN = world coordinate of the nominal face, dir = +1/-1 outward normal sign along the normal axis.
 * openings: [{u0,u1,y0,y1}] in wall coords (u = x for axis "x", z for axis "z"). Returns geometries (blocks).
 */
export function stoneFace({ axis = "x", faceN, dir = 1, u0, u1, y0, y1, openings = [], seed = 1, rowH = [0.24, 0.34], len = [0.38, 0.78],
  gap = 0.022, depth = 0.07, relief = 0.012, tone = [0.78, 1.08] }) {
  const r = rng(seed), out = [];
  let y = y0;
  while (y < y1 - 0.05) {
    let h = rowH[0] + r() * (rowH[1] - rowH[0]); if (y1 - (y + h) < 0.12) h = y1 - y;
    const ya = y, yb = y + h;
    const blocked = openings.filter((o) => ya < o.y1 - 0.01 && yb > o.y0 + 0.01).map((o) => [o.u0, o.u1]).sort((a, b) => a[0] - b[0]);
    const free = []; let c = u0;
    for (const [a, b] of blocked) { if (a > c) free.push([c, a]); c = Math.max(c, b); }
    if (c < u1) free.push([c, u1]);
    for (const [fa, fb] of free) {
      let u = fa + (r() < 0.5 ? 0 : -r() * 0.2);
      u = Math.max(u, fa);
      while (u < fb - 0.02) {
        let l = len[0] + r() * (len[1] - len[0]); if (fb - (u + l) < 0.16) l = fb - u;
        const w = l - gap, hh = h - gap, d = depth + (r() - 0.5) * relief * 2;
        if (w > 0.05) {
          const g = roundedBox(w, hh, d, 0.02 + r() * 0.012, 1); boxUV(g, 0.9, [r() * 7, r() * 7]); tint(g, toneJ(r, tone[0], tone[1], 0.08));
          const nC = faceN + dir * (d / 2 - depth + 0.03), uc = u + l / 2, yc = ya + h / 2;
          const rot = [(r() - 0.5) * 0.01, (r() - 0.5) * 0.012, (r() - 0.5) * 0.01];
          out.push(axis === "x" ? place(g, [uc, yc, nC], rot) : place(g, [nC, yc, uc], [rot[0], rot[1] + Math.PI / 2, rot[2]]));
        }
        u += l;
      }
    }
    y += h;
  }
  return out;
}

/** Mortar core slab with rectangular openings (axis/u/y as stoneFace), between normal coords nA..nB. */
export function coreSlab({ axis = "x", nA, nB, u0, u1, y0, y1, openings = [], tone = 0xffffff }) {
  const out = [], mk = (ua, ub, ya, yb) => {
    if (ub - ua < 0.01 || yb - ya < 0.01) return;
    out.push(axis === "x" ? boxMM(ua, ya, nA, ub, yb, nB, { r: 0.003, tile: 1.4, tone }) : boxMM(nA, ya, ua, nB, yb, ub, { r: 0.003, tile: 1.4, tone }));
  };
  const ops = [...openings].sort((a, b) => a.u0 - b.u0); let c = u0;
  for (const o of ops) { mk(c, o.u0, y0, y1); mk(o.u0, o.u1, y0, o.y0); mk(o.u0, o.u1, o.y1, y1); c = o.u1; }
  mk(c, u1, y0, y1);
  return out;
}

/** Lumpy flour layer lying on a beam top: length L along local X, width w, base y=0 (sink it ~2 cm into the beam). */
export function flourStrip(L, w, { h = 0.045, seed = 1, segL = null } = {}) {
  const nx = Math.max(4, Math.round(L / (segL || 0.08))), nz = 4, r = rng(seed);
  const g = new THREE.BoxGeometry(L, h, w, nx, 1, nz); const p = g.attributes.position;
  const ph = [r() * 9, r() * 9, r() * 9];
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    if (y > 0) {
      const edge = 1 - Math.pow(Math.abs(z) / (w / 2), 2) * 0.75;        // rounded cross-section
      const ends = Math.min(1, (L / 2 - Math.abs(x)) / 0.12 + 0.25);
      const n = 0.65 + 0.35 * Math.sin(x * 5.1 + ph[0]) * Math.sin(x * 2.3 + ph[1]) + 0.18 * Math.sin(x * 17 + ph[2]);
      p.setY(i, -h / 2 + h * Math.max(0.15, edge * ends * n) * 1.0 + 0.004);
      p.setZ(i, z * (0.92 + 0.08 * Math.sin(x * 7 + ph[1])));
    }
  }
  g.translate(0, h / 2, 0); g.computeVertexNormals(); boxUV(g, 0.5); return clean(g);
}

/** Flour drift / pile on the floor: low noisy dome, radius rx x rz, height h. */
export function flourMound(rx, rz, h, seed = 1) {
  const g = new THREE.SphereGeometry(1, 20, 8, 0, Math.PI * 2, 0, Math.PI / 2), p = g.attributes.position, r = rng(seed), ph = r() * 9;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i), a = Math.atan2(z, x), k = 1 + 0.22 * Math.sin(a * 3 + ph) + 0.12 * Math.sin(a * 7 + ph * 2);
    p.setXYZ(i, x * rx * k, Math.pow(y, 1.6) * h, z * rz * k);
  }
  g.computeVertexNormals(); boxUV(g, 0.4); return clean(g);
}

/** Flour sack with folds, a tied neck and a flopped ear. Base on y=0, ~0.62 m tall, faces +Z. */
const _sack = new Map();
export function sackGeom(variant = 0) {
  if (_sack.has(variant)) return _sack.get(variant).clone();
  const r = rng(11 + variant * 7), g = new THREE.SphereGeometry(1, 28, 22), p = g.attributes.position;
  const W = 0.25 + r() * 0.03, D = 0.17 + r() * 0.03, H = 0.30 + r() * 0.04, ph = [r() * 9, r() * 9, r() * 9];
  for (let i = 0; i < p.count; i++) {
    let x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const a = Math.atan2(z, x);
    const belly = 1 + 0.1 * Math.cos(y * 1.5);
    const squareish = 1 + 0.12 * Math.pow(Math.abs(Math.cos(2 * a)), 2);
    const folds = 1 + 0.045 * Math.sin(a * 9 + y * 3 + ph[0]) * (0.5 + 0.5 * y) + 0.03 * Math.sin(y * 11 + a * 2 + ph[1]);
    let sx = W * belly * squareish * folds, sz = D * belly * squareish * folds;
    if (y < -0.55) { const f = (y + 1) / 0.45; sx *= 0.9 + 0.1 * f; sz *= 0.9 + 0.1 * f; y = -0.55 - (0.45 * (1 - Math.pow(1 - f, 3))) * 0.35; }  // flat bottom
    let yy = y * H;
    if (y > 0.55) { const f = (y - 0.55) / 0.45; const neck = 1 - 0.78 * Math.sin(Math.min(1, f * 1.6) * Math.PI / 2); sx *= neck; sz *= neck; yy = 0.55 * H + f * 0.16; }   // gathered neck
    p.setXYZ(i, x * sx, yy + H * 0.55 * 0.6 + 0.0, z * sz);
  }
  g.computeVertexNormals(); g.computeBoundingBox(); g.translate(0, -g.boundingBox.min.y, 0);
  // tie cord (thin torus) + ear (flattened blob) on top
  g.computeBoundingBox(); const top = g.boundingBox.max.y;
  const tie = new THREE.TorusGeometry(0.045, 0.011, 6, 18); tie.rotateX(Math.PI / 2); tie.translate(0, top - 0.07, 0);
  const ear = new THREE.SphereGeometry(0.06, 10, 8); ear.scale(1.2, 0.55, 0.9); ear.rotateZ(0.6); ear.translate(0.035, top - 0.005, 0);
  const all = mergeGeometries([clean(g), clean(tie, 0xb8b0a0), clean(ear)]); boxUV(all, 0.35);
  const col = all.attributes.color; const keep = col.array.slice();
  all.userData.keep = keep; _sack.set(variant, all); return all.clone();
}
/** Sack lying on its side (for piles): rotate the standing sack 90 degrees. */
export function sackPlaced(variant, pos, yaw = 0, lying = false, tone = 0xffffff, scale = 1) {
  const g = sackGeom(variant); if (lying) { g.rotateX(-Math.PI / 2); g.scale(1, 0.85, 1); g.computeBoundingBox(); g.translate(0, -g.boundingBox.min.y - 0.015, -(g.boundingBox.min.z + g.boundingBox.max.z) / 2); }
  g.scale(scale, scale, scale);
  const c = new THREE.Color(tone), a = g.attributes.color.array; for (let i = 0; i < a.length; i += 3) { a[i] *= c.r; a[i + 1] *= c.g; a[i + 2] *= c.b; }
  return place(g, pos, [0, yaw, 0]);
}

/** Millstone (dressed face up): disc radius R, thickness T, eye hole, raised lands with furrows between (harp pattern). */
export function millstone(R = 0.7, T = 0.24, seed = 3) {
  const out = [], r = rng(seed);
  const base = new THREE.CylinderGeometry(R, R * 0.99, T - 0.03, 48, 1); base.translate(0, (T - 0.03) / 2, 0); boxUV(base, 0.7); out.push(clean(base));
  const harps = 10;
  for (let k = 0; k < harps; k++) {
    const a0 = (k / harps) * Math.PI * 2;
    for (let j = 0; j < 4; j++) {       // lands parallel to the master furrow of this harp
      const off = 0.06 + j * 0.085, L = R * (0.85 - j * 0.12), w = 0.045;
      const g = roundedBox(L, 0.045, w, 0.01, 1); boxUV(g, 0.5, [r() * 5, r() * 5]);
      g.translate(L / 2 + 0.16, T - 0.03, -off + 0.02);
      g.rotateY(-a0 - 0.32); out.push(clean(g));
    }
  }
  const rim = new THREE.TorusGeometry(R - 0.03, 0.03, 8, 48); rim.rotateX(Math.PI / 2); rim.translate(0, T - 0.03, 0); out.push(clean(rim));
  const eye = new THREE.CylinderGeometry(0.13, 0.13, 0.05, 24); eye.translate(0, T - 0.035, 0); out.push(clean(eye, 0x303030));
  return out;
}

/** Gear wheel (wooden pit wheel): radius r, thickness d, teeth along +Z axis facing. Returns geometry centred at origin, axis Z. */
export function woodGear(r = 0.5, teeth = 20, d = 0.12) {
  const s = new THREE.Shape(), N = teeth * 4;
  for (let i = 0; i <= N; i++) { const a = (i / N) * Math.PI * 2, ph = i % 4, rr = ph === 1 || ph === 2 ? r + 0.07 : r; i === 0 ? s.moveTo(rr * Math.cos(a), rr * Math.sin(a)) : s.lineTo(rr * Math.cos(a), rr * Math.sin(a)); }
  for (let k = 0; k < 4; k++) { const a0 = (k / 4) * Math.PI * 2 + 0.22, a1 = ((k + 1) / 4) * Math.PI * 2 - 0.22, h = new THREE.Path();
    h.absarc(0, 0, r * 0.8, a0, a1, false); h.absarc(0, 0, r * 0.25, a1, a0, true); h.closePath(); s.holes.push(h); }
  const g = new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: true, bevelThickness: 0.01, bevelSize: 0.01, bevelSegments: 1, curveSegments: 8 });
  g.translate(0, 0, -d / 2); boxUV(g, 0.6); return clean(g);
}
