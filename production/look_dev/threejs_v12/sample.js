// Style v12 SAMPLE in three.js (7.3 s, video 1 at 19.25–26.55 s): "The old keeper laughs. 'Son, I've turned that lens by hand
// for 30 years. You can't float glass on metal,' but it works."  Live lighting, animated puppets, flat 2D faces with lip-sync,
// hand-drawn head outlines redrawn toward the camera every frame, one continuous camera move.  window.renderAt(t) renders time t.
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { RectAreaLightUniformsLib } from "three/addons/lights/RectAreaLightUniformsLib.js";
import { EffectComposer, RenderPass, EffectPass, BloomEffect, ToneMappingEffect, ToneMappingMode, VignetteEffect, SMAAEffect,
         BrightnessContrastEffect, HueSaturationEffect } from "postprocessing";
import { N8AOPostPass } from "n8ao";

const P = Object.fromEntries(new URLSearchParams(location.search));
const A = "assets/";
const K_PT = 0.008, K_SUN = 0.15, K_FILL = 25, HEMI = 1.3, SAT = 0.12, FACE = 0.95, K_BOUNCE = 14;
const T0 = 19.25, DUR = 7.3;
const info = await (await fetch(A + "scene.json")).json();
const WORDS = await (await fetch(A + "words.json")).json();
const FACES = new Set(await (await fetch(A + "faces/index.json")).json());
const T = (i) => WORDS[i][0] - T0;
const SC = +(P.scale ?? 1); const [W, H] = info.camera.res.map((v) => Math.round(v * SC));

// ---------------------------------------------------------------- renderer, scene, Blender-space root
const renderer = new THREE.WebGLRenderer({ antialias: false, preserveDrawingBuffer: true });
renderer.setSize(W, H); renderer.setPixelRatio(1); renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.NoToneMapping;
document.body.appendChild(renderer.domElement);
const scene = new THREE.Scene();
const BR = new THREE.Group(); BR.rotation.x = -Math.PI / 2; scene.add(BR); BR.updateMatrixWorld();   // children use Blender coords (Z up)
const b2t = (v) => new THREE.Vector3(v[0], v[2], -v[1]);
const bw = (x, y, z) => new THREE.Vector3(x, y, z).applyMatrix4(BR.matrixWorld);                    // Blender point -> three world
const cam = new THREE.PerspectiveCamera(92, W / H, 0.05, 1000);

const tl0 = new THREE.TextureLoader(), pending = [];
const tload = (url, cs) => { let res; pending.push(new Promise((r) => (res = r)));
  const t = tl0.load(url, () => res(), undefined, () => res()); t.colorSpace = cs; return t; };
const tex = (f, srgb) => { const t = tload(A + f, srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace); t.flipY = false; t.anisotropy = 8; return t; };
const surface = (name) => new THREE.MeshStandardMaterial({ map: tex(`${name}_albedo.png`, true), normalMap: tex(`${name}_normal.png`, false),
  emissiveMap: tex(`${name}_emit.png`, true), emissive: new THREE.Color(1, 1, 1), emissiveIntensity: 16, roughness: 0.75, metalness: 0 });
const INK = new THREE.Color(0.11, 0.075, 0.06).convertSRGBToLinear();
const inkMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(0.035, 0.022, 0.018), roughness: 0.5 });
const hullMat = (t) => new THREE.ShaderMaterial({ side: THREE.BackSide, uniforms: { t: { value: t }, c: { value: INK } },
  vertexShader: `uniform float t; void main(){ vec3 p = position + normal*t; gl_Position = projectionMatrix*modelViewMatrix*vec4(p,1.0); }`,
  fragmentShader: `uniform vec3 c; void main(){ gl_FragColor = vec4(c,1.0); }` });
const addHull = (mesh, t) => { const o = new THREE.Mesh(mesh.geometry, hullMat(t)); mesh.add(o); };

