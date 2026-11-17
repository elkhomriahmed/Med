// World test: the lamp room (+ two placeholder figures at the anchors), any time of day, any story-control state.
// props: cam (index into CAMS or { p, t, fov }), time ("night"|"dusk"|"morning"|"winter"), exterior (bool), figures (bool),
//        controls (object passed to place.set every frame; Vector3s as [x,y,z]), setup (name of a test arrangement below).
import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { AbsoluteFill, continueRender, delayRender, useCurrentFrame, useVideoConfig } from "remotion";
import { buildLampRoom, createLook } from "../index.js";
import { createExteriorSky } from "../exterior/sky.js";
import { TIMES as EXT_TIMES } from "../exterior/util.js";   // read-only use: test the shared sky behind the post chain

function placeholder(color) {
  const g = new THREE.Group();
  const ink = new THREE.MeshStandardMaterial({ color: 0x1c130f, roughness: 0.5 });
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 0.26, 8, 24), new THREE.MeshStandardMaterial({ color, roughness: 0.8 }));
  body.position.y = 0.92; body.scale.set(1, 1, 0.72); body.castShadow = true; g.add(body);
  for (const s of [-1, 1]) { const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.75, 8), ink); leg.position.set(s * 0.08, 0.375, 0); leg.castShadow = true; g.add(leg); }
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.29, 48, 32), new THREE.MeshBasicMaterial({ color: 0xffffff }));
  head.position.set(0, 1.33, 0.08); head.castShadow = true; g.add(head);
  return g;
}

// camera presets: 0 = reference framing, 1 = low wide from the left, 2 = high over the engineer's shoulder, 3 = back of the room,
// 4 = winter gallery from outside, 5 = pool close-up, 6 = gears box, 7 = hatch + props from above, 8 = wide high (whole room)
export const CAMS = [
  { p: [0.05, 1.2, 2.48], t: [0, 1.12, 0.3], fov: 94 },
  { p: [-1.6, 0.75, 1.9], t: [0.3, 1.25, -0.4], fov: 80 },
  { p: [1.5, 2.1, 1.7], t: [-0.4, 1.0, -0.4], fov: 75 },
  { p: [-0.6, 1.45, -2.2], t: [0.2, 1.0, 0.9], fov: 85 },
  { p: [3.2, 2.6, 8.6], t: [0, 1.0, 0], fov: 55 },
  { p: [0.25, 1.85, 1.0], t: [0.05, 0.84, 0.1], fov: 50 },
  { p: [-0.75, 1.15, 0.85], t: [-1.7, 0.85, -0.25], fov: 60 },
  { p: [0.2, 2.3, 0.9], t: [1.0, 0.1, -1.2], fov: 70 },
  { p: [0.0, 2.2, 2.6], t: [0, 0.7, -0.6], fov: 90 },
  { p: [2.0, 1.75, 1.0], t: [0.7, 0.15, -0.8], fov: 62 },
];

const cl = (x) => Math.min(1, Math.max(0, x));
const ANIM = (t) => ({ poolFill: cl(t / 1.5), pour: t < 1.5 ? 1 : 0, vapour: cl((t - 0.3) / 0.7), toothPop: cl((t - 0.4) / 0.6), crank: t * 1.5, oilSpill: cl(t / 1.8),
  vapourAvoid: [{ p: [-0.62, 1.33, 0.7], r: 0.32 }, { p: [0.62, 1.33, 0.78], r: 0.32 }] });
const v3 = (a) => (Array.isArray(a) ? new THREE.Vector3(...a) : a);
function controlsAt(c = {}) { const o = { ...c };
  for (const k of ["pourFrom", "vapourTarget"]) if (o[k]) o[k] = v3(o[k]);
  if (o.vapourAvoid) o.vapourAvoid = o.vapourAvoid.map((a) => ({ p: v3(a.p), r: a.r })); return o; }

export const WorldTest = ({ cam = 0, time = "night", exterior = true, figures = true, controls = {}, setup = "", lightsOff = [], extSky = false, bg = null, pinSky = true, far = 2000, anim = false }) => {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const canvas = useRef(null), ctx = useRef(null);
  const [handle] = useState(() => delayRender("build world", { timeoutInMilliseconds: 120000 }));
  const draw = (f) => { const c = ctx.current; if (!c) return; const t = f / fps;
    try { const t0 = performance.now(); c.place.set(controlsAt(anim ? ANIM(t) : controls)); c.place.update(t, c.camera);
    c.look.render(); c.renderer.getContext().finish();
    window.__frameMs = performance.now() - t0; console.log(`frameMs ${f} ${window.__frameMs.toFixed(1)}`); } catch (e) { console.error("DRAWFAIL " + e.stack); } };
  useEffect(() => {
    let alive = true;
    (async () => {
      const renderer = new THREE.WebGLRenderer({ canvas: canvas.current, antialias: false, preserveDrawingBuffer: true, powerPreference: "high-performance" });
      const scene = new THREE.Scene();
      const C = typeof cam === "number" ? CAMS[cam] : cam; const camera = new THREE.PerspectiveCamera(C.fov, width / height, 0.05, far);
      camera.position.set(...C.p); camera.lookAt(...C.t); camera.updateMatrixWorld();
      const place = await buildLampRoom({ exterior, time });
      scene.add(place.group);
      if (figures) {
        const k = placeholder(0xd9a21c); k.position.copy(place.anchors.keeperSpot); k.lookAt(camera.position.x, 0, camera.position.z); k.rotation.y += 0.35; scene.add(k);
        const e = placeholder(0x7a3a16); e.position.copy(place.anchors.engineerSpot); e.lookAt(camera.position.x, 0, camera.position.z); e.rotation.y -= 0.35; scene.add(e);
      }
      const P = place.props;
      if (setup === "pour") { P.jug.position.set(0.1, 1.0, 0.62); P.jug.rotation.set(0, Math.PI / 2, -0.9); }
      if (setup === "props") { P.sandwich.visible = true; P.sandwich.userData.setBites(1); P.toolbox.visible = true;
        P.toolbox.position.set(1.15, 0, -0.35); P.sandwich.position.set(0.7, 0, -0.75); }
      if (extSky) { const sk = createExteriorSky(1500); sk.userData.setPreset(EXT_TIMES[time].sky); scene.add(sk); }
      if (bg) scene.background = new THREE.Color(bg);
      for (const n of lightsOff) place.lights[n].intensity = 0;
      place.setHeight(height);
      const look = createLook(renderer, scene, camera, width, height, { pinSky });
      await look.ready;
      if (!alive) return;
      ctx.current = { renderer, scene, camera, place, look };
      draw(frame); draw(frame);
      continueRender(handle);
    })().catch((err) => { console.error(err); throw err; });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => { draw(frame); }, [frame]);
  return <AbsoluteFill style={{ backgroundColor: "#000" }}><canvas ref={canvas} width={width} height={height} style={{ width, height }} /></AbsoluteFill>;
};
