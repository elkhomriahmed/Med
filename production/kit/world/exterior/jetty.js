// Jetty on the +Z side: plank deck (y = -33.2) from the stairs (z 16.5) to z 30, stringers, pile caps, piles into the sea,
// braces, a ladder for the rowboat, two mooring posts (bollards), a rope coil, a barrel, crates, a lantern post.
import * as THREE from "three";
import { roundedBox, roundedCylinder, place, tint, boxUV, grainUV, mergedMesh, lathe, plankField, tube } from "../geometry.js";
import { pbr, plain } from "../materials.js";
import { prop, sizeOf } from "../props.js";
import { rng } from "../../shared/assets.js";
import { snowify } from "./util.js";

export const JETTY = { y: -33.2, z0: 16.5, z1: 30, half: 1.3, pileX: 1.42, rows: [16.9, 19.5, 22.1, 24.7, 27.3, 29.85] };

export async function buildJetty() {
  const group = new THREE.Group(); group.name = "jetty"; const r = rng(57), add = (o) => { group.add(o); return o; };
  const [deckM, beamM, ironM] = await Promise.all([
    pbr("wood", { color: [1.25, 1.02, 0.82], normalScale: 1.7 }),
    pbr("wood", { color: [0.78, 0.6, 0.46], normalScale: 1.8 }),
    pbr("rustMetal", { color: [0.2, 0.19, 0.18], metalness: 0.55, roughness: 0.9, normalScale: 0.9 }),
  ]);
  snowify(deckM, { thresh: 0.55 }); snowify(beamM, { thresh: 0.6 }); snowify(ironM, { thresh: 0.6 });
  const { y: Y, z0, z1, half, pileX, rows } = JETTY, len = z1 - z0, zc = (z0 + z1) / 2;

  // deck boards across the jetty (one board per row, staggered tone, gaps)
  const boards = plankField({ halfX: len / 2, rowHalf: () => half, plankW: 0.24, gap: 0.012, thick: 0.06, minLen: 3, maxLen: 3, bevel: 0.01, tile: 1.3, seed: 19, tone: [0.72, 1.1] });
  boards.forEach((g) => { g.rotateY(Math.PI / 2); g.translate(0, Y, zc); });
  add(mergedMesh(boards, deckM, { name: "jettyDeck" }));

  const frame = [];
  for (const x of [-1.05, 0, 1.05]) { const g = roundedBox(0.12, 0.2, len, 0.015); grainUV(g, 1.4, [r() * 4, r() * 4]); frame.push(place(g, [x, Y - 0.16, zc])); }
  for (const z of rows) { const g = roundedBox(3.1, 0.2, 0.2, 0.02); grainUV(g, 1.4, [r() * 4, r() * 4]); frame.push(place(g, [0, Y - 0.36, z])); }
  const piles = [];
  for (const z of rows) for (const s of [-1, 1]) {
    const top = Y + (z === rows[rows.length - 1] || z === rows[0] ? 0.55 : 0.12), bot = -36.5, h = top - bot;
    const g = roundedCylinder(0.15, h, 0.04, 14); grainUV(g, 1.6, [r() * 4, r() * 4]); tint(g, new THREE.Color(0.85 + r() * 0.2, 0.85, 0.82));
    frame.push(place(g, [s * pileX, (top + bot) / 2, z])); piles.push({ x: s * pileX, z });
  }
  for (let i = 0; i < rows.length - 1; i++) for (const s of [-1, 1]) {      // diagonal braces between pile rows
    const a = new THREE.Vector3(s * pileX, Y - 0.45, rows[i]), b = new THREE.Vector3(s * pileX, -34.4, rows[i + 1]);
    const d = b.clone().sub(a), g = roundedBox(0.08, 0.14, d.length(), 0.012); grainUV(g, 1.3, [r() * 4, r() * 4]);
    g.applyMatrix4(new THREE.Matrix4().lookAt(new THREE.Vector3(), d, new THREE.Vector3(0, 1, 0))); g.translate((a.x + b.x) / 2 + s * 0.12, (a.y + b.y) / 2, (a.z + b.z) / 2);
    frame.push(g);
  }
  // ladder on the +X side for the rowboat
  const ladderZ = 25.6;
  for (const dz of [-0.22, 0.22]) { const g = roundedBox(0.06, 1.9, 0.08, 0.01); grainUV(g, 1.2); frame.push(place(g, [pileX + 0.2, Y - 0.6, ladderZ + dz])); }
  for (let k = 0; k < 5; k++) { const g = roundedBox(0.05, 0.05, 0.44, 0.01); grainUV(g, 1.2); frame.push(place(g, [pileX + 0.2, Y - 0.15 - k * 0.32, ladderZ])); }
  add(mergedMesh(frame, beamM, { name: "jettyFrame" }));

  // mooring posts (iron bollards) on the -X side for the supply boat + rope coil
  const mooringPost = new THREE.Vector3(-0.95, Y, 28.7), sternPost = new THREE.Vector3(-0.95, Y, 19.4);
  const bol = (p) => place(lathe([[0, 0], [0.16, 0], [0.16, 0.05], [0.12, 0.09], [0.1, 0.3], [0.11, 0.42], [0.17, 0.46], [0.17, 0.52], [0.12, 0.56], [0, 0.57]], 24), [p.x, p.y, p.z]);
  const iron = [bol(mooringPost), bol(sternPost)];
  add(mergedMesh(iron, ironM, { name: "bollards" }));
  const ropeM = snowify(plain(0x9a7a50, { roughness: 0.95, relief: 0.8 }), { thresh: 0.5 });
  const coilPos = new THREE.Vector3(-0.35, Y, 28.0);
  { const pts = [];
    for (let i = 0; i <= 150; i++) { const t = i / 150, a = t * Math.PI * 2 * 3.2, rr = 0.11 + 0.17 * t; pts.push(new THREE.Vector3(coilPos.x + Math.cos(a) * rr, Y + 0.025 + 0.012 * Math.sin(a * 0.5), coilPos.z + Math.sin(a) * rr)); }
    for (let i = 0; i <= 40; i++) { const t = i / 40, a = t * Math.PI * 2 * 1.1; pts.push(new THREE.Vector3(coilPos.x + Math.cos(a) * 0.24, Y + 0.07, coilPos.z + Math.sin(a) * 0.24)); }
    // loose end up over the bollard
    pts.push(new THREE.Vector3(-0.62, Y + 0.05, 28.35), new THREE.Vector3(-0.85, Y + 0.38, 28.62), mooringPost.clone().add(new THREE.Vector3(0.0, 0.36, 0.08)));
    add(new THREE.Mesh(tube(pts, 0.022, 400, 7), ropeM)).name = "ropeCoil";
  }
  // barrel + crates (Poly Haven props), kept to the deck edges (nothing in the walkway foreground)
  const barrelPos = new THREE.Vector3(0.82, Y, 20.7);
  { const b = await prop("wine_barrel_01", { position: [barrelPos.x, Y, barrelPos.z], rotationY: 0.4 }); const s = sizeOf(b); b.scale.multiplyScalar(0.92 / s.y); add(b);
    const c1 = await prop("wooden_crate_01", { position: [0.78, Y, 18.2], rotationY: 0.12 }); c1.scale.multiplyScalar(0.62 / sizeOf(c1).y); add(c1);
    const c2 = await prop("wooden_crate_02", { position: [0.8, Y + 0.62, 18.18], rotationY: -0.25 }); c2.scale.multiplyScalar(0.42 / sizeOf(c2).y); add(c2);
    const c3 = await prop("wooden_crate_02", { position: [0.25, Y, 17.6], rotationY: 0.5 }); c3.scale.multiplyScalar(0.45 / sizeOf(c3).y); add(c3);
    for (const o of [b, c1, c2, c3]) o.traverse((m) => { if (m.isMesh) snowify(m.material, { thresh: 0.6 }); });
  }
  // lantern post at the end (warm pool of light at dusk/night)
  const postPos = new THREE.Vector3(1.12, Y, 29.7);
  { const pp = [place(roundedCylinder(0.07, 2.3, 0.02, 12), [postPos.x, Y + 1.15, postPos.z]), place(roundedBox(0.5, 0.06, 0.06, 0.01), [postPos.x - 0.2, Y + 2.25, postPos.z])];
    pp.forEach((g) => grainUV(g, 1.2)); add(mergedMesh(pp, beamM, { name: "lanternPost" }));
    const lan = await prop("wooden_lantern_01", {}); lan.scale.multiplyScalar(0.34 / sizeOf(lan).y); lan.position.set(postPos.x - 0.38, Y + 1.86, postPos.z); add(lan);
  }
  const lampPos = new THREE.Vector3(postPos.x - 0.38, Y + 1.98, postPos.z);
  const glow = new THREE.MeshStandardMaterial({ color: 0x221100, emissive: new THREE.Color(1.0, 0.62, 0.25), emissiveIntensity: 4 });
  { const b = add(new THREE.Mesh(new THREE.SphereGeometry(0.045, 16, 12), glow)); b.position.copy(lampPos); b.name = "bulb"; }
  const light = new THREE.PointLight(new THREE.Color(1.0, 0.66, 0.34), 7, 22, 2); light.position.copy(lampPos).add(new THREE.Vector3(0, 0.1, 0)); add(light);

  group.traverse((o) => { if (!o.isMesh) return; o.receiveShadow = true; o.castShadow = o.name !== "bulb"; });
  return { group, piles, light, glowMats: [glow], anchors: {
    jetty: new THREE.Vector3(0, Y, 17.6), jettyEnd: new THREE.Vector3(0, Y, 29.4), mooringPost, sternPost, barrel: barrelPos, ropeCoil: coilPos,
    crates: new THREE.Vector3(0.78, Y, 18.2), ladder: new THREE.Vector3(pileX + 0.2, Y, ladderZ), lanternPost: postPos, jettyLamp: lampPos,
    jettySpotKeeper: new THREE.Vector3(-0.25, Y, 26.4), jettySpotCaptain: new THREE.Vector3(-0.55, Y, 27.6), jettySpotEngineer: new THREE.Vector3(0.75, Y, 25.6),
  } };
}