// ---------------------------------------------------------------- flat 2D face (locked C1b/C1c + black mouth)
const faceTex = {};
function faceTexture(name) { if (!faceTex[name]) faceTex[name] = tload(A + "faces/" + name + ".png", THREE.NoColorSpace); return faceTex[name]; }
function faceMat() {
  return new THREE.ShaderMaterial({
    uniforms: { hc: { value: new THREE.Vector3() }, X: { value: new THREE.Vector3() }, Y: { value: new THREE.Vector3() }, Z: { value: new THREE.Vector3() },
      R: { value: 0.29 }, drop: { value: 0 }, ls: { value: 1 }, face: { value: null }, k: { value: FACE }, GW: { value: 0.45 } },
    vertexShader: `varying vec3 wp; void main(){ vec4 w = modelMatrix*vec4(position,1.0); wp = w.xyz; gl_Position = projectionMatrix*viewMatrix*w; }`,
    fragmentShader: `uniform vec3 hc,X,Y,Z; uniform float R,drop,ls,k,GW; uniform sampler2D face; varying vec3 wp;
      vec3 lin(vec3 c){ return pow(c, vec3(2.2)); }
      void main(){ vec3 d = wp-hc; float x = dot(d,X), y = dot(d,Y), z = dot(d,Z); float FS = 2.15*R;
        vec2 uv = vec2(x/FS+0.5, y/FS+0.5+drop/FS);
        vec4 f = (uv.x<0.||uv.x>1.||uv.y<0.||uv.y>1.) ? vec4(0.) : texture2D(face, uv);
        f.a *= smoothstep(0.05*R, 0.25*R, z);
        float lum = dot(f.rgb, vec3(0.3,0.59,0.11));
        f.rgb = mix(f.rgb, vec3(0.11,0.075,0.06), smoothstep(0.55, 0.20, lum));            // navy ink -> warm dark ink
        f.rgb = mix(f.rgb, vec3(0.11,0.075,0.06), smoothstep(0.04, 0.12, f.r-max(f.g,f.b))); // mouth fill -> black
        vec3 skin = vec3(0.97,0.965,0.95);
        float sh = smoothstep(-0.25, 1.0, -ls*x/R); vec3 c = mix(skin, vec3(0.48,0.48,0.60), sh);
        float gl = smoothstep(-0.50, 1.0, ls*x/R)*0.85*GW; c = mix(c, vec3(1.0,0.68,0.30), gl);
        c = mix(c, f.rgb, f.a);
        gl_FragColor = vec4(lin(c)*k, 1.0); }` });
}

// ---------------------------------------------------------------- hand-drawn head outline ring (locked C4e), rebuilt per frame
function ringGeometry(hc, R, campos, seed, topCut, taper) {
  const d = campos.clone().sub(hc), D = d.length(), nrm = d.clone().divideScalar(D);
  const up = new THREE.Vector3(0, 1, 0).sub(nrm.clone().multiplyScalar(nrm.y)).normalize(), rt = up.clone().cross(nrm);
  const off = 0.85 * R, kk = (D - off) / Math.sqrt(D * D - R * R), rIn = R * kk * 0.995, wbase = 0.022 * (D - off) / D;
  const c = hc.clone().add(nrm.clone().multiplyScalar(off)), N = 240, ph = seed;
  const bite = (a) => Math.min(0.13, Math.max(0.010, 0.055 + 0.038 * Math.sin(2 * a + ph[0]) + 0.022 * Math.sin(3 * a + ph[1]) +
    0.010 * Math.sin(5 * a + ph[2]) + 0.006 * Math.sin(8 * a + ph[6])));
  const wid = (a) => 0.85 + 0.35 * Math.sin(a + ph[3]) + 0.16 * Math.sin(3 * a + ph[4]) + 0.08 * Math.sin(6 * a + ph[5]);
  const pos = [], idx = [];
  for (let i = 0; i <= N; i++) {
    const a = 2 * Math.PI * i / N, dir = rt.clone().multiplyScalar(Math.cos(a)).add(up.clone().multiplyScalar(Math.sin(a)));
    let ri = rIn * (1 - bite(a)); const ro = Math.max(rIn * 1.03, ri + wbase * wid(a));
    if (taper) { const t_ = Math.max(0, Math.min(1, (topCut - Math.sin(a) * R) / (0.12 * R))); ri = ro - (ro - ri) * (0.35 + 0.65 * t_); }
    const p1 = c.clone().add(dir.clone().multiplyScalar(ri)), p2 = c.clone().add(dir.clone().multiplyScalar(ro)); pos.push(...p1.toArray(), ...p2.toArray());
  }
  for (let i = 0; i < N; i++) { const a = 2 * Math.PI * (i + 0.5) / N; if (Math.sin(a) * R > topCut) continue;
    idx.push(2 * i, 2 * i + 1, 2 * i + 3, 2 * i, 2 * i + 3, 2 * i + 2); }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); return g;
}

