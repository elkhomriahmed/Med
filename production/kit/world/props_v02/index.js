// Props + screens for video 02 (lemon-juice robber). Owner: props_v02 agent.
// Every builder returns a THREE.Group, real scale (metres), origin = BOTTOM CENTRE unless noted, with userData.grip (local point the
// finger hook holds; two-hand props also gripL / gripR). Controls are userData.set*(k) functions taking 0..1; every control is
// continuous (things grow/slide/fade, never pop) and deterministic (seeded, no Math.random, no per-frame noise).
import * as THREE from "three";
import { rng } from "../../shared/assets.js";
import { roundedBox, roundedCylinder, tube } from "../geometry.js";
import { plain, canvasTex } from "../materials.js";

const TAU = Math.PI * 2;
const cl01 = (x) => Math.min(1, Math.max(0, x));
const sstep = (a, b, x) => { const t = cl01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const hash = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
const shadows = (o, cast = true) => { o.traverse((m) => { if (m.isMesh) { m.castShadow = cast; m.receiveShadow = true; } }); return o; };
const mesh = (g, m, name = "") => { const x = new THREE.Mesh(g, m); x.name = name; return x; };
const imgOf = (src) => (!src ? null : src.isTexture ? src.image : src);

/** Paper background: base colour + fibres + soft mottling (deterministic). */
function paperBg(g, w, h, base = "#ece6d6", seed = 3, fib = 1) {
  const r = rng(seed); g.fillStyle = base; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "120,100,70" : "255,255,245"},${0.025 + r() * 0.04})`;
    g.beginPath(); g.ellipse(r() * w, r() * h, 20 + r() * w * 0.2, 10 + r() * h * 0.1, r() * 3, 0, TAU); g.fill(); }
  g.lineWidth = 1;
  for (let i = 0; i < 1400 * fib; i++) { const x = r() * w, y = r() * h, a = r() * TAU, l = 2 + r() * 7;
    g.strokeStyle = `rgba(${r() > 0.5 ? "90,75,55" : "255,255,250"},${0.05 + r() * 0.08})`;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke(); }
}
/** Greeked body text: lines of grey word bars. */
function greek(g, x, y, w, h, lineH, seed, color = "rgba(40,36,32,0.62)") {
  const r = rng(seed); g.fillStyle = color;
  for (let yy = y, n = 0; yy + lineH * 0.5 < y + h; yy += lineH, n++) {
    const parEnd = r() < 0.12, start = x + (r() < 0.1 ? lineH * 1.2 : 0), end = parEnd ? x + w * (0.25 + 0.55 * r()) : x + w;
    let xx = start;
    while (xx < end - lineH * 0.3) { const ww = Math.min(end - xx, lineH * (0.6 + r() * 2.6)); g.fillRect(xx, yy, ww, lineH * 0.42); xx += ww + lineH * 0.42; }
  }
}
function fitText(g, txt, maxW, px, font) { g.font = font(px); const m = g.measureText(txt).width; if (m > maxW) { px *= maxW / m; g.font = font(px); } return px; }

// =============================================================================================================== LEMONS
const LEMON = { R: 0.027, L: 0.032, N: 0.0075 };
let _peel = null;
function peelMaterial() {
  if (_peel) return _peel;
  const r = rng(41);
  const map = canvasTex(512, 256, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, "#b9b52a"); gr.addColorStop(0.07, "#e9c519"); gr.addColorStop(0.5, "#f6cd1e"); gr.addColorStop(0.93, "#ebc31a"); gr.addColorStop(1, "#a9ad2c");
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 60; i++) { g.fillStyle = `rgba(${r() > 0.6 ? "200,150,10" : "255,226,80"},${0.06 + r() * 0.1})`;
      g.beginPath(); g.ellipse(r() * w, h * 0.1 + r() * h * 0.8, 10 + r() * 50, 6 + r() * 20, 0, 0, TAU); g.fill(); }
    for (let i = 0; i < 5000; i++) { g.fillStyle = r() > 0.5 ? "rgba(255,240,140,0.35)" : "rgba(170,120,0,0.22)"; g.fillRect(r() * w, r() * h, 1.4, 1.4); }
  });
  const bump = canvasTex(1024, 512, (g, w, h) => {
    g.fillStyle = "#909090"; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 9000; i++) { const x = r() * w, y = r() * h, s = 1.5 + r() * 3.2;     // oil-gland dimples (pits)
      const gg = g.createRadialGradient(x, y, 0, x, y, s); gg.addColorStop(0, "rgba(20,20,20,0.75)"); gg.addColorStop(1, "rgba(20,20,20,0)");
      g.fillStyle = gg; g.fillRect(x - s, y - s, 2 * s, 2 * s); }
    for (let i = 0; i < 3000; i++) { g.fillStyle = "rgba(220,220,220,0.25)"; g.fillRect(r() * w, r() * h, 2, 2); }
  }, { srgb: false });
  map.wrapS = bump.wrapS = THREE.RepeatWrapping;
  return (_peel = new THREE.MeshStandardMaterial({ map, bumpMap: bump, bumpScale: 2.2, roughness: 0.42, envMapIntensity: 0.9 }));
}
// lump(theta) keeps every lemon slightly irregular; long axis = Y in the unit build space
const lumpFn = (seed) => { const r = rng(seed), a = [r() * 6, r() * 6], k = 0.025 + r() * 0.02; return (th) => 1 + k * Math.sin(3 * th + a[0]) + 0.012 * Math.sin(5 * th + a[1]); };
function lemonGeo(seed, thetaLength = Math.PI, lumps = true) {
  const g = new THREE.SphereGeometry(1, 56, 40, 0, TAU, 0, thetaLength), p = g.attributes.position, lump = lumpFn(seed);
  const { R, L, N } = LEMON;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i), rp = Math.hypot(x, z), th = Math.atan2(z, x);
    const k = lumps ? lump(th) : 1, waist = 1 - 0.06 * y * y;                       // a touch narrower toward the ends
    const nub = Math.sign(y) * N * Math.exp(-Math.pow(rp / 0.3, 2)) * (y > 0 ? 1 : 0.8);
    p.setXYZ(i, x * R * k * waist, y * L + nub, z * R * k * waist);
  }
  g.computeVertexNormals(); return g;
}
/** Whole lemon (~8 cm long, 5.4 cm across), lying on a surface with its long axis along X. grip = centre. */
export function createLemon({ seed = 1 } = {}) {
  const g = lemonGeo(seed); g.rotateZ(Math.PI / 2); g.translate(0, LEMON.R, 0);
  const root = new THREE.Group(); root.name = "lemon"; root.add(mesh(g, peelMaterial(), "lemonPeel"));
  root.userData.grip = new THREE.Vector3(0, LEMON.R, 0); return shadows(root);
}

let _cut = null;
function cutMaterial() {
  if (_cut) return _cut;
  const r = rng(77), SEG = 10;
  const draw = (bump) => (g, w, h) => {
    const c = w / 2, R = w / 2;
    g.fillStyle = bump ? "#808080" : "#f2c419"; g.fillRect(0, 0, w, h);
    g.fillStyle = bump ? "#9a9a9a" : "#f7f0d2"; g.beginPath(); g.arc(c, c, R * 0.94, 0, TAU); g.fill();       // pith
    for (let s = 0; s < SEG; s++) {                                                                            // pulp wedges
      const a0 = (s / SEG) * TAU + 0.04, a1 = ((s + 1) / SEG) * TAU - 0.04;
      g.save(); g.beginPath(); g.moveTo(c + Math.cos((a0 + a1) / 2) * R * 0.1, c + Math.sin((a0 + a1) / 2) * R * 0.1);
      g.arc(c, c, R * 0.8, a0, a1); g.closePath(); g.clip();
      g.fillStyle = bump ? "#707070" : "#f4d23e"; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 70; i++) {                                                                           // juice vesicles
        const a = a0 + r() * (a1 - a0), d = R * (0.15 + r() * 0.62), x = c + Math.cos(a) * d, y = c + Math.sin(a) * d;
        g.fillStyle = bump ? `rgba(${r() > 0.5 ? "190,190,190" : "60,60,60"},0.5)` : `rgba(${r() > 0.5 ? "255,240,150" : "225,170,20"},${0.35 + r() * 0.3})`;
        g.beginPath(); g.ellipse(x, y, R * (0.035 + r() * 0.04), R * 0.014, a, 0, TAU); g.fill(); }
      g.restore();
    }
    g.strokeStyle = bump ? "#c8c8c8" : "#fbf5dc"; g.lineWidth = w * 0.009;                                   // membranes
    for (let s = 0; s < SEG; s++) { const a = (s / SEG) * TAU; g.beginPath(); g.moveTo(c, c); g.lineTo(c + Math.cos(a) * R * 0.84, c + Math.sin(a) * R * 0.84); g.stroke(); }
    g.fillStyle = bump ? "#c0c0c0" : "#fbf4da"; g.beginPath(); g.arc(c, c, R * 0.085, 0, TAU); g.fill();       // core
    for (const [a, d] of [[0.5, 0.3], [2.6, 0.26], [4.4, 0.33]]) {                                            // seeds
      g.fillStyle = bump ? "#d0d0d0" : "#efe4b8"; g.beginPath(); g.ellipse(c + Math.cos(a) * R * d, c + Math.sin(a) * R * d, R * 0.06, R * 0.03, a, 0, TAU); g.fill(); }
    g.strokeStyle = bump ? "#707070" : "#e2b414"; g.lineWidth = w * 0.006; g.beginPath(); g.arc(c, c, R * 0.97, 0, TAU); g.stroke();
  };
  const map = canvasTex(512, 512, draw(false)), bump = canvasTex(512, 512, draw(true), { srgb: false });
  return (_cut = new THREE.MeshStandardMaterial({ map, bumpMap: bump, bumpScale: 1.6, roughness: 0.22, envMapIntensity: 1.2,
    emissive: new THREE.Color(0.95, 0.72, 0.1), emissiveIntensity: 0.07 }));       // tiny self-glow = translucent pulp
}
/** Lemon half lying cut face UP (dome below). grip = rim. userData.face = local centre of the cut face. */
export function createLemonHalf({ seed = 2 } = {}) {
  const { R, L, N } = LEMON, lump = lumpFn(seed);
  const dome = lemonGeo(seed, Math.PI / 2); dome.rotateX(Math.PI);           // upper half flipped: nub down, rim at y = 0
  const face = new THREE.CircleGeometry(1, 56); face.rotateX(-Math.PI / 2);
  const p = face.attributes.position;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), rr = Math.hypot(x, z), k = lump(Math.atan2(-z, x));   // dome flip mirrors z
    p.setXYZ(i, x * R * k, 0.0025 * (1 - rr * rr), z * R * k); }
  face.computeVertexNormals();
  const root = new THREE.Group(); root.name = "lemonHalf";
  const d = mesh(dome, peelMaterial(), "halfPeel"), f = mesh(face, cutMaterial(), "halfFace");
  const lift = L + N * 0.6; d.position.y = f.position.y = lift; root.add(d, f);
  root.userData.grip = new THREE.Vector3(R, lift, 0); root.userData.face = new THREE.Vector3(0, lift, 0);
  return shadows(root);
}
/** Thin round slice (5 mm), lying flat. grip = centre. */
export function createLemonSlice({ radius = LEMON.R * 0.95, thick = 0.005 } = {}) {
  const g = new THREE.CylinderGeometry(radius, radius, thick, 56, 1);
  const rind = new THREE.MeshStandardMaterial({ color: 0xf2c21c, roughness: 0.45, bumpMap: peelMaterial().bumpMap, bumpScale: 1 });
  const m = mesh(g, [rind, cutMaterial(), cutMaterial()], "lemonSlice"); m.position.y = thick / 2;
  const root = new THREE.Group().add(m); root.name = "lemonSlice"; root.userData.grip = new THREE.Vector3(0, thick / 2, 0); return shadows(root);
}
/** n lemons lined up along X on a counter (8.6 cm apart, small deterministic turns). userData.lemons = the lemon groups. */
export function createLemonRow(n = 6, { spacing = 0.086, seed = 10 } = {}) {
  const root = new THREE.Group(); root.name = "lemonRow"; const r = rng(seed), lemons = [];
  for (let i = 0; i < n; i++) { const l = createLemon({ seed: seed + i * 3 });
    l.position.set((i - (n - 1) / 2) * spacing, 0, (r() - 0.5) * 0.012); l.rotation.y = Math.PI / 2 + (r() - 0.5) * 0.5; root.add(l); lemons.push(l); }
  root.userData.lemons = lemons; root.userData.grip = new THREE.Vector3(0, LEMON.R, 0); return root;
}

/** Juice squirt from a squeezed lemon. Origin = squeeze point; juice falls toward -Y. set(k 0..1) = progress through one squeeze
 *  (streams start, thin and detach; droplets spray and fall). duration (s) only scales the physics. Nothing exists at k = 0 or 1. */
export function createJuiceSquirt({ seed = 5, drops = 16, streams = 3, duration = 0.9, spread = 0.35 } = {}) {
  const root = new THREE.Group(); root.name = "juiceSquirt"; const r = rng(seed);
  const juice = new THREE.MeshStandardMaterial({ color: new THREE.Color(1.0, 0.86, 0.32), roughness: 0.04, transparent: true, opacity: 0.6,
    emissive: new THREE.Color(1.0, 0.75, 0.15), emissiveIntensity: 0.08, envMapIntensity: 1.8, depthWrite: false });
  const G = -9.8, dropG = new THREE.SphereGeometry(1, 12, 10), D = [];
  for (let i = 0; i < drops; i++) {
    const m = mesh(dropG, juice, "drop"); m.visible = false; root.add(m);
    D.push({ m, t0: 0.05 + 0.6 * (i / drops) + 0.05 * r(), v: new THREE.Vector3((r() - 0.5) * spread, 0.1 + r() * 0.35, (r() - 0.5) * spread),
      s: 0.0018 + r() * 0.0022, life: 0.32 + r() * 0.12 });
  }
  const S = [];
  for (let i = 0; i < streams; i++) {
    const sg = new THREE.CylinderGeometry(0.001, 0.0006, 1, 8, 1, true); sg.translate(0, -0.5, 0);
    const m = mesh(sg, juice, "stream"); m.visible = false; root.add(m);
    S.push({ m, t0: 0.02 + i * 0.14, t1: 0.2 + i * 0.14 + r() * 0.05, x: (r() - 0.5) * 0.012, z: (r() - 0.5) * 0.012, tilt: (r() - 0.5) * 0.25 });
  }
  root.userData.set = (k) => {
    const T = cl01(k) * duration;
    for (const d of D) { const a = T - d.t0 * duration, L = d.life;
      if (a <= 0 || a >= L) { d.m.visible = false; continue; }
      const sc = d.s * sstep(0, 0.05, a) * (1 - sstep(L * 0.7, L, a));
      d.m.visible = sc > 1e-5; d.m.position.set(d.v.x * a, d.v.y * a + 0.5 * G * a * a, d.v.z * a);
      const vy = d.v.y + G * a; d.m.scale.set(sc, sc * (1 + Math.min(1.2, Math.abs(vy) * 0.35)), sc); }
    for (const s of S) { const a = T - s.t0 * duration, b = T - s.t1 * duration;
      const head = a > 0 ? 0.5 * -G * a * a : 0, tail = b > 0 ? 0.5 * -G * b * b : 0, len = Math.min(head, 0.22) - tail;
      const fade = 1 - sstep(0.06, 0.22, tail);
      s.m.visible = a > 0 && len > 0.002 && fade > 0.01;
      s.m.position.set(s.x, -tail, s.z); s.m.rotation.z = s.tilt * 0.2; s.m.scale.set(fade, Math.max(len, 1e-4), fade); }
  };
  root.userData.set(0); return root;
}

// ======================================================================================================= POLAROID PHOTO
const PHOTO = { W: 0.088, H: 0.107, IMG: 0.079, TOP: 0.0045 };
let _photoFrame = null, _photoBlank = null;
/** Instant photo, upright in XY facing +Z, origin = CENTRE. setDevelop(k): 0 = dark undeveloped chemistry, 1 = developed
 *  (faint blank grey, or the given `image` texture fades in). grip = middle of the wide bottom border. */
export function createPolaroidPhoto({ image = null } = {}) {
  const { W, H, IMG, TOP } = PHOTO;
  _photoFrame ||= canvasTex(256, 312, (g, w, h) => { paperBg(g, w, h, "#f6f4ee", 9, 0.3);
    g.strokeStyle = "rgba(0,0,0,0.08)"; g.lineWidth = 2; g.strokeRect(1, 1, w - 2, h - 2); });
  _photoBlank ||= canvasTex(256, 256, (g, w, h) => { const r = rng(13); g.fillStyle = "#e9e8e4"; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 30; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "150,150,155" : "255,255,255"},${0.04 + r() * 0.06})`;
      g.beginPath(); g.ellipse(r() * w, r() * h, 20 + r() * 80, 15 + r() * 50, r() * 3, 0, TAU); g.fill(); }
    const v = g.createRadialGradient(w / 2, h / 2, w * 0.2, w / 2, h / 2, w * 0.75); v.addColorStop(0, "rgba(0,0,0,0)"); v.addColorStop(1, "rgba(60,60,70,0.12)");
    g.fillStyle = v; g.fillRect(0, 0, w, h); });
  const root = new THREE.Group(); root.name = "polaroidPhoto";
  const card = mesh(roundedBox(W, H, 0.0011, 0.0005), new THREE.MeshStandardMaterial({ map: _photoFrame, roughness: 0.6 }), "photoCard"); root.add(card);
  const iy = H / 2 - TOP - IMG / 2, imgMat = new THREE.MeshStandardMaterial({ map: _photoBlank, roughness: 0.25, envMapIntensity: 1.0 });
  const img = mesh(new THREE.PlaneGeometry(IMG, IMG), imgMat, "photoImage"); img.position.set(0, iy, 0.0006); root.add(img);
  let picMat = null;
  if (image) { picMat = new THREE.MeshStandardMaterial({ map: image, roughness: 0.25, transparent: true, opacity: 0, depthWrite: false });
    const pic = mesh(new THREE.PlaneGeometry(IMG, IMG), picMat, "photoPicture"); pic.position.set(0, iy, 0.0007); root.add(pic); }
  const dark = new THREE.Color(0.11, 0.13, 0.15), light = new THREE.Color(0.8, 0.8, 0.8);
  root.userData.setDevelop = (k) => { const e = sstep(0, 1, k); imgMat.color.copy(dark).lerp(light, e); imgMat.roughness = 0.25 + 0.25 * e;
    if (picMat) { picMat.opacity = sstep(0.35, 1, k); picMat.color.setScalar(0.6 + 0.4 * e); } };
  root.userData.setDevelop(0);
  root.userData.grip = new THREE.Vector3(0, -H / 2 + 0.01, 0);
  return shadows(root);
}

