// Video 4 hero car + water bottle (agent B, 2026-11-23).
//   buildHeroCar(opts)  -> THREE.Group: white-silver compact 4-door sedan (~4.3 m), origin = ground centre, nose toward -z,
//                          driver = left = -x. Full interior seen through clear glass. set({ door 0..1 }) opens the driver door.
//                          anchors (CAR-LOCAL): driverSeatTop, seatBurnPoint, seatNormal, doorHandle, driverDoorOpenSpot,
//                          views { throughWindshield, seatMacro, sideWindow, doorOpen } = { pos, target, fov }.
//                          toWorld(view, carGroup) -> same view in world space.  getDoorHandle(v) -> current (moving) handle.
//   createBottle(opts)  -> clear 0.5 L bottle (ridges, blue label ring, cap, water). Default lying on its side: origin = the
//                          contact point under the body, axis along local +x (cap toward +x). lying:false = upright, origin
//                          at the base centre. set({ rock: t, amp }) = deterministic small roll; userData.focusShift (m, local
//                          z of the focused dot) follows the roll. userData.grip = finger-hook point (neck).
// All set() are pure functions of their inputs. No Math.random (seeded rng only).
import * as THREE from "three";
// 2026-11-24: buildHeroCar = the toy car (toycar.js, same API + anchors); the previous builder stays as buildHeroCarOld
export { buildToyCar as buildHeroCar } from "./toycar.js";
import { mergeVertices } from "three/addons/utils/BufferGeometryUtils.js";
import { roundedBox, place, boxUV, tube } from "../geometry.js";
import { plain, canvasTex, noiseNormal } from "../materials.js";
import { rng } from "../../shared/assets.js";

const cl = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const ss = (a, b, x) => { const u = cl((x - a) / (b - a)); return u * u * (3 - 2 * u); };
const V = (x, y, z) => new THREE.Vector3(x, y, z);

// ------------------------------------------------------------------------------------------------ fake glass (cheap)
// Premultiplied: rgb = sky reflection (fresnel) + sun glint + faint tint, alpha = how much it hides what is behind.
// No transmission pass, no env needed: the sky gradient is analytic (matches the v04 noon sky).
const GLASS_VS = /* glsl */ `
varying vec3 vW; varying vec3 vN;
void main(){ vec4 w = modelMatrix*vec4(position,1.0); vW = w.xyz; vN = normalize(mat3(modelMatrix)*normal); gl_Position = projectionMatrix*viewMatrix*w; }`;
const GLASS_FS = /* glsl */ `
uniform vec3 tint, skyZ, skyH, ground, sunDir; uniform float baseA, reflK, sunK, streak, rim, fr0;
varying vec3 vW; varying vec3 vN;
void main(){
  vec3 V = normalize(cameraPosition - vW); vec3 N = normalize(vN); if (dot(N, V) < 0.0) N = -N;
  float ndv = clamp(dot(N, V), 0.0, 1.0); float fr = fr0 + (1.0 - fr0)*pow(1.0 - ndv, 3.0);
  vec3 R = reflect(-V, N);
  vec3 sky = R.y > 0.0 ? mix(skyH, skyZ, pow(clamp(R.y, 0.0, 1.0), 0.6)) : mix(skyH*0.7, ground, clamp(-R.y*4.0, 0.0, 1.0));
  float st = smoothstep(0.6, 0.95, sin((vW.x*0.7 + vW.z*0.9 + vW.y*1.6)*5.0)) * streak;     // soft diagonal glints
  float sun = pow(max(dot(R, normalize(sunDir)), 0.0), 220.0)*sunK + pow(max(dot(R, normalize(sunDir)), 0.0), 18.0)*sunK*0.02;
  float edge = pow(1.0 - ndv, 2.0)*rim;
  vec3 refl = sky*(fr*reflK + st*0.35) + vec3(1.0, 0.97, 0.9)*sun + vec3(0.9, 0.95, 1.0)*edge;
  float a = clamp(baseA + fr*reflK*0.55 + st*0.12 + edge*0.5, 0.0, 0.95);
  gl_FragColor = vec4(tint*baseA + refl, a);
}`;
export function fakeGlass({ tint = "#cfe3f2", baseA = 0.1, reflK = 0.9, sunK = 6, streak = 0.25, rim = 0, fr0 = 0.1, sunDir = [-0.35, 0.85, 0.4] } = {}) {
  const c = new THREE.Color(tint);
  return new THREE.ShaderMaterial({ transparent: true, premultipliedAlpha: true, depthWrite: false, side: THREE.DoubleSide,
    uniforms: { tint: { value: V(c.r, c.g, c.b) }, skyZ: { value: V(0.13, 0.32, 0.85) }, skyH: { value: V(0.55, 0.72, 0.95) },
      ground: { value: V(0.08, 0.09, 0.1) }, sunDir: { value: V(...sunDir) }, baseA: { value: baseA }, reflK: { value: reflK },
      sunK: { value: sunK }, streak: { value: streak }, rim: { value: rim }, fr0: { value: fr0 } },
    vertexShader: GLASS_VS, fragmentShader: GLASS_FS });
}

// ------------------------------------------------------------------------------------------------ leather texture
let _leather = null;
/** Stitched leather: vertical pleats (channels) with thread stitches. Returns { map, bump } (canvas, 512^2). */
export function leatherTextures() {
  if (_leather) return _leather;
  const r = rng(77);
  const pleats = 5;
  const map = canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = "#2a2c30"; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 2600; i++) { g.fillStyle = `rgba(${r() < 0.5 ? "255,255,255" : "0,0,0"},${0.025 + r() * 0.03})`; g.fillRect(r() * w, r() * h, 2 + r() * 3, 2 + r() * 3); }
    for (let p = 0; p < pleats; p++) {          // pleat shading: lighter crown, darker valleys
      const x0 = (p / pleats) * w, pw = w / pleats, gr = g.createLinearGradient(x0, 0, x0 + pw, 0);
      gr.addColorStop(0, "rgba(0,0,0,0.35)"); gr.addColorStop(0.5, "rgba(255,255,255,0.06)"); gr.addColorStop(1, "rgba(0,0,0,0.35)");
      g.fillStyle = gr; g.fillRect(x0, 0, pw, h);
    }
    g.strokeStyle = "rgba(120,126,136,0.6)"; g.lineWidth = 1.6;     // thread stitches along each seam + a cross seam
    for (let p = 0; p <= pleats; p++) { const x = (p / pleats) * w;
      for (const o of [-7, 7]) for (let y = 4; y < h; y += 14) { g.beginPath(); g.moveTo(x + o, y); g.lineTo(x + o, y + 8); g.stroke(); } }
    for (const yy of [h * 0.18, h * 0.82]) for (let x = 4; x < w; x += 14) { g.beginPath(); g.moveTo(x, yy); g.lineTo(x + 8, yy); g.stroke(); }
  });
  const bump = canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = "#000"; g.fillRect(0, 0, w, h);
    for (let p = 0; p < pleats; p++) {
      const x0 = (p / pleats) * w, pw = w / pleats, gr = g.createLinearGradient(x0, 0, x0 + pw, 0);
      gr.addColorStop(0, "#202020"); gr.addColorStop(0.12, "#9a9a9a"); gr.addColorStop(0.5, "#ffffff"); gr.addColorStop(0.88, "#9a9a9a"); gr.addColorStop(1, "#202020");
      g.fillStyle = gr; g.fillRect(x0, 0, pw, h);
    }
    g.fillStyle = "#101010"; for (const yy of [h * 0.18, h * 0.82]) g.fillRect(0, yy - 3, w, 6);
    g.fillStyle = "rgba(0,0,0,0.25)"; for (let p = 0; p <= pleats; p++) { const x = (p / pleats) * w; for (const o of [-7, 7]) for (let y = 4; y < h; y += 14) g.fillRect(x + o - 1, y, 2, 7); }
    g.filter = "blur(1.5px)"; g.drawImage(g.canvas, 0, 0); g.filter = "none";
  }, { srgb: false });
  return (_leather = { map, bump });
}
export function leatherMaterial(color = "#ffffff") {
  const { map, bump } = leatherTextures();
  return new THREE.MeshStandardMaterial({ color: new THREE.Color(color), map, bumpMap: bump, bumpScale: 3, roughness: 0.5, metalness: 0, envMapIntensity: 0.9 });
}