// ---------------------------------------------------------------- load the exported scene
const gltf = await new GLTFLoader().loadAsync(A + "scene.glb");
scene.add(gltf.scene); scene.updateMatrixWorld(true);
const node = {}; gltf.scene.traverse((o) => { if (o.isMesh) node[o.name] = o; });
for (const n of ["set_in", "set_out"]) { node[n].material = surface(n); node[n].receiveShadow = true; }
const lensPivot = new THREE.Group(); BR.add(lensPivot); lensPivot.position.set(info.lens_axis[0], info.lens_axis[1], 0); lensPivot.updateMatrixWorld();
node.lens.material = surface("lens"); lensPivot.attach(node.lens);

// ---------------------------------------------------------------- puppets
const seedFor = (name) => { let h = 0; for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const r = () => ((h = (h * 1664525 + 1013904223) >>> 0) / 4294967296) * 6.283; return [r(), r(), r(), r(), r(), r(), r()]; };
const ss = (x) => { x = Math.max(0, Math.min(1, x)); return x * x * x * (x * (x * 6 - 15) + 10); };
class Puppet {
  constructor(key) {
    const c = info.chars[key]; this.key = key; this.c = c; this.R = c.R;
    this.root = new THREE.Group(); BR.add(this.root); this.root.position.set(c.base[0], c.base[1], 0); this.root.rotation.z = c.yaw;
    this.hip = new THREE.Group(); this.root.add(this.hip); this.hip.position.set(0, 0, c.hip);
    this.neck = new THREE.Group(); this.hip.add(this.neck); this.neck.position.set(0, 0, c.top - c.hip);
    this.root.updateMatrixWorld(true);
    const body = node[key + "_body"], hat = node[key + "_hat"], head = node[key + "_head"];
    body.material = surface(key + "_body"); body.castShadow = true; this.hip.attach(body); addHull(body, 0.012);
    hat.material = surface(key + "_hat"); hat.castShadow = true; this.neck.attach(hat); addHull(hat, 0.012);
    head.material = faceMat(); head.castShadow = true; this.neck.attach(head); addHull(head, 0.006); this.head = head;
    this.hcLocal = this.neck.worldToLocal(bw(...c.head_center));      // true head centre, carried by the neck
    this.ring = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial({ color: INK, side: THREE.DoubleSide })); scene.add(this.ring);
    this.seed = seedFor(key + "_outline"); this.topCut = c.hat ? 0.36 * this.R : 0.44 * this.R; this.taper = !c.hat;
    this.limbs = []; for (let i = 0; i < 4; i++) { const m = new THREE.Mesh(new THREE.BufferGeometry(), inkMat); m.castShadow = true; scene.add(m); this.limbs.push(m); }
    this.joints = []; for (let i = 0; i < 8; i++) { const m = new THREE.Mesh(new THREE.SphereGeometry(0.0145, 10, 8), inkMat); scene.add(m); this.joints.push(m); }
    this.ch = {}; this.hands = { 1: [], [-1]: [] };
  }
  key_(ch, list) { this.ch[ch] = list; }         // list of [t, value, transition seconds]
  val(ch, t, def = 0) { const L = this.ch[ch]; if (!L) return def; let v = L[0][1];
    for (const [tk, vk, d] of L) { if (t >= tk - d) { const u = ss((t - (tk - d)) / d); v = typeof v === "number" ? v + (vk - v) * u : v.clone().lerp(vk, u); } }
    return v; }
  local(v) { return v.clone().applyMatrix4(this.root.matrixWorld); }      // root-local Blender coords -> three world
}
const KEE = new Puppet("keeper"), ENG = new Puppet("engineer");
const LENS_B = new THREE.Vector3(0, 0.3, 1.38);
const toLocal = (p, who) => { who.root.updateMatrixWorld(); return bw(p.x, p.y, p.z).applyMatrix4(who.root.matrixWorld.clone().invert()); };
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const D = 0.28;   // default pose transition time

