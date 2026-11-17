// World kit: geometry helpers. Everything is bevelled/rounded (no razor boxes) and gets world-scaled UVs so PBR textures
// keep a real size (metres per tile) on every piece. 1 unit = 1 m, Y up.
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { rng } from "../shared/assets.js";

export { mergeGeometries };

/** Rounded box (bevel radius r, clamped so it always fits). */
export function roundedBox(w, h, d, r = 0.012, seg = 2) {
  const rr = Math.min(r, w / 2 - 1e-4, h / 2 - 1e-4, d / 2 - 1e-4);
  return new RoundedBoxGeometry(w, h, d, seg, Math.max(rr, 0.0005));
}

/** Box-projected UVs from object-space positions: each vertex uses the two axes orthogonal to its dominant normal.
 *  tile = metres per texture repeat; off = [u,v] offset; swap = rotate the grain 90 degrees. Call BEFORE transforming. */
export function boxUV(geom, tile = 1, off = [0, 0], swap = false) {
  const p = geom.attributes.position, n = geom.attributes.normal, uv = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i), ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i)), az = Math.abs(n.getZ(i));
    let u, v;
    if (ay >= ax && ay >= az) { u = x; v = z; } else if (ax >= az) { u = z; v = y; } else { u = x; v = y; }
    if (swap) [u, v] = [v, u];
    uv[2 * i] = u / tile + off[0]; uv[2 * i + 1] = v / tile + off[1];
  }
  geom.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  return geom;
}

/** Lengthwise UVs for a long piece (grain along the longest local axis). */
export function grainUV(geom, tile = 1, off = [0, 0]) {
  geom.computeBoundingBox(); const s = geom.boundingBox.getSize(new THREE.Vector3());
  const long = s.x >= s.y && s.x >= s.z ? "x" : s.y >= s.z ? "y" : "z";
  const p = geom.attributes.position, n = geom.attributes.normal, uv = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) {
    const c = { x: p.getX(i), y: p.getY(i), z: p.getZ(i) }, nn = { x: Math.abs(n.getX(i)), y: Math.abs(n.getY(i)), z: Math.abs(n.getZ(i)) };
    const others = ["x", "y", "z"].filter((a) => a !== long);
    const across = nn[others[0]] > nn[others[1]] ? others[1] : others[0];
    uv[2 * i] = c[across] / tile + off[0]; uv[2 * i + 1] = c[long] / tile + off[1];
  }
  geom.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  return geom;
}

/** Constant vertex colour (per-piece tone variation; material must use vertexColors). */
export function tint(geom, c) {
  const col = c instanceof THREE.Color ? c : new THREE.Color(c), n = geom.attributes.position.count, a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { a[3 * i] = col.r; a[3 * i + 1] = col.g; a[3 * i + 2] = col.b; }
  geom.setAttribute("color", new THREE.BufferAttribute(a, 3));
  return geom;
}

/** Strip attributes so geometries from different generators merge (position, normal, uv, color). */
export function clean(geom, color = 0xffffff) {
  const g = geom.index ? geom.toNonIndexed() : geom;
  for (const k of Object.keys(g.attributes)) if (!["position", "normal", "uv", "color"].includes(k)) g.deleteAttribute(k);
  if (!g.attributes.uv) boxUV(g);
  if (!g.attributes.color) tint(g, color);
  return g;
}

/** Merge many pieces into one mesh (one draw call). pieces: geometries already transformed. */
export function mergedMesh(pieces, material, { cast = true, receive = true, name = "" } = {}) {
  const m = new THREE.Mesh(mergeGeometries(pieces.map((g) => clean(g)), false), material);
  m.castShadow = cast; m.receiveShadow = receive; m.name = name; return m;
}

/** Plank field: individual bevelled boards with gaps, staggered joints, random grain offset and tone per board.
 *  inside(x, z) -> half-length of the board row at x (0 = none). Boards run along Z (local), rows step along X. */
export function plankField({ halfX = 3, rowHalf = (x) => 3, plankW = 0.2, gap = 0.008, thick = 0.05, minLen = 1.1, maxLen = 2.6,
  bevel = 0.007, tile = 1.2, seed = 7, tone = [0.8, 1.12], warmJitter = 0.06 } = {}) {
  const r = rng(seed), out = [];
  for (let x = -halfX + plankW / 2; x < halfX; x += plankW) {
    const half = rowHalf(x); if (half < 0.05) continue;
    let z = -half - r() * maxLen * 0.6;
    while (z < half) {
      const len = minLen + r() * (maxLen - minLen), z0 = Math.max(z, -half), z1 = Math.min(z + len, half);
      if (z1 - z0 > 0.12) {
        const g = roundedBox(plankW - gap, thick, z1 - z0 - gap, bevel, 2);
        grainUV(g, tile, [r() * 10, r() * 10]);
        const k = tone[0] + r() * (tone[1] - tone[0]), w = (r() - 0.5) * warmJitter;
        tint(g, new THREE.Color(k * (1 + w), k, k * (1 - w)));
        g.translate(x, -thick / 2, (z0 + z1) / 2); out.push(g);
      }
      z += len;
    }
  }
  return out;
}

