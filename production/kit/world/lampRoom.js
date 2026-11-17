// The lighthouse LAMP ROOM at night (style v12 LOCKED reference): octagonal room, red low walls with iron bands and bolts,
// windows all round onto a starry night sea with horizon haze, gallery railing outside, planked conical ceiling with rafters
// and braces, the giant layered Fresnel lens lit by a real lamp INSIDE it on a pedestal with the MERCURY plaque, clockwork
// gears box, joke chalkboard, crates, barrel, desk, hanging lantern, pipes, dust motes, two rotating lighthouse beams.
// Layout ported from pipeline/sets/lamp_room.py + look_dev/still_v12_LOCKED.py (Blender (x,y,z) -> three (x, z, -y)).
import * as THREE from "three";
import { rng } from "../shared/assets.js";
import { roundedBox, boxUV, grainUV, tint, plankField, mergedMesh, roundedCylinder, lathe, extrude, gearShape, toothShape, tube, place } from "./geometry.js";
import { pbr, plain, chalkboardTexture, plateTexture } from "./materials.js";
import { createSky, SKY_PRESETS } from "./sky.js";
import { createDust, createBeams, createPool, createPour, createVapour, createSnowfall } from "./fx.js";
import { prop, sizeOf, createSandwich, createRag, createToolbox, createJug, createOilPuddle, createFloorShade } from "./props.js";

const N = 8, R = 2.9, WY0 = 1.0, WY1 = 2.85, CEIL0 = 2.93, APEX = 3.75;
const LENS = new THREE.Vector3(0, 0, -0.3), LAMP_Y = 1.54;

