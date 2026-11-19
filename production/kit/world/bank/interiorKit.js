// Interiors kit (bank + police, video 2): bucket builder, procedural textures (marble, lino, paper, posters, clock) and
// modelled relief pieces (tile floors, cinder-block walls, raised-panel wainscot, pilasters, cornices, picture frames, CCTV camera,
// brass stanchions + ropes, jail bars with weld beads). Read-only use of ../geometry.js and ../materials.js.
import * as THREE from "three";
import { roundedBox, boxUV, grainUV, tint, clean, mergeGeometries, lathe, extrude, place, tube, roundedCylinder } from "../geometry.js";
import { canvasTex } from "../materials.js";
import { rng } from "../../shared/assets.js";

export const C = (h) => (h instanceof THREE.Color ? h.clone() : Array.isArray(h) ? new THREE.Color(...h) : new THREE.Color(h));

/** Bucket builder: pieces are grouped per material key and merged into one mesh per key (one draw call each). */
export function makeBuilder(M, seed = 11) {
  const r = rng(seed);
  const B = Object.fromEntries(Object.keys(M).map((k) => [k, []]));
  const add = (k, g) => { if (!B[k]) throw new Error("no material bucket " + k); B[k].push(g); return g; };
  /** geometry in its own space -> uv (box|grain|keep) -> tint -> rotate/translate -> bucket */
  const piece = (k, g, pos = [0, 0, 0], rot = [0, 0, 0], { uv = "box", tile = 1, swap = false, color = 0xffffff, jitter = 0 } = {}) => {
    if (uv === "box") boxUV(g, tile, [r() * 7, r() * 7], swap); else if (uv === "grain") grainUV(g, tile, [r() * 7, r() * 7]);
    const c = C(color); if (jitter) c.multiplyScalar(1 - jitter / 2 + r() * jitter);
    tint(g, c); place(g, pos, rot); return add(k, g);
  };
  const build = (parent, { cast = {}, noCast = [], noReceive = [], names = {} } = {}) => {
    const meshes = {};
    for (const [k, list] of Object.entries(B)) {
      if (!list.length) continue;
      const m = new THREE.Mesh(mergeGeometries(list.map((g) => clean(g)), false), M[k]);
      m.name = names[k] || k; m.castShadow = !noCast.includes(k); m.receiveShadow = !noReceive.includes(k);
      parent.add(m); meshes[k] = m; B[k] = [];
    }
    return meshes;
  };
  return { r, B, add, piece, build };
}

// ------------------------------------------------------------------------------------------------ procedural textures
function valueNoise(seed, cells) {
  const r = rng(seed), g = Array.from({ length: cells * cells }, r);
  return (x, y) => { // x,y in [0,1) tileable
    const fx = x * cells, fy = y * cells, x0 = Math.floor(fx), y0 = Math.floor(fy), tx = fx - x0, ty = fy - y0;
    const at = (i, j) => g[((j % cells + cells) % cells) * cells + ((i % cells + cells) % cells)];
    const sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty);
    return (at(x0, y0) * (1 - sx) + at(x0 + 1, y0) * sx) * (1 - sy) + (at(x0, y0 + 1) * (1 - sx) + at(x0 + 1, y0 + 1) * sx) * sy;
  };
}

