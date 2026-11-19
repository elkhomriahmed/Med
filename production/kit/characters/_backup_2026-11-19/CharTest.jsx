// Character test bench (plain floor, warm lamp + cool moon + face fill, simple tone mapping).
//   npx remotion still characters/test/index.js Cast characters/out/cast.png --gl=angle
//   npx remotion still characters/test/index.js Poses characters/out/poses_<n>.png --gl=angle --frame=N
//   npx remotion render characters/test/index.js Seq characters/out/seq --sequence --image-format=png --gl=angle
import React, { useEffect, useRef, useState } from "react";
import { AbsoluteFill, continueRender, delayRender, useCurrentFrame, useVideoConfig } from "remotion";
import * as THREE from "three";
import { createCharacter, armAt, visemeAt } from "../index.js";
import { SPECS, KEEPER, ENGINEER } from "../specs.js";

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const LAMP = V(0.0, 1.75, -1.0);

function baseScene(canvas, W, H) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
  renderer.setSize(W, H, false); renderer.setPixelRatio(1);
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene(); scene.background = new THREE.Color("#2b2f4d");
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.MeshStandardMaterial({ color: "#b58451", roughness: 0.85 }));
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
  const back = new THREE.Mesh(new THREE.PlaneGeometry(40, 12), new THREE.MeshStandardMaterial({ color: "#4a3a30", roughness: 0.9 }));
  back.position.set(0, 6, -3.5); back.receiveShadow = true; scene.add(back);
  const key = new THREE.PointLight("#ffbf7a", 12, 0, 2); key.position.copy(LAMP); key.castShadow = true; key.shadow.mapSize.set(2048, 2048); key.shadow.bias = -0.002; scene.add(key);
  const lampBall = new THREE.Mesh(new THREE.SphereGeometry(0.12, 24, 16), new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 0.8, 0.5).multiplyScalar(4) })); lampBall.position.copy(LAMP); scene.add(lampBall);
  const moon = new THREE.DirectionalLight(new THREE.Color(0.45, 0.58, 1.0), 0.9); moon.position.set(3, 4, -2); scene.add(moon);
  const fill = new THREE.SpotLight("#ffd2a0", 18, 0, 0.8, 0.8, 2); fill.position.set(0.4, 2.3, 4.0); fill.target.position.set(0, 1.0, 0); scene.add(fill, fill.target);
  scene.add(new THREE.HemisphereLight("#6a78a8", "#8a5a30", 0.5));
  return { renderer, scene, key, lampBall };
}
const mark = (scene, color = "#3cff7a", r = 0.025) => { const m = new THREE.Mesh(new THREE.SphereGeometry(r, 12, 8), new THREE.MeshBasicMaterial({ color })); scene.add(m); return m; };

/** generic Remotion wrapper: build(canvas,W,H) once, then frameFn(ctx, frame) -> info string */
function useBench(build, frameFn) {
  const frame = useCurrentFrame(); const { width, height } = useVideoConfig();
  const canvas = useRef(null), ctx = useRef(null); const [info, setInfo] = useState("");
  const [handle] = useState(() => delayRender("build", { timeoutInMilliseconds: 120000 }));
  useEffect(() => {
    let alive = true; const h = delayRender("frame " + frame, { timeoutInMilliseconds: 120000 });
    (async () => {
      if (!ctx.current) ctx.current = await build(canvas.current, width, height);
      if (!alive) return;
      const s = await frameFn(ctx.current, frame);
      setInfo(s || "");
      setTimeout(() => { continueRender(h); continueRender(handle); }, 0);
    })().catch((e) => { console.error("BENCH_FAIL", e?.stack || e); throw e; });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frame]);
  return { canvas, info, width, height };
}
const Frame = ({ b, label = true }) => (
  <AbsoluteFill style={{ backgroundColor: "#000" }}>
    <canvas ref={b.canvas} width={b.width} height={b.height} style={{ width: b.width, height: b.height }} />
    {label && <div style={{ position: "absolute", left: 20, top: 20, right: 20, color: "#fff", font: "26px monospace", textShadow: "0 0 4px #000" }}>{b.info}</div>}
  </AbsoluteFill>
);

