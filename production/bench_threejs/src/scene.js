// Benchmark frame: the v12 lamp room rebuilt 100% in code (three.js), real-time light, rendered by Remotion.
// Rules followed: STYLE_BIBLE v12 LOCKED + 2026-11-16 additions (characters are ONE rigid piece; no limb through the body).
import * as THREE from "three";
import { staticFile } from "remotion";
import {
  EffectComposer, RenderPass, EffectPass, BloomEffect, ToneMappingEffect, ToneMappingMode,
  VignetteEffect, HueSaturationEffect, BrightnessContrastEffect,
} from "postprocessing";

const INK = new THREE.Color(0.11, 0.075, 0.06);          // C3 warm dark brown ink (linear-ish, set below)
const INK_CSS = "#2a1f19";
const R = 0.29;                                          // head radius
const TOTAL = 1871;

// ---------- small helpers ----------
const rng = (seed) => () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
const canvasTex = (w, h, draw, srgb = true) => {
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  draw(c.getContext("2d"), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace; t.anisotropy = 8;
  return t;
};
const std = (o) => new THREE.MeshStandardMaterial({ roughness: 0.8, metalness: 0, ...o });
const mesh = (g, m, opts = {}) => { const x = new THREE.Mesh(g, m); x.castShadow = !!opts.cast; x.receiveShadow = opts.recv ?? true; return x; };

// inverted hull: camera-only ink line (R4: never casts shadows)
const hullMat = (t) => new THREE.ShaderMaterial({
  side: THREE.BackSide, uniforms: { t: { value: t }, c: { value: INK } },
  vertexShader: `uniform float t; void main(){ vec3 p = position + normal*t; gl_Position = projectionMatrix*modelViewMatrix*vec4(p,1.0); }`,
  fragmentShader: `uniform vec3 c; void main(){ gl_FragColor = vec4(c,1.0); }`,
});
const withHull = (m, t) => { const h = new THREE.Mesh(m.geometry, hullMat(t)); h.castShadow = false; h.receiveShadow = false; m.add(h); return m; };

// ---------- textures from Poly Haven ----------
async function pbr(name, rep) {
  const L = new THREE.TextureLoader();
  const [map, normalMap, roughnessMap] = await Promise.all(
    ["diff", "nor_gl", "rough"].map((k) => L.loadAsync(staticFile(`tex/${name}_${k}_2k.jpg`))));
  map.colorSpace = THREE.SRGBColorSpace;
  for (const t of [map, normalMap, roughnessMap]) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...rep); t.anisotropy = 8; }
  return { map, normalMap, roughnessMap, normalScale: new THREE.Vector2(2.2, 2.2) };   // W1 relief (bump x2.2)
}