/** Bevelled cylinder via a lathe profile (rounded top and bottom edges). */
export function roundedCylinder(r, h, bevel = 0.02, radial = 40) {
  const pts = [], b = Math.min(bevel, r / 2, h / 2), n = 4;
  pts.push(new THREE.Vector2(0, -h / 2));
  for (let i = 0; i <= n; i++) { const a = -Math.PI / 2 + (i / n) * Math.PI / 2; pts.push(new THREE.Vector2(r - b + b * Math.cos(a), -h / 2 + b + b * Math.sin(a))); }
  for (let i = 0; i <= n; i++) { const a = (i / n) * Math.PI / 2; pts.push(new THREE.Vector2(r - b + b * Math.cos(a), h / 2 - b + b * Math.sin(a))); }
  pts.push(new THREE.Vector2(0, h / 2));
  return new THREE.LatheGeometry(pts, radial);
}

/** Lathe from a list of [radius, y] points (any turned object: pedestals, posts, finials). */
export function lathe(points, radial = 40) { return new THREE.LatheGeometry(points.map(([r, y]) => new THREE.Vector2(r, y)), radial); }

/** Bevelled extruded shape (gears, plaques, signs). shape: THREE.Shape in XY, extruded along +Z by depth. */
export function extrude(shape, depth = 0.04, bevel = 0.006, curveSegments = 16) {
  const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 2, curveSegments });
  g.translate(0, 0, -depth / 2); return g;
}

/** Gear outline with trapezoid teeth and a hub hole. */
export function gearShape(r, teeth = 14, toothH = 0.035, hole = 0.03, spokes = 4, skipTooth = -1) {
  const s = new THREE.Shape(), N = teeth * 4;
  for (let i = 0; i <= N; i++) {
    const a = (i / N) * Math.PI * 2, ph = i % 4, rr = (ph === 1 || ph === 2) && Math.floor(i / 4) !== skipTooth ? r + toothH : r;
    const p = [rr * Math.cos(a), rr * Math.sin(a)]; i === 0 ? s.moveTo(...p) : s.lineTo(...p);
  }
  const h = new THREE.Path(); h.absarc(0, 0, hole, 0, Math.PI * 2, true); s.holes.push(h);
  if (spokes) for (let k = 0; k < spokes; k++) {     // windows between spokes
    const a0 = (k / spokes) * Math.PI * 2 + 0.25, a1 = ((k + 1) / spokes) * Math.PI * 2 - 0.25, ri = r * 0.38, ro = r * 0.76;
    const w = new THREE.Path(); w.absarc(0, 0, ro, a0, a1, false); w.absarc(0, 0, ri, a1, a0, true); w.closePath(); s.holes.push(w);
  }
  return s;
}

/** One loose gear tooth matching gearShape(r, teeth, toothH) tooth k (same outline, a sliver deeper so no seam shows). */
export function toothShape(r, teeth, toothH, k = 0) {
  const N = teeth * 4, a = (i) => (i / N) * Math.PI * 2, s = new THREE.Shape(), ri = r - 0.006;
  s.moveTo(ri * Math.cos(a(4 * k)), ri * Math.sin(a(4 * k)));
  s.lineTo(r * Math.cos(a(4 * k)), r * Math.sin(a(4 * k)));
  s.lineTo((r + toothH) * Math.cos(a(4 * k + 1)), (r + toothH) * Math.sin(a(4 * k + 1)));
  s.lineTo((r + toothH) * Math.cos(a(4 * k + 2)), (r + toothH) * Math.sin(a(4 * k + 2)));
  s.lineTo(r * Math.cos(a(4 * k + 3)), r * Math.sin(a(4 * k + 3)));
  s.lineTo(ri * Math.cos(a(4 * k + 3)), ri * Math.sin(a(4 * k + 3))); s.closePath(); return s;
}

/** Tube along points (pipes, rails, ribs). */
export function tube(points, r = 0.02, seg = 48, radial = 10, closed = false) {
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points, closed, "centripetal"), seg, r, radial, closed);
}

/** Place a geometry: rotation (Euler XYZ) then translation. Returns the geometry. */
export function place(g, [x, y, z] = [0, 0, 0], [rx, ry, rz] = [0, 0, 0]) {
  g.applyMatrix4(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(rx, ry, rz))); g.translate(x, y, z); return g;
}
