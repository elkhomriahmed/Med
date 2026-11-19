// Interiors kit helpers (apartment + office). Owner: interiors agent A. Read-only users: world/office.
// Pieces are collected per material in "buckets" and merged into ONE mesh per material (few draw calls, no pops).
import * as THREE from "three";
import { roundedBox, boxUV, grainUV, tint, mergedMesh, roundedCylinder, lathe, tube, place, clean, mergeGeometries } from "../geometry.js";
import { rng } from "../../shared/assets.js";

export { roundedBox, boxUV, grainUV, tint, mergedMesh, roundedCylinder, lathe, tube, place, clean, mergeGeometries, rng };

/** Buckets: b.add(key, geom) then b.build(materials) -> { key: Mesh } added to group. */
export function buckets() {
  const m = new Map();
  return {
    add(key, g) { if (!m.has(key)) m.set(key, []); m.get(key).push(g); return g; },
    build(group, mats, opts = {}) {
      const out = {};
      for (const [k, list] of m) {
        if (!mats[k]) throw new Error(`buckets: no material "${k}"`);
        const o = opts[k] || {};
        const mesh = mergedMesh(list, mats[k], { cast: o.cast ?? true, receive: true, name: k });
        group.add(mesh); out[k] = mesh;
      }
      return out;
    },
  };
}

/** Bevelled box centred at [x,y,z] with world-scale UVs and a tone (vertex colour). rot = Euler [rx,ry,rz]. */
export function box(w, h, d, pos, { r = 0.008, tile = 1, tone = 0xffffff, rot = [0, 0, 0], grain = false, off = null, seg = 2 } = {}) {
  const g = roundedBox(w, h, d, r, seg);
  const o = off || [pos[0] * 0.37 % 1, pos[1] * 0.53 % 1];
  grain ? grainUV(g, tile, o) : boxUV(g, tile, o);
  tint(g, tone); return place(g, pos, rot);
}

/** Box from min/max corners (handy for walls). */
export function boxMM(x0, y0, z0, x1, y1, z1, opt = {}) {
  return box(x1 - x0, y1 - y0, z1 - z0, [(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2], { r: 0.004, ...opt });
}

/** Panel door / cabinet door: frame (stiles + rails) + recessed panel, facing +Z, centred at origin (front at z = +d/2).
 *  Returns geometries (caller places them via place()). */
export function panelDoor(w, h, d = 0.03, { frame = 0.06, inset = 0.008, tone = 0xffffff, panels = 1, tile = 0.8 } = {}) {
  const out = [], fr = Math.min(frame, w / 4, h / 4);
  out.push(box(w, h, d * 0.55, [0, 0, -d * 0.2], { r: 0.003, tone, tile }));                       // back slab
  out.push(box(fr, h, d, [-w / 2 + fr / 2, 0, 0], { r: 0.006, tone, tile, grain: true }));         // stiles
  out.push(box(fr, h, d, [w / 2 - fr / 2, 0, 0], { r: 0.006, tone, tile, grain: true }));
  const ph = (h - fr * (panels + 1)) / panels;
  for (let i = 0; i <= panels; i++) {
    const y = -h / 2 + fr / 2 + i * (ph + fr);
    out.push(box(w - fr * 2 + 0.002, fr, d, [0, y, 0], { r: 0.006, tone, tile, grain: true }));   // rails
    if (i < panels) {                                                                                // raised field
      const cy = y + fr / 2 + ph / 2, pw = w - fr * 2 - 0.03, phh = ph - 0.03;
      out.push(box(pw, phh, d * 0.5, [0, cy, -inset], { r: 0.012, tone: new THREE.Color(tone).multiplyScalar(0.97), tile }));
    }
  }
  return out;
}

/** Simple bar handle (two posts + bar) along X, centred at origin, sticking out +Z. */
export function barHandle(len = 0.12, r = 0.006) {
  const g = [];
  const bar = new THREE.CylinderGeometry(r, r, len, 10); bar.rotateZ(Math.PI / 2); bar.translate(0, 0, 0.028); g.push(clean(bar));
  for (const s of [-1, 1]) { const p = new THREE.CylinderGeometry(r * 0.8, r * 0.9, 0.028, 8); p.rotateX(Math.PI / 2); p.translate(s * len * 0.42, 0, 0.014); g.push(clean(p)); }
  return mergeGeometries(g);
}

/** Lay instanced bevelled tiles over a rectangle on a plane. axis: "z" (wall facing +Z at z), "x" (wall facing +X), "y" (floor).
 *  colorFn(i, j, r) -> THREE.Color. Returns InstancedMesh. */
export function tileField({ u0, u1, v0, v1, size = 0.15, sizeV = null, gap = 0.004, depth = 0.012, bevel = 0.004, plane = "z", at = 0, sign = 1,
  material, colorFn, seed = 3, jitter = 0.0015 }) {
  const sv = sizeV || size, nu = Math.max(1, Math.round((u1 - u0) / size)), nv = Math.max(1, Math.round((v1 - v0) / sv));
  const tu = (u1 - u0) / nu, tv = (v1 - v0) / nv, r = rng(seed);
  const g = roundedBox(tu - gap, tv - gap, depth, bevel, 2); boxUV(g, 0.6);
  const mesh = new THREE.InstancedMesh(g, material, nu * nv); mesh.castShadow = false; mesh.receiveShadow = true;
  const M = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), s = new THREE.Vector3(1, 1, 1), p = new THREE.Vector3();
  let k = 0;
  for (let i = 0; i < nu; i++) for (let j = 0; j < nv; j++) {
    const u = u0 + (i + 0.5) * tu, v = v0 + (j + 0.5) * tv, h = depth / 2 + (r() - 0.5) * jitter;
    if (plane === "z") { p.set(u, v, at + sign * h); e.set((r() - 0.5) * 0.01, (r() - 0.5) * 0.01, 0); }
    else if (plane === "x") { p.set(at + sign * h, v, u); e.set(0, Math.PI / 2, 0); }
    else { p.set(u, at + h, v); e.set(-Math.PI / 2, 0, (r() - 0.5) * 0.004); }
    q.setFromEuler(e); M.compose(p, q, s); mesh.setMatrixAt(k, M); mesh.setColorAt(k, colorFn(i, j, r)); k++;
  }
  mesh.instanceMatrix.needsUpdate = true; if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  return mesh;
}

