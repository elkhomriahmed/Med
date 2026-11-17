// EXTERIOR — the lighthouse outside, in the one connected world of LAYOUT_v01 (lamp room at the origin, built elsewhere).
//
//   import { buildExterior } from "../world/exterior/index.js";
//   const ext = await buildExterior({ time: "night" });     // { group, anchors, update(t, camera), setTime(name[, nameB, k]), lights, controls, parts }
//   scene.add(ext.group);
//   per frame: ext.controls.swerve = 0..1; ext.controls.rowboat = 0..1; ext.update(t, camera); look.render();
//
// Owns: tower (y -0.6 .. -30) with corbels under the gallery + the OUTER lantern roof, rock island (top y -30, cliffs to the
// sea), sea (y -34, r 1600), the ONE sky dome (r 1600), jetty (+Z, deck y -33.2, z 16.5..30), ships/boats, gulls, outside
// beams, snow (cover + falling). Times: night | dusk | morning | day | winter | winterNight.
import * as THREE from "three";
import { pbr, plain } from "../materials.js";
import { mergedMesh, tube } from "../geometry.js";
import { U, TIMES, snowify, smooth, lerp } from "./util.js";
import { createExteriorSky } from "./sky.js";
import { createSea, bakeFoam, SEA_Y } from "./sea.js";
import { rockGeometry, boulder, lipRadius } from "./rock.js";
import { buildTower } from "./tower.js";
import { buildJetty, JETTY } from "./jetty.js";
import { buildSupplyBoat, buildRowboat, buildSchooner } from "./boats.js";
import { createOutsideBeams, beamRotation, beamAxis, createSnowfall, perchedGull, flyingGull } from "./fx.js";

export { TIMES, SEA_Y, beamRotation };
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const LAMP = V(0, 1.54, -0.3);
export const TOWN = V(40, -34, 300);