// ------------------------------------------------------------------------------------------------ helpers
const mesh = (g, m, cast = true, recv = true) => { const o = new THREE.Mesh(g, m); o.castShadow = cast; o.receiveShadow = recv; return o; };
/** Box from a to b (centre line) with cross-section w x h, rotated so its long axis follows a->b. */
function beam(a, b, w, h) {
  const d = b.clone().sub(a), L = d.length(), g = roundedBox(w, L, h, Math.min(w, h) * 0.45);
  const q = new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), d.normalize());
  g.applyQuaternion(q); const m = a.clone().add(b).multiplyScalar(0.5); g.translate(m.x, m.y, m.z); return g;
}
/** Flat polygon in the car's side plane: pts = [[z, y], ...] at x. */
function sidePoly(pts, x) {
  const s = new THREE.Shape(); pts.forEach(([z, y], i) => (i ? s.lineTo(z, y) : s.moveTo(z, y)));
  const g = new THREE.ShapeGeometry(s); g.rotateY(-Math.PI / 2); g.translate(x, 0, 0); return g;
}
function sideSlab(pts, x, t) {
  const s = new THREE.Shape(); pts.forEach(([z, y], i) => (i ? s.lineTo(z, y) : s.moveTo(z, y)));
  const g = new THREE.ExtrudeGeometry(s, { depth: t, bevelEnabled: true, bevelSize: 0.012, bevelThickness: 0.012, bevelSegments: 2 });
  g.translate(0, 0, -t / 2); g.rotateY(-Math.PI / 2); g.translate(x, 0, 0); return g;
}
/** Quad (4 corners, CCW-ish) -> two triangles with normals. */
function quad(a, b, c, d) {
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute([...a, ...b, ...c, ...a, ...c, ...d], 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute([0, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1], 2)); g.computeVertexNormals(); return g;
}

// ------------------------------------------------------------------------------------------------ soft-volume helpers
/** Inset a closed Shape by d (so an extrude with bevelSize d grows it back with round fillets). */
function insetShape(S, d) {
  let P = S.getPoints(10); const out = [];
  P = P.filter((p, i) => i === 0 || p.distanceTo(P[i - 1]) > 1e-4); if (P[0].distanceTo(P[P.length - 1]) < 1e-4) P.pop();
  let A = 0; for (let i = 0; i < P.length; i++) { const a = P[i], b = P[(i + 1) % P.length]; A += a.x * b.y - b.x * a.y; }
  const sgn = A > 0 ? 1 : -1, n = P.length;
  const en = (a, b) => { const e = b.clone().sub(a).normalize(); return new THREE.Vector2(e.y * sgn, -e.x * sgn); };   // outward
  for (let i = 0; i < n; i++) {
    const p = P[i], n1 = en(P[(i - 1 + n) % n], p), n2 = en(p, P[(i + 1) % n]), m = n1.clone().add(n2);
    if (m.lengthSq() < 1e-8) m.copy(n1); m.normalize();
    out.push(p.clone().addScaledVector(m, -d / Math.max(m.dot(n1), 0.4)));
  }
  return new THREE.Shape(out);
}
/** Rounded rectangle Shape in the side plane (z, y). */
function roundRect(z0, y0, z1, y1, r) {
  const s = new THREE.Shape(); r = Math.min(r, (z1 - z0) / 2, (y1 - y0) / 2);
  s.moveTo(z0 + r, y0); s.lineTo(z1 - r, y0); s.quadraticCurveTo(z1, y0, z1, y0 + r); s.lineTo(z1, y1 - r); s.quadraticCurveTo(z1, y1, z1 - r, y1);
  s.lineTo(z0 + r, y1); s.quadraticCurveTo(z0, y1, z0, y1 - r); s.lineTo(z0, y0 + r); s.quadraticCurveTo(z0, y0, z0 + r, y0); return s;
}
/** Soft slab in the side plane: outline (Shape or [[z, y]...]) with filleted edges, thickness t (x), fillet b, centred at x. */
function softSlab(shape, t, b, x = 0) {
  if (Array.isArray(shape)) { const s = new THREE.Shape(); shape.forEach(([z, y], i) => (i ? s.lineTo(z, y) : s.moveTo(z, y))); shape = s; }
  const dep = Math.max(t - 2 * b, 0.002);
  const g = new THREE.ExtrudeGeometry(insetShape(shape, b), { depth: dep, bevelEnabled: true, bevelSize: b, bevelThickness: b, bevelSegments: 4, curveSegments: 8 });
  g.translate(0, 0, -dep / 2); g.rotateY(-Math.PI / 2); g.translate(x, 0, 0); return boxUV(g, 0.5);   // planar UVs: no degenerate tangents under normal maps
}
/** Soft tapered pillar from a to b (radius r0 -> r1, rounded ends, flattened 0.7 across). */
function softPillar(a, b, r0, r1) {
  const d = b.clone().sub(a), L = d.length(), pts = [[0, 0], [r0 * 0.75, r0 * 0.15], [r0, r0 * 0.6]];
  for (let i = 1; i < 6; i++) { const u = i / 6; pts.push([r0 + (r1 - r0) * u, r0 * 0.6 + (L - r0 * 0.6 - r1 * 0.6) * u]); }
  pts.push([r1, L - r1 * 0.6], [r1 * 0.75, L - r1 * 0.15], [0, L]);
  const g = new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), 20); g.scale(0.7, 1, 1);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), d.normalize())); g.translate(a.x, a.y, a.z); return g;
}
/** Pillow roof: rounded-rectangle plan (x0..x1, z0..z1, corner r), thickness h with round edges, bottom at y0. */
function pillowRoof(x0, x1, z0, z1, y0, h, r) {
  const b = h * 0.42, s = new THREE.Shape(); r = Math.min(r, (x1 - x0) / 2, (z1 - z0) / 2);
  const Y0 = -z1, Y1 = -z0;
  s.moveTo(x0 + r, Y0); s.lineTo(x1 - r, Y0); s.quadraticCurveTo(x1, Y0, x1, Y0 + r); s.lineTo(x1, Y1 - r); s.quadraticCurveTo(x1, Y1, x1 - r, Y1);
  s.lineTo(x0 + r, Y1); s.quadraticCurveTo(x0, Y1, x0, Y1 - r); s.lineTo(x0, Y0 + r); s.quadraticCurveTo(x0, Y0, x0 + r, Y0);
  const dep = h - 2 * b, g = new THREE.ExtrudeGeometry(insetShape(s, b), { depth: dep, bevelEnabled: true, bevelSize: b, bevelThickness: b, bevelSegments: 5, curveSegments: 10 });
  g.rotateX(-Math.PI / 2); g.translate(0, y0 + b, 0); return boxUV(g, 0.5);
}

