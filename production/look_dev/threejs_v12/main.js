// Style v12 in three.js: the locked lamp-room frame with LIVE real-time lighting (no pre-computed light).
// Surfaces (colour, relief, glow) come from Blender's export; light, shadows, corner shading (N8AO), bloom and tone mapping are live.
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { RectAreaLightUniformsLib } from "three/addons/lights/RectAreaLightUniformsLib.js";
import { EffectComposer, RenderPass, EffectPass, BloomEffect, ToneMappingEffect, ToneMappingMode, VignetteEffect, SMAAEffect,
         BrightnessContrastEffect, HueSaturationEffect } from "postprocessing";
import { N8AOPostPass } from "n8ao";

const P = Object.fromEntries(new URLSearchParams(location.search));
const A = "assets/";
const K_PT = +(P.kpt ?? 0.006), K_SUN = +(P.ksun ?? 0.15), EXPO = +(P.expo ?? 1.0), FACE = +(P.face ?? 1.5), K_FILL = +(P.kfill ?? 10),
  HEMI = +(P.hemi ?? 0.6), SAT = +(P.sat ?? 0.35), TM = P.tm ?? "NEUTRAL";
const b2t = (v) => new THREE.Vector3(v[0], v[2], -v[1]);              // Blender Z-up -> three Y-up

const info = await (await fetch(A + "scene.json")).json();
const SC = +(P.scale ?? 1); const [W, H] = info.camera.res.map((v) => Math.round(v * SC));
console.warn('stage info');
const renderer = new THREE.WebGLRenderer({ antialias: false, preserveDrawingBuffer: true, powerPreference: "high-performance" });
renderer.setSize(W, H); renderer.setPixelRatio(1);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = P.basic ? THREE.BasicShadowMap : THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.NoToneMapping;
document.body.appendChild(renderer.domElement);
const scene = new THREE.Scene();

// camera (Blender: lens/sensor, sensor fits the larger side = height for portrait)
const M = info.camera.matrix, pos = b2t([M[0][3], M[1][3], M[2][3]]);
const fwd = b2t([-M[0][2], -M[1][2], -M[2][2]]), up = b2t([M[0][1], M[1][1], M[2][1]]);
const vfov = 2 * Math.atan(info.camera.sensor / 2 / info.camera.lens) * 180 / Math.PI;
const cam = new THREE.PerspectiveCamera(vfov, W / H, 0.05, 1000);
cam.position.copy(pos); cam.up.copy(up); cam.lookAt(pos.clone().add(fwd));

// textures
const tl0 = new THREE.TextureLoader(), pending = [];
const tl = { load: (url) => { let res; pending.push(new Promise((r) => (res = r))); return tl0.load(url, () => res(), undefined, () => res()); } };
const tex = (f, srgb) => { const t = tl.load(A + f); t.flipY = false; t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.anisotropy = 8; return t; };
const surface = (name) => new THREE.MeshStandardMaterial({ map: tex(`${name}_albedo.png`, true), normalMap: tex(`${name}_normal.png`, false),
  emissiveMap: tex(`${name}_emit.png`, true), emissive: new THREE.Color(1, 1, 1), emissiveIntensity: 16, roughness: 0.75, metalness: 0.0 });

