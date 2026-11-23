// Video 3 FX kit (flour-mill explosion). Every builder returns a THREE.Object3D with a deterministic obj.set(...) (also on
// obj.userData.set): a pure function of its inputs (k, t). No Math.random at runtime: all variation comes from seeded rng at
// build time. Nothing pops: every particle grows/fades over >= 2 frames. Colours follow the v03 scheme (cool night base,
// fire #ff9a2a/#ffcf5a with a hot white core, flour #f3efe6, oxygen halos #7fd8ff, smoke cool grey-blue).
//
// Particles = one instanced billboard system per look (createPuffs): one draw call each, positions computed on the CPU in
// set(). Normal-blended systems (flour, smoke) sort back-to-front against the camera given with obj.setCamera(camera)
// (optional; unsorted still reads fine because every puff in a system shares one colour). Lit systems take real
// THREE.PointLights with obj.setLights([...]) (read at draw time) plus a cool ambient (moonlight).
import * as THREE from "three";
import { rng } from "../../shared/assets.js";

// ------------------------------------------------------------------------------------------------------ helpers
const cl = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const ss = (a, b, x) => { const u = cl((x - a) / (b - a)); return u * u * (3 - 2 * u); };
const mix = (a, b, u) => a + (b - a) * u;
const hash = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
/** smooth 1D value noise in -1..1 (deterministic) */
export const vnoise = (x) => { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return mix(hash(i), hash(i + 1), u) * 2 - 1; };
const lin = (hex, k = 1) => { const c = new THREE.Color(hex); return [c.r * k, c.g * k, c.b * k]; };
const v3 = (p) => (p?.isVector3 ? p.clone() : new THREE.Vector3(...(p || [0, 0, 0])));
const mixC = (a, b, u) => [mix(a[0], b[0], u), mix(a[1], b[1], u), mix(a[2], b[2], u)];
const unitDir = (r, upBias = 0) => { const z = r() * 2 - 1, a = r() * Math.PI * 2, s = Math.sqrt(1 - z * z);
  const d = new THREE.Vector3(s * Math.cos(a), z, s * Math.sin(a)); d.y = d.y * (1 - upBias) + upBias * Math.abs(d.y) + upBias * 0.35; return d.normalize(); };

export const FX_COLORS = {
  fire: lin("#ff9a2a"), gold: lin("#ffcf5a"), flour: lin("#f3efe6"), oxygen: lin("#7fd8ff"), smoke: lin("#4a5a70"),
  smokeLight: lin("#7d8ea6"), ember: lin("#ff6a1a"), red: lin("#c22a22"), navy: lin("#0f1b2e"), water: lin("#9fd0ea"),
};
const AMB_NIGHT = [0.16, 0.21, 0.32];        // cool moonlight fill on lit particles (smoke)
const AMB_FLOUR = [0.62, 0.68, 0.8];         // flour stays bright white-blue in moonlight (never grey)

// ------------------------------------------------------------------------------------------------ particle system
export const SHAPE = { soft: 0, puff: 1, spark: 2, halo: 3, flame: 5, fire: 6, CYL: 10 };   // + CYL = billboard keeps world-up

const PUFF_VS = /* glsl */ `
attribute vec4 iPos; attribute vec4 iCol; attribute vec4 iSz;
uniform vec3 amb; uniform float lit; uniform vec3 lp[4]; uniform vec3 lc[4]; uniform float lr[4]; uniform float nearFade;
varying vec2 vUv; varying vec4 vCol; varying float vShape; varying float vSeed;
void main(){
  vec3 c = (modelMatrix*vec4(iPos.xyz, 1.0)).xyz;
  float cyl = step(9.5, iPos.w); vShape = iPos.w - 10.0*cyl;
  vec3 right = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]);
  vec3 up = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);
  if (cyl > 0.5) { up = vec3(0.0, 1.0, 0.0); vec3 tc = cameraPosition - c; tc.y = 0.0; right = normalize(cross(up, normalize(tc + vec3(1e-4, 0.0, 0.0)))); }
  float cr = cos(iSz.z), sr = sin(iSz.z);
  vec2 q = position.xy*iSz.xy; q = vec2(q.x*cr - q.y*sr, q.x*sr + q.y*cr);
  vec3 p = c + right*q.x + up*q.y;
  gl_Position = projectionMatrix*viewMatrix*vec4(p, 1.0);
  vec3 L = vec3(1.0);
  if (lit > 0.0) { vec3 S = amb;
    for (int i = 0; i < 4; i++) { float dd = length(lp[i] - c); float att = clamp(1.0 - dd/max(lr[i], 1e-3), 0.0, 1.0); S += lc[i]*att*att/(1.0 + dd*dd*1.5); }
    L = mix(vec3(1.0), S, lit); }
  float a = iCol.a;
  if (nearFade > 0.0) { float z = -(viewMatrix*vec4(c, 1.0)).z; float r = max(iSz.x, iSz.y)*0.5; a *= smoothstep(0.08 + r*0.3, 0.35 + r*0.9, z); }
  vCol = vec4(iCol.rgb*L, a); vUv = uv; vSeed = iSz.w;
}`;
const PUFF_FS = /* glsl */ `
varying vec2 vUv; varying vec4 vCol; varying float vShape; varying float vSeed;
void main(){
  vec2 p = vUv - 0.5; float d = length(p)*2.0; float a = 0.0; vec3 col = vCol.rgb; float br = max(col.r, max(col.g, col.b));
  int s = int(vShape + 0.5);
  if (s == 0) { a = exp(-d*d*3.5)*(1.0 - smoothstep(0.8, 1.0, d)); }
  else if (s == 1 || s == 6) {
    float ang = atan(p.y, p.x);
    float e = 0.80 + 0.07*sin(ang*5.0 + vSeed*6.283) + 0.05*sin(ang*8.0 - vSeed*11.0) + 0.03*sin(ang*13.0 + vSeed*3.0);
    a = smoothstep(e, e - 0.2, d); float r = clamp(d/e, 0.0, 1.0);
    if (s == 1) { vec3 n = vec3(p*2.0/e, sqrt(max(0.0, 1.0 - r*r))); col *= 0.58 + 0.5*max(dot(n, normalize(vec3(-0.35, 0.65, 0.68))), 0.0); }
    else { float core = 1.0 - r; col = col*(0.5 + 0.9*core) + vec3(1.0, 0.85, 0.6)*pow(core, 2.5)*br*0.7; a *= 0.8 + 0.2*core; }
  }
  else if (s == 2) { float core = exp(-d*d*40.0);
    float gl = exp(-abs(p.x)*60.0)*exp(-abs(p.y)*7.0) + exp(-abs(p.y)*60.0)*exp(-abs(p.x)*7.0);
    a = core + gl*0.6 + exp(-d*d*6.0)*0.22; col = mix(col, vec3(br), core*0.55); }
  else if (s == 3) { float ring = exp(-pow((d - 0.66)/0.14, 2.0)); a = (ring + 0.22*smoothstep(0.75, 0.1, d))*(1.0 - smoothstep(0.88, 1.0, d)); }
  else if (s == 5) {
    float y = vUv.y; float w = y < 0.3 ? 0.5*sqrt(max(y/0.3, 0.0)) : 0.5*pow(max(1.0 - (y - 0.3)/0.7, 0.0), 1.25);
    float ad = abs(p.x)/max(w, 1e-3);
    a = smoothstep(1.0, 0.6, ad)*smoothstep(0.0, 0.05, y);
    float core = (1.0 - ad)*smoothstep(0.85, 0.2, y);
    col = mix(col, vec3(br*0.95), clamp(core*1.3, 0.0, 1.0));
    col = mix(col, vec3(0.25, 0.5, 1.0)*br*0.45, smoothstep(0.14, 0.0, y)*0.75);
  }
  a *= vCol.a; if (a < 0.003) discard;
  gl_FragColor = vec4(col, a);
}`;

