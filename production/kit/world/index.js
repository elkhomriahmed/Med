// WORLD KIT — reusable set builders for every future place + the lighthouse lamp room.
//
//   import { buildLampRoom, createLook } from "../world/index.js";
//   const place = await buildLampRoom({ exterior: false, time: "night" });
//     -> { group, keyLightPos (live Vector3), sunDir, anchors, update(t, camera), set({...story controls}), setTime(name),
//          lights, props: { sandwich, jug, rag, toolbox, oilCan, oilSpill }, fx: { pool, pour, vapour, snowfall, beams, dust },
//          parts: { beams, beamCones, glazing, windowOutGlazing, winterSnow, lens, sky, ceiling }, beamLit(p), setHeight(h) }
//   setTime("night"|"dusk"|"morning"|"winter") and set({...}) are per-frame safe (no rebuild / recompile). See lampRoom.js.
//   scene.add(place.group);
//   const look = createLook(renderer, scene, camera, W, H);  await look.ready;   // HDRI fill loads async
//   per frame: place.update(t, camera); character.update(state, { camera, keyLightPos: place.keyLightPos, time: t }); look.render();
//
// Building blocks for new places (all bevelled, world-scaled UVs, real CC0 PBR textures, no ink outlines on sets):
//   geometry.js  roundedBox, roundedCylinder, lathe, extrude, gearShape, tube, plankField (boards with gaps/stagger/tone),
//                boxUV/grainUV (UVs in metres), tint (per-piece tone), mergedMesh (one draw call), place
//   materials.js pbr(key, {color tint, normalScale...}) using TEX sets in public/tex, plain(color, {metal, relief}),
//                chalkboardTexture(lines), plateTexture(lines) for signs/plaques, noiseNormal
//   sky.js       createSky("night"|"day"|"sunset", overrides) — sky + sea dome with stars, moon/sun, horizon haze, glitter
//   fx.js        createDust({...filter}) motes in the key light, createBeams({apex,...}) rotating lighthouse beams + air shafts
//   props.js     prop(name, {position, rotationY, tint}) — Poly Haven glTF props in public/models (real scale)
//   fx.js        + createPool (mercury mirror), createPour, createVapour, createSnowfall
//   props.js     + createSandwich, createRag, createToolbox, createJug, createOilPuddle, createFloorShade
//   look.js      pinToFarPlane(mesh): sky domes at depth 1.0 (createLook does it automatically, and patches N8AO's halfRes black-sky bug)
//   look.js      createLook(...) post chain (N8AO, bloom on lights only, grade_v12_LOCKED, vignette, optional DOF, HDRI fill)
// More CC0 assets: https://api.polyhaven.com/files/<asset> (textures: Diffuse/nor_gl/Rough 1k jpg -> public/tex/<name>_{diff,nor_gl,rough}_1k.jpg;
// models: gltf 1k + its "include" files -> public/models/<name>/). Keep total downloads modest.
export * from "./geometry.js";
export * from "./materials.js";
export { createSky, SKY_PRESETS } from "./sky.js";
export { createDust, createBeams } from "./fx.js";
export { prop, PROPS, sizeOf } from "./props.js";
export { buildLampRoom } from "./lampRoom.js";
export { createLook, setupRenderer, GradeEffect, pinToFarPlane } from "./look.js";
