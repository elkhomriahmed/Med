// OFFICE_LOT (video 4): sunny-noon office parking lot + 3-storey office building + a separate stairwell (LAYOUT_v04.md).
// Owner: world agent A (world/lot). Units m, Y up, asphalt top y = 0.
//
//   const lot = await buildLot();  scene.add(lot.group);
//   lot.makeEnvironment(renderer, scene);   // sky-only PMREM env (blue sky + sun) -> glass/cars reflect the real sky.
//                                           // Use createLook(..., { hdri: false, grade: { exposure: lot.hint.exposure } }).
//   lot.set({ t });            // trees sway (pure function of t)
//   lot.update(t, camera);     // sky clouds + texel-snapped sun shadow that follows the camera
//   lot.anchors: heroBay, driverDoorSpot, entrance, coworkerSpot, stairTop, stairBottom {pos, yaw} (yaw 0 = facing +Z),
//     walkPath [Vector3], windowCenter (Vector3), views {lotWide, lotLow, carFromBuilding, windowFromLot, entrance, stairsDown, stairsBottom}
//   lot.keyLightPos (sun direction x 60 from the hero bay), lot.lights {key, hemi, room, stair[]}, lot.hint {exposure, hdri:false, envIntensity}
//
// Layout: facade front plane z = -14 (faces +Z), x -20.7..20.7, floors y 0.15 / 3.8 / 7.4, roof 11, parapet 11.86.
// Sidewalk z -14..-11 (top 0.15, kerb at z -11, ramp at x -1.5..1.5). Row A bays z -6.5..-1.5 (cars nose -Z), aisle z -1.5..3.5,
// row B z 3.5..8.5, tree strip z 9..11.5, lot kerb z 12, road z 14..21. Hero bay (2.5, 0, -4) EMPTY + its two neighbours.
// Coworker window x -4.2..-1.8, y 4.2..5.8 (clear glass at z -14.21) with a lit office x -5..-1, z -14.4..-17.6, floor 3.8.
// Stairwell (interior) x 58.8..61.2, z -4.4..6.4: top landing y 3.2 (z -4.4..-1.6), 18 steps down toward +Z, bottom landing y 0.
import * as THREE from "three";
import { mergeVertices } from "three/addons/utils/BufferGeometryUtils.js";
import { roundedBox, boxUV, grainUV, tint, clean, mergeGeometries, lathe, place, tube } from "../geometry.js";
import { buildHeroCar } from "../car/index.js";
import { pbr, plain, canvasTex, noiseNormal } from "../materials.js";
import { rng } from "../../shared/assets.js";
import { createExteriorSky } from "../exterior/sky.js";
import { FontLoader } from "three/addons/loaders/FontLoader.js";
import { TextGeometry } from "three/addons/geometries/TextGeometry.js";
import helvBold from "three/examples/fonts/helvetiker_bold.typeface.json";

const C = (h) => new THREE.Color(h);
const V = (x, y, z) => new THREE.Vector3(x, y, z);
export const SUN_DIR = V(-0.368, 0.743, 0.559).normalize();      // toward the sun: high, from front-left (+z / -x)
export const LOT_SKY = {
  zenith: [0.05, 0.21, 0.66], horizon: [0.34, 0.56, 0.84], haze: [0.58, 0.70, 0.86], hazeW: 0.05, hazeK: 0.5,
  sea: [0.12, 0.14, 0.16], seaH: [0.42, 0.50, 0.60], stars: 0, sunCol: [40, 38, 34], sunSize: 0.02, sunGlow: 0.7,
  sunDir: SUN_DIR.toArray(), moon: 0, clouds: 0.22, cloudLit: [1.9, 1.95, 2.0], cloudDark: [0.72, 0.8, 0.92],
};
const FACADE_Z = -14, F1 = 3.8, F2 = 7.4, ROOF = 11.0;
const HERO = V(2.5, 0, -4.0);
const ST = { x0: 58.8, x1: 61.2, z0: -5.4, z1: 8.4, top: 3.2, ceil: 6.6, zTop: -1.6, n: 18, run: 0.28 };
ST.rise = ST.top / ST.n; ST.zBot = ST.zTop + ST.n * ST.run;

