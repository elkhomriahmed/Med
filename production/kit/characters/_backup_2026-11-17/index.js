// Characters (style v12 LOCKED, built fully in code). See ../CONTRACT.md for the API and ../../STYLE_BIBLE.md for the rules.
//  - head: white sphere R 0.29 with the flat 2D face drawing projected from the CAMERA (C1b/C1c), hand-drawn marker outline ring
//    rebuilt toward the camera every frame (C4e/C4c) + 0.6 cm hull
//  - torso: slim capsule (half w 0.21, d 0.15, h 0.31, |t|^3.2, taper 0.06), fabric canvas textures + bump, placket, buttons, pockets
//  - hats / hair: real 3D (beanie with cuff + pompom, bowl-cut hair), 1.2 cm hulls
//  - limbs: ink tubes r 1.5 cm, 2-bone IK arms ending in a 4 cm finger hook, L feet; arms never pass through / behind the torso
//  - ONE PIECE (2026-11-16): update() is a pure function of (state, camera, light): no smoothing, no springs, no time history.
import * as THREE from "three";
import { mergeVertices } from "three/addons/utils/BufferGeometryUtils.js";
import { INK, SKIN, url, rng } from "../shared/assets.js";
import { FACE_FILES } from "./faceIndex.js";
import { fabricTextures } from "./cloth.js";

// ---------------------------------------------------------------- locked proportions (metres)
export const R = 0.29;
const TW = 0.21, TD = 0.15, TH = 0.31, TP = 0.06, PCAP = 3.2;
const HIP = 0.64, TZ = HIP + TH, TOP = TZ + TH, HEAD_Y = TOP + 0.76 * R, HEAD_FWD = 0.10;
const ARM1 = 0.27, ARM2 = 0.27, LIMB_R = 0.015, HOOK = 0.04;
const SHOULDER = (s) => new THREE.Vector3(s * 0.185, TOP - 0.14, 0.02);

const capR = (t) => Math.pow(Math.max(0, 1 - Math.pow(Math.abs(t), PCAP)), 1 / PCAP);
const gT = (t) => capR(t) * (1 - TP * t);
/** torso cross-section (ellipse half axes) at body-local height y, or null outside the torso */
function torsoAt(y) { const t = (y - TZ) / TH; if (Math.abs(t) >= 1) return null; const g = gT(t); return [TW * g, TD * g]; }
function frontZ(x, y, out = 0) { const s = torsoAt(y); if (!s) return 0; const u = Math.min(0.999, Math.abs(x) / s[0]); return s[1] * Math.sqrt(1 - u * u) + out; }

const toColor = (v, fb = "#888888") => v instanceof THREE.Color ? v.clone() : Array.isArray(v) ? new THREE.Color().setRGB(v[0], v[1], v[2]) : new THREE.Color(v ?? fb);
const INK_LIN = INK.clone();

// ---------------------------------------------------------------- materials
function hullMat(t) {
  return new THREE.ShaderMaterial({
    side: THREE.BackSide, uniforms: { t: { value: t }, c: { value: INK_LIN } },
    vertexShader: `uniform float t; void main(){ vec3 p = position + normal*t; gl_Position = projectionMatrix*modelViewMatrix*vec4(p,1.0); }`,
    fragmentShader: `uniform vec3 c; void main(){ gl_FragColor = vec4(c,1.0);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }` });
}
/** inverted-hull outline (camera-only look; does not cast shadows). Hull geometry gets welded smooth normals. */
function addHull(mesh, t) {
  let g = mesh.geometry.clone(); g.deleteAttribute("normal"); if (g.attributes.uv) g.deleteAttribute("uv");
  g = mergeVertices(g, 1e-4); g.computeVertexNormals();
  const o = new THREE.Mesh(g, hullMat(t)); o.castShadow = false; o.receiveShadow = false; mesh.add(o); return o;
}

function faceMat() {
  return new THREE.ShaderMaterial({
    uniforms: {
      hc: { value: new THREE.Vector3() }, X: { value: new THREE.Vector3(1, 0, 0) }, Y: { value: new THREE.Vector3(0, 1, 0) }, Z: { value: new THREE.Vector3(0, 0, 1) },
      R: { value: R }, drop: { value: 0 }, ls: { value: 1 }, face: { value: null }, hasFace: { value: 0 }, k: { value: 0.95 }, GW: { value: 0.45 }, SHK: { value: 0.6 },
      lit: { value: 0 }, skin: { value: new THREE.Vector3(...SKIN) }, ink: { value: new THREE.Vector3(0.11, 0.075, 0.06) } },
    vertexShader: `varying vec3 wp; void main(){ vec4 w = modelMatrix*vec4(position,1.0); wp = w.xyz; gl_Position = projectionMatrix*viewMatrix*w; }`,
    fragmentShader: `uniform vec3 hc,X,Y,Z,skin,ink; uniform float R,drop,ls,k,GW,lit,hasFace,SHK; uniform sampler2D face; varying vec3 wp;
      void main(){ vec3 d = wp-hc; float x = dot(d,X), y = dot(d,Y), z = dot(d,Z); float FS = 2.15*R;
        vec2 uv = vec2(x/FS+0.5, y/FS+0.5+drop/FS);
        vec4 f = (hasFace<0.5||uv.x<0.||uv.x>1.||uv.y<0.||uv.y>1.) ? vec4(0.) : texture2D(face, uv);
        f.a *= smoothstep(0.05*R, 0.25*R, z);
        float lum = dot(f.rgb, vec3(0.3,0.59,0.11));
        f.rgb = mix(f.rgb, ink, smoothstep(0.55, 0.20, lum));                               // navy ink -> warm dark ink
        f.rgb = mix(f.rgb, ink*0.45, smoothstep(0.04, 0.12, f.r-max(f.g,f.b)));             // red mouth inside -> black
        float sh = smoothstep(-0.25, 1.0, -ls*x/R); vec3 c = mix(skin, vec3(0.48,0.48,0.60), sh*abs(ls)*SHK);   // cool far-side fade
        float gl = smoothstep(-0.50, 1.0, ls*x/R)*0.85*GW*abs(ls); c = mix(c, vec3(1.0,0.68,0.30), gl);   // warm lamp side
        c = mix(c, f.rgb, f.a);
        c = mix(c, c*vec3(1.0,0.86,0.62), 0.45*lit);
        gl_FragColor = vec4(pow(c, vec3(2.2))*k*(0.78 + 0.32*lit), 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }` });
}

