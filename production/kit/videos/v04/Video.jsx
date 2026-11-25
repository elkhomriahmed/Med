// Video 4 composition: the office parking lot at noon (world/lot), the hero car + bottle + burn FX (world/car, world/fx_v04),
// the optics macro stage, the cast (driver, coworker, 2017 Idaho man), props, designed cuts (whip / flash / sepia), red alarm glow,
// captions, sound (voice + pre-mixed fx/music).
import React, { useEffect, useRef, useState } from "react";
import { AbsoluteFill, Audio, continueRender, delayRender, getInputProps, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import * as THREE from "three";
import { createLook } from "../../world/look.js";
import { buildLot } from "../../world/lot/index.js";
import { buildHeroCar, createBottle, loadCarModel } from "../../world/car/index.js";
import { createBurnSpot, createHeatHaze, createOpticsStage } from "../../world/fx_v04/index.js";
import { createCharacter } from "../../characters/index.js";
import { SPECS } from "../../characters/specs.js";
import { Captions } from "../../timeline/Captions.jsx";
import { FPS, WORDS, makeDirection } from "./direction.js";
import { runAudit } from "./audit.js";

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const mat = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.5, ...o });

async function build(canvas, W, H) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, preserveDrawingBuffer: true, powerPreference: "high-performance" });
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(52, W / H, 0.03, 2000);
  const lot = await buildLot({}); scene.add(lot.group);
  const A = lot.anchors;
  scene.fog = new THREE.FogExp2(0xd8c8b0, 0.0085);   // aerial depth (STYLE_BIBLE: depth fog per scene): far rows, trees, buildings fade into cool haze
  // STYLE light logic (warm key pools vs cool shadows, real darks): warmer, stronger sun; cooler, weaker sky fill -> shadows + form read
  { const L = lot.lights; L.key.color.set(0xffc583); L.key.intensity = 3.6; if ('intensity' in L.key.shadow) L.key.shadow.intensity = 0.9;
    L.hemi.color.set(0x9dbbe6); L.hemi.groundColor.set(0xa07c58); L.hemi.intensity = 1.15; }   // warm golden sun + warm ground bounce, cool sky in the shadows
  const car = await buildHeroCar({}); car.position.copy(A.heroBay.pos || A.heroBay); car.rotation.y = 0; scene.add(car); car.updateMatrixWorld(true);
  const CA = car.anchors;
  const parked = [];
  // more parked cars around the hero bay (same toy-car builder, other paints); the driver-door side (-x) stays clear
  for (const [x, z, yaw, paint] of [[5.15, -4.0, 0, "#2f7f8f"]]) {
    const pc = await loadCarModel("buick_coupe", { length: 4.9 }); void paint; pc.position.set(x, 0, z); pc.rotation.y = yaw; scene.add(pc); parked.push(pc); }
  const bottle = createBottle({}); scene.add(bottle);
  const burn = createBurnSpot({ at: CA.seatBurnPoint, normal: CA.seatNormal, bottle }); car.add(burn);
  const haze = createHeatHaze({}); car.add(haze);
  const optics = createOpticsStage({}); scene.add(optics);
  // small props
  const keys = new THREE.Group();
  { const r = new THREE.Mesh(new THREE.TorusGeometry(0.018, 0.003, 8, 20), mat(0xc8ccd2, { metalness: 0.9, roughness: 0.3 })); keys.add(r);
    for (const [x, rz] of [[0.035, 0.3], [0.03, -0.5]]) { const k = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.012, 0.003), mat(0xb9bec6, { metalness: 0.9, roughness: 0.3 })); k.position.set(x, -0.01, 0); k.rotation.z = rz; keys.add(k); }
    const fob = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.045, 0.012), mat(0x1c1f24)); fob.position.set(-0.02, -0.03, 0); keys.add(fob); }
  const mug = new THREE.Group();
  { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.036, 0.09, 20), mat(0xf2f2ee)); mug.add(c);
    const h = new THREE.Mesh(new THREE.TorusGeometry(0.025, 0.007, 8, 16, Math.PI), mat(0xf2f2ee)); h.position.set(0.045, 0, 0); h.rotation.z = -Math.PI / 2; mug.add(h);
    mug.userData.grip = V(0.06, 0, 0); }
  const lighter = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.14, 0.025), mat(0xd8322a)); lighter.rotation.z = Math.PI / 2;
  const spray = new THREE.Group(); { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.26, 20), mat(0x2c7fd6, { metalness: 0.6, roughness: 0.35 })); spray.add(c);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.04, 16), mat(0xf2f2ee)); cap.position.y = 0.12; spray.add(cap); spray.rotation.z = Math.PI / 2; }
  const shades = new THREE.Group(); { for (const s of [-1, 1]) { const l = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.042, 0.008, 20), mat(0x141820, { metalness: 0.4, roughness: 0.2 })); l.position.x = s * 0.055; l.rotation.x = Math.PI / 2; shades.add(l); }
    const br = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.006, 0.006), mat(0x141820)); shades.add(br); }
  const chestDot = new THREE.Mesh(new THREE.CircleGeometry(0.03, 24), new THREE.MeshBasicMaterial({ color: new THREE.Color(4, 3.2, 2.2), transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
  for (const o of [keys, mug, lighter, spray, shades, chestDot]) { o.visible = false; scene.add(o); }
  // cast
  const chars = {};
  for (const k of ["driver", "coworker", "idahoMan", "extraSuit", "extraTeal", "extraBlue"]) { chars[k] = await createCharacter(SPECS[k]); scene.add(chars[k].root); }
  const look = createLook(renderer, scene, camera, W, H, { hdri: false, ao: getInputProps().noAO ? false : undefined, grade: { exposure: lot.hint.exposure } });
  await look.ready;
  lot.makeEnvironment(renderer, scene);
  const dir = makeDirection({ lot, car, optics: { anchors: optics.anchors || optics.userData.anchors } });
  const live = { camPos: () => camera.position.clone() };
  for (let f = 0; f < Math.round(WORDS[WORDS.length - 1][1] * FPS); f += 3) {
    const t = f / FPS; const c = dir.camAt(t); camera.position.copy(c.pos);
    const a = dir.act(t, live); for (const k in chars) if (a.cast[k]?.visible) chars[k].preload?.([a.cast[k].s]);
  }
  await Promise.all(Object.values(chars).map((c) => c.ready?.()));
  const gripOf = (o) => { const gp = o.userData.grip; return gp ? (gp.isObject3D ? gp.getWorldPosition(new THREE.Vector3()).sub(o.getWorldPosition(new THREE.Vector3())) : gp.clone()) : V(0, 0, 0); };
  const toHand = (o, who, side, extraRot = null) => { const f = chars[who].handFrame(side); o.quaternion.copy(f.quaternion); if (extraRot) o.quaternion.multiply(extraRot);
    o.position.copy(f.position); o.updateMatrixWorld(true); o.position.sub(gripOf(o)); };
  const seatPos = CA.driverSeatTop.clone().applyMatrix4(car.matrixWorld);
  const upright = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, Math.PI / 2));
  const applyFrame = (t) => {
      const c = dir.camAt(t); const dbg = getInputProps().dbgCam;
      if (dbg) { c.pos = new THREE.Vector3(...dbg.pos); c.target = new THREE.Vector3(...dbg.target); c.fov = dbg.fov ?? 50; }
      camera.position.copy(c.pos); camera.fov = c.fov; camera.lookAt(c.target); camera.near = 0.03; camera.updateProjectionMatrix(); camera.updateMatrixWorld();
      const z = dir.zoneAt(t);
      look.grade.set("exposure", z === "optics" ? 1.3 : lot.hint.exposure);
      { const ext = z === "lot"; look.grade.set("contrast", ext ? 0.26 : 0.18); look.grade.set("sat", ext ? 1.36 : 1.3); look.grade.set("warm", ext ? 0.11 : 0.06);
        look.grade.set("cool", ext ? 0.16 : 0.10); look.grade.set("vig", ext ? 0.34 : 0.28); }   // outdoor depth grade (warm highlights / cool shadows)
      const a = dir.act(t, live), k = a.ctrl;
      lot.group.visible = z !== "optics"; car.visible = z !== "optics"; optics.visible = z === "optics";
      lot.set({ t }); lot.update(t, camera);
      car.set({ door: k.door }); car.updateMatrixWorld(true);
      haze.visible = k.haze > 0.001; if (haze.visible) haze.set(k.haze, t);
      if (optics.visible) { optics.setCamera?.(camera); optics.set(k.optics, t); }
      // cast
      const key = dir.keyLightAt(t);
      for (const n in chars) { const s = a.cast[n], ch = chars[n];
        if (!s || !s.visible) { ch.root.visible = false; continue; }
        ch.root.visible = true; ch.root.position.copy(s.pos); ch.root.rotation.set(0, s.rot ?? 0, 0);
        ch.update(s.s || {}, { camera, keyLightPos: key, time: t }); }
      return { a, c, z };
  };
  const state = { last: null };
  return {
    camera, state,
    async renderFrame(frame) {
      const t = frame / FPS;
      const { a, c, z } = applyFrame(t); const k = a.ctrl;
      if (getInputProps().audit && !state.audited) { state.audited = true;
        runAudit({ dir, chars, car, cars: parked, lot, optics, camera, live, FPS, END: WORDS[WORDS.length - 1][1] + 0.3, applyFrame }); applyFrame(t); }
      // bottle AFTER the characters are updated (hand frames are current) and BEFORE the burn spot (the dot follows its roll)
      const b = a.props.bottle; bottle.visible = !!b && z !== "optics";
      if (b && b.seat) { bottle.position.copy(seatPos); bottle.quaternion.copy(car.quaternion); bottle.set({ rock: t }); }
      else if (b && b.holder) { bottle.set({ rock: 0, amp: 0 }); toHand(bottle, b.holder, b.side, b.upright ? upright : null); if (getInputProps().dbgBottle) console.log("BOTTLE", JSON.stringify(bottle.position), bottle.visible, JSON.stringify(chars[b.holder].handFrame(b.side).position)); }
      else if (b && b.arc) { const p0 = V(1.05, 1.15, -3.55), kk = b.arc.k; bottle.position.copy(p0.clone().lerp(seatPos, kk)); bottle.position.y += Math.sin(Math.PI * kk) * 0.35;
        bottle.quaternion.copy(car.quaternion); bottle.rotateZ((1 - kk) * 2.5); bottle.set({ rock: 0, amp: 0 }); }
      burn.visible = z !== "optics"; burn.setCamera?.(camera); burn.set(k.burn, t);
      // small props
      mug.visible = !!a.props.mug; if (mug.visible) toHand(mug, "coworker", "R");
      keys.visible = !!a.props.keys; if (keys.visible) { const q = a.props.keys, p = q.from.clone().lerp(q.to, q.fly); p.y += Math.sin(Math.PI * Math.min(1, q.fly)) * 0.8 * (1 - q.fly * 0.3);
        if (q.fly >= 1) p.y = q.to.y; keys.position.copy(p); keys.rotation.set(q.fly * 9, q.fly * 6, q.fly >= 1 ? Math.PI / 2 : q.fly * 4); }
      lighter.visible = spray.visible = shades.visible = !!a.props.lighter;
      if (lighter.visible) { lighter.position.copy((CA.dashLighter || V(-0.1, 0.975, -0.72)).clone().applyMatrix4(car.matrixWorld)); spray.position.copy((CA.passSeat || V(0.4, 0.62, 0.0)).clone().applyMatrix4(car.matrixWorld));
        shades.position.copy((CA.dashShades || V(0.3, 0.985, -0.75)).clone().applyMatrix4(car.matrixWorld)); const m = a.props.shades.melt; shades.scale.set(1 + 0.25 * m, 1 - 0.55 * m, 1); shades.rotation.x = 0.4 * m; }
      chestDot.visible = k.chestDot > 0.001;
      if (chestDot.visible) { const d = chars.driver, hc = d.headCenter(), yaw = a.cast.driver.rot, f = V(Math.sin(yaw), 0, Math.cos(yaw));
        chestDot.position.copy(hc).add(V(0, -0.62, 0)).addScaledVector(f, 0.17); chestDot.lookAt(chestDot.position.clone().add(f));
        chestDot.material.opacity = k.chestDot; chestDot.scale.setScalar(0.6 + 0.6 * k.chestDot); }
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
      // calm old-photo look: warm vignette only (no per-frame grain or scratches = no jitter)
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
      <Audio src={staticFile("audio/vo_v04.wav")} />
      <Audio src={staticFile("audio/fx_v04.wav")} />
    </AbsoluteFill>
  );
};