// ====================================================================================================== POLAROID CAMERA
let _glow = null;
const glowTex = () => (_glow ||= canvasTex(128, 128, (g, w) => { const gr = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
  gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(0.25, "rgba(255,250,235,0.55)"); gr.addColorStop(1, "rgba(255,240,220,0)"); g.fillStyle = gr; g.fillRect(0, 0, w, w); }));
/** 1990s instant camera (~12 x 11 x 13 cm), lens on +Z. setFlash(k): flash window glows + a real point light + bloom sprite
 *  (k = 0 fully off). setEject(k): the photo slides out of the front slot (userData.photo = the createPolaroidPhoto group;
 *  its setDevelop is yours to drive). gripL / gripR = the sides; grip = gripR. userData.flashLight = the PointLight. */
export function createPolaroidCamera({ photoImage = null } = {}) {
  const root = new THREE.Group(); root.name = "polaroidCamera";
  const body = plain(0x1e1c1b, { roughness: 0.55, relief: 0.9 }), trim = plain(0x2c2a29, { roughness: 0.35, relief: 0.3 });
  const front = canvasTex(512, 320, (g, w, h) => {
    paperBg(g, w, h, "#d9d8d3", 5, 0.2);
    const cols = ["#d8322a", "#ee8a1e", "#f5c823", "#4aa548", "#2d6fc2"];
    cols.forEach((c, i) => { g.fillStyle = c; g.fillRect(w * 0.14 + i * w * 0.032, 0, w * 0.032, h); });
    g.fillStyle = "#151413"; g.fillRect(w * 0.06, h * 0.86, w * 0.88, h * 0.055);                       // photo slot
    g.fillStyle = "#3b3936"; g.font = `900 ${h * 0.075}px "Arial Black", sans-serif`; g.textAlign = "right"; g.fillText("INSTA 600", w * 0.94, h * 0.76);
    g.fillStyle = "rgba(0,0,0,0.25)"; g.fillRect(0, 0, w, 3); g.fillRect(0, h - 3, w, 3);
  });
  const b = mesh(roundedBox(0.12, 0.075, 0.13, 0.009), body, "camBody"); b.position.set(0, 0.0375, 0); root.add(b);
  const top = mesh(roundedBox(0.12, 0.036, 0.075, 0.009), body, "camTop"); top.position.set(0, 0.089, -0.027); root.add(top);
  const seam = mesh(roundedBox(0.122, 0.003, 0.132, 0.001), trim); seam.position.set(0, 0.073, 0); root.add(seam);
  const plate = mesh(roundedBox(0.112, 0.07, 0.006, 0.003), new THREE.MeshStandardMaterial({ color: 0xd2d1cc, roughness: 0.5 }), "camPlate");
  plate.position.set(0, 0.039, 0.066); root.add(plate);
  const print = mesh(new THREE.PlaneGeometry(0.108, 0.066), new THREE.MeshStandardMaterial({ map: front, roughness: 0.45 }), "camPrint");
  print.position.set(0, 0.039, 0.0692); root.add(print);
  // lens: barrel, chrome ring, glass with an inner ring
  const barrel = mesh(roundedCylinder(0.025, 0.018, 0.004, 40), trim, "lensBarrel"); barrel.rotation.x = Math.PI / 2; barrel.position.set(0.012, 0.046, 0.078); root.add(barrel);
  const ring = mesh(new THREE.TorusGeometry(0.0205, 0.0022, 10, 40), plain(0xb9b9b6, { roughness: 0.25, metalness: 0.9, relief: 0 }), "lensRing");
  ring.position.set(0.012, 0.046, 0.0872); root.add(ring);
  const glass = mesh(new THREE.CircleGeometry(0.0185, 40), new THREE.MeshStandardMaterial({ color: 0x0b1018, roughness: 0.04, metalness: 0.3, envMapIntensity: 2.2 }), "lensGlass");
  glass.position.set(0.012, 0.046, 0.0873); root.add(glass);
  const inner = mesh(new THREE.RingGeometry(0.008, 0.0095, 40), new THREE.MeshStandardMaterial({ color: 0x3a4a6a, roughness: 0.1, metalness: 0.6 }));
  inner.position.set(0.012, 0.046, 0.0875); root.add(inner);
  // flash window (ribbed fresnel), viewfinder, red shutter button, strap lug
  const ribs = canvasTex(128, 64, (g, w, h) => { g.fillStyle = "#e9e8e0"; g.fillRect(0, 0, w, h);
    for (let x = 0; x < w; x += 6) { g.fillStyle = "rgba(150,150,140,0.45)"; g.fillRect(x, 0, 2, h); } });
  const flashMat = new THREE.MeshStandardMaterial({ color: 0xeeeee6, map: ribs, roughness: 0.3, emissive: new THREE.Color(1, 0.97, 0.9), emissiveMap: ribs, emissiveIntensity: 0 });
  const fl = mesh(roundedBox(0.052, 0.021, 0.004, 0.0015), flashMat, "flashWindow"); fl.position.set(-0.026, 0.091, 0.0115); root.add(fl);
  const vf = mesh(roundedBox(0.018, 0.013, 0.003, 0.001), new THREE.MeshStandardMaterial({ color: 0x0a0c10, roughness: 0.05, envMapIntensity: 2 }), "viewfinder");
  vf.position.set(0.035, 0.092, 0.011); root.add(vf);
  const btn = mesh(roundedCylinder(0.0075, 0.007, 0.002, 24), plain(0xd42a1e, { roughness: 0.35, relief: 0.1 }), "shutter");
  btn.rotation.x = Math.PI / 2; btn.position.set(0.046, 0.018, 0.071); root.add(btn);
  for (const s of [-1, 1]) { const lug = mesh(roundedBox(0.006, 0.014, 0.012, 0.002), trim); lug.position.set(s * 0.062, 0.06, -0.03); root.add(lug); }
  // flash light + glow (always in the scene; intensity 0 when off, so no shader recompiles / pops)
  const light = new THREE.PointLight(0xfff3e6, 0, 5, 2); light.position.set(-0.026, 0.091, 0.04); light.name = "flashLight"; root.add(light);
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: new THREE.Color(2.5, 2.45, 2.3), transparent: true, opacity: 0,
    blending: THREE.AdditiveBlending, depthWrite: false })); glow.position.set(-0.026, 0.091, 0.02); glow.visible = false; glow.name = "flashGlow"; root.add(glow);
  root.userData.setFlash = (k) => { const e = cl01(k); flashMat.emissiveIntensity = 30 * e; light.intensity = 1.2 * e;
    glow.visible = e > 0.002; glow.material.opacity = e; glow.scale.setScalar(0.03 + 0.17 * e); };
  // photo in the slot
  const photo = createPolaroidPhoto({ image: photoImage }); photo.rotation.x = -Math.PI / 2;
  const z0 = 0.069 - PHOTO.H / 2 - 0.004; photo.position.set(0, 0.011, z0); photo.visible = false; root.add(photo);
  root.userData.photo = photo;
  root.userData.setEject = (k) => { const e = sstep(0, 1, k); photo.position.z = z0 + e * 0.096; photo.visible = e > 0.0005; };
  root.userData.gripR = new THREE.Vector3(0.062, 0.04, 0); root.userData.gripL = new THREE.Vector3(-0.062, 0.04, 0);
  root.userData.grip = root.userData.gripR;
  shadows(root); glow.castShadow = false; return root;
}

