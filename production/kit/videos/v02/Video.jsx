// Video 2 composition: one connected Pittsburgh block (street, apartment, 2 banks, police station) + the professor's office,
// the cast, props in hands, real-character renders on the TV/CCTV/newspaper/textbook, designed transitions, captions, sound.
import React, { useEffect, useRef, useState } from "react";
import { AbsoluteFill, Audio, continueRender, delayRender, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import * as THREE from "three";
import { createLook } from "../../world/look.js";
import { buildCity } from "../../world/city/index.js";
import { buildApartment } from "../../world/apartment/index.js";
import { buildBank } from "../../world/bank/index.js";
import { buildPolice } from "../../world/police/index.js";
import { buildOffice } from "../../world/office/index.js";
import * as PV from "../../world/props_v02/index.js";
import { createCharacter } from "../../characters/index.js";
import { SPECS } from "../../characters/specs.js";
import { Captions } from "../../timeline/Captions.jsx";
import { FPS, WORDS, makeDirection } from "./direction.js";

const CAST = { robber: "robber", buddy: "buddy", teller1: "teller1", teller2: "teller2", cop: "cop", professor: "professor" };
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const specOf = (k) => SPECS[k] || SPECS[k.toLowerCase()] || Object.values(SPECS).find((s) => s.id === k);

// ---------------------------------------------------------------- mini renders: our real characters for screens/prints
async function buildMini() {
  const canvas = document.createElement("canvas"); canvas.width = 480; canvas.height = 360;
  const r = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true }); r.setSize(480, 360, false);
  r.outputColorSpace = THREE.SRGBColorSpace; r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 1.15;
  const mk = async (specKey, bg) => {
    const scene = new THREE.Scene(); scene.background = new THREE.Color(bg);
    scene.add(new THREE.HemisphereLight(0xffffff, 0x445566, 1.6)); const d = new THREE.DirectionalLight(0xfff2dd, 2.2); d.position.set(1.5, 3, 4); scene.add(d);
    const ch = await createCharacter(specOf(specKey)); scene.add(ch.root);
    const cam = new THREE.PerspectiveCamera(30, 480 / 360, 0.05, 50); cam.position.set(0, 1.35, 3.3); cam.lookAt(0, 1.2, 0);
    return { scene, ch, cam, out: Object.assign(document.createElement("canvas"), { width: 480, height: 360 }) };
  };
  const M = { r, suspect: await mk("robber", "#7e8a8e"), anchor: await mk("anchor", "#1b2f6e"), wx: await mk("weatherman", "#2a5ea8") };
  M.render = async (m, state, t) => {
    m.ch.update(state, { camera: m.cam, keyLightPos: V(1.5, 3, 4), time: t }); await m.ch.ready?.();
    r.render(m.scene, m.cam); const g = m.out.getContext("2d"); g.clearRect(0, 0, 480, 360); g.drawImage(canvas, 0, 0); return m.out;
  };
  await M.render(M.suspect, { expression: "happy", wet: 1, lookAt: M.suspect.cam.position, armL: { pose: "hip" }, armR: { pose: "thumbsUp" } }, 1.0);
  return M;
}