export async function buildExterior(opts = {}) {
  const O = { time: "night", lanternRoof: true, shadows: true, shadowMap: 2048, ...opts };
  const group = new THREE.Group(); group.name = "exterior";
  const add = (o) => { group.add(o); return o; };

  // ---------------------------------------------------------------- sky + rock
  const sky = add(createExteriorSky(1500));          // writes depth, drawn first; camera.far must be >= 2000
  const rockM = snowify(await pbr("cliff_side", { color: [0.6, 0.66, 0.78], normalScale: 1.9 }), { thresh: 0.62 });
  const R = rockGeometry();
  const rock = add(new THREE.Group()); rock.name = "rock";
  for (const [g, n] of [[R.top, "rockTop"], [R.cliff, "rockCliff"]]) { const m = new THREE.Mesh(g, rockM); m.name = n; m.castShadow = m.receiveShadow = true; rock.add(m); }
  // boulders round the foot (not in the jetty sector) + the reef the ship nearly hits
  const bl = [], foamShapes = [{ type: "island", rAt: R.seaRAt }];
  { let s = 1;
    for (let k = 0; k < 22; k++) { const th = (k / 22) * Math.PI * 2 + 0.13 * Math.sin(k * 3.1);
      if (Math.abs(Math.atan2(Math.sin(th - Math.PI / 2), Math.cos(th - Math.PI / 2))) < 0.42) continue;
      const rr = R.seaRAt(th) + 0.6 + ((k * 7) % 5) * 0.45, sc = 1.0 + ((k * 13) % 7) * 0.22, x = Math.cos(th) * rr, z = Math.sin(th) * rr;
      bl.push(boulder(s++, [sc * 1.3, sc * 0.9, sc * 1.1], [x, SEA_Y - 0.3 + sc * 0.25, z], k)); foamShapes.push({ type: "circle", x, z, r: sc * 1.1 }); }
    for (const [x, z, a, b, c] of [[-28, 37, 2.6, 3.4, 2.2], [-31.5, 33.5, 1.8, 2.4, 1.6], [-25.5, 40.5, 1.5, 1.8, 1.4], [-30.5, 39.8, 1.2, 1.4, 1.1], [-24, 34.5, 1.0, 1.0, 1.0]]) {
      bl.push(boulder(s++, [a, b, c], [x, SEA_Y + b * 0.35, z], x)); foamShapes.push({ type: "circle", x, z, r: Math.max(a, c) * 0.95 }); }
  }
  const boulders = new THREE.Mesh(mergedGeom(bl), rockM); boulders.name = "boulders"; boulders.castShadow = boulders.receiveShadow = true; rock.add(boulders);

  // ---------------------------------------------------------------- tower + jetty
  const tower = await buildTower({ lanternRoof: O.lanternRoof }); add(tower.group);
  const jetty = await buildJetty(); add(jetty.group);
  for (const p of jetty.piles) foamShapes.push({ type: "circle", x: p.x, z: p.z, r: 0.2 });
  for (let z = 14.2; z <= 16.6; z += 0.6) foamShapes.push({ type: "circle", x: 0, z, r: 0.9 });     // stair foot

  // ---------------------------------------------------------------- sea (foam baked from the coast + rocks + piles)
  const foam = bakeFoam(foamShapes, { half: 72, size: 512, width: 5 });
  const sea = add(createSea(foam, { apex: LAMP, radius: 1450 }));   // covers the town (z 300) and far beyond

  // ---------------------------------------------------------------- boats + ships
  const supply = await buildSupplyBoat({ name: "MARY ANN", sub: "SUPPLY" });
  supply.group.position.set(-3.08, SEA_Y, 24.2); add(supply.group);
  const rowboat = await buildRowboat(); add(rowboat.group);
  const swerve = await buildSchooner({ seed: 13 }); add(swerve.group);
  const passA = await buildSchooner({ seed: 21, detail: 0, hullPaint: [[-9, 0x5a2416], [0.1, 0x6a1e18], [1.25, 0xf0e6d0], [1.45, 0x6a1e18]], sail: 0xf0e4c8 }); add(passA.group);
  const passB = await buildSchooner({ seed: 33, detail: 0, hullPaint: [[-9, 0x5a2416], [0.1, 0x1e3a2a], [1.25, 0xe8d8b0], [1.45, 0x1e3a2a]], sail: 0xe2d2b4 }); add(passB.group);
  passB.group.scale.setScalar(0.8);
  // mooring lines: supply boat bow + stern to the bollards (boat sways only a centimetre, so the ropes stay attached)
  { supply.group.updateMatrixWorld(true);
    const bow = V(0.25, supply.hull.sheer(0.93) + 0.05, supply.hull.L / 2 * 0.86).applyMatrix4(supply.group.matrixWorld);
    const stern = V(0.95, supply.hull.sheer(0.05) + 0.05, -supply.hull.L / 2 + 0.4).applyMatrix4(supply.group.matrixWorld);
    const rope = (a, b) => { const pts = []; for (let i = 0; i <= 12; i++) { const t = i / 12; pts.push(a.clone().lerp(b, t).add(V(0, -Math.sin(Math.PI * t) * 0.35, 0))); } return tube(pts, 0.02, 40, 6); };
    const mp = jetty.anchors.mooringPost.clone().add(V(0, 0.4, 0)), sp = jetty.anchors.sternPost.clone().add(V(0, 0.4, 0));
    const ropes = mergedMesh([rope(bow, mp), rope(stern, sp)], snowify(plain(0x8a6a44, { roughness: 0.9, relief: 0.6 })), { name: "mooringLines" });
    jetty.group.add(ropes); }

  const swPath = new THREE.CatmullRomCurve3([V(-135, SEA_Y, 108), V(-80, SEA_Y, 76), V(-47, SEA_Y, 49), V(-39.5, SEA_Y, 30), V(-48, SEA_Y, 6), V(-84, SEA_Y, -40)], false, "centripetal");
  const rbPath = new THREE.CatmullRomCurve3([V(10.5, SEA_Y, 47), V(7.2, SEA_Y, 37), V(3.6, SEA_Y, 29.2), V(2.36, SEA_Y, 25.6)], false, "centripetal");
  const passLines = [[V(-320, SEA_Y, 175), V(320, SEA_Y, 150)], [V(300, SEA_Y, -230), V(-300, SEA_Y, -200)]];

  // ---------------------------------------------------------------- gulls (perched on the gallery rail with binoculars, flying)
  const RR = 3.85, railTop = 1.12 + 0.032;
  const perched = [-0.34, 0, 0.31].map((da, i) => { const g = perchedGull(i + 1), a = Math.PI / 2 + da;
    g.position.set(RR * Math.cos(a), railTop, RR * Math.sin(a)); g.rotation.y = Math.atan2(-Math.cos(a), -Math.sin(a)) + (i - 1) * 0.12;
    g.scale.setScalar(1.25); add(g); return g; });
  const flyers = [0, 1, 2, 3].map((i) => add(flyingGull(i + 1)));
  const flyPaths = [{ c: V(0, -6, 4), r: 16, w: 0.32, ph: 0 }, { c: V(2, -12, 10), r: 22, w: -0.26, ph: 2 }, { c: V(0, -26, 22), r: 9, w: 0.42, ph: 4 },
    { c: V(-3, 2, 0), r: 12, w: 0.36, ph: 1.3 }];

  // ---------------------------------------------------------------- snow cover on the gallery deck + rails (lamp room is not ours: overlays)
  const snowM = plain(0xe6ecf5, { roughness: 0.85, relief: 0.35 });
  const snowGallery = new THREE.Group(); snowGallery.name = "snowGallery"; add(snowGallery);
  { const ring = new THREE.RingGeometry(3.08, 3.99, 96, 3); ring.rotateX(-Math.PI / 2);
    const p = ring.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), rr = Math.hypot(x, z);
      p.setY(i, 0.0 + 0.035 * smooth(3.08, 3.25, rr) * (0.7 + 0.3 * Math.sin(x * 5.1 + z * 3.7)) * smooth(3.99, 3.9, rr)); }
    ring.computeVertexNormals(); const m = new THREE.Mesh(ring, snowM); m.position.y = -0.02; m.receiveShadow = true; snowGallery.add(m);
    const cap = new THREE.TorusGeometry(RR, 0.04, 8, 160); cap.rotateX(Math.PI / 2); cap.scale(1, 0.55, 1); cap.translate(0, railTop + 0.012, 0);
    const cap2 = new THREE.TorusGeometry(RR, 0.026, 8, 160); cap2.rotateX(Math.PI / 2); cap2.scale(1, 0.5, 1); cap2.translate(0, 0.62 + 0.024, 0);
    const caps = new THREE.Mesh(mergedGeom([cap, cap2]), snowM); caps.castShadow = true; caps.receiveShadow = true; snowGallery.add(caps); }
  const snowfall = add(createSnowfall({}));

  // ---------------------------------------------------------------- beams seen from outside
  const beams = createOutsideBeams({ apex: LAMP }); add(beams.group);

  // ---------------------------------------------------------------- lights: key (moon/sun) with shadows, hemisphere fill, lamps
  const key = new THREE.DirectionalLight(0xffffff, 1.5); key.name = "key";
  const keyTarget = new THREE.Object3D(); keyTarget.position.set(0, -31, 10); key.target = keyTarget; add(key); add(keyTarget);
  if (O.shadows) { key.castShadow = true; key.shadow.mapSize.set(O.shadowMap, O.shadowMap); key.shadow.bias = -0.0004; key.shadow.normalBias = 0.04; key.shadow.radius = 3; }
  const shadowFocus = { center: V(0, -24, 12), half: 46 };
  const hemi = add(new THREE.HemisphereLight(0x4a5a9a, 0x1a1a2a, 0.4)); hemi.name = "hemi";
  const lights = { key, hemi, door: tower.doorLight, jetty: jetty.light };

  // ---------------------------------------------------------------- controls + time of day
  const controls = { swerve: 0, rowboat: 1, passing: null, beamRot: null, beams: null, shadowFocus: null };
  let T = null, sunDir = V(0, 1, 0);
  const glow = [...tower.glowMats.filter((m) => m !== tower.glassM), ...jetty.glowMats];
  const shipGlow = [...swerve.lanterns, ...passA.lanterns, ...passB.lanterns].map((m) => m.material);
  function mix(a, b, k) {      // blend two presets (numbers, arrays, hex colours, nested)
    if (b === undefined || k <= 0) return a; if (k >= 1) return b;
    if (typeof a === "number" && a > 0xff && typeof b === "number" && b > 0xff) return new THREE.Color(a).lerp(new THREE.Color(b), k).getHex();
    if (typeof a === "number") return lerp(a, b, k);
    if (Array.isArray(a)) return a.map((v, i) => lerp(v, b[i], k));
    if (typeof a === "object") { const o = {}; for (const kk of Object.keys(a)) o[kk] = mix(a[kk], b[kk], k); return o; }
    return k < 0.5 ? a : b;
  }
  /** setTime("night") or blend setTime("dusk", "night", 0.4). Cheap: uniforms + light values only. Returns grade hints. */
  function setTime(name, nameB = null, k = 0) {
    const P = nameB ? mix(TIMES[name], TIMES[nameB], k) : TIMES[name]; T = P;
    sky.userData.setPreset(P.sky); sunDir = V(...P.sky.sunDir).normalize();
    key.color.setRGB(...P.key.color); key.intensity = P.key.intensity;
    hemi.color.set(P.hemi.sky); hemi.groundColor.set(P.hemi.ground); hemi.intensity = P.hemi.intensity;
    const su = sea.userData.uniforms;
    su.keyDir.value.copy(sunDir); su.keyCol.value.set(...P.key.color).multiplyScalar(P.key.intensity * 0.6);
    su.amb.value.set(hemi.color.r, hemi.color.g, hemi.color.b).multiplyScalar(P.hemi.intensity * 0.5);
    su.deep.value.set(...P.sea.deep); su.specK.value = P.sea.spec;
    for (const kk of ["zenith", "horizon", "haze", "seaH"]) su[kk].value.set(...P.sky[kk]);
    su.hazeW.value = P.sky.hazeW; su.hazeK.value = P.sky.hazeK; su.clouds.value = P.sky.clouds; su.cloudLit.value.set(...P.sky.cloudLit);
    tower.glassM.emissiveIntensity = P.windows; supply.winM.emissiveIntensity = P.windows * 0.7;
    for (const m of glow) m.emissiveIntensity = 4 * P.lamps; for (const m of shipGlow) m.emissiveIntensity = 3.5 * Math.max(P.lamps, P.beams);
    tower.doorLight.intensity = 9 * P.lamps; jetty.light.intensity = 7 * P.lamps; tower.doorLight.visible = jetty.light.visible = P.lamps > 0.01;
    U.snow.value = P.snow; snowGallery.visible = P.snow > 0.01; snowfall.visible = P.flakes > 0.01; snowfall.userData.uniforms.amount.value = P.flakes;
    for (const g of flyers) g.visible = P.flyingGulls > 0.5;
    for (const g of perched) g.position.y = railTop + 0.03 * P.snow;
    placeKey();
    return P.hint;
  }
  function placeKey() {
    const f = controls.shadowFocus || shadowFocus;
    keyTarget.position.copy(f.center); key.position.copy(f.center).addScaledVector(sunDir, 200);
    const c = key.shadow.camera; c.left = -f.half; c.right = f.half; c.top = f.half; c.bottom = -f.half; c.near = 120; c.far = 300; c.updateProjectionMatrix();
    keyTarget.updateMatrixWorld();
  }

  // ---------------------------------------------------------------- per-frame update
  const tmp = V(0, 0, 0), up = V(0, 1, 0);
  function poseBoat(obj, pos, heading, roll, pitch, t, bobA = 0.08, seed = 0) {
    obj.position.set(pos.x, SEA_Y + bobA * Math.sin(t * 1.1 + seed) + bobA * 0.4 * Math.sin(t * 1.9 + seed * 2), pos.z);
    obj.rotation.set(pitch + bobA * 0.25 * Math.sin(t * 1.3 + seed), heading, roll + bobA * 0.5 * Math.sin(t * 0.9 + seed * 3), "YXZ");
  }
  const headingOf = (v) => Math.atan2(v.x, v.z);
  function update(t, camera = null) {
    sky.userData.update(t); sea.userData.uniforms.time.value = t;
    // beams
    const on = controls.beams ?? (T ? T.beams : 1), rot = controls.beamRot ?? beamRotation(t);
    beams.update(rot, camera, on);
    const su = sea.userData.uniforms; su.beamOn.value = on; su.beamAxis0.value.copy(beamAxis(rot, 0)); su.beamAxis1.value.copy(beamAxis(rot, 1));
    // swerving ship: along its path by u, heel into the turn
    { const u = THREE.MathUtils.clamp(controls.swerve, 0, 1), p = swPath.getPointAt(u), ta = swPath.getTangentAt(Math.max(0, u - 0.01)), tb = swPath.getTangentAt(Math.min(1, u + 0.01));
      const h = headingOf(swPath.getTangentAt(u)); let dh = headingOf(tb) - headingOf(ta); dh = Math.atan2(Math.sin(dh), Math.cos(dh));
      poseBoat(swerve.group, p, h, THREE.MathUtils.clamp(-dh * 2.2, -0.26, 0.26) + 0.05, 0, t, 0.12, 1); }
    // ships passing safely in the distance
    passLines.forEach(([a, b], i) => { const u = controls.passing ?? ((t / 90 + i * 0.45) % 1), ship = i ? passB : passA;
      poseBoat(ship.group, tmp.copy(a).lerp(b, u), headingOf(b.clone().sub(a)), 0.05, 0, t, 0.12, 3 + i); });
    // rowboat: approach (0..0.8), bump the ladder and settle (0.8..1)
    { const u = THREE.MathUtils.clamp(controls.rowboat, 0, 1), k = Math.min(u / 0.8, 1), e = 1 - (1 - k) * (1 - k);
      const p = rbPath.getPointAt(e).clone(); let h = headingOf(rbPath.getTangentAt(e)); h = lerp(h, Math.PI, smooth(0.7, 1, e));
      let roll = 0, pitch = 0;
      if (u > 0.8) { const b = (u - 0.8) / 0.2; p.x += 0.24 * Math.sin(Math.PI * Math.min(b * 2.2, 1)) * Math.exp(-1.5 * b) + 0.04 * Math.sin(b * 9) * Math.exp(-4 * b);
        roll = -0.09 * Math.sin(b * 14) * Math.exp(-3.5 * b); pitch = 0.03 * Math.sin(b * 10) * Math.exp(-3 * b); }
      poseBoat(rowboat.group, p, h, roll, pitch, t, 0.035, 5); }
    poseBoat(supply.group, supply.group.position, 0, 0, 0, t, 0.012, 7); supply.group.position.x = -3.08; supply.group.position.z = 24.2;
    // flying gulls circle the tower, banking into the turn
    flyers.forEach((g, i) => { if (!g.visible) return; const F = flyPaths[i], a = F.ph + t * F.w;
      g.position.set(F.c.x + Math.cos(a) * F.r, F.c.y + Math.sin(t * 0.7 + i) * 0.8, F.c.z + Math.sin(a) * F.r);
      g.rotation.set(0, Math.atan2(-Math.sin(a) * Math.sign(F.w), Math.cos(a) * Math.sign(F.w)), Math.sign(F.w) * 0.35, "YXZ");
      g.userData.update(t); });
    snowfall.userData.update(t, camera);
    if (controls.shadowFocus) placeKey();
  }

  // ---------------------------------------------------------------- anchors (world space)
  const swClosest = swPath.getPointAt(0.55);
  const anchors = {
    ...jetty.anchors, ...tower.anchors,
    rowboatLanding: V(2.36, SEA_Y, 25.6), supplyBoat: supply.group.position.clone(),
    supplyBoatNameBoard: supply.spots.nameBoard.getWorldPosition(V(0, 0, 0)),
    shipSwervePath: { start: swPath.getPointAt(0), end: swPath.getPointAt(1), closest: swClosest, reef: V(-28, SEA_Y, 37), curve: swPath },
    towerWindowView: { position: V(1.9, 2.2, 10.5), target: V(0, 1.7, 0), fov: 55 },
    galleryRail: perched[1].position.clone(), gullSpots: perched.map((g) => g.position.clone()),
    galleryOutsideView: { position: V(2.6, 2.4, 7.6), target: V(0.1, 1.25, 3.7), fov: 45 },
    seaWide: { position: V(-62, 12, 112), target: V(-20, -26, 16), fov: 50 },
    towardTown: TOWN.clone().sub(V(0, 0, 0)).normalize(), town: TOWN.clone(),
    rockTop: V(0, -30, 8), lamp: LAMP.clone(),
  };
  update(0); setTime(O.time);
  /** World position of a boat deck spot (e.g. ext.spotWorld(ext.boats.swerve.spots.captain)). */
  const spotWorld = (o) => { o.updateWorldMatrix(true, false); return o.getWorldPosition(V(0, 0, 0)); };
  return {
    group, anchors, update, setTime, lights, controls, spotWorld,
    get sunDir() { return sunDir.clone(); }, keyLightPos: () => key.position.clone(),
    /** Tighten the key shadow around what the camera sees: focusShadow(center, halfSizeMetres) / focusShadow(null) = whole island. */
    focusShadow: (center, half = 12) => { controls.shadowFocus = center ? { center: center.clone(), half } : null; placeKey(); },
    boats: { supply, rowboat, swerve, passA, passB }, gulls: { perched, flyers },
    parts: { sky, sea, rock, tower: tower.group, jetty: jetty.group, beams: beams.group, snowfall, snowGallery },
    setHeight: (h) => snowfall.userData.setHeight(h),
  };
}

function mergedGeom(list) {
  const out = list.map((g) => { const n = g.index ? g.toNonIndexed() : g; for (const k of Object.keys(n.attributes)) if (!["position", "normal", "uv", "color"].includes(k)) n.deleteAttribute(k);
    if (!n.attributes.color) { const c = new Float32Array(n.attributes.position.count * 3).fill(1); n.setAttribute("color", new THREE.BufferAttribute(c, 3)); }
    if (!n.attributes.uv) n.setAttribute("uv", new THREE.BufferAttribute(new Float32Array(n.attributes.position.count * 2), 2)); return n; });
  return mergeGeometriesSafe(out);
}
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
function mergeGeometriesSafe(list) { return mergeGeometries(list, false); }