// ============================================================================================================ INK PAPER
/** Letter-size sheet lying flat (+Y up, top edge toward -Z), slight curl. setReveal(k): faint brown lemon-ink letters
 *  ("MONEY" by default) as when held to heat/light. setWrite(k): the wet, glossy juice trace being written left to right
 *  (redraws only when k changes). grip = middle of the bottom edge. */
export function createInkPaper({ text = "MONEY" } = {}) {
  const W = 0.216, H = 0.279, root = new THREE.Group(); root.name = "inkPaper";
  const geo = new THREE.PlaneGeometry(W, H, 16, 20); geo.rotateX(-Math.PI / 2);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i) / (W / 2), z = p.getZ(i) / (H / 2);
    p.setY(i, 0.0006 + 0.004 * Math.pow(Math.max(0, Math.abs(x) * Math.abs(z) - 0.3), 2) * 4 + 0.0015 * Math.max(0, -z - 0.6) * 3); }
  geo.computeVertexNormals();
  const paper = canvasTex(512, 660, (g, w, h) => paperBg(g, w, h, "#f3efe4", 21, 0.5));
  const sheet = mesh(geo, new THREE.MeshStandardMaterial({ map: paper, roughness: 0.85, side: THREE.DoubleSide }), "paper"); root.add(sheet);
  const lettering = (g, w, h, color) => { g.save(); g.translate(w / 2, h * 0.45); g.rotate(-0.06); g.fillStyle = color;
    g.font = `bold ${w * 0.2}px "Segoe Print", "Comic Sans MS", sans-serif`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(text, 0, 0);
    g.strokeStyle = color; g.lineWidth = w * 0.008; g.beginPath(); g.moveTo(-w * 0.33, h * 0.08); g.quadraticCurveTo(0, h * 0.11, w * 0.34, h * 0.06); g.stroke(); g.restore(); };
  const inkTex = canvasTex(512, 660, (g, w, h) => lettering(g, w, h, "rgba(120,72,24,1)"));
  const inkMat = new THREE.MeshStandardMaterial({ map: inkTex, transparent: true, opacity: 0, roughness: 0.85, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
  const ink = mesh(geo, inkMat, "inkLetters"); ink.position.y = 0.0002; ink.visible = false; root.add(ink);
  const wetC = document.createElement("canvas"); wetC.width = 512; wetC.height = 660; const wetTex = new THREE.CanvasTexture(wetC); wetTex.colorSpace = THREE.SRGBColorSpace;
  const wetMat = new THREE.MeshStandardMaterial({ map: wetTex, transparent: true, opacity: 0.5, roughness: 0.06, envMapIntensity: 2.2, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3 });
  const wet = mesh(geo, wetMat, "wetTrace"); wet.position.y = 0.0003; wet.visible = false; root.add(wet);
  let lastW = -1;
  root.userData.setReveal = (k) => { const e = cl01(k); inkMat.opacity = 0.8 * e; ink.visible = e > 0.002; };
  root.userData.setWrite = (k) => { const e = cl01(k); wet.visible = e > 0.002; if (Math.abs(e - lastW) < 0.002) return; lastW = e;
    const g = wetC.getContext("2d"), w = 512, h = 660; g.clearRect(0, 0, w, h);
    const x0 = w * 0.12, x1 = w * 0.9, xe = x0 + (x1 - x0) * e;
    g.save(); const grd = g.createLinearGradient(xe - 18, 0, xe + 2, 0); grd.addColorStop(0, "rgba(0,0,0,1)"); grd.addColorStop(1, "rgba(0,0,0,0)");
    lettering(g, w, h, "rgba(205,190,140,1)"); g.globalCompositeOperation = "destination-in"; g.fillStyle = grd; g.fillRect(0, 0, xe + 2, h);
    g.restore(); wetTex.needsUpdate = true; };
  root.userData.grip = new THREE.Vector3(0, 0.001, H / 2 - 0.012);
  shadows(root); ink.castShadow = wet.castShadow = false; return root;
}

// ============================================================================================================ LEMON BAG
/** Brown paper grocery bag (28 x 17 x 36 cm) with lemons peeking out of the top, serrated rim folded outward. gripL / gripR =
 *  the side walls near the top (hug carry); grip = gripR. */
export function createLemonBag({ lemons = 6, seed = 4 } = {}) {
  const A = 0.14, B = 0.085, HH = 0.36, root = new THREE.Group(); root.name = "lemonBag"; const r = rng(seed);
  const kraftDraw = (bump) => (g, w, h) => {
    paperBg(g, w, h, bump ? "#808080" : "#b48a58", seed, 1.4);
    const cr = rng(seed + 1);
    for (let i = 0; i < 26; i++) { const x = cr() * w, y = cr() * h, a = (cr() - 0.5) * 1.2, l = 30 + cr() * 140;   // creases
      g.strokeStyle = bump ? `rgba(${cr() > 0.5 ? "200,200,200" : "40,40,40"},0.45)` : `rgba(${cr() > 0.5 ? "230,200,150" : "90,60,30"},0.3)`;
      g.lineWidth = 1.5 + cr() * 2; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.sin(a) * l, y + Math.cos(a) * l); g.stroke(); }
    if (!bump) { g.save(); g.translate(w * 0.37, h * 0.55); g.fillStyle = "rgba(60,90,40,0.55)"; g.font = `900 ${h * 0.06}px "Arial Black", sans-serif`;
      g.textAlign = "center"; g.fillText("FRESH", 0, 0); g.font = `700 ${h * 0.035}px "Arial", sans-serif`; g.fillText("PRODUCE · MARKET", 0, h * 0.05);
      g.strokeStyle = "rgba(60,90,40,0.5)"; g.lineWidth = 4; g.strokeRect(-w * 0.13, -h * 0.09, w * 0.26, h * 0.17); g.restore(); }
  };
  const map = canvasTex(1024, 512, kraftDraw(false)), bump = canvasTex(1024, 512, kraftDraw(true), { srgb: false });
  const mat = new THREE.MeshStandardMaterial({ map, bumpMap: bump, bumpScale: 2, roughness: 0.92, side: THREE.DoubleSide });
  const sect = (th) => { const c = Math.cos(th), s = Math.sin(th), n = 7; return 1 / Math.pow(Math.pow(Math.abs(c) / A, n) + Math.pow(Math.abs(s) / B, n), 1 / n); };
  const wall = new THREE.CylinderGeometry(1, 1, HH, 96, 24, true); wall.translate(0, HH / 2, 0);
  const p = wall.attributes.position;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), th = Math.atan2(z, x);
    let rr = sect(th); const v = y / HH;
    rr *= 1 + 0.018 * Math.sin(th * 7 + v * 9) * Math.sin(v * 13 + th * 3) + 0.012 * Math.sin(th * 23 + v * 31) - 0.03 * Math.pow(1 - v, 6);
    const side = Math.abs(Math.cos(th)) > 0.92 ? 1 : 0;                           // gusset fold in the middle of the narrow sides
    rr *= 1 - side * 0.05 * Math.sin(v * Math.PI) * (1 - Math.abs(Math.sin(th)) * 2);
    const zig = v > 0.995 ? 0.004 * Math.sign(Math.sin(th * 70)) : 0;
    p.setXYZ(i, Math.cos(th) * rr, y + zig, Math.sin(th) * rr); }
  wall.computeVertexNormals(); root.add(mesh(wall, mat, "bagWall"));
  const rim = new THREE.CylinderGeometry(1, 1, 0.035, 96, 2, true), rp = rim.attributes.position;          // folded-over band
  for (let i = 0; i < rp.count; i++) { const x = rp.getX(i), y = rp.getY(i), z = rp.getZ(i), th = Math.atan2(z, x), rr = sect(th) * 1.025 + 0.003 * Math.sin(th * 19);
    rp.setXYZ(i, Math.cos(th) * rr, y + HH - 0.0175 - 0.002, Math.sin(th) * rr); }
  rim.computeVertexNormals(); root.add(mesh(rim, mat, "bagRim"));
  const bpts = []; for (let i = 0; i < 64; i++) { const th = (i / 64) * TAU, rr = sect(th) * 0.97; bpts.push(new THREE.Vector2(Math.cos(th) * rr, Math.sin(th) * rr)); }
  const bot = new THREE.ShapeGeometry(new THREE.Shape(bpts)); bot.rotateX(Math.PI / 2); bot.translate(0, 0.004, 0); root.add(mesh(bot, mat, "bagBottom"));
  // lemons: a lower layer (only seen from above) and the ones peeking over the rim
  const spots = [[-0.07, 0.3, -0.02, 0.4], [0.0, 0.325, 0.015, 1.3], [0.07, 0.305, -0.015, 2.2], [-0.03, 0.335, -0.035, 0.8], [0.045, 0.335, 0.035, 2.8], [-0.085, 0.27, 0.035, 1.9],
    [0.09, 0.27, 0.03, 0.2], [0.0, 0.26, -0.04, 1]];
  for (let i = 0; i < Math.min(lemons + 2, spots.length); i++) { const [x, y, z, ry] = spots[i], l = createLemon({ seed: seed * 7 + i });
    l.position.set(x, y - LEMON.R, z); l.rotation.set((r() - 0.5) * 0.7, ry, (r() - 0.5) * 0.6); root.add(l); }
  root.userData.gripR = new THREE.Vector3(A, HH * 0.72, 0); root.userData.gripL = new THREE.Vector3(-A, HH * 0.72, 0);
  root.userData.grip = root.userData.gripR;
  return shadows(root);
}