async function build(canvas, W, H) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, preserveDrawingBuffer: true, powerPreference: "high-performance" });
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, W / H, 0.05, 3000);
  const [city, apt, bank1, bank2, police, office] = await Promise.all([buildCity({ time: "day" }), buildApartment({ time: "morning" }),
    buildBank({ preset: "first" }), buildBank({ preset: "peoples" }), buildPolice({ time: "night" }), buildOffice()]);
  for (const s of [city, apt, bank1, bank2, police, office]) scene.add(s.group);
  apt.setHeight?.(H);
  const chars = {};
  for (const [k, spec] of Object.entries({ robber: "robber", buddy: "buddy", teller1: "teller1", teller2: "teller2", cop: "cop", professor: "professor" })) {
    chars[k] = await createCharacter(specOf(spec) || specOf(spec.replace("_", ""))); scene.add(chars[k].root);
  }
  // props
  const P = {
    lemonHalf: PV.createLemonHalf({ seed: 3 }), lemonA: PV.createLemon({ seed: 4 }), lemonB: PV.createLemon({ seed: 5 }), lemonHand: PV.createLemon({ seed: 6 }),
    polaroid: PV.createPolaroidCamera(), photo: PV.createPolaroidPhoto(), inkPaper: PV.createInkPaper({ text: "MONEY" }), lemonBag: PV.createLemonBag({ lemons: 5 }),
    squirt: PV.createJuiceSquirt({ seed: 7 }), newspaperCell: null, newspaperOffice: null, textbookCell: null, textbookOffice: null,
  };
  const lemonRow = PV.createLemonRow(6); lemonRow.position.set(-2.95, 3.6 + 0.76, -11.55); scene.add(lemonRow);
  const mini = await buildMini();
  const suspectTex = new THREE.CanvasTexture(mini.suspect.out); suspectTex.colorSpace = THREE.SRGBColorSpace;
  P.newspaperCell = PV.createNewspaper({ photo: suspectTex }); P.newspaperOffice = PV.createNewspaper({ photo: suspectTex });
  P.textbookCell = PV.createTextbook({ pagePhoto: suspectTex }); P.textbookOffice = PV.createTextbook({ pagePhoto: suspectTex });
  for (const o of Object.values(P)) { o.visible = false; scene.add(o); }
  // screens
  const aptScreen = PV.createScreen(640, 480); apt.setTvTexture(aptScreen.texture);
  const polScreen = PV.createScreen(640, 480);
  police.tvScreen.material.map = polScreen.texture; police.tvScreen.material.emissiveMap = polScreen.texture; police.tvScreen.material.needsUpdate = true;
  const look = createLook(renderer, scene, camera, W, H, {});
  await look.ready;
  const dir = makeDirection({ city, apt, bank1, bank2, police, office });
  const live = {
    camPos: () => camera.position.clone(),
    handPos: (who, side) => chars[who].handWorld(side).clone(),
    bookPos: () => chars.robber.bothHandsFrame().position.clone(),
    newsPos: () => chars.professor.bothHandsFrame().position.clone(),
    chalkPos: (t) => office.anchors.boardPx(0.12 + 0.6 * ((t * 0.35) % 1), 0.3 + 0.2 * Math.floor((t * 0.35) % 2)),
  };
  // warm-up faces
  for (let f = 0; f < 640; f++) { const t = f / 10; const c = dir.camAt(t); camera.position.copy(c.pos);
    const a = dir.act(t, live); for (const k in chars) if (a.cast[k]?.visible) chars[k].preload?.([a.cast[k].s]); }
  await Promise.all(Object.values(chars).map((c) => c.ready?.()));
  const centers = { apt: [V(0, 5, -12), apt], bank1: [V(2, 2, 15), bank1], bank2: [V(19, 2, 14), bank2], police: [V(28, 1.5, -15), police] };
  const attach = (o, a) => {
    if (!a) { o.visible = false; return; }
    o.visible = true;
    if (a.place) { o.position.copy(a.place); o.rotation.set(a.flat ? -Math.PI / 2 : 0, a.rot ?? 0, 0); }
    else if (a.twoHands) { const f = chars[a.twoHands].bothHandsFrame(); o.quaternion.copy(f.quaternion); o.position.copy(f.position); }
    else if (a.holder) { const f = chars[a.holder].handFrame(a.side); o.quaternion.copy(f.quaternion); const g = (o.userData.grip || V(0, 0, 0)).clone().multiply(o.scale).applyQuaternion(o.quaternion); o.position.copy(f.position).sub(g); }
    if (a.open != null) (o.userData.setOpen?.(a.open));
  };
  const state = { last: null };
  return {
    camera, dir, state,
    async renderFrame(frame) {
      const t = frame / FPS;
      const c = dir.camAt(t); camera.position.copy(c.pos); camera.fov = c.fov; camera.lookAt(c.target);
      const z = dir.zoneAt(t), tm = dir.timeAt(t);
      camera.near = z === "flight" ? 0.12 : 0.05; camera.far = 3000; camera.updateProjectionMatrix(); camera.updateMatrixWorld();
      city.setTime(tm.city); apt.setTime(tm.apt);
      // visibility: current interior + interiors the camera is near; city off in the office
      city.group.visible = z !== "office"; office.group.visible = z === "office";
      for (const [k, [ctr, s]] of Object.entries(centers)) s.group.visible = z !== "office" && (z === k || camera.position.distanceTo(ctr) < 12);
      look.grade.set("exposure", dir.exposureAt(t, tm));
      const a = dir.act(t, live);
      apt.set(a.ctrl.apt); police.set(a.ctrl.police); office.board.set(a.ctrl.board);
      // cast
      const key = z === "apt" ? apt.anchors.keyLightPos : z === "bank1" ? bank1.anchors.keyLightPos : z === "bank2" ? bank2.anchors.keyLightPos
        : z === "police" ? (t >= 43.0 ? police.anchors.keyLights.cells : police.anchors.keyLights.interrogation) : z === "office" ? office.anchors.keyLightPos : city.keyLightPos;
      for (const k in chars) { const s = a.cast[k]; const ch = chars[k];
        if (!s || !s.visible) { ch.root.visible = false; continue; }
        ch.root.visible = true; ch.root.position.copy(s.pos); ch.root.rotation.set(0, s.rot ?? 0, 0);
        ch.update(s.s || {}, { camera, keyLightPos: key, time: t }); }
      // props
      for (const [k, o] of Object.entries(P)) if (k !== "squirt") attach(o, a.props[k]);
      if (a.props.photo) { P.photo.userData.setDevelop?.(Math.min(1, (t - 15.3) / 1.0)); }
      P.polaroid.userData.setFlash?.(a.fx.flash); P.polaroid.userData.setEject?.(a.props.photo?.eject ? 1 : 0);
      if (a.props.squirt) { P.squirt.visible = true; P.squirt.position.copy(a.props.squirt.at); P.squirt.userData.set?.(a.props.squirt.k); } else P.squirt.visible = false;
      lemonRow.visible = z === "apt" && t < 12.3;
      // screens
      if (a.ctrl.screens.aptTv === "news") { await mini.render(mini.anchor, { expression: "neutral", mouth: Math.sin(t * 15) > 0 ? "_A" : "", lookAt: mini.anchor.cam.position }, t);
        aptScreen.draw("news", t, { photo: mini.suspect.out, anchor: mini.anchor.out, banner: a.ctrl.screens.banner }); }
      else if (a.ctrl.screens.aptTv === "weather") { await mini.render(mini.wx, { expression: "happy", lookAt: mini.wx.cam.position, armR: { pose: "point", target: V(-1, 1.4, 0) } }, t);
        aptScreen.draw("weather", t, { presenter: mini.wx.out, point: 1 }); }
      else aptScreen.draw("off", t, {});
      aptScreen.texture.needsUpdate = true;
      polScreen.draw(a.ctrl.screens.policeTv, t, { source: mini.suspect.out }); polScreen.texture.needsUpdate = true;
      police.tvScreen.material.emissiveIntensity = a.ctrl.screens.policeTv === "off" ? 0 : 1.1;
      for (const s of [city, apt, bank1, bank2, police, office]) s.update?.(t, camera);
      await Promise.all(Object.values(chars).map((c) => c.ready?.()));
      look.render();
      state.last = a;
    },
    dispose() { renderer.dispose(); mini.r.dispose(); },
  };
}

