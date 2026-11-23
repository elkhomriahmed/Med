// Video 4 FX kit (water bottle sets the car seat on fire). Agent B, 2026-11-23.
// Every builder returns a THREE.Object3D with a deterministic obj.set(...) (also userData.set): a pure function of its inputs
// (k values + t). No Math.random: variation = seeded rng at build time. Nothing pops: every part grows/fades over >= 2 frames
// when its k ramps over >= 2 frames. Particles reuse the fx_v03 billboard system (createPuffs). Call obj.setCamera(camera)
// once (sorts the smoke back-to-front).
//
//   createBurnSpot({ at, normal, spill, ceiling, bottle })  set({ dot, smoke, scorch, ring, fire, spill, shift }, t)
//   createHeatHaze({ box })                                  set(k, t)
//   createOpticsStage({ origin })                            set({ rays, focus, scorch, melt, foam }, t)   anchors.views {rays,focus,melt}
//   createScorchDecal({ size, seed })                        set({ dot, scorch, ring, foam, dotOff }, t)   (used by both)
import * as THREE from "three";
import { rng } from "../../shared/assets.js";
import { createPuffs, SHAPE, FX_COLORS, vnoise } from "../fx_v03/index.js";
import { createBottle, leatherMaterial } from "../car/index.js";
import { roundedBox, place } from "../geometry.js";
import { plain } from "../materials.js";

const cl = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const ss = (a, b, x) => { const u = cl((x - a) / (b - a)); return u * u * (3 - 2 * u); };
const mix = (a, b, u) => a + (b - a) * u;
const mixC = (a, b, u) => [mix(a[0], b[0], u), mix(a[1], b[1], u), mix(a[2], b[2], u)];
const v3 = (p) => (p?.isVector3 ? p.clone() : new THREE.Vector3(...(p || [0, 0, 0])));
const fract = (x) => x - Math.floor(x);
const AMB_DAY = [0.62, 0.66, 0.74];                       // cool daylight fill on lit smoke (smoke stays cool grey, never brown)
const SMOKE = [0.5, 0.54, 0.6], SMOKE_DK = [0.26, 0.28, 0.32];
const HOT = [6, 5.2, 4.2], ORG = FX_COLORS.fire.map((v) => v * 3.2), RED = [1.4, 0.25, 0.05], GOLD = FX_COLORS.gold;
const heat = (h) => (h > 0.5 ? mixC(ORG, HOT, (h - 0.5) * 2) : mixC(RED, ORG, h * 2));

function finish(root, systems, setFn) {
  root.set = setFn; root.userData.set = setFn;
  root.setCamera = (c) => systems.forEach((s) => s.setCamera?.(c));
  root.setLights = (arr) => systems.forEach((s) => s.setLights?.(arr));
  root.userData.systems = systems;
  return root;
}
/** Orient a group so its local +y follows `normal`. */
function orient(g, at, normal) {
  g.position.copy(v3(at)); g.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), v3(normal || [0, 1, 0]).normalize());
}

// ===================================================================================================== SCORCH DECAL
// One flat disc shader on the surface: the focused light dot (white-hot core -> orange glow), the black char spot with an
// irregular edge + brown singe, the glowing ember ring on its edge, and glowing seat foam in the burnt hole.
const DECAL_VS = /* glsl */ `varying vec2 vP; uniform float uSize; void main(){ vP = (uv - 0.5)*2.0*uSize; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`;
const DECAL_FS = /* glsl */ `
uniform float uR, uRing, uFoam, uDot, uT, uSeed, uDotR; uniform vec2 uDotOff;
varying vec2 vP;
float h21(vec2 p){ p = fract(p*vec2(123.34,456.21)); p += dot(p,p+45.32); return fract(p.x*p.y); }
float n21(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f); return mix(mix(h21(i),h21(i+vec2(1,0)),f.x), mix(h21(i+vec2(0,1)),h21(i+vec2(1,1)),f.x), f.y); }
void main(){
  float d = length(vP), a = atan(vP.y, vP.x);
  float wob = 1.0 + 0.06*sin(a*3.0 + uSeed) + 0.035*sin(a*7.0 - uSeed*2.3) + 0.05*(n21(vec2(a*2.2 + 9.0, uSeed)) - 0.5);
  float r = uR*wob;
  float on = step(0.0002, uR);
  float charM = (1.0 - smoothstep(r*0.78, r, d))*on;
  float singe = (1.0 - smoothstep(r, r*1.7 + 0.004, d))*on;
  float grain = n21(vP*900.0 + uSeed);
  float cr = smoothstep(0.55, 0.62, n21(vP*260.0 + uSeed*3.0))*smoothstep(0.3, 0.7, n21(vP*90.0 - uSeed));   // ash flecks
  vec3 singeC = mix(vec3(0.2, 0.1, 0.045), vec3(0.08, 0.045, 0.025), smoothstep(r*1.7, r*0.9, d));       // toasted brown halo
  vec3 col = mix(singeC, vec3(0.004, 0.0035, 0.0035), charM);
  col += vec3(0.16, 0.155, 0.15)*cr*charM*smoothstep(r*0.95, r*0.4, d);
  col += vec3(0.015)*grain*charM;
  float alpha = max(charM, singe*0.85);
  // foam in the burnt hole (yellow), glowing orange-hot with uFoam
  float hole = (1.0 - smoothstep(r*0.42, r*0.6, d))*on*step(0.001, uFoam);
  float fl = 0.75 + 0.25*sin(uT*6.0 + a*3.0 + grain*4.0);
  vec3 foamC = mix(vec3(0.75, 0.62, 0.3), vec3(0.25, 0.12, 0.04), uFoam*0.6);
  col = mix(col, foamC, hole*smoothstep(0.0, 0.3, uFoam));
  vec3 emis = vec3(5.0, 1.6, 0.25)*hole*uFoam*fl*(0.6 + 0.4*grain);
  // ember ring on the char edge
  float bw = 0.0025 + r*0.12;
  float band = exp(-pow((d - r*0.93)/bw, 2.0))*on;
  float rf = 0.7 + 0.3*sin(uT*7.3 + a*4.0 + uSeed) * (0.6 + 0.4*n21(vec2(a*6.0, uT*2.0)));
  emis += mix(vec3(3.2, 0.7, 0.08), vec3(7.0, 3.4, 0.9), band*band)*band*uRing*rf;
  emis += vec3(1.2, 0.3, 0.04)*singe*(1.0 - charM)*uRing*0.35;                    // faint red heat around it
  // focused light dot: white-hot core + orange glow, drifts with the bottle
  float dd = length(vP - uDotOff);
  float core = exp(-pow(dd/max(uDotR, 1e-4), 2.0)*1.6);
  float glow = exp(-pow(dd/max(uDotR*2.6, 1e-4), 2.0));
  emis += (vec3(9.0, 8.4, 7.4)*core + vec3(2.6, 0.95, 0.18)*glow*0.6)*uDot;
  gl_FragColor = vec4(col*alpha + emis, alpha);
}`;

