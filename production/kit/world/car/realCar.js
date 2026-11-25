// Real 3D car models (user, 2026-11-24): every car is a detailed vintage model from the Sketchfab "FREE 1950s Car Variety Pack"
// by Libau Media (@robinmikart), CC-BY-4.0 -> credit in the video description. Files: public/models/cars50s/ (see
// asset_library/models/INDEX.md). Hand-coded cars were rejected as "not our style": always use real models for vehicles.
//   loadCarModel(name)  -> normalized Group: nose -Z, wheels on y=0, centred, real size (length ~5 m)
//   CAR_MODELS          -> names in the pack (sedans/wagons/coupes/vans)
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { loadGLTF } from "../../shared/assets.js";

export const CAR_MODELS = ["patrician", "clipper", "54buick", "buickwagon", "hudson", "buick_50", "buick_coupe", "fordpolice", "taxi", "packard_caribbean", "surferwagon", "van"];
let packP = null;
const pack = () => (packP ||= loadGLTF("models/cars50s/scene.gltf").then((g) => { g.scene.updateMatrixWorld(true); return g.scene; }));

/** A model baked into plain meshes in car space: nose -Z, ground y=0, centred x/z, scaled so its length = `length` (m). */
const cache = new Map();
export async function loadCarModel(name, { length = 5.0, stretch = [1, 1, 1], unique = false } = {}) {
  const key = name + "|" + length + "|" + stretch.join(",");
  if (!unique && cache.has(key)) return cache.get(key).clone(true);      // parked cars share geometry + materials
  const scene = await pack();
  const src = scene.getObjectByName(name); if (!src) throw new Error("car model not found: " + name);
  const meshes = []; src.traverse((o) => { if (o.isMesh) meshes.push(o); });
  // bake world transforms
  const parts = meshes.map((m) => { const g = m.geometry.clone(); g.applyMatrix4(m.matrixWorld); return { g, mat: m.material, name: m.name }; });
  // the pack places cars at odd yaws (e.g. 45 deg): find the long axis in the ground plane (PCA) and turn it onto X
  { let n = 0, mx = 0, mz = 0, xx = 0, zz = 0, xz = 0;
    for (const p of parts) { const q = p.g.attributes.position; for (let i = 0; i < q.count; i += 7) { const x = q.getX(i), z = q.getZ(i); n++; mx += x; mz += z; xx += x * x; zz += z * z; xz += x * z; } }
    mx /= n; mz /= n; const cxx = xx / n - mx * mx, czz = zz / n - mz * mz, cxz = xz / n - mx * mz, ang = 0.5 * Math.atan2(2 * cxz, cxx - czz);
    const Ry = new THREE.Matrix4().makeRotationY(ang); for (const p of parts) p.g.applyMatrix4(Ry); }
  const box = new THREE.Box3(); for (const p of parts) { p.g.computeBoundingBox(); box.union(p.g.boundingBox); }
  const size = box.getSize(new THREE.Vector3()), c = box.getCenter(new THREE.Vector3());
  const alongX = size.x > size.z;
  // which end is the nose: headlight glass centroid
  const hl = parts.filter((p) => /headlight/i.test(p.name)); const hb = new THREE.Box3(); for (const p of hl) hb.union(p.g.boundingBox);
  const hc = hl.length ? hb.getCenter(new THREE.Vector3()) : c.clone().add(new THREE.Vector3(alongX ? -1 : 0, 0, alongX ? 0 : -1));
  const noseSign = alongX ? Math.sign(hc.x - c.x) : Math.sign(hc.z - c.z);
  const k = length / (alongX ? size.x : size.z);
  const M = new THREE.Matrix4().makeTranslation(-c.x, -box.min.y, -c.z);
  const R = new THREE.Matrix4();
  if (alongX) R.makeRotationY(noseSign > 0 ? Math.PI / 2 : -Math.PI / 2);      // +x nose -> -z
  else if (noseSign > 0) R.makeRotationY(Math.PI);                             // +z nose -> -z
  const S = new THREE.Matrix4().makeScale(k * stretch[0], k * stretch[1], k * stretch[2]), T = new THREE.Matrix4().multiplyMatrices(S, R).multiply(M);
  const root = new THREE.Group(); root.name = "carModel_" + name;
  for (const p of parts) { p.g.applyMatrix4(T); p.g.computeBoundingBox(); p.g.computeBoundingSphere();
    const m = new THREE.Mesh(p.g, p.mat); m.name = p.name; m.castShadow = !/glass/i.test(p.name); m.receiveShadow = true; root.add(m); }
  if (globalThis.__DBGPARTS === name) for (const m of root.children) { const b = m.geometry.boundingBox; console.log('PART', m.name, b.min.toArray().map((v) => v.toFixed(2)).join(','), b.max.toArray().map((v) => v.toFixed(2)).join(',')); }   // DBGPARTS
  root.userData.size = new THREE.Vector3(size.x, size.y, size.z).multiplyScalar(k);
  { const cv = document.createElement("canvas"); cv.width = cv.height = 64; const g = cv.getContext("2d"), gr = g.createRadialGradient(32, 32, 4, 32, 32, 32);
    gr.addColorStop(0, "rgba(0,0,0,0.75)"); gr.addColorStop(0.6, "rgba(0,0,0,0.45)"); gr.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
    const sz = root.userData.size, sh = new THREE.Mesh(new THREE.PlaneGeometry(sz.x * 1.25, sz.z * 1.12), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(cv), transparent: true, depthWrite: false, opacity: 0.85 }));
    sh.rotation.x = -Math.PI / 2; sh.position.y = 0.012; sh.renderOrder = -1; sh.name = "carContactShadow"; root.add(sh); }   // grounds every car (depth)
  if (!unique) cache.set(key, root);
  return unique ? root : root.clone(true);
}

