// fx_v03 test bench: a dark cool room box (or outdoor ground / river) + a 1.7 m stand-in capsule for scale.
import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { AbsoluteFill, continueRender, delayRender, useCurrentFrame, useVideoConfig } from "remotion";
import { createLook } from "../../look.js";
import * as FX from "../index.js";

const V = (x, y, z) => new THREE.Vector3(x, y, z);
function room(scene) {
  const m = new THREE.MeshStandardMaterial({ color: 0x2a3446, roughness: 0.9, side: THREE.BackSide });
  const box = new THREE.Mesh(new THREE.BoxGeometry(8, 3.6, 8), m); box.position.y = 1.8; box.receiveShadow = true; scene.add(box);
  const f = new THREE.Mesh(new THREE.PlaneGeometry(8, 8), new THREE.MeshStandardMaterial({ color: 0x3b3631, roughness: 0.85 })); f.rotation.x = -Math.PI / 2; f.position.y = 0.002; f.receiveShadow = true; scene.add(f);
}
function capsule(scene, x, z, y = 0) {
  const g = new THREE.Group(); const mat = new THREE.MeshStandardMaterial({ color: 0x5a6f8a, roughness: 0.6 });
  const b = new THREE.Mesh(new THREE.CapsuleGeometry(0.17, 0.85, 6, 16), mat); b.position.y = 0.6; const h = new THREE.Mesh(new THREE.SphereGeometry(0.29, 24, 16), new THREE.MeshStandardMaterial({ color: 0xf6f4ee, roughness: 0.7 }));
  h.position.y = 1.41; g.add(b, h); g.traverse((o) => { o.castShadow = o.receiveShadow = true; }); g.position.set(x, y, z); scene.add(g); return g;
}
function moon(scene, k = 1) {
  const d = new THREE.DirectionalLight(0x9fb8ff, 0.5 * k); d.position.set(-3, 6, 4); scene.add(d);
  scene.add(new THREE.HemisphereLight(0x3a5a7a, 0x0f1b2e, 0.35 * k));
}

function build(scene, shot, P) {
  const C = { fx: [] }; const add = (o, fn) => { scene.add(o); C.fx.push({ o, fn }); return o; };
  if (shot === "candle" || shot === "fireball" || shot === "dust") {
    room(scene); moon(scene, 0.6);
    const crate = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.0, 0.5), new THREE.MeshStandardMaterial({ color: 0x4a4540, roughness: 0.85 })); crate.position.set(0.25, 0.5, 0); crate.castShadow = crate.receiveShadow = true; scene.add(crate);
    capsule(scene, -0.45, -0.2);
    const candle = FX.createCandle({}); candle.position.set(0.2, 1.0, 0.05); add(candle, (k, t) => candle.set(1, t));
    const L = [candle.userData.light];
    const beamM = new THREE.MeshStandardMaterial({ color: 0x4a4540, roughness: 0.8 });
    for (const z of [-1.2, 0.6]) { const b = new THREE.Mesh(new THREE.BoxGeometry(7, 0.25, 0.25), beamM); b.position.set(0, 3.2, z); b.castShadow = true; scene.add(b); }
    if (shot === "candle") {
      add(FX.createFlourHaze({ box: { min: [-2, 0.3, -2], max: [2, 3.2, 1.2] }, count: 900, lights: L }), (k, t) => 0).set(1, P.t);
      const sp = FX.createSparkSwirl({ center: V(0.2, 1.17, 0.05), radius: 0.32 }); add(sp, null); sp.set(P.k, P.t);
    }
    if (shot === "fireball") {
      const fb = FX.createFireball({ path: [V(-3, 3.0, -0.3), V(-1, 3.05, 0), V(1, 3.0, -0.2), V(3, 3.05, 0)] }); add(fb, null); fb.set(P.k, P.t);
      add(FX.createFlourHaze({ box: { min: [-2, 0.3, -2], max: [2, 3.2, 1.2] }, count: 600, lights: [...L, fb.userData.light] }), null).set(0.7, P.t);
    }
    if (shot === "dust") {
      const dc = FX.createDustCascade({ segments: [[[-3, 3.07, -1.2], [3, 3.07, -1.2]], [[-3, 3.07, 0.6], [3, 3.07, 0.6]]], fallTo: 0, lights: L }); add(dc, null);
      const wo = FX.createWhiteout({ box: { min: [-3.5, 0.2, -3.5], max: [3.5, 3.4, 1.0] }, lights: L }); add(wo, null);
      C.post = (cam) => { dc.setCamera(cam); wo.setCamera(cam); dc.set(P.k, P.t); wo.set(P.k2 ?? 0.35, P.t); };
    }
  }
  if (shot === "science") {
    const st = FX.createScienceStage(); scene.add(st); C.view = st.anchors.views[P.view];
    C.post = (cam) => { st.setCamera(cam); st.set({ pile: P.view === "pile" ? P.k : 0, puff: P.view === "puff" ? P.k : 0, chain: P.view === "chain" ? P.k : 0 }, P.t); };
    scene.add(new THREE.HemisphereLight(0x3a5a7a, 0x0f1b2e, 0.2));
  }
  if (shot === "explosion") {
    scene.background = new THREE.Color(0x0f1b2e); moon(scene, 1);
    const g = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.MeshStandardMaterial({ color: 0x1f2a36, roughness: 0.95 })); g.rotation.x = -Math.PI / 2; g.receiveShadow = true; scene.add(g);
    const mill = new THREE.Mesh(new THREE.BoxGeometry(10, 5.6, 8), new THREE.MeshStandardMaterial({ color: 0x3b3a3c, roughness: 0.9 })); mill.position.set(0, 2.8, 0); mill.castShadow = mill.receiveShadow = true; scene.add(mill);
    capsule(scene, 6, 9);
    const ex = FX.createExplosion({ center: V(0, 6, 0), scale: 1, groundY: 0 }); scene.add(ex);
    C.post = (cam) => { ex.setCamera(cam); ex.set(P.k, P.t); };
  }
  if (shot === "splash") {
    scene.background = new THREE.Color(0x0f1b2e); moon(scene, 1.4);
    const w = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), new THREE.MeshStandardMaterial({ color: 0x1f4a5a, roughness: 0.15, metalness: 0.3 })); w.rotation.x = -Math.PI / 2; w.position.y = -1.2; scene.add(w);
    capsule(scene, -1.6, -0.5, -1.2 + 0.0);
    const sp = FX.createSplash({ at: V(0, -1.2, 0) }); scene.add(sp); C.post = (cam) => { sp.setCamera(cam); sp.set(P.k, P.t); };
  }
  return C;
}