export function createScorchDecal({ size = 0.08, seed = 3, maxR = 0.03 } = {}) {
  const mat = new THREE.ShaderMaterial({ transparent: true, premultipliedAlpha: true, depthWrite: false,
    polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4,
    uniforms: { uR: { value: 0 }, uRing: { value: 0 }, uFoam: { value: 0 }, uDot: { value: 0 }, uT: { value: 0 }, uSeed: { value: seed * 1.37 },
      uDotR: { value: 0.004 }, uDotOff: { value: new THREE.Vector2() }, uSize: { value: size } },
    vertexShader: DECAL_VS, fragmentShader: DECAL_FS });
  const g = new THREE.PlaneGeometry(size * 2, size * 2); g.rotateX(-Math.PI / 2);
  const m = new THREE.Mesh(g, mat); m.name = "scorchDecal"; m.renderOrder = 4; m.position.y = 0.0012; m.frustumCulled = false;
  const U = mat.uniforms;
  function set({ dot = 0, scorch = 0, ring = 0, foam = 0, dotOff = [0, 0], dotR = 0.004 } = {}, t = 0) {
    U.uDot.value = cl(dot) * 1.0; U.uR.value = maxR * Math.pow(ss(0, 1, scorch), 0.8) + (scorch > 0 ? 0.0015 : 0) * ss(0, 0.05, scorch);
    U.uRing.value = cl(ring); U.uFoam.value = cl(foam); U.uT.value = t; U.uDotR.value = dotR;
    U.uDotOff.value.set(dotOff[0], dotOff[1]);
    m.visible = dot > 0.001 || scorch > 0.001 || ring > 0.001 || foam > 0.001;
  }
  m.set = set; m.userData.set = set; set({}, 0);
  return m;
}

// ======================================================================================================= BURN SPOT
/** Burn FX on the car seat. at = seat surface point (car-local if added to the car), normal = surface normal (seat up).
 *  spill = direction the fire leans out of the open door (default -x = driver door), ceiling = room above the seat (m).
 *  set({ dot, smoke, scorch, ring, fire, spill, shift }, t), all 0..1 except shift (m along z, default = bottle.focusShift).
 *    dot:    focused white-hot dancing spot with glow (stays tiny: ~1 cm core)
 *    smoke:  thin rising thread -> thicker column (cool grey)
 *    scorch: black spot growing to ~6 cm
 *    ring:   glowing orange ember ring on the scorch edge + rising sparks
 *    fire:   flames burst up off the seat (0->0.25 = burst with overshoot, 1 = steady blaze filling the cabin)
 *    spill:  0..1 how much fire/smoke leans out of the open door (tie to the door angle)
 *  userData.light = orange PointLight (dot glow + fire), userData.focus = the dot's current local position. */