// ------------------------------------------------------------------------------------------------ toy "jellybean" shaping
// One global soft deform shared by every painted/glass part (so they keep fitting): sides barrel out below the belt,
// the greenhouse leans in (linear in y: flat glass stays flat), bonnet/boot and roof crown up in the middle.
/** Weld + smooth normals (ExtrudeGeometry is non-indexed = faceted). */
function smooth(g) {
  g.deleteAttribute("normal"); g.deleteAttribute("uv"); if (g.attributes.color) g.deleteAttribute("color");
  const m = mergeVertices(g, 1e-4); m.computeVertexNormals(); return m;
}
function jellyXYZ(v) {
  const { belt, roofY } = CAR; let { x, y } = v;
  const lo = Math.sin(Math.PI * cl((y - 0.22) / (belt - 0.22)));                   // barrel below the belt
  const up = cl((y - belt) / (roofY - belt));                                       // tumblehome (linear)
  const cr = ss(0.5, 0.78, y) * (1 - ss(belt + 0.06, belt + 0.14, y)) * 0.045 + ss(roofY - 0.03, roofY + 0.06, y) * 0.05;
  const ax = Math.min(1, (x / 0.92) ** 2);
  v.y = y + cr * (1 - ax);
  v.x = x * (1 + 0.03 * lo) * (1 - 0.1 * up);
  return v;
}
/** Apply the deform to a geometry that lives at offset `off` (door-local parts: off = hinge). Returns smoothed geometry. */
function jelly(g, off = [0, 0, 0], doSmooth = true) {
  if (doSmooth) g = smooth(g);
  const p = g.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) { v.set(p.getX(i) + off[0], p.getY(i) + off[1], p.getZ(i) + off[2]); jellyXYZ(v); p.setXYZ(i, v.x - off[0], v.y - off[1], v.z - off[2]); }
  g.computeVertexNormals(); return boxUV(g, 0.5);
}
/** Subdivided quad (bilinear, n x n) so deforms bend it smoothly. */
function gridQuad(a, b, c, d, n = 8) {
  const A = V(...a), B = V(...b), Cc = V(...c), D = V(...d), pos = [], uv = [], idx = [];
  for (let j = 0; j <= n; j++) for (let i = 0; i <= n; i++) { const u = i / n, w = j / n;
    const p = A.clone().lerp(B, u).lerp(D.clone().lerp(Cc, u), w); pos.push(p.x, p.y, p.z); uv.push(u, w); }
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) { const k = j * (n + 1) + i; idx.push(k, k + 1, k + n + 2, k, k + n + 2, k + n + 1); }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx); g.computeVertexNormals(); return g;
}
/** Thick soft window surround: a round tube along a filleted polygon. pts3 = Vector3 corners (closed). */
function softFrame(pts3, r = 0.032, fillet = 0.07) {
  const out = [], n = pts3.length;
  for (let i = 0; i < n; i++) {
    const p = pts3[i], a = pts3[(i - 1 + n) % n], b = pts3[(i + 1) % n];
    const da = a.clone().sub(p), db = b.clone().sub(p), f = Math.min(fillet, da.length() * 0.45, db.length() * 0.45);
    const p0 = p.clone().addScaledVector(da.normalize(), f), p1 = p.clone().addScaledVector(db.normalize(), f);
    for (let k = 0; k <= 6; k++) { const t = k / 6; out.push(p0.clone().multiplyScalar((1 - t) ** 2).addScaledVector(p, 2 * t * (1 - t)).addScaledVector(p1, t * t)); }
  }
  return tube(out, r, out.length * 3, 12, true);
}

// ------------------------------------------------------------------------------------------------ dimensions
export const CAR = {
  length: 4.3, width: 1.74, height: 1.45,
  wheelR: 0.32, wheelX: 0.76, frontZ: -1.38, rearZ: 1.4,
  belt: 0.98, roofY: 1.42, floorY: 0.3, seatTop: 0.56,
  driverX: -0.4, seatZ: 0.0, hinge: [-0.84, -0.84], doorLen: 1.04,
};