/** Tileable marble: soft clouds + branching veins. Light base so per-tile vertex colours give the hue. */
export function marbleTex({ size = 512, seed = 7, vein = 0.55, base = [236, 232, 224], veinCol = [120, 112, 104], freq = 3 } = {}) {
  const n = [valueNoise(seed, 4), valueNoise(seed + 1, 8), valueNoise(seed + 2, 16), valueNoise(seed + 3, 32), valueNoise(seed + 4, 64)];
  const t = canvasTex(size, size, (g, w, h) => {
    const img = g.createImageData(w, h), d = img.data;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const u = x / w, v = y / h;
      const turb = n[0](u, v) * 0.5 + n[1](u, v) * 0.25 + n[2](u, v) * 0.14 + n[3](u, v) * 0.07 + n[4](u, v) * 0.04;
      const s = Math.sin((u + v * 0.6) * Math.PI * 2 * freq + turb * 9.0);
      const s2 = Math.sin((u * 0.4 - v) * Math.PI * 2 * (freq + 1) + turb * 13.0 + 1.7);
      const vv = Math.max(Math.pow(1 - Math.abs(s), 14), 0.6 * Math.pow(1 - Math.abs(s2), 22)) * vein;
      const cloud = 0.9 + 0.1 * n[1](u + 0.3, v);
      const i = 4 * (y * w + x);
      for (let c = 0; c < 3; c++) d[i + c] = (base[c] * cloud) * (1 - vv) + veinCol[c] * vv;
      d[i + 3] = 255;
    }
    g.putImageData(img, 0, 0);
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}

/** Speckled vinyl tile (police lino). */
export function linoTex({ size = 256, seed = 4, base = "#d8d8d2" } = {}) {
  const t = canvasTex(size, size, (g, w, h) => {
    const r = rng(seed); g.fillStyle = base; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 2600; i++) { const k = r(); g.fillStyle = k < 0.5 ? `rgba(60,64,70,${0.15 + r() * 0.3})` : k < 0.85 ? `rgba(255,255,255,${0.2 + r() * 0.4})` : `rgba(120,110,90,${0.3})`;
      g.fillRect(r() * w, r() * h, 1 + r() * 3, 1 + r() * 2); }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}

/** Poster / notice: bg, big lines, optional stripe band. lines: [[text, sizeFrac, color?], ...] */
export function posterTex(lines, { w = 512, h = 720, bg = "#f2ead8", ink = "#2a2a2a", band = null, font = "Arial Black", seed = 3, photo = false } = {}) {
  return canvasTex(w, h, (g) => {
    const r = rng(seed); g.fillStyle = bg; g.fillRect(0, 0, w, h);
    if (band) { g.fillStyle = band; g.fillRect(0, h * 0.06, w, h * 0.16); }
    if (photo) { // mugshot-style silhouette block (wanted posters)
      g.fillStyle = "#9a9488"; g.fillRect(w * 0.22, h * 0.24, w * 0.56, h * 0.36);
      g.fillStyle = "#3a3630"; g.beginPath(); g.arc(w * 0.5, h * 0.38, w * 0.11, 0, 7); g.fill(); g.fillRect(w * 0.32, h * 0.47, w * 0.36, h * 0.13);
    }
    g.textAlign = "center"; g.textBaseline = "middle";
    let y = h * 0.1;
    for (const [txt, sz, color, yAt] of lines) { const px = sz * h; g.font = `900 ${px}px "${font}", sans-serif`; g.fillStyle = color || ink;
      if (yAt !== undefined) y = yAt * h; g.fillText(txt, w / 2, y + px * 0.5); y += px * 1.25; }
    for (let i = 0; i < 1500; i++) { g.fillStyle = `rgba(80,60,30,${r() * 0.05})`; g.fillRect(r() * w, r() * h, 1 + r() * 6, 1 + r() * 6); } // grime
    const vg = g.createRadialGradient(w / 2, h / 2, h * 0.3, w / 2, h / 2, h * 0.75); vg.addColorStop(0, "rgba(0,0,0,0)"); vg.addColorStop(1, "rgba(90,60,20,0.25)");
    g.fillStyle = vg; g.fillRect(0, 0, w, h);
  });
}

/** Clock dial with numerals and hands at hh:mm. */
export function clockTex({ size = 512, hh = 10, mm = 42, face = "#f4eedf", ink = "#2a1d14" } = {}) {
  return canvasTex(size, size, (g, w) => {
    const c = w / 2; g.fillStyle = face; g.fillRect(0, 0, w, w);
    g.strokeStyle = ink; g.fillStyle = ink; g.textAlign = "center"; g.textBaseline = "middle"; g.font = `bold ${w * 0.1}px "Times New Roman", serif`;
    for (let i = 0; i < 60; i++) { const a = (i / 60) * Math.PI * 2, r0 = i % 5 ? c * 0.86 : c * 0.8;
      g.lineWidth = i % 5 ? w * 0.004 : w * 0.012; g.beginPath(); g.moveTo(c + Math.sin(a) * r0, c - Math.cos(a) * r0); g.lineTo(c + Math.sin(a) * c * 0.9, c - Math.cos(a) * c * 0.9); g.stroke(); }
    const R = ["XII", "I", "II", "III", "IIII", "V", "VI", "VII", "VIII", "IX", "X", "XI"];
    for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; g.fillText(R[i], c + Math.sin(a) * c * 0.66, c - Math.cos(a) * c * 0.66); }
    const hand = (a, len, wd) => { g.lineWidth = wd; g.lineCap = "round"; g.beginPath(); g.moveTo(c - Math.sin(a) * len * 0.15, c + Math.cos(a) * len * 0.15); g.lineTo(c + Math.sin(a) * len, c - Math.cos(a) * len); g.stroke(); };
    hand(((hh % 12) + mm / 60) / 12 * Math.PI * 2, c * 0.45, w * 0.03); hand(mm / 60 * Math.PI * 2, c * 0.7, w * 0.02);
    g.beginPath(); g.arc(c, c, w * 0.025, 0, 7); g.fill();
  });
}

/** Text on a flat colour (plaques, gilt letters on dark ground, signs). */
export function labelTex(text, { w = 1024, h = 160, bg = "#1d3a2c", ink = "#e2c070", font = "Times New Roman", weight = "bold", size = 0.62, spacing = 0 } = {}) {
  return canvasTex(w, h, (g) => { g.fillStyle = bg; g.fillRect(0, 0, w, h); g.fillStyle = ink; g.textAlign = "center"; g.textBaseline = "middle";
    g.font = `${weight} ${size * h}px "${font}", serif`; if (spacing) g.letterSpacing = `${spacing}px`; g.fillText(text, w / 2, h * 0.54); });
}

// ------------------------------------------------------------------------------------------------ relief builders
/** Rectangular tile field on y = top (tiles sit ON top, grout slab below). colorAt(i, j) -> colour. Returns geometries. */
export function tileField({ x0, x1, z0, z1, tile = 0.6, gap = 0.006, thick = 0.014, bevel = 0.004, top = 0, colorAt = () => 0xffffff, tex = 1.2, r, simple = false }) {
  const out = []; const nx = Math.round((x1 - x0) / tile), nz = Math.round((z1 - z0) / tile), tx = (x1 - x0) / nx, tz = (z1 - z0) / nz;
  for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) {
    const g = simple ? new THREE.BoxGeometry(tx - gap, thick, tz - gap) : roundedBox(tx - gap, thick, tz - gap, bevel, 1);
    boxUV(g, tex, [r() * 9, r() * 9], r() > 0.5);
    const c = C(colorAt(i, j)); c.multiplyScalar(0.94 + r() * 0.1); tint(g, c);
    g.translate(x0 + (i + 0.5) * tx, top - thick / 2 + (r() - 0.5) * 0.0015, z0 + (j + 0.5) * tz); out.push(g);
  }
  return out;
}

