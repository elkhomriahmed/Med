// Rock island: polar heightfield (flat-ish top at y = -30 with bumps, cliffs with a ledge, vertical cracks, down below the
// sea), a cove on +Z for the stairs to the jetty, boulders round the foot and a reef where the ship nearly hits.
import * as THREE from "three";
import { fbm3, vnoise3, smooth, lerp } from "./util.js";
import { SEA_Y } from "./sea.js";

export const ROCK_TOP = -30;

/** Lip radius of the island top (where the cliff starts) for angle th = atan2(z, x). */
export function lipRadius(th) {
  let R = 18 + 1.3 * Math.sin(3 * th + 1) + 0.8 * Math.sin(5 * th + 2) + 0.45 * Math.sin(9 * th + 0.5);
  const dz = Math.atan2(Math.sin(th - Math.PI / 2), Math.cos(th - Math.PI / 2));      // cove toward +Z (jetty side)
  R = lerp(R, 14.6, smooth(0.42, 0.12, Math.abs(dz)));
  return R - 2.2;
}

// cliff profile: [radial offset from the lip, drop] -> ledge around -2.6, bottom under the sea
const PROF = [[0, 0], [0.25, -0.15], [0.55, -0.55], [0.8, -1.3], [0.95, -2.1], [1.35, -2.45], [1.75, -2.65], [1.95, -3.1], [2.15, -3.9],
  [2.35, -4.6], [2.8, -5.6], [3.6, -6.6], [4.6, -7.4]];

export function topY(x, z, r, R) {
  const path = z > 0 ? smooth(1.0, 2.4, Math.abs(x)) : 1;                       // flat corridor door -> stairs
  const b = (fbm3(x * 0.16, z * 0.16, 3.3) - 0.5) * 0.9 * smooth(5.4, 8.5, r) * path;
  return ROCK_TOP + b - 0.55 * smooth(R - 4.5, R, r);
}