/** Instanced billboard particles. push(x,y,z, w,h, rot, r,g,b,a, shape, seed) between begin() and end(). */
export function createPuffs({ max = 512, additive = false, sort = !additive, lit = 0, amb = AMB_NIGHT, lightGain = 0.35, nearFade = true,
  name = "puffs", renderOrder = additive ? 7 : 6 } = {}) {
  const quad = new THREE.PlaneGeometry(1, 1);
  const g = new THREE.InstancedBufferGeometry(); g.index = quad.index; g.setAttribute("position", quad.attributes.position); g.setAttribute("uv", quad.attributes.uv);
  const keys = ["iPos", "iCol", "iSz"], A = {}, S = {};
  for (const k of keys) { A[k] = new Float32Array(max * 4); S[k] = new Float32Array(max * 4);
    const at = new THREE.InstancedBufferAttribute(A[k], 4); at.setUsage(THREE.DynamicDrawUsage); g.setAttribute(k, at); }
  g.instanceCount = 0;
  const lp = [0, 1, 2, 3].map(() => new THREE.Vector3()), lc = [0, 1, 2, 3].map(() => new THREE.Vector3()), lr = [0, 0, 0, 0];
  const mat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, depthTest: true, side: THREE.DoubleSide,
    blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    uniforms: { amb: { value: new THREE.Vector3(...amb) }, lit: { value: lit }, lp: { value: lp }, lc: { value: lc }, lr: { value: lr }, nearFade: { value: nearFade ? 1 : 0 } },
    vertexShader: PUFF_VS, fragmentShader: PUFF_FS });
  const mesh = new THREE.Mesh(g, mat); mesh.frustumCulled = false; mesh.name = name; mesh.renderOrder = renderOrder; mesh.visible = false;
  mesh.userData.sky = false;
  let n = 0, camera = null, lights = [];
  const tmp = new THREE.Vector3(), cp = new THREE.Vector3(), cd = new THREE.Vector3(), order = [], depth = new Float32Array(max);
  mesh.onBeforeRender = () => {
    for (let i = 0; i < 4; i++) { const L = lights[i];
      if (L && L.visible !== false && L.intensity > 0) { L.getWorldPosition(lp[i]); lc[i].set(L.color.r, L.color.g, L.color.b).multiplyScalar(L.intensity * lightGain); lr[i] = L.distance || 6; }
      else { lc[i].set(0, 0, 0); lr[i] = 0; } }
  };
  const api = {
    mesh,
    begin() { n = 0; },
    push(x, y, z, w, h, rot, r, gg, b, a, shape = 1, seed = 0) {
      if (n >= max || a <= 0.002 || w <= 1e-5 || h <= 1e-5) return; const i = n * 4;
      S.iPos[i] = x; S.iPos[i + 1] = y; S.iPos[i + 2] = z; S.iPos[i + 3] = shape;
      S.iCol[i] = r; S.iCol[i + 1] = gg; S.iCol[i + 2] = b; S.iCol[i + 3] = Math.min(a, 1);
      S.iSz[i] = w; S.iSz[i + 1] = h; S.iSz[i + 2] = rot; S.iSz[i + 3] = seed; n++;
    },
    end() {
      if (sort && camera && n > 1) {
        camera.getWorldPosition(cp); camera.getWorldDirection(cd); mesh.updateWorldMatrix(true, false); order.length = n;
        for (let j = 0; j < n; j++) { order[j] = j; tmp.set(S.iPos[j * 4], S.iPos[j * 4 + 1], S.iPos[j * 4 + 2]).applyMatrix4(mesh.matrixWorld); depth[j] = tmp.sub(cp).dot(cd); }
        order.sort((a, b) => depth[b] - depth[a]);
        for (const k of keys) for (let j = 0; j < n; j++) { const s = order[j] * 4, d = j * 4; A[k][d] = S[k][s]; A[k][d + 1] = S[k][s + 1]; A[k][d + 2] = S[k][s + 2]; A[k][d + 3] = S[k][s + 3]; }
      } else for (const k of keys) A[k].set(S[k].subarray(0, n * 4));
      for (const k of keys) { const at = g.attributes[k]; at.clearUpdateRanges?.(); at.addUpdateRange?.(0, Math.max(n, 1) * 4); at.needsUpdate = true; }
      g.instanceCount = n; mesh.visible = n > 0;
    },
    setCamera(c) { camera = c; }, setLights(arr) { lights = arr || []; }, get count() { return n; }, uniforms: mat.uniforms,
  };
  return api;
}

/** Wire the common API onto a builder's root object. */
function finish(root, systems, setFn) {
  root.set = setFn; root.userData.set = setFn;
  root.setCamera = (c) => systems.forEach((s) => s.setCamera(c));
  root.setLights = (arr) => systems.forEach((s) => s.setLights(arr));
  root.userData.systems = systems;
  return root;
}

// ============================================================================================================ 1. CANDLE
/** Small tapered candle on a tin holder with a finger-ring handle. Origin = bottom of the holder, candle along +Y.
 *  userData.grip = the ring (finger hook), userData.light = warm PointLight (~2.5 m), userData.flameTip / flameBase.
 *  set(lit 0..1, t): flame grows from the wick (no pop), deterministic flicker. holder:false = bare candle (origin = base). */
export function createCandle({ lit = 1, height = 0.12, seed = 3, holder = true, intensity = 1.4, reach = 2.5, castShadow = false, scale = 1 } = {}) {
  const root = new THREE.Group(); root.name = "candle"; const r = rng(seed * 7 + 1);
  const wax = new THREE.MeshStandardMaterial({ color: new THREE.Color("#efe7d6"), roughness: 0.5, emissive: new THREE.Color("#ff9a2a"), emissiveIntensity: 0 });
  const tin = new THREE.MeshStandardMaterial({ color: new THREE.Color("#7f8890"), roughness: 0.32, metalness: 0.85 });
  const ink = new THREE.MeshStandardMaterial({ color: new THREE.Color("#1c1714"), roughness: 0.8 });
  const base = holder ? 0.016 : 0;
  if (holder) {
    const prof = [[0, 0], [0.056, 0], [0.061, 0.003], [0.064, 0.016], [0.06, 0.0175], [0.056, 0.006], [0.026, 0.006], [0.026, 0.024], [0.0215, 0.025], [0.0215, 0.016], [0, 0.016]];
    const dish = new THREE.Mesh(new THREE.LatheGeometry(prof.map(([x, y]) => new THREE.Vector2(x, y)), 36), tin); dish.castShadow = dish.receiveShadow = true; root.add(dish);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.016, 0.0042, 10, 28), tin); ring.position.set(0.079, 0.016, 0); ring.castShadow = true; root.add(ring);
    const tab = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.004, 0.012), tin); tab.position.set(0.064, 0.016, 0); root.add(tab);
    const grip = new THREE.Object3D(); grip.name = "grip"; grip.position.set(0.079, 0.016, 0); root.add(grip); root.userData.grip = grip;
  }
  // candle body: tapered, slightly lumpy, melted cup on top, a few drips
  const h = height, pts = [];
  for (let i = 0; i <= 12; i++) { const y = (i / 12) * h; pts.push(new THREE.Vector2(0.0205 - 0.0045 * (i / 12) + 0.0008 * Math.sin(i * 2.1 + seed), y)); }
  pts.push(new THREE.Vector2(0.0158, h + 0.002), new THREE.Vector2(0.012, h - 0.003), new THREE.Vector2(0, h - 0.004));
  pts.unshift(new THREE.Vector2(0, 0));
  const body = new THREE.Mesh(new THREE.LatheGeometry(pts, 28), wax); body.position.y = base; body.castShadow = body.receiveShadow = true; root.add(body);
  for (let i = 0; i < 4; i++) { const a = r() * Math.PI * 2, len = 0.012 + r() * 0.025, rad = 0.0016 + r() * 0.0014;
    const d = new THREE.Mesh(new THREE.CapsuleGeometry(rad, len, 4, 8), wax); const rr = 0.0158 + 0.0045 * (len / 2 / h);
    d.position.set(Math.cos(a) * rr, base + h - len / 2 - 0.001, Math.sin(a) * rr); root.add(d); }
  const wick = new THREE.Mesh(new THREE.CylinderGeometry(0.0011, 0.0013, 0.012, 6), ink); wick.position.set(0, base + h + 0.002, 0); wick.rotation.z = 0.18; root.add(wick);
  const flameBase = new THREE.Object3D(); flameBase.position.set(0, base + h + 0.003, 0); root.add(flameBase); root.userData.flameBase = flameBase;
  const flameTip = new THREE.Object3D(); root.add(flameTip); root.userData.flameTip = flameTip;
  const fx = createPuffs({ max: 8, additive: true, name: "candleFlame", nearFade: false }); root.add(fx.mesh);
  const light = new THREE.PointLight(0xffa24a, 0, reach, 2); light.position.set(0, base + h + 0.04, 0); light.castShadow = castShadow;
  if (castShadow) { light.shadow.mapSize.set(512, 512); light.shadow.bias = -0.002; light.shadow.camera.near = 0.03; }
  root.add(light); root.userData.light = light; root.userData.wax = wax;
  root.scale.setScalar(scale);
  const FIRE = FX_COLORS.fire, GOLD = FX_COLORS.gold;
  function set(l = 1, t = 0) {
    const L = cl(l), g = Math.pow(ss(0, 1, L), 0.7), sd = seed * 13.1;
    const f1 = vnoise(t * 6.3 + sd), f2 = vnoise(t * 11.7 + sd + 5.3), sway = vnoise(t * 2.2 + sd + 9.1) * 0.7 + vnoise(t * 5.1 + sd) * 0.3;
    const hk = 1 + 0.16 * f1 + 0.07 * f2, wk = 1 - 0.07 * f1, rot = -0.13 * sway;
    const y0 = base + h + 0.003, s = scale;
    fx.begin();
    if (g > 0.002) {
      const H = 0.078 * hk * g, W = 0.03 * wk * g, cx = -Math.sin(rot) * H * 0.5, cy = y0 + Math.cos(rot) * H * 0.5 - 0.004 * g;
      fx.push(cx * 0.6, y0 + 0.022 * g, 0, 0.30 * g, 0.30 * g, 0, FIRE[0] * 1.2, FIRE[1] * 1.2, FIRE[2] * 1.2, 0.16 * (1 + 0.1 * f1), SHAPE.soft + SHAPE.CYL);   // glow
      fx.push(cx, cy, 0, W * 1.15, H * 1.08, rot, FIRE[0] * 3.2, FIRE[1] * 3.2, FIRE[2] * 3.2, 0.9, SHAPE.flame + SHAPE.CYL);                           // outer
      fx.push(cx * 0.9, cy - H * 0.06, 0, W * 0.8, H * 0.82, rot * 0.9, GOLD[0] * 4, GOLD[1] * 4, GOLD[2] * 4, 0.9, SHAPE.flame + SHAPE.CYL);         // mid
      fx.push(cx * 0.8, cy - H * 0.16, 0, W * 0.42, H * 0.5, rot * 0.8, 7, 6.4, 5.2, 0.95, SHAPE.flame + SHAPE.CYL);                                    // white core
      flameTip.position.set(cx * 2, y0 + H, 0);
    }
    fx.end();
    light.intensity = intensity * g * (1 + 0.12 * f1 + 0.05 * f2) * s * s; light.visible = g > 0.002;
    light.position.set(cx2(rot), y0 + 0.035, 0);
    wax.emissiveIntensity = 0.3 * g;
  }
  const cx2 = (rot) => -Math.sin(rot) * 0.02;
  set(lit, 0);
  return finish(root, [fx], set);
}

