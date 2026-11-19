// Interiors test (bank x2 + police): one scene, every frame of "Tour" = one check shot (only that place visible).
// Also measures frame time per shot (console "frameMs").
import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { AbsoluteFill, continueRender, delayRender, useCurrentFrame, useVideoConfig } from "remotion";
import { createLook } from "../../look.js";
import { buildBank } from "../index.js";
import { buildPolice } from "../../police/index.js";

export const SHOTS = [
  { place: "bank1", view: "hallWide", figs: ["counterSpot", "tellerSpot"] },
  { place: "bank1", view: "cctvView", figs: ["counterSpot", "tellerSpot"], turn: { counterSpot: -2.4 } },
  { place: "bank2", view: "hallWide", figs: ["counterSpot", "tellerSpot"] },
  { place: "police", view: "interrogationWide", figs: ["interrogationChairRobber", "interrogationChairCop"], sit: true },
  { place: "police", view: "cellWide", figs: ["cellInside"], controls: { cellDoor: 0.5 }, sit: true },
  { place: "police", view: "deskWide", figs: ["deskSpot"] },
  { place: "bank1", view: "counterClose", figs: ["counterSpot", "tellerSpot"] },
  { place: "police", view: "interrogationClose", figs: ["interrogationChairRobber", "interrogationChairCop"], sit: true },
  { place: "bank2", view: "cctvView", figs: ["counterSpot", "tellerSpot"], turn: { counterSpot: -2.4 } },
  { place: "police", view: "cellWide", figs: ["cellInside"], controls: { cellDoor: 1 }, sit: true },
  { place: "bank2", view: "counterClose", figs: ["counterSpot", "tellerSpot"] },
  { place: "police", view: "tvClose", figs: [] },
];

function placeholder(color) {
  const g = new THREE.Group();
  const ink = new THREE.MeshStandardMaterial({ color: 0x1c130f, roughness: 0.5 });
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 0.26, 8, 24), new THREE.MeshStandardMaterial({ color, roughness: 0.8 }));
  body.position.y = 0.92; body.scale.set(1, 1, 0.72); body.castShadow = true; g.add(body);
  for (const s of [-1, 1]) { const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.75, 8), ink); leg.position.set(s * 0.08, 0.375, 0); leg.castShadow = true; g.add(leg); }
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.29, 48, 32), new THREE.MeshStandardMaterial({ color: 0xf6f4f0, roughness: 0.7 }));
  head.position.set(0, 1.33, 0.08); head.castShadow = true; g.add(head);
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 8), ink); nose.position.set(0, 1.33, 0.37); g.add(nose);
  return g;
}

export const InteriorTest = ({ tour = false, shot = 0, wobble = false }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const canvas = useRef(null), ctx = useRef(null);
  const [handle] = useState(() => delayRender("build interiors", { timeoutInMilliseconds: 280000 }));
  const draw = (f) => {
    const c = ctx.current; if (!c) return;
    const S = SHOTS[tour ? Math.min(f, SHOTS.length - 1) : shot];
    for (const [k, p] of Object.entries(c.places)) p.group.visible = k === S.place;
    const p = c.places[S.place]; p.set?.(S.controls || {});
    const v = p.anchors.views[S.view];
    c.camera.position.copy(v.pos); c.camera.fov = v.fov; c.camera.updateProjectionMatrix(); if (wobble) c.camera.position.x += 0.05 * Math.sin(f * 0.3); c.camera.lookAt(v.target); c.camera.updateMatrixWorld();
    c.figs.forEach((fg, i) => { const name = S.figs[i]; fg.visible = !!name; if (!name) return;
      fg.position.copy(p.anchors[name]); fg.rotation.y = (p.anchors.yaw?.[name] ?? 0) + (S.turn?.[name] ?? 0);
      fg.scale.setScalar(1); fg.position.y += S.sit ? -0.0 : 0; });
    p.update(f / 30, c.camera);
    const t0 = performance.now(); c.look.render(); const gl = c.renderer.getContext(); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4));
    const ms = performance.now() - t0; console.log(`frameMs ${S.place}/${S.view} ${ms.toFixed(1)}`);
  };
  useEffect(() => {
    let alive = true;
    (async () => {
      const renderer = new THREE.WebGLRenderer({ canvas: canvas.current, antialias: false, preserveDrawingBuffer: true, powerPreference: "high-performance" });
      const scene = new THREE.Scene(); scene.background = new THREE.Color("#a9c4e6");
      const camera = new THREE.PerspectiveCamera(60, width / height, 0.05, 300);
      const places = { bank1: await buildBank({ preset: "first" }), bank2: await buildBank({ preset: "peoples" }), police: await buildPolice({ time: "night" }) };
      for (const p of Object.values(places)) scene.add(p.group);
      const figs = [placeholder(0xd9a21c), placeholder(0x31508a)]; figs.forEach((f) => scene.add(f));
      const look = createLook(renderer, scene, camera, width, height, {});
      await look.ready;
      if (!alive) return;
      ctx.current = { renderer, scene, camera, places, figs, look };
      draw(frame); draw(frame);
      continueRender(handle);
    })().catch((err) => { console.error("BUILDFAIL " + err.stack); throw err; });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => { draw(frame); }, [frame]);
  return <AbsoluteFill style={{ backgroundColor: "#000" }}><canvas ref={canvas} width={width} height={height} style={{ width, height }} /></AbsoluteFill>;
};
