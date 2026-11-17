// World kit: materials. Real CC0 PBR sets (Poly Haven, saved in public/tex as <name>_{diff,nor_gl,rough}_<res>.jpg),
// tinted per use, plus canvas-drawn sign/chalk/plaque textures. No ink outlines on sets (characters only).
import * as THREE from "three";
import { loadPBR } from "../shared/assets.js";

const sets = new Map();
const getSet = (name, res) => { const k = `${name}_${res}`; if (!sets.has(k)) sets.set(k, loadPBR(name, [1, 1], res)); return sets.get(k); };

/** Downloaded texture sets and their resolution. Add new ones here after downloading into public/tex. */
export const TEX = {
  wood: ["rough_wood", "1k"],                 // single-board grain with cracks: planks, rafters, beams (tint it)
  deck: ["wood_floor_deck", "2k"],            // orange deck boards (texture-only floors)
  ceilingPlanks: ["wooden_planks", "1k"],     // pale narrow boards: ceilings, wall cladding
  darkPlanks: ["weathered_planks", "1k"],     // dark weathered boards: boxes, desks, outdoor decks
  redPlaster: ["red_plaster_weathered", "1k"],
  plaster: ["painted_plaster_wall", "1k"],
  plaster2: ["plastered_wall", "1k"],
  rustMetal: ["rusty_metal_02", "1k"],
  darkWood: ["dark_wooden_planks", "1k"],     // neutral dark-brown boards: ceilings, clock box (calmer than the orange woods)
  metalPlate: ["metal_plate", "1k"],          // brushed/worn steel plate: basins, hatches, jugs
  greenMetal: ["green_metal_rust", "1k"],     // painted green metal with rust: toolboxes, cans
  snow: ["snow_02", "1k"],                    // packed snow: winter decks, railings, roofs
};

/** PBR material from a downloaded set. UVs must be world-scaled (see geometry.boxUV / grainUV); textures repeat. */
export async function pbr(key, { color = 0xffffff, roughness = 1, metalness = 0, normalScale = 1.6, vertexColors = true,
  envMapIntensity = 0.6, side = THREE.FrontSide, emissive = 0x000000, emissiveIntensity = 0, noRoughMap = false } = {}) {
  const [name, res] = TEX[key] || [key, "1k"]; const s = await getSet(name, res);
  return new THREE.MeshStandardMaterial({ map: s.map, normalMap: s.normalMap, roughnessMap: noRoughMap ? null : s.roughnessMap,
    normalScale: new THREE.Vector2(normalScale, normalScale), color: col(color), roughness, metalness, vertexColors,
    envMapIntensity, side, emissive: new THREE.Color(emissive), emissiveIntensity });
}

/** Plain lit material (metals, paint, cloth) with optional procedural micro-relief (noise normal map). */
export function plain(color, { roughness = 0.6, metalness = 0, relief = 0.4, envMapIntensity = 0.8, emissive = 0x000000,
  emissiveIntensity = 0, vertexColors = false, side = THREE.FrontSide, transparent = false, opacity = 1 } = {}) {
  const m = new THREE.MeshStandardMaterial({ color: col(color), roughness, metalness, envMapIntensity, vertexColors, side,
    emissive: new THREE.Color(emissive), emissiveIntensity, transparent, opacity });
  if (relief > 0) { m.normalMap = noiseNormal(); m.normalScale = new THREE.Vector2(relief, relief); }
  return m;
}

let _noiseN = null;
/** Small tileable noise normal map (hammered metal / paint orange-peel). */
export function noiseNormal(size = 256, seed = 3) {
  if (_noiseN) return _noiseN;
  const h = new Float32Array(size * size); let s = seed;
  const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const grid = (cells) => { const g = Array.from({ length: cells * cells }, r);
    return (x, y) => { const fx = (x / size) * cells, fy = (y / size) * cells, x0 = Math.floor(fx), y0 = Math.floor(fy), tx = fx - x0, ty = fy - y0;
      const at = (i, j) => g[((j % cells + cells) % cells) * cells + ((i % cells + cells) % cells)];
      const sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty);
      return (at(x0, y0) * (1 - sx) + at(x0 + 1, y0) * sx) * (1 - sy) + (at(x0, y0 + 1) * (1 - sx) + at(x0 + 1, y0 + 1) * sx) * sy; }; };
  const oct = [grid(8), grid(16), grid(32), grid(64)];
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) h[y * size + x] = oct[0](x, y) * 0.5 + oct[1](x, y) * 0.25 + oct[2](x, y) * 0.15 + oct[3](x, y) * 0.1;
  const d = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const hx = h[y * size + ((x + 1) % size)] - h[y * size + ((x - 1 + size) % size)], hy = h[((y + 1) % size) * size + x] - h[((y - 1 + size) % size) * size + x];
    const n = new THREE.Vector3(-hx * 6, -hy * 6, 1).normalize(), i = 4 * (y * size + x);
    d[i] = (n.x * 0.5 + 0.5) * 255; d[i + 1] = (n.y * 0.5 + 0.5) * 255; d[i + 2] = (n.z * 0.5 + 0.5) * 255; d[i + 3] = 255;
  }
  const t = new THREE.DataTexture(d, size, size); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.needsUpdate = true; t.repeat.set(3, 3);
  return (_noiseN = t);
}