// ============================================================================================================= VHS TAPE
/** VHS cassette (18.7 x 2.5 x 10.3 cm) lying flat, label spine toward +Z, reel window on top. grip = centre of the top. */
export function createVHSTape({ label = "BANK CAM 2 — 04/19/95" } = {}) {
  const W = 0.187, T = 0.025, D = 0.103, root = new THREE.Group(); root.name = "vhsTape";
  const shell = plain(0x161515, { roughness: 0.5, relief: 0.8 });
  const b = mesh(roundedBox(W, T, D, 0.002), shell, "vhsShell"); b.position.y = T / 2; root.add(b);
  const topTex = canvasTex(748, 412, (g, w, h) => {
    g.fillStyle = "#1b1a19"; g.fillRect(0, 0, w, h); const r = rng(8);
    for (let i = 0; i < 4000; i++) { g.fillStyle = `rgba(255,255,255,${r() * 0.03})`; g.fillRect(r() * w, r() * h, 2, 2); }
    g.fillStyle = "#0d0c0c"; g.fillRect(w * 0.27, h * 0.3, w * 0.46, h * 0.36);                                // window
    for (const [cx, rad] of [[0.37, 0.25], [0.63, 0.12]]) {                                                   // tape packs + hubs
      g.fillStyle = "#3a2618"; g.beginPath(); g.arc(w * cx, h * 0.48, h * rad, 0, TAU); g.fill();
      g.fillStyle = "#efefea"; g.beginPath(); g.arc(w * cx, h * 0.48, h * 0.075, 0, TAU); g.fill();
      g.fillStyle = "#202020"; for (let k = 0; k < 6; k++) { const a = (k / 6) * TAU; g.fillRect(w * cx + Math.cos(a) * h * 0.05 - 3, h * 0.48 + Math.sin(a) * h * 0.05 - 3, 6, 6); } }
    g.fillStyle = "rgba(255,255,255,0.08)"; g.beginPath(); g.moveTo(w * 0.29, h * 0.3); g.lineTo(w * 0.4, h * 0.3); g.lineTo(w * 0.3, h * 0.66); g.lineTo(w * 0.27, h * 0.66); g.fill();
    g.strokeStyle = "#2a2928"; g.lineWidth = 5; g.strokeRect(w * 0.27, h * 0.3, w * 0.46, h * 0.36);
    g.fillStyle = "#e9e3d0"; g.fillRect(w * 0.08, h * 0.74, w * 0.84, h * 0.2);                               // top label
    g.fillStyle = "#c33"; g.fillRect(w * 0.08, h * 0.74, w * 0.84, h * 0.025);
    g.fillStyle = "#2a2a6a"; g.font = `bold ${h * 0.09}px "Segoe Print", "Comic Sans MS", sans-serif`; g.textAlign = "center"; g.fillText(label, w / 2, h * 0.88);
    g.fillStyle = "#555"; g.font = `bold ${h * 0.05}px Arial`; g.fillText("T-120", w * 0.9, h * 0.12);
  });
  const top = mesh(new THREE.PlaneGeometry(W - 0.004, D - 0.004), new THREE.MeshStandardMaterial({ map: topTex, roughness: 0.45 }), "vhsTop");
  top.rotation.x = -Math.PI / 2; top.position.y = T + 0.0002; root.add(top);
  const win = mesh(roundedBox(W * 0.48, 0.0015, D * 0.38, 0.0006), new THREE.MeshStandardMaterial({ color: 0x223040, roughness: 0.03, transparent: true, opacity: 0.25, envMapIntensity: 2 }), "vhsWindow");
  win.position.set(0, T + 0.0006, D * (0.5 - 0.48) - 0.0001); root.add(win);
  const spineTex = canvasTex(748, 100, (g, w, h) => { g.fillStyle = "#1b1a19"; g.fillRect(0, 0, w, h); g.fillStyle = "#f1ece0"; g.fillRect(w * 0.1, h * 0.18, w * 0.62, h * 0.64);
    g.fillStyle = "#2a2a6a"; g.font = `bold ${h * 0.42}px "Segoe Print", "Comic Sans MS", sans-serif`; g.textBaseline = "middle"; g.fillText(label, w * 0.12, h * 0.52); });
  const spine = mesh(new THREE.PlaneGeometry(W - 0.006, T - 0.004), new THREE.MeshStandardMaterial({ map: spineTex, roughness: 0.5 }), "vhsSpine");
  spine.position.set(0, T / 2, D / 2 + 0.0002); root.add(spine);
  const flap = mesh(roundedBox(W * 0.9, 0.003, 0.004, 0.001), shell); flap.position.set(0, T * 0.55, -D / 2 - 0.0012); root.add(flap);
  root.userData.grip = new THREE.Vector3(0, T, 0);
  return shadows(root);
}

// ============================================================================================================ NEWSPAPER
/** Broadsheet front section (38 x 58 cm open, real 2 mm thickness), upright in XY facing +Z; origin = CENTRE OF THE FOLD.
 *  setOpen(k): 0 = folded in half (bottom half folded behind, masthead + headline + photo outside), 1 = opened flat (slight V).
 *  The photo (front page, above the fold) shows `photo` (any texture; printed black-and-white); setPhoto(tex) swaps it.
 *  Lay it on a desk with rotation.x = -PI/2. gripL / gripR = the side edges of the top half; grip = gripR. */