export function createBurnSpot({ at = [0, 0, 0], normal = [0, 1, 0], spill = [-1, 0.25, 0.05], ceiling = 0.8, bottle = null, seed = 5, scale = 1 } = {}) {
  const root = new THREE.Group(); root.name = "burnSpot"; orient(root, at, normal);
  const r = rng(seed * 31 + 7), S = scale;
  const decal = createScorchDecal({ size: 0.075 * S, seed, maxR: 0.03 * S }); root.add(decal);
  const GL = createPuffs({ max: 64, additive: true, name: "burnGlow" });
  const F = createPuffs({ max: 260, additive: true, name: "burnFire" });
  const Sm = createPuffs({ max: 180, lit: 1, amb: AMB_DAY, lightGain: 0.25, name: "burnSmoke" });
  root.add(GL.mesh, F.mesh, Sm.mesh);
  const light = new THREE.PointLight(0xff8a2a, 0, 3.5, 2); light.position.set(0, 0.06, 0); root.add(light); root.userData.light = light;
  Sm.setLights([light]);
  const focus = new THREE.Vector3(); root.userData.focus = focus; root.userData.decal = decal; root.userData.bottle = bottle;
  const SP = v3(spill).normalize();
  // thread particles
  const TH = Array.from({ length: 40 }, (_, i) => ({ ph: i / 40 + r() * 0.02, sw: r() * 6.28, s: 0.8 + 0.4 * r(), seed: r() }));
  const BIG = Array.from({ length: 70 }, () => ({ ph: r(), sw: r() * 6.28, s: 0.7 + 0.6 * r(), ox: (r() - 0.5) * 0.2, oz: (r() - 0.5) * 0.2, out: r() < 0.45, seed: r(), rate: 0.35 + 0.2 * r() }));
  const FL = Array.from({ length: 150 }, () => ({ ph: r(), rate: 1.1 + 0.9 * r(), a: r() * 6.28, rr: Math.sqrt(r()), s: 0.7 + 0.6 * r(), out: r() < 0.4, seed: r(), sw: r() * 6.28, hk: 0.6 + 0.6 * r() }));
  const TONG = Array.from({ length: 14 }, () => ({ a: r() * 6.28, rr: Math.sqrt(r()) * 0.8, h: 0.6 + 0.5 * r(), ph: r() * 6.28, seed: r(), w: 0.7 + 0.5 * r() }));
  const EMB = Array.from({ length: 36 }, () => ({ ph: r(), rate: 0.5 + 0.5 * r(), a: r() * 6.28, sw: r() * 6.28, seed: r() }));
  const ceil = ceiling * S;
  function set({ dot = 0, smoke = 0, scorch = 0, ring = 0, fire = 0, spill: sp = 0, shift } = {}, t = 0) {
    const sh = shift ?? (bottle ? bottle.userData.focusShift || 0 : 0);
    // the dot dances: bottle roll shift (z) + a tiny shimmer (air currents)
    const jx = (vnoise(t * 5.3 + seed) * 0.0025 + vnoise(t * 13.1 + seed * 3) * 0.001) * S, jz = (vnoise(t * 4.7 + seed * 2) * 0.0025 + vnoise(t * 11.3 + 7) * 0.001) * S;
    focus.set(jx, 0, sh + jz);
    const D = cl(dot), fl = 0.85 + 0.15 * vnoise(t * 17 + seed);
    const FI = cl(fire), A = ss(0, 0.14, FI), burst = 1 + 0.55 * Math.exp(-Math.pow((FI - 0.16) / 0.07, 2)), SPL = cl(sp);
    decal.set({ dot: D * fl * (1 - 0.7 * A), scorch, ring: cl(ring) * (1 - 0.5 * A), foam: ss(0.6, 1, ring) * 0.25 * (1 - A) + A * 0.8, dotOff: [focus.x, -focus.z], dotR: 0.0042 * S * (0.9 + 0.2 * D) }, t);
    GL.begin(); F.begin(); Sm.begin();
    // --- dot sparkle (tiny lifted billboard: the glint) + soft glow above the surface
    if (D > 0.002) {
      const y = 0.004 * S;
      GL.push(focus.x, y, focus.z, 0.045 * S * D, 0.045 * S * D, t * 0.6, 7, 6.5, 5.5, 0.75 * D * fl, SHAPE.spark, 0.3);
      GL.push(focus.x, y, focus.z, 0.012 * S, 0.012 * S, 0, 8, 7.4, 6.4, 0.9 * D, SHAPE.soft, 0.1);
      GL.push(focus.x, 0.01 * S, focus.z, 0.045 * S, 0.045 * S, 0, ORG[0] * 0.5, ORG[1] * 0.5, ORG[2] * 0.5, 0.14 * D * fl, SHAPE.soft, 0.2);
    }
    // --- ring sparks: small embers popping up from the ring edge
    const RG = cl(ring) * (1 - A);
    if (RG > 0.002) for (const e of EMB) {
      const u = fract(t * e.rate + e.ph), R0 = 0.028 * S * (0.6 + 0.4 * ss(0, 1, scorch));
      const x = Math.cos(e.a) * R0 + Math.sin(t * 2 + e.sw) * 0.004 * S * u, z = Math.sin(e.a) * R0, y = u * 0.09 * S;
      const a = RG * ss(0, 0.1, u) * (1 - ss(0.5, 1, u)) * (e.seed < 0.5 ? 1 : 0.6);
      if (e.seed < 0.55) GL.push(x, y, z, 0.0045 * S, 0.0045 * S, 0, GOLD[0] * 7, GOLD[1] * 5, GOLD[2] * 3, a, SHAPE.soft, e.seed);
    }
    // --- smoke thread: thin at first, thickens; rises, sways; capped by the roof (spreads)
    const SK = cl(smoke) * (1 - 0.6 * A);
    if (SK > 0.002) {
      const Hs = (0.25 + 0.5 * ss(0, 1, SK)) * S;
      for (const p of TH) {
        const u = fract(t * 0.42 + p.ph);
        let y = u * Hs, x = focus.x + (Math.sin(t * 1.6 + u * 7 + p.sw * 0.2) * 0.012 + Math.sin(t * 0.7 + u * 3) * 0.02) * S * u;
        let z = focus.z + Math.sin(t * 1.3 + u * 5) * 0.01 * S * u;
        const sz = (0.01 + u * 0.07 * (0.5 + SK)) * S * p.s;
        x += SP.x * SPL * u * 0.3 * S; z += SP.z * SPL * u * 0.3 * S;
        const a = SK * ss(0, 0.06, u) * (1 - ss(0.45, 1, u)) * (0.35 + 0.25 * SK);
        Sm.push(x, Math.min(y, ceil - sz * 0.3), z, sz, sz * 1.5, p.sw + u, SMOKE[0] * 1.15, SMOKE[1] * 1.15, SMOKE[2] * 1.15, a * (u < 0.35 ? 1.3 : 1), u < 0.35 ? SHAPE.soft : SHAPE.puff, p.seed);
      }
    }
    // --- fire: tongues + rising flame puffs + big dark-grey smoke, spilling out of the open door
    if (A > 0.002) {
      const RA = (0.05 + 0.2 * ss(0, 0.6, FI)) * S, HA = (0.3 + 0.5 * ss(0, 0.5, FI)) * S * burst;
      for (const p of FL) {
        const u = fract(t * p.rate + p.ph), rr = p.rr * RA * (1 - 0.5 * u);
        let x = Math.cos(p.a) * rr + Math.sin(t * 3 + p.sw + u * 4) * 0.03 * S * u, z = Math.sin(p.a) * rr, y = u * HA * p.hk;
        if (p.out) { const o = SPL * u * 1.25 * S; x += SP.x * o; y += SP.y * o * u; z += SP.z * o; }
        let sz = (0.09 + 0.1 * (1 - u)) * S * p.s * (0.6 + 0.6 * A) * (0.85 + 0.3 * burst - 0.15);
        if (y > ceil - sz * 0.35) { const over = y - (ceil - sz * 0.35); y = ceil - sz * 0.35; x += Math.cos(p.a) * over * 1.5; z += Math.sin(p.a) * over * 1.5; sz *= 1.2; }
        const col = heat(1 - u * 1.1), a = A * ss(0, 0.08, u) * (1 - ss(0.55, 1, u)) * 0.55;
        F.push(x, y + sz * 0.25, z, sz, sz, p.sw + t * 1.5, col[0], col[1], col[2], a, SHAPE.fire, p.seed);
      }
      for (const p of TONG) {
        const f = 1 + 0.25 * vnoise(t * 7 + p.ph) + 0.12 * vnoise(t * 13 + p.ph * 2), h = p.h * 0.55 * S * A * burst * f, w = 0.12 * S * p.w * (0.6 + 0.5 * A);
        let x = Math.cos(p.a) * p.rr * RA, z = Math.sin(p.a) * p.rr * RA; const lean = vnoise(t * 2.3 + p.ph) * 0.25 + (SPL * -0.5 * Math.sign(SP.x || 1)) * (p.seed < 0.5 ? 1 : 0.4);
        x += SP.x * SPL * 0.08 * S;
        GL.push(x - Math.sin(lean) * h * 0.4, Math.min(h * 0.45, ceil - h * 0.2), z, w, Math.min(h, ceil), lean, ORG[0] * 1.3, ORG[1] * 1.3, ORG[2] * 1.3, 0.9 * A, SHAPE.flame + SHAPE.CYL, p.seed);
        GL.push(x - Math.sin(lean) * h * 0.3, Math.min(h * 0.32, ceil - h * 0.2), z, w * 0.55, Math.min(h * 0.65, ceil), lean, HOT[0], HOT[1] * 0.9, HOT[2] * 0.6, 0.85 * A, SHAPE.flame + SHAPE.CYL, p.seed);
      }
      for (const e of EMB) {
        const u = fract(t * e.rate * 1.3 + e.ph), x = Math.cos(e.a) * RA * 0.8 + Math.sin(t * 2 + e.sw) * 0.05 * S * u + SP.x * SPL * u * 0.6 * S, z = Math.sin(e.a) * RA * 0.8, y = Math.min(u * ceil * 1.1, ceil);
        GL.push(x, y, z, 0.018 * S, 0.018 * S, 0, GOLD[0] * 6, GOLD[1] * 5, GOLD[2] * 3, A * ss(0, 0.1, u) * (1 - ss(0.6, 1, u)), SHAPE.soft, e.seed);
      }
      for (const p of BIG) {
        const u = fract(t * p.rate + p.ph);
        let x = p.ox * S + Math.sin(t * 0.8 + p.sw) * 0.05 * S, z = p.oz * S, y = (0.25 + u * 0.7) * S;
        const sz = (0.18 + u * 0.45) * S * p.s;
        if (y > ceil - sz * 0.25) { const over = y - (ceil - sz * 0.25); y = ceil - sz * 0.25; x += (p.ox >= 0 ? 1 : -1) * over * 0.8; z += p.oz * over * 4; }
        if (p.out) { const o = SPL * u * 1.4 * S; x += SP.x * o; z += SP.z * o; y += o * 0.6; }   // pours out of the door and rises
        const a = A * ss(0.1, 0.4, FI) * ss(0, 0.12, u) * (1 - ss(0.6, 1, u)) * 0.55, c = mixC(SMOKE_DK, SMOKE, u);
        Sm.push(x, y, z, sz, sz, p.sw + u, c[0], c[1], c[2], a, SHAPE.puff, p.seed);
      }
    }
    GL.end(); F.end(); Sm.end();
    light.position.set(focus.x + SP.x * SPL * 0.15 * S, (0.03 + 0.4 * A) * S, focus.z);
    light.intensity = (D * 0.025 + RG * 0.07 + A * 1.8 * burst * (0.85 + 0.15 * vnoise(t * 9 + seed))) * S * S;
    light.distance = (0.6 + 3 * A) * S; light.visible = light.intensity > 0.005;
  }
  set({}, 0);
  return finish(root, [GL, F, Sm], set);
}