/** Wavy cloth panel (curtain): width w, height h, folds along X, hangs down from y = 0, gathered by `gather` (0..1) toward
 *  x = 0 side near tieY. Facing +Z. */
export function curtainGeom(w, h, { folds = 7, amp = 0.05, tieY = -0.62, gather = 0.55, segX = 64, segY = 40 } = {}) {
  const g = new THREE.PlaneGeometry(w, h, segX, segY); g.translate(w / 2, -h / 2, 0);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), yy = y / h;                   // yy: 0 top .. -1 bottom
    const pinch = Math.exp(-Math.pow((yy - tieY) / 0.18, 2));       // squeeze at the tie-back
    const k = 1 - gather * (0.35 + 0.65 * pinch);
    const nx = x * k, a = amp * (1 + 0.6 * pinch);
    p.setXYZ(i, nx, y, Math.sin((x / w) * folds * Math.PI * 2) * a + a);
  }
  g.computeVertexNormals(); boxUV(g, 0.5); return g;
}

/** Canvas texture helper (sRGB). */
export function canvas(w, h, draw, { srgb = true, anisotropy = 8 } = {}) {
  const c = document.createElement("canvas"); c.width = w; c.height = h; const ctx = c.getContext("2d"); draw(ctx, w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace; t.anisotropy = anisotropy;
  t.userData.canvas = c; return t;
}

/** Lemon geometry (slightly pointed ellipsoid), long axis X, ~0.085 m long. */
export function lemonGeom(scale = 1) {
  const g = new THREE.SphereGeometry(0.034, 20, 14); const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i), ax = Math.abs(x) / 0.034;
    const tip = Math.pow(ax, 6) * 0.012 * Math.sign(x);
    p.setXYZ(i, x * 1.22 + tip, y * 0.92, z * 0.92);
  }
  g.computeVertexNormals(); g.scale(scale, scale, scale); return clean(g);
}

export const lerp = (a, b, t) => a + (b - a) * t;
export const clamp01 = (x) => Math.min(1, Math.max(0, x));
export const smooth = (x) => { x = clamp01(x); return x * x * (3 - 2 * x); };