// ------------------------------------------------------------------ CAST lineup
const CAST = ["kid", "lady", "baker", "fisher", "keeper", "engineer", "captain", "sailorA", "sailorB"];
export const Cast = () => {
  const b = useBench(async (canvas, W, H) => {
    const { renderer, scene, key, lampBall } = baseScene(canvas, W, H); key.position.set(0.5, 3.2, 2.2); lampBall.position.copy(key.position);
    const camera = new THREE.PerspectiveCamera(58, W / H, 0.05, 100);
    const chars = await Promise.all(CAST.map((k) => createCharacter(SPECS[k])));
    chars.forEach((c, i) => { c.root.position.set(-1.6 + (i % 5) * 0.8, 0, i < 5 ? 0.5 : -0.6); if (i >= 5) c.root.position.x += 0.4; c.root.rotation.y = 0.25 - 0.12 * (i % 5); scene.add(c.root); });
    return { renderer, scene, camera, chars };
  }, async ({ renderer, scene, camera, chars }, frame) => {
    // frame 0: eye level (y 1.45, back row raised on a step so every face shows); frame 1: ~1 m above the heads
    chars.forEach((c, i) => (c.root.position.y = i >= 5 ? 0.62 : 0));
    if (frame === 0) { camera.position.set(0, 1.45, 6.6); camera.lookAt(0, 1.55, 0); } else { camera.position.set(0, 2.6, 6.3); camera.lookAt(0, 1.3, -0.1); }
    const opt = { camera, keyLightPos: V(0.5, 3.2, 2.2) };
    const t0 = performance.now(); const N = 10;
    for (let i = 0; i < N; i++) chars.forEach((c, k) => c.update({ expression: ["happy", "smug", "proud", "skeptical", "neutral", "neutral", "proud", "happy", "laugh"][k], gaze: k < 4 ? "_R" : k > 5 ? "_L" : "",
      armL: { pose: ["fistsUp", "rest", "hold", "rest", "hip", "rest", "hip", "rest", "wave"][k], phase: 0.2 }, armR: { pose: ["fistsUp", "present", "rest", "hold", "hip", "present", "rest", "hip", "rest"][k], phase: 0.2 } }, opt));
    const upd = (performance.now() - t0) / N / chars.length;
    await Promise.all(chars.map((c) => c.ready()));
    renderer.render(scene, camera); renderer.getContext().finish();
    const t1 = performance.now(); renderer.render(scene, camera); const px = new Uint8Array(4); const gl = renderer.getContext(); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
    return `cast ${frame ? 'high' : 'eye level'} | update ${upd.toFixed(2)} ms/char | render ${(performance.now() - t1).toFixed(1)} ms`;
  });
  return <Frame b={b} />;
};

