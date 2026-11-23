// Video 3 composition: the flour mill on the river (world/mill), its effects (world/fx_v03), the cast (new guy, foreman,
// co-worker), props in hands, designed cuts (whip / flash / sepia), 2D gags, captions, sound (voice + pre-mixed fx/music).
import React, { useEffect, useRef, useState } from "react";
import { AbsoluteFill, Audio, continueRender, delayRender, getInputProps, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import * as THREE from "three";
import { createLook } from "../../world/look.js";
import { buildMill } from "../../world/mill/index.js";
import * as FX from "../../world/fx_v03/index.js";
import { prop } from "../../world/props.js";
import { createCharacter } from "../../characters/index.js";
import { SPECS } from "../../characters/specs.js";
import { Captions } from "../../timeline/Captions.jsx";
import { FPS, WORDS, makeDirection } from "./direction.js";

const V = (x, y, z) => new THREE.Vector3(x, y, z);

async function build(canvas, W, H) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, preserveDrawingBuffer: true, powerPreference: "high-performance" });
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(56, W / H, 0.05, 2000);
  const mill = await buildMill({ time: "night" }); scene.add(mill.group);
  const A = mill.anchors;
  // effects
  const science = FX.createScienceStage(); scene.add(science);
  const candle = FX.createCandle({ lit: 0, castShadow: true }), candle2 = FX.createCandle({ lit: 0 });
  const lights = [candle.userData.light, mill.lights.key];
  const top = A.topSpot.pos;
  const haze = FX.createFlourHaze({ box: { min: V(-4.5, top.y + 0.1, -3.5), max: V(4.5, top.y + 3.2, 3.5) }, lights });
  const sparks = FX.createSparkSwirl({ center: A.candleSpot.clone().add(V(0, 0.22, 0)), radius: 0.45 });
  const fireball = FX.createFireball({ path: A.fireballPath });
  const dust = FX.createDustCascade({ segments: A.beamDust.filter((s) => s.a.y > top.y).map((s) => [s.a, s.b]), fallTo: top.y, lights });
  const whiteout = FX.createWhiteout({ box: { min: V(-4.6, top.y, -3.6), max: V(4.6, top.y + 3.4, 3.6) }, lights });
  const puff = FX.createWhiteout({ box: { min: V(-2.6, 1.0, -1.1), max: V(-1.5, 2.2, 0.2) }, lights: [mill.lights.key], count: 40 });
  const explosion = FX.createExplosion({ center: A.millExteriorBlastCenter, scale: 1.2, groundY: 0 });
  const farBoom = FX.createExplosion({ center: V(100, 0, 48), scale: 4.0, groundY: 0, debris: 0 });
  const splash = FX.createSplash({ at: A.riverLanding, flour: false, scale: 0.85 });
  const fxAll = [candle, candle2, haze, sparks, fireball, dust, whiteout, puff, explosion, farBoom, splash];
  for (const o of fxAll) scene.add(o);
  // props
  const lantern = await prop("wooden_lantern_01", { scale: 0.8 });
  { const bb = new THREE.Box3().setFromObject(lantern); lantern.userData.grip = V(0, bb.max.y - 0.03, 0); }
  const matchbox = new THREE.Group();
  { const b = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.016, 0.036), new THREE.MeshStandardMaterial({ color: 0xd9c35a, roughness: 0.7 }));
    const lab = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.017, 0.02), new THREE.MeshStandardMaterial({ color: 0xc22a22, roughness: 0.6 }));
    matchbox.add(b, lab); matchbox.userData.grip = V(0, 0, 0); }
  const P = { candle, candle2, lantern, matchbox };
  for (const o of [lantern, matchbox]) { o.visible = false; scene.add(o); }
  // cast
  const chars = {};
  for (const k of ["newguy", "newguyF", "foreman", "miller2"]) { chars[k] = await createCharacter(SPECS[k === "newguyF" ? "newguy" : k]); scene.add(chars[k].root); }   // newguyF = the SAME spec (clothes never change mid-video)
  const look = createLook(renderer, scene, camera, W, H, {});
  await look.ready;
  const dir = makeDirection({ mill, science: { anchors: science.userData.anchors || science.anchors } });
  const live = { camPos: () => camera.position.clone(), fireballHead: () => (fireball.userData.head ? fireball.userData.head.clone() : null) };
  for (let f = 0; f < Math.round(WORDS[WORDS.length - 1][1] * FPS); f += 3) {       // warm up every face drawing used
    const t = f / FPS; const c = dir.camAt(t); camera.position.copy(c.pos);
    const a = dir.act(t, live); for (const k in chars) if (a.cast[k]?.visible) chars[k].preload?.([a.cast[k].s]);
  }
  await Promise.all(Object.values(chars).map((c) => c.ready?.()));
  const attach = (o, a) => {
    if (!a) { o.visible = false; return; }
    o.visible = true;
    if (a.place) { o.position.copy(a.place); o.rotation.set(0, a.rot ?? 0, 0); }
    else if (a.holder) { const f = chars[a.holder].handFrame(a.side); o.quaternion.copy(f.quaternion); const gp = o.userData.grip; const g = (gp ? (gp.isObject3D ? gp.position : gp) : V(0, 0, 0)).clone().multiply(o.scale).applyQuaternion(o.quaternion); o.position.copy(f.position).sub(g); }
  };
  const state = { last: null }; let curTime = null;
  const exp = { day: 1.15, night: 1.55, science: 1.3, outside: 1.35 };
  return {
    camera, state,
    async renderFrame(frame) {
      const t = frame / FPS;
      const c = dir.camAt(t); const dbg = getInputProps().dbgCam;
      if (dbg) { c.pos = new THREE.Vector3(...dbg.pos); c.target = new THREE.Vector3(...dbg.target); c.fov = dbg.fov ?? 50; }
      camera.position.copy(c.pos); camera.fov = c.fov; camera.lookAt(c.target);
      camera.near = 0.05; camera.far = 2000; camera.updateProjectionMatrix(); camera.updateMatrixWorld();
      const z = dir.zoneAt(t), tm = dir.timeAt(t);
      if (tm !== curTime) { mill.setTime(tm); curTime = tm; }
      look.grade.set("exposure", z === "science" ? exp.science : z === "outside" ? exp.outside : exp[tm]);
      const a = dir.act(t, live), k = a.ctrl;
      mill.group.visible = z !== "science"; science.visible = z === "science";
      mill.set({ blast: k.blast, shake: k.shake, t, glassBroken: k.glassBroken }); mill.update(t, camera);
      // effects (k < 0 = hidden)
      const fxSet = (o, v, ...rest) => { o.visible = v >= 0 && (v > 0.0005 || o === fireball); if (o.visible) o.set(v, t, ...rest); o.setCamera?.(camera); };
      candle.visible = true; candle.set(k.candle, t); candle2.set(0, t);
      fxSet(haze, k.haze); fxSet(sparks, k.sparks); fxSet(fireball, k.fireball); fxSet(dust, k.dust); fxSet(whiteout, k.whiteout);
      const pf = a.overlays.find((o) => o.kind === "flourPuff"); fxSet(puff, pf ? Math.min(1, (t - pf.t0) / 0.15) * (1 - Math.max(0, Math.min(1, (t - pf.t0 - 0.5) / 0.9))) * 0.8 : -1);
      fxSet(explosion, k.explosion); fxSet(farBoom, k.farBoom); fxSet(splash, k.splash);
      if (science.visible) science.set(k.science, t);
      // cast
      const key = dir.keyLightAt(t, z);
      for (const n in chars) { const s = a.cast[n], ch = chars[n];
        if (!s || !s.visible) { ch.root.visible = false; continue; }
        ch.root.visible = true; ch.root.position.copy(s.pos); ch.root.rotation.set(0, s.rot ?? 0, 0);
        ch.update(s.s || {}, { camera, keyLightPos: key, time: t }); }
      // props
      for (const [n, o] of Object.entries(P)) attach(o, a.props[n]);
      if (!a.props.candle) { candle.visible = false; }
      await Promise.all(Object.values(chars).map((c) => c.ready?.()));
      look.render();
      state.last = a;
    },
    dispose() { renderer.dispose(); },
  };
}