// ======================================================================================================= 2. FLOUR HAZE
/** Floating flour: fine specks + soft haze sheets in a box, drifting slowly down (wraps, fades at the box edges), lit by the
 *  given lights (candle) + cool ambient. set(density 0..1, t). */
export function createFlourHaze({ box, count = 900, sheets = Math.round(count / 18), seed = 11, lights = [], size = 0.016, amb = AMB_FLOUR, lightGain = 0.5 } = {}) {
  const mn = v3(box.min), mx = v3(box.max), D = mx.clone().sub(mn), r = rng(seed * 3 + 2);
  const root = new THREE.Group(); root.name = "flourHaze";
  const P = createPuffs({ max: count + sheets, lit: 1, amb, lightGain, name: "flourHazeP" }); P.setLights(lights); root.add(P.mesh);
  const parts = [];
  for (let i = 0; i < count + sheets; i++) { const sheet = i >= count;
    parts.push({ sheet, x: r(), y: r(), z: r(), ph: r() * 100, v: (sheet ? 0.012 : 0.02) + r() * 0.03, s: sheet ? 0.5 + r() * 0.9 : size * (0.55 + r() * 1.1),
      a: sheet ? 0.09 + r() * 0.08 : 0.55 + r() * 0.4, seed: r() }); }
  const F = FX_COLORS.flour;
  function set(k = 1, t = 0) {
    const dn = cl(k); P.begin();
    if (dn > 0.002) for (const p of parts) {
      const yy = ((p.y - (p.v * t) / D.y) % 1 + 1) % 1, y = mn.y + yy * D.y;
      const x = mn.x + p.x * D.x + Math.sin(t * 0.23 + p.ph) * 0.1 + Math.sin(t * 0.071 + p.ph * 2) * 0.18;
      const z = mn.z + p.z * D.z + Math.cos(t * 0.19 + p.ph * 1.3) * 0.1;
      const ex = Math.min(ss(0, 0.08, yy), ss(1, 0.92, yy)) * ss(-0.1, 0.12, (x - mn.x) / D.x) * ss(1.1, 0.88, (x - mn.x) / D.x) * ss(-0.1, 0.12, (z - mn.z) / D.z) * ss(1.1, 0.88, (z - mn.z) / D.z);
      const tw = p.sheet ? 1 : 0.8 + 0.2 * Math.sin(t * 0.9 + p.ph * 3);
      P.push(x, y, z, p.s, p.s, p.ph, F[0], F[1], F[2], p.a * dn * ex * tw, SHAPE.soft, p.seed);
    }
    P.end();
  }
  set(1, 0);
  return finish(root, [P], set);
}

// ======================================================================================================= 3. SPARK SWIRL
/** Glittering sparks popping and swirling around a flame like fireflies. set(k 0..1 = how many / how wide, t). */
export function createSparkSwirl({ center = new THREE.Vector3(), radius = 0.35, count = 70, seed = 17, size = 0.032 } = {}) {
  const c = v3(center), r = rng(seed * 5 + 3), root = new THREE.Group(); root.name = "sparkSwirl";
  const P = createPuffs({ max: count * 7 + 4, additive: true, name: "sparkSwirlP" }); root.add(P.mesh);
  const S = [];
  for (let i = 0; i < count; i++) S.push({ rr: 0.3 + 0.7 * Math.sqrt(r()), a0: r() * Math.PI * 2, w: (0.9 + 1.5 * r()) * (r() < 0.2 ? -0.7 : 1),
    y0: (r() - 0.35) * 1.3, P: 0.7 + 0.9 * r(), ph: r(), hot: r(), bob: r() * 6.28, sz: 0.6 + 0.8 * r(), order: r() });
  const G = FX_COLORS.gold, O = FX_COLORS.fire;
  const pos = (s, t, R) => [c.x + Math.cos(s.a0 + s.w * t) * s.rr * R, c.y + s.y0 * R + 0.05 * Math.sin(t * 1.7 + s.bob) + 0.04 * s.rr * Math.sin(t * 0.8 + s.bob),
    c.z + Math.sin(s.a0 + s.w * t) * s.rr * R];
  function set(k = 1, t = 0) {
    const K = cl(k), R = radius * (0.55 + 0.45 * ss(0, 1, K)); P.begin();
    if (K > 0.002) {
      P.push(c.x, c.y, c.z, R * 2.6, R * 2.6, 0, O[0] * 0.5, O[1] * 0.5, O[2] * 0.5, 0.18 * ss(0, 0.5, K), SHAPE.soft);    // warm air glow
      for (const s of S) {
        const on = ss(s.order, s.order + 0.15, K * 1.15); if (on <= 0) continue;
        const u = ((t / s.P + s.ph) % 1 + 1) % 1, env = ss(0, 0.1, u) * (1 - ss(0.32, 1, u)), pop = ss(0.03, 0.1, u) * (1 - ss(0.1, 0.24, u));
        const col = mixC(O, G, s.hot), b = (3 + 4 * pop) * env * on, sz = size * s.sz * (0.55 + 0.6 * env + 0.5 * pop);
        const [x, y, z] = pos(s, t, R);
        P.push(x, y, z, sz, sz, s.bob, col[0] * b, col[1] * b, col[2] * b, Math.min(1, env * on * 1.2), SHAPE.spark, s.ph);
        for (let j = 1; j <= 6; j++) { const [qx, qy, qz] = pos(s, t - j * 0.016, R), f = (1 - j / 7) * 0.45;
          P.push(qx, qy, qz, sz * (0.5 - j * 0.045), sz * (0.5 - j * 0.045), 0, col[0] * b, col[1] * b, col[2] * b, env * on * f, SHAPE.soft); }
      }
    }
    P.end();
  }
  set(1, 0);
  return finish(root, [P], set);
}