// ---------- faces (flat 2D drawings, projected from the camera: C1b/C1c) ----------
function drawFace(kind) {
  return canvasTex(512, 512, (g) => {
    g.clearRect(0, 0, 512, 512);
    g.strokeStyle = INK_CSS; g.fillStyle = INK_CSS; g.lineCap = "round"; g.lineJoin = "round";
    const brow = (x, y, w, tilt) => { g.lineWidth = 16; g.beginPath(); g.moveTo(x - w, y + tilt); g.quadraticCurveTo(x, y - 9, x + w, y - tilt); g.stroke(); };
    if (kind === "keeper") {
      brow(205, 196, 34, 5); brow(310, 196, 34, -5);
      // half-lidded smug eyes, pupils toward the engineer (screen right)
      for (const x of [205, 310]) {
        g.lineWidth = 12; g.beginPath(); g.moveTo(x - 28, 228); g.lineTo(x + 28, 228); g.stroke();
        g.beginPath(); g.arc(x + 10, 238, 12, 0, Math.PI * 2); g.fill();
      }
      // beard: smooth wavy cloud (fixes the zig-zag note), white with ink outline
      g.beginPath();
      const cx = 258, cy = 312;
      for (let i = 0; i <= 64; i++) {
        const a = (i / 64) * Math.PI * 2, wob = 1 + 0.07 * Math.sin(a * 7);
        const x = cx + Math.cos(a) * 96 * wob, y = cy + Math.sin(a) * 52 * wob;
        i ? g.lineTo(x, y) : g.moveTo(x, y);
      }
      g.closePath(); g.fillStyle = "#f6f4ef"; g.fill(); g.lineWidth = 11; g.stroke();
      // moustache + smirk
      g.fillStyle = "#e9e6df"; g.beginPath(); g.ellipse(232, 286, 34, 16, 0.15, 0, Math.PI * 2); g.ellipse(284, 286, 34, 16, -0.15, 0, Math.PI * 2); g.fill();
      g.lineWidth = 10; g.stroke();
      g.lineWidth = 11; g.beginPath(); g.moveTo(236, 318); g.quadraticCurveTo(262, 326, 290, 312); g.stroke();
    } else {
      brow(200, 186, 32, -3); brow(312, 182, 32, -6);
      // round glasses + pupils looking at the keeper (screen left)
      g.lineWidth = 11;
      for (const x of [203, 309]) { g.beginPath(); g.arc(x, 236, 34, 0, Math.PI * 2); g.stroke(); g.beginPath(); g.arc(x - 12, 238, 14, 0, Math.PI * 2); g.fill(); }
      g.beginPath(); g.moveTo(237, 232); g.quadraticCurveTo(256, 222, 275, 232); g.stroke();
      // open smile: inside BLACK (2026-11-15), ink outline
      g.beginPath(); g.moveTo(222, 300); g.quadraticCurveTo(258, 352, 296, 298); g.closePath();
      g.fillStyle = "#0b0807"; g.fill(); g.lineWidth = 11; g.stroke();
    }
  }, false);
}

function faceMaterial(faceTex, lightSide, drop) {
  return new THREE.ShaderMaterial({
    uniforms: {
      hc: { value: new THREE.Vector3() }, cr: { value: new THREE.Vector3() }, cu: { value: new THREE.Vector3() },
      cb: { value: new THREE.Vector3() }, R: { value: R }, drop: { value: drop }, ls: { value: lightSide },
      face: { value: faceTex }, k: { value: 0.62 },
    },
    vertexShader: `varying vec3 wp; void main(){ vec4 w = modelMatrix*vec4(position,1.0); wp = w.xyz; gl_Position = projectionMatrix*viewMatrix*w; }`,
    fragmentShader: `uniform vec3 hc,cr,cu,cb; uniform float R,drop,ls,k; uniform sampler2D face; varying vec3 wp;
      vec3 lin(vec3 c){ return pow(c, vec3(2.2)); }
      void main(){
        vec3 d = wp - hc; float x = dot(d,cr), y = dot(d,cu), z = dot(d,cb); float FS = 2.15*R;
        vec2 uv = vec2(x/FS + 0.5, y/FS + 0.5 + drop/FS);
        vec4 f = (uv.x<0.||uv.x>1.||uv.y<0.||uv.y>1.) ? vec4(0.) : texture2D(face, uv);
        f.a *= smoothstep(0.05*R, 0.25*R, z);
        vec3 c = vec3(0.97,0.965,0.95);
        float sh = smoothstep(-0.25, 1.0, -ls*x/R) * 0.55;  c = mix(c, vec3(0.48,0.48,0.60), sh);
        float gl = smoothstep(-0.5, 1.0, ls*x/R) * 0.85 * 0.40; c = mix(c, vec3(1.0,0.68,0.30), gl);
        c = mix(c, f.rgb, f.a);
        gl_FragColor = vec4(lin(c)*k, 1.0);
      }`,
  });
}

