// Video 4 car + fx_v04 test bench: sunny asphalt + day sky, the hero car, bottle on the driver seat, burn FX, optics stage.
import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { AbsoluteFill, continueRender, delayRender, useCurrentFrame, useVideoConfig } from "remotion";
import { createLook } from "../../look.js";
import { createSky } from "../../sky.js";
import { buildHeroCar, createBottle, toWorld } from "../index.js";
import { loadCarModel, CAR_MODELS } from "../realCar.js";
import { createBurnSpot, createHeatHaze, createOpticsStage } from "../../fx_v04/index.js";

const SUN = new THREE.Vector3(-0.35, 0.85, 0.4).normalize();

function world(scene, renderer) {
  const sky = createSky("day", { sunDir: SUN.toArray(), haze: [0.7, 0.8, 0.92] }); scene.add(sky);
  const g = new THREE.Mesh(new THREE.PlaneGeometry(900, 900), new THREE.MeshStandardMaterial({ color: 0x4a5058, roughness: 0.95 }));
  g.rotation.x = -Math.PI / 2; g.receiveShadow = true; scene.add(g);
  const lineM = new THREE.MeshStandardMaterial({ color: 0xe8ecef, roughness: 0.8 });
  for (const x of [-1.25, 1.25, 3.75, -3.75]) { const l = new THREE.Mesh(new THREE.PlaneGeometry(0.1, 5), lineM); l.rotation.x = -Math.PI / 2; l.position.set(x, 0.003, 0); l.receiveShadow = true; scene.add(l); }
  const key = new THREE.DirectionalLight(0xfff0dc, 3.5); key.position.copy(SUN).multiplyScalar(20); key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048); Object.assign(key.shadow.camera, { left: -6, right: 6, top: 6, bottom: -6, near: 1, far: 50 }); key.shadow.bias = -0.0004; key.shadow.normalBias = 0.02;
  scene.add(key, key.target);
  scene.add(new THREE.HemisphereLight(0xa4c4f0, 0x6a5a48, 1.05));
  // day environment for paint/chrome reflections (from the sky dome itself)
  const es = new THREE.Scene(); es.add(createSky("day", { sunDir: SUN.toArray(), sunCol: [10, 9.6, 9] }));
  const pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromScene(es, 0, 0.1, 500).texture; scene.environmentIntensity = 0.55;
}
function capsule(scene, p, parent = scene) {
  const g = new THREE.Group(); const mat = new THREE.MeshStandardMaterial({ color: 0xc23a2a, roughness: 0.6 });
  const b = new THREE.Mesh(new THREE.CapsuleGeometry(0.17, 0.85, 6, 16), mat); b.position.y = 0.6; const h = new THREE.Mesh(new THREE.SphereGeometry(0.29, 24, 16), new THREE.MeshStandardMaterial({ color: 0xf6f4ee, roughness: 0.7 }));
  h.position.y = 1.41; g.add(b, h); g.traverse((o) => { o.castShadow = o.receiveShadow = true; }); g.position.copy(p); parent.add(g); return g;
}

async function build(scene, renderer, P) {
  const C = {};
  if (P.shot === "optics") {
    const st = createOpticsStage({}); scene.add(st);
    scene.background = new THREE.Color(0x0f1b2e);
    C.view = st.anchors.views[P.view];
    C.post = (cam) => { st.setCamera(cam); st.set(P.k, P.t); };
    return C;
  }
  world(scene, renderer);
  if (P.dbg) globalThis.__DBGPARTS = P.dbg;
  if (P.lineup) { const names = P.names || CAR_MODELS; for (let i = 0; i < names.length; i++) { const m = await loadCarModel(names[i], { length: P.len || 5.0 }); m.position.set((i - (names.length - 1) / 2) * 2.6, 0, 0); scene.add(m); }
    if (P.markers) { const mm = new THREE.MeshBasicMaterial({ color: 0xff2020 }), gm = new THREE.MeshBasicMaterial({ color: 0x20ff20 });
      for (let z = -2.6; z <= 2.61; z += 0.2) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.02, Math.abs(z % 1) < 0.05 ? 2.2 : 1.8, 0.02), Math.abs(z + 0.84) < 0.05 || Math.abs(z - 0.2) < 0.05 ? gm : mm); b.position.set(-1.3, 0.9, z); scene.add(b); }
      for (const y of [0.56, 0.98, 1.42]) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.02, 5.5), gm); b.position.set(-1.3, y, 0); scene.add(b); } }
    C.view = { pos: new THREE.Vector3(...P.cpos), target: new THREE.Vector3(...P.ctarget), fov: P.fov || 40 }; C.post = () => {}; return C; }
  const car = await buildHeroCar({}); car.position.set(0, 0, 0); car.rotation.y = P.yaw || 0; scene.add(car);
  car.set({ door: P.door || 0 });
  const A = car.anchors;
  const bottle = createBottle({}); bottle.position.copy(A.driverSeatTop); car.add(bottle); bottle.set({ rock: P.t });
  const burn = createBurnSpot({ at: A.seatBurnPoint, normal: A.seatNormal, bottle }); car.add(burn);
  const haze = createHeatHaze({}); car.add(haze); haze.set(P.haze || 0, P.t);
  if (P.person) capsule(scene, P.view === "doorOpen" ? new THREE.Vector3(-1.9, 0, 0.15) : A.driverDoorOpenSpot.clone().add(new THREE.Vector3(-0.25, 0, 0.1)), car);
  C.view = P.cpos ? { pos: new THREE.Vector3(...P.cpos), target: new THREE.Vector3(...P.ctarget), fov: P.fov || 50 }
    : P.view === "ext" ? { pos: new THREE.Vector3(-6.2, 2.1, -6.0), target: new THREE.Vector3(0, 0.7, 0), fov: 38 }
    : P.view === "rear" ? { pos: new THREE.Vector3(3.6, 1.6, 4.8), target: new THREE.Vector3(0, 0.7, 0), fov: 38 }
    : toWorld(A.views[P.view], car);
  C.post = (cam) => { burn.setCamera(cam); burn.set(P.k, P.t); };
  return C;
}

export const CarTest = (P) => {
  const frame = useCurrentFrame(); const { width, height, fps } = useVideoConfig();
  const canvas = useRef(null), ctx = useRef(null);
  const [handle] = useState(() => delayRender("build car", { timeoutInMilliseconds: 280000 }));
  useEffect(() => { (async () => {
    const renderer = new THREE.WebGLRenderer({ canvas: canvas.current, antialias: false, preserveDrawingBuffer: true });
    const scene = new THREE.Scene();
    const tt = (P.t ?? 3) + frame / fps; const c = await build(scene, renderer, { ...P, t: tt });
    const V0 = c.view, camera = new THREE.PerspectiveCamera(V0.fov, width / height, 0.02, 600);
    camera.position.copy(V0.pos); camera.lookAt(V0.target); camera.updateMatrixWorld();
    const look = createLook(renderer, scene, camera, width, height, { hdri: false, grade: { exposure: P.shot === "optics" ? 1.3 : 1.0 } }); await look.ready;
    const draw = () => { c.post?.(camera); const t0 = performance.now(); look.render(); renderer.getContext().finish(); return performance.now() - t0; };
    draw(); draw(); const ms = draw(); console.log(`CARTIME ${P.id} ${ms.toFixed(1)} ms`); ctx.current = c; continueRender(handle);
  })().catch((e) => { console.error(e); throw e; }); }, []);
  return <AbsoluteFill style={{ backgroundColor: "#000" }}><canvas ref={canvas} width={width} height={height} style={{ width, height }} /></AbsoluteFill>;
};