/** Split triangles whose centroid is inside `box` (car space) out of every mesh: returns [keptGroup, cutGroup]. */
export function cutRegion(group, box) {
  const cut = new THREE.Group(), a = new THREE.Vector3(), b = new THREE.Vector3(), d = new THREE.Vector3(), cen = new THREE.Vector3();
  for (const m of [...group.children]) {
    const g = m.geometry.index ? m.geometry.toNonIndexed() : m.geometry, pos = g.attributes.position, n = pos.count / 3;
    const inside = new Uint8Array(n); let any = 0;
    for (let t = 0; t < n; t++) { a.fromBufferAttribute(pos, 3 * t); b.fromBufferAttribute(pos, 3 * t + 1); d.fromBufferAttribute(pos, 3 * t + 2);
      cen.copy(a).add(b).add(d).multiplyScalar(1 / 3); if (box.containsPoint(cen)) { inside[t] = 1; any++; } }
    if (!any) continue;
    const pick = (want) => { const out = new THREE.BufferGeometry();
      for (const key in g.attributes) { const at = g.attributes[key], is = at.itemSize, arr = new at.array.constructor((want ? any : n - any) * 3 * is); let w = 0;
        for (let t = 0; t < n; t++) if (inside[t] === want) for (let v = 0; v < 3; v++) for (let q = 0; q < is; q++) arr[w++] = at.array[(3 * t + v) * is + q];
        out.setAttribute(key, new THREE.BufferAttribute(arr, is, at.normalized)); }
      return out; };
    const keep = pick(0), take = pick(1);
    m.geometry = keep; const cm = new THREE.Mesh(take, m.material); cm.name = m.name + "_cut"; cm.castShadow = m.castShadow; cm.receiveShadow = true; cut.add(cm);
  }
  return cut;
}

/** The hero car (1954 Buick 4-door, blue/white): the real model, stretched to our cabin numbers (side x +-0.9, belt ~0.98,
 *  roof ~1.42, front door z -0.84..0.2), with the driver door CUT OUT of its own body onto a hinge so it really opens.
 *  Same API + anchors as the toy car (anchors, set({door}), getDoorHandle, toWorld). The model's own interior is kept;
 *  the seat height is measured (raycast) so the bottle + burn spot sit on the real cushion. */
