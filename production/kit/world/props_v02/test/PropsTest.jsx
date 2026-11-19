// props_v02 test bench: all props on a lit table, their control states, the screen modes, and the 2D overlays.
import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { AbsoluteFill, continueRender, delayRender, useCurrentFrame, useVideoConfig } from "remotion";
import { createLook } from "../../look.js";
import { pbr } from "../../materials.js";
import { roundedBox, boxUV } from "../../geometry.js";
import * as P from "../index.js";

const CAMS = {
  lineup: { p: [0, 1.55, 1.3], t: [0, 0.78, -0.05], fov: 50 },
  vertical: { p: [0, 1.55, 1.25], t: [0, 0.8, -0.05], fov: 62 },
  states: { p: [0, 1.55, 1.3], t: [0, 0.8, -0.05], fov: 50 },
  lemons: { p: [-0.42, 1.0, 0.42], t: [-0.42, 0.79, 0.1], fov: 40 },
  camera: { p: [0.12, 0.98, 0.48], t: [0.0, 0.81, 0.12], fov: 38 },
  books: { p: [0.05, 1.25, 0.75], t: [0.05, 0.9, -0.1], fov: 45 },
  screens: { p: [0, 1.35, 1.55], t: [0, 1.35, 0], fov: 40 },
};

async function buildTable(scene) {
  const wood = await pbr("wood", { color: [0.85, 0.62, 0.42], vertexColors: false, normalScale: 1.2 });
  const top = new THREE.Mesh(boxUV(roundedBox(1.7, 0.05, 0.9, 0.012), 0.8), wood); top.position.y = 0.75; top.castShadow = top.receiveShadow = true; scene.add(top);
  const wallM = await pbr("plaster", { color: [0.75, 0.82, 0.78], vertexColors: false });
  const wall = new THREE.Mesh(boxUV(roundedBox(4, 3, 0.1, 0.01), 1.5), wallM); wall.position.set(0, 1.5, -0.7); wall.receiveShadow = true; scene.add(wall);
  const floor = new THREE.Mesh(boxUV(roundedBox(4, 0.05, 4, 0.01), 1), await pbr("darkWood", { vertexColors: false })); floor.position.y = -0.025; floor.receiveShadow = true; scene.add(floor);
}
function lights(scene, dark = false) {
  const key = new THREE.SpotLight(0xffd9a8, dark ? 14 : 32, 8, 0.75, 0.5, 2); key.position.set(-1.2, 2.4, 1.2); key.target.position.set(0, 0.8, 0);
  key.castShadow = true; key.shadow.mapSize.set(2048, 2048); key.shadow.bias = -0.0002; key.shadow.normalBias = 0.01; scene.add(key, key.target);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.05, 16, 12), new THREE.MeshBasicMaterial({ color: new THREE.Color(4, 3.2, 2.2) })); bulb.position.copy(key.position); scene.add(bulb);
  scene.add(new THREE.HemisphereLight(0x9fb4d8, 0x3a2a1c, dark ? 0.25 : 0.6));
}
const at = (o, x, y, z, ry = 0) => { o.position.set(x, y, z); o.rotation.y = ry; return o; };
const TOP = 0.775;