/** Cinder-block wall face: blocks in local XY (x along the wall 0..len, y 0..h), front face at z = 0 (+Z = room side),
 *  mortar bed recessed behind. Openings: [{x0, x1, y0, y1}] skipped. Returns geometries (blocks only). */
export function blockWall({ len, h, bw = 0.4, bh = 0.2, depth = 0.06, gap = 0.012, openings = [], r, colorAt = () => 0xffffff, jitter = 0.08, bevel = false }) {
  const out = [];
  for (let row = 0, y = 0; y < h - 0.01; row++, y += bh) {
    const yh = Math.min(bh, h - y); const off = row % 2 ? bw / 2 : 0;
    for (let x = -off; x < len; x += bw) {
      const a = Math.max(0, x), b = Math.min(len, x + bw); if (b - a < 0.03) continue;
      const cx = (a + b) / 2, cy = y + yh / 2;
      if (openings.some((o) => cx > o.x0 && cx < o.x1 && cy > o.y0 && cy < o.y1)) continue;
      const g = bevel ? roundedBox(b - a - gap, yh - gap, depth, 0.01, 1) : new THREE.BoxGeometry(b - a - gap, yh - gap, depth); boxUV(g, 0.9, [r() * 9, r() * 9]);
      const c = C(colorAt(cx, cy)); c.multiplyScalar(1 - jitter / 2 + r() * jitter); tint(g, c);
      g.translate(cx, cy, -depth / 2 + (r() - 0.5) * 0.003); out.push(g);
    }
  }
  return out;
}