function FxLayer({ a, t, W, H }) {
  const ref = useRef(null);
  useEffect(() => {
    const cv = ref.current; if (!cv || !a) return; const g = cv.getContext("2d"); g.clearRect(0, 0, W, H);
    if (a.fx.cctv > 0.001) { g.save(); g.globalAlpha = a.fx.cctv; PV.drawCCTVOverlay(g, W, H, t, { stamp: a.zone === "bank2" ? "04-19-95 14:51:12" : "04-19-95 14:32:07", cam: a.zone === "bank2" ? "CAM 01" : "CAM 02" }); g.restore(); }
    if (a.fx.rewind > 0.001) PV.drawRewind(g, W, H, a.fx.rewind, t);
    if (a.fx.flash > 0.001) { g.fillStyle = `rgba(255,255,250,${0.85 * a.fx.flash})`; g.fillRect(0, 0, W, H); }
  });
  return <canvas ref={ref} width={W} height={H} style={{ position: "absolute", left: 0, top: 0, width: W, height: H }} />;
}

function Overlay({ o, cam, W, H, t }) {
  const p = o.at.clone().project(cam); if (p.z > 1) return null;
  const x = (p.x * 0.5 + 0.5) * W, y = (-p.y * 0.5 + 0.5) * H, s = W / 1080, age = Math.max(0, t - o.t0);
  if (o.kind === "bulb") { const k = Math.min(1, age / 0.15); return <div style={{ position: "absolute", left: x, top: y, transform: `translate(-50%,-50%) scale(${0.5 + 0.5 * k})` }}>
    <div style={{ width: 90 * s, height: 90 * s, borderRadius: "50%", background: "radial-gradient(#fff9c8,#ffd84a 60%,#e8a400)", border: `${7 * s}px solid #2a1b12`, boxShadow: `0 0 ${40 * s}px #ffe680` }} />
    <div style={{ width: 40 * s, height: 26 * s, margin: "-4px auto 0", background: "#8a8f98", border: `${6 * s}px solid #2a1b12`, borderRadius: 4 * s }} /></div>; }
  if (o.kind === "tears") return <>{[-1, 1].map((sd) => { const f = (age * 1.4 + (sd > 0 ? 0.5 : 0)) % 1;
    return <div key={sd} style={{ position: "absolute", left: x + sd * 70 * s, top: y + f * 90 * s, width: 22 * s, height: 30 * s, background: "#8fd3ff",
      borderRadius: "50% 50% 50% 50% / 60% 60% 40% 40%", border: `${5 * s}px solid #2a1b12`, opacity: 1 - f * 0.7, transform: "translate(-50%,-50%)" }} />; })}</>;
  return null;
}

