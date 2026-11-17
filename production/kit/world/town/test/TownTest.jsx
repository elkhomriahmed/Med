// Town test entry: placeholder sea + sky + lighthouse (ONLY here, so stills read) + capsule townsfolk at the anchor spots.
import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { AbsoluteFill, continueRender, delayRender, useCurrentFrame, useVideoConfig } from "remotion";
import { createLook } from "../../index.js";
import { buildTown, TOWN_ORIGIN } from "../index.js";

function folk(color, h = 1) {
  const g = new THREE.Group();
  const ink = new THREE.MeshStandardMaterial({ color: 0x1c130f, roughness: 0.5 });
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 0.26, 8, 24), new THREE.MeshStandardMaterial({ color, roughness: 0.8 }));
  body.position.y = 0.92 * h; body.scale.set(h, h, 0.72 * h); body.castShadow = true; g.add(body);
  for (const s of [-1, 1]) { const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.75 * h, 8), ink); leg.position.set(s * 0.08, 0.375 * h, 0); leg.castShadow = true; g.add(leg); }
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.29 * h, 32, 24), new THREE.MeshStandardMaterial({ color: 0xf7f6f2, roughness: 0.9 }));
  head.position.set(0, 1.33 * h, 0.08); head.castShadow = true; g.add(head);
  return g;
}
function placeholderLighthouse() {
  const g = new THREE.Group();
  const white = new THREE.MeshStandardMaterial({ color: 0xeeeae2, roughness: 0.7 }), red = new THREE.MeshStandardMaterial({ color: 0xb02a20, roughness: 0.7 });
  for (let i = 0; i < 5; i++) { const m = new THREE.Mesh(new THREE.CylinderGeometry(3.3 + (4 - i) * 0.18, 3.3 + (5 - i) * 0.18, 6, 24), i % 2 ? red : white); m.position.y = -30 + 3 + i * 6; g.add(m); }
  const lamp = new THREE.Mesh(new THREE.CylinderGeometry(2.9, 2.9, 2.6, 16), new THREE.MeshStandardMaterial({ color: 0xffe8b0, emissive: 0xffc060, emissiveIntensity: 3 })); lamp.position.y = 1.3; g.add(lamp);
  const roof = new THREE.Mesh(new THREE.ConeGeometry(3.4, 2.4, 16), new THREE.MeshStandardMaterial({ color: 0x2a5048 })); roof.position.y = 3.8; g.add(roof);
  const rock = new THREE.Mesh(new THREE.SphereGeometry(18, 24, 12), new THREE.MeshStandardMaterial({ color: 0x55504a, roughness: 1 })); rock.scale.set(1, 0.3, 1); rock.position.y = -32; g.add(rock);
  return g;
}
const SKY = { night: ["night", {}], dusk: ["sunset", {}], day: ["day", {}], morning: ["day", {}],
  winter: ["day", { zenith: [0.32, 0.40, 0.55], horizon: [0.62, 0.68, 0.76], haze: [0.8, 0.83, 0.88], sunCol: [3, 3, 3.3], sunGlow: 0.2, sea: [0.05, 0.08, 0.12], seaHorizon: [0.4, 0.45, 0.52] }] };
const SEA = { night: 0x050c1a, dusk: 0x1a2030, day: 0x1d4a66, morning: 0x1d4a66, winter: 0x30404c };
const EXPO = { night: 1.6, dusk: 1.3, day: 1.25, morning: 1.2, winter: 1.3 };

export const TownTest = ({ time = "night", view = "crowdWide", bench = false }) => {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const canvas = useRef(null), ctx = useRef(null);
  const [handle] = useState(() => delayRender("build town", { timeoutInMilliseconds: 120000 }));
  const draw = (f) => { const c = ctx.current; if (!c) return; c.town.update(f / fps, c.camera); c.look.render(); };
  useEffect(() => {
    let alive = true;
    (async () => {
      const renderer = new THREE.WebGLRenderer({ canvas: canvas.current, antialias: false, preserveDrawingBuffer: true, powerPreference: "high-performance" });
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 3000);
      const t0 = performance.now();
      const town = await buildTown({ time });
      console.log(`[town] build ${(performance.now() - t0).toFixed(0)} ms`);
      scene.add(town.group);
      const SK = { night: ["#02040e", "#141c3c"], dusk: ["#1c2050", "#e08050"], day: ["#3a78d8", "#c4dcf4"], morning: ["#5a8ad8", "#f4d4b0"], winter: ["#7a8ca8", "#d0d8e2"] }[time];
      const sg = new THREE.SphereGeometry(1400, 32, 16), cz = new THREE.Color(SK[0]), ch = new THREE.Color(SK[1]), ca = [];
      for (let i = 0; i < sg.attributes.position.count; i++) { const y = sg.attributes.position.getY(i) / 1400, c = ch.clone().lerp(cz, Math.min(1, Math.max(0, y) * 2.2) ** 0.7); ca.push(c.r, c.g, c.b); }
      sg.setAttribute("color", new THREE.Float32BufferAttribute(ca, 3));
      scene.add(new THREE.Mesh(sg, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false })));
      const sea = new THREE.Mesh(new THREE.PlaneGeometry(4000, 4000), new THREE.MeshStandardMaterial({ color: SEA[time], roughness: 0.25, metalness: 0.1 }));
      sea.rotation.x = -Math.PI / 2; sea.position.y = -34; sea.receiveShadow = true; scene.add(sea);
      scene.add(placeholderLighthouse());
      const cols = { fisher: 0x3a6a8a, baker: 0xf0e8d8, lady: 0xb04a6a, kid: 0xd9a21c, extra: 0x6a8a3a };
      const tgt = new THREE.Vector3(0, 0, 0);
      for (const [k, p] of Object.entries(town.anchors.spots)) { const f = folk(cols[k], k === "kid" ? 0.72 : 1); f.position.copy(p); f.lookAt(tgt.x, p.y, tgt.z); scene.add(f); }
      let V = town.anchors.views[view];
      if (view === "nightWide") V = { pos: TOWN_ORIGIN.clone().add(new THREE.Vector3(-14, 16, -62)), target: TOWN_ORIGIN.clone().add(new THREE.Vector3(2, 3, 4)), fov: 50 };
      camera.fov = V.fov; camera.updateProjectionMatrix(); camera.position.copy(V.pos); camera.lookAt(V.target); camera.updateMatrixWorld();
      const look = createLook(renderer, scene, camera, width, height, { grade: { exposure: EXPO[time] } });
      await look.ready;
      if (!alive) return;
      ctx.current = { renderer, scene, camera, town, look };
      draw(frame); draw(frame);
      if (bench) {
        const gl = renderer.getContext(); const ms = (fn, n = 20) => { fn(); gl.finish(); const a = performance.now(); for (let i = 0; i < n; i++) { fn(i); gl.finish(); } return (performance.now() - a) / n; };
        const full = ms((i) => { town.update(i / 30, camera); look.render(); });
        const raw = ms(() => renderer.render(scene, camera));
        scene.remove(town.group); const rawNoTown = ms(() => renderer.render(scene, camera)); scene.add(town.group);
        console.log(`[town] full look ${full.toFixed(1)} ms | raw scene ${raw.toFixed(1)} ms | raw without town ${rawNoTown.toFixed(1)} ms | calls ${renderer.info.render.calls} tris ${renderer.info.render.triangles}`);
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
