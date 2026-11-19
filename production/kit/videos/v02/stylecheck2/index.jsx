// Style check 2: the interrogation scene (shot 15/16) with the real fixed cast in the real police room.
import React, { useEffect, useRef, useState } from "react";
import { registerRoot, Composition, AbsoluteFill, continueRender, delayRender, useVideoConfig } from "remotion";
import * as THREE from "three";
import { buildPolice } from "../../../world/police/index.js";
import { createLook } from "../../../world/look.js";
import { createCharacter } from "../../../characters/index.js";
import { SPECS } from "../../../characters/specs.js";
const Check = () => {
  const { width, height } = useVideoConfig(); const canvas = useRef(null);
  const [h] = useState(() => delayRender("style2", { timeoutInMilliseconds: 240000 }));
  useEffect(() => { (async () => {
    const renderer = new THREE.WebGLRenderer({ canvas: canvas.current, antialias: false, preserveDrawingBuffer: true });
    const scene = new THREE.Scene(); const cam = new THREE.PerspectiveCamera(60, width / height, 0.05, 300);
    const pol = await buildPolice({ time: "night" }); scene.add(pol.group); pol.setTime("night");
    const A = pol.anchors;
    const rob = await createCharacter(SPECS.robber), cop = await createCharacter(SPECS.cop);
    rob.root.position.copy(A.interrogationChairRobber); rob.root.rotation.y = A.yaw.interrogationChairRobber;
    cop.root.position.copy(A.interrogationChairCop); cop.root.rotation.y = A.yaw.interrogationChairCop;
    scene.add(rob.root, cop.root);
    // camera: side two-shot between the wide and close views, both faces readable
    const mid = A.interrogationChairRobber.clone().lerp(A.interrogationChairCop, 0.5);
    const side = new THREE.Vector3().subVectors(A.interrogationChairCop, A.interrogationChairRobber).cross(new THREE.Vector3(0, 1, 0)).normalize();
    if (side.dot(new THREE.Vector3().subVectors(A.views.interrogationWide.pos, mid)) < 0) side.negate();
    const vw = A.views.interrogationWide; cam.position.copy(vw.pos); cam.fov = 72; cam.updateProjectionMatrix(); cam.lookAt(mid.clone().add(new THREE.Vector3(0, 0.9, 0)));
    cam.updateMatrixWorld();
    const look = createLook(renderer, scene, cam, width, height, {}); await look.ready;
    const o = { camera: cam, keyLightPos: A.keyLightPos, time: 2.0 };
    cop.update({ expression: "skeptical", sit: 1, seat: 0.48 }, o); rob.update({ expression: "neutral", sit: 1, seat: 0.48 }, o);
    const copHead = cop.headCenter().clone(), robHead = rob.headCenter().clone();
    rob.update({ expression: "worried", mouth: "_O", lookAt: copHead, sit: 1, seat: 0.48, wet: 0.5, armL: { pose: "rest" }, armR: { pose: "rest" }, turn: 0.35 }, o);
    cop.update({ expression: "skeptical", lookAt: robHead, sit: 1, seat: 0.48, armL: { pose: "fold" }, armR: { pose: "fold" }, turn: -0.3 }, o);
    await rob.ready?.(); await cop.ready?.(); look.render(); look.render(); continueRender(h);
  })().catch((e) => { console.error(e); throw e; }); }, []);
  return <AbsoluteFill><canvas ref={canvas} width={width} height={height} /></AbsoluteFill>;
};
registerRoot(() => <Composition id="StyleCheck2" component={Check} durationInFrames={1} fps={30} width={1080} height={1920} />);