// ---------------------------------------------------------------- dynamic ink tube (in-place buffers, no per-frame allocation)
class InkTube {
  constructor(maxPts, r, mat, radial = 8) {
    this.max = maxPts; this.rad = radial; this.r = r;
    const nv = maxPts * radial; this.pos = new Float32Array(nv * 3); this.nor = new Float32Array(nv * 3);
    const idx = [];
    for (let i = 0; i < maxPts - 1; i++) for (let k = 0; k < radial; k++) {
      const a = i * radial + k, b = i * radial + (k + 1) % radial, c = a + radial, d = b + radial; idx.push(a, b, c, b, d, c); }
    const g = new THREE.BufferGeometry(); g.setIndex(idx);
    g.setAttribute("position", new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute("normal", new THREE.BufferAttribute(this.nor, 3).setUsage(THREE.DynamicDrawUsage));
    this.mesh = new THREE.Mesh(g, mat); this.mesh.frustumCulled = false; this.mesh.castShadow = true;
    this._t = new THREE.Vector3(); this._n = new THREE.Vector3(); this._b = new THREE.Vector3(); this._tmp = new THREE.Vector3();
  }
  set(pts) {
    const n = Math.min(pts.length, this.max), T = this._t, N = this._n, B = this._b, tmp = this._tmp;
    for (let i = 0; i < n; i++) {
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)]; T.subVectors(b, a).normalize();
      if (i === 0) { tmp.set(0, 0, 1); if (Math.abs(T.z) > 0.9) tmp.set(1, 0, 0); N.crossVectors(T, tmp).normalize(); }
      else { N.addScaledVector(T, -N.dot(T)).normalize(); }
      B.crossVectors(T, N);
      for (let k = 0; k < this.rad; k++) {
        const ang = (k / this.rad) * Math.PI * 2, c = Math.cos(ang), s = Math.sin(ang), o = (i * this.rad + k) * 3;
        const nx = N.x * c + B.x * s, ny = N.y * c + B.y * s, nz = N.z * c + B.z * s;
        this.nor[o] = nx; this.nor[o + 1] = ny; this.nor[o + 2] = nz;
        this.pos[o] = pts[i].x + nx * this.r; this.pos[o + 1] = pts[i].y + ny * this.r; this.pos[o + 2] = pts[i].z + nz * this.r;
      }
    }
    const g = this.mesh.geometry; g.attributes.position.needsUpdate = true; g.attributes.normal.needsUpdate = true;
    g.setDrawRange(0, (n - 1) * this.rad * 6);
  }
}

// ---------------------------------------------------------------- geometry builders
/** slim capsule torso with UVs in metres-proportional layout: u around (0.25 = front centre), v by front arc length */
function torsoGeometry(nu = 96, nv = 64) {
  // v by arc length along the front meridian so fabric is not stretched on the rounded ends
  const ts = []; for (let j = 0; j <= nv; j++) ts.push(-Math.cos(Math.PI * j / nv));
  const arc = [0]; for (let j = 1; j <= nv; j++) { const a = ts[j - 1], b = ts[j]; arc.push(arc[j - 1] + Math.hypot((b - a) * TH, TD * (gT(b) - gT(a)))); }
  const Lv = arc[nv];
  const pos = [], uv = [], idx = [];
  for (let j = 0; j <= nv; j++) for (let i = 0; i <= nu; i++) {
    const th = (i / nu) * Math.PI * 2, t = ts[j], g = gT(t);
    pos.push(TW * g * Math.cos(th), TZ + TH * t, TD * g * Math.sin(th)); uv.push(i / nu, arc[j] / Lv);
  }
  for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) {
    const a = j * (nu + 1) + i, b = a + 1, c = a + nu + 1, d = c + 1; idx.push(a, c, b, b, c, d); }
  const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2)); geo.setIndex(idx); geo.computeVertexNormals();
  // weld the seam normals (u = 0 / 1)
  const n = geo.attributes.normal;
  for (let j = 0; j <= nv; j++) { const a = j * (nu + 1), b = a + nu; const x = (n.getX(a) + n.getX(b)) / 2, y = (n.getY(a) + n.getY(b)) / 2, z = (n.getZ(a) + n.getZ(b)) / 2;
    const l = Math.hypot(x, y, z) || 1; n.setXYZ(a, x / l, y / l, z / l); n.setXYZ(b, x / l, y / l, z / l); }
  // perimeter (metres) at the widest row for texture sizing
  const per = Math.PI * (3 * (TW + TD) - Math.sqrt((3 * TW + TD) * (TW + 3 * TD)));
  return { geo, Lv, per, ts, arc };
}

