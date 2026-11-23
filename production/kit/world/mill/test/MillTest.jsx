// Mill test entry: the mill alone + capsule stand-ins at the anchors (white heads 0.29 R) to check framing.
import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { AbsoluteFill, continueRender, delayRender, useCurrentFrame, useVideoConfig } from "remotion";
import { createLook } from "../../look.js";
import { buildMill } from "../index.js";

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

export const MillTest = ({ view = "groundWide", time = "night", set = {}, figures = true, bench = false }) => {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const canvas = useRef(null), ctx = useRef(null);
  const [handle] = useState(() => delayRender("build mill", { timeoutInMilliseconds: 280000 }));
  const draw = (f) => { const c = ctx.current; if (!c) return; c.mill.update(f / fps, c.camera); c.look.render(); };
  useEffect(() => {
    let alive = true;
    (async () => {
      const renderer = new THREE.WebGLRenderer({ canvas: canvas.current, antialias: false, preserveDrawingBuffer: true, powerPreference: "high-performance" });
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(50, width / height, 0.05, 1000);
      const t0 = performance.now();
      const mill = await buildMill({ time });
      console.log(`[mill] build ${(performance.now() - t0).toFixed(0)} ms`);
      scene.add(mill.group);
      const hint = mill.setTime(time); mill.set(set);
      const A = mill.anchors;
      if (figures) for (const [k, c] of [["foremanSpot", 0x2c5f73], ["newGuyGround", 0xd8322a], ["coworkerSpot", 0x5a5f66], ["topSpot", 0xd8322a], ["stairBottom", 0x3a5a7a]]) {
        const p = figure(c); p.position.copy(A[k].pos); p.rotation.y = A[k].yaw; scene.add(p); }
      const V = A.views[view];
      camera.fov = V.fov; camera.updateProjectionMatrix(); camera.position.copy(V.pos); camera.lookAt(V.target); camera.updateMatrixWorld();
      const look = createLook(renderer, scene, camera, width, height, { grade: { exposure: hint.exposure } });
      await look.ready;
      if (!alive) return;
      ctx.current = { renderer, scene, camera, mill, look };
      draw(frame); draw(frame);
      if (bench) {
        const gl = renderer.getContext(); const ms = (fn, n = 20) => { fn(0); gl.finish(); const a = performance.now(); for (let i = 0; i < n; i++) { fn(i); gl.finish(); } return (performance.now() - a) / n; };
        renderer.setSize(1080, 1920, false); look.setSize(1080, 1920);
        const full = ms((i) => { mill.set({ shake: 1, t: i / 30 }); mill.update(i / 30, camera); look.render(); });
        console.log(`[mill] full look 1080x1920 ${full.toFixed(1)} ms | calls ${renderer.info.render.calls} tris ${renderer.info.render.triangles}`);
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