// ---------- hand-drawn head outline ring (C4e / C4c) ----------
function wobblyRing(seed, cutY, taper = 0.1) {
  const r = rng(seed), l1 = [2, 3, 5][Math.floor(r() * 3)], l2 = [3, 5, 8][Math.floor(r() * 3)], p1 = r() * 6.28, p2 = r() * 6.28, p3 = r() * 6.28;
  const N = 256, pos = [], idx = [];
  let made = 0;
  for (let i = 0; i <= N; i++) {
    const a = (i / N) * Math.PI * 2 - Math.PI / 2;           // start at the bottom (chin)
    const sy = Math.sin(a);
    let fade = 1;
    if (cutY != null) { if (sy > cutY) fade = 0; else fade = THREE.MathUtils.smoothstep(cutY - sy, 0, taper); }
    const bite = 0.01 + 0.12 * (0.5 + 0.25 * Math.sin(l1 * a + p1) + 0.25 * Math.sin(l2 * a + p2));
    const pen = 0.022 * (0.5 + 0.7 * (0.5 + 0.5 * Math.sin(3 * a + p3))) * fade;
    const inner = R * (1 - bite * fade) + (1 - fade) * R * 0.04, outer = Math.max(R * 1.03 * fade + inner * (1 - fade), inner + pen);
    pos.push(Math.cos(a) * inner, sy * inner, 0, Math.cos(a) * outer, sy * outer, 0);
    if (i > 0) { const b = (i - 1) * 2; idx.push(b, b + 1, b + 2, b + 1, b + 3, b + 2); }
    made++;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx);
  const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: INK, side: THREE.DoubleSide }));
  m.castShadow = false; m.receiveShadow = false;
  return m;
}

// ---------- fabric ----------
function fabric(kind) {
  return canvasTex(512, 512, (g, w, h) => {
    if (kind === "knit") {
      g.fillStyle = "#e3b324"; g.fillRect(0, 0, w, h);
      for (let x = 0; x < w; x += 16) { g.fillStyle = "rgba(120,80,0,0.28)"; g.fillRect(x, 0, 5, h); g.fillStyle = "rgba(255,240,170,0.18)"; g.fillRect(x + 8, 0, 4, h); }
    } else if (kind === "check") {
      g.fillStyle = "#8a4f26"; g.fillRect(0, 0, w, h);
      for (let x = 0; x < w; x += 64) for (let y = 0; y < h; y += 64) if (((x + y) / 64) % 2 === 0) { g.fillStyle = "#5e3216"; g.fillRect(x, y, 64, 64); }
      g.strokeStyle = "rgba(230,170,110,0.35)"; g.lineWidth = 3;
      for (let x = 0; x < w; x += 32) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); g.beginPath(); g.moveTo(0, x); g.lineTo(w, x); g.stroke(); }
    } else if (kind === "beanie") {
      g.fillStyle = "#c7372b"; g.fillRect(0, 0, w, h);
      for (let x = 0; x < w; x += 12) { g.fillStyle = "rgba(80,0,0,0.35)"; g.fillRect(x, 0, 4, h); }
    } else if (kind === "shirt") {
      g.fillStyle = "#9db0c8"; g.fillRect(0, 0, w, h);
      for (let y = 0; y < h; y += 10) { g.fillStyle = "rgba(255,255,255,0.25)"; g.fillRect(0, y, w, 3); }
    }
    const r = rng(kind.length * 99);                      // weave noise
    for (let i = 0; i < 6000; i++) { g.fillStyle = `rgba(0,0,0,${r() * 0.08})`; g.fillRect(r() * w, r() * h, 2, 2); }
  });
}

// ---------- character: ONE rigid group ----------
function tube(points, mat, r = 0.015) {
  const c = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)), false, "centripetal");
  const m = mesh(new THREE.TubeGeometry(c, 48, r, 8, false), mat, { cast: true });
  const cap = (p) => { const s = mesh(new THREE.SphereGeometry(r, 10, 8), mat, { cast: true }); s.position.set(...p); m.add(s); };
  cap(points[0]); cap(points[points.length - 1]);
  return m;
}

