// Apartment test entry. Placeholder outside (sky + facades across the street) ONLY here so the window reads; the city agent
// builds the real street.
import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { AbsoluteFill, continueRender, delayRender, useCurrentFrame, useVideoConfig } from "remotion";
import { createLook } from "../../look.js";
import { buildApartment } from "../index.js";

export function figure(color) {
  const g = new THREE.Group();
  const ink = new THREE.MeshStandardMaterial({ color: 0x1c130f, roughness: 0.5 });
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 0.26, 8, 24), new THREE.MeshStandardMaterial({ color, roughness: 0.8 }));
  body.position.y = 0.92; body.scale.set(1, 1, 0.72); body.castShadow = true; g.add(body);
  for (const s of [-1, 1]) { const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.75, 8), ink); leg.position.set(s * 0.08, 0.375, 0); leg.castShadow = true; g.add(leg); }
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.29, 32, 24), new THREE.MeshStandardMaterial({ color: 0xf7f6f2, roughness: 0.9 }));
  head.position.set(0, 1.33, 0.08); head.castShadow = true; g.add(head);
  return g;
}
const SKY = { morning: ["#6a9ae0", "#ffd8a8"], day: ["#4a86e0", "#cfe2f8"], night: ["#04081a", "#1a2450"] };
const EXPO = { morning: 1.35, day: 1.3, night: 1.55 };

export const AptTest = ({ time = "morning", view = "kitchenWide", controls = {}, bench = false }) => {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const canvas = useRef(null), ctx = useRef(null);
  const [handle] = useState(() => delayRender("build apt", { timeoutInMilliseconds: 240000 }));
  const draw = (f) => { const c = ctx.current; if (!c) return; c.apt.update(f / fps, c.camera); c.look.render(); };
  useEffect(() => {
    let alive = true;
    (async () => {
      const renderer = new THREE.WebGLRenderer({ canvas: canvas.current, antialias: false, preserveDrawingBuffer: true, powerPreference: "high-performance" });
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(50, width / height, 0.05, 3000);
      const t0 = performance.now();
      const apt = await buildApartment({ time });
      console.log(`[apt] build ${(performance.now() - t0).toFixed(0)} ms`);
      scene.add(apt.group); apt.set(controls);
      // placeholder outside
      const SK = SKY[time]; const sg = new THREE.SphereGeometry(1400, 32, 16), cz = new THREE.Color(SK[0]), ch = new THREE.Color(SK[1]), ca = [];
      for (let i = 0; i < sg.attributes.position.count; i++) { const y = sg.attributes.position.getY(i) / 1400, c = ch.clone().lerp(cz, Math.min(1, Math.max(0, y) * 2.2) ** 0.7); ca.push(c.r, c.g, c.b); }
      sg.setAttribute("color", new THREE.Float32BufferAttribute(ca, 3));
      scene.add(new THREE.Mesh(sg, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false })));
      const road = new THREE.Mesh(new THREE.PlaneGeometry(200, 40), new THREE.MeshStandardMaterial({ color: 0x3a3a3e, roughness: 0.9 })); road.rotation.x = -Math.PI / 2; road.receiveShadow = true; scene.add(road);
      const fac = new THREE.MeshStandardMaterial({ color: 0xa8583a, roughness: 0.9 }), winM = new THREE.MeshStandardMaterial({ color: 0x223040, emissive: 0xffc070, emissiveIntensity: time === "night" ? 1.2 : 0 });
      for (let i = -3; i <= 3; i++) { const h = 8 + ((i * 37 + 50) % 5); const b = new THREE.Mesh(new THREE.BoxGeometry(9.5, h, 6), fac); b.position.set(i * 10, h / 2, 12); b.castShadow = b.receiveShadow = true; scene.add(b);
        for (let k = 0; k < 3; k++) for (let j = 0; j < 2; j++) { const w = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 1.6), winM); w.position.set(i * 10 - 3 + k * 3, 2.5 + j * 3.2, 8.99); w.rotation.y = Math.PI; scene.add(w); } }
      const sh = new THREE.Shape([new THREE.Vector2(-7, 0), new THREE.Vector2(7, 0), new THREE.Vector2(7, 11), new THREE.Vector2(-7, 11)]);
      sh.holes.push(new THREE.Path([new THREE.Vector2(-0.8, 4.0), new THREE.Vector2(-0.8, 5.9), new THREE.Vector2(0.8, 5.9), new THREE.Vector2(0.8, 4.0)]));
      const fm = new THREE.Mesh(new THREE.ExtrudeGeometry(sh, { depth: 0.1, bevelEnabled: false }), fac); fm.position.z = -8.6; fm.castShadow = fm.receiveShadow = true; scene.add(fm);
      // placeholder figures
      const A = apt.anchors;
      const rob = figure(0xd9a21c); rob.position.copy(A.counterSpot); rob.rotation.y = A.facing.counterSpot + 0.6; scene.add(rob);
      const bud = figure(0x3a6a8a); bud.position.copy(A.couchSeat).add(new THREE.Vector3(0, -0.55, 0)); bud.rotation.y = A.facing.couchSeat; scene.add(bud);
      const V = A.views[view];
      camera.fov = V.fov; camera.updateProjectionMatrix(); camera.position.copy(V.pos); camera.lookAt(V.target); camera.updateMatrixWorld();
      const look = createLook(renderer, scene, camera, width, height, { grade: { exposure: EXPO[time] } });
      await look.ready;
      if (!alive) return;
      ctx.current = { renderer, scene, camera, apt, look };
      draw(frame); draw(frame);
      if (bench) {
        const gl = renderer.getContext(); const ms = (fn, n = 20) => { fn(0); gl.finish(); const a = performance.now(); for (let i = 0; i < n; i++) { fn(i); gl.finish(); } return (performance.now() - a) / n; };
        const full = ms((i) => { apt.update(i / 30, camera); look.render(); });
        console.log(`[apt] full look ${full.toFixed(1)} ms | calls ${renderer.info.render.calls} tris ${renderer.info.render.triangles}`);
        draw(frame);
      }
      continueRender(handle);
    })().catch((err) => { console.error(err); throw err; });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => { draw(frame); }, [frame]);
  return <AbsoluteFill style={{ backgroundColor: "#000" }}><canvas ref={canvas} width={width} height={height} style={{ width, height }} /></AbsoluteFill>;
};