// flat 2D face shader (locked rules C1b/C1c): flat white, side fade away from the light, warm glow toward it,
// face drawing projected from the camera direction, centred (scale 2.15 R), hat wearers dropped 0.10 R
function faceMat(h) {
  const X = b2t(h.X), Y = b2t(h.Y), Z = new THREE.Vector3().crossVectors(X, Y);
  const ft = tl.load(A + h.face); ft.colorSpace = THREE.SRGBColorSpace;
  return new THREE.ShaderMaterial({
    uniforms: { hc: { value: b2t(h.center) }, X: { value: X }, Y: { value: Y }, Z: { value: Z }, R: { value: h.R }, drop: { value: h.drop },
      ls: { value: h.light_side }, face: { value: ft }, k: { value: FACE }, GW: { value: +(P.gw ?? 0.45) } },
    vertexShader: `varying vec3 wp; void main(){ vec4 w = modelMatrix*vec4(position,1.0); wp = w.xyz; gl_Position = projectionMatrix*viewMatrix*w; }`,
    fragmentShader: `uniform vec3 hc,X,Y,Z; uniform float R,drop,ls,k,GW; uniform sampler2D face; varying vec3 wp;
      vec3 lin(vec3 c){ return pow(c, vec3(2.2)); }
      void main(){ vec3 d = wp-hc; float x = dot(d,X), y = dot(d,Y), z = dot(d,Z); float FS = 2.15*R;
        vec2 uv = vec2(x/FS+0.5, y/FS+0.5+drop/FS);
        vec4 f = (uv.x<0.||uv.x>1.||uv.y<0.||uv.y>1.) ? vec4(0.) : texture2D(face, uv);
        f.a *= smoothstep(0.05*R, 0.25*R, z);
        vec3 skin = vec3(0.97,0.965,0.95);
        float sh = smoothstep(-0.25, 1.0, -ls*x/R); vec3 c = mix(skin, vec3(0.48,0.48,0.60), sh);
        float gl = smoothstep(-0.50, 1.0, ls*x/R)*0.85*GW; c = mix(c, vec3(1.0,0.68,0.30), gl);
        c = mix(c, f.rgb, f.a);
        gl_FragColor = vec4(lin(c)*k, 1.0); }`,
  });
}

// inverted-hull outline (camera-only ink line around the characters)
const inkCol = new THREE.Color(0.11, 0.075, 0.06).convertSRGBToLinear();
const hull = (mesh, t) => { const m = new THREE.ShaderMaterial({ side: THREE.BackSide, uniforms: { t: { value: t }, c: { value: inkCol } },
  vertexShader: `uniform float t; void main(){ vec3 p = position + normal*t; gl_Position = projectionMatrix*modelViewMatrix*vec4(p,1.0); }`,
  fragmentShader: `uniform vec3 c; void main(){ gl_FragColor = vec4(c,1.0); }` });
  const o = new THREE.Mesh(mesh.geometry, m); o.position.copy(mesh.position); o.quaternion.copy(mesh.quaternion); o.scale.copy(mesh.scale);
  mesh.parent.add(o); };

console.warn('stage gltf'); const gltf = await new GLTFLoader().loadAsync(A + "scene.glb"); console.warn('stage gltf loaded');
scene.add(gltf.scene);
const heads = Object.fromEntries(info.heads.map((h) => [h.key + "_head", h]));
const meshes = []; gltf.scene.traverse((o) => { if (o.isMesh) meshes.push(o); });
for (const o of meshes) {
  const n = o.name;
  if (n.startsWith("set_in") || n.startsWith("set_out")) { o.material = surface(n.startsWith("set_in") ? "set_in" : "set_out"); o.receiveShadow = true; }
  else if (n.startsWith("chars")) { o.material = surface("chars"); o.castShadow = true; o.receiveShadow = true; hull(o, 0.012); }
  else if (heads[n]) { o.material = faceMat(heads[n]); o.castShadow = true; hull(o, 0.006); }
  else if (n.endsWith("_outline")) { o.material = new THREE.MeshBasicMaterial({ color: inkCol }); }
}

console.warn('MESHES', meshes.map((o) => o.name + ':' + (o.castShadow ? 'C' : '') + (o.receiveShadow ? 'R' : '')).join(' '));
// sky
const sky = new THREE.Mesh(new THREE.SphereGeometry(420, 64, 32), new THREE.MeshBasicMaterial({ map: (() => { const t = tl.load(A + "sky.png");
  t.colorSpace = THREE.SRGBColorSpace; return t; })(), side: THREE.BackSide }));
scene.add(sky);

