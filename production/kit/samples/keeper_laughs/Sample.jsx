import React, { useEffect, useRef, useState } from "react";
import { AbsoluteFill, continueRender, delayRender, useCurrentFrame, useVideoConfig } from "remotion";
import * as THREE from "three";
import { buildLampRoom } from "../../world/index.js";
import { createLook } from "../../world/look.js";
import { createCharacter } from "../../characters/index.js";
import { KEEPER, ENGINEER } from "../../characters/specs.js";
import { Captions } from "../../timeline/Captions.jsx";
import { Soundtrack } from "../../timeline/Soundtrack.jsx";
import { acting, cameraAt, WORDS, SFX, SEG_START, FPS } from "./direction.js";

async function build(canvas, W, H) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, preserveDrawingBuffer: true, powerPreference: "high-performance" });
  renderer.setSize(W, H, false); renderer.setPixelRatio(1);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(94, W / H, 0.05, 300);
  const place = await buildLampRoom();
  scene.add(place.group);
  const keeper = await createCharacter(KEEPER), engineer = await createCharacter(ENGINEER);
  const A = place.anchors;
  keeper.root.position.copy(A.keeperSpot); engineer.root.position.copy(A.engineerSpot);
  scene.add(keeper.root, engineer.root);
  const look = createLook(renderer, scene, camera, W, H, {});
  await look.ready;
  const base = { k: keeper.root.rotation.y, e: engineer.root.rotation.y };

  const ctxAt = () => ({ lens: A.lens.clone(), keeperHead: keeper.headCenter(), engineerHead: engineer.headCenter() });
  // framing anchors are taken from the neutral standing pose so the camera plan never jitters with the acting
  keeper.update({ expression: "neutral" }, { camera, keyLightPos: place.keyLightPos, time: 0 });
  engineer.update({ expression: "neutral" }, { camera, keyLightPos: place.keyLightPos, time: 0 });
  const camCtx = ctxAt();

  // warm up every face drawing the timeline uses
  const all = [];
  for (let f = 0; f < 400; f++) all.push(acting(f / FPS, camCtx));
  keeper.preload?.(all.map((s) => s.keeper)); engineer.preload?.(all.map((s) => s.engineer));
  await keeper.ready?.(); await engineer.ready?.();

  return {
    async renderFrame(frame) {
      const t = frame / FPS;
      const c = cameraAt(t, camCtx);
      camera.position.copy(c.pos); camera.lookAt(c.target); camera.updateMatrixWorld();
      place.update(t, camera);
      const s = acting(t, camCtx);
      const lc = { camera, keyLightPos: place.keyLightPos, time: t };
      keeper.update(s.keeper, lc); engineer.update(s.engineer, lc);
      await keeper.ready?.(); await engineer.ready?.();
      look.render();
    },
    dispose() { look.dispose?.(); renderer.dispose(); },
  };
}

export const Sample = () => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const canvas = useRef(null), ctx = useRef(null);
  const [handle] = useState(() => delayRender("build scene", { timeoutInMilliseconds: 120000 }));
  useEffect(() => {
    let alive = true;
    build(canvas.current, width, height).then(async (c) => { if (!alive) return; ctx.current = c; await c.renderFrame(frame); continueRender(handle); })
      .catch((e) => { console.error("BUILD_FAIL", e?.stack || e); throw e; });
    return () => { alive = false; ctx.current?.dispose(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (!ctx.current) return;
    const h = delayRender("frame " + frame);
    ctx.current.renderFrame(frame).then(() => continueRender(h));
  }, [frame]);
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <canvas ref={canvas} width={width} height={height} style={{ width, height }} />
      <Captions words={WORDS} />
      <Soundtrack vo={{ src: "audio/vo_118.wav", startSec: SEG_START }} music={{ src: "music/cartoon_funny_quirky_5min.mp3", startSec: 8, volume: 0.065 }} sfx={SFX} />
    </AbsoluteFill>
  );
};
