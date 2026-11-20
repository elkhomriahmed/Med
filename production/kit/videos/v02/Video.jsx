// Video 2 composition: one connected Pittsburgh block (street, apartment, 2 banks, police station) + the professor's office,
// the cast, props in hands, real-character renders on the TV/CCTV/newspaper/textbook, designed transitions, captions, sound.
import React, { useEffect, useRef, useState } from "react";
import { AbsoluteFill, Audio, continueRender, delayRender, getInputProps, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
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
    polaroid: null, photo: PV.createPolaroidPhoto(), inkPaper: PV.createInkPaper({ text: "MONEY" }), lemonBag: PV.createLemonBag({ lemons: 5 }),
    squirt: PV.createJuiceSquirt({ seed: 7 }), newspaperCell: null, newspaperOffice: null, textbookCell: null, textbookOffice: null,
  };
  // the selfie: a real render from the Polaroid's lens of that moment (flash blows out his face)
  const SELF = 384, selfieCanvas = Object.assign(document.createElement("canvas"), { width: SELF, height: SELF });
  const selfieTex = new THREE.CanvasTexture(selfieCanvas); selfieTex.colorSpace = THREE.SRGBColorSpace;
  const selfieRT = new THREE.WebGLRenderTarget(SELF, SELF, { colorSpace: THREE.SRGBColorSpace }), selfieCam = new THREE.PerspectiveCamera(44, 1, 0.03, 60);
  const selfieBuf = new Uint8Array(SELF * SELF * 4);
  P.polaroid = PV.createPolaroidCamera({ photoImage: selfieTex });
  const lemonRow = PV.createLemonRow(6); lemonRow.position.set(-2.95, 3.6 + 0.76, -11.55); scene.add(lemonRow);
  const mini = await buildMini();
  const suspectTex = new THREE.CanvasTexture(mini.suspect.out); suspectTex.colorSpace = THREE.SRGBColorSpace;
  P.newspaperCell = PV.createNewspaper({ photo: suspectTex }); P.newspaperOffice = PV.createNewspaper({ photo: suspectTex });
  P.textbookCell = PV.createTextbook({ pagePhoto: suspectTex }); P.textbookOffice = PV.createTextbook({ pagePhoto: suspectTex });
  // ending: handcuffs (two steel rings + short chain, between his hooks) and the newspaper his mugshot ends up in
  { const cuffs = new THREE.Group(), steel = new THREE.MeshStandardMaterial({ color: 0xb8bcc2, metalness: 0.9, roughness: 0.28 });
    for (const sd of [-1, 1]) { const ring = new THREE.Mesh(new THREE.TorusGeometry(0.034, 0.0065, 10, 28), steel); ring.position.x = sd * 0.05; ring.rotation.y = Math.PI / 2; ring.castShadow = true; cuffs.add(ring);
      const lock = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.03, 0.022), steel); lock.position.set(sd * 0.05, -0.034, 0); cuffs.add(lock); }
    for (let i = 0; i < 3; i++) { const l = new THREE.Mesh(new THREE.TorusGeometry(0.008, 0.0024, 6, 12), steel); l.position.x = -0.016 + i * 0.016; l.rotation.y = i % 2 ? Math.PI / 2 : 0; cuffs.add(l); }
    P.cuffs = cuffs; }
  P.newspaperEnd = PV.createNewspaper({ headline: "LEMON JUICE BANDIT CAUGHT", sub: "Robber thought lemon juice made his face invisible to cameras",
    caption: ["The suspect at the precinct, in handcuffs. Police say he truly believed", "the juice would hide his face from every camera."] });
  // the mugshot: the frame at the flash is captured (full res), its middle band becomes the newspaper photo
  const capCanvas = Object.assign(document.createElement("canvas"), { width: W, height: H });
  const NEWS_PW = 0.38 * 0.58, NEWS_PH = 0.58 * 0.255, bandH = W * NEWS_PH / NEWS_PW, bandY = (H - bandH) / 2;
  const newsCanvas = Object.assign(document.createElement("canvas"), { width: 720, height: Math.round(720 * NEWS_PH / NEWS_PW) });
  const newsTex = new THREE.CanvasTexture(newsCanvas); newsTex.colorSpace = THREE.SRGBColorSpace;
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
    if (a.offset) o.position.add(a.offset);
    if (a.blendFrom && a.k < 1) {                                   // ease between the resting pose and the held pose (pick up / put down)
      const hp = o.position.clone(), hq = o.quaternion.clone(); const f = a.blendFrom;
      o.position.copy(f.place); o.rotation.set(f.flat ? -Math.PI / 2 : 0, f.rot ?? 0, 0);
      const w = a.k * a.k * (3 - 2 * a.k); o.position.lerp(hp, w); o.quaternion.slerp(hq, w);
    }
    if (a.open != null) (o.userData.setOpen?.(a.open));
  };
  const state = { last: null };
  const FLASH_F = Math.ceil(dir.FLASH * FPS); let capDone = false;
  const ret = {
    camera, dir, state, selfieCanvas, capCanvas,
    async renderFrame(frame) {
      if (frame > FLASH_F && !capDone) await ret.renderCore(FLASH_F);              // any worker: make the mugshot capture first (deterministic)
      await ret.renderCore(frame);
    },
    async renderCore(frame) {
      const t = frame / FPS;
      const c = dir.camAt(t); const dbg = getInputProps().dbgCam;                 // check-only camera override (never set in real renders)
      if (dbg) { c.pos = new THREE.Vector3(...dbg.pos); c.target = new THREE.Vector3(...dbg.target); c.fov = dbg.fov ?? 50; }
      camera.position.copy(c.pos); camera.fov = c.fov; camera.lookAt(c.target);
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
        : z === "police" ? (t >= 43.0 && t < dir.SW2 ? police.anchors.keyLights.cells : police.anchors.keyLights.interrogation) : z === "office" ? office.anchors.keyLightPos : city.keyLightPos;
      for (const k in chars) { const s = a.cast[k]; const ch = chars[k];
        if (!s || !s.visible) { ch.root.visible = false; continue; }
        ch.root.visible = true; ch.root.position.copy(s.pos); ch.root.rotation.set(0, s.rot ?? 0, 0);
        ch.update(s.s || {}, { camera, keyLightPos: key, time: t }); }
      // props
      for (const [k, o] of Object.entries(P)) if (k !== "squirt") attach(o, a.props[k]);
      P.polaroid.userData.setFlash?.(a.fx.flash); P.polaroid.userData.setEject?.(a.props.polaroidEject ?? 0);
      P.polaroid.userData.photo?.userData.setDevelop?.(a.props.selfieDevelop ?? 0);
      // live push into the selfie (15.5-16.9 s): camera ends just in front of the ejected photo's picture side
      const ph = P.polaroid.userData.photo;
      if (ph && t > 15.5 && t < 16.95) {
        P.polaroid.updateMatrixWorld(true);
        const pp = (ph.getObjectByName("photoImage") || ph).getWorldPosition(new THREE.Vector3()), nrm = new THREE.Vector3(0, 0, 1).applyQuaternion(ph.getWorldQuaternion(new THREE.Quaternion()));
        const k = (x) => x * x * (3 - 2 * x), kin = t < 16.5 ? k(Math.min(1, Math.max(0, (t - 15.5) / 0.6))) : 0;   // after 16.2 the picture covers the frame (insert below), camera resets unseen
        camera.position.lerp(pp.clone().addScaledVector(nrm, 0.13), kin).addScaledVector(nrm, 0.22 * Math.sin(Math.PI * kin))
          .addScaledVector(new THREE.Vector3(0, -1, 0).applyQuaternion(ph.getWorldQuaternion(new THREE.Quaternion())), 0.3 * Math.sin(Math.PI * kin));   // come in from the photo's free edge, away from the camera body   // arc over the camera body, never through it
        const phq = ph.getWorldQuaternion(new THREE.Quaternion()), phUp = new THREE.Vector3(0, 1, 0).applyQuaternion(phq);
        camera.up.set(0, 1, 0).lerp(phUp, kin).normalize();                                               // roll with the photo: it ends upright, square to the lens
        const tg = c.target.clone().lerp(pp, kin); camera.fov = c.fov + (40 - c.fov) * kin; camera.lookAt(tg); camera.updateProjectionMatrix(); camera.updateMatrixWorld();
        camera.up.set(0, 1, 0);
        for (const k2 in chars) { const s2 = a.cast[k2]; if (s2 && s2.visible) chars[k2].update(s2.s || {}, { camera, keyLightPos: key, time: t }); }
      }
      // selfie insert: the picture grows from its exact spot on screen to fill the frame (16.0-16.2), holds, then whips out (16.8-16.95)
      state.selfie = null;
      if (ph && t > 16.1 && t < 16.97) {
        let rect = null;
        if (t < 16.5) { const im = ph.getObjectByName("photoImage") || ph; im.updateMatrixWorld(true); const h = 0.079 / 2; let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
          for (const [cx, cy] of [[-h, -h], [h, -h], [h, h], [-h, h]]) { const q = new THREE.Vector3(cx, cy, 0).applyMatrix4(im.matrixWorld).project(camera);
            x0 = Math.min(x0, q.x); x1 = Math.max(x1, q.x); y0 = Math.min(y0, -q.y); y1 = Math.max(y1, -q.y); }
          rect = { x: (x0 * 0.5 + 0.5) * W, y: (y0 * 0.5 + 0.5) * H, w: (x1 - x0) * 0.5 * W, h: (y1 - y0) * 0.5 * H }; }
        const sk = (e0, e1) => { const x = Math.min(1, Math.max(0, (t - e0) / (e1 - e0))); return x * x * (3 - 2 * x); };
        state.selfie = { rect, g: sk(16.12, 16.32), out: sk(16.8, 16.95), dev: a.props.selfieDevelop ?? 1 };
      }
      // render the selfie from the lens while it is visible
      if (t > 14.8 && t < 17.4 && ph) {
        P.polaroid.updateMatrixWorld(true);
        // arm's-length selfie view of that moment: in front of his face, slightly to his right, the kitchen behind him
        const hd = chars.robber.headCenter(), fr = new THREE.Vector3(Math.sin(a.cast.robber.rot), 0, Math.cos(a.cast.robber.rot)), rt = new THREE.Vector3(-fr.z, 0, fr.x);
        selfieCam.position.copy(hd).addScaledVector(fr, 1.75).addScaledVector(rt, -0.35).add(new THREE.Vector3(0, 0.3, 0));
        selfieCam.lookAt(hd.x, hd.y - 0.12, hd.z);              // whole head + shoulders in the picture, nothing cropped selfieCam.updateMatrixWorld();
        const robberFaceCam = { camera: selfieCam, keyLightPos: key, time: t };
        chars.robber.update(a.cast.robber.s || {}, robberFaceCam);                                   // his face drawn toward the selfie lens
        await chars.robber.ready?.();
        const vis = P.polaroid.visible; P.polaroid.visible = false;
        renderer.setRenderTarget(selfieRT); renderer.render(scene, selfieCam); renderer.readRenderTargetPixels(selfieRT, 0, 0, SELF, SELF, selfieBuf); renderer.setRenderTarget(null);
        P.polaroid.visible = vis;
        chars.robber.update(a.cast.robber.s || {}, { camera, keyLightPos: key, time: t });          // back to the main camera
        const g = selfieCanvas.getContext("2d"), img = g.createImageData(SELF, SELF);
        for (let y = 0; y < SELF; y++) img.data.set(selfieBuf.subarray((SELF - 1 - y) * SELF * 4, (SELF - y) * SELF * 4), y * SELF * 4);
        g.putImageData(img, 0, 0);
        const hp = hd.clone().project(selfieCam), hx = (hp.x * 0.5 + 0.5) * SELF, hy = (-hp.y * 0.5 + 0.5) * SELF;
        // flash blow-out: the whole face is solid white light (no features at all), with a soft glow around it
        const hr = hd.clone().addScaledVector(rt, chars.robber.R * 1.0).project(selfieCam), rpx = Math.abs((hr.x - hp.x) * 0.5 * SELF);
        const halo = g.createRadialGradient(hx, hy, 0, hx, hy, rpx * 2.8);
        halo.addColorStop(0, "rgba(255,255,248,0.9)"); halo.addColorStop(0.5, "rgba(255,252,235,0.45)"); halo.addColorStop(1, "rgba(255,250,230,0)");
        g.fillStyle = halo; g.fillRect(0, 0, SELF, SELF);
        const core = g.createRadialGradient(hx, hy, 0, hx, hy, rpx * 1.35);
        core.addColorStop(0, "rgba(255,255,253,1)"); core.addColorStop(0.8, "rgba(255,255,252,1)"); core.addColorStop(1, "rgba(255,255,250,0)");
        g.fillStyle = core; g.fillRect(0, 0, SELF, SELF); g.fillStyle = "rgba(255,255,255,0.12)"; g.fillRect(0, 0, SELF, SELF);
        selfieTex.needsUpdate = true;
      }
      // ending: frozen mugshot -> it is the newspaper photo; camera over the page, then a pull-back to the table under the lamp
      state.ending = null;
      if (t > dir.FLASH + 0.5 / FPS && capDone) {
        const F0 = dir.FLASH, ph2 = P.newspaperEnd.getObjectByName("newsPhoto"); P.newspaperEnd.updateMatrixWorld(true);
        const pc = ph2.getWorldPosition(new THREE.Vector3()), pq = ph2.getWorldQuaternion(new THREE.Quaternion());
        const nrm = new THREE.Vector3(0, 0, 1).applyQuaternion(pq), pup = new THREE.Vector3(0, 1, 0).applyQuaternion(pq);
        const sk = (e0, e1) => { const x = Math.min(1, Math.max(0, (t - e0) / (e1 - e0))); return x * x * (3 - 2 * x); };
        const fov0 = 40, d0 = NEWS_PW / (2 * Math.tan(THREE.MathUtils.degToRad(fov0 / 2)) * (W / H));
        const k = sk(F0 + 0.7, F0 + 1.95), toDoor = new THREE.Vector3(0, 0, 1);
        const viewDir = nrm.clone().lerp(nrm.clone().multiplyScalar(0.9).addScaledVector(toDoor, 0.42), k).normalize();
        const tgt = pc.clone().lerp(dir.NEWS_END.clone().add(new THREE.Vector3(0, 0, -0.2)), k);
        camera.position.copy(tgt).addScaledVector(viewDir, d0 * (1 + 1.25 * Math.pow(k, 1.2)));
        camera.up.copy(pup).lerp(new THREE.Vector3(0, 1, 0), k * k).normalize(); camera.fov = fov0 + 10 * k; camera.lookAt(tgt);
        camera.updateProjectionMatrix(); camera.updateMatrixWorld(); camera.up.set(0, 1, 0);
        const h2w = NEWS_PW / 2, h2h = NEWS_PH / 2; let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
        for (const [cx, cy] of [[-h2w, -h2h], [h2w, -h2h], [h2w, h2h], [-h2w, h2h]]) { const q = new THREE.Vector3(cx, cy, 0).applyMatrix4(ph2.matrixWorld).project(camera);
          x0 = Math.min(x0, q.x); x1 = Math.max(x1, q.x); y0 = Math.min(y0, -q.y); y1 = Math.max(y1, -q.y); }
        state.ending = { rect: { x: (x0 * 0.5 + 0.5) * W, y: (y0 * 0.5 + 0.5) * H, w: (x1 - x0) * 0.5 * W, h: (y1 - y0) * 0.5 * H },
          clip: sk(F0 + 0.35, F0 + 0.65), news: sk(F0 + 0.3, F0 + 0.95), alpha: 1 - sk(F0 + 1.05, F0 + 1.45), band: { y: bandY, h: bandH } };
      }
      if (a.props.squirt) { P.squirt.visible = true; P.squirt.position.copy(a.props.squirt.at); P.squirt.userData.set?.(a.props.squirt.k); } else P.squirt.visible = false;
      lemonRow.visible = z === "apt" && t < 14.1;
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
      if (frame === FLASH_F && !capDone) {                                            // grab the mugshot (canvas only: no captions / flash overlay)
        capCanvas.getContext("2d").drawImage(renderer.domElement, 0, 0, W, H);
        newsCanvas.getContext("2d").drawImage(capCanvas, 0, bandY, W, bandH, 0, 0, newsCanvas.width, newsCanvas.height);
        newsTex.needsUpdate = true; P.newspaperEnd.userData.setPhoto(newsTex); capDone = true;
      }
      state.last = a;
    },
    dispose() { renderer.dispose(); mini.r.dispose(); },
  };
  return ret;
}