// ------------------------------------------------------------------ POSES (keeper left, engineer right; green dots = targets, boxes = attached props)
// [label, keeperState, engineerState, targets {k?, e?}]  targets are world points relative to each character's root
const KP = V(-0.55, 0, 0), EP = V(0.6, 0, 0);
export const POSE_LIST = [
  ["crank (phase .0/.35)", (T) => ({ expression: "angry", armL: { pose: "crank", target: T.kc, phase: 0.0, r: 0.09 }, armR: { pose: "hip" }, lean: 0.08 }),
    (T) => ({ expression: "neutral", armR: { pose: "crank", target: T.ec, phase: 0.35, r: 0.09 }, armL: { pose: "crank", target: T.ec, phase: 0.35, r: 0.09 } }), "crank"],
  ["polish / pour", (T) => ({ expression: "happy", armL: { pose: "polish", target: T.kp, phase: 0.3 }, armR: { pose: "hold" } }),
    (T) => ({ expression: "smug", armR: { pose: "pour", amount: 0.8 }, armL: { pose: "rest" } }), "polish"],
  ["poke / pokeChest", (T) => ({ expression: "skeptical", mouth: "_A", armL: { pose: "pokeChest", target: T.echest }, armR: { pose: "rest" }, turn: 0.4 }),
    (T) => ({ expression: "neutral", armR: { pose: "poke", target: T.lensPt, phase: 0 }, armL: { pose: "rest" } }), "poke"],
  ["slapKnee / fistsUp", () => ({ expression: "laugh", mouth: "_A", lean: 0.2, armL: { pose: "slapKnee", phase: 0.5 }, armR: { pose: "slapKnee", phase: 0.0 } }),
    () => ({ expression: "angry", mouth: "_O", armL: { pose: "fistsUp", phase: 0.25 }, armR: { pose: "fistsUp", phase: 0.25 } }), null],
  ["handshake / tapHead", (T) => ({ expression: "happy", armL: { pose: "handshake", target: T.shake }, armR: { pose: "rest" }, turn: 0.5 }),
    () => ({ expression: "smug", armR: { pose: "tapHead", phase: 0.25 }, armL: { pose: "hip" } }), "shake"],
  ["climb (leg on barrel) / hold", (T) => ({ expression: "worried", armL: { pose: "climb", target: T.rimL }, armR: { pose: "climb", target: T.rimR }, legR: { target: T.barrelTop, lift: 1 }, lean: 0.25, turn: 0.0 }),
    () => ({ expression: "neutral", armR: { pose: "hold" }, armL: { pose: "hold" } }), "barrel"],
  ["sit (floor, sleep) / sit (seat .45)", () => ({ expression: "sleepy", mouth: "_blink", sit: 1, seat: 0, nod: 0.25, tilt: 0.3, armL: { pose: "limp" }, armR: { pose: "limp" } }),
    () => ({ expression: "neutral", sit: 1, seat: 0.40, armL: { pose: "rest" }, armR: { pose: "fold" } }), "seat"],
  ["mimic (kid) / fold+pointAcross", () => ({ expression: "angry", mouth: "_O", armL: { pose: "mimic", phase: 0.5 }, armR: { pose: "mimic", phase: 0.5 } }),
    (T) => ({ expression: "skeptical", point: { target: T.far, hand: "R" } }), null],
];
export const Poses = () => {
  const b = useBench(async (canvas, W, H) => {
    const { renderer, scene } = baseScene(canvas, W, H);
    const camera = new THREE.PerspectiveCamera(62, W / H, 0.05, 100); camera.position.set(0.05, 1.25, 3.4); camera.lookAt(0, 0.9, 0);
    const [K, E] = await Promise.all([createCharacter(KEEPER), createCharacter(ENGINEER)]);
    K.root.position.copy(KP); E.root.position.copy(EP); K.root.rotation.y = 0.35; E.root.rotation.y = -0.35; scene.add(K.root, E.root);
    const props = new THREE.Group(); scene.add(props);
    const marks = Array.from({ length: 6 }, () => mark(scene));
    const handProps = { L: [], R: [] };
    for (const ch of [K, E]) for (const s of ["L", "R"]) { const m = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.03, 0.03), new THREE.MeshStandardMaterial({ color: "#3cbcff" })); m.castShadow = true; scene.add(m); handProps[s].push(m); }
    return { renderer, scene, camera, K, E, props, marks, handProps };
  }, async ({ renderer, scene, camera, K, E, props, marks, handProps }, frame) => {
    const [label, ks, es, set] = POSE_LIST[frame % POSE_LIST.length];
    props.clear(); marks.forEach((m) => (m.visible = false));
    const T = {
      kc: V(-0.25, 1.0, 0.45), ec: V(0.45, 1.05, 0.5), kp: V(-0.20, 1.05, 0.45), echest: V(0.52, 1.05, 0.15), lensPt: V(0.20, 1.25, 0.5),
      shake: V(0.0, 0.98, 0.35), barrelTop: V(-0.42, 0.62, 0.42), rimL: V(-0.40, 0.66, 0.38), rimR: V(-0.62, 0.66, 0.40), far: V(-1.6, 1.5, 0.4),
    };
    if (set === "barrel") { const br = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.42, 24), new THREE.MeshStandardMaterial({ color: "#8a5a30" })); br.position.set(-0.30, 0.21, 0.55); br.castShadow = true; props.add(br); T.barrelTop.set(-0.27, 0.44, 0.50); T.rimL.set(-0.16, 0.45, 0.45); T.rimR.set(-0.40, 0.45, 0.42); }
    if (set === "seat") { const st = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.40, 0.36), new THREE.MeshStandardMaterial({ color: "#6a4a30" })); st.position.set(0.6, 0.2, -0.08); st.castShadow = true; props.add(st); }
    const pts = set === "crank" ? [T.kc, T.ec] : set === "polish" ? [T.kp] : set === "poke" ? [T.echest, T.lensPt] : set === "shake" ? [T.shake] : set === "barrel" ? [T.rimL, T.rimR, T.barrelTop] : [];
    pts.forEach((p, i) => { marks[i].visible = true; marks[i].position.copy(p); });
    const opt = { camera, keyLightPos: LAMP };
    const t0 = performance.now(); for (let i = 0; i < 10; i++) { K.update(ks(T), opt); E.update(es(T), opt); } const upd = (performance.now() - t0) / 20;
    // prop attachment test: a small bar placed in each hand frame (x = finger direction)
    [K, E].forEach((ch, ci) => ["L", "R"].forEach((s) => { const f = ch.handFrame(s); const m = handProps[s][ci]; m.position.copy(f.position); m.quaternion.copy(f.quaternion); }));
    await Promise.all([K.ready(), E.ready()]);
    renderer.render(scene, camera);
    return `${frame}: ${label} | update ${upd.toFixed(2)} ms/char`;
  });
  return <Frame b={b} />;
};

