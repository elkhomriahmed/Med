// CITY_STREET (video 2): one Pittsburgh city block, April 1995 (LAYOUT_v02.md). Street along X, road z -5..+5, kerbs,
// sidewalks to z ±8.5 (top y 0.15). North facades at z = -8.5 face +Z (shops, APARTMENT x -7..7, POLICE x 22..34);
// south facades at z = +8.5 face -Z (BANK 1 x -4..8 doors x 2, BANK 2 x 14..24 doors x 19). Cross streets x -34..-26, 48..60.
//
//   const city = await buildCity({ time: "day" });  scene.add(city.group);
//   city.setTime("morning" | "day" | "night");   // per frame, uniforms only (no rebuild / recompile)
//   city.update(t, camera);                     // shadow frustum follows the camera (texel-snapped: no swimming)
//   city.controls.hisWindow(k)  0 closed .. 1 lower sash raised (default 1, opening x -0.75..0.75, y 4.0..4.98)
//   city.controls.bank1Doors(k) / bank2Doors(k) / policeDoors(k)   0 closed .. 1 swung open 85° outward (default 1)
//   city.parts.policeGlass / bankGlass  (glass panes of the fly-in windows: hide to fly through)
//   city.anchors: world Vector3s + views { pos, target, fov }; city.hint[time] = { exposure, envIntensity }
//   city.lights = { key, hemi, lamps[] }; city.keyLightPos (live Vector3, toward the sun / moon / at night the nearest lamp is up to you)
//
// Relief: brick walls use parallax-occlusion mapping (real recessed mortar from public/tex/red_brick_03_height_1k.png) + real
// geometry for every frame, sill, lintel, soldier course, cornice, bracket, dentil, column, kerb stone and sidewalk slab.
import * as THREE from "three";
import { mergeVertices } from "three/addons/utils/BufferGeometryUtils.js";
import { FontLoader } from "three/addons/loaders/FontLoader.js";
import { TextGeometry } from "three/addons/geometries/TextGeometry.js";
import helvBold from "three/examples/fonts/helvetiker_bold.typeface.json";
import serifBold from "three/examples/fonts/gentilis_bold.typeface.json";
import { roundedBox, boxUV, grainUV, tint, clean, mergeGeometries, lathe, place, tube } from "../geometry.js";
import { pbr, plain, canvasTex } from "../materials.js";
import { loadTex, rng } from "../../shared/assets.js";
import { createExteriorSky } from "../exterior/sky.js";
import { TIMES as EXT } from "../exterior/util.js";

const C = (h) => new THREE.Color(h);
const V = (x, y, z) => new THREE.Vector3(x, y, z);
export const SIDEWALK_Y = 0.15;
export const POLICE_DOOR_Y = 0.6;      // police threshold (3 steps up from the sidewalk)

// ------------------------------------------------------------------------------------------------ times of day
const skyOf = (base, o = {}) => ({ ...base, sea: o.ground ?? [0.2, 0.2, 0.2], seaH: o.groundH ?? base.haze, ...o });
export const CITY_TIMES = {
  morning: { sky: skyOf(EXT.morning.sky, { sunDir: [0.86, 0.26, 0.44], clouds: 0.35 }), dir: [0.86, 0.26, 0.44],
    key: "#ffc590", keyI: 3.3, hemiSky: "#a8c4ec", hemiGround: "#6a5040", hemiI: 0.95, win: 0.0, shop: 0.35, lamp: 0, pt: 0, pool: 0,
    sign: 0.25, blue: 0.4, haze: [0.95, 0.80, 0.68], hazeK: 0.75, night: 0, hint: { exposure: 1.1, envIntensity: 0.3 } },
  day: { sky: skyOf(EXT.day.sky, { sunDir: [0.45, 0.78, -0.43] }), dir: [0.45, 0.78, -0.43],
    key: "#fff0dc", keyI: 3.5, hemiSky: "#a4c4f0", hemiGround: "#6a5a48", hemiI: 1.05, win: 0.0, shop: 0.3, lamp: 0, pt: 0, pool: 0,
    sign: 0.2, blue: 0.35, haze: [0.66, 0.76, 0.90], hazeK: 0.7, night: 0, hint: { exposure: 1.0, envIntensity: 0.3 } },
  night: { sky: skyOf(EXT.night.sky, { sunDir: [-0.42, 0.55, 0.5], clouds: 0.3, ground: [0.01, 0.012, 0.03] }), dir: [-0.42, 0.55, 0.5],
    key: "#8ea6ff", keyI: 0.75, hemiSky: "#3a4a8a", hemiGround: "#1a1612", hemiI: 0.45, win: 2.2, shop: 1.6, lamp: 6.0, pt: 26, pool: 1,
    sign: 2.4, blue: 4.0, haze: [0.05, 0.06, 0.14], hazeK: 0.85, night: 1, hint: { exposure: 1.45, envIntensity: 0.25 } },
};

// ------------------------------------------------------------------------------------------------ textures
function windowAtlas() {          // 4 cells: warm curtains, blue TV glow + blinds, warm + plant, dim curtains
  return canvasTex(1024, 256, (g) => {
    const cell = (i, top, bot, f) => { const x = i * 256; const gr = g.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, top); gr.addColorStop(1, bot);
      g.fillStyle = gr; g.fillRect(x, 0, 256, 256); f(x); };
    const r = rng(4);
    cell(0, "#ffd890", "#b0602c", (x) => { g.fillStyle = "#8a2a1e"; g.fillRect(x, 0, 60, 256); g.fillRect(x + 196, 0, 60, 256);
      g.fillStyle = "rgba(60,25,10,0.7)"; g.fillRect(x + 90, 150, 70, 60); g.fillStyle = "#ffeec0"; g.beginPath(); g.ellipse(x + 125, 135, 22, 16, 0, 0, 7); g.fill(); });
    cell(1, "#4a6ab0", "#1a2440", (x) => { for (let y = 0; y < 150; y += 12) { g.fillStyle = "rgba(220,230,255,0.55)"; g.fillRect(x + 8, y, 240, 7); }
      g.fillStyle = "rgba(160,200,255,0.9)"; g.fillRect(x + 150, 190, 50, 36); });
    cell(2, "#ffcc80", "#9a5426", (x) => { g.fillStyle = "rgba(40,60,20,0.85)"; for (let k = 0; k < 9; k++) { g.beginPath(); g.ellipse(x + 70 + r() * 40, 150 + r() * 50, 14, 30, r() * 3, 0, 7); g.fill(); }
      g.fillStyle = "#6a3a20"; g.fillRect(x + 60, 200, 60, 56); g.fillStyle = "rgba(255,240,210,0.6)"; g.fillRect(x + 8, 0, 240, 22); });
    cell(3, "#6a4a3a", "#2a1a14", (x) => { g.fillStyle = "#c8b89a"; g.fillRect(x, 0, 120, 256); g.fillStyle = "#b8a888"; g.fillRect(x + 136, 0, 120, 256);
      g.fillStyle = "rgba(0,0,0,0.25)"; for (let k = 0; k < 8; k++) g.fillRect(x + k * 32 + 10, 0, 6, 256); });
  });
}
function shopAtlas() {            // 4 cells: diner, pawn/records, pharmacy, laundromat
  return canvasTex(1024, 256, (g) => {
    const r = rng(8);
    const back = (i, a, b) => { const gr = g.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, a); gr.addColorStop(1, b); g.fillStyle = gr; g.fillRect(i * 256, 0, 256, 256); };
    back(0, "#f4e2b0", "#c26a3a"); { const x = 0; g.fillStyle = "#b02a24"; g.fillRect(x, 170, 256, 86); g.fillStyle = "#e8e0d0"; g.fillRect(x, 160, 256, 12);
      for (let k = 0; k < 6; k++) { g.fillStyle = "#2a2a2a"; g.fillRect(x + 20 + k * 40, 200, 8, 56); g.fillStyle = "#c8302a"; g.beginPath(); g.ellipse(x + 24 + k * 40, 198, 16, 6, 0, 0, 7); g.fill(); }
      g.fillStyle = "#f8f0d8"; for (let k = 0; k < 5; k++) g.fillRect(x + 20 + k * 48, 40, 36, 24); }
    back(1, "#e8c890", "#6a4024"); { const x = 256; g.fillStyle = "#4a2a18"; for (let y = 60; y < 256; y += 60) g.fillRect(x, y, 256, 8);
      for (let k = 0; k < 26; k++) { g.fillStyle = `hsl(${r() * 360},45%,${35 + r() * 25}%)`; g.fillRect(x + r() * 230, 20 + Math.floor(r() * 4) * 60, 14 + r() * 20, 36); }
      g.strokeStyle = "#3a1c0c"; g.lineWidth = 6; g.beginPath(); g.ellipse(x + 200, 120, 18, 26, 0.3, 0, 7); g.stroke(); }
    back(2, "#f6f6ee", "#b8c4c0"); { const x = 512; for (let y = 30; y < 256; y += 46) { g.fillStyle = "#d0d8d4"; g.fillRect(x, y + 34, 256, 6);
      for (let k = 0; k < 14; k++) { g.fillStyle = ["#e04a3a", "#3a7ac0", "#f0c040", "#5aa060", "#ffffff"][Math.floor(r() * 5)]; g.fillRect(x + k * 18 + 2, y + 8 + r() * 10, 12, 26); } }
      g.fillStyle = "#2a8a5a"; g.fillRect(x + 90, 0, 76, 20); }
    back(3, "#e0ecf0", "#8aa0a8"); { const x = 768; for (let k = 0; k < 4; k++) { g.fillStyle = "#f4f4f0"; g.fillRect(x + 6 + k * 62, 120, 56, 136);
      g.fillStyle = "#30404a"; g.beginPath(); g.arc(x + 34 + k * 62, 180, 20, 0, 7); g.fill(); g.fillStyle = "#7aa0c0"; g.beginPath(); g.arc(x + 34 + k * 62, 180, 14, 0, 7); g.fill(); } }
  });
}
function grimeTex() {             // left half: base-of-wall dirt (alpha up from the bottom); right half: rain streaks below sills
  const t = canvasTex(512, 256, (g) => {
    const r = rng(12); g.fillStyle = "#000"; g.fillRect(0, 0, 512, 256);
    const gr = g.createLinearGradient(0, 256, 0, 0); gr.addColorStop(0, "rgba(255,255,255,0.95)"); gr.addColorStop(0.35, "rgba(255,255,255,0.35)"); gr.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 300; i++) { g.fillStyle = `rgba(255,255,255,${r() * 0.18})`; g.fillRect(r() * 256, 120 + r() * 136, 2 + r() * 14, 2 + r() * 40); }
    for (let i = 0; i < 40; i++) { const x = 256 + 20 + r() * 216, len = 60 + r() * 190, w = 2 + r() * 9; const s = g.createLinearGradient(0, 0, 0, len);
      s.addColorStop(0, `rgba(255,255,255,${0.3 + r() * 0.5})`); s.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = s; g.fillRect(x, 0, w, len); }
  }, { srgb: false });
  return t;
}
function radialTex() { return canvasTex(128, 128, (g) => { const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(0.35, "rgba(255,255,255,0.45)"); gr.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); }); }
function stripeTex(a, b, n = 5) { const t = canvasTex(256, 32, (g, w, h) => { for (let i = 0; i < n * 2; i++) { g.fillStyle = i % 2 ? b : a; g.fillRect((i * w) / (n * 2), 0, w / (n * 2) + 1, h); } });
  t.wrapS = t.wrapT = THREE.RepeatWrapping; return t; }
function signTex(text, { bg = "#1e4a3a", ink = "#f2e2b0", w = 1024, h = 220, font = "Arial Black", border = "#c8a050", sub = null } = {}) {
  return canvasTex(w, h, (g) => {
    g.fillStyle = bg; g.fillRect(0, 0, w, h); const r = rng(text.length + 3);
    for (let i = 0; i < 1500; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "255,255,255" : "0,0,0"},${r() * 0.07})`; g.fillRect(r() * w, r() * h, 1 + r() * 30, 1); }
    if (border) { g.strokeStyle = border; g.lineWidth = h * 0.05; g.strokeRect(h * 0.08, h * 0.08, w - h * 0.16, h - h * 0.16); }
    g.textAlign = "center"; g.textBaseline = "middle"; g.fillStyle = ink;
    let size = h * (sub ? 0.46 : 0.58); g.font = `900 ${size}px "${font}", sans-serif`;
    while (g.measureText(text).width > w * 0.86) { size *= 0.94; g.font = `900 ${size}px "${font}", sans-serif`; }
    g.fillText(text, w / 2, sub ? h * 0.4 : h * 0.53);
    if (sub) { g.font = `bold ${h * 0.2}px "Arial", sans-serif`; g.fillText(sub, w / 2, h * 0.76); }
  });
}

// ------------------------------------------------------------------------------------------------ material shader patches
/** Parallax-occlusion mapping for brick: real recessed mortar + bevel shading + cavity darkening (no extra geometry). */
function addPOM(mat, hTex, { depth = 0.016, tile = 1.05, steps = 14, cavity = 0.5 } = {}) {
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.hMap = { value: hTex }; sh.uniforms.pomD = { value: depth / tile }; sh.uniforms.cav = { value: cavity };
    sh.fragmentShader = sh.fragmentShader
      .replace("#include <common>", "#include <common>\nuniform sampler2D hMap; uniform float pomD, cav;")
      .replace("#include <map_fragment>", `
        vec2 pSt0 = dFdx(vMapUv), pSt1 = dFdy(vMapUv); vec2 pUv = vMapUv; float pH = 1.0;
        {
          vec3 pN = normalize(vNormal);
          vec3 q0 = dFdx(-vViewPosition), q1 = dFdy(-vViewPosition);
          vec3 q1p = cross(q1, pN), q0p = cross(pN, q0);
          vec3 T = q1p*pSt0.x + q0p*pSt1.x, B = q1p*pSt0.y + q0p*pSt1.y;
          float det = max(dot(T,T), dot(B,B)); float sc = det == 0.0 ? 0.0 : inversesqrt(det); T *= sc; B *= sc;
          vec3 Vv = normalize(vViewPosition);
          vec3 vt = vec3(dot(Vv,T), dot(Vv,B), max(dot(Vv,pN), 0.3));
          vec2 stepUv = -vt.xy / vt.z * pomD / ${steps.toFixed(1)};
          float layer = 0.0, dl = 1.0 / ${steps.toFixed(1)}; vec2 uv = vMapUv; float h = textureGrad(hMap, uv, pSt0, pSt1).r; float prevH = h, prevL = 0.0;
          for (int i = 0; i < ${steps}; i++) { if (layer >= 1.0 - h) break; prevH = h; prevL = layer; uv += stepUv; layer += dl; h = textureGrad(hMap, uv, pSt0, pSt1).r; }
          float a = (1.0 - h) - layer, b = (1.0 - prevH) - prevL; float w = a / (a - b + 1e-5);
          pUv = mix(uv, uv - stepUv, clamp(w, 0.0, 1.0)); pH = textureGrad(hMap, pUv, pSt0, pSt1).r;
        }
        #ifdef USE_MAP
          diffuseColor *= textureGrad(map, pUv, pSt0, pSt1);
        #endif
        diffuseColor.rgb *= mix(cav, 1.0, pH);`)
      .replace("#include <roughnessmap_fragment>", `float roughnessFactor = roughness;
        #ifdef USE_ROUGHNESSMAP
          roughnessFactor *= textureGrad(roughnessMap, pUv, pSt0, pSt1).g;
        #endif`)
      .replace("#include <normal_fragment_maps>", `
        vec3 mapN = textureGrad(normalMap, pUv, pSt0, pSt1).xyz * 2.0 - 1.0; mapN.xy *= normalScale;
        { float e = 1.5 / 1024.0; float hx = textureGrad(hMap, pUv + vec2(e, 0.0), pSt0, pSt1).r - textureGrad(hMap, pUv - vec2(e, 0.0), pSt0, pSt1).r;
          float hy = textureGrad(hMap, pUv + vec2(0.0, e), pSt0, pSt1).r - textureGrad(hMap, pUv - vec2(0.0, e), pSt0, pSt1).r;
          mapN.xy -= vec2(hx, hy) * 1.6; }
        normal = normalize(tbn * mapN);`);
  };
  mat.customProgramCacheKey = () => `pom${depth}_${steps}`;
  return mat;
}
/** Distance haze toward a shared colour (far terrain, skyline, distant blocks). */
const HAZE = { col: { value: new THREE.Color() }, near: { value: 60 }, far: { value: 520 }, k: { value: 0.75 }, night: { value: 0 } };
function addHaze(mat, { windows = false } = {}) {
  const prev = mat.onBeforeCompile;
  mat.onBeforeCompile = (sh, r) => {
    prev?.call(mat, sh, r);
    Object.assign(sh.uniforms, { hzCol: HAZE.col, hzNear: HAZE.near, hzFar: HAZE.far, hzK: HAZE.k, hzNight: HAZE.night });
    sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nvarying vec3 vHzW; varying vec3 vHzN;")
      .replace("#include <project_vertex>", `#include <project_vertex>
        { vec4 hp = vec4(transformed, 1.0); vec3 hn = objectNormal;
          #ifdef USE_INSTANCING
            hp = instanceMatrix * hp; hn = mat3(instanceMatrix) * hn;
          #endif
          vHzW = (modelMatrix * hp).xyz; vHzN = normalize(mat3(modelMatrix) * hn); }`);
    sh.fragmentShader = sh.fragmentShader.replace("#include <common>", "#include <common>\nvarying vec3 vHzW; varying vec3 vHzN; uniform vec3 hzCol; uniform float hzNear, hzFar, hzK, hzNight;\nfloat hzHash(vec2 p){ p = fract(p*vec2(123.34,456.21)); p += dot(p,p+45.32); return fract(p.x*p.y); }");
    if (windows) sh.fragmentShader = sh.fragmentShader.replace("#include <emissivemap_fragment>", `#include <emissivemap_fragment>
        { vec3 an = abs(vHzN); if (an.y < 0.5) {
            vec2 wp = vec2(an.x > an.z ? vHzW.z : vHzW.x, vHzW.y) / vec2(3.2, 3.4); vec2 cell = floor(wp), f = fract(wp);
            float win = step(0.22, f.x) * step(f.x, 0.78) * step(0.25, f.y) * step(f.y, 0.8) * step(1.0, vHzW.y - 2.0);
            float lit = step(hzHash(cell + floor(vHzW.xz * 0.013) * 17.0), 0.42);
            diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.06, 0.08, 0.11), win * 0.85);
            totalEmissiveRadiance += win * lit * hzNight * mix(vec3(1.6, 1.0, 0.45), vec3(0.7, 0.9, 1.5), step(0.75, hzHash(cell * 1.7)));
        } }`);
    sh.fragmentShader = sh.fragmentShader.replace("#include <opaque_fragment>", `#include <opaque_fragment>
      gl_FragColor.rgb = mix(gl_FragColor.rgb, hzCol, hzK * smoothstep(hzNear, hzFar, distance(vHzW, cameraPosition)));`);
  };
  mat.customProgramCacheKey = () => `haze${windows ? "W" : ""}`;
  return mat;
}

