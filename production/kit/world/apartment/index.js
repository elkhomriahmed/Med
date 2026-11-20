// Video 2: the robber's 1995 apartment (2nd floor of the street's apartment building). Owner: interiors agent A.
// World coords (LAYOUT_v02.md): floor y = 3.6, ceiling y = 6.4, room x -5..+5, z -15..-9. The street wall's inner face is z = -9.0
// (thickness to z = -8.6; the city agent's facade sits at z = -8.5). His WINDOW = real opening x -0.8..+0.8, y 4.0..5.9.
// Kitchen half x -5..0 (fridge, stove, counter + sink, uppers, teal/mint tile backsplash, table with lemons), living half
// x 0..+5 (couch facing a CRT TV on a stand, coffee table, floor lamp, posters, ceiling fan, front door with frosted glass).
//
//   const apt = await buildApartment({ time: "morning" });  scene.add(apt.group);
//   apt.setTime("morning" | "day" | "night");     // per frame, no rebuild (light counts never change)
//   apt.set({ doorSilhouettes: 0..1, knock: 0..1, windowOpen: 0..1, tvGlow: 0..1, fan: rev/s, lamp: 0..1 });
//   apt.update(t, camera);                         // knock rattle, silhouettes sway, fan, dust (deterministic in t)
//   apt.tvScreen  // Mesh (4:3 plane, UV 0..1). apt.setTvTexture(tex) puts a texture on it (map + emissiveMap).
//   apt.anchors = { window, windowInside, windowOutside, counterSpot, counterTop, tableTop, couchSeat, couchSeatFloor, tvScreen,
//                   doorSpot, doorKnob, keyLightPos (current time), facing: { counterSpot, couchSeat, doorSpot } (rotation.y),
//                   views: { kitchenWide, counterClose, livingWide, tvClose, couchFromTv, doorClose, windowFromInside } }
//   apt.lights = { sun, hemi, bounce, tv, lamp };  apt.groups = { kitchen, living, door, windowLeaves }
import * as THREE from "three";
import { pbr, plain } from "../materials.js";
import { createDust } from "../fx.js";
import { plankField, extrude } from "../geometry.js";
import { buckets, box, boxMM, panelDoor, barHandle, tileField, curtainGeom, canvas, lemonGeom, roundedCylinder, lathe, tube, place,
  clean, mergeGeometries, rng, clamp01, smooth, boxUV } from "./parts.js";

const FY = 3.6, CY = 6.4, ZW = -9.0, ZB = -15.0, XL = -5.0, XR = 5.0;
const WIN = { x0: -0.8, x1: 0.8, y0: 4.0, y1: 5.9 };
const DOOR = { x0: 3.65, x1: 4.55, y1: FY + 2.12 };
const TV = { x: 2.3, z: -14.68, standH: 0.56 };
const COUCH = { x: 2.4, z: -10.75 };
const V = (x, y, z) => new THREE.Vector3(x, y, z);

export const APT_TIMES = {
  morning: { sun: [0xffbb7a, 8.0], dir: [0.42, 0.36, 0.83], hemi: [0xffe6c8, 0x8a6a50, 1.1], bounce: [0xffc890, 4.5], tv: 0, lamp: 0, screen: 0.05,
             hall: 0.55, dust: 1, pendant: 0 },
  day:     { sun: [0xfff0dc, 4.6], dir: [0.30, 0.72, 0.62], hemi: [0xe6eeff, 0x86705a, 1.0], bounce: [0xfff0dc, 2.4], tv: 0, lamp: 0, screen: 0.05,
             hall: 0.6, dust: 0.5, pendant: 0 },
  night:   { sun: [0x7d95ff, 0.0], dir: [0.2, 0.6, 0.77], hemi: [0x3050b8, 0x0a0c1c, 0.9], bounce: [0x4a64c0, 0.6], tv: 1, lamp: 1, screen: 1,
             hall: 1.0, dust: 0, pendant: 0 },
};

