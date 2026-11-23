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
import { roundedBox, place } from "../geometry.js";
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
uniform vec3 tint, skyZ, skyH, ground, sunDir; uniform float baseA, reflK, sunK, streak, rim;
varying vec3 vW; varying vec3 vN;
void main(){
  vec3 V = normalize(cameraPosition - vW); vec3 N = normalize(vN); if (dot(N, V) < 0.0) N = -N;
  float ndv = clamp(dot(N, V), 0.0, 1.0); float fr = 0.05 + 0.95*pow(1.0 - ndv, 4.0);
  vec3 R = reflect(-V, N);
  vec3 sky = R.y > 0.0 ? mix(skyH, skyZ, pow(clamp(R.y, 0.0, 1.0), 0.6)) : mix(skyH*0.7, ground, clamp(-R.y*4.0, 0.0, 1.0));
  float st = smoothstep(0.6, 0.95, sin((vW.x*0.7 + vW.z*0.9 + vW.y*1.6)*5.0)) * streak;     // soft diagonal glints
  float sun = pow(max(dot(R, normalize(sunDir)), 0.0), 220.0)*sunK + pow(max(dot(R, normalize(sunDir)), 0.0), 18.0)*sunK*0.02;
  float edge = pow(1.0 - ndv, 2.0)*rim;
  vec3 refl = sky*(fr*reflK + st*0.35) + vec3(1.0, 0.97, 0.9)*sun + vec3(0.9, 0.95, 1.0)*edge;
  float a = clamp(baseA + fr*reflK*0.55 + st*0.12 + edge*0.5, 0.0, 0.95);
  gl_FragColor = vec4(tint*baseA + refl, a);
}`;
export function fakeGlass({ tint = "#cfe3f2", baseA = 0.1, reflK = 0.9, sunK = 6, streak = 0.25, rim = 0, sunDir = [-0.35, 0.85, 0.4] } = {}) {
  const c = new THREE.Color(tint);
  return new THREE.ShaderMaterial({ transparent: true, premultipliedAlpha: true, depthWrite: false, side: THREE.DoubleSide,
    uniforms: { tint: { value: V(c.r, c.g, c.b) }, skyZ: { value: V(0.13, 0.32, 0.85) }, skyH: { value: V(0.55, 0.72, 0.95) },
      ground: { value: V(0.08, 0.09, 0.1) }, sunDir: { value: V(...sunDir) }, baseA: { value: baseA }, reflK: { value: reflK },
      sunK: { value: sunK }, streak: { value: streak }, rim: { value: rim } },
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
    paint: new THREE.MeshPhysicalMaterial({ color: new THREE.Color(paint), roughness: 0.3, metalness: 0.12, clearcoat: 1, clearcoatRoughness: 0.08, envMapIntensity: 1.0 }),
    chrome: plain("#dfe4ea", { roughness: 0.16, metalness: 1, relief: 0, envMapIntensity: 1.4 }),
    trim: plain("#16181b", { roughness: 0.45, relief: 0.2 }),
    rubber: plain("#1c1d20", { roughness: 0.88, relief: 0.8 }),
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
    glass: fakeGlass({ sunDir, tint: "#a9c8e2", baseA: 0.24, reflK: 1.1, streak: 0.5 }), glassWS: fakeGlass({ sunDir, streak: 0.12, baseA: 0.06 }),
  };
  const add = (g, m, parent = root, cast = true) => { const o = mesh(g, m, cast); parent.add(o); return o; };
  const { belt: BELT, roofY: ROOF, floorY: FLOOR } = CAR;

  // ---------------------------------------------------------------- lower body: side profile extruded across, cabin notched out
  const S = new THREE.Shape(), r0 = 0.37, dy = 0.09, dx = Math.sqrt(r0 * r0 - dy * dy), a0 = Math.asin(dy / r0);
  // shape x = forward (= -z), y = up
  S.moveTo(-2.0, 0.22);
  S.lineTo(-1.4 - dx, 0.22); S.absarc(-1.4, 0.31, r0, Math.PI + a0, -a0, true);
  S.lineTo(1.38 - dx, 0.22); S.absarc(1.38, 0.31, r0, Math.PI + a0, -a0, true);
  S.lineTo(2.02, 0.22); S.quadraticCurveTo(2.16, 0.24, 2.16, 0.42); S.lineTo(2.15, 0.6); S.quadraticCurveTo(2.13, 0.74, 1.98, 0.77);
  S.quadraticCurveTo(1.4, 0.87, 0.86, 0.94);
  S.lineTo(0.84, 0.94); S.lineTo(0.84, FLOOR); S.lineTo(-1.0, FLOOR); S.lineTo(-1.0, 0.975);             // cabin notch
  S.lineTo(-1.28, 0.985); S.quadraticCurveTo(-1.95, 0.995, -2.1, 0.94); S.quadraticCurveTo(-2.17, 0.88, -2.16, 0.7);
  S.lineTo(-2.13, 0.42); S.quadraticCurveTo(-2.11, 0.23, -2.0, 0.22);
  const lb = new THREE.ExtrudeGeometry(S, { depth: 1.64, bevelEnabled: true, bevelSize: 0.045, bevelThickness: 0.05, bevelSegments: 4, curveSegments: 18 });
  lb.translate(0, 0, -0.82); lb.rotateY(Math.PI / 2); lb.computeVertexNormals();
  add(lb, M.paint);
  // arch liners + underbody fill (no see-through under the hood / trunk)
  for (const z of [CAR.frontZ, CAR.rearZ]) {
    for (const sx of [-1, 1]) { const g = new THREE.CylinderGeometry(0.372, 0.372, 0.34, 24, 1, true, -Math.PI / 2 - 1.35, 2.7); g.rotateZ(Math.PI / 2); g.translate(sx * 0.7, 0.31, z);
      const o = add(g, M.trim); o.material = M.trim.clone(); o.material.side = THREE.BackSide; }
    add(place(new THREE.BoxGeometry(1.0, 0.46, 0.8), [0, 0.47, z]), M.plasticDk);
  }
  add(place(new THREE.BoxGeometry(1.6, 0.06, 4.0), [0, 0.2, 0]), M.plasticDk, root, false);

  // ---------------------------------------------------------------- doors (skins + seams), sills, trim
  const doorSkin = (z0, z1) => roundedBox(0.07, BELT - 0.24, z1 - z0, 0.03);
  const doorInner = (z0, z1) => roundedBox(0.035, 0.52, z1 - z0 - 0.08, 0.012);
  const DZ = [[-0.84, 0.2], [0.22, 0.99]];
  // driver door (front-left): own pivot group at the hinge
  const doorPivot = new THREE.Group(); doorPivot.name = "driverDoor"; doorPivot.position.set(CAR.hinge[0], 0, CAR.hinge[1]); root.add(doorPivot);
  const DL = (x, y, z) => [x - CAR.hinge[0], y, z - CAR.hinge[1]];     // car-local -> door-local
  const dz0 = DZ[0][0], dz1 = DZ[0][1], dzm = (dz0 + dz1) / 2;
  add(place(doorSkin(dz0, dz1), DL(-0.835, 0.61, dzm)), M.paint, doorPivot);
  add(place(doorInner(dz0, dz1), DL(-0.79, 0.62, dzm)), M.leatherPlain, doorPivot);
  add(place(roundedBox(0.07, 0.045, 0.5, 0.02), DL(-0.77, 0.7, dzm + 0.08)), M.plastic, doorPivot);              // armrest
  add(place(roundedBox(0.03, 0.03, 0.12, 0.01), DL(-0.775, 0.84, dz0 + 0.2)), M.chrome, doorPivot);             // inner pull
  add(place(roundedBox(0.035, 0.3, 0.5, 0.01), DL(-0.79, 0.4, dzm)), M.plasticDk, doorPivot);                   // map pocket
  add(place(roundedBox(0.03, 0.035, 0.16, 0.012), DL(-0.88, 0.86, 0.06)), M.chrome, doorPivot);                 // outer handle
  add(place(roundedBox(0.025, 0.06, 0.2, 0.01), DL(-0.872, 0.86, 0.06)), M.trim, doorPivot);
  add(place(roundedBox(0.03, 0.035, dz1 - dz0 - 0.04, 0.01), DL(-0.84, BELT + 0.012, dzm)), M.trim, doorPivot);  // belt seal
  const dGlass = sidePoly([[dz0 + 0.03, BELT + 0.02], [dz1 - 0.02, BELT + 0.02], [dz1 - 0.02, ROOF - 0.04], [-0.1, ROOF - 0.04]], -0.825);
  dGlass.translate(-CAR.hinge[0], 0, -CAR.hinge[1]); const dg = add(dGlass, M.glass, doorPivot, false); dg.renderOrder = 2;
  add(place(roundedBox(0.03, 0.03, 0.02, 0.01), DL(-0.84, ROOF - 0.03, dz1 - 0.01)), M.trim, doorPivot);
  // mirror on the driver door
  add(place(roundedBox(0.1, 0.12, 0.17, 0.045), DL(-0.98, 1.04, -0.72)), M.paint, doorPivot);
  add(place(roundedBox(0.06, 0.05, 0.08, 0.015), DL(-0.9, 1.0, -0.72)), M.trim, doorPivot);
  add(place(roundedBox(0.012, 0.09, 0.14, 0.01), DL(-0.98, 1.04, -0.64)), M.trim, doorPivot);
  // other doors (static)
  for (const [z0, z1] of DZ) { const zm = (z0 + z1) / 2;
    add(place(doorSkin(z0, z1), [0.835, 0.61, zm]), M.paint); add(place(doorInner(z0, z1), [0.79, 0.62, zm]), M.leatherPlain);
    add(place(roundedBox(0.03, 0.035, 0.16, 0.012), [0.88, 0.86, z1 - 0.14]), M.chrome);
    add(place(roundedBox(0.03, 0.035, z1 - z0 - 0.04, 0.01), [0.84, BELT + 0.012, zm]), M.trim);
  }
  { const [z0, z1] = DZ[1], zm = (z0 + z1) / 2;
    add(place(doorSkin(z0, z1), [-0.835, 0.61, zm]), M.paint); add(place(doorInner(z0, z1), [-0.79, 0.62, zm]), M.leatherPlain);
    add(place(roundedBox(0.03, 0.035, 0.16, 0.012), [-0.88, 0.86, z1 - 0.14]), M.chrome);
    add(place(roundedBox(0.03, 0.035, z1 - z0 - 0.04, 0.01), [-0.84, BELT + 0.012, zm]), M.trim); }
  add(place(roundedBox(0.1, 0.42, 0.16, 0.04), [0.92, 1.0, -0.72]), M.trim).scale.set(1, 1, 1);
  add(place(roundedBox(0.1, 0.12, 0.17, 0.045), [0.98, 1.04, -0.72]), M.paint);
  for (const sx of [-1, 1]) {
    add(place(roundedBox(0.05, 0.08, 1.86, 0.02), [sx * 0.86, 0.25, 0.08]), M.trim);                               // sill
    add(place(roundedBox(0.012, 0.05, 0.9, 0.006), [sx * 0.872, 0.55, CAR.frontZ - 0.35]), M.trim);                // body side line (fender)
  }
  // panel seams (dark grooves): hood, trunk, door gaps
  add(place(roundedBox(1.5, 0.008, 0.012, 0.003), [0, 0.952, -0.9]), M.trim);
  add(place(roundedBox(1.5, 0.008, 0.012, 0.003), [0, 0.99, 1.3]), M.trim);
  for (const sx of [-1, 1]) for (const z of [-0.85, 0.21, 1.0]) add(place(roundedBox(0.01, BELT - 0.27, 0.014, 0.004), [sx * 0.873, 0.61, z]), M.trim);
  // hood crease lines (relief)
  for (const sx of [-1, 1]) add(place(roundedBox(0.03, 0.012, 1.05, 0.006), [sx * 0.42, 0.885, -1.5], [-0.12, 0, 0]), M.paint);

  // ---------------------------------------------------------------- greenhouse: pillars, roof, glass
  for (const sx of [-1, 1]) {
    add(beam(V(sx * 0.795, BELT + 0.01, -0.85), V(sx * 0.745, ROOF, -0.06), 0.05, 0.11), M.paint);                         // A pillar
    add(place(roundedBox(0.07, ROOF - BELT, 0.09, 0.02), [sx * 0.81, (ROOF + BELT) / 2, 0.21]), M.trim);           // B pillar (black)
    add(sideSlab([[0.8, ROOF + 0.01], [0.95, ROOF + 0.01], [1.34, BELT], [0.99, BELT]], sx * 0.79, 0.06), M.paint); // C pillar
    add(beam(V(sx * 0.77, ROOF - 0.01, -0.07), V(sx * 0.77, ROOF - 0.01, 0.86), 0.06, 0.07), M.paint);              // roof rail
  }
  add(place(roundedBox(1.5, 0.05, 0.96, 0.024), [0, ROOF + 0.005, 0.39]), M.paint);
  add(place(roundedBox(1.42, 0.02, 0.92, 0.008), [0, ROOF - 0.03, 0.39]), M.liner);                                // headliner
  for (const sx of [-1, 1]) add(place(roundedBox(0.3, 0.012, 0.16, 0.006), [sx * 0.4, ROOF - 0.05, -0.02], [-0.25, 0, 0]), M.liner); // sun visors
  add(place(roundedBox(0.1, 0.03, 0.04, 0.01), [0, ROOF - 0.06, -0.06]), M.plasticDk);                              // mirror
  add(place(roundedBox(0.22, 0.06, 0.012, 0.01), [0, ROOF - 0.09, -0.07]), M.plasticDk);
  // windshield + rear window + fixed side glass
  const ws = quad([0.77, BELT - 0.02, -0.86], [-0.77, BELT - 0.02, -0.86], [-0.72, ROOF - 0.01, -0.07], [0.72, ROOF - 0.01, -0.07]);
  add(ws, M.glassWS, root, false).renderOrder = 2;
  add(quad([-0.74, ROOF - 0.01, 0.86], [0.74, ROOF - 0.01, 0.86], [0.76, BELT + 0.005, 1.3], [-0.76, BELT + 0.005, 1.3]), M.glass, root, false).renderOrder = 2;
  for (const sx of [-1, 1]) {
    add(sidePoly([[0.25, BELT + 0.02], [0.99, BELT + 0.02], [0.8, ROOF - 0.04], [0.25, ROOF - 0.04]], sx * 0.825), M.glass, root, false).renderOrder = 2;
  }
  add(sidePoly([[-0.81, BELT + 0.02], [0.18, BELT + 0.02], [0.18, ROOF - 0.04], [-0.1, ROOF - 0.04]], 0.825), M.glass, root, false).renderOrder = 2;
  // windshield + rear window black frit border / wipers
  add(place(roundedBox(1.5, 0.03, 0.06, 0.01), [0, BELT - 0.005, -0.88]), M.trim);
  for (const sx of [-0.35, 0.3]) add(beam(V(sx - 0.25, BELT + 0.01, -0.84), V(sx + 0.22, BELT + 0.04, -0.82), 0.015, 0.015), M.trim);
  add(place(roundedBox(1.46, 0.03, 0.05, 0.01), [0, ROOF - 0.005, -0.08]), M.trim);

  // ---------------------------------------------------------------- front + rear details
  add(place(roundedBox(0.95, 0.16, 0.08, 0.04), [0, 0.5, -2.17]), M.trim);                                         // grille
  for (let i = 0; i < 4; i++) add(place(roundedBox(0.88, 0.012, 0.02, 0.005), [0, 0.44 + i * 0.04, -2.215]), M.plastic);
  add(place(roundedBox(1.55, 0.09, 0.1, 0.04), [0, 0.3, -2.14]), M.trim);                                          // lower bumper lip
  add(place(roundedBox(1.55, 0.09, 0.1, 0.04), [0, 0.32, 2.12]), M.trim);
  for (const sx of [-1, 1]) {
    add(place(roundedBox(0.36, 0.1, 0.12, 0.04), [sx * 0.6, 0.67, -2.09], [0, sx * 0.12, 0]), M.head);              // headlights
    add(place(roundedBox(0.38, 0.12, 0.08, 0.03), [sx * 0.6, 0.67, -2.07], [0, sx * 0.12, 0]), M.trim);
    add(place(roundedBox(0.34, 0.13, 0.08, 0.035), [sx * 0.6, 0.84, 2.13], [0, -sx * 0.1, 0]), M.tail);             // tail lights
    add(place(roundedBox(0.1, 0.13, 0.08, 0.03), [sx * 0.82, 0.84, 2.08], [0, -sx * 0.4, 0]), M.tailAmber);
    add(place(roundedBox(0.16, 0.05, 0.05, 0.02), [sx * 0.6, 0.38, -2.15]), M.plasticDk);                            // fog light pods
  }
  add(place(roundedBox(0.52, 0.12, 0.012, 0.005), [0, 0.42, -2.225]), M.plate);
  add(place(roundedBox(0.52, 0.12, 0.012, 0.005), [0, 0.6, 2.16]), M.plate);
  add(place(roundedBox(0.56, 0.16, 0.01, 0.005), [0, 0.6, 2.154]), M.trim);
  add(place(new THREE.CylinderGeometry(0.035, 0.035, 0.12, 14).rotateX(Math.PI / 2), [0.5, 0.25, 2.12]), M.chrome);  // exhaust
  add(place(roundedBox(0.3, 0.035, 0.03, 0.012), [0, 0.78, 2.17]), M.chrome);                                    // trunk badge bar (no brand)

  // ---------------------------------------------------------------- wheels
  for (const z of [CAR.frontZ, CAR.rearZ]) for (const sx of [-1, 1]) {
    const w = new THREE.Group(); w.position.set(sx * CAR.wheelX, CAR.wheelR, z); root.add(w);
    const ty = new THREE.TorusGeometry(0.235, 0.088, 14, 36); ty.scale(1, 1, 1.25); ty.rotateY(Math.PI / 2); add(ty, M.rubber, w);
    for (let i = 0; i < 24; i++) { const a = (i / 24) * Math.PI * 2; add(place(new THREE.BoxGeometry(0.17, 0.012, 0.035), [0, Math.cos(a) * 0.314, Math.sin(a) * 0.314], [a, 0, 0]), M.rubber, w, false); }
    const rimG = new THREE.CylinderGeometry(0.19, 0.19, 0.05, 30); rimG.rotateZ(Math.PI / 2); add(place(rimG, [sx * 0.07, 0, 0]), M.rim, w);
    const lip = new THREE.TorusGeometry(0.19, 0.012, 8, 32); lip.rotateY(Math.PI / 2); add(place(lip, [sx * 0.1, 0, 0]), M.chrome, w);
    for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2 + 0.3;
      add(place(roundedBox(0.03, 0.15, 0.045, 0.012), [sx * 0.1, Math.cos(a) * 0.09, Math.sin(a) * 0.09], [a, 0, 0]), M.rim, w); }
    const hub = new THREE.CylinderGeometry(0.05, 0.055, 0.03, 18); hub.rotateZ(Math.PI / 2); add(place(hub, [sx * 0.11, 0, 0]), M.chrome, w);
    add(place(roundedBox(0.02, 0.07, 0.09, 0.01), [sx * 0.05, 0.08, 0.1]), M.plasticDk, w);                         // brake caliper peek
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