// ------------------------------------------------------------------ SEQ: 4 s talking + gesturing (every arm pose blended with armAt, turns, nods)
const W8 = "Son I have turned that lens by hand for thirty years you cannot float glass on metal".split(" ");
const WORDS = W8.map((w, i) => [0.15 + i * 0.22, 0.15 + i * 0.22 + 0.19, w]);
const ss = (x) => { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); };
const keyed = (keys, t) => { let v = keys[0][1]; for (const [tk, vk, d] of keys) if (t >= tk - d) v = v + (vk - v) * ss((t - (tk - d)) / d); return v; };
const mouthAt = (t) => visemeAt(WORDS, t);
export function seqState(t) {
  const lens = V(0.0, 1.3, -0.6), eHead = V(0.62, 1.47, 0.1), kHead = V(-0.6, 1.47, 0.15);
  const K = {
    expression: t < 1.6 ? "smug" : t < 2.6 ? "proud" : "skeptical", gaze: t < 1.0 ? "_R" : t < 2.0 ? "" : "_R", mouth: mouthAt(t) || ((t > 3.7 && t < 3.82) ? "_blink" : ""),
    turn: keyed([[0, 0.3, 0.2], [1.0, 0.65, 0.35], [2.0, 0.2, 0.35], [3.0, 0.55, 0.35]], t),
    nod: keyed([[0, 0, 0.2], [0.8, 0.10, 0.2], [1.2, -0.06, 0.2], [2.4, 0.08, 0.2], [3.2, -0.04, 0.2]], t),
    tilt: keyed([[0, 0.06, 0.2], [1.5, -0.08, 0.3], [2.8, 0.10, 0.3]], t), lean: keyed([[0, 0, 0.2], [2.2, 0.08, 0.3], [3.4, -0.04, 0.3]], t),
    bob: 0.004 * Math.sin(t * 2.2), side: 0.02 * Math.sin(t * 1.3),
    armL: armAt([[0, { pose: "hip" }], [0.4, { pose: "thumbChest" }], [0.9, { pose: "point", target: lens }], [1.4, { pose: "crank", target: V(-0.25, 1.0, 0.55), phase: t * 1.6 }],
      [2.0, { pose: "fingerUp" }], [2.6, { pose: "pokeChest", target: eHead.clone().add(V(-0.05, -0.42, 0.05)), phase: t * 2.5 }], [3.3, { pose: "shrug" }]], t),
    armR: armAt([[0, { pose: "hip" }], [0.5, { pose: "rest" }], [1.9, { pose: "fold" }], [2.7, { pose: "rest" }], [3.3, { pose: "shrug" }]], t),
  };
  const G = {
    expression: t < 1.2 ? "neutral" : t < 2.6 ? "smug" : "happy", gaze: t < 2 ? "_L" : "", mouth: (t > 1.1 && t < 1.22) || (t > 3.0 && t < 3.12) ? "_blink" : "",
    turn: keyed([[0, -0.35, 0.2], [1.5, -0.7, 0.4], [3.0, -0.2, 0.4]], t), nod: keyed([[0, 0, 0.2], [1.8, 0.10, 0.15], [2.1, -0.03, 0.15], [2.4, 0.08, 0.15], [2.7, 0, 0.15]], t),
    tilt: keyed([[0, -0.06, 0.2], [1.0, 0.12, 0.3], [2.5, -0.05, 0.3]], t), bob: 0.004 * Math.sin(t * 2.0 + 1.7), side: -0.02 * Math.sin(t * 1.1),
    armL: armAt([[0, { pose: "rest" }], [0.6, { pose: "fold" }], [1.6, { pose: "fingerUp" }], [2.2, { pose: "tapHead", phase: t * 2 }], [3.0, { pose: "handshake", target: kHead.clone().add(V(0.5, -0.5, 0.25)) }]], t),
    armR: armAt([[0, { pose: "rest" }], [0.6, { pose: "fold" }], [1.6, { pose: "present" }], [2.4, { pose: "point", target: lens }], [3.2, { pose: "wave", phase: t * 1.5 }]], t),
  };
  return { K, G };
}
export const Seq = () => {
  const b = useBench(async (canvas, W, H) => {
    const { renderer, scene } = baseScene(canvas, W, H);
    const camera = new THREE.PerspectiveCamera(60, W / H, 0.05, 100);
    const [K, E] = await Promise.all([createCharacter(KEEPER), createCharacter(ENGINEER)]);
    K.root.position.set(-0.6, 0, 0.15); E.root.position.set(0.62, 0, 0.1); scene.add(K.root, E.root);
    const all = []; for (let f = 0; f < 120; f++) all.push(seqState(f / 30));
    await K.preload(all.map((s) => s.K)); await E.preload(all.map((s) => s.G));
    const props = { L: mark(scene, "#3cbcff", 0.03), R: mark(scene, "#3cbcff", 0.03) };
    return { renderer, scene, camera, K, E, props };
  }, async ({ renderer, scene, camera, K, E, props }, frame) => {
    const t = frame / 30;
    const a = -0.25 + 0.5 * ss(t / 4);                      // slow continuous orbit + push (one spline)
    camera.position.set(Math.sin(a) * (3.2 - 0.5 * ss(t / 4)), 1.3 + 0.1 * Math.sin(t * 0.8), Math.cos(a) * (3.2 - 0.5 * ss(t / 4))); camera.lookAt(0, 1.05, 0);
    const s = seqState(t); const opt = { camera, keyLightPos: LAMP, time: t };
    const t0 = performance.now(); K.update(s.K, opt); E.update(s.G, opt); const upd = (performance.now() - t0) / 2;
    const f = K.handFrame("R"); props.R.position.copy(f.position); props.L.position.copy(E.handFrame("L").position);
    await Promise.all([K.ready(), E.ready()]);
    renderer.render(scene, camera);
    return null && upd;
  });
  return <Frame b={b} label={false} />;
};