export async function buildApartment(opts = {}) {
  const O = { time: "morning", shadows: true, dust: true, ...opts };
  const group = new THREE.Group(); group.name = "apartment";
  const kitchen = new THREE.Group(), living = new THREE.Group(); kitchen.name = "aptKitchen"; living.name = "aptLiving";
  group.add(kitchen, living);
  const B = buckets(), r = rng(21);

  // ---------------------------------------------------------------- materials
  const [wallM, ceilM, plankM, counterM, cabM, doorWoodM, standM, tableM] = await Promise.all([
    pbr("plaster", { color: [1.32, 1.18, 0.90], normalScale: 1.4 }),
    pbr("plaster2", { color: [1.35, 1.28, 1.15], normalScale: 1.0, side: THREE.DoubleSide }),
    pbr("wood", { color: [1.75, 1.22, 0.78], normalScale: 0.7 }),
    pbr("wood", { color: [1.55, 1.08, 0.66], normalScale: 0.8, roughness: 0.75 }),
    Promise.resolve(plain(0xf0e6cc, { roughness: 0.5, relief: 0.22, vertexColors: true })),     // cream-painted cabinets (relief = modelled frames)
    pbr("wood", { color: [0.95, 0.62, 0.42], normalScale: 0.9, roughness: 0.6 }),
    pbr("wood", { color: [0.9, 0.6, 0.4], normalScale: 0.9, roughness: 0.65 }),
    pbr("wood", { color: [1.4, 0.95, 0.6], normalScale: 0.9, roughness: 0.8 }),
  ]);
  const M = {
    wall: wallM, ceil: ceilM, plank: plankM, counter: counterM, cab: cabM, doorWood: doorWoodM, stand: standM, table: tableM,
    trim: plain(0xf2ead8, { roughness: 0.45, relief: 0.2, vertexColors: true }),
    chrome: plain(0xd4d8dc, { roughness: 0.22, metalness: 0.92, relief: 0.08, envMapIntensity: 1.4, vertexColors: true }),
    brass: plain(0xd6a84a, { roughness: 0.3, metalness: 0.85, relief: 0.1, envMapIntensity: 1.3 }),
    enamel: plain(0xf4efe4, { roughness: 0.28, relief: 0.08, vertexColors: true, envMapIntensity: 1.0 }),
    almond: plain(0xeadfc4, { roughness: 0.32, relief: 0.1, vertexColors: true, envMapIntensity: 1.0 }),
    darkMetal: plain(0x2b2927, { roughness: 0.45, metalness: 0.5, relief: 0.3, vertexColors: true }),
    plastic: plain(0x3a3836, { roughness: 0.42, relief: 0.15, vertexColors: true }),
    radiator: plain(0xd8d2c4, { roughness: 0.5, metalness: 0.3, relief: 0.6, vertexColors: true }),
    fabric: plain(0xb0553a, { roughness: 0.95, relief: 1.1, vertexColors: true, envMapIntensity: 0.3 }),
    fabricTeal: plain(0x3f8f8a, { roughness: 0.95, relief: 1.2, vertexColors: true, envMapIntensity: 0.3 }),
    lemon: plain(0xf6cf1c, { roughness: 0.45, relief: 0.8, vertexColors: true }),
    leaf: plain(0x4f8a3a, { roughness: 0.6, relief: 0.3, vertexColors: true, side: THREE.DoubleSide }),
    pot: plain(0xb4603c, { roughness: 0.8, relief: 0.5, vertexColors: true }),
    paper: plain(0xf4efe2, { roughness: 0.85, relief: 0.15, vertexColors: true }),
    ceramic: plain(0xf0f0ea, { roughness: 0.2, relief: 0.05, vertexColors: true }),
    grout: plain(0xbdb7aa, { roughness: 0.9, relief: 0.5, vertexColors: true }),
    rubber: plain(0x1d1b1a, { roughness: 0.7, relief: 0.2, vertexColors: true }),
  };
  const tileM = plain(0xffffff, { roughness: 0.16, relief: 0.06, envMapIntensity: 1.2 });
  const floorTileM = plain(0xffffff, { roughness: 0.35, relief: 0.12, envMapIntensity: 0.9 });
  const glassM = new THREE.MeshStandardMaterial({ color: 0xdfeaf0, roughness: 0.04, metalness: 0.1, transparent: true, opacity: 0.16,
    envMapIntensity: 1.6, depthWrite: false, side: THREE.DoubleSide });
  const curtainM = plain(0xf1d27a, { roughness: 0.92, relief: 0.6, side: THREE.DoubleSide });

  // ---------------------------------------------------------------- shell: walls, floor slab, ceiling (walls have real thickness)
  const W = (...a) => B.add("wall", boxMM(...a, { tile: 1.6 }));
  W(XL - 0.2, FY - 0.2, ZB - 0.2, XL, CY + 0.2, ZW + 0.4);                       // left
  W(XR, FY - 0.2, ZB - 0.2, XR + 0.2, CY + 0.2, ZW + 0.4);                       // right
  W(XL, FY - 0.2, ZB - 0.2, DOOR.x0, CY + 0.2, ZB);                              // back, left of the door
  W(DOOR.x1, FY - 0.2, ZB - 0.2, XR, CY + 0.2, ZB);                              // back, right of the door
  W(DOOR.x0, DOOR.y1, ZB - 0.2, DOOR.x1, CY + 0.2, ZB);                          // over the door
  // window wall: its inner face sits 3 cm behind the street facade's brick back face (z -9.0) so the exposed brick shows cleanly (no z-fight)
  const ZWi = ZW + 0.03;
  W(XL, FY - 0.2, ZWi, WIN.x0, CY + 0.2, ZW + 0.4);                              // window wall (z -8.97..-8.6)
  W(WIN.x1, FY - 0.2, ZWi, XR, CY + 0.2, ZW + 0.4);
  W(WIN.x0, FY - 0.2, ZWi, WIN.x1, WIN.y0, ZW + 0.4);
  W(WIN.x0, WIN.y1, ZWi, WIN.x1, CY + 0.2, ZW + 0.4);
  B.add("ceil", boxMM(XL - 0.2, CY, ZB - 0.2, XR + 0.2, CY + 0.2, ZW + 0.4, { tile: 1.8 }));
  B.add("grout", boxMM(XL, FY - 0.2, ZB, 0.0, FY - 0.0115, ZW, { tone: 0x9a948a }));      // tile bed (grout shows in the gaps)
  B.add("grout", boxMM(0, FY - 0.2, ZB, XR, FY - 0.04, ZW, { tone: 0x3a2a20 }));  // under the boards

  // corridor behind the front door (seen only through the glass / when the door opens)
  B.add("wall", boxMM(DOOR.x0 - 0.6, FY - 0.2, ZB - 1.6, DOOR.x1 + 0.6, CY, ZB - 1.4, { tone: 0xd8c8a8 }));
  B.add("wall", boxMM(DOOR.x0 - 0.6, FY - 0.2, ZB - 1.6, DOOR.x0 - 0.4, CY, ZB - 0.2, { tone: 0xd8c8a8 }));
  B.add("wall", boxMM(DOOR.x1 + 0.4, FY - 0.2, ZB - 1.6, DOOR.x1 + 0.6, CY, ZB - 0.2, { tone: 0xd8c8a8 }));
  B.add("plank", boxMM(DOOR.x0 - 0.4, FY - 0.04, ZB - 1.4, DOOR.x1 + 0.4, FY, ZB - 0.2, { tile: 1 }));
  B.add("ceil", boxMM(DOOR.x0 - 0.6, CY - 0.6, ZB - 1.6, DOOR.x1 + 0.6, CY - 0.4, ZB - 0.2));

  // ---------------------------------------------------------------- floors: kitchen = bevelled check tiles, living = boards
  kitchen.add(tileField({ u0: XL, u1: 0, v0: ZB, v1: ZW, size: 0.3333, gap: 0.006, depth: 0.012, bevel: 0.004, plane: "y", at: FY - 0.012,
    material: floorTileM, seed: 4,
    colorFn: (i, j, rr) => { const k = 0.94 + rr() * 0.1; return ((i + j) % 2 ? new THREE.Color(0.86, 0.80, 0.66) : new THREE.Color(0.30, 0.56, 0.52)).multiplyScalar(k); } }));
  for (const g of plankField({ halfX: 2.5, rowHalf: () => 3, plankW: 0.16, thick: 0.04, seed: 9, tone: [0.78, 1.1] })) B.add("plank", place(g, [2.5, FY, -12]));
  B.add("trim", boxMM(-0.04, FY - 0.01, ZB, 0.04, FY + 0.008, ZW, { r: 0.004, tone: 0xc9a066 }));   // threshold strip

  // skirting (base + cap), picture rail, crown moulding (stepped cove) on all four walls
  const runs = [  // [x0, z0, x1, z1, normal]
    [XL, ZB, XL, ZW, "x+"], [XR, ZB, XR, ZW, "x-"], [XL, ZB, DOOR.x0 - 0.1, ZB, "z+"], [DOOR.x1 + 0.1, ZB, XR, ZB, "z+"],
    [XL, ZW, WIN.x0 - 0.1, ZW, "z-"], [WIN.x1 + 0.1, ZW, XR, ZW, "z-"]];
  const strip = (x0, z0, x1, z1, n, y, h, d, tone = 0xf2ead8, rr = 0.006) => {
    const s = n[1] === "+" ? 1 : -1;
    if (n[0] === "x") B.add("trim", boxMM(x0 + (s > 0 ? 0 : -d), y, z0, x0 + (s > 0 ? d : 0), y + h, z1, { r: rr, tone }));
    else B.add("trim", boxMM(x0, y, z0 + (s > 0 ? 0 : -d), x1, y + h, z0 + (s > 0 ? d : 0), { r: rr, tone }));
  };
  for (const [x0, z0, x1, z1, n] of runs) {
    strip(x0, z0, x1, z1, n, FY, 0.13, 0.018);
    strip(x0, z0, x1, z1, n, FY + 0.12, 0.025, 0.026, 0xece3cf, 0.01);
    strip(x0, z0, x1, z1, n, CY - 0.12, 0.12, 0.02);
    strip(x0, z0, x1, z1, n, CY - 0.07, 0.07, 0.05, 0xf4ecda, 0.012);
    strip(x0, z0, x1, z1, n, CY - 0.03, 0.03, 0.085, 0xf6efdf, 0.01);
    strip(x0, z0, x1, z1, n, FY + 2.15, 0.035, 0.022, 0xe6dcc6, 0.008);   // picture rail
  }
  // ceiling: shallow plaster beams (relief) across the room
  for (const z of [-10.6, -12.2, -13.8]) B.add("ceil", boxMM(XL, CY - 0.07, z - 0.09, XR, CY, z + 0.09, { tone: 0xf2ece0 }));

  // ---------------------------------------------------------------- window: reveal, sill, apron, casing, casement leaves, curtains
  const T = (...a) => B.add("trim", boxMM(...a));
  T(WIN.x0 - 0.02, WIN.y0, ZW - 0.01, WIN.x0, WIN.y1, ZW + 0.4); T(WIN.x1, WIN.y0, ZW - 0.01, WIN.x1 + 0.02, WIN.y1, ZW + 0.4);
  T(WIN.x0, WIN.y1, ZW - 0.01, WIN.x1, WIN.y1 + 0.02, ZW + 0.4);
  B.add("trim", boxMM(WIN.x0 - 0.16, WIN.y0 - 0.03, ZW - 0.09, WIN.x1 + 0.16, WIN.y0 + 0.012, ZW + 0.42, { r: 0.012 }));   // sill board
  B.add("trim", boxMM(WIN.x0 - 0.1, WIN.y0 - 0.16, ZW - 0.035, WIN.x1 + 0.1, WIN.y0 - 0.03, ZW, { r: 0.008 }));            // apron
  for (const [x, s] of [[WIN.x0 - 0.06, -1], [WIN.x1 + 0.06, 1]]) {     // side casings with a back band
    B.add("trim", boxMM(x - 0.05, WIN.y0, ZW - 0.022, x + 0.05, WIN.y1 + 0.1, ZW, { r: 0.008 }));
    B.add("trim", boxMM(x + s * 0.045 - 0.012, WIN.y0, ZW - 0.034, x + s * 0.045 + 0.012, WIN.y1 + 0.12, ZW, { r: 0.006, tone: 0xe8dfcb }));
  }
  B.add("trim", boxMM(WIN.x0 - 0.13, WIN.y1 + 0.02, ZW - 0.024, WIN.x1 + 0.13, WIN.y1 + 0.13, ZW, { r: 0.008 }));            // head casing
  B.add("trim", boxMM(WIN.x0 - 0.16, WIN.y1 + 0.13, ZW - 0.045, WIN.x1 + 0.16, WIN.y1 + 0.16, ZW, { r: 0.01 }));            // cap
  // casement leaves (each its own group, hinged on the jamb; windowOpen 0..1 -> 0..82 degrees into the room)
  const leaves = new THREE.Group(); leaves.name = "windowLeaves"; group.add(leaves);
  const leafW = 0.8, leafH = WIN.y1 - WIN.y0 - 0.01, frameM = M.trim;
  const leafGeo = (() => { const g = [], fr = 0.055, d = 0.05;
    g.push(box(fr, leafH, d, [fr / 2, leafH / 2, 0], { r: 0.008 }), box(fr, leafH, d, [leafW - fr / 2, leafH / 2, 0], { r: 0.008 }));
    g.push(box(leafW - 2 * fr, fr, d, [leafW / 2, fr / 2, 0], { r: 0.008 }), box(leafW - 2 * fr, fr * 1.4, d, [leafW / 2, leafH - fr * 0.7, 0], { r: 0.008 }));
    for (const y of [leafH * 0.36, leafH * 0.68]) g.push(box(leafW - 2 * fr, 0.022, 0.032, [leafW / 2, y, 0], { r: 0.005 }));
    g.push(box(0.022, leafH - 2 * fr, 0.032, [leafW / 2, leafH / 2, 0], { r: 0.005 }));
    return mergeGeometries(g.map((x) => clean(x))); })();
  const paneGeo = new THREE.PlaneGeometry(leafW - 0.1, leafH - 0.12); paneGeo.translate(leafW / 2, leafH / 2, 0);
  const leafPivots = [];
  for (const s of [1, -1]) {               // s = +1: left leaf hinged at x0 (extends +X); -1: right leaf hinged at x1
    const piv = new THREE.Group(); piv.position.set(s > 0 ? WIN.x0 + 0.005 : WIN.x1 - 0.005, WIN.y0 + 0.005, ZW + 0.06);
    const f = new THREE.Mesh(leafGeo, frameM); f.castShadow = true; f.receiveShadow = true; f.scale.x = s; piv.add(f);
    const p = new THREE.Mesh(paneGeo, glassM); p.scale.x = s; p.renderOrder = 2; piv.add(p);
    const kn = new THREE.Mesh(new THREE.SphereGeometry(0.014, 12, 8), M.brass); kn.position.set(s * (leafW - 0.035), leafH * 0.5, -0.04); piv.add(kn);
    piv.userData.s = s; leaves.add(piv); leafPivots.push(piv);
  }
  // curtain rod + gathered curtains with tie-backs
  const rodY = WIN.y1 + 0.24, rodZ = ZW - 0.12;
  const rod = new THREE.CylinderGeometry(0.014, 0.014, 2.9, 12); rod.rotateZ(Math.PI / 2); B.add("chrome", place(clean(rod), [0, rodY, rodZ]));
  for (const s of [-1, 1]) {
    B.add("chrome", place(clean(new THREE.SphereGeometry(0.032, 14, 10)), [s * 1.47, rodY, rodZ]));
    B.add("chrome", place(clean(new THREE.CylinderGeometry(0.01, 0.01, 0.12, 8)), [s * 1.3, rodY, rodZ + 0.06], [Math.PI / 2, 0, 0]));
    const cg = curtainGeom(0.75, rodY - FY - 0.06, { folds: 8, amp: 0.045, tieY: -0.6, gather: 0.62 });
    const c = new THREE.Mesh(cg, curtainM); c.castShadow = true; c.receiveShadow = true;
    c.position.set(s * 1.42, rodY - 0.02, rodZ - 0.06); c.scale.x = -s; group.add(c);
    // tie-back band
    B.add("fabricTeal", place(clean(new THREE.TorusGeometry(0.075, 0.016, 8, 20)), [s * 1.27, rodY - 0.02 - (rodY - FY) * 0.6, rodZ - 0.0], [Math.PI / 2, 0, 0]));
  }

  // ---------------------------------------------------------------- radiator (cast iron columns) on the left wall by the window
  { const rx = XL + 0.14, rz0 = -10.55, n = 13;
    for (let i = 0; i < n; i++) { const z = rz0 + i * 0.07;
      B.add("radiator", box(0.16, 0.58, 0.05, [rx, FY + 0.38, z], { r: 0.022, seg: 3 }));
      for (const y of [FY + 0.15, FY + 0.61]) B.add("radiator", box(0.12, 0.05, 0.075, [rx, y, z + 0.035], { r: 0.02 })); }
    for (const z of [rz0 - 0.02, rz0 + (n - 1) * 0.07 + 0.02]) B.add("radiator", box(0.06, 0.1, 0.04, [rx, FY + 0.05, z], { r: 0.01 }));
    B.add("chrome", place(clean(new THREE.CylinderGeometry(0.018, 0.018, 0.22, 10)), [rx, FY + 0.12, rz0 - 0.1], [0, 0, 0]));
    B.add("radiator", place(clean(new THREE.CylinderGeometry(0.03, 0.03, 0.05, 12)), [rx, FY + 0.2, rz0 - 0.1], [0, 0, 0]));
    B.add("trim", boxMM(XL, FY + 0.82, rz0 - 0.15, XL + 0.24, FY + 0.85, rz0 + n * 0.07 + 0.1, { r: 0.01 }));   // shelf over it
    // potted plant on the shelf
    B.add("pot", place(lathe([[0, 0], [0.07, 0], [0.09, 0.14], [0.1, 0.15], [0.09, 0.155], [0, 0.155]], 24), [XL + 0.12, FY + 0.85, -10.2]));
    for (let i = 0; i < 9; i++) { const a = (i / 9) * Math.PI * 2, sh = new THREE.Shape(); sh.moveTo(0, 0); sh.quadraticCurveTo(0.05, 0.12, 0, 0.26); sh.quadraticCurveTo(-0.05, 0.12, 0, 0);
      const lg = new THREE.ShapeGeometry(sh, 6); B.add("leaf", place(clean(lg, 0xffffff), [XL + 0.12, FY + 1.0, -10.2], [-0.5 - r() * 0.4, a, 0])); }
  }

  // ---------------------------------------------------------------- KITCHEN (back wall run: fridge | stove | counter + sink)
  const KB = ZB, CTY = FY + 0.9;                       // counter top surface
  // fridge (almond, two doors, chrome bar handles, kick grille, magnets)
  { const x = -4.56, w = 0.74, d = 0.68, h = 1.74, z = KB + 0.04 + d / 2;
    B.add("almond", box(w, h - 0.08, d - 0.04, [x, FY + 0.08 + (h - 0.08) / 2, z - 0.02], { r: 0.035, seg: 3 }));
    B.add("almond", box(w - 0.01, 0.52, 0.05, [x, FY + h - 0.27, z + d / 2 - 0.02], { r: 0.02, seg: 3 }));
    B.add("almond", box(w - 0.01, h - 0.65, 0.05, [x, FY + 0.09 + (h - 0.65) / 2, z + d / 2 - 0.02], { r: 0.02, seg: 3 }));
    B.add("rubber", box(w - 0.06, 0.07, 0.04, [x, FY + 0.045, z + d / 2 - 0.05], { r: 0.008 }));
    for (let i = 0; i < 7; i++) B.add("darkMetal", box(0.06, 0.008, 0.01, [x - 0.24 + i * 0.08, FY + 0.045, z + d / 2 - 0.028], { r: 0.003 }));
    for (const [y, l] of [[FY + h - 0.38, 0.26], [FY + 1.0, 0.5]]) {
      const hg = barHandle(l, 0.011); hg.rotateZ(Math.PI / 2); B.add("chrome", place(hg, [x + w / 2 - 0.07, y, z + d / 2 + 0.005]));
    }
    const mc = [0xe23b3b, 0x2f7fd0, 0x3fae5a, 0xf5cf1c];
    for (let i = 0; i < 6; i++) B.add("plastic", box(0.045, 0.045, 0.014, [x - 0.22 + (i % 3) * 0.13, FY + 1.36 - Math.floor(i / 3) * 0.12, z + d / 2 + 0.012], { r: 0.008, tone: mc[i % 4] }));
    B.add("paper", box(0.15, 0.2, 0.004, [x - 0.12, FY + 1.1, z + d / 2 + 0.008], { r: 0.001, rot: [0, 0, 0.06] }));   // a note under a magnet
    B.add("lemon", place(lemonGeom(0.7), [x + 0.06, FY + 1.47, z + d / 2 + 0.02]));                                 // lemon magnet
  }
  // stove (white enamel, backguard with knobs, 4 coil burners, oven door with dark window)
  { const x = -3.79, w = 0.76, d = 0.64, z = KB + 0.02 + d / 2;
    B.add("enamel", box(w, 0.88, d, [x, FY + 0.44, z], { r: 0.02 }));
    B.add("enamel", box(w, 0.22, 0.07, [x, FY + 1.0, KB + 0.06], { r: 0.02 }));
    for (let i = 0; i < 4; i++) B.add("plastic", place(clean(roundedCylinder(0.022, 0.03, 0.006, 16), 0x2a2828), [x - 0.27 + i * 0.18, FY + 1.0, KB + 0.11], [Math.PI / 2, 0, 0]));
    B.add("rubber", box(w - 0.06, 0.04, 0.012, [x, FY + 1.06, KB + 0.098], { r: 0.003, tone: 0x3a6a8a }));   // clock strip
    for (const [bx, bz, br] of [[-0.18, -0.12, 0.085], [0.18, -0.12, 0.07], [-0.18, 0.14, 0.07], [0.18, 0.14, 0.085]]) {
      for (const k of [1, 0.66, 0.34]) B.add("darkMetal", place(clean(new THREE.TorusGeometry(br * k, 0.008, 6, 28)), [x + bx, FY + 0.887, z + bz], [Math.PI / 2, 0, 0]));
      B.add("chrome", place(clean(new THREE.CylinderGeometry(br + 0.02, br + 0.02, 0.006, 28)), [x + bx, FY + 0.881, z + bz]));
    }
    B.add("enamel", box(w - 0.06, 0.5, 0.03, [x, FY + 0.47, z + d / 2 + 0.01], { r: 0.015 }));
    B.add("rubber", box(w - 0.26, 0.24, 0.012, [x, FY + 0.5, z + d / 2 + 0.026], { r: 0.01, tone: 0x1a1a22 }));
    const hg = barHandle(w - 0.14, 0.011); B.add("chrome", place(hg, [x, FY + 0.69, z + d / 2 + 0.02]));
    B.add("enamel", box(w - 0.06, 0.12, 0.03, [x, FY + 0.12, z + d / 2 + 0.01], { r: 0.012 }));
    // range hood + small cupboard above
    B.add("enamel", box(w, 0.14, 0.46, [x, FY + 1.62, KB + 0.23], { r: 0.015, tone: 0xe8e2d4 }));
    B.add("darkMetal", box(w - 0.1, 0.01, 0.36, [x, FY + 1.548, KB + 0.24], { r: 0.003 }));
    for (const p of panelDoor(w / 2 - 0.01, 0.48, 0.03, { frame: 0.05 })) B.add("cab", place(p, [x - w / 4, FY + 1.95, KB + 0.36]));
    for (const p of panelDoor(w / 2 - 0.01, 0.48, 0.03, { frame: 0.05 })) B.add("cab", place(p, [x + w / 4, FY + 1.95, KB + 0.36]));
    B.add("cab", boxMM(x - w / 2, FY + 1.7, KB, x + w / 2, FY + 2.2, KB + 0.34));
  }
  // base cabinets + counter top with a real sink cutout
  const cx0 = -3.40, cx1 = -0.90, cd = 0.62, sinkX = -2.15, sinkW = 0.74, sz0 = KB + 0.1, sz1 = KB + 0.52;
  { B.add("cab", boxMM(cx0, FY + 0.1, KB, cx1, FY + 0.86, KB + cd - 0.04));
    B.add("rubber", boxMM(cx0, FY, KB, cx1, FY + 0.1, KB + cd - 0.1, { tone: 0x2c2420 }));               // recessed toe kick
    const nd = 4, dw = (cx1 - cx0) / nd;
    for (let i = 0; i < nd; i++) {
      const x = cx0 + dw * (i + 0.5);
      for (const p of panelDoor(dw - 0.012, 0.52, 0.028, { frame: 0.06 })) B.add("cab", place(p, [x, FY + 0.38, KB + cd - 0.025]));
      for (const p of panelDoor(dw - 0.012, 0.15, 0.026, { frame: 0.035 })) B.add("cab", place(p, [x, FY + 0.76, KB + cd - 0.025]));
      B.add("chrome", place(barHandle(0.1, 0.006), [x, FY + 0.76, KB + cd - 0.01]));
      const kg = new THREE.SphereGeometry(0.014, 12, 8); B.add("brass" === "x" ? "chrome" : "chrome", place(clean(kg), [x + (i % 2 ? -1 : 1) * (dw / 2 - 0.06), FY + 0.56, KB + cd]));
    }
    const top = (x0, z0, x1, z1) => B.add("counter", boxMM(x0, CTY - 0.04, z0, x1, CTY, z1, { r: 0.006, tile: 0.9 }));
    top(cx0 - 0.02, KB, sinkX - sinkW / 2, KB + cd + 0.02); top(sinkX + sinkW / 2, KB, cx1 + 0.02, KB + cd + 0.02);
    top(sinkX - sinkW / 2, KB, sinkX + sinkW / 2, sz0); top(sinkX - sinkW / 2, sz1, sinkX + sinkW / 2, KB + cd + 0.02);
    B.add("trim", boxMM(cx0 - 0.02, CTY - 0.06, KB + cd, cx1 + 0.02, CTY - 0.035, KB + cd + 0.025, { r: 0.008, tone: 0xd8cbb0 }));   // nosing
    B.add("counter", boxMM(-4.17, CTY, KB, cx1 + 0.02, CTY + 0.08, KB + 0.02, { r: 0.004 }));   // back curb
    // double sink: two steel basins
    const by = CTY - 0.2, bw = sinkW / 2 - 0.02;
    for (const s of [-1, 1]) { const bx = sinkX + s * (bw / 2 + 0.01);
      B.add("chrome", boxMM(bx - bw / 2, by, sz0, bx + bw / 2, by + 0.01, sz1));
      B.add("chrome", boxMM(bx - bw / 2, by, sz0, bx - bw / 2 + 0.008, CTY - 0.005, sz1));
      B.add("chrome", boxMM(bx + bw / 2 - 0.008, by, sz0, bx + bw / 2, CTY - 0.005, sz1));
      B.add("chrome", boxMM(bx - bw / 2, by, sz0, bx + bw / 2, CTY - 0.005, sz0 + 0.008));
      B.add("chrome", boxMM(bx - bw / 2, by, sz1 - 0.008, bx + bw / 2, CTY - 0.005, sz1));
      B.add("darkMetal", place(clean(new THREE.CylinderGeometry(0.03, 0.03, 0.004, 16)), [bx, by + 0.012, (sz0 + sz1) / 2]));
    }
    B.add("chrome", boxMM(sinkX - 0.012, by, sz0, sinkX + 0.012, CTY - 0.004, sz1));
    for (const [x0, z0, x1, z1] of [[sinkX - sinkW / 2 - 0.02, sz0 - 0.02, sinkX + sinkW / 2 + 0.02, sz0], [sinkX - sinkW / 2 - 0.02, sz1, sinkX + sinkW / 2 + 0.02, sz1 + 0.02],
      [sinkX - sinkW / 2 - 0.02, sz0, sinkX - sinkW / 2, sz1], [sinkX + sinkW / 2, sz0, sinkX + sinkW / 2 + 0.02, sz1]]) B.add("chrome", boxMM(x0, CTY, z0, x1, CTY + 0.006, z1, { r: 0.002 }));
    // faucet (gooseneck) + two handles
    B.add("chrome", place(clean(new THREE.CylinderGeometry(0.025, 0.03, 0.05, 16)), [sinkX, CTY + 0.025, KB + 0.06]));
    B.add("chrome", clean(tube([V(sinkX, CTY + 0.04, KB + 0.06), V(sinkX, CTY + 0.28, KB + 0.07), V(sinkX, CTY + 0.33, KB + 0.16), V(sinkX, CTY + 0.27, KB + 0.25), V(sinkX, CTY + 0.2, KB + 0.26)], 0.012, 40, 10)));
    for (const s of [-1, 1]) { B.add("chrome", place(clean(lathe([[0, 0], [0.02, 0], [0.018, 0.04], [0.032, 0.05], [0.03, 0.06], [0, 0.065]], 12)), [sinkX + s * 0.13, CTY, KB + 0.07]));
      B.add("plastic", place(clean(new THREE.SphereGeometry(0.011, 10, 8), s < 0 ? 0xc03030 : 0x3060c0), [sinkX + s * 0.13, CTY + 0.07, KB + 0.07])); }
  }
  // teal/mint backsplash: real bevelled tiles over a grout bed, darker teal border row
  B.add("grout", boxMM(-4.17, CTY, KB, cx1 + 0.02, FY + 1.47, KB + 0.006, { tone: 0xc4beb2 }));
  kitchen.add(tileField({ u0: -4.17, u1: cx1 + 0.02, v0: CTY + 0.08, v1: FY + 1.47, size: 0.1525, gap: 0.0045, depth: 0.011, plane: "z", at: KB + 0.006, sign: 1,
    material: tileM, seed: 7, colorFn: (i, j, rr) => {
      if (j === 3) return new THREE.Color(0.10, 0.42, 0.42);
      const k = rr(); return (k < 0.5 ? new THREE.Color(0.55, 0.84, 0.74) : k < 0.85 ? new THREE.Color(0.46, 0.78, 0.70) : new THREE.Color(0.68, 0.90, 0.80)).multiplyScalar(0.95 + rr() * 0.08); } }));
  // upper cabinets over the counter (+ crown on top)
  { const uy0 = FY + 1.48, uy1 = FY + 2.24, ud = 0.34, nd = 4, dw = (cx1 - cx0) / nd;
    B.add("cab", boxMM(cx0, uy0, KB, cx1, uy1, KB + ud - 0.03));
    for (let i = 0; i < nd; i++) { const x = cx0 + dw * (i + 0.5);
      for (const p of panelDoor(dw - 0.012, uy1 - uy0 - 0.02, 0.028, { frame: 0.06 })) B.add("cab", place(p, [x, (uy0 + uy1) / 2, KB + ud - 0.016]));
      B.add("chrome", place(clean(new THREE.SphereGeometry(0.014, 12, 8)), [x + (i % 2 ? -1 : 1) * (dw / 2 - 0.06), uy0 + 0.08, KB + ud + 0.005])); }
    B.add("cab", boxMM(cx0 - 0.03, uy1, KB, cx1 + 0.03, uy1 + 0.05, KB + ud + 0.03, { r: 0.01 }));
    B.add("cab", boxMM(cx0 - 0.01, uy0 - 0.03, KB, cx1 + 0.01, uy0, KB + ud, { r: 0.006 }));
    // jars + cereal box + plates on top of the uppers (small detail at height)
    for (let i = 0; i < 3; i++) B.add("ceramic", place(clean(roundedCylinder(0.07 - i * 0.008, 0.2 - i * 0.03, 0.01, 20), [0xe8e0cc, 0xd8e8e0, 0xf0d890][i]), [cx0 + 0.2 + i * 0.17, uy1 + 0.05 + (0.2 - i * 0.03) / 2, KB + 0.16]));
    B.add("paper", box(0.2, 0.3, 0.07, [cx1 - 0.3, uy1 + 0.2, KB + 0.12], { r: 0.004, tone: 0xd84a2a }));
  }
  // counter-top dressing (back half only: the front edge stays clear for the robber's hands)
  { // toaster
    B.add("chrome", box(0.26, 0.18, 0.15, [cx1 - 0.35, CTY + 0.09, KB + 0.14], { r: 0.035, seg: 3 }));
    for (const dz of [-0.03, 0.03]) B.add("rubber", box(0.16, 0.01, 0.022, [cx1 - 0.35, CTY + 0.181, KB + 0.14 + dz], { r: 0.004 }));
    B.add("plastic", box(0.02, 0.02, 0.03, [cx1 - 0.2, CTY + 0.13, KB + 0.14], { r: 0.006 }));
    // coffee maker
    B.add("plastic", box(0.2, 0.32, 0.2, [cx0 + 0.25, CTY + 0.16, KB + 0.13], { r: 0.03, seg: 3, tone: 0x2a2826 }));
    B.add("ceramic", place(clean(lathe([[0, 0], [0.065, 0], [0.075, 0.08], [0.06, 0.12], [0, 0.12]], 18), 0x7a4a2a), [cx0 + 0.25, CTY + 0.02, KB + 0.25]));
    // dish rack with plates
    B.add("chrome", boxMM(sinkX + 0.45, CTY, KB + 0.08, sinkX + 0.8, CTY + 0.02, KB + 0.42, { r: 0.004 }));
    for (let i = 0; i < 5; i++) B.add("ceramic", place(clean(new THREE.CylinderGeometry(0.11, 0.11, 0.012, 24)), [sinkX + 0.5 + i * 0.06, CTY + 0.12, KB + 0.25], [0, 0, Math.PI / 2 - 0.15]));
    // canisters
    for (let i = 0; i < 3; i++) { const h = 0.22 - i * 0.04;
      B.add("ceramic", place(clean(roundedCylinder(0.06, h, 0.01, 20), 0xf2ece0), [-4.0 + i * 0.0 + 0.0, CTY + h / 2, KB + 0.12 + i * 0.0]).translate(i * 0.14 - 0.0, 0, 0));
      B.add("plastic", place(clean(roundedCylinder(0.062, 0.025, 0.008, 20), 0x2f8f86), [-4.0 + i * 0.14, CTY + h + 0.012, KB + 0.12])); }
    // juicer (ribbed cone in a dish) + cutting board + lemons: the story corner
    const jx = -1.45, jz = KB + 0.34;
    B.add("counter", boxMM(jx - 0.24, CTY, jz - 0.15, jx + 0.2, CTY + 0.02, jz + 0.13, { r: 0.008, tone: 0xe0b888 }));
    B.add("ceramic", place(clean(lathe([[0, 0], [0.06, 0], [0.085, 0.03], [0.085, 0.038], [0.045, 0.04], [0.035, 0.07], [0.01, 0.1], [0, 0.102]], 24), 0xe8f2f0), [jx + 0.08, CTY + 0.02, jz]));
    for (const [dx, dz, ry] of [[-0.12, -0.03, 0.4], [-0.08, 0.06, -0.9]]) B.add("lemon", place(lemonGeom(1.05), [jx + dx, CTY + 0.05, jz + dz], [0, ry, 0]));
    // half lemon, cut face up
    B.add("lemon", place(clean(new THREE.SphereGeometry(0.036, 16, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2)), [jx - 0.17, CTY + 0.056, jz + 0.05], [Math.PI, 0, 0]));
    B.add("ceramic", place(clean(new THREE.CylinderGeometry(0.034, 0.034, 0.004, 18), 0xfff2a0), [jx - 0.17, CTY + 0.056, jz + 0.05]));
    // paper towel roll on the wall
    B.add("paper", place(clean(roundedCylinder(0.055, 0.26, 0.01, 20)), [-1.15, FY + 1.33, KB + 0.09], [0, 0, Math.PI / 2]));
    B.add("chrome", boxMM(-1.3, FY + 1.32, KB, -1.29, FY + 1.36, KB + 0.1));
    B.add("chrome", boxMM(-1.01, FY + 1.32, KB, -1.0, FY + 1.36, KB + 0.1));
  }
  // wall telephone (1995 beige, coiled cord) on the back wall right of the counter + light switch + outlets
  { const px = -0.45, py = FY + 1.35;
    B.add("almond", box(0.11, 0.2, 0.06, [px, py, KB + 0.03], { r: 0.02 }));
    B.add("almond", box(0.07, 0.22, 0.06, [px, py + 0.01, KB + 0.085], { r: 0.025, seg: 3 }));
    const pts = []; for (let i = 0; i <= 80; i++) { const t = i / 80, a = t * 48 * Math.PI; pts.push(V(px + 0.01 * Math.cos(a) + 0.02 * t, py - 0.11 - t * 0.38 + 0.01 * Math.sin(a), KB + 0.08 + 0.01 * Math.sin(a))); }
    B.add("almond", clean(tube(pts, 0.004, 400, 5)));
    for (const [x, y] of [[0.2, FY + 1.3], [-3.0, CTY + 0.2], [-1.0, CTY + 0.2]]) B.add("trim", box(0.075, 0.12, 0.012, [x, y, KB + 0.006], { r: 0.004 }));
  }
  // kitchen table (round, pedestal) + 2 bentwood chairs + fruit bowl with lemons
  const TB = { x: -2.7, z: -11.7, h: 0.76 };
  { B.add("table", place(clean(roundedCylinder(0.52, 0.04, 0.012, 48)), [TB.x, FY + TB.h - 0.02, TB.z]));
    B.add("table", place(clean(new THREE.CylinderGeometry(0.47, 0.47, 0.06, 40, 1, true)), [TB.x, FY + TB.h - 0.07, TB.z]));
    B.add("table", place(clean(lathe([[0.05, 0], [0.05, 0.08], [0.035, 0.12], [0.045, 0.45], [0.06, 0.6], [0.09, 0.64], [0, 0.64]], 20)), [TB.x, FY + 0.06, TB.z]));
    for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + 0.6;
      B.add("table", place(box(0.4, 0.05, 0.06, [0, 0, 0], { r: 0.02 }), [TB.x + Math.cos(a) * 0.18, FY + 0.04, TB.z + Math.sin(a) * 0.18], [0, -a, 0])); }
    // table runner (lemon-yellow cloth accent)
    B.add("fabricTeal", boxMM(TB.x - 0.42, FY + TB.h, TB.z - 0.12, TB.x + 0.42, FY + TB.h + 0.004, TB.z + 0.12, { r: 0.001, tone: 0xffffff }));
    // fruit bowl (lathe) with a heap of lemons
    B.add("ceramic", place(clean(lathe([[0, 0], [0.06, 0], [0.07, 0.015], [0.15, 0.06], [0.16, 0.1], [0.152, 0.1], [0.14, 0.065], [0.06, 0.025], [0, 0.025]], 32), 0x2f7f7a), [TB.x - 0.08, FY + TB.h + 0.004, TB.z - 0.04]));
    const lp = [[-0.06, 0.06, -0.02, 0.3], [0.05, 0.06, 0.03, 1.4], [0.0, 0.06, 0.08, 2.2], [-0.02, 0.06, -0.08, 0.9], [0.07, 0.06, -0.06, 2.8], [0.0, 0.115, 0.0, 1.9], [-0.06, 0.11, 0.04, 0.2]];
    for (const [dx, dy, dz, ry] of lp) B.add("lemon", place(lemonGeom(1.0), [TB.x - 0.08 + dx, FY + TB.h + dy, TB.z - 0.04 + dz], [r() * 0.3, ry, r() * 0.3]));
    B.add("lemon", place(lemonGeom(1.0), [TB.x + 0.22, FY + TB.h + 0.035, TB.z + 0.18], [0, 0.4, 0]));
    // chairs
    const chair = (x, z, ry) => { const g = [];
      g.push(clean(roundedCylinder(0.21, 0.035, 0.012, 28)).translate(0, 0.45, 0));
      for (const [lx, lz] of [[-0.15, -0.15], [0.15, -0.15], [-0.15, 0.15], [0.15, 0.15]]) { const l = clean(new THREE.CylinderGeometry(0.016, 0.013, 0.45, 10)); l.rotateX(lz * 0.25); l.rotateZ(-lx * 0.25); l.translate(lx * 1.05, 0.225, lz * 1.05); g.push(l); }
      const ring = clean(new THREE.TorusGeometry(0.17, 0.009, 6, 32)); ring.rotateX(Math.PI / 2); ring.translate(0, 0.16, 0); g.push(ring);
      g.push(clean(tube([V(-0.17, 0.45, -0.14), V(-0.18, 0.75, -0.2), V(0, 0.9, -0.24), V(0.18, 0.75, -0.2), V(0.17, 0.45, -0.14)], 0.014, 40, 8)));
      for (const sx of [-0.07, 0, 0.07]) g.push(clean(new THREE.CylinderGeometry(0.008, 0.008, 0.36, 6)).translate(sx, 0.66, -0.2));
      const m = mergeGeometries(g); boxUV(m, 0.5); place(m, [x, FY, z], [0, ry, 0]); B.add("table", m); };
    chair(TB.x - 0.62, TB.z + 0.12, Math.PI / 2 + 0.2); chair(TB.x + 0.3, TB.z - 0.6, -0.4);
    // pendant lamp over the table
    B.add("darkMetal", place(clean(new THREE.CylinderGeometry(0.004, 0.004, 1.05, 6)), [TB.x, CY - 0.525, TB.z]));
    B.add("darkMetal", place(clean(new THREE.CylinderGeometry(0.05, 0.05, 0.02, 16)), [TB.x, CY - 0.01, TB.z]));
  }
  const pendant = new THREE.Mesh(lathe([[0.02, 0], [0.04, -0.02], [0.17, -0.18], [0.19, -0.22], [0.185, -0.225], [0.165, -0.19], [0.035, -0.03], [0.015, -0.01]], 36),
    plain(0x2f7f7a, { roughness: 0.35, relief: 0.1, side: THREE.DoubleSide })); pendant.position.set(TB.x, CY - 1.05, TB.z); pendant.castShadow = true; kitchen.add(pendant);
  const bulbM = new THREE.MeshStandardMaterial({ color: 0xfff0d0, emissive: 0xffd8a0, emissiveIntensity: 0.2, roughness: 0.3 });
  const pBulb = new THREE.Mesh(new THREE.SphereGeometry(0.045, 16, 12), bulbM); pBulb.position.set(TB.x, CY - 1.24, TB.z); kitchen.add(pBulb);
  // wall clock + 1995 calendar on the left wall
  const clockTex = canvas(256, 256, (g, w) => { g.fillStyle = "#f6f0e0"; g.fillRect(0, 0, w, w); g.fillStyle = "#2a1c14"; g.font = "bold 30px Arial";
    g.textAlign = "center"; g.textBaseline = "middle";
    for (let i = 1; i <= 12; i++) { const a = (i / 12) * Math.PI * 2 - Math.PI / 2; g.fillText(String(i), w / 2 + Math.cos(a) * 96, w / 2 + Math.sin(a) * 96); }
    g.lineCap = "round"; g.strokeStyle = "#2a1c14"; g.lineWidth = 9; g.beginPath(); g.moveTo(128, 128); g.lineTo(128 + 50 * Math.cos(-2.2), 128 + 50 * Math.sin(-2.2)); g.stroke();
    g.lineWidth = 6; g.beginPath(); g.moveTo(128, 128); g.lineTo(128 + 80 * Math.cos(-0.5), 128 + 80 * Math.sin(-0.5)); g.stroke(); });
  { const cz = -12.9, cy = FY + 2.0;
    B.add("trim", place(clean(new THREE.TorusGeometry(0.17, 0.025, 10, 40), 0xe0b030), [XL + 0.03, cy, cz], [0, Math.PI / 2, 0]));
    B.add("trim", place(clean(new THREE.CylinderGeometry(0.17, 0.17, 0.03, 40), 0xe0b030), [XL + 0.017, cy, cz], [0, 0, Math.PI / 2]));
    const face = new THREE.Mesh(new THREE.CircleGeometry(0.155, 40), new THREE.MeshStandardMaterial({ map: clockTex, roughness: 0.4 }));
    face.position.set(XL + 0.034, cy, cz); face.rotation.y = Math.PI / 2; kitchen.add(face); }
  const calTex = canvas(256, 384, (g, w, h) => { g.fillStyle = "#fbf6ea"; g.fillRect(0, 0, w, h);
    const gr = g.createLinearGradient(0, 0, 0, 170); gr.addColorStop(0, "#f2c230"); gr.addColorStop(1, "#e08a20"); g.fillStyle = gr; g.fillRect(10, 10, w - 20, 160);
    g.fillStyle = "#fff6c0"; g.beginPath(); g.arc(w / 2, 95, 52, 0, 7); g.fill();
    g.fillStyle = "#2a1c14"; g.font = "900 34px Arial"; g.textAlign = "center"; g.fillText("APRIL 1995", w / 2, 210);
    g.font = "bold 17px Arial"; for (let i = 0; i < 30; i++) g.fillText(String(i + 1), 32 + (i % 7) * 32, 245 + Math.floor(i / 7) * 28);
    g.strokeStyle = "#d02a20"; g.lineWidth = 3; g.beginPath(); g.arc(32 + (18 % 7) * 32, 240 + Math.floor(18 / 7) * 28, 14, 0, 7); g.stroke(); });
  { const cal = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.45), new THREE.MeshStandardMaterial({ map: calTex, roughness: 0.8 }));
    cal.position.set(XL + 0.012, FY + 1.6, -11.6); cal.rotation.y = Math.PI / 2; cal.rotation.x = 0.02; kitchen.add(cal);
    B.add("darkMetal", place(clean(new THREE.CylinderGeometry(0.005, 0.005, 0.02, 6)), [XL + 0.01, FY + 1.84, -11.6], [0, 0, Math.PI / 2])); }

  // ---------------------------------------------------------------- LIVING
  // couch (built facing +Z, turned to face the TV at -Z)
  { const g = { fabric: [], fabricTeal: [], stand: [] }, w = 2.0, d = 0.9;
    g.fabric.push(box(w, 0.26, d, [0, 0.2, 0], { r: 0.05, seg: 3, tile: 0.5 }));
    for (const s of [-1, 1]) {
      g.fabric.push(box(0.22, 0.42, d, [s * (w / 2 - 0.11), 0.4, 0], { r: 0.07, seg: 3, tile: 0.5 }));
      const roll = roundedCylinder(0.13, d + 0.02, 0.05, 24); roll.rotateX(Math.PI / 2); boxUV(roll, 0.5); g.fabric.push(place(roll, [s * (w / 2 - 0.11), 0.6, 0.0]));
      g.fabric.push(box(0.98 * (w - 0.44) / 2, 0.16, d - 0.24, [s * (w - 0.44) / 4, 0.42, 0.1], { r: 0.06, seg: 3, tile: 0.5, tone: 0xf4f0ec }));
      const bk = box(0.98 * (w - 0.44) / 2, 0.5, 0.22, [s * (w - 0.44) / 4, 0.72, -d / 2 + 0.2], { r: 0.08, seg: 3, tile: 0.5, rot: [-0.18, 0, 0], tone: 0xf2eeea }); g.fabric.push(bk);
      for (const fz of [-1, 1]) g.stand.push(place(clean(lathe([[0, 0], [0.03, 0], [0.04, 0.07], [0, 0.07]], 12)), [s * (w / 2 - 0.08), 0, fz * (d / 2 - 0.08)]));
    }
    g.fabric.push(box(w, 0.6, 0.18, [0, 0.62, -d / 2 + 0.09], { r: 0.07, seg: 3, tile: 0.5 }));
    // piping along the seat front + buttons on the back cushions
    const pipe = new THREE.CylinderGeometry(0.012, 0.012, w - 0.44, 8); pipe.rotateZ(Math.PI / 2); g.fabric.push(place(clean(pipe, 0xd8d0c8), [0, 0.33, d / 2 + 0.002]));
    for (let i = 0; i < 4; i++) g.fabric.push(place(clean(new THREE.SphereGeometry(0.018, 10, 8), 0xc8c0b8), [-0.62 + i * 0.41, 0.8, -d / 2 + 0.31]));
    // teal throw blanket over the left arm + lemon-yellow pillow on the right
    g.fabricTeal.push(box(0.27, 0.035, d * 0.6, [-(w / 2 - 0.11), 0.745, 0.05], { r: 0.015, tile: 0.4 }));
    g.fabricTeal.push(box(0.03, 0.4, d * 0.6, [-(w / 2 + 0.01), 0.55, 0.05], { r: 0.012, tile: 0.4 }));
    const pil = box(0.4, 0.38, 0.13, [0.62, 0.66, -d / 2 + 0.36], { r: 0.06, seg: 3, tile: 0.4, rot: [-0.3, -0.2, 0.15], tone: 0xffffff });
    const rot = [0, Math.PI, 0], pos = [COUCH.x, FY, COUCH.z];
    for (const x of g.fabric) B.add("fabric", place(x, pos, rot));
    for (const x of g.fabricTeal) B.add("fabricTeal", place(x, pos, rot));
    for (const x of g.stand) B.add("stand", place(x, pos, rot));
    B.add("lemonCloth", place(pil, pos, rot));
  }
  M.lemonCloth = plain(0xf2c434, { roughness: 0.95, relief: 1.0, vertexColors: true });
  // rug (woven pattern, real thickness)
  const rugTex = canvas(512, 384, (g, w, h) => { g.fillStyle = "#2f4f7a"; g.fillRect(0, 0, w, h);
    g.strokeStyle = "#e8c070"; g.lineWidth = 14; g.strokeRect(22, 22, w - 44, h - 44); g.strokeStyle = "#b0553a"; g.lineWidth = 8; g.strokeRect(46, 46, w - 92, h - 92);
    g.fillStyle = "#b0553a"; for (let i = 0; i < 5; i++) { g.save(); g.translate(w / 2, h / 2); g.rotate(Math.PI / 4); g.fillRect(-60 + i * 4, -60 + i * 4, 120 - i * 8, 120 - i * 8); g.restore(); g.fillStyle = i % 2 ? "#b0553a" : "#e8c070"; }
    const rr = rng(4); for (let i = 0; i < 9000; i++) { g.fillStyle = `rgba(${rr() > 0.5 ? "255,255,255" : "0,0,0"},${rr() * 0.12})`; g.fillRect(rr() * w, rr() * h, 3, 1); } });
  { const rug = new THREE.Mesh(boxUVplane(2.6, 1.9), new THREE.MeshStandardMaterial({ map: rugTex, roughness: 1, normalMap: M.fabric.normalMap, normalScale: new THREE.Vector2(1.4, 1.4) }));
    rug.position.set(COUCH.x, FY + 0.012, -12.2); rug.receiveShadow = true; living.add(rug);
    B.add("plank", boxMM(COUCH.x - 1.3, FY, -13.15, COUCH.x + 1.3, FY + 0.01, -11.25, { tone: 0x2a2a3a })); }
  // coffee table + dressing (kept low and mid-room)
  { const x = COUCH.x, z = -12.15, h = 0.42;
    B.add("stand", boxMM(x - 0.6, FY + h - 0.04, z - 0.3, x + 0.6, FY + h, z + 0.3, { r: 0.012, tile: 0.8 }));
    B.add("stand", boxMM(x - 0.55, FY + 0.1, z - 0.26, x + 0.55, FY + 0.13, z + 0.26, { r: 0.008, tile: 0.8 }));
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) B.add("stand", box(0.05, h - 0.04, 0.05, [x + sx * 0.55, FY + (h - 0.04) / 2, z + sz * 0.25], { r: 0.01, grain: true }));
    B.add("paper", box(0.4, 0.05, 0.4, [x - 0.28, FY + h + 0.025, z + 0.02], { r: 0.006, tone: 0xd8c098, rot: [0, 0.2, 0] }));          // pizza box
    for (const [dx, dz, c] of [[0.2, -0.1, 0xd02a2a], [0.32, 0.08, 0x2a8ad0]]) B.add("chrome", place(clean(roundedCylinder(0.033, 0.12, 0.008, 20), c), [x + dx, FY + h + 0.06, z + dz]));
    B.add("plastic", box(0.05, 0.022, 0.18, [x + 0.05, FY + h + 0.011, z + 0.12], { r: 0.01, rot: [0, 0.5, 0] }));                        // remote
    B.add("paper", box(0.28, 0.01, 0.36, [x - 0.15, FY + 0.135, z], { r: 0.003, tone: 0xf0d080 }));                                         // magazines below
    B.add("paper", box(0.27, 0.012, 0.34, [x + 0.25, FY + 0.136, z + 0.02], { r: 0.003, tone: 0x80b0e0, rot: [0, 0.3, 0] }));
  }
  // TV stand (two shelves, VCR + tapes) + CRT TV with knobs, grille and rabbit ears
  const tvScreenGeo = new THREE.PlaneGeometry(0.5, 0.375, 8, 6);
  { const p = tvScreenGeo.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i) / 0.25, y = p.getY(i) / 0.1875; p.setZ(i, 0.018 * (1 - 0.5 * x * x - 0.5 * y * y)); } tvScreenGeo.computeVertexNormals(); }
  const tvScreenMat = new THREE.MeshStandardMaterial({ color: 0x0c1014, roughness: 0.12, metalness: 0.0, emissive: 0xffffff, emissiveIntensity: 1, envMapIntensity: 1.2 });
  const tvDefault = canvas(320, 240, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, "#2a5ac8"); gr.addColorStop(1, "#1a3488"); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.fillStyle = "#e8f0ff"; g.font = "bold 30px Courier New"; g.fillText("CH 3", 18, 42);
    for (let y = 0; y < h; y += 3) { g.fillStyle = "rgba(0,0,0,0.18)"; g.fillRect(0, y, w, 1); } });
  tvScreenMat.map = tvDefault; tvScreenMat.emissiveMap = tvDefault;
  const tvScreen = new THREE.Mesh(tvScreenGeo, tvScreenMat); tvScreen.name = "tvScreen";
  { const x = TV.x, z = TV.z, sh = TV.standH, sw = 1.06, sd = 0.48;
    B.add("stand", boxMM(x - sw / 2, FY + sh - 0.035, z - sd / 2, x + sw / 2, FY + sh, z + sd / 2, { r: 0.01, tile: 0.8 }));
    B.add("stand", boxMM(x - sw / 2, FY + 0.04, z - sd / 2, x + sw / 2, FY + 0.075, z + sd / 2, { r: 0.008, tile: 0.8 }));
    B.add("stand", boxMM(x - sw / 2, FY + 0.27, z - sd / 2 + 0.02, x + sw / 2 - 0.02, FY + 0.295, z + sd / 2 - 0.02, { r: 0.006, tile: 0.8 }));
    for (const s of [-1, 1]) B.add("stand", boxMM(x + s * sw / 2 - 0.035, FY + 0.04, z - sd / 2, x + s * sw / 2, FY + sh - 0.03, z + sd / 2, { r: 0.008, tile: 0.8 }));
    B.add("stand", boxMM(x - sw / 2, FY + 0.04, z - sd / 2, x + sw / 2, FY + sh - 0.03, z - sd / 2 + 0.02, { r: 0.004, tile: 0.8 }));
    for (const s of [-1, 1]) for (const fz of [-1, 1]) B.add("rubber", place(clean(new THREE.CylinderGeometry(0.02, 0.025, 0.04, 10)), [x + s * (sw / 2 - 0.05), FY + 0.02, z + fz * (sd / 2 - 0.05)]));
    // VCR on the middle shelf, tapes on the bottom
    B.add("plastic", box(0.43, 0.09, 0.32, [x - 0.15, FY + 0.34, z + 0.02], { r: 0.012, tone: 0x262526 }));
    B.add("rubber", box(0.24, 0.025, 0.005, [x - 0.2, FY + 0.35, z + 0.18], { r: 0.003 }));
    for (let i = 0; i < 6; i++) B.add("plastic", box(0.03, 0.2, 0.12, [x - 0.4 + i * 0.034, FY + 0.175, z + 0.05], { r: 0.004, tone: [0x2a2828, 0xf0f0f0, 0x2a2828, 0xd02a2a, 0x2a2828, 0x2a60c0][i] }));
    B.add("chrome", box(0.25, 0.14, 0.2, [x + 0.25, FY + 0.15, z + 0.04], { r: 0.02, tone: 0x8a8a90 }));            // cable box
    // TV body: front shell with a rounded bezel, tapered back, knobs, speaker slots
    const ty = FY + sh, tw = 0.68, th = 0.54, td = 0.5;
    B.add("plastic", box(tw, th, 0.22, [x, ty + th / 2, z + td / 2 - 0.11], { r: 0.05, seg: 3, tone: 0x4a4644 }));
    B.add("plastic", box(tw * 0.78, th * 0.8, 0.32, [x, ty + th / 2 + 0.01, z - 0.06], { r: 0.06, seg: 3, tone: 0x3a3836 }));
    B.add("plastic", box(tw * 0.5, th * 0.5, 0.1, [x, ty + th / 2 + 0.02, z - 0.22], { r: 0.04, tone: 0x3a3836 }));
    B.add("rubber", box(0.53, 0.4, 0.02, [x - 0.05, ty + th / 2 + 0.03, z + td / 2 - 0.005], { r: 0.02, tone: 0x141414 }));   // screen surround
    for (let i = 0; i < 2; i++) B.add("chrome", place(clean(roundedCylinder(0.018, 0.025, 0.006, 16), 0x8a8a8a), [x + 0.27, ty + th - 0.12 - i * 0.08, z + td / 2 + 0.01], [Math.PI / 2, 0, 0]));
    for (let i = 0; i < 6; i++) B.add("rubber", box(0.05, 0.007, 0.006, [x + 0.27, ty + 0.12 + i * 0.022, z + td / 2 + 0.001], { r: 0.002 }));
    B.add("plastic", box(tw + 0.01, 0.03, td - 0.02, [x, ty + 0.015, z + 0.0], { r: 0.012, tone: 0x2a2826 }));
    // rabbit ears
    B.add("plastic", place(clean(lathe([[0, 0], [0.06, 0], [0.055, 0.03], [0.02, 0.05], [0, 0.05]], 18), 0x2a2826), [x - 0.02, ty + th + 0.01, z - 0.08]));
    for (const s of [-1, 1]) B.add("chrome", clean(tube([V(x - 0.02, ty + th + 0.05, z - 0.08), V(x - 0.02 + s * 0.26, ty + th + 0.5, z - 0.12)], 0.0045, 4, 6)));
    tvScreen.position.set(x - 0.05, ty + th / 2 + 0.03, z + td / 2 + 0.006); living.add(tvScreen);
  }
  // low bookcase between the kitchen and the TV + boombox
  { const x0 = 0.15, x1 = 1.45, z0 = ZB, d = 0.32, h = 0.95;
    B.add("stand", boxMM(x0, FY, z0, x1, FY + 0.02, z0 + d)); B.add("stand", boxMM(x0, FY + h - 0.03, z0, x1, FY + h, z0 + d + 0.01, { r: 0.008 }));
    for (const x of [x0, (x0 + x1) / 2 - 0.01, x1 - 0.02]) B.add("stand", boxMM(x, FY, z0, x + 0.02, FY + h, z0 + d));
    B.add("stand", boxMM(x0, FY + 0.46, z0, x1, FY + 0.48, z0 + d));
    B.add("stand", boxMM(x0, FY, z0, x1, FY + h, z0 + 0.015));
    let bx = x0 + 0.03; const bc = [0xb03a2a, 0x2a5a8a, 0xe0c060, 0x3a7a4a, 0x8a3a6a, 0xd0d0c0, 0x2a2a2a];
    for (const [sy, xe] of [[FY + 0.02, x1 - 0.03], [FY + 0.48, (x0 + x1) / 2 - 0.02]]) { bx = sy > FY + 0.1 ? x0 + 0.03 : x0 + 0.03;
      while (bx < xe - 0.05) { const bw = 0.025 + r() * 0.035, bh = 0.24 + r() * 0.15;
        if (Math.abs(bx - ((x0 + x1) / 2)) > 0.03) B.add("paper", box(bw, bh, 0.2 + r() * 0.06, [bx + bw / 2, sy + bh / 2, z0 + 0.14], { r: 0.004, tone: bc[Math.floor(r() * bc.length)] }));
        bx += bw + 0.004; } }
    // records leaning in the right top shelf
    for (let i = 0; i < 5; i++) B.add("paper", box(0.008, 0.31, 0.31, [(x0 + x1) / 2 + 0.05 + i * 0.012, FY + 0.48 + 0.16, z0 + 0.17], { r: 0.002, rot: [0, 0, -0.12], tone: bc[(i + 2) % 7] }));
    // boombox on top
    const by = FY + h;
    B.add("plastic", box(0.56, 0.22, 0.16, [0.8, by + 0.11, z0 + 0.16], { r: 0.03, seg: 3, tone: 0x2a2a2e }));
    for (const s of [-1, 1]) { B.add("chrome", place(clean(new THREE.CylinderGeometry(0.075, 0.075, 0.012, 24), 0x55555a), [0.8 + s * 0.17, by + 0.11, z0 + 0.243], [Math.PI / 2, 0, 0]));
      B.add("rubber", place(clean(new THREE.CylinderGeometry(0.03, 0.03, 0.014, 16)), [0.8 + s * 0.17, by + 0.11, z0 + 0.246], [Math.PI / 2, 0, 0])); }
    B.add("chrome", clean(tube([V(0.58, by + 0.2, z0 + 0.16), V(0.6, by + 0.3, z0 + 0.16), V(1.0, by + 0.3, z0 + 0.16), V(1.02, by + 0.2, z0 + 0.16)], 0.01, 24, 8)));
  }
  // floor lamp next to the couch (warm night light; shade glows from inside)
  const LAMP = V(4.45, FY + 1.5, -10.25);
  { B.add("darkMetal", place(clean(roundedCylinder(0.16, 0.03, 0.01, 32)), [LAMP.x, FY + 0.015, LAMP.z]));
    B.add("brass", place(clean(new THREE.CylinderGeometry(0.012, 0.012, 1.42, 10)), [LAMP.x, FY + 0.73, LAMP.z]));
    B.add("brass", place(clean(lathe([[0, 0], [0.03, 0], [0.025, 0.04], [0, 0.05]], 14)), [LAMP.x, FY + 1.4, LAMP.z])); }
  const shadeM = new THREE.MeshStandardMaterial({ color: 0xf2dfb0, roughness: 0.9, side: THREE.DoubleSide, emissive: 0xffb060, emissiveIntensity: 0 });
  const shade = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.24, 0.32, 36, 1, true), shadeM); shade.position.copy(LAMP).add(V(0, 0.08, 0)); living.add(shade);
  const lampBulb = new THREE.Mesh(new THREE.SphereGeometry(0.04, 14, 10), new THREE.MeshStandardMaterial({ color: 0xfff2d8, emissive: 0xffd090, emissiveIntensity: 0 }));
  lampBulb.position.copy(LAMP); living.add(lampBulb);
  // posters on the right wall (framed, glass-free)
  const poster = (lines, bg1, bg2, art) => canvas(360, 512, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, bg1); gr.addColorStop(1, bg2);
    g.fillStyle = gr; g.fillRect(0, 0, w, h); art(g, w, h); g.textAlign = "center"; g.fillStyle = "#fff6dc"; g.strokeStyle = "#2a1c14"; g.lineWidth = 6;
    lines.forEach(([t, s, y]) => { g.font = `900 ${s}px "Arial Black", Arial`; g.strokeText(t, w / 2, y); g.fillText(t, w / 2, y); });
    const rr = rng(2); for (let i = 0; i < 2500; i++) { g.fillStyle = `rgba(255,255,255,${rr() * 0.06})`; g.fillRect(rr() * w, rr() * h, 2, 2); } });
  const p1 = poster([["GET RICH", 52, 80], ["QUICK!", 64, 150]], "#1f6a6a", "#0c2a3a", (g, w, h) => {
    g.fillStyle = "#f2c434"; g.beginPath(); g.arc(w / 2, h * 0.62, 95, 0, 7); g.fill(); g.fillStyle = "#2a1c14"; g.font = "900 120px Arial Black"; g.textAlign = "center"; g.fillText("$", w / 2, h * 0.62 + 42); });
  const p2 = poster([["THE", 34, 64], ["INVISIBLES", 46, 116], ["LIVE '95", 34, 470]], "#c0542a", "#3a1414", (g, w, h) => {
    g.strokeStyle = "rgba(255,240,200,0.9)"; g.lineWidth = 8; for (let i = 0; i < 3; i++) { g.beginPath(); g.arc(w / 2, h * 0.55, 50 + i * 34, 0, 7); g.stroke(); }
    g.setLineDash([12, 14]); g.beginPath(); g.arc(w / 2, h * 0.55, 150, 0, 7); g.stroke(); g.setLineDash([]); });
  for (const [z, tex, y] of [[-11.35, p1, FY + 1.55], [-13.15, p2, FY + 1.6]]) {
    B.add("darkMetal", boxMM(XR - 0.03, y - 0.42, z - 0.3, XR, y + 0.42, z + 0.3, { r: 0.008 }));
    const pl = new THREE.Mesh(new THREE.PlaneGeometry(0.54, 0.78), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.55 }));
    pl.position.set(XR - 0.032, y, z); pl.rotation.y = -Math.PI / 2; living.add(pl);
  }
  // ceiling fan (rotating group) over the living room + light switch by the door
  const fan = new THREE.Group(); fan.position.set(COUCH.x, CY, -12.1); living.add(fan);
  { B.add("darkMetal", place(clean(new THREE.CylinderGeometry(0.012, 0.012, 0.3, 8)), [fan.position.x, CY - 0.15, fan.position.z]));
    B.add("brass", place(clean(lathe([[0, 0], [0.09, 0], [0.11, -0.04], [0.1, -0.12], [0.06, -0.16], [0, -0.17]], 24)), [fan.position.x, CY - 0.28, fan.position.z]));
    const bl = []; for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI * 2;
      const g = box(0.52, 0.012, 0.13, [0.38, 0, 0], { r: 0.005, tile: 0.6, grain: true }); g.rotateX(0.12); g.rotateY(a); bl.push(g);
      const arm = box(0.16, 0.012, 0.03, [0.13, 0.01, 0], { r: 0.004 }); arm.rotateY(a); bl.push(arm); }
    const blades = new THREE.Mesh(mergeGeometries(bl.map((x) => clean(x))), M.stand); blades.position.y = -0.36; blades.castShadow = true; fan.add(blades); }
  B.add("trim", box(0.075, 0.12, 0.012, [DOOR.x0 - 0.2, FY + 1.22, ZB + 0.006], { r: 0.004 }));

  // ---------------------------------------------------------------- front door (hinged slab, frosted glass, police silhouettes)
  { const cw = 0.09;   // casing
    T(DOOR.x0 - cw, FY, ZB, DOOR.x0, DOOR.y1 + cw, ZB + 0.022); T(DOOR.x1, FY, ZB, DOOR.x1 + cw, DOOR.y1 + cw, ZB + 0.022);
    T(DOOR.x0 - cw - 0.02, DOOR.y1 + cw, ZB, DOOR.x1 + cw + 0.02, DOOR.y1 + cw + 0.04, ZB + 0.035);
    for (const x of [DOOR.x0 - cw, DOOR.x1 + cw]) B.add("trim", boxMM(x - 0.015, FY, ZB, x + 0.015, FY + 0.18, ZB + 0.03, { r: 0.005, tone: 0xe6dcc6 }));   // plinths
    T(DOOR.x0, FY, ZB - 0.2, DOOR.x0 + 0.02, DOOR.y1, ZB); T(DOOR.x1 - 0.02, FY, ZB - 0.2, DOOR.x1, DOOR.y1, ZB); T(DOOR.x0, DOOR.y1 - 0.02, ZB - 0.2, DOOR.x1, DOOR.y1, ZB);
    T(DOOR.x0, DOOR.y1 - 0.02, ZB - 0.1, DOOR.x1, DOOR.y1, ZB - 0.07);   // stop
    B.add("trim", boxMM(DOOR.x0, FY, ZB - 0.2, DOOR.x1, FY + 0.012, ZB, { tone: 0xc9a066 }));   // saddle
  }
  const door = new THREE.Group(); door.name = "frontDoor"; door.position.set(DOOR.x0 + 0.02, FY + 0.006, ZB - 0.05); group.add(door);
  const dw = DOOR.x1 - DOOR.x0 - 0.045, dh = DOOR.y1 - FY - 0.03, dd = 0.045;
  { const g = [], fr = 0.12, tone = 0xffffff, gx0 = 0.17, gx1 = dw - 0.17, gy0 = 1.18, gy1 = dh - 0.16;
    g.push(box(dw, 1.06, dd * 0.5, [dw / 2, 0.53, 0], { r: 0.004, tile: 0.9, grain: true }));
    for (const s of [0, 1]) g.push(box(fr, dh, dd, [s ? dw - fr / 2 : fr / 2, dh / 2, 0], { r: 0.008, tile: 0.9, grain: true }));
    for (const [y, h] of [[0.1, 0.2], [0.98, 0.16], [dh - 0.07, 0.14]]) g.push(box(dw - 2 * fr + 0.004, h, dd, [dw / 2, y, 0], { r: 0.008, tile: 0.9 }));
    g.push(box(0.1, 0.72, dd, [dw / 2, 0.56, 0], { r: 0.008, tile: 0.9, grain: true }));
    for (const s of [-1, 1]) g.push(box((dw - 2 * fr - 0.1) / 2 - 0.03, 0.66, dd * 0.75, [dw / 2 + s * ((dw - 2 * fr - 0.1) / 4 + 0.025), 0.56, 0], { r: 0.02, tile: 0.9, tone }));
    for (const x of [gx0 - 0.03, gx1 + 0.03]) g.push(box(0.06, gy1 - gy0 + 0.06, dd, [x, (gy0 + gy1) / 2, 0], { r: 0.008, tile: 0.9, grain: true }));
    g.push(box(gx1 - gx0 + 0.12, gy0 - 1.05, dd, [dw / 2, (gy0 + 1.05) / 2, 0], { r: 0.008 })); g.push(box(gx1 - gx0 + 0.12, 0.06, dd, [dw / 2, gy1 + 0.03, 0], { r: 0.008 }));
    // glazing beads around the glass (inside face)
    for (const [w, h, x, y] of [[gx1 - gx0 + 0.02, 0.02, dw / 2, gy0 + 0.0], [gx1 - gx0 + 0.02, 0.02, dw / 2, gy1], [0.02, gy1 - gy0, gx0, (gy0 + gy1) / 2], [0.02, gy1 - gy0, gx1, (gy0 + gy1) / 2]])
      g.push(box(w, h, 0.02, [x, y, dd / 2 + 0.008], { r: 0.006 }));
    const slab = new THREE.Mesh(mergeGeometries(g.map((x) => clean(x))), M.doorWood); slab.castShadow = true; slab.receiveShadow = true; door.add(slab);
    // knob + rose, deadbolt, chain
    const kx = dw - 0.08;
    for (const zz of [1, -1]) { const k = new THREE.Mesh(lathe([[0, 0], [0.032, 0], [0.034, 0.008], [0.012, 0.016], [0.012, 0.04], [0.03, 0.05], [0.032, 0.075], [0.02, 0.085], [0, 0.088]], 20), M.brass);
      k.rotation.x = zz * Math.PI / 2; k.position.set(kx, 0.95, zz * dd / 2); k.castShadow = true; door.add(k); }
    const db = new THREE.Mesh(roundedCylinder(0.03, 0.03, 0.008, 18), M.brass); db.rotation.x = Math.PI / 2; db.position.set(kx, 1.12, dd / 2 + 0.012); door.add(db);
    const chainPts = []; for (let i = 0; i <= 30; i++) { const t = i / 30; chainPts.push(V(kx - 0.03 - t * 0.2, 1.25 - Math.sin(t * Math.PI) * 0.05, dd / 2 + 0.012)); }
    const ch = new THREE.Mesh(tube(chainPts, 0.004, 40, 5), M.brass); door.add(ch);
    // frosted glass: emissive pebble texture (lit corridor behind) + soft silhouettes layer on it
    const frost = canvas(256, 512, (g2, w, h) => { const gr = g2.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, "#fff4e0"); gr.addColorStop(1, "#d8c8b0"); g2.fillStyle = gr; g2.fillRect(0, 0, w, h);
      const rr = rng(13); for (let i = 0; i < 1600; i++) { g2.fillStyle = `rgba(${rr() > 0.5 ? "255,255,255" : "120,100,80"},${0.05 + rr() * 0.1})`; g2.beginPath(); g2.arc(rr() * w, rr() * h, 2 + rr() * 6, 0, 7); g2.fill(); } });
    const glassFrostM = new THREE.MeshStandardMaterial({ color: 0xd8dfe2, map: frost, roughness: 0.35, emissive: 0xffd8a8, emissiveMap: frost, emissiveIntensity: 0.6, envMapIntensity: 0.8 });
    const gw = gx1 - gx0, gh = gy1 - gy0;
    const glass = new THREE.Mesh(new THREE.PlaneGeometry(gw, gh), glassFrostM); glass.position.set(dw / 2, (gy0 + gy1) / 2, 0.004); door.add(glass);
    const glassBack = glass.clone(); glassBack.rotation.y = Math.PI; glassBack.position.z = -0.004; door.add(glassBack);
    const silTex = canvas(256, 512, (g2, w, h) => { g2.filter = "blur(9px)"; g2.fillStyle = "#000";
      const fig = (cx, cy, s) => { g2.beginPath(); g2.ellipse(cx, cy + 250 * s, 105 * s, 190 * s, 0, 0, 7); g2.fill();             // shoulders/body
        g2.beginPath(); g2.ellipse(cx, cy + 40 * s, 50 * s, 58 * s, 0, 0, 7); g2.fill();                                            // head
        g2.fillRect(cx - 58 * s, cy - 30 * s, 116 * s, 38 * s);                                                                       // cap crown
        g2.beginPath(); g2.ellipse(cx + 18 * s, cy + 8 * s, 74 * s, 12 * s, 0, 0, 7); g2.fill(); };                                // brim
      fig(w * 0.32, h * 0.12, 0.85); g2.globalAlpha = 0.75; fig(w * 0.74, h * 0.2, 0.72); });
    const silM = new THREE.MeshBasicMaterial({ map: silTex, color: 0x1a1410, transparent: true, opacity: 0, depthWrite: false });
    const sil = new THREE.Mesh(new THREE.PlaneGeometry(gw, gh), silM); sil.position.set(dw / 2, (gy0 + gy1) / 2, 0.006); sil.renderOrder = 3; door.add(sil);
    door.userData = { glassFrostM, silM, sil, silBase: sil.position.clone(), knob: V(DOOR.x0 + 0.02 + kx, FY + 0.95, ZB - 0.05 + dd / 2 + 0.05) };
  }
  // corridor light (behind the door, lights the frosted glass at night)
  const hallLight = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.12), new THREE.MeshBasicMaterial({ color: 0xffe0b0 }));
  hallLight.position.set((DOOR.x0 + DOOR.x1) / 2, CY - 0.61, ZB - 0.8); hallLight.rotation.x = Math.PI / 2; group.add(hallLight);

  // ---------------------------------------------------------------- merge everything
  const meshes = B.build(group, M, { grout: { cast: false }, ceil: { cast: true } });
  // walls ARE cast-shadow so the sun only enters through the window
  // ---------------------------------------------------------------- lights
  const sun = new THREE.DirectionalLight(0xffffff, 1); sun.name = "aptSun";
  const sunTarget = new THREE.Object3D(); sunTarget.position.set(-0.6, FY, -12.0); group.add(sunTarget); sun.target = sunTarget; group.add(sun);
  if (O.shadows) { sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -7.5, right: 7.5, top: 6, bottom: -6, near: 1, far: 50 });
    sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.025; sun.shadow.radius = 3; }
  const hemi = new THREE.HemisphereLight(0xffffff, 0x000000, 1); hemi.position.set(0, CY, -12); group.add(hemi);
  const bounce = new THREE.PointLight(0xffffff, 1, 9, 2); bounce.position.set(0.2, FY + 0.9, -10.6); group.add(bounce);
  const tvPos = tvScreen.position.clone().add(V(0, 0, 0.12));
  const tv = new THREE.SpotLight(0x9cc2ff, 0, 0, 1.15, 1.0, 2); tv.position.copy(tvPos); tv.target.position.set(COUCH.x, FY + 0.7, COUCH.z + 0.4); group.add(tv, tv.target);
  if (O.shadows) { tv.castShadow = true; tv.shadow.mapSize.set(1024, 1024); tv.shadow.camera.near = 0.15; tv.shadow.camera.far = 9; tv.shadow.bias = -0.0005; tv.shadow.normalBias = 0.02; tv.shadow.radius = 5; }
  const lamp = new THREE.PointLight(0xffa860, 0, 0, 2); lamp.position.copy(LAMP).add(V(0, -0.02, 0)); group.add(lamp);
  const lampUp = new THREE.PointLight(0xffb070, 0, 3.0, 2); lampUp.position.copy(LAMP).add(V(0, 0.5, 0)); group.add(lampUp);

  // dust motes in the sun shaft (morning)
  const dust = O.dust ? createDust({ count: 140, min: [-1.6, FY + 0.3, -12.5], max: [1.4, FY + 2.2, -9.2], color: [1.0, 0.85, 0.6], intensity: 1.4, size: 0.012, seed: 17 }) : null;
  if (dust) group.add(dust);

  // ---------------------------------------------------------------- controls, time, update
  const C = { doorSilhouettes: 0, knock: 0, windowOpen: 1, tvGlow: null, fan: 0, lamp: null };
  let timeName = O.time, TT = APT_TIMES[O.time];
  const keyLightPos = new THREE.Vector3();
  function applyLights() {
    const tvOn = C.tvGlow ?? TT.tv, lampOn = C.lamp ?? TT.lamp;
    sun.color.set(TT.sun[0]); sun.intensity = TT.sun[1];
    const d = V(...TT.dir).normalize(); sun.position.copy(sunTarget.position).addScaledVector(d, 22);
    hemi.color.set(TT.hemi[0]); hemi.groundColor.set(TT.hemi[1]); hemi.intensity = TT.hemi[2];
    bounce.color.set(TT.bounce[0]); bounce.intensity = TT.bounce[1];
    tv.intensity = 9 * tvOn; tvScreenMat.emissiveIntensity = 0.04 + 1.25 * tvOn; tvScreenMat.color.set(tvOn > 0.05 ? 0x101418 : 0x0c1014);
    lamp.intensity = 2.6 * lampOn; lampUp.intensity = 1.2 * lampOn; shadeM.emissiveIntensity = 0.9 * lampOn; lampBulb.material.emissiveIntensity = 3 * lampOn;
    door.userData.glassFrostM.emissiveIntensity = 0.35 * TT.hall + 0.05; hallLight.material.color.setScalar(TT.hall);
    if (dust) dust.visible = TT.dust > 0;
    if (O.shadows) { sun.castShadow = TT.sun[1] > 0; tv.castShadow = tvOn > 0; }
    keyLightPos.copy(TT.sun[1] > 0 ? sun.position : tv.position);
  }
  function setTime(name) { if (!APT_TIMES[name]) throw new Error(`apartment.setTime: unknown "${name}" (morning|day|night)`); timeName = name; TT = APT_TIMES[name]; applyLights(); }
  function set(c = {}) { Object.assign(C, c); applyLights(); }
  function update(t = 0) {
    // window leaves
    const a = smooth(C.windowOpen) * 1.43;
    for (const p of leafPivots) p.rotation.y = p.userData.s * a;
    // knock: quick triple raps, deterministic in t, amplitude = knock
    const ph = (t * 1.3) % 1, rap = ph < 0.45 ? Math.max(0, Math.sin((ph / 0.15) * Math.PI)) : 0;
    const k = C.knock * rap;
    door.rotation.y = -k * 0.006; door.position.z = ZB - 0.05 - k * 0.004;
    const s = clamp01(C.doorSilhouettes); door.userData.silM.opacity = 0.85 * s;
    door.userData.sil.position.x = door.userData.silBase.x + Math.sin(t * 0.9) * 0.012 * s; door.userData.sil.position.y = door.userData.silBase.y + Math.sin(t * 1.7) * 0.004 * s - k * 0.006;
    fan.rotation.y = t * C.fan * Math.PI * 2;
    if (dust) dust.userData.update(t);
  }
  setTime(O.time); update(0);

  const anchors = {
    window: V(0, (WIN.y0 + WIN.y1) / 2, ZW + 0.2), windowInside: V(0, FY + 1.3, ZW - 0.7), windowOutside: V(0, (WIN.y0 + WIN.y1) / 2, ZW + 1.2),
    counterSpot: V(-1.75, FY, KB + 1.05), counterTop: V(-1.45, CTY, KB + 0.4), tableTop: V(TB.x, FY + TB.h, TB.z),
    couchSeat: V(COUCH.x + 0.39, FY + 0.5, COUCH.z - 0.1), couchSeatFloor: V(COUCH.x + 0.39, FY, COUCH.z - 0.55),
    tvScreen: tvScreen.getWorldPosition(new THREE.Vector3()), doorSpot: V((DOOR.x0 + DOOR.x1) / 2, FY, ZB + 0.9), doorKnob: door.userData.knob,
    lamp: LAMP.clone(), get keyLightPos() { return keyLightPos; },
    facing: { counterSpot: Math.PI, couchSeat: Math.PI, doorSpot: 0, tableTop: 0 },
    views: {
      kitchenWide: { pos: V(1.95, FY + 1.75, -9.55), target: V(-2.6, FY + 0.95, -13.6), fov: 62 },
      counterClose: { pos: V(-0.9, FY + 1.6, -12.35), target: V(-1.75, FY + 1.05, -14.55), fov: 50 },
      livingWide: { pos: V(-1.8, FY + 1.9, -10.2), target: V(2.9, FY + 0.85, -13.4), fov: 62 },
      tvClose: { pos: V(2.15, FY + 1.05, -13.2), target: V(2.25, FY + 0.83, -14.45), fov: 42 },
      couchFromTv: { pos: V(COUCH.x + 0.25, FY + 1.35, -14.05), target: V(COUCH.x + 0.3, FY + 0.85, COUCH.z - 0.1), fov: 64 },
      doorClose: { pos: V(2.9, FY + 1.5, -12.6), target: V(4.1, FY + 1.35, ZB), fov: 50 },
      windowFromInside: { pos: V(-0.5, FY + 1.5, -12.6), target: V(0, FY + 1.25, ZW), fov: 58 },
    },
  };
  return { group, anchors, update, set, setTime, get time() { return timeName; }, tvScreen, setTvTexture(tex) { tvScreenMat.map = tex; tvScreenMat.emissiveMap = tex; tvScreenMat.needsUpdate = true; },
    lights: { sun, hemi, bounce, tv, lamp, lampUp }, groups: { kitchen, living, door, windowLeaves: leaves, fan }, meshes };
}

function boxUVplane(w, h) { const g = new THREE.BoxGeometry(w, 0.012, h); const uv = g.attributes.uv; const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / w + 0.5, p.getZ(i) / h + 0.5); return g; }
