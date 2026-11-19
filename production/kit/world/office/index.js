// Video 2: the psychology professor's office at Cornell (separate place at world origin (500, 0, 500)). Owner: interiors agent A.
// Local room: x -3.2..+3.2, z -3..+3, floor y 0, ceiling 3.1. Back wall (z -3): big green CHALKBOARD (left/centre) + bookcase
// (right). Left wall: floor-to-ceiling bookcase (instanced books with real depth). Right wall: window onto an evening campus
// (layered silhouettes: trees, gothic halls + clock tower, hills, sunset sky). Desk with green banker's lamp, papers, newspaper.
//
//   const office = await buildOffice();  scene.add(office.group);
//   office.setTime("evening");                     // only time (also accepts "night": darker sky, lamp only)
//   office.board.set({ line1, line2, graph, title });   // each 0..1, chalk draws in left->right / along the curve
//   office.update(t, camera);
//   office.anchors = { deskChair, deskChairSeat, boardSpot, boardTap (title point), board (centre), deskTop, newspaperSpot, lampPos,
//                      keyLightPos, boardPx(u,v), facing, views: { officeWide, boardWide, boardClose, boardText, deskClose, windowView } }  (world)
import * as THREE from "three";
import { pbr, plain } from "../materials.js";
import { plankField } from "../geometry.js";
import { buckets, box, boxMM, panelDoor, canvas, roundedCylinder, lathe, tube, place, clean, mergeGeometries, rng, clamp01, boxUV } from "../apartment/parts.js";

export const OFFICE_ORIGIN = new THREE.Vector3(500, 0, 500);
const XL = -3.2, XR = 3.2, ZB = -3.0, ZF = 3.0, CH = 3.1;
const BOARD = { x: -0.55, y: 1.85, w: 3.0, h: 1.5 };
const WIN = { z0: -1.65, z1: 0.05, y0: 0.9, y1: 2.55 };
const DESK = { x: 1.25, z: 0.55, w: 1.7, d: 0.85, h: 0.76 };
const V = (x, y, z) => new THREE.Vector3(x, y, z);

export const OFFICE_TIMES = {
  evening: { sun: [0xff9a50, 4.2], dir: [1, 0.22, 0.38], hemi: [0x8a7aa8, 0x3a2418, 0.55], lamp: 3.2, pic: 6, sky: 1 },
  night:   { sun: [0x6a80ff, 0.0], dir: [1, 0.4, 0.3], hemi: [0x24306a, 0x100a08, 0.35], lamp: 3.6, pic: 6, sky: 0.25 },
};