export const Video = () => {
  const frame = useCurrentFrame(); const { width, height } = useVideoConfig();
  const canvas = useRef(null), ctx = useRef(null);
  const [handle] = useState(() => delayRender("build world", { timeoutInMilliseconds: 290000 }));
  const [, force] = useState(0);
  useEffect(() => { let alive = true;
    build(canvas.current, width, height).then(async (c) => { if (!alive) return; ctx.current = c; await c.renderFrame(frame); force((x) => x + 1); continueRender(handle); })
      .catch((e) => { console.error("BUILD_FAIL", e?.stack || e); throw e; });
    return () => { alive = false; ctx.current?.dispose(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => { if (!ctx.current) return; const h = delayRender("frame " + frame);
    ctx.current.renderFrame(frame).then(() => { force((x) => x + 1); continueRender(h); }); }, [frame]);
  const c = ctx.current, t = frame / FPS, a = c?.state.last;
  const k = a?.fx.cctv ?? 0, wb = a?.fx.whip ?? 0;
  const filter = `grayscale(${0.85 * k}) sepia(${0.12 * k}) contrast(${1 + 0.18 * k}) brightness(${1 + 0.06 * k}) blur(${(14 * wb * width) / 1080}px)`;
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <canvas ref={canvas} width={width} height={height} style={{ width, height, filter }} />
      {a && <FxLayer a={a} t={t} W={width} H={height} />}
      {c && a && a.overlays.map((o, i) => <Overlay key={i} o={o} cam={c.camera} W={width} H={height} t={t} />)}
      <Captions words={WORDS.map(([s, e, w]) => [s, e, w.replace(/["]/g, "")])} />
      <Audio src={staticFile("audio/vo_v02.wav")} />
      <Audio src={staticFile("audio/fx_v02.wav")} />
    </AbsoluteFill>
  );
};
