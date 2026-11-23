// Characters (style v12 LOCKED, built fully in code). See ../CONTRACT.md for the API and ../../STYLE_BIBLE.md for the rules.
//  - head: white sphere R 0.29 with the flat 2D face drawing projected from the CAMERA (C1b/C1c), hand-drawn marker outline ring
//    rebuilt toward the camera every frame (C4e/C4c) + 0.6 cm hull. Face drawings are smoothed once on load (rounded joins,
//    fixes the keeper's zig-zag beard edge) and mip-mapped.
//  - torso: slim capsule (half w 0.21, d 0.15, h 0.31, |t|^3.2, taper 0.06), fabric canvas textures + bump, placket, buttons, pockets
//  - hats: real 3D (beanie, captain, sailor, beret, oilskin, toque, bonnet, cap), 1.2 cm hulls; hair cap
//  - limbs: ink tubes r 1.5 cm, 2-bone IK arms + legs, 4.5 cm finger hook (r 1.75 cm), L feet; arms never pass through the torso
//  - ONE PIECE (2026-11-16): update() is a pure function of (state, camera, light): no smoothing, no springs, no time history.
//    Pose changes are blended by the caller with armAt(keys, t) (pure function of t), never by hidden state.
// 2026-11-17 glitch fixes (measured on samples/keeper_laughs):
//  - hands teleported on every pose switch (step-changed poses) -> armAt() blend + elbow-blended IK
//  - clampTorso mirrored points behind the torso to the front (a jump when |x| crossed the torso width) -> continuous radial push
//  - pole switched discretely when a target crossed the body midline (elbow flip) -> smooth pole blend
//  - hands near the chest centre sank into the placket/buttons (2-3 cm proud of the coat) -> extra front margin there
//  - finger hook 1.4 cm, tip clamped flush with the coat -> 1.75 cm, 4.5 cm long, held 3 cm off the coat
import * as THREE from "three";
import { mergeVertices } from "three/addons/utils/BufferGeometryUtils.js";
import { INK, SKIN, url, rng } from "../shared/assets.js";
import { FACE_FILES } from "./faceIndex.js";
import { fabricTextures } from "./cloth.js";

// ---------------------------------------------------------------- locked proportions (metres, before spec.scale)
export const R = 0.29;
const TW = 0.21, TD = 0.15, TH = 0.31, TP = 0.06, PCAP = 3.2;
const HIP = 0.64, TZ = HIP + TH, TOP = TZ + TH, HEAD_Y = TOP + 0.76 * R, HEAD_FWD = 0.10;
const ARM1 = 0.27, ARM2 = 0.27, LIMB_R = 0.015, HOOK = 0.045, HOOK_R = 0.0175;
const LEG1 = 0.365, LEG2 = 0.365;
const SHOULDER = (s) => new THREE.Vector3(s * 0.185, TOP - 0.14, 0.02);

const capR = (t) => Math.pow(Math.max(0, 1 - Math.pow(Math.abs(t), PCAP)), 1 / PCAP);
const gT = (t) => capR(t) * (1 - TP * t);
/** torso cross-section (ellipse half axes) at body-local height y, or null outside the torso */
function torsoAt(y) { const t = (y - TZ) / TH; if (Math.abs(t) >= 1) return null; const g = gT(t); return [TW * g, TD * g]; }
function frontZ(x, y, out = 0) { const s = torsoAt(y); if (!s) return 0; const u = Math.min(0.999, Math.abs(x) / s[0]); return s[1] * Math.sqrt(1 - u * u) + out; }
const sstep = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const ease = (x) => { x = Math.max(0, Math.min(1, x)); return x * x * x * (x * (x * 6 - 15) + 10); };

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
      lit: { value: 0 }, skin: { value: new THREE.Vector3(...SKIN) }, ink: { value: new THREE.Vector3(0.11, 0.075, 0.06) },
      wet: { value: 0 }, time: { value: 0 }, faceA: { value: 1 } },
    vertexShader: `varying vec3 wp; void main(){ vec4 w = modelMatrix*vec4(position,1.0); wp = w.xyz; gl_Position = projectionMatrix*viewMatrix*w; }`,
    // 2026-11-19b "lemon juice" look (wet 0..1): 3 thin ink drips drawn in the face drawing's 2D frame, like the drawing itself
    // (no gloss, no highlight; coordinator: faces stay flat white drawings). The lemon-slice decal was removed (read as a monocle);
    // state.lemonSlice is ignored. Edges anti-aliased with fwidth. With wet = 0 the output is unchanged.
    fragmentShader: `uniform vec3 hc,X,Y,Z,skin,ink; uniform float R,drop,ls,k,GW,lit,hasFace,SHK,wet,time,faceA; uniform sampler2D face; varying vec3 wp;
      float aa(float d, float fw){ return 1.0 - smoothstep(-fw, fw, d); }
      void main(){ vec3 d = wp-hc; float x = dot(d,X), y = dot(d,Y), z = dot(d,Z); float FS = 2.15*R;
        vec2 uv = vec2(x/FS+0.5, y/FS+0.5+drop/FS);
        vec4 f = (hasFace<0.5||uv.x<0.||uv.x>1.||uv.y<0.||uv.y>1.) ? vec4(0.) : texture2D(face, uv);
        f.a *= smoothstep(0.05*R, 0.25*R, z) * faceA;                                   // back view (2026-11-23): no face on the back of the head
        float lum = dot(f.rgb, vec3(0.3,0.59,0.11));
        f.rgb = mix(f.rgb, ink, smoothstep(0.55, 0.20, lum));                               // navy ink -> warm dark ink
        f.rgb = mix(f.rgb, ink*0.45, smoothstep(0.04, 0.12, f.r-max(f.g,f.b)));             // red mouth inside -> black
        float sh = smoothstep(-0.25, 1.0, -ls*x/R); vec3 c = mix(skin, vec3(0.48,0.48,0.60), sh*abs(ls)*SHK);   // cool far-side fade
        float gl = smoothstep(-0.50, 1.0, ls*x/R)*0.85*GW*abs(ls); c = mix(c, vec3(1.0,0.68,0.30), gl);   // warm lamp side
        float gain = 1.0;
        if (wet > 0.001) {                                         // 2026-11-19b: juice drawn like the face drawing (ink drips)
          vec2 q = vec2(x, y + drop) / R; float fw = max(1e-4, fwidth(q.x) + fwidth(q.y)) * 0.75;
          float front = smoothstep(0.0, 0.2*R, z);
          // 3 drips: thin warm-brown ink trail + outlined teardrop, deterministic loops in time (x0, top y, period s, offset s);
          // each fades in at the top and out past the chin before it restarts -> never pops
          for (int i = 0; i < 3; i++) {
            float fi = float(i);
            vec4 P = i == 0 ? vec4(-0.56, 0.40, 2.8, 0.0) : i == 1 ? vec4(0.60, 0.26, 3.3, 1.4) : vec4(-0.40, -0.40, 2.4, 0.8);
            float ph = fract((time + P.w) / P.z);
            float A = smoothstep(0.0, 0.10, ph) * (1.0 - smoothstep(0.70, 0.95, ph)) * smoothstep(0.1, 0.5, wet) * front;
            float yb = P.y - (P.y + 1.05) * pow(ph, 1.25);                                  // drop centre runs down past the chin
            float bx = P.x + 0.015 * sin(yb * 6.0 + fi * 2.1);
            float r = 0.050;
            float tw = 0.0;
            float cx = P.x + 0.015 * sin(q.y * 6.0 + fi * 2.1);
            float top = min(P.y, yb + 1.9 * r + 0.22);                                        // short trail (<= 0.22 R) above the drop
            tw = 0.011 * (1.0 - smoothstep(top - 0.10, top + 0.01, q.y));                  // tapers to 0 at the top
            float dT = max(abs(q.x - cx) - tw, max(yb + 1.9 * r - q.y, q.y - top));
            vec2 dp = q - vec2(bx, yb);
            float dDrop = dp.y > 1.9 * r ? length(dp - vec2(0.0, 1.9 * r)) : dp.y > 0.0 ? abs(dp.x) - r * (1.0 - dp.y / (1.9 * r)) : length(dp) - r;   // teardrop, closed tip
            float ring = aa(abs(dDrop) - 0.011, fw);                                          // outline, same weight as the drawing
            float inside = aa(dDrop, fw);
            c = mix(c, vec3(1.0, 0.99, 0.95), A * inside);                                    // drop inside = paper white
            c = mix(c, ink, A * max(ring, aa(dT, fw)));
          }
        }
        c = mix(c, f.rgb, f.a);
        c = mix(c, c*vec3(1.0,0.86,0.62), 0.45*lit);
        gl_FragColor = vec4(pow(c, vec3(2.2))*k*(0.78 + 0.32*lit)*gain, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }` });
}

// ---------------------------------------------------------------- face drawings: load once, smooth, share between characters
// Smoothing = blur the ink mask + alpha by sigma px and re-threshold (normalized-convolution colour for the non-ink parts).
// Rounds the polyline joins of the drawings (keeper beard zig-zag) without editing the PNGs; strokes keep their weight.
const FACE_CACHE = new Map();
function smoothFace(img, sigma) {
  const W = img.naturalWidth || img.width, H = img.naturalHeight || img.height;
  const mk = () => { const c = document.createElement("canvas"); c.width = W; c.height = H; return [c, c.getContext("2d", { willReadFrequently: true })]; };
  const [c0, g0] = mk(); g0.drawImage(img, 0, 0); const src = g0.getImageData(0, 0, W, H), d = src.data;
  const [cm, gm] = mk(), [cn, gn] = mk(); const M = gm.createImageData(W, H), N = gn.createImageData(W, H), m = M.data, n = N.data;
  for (let i = 0; i < d.length; i += 4) {
    const a = d[i + 3] / 255, r = d[i] / 255, g = d[i + 1] / 255, b = d[i + 2] / 255, lum = 0.3 * r + 0.59 * g + 0.11 * b;
    const red = Math.max(0, Math.min(1, (r - Math.max(g, b) - 0.06) / 0.08));
    const ink = a * Math.max(0, Math.min(1, (0.55 - lum) / 0.35)) * (1 - red), non = a * (1 - ink);
    m[i] = ink * 255; m[i + 1] = a * 255; m[i + 2] = non * 255; m[i + 3] = 255;
    n[i] = d[i] * non; n[i + 1] = d[i + 1] * non; n[i + 2] = d[i + 2] * non; n[i + 3] = 255;
  }
  gm.putImageData(M, 0, 0); gn.putImageData(N, 0, 0);
  const [cb, gb] = mk(), [cc, gc] = mk(); gb.filter = gc.filter = `blur(${sigma}px)`;
  gb.drawImage(cm, 0, 0); gc.drawImage(cn, 0, 0);
  const B = gb.getImageData(0, 0, W, H).data, C = gc.getImageData(0, 0, W, H).data;
  const th = sigma >= 7 ? 0.42 : 0.45;
  for (let i = 0; i < d.length; i += 4) {
    const I = sstep(th - 0.05, th + 0.05, B[i] / 255), A = sstep(0.40, 0.50, B[i + 1] / 255), Nb = B[i + 2] / 255;
    let r = 242, g = 241, b = 237;
    if (Nb > 0.02) { r = C[i] / Nb; g = C[i + 1] / Nb; b = C[i + 2] / Nb; }
    d[i] = r + (28 - r) * I; d[i + 1] = g + (30 - g) * I; d[i + 2] = b + (58 - b) * I; d[i + 3] = 255 * Math.max(A, I);
  }
  g0.putImageData(src, 0, 0); return c0;
}
function faceTexture(name, sigma) {
  const key = name + "|" + sigma; let e = FACE_CACHE.get(key); if (e) return e;
  const tex = new THREE.Texture(); tex.colorSpace = THREE.NoColorSpace; tex.anisotropy = 8; tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter; tex.magFilter = THREE.LinearFilter; tex.flipY = true;
  const promise = new Promise((res) => {
    const img = new Image();
    img.onload = () => { try { tex.image = sigma > 0 ? smoothFace(img, sigma) : img; } catch (err) { console.warn("face smooth failed", err); tex.image = img; } tex.needsUpdate = true; res(); };
    img.onerror = () => res(); img.src = url(`faces/${name}.png`);
  });
  e = { tex, promise, loaded: false }; promise.then(() => (e.loaded = true)); FACE_CACHE.set(key, e); return e;
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
  /** pts: array of Vector3, n = number of points used. Frame uses a fixed reference (body up / side) so it never flips. */
  set(pts, n = pts.length) {
    n = Math.min(n, this.max); const T = this._t, N = this._n, B = this._b, tmp = this._tmp;
    for (let i = 0; i < n; i++) {
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)]; T.subVectors(b, a); if (T.lengthSq() < 1e-12) T.set(0, -1, 0); T.normalize();
      if (i === 0) { tmp.set(0, 0, 1); if (Math.abs(T.z) > 0.9) tmp.set(1, 0, 0); N.crossVectors(T, tmp).normalize(); }
      else { N.addScaledVector(T, -N.dot(T)); if (N.lengthSq() < 1e-10) { tmp.set(0, 0, 1); if (Math.abs(T.z) > 0.9) tmp.set(1, 0, 0); N.crossVectors(T, tmp); } N.normalize(); }
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
  const n = geo.attributes.normal;
  for (let j = 0; j <= nv; j++) { const a = j * (nu + 1), b = a + nu; const x = (n.getX(a) + n.getX(b)) / 2, y = (n.getY(a) + n.getY(b)) / 2, z = (n.getZ(a) + n.getZ(b)) / 2;
    const l = Math.hypot(x, y, z) || 1; n.setXYZ(a, x / l, y / l, z / l); n.setXYZ(b, x / l, y / l, z / l); }
  const per = Math.PI * (3 * (TW + TD) - Math.sqrt((3 * TW + TD) * (TW + 3 * TD)));
  return { geo, Lv, per, ts, arc };
}