function FxLayer({ a, t, W, H, sel }) {
  const ref = useRef(null);
  useEffect(() => {
    const cv = ref.current; if (!cv || !a) return; const g = cv.getContext("2d"); g.clearRect(0, 0, W, H);
    if (a.fx.cctv > 0.001) { g.save(); g.globalAlpha = a.fx.cctv; PV.drawCCTVOverlay(g, W, H, t, { stamp: a.zone === "bank2" ? "04-19-95 14:51:12" : "04-19-95 14:32:07", cam: a.zone === "bank2" ? "CAM 01" : "CAM 02" }); g.restore(); }
    if (a.fx.rewind > 0.001) PV.drawRewind(g, W, H, a.fx.rewind, t);
    const sf = sel?.selfie;
    if (sf && sf.canvas && (sf.rect || sf.g >= 1)) {                       // the selfie insert (same picture as the photo, never a dissolve)
      const S0 = H, cover = { x: (W - S0) / 2, y: 0, w: S0, h: S0 }, r0 = sf.rect || cover, e = sf.g;
      const R = { x: r0.x + (cover.x - r0.x) * e, y: r0.y + (cover.y - r0.y) * e, w: r0.w + (cover.w - r0.w) * e, h: r0.h + (cover.h - r0.h) * e };
      R.x -= sf.out * W * 1.3;                                                // whip-pan out to the left
      if (e > 0.001 || sf.rect) { g.fillStyle = "#26262c"; g.fillRect(R.x, R.y, R.w, R.h); g.globalAlpha = Math.min(1, sf.dev); g.drawImage(sf.canvas, R.x, R.y, R.w, R.h); g.globalAlpha = 1; }
    }
    const en = sel?.ending;
    if (en && en.canvas && en.alpha > 0.001) {                                    // the frozen mugshot -> the newspaper photo (same picture, same place)
      g.save(); g.globalAlpha = en.alpha;
      g.filter = `grayscale(${en.news}) sepia(${0.18 * en.news}) contrast(${1 + 0.12 * en.news})`;
      if (en.clip < 1) { const e = en.clip, R1 = en.rect;
        const R = { x: R1.x * e, y: R1.y * e, w: W + (R1.w - W) * e, h: H + (R1.h - H) * e };
        g.beginPath(); g.rect(R.x, R.y, R.w, R.h); g.clip(); g.drawImage(en.canvas, 0, 0, W, H); }
      else g.drawImage(en.canvas, 0, en.band.y * en.canvas.width / W, en.canvas.width, en.band.h * en.canvas.width / W, en.rect.x, en.rect.y, en.rect.w, en.rect.h);
      g.restore();
    }
    if (a.fx.flash > 0.001) { g.fillStyle = `rgba(255,255,250,${0.85 * a.fx.flash})`; g.fillRect(0, 0, W, H); }
  });
  return <canvas ref={ref} width={W} height={H} style={{ position: "absolute", left: 0, top: 0, width: W, height: H }} />;
}