function character(o) {
  const g = new THREE.Group();
  const legLen = 0.62, torsoH = 0.31, tcy = legLen + torsoH, top = tcy + torsoH;
  const ink = std({ color: INK, roughness: 0.55 });

  // torso: slim capsule, profile |t|^3.2, taper 0.06 (C4)
  const prof = [];
  for (let i = 0; i <= 40; i++) {
    const t = -1 + (2 * i) / 40, rr = Math.pow(Math.max(0, 1 - Math.pow(Math.abs(t), 3.2)), 1 / 3.2) * (1 - 0.06 * t);
    prof.push(new THREE.Vector2(Math.max(rr, 0.0001) * 0.21, t * torsoH));
  }
  const tg = new THREE.LatheGeometry(prof, 48); tg.scale(1, 1, 0.15 / 0.21); tg.rotateY(Math.PI / 2); tg.computeVertexNormals();
  const tex = fabric(o.coat); tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  const torso = withHull(mesh(tg, std({ map: tex, bumpMap: tex, bumpScale: 3, roughness: 0.9 }), { cast: true }), 0.012);
  torso.position.y = tcy; g.add(torso);

  // shirt panel / placket / buttons / pockets (C5)
  const fz = 0.15;
  if (o.shirt) { const sp = mesh(new THREE.PlaneGeometry(0.11, 0.42), std({ map: fabric("shirt"), roughness: 0.9 })); sp.position.set(0.0, tcy + 0.05, fz + 0.004); g.add(sp); }
  const plk = mesh(new THREE.BoxGeometry(0.035, 0.42, 0.012), std({ color: o.placket, roughness: 0.7 }), { cast: true });
  plk.position.set(o.shirt ? -0.07 : 0, tcy + 0.02, fz + 0.002); g.add(withHull(plk, 0.004));
  for (let i = 0; i < 3; i++) { const b = mesh(new THREE.SphereGeometry(0.014, 12, 8), std({ color: 0x3b2414, roughness: 0.4 })); b.position.set(o.shirt ? -0.07 : 0, tcy + 0.16 - i * 0.12, fz + 0.012); g.add(b); }
  for (const s of [-1, 1]) { const p = mesh(new THREE.BoxGeometry(0.09, 0.035, 0.012), std({ color: o.placket, roughness: 0.7 })); p.position.set(s * 0.1, tcy - 0.1, fz - 0.012); p.rotation.y = s * -0.35; g.add(withHull(p, 0.004)); }

  // head: sits on the torso, 10 cm toward the camera, 0.76 R above the torso top (C4b/C4d)
  const hc = new THREE.Vector3(0, top + 0.76 * R, 0.10);
  const fm = faceMaterial(drawFace(o.face), o.lightSide, o.hat ? 0.10 * R : 0);
  const head = withHull(mesh(new THREE.SphereGeometry(R, 64, 48), fm, { cast: true, recv: false }), 0.006);
  head.position.copy(hc); g.add(head);
  const ring = wobblyRing(o.seed, o.hat ? 0.36 : 0.44, o.hat ? 0.06 : 0.14); g.add(ring);

  if (o.hat === "beanie") {
    const bt = fabric("beanie");
    const dome = withHull(mesh(new THREE.SphereGeometry(R * 1.07, 48, 24, 0, Math.PI * 2, 0, Math.PI * 0.42), std({ map: bt, bumpMap: bt, bumpScale: 4, roughness: 0.95 }), { cast: true }), 0.008);
    dome.position.copy(hc).add(new THREE.Vector3(0, 0.02, 0)); g.add(dome);
    const cuff = withHull(mesh(new THREE.TorusGeometry(R * 1.0, 0.055, 16, 64), std({ map: bt, bumpMap: bt, bumpScale: 4, roughness: 0.95 }), { cast: true }), 0.008);
    cuff.rotation.x = Math.PI / 2; cuff.position.copy(hc).add(new THREE.Vector3(0, R * 0.42, 0)); g.add(cuff);
    const pom = withHull(mesh(new THREE.SphereGeometry(0.07, 20, 14), std({ color: 0xeeeae2, roughness: 1 }), { cast: true }), 0.006);
    pom.position.copy(hc).add(new THREE.Vector3(0, R * 1.12, 0)); g.add(pom);
  } else {
    const hair = withHull(mesh(new THREE.SphereGeometry(R * 1.035, 48, 24, 0, Math.PI * 2, 0, Math.PI * 0.36), std({ color: 0x5a3a22, roughness: 0.8 }), { cast: true }), 0.006);
    hair.position.copy(hc); hair.rotation.x = -0.25; g.add(hair);
  }

  // limbs: ink tubes r 1.5 cm, hand = finger hook, feet = forward "L" (C6/C7)
  const sy = top - 0.1;
  for (const arm of o.arms(sy)) g.add(tube(arm, ink));
  for (const s of [-1, 1]) g.add(tube([[s * 0.08, legLen + 0.02, 0], [s * 0.09, 0.3, 0.01], [s * 0.095, 0.02, 0], [s * 0.1, 0.018, 0.1]], ink));

  g.userData = { hc, ring, fm };
  return g;
}

