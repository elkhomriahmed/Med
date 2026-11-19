// Style check: the real video-2 cast (not set-test stand-ins) in the real kitchen, framed like the v12 LOCKED reference.
import React, { useEffect, useRef, useState } from "react";
import { registerRoot, Composition, AbsoluteFill, continueRender, delayRender, useVideoConfig } from "remotion";
import * as THREE from "three";
import { buildApartment } from "../../../world/apartment/index.js";
import { createLook } from "../../../world/look.js";
import { createCharacter } from "../../../characters/index.js";
import { SPECS } from "../../../characters/specs.js";
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const Check = () => {
  const { width, height } = useVideoConfig(); const canvas = useRef(null);
  const [h] = useState(() => delayRender("style", { timeoutInMilliseconds: 240000 }));
  useEffect(() => { (async () => {
    const renderer = new THREE.WebGLRenderer({ canvas: canvas.current, antialias: false, preserveDrawingBuffer: true });
    const scene = new THREE.Scene(); const cam = new THREE.PerspectiveCamera(74, width / height, 0.05, 200);
    const apt = await buildApartment({ time: "morning" }); scene.add(apt.group); apt.setTime("morning");
    const rob = await createCharacter(SPECS.robber), bud = await createCharacter(SPECS.buddy);
    rob.root.position.set(-1.65, 3.6, -12.3); rob.root.rotation.y = 0.25; bud.root.position.set(-0.55, 3.6, -12.1); bud.root.rotation.y = -0.3;
    scene.add(rob.root, bud.root);
    cam.position.set(-1.1, 3.6 + 1.3, -9.75); cam.lookAt(-1.1, 3.6 + 1.05, -12.2); cam.updateMatrixWorld();
    const look = createLook(renderer, scene, cam, width, height, {}); await look.ready;
    const o = { camera: cam, keyLightPos: apt.anchors.keyLightPos, time: 1.0 };
    rob.update({ expression: "smug", wet: 0.7, lemonSlice: true, armL: { pose: "hip" }, armR: { pose: "thumbsUp" } }, o);
    bud.update({ expression: "skeptical", gaze: "_L", armL: { pose: "fold" }, armR: { pose: "fold" } }, o);
    await rob.ready?.(); await bud.ready?.(); apt.update(1.0); look.render(); look.render(); continueRender(h);
  })().catch((e) => { console.error(e); throw e; }); }, []);
  return <AbsoluteFill><canvas ref={canvas} width={width} height={height} /></AbsoluteFill>;
};
registerRoot(() => <Composition id="StyleCheck" component={Check} durationInFrames={1} fps={30} width={1080} height={1920} />);