/** ellipsoid cap (half axes a=x, c=y, b=z) keeping the part with y > y0 + slope*z; clean cut edge, UV u around, v from crown */
function capGeometry(a, c, b, y0, slope, nu = 72, nv = 28) {
  const P = (th, ph) => [a * Math.sin(th) * Math.cos(ph), c * Math.cos(th), b * Math.sin(th) * Math.sin(ph)];
  const pos = [], uv = [], idx = [];
  for (let i = 0; i <= nu; i++) {
    const ph = (i / nu) * Math.PI * 2; let lo = 0, hi = Math.PI;
    for (let k = 0; k < 40; k++) { const m = (lo + hi) / 2, p = P(m, ph); if (p[1] > y0 + slope * p[2]) lo = m; else hi = m; }
    for (let j = 0; j <= nv; j++) { const th = lo * (j / nv); pos.push(...P(th, ph)); uv.push(i / nu, j / nv); }
  }
  for (let i = 0; i < nu; i++) for (let j = 0; j < nv; j++) {
    const p0 = i * (nv + 1) + j, p1 = p0 + 1, q0 = p0 + nv + 1, q1 = q0 + 1; idx.push(p0, q0, p1, p1, q0, q1); }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
  const n = g.attributes.normal, p = g.attributes.position;
  for (let v = 0; v < p.count; v++) { const x = p.getX(v) / (a * a), y = p.getY(v) / (c * c), z = p.getZ(v) / (b * b), l = Math.hypot(x, y, z); n.setXYZ(v, x / l, y / l, z / l); }
  return g;
}

/** closed lathe band with rounded edges: radius r0 at y0 -> r1 at y1, thickness th (a hat band / brim) */
function bandGeometry(r0, y0, r1, y1, th, seg = 72) {
  const prof = []; const N = 6, h = th / 2;
  const L = Math.hypot(r1 - r0, y1 - y0), dx = (r1 - r0) / L, dy = (y1 - y0) / L, nx = dy, ny = -dx;   // band direction + outward normal
  for (let i = 0; i <= N; i++) { const a = Math.PI / 2 - Math.PI * (i / N); prof.push(new THREE.Vector2(r1 + h * (nx * Math.sin(a) + dx * Math.cos(a)), y1 + h * (ny * Math.sin(a) + dy * Math.cos(a)))); }
  for (let i = 0; i <= N; i++) { const a = -Math.PI / 2 - Math.PI * (i / N); prof.push(new THREE.Vector2(r0 + h * (nx * Math.sin(a) + dx * Math.cos(a)), y0 + h * (ny * Math.sin(a) + dy * Math.cos(a)))); }
  prof.push(prof[0].clone());
  const g = new THREE.LatheGeometry(prof, seg); g.computeVertexNormals(); return g;
}

/** a thin box laid onto the torso front surface (placket, pocket flap); x0,y0 = centre on the body, w,h size, d thickness */
function surfaceBox(x0, y0, w, h, d, lift = 0.002) {
  const g = new THREE.BoxGeometry(w, h, d, 6, 20, 1); const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i) + x0, y = p.getY(i) + y0; p.setXYZ(i, x, y, frontZ(x, y) + lift + d / 2 + p.getZ(i)); }
  g.computeVertexNormals(); return g;
}

// ---------------------------------------------------------------- 2-bone IK + body-collision helpers
const _v1 = new THREE.Vector3(), _v2 = new THREE.Vector3(), _v3 = new THREE.Vector3();
function ik(S, Hd, pole, E, H, L1 = ARM1, L2 = ARM2) {
  const dv = _v1.subVectors(Hd, S); let d = dv.length(); const dir = _v3.copy(dv).divideScalar(d || 1);
  d = Math.min(Math.max(d, 0.05), (L1 + L2) * 0.999);
  const a = (L1 * L1 - L2 * L2 + d * d) / (2 * d), h = Math.sqrt(Math.max(0, L1 * L1 - a * a));
  const pp = _v2.subVectors(pole, S); pp.addScaledVector(dir, -pp.dot(dir));
  if (pp.lengthSq() < 1e-8) pp.set(0, 0, 1); pp.normalize();
  E.copy(S).addScaledVector(dir, a).addScaledVector(pp, h); H.copy(S).addScaledVector(dir, d);
}
/** continuous push of a body-local point out of the torso (radial from the torso axis). Extra front margin over the
 *  placket/buttons (they stand 2-3 cm proud of the coat), so hands never sink into them. No mirroring, no jumps. */
function clampTorso(p, margin = 0.03) {
  const s = torsoAt(p.y); if (!s) return p;
  const front = 0.026 * Math.max(0, 1 - Math.abs(p.x) / 0.075) * sstep(-0.02, 0.06, p.z);
  const rx = s[0] + margin, rz = s[1] + margin + front; const q = (p.x / rx) ** 2 + (p.z / rz) ** 2;
  if (q >= 1) return p;
  if (q < 1e-8) { p.z = rz; return p; }
  const k = 1 / Math.sqrt(q); p.x *= k; p.z *= k; return p;
}
function clampHead(p, hcLocal, margin = 0.025) {
  const d = _v1.subVectors(p, hcLocal), L = d.length(), rr = R + margin;
  if (L < rr) { if (L < 1e-5) d.set(0, 0, 1); else d.divideScalar(L); p.copy(hcLocal).addScaledVector(d, rr); }
  return p;
}

// ---------------------------------------------------------------- face drawing selection
const VOW = { a: "_A", o: "_O", u: "_O", e: "_E", i: "_E", y: "_E" };
/** lip-sync helper: viseme for time tInWord (s) inside a word lasting wordDur (s) -> "_A" | "_E" | "_O" | "" (closed) */
// 2026-11-17: no 1-frame mouth pops. Every mouth shape (open vowel or closed) is held >= MIN_HOLD (0.1 s = 3 frames):
// fewer vowel slots in short words, the closing beat only when it lasts >= MIN_HOLD, and short gaps between words stay open.
const MIN_HOLD = 0.1;
export function visemeFor(word, tInWord, wordDur) {
  let vs = [...String(word).toLowerCase()].filter((ch) => VOW[ch]).map((ch) => VOW[ch]);
  if (tInWord < 0 || tInWord >= wordDur) return "";
  vs = vs.filter((v, i) => i === 0 || v !== vs[i - 1]);                                // merge repeated vowels (no visible change)
  const n = Math.max(1, Math.min(vs.length, Math.floor(wordDur / MIN_HOLD))), seg = wordDur / n, k = Math.min(n - 1, Math.floor(tInWord / seg));
  const closeLen = seg * 0.28, close = closeLen >= MIN_HOLD && seg - closeLen >= MIN_HOLD;
  const pick = vs[Math.min(vs.length - 1, Math.floor((k / n) * vs.length))] || "_E";
  return !close || (tInWord - k * seg) < seg - closeLen ? pick : "";
}
/** lip-sync over a word list [[start, end, word], ...] (pure function of t). Gaps between words shorter than `gap` s keep the
 *  previous word's last mouth (no 1-2 frame closures); the mouth closes after the last word and in real pauses. */