// =========================================================================================================== 4. FIREBALL
/** A rolling ball of flame racing along a path (e.g. under the ceiling), leaving a cooling trail + grey-blue smoke.
 *  set(k, t): k 0..0.05 ignite, 0.05..0.62 travel (the ~1 s race), 0.62..0.85 burn out, ->1 smoke gone. Map ~1.6 s to k.
 *  userData.light follows the head; userData.head = current head position. */
export function createFireball({ path, radius = 0.45, seed = 23, intensity = 14, reach = 7, heads = 64, trail = 150, smoke = true } = {}) {
  const curve = new THREE.CatmullRomCurve3(path.map(v3)), len = curve.getLength(), r = rng(seed * 11 + 5);
  const root = new THREE.Group(); root.name = "fireball";
  const F = createPuffs({ max: heads + trail + 8, additive: true, name: "fireballFire" }), Sm = createPuffs({ max: trail + 40, lit: 1, name: "fireballSmoke" });
  root.add(F.mesh); if (smoke) root.add(Sm.mesh);
  const light = new THREE.PointLight(0xff8a2a, 0, reach, 2); root.add(light); root.userData.light = light;
  const head = new THREE.Vector3(); root.userData.head = head;
  const sOf = (k) => { const u = cl((k - 0.05) / 0.57); return 0.4 * u + 0.6 * u * u * (3 - 2 * u); };
  const kTab = []; for (let i = 0; i <= 400; i++) kTab.push(sOf(i / 400));
  const kOf = (s) => { let i = 0; while (i < 400 && kTab[i] < s) i++; return i === 0 ? 0.05 : (i - 1 + (s - kTab[i - 1]) / Math.max(kTab[i] - kTab[i - 1], 1e-6)) / 400; };
  const HP = []; for (let i = 0; i < heads; i++) { const d = unitDir(r); HP.push({ d, rr: 0.15 + 0.85 * Math.cbrt(r()), s: 0.5 + 0.4 * r(), ph: r() * 6.28, seed: r() }); }
  const TP = []; for (let i = 0; i < trail; i++) { const s = (i + r() * 0.8) / trail; TP.push({ s, k0: kOf(s), lat: (r() - 0.5) * 2, dn: r(), sz: 0.6 + 0.6 * r(), seed: r(), life: 0.13 + 0.08 * r() }); }
  const HOT = [4, 3.1, 1.7], ORG = FX_COLORS.fire.map((v) => v * 3), RED = [1.2, 0.2, 0.04];
  const heat = (h) => (h > 0.5 ? mixC(ORG, HOT, (h - 0.5) * 2) : mixC(RED, ORG, h * 2));
  const up = new THREE.Vector3(0, 1, 0), ax = new THREE.Vector3(), q = new THREE.Quaternion(), tmp = new THREE.Vector3(), tan = new THREE.Vector3(), side = new THREE.Vector3();
  const SMK = FX_COLORS.smoke;
  function set(k = 0, t = 0) {
    const K = cl(k), s = sOf(K), grow = ss(0, 0.07, K), die = 1 - ss(0.6, 0.84, K), hs = grow * (0.45 + 0.55 * die), R = radius;
    curve.getPointAt(s, head); curve.getTangentAt(s, tan); ax.crossVectors(up, tan).normalize(); side.copy(ax);
    F.begin(); Sm.begin();
    if (hs > 0.002 && K < 0.9) {
      q.setFromAxisAngle(ax, -(s * len) / R);
      for (const p of HP) { tmp.copy(p.d).applyQuaternion(q).multiplyScalar(p.rr * R * hs);
        const sz = R * p.s * hs * (1 + 0.15 * Math.sin(t * 9 + p.ph)) * 1.25, col = heat(1 - p.rr * 0.75 - (1 - die) * 0.4);
        F.push(head.x + tmp.x - tan.x * p.rr * R * 0.25, head.y + tmp.y, head.z + tmp.z - tan.z * p.rr * R * 0.25, sz, sz, p.ph + t * 2, col[0], col[1], col[2], 0.55 * die + 0.1, SHAPE.fire, p.seed); }
    }
    for (const p of TP) {
      const age = K - p.k0; if (age <= 0 || p.s > s + 1e-4) continue;
      curve.getPointAt(p.s, tmp); const gw = ss(0, 0.05, age);
      const x = tmp.x + side.x * p.lat * R * (0.4 + age * 3), y = tmp.y - R * (0.1 + 0.4 * p.dn) * (0.5 + age * 2), z = tmp.z + side.z * p.lat * R * (0.4 + age * 3);
      const fa = gw * (1 - ss(p.life * 0.4, p.life, age));
      if (fa > 0.003) { const col = heat(0.8 - age / p.life), sz = R * p.sz * (0.6 + age * 3.5);
        F.push(x, y, z, sz, sz, p.seed * 6 + age * 4, col[0], col[1], col[2], fa * 0.32, SHAPE.fire, p.seed); }
      const sa = ss(0.06, 0.16, age) * (1 - ss(0.35, 0.7, age)) * (1 - ss(0.88, 1, K));
      if (smoke && sa > 0.003) { const sz = R * p.sz * (1.3 + age * 4); Sm.push(x, y - age * 0.2, z, sz, sz, p.seed * 6, SMK[0], SMK[1], SMK[2], sa * 0.45, SHAPE.puff, p.seed); }
    }
    if (smoke && K > 0.6) { const a = ss(0.6, 0.75, K) * (1 - ss(0.85, 1, K));        // the head burns out into a puff of smoke
      for (let i = 0; i < 6; i++) { const sz = R * (1.2 + (K - 0.6) * 4) * (0.8 + 0.1 * i);
        Sm.push(head.x + Math.sin(i * 2.1) * R * 0.6, head.y - R * 0.2 - (K - 0.6) * 0.3, head.z + Math.cos(i * 2.1) * R * 0.6, sz, sz, i, SMK[0], SMK[1], SMK[2], a * 0.45, SHAPE.puff, i / 6); } }
    F.end(); Sm.end();
    light.position.copy(head); light.intensity = intensity * grow * die * (1 + 0.15 * vnoise(t * 9 + seed)); light.visible = light.intensity > 0.01;
  }
  set(0, 0);
  return finish(root, [F, Sm], set);
}

// ===================================================================================================== 5. DUST CASCADE
/** Flour pouring off beams in sheets like snow: each segment [a, b] (beam underside) sheds falling streaks + specks down to
 *  `fallTo`, with a low billow where it lands. set(k 0..1, t): amount + spread (1 = heavy pour). setLights([...]). */
export function createDustCascade({ segments, count = 1400, fallTo = 0, seed = 29, lights = [], width = 0.22, amb = AMB_FLOUR, lightGain = 0.45 } = {}) {
  const segs = segments.map(([a, b]) => [v3(a), v3(b)]), r = rng(seed * 17 + 9), root = new THREE.Group(); root.name = "dustCascade";
  const P = createPuffs({ max: count + 120, lit: 1, amb, lightGain, name: "dustCascadeP" }); P.setLights(lights); root.add(P.mesh);
  const lens = segs.map(([a, b]) => a.distanceTo(b)), tot = lens.reduce((x, y) => x + y, 0);
  const parts = [];
  for (let i = 0; i < count; i++) {
    let u = r() * tot, si = 0; while (si < segs.length - 1 && u > lens[si]) u -= lens[si++];
    const [a, b] = segs[si], f = u / lens[si], dir = b.clone().sub(a).normalize(), perp = new THREE.Vector3(-dir.z, 0, dir.x);
    const p0 = a.clone().lerp(b, f), streak = r() < 0.62, o = (r() + r() + r() - 1.5) * width;
    parts.push({ p0, perp, o, streak, v: 1.4 + r() * 1.2, ph: r(), w: streak ? 0.07 + r() * 0.12 : 0.012 + r() * 0.014, hh: 0.28 + r() * 0.4, seed: r(), order: r(), dr: r() * 6.28 });
  }
  const bill = []; for (let i = 0; i < 120; i++) { const sI = Math.floor(r() * segs.length), [a, b] = segs[sI]; bill.push({ p: a.clone().lerp(b, r()), ph: r(), s: 0.5 + r() * 0.8, seed: r(), order: r(), ox: (r() - 0.5) * 0.8, oz: (r() - 0.5) * 0.8 }); }
  const Fc = FX_COLORS.flour;
  function set(k = 0, t = 0) {
    const K = cl(k), spread = 1 + 1.6 * K; P.begin();
    if (K > 0.002) {
      for (const p of parts) {
        const on = ss(p.order * 0.9, p.order * 0.9 + 0.12, K * 1.05); if (on <= 0) continue;
        const H = p.p0.y - fallTo, per = H / p.v + 0.25, u = ((t / per + p.ph) % 1 + 1) % 1, d = H * Math.pow(u, 1.25);
        const lo = p.o * spread * (1 + 1.6 * u) + Math.sin(t * 0.9 + p.dr) * 0.06 * u;
        const x = p.p0.x + p.perp.x * lo, y = p.p0.y - d - 0.02, z = p.p0.z + p.perp.z * lo;
        const a = on * ss(0, 0.05, u) * (1 - ss(0.72, 1, u)) * (p.streak ? 0.3 + 0.2 * K : 0.85);
        const w = p.w * (1 + 1.4 * u) * (p.streak ? spread * 0.8 : 1), h = p.streak ? p.hh * (0.6 + 0.8 * u) * (0.8 + 0.6 * K) : w;
        P.push(x, y, z, w, h, 0, Fc[0], Fc[1], Fc[2], a, p.streak ? SHAPE.soft + SHAPE.CYL : SHAPE.soft, p.seed);
      }
      for (const b of bill) { const on = ss(b.order, b.order + 0.2, K * 1.2); if (on <= 0) continue;
        const u = ((t * 0.18 + b.ph) % 1 + 1) % 1, s = b.s * (0.6 + 0.9 * u) * (0.7 + 0.6 * K);
        P.push(b.p.x + b.ox * spread, fallTo + 0.15 + u * 0.5, b.p.z + b.oz * spread, s, s, b.seed * 6 + u, Fc[0], Fc[1], Fc[2], on * 0.3 * ss(0, 0.15, u) * (1 - ss(0.6, 1, u)), SHAPE.puff, b.seed); }
    }
    P.end();
  }
  set(0, 0);
  return finish(root, [P], set);
}