export function createNewspaper({ headline = "LEMON BANDIT CAUGHT", photo = null, masthead = "The Daily Chronicle" } = {}) {
  const W = 0.38, H = 0.58, T = 0.002, root = new THREE.Group(); root.name = "newspaper";
  const CW = 1024, CH = 1563, PH = { x: 0.04, y: 0.205, w: 0.58, h: 0.255 };   // photo rect (fractions of the page, from the top)
  const frontTex = canvasTex(CW, CH, (g, w, h) => {
    paperBg(g, w, h, "#e8e2d0", 31, 2); const m = w * 0.04;
    g.fillStyle = "#1b1916"; g.textAlign = "center";
    fitText(g, masthead, w - 2 * m, h * 0.065, (px) => `${px}px "Old English Text MT", "Times New Roman", serif`); g.fillText(masthead, w / 2, h * 0.075);
    g.fillRect(m, h * 0.09, w - 2 * m, 4); g.fillRect(m, h * 0.112, w - 2 * m, 2);
    g.font = `bold ${h * 0.012}px "Times New Roman", serif`; g.textAlign = "left"; g.fillText("WEDNESDAY, APRIL 19, 1995", m, h * 0.106);
    g.textAlign = "right"; g.fillText("FINAL EDITION · 35¢", w - m, h * 0.106); g.textAlign = "center";
    const hp = fitText(g, headline, w - 2 * m, h * 0.075, (px) => `900 ${px}px "Impact", "Arial Black", sans-serif`); g.fillText(headline, w / 2, h * 0.125 + hp * 0.95);
    g.font = `italic ${h * 0.017}px "Georgia", serif`; g.fillText("Robber thought lemon juice made him invisible to cameras", w / 2, h * 0.198);
    g.fillStyle = "#cfc9b8"; g.fillRect(w * PH.x, h * PH.y, w * PH.w, h * PH.h);                               // photo bed
    g.strokeStyle = "#1b1916"; g.lineWidth = 2; g.strokeRect(w * PH.x, h * PH.y, w * PH.w, h * PH.h);
    g.fillStyle = "#2b2824"; g.font = `italic ${h * 0.0115}px "Georgia", serif`; g.textAlign = "left";
    g.fillText("Security camera still from the second bank. Police say the suspect", w * PH.x, h * (PH.y + PH.h + 0.016));
    g.fillText("waved at the camera before leaving with the money.", w * PH.x, h * (PH.y + PH.h + 0.03));
    const cx = w * (PH.x + PH.w + 0.03), cw = w - m - cx;                                                    // side column
    g.fillStyle = "#1b1916"; g.font = `bold ${h * 0.02}px "Georgia", serif`; g.fillText("Police: 'He", cx, h * 0.225); g.fillText("smiled at us'", cx, h * 0.247);
    greek(g, cx, h * 0.262, cw, h * 0.24, h * 0.0105, 3);
    const cols = 5, gw = (w - 2 * m) / cols;
    for (let c = 0; c < cols; c++) { const x = m + c * gw; greek(g, x + 6, h * 0.53, gw - 18, h * 0.43, h * 0.0105, 10 + c);
      if (c) { g.fillStyle = "rgba(30,28,24,0.4)"; g.fillRect(x - 3, h * 0.53, 1.5, h * 0.43); } }
    g.fillStyle = "#1b1916"; g.font = `900 ${h * 0.026}px "Georgia", serif`; g.fillText("City budget vote delayed", m, h * 0.52);
    g.fillRect(m, h * 0.497, w - 2 * m, 2);
  });
  const backTex = canvasTex(CW, CH, (g, w, h) => {
    paperBg(g, w, h, "#e6e0ce", 33, 2); const m = w * 0.04, gw = (w - 2 * m) / 5;
    g.fillStyle = "#1b1916"; g.font = `bold ${h * 0.013}px "Times New Roman", serif`; g.fillText("A2 · THE DAILY CHRONICLE", m, h * 0.03); g.fillRect(m, h * 0.037, w - 2 * m, 2);
    for (let c = 0; c < 5; c++) greek(g, m + c * gw + 6, h * 0.05, gw - 18, h * 0.9, h * 0.0105, 40 + c);
    const ax = m + gw * 2, ay = h * 0.56, aw = gw * 3 - 10, ah = h * 0.36;                                     // the ad from shot 5
    g.fillStyle = "#f2eee2"; g.fillRect(ax, ay, aw, ah); g.lineWidth = 6; g.strokeRect(ax, ay, aw, ah);
    g.textAlign = "center"; g.fillStyle = "#1b1916"; fitText(g, "SECURITY CAMERAS", aw * 0.9, h * 0.04, (px) => `900 ${px}px "Impact", sans-serif`);
    g.fillText("SECURITY CAMERAS", ax + aw / 2, ay + ah * 0.18); g.fillText("EVERYWHERE!", ax + aw / 2, ay + ah * 0.32);
    g.save(); g.translate(ax + aw / 2, ay + ah * 0.6);                                                          // little camera drawing
    g.fillStyle = "#1b1916"; g.fillRect(-aw * 0.16, -ah * 0.1, aw * 0.3, ah * 0.17); g.beginPath(); g.moveTo(aw * 0.14, -ah * 0.06); g.lineTo(aw * 0.24, -ah * 0.12); g.lineTo(aw * 0.24, ah * 0.1); g.lineTo(aw * 0.14, ah * 0.04); g.fill();
    g.fillRect(-aw * 0.03, -ah * 0.22, aw * 0.03, ah * 0.12); g.fillStyle = "#c22"; g.beginPath(); g.arc(-aw * 0.11, -ah * 0.04, ah * 0.025, 0, TAU); g.fill(); g.restore();
    g.font = `bold ${h * 0.016}px "Arial", sans-serif`; g.fillText("Install today — call 555-0199", ax + aw / 2, ay + ah * 0.9);
  });
  const edgeTex = canvasTex(64, 64, (g, w, h) => { g.fillStyle = "#ddd6c2"; g.fillRect(0, 0, w, h); for (let y = 0; y < h; y += 4) { g.fillStyle = "rgba(120,110,90,0.5)"; g.fillRect(0, y, w, 1); } });
  const edge = new THREE.MeshStandardMaterial({ map: edgeTex, roughness: 0.9 });
  const half = (top) => {
    const f = frontTex.clone(), bk = backTex.clone(); for (const t of [f, bk]) { t.repeat.set(1, 0.5); t.offset.set(0, top ? 0.5 : 0); t.needsUpdate = true; }
    const m = mesh(new THREE.BoxGeometry(W, H / 2, T), [edge, edge, edge, edge, new THREE.MeshStandardMaterial({ map: f, roughness: 0.88 }),
      new THREE.MeshStandardMaterial({ map: bk, roughness: 0.88 })], top ? "pageTop" : "pageBottom");
    m.position.y = top ? H / 4 : -H / 4; return m;
  };
  const topG = new THREE.Group(), botG = new THREE.Group(); topG.add(half(true));
  const bp = new THREE.Group(); bp.position.z = -T / 2; const bm = half(false); bm.position.z = T / 2; bp.add(bm); botG.add(bp);   // hinge on the back face
  root.add(topG, botG);
  // photo (on the top half, printed greyscale)
  const photoMat = new THREE.MeshStandardMaterial({ map: photo, color: photo ? 0xffffff : 0x9a968c, roughness: 0.85 });
  photoMat.onBeforeCompile = (s) => { s.fragmentShader = s.fragmentShader.replace("#include <map_fragment>",
    "#include <map_fragment>\n{ float l = dot(diffuseColor.rgb, vec3(0.299,0.587,0.114)); diffuseColor.rgb = vec3(l) * vec3(0.93,0.91,0.86); }"); };
  const pw = W * PH.w, ph = H * PH.h, pm = mesh(new THREE.PlaneGeometry(pw, ph), photoMat, "newsPhoto");
  pm.position.set(-W / 2 + W * PH.x + pw / 2, H / 2 - H * PH.y - ph / 2, T / 2 + 0.0003); topG.add(pm);
  root.userData.setPhoto = (tex) => { photoMat.map = tex; photoMat.color.set(tex ? 0xffffff : 0x9a968c); photoMat.needsUpdate = true; };
  root.userData.setOpen = (k) => { const e = sstep(0, 1, k); bp.rotation.x = -(1 - e) * Math.PI + e * 0.12; topG.rotation.x = e * -0.06; };
  root.userData.setOpen(0);
  root.userData.gripR = new THREE.Vector3(W / 2 - 0.01, H * 0.2, 0); root.userData.gripL = new THREE.Vector3(-W / 2 + 0.01, H * 0.2, 0);
  root.userData.grip = root.userData.gripR;
  return shadows(root);
}

// ============================================================================================================= TEXTBOOK
/** Hardcover textbook (19 x 24.5 x 3.4 cm) lying flat, cover up; spine along Z at x = 0, closed book spans x 0..0.19.
 *  setOpen(k): the front cover + left page block swing over the spine (k = 1: open flat, left page at x < 0). The right-hand
 *  page shows `pagePhoto` (setPagePhoto(tex)) with the caption. Origin = bottom of the spine. grip = fore-edge (closed);
 *  gripL / gripR = the two outer edges of the open book. */