// KEEPER (gesture hand -1 = camera side): laughs, "Son," reaches toward the kid, thumb to chest, points at the lens, mimes cranking,
// finger up for "30 years", leans in wagging a finger, shrugs, turns to the spinning lens and his jaw drops.
const rest = (s) => V(s * 0.27, -0.03, 0.80);
KEE.key_("lean", [[0, -0.12, D], [T(69), 0.22, 0.25], [T(69) + 0.55, 0.0, 0.35], [T(70), 0.07, D], [T(71), -0.06, D], [T(77), -0.08, D],
  [T(80), 0.16, D], [T(83), -0.02, D], [T(86) + 0.05, 0.0, D], [T(88), -0.14, 0.2]]);
KEE.key_("side", [[0, 0.03, D], [T(77), 0.0, D], [T(83), 0.10, D], [T(86), 0.0, D]]);
KEE.key_("turn", [[0, 0.0, D], [T(70), 0.12, D], [T(72), 0.0, D], [T(80), 0.15, D], [T(83), 0.05, D], [T(86) + 0.05, 0.75, 0.45]]);
KEE.key_("nod", [[0, -0.08, D], [T(69), 0.10, 0.25], [T(70), 0.0, D], [T(74), 0.05, D], [T(78), -0.10, D], [T(80), 0.08, D], [T(83), -0.04, D], [T(88), -0.16, 0.2]]);
KEE.key_("tilt", [[0, 0.10, D], [T(70), -0.06, D], [T(73), 0.04, D], [T(78), 0.12, D], [T(80), -0.04, D], [T(83), 0.14, D], [T(86), 0.0, D]]);
KEE.key_("hturn", [[0, 0.0, D], [T(74) - 0.1, -0.45, D], [T(75) + 0.1, 0.0, D], [T(86), 0.35, 0.3]]);
KEE.key_("laugh", [[0, 1.0, 0.1], [T(69) + 0.7, 0.0, 0.4]]);
KEE.key_("hand-1", [[0, V(-0.10, -0.19, 0.92), D], [T(69), V(-0.13, -0.17, 0.72), 0.25], [T(70), V(-0.06, -0.44, 1.06), D],
  [T(71), V(-0.05, -0.20, 1.08), 0.22], [T(74) - 0.05, "lens", D], [T(75), V(-0.20, -0.30, 0.98), 0.22], [T(77), V(-0.30, -0.12, 1.55), D],
  [T(80), V(-0.10, -0.40, 1.24), D], [T(83), V(-0.34, -0.14, 1.02), D], [T(86), rest(-1), D], [T(88) - 0.05, V(-0.20, -0.16, 1.28), 0.2]]);
KEE.key_("hand1", [[0, V(0.10, -0.19, 0.92), D], [T(69), V(0.13, -0.17, 0.72), 0.25], [T(70), rest(1), 0.35], [T(83), V(0.34, -0.14, 1.02), D],
  [T(86), rest(1), D], [T(88) - 0.05, V(0.20, -0.16, 1.28), 0.2]]);