export function visemeAt(words, t, gap = 0.12) {
  for (let i = 0; i < words.length; i++) {
    const [a, b, w] = words[i];
    if (t >= a && t < b) return visemeFor(w, t - a, b - a);
    const nx = words[i + 1];
    if (nx && t >= b && t < nx[0] && nx[0] - b < gap) return visemeFor(w, Math.max(0, b - a - 1e-4), b - a) || visemeFor(w, 0, b - a);
  }
  return "";
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

/** Blend arm poses over time, pure function of t (no history). keys = [[t0, armSpec], [t1, armSpec], ...] sorted by time.
 *  Each change eases in over `dur` seconds (default 0.3; a key may set its own as a 3rd element) starting at its key time. Returns an arm spec for state.armL / state.armR. */
export function armAt(keys, t, dur = 0.3) {
  let i = -1; for (let k = 0; k < keys.length; k++) if (t >= keys[k][0]) i = k;
  if (i < 0) return keys.length ? keys[0][1] : { pose: "rest" };
  const cur = keys[i][1]; const d = keys[i][2] ?? dur;
  if (i === 0 || t >= keys[i][0] + d) return cur;
  return { ...cur, from: armAt(keys.slice(0, i), keys[i][0], dur), mix: ease((t - keys[i][0]) / d) };
}
/** all arm poses (body-local, see poseTarget). Poses taking `target` (world Vector3) or `phase` (cycles, from time) are marked. */
export const ARM_POSES = ["rest", "hip", "wave", "thumbChest", "shrug", "fold", "fingerUp", "present", "point*", "grab*", "poke*", "push*",
  "pokeChest*", "hold", "crank*", "polish*", "pour", "slapKnee", "fistsUp", "mimic", "handshake", "climb*", "tapHead", "limp",
  // video 2 (2026-11-19)
  "squeezeOverHead", "writeWithLemon*", "holdUp", "pointSelf", "selfie", "shakePhoto", "thumbsUp", "sniff", "carryBag", "knock*", "pressPlay*",
  "facepalm", "readNewspaper", "chalkWrite*", "tapBoard*", "holdBook"];
/** default head motion that goes with some poses, PER ARM (two-hand poses carry half each), summed over both arms and
 *  weighted by the armAt blend -> continuous. Added to state.nod / state.tilt. Disable per arm with { headHint: false }. */
const HEAD_HINT = { sniff: { nod: -0.10, tilt: 0.14 }, facepalm: { nod: 0.22, tilt: 0.05 }, readNewspaper: { nod: 0.03, tilt: 0 }, holdBook: { nod: 0.08, tilt: 0.02 },
  writeWithLemon: { nod: 0.20, tilt: 0 }, selfie: { nod: -0.04, tilt: 0.10 }, squeezeOverHead: { nod: -0.04, tilt: 0 }, holdUp: { nod: -0.02, tilt: 0 } };
function headHint(a, out = { nod: 0, tilt: 0 }, w = 1) {
  if (!a) return out; const m = a.from && (a.mix ?? 1) < 1 ? Math.max(0, Math.min(1, a.mix ?? 1)) : 1;
  const h = HEAD_HINT[a.pose]; if (h && a.headHint !== false) { out.nod += h.nod * w * m; out.tilt += h.tilt * w * m * (a.side ?? 1); }
  if (m < 1) headHint(a.from, out, w * (1 - m)); return out;
}

// ---------------------------------------------------------------- outline ring seeds
const seedPhases = (seed) => { const r = rng(Math.max(1, (seed | 0) % 2147483646) || 1); r(); return Array.from({ length: 7 }, () => r() * 6.283); };

// ---------------------------------------------------------------- arm pose library (body-local, character faces +Z, s = +1 left / -1 right)
// returns { H, pole, tip (finger direction), curl (0 straight finger .. 1.8 closed C), lift }
const v3 = (x, y, z) => new THREE.Vector3(x, y, z);
const TAU = Math.PI * 2;
function poseTarget(a, s, X) {
  const pose = a.pose || (X.target ? "point" : "rest"), ph = TAU * (a.phase || 0), T = X.target, S = X.S;
  const inward = (H, up = 0.45) => v3(-H.x, 0, Math.max(0.05, 0.25 - H.z)).normalize().multiplyScalar(0.6).add(v3(0, up, 0)).normalize();
  const reachPole = (Tl) => {                                   // smooth near-side -> crossing pole (no flip at the midline)
    const w = sstep(0.03, -0.10, Tl.x * s);
    return v3(s * 0.75, S.y - 0.32, 0.08).lerp(v3(s * 0.12, S.y - 0.28, 0.7), w);
  };
  switch (pose) {
    case "hip": { const H = v3(s * 0.215, 0.80, 0.075); return { H, pole: v3(s * 0.9, 1.0, 0.05), tip: inward(H), curl: 1 }; }
    case "wave": { const H = v3(s * (0.40 + 0.05 * Math.sin(ph)), 1.52, 0.12); return { H, pole: v3(s * 0.8, 0.9, 0.1), tip: v3(-s * 0.35, 1, 0.25).normalize(), curl: 0.6 }; }
    case "thumbChest": return { H: v3(s * 0.06, 1.06, 0.21), pole: v3(s * 0.6, 0.85, 0.35), tip: v3(-s * 0.8, 0.35, -0.45).normalize(), curl: 0 };
    case "shrug": return { H: v3(s * 0.42, 0.98, 0.16), pole: v3(s * 0.6, 0.6, 0.0), tip: v3(-s * 0.35, 1, 0.25).normalize(), curl: 0.6, lift: 0.035 };
    case "fold": { const H = v3(-s * 0.11, 0.99, 0.20 + 0.02 * s); return { H, pole: v3(s * 0.45, 0.85, 0.5), tip: v3(-s * 0.5, 0.75, 0.42).normalize(), curl: 1 }; }
    case "fingerUp": return { H: v3(s * 0.36, 1.50, 0.16), pole: v3(s * 0.7, 0.95, 0.0), tip: v3(0, 1, 0), curl: 0 };
    case "present": return { H: v3(s * 0.27, 1.10, 0.27), pole: v3(s * 0.8, 0.8, 0.1), tip: v3(-s * 0.35, 1, 0.25).normalize(), curl: 0.6 };
    case "point": {
      if (!T) return poseTarget({ pose: "fingerUp" }, s, X);
      const dir = T.clone().sub(S); const dist = dir.length(); dir.normalize();
      return { H: S.clone().addScaledVector(dir, Math.min(0.49, Math.max(0.2, dist - HOOK))), pole: reachPole(T), tip: dir, curl: 0 };
    }
    case "poke": case "push": case "pokeChest": {           // finger tip touches the target; phase = jab (0 = touching)
      if (!T) return poseTarget({ pose: "point" }, s, X);
      const dir = T.clone().sub(S).normalize(); const back = 0.05 * (0.5 - 0.5 * Math.cos(ph));
      return { H: T.clone().addScaledVector(dir, -(HOOK + back)), pole: reachPole(T), tip: dir, curl: 0 };
    }
    case "grab": case "climb": {
      const H = T ? T.clone() : v3(s * 0.22, 0.90, 0.36);
      return { H, pole: reachPole(H), tip: inward(H, 0.2), curl: 1.4 };
    }
    case "hold": {                                             // hand closed on a prop (default: carried at the side, in front)
      const H = T ? T.clone() : v3(s * 0.25, 0.86, 0.17);
      return { H, pole: T ? reachPole(H) : v3(s * 0.8, 0.95, -0.15), tip: v3(-s * 0.35, 0.25, 0.9).normalize(), curl: 1.7 };
    }
    case "crank": {                                            // hand circles on a crank handle: target = hub, a.r radius, a.axis
      const C = T ? T.clone() : v3(s * 0.12, 1.0, 0.42); const r = a.r ?? 0.08;
      const ax = X.axis ? X.axis.clone().normalize() : v3(0, 0, 1);
      const u = v3(0, 1, 0).cross(ax); if (u.lengthSq() < 1e-6) u.set(1, 0, 0); u.normalize(); const w = ax.clone().cross(u).normalize();
      const H = C.addScaledVector(u, r * Math.cos(ph)).addScaledVector(w, r * Math.sin(ph));
      return { H, pole: reachPole(H), tip: v3(-s * 0.3, 0.75, 0.6).normalize(), curl: 1.7 };
    }
    case "polish": {                                           // rag hand rubbing small circles on a surface point; a.normal (world) optional
      const C = T ? T.clone() : v3(s * 0.15, 1.0, 0.40);
      const nrm = X.normal ? X.normal.clone().normalize() : v3(S.x - C.x, 0, S.z - C.z).normalize();
      const u = v3(0, 1, 0).cross(nrm); if (u.lengthSq() < 1e-6) u.set(1, 0, 0); u.normalize(); const w = nrm.clone().cross(u).normalize();
      const r = a.r ?? 0.05; const H = C.addScaledVector(nrm, 0.03).addScaledVector(u, r * Math.cos(ph)).addScaledVector(w, r * 0.7 * Math.sin(ph));
      return { H, pole: reachPole(H), tip: nrm.clone().negate().add(v3(0, 0.6, 0)).normalize(), curl: 0.9 };
    }
    case "pour": {                                             // hand holding a jug out front; a.amount 0 (upright) .. 1 (pouring)
      const k = Math.max(0, Math.min(1, a.amount ?? 0));
      const H = T ? T.clone() : v3(s * 0.24, 1.12 - 0.04 * k, 0.31);
      const tip = v3(-s * 0.25, 0.95, 0.2).normalize().lerp(v3(-s * 0.15, -0.35, 0.92).normalize(), k).normalize();
      return { H, pole: T ? reachPole(H) : v3(s * 0.85, 0.75, -0.05), tip, curl: 1.4 };
    }
    case "slapKnee": {                                         // laugh: hand pats the thigh front (use with lean ~0.2); phase = pat
      const up = 0.5 + 0.5 * Math.cos(ph);
      return { H: v3(s * 0.10, 0.60 + 0.15 * up, 0.13 + 0.03 * up), pole: v3(s * 0.75, 0.95, 0.15), tip: v3(-s * 0.2, -0.55, 0.8).normalize(), curl: 0.5 };
    }
    case "fistsUp": case "mimic": {                            // both fists raised (yelling at gulls); phase = shake
      const sh = (pose === "mimic" ? 0.04 : 0.025) * Math.sin(ph + (s > 0 ? 0 : 1.3));
      return { H: v3(s * 0.45, 1.50 + sh, 0.17), pole: v3(s * 0.95, 0.85, -0.05), tip: v3(-s * 0.15, 1, 0.25).normalize(), curl: 1.8 };
    }
    case "handshake": {                                        // hand out to a target (or forward); phase = pump
      const H = T ? T.clone() : v3(s * 0.17, 0.98, 0.43); H.y += 0.03 * Math.sin(ph);
      return { H, pole: T ? reachPole(H) : v3(s * 0.75, 0.85, -0.1), tip: v3(-s * 0.6, 0.15, 0.8).normalize(), curl: 0.9 };
    }
    case "tapHead": {                                          // finger tapping own temple; phase = tap
      const tap = 0.014 * (0.5 + 0.5 * Math.cos(ph)); const hc = X.hc;
      const H = v3(hc.x + s * (R + 0.05 + tap), hc.y + 0.05, hc.z + 0.02);
      return { H, pole: v3(s * 0.8, 0.95, 0.1), tip: v3(-s, 0.05, 0.05).normalize(), curl: 0 };
    }
    case "limp": {                                             // asleep / slumped: hands dropped beside the hips (on the floor when sitting)
      return { H: v3(s * 0.30, Math.max(X.floorB + 0.045, 0.62), 0.12), pole: v3(s * 0.7, 1.0, -0.1), tip: v3(s * 0.2, -0.3, 0.9).normalize(), curl: 0.6 };
    }
    // ---------------- 2026-11-19 (video 2) poses. All pure functions of (a, s, X); hands stay in front of / beside the body.
    case "squeezeOverHead": {                                  // fist raised beside the top of the head, squeezing (phase = squeeze pulse)
      const p = 0.5 - 0.5 * Math.cos(ph); const hc = X.hc;
      const H = v3(hc.x + s * 0.27, Math.max(1.62, hc.y + 0.19) - 0.012 * p, hc.z + 0.02 + 0.01 * p);
      return { H, pole: v3(s * 0.95, 1.35, -0.15), tip: v3(-s * 0.65, 0.55, 0.25).normalize(), curl: 1.25 + 0.5 * p, lift: 0.06, hookHead: true };
    }
    case "writeWithLemon": {                                   // hand writing on a table point (target = surface point), small loops (phase)
      const C = T ? T.clone() : v3(s * 0.12, 0.80, 0.42);
      const H = C.add(v3(0.045 * Math.sin(ph), 0.055 + 0.01 * Math.max(0, Math.sin(2 * ph)), 0.015 * Math.sin(2 * ph)));
      return { H, pole: reachPole(H), tip: v3(-s * 0.25, -0.75, 0.55).normalize(), curl: 1.45 };
    }
    case "holdUp": {                                           // both hands hold a sheet up (a.height body-local y, a.spread half width)
      const H = v3(s * (a.spread ?? 0.17), a.height ?? 1.22, a.dist ?? 0.40);
      return { H, pole: v3(s * 0.85, 0.85, -0.1), tip: v3(-s * 0.25, 0.92, 0.12).normalize(), curl: 1.0 };
    }
    case "pointSelf": {                                        // index pointing at own face (a.at = "face") or chest ("chest")
      if (a.at === "chest") return { H: v3(s * 0.10, 1.00, 0.27), pole: v3(s * 0.7, 0.85, 0.1), tip: v3(-s * 0.35, 0.15, -0.92).normalize(), curl: 0 };
      const hc = X.hc; const H = v3(hc.x + s * 0.25, hc.y - 0.14, hc.z + 0.24);
      return { H, pole: v3(s * 0.8, 0.8, 0.05), tip: v3(hc.x - H.x, hc.y - 0.04 - H.y, hc.z - H.z).normalize(), curl: 0, hookHead: true };
    }
    case "selfie": {                                           // arm out front-side at face height holding a camera turned to the face
      const H = v3(s * 0.43, a.height ?? 1.36, 0.27);           // out to the side so the hand + camera never cover the face
      return { H, pole: v3(s * 0.9, 0.8, -0.35), tip: v3(-s * 0.35, 0.85, -0.2).normalize(), curl: 1.55 };
    }
    case "shakePhoto": {                                       // photo held out, shaken side to side (phase = shakes)
      const H = v3(s * (0.28 + 0.05 * Math.sin(ph)), 1.10 + 0.015 * Math.sin(2 * ph), 0.30);
      return { H, pole: v3(s * 0.85, 0.8, -0.15), tip: v3(-s * 0.15, 0.95, 0.25).normalize(), curl: 1.5 };
    }
    case "thumbsUp": {                                         // fist forward at chest height, hook straight up (reads as the thumb)
      const H = v3(s * 0.21, 1.20, 0.36);
      return { H, pole: v3(s * 0.85, 0.75, -0.1), tip: v3(-s * 0.05, 1, 0.12).normalize(), curl: 0.1 };
    }
    case "sniff": {                                            // hand wafting the air toward the nose (phase = waft); pair with head hint
      const hc = X.hc; const w = Math.sin(ph);
      const H = v3(hc.x + s * (0.27 + 0.03 * w), hc.y - 0.16, hc.z + 0.24 + 0.03 * w);
      return { H, pole: v3(s * 0.8, 0.8, 0.0), tip: v3(-s * 0.7, 0.45 + 0.15 * w, 0.2).normalize(), curl: 0.7, hookHead: true };
    }
    case "carryBag": {                                         // forearm across the belly, bag held in the crook against the chest
      return { H: v3(s * 0.02, 0.95, 0.28), pole: v3(s * 0.9, 0.8, -0.2), tip: v3(-s * 0.7, 0.55, 0.3).normalize(), curl: 1.3 };
    }
    case "knock": {                                            // fist knocks on a target (door), one knock per phase unit (contact at integers)
      const C = T ? T.clone() : v3(s * 0.15, 1.15, 0.50); const dir = C.clone().sub(S).normalize();
      const back = 0.07 * Math.pow(Math.abs(Math.sin(Math.PI * (a.phase || 0))), 0.8);
      return { H: C.addScaledVector(dir, -(0.035 + back)), pole: reachPole(T || C), tip: dir.clone().add(v3(0, 0.6, 0)).normalize(), curl: 1.8 };
    }
    case "pressPlay": {                                        // finger tip onto a button (a.amount 0 = hovering 6 cm back .. 1 = pressed)
      const C = T ? T.clone() : v3(s * 0.12, 1.0, 0.45); const dir = C.clone().sub(S); dir.y -= 0.15; dir.normalize();
      const back = 0.06 * (1 - Math.max(0, Math.min(1, a.amount ?? 1)));
      return { H: C.addScaledVector(dir, -(HOOK + back)), pole: reachPole(C), tip: dir, curl: 0 };
    }
    case "facepalm": {                                         // palm/hook across the eyes (use with the head hint: nod forward)
      const hc = X.hc; const H = v3(hc.x + s * 0.07, hc.y + 0.01, hc.z + R + 0.05);
      return { H, pole: v3(s * 0.8, 0.9, 0.1), tip: v3(-s * 0.85, 0.45, -0.1).normalize(), curl: 0.6, lift: 0.04, hookHead: true };
    }
    case "readNewspaper": {                                    // both hands on the paper's side edges; a.amount 0 = up reading .. 1 = lowered
      const k = Math.max(0, Math.min(1, a.amount ?? 0));
      const H = v3(s * (a.spread ?? 0.26), 1.30 - 0.32 * k, (a.reach ?? 0.40) - 0.04 * k);   // reach: how far in front of the body (keep the paper clear of the face)
      return { H, pole: v3(s * 0.9, 0.8, -0.15), tip: v3(-s * 0.15, 0.95, 0.15).normalize(), curl: 0.9 };
    }
    case "chalkWrite": case "tapBoard": {                      // hand on a vertical board point (target, a.normal = board normal, world)
      const C = T ? T.clone() : v3(s * 0.15, 1.30, 0.45);
      const nrm = X.normal ? X.normal.clone().normalize() : v3(S.x - C.x, 0, S.z - C.z).normalize();
      const u = v3(0, 1, 0).cross(nrm); if (u.lengthSq() < 1e-6) u.set(1, 0, 0); u.normalize();
      if (pose === "tapBoard") {
        const back = 0.05 * Math.pow(Math.abs(Math.sin(Math.PI * (a.phase || 0))), 0.8);
        return { H: C.addScaledVector(nrm, HOOK * 0.8 + back), pole: reachPole(C), tip: nrm.clone().negate(), curl: 0 };
      }
      const H = C.addScaledVector(nrm, 0.05).addScaledVector(u, 0.04 * Math.sin(ph)).add(v3(0, 0.025 * Math.sin(2 * ph), 0));
      return { H, pole: reachPole(H), tip: nrm.clone().negate().add(v3(0, 0.5, 0)).normalize(), curl: 1.5 };
    }
    case "holdBook": {                                         // open book held in both hands at chest height (hands under the outer edges)
      const H = v3(s * (a.spread ?? 0.14), a.height ?? 1.06, 0.33);
      return { H, pole: v3(s * 0.85, 0.8, -0.15), tip: v3(-s * 0.55, 0.45, 0.4).normalize(), curl: 1.0 };
    }
    case "rest": default: { const H = v3(s * 0.265, 0.72, 0.06); return { H, pole: v3(s * 0.45, 0.95, -0.45), tip: inward(H), curl: 1 }; }
  }
}

// ---------------------------------------------------------------- hats (headG-local, R = head radius). Each returns { topCut, taper }
function buildHat(type, spec, seed, headG) {
  const add = (geo, mat, hull = 0.012, pos = null, rot = null) => {
    const m = new THREE.Mesh(geo, mat); m.castShadow = true; m.receiveShadow = true; if (pos) m.position.set(...pos); if (rot) m.rotation.set(...rot);
    headG.add(m); if (hull) addHull(m, hull); return m;
  };
  const fab = (kind, col, acc, sd, w = 1.9, h = 0.5, ppm = 900, bump = 2) => { const t = fabricTextures(kind, col, acc ?? col, sd, w, h, ppm);
    return new THREE.MeshStandardMaterial({ map: t.map, bumpMap: t.bumpMap, bumpScale: bump, roughness: 0.88 }); };
  const hc = toColor(spec.hatColor ?? "#c94430");
  switch (type) {
    case "beanie": {
      const knit = fab("knit", hc, hc, seed * 7 + 3, 1.9, 0.5, 900, 2.5);
      add(capGeometry(R * 1.04, R * 1.26, R * 1.01, R * 0.40, 0.12), knit);
      const cr = R * 1.06, ch = R * 0.26, bv = R * 0.09, prof = [];
      for (let i = 0; i <= 8; i++) { const a = -Math.PI / 2 + (i / 8) * (Math.PI / 2); prof.push(new THREE.Vector2(cr - bv + bv * Math.cos(a), -ch / 2 + bv + bv * Math.sin(a))); }
      for (let i = 0; i <= 8; i++) { const a = (i / 8) * (Math.PI / 2); prof.push(new THREE.Vector2(cr - bv + bv * Math.cos(a), ch / 2 - bv + bv * Math.sin(a))); }
      prof.push(new THREE.Vector2(cr * 0.84, ch / 2)); prof.unshift(new THREE.Vector2(cr * 0.84, -ch / 2));
      add(new THREE.LatheGeometry(prof, 72), fab("knit", hc.clone().multiplyScalar(0.82), hc, seed * 7 + 5, 2.0, 0.2, 900, 3), 0.012, [0, R * 0.47, 0], [0.12, 0, 0]);
      const pomCol = toColor(spec.pomColor ?? "#f2ece0");
      add(new THREE.SphereGeometry(R * 0.2, 24, 16), fab("fluff", pomCol, pomCol, seed + 9, 0.4, 0.2, 1200, 4), 0.010, [0, R * 1.30, -0.02]);
      return { topCut: 0.36 * R, taper: false };
    }
    case "captain": {                                           // navy peaked cap, white top, black peak, gold badge + cord
      const band = fab("plain", hc, hc, seed + 3, 2, 0.3, 900, 1);
      add(bandGeometry(R * 1.02, R * 0.36, R * 1.07, R * 0.66, R * 0.06), band);
      const topCol = toColor(spec.hatTop ?? "#f1eee6");
      const top = add(new THREE.CylinderGeometry(R * 1.16, R * 1.08, R * 0.16, 64, 1), fab("plain", topCol, topCol, seed + 4, 2, 0.4, 900, 1), 0.012, [0, R * 0.74, -R * 0.04], [-0.10, 0, 0]);
      top.scale.set(1, 1, 0.98);
      const peakMat = new THREE.MeshStandardMaterial({ color: toColor(spec.peakColor ?? "#14110f"), roughness: 0.3, metalness: 0.1 });
      const peak = add(new THREE.CylinderGeometry(R * 1.02, R * 1.02, R * 0.04, 40, 1, false, -Math.PI / 2, Math.PI), peakMat, 0.010, [0, R * 0.40, R * 0.10], [0.32, 0, 0]);
      peak.scale.set(0.96, 1, 1.15);
      const gold = new THREE.MeshStandardMaterial({ color: toColor(spec.badgeColor ?? "#e2b23c"), roughness: 0.3, metalness: 0.8 });
      add(new THREE.SphereGeometry(R * 0.11, 20, 12), gold, 0.006, [0, R * 0.53, R * 1.05]).scale.set(1.25, 0.95, 0.45);
      add(new THREE.TorusGeometry(R * 1.055, R * 0.022, 6, 72, Math.PI * 0.9), gold, 0, [0, R * 0.42, 0], [Math.PI / 2 + 0.06, 0, Math.PI * 0.05]);
      return { topCut: 0.40 * R, taper: false };
    }
    case "sailor": {                                            // white "dixie cup": dome + upturned brim
      const w = fab("plain", hc, hc, seed + 5, 2, 0.4, 900, 1);
      add(capGeometry(R * 1.0, R * 1.12, R * 0.98, R * 0.42, 0.05), w);
      add(bandGeometry(R * 1.02, R * 0.42, R * 1.17, R * 0.66, R * 0.07), w);
      return { topCut: 0.40 * R, taper: false };
    }
    case "beret": {                                             // navy flat sailor cap with band + red pompom
      const nv = fab("knit", hc, hc, seed + 6, 2, 0.4, 900, 1.5);
      add(bandGeometry(R * 1.02, R * 0.40, R * 1.04, R * 0.58, R * 0.07), fab("plain", toColor(spec.bandColor ?? "#141a2a"), null, seed + 7, 2, 0.3, 900, 1));
      add(new THREE.SphereGeometry(R * 1.28, 48, 16), nv, 0.012, [0, R * 0.72, -R * 0.06], [-0.12, 0, 0]).scale.set(1, 0.20, 1);
      const pc = toColor(spec.pomColor ?? "#d0312d");
      add(new THREE.SphereGeometry(R * 0.13, 20, 12), fab("fluff", pc, pc, seed + 8, 0.4, 0.2, 1200, 4), 0.008, [0, R * 1.0, -R * 0.08]);
      return { topCut: 0.40 * R, taper: false };
    }
    case "oilskin": {                                           // yellow sou'wester: dome + sloping brim, longer at the back
      const y = fab("oilskin", hc, hc, seed + 9, 2.4, 0.8, 700, 1.2); y.roughness = 0.45;
      add(capGeometry(R * 1.05, R * 1.22, R * 1.04, R * 0.48, 0.05), y);
      const brim = add(bandGeometry(R * 1.02, R * 0.54, R * 1.45, R * 0.40, R * 0.05), y, 0.012, [0, 0, -R * 0.16], [-0.22, 0, 0]);
      brim.scale.set(1, 1, 1.12);
      return { topCut: 0.40 * R, taper: false };
    }
    case "toque": {                                             // baker's tall white hat: band + puff
      const w = fab("plain", hc, hc, seed + 10, 2, 0.6, 900, 1.2);
      add(bandGeometry(R * 1.0, R * 0.48, R * 1.05, R * 0.80, R * 0.07), w);
      const puff = add(new THREE.SphereGeometry(R * 1.0, 40, 24), w, 0.012, [0, R * 1.24, -R * 0.04]); puff.scale.set(1, 0.78, 0.94);
      return { topCut: 0.38 * R, taper: false };
    }
    case "bonnet": {                                            // lady's bonnet: crown behind, brim framing the face, flowers on the side
      const p = fab("tweed", hc, hc.clone().multiplyScalar(0.7), seed + 11, 2, 0.6, 900, 1.5);
      add(capGeometry(R * 1.06, R * 1.12, R * 1.06, R * 0.36, 0.9), p);
      add(new THREE.TorusGeometry(R * 1.04, R * 0.13, 12, 60, Math.PI * 1.04), p, 0.012, [0, R * 0.10, R * 0.10], [-0.28, 0, -Math.PI * 0.02]).scale.set(1.0, 1.0, 1.6);
      const fl = (spec.flowerColors || ["#f2a2c0", "#ffe27a", "#ffffff", "#f07a8a"]).map((c) => new THREE.MeshStandardMaterial({ color: toColor(c), roughness: 0.6 }));
      const leaf = new THREE.MeshStandardMaterial({ color: toColor("#5f9a3c"), roughness: 0.6 });
      const spots = [[0.86, 0.62, 0.38], [0.98, 0.42, 0.30], [0.70, 0.80, 0.30], [0.95, 0.66, 0.12]];
      spots.forEach((q, i) => add(new THREE.SphereGeometry(R * 0.10, 16, 10), fl[i % fl.length], 0.006, [R * q[0], R * q[1], R * q[2]]));
      add(new THREE.SphereGeometry(R * 0.08, 12, 8), leaf, 0.005, [R * 1.04, R * 0.55, R * 0.10]).scale.set(1.5, 0.6, 1);
      return { topCut: 0.30 * R, taper: false };
    }
    case "cap": {                                               // kid's red peaked cap
      const c = fab("plain", hc, hc, seed + 12, 2, 0.4, 900, 1.2);
      add(capGeometry(R * 1.04, R * 1.12, R * 1.02, R * 0.38, 0.02), c);
      const peak = add(new THREE.CylinderGeometry(R * 1.0, R * 1.0, R * 0.045, 40, 1, false, -Math.PI / 2, Math.PI),
        new THREE.MeshStandardMaterial({ color: hc.clone().multiplyScalar(0.8), roughness: 0.7 }), 0.010, [0, R * 0.44, R * 0.20], [0.22, 0, 0]);
      peak.scale.set(0.92, 1, 1.0);
      add(new THREE.SphereGeometry(R * 0.07, 12, 8), new THREE.MeshStandardMaterial({ color: hc.clone().multiplyScalar(0.8), roughness: 0.7 }), 0.005, [0, R * 1.13, 0]);
      return { topCut: 0.38 * R, taper: false };
    }
    case "backcap": {                                           // baseball cap worn BACKWARDS (2026-11-19b): crown, small strap opening
      const c = fab("plain", hc, hc, seed + 13, 2, 0.4, 900, 1.2);   // low over the brow, long peak hanging down over the neck
      add(capGeometry(R * 1.04, R * 1.10, R * 1.03, R * 0.40, -0.06), c);
      const dark = new THREE.MeshStandardMaterial({ color: hc.clone().multiplyScalar(0.72), roughness: 0.7 });
      const peak = add(new THREE.CylinderGeometry(R * 1.0, R * 1.0, R * 0.05, 40, 1, false, Math.PI / 2, Math.PI), dark, 0.010, [0, R * 0.50, -R * 0.30], [-0.55, 0, 0]);
      peak.scale.set(1.04, 1, 1.25);
      add(new THREE.SphereGeometry(R * 0.07, 12, 8), dark, 0.005, [0, R * 1.11, 0]);
      // strap opening: small dark half-moon just above the cap edge + the thin strap across its bottom
      const hole = add(new THREE.CylinderGeometry(R * 0.13, R * 0.13, R * 0.02, 24, 1, false, -Math.PI / 2, Math.PI),
        new THREE.MeshStandardMaterial({ color: toColor(spec.openingColor ?? "#2e2119"), roughness: 0.9 }), 0.004, [0, R * 0.42, R * 0.94], [-Math.PI / 2, 0, 0]);
      hole.scale.set(1, 1, 1);
      add(new THREE.BoxGeometry(R * 0.34, R * 0.045, R * 0.03), dark, 0.004, [0, R * 0.435, R * 0.955], [-0.42, 0, 0]);
      return { topCut: 0.40 * R, taper: false };
    }
    case "police": {                                            // police peaked cap: navy crown, black band + peak, silver shield badge
      const crown = fab("plain", hc, hc, seed + 14, 2, 0.4, 900, 1);
      add(bandGeometry(R * 1.02, R * 0.36, R * 1.07, R * 0.64, R * 0.06), fab("plain", toColor(spec.bandColor ?? "#121418"), null, seed + 15, 2, 0.3, 900, 1));
      const top = add(new THREE.CylinderGeometry(R * 1.18, R * 1.08, R * 0.20, 64, 1), crown, 0.012, [0, R * 0.76, -R * 0.03], [-0.12, 0, 0]);
      top.scale.set(1, 1, 0.98);
      const peakMat = new THREE.MeshStandardMaterial({ color: toColor(spec.peakColor ?? "#1a1512"), roughness: 0.55, metalness: 0 });
      const peak = add(new THREE.CylinderGeometry(R * 1.02, R * 1.02, R * 0.04, 40, 1, false, -Math.PI / 2, Math.PI), peakMat, 0.010, [0, R * 0.40, R * 0.10], [0.32, 0, 0]);
      peak.scale.set(0.96, 1, 1.15);
      const metal = new THREE.MeshStandardMaterial({ color: toColor(spec.badgeColor ?? "#cfd4dc"), roughness: 0.5, metalness: 0.4 });
      const sh = new THREE.Shape(); const B = R * 0.16;                                     // shield
      sh.moveTo(0, B); sh.quadraticCurveTo(B * 0.5, B * 1.05, B * 0.85, B * 0.8); sh.lineTo(B * 0.8, 0); sh.quadraticCurveTo(B * 0.6, -B * 0.75, 0, -B * 1.1);
      sh.quadraticCurveTo(-B * 0.6, -B * 0.75, -B * 0.8, 0); sh.lineTo(-B * 0.85, B * 0.8); sh.quadraticCurveTo(-B * 0.5, B * 1.05, 0, B);
      const bg = new THREE.ExtrudeGeometry(sh, { depth: R * 0.03, bevelEnabled: true, bevelThickness: R * 0.012, bevelSize: R * 0.012, bevelSegments: 2, curveSegments: 8 });
      add(bg, metal, 0.005, [0, R * 0.60, R * 1.02], [-0.18, 0, 0]);
      add(new THREE.TorusGeometry(R * 1.055, R * 0.020, 6, 72, Math.PI * 0.9), metal, 0, [0, R * 0.42, 0], [Math.PI / 2 + 0.06, 0, Math.PI * 0.05]);
      return { topCut: 0.40 * R, taper: false };
    }
    default: return null;
  }
}

// ---------------------------------------------------------------- character
export async function createCharacter(spec = {}) {
  const id = spec.id || spec.faceSet || "char", faceSet = spec.faceSet || "keeper", seed = spec.seed ?? 7;
  const SC = spec.scale ?? 1, faceSigma = spec.faceSmooth ?? 4;
  const coat = spec.coat || {}; const coatCol = toColor(coat.color, "#c8a040"), accent = toColor(coat.accent ?? coat.color, "#6a4020");
  const hatType = spec.hat || null, hair = spec.hair || null;

  const root = new THREE.Group(); root.name = id;
  const rig = new THREE.Group(); rig.scale.setScalar(SC); root.add(rig);                // everything scales with spec.scale (kid 0.75)
  const hip = new THREE.Group(); hip.position.y = HIP; hip.rotation.order = "YXZ"; rig.add(hip);
  const body = new THREE.Group(); body.position.y = -HIP; hip.add(body);                // body-local coords: y = height above floor
  const neck = new THREE.Group(); neck.position.y = TOP; neck.rotation.order = "YXZ"; body.add(neck);
  const headG = new THREE.Group(); neck.add(headG);
  const HEAD_BASE = new THREE.Vector3(0, HEAD_Y - TOP, 0);
  const inkMat = new THREE.MeshStandardMaterial({ color: INK_LIN.clone().multiplyScalar(0.5), roughness: 0.7, metalness: 0 });

  // --- torso + fabric (+ optional shirt panel and apron painted into the coat texture)
  const T = torsoGeometry();
  const panel = coat.shirtPanel ? toColor(coat.shirtPanel) : null, apron = coat.apron ? toColor(coat.apron) : null;
  const frontShape = (g, Wm, Hm, widthAt) => {
    const Lp = [], Rp = [];
    for (let j = 0; j <= 64; j++) {
      const t = T.ts[j], gg = gT(t), y = (T.arc[j] / T.Lv) * Hm, w = widthAt(t); if (w === null || Math.abs(t) > 0.985) continue;
      const half = Math.asin(Math.min(1, w / (TW * gg))) / (Math.PI * 2) * Wm, c = 0.25 * Wm; Lp.push([c - half, y]); Rp.push([c + half, y]);
    }
    g.beginPath(); Lp.forEach((p, i) => (i ? g.lineTo(...p) : g.moveTo(...p))); for (let i = Rp.length - 1; i >= 0; i--) g.lineTo(...Rp[i]); g.closePath();
    return [Lp, Rp];
  };
  const stripes = coat.sideStripes ? toColor(coat.sideStripes) : null, hem = coat.hem ? toColor(coat.hem) : null;
  const overlay = (panel || apron || stripes || hem) ? (g, Wm, Hm, mode) => {
    if (hem) {                                              // ribbed hem band at the bottom of the torso (same v convention as the apron)
      const cc = hem.clone().convertLinearToSRGB(), dk = hem.clone().multiplyScalar(0.72).convertLinearToSRGB(), H0 = 0.055;
      for (const y0 of [0, Hm - H0]) {                       // both ends: hem band + ribbed collar band (the texture's v runs bottom->top)
        g.fillStyle = mode === "col" ? `rgb(${cc.r * 255 | 0},${cc.g * 255 | 0},${cc.b * 255 | 0})` : "#9a9a9a"; g.fillRect(0, y0, Wm, H0);
        g.fillStyle = mode === "col" ? `rgb(${dk.r * 255 | 0},${dk.g * 255 | 0},${dk.b * 255 | 0})` : "#3a3a3a";
        for (let x = 0; x < Wm; x += 0.009) g.fillRect(x, y0, 0.003, H0);
        g.fillRect(0, y0 === 0 ? H0 - 0.003 : y0, Wm, 0.003);
      }
    }
    if (stripes) {                                          // tracksuit: two stripes down each side seam (u = 0 and 0.5 = the sides)
      const cc = stripes.clone().convertLinearToSRGB();
      g.fillStyle = mode === "col" ? `rgb(${cc.r * 255 | 0},${cc.g * 255 | 0},${cc.b * 255 | 0})` : "#a8a8a8";
      for (const c0 of [0, 0.5 * Wm, Wm]) for (const o of [-0.016, 0.004]) g.fillRect(c0 + o, 0, 0.012, Hm);
    }
    if (panel) {
      g.save(); frontShape(g, Wm, Hm, (t) => 0.06 + 0.03 * Math.max(0, t)); g.clip();
      const S = 0.013, c1 = panel, c2 = panel.clone().multiplyScalar(coat.panelPlain ? 0.94 : 0.72);
      for (let y = 0, j = 0; y < Hm; y += S, j++) for (let x = 0.25 * Wm - 0.12, i = 0; x < 0.25 * Wm + 0.12; x += S, i++) {
        const on = (i + j) % 2 === 0; const cc = (on ? c1 : c2).clone().convertLinearToSRGB();
        g.fillStyle = mode === "col" ? `rgb(${cc.r * 255 | 0},${cc.g * 255 | 0},${cc.b * 255 | 0})` : (on ? "#8a8a8a" : "#707070"); g.fillRect(x, y, S, S);
      }
      g.restore();
      g.save(); const [Lp, Rp] = frontShape(g, Wm, Hm, (t) => 0.06 + 0.03 * Math.max(0, t)); g.beginPath();
      g.lineWidth = 0.004; g.strokeStyle = mode === "col" ? "rgba(30,18,10,0.55)" : "#202020";
      for (const P of [Lp, Rp]) { g.beginPath(); P.forEach((p, i) => (i ? g.lineTo(...p) : g.moveTo(...p))); g.stroke(); } g.restore();
    }
    if (apron) {
      const cc = apron.clone().convertLinearToSRGB();
      g.save(); frontShape(g, Wm, Hm, (t) => (t < 0.05 ? 0.16 * (1 - 0.15 * Math.max(0, t + 0.6)) : t < 0.62 ? 0.085 : null));
      g.fillStyle = mode === "col" ? `rgb(${cc.r * 255 | 0},${cc.g * 255 | 0},${cc.b * 255 | 0})` : "#9a9a9a"; g.fill();
      g.lineWidth = 0.004; g.strokeStyle = mode === "col" ? "rgba(30,18,10,0.45)" : "#303030"; g.stroke(); g.restore();
    }
  } : null;
  const ctype = coat.type || "plain";
  const tex = fabricTextures(["knit", "check", "tweed", "stripes", "plain", "jersey"].includes(ctype) ? ctype : "plain",
    coatCol, ctype === "stripes" ? accent : accent.clone().lerp(coatCol, ctype === "check" ? 0.25 : 0.5), seed * 13 + 1, T.per, T.Lv, 1700, overlay);
  const coatMat = new THREE.MeshStandardMaterial({ map: tex.map, bumpMap: tex.bumpMap, bumpScale: ctype === "knit" ? 1.3 : 1.2, roughness: 0.88, metalness: 0 });
  const torso = new THREE.Mesh(T.geo, coatMat); torso.castShadow = true; torso.receiveShadow = true; body.add(torso); addHull(torso, 0.012);

  const accMat = new THREE.MeshStandardMaterial({ color: accent, roughness: coat.accentRough ?? 0.8 });
  if (coat.placket !== false) { const placket = new THREE.Mesh(surfaceBox(0, TZ - 0.01, 0.032, 0.46, 0.014), accMat); placket.castShadow = true; body.add(placket); addHull(placket, 0.004); }
  if (coat.zip) {                                          // dark zip line along the placket (tracksuit)
    const zm = new THREE.MeshStandardMaterial({ color: toColor(coat.zip), roughness: 0.6 });
    const z = new THREE.Mesh(surfaceBox(0, TZ - 0.01, 0.007, 0.45, 0.003, 0.002 + 0.014), zm); body.add(z);
    const pull = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.026, 0.006), zm); const py = TOP - 0.13; pull.position.set(0, py, frontZ(0, py) + 0.022); body.add(pull);
  }
  if (coat.buttons !== null) {
    const metal = !!coat.buttonMetal;
    const brass = coat.buttonMetal === "matte";              // 2026-11-19b: matte brass (no glints that read as lights)
    const btnMat = new THREE.MeshStandardMaterial({ color: toColor(coat.buttons ?? "#2a1a10"), roughness: brass ? 0.62 : metal ? 0.3 : 0.45, metalness: brass ? 0.35 : metal ? 0.8 : 0 });
    const btnGeo = new THREE.SphereGeometry(1, 14, 10);
    const xs = coat.double ? [-0.055, 0.055] : [0];
    for (const bx of xs) for (let k = 0; k < 3; k++) {
      const y = TZ + 0.15 - k * 0.13, b = new THREE.Mesh(btnGeo, btnMat); b.scale.set(0.017, 0.022, 0.010);
      b.position.set(bx, y, frontZ(bx, y) + (coat.placket !== false && bx === 0 ? 0.020 : 0.008)); body.add(b);
    }
  }
  if (coat.pockets !== false) for (const s of [-1, 1]) {
    const pk = new THREE.Mesh(surfaceBox(s * 0.105, TZ - 0.10, 0.085, 0.04, 0.012), accMat); pk.castShadow = true; body.add(pk); addHull(pk, 0.004);
  }
  // 2026-11-19 (video 2): tie, bow tie, chest badge, zip (all 3D, on the torso front, never in front of the chin)
  if (coat.tie) {                                          // long tie: knot just under the chin + blade following the coat front
    const tm = new THREE.MeshStandardMaterial({ color: toColor(coat.tie), roughness: 0.55 });
    const y0 = TOP - 0.115, y1 = TZ - 0.13, pts = [];
    for (let i = 0; i <= 12; i++) { const t = i / 12, y = y0 + (y1 - y0) * t, w = 0.016 + 0.020 * Math.min(1, t * 1.6); pts.push([w, y]); }
    const sh = new THREE.Shape(); sh.moveTo(-pts[0][0], pts[0][1]); for (const [w, y] of pts) sh.lineTo(-w, y); sh.lineTo(0, y1 - 0.035); for (let i = pts.length - 1; i >= 0; i--) sh.lineTo(pts[i][0], pts[i][1]); sh.closePath();
    const g = new THREE.ExtrudeGeometry(sh, { depth: 0.008, bevelEnabled: false, curveSegments: 4 }); const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i); p.setZ(i, frontZ(x, y) + 0.004 + p.getZ(i)); }
    g.computeVertexNormals(); const tie = new THREE.Mesh(g, tm); tie.castShadow = true; body.add(tie); addHull(tie, 0.004);
    const knot = new THREE.Mesh(new THREE.SphereGeometry(0.024, 16, 10), tm); knot.scale.set(1.1, 1.0, 0.6); knot.position.set(0, y0 + 0.012, frontZ(0, y0 + 0.012) + 0.010);
    knot.castShadow = true; body.add(knot); addHull(knot, 0.004);
  }
  if (coat.bowtie) {                                       // bow tie: two wings + knot, just under the chin line
    const bm = new THREE.MeshStandardMaterial({ color: toColor(coat.bowtie), roughness: 0.55 }); const y = TOP - 0.115, z = frontZ(0, y) + 0.012;
    for (const s of [-1, 1]) { const w = new THREE.Mesh(new THREE.ConeGeometry(0.030, 0.055, 4, 1), bm); w.rotation.set(0, Math.PI / 4, s * Math.PI / 2); w.scale.set(1, 1, 0.45);
      w.position.set(s * 0.030, y, z); w.castShadow = true; body.add(w); addHull(w, 0.004); }
    const k = new THREE.Mesh(new THREE.SphereGeometry(0.014, 12, 8), bm); k.position.set(0, y, z + 0.004); k.scale.set(1, 1, 0.7); body.add(k); addHull(k, 0.003);
  }
  if (coat.badge) {                                        // metal shield badge on the left chest
    const mm = new THREE.MeshStandardMaterial({ color: toColor(coat.badge), roughness: 0.5, metalness: 0.4 }); const B = 0.026;
    const sh = new THREE.Shape(); sh.moveTo(0, B); sh.quadraticCurveTo(B * 0.5, B * 1.05, B * 0.85, B * 0.8); sh.lineTo(B * 0.8, 0); sh.quadraticCurveTo(B * 0.6, -B * 0.75, 0, -B * 1.1);
    sh.quadraticCurveTo(-B * 0.6, -B * 0.75, -B * 0.8, 0); sh.lineTo(-B * 0.85, B * 0.8); sh.quadraticCurveTo(-B * 0.5, B * 1.05, 0, B);
    const bx = 0.105, by = TZ + 0.13; const bd = new THREE.Mesh(new THREE.ExtrudeGeometry(sh, { depth: 0.004, bevelEnabled: true, bevelThickness: 0.002, bevelSize: 0.002, bevelSegments: 2, curveSegments: 8 }), mm);
    bd.position.set(bx, by, frontZ(bx, by) + 0.004); bd.rotation.y = Math.atan2(bx / (TW * TW), frontZ(bx, by) / (TD * TD)) * 0.9; bd.castShadow = true; body.add(bd); addHull(bd, 0.003);
  }
  if (coat.collar) {                                       // sailor collar flap (square, on the back/shoulders, readable from the side)
    const cm = new THREE.MeshStandardMaterial({ color: toColor(coat.collar), roughness: 0.8 });
    const flap = new THREE.Mesh(new THREE.BoxGeometry(0.30, 0.13, 0.012), cm); flap.position.set(0, TOP - 0.10, -frontZ(0, TOP - 0.10) - 0.006); flap.rotation.x = 0.35;
    flap.castShadow = true; body.add(flap); addHull(flap, 0.004);
  }

  // --- head (flat face drawing projected from the camera)
  const headMat = faceMat();
  const head = new THREE.Mesh(new THREE.SphereGeometry(R, 64, 48), headMat); head.scale.set(1, 0.99, 0.96); head.castShadow = true;
  headG.add(head); addHull(head, 0.006);
  let topCut = null, taper = false, hairMat = null, hairRough = 0.75;
  const nHead = headG.children.length;
  const hatInfo = hatType ? buildHat(hatType === "bowler" ? "beanie" : hatType, spec, seed, headG) : null;
  if (hatInfo) { topCut = hatInfo.topCut; taper = hatInfo.taper; }
  else if (hair) {
    const hcol = toColor(hair.color ?? "#7a5232"); const ht = fabricTextures("strands", hcol, hcol, seed * 5 + 2, 1.9, 0.5, 900);
    const style = hair.style || "bowl";
    const hm = new THREE.MeshStandardMaterial({ map: ht.map, bumpMap: ht.bumpMap, bumpScale: 2, roughness: style === "slick" ? 0.58 : 0.75, metalness: 0 });
    hairMat = hm; hairRough = hm.roughness;
    const addH = (geo, pos = null, rot = null, scl = null) => { const h = new THREE.Mesh(geo, hm); h.castShadow = true; h.receiveShadow = true;
      if (pos) h.position.set(...pos); if (rot) h.rotation.set(...rot); if (scl) h.scale.set(...scl); headG.add(h); addHull(h, 0.012); return h; };
    if (style === "bowl") addH(capGeometry(R * 1.05, R * 1.04, R * 1.0, R * 0.30, 0.55));     // video 1 (engineer): unchanged
    else if (style === "short") addH(capGeometry(R * 1.035, R * 1.06, R * 1.02, R * 0.36, 0.48));   // short crop, hairline higher
    else if (style === "slick") {                                                          // slicked back, glossy, a low quiff at the front
      addH(capGeometry(R * 1.04, R * 1.10, R * 1.03, R * 0.34, 0.50));
      addH(new THREE.SphereGeometry(R * 0.42, 32, 16), [R * 0.10, R * 0.98, R * 0.30], [0.5, 0.2, 0], [1.25, 0.42, 0.9]);
    } else if (style === "bun") {                                                          // neat bun: smooth cap + round bun high at the back
      addH(capGeometry(R * 1.045, R * 1.07, R * 1.03, R * 0.30, 0.52));
      addH(new THREE.SphereGeometry(R * 0.36, 32, 20), [0, R * 1.02, -R * 0.62]);
    } else if (style === "professor") {                                                    // receding: thin top, puffy tufts over the ears
      addH(capGeometry(R * 1.03, R * 1.05, R * 1.02, R * 0.42, 0.62));
      for (const s of [-1, 1]) addH(new THREE.SphereGeometry(R * 0.30, 24, 16), [s * R * 0.86, R * 0.42, -R * 0.20], [0, 0, s * 0.4], [0.7, 1.0, 1.15]).userData.noDrop = true;
    } else if (style === "bob") {                                                          // chin-length bob: cap + side panels framing the face
      addH(capGeometry(R * 1.06, R * 1.07, R * 1.04, R * 0.28, 0.52));
      for (const s of [-1, 1]) addH(new THREE.SphereGeometry(R * 0.5, 24, 20), [s * R * 0.82, R * 0.12, -R * 0.32], [0, 0, 0], [0.40, 1.2, 0.70]).userData.noDrop = true;
    }
    topCut = 0.44 * R; taper = true;
  }
  // front hat / hair vertices (headG-local): each frame the face drawing drops just enough that brows + eyes stay below the lowest
  // visible front edge of the hat or hair, from eye level to high cameras and from any side (2026-11-17, coordinator: drawings
  // fully readable under every hat; hair fringe over the engineer's eye from a high 3/4 camera)
  const hatPts = [];
  for (const m of headG.children.slice(nHead)) {
    if (!m.geometry || m.userData.noDrop) continue; m.updateMatrix(); const P = m.geometry.attributes.position, v = new THREE.Vector3();
    const step = Math.max(1, Math.floor(P.count / 500));
    for (let i = 0; i < P.count; i += step) { v.fromBufferAttribute(P, i).applyMatrix4(m.matrix); if (v.z > (hatInfo ? 0.2 : -0.4) * R && v.y > -0.3 * R) hatPts.push(v.x, v.y, v.z); }
  }
  const hatArr = new Float32Array(hatPts), FRONT_X = (hatInfo ? 0.45 : 0.6) * R;

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
  const NA = 24, NH = 7;
  const arms = {}; for (const s of [1, -1]) {
    arms[s] = { tube: new InkTube(NA, LIMB_R, inkMat), hook: new InkTube(NH, HOOK_R, inkMat), H: new THREE.Vector3(), tip: new THREE.Vector3(), mid: new THREE.Vector3(),
      fx: new THREE.Vector3(1, 0, 0), fy: new THREE.Vector3(0, 1, 0),
      curve: new THREE.CatmullRomCurve3([new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()], false, "centripetal") };
    body.add(arms[s].tube.mesh, arms[s].hook.mesh);
  }
  const legs = {}; for (const s of [1, -1]) { legs[s] = { tube: new InkTube(26, LIMB_R, inkMat), curve: new THREE.CatmullRomCurve3([new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()], false, "centripetal") }; rig.add(legs[s].tube.mesh); }
  const jointGeo = new THREE.SphereGeometry(LIMB_R * 0.98, 10, 8), tipGeo = new THREE.SphereGeometry(HOOK_R * 0.98, 10, 8);
  const joint = (g = jointGeo) => { const m = new THREE.Mesh(g, inkMat); m.castShadow = true; return m; };
  const armJ = { 1: [joint(tipGeo), joint(tipGeo)], [-1]: [joint(tipGeo), joint(tipGeo)] }; for (const s of [1, -1]) body.add(...armJ[s]);
  const legJ = { 1: [joint(), joint()], [-1]: [joint(), joint()] }; for (const s of [1, -1]) rig.add(...legJ[s]);

  // --- face textures (shared cache; await ch.ready() before rendering a frame)
  const pending = new Set();
  function faceTex(name) { const e = faceTexture(name, faceSigma); if (!e.loaded) { pending.add(e.promise); e.promise.then(() => pending.delete(e.promise)); } return e.tex; }
  faceTex(faceName(faceSet, "neutral"));

  // scratch
  const hcW = new THREE.Vector3(), hcBody = new THREE.Vector3(), camW = new THREE.Vector3(), tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3();
  const X = new THREE.Vector3(), Y = new THREE.Vector3(), Z = new THREE.Vector3(), up = new THREE.Vector3(), rootInv = new THREE.Matrix4();
  const armPts = Array.from({ length: NA }, () => new THREE.Vector3()), hookPts = Array.from({ length: NH }, () => new THREE.Vector3()), legPts = Array.from({ length: 26 }, () => new THREE.Vector3());
  const bodyRotInv = new THREE.Matrix3();
  let lastFace = "", floorB = 0;

  const toBody = (w) => (w ? body.worldToLocal(w.clone()) : null);
  const dirToBody = (w) => (w ? w.clone().applyMatrix3(bodyRotInv).normalize() : null);
  /** one arm spec -> { H, E, tip, curl, lift } solved in body space (pure) */
  function solveOne(s, a) {
    a = a || {}; const S = SHOULDER(s);
    const Xc = { S, target: toBody(a.target), axis: dirToBody(a.axis), normal: dirToBody(a.normal), hc: hcBody, floorB };
    const P = poseTarget(a, s, Xc); const lift = P.lift || 0; S.y += lift;
    clampTorso(P.H, 0.035); clampHead(P.H, hcBody, 0.03);
    const E = new THREE.Vector3(), Hc = new THREE.Vector3(); ik(S, P.H, P.pole, E, Hc);
    return { S, H: Hc, E, tip: P.tip, curl: P.curl ?? 1, lift, hookHead: !!P.hookHead };
  }
  function solveArm(s, a) {
    const A = arms[s]; let q = solveOne(s, a);
    if (a && a.from && (a.mix ?? 1) < 1) {                     // blend two poses: hand, elbow, finger and curl (elbow drives the pole -> no flip)
      const p = solveOne(s, a.from), w = Math.max(0, Math.min(1, a.mix ?? 1));
      const S = p.S.clone().lerp(q.S, w), H = p.H.clone().lerp(q.H, w), Eb = p.E.clone().lerp(q.E, w);
      const E = new THREE.Vector3(), Hc = new THREE.Vector3(); ik(S, H, Eb, E, Hc);
      const tip = p.tip.clone().lerp(q.tip, w); if (tip.lengthSq() < 1e-6) tip.copy(q.tip); tip.normalize();
      q = { S, H: Hc, E, tip, curl: p.curl + (q.curl - p.curl) * w, hookHead: p.hookHead || q.hookHead };
    }
    const { S, E } = q; let Hc = q.H;
    clampTorso(E, 0.03); clampHead(E, hcBody, 0.03); clampTorso(Hc, 0.035); clampHead(Hc, hcBody, 0.03);
    A.curve.points[0].copy(S); A.curve.points[1].copy(E); A.curve.points[2].copy(Hc);
    for (let i = 0; i < NA; i++) {
      const u = i / (NA - 1); A.curve.getPoint(u, armPts[i]);
      if (u > 0.14) { clampTorso(armPts[i], 0.026 + 0.009 * sstep(0.6, 1, u)); clampHead(armPts[i], hcBody, 0.025); }   // never through the body
    }
    const Hn = armPts[NA - 1]; A.H.copy(Hn);
    // finger hook: from the hand along `tip`, curling back toward the wrist by `curl` (continuous in every parameter)
    const fa = tmp2.subVectors(Hn, armPts[NA - 4]).normalize();
    const td = q.tip.clone().normalize();
    const back = fa.clone().addScaledVector(td, -fa.dot(td)).negate();            // length = sin(angle): fades out smoothly when parallel
    const upb = v3(0, 1, 0).addScaledVector(td, -td.y);
    const c = q.curl;
    for (let i = 0; i < NH; i++) {
      const u = i / (NH - 1);
      hookPts[i].copy(Hn).addScaledVector(td, HOOK * u * (1 - 0.22 * c * u)).addScaledVector(back, HOOK * 0.42 * c * u * u).addScaledVector(upb, 0.006 * Math.min(1, c) * Math.sin(Math.PI * u));
      if (i > 0) { clampTorso(hookPts[i], 0.033); if (q.hookHead) clampHead(hookPts[i], hcBody, 0.022); }
    }
    A.tip.copy(hookPts[NH - 1]); A.mid.copy(hookPts[(NH - 1) >> 1]);
    // hand frame: x = finger direction, y = back toward the wrist (orthogonal), with a tiny up bias so it never degenerates
    A.fx.copy(td); A.fy.copy(back).addScaledVector(upb, 0.05); A.fy.addScaledVector(td, -A.fy.dot(td)); if (A.fy.lengthSq() < 1e-8) A.fy.set(0, 1, 0); A.fy.normalize();
    A.tube.set(armPts, NA); A.hook.set(hookPts, NH);
    armJ[s][0].position.copy(Hn); armJ[s][1].position.copy(A.tip);
  }

  function solveLegs(state) {
    const k = Math.max(0, Math.min(1, state.sit || 0)), seat = (state.seat ?? 0) / SC, chair = sstep(0.15, 0.35, seat);
    for (const s of [1, -1]) {
      const L = legs[s];
      const top = rig.worldToLocal(body.localToWorld(tmp.set(s * 0.07, HIP + 0.10, 0.0)));
      const stand = v3(s * 0.09, 0.017, 0), sitA = v3(s * 0.10, 0.017, 0.30).lerp(v3(s * 0.11, 0.035, 0.66), 1 - chair);
      const an = stand.clone().lerp(sitA, k);
      const toeDir = v3(0, 0, 1).lerp(v3(0, 1, 0.25), k * (1 - chair)).normalize();
      const lg = s === 1 ? state.legL : state.legR;
      if (lg && lg.target) {                                  // foot onto a target (climb a barrel / step up), lift 0..1
        const tl = rig.worldToLocal(lg.target.clone()); an.lerp(tl, Math.max(0, Math.min(1, lg.lift ?? 1)));
      }
      const pole = top.clone().add(v3(s * 0.08, 0.30, 0.8));                 // knee forward + up (never below the floor when sitting)
      const kn = new THREE.Vector3(), an2 = new THREE.Vector3(); ik(top, an, pole, kn, an2, LEG1, LEG2);
      if (an2.y < 0.017) an2.y = 0.017;
      L.curve.points[0].copy(top); L.curve.points[1].copy(kn); L.curve.points[2].copy(an2);
      const n = 21; for (let i = 0; i < n; i++) L.curve.getPoint(i / (n - 1), legPts[i]);
      const toe = an2.clone().addScaledVector(toeDir, 0.10).add(v3(s * 0.025, 0, 0));
      for (let i = 0; i < 5; i++) legPts[n + i].copy(an2).lerp(toe, (i + 1) / 5);
      L.tube.set(legPts, n + 5); legJ[s][0].position.copy(an2); legJ[s][1].position.copy(toe);
    }
  }

  const ch = {
    root, spec, R: R * SC,
    /** per-frame update: pure function of state + camera + light (no history) */
    update(state = {}, opts = {}) {
      const cam = opts.camera; const key = opts.keyLightPos;
      const k = Math.max(0, Math.min(1, state.sit || 0)), seat = (state.seat ?? 0) / SC;
      const hipY = HIP + (seat + 0.025 - HIP) * k;
      hip.position.set(0, hipY + (state.bob || 0) / SC, 0);
      hip.rotation.set(state.lean || 0, state.turn || 0, -(state.side || 0));
      const hh = headHint(state.armL, headHint(state.armR, { nod: 0, tilt: 0 }), 1);
      const nodT = (state.nod || 0) + hh.nod, tiltT = (state.tilt || 0) + hh.tilt;
      neck.rotation.set(nodT, 0, -tiltT);
      floorB = HIP - hipY - (state.bob || 0) / SC;
      headG.position.copy(HEAD_BASE); root.updateWorldMatrix(true, true);
      if (cam) {
        cam.updateMatrixWorld(); camW.setFromMatrixPosition(cam.matrixWorld);
        const c = neck.worldToLocal(tmp.copy(camW)).sub(HEAD_BASE); c.y = 0;
        if (c.lengthSq() < 1e-6) c.set(0, 0, 1); headG.position.addScaledVector(c.normalize(), HEAD_FWD);
      } else { headG.position.z += HEAD_FWD; camW.set(0, 1.4, 10).applyMatrix4(root.matrixWorld); }
      headG.updateMatrixWorld(true);
      hcW.setFromMatrixPosition(headG.matrixWorld); hcBody.copy(hcW); body.worldToLocal(hcBody);
      bodyRotInv.setFromMatrix4(body.matrixWorld).invert();
      const Rw = R * SC;

      // face basis: drawing faces the camera, rolls with the head
      up.set(0, 1, 0).transformDirection(neck.matrixWorld);
      Z.subVectors(camW, hcW).normalize(); Y.copy(up).addScaledVector(Z, -up.dot(Z)).normalize(); X.crossVectors(Y, Z);
      const u = headMat.uniforms; u.hc.value.copy(hcW); u.X.value.copy(X); u.Y.value.copy(Y); u.Z.value.copy(Z); u.R.value = Rw;
      { // BACK VIEW (user, 2026-11-23): when the camera is behind the body, the face drawing fades out and we see the back of the
        // head (hair cap + nape). Facing = body +Z in world, horizontal; fully back at ~115 deg, unchanged up to ~95 deg.
        const bf = tmp.set(0, 0, 1).transformDirection(body.matrixWorld); bf.y = 0; const cz = Z.clone(); cz.y = 0;
        const d = bf.lengthSq() > 1e-6 && cz.lengthSq() > 1e-6 ? bf.normalize().dot(cz.normalize()) : 1;
        const e = Math.max(0, Math.min(1, (d + 0.42) / 0.34)); u.faceA.value = state.backView === false ? 1 : e * e * (3 - 2 * e); }
      let drop = topCut !== null && !taper ? 0.10 * R : 0;
      if (hatArr.length) {                                       // lowest hat point in front of the face, in the drawing's 2D frame
        const e = headG.matrixWorld.elements; let yb = 1e9;
        for (let i = 0; i < hatArr.length; i += 3) {
          const lx = hatArr[i], ly = hatArr[i + 1], lz = hatArr[i + 2];
          const dx = e[0] * lx + e[4] * ly + e[8] * lz + e[12] - hcW.x, dy = e[1] * lx + e[5] * ly + e[9] * lz + e[13] - hcW.y, dz = e[2] * lx + e[6] * ly + e[10] * lz + e[14] - hcW.z;
          if (Math.abs(dx * X.x + dy * X.y + dz * X.z) > FRONT_X * SC || dx * Z.x + dy * Z.y + dz * Z.z < 0) continue;
          const y = dx * Y.x + dy * Y.y + dz * Y.z; if (y < yb) yb = y;
        }
        if (yb < 1e8) drop = Math.min(0.30 * R, Math.max(drop, 0.335 * R - yb / SC));   // brow top sits at +0.30 R in the drawing
      }
      u.drop.value = (drop + nodT * 0.10 * R * (hatArr.length ? 0 : 1)) * SC;
      // lemon-juice look (pure function of state + time): wet 0..1 = ink drips
      const wet = Math.max(0, Math.min(1, state.wet ?? spec.wet ?? 0)); u.wet.value = wet; u.time.value = opts.time ?? state.time ?? 0;
      if (hairMat) hairMat.roughness = hairRough + (0.5 - hairRough) * wet;           // slightly damp hair (no gloss)
      u.ls.value = key ? Math.max(-1, Math.min(1, tmp.subVectors(key, hcW).normalize().dot(X) * 2.5)) : 0.6;
      u.lit.value = opts.faceLit ?? 0; u.k.value = opts.faceGain ?? 0.95; u.GW.value = opts.faceGlow ?? 0.45; u.SHK.value = opts.faceShade ?? 0.6;
      // GAZE (user rule 2026-11-19): features stay centred, only the pupils move. `state.lookAt` (world Vector3: the person or
      // thing the character attends to) picks the pupils automatically: target to the screen-left of the head -> "_L",
      // screen-right -> "_R", roughly toward the camera -> "" (looking at the viewer only when that's the point of the beat).
      let gaze = state.gaze;
      if (gaze == null && state.lookAt) {
        const d = tmp.subVectors(state.lookAt, hcW); const L = d.length() || 1;
        const sx = d.dot(X) / L;                                  // X = screen-right axis of this frame's camera
        gaze = sx < -0.18 ? "_L" : sx > 0.18 ? "_R" : "";
      }
      const fname = faceName(faceSet, state.expression || "neutral", state.mouth || "", gaze || "");
      if (fname !== lastFace) { u.face.value = faceTex(fname); u.hasFace.value = 1; lastFace = fname; }

      // outline ring toward the camera (root-local positions)
      {
        const d = tmp.subVectors(camW, hcW), D = d.length(), nrm = d.divideScalar(D);
        const upr = tmp2.copy(up).addScaledVector(nrm, -up.dot(nrm)).normalize(), rt = new THREE.Vector3().crossVectors(upr, nrm);
        const off = 0.85 * Rw, kk = (D - off) / Math.sqrt(Math.max(1e-6, D * D - Rw * Rw)), rIn = Rw * kk * 0.995, wbase = 0.022 * SC * (D - off) / D;
        const cx = hcW.x + nrm.x * off, cy = hcW.y + nrm.y * off, cz = hcW.z + nrm.z * off;
        rootInv.copy(root.matrixWorld).invert(); const e = rootInv.elements;
        for (let i = 0; i <= NR; i++) {
          const a = 2 * Math.PI * i / NR, ca = Math.cos(a), sa = Math.sin(a);
          const dx = rt.x * ca + upr.x * sa, dy = rt.y * ca + upr.y * sa, dz = rt.z * ca + upr.z * sa;
          let ri = rIn * (1 - bite(a)); const ro = Math.max(rIn * 1.03, ri + wbase * wid(a));
          if (taper && topCut !== null) { const t_ = Math.max(0, Math.min(1, (topCut - sa * R) / (0.12 * R))); ri = ro - (ro - ri) * (0.35 + 0.65 * t_); }
          for (let kq = 0; kq < 2; kq++) {
            const r_ = kq ? ro : ri, px = cx + dx * r_, py = cy + dy * r_, pz = cz + dz * r_, o = (2 * i + kq) * 3;
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
      solveArm(1, aL); solveArm(-1, aR);
      solveLegs(state);
      root.updateMatrixWorld(true);
    },
    /** resolves when every face drawing requested so far is loaded (call after update(), before rendering) */
    ready() { return Promise.all([...pending]); },
    /** preload face drawings for a list of states (e.g. a whole timeline) */
    preload(states = []) { for (const s of states) faceTex(faceName(faceSet, s.expression || "neutral", s.mouth || "", s.gaze || "")); return ch.ready(); },
    headCenter() { return hcW.clone(); },
    /** world position of the hand: "grip" = where the arm line ends and the finger hook starts, "tip" = hook end, "mid" = middle of the hook */
    handWorld(side = "R", part = "grip") { const A = arms[side === "L" ? 1 : -1]; return body.localToWorld((part === "tip" ? A.tip : part === "mid" ? A.mid : A.H).clone()); },
    /** hand frame for props: position = middle of the drawn finger hook (put a handle here), grip/tip world points,
     *  quaternion: local +X = finger direction, +Y = back toward the wrist (the inside of the hook), +Z = X × Y. */
    handFrame(side = "R") {
      const A = arms[side === "L" ? 1 : -1];
      const m = new THREE.Matrix3().setFromMatrix4(body.matrixWorld);
      const x = A.fx.clone().applyMatrix3(m).normalize(), y = A.fy.clone().applyMatrix3(m); y.addScaledVector(x, -y.dot(x)).normalize();
      const z = new THREE.Vector3().crossVectors(x, y);
      const quaternion = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, y, z));
      return { position: body.localToWorld(A.mid.clone()), grip: body.localToWorld(A.H.clone()), tip: body.localToWorld(A.tip.clone()), quaternion, scale: SC };
    },
    /** frame between both hands for two-hand props (newspaper, book, sheet): position = midpoint of the two hook middles,
     *  quaternion: local +X = from the right hand to the left hand, +Y = body up (orthogonalised), +Z = X × Y (out of the chest).
     *  width = distance between the hooks (scale a prop to it), left/right = each handFrame position. */
    bothHandsFrame() {
      const L = ch.handFrame("L"), Rr = ch.handFrame("R");
      const x = L.position.clone().sub(Rr.position); const width = x.length(); if (width < 1e-6) x.set(1, 0, 0); x.normalize();
      const y = new THREE.Vector3(0, 1, 0).transformDirection(body.matrixWorld); y.addScaledVector(x, -y.dot(x)); if (y.lengthSq() < 1e-8) y.set(0, 1, 0); y.normalize();
      const z = new THREE.Vector3().crossVectors(x, y);
      const quaternion = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, y, z));
      return { position: L.position.clone().add(Rr.position).multiplyScalar(0.5), quaternion, width, left: L.position, right: Rr.position, scale: SC };
    },
    /** which hand ("L"/"R") is on the target's side (rule: point with the near hand) */
    nearHand(targetWorld) { root.updateWorldMatrix(true, true); return body.worldToLocal(targetWorld.clone()).x >= 0 ? "L" : "R"; },
    faceName(state) { return faceName(faceSet, state.expression || "neutral", state.mouth || "", state.gaze || ""); },
    dispose() { root.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) { for (const k of ["map", "bumpMap"]) o.material[k]?.dispose?.(); o.material.dispose(); } }); },
  };
  ch.update({}, {});
  return ch;
}
