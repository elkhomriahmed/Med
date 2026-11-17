// Character test bench: both characters on a plain floor, warm point light + cool moon + simple tone mapping.
// Each frame = one pose set (frame 0 = the locked reference pose). Render:
//   npx remotion still characters/test/index.js CharTest characters/out/test.png --gl=angle --frame=N
import React, { useEffect, useRef, useState } from "react";
import { AbsoluteFill, continueRender, delayRender, useCurrentFrame, useVideoConfig } from "remotion";
import * as THREE from "three";
import { createCharacter } from "../index.js";
import { KEEPER, ENGINEER } from "../specs.js";

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const LAMP = V(0.0, 1.55, -1.1);
// [label, keeperState, engineerState, extra]
export const POSES = [
  ["reference", { expression: "skeptical", gaze: "_R", armL: { pose: "hip" }, armR: { pose: "hip" } },
    { expression: "talk", mouth: "_A", gaze: "_L", armL: { pose: "rest" }, armR: { pose: "present" } }],
  ["point near hand", { expression: "smug", gaze: "_R", point: { target: V(0.05, 1.5, -1.2) } },
    { expression: "neutral", gaze: "_L", point: { target: V(-0.6, 1.4, 0.4) } }],
  ["point far hand across", { expression: "proud", point: { target: V(0.05, 1.3, -1.2), hand: "R" } },
    { expression: "skeptical", point: { target: V(-0.6, 1.3, 0.4), hand: "R" } }],
  ["shrug / fingerUp", { expression: "worried", mouth: "_O", armL: { pose: "shrug" }, armR: { pose: "shrug" } },
    { expression: "proud", armL: { pose: "fingerUp" }, armR: { pose: "rest" } }],
  ["thumbChest / fold", { expression: "laugh", mouth: "_A", armL: { pose: "thumbChest" }, armR: { pose: "rest" } },
    { expression: "skeptical", armL: { pose: "fold" }, armR: { pose: "fold" } }],
  ["wave / hip", { expression: "happy", mouth: "_O", armL: { pose: "rest" }, armR: { pose: "wave" } },
    { expression: "talk", mouth: "_E", armL: { pose: "hip" }, armR: { pose: "hip" } }],
  ["gaze L", { expression: "neutral", gaze: "_L" }, { expression: "neutral", gaze: "_L" }],
  ["gaze R", { expression: "neutral", gaze: "_R" }, { expression: "neutral", gaze: "_R" }],
  ["mouth A", { expression: "neutral", mouth: "_A" }, { expression: "happy", mouth: "_A" }],
  ["mouth E", { expression: "neutral", mouth: "_E" }, { expression: "happy", mouth: "_E" }],
  ["mouth O", { expression: "neutral", mouth: "_O" }, { expression: "happy", mouth: "_O" }],
  ["blink", { expression: "smug", mouth: "_blink" }, { expression: "neutral", mouth: "_blink" }],
  ["face camera", { expression: "shock", mouth: "_O" }, { expression: "angry", mouth: "_talk" }, { yawK: 0, yawE: 0 }],
  ["lean nod tilt bob", { expression: "laugh", lean: 0.15, nod: 0.12, tilt: 0.12, side: 0.06, bob: 0.02, armL: { pose: "hip" }, armR: { pose: "wave" } },
    { expression: "sleepy", lean: -0.1, nod: -0.1, tilt: -0.1, turn: 0.3, armL: { pose: "thumbChest" } }],
  ["profile", { expression: "neutral" , armL: { pose: "present" }, armR: { pose: "rest" } }, { expression: "neutral", point: { target: V(-2, 1.2, 0.3) } }, { yawK: 1.45, yawE: -1.45 }],
  ["crossing grab", { expression: "neutral", armR: { pose: "grab", target: V(-0.25, 1.0, 0.45) } }, { expression: "neutral", armL: { pose: "grab", target: V(0.40, 0.95, 0.35) } }],
];