KEE.overlay = (t, h) => {   // crank circles on "by hand", finger wag on "You can't"
  if (t > T(75) && t < T(77) - 0.1) { const a = (t - T(75)) * 2 * Math.PI * 1.6; h[-1].add(V(0.07 * Math.cos(a), 0, 0.07 * Math.sin(a))); }
  if (t > T(80) && t < T(83) - 0.1) h[-1].x += 0.04 * Math.sin((t - T(80)) * 2 * Math.PI * 2.4);
};
KEE.faces = [[0, "laugh"], [T(69) + 0.75, "smug"], [T(73), "neutral"], [T(78) - 0.1, "proud"], [T(80) - 0.1, "skeptical"], [T(84), "smug"], [T(86), "neutral"], [T(88) - 0.05, "shock"]];
KEE.gaze = [[0, ""], [T(70) - 0.3, "_R"], [T(74) - 0.1, ""], [T(75) + 0.1, "_R"], [T(86), ""]];
KEE.speak = [70, 85]; KEE.blinks = [0.9, 3.25, 5.95];

// ENGINEER (gesture hand +1 = camera side): polite, patient, unbothered; glances at the lens, nods, folds his arms, then presents the lens.
ENG.key_("lean", [[0, 0.0, D], [T(70), -0.10, 0.22], [T(72), 0.0, D], [T(86) + 0.05, -0.06, D]]);
ENG.key_("side", [[0, -0.04, D], [T(70), -0.06, D], [T(80) + 0.1, -0.08, D], [T(85), 0.0, D]]);
ENG.key_("turn", [[0, 0.0, D], [T(86) + 0.05, -0.6, 0.45]]);
ENG.key_("nod", [[0, 0.0, D], [T(75), 0.10, 0.18], [T(76), -0.03, 0.18], [T(77), 0.10, 0.18], [T(78), -0.02, 0.18], [T(79), 0.0, 0.2]]);
ENG.key_("tilt", [[0, -0.06, D], [T(70), 0.14, 0.22], [T(72), -0.04, D], [T(80) + 0.1, 0.12, D], [T(85), -0.08, D], [T(87), 0.06, D]]);
ENG.key_("hturn", [[0, 0.0, D], [T(72) + 0.1, 0.45, D], [T(74), 0.0, D], [T(86), -0.3, 0.3]]);
ENG.key_("laugh", [[0, 0.0, 0.1], [T(69), 0.45, 0.2], [T(70) - 0.4, 0.0, 0.3]]);
ENG.key_("hand1", [[0, V(0.12, 0.10, 0.82), D], [T(80) + 0.1, V(-0.07, -0.21, 1.02), D], [T(86) + 0.05, "lens", 0.35]]);
ENG.key_("hand-1", [[0, V(-0.12, 0.10, 0.82), D], [T(80) + 0.1, V(0.07, -0.20, 0.97), D], [T(86) + 0.05, V(-0.32, -0.22, 1.05), 0.35]]);
ENG.faces = [[0, "happy"], [T(69), "laugh"], [T(70) - 0.2, "skeptical"], [T(72) + 0.1, "neutral"], [T(74), "smug"], [T(80) + 0.1, "skeptical"],
  [T(82), "smug"], [T(86), "happy"], [T(88) - 0.05, "proud"]];
ENG.gaze = [[0, "_L"], [T(72) + 0.1, ""], [T(74), "_L"], [T(86), ""]];
ENG.speak = null; ENG.blinks = [1.75, 4.35, 6.55];

