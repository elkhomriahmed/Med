// Toy car (integrator, 2026-11-24): the hero car rebuilt as a chunky clay TOY in our house style (STYLE_v12 reference):
// short body, big round tyres under puffy fenders, tall rounded cabin with fat pillars, pillow roof, bubble lights, capsule
// bumpers. The driver-door opening is REALLY open in the body (no panel left behind when the door swings out).
// Same API and car-local anchors as the old buildHeroCar (nose -Z, driver = left = -X, seat top y 0.56, hinge (-0.84, -0.84)).
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { leatherMaterial, toWorld } from "./index.js";

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const ss = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const RB = (w, h, d, r, seg = 6) => new RoundedBoxGeometry(w, h, d, seg, Math.min(r, w / 2 - 1e-3, h / 2 - 1e-3, d / 2 - 1e-3));

export async function buildToyCar({ paint = "#e8edf2", name = "heroCar", interior = true } = {}) {
  const root = new THREE.Group(); root.name = name;
  const M = {
    paint: new THREE.MeshPhysicalMaterial({ color: new THREE.Color(paint), roughness: 0.42, clearcoat: 0.55, clearcoatRoughness: 0.25, envMapIntensity: 0.9 }),
    trim: new THREE.MeshStandardMaterial({ color: "#30343b", roughness: 0.6 }),
    tyre: new THREE.MeshStandardMaterial({ color: "#23252a", roughness: 0.92 }),
    rim: new THREE.MeshStandardMaterial({ color: "#dfe3e8", roughness: 0.35, metalness: 0.2 }),
    glass: new THREE.MeshPhysicalMaterial({ color: "#9cc6e4", roughness: 0.08, transmission: 0, transparent: true, opacity: 0.42, envMapIntensity: 1.8, clearcoat: 1, clearcoatRoughness: 0.05, depthWrite: false, side: THREE.DoubleSide }),
    head: new THREE.MeshStandardMaterial({ color: "#fff7e0", emissive: "#fff2cc", emissiveIntensity: 0.25, roughness: 0.3 }),
    tail: new THREE.MeshStandardMaterial({ color: "#d8322a", emissive: "#a01010", emissiveIntensity: 0.25, roughness: 0.35 }),
    cabin: new THREE.MeshStandardMaterial({ color: "#5c626c", roughness: 0.75 }),
    seat: new THREE.MeshStandardMaterial({ color: "#7a808a", roughness: 0.8 }),
    leather: interior ? leatherMaterial("#2a2c30") : new THREE.MeshStandardMaterial({ color: "#2a2c30", roughness: 0.6 }),
    shadow: new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.35, depthWrite: false }),
  };
  for (const k in M) M[k].name = "car_" + k;                       // the lot merges parked cars by material name (unnamed = everything merged as one opaque paint = flicker)
  for (const m of [M.paint, M.trim, M.cabin, M.seat]) m.shadowSide = THREE.BackSide;   // closed rounded shapes: back faces cast -> no acne stripes on the lit roof/bonnet
  const add = (geo, mat, pos, rot = null, parent = root) => { const m = new THREE.Mesh(geo, mat); m.position.set(...pos); if (rot) m.rotation.set(...rot);
    m.castShadow = mat !== M.glass && mat !== M.shadow; m.receiveShadow = mat !== M.glass && mat !== M.shadow; parent.add(m); return m; };

  // ---- lower body: front + rear blocks, passenger wall, floor; the driver side between the hinge (z -0.84) and z 0.20 is OPEN
  const Y0 = 0.3, Y1 = 0.98, HB = Y1 - Y0, YC = (Y0 + Y1) / 2;
  add(RB(1.8, HB, 1.2, 0.3), M.paint, [0, YC, -1.44]);            // front block (bonnet + nose), z -2.04 .. -0.84
  add(RB(1.8, HB, 1.9, 0.3), M.paint, [0, YC, 1.15]);             // rear block, z 0.20 .. 2.10
  add(RB(0.16, HB, 1.2, 0.07), M.paint, [0.82, YC, -0.32]);      // passenger side wall (closed)
  add(RB(1.5, 0.12, 1.08, 0.05), M.cabin, [0, Y0 + 0.07, -0.32]);   // floor pan
  add(RB(0.16, 0.16, 1.06, 0.07), M.paint, [-0.82, Y0 + 0.08, -0.32]);   // driver sill (under the door opening)
  // wheel-arch lips: flat rounded arches flush on the body sides (toy-car look, no floating caps)
  for (const [x, z] of [[-0.9, -1.3], [0.9, -1.3], [-0.9, 1.3], [0.9, 1.3]]) {
    const arch = add(new THREE.TorusGeometry(0.42, 0.06, 10, 28, Math.PI), M.paint, [x, 0.37, z], [0, Math.PI / 2, 0]); arch.scale.set(1, 1, 0.9); }
  // wheels: fat round tyres + domed rims
  const tyreGeo = new THREE.TorusGeometry(0.25, 0.12, 18, 36), rimGeo = new THREE.SphereGeometry(0.17, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2);
  for (const [x, z] of [[-0.82, -1.3], [0.82, -1.3], [-0.82, 1.3], [0.82, 1.3]]) {
    add(tyreGeo, M.tyre, [x, 0.37, z], [0, Math.PI / 2, 0]);
    const rim = add(rimGeo, M.rim, [x + Math.sign(x) * 0.04, 0.37, z], [0, 0, -Math.sign(x) * Math.PI / 2]); rim.scale.set(1, 0.45, 1); }
  // bumpers + bubble lights
  const capX = (len, r) => { const g = new THREE.CapsuleGeometry(r, len, 8, 16); g.rotateZ(Math.PI / 2); return g; };
  add(capX(1.5, 0.11), M.trim, [0, 0.42, -2.06]); add(capX(1.5, 0.11), M.trim, [0, 0.42, 2.12]);
  for (const s of [-1, 1]) { add(new THREE.SphereGeometry(0.15, 24, 16), M.head, [s * 0.58, 0.74, -2.0]); add(new THREE.SphereGeometry(0.11, 20, 14), M.tail, [s * 0.66, 0.76, 2.08]); }

  // ---- cabin on the OLD car's proportions (every designed shot keeps its view): sloped windshield (belt z -0.875 -> roof z -0.08),
  //      roof z -0.14..0.92, rear glass roof z 0.88 -> belt z 1.31; flat rounded pillars flush with the roof (one solid greenhouse)
  const YR = 1.42;
  const pillar = (x0, y0, z0, x1, y1, z1, w = 0.12, d = 0.18) => { const a = V(x0, y0, z0), b = V(x1, y1, z1), dd = b.clone().sub(a);
    const m = add(RB(w, dd.length() + 0.06, d, 0.045), M.paint, [0, 0, 0]); m.position.copy(a).addScaledVector(dd, 0.5);
    m.quaternion.setFromUnitVectors(V(0, 1, 0), dd.normalize()); return m; };
  const poly = (pts, x, mat, parent = root) => { const pos = []; for (let i = 1; i < pts.length - 1; i++) for (const q of [pts[0], pts[i], pts[i + 1]]) pos.push(x, q[1], q[0]);
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.computeVertexNormals(); return add(g, mat, [0, 0, 0], null, parent); };
  for (const s of [-1, 1]) { pillar(s * 0.79, Y1 - 0.06, -0.9, s * 0.76, YR + 0.02, -0.08); pillar(s * 0.79, Y1 - 0.06, 1.34, s * 0.76, YR + 0.02, 0.88, 0.12, 0.24); }
  pillar(0.79, Y1 - 0.06, 0.22, 0.77, YR + 0.02, 0.2, 0.12, 0.14); pillar(-0.79, Y1 - 0.06, 0.27, -0.77, YR + 0.02, 0.25, 0.12, 0.1);   // B pillars (driver one just behind the door)
  add(RB(1.62, 0.15, 1.16, 0.07), M.paint, [0, YR + 0.06, 0.39]);                                // roof, flush with the pillars
  add(RB(1.4, 0.04, 0.9, 0.018), M.trim, [0, YR - 0.04, 0.39]);                                   // headliner
  add(RB(1.52, 0.92, 0.02, 0.01), M.glass, [0, 1.175, -0.4775], [1.056, 0, 0]);                   // windshield (sloped like the old car)
  add(RB(1.52, 0.6, 0.02, 0.01), M.glass, [0, 1.19, 1.095], [-0.797, 0, 0]);                       // rear window
  for (const s of [-1, 1]) poly([[0.3, 0.99], [1.27, 0.99], [0.9, 1.39], [0.3, 1.39]], s * 0.8, M.glass);   // rear side glass
  poly([[-0.84, 0.99], [0.19, 0.99], [0.19, 1.39], [-0.1, 1.39]], 0.8, M.glass);                    // passenger front glass
  add(new THREE.CapsuleGeometry(0.045, 1.42, 8, 16).rotateZ(Math.PI / 2), M.trim, [0, Y1 - 0.01, -0.9]);   // windshield cowl
  // ---- the driver door (hinged at the front, swings out to -X): panel + window frame + glass + handle
  const doorPivot = new THREE.Group(); doorPivot.position.set(-0.84, 0, -0.84); root.add(doorPivot);
  const DL = 1.04;
  add(RB(0.16, HB, DL, 0.07), M.paint, [0, YC, DL / 2], null, doorPivot);
  add(RB(0.1, 0.08, 0.32, 0.035), M.paint, [0.06, YR - 0.02, 0.89], null, doorPivot);                 // window top rail (z -0.1..0.2)
  { const a0 = V(0.06, Y1, 0.04), b0 = V(0.06, YR - 0.02, 0.74), dd = b0.clone().sub(a0);              // front frame along the A-pillar slope
    const m = add(RB(0.1, dd.length(), 0.08, 0.035), M.paint, [0, 0, 0], null, doorPivot); m.position.copy(a0).addScaledVector(dd, 0.5); m.quaternion.setFromUnitVectors(V(0, 1, 0), dd.normalize()); }
  add(RB(0.1, YR - Y1, 0.1, 0.04), M.paint, [0.06, (Y1 + YR) / 2, DL - 0.07], null, doorPivot);     // rear frame post
  poly([[0.06, 0.99], [DL - 0.1, 0.99], [DL - 0.1, 1.38], [0.74, 1.38]], 0.06, M.glass, doorPivot);    // door glass
  add(capX(0.08, 0.022), M.trim, [-0.09, 0.86, 0.9], [0, Math.PI / 2, 0], doorPivot);           // handle
  const handleLocal = V(-0.9, 0.86, 0.06);

  // ---- interior (chunky): dash, wheel, seats, rear bench
  if (interior) {
    add(RB(1.62, 0.34, 0.34, 0.12), M.cabin, [0, 0.8, -0.72]);                                   // dash body (old car)
    add(RB(1.56, 0.1, 0.4, 0.05), M.trim, [0, 0.95, -0.7], [0.12, 0, 0]);                          // dash top pad
    add(RB(0.44, 0.12, 0.2, 0.06), M.trim, [-0.4, 0.98, -0.62]);                                   // binnacle
    add(RB(0.3, 0.4, 0.18, 0.07), M.cabin, [0, 0.64, -0.6]);                                       // centre stack
    add(RB(0.22, 0.2, 0.86, 0.08), M.cabin, [0, 0.52, -0.12]);                                     // console
    const SW = V(-0.4, 0.86, -0.47), col0 = V(-0.4, 0.8, -0.66), dd = SW.clone().sub(col0);
    const col = add(new THREE.CylinderGeometry(0.045, 0.045, dd.length(), 12), M.trim, [0, 0, 0]); col.position.copy(col0).addScaledVector(dd, 0.5); col.quaternion.setFromUnitVectors(V(0, 1, 0), dd.normalize());
    const sw = new THREE.Group(); sw.position.copy(SW); sw.rotation.x = 0.42; root.add(sw);
    add(new THREE.TorusGeometry(0.165, 0.03, 16, 48), M.trim, [0, 0, 0], null, sw); add(new THREE.SphereGeometry(0.07, 20, 12).scale(1, 1, 0.5), M.cabin, [0, 0, 0.005], null, sw);
    for (const [x, mat] of [[-0.4, M.leather], [0.4, M.seat]]) {                                    // seats (old car): cushion top at 0.56
      const g = new THREE.Group(); g.position.set(x, 0, 0); root.add(g);
      add(RB(0.44, 0.12, 0.44, 0.05), M.trim, [0, 0.43, 0], null, g); add(RB(0.52, 0.15, 0.52, 0.07), mat, [0, 0.485, 0], null, g);
      const bk = new THREE.Group(); bk.position.set(0, 0.54, 0.27); bk.rotation.x = 0.24; g.add(bk);
      add(RB(0.52, 0.66, 0.16, 0.075), mat, [0, 0.34, 0.03], null, bk); add(RB(0.3, 0.19, 0.13, 0.065), mat, [0, 0.8, 0.05], null, bk);
    }
    add(RB(1.4, 0.18, 0.5, 0.07), M.seat, [0, 0.5, 0.9]); add(RB(1.4, 0.5, 0.14, 0.06), M.seat, [0, 0.82, 1.12], [-0.2, 0, 0]);
  }
  // ---- soft contact shadow under the body
  const sh = new THREE.Mesh(new THREE.CircleGeometry(1, 40), M.shadow); sh.rotation.x = -Math.PI / 2; sh.position.y = 0.006; sh.scale.set(1.05, 2.35, 1); sh.name = "contactShadow"; root.add(sh);

  // ---- anchors + views (car-local; same as before)
  const A = {
    driverSeatTop: V(-0.4, 0.56, -0.035), seatBurnPoint: V(-0.4, 0.5605, 0.085), seatNormal: V(0, 1, 0),
    doorHandle: handleLocal.clone(), driverDoorOpenSpot: V(-1.32, 0, 0.32), driverDoorOpenYaw: Math.PI / 2, doorHinge: V(-0.84, 0, -0.84),
    views: {
      throughWindshield: { pos: V(-0.3, 3.2, -1.62), target: V(-0.4, 0.6, 0.03), fov: 30 },
      seatMacro: { pos: V(-0.18, 0.84, -0.17), target: V(-0.4, 0.575, 0.07), fov: 42 },
      sideWindow: { pos: V(-1.62, 1.9, 0.08), target: V(-0.38, 0.6, 0.02), fov: 34 },
      doorOpen: { pos: V(-3.5, 1.6, 1.7), target: V(-0.75, 0.85, -0.25), fov: 42 },
    },
  };
  root.userData.anchors = root.anchors = A; root.userData.materials = M; root.userData.door = doorPivot;
  root.getDoorHandle = (out = new THREE.Vector3()) => { doorPivot.updateMatrix(); return out.copy(handleLocal).sub(doorPivot.position).applyAxisAngle(V(0, 1, 0), doorPivot.rotation.y).add(doorPivot.position); };
  root.toWorld = (view, carGroup = root) => toWorld(view, carGroup);
  const set = ({ door = 0 } = {}) => { doorPivot.rotation.y = -1.15 * ss(0, 1, Math.max(0, Math.min(1, door))); };
  root.set = set; root.userData.set = set; set({ door: 0 });
  return root;
}
