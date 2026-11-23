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
import { roundedBox, place, boxUV } from "../geometry.js";
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

// ------------------------------------------------------------------------------------------------ dimensions
export const CAR = {
  length: 4.3, width: 1.74, height: 1.45,
  wheelR: 0.32, wheelX: 0.76, frontZ: -1.38, rearZ: 1.4,
  belt: 0.98, roofY: 1.42, floorY: 0.3, seatTop: 0.56,
  driverX: -0.4, seatZ: 0.0, hinge: [-0.84, -0.84], doorLen: 1.04,
};

// ================================================================================================== buildHeroCar
export async function buildHeroCar({ paint = "#e8edf2", seed = 4, sunDir = [-0.35, 0.85, 0.4], name = "heroCar" } = {}) {
  const root = new THREE.Group(); root.name = name;
  const M = {
    paint: new THREE.MeshPhysicalMaterial({ color: new THREE.Color(paint), roughness: 0.25, metalness: 0.1, clearcoat: 1, clearcoatRoughness: 0.08, envMapIntensity: 1.25 }),
    chrome: plain("#dfe4ea", { roughness: 0.16, metalness: 1, relief: 0, envMapIntensity: 1.4 }),
    trim: plain("#16181b", { roughness: 0.45, relief: 0.2 }),
    rubber: plain("#1c1d20", { roughness: 0.92, relief: 0.6, envMapIntensity: 0.3 }),
    rim: plain("#b9c0c8", { roughness: 0.28, metalness: 0.85, relief: 0, envMapIntensity: 1.2 }),
    plastic: plain("#34373d", { roughness: 0.72, relief: 0.5 }),
    plasticDk: plain("#1f2125", { roughness: 0.6, relief: 0.4 }),
    carpet: plain("#23262b", { roughness: 1, relief: 1.2 }),
    liner: plain("#9ea4ad", { roughness: 0.95, relief: 0.6 }),
    leather: leatherMaterial("#2a2c30"),
    leatherPlain: new THREE.MeshStandardMaterial({ color: new THREE.Color("#2a2c30"), roughness: 0.5, normalMap: noiseNormal(), normalScale: new THREE.Vector2(0.5, 0.5) }),
    tail: new THREE.MeshStandardMaterial({ color: new THREE.Color("#b3121a"), roughness: 0.2, emissive: new THREE.Color("#ff1a1a"), emissiveIntensity: 0.35 }),
    tailAmber: new THREE.MeshStandardMaterial({ color: new THREE.Color("#d07a12"), roughness: 0.25, emissive: new THREE.Color("#ff8a1a"), emissiveIntensity: 0.15 }),
    head: new THREE.MeshStandardMaterial({ color: new THREE.Color("#e9f1fa"), roughness: 0.08, metalness: 0.3, emissive: new THREE.Color("#cfe4ff"), emissiveIntensity: 0.12 }),
    plate: plain("#eef0ee", { roughness: 0.5, relief: 0 }),
    screen: new THREE.MeshStandardMaterial({ color: new THREE.Color("#0c1118"), roughness: 0.12, emissive: new THREE.Color("#2a6ab0"), emissiveIntensity: 0.25 }),
    glass: fakeGlass({ sunDir, tint: "#a9c8e2", baseA: 0.24, reflK: 1.1, streak: 0.5 }), glassWS: fakeGlass({ sunDir, streak: 0.12, baseA: 0.06, fr0: 0.06 }),
  };
  const add = (g, m, parent = root, cast = true) => { const o = mesh(g, m, cast); parent.add(o); return o; };
  const { belt: BELT, roofY: ROOF, floorY: FLOOR } = CAR;

  // ---------------------------------------------------------------- lower body: SOFT side profile extruded across, cabin notched
  // The outline is inset by the bevel size, then extruded with a big round bevel: every edge (bonnet, fenders, bumpers, boot,
  // cabin opening) gets a ~10-12 cm fillet and the outer silhouette comes back to the designed profile.
  const S = new THREE.Shape(), r0 = 0.41, dy = 0.06, dx = Math.sqrt(r0 * r0 - dy * dy), a0 = Math.asin(dy / r0);
  // shape x = forward (= -z), y = up
  S.moveTo(-1.95, 0.25);
  S.lineTo(-1.4 - dx, 0.25); S.absarc(-1.4, 0.31, r0, Math.PI + a0, -a0, true);
  S.lineTo(1.38 - dx, 0.25); S.absarc(1.38, 0.31, r0, Math.PI + a0, -a0, true);
  S.lineTo(1.95, 0.25); S.bezierCurveTo(2.14, 0.25, 2.2, 0.36, 2.19, 0.5); S.bezierCurveTo(2.18, 0.68, 2.1, 0.79, 1.9, 0.81);
  S.bezierCurveTo(1.4, 0.86, 1.05, 0.92, 0.86, 0.95);
  S.lineTo(0.84, 0.95); S.lineTo(0.84, FLOOR); S.lineTo(-1.0, FLOOR); S.lineTo(-1.0, 0.98);             // cabin notch
  S.lineTo(-1.3, 0.99); S.bezierCurveTo(-1.8, 1.0, -2.05, 0.99, -2.12, 0.9); S.bezierCurveTo(-2.2, 0.78, -2.2, 0.55, -2.17, 0.42);
  S.bezierCurveTo(-2.14, 0.27, -2.06, 0.25, -1.95, 0.25);
  const BV = 0.1, BT = 0.13;
  const lb = new THREE.ExtrudeGeometry(insetShape(S, BV), { depth: CAR.width - 2 * BT, bevelEnabled: true, bevelSize: BV, bevelThickness: BT, bevelSegments: 7, curveSegments: 8 });
  lb.translate(0, 0, -(CAR.width - 2 * BT) / 2); lb.rotateY(Math.PI / 2);
  add(lb, M.paint);
  // bulgy wheel-arch flares (round tubes hugging each arch) + arch liners + underbody fill
  for (const z of [CAR.frontZ, CAR.rearZ]) {
    for (const sx of [-1, 1]) {
      const fl = new THREE.TorusGeometry(r0 + 0.015, 0.055, 12, 30, Math.PI); fl.scale(1, 1, 0.8); fl.rotateY(Math.PI / 2); fl.translate(sx * 0.815, 0.31, z); add(fl, M.paint);
      const g = new THREE.CylinderGeometry(r0 - 0.01, r0 - 0.01, 0.34, 24, 1, true, -Math.PI / 2 - 1.45, 2.9); g.rotateZ(Math.PI / 2); g.translate(sx * 0.66, 0.31, z);
      const o = add(g, M.trim); o.material = M.trim.clone(); o.material.side = THREE.BackSide; }
    add(place(roundedBox(1.0, 0.42, 0.8, 0.08), [0, 0.48, z]), M.plasticDk);
  }
  add(place(roundedBox(1.5, 0.06, 3.9, 0.025), [0, 0.22, 0]), M.plasticDk);

  // ---------------------------------------------------------------- doors: soft rounded slabs (rounded corners + filleted edges)
  const DZ = [[-0.84, 0.2], [0.22, 0.99]];
  const doorSkin = (z0, z1) => softSlab(roundRect(z0 + 0.012, 0.27, z1 - 0.012, BELT + 0.005, 0.09), 0.085, 0.035);
  const doorInner = (z0, z1) => softSlab(roundRect(z0 + 0.05, 0.36, z1 - 0.05, BELT - 0.06, 0.06), 0.03, 0.012);
  const handle = () => { const g = new THREE.CapsuleGeometry(0.017, 0.12, 6, 12); g.rotateX(Math.PI / 2); return g; };
  // driver door (front-left): own pivot group at the hinge
  const doorPivot = new THREE.Group(); doorPivot.name = "driverDoor"; doorPivot.position.set(CAR.hinge[0], 0, CAR.hinge[1]); root.add(doorPivot);
  const DL = (x, y, z) => [x - CAR.hinge[0], y, z - CAR.hinge[1]];     // car-local -> door-local
  const dz0 = DZ[0][0], dz1 = DZ[0][1], dzm = (dz0 + dz1) / 2;
  add(place(doorSkin(dz0, dz1), DL(-0.83, 0, 0)), M.paint, doorPivot);
  add(place(doorInner(dz0, dz1), DL(-0.775, 0, 0)), M.leatherPlain, doorPivot);
  add(place(roundedBox(0.07, 0.05, 0.5, 0.024), DL(-0.76, 0.7, dzm + 0.08)), M.plastic, doorPivot);              // armrest
  add(place(handle(), DL(-0.765, 0.84, dz0 + 0.2)), M.chrome, doorPivot);                                         // inner pull
  add(place(roundedBox(0.035, 0.24, 0.5, 0.016), DL(-0.77, 0.47, dzm)), M.plasticDk, doorPivot);                // map pocket
  add(place(roundedBox(0.03, 0.06, 0.2, 0.028), DL(-0.875, 0.86, 0.06)), M.trim, doorPivot);
  add(place(handle(), DL(-0.885, 0.86, 0.06)), M.chrome, doorPivot);                                             // outer handle
  add(place(new THREE.CapsuleGeometry(0.018, dz1 - dz0 - 0.1, 6, 10).rotateX(Math.PI / 2), DL(-0.84, BELT + 0.012, dzm)), M.trim, doorPivot); // belt seal
  const dGlass = sidePoly([[dz0 + 0.03, BELT + 0.02], [dz1 - 0.02, BELT + 0.02], [dz1 - 0.02, ROOF - 0.04], [-0.1, ROOF - 0.04]], -0.825);
  dGlass.translate(-CAR.hinge[0], 0, -CAR.hinge[1]); const dg = add(dGlass, M.glass, doorPivot, false); dg.renderOrder = 2;
  // mirror on the driver door: soft egg housing on a stalk
  const mirror = (parent, P, sx) => { const h = new THREE.SphereGeometry(0.1, 20, 14); h.scale(0.62, 0.6, 1.0); add(place(h, [P[0], P[1], P[2]]), M.paint, parent);
    add(place(new THREE.SphereGeometry(0.07, 14, 10).scale(0.15, 0.55, 0.85), [P[0] - sx * 0.04, P[1], P[2] + 0.06]), M.chrome, parent);
    add(place(new THREE.CapsuleGeometry(0.02, 0.06, 4, 8).rotateZ(Math.PI / 2), [P[0] + sx * 0.06, P[1] - 0.04, P[2]]), M.trim, parent); };
  mirror(doorPivot, DL(-0.98, 1.04, -0.72), -1);
  // other doors (static)
  for (const [z0, z1] of DZ) { const zm = (z0 + z1) / 2;
    add(place(doorSkin(z0, z1), [0.83, 0, 0]), M.paint); add(place(doorInner(z0, z1), [0.775, 0, 0]), M.leatherPlain);
    add(place(roundedBox(0.03, 0.06, 0.2, 0.028), [0.875, 0.86, z1 - 0.14]), M.trim); add(place(handle(), [0.885, 0.86, z1 - 0.14]), M.chrome);
    add(place(new THREE.CapsuleGeometry(0.018, z1 - z0 - 0.1, 6, 10).rotateX(Math.PI / 2), [0.84, BELT + 0.012, zm]), M.trim);
  }
  { const [z0, z1] = DZ[1], zm = (z0 + z1) / 2;
    add(place(doorSkin(z0, z1), [-0.83, 0, 0]), M.paint); add(place(doorInner(z0, z1), [-0.775, 0, 0]), M.leatherPlain);
    add(place(roundedBox(0.03, 0.06, 0.2, 0.028), [-0.875, 0.86, z1 - 0.14]), M.trim); add(place(handle(), [-0.885, 0.86, z1 - 0.14]), M.chrome);
    add(place(new THREE.CapsuleGeometry(0.018, z1 - z0 - 0.1, 6, 10).rotateX(Math.PI / 2), [-0.84, BELT + 0.012, zm]), M.trim); }
  mirror(root, [0.98, 1.04, -0.72], 1);
  for (const sx of [-1, 1]) add(place(new THREE.CapsuleGeometry(0.045, 1.72, 6, 12).rotateX(Math.PI / 2), [sx * 0.83, 0.27, 0.08]), M.trim);   // soft sill

  // ---------------------------------------------------------------- greenhouse: soft tapered pillars, pillow roof, glass
  for (const sx of [-1, 1]) {
    add(softPillar(V(sx * 0.8, BELT - 0.02, -0.87), V(sx * 0.75, ROOF - 0.01, -0.06), 0.06, 0.04), M.paint);            // A pillar
    add(place(roundedBox(0.07, ROOF - BELT + 0.02, 0.1, 0.032), [sx * 0.81, (ROOF + BELT) / 2, 0.21]), M.trim);         // B pillar (black)
    add(softSlab([[0.8, ROOF + 0.0], [0.96, ROOF + 0.0], [1.36, BELT - 0.01], [0.99, BELT - 0.01]], 0.08, 0.03, sx * 0.785), M.paint); // C pillar
  }
  add(pillowRoof(-0.84, 0.84, -0.12, 0.9, ROOF - 0.045, 0.1, 0.24), M.paint);
  add(place(roundedBox(1.46, 0.02, 0.9, 0.01), [0, ROOF - 0.055, 0.39]), M.liner);                                   // headliner
  for (const sx of [-1, 1]) add(place(roundedBox(0.3, 0.014, 0.16, 0.007), [sx * 0.4, ROOF - 0.075, -0.02], [-0.25, 0, 0]), M.liner); // sun visors
  add(place(roundedBox(0.1, 0.03, 0.04, 0.012), [0, ROOF - 0.08, -0.06]), M.plasticDk);                              // mirror
  add(place(roundedBox(0.22, 0.06, 0.016, 0.008), [0, ROOF - 0.11, -0.07]), M.plasticDk);
  // windshield + rear window + fixed side glass
  const ws = quad([0.77, BELT - 0.02, -0.86], [-0.77, BELT - 0.02, -0.86], [-0.72, ROOF - 0.02, -0.07], [0.72, ROOF - 0.02, -0.07]);
  add(ws, M.glassWS, root, false).renderOrder = 2;
  add(quad([-0.74, ROOF - 0.02, 0.86], [0.74, ROOF - 0.02, 0.86], [0.76, BELT + 0.005, 1.3], [-0.76, BELT + 0.005, 1.3]), M.glass, root, false).renderOrder = 2;
  for (const sx of [-1, 1]) {
    add(sidePoly([[0.25, BELT + 0.02], [0.99, BELT + 0.02], [0.8, ROOF - 0.04], [0.25, ROOF - 0.04]], sx * 0.825), M.glass, root, false).renderOrder = 2;
  }
  add(sidePoly([[-0.81, BELT + 0.02], [0.18, BELT + 0.02], [0.18, ROOF - 0.04], [-0.1, ROOF - 0.04]], 0.825), M.glass, root, false).renderOrder = 2;
  // windshield cowl + wipers (soft)
  add(place(new THREE.CapsuleGeometry(0.03, 1.46, 6, 12).rotateZ(Math.PI / 2), [0, BELT - 0.005, -0.89]), M.trim);
  for (const sx of [-0.35, 0.3]) add(softPillar(V(sx - 0.25, BELT + 0.012, -0.85), V(sx + 0.22, BELT + 0.04, -0.82), 0.012, 0.01), M.trim);

  // ---------------------------------------------------------------- front + rear: chunky bumpers, soft round lights
  add(place(roundedBox(1.78, 0.24, 0.3, 0.11, 4), [0, 0.37, -2.05]), M.paint);                                    // front bumper
  add(place(roundedBox(1.78, 0.24, 0.3, 0.11, 4), [0, 0.39, 2.03]), M.paint);                                     // rear bumper
  add(place(new THREE.CapsuleGeometry(0.045, 1.4, 6, 14).rotateZ(Math.PI / 2), [0, 0.26, -2.12]), M.trim);        // black lips
  add(place(new THREE.CapsuleGeometry(0.045, 1.4, 6, 14).rotateZ(Math.PI / 2), [0, 0.28, 2.1]), M.trim);
  add(place(roundedBox(0.82, 0.17, 0.1, 0.075, 4), [0, 0.56, -2.16]), M.trim);                                    // grille
  add(place(new THREE.CapsuleGeometry(0.014, 0.68, 4, 10).rotateZ(Math.PI / 2), [0, 0.56, -2.215]), M.chrome);
  for (const sx of [-1, 1]) {
    const hl = new THREE.SphereGeometry(0.12, 24, 16); hl.scale(1.25, 0.9, 0.55); add(place(hl, [sx * 0.6, 0.68, -2.12]), M.head);       // headlights
    const hr = new THREE.TorusGeometry(0.12, 0.018, 8, 28); hr.scale(1.25, 0.9, 1); add(place(hr, [sx * 0.6, 0.68, -2.16]), M.chrome);
    const tl = new THREE.SphereGeometry(0.11, 22, 14); tl.scale(1.35, 0.85, 0.5); add(place(tl, [sx * 0.6, 0.83, 2.14]), M.tail);         // tail lights
    const ta = new THREE.SphereGeometry(0.05, 14, 10); ta.scale(1, 1, 0.5); add(place(ta, [sx * 0.86, 0.83, 2.05]), M.tailAmber);
    add(place(new THREE.SphereGeometry(0.045, 14, 10).scale(1.3, 0.9, 0.5), [sx * 0.6, 0.38, -2.19]), M.head);                           // fog lights
  }
  add(place(roundedBox(0.5, 0.12, 0.02, 0.01), [0, 0.4, -2.205]), M.plate);
  add(place(roundedBox(0.5, 0.12, 0.02, 0.01), [0, 0.62, 2.155]), M.plate);
  add(place(roundedBox(0.54, 0.16, 0.012, 0.006), [0, 0.62, 2.148]), M.trim);
  add(place(new THREE.CylinderGeometry(0.035, 0.035, 0.12, 14).rotateX(Math.PI / 2), [0.5, 0.24, 2.12]), M.chrome);  // exhaust
  add(place(new THREE.CapsuleGeometry(0.014, 0.26, 4, 10).rotateZ(Math.PI / 2), [0, 0.8, 2.17]), M.chrome);       // boot badge bar (no brand)

  // ---------------------------------------------------------------- wheels: fat soft tyres, dished rims
  for (const z of [CAR.frontZ, CAR.rearZ]) for (const sx of [-1, 1]) {
    const w = new THREE.Group(); w.position.set(sx * CAR.wheelX, CAR.wheelR, z); root.add(w);
    const ty = new THREE.TorusGeometry(0.225, 0.1, 18, 40); ty.scale(1, 1, 1.25); ty.rotateY(Math.PI / 2); add(ty, M.rubber, w);
    const rimG = new THREE.LatheGeometry([[0.001, 0.0], [0.07, 0.0], [0.17, 0.025], [0.2, 0.06], [0.2, 0.075], [0.185, 0.08], [0.0, 0.03]].map(([r, y]) => new THREE.Vector2(r, y)), 36);
    rimG.rotateZ(-sx * Math.PI / 2); add(place(rimG, [sx * 0.04, 0, 0]), M.rim, w);
    for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2 + 0.3;
      const sp = new THREE.CapsuleGeometry(0.022, 0.1, 4, 10); sp.scale(0.7, 1, 1);
      add(place(sp, [sx * 0.1, Math.cos(a) * 0.1, Math.sin(a) * 0.1], [a, 0, 0]), M.rim, w); }
    const hub = new THREE.SphereGeometry(0.06, 18, 12); hub.scale(0.5, 1, 1); add(place(hub, [sx * 0.105, 0, 0]), M.chrome, w);
  }

  // ---------------------------------------------------------------- soft contact shadow (AO) on the ground under the chassis + tyres
  const blob = (w, d, soft) => canvasTex(128, 256, (g, W, H) => { g.filter = `blur(${soft}px)`; g.fillStyle = "rgba(0,0,0,1)";
    g.beginPath(); g.roundRect(W * 0.18, H * 0.12, W * 0.64, H * 0.76, W * 0.3); g.fill(); g.filter = "none"; }, { srgb: false });
  const shadowM = (tex, op) => new THREE.MeshBasicMaterial({ color: 0x000000, alphaMap: tex, transparent: true, opacity: op, depthWrite: false,
    polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  const cs = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 5.4).rotateX(-Math.PI / 2), shadowM(blob(2.6, 5.4, 14), 0.62)); cs.position.y = 0.004; cs.renderOrder = -1; cs.name = "contactShadow"; root.add(cs);
  const ct = canvasTex(64, 64, (g, W, H) => { const gr = g.createRadialGradient(32, 32, 2, 32, 32, 31); gr.addColorStop(0, "rgba(0,0,0,1)"); gr.addColorStop(0.45, "rgba(0,0,0,0.7)"); gr.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = gr; g.fillRect(0, 0, W, H); }, { srgb: false });
  for (const z of [CAR.frontZ, CAR.rearZ]) for (const sx of [-1, 1]) {
    const tb = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.75).rotateX(-Math.PI / 2), shadowM(ct, 0.85)); tb.position.set(sx * CAR.wheelX, 0.005, z); tb.renderOrder = -1; tb.name = "contactShadow"; root.add(tb);
  }

  // ---------------------------------------------------------------- interior
  add(place(new THREE.BoxGeometry(1.64, 0.02, 1.76), [0, FLOOR + 0.055, 0.08]), M.carpet, root, false);       // above the body bevel
  add(place(roundedBox(1.62, 0.3, 0.3, 0.06), [0, 0.8, -0.72]), M.plastic);                                       // dash body
  add(place(roundedBox(1.6, 0.06, 0.36, 0.03), [0, 0.95, -0.7], [0.12, 0, 0]), M.plasticDk);                     // dash top pad
  add(place(roundedBox(0.42, 0.1, 0.18, 0.04), [CAR.driverX, 0.98, -0.62]), M.plasticDk);                         // binnacle hood
  add(place(roundedBox(0.36, 0.12, 0.01, 0.01), [CAR.driverX, 0.92, -0.565]), M.screen);                          // cluster
  add(place(roundedBox(0.28, 0.4, 0.14, 0.03), [0, 0.6, -0.6]), M.plastic);                                       // centre stack
  add(place(roundedBox(0.22, 0.13, 0.012, 0.01), [0, 0.78, -0.535], [-0.15, 0, 0]), M.screen);
  for (const x of [-0.62, -0.2, 0.2, 0.62]) add(place(roundedBox(0.13, 0.04, 0.02, 0.01), [x, 0.88, -0.565]), M.trim); // vents
  add(place(roundedBox(0.5, 0.02, 0.01, 0.005), [0.42, 0.72, -0.565]), M.trim);                                    // glovebox seam
  add(place(roundedBox(0.2, 0.26, 0.86, 0.04), [0, 0.42, -0.12]), M.plastic);                                      // console
  add(place(roundedBox(0.18, 0.04, 0.3, 0.02), [0, 0.56, 0.12]), M.leatherPlain);                                  // armrest lid
  add(place(new THREE.CylinderGeometry(0.008, 0.01, 0.12, 10), [0, 0.6, -0.36], [0.2, 0, 0]), M.chrome);
  add(place(new THREE.SphereGeometry(0.03, 14, 10), [0, 0.66, -0.35]), M.plasticDk);
  // steering wheel (column from the dash)
  const SW = V(CAR.driverX, 0.86, -0.47);
  add(beam(V(CAR.driverX, 0.8, -0.66), SW.clone().add(V(0, 0, -0.03)), 0.06, 0.06), M.plasticDk);
  const sw = new THREE.Group(); sw.position.copy(SW); sw.rotation.x = 0.42; root.add(sw);
  add(new THREE.TorusGeometry(0.17, 0.018, 12, 40), M.plasticDk, sw);
  add(place(new THREE.CylinderGeometry(0.055, 0.06, 0.04, 20).rotateX(Math.PI / 2), [0, 0, 0.005]), M.plastic, sw);
  for (const a of [0, Math.PI * 0.62, -Math.PI * 0.62]) add(place(roundedBox(0.024, 0.13, 0.014, 0.006), [Math.sin(a + Math.PI) * 0.1, Math.cos(a + Math.PI) * 0.1, 0], [0, 0, -a]), M.plastic, sw);
  // pedals
  for (const x of [-0.5, -0.36, -0.26]) add(place(roundedBox(0.06, 0.09, 0.015, 0.005), [x, 0.42, -0.72], [-0.5, 0, 0]), M.trim);
  // seats
  const seat = (x, z, w = 0.52) => {
    const g = new THREE.Group(); g.position.set(x, 0, z); root.add(g);
    add(place(roundedBox(0.44, 0.12, 0.44, 0.03), [0, 0.36, 0]), M.plasticDk, g);
    const cu = add(place(roundedBox(w, 0.14, 0.52, 0.05, 3), [0, CAR.seatTop - 0.07, 0]), M.leather, g);
    for (const s of [-1, 1]) add(place(roundedBox(0.075, 0.17, 0.5, 0.035), [s * (w / 2 - 0.02), CAR.seatTop - 0.055, 0.01]), M.leatherPlain, g);
    const bk = new THREE.Group(); bk.position.set(0, CAR.seatTop - 0.02, 0.27); bk.rotation.x = 0.24; g.add(bk);
    add(place(roundedBox(w, 0.66, 0.13, 0.05, 3), [0, 0.34, 0.03]), M.leather, bk);
    for (const s of [-1, 1]) add(place(roundedBox(0.08, 0.6, 0.16, 0.035), [s * (w / 2 - 0.015), 0.32, 0.02]), M.leatherPlain, bk);
    add(place(roundedBox(0.28, 0.17, 0.1, 0.045), [0, 0.8, 0.05]), M.leather, bk);
    for (const s of [-1, 1]) add(place(new THREE.CylinderGeometry(0.007, 0.007, 0.08, 8), [s * 0.08, 0.69, 0.05]), M.chrome, bk);
    return { group: g, cushion: cu };
  };
  const drv = seat(CAR.driverX, CAR.seatZ), pas = seat(-CAR.driverX, CAR.seatZ);
  root.userData.driverSeat = drv.group; root.userData.passengerSeat = pas.group;
  // rear bench
  add(place(roundedBox(1.36, 0.14, 0.42, 0.05, 3), [0, CAR.seatTop - 0.05, 0.75]), M.leather);
  add(place(roundedBox(1.36, 0.2, 0.42, 0.03), [0, 0.4, 0.75]), M.plasticDk);
  add(place(roundedBox(1.36, 0.5, 0.12, 0.05, 3), [0, 0.8, 0.98], [0.28, 0, 0]), M.leather);
  add(place(roundedBox(1.4, 0.03, 0.3, 0.01), [0, BELT - 0.005, 1.15]), M.plasticDk);                              // parcel shelf
  // inner door sills / B-pillar trims
  for (const sx of [-1, 1]) add(place(roundedBox(0.05, ROOF - BELT, 0.12, 0.02), [sx * 0.77, (ROOF + BELT) / 2, 0.21]), M.liner);

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
