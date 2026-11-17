// World kit: CC0 glTF props (Poly Haven, real-world scale in metres) saved as public/models/<name>/<name>.gltf.
import * as THREE from "three";
import { loadGLTF, rng } from "../shared/assets.js";
import { roundedBox, roundedCylinder, boxUV, lathe, tube } from "./geometry.js";
import { pbr, plain, canvasTex, noiseNormal } from "./materials.js";

/** Downloaded props (1k textures). Add more with the Poly Haven API (see world/README section in index.js). */
export const PROPS = ["wooden_crate_01", "wooden_crate_02", "wine_barrel_01", "wooden_lantern_01", "wooden_bucket_02", "small_oil_can_01",
  "oil_tin", "book_encyclopedia_set_01", "wooden_hammer_01", "metal_jug"];

const cache = new Map();
/** Load (cached) and clone a prop. opts: position, rotationY (rad), scale, tint (multiplies base colour), envMapIntensity. */
export async function prop(name, { position = [0, 0, 0], rotationY = 0, rotation = null, scale = 1, tint = null, envMapIntensity = 0.7,
  cast = true, receive = true } = {}) {
  if (!cache.has(name)) cache.set(name, loadGLTF(`models/${name}/${name}.gltf`));
  const src = (await cache.get(name)).scene, o = src.clone(true);
  o.traverse((m) => { if (!m.isMesh) return; m.castShadow = cast; m.receiveShadow = receive;
    m.material = m.material.clone(); m.material.envMapIntensity = envMapIntensity; if (tint) m.material.color.multiply(new THREE.Color(...tint)); });
  o.position.set(...position); if (rotation) o.rotation.set(...rotation); else o.rotation.y = rotationY;
  o.scale.setScalar(scale); o.name = name; return o;
}

/** Bounding size of a loaded prop (for stacking). */
export function sizeOf(o) { return new THREE.Box3().setFromObject(o).getSize(new THREE.Vector3()); }

// ------------------------------------------------------------------------------------------------ procedural story props
// Every builder returns a THREE.Group whose origin is the BOTTOM CENTRE (sits on a surface at y = 0 of its parent) unless
// noted, with userData.grip = local point the hand holds (attach the prop so grip lands on ch.handWorld()).

const shadows = (o) => { o.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } }); return o; };

/** Superellipse outline (rounded square) sampled as points, with bites cut out: bites = [[cx, cy, r], ...]. */
function biteOutline(a, n = 120, bites = [], wave = 0, waveN = 9, ph = 0) {
  const pts = [];
  for (let i = 0; i < n; i++) {
    const t = (i / n) * Math.PI * 2, c = Math.cos(t), s = Math.sin(t);
    let r = (a / Math.pow(Math.pow(Math.abs(c), 4) + Math.pow(Math.abs(s), 4), 0.25)) * (1 + wave * Math.sin(waveN * t + ph));
    for (let k = 0; k < 80 && bites.some(([bx, by, br]) => Math.hypot(r * c - bx, r * s - by) < br); k++) r -= 0.003;
    pts.push(new THREE.Vector2(r * c, r * s));
  }
  return new THREE.Shape(pts);
}
const layer = (shape, depth, y, mat, bevel = 0.004) => {
  const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 2, curveSegments: 6 });
  g.rotateX(-Math.PI / 2); g.translate(0, y, 0); return new THREE.Mesh(g, mat);
};

/** Giant sandwich (~0.32 m wide): toasted bread, ham, lettuce, tomato, cheese. Origin = centre of the bottom slice.
 *  userData.setBites(0|1|2) swaps to the bitten version (cut on the +X side). grip = its centre. */
export function createSandwich() {
  const root = new THREE.Group(); root.name = "sandwich";
  const crust = new THREE.MeshStandardMaterial({ color: new THREE.Color(0.62, 0.34, 0.12), roughness: 0.85 });
  const bread = new THREE.MeshStandardMaterial({ color: new THREE.Color(0.95, 0.72, 0.38), roughness: 0.9 });
  const ham = new THREE.MeshStandardMaterial({ color: new THREE.Color(0.93, 0.48, 0.48), roughness: 0.6 });
  const lettuce = new THREE.MeshStandardMaterial({ color: new THREE.Color(0.32, 0.66, 0.12), roughness: 0.55, side: THREE.DoubleSide });
  const tomato = new THREE.MeshStandardMaterial({ color: new THREE.Color(0.85, 0.12, 0.06), roughness: 0.35 });
  const cheese = new THREE.MeshStandardMaterial({ color: new THREE.Color(1.0, 0.72, 0.12), roughness: 0.5 });
  const BITES = [[], [[0.17, 0.05, 0.065], [0.165, -0.06, 0.06]], [[0.17, 0.05, 0.065], [0.165, -0.06, 0.06], [0.07, 0.165, 0.065]]];
  const variants = BITES.map((b) => {
    const g = new THREE.Group(), a = 0.15;
    const slice = (y) => layer(biteOutline(a, 120, b), 0.04, y, [bread, crust], 0.012);
    g.add(slice(0.012));
    g.add(layer(biteOutline(a * 1.03, 120, b, 0.035, 7, 1), 0.01, 0.068, ham, 0.002));
    g.add(layer(biteOutline(a * 1.1, 160, b, 0.07, 11, 0), 0.008, 0.08, lettuce, 0.002));
    for (const [x, z] of [[-0.07, -0.05], [-0.06, 0.06], [0.03, -0.08]]) {
      const t = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.014, 24), tomato); t.position.set(x, 0.094, z); g.add(t); }
    const ch = layer(biteOutline(a * 1.0, 120, b.map(([x, y, r]) => { const c = Math.cos(-0.5), s = Math.sin(-0.5); return [x * c - y * s, x * s + y * c, r]; })), 0.008, 0.103, cheese, 0.001);
    ch.rotation.y = 0.5; g.add(ch);
    g.add(slice(0.124));
    return shadows(g);
  });
  variants.forEach((v, i) => { v.visible = i === 0; root.add(v); });
  root.userData.setBites = (n) => variants.forEach((v, i) => (v.visible = i === Math.max(0, Math.min(2, n | 0))));
  root.userData.grip = new THREE.Vector3(0, 0.09, 0);
  return root;
}