export function createTextbook({ title = "INTRODUCTION TO PSYCHOLOGY", pagePhoto = null, caption = "Dunning–Kruger effect" } = {}) {
  const W = 0.19, D = 0.245, C = 0.0032, Hb = 0.0138, OV = 0.004, mid = C + Hb, root = new THREE.Group(); root.name = "textbook";
  const cloth = plain(0x1d3f5c, { roughness: 0.6, relief: 0.7 });
  const coverTex = canvasTex(620, 800, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, "#1f4d74"); gr.addColorStop(1, "#14304a"); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.save(); g.translate(w * 0.56, h * 0.58); g.fillStyle = "rgba(255,255,255,0.08)"; for (let i = 6; i > 0; i--) { g.beginPath(); g.arc(0, 0, i * w * 0.06, 0, TAU); g.fill(); }
    g.fillStyle = "#f2b51f"; g.beginPath(); g.ellipse(-w * 0.02, -h * 0.02, w * 0.17, h * 0.16, 0, 0, TAU); g.fill();      // head profile
    g.beginPath(); g.moveTo(w * 0.12, -h * 0.03); g.lineTo(w * 0.2, h * 0.03); g.lineTo(w * 0.12, h * 0.05); g.fill(); g.fillRect(-w * 0.1, h * 0.1, w * 0.17, h * 0.12);
    g.strokeStyle = "#1f4d74"; g.lineWidth = 6; g.beginPath(); for (let a = 0; a < 14; a += 0.15) { const rr = 4 + a * 4.2; g.lineTo(-w * 0.03 + Math.cos(a) * rr, -h * 0.04 + Math.sin(a) * rr); } g.stroke();
    g.restore();
    g.fillStyle = "#ffffff"; g.textAlign = "left"; const lines = title.split(" ").reduce((a, wd) => { const l = a[a.length - 1]; if (l && (l + " " + wd).length <= 12) a[a.length - 1] = l + " " + wd; else a.push(wd); return a; }, []);
    lines.forEach((l, i) => { fitText(g, l, w * 0.84, h * 0.085, (px) => `900 ${px}px "Georgia", serif`); g.fillText(l, w * 0.08, h * 0.13 + i * h * 0.09); });
    g.fillStyle = "#f2b51f"; g.fillRect(w * 0.08, h * 0.15 + lines.length * h * 0.09 - h * 0.06, w * 0.3, 6);
    g.fillStyle = "#cfe0ee"; g.font = `italic ${h * 0.03}px "Georgia", serif`; g.fillText("Fourth Edition", w * 0.08, h * 0.93); g.textAlign = "right"; g.fillText("Hart · Lindqvist", w * 0.92, h * 0.93);
  });
  const pageEdge = canvasTex(256, 64, (g, w, h) => { g.fillStyle = "#efe9d8"; g.fillRect(0, 0, w, h); const r = rng(6);
    for (let y = 0; y < h; y += 2) { g.fillStyle = `rgba(140,128,100,${0.15 + r() * 0.3})`; g.fillRect(0, y, w, 1); } }, { srgb: true });
  const blockMat = new THREE.MeshStandardMaterial({ map: pageEdge, roughness: 0.9 });
  const pageDraw = (left) => (g, w, h) => {
    paperBg(g, w, h, "#f6f1e3", left ? 51 : 52, 0.4); const m = w * 0.1;
    g.fillStyle = "#1d3f5c"; g.font = `bold ${h * 0.018}px "Georgia", serif`; g.textAlign = left ? "left" : "right";
    g.fillText(left ? "248   CHAPTER 9 · THINKING AND INTELLIGENCE" : "KNOWING WHAT YOU DON'T KNOW   249", left ? m : w - m, h * 0.05);
    g.fillRect(m, h * 0.058, w - 2 * m, 2); g.textAlign = "left";
    if (left) { g.fillStyle = "#1d3f5c"; g.font = `bold ${h * 0.03}px "Georgia", serif`; g.fillText("9.4 Confidence and Competence", m, h * 0.11);
      greek(g, m, h * 0.14, w - 2 * m, h * 0.78, h * 0.019, 61, "rgba(40,40,46,0.6)"); }
    else { greek(g, m, h * 0.08, w - 2 * m, h * 0.1, h * 0.019, 62, "rgba(40,40,46,0.6)");
      g.fillStyle = "#d8d2c2"; g.fillRect(m, h * 0.2, w - 2 * m, h * 0.36); g.strokeStyle = "#333"; g.lineWidth = 2; g.strokeRect(m, h * 0.2, w - 2 * m, h * 0.36);
      g.fillStyle = "#1d3f5c"; g.font = `bold ${h * 0.022}px "Georgia", serif`; g.fillText("Figure 9.3", m, h * 0.6);
      g.fillStyle = "#2a2a30"; g.font = `italic ${h * 0.021}px "Georgia", serif`; g.fillText(caption + ":", m + w * 0.25, h * 0.6);
      g.font = `italic ${h * 0.018}px "Georgia", serif`; g.fillText("the less people know, the more sure they feel.", m, h * 0.628);
      greek(g, m, h * 0.67, w - 2 * m, h * 0.26, h * 0.019, 63, "rgba(40,40,46,0.6)"); }
  };
  const pageGeo = (facingUp) => {     // page surface with a gutter dip + gentle arch
    const g = new THREE.PlaneGeometry(W - 0.004, D - 0.004, 24, 1); g.translate((W - 0.004) / 2 + 0.002, 0, 0);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) { const x = p.getX(i); p.setZ(i, 0.0016 - 0.0014 * Math.exp(-x / 0.01) + 0.0025 * Math.sin(Math.PI * x / W)); }
    if (facingUp) { g.rotateX(-Math.PI / 2); }
    else { g.rotateX(Math.PI / 2); const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, 1 - uv.getX(i), 1 - uv.getY(i)); }
    g.computeVertexNormals(); return g;
  };
  // fixed half: back cover + right block + right page
  const back = mesh(roundedBox(W + OV, C, D + 2 * OV, 0.0012), cloth, "backCover"); back.position.set((W + OV) / 2, C / 2, 0); root.add(back);
  const rb = mesh(roundedBox(W - 0.003, Hb, D, 0.0008), blockMat, "rightBlock"); rb.position.set((W - 0.003) / 2 + 0.001, C + Hb / 2, 0); root.add(rb);
  const rPageMat = new THREE.MeshStandardMaterial({ map: canvasTex(620, 800, pageDraw(false)), roughness: 0.85 });
  const rPage = mesh(pageGeo(true), rPageMat, "rightPage"); rPage.position.y = mid + 0.0003; root.add(rPage);
  const photoMat = new THREE.MeshStandardMaterial({ map: pagePhoto, color: pagePhoto ? 0xffffff : 0xb8b2a4, roughness: 0.4 });
  const pw = (W - 0.004) * 0.8, ph = D * 0.36 * 0.99, ppx = 0.002 + (W - 0.004) * 0.1 + pw / 2;
  const photo = mesh(new THREE.PlaneGeometry(pw, ph), photoMat, "pagePhoto"); photo.rotation.x = -Math.PI / 2;
  photo.position.set(ppx, mid + 0.0003 + 0.0016 + 0.0025 * Math.sin(Math.PI * ppx / W) + 0.0004, -D / 2 + D * (0.2 + 0.18)); root.add(photo);
  // swinging half (pivot on the spine at page level)
  const swing = new THREE.Group(); swing.position.y = mid; root.add(swing);
  const lb = mesh(roundedBox(W - 0.003, Hb, D, 0.0008), blockMat, "leftBlock"); lb.position.set((W - 0.003) / 2 + 0.001, Hb / 2, 0); swing.add(lb);
  const front = mesh(roundedBox(W + OV, C, D + 2 * OV, 0.0012), cloth, "frontCover"); front.position.set((W + OV) / 2, Hb + C / 2, 0); swing.add(front);
  const coverPrint = mesh(new THREE.PlaneGeometry(W + OV - 0.004, D + 2 * OV - 0.004), new THREE.MeshStandardMaterial({ map: coverTex, roughness: 0.35 }), "coverPrint");
  coverPrint.rotation.x = -Math.PI / 2; coverPrint.position.set((W + OV) / 2, Hb + C + 0.0002, 0); swing.add(coverPrint);
  const lPage = mesh(pageGeo(false), new THREE.MeshStandardMaterial({ map: canvasTex(620, 800, pageDraw(true)), roughness: 0.85 }), "leftPage");
  lPage.position.y = -0.0003; swing.add(lPage);
  const sg = new THREE.CylinderGeometry(mid, mid, D + 2 * OV, 24, 1, true, Math.PI, Math.PI); sg.rotateX(Math.PI / 2);
  const spine = mesh(sg, new THREE.MeshStandardMaterial({ color: 0x1d3f5c, roughness: 0.6, side: THREE.DoubleSide, normalMap: cloth.normalMap, normalScale: cloth.normalScale }), "spine");
  spine.position.y = mid; root.add(spine);
  root.userData.setOpen = (k) => { const e = sstep(0, 1, k); swing.rotation.z = e * Math.PI;
    spine.scale.set(1 - 0.85 * e, 1 - 0.75 * e, 1); spine.position.y = mid - e * (mid * 0.62);
    rPage.scale.y = lPage.scale.y = 0.15 + 0.85 * e; rPage.visible = lPage.visible = e > 0.001; photo.visible = e > 0.001; };
  root.userData.setOpen(0);
  root.userData.setPagePhoto = (tex) => { photoMat.map = tex; photoMat.color.set(tex ? 0xffffff : 0xb8b2a4); photoMat.needsUpdate = true; };
  root.userData.grip = new THREE.Vector3(W, mid, 0);
  root.userData.gripR = new THREE.Vector3(W, C + Hb, 0); root.userData.gripL = new THREE.Vector3(-W, C + Hb, 0);
  return shadows(root);
}

// ======================================================================================================= SCREEN GRAPHICS
const MONO = (px) => `bold ${px}px "Consolas", "Courier New", monospace`;
let _grain = null;
function grainCanvas() {
  if (_grain) return _grain; const c = document.createElement("canvas"); c.width = c.height = 256; const g = c.getContext("2d"), d = g.createImageData(256, 256), r = rng(99);
  for (let i = 0; i < d.data.length; i += 4) { const v = r() * 255; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255; }
  g.putImageData(d, 0, 0); return (_grain = c);
}
function drawCover(g, src, x, y, w, h) {
  const im = imgOf(src); if (!im) return false; const iw = im.width || im.videoWidth, ih = im.height || im.videoHeight; if (!iw || !ih) return false;
  const s = Math.max(w / iw, h / ih), sw = w / s, sh = h / s; g.drawImage(im, (iw - sw) / 2, (ih - sh) / 2, sw, sh, x, y, w, h); return true;
}
function stamp(t, base = "04-19-95 14:32:07") {
  const [d, tm] = base.split(" "), [H, M, S] = tm.split(":").map(Number), s = H * 3600 + M * 60 + S + Math.floor(Math.max(0, t));
  const p = (n) => String(n).padStart(2, "0"); return `${d} ${p(Math.floor(s / 3600) % 24)}:${p(Math.floor(s / 60) % 60)}:${p(s % 60)}`;
}
function scanlines(g, w, h, a = 0.12, step = 3) { g.fillStyle = `rgba(0,0,0,${a})`; for (let y = 0; y < h; y += step) g.fillRect(0, y, w, Math.max(1, step / 3)); }
function vignette(g, w, h, a = 0.5) { const v = g.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.hypot(w, h) * 0.55);
  v.addColorStop(0, "rgba(0,0,0,0)"); v.addColorStop(1, `rgba(0,0,0,${a})`); g.fillStyle = v; g.fillRect(0, 0, w, h); }
const txt = (g, s, x, y, px, color = "#fff", align = "left", font = MONO, shadow = true) => { g.font = font(px); g.textAlign = align; g.textBaseline = "alphabetic";
  if (shadow) { g.fillStyle = "rgba(0,0,0,0.75)"; g.fillText(s, x + px * 0.07, y + px * 0.07); } g.fillStyle = color; g.fillText(s, x, y); };

/** Security-camera overlay on any canvas (screen or full frame): corner brackets, REC dot (blinks at 0.9 Hz with soft edges),
 *  counting timestamp, camera label, slow rolling band, moving grain, scanlines, vignette. Pure function of t.
 *  opts: { stamp: "04-19-95 14:32:07", cam: "CAM 02", grain: 0.07 }. Desaturate the picture under it with CCTV_CSS_FILTER. */
export function drawCCTVOverlay(g, w, h, t, opts = {}) {
  const u = Math.min(w, h), m = u * 0.06, L = u * 0.09, lw = Math.max(2, u * 0.008);
  g.save();
  const gy = (((t * 0.07) % 1.3) - 0.15) * h, band = g.createLinearGradient(0, gy - h * 0.08, 0, gy + h * 0.08);   // rolling band
  band.addColorStop(0, "rgba(255,255,255,0)"); band.addColorStop(0.5, "rgba(255,255,255,0.06)"); band.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = band; g.fillRect(0, gy - h * 0.08, w, h * 0.16);
  const gr = grainCanvas(); g.globalAlpha = opts.grain ?? 0.07; g.globalCompositeOperation = "overlay";
  const ox = (t * 37) % 256, oy = (t * 23) % 256; g.fillStyle = g.createPattern(gr, "repeat"); g.translate(-ox, -oy); g.fillRect(ox, oy, w, h); g.setTransform(1, 0, 0, 1, 0, 0);
  g.restore(); g.save();
  scanlines(g, w, h, 0.1, Math.max(3, Math.round(h / 320))); vignette(g, w, h, 0.45);
  g.strokeStyle = "rgba(255,255,255,0.9)"; g.lineWidth = lw; g.shadowColor = "rgba(0,0,0,0.6)"; g.shadowBlur = lw * 1.5;
  for (const [x, y, sx, sy] of [[m, m, 1, 1], [w - m, m, -1, 1], [m, h - m, 1, -1], [w - m, h - m, -1, -1]]) {
    g.beginPath(); g.moveTo(x, y + sy * L); g.lineTo(x, y); g.lineTo(x + sx * L, y); g.stroke(); }
  g.beginPath(); g.moveTo(w / 2 - L * 0.3, h / 2); g.lineTo(w / 2 + L * 0.3, h / 2); g.moveTo(w / 2, h / 2 - L * 0.3); g.lineTo(w / 2, h / 2 + L * 0.3); g.globalAlpha = 0.5; g.stroke(); g.globalAlpha = 1;
  g.shadowBlur = 0;
  const px = u * 0.05, ph = (t * 0.9) % 1, on = sstep(0, 0.06, ph) * (1 - sstep(0.55, 0.61, ph));               // 0.9 Hz, soft edges
  g.fillStyle = `rgba(235,30,25,${0.15 + 0.85 * on})`; g.beginPath(); g.arc(m + L * 0.55 + px * 0.4, m + L * 0.55 + px * 0.35, px * 0.38, 0, TAU); g.fill();
  txt(g, "REC", m + L * 0.55 + px * 1.05, m + L * 0.55 + px * 0.7, px);
  txt(g, opts.cam || "CAM 02", w - m - L * 0.4, m + L * 0.55 + px * 0.7, px, "#fff", "right");
  txt(g, stamp(t, opts.stamp), m + L * 0.4, h - m - L * 0.45, px * 0.95);
  g.restore();
}
/** CSS/canvas filter that turns the live 3D render into security-camera grey (apply to the 3D canvas under drawCCTVOverlay). */
export const CCTV_CSS_FILTER = "grayscale(0.85) sepia(0.12) contrast(1.18) brightness(1.06)";