export async function buildRealHeroCar({ name = "heroCar" } = {}) {
  const { toWorld } = await import("./index.js");
  const root = new THREE.Group(); root.name = name;
  const body = await loadCarModel("54buick", { length: 4.9, stretch: [1.08, 1.05, 1], unique: true }); root.add(body);
  for (const m of body.children) { m.material = m.material.clone(); m.material.name = "hero_" + m.material.name; if (/hula/i.test(m.name)) m.visible = false; }
  // TALLER GLASS (user, 2026-11-25): the Buick's windshield was too low to see inside comfortably -> everything above the belt
  // line is raised x1.45 (windshield ~ as tall as the old code car's), and its big wheel is replaced by a lower slim one
  { const YB = 0.95, KG = 1.45; for (const m of body.children) { const q = m.geometry.attributes.position;
      for (let i = 0; i < q.count; i++) { const y = q.getY(i); if (y > YB) q.setY(i, YB + (y - YB) * KG); } q.needsUpdate = true; m.geometry.computeBoundingBox(); m.geometry.computeBoundingSphere(); }
    cutRegion({ children: body.children }, new THREE.Box3(new THREE.Vector3(-0.66, 0.74, -0.58), new THREE.Vector3(-0.02, 1.35, -0.3)));   // old wheel (discarded)
    const wm = new THREE.MeshStandardMaterial({ color: "#1d2025", roughness: 0.5 }); wm.name = "hero_wheel";
    const SW = new THREE.Vector3(-0.4, 0.86, -0.5), sw = new THREE.Group(); sw.position.copy(SW); sw.rotation.x = 0.42; body.add(sw);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.165, 0.022, 12, 40), wm), hub = new THREE.Mesh(new THREE.SphereGeometry(0.05, 16, 10).scale(1, 1, 0.5), wm);
    sw.add(rim, hub); for (const a of [0, 2.1, -2.1]) { const sp = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.16, 6), wm); sp.position.set(Math.sin(a) * 0.08, Math.cos(a) * 0.08, 0); sp.rotation.z = -a; sw.add(sp); }
    const c0 = new THREE.Vector3(-0.4, 0.8, -0.64), cd = SW.clone().sub(c0), col = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, cd.length(), 10), wm);
    col.position.copy(c0).addScaledVector(cd, 0.5); col.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), cd.normalize()); body.add(col);
    for (const o of [rim, hub, col]) { o.castShadow = o.receiveShadow = true; } }
  // driver door: triangles on the outer driver side between the hinge and the B pillar (glass: the tumblehome sits further in)
  const H = new THREE.Vector3(-0.9, 0, -0.84), doorPivot = new THREE.Group(); doorPivot.position.copy(H); root.add(doorPivot);
  const glass = body.children.filter((m) => m.isMesh && /glass/i.test(m.name) && !/headlight/i.test(m.name)), rest = body.children.filter((m) => m.isMesh && !glass.includes(m) && m.material.name !== "hero_wheel");
  const tmp = new THREE.Group();
  const DOORBOX = new THREE.Box3(new THREE.Vector3(-2, 0.1, -0.9), new THREE.Vector3(-0.55, 1.75, 0.24));
  const cutA = cutIslands(rest, DOORBOX), cutB = cutIslands(glass, DOORBOX);
  console.log("HERO_DOOR_PIECES", cutA.children.length + cutB.children.length, cutA.children.map((c) => c.name + ':' + c.geometry.attributes.position.count / 3).join(' '));
  for (const c of [...cutA.children, ...cutB.children]) { c.geometry.translate(-H.x, -H.y, -H.z); doorPivot.add(c); }
  void tmp;
  // seat height (raycast down at the driver seat)
  body.updateMatrixWorld(true);
  // seat cushion height: lowest-backrest-free hit (ignore anything above 0.85 = the bench backrest top)
  const seatHits = []; for (const z of [-0.35, -0.25, -0.15]) { const rc = new THREE.Raycaster(new THREE.Vector3(-0.4, 1.3, z), new THREE.Vector3(0, -1, 0)); rc.far = 1.25;
    for (const h of rc.intersectObjects(rest.filter((m) => !/glass/i.test(m.name)), false)) if (h.point.y < 0.65 && h.point.y > 0.35) { seatHits.push(h.point.y); break; } }
  const seatY = seatHits.length ? Math.max(...seatHits) : 0.56;
  console.log("HERO_SEAT", seatY.toFixed(3), JSON.stringify(seatHits.map((v) => +v.toFixed(3))));
  const solid = rest.filter((m) => !/glass/i.test(m.name));
  const topAt = (x, z, def, y0 = 1.38) => { const r = new THREE.Raycaster(new THREE.Vector3(x, y0, z), new THREE.Vector3(0, -1, 0)); r.far = 1.2; const h = r.intersectObjects(solid, false)[0]; return h ? h.point.y : def; };
  const dashLighter = new THREE.Vector3(-0.1, topAt(-0.1, -0.72, 0.975) + 0.004, -0.72), dashShades = new THREE.Vector3(0.3, topAt(0.3, -0.75, 0.985) + 0.012, -0.75);
  const passSeat = new THREE.Vector3(0.4, topAt(0.4, -0.25, 0.56, 0.85) + 0.05, -0.25);
  const V = (x, y, z) => new THREE.Vector3(x, y, z), handleLocal = V(-0.93, 0.84, 0.05);
  const A = {
    dashLighter, dashShades, passSeat, driverSeatTop: V(-0.4, seatY, -0.3), seatBurnPoint: V(-0.4, seatY + 0.0005, -0.18), seatNormal: V(0, 1, 0),
    doorHandle: handleLocal.clone(), driverDoorOpenSpot: V(-1.32, 0, 0.32), driverDoorOpenYaw: Math.PI / 2, doorHinge: H.clone(),
    views: {
      throughWindshield: { pos: V(-0.4, 3.1, -1.6), target: V(-0.4, seatY + 0.04, -0.22), fov: 30 },   // through the (now tall) windshield, over the slim wheel
      seatMacro: { pos: V(-0.15, seatY + 0.3, -0.45), target: V(-0.4, seatY + 0.015, -0.2), fov: 42 },
      sideWindow: { pos: V(-1.62, 1.9, -0.2), target: V(-0.38, seatY + 0.04, -0.22), fov: 34 },
      doorOpen: { pos: V(-3.5, 1.6, 1.7), target: V(-0.75, 0.85, -0.25), fov: 42 },
    },
  };
  root.userData.anchors = root.anchors = A; root.userData.door = doorPivot; root.userData.seatY = seatY;
  root.getDoorHandle = (out = new THREE.Vector3()) => out.copy(handleLocal).sub(doorPivot.position).applyAxisAngle(V(0, 1, 0), doorPivot.rotation.y).add(doorPivot.position);
  root.toWorld = (view, carGroup = root) => toWorld(view, carGroup);
  const ss = (x) => { const t = Math.max(0, Math.min(1, x)); return t * t * (3 - 2 * t); };
  const set = ({ door = 0 } = {}) => { doorPivot.rotation.y = -1.15 * ss(door); };
  root.set = set; root.userData.set = set; set({ door: 0 });
  return root;
}