async function build(scene, name, ctx) {
  if (name === "screens") {
    const wallM = await pbr("plaster", { color: [0.35, 0.38, 0.42], vertexColors: false });
    const wall = new THREE.Mesh(boxUV(roundedBox(4, 3, 0.1, 0.01), 1.5), wallM); wall.position.set(0, 1.5, -0.2); wall.receiveShadow = true; scene.add(wall);
    lights(scene, true); const photo = P.createPlaceholderPhoto();
    const modes = [["cctv", { source: photo }], ["news", { photo, banner: 0.85 }], ["weather", {}], ["vhs", { source: null }]];
    ctx.screens = modes.map(([mode, o], i) => { const s = P.createScreen(640, 480), m = s.createMesh(0.48, 0.36);
      const x = (i % 2 ? 1 : -1) * 0.29, y = 1.35 + (i < 2 ? 0.22 : -0.22);
      const bez = new THREE.Mesh(roundedBox(0.54, 0.42, 0.06, 0.02), new THREE.MeshStandardMaterial({ color: 0x2a2826, roughness: 0.5 })); bez.position.set(x, y, -0.12); bez.castShadow = true; scene.add(bez);
      m.position.set(x, y, -0.088); scene.add(m); return { s, mode, o }; });
    return;
  }
  await buildTable(scene); lights(scene);
  const photoTex = P.createPlaceholderPhoto();
  if (name === "lineup" || name === "states") {
    const S = name === "states";
    scene.add(at(P.createLemonBag(), -0.58, TOP, -0.22, 0.3));
    if (!S) { const news = P.createNewspaper({ photo: photoTex }); news.rotation.x = -Math.PI / 2; news.position.set(-0.12, TOP + 0.003, -0.05); scene.add(news); }
    const book = P.createTextbook({ pagePhoto: photoTex }); at(book, S ? 0.0 : 0.2, TOP, -0.22, -0.15); if (S) book.userData.setOpen(1); scene.add(book);
    scene.add(at(P.createVHSTape(), S ? 0.62 : 0.58, TOP, S ? 0.15 : -0.2, 0.25));
    scene.add(at(P.createLemonRow(3), -0.6, TOP, 0.17, 0));
    const half = P.createLemonHalf(); scene.add(at(half, -0.37, TOP, 0.2));
    scene.add(at(P.createLemonSlice(), -0.29, TOP, 0.25));
    const cam = at(P.createPolaroidCamera(), -0.06, TOP, 0.15, 0.35); scene.add(cam);
    const ph = P.createPolaroidPhoto(); ph.rotation.set(-Math.PI / 2, 0, 0.2); ph.position.set(0.12, TOP + 0.001, 0.22); ph.userData.setDevelop(1); scene.add(ph);
    const paper = P.createInkPaper(); at(paper, 0.38, TOP, 0.17, -0.25); scene.add(paper);
    if (S) {
      cam.userData.setFlash(0.55); cam.userData.setEject(0.7); cam.userData.photo.userData.setDevelop(0.15);
      paper.userData.setReveal(1); paper.userData.setWrite(0.6);
      const sq = P.createLemonHalf({ seed: 9 }); sq.rotation.x = Math.PI; sq.position.set(-0.37, TOP + 0.32, 0.2); scene.add(sq); half.visible = false;
      const j = P.createJuiceSquirt(); j.position.set(-0.37, TOP + 0.255, 0.2); j.userData.set(0.42); scene.add(j);
    }
    return;
  }
  if (name === "lemons") {
    scene.add(at(P.createLemonRow(4), -0.5, TOP, 0.05, 0));
    scene.add(at(P.createLemonHalf(), -0.42, TOP, 0.18));
    scene.add(at(P.createLemonSlice(), -0.35, TOP, 0.2)); const s2 = P.createLemonSlice(); s2.rotation.z = 0.5; scene.add(at(s2, -0.33, TOP + 0.012, 0.15));
    const sq = P.createLemonHalf({ seed: 9 }); sq.rotation.set(Math.PI, 0, 0.3); sq.position.set(-0.52, TOP + 0.17, 0.17); scene.add(sq);
    const j = P.createJuiceSquirt(); j.position.set(-0.52, TOP + 0.11, 0.17); j.userData.set(0.4); scene.add(j);
    return;
  }
  if (name === "camera") {
    const cam = at(P.createPolaroidCamera(), -0.03, TOP, 0.06, 0.45); cam.userData.setFlash(0.25); cam.userData.setEject(1); cam.userData.photo.userData.setDevelop(0.5); scene.add(cam);
    const ph = P.createPolaroidPhoto(); ph.rotation.set(-Math.PI / 2, 0, -0.3); ph.position.set(0.12, TOP + 0.001, 0.15); ph.userData.setDevelop(1); scene.add(ph);
    scene.add(at(P.createVHSTape(), 0.1, TOP, -0.02, -0.4));
    return;
  }
  if (name === "books") {
    const book = P.createTextbook({ pagePhoto: photoTex }); at(book, 0.02, TOP, 0.02, 0); book.userData.setOpen(1); scene.add(book);
    const half = P.createTextbook(); at(half, -0.4, TOP, 0.05, 0.2); half.userData.setOpen(0.45); scene.add(half);
    const news = P.createNewspaper({ photo: photoTex }); news.userData.setOpen(1); news.position.set(0.0, TOP + 0.38, -0.35); news.rotation.x = -0.15; scene.add(news);
    const folded = P.createNewspaper({ photo: photoTex }); folded.rotation.set(-Math.PI / 2, 0, 0.25); folded.position.set(0.45, TOP + 0.003, 0.12); scene.add(folded);
  }
}

export const PropsTest = ({ scene: name = "lineup", overlay = null, vertical = false }) => {
  const frame = useCurrentFrame(); const { width, height, fps } = useVideoConfig();
  const canvas = useRef(null), over = useRef(null), ctx = useRef(null);
  const [handle] = useState(() => delayRender("build props", { timeoutInMilliseconds: 120000 }));
  const draw = (f) => { const c = ctx.current; if (!c) return; const t = f / fps + 3;
    for (const s of c.screens || []) s.s.draw(s.mode, t, s.o);
    c.look.render(); c.renderer.getContext().finish();
    const o = over.current; if (o) { const g = o.getContext("2d"); g.clearRect(0, 0, width, height);
      if (overlay === "cctv") P.drawCCTVOverlay(g, width, height, t); if (overlay === "rewind") P.drawRewind(g, width, height, 0.85, t); } };
  useEffect(() => { (async () => {
    const renderer = new THREE.WebGLRenderer({ canvas: canvas.current, antialias: false, preserveDrawingBuffer: true });
    const scene = new THREE.Scene(); const C = CAMS[vertical ? "vertical" : name];
    const camera = new THREE.PerspectiveCamera(C.fov, width / height, 0.02, 100); camera.position.set(...C.p); camera.lookAt(...C.t);
    const c = { renderer, scene, camera }; await build(scene, name, c);
    c.look = createLook(renderer, scene, camera, width, height, { ao: { radius: 0.12, intensity: 2.2 } }); await c.look.ready;
    ctx.current = c; draw(frame); draw(frame); continueRender(handle);
  })().catch((e) => { console.error(e); throw e; }); }, []);
  useEffect(() => { draw(frame); }, [frame]);
  return <AbsoluteFill style={{ backgroundColor: "#000" }}>
    <canvas ref={canvas} width={width} height={height} style={{ width, height, filter: overlay === "cctv" ? P.CCTV_CSS_FILTER : "none" }} />
    {overlay && <canvas ref={over} width={width} height={height} style={{ position: "absolute", left: 0, top: 0, width, height }} />}
  </AbsoluteFill>;
};