/** Raised-panel wainscot/panelling in local XY (x 0..len, y 0..h), face toward +Z, back at z = 0.
 *  Frame (stiles + rails) proud by 0.025, panels sunk with a raised field. Returns { frame: [], panel: [] } geometries. */
export function panelWall({ len, h, bays = null, rail = 0.09, stile = 0.09, r, cap = true }) {
  const n = bays || Math.max(1, Math.round(len / 0.9)), bwid = len / n, frame = [], panel = [];
  const fz = 0.022, pz = 0.012;
  // back board
  { const g = new THREE.BoxGeometry(len, h, 0.012); g.translate(len / 2, h / 2, 0.006); panel.push(g); }
  for (const y of [rail / 2, h - rail / 2]) { const g = roundedBox(len, rail, fz, 0.005, 1); grainUV(g, 1.2, [r() * 9, r() * 9]); g.translate(len / 2, y, 0.012 + fz / 2); frame.push(g); }
  for (let i = 0; i <= n; i++) { const g = roundedBox(stile, h - 2 * rail, fz, 0.005, 1); grainUV(g, 1.2, [r() * 9, r() * 9]); g.translate(i * bwid + (i === 0 ? stile / 2 : i === n ? -stile / 2 : 0), h / 2, 0.012 + fz / 2); frame.push(g); }
  for (let i = 0; i < n; i++) {
    const pw = bwid - stile - 0.05, ph = h - 2 * rail - 0.05, cx = (i + 0.5) * bwid;
    const g = roundedBox(pw, ph, pz, 0.012, 2); grainUV(g, 1.2, [r() * 9, r() * 9]); g.translate(cx, h / 2, 0.012 + pz / 2); panel.push(g);
    // bevel moulding round the field (4 slim strips)
    for (const [w, hh, x, y] of [[pw + 0.03, 0.018, cx, h / 2 + ph / 2 + 0.005], [pw + 0.03, 0.018, cx, h / 2 - ph / 2 - 0.005], [0.018, ph, cx - pw / 2 - 0.005, h / 2], [0.018, ph, cx + pw / 2 + 0.005, h / 2]]) {
      const m = roundedBox(w, hh, 0.03, 0.007, 2); boxUV(m, 1); m.translate(x, y, 0.012 + 0.015); frame.push(m); }
  }
  if (cap) { const g = roundedBox(len, 0.05, 0.06, 0.015, 2); grainUV(g, 1.2); g.translate(len / 2, h + 0.02, 0.03); frame.push(g);
    const g2 = roundedBox(len, 0.12, 0.035, 0.01, 2); grainUV(g2, 1.2); g2.translate(len / 2, 0.06, 0.03); frame.push(g2); }   // cap rail + skirting
  return { frame, panel };
}

/** Classical pilaster in local space (base at y = 0, against a wall at z = 0, protruding +Z). Returns geometries. */
export function pilaster({ h, w = 0.5, d = 0.14, flutes = 5, capH = 0.32, baseH = 0.36 }) {
  const out = [];
  const box = (bw, bh, bd, y, z = 0, rr = 0.01) => { const g = roundedBox(bw, bh, bd, rr, 2); boxUV(g, 1.2); g.translate(0, y, bd / 2 + z); out.push(g); };
  box(w + 0.14, baseH * 0.55, d + 0.07, baseH * 0.275); box(w + 0.08, baseH * 0.3, d + 0.04, baseH * 0.7); box(w + 0.04, baseH * 0.15, d + 0.02, baseH * 0.93);
  box(w, h - baseH - capH, d, baseH + (h - baseH - capH) / 2);
  // flutes: round reeds standing proud of the shaft (catch light + shadow)
  const fh = h - baseH - capH - 0.3;
  for (let i = 0; i < flutes; i++) { const x = -w / 2 + w * (i + 0.5) / flutes; const g = new THREE.CylinderGeometry(0.022, 0.022, fh, 10, 1); const s = new THREE.SphereGeometry(0.022, 10, 6);
    boxUV(g, 1); g.translate(x, baseH + 0.15 + fh / 2, d); out.push(g); for (const yy of [baseH + 0.15, baseH + 0.15 + fh]) { const ss = s.clone(); boxUV(ss, 1); ss.translate(x, yy, d); out.push(ss); } }
  const y0 = h - capH; box(w + 0.03, capH * 0.18, d + 0.02, y0 + capH * 0.09); box(w + 0.1, capH * 0.3, d + 0.05, y0 + capH * 0.33, 0, 0.03);
  box(w + 0.18, capH * 0.22, d + 0.09, y0 + capH * 0.6); box(w + 0.24, capH * 0.22, d + 0.12, y0 + capH * 0.86);
  return out;
}