/** VHS rewind look at strength k (0 = nothing drawn): horizontal tracking streaks, a noise band, chroma ghost lines, a cold
 *  tint and the "◀◀ REW" label. Streaks move smoothly with t (no per-frame randomness). */
export function drawRewind(g, w, h, k, t = 0) {
  const e = cl01(k); if (e <= 0.001) return; g.save();
  g.fillStyle = `rgba(30,40,90,${0.16 * e})`; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 34; i++) {
    const sp = 0.35 + hash(i) * 0.9, y = (((hash(i + 50) + t * sp) % 1) + 1) % 1 * h, th = h * (0.002 + 0.01 * hash(i + 9));
    const x0 = hash(i + 3) * w * 0.6, len = w * (0.25 + 0.75 * hash(i + 7)), a = (0.25 + 0.5 * hash(i + 11)) * e;
    const c = i % 5 === 0 ? `rgba(255,80,220,${a * 0.6})` : i % 7 === 0 ? `rgba(80,240,255,${a * 0.6})` : `rgba(255,255,255,${a})`;
    const gr = g.createLinearGradient(x0, 0, x0 + len, 0); gr.addColorStop(0, "rgba(255,255,255,0)"); gr.addColorStop(0.15, c); gr.addColorStop(0.85, c); gr.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = gr; g.fillRect(x0, y, len, th);
  }
  const by = (((t * 0.45) % 1.2) - 0.1) * h, bh = h * 0.07;                                                        // tracking noise band
  g.fillStyle = `rgba(255,255,255,${0.08 * e})`; g.fillRect(0, by, w, bh);
  for (let i = 0; i < 160; i++) { const x = (((hash(i + 200) + t * (2 + hash(i) * 3)) % 1) + 1) % 1 * w, y = by + hash(i + 300) * bh;
    g.fillStyle = `rgba(255,255,255,${(0.3 + 0.6 * hash(i + 400)) * e})`; g.fillRect(x, y, w * (0.005 + 0.03 * hash(i + 500)), Math.max(1, h * 0.0015)); }
  scanlines(g, w, h, 0.12 * e, Math.max(3, Math.round(h / 320)));
  const u = Math.min(w, h), px = u * 0.075; g.globalAlpha = e;
  txt(g, "◀◀ REW", u * 0.07, u * 0.07 + px, px, "#ffffff", "left", (p) => `bold ${p}px "Consolas", "Segoe UI Symbol", monospace`);
  const s = Math.max(0, 47 - Math.floor(t * 9)), p2 = (n) => String(n).padStart(2, "0");
  txt(g, `SP  0:${p2(Math.floor(s / 60))}:${p2(s % 60)}`, w - u * 0.07, h - u * 0.08, px * 0.6, "#ffffff", "right");
  g.restore();
}

function silhouette(g, cx, by, s, suit = "#1c2a44", tie = "#b02a2a", point = 0) {       // cartoon presenter: white head, brown outline
  g.save(); g.translate(cx, by); g.lineWidth = s * 0.03; g.strokeStyle = "#1c130f";
  g.fillStyle = suit; g.beginPath(); g.ellipse(0, -s * 0.38, s * 0.42, s * 0.48, 0, Math.PI, 0); g.lineTo(s * 0.42, 0); g.lineTo(-s * 0.42, 0); g.closePath(); g.fill();
  g.fillStyle = "#f2efe8"; g.beginPath(); g.moveTo(-s * 0.1, -s * 0.85); g.lineTo(s * 0.1, -s * 0.85); g.lineTo(0, -s * 0.62); g.fill();
  g.fillStyle = tie; g.beginPath(); g.moveTo(-s * 0.035, -s * 0.84); g.lineTo(s * 0.035, -s * 0.84); g.lineTo(s * 0.05, -s * 0.55); g.lineTo(0, -s * 0.5); g.lineTo(-s * 0.05, -s * 0.55); g.fill();
  if (point) { g.strokeStyle = "#1c130f"; g.lineWidth = s * 0.035; g.beginPath(); g.moveTo(s * 0.3, -s * 0.6); g.lineTo(s * 0.62, -s * 0.85); g.lineTo(s * 0.66, -s * 0.8); g.stroke(); g.lineWidth = s * 0.03; }
  g.fillStyle = "#f7f6f2"; g.beginPath(); g.arc(0, -s * 1.12, s * 0.27, 0, TAU); g.fill(); g.stroke();
  g.fillStyle = "#1c130f"; for (const x of [-0.09, 0.09]) { g.beginPath(); g.ellipse(x * s, -s * 1.15, s * 0.025, s * 0.04, 0, 0, TAU); g.fill(); }
  g.beginPath(); g.arc(0, -s * 1.06, s * 0.09, 0.2, Math.PI - 0.2); g.stroke();
  g.restore();
}
function channelBug(g, w, h, u) {
  const x = w - u * 0.06, y = u * 0.06, r = u * 0.055; g.save(); g.globalAlpha = 0.9;
  g.fillStyle = "#ffffff"; g.beginPath(); g.arc(x - r, y + r, r, 0, TAU); g.fill();
  g.fillStyle = "#1a3d8f"; g.font = `900 ${r * 1.5}px "Arial Black", sans-serif`; g.textAlign = "center"; g.fillText("4", x - r, y + r * 1.52);
  txt(g, "CHANNEL", x - r * 2.25, y + r * 1.25, r * 0.6, "#fff", "right", (p) => `900 ${p}px "Arial Black", sans-serif`); g.restore();
}
function newsBg(g, w, h, t) {
  const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, "#0f2a66"); gr.addColorStop(1, "#071434"); g.fillStyle = gr; g.fillRect(0, 0, w, h);
  g.save(); g.globalAlpha = 0.12; g.strokeStyle = "#7fb0ff"; g.lineWidth = 1.5;
  for (let i = -10; i < 30; i++) { const x = ((i * w * 0.06 + t * 6) % (w * 1.6)) - w * 0.3; g.beginPath(); g.moveTo(x, 0); g.lineTo(x - w * 0.3, h); g.stroke(); }
  g.globalAlpha = 0.08; g.fillStyle = "#fff"; g.beginPath(); g.arc(w * 0.75, h * 0.35, h * 0.45, 0, TAU); g.fill(); g.restore();
}
/** Screen canvas for TVs / CCTV monitors. createScreen(widthPx = 640, heightPx = 480) -> { canvas, texture, draw(mode, t, opts),
 *  createMesh(wMetres, hMetres, { bulge, brightness }) }. Call draw() every frame with the scene time t (s). Modes + opts:
 *  "cctv"    { source (image|canvas|texture), stamp, cam }      security monitor (picture desaturated, overlay on top)
 *  "news"    { photo, anchor (image|null), banner 0..1, title, ticker }   11 o'clock news with the suspect photo + IN FULL COLOR banner
 *  "weather" { presenter (image|null), point 0..1 }              weather map with drifting clouds, spinning sun, temperatures
 *  "vhs"     { source, rew 0..1 }                                 tape playback: PLAY / counter / tracking lines; rew blends drawRewind
 *  "off"     {}                                                   dark glass. */