/** Cleaning rag (~0.34 x 0.3 m), crumpled cotton with dirty smudges, lying on a surface (origin = bottom centre). */
export function createRag({ seed = 5 } = {}) {
  const r = rng(seed);
  const tex = canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = "#d9cfb8"; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(${90 + r() * 40},${70 + r() * 30},${50 + r() * 20},${0.05 + r() * 0.12})`;
      g.beginPath(); g.ellipse(r() * w, r() * h, 8 + r() * 40, 5 + r() * 20, r() * 3, 0, 7); g.fill(); }
    g.strokeStyle = "rgba(120,100,80,0.25)"; g.lineWidth = 1; for (let y = 0; y < h; y += 4) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
  });
  const geo = new THREE.PlaneGeometry(0.34, 0.3, 28, 24); geo.rotateX(-Math.PI / 2);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i), e = Math.max(Math.abs(x) / 0.17, Math.abs(z) / 0.15);
    const y = 0.012 + 0.018 * (0.5 + 0.5 * Math.sin(x * 38 + 1.3) * Math.cos(z * 31)) + 0.012 * Math.sin(x * 70 + z * 40)
      + 0.03 * Math.max(0, 1 - Math.hypot(x + 0.03, z - 0.02) / 0.1) - 0.012 * Math.pow(e, 3);
    p.setY(i, Math.max(0.002, y)); p.setX(i, x * (1 - 0.12 * Math.sin(z * 9))); }
  geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: tex, roughness: 0.95, side: THREE.DoubleSide, normalMap: noiseNormal(), normalScale: new THREE.Vector2(0.6, 0.6) }));
  const root = shadows(new THREE.Group().add(m)); root.name = "rag"; root.userData.grip = new THREE.Vector3(0, 0.03, 0); return root;
}

/** Engineer's metal toolbox (~0.46 m long), painted green with rust, iron handle, brass latches. grip = handle top. */
export async function createToolbox() {
  const body = await pbr("greenMetal", { color: [1.05, 1.1, 1.0], metalness: 0.55, roughness: 1, normalScale: 1.2, vertexColors: false });
  const iron = plain(0x2a2826, { roughness: 0.4, metalness: 0.7, relief: 0.3 }), brass = plain(0xd9a441, { roughness: 0.3, metalness: 0.85, relief: 0.15 });
  const g = new THREE.Group(); g.name = "toolbox";
  const b = new THREE.Mesh(boxUV(roundedBox(0.46, 0.17, 0.2, 0.015), 0.5), body); b.position.y = 0.095; g.add(b);
  const lid = new THREE.Mesh(boxUV(roundedBox(0.47, 0.05, 0.21, 0.015), 0.5), body); lid.position.y = 0.2; g.add(lid);
  const ridge = new THREE.Mesh(boxUV(roundedBox(0.44, 0.03, 0.1, 0.012), 0.5), body); ridge.position.y = 0.235; g.add(ridge);
  for (const s of [-1, 1]) { const post = new THREE.Mesh(roundedCylinder(0.012, 0.07, 0.004, 10), iron); post.position.set(s * 0.12, 0.28, 0); g.add(post);
    const l = new THREE.Mesh(roundedBox(0.04, 0.05, 0.012, 0.004), brass); l.position.set(s * 0.15, 0.18, 0.106); g.add(l); }
  const h = new THREE.Mesh(tube([new THREE.Vector3(-0.12, 0.3, 0), new THREE.Vector3(-0.08, 0.335, 0), new THREE.Vector3(0.08, 0.335, 0), new THREE.Vector3(0.12, 0.3, 0)], 0.012, 24, 8), iron); g.add(h);
  for (const s of [-1, 1]) for (const t of [-1, 1]) { const f = new THREE.Mesh(roundedBox(0.04, 0.012, 0.04, 0.004), iron); f.position.set(s * 0.2, 0.006, t * 0.08); g.add(f); }
  g.userData.grip = new THREE.Vector3(0, 0.335, 0);
  return shadows(g);
}

/** Pewter/steel pouring jug (0.24 m) with a spout on +X and handle on -X, mercury visible inside when userData.setLevel(k>0).
 *  userData.spout (local) + spoutWorld() for the pour stream; grip = handle. */
export async function createJug() {
  const steel = plain(0xb4b7bb, { roughness: 0.3, metalness: 0.9, relief: 0.25, envMapIntensity: 1.3 });   // polished pewter
  const g = new THREE.Group(); g.name = "jug";
  const prof = [[0, 0.004], [0.066, 0.0], [0.074, 0.008], [0.08, 0.05], [0.078, 0.11], [0.068, 0.17], [0.058, 0.205], [0.062, 0.222], [0.066, 0.232],
    [0.061, 0.236], [0.055, 0.226], [0.052, 0.2], [0.07, 0.11], [0.068, 0.03], [0, 0.026]];
  const body = new THREE.Mesh(lathe(prof, 40), steel); body.material.side = THREE.DoubleSide; g.add(body);
  const sp = new THREE.CylinderGeometry(0.01, 0.024, 0.075, 16, 1, true); sp.rotateZ(-Math.PI / 2 + 0.45); sp.translate(0.088, 0.218, 0);
  const spout = new THREE.Mesh(sp, steel); g.add(spout);
  const hd = new THREE.Mesh(tube([new THREE.Vector3(-0.06, 0.2, 0), new THREE.Vector3(-0.12, 0.2, 0), new THREE.Vector3(-0.13, 0.12, 0), new THREE.Vector3(-0.1, 0.06, 0), new THREE.Vector3(-0.072, 0.05, 0)], 0.011, 32, 8), steel); g.add(hd);
  const merc = new THREE.Mesh(new THREE.CircleGeometry(0.06, 32), new THREE.MeshStandardMaterial({ color: 0xd2d6dc, metalness: 1, roughness: 0.06, envMapIntensity: 1.6 }));
  merc.rotation.x = -Math.PI / 2; merc.position.y = 0.19; g.add(merc);
  g.userData.setLevel = (k) => { merc.visible = k > 0.01; merc.position.y = 0.04 + 0.15 * THREE.MathUtils.clamp(k, 0, 1); merc.scale.setScalar(0.85 + 0.15 * k); };
  g.userData.spout = new THREE.Vector3(0.124, 0.234, 0);
  g.userData.grip = new THREE.Vector3(-0.125, 0.14, 0);
  g.userData.spoutWorld = (out = new THREE.Vector3()) => { g.updateWorldMatrix(true, false); return out.copy(g.userData.spout).applyMatrix4(g.matrixWorld); };
  shadows(g); merc.castShadow = false; return g;
}

/** Spilled lamp oil on the floor: an irregular glossy amber puddle. set(k 0..1) grows it from nothing (no pop). */
export function createOilPuddle({ radius = 0.24, seed = 3 } = {}) {
  const r = rng(seed), ph = [r() * 6, r() * 6, r() * 6], pts = [];
  for (let i = 0; i < 64; i++) { const t = (i / 64) * Math.PI * 2;
    const rr = radius * (1 + 0.16 * Math.sin(3 * t + ph[0]) + 0.09 * Math.sin(5 * t + ph[1]) + 0.05 * Math.sin(9 * t + ph[2]));
    pts.push(new THREE.Vector2(rr * Math.cos(t), rr * Math.sin(t))); }
  const geo = new THREE.ShapeGeometry(new THREE.Shape(pts), 6); geo.rotateX(-Math.PI / 2);
  const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: new THREE.Color(0.16, 0.09, 0.025), roughness: 0.04, metalness: 0.1, envMapIntensity: 1.8,
    transparent: true, opacity: 0.88, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4, depthWrite: false }));
  m.position.y = 0.002; m.receiveShadow = true; m.castShadow = false; m.renderOrder = 2; m.name = "oilPuddle";
  const g = new THREE.Group().add(m); g.name = "oilSpill"; g.visible = false;
  g.userData.set = (k) => { const kk = THREE.MathUtils.clamp(k, 0, 1); g.visible = kk > 0.002; const s = Math.sqrt(kk);
    m.scale.set(s, 1, s * (0.9 + 0.1 * kk)); };
  return g;
}

/** Soft dark radial gradient lying on the floor (contact shade around a big object, e.g. the pedestal under the lamp). */
export function createFloorShade(radius = 1.6, strength = 0.45) {
  const tex = canvasTex(256, 256, (g, w, h) => { const gr = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    for (let i = 0; i <= 10; i++) { const x = i / 10; gr.addColorStop(x, `rgba(255,255,255,${Math.exp(-x * x * 3.2) * (1 - x * x)})`); }
    g.fillStyle = gr; g.fillRect(0, 0, w, h); }, { srgb: false });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(radius * 2, radius * 2), new THREE.MeshBasicMaterial({ color: 0x000000, alphaMap: tex, transparent: true,
    opacity: strength, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
  m.rotation.x = -Math.PI / 2; m.position.y = 0.001; m.renderOrder = 1; m.name = "floorShade"; m.castShadow = m.receiveShadow = false; return m;
}