// ---------- world ----------
function textBoard(lines, bg, fg, w = 1024, h = 512, size = 96) {
  return canvasTex(w, h, (g) => {
    g.fillStyle = bg; g.fillRect(0, 0, w, h);
    const r = rng(7); for (let i = 0; i < 3000; i++) { g.fillStyle = `rgba(255,255,255,${r() * 0.05})`; g.fillRect(r() * w, r() * h, 3, 1); }
    g.fillStyle = fg; g.font = `bold ${size}px Arial Black, Arial, sans-serif`; g.textAlign = "center"; g.textBaseline = "middle";
    lines.forEach((l, i) => g.fillText(l, w / 2, h / 2 + (i - (lines.length - 1) / 2) * size * 1.15));
  });
}

function skyTex() {
  return canvasTex(2048, 1024, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, "#081236"); gr.addColorStop(0.45, "#1b3478"); gr.addColorStop(0.56, "#4a6aa8");
    gr.addColorStop(0.575, "#16305e"); gr.addColorStop(1, "#06122c");
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    const r = rng(42);
    for (let i = 0; i < 900; i++) { const y = r() * h * 0.5, s = r() < 0.08 ? 3 : 1.5; g.fillStyle = `rgba(255,250,235,${0.4 + r() * 0.6})`; g.fillRect(r() * w, y, s, s); }
    for (let i = 0; i < 500; i++) { g.fillStyle = `rgba(160,190,255,${r() * 0.25})`; g.fillRect(r() * w, h * 0.58 + r() * h * 0.4, 20 + r() * 40, 2); }
  });
}

function gear(rad, teeth, mat) {
  const gg = new THREE.Group();
  gg.add(mesh(new THREE.CylinderGeometry(rad, rad, 0.05, 32), mat, { cast: true }));
  for (let i = 0; i < teeth; i++) { const t = mesh(new THREE.BoxGeometry(0.04, 0.05, 0.05), mat); const a = (i / teeth) * Math.PI * 2; t.position.set(Math.cos(a) * rad, 0, Math.sin(a) * rad); t.rotation.y = -a; gg.add(t); }
  gg.rotation.x = Math.PI / 2;
  return gg;
}