/** Stepped + coved cornice along local X (0..len), against a wall at z = 0, top at y = 0 (hangs below). */
export function cornice(len, { depth = 0.28, height = 0.36 } = {}) {
  const s = new THREE.Shape(); const k = height, d = depth;
  s.moveTo(0, 0); s.lineTo(d, 0); s.lineTo(d, -0.06 * k / 0.36); s.lineTo(d * 0.86, -0.08 * k / 0.36);
  s.quadraticCurveTo(d * 0.35, -0.12 * k / 0.36, d * 0.3, -0.24 * k / 0.36);         // cove
  s.lineTo(d * 0.22, -0.26 * k / 0.36); s.lineTo(d * 0.22, -0.3 * k / 0.36); s.lineTo(d * 0.1, -0.31 * k / 0.36); s.lineTo(d * 0.1, -k); s.lineTo(0, -k); s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: len, bevelEnabled: false, curveSegments: 8 });
  g.rotateY(-Math.PI / 2); g.translate(len, 0, 0);          // length (z) -> x 0..len, depth (x) -> +z; pure rotation keeps winding
  g.computeVertexNormals(); boxUV(g, 1.2); return g;
}

/** Profiled picture frame (4 bevelled mitred-looking bars + inner lip) in local XY centred at 0, front toward +Z. */
export function frameGeoms(w, h, { bar = 0.06, depth = 0.04 } = {}) {
  const out = [];
  for (const [bw, bh, x, y] of [[w + bar * 2, bar, 0, h / 2 + bar / 2], [w + bar * 2, bar, 0, -h / 2 - bar / 2], [bar, h, -w / 2 - bar / 2, 0], [bar, h, w / 2 + bar / 2, 0]]) {
    const g = roundedBox(bw, bh, depth, Math.min(bar, depth) * 0.35, 3); grainUV(g, 0.8); g.translate(x, y, depth / 2); out.push(g);
    const lip = roundedBox(bw === bar ? bar * 0.35 : bw - bar, bh === bar ? bar * 0.35 : bh, depth * 0.5, 0.004, 1);
    boxUV(lip, 1); lip.translate(x + (bw === bar ? -Math.sign(x) * bar * 0.5 : 0), y + (bh === bar && bw !== bar ? -Math.sign(y) * bar * 0.5 : 0), depth * 0.85); out.push(lip);
  }
  return out;
}

/** Brass stanchion (local, base at y 0). */
export function stanchionGeom(h = 0.98) {
  return lathe([[0.0001, 0], [0.16, 0], [0.165, 0.012], [0.15, 0.03], [0.07, 0.05], [0.035, 0.08], [0.028, 0.1], [0.026, h - 0.1], [0.034, h - 0.08],
    [0.034, h - 0.06], [0.026, h - 0.05], [0.042, h - 0.03], [0.045, h], [0.035, h + 0.03], [0.0001, h + 0.045]], 28);
}

/** Sagging rope between two points (tube). */
export function ropeGeom(a, b, sag = 0.12, r = 0.022) {
  const pts = []; for (let i = 0; i <= 12; i++) { const t = i / 12; const p = a.clone().lerp(b, t); p.y -= sag * 4 * t * (1 - t); pts.push(p); }
  return tube(pts, r, 24, 10);
}