// ======================================================================================================= HEAT HAZE
/** Subtle wavy shimmer inside the closed car (oven feel): faint warm vertical-wave billboards in a box (car-local if added to
 *  the car). set(k 0..1, t). Additive and very low alpha: never hides the seat or the dot. */
export function createHeatHaze({ box = { min: [-0.75, 0.55, -0.6], max: [0.75, 1.35, 1.0] }, count = 14, seed = 9 } = {}) {
  const mn = v3(box.min), mx = v3(box.max), D = mx.clone().sub(mn), r = rng(seed * 13 + 3);
  const root = new THREE.Group(); root.name = "heatHaze";
  const quad = new THREE.PlaneGeometry(1, 1), g = new THREE.InstancedBufferGeometry(); g.index = quad.index;
  g.setAttribute("position", quad.attributes.position); g.setAttribute("uv", quad.attributes.uv);
  const iP = new Float32Array(count * 4), iS = new Float32Array(count * 2);
  for (let i = 0; i < count; i++) { iP.set([mn.x + D.x * r(), mn.y + D.y * (0.3 + 0.5 * r()), mn.z + D.z * r(), r() * 10], i * 4); iS.set([0.35 + 0.35 * r(), (0.4 + 0.4 * r()) * D.y], i * 2); }
  g.setAttribute("iP", new THREE.InstancedBufferAttribute(iP, 4)); g.setAttribute("iS", new THREE.InstancedBufferAttribute(iS, 2)); g.instanceCount = count;
  const mat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    uniforms: { k: { value: 0 }, t: { value: 0 } },
    vertexShader: /* glsl */ `attribute vec4 iP; attribute vec2 iS; varying vec2 vUv; varying float vSeed;
      void main(){ vec3 c = (modelMatrix*vec4(iP.xyz,1.0)).xyz; vec3 up = vec3(0,1,0); vec3 tc = cameraPosition - c; tc.y = 0.0;
        vec3 right = normalize(cross(up, normalize(tc + vec3(1e-4,0,0)))); vec3 p = c + right*position.x*iS.x + up*position.y*iS.y;
        vUv = uv; vSeed = iP.w; gl_Position = projectionMatrix*viewMatrix*vec4(p,1.0); }`,
    fragmentShader: /* glsl */ `uniform float k, t; varying vec2 vUv; varying float vSeed;
      void main(){ float x = vUv.x + 0.05*sin(vUv.y*9.0 - t*2.6 + vSeed) + 0.025*sin(vUv.y*23.0 - t*4.1 + vSeed*2.0);
        float w = pow(0.5 + 0.5*sin(x*31.4 + vSeed), 6.0);
        float env = smoothstep(0.0, 0.25, vUv.x)*smoothstep(1.0, 0.75, vUv.x)*smoothstep(0.0, 0.3, vUv.y)*smoothstep(1.0, 0.6, vUv.y);
        float a = k*env*(0.006 + 0.022*w);
        gl_FragColor = vec4(vec3(1.0, 0.82, 0.58)*a, 1.0); }` });
  const m = new THREE.Mesh(g, mat); m.frustumCulled = false; m.renderOrder = 5; root.add(m);
  function set(k = 0, t = 0) { mat.uniforms.k.value = cl(k); mat.uniforms.t.value = t; m.visible = k > 0.002; }
  set(0, 0);
  return finish(root, [], set);
}