// ------------------------------------------------------------------------------------------------ build
export async function buildCity(opts = {}) {
  const O = { time: "day", shadowFollow: true, shadowHalf: 34, shadowMap: 4096, ...opts };
  const r = rng(O.seed ?? 95);
  const group = new THREE.Group(); group.name = "city";

  const hTex = await loadTex("tex/red_brick_03_height_1k.png", { srgb: false, repeat: [1, 1] });
  const winTx = windowAtlas(), shopTx = shopAtlas(), grime = grimeTex();
  const M = {
    brick: addPOM(await pbr("red_brick_03", { normalScale: 1.2 }), hTex),
    brickY: await pbr("yellow_bricks", { normalScale: 1.5 }),
    stone: await pbr("brushed_concrete", { normalScale: 1.3 }),
    ashlar: await pbr("white_sandstone_bricks", { normalScale: 1.6 }),
    slab: await pbr("concrete_pavement", { normalScale: 1.4 }),
    asphalt: await pbr("asphalt_02", { normalScale: 1.6, vertexColors: true }),
    tar: await pbr("asphalt_02", { normalScale: 1.0, color: [0.32, 0.3, 0.3] }),
    wood: await pbr("wood", { normalScale: 1.2 }),
    paint: plain("#ffffff", { roughness: 0.5, relief: 0.35, vertexColors: true }),
    metal: plain("#ffffff", { roughness: 0.42, metalness: 0.55, relief: 0.3, vertexColors: true }),
    clay: plain("#ffffff", { roughness: 0.85, relief: 0.9, vertexColors: true }),
    room: plain("#ffffff", { roughness: 0.9, relief: 0.2, vertexColors: true }),
    leaf: plain("#ffffff", { roughness: 0.85, relief: 1.2, vertexColors: true }),
    rubber: plain("#1c1a1a", { roughness: 0.85, relief: 0.3 }),
    carPaint: plain("#ffffff", { roughness: 0.28, metalness: 0.35, relief: 0.05, vertexColors: true, envMapIntensity: 1.3 }),
    carGlass: plain("#1a2430", { roughness: 0.06, metalness: 0.6, relief: 0, envMapIntensity: 1.8 }),
    puddle: plain("#3a4048", { roughness: 0.02, metalness: 0.0, relief: 0.08, envMapIntensity: 2.6 }),
    soil: plain("#3a2a1e", { roughness: 1, relief: 1.2 }),
  };
  M.ashlar.color.set(1.05, 0.98, 0.86); M.stone.color.set(1.7, 1.62, 1.5);
  M.lime = M.stone.clone(); M.lime.color.set(3.1, 2.95, 2.7);          // pale limestone for the banks
  M.winLit = new THREE.MeshStandardMaterial({ map: winTx, emissiveMap: winTx, emissive: C("#ffffff"), emissiveIntensity: 0, color: C("#6a6a70"), roughness: 0.6 });
  M.winDark = new THREE.MeshStandardMaterial({ map: winTx, color: C("#4a4a50"), roughness: 0.6 });
  M.shopLit = new THREE.MeshStandardMaterial({ map: shopTx, emissiveMap: shopTx, emissive: C("#ffffff"), emissiveIntensity: 0.3, color: C("#8a8a8a"), roughness: 0.7 });
  M.glass = new THREE.MeshStandardMaterial({ color: C("#a8bccb"), roughness: 0.04, metalness: 0.1, transparent: true, opacity: 0.2, envMapIntensity: 2.2, depthWrite: false });
  M.flyGlass = M.glass.clone();                 // panes of the windows/doors the camera flies through (own meshes, hideable)
  M.lamp = new THREE.MeshStandardMaterial({ color: C("#ffe2b0"), emissive: C("#ffb860"), emissiveIntensity: 0, roughness: 0.3 });
  M.blue = new THREE.MeshStandardMaterial({ color: C("#7aa8ff"), emissive: C("#3a78ff"), emissiveIntensity: 0.4, roughness: 0.2 });
  M.head = new THREE.MeshStandardMaterial({ color: C("#fff4dc"), emissive: C("#fff0d0"), emissiveIntensity: 0, roughness: 0.3 });
  M.tail = new THREE.MeshStandardMaterial({ color: C("#8a1410"), emissive: C("#ff2010"), emissiveIntensity: 0, roughness: 0.3 });
  M.grime = new THREE.MeshBasicMaterial({ color: C("#1a120c"), alphaMap: grime, transparent: true, opacity: 0.55, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  M.line = plain("#ffffff", { roughness: 0.7, relief: 0.6, vertexColors: true });
  const B = Object.fromEntries(Object.keys(M).map((k) => [k, []]));
  const extra = [];                     // standalone meshes (signs, text, awnings, doors)
  const signMats = [];                  // emissive signs (night glow)

  // piece(): local geometry -> uv -> tint -> placed by rot/pos -> optional frame matrix -> bucket
  const piece = (k, g, pos = [0, 0, 0], rot = [0, 0, 0], { uv = "box", tile = 1.5, swap = false, color = 0xffffff, jitter = 0, F = null } = {}) => {
    if (uv === "box") boxUV(g, tile, [r() * 7, r() * 7], swap); else if (uv === "grain") grainUV(g, tile, [r() * 7, r() * 7]);
    const c = C(color); if (jitter) c.multiplyScalar(1 - jitter / 2 + r() * jitter);
    tint(g, c); place(g, pos, Array.isArray(rot) ? rot : [0, 0, 0]); if (F) g.applyMatrix4(F); B[k].push(g); return g;
  };
  const xMesh = (m, F) => { if (F) { m.applyMatrix4(F); } m.castShadow = m.receiveShadow = true; extra.push(m); return m; };
  // facade frame: local x along the facade, front plane z = 0 facing +z, body toward -z. side "N": facade at z -8.5 facing +Z; "S": at z +8.5 facing -Z.
  const frame = (cx, side) => side === "N" ? new THREE.Matrix4().makeTranslation(cx, 0, -8.5)
    : new THREE.Matrix4().makeRotationY(Math.PI).setPosition(cx, 0, 8.5);
  const lx = (wx, cx, side) => side === "N" ? wx - cx : cx - wx;      // world x -> local x

  // ---------------------------------------------------------------- facade helpers (local frame)
  const rectHole = (x0, y0, x1, y1) => { const p = new THREE.Path(); p.moveTo(x0, y0); p.lineTo(x1, y0); p.lineTo(x1, y1); p.lineTo(x0, y1); p.lineTo(x0, y0); return p; };
  const archHole = (x0, y0, x1, y1) => { const p = new THREE.Path(), rr = (x1 - x0) / 2; p.moveTo(x0, y0); p.lineTo(x1, y0); p.lineTo(x1, y1); p.absarc((x0 + x1) / 2, y1, rr, 0, Math.PI, false); p.lineTo(x0, y0); return p; };
  /** Wall slab with real holes (reveals come from the extrusion). x from -w/2..w/2, y0..y1, thickness T (front z 0). */
  const wall = (F, k, w, y0, y1, holes, { T = 0.42, color = "#ffffff", tile = 1.05, x0 = -w / 2 } = {}) => {
    const s = new THREE.Shape(); s.moveTo(x0, y0); s.lineTo(x0 + w, y0); s.lineTo(x0 + w, y1); s.lineTo(x0, y1); s.lineTo(x0, y0);
    s.holes.push(...holes);
    const g = new THREE.ExtrudeGeometry(s, { depth: T, bevelEnabled: false, curveSegments: 14 }); g.translate(0, 0, -T);
    g.computeVertexNormals(); return piece(k, g, [0, 0, 0], [0, 0, 0], { tile, color, F });
  };
  const grimeStrip = (F, x0, x1, h = 1.1) => { const g = new THREE.PlaneGeometry(x1 - x0, h);
    const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setX(i, uv.getX(i) * 0.5);
    g.translate((x0 + x1) / 2, h / 2, 0.006); g.applyMatrix4(F); tint(g, C(0xffffff)); B.grime.push(g); };
  const streak = (F, x, yTop, w = 0.7, h = 1.3) => { const g = new THREE.PlaneGeometry(w, h);
    const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setX(i, 0.5 + uv.getX(i) * 0.5);
    g.translate(x, yTop - h / 2, 0.006); g.applyMatrix4(F); tint(g, C(0xffffff)); B.grime.push(g); };
  /** Inner room box behind a hole (back = atlas cell, sides = room colour): window depth reads, nothing hollow behind. */
  const roomBox = (F, x, y0, w, h, zBack, cell, k, { atlasN = 4, sideCol = "#3a2c24", floor = null } = {}) => {
    const W = w + 0.5, H = h + 0.5, cy = y0 + h / 2, d = -zBack - 0.42;
    const back = new THREE.PlaneGeometry(W, H); const uv = back.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setX(i, (cell + 0.04 + uv.getX(i) * 0.92) / atlasN);
    back.translate(x, cy, zBack); back.applyMatrix4(F); tint(back, C(0xffffff)); B[k].push(back);
    const sideW = (rot, pos, sw, sh) => { const g = new THREE.PlaneGeometry(sw, sh); piece("room", g, pos, rot, { color: sideCol, F }); };
    sideW([0, Math.PI / 2, 0], [x - W / 2, cy, zBack + d / 2], d, H); sideW([0, -Math.PI / 2, 0], [x + W / 2, cy, zBack + d / 2], d, H);
    sideW([Math.PI / 2, 0, 0], [x, cy + H / 2, zBack + d / 2], W, d); sideW([-Math.PI / 2, 0, 0], [x, cy - H / 2, zBack + d / 2], W, d);
    if (floor) piece("wood", roundedBox(W, 0.06, d, 0.01), [x, floor, zBack + d / 2], 0, { color: "#6a4a34", F });
  };
  /** Window: real hole + painted frame + sashes + glass + stone sill + lintel + room behind. kind "card" | "fly" (no room, glass in its own mesh) | "open" */
  const windowAt = (F, holes, x, y0, w, h, { kind = "card", frameCol = "#efe6d4", lintel = "soldier", arch = false, sill = true, T = 0.42, lit = null, cell = null } = {}) => {
    holes.push(arch ? archHole(x - w / 2, y0, x + w / 2, y0 + h - w / 2) : rectHole(x - w / 2, y0, x + w / 2, y0 + h));
    const fz = -0.13, fd = 0.1, ft = 0.075;
    const fr = (ww, hh, px, py, pz = fz, d = fd) => piece("paint", roundedBox(ww, hh, d, 0.012), [px, py, pz], 0, { uv: "box", tile: 1, color: frameCol, F });
    const hh = arch ? h - w / 2 : h;
    fr(w, ft, x, y0 + ft / 2); fr(ft, hh, x - w / 2 + ft / 2, y0 + hh / 2); fr(ft, hh, x + w / 2 - ft / 2, y0 + hh / 2);
    if (!arch) fr(w, ft, x, y0 + h - ft / 2); else {           // arched head: frame as a curved tube
      const pts = []; for (let i = 0; i <= 16; i++) { const a = (i / 16) * Math.PI; pts.push(V(x + Math.cos(a) * (w / 2 - ft / 2), y0 + hh + Math.sin(a) * (w / 2 - ft / 2), fz)); }
      piece("paint", tube(pts, ft / 2, 24, 6), [0, 0, 0], 0, { color: frameCol, F }); }
    if (kind !== "open") { fr(w - 0.05, 0.06, x, y0 + hh * 0.52, fz + 0.03, 0.06); if (w > 1.3) fr(0.05, hh, x, y0 + hh / 2, fz + 0.03, 0.05); }
    if (kind === "card") {
      const g = arch ? new THREE.ShapeGeometry(archShape(x - w / 2, y0, x + w / 2, y0 + hh), 16) : new THREE.PlaneGeometry(w, h);
      if (!arch) g.translate(x, y0 + h / 2, fz - 0.02); else { boxUV(g, 1); g.translate(0, 0, fz - 0.02); }
      g.applyMatrix4(F); tint(g, C(0xffffff)); B.glass.push(g);
      const isLit = lit ?? r() < 0.55; roomBox(F, x, y0, w, h, -T - 0.55, cell ?? Math.floor(r() * (isLit ? 3 : 4)), isLit ? "winLit" : "winDark");
    }
    if (sill) { piece("stone", roundedBox(w + 0.26, 0.09, T * 0.55 + 0.1, 0.02), [x, y0 - 0.045, -T * 0.55 / 2 + 0.08], 0, { tile: 1.2, color: "#d8cfc0", jitter: 0.08, F }); streak(F, x, y0 - 0.1, w * 0.8, 1.1 + r() * 0.6); }
    if (lintel === "soldier" && !arch) { const n = Math.round((w + 0.3) / 0.09);
      for (let i = 0; i < n; i++) piece("clay", roundedBox(0.082, 0.22, 0.1, 0.008), [x - (n - 1) * 0.045 + i * 0.09, y0 + h + 0.115, -0.03], 0, { color: "#8a3a26", jitter: 0.25, F }); }
    else if (lintel === "stone" && !arch) { piece("stone", roundedBox(w + 0.34, 0.26, 0.14, 0.02), [x, y0 + h + 0.13, 0.02], 0, { tile: 1.2, color: "#d8cfc0", jitter: 0.06, F });
      piece("stone", roundedBox(0.26, 0.34, 0.18, 0.02), [x, y0 + h + 0.15, 0.04], 0, { tile: 1, color: "#e2d9ca", F }); }
    else if (arch) { const pts = []; const R = w / 2 + 0.12; for (let i = 0; i <= 18; i++) { const a = (i / 18) * Math.PI; pts.push(V(x + Math.cos(a) * R, y0 + hh + Math.sin(a) * R, 0.02)); }
      piece("stone", tube(pts, 0.12, 30, 8), [0, 0, 0], 0, { color: "#e2d9ca", F });
      piece("stone", roundedBox(0.3, 0.42, 0.22, 0.02), [x, y0 + hh + R, 0.06], 0, { tile: 1, color: "#ece4d6", F }); }
  };
  function archShape(x0, y0, x1, y1) { const s = new THREE.Shape(), rr = (x1 - x0) / 2; s.moveTo(x0, y0); s.lineTo(x1, y0); s.lineTo(x1, y1); s.absarc((x0 + x1) / 2, y1, rr, 0, Math.PI, false); s.lineTo(x0, y0); return s; }
  /** Pressed-metal / stone cornice: extruded moulding profile + brackets + dentils. */
  const cornice = (F, w, y, { col = "#2e4a3e", out = 0.55, brackets = true, k = "paint" } = {}) => {
    const s = new THREE.Shape(); const p = [[0, 0], [0.06, 0], [0.06, 0.12], [0.12, 0.16], [0.14, 0.3], [out - 0.05, 0.34], [out, 0.4], [out, 0.52], [out - 0.06, 0.56], [0.0, 0.58]];
    s.moveTo(...p[0]); for (const q of p.slice(1)) s.lineTo(...q); s.lineTo(0, 0);
    const g = new THREE.ExtrudeGeometry(s, { depth: w + 0.2, bevelEnabled: false }); g.rotateY(-Math.PI / 2); g.translate((w + 0.2) / 2, y, 0); g.computeVertexNormals();
    piece(k, g, [0, 0, 0], 0, { color: col, F });
    for (let x = -w / 2 + 0.15; x <= w / 2 - 0.1; x += 0.13) piece(k, new THREE.BoxGeometry(0.06, 0.08, 0.07), [x, y + 0.21, 0.165], 0, { color: col, F });
    if (brackets) for (let x = -w / 2 + 0.3; x <= w / 2 - 0.2; x += 1.1) {
      const b = new THREE.Shape(); b.moveTo(0, 0); b.lineTo(0, 0.55); b.lineTo(out - 0.04, 0.55); b.quadraticCurveTo(out - 0.06, 0.25, 0.12, 0.02); b.lineTo(0, 0);
      const bg = new THREE.ExtrudeGeometry(b, { depth: 0.12, bevelEnabled: true, bevelSize: 0.012, bevelThickness: 0.012, bevelSegments: 1, curveSegments: 8 });
      bg.rotateY(-Math.PI / 2); bg.translate(x + 0.06, y - 0.2, 0); bg.computeVertexNormals(); piece(k, bg, [0, 0, 0], 0, { color: col, F }); }
    piece(k, roundedBox(w + 0.04, 0.16, 0.12, 0.02), [0, y - 0.32, 0.06], 0, { color: col, F });
  };
  const band = (F, w, y, col = "#d4cabb", h = 0.14, out = 0.06) => piece("stone", roundedBox(w + 0.04, h, out + 0.08, 0.02), [0, y, out / 2 - 0.04], 0, { tile: 1.4, color: col, jitter: 0.04, F });
  const coping = (F, w, y, T = 0.42) => piece("stone", roundedBox(w + 0.08, 0.13, T + 0.14, 0.03), [0, y + 0.065, -T / 2 + 0.04], 0, { tile: 1.3, color: "#c8beb0", jitter: 0.05, F });
  /** Shell behind a facade: side walls + back wall + roof (hollow, so rooms behind holes stay free). */
  const shell = (F, w, h, depth, { k = "brick", color = "#ffffff", T = 0.4, roofY = h - 0.9, sides = [true, true] } = {}) => {
    if (sides[0]) piece(k, roundedBox(T, h, depth, 0.01), [-w / 2 + T / 2, h / 2, -depth / 2], 0, { tile: 1.05, color, F });
    if (sides[1]) piece(k, roundedBox(T, h, depth, 0.01), [w / 2 - T / 2, h / 2, -depth / 2], 0, { tile: 1.05, color, F });
    piece(k, roundedBox(w, h, T, 0.01), [0, h / 2, -depth + T / 2], 0, { tile: 1.05, color, F });
    piece("tar", roundedBox(w - 0.1, 0.25, depth - 0.3, 0.01), [0, roofY, -depth / 2 - 0.1], 0, { tile: 3, F });
    // roof furniture: chimney, vent boxes, a 1995 satellite dish now and then
    const cxp = (r() - 0.5) * (w - 2), cz = -depth * (0.3 + r() * 0.5);
    piece("brick", roundedBox(0.8, 1.6, 0.6, 0.02), [cxp, roofY + 0.8, cz], 0, { tile: 1.05, color, F });
    piece("stone", roundedBox(0.9, 0.1, 0.7, 0.02), [cxp, roofY + 1.62, cz], 0, { color: "#9a948a", F });
    piece("metal", roundedBox(1.2, 0.7, 0.9, 0.04), [-cxp * 0.6, roofY + 0.45, -depth * 0.6], 0, { color: "#8a9094", F });
  };

  // ---------------------------------------------------------------- generic storefront building
  const TINTS = ["#ffffff", "#f2c8b0", "#e6a890", "#ffe0c8", "#d89c84", "#f8d8c0"];
  const building = (D) => {
    const { x0, x1, side } = D, w = x1 - x0, cx = (x0 + x1) / 2, F = frame(cx, side), h = D.h ?? 11, T = 0.42;
    const wk = D.wall ?? "brick", wc = D.tint ?? TINTS[Math.floor(r() * TINTS.length)], gH = 4.4;
    const holes = [];
    // ground floor storefront opening (pilasters at both ends)
    const sx0 = -w / 2 + 0.55, sx1 = w / 2 - 0.55;
    holes.push(rectHole(sx0, 0.02, sx1, 3.35));
    // upper floors
    const floors = D.floors ?? Math.max(1, Math.floor((h - gH - 1.2) / 3.3));
    const bays = D.bays ?? Math.max(2, Math.round(w / 2.6));
    const lintel = D.lintel ?? (r() < 0.5 ? "soldier" : "stone"), arch = D.arch ?? false, fc = D.frameCol ?? ["#efe6d4", "#2e4a3e", "#5a2a1e", "#e8dcc0"][Math.floor(r() * 4)];
    for (let f = 0; f < floors; f++) { const y0 = gH + 0.75 + f * 3.3;
      for (let i = 0; i < bays; i++) windowAt(F, holes, -w / 2 + (w * (i + 0.5)) / bays, y0, 1.15, arch && f === floors - 1 ? 2.1 : 1.9, { lintel, arch: arch && f === floors - 1, frameCol: fc, T }); }
    wall(F, wk, w, 0, h, holes, { T, color: wc });
    shell(F, w, h, D.depth ?? 14, { k: wk, color: wc, sides: D.sides ?? [true, true] });
    // pilasters + sign band + floor band
    for (const sx of [-1, 1]) piece("stone", roundedBox(0.5, 4.3, 0.16, 0.02), [sx * (w / 2 - 0.27), 2.15, 0.04], 0, { tile: 1.4, color: "#cfc4b4", jitter: 0.05, F });
    band(F, w, gH + 0.05, "#cfc4b4", 0.18, 0.08);
    for (let f = 1; f < floors; f++) band(F, w, gH + 0.45 + f * 3.3 - 0.05, "#d8cec0", 0.1, 0.03);
    cornice(F, w, h - 0.75, { col: D.corniceCol ?? ["#2e4a3e", "#5a3424", "#c8b89a", "#3a3a44"][Math.floor(r() * 4)] });
    coping(F, w, h, T);
    grimeStrip(F, -w / 2, w / 2, 1.0 + r() * 0.5);
    // storefront: bulkhead, glass, mullions, transom, recessed door, shop room
    const doorL = D.doorAt === "R" ? sx1 - 1.15 : sx0 + 0.15, dW = 1.0, dc = doorL + dW / 2;
    const gx0 = D.doorAt === "R" ? sx0 : doorL + dW + 0.1, gx1 = D.doorAt === "R" ? doorL - 0.1 : sx1, gw = gx1 - gx0, gc = (gx0 + gx1) / 2;
    const sfc = D.storeCol ?? fc;
    piece("paint", roundedBox(gw, 0.55, 0.12, 0.02), [gc, 0.29, -0.3], 0, { color: sfc, F });
    for (let px = gx0 + 0.25; px < gx1 - 0.3; px += 0.9) piece("paint", roundedBox(0.7, 0.3, 0.04, 0.015), [px + 0.35, 0.29, -0.23], 0, { color: sfc, jitter: 0.1, F });
    const fr = (ww, hh, px, py, pz = -0.3) => piece("paint", roundedBox(ww, hh, 0.1, 0.012), [px, py, pz], 0, { color: sfc, F });
    fr(gw, 0.08, gc, 0.6); fr(gw, 0.1, gc, 2.85); fr(gw, 0.08, gc, 3.3); fr(0.08, 2.75, gx0 + 0.04, 1.95); fr(0.08, 2.75, gx1 - 0.04, 1.95);
    const nm = Math.max(1, Math.round(gw / 1.7)); for (let i = 1; i < nm; i++) fr(0.06, 2.25, gx0 + (gw * i) / nm, 1.72);
    { const g = new THREE.PlaneGeometry(gw, 2.75); g.translate(gc, 1.97, -0.33); g.applyMatrix4(F); tint(g, C(0xffffff)); B.glass.push(g); }
    roomBox(F, gc, 0.6, gw, 2.75, -2.4, D.shop ?? Math.floor(r() * 4), "shopLit", { floor: 0.62 });
    for (let i = 0; i < Math.floor(gw / 0.8); i++) piece("paint", roundedBox(0.2 + r() * 0.25, 0.15 + r() * 0.4, 0.2 + r() * 0.2, 0.03),
      [gx0 + 0.4 + i * 0.8 + r() * 0.2, 0.9, -0.7 - r() * 0.5], [0, r(), 0], { color: ["#d8402c", "#f2c040", "#3a8ac0", "#f4efe6", "#5aa060"][i % 5], F });
    // recessed door (vestibule)
    piece("paint", roundedBox(dW + 0.2, 0.1, 0.12, 0.012), [dc, 2.75, -1.0], 0, { color: sfc, F });
    piece("paint", roundedBox(dW + 0.2, 0.6, 0.05, 0.01), [dc, 3.06, -0.32], 0, { color: sfc, F });
    piece("paint", roundedBox(dW, 2.65, 0.06, 0.012), [dc, 1.36, -1.05], 0, { color: D.doorCol ?? "#5a2a1e", F });
    { const g = new THREE.PlaneGeometry(dW - 0.3, 1.5); const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setX(i, ((D.shop ?? 1) + 0.3 + uv.getX(i) * 0.3) / 4);
      g.translate(dc, 1.75, -1.015); g.applyMatrix4(F); tint(g, C(0xffffff)); B.shopLit.push(g); }
    piece("metal", new THREE.SphereGeometry(0.04, 10, 8), [dc + dW / 2 - 0.12, 1.2, -1.0], 0, { color: "#c8a050", F });
    for (const sx of [-1, 1]) piece("room", new THREE.PlaneGeometry(1.0, 3.3).rotateY(sx * Math.PI / 2), [dc + sx * (dW / 2 + 0.1), 1.66, -0.5], 0, { color: "#5a4a40", F });
    piece("room", new THREE.PlaneGeometry(dW + 0.2, 1.0).rotateX(Math.PI / 2), [dc, 3.3, -0.5], 0, { color: "#4a3a30", F });
    piece("stone", roundedBox(dW + 0.2, 0.04, 1.05, 0.01), [dc, 0.17, -0.5], 0, { color: "#8a7a6a", F });
    // sign board (thick, framed, canvas face; glows at night)
    if (D.sign) {
      const [txt, bg, ink, sub] = D.sign, bw = Math.min(w - 1.4, 0.5 * txt.length + 1.4), bh = 0.72, by = 3.82;
      const tex = signTex(txt, { bg, ink, w: Math.round(220 * bw / bh), h: 220, sub, border: ink });
      const sm = new THREE.MeshStandardMaterial({ map: tex, emissiveMap: tex, emissive: C("#ffffff"), emissiveIntensity: 0.2, roughness: 0.55 }); signMats.push([sm, D.glow ?? 0.6]);
      const fm = M.paint; const sb = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, 0.1), [fm, fm, fm, fm, sm, fm]); tint(sb.geometry, C(bg));
      sb.position.set(0, by, 0.09); xMesh(sb, F);
      for (const [ww, hh, px, py] of [[bw + 0.16, 0.08, 0, by + bh / 2 + 0.04], [bw + 0.16, 0.08, 0, by - bh / 2 - 0.04], [0.08, bh, -bw / 2 - 0.04, by], [0.08, bh, bw / 2 + 0.04, by]])
        piece("paint", roundedBox(ww, hh, 0.14, 0.015), [px, py, 0.1], 0, { color: "#c8a050", F });
    }
    if (D.awning) {
      const am = new THREE.MeshStandardMaterial({ map: stripeTex(D.awning[0], D.awning[1]), roughness: 0.85, side: THREE.DoubleSide });
      const aw = sx1 - sx0 - 0.1; const ag = roundedBox(aw, 0.04, 1.35, 0.015); boxUV(ag, 1.0); place(ag, [0, 3.18, 0.6], [0.36, 0, 0]);
      const vg = roundedBox(aw, 0.3, 0.03, 0.01); boxUV(vg, 1.0); place(vg, [0, 2.82, 1.22]);
      const sg = new THREE.PlaneGeometry(1.25, 0.5); place(sg, [-aw / 2, 3.05, 0.62], [0, Math.PI / 2, 0]); const sg2 = sg.clone(); sg2.translate(aw, 0, 0);
      xMesh(new THREE.Mesh(mergeGeometries([clean(ag), clean(vg), clean(sg), clean(sg2)]), am), F);
    }
    if (D.blade) {           // projecting neon blade sign
      const [txt, bg, ink] = D.blade, tex = signTex(txt, { bg, ink, w: 600, h: 220, border: ink });
      const sm = new THREE.MeshStandardMaterial({ map: tex, emissiveMap: tex, emissive: C("#ffffff"), emissiveIntensity: 0.2, roughness: 0.5 }); signMats.push([sm, 1.0]);
      const fm = M.paint; const sb = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.6, 1.6), [sm, sm, fm, fm, fm, fm]); tint(sb.geometry, C(bg));
      sb.position.set(w / 2 - 0.9, 5.2, 1.05); xMesh(sb, F);
      for (const yy of [5.45, 4.95]) piece("metal", roundedBox(0.05, 0.05, 0.3, 0.01), [w / 2 - 0.9, yy, 0.15], 0, { color: "#2a2a2a", F });
    }
    return F;
  };

  // ---------------------------------------------------------------- APARTMENT (north, x -7..7)
  const apt = {};
  {
    const cx = 0, w = 14, F = frame(cx, "N"), h = 11.4, T = 0.5, holes = [], fc = "#efe6d4";
    // ground floor: entrance at x -2.8 (stoop), windows at -5.6, 0, 2.8, 5.6
    holes.push(rectHole(-3.45, 0.62, -2.15, 3.35));
    for (const x of [-5.6, 0, 2.8, 5.6]) windowAt(F, holes, x, 1.2, 1.15, 1.7, { lintel: "stone", frameCol: fc, T });
    // 2nd floor (his floor, room behind is interiors agent A): only his window is a real open hole, the others are cards
    for (const x of [-5.6, -2.8, 2.8, 5.6]) windowAt(F, holes, x, 4.3, 1.15, 1.7, { lintel: "soldier", frameCol: fc, T });
    holes.push(rectHole(-0.75, 4.0, 0.75, 6.0));
    for (const x of [-5.6, -2.8, 0, 2.8, 5.6]) windowAt(F, holes, x, 7.6, 1.15, 1.75, { lintel: "soldier", frameCol: fc, T });
    wall(F, "brick", w, 0, h, holes, { T, color: "#ffd6bc" });
    // shell: solid above/below his floor, hollow volume y 3.4..7.2 for the room (x -5..5, z -9..-15)
    piece("brick", roundedBox(0.4, h, 13, 0.01), [-w / 2 + 0.2, h / 2, -6.5 - T], 0, { tile: 1.05, color: "#ffd6bc", F });
    piece("brick", roundedBox(0.4, h, 13, 0.01), [w / 2 - 0.2, h / 2, -6.5 - T], 0, { tile: 1.05, color: "#ffd6bc", F });
    piece("brick", roundedBox(w, h, 0.4, 0.01), [0, h / 2, -13.3], 0, { tile: 1.05, color: "#ffd6bc", F });
    piece("tar", roundedBox(w - 0.1, 0.25, 12.8, 0.01), [0, h - 0.9, -6.9], 0, { tile: 3, F });
    for (const [cx2, cz] of [[-4.5, -9], [3.5, -11]]) { piece("brick", roundedBox(0.9, 1.8, 0.7, 0.02), [cx2, h - 0.1 + 0.9 - 0.9, cz], 0, { tile: 1.05, color: "#e8b8a0", F });
      piece("stone", roundedBox(1.0, 0.1, 0.8, 0.02), [cx2, h + 0.85 - 0.9, cz], 0, { color: "#9a948a", F }); }
    band(F, w, 3.6, "#d4cabb", 0.16, 0.07); band(F, w, 7.15, "#d4cabb", 0.12, 0.05);
    cornice(F, w, h - 0.75, { col: "#2e4a3e" }); coping(F, w, h, T);
    // rusticated stone base course (individual blocks)
    for (let x = -w / 2; x < w / 2 - 0.01; x += 0.9) for (const [yy, off] of [[0.22, 0], [0.62, 0.45]]) {
      const xa = Math.max(-w / 2, x - off), xb = Math.min(w / 2, x - off + 0.9); if (xb - xa < 0.1) continue;
      if (xa < -2.1 && xb > -3.5) continue;   // keep the door opening clear
      piece("ashlar", roundedBox(xb - xa - 0.025, 0.38, 0.1, 0.03), [(xa + xb) / 2, yy, 0.03], 0, { tile: 2, color: "#d0c4b4", jitter: 0.1, F }); }
    grimeStrip(F, -w / 2, w / 2, 1.3);
    // entrance: stoop (3 steps), door with transom, stone surround, house number, lamp
    for (let i = 0; i < 3; i++) piece("stone", roundedBox(2.2, 0.15 + i * 0.15, 0.36 * (3 - i), 0.02), [-2.8, 0.15 + (0.15 + i * 0.15) / 2, 0.36 * (3 - i) / 2], 0, { tile: 1.4, color: "#bfb5a6", jitter: 0.05, F });
    piece("paint", roundedBox(1.15, 2.2, 0.07, 0.015), [-2.8, 0.62 + 1.1, -0.3], 0, { color: "#2e4a3e", F });
    for (const yy of [1.2, 2.2]) piece("paint", roundedBox(0.8, 0.5, 0.03, 0.01), [-2.8, 0.62 + yy - 0.3, -0.255], 0, { color: "#3e5a4e", F });
    { const g = new THREE.PlaneGeometry(1.15, 0.45); g.translate(-2.8, 3.07, -0.3); g.applyMatrix4(F); tint(g, C(0xffffff)); B.glass.push(g); roomBox(F, -2.8, 2.84, 1.15, 0.45, -T - 0.4, 0, "winLit"); }
    piece("paint", roundedBox(1.3, 0.06, 0.12, 0.01), [-2.8, 2.84, -0.3], 0, { color: fc, F });
    for (const sx of [-1, 1]) piece("stone", roundedBox(0.22, 2.9, 0.16, 0.02), [-2.8 + sx * 0.77, 0.62 + 1.45, 0.05], 0, { tile: 1.2, color: "#d8cfc0", F });
    piece("stone", roundedBox(1.9, 0.3, 0.3, 0.03), [-2.8, 3.55, 0.1], 0, { tile: 1.2, color: "#d8cfc0", F });
    piece("metal", new THREE.SphereGeometry(0.04, 10, 8), [-2.45, 1.7, -0.25], 0, { color: "#c8a050", F });
    piece("lamp", new THREE.SphereGeometry(0.13, 16, 12), [-1.75, 2.7, 0.25], 0, { color: "#ffffff", F });
    piece("metal", roundedBox(0.05, 0.05, 0.25, 0.01), [-1.75, 2.7, 0.1], 0, { color: "#2a2a2a", F });
    // his window: deep frame in the reveal, raised lower sash (own mesh), sill
    piece("stone", roundedBox(1.84, 0.1, 0.42, 0.02), [0, 3.95, 0.02], 0, { tile: 1.2, color: "#e0d6c6", F });
    streak(F, 0, 3.86, 1.2, 1.6);
    for (const [ww, hh, px, py] of [[1.5, 0.08, 0, 5.96], [0.08, 2.0, -0.71, 5.0], [0.08, 2.0, 0.71, 5.0]]) piece("paint", roundedBox(ww, hh, 0.14, 0.012), [px, py, -0.2], 0, { color: fc, F });
    piece("stone", roundedBox(1.5, 0.04, 0.5, 0.01), [0, 4.0, -0.25], 0, { tile: 1, color: "#d8cfc0", F });
    { const n = 19; for (let i = 0; i < n; i++) piece("clay", roundedBox(0.082, 0.22, 0.1, 0.008), [-(n - 1) * 0.045 + i * 0.09, 6.12, -0.03], 0, { color: "#8a3a26", jitter: 0.25, F }); }
    const sash = (z) => { const parts = [], fr = (ww, hh, px, py) => { const g = roundedBox(ww, hh, 0.05, 0.01); boxUV(g, 1); tint(g, C(fc)); place(g, [px, py, z]); parts.push(clean(g)); };
      fr(1.36, 0.06, 0, 0.03); fr(1.36, 0.07, 0, 0.965); fr(0.06, 1.0, -0.65, 0.5); fr(0.06, 1.0, 0.65, 0.5);
      const m = new THREE.Mesh(mergeGeometries(parts), M.paint); m.castShadow = m.receiveShadow = true;
      const gl = new THREE.Mesh(new THREE.PlaneGeometry(1.26, 0.88).translate(0, 0.5, z), M.flyGlass); const gg = new THREE.Group(); gg.add(m, gl); return gg; };
    const upper = sash(-0.17); upper.position.y = 4.98; const lower = sash(-0.24); lower.position.y = 4.94;
    const sashG = new THREE.Group(); sashG.add(upper, lower); sashG.applyMatrix4(F); group.add(sashG);
    apt.lower = lower; apt.F = F;
    // fire escape (bays 2.8 / 5.6): grated landings, railings, stair, drop ladder, brackets
    const feX0 = 1.9, feX1 = 6.5, feD = 1.15, iron = "#26272a";
    for (const ly of [3.92, 7.22]) {
      for (let z = 0.08; z < feD; z += 0.09) piece("metal", roundedBox(feX1 - feX0, 0.03, 0.04, 0.005), [(feX0 + feX1) / 2, ly, z], 0, { color: iron, F });
      piece("metal", roundedBox(feX1 - feX0, 0.08, 0.05, 0.01), [(feX0 + feX1) / 2, ly - 0.02, feD], 0, { color: iron, F });
      for (const yy of [ly + 0.5, ly + 1.0]) piece("metal", roundedBox(feX1 - feX0, 0.035, 0.035, 0.008), [(feX0 + feX1) / 2, yy, feD], 0, { color: iron, F });
      for (const x of [feX0, feX1]) for (const yy of [ly + 0.5, ly + 1.0]) piece("metal", roundedBox(0.035, 0.035, feD, 0.008), [x, yy, feD / 2], 0, { color: iron, F });
      for (let x = feX0; x <= feX1 + 0.01; x += 0.115) piece("metal", new THREE.CylinderGeometry(0.009, 0.009, 1.0, 5), [x, ly + 0.5, feD], 0, { color: iron, F });
      for (const x of [feX0, feX1]) for (let z = 0.1; z < feD; z += 0.115) piece("metal", new THREE.CylinderGeometry(0.009, 0.009, 1.0, 5), [x, ly + 0.5, z], 0, { color: iron, F });
      for (const x of [feX0 + 0.2, feX1 - 0.2]) { const p = [V(x, ly - 0.05, 0.02), V(x, ly - 0.05, feD - 0.05), V(x, ly - 0.75, 0.02)];
        piece("metal", tube(p, 0.025, 8, 5, true), [0, 0, 0], 0, { color: iron, F }); }
    }
    { // stair between landings (stringers + treads)
      const a = V(feX0 + 0.5, 3.94, 0.55), b = V(feX1 - 0.6, 7.2, 0.55), n = 16;
      for (const dz of [-0.33, 0.33]) piece("metal", tube([a.clone().add(V(0, 0, dz)), b.clone().add(V(0, 0, dz))], 0.03, 2, 5), [0, 0, 0], 0, { color: iron, F });
      for (let i = 1; i < n; i++) { const p = a.clone().lerp(b, i / n); piece("metal", roundedBox(0.16, 0.025, 0.66, 0.005), [p.x, p.y, p.z], 0, { color: iron, F }); }
      for (const dz of [-0.33, 0.33]) piece("metal", tube([a.clone().add(V(0, 0.9, dz)), b.clone().add(V(0, 0.9, dz))], 0.02, 2, 5), [0, 0, 0], 0, { color: iron, F });
      // drop ladder (raised)
      for (const dx of [-0.22, 0.22]) piece("metal", roundedBox(0.04, 2.4, 0.04, 0.01), [feX1 - 0.5 + dx, 3.9 - 0.4, feD - 0.05], 0, { color: iron, F });
      for (let y = 2.5; y < 4.6; y += 0.3) piece("metal", new THREE.CylinderGeometry(0.012, 0.012, 0.44, 5).rotateZ(Math.PI / 2), [feX1 - 0.5, y, feD - 0.05], 0, { color: iron, F });
    }
  }

  // ---------------------------------------------------------------- POLICE (north, x 22..34, door x 28)
  const police = {};
  {
    const cx = 28, w = 12, F = frame(cx, "N"), h = 9.6, T = 0.45, holes = [], DY = POLICE_DOOR_Y;
    holes.push(rectHole(-1.0, DY, 1.0, DY + 2.9));                     // door opening (camera flies in)
    const flyWins = [-4.4, -2.5, 2.5, 4.4];
    for (const x of flyWins) windowAt(F, holes, x, 1.35, 1.15, 2.0, { kind: "fly", lintel: "stone", frameCol: "#e6e2d8", T });
    for (const x of [-4.4, -2.5, 0, 2.5, 4.4]) windowAt(F, holes, x, x === 0 ? 5.15 : 4.9, 1.15, x === 0 ? 2.0 : 2.1, { lintel: "stone", frameCol: "#e6e2d8", T, arch: x === 0 });
    wall(F, "brick", w, 0, h, holes, { T, color: "#c89a88" });
    shell(F, w, h, 14, { color: "#c89a88", sides: [false, false] });
    // rusticated base: real stone blocks
    for (let row = 0; row < 3; row++) { const yy = 0.2 + row * 0.42, off = row % 2 ? 0.55 : 0;
      for (let x = -w / 2 - off; x < w / 2; x += 1.1) { const xa = Math.max(-w / 2, x), xb = Math.min(w / 2, x + 1.1); if (xb - xa < 0.12) continue;
        if (xb > -1.05 && xa < 1.05) continue;
        let skip = false; for (const fx of flyWins) if (yy > 1.3 && xb > fx - 0.6 && xa < fx + 0.6) skip = true; if (skip) continue;
        piece("ashlar", roundedBox(xb - xa - 0.03, 0.39, 0.12, 0.035), [(xa + xb) / 2, yy, 0.04], 0, { tile: 2, color: "#b8b4ac", jitter: 0.12, F }); } }
    band(F, w, 1.36 + 0.0, "#c4beb2", 0.12, 0.1); band(F, w, 4.25, "#c4beb2", 0.2, 0.08);
    cornice(F, w, h - 0.75, { col: "#c8c0b0", k: "stone", out: 0.6 }); coping(F, w, h, T);
    grimeStrip(F, -w / 2, w / 2, 1.4);
    // steps + cheek walls + blue lamps
    for (let i = 0; i < 3; i++) piece("stone", roundedBox(3.4 - i * 0.1, 0.15 * (i + 1), 0.38 * (3 - i), 0.02), [0, 0.15 + 0.075 * (i + 1), 0.38 * (3 - i) / 2], 0, { tile: 1.4, color: "#b4aea4", jitter: 0.04, F });
    for (const sx of [-1, 1]) {
      piece("ashlar", roundedBox(0.5, 1.0, 1.25, 0.03), [sx * 1.95, 0.65, 0.62], 0, { tile: 1.5, color: "#b8b4ac", F });
      piece("stone", roundedBox(0.6, 0.1, 1.35, 0.02), [sx * 1.95, 1.2, 0.62], 0, { color: "#c4beb2", F });
      piece("metal", lathe([[0, 0], [0.12, 0], [0.12, 0.06], [0.05, 0.12], [0.04, 1.2], [0.08, 1.26], [0, 1.28]], 14), [sx * 1.95, 1.25, 1.0], 0, { color: "#1e2226", F });
      piece("blue", new THREE.SphereGeometry(0.2, 20, 14), [sx * 1.95, 2.72, 1.0], 0, { color: "#ffffff", F });
      piece("metal", new THREE.CylinderGeometry(0.08, 0.12, 0.08, 14), [sx * 1.95, 2.5, 1.0], 0, { color: "#1e2226", F });
      piece("metal", new THREE.ConeGeometry(0.12, 0.12, 14), [sx * 1.95, 2.96, 1.0], 0, { color: "#1e2226", F });
      piece("stone", roundedBox(0.36, 3.1, 0.2, 0.02), [sx * 1.18, DY + 1.55, 0.06], 0, { tile: 1.3, color: "#d6d0c4", F });
    }
    police.blueAt = [V(cx - 1.95, 2.72, -8.5 + 1.0), V(cx + 1.95, 2.72, -8.5 + 1.0)];
    // door surround: entablature + pediment
    piece("stone", roundedBox(3.0, 0.4, 0.3, 0.02), [0, DY + 3.15, 0.12], 0, { tile: 1.3, color: "#d6d0c4", F });
    piece("stone", roundedBox(3.3, 0.12, 0.42, 0.02), [0, DY + 3.41, 0.16], 0, { tile: 1.3, color: "#c8c2b6", F });
    // POLICE sign: blue panel + white 3D letters (glow at night)
    piece("paint", roundedBox(3.6, 0.72, 0.12, 0.03), [0, 4.45, 0.12], 0, { color: "#1e3a7a", F });
    { const font = new FontLoader().parse(helvBold); const tg = new TextGeometry("POLICE", { font, size: 0.42, depth: 0.06, curveSegments: 4, bevelEnabled: true, bevelThickness: 0.01, bevelSize: 0.008, bevelSegments: 1 });
      tg.computeBoundingBox(); const bb = tg.boundingBox; tg.translate(-(bb.max.x + bb.min.x) / 2, 4.45 - 0.21, 0.18);
      const lm = new THREE.MeshStandardMaterial({ color: C("#f4f6ff"), emissive: C("#e8f0ff"), emissiveIntensity: 0.1, roughness: 0.35 }); signMats.push([lm, 1.6]);
      xMesh(new THREE.Mesh(tg, lm), F); }
    { const tex = signTex("ZONE 3 STATION", { bg: "#d6d0c4", ink: "#2a2a30", w: 800, h: 120, border: null, font: "Georgia" });
      const pm = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.36), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.7 })); pm.position.set(0, DY + 3.15, 0.275); xMesh(pm, F); }
    // double doors (hinged at the jambs, swing outward), reveal, threshold
    const doors = [];
    for (const sx of [-1, 1]) {
      const leaf = new THREE.Group(); const parts = [];
      const fr = (ww, hh, px, py) => { const g = roundedBox(ww, hh, 0.06, 0.01); boxUV(g, 1); tint(g, C("#2a3a5a")); place(g, [px, py, 0]); parts.push(clean(g)); };
      fr(0.98, 0.1, -sx * 0.49, 0.05); fr(0.98, 0.25, -sx * 0.49, 1.0); fr(0.98, 0.1, -sx * 0.49, 2.8); fr(0.1, 2.85, -sx * 0.05, 1.42); fr(0.1, 2.85, -sx * 0.93, 1.42);
      const lm = new THREE.Mesh(mergeGeometries(parts), M.paint); lm.castShadow = lm.receiveShadow = true;
      const gl = new THREE.Mesh(new THREE.PlaneGeometry(0.78, 1.6).translate(-sx * 0.49, 1.92, 0), M.flyGlass);
      const gl2 = new THREE.Mesh(new THREE.PlaneGeometry(0.78, 0.7).translate(-sx * 0.49, 0.5, 0), M.paint); tint(gl2.geometry, C("#2a3a5a"));
      leaf.add(lm, gl, gl2); leaf.position.set(sx * 0.99, DY + 0.01, -0.12); leaf.userData.sx = sx;
      const pivot = new THREE.Group(); pivot.add(leaf); pivot.applyMatrix4(F); group.add(pivot); doors.push(leaf);
    }
    piece("stone", roundedBox(2.1, 0.05, T + 0.1, 0.01), [0, DY - 0.02, -T / 2], 0, { color: "#a8a298", F });
    police.doors = doors; police.F = F;
  }

  // ---------------------------------------------------------------- BANK 1 "FIRST CITY BANK" (south, x -4..8, door x 2)
  const bank1 = {};
  {
    const cx = 2, w = 12, F = frame(cx, "S"), h = 9.4, T = 0.6, holes = [];
    holes.push(rectHole(-1.15, 0.15, 1.15, 3.9));                      // door opening (camera flies in)
    for (const x of [-3.7, 3.7]) holes.push(archHole(x - 0.8, 1.3, x + 0.8, 4.5));
    wall(F, "lime", w, 0, h, holes, { T, color: "#efe4d0", tile: 2.4 });
    for (let row = 0; row < 10; row++) { const yy = 1.38 + row * 0.53, off = row % 2 ? 0.6 : 0;           // rusticated ashlar courses (real chamfered blocks)
      for (let x = -w / 2 - off; x < w / 2; x += 1.2) { const xa = Math.max(-w / 2, x), xb = Math.min(w / 2, x + 1.2); if (xb - xa < 0.15) continue;
        const hit = (cx0, hw, y0, y1) => xb > cx0 - hw && xa < cx0 + hw && yy + 0.26 > y0 && yy - 0.26 < y1;
        if (hit(0, 1.32, 0, 4.15) || hit(-3.7, 1.02, 1.1, 5.6) || hit(3.7, 1.02, 1.1, 5.6)) continue;
        piece("lime", roundedBox(xb - xa - 0.035, 0.5, 0.07, 0.03), [(xa + xb) / 2, yy, 0.02], 0, { tile: 2.4, color: "#f4ead8", jitter: 0.07, F }); } }
    shell(F, w, h, 14, { k: "lime", color: "#e8dcc8", sides: [false, false] });
    // rusticated base course blocks + plinth
    for (let row = 0; row < 2; row++) { const yy = 0.32 + row * 0.5, off = row ? 0.6 : 0;
      for (let x = -w / 2 - off; x < w / 2; x += 1.2) { const xa = Math.max(-w / 2, x), xb = Math.min(w / 2, x + 1.2); if (xb - xa < 0.12) continue; if (xb > -1.2 && xa < 1.2) continue;
        piece("lime", roundedBox(xb - xa - 0.03, 0.47, 0.14, 0.04), [(xa + xb) / 2, yy, 0.05], 0, { tile: 2.4, color: "#e6dccb", jitter: 0.08, F }); } }
    // arched windows: frames, glass (fly), keystones, sills
    for (const x of [-3.7, 3.7]) {
      const pts = []; for (let i = 0; i <= 18; i++) { const a = (i / 18) * Math.PI; pts.push(V(x + Math.cos(a) * 0.92, 4.5 + Math.sin(a) * 0.92, 0.03)); }
      piece("lime", tube(pts, 0.11, 30, 8), [0, 0, 0], 0, { color: "#efe6d6", F });
      piece("lime", roundedBox(0.34, 0.5, 0.26, 0.03), [x, 5.45, 0.08], 0, { tile: 1, color: "#f6eee0", F });
      piece("lime", roundedBox(2.0, 0.12, 0.42, 0.02), [x, 1.24, 0.06], 0, { color: "#e6dccb", F });
      for (const [ww, hh, px, py] of [[1.6, 0.08, x, 1.34], [0.08, 3.2, x - 0.76, 2.9], [0.08, 3.2, x + 0.76, 2.9], [0.06, 3.2, x, 2.9], [1.6, 0.06, x, 3.6]])
        piece("metal", roundedBox(ww, hh, 0.08, 0.01), [px, py, -0.3], 0, { color: "#b08a40", F });
      const ap = []; for (let i = 0; i <= 16; i++) { const a = (i / 16) * Math.PI; ap.push(V(x + Math.cos(a) * 0.76, 4.5 + Math.sin(a) * 0.76, -0.3)); }
      piece("metal", tube(ap, 0.04, 24, 6), [0, 0, 0], 0, { color: "#b08a40", F });
      const gs = archShape(x - 0.8, 1.3, x + 0.8, 4.5); const gg = new THREE.ShapeGeometry(gs, 16); gg.translate(0, 0, -0.32); bank1.glass = bank1.glass || []; bank1.glass.push(gg.applyMatrix4(F));
    }
    // engaged fluted columns + ionic-ish capitals
    const column = (x) => {
      const g = new THREE.CylinderGeometry(0.3, 0.34, 5.6, 48, 12, true); const p = g.attributes.position;
      for (let i = 0; i < p.count; i++) { const px = p.getX(i), pz = p.getZ(i), a = Math.atan2(pz, px), rr = Math.hypot(px, pz); const k = 1 - 0.045 * Math.pow(Math.max(0, Math.cos(a * 20)), 2);
        const yy = p.getY(i) / 5.6 + 0.5; const ent = 1 + 0.03 * Math.sin(yy * Math.PI); p.setX(i, Math.cos(a) * rr * k * ent); p.setZ(i, Math.sin(a) * rr * k * ent); }
      g.computeVertexNormals(); piece("lime", g, [x, 1.1 + 2.8, 0.1], 0, { tile: 3, color: "#faf2e4", F });
      piece("lime", roundedBox(0.95, 0.35, 0.75, 0.03), [x, 0.33, 0.1], 0, { tile: 2, color: "#e6dccb", F });
      piece("lime", lathe([[0, 0], [0.45, 0], [0.45, 0.1], [0.4, 0.16], [0.42, 0.24], [0.36, 0.3], [0.34, 0.3], [0, 0.3]], 32), [x, 0.5, 0.1], 0, { tile: 2, color: "#f0e6d6", F });
      piece("lime", lathe([[0, 0], [0.32, 0], [0.38, 0.08], [0.42, 0.2], [0, 0.2]], 32), [x, 6.7, 0.1], 0, { tile: 2, color: "#f6eee0", F });
      piece("lime", roundedBox(0.95, 0.14, 0.85, 0.02), [x, 7.0, 0.12], 0, { tile: 2, color: "#f6eee0", F });
      for (const sx of [-1, 1]) piece("lime", new THREE.TorusGeometry(0.11, 0.05, 8, 18), [x + sx * 0.38, 6.8, 0.47], 0, { tile: 1, color: "#f6eee0", F });
    };
    for (const x of [-5.5, -1.75, 1.75, 5.5]) column(x);
    // entablature: architrave, frieze (3D letters), dentil cornice, attic
    piece("lime", roundedBox(w + 0.3, 0.5, 0.62, 0.03), [0, 7.32, 0.12], 0, { tile: 2.4, color: "#f2e8d8", F });
    piece("lime", roundedBox(w + 0.2, 0.75, 0.42, 0.02), [0, 7.94, 0.03], 0, { tile: 2.4, color: "#efe4d2", F });
    cornice(F, w + 0.3, 9.0, { col: "#f2e8d8", k: "lime", out: 0.65, brackets: false });
    { const font = new FontLoader().parse(serifBold); const tg = new TextGeometry("FIRST CITY BANK", { font, size: 0.44, depth: 0.05, curveSegments: 5, bevelEnabled: true, bevelThickness: 0.01, bevelSize: 0.008, bevelSegments: 1 });
      tg.computeBoundingBox(); const bb = tg.boundingBox; tg.translate(-(bb.max.x + bb.min.x) / 2, 7.72, 0.25);
      const lm = new THREE.MeshStandardMaterial({ color: C("#b88a3a"), metalness: 0.8, roughness: 0.32, emissive: C("#ffc870"), emissiveIntensity: 0, envMapIntensity: 1.4 }); signMats.push([lm, 0.35]);
      xMesh(new THREE.Mesh(tg, lm), F); }
    coping(F, w + 0.3, h, T);
    grimeStrip(F, -w / 2, w / 2, 0.9);
    // door: bronze surround, transom, glass leaves
    for (const [ww, hh, px, py] of [[2.5, 0.16, 0, 3.98], [0.16, 3.9, -1.2, 2.05], [0.16, 3.9, 1.2, 2.05], [2.3, 0.1, 0, 3.15]])
      piece("metal", roundedBox(ww, hh, 0.2, 0.015), [px, py, -0.15], 0, { color: "#a8823a", F });
    { const g = new THREE.PlaneGeometry(2.2, 0.75); g.translate(0, 3.55, -0.18); bank1.glass.push(g.applyMatrix4(F)); }
    piece("lime", roundedBox(2.4, 0.04, T + 0.2, 0.01), [0, 0.16, -T / 2], 0, { color: "#8a8478", F });
    bank1.doors = []; for (const sx of [-1, 1]) {
      const leaf = new THREE.Group(), parts = [];
      const fr = (ww, hh, px, py) => { const g = roundedBox(ww, hh, 0.05, 0.008); boxUV(g, 1); tint(g, C("#b08a40")); place(g, [px, py, 0]); parts.push(clean(g)); };
      fr(1.05, 0.12, -sx * 0.53, 0.06); fr(1.05, 0.08, -sx * 0.53, 2.94); fr(0.07, 2.98, -sx * 0.04, 1.49); fr(0.07, 2.98, -sx * 1.02, 1.49); fr(0.9, 0.05, -sx * 0.53, 1.05);
      const lm = new THREE.Mesh(mergeGeometries(parts), M.metal); lm.castShadow = true;
      const gl = new THREE.Mesh(new THREE.PlaneGeometry(0.92, 2.76).translate(-sx * 0.53, 1.5, 0), M.flyGlass);
      leaf.add(lm, gl); leaf.position.set(sx * 1.1, 0.16, -0.1); leaf.userData.sx = sx;
      const pv = new THREE.Group(); pv.add(leaf); pv.applyMatrix4(F); group.add(pv); bank1.doors.push(leaf);
    }
    // brass lanterns on the outer columns
    for (const sx of [-1, 1]) { piece("metal", roundedBox(0.08, 0.08, 0.5, 0.01), [sx * 3.0, 3.4, 0.2], 0, { color: "#7a5a2a", F });
      piece("lamp", roundedBox(0.26, 0.4, 0.26, 0.02), [sx * 3.0, 3.25, 0.5], 0, { color: "#ffffff", F });
      piece("metal", new THREE.ConeGeometry(0.22, 0.2, 4).rotateY(Math.PI / 4), [sx * 3.0, 3.55, 0.5], 0, { color: "#7a5a2a", F }); }
    bank1.F = F;
  }

  // ---------------------------------------------------------------- BANK 2 "PEOPLES SAVINGS & LOAN" (south, x 14..24, door x 19)
  const bank2 = {};
  {
    const cx = 19, w = 10, F = frame(cx, "S"), h = 8.8, T = 0.45, holes = [];
    holes.push(rectHole(-0.95, 0.15, 0.95, 3.25));
    for (const [a, b] of [[-4.1, -1.45], [1.45, 4.1]]) holes.push(rectHole(a, 0.7, b, 3.25));
    for (const x of [-3.3, -1.1, 1.1, 3.3]) windowAt(F, holes, x, 5.25, 1.2, 1.9, { lintel: "stone", frameCol: "#e8e0cc", T });
    wall(F, "brick", w, 0, h, holes, { T, color: "#f0c4a8" });
    shell(F, w, h, 12, { color: "#f0c4a8", sides: [false, false] });
    // limestone ground storey: pilasters, base, sign band
    for (const x of [-4.55, -1.2, 1.2, 4.55]) piece("lime", roundedBox(x === -4.55 || x === 4.55 ? 0.9 : 0.5, 3.6, 0.18, 0.02), [x, 1.8, 0.05], 0, { tile: 2.4, color: "#efe6d4", F });
    piece("lime", roundedBox(w + 0.1, 0.7, 0.16, 0.03), [0, 0.35, 0.03], 0, { tile: 2.4, color: "#e2d8c4", F });
    piece("paint", roundedBox(w + 0.2, 1.0, 0.18, 0.03), [0, 4.15, 0.08], 0, { color: "#1e4a34", F });
    for (const yy of [3.62, 4.68]) piece("metal", roundedBox(w + 0.25, 0.06, 0.22, 0.01), [0, yy, 0.1], 0, { color: "#b08a40", F });
    { const font = new FontLoader().parse(serifBold); const tg = new TextGeometry("PEOPLES SAVINGS & LOAN", { font, size: 0.36, depth: 0.05, curveSegments: 5, bevelEnabled: true, bevelThickness: 0.01, bevelSize: 0.007, bevelSegments: 1 });
      tg.computeBoundingBox(); const bb = tg.boundingBox; const s = Math.min(1, 9.0 / (bb.max.x - bb.min.x)); tg.scale(s, s, 1); tg.computeBoundingBox();
      tg.translate(-(tg.boundingBox.max.x + tg.boundingBox.min.x) / 2, 3.98, 0.19);
      const lm = new THREE.MeshStandardMaterial({ color: C("#d4a848"), metalness: 0.8, roughness: 0.3, emissive: C("#ffd890"), emissiveIntensity: 0, envMapIntensity: 1.4 }); signMats.push([lm, 1.2]);
      xMesh(new THREE.Mesh(tg, lm), F); }
    band(F, w, 4.85, "#e2d8c4", 0.16, 0.06);
    cornice(F, w, h - 0.75, { col: "#1e4a34" }); coping(F, w, h, T);
    grimeStrip(F, -w / 2, w / 2, 0.8);
    // storefront windows: aluminium frames, glass (fly), green bulkhead lettering
    bank2.glass = [];
    for (const [a, b] of [[-4.1, -1.45], [1.45, 4.1]]) { const c = (a + b) / 2, ww = b - a;
      for (const [fw, fh, px, py] of [[ww, 0.07, c, 0.74], [ww, 0.07, c, 3.21], [0.06, 2.5, a + 0.03, 1.97], [0.06, 2.5, b - 0.03, 1.97], [0.05, 2.5, c, 1.97]])
        piece("metal", roundedBox(fw, fh, 0.08, 0.01), [px, py, -0.22], 0, { color: "#c8ccd0", F });
      const g = new THREE.PlaneGeometry(ww, 2.55); g.translate(c, 1.97, -0.25); bank2.glass.push(g.applyMatrix4(F)); }
    for (const [ww, hh, px, py] of [[2.0, 0.1, 0, 3.22], [0.1, 3.1, -0.95, 1.7], [0.1, 3.1, 0.95, 1.7]]) piece("metal", roundedBox(ww, hh, 0.14, 0.012), [px, py, -0.15], 0, { color: "#c8ccd0", F });
    piece("lime", roundedBox(2.0, 0.04, T + 0.2, 0.01), [0, 0.16, -T / 2], 0, { color: "#8a8478", F });
    bank2.doors = []; for (const sx of [-1, 1]) {
      const leaf = new THREE.Group(), parts = [];
      const fr = (ww, hh, px, py) => { const g = roundedBox(ww, hh, 0.05, 0.008); boxUV(g, 1); tint(g, C("#c8ccd0")); place(g, [px, py, 0]); parts.push(clean(g)); };
      fr(0.9, 0.12, -sx * 0.45, 0.06); fr(0.9, 0.08, -sx * 0.45, 2.94); fr(0.07, 2.98, -sx * 0.04, 1.49); fr(0.07, 2.98, -sx * 0.86, 1.49); fr(0.06, 0.05, -sx * 0.45, 1.05);
      fr(0.04, 0.6, -sx * 0.18, 1.2);
      const lm = new THREE.Mesh(mergeGeometries(parts), M.metal); lm.castShadow = true;
      const gl = new THREE.Mesh(new THREE.PlaneGeometry(0.78, 2.76).translate(-sx * 0.45, 1.5, 0), M.flyGlass);
      leaf.add(lm, gl); leaf.position.set(sx * 0.9, 0.16, -0.1); leaf.userData.sx = sx;
      const pv = new THREE.Group(); pv.add(leaf); pv.applyMatrix4(F); group.add(pv); bank2.doors.push(leaf);
    }
    // bracket clock at the corner + US flag pole
    { const clockTex = canvasTex(256, 256, (g) => { g.fillStyle = "#f6f0e0"; g.beginPath(); g.arc(128, 128, 126, 0, 7); g.fill(); g.strokeStyle = "#1a1a1a"; g.lineWidth = 6;
        for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; g.beginPath(); g.moveTo(128 + Math.cos(a) * 100, 128 + Math.sin(a) * 100); g.lineTo(128 + Math.cos(a) * 116, 128 + Math.sin(a) * 116); g.stroke(); }
        g.lineWidth = 8; g.beginPath(); g.moveTo(128, 128); g.lineTo(128 + 50, 128 - 30); g.stroke(); g.lineWidth = 5; g.beginPath(); g.moveTo(128, 128); g.lineTo(128 - 10, 128 - 90); g.stroke(); });
      const cm = new THREE.MeshStandardMaterial({ map: clockTex, emissiveMap: clockTex, emissive: C("#ffffff"), emissiveIntensity: 0, roughness: 0.4 }); signMats.push([cm, 0.9]);
      const face = new THREE.Mesh(new THREE.CircleGeometry(0.36, 32), cm); const face2 = face.clone(); face.rotation.y = Math.PI / 2; face.position.set(-4.6 + 0.08, 5.3, 0.9); face2.rotation.y = -Math.PI / 2; face2.position.set(-4.6 - 0.08, 5.3, 0.9);
      xMesh(face, F); xMesh(face2, F);
      piece("metal", new THREE.CylinderGeometry(0.42, 0.42, 0.15, 32).rotateZ(Math.PI / 2), [-4.6, 5.3, 0.9], 0, { color: "#1e4a34", F });
      piece("metal", roundedBox(0.08, 0.08, 0.6, 0.01), [-4.6, 5.3, 0.3], 0, { color: "#b08a40", F });
      piece("metal", new THREE.SphereGeometry(0.07, 10, 8), [-4.6, 5.78, 0.9], 0, { color: "#b08a40", F });
      piece("metal", tube([V(3.6, 5.0, 0.05), V(3.6, 6.25, 1.6)], 0.03, 2, 6), [0, 0, 0], 0, { color: "#d8d8d8", F });
      const flagTex = canvasTex(380, 200, (g) => { for (let i = 0; i < 13; i++) { g.fillStyle = i % 2 ? "#f4f0e8" : "#b22234"; g.fillRect(0, (i * 200) / 13, 380, 200 / 13 + 1); }
        g.fillStyle = "#3c3b6e"; g.fillRect(0, 0, 152, 108); g.fillStyle = "#fff"; for (let y = 0; y < 9; y++) for (let x = 0; x < (y % 2 ? 5 : 6); x++) g.fillRect(10 + x * 25 + (y % 2) * 12, 8 + y * 11, 4, 4); });
      const fg = new THREE.PlaneGeometry(1.5, 0.8, 16, 4); const fp = fg.attributes.position;
      for (let i = 0; i < fp.count; i++) { const u = fp.getX(i) + 0.75; fp.setZ(i, Math.sin(u * 4.2) * 0.07 * u); fp.setY(i, fp.getY(i) - u * 0.25); } fg.computeVertexNormals();
      fg.translate(0.75, 0, 0); const flag = new THREE.Mesh(fg, new THREE.MeshStandardMaterial({ map: flagTex, roughness: 0.8, side: THREE.DoubleSide }));
      flag.rotation.y = -Math.PI / 2; flag.position.set(3.6, 5.85, 1.1); xMesh(flag, F); }
    bank2.F = F;
  }

  // ---------------------------------------------------------------- other blocks (shops), corner buildings
  const shops = [
    { x0: -26, x1: -16.5, side: "N", sides: [false, true], h: 12.0, sign: ["HARDWARE", "#2a3a5a", "#f4e8c8", "EST. 1921"], awning: ["#f4efe6", "#2a4a8a"], shop: 1, sides: [true, true] },
    { x0: -16.5, x1: -7.0, side: "N", h: 10.4, sign: ["PHARMACY", "#f4f0e6", "#1e6a3a"], shop: 2, doorAt: "R", wall: "brickY", tint: "#ffffff" },
    { x0: 7.0, x1: 14.5, side: "N", h: 10.2, sign: ["LUCKY PAWN", "#1a1a1a", "#f2c040"], shop: 1, blade: ["PAWN", "#1a1a1a", "#ffd040"], arch: true },
    { x0: 14.5, x1: 22.0, side: "N", h: 11.0, sign: ["SAM'S DINER", "#b02a24", "#fff4e0"], awning: ["#fff4e6", "#b02a24"], shop: 0, doorAt: "R", blade: ["DINER", "#2a1a1a", "#ff6a5a"] },
    { x0: 34.0, x1: 41.0, side: "N", h: 10.8, sign: ["BOOKS", "#3a2a1c", "#e8c870"], shop: 1, wall: "brickY", tint: "#f8e8d8" },
    { x0: 41.0, x1: 48.0, side: "N", sides: [true, false], h: 12.6, sign: ["LAUNDROMAT", "#e8f0f4", "#2a6a9a"], shop: 3, awning: ["#e8f0f4", "#2a6a9a"] },
    { x0: -26, x1: -16.0, side: "S", sides: [true, false], h: 11.6, sign: ["PIZZA", "#1e5a2a", "#fff4e0"], awning: ["#f4efe6", "#1e6a3a"], shop: 0, blade: ["PIZZA", "#1a1a1a", "#ff8040"] },
    { x0: -16.0, x1: -4.0, side: "S", h: 10.6, sign: ["BARBER SHOP", "#f4efe6", "#b02a24"], shop: 2, doorAt: "R", arch: true },
    { x0: 8.0, x1: 14.0, side: "S", h: 9.8, sign: ["RECORDS", "#3a1a4a", "#f2c8e0"], shop: 1, wall: "brickY", tint: "#ffffff" },
    { x0: 24.0, x1: 31.0, side: "S", h: 11.4, sign: ["FLOWERS", "#f4efe6", "#2a6a3a"], awning: ["#f4efe6", "#2a6a3a"], shop: 2 },
    { x0: 31.0, x1: 39.0, side: "S", h: 12.2, sign: ["ELECTRONICS", "#1a2a4a", "#9ad0ff", "TV - VCR - STEREO"], shop: 3 },
    { x0: 39.0, x1: 48.0, side: "S", sides: [false, true], h: 10.6, sign: ["DELI", "#f2d8a0", "#8a2a1a"], awning: ["#f2e8d0", "#8a2a1a"], shop: 0 },
    // beyond the cross streets (depth layers)
    { x0: -48, x1: -34, side: "N", sides: [true, false], h: 13.5, sign: ["FURNITURE", "#3a2a1c", "#f2dca6"], shop: 1 },
    { x0: -60, x1: -48, side: "N", h: 10.5, sign: ["SHOES", "#f4efe6", "#3a2a1c"], shop: 2 },
    { x0: -48, x1: -34, side: "S", sides: [false, true], h: 11.5, sign: ["BAKERY", "#f2dca6", "#5a2e12"], shop: 0, awning: ["#f4efe6", "#c4472c"] },
    { x0: -62, x1: -48, side: "S", h: 14.5, sign: ["HOTEL", "#1a1a2a", "#f2c040"], shop: 3 },
    { x0: 60, x1: 72, side: "N", sides: [false, true], h: 12.5, sign: ["TAILOR", "#2a2a3a", "#e8dcc0"], shop: 1 },
    { x0: 72, x1: 84, side: "N", h: 15.0, sign: ["THEATRE", "#6a1a1a", "#ffd890"], shop: 0 },
    { x0: 60, x1: 74, side: "S", sides: [true, false], h: 11.0, sign: ["GROCERY", "#1e5a2a", "#f4efe6"], shop: 2, awning: ["#f4efe6", "#1e6a3a"] },
    { x0: 74, x1: 86, side: "S", h: 13.0, sign: ["CAFE", "#3a2a1c", "#f2c8a0"], shop: 0 },
  ];
  for (const D of shops) building({ ...D, bays: Math.max(2, Math.round((D.x1 - D.x0) / 2.5)) });
  // corner side walls along the cross streets: brick with window cards + a faded painted ad
  const sideWall = (x, z0, z1, h, facing, ad = null, col = "#ffd6bc") => {
    const len = z1 - z0, F = new THREE.Matrix4().makeRotationY(facing > 0 ? Math.PI / 2 : -Math.PI / 2).setPosition(x, 0, (z0 + z1) / 2);
    const holes = []; for (let zz = -len / 2 + 1.6; zz < len / 2 - 1; zz += 2.8) for (let fy = 4.9; fy < h - 2.6; fy += 3.3) windowAt(F, holes, zz, fy, 1.0, 1.7, { lintel: "soldier", T: 0.42 });
    if (ad) { const tex = signTex(ad[0], { bg: ad[1], ink: ad[2], w: 1024, h: 420, sub: ad[3], border: ad[2] });
      const m = new THREE.Mesh(new THREE.PlaneGeometry(6, 2.4), new THREE.MeshStandardMaterial({ map: tex, transparent: true, opacity: 0.62, roughness: 0.9, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }));
      m.position.set(0, h - 2.2, 0.01); xMesh(m, F); m.castShadow = false; }
    wall(F, "brick", len, 0, h, holes, { T: 0.42, color: col });
    coping(F, len, h, 0.42); grimeStrip(F, -len / 2, len / 2, 1.2);
  };
  sideWall(48.0, -22.5, -8.5, 12.6, 1, ["SMITH & SONS", "#3a5a8a", "#f4ecd8", "HARDWARE  -  SINCE 1921"]);
  sideWall(48.0, 8.5, 22.5, 10.6, 1);
  sideWall(-26.0, -22.5, -8.5, 12.0, -1, ["DRINK FRESH MILK", "#b02a24", "#f4ecd8", "PITTSBURGH DAIRY"]);
  sideWall(-26.0, 8.5, 22.5, 11.6, -1);
  sideWall(60.0, -22.5, -8.5, 12.5, -1); sideWall(60.0, 8.5, 22.5, 11.0, -1); sideWall(-34.0, -22.5, -8.5, 13.5, 1); sideWall(-34.0, 8.5, 22.5, 11.5, 1);

  // ---------------------------------------------------------------- ground: road, kerbs, sidewalks, cross streets
  const RX0 = -140, RX1 = 180;
  { const g = new THREE.PlaneGeometry(RX1 - RX0, 10, 64, 4); g.rotateX(-Math.PI / 2); g.translate((RX0 + RX1) / 2, 0, 0); boxUV(g, 4.5);
    const cs = new Float32Array(g.attributes.position.count * 3).fill(1); g.setAttribute("color", new THREE.BufferAttribute(cs, 3)); B.asphalt.push(g); }
  for (const [xa, xb] of [[-34, -26], [48, 60]]) for (const zs of [-1, 1]) {        // cross streets
    const g = new THREE.PlaneGeometry(xb - xa, 120); g.rotateX(-Math.PI / 2); g.translate((xa + xb) / 2, 0, zs * 65); boxUV(g, 4.5); tint(g, C(0xffffff)); B.asphalt.push(g); }
  const sidewalkRun = (xa, xb, zs) => {     // slabs (individual, bevelled, tone + height jitter), kerb stones, gutter
    const z0 = 5.2, z1 = 8.5, rows = 2, rw = (z1 - z0) / rows;
    for (let x = xa; x < xb - 0.05; x += 1.5) { const len = Math.min(1.5, xb - x);
      for (let k = 0; k < rows; k++) piece("slab", roundedBox(len - 0.018, 0.16, rw - 0.018, 0.012, 1), [x + len / 2, 0.07 + (r() - 0.5) * 0.008, zs * (z0 + rw * (k + 0.5))], [(r() - 0.5) * 0.004, 0, (r() - 0.5) * 0.004], { tile: 1.6, color: "#d8d2c8", jitter: 0.14 }); }
    for (let x = xa; x < xb - 0.05; x += 1.2) { const len = Math.min(1.2, xb - x);
      piece("stone", roundedBox(len - 0.012, 0.22, 0.2, 0.03, 2), [x + len / 2, 0.05, zs * 5.1], 0, { tile: 1.2, color: "#b8b2a8", jitter: 0.12 }); }
    const g = new THREE.PlaneGeometry(xb - xa, 0.42); g.rotateX(-Math.PI / 2); g.translate((xa + xb) / 2, 0.006, zs * 4.79); piece("stone", g, [0, 0, 0], 0, { tile: 1.5, color: "#8a8478" });
  };
  for (const zs of [-1, 1]) for (const [xa, xb] of [[RX0, -34], [-26, 48], [60, RX1]]) sidewalkRun(xa, xb, zs);
  // cross-street sidewalks (along Z)
  for (const xc of [-34, -26, 48, 60]) for (const zs of [-1, 1]) { const inside = xc === -34 || xc === 48 ? -1 : 1;
    for (let z = 8.5; z < 125; z += 1.5) piece("slab", roundedBox(1.58, 0.16, 1.48, 0.012, 1), [xc + inside * 0.8, 0.07, zs * (z + 0.75)], 0, { tile: 1.6, color: "#d8d2c8", jitter: 0.14 }); }
  // tar roads continue into the distance: lane markings (centre double yellow, parking lines), crosswalks, manholes, patches, puddles, cracks
  const line = (x0, x1, z, w, col) => { const g = new THREE.PlaneGeometry(x1 - x0, w); g.rotateX(-Math.PI / 2); g.translate((x0 + x1) / 2, 0.004, z); piece("line", g, [0, 0, 0], 0, { tile: 1, color: col }); };
  for (const [xa, xb] of [[RX0, -34], [-26, 48], [60, RX1]]) { line(xa, xb, -0.09, 0.1, "#e8b830"); line(xa, xb, 0.09, 0.1, "#e8b830");
    for (const zs of [-1, 1]) for (let x = xa + 1; x < xb - 3; x += 7) line(x, x + 0.1, zs * 3.0, 2.0, "#e8e4dc"); }
  for (const xc of [-30, 54]) for (const xs of [-1, 1]) for (let z = -4.2; z <= 4.3; z += 0.85) { const g = new THREE.PlaneGeometry(0.5, 2.6); g.rotateX(-Math.PI / 2); g.rotateY(Math.PI / 2);
    g.translate(xc + xs * 5.6, 0.004, z); piece("line", g, [0, 0, 0], 0, { tile: 1, color: "#ece8e0", jitter: 0.08 }); }
  for (const [mx, mz] of [[-8, 1.8], [12.5, -1.6], [36, 2.2]]) {
    const tx = canvasTex(256, 256, (g) => { g.fillStyle = "#3a3634"; g.beginPath(); g.arc(128, 128, 126, 0, 7); g.fill(); g.strokeStyle = "#5a5450"; g.lineWidth = 6;
      for (let i = -5; i <= 5; i++) { g.beginPath(); g.moveTo(128 + i * 22, 8); g.lineTo(128 + i * 22, 248); g.stroke(); } g.lineWidth = 10; g.beginPath(); g.arc(128, 128, 116, 0, 7); g.stroke(); });
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.44, 0.03, 32), new THREE.MeshStandardMaterial({ map: tx, roughness: 0.45, metalness: 0.6 }));
    m.position.set(mx, 0.008, mz); m.receiveShadow = true; extra.push(m); }
  for (let i = 0; i < 26; i++) {          // patches (raised a few mm, darker), puddles (glossy), crack strips
    const pud = i % 3 === 0, cx = -60 + r() * 140, cz = pud ? (r() < 0.5 ? -1 : 1) * (3.9 + r() * 0.6) : (r() - 0.5) * 8.6, s = new THREE.Shape(), n = 14, rr = pud ? 0.25 + r() * 0.45 : 0.5 + r() * 1.1;
    for (let k = 0; k < n; k++) { const a = (k / n) * Math.PI * 2, q = rr * (0.8 + r() * 0.3) * (1 + 0.25 * Math.sin(a * 3 + i)); k ? s.lineTo(Math.cos(a) * q * 1.6, Math.sin(a) * q) : s.moveTo(Math.cos(a) * q * 1.6, Math.sin(a) * q); }
    const g = new THREE.ShapeGeometry(s); g.rotateX(-Math.PI / 2); g.translate(cx, i % 3 === 0 ? 0.006 : 0.003, cz);
    if (i % 3 === 0) { tint(g, C(0xffffff)); boxUV(g, 1); B.puddle.push(g); } else { boxUV(g, 4.5, [r(), r()]); tint(g, C(i % 2 ? "#a8a49e" : "#c4c0ba")); B.asphalt.push(g); } }
  for (let i = 0; i < 40; i++) { const pts = []; let x = -50 + r() * 120, z = (r() - 0.5) * 9; for (let k = 0; k < 7; k++) { pts.push(V(x, 0.004, z)); x += (r() - 0.5) * 0.9; z += (r() - 0.5) * 0.9; }
    const g = tube(pts, 0.012, 20, 3); g.scale(1, 0.15, 1); piece("line", g, [0, 0, 0], 0, { color: "#1a1816" }); }
  // storm drains at the kerb
  for (const [dx, zs] of [[-12, -1], [18, 1], [40, -1]]) { piece("metal", roundedBox(0.9, 0.04, 0.4, 0.01), [dx, 0.01, zs * 4.75], 0, { color: "#2a2a2a" });
    for (let k = -3; k <= 3; k++) piece("line", roundedBox(0.04, 0.01, 0.34, 0.004), [dx + k * 0.11, 0.035, zs * 4.75], 0, { color: "#0a0a0a" }); }

  // ---------------------------------------------------------------- street furniture
  const lampHeads = [];
  const streetLamp = (x, zs) => {        // cobra-head on a tapered steel pole, arm over the road
    const z = zs * 5.55; piece("metal", lathe([[0, 0], [0.18, 0], [0.18, 0.4], [0.12, 0.5], [0.075, 7.3], [0, 7.3]], 16), [x, 0.15, z], 0, { uv: "keep", color: "#7a7e80" });
    const arm = [V(x, 7.0, z), V(x, 7.6, z - zs * 0.4), V(x, 7.75, z - zs * 1.4), V(x, 7.7, z - zs * 2.2)];
    piece("metal", tube(arm, 0.045, 24, 8), [0, 0, 0], 0, { color: "#7a7e80" });
    const hd = new THREE.SphereGeometry(1, 20, 12); hd.scale(0.32, 0.14, 0.62); piece("metal", hd, [x, 7.68, z - zs * 2.55], [0, 0, 0], { color: "#8a8e90" });
    const lens = new THREE.SphereGeometry(1, 16, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2); lens.scale(0.25, 0.08, 0.45); piece("lamp", lens, [x, 7.62, z - zs * 2.55], 0, { color: "#ffffff" });
    lampHeads.push(V(x, 7.5, z - zs * 2.55));
  };
  for (const x of [-46, -18, -9.2, 24.5, 44, 70]) streetLamp(x, -1);
  for (const x of [-38, -9, 10.8, 27, 46, 80]) streetLamp(x, 1);
  // trees: bent trunk + branches + lumpy foliage blobs, iron grate pits
  const tree = (x, zs, s = 1) => {
    const z = zs * 6.3, lean = (r() - 0.5) * 0.3;
    piece("wood", tube([V(x, 0.1, z), V(x + lean * 0.3, 1.6 * s, z + 0.05), V(x + lean, 3.2 * s, z - 0.05)], 0.11 * s, 10, 8), [0, 0, 0], 0, { color: "#6a5a4a" });
    for (let b = 0; b < 4; b++) { const a = b * 1.7 + r(); piece("wood", tube([V(x + lean * 0.8, 2.6 * s, z), V(x + lean + Math.cos(a) * 1.1 * s, 3.6 * s + r() * 0.5, z + Math.sin(a) * 1.0 * s)], 0.05 * s, 6, 6), [0, 0, 0], 0, { color: "#5a4a3a" }); }
    for (let k = 0; k < 13; k++) {
      let g = new THREE.IcosahedronGeometry(1, 3); g.deleteAttribute("uv"); g.deleteAttribute("normal"); g = mergeVertices(g);
      const p = g.attributes.position, ph = r() * 10;
      for (let i = 0; i < p.count; i++) { const vx = p.getX(i), vy = p.getY(i), vz = p.getZ(i); const n = 1 + 0.16 * Math.sin(vx * 5 + ph) * Math.sin(vy * 6 + ph) * Math.sin(vz * 5.5) + 0.08 * Math.sin(vx * 13 + vz * 11 + ph);
        p.setXYZ(i, vx * n, vy * n * 0.85, vz * n); }
      g.computeVertexNormals(); const a = k * 2.4, rr = k === 0 ? 0 : (0.7 + r() * 0.8) * s, sc = (k === 0 ? 1.3 : 0.6 + r() * 0.45) * s;
      g.scale(sc, sc, sc); piece("leaf", g, [x + lean + Math.cos(a) * rr, (k === 0 ? 4.5 : 3.6 + r() * 1.6) * s, z + Math.sin(a) * rr * 0.9], 0, { tile: 0.6, color: ["#6aaa3a", "#7aba44", "#5a9a36", "#8ac04c"][k % 4], jitter: 0.18 }); }
    piece("soil", roundedBox(1.1, 0.04, 1.1, 0.01), [x, 0.135, z]);
    for (let k = -4; k <= 4; k++) piece("metal", roundedBox(0.05, 0.02, 1.15, 0.005), [x + k * 0.13, 0.158, z], 0, { color: "#2a2a2a" });
    for (const s2 of [-1, 1]) piece("metal", roundedBox(1.2, 0.025, 0.06, 0.005), [x, 0.158, z + s2 * 0.58], 0, { color: "#2a2a2a" });
  };
  for (const x of [-21, -12.0, 37.5, 45.0, -42, 66]) tree(x, -1, 0.9 + r() * 0.25);
  for (const x of [-21.5, -11.5, 12.0, 29.0, 35.0, 43.0, -44, 64, -31.5]) tree(x, 1, 0.9 + r() * 0.25);
  // hydrant, newspaper boxes, trash cans, parking meters, mailbox, payphone, bus stop sign
  const hydrant = (x, zs) => { const z = zs * 5.7;
    piece("paint", lathe([[0, 0], [0.16, 0], [0.16, 0.08], [0.12, 0.12], [0.12, 0.62], [0.14, 0.66], [0.14, 0.7], [0.1, 0.78], [0.04, 0.86], [0, 0.88]], 20), [x, 0.15, z], 0, { uv: "keep", color: "#d8b020" });
    for (const a of [0, Math.PI, Math.PI / 2]) piece("paint", new THREE.CylinderGeometry(0.055, 0.055, 0.16, 12).rotateZ(Math.PI / 2).rotateY(a), [x + Math.cos(a) * 0.15, 0.62, z + Math.sin(a) * 0.15], 0, { color: "#c8c0b0" }); };
  hydrant(3.6, -1); hydrant(-14, 1); hydrant(32, -1);
  const newsBox = (x, zs, col, label) => { const z = zs * 5.75;
    piece("paint", roundedBox(0.5, 0.75, 0.45, 0.03), [x, 0.15 + 0.32 + 0.375, z], 0, { color: col });
    for (const dx of [-0.2, 0.2]) piece("metal", roundedBox(0.04, 0.33, 0.04, 0.01), [x + dx, 0.15 + 0.165, z], 0, { color: "#3a3a3a" });
    const tex = signTex(label, { bg: col, ink: "#ffffff", w: 300, h: 90, border: null });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(0.44, 0.13), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.5 })); m.position.set(x, 1.12, z - zs * 0.229); m.rotation.y = zs > 0 ? Math.PI : 0; extra.push(m);
    const gm = new THREE.Mesh(new THREE.PlaneGeometry(0.38, 0.3), M.glass); gm.position.set(x, 0.86, z - zs * 0.228); gm.rotation.y = zs > 0 ? Math.PI : 0; extra.push(gm); };
  newsBox(-2.8, 1, "#2a5aa8", "DAILY NEWS"); newsBox(-2.2, 1, "#c83020", "POST-GAZETTE"); newsBox(20.6, -1, "#2a5aa8", "DAILY NEWS");
  const trash = (x, zs) => { const z = zs * 5.75; piece("paint", lathe([[0, 0], [0.26, 0], [0.28, 0.9], [0.3, 0.92], [0.3, 0.96], [0, 0.96]], 20), [x, 0.15, z], 0, { uv: "keep", color: "#2e5a3e" });
    for (let k = 0; k < 6; k++) piece("metal", roundedBox(0.03, 0.88, 0.02, 0.005), [x + Math.cos(k) * 0.28, 0.6, z + Math.sin(k) * 0.28], [0, -k, 0], { color: "#1e3a28" }); };
  trash(-6.2, -1); trash(13.2, 1); trash(35.8, -1); trash(-24, 1);
  const meter = (x, zs) => { const z = zs * 5.45; piece("metal", new THREE.CylinderGeometry(0.03, 0.035, 1.15, 8), [x, 0.15 + 0.575, z], 0, { color: "#5a5e60" });
    piece("metal", roundedBox(0.16, 0.26, 0.12, 0.04), [x, 1.42, z], 0, { color: "#7a7e80" });
    piece("glass", new THREE.SphereGeometry(0.07, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2), [x, 1.52, z], 0, { color: "#ffffff" }); };
  for (let x = -24; x < 46; x += 6.5) { if (Math.abs(x - 3.6) < 1.5 || Math.abs(x - 28) < 3 || Math.abs(x + 2.8) < 1.5) continue; meter(x + 0.3, -1); if (Math.abs(x - 2) > 2.5 && Math.abs(x - 19) > 2.5) meter(x + 1.8, 1); }
  { piece("paint", roundedBox(0.5, 0.95, 0.45, 0.12), [34.6, 0.15 + 0.35 + 0.48, -7.9], 0, { color: "#2a4a8a" }); piece("paint", roundedBox(0.52, 0.06, 0.47, 0.02), [34.6, 1.48, -7.9], 0, { color: "#2a4a8a" });
    for (const dx of [-0.18, 0.18]) piece("metal", roundedBox(0.05, 0.36, 0.05, 0.01), [34.6 + dx, 0.33, -7.9], 0, { color: "#2a2a2a" }); }
  { piece("metal", roundedBox(0.1, 2.2, 0.1, 0.01), [36.4, 1.25, -6.0], 0, { color: "#8a8e90" }); piece("metal", roundedBox(0.7, 0.9, 0.35, 0.03), [36.4, 1.6, -5.9], 0, { color: "#b8bcc0" });
    piece("paint", roundedBox(0.3, 0.5, 0.06, 0.02), [36.4, 1.6, -5.72], 0, { color: "#2a2a2a" }); piece("paint", roundedBox(0.8, 0.12, 0.4, 0.02), [36.4, 2.15, -5.9], 0, { color: "#2a5aa8" }); }
  { piece("metal", new THREE.CylinderGeometry(0.03, 0.03, 2.8, 8), [-24.5, 1.55, 5.6], 0, { color: "#7a7e80" });
    const tex = signTex("BUS STOP", { bg: "#f4f4f0", ink: "#1e4a8a", w: 400, h: 400, border: "#1e4a8a", sub: "54C  -  86B" });
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.45, 0.02), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.5 })); m.position.set(-24.5, 2.7, 5.6); m.castShadow = true; extra.push(m); }

  // ---------------------------------------------------------------- parked 1995 sedans
  const car = (x, zs, color, flip = false) => {
    const parts = { carPaint: [], carGlass: [], rubber: [], metal: [], head: [], tail: [] };
    const push = (k, g, c = 0xffffff) => { tint(g, C(c)); if (!g.attributes.uv) boxUV(g, 1); parts[k].push(g); };
    const s = new THREE.Shape(); s.moveTo(-2.3, 0.3); s.lineTo(-1.85, 0.3); s.absarc(-1.42, 0.3, 0.42, Math.PI, 0, true); s.lineTo(0.98, 0.3); s.absarc(1.4, 0.3, 0.42, Math.PI, 0, true);
    s.lineTo(2.3, 0.3); s.quadraticCurveTo(2.45, 0.34, 2.43, 0.58); s.quadraticCurveTo(2.4, 0.8, 2.1, 0.84); s.lineTo(-2.05, 0.9); s.quadraticCurveTo(-2.38, 0.88, -2.42, 0.62); s.quadraticCurveTo(-2.42, 0.34, -2.3, 0.3);
    const body = new THREE.ExtrudeGeometry(s, { depth: 1.56, bevelEnabled: true, bevelSize: 0.1, bevelThickness: 0.1, bevelSegments: 4, curveSegments: 14 }); body.translate(0, 0, -0.78); body.computeVertexNormals(); push("carPaint", body, color);
    const c2 = new THREE.Shape(); c2.moveTo(-1.55, 0.86); c2.lineTo(1.05, 0.86); c2.quadraticCurveTo(0.55, 1.32, 0.25, 1.36); c2.lineTo(-0.85, 1.38); c2.quadraticCurveTo(-1.2, 1.34, -1.55, 0.92);
    const cab = new THREE.ExtrudeGeometry(c2, { depth: 1.3, bevelEnabled: true, bevelSize: 0.06, bevelThickness: 0.06, bevelSegments: 3, curveSegments: 10 }); cab.translate(0, 0, -0.65); cab.computeVertexNormals(); push("carGlass", cab);
    push("carPaint", place(roundedBox(1.15, 0.05, 1.42, 0.03), [-0.3, 1.41, 0]), color);
    push("carPaint", place(roundedBox(0.1, 0.5, 1.44, 0.02), [-0.32, 1.13, 0]), color);
    for (const zz of [-0.73, 0.73]) push("carPaint", place(roundedBox(2.4, 0.06, 0.05, 0.02), [-0.25, 0.92, zz]), color);
    for (const [wx, wz] of [[-1.42, -0.8], [-1.42, 0.8], [1.4, -0.8], [1.4, 0.8]]) {
      push("rubber", place(new THREE.TorusGeometry(0.24, 0.1, 10, 24), [wx, 0.34, wz]));
      push("metal", place(new THREE.CylinderGeometry(0.2, 0.2, 0.04, 20).rotateX(Math.PI / 2), [wx, 0.34, wz + Math.sign(wz) * 0.08]), "#c8ccd0"); }
    for (const sx of [-1, 1]) { push("metal", place(roundedBox(0.16, 0.18, 1.86, 0.06), [sx * 2.5, 0.42, 0]), "#5a5a5a");
      for (const zz of [-0.6, 0.6]) push(sx > 0 ? "head" : "tail", place(roundedBox(0.06, 0.13, 0.4, 0.02), [sx * 2.5, 0.65, zz]));
      for (const zz of [-1, 1]) push("carPaint", place(roundedBox(0.12, 0.08, 0.14, 0.02), [0.85, 1.0, zz * 0.92]), color); }
    push("metal", place(roundedBox(0.04, 0.12, 0.9, 0.01), [2.52, 0.62, 0]), "#2a2a2a");
    const M4 = new THREE.Matrix4().makeRotationY(flip ? Math.PI : 0).setPosition(x, 0, zs * 3.95);
    for (const [k, list] of Object.entries(parts)) for (const g of list) { g.applyMatrix4(M4); B[k].push(g); }
  };
  car(-20, -1, "#2e6a6a"); car(-13.2, -1, "#7a1e24", true); car(9.8, -1, "#e8e2d4"); car(40.5, -1, "#2a3a6a");
  car(-17, 1, "#c8b890", true); car(11.0, 1, "#4a5a6a", true); car(30.5, 1, "#8a2a24", true); car(-29.5 - 9, 1, "#3a5a3a", true); car(66, -1, "#b8b0a0");

  // ---------------------------------------------------------------- distance: terrain with trees + hillside houses, skyline, far blocks
  const hazeMat = addHaze(plain("#ffffff", { roughness: 0.95, relief: 0.6, vertexColors: true }));
  const hazeMatI = addHaze(plain("#ffffff", { roughness: 0.95, relief: 0.6 }));
  const farMat = addHaze(new THREE.MeshStandardMaterial({ color: C("#ffffff"), roughness: 0.8 }), { windows: true });
  {
    const S = 2000, N = 180, g = new THREE.PlaneGeometry(S, S, N, N); g.rotateX(-Math.PI / 2); g.translate(20, 0, 0);
    const p = g.attributes.position, cols = new Float32Array(p.count * 3), cA = C("#4a7a34"), cB = C("#7a9a4a"), cR = C("#8a7a64"), tmp = new THREE.Color();
    const hAt = (x, z) => { const dx = x > 20 ? Math.max(0, x - 800) : Math.max(0, -130 - x), dz = Math.max(0, Math.abs(z) - 95); const d = Math.hypot(dx, dz);
      const base = THREE.MathUtils.smoothstep(d, 0, 140) * (55 + 30 * Math.sin(x * 0.006 + 1) + 20 * Math.sin(z * 0.009));
      return d > 0 ? base + 6 * Math.sin(x * 0.03) * Math.sin(z * 0.027) * THREE.MathUtils.smoothstep(d, 0, 60) - 0.05 : -0.05; };
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), y = hAt(x, z); p.setY(i, y);
      tmp.copy(cA).lerp(cB, 0.5 + 0.5 * Math.sin(x * 0.05 + z * 0.04)).lerp(cR, y > 70 ? 0.4 : 0.05); cols.set([tmp.r, tmp.g, tmp.b], i * 3); }
    g.setAttribute("color", new THREE.BufferAttribute(cols, 3)); g.computeVertexNormals();
    const terr = new THREE.Mesh(g, hazeMat); terr.receiveShadow = true; terr.name = "cityTerrain"; group.add(terr);
    // trees (instanced blobs) + hillside houses (instanced) on the slopes
    const tg = new THREE.IcosahedronGeometry(1, 1), tm = new THREE.InstancedMesh(tg, hazeMatI, 2600), hg = new THREE.BoxGeometry(1, 1, 1), hm = new THREE.InstancedMesh(hg, farMat, 700);
    const rg = new THREE.ConeGeometry(0.78, 0.55, 4); rg.rotateY(Math.PI / 4); const rm = new THREE.InstancedMesh(rg, hazeMatI, 700);
    const mx = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = V(1, 1, 1); let nt = 0, nh = 0;
    for (let i = 0; i < 9000 && (nt < 2600 || nh < 700); i++) {
      const x = 20 + (r() - 0.5) * 1500, z = (r() - 0.5) * 1500, y = hAt(x, z); if (y < 3) continue;
      if (r() < 0.75 && nt < 2600) { const s = 3 + r() * 4; mx.compose(V(x, y + s * 0.6, z), q, sc.set(s, s * 1.15, s)); tm.setMatrixAt(nt, mx); tm.setColorAt(nt, tmp.set(["#3a6a2a", "#4a7a30", "#5a8a3a", "#6a8a3e"][nt % 4])); nt++; }
      else if (nh < 700 && y < 90) { const w = 6 + r() * 4, hh = 5 + r() * 4, d = 7 + r() * 3; const yaw = Math.round(r() * 2) * Math.PI / 2;
        q.setFromAxisAngle(V(0, 1, 0), yaw); mx.compose(V(x, y + hh / 2 - 0.5, z), q, sc.set(w, hh, d)); hm.setMatrixAt(nh, mx);
        hm.setColorAt(nh, tmp.set(["#d8b8a0", "#c8d0d8", "#e8dcc0", "#b87a60", "#f0e8d8"][nh % 5]));
        mx.compose(V(x, y + hh - 0.5 + 0.28 * w * 0.6, z), q, sc.set(w * 1.05 * 0.92, w * 0.6, d * 1.05 * 0.92)); rm.setMatrixAt(nh, mx); rm.setColorAt(nh, tmp.set(["#5a3a2a", "#3a3a40", "#6a4a3a"][nh % 3])); nh++; }
      q.identity(); }
    tm.count = nt; hm.count = nh; rm.count = nh; for (const m of [tm, hm, rm]) { m.castShadow = false; m.receiveShadow = true; group.add(m); }
    // skyline: downtown towers beyond the east end + mid-rise blocks behind both rows
    const towers = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), farMat, 140); let nk = 0;
    const tower = (x, z, w, h, d, c) => { mx.compose(V(x, h / 2 - 0.1, z), q.identity(), sc.set(w, h, d)); towers.setMatrixAt(nk, mx); towers.setColorAt(nk, tmp.set(c)); nk++; };
    const T2 = [[620, -60, 26, 70], [660, 10, 30, 105], [640, 70, 22, 60], [700, -25, 28, 125], [690, 45, 24, 85], [740, 0, 34, 95], [610, 120, 20, 45], [720, -95, 26, 70], [770, 40, 30, 80], [600, -10, 22, 40], [650, -110, 24, 55]];
    for (const [x, z, w, h] of T2) tower(x, z, w, h, w * 0.9, ["#a8b4c0", "#c8bca8", "#8a96a4", "#d0c8b8"][nk % 4]);
    for (let i = 0; i < 64; i++) { const zs = i % 2 ? 1 : -1, x = -120 + (i >> 1) * 8.5 + r() * 3, z = zs * (48 + r() * 45), h = 12 + r() * 20;
      tower(x, z, 7 + r() * 5, h, 8 + r() * 5, ["#c89a84", "#b88a74", "#d8c0a8", "#a87a64", "#c8b8a0"][i % 5]); }
    for (let i = 0; i < 20; i++) { const xs = i % 2 ? 1 : -1, x = xs > 0 ? 100 + r() * 60 : -80 - r() * 50, z = (r() - 0.5) * 40;      // continuing street rows
      if (Math.abs(z) < 12) continue; tower(x, z, 10 + r() * 6, 10 + r() * 10, 12, ["#c89a84", "#b88a74", "#d8c0a8"][i % 3]); }
    towers.count = nk; towers.castShadow = true; towers.receiveShadow = true; group.add(towers);
    const spires = new THREE.InstancedMesh(new THREE.ConeGeometry(0.72, 1, 4).rotateY(Math.PI / 4), farMat, 4); let ns = 0;
    for (const [x, z, w, h] of [T2[1], T2[3], T2[5]]) { mx.compose(V(x, h + w * 0.35, z), q.identity(), sc.set(w, w * 0.7, w * 0.9)); spires.setMatrixAt(ns, mx); spires.setColorAt(ns, tmp.set("#9aa6b2")); ns++; }
    spires.count = ns; group.add(spires);
  }

  // ---------------------------------------------------------------- merge buckets
  const meshes = {};
  const noShadow = new Set(["asphalt", "line", "puddle", "glass", "flyGlass", "winLit", "winDark", "shopLit", "room", "grime", "slab", "lamp", "blue", "head", "tail"]);
  for (const [k, list] of Object.entries(B)) {
    if (!list.length) continue;
    const m = new THREE.Mesh(mergeGeometries(list.map((g) => clean(g))), M[k]); m.name = `city_${k}`;
    m.castShadow = !noShadow.has(k); m.receiveShadow = k !== "grime"; if (k === "glass" || k === "grime") m.renderOrder = 2;
    meshes[k] = m; group.add(m);
  }
  for (const m of extra) group.add(m);
  // fly-through glass (separate meshes so the integrator can hide them)
  const flyMesh = (list, name) => { const m = new THREE.Mesh(mergeGeometries(list.map((g) => clean(g))), M.flyGlass); m.name = name; m.renderOrder = 2; group.add(m); return m; };
  const policeGlassG = []; { const F = police.F; for (const x of [-4.4, -2.5, 2.5, 4.4]) { const g = new THREE.PlaneGeometry(1.15, 2.0); g.translate(x, 1.35 + 1.0, -0.15); policeGlassG.push(g.applyMatrix4(F)); } }
  const parts = { policeGlass: flyMesh(policeGlassG, "policeGlass"), bankGlass: flyMesh([...bank1.glass, ...bank2.glass], "bankGlass"), terrain: group.getObjectByName("cityTerrain") };

  // ---------------------------------------------------------------- light pools (night), sky, lights
  const poolTex = radialTex();
  const poolMat = new THREE.MeshBasicMaterial({ map: poolTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, color: C("#ff9a40"), opacity: 0.0, polygonOffset: true, polygonOffsetFactor: -4 });
  const blueMat = poolMat.clone(); blueMat.color = C("#3a6aff");
  const pools = new THREE.Group(); pools.name = "lightPools";
  for (const p of lampHeads) { const m = new THREE.Mesh(new THREE.PlaneGeometry(11, 11), poolMat); m.rotation.x = -Math.PI / 2; m.position.set(p.x, 0.16, p.z); m.renderOrder = 3; pools.add(m); }
  group.add(pools);

  const sky = createExteriorSky(1500); sky.name = "sky"; group.add(sky);
  const key = new THREE.DirectionalLight(0xffffff, 1); key.name = "cityKey"; key.castShadow = true;
  key.shadow.mapSize.set(O.shadowMap, O.shadowMap); Object.assign(key.shadow.camera, { left: -O.shadowHalf, right: O.shadowHalf, top: O.shadowHalf, bottom: -O.shadowHalf, near: 1, far: 400 });
  key.shadow.camera.updateProjectionMatrix(); key.shadow.bias = -0.0003; key.shadow.normalBias = 0.03; key.target.position.set(4, 0, 0); group.add(key, key.target);
  const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 1); group.add(hemi);
  const lampLightAt = [lampHeads[2], lampHeads[3], lampHeads[8], lampHeads[9], lampHeads[1], lampHeads[7]];   // apartment, police, bank 1, bank 2, west, ...
  const lamps = lampLightAt.map((p) => { const l = new THREE.PointLight(0xffa850, 0, 24, 1.6); l.position.copy(p).add(V(0, -0.3, 0)); group.add(l); return l; });
  const keyDir = new THREE.Vector3(), keyLightPos = new THREE.Vector3();

  // ---------------------------------------------------------------- anchors
  const anchors = {
    apartmentWindowOutside: V(0, 5.0, -7.4), apartmentWindowInside: V(0, 4.9, -9.6), apartmentWindowSill: V(0, 4.0, -8.5),
    apartmentWindowOpening: { x0: -0.75, x1: 0.75, y0: 4.0, y1: 4.98, zFront: -8.5, zBack: -9.0 },
    apartmentDoor: V(-2.8, 0.62, -8.5), apartmentSidewalk: V(-1.5, SIDEWALK_Y, -6.6),
    bank1Door: V(2, SIDEWALK_Y, 8.5), bank1Sidewalk: V(2, SIDEWALK_Y, 6.6), bank1Inside: V(2, SIDEWALK_Y, 10.2),
    bank2Door: V(19, SIDEWALK_Y, 8.5), bank2Sidewalk: V(19, SIDEWALK_Y, 6.6), bank2Inside: V(19, SIDEWALK_Y, 10.0),
    policeDoor: V(28, POLICE_DOOR_Y, -8.5), policeSidewalk: V(28, SIDEWALK_Y, -6.2), policeInside: V(28, POLICE_DOOR_Y, -10.0),
    policeWindows: [-4.4, -2.5, 2.5, 4.4].map((x) => V(28 + x, 2.35, -8.5)),
    keyLightPos, lampHeads,
    views: {
      streetWide: { pos: V(-13, 3.6, 3.6), target: V(6, 5.2, -6.5), fov: 60 },
      bank1Approach: { pos: V(0.8, 1.65, -2.2), target: V(2, 3.6, 8.5), fov: 54 },
      bank2Approach: { pos: V(17.2, 1.65, -1.6), target: V(19, 3.0, 8.5), fov: 54 },
      apartmentFromStreet: { pos: V(2.2, 1.6, 4.2), target: V(0, 5.6, -8.5), fov: 52 },
      policeFromApartment: { pos: V(1.0, 5.6, -5.2), target: V(28, 1.8, -8.2), fov: 46 },
      facadeDetail: { pos: V(-3.8, 4.6, -5.6), target: V(0.6, 5.0, -8.5), fov: 50 },
      policeNight: { pos: V(24.6, 1.7, -0.8), target: V(28, 3.2, -8.5), fov: 52 },
    },
  };

  // ---------------------------------------------------------------- time + controls
  let current = null;
  const setTime = (name) => {
    const T = CITY_TIMES[name] || CITY_TIMES.day; if (current === name) return; current = name;
    sky.userData.setPreset(T.sky);
    keyDir.set(...T.dir).normalize(); key.color.set(T.key); key.intensity = T.keyI;
    hemi.color.set(T.hemiSky); hemi.groundColor.set(T.hemiGround); hemi.intensity = T.hemiI;
    M.winLit.emissiveIntensity = T.win; M.shopLit.emissiveIntensity = T.shop; M.lamp.emissiveIntensity = T.lamp; M.blue.emissiveIntensity = T.blue;
    M.head.emissiveIntensity = 0; M.tail.emissiveIntensity = 0;
    for (const [m, k] of signMats) m.emissiveIntensity = k * T.sign;
    lamps.forEach((l) => { l.intensity = T.pt; }); poolMat.opacity = 0.55 * T.pool; blueMat.opacity = 0.7 * T.pool; pools.visible = T.pool > 0;
    M.glass.envMapIntensity = M.flyGlass.envMapIntensity = T.night ? 0.8 : 2.2;
    HAZE.col.value.setRGB(...T.haze); HAZE.k.value = T.hazeK; HAZE.night.value = T.night;
    placeKey(key.target.position);
  };
  const placeKey = (c) => { key.target.position.copy(c); key.position.copy(keyDir).multiplyScalar(160).add(c); key.target.updateMatrixWorld(); keyLightPos.copy(keyDir).multiplyScalar(160).add(c); };
  // texel-snapped shadow centre that follows the camera's look point
  const _f = new THREE.Vector3(), _c = new THREE.Vector3(), _bx = new THREE.Vector3(), _by = new THREE.Vector3(), _up = new THREE.Vector3(0, 1, 0);
  const followShadow = (camera) => {
    camera.getWorldDirection(_f); _c.copy(camera.position).addScaledVector(_f, O.shadowHalf * 0.55); _c.y = 0;
    _bx.crossVectors(_up, keyDir).normalize(); _by.crossVectors(keyDir, _bx).normalize();
    const texel = (2 * O.shadowHalf) / O.shadowMap, u = Math.round(_c.dot(_bx) / texel) * texel, v = Math.round(_c.dot(_by) / texel) * texel, d = _c.dot(keyDir);
    _c.copy(_bx).multiplyScalar(u).addScaledVector(_by, v).addScaledVector(keyDir, d);
    placeKey(_c);
  };
  const controls = {
    hisWindow: (k) => { apt.lower.position.y = 4.0 + 0.96 * THREE.MathUtils.clamp(k, 0, 1) - 0.06 * 0; },
    bank1Doors: (k) => doorSwing(bank1.doors, k), bank2Doors: (k) => doorSwing(bank2.doors, k), policeDoors: (k) => doorSwing(police.doors, k),
  };
  function doorSwing(list, k) { for (const leaf of list) leaf.rotation.y = leaf.userData.sx * THREE.MathUtils.degToRad(85) * THREE.MathUtils.clamp(k, 0, 1); }
  controls.hisWindow(1); controls.bank1Doors(1); controls.bank2Doors(1); controls.policeDoors(1);
  setTime(O.time);

  const update = (t = 0, camera = null) => { sky.userData.update(t); if (camera && O.shadowFollow) followShadow(camera); };
  group.updateMatrixWorld(true);
  const hint = Object.fromEntries(Object.entries(CITY_TIMES).map(([k, v]) => [k, v.hint]));
  return { group, anchors, update, setTime, lights: { key, hemi, lamps }, controls, parts, keyLightPos, keyDir, hint, meshes, get time() { return current; } };
}
