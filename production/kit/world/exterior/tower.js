// Lighthouse tower (outside): whitewashed brick with one red band, stone plinth + entrance steps, iron door with lantern,
// small windows (warm glow at night), corbels under the lamp-room gallery, the outer lantern roof + vent ball,
// a flagstone path on the rock and the stone stairs down to the jetty.
import * as THREE from "three";
import { roundedBox, roundedCylinder, place, tint, boxUV, mergedMesh, lathe, tube } from "../geometry.js";
import { pbr, plain } from "../materials.js";
import { prop, sizeOf } from "../props.js";
import { rng } from "../../shared/assets.js";
import { snowify, smooth } from "./util.js";
import { ROCK_TOP, lipRadius, topY } from "./rock.js";

export const TOWER = { yTop: -0.6, yBase: ROCK_TOP, rTop: 3.3, rBase: 4.2, plinthTop: -28.8 };
export const towerR = (y) => TOWER.rBase + (TOWER.rTop - TOWER.rBase) * ((y - TOWER.yBase) / (TOWER.yTop - TOWER.yBase));

/** Lathe segment between y0..y1 following towerR (+dr), UVs in metres (brick tile ~1.5 m, seamless round). */
function towerSegment(y0, y1, dr = 0, n = 24) {
  const pts = []; for (let i = 0; i <= n; i++) { const y = y0 + (y1 - y0) * (i / n); pts.push([towerR(y) + dr, y]); }
  const g = lathe(pts, 96), uv = g.attributes.uv, p = g.attributes.position;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 16, p.getY(i) / 1.45);
  return g;
}

/** Orientation that faces outward from the tower axis at angle phi (phi = 0 -> +Z, increases toward +X). */
const outward = (phi) => new THREE.Euler(0, phi, 0);