/** Volumetric-looking white flour cloud filling a box from the top down. set(k 0..1, t = 0): 1 = near white-out. */
export function createWhiteout({ box, count = 170, seed = 31, lights = [], amb = AMB_FLOUR, lightGain = 0.45 } = {}) {
  const mn = v3(box.min), mx = v3(box.max), D = mx.clone().sub(mn), r = rng(seed * 19 + 4), root = new THREE.Group(); root.name = "whiteout";
  const P = createPuffs({ max: count, lit: 1, amb, lightGain, name: "whiteoutP" }); P.setLights(lights); root.add(P.mesh);
  const base = Math.max(0.6, Math.min(D.x, D.y, D.z) * 0.55), parts = [];
  for (let i = 0; i < count; i++) { const y = r(); parts.push({ x: r(), y, z: r(), s: base * (0.7 + 0.8 * r()), th: 0.55 * (1 - y) + 0.35 * r(), ph: r() * 6.28, seed: r() }); }
  const Fc = FX_COLORS.flour;
  function set(k = 0, t = 0) {
    const K = cl(k); P.begin();
    if (K > 0.002) for (const p of parts) {
      const on = ss(p.th, p.th + 0.22, K * 1.12); if (on <= 0) continue;
      const x = mn.x + p.x * D.x + Math.sin(t * 0.21 + p.ph) * 0.18, y = mn.y + p.y * D.y + Math.sin(t * 0.17 + p.ph * 2) * 0.1 - (1 - on) * 0.4,
        z = mn.z + p.z * D.z + Math.cos(t * 0.15 + p.ph) * 0.18, s = p.s * (0.45 + 0.55 * on);
      P.push(x, y, z, s, s, p.ph + t * 0.05, Fc[0], Fc[1], Fc[2], on * (0.3 + 0.35 * ss(0.6, 1, K)), SHAPE.puff, p.seed);
    }
    P.end();
  }
  set(0, 0);
  return finish(root, [P], set);
}

// ================================================================================================== 6. SCIENCE STAGE
/** Standalone macro set at (300, 0, 300): dark cool cyclorama with three stations (x -2.4 pile, 0 puff, +2.4 chain).
 *  set({ pile, puff, chain } each 0..1, t). anchors.views.{pile,puff,chain} = { pos, target, fov } in world space. */