// ===================================================================================================== OPTICS STAGE
/** Macro "why" set at `origin` (default 300,0,300), scaled x5 (bottle r 0.165 m) so the light shafts read: a big bottle on its
 *  side in a strong sun spot on a stitched dark-leather swatch; parallel ray shafts enter the curve and bend to ONE bright point;
 *  a coin beside it for scale; then the leather scorches, a blue plastic chip melts, the foam glows.
 *  set({ rays, focus, scorch, melt, foam }, t) each 0..1. anchors.focus (world), anchors.views { rays, focus, melt } (world).
 *  Own lights only (a warm sun SpotLight + cool fill PointLight, both range-limited to the stage). */
export function createOpticsStage({ origin = [300, 0, 300], seed = 61 } = {}) {
  const O = v3(origin), root = new THREE.Group(); root.name = "opticsStage"; root.position.copy(O);
  const K = 5, Y0 = 0.42;                                       // scale, leather top height
  // --- set: dark cool cyclorama, plinth, leather swatch (stitched pleats), seat edge piping
  const cyc = new THREE.MeshStandardMaterial({ color: new THREE.Color("#1a2a40"), roughness: 0.95 });
  const floor = new THREE.Mesh(new THREE.CircleGeometry(8, 40), cyc); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; root.add(floor);
  const wall = new THREE.Mesh(new THREE.CylinderGeometry(6, 6, 8, 48, 1, true, -Math.PI * 0.5, Math.PI), cyc.clone()); wall.material.side = THREE.BackSide;
  wall.position.set(0, 4, -2.5); root.add(wall);
  const plinth = new THREE.Mesh(roundedBox(3.2, Y0 - 0.12, 2.2, 0.04), plain("#20242b", { roughness: 0.8 })); plinth.position.y = (Y0 - 0.12) / 2; plinth.castShadow = plinth.receiveShadow = true; root.add(plinth);
  const lm = leatherMaterial("#2a2c30"); lm.map = lm.map.clone(); lm.map.repeat.set(2, 1.4); lm.map.wrapS = lm.map.wrapT = THREE.RepeatWrapping; lm.map.needsUpdate = true;
  lm.bumpMap = lm.bumpMap.clone(); lm.bumpMap.repeat.set(2, 1.4); lm.bumpMap.wrapS = lm.bumpMap.wrapT = THREE.RepeatWrapping; lm.bumpMap.needsUpdate = true;
  const sw = new THREE.Mesh(roundedBox(3.0, 0.14, 2.0, 0.06, 3), lm); sw.position.y = Y0 - 0.07; sw.receiveShadow = true; sw.castShadow = true; root.add(sw);
  // swatch top face UVs (RoundedBox maps 0..1 per face): fine; pleats run along z
  // --- the bottle (x5) lying across x, contact at the origin
  const bottle = createBottle({ seed: 7 }); bottle.scale.setScalar(K); bottle.position.set(0, Y0, 0); root.add(bottle);
  const R = 0.033 * K, C = new THREE.Vector3(0, Y0 + R, 0);
  // light direction (travel): from behind-above (+z, high) toward -z, down
  const d = new THREE.Vector3(0, -0.62, -0.78).normalize();
  const F = new THREE.Vector3(0, Y0, -0.42);                                 // focus on the leather, clearly in front of the bottle
  const pv = new THREE.Vector3(0, -d.z, d.y).normalize();                   // perpendicular to d in the y-z plane
  // --- coin beside the point (x5: r 0.06), embossed rim
  const coinM = plain("#c9a35a", { roughness: 0.3, metalness: 0.95, relief: 0.6 });
  const coin = new THREE.Group(); coin.position.set(0.2, Y0, F.z + 0.03); root.add(coin);
  const cp = [[0, 0], [0.06, 0], [0.062, 0.004], [0.062, 0.009], [0.058, 0.011], [0.054, 0.009], [0.012, 0.008], [0, 0.009]];
  const cg = new THREE.LatheGeometry(cp.map(([x, y]) => new THREE.Vector2(x, y)), 48); const cm = new THREE.Mesh(cg, coinM); cm.castShadow = cm.receiveShadow = true; coin.add(cm);
  const star = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.003, 5), coinM); star.position.y = 0.0095; coin.add(star);
  // --- plastic chip (blue, translucent-ish) right next to the focus: melts
  const chipM = new THREE.MeshPhysicalMaterial({ color: new THREE.Color("#2f7fe0"), roughness: 0.25, clearcoat: 0.6, emissive: new THREE.Color("#ff6a1a"), emissiveIntensity: 0, vertexColors: true });
  const chipProf = [[0, 0], [0.047, 0.0], [0.048, 0.01], [0.045, 0.019], [0.035, 0.022], [0, 0.022]].map(([x, y]) => new THREE.Vector2(x, y));
  const chipG = new THREE.LatheGeometry(chipProf, 40); chipG.setAttribute("color", new THREE.Float32BufferAttribute(new Float32Array(chipG.attributes.position.count * 3).fill(1), 3));
  const chip = new THREE.Mesh(chipG, chipM); chip.castShadow = true; const chipC = new THREE.Vector3(-0.072, Y0, F.z - 0.01); chip.position.copy(chipC); root.add(chip);
  const chipBase = Float32Array.from(chipG.attributes.position.array);
  // --- scorch decal at the focus (x5 sizes)
  const decal = createScorchDecal({ size: 0.16, seed: 4, maxR: 0.07 }); decal.position.set(F.x, Y0 + 0.0015, F.z); root.add(decal);
  // --- ray shafts: one merged geometry; attrs: along (0..1), kind (0 = incoming parallel, 1 = bent toward F)
  const rays = [], xs = [-0.1, 0, 0.1], os = [-0.8, -0.55, -0.28, 0, 0.28, 0.55, 0.8];
  for (const x of xs) for (const o of os) {
    const off = o * R, e = C.clone().addScaledVector(pv, off).addScaledVector(d, -Math.sqrt(R * R - off * off)); e.x = x;
    rays.push({ a: e.clone().addScaledVector(d, -3.2), b: e, kind: 0 }, { a: e, b: new THREE.Vector3(F.x, F.y + 0.004, F.z), kind: 1 });
  }
  const pos = [], nor = [], al = [], kd = [], sd = [];
  const tmpG = new THREE.CylinderGeometry(1, 1, 1, 8, 12, true); tmpG.translate(0, 0.5, 0);
  rays.forEach((ry, i) => {
    const L = ry.a.distanceTo(ry.b), dir = ry.b.clone().sub(ry.a).normalize(), q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    const rad = ry.kind ? 0.006 : 0.009, P = tmpG.attributes.position, N = tmpG.attributes.normal, vv = new THREE.Vector3(), nn = new THREE.Vector3();
    const idx = tmpG.index.array;
    for (const j of idx) { const y = P.getY(j);
      vv.set(P.getX(j) * rad * (ry.kind ? 1 - 0.6 * y : 1), y * L, P.getZ(j) * rad * (ry.kind ? 1 - 0.6 * y : 1)).applyQuaternion(q).add(ry.a); nn.set(N.getX(j), 0, N.getZ(j)).applyQuaternion(q);
      pos.push(vv.x, vv.y, vv.z); nor.push(nn.x, nn.y, nn.z); al.push(y); kd.push(ry.kind); sd.push(i * 0.37 % 1); }
  });
  const rg = new THREE.BufferGeometry(); rg.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); rg.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3));
  rg.setAttribute("along", new THREE.Float32BufferAttribute(al, 1)); rg.setAttribute("kind", new THREE.Float32BufferAttribute(kd, 1)); rg.setAttribute("seed", new THREE.Float32BufferAttribute(sd, 1));
  const rayM = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    uniforms: { uIn: { value: 0 }, uOut: { value: 0 }, uT: { value: 0 } },
    vertexShader: /* glsl */ `attribute float along, kind, seed; varying float vA, vK, vS, vF; varying vec3 vW;
      void main(){ vA = along; vK = kind; vS = seed; vec4 w = modelMatrix*vec4(position,1.0); vW = w.xyz;
        vec3 N = normalize(mat3(modelMatrix)*normal); vF = abs(dot(N, normalize(cameraPosition - w.xyz))); gl_Position = projectionMatrix*viewMatrix*w; }`,
    fragmentShader: /* glsl */ `uniform float uIn, uOut, uT; varying float vA, vK, vS, vF; varying vec3 vW;
      void main(){ float rev = vK < 0.5 ? uIn : uOut; float front = rev*1.08;
        float vis = smoothstep(front, front - 0.06, vA);
        float pulse = 0.7 + 0.3*sin(vA*26.0 - uT*9.0 + vS*6.283);
        float soft = pow(vF, 1.4);
        float fadeFar = vK < 0.5 ? smoothstep(0.0, 0.35, vA) : 1.0;
        vec3 c = vK < 0.5 ? vec3(1.3, 1.18, 0.85) : mix(vec3(1.5, 1.2, 0.72), vec3(2.4, 1.3, 0.36), vA);
        float nearC = smoothstep(0.25, 0.7, length(cameraPosition - vW));
        float a = vis*soft*pulse*fadeFar*nearC*(vK < 0.5 ? 0.55 : 0.75*(1.0 - 0.65*smoothstep(0.6, 1.0, vA)));
        gl_FragColor = vec4(c*a, 1.0); }` });
  const rayMesh = new THREE.Mesh(rg, rayM); rayMesh.frustumCulled = false; rayMesh.renderOrder = 8; root.add(rayMesh);
  // --- broad sun shaft (soft volume) behind the rays + dust motes in the beam
  const GL = createPuffs({ max: 120, additive: true, name: "opticsGlow" }); root.add(GL.mesh);
  const Sm = createPuffs({ max: 60, lit: 1, amb: [0.5, 0.55, 0.65], name: "opticsSmoke" }); root.add(Sm.mesh);
  const r = rng(seed * 7 + 3);
  const MOTES = Array.from({ length: 40 }, () => ({ s: r(), o: (r() - 0.5) * 2, x: (r() - 0.5) * 0.9, ph: r() * 6.28, seed: r() }));
  const BUB = Array.from({ length: 10 }, () => ({ a: r() * 6.28, rr: Math.sqrt(r()) * 0.03, ph: r(), rate: 0.8 + 0.6 * r(), seed: r() }));
  const WISP = Array.from({ length: 24 }, (_, i) => ({ ph: i / 24, sw: r() * 6.28, seed: r() }));
  // --- lights (range-limited so they never reach the parking lot)
  const sun = new THREE.SpotLight(0xfff6ec, 5, 9, 0.42, 0.55, 0); sun.position.copy(C).addScaledVector(d, -6); sun.target.position.copy(C); root.add(sun, sun.target);
  sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024); sun.shadow.bias = -0.002; sun.shadow.normalBias = 0.02; sun.shadow.camera.near = 2; sun.shadow.camera.far = 9;
  const fill = new THREE.PointLight(0x6f9ad8, 2.2, 7, 1); fill.position.set(-1.8, 2.2, -2.5); root.add(fill);
  const hot = new THREE.PointLight(0xff8a2a, 0, 1.2, 2); hot.position.set(F.x, Y0 + 0.16, F.z); root.add(hot);
  const W = (x, y, z) => new THREE.Vector3(x, y, z).add(O);
  root.userData.anchors = root.anchors = {
    focus: W(F.x, F.y, F.z), bottleCenter: W(C.x, C.y, C.z), coin: W(coin.position.x, Y0, coin.position.z), chip: W(chipC.x, Y0, chipC.z),
    views: {
      rays: { pos: W(1.75, 1.05, -1.75), target: W(0, Y0 + 0.2, -0.22), fov: 40 },
      focus: { pos: W(0.75, 0.85, -1.2), target: W(F.x + 0.03, Y0 + 0.03, F.z), fov: 30 },
      melt: { pos: W(-0.85, 0.7, -0.95), target: W(-0.05, Y0 + 0.02, F.z), fov: 26 },
    },
  };
  root.userData.bottle = bottle; root.userData.decal = decal;
  const SMK = [0.55, 0.58, 0.64], tmp = new THREE.Vector3();
  const chipCol = chipG.attributes.color, blue = new THREE.Color("#ffffff"), burnt = new THREE.Color("#2a1c18"), cc = new THREE.Color();
  function set({ rays: kr = 0, focus: kf = 0, scorch: ks = 0, melt: km = 0, foam: kfo = 0 } = {}, t = 0) {
    const KR = cl(kr), KF = cl(kf), KS = cl(ks), KM = cl(km), KO = cl(kfo);
    rayM.uniforms.uIn.value = ss(0, 1, KR); rayM.uniforms.uOut.value = ss(0, 1, KF); rayM.uniforms.uT.value = t; rayMesh.visible = KR > 0.002;
    bottle.set({ rock: 0, amp: 0 });
    const hotK = ss(0.6, 1, KF), fl = 0.88 + 0.12 * vnoise(t * 15 + 3);
    decal.set({ dot: hotK * fl, scorch: KS, ring: ss(0.2, 0.8, KS) * (1 - 0.4 * KO), foam: KO, dotR: 0.012 * (1 - 0.35 * KF) + 0.004 }, t);
    GL.begin(); Sm.begin();
    if (hotK > 0.002) {
      GL.push(F.x, Y0 + 0.012, F.z, 0.11 * hotK, 0.11 * hotK, t * 0.5, 8, 7, 5.6, 0.8 * hotK * fl, SHAPE.spark, 0.5);
      GL.push(F.x, Y0 + 0.02, F.z, 0.22, 0.22, 0, ORG[0] * 0.4, ORG[1] * 0.4, ORG[2] * 0.4, 0.35 * hotK, SHAPE.soft, 0.3);
    }
    if (KR > 0.002) for (const m of MOTES) {        // dust motes drifting in the beam above the bottle
      const s = fract(m.s + t * 0.03), p = C.clone().addScaledVector(d, -0.4 - s * 2.2).addScaledVector(pv, m.o * 0.25); p.x = m.x + Math.sin(t * 0.4 + m.ph) * 0.03;
      GL.push(p.x, p.y, p.z, 0.008, 0.008, 0, 1.2, 1.1, 0.9, KR * 0.15 * ss(0, 0.2, s) * (1 - ss(0.8, 1, s)), SHAPE.soft, m.seed);
    }
    // smoke wisp off the scorch + melting chip
    const SKK = Math.max(ss(0.15, 0.6, KS), KM * 0.8, KO);
    if (SKK > 0.002) for (const p of WISP) {
      const u = fract(t * 0.35 + p.ph), sz = 0.03 + u * 0.22;
      Sm.push(F.x - 0.02 + Math.sin(t * 1.2 + u * 6 + p.sw * 0.3) * 0.04 * u, Y0 + 0.03 + u * 0.9, F.z - u * 0.08, sz, sz * 1.5, p.sw + u, SMK[0], SMK[1], SMK[2], SKK * ss(0, 0.08, u) * (1 - ss(0.45, 1, u)) * 0.6, SHAPE.soft, p.seed);
    }
    // melt: the chip slumps toward the focus, spreads, darkens; bubbles pop on top; orange glow at the hot edge
    const Pp = chipG.attributes.position, mE = ss(0, 1, KM);
    for (let i = 0; i < Pp.count; i++) {
      const x = chipBase[i * 3], y = chipBase[i * 3 + 1], z = chipBase[i * 3 + 2];
      const toF = cl(1 - (Math.hypot(x - (F.x - chipC.x), z - (F.z - chipC.z)) / 0.1)), sl = mE * (0.35 + 0.65 * toF);
      const wob = 1 + 0.08 * mE * Math.sin(Math.atan2(z, x) * 5 + 1.3);
      Pp.setXYZ(i, (x * (1 + 0.45 * sl) + (F.x - chipC.x) * 0.3 * sl * (y / 0.022)) * wob, y * (1 - 0.72 * sl), z * (1 + 0.45 * sl) * wob);
      cc.copy(blue).lerp(burnt, ss(0.4, 1, sl) * toF * 0.85); chipCol.setXYZ(i, cc.r, cc.g, cc.b);
    }
    Pp.needsUpdate = true; chipCol.needsUpdate = true; chipG.computeVertexNormals();
    chipM.emissiveIntensity = 0.18 * mE * (0.85 + 0.15 * vnoise(t * 8));
    if (mE > 0.05) for (const b of BUB) {
      const u = fract(t * b.rate + b.ph), sz = 0.006 + 0.012 * u, a = mE * ss(0, 0.2, u) * (1 - ss(0.85, 1, u));
      GL.push(chipC.x + Math.cos(b.a) * b.rr - 0.01, Y0 + 0.022 * (1 - 0.6 * mE) + 0.003, chipC.z + Math.sin(b.a) * b.rr, sz, sz, 0, 0.9, 1.1, 1.4, a * 0.5, SHAPE.halo, b.seed);
    }
    GL.end(); Sm.end();
    hot.intensity = (hotK * 0.15 + ss(0.2, 0.8, KS) * 0.12 + KO * 0.3 + mE * 0.12) * fl; hot.visible = hot.intensity > 0.01;
  }
  set({}, 0);
  return finish(root, [GL, Sm, ...(bottle.userData.systems || [])], set);
}