const VOW = { a: "_A", o: "_O", u: "_O", e: "_E", i: "_E", y: "_E" };
function faceName(p, t) {
  let ex = "neutral"; for (const [tk, e] of p.faces) if (t >= tk) ex = e;
  let gz = ""; for (const [tk, g] of p.gaze) if (t >= tk) gz = g;
  let vis = "";
  if (p.speak) for (let i = p.speak[0]; i <= p.speak[1]; i++) { const a = T(i), b = WORDS[i][1] - T0;
    if (t >= a && t < b) { const vs = [...WORDS[i][2].toLowerCase()].filter((ch) => VOW[ch]).map((ch) => VOW[ch]);
      const n = Math.max(1, vs.length), seg = (b - a) / n, k = Math.min(n - 1, Math.floor((t - a) / seg));
      vis = ((t - a) - k * seg) < seg * 0.72 ? (vs[k] || "_E") : ""; } }
  const blink = p.blinks.some((b) => t >= b && t < b + 0.12) && !vis;
  const b = `${p.key}_${ex}`;
  const cands = blink ? [b + "_blink", b + gz, b] : vis ? [b + vis + gz, b + vis, b + "_talk" + gz, b + "_talk", b + gz, b] : [b + gz, b];
  return cands.find((c) => FACES.has(c)) || `${p.key}_neutral`;
}

function ik(S, Hd, pole, L1 = 0.27, L2 = 0.27) {
  const dv = Hd.clone().sub(S); let d = dv.length(); const dir = dv.clone().normalize(); d = Math.min(d, (L1 + L2) * 0.999);
  const a = (L1 * L1 - L2 * L2 + d * d) / (2 * d), h = Math.sqrt(Math.max(0, L1 * L1 - a * a));
  const pp = pole.clone().sub(S); pp.sub(dir.clone().multiplyScalar(pp.dot(dir))).normalize();
  return { E: S.clone().add(dir.clone().multiplyScalar(a)).add(pp.multiplyScalar(h)), H: S.clone().add(dir.multiplyScalar(d)) };
}
function tube(mesh, pts, r = 0.015) { mesh.geometry.dispose(); mesh.geometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, false, "centripetal"), 24, r, 8, false); }