function signTex(text, { bg = "#24323e", ink = "#eef4f8", w = 1024, h = 160, font = "Arial Black", sub = null, border = null } = {}) {
  return canvasTex(w, h, (g) => {
    g.fillStyle = bg; g.fillRect(0, 0, w, h); const r = rng(text.length + 7);
    for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "255,255,255" : "0,0,0"},${r() * 0.05})`; g.fillRect(r() * w, r() * h, 1 + r() * 24, 1); }
    if (border) { g.strokeStyle = border; g.lineWidth = h * 0.06; g.strokeRect(h * 0.08, h * 0.08, w - h * 0.16, h - h * 0.16); }
    g.textAlign = "center"; g.textBaseline = "middle"; g.fillStyle = ink;
    let size = h * (sub ? 0.5 : 0.62); g.font = `900 ${size}px "${font}", sans-serif`;
    while (g.measureText(text).width > w * 0.88) { size *= 0.94; g.font = `900 ${size}px "${font}", sans-serif`; }
    g.fillText(text, w / 2, sub ? h * 0.4 : h * 0.54);
    if (sub) { g.font = `bold ${h * 0.2}px "Arial", sans-serif`; g.fillText(sub, w / 2, h * 0.78); }
  });
}
function stopTex() {
  return canvasTex(512, 512, (g) => {
    const oct = (R, col) => { g.fillStyle = col; g.beginPath(); for (let i = 0; i < 8; i++) { const a = Math.PI / 8 + (i * Math.PI) / 4; g.lineTo(256 + R * Math.cos(a), 256 + R * Math.sin(a)); } g.closePath(); g.fill(); };
    g.fillStyle = "#c8ccd0"; g.fillRect(0, 0, 512, 512); oct(256, "#f4f4f2"); oct(236, "#c81e1e");
    g.fillStyle = "#ffffff"; g.textAlign = "center"; g.textBaseline = "middle"; g.font = `900 150px "Arial Black", sans-serif`; g.fillText("STOP", 256, 266);
  });
}
function stencilTex(text, { bg = "#d6dde3", ink = "#2c5f9e", w = 512, h = 512, size = 0.8 } = {}) {
  return canvasTex(w, h, (g) => {
    g.fillStyle = bg; g.fillRect(0, 0, w, h); g.fillStyle = ink; g.textAlign = "center"; g.textBaseline = "middle";
    g.font = `900 ${h * size}px "Arial Black", sans-serif`; g.fillText(text, w / 2, h * 0.54);
    const r = rng(5); g.globalCompositeOperation = "destination-out";
    for (let i = 0; i < 1500; i++) { g.fillStyle = `rgba(0,0,0,${r() * 0.35})`; g.fillRect(r() * w, r() * h, 2, 2); }
    g.globalCompositeOperation = "destination-over"; g.fillStyle = bg; g.fillRect(0, 0, w, h);
  });
}
function blobGeo(r, seed) {      // lumpy foliage blob
  let g = new THREE.IcosahedronGeometry(1, 3); g.deleteAttribute("uv"); g.deleteAttribute("normal"); g = mergeVertices(g);
  const p = g.attributes.position, ph = seed * 1.7;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const n = 1 + 0.15 * Math.sin(x * 5 + ph) * Math.sin(y * 6 + ph) * Math.sin(z * 5.5) + 0.08 * Math.sin(x * 13 + z * 11 + ph) + 0.05 * Math.sin(y * 19 + x * 7);
    p.setXYZ(i, x * n, y * n * 0.82, z * n); }
  g.computeVertexNormals(); g.scale(r, r, r); return g;
}

// ---------------------------------------------------------------- painted "clay set" materials (restyle 2026-11-24)
// Soft hand-painted textures (no photo scans): low-contrast mottling, soft rounded grooves in a blurred bump map,
// matte clay roughness. Colour comes from the map x vertex tint, so per-piece tones still vary.
function paintedTex(kind, seed = 1) {
  const S = 512, q = rng(seed);
  const blot = (g, n, rMin, rMax, rgb, aMin, aMax) => { for (let i = 0; i < n; i++) { const x = q() * S, y = q() * S, rr = rMin + q() * (rMax - rMin);
    const gr = g.createRadialGradient(x, y, 0, x, y, rr); gr.addColorStop(0, `rgba(${rgb},${aMin + q() * (aMax - aMin)})`); gr.addColorStop(1, `rgba(${rgb},0)`);
    g.fillStyle = gr; for (const dx of [-S, 0, S]) for (const dy of [-S, 0, S]) { if (x + dx + rr < 0 || x + dx - rr > S || y + dy + rr < 0 || y + dy - rr > S) continue;
      g.save(); g.translate(dx, dy); g.fillRect(x - rr, y - rr, rr * 2, rr * 2); g.restore(); } } };
  const base = { asphalt: "#5a6676", concrete: "#d7dde3", panel: "#ecdfc8", slab: "#cfd5db", block: "#e2e7ec", bark: "#7a5f4a" }[kind];
  const grid = (g) => { for (let r = 0; r <= 8; r++) { g.beginPath(); g.moveTo(0, r * 64); g.lineTo(S, r * 64); g.stroke(); }
    for (let r = 0; r < 8; r++) for (let c = 0; c <= 4; c++) { const x = c * 128 + (r % 2) * 64; g.beginPath(); g.moveTo(x, r * 64); g.lineTo(x, r * 64 + 64); g.stroke(); } };
  const map = canvasTex(S, S, (g) => {
    g.fillStyle = base; g.fillRect(0, 0, S, S);
    blot(g, 40, 40, 130, "255,255,255", 0.03, 0.07); blot(g, 40, 40, 130, "20,28,40", 0.03, 0.07);
    if (kind === "asphalt") { blot(g, 200, 4, 10, "235,240,248", 0.05, 0.12); blot(g, 160, 4, 11, "25,32,44", 0.05, 0.11); }
    if (kind === "panel" || kind === "concrete") { g.globalAlpha = 0.05; for (let i = 0; i < 70; i++) { g.fillStyle = q() > 0.5 ? "#ffffff" : "#5a6878"; g.fillRect(0, q() * S, S, 2 + q() * 6); } g.globalAlpha = 1; }
    if (kind === "block") { g.strokeStyle = "rgba(90,104,120,0.35)"; g.lineWidth = 7; g.filter = "blur(2px)"; grid(g); g.filter = "none"; }
    if (kind === "bark") { g.filter = "blur(1.5px)"; for (let i = 0; i < 46; i++) { g.strokeStyle = `rgba(${q() > 0.5 ? "190,150,115" : "70,50,38"},${0.25 + q() * 0.3})`; g.lineWidth = 2 + q() * 5;
      const x = q() * S; g.beginPath(); g.moveTo(x, 0); g.bezierCurveTo(x + (q() - 0.5) * 40, S * 0.33, x + (q() - 0.5) * 40, S * 0.66, x, S); g.stroke(); } g.filter = "none"; }
  });
  const bump = canvasTex(S, S, (g) => {
    g.fillStyle = "#808080"; g.fillRect(0, 0, S, S);
    blot(g, kind === "asphalt" ? 380 : 120, 3, 12, "255,255,255", 0.1, 0.3); blot(g, kind === "asphalt" ? 260 : 80, 3, 12, "0,0,0", 0.1, 0.25);
    if (kind === "block") { g.strokeStyle = "#202020"; g.lineWidth = 12; grid(g); }
    if (kind === "bark") for (let i = 0; i < 40; i++) { g.strokeStyle = q() > 0.5 ? "#c0c0c0" : "#404040"; g.lineWidth = 3 + q() * 6; const x = q() * S; g.beginPath(); g.moveTo(x, 0); g.lineTo(x + (q() - 0.5) * 30, S); g.stroke(); }
    g.filter = "blur(5px)"; g.drawImage(g.canvas, 0, 0); g.filter = "none";
  }, { srgb: false });
  for (const t of [map, bump]) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4; }
  return { map, bump };
}
function painted(kind, { roughness = 0.8, bumpScale = 1.2, seed = 1 } = {}) {
  const { map, bump } = paintedTex(kind, seed);
  return new THREE.MeshStandardMaterial({ color: 0xffffff, map, bumpMap: bump, bumpScale, roughness, metalness: 0, envMapIntensity: 0.7, vertexColors: true });
}
/** Smooth-shaded ExtrudeGeometry (ExtrudeGeometry is non-indexed = faceted on curves). */
function smoothGeo(g) { g.deleteAttribute("normal"); g.deleteAttribute("uv"); const m = mergeVertices(g, 1e-4); m.computeVertexNormals(); return m; }
/** Plan shape lying flat, extruded up from y0 to y1 with soft round edges (bevelOffset keeps the outline). */
function softPlan(shape, y0, y1, b) {
  const h = y1 - y0; b = Math.min(b, h * 0.48);
  const g = new THREE.ExtrudeGeometry(shape, { depth: Math.max(h - 2 * b, 0.001), bevelEnabled: true, bevelThickness: b, bevelSize: b, bevelOffset: -b, bevelSegments: 4, curveSegments: 10 });
  g.rotateX(-Math.PI / 2); g.translate(0, y0 + b, 0); return smoothGeo(g);
}
function roundRectShape(x0, z0, x1, z1, r) {
  const s = new THREE.Shape(); r = Math.min(r, (x1 - x0) / 2 - 1e-4, (z1 - z0) / 2 - 1e-4);
  const Y0 = -z1, Y1 = -z0;          // shape plane (x, -z): after rotateX(-PI/2) shape y maps to world -z
  s.moveTo(x0 + r, Y0); s.lineTo(x1 - r, Y0); s.absarc(x1 - r, Y0 + r, r, -Math.PI / 2, 0); s.lineTo(x1, Y1 - r); s.absarc(x1 - r, Y1 - r, r, 0, Math.PI / 2);
  s.lineTo(x0 + r, Y1); s.absarc(x0 + r, Y1 - r, r, Math.PI / 2, Math.PI); s.lineTo(x0, Y0 + r); s.absarc(x0 + r, Y0 + r, r, Math.PI, Math.PI * 1.5); return s;
}

export async function buildLot(opts = {}) {
  const O = { shadowFollow: true, shadowHalf: 30, shadowMap: 4096, seed: 41, ...opts };
  const r = rng(O.seed);
  const group = new THREE.Group(); group.name = "lot";

  // ---------------------------------------------------------------- materials (cool base; red only on small accents)
  const asphalt = painted("asphalt", { roughness: 0.85, bumpScale: 1.6, seed: 3 }), concrete = painted("concrete", { roughness: 0.78, seed: 5 }),
    panel = painted("panel", { roughness: 0.72, bumpScale: 0.8, seed: 7 }), slab = painted("slab", { roughness: 0.8, seed: 9 }),
    block = painted("block", { roughness: 0.8, bumpScale: 2.5, seed: 11 }), bark = painted("bark", { roughness: 0.8, bumpScale: 2, seed: 13 });
  const M = {
    asphalt, concrete, panel, slab, block, bark,
    core: plain("#56606c", { roughness: 0.85, relief: 0, vertexColors: true }),
    line: plain("#f2f5f7", { roughness: 0.7, relief: 0, vertexColors: true }),
    seal: plain("#3c4553", { roughness: 0.7, relief: 0, vertexColors: true }),
    paint: plain("#ffffff", { roughness: 0.62, relief: 0, vertexColors: true }),
    metal: plain("#ffffff", { roughness: 0.5, metalness: 0.25, relief: 0, vertexColors: true }),          // painted metal (satin clay)
    alu: plain("#ffffff", { roughness: 0.5, metalness: 0.2, relief: 0, vertexColors: true, envMapIntensity: 0.9 }),
    room: plain("#ffffff", { roughness: 0.88, relief: 0, vertexColors: true }),
    leaf: plain("#ffffff", { roughness: 0.8, relief: 0.35, vertexColors: true }),
    grass: plain("#ffffff", { roughness: 0.92, relief: 0.5, vertexColors: true }),
    rubber: plain("#16181c", { roughness: 0.85, relief: 0.3 }),
    carPaint: plain("#ffffff", { roughness: 0.22, metalness: 0.4, relief: 0.04, vertexColors: true, envMapIntensity: 1.2 }),
    carGlass: plain("#2a3a4c", { roughness: 0.05, metalness: 0.75, relief: 0, envMapIntensity: 1.5 }),
    tail: new THREE.MeshStandardMaterial({ color: C("#b01818"), emissive: C("#ff2010"), emissiveIntensity: 0.15, roughness: 0.25, vertexColors: true }),
    head: new THREE.MeshStandardMaterial({ color: C("#e8eef4"), roughness: 0.1, metalness: 0.3, vertexColors: true }),
    mirror: new THREE.MeshStandardMaterial({ color: C("#8fb0d2"), metalness: 0.35, roughness: 0.2, envMapIntensity: 1.1, vertexColors: true }),   // soft painted glass
    light: new THREE.MeshStandardMaterial({ color: C("#eef6ff"), emissive: C("#e4f0ff"), emissiveIntensity: 1.3, roughness: 0.4, vertexColors: true }),
  };
  const clearGlass = new THREE.MeshStandardMaterial({ color: C("#d8e6f2"), roughness: 0.03, metalness: 0.0, transparent: true, opacity: 0.1, envMapIntensity: 0.35, depthWrite: false });
  const lobbyGlass = new THREE.MeshStandardMaterial({ color: C("#b8cde0"), roughness: 0.03, metalness: 0.2, transparent: true, opacity: 0.32, envMapIntensity: 1.3, depthWrite: false });
  const B = Object.fromEntries(Object.keys(M).map((k) => [k, []]));
  const extra = [];

  const piece = (k, g, pos = [0, 0, 0], rot = [0, 0, 0], { uv = "box", tile = 1.5, color = 0xffffff, jitter = 0 } = {}) => {
    if (uv === "box") boxUV(g, tile, [r() * 7, r() * 7]); else if (uv === "grain") grainUV(g, tile, [r() * 7, r() * 7]);
    const c = C(color); if (jitter) c.multiplyScalar(1 - jitter / 2 + r() * jitter);
    tint(g, c); place(g, pos, rot); B[k].push(g); return g;
  };
  /** Bevelled box from min/max corners. */
  // clay rule: every block gets a bevel of at least `soft` x its smallest side (capped at maxR) -> no razor edges anywhere
  const fb = (k, x0, y0, z0, x1, y1, z1, { rr = 0.01, soft = 0.3, maxR = 0.16, ...o } = {}) => {
    const md = Math.min(x1 - x0, y1 - y0, z1 - z0), r2 = Math.max(rr, Math.min(soft * md, maxR));
    return piece(k, roundedBox(x1 - x0, y1 - y0, z1 - z0, r2, r2 > 0.012 ? 3 : 2), [(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2], [0, 0, 0], o); };
  /** Painted strip with rounded ends (bay lines, crosswalk bars, dashes): raised, soft edges. */
  const strip = (k, x0, y0, z0, x1, y1, z1, o = {}) => { const w = Math.min(x1 - x0, z1 - z0);
    return piece(k, softPlan(roundRectShape(x0, z0, x1, z1, w * 0.5), y0, y1, 0.008), [0, 0, 0], [0, 0, 0], { tile: 1, ...o }); };
  /** Kerb run in ~1 m stones with 12 mm joints (along the longer axis). */
  const kerb = (x0, y0, z0, x1, y1, z1) => { const ax = (x1 - x0) >= (z1 - z0), L = ax ? x1 - x0 : z1 - z0, n = Math.max(1, Math.round(L / 1.0)), st = L / n;
    for (let i = 0; i < n; i++) { const a = (ax ? x0 : z0) + i * st + (i ? 0.006 : 0), b = (ax ? x0 : z0) + (i + 1) * st - (i < n - 1 ? 0.006 : 0);
      if (ax) fb("concrete", a, y0, z0, b, y1, z1, { soft: 0.4, tile: 1.2, jitter: 0.1 }); else fb("concrete", x0, y0, a, x1, y1, b, { soft: 0.4, tile: 1.2, jitter: 0.1 }); } };
  // worn paint (speckled map on every line), dappled canopy shadows (alpha-tested depth), oil/tyre decal atlas, office room-card atlas
  M.line.map = canvasTex(256, 256, (g) => { g.fillStyle = "#ffffff"; g.fillRect(0, 0, 256, 256); const q = rng(31);
    for (let i = 0; i < 1400; i++) { g.fillStyle = `rgba(70,76,84,${0.2 + q() * 0.6})`; g.fillRect(q() * 256, q() * 256, 1 + q() * 6, 1 + q() * 3); }
    for (let i = 0; i < 14; i++) { g.fillStyle = `rgba(80,86,94,${0.3 + q() * 0.4})`; g.beginPath(); g.ellipse(q() * 256, q() * 256, 8 + q() * 30, 4 + q() * 12, q() * 3, 0, 7); g.fill(); } });
  M.line.map.wrapS = M.line.map.wrapT = THREE.RepeatWrapping;
  M.line.map = null;                       // clay look: clean painted strips (no worn-paint speckle)
  const dap = canvasTex(256, 256, (g) => { g.fillStyle = "#fff"; g.fillRect(0, 0, 256, 256); const q = rng(77); g.fillStyle = "#000";
    for (let i = 0; i < 140; i++) { g.beginPath(); g.arc(q() * 256, q() * 256, 3 + q() * 10, 0, 7); g.fill(); } }, { srgb: false });
  dap.wrapS = dap.wrapT = THREE.RepeatWrapping;
  const dapDepth = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, alphaMap: dap, alphaTest: 0.5 });
  const decalTex = canvasTex(512, 256, (g) => { g.clearRect(0, 0, 512, 256); const q = rng(19);
    for (let i = 0; i < 40; i++) { const gr = g.createRadialGradient(128 + (q() - 0.5) * 90, 128 + (q() - 0.5) * 90, 0, 128, 128, 20 + q() * 50);
      gr.addColorStop(0, `rgba(10,12,16,${0.15 + q() * 0.2})`); gr.addColorStop(1, "rgba(10,12,16,0)"); g.fillStyle = gr; g.fillRect(0, 0, 256, 256); }
    for (const x of [300, 330, 440, 470]) for (let k = 0; k < 30; k++) { g.fillStyle = `rgba(12,14,18,${q() * 0.12})`; g.fillRect(x + (q() - 0.5) * 8, q() * 256, 12 + q() * 8, 10 + q() * 60); } });
  const decalMat = new THREE.MeshStandardMaterial({ map: decalTex, transparent: true, depthWrite: false, roughness: 0.3, metalness: 0.1, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  const decals = [];
  const decal = (x, z, w, d, cell, rot = 0) => { const g = new THREE.PlaneGeometry(w, d); const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setX(i, (cell + uv.getX(i)) / 2);
    g.rotateX(-Math.PI / 2); g.rotateY(rot); g.translate(x, 0.0015, z); decals.push(g); };
  const cardTex = canvasTex(768, 256, (g) => { const q = rng(23);
    const back = (i, a, b) => { const gr = g.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, a); gr.addColorStop(1, b); g.fillStyle = gr; g.fillRect(i * 256, 0, 256, 256); };
    back(0, "#dfe6ee", "#b8c4d0"); for (let y = 4; y < 256; y += 14) { g.fillStyle = "rgba(120,134,150,0.55)"; g.fillRect(4, y, 248, 3); }
    back(1, "#e8eef4", "#9aa8b6"); { const x = 256; g.fillStyle = "#f8fbff"; g.fillRect(x + 40, 8, 176, 10); g.fillStyle = "#3a4652"; g.fillRect(x + 30, 170, 200, 14);
      g.fillStyle = "#1c232a"; g.fillRect(x + 70, 120, 60, 44); g.fillRect(x + 150, 126, 46, 38); g.fillStyle = "#4e8a58"; for (let k = 0; k < 7; k++) { g.beginPath(); g.ellipse(x + 220 + q() * 20, 120 + q() * 50, 10, 22, q() * 3, 0, 7); g.fill(); }
      g.fillStyle = "#2c5f9e"; g.fillRect(x + 20, 60, 50, 40); }
    back(2, "#e2e9f0", "#a4b2c0"); { const x = 512;
      g.fillStyle = "#c8d2dc"; g.fillRect(x, 0, 256, 112); g.fillStyle = "rgba(110,124,140,0.5)"; for (let y = 6; y < 110; y += 12) g.fillRect(x, y, 256, 3);
      g.fillStyle = "#3a4652"; g.fillRect(x + 20, 190, 210, 12); g.fillStyle = "#1c232a"; g.fillRect(x + 100, 140, 56, 46); } });
  const cardMat = new THREE.MeshStandardMaterial({ map: cardTex, emissiveMap: cardTex, emissive: C("#ffffff"), emissiveIntensity: 0.12, roughness: 0.8, color: C("#c8d2dc") });
  const cardGlass = new THREE.MeshStandardMaterial({ color: C("#b8cde0"), roughness: 0.03, metalness: 0.3, transparent: true, opacity: 0.45, envMapIntensity: 1.1, depthWrite: false });
  const cards = [], cardG = [], cardGlassG = [];
  const texPlane = (tex, w, h, pos, rotY = 0, { emissive = 0, rough = 0.5 } = {}) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: tex, roughness: rough,
      emissive: emissive ? C("#ffffff") : C("#000000"), emissiveMap: emissive ? tex : null, emissiveIntensity: emissive }));
    m.position.set(...pos); m.rotation.y = rotY; m.receiveShadow = true; extra.push(m); return m;
  };

  // ================================================================ GROUND: lot asphalt, lines, kerbs, islands, sidewalk
  // asphalt in patches (tone variation) + raised crack-seal strips over the seams
  { const xs = [-17, -8, 1, 9, 17], zs = [-11, -2, 5, 12];
    for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) fb("asphalt", xs[i], -0.25, zs[j], xs[i + 1], 0, zs[j + 1], { rr: 0.004, tile: 4, color: "#ffffff", jitter: 0.12 });
    for (const x of xs.slice(1, -1)) fb("seal", x - 0.035, -0.02, -11, x + 0.035, 0.004, 12, { rr: 0.003 });
    for (const z of zs.slice(1, -1)) fb("seal", -17, -0.021, z - 0.035, 17, 0.0035, z + 0.035, { rr: 0.003 });
    for (let k = 0; k < 9; k++) { const x = -15 + r() * 30, z = -10 + r() * 21, pts = [];                     // wandering crack seals
      for (let s = 0; s < 6; s++) pts.push(V(x + s * 0.5 + (r() - 0.5) * 0.3, 0.001, z + (r() - 0.5) * 0.9));
      piece("seal", tube(pts, 0.018, 24, 5), [0, 0, 0], [0, 0, 0], { uv: "box" }).scale(1, 0.25, 1); }
  }
  // bays: row A (z -6.5..-1.5, nose -z), row B (z 3.5..8.5). Lines 12 cm wide, top 4 mm above the asphalt.
  const BAYX = [-10.5, -7.9, -5.3, -2.7, -0.1, 2.5, 5.1, 7.7, 10.3, 12.9];
  const lineTop = 0.014, lineBot = -0.012;
  for (const [za, zb, headZ] of [[-6.44, -1.5, -6.5], [3.5, 8.44, 8.5]]) {
    for (let i = 0; i <= BAYX.length; i++) { const x = (i < BAYX.length ? BAYX[i] : BAYX[BAYX.length - 1] + 2.6) - 1.3;
      strip("line", x - 0.07, lineBot, za, x + 0.07, lineTop, zb, { rr: 0.003, jitter: 0.06 }); }
    const hz0 = headZ < 0 ? headZ - 0.06 : headZ - 0.06;
    strip("line", BAYX[0] - 1.36, lineBot, hz0 - 0.01, BAYX[BAYX.length - 1] + 1.36, lineTop, hz0 + 0.13, { rr: 0.003, jitter: 0.06 });
  }
  // wheel stops (not in the hero bay or its neighbours)
  for (const x of BAYX) { if (Math.abs(x - HERO.x) < 3) continue;
    fb("concrete", x - 0.9, 0, -6.24, x + 0.9, 0.14, -5.96, { soft: 0.48, tile: 1 });
    fb("concrete", x - 0.9, 0, 7.96, x + 0.9, 0.14, 8.24, { soft: 0.48, tile: 1 }); }
  // crosswalk to the entrance (bars along z), aisle arrows
  for (let k = 0; k < 4; k++) { const x = -1.05 + k * 0.7; strip("line", x - 0.17, lineBot, -10.8, x + 0.17, lineTop, -6.9, { rr: 0.003, jitter: 0.05 }); }
  const arrow = (x, z, dir) => { const s = new THREE.Shape(); s.moveTo(-0.15, -1.0); s.lineTo(0.15, -1.0); s.lineTo(0.15, 0.2); s.lineTo(0.4, 0.2); s.lineTo(0, 0.9); s.lineTo(-0.4, 0.2); s.lineTo(-0.15, 0.2); s.lineTo(-0.15, -1.0);
    const g = softPlan(s, 0, lineTop - lineBot, 0.008); g.rotateY(dir); g.translate(x, lineBot, z); piece("line", g, [0, 0, 0], [0, 0, 0], { tile: 1 }); };
  arrow(-6, 1.0, Math.PI / 2); arrow(8, 1.0, Math.PI / 2); arrow(-9, -8.8, -Math.PI / 2); arrow(9, -8.8, -Math.PI / 2);
  // islands with kerbs + grass + mulch (tree islands at row ends, long strip along z 9..11.5)
  const island = (x0, z0, x1, z1) => {
    const t = 0.18, h = 0.16;
    kerb(x0, -0.05, z0, x1, h, z0 + t); kerb(x0, -0.05, z1 - t, x1, h, z1);
    kerb(x0, -0.05, z0 + t, x0 + t, h, z1 - t); kerb(x1 - t, -0.05, z0 + t, x1, h, z1 - t);
    fb("grass", x0 + t - 0.03, -0.05, z0 + t - 0.03, x1 - t + 0.03, 0.12, z1 - t + 0.03, { rr: 0.02, tile: 0.8, color: "#6a9a58", jitter: 0.1 });
    for (let k = 0; k < Math.round((x1 - x0) * (z1 - z0) * 1.2); k++) {          // shrub tufts for relief
      const g = blobGeo(0.14 + r() * 0.16, k + x0); piece("leaf", g, [x0 + 0.35 + r() * (x1 - x0 - 0.7), 0.16, z0 + 0.35 + r() * (z1 - z0 - 0.7)], [0, 0, 0], { tile: 0.6, color: ["#4e8a58", "#5a9660", "#447c50"][k % 3], jitter: 0.15 }); }
  };
  island(-16.4, -6.5, -14.0, -1.5); island(14.2, -6.5, 16.6, -1.5); island(-16.4, 3.5, -14.0, 8.5); island(14.2, 3.5, 16.6, 8.5);
  island(-16.4, 9.2, 16.6, 11.4);
  // lot edge kerb (z 12) + side kerbs; grass verge, sidewalk + road beyond
  kerb(-17.2, -0.1, 12.0, 17.2, 0.16, 12.22);
  for (const s of [-1, 1]) kerb(s > 0 ? 17.0 : -17.22, -0.1, -11.0, s > 0 ? 17.22 : -17.0, 0.16, 12.0);
  fb("slab", -60, -0.2, 12.6, 80, 0.06, 14.2, { rr: 0.01, tile: 3 });                            // public sidewalk
  fb("asphalt", -60, -0.3, 14.2, 80, -0.03, 21.5, { rr: 0.004, tile: 4, color: "#d8dde4" });   // road
  for (let x = -58; x < 78; x += 6) strip("line", x, -0.045, 17.78, x + 3, -0.016, 17.94, { rr: 0.003 });
  fb("slab", -60, -0.2, 21.5, 80, 0.06, 23.0, { rr: 0.01, tile: 3 });
  // building sidewalk: base + real slabs (1.5 m, 2 cm joints) + kerb at z -11 + ramp at the crosswalk
  fb("core", -21, -0.25, -14.6, 21, 0.13, -11.19, { rr: 0.005 });
  for (let x = -21; x < 20.99; x += 1.5) for (let z = -11.2; z > -14.59; z -= 1.5) {
    if (Math.abs(x + 0.75) < 1.5 && z > -11.3) continue;                                        // ramp row
    const z1 = Math.max(z - 1.5, -14.6);
    fb("slab", x + 0.01, 0.1, z1 + 0.01, x + 1.49, 0.15, z - 0.01, { rr: 0.008, tile: 1.5, jitter: 0.1 }); }
  kerb(-21, -0.1, -11.18, -1.5, 0.165, -11.0); kerb(1.5, -0.1, -11.18, 21, 0.165, -11.0);
  { const g = new THREE.BoxGeometry(3, 1, 1.7); const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) { if (p.getY(i) > 0) { const k = (0.85 - p.getZ(i)) / 1.7; p.setY(i, 0.005 + 0.145 * k); } else p.setY(i, -0.1); }
    g.computeVertexNormals(); piece("slab", g, [0, 0, -11.85], [0, 0, 0], { tile: 1.5 }); }
  // building-side tree pits
  const treeSpots = [[-15.2, -5.4, 1.0], [15.4, -5.4, 0.95], [-15.2, 4.6, 1.05], [15.4, 4.6, 1.0], [-11, 10.3, 0.95], [-3.5, 10.3, 0.85], [4.5, 10.3, 0.9], [11.5, 10.3, 0.88]];

  // ================================================================ OFFICE BUILDING (facade z -14, faces +Z)
  const PIL = [-20.35, -13.65, -6.95, 6.95, 13.65, 20.35];
  const bays = [[-20.0, -14.0], [-13.3, -7.3], [-6.6, 6.6], [7.3, 13.3], [14.0, 20.0]];
  const glassBands = [[4.2, 5.8], [7.8, 9.4]];
  const spandrels = [[3.3, 4.2], [5.8, 7.8], [9.4, 11.0], [11.0, 11.7]];
  // pilasters: core + stacked blocks with reveals
  for (const cx of PIL) { fb("core", cx - 0.33, 0.1, -14.44, cx + 0.33, 11.7, -13.79, { rr: 0.005 });
    for (let y = 0.1; y < 11.69; y += 1.8) fb("panel", cx - 0.35, y + 0.012, -14.45, cx + 0.35, Math.min(y + 1.8, 11.7) - 0.012, -13.75, { rr: 0.02, tile: 2, jitter: 0.05 }); }
  // spandrel panels (2.4 m, 2 cm joints) over a dark backing
  const spandrel = (xa, xb, ya, yb) => { fb("core", xa, ya, -14.42, xb, yb, -14.24, { rr: 0.004 });
    const n = Math.max(1, Math.round((xb - xa) / 2.4)), w = (xb - xa) / n;
    for (let i = 0; i < n; i++) fb("panel", xa + i * w + 0.01, ya + 0.01, -14.3, xa + (i + 1) * w - 0.01, yb - 0.01, -14.0, { soft: 0.36, tile: 2.2, jitter: 0.06 }); };
  for (const [xa, xb] of bays) for (const [ya, yb] of spandrels) spandrel(xa - 0.02, xb + 0.02, ya, yb);
  // sills under every glass band (proud ledge with a drip)
  for (const [xa, xb] of bays) for (const [ya] of glassBands) fb("panel", xa - 0.05, ya - 0.16, -14.12, xb + 0.05, ya + 0.02, -13.78, { soft: 0.45, tile: 2, color: "#f4f6f8" });
  // ribbon glazing: mullions every 1.2 m, transoms, mirror panes (steel-blue, sky reflections)
  const COW = { x0: -4.2, x1: -1.8, y0: 4.2, y1: 5.8 };
  const band = (xa, xb, ya, yb, { skip = [], clear = null, panes = true } = {}) => {
    fb("alu", xa, ya, -14.3, xb, ya + 0.13, -14.02, { soft: 0.45, color: "#f1f4f7" });
    fb("alu", xa, yb - 0.13, -14.3, xb, yb, -14.02, { soft: 0.45, color: "#f1f4f7" });
    const n = Math.round((xb - xa) / 1.2), bs = [];
    for (let i = 0; i <= n; i++) bs.push(xa + i * ((xb - xa) / n));
    for (const x of bs) if (!skip.some((s) => Math.abs(s - x) < 0.01)) fb("alu", x - 0.075, ya, -14.31, x + 0.075, yb, -14.01, { soft: 0.45, color: "#f1f4f7" });
    if (!panes) return;
    for (let i = 0; i < n; i++) { const a = bs[i], b = bs[i + 1], mid = (a + b) / 2;
      if (clear && mid > clear.x0 && mid < clear.x1) continue;
      if (ya > 4 && !(ya < 5 && b > -5.6 && a < -0.4) && r() < 0.2) { cards.push([a, b, ya, yb]); continue; }
      fb("mirror", a + 0.06, ya + 0.1, -14.22, b - 0.06, yb - 0.1, -14.2, { rr: 0.003, color: new THREE.Color(0.88 + r() * 0.14, 0.92 + r() * 0.1, 1) }); }
  };
  for (const [xa, xb] of bays) for (const [ya, yb] of glassBands) {
    const isCow = xa < COW.x0 && xb > COW.x1 && ya === COW.y0;
    band(xa, xb, ya, yb, isCow ? { skip: [-3.0], clear: COW } : {});
    // deep vertical fins on the mullions (not at the bay ends, not framing the coworker window)
    const n = Math.round((xb - xa) / 1.2);
    for (let i = 1; i < n; i++) { const x = xa + i * ((xb - xa) / n); if (isCow && (Math.abs(x - COW.x0) < 0.7 || Math.abs(x - COW.x1) < 0.7 || Math.abs(x + 3) < 0.01)) continue;
      void x; }   // (thin deep fins removed: not in the clay style)
  }
  // room cards: shallow lit offices / blinds behind some panes (back = atlas cell, sides = room colour)
  for (const [a, b, ya, yb] of cards) { const x0 = a + 0.036, x1 = b - 0.036, y0 = ya + 0.05, y1 = yb - 0.05, zb = -15.0, zf = -14.28, d = zf - zb, cell = Math.floor(r() * 3);
    const bk = new THREE.PlaneGeometry(x1 - x0, y1 - y0); const uv = bk.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setX(i, (cell + 0.04 + uv.getX(i) * 0.92) / 3);
    bk.translate((x0 + x1) / 2, (y0 + y1) / 2, zb); cardG.push(bk);
    const side = (rot, pos, w, h) => piece("room", new THREE.PlaneGeometry(w, h), pos, rot, { color: "#b8c4d0" });
    side([0, Math.PI / 2, 0], [x0, (y0 + y1) / 2, zb + d / 2], d, y1 - y0); side([0, -Math.PI / 2, 0], [x1, (y0 + y1) / 2, zb + d / 2], d, y1 - y0);
    side([Math.PI / 2, 0, 0], [(x0 + x1) / 2, y1, zb + d / 2], x1 - x0, d); side([-Math.PI / 2, 0, 0], [(x0 + x1) / 2, y0, zb + d / 2], x1 - x0, d);
    const gl = new THREE.PlaneGeometry(b - a - 0.06, yb - ya - 0.08); gl.translate((a + b) / 2, (ya + yb) / 2, -14.21); cardGlassG.push(gl); }
  // ground floor: side bays = concrete base + mirror band; centre bay = lobby glass + doors
  for (const [xa, xb] of bays) { if (xa < 0 && xb > 0) continue;
    fb("core", xa - 0.02, 0.1, -14.42, xb + 0.02, 0.9, -14.24, { rr: 0.004 });
    const n = Math.round((xb - xa) / 2.4), w = (xb - xa) / n; for (let i = 0; i < n; i++) fb("panel", xa + i * w + 0.01, 0.1, -14.3, xa + (i + 1) * w - 0.01, 0.9, -14.0, { rr: 0.015, tile: 2.2, jitter: 0.06 });
    fb("panel", xa - 0.05, 0.78, -14.12, xb + 0.05, 0.94, -13.8, { soft: 0.45, color: "#f4f6f8" });
    band(xa, xb, 0.9, 3.3); }
  // lobby (centre bay): transparent glazing x -6.6..6.6, y 0.1..3.3, doorway x -1.8..1.8
  { const xa = -6.6, xb = 6.6;
    fb("alu", xa, 0.1, -14.3, xb, 0.24, -14.02, { soft: 0.45, color: "#f1f4f7" }); fb("alu", xa, 3.17, -14.3, xb, 3.3, -14.02, { soft: 0.45, color: "#f1f4f7" });
    for (let i = 0; i <= 11; i++) { const x = xa + i * 1.2; if (x > -1.85 && x < 1.85) continue; fb("alu", x - 0.075, 0.1, -14.31, x + 0.075, 3.3, -14.01, { soft: 0.45, color: "#f1f4f7" }); }
    const lg = []; const pane = (x0, y0, x1, y1, z = -14.21) => { const g = new THREE.PlaneGeometry(x1 - x0, y1 - y0); g.translate((x0 + x1) / 2, (y0 + y1) / 2, z); lg.push(g); };
    for (let i = 0; i < 11; i++) { const a = xa + i * 1.2, b = a + 1.2; if (b > -1.7 && a < 1.7) continue; pane(a + 0.03, 0.16, b - 0.03, 3.25); }
    // doorway: posts, header, sidelights, transom, two leaves with push bars
    for (const x of [-1.8, -1.0, 1.0, 1.8]) fb("alu", x - 0.08, 0.1, -14.31, x + 0.08, 3.3, -14.0, { soft: 0.45, color: "#2f5d8a" });
    fb("alu", -1.88, 2.52, -14.31, 1.88, 2.7, -14.0, { soft: 0.45, color: "#2f5d8a" });
    pane(-1.76, 0.16, -1.04, 2.56); pane(1.04, 0.16, 1.76, 2.56); pane(-1.76, 2.66, 1.76, 3.25);
    for (const s of [-1, 1]) { const x0 = s < 0 ? -0.96 : 0.01, x1 = s < 0 ? -0.01 : 0.96;
      fb("alu", x0, 0.12, -14.22, x1, 0.3, -14.1, { soft: 0.45, color: "#2f5d8a" }); fb("alu", x0, 2.38, -14.22, x1, 2.52, -14.1, { soft: 0.45, color: "#2f5d8a" });
      fb("alu", x0, 0.12, -14.22, x0 + 0.11, 2.52, -14.1, { soft: 0.45, color: "#2f5d8a" }); fb("alu", x1 - 0.11, 0.12, -14.22, x1, 2.52, -14.1, { soft: 0.45, color: "#2f5d8a" });
      pane(x0 + 0.1, 0.28, x1 - 0.1, 2.4, -14.165);
      piece("metal", tube([V(s * 0.12, 1.05, -14.08), V(s * 0.12, 1.05, -14.0), V(s * 0.8, 1.05, -14.0), V(s * 0.8, 1.05, -14.08)], 0.035, 24, 12), [0, 0, 0], [0, 0, 0], { color: "#f1f4f7" }); }
    const lm = new THREE.Mesh(mergeGeometries(lg.map((g) => clean(g))), lobbyGlass); lm.name = "lot_lobbyGlass"; lm.renderOrder = 2; extra.push(lm);
    // lobby interior: floor, back wall with logo panel, side walls, ceiling + light strips, reception desk, plant
    fb("slab", -6.6, 0.0, -19.5, 6.6, 0.12, -14.3, { rr: 0.005, tile: 1.2, color: "#b8c2cc" });
    fb("room", -6.6, 0.1, -19.6, 6.6, 3.7, -19.4, { color: "#c8d2dc" }); fb("room", -6.7, 0.1, -19.5, -6.5, 3.7, -14.45, { color: "#b4c0cc" }); fb("room", 6.5, 0.1, -19.5, 6.7, 3.7, -14.45, { color: "#b4c0cc" });
    fb("room", -6.6, 3.6, -19.5, 6.6, 3.72, -14.45, { color: "#dfe6ec" });
    for (const x of [-4, 0, 4]) fb("light", x - 1.2, 3.56, -17.2, x + 1.2, 3.6, -16.9, { rr: 0.01 });
    fb("paint", -2.2, 1.4, -19.42, 2.2, 2.6, -19.36, { rr: 0.01, color: "#2c5f9e" });
    fb("paint", -2.0, 0.12, -17.6, 2.0, 1.1, -16.9, { rr: 0.04, color: "#e4eaf0" }); fb("paint", -2.1, 1.08, -17.65, 2.1, 1.14, -16.82, { rr: 0.02, color: "#3a4652" });
    piece("paint", lathe([[0, 0], [0.26, 0], [0.3, 0.55], [0, 0.55]], 18), [4.8, 0.12, -18.6], [0, 0, 0], { uv: "box", color: "#e8edf2" });
    for (let k = 0; k < 6; k++) piece("leaf", blobGeo(0.32, k), [4.8 + (r() - 0.5) * 0.4, 1.0 + k * 0.17, -18.6 + (r() - 0.5) * 0.4], [0, 0, 0], { tile: 0.5, color: "#4e8a58", jitter: 0.2 });
  }
  // entrance canopy + columns + fascia sign
  fb("panel", -1.8, 3.3, -14.12, 1.8, 3.64, -12.3, { soft: 0.4, tile: 2, color: "#f4f6f8" });
  fb("paint", -1.62, 3.34, -12.36, 1.62, 3.6, -12.2, { soft: 0.45, color: "#1f3550" });                      // chunky sign board
  for (const x of [-1.45, 1.45]) { piece("metal", new THREE.CapsuleGeometry(0.13, 3.0, 8, 24), [x, 0.15 + 1.6, -12.55], [0, 0, 0], { color: "#2f5d8a" });
    piece("concrete", lathe([[0, 0], [0.24, 0], [0.27, 0.04], [0.27, 0.12], [0.22, 0.17], [0, 0.17]], 28), [x, 0.14, -12.55], [0, 0, 0], { tile: 1 }); }
  texPlane(signTex("NORTHPARK OFFICES", { bg: "#1f3550" }), 3.0, 0.2, [0, 3.47, -12.195]);
  // building body: side walls with floor reveals, roof slab, coping, rooftop plant
  for (const s of [-1, 1]) { const x0 = s < 0 ? -20.72 : 20.4, x1 = s < 0 ? -20.4 : 20.72;
    fb("panel", x0, 0.1, -30, x1, 11.7, -14.4, { rr: 0.02, tile: 2.2 });
    for (const y of [F1 - 0.4, F2 - 0.4, ROOF]) fb("panel", s < 0 ? x0 - 0.06 : x1 - 0.02, y, -30, s < 0 ? x0 + 0.02 : x1 + 0.06, y + 0.12, -14.4, { rr: 0.02 }); }
  fb("panel", -20.7, 0.1, -30.3, 20.7, 11.7, -29.98, { rr: 0.02, tile: 2.2 });
  fb("core", -20.4, 10.8, -30, 20.4, 11.0, -14.4, { rr: 0.01 });
  fb("panel", -20.85, 11.66, -14.52, 20.85, 11.92, -13.62, { soft: 0.48, tile: 2, color: "#f4f6f8" });
  for (const s of [-1, 1]) fb("panel", s < 0 ? -20.85 : 20.3, 11.7, -30.4, s < 0 ? -20.3 : 20.85, 11.86, -14.53, { rr: 0.03 });
  fb("panel", -20.3, 11.7, -30.4, 20.3, 11.86, -29.85, { rr: 0.03 });
  for (const [x, z, w, d, h] of [[-9, -21, 3.2, 2.2, 1.6], [6, -23, 4.0, 2.6, 1.9], [13, -19, 1.6, 1.6, 2.6]]) {
    fb("metal", x - w / 2, 11.0, z - d / 2, x + w / 2, 11.0 + h, z + d / 2, { rr: 0.05, color: "#9aa6b2" });
    for (let k = 0; k < 5; k++) fb("metal", x - w / 2 + 0.2 + k * (w - 0.4) / 4 - 0.02, 11.2, z + d / 2, x - w / 2 + 0.2 + k * (w - 0.4) / 4 + 0.02, 11.0 + h - 0.2, z + d / 2 + 0.03, { rr: 0.005, color: "#7a8692" }); }

  // ---------------------------------------------------------------- the coworker's office (behind the clear window)
  { const X0 = -5.0, X1 = -1.0, Z0 = -17.6, Z1 = -14.42;
    fb("room", X0, F1 - 0.2, Z0, X1, F1, Z1, { rr: 0.005, color: "#56636f" });                              // carpet slab
    fb("room", X0 - 0.1, F1, Z0 - 0.1, X1 + 0.1, 6.95, Z0, { color: "#cfd8e0" });                          // back wall
    fb("room", X0 - 0.1, F1, Z0, X0, 6.95, Z1, { color: "#bcc8d4" }); fb("room", X1, F1, Z0, X1 + 0.1, 6.95, Z1, { color: "#bcc8d4" });
    fb("room", X0 - 0.1, 6.95, Z0 - 0.1, X1 + 0.1, 7.05, Z1, { color: "#e6ebf0" });                        // ceiling
    fb("room", X0, F1, -14.52, COW.x0 - 0.05, 6.95, -14.44, { color: "#c8d2dc" }); fb("room", COW.x1 + 0.05, F1, -14.52, X1, 6.95, -14.44, { color: "#c8d2dc" });
    fb("room", COW.x0 - 0.05, F1, -14.52, COW.x1 + 0.05, COW.y0 - 0.02, -14.44, { color: "#c8d2dc" });
    fb("room", COW.x0 - 0.05, COW.y1 + 0.02, -14.52, COW.x1 + 0.05, 6.95, -14.44, { color: "#c8d2dc" });
    fb("paint", COW.x0 - 0.06, COW.y0 - 0.05, -14.62, COW.x1 + 0.06, COW.y0 + 0.0, -14.28, { rr: 0.01, color: "#eef2f5" });   // inner sill
    fb("light", -3.9, 6.9, -16.6, -2.1, 6.95, -15.8, { rr: 0.01 });
    // desk with monitor, lamp, papers; chair; plant by the window; framed print; filing cabinet
    fb("paint", -4.7, F1 + 0.72, -17.45, -2.3, F1 + 0.76, -16.7, { rr: 0.01, color: "#e8edf2" });
    for (const x of [-4.62, -2.38]) fb("metal", x - 0.03, F1, -17.4, x + 0.03, F1 + 0.72, -16.75, { rr: 0.01, color: "#5a6672" });
    fb("paint", -3.85, F1 + 0.95, -17.3, -3.05, F1 + 1.42, -17.26, { rr: 0.01, color: "#1c232a" }); fb("metal", -3.48, F1 + 0.76, -17.3, -3.42, F1 + 0.96, -17.26, { rr: 0.01, color: "#5a6672" });
    fb("paint", -2.9, F1 + 0.76, -17.1, -2.6, F1 + 0.79, -16.85, { rr: 0.005, color: "#f4f6f8" });
    fb("paint", -3.9, F1 + 0.42, -16.4, -3.4, F1 + 0.5, -15.9, { rr: 0.03, color: "#2c5f9e" }); fb("paint", -3.9, F1 + 0.5, -16.42, -3.4, F1 + 1.05, -16.34, { rr: 0.03, color: "#2c5f9e" });
    fb("metal", -3.67, F1, -16.17, -3.63, F1 + 0.42, -16.13, { rr: 0.01, color: "#3a4048" });
    piece("paint", lathe([[0, 0], [0.17, 0], [0.2, 0.42], [0, 0.42]], 16), [-1.45, F1, -14.95], [0, 0, 0], { uv: "box", color: "#e8edf2" });
    for (let k = 0; k < 7; k++) piece("leaf", blobGeo(0.17 + r() * 0.06, k + 3), [-1.45 + (r() - 0.5) * 0.25, F1 + 0.6 + k * 0.11, -14.95 + (r() - 0.5) * 0.25], [0, 0, 0], { tile: 0.5, color: ["#4e8a58", "#62a062"][k % 2], jitter: 0.2 });
    fb("paint", -2.4, F1 + 1.5, -17.5, -1.4, F1 + 2.2, -17.46, { rr: 0.01, color: "#dfe6ec" }); fb("paint", -2.32, F1 + 1.58, -17.47, -1.48, F1 + 2.12, -17.44, { rr: 0.005, color: "#3f86d6" });
    fb("metal", -1.55, F1, -17.45, -1.05, F1 + 1.3, -16.85, { rr: 0.015, color: "#9aa6b2" });
    // blinds pulled up (stack + bottom rail + cord) on the inside, above head height
    fb("paint", COW.x0 + 0.04, 5.74, -14.42, COW.x1 - 0.04, 5.79, -14.34, { rr: 0.008, color: "#e8edf2" });
    // (integrator 2026-11-23: stack folded higher so it never covers the heads/hair of people standing at the window)
    for (let k = 0; k < 3; k++) fb("paint", COW.x0 + 0.06, 5.68 + k * 0.018, -14.41, COW.x1 - 0.06, 5.695 + k * 0.018, -14.36, { rr: 0.004, color: "#eef2f6", jitter: 0.04 });
    fb("paint", COW.x0 + 0.05, 5.65, -14.42, COW.x1 - 0.05, 5.68, -14.35, { rr: 0.008, color: "#dde4ea" });
    piece("paint", new THREE.CylinderGeometry(0.004, 0.004, 0.4, 5), [COW.x1 - 0.12, 5.45, -14.37], [0, 0, 0], { color: "#e8edf2" });
    // clear pane
    const g = new THREE.PlaneGeometry(COW.x1 - COW.x0 - 0.04, COW.y1 - COW.y0 - 0.08); g.translate((COW.x0 + COW.x1) / 2, (COW.y0 + COW.y1) / 2, -14.21);
    const cm = new THREE.Mesh(g, clearGlass); cm.name = "lot_coworkerGlass"; cm.renderOrder = 2; extra.push(cm);
  }
  const roomLight = new THREE.PointLight(0xe8f0ff, 7, 9, 2); roomLight.position.set(-3.0, 6.6, -16.2); group.add(roomLight);

  // ================================================================ STREET FURNITURE: lamp posts, stop sign, trees
  const lampPost = (x, z, base = 0.16) => {        // chunky toy lamp: round plinth, fat pole, curved arms, pill heads
    piece("concrete", lathe([[0, 0], [0.3, 0], [0.34, 0.06], [0.34, 0.32], [0.26, 0.42], [0, 0.42]], 32), [x, base - 0.02, z], [0, 0, 0], { tile: 1 });
    piece("metal", new THREE.CapsuleGeometry(0.11, 7.0, 8, 24), [x, base + 0.4 + 3.6, z], [0, 0, 0], { color: "#2f5d8a" });
    for (const s of [-1, 1]) {
      piece("metal", tube([V(x, base + 7.1, z), V(x + s * 0.45, base + 7.62, z), V(x + s * 1.05, base + 7.66, z)], 0.065, 24, 12), [0, 0, 0], [0, 0, 0], { color: "#2f5d8a" });
      const hd = new THREE.CapsuleGeometry(0.17, 0.5, 8, 20).rotateZ(Math.PI / 2); hd.scale(1, 0.75, 1.15);
      piece("metal", hd, [x + s * 1.15, base + 7.6, z], [0, 0, 0], { color: "#2f5d8a" });
      piece("head", new THREE.SphereGeometry(0.16, 24, 12, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2).scale(2.0, 0.5, 1.0), [x + s * 1.15, base + 7.53, z]); }
    piece("metal", new THREE.SphereGeometry(0.14, 20, 14), [x, base + 7.55, z], [0, 0, 0], { color: "#2f5d8a" });
  };
  for (const [x, z] of [[-15.2, -1.95], [15.4, -1.95], [-15.2, 8.05], [15.4, 8.05], [-7.5, 10.3], [8.0, 10.3]]) lampPost(x, z);
  // stop sign at the west exit of the building aisle (faces +x)
  { const x = -15.3, z = -6.95; piece("metal", new THREE.CapsuleGeometry(0.05, 2.3, 6, 16), [x, 0.16 + 1.2, z], [0, 0, 0], { color: "#e8edf2" });
    const sh = new THREE.Shape(); for (let i = 0; i < 8; i++) { const a = Math.PI / 8 + (i * Math.PI) / 4; i ? sh.lineTo(0.38 * Math.cos(a), 0.38 * Math.sin(a)) : sh.moveTo(0.38 * Math.cos(a), 0.38 * Math.sin(a)); }
    const sg = new THREE.ShapeGeometry(sh); const uv = sg.attributes.uv, p = sg.attributes.position; for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / 0.76 + 0.5, p.getY(i) / 0.76 + 0.5);
    const sm = new THREE.Mesh(sg, new THREE.MeshStandardMaterial({ map: stopTex(), roughness: 0.45 })); sm.position.set(x + 0.062, 2.32, z); sm.rotation.y = Math.PI / 2; sm.castShadow = true; extra.push(sm);
    const bg = smoothGeo(new THREE.ExtrudeGeometry(sh, { depth: 0.02, bevelEnabled: true, bevelSize: 0.035, bevelThickness: 0.03, bevelSegments: 4 })); bg.rotateY(Math.PI / 2); piece("paint", bg, [x - 0.02, 2.32, z], [0, 0, 0], { color: "#f4f4f2" }); }
  // trees: trunk + branches (static) + canopy blobs (one mesh per tree, sways)
  const sway = [];
  const tree = (x, z, s = 1, base = 0.12) => {
    const lean = (r() - 0.5) * 0.25, top = V(x + lean, base + 2.9 * s, z);
    piece("bark", tube([V(x, base - 0.05, z), V(x + lean * 0.3, base + 1.5 * s, z + 0.04), top], 0.12 * s, 12, 8), [0, 0, 0], [0, 0, 0], { uv: "grain", tile: 1.2 });
    for (let b = 0; b < 5; b++) { const a = b * 1.3 + r(); piece("bark", tube([V(top.x, top.y - 0.4 * s, z), V(top.x + Math.cos(a) * 1.0 * s, top.y + (0.6 + r() * 0.5) * s, z + Math.sin(a) * 0.9 * s)], 0.085 * s, 8, 8), [0, 0, 0], [0, 0, 0], { uv: "grain", tile: 1 }); }
    const parts = [];
    for (let k = 0; k < 14; k++) { const a = k * 2.4, rr = k === 0 ? 0 : (0.7 + r() * 0.8) * s, sc = (k === 0 ? 1.35 : 0.62 + r() * 0.45) * s;
      const g = blobGeo(sc, k + x * 3 + z); boxUV(g, 2.5); tint(g, C(["#4e8a58", "#5a9660", "#42784e", "#66a264"][k % 4]).multiplyScalar(0.85 + r() * 0.3));
      g.translate(Math.cos(a) * rr, (k === 0 ? 1.55 : 0.6 + r() * 1.6) * s, Math.sin(a) * rr * 0.9); parts.push(g); }
    const m = new THREE.Mesh(mergeGeometries(parts.map((g) => clean(g))), M.leaf); m.castShadow = m.receiveShadow = true; m.customDepthMaterial = dapDepth; m.name = "lot_canopy";
    const pivot = new THREE.Group(); pivot.position.copy(top); pivot.add(m); group.add(pivot); sway.push({ pivot, ph: r() * 6.28, k: 0.6 + r() * 0.5 });
  };
  for (const [x, z, s] of treeSpots) tree(x, z, s, 0.12);
  // hedges along the side kerbs (depth layer at the lot edges)
  for (const s of [-1, 1]) for (let z = -10; z < 11.5; z += 0.9) piece("leaf", blobGeo(0.6 + r() * 0.15, z * 7 + s), [s * 18.2, 0.45, z], [0, 0, 0], { tile: 0.6, color: ["#4e8a58", "#447c50"][(z * 2) & 1 ? 1 : 0], jitter: 0.15 });

  // ================================================================ PARKED CARS (cool colours; hero bay + neighbours empty)
  const carJobs = [];
  const car = (x, z, yaw, color) => carJobs.push([x, z, yaw, color]);       // built below from world/car (toy jellybean shell)
  // local +x = front. yaw +PI/2 -> front faces -z (nose to the building).
  const CARS_A = [[-10.5, "#2c5f9e"], [-7.9, "#aab4be"], [-5.3, "#2f7f8f"], [-2.7, "#4a5560"], [7.7, "#24405e"], [10.3, "#dfe5ea"], [12.9, "#2f7f8f"]];
  CARS_A.forEach(([x, c], i) => car(x + (r() - 0.5) * 0.15, -4.0 + (r() - 0.5) * 0.2, Math.PI / 2 + (r() - 0.5) * 0.03, c, { rack: i === 1, pod: i === 5 }));
  const CARS_B = [[-10.5, "#3a6a8a"], [-5.3, "#aab4be"], [-2.7, "#2c5f9e"], [2.5, "#2f7f8f"], [5.1, "#5a6672"], [10.3, "#24405e"]];
  CARS_B.forEach(([x, c], i) => car(x + (r() - 0.5) * 0.15, 6.0 + (r() - 0.5) * 0.2, (r() < 0.5 ? -1 : 1) * Math.PI / 2 + (r() - 0.5) * 0.03, c, { rack: i === 3 }));
  // a couple on the road beyond (depth)
  car(-22, 16, 0, "#2c5f9e"); car(30, 19.5, Math.PI, "#aab4be");
  { const CB = {}, CM = {};
    for (const [x, z, yaw, color] of carJobs) {
      const c = await buildHeroCar({ paint: "#ffffff", interior: false, name: "parkedCar" });
      c.position.set(x, 0, z); c.rotation.y = yaw - Math.PI / 2; c.updateMatrixWorld(true);       // lot +x-front convention -> car nose -z
      c.traverse((o) => { if (!o.isMesh) return; const k = o.material.name || "car_misc"; if (!CM[k]) CM[k] = o.material; (CB[k] = CB[k] || []);
        const g = o.geometry.clone(); g.applyMatrix4(o.matrixWorld); const gc = clean(g); if (k === "car_paint") tint(gc, C(color)); CB[k].push(gc); });
    }
    for (const [k, list] of Object.entries(CB)) { let m = CM[k];
      if (k === "car_paint") { m = m.clone(); m.vertexColors = true; m.color.set(0xffffff); }
      const mesh = new THREE.Mesh(mergeGeometries(list), m); mesh.name = `lot_cars_${k}`;
      const glass = !!m.isShaderMaterial, shadow = k.startsWith("car_shadow");
      mesh.castShadow = !glass && !shadow; mesh.receiveShadow = !shadow; if (glass) mesh.renderOrder = 2; if (shadow) mesh.renderOrder = -1;
      extra.push(mesh); } }

  // ================================================================ STAIRWELL (separate interior, x 58.8..61.2)
  { const { x0, x1, z0, z1, top, ceil, zTop, n, run, rise } = ST, T = 0.25;
    const WIN = { z0: 0.6, z1: 2.0, y0: 2.6, y1: 4.4 };
    // floor + ceiling + walls (block, painted), west wall with the sunny window hole
    fb("concrete", x0 - T, -0.3, z0 - T, x1 + T, 0.0, z1 + T, { rr: 0.005, tile: 2, color: "#b8c2cc" });
    fb("concrete", x0 - T, ceil, z0 - T, x1 + T, ceil + 0.3, z1 + T, { rr: 0.005, tile: 2, color: "#d8e0e8" });
    fb("block", x1, 0, z0 - T, x1 + T, ceil, z1 + T, { rr: 0.005, tile: 1.6 });
    fb("block", x0 - T, 0, z0 - T, x1 + T, ceil, z0, { rr: 0.005, tile: 1.6 }); fb("block", x0 - T, 0, z1, x1 + T, ceil, z1 + T, { rr: 0.005, tile: 1.6 });
    fb("block", x0 - T, 0, z0 - T, x0, ceil, WIN.z0, { rr: 0.005, tile: 1.6 }); fb("block", x0 - T, 0, WIN.z1, x0, ceil, z1 + T, { rr: 0.005, tile: 1.6 });
    fb("block", x0 - T, 0, WIN.z0 - 0.01, x0, WIN.y0, WIN.z1 + 0.01, { rr: 0.005, tile: 1.6 }); fb("block", x0 - T, WIN.y1, WIN.z0 - 0.01, x0, ceil, WIN.z1 + 0.01, { rr: 0.005, tile: 1.6 });
    // window frame + sill + clear pane
    fb("alu", x0 - 0.2, WIN.y0 - 0.12, WIN.z0 - 0.05, x0 + 0.1, WIN.y0 + 0.02, WIN.z1 + 0.05, { soft: 0.45, color: "#f1f4f7" });
    for (const [a, b, c, d] of [[WIN.y1 - 0.05, WIN.z0, WIN.y1, WIN.z1], [WIN.y0, WIN.z0, WIN.y1, WIN.z0 + 0.05], [WIN.y0, WIN.z1 - 0.05, WIN.y1, WIN.z1], [(WIN.y0 + WIN.y1) / 2 - 0.025, WIN.z0, (WIN.y0 + WIN.y1) / 2 + 0.025, WIN.z1]])
      fb("alu", x0 - 0.18, a - 0.03, b - 0.03, x0 - 0.06, c + 0.03, d + 0.03, { soft: 0.45, color: "#f1f4f7" });
    { const g = new THREE.PlaneGeometry(WIN.z1 - WIN.z0 - 0.1, WIN.y1 - WIN.y0 - 0.1); g.rotateY(Math.PI / 2); g.translate(x0 - 0.12, (WIN.y0 + WIN.y1) / 2, (WIN.z0 + WIN.z1) / 2);
      const m = new THREE.Mesh(g, clearGlass); m.renderOrder = 2; extra.push(m); }
    // painted dado stripe + skirting (proud, never coplanar)
    for (const [ax, bx, az, bz] of [[x1 - 0.004, x1 + 0.01, z0, z1], [x0 - 0.01, x0 + 0.004, z0, WIN.z0], [x0 - 0.01, x0 + 0.004, WIN.z1, z1]]) {
      fb("paint", ax, 0, az, bx, 0.12, bz, { rr: 0.003, color: "#3a4652" }); }
    // top landing (solid) + steps (solid, each overlaps the previous) + nosings + anti-slip strips
    fb("concrete", x0, 0, z0, x1, top, zTop + 0.02, { rr: 0.01, tile: 1.8, color: "#c4ccd4" });
    for (let i = 0; i < n; i++) { const y = top - (i + 1) * rise, za = zTop + i * run, zb = za + run;
      fb("concrete", x0 + 0.005, 0, za - 0.02, x1 - 0.005, y, zb, { rr: 0.012, tile: 1.8, color: "#c4ccd4", jitter: 0.04 });
      fb("paint", x0 + 0.08, y - 0.03, zb - 0.05, x1 - 0.08, y + 0.004, zb + 0.004, { rr: 0.004, color: "#eef2f5" });
      fb("seal", x0 + 0.15, y, zb - 0.16, x1 - 0.15, y + 0.003, zb - 0.07, { rr: 0.001 }); }
    fb("paint", x0 + 0.08, top - 0.03, zTop - 0.05, x1 - 0.08, top + 0.004, zTop + 0.004, { rr: 0.004, color: "#eef2f5" });
    // handrails on both walls (tube on brackets, 0.9 m above the pitch line, returns at both ends)
    for (const s of [-1, 1]) { const xw = s < 0 ? x0 + 0.09 : x1 - 0.09, xb = s < 0 ? x0 : x1;
      const pts = [V(xw, top + 0.9, zTop - 1.2), V(xw, top + 0.9, zTop), V(xw, 0.9, ST.zBot), V(xw, 0.9, ST.zBot + 0.6)];
      for (let k = 0; k < 3; k++) piece("metal", tube([pts[k], pts[k + 1]], 0.045, 6, 14), [0, 0, 0], [0, 0, 0], { color: "#2c5f9e" });
      for (const k of [0.15, 0.5, 0.85]) { const z = zTop + (ST.zBot - zTop) * k, y = top - (top) * k + 0.9;
        fb("metal", Math.min(xb, xw), y - 0.1, z - 0.012, Math.max(xb, xw), y - 0.07, z + 0.012, { rr: 0.004, color: "#7c8690" }); } }
    // top-floor door (closed, -z wall) + "2" sign; fire door with wired-glass window (+z wall) + red EXIT box
    const door = (zw, dir, y0, label) => {
      const zf = zw + dir * 0.02, zf2 = zw + dir * 0.07;
      fb("metal", 59.45, y0, Math.min(zf, zf2), 60.55, y0 + 2.15, Math.max(zf, zf2), { rr: 0.012, color: "#2f6f80" });          // leaf
      for (const [a, b, c, d] of [[59.35, y0, 59.45, y0 + 2.25], [60.55, y0, 60.65, y0 + 2.25], [59.35, y0 + 2.15, 60.65, y0 + 2.25]])
        fb("metal", a, b, Math.min(zw, zw + dir * 0.09), c, d, Math.max(zw, zw + dir * 0.09), { rr: 0.01, color: "#5e6872" });
      fb("metal", 59.6, y0 + 0.95, Math.min(zf2, zf2 + dir * 0.06), 60.4, y0 + 1.03, Math.max(zf2, zf2 + dir * 0.06), { rr: 0.02, color: "#c8d0d8" });   // push bar
      if (label) { fb("metal", 59.82, y0 + 1.3, Math.min(zf2, zf2 + dir * 0.012), 60.18, y0 + 1.9, Math.max(zf2, zf2 + dir * 0.012), { rr: 0.01, color: "#3a4652" });
        const g = new THREE.PlaneGeometry(0.3, 0.54); if (dir < 0) g.rotateY(Math.PI); g.translate(60, y0 + 1.6, zf2 + dir * 0.014);
        const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: C("#dff0ff"), emissive: C("#cfe6ff"), emissiveIntensity: 1.6, roughness: 0.2 })); extra.push(m);
        for (let k = 1; k < 5; k++) fb("metal", 59.86, y0 + 1.33 + k * 0.106, Math.min(zf2, zf2 + dir * 0.02), 60.14, y0 + 1.336 + k * 0.106, Math.max(zf2, zf2 + dir * 0.02), { rr: 0.001, color: "#8a96a2" }); }
    };
    door(z0, 1, top, false); door(z1, -1, 0, true);
    texPlane(stencilTex("2", { bg: "#d6dde3", ink: "#2c5f9e" }), 0.7, 0.7, [x1 - 0.012, top + 1.9, -3.0], -Math.PI / 2);
    fb("paint", x1 - 0.01, top + 1.53, -3.37, x1 + 0.01, top + 2.27, -2.63, { rr: 0.003, color: "#2c5f9e" });
    texPlane(signTex("STAIR B  -  FLOOR 2", { bg: "#2c5f9e", ink: "#ffffff", w: 512, h: 96 }), 0.8, 0.15, [x1 - 0.012, top + 1.35, -3.0], -Math.PI / 2);
    { fb("paint", 59.7, 2.38, z1 - 0.16, 60.3, 2.62, z1 - 0.005, { rr: 0.02, color: "#e8edf2" });
      const ex = texPlane(signTex("EXIT", { bg: "#b01818", ink: "#ffe8e8", w: 512, h: 200 }), 0.5, 0.18, [60, 2.5, z1 - 0.168], Math.PI, { emissive: 1.4 }); }
    texPlane(signTex("1", { bg: "#d6dde3", ink: "#2c5f9e", w: 256, h: 256 }), 0.45, 0.45, [x1 - 0.012, 1.9, 4.8], -Math.PI / 2);
    // fluorescent fixtures (ceiling + wall) + their lights; outside glow behind the fire door glass and window
    for (const [z, y] of [[-3.0, ceil - 0.06], [2.0, ceil - 0.06], [6.5, ceil - 0.06]]) { fb("metal", 59.4, y - 0.04, z - 0.65, 60.6, y + 0.06, z + 0.65, { rr: 0.02, color: "#c8d0d8" });
      fb("light", 59.6, y - 0.075, z - 0.6, 59.75, y - 0.035, z + 0.6, { rr: 0.015 }); fb("light", 60.25, y - 0.075, z - 0.6, 60.4, y - 0.035, z + 0.6, { rr: 0.015 }); }
    fb("metal", x1 - 0.1, 3.0, 5.8, x1 - 0.005, 3.12, 7.0, { rr: 0.02, color: "#c8d0d8" }); fb("light", x1 - 0.12, 3.0, 5.85, x1 - 0.09, 3.1, 6.95, { rr: 0.01 });
    // fire extinguisher cabinet + pipe (relief, depth)
    fb("paint", x0, 1.0, 5.0, x0 + 0.16, 1.7, 5.6, { rr: 0.02, color: "#e8edf2" }); fb("tail", x0 + 0.16, 1.05, 5.12, x0 + 0.17, 1.65, 5.48, { rr: 0.005 });
    piece("metal", tube([V(x1 - 0.12, 0.05, z1 - 0.12), V(x1 - 0.12, ceil - 0.05, z1 - 0.12)], 0.05, 4, 12), [0, 0, 0], [0, 0, 0], { color: "#b01818" });
  }
  const stair = [new THREE.PointLight(0xeaf4ff, 0, 12, 2), new THREE.PointLight(0xeaf4ff, 0, 12, 2), new THREE.PointLight(0xeaf4ff, 0, 7, 2)];
  stair[0].position.set(60, ST.ceil - 0.35, -3.0); stair[1].position.set(60, ST.ceil - 0.35, 2.0); stair[2].position.set(60, ST.ceil - 0.35, 6.5);
  for (const l of stair) group.add(l);

  // ================================================================ DISTANCE: terrain, far trees, neighbour building, skyline
  { const S = 1800, N = 150, g = new THREE.PlaneGeometry(S, S, N, N); g.rotateX(-Math.PI / 2);
    const p = g.attributes.position, cols = new Float32Array(p.count * 3), near = C("#3e6a50"), far = C("#7f9fb8"), tmp = new THREE.Color();
    const hAt = (x, z) => { const d = Math.hypot(x * 0.8, z + 10); if (d < 95) return -0.06;
      const k = THREE.MathUtils.smoothstep(d, 95, 380); return -0.06 + k * (26 + 18 * Math.sin(x * 0.011 + 1.3) + 12 * Math.sin(z * 0.013 - 0.4) + 6 * Math.sin((x + z) * 0.03)); };
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i); p.setY(i, hAt(x, z)); const d = Math.hypot(x, z);
      tmp.copy(near).lerp(far, THREE.MathUtils.smoothstep(d, 120, 700)); cols.set([tmp.r, tmp.g, tmp.b], i * 3); }
    g.setAttribute("color", new THREE.BufferAttribute(cols, 3)); g.computeVertexNormals();
    const tm = new THREE.Mesh(g, plain("#ffffff", { roughness: 0.95, relief: 0.8, vertexColors: true })); tm.receiveShadow = true; tm.name = "lot_terrain"; group.add(tm);
    // far + mid trees (instanced blobs), aerial perspective baked into instance colour
    const tg = blobGeo(1, 4), tmat = plain("#ffffff", { roughness: 0.9, relief: 0.3 }), inst = new THREE.InstancedMesh(tg, tmat, 1800);
    const mx = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = V(1, 1, 1), c0 = C("#42784e"), hz = C("#8aa8c4"); let nt = 0;
    for (let i = 0; i < 6000 && nt < 1800; i++) { const a = r() * 6.283, d = 34 + Math.pow(r(), 1.4) * 520, x = Math.cos(a) * d, z = Math.sin(a) * d - 10;
      if (z > -40 && z < 26 && Math.abs(x) < 22) continue; if (z > 12 && z < 24) continue; if (x > 22 && x < 48 && z > -30 && z < -2) continue; if (x > 45 && x < 75 && Math.abs(z) < 15) continue;
      const y = hAt(x, z), s = 2.2 + r() * 2.6 + d * 0.004; mx.compose(V(x, y + s * 0.8, z), q, sc.set(s, s * 1.2, s)); inst.setMatrixAt(nt, mx);
      inst.setColorAt(nt, tmp.copy(c0).multiplyScalar(0.8 + r() * 0.4).lerp(hz, THREE.MathUtils.smoothstep(d, 60, 520) * 0.85)); nt++; }
    inst.count = nt; inst.castShadow = true; inst.receiveShadow = true; inst.name = "lot_farTrees"; group.add(inst);
    // neighbour office (+x side), cool concrete with mirror bands; skyline towers far behind the building + across the road
    fb("panel", 24, 0, -26, 44, 7.6, -6, { rr: 0.04, tile: 2.2 });
    for (const y of [1.0, 4.4]) { fb("mirror", 23.9, y, -25.6, 24.05, y + 2.0, -6.4, { rr: 0.01 }); fb("mirror", 24.4, y, -6.05, 43.6, y + 2.0, -5.9, { rr: 0.01 }); }
    for (let x = 25.2; x < 43.5; x += 1.6) for (const y of [1.0, 4.4]) fb("alu", x - 0.03, y, -6.1, x + 0.03, y + 2.0, -5.86, { rr: 0.005, color: "#c4ccd4" });
    fb("panel", 23.8, 7.6, -26.2, 44.2, 7.9, -5.8, { rr: 0.03 });
    const towerMat = new THREE.MeshStandardMaterial({ color: C("#ffffff"), roughness: 0.6, metalness: 0.2, emissive: C("#8fb0d6"), emissiveIntensity: 0.28 });
    const towers = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), towerMat, 40); let nk = 0;
    const TW = [[-120, -320, 30, 95], [-70, -360, 26, 130], [-20, -340, 34, 80], [40, -380, 28, 150], [95, -330, 30, 105], [150, -360, 26, 70], [-170, -300, 24, 60],
      [210, -290, 22, 55], [-240, 260, 30, 70], [-180, 330, 26, 95], [180, 300, 30, 85], [260, 340, 24, 60], [-320, -120, 28, 55], [330, -60, 26, 65]];
    for (const [x, z, w, h] of TW) { mx.compose(V(x, h / 2 + 4, z), q.identity(), sc.set(w, h, w * 0.9)); towers.setMatrixAt(nk, mx);
      towers.setColorAt(nk, tmp.set(["#9fb3c8", "#b8c6d4", "#8ea4bc", "#c4d0dc"][nk % 4])); nk++; }
    towers.count = nk; towers.castShadow = false; towers.name = "lot_skyline"; group.add(towers);
  }

  // ================================================================ ENRICHMENT: facade dressing, sidewalk furniture, ground wear, depth layers
  // cornice band (proud) + side returns; 3D letters on the parapet; sconces on pilasters; downpipes
  fb("panel", -20.9, 10.9, -14.15, 20.9, 11.16, -13.45, { soft: 0.48, tile: 2, color: "#f4f6f8" });
  for (const s of [-1, 1]) fb("panel", s < 0 ? -20.9 : 20.72, 10.92, -30.2, s < 0 ? -20.72 : 20.9, 11.14, -14.15, { rr: 0.02 });
  { const font = new FontLoader().parse(helvBold); const tg = new TextGeometry("NORTHPARK", { font, size: 0.42, depth: 0.09, curveSegments: 4, bevelEnabled: true, bevelThickness: 0.008, bevelSize: 0.006, bevelSegments: 1 });
    tg.computeBoundingBox(); const bb = tg.boundingBox; tg.translate(-(bb.max.x + bb.min.x) / 2, 0, 0); piece("paint", tg, [0, 11.2, -14.03], [0, 0, 0], { color: "#24405e", tile: 1 }); }
  for (const cx of PIL) { fb("metal", cx - 0.09, 2.55, -13.77, cx + 0.09, 2.95, -13.6, { rr: 0.03, color: "#5e6872" }); fb("head", cx - 0.07, 2.5, -13.74, cx + 0.07, 2.56, -13.63, { rr: 0.01 }); }
  for (const x of [-13.15, 13.15]) { piece("metal", tube([V(x, 10.92, -13.9), V(x, 0.3, -13.9), V(x + Math.sign(x) * 0.02, 0.17, -13.72)], 0.085, 24, 14), [0, 0, 0], [0, 0, 0], { color: "#7c8690" });
    for (let y = 1.5; y < 10.5; y += 2.2) fb("metal", x - 0.07, y, -13.99, x + 0.07, y + 0.04, -13.84, { rr: 0.01, color: "#5e6872" }); }
  // more rooftop plant: fans, duct, guard rail
  for (const [x, z] of [[-15, -18], [-2, -25], [16, -26]]) { fb("metal", x - 1.1, 11.0, z - 1.1, x + 1.1, 12.0, z + 1.1, { rr: 0.06, color: "#8a96a2" });
    piece("metal", new THREE.CylinderGeometry(0.7, 0.7, 0.18, 24), [x, 12.08, z], [0, 0, 0], { color: "#5e6872" }); }
  piece("metal", tube([V(-9, 11.9, -19.9), V(-9, 11.9, -17), V(-2, 11.9, -17), V(-2, 11.9, -23.7)], 0.22, 40, 12), [0, 0, 0], [0, 0, 0], { color: "#9aa6b2" });
  for (let x = -20; x <= 20.01; x += 2.5) fb("metal", x - 0.05, 11.0, -15.05, x + 0.05, 12.9, -14.95, { soft: 0.5, color: "#9aa6b2" });
  piece("metal", tube([V(-20, 12.9, -15), V(20, 12.9, -15)], 0.065, 8, 12), [0, 0, 0], [0, 0, 0], { color: "#9aa6b2" });
  // sidewalk: raised planters (shrubs / small trees), bench, bins, bike rack
  const planter = (x, z, w, d, h = 0.45) => { const t = 0.1, y0 = 0.14;
    fb("concrete", x - w / 2, y0, z - d / 2, x + w / 2, y0 + h, z - d / 2 + t, { rr: 0.02, tile: 1 }); fb("concrete", x - w / 2, y0, z + d / 2 - t, x + w / 2, y0 + h, z + d / 2, { rr: 0.02, tile: 1 });
    fb("concrete", x - w / 2, y0, z - d / 2 + t, x - w / 2 + t, y0 + h, z + d / 2 - t, { rr: 0.02, tile: 1 }); fb("concrete", x + w / 2 - t, y0, z - d / 2 + t, x + w / 2, y0 + h, z + d / 2 - t, { rr: 0.02, tile: 1 });
    fb("grass", x - w / 2 + t - 0.02, y0, z - d / 2 + t - 0.02, x + w / 2 - t + 0.02, y0 + h - 0.06, z + d / 2 - t + 0.02, { rr: 0.01, color: "#5a7a48" }); return y0 + h - 0.06; };
  for (const x of [-2.75, 2.75]) { const top = planter(x, -12.55, 1.1, 0.9);
    for (let k = 0; k < 6; k++) piece("leaf", blobGeo(0.22 + r() * 0.1, k + x), [x + (r() - 0.5) * 0.6, top + 0.15 + r() * 0.15, -12.55 + (r() - 0.5) * 0.45], [0, 0, 0], { tile: 0.6, color: ["#4e8a58", "#62a062", "#447c50"][k % 3], jitter: 0.15 }); }
  for (const x of [-10.2, 10.2]) { const top = planter(x, -12.35, 1.3, 1.3); tree(x, -12.35, 0.6, top); }
  { const x0 = -5.7, x1 = -4.1, z = -12.2;                                                       // bench
    for (const x of [x0 + 0.18, x1 - 0.18]) fb("concrete", x - 0.12, 0.14, z - 0.24, x + 0.12, 0.54, z + 0.24, { soft: 0.4, tile: 1 });
    for (let k = 0; k < 3; k++) piece("bark", roundedBox(x1 - x0, 0.08, 0.13, 0.038, 3), [(x0 + x1) / 2, 0.58, z - 0.16 + k * 0.155], [0, 0, 0], { uv: "grain", tile: 1, color: "#d8a46a" });
    for (let k = 0; k < 2; k++) piece("bark", roundedBox(x1 - x0, 0.13, 0.08, 0.038, 3), [(x0 + x1) / 2, 0.8 + k * 0.17, z - 0.3], [-0.12, 0, 0], { uv: "grain", tile: 1, color: "#d8a46a" });
    for (const x of [x0 + 0.18, x1 - 0.18]) fb("metal", x - 0.04, 0.56, z - 0.36, x + 0.04, 1.06, z - 0.26, { soft: 0.45, color: "#2f5d8a" }); }
  for (const x of [-7.7, 7.7]) { piece("paint", lathe([[0, 0], [0.24, 0], [0.26, 0.82], [0.28, 0.86], [0, 0.86]], 20), [x, 0.14, -12.25], [0, 0, 0], { uv: "box", color: "#3a4652" });
    piece("metal", lathe([[0, 0], [0.28, 0], [0.24, 0.06], [0.12, 0.1], [0, 0.1]], 20), [x, 0.99, -12.25], [0, 0, 0], { uv: "box", color: "#7c8690" }); }
  for (let k = 0; k < 4; k++) { const x = 4.4 + k * 0.55;                                     // bike rack hoops
    piece("metal", tube([V(x, 0.12, -12.75), V(x, 0.75, -12.75), V(x, 0.85, -12.6), V(x, 0.75, -12.45), V(x, 0.12, -12.45)], 0.05, 32, 12), [0, 0, 0], [0, 0, 0], { color: "#2f5d8a" }); }
  // ground wear: darker asphalt patches (3 mm proud), more crack seals, oil + tyre decals, drain grate, speed bump
  for (const [x0, z0, x1, z1] of [[-12.3, -10.4, -9.4, -7.6], [5.4, -9.9, 8.2, -7.4], [-6.6, -0.6, -3.4, 1.7], [9.2, 0.6, 12.8, 3.0], [-13.6, 4.1, -11.6, 7.8], [6.2, 5.2, 8.6, 7.6]])
    fb("asphalt", x0, -0.02, z0, x1, 0.003, z1, { rr: 0.004, tile: 4, color: "#9aa2ae", jitter: 0.1 });
  for (let k = 0; k < 12; k++) { const x = -15 + r() * 30, z = -10 + r() * 18, pts = [];
    for (let s2 = 0; s2 < 7; s2++) pts.push(V(x + (r() - 0.5) * 0.5 + s2 * 0.15, 0.001, z + s2 * 0.4 + (r() - 0.5) * 0.3));
    piece("seal", tube(pts, 0.014, 24, 5), [0, 0, 0], [0, 0, 0]).scale(1, 0.3, 1); }
  for (const x of BAYX) { if (r() < 0.7) decal(x + (r() - 0.5) * 0.4, -4.3 + (r() - 0.5) * 0.6, 1.0 + r() * 0.6, 1.0 + r() * 0.6, 0, r() * 3);
    if (r() < 0.6) decal(x + (r() - 0.5) * 0.4, 6.1 + (r() - 0.5) * 0.6, 0.9 + r() * 0.6, 0.9 + r() * 0.6, 0, r() * 3); }
  for (const [x, z, rot] of [[-8, 1.0, Math.PI / 2 + 0.1], [3, 0.6, Math.PI / 2 - 0.05], [10, 1.6, Math.PI / 2], [-4, -8.8, Math.PI / 2 + 0.06], [6, -9.2, Math.PI / 2]]) decal(x, z, 1.8, 4.5, 1, rot);
  { const x = -4.2, z = -9.6;                                                                  // drain grate
    fb("seal", x - 0.33, -0.06, z - 0.23, x + 0.33, -0.012, z + 0.23, { rr: 0.003 });
    for (const [a, b, c, d] of [[x - 0.36, z - 0.26, x + 0.36, z - 0.22], [x - 0.36, z + 0.22, x + 0.36, z + 0.26], [x - 0.36, z - 0.22, x - 0.32, z + 0.22], [x + 0.32, z - 0.22, x + 0.36, z + 0.22]])
      fb("metal", a, -0.03, b, c, 0.006, d, { rr: 0.004, color: "#3a4048" });
    for (let k = 0; k < 4; k++) fb("metal", x - 0.21 + k * 0.14 - 0.035, -0.03, z - 0.2, x - 0.21 + k * 0.14 + 0.035, 0.01, z + 0.2, { soft: 0.45, color: "#4a5560" }); }
  for (let k = 0; k < 8; k++) { const z0 = -1.2 + k * 0.56;                                    // speed bump (striped segments)
    fb(k % 2 ? "paint" : "core", -8.95, -0.02, z0, -8.6, 0.075, z0 + 0.56, { rr: 0.03, color: k % 2 ? "#e8edf2" : "#ffffff" }); }
  // depth layers: hedge along the tree strip, tall slim trees beyond the side hedges, fence + houses across the road
  for (let x = -16; x < 16.4; x += 0.75) { if ([-11, -7.5, -3.5, 4.5, 8, 11.5].some((v) => Math.abs(v - x) < 0.95)) continue;
    piece("leaf", blobGeo(0.42 + r() * 0.1, x * 5), [x, 0.5, 10.95], [0, 0, 0], { tile: 0.6, color: ["#4e8a58", "#447c50", "#549058"][Math.floor(r() * 3)], jitter: 0.12 }); }
  for (const [x, z, s] of [[-20.5, -7, 1.3], [-21, 1.5, 1.15], [-20.2, 9, 1.35], [21, -6.5, 1.25], [20.6, 2.5, 1.4], [21.2, 9.5, 1.2]]) tree(x, z, s, -0.06);
  for (let x = -58; x <= 78; x += 2.4) fb("metal", x - 0.06, -0.06, 23.54, x + 0.06, 1.55, 23.66, { soft: 0.5, color: "#e8edf2" });
  for (const y of [0.35, 1.0, 1.45]) piece("metal", tube([V(-58, y, 23.6), V(78, y, 23.6)], 0.045, 8, 10), [0, 0, 0], [0, 0, 0], { color: "#e8edf2" });
  { const hm = new THREE.MeshStandardMaterial({ color: C("#ffffff"), roughness: 0.75, emissive: C("#8fb0d6"), emissiveIntensity: 0.08 });
    const hb = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), hm, 24), rf = new THREE.InstancedMesh(new THREE.ConeGeometry(0.75, 1, 4).rotateY(Math.PI / 4), hm, 24);
    const mx = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = V(1, 1, 1), tmp = new THREE.Color(); let n = 0;
    for (let x = -52; x < 72 && n < 24; x += 9 + r() * 4) { const w = 6 + r() * 3, h = 4 + r() * 3.5, d = 7, z = 31 + r() * 6;
      mx.compose(V(x, h / 2 - 0.06, z), q, sc.set(w, h, d)); hb.setMatrixAt(n, mx); hb.setColorAt(n, tmp.set(["#c4d0dc", "#9fb3c8", "#d6dde3", "#8ea4bc", "#b8c6d4"][n % 5]));
      mx.compose(V(x, h + 0.84, z), q, sc.set(w * 1.02, 1.8, d * 1.02)); rf.setMatrixAt(n, mx); rf.setColorAt(n, tmp.set(["#4a5560", "#3a4652", "#5e6872"][n % 3])); n++; }
    hb.count = rf.count = n; for (const m of [hb, rf]) { m.castShadow = true; m.receiveShadow = true; m.name = "lot_houses"; group.add(m); } }
  { const m = new THREE.Mesh(mergeGeometries(decals), decalMat); m.name = "lot_decals"; m.renderOrder = 1; m.receiveShadow = true; extra.push(m); }
  if (cardG.length) { const m = new THREE.Mesh(mergeGeometries(cardG), cardMat); m.name = "lot_roomCards"; extra.push(m);
    const g = new THREE.Mesh(mergeGeometries(cardGlassG), cardGlass); g.name = "lot_cardGlass"; g.renderOrder = 2; extra.push(g); }

  // ================================================================ merge buckets
  const noCast = new Set(["asphalt", "line", "seal", "light", "head", "grass"]);
  for (const [k, list] of Object.entries(B)) {
    if (!list.length) continue;
    const m = new THREE.Mesh(mergeGeometries(list.map((g) => clean(g))), M[k]); m.name = `lot_${k}`;
    m.castShadow = !noCast.has(k); m.receiveShadow = true; group.add(m);
  }
  for (const m of extra) { if (m.castShadow === undefined) m.castShadow = false; group.add(m); }

  // ================================================================ sky, sun, fill
  const sky = createExteriorSky(1500); sky.name = "sky"; sky.userData.setPreset(LOT_SKY); group.add(sky);
  const key = new THREE.DirectionalLight(0xffeed6, 3.1); key.name = "lotSun"; key.castShadow = true;
  key.shadow.mapSize.set(O.shadowMap, O.shadowMap); Object.assign(key.shadow.camera, { left: -O.shadowHalf, right: O.shadowHalf, top: O.shadowHalf, bottom: -O.shadowHalf, near: 1, far: 400 });
  key.shadow.camera.updateProjectionMatrix(); key.shadow.bias = -0.0003; key.shadow.normalBias = 0.025; key.shadow.radius = 4;
  if ("intensity" in key.shadow) key.shadow.intensity = 0.78;                  // soft, never-black shadows (sky fills them)
  group.add(key, key.target);
  const hemi = new THREE.HemisphereLight(0xa8cdf4, 0x9a8f80, 1.5);       // blue sky + warm ground bounce group.add(hemi);
  const keyLightPos = HERO.clone().addScaledVector(SUN_DIR, 60);
  const placeKey = (c) => { key.target.position.copy(c); key.position.copy(SUN_DIR).multiplyScalar(160).add(c); key.target.updateMatrixWorld(); };
  placeKey(HERO.clone());
  const _f = V(0, 0, 0), _c = V(0, 0, 0), _bx = V(0, 0, 0), _by = V(0, 0, 0), _up = V(0, 1, 0);
  const followShadow = (camera) => {
    camera.getWorldDirection(_f); _c.copy(camera.position).addScaledVector(_f, Math.min(O.shadowHalf * 0.5, 12)); _c.y = Math.min(_c.y, 4);
    _bx.crossVectors(_up, SUN_DIR).normalize(); _by.crossVectors(SUN_DIR, _bx).normalize();
    const texel = (2 * O.shadowHalf) / O.shadowMap, u = Math.round(_c.dot(_bx) / texel) * texel, v = Math.round(_c.dot(_by) / texel) * texel, d = _c.dot(SUN_DIR);
    _c.copy(_bx).multiplyScalar(u).addScaledVector(_by, v).addScaledVector(SUN_DIR, d); placeKey(_c);
  };

  // ================================================================ anchors + views
  const yawTo = (from, to) => Math.atan2(to.x - from.x, to.z - from.z);
  const stairTop = { pos: V(60, ST.top, ST.zTop - 0.2), yaw: 0 }, stairBottom = { pos: V(60, 0, ST.zBot + 0.45), yaw: 0 };
  const anchors = {
    heroBay: { pos: HERO.clone(), yaw: Math.PI },
    driverDoorSpot: { pos: V(0.95, 0, -3.35), yaw: Math.PI / 2 },
    walkPath: [V(0.95, 0, -3.35), V(0.55, 0, -5.4), V(0.1, 0, -7.2), V(0, 0, -10.4), V(0, 0.07, -11.8), V(0, 0.15, -12.8), V(0, 0.15, -13.7)],
    entrance: { pos: V(0, 0.15, -12.9), yaw: Math.PI },
    coworkerSpot: { pos: V(-3.6, F1, -14.8), yaw: 0 },
    windowCenter: V(-3.0, 5.0, -14.21),
    stairTop, stairBottom, keyLightPos,
    views: {
      lotWide: { pos: V(0.6, 7.2, 17.5), target: V(-0.4, 2.4, -10), fov: 58 },
      lotLow: { pos: V(5.2, 0.5, -9.2), target: V(1.2, 5.6, 4.5), fov: 68 },
      carFromBuilding: { pos: V(-2.9, 5.45, -15.25), target: V(2.5, 0.5, -4.0), fov: 46 },
      windowFromLot: { pos: V(-1.4, 1.55, -7.6), target: V(-3.1, 5.0, -14.2), fov: 32 },
      entrance: { pos: V(2.4, 1.7, -7.6), target: V(0, 1.55, -13.4), fov: 52 },
      stairsDown: { pos: V(60.55, 6.25, -4.6), target: V(59.9, 0.6, 3.4), fov: 66 },
      stairsBottom: { pos: V(59.4, 1.6, 7.8), target: V(60.1, 2.6, -1.0), fov: 62 },
    },
  };
  anchors.yawTo = yawTo;

  // ================================================================ API
  const set = ({ t = 0 } = {}) => {
    for (const s of sway) { s.pivot.rotation.z = 0.012 * s.k * Math.sin(t * 1.1 + s.ph) + 0.005 * Math.sin(t * 2.7 + s.ph * 2);
      s.pivot.rotation.x = 0.009 * s.k * Math.sin(t * 0.9 + s.ph * 1.3); }
  };
  const update = (t = 0, camera = null) => {
    sky.userData.update(t);
    if (camera) {
      if (O.shadowFollow) followShadow(camera);
      const inStair = camera.position.x > 45;                    // interior lights only near the stairwell (intensity, no recompile)
      stair[0].intensity = inStair ? 22 : 0; stair[1].intensity = inStair ? 22 : 0; stair[2].intensity = inStair ? 18 : 0;
      hemi.intensity = inStair ? 0.7 : 1.5;
    }
  };
  const makeEnvironment = (renderer, scene, intensity = 0.55) => {
    const s = new THREE.Scene(), sk = createExteriorSky(50); sk.userData.setPreset({ ...LOT_SKY, sunCol: [10, 9.6, 9], clouds: 0.15 }); s.add(sk);
    const pm = new THREE.PMREMGenerator(renderer), rt = pm.fromScene(s, 0.01, 0.1, 200); pm.dispose(); sk.geometry.dispose(); sk.material.dispose();
    if (scene) { scene.environment = rt.texture; scene.environmentIntensity = intensity; }
    return rt.texture;
  };
  set({ t: 0 }); group.updateMatrixWorld(true);
  return { group, set, update, anchors, keyLightPos, lights: { key, hemi, room: roomLight, stair }, hint: { exposure: 1.08, hdri: false, envIntensity: 0.55 },
    makeEnvironment, sunDir: SUN_DIR.clone() };
}