function Overlay({ o, cam, W, H, t }) {
  const p = o.at.clone().project(cam); if (p.z > 1) return null;
  const x = (p.x * 0.5 + 0.5) * W, y = (-p.y * 0.5 + 0.5) * H, s = W / 1080, age = Math.max(0, t - o.t0);
  if (o.kind === "bulb") { const k = Math.min(1, age / 0.18), pulse = 1 + 0.06 * Math.sin(age * 9), bob = 6 * s * Math.sin(age * 3);
    return <div style={{ position: "absolute", left: x, top: y + bob, transform: `translate(-50%,-50%) scale(${(0.4 + 0.6 * k) * pulse})` }}>
    <div style={{ position: "absolute", left: "50%", top: 90 * s, width: 520 * s, height: 520 * s, transform: "translate(-50%,-50%)", borderRadius: "50%",
      background: "radial-gradient(rgba(255,236,120,0.75), rgba(255,220,80,0.35) 35%, rgba(255,210,60,0) 70%)" }} />
    {[...Array(10)].map((_, i) => <div key={i} style={{ position: "absolute", left: "50%", top: 90 * s, width: 12 * s, height: 60 * s, background: "#ffe45c",
      border: `${4 * s}px solid #2a1b12`, borderRadius: 8 * s, transform: `translate(-50%,-50%) rotate(${i * 36}deg) translateY(${-150 * s}px)` }} />)}
    <div style={{ position: "relative", width: 170 * s, height: 170 * s, borderRadius: "50%", background: "radial-gradient(circle at 40% 35%, #fffef0, #ffef7a 45%, #ffcf1f 80%)",
      border: `${9 * s}px solid #2a1b12`, boxShadow: `0 0 ${90 * s}px ${30 * s}px rgba(255,225,80,0.9)` }} />
    <div style={{ position: "relative", width: 76 * s, height: 46 * s, margin: `${-10 * s}px auto 0`, background: "repeating-linear-gradient(#9aa0a8 0 9px, #6f747c 9px 14px)",
      border: `${8 * s}px solid #2a1b12`, borderRadius: 8 * s }} /></div>; }
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
      {a && <FxLayer a={a} t={t} W={width} H={height} sel={{ selfie: c?.state.selfie ? { ...c.state.selfie, canvas: c.selfieCanvas } : null, ending: c?.state.ending ? { ...c.state.ending, canvas: c.capCanvas } : null }} />}
      {c && a && a.overlays.map((o, i) => <Overlay key={i} o={o} cam={c.camera} W={width} H={height} t={t} />)}
      <Captions words={WORDS.map(([s, e, w]) => [s, e, w.replace(/["]/g, "")])} />
      <Audio src={staticFile("audio/vo_v02.wav")} />
      <Audio src={staticFile("audio/fx_v02.wav")} />
    </AbsoluteFill>
  );
};
