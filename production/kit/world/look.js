// World kit: the v12 LOCKED "look" in three.js. Renderer setup + post chain:
//   scene (linear HDR) -> N8AO ambient occlusion -> bloom (light sources only) -> grade_v12_LOCKED (exposure, Reinhard white 6,
//   sRGB, saturation 1.30, warm highlights / cool shadows, S-contrast 0.18, vignette 0.28) -> optional DOF -> SMAA.
// Calibration: a pure white unlit/emissive face (linear 1.0) comes out at ~213-218/255 and never blooms (threshold 1.3).
import * as THREE from "three";
import { EffectComposer, RenderPass, EffectPass, Effect, BloomEffect, SMAAEffect, DepthOfFieldEffect, BlendFunction } from "postprocessing";
import { N8AOPostPass } from "n8ao";
import { RGBELoader } from "three/addons/loaders/RGBELoader.js";
import { url } from "../shared/assets.js";

const gradeFrag = /* glsl */ `
uniform float exposure, white, sat, warm, cool, contrast, vig, aspectK;
vec3 toSRGB(vec3 c){ return mix(12.92*c, 1.055*pow(c, vec3(1.0/2.4)) - 0.055, step(0.0031308, c)); }
vec3 toLin(vec3 c){ return mix(c/12.92, pow((c + 0.055)/1.055, vec3(2.4)), step(0.04045, c)); }
void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec3 x = max(inputColor.rgb, 0.0) * exposure;
  x = x * (1.0 + x / (white*white)) / (1.0 + x);                 // Reinhard with white point: soft shoulder, faces never clip
  x = toSRGB(clamp(x, 0.0, 1.0));
  float l = dot(x, vec3(0.2126, 0.7152, 0.0722));
  x = l + (x - l) * sat;
  x += warm * clamp(l - 0.45, 0.0, 1.0) * vec3(1.0, 0.15, -0.6) - cool * clamp(0.42 - l, 0.0, 1.0) * vec3(0.6, 0.05, -0.55);
  x = clamp(x, 0.0, 1.0);
  x = x + contrast * (x - x*x) * (2.0*x - 1.0) * 2.0;             // gentle S-curve around mid grey
  vec2 d = (uv - 0.5) * 2.0; float r = sqrt(d.x*d.x*aspectK + d.y*d.y);
  x *= 1.0 - vig * pow(clamp(r - 0.55, 0.0, 1.0), 1.5);
  outputColor = vec4(toLin(clamp(x, 0.0, 1.0)), inputColor.a);   // back to linear: the composer encodes sRGB on output
}`;

export class GradeEffect extends Effect {
  constructor({ exposure = 1.4, white = 6, sat = 1.3, warm = 0.035, cool = 0.10, contrast = 0.18, vig = 0.28, aspectK = 0.6 } = {}) {
    super("GradeV12", gradeFrag, { uniforms: new Map([["exposure", new THREE.Uniform(exposure)], ["white", new THREE.Uniform(white)],
      ["sat", new THREE.Uniform(sat)], ["warm", new THREE.Uniform(warm)], ["cool", new THREE.Uniform(cool)], ["contrast", new THREE.Uniform(contrast)],
      ["vig", new THREE.Uniform(vig)], ["aspectK", new THREE.Uniform(aspectK)]]) });
  }
  set(k, v) { this.uniforms.get(k).value = v; }
}

/** Sky domes / backgrounds must sit at the FAR PLANE (depth = 1.0): N8AO treats depth 1.0 as "no geometry" and leaves it alone,
 *  but a dome that writes its real depth (e.g. r = 1500 m) gets garbage AO from the poor far-depth precision and comes out
 *  BLACK; a dome bigger than camera.far is also clipped away (black). pinToFarPlane(mesh) rewrites the vertex output to
 *  z = w (depth exactly 1.0, never clipped by far). createLook() applies it automatically every frame to any visible mesh
 *  with userData.sky === true, a name containing "sky", or a BackSide material on geometry with radius >= 200 m. */
const _pinned = new WeakSet();
export function pinToFarPlane(mesh) {
  const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
  for (const m of mats) {
    if (!m || _pinned.has(m)) continue; _pinned.add(m);
    if (m.isShaderMaterial || m.isRawShaderMaterial) {
      if (/\.xyww/.test(m.vertexShader)) continue;                       // already at the far plane (world/sky.js)
      const i = m.vertexShader.lastIndexOf("}");
      m.vertexShader = m.vertexShader.slice(0, i) + "\n  gl_Position.z = gl_Position.w;\n" + m.vertexShader.slice(i);
    } else {
      const prev = m.onBeforeCompile;
      m.onBeforeCompile = (sh, r) => { prev?.call(m, sh, r);
        sh.vertexShader = sh.vertexShader.replace("#include <project_vertex>", "#include <project_vertex>\n  gl_Position.z = gl_Position.w;"); };
      const pk = m.customProgramCacheKey?.bind(m); m.customProgramCacheKey = () => (pk ? pk() : "") + "|farPlane";
    }
    m.depthWrite = false; m.needsUpdate = true;
  }
  mesh.frustumCulled = false; mesh.renderOrder = Math.min(mesh.renderOrder, -10);
}
function isSky(o) {
  if (!o.isMesh) return false;
  if (o.userData.sky === true) return true;
  if (o.userData.sky === false) return false;
  if (/sky/i.test(o.name)) return true;
  const m = Array.isArray(o.material) ? o.material[0] : o.material;
  if (m?.side !== THREE.BackSide) return false;
  const g = o.geometry; if (!g.boundingSphere) g.computeBoundingSphere();
  return g.boundingSphere.radius * Math.max(o.scale.x, o.scale.y, o.scale.z) >= 200;
}