export async function buildTower({ lanternRoof = true } = {}) {
  const group = new THREE.Group(); group.name = "tower"; const r = rng(31);
  const add = (o) => { group.add(o); return o; };
  const [brickW, brickR, stoneM, plasterM, ironM, woodM] = await Promise.all([
    pbr("whitewashed_brick", { color: [1.02, 0.99, 0.94], normalScale: 1.5, vertexColors: false }),
    pbr("whitewashed_brick", { color: [0.86, 0.17, 0.12], normalScale: 1.5, vertexColors: false }),
    pbr("stacked_stone_wall", { color: [0.95, 0.9, 0.84], normalScale: 1.6 }),
    pbr("plaster", { color: [0.98, 0.96, 0.92], normalScale: 1.3 }),
    pbr("rustMetal", { color: [0.16, 0.2, 0.19], metalness: 0.5, roughness: 0.9, normalScale: 0.9 }),
    pbr("wood", { color: [0.9, 0.62, 0.4], normalScale: 1.4 }),
  ]);
  [brickW, brickR, stoneM, plasterM, ironM, woodM].forEach((m) => snowify(m, { thresh: 0.6 }));

  // ---------------------------------------------------------------- shaft: white / red band / white + cornice
  add(new THREE.Mesh(towerSegment(TOWER.plinthTop - 0.2, -15.6), brickW)).name = "towerWhiteLow";
  add(new THREE.Mesh(towerSegment(-15.6, -9.4), brickR)).name = "towerRed";
  add(new THREE.Mesh(towerSegment(-9.4, -1.0), brickW)).name = "towerWhiteHigh";
  { // thin painted string courses at the band edges + cornice under the gallery (plaster, real relief)
    const pcs = [];
    for (const y of [-15.6, -9.4]) pcs.push(lathe([[towerR(y) - 0.02, y - 0.09], [towerR(y) + 0.07, y - 0.07], [towerR(y) + 0.08, y + 0.07], [towerR(y) - 0.02, y + 0.09]], 96));
    pcs.push(lathe([[3.28, -1.08], [3.38, -1.02], [3.4, -0.86], [3.52, -0.78], [3.55, -0.62], [3.3, -0.58]], 96));
    pcs.forEach((g) => boxUV(g, 1.2));
    add(mergedMesh(pcs, plasterM, { name: "cornice" }));
  }
  // corbels: 24 curved brackets carrying the gallery (lamp room's deck edge r 4.02 at y -0.54)
  { const sh = new THREE.Shape(); sh.moveTo(0, 0); sh.lineTo(0.68, 0); sh.lineTo(0.68, -0.16); sh.quadraticCurveTo(0.22, -0.3, 0.08, -1.15); sh.lineTo(0, -1.15); sh.lineTo(0, 0);
    const pcs = [];
    for (let k = 0; k < 24; k++) {
      const phi = (k / 24) * Math.PI * 2 + Math.PI / 24;
      const g = new THREE.ExtrudeGeometry(sh, { depth: 0.16, bevelEnabled: true, bevelThickness: 0.015, bevelSize: 0.015, bevelSegments: 2, curveSegments: 10 });
      g.translate(0, 0, -0.08); boxUV(g, 1.2);
      // shape x = radial (outward), y = up; local +X -> radial direction (sin phi, 0, cos phi)
      g.rotateY(-Math.PI / 2); g.rotateY(phi); g.translate(3.26 * Math.sin(phi), -0.56, 3.26 * Math.cos(phi)); pcs.push(g);
    }
    add(mergedMesh(pcs, plasterM, { name: "corbels" }));
  }

  // ---------------------------------------------------------------- plinth + entrance steps (door faces +Z, toward the jetty)
  { const pl = lathe([[0, TOWER.plinthTop], [4.48, TOWER.plinthTop], [4.62, TOWER.plinthTop - 0.08], [4.66, TOWER.plinthTop - 0.3], [4.8, ROCK_TOP - 0.1], [4.85, ROCK_TOP - 0.8]], 96);
    const uv = pl.attributes.uv, p = pl.attributes.position; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 20, p.getY(i) / 1.6);
    tint(pl, 0xffffff); add(new THREE.Mesh(pl, stoneM)).name = "plinth";
    const st = [];
    for (let k = 1; k <= 5; k++) { const y = TOWER.plinthTop - 0.2 * k, z0 = 4.55 + 0.32 * (k - 1), z1 = z0 + 0.34, w = 1.9 + 0.1 * k;
      const g = roundedBox(w, y - (ROCK_TOP - 0.7), z1 - z0, 0.03); boxUV(g, 1.6); const tn = 0.85 + r() * 0.2; tint(g, new THREE.Color(tn, tn, tn));
      st.push(place(g, [0, (y + ROCK_TOP - 0.7) / 2, (z0 + z1) / 2])); }
    add(mergedMesh(st, stoneM, { name: "entranceSteps" }));
  }
  // ---------------------------------------------------------------- door: stone surround, arched iron door, hinges, ring, lantern
  const doorZ = 4.2, doorY0 = TOWER.plinthTop, doorH = 2.35, doorW = 1.2;
  { const sur = [];
    for (const s of [-1, 1]) sur.push(place(roundedBox(0.32, doorH - 0.1, 0.42, 0.03), [s * (doorW / 2 + 0.16), doorY0 + (doorH - 0.1) / 2, doorZ - 0.08]));
    for (let k = 0; k <= 8; k++) {  // voussoirs of the arch
      const a = Math.PI * (k / 8), R0 = doorW / 2 + 0.16;
      sur.push(place(roundedBox(0.3, 0.26, 0.44, 0.03), [Math.cos(a) * R0, doorY0 + doorH - 0.1 + Math.sin(a) * R0 * 0.6, doorZ - 0.07], [0, 0, a - Math.PI / 2]));
    }
    sur.forEach((g) => { boxUV(g, 1.4); const tn = 0.9 + r() * 0.15; tint(g, new THREE.Color(tn, tn * 0.97, tn * 0.93)); });
    add(mergedMesh(sur, stoneM, { name: "doorSurround" }));
    // door leaf: vertical iron planks with an arched top (shape), studs, two strap hinges
    const sh = new THREE.Shape(); sh.moveTo(-doorW / 2, 0); sh.lineTo(doorW / 2, 0); sh.lineTo(doorW / 2, doorH - 0.1);
    sh.absellipse(0, doorH - 0.1, doorW / 2, doorW / 2 * 0.6, 0, Math.PI, false); sh.lineTo(-doorW / 2, 0);
    const leaf = new THREE.ExtrudeGeometry(sh, { depth: 0.08, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.012, bevelSegments: 2, curveSegments: 20 });
    boxUV(leaf, 1.0); leaf.translate(0, doorY0, doorZ - 0.12);
    const bits = [leaf];
    for (const y of [0.45, doorH - 0.55]) bits.push(place(roundedBox(doorW * 0.86, 0.09, 0.03, 0.01), [-0.04, doorY0 + y, doorZ - 0.02]));
    for (let i = 0; i < 4; i++) for (const y of [0.45, doorH - 0.55]) bits.push(place(new THREE.SphereGeometry(0.022, 8, 6), [-doorW * 0.36 + i * 0.25, doorY0 + y, doorZ + 0.0]));
    for (let i = 1; i < 5; i++) bits.push(place(roundedBox(0.012, doorH - 0.25, 0.012, 0.004), [-doorW / 2 + i * doorW / 5, doorY0 + (doorH - 0.25) / 2 + 0.05, doorZ - 0.03]));
    bits.push(place(new THREE.TorusGeometry(0.07, 0.012, 8, 20), [0.38, doorY0 + 1.05, doorZ + 0.0]));
    add(mergedMesh(bits, ironM, { name: "door" }));
  }
  const lanternPos = new THREE.Vector3(1.05, doorY0 + 2.05, doorZ + 0.12);
  const doorLight = new THREE.PointLight(new THREE.Color(1.0, 0.66, 0.32), 9, 26, 2); doorLight.position.copy(lanternPos).add(new THREE.Vector3(0, 0.05, 0.25));
  add(doorLight);
  const glowMats = [];
  { const lan = await prop("wooden_lantern_01", { position: [0, 0, 0] }); const s = sizeOf(lan); lan.scale.multiplyScalar(0.38 / s.y);
    lan.position.copy(lanternPos).add(new THREE.Vector3(0, -0.2, 0.18)); add(lan);
    const br = add(new THREE.Mesh(place(roundedBox(0.05, 0.05, 0.42, 0.01), [lanternPos.x, lanternPos.y + 0.22, doorZ + 0.0]), ironM));
    br.castShadow = true;
    const bulb = new THREE.MeshStandardMaterial({ color: 0x221100, emissive: new THREE.Color(1.0, 0.62, 0.25), emissiveIntensity: 4 }); glowMats.push(bulb);
    const b = add(new THREE.Mesh(new THREE.SphereGeometry(0.045, 16, 12), bulb)); b.position.copy(lanternPos).add(new THREE.Vector3(0, -0.08, 0.18)); b.name = "bulb";
  }

  // ---------------------------------------------------------------- small windows up the tower (glow warm at night)
  const glassM = new THREE.MeshStandardMaterial({ color: new THREE.Color(0.05, 0.06, 0.08), roughness: 0.15, metalness: 0.2,
    emissive: new THREE.Color(1.0, 0.62, 0.28), emissiveIntensity: 2.5, envMapIntensity: 1.2 });
  { const fr = [], sills = [], glass = [], mull = [];
    const WIN = [[-24.3, 0.55], [-19.6, -0.95], [-12.6, 0.15], [-7.3, 1.3], [-4.0, -0.4], [-19.6, 2.6], [-11.0, -2.7], [-5.2, 3.6]];
    for (const [y, phi] of WIN) {
      const R0 = towerR(y), m = new THREE.Matrix4().makeRotationFromEuler(outward(phi)), w = 0.62, h = 0.95;
      const put = (g, x, yy, z) => { g.translate(x, yy, z); g.applyMatrix4(m); g.translate(0, y, 0); return g; };
      for (const s of [-1, 1]) fr.push(put(roundedBox(0.14, h + 0.18, 0.3, 0.02), s * (w / 2 + 0.07), 0, R0 + 0.04));
      fr.push(put(roundedBox(w + 0.42, 0.16, 0.34, 0.025), 0, h / 2 + 0.1, R0 + 0.05));                    // lintel
      sills.push(put(roundedBox(w + 0.36, 0.08, 0.42, 0.02), 0, -h / 2 - 0.05, R0 + 0.1));                  // sill (snow sits here)
      glass.push(put(new THREE.PlaneGeometry(w, h), 0, 0, R0 + 0.035));
      mull.push(put(roundedBox(0.035, h, 0.04, 0.008), 0, 0, R0 + 0.06), put(roundedBox(w, 0.035, 0.04, 0.008), 0, 0.05, R0 + 0.06));
    }
    [...fr, ...sills].forEach((g) => boxUV(g, 1.1));
    add(mergedMesh([...fr, ...sills], plasterM, { name: "windowFrames" }));
    const gm = add(mergedMesh(glass, glassM, { cast: false, name: "windowGlass" }));
    add(mergedMesh(mull, woodM, { name: "windowMullions" }));
    glowMats.push(glassM);
  }

  // ---------------------------------------------------------------- outer lantern roof (the lamp room's ceiling only faces inward)
  if (lanternRoof) {
    const roofM = snowify(plain(0x9a2b20, { roughness: 0.5, metalness: 0.35, relief: 0.35 }), { thresh: 0.45 });
    const darkM = snowify(plain(0x2c2a28, { roughness: 0.4, metalness: 0.7, relief: 0.25 }), { thresh: 0.6 });
    const ROOF0 = 2.93, RE = 3.62, APEX = 4.12, N = 8;
    const cone = new THREE.ConeGeometry(RE, APEX - ROOF0, N, 4, true, Math.PI / N); cone.translate(0, (ROOF0 + APEX) / 2, 0);
    const soffit = new THREE.RingGeometry(3.05, RE, N, 1, Math.PI / N); soffit.rotateX(Math.PI / 2); soffit.translate(0, ROOF0 - 0.005, 0);
    // fix ring orientation so it faces down and lines up with the cone's corners
    soffit.rotateY(-Math.PI / 2);
    const eaves = new THREE.CylinderGeometry(RE + 0.02, RE + 0.02, 0.12, N, 1, true, Math.PI / N); eaves.translate(0, ROOF0 - 0.05, 0);
    const ribs = [];
    for (let k = 0; k < N; k++) { const a = Math.PI / N + (k / N) * Math.PI * 2, x = Math.sin(a), z = Math.cos(a);
      ribs.push(tube([new THREE.Vector3(x * RE * 1.005, ROOF0 + 0.02, z * RE * 1.005), new THREE.Vector3(x * RE * 0.5, (ROOF0 + APEX) / 2 + 0.02, z * RE * 0.5),
        new THREE.Vector3(x * 0.1, APEX - 0.04, z * 0.1)], 0.035, 12, 6)); }
    add(mergedMesh([cone, eaves], roofM, { name: "lanternRoof" }));
    const sm = add(new THREE.Mesh(soffit, plain(0x6a1d16, { roughness: 0.7, relief: 0.2, side: THREE.DoubleSide }))); sm.receiveShadow = true;
    const top = [lathe([[0.18, APEX - 0.08], [0.2, APEX + 0.05], [0.09, APEX + 0.12], [0.09, APEX + 0.22]], 24),
      place(new THREE.SphereGeometry(0.34, 24, 16), [0, APEX + 0.5, 0]), place(roundedCylinder(0.03, 1.1, 0.01, 8), [0, APEX + 1.3, 0]),
      place(new THREE.ConeGeometry(0.06, 0.18, 10), [0, APEX + 1.9, 0])];
    add(mergedMesh([...ribs, ...top], darkM, { name: "roofTop" }));
  }

  // ---------------------------------------------------------------- flagstone path (door steps -> stair head) + stairs to the jetty
  const lipZ = lipRadius(Math.PI / 2);                                          // ~12.4: where the +Z cliff starts
  { const fl = [];
    for (let z = 6.25; z < lipZ - 0.2; z += 0.58) for (const xo of [-0.42, 0.36]) {
      const w = 0.62 + r() * 0.22, d = 0.46 + r() * 0.12, x = xo + (r() - 0.5) * 0.14, zz = z + (r() - 0.5) * 0.1;
      const y = topY(x, zz, Math.hypot(x, zz), lipZ);
      const g = roundedBox(w, 0.14, d, 0.03); boxUV(g, 1.4); const tn = 0.82 + r() * 0.22; tint(g, new THREE.Color(tn, tn * 0.98, tn * 0.95));
      fl.push(place(g, [x, y + 0.01, zz], [0, (r() - 0.5) * 0.3, 0]));
    }
    add(mergedMesh(fl, stoneM, { name: "path" }));
  }
  const stairTop = new THREE.Vector3(0, topY(0, lipZ, lipZ, lipZ), lipZ - 0.3), stairBot = new THREE.Vector3(0, -33.2, 16.5);
  const nSteps = 13, rise = (stairTop.y - stairBot.y) / nSteps, run = (stairBot.z - stairTop.z) / nSteps;
  { const st = [], rail = [];
    for (let k = 0; k < nSteps; k++) {
      const yTop = stairTop.y - rise * (k + 1), z0 = stairTop.z + run * k - 0.05, z1 = z0 + run + 0.1, bottom = -35.2, w = 1.7;
      const g = roundedBox(w, yTop - bottom, z1 - z0, 0.035); boxUV(g, 1.5); const tn = 0.8 + r() * 0.22; tint(g, new THREE.Color(tn, tn, tn * 0.97));
      st.push(place(g, [(r() - 0.5) * 0.04, (yTop + bottom) / 2, (z0 + z1) / 2]));
    }
    // side walls (low parapet on the sea side, -X)
    { const len = Math.hypot(stairBot.z - stairTop.z, stairTop.y - stairBot.y), ang = Math.atan2(stairTop.y - stairBot.y, stairBot.z - stairTop.z);
      const g = roundedBox(0.3, 0.6, len + 0.3, 0.04); boxUV(g, 1.5); tint(g, new THREE.Color(0.78, 0.76, 0.72));
      st.push(place(g, [-0.98, (stairTop.y + stairBot.y) / 2 + 0.2, (stairTop.z + stairBot.z) / 2], [ang, 0, 0])); }
    add(mergedMesh(st, stoneM, { name: "stairs" }));
    // rope rail on +X: iron posts + sagging rope
    const posts = [], pts = [];
    for (let k = 0; k <= 4; k++) { const f = k / 4, z = stairTop.z + (stairBot.z - stairTop.z) * f, y = stairTop.y + (stairBot.y - stairTop.y) * f;
      posts.push(place(roundedCylinder(0.03, 1.0, 0.01, 8), [0.78, y + 0.42, z])); pts.push(new THREE.Vector3(0.78, y + 0.9, z)); }
    const ropePts = []; for (let k = 0; k < pts.length - 1; k++) for (let j = 0; j < 6; j++) { const t = j / 6;
      ropePts.push(pts[k].clone().lerp(pts[k + 1], t).add(new THREE.Vector3(0, -Math.sin(Math.PI * t) * 0.12, 0))); }
    ropePts.push(pts[pts.length - 1]);
    add(mergedMesh(posts, ironM, { name: "stairPosts" }));
    add(new THREE.Mesh(tube(ropePts, 0.022, 80, 6), snowify(plain(0x8a6a44, { roughness: 0.9, relief: 0.6 })))).castShadow = true;
  }
  group.traverse((o) => { if (!o.isMesh) return; o.receiveShadow = true; o.castShadow = o.name !== "windowGlass" && o.name !== "bulb"; });

  return { group, glowMats, glassM, doorLight, anchors: {
    towerDoor: new THREE.Vector3(0, doorY0, doorZ + 0.6), doorLantern: lanternPos.clone(), stairTop, stairBottom: stairBot,
  } };
}