export function createScienceStage({ origin = new THREE.Vector3(300, 0, 300), seed = 41 } = {}) {
  const O = v3(origin), root = new THREE.Group(); root.name = "scienceStage"; root.position.copy(O); const r = rng(seed * 23 + 7);
  // --- cyclorama: floor + curved back wall, dark cool navy with a soft gradient (lit by its own cool lights)
  const cycM = new THREE.MeshStandardMaterial({ color: new THREE.Color("#16243a"), roughness: 0.92 });
  const floor = new THREE.Mesh(new THREE.CircleGeometry(9, 48), cycM); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; root.add(floor);
  const wall = new THREE.Mesh(new THREE.CylinderGeometry(8, 8, 9, 64, 1, true, Math.PI * 0.55, Math.PI * 0.9), cycM); wall.position.set(0, 4.5, 3.5);
  wall.material = cycM.clone(); wall.material.side = THREE.BackSide; wall.receiveShadow = true; root.add(wall);
  const slate = new THREE.MeshStandardMaterial({ color: new THREE.Color("#3a4250"), roughness: 0.7 });
  const plinth = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.8, 0.5), slate); plinth.position.set(-2.4, 0.4, 0); plinth.castShadow = plinth.receiveShadow = true; root.add(plinth);
  const rim = new THREE.SpotLight(0x7fb8ff, 40, 12, 0.9, 0.8, 1.6); rim.position.set(0, 5, 3); rim.target.position.set(0, 1, -2); root.add(rim, rim.target);
  const back = new THREE.PointLight(0x2c5f73, 30, 9, 1.5); back.position.set(0, 2.2, -3.2); root.add(back);
  // --- (a) flour pile with a candle that only chars it
  const PX = -2.4, PY = 0.8, PR = 0.16, PH = 0.12;
  const heap = new THREE.LatheGeometry(Array.from({ length: 25 }, (_, i) => { const u = i / 24; return new THREE.Vector2(PR * (1 - u) + 1e-4, PH * (1 - Math.pow(1 - u, 2.2))); }), 72);
  { const p = heap.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), y = p.getY(i), a = Math.atan2(z, x);
      const n = 1 + 0.06 * Math.sin(a * 7 + 1) * (y / PH) + 0.03 * Math.sin(a * 17 + y * 90); p.setX(i, x * n); p.setZ(i, z * n); p.setY(i, y * (1 + 0.04 * Math.sin(a * 5))); }
    heap.computeVertexNormals(); heap.setAttribute("color", new THREE.Float32BufferAttribute(new Float32Array(p.count * 3).fill(1), 3)); }
  const heapM = new THREE.MeshStandardMaterial({ color: new THREE.Color("#f3efe6"), roughness: 1, vertexColors: true });
  const pile = new THREE.Mesh(heap, heapM); pile.position.set(PX, PY, 0); pile.castShadow = pile.receiveShadow = true; root.add(pile);
  const hAt = (rr) => PH * (1 - Math.pow(rr / PR, 2.2));
  const contact = new THREE.Vector3(0.088, hAt(0.088), 0.0);                    // char point on the heap (local to the pile)
  const candle = createCandle({ holder: false, height: 0.1, seed: 5, intensity: 0.3, reach: 1.2 });
  const tipLocal = new THREE.Vector3(0, 0.1 + 0.006, 0), tilt = 0.85;
  candle.rotation.z = tilt; const tipW = tipLocal.clone().applyEuler(candle.rotation);
  candle.position.set(PX + contact.x + 0.012 - tipW.x, PY + contact.y + 0.008 - tipW.y, 0); root.add(candle);
  const wisp = createPuffs({ max: 40, lit: 1, name: "scienceWisp" }); wisp.setLights([candle.userData.light]); root.add(wisp.mesh);
  const charC = new THREE.Color("#1d1b1a"), toast = new THREE.Color("#8a5a2a"), white = new THREE.Color(1, 1, 1), cc = new THREE.Color();
  // --- (b) puff + (c) chain: specks (normal) + halos/fire/sparks (additive)
  const SP = createPuffs({ max: 420, name: "scienceSpecks" }), GL = createPuffs({ max: 1200, additive: true, name: "scienceGlow" });
  root.add(SP.mesh, GL.mesh);
  const puffC = new THREE.Vector3(0, 1.2, 0), puffFrom = new THREE.Vector3(0, 0.8, 0.05), puffS = [];
  for (let i = 0; i < 95; i++) { const d = unitDir(r), f = Math.cbrt(r()); puffS.push({ tgt: new THREE.Vector3(d.x * 0.15 * f, d.y * 0.26 * f, d.z * 0.1 * f).add(puffC),
    s: 0.011 + r() * 0.008, ph: r() * 6.28, seed: r(), o: r() }); }
  const chC = new THREE.Vector3(2.4, 1.2, 0), chS = [], dir = new THREE.Vector3(0.42, 0.9, 0).normalize();
  for (let i = 0; i < 170; i++) { const d = unitDir(r), f = Math.cbrt(r()); chS.push({ p: new THREE.Vector3(d.x * 0.28 * f, d.y * 0.5 * f, d.z * 0.16 * f).add(chC),
    s: 0.011 + r() * 0.008, ph: r() * 6.28, seed: r() }); }
  { const o = chS.map((s) => s.p.clone().sub(chC).dot(dir)), mnO = Math.min(...o), mxO = Math.max(...o);
    chS.forEach((s, i) => { s.ig = 0.05 + 0.78 * ((o[i] - mnO) / (mxO - mnO)) + (r() - 0.5) * 0.05; });
    chS.forEach((s) => { let best = null, bd = 1e9; for (const q of chS) if (q.ig < s.ig) { const dd = q.p.distanceToSquared(s.p); if (dd < bd) { bd = dd; best = q; } } s.parent = best; }); }
  const chainLight = new THREE.PointLight(0xff8a2a, 0, 3, 2); root.add(chainLight); root.userData.chainLight = chainLight;
  const Fl = FX_COLORS.flour, OX = FX_COLORS.oxygen, FI = FX_COLORS.fire, GO = FX_COLORS.gold, SMK = FX_COLORS.smokeLight;
  const W = (x, y, z) => new THREE.Vector3(x, y, z).add(O);
  root.userData.anchors = root.anchors = {
    pile: W(PX, PY + 0.06, 0), puff: W(0, 1.2, 0), chain: W(2.4, 1.2, 0),
    views: { pile: { pos: W(PX + 0.8, PY + 0.34, 0.62), target: W(PX + 0.03, PY + 0.05, 0), fov: 30 },
      puff: { pos: W(0, 1.22, 0.95), target: W(0, 1.2, 0), fov: 36 }, chain: { pos: W(2.4, 1.22, 1.75), target: W(2.4, 1.2, 0), fov: 40 } },
  };
  const tmp = new THREE.Vector3();
  function set({ pile: kp = 0, puff: kf = 0, chain: kc = 0 } = {}, t = 0) {
    // (a) pile: candle lit, char spot grows, a thin wisp rises (no fire spreads)
    candle.set(ss(0, 0.06, kp) * (kp > 0 ? 1 : 0), t);
    const rad = 0.004 + 0.05 * ss(0.05, 1, kp), col = heap.attributes.color, pos = heap.attributes.position;
    for (let i = 0; i < pos.count; i++) { tmp.set(pos.getX(i), pos.getY(i), pos.getZ(i)); const d = tmp.distanceTo(contact);
      const ch = kp > 0.03 ? 1 - ss(rad * 0.55, rad, d) : 0, to = kp > 0.03 ? (1 - ss(rad, rad * 1.5, d)) * (1 - ch) : 0;
      cc.copy(white).lerp(toast, to * 0.7).lerp(charC, ch); col.setXYZ(i, cc.r, cc.g, cc.b); }
    col.needsUpdate = true;
    wisp.begin();
    if (kp > 0.15) for (let i = 0; i < 14; i++) { const u = ((t * 0.35 + i / 14) % 1 + 1) % 1, a = ss(0.15, 0.4, kp) * ss(0, 0.15, u) * (1 - ss(0.5, 1, u));
      const sz = 0.02 + u * 0.09; wisp.push(PX + contact.x - 0.01 + Math.sin(t * 1.3 + i) * 0.02 * u, PY + contact.y + 0.05 + u * 0.35, Math.cos(t + i * 1.7) * 0.015 * u,
        sz, sz, i + u, SMK[0], SMK[1], SMK[2], a * 0.4, SHAPE.puff, i / 14); }
    wisp.end();
    SP.begin(); GL.begin();
    // (b) puff: specks burst out from a pinch, then each grows a glowing cyan oxygen halo
    if (kf > 0.002) for (const s of puffS) {
      const u = ss(0, 0.45, kf), e = 1 - Math.pow(1 - u, 3); tmp.copy(puffFrom).lerp(s.tgt, e);
      tmp.x += Math.sin(t * 0.7 + s.ph) * 0.006; tmp.y += Math.sin(t * 0.5 + s.ph * 2) * 0.006;
      const sa = ss(0, 0.05, kf), sz = s.s * (0.6 + 0.4 * u);
      SP.push(tmp.x, tmp.y, tmp.z, sz, sz, s.ph, Fl[0] * 1.15, Fl[1] * 1.15, Fl[2] * 1.15, sa, SHAPE.puff, s.seed);
      const h = ss(0.35 + s.o * 0.3, 0.55 + s.o * 0.3, kf), hs = s.s * 2.9 * (1 + 0.06 * Math.sin(t * 2 + s.ph));
      if (h > 0.003) GL.push(tmp.x, tmp.y, tmp.z, hs * (0.6 + 0.4 * h), hs * (0.6 + 0.4 * h), 0, OX[0] * 1.6, OX[1] * 1.6, OX[2] * 1.6, h * 0.8, SHAPE.halo, s.seed);
    }
    // (c) chain: haloed specks ignite speck to speck; a spark jumps from the parent to each new speck
    let lit = 0; const fc = new THREE.Vector3();
    for (const s of chS) {
      const age = (kc - s.ig) / 0.1, burn = age > 0 ? ss(0, 0.25, age) : 0, out = ss(0.6, 1.4, age);
      const p = s.p; const jx = Math.sin(t * 0.7 + s.ph) * 0.006, jy = Math.sin(t * 0.5 + s.ph * 2) * 0.006;
      const spc = mixC(mixC(Fl, [0.12, 0.11, 0.1], out), [4, 2.6, 1.2], burn * (1 - out));
      SP.push(p.x + jx, p.y + jy, p.z, s.s, s.s, s.ph, spc[0], spc[1], spc[2], 1 - 0.5 * out, SHAPE.puff, s.seed);
      const halo = 1 - ss(0, 0.3, age), hs = s.s * 2.9 * (1 + 0.06 * Math.sin(t * 2 + s.ph));
      if (halo > 0.003) GL.push(p.x + jx, p.y + jy, p.z, hs, hs, 0, OX[0] * 1.6, OX[1] * 1.6, OX[2] * 1.6, 0.8 * halo, SHAPE.halo, s.seed);
      if (age > 0 && age < 1.6) { const fe = ss(0, 0.2, age) * (1 - ss(0.5, 1.6, age)), fs = s.s * (2 + 5 * ss(0, 0.6, age));
        const fcol = mixC(FI.map((v) => v * 3), [4, 3.4, 2.2], 1 - ss(0, 0.6, age));
        GL.push(p.x + jx, p.y + jy + age * 0.02, p.z, fs, fs, s.ph + age, fcol[0], fcol[1], fcol[2], fe * 0.75, SHAPE.fire, s.seed); lit += fe; fc.addScaledVector(p, fe); }
      const ja = (kc - (s.ig - 0.035)) / 0.035;
      if (s.parent && ja > 0 && ja < 1.25) { tmp.copy(s.parent.p).lerp(p, cl(ja)); const a = ss(0, 0.3, ja) * (1 - ss(1, 1.25, ja)), sz = 0.03;
        GL.push(tmp.x, tmp.y, tmp.z, sz, sz, ja * 3, GO[0] * 6, GO[1] * 6, GO[2] * 6, a, SHAPE.spark, s.seed); }
    }
    SP.end(); GL.end();
    if (lit > 0.01) { chainLight.position.copy(fc.divideScalar(lit)); chainLight.position.z += 0.25; }
    chainLight.intensity = Math.min(lit, 8) * 1.2; chainLight.visible = lit > 0.01;
  }
  set({}, 0);
  return finish(root, [SP, GL, wisp, ...candle.userData.systems], set);
}

// ========================================================================================================= 7. EXPLOSION
/** The big second blast. set(k 0..1 over `duration` (~2.5 s), t): hot core flash (<= 3 frames), expanding fireball, huge
 *  white flour plume, embers, debris planks/shingles with spin + gravity (they come to rest at groundY), lingering smoke.
 *  userData.light = blast light (orange, decays over ~1.5 s). */