// ------------------------------------------------------------------ HAIR CHECK: engineer seen from ~0.3 m above eye level, 1.9 m, fov 86
// frame 0 = from his left-front, frame 1 = from his right-front
export const HairCheck = () => {
  const b = useBench(async (canvas, W, H) => {
    const { renderer, scene } = baseScene(canvas, W, H);
    const camera = new THREE.PerspectiveCamera(86, W / H, 0.05, 100);
    const E = await createCharacter(ENGINEER); scene.add(E.root);
    return { renderer, scene, camera, E };
  }, async ({ renderer, scene, camera, E }, frame) => {
    E.update({ expression: "neutral" }, { camera, keyLightPos: LAMP }); const hc = E.headCenter();
    const az = [0.75, -0.75, 1.3, -1.3][frame]; const eye = hc.y + 0.05;
    camera.position.set(Math.sin(az) * 1.88, eye + 0.3, Math.cos(az) * 1.88); camera.lookAt(hc.x, hc.y - 0.25, hc.z);
    E.update({ expression: "neutral", gaze: frame % 2 === 0 ? "_R" : "_L" }, { camera, keyLightPos: LAMP });
    await E.ready(); renderer.render(scene, camera);
    return `hair check ${["left-front", "right-front", "left 75deg", "right 75deg"][frame]} +0.3 m, 1.9 m, fov 86`;
  });
  return <Frame b={b} />;
};
