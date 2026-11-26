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
    paint: new THREE.MeshPhysicalMaterial({ color: new THREE.Color(paint), roughness: 0.32, clearcoat: 1.0, clearcoatRoughness: 0.12, envMapIntensity: 1.1 }),
    chrome: new THREE.MeshStandardMaterial({ color: "#c9ced4", roughness: 0.25, metalness: 0.85 }),
    black: new THREE.MeshStandardMaterial({ color: "#1b1d21", roughness: 0.45 }),
    plate: new THREE.MeshStandardMaterial({ color: "#f1f1ec", roughness: 0.5 }),
    trim: new THREE.MeshStandardMaterial({ color: "#30343b", roughness: 0.6 }),
    tyre: new THREE.MeshStandardMaterial({ color: "#23252a", roughness: 0.92 }),
    rim: new THREE.MeshStandardMaterial({ color: "#dfe3e8", roughness: 0.35, metalness: 0.2 }),
    glass: new THREE.MeshPhysicalMaterial({ color: "#6f8796", roughness: 0.06, transmission: 0, transparent: true, opacity: 0.5, envMapIntensity: 1.8, clearcoat: 1, clearcoatRoughness: 0.05, depthWrite: false, side: THREE.DoubleSide }),
    head: new THREE.MeshPhysicalMaterial({ color: "#f4f6f8", emissive: "#fff6dc", emissiveIntensity: 0.35, roughness: 0.1, clearcoat: 1 }),
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

  // ---- REAL-CAR exterior (competitor style, 2026-11-24): realistic sedan proportions, side-profile bodies with wheel-arch cut-outs,
  //      glossy clearcoat paint, slim pillars, flush dark glass, alloy wheels, real lights, grille, bumpers, mirrors, handles.
  //      Cabin numbers unchanged (belt 0.98, roof 1.42, windshield z -0.875 -> -0.08, roof -0.14..0.92, rear glass to 1.31),
  //      so every inside / through-the-glass shot keeps its view. Driver side between the hinge (z -0.84) and z 0.20 is the door.
  const Y0 = 0.3, Y1 = 0.98, HB = Y1 - Y0, YC = (Y0 + Y1) / 2, YR = 1.42, WR = 0.36, AR = 0.43, ACY = WR + 0.01;
  const capX = (len, r) => { const g = new THREE.CapsuleGeometry(r, len, 8, 16); g.rotateZ(Math.PI / 2); return g; };
  // side profile in car (z, y); shape x = -z; "arch" = wheel-arch cut-out (x increases along the bottom edge)
  const profile = (pts, arches, x0, x1, mat = M.paint, bev = 0.05) => {
    const sh = new THREE.Shape(); sh.moveTo(-pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) { const p = pts[i];
      if (p === "arch") { const xc = -arches.shift(), dy = Y0 - ACY, dx = Math.sqrt(AR * AR - dy * dy);
        sh.lineTo(xc - dx, Y0); sh.absarc(xc, ACY, AR, Math.atan2(dy, -dx), Math.atan2(dy, dx), true); }
      else sh.lineTo(-p[0], p[1]); }
    const g = new THREE.ExtrudeGeometry(sh, { depth: x1 - x0 - 2 * bev, bevelEnabled: true, bevelThickness: bev, bevelSize: bev * 0.8, bevelSegments: 4, curveSegments: 28 });
    g.rotateY(Math.PI / 2); g.translate(x0 + bev, 0, 0); g.computeVertexNormals(); return add(g, mat, [0, 0, 0]); };
  // front: nose + bonnet (z -2.2 .. -0.84), arch over the front wheel at z -1.3
  profile([[-0.84, Y0], "arch", [-2.02, Y0], [-2.15, 0.36], [-2.2, 0.55], [-2.19, 0.74], [-2.1, 0.84], [-1.6, 0.92], [-0.84, 0.98]], [-1.3], -0.9, 0.9);
  // rear: quarter + boot (z 0.20 .. 2.17), arch at z 1.3
  profile([[0.2, 0.98], [1.31, 1.0], [1.85, 0.99], [2.12, 0.93], [2.17, 0.74], [2.15, 0.42], [2.05, Y0], "arch", [0.2, Y0]], [1.3], -0.9, 0.9);
  profile([[-0.84, Y0], [0.2, Y0], [0.2, 0.98], [-0.84, 0.98]], [], 0.74, 0.9);                  // passenger front door (closed)
  add(RB(1.5, 0.12, 1.08, 0.05), M.cabin, [0, Y0 + 0.07, -0.32]);                                // floor pan
  add(RB(0.14, 0.12, 1.06, 0.05), M.black, [-0.83, Y0 + 0.04, -0.32]);                            // driver sill (under the door opening)
  // panel seams, lower trim, wheel-arch liners
  for (const s of [-1, 1]) { add(RB(0.012, HB - 0.06, 0.012, 0.004), M.black, [s * 0.905, YC + 0.02, 0.2]);
    if (s > 0) add(RB(0.012, HB - 0.06, 0.012, 0.004), M.black, [0.905, YC + 0.02, -0.845]);
    add(RB(0.02, 0.06, 0.5, 0.01), M.black, [s * 0.9, Y0 + 0.05, -0.32]); }
  for (const [x, z] of [[-0.84, -1.3], [0.84, -1.3], [-0.84, 1.3], [0.84, 1.3]]) add(new THREE.CylinderGeometry(AR - 0.01, AR - 0.01, 0.1, 28, 1, true, -Math.PI / 2, Math.PI), M.black, [x, ACY, z], [0, 0, Math.PI / 2]);
  // alloy wheels: tyre with sidewall bulge, 5-spoke rim, hub
  for (const [x, z] of [[-0.8, -1.3], [0.8, -1.3], [-0.8, 1.3], [0.8, 1.3]]) {
    const w = new THREE.Group(); w.position.set(x, WR, z); root.add(w); const sx = Math.sign(x);
    add(new THREE.CylinderGeometry(WR, WR, 0.24, 36), M.tyre, [0, 0, 0], [0, 0, Math.PI / 2], w);
    add(new THREE.TorusGeometry(WR - 0.05, 0.05, 10, 36), M.tyre, [sx * 0.1, 0, 0], [0, Math.PI / 2, 0], w);
    add(new THREE.CylinderGeometry(0.23, 0.23, 0.02, 32), M.black, [sx * 0.115, 0, 0], [0, 0, Math.PI / 2], w);
    add(new THREE.TorusGeometry(0.215, 0.022, 8, 36), M.chrome, [sx * 0.125, 0, 0], [0, Math.PI / 2, 0], w);
    for (let k = 0; k < 5; k++) { const a = (k / 5) * Math.PI * 2; const sp = add(RB(0.025, 0.2, 0.05, 0.01), M.chrome, [sx * 0.128, Math.cos(a) * 0.105, Math.sin(a) * 0.105], null, w); sp.rotation.x = -a; }
    add(new THREE.SphereGeometry(0.055, 18, 12).scale(0.5, 1, 1), M.chrome, [sx * 0.13, 0, 0], null, w); }
  // bumpers, grille, lights, plates, mirrors
  add(RB(1.84, 0.2, 0.22, 0.09), M.paint, [0, 0.44, -2.12]); add(RB(1.84, 0.2, 0.22, 0.09), M.paint, [0, 0.46, 2.1]);
  add(RB(1.5, 0.06, 0.06, 0.025), M.black, [0, 0.35, -2.22]); add(RB(1.5, 0.06, 0.06, 0.025), M.black, [0, 0.37, 2.2]);
  add(RB(0.86, 0.16, 0.05, 0.03), M.black, [0, 0.66, -2.18]); add(RB(0.86, 0.02, 0.05, 0.01), M.chrome, [0, 0.75, -2.195]);
  add(RB(0.42, 0.1, 0.02, 0.01), M.plate, [0, 0.46, -2.235]); add(RB(0.42, 0.1, 0.02, 0.01), M.plate, [0, 0.62, 2.18]);
  for (const s of [-1, 1]) {
    add(RB(0.38, 0.13, 0.05, 0.04), M.black, [s * 0.62, 0.77, -2.15]); add(RB(0.34, 0.1, 0.05, 0.035), M.head, [s * 0.62, 0.77, -2.165]);
    add(RB(0.34, 0.1, 0.05, 0.035), M.tail, [s * 0.66, 0.84, 2.15]);
    const mg = new THREE.Group(); mg.position.set(s * 0.93, 1.05, -0.72); root.add(mg);
    add(RB(0.06, 0.04, 0.05, 0.015), M.black, [-s * 0.03, -0.03, 0], null, mg); add(RB(0.1, 0.11, 0.16, 0.04), M.paint, [s * 0.03, 0.02, 0], null, mg); }
  // ---- greenhouse: slim pillars (A/C body colour, B black), thin roof panel, flush dark glass
  const pillar = (x0, y0, z0, x1, y1, z1, w = 0.07, d = 0.09, mat = M.paint) => { const a = V(x0, y0, z0), b = V(x1, y1, z1), dd = b.clone().sub(a);
    const m = add(RB(w, dd.length() + 0.04, d, 0.03), mat, [0, 0, 0]); m.position.copy(a).addScaledVector(dd, 0.5);
    m.quaternion.setFromUnitVectors(V(0, 1, 0), dd.normalize()); return m; };
  const poly = (pts, x, mat, parent = root) => { const pos = []; for (let i = 1; i < pts.length - 1; i++) for (const q of [pts[0], pts[i], pts[i + 1]]) pos.push(x, q[1], q[0]);
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.computeVertexNormals(); return add(g, mat, [0, 0, 0], null, parent); };
  for (const s of [-1, 1]) { pillar(s * 0.8, Y1 - 0.02, -0.88, s * 0.76, YR + 0.01, -0.1); pillar(s * 0.8, Y1 - 0.02, 1.3, s * 0.76, YR + 0.01, 0.9, 0.07, 0.2); }
  pillar(0.8, Y1 - 0.02, 0.22, 0.77, YR + 0.01, 0.2, 0.06, 0.09, M.black); pillar(-0.8, Y1 - 0.02, 0.27, -0.77, YR + 0.01, 0.25, 0.06, 0.06, M.black);   // B pillars
  add(RB(1.58, 0.07, 1.12, 0.035), M.paint, [0, YR + 0.03, 0.39]);                              // roof panel
  add(RB(1.4, 0.04, 0.9, 0.018), M.trim, [0, YR - 0.02, 0.39]);                                   // headliner
  add(RB(1.52, 0.92, 0.02, 0.01), M.glass, [0, 1.175, -0.4775], [1.056, 0, 0]);                   // windshield
  add(RB(1.52, 0.6, 0.02, 0.01), M.glass, [0, 1.19, 1.095], [-0.797, 0, 0]);                       // rear window
  for (const s of [-1, 1]) poly([[0.3, 0.99], [1.27, 0.99], [0.9, 1.39], [0.3, 1.39]], s * 0.8, M.glass);   // rear side glass
  poly([[-0.84, 0.99], [0.19, 0.99], [0.19, 1.39], [-0.1, 1.39]], 0.8, M.glass);                    // passenger front glass
  add(RB(0.02, 0.025, 1.1, 0.01), M.chrome, [0.91, 0.995, 0.75]); add(RB(0.02, 0.025, 1.1, 0.01), M.chrome, [-0.91, 0.995, 0.75]); add(RB(0.02, 0.025, 1.0, 0.01), M.chrome, [0.91, 0.995, -0.32]);
  add(RB(1.5, 0.05, 0.06, 0.02), M.black, [0, Y1, -0.9]);                                        // windshield cowl
  // ---- the driver door (hinged at the front, swings out to -X): panel + slim black window frame + glass + handle
  const doorPivot = new THREE.Group(); doorPivot.position.set(-0.84, 0, -0.84); root.add(doorPivot);
  const DL = 1.04;
  add(RB(0.14, HB, DL - 0.01, 0.05), M.paint, [0.0, YC, DL / 2], null, doorPivot);
  add(RB(0.05, 0.04, 0.32, 0.015), M.black, [0.06, YR - 0.02, 0.89], null, doorPivot);              // window top rail (z -0.1..0.2)
  { const a0 = V(0.06, Y1, 0.04), b0 = V(0.06, YR - 0.02, 0.74), dd = b0.clone().sub(a0);              // front frame along the A-pillar slope
    const m = add(RB(0.05, dd.length(), 0.04, 0.015), M.black, [0, 0, 0], null, doorPivot); m.position.copy(a0).addScaledVector(dd, 0.5); m.quaternion.setFromUnitVectors(V(0, 1, 0), dd.normalize()); }
  add(RB(0.05, YR - Y1, 0.05, 0.015), M.black, [0.06, (Y1 + YR) / 2, DL - 0.05], null, doorPivot);   // rear frame post
  poly([[0.06, 0.99], [DL - 0.1, 0.99], [DL - 0.1, 1.38], [0.74, 1.38]], 0.06, M.glass, doorPivot);    // door glass
  add(RB(0.02, 0.025, DL - 0.04, 0.01), M.chrome, [-0.075, 0.995, DL / 2], null, doorPivot);         // chrome belt
  add(capX(0.1, 0.018), M.chrome, [-0.085, 0.86, 0.9], [0, Math.PI / 2, 0], doorPivot);             // handle
  for (const [x, z] of [[0.915, 0.06], [-0.915, 1.1], [0.915, 1.1]]) add(capX(0.1, 0.018), M.chrome, [x, 0.86, z], [0, Math.PI / 2, 0]);
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
