// Video 1 composition: ONE connected world (lamp room on the tower, rock, jetty, sea, harbour town) + the cast,
// directed by direction.js, captions + voice + pre-mixed sound (tools/mix_fx.py -> public/audio/fx_v01.wav).
import React, { useEffect, useRef, useState } from "react";
import { AbsoluteFill, Audio, continueRender, delayRender, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import * as THREE from "three";
import { buildLampRoom } from "../../world/lampRoom.js";
import { createLook } from "../../world/look.js";
import { buildExterior } from "../../world/exterior/index.js";
import { buildTown } from "../../world/town/index.js";
import { prop, sizeOf } from "../../world/props.js";
import { createCharacter } from "../../characters/index.js";
import { SPECS } from "../../characters/specs.js";
import { Captions } from "../../timeline/Captions.jsx";
import { FPS, WORDS, makeDirection } from "./direction.js";

const CAST = ["keeper", "engineer", "captain", "sailorA", "sailorB", "fisher", "baker", "lady", "kid"];
const V = (x, y, z) => new THREE.Vector3(x, y, z);

async function build(canvas, W, H) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, preserveDrawingBuffer: true, powerPreference: "high-performance" });
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(70, W / H, 0.05, 4000);
  const [room, ext, town] = await Promise.all([buildLampRoom({ exterior: false }), buildExterior({ time: "night", lanternRoof: true }), buildTown({ time: "night" })]);
  ext.setHeight(H); room.setHeight(H);
  scene.add(room.group, ext.group, town.group);
  // lens glints: the turning bullseye glass makes 1-frame specular sparkles -> soften its specular response (no pops)
  room.parts.lens.traverse((o) => { const ms = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : [];
    for (const m of ms) if (m && "roughness" in m && m.transparent !== false) { m.roughness = Math.max(m.roughness ?? 0, 0.32); if ("specularIntensity" in m) m.specularIntensity = Math.min(m.specularIntensity ?? 1, 0.5); if ("clearcoat" in m) m.clearcoat = 0; } });
  const chars = {};
  for (const id of CAST) { chars[id] = await createCharacter(SPECS[id]); scene.add(chars[id].root); }
  const look = createLook(renderer, scene, camera, W, H, {});
  await look.ready;

  const dir = makeDirection({ room, ext, town });
  // the barrel the keeper tries to climb into stands on the jetty next to the mooring post
  const jbarrel = await prop("wine_barrel_01", { position: [0, 0, 0] });
  { const sz = sizeOf(jbarrel); jbarrel.scale.multiplyScalar(0.9 / Math.max(sz.y, 0.01)); jbarrel.position.copy(dir.spots.BARREL); jbarrel.rotation.y = 0.6;
    jbarrel.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } }); scene.add(jbarrel); }
  const handHub = new THREE.Vector3();
  const live = {
    keeperHead: () => chars.keeper.headCenter().clone(),
    engineerChest: () => chars.engineer.headCenter().clone().add(V(0, -0.42, 0.12)),
    crankHub: () => room.anchors.gearsBox.clone().add(V(0.12, 0.0, 0.2)),
    crankPhase: () => 0,
    crankHandle: () => room.anchors.crankHandle.clone(),
    spot: (boat, name) => ext.spotWorld(ext.boats[boat].spots[name]).clone(),
  };
  // warm up every face drawing the whole timeline uses (sampled at 10 fps) so no frame waits on a texture
  for (let f = 0; f < 650; f++) {
    const t = f / 10; ext.update(t, camera);
    const a = dir.act(t, live);
    for (const id of CAST) if (a.cast[id]?.visible && a.cast[id].s) chars[id].preload?.([a.cast[id].s]);
  }
  await Promise.all(CAST.map((id) => chars[id].ready?.()));

  const PROPS = room.props, homes = {};
  for (const [k, o] of Object.entries(PROPS)) homes[k] = { pos: o.position.clone(), quat: o.quaternion.clone(), vis: o.visible };
  const q = new THREE.Quaternion(), tmp = new THREE.Vector3();
  let lastTime = null;

  return {
    dir, chars, camera, room, ext, town, scene,
    async renderFrame(frame) {
      const t = frame / FPS;
      // ---- time of day (all three systems), exposure from the exterior's grade hints
      const [rt, et, tt] = dir.timeAt(t);
      const hint = Array.isArray(et) ? ext.setTime(et[0], et[1], et[2]) : ext.setTime(et);
      if (rt !== room.time) room.setTime(rt);
      town.setTime(tt);
      look.grade.set("exposure", hint.exposure); scene.environmentIntensity = hint.envIntensity;
      // ---- camera
      const c = dir.camAt(t);
      camera.position.copy(c.pos); camera.fov = c.fov; camera.lookAt(c.target);
      const inRoom = Math.hypot(c.pos.x, c.pos.z) < 3.0 && c.pos.y > -0.5 && c.pos.y < 3.8;
      const distFar = c.pos.length();
      camera.near = inRoom ? 0.05 : distFar > 60 ? 1.2 : 0.3; camera.far = 4000;
      camera.updateProjectionMatrix(); camera.updateMatrixWorld();
      // ---- story + world updates (ext first: boats move, then characters stand on their decks)
      ext.update(t, camera);
      // two passes: the story controls move the room first (crank handle, boats), then the acting reads those exact positions,
      // so every frame is the same no matter which order or browser tab renders it
      { const a0 = dir.act(t, live); room.set({ ...a0.room }); room.update(t, camera); }
      const a = dir.act(t, live);
      ext.controls.swerve = a.ext.swerve; ext.controls.rowboat = a.ext.rowboat; ext.controls.passing = a.ext.passing;
      ext.focusShadow(a.ext.focus ? a.ext.focus.center : null, a.ext.focus ? a.ext.focus.half : 12);
      ext.update(t, camera);
      const outside = !inRoom;
      // the front window opens (glass + bars hidden) whenever the camera flies fast near it, so flights never pass through bars
      const cN = dir.camAt(t + 1 / FPS), speed = cN.pos.distanceTo(c.pos), nearWin = Math.hypot(c.pos.x, c.pos.z - 2.9) < 4.5;
      room.set({ ...a.room, beamCones: !outside, windowOutOpen: a.room.windowOutOpen || (nearWin && speed > 0.12) });
      // town only exists on screen around the town shot; its key light only there (one key light per place)
      town.group.visible = a.zone === "town" || (t > 44.5 && t < 51);
      town.lights.key.visible = a.zone === "town"; ext.lights.key.visible = a.zone !== "town";
      town.update(t, camera);
      // the binocular gulls only sit on the railing in winter (shot 20)
      for (const g of ext.gulls.perched) g.visible = t >= 42 && t < 50;
      // ---- cast
      for (const id of CAST) {
        const s = a.cast[id], ch = chars[id];
        if (!s || !s.visible) { ch.root.visible = false; continue; }
        ch.root.visible = true; ch.root.position.copy(s.pos); ch.root.rotation.set(0, s.rot ?? 0, 0);
      }
      const keyPos = a.zone === "town" ? town.anchors.keyLightPos : room.time === "morning" || a.zone !== "room" ? camera.position.clone().addScaledVector(ext.sunDir, 200) : room.keyLightPos;
      for (const id of CAST) { const s = a.cast[id]; if (s && s.visible) chars[id].update(s.s || {}, { camera, keyLightPos: keyPos, time: t }); }
      room.update(t, camera);
      // ---- props in hands (grip on the drawn finger hook), or back home
      for (const [k, o] of Object.entries(PROPS)) {
        if (k === "oilSpill") continue;
        const p = a.props[k];
        if (p && p.holder) {
          const hf = chars[p.holder].handFrame(p.side);
          o.visible = true; o.quaternion.copy(hf.quaternion);
          const grip = (o.userData.grip || V(0, 0, 0)).clone().multiply(o.scale).applyQuaternion(o.quaternion);
          o.position.copy(hf.position).sub(grip);
        } else if (p && p.place) { o.visible = true; o.position.copy(p.place); o.quaternion.setFromEuler(new THREE.Euler(0, p.rot ?? 0, 0)); }
        else { o.position.copy(homes[k].pos); o.quaternion.copy(homes[k].quat); o.visible = k === "sandwich" || k === "toolbox" ? false : homes[k].vis; }
      }
      if (a.props.sandwich) PROPS.sandwich.userData.setBites?.(t > WORDS[42][0] + 0.05 ? 1 : 0);
      room.update(t, camera);
      await Promise.all(CAST.map((id) => chars[id].ready?.()));
      look.render();
      this.lastOverlays = a.overlays;
    },
    dispose() { renderer.dispose(); },
  };
}

