// City test entry: stub interiors behind the fly-through openings (ONLY here), capsule people at the sidewalk spots.
import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { AbsoluteFill, continueRender, delayRender, useCurrentFrame, useVideoConfig } from "remotion";
import { createLook } from "../../look.js";
import { buildCity } from "../index.js";

function folk(color) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 0.26, 8, 24), new THREE.MeshStandardMaterial({ color, roughness: 0.8 }));
  body.position.y = 0.92; body.scale.set(1, 1, 0.72); body.castShadow = true; g.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.29, 32, 24), new THREE.MeshStandardMaterial({ color: 0xf7f6f2, roughness: 0.9 }));
  head.position.set(0, 1.33, 0.08); head.castShadow = true; g.add(head); return g;
}
function stub(x0, x1, z0, z1, y0, h, col) {      // dark room with a warm back wall so openings read
  const g = new THREE.Group(), m = new THREE.MeshStandardMaterial({ color: col, roughness: 0.9, side: THREE.BackSide, emissive: new THREE.Color(col), emissiveIntensity: 0.25 });
  const b = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, h, Math.abs(z1 - z0)), m); b.position.set((x0 + x1) / 2, y0 + h / 2, (z0 + z1) / 2); g.add(b); return g;
}
export const CityTest = ({ time = "day", view = "streetWide", bench = false }) => {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const canvas = useRef(null), ctx = useRef(null);
  const [handle] = useState(() => delayRender("build city", { timeoutInMilliseconds: 280000 }));
  const draw = (f) => { const c = ctx.current; if (!c) return; c.city.update(f / fps, c.camera); c.look.render(); };
  useEffect(() => {
    let alive = true;
    (async () => {
      const renderer = new THREE.WebGLRenderer({ canvas: canvas.current, antialias: false, preserveDrawingBuffer: true, powerPreference: "high-performance" });
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 3000);
      const t0 = performance.now();
      const city = await buildCity({ time });
      console.log(`[city] build ${(performance.now() - t0).toFixed(0)} ms`);
      scene.add(city.group);
      scene.add(stub(-5, 5, -9.0, -15, 3.6, 3.4, "#d8b890"));
      scene.add(stub(22.3, 33.7, -8.95, -21, 0.0, 4.5, "#8a9ab0"));
      scene.add(stub(-3.9, 7.9, 9.1, 21, 0.0, 6.5, "#e8dcc0"));
      scene.add(stub(14.1, 23.9, 8.95, 19.5, 0.0, 4.2, "#c8d8c0"));
      const cols = [0xd9a21c, 0x3a6a8a, 0xb04a6a, 0x6a8a3a];
      const A = city.anchors; [A.bank1Sidewalk, A.bank2Sidewalk, A.policeSidewalk, A.apartmentSidewalk].forEach((p, i) => { const f = folk(cols[i]); f.position.copy(p); f.rotation.y = p.z > 0 ? Math.PI : 0; scene.add(f); });
      const V = city.anchors.views[view];
      camera.fov = V.fov; camera.updateProjectionMatrix(); camera.position.copy(V.pos); camera.lookAt(V.target); camera.updateMatrixWorld();
      const look = createLook(renderer, scene, camera, width, height, { grade: { exposure: city.hint[time].exposure }, envIntensity: city.hint[time].envIntensity });
      await look.ready;
      if (!alive) return;
      ctx.current = { renderer, scene, camera, city, look };
      draw(frame); draw(frame);
      if (bench) {
        const gl = renderer.getContext(); const px = new Uint8Array(4), sync = () => gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); const ms = (fn, n = 20) => { fn(0); sync(); const a = performance.now(); for (let i = 0; i < n; i++) { fn(i); sync(); } return (performance.now() - a) / n; };
        const full = ms((i) => { city.update(i / 30, camera); look.render(); });
        const raw = ms(() => renderer.render(scene, camera));
        const sw = ms((i) => { city.setTime(i % 2 ? "day" : "night"); city.update(i / 30, camera); look.render(); }, 10);
        console.log(`[city] full look ${full.toFixed(1)} ms | raw ${raw.toFixed(1)} ms | with setTime switching ${sw.toFixed(1)} ms | calls ${renderer.info.render.calls} tris ${renderer.info.render.triangles}`);
        city.setTime(time); draw(frame);
      }
      continueRender(handle);
    })().catch((err) => { console.error(err); throw err; });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => { draw(frame); }, [frame]);
  return <AbsoluteFill style={{ backgroundColor: "#000" }}><canvas ref={canvas} width={width} height={height} style={{ width, height }} /></AbsoluteFill>;
};
