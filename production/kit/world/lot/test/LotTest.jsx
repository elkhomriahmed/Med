// Lot test entry: the lot alone + capsule stand-ins at the anchors (white heads 0.29 R) + a white placeholder car box in the
// hero bay (TEST ONLY: the real car comes from world/car) to check framing.
import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { AbsoluteFill, continueRender, delayRender, useCurrentFrame, useVideoConfig } from "remotion";
import { createLook } from "../../look.js";
import { buildLot } from "../index.js";

function figure(color) {
  const g = new THREE.Group();
  const ink = new THREE.MeshStandardMaterial({ color: 0x1c130f, roughness: 0.5 });
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 0.26, 8, 24), new THREE.MeshStandardMaterial({ color, roughness: 0.8 }));
  body.position.y = 0.92; body.scale.set(1, 1, 0.72); body.castShadow = true; g.add(body);
  for (const s of [-1, 1]) { const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.75, 8), ink); leg.position.set(s * 0.08, 0.375, 0); leg.castShadow = true; g.add(leg); }
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.29, 32, 24), new THREE.MeshStandardMaterial({ color: 0xf7f6f2, roughness: 0.9 }));
  head.position.set(0, 1.33, 0.08); head.castShadow = true; g.add(head);
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 8), ink); nose.position.set(0, 1.33, 0.37); g.add(nose);
  return g;
}
function carStub() {
  const m = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.0, 4.3), new THREE.MeshStandardMaterial({ color: 0xe8edf2, roughness: 0.3, metalness: 0.3 }));
  m.position.y = 0.65; m.castShadow = m.receiveShadow = true;
  const c = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.5, 2.2), new THREE.MeshStandardMaterial({ color: 0x3a4a5c, roughness: 0.1, metalness: 0.6 }));
  c.position.set(0, 1.4, 0.3); c.castShadow = true; const g = new THREE.Group(); g.add(m, c); return g;
}

export const LotTest = ({ view = "lotWide", set = {}, figures = true, car = true, bench = false }) => {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const canvas = useRef(null), ctx = useRef(null);
  const [handle] = useState(() => delayRender("build lot", { timeoutInMilliseconds: 280000 }));
  const draw = (f) => { const c = ctx.current; if (!c) return; c.lot.set({ t: f / fps, ...set }); c.lot.update(f / fps, c.camera); c.look.render(); };
  useEffect(() => {
    let alive = true;
    (async () => {
      const renderer = new THREE.WebGLRenderer({ canvas: canvas.current, antialias: false, preserveDrawingBuffer: true, powerPreference: "high-performance" });
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(50, width / height, 0.05, 3000);
      const t0 = performance.now();
      const lot = await buildLot();
      console.log(`[lot] build ${(performance.now() - t0).toFixed(0)} ms`);
      scene.add(lot.group);
      const A = lot.anchors;
      if (figures) for (const [k, c] of [["driverDoorSpot", 0xd8322a], ["coworkerSpot", 0x5a6f86], ["entrance", 0x2c5f9e], ["stairTop", 0xd8322a], ["stairBottom", 0xd8322a]]) {
        const p = figure(c); p.position.copy(A[k].pos); p.rotation.y = A[k].yaw; scene.add(p); }
      if (car) { const c = carStub(); c.position.copy(A.heroBay.pos); c.rotation.y = A.heroBay.yaw; scene.add(c); }
      const V = A.views[view];
      camera.fov = V.fov; camera.updateProjectionMatrix(); camera.position.copy(V.pos); camera.lookAt(V.target); camera.updateMatrixWorld();
      const look = createLook(renderer, scene, camera, width, height, { hdri: false, grade: { exposure: lot.hint.exposure } });
      lot.makeEnvironment(renderer, scene, lot.hint.envIntensity);
      await look.ready;
      if (!alive) return;
      ctx.current = { renderer, scene, camera, lot, look };
      draw(frame); draw(frame);
      if (bench) {
        const gl = renderer.getContext(); const px = new Uint8Array(4), sync = () => gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
        const ms = (fn, n = 15) => { fn(0); sync(); const a = performance.now(); for (let i = 0; i < n; i++) { fn(i); sync(); } return (performance.now() - a) / n; };
        renderer.setSize(1080, 1920, false); look.setSize(1080, 1920);
        const full = ms((i) => { lot.set({ t: i / 30 }); lot.update(i / 30, camera); look.render(); });
        console.log(`[lot] full look 1080x1920 ${full.toFixed(1)} ms | calls ${renderer.info.render.calls} tris ${renderer.info.render.triangles}`);
        renderer.setSize(width, height, false); look.setSize(width, height); draw(frame);
      }
      continueRender(handle);
    })().catch((err) => { console.error(err); throw err; });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => { draw(frame); }, [frame]);
  return <AbsoluteFill style={{ backgroundColor: "#000" }}><canvas ref={canvas} width={width} height={height} style={{ width, height }} /></AbsoluteFill>;
};
