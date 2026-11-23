// VIDEO 2 (2026-11-19) character bench: cast, pose sheets, robber sequence. Same lights/floor as CharTest.jsx.
//   npx remotion still characters/test/index.js Cast2 characters/out/cast_v02.png --gl=angle   (--frame=1 high camera, 2 = 3/4)
//   npx remotion still characters/test/index.js Poses2 characters/out/poses_v02_<n>.png --gl=angle --frame=N
//   npx remotion render characters/test/index.js Seq2 characters/out/seq_v02 --sequence --image-format=png --gl=angle
import React, { useEffect, useRef, useState } from "react";
import { AbsoluteFill, continueRender, delayRender, useCurrentFrame, useVideoConfig, getInputProps } from "remotion";
import * as THREE from "three";
import { createCharacter, armAt, visemeAt } from "../index.js";
import { SPECS } from "../specs.js";

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const LAMP = V(0.0, 1.75, -1.0);
const ss = (x) => { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); };
const keyed = (keys, t) => { let v = keys[0][1]; for (const [tk, vk, d] of keys) if (t >= tk - d) v = v + (vk - v) * ss((t - (tk - d)) / d); return v; };

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

// ------------------------------------------------------------------ CAST v02
const CAST2 = ["robber", "buddy", "teller1", "teller2", "cop", "cop2", "anchor", "weatherman", "professor"];
export const Cast2 = () => {
  const b = useBench(async (canvas, W, H) => {
    const { renderer, scene, key, lampBall } = baseScene(canvas, W, H); key.position.set(0.5, 3.2, 2.2); lampBall.position.copy(key.position);
    const camera = new THREE.PerspectiveCamera(58, W / H, 0.05, 100);
    const chars = await Promise.all((getInputProps().cast || CAST2).map((k) => createCharacter(SPECS[k])));   // --props='{"cast":[...]}' to check any cast
    chars.forEach((c, i) => { c.root.position.set(-1.6 + (i % 5) * 0.8, i >= 5 ? 0.62 : 0, i < 5 ? 0.5 : -0.6); if (i >= 5) c.root.position.x += 0.4; c.root.rotation.y = 0.25 - 0.12 * (i % 5); scene.add(c.root); });
    return { renderer, scene, camera, chars };
  }, async ({ renderer, scene, camera, chars }, frame) => {
    if (frame === 0) { camera.position.set(0, 1.45, 6.6); camera.lookAt(0, 1.55, 0); }
    else if (frame === 1) { camera.position.set(0, 2.6, 6.3); camera.lookAt(0, 1.3, -0.1); }
    else { camera.position.set(-3.6, 1.7, 5.2); camera.lookAt(0, 1.4, 0); }
    const opt = { camera, keyLightPos: V(0.5, 3.2, 2.2), time: 0.8 };
    const t0 = performance.now(); const N = 10;
    for (let i = 0; i < N; i++) chars.forEach((c, k) => c.update({ expression: ["smug", "skeptical", "neutral", "happy", "neutral", "skeptical", "smug", "happy", "neutral"][k], gaze: k < 4 ? "_R" : k > 5 ? "_L" : "",
      wet: k === 0 ? 1 : 0, lemonSlice: k === 0,
      armL: { pose: ["thumbsUp", "rest", "rest", "hip", "hip", "rest", "rest", "present", "rest"][k] }, armR: { pose: ["hip", "hip", "present", "rest", "rest", "hip", "rest", "rest", "fingerUp"][k] } }, opt));
    const upd = (performance.now() - t0) / N / chars.length;
    await Promise.all(chars.map((c) => c.ready()));
    const t1 = performance.now(); renderer.render(scene, camera); renderer.getContext().finish();
    return `cast v02 ${["eye level", "high", "3/4 left"][frame]} | update ${upd.toFixed(2)} ms/char | render ${(performance.now() - t1).toFixed(1)} ms`;
  });
  return <Frame b={b} />;
};