const CAMS = {
  candle: { p: [0.5, 1.5, 2.4], t: [0.0, 1.2, 0], fov: 50 },
  fireball: { p: [0.3, 1.1, 3.2], t: [0, 2.2, -0.3], fov: 62 },
  dust: { p: [0.4, 1.4, 3.3], t: [0, 1.6, -0.5], fov: 62 },
  explosion: { p: [3, 4, 32], t: [0, 7, 0], fov: 55 },
  splash: { p: [0.5, 0.2, 6.2], t: [0, -0.4, 0], fov: 45 },
};

export const FxTest = ({ shot = "candle", k = 0.5, t = 3, view = "chain", k2 }) => {
  const frame = useCurrentFrame(); const { width, height, fps } = useVideoConfig();
  const canvas = useRef(null), ctx = useRef(null);
  const [handle] = useState(() => delayRender("build fx", { timeoutInMilliseconds: 280000 }));
  const draw = () => { const c = ctx.current; if (!c) return; c.post?.(c.camera); const t0 = performance.now(); c.look.render(); c.renderer.getContext().finish(); c.ms = performance.now() - t0; };
  useEffect(() => { (async () => {
    const renderer = new THREE.WebGLRenderer({ canvas: canvas.current, antialias: false, preserveDrawingBuffer: true });
    const scene = new THREE.Scene();
    const tt = t + frame / fps; const c = build(scene, shot, { k, t: tt, view, k2 });
    const V0 = c.view, CC = CAMS[shot];
    const camera = new THREE.PerspectiveCamera(V0 ? V0.fov : CC.fov, width / height, 0.02, 400);
    if (V0) { camera.position.copy(V0.pos); camera.lookAt(V0.target); } else { camera.position.set(...CC.p); camera.lookAt(...CC.t); }
    camera.updateMatrixWorld();
    Object.assign(c, { renderer, scene, camera });
    c.look = createLook(renderer, scene, camera, width, height, {}); await c.look.ready;
    ctx.current = c; draw(); draw(); draw(); console.log(`FXTIME ${shot} ${c.ms.toFixed(1)} ms`); continueRender(handle);
  })().catch((e) => { console.error(e); throw e; }); }, []);
  return <AbsoluteFill style={{ backgroundColor: "#000" }}><canvas ref={canvas} width={width} height={height} style={{ width, height }} /></AbsoluteFill>;
};