// lights from the locked scene (Blender watts -> three.js units; K_* tuned against the locked still)
RectAreaLightUniformsLib.init();
for (const L of info.lights) {
  const col = new THREE.Color(...L.color), p = b2t(L.pos), d = b2t(L.dir);
  let l;
  if (L.type === "POINT") { l = new THREE.PointLight(col, L.energy * K_PT * (L.energy < 100 ? +(P.kbounce ?? 8) : 1), 0, 2); l.position.copy(p);
    if (L.energy > 1000) {   // main lamp: point-light shadows fail in software WebGL -> half as an unshadowed point, half as a
      l.intensity *= 0.5;    // shadow-casting spot aimed at the camera side (where the visible floor and character shadows are)
      const sp = new THREE.SpotLight(col, L.energy * K_PT * 0.5 * +(P.kspot ?? 1.15), 0, 1.25, 0.7, 2); sp.position.copy(p);
      sp.target.position.copy(cam.position.clone().setY(0.2)); scene.add(sp.target);
      sp.castShadow = true; sp.shadow.mapSize.set(2048, 2048); sp.shadow.bias = -0.0005; sp.shadow.radius = 4; sp.shadow.camera.near = 0.2; sp.shadow.camera.far = 12; scene.add(sp); } }
  else if (L.type === "SPOT") { l = new THREE.SpotLight(col, L.energy * K_PT * K_FILL, 0, L.spot / 2, L.blend, 2); l.position.copy(p);
    l.target.position.copy(p.clone().add(d)); scene.add(l.target); }
  else if (L.type === "SUN") { l = new THREE.DirectionalLight(col, L.energy * K_SUN); l.position.copy(p.clone().sub(d.clone().multiplyScalar(20)));
    l.target.position.copy(p); scene.add(l.target); }
  else if (L.type === "AREA") { l = new THREE.RectAreaLight(col, L.energy * K_PT * 0.5, L.size, L.size); l.position.copy(p); l.lookAt(p.clone().add(d)); }
  if (l) scene.add(l);
}
if (P.dtest) { const dl = new THREE.DirectionalLight(0xffffff, 3); dl.position.set(0.3, 6, 1.5); dl.castShadow = true;
  dl.shadow.mapSize.set(1024, 1024); Object.assign(dl.shadow.camera, { left: -3, right: 3, top: 3, bottom: -3, near: 0.5, far: 20 }); scene.add(dl); }
scene.add(new THREE.HemisphereLight(0x6a78a8, 0x8a5a30, HEMI));          // faint sky/bounce fill (no light baking)

// post: corner shading (N8AO), bloom on the glowing lens/lantern, filmic tone mapping, saturation, vignette, AA
const composer = new EffectComposer(renderer, { frameBufferType: THREE.HalfFloatType });
composer.addPass(new RenderPass(scene, cam));
const ao = new N8AOPostPass(scene, cam, W, H); ao.configuration.aoRadius = 0.6; ao.configuration.distanceFalloff = 0.4;
ao.configuration.intensity = 2.5; ao.configuration.aoSamples = 16; ao.configuration.denoiseSamples = 8; ao.configuration.halfRes = false;
composer.addPass(ao);
const expo = new BrightnessContrastEffect({ brightness: 0, contrast: 0.08 });
composer.addPass(new EffectPass(cam, new BloomEffect({ intensity: +(P.bloom ?? 1.3), luminanceThreshold: +(P.bth ?? 1.0), luminanceSmoothing: 0.05, mipmapBlur: true }),
  new ToneMappingEffect({ mode: ToneMappingMode[TM] }), new HueSaturationEffect({ saturation: SAT }), expo,
  new VignetteEffect({ offset: 0.3, darkness: +(P.vig ?? 0.6) }), new SMAAEffect()));
renderer.toneMappingExposure = EXPO;
scene.traverse((o) => { if (o.material && o.material.isMeshStandardMaterial) o.material.onBeforeCompile = (s) => {
  s.fragmentShader = s.fragmentShader.replace("#include <opaque_fragment>", `outgoingLight *= ${EXPO.toFixed(3)};\n#include <opaque_fragment>`); }; });

console.warn('stage textures', pending.length); await Promise.all(pending); console.warn('stage textures loaded'); await new Promise((r) => setTimeout(r, 200));
const times = [];
const NR = +(P.n ?? 3); for (let i = 0; i < NR; i++) { console.warn('stage render', i); const t0 = performance.now(); if (P.direct) renderer.render(scene, cam); else composer.render(); { const g = renderer.getContext(); const px = new Uint8Array(4); g.readPixels(0, 0, 1, 1, g.RGBA, g.UNSIGNED_BYTE, px); } times.push(performance.now() - t0); }
window.__done = { ms: times, w: W, h: H };