/** Move whole connected pieces (islands) whose bounds sit inside `box` out of every mesh -> clean door edges, as modelled. */
export function cutIslands(meshes, box, { minInside = 0.85 } = {}) {
  const cut = new THREE.Group(), v = new THREE.Vector3();
  for (const m of meshes) {
    const g = m.geometry.index ? m.geometry.toNonIndexed() : m.geometry, pos = g.attributes.position, n = pos.count / 3;
    // union-find over triangles that share a (welded) vertex position
    const parent = new Int32Array(n).map((_, i) => i), find = (i) => { while (parent[i] !== i) { parent[i] = parent[parent[i]]; i = parent[i]; } return i; };
    const key = (i) => `${Math.round(pos.getX(i) * 2000)},${Math.round(pos.getY(i) * 2000)},${Math.round(pos.getZ(i) * 2000)}`, seen = new Map();
    for (let i = 0; i < pos.count; i++) { const k = key(i), t = (i / 3) | 0; if (seen.has(k)) { const a = find(seen.get(k)), b = find(t); if (a !== b) parent[a] = b; } else seen.set(k, t); }
    const stats = new Map();
    for (let t = 0; t < n; t++) { const r = find(t); let st = stats.get(r); if (!st) stats.set(r, st = { tot: 0, ins: 0 });
      for (let q = 0; q < 3; q++) { v.fromBufferAttribute(pos, 3 * t + q); st.tot++; if (box.containsPoint(v)) st.ins++; } }
    const inside = new Uint8Array(n); let any = 0;
    for (let t = 0; t < n; t++) { const st = stats.get(find(t)); if (st.ins / st.tot >= minInside) { inside[t] = 1; any++; } }
    if (!any) continue;
    const pick = (want) => { const out = new THREE.BufferGeometry();
      for (const k in g.attributes) { const at = g.attributes[k], is = at.itemSize, arr = new at.array.constructor((want ? any : n - any) * 3 * is); let w = 0;
        for (let t = 0; t < n; t++) if (inside[t] === want) for (let q = 0; q < 3 * is; q++) arr[w++] = at.array[3 * t * is + q];
        out.setAttribute(k, new THREE.BufferAttribute(arr, is, at.normalized)); }
      return out; };
    m.geometry = pick(0); const cm = new THREE.Mesh(pick(1), m.material); cm.name = m.name + "_door"; cm.castShadow = m.castShadow; cm.receiveShadow = true; cut.add(cm);
  }
  return cut;
}