/** Beam (rafter, brace, post) between two points, bevelled box of section w x h, with grain along its length. */
function beamBetween(a, b, w, h, upHint = new THREE.Vector3(0, 1, 0), bevel = 0.012) {
  const d = b.clone().sub(a), len = d.length(), x = d.normalize();
  let y = upHint.clone().addScaledVector(x, -upHint.dot(x)); if (y.lengthSq() < 1e-6) y.set(1, 0, 0); y.normalize();
  const z = x.clone().cross(y);
  const g = roundedBox(len, h, w, bevel, 2); grainUV(g, 1.3, [Math.random() * 5, Math.random() * 5]);
  g.applyMatrix4(new THREE.Matrix4().makeBasis(x, y, z)); g.translate((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2); return g;
}
/** Uniformly scale an object so its largest dimension = size, sit it on y = 0 of its parent position. */
function fit(o, size) { const s = sizeOf(o), k = size / Math.max(s.x, s.y, s.z); o.scale.multiplyScalar(k); return o; }

/** Builds the room. opts: { exterior: true (false = skip own tower stub + sky dome: the exterior provides them),
 *  time: "night"|"dusk"|"morning"|"winter", beams, dust, shadows, props, snowfall: true (winter flakes round the gallery),
 *  poolRes: 768 (mercury mirror resolution) } */
export async function buildLampRoom(opts = {}) {
  const O = { exterior: true, time: "night", beams: true, dust: true, shadows: true, props: true, snowfall: true, poolRes: 768, ...opts };
  const ownSky = O.exterior !== false;
  const group = new THREE.Group(); group.name = "lampRoom";
  const r = rng(11), add = (...o) => { group.add(...o); return o[0]; };
  const corner = (i) => { const a = (2 * Math.PI * i) / N + Math.PI / N, rr = R / Math.cos(Math.PI / N); return [rr * Math.cos(a), -rr * Math.sin(a)]; };

  // ---------------------------------------------------------------- materials (real PBR sets, tinted)
  const [floorM, wallM, ceilM, rafterM, boxM, plasterM, deckM, ironM] = await Promise.all([
    pbr("wood", { color: [2.1, 1.5, 0.92], normalScale: 0.65, roughness: 1 }),
    pbr("redPlaster", { color: [1.05, 0.78, 0.70], normalScale: 1.8 }),
    pbr("darkWood", { color: [1.5, 1.32, 1.18], normalScale: 1.5, side: THREE.DoubleSide, vertexColors: false, envMapIntensity: 0.3 }),
    pbr("wood", { color: [1.12, 0.84, 0.62], normalScale: 1.8 }),
    pbr("wood", { color: [1.65, 1.05, 0.60], normalScale: 1.6 }),
    pbr("plaster", { color: [0.95, 0.90, 0.84], normalScale: 1.5, vertexColors: false }),
    pbr("darkPlanks", { color: [1.0, 0.9, 0.85], normalScale: 1.4, vertexColors: false }),
    pbr("rustMetal", { color: [0.22, 0.20, 0.19], metalness: 0.55, roughness: 1, normalScale: 0.8, vertexColors: false }),
  ]);
  const [basinM, snowM, clockM] = await Promise.all([
    pbr("rustMetal", { color: [0.55, 0.56, 0.58], metalness: 0.9, roughness: 0.42, normalScale: 0.35, vertexColors: false, envMapIntensity: 1.3, side: THREE.DoubleSide, noRoughMap: true }),
    pbr("snow", { color: [1.25, 1.3, 1.4], normalScale: 0.8, roughness: 1, vertexColors: false, envMapIntensity: 0.8 }),
    pbr("darkWood", { color: [1.7, 1.35, 1.05], normalScale: 1.5 }),
  ]);
  const trimM = plain(0xebe4d3, { roughness: 0.5, relief: 0.25 });
  const brassM = plain(0xd9a441, { roughness: 0.32, metalness: 0.85, relief: 0.15, envMapIntensity: 1.2 });
  const darkIron = plain(0x2a2826, { roughness: 0.45, metalness: 0.6, relief: 0.3 });
  const copperM = plain(0xb8643a, { roughness: 0.35, metalness: 0.8, relief: 0.2 });
  const railM = plain(0xf0ece2, { roughness: 0.45, relief: 0.2 });

  // ---------------------------------------------------------------- floor: individual bevelled boards + dark gaps
  const fr = R / Math.cos(Math.PI / N) + 0.05;
  add(mergedMesh(plankField({ halfX: fr, rowHalf: (x) => Math.sqrt(Math.max(0, fr * fr - x * x)), plankW: 0.15, gap: 0.008, thick: 0.05,
    tile: 0.9, seed: 4, tone: [0.88, 1.08] }), floorM, { cast: false, name: "floor" }));
  const sub = add(new THREE.Mesh(new THREE.CircleGeometry(fr + 0.1, 48), plain(0x120c08, { relief: 0 })));
  sub.rotation.x = -Math.PI / 2; sub.position.y = -0.045; sub.receiveShadow = true;
  // floor hatch with latch and hinges (the room is sealed)
  { const hx = 1.3, hz = -1.15, pcs = [];
    for (let k = 0; k < 4; k++) { const g = roundedBox(0.18, 0.03, 0.74, 0.006); grainUV(g, 1.2, [r() * 5, r() * 5]); tint(g, new THREE.Color(0.55, 0.5, 0.48)); pcs.push(place(g, [hx - 0.28 + k * 0.187, 0.012, hz])); }
    add(mergedMesh(pcs, boxM, { name: "hatch" }));
    add(new THREE.Mesh(place(roundedBox(0.5, 0.03, 0.08, 0.008), [hx, 0.035, hz]), darkIron));
    for (const k of [-0.3, 0.3]) add(new THREE.Mesh(place(roundedBox(0.1, 0.025, 0.12, 0.006), [hx + k, 0.035, hz - 0.3]), darkIron));
    // SEALED: iron frame round the hatch + two straps across it, big hex bolts every ~13 cm (read from across the room)
    const hatchIron = plain(0x3b3734, { roughness: 0.38, metalness: 0.75, relief: 0.35 }), fr2 = [], bp = [];
    for (const [w, d, x, z] of [[0.86, 0.06, 0, -0.4], [0.86, 0.06, 0, 0.4], [0.06, 0.74, -0.4, 0], [0.06, 0.74, 0.4, 0]]) fr2.push(place(roundedBox(w, 0.022, d, 0.006), [hx + x, 0.011, hz + z]));
    for (const x of [-0.16, 0.16]) fr2.push(place(roundedBox(0.07, 0.02, 0.86, 0.006), [hx + x, 0.037, hz]));
    add(mergedMesh(fr2, hatchIron, { name: "hatchIron" }));
    for (let k = 0; k < 7; k++) { const u = -0.39 + (k * 0.78) / 6; bp.push([hx + u, 0.022, hz - 0.4], [hx + u, 0.022, hz + 0.4], [hx - 0.4, 0.022, hz + u], [hx + 0.4, 0.022, hz + u]); }
    for (const x of [-0.16, 0.16]) for (const z of [-0.3, -0.1, 0.1, 0.3]) bp.push([hx + x, 0.047, hz + z]);
    const hb = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.019, 0.021, 0.018, 6), plain(0x6a625a, { roughness: 0.3, metalness: 0.85, relief: 0 }), bp.length);
    bp.forEach(([x, y, z], i) => hb.setMatrixAt(i, new THREE.Matrix4().makeRotationY(i * 0.7).setPosition(x, y + 0.009, z))); hb.castShadow = true; hb.name = "hatchBolts"; add(hb); }

  // ---------------------------------------------------------------- low walls, iron bands + bolts, sills, window posts
  const side = 2 * R * Math.tan(Math.PI / N), wallPieces = [], trimPieces = [], ironPieces = [], bolts = [];
  for (let i = 0; i < N; i++) {
    const a = (2 * Math.PI * i) / N, ry = a - Math.PI / 2, c = [R * Math.cos(a), -R * Math.sin(a)];
    const g = roundedBox(side + 0.03, WY0, 0.14, 0.02); boxUV(g, 1.6, [r() * 3, r() * 3]); tint(g, new THREE.Color(1, 0.95 + r() * 0.1, 0.95));
    wallPieces.push(place(g, [c[0], WY0 / 2, c[1]], [0, ry, 0]));
    trimPieces.push(place(roundedBox(side + 0.08, 0.06, 0.26, 0.02), [c[0] * 0.99, WY0 + 0.03, c[1] * 0.99], [0, ry, 0]));
    trimPieces.push(place(roundedBox(side + 0.06, 0.12, 0.18, 0.02), [c[0], WY1 + 0.05, c[1]], [0, ry, 0]));
    trimPieces.push(place(roundedBox(side, 0.045, 0.05, 0.012), [c[0], (WY0 + WY1) / 2 + 0.25, c[1]], [0, ry, 0]));
    for (const yb of [0.64, 0.2]) {
      const k = 0.972; ironPieces.push(place(roundedBox(side, 0.07, 0.025, 0.008), [c[0] * k, yb, c[1] * k], [0, ry, 0]));
      for (let j = 0; j < 7; j++) { const u = ((j - 3) / 3.4) * side / 2, t = [Math.sin(a), Math.cos(a)];
        bolts.push(new THREE.Vector3(c[0] * 0.966 + u * t[0], yb, c[1] * 0.966 + u * t[1])); }
    }
    const [px, pz] = corner(i);
    trimPieces.push(place(roundedCylinder(0.045, WY1 - WY0, 0.01, 14), [px, (WY0 + WY1) / 2, pz]));
  }
  add(mergedMesh(wallPieces, wallM, { name: "lowwall" }));
  add(mergedMesh(trimPieces, trimM, { name: "trim" }));
  add(mergedMesh(ironPieces, ironM, { name: "bands" }));
  // OUTSIDE face of the low walls = lighthouse exterior: cream-painted iron plates with bolt seams (a skin 2 mm off the wall)
  { const skinM = plain(0xe9e3d5, { roughness: 0.55, metalness: 0.15, relief: 0.35 }), sk = [], sb = [], Ro = R + 0.082, sw = 2 * Ro * Math.tan(Math.PI / N) + 0.012;
    for (let i = 0; i < N; i++) {
      const a = (2 * Math.PI * i) / N, ry = a - Math.PI / 2, dx = Math.cos(a), dz = -Math.sin(a), t = [Math.sin(a), Math.cos(a)];
      sk.push(place(roundedBox(sw, WY0 + 0.03, 0.02, 0.006), [Ro * dx, (WY0 - 0.03) / 2, Ro * dz], [0, ry, 0]));
      sk.push(place(roundedBox(sw + 0.01, 0.05, 0.03, 0.01), [(Ro + 0.012) * dx, 0.06, (Ro + 0.012) * dz], [0, ry, 0]));      // plinth band
      for (const yb of [0.2, 0.86]) for (let j = 0; j < 9; j++) { const u = ((j - 4) / 4.3) * sw / 2; sb.push([(Ro + 0.012) * dx + u * t[0], yb, (Ro + 0.012) * dz + u * t[1]]); }
      for (const u of [-sw / 2 + 0.03, sw / 2 - 0.03]) for (let j = 0; j < 4; j++) sb.push([(Ro + 0.012) * dx + u * t[0], 0.28 + j * 0.17, (Ro + 0.012) * dz + u * t[1]]);
    }
    add(mergedMesh(sk, skinM, { name: "outerSkin" }));
    const bm2 = new THREE.InstancedMesh(new THREE.SphereGeometry(0.013, 8, 6), plain(0xd8d0c0, { roughness: 0.45, metalness: 0.3, relief: 0 }), sb.length);
    sb.forEach(([x, y, z], i) => bm2.setMatrixAt(i, new THREE.Matrix4().makeTranslation(x, y, z))); bm2.name = "outerBolts"; add(bm2); }
  // GLAZING in every window: thin dark iron astragals (4 x 3 panes per side) + faint reflective glass. The +Z window (the one the
  // camera flies through, anchors.windowOut) is its own group: set({ windowOutOpen: true }) hides its glass + bars for the flight.
  const glazing = new THREE.Group(), windowOutGlazing = new THREE.Group(); glazing.name = "glazing"; windowOutGlazing.name = "windowOutGlazing";
  glazing.add(windowOutGlazing); add(glazing);
  { const barM = plain(0x2f2c29, { roughness: 0.4, metalness: 0.6, relief: 0.2 });
    const glassM = new THREE.MeshStandardMaterial({ color: new THREE.Color(0.75, 0.82, 0.9), roughness: 0.04, metalness: 0.0, envMapIntensity: 1.6,
      transparent: true, opacity: 0.1, depthWrite: false, side: THREE.DoubleSide });
    const y0 = WY0 + 0.06, y1 = WY1 - 0.01, rows = [y0, 1.62, (WY0 + WY1) / 2 + 0.25, y1];
    for (let i = 0; i < N; i++) {
      const a = (2 * Math.PI * i) / N, ry = a - Math.PI / 2, c = [R * Math.cos(a), -R * Math.sin(a)], t = [Math.sin(a), Math.cos(a)], w = side - 0.09;
      const bars = [], P = (u, y) => [c[0] + u * t[0], y, c[1] + u * t[1]];
      for (const u of [-w / 4, 0, w / 4]) bars.push(place(roundedBox(0.028, y1 - y0, 0.04, 0.006), P(u, (y0 + y1) / 2), [0, ry, 0]));
      bars.push(place(roundedBox(w, 0.028, 0.04, 0.006), P(0, rows[1]), [0, ry, 0]));
      const gg = new THREE.PlaneGeometry(w, y1 - y0); const glass = new THREE.Mesh(place(gg, P(0, (y0 + y1) / 2), [0, ry, 0]), glassM);
      glass.renderOrder = 3; glass.castShadow = false; glass.receiveShadow = false; glass.name = "glass";
      const bm = mergedMesh(bars, barM, { name: "astragals" });
      (i === 6 ? windowOutGlazing : glazing).add(bm, glass);
    } }
  { const bm = new THREE.InstancedMesh(new THREE.SphereGeometry(0.016, 10, 8), plain(0x4a4440, { roughness: 0.35, metalness: 0.8, relief: 0 }), bolts.length);
    bolts.forEach((p, i) => bm.setMatrixAt(i, new THREE.Matrix4().makeTranslation(p.x, p.y, p.z))); bm.castShadow = true; add(bm); }
  // copper pipes along the wall with brass clamps
  for (const [a0, a1, y] of [[0.3, 1.6, 0.82], [3.5, 5.2, 0.9]]) {
    const pts = []; for (let j = 0; j <= 12; j++) { const a = a0 + ((a1 - a0) * j) / 12; pts.push(new THREE.Vector3(2.74 * Math.cos(a), y, -2.74 * Math.sin(a))); }
    const m = add(new THREE.Mesh(tube(pts, 0.03, 64, 12), copperM)); m.castShadow = true;
    for (const j of [0, 4, 8, 12]) { const cl = add(new THREE.Mesh(new THREE.TorusGeometry(0.036, 0.012, 8, 20), brassM)); cl.position.copy(pts[j]); cl.lookAt(pts[j].clone().add(pts[Math.min(12, j + 1)]).sub(pts[Math.max(0, j - 1)])); }
  }

  // ---------------------------------------------------------------- outside: gallery deck, railing, tower edge, sky + sea
  { const deck = new THREE.RingGeometry(R + 0.05, 4.0, 64, 1); boxUV(deck, 1.4); deck.rotateX(-Math.PI / 2);
    const g = new THREE.Mesh(deck, deckM); g.position.y = -0.03; g.receiveShadow = true; add(g);
    // ring geometry built in XY -> boxUV before rotation used x/y; fine for a deck
    const rail = [], RR = 3.85;
    for (let k = 0; k < 32; k++) { const a = (k / 32) * Math.PI * 2; rail.push(place(roundedCylinder(0.022, 1.12, 0.008, 10), [RR * Math.cos(a), 0.56, RR * Math.sin(a)])); }
    for (const y of [1.12, 0.62]) rail.push(place(new THREE.TorusGeometry(RR, y > 1 ? 0.032 : 0.02, 10, 128), [0, y, 0], [Math.PI / 2, 0, 0]));
    add(mergedMesh(rail, railM, { name: "railing" }));
    const edge = add(new THREE.Mesh(roundedCylinder(4.02, 0.5, 0.04, 64), plasterM)); edge.position.y = -0.29; edge.receiveShadow = true;
    if (ownSky) { const tower = add(new THREE.Mesh(new THREE.CylinderGeometry(3.3, 4.2, 30, 48, 1, true), plain(0xd8d0c4, { roughness: 0.9 }))); tower.position.y = -15.6; tower.name = "towerStub"; }
  }
  const sky = ownSky ? createSky("night") : null; if (sky) add(sky);
  // winter: packed snow on the gallery deck (drifted against the wall), caps on the railing and sills, a snow skin on the roof
  const winter = new THREE.Group(); winter.name = "winterSnow"; winter.visible = false; add(winter);
  { const sr = [];
    const deck = new THREE.RingGeometry(R + 0.1, 3.97, 128, 6); deck.rotateX(-Math.PI / 2);
    const p = deck.attributes.position;
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), rr = Math.hypot(x, z), a = Math.atan2(z, x);
      const drift = 0.09 * Math.exp(-(((rr - R - 0.1) / 0.28) ** 2)) * (0.7 + 0.3 * Math.sin(a * 7 + 1));
      p.setY(i, 0.012 + 0.03 * (0.5 + 0.5 * Math.sin(a * 23) * Math.cos(rr * 9)) + drift - 0.025 * Math.max(0, (rr - 3.85) / 0.12)); }
    deck.computeVertexNormals(); boxUV(deck, 1.2); sr.push(deck);
    const RR = 3.85;
    for (const [y, tr] of [[1.12, 0.032], [0.62, 0.02]]) { const t = new THREE.TorusGeometry(RR, tr * 1.25, 8, 160); t.scale(1, 1, 0.75); t.rotateX(Math.PI / 2); t.translate(0, y + tr * 0.55, 0); sr.push(t); }
    for (let i = 0; i < N; i++) { const a = (2 * Math.PI * i) / N, ry = a - Math.PI / 2, c = [R * Math.cos(a), -R * Math.sin(a)], k = 1.035;
      sr.push(place(roundedBox(side * 0.98, 0.035, 0.1, 0.015), [c[0] * k, WY0 + 0.075, c[1] * k], [0, ry, 0])); }
    const roof = new THREE.ConeGeometry(R / Math.cos(Math.PI / N) + 0.2, APEX - CEIL0 + 0.06, 48, 1, true); roof.translate(0, (APEX + CEIL0) / 2 + 0.06, 0);
    boxUV(roof, 1.5); sr.push(roof);
    const m = mergedMesh(sr, snowM, { cast: false, name: "snow" }); m.receiveShadow = true; winter.add(m); }
  const snowfall = createSnowfall({}); snowfall.visible = false; add(snowfall);

  // ---------------------------------------------------------------- ceiling: planked cone, rafters, braces, ring, hub
  { const Rc = R / Math.cos(Math.PI / N) + 0.15, pos = [], uv = [], nrm = [];
    for (let i = 0; i < N; i++) {
      const a0 = (2 * Math.PI * i) / N + Math.PI / N, a1 = a0 + (2 * Math.PI) / N;
      const c0 = new THREE.Vector3(Rc * Math.cos(a0), CEIL0, -Rc * Math.sin(a0)), c1 = new THREE.Vector3(Rc * Math.cos(a1), CEIL0, -Rc * Math.sin(a1));
      const ap = new THREE.Vector3(0, APEX, 0), e = c1.clone().sub(c0).normalize(), mid = c0.clone().add(c1).multiplyScalar(0.5);
      const s = ap.clone().sub(mid).normalize(), n = e.clone().cross(s).normalize(); if (n.y > 0) n.negate();
      for (const p of [c0, ap, c1]) { const q = p.clone().sub(mid); pos.push(p.x, p.y, p.z); nrm.push(n.x, n.y, n.z); uv.push(q.dot(s) / 1.5 + i * 0.37, q.dot(e) / 1.5); }
    }
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute("normal", new THREE.Float32BufferAttribute(nrm, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
    const ceil = add(new THREE.Mesh(g, ceilM)); ceil.receiveShadow = true; ceil.castShadow = false; ceil.name = "ceiling";
    // rafters along each facet centre, hugging the boards; braces make the star pattern; collar ring
    const apo = Rc * Math.cos(Math.PI / N), yAt = (rr) => CEIL0 + ((apo - rr) / apo) * (APEX - CEIL0);
    const rafters = [], railPts = [];
    for (let k = 0; k < N; k++) {
      const a = (2 * Math.PI * k) / N, dir = new THREE.Vector3(Math.cos(a), 0, -Math.sin(a));
      const P = (rr, drop) => dir.clone().multiplyScalar(rr).setY(yAt(rr) - drop);
      const slopeN = new THREE.Vector3(dir.x * (APEX - CEIL0) / apo, 1, dir.z * (APEX - CEIL0) / apo).normalize();
      rafters.push(beamBetween(P(3.0, 0.08), P(0.22, 0.08), 0.11, 0.13, slopeN, 0.018));
      railPts.push([P(1.45, 0.17), P(0.75, 0.2), dir, slopeN]);
    }
    for (let k = 0; k < N; k++) {                     // V braces between neighbouring rafters (lower layer, like the reference)
      const [p, q] = [railPts[k], railPts[(k + 1) % N]];
      const m = p[0].clone().add(q[0]).multiplyScalar(0.5).setY(p[0].y - 0.04);
      rafters.push(beamBetween(p[1], m, 0.09, 0.1, new THREE.Vector3(0, 1, 0), 0.015));
      rafters.push(beamBetween(m, q[1], 0.09, 0.1, new THREE.Vector3(0, 1, 0), 0.015));
    }
    rafters.forEach((g2) => tint(g2, new THREE.Color(0.85 + r() * 0.3, 0.85 + r() * 0.3, 0.85 + r() * 0.3)));
    add(mergedMesh(rafters, rafterM, { name: "rafters" }));
    const ring = add(new THREE.Mesh(new THREE.TorusGeometry(2.78, 0.05, 10, 96), darkIron)); ring.rotation.x = Math.PI / 2; ring.position.y = CEIL0 - 0.02;
    const hub = add(new THREE.Mesh(roundedCylinder(0.24, 0.2, 0.04, 24), rafterM)); hub.position.y = APEX - 0.2;
    const post = add(new THREE.Mesh(roundedBox(0.11, 0.36, 0.11, 0.02), rafterM)); post.position.y = APEX - 0.42;
  }

  // ---------------------------------------------------------------- pedestal, mercury basin, MERCURY plaque
  const L = LENS;
  { const ped = add(new THREE.Mesh(lathe([[0, 0], [0.68, 0], [0.70, 0.02], [0.70, 0.06], [0.66, 0.08], [0.62, 0.1], [0.62, 0.66], [0.65, 0.69],
      [0.68, 0.71], [0.68, 0.745], [0, 0.745]], 56).toNonIndexed(), plasterM)); ped.geometry.computeVertexNormals(); boxUV(ped.geometry, 1.3);
    ped.position.copy(L); ped.castShadow = ped.receiveShadow = true;
    // the mercury BASIN: a wide polished steel bowl on the pedestal; the lens floats on the pool inside it
    const bowl = add(new THREE.Mesh(lathe([[0.64, 0.735], [0.70, 0.75], [0.80, 0.785], [0.87, 0.83], [0.905, 0.852], [0.9, 0.868], [0.875, 0.872],
      [0.855, 0.862], [0.84, 0.83], [0.80, 0.775], [0.72, 0.765], [0.0, 0.765]], 72), basinM)); boxUV(bowl.geometry, 0.6);
    bowl.position.set(L.x, 0, L.z); bowl.name = "basin";
    const lip = add(new THREE.Mesh(new THREE.TorusGeometry(0.89, 0.016, 10, 96), brassM)); lip.rotation.x = Math.PI / 2; lip.position.set(L.x, 0.872, L.z); lip.name = "basinLip";
    group.userData.basin = [ped, bowl, lip];
    const pl = add(new THREE.Mesh(roundedBox(0.5, 0.16, 0.03, 0.012), brassM)); pl.position.set(L.x, 0.42, L.z + 0.628); pl.castShadow = true;
    const tx = add(new THREE.Mesh(new THREE.PlaneGeometry(0.47, 0.135), new THREE.MeshStandardMaterial({ map: plateTexture([["MERCURY", 0.5]], { w: 1024, h: 300 }),
      roughness: 0.35, metalness: 0.75, envMapIntensity: 1.2, polygonOffset: true, polygonOffsetFactor: -2 })));
    tx.position.set(L.x, 0.42, L.z + 0.645); group.userData.basin.push(pl, tx); }
  const pool = createPool({ center: L, rIn: 0.5, rOut: 0.848, yEmpty: 0.772, yFull: 0.85, res: O.poolRes }); add(pool.mesh);   // full = just under the lip; the lens base floats half-sunk in it
  const pour = createPour(); add(pour.group);
  const vapour = createVapour({ center: new THREE.Vector3(L.x, 0.83, L.z), rIn: 0.62, rOut: 0.8 }); add(vapour.mesh);
  const floorShade = add(createFloorShade(1.55, 0.42)); floorShade.position.set(L.x, 0.001, L.z);

  // ---------------------------------------------------------------- the LENS: beehive of glass rings, brass ribs, bullseyes, lamp inside
  const lens = new THREE.Group(); lens.position.copy(L); lens.name = "lens"; add(lens);
  const glassM = new THREE.MeshStandardMaterial({ color: new THREE.Color(0.95, 0.66, 0.30), roughness: 0.14, metalness: 0.0, envMapIntensity: 1.3,
    emissive: new THREE.Color(1.0, 0.58, 0.22), emissiveIntensity: 0.42 });
  const lampParts = { bulls: [], core: null, bulb: null };
  const coreM = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.0, 0.62, 0.24).multiplyScalar(3.2) });
  { const base = 0.82, rings = [], ribs = [];
    const f = (k) => Math.sin(Math.PI * (0.15 + 0.7 * (k / 8)));
    const rad = (k) => 0.40 + 0.12 * f(k);
    for (let k = 0; k < 9; k++) rings.push(place(new THREE.TorusGeometry(rad(k), 0.06, 14, 72), [0, base + 0.12 + k * 0.15, 0], [Math.PI / 2, 0, 0]));
    const gm = add(mergedMesh(rings, glassM, { cast: false, receive: true, name: "lensGlass" })); lens.add(gm);
    for (let k = 0; k < 8; k++) { const a = (2 * Math.PI * k) / 8 + Math.PI / 8, pts = [];
      for (let j = 0; j <= 8; j++) { const rr = rad(j) - 0.02; pts.push(new THREE.Vector3(rr * Math.cos(a), base + 0.12 + j * 0.15, rr * Math.sin(a))); }
      ribs.push(tube(pts, 0.012, 40, 8)); }
    ribs.push(place(roundedCylinder(0.58, 0.08, 0.02, 48), [0, base + 0.04, 0]));
    ribs.push(place(roundedCylinder(0.32, 0.08, 0.02, 40), [0, base + 1.42, 0]));
    ribs.push(place(roundedCylinder(0.44, 0.05, 0.02, 48), [0, base + 1.40, 0]));
    ribs.push(place(lathe([[0.2, 0], [0.17, 0.05], [0.08, 0.09], [0, 0.1]], 32), [0, base + 1.46, 0]));
    for (const s of [1, -1]) { const c = [s * 0.62, base + 0.72, 0];
      ribs.push(place(new THREE.TorusGeometry(0.26, 0.03, 10, 48), c, [0, Math.PI / 2, 0]));
      ribs.push(place(new THREE.TorusGeometry(0.14, 0.02, 10, 40), [c[0] + s * 0.03, c[1], 0], [0, Math.PI / 2, 0])); }
    const ribM = brassM.clone(); ribM.roughness = 0.55;   // rougher: thin ribs on the turning lens must not sparkle frame-to-frame
    const bm = new THREE.Mesh(mergeSafe(ribs), ribM); bm.castShadow = false; lens.add(bm);
    for (const s of [1, -1]) {    // bullseye panels: glowing glass discs the beams come out of
      const d = new THREE.Mesh(roundedCylinder(0.25, 0.05, 0.02, 40), glassM.clone()); d.material.emissiveIntensity = 1.4; d.material.roughness = 0.4; lampParts.bulls.push(d.material);   // rough: no sweeping glint pops as the lens turns
      d.rotation.z = Math.PI / 2; d.position.set(s * 0.6, base + 0.72, 0); lens.add(d); }
    const core = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 1.2, 24), coreM); core.position.y = base + 0.72; lens.add(core); lampParts.core = core;
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.13, 24, 16), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.0, 0.8, 0.5).multiplyScalar(4.5) }));
    bulb.position.y = base + 0.72; lens.add(bulb); lampParts.bulb = bulb;
  }

  // ---------------------------------------------------------------- clockwork gears box (left of the lens)
  const gears = []; let gearTooth = null;
  { const bx = -1.75, bz = -0.53, pcs = [];
    for (let k = 0; k < 4; k++) { const g = roundedBox(0.155, 1.24, 0.7, 0.012); grainUV(g, 1.2, [r() * 5, r() * 5]); tint(g, new THREE.Color(0.8 + r() * 0.3, 0.85, 0.85)); pcs.push(place(g, [bx - 0.233 + k * 0.155, 0.62, bz])); }
    const top = roundedBox(0.7, 0.05, 0.78, 0.015); grainUV(top, 1.2); pcs.push(place(top, [bx, 1.265, bz]));
    for (const [x, y] of [[-0.29, 0], [0.29, 0]]) { const g = roundedBox(0.05, 1.28, 0.05, 0.012); grainUV(g, 1.2); pcs.push(place(g, [bx + x, 0.64, bz + 0.36])); }
    add(mergedMesh(pcs, clockM, { name: "clockbox" }));
    // three meshed gears: the big one carries the CRANK; the mid one has a tooth that can pop off (set({ toothPop }))
    for (const [cx, cy, rr, teeth, sp] of [[-1.75, 0.78, 0.22, 14, 1], [-1.58, 1.12, 0.14, 10, -0.22 / 0.14], [-1.92, 1.08, 0.1, 8, -0.22 / 0.1]]) {
      const g = new THREE.Group(); g.position.set(cx, cy, -0.13); add(g);
      const gm = new THREE.Mesh(extrude(gearShape(rr, teeth, 0.04, 0.025, 4), 0.04, 0.006), brassM); gm.castShadow = true; g.add(gm);
      if (teeth === 10) { const gm2 = new THREE.Mesh(extrude(gearShape(rr, teeth, 0.04, 0.025, 4, 0), 0.04, 0.006), brassM); gm2.visible = false; g.add(gm2);
        const tg = extrude(toothShape(rr, teeth, 0.04, 0), 0.04, 0.006), a0 = (1.5 / 40) * Math.PI * 2, c = new THREE.Vector3((rr + 0.017) * Math.cos(a0), (rr + 0.017) * Math.sin(a0), 0);
        tg.translate(-c.x, -c.y, 0); const tooth = new THREE.Mesh(tg, brassM); tooth.castShadow = true; tooth.visible = false; tooth.name = "gearTooth"; add(tooth);
        gearTooth = { g, full: gm, gap: gm2, tooth, local: c }; }
      const ax = new THREE.Mesh(roundedCylinder(0.035, 0.08, 0.01, 16), darkIron); ax.rotation.x = Math.PI / 2; ax.position.z = 0.03; g.add(ax);
      if (rr > 0.2) { const arm = new THREE.Mesh(roundedBox(0.17, 0.03, 0.025, 0.008), darkIron); arm.position.set(0.085, 0, 0.06); g.add(arm);
        const knob = new THREE.Mesh(roundedCylinder(0.026, 0.1, 0.01, 12), plain(0xa83a22, { roughness: 0.5 })); knob.rotation.x = Math.PI / 2; knob.position.set(0.17, 0, 0.1); g.add(knob); }
      gears.push([g, sp]);
    }
  }

  // ---------------------------------------------------------------- joke chalkboard on an easel (right of the lens)
  { const g = new THREE.Group(); g.position.set(1.55, 0, 0.15); g.rotation.y = -0.45; add(g);
    const frame = new THREE.Mesh(roundedBox(0.7, 0.54, 0.035, 0.012), boxM); grainUV(frame.geometry, 1); tint(frame.geometry, 0xffffff); frame.position.y = 1.05; frame.castShadow = true; g.add(frame);
    const face = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.46), new THREE.MeshStandardMaterial({
      map: chalkboardTexture([["DAYS WITHOUT A", 0.11], ["SHIPWRECK:", 0.13], ["3", 0.36]]), roughness: 0.9 }));
    face.position.set(0, 1.05, 0.019); g.add(face);
    for (const dx of [-0.24, 0.24]) { const leg = new THREE.Mesh(roundedBox(0.035, 1.5, 0.035, 0.008), boxM); grainUV(leg.geometry, 1); tint(leg.geometry, 0xdddddd);
      leg.position.set(dx, 0.72, -0.08); leg.rotation.x = 0.1; leg.castShadow = true; g.add(leg); }
    const back = new THREE.Mesh(roundedBox(0.035, 1.3, 0.035, 0.008), boxM); grainUV(back.geometry, 1); tint(back.geometry, 0xdddddd);
    back.position.set(0, 0.62, -0.3); back.rotation.x = -0.25; g.add(back);
    const ledge = new THREE.Mesh(roundedBox(0.66, 0.025, 0.06, 0.008), boxM); grainUV(ledge.geometry, 1); tint(ledge.geometry, 0xffffff); ledge.position.set(0, 0.77, 0.03); g.add(ledge); }

  // ---------------------------------------------------------------- wall sign (joke) on the back windows
  { const g = new THREE.Group(); g.position.set(-1.1, 1.8, -2.3); g.rotation.y = 0.42; add(g);
    const b = new THREE.Mesh(roundedBox(0.95, 0.42, 0.04, 0.015), boxM); grainUV(b.geometry, 1); tint(b.geometry, 0xffffff); b.castShadow = true; g.add(b);
    const t = new THREE.Mesh(new THREE.PlaneGeometry(0.88, 0.36), new THREE.MeshStandardMaterial({ map: plateTexture([["KEEPER OF THE YEAR", 0.2], ["1871 - 1901", 0.26]],
      { bg: "#6b4423", ink: "#f0cd6a", w: 1024, h: 420 }), roughness: 0.7, polygonOffset: true, polygonOffsetFactor: -2 })); t.position.z = 0.022; g.add(t); }

  // ---------------------------------------------------------------- desk with logbook (back left)
  { const g = new THREE.Group(); g.position.set(-1.45, 0, -1.85); g.rotation.y = -0.6; add(g); const pcs = [];
    const top = roundedBox(0.95, 0.05, 0.5, 0.012); grainUV(top, 1.2); pcs.push(place(top, [0, 0.76, 0]));
    for (const [dx, dz] of [[-0.4, -0.2], [0.4, -0.2], [-0.4, 0.2], [0.4, 0.2]]) { const l = roundedBox(0.05, 0.74, 0.05, 0.01); grainUV(l, 1.2); pcs.push(place(l, [dx, 0.37, dz])); }
    const m = mergedMesh(pcs, boxM); g.add(m);
    const book = new THREE.Mesh(roundedBox(0.3, 0.05, 0.22, 0.01), plain(0x7a1d14, { roughness: 0.6 })); book.position.set(-0.1, 0.81, 0.02); book.rotation.y = 0.2; book.castShadow = true; g.add(book);
    const mug = new THREE.Mesh(roundedCylinder(0.045, 0.1, 0.008, 18), plain(0xe6dfcf, { roughness: 0.4 })); mug.position.set(0.28, 0.835, 0.05); mug.castShadow = true; g.add(mug); }

  // ---------------------------------------------------------------- shelf by the right wall
  { const g = new THREE.Group(); g.position.set(2.2, 0, -0.9); g.rotation.y = Math.PI / 2 + 0.55; add(g);
    const s = new THREE.Mesh(roundedBox(0.7, 0.04, 0.16, 0.01), boxM); grainUV(s.geometry, 1); tint(s.geometry, 0xffffff); s.position.y = 1.32; s.castShadow = true; g.add(s);
    for (const dx of [-0.28, 0.28]) { const br = new THREE.Mesh(roundedBox(0.03, 0.16, 0.12, 0.006), darkIron); br.position.set(dx, 1.23, 0); g.add(br); } g.userData.shelf = true; group.userData.shelf = g; }

  // ---------------------------------------------------------------- glTF props (CC0, real scale)
  const props = new THREE.Group(); props.name = "props"; add(props);
  if (O.props) {
    const P = await Promise.all([
      prop("wooden_crate_01", { position: [1.95, 0, -1.6], rotationY: 0.3 }),
      prop("wooden_crate_02", { position: [2.25, 0, -1.0], rotationY: -0.25 }),
      prop("wooden_crate_01", { position: [2.0, 0, -1.25], rotationY: 0.55 }),
      prop("wine_barrel_01", { position: [-2.05, 0, -1.25], rotationY: 0.4 }),
      prop("wooden_bucket_02", { position: [-1.98, 0, 0.12], rotationY: 0.4 }),
      prop("wooden_lantern_01", { position: [1.4, 1.75, 0.3], rotationY: 0.5 }),
      prop("small_oil_can_01", { position: [0, 0, 0] }), prop("oil_tin", { position: [0, 0, 0] }),
      prop("book_encyclopedia_set_01", { position: [0, 0, 0] }), prop("metal_jug", { position: [0, 0, 0] }), prop("wooden_hammer_01", { position: [0, 0, 0] }),
    ]);
    const [c1, c2, c3, barrel, bucket, lantern, can, tin, books, jug, hammer] = P;
    fit(c1, 0.55); fit(c2, 0.45); fit(c3, 0.4); fit(barrel, 0.85); fit(bucket, 0.32); fit(lantern, 0.42);
    fit(can, 0.2); fit(tin, 0.16); fit(books, 0.32); fit(jug, 0.22); fit(hammer, 0.32);
    const stackOn = (o, under) => { const b = new THREE.Box3().setFromObject(under); o.position.y = b.max.y + 0.002; };
    props.add(c1, c2, c3, barrel, bucket, lantern); stackOn(c3, c1); c3.position.x = 2.0; c3.position.z = -1.55;
    // shelf items (local to the shelf group)
    const shelf = group.userData.shelf; can.position.set(-0.18, 1.34, 0); tin.position.set(0.05, 1.34, 0.01); jug.position.set(0.22, 1.34, 0); shelf.add(can, tin, jug);
    books.position.set(-1.5, 0.785, -1.95); books.rotation.y = 0.9; props.add(books);
    hammer.position.set(2.25, 0.0, -1.0); stackOn(hammer, c2); hammer.rotation.y = 1.2; props.add(hammer);
    // lantern hangs on a chain from the ceiling
    const ly = lantern.position.y + sizeOf(lantern).y, chain = add(new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 3.55 - ly, 6), darkIron));
    chain.position.set(1.4, (3.55 + ly) / 2, 0.3);
  }
  // ---------------------------------------------------------------- story props (each at a home spot; reparent with Object3D.attach)
  const [toolbox, jug, oilCan] = await Promise.all([createToolbox(), createJug(), prop("small_oil_can_01", { position: [0, 0, 0] })]);
  const sandwich = createSandwich(), rag = createRag(), oilSpill = createOilPuddle();
  fit(oilCan, 0.24); oilCan.position.set(0.95, 0, -0.75); oilCan.rotation.y = -0.6; oilCan.name = "oilCan"; add(oilCan);
  oilSpill.position.set(0.62, 0, 0.42); add(oilSpill);
  jug.position.set(-1.41, 0.785, -1.70); jug.rotation.y = 2.4; jug.userData.setLevel(1); add(jug);              // on the desk
  sandwich.position.set(-1.25, 0.785, -2.0); sandwich.rotation.y = 0.4; sandwich.visible = false; add(sandwich);   // hidden until the coat gag
  toolbox.position.set(0.55, 0, -1.55); toolbox.rotation.y = 0.35; toolbox.visible = false; add(toolbox);         // arrives with the engineer
  { const bb = props.children.find((o) => o.name === "wine_barrel_01"); const top = bb ? new THREE.Box3().setFromObject(bb).max.y : 0.85;
    rag.position.set(-2.05, top + 0.001, -1.25); rag.rotation.y = 0.7; add(rag); }
  const lanternGlow = add(new THREE.Mesh(new THREE.SphereGeometry(0.05, 16, 12), new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 0.7, 0.35).multiplyScalar(5) })));
  lanternGlow.position.set(1.4, 1.92, 0.3);
  // rope coil (back right)
  for (let k = 0; k < 5; k++) { const t = add(new THREE.Mesh(new THREE.TorusGeometry(0.22 - k * 0.012, 0.03, 10, 40), plain(0xb39463, { roughness: 0.95, relief: 1.0 })));
    t.rotation.x = Math.PI / 2; t.position.set(1.15, 0.03 + k * 0.035, -2.15); t.castShadow = true; }

  // ---------------------------------------------------------------- lights (locked recipe, see STYLE_BIBLE "Light")
  const lampPos = new THREE.Vector3(L.x, LAMP_Y, L.z);
  const lights = new THREE.Group(); lights.name = "lights"; add(lights);
  const lamp = new THREE.PointLight(0xffa955, 11, 0, 2); lamp.position.copy(lampPos); lights.add(lamp);
  const lampSpot = new THREE.SpotLight(0xffb060, 34, 0, 1.2, 0.75, 2); lampSpot.position.copy(lampPos).add(new THREE.Vector3(0, 0.05, 0.25));
  lampSpot.target.position.set(0.05, 0.0, 2.6); lights.add(lampSpot, lampSpot.target);
  const moon = new THREE.DirectionalLight(new THREE.Color(0.45, 0.58, 1.0), 1.1); moon.position.set(...SKY_PRESETS.night.sunDir).normalize().multiplyScalar(12); moon.target.position.set(0, 0.5, 0);
  if (ownSky) lights.add(moon, moon.target);         // exterior: false -> the exterior's moon/sun lights the room (same directions)
  const fill = new THREE.SpotLight(new THREE.Color(1.0, 0.80, 0.58), 9, 0, 1.35, 1.0, 2);   // wide + full penumbra: no visible cone edge on the floor
  fill.position.set(0.3, 2.1, 2.3); fill.target.position.set(0, 0.6, 0.0); lights.add(fill, fill.target);
  const bounce = new THREE.PointLight(new THREE.Color(1.0, 0.70, 0.42), 1.5, 0, 2); bounce.position.set(0, 2.15, 0.4); lights.add(bounce);
  const lanternL = new THREE.PointLight(new THREE.Color(1.0, 0.68, 0.34), 1.6, 0, 2); lanternL.position.set(1.4, 1.92, 0.3); lights.add(lanternL);
  const hemi = new THREE.HemisphereLight(0x6a78b0, 0x8a5a30, 0.5); if (ownSky) lights.add(hemi);
  if (O.shadows) {
    lampSpot.castShadow = true; lampSpot.shadow.mapSize.set(2048, 2048); lampSpot.shadow.bias = -0.0004; lampSpot.shadow.normalBias = 0.02;
    lampSpot.shadow.camera.near = 0.2; lampSpot.shadow.camera.far = 8; lampSpot.shadow.radius = 4;
    moon.castShadow = true; moon.shadow.mapSize.set(2048, 2048); Object.assign(moon.shadow.camera, { left: -4.5, right: 4.5, top: 4.5, bottom: -4.5, near: 1, far: 30 });
    moon.shadow.bias = -0.0005; moon.shadow.normalBias = 0.02; moon.shadow.radius = 3;
  }

  // ---------------------------------------------------------------- beams + dust
  const beams = createBeams({ apex: lampPos, angle: 0.2, intensity: 40, shaft: O.shaft ?? 0.55 }); if (O.beams) add(beams.group);
  const dust = createDust({ count: 170, min: [-2.4, 0.9, -2.6], max: [2.4, 2.7, -0.15],
    filter: (p) => Math.hypot(p.x - L.x, p.z - L.z) > 0.62 && Math.hypot(p.x, p.z) < 2.6 }); if (O.dust) add(dust);

  // shadows: every solid set piece casts + receives; glass, lamp, sky, shafts, dust, floor and ceiling do not cast
  const noCast = new Set(); [lens, beams.group, sky, dust, pool.mesh, pour.group, vapour.mesh, floorShade, oilSpill, winter, snowfall].forEach((o) => o?.traverse((c) => noCast.add(c)));
  group.traverse((o) => { if (!o.isMesh || noCast.has(o) || o.material?.isShaderMaterial) return;
    o.receiveShadow = true; if (!["floor", "ceiling", "sky", "glass"].includes(o.name)) o.castShadow = true; });
  // The lamp is a big glowing source INSIDE the lens right above the basin: from a point light the pedestal/basin throw a hard
  // ring of shadow round the floor, which reads wrong. They still cast moon/sun shadows; the lamp's soft basin shade is floorShade.
  const lampShadowCam = lampSpot.shadow.camera;
  for (const o of group.userData.basin) o.onBeforeShadow = (r, obj, cam, shadowCam) => { if (shadowCam === lampShadowCam) obj.modelViewMatrix.makeScale(0, 0, 0); };
  const anchors = {
    lens: lampPos.clone(), lensBase: L.clone(), plaque: new THREE.Vector3(L.x, 0.42, L.z + 0.65),
    pool: new THREE.Vector3(L.x, 0.85, L.z), poolFront: new THREE.Vector3(L.x, 0.85, L.z + 0.72),
    keeperSpot: new THREE.Vector3(-0.62, 0, 0.62), engineerSpot: new THREE.Vector3(0.62, 0, 0.70),
    polishSpot: new THREE.Vector3(0.98, 0, 0.12), sleepSpot: new THREE.Vector3(-1.0, 0, 0.42), sleepHead: new THREE.Vector3(-0.78, 0.13, 0.22),
    gearsBox: new THREE.Vector3(-1.75, 0.78, -0.13), crankHandle: new THREE.Vector3(), toothFloor: new THREE.Vector3(),
    windowOut: new THREE.Vector3(0, 1.6, R + 0.02), windowOutside: new THREE.Vector3(0, 1.6, 5.2),
    gears: new THREE.Vector3(-1.75, 0.78, -0.1), chalkboard: new THREE.Vector3(1.55, 1.05, 0.15), lantern: lanternL.position.clone(),
    hatch: new THREE.Vector3(1.3, 0, -1.15), desk: new THREE.Vector3(-1.45, 0.76, -1.85), sign: new THREE.Vector3(-1.1, 1.8, -2.3),
    camera: { position: new THREE.Vector3(0.05, 1.2, 2.48), target: new THREE.Vector3(0, 1.12, 0.3), fov: 94 },
    roomRadius: R - 0.15, floorY: 0,
  };
  // ---------------------------------------------------------------- times of day: lights/uniforms/visibility only (no rebuild, no
  // light added or removed -> no shader recompiles). One visible key per state; warm pools vs cool shadows.
  const nightDir = new THREE.Vector3(...SKY_PRESETS.night.sunDir).normalize();
  const TIMES = {
    night:   { lamp: 1, dir: [[0.45, 0.58, 1.0], 1.1, nightDir], hemi: [0x6a78b0, 0x8a5a30, 0.5], fill: [[1.0, 0.80, 0.58], 9], shaft: 1, snow: false },
    dusk:    { lamp: 1, dir: [[1.0, 0.52, 0.36], 0.9, new THREE.Vector3(...SKY_PRESETS.dusk.sunDir).normalize()], hemi: [0x8a6a9a, 0x6a4030, 0.65], fill: [[1.0, 0.78, 0.6], 8], shaft: 0.6, snow: false },
    morning: { lamp: 0, dir: [[1.0, 0.80, 0.56], 5.0, new THREE.Vector3(...SKY_PRESETS.morning.sunDir).normalize()], hemi: [0xb4c8ec, 0x9a6a40, 0.75], fill: [[1.0, 0.86, 0.7], 1.4], shaft: 0, snow: false },
    winter:  { lamp: 1, dir: [[0.5, 0.62, 1.0], 1.35, nightDir], hemi: [0x7080b8, 0x7a5a40, 0.55], fill: [[1.0, 0.80, 0.58], 9], shaft: 1, snow: true },
  };
  const base = { lamp: lamp.intensity, spot: lampSpot.intensity, bounce: bounce.intensity, lantern: lanternL.intensity, beam: beams.beams[0].sp.intensity,
    glass: glassM.emissiveIntensity, shaft: beams.beams[0].cone.material.uniforms.k.value };
  const keyLightPos = lampPos.clone(), sunDir = nightDir.clone();
  let timeName = "night";
  function setTime(name) {
    const T = TIMES[name]; if (!T) throw new Error(`lampRoom.setTime: unknown "${name}" (night|dusk|morning|winter)`); timeName = name;
    const on = T.lamp;
    lamp.intensity = base.lamp * on; lampSpot.intensity = base.spot * on; bounce.intensity = base.bounce * on; lanternL.intensity = base.lantern * on;
    for (const b of beams.beams) { b.sp.intensity = base.beam * on; b.cone.userData.timeOn = on > 0 && T.shaft > 0; b.cone.visible = b.cone.userData.timeOn && C.beamCones; b.cone.material.uniforms.k.value = base.shaft * T.shaft; }
    glassM.emissiveIntensity = base.glass * on; for (const m of lampParts.bulls) m.emissiveIntensity = 1.4 * on;
    lampParts.core.visible = lampParts.bulb.visible = on > 0; lanternGlow.visible = on > 0;
    floorShade.material.opacity = on ? 0.42 : 0.12;
    const [c, I, d] = T.dir; moon.color.setRGB(...c); moon.intensity = I; moon.position.copy(d).multiplyScalar(12); sunDir.copy(d);
    hemi.color.set(T.hemi[0]); hemi.groundColor.set(T.hemi[1]); hemi.intensity = T.hemi[2];
    fill.color.setRGB(...T.fill[0]); fill.intensity = T.fill[1];
    winter.visible = T.snow; snowfall.visible = T.snow && O.snowfall;
    if (sky) sky.userData.setPreset(name);
    if (on) keyLightPos.copy(lampPos); else keyLightPos.set(0, 1.2, 0).addScaledVector(d, 20);
  }

  // ---------------------------------------------------------------- per-frame story controls (stateless: pass every value each frame)
  const C = { poolFill: 1, poolWobble: 0.3, pour: 0, pourFrom: null, vapour: 0, vapourTarget: null, vapourPull: 0.85, vapourAvoid: [],
    oilSpill: 0, toothPop: 0, crank: null, lensAngle: null, beamCones: true, windowOutOpen: false };
  const tmpV = new THREE.Vector3(), tmpS = new THREE.Vector3(), knobLocal = new THREE.Vector3(0.17, 0, 0.1);
  /** set({ poolFill 0..1, poolWobble 0..1, pour 0..1, pourFrom: Vector3 (spout, world; default = jug.userData.spoutWorld()),
   *  vapour 0..1, vapourTarget: Vector3|null, vapourPull 0..1, vapourAvoid: [{ p: Vector3, r }], oilSpill 0..1,
   *  toothPop 0..1, crank: radians|null (null = slow idle turn), lensAngle: radians|null (null = turns with time) }) */
  function set(v = {}) { Object.assign(C, v); }
  function update(time, camera = null) {
    const rot = C.lensAngle ?? 0.95 * time + 3.4; lens.rotation.y = rot;
    beams.update(rot, camera);
    const crank = C.crank ?? time * 0.48;
    for (const [g, s] of gears) g.rotation.z = crank * s;
    gears[0][0].updateMatrixWorld(); anchors.crankHandle.copy(knobLocal).applyMatrix4(gears[0][0].matrixWorld);
    // tooth: at 0 the gear shows it; 0..1 = ballistic flight with spin off the gear; 1 = lying flat on the floor
    { const { g, full, gap, tooth, local } = gearTooth, k = THREE.MathUtils.clamp(C.toothPop, 0, 1);
      full.visible = k <= 0; gap.visible = tooth.visible = k > 0;
      g.updateMatrixWorld(); const start = tmpS.copy(local).applyMatrix4(g.matrixWorld), T = 0.55, t = k * T;
      const yLand = 0.026, vy = (yLand - start.y + 4.9 * T * T) / T;
      tooth.position.set(start.x + 0.32 * k, start.y + vy * t - 4.9 * t * t, start.z + 0.5 * k);
      tooth.rotation.set(k * (4 * Math.PI + Math.PI / 2), 0, g.rotation.z + k * 3 * Math.PI);
      anchors.toothFloor.set(start.x + 0.32, yLand, start.z + 0.5); }
    const spout = C.pourFrom ?? jug.userData.spoutWorld(tmpV);
    pool.set({ fill: C.poolFill, wobble: C.poolWobble + 0.6 * C.pour, time, from: C.poolFill < 1 ? spout : null });
    pour.set(C.pour, C.pour > 0 ? spout : null, pool.mesh.visible ? pool.level() : 0.772, time);
    vapour.set({ k: C.vapour, target: C.vapourTarget, pull: C.vapourPull, avoid: C.vapourAvoid, time });
    oilSpill.userData.set(C.oilSpill);
    for (const b of beams.beams) b.cone.visible = !!b.cone.userData.timeOn && C.beamCones;
    windowOutGlazing.visible = !C.windowOutOpen;
    dust.userData.update(time); if (sky) sky.userData.update(time); snowfall.userData.update(time);
  }
  setTime(O.time); update(0);
  return { group, keyLightPos, sunDir, anchors, update, set, setTime, get time() { return timeName; },
    lights: { lamp, lampSpot, moon, sky: moon, fill, bounce, lantern: lanternL, hemi },
    props: { sandwich, jug, rag, toolbox, oilCan, oilSpill }, fx: { pool, pour, vapour, snowfall, beams, dust },
    parts: { beams: beams.group, beamCones: beams.beams.map((b) => b.cone), glazing, windowOutGlazing, winterSnow: winter, lens, sky, ceiling: group.getObjectByName("ceiling") },
    beams, lens, dust, sky, snowfall, beamLit: (p) => (timeName === "morning" ? 0 : beams.litAt(p)),
    setHeight: (h) => { dust.userData.setHeight(h); snowfall.userData.setHeight(h); } };
}

function mergeSafe(geoms) { const m = mergedMesh(geoms, null); return m.geometry; }