// ------------------------------------------------------------------ POSES v02 (green dots = targets; props placed with handFrame / bothHandsFrame)
const box = (w, h, d, color, rough = 0.7) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshStandardMaterial({ color, roughness: rough })); m.castShadow = true; m.receiveShadow = true; return m; };
const LP = V(-0.55, 0, 0), RP = V(0.6, 0, 0);
// [label, leftId, leftState(T), rightId, rightState(T), props]
export const POSE_LIST2 = [
  ["squeezeOverHead (wet, slice) / sniff (sit couch)", "robber", () => ({ expression: "smug", wet: 1, lemonSlice: true, armL: { pose: "squeezeOverHead", phase: 0.3 }, armR: { pose: "squeezeOverHead", phase: 0.8 } }),
    "buddy", () => ({ expression: "skeptical", gaze: "_L", sit: 1, seat: 0.42, armR: { pose: "sniff", phase: 0.25 }, armL: { pose: "rest" } }), ["lemons", "couch"]],
  ["writeWithLemon (table) / holdBook", "robber", (T) => ({ expression: "smug", armR: { pose: "writeWithLemon", target: T.table, phase: 0.2 }, armL: { pose: "rest" }, lean: 0.12 }),
    "professor", () => ({ expression: "neutral", armL: { pose: "holdBook" }, armR: { pose: "holdBook" } }), ["table", "book"]],
  ["holdUp (sheet) / readNewspaper 0", "robber", () => ({ expression: "proud", armL: { pose: "holdUp" }, armR: { pose: "holdUp" } }),
    "professor", () => ({ expression: "skeptical", armL: { pose: "readNewspaper", amount: 0 }, armR: { pose: "readNewspaper", amount: 0 } }), ["sheetL", "newsR"]],
  ["pointSelf face / readNewspaper 1 (lowered)", "robber", () => ({ expression: "smug", armR: { pose: "pointSelf" }, armL: { pose: "hip" }, turn: 0.2 }),
    "professor", () => ({ expression: "worried", gaze: "_L", armL: { pose: "readNewspaper", amount: 1 }, armR: { pose: "readNewspaper", amount: 1 } }), ["newsR"]],
  ["selfie / knock (door)", "robber", () => ({ expression: "happy", wet: 1, armR: { pose: "selfie" }, armL: { pose: "hip" } }),
    "cop", (T) => ({ expression: "angry", armL: { pose: "knock", target: T.door, phase: 0.5 }, armR: { pose: "rest" }, turn: 0.5 }), ["camera", "door"]],
  ["shakePhoto / pressPlay (VCR)", "robber", () => ({ expression: "smug", armR: { pose: "shakePhoto", phase: 0.25 }, armL: { pose: "rest" } }),
    "cop", (T) => ({ expression: "neutral", armR: { pose: "pressPlay", target: T.vcr, amount: 1 }, armL: { pose: "hip" }, lean: 0.1 }), ["photo", "vcr"]],
  ["thumbsUp (wet, eyes shut) / facepalm", "robber", () => ({ expression: "laugh", mouth: "_blink", wet: 1, lemonSlice: true, armR: { pose: "thumbsUp" }, armL: { pose: "thumbsUp" } }),
    "cop", () => ({ expression: "worried", armR: { pose: "facepalm" }, armL: { pose: "hip" } }), []],
  ["carryBag / chalkWrite (board)", "robber", () => ({ expression: "happy", armL: { pose: "carryBag" }, armR: { pose: "rest" } }),
    "professor", (T) => ({ expression: "neutral", gaze: "_L", armR: { pose: "chalkWrite", target: T.board, normal: V(-1, 0, 0), phase: 0.3 }, armL: { pose: "rest" } }), ["bag", "board"]],
  ["sit bunk holdBook / tapBoard", "robber", () => ({ expression: "proud", sit: 1, seat: 0.45, armL: { pose: "holdBook" }, armR: { pose: "holdBook" } }),
    "professor", (T) => ({ expression: "smug", armL: { pose: "tapBoard", target: T.board2, normal: V(-1, 0, 0), phase: 0.0 }, armR: { pose: "hip" } }), ["bunk", "bookL", "board"]],
  ["sit couch thumbsUp / sit chair pointSelf chest", "buddy", () => ({ expression: "happy", sit: 1, seat: 0.42, armR: { pose: "thumbsUp" }, armL: { pose: "rest" } }),
    "robber", () => ({ expression: "worried", sit: 1, seat: 0.46, armR: { pose: "pointSelf", at: "chest" }, armL: { pose: "shrug" } }), ["couchL", "chairR"]],
];
export const Poses2 = () => {
  const b = useBench(async (canvas, W, H) => {
    const { renderer, scene } = baseScene(canvas, W, H);
    const camera = new THREE.PerspectiveCamera(62, W / H, 0.05, 100); camera.position.set(0.05, 1.25, 3.4); camera.lookAt(0, 0.95, 0);
    const ids = ["robber", "buddy", "professor", "cop"]; const C = {};
    for (const side of ["L", "R"]) for (const id of ids) { const c = await createCharacter(SPECS[id]); c.root.visible = false; scene.add(c.root); C[side + id] = c; }
    const props = new THREE.Group(); scene.add(props);
    const marks = Array.from({ length: 4 }, () => mark(scene));
    return { renderer, scene, camera, C, props, marks };
  }, async ({ renderer, scene, camera, C, props, marks }, frame) => {
    const [label, lid, ls, rid, rs, set] = POSE_LIST2[frame % POSE_LIST2.length];
    Object.values(C).forEach((c) => (c.root.visible = false)); props.clear(); marks.forEach((m) => (m.visible = false));
    const L = C["L" + lid], Rc = C["R" + rid]; L.root.visible = Rc.root.visible = true;
    L.root.position.copy(LP); Rc.root.position.copy(RP); L.root.rotation.y = 0.35; Rc.root.rotation.y = -0.35;
    const T = { table: V(-0.62, 0.78, 0.42), door: V(0.95, 1.15, 0.45), vcr: V(0.42, 0.95, 0.40), board: V(1.20, 1.42, 0.30), board2: V(1.20, 1.50, 0.08) };
    const has = (k) => set.includes(k);
    if (has("table")) { const t = box(0.7, 0.04, 0.5, "#7a5a3a"); t.position.set(-0.62, 0.74, 0.55); props.add(t); const p = box(0.21, 0.004, 0.28, "#f4f1e6"); p.position.set(-0.62, 0.762, 0.45); props.add(p); }
    if (has("couch")) { const s = box(0.9, 0.42, 0.55, "#6a4a7a"); s.position.set(0.6, 0.21, -0.12); props.add(s); }
    if (has("couchL")) { const s = box(0.9, 0.42, 0.55, "#6a4a7a"); s.position.set(-0.55, 0.21, -0.12); props.add(s); }
    if (has("chairR")) { const s = box(0.45, 0.46, 0.42, "#7a5a3a"); s.position.set(0.6, 0.23, -0.1); props.add(s); }
    if (has("bunk")) { const s = box(0.9, 0.45, 0.6, "#5a6470"); s.position.set(-0.55, 0.225, -0.12); props.add(s); }
    if (has("door")) { const d = box(0.05, 2.1, 0.9, "#8a6a4a"); d.position.set(1.0, 1.05, 0.5); props.add(d); }
    if (has("vcr")) { const v = box(0.40, 0.09, 0.30, "#222222"); v.position.set(0.45, 0.90, 0.52); props.add(v); }
    if (has("board")) { const bd = box(0.03, 1.0, 1.6, "#2f5a3e"); bd.position.set(1.235, 1.45, 0.1); props.add(bd); }
    const pts = has("table") ? [T.table] : has("door") ? [T.door] : has("vcr") ? [T.vcr] : has("board") ? [T.board, T.board2] : [];
    pts.forEach((p, i) => { marks[i].visible = true; marks[i].position.copy(p); });
    const opt = { camera, keyLightPos: LAMP, time: 0.9 };
    const t0 = performance.now(); for (let i = 0; i < 10; i++) { L.update(ls(T), opt); Rc.update(rs(T), opt); } const upd = (performance.now() - t0) / 20;
    const at1 = (ch, s, obj) => { const f = ch.handFrame(s); obj.position.copy(f.position); obj.quaternion.copy(f.quaternion); props.add(obj); };
    const at2 = (ch, obj, wScale = 1) => { const f = ch.bothHandsFrame(); obj.position.copy(f.position); obj.quaternion.copy(f.quaternion); obj.scale.x = f.width * wScale; props.add(obj); };
    const sheet = (h, color) => { const m = new THREE.Mesh(new THREE.BoxGeometry(1, h, 0.004), new THREE.MeshStandardMaterial({ color, roughness: 0.8 })); m.castShadow = true; return m; };
    if (has("lemons")) for (const s of ["L", "R"]) { const l = new THREE.Mesh(new THREE.SphereGeometry(0.04, 16, 12), new THREE.MeshStandardMaterial({ color: "#f2d21a", roughness: 0.5 })); l.scale.set(1.25, 1, 1); at1(L, s, l); }
    if (has("book")) at2(Rc, sheet(0.22, "#efe8d6"), 1.15);
    if (has("bookL")) at2(L, sheet(0.22, "#efe8d6"), 1.15);
    if (has("sheetL")) at2(L, sheet(0.28, "#f6f3ea"), 1.05);
    if (has("newsR")) at2(Rc, sheet(0.40, "#d9d6cc"), 1.05);
    if (has("camera")) at1(L, "R", box(0.12, 0.10, 0.08, "#2a2a2a", 0.4));
    if (has("photo")) at1(L, "R", box(0.004, 0.10, 0.09, "#f7f7f2"));
    if (has("bag")) { const f = L.handFrame("L"); const bg = box(0.24, 0.30, 0.16, "#b98a52", 0.9); bg.position.copy(f.position).add(V(-0.02, 0.12, 0.02)); props.add(bg); }
    await Promise.all([L.ready(), Rc.ready()]);
    renderer.render(scene, camera);
    return `${frame}: ${label} | update ${upd.toFixed(2)} ms/char`;
  });
  return <Frame b={b} />;
};