function pose(p, t) {
  const c = p.c, laugh = p.val("laugh", t);
  p.root.rotation.z = c.yaw + p.val("turn", t);
  const shake = laugh * 0.014 * Math.sin(t * 2 * Math.PI * 6.5), breathe = 0.004 * Math.sin(t * 2 * Math.PI * 0.35 + (p === KEE ? 0 : 1.7));
  p.hip.position.z = c.hip + shake + breathe + (p === KEE && t > T(83) - 0.1 && t < T(85) ? 0.015 : 0);
  p.hip.rotation.set(p.val("lean", t) + laugh * 0.03 * Math.sin(t * 13.1), p.val("side", t) + 0.015 * Math.sin(t * 1.3 + (p === KEE ? 0 : 2)), 0);
  p.neck.rotation.set(p.val("nod", t) + laugh * 0.05 * Math.sin(t * 2 * Math.PI * 6.5 + 1), p.val("tilt", t), p.val("hturn", t));
  p.root.updateMatrixWorld(true);
  // hands (root-local targets) -> world, overlays, IK arms with finger hooks
  const h = {};
  for (const s of [1, -1]) {
    const L = p.ch["hand" + s]; const prev = L[0][1] === "lens" ? toLocal(LENS_B, p) : L[0][1]; const v = prev.clone();
    for (const [tk, vk0, d] of L) { const vk = vk0 === "lens" ? toLocal(LENS_B.clone().add(V(s * 0.08, -0.25, -0.1)), p) : vk0;
      if (t >= tk - d) v.lerp(vk, ss((t - (tk - d)) / d)); }
    h[s] = v; }
  if (p.overlay) p.overlay(t, h);
  let li = 0, ji = 0;
  for (const s of [1, -1]) {
    const S = new THREE.Vector3(s * 0.185, -0.02, c.top - c.hip - 0.14).applyMatrix4(p.hip.matrixWorld);
    const Hd = p.local(h[s]); const pole = p.local(V(s * 0.45, 0.20, 0.55));
    const { E, H: Hc } = ik(S, Hd, pole); tube(p.limbs[li++], [S, E, Hc]);
    const dd = Hc.clone().sub(E).normalize(); const inward = p.local(V(0, -0.05, 0)).sub(Hc).normalize();
    const tip = Hc.clone().add(dd.multiplyScalar(0.35).add(inward.multiplyScalar(0.55)).add(new THREE.Vector3(0, 0.45, 0)).normalize().multiplyScalar(0.038));
    tube(p.limbs[li++], [Hc, Hc.clone().lerp(tip, 0.5), tip], 0.014);
    p.joints[ji++].position.copy(Hc); p.joints[ji++].position.copy(tip);
  }
  // legs + "L" feet (planted)
  for (const s of [1, -1]) {
    const hp = p.local(V(s * 0.07, 0, c.hip + 0.10)), kn = p.local(V(s * 0.08, -0.03, c.hip * 0.5)), an = p.local(V(s * 0.09, 0, 0.017)), to = p.local(V(s * 0.115, -0.105, 0.017));
    p.joints[ji++].position.copy(an); p.joints[ji++].position.copy(to);
    p._legs = p._legs || [new THREE.Mesh(new THREE.BufferGeometry(), inkMat), new THREE.Mesh(new THREE.BufferGeometry(), inkMat), new THREE.Mesh(new THREE.BufferGeometry(), inkMat), new THREE.Mesh(new THREE.BufferGeometry(), inkMat)];
    if (!p._legsAdded) { p._legs.forEach((m) => { m.castShadow = true; scene.add(m); }); p._legsAdded = true; }
    const k = s === 1 ? 0 : 2; tube(p._legs[k], [hp, kn, an]); tube(p._legs[k + 1], [an, an.clone().lerp(to, 0.5), to]);
  }
  // face: flat drawing facing the camera, a little head roll, light side from the lamp
  const hc = p.neck.localToWorld(p.hcLocal.clone());
  const Z = cam.position.clone().sub(hc).normalize(), Y = new THREE.Vector3(0, 1, 0).sub(Z.clone().multiplyScalar(Z.y)).normalize();
  Y.applyAxisAngle(Z, -p.val("tilt", t) * 0.6); const X = Y.clone().cross(Z);
  const u = p.head.material.uniforms; u.hc.value.copy(hc); u.X.value.copy(X); u.Y.value.copy(Y); u.Z.value.copy(Z);
  u.drop.value = (c.hat ? 0.10 * p.R : 0) + p.val("nod", t) * 0.10 * p.R;
  u.ls.value = bw(0, 0.3, 1.5).sub(hc).dot(X) > 0 ? 1 : -1;
  u.face.value = faceTexture(faceName(p, t));
  p.ring.geometry.dispose(); p.ring.geometry = ringGeometry(hc, p.R, cam.position, p.seed, p.topCut, p.taper);
}

// ---------------------------------------------------------------- camera: one continuous move (Catmull-Rom, eased only at the ends)
const CAMK = [[V(0.55, -2.40, 1.80), V(-0.02, -0.58, 1.10)], [V(0.10, -2.45, 1.32), V(0.0, -0.62, 1.22)], [V(-0.10, -2.38, 1.36), V(-0.08, -0.64, 1.26)],
  [V(-0.30, -2.35, 1.40), V(0.05, -0.62, 1.28)], [V(0.12, -2.40, 1.42), V(0.02, -0.42, 1.26)]];
const camPath = new THREE.CatmullRomCurve3(CAMK.map((k) => k[0]), false, "centripetal"), tgtPath = new THREE.CatmullRomCurve3(CAMK.map((k) => k[1]), false, "centripetal");
function camAt(t) { const u = 0.5 - 0.5 * Math.cos(Math.PI * Math.max(0, Math.min(1, t / DUR)));
  const p = camPath.getPoint(u), g = tgtPath.getPoint(u); cam.position.copy(bw(p.x, p.y, p.z)); cam.up.set(0, 1, 0); cam.lookAt(bw(g.x, g.y, g.z)); cam.updateMatrixWorld(); }