export function createExplosion({ center = new THREE.Vector3(), scale = 1, seed = 37, groundY = 0, duration = 2.5, debris = 48, intensity = 900 } = {}) {
  const c = v3(center), S = scale, r = rng(seed * 29 + 3), root = new THREE.Group(); root.name = "explosion";
  const F = createPuffs({ max: 520, additive: true, name: "explosionFire" }), Cl = createPuffs({ max: 520, lit: 1, lightGain: 0.004 / S, name: "explosionCloud" });
  root.add(F.mesh, Cl.mesh);
  const light = new THREE.PointLight(0xff8a2a, 0, 45 * S, 1.6); light.position.copy(c); root.add(light); root.userData.light = light; Cl.setLights([light]);
  const FB = [], EM = [], PL = [], SM = [], RG = [];
  for (let i = 0; i < 130; i++) FB.push({ d: unitDir(r, 0.3), f: 0.25 + 0.75 * Math.cbrt(r()), s: 1.3 + 1.6 * r(), seed: r(), fo: r() });
  for (let i = 0; i < 160; i++) { const d = unitDir(r, 0.45); EM.push({ v: d.multiplyScalar((6 + 11 * r()) * Math.sqrt(S)), s: 0.08 + 0.1 * r(), end: 1.3 + r() * 0.8, seed: r(), hot: r() }); }
  for (let i = 0; i < 200; i++) PL.push({ d: unitDir(r, 0.55), f: 0.3 + 0.7 * Math.cbrt(r()), s: 1.6 + 2.2 * r(), seed: r(), rise: 0.6 + 0.8 * r() });
  for (let i = 0; i < 90; i++) SM.push({ b: 0.45 + 0.8 * r(), a: r() * 6.28, rr: r(), s: 1.8 + 1.6 * r(), seed: r(), h: r() });
  for (let i = 0; i < 46; i++) RG.push({ a: (i / 46) * Math.PI * 2 + r() * 0.1, s: 1.2 + r(), seed: r() });
  // debris: planks + shingles (instanced boxes), ballistic with spin, resting on groundY
  const woodM = new THREE.MeshStandardMaterial({ color: new THREE.Color("#4a4540"), roughness: 0.85 }), shM = new THREE.MeshStandardMaterial({ color: new THREE.Color("#3b3631"), roughness: 0.8 });
  const nPl = Math.round(debris * 0.55), nSh = debris - nPl, box = new THREE.BoxGeometry(1, 1, 1);
  const planks = new THREE.InstancedMesh(box, woodM, nPl), shingles = new THREE.InstancedMesh(box, shM, nSh);
  for (const m of [planks, shingles]) { m.castShadow = true; m.frustumCulled = false; m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); root.add(m); }
  const DB = []; const G = 9.8 * Math.sqrt(S);
  for (let i = 0; i < debris; i++) { const pl = i < nPl, d = unitDir(r, 0.5);
    DB.push({ m: pl ? planks : shingles, idx: pl ? i : i - nPl, dim: pl ? [(0.7 + 0.8 * r()) * S, 0.11 * S, 0.035 * S] : [0.28 * S, 0.02 * S, 0.2 * S],
      p0: c.clone().addScaledVector(d, 0.8 * S * r()), v: d.clone().multiplyScalar((7 + 10 * r()) * Math.sqrt(S)).add(new THREE.Vector3(0, 3 * Math.sqrt(S), 0)),
      ax: unitDir(r), w: 4 + 10 * r() }); }
  for (const b of DB) { const vy = b.v.y, y0 = b.p0.y - groundY - 0.03 * S; b.tHit = (vy + Math.sqrt(vy * vy + 2 * G * Math.max(y0, 0))) / G; }
  const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), P3 = new THREE.Vector3(), SC = new THREE.Vector3();
  const HOT = [4.5, 3.6, 2.2], ORG = FX_COLORS.fire.map((v) => v * 3), RED = [1.3, 0.25, 0.05];
  const heat = (h) => (h > 0.5 ? mixC(ORG, HOT, (h - 0.5) * 2) : mixC(RED, ORG, h * 2));
  const Fl = FX_COLORS.flour, SMK = FX_COLORS.smoke, FI = FX_COLORS.fire;
  function set(k = 0, t = 0) {
    const K = cl(k), T = K * duration; F.begin(); Cl.begin();
    if (K > 0) {
      // core flash: up in ~1.5 frames, gone by 3 frames (never full-frame: ~7 m ball)
      const fl = ss(0, 0.05, T) * (1 - ss(0.05, 0.1, T));
      if (fl > 0.003) F.push(c.x, c.y, c.z, 7 * S * (0.6 + 0.4 * fl), 7 * S * (0.6 + 0.4 * fl), 0, 7, 6.2, 4.8, fl, SHAPE.soft);
      const core = ss(0, 0.06, T) * (1 - ss(0.12, 0.45, T));
      if (core > 0.003) F.push(c.x, c.y + T * S, c.z, 3.4 * S, 3.4 * S, 0, HOT[0], HOT[1], HOT[2], core * 0.8, SHAPE.fire, 0.3);
      // fireball
      const R = 4.6 * S * (1 - Math.exp(-T * 5));
      for (const p of FB) { const a = ss(0, 0.06, T) * (1 - ss(0.7 + 0.3 * p.fo, 1.5 + 0.3 * p.fo, T)); if (a <= 0.003) continue;
        const h = 1 - ss(0.05, 1.2, T + 0.35 * p.f), col = heat(h), sz = S * p.s * (0.45 + 0.55 * ss(0, 0.35, T)) * (1 + 0.3 * T);
        F.push(c.x + p.d.x * R * p.f, c.y + p.d.y * R * p.f + Math.pow(T, 1.5) * 1.3 * S, c.z + p.d.z * R * p.f, sz, sz, p.seed * 6 + T, col[0], col[1], col[2], a * 0.6, SHAPE.fire, p.seed); }
      // embers
      for (const e of EM) { const a = ss(0, 0.06, T) * (1 - ss(0.6 * e.end, e.end, T)); if (a <= 0.003) continue;
        const x = c.x + e.v.x * T, y = Math.max(groundY + 0.05, c.y + e.v.y * T - 0.5 * G * 0.6 * T * T), z = c.z + e.v.z * T, col = mixC(FI, FX_COLORS.gold, e.hot), b = 4 * (1 - ss(0, e.end, T) * 0.6);
        F.push(x, y, z, e.s * S, e.s * S, e.seed * 6, col[0] * b, col[1] * b, col[2] * b, a, SHAPE.spark, e.seed); }
      // white flour plume (mushrooms up), warm-lit by the fire at first
      const RP = 7.5 * S * (1 - Math.exp(-T * 2.4)), warm = 1 - ss(0.15, 0.9, T);
      for (const p of PL) { const a = 0.8 * ss(0.02, 0.18, T) * (1 - 0.35 * ss(1.6, 2.6, T)); if (a <= 0.003) continue;
        const sz = S * p.s * (0.35 + 0.65 * ss(0, 0.7, T)) * (1 + 0.15 * T), gl = warm * (1 - p.f) * 2.2;
        Cl.push(c.x + p.d.x * RP * p.f, c.y + p.d.y * RP * p.f * 0.8 + T * p.rise * 1.8 * S, c.z + p.d.z * RP * p.f, sz, sz, p.seed * 6 + T * 0.1,
          Fl[0] + FI[0] * gl, Fl[1] + FI[1] * gl, Fl[2] + FI[2] * gl, a, SHAPE.puff, p.seed); }
      // ground skirt of flour
      const RG_ = 9 * S * (1 - Math.exp(-T * 2));
      for (const g of RG) { const a = 0.55 * ss(0.05, 0.3, T) * (1 - 0.3 * ss(1.8, 2.5, T)); const sz = S * g.s * (0.6 + 0.8 * ss(0, 1, T));
        Cl.push(c.x + Math.cos(g.a) * RG_, groundY + sz * 0.35, c.z + Math.sin(g.a) * RG_, sz, sz, g.seed * 6, Fl[0], Fl[1], Fl[2], a, SHAPE.puff, g.seed); }
      // lingering smoke column (cool grey-blue)
      for (const s of SM) { const age = T - s.b; if (age <= 0) continue; const a = 0.7 * ss(0, 0.4, age);
        const sz = S * s.s * (0.6 + 0.6 * age), rr = (0.5 + s.rr * 2.2) * S * (1 + 0.4 * age);
        Cl.push(c.x + Math.cos(s.a + age * 0.3) * rr, c.y + S * (1 + s.h * 3 + age * 2.4), c.z + Math.sin(s.a + age * 0.3) * rr, sz, sz, s.seed * 6 + age * 0.2,
          SMK[0], SMK[1], SMK[2], a, SHAPE.puff, s.seed); }
    }
    F.end(); Cl.end();
    // debris
    for (const b of DB) {
      const tt = Math.min(T, b.tHit), g = K > 0 ? ss(0, 0.07, T) : 0;
      P3.copy(b.p0).addScaledVector(b.v, tt); P3.y -= 0.5 * G * tt * tt; if (T >= b.tHit) P3.y = groundY + b.dim[1] * 0.5;
      Q.setFromAxisAngle(b.ax, b.w * tt); SC.set(b.dim[0] * g + 1e-5, b.dim[1] * g + 1e-5, b.dim[2] * g + 1e-5);
      M.compose(P3, Q, SC); b.m.setMatrixAt(b.idx, M);
    }
    planks.instanceMatrix.needsUpdate = shingles.instanceMatrix.needsUpdate = true; planks.visible = shingles.visible = K > 0;
    const le = K > 0 ? ss(0, 0.05, T) * (0.35 + 0.65 * (1 - ss(0.05, 0.25, T))) * (1 - ss(0.2, 1.8, T)) : 0;
    light.intensity = intensity * S * S * le * (1 + 0.12 * vnoise(t * 8 + seed)); light.visible = light.intensity > 0.01;
  }
  set(0, 0);
  return finish(root, [F, Cl], set);
}