/** 1995 CCTV box camera on a wall bracket. Local: lens looks down -Z, mount plate at +Z behind. Returns { group, lensLocal, led }. */
export function cctvCamera({ body, metal, lensM, led }) {
  const g = new THREE.Group(); g.name = "cctv";
  const add = (geo, m, p, rot = [0, 0, 0]) => { const me = new THREE.Mesh(geo, m); me.position.set(...p); me.rotation.set(...rot); me.castShadow = true; me.receiveShadow = true; g.add(me); return me; };
  add(roundedBox(0.16, 0.14, 0.38, 0.02, 3), body, [0, 0, 0]);                         // housing
  add(roundedBox(0.2, 0.012, 0.44, 0.005, 2), body, [0, 0.082, -0.03]);                // sun hood
  for (const s of [-1, 1]) add(roundedBox(0.008, 0.05, 0.4, 0.003, 1), body, [s * 0.096, 0.06, -0.03]);
  add(roundedCylinder(0.048, 0.08, 0.01, 24), metal, [0, 0, -0.22], [Math.PI / 2, 0, 0]);   // lens barrel
  add(new THREE.CylinderGeometry(0.036, 0.036, 0.01, 24), lensM, [0, 0, -0.262], [Math.PI / 2, 0, 0]); // glass
  for (let i = 0; i < 3; i++) add(new THREE.TorusGeometry(0.049, 0.004, 6, 24), metal, [0, 0, -0.19 - i * 0.022]);   // focus ring grooves
  const l = add(new THREE.SphereGeometry(0.009, 10, 8), led, [0.055, 0.035, -0.19]);    // red REC led
  for (let i = 0; i < 5; i++) add(roundedBox(0.12, 0.006, 0.01, 0.002, 1), metal, [0, -0.04 + i * 0.018, 0.192]);   // rear vents
  add(new THREE.CylinderGeometry(0.012, 0.012, 0.12, 12), metal, [0, -0.11, 0.05]);    // pan-tilt stem
  add(roundedBox(0.08, 0.04, 0.08, 0.01, 2), metal, [0, -0.07, 0.05]);
  add(tube([new THREE.Vector3(0, 0.03, 0.18), new THREE.Vector3(0, 0.06, 0.32), new THREE.Vector3(0.03, -0.02, 0.42)], 0.008, 16, 6), lensM, [0, 0, 0]); // cable
  return { group: g, lensLocal: new THREE.Vector3(0, 0, -0.27), led: l };
}

/** Wall bracket arm for the CCTV (local: wall at z=0, arm toward +Z to length L). */
export function bracketGeoms(L = 0.42) {
  const out = []; const p = roundedBox(0.16, 0.22, 0.03, 0.008, 2); boxUV(p, 1); p.translate(0, 0, 0.015); out.push(p);
  const a = roundedBox(0.05, 0.05, L, 0.01, 2); boxUV(a, 1); a.translate(0, 0, L / 2); out.push(a);
  const s = roundedBox(0.03, 0.03, L * 0.75, 0.006, 1); boxUV(s, 1); s.rotateX(-0.6); s.translate(0, -0.1, L * 0.36); out.push(s);
  for (const [x, y] of [[-0.05, 0.07], [0.05, 0.07], [-0.05, -0.07], [0.05, -0.07]]) { const b = new THREE.CylinderGeometry(0.01, 0.01, 0.012, 8); b.rotateX(Math.PI / 2); b.translate(x, y, 0.034); out.push(b); }
  return out;
}

/** Jail bars panel in local XY: x 0..w, y 0..h, bars centred on z = 0. Vertical round bars + flat straps + weld beads.
 *  Returns geometries. */