/** Returns { top, cliff (geometries with uv/normal), seaR(th) radius where the cliff meets the sea }. */
export function rockGeometry({ nTh = 360, nTop = 18 } = {}) {
  const nC = PROF.length * 2 - 1, rows = nTop + nC;                                 // radial rows (top rows, then cliff rows)
  const P = new Float32Array(nTh * rows * 3), seaR = new Float32Array(nTh);
  const prof = (u) => { const f = u * (PROF.length - 1), i = Math.min(PROF.length - 2, Math.floor(f)), t = f - i;
    return [lerp(PROF[i][0], PROF[i + 1][0], t), lerp(PROF[i][1], PROF[i + 1][1], t)]; };
  for (let i = 0; i < nTh; i++) {
    const th = (i / nTh) * Math.PI * 2, c = Math.cos(th), s = Math.sin(th), R = lipRadius(th);
    const yl = topY(R * c, R * s, R, R);
    const ledgeK = 0.8 + 0.45 * vnoise3(c * 3, s * 3, 1.7);
    let prevY = 0, prevR = 0; seaR[i] = R + 2;
    for (let k = 0; k < rows; k++) {
      let r, y;
      if (k < nTop) { r = R * (k / nTop) ** 0.8; y = topY(r * c, r * s, r, R); }
      else {
        const u = (k - nTop + 1) / nC, [dr, dy] = prof(u), wx = R * c, wz = R * s;
        y = yl + dy * ledgeK * (dy < -6 ? 1 : 1);
        // irregular face + vertical cracks (ridged noise along the cliff), more on the steep parts
        const n = fbm3(wx * 0.22, y * 0.25, wz * 0.22, 3) - 0.5;
        const crack = Math.pow(1 - Math.abs(vnoise3(th * 38, y * 0.07, 2.1) * 2 - 1), 8) * 0.55;
        r = R + dr + n * 1.4 * Math.min(1, u * 4) - crack;
        if (y < SEA_Y && prevY >= SEA_Y) seaR[i] = lerp(prevR, r, (prevY - SEA_Y) / (prevY - y));
      }
      prevY = y; prevR = r;
      const o = 3 * (i * rows + k); P[o] = r * c; P[o + 1] = y; P[o + 2] = r * s;
    }
  }
  // full indexed grid (wrapped in theta) -> smooth normals across top and cliff
  const full = new THREE.BufferGeometry(); full.setAttribute("position", new THREE.BufferAttribute(P, 3));
  const idx = [];
  for (let i = 0; i < nTh; i++) { const i1 = (i + 1) % nTh;
    for (let k = 0; k < rows - 1; k++) { const a = i * rows + k, b = i1 * rows + k, c2 = i1 * rows + k + 1, d = i * rows + k + 1;
      idx.push(a, b, d, b, c2, d); } }
  full.setIndex(idx); full.computeVertexNormals(); const N = full.attributes.normal.array;
  // split into top (planar UV) and cliff (cylindrical UV, seam column duplicated)
  const part = (k0, k1, uvFn) => {
    const cols = nTh + 1, nr = k1 - k0 + 1, pos = new Float32Array(cols * nr * 3), nrm = new Float32Array(cols * nr * 3), uv = new Float32Array(cols * nr * 2), ind = [];
    const col = new Float32Array(cols * nr * 3);
    for (let ci = 0; ci < cols; ci++) for (let k = k0; k <= k1; k++) {
      const i = ci % nTh, src = 3 * (i * rows + k), dst = ci * nr + (k - k0);
      for (let q = 0; q < 3; q++) { pos[3 * dst + q] = P[src + q]; nrm[3 * dst + q] = N[src + q]; }
      const [u, v] = uvFn(P[src], P[src + 1], P[src + 2], ci / nTh); uv[2 * dst] = u; uv[2 * dst + 1] = v;
      // tone: wet dark band near the sea + algae tint, lighter weathered top, random patches
      const y = P[src + 1], wet = smooth(SEA_Y + 1.6, SEA_Y + 0.2, y), patch = 0.85 + 0.3 * vnoise3(P[src] * 0.3, y * 0.3, P[src + 2] * 0.3);
      col[3 * dst] = patch * lerp(1.0, 0.42, wet); col[3 * dst + 1] = patch * lerp(1.0, 0.5, wet); col[3 * dst + 2] = patch * lerp(1.0, 0.42, wet);
    }
    for (let ci = 0; ci < cols - 1; ci++) for (let k = 0; k < nr - 1; k++) {
      const a = ci * nr + k, b = (ci + 1) * nr + k, c2 = (ci + 1) * nr + k + 1, d = ci * nr + k + 1; ind.push(a, b, d, b, c2, d); }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3)); g.setAttribute("normal", new THREE.BufferAttribute(nrm, 3));
    g.setAttribute("uv", new THREE.BufferAttribute(uv, 2)); g.setAttribute("color", new THREE.BufferAttribute(col, 3)); g.setIndex(ind);
    return g;
  };
  const top = part(0, nTop, (x, y, z) => [x / 3.5, z / 3.5]);
  const cliff = part(nTop - 1, rows - 1, (x, y, z, f) => [f * 2 * Math.PI * 18 / 3.5, y / 3.5]);
  const thStep = (Math.PI * 2) / nTh;
  const seaRAt = (th) => { let f = ((th % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI) / thStep, i = Math.floor(f) % nTh, t = f - Math.floor(f);
    return lerp(seaR[i], seaR[(i + 1) % nTh], t); };
  return { top, cliff, seaRAt };
}

/** Lumpy boulder (displaced icosphere) with box UVs + tone. */
export function boulder(seed, [sx, sy, sz], [x, y, z], ry = 0) {
  const g = new THREE.IcosahedronGeometry(1, 3), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const v = new THREE.Vector3(p.getX(i), p.getY(i), p.getZ(i)).normalize();
    const k = 1 + (fbm3(v.x * 1.6 + seed, v.y * 1.6, v.z * 1.6 - seed, 3) - 0.5) * 0.7 + Math.max(0, v.y - 0.6) * -0.25;
    p.setXYZ(i, v.x * k * sx, v.y * k * sy, v.z * k * sz);
  }
  g.computeVertexNormals();
  g.rotateY(ry); g.translate(x, y, z);
  // box UV in world metres
  const n = g.attributes.normal, uv = new Float32Array(p.count * 2), col = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) {
    const X = p.getX(i), Y = p.getY(i), Z = p.getZ(i), ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i)), az = Math.abs(n.getZ(i));
    const [u, v] = ay >= ax && ay >= az ? [X, Z] : ax >= az ? [Z, Y] : [X, Y]; uv[2 * i] = u / 3.5; uv[2 * i + 1] = v / 3.5;
    const wet = smooth(SEA_Y + 1.2, SEA_Y + 0.1, Y), tn = 0.85 + 0.25 * vnoise3(X * 0.5, Y * 0.5, Z * 0.5);
    col[3 * i] = tn * lerp(1, 0.4, wet); col[3 * i + 1] = tn * lerp(1, 0.48, wet); col[3 * i + 2] = tn * lerp(1, 0.4, wet);
  }
  g.setAttribute("uv", new THREE.BufferAttribute(uv, 2)); g.setAttribute("color", new THREE.BufferAttribute(col, 3));
  return g;
}