// ============================================================================================================ 8. SPLASH
/** Character-sized river splash at `at` (water surface point): crown sheet, droplets, a jet, an expanding ring, foam + a
 *  powder puff of flour (he's covered in it). set(k 0..1 over ~1.2 s, t). */
export function createSplash({ at = new THREE.Vector3(), scale = 1, seed = 43, drops = 90, flour = true } = {}) {
  const A = v3(at), S = scale, r = rng(seed * 31 + 1), root = new THREE.Group(); root.name = "splash"; root.position.copy(A);
  const waterM = new THREE.MeshStandardMaterial({ color: new THREE.Color("#cfeaf6"), roughness: 0.08, metalness: 0, emissive: new THREE.Color("#9fd0ea"), emissiveIntensity: 0.45 });
  const sheetM = new THREE.MeshStandardMaterial({ color: new THREE.Color("#bfe2f2"), roughness: 0.1, transparent: true, opacity: 0.8, side: THREE.DoubleSide,
    emissive: new THREE.Color("#7fb8d8"), emissiveIntensity: 0.5, depthWrite: false });
  const foamM = new THREE.MeshBasicMaterial({ color: new THREE.Color("#e8f4fa"), transparent: true, opacity: 0, depthWrite: false });
  const dm = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 10, 8), waterM, drops); dm.frustumCulled = false; dm.instanceMatrix.setUsage(THREE.DynamicDrawUsage); root.add(dm);
  const D = []; for (let i = 0; i < drops; i++) { const a = r() * Math.PI * 2, out = 0.8 + 2.2 * r();
    D.push({ a, r0: (0.2 + 0.25 * r()) * S, v: new THREE.Vector3(Math.cos(a) * out, 3 + 4 * r(), Math.sin(a) * out).multiplyScalar(Math.sqrt(S)), s: (0.018 + 0.035 * r()) * S, t0: r() * 0.12 }); }
  // crown: open jagged cylinder
  const crG = new THREE.CylinderGeometry(1, 0.8, 1, 48, 6, true); crG.translate(0, 0.5, 0);
  { const p = crG.attributes.position; for (let i = 0; i < p.count; i++) { const y = p.getY(i), a = Math.atan2(p.getZ(i), p.getX(i));
      const spike = y > 0.99 ? 0.25 * Math.max(0, Math.sin(a * 9)) + 0.15 * Math.max(0, Math.sin(a * 14 + 1)) : 0; p.setY(i, y + spike); const flare = 1 + 0.35 * y * y; p.setX(i, p.getX(i) * flare); p.setZ(i, p.getZ(i) * flare); }
    crG.computeVertexNormals(); }
  const crown = new THREE.Mesh(crG, sheetM); root.add(crown);
  const jet = new THREE.Mesh(new THREE.CapsuleGeometry(0.09, 1, 6, 16), sheetM); root.add(jet);
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.85, 1, 64), foamM); ring.rotation.x = -Math.PI / 2; ring.position.y = 0.01; root.add(ring);
  const ring2 = new THREE.Mesh(new THREE.RingGeometry(0.9, 1, 64), foamM.clone()); ring2.rotation.x = -Math.PI / 2; ring2.position.y = 0.012; root.add(ring2);
  const P = createPuffs({ max: 80, lit: 0, name: "splashFoam" }); root.add(P.mesh);
  const FP = []; for (let i = 0; i < 50; i++) { const a = r() * Math.PI * 2; FP.push({ a, rr: (0.3 + r() * 0.6) * S, s: (0.3 + 0.4 * r()) * S, seed: r(), fl: flour && i % 2 === 0, up: r() }); }
  const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), P3 = new THREE.Vector3(), SC = new THREE.Vector3(), Gg = 9.8;
  const FOAM = [0.85, 0.92, 0.98], Fl = FX_COLORS.flour;
  function set(k = 0, t = 0) {
    const K = cl(k), T = K * 1.2;
    for (let i = 0; i < drops; i++) { const d = D[i], tt = T - d.t0;
      let s = 0; if (K > 0 && tt > 0) { P3.set(Math.cos(d.a) * d.r0 + d.v.x * tt, d.v.y * tt - 0.5 * Gg * tt * tt, Math.sin(d.a) * d.r0 + d.v.z * tt);
        s = d.s * ss(0, 0.06, tt) * ss(-0.05, 0.08, P3.y) * (tt < 0.2 ? 1 : ss(-0.05, 0.1, P3.y)); }
      const vy = d.v.y - Gg * Math.max(tt, 0); Q.identity(); SC.set(s + 1e-6, (s + 1e-6) * (1 + Math.min(1.2, Math.abs(vy) * 0.12)), s + 1e-6);
      M.compose(s > 0 ? P3 : P3.set(0, -10, 0), Q, SC); dm.setMatrixAt(i, M); }
    dm.instanceMatrix.needsUpdate = true; dm.visible = K > 0;
    const cu = ss(0, 0.35, T) * (1 - ss(0.35, 0.8, T)), crR = (0.35 + 0.6 * ss(0, 0.6, T)) * S;
    crown.visible = cu > 0.003; crown.scale.set(crR, (1.1 * cu + 0.01) * S, crR);
    const ju = ss(0.3, 0.55, T) * (1 - ss(0.65, 1.05, T)); jet.visible = ju > 0.01; jet.scale.set(S * (0.6 + 0.4 * ju), ju * 1.4 * S + 0.01, S * (0.6 + 0.4 * ju)); jet.position.y = jet.scale.y * 0.5 - 0.1 * S;
    const rr = (0.4 + 2.4 * ss(0, 1.2, T)) * S, ra = K > 0 ? ss(0, 0.08, T) * (1 - ss(0.5, 1.2, T)) : 0;
    ring.scale.setScalar(rr); foamM.opacity = 0.75 * ra; ring.visible = ra > 0.003;
    const rr2 = (0.3 + 1.4 * ss(0.15, 1.2, T)) * S, ra2 = K > 0 ? ss(0.15, 0.25, T) * (1 - ss(0.6, 1.2, T)) : 0;
    ring2.scale.setScalar(rr2); ring2.material.opacity = 0.6 * ra2; ring2.visible = ra2 > 0.003;
    P.begin();
    if (K > 0) for (const f of FP) { const a = ss(0, 0.1, T) * (1 - ss(0.6, 1.2, T)) * (f.fl ? 0.85 : 0.6); const g = ss(0, 0.6, T);
      const x = Math.cos(f.a) * f.rr * (0.6 + 0.8 * g), z = Math.sin(f.a) * f.rr * (0.6 + 0.8 * g), y = f.fl ? 0.25 * S + g * (0.4 + f.up * 0.8) * S : 0.08 * S, s = f.s * (0.6 + 0.9 * g);
      const col = f.fl ? Fl : FOAM; P.push(x, y, z, s, s, f.seed * 6, col[0] * 0.75, col[1] * 0.75, col[2] * 0.8, a, SHAPE.puff, f.seed); }
    P.end();
  }
  set(0, 0);
  return finish(root, [P], set);
}