function FxLayer({ a, t, W, H }) {
  const ref = useRef(null);
  useEffect(() => {
    const cv = ref.current; if (!cv || !a) return; const g = cv.getContext("2d"); g.clearRect(0, 0, W, H);
    if (a.fx.sepia > 0.001) {                                                    // 1878: film grain + vignette + scratches
      const r = (n) => { const x = Math.sin(n * 12.9898 + Math.floor(t * 24) * 78.233) * 43758.5453; return x - Math.floor(x); };
      g.fillStyle = "rgba(40,28,14,0.10)"; for (let i = 0; i < 260; i++) g.fillRect(r(i) * W, r(i + 500) * H, 2, 2);
      g.fillStyle = "rgba(255,240,210,0.10)"; for (let i = 0; i < 160; i++) g.fillRect(r(i + 900) * W, r(i + 1300) * H, 2, 2);
      g.fillStyle = "rgba(30,20,10,0.25)"; for (let i = 0; i < 2; i++) g.fillRect(r(i + 77) * W, 0, 1.5, H);
      const v = g.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.75); v.addColorStop(0, "rgba(0,0,0,0)"); v.addColorStop(1, "rgba(30,18,6,0.55)");
      g.fillStyle = v; g.fillRect(0, 0, W, H);
    }
    if (a.fx.red > 0.002) {                                                      // red alarm glow: deep red edges + a light red wash
      const r = a.fx.red, v = g.createRadialGradient(W / 2, H / 2, H * 0.18, W / 2, H / 2, H * 0.72);
      v.addColorStop(0, `rgba(220,30,24,${0.16 * r})`); v.addColorStop(1, `rgba(170,10,10,${0.62 * r})`);
      g.fillStyle = v; g.fillRect(0, 0, W, H);
    }
    if (a.fx.flash > 0.001) { g.fillStyle = `rgba(255,250,235,${0.9 * a.fx.flash})`; g.fillRect(0, 0, W, H); }
  });
  return <canvas ref={ref} width={W} height={H} style={{ position: "absolute", left: 0, top: 0, width: W, height: H }} />;
}