export async function buildScene(canvas, W, H) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, preserveDrawingBuffer: true, powerPreference: "high-performance" });
  renderer.setSize(W, H, false); renderer.setPixelRatio(1);
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.NoToneMapping;
  INK.setRGB(0.11, 0.075, 0.06, THREE.SRGBColorSpace);

  const gl = renderer.getContext(), dbg = gl.getExtension("WEBGL_debug_renderer_info");
  const gpu = dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
  console.log("GPU_RENDERER", gpu);

  const scene = new THREE.Scene();
  const cam = new THREE.PerspectiveCamera(72, W / H, 0.05, 200);

  const [floorP, plankP, ceilP] = await Promise.all([pbr("brown_planks_05", [5, 5]), pbr("brown_planks_05", [10, 1]), pbr("brown_planks_05", [6, 2])]);
  const RAD = 3.3;

  // floor, lower wall, upper band, planked cone ceiling with rafters (W1/W2)
  const floor = mesh(new THREE.CircleGeometry(RAD, 96), std({ ...floorP, color: 0xf0d2a8, roughness: 1, normalScale: new THREE.Vector2(1.2, 1.2) }));
  floor.rotation.x = -Math.PI / 2; scene.add(floor);
  const wall = mesh(new THREE.CylinderGeometry(RAD, RAD, 1.0, 96, 1, true), std({ ...plankP, side: THREE.BackSide }));
  wall.position.y = 0.5; scene.add(wall);
  const band = mesh(new THREE.CylinderGeometry(RAD, RAD, 0.22, 96, 1, true), std({ color: 0xd9cdb5, roughness: 0.6, side: THREE.BackSide }));
  band.position.y = 2.41; scene.add(band);
  const sill = mesh(new THREE.TorusGeometry(RAD - 0.03, 0.04, 8, 96), std({ color: 0xcfc3aa, roughness: 0.6 })); sill.rotation.x = Math.PI / 2; sill.position.y = 1.02; scene.add(sill);
  const ceil = mesh(new THREE.ConeGeometry(RAD + 0.02, 1.1, 96, 1, true), std({ ...ceilP, color: 0xffe0b8, side: THREE.BackSide }));
  ceil.position.y = 2.52 + 0.55; scene.add(ceil);
  const rafterMat = std({ ...ceilP, color: 0xe8c08a });
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2, len = Math.hypot(RAD, 1.1);
    const rf = mesh(new THREE.BoxGeometry(0.12, 0.12, len), rafterMat, { cast: false });
    const piv = new THREE.Group(); piv.position.set(0, 3.62, 0); piv.rotation.y = a;
    rf.position.set(0, -0.55 - 0.05, RAD / 2); rf.rotation.x = Math.atan2(1.1, RAD); piv.add(rf); scene.add(piv);
  }
  const hub = mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.25, 24), rafterMat); hub.position.y = 3.5; scene.add(hub);
  // window posts + outside railing + sky (stars + horizon haze)
  const postMat = std({ color: 0xcfc3aa, roughness: 0.5, metalness: 0.2 });
  for (let i = 0; i < 14; i++) { const a = (i / 14) * Math.PI * 2; const p = mesh(new THREE.BoxGeometry(0.07, 1.3, 0.07), postMat, { cast: true }); p.position.set(Math.cos(a) * (RAD - 0.03), 1.67, Math.sin(a) * (RAD - 0.03)); p.rotation.y = -a; scene.add(p); }
  for (const y of [0.9, 1.35]) { const rl = mesh(new THREE.TorusGeometry(RAD + 0.8, 0.025, 8, 128), std({ color: 0x2b2b35, roughness: 0.5, metalness: 0.5 })); rl.rotation.x = Math.PI / 2; rl.position.y = y; scene.add(rl); }
  const sky = new THREE.Mesh(new THREE.CylinderGeometry(14, 14, 24, 64, 1, true), new THREE.MeshBasicMaterial({ map: skyTex(), side: THREE.BackSide }));
  sky.position.y = 1.8; scene.add(sky);

  // lens on its pedestal (L3: real light INSIDE the lens, glass never blows out)
  const lens = new THREE.Group(); lens.position.set(0, 0, -0.55); scene.add(lens);
  const ped = mesh(new THREE.CylinderGeometry(0.58, 0.64, 0.85, 64), std({ color: 0xcbbfae, roughness: 0.7 }), { cast: true });
  ped.position.y = 0.425; lens.add(ped);
  const pool = mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.02, 64), std({ color: 0xdfe6ee, metalness: 1, roughness: 0.08 })); pool.position.y = 0.86; lens.add(pool);
  const plaque = mesh(new THREE.BoxGeometry(0.42, 0.11, 0.02), std({ map: textBoard(["MERCURY"], "#d6a93c", "#4a3410", 512, 128, 80), roughness: 0.4, metalness: 0.4 }));
  plaque.position.set(0, 0.5, 0.64); lens.add(plaque);
  const spin = new THREE.Group(); lens.add(spin);
  const glass = std({ color: 0xf2d79a, emissive: new THREE.Color(1.0, 0.72, 0.38), emissiveIntensity: 0.32, roughness: 0.25 });
  for (let i = 0; i < 9; i++) { const ring = mesh(new THREE.TorusGeometry(0.4 - Math.abs(i - 4) * 0.025, 0.05, 12, 64), glass); ring.rotation.x = Math.PI / 2; ring.position.y = 0.98 + i * 0.1; spin.add(ring); }
  for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; const rb = mesh(new THREE.BoxGeometry(0.03, 0.9, 0.03), std({ color: 0xb08a4a, roughness: 0.4, metalness: 0.6 })); rb.position.set(Math.cos(a) * 0.43, 1.38, Math.sin(a) * 0.43); spin.add(rb); }
  const core = new THREE.Mesh(new THREE.SphereGeometry(0.16, 24, 16), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.0, 0.78, 0.45).multiplyScalar(1.6) })); core.position.y = 1.38; lens.add(core);

  // joke chalkboard + sign (W3/W5), clockwork box with gears, crates, lantern
  const board = new THREE.Group(); board.position.set(1.85, 0, -1.55); board.rotation.y = -0.75; scene.add(board);
  const slate = mesh(new THREE.BoxGeometry(0.95, 0.66, 0.04), std({ map: textBoard(["DAYS WITHOUT", "A SHIPWRECK:", "3"], "#2f4a36", "#ece7d6", 1024, 720, 120), roughness: 0.95 }), { cast: true });
  slate.position.set(0, 1.3, 0); board.add(slate);
  for (const s of [-1, 1]) { const leg = mesh(new THREE.BoxGeometry(0.05, 1.0, 0.05), std({ ...plankP, color: 0xc89a66 }), { cast: true }); leg.position.set(s * 0.42, 0.5, -0.03); board.add(leg); }
  const box = mesh(new THREE.BoxGeometry(0.75, 1.0, 0.6), std({ ...plankP, color: 0xe0b483 }), { cast: true }); box.position.set(-2.05, 0.5, -1.35); box.rotation.y = 0.6; scene.add(box);
  const brass = std({ color: 0xc9a040, metalness: 0.8, roughness: 0.35 });
  const g1 = gear(0.22, 14, brass); g1.position.set(-1.83, 0.75, -1.1); g1.rotation.z = 0.6; scene.add(g1);
  const g2 = gear(0.14, 10, brass); g2.position.set(-1.62, 0.45, -0.95); g2.rotation.z = 0.6; scene.add(g2);
  for (const [x, y, z, s] of [[2.25, 0.25, -0.6, 0.5], [2.35, 0.65, -0.75, 0.32]]) { const c = mesh(new THREE.BoxGeometry(s, s, s), std({ ...plankP, color: 0xd9a46c }), { cast: true }); c.position.set(x, y, z); c.rotation.y = 0.4; scene.add(c); }
  const lantern = new THREE.Mesh(new THREE.SphereGeometry(0.06, 16, 12), new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 0.75, 0.4).multiplyScalar(3) }));
  lantern.position.set(2.32, 0.95, -0.72); scene.add(lantern);

  // characters (each ONE rigid group). Keeper left: hand on hip (on his side, never through the torso).
  // Engineer right: points at the lens with the hand on the lens's side (2026-11-16 rule).
  const keeper = character({
    coat: "knit", placket: 0xb07a12, face: "keeper", hat: "beanie", seed: 11, lightSide: 1,
    arms: (sy) => [
      [[-0.19, sy, 0.02], [-0.3, sy - 0.2, 0.06], [-0.27, sy - 0.4, 0.1], [-0.245, sy - 0.44, 0.13], [-0.22, sy - 0.425, 0.14]],
      [[0.19, sy, 0.02], [0.36, sy - 0.17, 0.05], [0.24, sy - 0.32, 0.12], [0.215, sy - 0.30, 0.15]],
    ],
  });
  keeper.position.set(-0.82, 0, 0.35); keeper.rotation.y = 0.35; scene.add(keeper);
  const engineer = character({
    coat: "check", placket: 0x6b4426, shirt: true, face: "engineer", hat: null, seed: 23, lightSide: -1,
    arms: (sy) => [
      [[-0.19, sy, 0.03], [-0.36, sy - 0.03, 0.14], [-0.55, sy + 0.1, 0.2], [-0.6, sy + 0.14, 0.21], [-0.6, sy + 0.18, 0.2]],
      [[0.19, sy, 0.02], [0.29, sy - 0.2, 0.06], [0.27, sy - 0.4, 0.1], [0.245, sy - 0.44, 0.13], [0.22, sy - 0.425, 0.14]],
    ],
  });
  engineer.position.set(0.82, 0, 0.35); engineer.rotation.y = -0.35; scene.add(engineer);
  const chars = [keeper, engineer];

  // lights (L1/L2): lamp inside the lens, moon, warm face fill from the camera side, roof bounce, lantern
  const lamp = new THREE.PointLight(new THREE.Color(1.0, 0.72, 0.42), 9, 0, 2); lamp.position.set(0, 1.38, -0.55);
  lamp.castShadow = true; lamp.shadow.mapSize.set(1024, 1024); lamp.shadow.bias = -0.002; lamp.shadow.radius = 4; lamp.shadow.camera.near = 0.45; scene.add(lamp);
  const moon = new THREE.DirectionalLight(new THREE.Color(0.45, 0.58, 1.0), 0.9); moon.position.set(-4, 5, -6); scene.add(moon);
  const fill = new THREE.SpotLight(new THREE.Color(1.0, 0.82, 0.62), 10, 0, 0.42, 0.8, 2); scene.add(fill); scene.add(fill.target);
  const bounce = new THREE.PointLight(new THREE.Color(1.0, 0.7, 0.45), 1.6, 0, 2); bounce.position.set(0, 2.6, 0.8); scene.add(bounce);
  const lant = new THREE.PointLight(new THREE.Color(1.0, 0.7, 0.38), 1.4, 0, 2); lant.position.copy(lantern.position); scene.add(lant);
  scene.add(new THREE.HemisphereLight(0x5a6aa0, 0x7a4a26, 0.45));

  // post (R2): bloom on light sources only, filmic tone map, saturation, contrast, vignette
  const composer = new EffectComposer(renderer, { frameBufferType: THREE.HalfFloatType, multisampling: 4 });
  composer.addPass(new RenderPass(scene, cam));
  composer.addPass(new EffectPass(cam,
    new BloomEffect({ intensity: 0.9, luminanceThreshold: 0.9, luminanceSmoothing: 0.08, mipmapBlur: true }),
    new ToneMappingEffect({ mode: ToneMappingMode.ACES_FILMIC }),
    new HueSaturationEffect({ saturation: 0.12 }),
    new BrightnessContrastEffect({ brightness: 0.0, contrast: 0.08 }),
    new VignetteEffect({ offset: 0.3, darkness: 0.55 })));

  const tmp = new THREE.Vector3(), q = new THREE.Quaternion(), wq = new THREE.Quaternion();
  const cr = new THREE.Vector3(), cu = new THREE.Vector3(), cb = new THREE.Vector3();
  const times = [];

  function renderFrame(f) {
    const t = f / 30, u = f / TOTAL;
    // camera: one slow continuous move (F2), framing ~21% head width (F1)
    cam.position.set(0.06 * Math.sin(t * 0.3), 1.22, 3.25 - 0.3 * u);
    cam.lookAt(0, 1.08, 0); cam.updateMatrixWorld();
    fill.position.copy(cam.position).add(new THREE.Vector3(0.4, 0.3, 0)); fill.target.position.set(0, 1.4, 0.3);
    spin.rotation.y = t * 0.35;
    // characters: the whole piece moves together (2026-11-16): no per-part lag
    chars.forEach((c, i) => {
      c.position.y = 0.006 * Math.sin(t * 2.0 + i * 1.7);
      c.rotation.y = (i ? -0.35 : 0.35) + 0.04 * Math.sin(t * 0.8 + i);
      c.updateMatrixWorld(true);
    });
    cr.set(1, 0, 0).applyQuaternion(cam.quaternion); cu.set(0, 1, 0).applyQuaternion(cam.quaternion); cb.set(0, 0, 1).applyQuaternion(cam.quaternion);
    for (const c of chars) {
      const { hc, ring, fm } = c.userData;
      const hw = c.localToWorld(tmp.copy(hc));
      fm.uniforms.hc.value.copy(hw); fm.uniforms.cr.value.copy(cr); fm.uniforms.cu.value.copy(cu); fm.uniforms.cb.value.copy(cb);
      // outline ring: on the head's camera silhouette, 0.85 R in front of the head centre
      const toCam = cam.position.clone().sub(hw); const d = toCam.length(); toCam.normalize();
      const pw = hw.clone().addScaledVector(toCam, 0.85 * R);
      const s = ((d - 0.85 * R) * Math.tan(Math.asin(R / d))) / R;
      ring.position.copy(c.worldToLocal(pw.clone())); ring.scale.setScalar(s);
      c.getWorldQuaternion(wq); ring.quaternion.copy(wq.invert().multiply(q.copy(cam.quaternion)));
    }
    const t0 = performance.now();
    composer.render();
    gl.finish();
    times.push(performance.now() - t0);
    window.__bench = { gpu, times };
  }

  return { renderFrame, dispose: () => { composer.dispose(); renderer.dispose(); } };
}