/** ellipsoid cap (half axes a=x, c=y, b=z) keeping the part with y > y0 + slope*z; clean cut edge, UV u around, v from crown */
function capGeometry(a, c, b, y0, slope, nu = 72, nv = 28) {
  const P = (th, ph) => [a * Math.sin(th) * Math.cos(ph), c * Math.cos(th), b * Math.sin(th) * Math.sin(ph)];
  const pos = [], uv = [], idx = [];
  for (let i = 0; i <= nu; i++) {
    const ph = (i / nu) * Math.PI * 2; let lo = 0, hi = Math.PI;                  // find cut polar angle by bisection
    for (let k = 0; k < 40; k++) { const m = (lo + hi) / 2, p = P(m, ph); if (p[1] > y0 + slope * p[2]) lo = m; else hi = m; }
    for (let j = 0; j <= nv; j++) { const th = lo * (j / nv); pos.push(...P(th, ph)); uv.push(i / nu, j / nv); }
  }
  for (let i = 0; i < nu; i++) for (let j = 0; j < nv; j++) {
    const p0 = i * (nv + 1) + j, p1 = p0 + 1, q0 = p0 + nv + 1, q1 = q0 + 1; idx.push(p0, q0, p1, p1, q0, q1); }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
  // fix crown normals (degenerate row) with the analytic ellipsoid normal
  const n = g.attributes.normal, p = g.attributes.position;
  for (let v = 0; v < p.count; v++) { const x = p.getX(v) / (a * a), y = p.getY(v) / (c * c), z = p.getZ(v) / (b * b), l = Math.hypot(x, y, z); n.setXYZ(v, x / l, y / l, z / l); }
  return g;
}

/** a thin box laid onto the torso front surface (placket, pocket flap); x0,y0 = centre on the body, w,h size, d thickness */
function surfaceBox(x0, y0, w, h, d, lift = 0.002) {
  const g = new THREE.BoxGeometry(w, h, d, 6, 20, 1); const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i) + x0, y = p.getY(i) + y0; p.setXYZ(i, x, y, frontZ(x, y) + lift + d / 2 + p.getZ(i)); }
  g.computeVertexNormals(); return g;
}

// ---------------------------------------------------------------- 2-bone IK + body-collision helpers
const _v1 = new THREE.Vector3(), _v2 = new THREE.Vector3();
function ik(S, Hd, pole, E, H) {
  const dv = _v1.subVectors(Hd, S); let d = dv.length(); const dir = dv.clone().normalize();
  d = Math.min(Math.max(d, 0.05), (ARM1 + ARM2) * 0.999);
  const a = (ARM1 * ARM1 - ARM2 * ARM2 + d * d) / (2 * d), h = Math.sqrt(Math.max(0, ARM1 * ARM1 - a * a));
  const pp = _v2.subVectors(pole, S); pp.addScaledVector(dir, -pp.dot(dir));
  if (pp.lengthSq() < 1e-8) pp.set(0, 0, 1); pp.normalize();
  E.copy(S).addScaledVector(dir, a).addScaledVector(pp, h); H.copy(S).addScaledVector(dir, d);
}
/** push a body-local point out of the torso (and never behind it): to the front/side surface + margin */
function clampTorso(p, margin = 0.028) {
  const s = torsoAt(p.y); if (!s) return p;
  const rx = s[0] + margin, rz = s[1] + margin; let u = p.x / rx, w = p.z / rz; const q = u * u + w * w;
  if (q >= 1 && !(p.z < 0 && Math.abs(p.x) < rx)) return p;    // outside and not hidden behind the torso
  if (w < 0) w = -w;                                              // behind / inside the back half -> bring to the front
  if (q < 1) { const l = Math.hypot(u, w) || 1; u /= l; w /= l; if (w < 1e-3 && Math.abs(u) < 1e-3) { u = 0; w = 1; } }
  else { w = Math.sqrt(Math.max(0, 1 - Math.min(1, u * u))); }
  p.x = u * rx; p.z = w * rz; return p;
}
function clampHead(p, hcLocal, margin = 0.025) {
  const d = _v1.subVectors(p, hcLocal), L = d.length(), rr = R + margin;
  if (L < rr) { if (L < 1e-5) d.set(0, 0, 1); else d.divideScalar(L); p.copy(hcLocal).addScaledVector(d, rr); }
  return p;
}