function Overlay({ o, cam, W, H, t }) {
  const s = W / 1080, age = Math.max(0, t - o.t0);
  if (o.kind === "title") { const k = Math.min(1, age / 0.25);
    return <div style={{ position: "absolute", left: 0, right: 0, top: H * 0.16, textAlign: "center", fontFamily: "Georgia, 'Times New Roman', serif", fontWeight: 900,
      fontSize: 190 * s, color: "#f3e3c2", letterSpacing: 6 * s, opacity: k, transform: `scale(${1.25 - 0.25 * k})`, textShadow: `0 ${6 * s}px ${18 * s}px rgba(30,18,6,0.8)` }}>{o.text}</div>; }
  const p = o.at.clone().project(cam); if (p.z > 1) return null;
  const x = (p.x * 0.5 + 0.5) * W, y = (-p.y * 0.5 + 0.5) * H;
  if (o.kind === "nope") {                                                      // red X stamped on: overshoot then settle
    const k = Math.min(1, age / 0.12), sc = k < 1 ? 1.8 - 0.8 * k : 1 + 0.06 * Math.exp(-age * 9) * Math.sin(age * 40);
    const L = 230 * s, bar = { position: "absolute", left: -L / 2, top: -18 * s, width: L, height: 36 * s, background: "#e02a22", borderRadius: 14 * s, border: `${6 * s}px solid #2a1208` };
    return <div style={{ position: "absolute", left: x, top: y, transform: `scale(${sc})`, opacity: Math.min(1, age / 0.06) }}>
      <div style={{ ...bar, transform: "rotate(45deg)" }} /><div style={{ ...bar, transform: "rotate(-45deg)" }} /></div>;
  }
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
  const wb = a?.fx.whip ?? 0, sp = a?.fx.sepia ?? 0;
  const filter = `sepia(${0.85 * sp}) contrast(${1 + 0.12 * sp}) brightness(${1 + 0.05 * sp}) blur(${(14 * wb * width) / 1080}px)`;
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <canvas ref={canvas} width={width} height={height} style={{ width, height, filter }} />
      {a && <FxLayer a={a} t={t} W={width} H={height} />}
      {c && a && a.overlays.map((o, i) => <Overlay key={i} o={o} cam={c.camera} W={width} H={height} t={t} />)}
      <Captions words={WORDS.map(([s, e, w]) => [s, e, w.replace(/["]/g, "")])} />
      <Audio src={staticFile("audio/vo_v03.wav")} />
      <Audio src={staticFile("audio/fx_v03.wav")} />
    </AbsoluteFill>
  );
};