// ================================================================================================== buildHeroCar
export async function buildHeroCarOld({ paint = "#e8edf2", seed = 4, sunDir = [-0.35, 0.85, 0.4], name = "heroCar", interior = true } = {}) {
  const root = new THREE.Group(); root.name = name;
  const M = {
    // toy look: soft clay/plastic paint with a gentle clearcoat (broad soft highlights), satin "silver clay" instead of mirror chrome
    paint: new THREE.MeshPhysicalMaterial({ color: new THREE.Color(paint), roughness: 0.42, metalness: 0, clearcoat: 0.55, clearcoatRoughness: 0.28, envMapIntensity: 1.0 }),
    chrome: plain("#d4dae2", { roughness: 0.34, metalness: 0.55, relief: 0, envMapIntensity: 1.1 }),
    trim: plain("#2a2e35", { roughness: 0.62, relief: 0 }),
    rubber: plain("#2a2c31", { roughness: 0.85, relief: 0, envMapIntensity: 0.4 }),
    rim: plain("#e9edf2", { roughness: 0.4, metalness: 0.2, relief: 0, envMapIntensity: 1.0 }),
    plastic: plain("#8f8a82", { roughness: 0.75, relief: 0 }),
    plasticDk: plain("#6a665f", { roughness: 0.7, relief: 0 }),
    carpet: plain("#6a655e", { roughness: 0.95, relief: 0.4 }),
    liner: plain("#d8d2c6", { roughness: 0.9, relief: 0 }),
    leather: interior ? leatherMaterial("#2a2c30") : null,
    leatherPlain: new THREE.MeshStandardMaterial({ color: new THREE.Color("#a39d93"), roughness: 0.7 }),
    tail: new THREE.MeshStandardMaterial({ color: new THREE.Color("#d0242a"), roughness: 0.3, emissive: new THREE.Color("#ff1a1a"), emissiveIntensity: 0.35 }),
    tailAmber: new THREE.MeshStandardMaterial({ color: new THREE.Color("#d07a12"), roughness: 0.25, emissive: new THREE.Color("#ff8a1a"), emissiveIntensity: 0.15 }),
    head: new THREE.MeshPhysicalMaterial({ color: new THREE.Color("#f4f8fc"), roughness: 0.15, clearcoat: 1, clearcoatRoughness: 0.1, emissive: new THREE.Color("#fff6dc"), emissiveIntensity: 0.25 }),
    plate: plain("#f2f3ee", { roughness: 0.6, relief: 0 }),
    screen: new THREE.MeshStandardMaterial({ color: new THREE.Color("#0c1118"), roughness: 0.12, emissive: new THREE.Color("#2a6ab0"), emissiveIntensity: 0.25 }),
    glass: fakeGlass({ sunDir, tint: "#a9c8e2", baseA: 0.24, reflK: 1.1, streak: 0.5 }), glassWS: fakeGlass({ sunDir, streak: 0.12, baseA: 0.06, fr0: 0.06 }),
  };
  M.trimBack = M.trim.clone(); M.trimBack.side = THREE.BackSide;
  for (const [k, m] of Object.entries(M)) if (m) m.name = `car_${k}`;        // role names (the lot merges parked-car shells by role)
  const add = (g, m, parent = root, cast = true) => { const o = mesh(g, m, cast); parent.add(o); return o; };
  const HOFF = [CAR.hinge[0], 0, CAR.hinge[1]];
  /** add a jelly-deformed part (car-local, or door-local when parent = the door pivot) */
  const addJ = (g, m, parent = root, cast = true) => add(jelly(g, parent === root ? [0, 0, 0] : HOFF), m, parent, cast);
  const { belt: BELT, roofY: ROOF, floorY: FLOOR } = CAR;

  // ---------------------------------------------------------------- lower body: SOFT side profile extruded across, cabin notched
  // The outline is inset by the bevel size, then extruded with a big round bevel: every edge (bonnet, fenders, bumpers, boot,
  // cabin opening) gets a ~10-12 cm fillet and the outer silhouette comes back to the designed profile.
  const PAN = 0.46, S = new THREE.Shape(), r0 = 0.41, dy = 0.06, dx = Math.sqrt(r0 * r0 - dy * dy), a0 = Math.asin(dy / r0);
  // shape x = forward (= -z), y = up
  S.moveTo(-1.95, 0.25);
  S.lineTo(-1.4 - dx, 0.25); S.absarc(-1.4, 0.31, r0, Math.PI + a0, -a0, true);
  S.lineTo(1.38 - dx, 0.25); S.absarc(1.38, 0.31, r0, Math.PI + a0, -a0, true);
  S.lineTo(1.95, 0.25); S.bezierCurveTo(2.14, 0.25, 2.2, 0.36, 2.19, 0.5); S.bezierCurveTo(2.18, 0.68, 2.1, 0.79, 1.9, 0.81);
  S.bezierCurveTo(1.4, 0.86, 1.05, 0.92, 0.86, 0.95);
  S.lineTo(0.84, 0.95); S.lineTo(0.84, PAN); S.lineTo(-1.0, PAN); S.lineTo(-1.0, 0.98);                 // cabin notch (thick floor pan: no inverted inset)
  S.lineTo(-1.3, 0.99); S.bezierCurveTo(-1.8, 1.0, -2.05, 0.99, -2.12, 0.9); S.bezierCurveTo(-2.2, 0.78, -2.2, 0.55, -2.17, 0.42);
  S.bezierCurveTo(-2.14, 0.27, -2.06, 0.25, -1.95, 0.25);
  const BV = 0.095, BT = 0.26;
  const lb = new THREE.ExtrudeGeometry(insetShape(S, BV), { depth: CAR.width - 2 * BT, steps: 16, bevelEnabled: true, bevelSize: BV, bevelThickness: BT, bevelSegments: 9, curveSegments: 14 });
  lb.translate(0, 0, -(CAR.width - 2 * BT) / 2); lb.rotateY(Math.PI / 2);
  addJ(lb, M.paint);
  // bulgy wheel-arch flares (round tubes hugging each arch) + arch liners + underbody fill
  for (const z of [CAR.frontZ, CAR.rearZ]) {
    for (const sx of [-1, 1]) {
      const fl = new THREE.TorusGeometry(r0 + 0.03, 0.105, 20, 48, Math.PI); fl.scale(1, 1, 0.85); fl.rotateY(Math.PI / 2); fl.translate(sx * 0.815, 0.31, z); addJ(fl, M.paint);   // puffy arch
      const g = new THREE.CylinderGeometry(r0 - 0.01, r0 - 0.01, 0.34, 24, 1, true, -Math.PI / 2 - 1.45, 2.9); g.rotateZ(Math.PI / 2); g.translate(sx * 0.66, 0.31, z);
      const o = add(g, M.trim); o.material = M.trimBack; }
    add(place(roundedBox(1.0, 0.42, 0.8, 0.08), [0, 0.48, z]), M.plasticDk);
  }
  add(place(roundedBox(1.5, 0.06, 3.9, 0.025), [0, 0.22, 0]), M.plasticDk);

  // ---------------------------------------------------------------- doors: soft rounded slabs (rounded corners + filleted edges)
  const DZ = [[-0.84, 0.2], [0.22, 0.99]];
  const doorSkin = (z0, z1) => softSlab(roundRect(z0 + 0.008, 0.27, z1 - 0.008, BELT + 0.005, 0.12), 0.11, 0.045);
  const doorInner = (z0, z1) => softSlab(roundRect(z0 + 0.03, 0.3, z1 - 0.03, BELT - 0.04, 0.08), 0.07, 0.03);
  const handle = () => { const g = new THREE.CapsuleGeometry(0.026, 0.13, 8, 14); g.rotateX(Math.PI / 2); return g; };
  // driver door (front-left): own pivot group at the hinge
  const doorPivot = new THREE.Group(); doorPivot.name = "driverDoor"; doorPivot.position.set(CAR.hinge[0], 0, CAR.hinge[1]); root.add(doorPivot);
  const DL = (x, y, z) => [x - CAR.hinge[0], y, z - CAR.hinge[1]];     // car-local -> door-local
  const dz0 = DZ[0][0], dz1 = DZ[0][1], dzm = (dz0 + dz1) / 2;
  addJ(place(doorSkin(dz0, dz1), DL(-0.83, 0, 0)), M.paint, doorPivot);
  addJ(place(doorInner(dz0, dz1), DL(-0.775, 0, 0)), M.leatherPlain, doorPivot);
  add(place(roundedBox(0.1, 0.08, 0.5, 0.038, 4), DL(-0.715, 0.7, dzm + 0.08)), M.plastic, doorPivot);             // chunky armrest
  add(place(handle(), DL(-0.725, 0.84, dz0 + 0.2)), M.chrome, doorPivot);                                         // inner pull
  add(place(roundedBox(0.06, 0.2, 0.5, 0.028, 4), DL(-0.73, 0.47, dzm)), M.plasticDk, doorPivot);                // map pocket
  add(place(handle(), DL(-0.915, 0.86, 0.06)), M.chrome, doorPivot);                                             // outer handle
  addJ(place(new THREE.CapsuleGeometry(0.03, dz1 - dz0 - 0.12, 8, 14).rotateX(Math.PI / 2), DL(-0.84, BELT + 0.015, dzm)), M.trim, doorPivot); // belt seal
  const dGlass = jelly(sidePoly([[dz0 + 0.03, BELT + 0.02], [dz1 - 0.02, BELT + 0.02], [dz1 - 0.02, ROOF - 0.04], [-0.1, ROOF - 0.04]], -0.825), [0, 0, 0], false);
  dGlass.translate(-CAR.hinge[0], 0, -CAR.hinge[1]); const dg = add(dGlass, M.glass, doorPivot, false); dg.renderOrder = 2;
  addJ(softFrame([V(-0.835, BELT + 0.02, dz0 + 0.03), V(-0.835, BELT + 0.02, dz1 - 0.02), V(-0.835, ROOF - 0.035, dz1 - 0.02), V(-0.835, ROOF - 0.035, -0.1)].map((v) => v.sub(V(...HOFF))), 0.034, 0.08), M.trim, doorPivot);
  // mirror on the driver door: soft egg housing on a stalk
  const mirror = (parent, P, sx) => { const h = new THREE.SphereGeometry(0.12, 28, 20); h.scale(0.7, 0.72, 1.0); add(place(h, [P[0], P[1], P[2]]), M.paint, parent);
    add(place(new THREE.SphereGeometry(0.07, 14, 10).scale(0.15, 0.55, 0.85), [P[0] - sx * 0.04, P[1], P[2] + 0.06]), M.chrome, parent);
    add(place(new THREE.CapsuleGeometry(0.035, 0.06, 6, 12).rotateZ(Math.PI / 2), [P[0] + sx * 0.07, P[1] - 0.04, P[2]]), M.paint, parent); };
  mirror(doorPivot, DL(-0.99, 1.03, -0.72), -1);
  // other doors (static)
  for (const [z0, z1] of DZ) { const zm = (z0 + z1) / 2;
    addJ(place(doorSkin(z0, z1), [0.83, 0, 0]), M.paint); addJ(place(doorInner(z0, z1), [0.775, 0, 0]), M.leatherPlain);
    add(place(handle(), [0.915, 0.86, z1 - 0.14]), M.chrome);
    addJ(place(new THREE.CapsuleGeometry(0.03, z1 - z0 - 0.12, 8, 14).rotateX(Math.PI / 2), [0.84, BELT + 0.015, zm]), M.trim);
  }
  { const [z0, z1] = DZ[1], zm = (z0 + z1) / 2;
    addJ(place(doorSkin(z0, z1), [-0.83, 0, 0]), M.paint); addJ(place(doorInner(z0, z1), [-0.775, 0, 0]), M.leatherPlain);
    add(place(handle(), [-0.915, 0.86, z1 - 0.14]), M.chrome);
    addJ(place(new THREE.CapsuleGeometry(0.03, z1 - z0 - 0.12, 8, 14).rotateX(Math.PI / 2), [-0.84, BELT + 0.015, zm]), M.trim); }
  mirror(root, [0.99, 1.03, -0.72], 1);
  for (const sx of [-1, 1]) addJ(place(new THREE.CapsuleGeometry(0.065, 1.72, 8, 16).rotateX(Math.PI / 2), [sx * 0.83, 0.28, 0.08]), M.trim);   // soft sill

  // ---------------------------------------------------------------- greenhouse: fat soft pillars, pillow roof, thick round window frames
  for (const sx of [-1, 1]) {
    addJ(softPillar(V(sx * 0.8, BELT - 0.04, -0.9), V(sx * 0.77, ROOF + 0.0, -0.07), 0.085, 0.065), M.paint);          // A pillar
    addJ(place(roundedBox(0.1, ROOF - BELT + 0.04, 0.13, 0.045, 4), [sx * 0.81, (ROOF + BELT) / 2, 0.21]), M.trim);     // B pillar
    addJ(softSlab([[0.78, ROOF + 0.02], [0.98, ROOF + 0.02], [1.38, BELT - 0.02], [0.99, BELT - 0.02]], 0.12, 0.05, sx * 0.785), M.paint); // C pillar
  }
  addJ(pillowRoof(-0.86, 0.86, -0.14, 0.92, ROOF - 0.05, 0.13, 0.32), M.paint);
  add(place(roundedBox(1.4, 0.04, 0.9, 0.018, 3), [0, ROOF - 0.07, 0.39]), M.liner);                                 // headliner
  for (const sx of [-1, 1]) add(place(roundedBox(0.3, 0.035, 0.16, 0.016, 3), [sx * 0.38, ROOF - 0.09, -0.03], [-0.25, 0, 0]), M.liner); // sun visors
  add(place(roundedBox(0.06, 0.05, 0.05, 0.02, 3), [0, ROOF - 0.1, -0.06]), M.plasticDk);                              // mirror stalk
  add(place(roundedBox(0.24, 0.08, 0.035, 0.03, 3), [0, ROOF - 0.14, -0.07]), M.plasticDk);
  // windshield + rear window + fixed side glass (subdivided so the jelly deform bends them with the body)
  const ws = jelly(gridQuad([0.79, BELT - 0.03, -0.875], [-0.79, BELT - 0.03, -0.875], [-0.76, ROOF - 0.02, -0.08], [0.76, ROOF - 0.02, -0.08]), [0, 0, 0], false);
  add(ws, M.glassWS, root, false).renderOrder = 2;
  add(jelly(gridQuad([-0.76, ROOF - 0.02, 0.88], [0.76, ROOF - 0.02, 0.88], [0.78, BELT + 0.0, 1.31], [-0.78, BELT + 0.0, 1.31]), [0, 0, 0], false), M.glass, root, false).renderOrder = 2;
  for (const sx of [-1, 1]) {
    add(jelly(sidePoly([[0.25, BELT + 0.02], [0.99, BELT + 0.02], [0.8, ROOF - 0.04], [0.25, ROOF - 0.04]], sx * 0.825), [0, 0, 0], false), M.glass, root, false).renderOrder = 2;
    addJ(softFrame([V(sx * 0.835, BELT + 0.02, 0.25), V(sx * 0.835, BELT + 0.02, 1.0), V(sx * 0.835, ROOF - 0.035, 0.8), V(sx * 0.835, ROOF - 0.035, 0.25)], 0.034, 0.08), M.trim);
  }
  add(jelly(sidePoly([[-0.81, BELT + 0.02], [0.18, BELT + 0.02], [0.18, ROOF - 0.04], [-0.1, ROOF - 0.04]], 0.825), [0, 0, 0], false), M.glass, root, false).renderOrder = 2;
  addJ(softFrame([V(0.835, BELT + 0.02, -0.81), V(0.835, BELT + 0.02, 0.18), V(0.835, ROOF - 0.035, 0.18), V(0.835, ROOF - 0.035, -0.1)], 0.034, 0.08), M.trim);
  // thick soft rubber surrounds on the windshield + rear window
  addJ(softFrame([V(0.79, BELT - 0.02, -0.885), V(-0.79, BELT - 0.02, -0.885), V(-0.76, ROOF - 0.01, -0.09), V(0.76, ROOF - 0.01, -0.09)], 0.036, 0.12), M.trim);
  addJ(softFrame([V(-0.76, ROOF - 0.01, 0.89), V(0.76, ROOF - 0.01, 0.89), V(0.78, BELT + 0.01, 1.32), V(-0.78, BELT + 0.01, 1.32)], 0.036, 0.12), M.trim);
  // windshield cowl + chunky wipers
  addJ(place(new THREE.CapsuleGeometry(0.045, 1.42, 8, 16).rotateZ(Math.PI / 2), [0, BELT - 0.01, -0.9]), M.trim);
  for (const sx of [-0.35, 0.3]) add(softPillar(V(sx - 0.25, BELT + 0.045, -0.86), V(sx + 0.2, BELT + 0.07, -0.83), 0.022, 0.018), M.trim);

  // ---------------------------------------------------------------- front + rear: fat pillow bumpers, round bubble lights
  addJ(place(roundedBox(1.8, 0.3, 0.36, 0.14, 5), [0, 0.38, -2.04]), M.paint);                                    // front bumper
  addJ(place(roundedBox(1.8, 0.3, 0.36, 0.14, 5), [0, 0.4, 2.02]), M.paint);                                      // rear bumper
  add(place(new THREE.CapsuleGeometry(0.07, 1.36, 8, 18).rotateZ(Math.PI / 2), [0, 0.26, -2.13]), M.trim);       // soft rubber lips
  add(place(new THREE.CapsuleGeometry(0.07, 1.36, 8, 18).rotateZ(Math.PI / 2), [0, 0.28, 2.11]), M.trim);
  add(place(roundedBox(0.78, 0.2, 0.12, 0.09, 5), [0, 0.57, -2.16]), M.trim);                                     // smiley grille
  add(place(new THREE.CapsuleGeometry(0.028, 0.56, 6, 14).rotateZ(Math.PI / 2), [0, 0.57, -2.225]), M.chrome);
  for (const sx of [-1, 1]) {
    const hl = new THREE.SphereGeometry(0.15, 32, 22); hl.scale(1.05, 1.0, 0.6); add(place(hl, [sx * 0.6, 0.7, -2.1]), M.head);           // bubble headlights
    const hr = new THREE.TorusGeometry(0.15, 0.03, 12, 36); hr.scale(1.05, 1.0, 1); add(place(hr, [sx * 0.6, 0.7, -2.15]), M.paint);
    const tl = new THREE.SphereGeometry(0.12, 28, 18); tl.scale(1.2, 0.95, 0.55); add(place(tl, [sx * 0.6, 0.84, 2.12]), M.tail);         // round tail lights
    const ta = new THREE.SphereGeometry(0.06, 18, 12); ta.scale(1, 1, 0.55); add(place(ta, [sx * 0.86, 0.84, 2.03]), M.tailAmber);
    add(place(new THREE.SphereGeometry(0.06, 18, 12).scale(1.2, 1, 0.55), [sx * 0.58, 0.4, -2.2]), M.head);                             // fog lights
  }
  add(place(roundedBox(0.5, 0.14, 0.04, 0.02, 3), [0, 0.4, -2.215]), M.plate);
  add(place(roundedBox(0.5, 0.14, 0.04, 0.02, 3), [0, 0.63, 2.15]), M.plate);
  add(place(new THREE.CylinderGeometry(0.045, 0.045, 0.12, 18).rotateX(Math.PI / 2), [0.5, 0.24, 2.12]), M.chrome);  // exhaust
  add(place(new THREE.CapsuleGeometry(0.022, 0.24, 6, 12).rotateZ(Math.PI / 2), [0, 0.81, 2.17]), M.chrome);       // boot badge bar (no brand)

  // ---------------------------------------------------------------- wheels: fat round toy tyres, rounded dish rims
  for (const z of [CAR.frontZ, CAR.rearZ]) for (const sx of [-1, 1]) {
    const w = new THREE.Group(); w.position.set(sx * CAR.wheelX, CAR.wheelR, z); root.add(w);
    const ty = new THREE.TorusGeometry(0.205, 0.118, 22, 48); ty.scale(1, 1, 1.25); ty.rotateY(Math.PI / 2); add(ty, M.rubber, w);
    const rimG = new THREE.LatheGeometry([[0.001, 0.0], [0.06, 0.0], [0.14, 0.02], [0.18, 0.05], [0.19, 0.08], [0.17, 0.1], [0.0, 0.07]].map(([r, y]) => new THREE.Vector2(r, y)), 40);
    rimG.rotateZ(-sx * Math.PI / 2); add(place(rimG, [sx * 0.04, 0, 0]), M.rim, w);
    for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2 + 0.3;                                               // round dimples
      add(place(new THREE.SphereGeometry(0.03, 14, 10).scale(0.5, 1, 1), [sx * 0.1, Math.cos(a) * 0.105, Math.sin(a) * 0.105]), M.trim, w); }
    const hub = new THREE.SphereGeometry(0.055, 18, 12); hub.scale(0.6, 1, 1); add(place(hub, [sx * 0.115, 0, 0]), M.chrome, w);
  }

  // ---------------------------------------------------------------- soft contact shadow (AO) on the ground under the chassis + tyres
  const blob = (w, d, soft) => canvasTex(128, 256, (g, W, H) => { g.filter = `blur(${soft}px)`; g.fillStyle = "rgba(0,0,0,1)";
    g.beginPath(); g.roundRect(W * 0.18, H * 0.12, W * 0.64, H * 0.76, W * 0.3); g.fill(); g.filter = "none"; }, { srgb: false });
  const shadowM = (tex, op) => new THREE.MeshBasicMaterial({ color: 0x000000, alphaMap: tex, transparent: true, opacity: op, depthWrite: false,
    polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  const cs = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 5.4).rotateX(-Math.PI / 2), shadowM(blob(2.6, 5.4, 14), 0.62)); cs.position.y = 0.004; cs.renderOrder = -1; cs.name = "contactShadow"; root.add(cs); cs.material.name = "car_shadowBody";
  const tyreShadowM = () => { const m = shadowM(ct, 0.85); m.name = "car_shadowTyre"; return m; };
  const ct = canvasTex(64, 64, (g, W, H) => { const gr = g.createRadialGradient(32, 32, 2, 32, 32, 31); gr.addColorStop(0, "rgba(0,0,0,1)"); gr.addColorStop(0.45, "rgba(0,0,0,0.7)"); gr.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = gr; g.fillRect(0, 0, W, H); }, { srgb: false });
  for (const z of [CAR.frontZ, CAR.rearZ]) for (const sx of [-1, 1]) {
    const tb = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.75).rotateX(-Math.PI / 2), tyreShadowM()); tb.position.set(sx * CAR.wheelX, 0.005, z); tb.renderOrder = -1; tb.name = "contactShadow"; root.add(tb);
  }

  // ---------------------------------------------------------------- interior (chunky clay: big radii, no thin parts)
  if (interior) {
  add(place(roundedBox(1.5, 0.04, 1.74, 0.018, 3), [0, PAN + 0.012, 0.08]), M.carpet, root, false);            // carpet on the floor pan
  add(place(roundedBox(1.62, 0.34, 0.34, 0.12, 5), [0, 0.8, -0.72]), M.plastic);                                       // dash body
  add(place(roundedBox(1.56, 0.1, 0.4, 0.05, 4), [0, 0.95, -0.7], [0.12, 0, 0]), M.plasticDk);                     // dash top pad
  add(place(roundedBox(0.44, 0.12, 0.2, 0.06, 4), [CAR.driverX, 0.98, -0.62]), M.plasticDk);                         // binnacle hood
  add(place(roundedBox(0.34, 0.11, 0.03, 0.015, 3), [CAR.driverX, 0.92, -0.555]), M.screen);                          // cluster
  add(place(roundedBox(0.3, 0.4, 0.18, 0.07, 4), [0, 0.64, -0.6]), M.plastic);                                       // centre stack
  add(place(roundedBox(0.2, 0.12, 0.03, 0.015, 3), [0, 0.76, -0.51], [-0.15, 0, 0]), M.screen);
  for (const x of [-0.62, -0.2, 0.2, 0.62]) add(place(roundedBox(0.13, 0.06, 0.04, 0.025, 3), [x, 0.88, -0.56]), M.trim); // round vents
    add(place(roundedBox(0.22, 0.2, 0.86, 0.08, 4), [0, 0.52, -0.12]), M.plastic);                                      // console
  add(place(roundedBox(0.2, 0.07, 0.32, 0.034, 4), [0, 0.63, 0.12]), M.leatherPlain);                                  // armrest lid
  add(place(new THREE.CapsuleGeometry(0.016, 0.08, 6, 12), [0, 0.66, -0.36], [0.2, 0, 0]), M.chrome);
  add(place(new THREE.SphereGeometry(0.042, 18, 12), [0, 0.72, -0.35]), M.plasticDk);
  // steering wheel (column from the dash)
  const SW = V(CAR.driverX, 0.86, -0.47);
  add(beam(V(CAR.driverX, 0.8, -0.66), SW.clone().add(V(0, 0, -0.03)), 0.09, 0.09), M.plasticDk);
  const sw = new THREE.Group(); sw.position.copy(SW); sw.rotation.x = 0.42; root.add(sw);
  add(new THREE.TorusGeometry(0.165, 0.03, 16, 48), M.plasticDk, sw);
  add(place(new THREE.SphereGeometry(0.07, 24, 16).scale(1, 1, 0.5), [0, 0, 0.005]), M.plastic, sw);
  for (const a of [0, Math.PI * 0.62, -Math.PI * 0.62]) add(place(roundedBox(0.045, 0.12, 0.03, 0.014, 3), [Math.sin(a + Math.PI) * 0.1, Math.cos(a + Math.PI) * 0.1, 0], [0, 0, -a]), M.plastic, sw);
  // pedals
  for (const x of [-0.5, -0.36, -0.26]) add(place(roundedBox(0.07, 0.1, 0.035, 0.016, 3), [x, 0.56, -0.7], [-0.5, 0, 0]), M.trim);
  // seats
  const seat = (x, z, w = 0.52) => {
    const g = new THREE.Group(); g.position.set(x, 0, z); root.add(g);
    add(place(roundedBox(0.44, 0.12, 0.44, 0.05, 3), [0, 0.43, 0]), M.plasticDk, g);
    const cu = add(place(roundedBox(w, 0.15, 0.52, 0.07, 5), [0, CAR.seatTop - 0.075, 0]), M.leather, g);
    for (const s of [-1, 1]) add(place(roundedBox(0.1, 0.18, 0.5, 0.05, 4), [s * (w / 2 - 0.02), CAR.seatTop - 0.06, 0.01]), M.leatherPlain, g);
    const bk = new THREE.Group(); bk.position.set(0, CAR.seatTop - 0.02, 0.27); bk.rotation.x = 0.24; g.add(bk);
    add(place(roundedBox(w, 0.66, 0.16, 0.075, 5), [0, 0.34, 0.03]), M.leather, bk);
    for (const s of [-1, 1]) add(place(roundedBox(0.11, 0.6, 0.19, 0.05, 4), [s * (w / 2 - 0.015), 0.32, 0.02]), M.leatherPlain, bk);
    add(place(roundedBox(0.3, 0.19, 0.13, 0.065, 5), [0, 0.8, 0.05]), M.leather, bk);
    for (const s of [-1, 1]) add(place(new THREE.CapsuleGeometry(0.014, 0.06, 4, 10), [s * 0.08, 0.69, 0.05]), M.chrome, bk);
    return { group: g, cushion: cu };
  };
  const drv = seat(CAR.driverX, CAR.seatZ), pas = seat(-CAR.driverX, CAR.seatZ);
  root.userData.driverSeat = drv.group; root.userData.passengerSeat = pas.group;
  // rear bench
  add(place(roundedBox(1.36, 0.16, 0.42, 0.075, 5), [0, CAR.seatTop - 0.05, 0.75]), M.leather);
  add(place(roundedBox(1.36, 0.2, 0.42, 0.03), [0, 0.4, 0.75]), M.plasticDk);
  add(place(roundedBox(1.36, 0.5, 0.16, 0.075, 5), [0, 0.8, 0.98], [0.28, 0, 0]), M.leather);
  add(place(roundedBox(1.36, 0.05, 0.3, 0.022, 3), [0, BELT - 0.01, 1.15]), M.plasticDk);                              // parcel shelf
  // inner door sills / B-pillar trims
  for (const sx of [-1, 1]) addJ(place(roundedBox(0.07, ROOF - BELT, 0.15, 0.03, 3), [sx * 0.765, (ROOF + BELT) / 2, 0.21]), M.liner);

  }
  // every solid car mesh casts + receives shadows (glass and the contact-shadow decals excluded)
  root.traverse((o) => { if (o.isMesh && !o.material.isShaderMaterial && o.name !== "contactShadow") { o.castShadow = true; o.receiveShadow = true; }
    const nn = o.isMesh && o.geometry.attributes.normal;            // degenerate (zero-area) bevel faces -> zero normals -> NaN shading: fix
    if (nn) for (let i = 0; i < nn.count; i++) { const x = nn.getX(i), y = nn.getY(i), z = nn.getZ(i); if (!(x * x + y * y + z * z > 1e-10)) nn.setXYZ(i, 0, 1, 0); } });

  // ---------------------------------------------------------------- anchors + views (car-local)
  const handleLocal = V(...DL(-0.9, 0.86, 0.06));
  const A = {
    driverSeatTop: V(CAR.driverX, CAR.seatTop, CAR.seatZ - 0.035),
    seatBurnPoint: V(CAR.driverX, CAR.seatTop + 0.0005, CAR.seatZ + 0.085),
    seatNormal: V(0, 1, 0),
    doorHandle: V(-0.9, 0.86, 0.06),
    driverDoorOpenSpot: V(-1.32, 0, 0.32), driverDoorOpenYaw: Math.PI / 2,    // stand here facing +x (yaw = rotation.y)
    doorHinge: V(CAR.hinge[0], 0, CAR.hinge[1]),
    views: {
      throughWindshield: { pos: V(-0.3, 3.2, -1.62), target: V(-0.4, 0.6, 0.03), fov: 30 },
      seatMacro: { pos: V(-0.18, 0.84, -0.17), target: V(-0.4, 0.575, 0.07), fov: 42 },
      sideWindow: { pos: V(-1.62, 1.9, 0.08), target: V(-0.38, 0.6, 0.02), fov: 34 },
      doorOpen: { pos: V(-3.5, 1.6, 1.7), target: V(-0.75, 0.85, -0.25), fov: 42 },
    },
  };
  root.userData.anchors = root.anchors = A;
  root.userData.materials = M; root.userData.door = doorPivot;
  root.getDoorHandle = (out = new THREE.Vector3()) => { doorPivot.updateMatrix(); return out.copy(handleLocal).applyMatrix4(doorPivot.matrix); };
  root.toWorld = (view, carGroup = root) => toWorld(view, carGroup);
  let doorK = 0;
  function set({ door = doorK } = {}) {
    doorK = cl(door); const e = ss(0, 1, doorK);
    doorPivot.rotation.y = -1.15 * e;
  }
  root.set = set; root.userData.set = set; set({ door: 0 });
  void seed;
  return root;
}

