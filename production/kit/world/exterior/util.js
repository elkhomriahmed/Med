// Exterior helpers: deterministic noise (JS), the shared "snow" shader patch for standard materials, time-of-day presets.
import * as THREE from "three";

const fract = (x) => x - Math.floor(x);
const h3 = (i, j, k) => fract(Math.sin(i * 127.1 + j * 311.7 + k * 74.7) * 43758.5453);
/** Value noise 0..1 (3D, smooth). */
export function vnoise3(x, y, z = 0) {
  const i = Math.floor(x), j = Math.floor(y), k = Math.floor(z), fx = x - i, fy = y - j, fz = z - k;
  const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy), sz = fz * fz * (3 - 2 * fz), L = (a, b, t) => a + (b - a) * t;
  const p = (dz) => L(L(h3(i, j, k + dz), h3(i + 1, j, k + dz), sx), L(h3(i, j + 1, k + dz), h3(i + 1, j + 1, k + dz), sx), sy);
  return L(p(0), p(1), sz);
}
/** fBm 0..1. */
export function fbm3(x, y, z = 0, oct = 4) {
  let s = 0, a = 0.5, f = 1, n = 0;
  for (let o = 0; o < oct; o++) { s += a * vnoise3(x * f + o * 17.1, y * f - o * 9.3, z * f + o * 5.7); n += a; a *= 0.5; f *= 2.03; }
  return s / n;
}
export const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
export const lerp = (a, b, t) => a + (b - a) * t;

/** Shared uniforms every exterior material reads (one switch for the whole world). */
export const U = { snow: { value: 0 } };

/** Snow cover on a MeshStandardMaterial: up-facing surfaces (world normal) turn into soft white snow with patchy edges.
 *  thresh: normal.y where snow starts; the shared U.snow (0..1) fades it in. Flattens the normal map under the snow. */
export function snowify(mat, { thresh = 0.62, k = 1 } = {}) {
  const prev = mat.onBeforeCompile;
  mat.onBeforeCompile = (sh, r) => {
    if (prev) prev(sh, r);
    sh.uniforms.uSnow = U.snow; sh.uniforms.uSnowT = { value: thresh }; sh.uniforms.uSnowK = { value: k };
    sh.vertexShader = sh.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vSnN; varying vec3 vSnP;")
      .replace("#include <project_vertex>", "#include <project_vertex>\n vSnN = normalize(mat3(modelMatrix) * objectNormal); vSnP = (modelMatrix * vec4(transformed, 1.0)).xyz;");
    sh.fragmentShader = sh.fragmentShader
      .replace("#include <common>", `#include <common>
        varying vec3 vSnN; varying vec3 vSnP; uniform float uSnow, uSnowT, uSnowK;
        float snH(vec3 p){ p = fract(p*0.3183099 + 0.1); p *= 17.0; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
        float snN(vec3 x){ vec3 i = floor(x), f = fract(x); f = f*f*(3.0-2.0*f);
          return mix(mix(mix(snH(i), snH(i+vec3(1,0,0)), f.x), mix(snH(i+vec3(0,1,0)), snH(i+vec3(1,1,0)), f.x), f.y),
                     mix(mix(snH(i+vec3(0,0,1)), snH(i+vec3(1,0,1)), f.x), mix(snH(i+vec3(0,1,1)), snH(i+vec3(1,1,1)), f.x), f.y), f.z); }`)
      .replace("#include <color_fragment>", `#include <color_fragment>
        float snPatch = snN(vSnP*1.7)*0.6 + snN(vSnP*6.0)*0.4;
        float sn = uSnow * uSnowK * smoothstep(uSnowT - 0.12, uSnowT + 0.08, normalize(vSnN).y + (snPatch - 0.5)*0.35);
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.86, 0.89, 0.95) * (0.92 + 0.08*snPatch), sn);`)
      .replace("#include <roughnessmap_fragment>", "#include <roughnessmap_fragment>\n roughnessFactor = mix(roughnessFactor, 0.8, sn);")
      .replace("#include <metalnessmap_fragment>", "#include <metalnessmap_fragment>\n metalnessFactor = mix(metalnessFactor, 0.0, sn);")
      .replace("#include <normal_fragment_maps>", "#include <normal_fragment_maps>\n normal = normalize(mix(normal, nonPerturbedNormal, sn*0.85));");
  };
  const key = mat.customProgramCacheKey?.bind(mat);
  mat.customProgramCacheKey = () => (key ? key() : "") + "|snowify";
  return mat;
}