/** Configure the renderer for the kit (call once, before building materials is fine). */
export function setupRenderer(renderer, W, H) {
  renderer.setPixelRatio(1); renderer.setSize(W, H, false);
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.NoToneMapping;
  return renderer;
}

/**
 * createLook(renderer, scene, camera, W, H, opts) -> { composer, render(), setSize(), grade, bloom, ao, dof, ready }
 * opts: { ao: { radius, intensity, falloff, halfRes, samples }, bloom: { intensity, threshold }, grade: {exposure, sat, ...},
 *         pinSky: true (sky domes -> far plane, see pinToFarPlane),
 *         dof: false | { focus (m), range (m), bokeh }, hdri: false | "hdri/moonlit_golf_1k.hdr", envIntensity, smaa }
 */
export function createLook(renderer, scene, camera, W, H, opts = {}) {
  setupRenderer(renderer, W, H);
  const O = { smaa: true, hdri: "hdri/moonlit_golf_1k.hdr", envIntensity: 0.35, ...opts };
  const composer = new EffectComposer(renderer, { frameBufferType: THREE.HalfFloatType });
  composer.addPass(new RenderPass(scene, camera));
  const ao = new N8AOPostPass(scene, camera, W, H);
  Object.assign(ao.configuration, { aoRadius: 0.75, distanceFalloff: 0.45, intensity: 3.2, aoSamples: 16, denoiseSamples: 8, denoiseRadius: 10,
    halfRes: true, depthAwareUpsampling: true, gammaCorrection: false, color: new THREE.Color(0, 0, 0), screenSpaceRadius: false });
  if (O.ao) Object.assign(ao.configuration, { ...(O.ao.radius && { aoRadius: O.ao.radius }), ...(O.ao.intensity && { intensity: O.ao.intensity }),
    ...(O.ao.falloff && { distanceFalloff: O.ao.falloff }), ...(O.ao.halfRes !== undefined && { halfRes: O.ao.halfRes }), ...(O.ao.samples && { aoSamples: O.ao.samples }) });
  if (renderer.capabilities.logarithmicDepthBuffer) ao.configuration.logarithmicDepthBuffer = true;
  if (O.ao !== false) composer.addPass(ao);
  const bloom = new BloomEffect({ intensity: O.bloom?.intensity ?? 1.1, luminanceThreshold: O.bloom?.threshold ?? 1.3, luminanceSmoothing: 0.12,
    mipmapBlur: true, radius: 0.7 });
  const grade = new GradeEffect(O.grade || {});
  const effects = [];
  let dof = null;
  if (O.dof) { dof = new DepthOfFieldEffect(camera, { worldFocusDistance: O.dof.focus ?? 2.0, worldFocusRange: O.dof.range ?? 2.5, bokehScale: O.dof.bokeh ?? 1.6,
    resolutionScale: 0.5 }); effects.push(dof); }
  effects.push(bloom, grade);
  composer.addPass(new EffectPass(camera, ...effects));
  if (O.smaa) composer.addPass(new EffectPass(camera, new SMAAEffect()));

  const _skySeen = new WeakSet();
  let ready = Promise.resolve();
  if (O.hdri) ready = new RGBELoader().loadAsync(url(O.hdri)).then((t) => {
    const pm = new THREE.PMREMGenerator(renderer); const env = pm.fromEquirectangular(t).texture; t.dispose(); pm.dispose();
    scene.environment = env; scene.environmentIntensity = O.envIntensity;
  }).catch((e) => console.warn("HDRI failed", e));

  return {
    composer, ao, bloom, grade, dof, ready,
    render(dt) {
      // N8AO 1.9.4 bug: with halfRes, pixels with no geometry (depth 1.0: sky at the far plane, scene.background, clear colour)
      // get occlusion 0 = pure BLACK. Patch its compositor so "no geometry" means "no occlusion" (re-applied if N8AO rebuilds it).
      const cm = ao.effectCompositerQuad?.material;
      if (cm && !cm.userData.bgFix) { cm.userData.bgFix = true;
        cm.fragmentShader = cm.fragmentShader.replace("texel = vec4(0.0, 0.0, 0.0, 1.0);", "texel = vec4(1.0, 0.5, 0.5, 1.0);"); cm.needsUpdate = true; }
      if (O.pinSky !== false) scene.traverseVisible((o) => { if (o.isMesh && !_skySeen.has(o)) { _skySeen.add(o); if (isSky(o)) pinToFarPlane(o); } });
      composer.render(dt); },
    setSize(w, h) { renderer.setSize(w, h, false); composer.setSize(w, h); },
    /** Focus the DOF on a world point (e.g. the speaking head). */
    focusOn(p) { if (dof) dof.cocMaterial.worldFocusDistance = camera.position.distanceTo(p); },
  };
}