async function build(canvas, W, H) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
  renderer.setSize(W, H, false); renderer.setPixelRatio(1);
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene(); scene.background = new THREE.Color("#2b2f4d");
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), new THREE.MeshStandardMaterial({ color: "#b58451", roughness: 0.85 }));
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
  const back = new THREE.Mesh(new THREE.PlaneGeometry(30, 10), new THREE.MeshStandardMaterial({ color: "#4a3a30", roughness: 0.9 }));
  back.position.set(0, 5, -3); scene.add(back);
  const key = new THREE.PointLight("#ffbf7a", 9, 0, 2); key.position.copy(LAMP); key.castShadow = true; key.shadow.mapSize.set(1024, 1024); key.shadow.bias = -0.002; scene.add(key);
  const lampBall = new THREE.Mesh(new THREE.SphereGeometry(0.12, 24, 16), new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 0.8, 0.5).multiplyScalar(4) })); lampBall.position.copy(LAMP); scene.add(lampBall);
  const moon = new THREE.DirectionalLight(new THREE.Color(0.45, 0.58, 1.0), 0.9); moon.position.set(3, 4, -2); scene.add(moon);
  const fill = new THREE.SpotLight("#ffd2a0", 14, 0, 0.6, 0.8, 2); fill.position.set(0.4, 2.1, 3.2); fill.target.position.set(0, 1.1, 0); scene.add(fill, fill.target);
  scene.add(new THREE.HemisphereLight("#6a78a8", "#8a5a30", 0.45));
  const camera = new THREE.PerspectiveCamera(78, W / H, 0.05, 100); camera.position.set(0.05, 1.15, 3.0); camera.lookAt(0, 0.86, 0);
  const [K, E] = await Promise.all([createCharacter(KEEPER), createCharacter(ENGINEER)]);
  K.root.position.set(-0.6, 0, 0.05); E.root.position.set(0.62, 0, -0.03);
  scene.add(K.root, E.root);
  return { renderer, scene, camera, K, E };
}

export const CharTest = () => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const canvas = useRef(null), ctx = useRef(null);
  const [info, setInfo] = useState("");
  const [handle] = useState(() => delayRender("build"));
  useEffect(() => {
    let alive = true; const h = delayRender("frame " + frame);
    (async () => {
      if (!ctx.current) ctx.current = await build(canvas.current, width, height);
      if (!alive) return;
      const { renderer, scene, camera, K, E } = ctx.current;
      const [label, ks, es, extra = {}] = POSES[frame % POSES.length];
      K.root.rotation.y = extra.yawK ?? 0.75; E.root.rotation.y = extra.yawE ?? -0.7;
      const opt = { camera, keyLightPos: LAMP, time: frame / 30 };
      // warm-up + timing: update both characters N times
      const t0 = performance.now(); const N = 20;
      for (let i = 0; i < N; i++) { K.update(ks, opt); E.update(es, opt); }
      const upd = (performance.now() - t0) / N;
      await Promise.all([K.ready(), E.ready()]);
      renderer.render(scene, camera); renderer.getContext().finish();
      const t1 = performance.now(); renderer.render(scene, camera); const px = new Uint8Array(4); const gl = renderer.getContext(); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
      const ren = performance.now() - t1;
      setInfo(`${frame}: ${label} | update both ${upd.toFixed(2)} ms | render ${ren.toFixed(1)} ms | headW ${(100 * headWidthFrac(K, camera, width)).toFixed(1)}%`);
      setTimeout(() => { continueRender(h); continueRender(handle); }, 0);
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frame]);
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <canvas ref={canvas} width={width} height={height} style={{ width, height }} />
      <div style={{ position: "absolute", left: 20, top: 20, color: "#fff", font: "28px monospace", textShadow: "0 0 4px #000" }}>{info}</div>
    </AbsoluteFill>
  );
};

function headWidthFrac(ch, camera, W) {
  const c = ch.headCenter(); const right = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0);
  const a = c.clone().addScaledVector(right, -ch.R).project(camera), b = c.clone().addScaledVector(right, ch.R).project(camera);
  return Math.abs(b.x - a.x) / 2;
}