// ---------------------------------------------------------------- face drawing selection
const VOW = { a: "_A", o: "_O", u: "_O", e: "_E", i: "_E", y: "_E" };
/** lip-sync helper: viseme for time tInWord (s) inside a word lasting wordDur (s) -> "_A" | "_E" | "_O" | "" (closed) */
export function visemeFor(word, tInWord, wordDur) {
  const vs = [...String(word).toLowerCase()].filter((ch) => VOW[ch]).map((ch) => VOW[ch]);
  if (tInWord < 0 || tInWord >= wordDur) return "";
  const n = Math.max(1, vs.length), seg = wordDur / n, k = Math.min(n - 1, Math.floor(tInWord / seg));
  return (tInWord - k * seg) < seg * 0.72 ? (vs[k] || "_E") : "";
}
export function faceName(faceSet, expression = "neutral", mouth = "", gaze = "") {
  const tryList = (ex) => {
    const b = `${faceSet}_${ex}`;
    if (mouth === "_blink") return [b + "_blink", b + gaze, b];
    if (mouth) return [b + mouth + gaze, b + mouth, b + "_talk" + gaze, b + "_talk", b + gaze, b];
    return [b + gaze, b];
  };
  for (const c of [...tryList(expression), ...tryList("neutral")]) if (FACE_FILES.has(c)) return c;
  return `${faceSet}_neutral`;
}

// ---------------------------------------------------------------- outline ring seeds
const seedPhases = (seed) => { const r = rng(Math.max(1, (seed | 0) % 2147483646) || 1); r(); return Array.from({ length: 7 }, () => r() * 6.283); };

// ---------------------------------------------------------------- arm pose library (body-local, character faces +Z, s = +1 left / -1 right)
function poseTarget(pose, s) {
  switch (pose) {
    case "hip": return { H: [s * 0.215, 0.80, 0.075], pole: [s * 0.9, 1.0, 0.05], hook: "in" };
    case "wave": return { H: [s * 0.40, 1.52, 0.12], pole: [s * 0.8, 0.9, 0.1], hook: "up" };
    case "thumbChest": return { H: [s * 0.06, 1.06, 0.20], pole: [s * 0.6, 0.85, 0.35], hook: "chest" };
    case "shrug": return { H: [s * 0.42, 0.98, 0.16], pole: [s * 0.6, 0.6, 0.0], hook: "up", lift: 0.035 };
    case "fold": return { H: [-s * 0.11, 0.99, 0.19 + 0.02 * s], pole: [s * 0.45, 0.85, 0.5], hook: "in" };
    case "fingerUp": return { H: [s * 0.36, 1.50, 0.16], pole: [s * 0.7, 0.95, 0.0], hook: "point", dir: [0, 1, 0] };
    case "present": return { H: [s * 0.27, 1.10, 0.27], pole: [s * 0.8, 0.8, 0.1], hook: "up" };
    case "rest": default: return { H: [s * 0.265, 0.72, 0.06], pole: [s * 0.45, 0.95, -0.45], hook: "in" };
  }
}