export function barsGeoms({ w, h, pitch = 0.13, r = 0.018, straps = [0.12, 1.05, 2.0], strapW = 0.06, strapT = 0.012, frame = true }) {
  const out = []; const n = Math.max(2, Math.round(w / pitch)); const step = w / n;
  for (let i = 0; i <= n; i++) { const x = i * step; if (frame && (i === 0 || i === n)) continue;
    const g = new THREE.CylinderGeometry(r, r, h, 10, 1); boxUV(g, 0.5); g.translate(x, h / 2, 0); out.push(g);
    for (const y of straps) for (const s of [-1, 1]) { const b = new THREE.SphereGeometry(r * 0.75, 8, 6); b.scale(1.2, 0.8, 0.7); boxUV(b, 0.5); b.translate(x, y + s * strapW / 2, s * 0 + (strapT / 2 + 0.004) * 1); out.push(b);
      const b2 = b.clone(); b2.translate(0, 0, -(strapT + 0.008)); out.push(b2); } }
  for (const y of straps) for (const s of [-1, 1]) { const g = roundedBox(w, strapW, strapT, 0.003, 1); boxUV(g, 0.5); g.translate(w / 2, y, s * (r + strapT / 2 - 0.004)); out.push(g); }
  if (frame) { for (const x of [0, w]) { const g = roundedBox(0.07, h, 0.07, 0.008, 2); boxUV(g, 0.5); g.translate(x, h / 2, 0); out.push(g); }
    const top = roundedBox(w + 0.07, 0.08, 0.08, 0.008, 2); boxUV(top, 0.5); top.translate(w / 2, h - 0.04, 0); out.push(top);
    const bot = roundedBox(w + 0.07, 0.05, 0.07, 0.008, 2); boxUV(bot, 0.5); bot.translate(w / 2, 0.025, 0); out.push(bot); }
  return out;
}

/** Local -> world anchors for a group with a known world matrix. */
export function toWorld(group, v) { return v.clone().applyMatrix4(group.matrixWorld); }
export function viewW(group, pos, target, fov) { return { pos: toWorld(group, pos), target: toWorld(group, target), fov }; }

export { roundedBox, boxUV, grainUV, tint, lathe, extrude, place, tube, roundedCylinder };

/** Split a wall rectangle (x 0..len, y 0..h) around rectangular openings [{x0,x1,y0,y1}] -> solid rects. */
export function wallRects(len, h, openings = []) {
  const xs = [...new Set([0, len, ...openings.flatMap((o) => [o.x0, o.x1])])].filter((x) => x >= 0 && x <= len).sort((a, b) => a - b), out = [];
  for (let i = 0; i < xs.length - 1; i++) {
    const a = xs[i], b = xs[i + 1], mid = (a + b) / 2; if (b - a < 1e-4) continue;
    const cut = openings.filter((o) => mid > o.x0 && mid < o.x1).sort((p, q) => p.y0 - q.y0);
    let y = 0; for (const o of cut) { if (o.y0 > y) out.push({ x0: a, x1: b, y0: y, y1: o.y0 }); y = Math.max(y, o.y1); }
    if (y < h) out.push({ x0: a, x1: b, y0: y, y1: h });
  }
  return out;
}

/** Simple potted plant (pot lathe + bent leaf blades). Returns { pot: [], leaves: [], soil: [] } in local space, base at 0. */
export function plantGeoms(r, { leaves = 14, height = 1.1, potH = 0.42, potR = 0.2 } = {}) {
  const pot = [lathe([[0.0001, 0], [potR * 0.75, 0], [potR * 0.8, 0.02], [potR, potH * 0.9], [potR * 1.08, potH * 0.92], [potR * 1.08, potH], [potR * 0.95, potH], [potR * 0.93, potH * 0.96], [0.0001, potH * 0.96]], 28)];
  boxUV(pot[0], 0.6); const soil = [new THREE.CircleGeometry(potR * 0.93, 24).rotateX(-Math.PI / 2).translate(0, potH * 0.94, 0)];
  const out = [];
  for (let i = 0; i < leaves; i++) {
    const L = height * (0.55 + r() * 0.5), wd = 0.07 + r() * 0.05, g = new THREE.PlaneGeometry(wd, L, 1, 8); const p = g.attributes.position;
    const tilt = 0.35 + r() * 0.75, bend = 0.6 + r() * 0.6;
    for (let k = 0; k < p.count; k++) { const t = (p.getY(k) + L / 2) / L; const taper = Math.sin(Math.PI * Math.min(1, t * 1.1 + 0.05)); p.setX(k, p.getX(k) * taper);
      const a = tilt + bend * t * t; p.setY(k, Math.sin(Math.PI / 2 - a) * t * L); p.setZ(k, Math.cos(Math.PI / 2 - a) * t * L * 0.9 + Math.abs(p.getX(k)) * 0.4); }
    g.computeVertexNormals(); boxUV(g, 0.5); g.rotateY(r() * Math.PI * 2); g.translate(0, potH * 0.95, 0); out.push(g);
  }
  return { pot, leaves: out, soil };
}