// ---- 2D gag graphics drawn over the frame at a projected world point (sweat drop, music notes, "?")
function Overlay({ o, cam, W, H, t }) {
  const p = o.at.clone().project(cam);
  if (p.z > 1) return null;
  const x = (p.x * 0.5 + 0.5) * W, y = (-p.y * 0.5 + 0.5) * H, age = Math.max(0, t - o.t0), s = W / 1080;
  const base = { position: "absolute", left: x, top: y, transform: "translate(-50%,-50%)", fontFamily: "CapFont", fontWeight: 900, color: "#fff",
    WebkitTextStroke: `${7 * s}px #1c130f`, paintOrder: "stroke fill" };
  if (o.kind === "question") { const k = Math.min(1, age / 0.12); return <div style={{ ...base, fontSize: 120 * s, transform: `translate(-50%,-50%) scale(${0.6 + 0.4 * k}) rotate(${8 * Math.sin(t * 6)}deg)` }}>?</div>; }
  if (o.kind === "sweat") { const fall = (age * 0.9) % 1; return <div style={{ ...base, left: x, top: y + fall * 40 * s, width: 26 * s, height: 36 * s, background: "#8fd3ff",
    borderRadius: "50% 50% 50% 50% / 60% 60% 40% 40%", border: `${5 * s}px solid #1c130f`, opacity: 1 - fall * 0.6 }} />; }
  if (o.kind === "notes" || o.kind === "notesFall") {
    return <>{[0, 1, 2].map((i) => { const ph = (age * 0.6 + i / 3) % 1, fall = o.kind === "notesFall" ? Math.min(1, age / 0.6) : 0;
      const dy = o.kind === "notesFall" ? fall * fall * 260 * s : -ph * 120 * s; const op = o.kind === "notesFall" ? 1 - fall : Math.sin(Math.PI * ph);
      return <div key={i} style={{ ...base, left: x + (i - 1) * 46 * s + 10 * Math.sin(t * 3 + i) * s, top: y + dy, fontSize: 64 * s, opacity: op }}>{i === 1 ? "♫" : "♪"}</div>; })}</>;
  }
  return null;
}