// ---------------------------------------------------------------- character
export async function createCharacter(spec = {}) {
  const id = spec.id || spec.faceSet || "char", faceSet = spec.faceSet || "keeper", seed = spec.seed ?? 7;
  const coat = spec.coat || {}; const coatCol = toColor(coat.color, "#c8a040"), accent = toColor(coat.accent ?? coat.color, "#6a4020");
  const hatType = spec.hat || null, hair = spec.hair || null;

  const root = new THREE.Group(); root.name = id;
  const hip = new THREE.Group(); hip.position.y = HIP; hip.rotation.order = "YXZ"; root.add(hip);
  const body = new THREE.Group(); body.position.y = -HIP; hip.add(body);                // body-local coords: y = height above floor
  const neck = new THREE.Group(); neck.position.y = TOP; neck.rotation.order = "YXZ"; body.add(neck);
  const headG = new THREE.Group(); neck.add(headG);                                     // head centre (moved toward the camera each frame)
  const HEAD_BASE = new THREE.Vector3(0, HEAD_Y - TOP, 0);
  const inkMat = new THREE.MeshStandardMaterial({ color: INK_LIN.clone().multiplyScalar(0.6), roughness: 0.55, metalness: 0 });

  // --- torso + fabric
  const T = torsoGeometry();
  const panel = coat.shirtPanel ? toColor(coat.shirtPanel) : null;
  const overlay = panel ? (g, Wm, Hm, mode) => {
    // contrasting shirt down the front (V opening, wider toward the neck), drawn per row in texture metres
    const Lpts = [], Rpts = [];
    for (let j = 0; j <= 64; j++) {
      const t = T.ts[j], gg = gT(t), y = (T.arc[j] / T.Lv) * Hm, w = 0.06 + 0.03 * Math.max(0, t);
      if (Math.abs(t) > 0.97) continue;
      const half = Math.asin(Math.min(1, w / (TW * gg))) / (Math.PI * 2) * Wm, c = 0.25 * Wm;
      Lpts.push([c - half, y]); Rpts.push([c + half, y]);
    }
    g.save(); g.beginPath(); Lpts.forEach((p, i) => (i ? g.lineTo(...p) : g.moveTo(...p))); for (let i = Rpts.length - 1; i >= 0; i--) g.lineTo(...Rpts[i]); g.closePath(); g.clip();
    const S = 0.013, c1 = panel, c2 = panel.clone().multiplyScalar(0.72);
    for (let y = 0, j = 0; y < Hm; y += S, j++) for (let x = 0.25 * Wm - 0.12, i = 0; x < 0.25 * Wm + 0.12; x += S, i++) {
      const on = (i + j) % 2 === 0; const cc = (on ? c1 : c2).clone().convertLinearToSRGB();
      g.fillStyle = mode === "col" ? `rgb(${cc.r * 255 | 0},${cc.g * 255 | 0},${cc.b * 255 | 0})` : (on ? "#8a8a8a" : "#707070"); g.fillRect(x, y, S, S);
    }
    g.restore();
    g.lineWidth = 0.004; g.strokeStyle = mode === "col" ? "rgba(30,18,10,0.55)" : "#202020";       // coat edge seam
    for (const P of [Lpts, Rpts]) { g.beginPath(); P.forEach((p, i) => (i ? g.lineTo(...p) : g.moveTo(...p))); g.stroke(); }
  } : null;
  const ctype = coat.type || "plain";
  const tex = fabricTextures(ctype === "knit" ? "knit" : ctype === "check" ? "check" : ctype === "tweed" ? "tweed" : "plain",
    coatCol, accent.clone().lerp(coatCol, ctype === "check" ? 0.25 : 0.5), seed * 13 + 1, T.per, T.Lv, 1700, overlay);
  const coatMat = new THREE.MeshStandardMaterial({ map: tex.map, bumpMap: tex.bumpMap, bumpScale: ctype === "knit" ? 1.3 : 1.2, roughness: 0.88, metalness: 0 });
  const torso = new THREE.Mesh(T.geo, coatMat); torso.castShadow = true; torso.receiveShadow = true; body.add(torso); addHull(torso, 0.012);

  // placket, buttons, pocket flaps (laid on the curved front)
  const accMat = new THREE.MeshStandardMaterial({ color: accent, roughness: 0.8 });
  const placket = new THREE.Mesh(surfaceBox(0, TZ - 0.01, 0.032, 0.46, 0.014), accMat); placket.castShadow = true; body.add(placket); addHull(placket, 0.004);
  const btnMat = new THREE.MeshStandardMaterial({ color: toColor(coat.buttons ?? "#2a1a10"), roughness: 0.45 });
  const btnGeo = new THREE.SphereGeometry(1, 14, 10);
  for (let k = 0; k < 3; k++) {
    const y = TZ + 0.15 - k * 0.13, b = new THREE.Mesh(btnGeo, btnMat); b.scale.set(0.017, 0.022, 0.010);
    b.position.set(0, y, frontZ(0, y) + 0.020); body.add(b);
  }
  for (const s of [-1, 1]) {
    const pk = new THREE.Mesh(surfaceBox(s * 0.105, TZ - 0.10, 0.085, 0.04, 0.012), accMat); pk.castShadow = true; body.add(pk); addHull(pk, 0.004);
  }

  // --- head (flat face drawing projected from the camera)
  const headMat = faceMat();
  const head = new THREE.Mesh(new THREE.SphereGeometry(R, 64, 48), headMat); head.scale.set(1, 0.99, 0.96); head.castShadow = true;
  headG.add(head); addHull(head, 0.006);
  let topCut = null, taper = false;

  if (hatType === "beanie" || hatType === "cap" || hatType === "bowler") {
    const hc = toColor(spec.hatColor ?? "#c94430");
    const kt = fabricTextures("knit", hc, hc, seed * 7 + 3, 1.9, 0.5, 900);
    kt.map.repeat.set(1, 1); const knit = new THREE.MeshStandardMaterial({ map: kt.map, bumpMap: kt.bumpMap, bumpScale: 2.5, roughness: 0.9 });
    const dome = new THREE.Mesh(capGeometry(R * 1.04, R * 1.26, R * 1.01, R * 0.40, 0.12), knit); dome.castShadow = true; headG.add(dome); addHull(dome, 0.012);
    // cuff: rounded band (lathe), slightly lower at the front
    const cr = R * 1.06, ch = R * 0.26, bv = R * 0.09, prof = [];
    for (let i = 0; i <= 8; i++) { const a = -Math.PI / 2 + (i / 8) * (Math.PI / 2); prof.push(new THREE.Vector2(cr - bv + bv * Math.cos(a), -ch / 2 + bv + bv * Math.sin(a))); }
    for (let i = 0; i <= 8; i++) { const a = (i / 8) * (Math.PI / 2); prof.push(new THREE.Vector2(cr - bv + bv * Math.cos(a), ch / 2 - bv + bv * Math.sin(a))); }
    prof.push(new THREE.Vector2(cr * 0.9, ch / 2)); prof.unshift(new THREE.Vector2(cr * 0.9, -ch / 2));
    const ckt = fabricTextures("knit", hc.clone().multiplyScalar(0.82), hc, seed * 7 + 5, 2.0, 0.2, 900);
    const cuff = new THREE.Mesh(new THREE.LatheGeometry(prof, 72), new THREE.MeshStandardMaterial({ map: ckt.map, bumpMap: ckt.bumpMap, bumpScale: 3, roughness: 0.9 }));
    cuff.position.set(0, R * 0.47, 0); cuff.rotation.x = 0.12; cuff.castShadow = true; headG.add(cuff); addHull(cuff, 0.012);
    const pomCol = toColor(spec.pomColor ?? "#f2ece0"); const pt = fabricTextures("fluff", pomCol, pomCol, seed + 9, 0.4, 0.2, 1200);
    const pom = new THREE.Mesh(new THREE.SphereGeometry(R * 0.2, 24, 16), new THREE.MeshStandardMaterial({ map: pt.map, bumpMap: pt.bumpMap, bumpScale: 4, roughness: 0.95 }));
    pom.position.set(0, R * 1.30, -0.02); pom.castShadow = true; headG.add(pom); addHull(pom, 0.010);
    topCut = 0.36 * R; taper = false;
  } else if (hair) {
    const hcol = toColor(hair.color ?? "#7a5232"); const ht = fabricTextures("strands", hcol, hcol, seed * 5 + 2, 1.9, 0.5, 900);
    const hm = new THREE.MeshStandardMaterial({ map: ht.map, bumpMap: ht.bumpMap, bumpScale: 2, roughness: 0.75 });
    const h = new THREE.Mesh(capGeometry(R * 1.05, R * 1.04, R * 1.0, R * 0.30, 0.55), hm); h.castShadow = true; headG.add(h); addHull(h, 0.012);
    topCut = 0.44 * R; taper = true;
  }

  // --- hand-drawn outline ring (positions rewritten every frame, root-local)
  const ph = seedPhases(seed * 101 + 17), NR = 240;
  const ringPos = new Float32Array((NR + 1) * 2 * 3);
  const ringGeo = new THREE.BufferGeometry(); ringGeo.setAttribute("position", new THREE.BufferAttribute(ringPos, 3).setUsage(THREE.DynamicDrawUsage));
  const ridx = []; for (let i = 0; i < NR; i++) { const a = 2 * Math.PI * (i + 0.5) / NR; if (topCut !== null && Math.sin(a) * R > topCut) continue; ridx.push(2 * i, 2 * i + 1, 2 * i + 3, 2 * i, 2 * i + 3, 2 * i + 2); }
  ringGeo.setIndex(ridx);
  const ring = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: INK_LIN, side: THREE.DoubleSide })); ring.frustumCulled = false; root.add(ring);
  const bite = (a) => Math.min(0.13, Math.max(0.010, 0.055 + 0.038 * Math.sin(2 * a + ph[0]) + 0.022 * Math.sin(3 * a + ph[1]) + 0.010 * Math.sin(5 * a + ph[2]) + 0.006 * Math.sin(8 * a + ph[6])));
  const wid = (a) => 0.85 + 0.35 * Math.sin(a + ph[3]) + 0.16 * Math.sin(3 * a + ph[4]) + 0.08 * Math.sin(6 * a + ph[5]);

  // --- limbs
  const arms = {}; for (const s of [1, -1]) { arms[s] = { tube: new InkTube(32, LIMB_R, inkMat), hook: new InkTube(8, LIMB_R * 0.93, inkMat), H: new THREE.Vector3(), tip: new THREE.Vector3(),
    curve: new THREE.CatmullRomCurve3([new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()], false, "centripetal") };
    body.add(arms[s].tube.mesh, arms[s].hook.mesh); }
  const legs = {}; for (const s of [1, -1]) { legs[s] = { tube: new InkTube(24, LIMB_R, inkMat), curve: new THREE.CatmullRomCurve3([new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()], false, "centripetal") }; root.add(legs[s].tube.mesh); }
  const jointGeo = new THREE.SphereGeometry(LIMB_R * 0.98, 10, 8);
  const joint = () => { const m = new THREE.Mesh(jointGeo, inkMat); m.castShadow = true; return m; };
  const armJ = { 1: [joint(), joint()], [-1]: [joint(), joint()] }; for (const s of [1, -1]) body.add(...armJ[s]);
  const legJ = { 1: [joint(), joint()], [-1]: [joint(), joint()] }; for (const s of [1, -1]) root.add(...legJ[s]);

  // --- face textures (lazy, cached; await ch.ready() before rendering a frame)
  const texCache = new Map(), pending = new Set(); const loader = new THREE.TextureLoader();
  function faceTex(name) {
    let t = texCache.get(name); if (t) return t;
    let done; const p = new Promise((r) => (done = r)); pending.add(p);
    t = loader.load(url(`faces/${name}.png`), () => { pending.delete(p); done(); }, undefined, () => { pending.delete(p); done(); });
    t.colorSpace = THREE.NoColorSpace; t.anisotropy = 4; t.generateMipmaps = true; texCache.set(name, t); return t;
  }
  faceTex(faceName(faceSet, "neutral"));

  // scratch
  const V = (a) => new THREE.Vector3(a[0], a[1], a[2]);
  const hcW = new THREE.Vector3(), hcBody = new THREE.Vector3(), camW = new THREE.Vector3(), tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3();
  const X = new THREE.Vector3(), Y = new THREE.Vector3(), Z = new THREE.Vector3(), up = new THREE.Vector3(), rootInv = new THREE.Matrix4();
  const armPts = Array.from({ length: 32 }, () => new THREE.Vector3()), hookPts = Array.from({ length: 6 }, () => new THREE.Vector3()), legPts = Array.from({ length: 24 }, () => new THREE.Vector3());
  let lastFace = "";

  function solveArm(s, a, hcB) {
    const A = arms[s]; a = a || {};
    const S = SHOULDER(s);
    let H, pole, hook = "in", pdir = null, lift = 0;
    let target = a.target ? body.worldToLocal(tmp.copy(a.target)) .clone() : null;
    const pose = a.pose || (target ? "point" : "rest");
    if (target && pose !== "grab") {                              // point at the target: arm nearly straight toward it
      const crossing = target.x * s < -0.02;
      pdir = target.clone().sub(S); const dist = pdir.length(); pdir.normalize();
      H = S.clone().addScaledVector(pdir, Math.min(0.49, Math.max(0.2, dist - HOOK)));
      pole = crossing ? new THREE.Vector3(s * 0.12, S.y - 0.25, 0.7) : new THREE.Vector3(s * 0.7, S.y - 0.35, 0.15);
      hook = "point";
    } else if (target) {                                          // grab / hold: the hand goes to the point (reach-limited)
      H = target; const crossing = target.x * s < -0.02;
      pole = crossing ? new THREE.Vector3(s * 0.15, S.y - 0.3, 0.7) : new THREE.Vector3(s * 0.75, S.y - 0.3, 0.05);
      hook = "in";
    } else {
      const P = poseTarget(pose, s); H = V(P.H); pole = V(P.pole); hook = P.hook; lift = P.lift || 0; if (P.dir) pdir = V(P.dir);
    }
    S.y += lift;
    clampTorso(H, 0.03); clampHead(H, hcB, 0.03);
    const E = new THREE.Vector3(), Hc = new THREE.Vector3(); ik(S, H, pole, E, Hc);
    clampTorso(E, 0.03); clampHead(E, hcB, 0.03); clampTorso(Hc, 0.03); clampHead(Hc, hcB, 0.03);
    A.curve.points[0].copy(S); A.curve.points[1].copy(E); A.curve.points[2].copy(Hc);
    const n = 24;
    for (let i = 0; i < n; i++) {
      const u = i / (n - 1); A.curve.getPoint(u, armPts[i]);
      if (u > 0.14) { clampTorso(armPts[i], 0.026); clampHead(armPts[i], hcB, 0.025); }   // never through the body (shoulder end emerges from the side)
    }
    const Hn = armPts[n - 1]; A.H.copy(Hn);
    // finger hook
    const dd = tmp2.subVectors(Hn, armPts[n - 3]).normalize();
    let tipDir;
    if (hook === "point") tipDir = (pdir ? pdir.clone() : dd.clone()).normalize();
    else if (hook === "up") tipDir = dd.clone().multiplyScalar(0.3).add(new THREE.Vector3(-s * 0.35, 1, 0.25)).normalize();
    else if (hook === "chest") tipDir = new THREE.Vector3(-s * 0.8, 0.35, -0.45).normalize();
    else { const inward = new THREE.Vector3(-Hn.x, 0, Math.max(0.05, 0.25 - Hn.z)).normalize(); tipDir = dd.clone().multiplyScalar(0.35).add(inward.multiplyScalar(0.55)).add(new THREE.Vector3(0, 0.45, 0)).normalize(); }
    const tip = A.tip.copy(Hn).addScaledVector(tipDir, HOOK * 0.95);
    if (hook !== "point" && hook !== "chest") clampTorso(tip, 0.02);
    const bend = hook === "point" ? 0 : 0.006;
    for (let i = 0; i < 6; i++) { const u = i / 5; hookPts[i].copy(Hn).lerp(tip, u); if (bend) hookPts[i].y += Math.sin(Math.PI * u) * bend; }
    A.tube.set(armPts.slice(0, n)); A.hook.set(hookPts);
    armJ[s][0].position.copy(Hn); armJ[s][1].position.copy(tip);
  }

  const ch = {
    root, spec, R,
    /** per-frame update: pure function of state + camera + light (no history) */
    update(state = {}, opts = {}) {
      const cam = opts.camera; const key = opts.keyLightPos;
      // body pose (ONE rigid piece: everything below is parented, so all parts move in the same frame)
      hip.position.set(0, HIP + (state.bob || 0), 0);
      hip.rotation.set(state.lean || 0, state.turn || 0, -(state.side || 0));
      neck.rotation.set(state.nod || 0, 0, -(state.tilt || 0));
      headG.position.copy(HEAD_BASE); root.updateWorldMatrix(true, true);
      // head 10 cm toward the camera (horizontal, in neck space)
      if (cam) {
        cam.updateMatrixWorld(); camW.setFromMatrixPosition(cam.matrixWorld);
        const c = neck.worldToLocal(tmp.copy(camW)).sub(HEAD_BASE); c.y = 0;
        if (c.lengthSq() < 1e-6) c.set(0, 0, 1); headG.position.addScaledVector(c.normalize(), HEAD_FWD);
      } else { headG.position.z += HEAD_FWD; camW.set(0, 1.4, 10).applyMatrix4(root.matrixWorld); }
      headG.updateMatrixWorld(true);
      hcW.setFromMatrixPosition(headG.matrixWorld); hcBody.copy(hcW); body.worldToLocal(hcBody);

      // face basis: drawing faces the camera, rolls with the head
      up.set(0, 1, 0).transformDirection(neck.matrixWorld);
      Z.subVectors(camW, hcW).normalize(); Y.copy(up).addScaledVector(Z, -up.dot(Z)).normalize(); X.crossVectors(Y, Z);
      const u = headMat.uniforms; u.hc.value.copy(hcW); u.X.value.copy(X); u.Y.value.copy(Y); u.Z.value.copy(Z);
      u.drop.value = (topCut !== null && !taper ? 0.10 * R : 0) + (state.nod || 0) * 0.10 * R;
      u.ls.value = key ? Math.max(-1, Math.min(1, tmp.subVectors(key, hcW).normalize().dot(X) * 2.5)) : 0.6;
      u.lit.value = opts.faceLit ?? 0; u.k.value = opts.faceGain ?? 0.95; u.GW.value = opts.faceGlow ?? 0.45; u.SHK.value = opts.faceShade ?? 0.6;
      const fname = faceName(faceSet, state.expression || "neutral", state.mouth || "", state.gaze || "");
      if (fname !== lastFace) { u.face.value = faceTex(fname); u.hasFace.value = 1; lastFace = fname; }

      // outline ring toward the camera (root-local positions)
      {
        const d = tmp.subVectors(camW, hcW), D = d.length(), nrm = d.divideScalar(D);
        const upr = tmp2.copy(up).addScaledVector(nrm, -up.dot(nrm)).normalize(), rt = new THREE.Vector3().crossVectors(upr, nrm);
        const off = 0.85 * R, kk = (D - off) / Math.sqrt(Math.max(1e-6, D * D - R * R)), rIn = R * kk * 0.995, wbase = 0.022 * (D - off) / D;
        const cx = hcW.x + nrm.x * off, cy = hcW.y + nrm.y * off, cz = hcW.z + nrm.z * off;
        rootInv.copy(root.matrixWorld).invert(); const e = rootInv.elements;
        for (let i = 0; i <= NR; i++) {
          const a = 2 * Math.PI * i / NR, ca = Math.cos(a), sa = Math.sin(a);
          const dx = rt.x * ca + upr.x * sa, dy = rt.y * ca + upr.y * sa, dz = rt.z * ca + upr.z * sa;
          let ri = rIn * (1 - bite(a)); const ro = Math.max(rIn * 1.03, ri + wbase * wid(a));
          if (taper && topCut !== null) { const t_ = Math.max(0, Math.min(1, (topCut - sa * R) / (0.12 * R))); ri = ro - (ro - ri) * (0.35 + 0.65 * t_); }
          for (let k = 0; k < 2; k++) {
            const r_ = k ? ro : ri, px = cx + dx * r_, py = cy + dy * r_, pz = cz + dz * r_, o = (2 * i + k) * 3;
            ringPos[o] = e[0] * px + e[4] * py + e[8] * pz + e[12]; ringPos[o + 1] = e[1] * px + e[5] * py + e[9] * pz + e[13]; ringPos[o + 2] = e[2] * px + e[6] * py + e[10] * pz + e[14];
          }
        }
        ringGeo.attributes.position.needsUpdate = true;
      }

      // arms (state.point = { target } picks the hand on the target's side automatically)
      let aL = state.armL, aR = state.armR;
      if (state.point && state.point.target) {
        const side = body.worldToLocal(tmp.copy(state.point.target)).x >= 0 ? 1 : -1;
        const handPref = state.point.hand; const s = handPref === "L" ? 1 : handPref === "R" ? -1 : side;
        if (s === 1) aL = { pose: "point", target: state.point.target }; else aR = { pose: "point", target: state.point.target };
      }
      solveArm(1, aL, hcBody); solveArm(-1, aR, hcBody);

      // legs (planted feet; top follows the hip) in root-local
      for (const s of [1, -1]) {
        const top = body.localToWorld(tmp.set(s * 0.07, HIP + 0.10, 0)); root.worldToLocal(top);
        const L = legs[s], kn = L.curve.points[1].set(s * 0.08, HIP * 0.5, 0.02), an = L.curve.points[2].set(s * 0.09, 0.017, 0);
        L.curve.points[0].copy(top);
        const toe = tmp2.set(s * 0.115, 0.017, 0.105);
        const n = 20; for (let i = 0; i < n; i++) L.curve.getPoint(i / (n - 1), legPts[i]);
        for (let i = 0; i < 4; i++) legPts[n + i].copy(an).lerp(toe, (i + 1) / 4);
        L.tube.set(legPts.slice(0, n + 4)); legJ[s][0].position.copy(an); legJ[s][1].position.copy(toe);
      }
      root.updateMatrixWorld(true);
    },
    /** resolves when every face drawing requested so far is loaded (call after update(), before rendering) */
    ready() { return Promise.all([...pending]); },
    /** preload face drawings for a list of states (e.g. a whole timeline) */
    preload(states = []) { for (const s of states) faceTex(faceName(faceSet, s.expression || "neutral", s.mouth || "", s.gaze || "")); return ch.ready(); },
    headCenter() { return hcW.clone(); },
    /** world position of the hand (grip point where the finger hook starts); part "tip" = end of the finger hook */
    handWorld(side = "R", part = "grip") { const A = arms[side === "L" ? 1 : -1]; return body.localToWorld((part === "tip" ? A.tip : A.H).clone()); },
    /** which hand ("L"/"R") is on the target's side (rule: point with the near hand) */
    nearHand(targetWorld) { root.updateWorldMatrix(true, true); return body.worldToLocal(targetWorld.clone()).x >= 0 ? "L" : "R"; },
    faceName(state) { return faceName(faceSet, state.expression || "neutral", state.mouth || "", state.gaze || ""); },
    dispose() { root.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) { for (const k of ["map", "bumpMap"]) o.material[k]?.dispose?.(); o.material.dispose(); } }); texCache.forEach((t) => t.dispose()); },
  };
  ch.update({}, {});
  return ch;
}
