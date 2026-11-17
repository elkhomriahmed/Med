// Shared helpers for every kit module (read-only for agents; ask the integrator to change).
import * as THREE from "three";
import { staticFile } from "remotion";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

export const INK_SRGB = [0.11, 0.075, 0.06];                       // locked C3 warm dark brown ink
export const INK = new THREE.Color().setRGB(...INK_SRGB, THREE.SRGBColorSpace);
export const SKIN = [0.97, 0.965, 0.95];                           // locked C1 face white
export const url = (p) => staticFile(p.replace(/^\//, ""));        // "faces/x.png" -> served from kit/public

export const rng = (seed) => () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;

const texLoader = new THREE.TextureLoader();
export async function loadTex(path, { srgb = true, repeat = null, anisotropy = 8 } = {}) {
  const t = await texLoader.loadAsync(url(path));
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace; t.anisotropy = anisotropy;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...repeat); }
  return t;
}

// Poly Haven / ambientCG texture set saved as public/tex/<name>_{diff,nor_gl,rough}_<res>.jpg
export async function loadPBR(name, repeat = [1, 1], res = "2k") {
  const [map, normalMap, roughnessMap] = await Promise.all([
    loadTex(`tex/${name}_diff_${res}.jpg`, { repeat }), loadTex(`tex/${name}_nor_gl_${res}.jpg`, { srgb: false, repeat }),
    loadTex(`tex/${name}_rough_${res}.jpg`, { srgb: false, repeat })]);
  return { map, normalMap, roughnessMap };
}

const gltfLoader = new GLTFLoader();
export const loadGLTF = (path) => gltfLoader.loadAsync(url(path));