/** Canvas texture helper: draw(ctx, w, h). Returns { map, bump } (bump = same canvas as greyscale height). */
export function canvasTex(w, h, draw, { srgb = true } = {}) {
  const c = document.createElement("canvas"); c.width = w; c.height = h; const ctx = c.getContext("2d"); draw(ctx, w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace; t.anisotropy = 8; return t;
}

/** Colour from hex/CSS (sRGB) or [r,g,b] linear multipliers (may exceed 1 to brighten a dark texture). */
export const col = (c) => Array.isArray(c) ? new THREE.Color(...c) : new THREE.Color(c);

const rnd = (s) => () => ((s = (s * 16807) % 2147483647) / 2147483647);

/** Chalkboard face: slate with smudges and chalk lettering. lines: [[text, sizeFrac], ...] */
export function chalkboardTexture(lines, { w = 1024, h = 768, slate = "#1f2b25" } = {}) {
  return canvasTex(w, h, (g) => {
    g.fillStyle = slate; g.fillRect(0, 0, w, h); const r = rnd(5);
    for (let i = 0; i < 90; i++) { g.fillStyle = `rgba(220,230,220,${0.015 + r() * 0.04})`;      // old erased chalk smudges
      g.beginPath(); g.ellipse(r() * w, r() * h, 40 + r() * 140, 10 + r() * 40, r() * 3, 0, 7); g.fill(); }
    let y = h * 0.12; g.textAlign = "center"; g.textBaseline = "top";
    for (const [txt, sz] of lines) {
      const px = sz * h; g.font = `bold ${px}px "Segoe Print", "Comic Sans MS", "Arial Black", sans-serif`;
      for (let k = 0; k < 3; k++) { g.fillStyle = `rgba(240,240,232,${k === 0 ? 0.9 : 0.25})`; g.fillText(txt, w / 2 + (r() - 0.5) * 3, y + (r() - 0.5) * 3); }
      y += px * 1.22;
    }
    g.globalCompositeOperation = "destination-out";                                           // chalk grain
    for (let i = 0; i < 9000; i++) { g.fillStyle = `rgba(0,0,0,${r() * 0.5})`; g.fillRect(r() * w, r() * h, 2, 2); }
    g.globalCompositeOperation = "destination-over"; g.fillStyle = slate; g.fillRect(0, 0, w, h);
  });
}

/** Engraved / painted plate: background colour, lettering, worn edges. */
export function plateTexture(lines, { w = 1024, h = 320, bg = "#c89a3a", ink = "#3a2410", font = "Arial Black", border = true } = {}) {
  return canvasTex(w, h, (g) => {
    const grd = g.createLinearGradient(0, 0, w, h); grd.addColorStop(0, bg); grd.addColorStop(0.5, shade(bg, 1.15)); grd.addColorStop(1, shade(bg, 0.85));
    g.fillStyle = grd; g.fillRect(0, 0, w, h); const r = rnd(9);
    for (let i = 0; i < 2500; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "255,255,255" : "0,0,0"},${r() * 0.06})`; g.fillRect(r() * w, r() * h, 1 + r() * 30, 1); }
    if (border) { g.strokeStyle = shade(bg, 0.6); g.lineWidth = h * 0.04; g.strokeRect(h * 0.06, h * 0.06, w - h * 0.12, h - h * 0.12); }
    g.textAlign = "center"; g.textBaseline = "middle"; g.fillStyle = ink;
    const n = lines.length; lines.forEach(([txt, sz], i) => { g.font = `900 ${sz * h}px "${font}", sans-serif`; g.fillText(txt, w / 2, h * (i + 0.5) / n + h * 0.02); });
  });
}
function shade(hex, k) { const c = new THREE.Color(hex).multiplyScalar(k); return `#${c.getHexString()}`; }