// ------------------------------------------------------------------ SEQ v02: robber squeezes lemons over his head (0-1 s), selfie (1-2 s), thumbs up (2-3 s)
export function seq2State(t) {
  const words = [[0.1, 0.35, "He"], [0.35, 0.7, "squeezes"], [0.7, 0.95, "six"], [1.25, 1.5, "snaps"], [1.5, 1.6, "a"], [1.6, 1.95, "selfie"], [2.3, 2.7, "works"]];
  return {
    expression: t < 1.1 ? "smug" : t < 2.1 ? "happy" : "laugh", mouth: visemeAt(words, t) || ((t > 2.75 && t < 2.9) ? "_blink" : ""),
    gaze: t < 1.0 ? "" : "_R", wet: 0.35 + 0.65 * ss(t / 1.0), lemonSlice: true,
    turn: keyed([[0, 0.15, 0.2], [1.2, 0.45, 0.35], [2.2, 0.1, 0.35]], t), nod: keyed([[0, 0, 0.2], [2.3, 0.08, 0.2], [2.7, -0.03, 0.2]], t),
    tilt: keyed([[0, 0.04, 0.2], [1.3, 0.0, 0.3]], t), bob: 0.004 * Math.sin(t * 2.4), side: 0.015 * Math.sin(t * 1.3),
    armL: armAt([[0, { pose: "squeezeOverHead", phase: t * 2.2 }], [1.0, { pose: "hip" }, 0.5]], t),
    armR: armAt([[0, { pose: "squeezeOverHead", phase: t * 2.2 + 0.4 }], [1.0, { pose: "selfie" }, 0.45], [2.0, { pose: "thumbsUp" }]], t),
  };
}
export const Seq2 = () => {
  const b = useBench(async (canvas, W, H) => {
    const { renderer, scene } = baseScene(canvas, W, H);
    const camera = new THREE.PerspectiveCamera(55, W / H, 0.05, 100);
    const Rb = await createCharacter(SPECS.robber); scene.add(Rb.root);
    const all = []; for (let f = 0; f < 90; f++) all.push(seq2State(f / 30)); await Rb.preload(all);
    return { renderer, scene, camera, Rb };
  }, async ({ renderer, scene, camera, Rb }, frame) => {
    const t = frame / 30;
    const a = -0.35 + 0.6 * ss(t / 3);
    camera.position.set(Math.sin(a) * (2.6 - 0.4 * ss(t / 3)), 1.35 + 0.08 * Math.sin(t * 0.9), Math.cos(a) * (2.6 - 0.4 * ss(t / 3))); camera.lookAt(0, 1.15, 0);
    const t0 = performance.now(); Rb.update(seq2State(t), { camera, keyLightPos: LAMP, time: t }); const upd = performance.now() - t0;
    await Rb.ready(); const t1 = performance.now(); renderer.render(scene, camera); renderer.getContext().finish();
    console.log(`SEQ2 frame ${frame} update ${upd.toFixed(2)} ms render ${(performance.now() - t1).toFixed(1)} ms`);
    return null;
  });
  return <Frame b={b} label={false} />;
};