/** Convert a car-local view { pos, target, fov } into world space for a placed car group. */
export function toWorld(view, carGroup) {
  carGroup.updateMatrixWorld(true);
  return { pos: view.pos.clone().applyMatrix4(carGroup.matrixWorld), target: view.target.clone().applyMatrix4(carGroup.matrixWorld), fov: view.fov };
}

// ================================================================================================== createBottle
/** Clear 0.5 L water bottle (~21 cm, r 3.3 cm). See header for frames + set(). */
export function createBottle({ lying = true, label = "#2c7fd6", cap = "#2a6fd0", water = true, sunDir = [-0.35, 0.85, 0.4], seed = 2 } = {}) {
  const root = new THREE.Group(); root.name = "waterBottle";
  const R = 0.033, H = 0.215;
  // profile (r, y): petal base, ridged body, shoulder, neck, ring
  const P = [[0, 0.002], [0.02, 0], [0.03, 0.004], [R, 0.014]];
  for (let i = 0; i <= 28; i++) { const y = 0.016 + (i / 28) * 0.128; const ridge = (Math.sin(i * Math.PI / 2) > 0.5 ? -0.0028 : 0) * (y > 0.055 && y < 0.115 ? 0.3 : 1); P.push([R + ridge, y]); }
  P.push([R, 0.146], [0.03, 0.158], [0.022, 0.172], [0.0145, 0.184], [0.0135, 0.19], [0.016, 0.192], [0.016, 0.195], [0.0135, 0.196], [0.0135, 0.2]);
  const prof = P.map(([r, y]) => new THREE.Vector2(r, y));
  const inner = new THREE.Group(); root.add(inner);
  const bodyG = new THREE.LatheGeometry(prof, 40);
  const glass = fakeGlass({ tint: "#e8f4ff", baseA: 0.05, reflK: 1.1, sunK: 10, streak: 0, rim: 0.55, sunDir });
  const body = mesh(bodyG, glass, false, false); body.renderOrder = 3; inner.add(body);
  if (water) {
    const W = prof.filter((v) => v.y < 0.172).map((v) => new THREE.Vector2(Math.max(v.x - 0.0025, 0), Math.max(v.y, 0.003)));
    W.push(new THREE.Vector2(0.019, 0.17), new THREE.Vector2(0, 0.17));
    const wm = fakeGlass({ tint: "#6fb8ea", baseA: 0.2, reflK: 0.5, sunK: 4, streak: 0, rim: 0.35, sunDir });
    const wmesh = mesh(new THREE.LatheGeometry(W, 36), wm, false, false); wmesh.renderOrder = 2; inner.add(wmesh);
  }
  const labelM = new THREE.MeshStandardMaterial({ color: new THREE.Color(label), roughness: 0.35, side: THREE.DoubleSide,
    map: canvasTex(256, 64, (g, w, h) => { g.fillStyle = "#ffffff"; g.fillRect(0, 0, w, h); g.fillStyle = "#2c7fd6"; g.fillRect(0, 6, w, h - 12);
      g.fillStyle = "#ffffff"; for (let i = 0; i < 6; i++) { g.beginPath(); g.ellipse(20 + i * 44, 32, 9, 13, 0, 0, 7); g.fill(); }
      g.fillStyle = "#8fd0ff"; g.fillRect(0, 26, w, 3); }) });
  const lab = mesh(new THREE.CylinderGeometry(R + 0.0006, R + 0.0006, 0.06, 40, 1, true), labelM); lab.position.y = 0.085; inner.add(lab);
  const capM = plain(cap, { roughness: 0.4, relief: 0.3 });
  const capG = new THREE.CylinderGeometry(0.0155, 0.0155, 0.018, 24); const capMesh = mesh(capG, capM); capMesh.position.y = 0.207; inner.add(capMesh);
  for (let i = 0; i < 18; i++) { const a = (i / 18) * Math.PI * 2; const k = mesh(new THREE.BoxGeometry(0.0015, 0.016, 0.0015), capM, false); k.position.set(Math.cos(a) * 0.0158, 0.207, Math.sin(a) * 0.0158); inner.add(k); }
  const grip = new THREE.Object3D(); grip.name = "grip"; grip.position.set(0, 0.18, 0); inner.add(grip);
  // lying frame: axis along +x, contact point (under the body middle) at the origin
  const bodyMid = 0.08;
  if (lying) { inner.rotation.z = -Math.PI / 2; inner.position.set(-bodyMid, R, 0); }
  root.userData.grip = grip; root.userData.radius = R; root.userData.length = H; root.userData.focusShift = 0;
  root.userData.center = lying ? V(0, R, 0) : V(0, bodyMid, 0);
  const pivot = inner.position.clone(), base = inner.rotation.clone(), sd = (seed % 97) * 1.7;
  function set({ rock = 0, amp = 1 } = {}) {
    if (!lying) return;
    const t = rock;
    const ang = amp * (0.11 * Math.sin(t * 1.25 + sd) + 0.05 * Math.sin(t * 2.9 + sd * 2) + 0.025 * Math.sin(t * 5.3 + 1.1));
    // rolling without slipping: rotate about the axis (x) and translate along z by -ang * R
    inner.rotation.set(base.x + ang, base.y, base.z, "XYZ");
    inner.position.set(pivot.x, pivot.y, pivot.z - ang * R);
    root.userData.focusShift = -ang * R * 2.2;     // the focused spot moves more than the bottle (lever arm)
    root.userData.rockAngle = ang;
  }
  root.set = set; root.userData.set = set; set({ rock: 0, amp: 0 });
  return root;
}
