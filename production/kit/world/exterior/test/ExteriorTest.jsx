// Exterior test: the exterior + the real lamp room at the origin (its own sky, tower stub, moon and hemi removed here, test only).
import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { AbsoluteFill, continueRender, delayRender, useCurrentFrame, useVideoConfig } from "remotion";
import { buildLampRoom, createLook } from "../../index.js";
import { buildExterior } from "../index.js";

const SHOTS = {
  nightWide: { time: "night", cam: (a) => a.seaWide, set: (e) => { e.controls.swerve = 0.55; } },
  duskJetty: { time: "dusk", cam: () => ({ position: [-0.7, -31.55, 21.2], target: [2.4, -33.0, 26.6], fov: 55 }), set: (e) => { e.controls.rowboat = 0.86; e.focusShadow(new THREE.Vector3(0.5, -33, 24), 9); } },
  dayJetty: { time: "day", cam: () => ({ position: [0.95, -31.65, 29.6], target: [-2.1, -32.55, 26.4], fov: 55 }), set: (e) => { e.focusShadow(new THREE.Vector3(-1, -33, 26), 9); } },
  winterGulls: { time: "winter", cam: () => ({ position: [3.3, 1.75, 6.1], target: [0.0, 1.35, 3.75], fov: 42 }), set: (e) => { e.focusShadow(new THREE.Vector3(0, 1, 3), 5); } },
  towardTown: { time: "day", cam: () => ({ position: [1.5, 3.6, 7.5], target: [30, -31, 230], fov: 60 }), set: () => {} },
  windowView: { time: "night", cam: (a) => a.towerWindowView, set: (e) => { e.focusShadow(new THREE.Vector3(0, 0, 0), 6); } },
};
const v = (x) => (Array.isArray(x) ? new THREE.Vector3(...x) : x);

export const ExteriorTest = ({ shot = "nightWide", bench = false }) => {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const canvas = useRef(null), ctx = useRef(null), label = useRef(null);
  const [handle] = useState(() => delayRender("build exterior", { timeoutInMilliseconds: 120000 }));
  const draw = (f) => { const c = ctx.current; if (!c) return; const t = f / fps;
    c.ext.update(t, c.camera); c.room.update(t, c.camera); c.look.render(); };
  useEffect(() => {
    let alive = true;
    (async () => {
      const S = SHOTS[shot];
      const renderer = new THREE.WebGLRenderer({ canvas: canvas.current, antialias: false, preserveDrawingBuffer: true, powerPreference: "high-performance" });
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(50, width / height, 0.2, 4000);
      const t0 = performance.now();
      const ext = await buildExterior({ time: S.time });
      ext.setHeight(height);
      scene.add(ext.group);
      const room = await buildLampRoom();
      room.group.traverse((o) => { if (o.name === "sky") o.visible = false; if (o.isMesh && o.geometry?.parameters?.height === 30) o.visible = false; });
      room.lights.moon.visible = false; room.lights.hemi.visible = false;
      room.beams.beams.forEach((b) => (b.cone.visible = false));
      scene.add(room.group);
      const buildMs = performance.now() - t0;
      const C = S.cam(ext.anchors); camera.fov = C.fov; camera.position.copy(v(C.position)); camera.lookAt(v(C.target)); camera.updateProjectionMatrix(); camera.updateMatrixWorld();
      S.set(ext);
      const hint = ext.setTime(S.time);
      const look = createLook(renderer, scene, camera, width, height, { grade: { exposure: hint.exposure } });
      await look.ready; scene.environmentIntensity = hint.envIntensity;
      if (!alive) return;
      ctx.current = { renderer, scene, camera, ext, room, look };
      draw(frame); draw(frame);
      if (bench) {
        const gl = renderer.getContext(), ms = [];
        for (let i = 0; i < 12; i++) { const a = performance.now(); draw(frame + i); gl.finish(); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4)); ms.push(performance.now() - a); }
        ms.sort((a, b) => a - b);
        const info = renderer.info.render;
        label.current.textContent = `median ${ms[6].toFixed(1)} ms  min ${ms[0].toFixed(1)}  max ${ms[11].toFixed(1)}  | calls ${info.calls} tris ${info.triangles} | build ${buildMs.toFixed(0)} ms`;
        draw(frame);
      }
      continueRender(handle);
    })().catch((err) => { console.error(err); throw err; });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => { draw(frame); }, [frame]);
  return <AbsoluteFill style={{ backgroundColor: "#000" }}>
    <canvas ref={canvas} width={width} height={height} style={{ width, height }} />
    {bench && <div ref={label} style={{ position: "absolute", top: 40, left: 30, fontSize: 34, color: "#0f0", fontFamily: "monospace", background: "#000a", padding: 10 }} />}
  </AbsoluteFill>;
};