// ------------------------------------------------------------------------------------------------ chalkboard
function chalkBoard() {
  const W = 2048, H = 1024;
  const base = document.createElement("canvas"); base.width = W; base.height = H;
  { const g = base.getContext("2d"), r = rng(5); g.fillStyle = "#24392f"; g.fillRect(0, 0, W, H);
    for (let i = 0; i < 160; i++) { g.fillStyle = `rgba(220,235,220,${0.012 + r() * 0.035})`; g.beginPath(); g.ellipse(r() * W, r() * H, 60 + r() * 220, 14 + r() * 60, r() * 3, 0, 7); g.fill(); }
    for (let i = 0; i < 12000; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "255,255,255" : "0,0,0"},${r() * 0.05})`; g.fillRect(r() * W, r() * H, 2, 2); } }
  const noise = document.createElement("canvas"); noise.width = 512; noise.height = 512;
  { const g = noise.getContext("2d"), r = rng(9); for (let i = 0; i < 26000; i++) { g.fillStyle = `rgba(0,0,0,${0.25 + r() * 0.6})`; g.fillRect(r() * 512, r() * 512, 1 + r() * 2.5, 1 + r() * 1.5); } }
  const chalk = document.createElement("canvas"); chalk.width = W; chalk.height = H;
  const tex = canvas(W, H, (g) => g.drawImage(base, 0, 0)); const out = tex.userData.canvas;
  const FONT = (px) => `bold ${px}px "Segoe Print", "Comic Sans MS", "Arial Rounded MT Bold", sans-serif`;
  const S = { line1: 0, line2: 0, graph: 0, title: 0 }; let key = "";

  function text(g, s, x, y, px, p, align = "left") {
    if (p <= 0) return;
    g.font = FONT(px); const tw = g.measureText(s).width, x0 = align === "center" ? x - tw / 2 : x;
    g.save(); g.beginPath(); g.rect(x0 - 10, y - px * 1.2, (tw + 20) * p, px * 1.8); g.clip();
    const r = rng(Math.round(x + y));
    for (let k = 0; k < 4; k++) { g.fillStyle = `rgba(244,244,236,${k === 0 ? 0.92 : 0.22})`; g.textAlign = "left"; g.fillText(s, x0 + (r() - 0.5) * 3, y + (r() - 0.5) * 3); }
    g.restore(); return { x0, tw };
  }
  function path(g, pts, p, w = 9) {   // polyline drawn to fraction p of its length
    if (p <= 0 || pts.length < 2) return;
    let L = 0; const seg = []; for (let i = 1; i < pts.length; i++) { const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); seg.push(l); L += l; }
    let rem = L * Math.min(1, p); g.lineCap = "round"; g.lineJoin = "round";
    for (const [a, wd] of [[0.9, w], [0.25, w * 1.7]]) {
      g.strokeStyle = `rgba(244,244,236,${a})`; g.lineWidth = wd; g.beginPath(); g.moveTo(...pts[0]); let left = rem;
      for (let i = 1; i < pts.length && left > 0; i++) { const f = Math.min(1, left / seg[i - 1]);
        g.lineTo(pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * f, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * f); left -= seg[i - 1]; }
      g.stroke(); }
  }
  const arrowHead = (g, x, y, ang, a = 1) => { g.globalAlpha = a; path(g, [[x - 34 * Math.cos(ang - 0.5), y - 34 * Math.sin(ang - 0.5)], [x, y], [x - 34 * Math.cos(ang + 0.5), y - 34 * Math.sin(ang + 0.5)]], 1, 8); g.globalAlpha = 1; };
  // graph geometry (canvas px): axes origin (1180, 900), x to 1960, y up to 300
  const GX0 = 1180, GY0 = 905, GX1 = 1965, GY1 = 400;
  const curve = []; for (let i = 0; i <= 120; i++) { const u = i / 120;
    const y = 0.92 * Math.exp(-Math.pow((u - 0.13) / 0.075, 2)) + 0.08 + 0.62 * Math.pow(Math.max(0, (u - 0.32) / 0.68), 1.4) - 0.06 * Math.exp(-Math.pow((u - 0.33) / 0.08, 2));
    curve.push([GX0 + 20 + u * (GX1 - GX0 - 50), GY0 - 12 - y * (GY0 - GY1 - 40)]); }
  const peak = curve.reduce((a, b) => (b[1] < a[1] ? b : a));

  function redraw() {
    const g = chalk.getContext("2d"); g.clearRect(0, 0, W, H);
    // title
    text(g, "DUNNING–KRUGER EFFECT", W / 2, 140, 104, S.title, "center");
    if (S.title > 0) path(g, [[W / 2 - 560, 182], [W / 2 + 560, 186]], clamp01((S.title - 0.6) / 0.4), 7);
    // line 1 / line 2 with arrows
    const l1 = text(g, "SKILL TO DO IT", 100, 380, 84, S.line1);
    const l2 = text(g, "= SKILL TO JUDGE IT", 70, 660, 80, clamp01(S.line2 / 0.75));
    const ap = clamp01((S.line2 - 0.75) / 0.25);
    if (ap > 0) {
      for (const [x, dir] of [[360, 1], [560, -1]]) {        // down arrow + up arrow between the two lines
        const y0 = dir > 0 ? 420 : 570, y1 = dir > 0 ? 570 : 420;
        path(g, [[x, y0], [x + 8, (y0 + y1) / 2], [x, y1]], ap, 8);
        if (ap > 0.9) arrowHead(g, x, y1, dir > 0 ? Math.PI / 2 : -Math.PI / 2, clamp01((ap - 0.9) / 0.1)); }
    }
    // graph: axes (0..0.25), labels (0.15..0.3), curve (0.3..0.85), lemon man fades in (0.85..1)
    const gp = S.graph;
    if (gp > 0) {
      path(g, [[GX0, GY1 - 10], [GX0, GY0], [GX1, GY0]], clamp01(gp / 0.25), 9);
      if (gp > 0.25) { arrowHead(g, GX0, GY1 - 10, -Math.PI / 2, clamp01((gp - 0.22) / 0.05)); arrowHead(g, GX1, GY0, 0, clamp01((gp - 0.22) / 0.05)); }
      const lp = clamp01((gp - 0.15) / 0.15);
      text(g, "KNOWLEDGE", GX0 + 240, GY0 + 80, 52, lp);
      g.save(); g.translate(GX0 - 40, GY0 - 120); g.rotate(-Math.PI / 2); text(g, "CONFIDENCE", 0, 0, 52, lp); g.restore();
      path(g, curve, clamp01((gp - 0.3) / 0.55), 10);
      const mp = clamp01((gp - 0.85) / 0.15);
      if (mp > 0) {   // tiny lemon-headed stick man on the peak, arms up
        g.globalAlpha = mp; const [px, py] = peak, by = py - 18;
        path(g, [[px, by], [px, by - 70]], 1, 7);
        path(g, [[px - 26, by + 2], [px, by - 20], [px + 26, by + 2]], 1, 0.1);
        path(g, [[px, by], [px - 22, by + 4]], 1, 6); path(g, [[px, by], [px + 22, by + 4]], 1, 6);
        path(g, [[px - 34, by - 85], [px, by - 55], [px + 34, by - 85]], 1, 6);
        g.fillStyle = "rgba(246,216,60,0.95)"; g.beginPath(); g.ellipse(px, by - 100, 36, 27, 0, 0, 7); g.fill();
        g.beginPath(); g.ellipse(px - 38, by - 100, 7, 5, 0, 0, 7); g.fill(); g.beginPath(); g.ellipse(px + 38, by - 100, 7, 5, 0, 0, 7); g.fill();
        g.fillStyle = "rgba(40,50,40,0.9)"; g.beginPath(); g.arc(px - 11, by - 104, 4, 0, 7); g.arc(px + 11, by - 104, 4, 0, 7); g.fill();
        g.strokeStyle = "rgba(40,50,40,0.9)"; g.lineWidth = 4; g.beginPath(); g.arc(px, by - 98, 12, 0.3, Math.PI - 0.3); g.stroke();
        g.globalAlpha = 1;
      }
    }
    // chalk grain: punch tiny holes into the strokes
    g.globalCompositeOperation = "destination-out"; for (let y = 0; y < H; y += 512) for (let x = 0; x < W; x += 512) g.drawImage(noise, x, y); g.globalCompositeOperation = "source-over";
    const o = out.getContext("2d"); o.drawImage(base, 0, 0); o.drawImage(chalk, 0, 0); tex.needsUpdate = true;
  }
  redraw();
  return { tex, state: S,
    set(v = {}) { for (const k of Object.keys(S)) if (v[k] !== undefined) S[k] = clamp01(v[k]);
      const nk = Object.values(S).map((x) => Math.round(x * 500)).join(","); if (nk !== key) { key = nk; redraw(); } } };
}

// ------------------------------------------------------------------------------------------------ campus view layers
function layerTex(w, h, draw) { const t = canvas(w, h, draw); t.anisotropy = 4; return t; }
function campusLayers() {
  const g = new THREE.Group(); g.name = "campusView";
  const sky = layerTex(512, 512, (c, w, h) => { const gr = c.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, "#3a3a7a"); gr.addColorStop(0.45, "#a8608a");
    gr.addColorStop(0.72, "#f09a5a"); gr.addColorStop(0.86, "#ffd28a"); gr.addColorStop(1, "#ffe6b0"); c.fillStyle = gr; c.fillRect(0, 0, w, h);
    c.fillStyle = "rgba(255,240,210,0.55)"; for (let i = 0; i < 6; i++) { c.beginPath(); c.ellipse(80 + i * 80, 220 + (i % 3) * 30, 90, 10, 0, 0, 7); c.fill(); } });
  const hills = layerTex(1024, 256, (c, w, h) => { c.fillStyle = "#8a6a8a"; c.beginPath(); c.moveTo(0, h);
    for (let x = 0; x <= w; x += 16) c.lineTo(x, 120 + Math.sin(x * 0.006) * 40 + Math.sin(x * 0.019) * 14); c.lineTo(w, h); c.fill();
    c.fillStyle = "#6a4a6a"; c.beginPath(); c.moveTo(0, h); for (let x = 0; x <= w; x += 16) c.lineTo(x, 170 + Math.sin(x * 0.009 + 2) * 25); c.lineTo(w, h); c.fill(); });
  const halls = layerTex(1024, 512, (c, w, h) => { c.fillStyle = "#4a3048";
    const bldg = (x0, x1, top, roof) => { c.fillRect(x0, top, x1 - x0, h - top); c.beginPath(); c.moveTo(x0 - 6, top); c.lineTo((x0 + x1) / 2, top - roof); c.lineTo(x1 + 6, top); c.fill(); };
    bldg(0, 260, 300, 60); bldg(560, 1024, 280, 70); bldg(250, 420, 330, 40);
    c.fillRect(420, 120, 80, h - 120); c.beginPath(); c.moveTo(410, 120); c.lineTo(460, 30); c.lineTo(510, 120); c.fill();   // clock tower
    for (const x of [414, 496]) { c.beginPath(); c.moveTo(x - 6, 120); c.lineTo(x, 85); c.lineTo(x + 6, 120); c.fill(); }
    c.fillStyle = "#ffe7a8"; c.beginPath(); c.arc(460, 165, 18, 0, 7); c.fill(); c.fillStyle = "#4a3048"; c.fillRect(458, 150, 4, 16); c.fillRect(460, 163, 12, 4);
    const r = rng(3); for (let i = 0; i < 70; i++) { const x = r() * w, y = 300 + r() * 180; if ((x > 255 && x < 560 && y < 340) || (x > 410 && x < 510)) continue;
      c.fillStyle = r() > 0.45 ? "rgba(255,200,110,0.95)" : "rgba(90,60,80,0.9)"; c.fillRect(x, y, 10, 16); } });
  const trees = layerTex(1024, 512, (c, w, h) => { c.fillStyle = "#2e2030"; const r = rng(8);
    for (let i = 0; i < 22; i++) { const x = r() * w, y = 230 + r() * 160, rr = 50 + r() * 70; c.beginPath(); c.arc(x, y, rr, 0, 7); c.fill(); c.fillRect(x - 6, y, 12, h - y); }
    c.fillRect(0, 420, w, 92); c.fillStyle = "#2a1c20"; for (let x = 0; x < w; x += 70) c.fillRect(x, 440, 4, 40); c.fillRect(0, 446, w, 4); });
  const mk = (tex, w, h, x, y, transparent = true) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, transparent, fog: false, depthWrite: !transparent }));
    m.position.set(x, y, -0.8); m.rotation.y = -Math.PI / 2; m.userData.sky = false; g.add(m); return m; };
  const L = { sky: mk(sky, 260, 150, 150, 30, false), hills: mk(hills, 150, 38, 100, 5.5), halls: mk(halls, 20, 10, 30, 5.8), trees: mk(trees, 16, 8, 10, 1.2) };
  g.userData.layers = L; return g;
}

export async function buildOffice(opts = {}) {
  const O = { time: "evening", shadows: true, ...opts };
  const group = new THREE.Group(); group.name = "office"; group.position.copy(OFFICE_ORIGIN);
  const B = buckets(), r = rng(31);
  const [wallM, woodM, floorM, ceilM, bookcaseM, deskM] = await Promise.all([
    pbr("plaster", { color: [0.66, 0.78, 0.55], normalScale: 1.4 }),
    pbr("wood", { color: [0.78, 0.5, 0.32], normalScale: 1.0, roughness: 0.6 }),
    pbr("darkPlanks", { color: [1.25, 0.92, 0.72], normalScale: 1.2 }),
    pbr("plaster2", { color: [1.2, 1.1, 0.95], normalScale: 1.0 }),
    pbr("wood", { color: [0.7, 0.44, 0.28], normalScale: 1.0, roughness: 0.65 }),
    pbr("wood", { color: [1.05, 0.64, 0.4], normalScale: 0.8, roughness: 0.55 }),
  ]);
  const M = { wall: wallM, wood: woodM, floor: floorM, ceil: ceilM, bookcase: bookcaseM, desk: deskM,
    brass: plain(0xd6a84a, { roughness: 0.3, metalness: 0.85, relief: 0.1, envMapIntensity: 1.3, vertexColors: true }),
    leather: plain(0x2f5a3a, { roughness: 0.6, relief: 0.6, vertexColors: true }),
    chairLeather: plain(0x6a2a1c, { roughness: 0.5, relief: 0.5, vertexColors: true }),
    paper: plain(0xf2ecdc, { roughness: 0.85, relief: 0.15, vertexColors: true }),
    trim: plain(0x5a3a26, { roughness: 0.55, relief: 0.2, vertexColors: true }),
    ceramic: plain(0xf0ece2, { roughness: 0.25, relief: 0.05, vertexColors: true }),
    dark: plain(0x2a2624, { roughness: 0.5, relief: 0.2, vertexColors: true }),
    rug: plain(0x7a2a24, { roughness: 1, relief: 1.2, vertexColors: true }),
    globe: plain(0x3a7a9a, { roughness: 0.4, relief: 0.2, vertexColors: true }),
    leaf: plain(0x3f7a34, { roughness: 0.6, relief: 0.3, vertexColors: true, side: THREE.DoubleSide }),
  };
  // ---------------------------------------------------------------- shell (window hole in the right wall)
  const W = (...a) => B.add("wall", boxMM(...a, { tile: 1.5 }));
  W(XL - 0.2, -0.2, ZB - 0.2, XL, CH + 0.2, ZF + 0.2); W(XL, -0.2, ZB - 0.2, XR, CH + 0.2, ZB); W(XL, -0.2, ZF, XR, CH + 0.2, ZF + 0.2);
  W(XR, -0.2, ZB, XR + 0.25, CH + 0.2, WIN.z0); W(XR, -0.2, WIN.z1, XR + 0.25, CH + 0.2, ZF);
  W(XR, -0.2, WIN.z0, XR + 0.25, WIN.y0, WIN.z1); W(XR, WIN.y1, WIN.z0, XR + 0.25, CH + 0.2, WIN.z1);
  B.add("ceil", boxMM(XL - 0.2, CH, ZB - 0.2, XR + 0.25, CH + 0.2, ZF + 0.2, { tile: 1.6 }));
  B.add("dark", boxMM(XL, -0.2, ZB, XR, -0.04, ZF, { tone: 0x2a1a12 }));
  for (const g of plankField({ halfX: 3.2, rowHalf: () => 3, plankW: 0.14, thick: 0.04, seed: 12, tone: [0.75, 1.1] })) B.add("floor", g);
  // ceiling beams (dark wood coffers) + crown
  for (const x of [-1.6, 0, 1.6]) B.add("wood", boxMM(x - 0.1, CH - 0.2, ZB, x + 0.1, CH, ZF, { r: 0.012, grain: true, tile: 1.4 }));
  for (const z of [-1.0, 1.0]) B.add("wood", boxMM(XL, CH - 0.14, z - 0.08, XR, CH, z + 0.08, { r: 0.012, grain: true, tile: 1.4 }));
  // wainscot (raised panels) along back + front + right walls, chair rail, skirting, crown
  const wains = (axis, at, a0, a1, s) => { const n = Math.max(1, Math.round((a1 - a0) / 0.7)), pw = (a1 - a0) / n;
    for (let i = 0; i < n; i++) { const c = a0 + pw * (i + 0.5);
      for (const p of panelDoor(pw - 0.004, 0.92, 0.03, { frame: 0.08 })) {
        if (axis === "z") B.add("wood", place(p, [c, 0.48, at + s * 0.016], [0, s > 0 ? 0 : Math.PI, 0]));
        else B.add("wood", place(p, [at + s * 0.016, 0.48, c], [0, s > 0 ? Math.PI / 2 : -Math.PI / 2, 0])); } }
    if (axis === "z") { B.add("wood", boxMM(a0, 0.93, at, a1, 0.98, at + s * 0.05, { r: 0.01 })); B.add("trim", boxMM(a0, 0, at, a1, 0.14, at + s * 0.035)); B.add("wood", boxMM(a0, CH - 0.1, at, a1, CH, at + s * 0.08, { r: 0.012 })); }
    else { B.add("wood", boxMM(at, 0.93, a0, at + s * 0.05, 0.98, a1, { r: 0.01 })); B.add("trim", boxMM(at, 0, a0, at + s * 0.035, 0.14, a1)); B.add("wood", boxMM(at, CH - 0.1, a0, at + s * 0.08, CH, a1, { r: 0.012 })); } };
  wains("z", ZB, -2.05, 1.12, 1); wains("z", ZF, XL, XR, -1); wains("x", XR, ZB, WIN.z0 - 0.15, -1); wains("x", XR, WIN.z1 + 0.15, ZF, -1);
  B.add("wood", boxMM(XR - 0.05, 0.85, WIN.z0 - 0.15, XR, 0.98, WIN.z1 + 0.15, { r: 0.01 }));
  // window: reveal, sill, mullions, casing, open-able look (glass panes), curtains as heavy drapes
  { const T = (...a) => B.add("wood", boxMM(...a, { r: 0.008 }));
    T(XR - 0.02, WIN.y0, WIN.z0 - 0.02, XR + 0.25, WIN.y1, WIN.z0); T(XR - 0.02, WIN.y0, WIN.z1, XR + 0.25, WIN.y1, WIN.z1 + 0.02);
    T(XR - 0.02, WIN.y1, WIN.z0, XR + 0.25, WIN.y1 + 0.02, WIN.z1); T(XR - 0.08, WIN.y0 - 0.04, WIN.z0 - 0.12, XR + 0.25, WIN.y0, WIN.z1 + 0.12);
    for (const z of [WIN.z0 - 0.07, WIN.z1 + 0.07]) T(XR - 0.025, WIN.y0, z - 0.06, XR, WIN.y1 + 0.12, z + 0.06);
    T(XR - 0.03, WIN.y1 + 0.02, WIN.z0 - 0.15, XR, WIN.y1 + 0.16, WIN.z1 + 0.15);
    const zm = (WIN.z0 + WIN.z1) / 2;
    T(XR + 0.1, WIN.y0, zm - 0.03, XR + 0.15, WIN.y1, zm + 0.03); T(XR + 0.1, WIN.y0 + 1.05, WIN.z0, XR + 0.15, WIN.y0 + 1.1, WIN.z1);
    for (const y of [WIN.y0 + 0.5, WIN.y0 + 1.4]) T(XR + 0.11, y - 0.012, WIN.z0, XR + 0.14, y + 0.012, WIN.z1);
    for (const z of [zm - (zm - WIN.z0) / 2, zm + (WIN.z1 - zm) / 2]) T(XR + 0.11, WIN.y0, z - 0.012, XR + 0.14, WIN.y1, z + 0.012);
    const glass = new THREE.Mesh(new THREE.PlaneGeometry(WIN.z1 - WIN.z0, WIN.y1 - WIN.y0), new THREE.MeshStandardMaterial({ color: 0xffe0c0, roughness: 0.05, transparent: true, opacity: 0.1, envMapIntensity: 1.5, depthWrite: false }));
    glass.position.set(XR + 0.125, (WIN.y0 + WIN.y1) / 2, zm); glass.rotation.y = -Math.PI / 2; glass.renderOrder = 2; group.add(glass);
    // drapes (deep green velvet) gathered on both sides
    const dm = plain(0x2a4a34, { roughness: 0.9, relief: 0.8, side: THREE.DoubleSide });
    for (const [z, s] of [[WIN.z0 - 0.42, 1], [WIN.z1 + 0.42, -1]]) { const w = 0.5, h = CH - 0.15, gg = new THREE.PlaneGeometry(w, h, 40, 12); const p = gg.attributes.position;
      for (let i = 0; i < p.count; i++) { const u = p.getX(i) / w + 0.5; p.setZ(i, Math.sin(u * Math.PI * 7) * 0.04 + 0.04); } gg.computeVertexNormals();
      const d = new THREE.Mesh(gg, dm); d.position.set(XR - 0.1, h / 2 + 0.02, z); d.rotation.y = -Math.PI / 2 * s; d.rotation.y = Math.PI / 2; d.castShadow = true; d.receiveShadow = true; group.add(d); }
    const rod = new THREE.CylinderGeometry(0.018, 0.018, WIN.z1 - WIN.z0 + 1.4, 12); rod.rotateX(Math.PI / 2); B.add("brass", place(clean(rod), [XR - 0.12, CH - 0.2, zm]));
  }
  // campus view outside the window (attached to the room)
  const campus = campusLayers(); campus.position.set(XR, 0, 0); group.add(campus);

  // ---------------------------------------------------------------- chalkboard: oak frame, slate, chalk tray with chalk + eraser
  const board = chalkBoard();
  { const { x, y, w, h } = BOARD, z = ZB;
    B.add("wood", boxMM(x - w / 2 - 0.1, y - h / 2 - 0.1, z, x + w / 2 + 0.1, y + h / 2 + 0.1, z + 0.03, { r: 0.006 }));
    for (const [x0, y0, x1, y1] of [[x - w / 2 - 0.1, y + h / 2, x + w / 2 + 0.1, y + h / 2 + 0.1], [x - w / 2 - 0.1, y - h / 2 - 0.1, x + w / 2 + 0.1, y - h / 2],
      [x - w / 2 - 0.1, y - h / 2, x - w / 2, y + h / 2], [x + w / 2, y - h / 2, x + w / 2 + 0.1, y + h / 2]]) B.add("wood", boxMM(x0, y0, z, x1, y1, z + 0.065, { r: 0.012, grain: true, tile: 1.2 }));
    B.add("wood", boxMM(x - w / 2 - 0.08, y - h / 2 - 0.12, z, x + w / 2 + 0.08, y - h / 2 - 0.095, z + 0.16, { r: 0.006 }));
    B.add("wood", boxMM(x - w / 2 - 0.08, y - h / 2 - 0.12, z + 0.14, x + w / 2 + 0.08, y - h / 2 - 0.07, z + 0.165, { r: 0.006 }));
    for (let i = 0; i < 5; i++) B.add("ceramic", place(clean(new THREE.CylinderGeometry(0.006, 0.006, 0.08 - i * 0.008, 8), [0xf8f8f0, 0xf8f8f0, 0xf6e070, 0xf8f8f0, 0x9ad0f0][i]), [x - 0.9 + i * 0.07, y - h / 2 - 0.088, z + 0.08], [0, 0.3 * i, Math.PI / 2]));
    B.add("dark", box(0.13, 0.04, 0.05, [x + 0.8, y - h / 2 - 0.07, z + 0.08], { r: 0.008, tone: 0x8a6a4a }));
    B.add("paper", box(0.12, 0.012, 0.045, [x + 0.8, y - h / 2 - 0.044, z + 0.08], { r: 0.004, tone: 0x5a5a5a }));
    const slate = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: board.tex, roughness: 0.85, envMapIntensity: 0.25, emissive: 0xffffff, emissiveMap: board.tex, emissiveIntensity: 0.05 }));
    slate.position.set(x, y, z + 0.032); slate.receiveShadow = true; group.add(slate);
    // brass picture light over the board
    B.add("brass", place(clean(new THREE.CylinderGeometry(0.035, 0.035, 1.4, 16, 1, false, 0, Math.PI)), [x, y + h / 2 + 0.2, z + 0.22], [0, 0, Math.PI / 2]));
    for (const s of [-1, 1]) B.add("brass", clean(tube([V(x + s * 0.4, y + h / 2 + 0.16, z + 0.01), V(x + s * 0.4, y + h / 2 + 0.2, z + 0.12), V(x + s * 0.4, y + h / 2 + 0.2, z + 0.2)], 0.008, 12, 6)));
  }
  // ---------------------------------------------------------------- bookcases with instanced books (real depth, spines)
  const spine = canvas(64, 256, (g, w, h) => { g.fillStyle = "#c8c8c8"; g.fillRect(0, 0, w, h);
    g.fillStyle = "#f0d890"; for (const y of [22, 34, 210, 222]) g.fillRect(0, y, w, 4); g.fillStyle = "#e8e0c8"; g.fillRect(12, 80, w - 24, 60);
    g.fillStyle = "rgba(0,0,0,0.3)"; for (let i = 0; i < 4; i++) g.fillRect(16, 90 + i * 12, w - 32, 3); });
  const bookM = new THREE.MeshStandardMaterial({ map: spine, roughness: 0.6, envMapIntensity: 0.4 });
  const BOOKC = [0x7a1e1a, 0x1e3a5a, 0x2a4a2a, 0x5a3a1a, 0xa07a2a, 0x3a1e3a, 0x8a5a3a, 0x2a2a2a, 0xb0a080, 0x4a5a6a];
  const books = [];                                      // [x, y, z, w, h, d, rotY, rotZ, color] in the case frame
  const bookcase = (x0, x1, depth, h, shelves, frame) => {     // builds along local X, back at z 0, front at +depth. frame(geom) -> place
    B.add("bookcase", frame(boxMM(x0, 0, 0, x1, h, 0.02)));
    for (const x of [x0, x1 - 0.03]) B.add("bookcase", frame(boxMM(x, 0, 0, x + 0.03, h, depth, { r: 0.006 })));
    const n = Math.round((x1 - x0) / 0.9), bayW = (x1 - x0) / n;
    for (let i = 1; i < n; i++) B.add("bookcase", frame(boxMM(x0 + i * bayW - 0.015, 0, 0, x0 + i * bayW + 0.015, h, depth, { r: 0.006 })));
    B.add("bookcase", frame(boxMM(x0 - 0.03, h, 0, x1 + 0.03, h + 0.08, depth + 0.04, { r: 0.012 })));
    B.add("bookcase", frame(boxMM(x0, 0, 0, x1, 0.1, depth, { r: 0.006 })));
    const sh = (h - 0.12) / shelves;
    for (let k = 0; k <= shelves; k++) { const y = 0.1 + k * sh; if (k > 0) B.add("bookcase", frame(boxMM(x0, y - 0.025, 0, x1, y, depth + 0.01, { r: 0.006 })));
      if (k === shelves) break;
      for (let i = 0; i < n; i++) { let x = x0 + i * bayW + 0.03; const xe = x0 + (i + 1) * bayW - 0.03;
        while (x < xe - 0.03) {
          if (r() < 0.05) { x += 0.08 + r() * 0.1; continue; }                                 // gaps
          const bw = 0.022 + r() * 0.035, bh = Math.min(sh - 0.05, 0.2 + r() * 0.12), bd = 0.17 + r() * 0.08;
          if (x + bw > xe) break;
          const lean = (r() < 0.04 && x + bw + 0.06 < xe) ? 0.18 : 0;
          books.push({ p: [x + bw / 2 + (lean ? bh * 0.09 : 0), y + bh / 2 * Math.cos(lean), depth - 0.01 - bd / 2 - r() * 0.025], s: [bw, bh, bd], rz: -lean, c: BOOKC[Math.floor(r() * BOOKC.length)], frame });
          x += bw + 0.002 + (lean ? 0.06 : 0); }
        if (r() < 0.25) { const sx = xe - 0.25; for (let j = 0; j < 4; j++) books.push({ p: [sx, y + 0.02 + j * 0.035 + 0.0175, depth - 0.15], s: [0.22, 0.033, 0.16], rz: Math.PI / 2 * 0 , flat: true, c: BOOKC[Math.floor(r() * 10)], frame }); }
      } }
  };
  // left wall: case along z (local x -> world z), front faces +X
  bookcase(-2.95, 2.75, 0.34, 2.75, 7, (g) => { g.applyMatrix4(new THREE.Matrix4().makeRotationY(Math.PI / 2)); g.translate(XL, 0, 0); return g; });
  // back wall right of the board, front faces +Z
  bookcase(1.2, 3.18, 0.34, 2.75, 7, (g) => g.translate(0, 0, ZB));
  { const bg = new THREE.BoxGeometry(1, 1, 1); { const uv = bg.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i), uv.getY(i)); }
    // roll the book so the spine (+Z face) gets the full texture vertically: box face +Z uses uv (x,y) -> fine
    const inst = new THREE.InstancedMesh(bg, bookM, books.length); inst.castShadow = true; inst.receiveShadow = true;
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), dummy = new THREE.Object3D();
    books.forEach((b, i) => { dummy.position.set(...b.p); dummy.rotation.set(0, 0, b.flat ? Math.PI / 2 : b.rz); dummy.scale.set(...(b.flat ? [b.s[1], b.s[0], b.s[2]] : b.s)); dummy.updateMatrix();
      m.copy(dummy.matrix);
      inst.setMatrixAt(i, frameMatrix(b.frame).multiply(m)); inst.setColorAt(i, new THREE.Color(b.c).multiplyScalar(0.85 + r() * 0.3)); });
    inst.instanceMatrix.needsUpdate = true; inst.instanceColor.needsUpdate = true; inst.name = "books"; group.add(inst); }
  // a few objects on the shelves/tops: globe on the case, bust-like vase, clock
  B.add("ceramic", place(clean(lathe([[0, 0], [0.06, 0], [0.09, 0.08], [0.06, 0.2], [0.045, 0.26], [0.06, 0.28], [0, 0.28]], 20), 0x2a6a6a), [2.6, 2.83, ZB + 0.18]));

  // ---------------------------------------------------------------- desk, chair, lamp, papers, newspaper, textbooks
  const DT = DESK.h;
  { const { x, z, w, d } = DESK;
    B.add("desk", boxMM(x - w / 2 - 0.03, DT - 0.045, z - d / 2 - 0.03, x + w / 2 + 0.03, DT, z + d / 2 + 0.03, { r: 0.012, tile: 1.1 }));
    B.add("leather", boxMM(x - w / 2 + 0.12, DT, z - d / 2 + 0.1, x + w / 2 - 0.12, DT + 0.004, z + d / 2 - 0.1, { r: 0.002 }));
    for (const s of [-1, 1]) { const px = x + s * (w / 2 - 0.25);
      B.add("desk", boxMM(px - 0.24, 0.06, z - d / 2 + 0.02, px + 0.24, DT - 0.045, z + d / 2 - 0.02, { r: 0.01 }));
      B.add("desk", boxMM(px - 0.25, 0, z - d / 2 + 0.01, px + 0.25, 0.07, z + d / 2 - 0.01, { r: 0.012 }));
      for (let k = 0; k < 3; k++) { for (const p of panelDoor(0.44, 0.19, 0.025, { frame: 0.04 })) B.add("desk", place(p, [px, 0.17 + k * 0.2, z + d / 2 - 0.01]));
        B.add("brass", place(clean(new THREE.SphereGeometry(0.014, 12, 8)), [px, 0.17 + k * 0.2, z + d / 2 + 0.012])); } }
    B.add("desk", boxMM(x - 0.26, DT - 0.17, z + d / 2 - 0.05, x + 0.26, DT - 0.045, z + d / 2 - 0.02, { r: 0.008 }));   // centre drawer front
    B.add("desk", boxMM(x - 0.26, 0.06, z - d / 2 + 0.03, x + 0.26, DT - 0.17, z - d / 2 + 0.06, { r: 0.008 }));        // modesty panel? (back) — front faces camera
    // banker's lamp (brass base + green glass shade)
    const lx = x + 0.55, lz = z + 0.05;
    B.add("brass", place(clean(lathe([[0, 0], [0.09, 0], [0.095, 0.015], [0.06, 0.03], [0.015, 0.04], [0.012, 0.3], [0, 0.3]], 24)), [lx, DT, lz]));
    B.add("brass", place(clean(new THREE.CylinderGeometry(0.006, 0.006, 0.16, 8)), [lx + 0.07, DT + 0.25, lz + 0.03], [0.4, 0, 0]));
    B.add("brass", place(clean(new THREE.SphereGeometry(0.008, 8, 6)), [lx + 0.07, DT + 0.17, lz + 0.065]));
    var lampPos = V(lx, DT + 0.31, lz);
    // papers, notepad, pen, newspaper, textbooks, mug with pencils
    for (let i = 0; i < 6; i++) B.add("paper", box(0.21, 0.003, 0.297, [x - 0.45 + r() * 0.08, DT + 0.006 + i * 0.003, z + 0.05 + r() * 0.06], { r: 0.001, rot: [0, (r() - 0.5) * 0.5, 0], tone: i % 3 ? 0xf2ecdc : 0xe8e0c4 }));
    B.add("paper", box(0.2, 0.004, 0.3, [x - 0.08, DT + 0.008, z + 0.12], { r: 0.001, rot: [0, 0.15, 0], tone: 0xf6e890 }));
    B.add("dark", place(clean(new THREE.CylinderGeometry(0.004, 0.004, 0.14, 8), 0x1a2a4a), [x - 0.02, DT + 0.016, z + 0.15], [0, 0.6, Math.PI / 2]));
    for (let i = 0; i < 4; i++) B.add("paper", box(0.24, 0.045, 0.3, [x - 0.68, DT + 0.025 + i * 0.047, z - 0.18], { r: 0.006, rot: [0, 0.1 * i - 0.1, 0], tone: BOOKC[(i * 3) % 10] }));
    B.add("ceramic", place(clean(lathe([[0, 0], [0.04, 0], [0.042, 0.1], [0.038, 0.1], [0.036, 0.008], [0, 0.008]], 20), 0xe8e0d0), [x + 0.25, DT, z - 0.22]));
    for (let i = 0; i < 4; i++) B.add("dark", place(clean(new THREE.CylinderGeometry(0.004, 0.004, 0.17, 6), [0xd8a020, 0xd8a020, 0x2a2a2a, 0xc02020][i]), [x + 0.25 + (i - 1.5) * 0.012, DT + 0.12, z - 0.22], [0.15 * (i - 1.5), 0, 0.12 * (i - 1.5)]));
    // globe on a stand at the desk's right
    B.add("brass", place(clean(lathe([[0, 0], [0.07, 0], [0.05, 0.02], [0.012, 0.03], [0.012, 0.08], [0, 0.08]], 18)), [x + 0.78, DT, z - 0.25]));
    B.add("globe", place(clean(new THREE.SphereGeometry(0.11, 24, 16)), [x + 0.78, DT + 0.19, z - 0.25]));
    B.add("brass", place(clean(new THREE.TorusGeometry(0.12, 0.005, 6, 32, Math.PI)), [x + 0.78, DT + 0.19, z - 0.25], [0, 0.5, 0.4]));
  }
  // banker's lamp shade: green glass (glows from inside)
  const shadeM = new THREE.MeshStandardMaterial({ color: 0x1f7a3a, roughness: 0.15, metalness: 0.1, emissive: 0x2a8a3a, emissiveIntensity: 0.25, side: THREE.DoubleSide, envMapIntensity: 1.4 });
  const shade = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.34, 24, 1, true, Math.PI / 2, Math.PI), shadeM);
  shade.rotation.z = Math.PI / 2; shade.position.copy(lampPos).add(V(0, 0.02, 0)); shade.scale.set(0.55, 1, 0.55); shade.castShadow = true; group.add(shade);
  const capM = plain(0xd6a84a, { roughness: 0.3, metalness: 0.85, relief: 0.1 });
  for (const s of [-1, 1]) { const c = new THREE.Mesh(new THREE.CircleGeometry(0.066, 20, 0, Math.PI), capM); c.position.copy(shade.position).add(V(s * 0.17, 0, 0)); c.rotation.y = s * Math.PI / 2; c.rotation.z = 0; group.add(c); }
  const bulb = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.24, 10), new THREE.MeshStandardMaterial({ color: 0xfff0d0, emissive: 0xffd8a0, emissiveIntensity: 4 }));
  bulb.rotation.z = Math.PI / 2; bulb.position.copy(lampPos).add(V(0, -0.01, 0)); group.add(bulb);
  // newspaper on the desk (folded, headline)
  const npTex = canvas(512, 384, (g, w, h) => { g.fillStyle = "#ece6d4"; g.fillRect(0, 0, w, h); g.fillStyle = "#1a1612"; g.font = "900 22px Times New Roman"; g.textAlign = "center";
    g.fillText("THE ITHACA JOURNAL", w / 2, 34); g.fillRect(20, 44, w - 40, 3); g.font = "900 54px Arial Narrow, Arial"; g.fillText("LEMON BANDIT", w / 2, 110); g.fillText("CAUGHT", w / 2, 166);
    g.fillStyle = "#8a8478"; g.fillRect(24, 190, 210, 160); for (let i = 0; i < 14; i++) { g.fillStyle = "rgba(30,25,20,0.5)"; g.fillRect(250, 196 + i * 11, 236, 4); } });
  const np = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.006, 0.285), [plain(0xece6d4, { relief: 0 }), plain(0xece6d4, { relief: 0 }), new THREE.MeshStandardMaterial({ map: npTex, roughness: 0.85 }), plain(0xece6d4, { relief: 0 }), plain(0xece6d4, { relief: 0 }), plain(0xece6d4, { relief: 0 })]);
  np.position.set(DESK.x + 0.18, DT + 0.008, DESK.z + 0.18); np.rotation.y = -0.12; np.castShadow = true; np.receiveShadow = true; group.add(np);
  // desk chair (leather, brass studs) behind the desk, facing +Z
  { const cx = DESK.x, cz = DESK.z - 0.75, g = [];
    g.push(box(0.58, 0.12, 0.55, [0, 0.5, 0], { r: 0.05, seg: 3, tile: 0.5 }));
    g.push(box(0.6, 0.7, 0.14, [0, 0.92, -0.25], { r: 0.06, seg: 3, tile: 0.5, rot: [-0.12, 0, 0] }));
    for (const s of [-1, 1]) g.push(box(0.1, 0.24, 0.5, [s * 0.32, 0.66, -0.02], { r: 0.04, tile: 0.5 }));
    const cm = []; for (const x of g) cm.push(place(x, [cx, 0, cz])); for (const x of cm) B.add("chairLeather", x);
    B.add("dark", place(clean(new THREE.CylinderGeometry(0.03, 0.03, 0.4, 12)), [cx, 0.25, cz]));
    for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2; B.add("dark", place(box(0.32, 0.03, 0.04, [0.16, 0, 0], { r: 0.01 }), [cx, 0.06, cz], [0, a, 0]));
      B.add("dark", place(clean(new THREE.SphereGeometry(0.025, 10, 8)), [cx + Math.cos(a) * 0.31, 0.025, cz - Math.sin(a) * 0.31])); } }
  // rug + side chair + floor plant + framed diplomas + wall clock (front-left area stays clear for camera)
  B.add("rug", boxMM(DESK.x - 1.4, 0, DESK.z - 1.5, DESK.x + 1.1, 0.012, DESK.z + 1.2, { r: 0.004, tone: 0xffffff }));
  B.add("trim", boxMM(DESK.x - 1.32, 0.012, DESK.z - 1.42, DESK.x + 1.02, 0.014, DESK.z + 1.12, { r: 0.001, tone: 0xd8b060 }));
  B.add("rug", boxMM(DESK.x - 1.22, 0.014, DESK.z - 1.32, DESK.x + 0.92, 0.016, DESK.z + 1.02, { r: 0.001, tone: 0xffffff }));
  B.add("pot", place(clean(lathe([[0, 0], [0.13, 0], [0.16, 0.32], [0.17, 0.34], [0, 0.34]], 24), 0x8a4a2a), [2.75, 0, 1.6]));
  M.pot = plain(0xffffff, { roughness: 0.8, relief: 0.5, vertexColors: true });
  for (let i = 0; i < 14; i++) { const a = (i / 14) * Math.PI * 2, sh = new THREE.Shape(); sh.moveTo(0, 0); sh.quadraticCurveTo(0.09, 0.3, 0, 0.62); sh.quadraticCurveTo(-0.09, 0.3, 0, 0);
    B.add("leaf", place(clean(new THREE.ShapeGeometry(sh, 6)), [2.75, 0.33, 1.6], [-0.35 - r() * 0.4, a, 0])); }
  for (const [z, y] of [[1.0, 1.75], [1.75, 1.95]]) { B.add("wood", boxMM(XR - 0.03, y - 0.2, z - 0.27, XR, y + 0.2, z + 0.27, { r: 0.006, tone: 0x3a2214 }));
    B.add("paper", boxMM(XR - 0.035, y - 0.15, z - 0.21, XR - 0.03, y + 0.15, z + 0.21, { r: 0.001, tone: 0xf2e8cc })); }
  // ---------------------------------------------------------------- merge
  B.build(group, M, { dark: { cast: true } });

  // ---------------------------------------------------------------- lights (world-space via group)
  const sun = new THREE.DirectionalLight(0xffffff, 1); const sunT = new THREE.Object3D(); sunT.position.set(0, 0.8, -0.6); group.add(sun, sunT); sun.target = sunT;
  if (O.shadows) { sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -5, right: 5, top: 5, bottom: -5, near: 1, far: 40 });
    sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.025; sun.shadow.radius = 3; }
  const hemi = new THREE.HemisphereLight(0xffffff, 0x000000, 1); group.add(hemi);
  const lamp = new THREE.PointLight(0xffc27a, 1, 0, 2); lamp.position.copy(lampPos).add(V(0, -0.08, 0.05)); group.add(lamp);
  const pic = new THREE.SpotLight(0xffd8a0, 1, 0, 0.9, 1.0, 2); pic.position.set(BOARD.x, BOARD.y + BOARD.h / 2 + 0.18, ZB + 0.32); pic.target.position.set(BOARD.x, BOARD.y - 0.2, ZB); group.add(pic, pic.target);
  const room = new THREE.PointLight(0xffb070, 1, 0, 2); room.position.set(0, CH - 0.5, 1.2); group.add(room);

  let timeName = O.time; const keyLightPos = new THREE.Vector3();
  function setTime(name) { const T = OFFICE_TIMES[name]; if (!T) throw new Error(`office.setTime: unknown "${name}" (evening|night)`); timeName = name;
    sun.color.set(T.sun[0]); sun.intensity = T.sun[1]; sun.position.copy(sunT.position).addScaledVector(V(...T.dir).normalize(), 18);
    hemi.color.set(T.hemi[0]); hemi.groundColor.set(T.hemi[1]); hemi.intensity = T.hemi[2];
    lamp.intensity = T.lamp; pic.intensity = T.pic; room.intensity = 1.6;
    for (const m of Object.values(campus.userData.layers)) m.material.color.setScalar(T.sky);
    if (O.shadows) sun.castShadow = T.sun[1] > 0;
    group.updateMatrixWorld(true); (T.sun[1] > 0 ? sun : lamp).getWorldPosition(keyLightPos); }
  setTime(O.time);
  const W2 = (v) => v.clone().add(OFFICE_ORIGIN);
  const anchors = {
    deskChair: W2(V(DESK.x, 0, DESK.z - 0.75)), deskChairSeat: W2(V(DESK.x, 0.56, DESK.z - 0.73)), boardSpot: W2(V(BOARD.x + 1.05, 0, ZB + 0.75)),
    boardTap: W2(V(BOARD.x, BOARD.y + 0.53, ZB + 0.04)), board: W2(V(BOARD.x, BOARD.y, ZB + 0.04)), deskTop: W2(V(DESK.x, DT, DESK.z)),
    newspaperSpot: W2(np.position), lampPos: W2(lampPos), get keyLightPos() { return keyLightPos; },
    boardPx: (u, v) => W2(V(BOARD.x - BOARD.w / 2 + u * BOARD.w, BOARD.y + BOARD.h / 2 - v * BOARD.h, ZB + 0.04)),   // canvas fraction -> world
    facing: { deskChair: 0, boardSpot: -0.5 },
    views: {
      officeWide: { pos: W2(V(-1.75, 1.8, 2.65)), target: W2(V(0.85, 1.2, -1.5)), fov: 66 },
      boardWide: { pos: W2(V(0.6, 1.75, 2.8)), target: W2(V(-0.55, 1.35, -2.2)), fov: 66 },
      boardClose: { pos: W2(V(0.2, 1.85, -0.55)), target: W2(V(0.2, 1.85, -3.0)), fov: 54 },          // title + graph + lemon man
      boardText: { pos: W2(V(-1.3, 1.85, -0.75)), target: W2(V(-1.3, 1.85, -3.0)), fov: 54 },         // SKILL TO DO IT = SKILL TO JUDGE IT
      windowView: { pos: W2(V(0.6, 1.6, 0.9)), target: W2(V(3.2, 1.7, -0.8)), fov: 55 },
      deskClose: { pos: W2(V(0.85, 1.4, 2.05)), target: W2(V(DESK.x, 1.05, DESK.z - 0.6)), fov: 46 },
    },
  };
  return { group, anchors, board: { set: board.set, get state() { return { ...board.state }; }, texture: board.tex }, setTime, get time() { return timeName; },
    update(t = 0) {}, lights: { sun, hemi, lamp, pic, room }, newspaper: np, campus };
}

// matrix of a frame() transform (frames are pure rotate+translate functions applied to geometry)
const _fm = new WeakMap();
function frameMatrix(frame) {
  if (_fm.has(frame)) return _fm.get(frame).clone();
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute([0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1], 3)); frame(g);
  const p = g.attributes.position, o = V(p.getX(0), p.getY(0), p.getZ(0));
  const ax = (i) => V(p.getX(i), p.getY(i), p.getZ(i)).sub(o);
  const m = new THREE.Matrix4().makeBasis(ax(1), ax(2), ax(3)).setPosition(o); _fm.set(frame, m); return m.clone();
}