export function createScreen(width = 640, height = 480) {
  const canvas = document.createElement("canvas"); canvas.width = width; canvas.height = height;
  const g = canvas.getContext("2d"), texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; texture.anisotropy = 8;
  const w = width, h = height, u = Math.min(w, h);
  const sub = document.createElement("canvas"), sg = sub.getContext("2d");
  function draw(mode, t = 0, o = {}) {
    g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = "source-over"; g.filter = "none";
    if (mode === "cctv") {
      g.fillStyle = "#222"; g.fillRect(0, 0, w, h); g.filter = CCTV_CSS_FILTER;
      if (!drawCover(g, o.source, 0, 0, w, h)) { g.fillStyle = "#6b6e6a"; g.fillRect(0, 0, w, h); g.fillStyle = "#4b4e4a"; g.fillRect(0, h * 0.62, w, h * 0.38);
        g.fillStyle = "#8a8d88"; g.fillRect(w * 0.1, h * 0.25, w * 0.8, h * 0.37); g.fillStyle = "#5a5d59"; for (let i = 0; i < 4; i++) g.fillRect(w * (0.14 + i * 0.2), h * 0.3, w * 0.14, h * 0.32); }
      g.filter = "none"; drawCCTVOverlay(g, w, h, t, o);
    } else if (mode === "news") {
      newsBg(g, w, h, t);
      const px = w * 0.53, py = h * 0.2, pw = w * 0.39, ph = h * 0.42;
      if (sub.width !== Math.round(pw)) { sub.width = Math.round(pw); sub.height = Math.round(ph); }
      sg.setTransform(1, 0, 0, 1, 0, 0); sg.clearRect(0, 0, sub.width, sub.height);
      if (!drawCover(sg, o.photo, 0, 0, sub.width, sub.height)) { sg.fillStyle = "#5a6066"; sg.fillRect(0, 0, sub.width, sub.height); silhouette(sg, sub.width / 2, sub.height * 1.05, sub.height * 0.7, "#e2b81e", "#e2b81e"); }
      g.fillStyle = "#f3efe3"; g.fillRect(px - u * 0.012, py - u * 0.012, pw + u * 0.024, ph + u * 0.024); g.drawImage(sub, px, py, pw, ph);
      txt(g, "SUSPECT", px + u * 0.015, py + u * 0.055, u * 0.04, "#ffd84a", "left", (p) => `900 ${p}px "Arial Black", sans-serif`);
      if (!drawCover(g, o.anchor, 0, 0, w * 0.5, h)) silhouette(g, w * 0.25, h * 0.8, h * 0.55);
      g.fillStyle = "#26324a"; g.fillRect(0, h * 0.74, w * 0.5, h * 0.04); g.fillStyle = "#3c4b6a"; g.fillRect(0, h * 0.74, w * 0.5, h * 0.008);   // desk
      const ly = h * 0.78, lh = h * 0.16;                                                                      // lower third
      g.fillStyle = "#c8161c"; g.fillRect(0, ly, w * 0.42, lh * 0.45); g.fillStyle = "#f4f4f4"; g.fillRect(0, ly + lh * 0.45, w, lh * 0.55);
      txt(g, "11 O'CLOCK NEWS", u * 0.04, ly + lh * 0.34, lh * 0.3, "#fff", "left", (p) => `900 ${p}px "Arial Black", sans-serif`, false);
      g.save(); g.beginPath(); g.rect(0, ly + lh * 0.45, w, lh * 0.55); g.clip();
      const tk = o.ticker || "LEMON JUICE BANDIT ROBS TWO BANKS  ·  POLICE RELEASE SECURITY PHOTOS  ·  ", tw = (g.font = `900 ${lh * 0.3}px "Arial", sans-serif`, g.measureText(tk).width);
      const sx = -((t * w * 0.12) % tw); g.fillStyle = "#14223f"; g.fillText(tk + tk + tk, sx + u * 0.04, ly + lh * 0.84); g.restore();
      if ((o.banner ?? 0) > 0.001) {                                                                            // IN FULL COLOR banner
        const b = cl01(o.banner), e = 1 + 2.2 * Math.pow(b - 1, 3) + 1.2 * Math.pow(b - 1, 2), bx = w * (1.05 - 0.6 * e), by = py + ph * 0.66;
        g.save(); g.translate(bx, by); g.rotate(-0.06); g.fillStyle = "#ffd21f"; g.fillRect(0, 0, w * 0.55, h * 0.12);
        g.fillStyle = "#c8161c"; g.fillRect(0, 0, w * 0.02, h * 0.12);
        txt(g, "IN FULL COLOR", w * 0.045, h * 0.088, h * 0.07, "#1a1a1a", "left", (p) => `900 ${p}px "Arial Black", sans-serif`, false); g.restore(); }
      channelBug(g, w, h, u);
      txt(g, "LIVE", u * 0.06, u * 0.1, u * 0.045, "#fff", "left", (p) => `900 ${p}px "Arial Black", sans-serif`);
      g.fillStyle = "#e01b1b"; g.beginPath(); g.arc(u * 0.04, u * 0.085, u * 0.012, 0, TAU); g.fill();
    } else if (mode === "weather") {
      const sea = g.createLinearGradient(0, 0, 0, h); sea.addColorStop(0, "#3d7fc4"); sea.addColorStop(1, "#285f9e"); g.fillStyle = sea; g.fillRect(0, 0, w, h);
      const land = (pts, c) => { g.fillStyle = c; g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x * w, y * h) : g.moveTo(x * w, y * h))); g.closePath(); g.fill();
        g.strokeStyle = "rgba(255,255,255,0.5)"; g.lineWidth = u * 0.004; g.stroke(); };
      land([[0.3, 0.05], [0.95, 0.04], [1.0, 0.75], [0.82, 0.78], [0.7, 0.62], [0.55, 0.7], [0.42, 0.55], [0.35, 0.32]], "#7bb35a");
      land([[0.6, 0.15], [0.8, 0.12], [0.88, 0.35], [0.7, 0.42], [0.58, 0.3]], "#9cc26b");
      g.strokeStyle = "rgba(60,120,200,0.9)"; g.lineWidth = u * 0.012; g.beginPath(); g.moveTo(w * 0.45, h * 0.1); g.quadraticCurveTo(w * 0.62, h * 0.35, w * 0.9, h * 0.5); g.stroke();
      const icon = (x, y, kind, temp, i) => { const s = u * 0.07;
        if (kind !== "cloud") { g.save(); g.translate(x, y); g.rotate(t * 0.4 + i); g.fillStyle = "#ffd21f"; for (let k = 0; k < 8; k++) { g.rotate(TAU / 8); g.fillRect(-s * 0.06, s * 0.62, s * 0.12, s * 0.3); }
          g.beginPath(); g.arc(0, 0, s * 0.5, 0, TAU); g.fill(); g.restore(); }
        if (kind !== "sun") { const dx = Math.sin(t * 0.5 + i) * s * 0.15; g.fillStyle = "#f4f6f8"; g.strokeStyle = "rgba(0,0,0,0.25)"; g.lineWidth = 2;
          g.beginPath(); g.arc(x + dx - s * 0.35, y + s * 0.2, s * 0.32, 0, TAU); g.arc(x + dx, y, s * 0.42, 0, TAU); g.arc(x + dx + s * 0.4, y + s * 0.18, s * 0.3, 0, TAU); g.fill(); }
        txt(g, temp, x, y + s * 1.25, s * 0.55, "#fff", "center", (p) => `900 ${p}px "Arial Black", sans-serif`); };
      icon(w * 0.58, h * 0.22, "sun", "72°", 0); icon(w * 0.82, h * 0.25, "both", "68°", 1); icon(w * 0.7, h * 0.48, "cloud", "65°", 2); icon(w * 0.9, h * 0.6, "sun", "70°", 3);
      if (!drawCover(g, o.presenter, 0, 0, w * 0.45, h)) silhouette(g, w * 0.2, h * 0.86, h * 0.5, "#4a2a18", "#2a6ad0", 0.3 + 0.7 * cl01(o.point ?? 1));
      g.fillStyle = "#c8161c"; g.fillRect(0, h * 0.84, w * 0.36, h * 0.09); g.fillStyle = "#f4f4f4"; g.fillRect(w * 0.36, h * 0.84, w * 0.64, h * 0.09);
      txt(g, "WEATHER", u * 0.04, h * 0.905, h * 0.055, "#fff", "left", (p) => `900 ${p}px "Arial Black", sans-serif`, false);
      txt(g, "SUNNY TOMORROW · HIGH 72°", w * 0.39, h * 0.905, h * 0.045, "#14223f", "left", (p) => `900 ${p}px "Arial", sans-serif`, false);
      channelBug(g, w, h, u);
    } else if (mode === "vhs") {
      if (!drawCover(g, o.source, 0, 0, w, h)) { g.fillStyle = "#1730b8"; g.fillRect(0, 0, w, h); }
      else { g.globalAlpha = 0.18; g.globalCompositeOperation = "screen"; g.filter = "hue-rotate(120deg)"; drawCover(g, o.source, u * 0.008, 0, w, h);
        g.filter = "none"; g.globalAlpha = 1; g.globalCompositeOperation = "source-over"; }
      const by = h * 0.86 + Math.sin(t * 1.3) * h * 0.02;                                                        // tracking lines
      for (let i = 0; i < 40; i++) { const x = (((hash(i) + t * (0.3 + hash(i + 9))) % 1) + 1) % 1 * w;
        g.fillStyle = `rgba(255,255,255,${0.25 + 0.5 * hash(i + 3)})`; g.fillRect(x, by + hash(i + 5) * h * 0.06, w * (0.01 + 0.05 * hash(i + 7)), Math.max(1, h * 0.004)); }
      g.fillStyle = "rgba(255,255,255,0.06)"; g.fillRect(0, by, w, h * 0.06);
      scanlines(g, w, h, 0.1, Math.max(2, Math.round(h / 240)));
      const px = u * 0.075; txt(g, "PLAY ▶", u * 0.06, u * 0.06 + px, px, "#fff", "left", (p) => `bold ${p}px "Consolas", "Segoe UI Symbol", monospace`);
      const s = Math.floor(12 + t), p2 = (n) => String(n).padStart(2, "0"); txt(g, `SP  0:${p2(Math.floor(s / 60))}:${p2(s % 60)}`, w - u * 0.06, h - u * 0.06, px * 0.6, "#fff", "right");
      if ((o.rew ?? 0) > 0) drawRewind(g, w, h, o.rew, t);
    } else { g.fillStyle = "#0b0d0e"; g.fillRect(0, 0, w, h); const r = g.createRadialGradient(w * 0.3, h * 0.25, 0, w * 0.3, h * 0.25, w * 0.6);
      r.addColorStop(0, "rgba(255,255,255,0.08)"); r.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = r; g.fillRect(0, 0, w, h); }
    if (mode !== "off") vignette(g, w, h, 0.35);
    g.restore(); texture.needsUpdate = true;
  }
  /** Glowing screen plane (wMetres x hMetres, facing +Z, origin = centre). bulge = CRT curvature (m). brightness > 1 blooms. */
  function createMesh(wm = 0.4, hm = 0.3, { bulge = 0.012, brightness = 1.0 } = {}) {
    const geo = new THREE.PlaneGeometry(wm, hm, 24, 18), p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) { const x = p.getX(i) / (wm / 2), y = p.getY(i) / (hm / 2); p.setZ(i, bulge * (1 - 0.5 * (x * x + y * y))); }
    geo.computeVertexNormals();
    const m = mesh(geo, new THREE.MeshBasicMaterial({ map: texture, color: new THREE.Color(brightness, brightness, brightness), toneMapped: false }), "screen");
    m.castShadow = false; m.receiveShadow = false;
    const glass = mesh(geo, new THREE.MeshStandardMaterial({ color: 0x000000, roughness: 0.08, metalness: 0, transparent: true, opacity: 0.12, envMapIntensity: 1.5, depthWrite: false }), "screenGlass");
    glass.position.z = 0.0008; m.add(glass); return m;
  }
  draw("off", 0); return { canvas, texture, draw, createMesh, width, height };
}

/** Cartoon "suspect" picture for tests/placeholders (yellow tracksuit, white face, smirk, lemon slice on the cheek). */
export function createPlaceholderPhoto(w = 512, h = 512, { bg = "#7a8288" } = {}) {
  return canvasTex(w, h, (g) => { g.fillStyle = bg; g.fillRect(0, 0, w, h); g.fillStyle = "rgba(255,255,255,0.12)"; g.fillRect(0, 0, w, h * 0.45);
    silhouette(g, w / 2, h * 1.08, h * 0.75, "#f0c419", "#f0c419");
    g.fillStyle = "#f6d23a"; g.strokeStyle = "#e0ae12"; g.lineWidth = w * 0.01; g.beginPath(); g.arc(w * 0.62, h * 0.27, w * 0.045, 0, TAU); g.fill(); g.stroke();
    g.fillStyle = "rgba(255,255,255,0.6)"; for (const [x, y] of [[0.4, 0.2], [0.58, 0.16], [0.45, 0.33]]) { g.beginPath(); g.ellipse(w * x, h * y, w * 0.01, w * 0.02, 0.3, 0, TAU); g.fill(); } });
}