export const Video = ({ low = false }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const canvas = useRef(null), ctx = useRef(null);
  const [handle] = useState(() => delayRender("build world", { timeoutInMilliseconds: 240000 }));
  const [, force] = useState(0);
  useEffect(() => {
    let alive = true;
    build(canvas.current, width, height).then(async (c) => { if (!alive) return; ctx.current = c; await c.renderFrame(frame); force((x) => x + 1); continueRender(handle); })
      .catch((e) => { console.error("BUILD_FAIL", e?.stack || e); throw e; });
    return () => { alive = false; ctx.current?.dispose(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (!ctx.current) return;
    const h = delayRender("frame " + frame);
    ctx.current.renderFrame(frame).then(() => { force((x) => x + 1); continueRender(h); });
  }, [frame]);
  const c = ctx.current, t = frame / FPS;
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <canvas ref={canvas} width={width} height={height} style={{ width, height }} />
      {c && (c.lastOverlays || []).map((o, i) => <Overlay key={i} o={o} cam={c.camera} W={width} H={height} t={t} />)}
      <Captions words={WORDS.map(([a, b, w]) => [a, b, w.replace(/["]/g, "")])} />
      <Audio src={staticFile("audio/vo_v4.wav")} />
      <Audio src={staticFile("audio/fx_v01.wav")} />
    </AbsoluteFill>
  );
};