/** Time-of-day presets. sky = exterior sky uniforms, key = moon/sun directional light, hemi = fill. */
export const TIMES = {
  night: {
    sky: { zenith: [0.008, 0.016, 0.085], horizon: [0.045, 0.07, 0.25], haze: [0.15, 0.17, 0.33], hazeW: 0.045, hazeK: 0.85,
      sea: [0.006, 0.016, 0.055], seaH: [0.07, 0.09, 0.22], stars: 1.0, sunCol: [1.6, 1.7, 2.0], sunSize: 0.022, sunGlow: 0.12,
      sunDir: [-0.55, 0.32, -0.77], moon: 1, clouds: 0.25, cloudLit: [0.10, 0.12, 0.25], cloudDark: [0.02, 0.03, 0.09] },
    key: { color: [0.45, 0.58, 1.0], intensity: 1.5 }, hemi: { sky: 0x4a5a9a, ground: 0x1a1a2a, intensity: 0.42 },
    sea: { deep: [0.004, 0.014, 0.045], spec: 1.0, glow: 0.0 }, windows: 2.6, lamps: 1, beams: 1, snow: 0, flakes: 0, flyingGulls: 0,
    hint: { exposure: 1.4, envIntensity: 0.35 } },
  dusk: {
    sky: { zenith: [0.07, 0.08, 0.30], horizon: [0.95, 0.42, 0.22], haze: [1.15, 0.60, 0.32], hazeW: 0.07, hazeK: 0.95,
      sea: [0.025, 0.035, 0.09], seaH: [0.50, 0.26, 0.18], stars: 0.2, sunCol: [18, 8.5, 3], sunSize: 0.03, sunGlow: 0.9,
      sunDir: [0.55, 0.06, 0.83], moon: 0, clouds: 0.45, cloudLit: [1.3, 0.55, 0.30], cloudDark: [0.16, 0.10, 0.22] },
    key: { color: [1.0, 0.55, 0.30], intensity: 2.6 }, hemi: { sky: 0x6a5a9a, ground: 0x3a2418, intensity: 0.6 },
    sea: { deep: [0.012, 0.02, 0.05], spec: 1.6, glow: 0.0 }, windows: 1.8, lamps: 1, beams: 1, snow: 0, flakes: 0, flyingGulls: 0,
    hint: { exposure: 1.3, envIntensity: 0.3 } },
  morning: {
    sky: { zenith: [0.14, 0.30, 0.72], horizon: [0.95, 0.72, 0.52], haze: [1.15, 0.88, 0.66], hazeW: 0.07, hazeK: 0.7,
      sea: [0.03, 0.09, 0.18], seaH: [0.55, 0.50, 0.50], stars: 0, sunCol: [24, 17, 9], sunSize: 0.026, sunGlow: 0.8,
      sunDir: [0.78, 0.16, 0.6], moon: 0, clouds: 0.4, cloudLit: [1.6, 1.25, 0.95], cloudDark: [0.5, 0.5, 0.62] },
    key: { color: [1.0, 0.78, 0.55], intensity: 3.2 }, hemi: { sky: 0x8ab0e0, ground: 0x5a4030, intensity: 0.9 },
    sea: { deep: [0.02, 0.07, 0.13], spec: 1.4, glow: 0.0 }, windows: 0, lamps: 0, beams: 0, snow: 0, flakes: 0, flyingGulls: 1,
    hint: { exposure: 1.1, envIntensity: 0.25 } },
  day: {
    sky: { zenith: [0.10, 0.30, 0.85], horizon: [0.55, 0.72, 0.95], haze: [0.85, 0.88, 0.92], hazeW: 0.06, hazeK: 0.6,
      sea: [0.02, 0.10, 0.22], seaH: [0.30, 0.45, 0.60], stars: 0, sunCol: [30, 28, 24], sunSize: 0.012, sunGlow: 0.5,
      sunDir: [0.42, 0.68, 0.6], moon: 0, clouds: 0.55, cloudLit: [1.7, 1.7, 1.7], cloudDark: [0.62, 0.68, 0.80] },
    key: { color: [1.0, 0.93, 0.82], intensity: 3.4 }, hemi: { sky: 0x9ac0f0, ground: 0x6a5a48, intensity: 1.1 },
    sea: { deep: [0.015, 0.075, 0.15], spec: 1.2, glow: 0.0 }, windows: 0, lamps: 0, beams: 0, snow: 0, flakes: 0, flyingGulls: 1,
    hint: { exposure: 1.0, envIntensity: 0.3 } },
  winter: {      // grey snowy day: soft overcast sun, everything snowed in, flakes falling
    sky: { zenith: [0.32, 0.38, 0.50], horizon: [0.66, 0.70, 0.77], haze: [0.80, 0.82, 0.86], hazeW: 0.09, hazeK: 0.8,
      sea: [0.05, 0.08, 0.12], seaH: [0.45, 0.50, 0.57], stars: 0, sunCol: [3.0, 2.9, 2.7], sunSize: 0.05, sunGlow: 1.0,
      sunDir: [0.35, 0.42, 0.84], moon: 0, clouds: 0.9, cloudLit: [0.95, 0.97, 1.0], cloudDark: [0.50, 0.54, 0.62] },
    key: { color: [0.92, 0.95, 1.0], intensity: 2.0 }, hemi: { sky: 0xb0bcd0, ground: 0x707884, intensity: 1.3 },
    sea: { deep: [0.03, 0.05, 0.08], spec: 0.5, glow: 0.0 }, windows: 1.0, lamps: 0, beams: 0, snow: 1, flakes: 1, flyingGulls: 0,
    hint: { exposure: 1.05, envIntensity: 0.3 } },
};
TIMES.winterNight = { ...TIMES.night, snow: 1, flakes: 1, sky: { ...TIMES.night.sky, clouds: 0.6, stars: 0.5 } };

/** GLSL value noise (2D) used by sea + sky. */
export const GLSL_NOISE = /* glsl */ `
float exH(vec2 p){ p = fract(p*vec2(123.34,456.21)); p += dot(p,p+45.32); return fract(p.x*p.y); }
float exN(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
  return mix(mix(exH(i),exH(i+vec2(1,0)),f.x), mix(exH(i+vec2(0,1)),exH(i+vec2(1,1)),f.x), f.y); }
float exF(vec2 p){ float s=0.0, a=0.5; for(int i=0;i<5;i++){ s+=a*exN(p); p=p*2.03+vec2(17.1,-9.3); a*=0.5; } return s/0.97; }`;