// ---------------------------------------------------------------- sky, lights, post (same as the locked-frame test)
const skyT = tload(A + "sky.png", THREE.SRGBColorSpace);
scene.add(new THREE.Mesh(new THREE.SphereGeometry(420, 64, 32), new THREE.MeshBasicMaterial({ map: skyT, side: THREE.BackSide })));
RectAreaLightUniformsLib.init();
for (const L of info.lights) {
  const col = new THREE.Color(...L.color), p = b2t(L.pos), d = b2t(L.dir); let l;
  if (L.type === "POINT") { l = new THREE.PointLight(col, L.energy * K_PT * (L.energy < 100 ? K_BOUNCE : 1), 0, 2); l.position.copy(p);
    if (L.energy > 1000) { l.intensity *= 0.5; const sp = new THREE.SpotLight(col, L.energy * K_PT * 0.5 * 1.15, 0, 1.25, 0.7, 2); sp.position.copy(p);
      sp.target.position.copy(bw(0.05, -2.4, 0.2)); scene.add(sp.target); sp.castShadow = true; sp.shadow.mapSize.set(2048, 2048);
      sp.shadow.bias = -0.0005; sp.shadow.camera.near = 0.2; sp.shadow.camera.far = 12; scene.add(sp); } }
  else if (L.type === "SPOT") { l = new THREE.SpotLight(col, L.energy * K_PT * K_FILL, 0, L.spot / 2, L.blend, 2); l.position.copy(p); l.target.position.copy(p.clone().add(d)); scene.add(l.target); }
  else if (L.type === "SUN") { l = new THREE.DirectionalLight(col, L.energy * K_SUN); l.position.copy(p.clone().sub(d.clone().multiplyScalar(20))); l.target.position.copy(p); scene.add(l.target); }
  else if (L.type === "AREA") { l = new THREE.RectAreaLight(col, L.energy * K_PT * 0.5, L.size, L.size); l.position.copy(p); l.lookAt(p.clone().add(d)); }
  if (l) scene.add(l);
}
scene.add(new THREE.HemisphereLight(0x6a78a8, 0x8a5a30, HEMI));
const composer = new EffectComposer(renderer, { frameBufferType: THREE.HalfFloatType });
composer.addPass(new RenderPass(scene, cam));
const ao = new N8AOPostPass(scene, cam, W, H); Object.assign(ao.configuration, { aoRadius: 0.6, distanceFalloff: 0.4, intensity: 2.5, aoSamples: 16, denoiseSamples: 8, halfRes: false });
composer.addPass(ao);
composer.addPass(new EffectPass(cam, new BloomEffect({ intensity: 1.3, luminanceThreshold: 1.0, luminanceSmoothing: 0.05, mipmapBlur: true }),
  new ToneMappingEffect({ mode: ToneMappingMode.ACES_FILMIC }), new HueSaturationEffect({ saturation: SAT }), new BrightnessContrastEffect({ contrast: 0.08 }),
  new VignetteEffect({ offset: 0.3, darkness: 0.6 }), new SMAAEffect()));

// preload every face drawing the timeline uses, then expose renderAt(t)
for (let t = 0; t <= DUR; t += 1 / 60) for (const p of [KEE, ENG]) faceTexture(faceName(p, t));
await Promise.all(pending); await new Promise((r) => setTimeout(r, 100));
window.renderAt = (t) => { camAt(t); lensPivot.rotation.z = 1.6 * (t + 4.0); for (const p of [KEE, ENG]) pose(p, t); composer.render();
  const g = renderer.getContext(), px = new Uint8Array(4); g.readPixels(0, 0, 1, 1, g.RGBA, g.UNSIGNED_BYTE, px); return true; };
window.__ready = true;
