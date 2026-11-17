// Procedural fabric textures (canvas): colour map + bump (height) map, painted in METRES so every pattern keeps its real size.
// Patterns: knit (vertical ribs with V stitches), check (two-tone check + weave lines), tweed (flecked), plain (soft weave).
import * as THREE from "three";
import { rng } from "../shared/assets.js";

const css = (c, k = 1) => { const s = c.clone().convertLinearToSRGB(); return `rgb(${Math.min(255, s.r * 255 * k) | 0},${Math.min(255, s.g * 255 * k) | 0},${Math.min(255, s.b * 255 * k) | 0})`; };
const grey = (v) => { const g = Math.max(0, Math.min(255, v * 255)) | 0; return `rgb(${g},${g},${g})`; };

// paint(g, H, W, Hm, mode): g = 2D context already scaled to metres; W/Hm = size in metres; mode "col" | "bump"
function painter(type, col, accent, seed) {
  return (g, Wm, Hm, mode) => {
    const r = rng(seed); const C = mode === "col";
    g.fillStyle = C ? css(col) : grey(0.5); g.fillRect(0, 0, Wm, Hm);
    if (type === "knit") {
      const P = 0.016, SH = 0.011;                                  // rib pitch, stitch height
      for (let x = 0; x < Wm; x += P) {
        g.fillStyle = C ? css(col, 0.8) : grey(0.2); g.fillRect(x, 0, P * 0.16, Hm);          // gap between ribs
        g.fillStyle = C ? css(col, 1.07) : grey(0.78); g.fillRect(x + P * 0.3, 0, P * 0.4, Hm); // rib crown
        g.lineWidth = 0.0016; g.strokeStyle = C ? css(col, 0.92) : grey(0.4);
        g.beginPath();
        for (let y = (r() * SH); y < Hm; y += SH) {                       // V stitches
          g.moveTo(x + P * 0.18, y); g.lineTo(x + P * 0.5, y + SH * 0.55); g.lineTo(x + P * 0.84, y);
        }
        g.stroke();
      }
    } else if (type === "check") {
      const S = 0.056;
      for (let y = 0, j = 0; y < Hm; y += S, j++) for (let x = 0, i = 0; x < Wm; x += S, i++) {
        const on = (i + j) % 2 === 0;
        g.fillStyle = C ? (on ? css(accent) : css(col)) : grey(on ? 0.42 : 0.56); g.fillRect(x, y, S, S);
      }
      g.lineWidth = 0.0018; g.strokeStyle = C ? css(accent, 0.8) : grey(0.32); g.beginPath();   // over-check lines
      for (let x = S * 0.5; x < Wm; x += S) { g.moveTo(x, 0); g.lineTo(x, Hm); }
      for (let y = S * 0.5; y < Hm; y += S) { g.moveTo(0, y); g.lineTo(Wm, y); }
      g.stroke();
      g.lineWidth = 0.0008; g.strokeStyle = C ? "rgba(0,0,0,0.10)" : "rgba(0,0,0,0.25)"; g.beginPath();   // twill diagonals
      for (let d = -Hm; d < Wm; d += 0.0035) { g.moveTo(d, 0); g.lineTo(d + Hm, Hm); }
      g.stroke();
    } else if (type === "tweed") {
      for (let k = 0; k < Wm * Hm * 90000; k++) {
        const x = r() * Wm, y = r() * Hm, l = 0.002 + r() * 0.004, lt = r() > 0.5;
        g.fillStyle = C ? (lt ? css(col, 1.25) : (r() > 0.7 ? css(accent) : css(col, 0.7))) : grey(lt ? 0.75 : 0.25);
        g.fillRect(x, y, r() > 0.5 ? l : 0.0012, r() > 0.5 ? 0.0012 : l);
      }
    } else if (type === "stripes") {                                      // sailor shirt: horizontal bands (accent) on col
      const P = 0.05;
      for (let y = 0; y < Hm; y += P) { g.fillStyle = C ? css(accent) : grey(0.38); g.fillRect(0, y, Wm, P * 0.45); }
      g.lineWidth = 0.0007; g.strokeStyle = C ? "rgba(0,0,0,0.07)" : "rgba(0,0,0,0.25)"; g.beginPath();   // jersey weave
      for (let x = 0; x < Wm; x += 0.003) { g.moveTo(x, 0); g.lineTo(x, Hm); }
      g.stroke();
    } else if (type === "oilskin") {                                      // waxed cloth: soft creases
      for (let k = 0; k < Wm * Hm * 400; k++) {
        const x = r() * Wm, y = r() * Hm; g.lineWidth = 0.002 + r() * 0.003;
        g.strokeStyle = C ? css(col, 0.85 + r() * 0.25) : grey(0.3 + r() * 0.4);
        g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 0.06, y + (r() - 0.5) * 0.02); g.stroke();
      }
    } else if (type === "strands") {                                      // hair: fine strands along v
      for (let k = 0; k < Wm * 900; k++) {
        const x = r() * Wm; g.lineWidth = 0.0015 + r() * 0.002;
        g.strokeStyle = C ? css(col, 0.75 + r() * 0.45) : grey(0.25 + r() * 0.6);
        g.beginPath(); g.moveTo(x, 0); g.lineTo(x + (r() - 0.5) * 0.01, Hm); g.stroke();
      }
    } else if (type === "fluff") {
      for (let k = 0; k < Wm * Hm * 60000; k++) {
        const x = r() * Wm, y = r() * Hm; g.fillStyle = C ? css(col, 0.8 + r() * 0.3) : grey(r());
        g.fillRect(x, y, 0.003, 0.003);
      }
    } else {                                                                // plain weave
      g.lineWidth = 0.0007; g.strokeStyle = C ? "rgba(0,0,0,0.06)" : "rgba(0,0,0,0.25)"; g.beginPath();
      for (let x = 0; x < Wm; x += 0.0025) { g.moveTo(x, 0); g.lineTo(x, Hm); }
      for (let y = 0; y < Hm; y += 0.0025) { g.moveTo(0, y); g.lineTo(Wm, y); }
      g.stroke();
    }
    // soft tonal blotches (dye / wear) on every fabric
    for (let k = 0; k < 40; k++) {
      const x = r() * Wm, y = r() * Hm, rad = 0.03 + r() * 0.08, a = 0.05 + r() * 0.06;
      const gr = g.createRadialGradient(x, y, 0, x, y, rad);
      const tone = r() > 0.5 ? `rgba(255,255,255,${C ? a * 0.6 : 0})` : `rgba(0,0,0,${C ? a : 0})`;
      gr.addColorStop(0, tone); gr.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = gr; g.fillRect(x - rad, y - rad, 2 * rad, 2 * rad);
    }
  };
}

/**
 * Make { map, bumpMap } canvas textures covering Wm x Hm metres at px/m resolution.
 * overlay(g, Wm, Hm, mode) can paint extra things (e.g. the engineer's shirt panel) in metre coordinates.
 */
export function fabricTextures(type, col, accent, seed, Wm, Hm, pxPerM = 1500, overlay = null, maxPx = 2048) {
  const w = Math.min(maxPx, Math.round(Wm * pxPerM)), h = Math.min(maxPx, Math.round(Hm * pxPerM));
  const out = {};
  for (const mode of ["col", "bump"]) {
    const c = document.createElement("canvas"); c.width = w; c.height = h; const g = c.getContext("2d");
    g.setTransform(w / Wm, 0, 0, h / Hm, 0, 0);
    painter(type, col, accent || col, seed)(g, Wm, Hm, mode);
    if (overlay) overlay(g, Wm, Hm, mode);
    const t = new THREE.CanvasTexture(c); t.colorSpace = mode === "col" ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; t.needsUpdate = true;
    out[mode === "col" ? "map" : "bumpMap"] = t;
  }
  return out;
}

export { painter };
