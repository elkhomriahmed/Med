// Office test entry: the professor's office alone + a capsule figure at the desk chair.
import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { AbsoluteFill, continueRender, delayRender, useCurrentFrame, useVideoConfig } from "remotion";
import { createLook } from "../../look.js";
import { buildOffice } from "../index.js";
import { figure } from "../../apartment/test/AptTest.jsx";

export const OfficeTest = ({ view = "officeWide", time = "evening", board = {}, figures = true, bench = false }) => {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const canvas = useRef(null), ctx = useRef(null);
  const [handle] = useState(() => delayRender("build office", { timeoutInMilliseconds: 240000 }));
  const draw = (f) => { const c = ctx.current; if (!c) return; c.office.update(f / fps, c.camera); c.look.render(); };
  useEffect(() => {
    let alive = true;
    (async () => {
      const renderer = new THREE.WebGLRenderer({ canvas: canvas.current, antialias: false, preserveDrawingBuffer: true, powerPreference: "high-performance" });
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(50, width / height, 0.05, 1000);
      const t0 = performance.now();
      const office = await buildOffice({ time });
      console.log(`[office] build ${(performance.now() - t0).toFixed(0)} ms`);
      scene.add(office.group); office.board.set(board);
      const A = office.anchors;
      if (figures) { const p = figure(0x6a4a3a); p.position.copy(A.deskChair).add(new THREE.Vector3(0, 0.05, 0.1)); p.rotation.y = A.facing.deskChair; scene.add(p); }
      const V = A.views[view];
      camera.fov = V.fov; camera.updateProjectionMatrix(); camera.position.copy(V.pos); camera.lookAt(V.target); camera.updateMatrixWorld();
      const look = createLook(renderer, scene, camera, width, height, { grade: { exposure: 1.4 } });
      await look.ready;
      if (!alive) return;
      ctx.current = { renderer, scene, camera, office, look };
      draw(frame); draw(frame);
      if (bench) {
        const gl = renderer.getContext(); const ms = (fn, n = 20) => { fn(0); gl.finish(); const a = performance.now(); for (let i = 0; i < n; i++) { fn(i); gl.finish(); } return (performance.now() - a) / n; };
        const full = ms((i) => { office.board.set({ graph: 0.5 + (i % 10) * 0.05 }); office.update(i / 30, camera); look.render(); });
        console.log(`[office] full look ${full.toFixed(1)} ms (incl. board redraw) | calls ${renderer.info.render.calls} tris ${renderer.info.render.triangles}`);
        office.board.set(board); draw(frame);
      }
      continueRender(handle);
    })().catch((err) => { console.error(err); throw err; });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => { draw(frame); }, [frame]);
  return <AbsoluteFill style={{ backgroundColor: "#000" }}><canvas ref={canvas} width={width} height={height} style={{ width, height }} /></AbsoluteFill>;
};
